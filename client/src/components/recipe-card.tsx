import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Users, Info, X, Heart } from "lucide-react";

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

interface RecipeCardProps {
  recipe: Recipe;
  onSwipe: (direction: "left" | "right") => void;
  onInfoClick: () => void;
}

export default function RecipeCard({ recipe, onSwipe, onInfoClick }: RecipeCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const dislikeButtonRef = useRef<HTMLButtonElement>(null);
  const likeButtonRef = useRef<HTMLButtonElement>(null);

  // Clear button focus when recipe changes
  useEffect(() => {
    if (dislikeButtonRef.current) {
      dislikeButtonRef.current.blur();
    }
    if (likeButtonRef.current) {
      likeButtonRef.current.blur();
    }
  }, [recipe.id]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    const threshold = 100;
    if (Math.abs(dragOffset.x) > threshold) {
      onSwipe(dragOffset.x > 0 ? "right" : "left");
    }
    
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    startPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - startPos.current.x;
    const deltaY = touch.clientY - startPos.current.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const threshold = 100;
    if (Math.abs(dragOffset.x) > threshold) {
      onSwipe(dragOffset.x > 0 ? "right" : "left");
    }
    
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  };

  const rotation = dragOffset.x * 0.1;
  const opacity = 1 - Math.abs(dragOffset.x) / 300;

  return (
    <div className="relative h-full">
      <div
        ref={cardRef}
        className="card-swipe absolute inset-0 bg-white rounded-xl shadow-lg overflow-hidden cursor-grab active:cursor-grabbing flex flex-col"
        style={{
          transform: `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${rotation}deg)`,
          opacity: opacity,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={recipe.image || "/api/placeholder/400/300"}
          alt={recipe.title}
          className="w-full h-64 object-cover"
          draggable={false}
        />
        
        {/* Content Section */}
        <div className="flex-1 bg-white p-6 flex flex-col justify-start">
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
      </div>

      {/* Action Buttons */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-6 z-10">
        <Button
          ref={dislikeButtonRef}
          size="lg"
          variant="outline"
          className="action-button w-16 h-16 rounded-full border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground focus:outline-none focus:ring-0 focus:bg-destructive focus:text-destructive-foreground active:scale-95"
          onClick={() => onSwipe("left")}
        >
          <X className="w-8 h-8" />
        </Button>
        <Button
          ref={likeButtonRef}
          size="lg"
          variant="outline"
          className="action-button w-16 h-16 rounded-full border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-white bg-white focus:outline-none focus:ring-0 focus:bg-green-400 focus:text-white active:scale-95"
          onClick={() => onSwipe("right")}
        >
          <Heart className="w-8 h-8" />
        </Button>
      </div>
    </div>
  );
}
