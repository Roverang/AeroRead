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
  const adjustWpm = (delta: number) => {
    const newWpm = Math.max(200, Math.min(1000, wpm + delta));
    onWpmChange(newWpm);
  };

  return (
    <div className="literary-panel rounded-none p-4 space-y-4">
      {/* WPM Control */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="ui-label text-primary">[ SYNC RATE ]</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustWpm(-50)}
              className="p-1 border border-primary/30 hover:border-primary/60 transition-colors rounded-none"
            >
              <Minus className="w-3 h-3 text-primary" />
            </button>
            <span className="font-reader text-xl text-foreground min-w-[4ch] text-center">
              {wpm}
            </span>
            <button
              onClick={() => adjustWpm(50)}
              className="p-1 border border-primary/30 hover:border-primary/60 transition-colors rounded-none"
            >
              <Plus className="w-3 h-3 text-primary" />
            </button>
          </div>
        </div>
        
        <Slider
          value={[wpm]}
          onValueChange={(value) => onWpmChange(value[0])}
          min={200}
          max={1000}
          step={25}
          className="w-full"
        />
        
        <div className="flex justify-between text-xs text-dust font-ui">
          <span>200</span>
          <span>600</span>
          <span>1000</span>
        </div>
      </div>

      {/* Chunk Size Control */}
      <div className="flex items-center justify-between">
        <span className="ui-label text-primary">[ CHUNK MODE ]</span>
        <div className="flex items-center gap-1">
          {([1, 2, 3] as const).map((size) => (
            <button
              key={size}
              onClick={() => onChunkSizeChange(size)}
              className={`
                px-3 py-1 font-ui text-xs uppercase tracking-wider
                border rounded-none transition-all duration-200
                ${chunkSize === size
                  ? 'bg-olive border-olive text-accent-foreground'
                  : 'border-primary/30 text-primary hover:border-primary/60'
                }
              `}
            >
              {size}W
            </button>
          ))}
        </div>
      </div>
      
      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onRewind}
          className="p-3 literary-panel rounded-none hover:literary-panel-active transition-all duration-200"
          title="Rewind 10 words (←)"
        >
          <RotateCcw className="w-5 h-5 text-primary" />
        </button>
        
        <button
          onClick={onToggle}
          className="p-4 bg-olive border border-olive hover:bg-olive/80 transition-all duration-200 rounded-none"
          title="Play/Pause (Space)"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-accent-foreground" />
          ) : (
            <Play className="w-6 h-6 text-accent-foreground" />
          )}
        </button>
        
        <button
          onClick={onReset}
          className="p-3 literary-panel rounded-none hover:literary-panel-active transition-all duration-200"
          title="Reset"
        >
          <RefreshCw className="w-5 h-5 text-primary" />
        </button>
      </div>
      
      {/* Keyboard Hints */}
      <div className="flex justify-center gap-6 text-xs text-dust/60 font-ui">
        <span>SPACE: Play/Pause</span>
        <span>←: Rewind</span>
        <span>ESC: Exit</span>
      </div>
    </div>
  );
}
