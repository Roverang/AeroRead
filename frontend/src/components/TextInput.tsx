import { useState } from 'react';
import { Zap } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { FileIngestion } from './FileIngestion';

interface TextInputProps {
  onActivate: (text: string) => void;
}

const SAMPLE_TEXT = `The moment I saw the message, I knew everything would change. In this world of scenarios and constellations, only the reader truly understands the story. Every word is a weapon, every sentence a blade. The demon king's true form was not what anyone expected. It was something far more terrifying: a mirror reflecting our deepest fears.

"Did you really think," the voice echoed, "that reading was passive? Every choice you make shapes reality itself."

This is the Fourth Wall. And you, dear reader, have always been the protagonist.`;

export function TextInput({ onActivate }: TextInputProps) {
  const [text, setText] = useState('');
  
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const handleTextFromFile = (loadedText: string) => {
    setText(loadedText);
  };

  const loadSample = () => {
    setText(SAMPLE_TEXT);
  };

  const handleActivate = () => {
    const textToUse = text.trim() || SAMPLE_TEXT;
    onActivate(textToUse);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* File Ingestion Zone */}
      <FileIngestion onTextLoad={handleTextFromFile} />
      
      {/* Or Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-primary/20" />
        <span className="ui-label text-dust">OR PASTE DIRECTLY</span>
        <div className="flex-1 h-px bg-primary/20" />
      </div>
      
      {/* Text Input Panel */}
      <div className="literary-panel rounded-none p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="ui-label text-primary">[ UPLOAD NARRATIVE ]</span>
          <button
            onClick={loadSample}
            className="ui-label text-dust hover:text-primary transition-colors"
          >
            [LOAD SAMPLE]
          </button>
        </div>
        
        {/* Textarea */}
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your text here to begin reading... or leave empty for sample scenario."
          className="min-h-[200px] bg-surface border-primary/30 focus:border-primary/60 rounded-none font-reader text-foreground placeholder:text-dust/50 resize-none"
        />
        
        {/* Stats */}
        <div className="flex justify-between ui-label text-dust/60">
          <span>
            WORDS: <span className="text-foreground">{wordCount}</span>
          </span>
          <span>
            CHARS: <span className="text-foreground">{text.length}</span>
          </span>
        </div>
        
        {/* Activate Button */}
        <button
          onClick={handleActivate}
          className="w-full py-4 rounded-none font-ui font-bold tracking-[0.2em] uppercase bg-olive border border-olive text-accent-foreground hover:bg-olive/80 flex items-center justify-center gap-3 transition-all duration-300"
        >
          <Zap className="w-5 h-5" />
          <span>[ ACTIVATE SCENARIO ]</span>
        </button>
        
        {/* Estimation */}
        {wordCount > 0 && (
          <div className="text-center">
            <span className="ui-label text-dust/60">
              Est. time at 400 WPM: {Math.ceil(wordCount / 400)} min
            </span>
          </div>
        )}
        
        <p className="text-center ui-label text-dust/40">
          LEAVE EMPTY TO LOAD DEMONSTRATION SCENARIO
        </p>
      </div>
    </div>
  );
}
