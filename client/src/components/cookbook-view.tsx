import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Eye, Plus, Trash2 } from "lucide-react";
import RecipeModal from "./recipe-modal";

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
}

interface UserRecipe {
  id: string;
  userId: string;
  recipeId: string;
  createdAt: string;
  recipe: Recipe;
}

export default function CookbookView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const { data: userRecipes = [], isLoading, error } = useQuery<UserRecipe[]>({
    queryKey: ["/api/cookbook"],
    retry: false,
  });

  const removeRecipeMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      const response = await fetch(`/api/cookbook/${recipeId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cookbook"] });
      toast({
        title: "Recipe Removed",
        description: "Recipe removed from your cookbook",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to remove recipe. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addToShoppingListMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      const response = await fetch(`/api/shopping-list/recipe/${recipeId}`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (_, recipeId) => {
      const recipe = userRecipes.find(ur => ur.recipe.id === recipeId)?.recipe;
      toast({
        title: "Added to Shopping List!",
        description: `Ingredients for ${recipe?.title} added to your shopping list`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
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
      });
    },
  });

  if (error && isUnauthorizedError(error as Error)) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
    return null;
  }

  if (isLoading) {
    return (
      <div className="absolute inset-0 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your cookbook...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">My Cookbook</h2>
        <span className="text-sm text-muted-foreground">
          {userRecipes.length} recipe{userRecipes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {userRecipes.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No recipes saved yet</h3>
            <p className="text-muted-foreground mb-4">
              Start discovering recipes and save your favorites!
            </p>
          </div>
        </div>
      ) : (
        <ScrollArea className="h-full pb-20">
          <div className="space-y-4">
            {userRecipes.map((userRecipe) => (
              <div
                key={userRecipe.id}
                className="bg-white rounded-xl shadow-sm border border-border overflow-hidden"
              >
                <div className="flex">
                  <img
                    src={userRecipe.recipe.image || "/api/placeholder/120/120"}
                    alt={userRecipe.recipe.title}
                    className="w-20 h-20 object-cover flex-shrink-0"
                  />
                  <div className="flex-1 p-4 min-w-0">
                    <h3 className="font-bold text-foreground mb-1 truncate">
                      {userRecipe.recipe.title}
                    </h3>
                    <div className="text-sm text-muted-foreground mb-2">
                      <span>{userRecipe.recipe.readyInMinutes} min</span> • 
                      <span> {userRecipe.recipe.servings} servings</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-primary hover:text-primary/80 text-sm font-medium p-1 h-auto"
                        onClick={() => setSelectedRecipe(userRecipe.recipe)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Recipe
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-secondary hover:text-secondary/80 text-sm font-medium p-1 h-auto"
                        onClick={() => addToShoppingListMutation.mutate(userRecipe.recipe.id)}
                        disabled={addToShoppingListMutation.isPending}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add to List
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive/80 text-sm font-medium p-1 h-auto"
                        onClick={() => removeRecipeMutation.mutate(userRecipe.recipe.id)}
                        disabled={removeRecipeMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </div>
  );
}
