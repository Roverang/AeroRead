import { useEffect, useCallback, useState, useMemo } from 'react';
import { X, Eye } from 'lucide-react';
import { ProcessedWord } from '@/lib/textProcessor';
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

interface ReaderViewProps {
  words: ProcessedWord[];
  wpm: number;
  onWpmChange: (wpm: number) => void;
  onExit: (currentIndex?: number) => void;
  rawText: string;
  initialIndex?: number;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

export function ReaderView({ words, wpm, onWpmChange, onExit, rawText, initialIndex = 0, onPlayStateChange }: ReaderViewProps) {
  const [effectiveWpm, setEffectiveWpm] = useState(wpm);
  const [showHistory, setShowHistory] = useState(false);
  const [chunkSize, setChunkSize] = useState<1 | 2 | 3>(1);
  
  const {
    currentIndex,
    isPlaying,
    progress,
    currentWord,
    currentChunk,
    toggle,
    rewind,
    reset,
    setIndex,
  } = useAeroEngine({ words, wpm: effectiveWpm, chunkSize });

  // Set initial index on mount
  useEffect(() => {
    if (initialIndex > 0) {
      setIndex(initialIndex);
    }
  }, [initialIndex, setIndex]);

  // Notify parent of play state changes
  useEffect(() => {
    onPlayStateChange?.(isPlaying);
  }, [isPlaying, onPlayStateChange]);

  const textHash = hashText(rawText);
  
  const {
    savedIndex,
    hasSaved,
    saveBookmark,
    loadBookmark,
  } = useBookmark({ textHash, currentIndex });

  const {
    isWarmupActive,
    toggleWarmup,
  } = useWarmupMode({ 
    baseWpm: wpm, 
    isPlaying, 
    onWpmChange: setEffectiveWpm 
  });

  const {
    sessions,
    startSession,
    updateProgress,
    endSession,
    clearHistory,
    getStats,
  } = useReadingHistory();

  // Constellation System Messages
  const {
    currentMessage,
    dismissMessage,
  } = useSystemMessages({
    wpm: effectiveWpm,
    progress,
    isPlaying,
  });

  // Stealth Mode
  const { isStealthActive } = useStealthMode({ isPlaying });

  // Start session on mount
  useEffect(() => {
    startSession(rawText, words.length, wpm);
    return () => {
      endSession();
    };
  }, [rawText, words.length, wpm, startSession, endSession]);

  // Update progress in history
  useEffect(() => {
    updateProgress(progress, effectiveWpm);
  }, [progress, effectiveWpm, updateProgress]);

  // Calculate time to clear
  const estimatedTimeLeft = useMemo(() => {
    const wordsLeft = words.length - currentIndex;
    const minutesLeft = wordsLeft / effectiveWpm;
    
    if (minutesLeft < 1) {
      const seconds = Math.ceil(minutesLeft * 60);
      return `${seconds}s`;
    }
    
    const mins = Math.floor(minutesLeft);
    const secs = Math.ceil((minutesLeft - mins) * 60);
    return `${mins}m ${secs}s`;
  }, [words.length, currentIndex, effectiveWpm]);

  // Sync effective WPM with parent when not in warmup
  useEffect(() => {
    if (!isWarmupActive) {
      setEffectiveWpm(wpm);
    }
  }, [wpm, isWarmupActive]);

  // Handle loading bookmark
  const handleLoadBookmark = useCallback(() => {
    const idx = loadBookmark();
    if (idx !== null) {
      setIndex(idx);
    }
    return idx;
  }, [loadBookmark, setIndex]);

  // Handle exit with current index
  const handleExit = useCallback(() => {
    onExit(currentIndex);
  }, [onExit, currentIndex]);

  // Keyboard controls
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      toggle();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      rewind(10);
    } else if (e.code === 'Escape') {
      e.preventDefault();
      handleExit();
    }
  }, [toggle, rewind, handleExit]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const stats = getStats();

  // Stealth mode classes
  const stealthClasses = `transition-opacity duration-500 ${
    isStealthActive ? 'opacity-0 pointer-events-none' : 'opacity-100'
  }`;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header Bar - Fades with stealth */}
      <header className={`relative z-10 flex items-center justify-between p-4 border-b border-primary/30 ${stealthClasses}`}>
        <div className="flex items-center gap-3">
          <Eye className="w-5 h-5 text-primary animate-pulse-soft" />
          <span className="ui-label text-primary">
            FOURTH WALL ACTIVE
          </span>
          {isWarmupActive && (
            <span className="px-2 py-0.5 bg-olive/20 border border-olive/50 rounded-none ui-label text-olive text-[10px] animate-warmup-pulse">
              WARMUP MODE
            </span>
          )}
          {chunkSize > 1 && (
            <span className="px-2 py-0.5 bg-primary/10 border border-primary/30 rounded-none ui-label text-primary text-[10px]">
              {chunkSize}W CHUNK
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <span className="ui-label text-dust">
            [ SYNC RATE ]: <span className="text-foreground font-bold">{effectiveWpm}</span> WPM
          </span>
          
          <button
            onClick={handleExit}
            className="literary-panel p-2 rounded-none hover:literary-panel-active transition-all duration-200"
          >
            <X className="w-4 h-4 text-dust hover:text-foreground" />
          </button>
        </div>
      </header>
      
      {/* Main Reading Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        {/* The "Fourth Wall" - Main display container */}
        <div className="w-full max-w-4xl">
          {/* Word Display Box - Border fades with stealth, text stays visible */}
          <div className={`
            bg-reader rounded-none p-8 md:p-12 min-h-[200px] 
            flex items-center justify-center
            transition-all duration-500
            ${isStealthActive 
              ? 'border-transparent' 
              : 'border border-primary/30 literary-panel-active'
            }
            ${isWarmupActive && !isStealthActive ? 'animate-warmup-pulse' : ''}
          `}>
            <SplinterDisplay word={currentWord} chunk={currentChunk} />
          </div>
          
          {/* Status Bar - Fades with stealth */}
          <div className={`mt-6 ${stealthClasses}`}>
            <StatusBar 
              progress={progress}
              currentIndex={currentIndex}
              totalWords={words.length}
              estimatedTimeLeft={estimatedTimeLeft}
            />
          </div>
          
          {/* Control Panel - Fades with stealth */}
          <div className={`mt-6 ${stealthClasses}`}>
            <ControlPanel
              wpm={wpm}
              onWpmChange={onWpmChange}
              isPlaying={isPlaying}
              onToggle={toggle}
              onRewind={() => rewind(10)}
              onReset={reset}
              chunkSize={chunkSize}
              onChunkSizeChange={setChunkSize}
            />
          </div>
        </div>
      </main>
      
      {/* Inventory Bar - Fades with stealth */}
      <div className={stealthClasses}>
        <InventoryBar
          onHistoryOpen={() => setShowHistory(true)}
          onBookmarkSave={saveBookmark}
          onBookmarkLoad={handleLoadBookmark}
          onWarmupToggle={toggleWarmup}
          isWarmupActive={isWarmupActive}
          hasSavedBookmark={hasSaved}
          savedBookmarkIndex={savedIndex}
          currentIndex={currentIndex}
          totalWords={words.length}
        />
      </div>

      {/* History Modal */}
      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        sessions={sessions}
        onClearHistory={clearHistory}
        stats={stats}
      />

      {/* Constellation System Messages */}
      <SystemMessage 
        message={currentMessage} 
        onDismiss={dismissMessage} 
      />
    </div>
  );
}
