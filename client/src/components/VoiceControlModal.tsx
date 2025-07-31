import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { VoiceCommand } from '@/hooks/useVoiceCommands';

interface VoiceControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  isListening: boolean;
  isSupported: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  lastCommand: string | null;
  confidence: number;
  commands: VoiceCommand[];
  error: string | null;
}

export default function VoiceControlModal({
  isOpen,
  onClose,
  isListening,
  isSupported,
  onStartListening,
  onStopListening,
  lastCommand,
  confidence,
  commands,
  error
}: VoiceControlModalProps) {
  const [isMuted, setIsMuted] = useState(false);

  if (!isSupported) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MicOff className="w-5 h-5" />
              Voice Control Not Supported
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              Your browser doesn't support voice recognition. Please try using a modern browser like Chrome, Edge, or Safari.
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Voice Control
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Voice Control Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Listening Status:</span>
                <Badge variant={isListening ? "default" : "secondary"}>
                  {isListening ? "Listening" : "Stopped"}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={isListening ? onStopListening : onStartListening}
                  variant={isListening ? "destructive" : "default"}
                  className="flex-1"
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-4 h-4 mr-2" />
                      Stop Listening
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-2" />
                      Start Listening
                    </>
                  )}
                </Button>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                  Error: {error}
                </div>
              )}

              {lastCommand && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Command:</span>
                    <Badge variant="outline">
                      {Math.round(confidence * 100)}% confidence
                    </Badge>
                  </div>
                  <div className="p-2 bg-muted rounded text-sm">
                    "{lastCommand}"
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Commands */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Available Commands</CardTitle>
              <CardDescription>
                Say any of these commands while listening is active
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {commands.map((command, index) => (
                  <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">"{command.command}"</div>
                      <div className="text-xs text-muted-foreground">
                        {command.description}
                      </div>
                      {command.variations && command.variations.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Also: {command.variations.map(v => `"${v}"`).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Tips for Better Recognition</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="space-y-1 list-disc list-inside">
                <li>Speak clearly and at a normal pace</li>
                <li>Reduce background noise when possible</li>
                <li>Use natural language - don't over-enunciate</li>
                <li>Wait for the command to be processed before speaking again</li>
                <li>If a command doesn't work, try the alternative phrases</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}