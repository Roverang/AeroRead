export interface ProcessedWord {
  word: string;
  pivotIndex: number;
  prefix: string;
  pivotChar: string;
  suffix: string;
  delayModifier: number;
}

/**
 * Calculate the Optimal Recognition Point (ORP).
 * Based on eye-tracking research: the brain processes words fastest when 
 * focusing slightly to the left of the center.
 */
function calculatePivotIndex(word: string): number {
  // We use the full length including punctuation for the visual center
  const length = word.length;
  
  if (length <= 1) return 0;
  if (length <= 4) return 1;
  if (length <= 8) return 2;
  if (length <= 12) return 3;
  return 4;
}

/**
 * Calculate the delay modifier (The "Cognitive Load").
 * This ensures the engine 'breathes'—slowing down for complex 
 * concepts and speeding up for filler words.
 */
function calculateDelayModifier(word: string): number {
  let modifier = 1.0;
  const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
  
  // 1. Punctuation Modifiers (The most critical for 'flow')
  if (word.endsWith('.') || word.endsWith('!') || word.endsWith('?')) {
    // Sentence ends require a significant pause (2.2x base)
    modifier *= 2.2;
  } else if (word.endsWith(',') || word.endsWith(';') || word.endsWith(':') || word.endsWith('—')) {
    // Clauses require a moderate pause (1.5x base)
    modifier *= 1.5;
  } else if (word.endsWith('"') || word.endsWith("'")) {
    // Dialogue tags
    modifier *= 1.2;
  }
  
  // 2. Length Modifiers (The "Complexity" load)
  if (cleanWord.length <= 2) {
    // Short filler words (a, in, of) are processed instantly
    modifier *= 0.75;
  } else if (cleanWord.length > 10) {
    // Long words require more 'shredding' time
    modifier *= 1.35;
  } else if (cleanWord.length > 15) {
    // Technical/Complex terms
    modifier *= 1.6;
  }
  
  // 3. Numeric Modifiers
  if (/\d/.test(word)) {
    // Digits require literal reading, not just pattern recognition
    modifier *= 1.5;
  }

  // 4. Special Case: All Caps (The "Emphasis" load)
  if (cleanWord.length > 1 && cleanWord === cleanWord.toUpperCase()) {
    modifier *= 1.2;
  }
  
  return modifier;
}

/**
 * Process raw text into high-precision word objects.
 */
export function processText(rawText: string): ProcessedWord[] {
  if (!rawText) return [];

  // Split by whitespace and filter out ghost strings
  const words = rawText
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0);
  
  return words.map(word => {
    const pivotIndex = calculatePivotIndex(word);
    
    // Safety check for empty or broken strings
    const pivotChar = word[pivotIndex] || '';
    
    return {
      word,
      pivotIndex,
      prefix: word.slice(0, pivotIndex),
      pivotChar: pivotChar,
      suffix: word.slice(pivotIndex + 1),
      delayModifier: calculateDelayModifier(word),
    };
  });
}

/**
 * Calculate base delay (ms) for a target WPM.
 */
export function calculateBaseDelay(wpm: number): number {
  if (wpm <= 0) return 300; // Safety fallback
  return 60000 / wpm;
}

/**
 * Computes final duration for a specific word.
 * Formula: Base (WPM) * Modifier (Complexity)
 */
export function getWordDelay(baseDelay: number, delayModifier: number): number {
  return baseDelay * delayModifier;
}

/**
 * Utility: Join processed words back into text 
 * (Used for History or context-aware features)
 */
export function reconstructText(words: ProcessedWord[]): string {
  return words.map(w => w.word).join(' ');
}