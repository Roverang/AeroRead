import { openDB, DBSchema, IDBPDatabase } from 'idb';
import axios from 'axios';
import type { BookType, ParsedBook } from '@/lib/bookParser';

// --- SYSTEM CONFIGURATION ---
// Ensures that in production, it hits https://aeroread.vercel.app/api
// In local dev, it hits the FastAPI server on http://127.0.0.1:8000/api
const API_BASE = import.meta.env.PROD
  ? `${window.location.origin}/api`
  : 'http://127.0.0.1:8000/api';

export interface Narrative {
  id: string;
  title: string;
  author?: string;
  content: string;
  progressIndex: number;
  chapterIndex?: number;
  chapterCount?: number;
  /** Word count per chapter, used to compute whole-book progress. */
  chapterWordCounts?: number[];
  totalWords: number;
  type: BookType;
  dateAdded: number;
}

export interface Chapter {
  title: string;
  text: string;
  word_count: number;
  index: number;
  total_chapters: number;
}

interface StoryCreated {
  id: string;
  chapter_count: number;
  chapter_word_counts: number[];
  total_words: number;
}

interface ArchiveDB extends DBSchema {
  narratives: {
    key: string;
    value: Narrative;
    indexes: { 'by-date': number };
  };
}

const DB_NAME = 'aeroread-archive';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ArchiveDB>> | null = null;

function getDB(): Promise<IDBPDatabase<ArchiveDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ArchiveDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('narratives', { keyPath: 'id' });
        store.createIndex('by-date', 'dateAdded');
      },
    });
  }
  return dbPromise;
}

/** Local (TXT) narratives live only in this browser; everything else is in the cloud. */
export function isLocalNarrative(narrative: Pick<Narrative, 'type'>): boolean {
  return narrative.type === 'txt';
}

/**
 * Gzips the JSON body when the browser supports it, so large books
 * stay under the hosting platform's request size limit.
 */
async function encodeBody(data: unknown): Promise<{ body: Blob | string; headers: Record<string, string> }> {
  const json = JSON.stringify(data);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof CompressionStream === 'undefined') return { body: json, headers };

  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
  const body = await new Response(stream).blob();
  return { body, headers: { ...headers, 'Content-Encoding': 'gzip' } };
}

function describeUploadError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 413) return new Error('FILE_TOO_LARGE: This book exceeds the upload limit.');
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return new Error(detail);
    if (!error.response) return new Error('CONNECTION_LOST: Could not reach the archive server.');
  }
  return error instanceof Error ? error : new Error('UNKNOWN_INGESTION_ERROR');
}

/**
 * THE INGESTION CHAMBER
 * TXT files stay local; EPUB/PDF chapters are uploaded to the cloud archive.
 */
export async function saveBook(book: ParsedBook): Promise<Narrative> {
  const db = await getDB();

  let narrative: Narrative;
  if (book.type === 'txt') {
    const content = book.chapters.map(c => c.text).join('\n\n');
    narrative = {
      id: crypto.randomUUID(),
      title: book.title,
      author: book.author,
      content,
      progressIndex: 0,
      chapterIndex: 0,
      chapterCount: 1,
      totalWords: content.trim().split(/\s+/).filter(Boolean).length,
      type: 'txt',
      dateAdded: Date.now(),
    };
  } else {
    let created: StoryCreated;
    try {
      const { body, headers } = await encodeBody(book);
      created = (await axios.post<StoryCreated>(`${API_BASE}/archive/stories`, body, { headers })).data;
    } catch (error) {
      throw describeUploadError(error);
    }
    narrative = {
      id: created.id,
      title: book.title,
      author: book.author,
      content: '[ DATA ARCHIVED IN CLOUD ]',
      progressIndex: 0,
      chapterIndex: 0,
      chapterCount: created.chapter_count,
      chapterWordCounts: created.chapter_word_counts,
      totalWords: created.total_words,
      type: book.type,
      dateAdded: Date.now(),
    };
  }

  await db.put('narratives', narrative);
  return narrative;
}

/** Percentage through the whole book, not just the current chapter. */
export function getOverallProgress(narrative: Narrative): number {
  const total = narrative.totalWords || 0;
  if (total <= 0) return 0;
  const chapter = narrative.chapterIndex || 0;
  const before = (narrative.chapterWordCounts ?? []).slice(0, chapter).reduce((sum, n) => sum + n, 0);
  return Math.min(100, ((before + (narrative.progressIndex || 0)) / total) * 100);
}

// --- CLOUD SYNCHRONIZATION ---

export async function getChapter(id: string, chapterIndex: number): Promise<Chapter> {
  const response = await axios.get<Chapter>(`${API_BASE}/reader/${id}/chapter/${chapterIndex}`);
  return response.data;
}

export async function updateProgress(
  id: string,
  progressIndex: number,
  chapterIndex: number = 0
): Promise<void> {
  const db = await getDB();
  const narrative = await db.get('narratives', id);
  if (!narrative) return;

  narrative.progressIndex = progressIndex;
  narrative.chapterIndex = chapterIndex;
  await db.put('narratives', narrative);

  if (isLocalNarrative(narrative)) return;

  axios.post(`${API_BASE}/reader/sync`, {
    story_id: id,
    chapter_index: chapterIndex,
    word_index: progressIndex
  }).catch(() => {
    console.warn("[ SYSTEM NOTICE ]: Synchronization delayed. Progress held in Local Soul.");
  });
}

export async function getAllNarratives(): Promise<Narrative[]> {
  const db = await getDB();
  const narratives = await db.getAllFromIndex('narratives', 'by-date');
  return narratives.reverse();
}

export async function getNarrative(id: string): Promise<Narrative | undefined> {
  const db = await getDB();
  return db.get('narratives', id);
}

export async function deleteNarrative(id: string): Promise<void> {
  const db = await getDB();
  const narrative = await db.get('narratives', id);
  await db.delete('narratives', id);

  if (narrative && isLocalNarrative(narrative)) return;

  axios.delete(`${API_BASE}/archive/delete/${id}`).catch(() => {
    console.warn(`[ SYSTEM NOTICE ]: Cloud purge pending for ${id}`);
  });
}

export async function clearAllNarratives(): Promise<void> {
  const db = await getDB();
  await db.clear('narratives');
}
