import { ProcessedWord } from '@/lib/textProcessor';
import { ChunkData } from '@/hooks/useAeroEngine';

interface SplinterDisplayProps {
  word: ProcessedWord | null;
  chunk?: ChunkData | null;
}

export function SplinterDisplay({ word, chunk }: SplinterDisplayProps) {
  // If chunk mode (2+ words), render plain centered text
  if (chunk && chunk.isChunked) {
    return (
      <div className="flex items-center justify-center h-full select-none">
        <span className="text-4xl md:text-6xl lg:text-7xl font-reader font-normal tracking-tight text-foreground">
          {chunk.displayText}
        </span>
      </div>
    );
  }

  // Single word mode: use Splinter layout with ORP
  if (!word) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-dust/50 text-2xl tracking-wider font-reader ui-text">
          [ AWAITING NARRATIVE ]
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full select-none">
      <div className="flex items-baseline text-4xl md:text-6xl lg:text-7xl font-reader font-normal tracking-tight">
        {/* Left Span - Prefix */}
        <span 
          className="text-dust/70 text-right"
          style={{ width: '50%', minWidth: '3ch' }}
        >
          {word.prefix}
        </span>
        
        {/* Pivot Span - The focal point (Neon Red #FF2E63) */}
        <span 
          className="text-pivot font-bold pivot-glow"
          style={{ width: '1ch', textAlign: 'center' }}
        >
          {word.pivotChar}
        </span>
        
        {/* Right Span - Suffix */}
        <span 
          className="text-dust/70 text-left"
          style={{ width: '50%', minWidth: '3ch' }}
        >
          {word.suffix}
        </span>
      </div>
    </div>
  );
}
