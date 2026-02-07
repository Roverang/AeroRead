import { openDB, DBSchema, IDBPDatabase } from 'idb';
import axios from 'axios';

// --- SYSTEM CONFIGURATION ---
// Ensures that in production, it hits https://aeroread.vercel.app/api
// In local dev, it hits http://127.0.0.1:8000
const API_BASE = import.meta.env.PROD 
  ? `${window.location.origin}/api` 
  : 'http://127.0.0.1:8000';

/**
 * THE UPLOAD PROTOCOL
 */
export const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  // No manual Content-Type header needed; axios/browser handles the boundary automatically
  return await axios.post(`${API_BASE}/archive/upload`, formData);
};

export interface Narrative {
  id: string;
  title: string;
  content: string; 
  progressIndex: number;
  chapterIndex?: number;
  totalWords: number;
  type: 'epub' | 'txt' | 'pdf';
  dateAdded: number;
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

/**
 * THE INGESTION CHAMBER
 */
export async function saveNarrative(
  title: string,
  content: string,
  type: 'epub' | 'txt' | 'pdf',
  file?: File 
): Promise<Narrative> {
  const db = await getDB();
  let finalId = crypto.randomUUID();
  let wordCount = 0;

  if (file && (type === 'epub' || type === 'pdf')) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Call Cloud Pipe
    const response = await axios.post(`${API_BASE}/archive/upload`, formData);
    finalId = response.data.id;
    wordCount = response.data.total_words;
  } else {
    wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
  }

  const narrative: Narrative = {
    id: finalId,
    title,
    content: type === 'txt' ? content : `[ DATA ARCHIVED IN CLOUD ]`,
    progressIndex: 0,
    chapterIndex: 0,
    totalWords: wordCount,
    type,
    dateAdded: Date.now(),
  };
  
  await db.put('narratives', narrative);
  return narrative;
}

// --- CLOUD SYNCHRONIZATION ---

export async function getChapter(id: string, chapterIndex: number) {
  const response = await axios.get(`${API_BASE}/reader/${id}/chapter/${chapterIndex}`);
  return response.data;
}

export async function updateProgress(
  id: string, 
  progressIndex: number, 
  chapterIndex: number = 0
): Promise<void> {
  const db = await getDB();
  const narrative = await db.get('narratives', id);
  
  if (narrative) {
    narrative.progressIndex = progressIndex;
    narrative.chapterIndex = chapterIndex;
    await db.put('narratives', narrative);

    axios.post(`${API_BASE}/reader/sync`, {
      story_id: id,
      chapter_index: chapterIndex,
      word_index: progressIndex
    }).catch(() => {
      console.warn("[ SYSTEM NOTICE ]: Synchronization delayed. Progress held in Local Soul.");
    });
  }
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
  await db.delete('narratives', id);
  
  axios.delete(`${API_BASE}/archive/delete/${id}`).catch(() => {
    console.warn(`[ SYSTEM NOTICE ]: Cloud purge pending for ${id}`);
  });
}

export async function clearAllNarratives(): Promise<void> {
  const db = await getDB();
  await db.clear('narratives');
}