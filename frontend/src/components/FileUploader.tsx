import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, BookOpen, File as LucideFile, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { parseBookFile } from '@/lib/bookParser';
import { saveBook } from '@/services/archiveService';
import { toast } from 'sonner';

interface FileUploaderProps {
  onUploadComplete: () => void;
}

export function FileUploader({ onUploadComplete }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Primary Ingestion Engine
  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    try {
      setProcessingStatus(`Parsing ${file.name.split('.').pop()?.toUpperCase() ?? ''} data stream...`);
      const book = await parseBookFile(file);

      setProcessingStatus(book.type === 'txt' ? 'Archiving to local soul...' : `Uploading ${book.chapters.length} chapters...`);
      await saveBook(book);

      toast.success(`[ ${book.title.toUpperCase()} ] has been archived.`, {
        icon: <CheckCircle2 className="w-4 h-4 text-primary" />,
      });
      onUploadComplete();
    } catch (error) {
      console.error('System Failure during ingestion:', error);
      toast.error(error instanceof Error ? error.message : 'UNKNOWN_INGESTION_ERROR', {
        icon: <AlertTriangle className="w-4 h-4 text-destructive" />,
      });
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onUploadComplete]);

  // Drag and Drop Logic
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <div className="mb-10 w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`
          relative overflow-hidden
          drop-zone rounded-none p-10 cursor-pointer
          flex flex-col items-center justify-center gap-6
          transition-all duration-500 ease-out
          border-2 border-dashed
          ${isDragging 
            ? 'border-primary bg-primary/5 scale-[1.02] shadow-[0_0_30px_rgba(212,177,95,0.15)]' 
            : 'border-primary/20 bg-reader hover:border-primary/40'
          }
          ${isProcessing ? 'cursor-wait opacity-80' : 'active:scale-[0.98]'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.epub,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {/* Decorative Corner Borders (ORV Theme) */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/40" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary/40" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary/40" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/40" />

        {/* Upload Icon & Text */}
        <div className="flex flex-col items-center gap-4">
          <div className={`p-4 border border-primary/20 rounded-none transition-transform duration-700 ${isProcessing ? 'animate-spin-slow' : 'group-hover:rotate-12'}`}>
            <Upload className={`w-8 h-8 text-primary ${isProcessing ? 'animate-pulse' : ''}`} />
          </div>
          <div className="text-center">
            <span className="ui-label text-xl tracking-widest text-primary block mb-2">
              {isProcessing ? '[ ANALYZING NARRATIVE... ]' : '[ DROP NARRATIVE DATA ]'}
            </span>
            <p className="text-dust text-[10px] font-ui uppercase tracking-[0.2em] opacity-60">
              Standard synchronization protocols: EPUB / TXT / PDF
            </p>
          </div>
        </div>
        
        {/* Format Badges */}
        <div className="flex items-center gap-4 text-[10px] font-ui uppercase">
          <div className="flex items-center gap-2 px-3 py-1.5 border border-primary/10 bg-primary/5 text-dust">
            <BookOpen className="w-3.5 h-3.5" /> EPUB
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 border border-primary/10 bg-primary/5 text-dust">
            <FileText className="w-3.5 h-3.5" /> TXT
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 border border-primary/10 bg-primary/5 text-dust">
            <LucideFile className="w-3.5 h-3.5" /> PDF
          </div>
        </div>

        {/* Processing Progress Bar */}
        {isProcessing && (
          <div className="absolute bottom-0 left-0 h-1 bg-primary/20 w-full">
            <div className="h-full bg-primary animate-progress-flow shadow-[0_0_10px_#d4b15f]" />
          </div>
        )}
      </div>
      
      {/* System Status Display */}
      {isProcessing && (
        <div className="mt-4 flex items-center justify-center gap-3 py-2 border-x border-b border-primary/10 bg-primary/5 animate-in fade-in slide-in-from-top-2">
          <div className="w-2 h-2 bg-primary animate-pulse rounded-full" />
          <span className="ui-label text-[10px] text-primary tracking-[0.3em]">
            SYSTEM STATUS: {processingStatus.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}