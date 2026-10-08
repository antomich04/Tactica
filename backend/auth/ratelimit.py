from __future__ import annotations

import math
import threading
import time
from collections import deque


class RateLimiter:
    def __init__(self, max_attempts: int, window_seconds: int) -> None:
        self._max = max_attempts
        self._window = window_seconds
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def _prune(self, key: str, now: float) -> deque[float]:
        hits = self._hits.setdefault(key, deque())
        while hits and now - hits[0] >= self._window:
            hits.popleft()
        return hits

    def retry_after(self, key: str) -> int:
        """Seconds the caller must wait, or 0 if allowed."""
        with self._lock:
            now = time.monotonic()
            hits = self._prune(key, now)
            if not hits:
                self._hits.pop(key, None)
            if len(hits) < self._max:
                return 0
            return math.ceil(self._window - (now - hits[0]))

    def record_failure(self, key: str) -> None:
        with self._lock:
            self._prune(key, time.monotonic()).append(time.monotonic())

    def reset(self, key: str) -> None:
        with self._lock:
            self._hits.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._hits.clear()
