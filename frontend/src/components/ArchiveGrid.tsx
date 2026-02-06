import { useState, useEffect } from 'react';
import { BookOpen, Trash2, FileText, Book } from 'lucide-react';
import { Narrative, getAllNarratives, deleteNarrative } from '@/services/archiveService';
import { FileUploader } from './FileUploader';
import { Progress } from '@/components/ui/progress';

interface ArchiveGridProps {
  onNarrativeSelect: (narrative: Narrative) => void;
  onNarrativeAdded: () => void;
}

export function ArchiveGrid({ onNarrativeSelect, onNarrativeAdded }: ArchiveGridProps) {
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNarratives = async () => {
    setIsLoading(true);
    try {
      const data = await getAllNarratives();
      setNarratives(data);
    } catch (error) {
      console.error('System Error: Failed to load narratives from archive.', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadNarratives();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("[ SYSTEM NOTICE ]: Permenantly delete this narrative scenario?")) {
      await deleteNarrative(id);
      loadNarratives();
    }
  };

  const handleUploadComplete = () => {
    loadNarratives();
    onNarrativeAdded();
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

      <FileUploader onUploadComplete={handleUploadComplete} />

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
            // DEFENSIVE MATH: Ensure totalWords is never 0 or undefined
            const safeTotal = narrative.totalWords || 0;
            const safeProgressIdx = narrative.progressIndex || 0;
            const progress = safeTotal > 0 ? (safeProgressIdx / safeTotal) * 100 : 0;
            
            return (
              <div
                key={narrative.id}
                onClick={() => onNarrativeSelect(narrative)}
                className="group literary-panel rounded-none p-4 cursor-pointer hover:literary-panel-active transition-all duration-200 flex flex-col min-h-[180px]"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-ui uppercase tracking-wider border rounded-none bg-olive/20 text-olive border-olive/30">
                    {getTypeIcon(narrative.type)}
                    {narrative.type}
                  </span>
                  
                  <button
                    onClick={(e) => handleDelete(e, narrative.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 transition-all rounded-none"
                  >
                    <Trash2 className="w-3 h-3 text-dust hover:text-destructive" />
                  </button>
                </div>

                <h3 className="ui-label text-primary text-sm line-clamp-2 flex-1 mb-3">
                  {narrative.title}
                </h3>

                <div className="space-y-2 mt-auto">
                  <div className="flex items-center justify-between text-[10px] font-ui text-dust">
                    {/* DEFENSIVE STRING: Fallback to 0 if totalWords is missing */}
                    <span>{(safeTotal).toLocaleString()} WORDS</span>
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