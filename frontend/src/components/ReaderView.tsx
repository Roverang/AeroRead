import { useEffect, useCallback, useState, useMemo } from 'react';
import { X, Eye } from 'lucide-react';
import { ProcessedWord, processText } from '@/lib/textProcessor';
import { SplinterDisplay } from './SplinterDisplay';
import { StatusBar } from './StatusBar';
import { ControlPanel } from './ControlPanel';
import { InventoryBar } from './InventoryBar';
import { HistoryModal } from './HistoryModal';
import { SystemMessage } from './SystemMessage';
import { useAeroEngine } from '@/hooks/useAeroEngine';
import { useBookmark, hashText } from '@/hooks/useBookmark';
import { useWarmupMode } from '@/hooks/useWarmupMode';
import { useReadingHistory } from '@/hooks/useReadingHistory';
import { useSystemMessages } from '@/hooks/useSystemMessages';
import { useStealthMode } from '@/hooks/useStealthMode';
import { getChapter, updateProgress } from '@/services/archiveService';

interface ReaderViewProps {
  storyId: string;
  initialWords: ProcessedWord[];
  wpm: number;
  onWpmChange: (wpm: number) => void;
  onExit: (currentIndex?: number, chapterIndex?: number) => void;
  rawText: string;
  initialIndex?: number;
  initialChapterIndex?: number;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

export function ReaderView({ 
  storyId,
  initialWords, 
  wpm, 
  onWpmChange, 
  onExit, 
  rawText, 
  initialIndex = 0, 
  initialChapterIndex = 0,
  onPlayStateChange 
}: ReaderViewProps) {
  const [currentWords, setCurrentWords] = useState<ProcessedWord[]>(initialWords);
  const [chapterIndex, setChapterIndex] = useState(initialChapterIndex);
  const [effectiveWpm, setEffectiveWpm] = useState(wpm);
  const [showHistory, setShowHistory] = useState(false);
  const [chunkSize, setChunkSize] = useState<1 | 2 | 3>(1);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- CHAPTER STREAMING ---
  const loadNextChapter = useCallback(async () => {
    try {
      setIsSyncing(true);
      const nextIdx = chapterIndex + 1;
      const data = await getChapter(storyId, nextIdx);
      if (data && data.content) {
        const processed = processText(data.content.join(' '));
        setCurrentWords(processed);
        setChapterIndex(nextIdx);
      } else {
        onExit(currentIndex, chapterIndex);
      }
    } catch (error) {
      onExit(currentIndex, chapterIndex);
    } finally {
      setIsSyncing(false);
    }
  }, [storyId, chapterIndex, onExit]);

  // --- ENGINE ---
  const {
    currentIndex,
    isPlaying,
    progress,
    currentWord,
    currentChunk,
    toggle, // This is the core engine trigger
    rewind,
    reset,
    setIndex,
  } = useAeroEngine({ 
    words: currentWords, 
    wpm: effectiveWpm, 
    chunkSize,
    initialIndex,
    onChapterComplete: loadNextChapter 
  });

  // CRITICAL FIX: Explicit Toggle Handler
  const handleToggle = useCallback(() => {
    if (isSyncing) return; // Don't play while downloading chapters
    if (currentWords.length > 0) {
      toggle();
    } else {
      console.warn("[ SYSTEM ]: No narrative data to play.");
    }
  }, [currentWords, toggle, isSyncing]);

  // --- SYNC PROGRESS ---
  useEffect(() => {
    if (!isPlaying && currentIndex > 0) {
      updateProgress(storyId, currentIndex, chapterIndex);
    }
  }, [isPlaying, currentIndex, chapterIndex, storyId]);

  useEffect(() => {
    onPlayStateChange?.(isPlaying);
  }, [isPlaying, onPlayStateChange]);

  // --- HOOKS ---
  const textHash = useMemo(() => hashText(rawText), [rawText]);
  const { savedIndex, hasSaved, saveBookmark, loadBookmark } = useBookmark({ textHash, currentIndex });
  const { isWarmupActive, toggleWarmup } = useWarmupMode({ baseWpm: wpm, isPlaying, onWpmChange: setEffectiveWpm });
  const { sessions, startSession, updateProgress: updateHistory, endSession, clearHistory, getStats } = useReadingHistory();
  const { currentMessage, dismissMessage } = useSystemMessages({ wpm: effectiveWpm, progress, isPlaying });
  const { isStealthActive } = useStealthMode({ isPlaying });

  // --- LIFECYCLE ---
  useEffect(() => {
    startSession(rawText, currentWords.length, wpm);
    return () => endSession();
  }, [rawText, currentWords.length, wpm, startSession, endSession]);

  useEffect(() => {
    updateHistory(progress, effectiveWpm);
  }, [progress, effectiveWpm, updateHistory]);

  const estimatedTimeLeft = useMemo(() => {
    const wordsLeft = currentWords.length - currentIndex;
    const minutesLeft = wordsLeft / (effectiveWpm || 1);
    if (minutesLeft < 1) return `${Math.ceil(minutesLeft * 60)}s`;
    return `${Math.floor(minutesLeft)}m ${Math.ceil((minutesLeft % 1) * 60)}s`;
  }, [currentWords.length, currentIndex, effectiveWpm]);

  const handleExit = useCallback(() => {
    updateProgress(storyId, currentIndex, chapterIndex);
    onExit(currentIndex, chapterIndex);
  }, [onExit, currentIndex, chapterIndex, storyId]);

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleToggle(); // Use the new fixed handler
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        rewind(10);
      } else if (e.code === 'Escape') {
        e.preventDefault();
        handleExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggle, rewind, handleExit]);

  const stealthClasses = `transition-opacity duration-300 ${isStealthActive ? 'opacity-0 pointer-events-none' : 'opacity-100'}`;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col font-mono overflow-hidden">
      
      {/* 1. HEADER (Z-40) */}
      <header className={`h-16 flex-shrink-0 flex items-center justify-between px-6 border-b border-primary/20 bg-background z-40 ${stealthClasses}`}>
        <div className="flex items-center gap-3">
          <Eye className="w-5 h-5 text-primary" />
          <span className="ui-label text-[10px] text-primary tracking-widest uppercase">
            [ CH: {chapterIndex + 1} ] {isSyncing ? "SYNCING..." : "READY"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="ui-label text-[10px] text-dust uppercase">
            SPEED: <span className="text-foreground">{effectiveWpm}</span> WPM
          </span>
          <button onClick={handleExit} className="p-1 hover:text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>
      
      {/* 2. MAIN CANVAS (Flex-1) */}
      <main className="flex-1 overflow-y-auto px-6 pt-12 relative bg-background">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center pb-40">
          
          <div className={`
            w-full bg-reader border border-primary/10 p-10 md:p-16 min-h-[220px] 
            flex items-center justify-center transition-all duration-300
            ${isSyncing ? 'opacity-20' : 'opacity-100'}
          `}>
            <SplinterDisplay word={currentWord} chunk={currentChunk} />
          </div>
          
          <div className={`w-full max-w-2xl mt-10 space-y-10 ${stealthClasses}`}>
            <StatusBar 
              progress={progress}
              currentIndex={currentIndex}
              totalWords={currentWords.length}
              estimatedTimeLeft={estimatedTimeLeft}
            />
            
            <ControlPanel
              wpm={wpm}
              onWpmChange={onWpmChange}
              isPlaying={isPlaying}
              onToggle={handleToggle} // Uses the fixed explicit handler
              onRewind={() => rewind(10)}
              onReset={reset}
              chunkSize={chunkSize}
              onChunkSizeChange={setChunkSize}
            />
          </div>
        </div>
      </main>
      
      {/* 3. FOOTER (Z-50) */}
      <footer className={`h-24 flex-shrink-0 bg-background border-t border-primary/20 z-50 flex items-center ${stealthClasses}`}>
        <div className="w-full px-6">
          <InventoryBar
            onHistoryOpen={() => setShowHistory(true)}
            onBookmarkSave={saveBookmark}
            onBookmarkLoad={() => {
              const idx = loadBookmark();
              if (idx !== null) setIndex(idx);
            }}
            onWarmupToggle={toggleWarmup}
            isWarmupActive={isWarmupActive}
            hasSavedBookmark={hasSaved}
            savedBookmarkIndex={savedIndex}
            currentIndex={currentIndex}
            totalWords={currentWords.length}
          />
        </div>
      </footer>

      <HistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} sessions={sessions} onClearHistory={clearHistory} stats={getStats()} />
      <SystemMessage message={currentMessage} onDismiss={dismissMessage} />
    </div>
  );
}