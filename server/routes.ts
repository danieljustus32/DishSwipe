import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./multiAuth";
import { 
  insertRecipeSchema,
  insertUserRecipeSchema,
  insertShoppingListItemSchema,
  insertUserPreferenceSchema,
  updateProfileSchema,
} from "@shared/schema";
import { z } from "zod";
import { mockRecipes, getRandomMockRecipes } from "./mockRecipes";
import { mockCookbookRecipes, mockShoppingListItems } from "./mockTutorialData";

// Stripe configuration
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-06-30.basil",
  });
}

// Spoonacular API configuration
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY || process.env.VITE_SPOONACULAR_API_KEY || "";
const SPOONACULAR_BASE_URL = "https://api.spoonacular.com/recipes";
const USE_MOCK_DATA = process.env.USE_MOCK_DATA !== "false"; // Default to true for development

console.log(`Environment: NODE_ENV=${process.env.NODE_ENV}, USE_MOCK_DATA=${USE_MOCK_DATA}, API_KEY_EXISTS=${!!SPOONACULAR_API_KEY}`);

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
  // Use mock data in development or when USE_MOCK_DATA is true
  if (USE_MOCK_DATA) {
    console.log("Using mock recipe data for development");
    return getRandomMockRecipes(number);
  }

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
  // Use mock data in development or when USE_MOCK_DATA is true
  if (USE_MOCK_DATA) {
    const mockRecipe = mockRecipes.find(recipe => recipe.id === id);
    if (mockRecipe) {
      return mockRecipe;
    }
    // If not found in mock data, return a generic mock recipe with the requested ID
    return { ...mockRecipes[0], id };
  }

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
    // Helper function to find nutrient by name (case insensitive)
    const findNutrient = (name: string) => 
      nutrients.find(n => n.name.toLowerCase().includes(name.toLowerCase()))?.amount || 0;
    
    nutrition = {
      calories: findNutrient("calories"),
      carbohydrates: findNutrient("carbohydrates") || findNutrient("carbs"),
      fat: findNutrient("fat"),
      protein: findNutrient("protein"),
      fiber: findNutrient("fiber"),
      sugar: findNutrient("sugar"),
      sodium: findNutrient("sodium"),
      cholesterol: findNutrient("cholesterol"),
      saturatedFat: findNutrient("saturated fat"),
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
      let userId: string;
      
      if (req.user.claims?.sub) {
        // Replit OIDC user
        userId = req.user.claims.sub;
      } else if (req.user.provider && req.user.profile) {
        // Google or Apple user
        const provider = req.user.provider;
        const profile = req.user.profile;
        
        const providerId = provider === 'google' ? profile.id : 
                          provider === 'apple' ? (profile.id || profile.sub) : null;
        
        if (providerId) {
          const user = await storage.getUserByProviderId(providerId, provider);
          if (user) {
            return res.json(user);
          }
        }
        throw new Error(`User not found for ${provider} provider`);
      } else {
        throw new Error("Invalid user session");
      }
      
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Profile update route
  app.put('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = updateProfileSchema.parse(req.body);
      
      const updatedUser = await storage.updateUserProfile(userId, validatedData);
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      if (error.issues) {
        // Zod validation error
        res.status(400).json({ 
          message: "Validation failed", 
          errors: error.issues.map((issue: any) => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        });
      } else {
        res.status(500).json({ message: "Failed to update profile" });
      }
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
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check daily usage limits for non-Gold users
      if (!user.isGoldMember) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const remainingLikes = await storage.getRemainingLikes(userId, today);
        
        if (remainingLikes <= 0) {
          return res.status(429).json({ 
            message: "Daily like limit reached",
            remainingLikes: 0,
            isGoldMember: false
          });
        }
        
        // If this is a like (not dislike), increment the usage counter
        if (req.body.liked === true) {
          await storage.incrementDailyLikes(userId, today);
        }
      }

      const preferenceData = insertUserPreferenceSchema.parse({
        ...req.body,
        userId,
      });

      const preference = await storage.saveUserPreference(preferenceData);
      
      // Include remaining likes in response for non-Gold users
      const responseData: any = preference;
      if (!user.isGoldMember) {
        const today = new Date().toISOString().split('T')[0];
        responseData.remainingLikes = await storage.getRemainingLikes(userId, today);
        responseData.isGoldMember = false;
      }
      
      res.json(responseData);
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

      // Check if recipe is already saved to prevent duplicates
      const isAlreadySaved = await storage.isRecipeSaved(userId, userRecipeData.recipeId);
      if (isAlreadySaved) {
        return res.status(409).json({ message: "Recipe already saved to cookbook" });
      }

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
        const item = await storage.addShoppingListItemWithMerging({
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

  // User status and profile routes
  app.get('/api/user/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const today = new Date().toISOString().split('T')[0];
      const remainingLikes = user.isGoldMember ? -1 : await storage.getRemainingLikes(userId, today); // -1 indicates unlimited

      res.json({
        isGoldMember: user.isGoldMember || false,
        remainingLikes,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (error) {
      console.error("Error fetching user status:", error);
      res.status(500).json({ message: "Failed to fetch user status" });
    }
  });

  // Stripe subscription routes
  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Payment processing not available. Please contact support." });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user already has an active subscription
      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        
        if (subscription.status === 'active') {
          return res.json({
            subscriptionId: subscription.id,
            status: 'active'
          });
        }
      }

      if (!user.email) {
        return res.status(400).json({ message: "User email required for subscription" });
      }

      // Create or update Stripe customer
      let customer;
      if (user.stripeCustomerId) {
        customer = await stripe.customers.retrieve(user.stripeCustomerId);
      } else {
        customer = await stripe.customers.create({
          email: user.email,
          name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email,
        });
        await storage.updateUserStripeInfo(userId, customer.id);
      }

      // Create a simple subscription for FlavorSwipe Gold ($9.99/month)
      // First create a product and price
      const product = await stripe.products.create({
        name: 'FlavorSwipe Gold',
        description: 'Unlimited recipe likes and premium features',
      });

      const price = await stripe.prices.create({
        currency: 'usd',
        unit_amount: 999, // $9.99 in cents
        recurring: {
          interval: 'month',
        },
        product: product.id,
      });

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: price.id }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
      });

      // Update user with subscription info
      await storage.updateUserStripeInfo(userId, customer.id, subscription.id);

      const latestInvoice = subscription.latest_invoice;
      let clientSecret = null;
      
      if (typeof latestInvoice === 'object' && latestInvoice && 'payment_intent' in latestInvoice) {
        const paymentIntent = latestInvoice.payment_intent;
        if (typeof paymentIntent === 'object' && paymentIntent && 'client_secret' in paymentIntent) {
          clientSecret = paymentIntent.client_secret;
        }
      }

      res.json({
        subscriptionId: subscription.id,
        clientSecret,
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(400).json({ error: { message: error.message } });
    }
  });

  // Cancel subscription route
  app.post('/api/cancel-subscription', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Payment processing not available. Please contact support." });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription found" });
      }

      // Cancel the subscription at the end of the current billing period
      const subscription = await stripe.subscriptions.update(
        user.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        }
      );

      // Update user's Gold status (they keep access until period ends)
      // Note: We don't immediately revoke Gold status, Stripe webhook should handle this
      // For now, we'll keep them as Gold until the webhook confirms cancellation

      res.json({
        message: "Subscription will be cancelled at the end of the current billing period",
        subscriptionId: subscription.id,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: (subscription as any).current_period_end,
      });
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      res.status(400).json({ error: { message: error.message } });
    }
  });

  // Tutorial endpoints for onboarding
  app.post('/api/tutorial/load-cookbook-data', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Add mock cookbook recipes for tutorial
      for (const recipe of mockCookbookRecipes) {
        await storage.createRecipe({
          spoonacularId: recipe.spoonacularId,
          title: recipe.title,
          image: recipe.image,
          readyInMinutes: recipe.readyInMinutes,
          servings: recipe.servings,
          summary: recipe.summary,
          instructions: recipe.instructions,
          ingredients: recipe.ingredients,
          nutrition: recipe.nutrition,
        });
        
        await storage.saveUserRecipe(userId, recipe.id);
      }
      
      res.json({ message: "Tutorial cookbook data loaded" });
    } catch (error: any) {
      console.error("Error loading tutorial cookbook data:", error);
      res.status(500).json({ error: { message: error.message } });
    }
  });

  app.post('/api/tutorial/load-shopping-data', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Add mock shopping list items for tutorial
      for (const item of mockShoppingListItems) {
        await storage.addShoppingListItem(userId, {
          name: item.name,
          amount: item.amount,
          aisle: item.aisle,
          checked: item.checked,
          recipeId: item.recipeId,
        });
      }
      
      res.json({ message: "Tutorial shopping data loaded" });
    } catch (error: any) {
      console.error("Error loading tutorial shopping data:", error);
      res.status(500).json({ error: { message: error.message } });
    }
  });

  app.delete('/api/tutorial/cleanup', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Remove tutorial cookbook recipes
      for (const recipe of mockCookbookRecipes) {
        await storage.removeUserRecipe(userId, recipe.id);
        // Note: We don't delete the recipe itself as it might be used by other users
      }
      
      // Remove tutorial shopping list items
      const shoppingItems = await storage.getShoppingList(userId);
      for (const item of shoppingItems) {
        if (mockShoppingListItems.some(mock => mock.name === item.name && mock.aisle === item.aisle)) {
          await storage.removeShoppingListItem(item.id);
        }
      }
      
      res.json({ message: "Tutorial data cleaned up" });
    } catch (error: any) {
      console.error("Error cleaning up tutorial data:", error);
      res.status(500).json({ error: { message: error.message } });
    }
  });

  // Simple webhook endpoint for Stripe events (for future use)
  app.post('/api/webhook/stripe', async (req, res) => {
    // TODO: Implement proper webhook handling when needed
    res.json({ received: true });
  });

  // Enhanced TTS with caching and rate limiting
  const ttsCache = new Map(); // Cache for generated audio
  const ttsQueue = []; // Queue for pending requests
  let isProcessingQueue = false;
  
  // Process TTS queue with rate limiting
  const processTTSQueue = async () => {
    if (isProcessingQueue || ttsQueue.length === 0) return;
    
    isProcessingQueue = true;
    
    while (ttsQueue.length > 0) {
      const { text, resolve, reject } = ttsQueue.shift();
      
      try {
        // Check cache first
        const cacheKey = `${text.substring(0, 100)}_nova`;
        if (ttsCache.has(cacheKey)) {
          console.log('TTS cache hit for:', text.substring(0, 50));
          resolve(ttsCache.get(cacheKey));
          continue;
        }

        console.log('Making OpenAI TTS request for:', text.substring(0, 50));
        
        const openaiResponse = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            voice: 'nova',
            input: text.substring(0, 4000),
            response_format: 'mp3',
            speed: 0.9
          }),
        });

        if (!openaiResponse.ok) {
          if (openaiResponse.status === 429) {
            console.log('OpenAI rate limit hit, waiting 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Re-queue this request
            ttsQueue.unshift({ text, resolve, reject });
            continue;
          }
          throw new Error(`OpenAI TTS API error: ${openaiResponse.status}`);
        }

        const audioBuffer = await openaiResponse.arrayBuffer();
        
        // Cache the result (limit cache size to prevent memory issues)
        if (ttsCache.size > 50) {
          const firstKey = ttsCache.keys().next().value;
          ttsCache.delete(firstKey);
        }
        ttsCache.set(cacheKey, audioBuffer);
        
        resolve(audioBuffer);
        
        // Wait 1 second between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error('TTS queue processing error:', error);
        reject(error);
      }
    }
    
    isProcessingQueue = false;
  };
  
  // Text-to-speech endpoint using OpenAI TTS
  app.post('/api/voice/tts', async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      // Add to queue and wait for processing
      const audioBuffer = await new Promise((resolve, reject) => {
        ttsQueue.push({ text, resolve, reject });
        processTTSQueue().catch(reject);
      });
      
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      });
      
      res.send(Buffer.from(audioBuffer));
    } catch (error) {
      console.error('TTS error:', error);
      res.status(500).json({ error: 'Failed to generate speech' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
