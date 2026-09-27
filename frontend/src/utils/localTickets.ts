/**
 * A member's own event ticket (a screenshot or a PDF with the entry QR),
 * kept entirely on this device — IndexedDB, never uploaded anywhere. This is
 * a deliberate choice for something this sensitive: no server, no bucket, no
 * backend endpoint at all, so there is nothing to leak from Ankerd Con's own
 * infrastructure. The trade-off is the flip side of that — it does not sync
 * to another device, and a browser can clear it on its own (low on storage,
 * "clear site data", a reinstall), so it is a convenience for the device
 * it was added on, not a permanent archive.
 */

const DB_NAME = "ankerd-tickets";
const DB_VERSION = 1;
const STORE = "tickets";

export interface LocalTicket {
  id: string;
  eventId: string;
  blob: Blob;
  contentType: string;
  fileName: string;
  size: number;
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

export async function addLocalTicket(eventId: string, file: File): Promise<LocalTicket> {
  const item: LocalTicket = {
    id: crypto.randomUUID(),
    eventId,
    blob: file,
    contentType: file.type,
    fileName: file.name,
    size: file.size,
    createdAt: Date.now(),
  };
  await withStore("readwrite", (store) => store.put(item));
  return item;
}

export async function removeLocalTicket(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
}

export async function listLocalTickets(): Promise<LocalTicket[]> {
  return withStore("readonly", (store) => store.getAll());
}
