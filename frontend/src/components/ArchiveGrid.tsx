import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Trash2, FileText, Book } from 'lucide-react';
import { Narrative, getAllNarratives, deleteNarrative, getOverallProgress } from '@/services/archiveService';
import { FileUploader } from './FileUploader';
import { Progress } from '@/components/ui/progress';

interface ArchiveGridProps {
  onNarrativeSelect: (narrative: Narrative) => void;
  /** True while a selected narrative is being loaded. */
  isOpening?: boolean;
}

export function ArchiveGrid({ onNarrativeSelect, isOpening = false }: ArchiveGridProps) {
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNarratives = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAllNarratives();
      setNarratives(data);
    } catch (error) {
      console.error('System Error: Failed to load narratives from archive.', error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadNarratives();
  }, [loadNarratives]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("[ SYSTEM NOTICE ]: Permanently delete this narrative scenario?")) {
      await deleteNarrative(id);
      loadNarratives();
    }
  };


  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'epub': return <Book className="w-3 h-3" />;
      case 'pdf': return <FileText className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'UNKNOWN';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="ui-label text-2xl text-primary mb-2">[ THE ARCHIVE ]</h1>
        <p className="text-dust text-sm font-ui">Your collected narratives and scenarios</p>
      </div>

      <FileUploader onUploadComplete={loadNarratives} />

      {isLoading ? (
        <div className="text-center py-12">
          <span className="ui-label text-dust animate-pulse-soft">[ SYNCHRONIZING WITH ARCHIVE... ]</span>
        </div>
      ) : narratives.length === 0 ? (
        <div className="text-center py-16 literary-panel rounded-none">
          <BookOpen className="w-12 h-12 text-dust/50 mx-auto mb-4" />
          <p className="ui-label text-dust">[ NO NARRATIVES FOUND ]</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {narratives.map((narrative) => {
            const safeTotal = narrative.totalWords || 0;
            const progress = getOverallProgress(narrative);
            const chapterCount = narrative.chapterCount ?? 0;

            return (
              <div
                key={narrative.id}
                role="button"
                tabIndex={0}
                aria-disabled={isOpening}
                onClick={() => !isOpening && onNarrativeSelect(narrative)}
                onKeyDown={(e) => {
                  if (!isOpening && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onNarrativeSelect(narrative);
                  }
                }}
                className={`group literary-panel rounded-none p-4 cursor-pointer hover:literary-panel-active focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary transition-all duration-200 flex flex-col min-h-[180px] ${isOpening ? 'cursor-wait opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-ui uppercase tracking-wider border rounded-none bg-olive/20 text-olive border-olive/30">
                    {getTypeIcon(narrative.type)}
                    {narrative.type}
                  </span>
                  
                  <button
                    onClick={(e) => handleDelete(e, narrative.id)}
                    onKeyDown={(e) => e.stopPropagation()}
                    aria-label={`Delete ${narrative.title}`}
                    className="md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 p-1 hover:bg-destructive/20 transition-all rounded-none"
                  >
                    <Trash2 className="w-3 h-3 text-dust hover:text-destructive" />
                  </button>
                </div>

                <h3 className="ui-label text-primary text-sm line-clamp-2 mb-1">
                  {narrative.title}
                </h3>
                <p className="text-[10px] font-ui text-dust uppercase truncate flex-1 mb-3">
                  {narrative.author && narrative.author !== 'Unknown Author' ? narrative.author : '\u00a0'}
                </p>

                <div className="space-y-2 mt-auto">
                  <div className="flex items-center justify-between text-[10px] font-ui text-dust">
                    <span>
                      {safeTotal.toLocaleString()} WORDS
                      {chapterCount > 1 && ` · ${chapterCount} CH`}
                    </span>
                    <span>{formatDate(narrative.dateAdded)}</span>
                  </div>
                  
                  <div className="space-y-1">
                    <Progress 
                      value={progress} 
                      className="h-1.5 bg-surface rounded-none"
                    />
                    <div className="flex items-center justify-between text-[10px] font-ui">
                      <span className="text-dust">[ CLEAR STATUS ]</span>
                      <span className="text-olive">{Math.round(progress)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}