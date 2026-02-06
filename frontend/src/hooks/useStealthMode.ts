import { useState, useEffect, useCallback } from 'react';

interface UseStealthModeProps {
  isPlaying: boolean;
}

interface UseStealthModeReturn {
  isStealthActive: boolean;
}

export function useStealthMode({ isPlaying }: UseStealthModeProps): UseStealthModeReturn {
  const [isStealthActive, setIsStealthActive] = useState(false);
  
  // Activate stealth when playing starts
  useEffect(() => {
    if (isPlaying) {
      // Small delay before activating stealth for smoother UX
      const timer = setTimeout(() => {
        setIsStealthActive(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    } else {
      // Immediately deactivate on pause
      setIsStealthActive(false);
    }
  }, [isPlaying]);
  
  // Deactivate on any interaction
  const handleInteraction = useCallback(() => {
    setIsStealthActive(false);
  }, []);
  
  // Listen for mouse movement and clicks
  useEffect(() => {
    if (!isPlaying) return;
    
    let interactionTimeout: NodeJS.Timeout;
    
    const onInteraction = () => {
      setIsStealthActive(false);
      
      // Re-enable stealth after 2 seconds of no interaction (if still playing)
      clearTimeout(interactionTimeout);
      interactionTimeout = setTimeout(() => {
        if (isPlaying) {
          setIsStealthActive(true);
        }
      }, 2000);
    };
    
    window.addEventListener('mousemove', onInteraction);
    window.addEventListener('click', onInteraction);
    window.addEventListener('touchstart', onInteraction);
    
    return () => {
      window.removeEventListener('mousemove', onInteraction);
      window.removeEventListener('click', onInteraction);
      window.removeEventListener('touchstart', onInteraction);
      clearTimeout(interactionTimeout);
    };
  }, [isPlaying]);
  
  return {
    isStealthActive,
  };
}
