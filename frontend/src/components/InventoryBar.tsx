import { Hourglass, Bookmark, Eye, BookmarkCheck } from 'lucide-react';

interface InventoryBarProps {
  onHistoryOpen: () => void;
  onBookmarkSave: () => void;
  onBookmarkLoad: () => number | null;
  onWarmupToggle: () => void;
  isWarmupActive: boolean;
  hasSavedBookmark: boolean;
  savedBookmarkIndex: number | null;
  currentIndex: number;
  totalWords: number;
}

export function InventoryBar({
  onHistoryOpen,
  onBookmarkSave,
  onBookmarkLoad,
  onWarmupToggle,
  isWarmupActive,
  hasSavedBookmark,
  savedBookmarkIndex,
  currentIndex,
  totalWords,
}: InventoryBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center pb-4 pointer-events-none">
      {/* Inventory Bar */}
      <div className="pointer-events-auto literary-panel rounded-none px-6 py-3 flex items-center gap-6">
        {/* Item 1: Hourglass - History */}
        <button
          onClick={onHistoryOpen}
          className="group flex flex-col items-center gap-1 transition-all duration-200"
          title="View History Log"
        >
          <div className="p-2 border border-primary/30 group-hover:border-primary/60 transition-colors rounded-none">
            <Hourglass className="w-5 h-5 text-primary group-hover:text-foreground transition-colors" />
          </div>
          <span className="ui-label text-[10px] text-dust group-hover:text-primary transition-colors">
            HISTORY
          </span>
        </button>
        
        {/* Item 2: Bookmark - Save/Load */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBookmarkSave}
            className="group flex flex-col items-center gap-1 transition-all duration-200"
            title="Save Bookmark"
          >
            <div className={`
              p-2 border transition-colors rounded-none
              ${hasSavedBookmark 
                ? 'border-olive bg-olive/10' 
                : 'border-primary/30 group-hover:border-primary/60'
              }
            `}>
              {hasSavedBookmark ? (
                <BookmarkCheck className="w-5 h-5 text-olive" />
              ) : (
                <Bookmark className="w-5 h-5 text-primary group-hover:text-foreground transition-colors" />
              )}
            </div>
            <span className="ui-label text-[10px] text-dust group-hover:text-primary transition-colors">
              SAVE
            </span>
          </button>
          
          {hasSavedBookmark && savedBookmarkIndex !== null && (
            <button
              onClick={onBookmarkLoad}
              className="group flex flex-col items-center gap-1 transition-all duration-200"
              title={`Load Bookmark (Word ${savedBookmarkIndex + 1})`}
            >
              <div className="p-2 border border-olive/50 group-hover:border-olive transition-colors rounded-none">
                <span className="font-reader text-xs text-olive">
                  {Math.round((savedBookmarkIndex / totalWords) * 100)}%
                </span>
              </div>
              <span className="ui-label text-[10px] text-olive">
                LOAD
              </span>
            </button>
          )}
        </div>
        
        {/* Item 3: Sage's Eye - Warmup Mode */}
        <button
          onClick={onWarmupToggle}
          className="group flex flex-col items-center gap-1 transition-all duration-200"
          title="Toggle Warmup Mode (Sage's Eye)"
        >
          <div className={`
            p-2 border transition-all duration-200 rounded-none
            ${isWarmupActive 
              ? 'border-olive bg-olive/20 animate-warmup-pulse' 
              : 'border-primary/30 group-hover:border-primary/60'
            }
          `}>
            <Eye className={`
              w-5 h-5 transition-colors
              ${isWarmupActive ? 'text-olive' : 'text-primary group-hover:text-foreground'}
            `} />
          </div>
          <span className={`
            ui-label text-[10px] transition-colors
            ${isWarmupActive ? 'text-olive' : 'text-dust group-hover:text-primary'}
          `}>
            SAGE'S EYE
          </span>
        </button>
      </div>
      
      {/* System Version Footer */}
      <div className="mt-3 pointer-events-none">
        <span className="ui-label text-[10px] text-dust/40">
          SYSTEM VERSION 1.0.4 // SCENARIO ACTIVE
        </span>
      </div>
    </div>
  );
}
