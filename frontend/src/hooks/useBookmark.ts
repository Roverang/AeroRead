import { useState, useEffect } from 'react';

interface UseBookmarkProps {
  textHash: string;
  currentIndex: number;
}

interface BookmarkData {
  textHash: string;
  index: number;
  savedAt: number;
}

const BOOKMARK_KEY = 'aeroread_bookmark';

export function useBookmark({ textHash, currentIndex }: UseBookmarkProps) {
  const [savedIndex, setSavedIndex] = useState<number | null>(null);
  const [hasSaved, setHasSaved] = useState(false);

  // Load bookmark on mount
  useEffect(() => {
    const stored = localStorage.getItem(BOOKMARK_KEY);
    if (stored) {
      try {
        const data: BookmarkData = JSON.parse(stored);
        if (data.textHash === textHash) {
          setSavedIndex(data.index);
        } else {
          setSavedIndex(null);
        }
      } catch {
        setSavedIndex(null);
      }
    }
  }, [textHash]);

  const saveBookmark = () => {
    const data: BookmarkData = {
      textHash,
      index: currentIndex,
      savedAt: Date.now(),
    };
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(data));
    setSavedIndex(currentIndex);
    setHasSaved(true);
    
    // Reset the "just saved" indicator after 2 seconds
    setTimeout(() => setHasSaved(false), 2000);
  };

  const loadBookmark = (): number | null => {
    return savedIndex;
  };

  const clearBookmark = () => {
    localStorage.removeItem(BOOKMARK_KEY);
    setSavedIndex(null);
  };

  return {
    savedIndex,
    hasSaved,
    saveBookmark,
    loadBookmark,
    clearBookmark,
  };
}

// Simple hash function for text identification
export function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < Math.min(text.length, 1000); i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}
