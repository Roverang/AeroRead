import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWarmupModeProps {
  baseWpm: number;
  isPlaying: boolean;
  onWpmChange: (wpm: number) => void;
}

const WARMUP_DURATION = 5000; // 5 seconds of acceleration
const WARMUP_START_PERCENT = 0.5; // Start at 50% of target speed

/**
 * THE WARMUP PROTOCOL (Cubic Ease-Out)
 * This hook manages the gradual synchronization of the reader's focus.
 * It ensures that the transition into high-speed RSVP is seamless.
 */
export function useWarmupMode({ 
  baseWpm, 
  isPlaying, 
  onWpmChange 
}: UseWarmupModeProps) {
  const [isWarmupActive, setIsWarmupActive] = useState(false);
  const [warmupProgress, setWarmupProgress] = useState(0);
  
  // REFS for the "System" to maintain state across re-renders
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const targetWpmRef = useRef(baseWpm);

  /**
   * INITIATE: Start the warmup sequence
   */
  const startWarmup = useCallback(() => {
    console.log("[ SYSTEM ]: INITIATING WARMUP PROTOCOL");
    targetWpmRef.current = baseWpm;
    startTimeRef.current = performance.now(); // More precise than Date.now()
    setIsWarmupActive(true);
    setWarmupProgress(0);
  }, [baseWpm]);

  /**
   * TERMINATE: Stop the warmup and lock to target
   */
  const stopWarmup = useCallback(() => {
    setIsWarmupActive(false);
    setWarmupProgress(0);
    startTimeRef.current = null;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Restore the system to the target WPM
    onWpmChange(targetWpmRef.current);
  }, [onWpmChange]);

  /**
   * TOGGLE: User-controlled warmup override
   */
  const toggleWarmup = useCallback(() => {
    if (isWarmupActive) {
      stopWarmup();
    } else {
      startWarmup();
    }
  }, [isWarmupActive, startWarmup, stopWarmup]);

  /**
   * ACCELERATION LOOP
   * Calculates current WPM based on a cubic ease-out curve.
   */
  useEffect(() => {
    // Warmup only runs while playing and if active
    if (!isWarmupActive || !isPlaying) return;

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) startTimeRef.current = currentTime;

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / WARMUP_DURATION, 1);
      
      setWarmupProgress(progress);

      /**
       * EASE OUT CUBIC FORMULA: f(t) = 1 - (1 - t)^3
       * Provides a smooth, high-acceleration start that tapers off.
       */
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const startWpm = targetWpmRef.current * WARMUP_START_PERCENT;
      const currentWpm = Math.round(startWpm + (targetWpmRef.current - startWpm) * easeOut);
      
      // Feed the engine the current frame's speed
      onWpmChange(currentWpm);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // [ SYSTEM ]: SYNC COMPLETE
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

  /**
   * AUTO-STOP: Stop warmup if the user pauses manually
   */
  useEffect(() => {
    if (!isPlaying && isWarmupActive) {
      stopWarmup();
    }
  }, [isPlaying, isWarmupActive, stopWarmup]);

  /**
   * WPM UPDATE SYNC: Keep the ref updated if the user manually 
   * changes WPM during a session.
   */
  useEffect(() => {
    if (!isWarmupActive) {
      targetWpmRef.current = baseWpm;
    }
  }, [baseWpm, isWarmupActive]);

  return {
    isWarmupActive,
    warmupProgress,
    toggleWarmup,
    startWarmup,
    stopWarmup,
  };
}