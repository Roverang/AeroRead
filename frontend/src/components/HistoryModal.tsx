import { X, Clock, Zap, BookOpen, Trash2 } from 'lucide-react';
import { ReadingSession } from '@/hooks/useReadingHistory';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ReadingSession[];
  onClearHistory: () => void;
  stats: {
    avgWpm: number;
    totalWords: number;
    totalTimeMs: number;
    sessionCount: number;
  } | null;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HistoryModal({ isOpen, onClose, sessions, onClearHistory, stats }: HistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg literary-panel rounded-none p-6 space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="ui-text text-xl font-bold">[ HISTORY LOG ]</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-primary/10 transition-colors rounded-none"
          >
            <X className="w-5 h-5 text-dust hover:text-primary" />
          </button>
        </div>
        
        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-surface rounded-none border border-primary/20">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Zap className="w-4 h-4 text-primary" />
                <span className="ui-label text-[10px]">AVG SYNC</span>
              </div>
              <span className="font-reader text-lg text-foreground">{stats.avgWpm}</span>
              <span className="text-dust text-xs ml-1">WPM</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="ui-label text-[10px]">WORDS</span>
              </div>
              <span className="font-reader text-lg text-foreground">{stats.totalWords.toLocaleString()}</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-4 h-4 text-primary" />
                <span className="ui-label text-[10px]">TIME</span>
              </div>
              <span className="font-reader text-lg text-foreground">{formatDuration(stats.totalTimeMs)}</span>
            </div>
          </div>
        )}
        
        {/* Session List */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="ui-label text-dust">[ NO RECORDED SCENARIOS ]</p>
              <p className="text-sm text-dust/60 mt-2 font-ui">Begin reading to create history</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="p-3 bg-surface border border-primary/10 rounded-none space-y-2"
              >
                <div className="flex items-start justify-between">
                  <p className="font-reader text-sm text-foreground line-clamp-1 flex-1">
                    {session.textPreview}
                  </p>
                  <span className="text-xs text-dust ml-2 whitespace-nowrap">
                    {formatDate(session.startTime)}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-dust">
                    <span className="text-primary">{session.wpm}</span> WPM
                  </span>
                  <span className="text-dust">
                    <span className="text-primary">{session.wordCount}</span> words
                  </span>
                  <span className="text-dust">
                    <span className="text-olive">{session.progress.toFixed(0)}%</span> cleared
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Clear Button */}
        {sessions.length > 0 && (
          <button
            onClick={onClearHistory}
            className="w-full flex items-center justify-center gap-2 py-2 border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors rounded-none"
          >
            <Trash2 className="w-4 h-4" />
            <span className="ui-label">[ PURGE HISTORY ]</span>
          </button>
        )}
      </div>
    </div>
  );
}
