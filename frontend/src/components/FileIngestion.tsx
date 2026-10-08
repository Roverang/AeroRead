import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, BookOpen, File as LucideFile, X } from 'lucide-react';
import { toast } from 'sonner';
import { parseBookFile, ParsedChapter } from '@/lib/bookParser';

interface FileIngestionProps {
  onTextLoad: (text: string) => void;
}

export function FileIngestion({ onTextLoad }: FileIngestionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [chapters, setChapters] = useState<ParsedChapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const book = await parseBookFile(file);
      setFileName(file.name);
      setChapters(book.chapters.length > 1 ? book.chapters : []);
      setSelectedChapter(0);
      onTextLoad(book.chapters[0].text);
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error(error instanceof Error ? error.message : 'Error processing file. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [onTextLoad]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleChapterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const index = Number(e.target.value);
    setSelectedChapter(index);
    if (chapters[index]) onTextLoad(chapters[index].text);
  };

  const clearFile = () => {
    setFileName(null);
    setChapters([]);
    setSelectedChapter(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          drop-zone rounded-none p-6 cursor-pointer
          flex flex-col items-center justify-center gap-3
          transition-all duration-200
          ${isDragging ? 'drop-zone-active' : ''}
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.epub,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="flex items-center gap-3">
          <Upload className="w-5 h-5 text-primary" />
          <span className="ui-label">[ DATA INGESTION ]</span>
        </div>
        
        <p className="text-dust text-sm font-ui">
          Drop .TXT, .EPUB or .PDF file here, or click to browse
        </p>
        
        <div className="flex items-center gap-4 text-xs text-dust/60">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" /> TXT
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> EPUB
          </span>
          <span className="flex items-center gap-1">
            <LucideFile className="w-3 h-3" /> PDF
          </span>
        </div>
      </div>
      
      {/* File Info & Chapter Selector */}
      {fileName && (
        <div className="literary-panel rounded-none p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="ui-label text-primary">{fileName}</span>
            </div>
            <button
              onClick={clearFile}
              className="p-1 hover:bg-primary/10 transition-colors rounded-none"
            >
              <X className="w-4 h-4 text-dust hover:text-primary" />
            </button>
          </div>
          
          {chapters.length > 0 && (
            <div className="space-y-2">
              <label className="ui-label text-xs">[ SELECT CHAPTER ]</label>
              <select
                value={selectedChapter}
                onChange={handleChapterChange}
                className="w-full bg-surface border border-primary/30 rounded-none px-3 py-2 font-reader text-sm text-foreground focus:border-primary/60 focus:outline-none"
              >
                {chapters.map((chapter, index) => (
                  <option key={index} value={index}>
                    {chapter.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
      
      {isLoading && (
        <div className="text-center py-2">
          <span className="ui-label text-dust animate-pulse-soft">[ LOADING SCENARIO DATA... ]</span>
        </div>
      )}
    </div>
  );
}
