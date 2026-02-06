import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, BookOpen, File } from 'lucide-react';
import ePub from 'epubjs';
import * as pdfjsLib from 'pdfjs-dist';
import { saveNarrative } from '@/services/archiveService';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`;

interface FileUploaderProps {
  onUploadComplete: () => void;
}

export function FileUploader({ onUploadComplete }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, []);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    const extension = file.name.split('.').pop()?.toLowerCase();
    const title = file.name.replace(/\.[^/.]+$/, '');
    
    try {
      let content = '';
      let type: 'txt' | 'epub' | 'pdf' = 'txt';
      
      if (extension === 'txt') {
        setProcessingStatus('Reading text file...');
        content = await file.text();
        type = 'txt';
      } else if (extension === 'epub') {
        setProcessingStatus('Parsing EPUB chapters...');
        content = await parseEpub(file);
        type = 'epub';
      } else if (extension === 'pdf') {
        setProcessingStatus('Extracting PDF text...');
        content = await parsePdf(file);
        type = 'pdf';
      } else {
        throw new Error('Unsupported file format');
      }
      
      if (content.trim().length === 0) {
        throw new Error('No text content found in file');
      }
      
      setProcessingStatus('Saving to archive...');
      await saveNarrative(title, content, type);
      
      onUploadComplete();
    } catch (error) {
      console.error('Error processing file:', error);
      alert(error instanceof Error ? error.message : 'Error processing file');
    }
    
    setIsProcessing(false);
    setProcessingStatus('');
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const parseEpub = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const book = ePub(arrayBuffer);
    await book.ready;
    
    const spine = book.spine as any;
    let fullText = '';
    
    for (const section of spine.items) {
      try {
        await section.load(book.load.bind(book));
        const doc = section.document;
        
        if (doc) {
          const body = doc.querySelector('body');
          if (body) {
            const paragraphs = body.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
            paragraphs.forEach((p: Element) => {
              const text = p.textContent?.trim();
              if (text) {
                fullText += text + '\n\n';
              }
            });
            
            // Fallback to full text if no paragraphs
            if (!fullText.trim() && body.textContent) {
              fullText += body.textContent.trim() + '\n\n';
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load section:', e);
      }
    }
    
    return fullText.trim();
  };

  const parsePdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }
    
    return fullText.trim();
  };

  return (
    <div className="mb-8">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          drop-zone rounded-none p-8 cursor-pointer
          flex flex-col items-center justify-center gap-4
          transition-all duration-300
          ${isDragging ? 'drop-zone-active border-primary shadow-[0_0_20px_rgba(212,177,95,0.2)]' : ''}
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
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
          <Upload className="w-6 h-6 text-primary" />
          <span className="ui-label text-lg">[ DROP NARRATIVE DATA ]</span>
        </div>
        
        <p className="text-dust text-sm font-ui">
          EPUB / TXT / PDF supported
        </p>
        
        <div className="flex items-center gap-6 text-xs text-dust/60">
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" /> EPUB
          </span>
          <span className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> TXT
          </span>
          <span className="flex items-center gap-1.5">
            <File className="w-4 h-4" /> PDF
          </span>
        </div>
      </div>
      
      {isProcessing && (
        <div className="text-center py-3 mt-4">
          <span className="ui-label text-dust animate-pulse-soft">
            [ {processingStatus.toUpperCase()} ]
          </span>
        </div>
      )}
    </div>
  );
}
