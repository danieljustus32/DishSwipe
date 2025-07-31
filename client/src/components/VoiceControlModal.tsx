import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Volume2, HelpCircle } from "lucide-react";

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

interface VoiceControlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VoiceControlModal({ isOpen, onClose }: VoiceControlModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Voice Commands Guide
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">How to use voice commands:</p>
              <p className="text-blue-700">
                Click the microphone button to start listening, then speak any of the commands below clearly.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Available Commands</h3>
            <div className="grid gap-3">
              {voiceCommands.map((cmd, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Mic className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="flex gap-2 flex-wrap">
                        {cmd.phrases.map((phrase, phraseIndex) => (
                          <Badge key={phraseIndex} variant="secondary" className="text-xs">
                            "{phrase}"
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground text-right">
                    {cmd.description}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Voice recognition requires a modern browser and microphone access. 
              Make sure to allow microphone permissions when prompted.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}