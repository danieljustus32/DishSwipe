import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertRecipeSchema,
  insertUserRecipeSchema,
  insertShoppingListItemSchema,
  insertUserPreferenceSchema,
} from "@shared/schema";
import { z } from "zod";

// Spoonacular API configuration
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY || process.env.VITE_SPOONACULAR_API_KEY || "";
const SPOONACULAR_BASE_URL = "https://api.spoonacular.com/recipes";

interface SpoonacularRecipe {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  summary: string;
  analyzedInstructions: Array<{
    steps: Array<{
      number: number;
      step: string;
    }>;
  }>;
  extendedIngredients: Array<{
    id: number;
    name: string;
    amount: number;
    unit: string;
    aisle: string;
  }>;
  nutrition?: {
    nutrients: Array<{
      name: string;
      amount: number;
      unit: string;
    }>;
  };
}

async function fetchSpoonacularRecipes(offset = 0, number = 10): Promise<SpoonacularRecipe[]> {
  if (!SPOONACULAR_API_KEY) {
    throw new Error("Spoonacular API key not configured");
  }

  const url = `${SPOONACULAR_BASE_URL}/random?apiKey=${SPOONACULAR_API_KEY}&number=${number}&includeNutrition=true`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Spoonacular API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.recipes || [];
}

