import { useState, useCallback, useRef, useEffect } from 'react';
import { ProcessedWord, calculateBaseDelay, getWordDelay } from '@/lib/textProcessor';

export interface ChunkData {
  words: ProcessedWord[];
  displayText: string;
  isChunked: boolean;
}

interface UseAeroEngineProps {
  words: ProcessedWord[];
  wpm: number;
  chunkSize?: 1 | 2 | 3;
  onComplete?: () => void;
  onChapterComplete?: () => void; 
  initialIndex?: number;
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

const RECOIL_WORDS = 5; 

export function useAeroEngine({ 
  words, 
  wpm,
  chunkSize = 1,
  onComplete,
  onChapterComplete,
  initialIndex = 0
}: UseAeroEngineProps): UseAeroEngineReturn {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // --- REFS: THE SOURCE OF TRUTH ---
  const indexRef = useRef(initialIndex);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);

  // CRITICAL SPEED FIX: Keep WPM in a ref so the loop sees changes INSTANTLY
  const wpmRef = useRef(wpm);
  useEffect(() => {
    wpmRef.current = wpm;
  }, [wpm]);

  // Sync indexRef with state when chapter/book changes
  useEffect(() => {
    indexRef.current = initialIndex;
    setCurrentIndex(initialIndex);
  }, [words, initialIndex]);
  
  const progress = words.length > 0 ? (currentIndex / words.length) * 100 : 0;
  const currentWord = words[currentIndex] || null;

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

  // --- THE ENGINE CORE ---
  const animate = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    
    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    accumulatedTimeRef.current += deltaTime;
    
    // CALCULATE SPEED PER FRAME
    // 60,000 / WPM = Base delay
    const baseDelay = 60000 / wpmRef.current;
    const activeWord = words[indexRef.current];
    
    let wordDelay = baseDelay * chunkSize;

    if (activeWord) {
      if (chunkSize === 1) {
        // Apply the punctuation modifiers (2.2x for periods, 1.5x for commas)
        wordDelay = baseDelay * (activeWord.delayModifier || 1);
      } else {
        const currentChunkWords = words.slice(indexRef.current, indexRef.current + chunkSize);
        const avgModifier = currentChunkWords.reduce((sum, w) => sum + w.delayModifier, 0) / (currentChunkWords.length || 1);
        wordDelay = (baseDelay * chunkSize) * avgModifier;
      }
    }

    if (accumulatedTimeRef.current >= wordDelay) {
      accumulatedTimeRef.current = 0;
      
      if (indexRef.current + chunkSize >= words.length) {
        setIsPlaying(false);
        indexRef.current = words.length - 1;
        setCurrentIndex(words.length - 1);
        if (onChapterComplete) onChapterComplete();
        else onComplete?.();
        return;
      }

      indexRef.current += chunkSize;
      setCurrentIndex(indexRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [words, chunkSize, onComplete, onChapterComplete]);

  // Orchestration - Added wpm dependency to re-ignite if speed changes
  useEffect(() => {
    if (isPlaying && words.length > 0) {
      lastTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      lastTimeRef.current = 0;
    }
    
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, animate, words.length, wpm]);

  // --- CONTROLS ---
  const play = useCallback(() => {
    if (indexRef.current >= words.length - 1) {
      indexRef.current = 0;
      setCurrentIndex(0);
    }
    setIsPlaying(true);
  }, [words.length]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    const newIdx = Math.max(0, indexRef.current - RECOIL_WORDS);
    indexRef.current = newIdx;
    setCurrentIndex(newIdx);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);

  const rewind = useCallback((count: number = 10) => {
    const newIdx = Math.max(0, indexRef.current - count);
    indexRef.current = newIdx;
    setCurrentIndex(newIdx);
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    indexRef.current = 0;
    setCurrentIndex(0);
    accumulatedTimeRef.current = 0;
  }, []);

  const setIndex = useCallback((index: number) => {
    const safeIdx = Math.max(0, Math.min(words.length - 1, index));
    indexRef.current = safeIdx;
    setCurrentIndex(safeIdx);
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