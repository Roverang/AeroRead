import { useState, useCallback, useRef, useEffect } from 'react';
import { ProcessedWord, calculateBaseDelay, getWordDelay } from '@/lib/textProcessor';

interface UseAeroEngineProps {
  words: ProcessedWord[];
  wpm: number;
  chunkSize?: 1 | 2 | 3;
  onComplete?: () => void;
}

export interface ChunkData {
  words: ProcessedWord[];
  displayText: string;
  isChunked: boolean;
}

interface UseAeroEngineReturn {
  currentIndex: number;
  isPlaying: boolean;
  progress: number;
  currentWord: ProcessedWord | null;
  currentChunk: ChunkData | null;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  rewind: (count?: number) => void;
  reset: () => void;
  setIndex: (index: number) => void;
}

const RECOIL_WORDS = 5; // Words to rewind on pause

export function useAeroEngine({ 
  words, 
  wpm,
  chunkSize = 1,
  onComplete 
}: UseAeroEngineProps): UseAeroEngineReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);
  
  const progress = words.length > 0 ? (currentIndex / words.length) * 100 : 0;
  const currentWord = words[currentIndex] || null;
  
  // Calculate chunk data for current position
  const currentChunk: ChunkData | null = (() => {
    if (words.length === 0) return null;
    
    const chunkWords: ProcessedWord[] = [];
    for (let i = 0; i < chunkSize && currentIndex + i < words.length; i++) {
      chunkWords.push(words[currentIndex + i]);
    }
    
    return {
      words: chunkWords,
      displayText: chunkWords.map(w => w.word).join(' '),
      isChunked: chunkSize > 1,
    };
  })();
  
  // CRITICAL: Chunk-aware delay calculation
  // Formula: BaseDelay = (60,000 / WPM) * ChunkSize
  const calculateChunkDelay = useCallback(() => {
    const baseDelay = calculateBaseDelay(wpm);
    
    // For chunked mode, multiply base delay by chunk size
    // This ensures same WPM regardless of chunk size
    const chunkBaseDelay = baseDelay * chunkSize;
    
    if (chunkSize === 1 && currentWord) {
      // Single word mode: apply cognitive load modifiers
      return getWordDelay(baseDelay, currentWord.delayModifier);
    }
    
    // Chunked mode: use average delay modifier of all words in chunk
    if (currentChunk && currentChunk.words.length > 0) {
      const avgModifier = currentChunk.words.reduce((sum, w) => sum + w.delayModifier, 0) / currentChunk.words.length;
      return chunkBaseDelay * avgModifier;
    }
    
    return chunkBaseDelay;
  }, [wpm, chunkSize, currentWord, currentChunk]);
  
  // Animation loop using requestAnimationFrame for precise timing
  const animate = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }
    
    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    accumulatedTimeRef.current += deltaTime;
    
    if (currentIndex >= words.length) {
      setIsPlaying(false);
      onComplete?.();
      return;
    }
    
    const wordDelay = calculateChunkDelay();
    
    if (accumulatedTimeRef.current >= wordDelay) {
      accumulatedTimeRef.current = 0;
      
      setCurrentIndex(prev => {
        // Move by chunk size
        const next = prev + chunkSize;
        if (next >= words.length) {
          setIsPlaying(false);
          onComplete?.();
          return words.length - 1;
        }
        return next;
      });
    }
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [words, currentIndex, calculateChunkDelay, chunkSize, onComplete]);
  
  // Start/stop animation based on isPlaying state
  useEffect(() => {
    if (isPlaying && words.length > 0) {
      lastTimeRef.current = 0;
      accumulatedTimeRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, animate, words.length]);
  
  const play = useCallback(() => {
    if (currentIndex >= words.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(true);
  }, [currentIndex, words.length]);
  
  const pause = useCallback(() => {
    setIsPlaying(false);
    // The Recoil: Move back 5 words on pause
    setCurrentIndex(prev => Math.max(0, prev - RECOIL_WORDS));
  }, []);
  
  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);
  
  const rewind = useCallback((count: number = 10) => {
    setCurrentIndex(prev => Math.max(0, prev - count));
  }, []);
  
  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
    lastTimeRef.current = 0;
    accumulatedTimeRef.current = 0;
  }, []);
  
  const setIndex = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(words.length - 1, index)));
  }, [words.length]);
  
  return {
    currentIndex,
    isPlaying,
    progress,
    currentWord,
    currentChunk,
    play,
    pause,
    toggle,
    rewind,
    reset,
    setIndex,
  };
}
