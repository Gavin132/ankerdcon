"""A transport that tries a read again when its connection turned out to be dead."""
from __future__ import annotations

import httpx

# What httpx raises when a reused connection was already closed by the other side
# (or by a NAT/proxy in between) by the time a request was sent on it. The request
# never got an answer, so for a read it is safe, and right, to ask again once on a
# fresh connection.
_DEAD_CONNECTION = (httpx.ReadError, httpx.WriteError, httpx.RemoteProtocolError, httpx.ConnectError)

_SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})


class RetryOnceTransport(httpx.BaseTransport):
    """Wraps another transport. A GET/HEAD/OPTIONS that fails because its connection
    was dead is sent once more; anything else (an insert or update, a timeout, an
    HTTP error status) is passed through untouched, so nothing is ever done twice."""

    def __init__(self, inner: httpx.BaseTransport) -> None:
        self._inner = inner

    def handle_request(self, request: httpx.Request) -> httpx.Response:
        try:
            return self._inner.handle_request(request)
        except _DEAD_CONNECTION:
            if request.method not in _SAFE_METHODS:
                raise
            return self._inner.handle_request(request)

    def close(self) -> None:
        self._inner.close()
