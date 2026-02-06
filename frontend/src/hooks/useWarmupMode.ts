import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWarmupModeProps {
  baseWpm: number;
  isPlaying: boolean;
  onWpmChange: (wpm: number) => void;
}

const WARMUP_DURATION = 5000; // 5 seconds
const WARMUP_START_PERCENT = 0.5; // Start at 50% of target WPM

export function useWarmupMode({ baseWpm, isPlaying, onWpmChange }: UseWarmupModeProps) {
  const [isWarmupActive, setIsWarmupActive] = useState(false);
  const [warmupProgress, setWarmupProgress] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const targetWpmRef = useRef(baseWpm);

  const startWarmup = useCallback(() => {
    targetWpmRef.current = baseWpm;
    startTimeRef.current = Date.now();
    setIsWarmupActive(true);
    setWarmupProgress(0);
  }, [baseWpm]);

  const stopWarmup = useCallback(() => {
    setIsWarmupActive(false);
    setWarmupProgress(0);
    startTimeRef.current = null;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    // Restore target WPM
    onWpmChange(targetWpmRef.current);
  }, [onWpmChange]);

  const toggleWarmup = useCallback(() => {
    if (isWarmupActive) {
      stopWarmup();
    } else {
      startWarmup();
    }
  }, [isWarmupActive, startWarmup, stopWarmup]);

  // Warmup animation loop
  useEffect(() => {
    if (!isWarmupActive || !isPlaying) return;

    const animate = () => {
      if (!startTimeRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / WARMUP_DURATION, 1);
      setWarmupProgress(progress);

      // Ease-out curve for smooth acceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const startWpm = targetWpmRef.current * WARMUP_START_PERCENT;
      const currentWpm = Math.round(startWpm + (targetWpmRef.current - startWpm) * easeOut);
      
      onWpmChange(currentWpm);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Warmup complete
        setIsWarmupActive(false);
        onWpmChange(targetWpmRef.current);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isWarmupActive, isPlaying, onWpmChange]);

  // Reset warmup when playback stops
  useEffect(() => {
    if (!isPlaying && isWarmupActive) {
      stopWarmup();
    }
  }, [isPlaying, isWarmupActive, stopWarmup]);

  return {
    isWarmupActive,
    warmupProgress,
    toggleWarmup,
    startWarmup,
    stopWarmup,
  };
}
