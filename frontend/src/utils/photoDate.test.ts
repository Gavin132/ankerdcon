import { describe, expect, it } from "vitest";
import { parseExifDate, sortByCaptureTime } from "./photoDate";

/** A minimal JPEG: SOI + one APP1 EXIF segment holding a single date tag. */
function jpegWithDate(date: string, opts: { little?: boolean; tag?: "original" | "modified" } = {}): ArrayBuffer {
  const little = opts.little ?? true;
  const text = date + "\0"; // 20 bytes
  const tiff = new DataView(new ArrayBuffer(8 + 2 + 12 + 4 + 2 + 12 + 4 + text.length));
  const w16 = (o: number, v: number) => tiff.setUint16(o, v, little);
  const w32 = (o: number, v: number) => tiff.setUint32(o, v, little);

  w16(0, little ? 0x4949 : 0x4d4d);
  w16(2, 42);
  w32(4, 8);
  let dataAt: number;
  if (opts.tag === "modified") {
    // IFD0 holds DateTime (0x0132) directly.
    w16(8, 1);
    w16(10, 0x0132);
    w16(12, 2);
    w32(14, text.length);
    dataAt = 8 + 2 + 12 + 4;
    w32(18, dataAt);
    w32(22, 0);
  } else {
    // IFD0 -> ExifIFD pointer -> DateTimeOriginal (0x9003).
    w16(8, 1);
    w16(10, 0x8769);
    w16(12, 4);
    w32(14, 1);
    const exifIfd = 8 + 2 + 12 + 4;
    w32(18, exifIfd);
    w32(22, 0);
    w16(exifIfd, 1);
    w16(exifIfd + 2, 0x9003);
    w16(exifIfd + 4, 2);
    w32(exifIfd + 6, text.length);
    dataAt = exifIfd + 2 + 12 + 4;
    w32(exifIfd + 10, dataAt);
    w32(exifIfd + 14, 0);
  }
  for (let i = 0; i < text.length; i++) tiff.setUint8(dataAt + i, text.charCodeAt(i));

  const tiffBytes = new Uint8Array(tiff.buffer);
  const out = new Uint8Array(2 + 2 + 2 + 6 + tiffBytes.length + 2);
  const v = new DataView(out.buffer);
  v.setUint16(0, 0xffd8);
  v.setUint16(2, 0xffe1);
  v.setUint16(4, 2 + 6 + tiffBytes.length);
  out.set([0x45, 0x78, 0x69, 0x66, 0, 0], 6);
  out.set(tiffBytes, 12);
  v.setUint16(out.length - 2, 0xffd9);
  return out.buffer;
}

describe("parseExifDate", () => {
  const expected = new Date(2026, 7, 14, 9, 5, 30).getTime();

  it("reads DateTimeOriginal, little-endian", () => {
    expect(parseExifDate(jpegWithDate("2026:08:14 09:05:30"))).toBe(expected);
  });

  it("reads DateTimeOriginal, big-endian", () => {
    expect(parseExifDate(jpegWithDate("2026:08:14 09:05:30", { little: false }))).toBe(expected);
  });

  it("falls back to the plain DateTime tag", () => {
    expect(parseExifDate(jpegWithDate("2026:08:14 09:05:30", { tag: "modified" }))).toBe(expected);
  });

  it("ignores an unset date", () => {
    expect(parseExifDate(jpegWithDate("0000:00:00 00:00:00"))).toBeNull();
  });

  it("returns null for non-JPEG and truncated data", () => {
    expect(parseExifDate(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)).toBeNull();
    expect(parseExifDate(jpegWithDate("2026:08:14 09:05:30").slice(0, 20))).toBeNull();
    expect(parseExifDate(new ArrayBuffer(0))).toBeNull();
  });
});

describe("sortByCaptureTime", () => {
  it("orders by EXIF date, then lastModified, keeping picker order on ties", async () => {
    const late = new File([jpegWithDate("2026:08:14 18:00:00")], "late.jpg", { lastModified: 1 });
    const early = new File([jpegWithDate("2026:08:14 08:00:00")], "early.jpg", { lastModified: 9e12 });
    const plainOld = new File([new Uint8Array([1, 2, 3])], "shot.png", {
      lastModified: new Date(2026, 7, 14, 12, 0, 0).getTime(),
    });
    const tieA = new File([new Uint8Array([1])], "a.png", { lastModified: new Date(2026, 7, 15).getTime() });
    const tieB = new File([new Uint8Array([2])], "b.png", { lastModified: new Date(2026, 7, 15).getTime() });

    const sorted = await sortByCaptureTime([tieA, late, plainOld, tieB, early]);
    expect(sorted.map((f) => f.name)).toEqual(["early.jpg", "shot.png", "late.jpg", "a.png", "b.png"]);
  });
});
