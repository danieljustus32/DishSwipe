import {
  users,
  recipes,
  userRecipes,
  shoppingListItems,
  userPreferences,
  dailyUsage,
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
  type DailyUsage,
  type InsertDailyUsage,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(userId: string, profileData: { firstName: string; lastName: string; email: string }): Promise<User>;
  
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
  getUserRatedSpoonacularIds(userId: string): Promise<number[]>;
  
  // Subscription operations
  updateUserStripeInfo(userId: string, customerId: string, subscriptionId?: string): Promise<User>;
  updateUserGoldStatus(userId: string, isGold: boolean): Promise<User>;
  
  // Daily usage operations
  getDailyUsage(userId: string, date: string): Promise<DailyUsage | undefined>;
  incrementDailyLikes(userId: string, date: string): Promise<DailyUsage>;
  getRemainingLikes(userId: string, date: string): Promise<number>;
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

  async updateUserProfile(userId: string, profileData: { firstName: string; lastName: string; email: string }): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error("User not found");
    }
    
    return updatedUser;
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

  async addShoppingListItemWithMerging(item: InsertShoppingListItem): Promise<ShoppingListItem> {
    // Import utility functions
    const { areIngredientsSimilar, combineQuantities } = await import('./quantityUtils');
    
    // Check for existing similar ingredients for this user
    const existingItems = await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.userId, item.userId));

    // Find if there's a similar ingredient that can be merged
    const similarItem = existingItems.find(existing => 
      areIngredientsSimilar(existing.name, item.name)
    );

    if (similarItem) {
      // Merge the quantities and update the existing item
      const combinedAmount = combineQuantities(similarItem.amount || null, item.amount || null);
      
      const [updatedItem] = await db
        .update(shoppingListItems)
        .set({ 
          amount: combinedAmount,
          // Keep the aisle from the original item if new item doesn't have one
          aisle: item.aisle || similarItem.aisle
        })
        .where(eq(shoppingListItems.id, similarItem.id))
        .returning();
      
      return updatedItem;
    } else {
      // No similar item found, add as new
      const [newItem] = await db.insert(shoppingListItems).values(item).returning();
      return newItem;
    }
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

  async getUserRatedSpoonacularIds(userId: string): Promise<number[]> {
    const preferences = await db
      .select({ spoonacularId: userPreferences.spoonacularId })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return preferences.map(p => p.spoonacularId);
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

  // Subscription operations
  async updateUserStripeInfo(userId: string, customerId: string, subscriptionId?: string): Promise<User> {
    const updateData: Partial<User> = {
      stripeCustomerId: customerId,
      updatedAt: new Date(),
    };
    
    if (subscriptionId) {
      updateData.stripeSubscriptionId = subscriptionId;
      updateData.isGoldMember = true;
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async updateUserGoldStatus(userId: string, isGold: boolean): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        isGoldMember: isGold,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  // Daily usage operations
  async getDailyUsage(userId: string, date: string): Promise<DailyUsage | undefined> {
    const [usage] = await db
      .select()
      .from(dailyUsage)
      .where(and(eq(dailyUsage.userId, userId), eq(dailyUsage.date, date)));
    return usage;
  }

  async incrementDailyLikes(userId: string, date: string): Promise<DailyUsage> {
    const existing = await this.getDailyUsage(userId, date);
    
    if (existing) {
      const [updated] = await db
        .update(dailyUsage)
        .set({ 
          likesCount: (existing.likesCount || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(dailyUsage.id, existing.id))
        .returning();
      return updated;
    } else {
      const [newUsage] = await db
        .insert(dailyUsage)
        .values({
          userId,
          date,
          likesCount: 1,
        })
        .returning();
      return newUsage;
    }
  }

  async getRemainingLikes(userId: string, date: string): Promise<number> {
    const usage = await this.getDailyUsage(userId, date);
    const DAILY_LIMIT = 50;
    return Math.max(0, DAILY_LIMIT - (usage?.likesCount || 0));
  }
}

export const storage = new DatabaseStorage();
