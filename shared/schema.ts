import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Password field for email/password authentication
  password: varchar("password"), // Hashed password - optional for OAuth users
  // Authentication provider fields
  authProvider: varchar("auth_provider").default("replit"), // 'replit', 'google', 'apple', 'email'
  googleId: varchar("google_id"),
  appleId: varchar("apple_id"),
  replitId: varchar("replit_id"),
  // Stripe fields
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  isGoldMember: boolean("is_gold_member").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recipes table
export const recipes = pgTable("recipes", {
  id: varchar("id").primaryKey(),
  spoonacularId: integer("spoonacular_id").unique().notNull(),
  title: text("title").notNull(),
  image: text("image"),
  readyInMinutes: integer("ready_in_minutes"),
  servings: integer("servings"),
  summary: text("summary"),
  instructions: text("instructions").array(),
  ingredients: jsonb("ingredients").$type<Array<{
    id: number;
    name: string;
    amount: number;
    unit: string;
    aisle: string;
  }>>(),
  nutrition: jsonb("nutrition").$type<{
    calories: number;
    carbohydrates: number;
    fat: number;
    protein: number;
    fiber: number;
    sugar: number;
    sodium: number;
    cholesterol: number;
    saturatedFat: number;
  } | null>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User cookbook (saved recipes)
export const userRecipes = pgTable("user_recipes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipeId: varchar("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shopping list items
export const shoppingListItems = pgTable("shopping_list_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amount: text("amount"),
  aisle: text("aisle").notNull(),
  checked: boolean("checked").default(false),
  recipeId: varchar("recipe_id").references(() => recipes.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// User recipe preferences (for better recommendations)
export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  spoonacularId: integer("spoonacular_id").notNull(),
  liked: boolean("liked").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_preferences_unique").on(table.userId, table.spoonacularId),
]);

// Daily usage tracking for rate limiting
export const dailyUsage = pgTable("daily_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: varchar("date").notNull(), // YYYY-MM-DD format
  likesCount: integer("likes_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_daily_usage_unique").on(table.userId, table.date),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  userRecipes: many(userRecipes),
  shoppingListItems: many(shoppingListItems),
  preferences: many(userPreferences),
  dailyUsage: many(dailyUsage),
}));

export const recipesRelations = relations(recipes, ({ many }) => ({
  userRecipes: many(userRecipes),
  shoppingListItems: many(shoppingListItems),
}));

export const userRecipesRelations = relations(userRecipes, ({ one }) => ({
  user: one(users, {
    fields: [userRecipes.userId],
    references: [users.id],
  }),
  recipe: one(recipes, {
    fields: [userRecipes.recipeId],
    references: [recipes.id],
  }),
}));

export const shoppingListItemsRelations = relations(shoppingListItems, ({ one }) => ({
  user: one(users, {
    fields: [shoppingListItems.userId],
    references: [users.id],
  }),
  recipe: one(recipes, {
    fields: [shoppingListItems.recipeId],
    references: [recipes.id],
  }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

export const dailyUsageRelations = relations(dailyUsage, ({ one }) => ({
  user: one(users, {
    fields: [dailyUsage.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  createdAt: true,
});

export const insertUserRecipeSchema = createInsertSchema(userRecipes).omit({
  id: true,
  createdAt: true,
});

export const insertShoppingListItemSchema = createInsertSchema(shoppingListItems).omit({
  id: true,
  createdAt: true,
});

export const insertUserPreferenceSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
});

export const insertDailyUsageSchema = createInsertSchema(dailyUsage).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Password validation schema with complexity requirements
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character");

// Email/password authentication schemas
export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Please confirm your password"),
  firstName: z.string().min(1, "First name is required").max(50, "First name too long"),
  lastName: z.string().min(1, "Last name is required").max(50, "Last name too long"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Profile update schema for user-editable fields
export const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50, "First name too long"),
  lastName: z.string().min(1, "Last name is required").max(50, "Last name too long"),
  email: z.string().email("Invalid email address"),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type User = typeof users.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type UserRecipe = typeof userRecipes.$inferSelect;
export type InsertUserRecipe = z.infer<typeof insertUserRecipeSchema>;
export type ShoppingListItem = typeof shoppingListItems.$inferSelect;
export type InsertShoppingListItem = z.infer<typeof insertShoppingListItemSchema>;
export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = z.infer<typeof insertUserPreferenceSchema>;
export type DailyUsage = typeof dailyUsage.$inferSelect;
export type InsertDailyUsage = z.infer<typeof insertDailyUsageSchema>;
