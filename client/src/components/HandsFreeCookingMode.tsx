import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  CheckCircle2,
  Clock,
  Scale,
  ChefHat,
  Volume2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatQuantity } from "@/lib/utils";

interface Recipe {
  id: string;
  title: string;
  ingredients: Array<{
    id: number;
    name: string;
    amount: number;
    unit: string;
    aisle: string;
  }>;
  instructions: string[];
  readyInMinutes: number;
  servings: number;
}

interface HandsFreeCookingModeProps {
  recipe: Recipe;
  isOpen: boolean;
  onClose: () => void;
}

type CookingPhase = 'preparation' | 'cooking';
type PreparationStep = 'ingredient-measure' | 'ingredient-complete';

interface VoiceCommand {
  phrases: string[];
  action: string;
  description: string;
}

const voiceCommands: VoiceCommand[] = [
  { phrases: ['next', 'next step', 'continue'], action: 'next', description: 'Move to next step' },
  { phrases: ['back', 'previous', 'go back'], action: 'previous', description: 'Go to previous step' },
  { phrases: ['repeat', 'say again', 'repeat step'], action: 'repeat', description: 'Repeat current step' },
  { phrases: ['done', 'complete', 'finished'], action: 'complete', description: 'Mark ingredient as measured' },
  { phrases: ['start cooking', 'begin cooking', 'cook'], action: 'start-cooking', description: 'Start cooking phase' },
  { phrases: ['pause', 'stop'], action: 'pause', description: 'Pause voice recognition' },
  { phrases: ['help', 'commands'], action: 'help', description: 'Show voice commands' }
];

// Helper function to format ingredient descriptions with proper grammar
const formatIngredientDescription = (amount: number, unit: string, name: string): string => {
  const formattedAmount = formatQuantity(`${amount} ${unit}`);
  
  // Common measurement units that should use "of"
  const measurementUnits = [
    // Volume
    'teaspoon', 'teaspoons', 'tsp', 'tablespoon', 'tablespoons', 'tbsp', 'cup', 'cups', 'pint', 'pints', 'quart', 'quarts', 'gallon', 'gallons',
    'liter', 'liters', 'litre', 'litres', 'ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres', 'fl oz', 'fluid ounce', 'fluid ounces',
    // Weight
    'gram', 'grams', 'g', 'kilogram', 'kilograms', 'kg', 'ounce', 'ounces', 'oz', 'pound', 'pounds', 'lb', 'lbs',
    // Descriptive units
    'piece', 'pieces', 'slice', 'slices', 'strip', 'strips', 'chunk', 'chunks', 'clove', 'cloves', 'bunch', 'bunches',
    'head', 'heads', 'stalk', 'stalks', 'sprig', 'sprigs', 'dash', 'dashes', 'pinch', 'pinches', 'handful', 'handfuls'
  ];
  
  const shouldUseOf = measurementUnits.some(measurementUnit => unit.toLowerCase().includes(measurementUnit));
  
  if (shouldUseOf) {
    return `${formattedAmount} of ${name}`;
  } else {
    return `${formattedAmount} ${name}`;
  }
};

