import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";

export type TutorialType = "welcome" | "cookbook" | "shopping";

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string;
  action?: () => Promise<void>;
}

export interface Tutorial {
  type: TutorialType;
  steps: TutorialStep[];
}

const TUTORIALS: Record<TutorialType, Tutorial> = {
  welcome: {
    type: "welcome",
    steps: [
      {
        id: "welcome-1",
        title: "Welcome to FlavorSwipe!",
        description: "Discover amazing recipes by swiping right to like and left to pass. Let's take a quick tour!"
      },
      {
        id: "welcome-2", 
        title: "Explore Your Cookbook",
        description: "Click on the Cookbook tab to see your saved recipes. We'll add some sample recipes for you to explore!",
        targetElement: "[data-tutorial='cookbook-tab']",
        action: async () => {
          await fetch('/api/tutorial/load-cookbook-data', { 
            method: 'POST',
            credentials: 'include'
          });
        }
      }
    ]
  },
  cookbook: {
    type: "cookbook",
    steps: [
      {
        id: "cookbook-1",
        title: "Your Recipe Collection",
        description: "Here are your saved recipes! You can view details, add ingredients to shopping list, or remove recipes you no longer want."
      },
      {
        id: "cookbook-2",
        title: "Try the Shopping List",
        description: "Click on Shopping to see how you can organize ingredients by grocery store aisle!",
        targetElement: "[data-tutorial='shopping-tab']",
        action: async () => {
          await fetch('/api/tutorial/load-shopping-data', { 
            method: 'POST',
            credentials: 'include'
          });
        }
      }
    ]
  },
  shopping: {
    type: "shopping",
    steps: [
      {
        id: "shopping-1",
        title: "Smart Shopping Lists",
        description: "Your ingredients are automatically organized by grocery store aisle to make shopping efficient!"
      },
      {
        id: "shopping-2",
        title: "You're All Set!",
        description: "That's it! Start discovering recipes that match your taste. Happy cooking!",
        action: async () => {
          await fetch('/api/tutorial/cleanup', { 
            method: 'DELETE',
            credentials: 'include'
          });
        }
      }
    ]
  }
};

export function useOnboarding() {
  const { user } = useAuth();
  const [currentTutorial, setCurrentTutorial] = useState<TutorialType | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isTutorialActive, setIsTutorialActive] = useState(false);

  // For testing: Always show tutorial on app run
  useEffect(() => {
    if (user && !isTutorialActive) {
      // Reset tutorial state for testing
      setCurrentTutorial('welcome');
      setCurrentStep(0);
      setIsTutorialActive(true);
    }
  }, [user, isTutorialActive]);

  const nextStep = async () => {
    if (!currentTutorial) return;

    const tutorial = TUTORIALS[currentTutorial];
    const currentStepData = tutorial.steps[currentStep];

    // Execute action if present
    if (currentStepData.action) {
      try {
        await currentStepData.action();
      } catch (error) {
        console.error('Tutorial action failed:', error);
      }
    }

    // Move to next step or next tutorial
    if (currentStep < tutorial.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Move to next tutorial or end
      if (currentTutorial === 'welcome') {
        setCurrentTutorial('cookbook');
        setCurrentStep(0);
      } else if (currentTutorial === 'cookbook') {
        setCurrentTutorial('shopping');
        setCurrentStep(0);
      } else {
        // End tutorial
        setIsTutorialActive(false);
        setCurrentTutorial(null);
        setCurrentStep(0);
      }
    }
  };

  const skipTutorial = async () => {
    try {
      // Clean up any tutorial data
      await fetch('/api/tutorial/cleanup', { 
        method: 'DELETE',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Failed to cleanup tutorial data:', error);
    }
    
    setIsTutorialActive(false);
    setCurrentTutorial(null);
    setCurrentStep(0);
  };

  return {
    currentTutorial,
    currentStep,
    isTutorialActive,
    nextStep,
    skipTutorial,
    tutorial: currentTutorial ? TUTORIALS[currentTutorial] : null
  };
}