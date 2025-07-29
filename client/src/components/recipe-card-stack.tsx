import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Users, Info, X, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import RecipePlaceholder from "./recipe-placeholder";

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

interface RecipeCardStackProps {
  recipes: Recipe[];
  currentIndex: number;
  onSwipe: (direction: "left" | "right") => void;
  onInfoClick: (recipe: Recipe) => void;
  isLoading: boolean;
}

interface SwipeableCardProps {
  recipe: Recipe;
  index: number;
  currentIndex: number;
  onSwipe: (direction: "left" | "right") => void;
  onInfoClick: () => void;
  isAnimating: boolean;
  swipeDirection?: "left" | "right";
  isDismissed: boolean;
}

function SwipeableCard({ 
  recipe, 
  index, 
  currentIndex, 
  onSwipe, 
  onInfoClick,
  isAnimating,
  swipeDirection,
  isDismissed
}: SwipeableCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const isTopCard = index === currentIndex;
  const cardDepth = index - currentIndex;

  // Calculate card position and scale based on its depth in the stack
  const getCardStyle = () => {
    // If this card has been dismissed, keep it off-screen
    if (isDismissed && !isAnimating) {
      return {
        transform: 'translateX(-1000px)',
        opacity: 0,
        zIndex: -1,
        transition: 'none',
        pointerEvents: 'none' as const
      };
    }

    const baseScale = 1 - Math.abs(cardDepth) * 0.05;
    const baseY = Math.abs(cardDepth) * 8;
    // Top card and next card should be fully opaque, cards further behind get reduced opacity
    const opacity = cardDepth < 0 ? 0 : (cardDepth === 0 || cardDepth === 1) ? 1 : Math.max(0.3, 1 - Math.abs(cardDepth) * 0.2);
    
    let transform = `translateY(${baseY}px) scale(${baseScale})`;
    let cardOpacity = opacity;

    // If this is the top card and it's being dragged or animated
    if (isTopCard) {
      const rotation = dragOffset.x * 0.1;
      
      if (isAnimating && swipeDirection) {
        // Animate the card off-screen
        const animateX = swipeDirection === "right" ? 400 : -400;
        transform = `translateX(${animateX}px) translateY(${dragOffset.y}px) rotate(${rotation}deg) scale(${baseScale})`;
        cardOpacity = 0;
      } else if (isDragging) {
        // Apply drag transform - only start fading when significantly moved
        cardOpacity = Math.max(0.5, 1 - Math.abs(dragOffset.x) / 400);
        transform = `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${rotation}deg) scale(${baseScale})`;
      } else {
        // Top card should always be fully opaque when not being interacted with
        cardOpacity = 1;
      }
    }

    return {
      transform,
      opacity: cardOpacity,
      zIndex: 10 - cardDepth,
      transition: isAnimating || !isTopCard ? 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : isDragging ? 'none' : 'transform 0.2s ease-out',
      pointerEvents: isTopCard ? 'auto' as const : 'none' as const
    };
  };

  const handleSwipe = (direction: "left" | "right") => {
    if (!isTopCard) return;
    onSwipe(direction);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isTopCard) return;
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isTopCard) return;
    
    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleMouseUp = () => {
    if (!isDragging || !isTopCard) return;
    
    const threshold = 100;
    if (Math.abs(dragOffset.x) > threshold) {
      handleSwipe(dragOffset.x > 0 ? "right" : "left");
    }
    
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isTopCard) return;
    const touch = e.touches[0];
    setIsDragging(true);
    startPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !isTopCard) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - startPos.current.x;
    const deltaY = touch.clientY - startPos.current.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleTouchEnd = () => {
    if (!isDragging || !isTopCard) return;
    
    const threshold = 100;
    if (Math.abs(dragOffset.x) > threshold) {
      handleSwipe(dragOffset.x > 0 ? "right" : "left");
    }
    
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  };

  // Don't render cards that are too far behind or dismissed (unless animating)
  if ((cardDepth < -1 || cardDepth > 2) && !(isDismissed && isAnimating)) {
    return null;
  }

  return (
    <div
      ref={cardRef}
      className="absolute inset-0 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden cursor-grab active:cursor-grabbing flex flex-col"
      style={getCardStyle()}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {recipe.image && recipe.image.trim() !== '' ? (
        <img
          src={recipe.image}
          alt={recipe.title}
          className="w-full h-64 object-cover"
          draggable={false}
          onError={(e) => {
            // If image fails to load, hide it and show placeholder
            e.currentTarget.style.display = 'none';
            const placeholderElement = e.currentTarget.nextElementSibling as HTMLElement;
            if (placeholderElement) {
              placeholderElement.style.display = 'flex';
            }
          }}
        />
      ) : null}
      <RecipePlaceholder 
        className="w-full h-64" 
        title={recipe.title}
        style={{ 
          display: (recipe.image && recipe.image.trim() !== '') ? 'none' : 'flex' 
        }}
      />
      
      {/* Content Section */}
      <div className="flex-1 bg-white dark:bg-gray-800 p-6 flex flex-col justify-start">
        <h3 className="text-xl font-bold mb-2 text-foreground">{recipe.title}</h3>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{recipe.readyInMinutes} min</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span>{recipe.servings} servings</span>
          </div>
        </div>
      </div>

      {/* Info Button - only show on top card */}
      {isTopCard && (
        <Button
          size="sm"
          variant="secondary"
          className="absolute top-4 right-4 bg-white/90 hover:bg-white text-foreground rounded-full p-2 w-auto h-auto"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onInfoClick();
          }}
        >
          <Info className="w-5 h-5" />
        </Button>
      )}

      {/* Swipe indicators */}
      {isTopCard && isDragging && (
        <>
          {dragOffset.x > 50 && (
            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
              <div className="bg-green-500 text-white px-4 py-2 rounded-full font-bold text-lg">
                LIKE
              </div>
            </div>
          )}
          {dragOffset.x < -50 && (
            <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
              <div className="bg-red-500 text-white px-4 py-2 rounded-full font-bold text-lg">
                PASS
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function RecipeCardStack({ 
  recipes, 
  currentIndex, 
  onSwipe, 
  onInfoClick, 
  isLoading 
}: RecipeCardStackProps) {
  const [animatingCard, setAnimatingCard] = useState<{ index: number; direction: "left" | "right" } | null>(null);
  const [dismissedCards, setDismissedCards] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const handleSwipe = (direction: "left" | "right") => {
    const currentRecipe = recipes[currentIndex];
    if (!currentRecipe || animatingCard) return; // Prevent multiple swipes during animation

    // Mark card as dismissed
    setDismissedCards(prev => new Set([...Array.from(prev), currentIndex]));
    
    // Start animation
    setAnimatingCard({ index: currentIndex, direction });

    // Clear animation and call parent handler
    setTimeout(() => {
      setAnimatingCard(null);
      onSwipe(direction);
      
      // Clean up dismissed cards that are far behind current index
      const nextIndex = currentIndex + 1;
      setDismissedCards(prev => {
        const newSet = new Set(prev);
        Array.from(prev).forEach(index => {
          if (index < nextIndex - 5) {
            newSet.delete(index);
          }
        });
        return newSet;
      });
    }, 300);

  };

  // Show loading state when no recipes are available
  if (recipes.length === 0 && isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading recipes...</p>
        </div>
      </div>
    );
  }

  // Show no recipes state
  if (recipes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No recipes available</p>
          <Button onClick={() => window.location.reload()}>
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  // Show "no more recipes" if we've gone through all
  if (currentIndex >= recipes.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No more recipes available</p>
          <p className="text-sm text-muted-foreground">New recipes will load automatically</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Render stack of cards */}
      {recipes.slice(Math.max(0, currentIndex - 1), currentIndex + 3).map((recipe, idx) => {
        const actualIndex = Math.max(0, currentIndex - 1) + idx;
        return (
          <SwipeableCard
            key={`${recipe.id}-${actualIndex}`}
            recipe={recipe}
            index={actualIndex}
            currentIndex={currentIndex}
            onSwipe={handleSwipe}
            onInfoClick={() => onInfoClick(recipe)}
            isAnimating={animatingCard?.index === actualIndex}
            swipeDirection={animatingCard?.index === actualIndex ? animatingCard.direction : undefined}
            isDismissed={dismissedCards.has(actualIndex)}
          />
        );
      })}

      {/* Action Buttons - only show when there's a current recipe */}
      {recipes[currentIndex] && !animatingCard && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-6 z-20">
          <Button
            size="lg"
            variant="outline"
            className="w-16 h-16 rounded-full border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground bg-white dark:bg-gray-800"
            onClick={() => handleSwipe("left")}
          >
            <X className="w-8 h-8" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-16 h-16 rounded-full border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-white bg-white dark:bg-gray-800"
            onClick={() => handleSwipe("right")}
          >
            <Heart className="w-8 h-8" />
          </Button>
        </div>
      )}

      {/* Loading indicator for more recipes */}
      {isLoading && recipes.length > 0 && (
        <div className="absolute top-4 left-4 bg-white/90 dark:bg-gray-800/90 rounded-full px-3 py-1 shadow-md">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-muted-foreground">Loading more...</span>
          </div>
        </div>
      )}
    </div>
  );
}