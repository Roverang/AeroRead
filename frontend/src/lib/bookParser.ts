import type { NavItem } from 'epubjs';
import type Section from 'epubjs/types/section';

export type BookType = 'epub' | 'pdf' | 'txt';

export interface ParsedChapter {
  title: string;
  text: string;
}

export interface ParsedBook {
  title: string;
  author: string;
  type: BookType;
  chapters: ParsedChapter[];
}

// Sections shorter than this are front matter, ads or blank pages.
const MIN_CHAPTER_WORDS = 20;
// PDFs have no reliable chapter structure, so group pages into chunks.
const PDF_PAGES_PER_CHAPTER = 10;

export function getBookType(fileName: string): BookType | null {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext === 'epub' || ext === 'pdf' || ext === 'txt' ? ext : null;
}

function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Untitled';
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Splits a book file into chapters in the browser.
 * The heavy parsing libraries are loaded on demand to keep them
 * out of the main bundle.
 */
export async function parseBookFile(file: File): Promise<ParsedBook> {
  const type = getBookType(file.name);
  if (!type) {
    throw new Error('UNSUPPORTED_DATA_FORMAT: System only accepts EPUB, PDF, or TXT.');
  }

  const fallbackTitle = titleFromFileName(file.name);
  let book: ParsedBook;
  if (type === 'txt') {
    book = { title: fallbackTitle, author: 'Unknown Author', type, chapters: [{ title: fallbackTitle, text: await file.text() }] };
  } else if (type === 'epub') {
    book = await parseEpub(file, fallbackTitle);
  } else {
    book = await parsePdf(file, fallbackTitle);
  }

  book.chapters = book.chapters.filter(c => wordCount(c.text) >= (type === 'txt' ? 1 : MIN_CHAPTER_WORDS));
  if (book.chapters.length === 0) {
    throw new Error(type === 'pdf'
      ? 'EMPTY_DATA: No readable text. Scanned PDFs need OCR first.'
      : 'EMPTY_DATA: No narrative found.');
  }
  return book;
}

function stripFragment(href: string): string {
  return href.split('#')[0];
}

function flattenToc(items: NavItem[], into = new Map<string, string>()): Map<string, string> {
  for (const item of items) {
    const href = stripFragment(item.href);
    if (!into.has(href)) into.set(href, item.label.trim());
    if (item.subitems?.length) flattenToc(item.subitems, into);
  }
  return into;
}

function extractText(doc: Document): { text: string; heading: string | null } {
  const body = doc.querySelector('body');
  if (!body) return { text: '', heading: null };
  const heading = body.querySelector('h1, h2, h3')?.textContent?.trim() || null;
  const blocks = Array.from(body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote'))
    .map(el => el.textContent?.trim())
    .filter(Boolean);
  const text = blocks.length > 0 ? blocks.join('\n\n') : (body.textContent?.trim() ?? '');
  return { text, heading };
}

async function parseEpub(file: File, fallbackTitle: string): Promise<ParsedBook> {
  const { default: ePub } = await import('epubjs');
  const book = ePub(await file.arrayBuffer());
  try {
    await book.ready;
    const [metadata, navigation] = await Promise.all([book.loaded.metadata, book.loaded.navigation]);
    const tocLabels = flattenToc(navigation.toc);

    const sections: Section[] = [];
    book.spine.each((section: Section) => sections.push(section));

    const chapters: ParsedChapter[] = [];
    for (const section of sections) {
      try {
        await section.load(book.load.bind(book));
        const { text, heading } = extractText(section.document);
        const title = tocLabels.get(stripFragment(section.href)) || heading || `Chapter ${chapters.length + 1}`;
        chapters.push({ title, text });
      } catch (e) {
        console.warn('System: Skipping corrupt data section.', e);
      } finally {
        section.unload();
      }
    }

    return {
      title: metadata.title?.trim() || fallbackTitle,
      author: metadata.creator?.trim() || 'Unknown Author',
      type: 'epub',
      chapters,
    };
  } finally {
    book.destroy();
  }
}

async function parsePdf(file: File, fallbackTitle: string): Promise<ParsedBook> {
  const pdfjs = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  try {
    const metadata = await pdf.getMetadata().catch(() => null);
    const info = (metadata?.info ?? {}) as { Title?: string; Author?: string };

    const chapters: ParsedChapter[] = [];
    for (let start = 1; start <= pdf.numPages; start += PDF_PAGES_PER_CHAPTER) {
      const end = Math.min(start + PDF_PAGES_PER_CHAPTER - 1, pdf.numPages);
      const pages: string[] = [];
      for (let i = start; i <= end; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        pages.push(content.items.map(item => ('str' in item ? item.str : '')).join(' '));
        page.cleanup();
      }
      chapters.push({ title: start === end ? `Page ${start}` : `Pages ${start}–${end}`, text: pages.join('\n\n') });
    }

    return {
      title: info.Title?.trim() || fallbackTitle,
      author: info.Author?.trim() || 'Unknown Author',
      type: 'pdf',
      chapters,
    };
  } finally {
    await pdf.destroy();
  }
}
