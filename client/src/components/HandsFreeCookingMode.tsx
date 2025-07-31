import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Timer, 
  ChefHat,
  X,
  Volume2
} from 'lucide-react';
import { useVoiceCommands, VoiceCommand } from '@/hooks/useVoiceCommands';

interface Recipe {
  id: string;
  title: string;
  instructions: string[];
  readyInMinutes: number;
  ingredients: Array<{
    id: number;
    name: string;
    amount: number;
    unit: string;
  }>;
}

interface HandsFreeCookingModeProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe | null;
}

export default function HandsFreeCookingMode({ isOpen, onClose, recipe }: HandsFreeCookingModeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [autoProgress, setAutoProgress] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const totalSteps = recipe?.instructions.length || 0;
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  // Voice commands for hands-free cooking
  const voiceCommands: VoiceCommand[] = [
    {
      command: "next step",
      action: () => goToNextStep(),
      description: "Move to the next cooking step",
      variations: ["next", "continue", "forward", "go forward"]
    },
    {
      command: "previous step",
      action: () => goToPreviousStep(),
      description: "Go back to the previous step",
      variations: ["previous", "back", "go back", "last step"]
    },
    {
      command: "repeat step",
      action: () => speakCurrentStep(),
      description: "Repeat the current step aloud",
      variations: ["repeat", "say again", "read step"]
    },
    {
      command: "start timer",
      action: () => startTimer(5), // Default 5 minutes
      description: "Start a 5-minute timer",
      variations: ["timer", "set timer"]
    },
    {
      command: "stop timer",
      action: () => stopTimer(),
      description: "Stop the current timer",
      variations: ["cancel timer", "timer stop"]
    },
    {
      command: "pause",
      action: () => setIsPlaying(false),
      description: "Pause the cooking session",
      variations: ["stop", "hold"]
    },
    {
      command: "resume",
      action: () => setIsPlaying(true),
      description: "Resume the cooking session",
      variations: ["play", "continue", "start"]
    },
    {
      command: "show ingredients",
      action: () => speakIngredients(),
      description: "Read the recipe ingredients aloud",
      variations: ["ingredients", "what do I need"]
    },
    {
      command: "how much time",
      action: () => speakTimeRemaining(),
      description: "Tell you the remaining cooking time",
      variations: ["time left", "remaining time", "how long"]
    },
    {
      command: "exit cooking mode",
      action: () => onClose(),
      description: "Exit hands-free cooking mode",
      variations: ["exit", "close", "finish cooking", "done"]
    }
  ];

  const {
    isListening,
    isSupported,
    startListening,
    stopListening,
    lastCommand,
    confidence
  } = useVoiceCommands(voiceCommands);

  // Text-to-speech functions
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      // Stop any current speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const speakCurrentStep = () => {
    if (recipe && recipe.instructions[currentStep]) {
      const stepText = `Step ${currentStep + 1}: ${recipe.instructions[currentStep]}`;
      speak(stepText);
    }
  };

  const speakIngredients = () => {
    if (recipe && recipe.ingredients) {
      const ingredientsList = recipe.ingredients
        .map(ing => `${ing.amount} ${ing.unit} of ${ing.name}`)
        .join(', ');
      speak(`You need: ${ingredientsList}`);
    }
  };

  const speakTimeRemaining = () => {
    if (isTimerActive) {
      const minutes = Math.floor(timer / 60);
      const seconds = timer % 60;
      speak(`Timer has ${minutes} minutes and ${seconds} seconds remaining`);
    } else {
      speak("No timer is currently running");
    }
  };

  // Navigation functions
  const goToNextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
      if (isPlaying) {
        setTimeout(() => speakCurrentStep(), 500);
      }
    } else {
      speak("You have completed all cooking steps!");
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      if (isPlaying) {
        setTimeout(() => speakCurrentStep(), 500);
      }
    }
  };

  // Timer functions
  const startTimer = (minutes: number) => {
    setTimer(minutes * 60);
    setIsTimerActive(true);
    speak(`Timer set for ${minutes} minutes`);
  };

  const stopTimer = () => {
    setIsTimerActive(false);
    setTimer(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    speak("Timer stopped");
  };

  // Timer effect
  useEffect(() => {
    if (isTimerActive && timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setIsTimerActive(false);
            speak("Timer finished!");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerActive, timer]);

  // Auto-speak current step when playing
  useEffect(() => {
    if (isPlaying && isOpen && recipe) {
      setTimeout(() => speakCurrentStep(), 1000);
    }
  }, [isPlaying, isOpen, currentStep]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  if (!recipe) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <ChefHat className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold">Hands-Free Cooking Mode</h2>
              <p className="text-sm text-muted-foreground">{recipe.title}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress and Controls */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Step {currentStep + 1} of {totalSteps}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Voice Control Status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                {isListening ? (
                  <Mic className="w-4 h-4 text-green-500" />
                ) : (
                  <MicOff className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm">
                  Voice Control: {isListening ? "Active" : "Inactive"}
                </span>
              </div>
              {lastCommand && (
                <Badge variant="outline" className="text-xs">
                  "{lastCommand}" ({Math.round(confidence * 100)}%)
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={isListening ? stopListening : startListening}
              disabled={!isSupported}
            >
              {isListening ? "Stop" : "Start"} Voice
            </Button>
          </div>

          {/* Timer */}
          {isTimerActive && (
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  <span className="font-mono text-lg">{formatTime(timer)}</span>
                </div>
                <Button variant="outline" size="sm" onClick={stopTimer}>
                  Stop Timer
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Current Step */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Step {currentStep + 1}</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => speak(recipe.instructions[currentStep])}
                  >
                    <Volume2 className="w-4 h-4 mr-2" />
                    Read Aloud
                  </Button>
                </div>
                <p className="text-base leading-relaxed">
                  {recipe.instructions[currentStep]}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              onClick={goToPreviousStep}
              disabled={currentStep === 0}
            >
              <SkipBack className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <Button
              onClick={() => setIsPlaying(!isPlaying)}
              variant={isPlaying ? "destructive" : "default"}
              size="lg"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 mr-2" />
              ) : (
                <Play className="w-5 h-5 mr-2" />
              )}
              {isPlaying ? "Pause" : "Start"} Cooking
            </Button>

            <Button
              variant="outline"
              onClick={goToNextStep}
              disabled={currentStep === totalSteps - 1}
            >
              Next
              <SkipForward className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => startTimer(5)}
              disabled={isTimerActive}
            >
              <Timer className="w-4 h-4 mr-2" />
              5 Min Timer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={speakIngredients}
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Read Ingredients
            </Button>
          </div>

          {/* Voice Commands Help */}
          {isSupported && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Voice Commands (click to expand)
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>"Next step" - Move forward</div>
                <div>"Previous step" - Go back</div>
                <div>"Repeat step" - Read current step</div>
                <div>"Start timer" - 5-minute timer</div>
                <div>"Show ingredients" - Read ingredients</div>
                <div>"How much time" - Timer status</div>
                <div>"Pause" - Pause session</div>
                <div>"Exit" - Close cooking mode</div>
              </div>
            </details>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}