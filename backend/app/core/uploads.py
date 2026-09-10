from __future__ import annotations

from fastapi import HTTPException, UploadFile, status


async def read_capped(file: UploadFile, max_bytes: int) -> bytes:
    """Read an upload in chunks and abort as soon as it exceeds max_bytes,
    instead of `await file.read()` (which buffers the whole body first and
    only checks the size afterwards — a request sent directly to the API,
    bypassing whatever client-side size limiting the app's own UI does,
    would otherwise be fully received before being rejected)."""
    chunk_size = 1024 * 1024
    total = 0
    chunks: list[bytes] = []
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Bestand te groot. Maximum is {max_bytes // (1024 * 1024)} MB.",
            )
        chunks.append(chunk)
    return b"".join(chunks)
