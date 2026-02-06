import { openDB, DBSchema, IDBPDatabase } from 'idb';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000';

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
 * Uses the Backend Shredder for EPUB/PDF, and Local Storage for TXT.
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

  // 1. OMNISCIENT SHREDDING (Cloud Pipe)
  if (file && (type === 'epub' || type === 'pdf')) {
    const formData = new FormData();
    formData.append('file', file);
    
    // The FastAPI call splits the book into chapters and stores them in MongoDB
    const response = await axios.post(`${API_BASE}/archive/upload`, formData);
    finalId = response.data.id;
    wordCount = response.data.total_words;
  } else {
    // Local calculation for raw text data
    wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
  }

  // 2. ARCHIVE RECORD (Local Soul)
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

/**
 * RETRIEVE ALL SCENARIOS
 */
export async function getAllNarratives(): Promise<Narrative[]> {
  const db = await getDB();
  const narratives = await db.getAllFromIndex('narratives', 'by-date');
  return narratives.reverse();
}

/**
 * FETCH NARRATIVE METADATA
 */
export async function getNarrative(id: string): Promise<Narrative | undefined> {
  const db = await getDB();
  return db.get('narratives', id);
}

/**
 * CHAPTER STREAMING
 * Pulls the specific word-array for the current chapter from MongoDB.
 */
export async function getChapter(id: string, chapterIndex: number) {
  const response = await axios.get(`${API_BASE}/reader/${id}/chapter/${chapterIndex}`);
  // Expected return: { title: string, content: string[], word_count: number }
  return response.data;
}

/**
 * OMNISCIENT PROGRESS SYNC
 * Saves to IndexedDB instantly for UI consistency, pings MongoDB in the background.
 */
export async function updateProgress(
  id: string, 
  progressIndex: number, 
  chapterIndex: number = 0
): Promise<void> {
  const db = await getDB();
  const narrative = await db.get('narratives', id);
  
  if (narrative) {
    // Update Local Soul
    narrative.progressIndex = progressIndex;
    narrative.chapterIndex = chapterIndex;
    await db.put('narratives', narrative);

    // Background Sync (Cloud Protocol)
    axios.post(`${API_BASE}/reader/sync`, {
      story_id: id,
      chapter_index: chapterIndex,
      word_index: progressIndex
    }).catch(() => {
      // Failed sync is silent to avoid interrupting the reader flow
      console.warn("[ SYSTEM NOTICE ]: Synchronization delayed. Progress held in Local Soul.");
    });
  }
}

/**
 * ARCHIVE PURGE
 */
export async function deleteNarrative(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('narratives', id);
  
  // Clean up the Cloud Archive
  axios.delete(`${API_BASE}/archive/delete/${id}`).catch(() => {
    console.warn(`[ SYSTEM N OTICE ]: Cloud purge pending for ${id}`);
  });
}

/**
 * SYSTEM WIPE
 */
export async function clearAllNarratives(): Promise<void> {
  const db = await getDB();
  await db.clear('narratives');
}