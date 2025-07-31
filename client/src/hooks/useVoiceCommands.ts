import { useCallback, useEffect, useState } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';

export interface VoiceCommand {
  command: string;
  action: () => void;
  description: string;
  variations?: string[];
}

interface VoiceCommandsHook {
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  lastCommand: string | null;
  confidence: number;
  error: string | null;
}

export const useVoiceCommands = (commands: VoiceCommand[]): VoiceCommandsHook => {
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);

  const processCommand = useCallback((transcript: string, isFinal: boolean) => {
    if (!isFinal) return;

    const normalizedTranscript = transcript.toLowerCase().trim();
    console.log('Voice command received:', normalizedTranscript);

    // Find matching command
    for (const commandObj of commands) {
      const commandVariations = [
        commandObj.command.toLowerCase(),
        ...(commandObj.variations || []).map(v => v.toLowerCase())
      ];

      for (const variation of commandVariations) {
        if (normalizedTranscript.includes(variation)) {
          setLastCommand(normalizedTranscript);
          setConfidence(0.9); // High confidence for exact matches
          commandObj.action();
          return;
        }
      }
    }

    // Fuzzy matching for similar commands
    let bestMatch: VoiceCommand | null = null;
    let bestScore = 0;

    for (const commandObj of commands) {
      const commandVariations = [
        commandObj.command.toLowerCase(),
        ...(commandObj.variations || []).map(v => v.toLowerCase())
      ];

      for (const variation of commandVariations) {
        const score = calculateSimilarity(normalizedTranscript, variation);
        if (score > bestScore && score > 0.6) { // 60% similarity threshold
          bestMatch = commandObj;
          bestScore = score;
        }
      }
    }

    if (bestMatch && bestScore > 0.6) {
      setLastCommand(normalizedTranscript);
      setConfidence(bestScore);
      bestMatch.action();
    } else {
      console.log('No matching voice command found for:', normalizedTranscript);
    }
  }, [commands]);

  const {
    isListening,
    isSupported,
    startListening,
    stopListening,
    error
  } = useSpeechRecognition({
    continuous: true,
    interimResults: false,
    onResult: processCommand,
    onError: (error) => {
      console.error('Speech recognition error:', error);
    }
  });

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    lastCommand,
    confidence,
    error
  };
};

// Helper function to calculate string similarity
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}