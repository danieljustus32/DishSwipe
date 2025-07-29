import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Heart, ShoppingCart } from "lucide-react";
import RecipeCard from "@/components/recipe-card";
import RecipeModal from "@/components/recipe-modal";
import CookbookView from "@/components/cookbook-view";
import ShoppingView from "@/components/shopping-view";
import { isUnauthorizedError } from "@/lib/authUtils";

type ViewType = "discover" | "cookbook" | "shopping";

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
  userPreference?: boolean;
  isSaved?: boolean;
}

export default function Home() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentView, setCurrentView] = useState<ViewType>("discover");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
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
  }, [user, isLoading, toast]);

  // Load initial recipes
  useEffect(() => {
    if (user) {
      loadRecipes();
    }
  }, [user]);

  const loadRecipes = async () => {
    setIsLoadingRecipes(true);
    try {
      const response = await fetch("/api/recipes/discover", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      const newRecipes = await response.json();
      setRecipes(prev => [...prev, ...newRecipes]);
    } catch (error) {
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
        description: "Failed to load recipes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  const handleSwipe = async (direction: "left" | "right") => {
    const currentRecipe = recipes[currentRecipeIndex];
    if (!currentRecipe) return;

    // Save user preference
    try {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          spoonacularId: currentRecipe.spoonacularId,
          liked: direction === "right",
        }),
      });

      // If liked, save to cookbook
      if (direction === "right") {
        await fetch("/api/cookbook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            recipeId: currentRecipe.id,
          }),
        });
        
        // Invalidate cookbook cache to ensure fresh data
        queryClient.invalidateQueries({ queryKey: ["/api/cookbook"] });
        
        toast({
          title: "Recipe Saved!",
          description: `${currentRecipe.title} added to your cookbook`,
          duration: 1000,
        });
      }
    } catch (error) {
      console.error("Error saving preference:", error);
    }

    // Move to next recipe
    const nextIndex = currentRecipeIndex + 1;
    setCurrentRecipeIndex(nextIndex);

    // Load more recipes if we're running low
    if (nextIndex >= recipes.length - 2) {
      loadRecipes();
    }
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const currentRecipe = recipes[currentRecipeIndex];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-accent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-accent">
      <div className="max-w-md mx-auto bg-white shadow-xl min-h-screen relative overflow-hidden">
        {/* Header */}
        <header className="bg-primary text-primary-foreground p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">FlavorSwipe</h1>
          <div className="flex items-center space-x-4">
            <Avatar className="w-8 h-8">
              <AvatarImage src={(user as any)?.profileImageUrl || undefined} />
              <AvatarFallback className="bg-white text-primary">
                {(user as any)?.firstName?.charAt(0) || (user as any)?.email?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              Logout
            </Button>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="bg-white border-b border-border">
          <div className="flex">
            <button
              onClick={() => setCurrentView("discover")}
              className={`flex-1 py-3 px-4 font-medium ${
                currentView === "discover"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Search className="w-5 h-5" />
                <span>Discover</span>
              </div>
            </button>
            <button
              onClick={() => setCurrentView("cookbook")}
              className={`flex-1 py-3 px-4 font-medium ${
                currentView === "cookbook"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Heart className="w-5 h-5" />
                <span>Cookbook</span>
              </div>
            </button>
            <button
              onClick={() => setCurrentView("shopping")}
              className={`flex-1 py-3 px-4 font-medium ${
                currentView === "shopping"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <ShoppingCart className="w-5 h-5" />
                <span>Shopping</span>
              </div>
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="relative h-[calc(100vh-140px)] overflow-hidden">
          {currentView === "discover" && (
            <div className="absolute inset-0 p-4">
              {isLoadingRecipes && recipes.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading recipes...</p>
                  </div>
                </div>
              ) : currentRecipe ? (
                <RecipeCard
                  recipe={currentRecipe}
                  onSwipe={handleSwipe}
                  onInfoClick={() => setSelectedRecipe(currentRecipe)}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">No more recipes available</p>
                    <Button onClick={loadRecipes} disabled={isLoadingRecipes}>
                      {isLoadingRecipes ? "Loading..." : "Load More"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentView === "cookbook" && <CookbookView />}
          {currentView === "shopping" && <ShoppingView />}
        </main>

        {/* Recipe Modal */}
        {selectedRecipe && (
          <RecipeModal
            recipe={selectedRecipe}
            onClose={() => setSelectedRecipe(null)}
          />
        )}
      </div>
    </div>
  );
}
