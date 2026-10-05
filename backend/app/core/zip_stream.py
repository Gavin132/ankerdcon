"""Streams a zip file as it is built, instead of holding the whole archive in memory or
composing it before the first byte goes out. Shared by the admin CDN download and a
member's "download this day's photos" — both stream already-compressed files (photos,
videos), so nothing here recompresses them."""
from __future__ import annotations

import io
import zipfile
from typing import Iterable, Iterator


class _ZipSink(io.RawIOBase):
    """A write-only stream that collects what zipfile writes, so the zip can be sent
    while it is still being built instead of held whole in memory."""

    def __init__(self) -> None:
        self._chunks: list[bytes] = []

    def writable(self) -> bool:
        return True

    def write(self, b) -> int:
        self._chunks.append(bytes(b))
        return len(b)

    def drain(self) -> bytes:
        data = b"".join(self._chunks)
        self._chunks = []
        return data


def stream_zip(entries: Iterable[tuple[str, bytes]]) -> Iterator[bytes]:
    """`entries` is (arcname, content) pairs of already-fetched bytes; yields zip file
    chunks as they are produced. Stored, not deflated: the content is already
    compressed, so deflating it again would cost time for no size gain."""
    sink = _ZipSink()
    with zipfile.ZipFile(sink, "w", compression=zipfile.ZIP_STORED) as zf:
        for name, content in entries:
            info = zipfile.ZipInfo(name)
            info.compress_type = zipfile.ZIP_STORED
            zf.writestr(info, content)
            yield sink.drain()
    yield sink.drain()
