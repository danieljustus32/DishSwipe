import { useState, useEffect } from "react";

export type TutorialType = "discover" | "cookbook" | "shopping";

interface OnboardingState {
  hasSeenDiscoverTutorial: boolean;
  hasSeenCookbookTutorial: boolean;
  hasSeenShoppingTutorial: boolean;
}

const ONBOARDING_STORAGE_KEY = "flavorswipe-onboarding";

export function useOnboarding() {
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    hasSeenDiscoverTutorial: false,
    hasSeenCookbookTutorial: false,
    hasSeenShoppingTutorial: false,
  });

  // Load onboarding state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setOnboardingState(parsed);
      } catch (error) {
        console.error("Failed to parse onboarding state:", error);
      }
    }
  }, []);

  // Save onboarding state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(onboardingState));
  }, [onboardingState]);

  const shouldShowTutorial = (type: TutorialType): boolean => {
    switch (type) {
      case "discover":
        return !onboardingState.hasSeenDiscoverTutorial;
      case "cookbook":
        return !onboardingState.hasSeenCookbookTutorial;
      case "shopping":
        return !onboardingState.hasSeenShoppingTutorial;
      default:
        return false;
    }
  };

  const markTutorialComplete = (type: TutorialType) => {
    setOnboardingState(prev => ({
      ...prev,
      [`hasSeen${type.charAt(0).toUpperCase() + type.slice(1)}Tutorial`]: true,
    }));
  };

  const resetOnboarding = () => {
    setOnboardingState({
      hasSeenDiscoverTutorial: false,
      hasSeenCookbookTutorial: false,
      hasSeenShoppingTutorial: false,
    });
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  };

  return {
    shouldShowTutorial,
    markTutorialComplete,
    resetOnboarding,
    onboardingState,
  };
}