import { useEffect, useState } from "react";
import { ChefHat, Sparkles } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Add a small delay for fade out animation before calling onComplete
      setTimeout(onComplete, 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-orange-400 via-red-400 to-pink-500 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="text-center text-white">
        {/* Animated Logo */}
        <div className="relative mb-8">
          <div className="animate-bounce">
            <ChefHat className="w-20 h-20 mx-auto mb-4" />
          </div>
          <div className="absolute -top-2 -right-2 animate-pulse">
            <Sparkles className="w-8 h-8 text-yellow-300" />
          </div>
        </div>

        {/* App Name */}
        <h1 className="text-4xl font-bold mb-2 animate-fade-in">
          FlavorSwipe
        </h1>
        
        {/* Tagline */}
        <p className="text-lg opacity-90 animate-fade-in-delay">
          Discover your next favorite recipe
        </p>

        {/* Loading Animation */}
        <div className="mt-8 flex justify-center">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-0"></div>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-75"></div>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      </div>
    </div>
  );
}