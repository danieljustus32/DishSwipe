import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement: string;
}

export interface Tutorial {
  id: string;
  steps: TutorialStep[];
}

export type TutorialType = 'welcome' | 'swipe' | 'cookbook' | 'shopping';

const tutorials: Record<TutorialType, Tutorial> = {
  welcome: {
    id: 'welcome',
    steps: [
      {
        id: 'welcome-step-1',
        title: 'Welcome to Feastly!',
        description: 'Discover amazing recipes with fun, interactive swiping. Let\'s start with a quick tutorial!',
        targetElement: '[data-tutorial="recipe-stack"]'
      }
    ]
  },
  swipe: {
    id: 'swipe',
    steps: [
      {
        id: 'swipe-step-1',
        title: 'Interactive Swipe Tutorial',
        description: 'Learn how to swipe through recipes with our guided tutorial.',
        targetElement: '[data-tutorial="recipe-stack"]'
      }
    ]
  },
  cookbook: {
    id: 'cookbook',
    steps: [
      {
        id: 'cookbook-step-1',
        title: 'Your Recipe Cookbook',
        description: 'Welcome to your cookbook! Here are your saved recipes. Click on any recipe to view the full details, ingredients, and cooking instructions.',
        targetElement: '[data-tutorial="cookbook-content"]'
      },
      {
        id: 'cookbook-step-2',
        title: 'Recipe Management',
        description: 'You can view detailed recipes, add ingredients to your shopping list, or remove recipes you no longer want.',
        targetElement: '[data-tutorial="cookbook-content"]'
      }
    ]
  },
  shopping: {
    id: 'shopping', 
    steps: [
      {
        id: 'shopping-step-1',
        title: 'Shopping List Feature',
        description: 'Welcome to your shopping list! Here you can see ingredients from your saved recipes organized by store aisle.',
        targetElement: '[data-tutorial="shopping-content"]'
      },
      {
        id: 'shopping-step-2',
        title: 'Organize Your Shopping',
        description: 'Your shopping list organizes ingredients by store aisle to make grocery shopping easier. Check off items as you shop!',
        targetElement: '[data-tutorial="shopping-content"]'
      }
    ]
  }
};

interface User {
  id: string;
  [key: string]: any;
}

