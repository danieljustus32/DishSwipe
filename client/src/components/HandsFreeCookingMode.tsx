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

export default function HandsFreeCookingMode({ recipe, isOpen, onClose }: HandsFreeCookingModeProps) {
  const [phase, setPhase] = useState<CookingPhase>('preparation');
  const [currentStep, setCurrentStep] = useState(0);
  const [completedIngredients, setCompletedIngredients] = useState<Set<number>>(new Set());
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
          const result = event.results[event.results.length - 1];
          if (result.isFinal) {
            const command = result[0].transcript.toLowerCase().trim();
            setTranscript(command);
            console.log('Voice command received:', command);
            handleVoiceCommand(command);
          }
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          toast({
            title: "Voice Recognition Error",
            description: "There was an issue with voice recognition. Try again.",
            variant: "destructive"
          });
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      speak("Welcome to hands-free cooking mode! I'll guide you through preparing " + recipe.title + ". Say 'help' to hear available commands.");
    }
  }, [isOpen, recipe.title]);

  const speak = (text: string) => {
    if (synthRef.current && !isPaused) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      synthRef.current.speak(utterance);
    }
  };

  const handleVoiceCommand = (command: string) => {
    const matchedCommand = voiceCommands.find(cmd => 
      cmd.phrases.some(phrase => command.includes(phrase))
    );

    if (!matchedCommand) {
      console.log('No matching voice command found for:', command);
      return;
    }

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
      recognitionRef.current.stop();
      setIsListening(false);
      setIsPaused(true);
      speak("Voice recognition paused. Click the microphone to resume.");
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      setIsPaused(false);
      speak("Voice recognition resumed.");
    }
  };

  const handleNext = () => {
    if (phase === 'preparation') {
      const nextStep = currentStep + 1;
      if (nextStep < recipe.ingredients.length) {
        setCurrentStep(nextStep);
        const ingredient = recipe.ingredients[nextStep];
        speak(`Next ingredient: Measure ${ingredient.amount} ${ingredient.unit} of ${ingredient.name}.`);
      } else {
        speak("All ingredients measured! Say 'start cooking' to begin the cooking instructions.");
      }
    } else {
      const nextStep = currentStep + 1;
      if (nextStep < recipe.instructions.length) {
        setCurrentStep(nextStep);
        speak(`Step ${nextStep + 1}: ${recipe.instructions[nextStep]}`);
      } else {
        speak("Congratulations! You've completed the recipe. Enjoy your meal!");
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      
      if (phase === 'preparation') {
        const ingredient = recipe.ingredients[prevStep];
        speak(`Previous ingredient: Measure ${ingredient.amount} ${ingredient.unit} of ${ingredient.name}.`);
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
      speak(`Current ingredient: Measure ${ingredient.amount} ${ingredient.unit} of ${ingredient.name}.`);
    } else {
      speak(`Current step: ${recipe.instructions[currentStep]}`);
    }
  };

  const handleCompleteIngredient = () => {
    if (phase === 'preparation') {
      const ingredientId = recipe.ingredients[currentStep].id;
      setCompletedIngredients(prev => new Set([...prev, ingredientId]));
      speak("Ingredient marked as measured! Say 'next' for the next ingredient.");
    }
  };

  const handleStartCooking = () => {
    setPhase('cooking');
    setCurrentStep(0);
    speak(`Starting cooking phase! Step 1: ${recipe.instructions[0]}`);
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
      setIsListening(true);
      setIsPaused(false);
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
      <DialogContent className="w-[calc(100vw-10px)] max-w-4xl h-[calc(100vh-10px)] max-h-[95vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="w-5 h-5" />
            Hands-Free Cooking: {recipe.title}
          </DialogTitle>
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
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 mr-4">
                  <Volume2 className="w-5 h-5 text-primary" />
                  <span className="font-medium">Voice Control</span>
                  {isListening && (
                    <Badge variant="secondary" className="animate-pulse">
                      Listening...
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={isListening ? "destructive" : "default"}
                    size="sm"
                    onClick={isListening ? toggleListening : startListening}
                    className="px-3"
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span className="ml-1">{isListening ? "Stop" : "Start"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCommands(!showCommands)}
                    className="px-3"
                  >
                    Help
                  </Button>
                </div>
              </div>

              {transcript && (
                <div className="text-sm text-muted-foreground mb-2">
                  Last command: "{transcript}"
                </div>
              )}

              {showCommands && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {voiceCommands.map((cmd, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:justify-between p-2 bg-muted rounded gap-1">
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
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Ingredient {currentStep + 1} of {recipe.ingredients.length}
                    </h3>
                    <div className="flex items-center gap-2 text-lg">
                      <Scale className="w-5 h-5 text-orange-500" />
                      <span className="font-medium">
                        {getCurrentIngredient()?.amount} {getCurrentIngredient()?.unit}
                      </span>
                      <span>of</span>
                      <span className="font-semibold text-primary">
                        {getCurrentIngredient()?.name}
                      </span>
                    </div>
                  </div>
                  {completedIngredients.has(getCurrentIngredient()?.id) && (
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    className="text-xs sm:text-sm"
                  >
                    <SkipBack className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleCompleteIngredient}
                    disabled={completedIngredients.has(getCurrentIngredient()?.id)}
                    className="text-xs sm:text-sm"
                  >
                    <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Mark Complete</span>
                    <span className="sm:hidden">Done</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={currentStep >= recipe.ingredients.length - 1}
                    className="text-xs sm:text-sm"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <span className="sm:hidden">Next</span>
                    <SkipForward className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
                  </Button>
                  {completedIngredients.size === recipe.ingredients.length && (
                    <Button
                      variant="default"
                      className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
                      onClick={handleStartCooking}
                    >
                      <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Start Cooking!
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Step {currentStep + 1} of {recipe.instructions.length}
                    </h3>
                    <p className="text-lg leading-relaxed">
                      {recipe.instructions[currentStep]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>~{Math.ceil(recipe.readyInMinutes / recipe.instructions.length)} min</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    className="text-xs sm:text-sm"
                  >
                    <SkipBack className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleNext}
                    disabled={currentStep >= recipe.instructions.length - 1}
                    className="text-xs sm:text-sm"
                  >
                    <span className="hidden sm:inline">Next Step</span>
                    <span className="sm:hidden">Next</span>
                    <SkipForward className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
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
                <div className="grid grid-cols-1 gap-2">
                  {recipe.ingredients.map((ingredient, index) => (
                    <div
                      key={ingredient.id}
                      className={`flex items-center justify-between p-2 rounded text-xs sm:text-sm ${
                        index === currentStep
                          ? 'bg-primary/10 border border-primary/20'
                          : completedIngredients.has(ingredient.id)
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-muted'
                      }`}
                    >
                      <span className="flex-1 pr-2">
                        {ingredient.amount} {ingredient.unit} {ingredient.name}
                      </span>
                      {completedIngredients.has(ingredient.id) && (
                        <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
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