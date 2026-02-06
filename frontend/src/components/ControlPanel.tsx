import { Play, Pause, RotateCcw, RefreshCw, Minus, Plus } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface ControlPanelProps {
  wpm: number;
  onWpmChange: (wpm: number) => void;
  isPlaying: boolean;
  onToggle: () => void;
  onRewind: () => void;
  onReset: () => void;
  chunkSize: 1 | 2 | 3;
  onChunkSizeChange: (size: 1 | 2 | 3) => void;
}

export function ControlPanel({
  wpm,
  onWpmChange,
  isPlaying,
  onToggle,
  onRewind,
  onReset,
  chunkSize,
  onChunkSizeChange,
}: ControlPanelProps) {
  
  // FIXED: Precise WPM adjustment to ensure the engine re-calculates delay
  const adjustWpm = (delta: number) => {
    const newWpm = Math.max(100, Math.min(1500, wpm + delta));
    onWpmChange(newWpm);
  };

  return (
    <div className="literary-panel rounded-none p-6 space-y-6">
      {/* SYNC RATE - The Core Engine Speed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="ui-label text-primary text-[10px] tracking-widest">[ SYNC RATE ]</span>
            <span className="text-[9px] text-dust font-ui">WORDS PER MINUTE</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => adjustWpm(-50)}
              className="w-8 h-8 flex items-center justify-center border border-primary/30 hover:border-primary text-primary transition-all"
            >
              <Minus className="w-3 h-3" />
            </button>
            
            <div className="w-20 text-center">
              <span className="font-reader text-2xl text-foreground tabular-nums">
                {wpm}
              </span>
            </div>
            
            <button
              onClick={() => adjustWpm(50)}
              className="w-8 h-8 flex items-center justify-center border border-primary/30 hover:border-primary text-primary transition-all"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        <Slider
          value={[wpm]}
          onValueChange={(value) => onWpmChange(value[0])}
          min={100}
          max={1500}
          step={10}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-6 pt-2">
        {/* CHUNK MODE */}
        <div className="flex flex-col gap-2">
          <span className="ui-label text-primary text-[10px]">[ CHUNK MODE ]</span>
          <div className="flex items-center gap-1">
            {([1, 2, 3] as const).map((size) => (
              <button
                key={size}
                onClick={() => onChunkSizeChange(size)}
                className={`
                  flex-1 py-1.5 font-ui text-[10px] uppercase tracking-tighter
                  border rounded-none transition-all duration-200
                  ${chunkSize === size
                    ? 'bg-primary border-primary text-background font-bold'
                    : 'border-primary/20 text-dust hover:border-primary/40'
                  }
                `}
              >
                {size} WORD{size > 1 ? 'S' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* PLAYBACK ACTION */}
        <div className="flex flex-col gap-2">
          <span className="ui-label text-primary text-[10px]">[ DATA STREAM ]</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onRewind}
              className="flex-1 h-8 flex items-center justify-center border border-primary/20 hover:border-primary text-primary transition-all"
              title="Rewind (←)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            
            <button
              onClick={onToggle}
              className="flex-[2] h-8 flex items-center justify-center bg-primary border border-primary hover:bg-primary/90 transition-all text-background"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
            
            <button
              onClick={onReset}
              className="flex-1 h-8 flex items-center justify-center border border-primary/20 hover:border-primary text-primary transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* KEYBOARD SHORTCUTS */}
      <div className="flex justify-center gap-8 text-[9px] text-dust/40 font-ui uppercase tracking-widest border-t border-primary/5 pt-4">
        <span>Space: Toggle</span>
        <span>Left: Rewind</span>
        <span>Esc: Exit</span>
      </div>
    </div>
  );
}