async function fetchSpoonacularRecipeDetails(id: number): Promise<SpoonacularRecipe> {
  if (!SPOONACULAR_API_KEY) {
    throw new Error("Spoonacular API key not configured");
  }

  const url = `${SPOONACULAR_BASE_URL}/${id}/information?apiKey=${SPOONACULAR_API_KEY}&includeNutrition=true`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Spoonacular API error: ${response.statusText}`);
  }
  
  return await response.json();
}

function transformSpoonacularRecipe(recipe: SpoonacularRecipe) {
  const instructions = recipe.analyzedInstructions?.[0]?.steps?.map(step => step.step) || [];
  const ingredients = recipe.extendedIngredients?.map(ing => ({
    id: ing.id,
    name: ing.name,
    amount: ing.amount,
    unit: ing.unit,
    aisle: ing.aisle || "Other",
  })) || [];

  // Extract nutrition data if available
  let nutrition = null;
  if (recipe.nutrition?.nutrients) {
    const nutrients = recipe.nutrition.nutrients;
    nutrition = {
      calories: nutrients.find(n => n.name === "Calories")?.amount || 0,
      carbohydrates: nutrients.find(n => n.name === "Carbohydrates")?.amount || 0,
      fat: nutrients.find(n => n.name === "Fat")?.amount || 0,
      protein: nutrients.find(n => n.name === "Protein")?.amount || 0,
      fiber: nutrients.find(n => n.name === "Fiber")?.amount || 0,
      sugar: nutrients.find(n => n.name === "Sugar")?.amount || 0,
      sodium: nutrients.find(n => n.name === "Sodium")?.amount || 0,
      cholesterol: nutrients.find(n => n.name === "Cholesterol")?.amount || 0,
      saturatedFat: nutrients.find(n => n.name === "Saturated Fat")?.amount || 0,
    };
  }

  return {
    spoonacularId: recipe.id,
    title: recipe.title,
    image: recipe.image,
    readyInMinutes: recipe.readyInMinutes,
    servings: recipe.servings,
    summary: recipe.summary,
    instructions,
    ingredients,
    nutrition,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Recipe discovery routes
  app.get('/api/recipes/discover', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const offset = parseInt(req.query.offset as string) || 0;
      const number = parseInt(req.query.number as string) || 10;

      const spoonacularRecipes = await fetchSpoonacularRecipes(offset, number);
      const recipes = [];

      for (const spoonacularRecipe of spoonacularRecipes) {
        const transformedRecipe = transformSpoonacularRecipe(spoonacularRecipe);
        const savedRecipe = await storage.createRecipe(transformedRecipe);
        
        // Check if user has already rated this recipe
        const preference = await storage.getUserPreference(userId, spoonacularRecipe.id);
        const isSaved = await storage.isRecipeSaved(userId, savedRecipe.id);
        
        recipes.push({
          ...savedRecipe,
          userPreference: preference?.liked,
          isSaved,
        });
      }

      res.json(recipes);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  app.get('/api/recipes/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      let recipe = await storage.getRecipe(id);
      
      if (!recipe) {
        // If not in database, try to fetch from Spoonacular
        const spoonacularId = parseInt(id.replace('recipe_', ''));
        if (!isNaN(spoonacularId)) {
          const spoonacularRecipe = await fetchSpoonacularRecipeDetails(spoonacularId);
          const transformedRecipe = transformSpoonacularRecipe(spoonacularRecipe);
          recipe = await storage.createRecipe(transformedRecipe);
        }
      }
      
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      res.json(recipe);
    } catch (error) {
      console.error("Error fetching recipe:", error);
      res.status(500).json({ message: "Failed to fetch recipe" });
    }
  });

  // User preferences routes
  app.post('/api/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferenceData = insertUserPreferenceSchema.parse({
        ...req.body,
        userId,
      });

      const preference = await storage.saveUserPreference(preferenceData);
      res.json(preference);
    } catch (error) {
      console.error("Error saving preference:", error);
      res.status(500).json({ message: "Failed to save preference" });
    }
  });

  // Cookbook routes
  app.get('/api/cookbook', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRecipes = await storage.getUserRecipes(userId);
      res.json(userRecipes);
    } catch (error) {
      console.error("Error fetching cookbook:", error);
      res.status(500).json({ message: "Failed to fetch cookbook" });
    }
  });

  app.post('/api/cookbook', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRecipeData = insertUserRecipeSchema.parse({
        ...req.body,
        userId,
      });

      const userRecipe = await storage.saveUserRecipe(userRecipeData);
      res.json(userRecipe);
    } catch (error) {
      console.error("Error saving recipe:", error);
      res.status(500).json({ message: "Failed to save recipe" });
    }
  });

  app.delete('/api/cookbook/:recipeId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { recipeId } = req.params;

      await storage.removeUserRecipe(userId, recipeId);
      res.json({ message: "Recipe removed from cookbook" });
    } catch (error) {
      console.error("Error removing recipe:", error);
      res.status(500).json({ message: "Failed to remove recipe" });
    }
  });

  // Shopping list routes
  app.get('/api/shopping-list', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const items = await storage.getShoppingList(userId);
      
      // Group by aisle
      const groupedItems = items.reduce((acc, item) => {
        const aisle = item.aisle || "Other";
        if (!acc[aisle]) acc[aisle] = [];
        acc[aisle].push(item);
        return acc;
      }, {} as Record<string, typeof items>);
      
      res.json(groupedItems);
    } catch (error) {
      console.error("Error fetching shopping list:", error);
      res.status(500).json({ message: "Failed to fetch shopping list" });
    }
  });

  app.post('/api/shopping-list', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemData = insertShoppingListItemSchema.parse({
        ...req.body,
        userId,
      });

      const item = await storage.addShoppingListItem(itemData);
      res.json(item);
    } catch (error) {
      console.error("Error adding shopping list item:", error);
      res.status(500).json({ message: "Failed to add item" });
    }
  });

  app.post('/api/shopping-list/recipe/:recipeId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { recipeId } = req.params;
      
      const recipe = await storage.getRecipe(recipeId);
      if (!recipe || !recipe.ingredients) {
        return res.status(404).json({ message: "Recipe not found" });
      }

      const items = [];
      for (const ingredient of recipe.ingredients) {
        const item = await storage.addShoppingListItem({
          userId,
          name: ingredient.name,
          amount: `${ingredient.amount} ${ingredient.unit}`.trim(),
          aisle: ingredient.aisle || "Other",
          recipeId,
          checked: false,
        });
        items.push(item);
      }

      res.json(items);
    } catch (error) {
      console.error("Error adding recipe to shopping list:", error);
      res.status(500).json({ message: "Failed to add recipe to shopping list" });
    }
  });

  app.patch('/api/shopping-list/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const item = await storage.updateShoppingListItem(id, updates);
      res.json(item);
    } catch (error) {
      console.error("Error updating shopping list item:", error);
      res.status(500).json({ message: "Failed to update item" });
    }
  });

  app.delete('/api/shopping-list/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.removeShoppingListItem(id);
      res.json({ message: "Item removed" });
    } catch (error) {
      console.error("Error removing shopping list item:", error);
      res.status(500).json({ message: "Failed to remove item" });
    }
  });

  app.delete('/api/shopping-list', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.clearShoppingList(userId);
      res.json({ message: "Shopping list cleared" });
    } catch (error) {
      console.error("Error clearing shopping list:", error);
      res.status(500).json({ message: "Failed to clear shopping list" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
