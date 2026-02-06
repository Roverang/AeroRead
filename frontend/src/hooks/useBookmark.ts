import { useState, useEffect, useCallback, useMemo } from 'react';

interface UseBookmarkProps {
  textHash: string;      // The content-based unique ID
  currentIndex: number;  // The active word position
  storyId?: string;      // Optional MongoDB ID for multi-story support
}

interface BookmarkData {
  textHash: string;
  storyId?: string;
  index: number;
  savedAt: number;
}

/**
 * THE OMNISCIENT ANCHOR
 * This hook manages the specific 'pinned' coordinates within a narrative.
 * It ensures that even if the system reboots, the reader can return 
 * to the exact moment they left.
 */
export function useBookmark({ textHash, currentIndex, storyId }: UseBookmarkProps) {
  const [savedIndex, setSavedIndex] = useState<number | null>(null);
  const [hasSaved, setHasSaved] = useState(false);

  // We use a unique key per story so bookmarks don't overwrite each other
  const STORAGE_KEY = useMemo(() => {
    return storyId ? `aeroread_bookmark_${storyId}` : `aeroread_bookmark_${textHash.substring(0, 8)}`;
  }, [storyId, textHash]);

  /**
   * INITIALIZATION: Sync with LocalStorage
   * On mount or when the story changes, we check if an anchor exists.
   */
  useEffect(() => {
    const loadSavedState = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      
      if (!stored) {
        setSavedIndex(null);
        return;
      }

      try {
        const data: BookmarkData = JSON.parse(stored);
        
        // Verify the data belongs to this specific text
        if (data.textHash === textHash || (data.storyId && data.storyId === storyId)) {
          setSavedIndex(data.index);
        } else {
          // Data mismatch (corruption or key collision)
          setSavedIndex(null);
        }
      } catch (error) {
        console.error("[ SYSTEM ERROR ]: Failed to parse bookmark data stream.", error);
        setSavedIndex(null);
      }
    };

    loadSavedState();
  }, [STORAGE_KEY, textHash, storyId]);

  /**
   * SAVE: Anchors the current position
   * Fires the 'Position Saved' event and updates local persistence.
   */
  const saveBookmark = useCallback(() => {
    if (currentIndex < 0) return;

    const data: BookmarkData = {
      textHash,
      storyId,
      index: currentIndex,
      savedAt: Date.now(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSavedIndex(currentIndex);
      setHasSaved(true);
      
      // The visual confirmation duration for the UI
      const timer = setTimeout(() => {
        setHasSaved(false);
      }, 2000);

      return () => clearTimeout(timer);
    } catch (error) {
      console.error("[ SYSTEM ERROR ]: Failed to anchor current coordinates.", error);
    }
  }, [STORAGE_KEY, textHash, storyId, currentIndex]);

  /**
   * LOAD: Returns the saved coordinates
   */
  const loadBookmark = useCallback((): number | null => {
    // We check the source of truth again to ensure consistency
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data: BookmarkData = JSON.parse(stored);
        return data.index;
      } catch {
        return savedIndex;
      }
    }
    return savedIndex;
  }, [STORAGE_KEY, savedIndex]);

  /**
   * CLEAR: Purges the anchor from the system
   */
  const clearBookmark = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSavedIndex(null);
    setHasSaved(false);
  }, [STORAGE_KEY]);

  /**
   * HELPER: Quick check to see if we are currently at the bookmark
   */
  const isAtBookmark = useMemo(() => {
    return currentIndex === savedIndex;
  }, [currentIndex, savedIndex]);

  return {
    savedIndex,
    hasSaved,
    isAtBookmark,
    saveBookmark,
    loadBookmark,
    clearBookmark,
  };
}

/**
 * HASHING ENGINE
 * Generates a unique 36-bit identifier for the text content.
 * Limited to 1000 characters for performance during system initialization.
 */
export function hashText(text: string): string {
  if (!text) return "null-narrative";
  
  let hash = 0;
  // We use a sliding window for the hash to ensure variety in titles
  const limit = Math.min(text.length, 1000);
  
  for (let i = 0; i < limit; i++) {
    const char = text.charCodeAt(i);
    // Bitwise shift and subtraction for distribution
    hash = ((hash << 5) - hash) + char;
    // Force to 32bit integer
    hash = hash & hash;
  }
  
  // Return base-36 string (alphanumeric) for a cleaner storage key
  return Math.abs(hash).toString(36);
}