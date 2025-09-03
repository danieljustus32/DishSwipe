import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, X, Hand, ArrowLeft, ArrowRight } from "lucide-react";

interface SwipeTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function SwipeTutorial({ onComplete, onSkip }: SwipeTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  const steps = [
    {
      id: 'swipe-intro',
      title: 'Learn to Swipe!',
      description: 'Let me show you how to discover recipes with simple gestures',
      showDemo: false
    },
    {
      id: 'swipe-right',
      title: 'Swipe Right to Love',
      description: 'Swipe right or tap ❤️ to save recipes you like to your cookbook',
      showDemo: true,
      demoDirection: 'right' as const
    },
    {
      id: 'swipe-left',
      title: 'Swipe Left to Skip',
      description: 'Swipe left or tap ✖️ to skip recipes that don\'t interest you',
      showDemo: true,
      demoDirection: 'left' as const
    },
    {
      id: 'try-yourself',
      title: 'Now You Try!',
      description: 'Practice swiping on this card to get the feel for it',
      showDemo: false,
      interactive: true
    }
  ];

  const currentStepData = steps[currentStep];

  // Auto-advance intro step
  useEffect(() => {
    if (currentStep === 0) {
      const timer = setTimeout(() => {
        setCurrentStep(1);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // Demo animation effect
  useEffect(() => {
    if (currentStepData?.showDemo && !isAnimating) {
      const animationTimer = setInterval(() => {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 1500);
      }, 3000);

      return () => clearInterval(animationTimer);
    }
  }, [currentStep, currentStepData?.showDemo, isAnimating]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleInteractiveSwipe = (direction: 'left' | 'right') => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
      onComplete();
    }, 800);
  };

  const getDemoCardStyle = () => {
    if (!isAnimating || !currentStepData?.showDemo) {
      return {
        transform: 'translateX(0px) rotate(0deg)',
        opacity: 1,
      };
    }

    const direction = currentStepData.demoDirection;
    const translateX = direction === 'right' ? '150px' : '-150px';
    const rotate = direction === 'right' ? '15deg' : '-15deg';

    return {
      transform: `translateX(${translateX}) rotate(${rotate})`,
      opacity: 0.7,
      transition: 'all 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    };
  };

  const getInteractiveCardStyle = () => {
    if (!isAnimating) {
      return {
        transform: 'translateX(0px) rotate(0deg)',
        opacity: 1,
      };
    }

    return {
      transform: 'translateX(300px) rotate(20deg)',
      opacity: 0,
      transition: 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    };
  };

  return (
    <>
      {/* Dark overlay */}
      <div className="fixed inset-0 bg-black/50 z-[1000]" />

      {/* Tutorial container */}
      <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">

          {/* Demo area - only show for demo steps */}
          {(currentStepData?.showDemo || currentStepData?.interactive) && (
            <div className="relative h-80 flex items-center justify-center">
              {/* Demo card */}
              <div
                className="relative w-64 h-72 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900 rounded-xl shadow-lg overflow-hidden cursor-pointer"
                style={currentStepData?.interactive ? getInteractiveCardStyle() : getDemoCardStyle()}
                onClick={currentStepData?.interactive ? () => handleInteractiveSwipe('right') : undefined}
                onTouchStart={currentStepData?.interactive ? () => handleInteractiveSwipe('right') : undefined}
              >
                {/* Demo recipe content */}
                <div className="h-40 bg-gradient-to-br from-orange-200 to-red-200 dark:from-orange-800 dark:to-red-800 flex items-center justify-center">
                  <div className="text-4xl">🍝</div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2">Delicious Pasta</h3>
                  <div className="flex items-center text-sm text-muted-foreground space-x-4">
                    <span>⏰ 25 min</span>
                    <span>👥 4 servings</span>
                  </div>
                </div>

                {/* Swipe direction indicators */}
                {currentStepData?.showDemo && isAnimating && (
                  <div className={`absolute inset-0 flex items-center justify-center ${
                    currentStepData.demoDirection === 'right' ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    <div className={`px-4 py-2 rounded-full font-bold text-white ${
                      currentStepData.demoDirection === 'right' ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {currentStepData.demoDirection === 'right' ? 'LOVE' : 'SKIP'}
                    </div>
                  </div>
                )}
              </div>

              {/* Animated hand gesture */}
              {currentStepData?.showDemo && (
                <div 
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{
                    transform: isAnimating 
                      ? `translateX(${currentStepData.demoDirection === 'right' ? '100px' : '-100px'})` 
                      : 'translateX(0px)',
                    transition: 'transform 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    opacity: isAnimating ? 0.8 : 1,
                  }}
                >
                  <div className="relative">
                    <Hand className="w-8 h-8 text-blue-500 animate-pulse" />
                    {/* Direction arrow */}
                    <div className="absolute -top-2 -right-2">
                      {currentStepData.demoDirection === 'right' ? (
                        <ArrowRight className="w-4 h-4 text-green-500 animate-bounce" />
                      ) : (
                        <ArrowLeft className="w-4 h-4 text-red-500 animate-bounce" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Interactive hint */}
              {currentStepData?.interactive && showSwipeHint && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                  <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm animate-pulse">
                    Tap or swipe the card!
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tutorial instruction card */}
          <Card className="bg-white dark:bg-gray-800 shadow-xl">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <h2 className="text-xl font-bold text-foreground">
                  {currentStepData.title}
                </h2>
                <p className="text-muted-foreground">
                  {currentStepData.description}
                </p>

                {/* Action buttons for non-demo steps */}
                {!currentStepData?.showDemo && !currentStepData?.interactive && (
                  <div className="flex justify-center space-x-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={onSkip}
                      size="sm"
                    >
                      Skip Tutorial
                    </Button>
                    <Button
                      onClick={handleNext}
                      size="sm"
                    >
                      Continue
                    </Button>
                  </div>
                )}

                {/* Demo step controls */}
                {currentStepData?.showDemo && (
                  <div className="flex justify-center space-x-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={onSkip}
                      size="sm"
                    >
                      Skip
                    </Button>
                    <Button
                      onClick={handleNext}
                      size="sm"
                    >
                      Got it!
                    </Button>
                  </div>
                )}

                {/* Show action buttons below cards for context */}
                {(currentStepData?.showDemo || currentStepData?.interactive) && (
                  <div className="flex justify-center space-x-6 pt-2">
                    <div className="flex flex-col items-center space-y-1">
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-12 h-12 rounded-full border-2 border-red-400 text-red-400 hover:bg-red-400 hover:text-white"
                        disabled
                      >
                        <X className="w-6 h-6" />
                      </Button>
                      <span className="text-xs text-muted-foreground">Skip</span>
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-12 h-12 rounded-full border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-white"
                        disabled
                      >
                        <Heart className="w-6 h-6" />
                      </Button>
                      <span className="text-xs text-muted-foreground">Love</span>
                    </div>
                  </div>
                )}

                {/* Progress indicator */}
                <div className="flex justify-center space-x-1 pt-2">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index <= currentStep ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}