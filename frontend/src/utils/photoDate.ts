/**
 * When a photo was taken, so several photos picked at once can be added to a
 * story in the order they were shot.
 *
 * `compressImage` redraws the photo on a canvas, which throws the EXIF data
 * away, so the date has to be read from the original file first. A photo
 * without EXIF (a screenshot, a WhatsApp forward) falls back to the file's
 * last-modified time, which is the best guess left.
 */

const TAG_EXIF_IFD = 0x8769;
const TAG_DATE_TIME_ORIGINAL = 0x9003;
const TAG_DATE_TIME_DIGITIZED = 0x9004;
const TAG_DATE_TIME = 0x0132;

/** The EXIF block sits in the first APP1 segment, which is always near the top. */
const HEADER_BYTES = 256 * 1024;

function parseExifDateString(raw: string): number | null {
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(raw);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m.map(Number);
  if (!y || !mo || !d) return null; // "0000:00:00 00:00:00" means unset
  // EXIF has no time zone: it is the camera's wall-clock time, so read it as local.
  return new Date(y, mo - 1, d, h, mi, s).getTime();
}

/** Reads the capture time out of a JPEG's EXIF block, as epoch ms. `null` when
 * the buffer is not a JPEG or has no usable date. Never throws. */
export function parseExifDate(buffer: ArrayBuffer): number | null {
  try {
    const view = new DataView(buffer);
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;

    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      if (view.getUint8(offset) !== 0xff) return null;
      const marker = view.getUint8(offset + 1);
      if (marker === 0xda || marker === 0xd9) return null; // image data: no EXIF before it
      const length = view.getUint16(offset + 2);
      if (marker === 0xe1 && view.getUint32(offset + 4) === 0x45786966 /* "Exif" */) {
        return readTiff(view, offset + 10);
      }
      offset += 2 + length;
    }
  } catch {
    // Truncated or malformed: treat as "no date".
  }
  return null;
}

function readTiff(view: DataView, tiff: number): number | null {
  const little = view.getUint16(tiff) === 0x4949;
  const u16 = (o: number) => view.getUint16(tiff + o, little);
  const u32 = (o: number) => view.getUint32(tiff + o, little);

  /** The byte offset of a tag's value inside one IFD, plus its entry. */
  function findTag(ifd: number, tag: number): { type: number; count: number; valueAt: number } | null {
    const entries = u16(ifd);
    for (let i = 0; i < entries; i++) {
      const entry = ifd + 2 + i * 12;
      if (u16(entry) !== tag) continue;
      const count = u32(entry + 4);
      // Values over 4 bytes live elsewhere and the field holds their offset.
      return { type: u16(entry + 2), count, valueAt: count > 4 ? u32(entry + 8) : entry + 8 };
    }
    return null;
  }

  function readAscii(tag: { count: number; valueAt: number }): string {
    let s = "";
    for (let i = 0; i < tag.count; i++) {
      const c = view.getUint8(tiff + tag.valueAt + i);
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s;
  }

  const ifd0 = u32(4);
  const exifPointer = findTag(ifd0, TAG_EXIF_IFD);
  if (exifPointer) {
    const exifIfd = u32(exifPointer.valueAt);
    for (const tagId of [TAG_DATE_TIME_ORIGINAL, TAG_DATE_TIME_DIGITIZED]) {
      const tag = findTag(exifIfd, tagId);
      const parsed = tag && parseExifDateString(readAscii(tag));
      if (parsed) return parsed;
    }
  }
  const modified = findTag(ifd0, TAG_DATE_TIME);
  return modified ? parseExifDateString(readAscii(modified)) : null;
}

/** Capture time of a picked file, in epoch ms. */
export async function readCaptureTime(file: File): Promise<number> {
  try {
    const head = await file.slice(0, HEADER_BYTES).arrayBuffer();
    const taken = parseExifDate(head);
    if (taken) return taken;
  } catch {
    // Unreadable: fall through to lastModified.
  }
  return file.lastModified;
}

/** The files oldest-first by when they were taken. Ties keep the order the
 * picker returned them in. */
export async function sortByCaptureTime(files: File[]): Promise<File[]> {
  const times = await Promise.all(files.map((f) => readCaptureTime(f)));
  return files
    .map((file, index) => ({ file, index, time: times[index] }))
    .sort((a, b) => a.time - b.time || a.index - b.index)
    .map((x) => x.file);
}
