/** Saves a blob the backend returned through the browser's normal download flow —
 * used for anything streamed as `responseType: "blob"` (a zip, a forced-download photo)
 * rather than linked to directly. */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** The filename a backend `Content-Disposition: attachment; filename="…"` header names,
 * or `fallback` when the header is missing or unparsable. */
export function filenameFromContentDisposition(headerValue: unknown, fallback: string): string {
  return /filename="?([^";]+)"?/.exec(String(headerValue ?? ""))?.[1] ?? fallback;
}
