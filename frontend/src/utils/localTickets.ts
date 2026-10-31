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
  /** A small square copy for the list. `undefined` for a ticket saved before there were any (made later, once), `null`
   * when there is none to make (a PDF, or a picture this browser cannot decode). */
  thumb?: Blob | null;
}

const THUMB_SIZE = 96; // twice the 44 px it is shown at, for a sharp screen

/**
 * A small square copy of an image ticket, centred like the list shows it. The list used to put the original in a 44 px
 * box, which made the browser decode a whole phone photo (several megapixels, up to 15 MB) just to draw it that size, and
 * that is what made the sheet stutter while it opened.
 */
export async function makeTicketThumbnail(blob: Blob): Promise<Blob | null> {
  if (!blob.type.startsWith("image/")) return null;
  try {
    const bitmap = await createImageBitmap(blob);
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = THUMB_SIZE;
    canvas.height = THUMB_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, THUMB_SIZE, THUMB_SIZE);
    bitmap.close();
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.75));
  } catch {
    return null;
  }
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
    thumb: await makeTicketThumbnail(file),
  };
  await withStore("readwrite", (store) => store.put(item));
  return item;
}

/** Keeps the thumbnail made for a ticket that was saved without one. */
export async function saveLocalTicketThumb(id: string, thumb: Blob | null): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const read = store.get(id);
      read.onsuccess = () => {
        if (read.result) store.put({ ...read.result, thumb });
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function removeLocalTicket(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
}

export async function listLocalTickets(): Promise<LocalTicket[]> {
  return withStore("readonly", (store) => store.getAll());
}
