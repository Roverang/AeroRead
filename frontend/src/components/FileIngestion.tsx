import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, BookOpen, X } from 'lucide-react';
import ePub from 'epubjs';

interface FileIngestionProps {
  onTextLoad: (text: string) => void;
}

interface EpubChapter {
  id: string;
  label: string;
  href: string;
}

export function FileIngestion({ onTextLoad }: FileIngestionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [chapters, setChapters] = useState<EpubChapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [epubBook, setEpubBook] = useState<any>(null);
  
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
    setIsLoading(true);
    setFileName(file.name);
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    try {
      if (extension === 'txt') {
        const text = await file.text();
        onTextLoad(text);
        setChapters([]);
        setEpubBook(null);
      } else if (extension === 'epub') {
        const arrayBuffer = await file.arrayBuffer();
        const book = ePub(arrayBuffer);
        
        await book.ready;
        
        // Get navigation/chapters
        const navigation = await book.loaded.navigation;
        const chapterList: EpubChapter[] = navigation.toc.map((item: any) => ({
          id: item.id || item.href,
          label: item.label,
          href: item.href,
        }));
        
        setChapters(chapterList);
        setEpubBook(book);
        
        if (chapterList.length > 0) {
          setSelectedChapter(chapterList[0].href);
          await loadChapter(book, chapterList[0].href);
        }
      } else {
        alert('Unsupported file format. Please use .txt or .epub files.');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please try again.');
    }
    
    setIsLoading(false);
  };

  const loadChapter = async (book: any, href: string) => {
    setIsLoading(true);
    try {
      const section = book.spine.get(href);
      if (section) {
        await section.load(book.load.bind(book));
        const doc = section.document;
        
        // Extract text content, preserving some structure
        const body = doc.querySelector('body');
        let text = '';
        
        if (body) {
          // Get text with paragraph breaks
          const paragraphs = body.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
          paragraphs.forEach((p: Element) => {
            text += p.textContent?.trim() + '\n\n';
          });
          
          // Fallback to full text if no paragraphs found
          if (!text.trim()) {
            text = body.textContent || '';
          }
        }
        
        onTextLoad(text.trim());
      }
    } catch (error) {
      console.error('Error loading chapter:', error);
    }
    setIsLoading(false);
  };

  const handleChapterChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const href = e.target.value;
    setSelectedChapter(href);
    if (epubBook && href) {
      await loadChapter(epubBook, href);
    }
  };

  const clearFile = () => {
    setFileName(null);
    setChapters([]);
    setEpubBook(null);
    setSelectedChapter('');
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
          accept=".txt,.epub"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="flex items-center gap-3">
          <Upload className="w-5 h-5 text-primary" />
          <span className="ui-label">[ DATA INGESTION ]</span>
        </div>
        
        <p className="text-dust text-sm font-ui">
          Drop .TXT or .EPUB file here, or click to browse
        </p>
        
        <div className="flex items-center gap-4 text-xs text-dust/60">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" /> TXT
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> EPUB
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
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.href}>
                    {chapter.label}
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