export function useOnboarding() {
  const { user } = useAuth() as { user: User | null; isLoading: boolean };
  const [currentTutorial, setCurrentTutorial] = useState<TutorialType | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [completedTutorials, setCompletedTutorials] = useState<Set<TutorialType>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load completed tutorials from localStorage on component mount
  useEffect(() => {
    if (!user) {
      setIsLoaded(false);
      setIsTutorialActive(false);
      setCurrentTutorial(null);
      setCurrentStep(0);
      return;
    }
    
    try {
      const saved = localStorage.getItem('flavorswipe-completed-tutorials');
      const savedUserId = localStorage.getItem('flavorswipe-tutorial-user-id');
      
      // If this is a different user, clear tutorial completion data
      if (savedUserId && savedUserId !== user.id) {
        console.log('Different user detected, clearing tutorial data');
        localStorage.removeItem('flavorswipe-completed-tutorials');
        localStorage.setItem('flavorswipe-tutorial-user-id', user.id);
        setCompletedTutorials(new Set());
      } else if (saved) {
        const tutorialArray = JSON.parse(saved) as TutorialType[];
        const completedSet = new Set<TutorialType>(tutorialArray);
        setCompletedTutorials(completedSet);
        localStorage.setItem('flavorswipe-tutorial-user-id', user.id);
        
        // If all tutorials are completed, make sure tutorial is inactive
        if (completedSet.has('welcome') && completedSet.has('swipe') && completedSet.has('cookbook') && completedSet.has('shopping')) {
          setIsTutorialActive(false);
          setCurrentTutorial(null);
          setCurrentStep(0);
        }
      } else {
        // First time for this user
        localStorage.setItem('flavorswipe-tutorial-user-id', user.id);
      }
      
      setIsLoaded(true);
    } catch (error) {
      console.error('Failed to load completed tutorials from localStorage:', error);
      setIsLoaded(true);
    }
  }, [user]);

  // Save completed tutorials to localStorage whenever they change
  useEffect(() => {
    try {
      const tutorialArray = Array.from(completedTutorials);
      localStorage.setItem('flavorswipe-completed-tutorials', JSON.stringify(tutorialArray));
    } catch (error) {
      console.error('Failed to save completed tutorials to localStorage:', error);
    }
  }, [completedTutorials]);

  // Show tutorial based on environment variable setting
  useEffect(() => {
    if (!user || !isLoaded) return;
    
    const showTutorialForTesting = import.meta.env.VITE_TUTORIAL_TESTING === 'true';
    console.log('Tutorial Testing Mode:', showTutorialForTesting);
    console.log('Completed Tutorials:', Array.from(completedTutorials));
    console.log('Is Tutorial Active:', isTutorialActive);
    
    if (showTutorialForTesting) {
      // For testing: Always show tutorial on app run
      if (!isTutorialActive) {
        console.log('Starting tutorial in testing mode');
        setCurrentTutorial('welcome');
        setCurrentStep(0);
        setIsTutorialActive(true);
        // Reset completed tutorials for testing
        setCompletedTutorials(new Set());
        localStorage.removeItem('flavorswipe-completed-tutorials');
      }
    } else {
      // Production: Only show to first-time users
      if (!completedTutorials.has('welcome') && !isTutorialActive) {
        console.log('Starting tutorial for first-time user');
        setCurrentTutorial('welcome');
        setCurrentStep(0);
        setIsTutorialActive(true);
      } else if (completedTutorials.has('welcome') && completedTutorials.has('swipe') && completedTutorials.has('cookbook') && completedTutorials.has('shopping') && isTutorialActive) {
        // If ALL tutorials are completed but tutorial is still active, deactivate it
        console.log('All tutorials completed, deactivating tutorial');
        setIsTutorialActive(false);
        setCurrentTutorial(null);
        setCurrentStep(0);
      } else {
        console.log('Tutorial already completed or active');
      }
    }
  }, [user, completedTutorials, isTutorialActive, isLoaded]);

  const startTutorial = async (tutorialType: TutorialType) => {
    // Don't start tutorial if already completed (unless in testing mode)
    const showTutorialForTesting = import.meta.env.VITE_TUTORIAL_TESTING === 'true';
    if (!showTutorialForTesting && completedTutorials.has(tutorialType)) return;

    // Load mock data for cookbook and shopping tutorials
    if (tutorialType === 'cookbook') {
      try {
        await fetch('/api/tutorial/load-cookbook-data', {
          method: 'POST',
          credentials: 'include'
        });
      } catch (error) {
        console.error('Failed to load cookbook tutorial data:', error);
      }
    } else if (tutorialType === 'shopping') {
      try {
        await fetch('/api/tutorial/load-shopping-data', {
          method: 'POST', 
          credentials: 'include'
        });
      } catch (error) {
        console.error('Failed to load shopping tutorial data:', error);
      }
    }

    setCurrentTutorial(tutorialType);
    setCurrentStep(0);
    setIsTutorialActive(true);
  };

  const nextStep = async () => {
    if (!currentTutorial) return;
    
    const tutorial = tutorials[currentTutorial];
    if (currentStep < tutorial.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Mark current tutorial as completed
      setCompletedTutorials(prev => new Set([...Array.from(prev), currentTutorial]));
      
      // Check if we should start the next tutorial in sequence
      if (currentTutorial === 'welcome' && !completedTutorials.has('swipe')) {
        // Start swipe tutorial after welcome
        setCurrentTutorial('swipe');
        setCurrentStep(0);
        // Don't end tutorial, continue to swipe tutorial
      } else {
        // End current tutorial
        await endTutorial();
      }
    }
  };

  const endTutorial = async () => {
    if (!currentTutorial) return;

    // Mark tutorial as completed
    setCompletedTutorials(prev => new Set([...Array.from(prev), currentTutorial]));

    // Clean up tutorial data
    try {
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

  const startSwipeTutorial = () => {
    setCurrentTutorial('swipe');
    setCurrentStep(0);
    setIsTutorialActive(true);
  };

  const skipTutorial = async () => {
    await endTutorial();
  };

  // Computed value to ensure tutorial is never shown if all are completed
  const shouldShowTutorial = isLoaded && isTutorialActive && currentTutorial && 
    !(completedTutorials.has('welcome') && completedTutorials.has('swipe') && completedTutorials.has('cookbook') && completedTutorials.has('shopping'));

  return {
    currentTutorial: currentTutorial ? tutorials[currentTutorial] : null,
    currentTutorialType: currentTutorial,
    currentStep,
    isTutorialActive: shouldShowTutorial,
    startTutorial,
    startSwipeTutorial,
    nextStep,
    skipTutorial,
    completedTutorials
  };
}