import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, ArrowRight } from "lucide-react";
import { Tutorial } from "@/hooks/useOnboarding";

interface OnboardingTutorialProps {
  tutorial: Tutorial;
  step: number;
  onSkip: () => void;
  onNext: () => void;
}

export default function OnboardingTutorial({ tutorial, step, onSkip, onNext }: OnboardingTutorialProps) {
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(null);

  const currentStep = tutorial.steps[step];

  useEffect(() => {
    if (currentStep?.targetElement) {
      const element = document.querySelector(currentStep.targetElement);
      if (element) {
        setHighlightedElement(element);
        element.classList.add('tutorial-highlight');
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return () => {
      // Clean up highlight class
      if (highlightedElement) {
        highlightedElement.classList.remove('tutorial-highlight');
      }
      // Remove highlight from any other elements
      document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
      });
    };
  }, [currentStep, highlightedElement]);

  if (!currentStep) return null;

  return (
    <>
      {/* Dark overlay */}
      <div className="tutorial-overlay" />
      
      {/* Tutorial card */}
      <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4 pointer-events-none">
        <Card className="w-full max-w-md pointer-events-auto bg-white dark:bg-gray-800 shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                {currentStep.title}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSkip();
                }}
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground mb-6">
              {currentStep.description}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex space-x-1">
                {tutorial.steps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 w-2 rounded-full ${
                      index === step 
                        ? 'bg-primary' 
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                ))}
              </div>
              
              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNext();
                }} 
                size="sm" 
                className="ml-4"
              >
                {step === tutorial.steps.length - 1 ? 'Finish' : 'Next'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}