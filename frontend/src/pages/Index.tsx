import { useState, useCallback } from 'react';
import { Gauge, Brain, BookOpen, Archive as ArchiveIcon } from 'lucide-react';
import { TextInput } from '@/components/TextInput';
import { ReaderView } from '@/components/ReaderView';
import { Navbar } from '@/components/Navbar';
import { FourthWallIntro } from '@/components/FourthWallIntro';
import { ArchiveGrid } from '@/components/ArchiveGrid';
import { SonicModule } from '@/components/SonicModule';
import { processText, ProcessedWord } from '@/lib/textProcessor';
import { Narrative, updateProgress } from '@/services/archiveService';
import { useStealthMode } from '@/hooks/useStealthMode';

type ViewMode = 'intro' | 'archive' | 'input' | 'reader';

const Index = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('intro');
  const [words, setWords] = useState<ProcessedWord[]>([]);
  const [rawText, setRawText] = useState('');
  const [wpm, setWpm] = useState(400);
  const [currentNarrativeId, setCurrentNarrativeId] = useState<string | null>(null);
  const [startIndex, setStartIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const { isStealthActive } = useStealthMode({ isPlaying });

  const handleShatter = () => {
    setViewMode('archive');
  };

  const handleActivate = (text: string) => {
    const processedWords = processText(text);
    if (processedWords.length > 0) {
      setWords(processedWords);
      setRawText(text);
      setStartIndex(0);
      setCurrentNarrativeId(null);
      setViewMode('reader');
    }
  };

  const handleNarrativeSelect = (narrative: Narrative) => {
    const processedWords = processText(narrative.content);
    if (processedWords.length > 0) {
      setWords(processedWords);
      setRawText(narrative.content);
      setStartIndex(narrative.progressIndex);
      setCurrentNarrativeId(narrative.id);
      setViewMode('reader');
    }
  };

  const handleExit = useCallback(async (currentIndex?: number) => {
    // Save progress if reading from archive
    if (currentNarrativeId && currentIndex !== undefined) {
      await updateProgress(currentNarrativeId, currentIndex);
    }
    setIsPlaying(false);
    setViewMode('archive');
  }, [currentNarrativeId]);

  const handlePlayStateChange = (playing: boolean) => {
    setIsPlaying(playing);
  };

  const handleViewSwitch = (view: 'archive' | 'input') => {
    setViewMode(view);
  };

  // Fourth Wall Intro
  if (viewMode === 'intro') {
    return <FourthWallIntro onShatter={handleShatter} />;
  }

  // Reader Mode
  if (viewMode === 'reader') {
    return (
      <>
        <ReaderView
          words={words}
          wpm={wpm}
          onWpmChange={setWpm}
          onExit={handleExit}
          rawText={rawText}
          initialIndex={startIndex}
          onPlayStateChange={handlePlayStateChange}
        />
        <SonicModule isStealthActive={isStealthActive} />
      </>
    );
  }

  // Archive or Input Mode
  return (
    <div className="min-h-screen bg-background relative">
      {/* Navbar with View Switcher */}
      <Navbar 
        currentView={viewMode as 'archive' | 'input'} 
        onViewSwitch={handleViewSwitch} 
      />
      
      <main className="pt-16 pb-32">
        {viewMode === 'archive' ? (
          <ArchiveGrid 
            onNarrativeSelect={handleNarrativeSelect}
            onNarrativeAdded={() => {}}
          />
        ) : (
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Header */}
            <header className="text-center mb-12 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 literary-panel rounded-none mb-6">
                <span className="ui-label text-primary">
                  NEURAL READING SYSTEM v2.0
                </span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-ui font-bold tracking-tight mb-4">
                <span className="text-foreground">AERO</span>
                <span className="text-primary">READ</span>
              </h1>
              
              <p className="text-dust font-ui text-lg max-w-xl mx-auto">
                High-performance RSVP speed reading with adaptive cognitive load balancing.
              </p>
              <p className="text-primary/60 ui-label mt-2">
                TRANSCEND THE LIMITS OF LINEAR PERCEPTION.
              </p>
            </header>
            
            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
              <FeatureCard
                icon={<Gauge className="w-5 h-5" />}
                title="600+ WPM"
                description="Dynamic timing adapts to word complexity"
              />
              <FeatureCard
                icon={<Brain className="w-5 h-5" />}
                title="COGNITIVE LOAD"
                description="Smart pauses at punctuation and long words"
              />
              <FeatureCard
                icon={<BookOpen className="w-5 h-5" />}
                title="ORP FOCUS"
                description="Optimal recognition point highlighting"
              />
            </div>
            
            {/* Text Input Panel */}
            <TextInput onActivate={handleActivate} />
            
            {/* Footer */}
            <footer className="mt-12 text-center">
              <p className="ui-label text-dust/30">
                "THE WORDS ARE BUT A VESSEL. THE READER GIVES THEM MEANING." — THE FOURTH WALL PROTOCOL
              </p>
            </footer>
          </div>
        )}
      </main>

      {/* Persistent Sonic Module */}
      <SonicModule isStealthActive={false} />
      
      {/* Fixed Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-sm border-t border-primary/30 py-3">
        <div className="container mx-auto px-4 text-center">
          <p className="ui-label text-dust/40 text-[10px]">
            SYSTEM VERSION 2.0.4 // SCENARIO ACTIVE
          </p>
        </div>
      </footer>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="literary-panel rounded-none p-4 text-center hover:literary-panel-active transition-all duration-300">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-none bg-olive/10 text-primary mb-3 border border-primary/20">
        {icon}
      </div>
      <h3 className="ui-text text-sm text-foreground mb-1">{title}</h3>
      <p className="font-ui text-xs text-dust">{description}</p>
    </div>
  );
}

export default Index;
