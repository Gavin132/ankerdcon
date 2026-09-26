/**
 * Persists story photos that failed to upload for network reasons — not
 * because anything was wrong with the photo itself — so a photo taken with
 * no signal in a convention hall isn't just lost the moment the upload
 * fails. IndexedDB, not localStorage: it can hold a `Blob` directly, and it
 * survives the app being closed entirely, not just backgrounded, so a photo
 * queued this afternoon still sends itself once reopened this evening.
 */

const DB_NAME = "ankerd-pending-uploads";
const DB_VERSION = 1;
const STORE = "story_photos";

export interface PendingStoryPhoto {
  id: string;
  eventDayId: string;
  blob: Blob;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB niet beschikbaar"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = run(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function addPendingStoryPhoto(eventDayId: string, blob: Blob): Promise<PendingStoryPhoto> {
  const item: PendingStoryPhoto = { id: crypto.randomUUID(), eventDayId, blob, createdAt: Date.now() };
  await withStore("readwrite", (store) => store.put(item));
  return item;
}

export async function removePendingStoryPhoto(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
}

export async function listPendingStoryPhotos(): Promise<PendingStoryPhoto[]> {
  return withStore("readonly", (store) => store.getAll());
}
