interface StatusBarProps {
  progress: number;
  currentIndex: number;
  totalWords: number;
  estimatedTimeLeft?: string;
}

export function StatusBar({ progress, currentIndex, totalWords, estimatedTimeLeft }: StatusBarProps) {
  return (
    <div className="w-full space-y-2">
      {/* Progress Bar - Flat Olive Green with sharp edges */}
      <div className="relative h-3 bg-surface rounded-none overflow-hidden border border-primary/20">
        <div 
          className="absolute inset-y-0 left-0 bg-olive transition-all duration-100 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Stats Display */}
      <div className="flex justify-between ui-label">
        <span className="text-dust">
          WORD: <span className="text-foreground">{currentIndex + 1}</span>/{totalWords}
        </span>
        <span className="text-dust">
          [ SCENARIO CLEAR STATUS ]: <span className="text-olive">{progress.toFixed(1)}%</span>
        </span>
        {estimatedTimeLeft && (
          <span className="text-dust">
            [ TIME TO CLEAR ]: <span className="text-foreground">{estimatedTimeLeft}</span>
          </span>
        )}
      </div>
    </div>
  );
}
