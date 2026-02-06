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
      console.error('Failed to load narratives:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadNarratives();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteNarrative(id);
    loadNarratives();
  };

  const handleUploadComplete = () => {
    loadNarratives();
    onNarrativeAdded();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'epub':
        return <Book className="w-3 h-3" />;
      case 'pdf':
        return <FileText className="w-3 h-3" />;
      default:
        return <FileText className="w-3 h-3" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    return 'bg-olive/20 text-olive border-olive/30';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="ui-label text-2xl text-primary mb-2">[ THE ARCHIVE ]</h1>
        <p className="text-dust text-sm font-ui">Your collected narratives and scenarios</p>
      </div>

      {/* File Uploader */}
      <FileUploader onUploadComplete={handleUploadComplete} />

      {/* Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <span className="ui-label text-dust animate-pulse-soft">[ LOADING ARCHIVE... ]</span>
        </div>
      ) : narratives.length === 0 ? (
        <div className="text-center py-16 literary-panel rounded-none">
          <BookOpen className="w-12 h-12 text-dust/50 mx-auto mb-4" />
          <p className="ui-label text-dust">[ NO NARRATIVES FOUND ]</p>
          <p className="text-dust/60 text-sm font-ui mt-2">
            Drop a file above to begin your journey
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {narratives.map((narrative) => {
            const progress = narrative.totalWords > 0 
              ? (narrative.progressIndex / narrative.totalWords) * 100 
              : 0;
            
            return (
              <div
                key={narrative.id}
                onClick={() => onNarrativeSelect(narrative)}
                className="group literary-panel rounded-none p-4 cursor-pointer hover:literary-panel-active transition-all duration-200 flex flex-col min-h-[180px]"
              >
                {/* Type Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-ui uppercase tracking-wider border rounded-none ${getTypeBadgeColor(narrative.type)}`}>
                    {getTypeIcon(narrative.type)}
                    {narrative.type}
                  </span>
                  
                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDelete(e, narrative.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 transition-all rounded-none"
                  >
                    <Trash2 className="w-3 h-3 text-dust hover:text-destructive" />
                  </button>
                </div>

                {/* Title */}
                <h3 className="ui-label text-primary text-sm line-clamp-2 flex-1 mb-3">
                  {narrative.title}
                </h3>

                {/* Stats */}
                <div className="space-y-2 mt-auto">
                  <div className="flex items-center justify-between text-[10px] font-ui text-dust">
                    <span>{narrative.totalWords.toLocaleString()} WORDS</span>
                    <span>{formatDate(narrative.dateAdded)}</span>
                  </div>
                  
                  {/* Progress Bar */}
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
