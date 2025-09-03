import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

import { Progress } from "@/components/ui/progress";
import { Search, Heart, ShoppingCart, User, Crown, LogOut } from "lucide-react";
import RecipeCardStack from "@/components/recipe-card-stack";
import RecipeModal from "@/components/recipe-modal";
import CookbookView from "@/components/cookbook-view";
import ShoppingView from "@/components/shopping-view";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";
import { useOnboarding } from "@/hooks/useOnboarding";
import OnboardingTutorial from "@/components/OnboardingTutorial";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

interface UserStatus {
  isGoldMember: boolean;
  remainingLikes: number;
  email: string;
  firstName?: string;
  lastName?: string;
}

export default function Home() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentView, setCurrentView] = useState<ViewType>("discover");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);
  const [isAppInitialized, setIsAppInitialized] = useState(false);
  
  // Onboarding tutorial
  const { 
    currentTutorial, 
    currentStep, 
    skipTutorial, 
    nextStep, 
    isTutorialActive,
    startTutorial,
    completedTutorials
  } = useOnboarding();

  // Fetch user status for usage tracking
  const { data: userStatus } = useQuery<UserStatus>({
    queryKey: ['/api/user/status'],
    retry: false,
    enabled: !!user,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
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
  }, [user, isLoading, toast]);

  // Load initial recipes and initialize app
  useEffect(() => {
    if (user) {
      loadRecipes().finally(() => {
        // Add a small delay to ensure smooth loading experience
        setTimeout(() => setIsAppInitialized(true), 300);
      });
    }
  }, [user]);

  const loadRecipes = async () => {
    setIsLoadingRecipes(true);
    try {
      // Load multiple batches of recipes for a better stack experience
      const batchPromises = [];
      const batchesToLoad = recipes.length === 0 ? 3 : 2; // Load 3 batches initially, 2 batches when refilling
      
      for (let i = 0; i < batchesToLoad; i++) {
        batchPromises.push(
          fetch("/api/recipes/discover", {
            credentials: "include",
          }).then(res => {
            if (!res.ok) {
              throw new Error(`${res.status}: ${res.statusText}`);
            }
            return res.json();
          })
        );
      }

      const batchResults = await Promise.all(batchPromises);
      const newRecipes = batchResults.flat();
      
      setRecipes(prev => [...prev, ...newRecipes]);
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
        description: "Failed to load recipes. Please try again.",
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  const handleSwipe = async (direction: "left" | "right") => {
    const currentRecipe = recipes[currentRecipeIndex];
    if (!currentRecipe) return;

    // Save user preference and check for usage limits
    try {
      const preferenceResponse = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          spoonacularId: currentRecipe.spoonacularId,
          liked: direction === "right",
        }),
      });

      if (preferenceResponse.status === 429) {
        // Daily limit reached
        const data = await preferenceResponse.json();
        toast({
          title: "Daily Limit Reached",
          description: "You've reached your daily limit of 50 likes. Upgrade to FlavorSwipe Gold for unlimited likes!",
          variant: "destructive",
          duration: 1000,
        });
        return; // Don't proceed with the swipe
      }

      if (preferenceResponse.ok) {
        // Update user status to reflect new usage
        queryClient.invalidateQueries({ queryKey: ['/api/user/status'] });
      }

      // If liked, save to cookbook
      if (direction === "right") {
        const response = await fetch("/api/cookbook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            recipeId: currentRecipe.id,
          }),
        });
        
        if (response.ok) {
          // Invalidate cookbook cache to ensure fresh data
          queryClient.invalidateQueries({ queryKey: ["/api/cookbook"] });
          
          toast({
            title: "Recipe Saved!",
            description: `${currentRecipe.title} added to your cookbook`,
            duration: 1000,
          });
        } else if (response.status === 409) {
          // Recipe already saved - still show success since it's saved
          toast({
            title: "Recipe Already Saved!",
            description: `${currentRecipe.title} is already in your cookbook`,
            duration: 1000,
          });
        }
      }
    } catch (error) {
      console.error("Error saving preference:", error);
    }

    // Move to next recipe
    const nextIndex = currentRecipeIndex + 1;
    setCurrentRecipeIndex(nextIndex);

    // Load more recipes if we're running low (keep 5+ recipes ahead)
    if (nextIndex >= recipes.length - 5) {
      loadRecipes();
    }
  };

  const handleViewChange = async (view: ViewType) => {
    setCurrentView(view);
    
    // Start tutorial for specific tabs if not completed
    if (view === 'cookbook' && !completedTutorials.has('cookbook')) {
      await startTutorial('cookbook');
    } else if (view === 'shopping' && !completedTutorials.has('shopping')) {
      await startTutorial('shopping');
    }
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

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

  // Show loading screen while app is initializing
  if (!isAppInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-lg">Preparing your recipes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-accent">
      <div className="max-w-md mx-auto bg-white shadow-xl min-h-screen relative overflow-hidden">
        {/* Header */}
        <header className="bg-primary text-primary-foreground p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold flex items-center gap-2">
              FlavorSwipe
              {userStatus?.isGoldMember && (
                <Crown className="w-5 h-5 text-yellow-400" />
              )}
            </h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-primary-foreground hover:bg-primary-foreground/10"
                  data-testid="button-profile-menu"
                >
                  <User className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center cursor-pointer" data-testid="link-profile">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer" data-testid="button-logout">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Usage Progress Bar for non-Gold users */}
          {userStatus && !userStatus.isGoldMember && (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Daily Likes</span>
                <span>{50 - userStatus.remainingLikes} / 50</span>
              </div>
              <Progress 
                value={((50 - userStatus.remainingLikes) / 50) * 100} 
                className="h-1"
              />
              <div className="text-xs text-primary-foreground/80">
                {userStatus.remainingLikes} likes remaining today
              </div>
            </div>
          )}
        </header>

        {/* Navigation Tabs */}
        <nav className="bg-white border-b border-border">
          <div className="flex">
            <button
              onClick={() => handleViewChange("discover")}
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
              onClick={() => handleViewChange("cookbook")}
              data-tutorial="cookbook-tab"
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
              onClick={() => handleViewChange("shopping")}
              data-tutorial="shopping-tab"
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
              <RecipeCardStack
                recipes={recipes}
                currentIndex={currentRecipeIndex}
                onSwipe={handleSwipe}
                onInfoClick={setSelectedRecipe}
                isLoading={isLoadingRecipes}
              />
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

        {/* Onboarding Tutorial */}
        {isTutorialActive && currentTutorial && (
          <OnboardingTutorial
            tutorial={currentTutorial}
            step={currentStep}
            onSkip={skipTutorial}
            onNext={nextStep}
          />
        )}
      </div>
    </div>
  );
}
