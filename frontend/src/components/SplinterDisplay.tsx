import { ProcessedWord } from '@/lib/textProcessor';
import { ChunkData } from '@/hooks/useAeroEngine';

interface SplinterDisplayProps {
  word: ProcessedWord | null;
  chunk?: ChunkData | null;
}

export function SplinterDisplay({ word, chunk }: SplinterDisplayProps) {
  // --- CHUNK MODE (2+ words) ---
  // Renders plain, centered text for high-speed scanning
  if (chunk && chunk.isChunked) {
    return (
      <div className="flex items-center justify-center h-full select-none">
        <span className="text-4xl md:text-5xl lg:text-6xl font-reader font-normal tracking-tight text-foreground leading-none">
          {chunk.displayText}
        </span>
      </div>
    );
  }

  // --- EMPTY STATE ---
  if (!word) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-dust/30 text-xl tracking-[0.3em] font-mono uppercase">
          [ AWAITING_NARRATIVE ]
        </span>
      </div>
    );
  }

  // --- SINGLE WORD MODE (The ORP Splinter) ---
  // Logic: The Pivot character is fixed at a central point to minimize eye movement.
  return (
    <div className="flex items-center justify-center h-full select-none overflow-hidden">
      <div className="relative flex items-baseline text-5xl md:text-6xl lg:text-7xl font-reader font-normal tracking-tight leading-none">
        
        {/* Left Span (Prefix) - Flat Dust */}
        <div 
          className="text-dust/60 text-right pr-[0.1ch]"
          style={{ 
            width: '45vw', 
            whiteSpace: 'nowrap',
            overflow: 'hidden'
          }}
        >
          {word.prefix}
        </div>
        
        {/* Pivot Character - Flat Crimson (#FF2E63) - NO GLOW */}
        <div 
          className="text-[#FF2E63] font-bold text-center"
          style={{ 
            width: '1.2ch',
            // Ensuring the character is perfectly balanced
            transform: 'translateX(-5%)' 
          }}
        >
          {word.pivotChar}
        </div>
        
        {/* Right Span (Suffix) - Flat Dust */}
        <div 
          className="text-dust/60 text-left pl-[0.1ch]"
          style={{ 
            width: '45vw', 
            whiteSpace: 'nowrap',
            overflow: 'hidden'
          }}
        >
          {word.suffix}
        </div>

      </div>
    </div>
  );
}