import { useState, useCallback, useRef, useEffect } from 'react';
import { SystemMessageData } from '@/components/SystemMessage';

interface UseSystemMessagesProps {
  wpm: number;
  progress: number;
  isPlaying: boolean;
}

interface UseSystemMessagesReturn {
  currentMessage: SystemMessageData | null;
  dismissMessage: () => void;
}

// Track which messages have been shown this session
const shownMessages = new Set<string>();

export function useSystemMessages({
  wpm,
  progress,
  isPlaying,
}: UseSystemMessagesProps): UseSystemMessagesReturn {
  const [currentMessage, setCurrentMessage] = useState<SystemMessageData | null>(null);
  const [messageQueue, setMessageQueue] = useState<SystemMessageData[]>([]);
  
  // Timer refs for continuous reading
  const playStartTimeRef = useRef<number | null>(null);
  const grinderCheckRef = useRef<NodeJS.Timeout | null>(null);
  
  // Queue a message (only if not already shown)
  const queueMessage = useCallback((id: string, text: string, type: SystemMessageData['type'] = 'constellation') => {
    if (shownMessages.has(id)) return;
    
    shownMessages.add(id);
    setMessageQueue(prev => [...prev, { id, text, type }]);
  }, []);
  
  // Dismiss current message and show next in queue
  const dismissMessage = useCallback(() => {
    setCurrentMessage(null);
  }, []);
  
  // Process queue
  useEffect(() => {
    if (!currentMessage && messageQueue.length > 0) {
      const [next, ...rest] = messageQueue;
      setCurrentMessage(next);
      setMessageQueue(rest);
    }
  }, [currentMessage, messageQueue]);
  
  // Trigger: Speed Demon (WPM > 800)
  useEffect(() => {
    if (wpm > 800) {
      queueMessage(
        'speed_demon',
        "[ The Constellation 'Secretive Plotter' is watching your speed with interest. ]"
      );
    }
  }, [wpm, queueMessage]);
  
  // Trigger: Completionist (100% progress)
  useEffect(() => {
    if (progress >= 100) {
      queueMessage(
        'completionist',
        '[ MAIN SCENARIO CLEARED. COMPENSATION: KNOWLEDGE ACQUIRED. ]',
        'achievement'
      );
    }
  }, [progress, queueMessage]);
  
  // Trigger: The Grinder (10 minutes continuous reading)
  useEffect(() => {
    if (isPlaying) {
      if (!playStartTimeRef.current) {
        playStartTimeRef.current = Date.now();
      }
      
      // Check every 30 seconds for the 10-minute milestone
      grinderCheckRef.current = setInterval(() => {
        if (playStartTimeRef.current) {
          const elapsed = Date.now() - playStartTimeRef.current;
          const tenMinutes = 10 * 60 * 1000;
          
          if (elapsed >= tenMinutes) {
            queueMessage(
              'grinder',
              "[ The Constellation 'Demon King of Salvation' sponsors you 100 coins for your persistence. ]"
            );
            // Clear interval after triggering
            if (grinderCheckRef.current) {
              clearInterval(grinderCheckRef.current);
            }
          }
        }
      }, 30000);
    } else {
      // Reset on pause
      playStartTimeRef.current = null;
      if (grinderCheckRef.current) {
        clearInterval(grinderCheckRef.current);
      }
    }
    
    return () => {
      if (grinderCheckRef.current) {
        clearInterval(grinderCheckRef.current);
      }
    };
  }, [isPlaying, queueMessage]);
  
  return {
    currentMessage,
    dismissMessage,
  };
}
