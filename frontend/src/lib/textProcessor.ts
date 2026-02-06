export interface ProcessedWord {
  word: string;
  pivotIndex: number;
  prefix: string;
  pivotChar: string;
  suffix: string;
  delayModifier: number;
}

/**
 * Calculate the Optimal Recognition Point (ORP) for a word.
 * This is the letter the eye should focus on for fastest recognition.
 */
function calculatePivotIndex(word: string): number {
  const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
  const length = cleanWord.length;
  
  if (length <= 1) return 0;
  if (length <= 4) return 1;
  if (length <= 8) return 2;
  if (length <= 12) return 3;
  return 4;
}

/**
 * Calculate the delay modifier based on word characteristics.
 */
function calculateDelayModifier(word: string): number {
  let modifier = 1.0;
  const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
  
  // Punctuation modifiers
  if (word.endsWith(',') || word.endsWith(';') || word.endsWith(':')) {
    modifier *= 1.5;
  } else if (word.endsWith('.') || word.endsWith('!') || word.endsWith('?')) {
    modifier *= 2.2;
  }
  
  // Length modifiers
  if (cleanWord.length < 4) {
    modifier *= 0.8;
  } else if (cleanWord.length > 10) {
    modifier *= 1.3;
  }
  
  // Number modifier
  if (/\d/.test(word)) {
    modifier *= 1.5;
  }
  
  return modifier;
}

/**
 * Process raw text into an array of ProcessedWord objects.
 */
export function processText(rawText: string): ProcessedWord[] {
  // Split text by whitespace, filter empty strings
  const words = rawText
    .split(/\s+/)
    .filter(word => word.length > 0);
  
  return words.map(word => {
    const pivotIndex = calculatePivotIndex(word);
    
    return {
      word,
      pivotIndex,
      prefix: word.slice(0, pivotIndex),
      pivotChar: word[pivotIndex] || '',
      suffix: word.slice(pivotIndex + 1),
      delayModifier: calculateDelayModifier(word),
    };
  });
}

/**
 * Calculate the base delay for a given WPM.
 */
export function calculateBaseDelay(wpm: number): number {
  return 60000 / wpm;
}

/**
 * Get the actual delay for a word based on WPM and its modifier.
 */
export function getWordDelay(baseDelay: number, delayModifier: number): number {
  return baseDelay * delayModifier;
}
