import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, ArrowRight, SkipForward } from "lucide-react";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector for the element to highlight
  position: "top" | "bottom" | "left" | "right";
  showArrow?: boolean;
}

interface OnboardingTutorialProps {
  tutorialType: "discover" | "cookbook" | "shopping";
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const tutorialSteps = {
  discover: [
    {
      id: "welcome",
      title: "Welcome to FlavorSwipe!",
      description: "Discover amazing recipes by swiping right to save or left to skip. Let's explore the app together!",
      target: ".recipe-card-stack",
      position: "bottom" as const,
      showArrow: true,
    },
    {
      id: "swipe-actions",
      title: "Swipe to Discover",
      description: "Swipe right ❤️ to save recipes to your cookbook, or swipe left ✖️ to skip. You can also use the buttons below.",
      target: ".swipe-buttons",
      position: "top" as const,
      showArrow: true,
    },
    {
      id: "recipe-info",
      title: "Recipe Details",
      description: "Tap the info button to see full recipe details, ingredients, and nutrition information.",
      target: ".info-button",
      position: "left" as const,
      showArrow: true,
    },
    {
      id: "navigation",
      title: "Explore More",
      description: "Use the tabs below to access your saved recipes in Cookbook and create shopping lists.",
      target: ".bottom-navigation",
      position: "top" as const,
      showArrow: true,
    },
  ],
  cookbook: [
    {
      id: "cookbook-intro",
      title: "Your Personal Cookbook",
      description: "All your saved recipes appear here. You can view details, add ingredients to your shopping list, or remove recipes.",
      target: ".cookbook-container",
      position: "bottom" as const,
      showArrow: true,
    },
    {
      id: "recipe-actions",
      title: "Recipe Actions",
      description: "Click the eye icon to view recipe details, the plus icon to add ingredients to your shopping list, or the trash icon to remove recipes.",
      target: ".recipe-actions",
      position: "left" as const,
      showArrow: true,
    },
  ],
  shopping: [
    {
      id: "shopping-intro",
      title: "Smart Shopping Lists",
      description: "Your shopping list organizes ingredients by grocery store aisle. Check off items as you shop!",
      target: ".shopping-container",
      position: "bottom" as const,
      showArrow: true,
    },
    {
      id: "aisle-organization",
      title: "Organized by Aisle",
      description: "Ingredients are automatically grouped by grocery store sections like Produce, Dairy, and Meat for efficient shopping.",
      target: ".aisle-section",
      position: "right" as const,
      showArrow: true,
    },
    {
      id: "check-items",
      title: "Check Off Items",
      description: "Tap the checkbox next to items as you add them to your cart. Use the clear button to remove all items when done.",
      target: ".shopping-item",
      position: "left" as const,
      showArrow: true,
    },
  ],
};

export default function OnboardingTutorial({ tutorialType, isVisible, onComplete, onSkip }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(null);
  
  const steps = tutorialSteps[tutorialType];

  useEffect(() => {
    if (!isVisible) return;

    const updateHighlight = () => {
      const step = steps[currentStep];
      if (step) {
        const element = document.querySelector(step.target);
        setHighlightedElement(element);
      }
    };

    // Small delay to ensure elements are rendered
    const timer = setTimeout(updateHighlight, 100);
    return () => clearTimeout(timer);
  }, [currentStep, isVisible, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  if (!isVisible) return null;

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  // Calculate modal position based on highlighted element
  const getModalPosition = () => {
    if (!highlightedElement) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

    const rect = highlightedElement.getBoundingClientRect();
    const modalWidth = 320;
    const modalHeight = 200;

    let top = rect.top + window.scrollY;
    let left = rect.left + window.scrollX;

    switch (currentStepData.position) {
      case "top":
        top = rect.top + window.scrollY - modalHeight - 20;
        left = rect.left + window.scrollX + (rect.width / 2) - (modalWidth / 2);
        break;
      case "bottom":
        top = rect.bottom + window.scrollY + 20;
        left = rect.left + window.scrollX + (rect.width / 2) - (modalWidth / 2);
        break;
      case "left":
        top = rect.top + window.scrollY + (rect.height / 2) - (modalHeight / 2);
        left = rect.left + window.scrollX - modalWidth - 20;
        break;
      case "right":
        top = rect.top + window.scrollY + (rect.height / 2) - (modalHeight / 2);
        left = rect.right + window.scrollX + 20;
        break;
    }

    // Ensure modal stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (left < 10) left = 10;
    if (left + modalWidth > viewportWidth - 10) left = viewportWidth - modalWidth - 10;
    if (top < 10) top = 10;
    if (top + modalHeight > viewportHeight - 10) top = viewportHeight - modalHeight - 10;

    return { top: `${top}px`, left: `${left}px` };
  };

  // Create spotlight effect
  const getSpotlightPath = () => {
    if (!highlightedElement) return "";

    const rect = highlightedElement.getBoundingClientRect();
    const padding = 8;
    
    // Create a path that covers the entire screen but excludes the highlighted element
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    return `M0,0 L${viewportWidth},0 L${viewportWidth},${viewportHeight} L0,${viewportHeight} Z M${rect.left - padding},${rect.top - padding} L${rect.right + padding},${rect.top - padding} L${rect.right + padding},${rect.bottom + padding} L${rect.left - padding},${rect.bottom + padding} Z`;
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Dark overlay with spotlight */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="spotlight">
            <rect width="100%" height="100%" fill="white" />
            <path d={getSpotlightPath()} fill="black" fillRule="evenodd" />
          </mask>
        </defs>
        <rect 
          width="100%" 
          height="100%" 
          fill="rgba(0, 0, 0, 0.5)" 
          mask="url(#spotlight)"
        />
      </svg>

      {/* Tutorial modal */}
      <Card 
        className="absolute w-80 shadow-xl border-2 bg-background"
        style={getModalPosition()}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{currentStepData.title}</CardTitle>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-sm">
            Step {currentStep + 1} of {steps.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground">{currentStepData.description}</p>
          
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handleSkip} className="flex items-center gap-2">
              <SkipForward className="h-4 w-4" />
              Skip Tutorial
            </Button>
            
            <Button onClick={handleNext} className="flex items-center gap-2">
              {isLastStep ? "Get Started" : "Next"}
              {!isLastStep && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}