import { useState, useEffect, useCallback, useRef } from 'react';

export interface ReadingSession {
  id: string;
  textPreview: string;
  wordCount: number;
  wpm: number;
  startTime: number;
  endTime?: number;
  progress: number; // 0-100
}

const STORAGE_KEY = 'aeroread_history';
const MAX_SESSIONS = 5;

export function useReadingHistory() {
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ReadingSession | null>(null);
  // Mirrors currentSession so endSession can stay stable across progress updates
  const sessionRef = useRef<ReadingSession | null>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSessions(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load reading history:', e);
    }
  }, []);

  // Save sessions to localStorage
  const saveToStorage = useCallback((newSessions: ReadingSession[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSessions));
    } catch (e) {
      console.error('Failed to save reading history:', e);
    }
  }, []);

  // Start a new reading session
  const startSession = useCallback((text: string, wordCount: number, wpm: number) => {
    const session: ReadingSession = {
      id: Date.now().toString(),
      textPreview: text.slice(0, 50) + (text.length > 50 ? '...' : ''),
      wordCount,
      wpm,
      startTime: Date.now(),
      progress: 0,
    };
    sessionRef.current = session;
    setCurrentSession(session);
    return session.id;
  }, []);

  // Update current session progress
  const updateProgress = useCallback((progress: number, wpm: number) => {
    if (!sessionRef.current) return;
    sessionRef.current = { ...sessionRef.current, progress, wpm };
    setCurrentSession(sessionRef.current);
  }, []);

  // End the current session and save to history.
  // Writes storage directly: this runs during unmount, when state
  // updaters would never execute.
  const endSession = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    setCurrentSession(null);
    if (!session || session.progress <= 0) return;

    const completedSession: ReadingSession = {
      ...session,
      endTime: Date.now(),
    };

    let stored: ReadingSession[] = [];
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      stored = [];
    }
    const newSessions = [completedSession, ...stored].slice(0, MAX_SESSIONS);
    saveToStorage(newSessions);
    setSessions(newSessions);
  }, [saveToStorage]);

  // Clear all history
  const clearHistory = useCallback(() => {
    setSessions([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Calculate reading stats
  const getStats = useCallback(() => {
    if (sessions.length === 0) return null;
    
    const avgWpm = sessions.reduce((acc, s) => acc + s.wpm, 0) / sessions.length;
    const totalWords = sessions.reduce((acc, s) => acc + Math.round(s.wordCount * s.progress / 100), 0);
    const totalTime = sessions.reduce((acc, s) => {
      if (s.endTime) {
        return acc + (s.endTime - s.startTime);
      }
      return acc;
    }, 0);
    
    return {
      avgWpm: Math.round(avgWpm),
      totalWords,
      totalTimeMs: totalTime,
      sessionCount: sessions.length,
    };
  }, [sessions]);

  return {
    sessions,
    currentSession,
    startSession,
    updateProgress,
    endSession,
    clearHistory,
    getStats,
  };
}
