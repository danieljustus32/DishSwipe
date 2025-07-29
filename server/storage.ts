import {
  users,
  recipes,
  userRecipes,
  shoppingListItems,
  userPreferences,
  type User,
  type UpsertUser,
  type Recipe,
  type InsertRecipe,
  type UserRecipe,
  type InsertUserRecipe,
  type ShoppingListItem,
  type InsertShoppingListItem,
  type UserPreference,
  type InsertUserPreference,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Recipe operations
  getRecipe(id: string): Promise<Recipe | undefined>;
  getRecipeBySpoonacularId(spoonacularId: number): Promise<Recipe | undefined>;
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  
  // User recipe operations (cookbook)
  getUserRecipes(userId: string): Promise<(UserRecipe & { recipe: Recipe })[]>;
  saveUserRecipe(userRecipe: InsertUserRecipe): Promise<UserRecipe>;
  removeUserRecipe(userId: string, recipeId: string): Promise<void>;
  isRecipeSaved(userId: string, recipeId: string): Promise<boolean>;
  
  // Shopping list operations
  getShoppingList(userId: string): Promise<ShoppingListItem[]>;
  addShoppingListItem(item: InsertShoppingListItem): Promise<ShoppingListItem>;
  updateShoppingListItem(id: string, updates: Partial<ShoppingListItem>): Promise<ShoppingListItem>;
  removeShoppingListItem(id: string): Promise<void>;
  clearShoppingList(userId: string): Promise<void>;
  
  // User preferences operations
  getUserPreferences(userId: string): Promise<UserPreference[]>;
  saveUserPreference(preference: InsertUserPreference): Promise<UserPreference>;
  getUserPreference(userId: string, spoonacularId: number): Promise<UserPreference | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Recipe operations
  async getRecipe(id: string): Promise<Recipe | undefined> {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
    return recipe;
  }

  async getRecipeBySpoonacularId(spoonacularId: number): Promise<Recipe | undefined> {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.spoonacularId, spoonacularId));
    return recipe;
  }

  async createRecipe(recipe: InsertRecipe): Promise<Recipe> {
    const recipeData = {
      spoonacularId: recipe.spoonacularId,
      title: recipe.title,
      image: recipe.image,
      readyInMinutes: recipe.readyInMinutes,
      servings: recipe.servings,
      summary: recipe.summary,
      instructions: recipe.instructions,
      ingredients: recipe.ingredients as any,
      nutrition: recipe.nutrition as any,
      id: `recipe_${recipe.spoonacularId}`,
    };

    const [newRecipe] = await db
      .insert(recipes)
      .values(recipeData)
      .onConflictDoUpdate({
        target: recipes.spoonacularId,
        set: {
          title: recipe.title,
          image: recipe.image,
          readyInMinutes: recipe.readyInMinutes,
          servings: recipe.servings,
          summary: recipe.summary,
          instructions: recipe.instructions,
          ingredients: recipe.ingredients as any,
          nutrition: recipe.nutrition as any,
        },
      })
      .returning();
    return newRecipe;
  }

  // User recipe operations
  async getUserRecipes(userId: string): Promise<(UserRecipe & { recipe: Recipe })[]> {
    const userRecipesData = await db
      .select()
      .from(userRecipes)
      .innerJoin(recipes, eq(userRecipes.recipeId, recipes.id))
      .where(eq(userRecipes.userId, userId))
      .orderBy(desc(userRecipes.createdAt));

    return userRecipesData.map(({ user_recipes, recipes: recipe }) => ({
      ...user_recipes,
      recipe,
    }));
  }

  async saveUserRecipe(userRecipe: InsertUserRecipe): Promise<UserRecipe> {
    const [savedRecipe] = await db
      .insert(userRecipes)
      .values(userRecipe)
      .onConflictDoNothing()
      .returning();
    return savedRecipe;
  }

  async removeUserRecipe(userId: string, recipeId: string): Promise<void> {
    await db
      .delete(userRecipes)
      .where(and(eq(userRecipes.userId, userId), eq(userRecipes.recipeId, recipeId)));
  }

  async isRecipeSaved(userId: string, recipeId: string): Promise<boolean> {
    const [saved] = await db
      .select()
      .from(userRecipes)
      .where(and(eq(userRecipes.userId, userId), eq(userRecipes.recipeId, recipeId)));
    return !!saved;
  }

  // Shopping list operations
  async getShoppingList(userId: string): Promise<ShoppingListItem[]> {
    return await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.userId, userId))
      .orderBy(shoppingListItems.aisle, shoppingListItems.name);
  }

  async addShoppingListItem(item: InsertShoppingListItem): Promise<ShoppingListItem> {
    const [newItem] = await db
      .insert(shoppingListItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updateShoppingListItem(id: string, updates: Partial<ShoppingListItem>): Promise<ShoppingListItem> {
    const [updatedItem] = await db
      .update(shoppingListItems)
      .set(updates)
      .where(eq(shoppingListItems.id, id))
      .returning();
    return updatedItem;
  }

  async removeShoppingListItem(id: string): Promise<void> {
    await db.delete(shoppingListItems).where(eq(shoppingListItems.id, id));
  }

  async clearShoppingList(userId: string): Promise<void> {
    await db.delete(shoppingListItems).where(eq(shoppingListItems.userId, userId));
  }

  // User preferences operations
  async getUserPreferences(userId: string): Promise<UserPreference[]> {
    return await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
  }

  async saveUserPreference(preference: InsertUserPreference): Promise<UserPreference> {
    // First try to find existing preference
    const existing = await this.getUserPreference(preference.userId, preference.spoonacularId);
    
    if (existing) {
      // Update existing preference
      const [updatedPreference] = await db
        .update(userPreferences)
        .set({ liked: preference.liked })
        .where(and(
          eq(userPreferences.userId, preference.userId),
          eq(userPreferences.spoonacularId, preference.spoonacularId)
        ))
        .returning();
      return updatedPreference;
    } else {
      // Insert new preference
      const [newPreference] = await db
        .insert(userPreferences)
        .values(preference)
        .returning();
      return newPreference;
    }
  }

  async getUserPreference(userId: string, spoonacularId: number): Promise<UserPreference | undefined> {
    const [preference] = await db
      .select()
      .from(userPreferences)
      .where(and(eq(userPreferences.userId, userId), eq(userPreferences.spoonacularId, spoonacularId)));
    return preference;
  }
}

export const storage = new DatabaseStorage();