export default function HandsFreeCookingMode({ recipe, isOpen, onClose }: HandsFreeCookingModeProps) {
  const [phase, setPhase] = useState<CookingPhase>('preparation');
  const [currentStep, setCurrentStep] = useState(0);
  const [completedIngredients, setCompletedIngredients] = useState<Set<number>>(new Set());
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [manuallyStopped, setManuallyStopped] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const manuallyStoppedRef = useRef(false);
  const speechQueueRef = useRef<string[]>([]);
  const isProcessingQueueRef = useRef(false);
  const currentStepRef = useRef(0);
  const phaseRef = useRef<CookingPhase>('preparation');
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Create a single audio element for TTS playback
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
    }
  }, []);

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const result = event.results[event.results.length - 1];
          if (result.isFinal) {
            const command = result[0].transcript.toLowerCase().trim();
            // Only process non-empty commands and ignore if currently speaking
            if (command.length > 0 && !isSpeaking) {
              console.log('Voice command received:', command);
              
              // Filter out phrases that sound like TTS feedback
              const ttsFilterPhrases = [
                'welcome to hands-free cooking',
                'starting cooking phase',
                'step 1',
                'step 2', 
                'step 3',
                'step 4',
                'step 5',
                'next ingredient',
                'measure',
                'heat vegetable',
                'voice recognition'
              ];
              
              const isTTSFeedback = ttsFilterPhrases.some(phrase => 
                command.includes(phrase) && command.length > phrase.length + 10
              );
              
              if (!isTTSFeedback) {
                handleVoiceCommand(command);
                console.log('Command processed, maintaining listening state');
              } else {
                console.log('Filtered out TTS feedback:', command.substring(0, 50) + '...');
              }
            } else if (isSpeaking) {
              console.log('Ignoring command while speaking:', command.substring(0, 30) + '...');
            }
          }
        };

        recognitionRef.current.onend = () => {
          // Automatically restart recognition if it's supposed to be listening
          console.log('Voice recognition ended. Current state - isListening:', isListening, 'isPaused:', isPaused);
          
          // Check if we should restart based on current listening state
          setTimeout(() => {
            // Get current component state by checking the ref and state variables
            const shouldContinueListening = isOpen && !isPaused && !manuallyStoppedRef.current && recognitionRef.current;
            console.log('Checking restart conditions - isOpen:', isOpen, 'isPaused:', isPaused, 'manuallyStopped:', manuallyStoppedRef.current, 'hasRecognition:', !!recognitionRef.current, 'shouldRestart:', shouldContinueListening);
            
            if (shouldContinueListening) {
              console.log('Restarting voice recognition...');
              try {
                recognitionRef.current.start();
                // Keep isListening as true since we're continuing
                setIsListening(true);
                console.log('Voice recognition restarted successfully');
              } catch (error) {
                console.error('Error restarting speech recognition:', error);
                // If it fails to restart, try again after a longer delay
                setTimeout(() => {
                  if (recognitionRef.current && isOpen && !isPaused && !manuallyStoppedRef.current) {
                    try {
                      recognitionRef.current.start();
                      setIsListening(true);
                      console.log('Voice recognition retry successful');
                    } catch (retryError) {
                      console.error('Retry failed:', retryError);
                    }
                  }
                }, 1000);
              }
            } else {
              console.log('Not restarting - conditions not met');
              setIsListening(false);
            }
          }, 100);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          
          // Only show toast for serious errors, not when it's just restarting
          if (event.error !== 'aborted' && event.error !== 'no-speech' && event.error !== 'network') {
            toast({
              title: "Voice Recognition Error",
              description: "There was an issue with voice recognition. Try again.",
              variant: "destructive"
            });
          }
          
          // Don't auto-restart on error - let the onend handler manage restarts
          // This prevents restart loops from errors
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      speak("Welcome to hands-free cooking mode! I'll guide you through preparing " + recipe.title + ". Say 'help' to hear available commands.");
      
      // Start listening automatically when modal opens
      setTimeout(() => {
        if (recognitionRef.current && !isListening) {
          try {
            recognitionRef.current.start();
            setIsListening(true);
            setIsPaused(false);
            setManuallyStopped(false);
            manuallyStoppedRef.current = false;
            console.log('Auto-started voice recognition on modal open');
          } catch (error) {
            console.error('Error auto-starting speech recognition:', error);
          }
        }
      }, 1000); // Give time for speech synthesis to finish
    } else {
      // Clean up when modal is closed
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setIsPaused(false);
      setManuallyStopped(false);
      setIsSpeaking(false);
      manuallyStoppedRef.current = false;
      setCurrentStep(0);
      setCompletedIngredients(new Set());
      setPhase('preparation');
      
      // Clear speech queue
      speechQueueRef.current = [];
      isProcessingQueueRef.current = false;
      
      // Stop any playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [isOpen, recipe.title]);

  // Sync currentStep and phase state with refs
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const speak = async (text: string) => {
    if (!text || isPaused) return;
    
    // Add to queue instead of interrupting current speech
    speechQueueRef.current.push(text);
    
    // Process queue if not already processing
    if (!isProcessingQueueRef.current) {
      processQueuedSpeech();
    }
  };

  const processQueuedSpeech = async () => {
    if (isProcessingQueueRef.current || speechQueueRef.current.length === 0) return;
    
    isProcessingQueueRef.current = true;
    setIsSpeaking(true);
    
    try {
      // Temporarily pause voice recognition during TTS to prevent feedback
      const wasListening = isListening;
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      }

      while (speechQueueRef.current.length > 0) {
        const text = speechQueueRef.current.shift()!;
        
        console.log('Generating natural voice for:', text.substring(0, 50) + '...');
        
        try {
          // Call our TTS API endpoint
          const response = await fetch('/api/voice/tts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
          });

          if (!response.ok) {
            throw new Error(`TTS API error: ${response.status}`);
          }

          // Get the audio data as a blob
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);

          // Play the audio and wait for it to finish
          await new Promise<void>((resolve, reject) => {
            if (audioRef.current) {
              audioRef.current.src = audioUrl;
              audioRef.current.onended = () => {
                URL.revokeObjectURL(audioUrl);
                resolve();
              };
              audioRef.current.onerror = () => {
                URL.revokeObjectURL(audioUrl);
                reject(new Error('Audio playback failed'));
              };
              audioRef.current.play().catch(reject);
            } else {
              reject(new Error('Audio element not available'));
            }
          });
        } catch (error) {
          console.error('TTS error:', error);
          
          // Fallback to browser speech synthesis on error
          await new Promise<void>((resolve) => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
              const utterance = new SpeechSynthesisUtterance(text);
              utterance.rate = 0.85;
              utterance.pitch = 0.95;
              utterance.volume = 0.9;
              utterance.onend = () => resolve();
              utterance.onerror = () => resolve(); // Resolve even on error to continue
              window.speechSynthesis.speak(utterance);
            } else {
              resolve();
            }
          });
        }
      }
      
      // Restart voice recognition after all speech is finished
      if (wasListening && recognitionRef.current && isOpen && !isPaused && !manuallyStoppedRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current.start();
            setIsListening(true);
            console.log('Voice recognition restarted after TTS queue completed');
          } catch (error) {
            console.error('Error restarting recognition after TTS:', error);
          }
        }, 1500); // Longer delay to ensure audio has fully stopped and prevent feedback
      }
    } finally {
      isProcessingQueueRef.current = false;
      setIsSpeaking(false);
    }
  };

  const handleVoiceCommand = (command: string) => {
    // More strict matching - look for exact phrases or phrases at word boundaries
    const matchedCommand = voiceCommands.find(cmd => 
      cmd.phrases.some(phrase => {
        // Look for the phrase as a standalone word or at the beginning/end of the command
        const regex = new RegExp(`\\b${phrase}\\b|^${phrase}|${phrase}$`, 'i');
        return regex.test(command) && command.length <= phrase.length + 5; // Allow some buffer but prevent long TTS matches
      })
    );

    if (!matchedCommand) {
      console.log('No matching voice command found for:', command);
      // Only update transcript for valid commands
      return;
    }

    // Update transcript only for recognized commands
    setTranscript(`Command: ${matchedCommand.description}`);

    switch (matchedCommand.action) {
      case 'next':
        handleNext();
        break;
      case 'previous':
        handlePrevious();
        break;
      case 'repeat':
        handleRepeat();
        break;
      case 'complete':
        handleCompleteIngredient();
        break;
      case 'start-cooking':
        handleStartCooking();
        break;
      case 'pause':
        toggleListening();
        break;
      case 'help':
        setShowCommands(true);
        break;
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      console.log('Manually stopping voice recognition');
      manuallyStoppedRef.current = true;
      recognitionRef.current.stop();
      setIsListening(false);
      setIsPaused(true);
      setManuallyStopped(true);
      speak("Voice recognition stopped. Click the microphone to restart.");
    } else {
      console.log('Manually starting voice recognition');
      manuallyStoppedRef.current = false;
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setIsPaused(false);
        setManuallyStopped(false);
        speak("Voice recognition started.");
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        toast({
          title: "Voice Recognition Error",
          description: "Could not start voice recognition. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleNext = () => {
    const currentStepValue = currentStepRef.current;
    const currentPhase = phaseRef.current;
    console.log('handleNext called - phase:', currentPhase, 'currentStep:', currentStepValue);
    
    if (currentPhase === 'preparation') {
      // Mark current ingredient as complete before moving to next
      const currentIngredientId = recipe.ingredients[currentStepValue].id;
      setCompletedIngredients(prev => new Set(Array.from(prev).concat([currentIngredientId])));
      
      const nextStep = currentStepValue + 1;
      
      if (nextStep < recipe.ingredients.length) {
        setCurrentStep(nextStep);
        currentStepRef.current = nextStep;
        
        const ingredient = recipe.ingredients[nextStep];
        const formattedAmount = formatQuantity(`${ingredient.amount} ${ingredient.unit}`);
        const ingredientDescription = formatIngredientDescription(ingredient.amount, ingredient.unit, ingredient.name);
        speak(`Next ingredient: Measure ${ingredientDescription}.`);
      } else {
        speak("All ingredients measured! Say 'start cooking' to begin the cooking instructions.");
      }
    } else {
      const nextStep = currentStepValue + 1;
      
      if (nextStep < recipe.instructions.length) {
        setCurrentStep(nextStep);
        currentStepRef.current = nextStep;
        
        speak(`Step ${nextStep + 1}: ${recipe.instructions[nextStep]}`);
      } else {
        speak("Congratulations! You've completed the recipe. Enjoy your meal!");
      }
    }
  };

  const handlePrevious = () => {
    const currentStepValue = currentStepRef.current;
    const currentPhase = phaseRef.current;
    console.log('handlePrevious called - phase:', currentPhase, 'currentStep:', currentStepValue);
    
    if (currentStepValue > 0) {
      const prevStep = currentStepValue - 1;
      setCurrentStep(prevStep);
      currentStepRef.current = prevStep;
      
      if (currentPhase === 'preparation') {
        const ingredient = recipe.ingredients[prevStep];
        const formattedAmount = formatQuantity(`${ingredient.amount} ${ingredient.unit}`);
        const ingredientDescription = formatIngredientDescription(ingredient.amount, ingredient.unit, ingredient.name);
        speak(`Previous ingredient: Measure ${ingredientDescription}.`);
      } else {
        speak(`Step ${prevStep + 1}: ${recipe.instructions[prevStep]}`);
      }
    } else {
      speak("This is the first step.");
    }
  };

  const handleRepeat = () => {
    if (phase === 'preparation') {
      const ingredient = recipe.ingredients[currentStep];
      const formattedAmount = formatQuantity(`${ingredient.amount} ${ingredient.unit}`);
      const ingredientDescription = formatIngredientDescription(ingredient.amount, ingredient.unit, ingredient.name);
      speak(`Current ingredient: Measure ${ingredientDescription}.`);
    } else {
      speak(`Current step: ${recipe.instructions[currentStep]}`);
    }
  };

  const handleCompleteIngredient = () => {
    if (phase === 'preparation') {
      const ingredientId = recipe.ingredients[currentStep].id;
      setCompletedIngredients(prev => new Set(Array.from(prev).concat([ingredientId])));
      speak("Ingredient marked as measured! Say 'next' for the next ingredient.");
    }
  };

  const handleStartCooking = () => {
    console.log('Starting cooking phase - transitioning from preparation');
    setPhase('cooking');
    phaseRef.current = 'cooking';
    setCurrentStep(0);
    currentStepRef.current = 0;
    speak(`Starting cooking phase! Step 1: ${recipe.instructions[0]}`);
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setIsPaused(false);
        console.log('Voice recognition started manually');
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        toast({
          title: "Voice Recognition Error",
          description: "Could not start voice recognition. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const getCurrentIngredient = () => {
    return recipe.ingredients[currentStep];
  };

  const getPreparationProgress = () => {
    return (completedIngredients.size / recipe.ingredients.length) * 100;
  };

  const getCookingProgress = () => {
    return ((currentStep + 1) / recipe.instructions.length) * 100;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl h-[100dvh] sm:h-[95vh] sm:max-h-[95vh] overflow-y-auto p-3 sm:p-6 mx-2 sm:mx-auto">
        <DialogHeader>
          {/* On very narrow screens, place icon at top left and title below */}
          <div className="flex items-start justify-between sm:hidden mb-2">
            <ChefHat className="w-5 h-5 mt-1" />
            {/* Close button space is handled by DialogContent automatically */}
          </div>
          <DialogTitle className="hidden sm:flex items-center gap-2">
            <ChefHat className="w-5 h-5" />
            Hands-Free Cooking: {recipe.title}
          </DialogTitle>
          {/* Mobile title without DialogTitle wrapper to avoid duplicate ARIA labels */}
          <div className="block sm:hidden text-left text-lg font-semibold leading-none tracking-tight">
            Hands-Free Cooking: {recipe.title}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Phase Indicator */}
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            <Badge variant={phase === 'preparation' ? 'default' : 'secondary'} className="px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm">
              <Scale className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Preparation
            </Badge>
            <Badge variant={phase === 'cooking' ? 'default' : 'secondary'} className="px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm">
              <ChefHat className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Cooking
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>
                {phase === 'preparation' 
                  ? `${completedIngredients.size} of ${recipe.ingredients.length} ingredients`
                  : `${currentStep + 1} of ${recipe.instructions.length} steps`
                }
              </span>
            </div>
            <Progress 
              value={phase === 'preparation' ? getPreparationProgress() : getCookingProgress()} 
              className="h-3"
            />
          </div>

          {/* Voice Controls */}
          <Card className="border-2 border-dashed border-primary/20">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                  <span className="font-medium text-sm sm:text-base">Voice Control</span>
                  <div className="flex gap-2 flex-wrap">
                    {isListening && (
                      <Badge variant="secondary" className="animate-pulse text-xs">
                        Listening...
                      </Badge>
                    )}
                    {isSpeaking && (
                      <Badge variant="outline" className="animate-pulse text-xs">
                        Speaking...
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant={isListening ? "destructive" : "default"}
                    size="sm"
                    onClick={isListening ? toggleListening : startListening}
                    className="px-2 sm:px-3 text-xs sm:text-sm"
                  >
                    {isListening ? <MicOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Mic className="w-3 h-3 sm:w-4 sm:h-4" />}
                    <span className="ml-1">{isListening ? "Stop" : "Start"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCommands(!showCommands)}
                    className="px-2 sm:px-3 text-xs sm:text-sm"
                  >
                    Help
                  </Button>
                </div>
              </div>

              {transcript && (
                <div className="text-xs sm:text-sm text-muted-foreground mb-2 truncate">
                  Last command: "{transcript}"
                </div>
              )}

              {showCommands && (
                <div className="grid grid-cols-1 gap-2 text-xs">
                  {voiceCommands.map((cmd, index) => (
                    <div key={index} className="flex flex-col p-2 bg-muted rounded gap-1">
                      <span className="font-medium">"{cmd.phrases[0]}"</span>
                      <span className="text-muted-foreground text-xs">{cmd.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Step Display */}
          {phase === 'preparation' ? (
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-semibold mb-2">
                      Ingredient {currentStep + 1} of {recipe.ingredients.length}
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg">
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" />
                        <span className="font-medium break-words">
                          {getCurrentIngredient() && formatIngredientDescription(
                            getCurrentIngredient().amount,
                            getCurrentIngredient().unit,
                            getCurrentIngredient().name
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  {completedIngredients.has(getCurrentIngredient()?.id) && (
                    <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0" />
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    className="text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <SkipBack className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleCompleteIngredient}
                    disabled={completedIngredients.has(getCurrentIngredient()?.id)}
                    className="text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">Mark Complete</span>
                    <span className="sm:hidden">Done</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={currentStep >= recipe.ingredients.length - 1}
                    className="text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <span className="sm:hidden">Next</span>
                    <SkipForward className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                  </Button>
                  {completedIngredients.size === recipe.ingredients.length && (
                    <Button
                      variant="default"
                      className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm px-2 sm:px-3"
                      onClick={handleStartCooking}
                    >
                      <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span className="hidden sm:inline">Start Cooking!</span>
                      <span className="sm:hidden">Cook</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-semibold mb-2">
                      Step {currentStep + 1} of {recipe.instructions.length}
                    </h3>
                    <p className="text-base sm:text-lg leading-relaxed break-words">
                      {recipe.instructions[currentStep]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-shrink-0">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>~{Math.ceil(recipe.readyInMinutes / recipe.instructions.length)} min</span>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    className="text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <SkipBack className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleNext}
                    disabled={currentStep >= recipe.instructions.length - 1}
                    className="text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <span className="hidden sm:inline">Next Step</span>
                    <span className="sm:hidden">Next</span>
                    <SkipForward className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ingredients Overview (during preparation) */}
          {phase === 'preparation' && (
            <Card>
              <CardContent className="p-3 sm:p-4">
                <h4 className="font-medium mb-3 text-sm sm:text-base">All Ingredients</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {recipe.ingredients.map((ingredient, index) => (
                    <div
                      key={ingredient.id}
                      className={`flex items-start justify-between p-2 rounded text-xs sm:text-sm ${
                        index === currentStep
                          ? 'bg-primary/10 border border-primary/20'
                          : completedIngredients.has(ingredient.id)
                          ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex-1 pr-2 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                          <span className="font-medium text-xs sm:text-sm break-words">
                            {formatIngredientDescription(ingredient.amount, ingredient.unit, ingredient.name)}
                          </span>
                        </div>
                      </div>
                      {completedIngredients.has(ingredient.id) && (
                        <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}