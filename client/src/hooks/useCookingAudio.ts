import { useState, useEffect, useRef, useCallback } from 'react';

export interface CookingAudioSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
}

export interface CookingAudioControls {
  settings: CookingAudioSettings;
  updateSettings: (newSettings: Partial<CookingAudioSettings>) => void;
  playSound: (soundType: SoundType) => void;
  startBackgroundMusic: () => void;
  stopBackgroundMusic: () => void;
  isPlayingMusic: boolean;
}

export type SoundType = 
  | 'step-complete' 
  | 'ingredient-complete' 
  | 'timer-alert' 
  | 'phase-change' 
  | 'error' 
  | 'success'
  | 'voice-start'
  | 'voice-stop';

// Create audio context with simple oscillator-based sounds
const createBeepSound = (frequency: number, duration: number, type: OscillatorType = 'sine'): Promise<void> => {
  return new Promise((resolve) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
    
    oscillator.onended = () => {
      audioContext.close();
      resolve();
    };
  });
};

// Create notification sounds for different actions
const soundEffects: Record<SoundType, () => Promise<void>> = {
  'step-complete': () => createBeepSound(800, 0.2),
  'ingredient-complete': async () => {
    await createBeepSound(600, 0.15);
    await new Promise(resolve => setTimeout(resolve, 50));
    await createBeepSound(800, 0.15);
  },
  'timer-alert': async () => {
    for (let i = 0; i < 3; i++) {
      await createBeepSound(1000, 0.3);
      if (i < 2) await new Promise(resolve => setTimeout(resolve, 100));
    }
  },
  'phase-change': async () => {
    await createBeepSound(500, 0.2);
    await new Promise(resolve => setTimeout(resolve, 100));
    await createBeepSound(700, 0.2);
    await new Promise(resolve => setTimeout(resolve, 100));
    await createBeepSound(900, 0.3);
  },
  'error': () => createBeepSound(300, 0.5, 'square'),
  'success': async () => {
    await createBeepSound(600, 0.2);
    await new Promise(resolve => setTimeout(resolve, 50));
    await createBeepSound(800, 0.2);
    await new Promise(resolve => setTimeout(resolve, 50));
    await createBeepSound(1000, 0.3);
  },
  'voice-start': () => createBeepSound(800, 0.1),
  'voice-stop': () => createBeepSound(600, 0.1),
};

// Create ambient background music using oscillators
const createBackgroundMusic = (volume: number): { start: () => void; stop: () => void } => {
  let audioContext: AudioContext;
  let gainNode: GainNode;
  let oscillators: OscillatorNode[] = [];
  let isPlaying = false;

  const start = () => {
    if (isPlaying) return;
    
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = volume * 0.1; // Keep ambient music quiet

    // Create a gentle, layered ambient sound
    const frequencies = [220, 330, 440, 550]; // Gentle harmonious frequencies
    
    frequencies.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const oscGain = audioContext.createGain();
      
      oscillator.connect(oscGain);
      oscGain.connect(gainNode);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      // Add subtle variation to each oscillator
      oscGain.gain.setValueAtTime(0.1 + index * 0.05, audioContext.currentTime);
      
      // Add gentle LFO for subtle movement
      const lfo = audioContext.createOscillator();
      const lfoGain = audioContext.createGain();
      lfo.connect(lfoGain);
      lfoGain.connect(oscGain.gain);
      lfo.frequency.value = 0.1 + index * 0.05; // Very slow modulation
      lfoGain.gain.value = 0.02;
      
      oscillator.start();
      lfo.start();
      
      oscillators.push(oscillator);
      oscillators.push(lfo);
    });
    
    isPlaying = true;
  };

  const stop = () => {
    if (!isPlaying) return;
    
    oscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // Ignore errors from already stopped oscillators
      }
    });
    
    if (audioContext) {
      audioContext.close();
    }
    
    oscillators = [];
    isPlaying = false;
  };

  return { start, stop };
};

export function useCookingAudio(): CookingAudioControls {
  const [settings, setSettings] = useState<CookingAudioSettings>({
    soundEnabled: true,
    musicEnabled: true,
    soundVolume: 0.7,
    musicVolume: 0.3,
  });

  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const backgroundMusicRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('cookingAudioSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.warn('Failed to load audio settings:', e);
      }
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('cookingAudioSettings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((newSettings: Partial<CookingAudioSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const playSound = useCallback(async (soundType: SoundType) => {
    if (!settings.soundEnabled || settings.soundVolume === 0) return;

    try {
      await soundEffects[soundType]();
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }, [settings.soundEnabled, settings.soundVolume]);

  const startBackgroundMusic = useCallback(() => {
    if (!settings.musicEnabled || settings.musicVolume === 0) return;

    try {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.stop();
      }
      
      backgroundMusicRef.current = createBackgroundMusic(settings.musicVolume);
      backgroundMusicRef.current.start();
      setIsPlayingMusic(true);
    } catch (error) {
      console.warn('Failed to start background music:', error);
    }
  }, [settings.musicEnabled, settings.musicVolume]);

  const stopBackgroundMusic = useCallback(() => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.stop();
      backgroundMusicRef.current = null;
    }
    setIsPlayingMusic(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.stop();
      }
    };
  }, []);

  return {
    settings,
    updateSettings,
    playSound,
    startBackgroundMusic,
    stopBackgroundMusic,
    isPlayingMusic,
  };
}