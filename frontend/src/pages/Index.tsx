import { useState, useCallback } from 'react';
import { Gauge, Brain, BookOpen } from 'lucide-react';
import { TextInput } from '@/components/TextInput';
import { ReaderView } from '@/components/ReaderView';
import { Navbar } from '@/components/Navbar';
import { FourthWallIntro } from '@/components/FourthWallIntro';
import { ArchiveGrid } from '@/components/ArchiveGrid';
import { SonicModule } from '@/components/SonicModule';
import { processText, ProcessedWord } from '@/lib/textProcessor';
import { Narrative, getChapter, updateProgress } from '@/services/archiveService';
import { useStealthMode } from '@/hooks/useStealthMode';
import { toast } from 'sonner';

type ViewMode = 'intro' | 'archive' | 'input' | 'reader';

const Index = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('intro');
  const [words, setWords] = useState<ProcessedWord[]>([]);
  const [rawText, setRawText] = useState('');
  const [wpm, setWpm] = useState(400);
  const [currentNarrativeId, setCurrentNarrativeId] = useState<string | null>(null);
  const [startIndex, setStartIndex] = useState(0);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { isStealthActive } = useStealthMode({ isPlaying });

  const handleShatter = () => {
    setViewMode('archive');
  };

  /**
   * MANIFESTATION: Raw Text Input
   */
  const handleActivate = (text: string) => {
    const processedWords = processText(text);
    if (processedWords.length > 0) {
      setWords(processedWords);
      setRawText(text);
      setStartIndex(0);
      setCurrentNarrativeId(null);
      setCurrentChapterIndex(0);
      setViewMode('reader');
    }
  };

  /**
   * SYNCHRONIZATION: Load Narrative from Archive
   * Pulls the saved state from IndexedDB and the word-stream from MongoDB.
   */
  const handleNarrativeSelect = async (narrative: Narrative) => {
    setIsSyncing(true);
    try {
      const chapterIdx = narrative.chapterIndex || 0;
      
      // 1. Synchronize with Backend Shredder
      const data = await getChapter(narrative.id, chapterIdx);
      
      if (data && data.content) {
        // 2. Feed to Cognitive Engine
        const processedWords = processText(data.content.join(' '));
        
        setWords(processedWords);
        setRawText(narrative.title);
        setStartIndex(narrative.progressIndex);
        setCurrentNarrativeId(narrative.id);
        setCurrentChapterIndex(chapterIdx);
        setViewMode('reader');
        
        toast.success(`[ SYNC COMPLETE ]: ${narrative.title.toUpperCase()}`);
      }
    } catch (error) {
      console.error("[ SYSTEM ERROR ]: Synchronization failed.", error);
      toast.error("FAIL: Could not load archive stream.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExit = useCallback(async (currentIndex?: number, chapterIndex?: number) => {
    // Save final progress coordinates
    if (currentNarrativeId && currentIndex !== undefined) {
      await updateProgress(currentNarrativeId, currentIndex, chapterIndex || 0);
    }
    setViewMode('archive');
  }, [currentNarrativeId]);

  const handlePlayStateChange = (playing: boolean) => {
    setIsPlaying(playing);
  };

  const handleViewSwitch = (view: 'archive' | 'input') => {
    setViewMode(view);
  };

  // --- INTRO LAYER ---
  if (viewMode === 'intro') {
    return <FourthWallIntro onShatter={handleShatter} />;
  }

  // --- MAIN SYSTEM LAYOUT ---
  return (
    <div className="min-h-screen bg-background relative flex flex-col font-mono selection:bg-primary/30">
      
      {/* 1. PERSISTENT LAYER: Sonic Module (Music keeps playing) */}
      <SonicModule isStealthActive={viewMode === 'reader' && isStealthActive} />

      {/* 2. DYNAMIC CONTENT LAYER */}
      {viewMode === 'reader' ? (
        <ReaderView
          storyId={currentNarrativeId || "temp-session"}
          initialWords={words}
          wpm={wpm}
          onWpmChange={setWpm}
          onExit={handleExit}
          rawText={rawText}
          initialIndex={startIndex}
          initialChapterIndex={currentChapterIndex}
          onPlayStateChange={handlePlayStateChange}
        />
      ) : (
        <>
          <Navbar 
            currentView={viewMode as 'archive' | 'input'} 
            onViewSwitch={handleViewSwitch} 
          />
          
          <main className="flex-1 pt-16 pb-32 animate-in fade-in duration-500">
            {viewMode === 'archive' ? (
              <ArchiveGrid 
                onNarrativeSelect={handleNarrativeSelect}
                onNarrativeAdded={() => {}}
              />
            ) : (
              <div className="container mx-auto px-4 py-8 max-w-4xl">
                <header className="text-center mb-12">
                  <div className="inline-flex items-center gap-2 px-4 py-2 literary-panel rounded-none mb-6">
                    <span className="ui-label text-primary">
                      NEURAL READING SYSTEM v2.0 // CONNECTED
                    </span>
                  </div>
                  
                  <h1 className="text-5xl md:text-7xl font-ui font-bold tracking-tighter mb-4 uppercase">
                    <span className="text-foreground">AERO</span>
                    <span className="text-primary">READ</span>
                  </h1>
                  
                  <p className="text-dust font-ui text-lg max-w-xl mx-auto uppercase tracking-wide opacity-80">
                    High-performance RSVP streaming with adaptive cognitive load balancing.
                  </p>
                </header>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                  <FeatureCard
                    icon={<Gauge className="w-5 h-5" />}
                    title="SYNCHRO RATE"
                    description="Adaptive WPM based on neural complexity"
                  />
                  <FeatureCard
                    icon={<Brain className="w-5 h-5" />}
                    title="COGNITIVE SHRED"
                    description="Intelligent pauses at punctuation anchors"
                  />
                  <FeatureCard
                    icon={<BookOpen className="w-5 h-5" />}
                    title="ORP ANCHOR"
                    description="Optimal recognition focus highlighting"
                  />
                </div>
                
                <TextInput onActivate={handleActivate} />
                
                <footer className="mt-12 text-center">
                  <p className="ui-label text-dust/20 text-[10px] tracking-[0.5em]">
                    "THE WORDS ARE BUT A VESSEL. THE READER GIVES THEM MEANING."
                  </p>
                </footer>
              </div>
            )}
          </main>

          <footer className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-md border-t border-primary/20 py-3">
            <div className="container mx-auto px-4 flex justify-between items-center">
              <p className="ui-label text-dust/40 text-[9px] tracking-widest">
                SYSTEM_ID: OMNISCIENT_V2 // Mumbai_Cluster_Active
              </p>
              {isSyncing && (
                <p className="ui-label text-primary text-[9px] animate-pulse">
                  [ STREAMING_DATA... ]
                </p>
              )}
            </div>
          </footer>
        </>
      )}
    </div>
  );
};

// --- HELPER: FeatureCard ---
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="literary-panel rounded-none p-5 text-center hover:literary-panel-active transition-all duration-300 group">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-none bg-primary/5 text-primary mb-4 border border-primary/20 group-hover:border-primary transition-colors">
        {icon}
      </div>
      <h3 className="ui-label text-xs text-foreground mb-2 tracking-widest">{title}</h3>
      <p className="font-ui text-[10px] text-dust uppercase leading-relaxed">{description}</p>
    </div>
  );
}

export default Index;