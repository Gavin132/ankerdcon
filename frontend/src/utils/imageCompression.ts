/** Resize (preserving aspect ratio, never upscaling) and re-encode an image
 * file client-side before upload — same canvas + toBlob technique as
 * BannerCropModal.tsx, generalized for a natural (non-cropped) aspect ratio.
 * Shrinks both the stored file and the upload itself, which matters most on
 * bad convention-hall reception. */
export function compressImage(file: File, maxDimension = 2560, quality = 0.88): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
      const width = Math.round(img.naturalWidth * scale);
      const height = Math.round(img.naturalHeight * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Canvas niet beschikbaar"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (blob) resolve(blob);
          else reject(new Error("Comprimeren mislukt"));
        },
        "image/jpeg",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Kon afbeelding niet laden"));
    };

    img.src = objectUrl;
  });
}

/** Centre-crops a file to a square (the app shows every avatar as a circle,
 * so an arbitrary rectangle would just be cropped unpredictably by the
 * browser anyway) and resizes it down to `size`, never up. No manual crop
 * step — same "just handle it" approach as the story/cosplay upload. */
export function cropSquareAndCompress(file: File, size = 512, quality = 0.88): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - side) / 2;
      const sy = (img.naturalHeight - side) / 2;
      const out = Math.min(size, side);

      const canvas = document.createElement("canvas");
      canvas.width = out;
      canvas.height = out;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Canvas niet beschikbaar"));
        return;
      }
      ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (blob) resolve(blob);
          else reject(new Error("Comprimeren mislukt"));
        },
        "image/jpeg",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Kon afbeelding niet laden"));
    };

    img.src = objectUrl;
  });
}
