import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { X, Clock, Users, ChefHat, Plus, Mic2 } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatQuantity } from "@/lib/utils";
import NutritionChart from "@/components/nutrition-chart";
import RecipePlaceholder from "./recipe-placeholder";
import HandsFreeCookingMode from "./HandsFreeCookingMode";

interface Recipe {
  id: string;
  spoonacularId: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  summary: string;
  instructions: string[];
  ingredients: Array<{
    id: number;
    name: string;
    amount: number;
    unit: string;
    aisle: string;
  }>;
  nutrition?: {
    calories: number;
    carbohydrates: number;
    fat: number;
    protein: number;
    fiber: number;
    sugar: number;
    sodium: number;
    cholesterol: number;
    saturatedFat: number;
  } | null;
}

interface RecipeModalProps {
  recipe: Recipe;
  onClose: () => void;
  isFromCookbook?: boolean;
}

export default function RecipeModal({ recipe, onClose, isFromCookbook = false }: RecipeModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingToShoppingList, setIsAddingToShoppingList] = useState(false);
  const [isHandsFreeModeOpen, setIsHandsFreeModeOpen] = useState(false);

  const handleSaveRecipe = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/cookbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          recipeId: recipe.id,
        }),
      });

      if (response.ok) {
        // Invalidate cookbook cache to ensure fresh data
        queryClient.invalidateQueries({ queryKey: ["/api/cookbook"] });

        toast({
          title: "Recipe Saved!",
          description: `${recipe.title} added to your cookbook`,
          duration: 1000,
        });
      } else if (response.status === 409) {
        // Recipe already saved
        toast({
          title: "Already Saved!",
          description: `${recipe.title} is already in your cookbook`,
          duration: 1000,
        });
      } else {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
          duration: 1000,
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save recipe. Please try again.",
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddToShoppingList = async () => {
    setIsAddingToShoppingList(true);
    try {
      const response = await fetch(`/api/shopping-list/recipe/${recipe.id}`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      // Invalidate shopping list cache to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-list"] });

      toast({
        title: "Added to Shopping List!",
        description: `Ingredients for ${recipe.title} added to your shopping list`,
        duration: 1000,
      });
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
          duration: 1000,
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add ingredients to shopping list.",
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setIsAddingToShoppingList(false);
    }
  };

  const addSingleIngredient = async (ingredient: typeof recipe.ingredients[0]) => {
    try {
      await fetch("/api/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: ingredient.name,
          amount: `${ingredient.amount} ${ingredient.unit}`.trim(),
          aisle: ingredient.aisle || "Other",
          recipeId: recipe.id,
        }),
      });

      // Invalidate shopping list cache to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-list"] });

      toast({
        title: "Added to List", 
        description: `${ingredient.name} added to shopping list`,
        duration: 1000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add ingredient to shopping list.",
        variant: "destructive",
        duration: 1000,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg h-full max-h-[95vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-border p-4 flex justify-between items-center rounded-t-3xl">
          <h3 className="text-lg font-bold truncate pr-4">{recipe.title}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full p-2 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Recipe Image */}
            {recipe.image ? (
              <img
                src={recipe.image}
                alt={recipe.title}
                className="w-full h-48 object-cover rounded-xl"
              />
            ) : (
              <RecipePlaceholder 
                className="w-full h-48 rounded-xl" 
                title={recipe.title}
              />
            )}

            {/* Recipe Info */}
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{recipe.readyInMinutes} minutes</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{recipe.servings} servings</span>
              </div>
              <div className="flex items-center space-x-1">
                <ChefHat className="w-4 h-4" />
                <span>Medium</span>
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <h4 className="font-bold text-foreground mb-3">Ingredients</h4>
              <div className="space-y-2">
                {recipe.ingredients?.map((ingredient, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-foreground">
                      {formatQuantity(`${ingredient.amount} ${ingredient.unit}`)} {ingredient.name}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-secondary hover:text-secondary/80 text-xs font-medium"
                      onClick={() => addSingleIngredient(ingredient)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  </div>
                )) || (
                  <p className="text-muted-foreground text-sm">No ingredients available</p>
                )}
              </div>
            </div>

            {/* Nutrition Information */}
            {recipe.nutrition ? (
              <NutritionChart 
                nutrition={recipe.nutrition} 
                servings={recipe.servings}
              />
            ) : (
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-muted-foreground">Nutrition information not available for this recipe</p>
              </div>
            )}

            {/* Instructions */}
            <div>
              <h4 className="font-bold text-foreground mb-3">Instructions</h4>
              <div className="space-y-4">
                {recipe.instructions?.map((step, index) => (
                  <div key={index} className="flex space-x-3">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{step}</p>
                  </div>
                )) || (
                  <p className="text-muted-foreground text-sm">No instructions available</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-border space-y-3">
          <div className="flex space-x-3">
            {!isFromCookbook && (
              <Button
                onClick={handleSaveRecipe}
                disabled={isSaving}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {isSaving ? "Saving..." : "Save to Cookbook"}
              </Button>
            )}
            <Button
              onClick={handleAddToShoppingList}
              disabled={isAddingToShoppingList}
              className={`${isFromCookbook ? 'w-full' : 'flex-1'} bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold`}
            >
              {isAddingToShoppingList ? "Adding..." : "Add to Shopping List"}
            </Button>
          </div>
          
          {/* Hands-Free Cooking Button */}
          <Button
            onClick={() => setIsHandsFreeModeOpen(true)}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold flex items-center justify-center gap-2"
          >
            <Mic2 className="w-4 h-4" />
            Start Hands-Free Cooking
          </Button>
        </div>
      </div>

      {/* Hands-Free Cooking Mode */}
      <HandsFreeCookingMode
        recipe={recipe}
        isOpen={isHandsFreeModeOpen}
        onClose={() => setIsHandsFreeModeOpen(false)}
      />
    </div>
  );
}
