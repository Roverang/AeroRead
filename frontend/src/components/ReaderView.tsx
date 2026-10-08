import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { X, Eye, RotateCcw, Library } from 'lucide-react';
import { toast } from 'sonner';
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
import { getChapter, updateProgress } from '@/services/archiveService';

interface ReaderViewProps {
  /** Archive id to save progress against; null for pasted text. */
  storyId: string | null;
  initialWords: ProcessedWord[];
  wpm: number;
  onWpmChange: (wpm: number) => void;
  onExit: (currentIndex?: number, chapterIndex?: number) => void;
  rawText: string;
  initialIndex?: number;
  initialChapterIndex?: number;
  /** Number of chapters to stream from the cloud archive; 1 for local text. */
  totalChapters?: number;
  isStealthActive?: boolean;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

const MIN_WPM = 100;
const MAX_WPM = 1500;

function formatTimeLeft(minutes: number): string {
  const totalSeconds = Math.max(0, Math.ceil(minutes * 60));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  return `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`;
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
  totalChapters: initialTotalChapters = 1,
  isStealthActive = false,
  onPlayStateChange
}: ReaderViewProps) {
  const [currentWords, setCurrentWords] = useState<ProcessedWord[]>(initialWords);
  const [chapterIndex, setChapterIndex] = useState(initialChapterIndex);
  const [totalChapters, setTotalChapters] = useState(initialTotalChapters);
  // Where the engine starts in the current chapter: the saved position
  // for the first chapter, then 0 for every chapter streamed after it.
  const [startIndex, setStartIndex] = useState(initialIndex);
  const [effectiveWpm, setEffectiveWpm] = useState(wpm);
  const [showHistory, setShowHistory] = useState(false);
  const [chunkSize, setChunkSize] = useState<1 | 2 | 3>(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const continuePlayingRef = useRef(false);

  // --- CHAPTER STREAMING ---
  const loadNextChapter = useCallback(async (finalIndex: number) => {
    const nextIdx = chapterIndex + 1;
    if (!storyId || nextIdx >= totalChapters) {
      if (storyId) updateProgress(storyId, finalIndex, chapterIndex);
      setIsFinished(true);
      return;
    }

    setIsSyncing(true);
    try {
      const data = await getChapter(storyId, nextIdx);
      setTotalChapters(data.total_chapters);
      setStartIndex(0);
      setCurrentWords(processText(data.text));
      setChapterIndex(nextIdx);
      updateProgress(storyId, 0, nextIdx);
      continuePlayingRef.current = true;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        updateProgress(storyId, finalIndex, chapterIndex);
        setIsFinished(true);
      } else {
        console.error('[ SYSTEM ERROR ]: Chapter stream failed.', error);
        toast.error('FAIL: Could not load the next chapter. Press play to retry.');
      }
    } finally {
      setIsSyncing(false);
    }
  }, [storyId, chapterIndex, totalChapters]);

  // --- ENGINE ---
  const {
    currentIndex,
    isPlaying,
    progress,
    currentWord,
    currentChunk,
    play,
    toggle, // This is the core engine trigger
    rewind,
    reset,
    setIndex,
  } = useAeroEngine({
    words: currentWords,
    wpm: effectiveWpm,
    chunkSize,
    initialIndex: startIndex,
    onChapterComplete: loadNextChapter
  });

  // Keep reading straight into a freshly streamed chapter
  useEffect(() => {
    if (continuePlayingRef.current) {
      continuePlayingRef.current = false;
      play();
    }
  }, [currentWords, play]);

  const handleToggle = useCallback(() => {
    if (isSyncing) return; // Don't play while downloading chapters
    if (currentWords.length === 0) {
      console.warn("[ SYSTEM ]: No narrative data to play.");
      return;
    }
    // Finished the chapter but the next one failed to load: retry it
    if (!isPlaying && !isFinished && currentIndex >= currentWords.length - 1 && chapterIndex + 1 < totalChapters) {
      loadNextChapter(currentIndex);
      return;
    }
    setIsFinished(false);
    toggle();
  }, [currentWords.length, toggle, isSyncing, isPlaying, isFinished, currentIndex, chapterIndex, totalChapters, loadNextChapter]);

  // --- SYNC PROGRESS ---
  useEffect(() => {
    if (storyId && !isPlaying && currentIndex > 0) {
      updateProgress(storyId, currentIndex, chapterIndex);
    }
  }, [isPlaying, currentIndex, chapterIndex, storyId]);

  useEffect(() => {
    onPlayStateChange?.(isPlaying);
  }, [isPlaying, onPlayStateChange]);

  // --- HOOKS ---
  const textHash = useMemo(() => hashText(rawText), [rawText]);
  const { savedIndex, hasSaved, saveBookmark, loadBookmark } = useBookmark({
    textHash,
    currentIndex,
    storyId: storyId ?? undefined,
    chapterIndex,
  });
  const { isWarmupActive, toggleWarmup } = useWarmupMode({ baseWpm: wpm, isPlaying, onWpmChange: setEffectiveWpm });
  const { sessions, startSession, updateProgress: updateHistory, endSession, clearHistory, getStats } = useReadingHistory();
  const { currentMessage, dismissMessage } = useSystemMessages({ wpm: effectiveWpm, progress, isPlaying });

  // --- LIFECYCLE ---
  // One history session per chapter; speed changes update it rather than restart it.
  const sessionInfoRef = useRef({ wordCount: currentWords.length, wpm });
  sessionInfoRef.current = { wordCount: currentWords.length, wpm };
  useEffect(() => {
    startSession(rawText, sessionInfoRef.current.wordCount, sessionInfoRef.current.wpm);
    return () => endSession();
  }, [rawText, chapterIndex, startSession, endSession]);

  useEffect(() => {
    updateHistory(progress, effectiveWpm);
  }, [progress, effectiveWpm, updateHistory]);

  const estimatedTimeLeft = useMemo(() => {
    const wordsLeft = currentWords.length - currentIndex;
    return formatTimeLeft(wordsLeft / (effectiveWpm || 1));
  }, [currentWords.length, currentIndex, effectiveWpm]);

  // Progress is saved by the parent's onExit handler
  const handleExit = useCallback(() => {
    onExit(currentIndex, chapterIndex);
  }, [onExit, currentIndex, chapterIndex]);

  const handleRestart = useCallback(() => {
    setIsFinished(false);
    reset();
  }, [reset]);

  // Keyboard
  useEffect(() => {
    const adjustWpm = (delta: number) => onWpmChange(Math.max(MIN_WPM, Math.min(MAX_WPM, wpm + delta)));
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showHistory) return;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handleToggle();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          rewind(10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          setIndex(currentIndex + 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          adjustWpm(25);
          break;
        case 'ArrowDown':
          e.preventDefault();
          adjustWpm(-25);
          break;
        case 'Escape':
          e.preventDefault();
          handleExit();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggle, rewind, setIndex, currentIndex, handleExit, onWpmChange, wpm, showHistory]);

  const stealthClasses = `transition-opacity duration-300 ${isStealthActive ? 'opacity-0 pointer-events-none' : 'opacity-100'}`;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col font-mono overflow-hidden">

      {/* 1. HEADER (Z-40) */}
      <header className={`h-16 flex-shrink-0 flex items-center justify-between gap-4 px-4 sm:px-6 border-b border-primary/20 bg-background z-40 ${stealthClasses}`}>
        <div className="flex items-center gap-3 min-w-0">
          <Eye className="w-5 h-5 text-primary flex-shrink-0" />
          <span className="ui-label text-[10px] text-primary tracking-widest uppercase truncate">
            [ CH: {chapterIndex + 1}{totalChapters > 1 ? ` / ${totalChapters}` : ''} ] {isSyncing ? "SYNCING..." : "READY"}
          </span>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <span className="ui-label text-[10px] text-dust uppercase hidden sm:inline">
            SPEED: <span className="text-foreground">{effectiveWpm}</span> WPM
          </span>
          <button
            onClick={handleExit}
            aria-label="Exit reader"
            title="Exit (Esc)"
            className="p-1 hover:text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. MAIN CANVAS (Flex-1) */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 pt-8 sm:pt-12 relative bg-background">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center pb-40">

          <div className={`
            relative w-full bg-reader border border-primary/10 p-6 sm:p-10 md:p-16 min-h-[220px]
            flex items-center justify-center transition-all duration-300
            ${isSyncing ? 'opacity-20' : 'opacity-100'}
          `}>
            {isFinished ? (
              <div className="flex flex-col items-center gap-6 text-center animate-in fade-in duration-500">
                <span className="ui-label text-primary text-lg sm:text-2xl tracking-[0.3em]">[ SCENARIO CLEAR ]</span>
                <p className="text-dust font-ui text-xs uppercase tracking-widest">
                  {totalChapters > 1 ? `All ${totalChapters} chapters complete.` : 'You reached the end.'}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button onClick={handleRestart} className="flex items-center gap-2 px-4 py-2 border border-primary/30 hover:border-primary hover:bg-primary/10 transition-colors ui-label text-xs">
                    <RotateCcw className="w-4 h-4" /> READ CHAPTER AGAIN
                  </button>
                  <button onClick={handleExit} className="flex items-center gap-2 px-4 py-2 border border-primary bg-primary/10 hover:bg-primary/20 transition-colors ui-label text-xs text-primary">
                    <Library className="w-4 h-4" /> BACK TO ARCHIVE
                  </button>
                </div>
              </div>
            ) : (
              <SplinterDisplay word={currentWord} chunk={currentChunk} />
            )}
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
              onToggle={handleToggle}
              onRewind={() => rewind(10)}
              onReset={handleRestart}
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
