import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface Narrative {
  id: string;
  title: string;
  content: string;
  progressIndex: number;
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

export async function saveNarrative(
  title: string,
  content: string,
  type: 'epub' | 'txt' | 'pdf'
): Promise<Narrative> {
  const db = await getDB();
  
  const words = content.trim().split(/\s+/).filter(w => w.length > 0);
  
  const narrative: Narrative = {
    id: crypto.randomUUID(),
    title,
    content,
    progressIndex: 0,
    totalWords: words.length,
    type,
    dateAdded: Date.now(),
  };
  
  await db.put('narratives', narrative);
  return narrative;
}

export async function getAllNarratives(): Promise<Narrative[]> {
  const db = await getDB();
  const narratives = await db.getAllFromIndex('narratives', 'by-date');
  // Sort by most recent first
  return narratives.reverse();
}

export async function getNarrative(id: string): Promise<Narrative | undefined> {
  const db = await getDB();
  return db.get('narratives', id);
}

export async function updateProgress(id: string, progressIndex: number): Promise<void> {
  const db = await getDB();
  const narrative = await db.get('narratives', id);
  
  if (narrative) {
    narrative.progressIndex = progressIndex;
    await db.put('narratives', narrative);
  }
}

export async function deleteNarrative(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('narratives', id);
}

export async function clearAllNarratives(): Promise<void> {
  const db = await getDB();
  await db.clear('narratives');
}
