"""Multi-source recorder. Tracks player mix + live monitor output, writes a
mixed stereo WAV to ~/Desktop/Guitar AI Recordings/.

The audio callbacks call `Recorder.feed(source, block)` after producing output.
A background thread time-aligns the per-source queues and writes the mix.
"""
from __future__ import annotations
import logging
import queue
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

import numpy as np
import soundfile as sf

log = logging.getLogger("guitar_ai.recorder")


def default_recordings_dir() -> Path:
    return Path.home() / "Desktop" / "Guitar AI Recordings"


def _next_filename(prefix: str = "jam") -> Path:
    d = default_recordings_dir()
    d.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y-%m-%d %H-%M-%S")
    return d / f"{prefix} · {ts}.wav"


class Recorder:
    """Mixes audio from multiple sources into a single stereo WAV file.

    Sources push (frames, 2) float32 blocks via `feed(source, block)`.
    The worker thread waits up to 50ms for each source, sums their oldest
    blocks aligned in real time, and writes them out.
    """

    def __init__(self) -> None:
        self._active = False
        self._sf: Optional[sf.SoundFile] = None
        self._path: Optional[Path] = None
        self._lock = threading.RLock()
        self._queues: dict[str, queue.Queue[np.ndarray]] = {}
        self._sources: set[str] = set()
        self._worker: Optional[threading.Thread] = None
        self._sample_rate: int = 48000
        self._frames_written: int = 0
        self._t_started: Optional[float] = None

    # ---------- introspection ----------
    @property
    def is_recording(self) -> bool:
        return self._active

    @property
    def status(self) -> dict:
        return {
            "active": self._active,
            "path": str(self._path) if self._path else None,
            "frames": self._frames_written,
            "duration_sec": self._frames_written / self._sample_rate if self._frames_written else 0,
            "sample_rate": self._sample_rate,
            "sources": sorted(self._sources),
        }

    @staticmethod
    def list_recordings() -> list[dict]:
        d = default_recordings_dir()
        if not d.exists():
            return []
        out = []
        for p in sorted(d.glob("*.wav"), key=lambda x: x.stat().st_mtime, reverse=True):
            try:
                info = sf.info(str(p))
                out.append({
                    "filename": p.name,
                    "path": str(p),
                    "duration_sec": info.frames / info.samplerate,
                    "size_kb": p.stat().st_size // 1024,
                    "created_at": int(p.stat().st_mtime),
                })
            except Exception as e:
                log.warning("could not parse recording %s: %s", p, e)
        return out

    # ---------- lifecycle ----------
    def start(self, sample_rate: int = 48000, prefix: str = "jam") -> dict:
        with self._lock:
            if self._active:
                return self.status
            path = _next_filename(prefix=prefix)
            self._sf = sf.SoundFile(str(path), mode="w", samplerate=sample_rate, channels=2, subtype="PCM_24")
            self._path = path
            self._sample_rate = sample_rate
            self._frames_written = 0
            self._sources.clear()
            self._queues.clear()
            self._t_started = time.monotonic()
            self._active = True

            self._worker = threading.Thread(target=self._run, name="recorder-worker", daemon=True)
            self._worker.start()
            log.info("recording started → %s", path)
            return self.status

    def stop(self) -> dict:
        with self._lock:
            if not self._active:
                return self.status
            self._active = False
        if self._worker:
            self._worker.join(timeout=2.0)
        with self._lock:
            if self._sf:
                self._sf.close()
                self._sf = None
            log.info("recording stopped (%d frames, %.1fs) → %s",
                     self._frames_written, self._frames_written / self._sample_rate, self._path)
            return self.status

    # ---------- ingestion ----------
    def feed(self, source: str, block: np.ndarray) -> None:
        """Called by audio callbacks. Cheap — just enqueues a copy."""
        if not self._active:
            return
        if block is None or block.size == 0:
            return
        if block.ndim == 1:
            block = block.reshape(-1, 1)
        if block.shape[1] == 1:
            block = np.repeat(block, 2, axis=1)
        elif block.shape[1] > 2:
            block = block[:, :2]
        with self._lock:
            self._sources.add(source)
            q = self._queues.get(source)
            if q is None:
                q = queue.Queue(maxsize=512)  # ~2.7s worth of 256-frame blocks
                self._queues[source] = q
        try:
            q.put_nowait(block.astype(np.float32, copy=True))
        except queue.Full:
            # drop block — recorder is falling behind, prefer not to crash
            log.warning("recorder queue full for %s, dropping block", source)

    # ---------- worker ----------
    def _run(self) -> None:
        """Pull from each source queue, sum, write."""
        while self._active or any(not q.empty() for q in self._queues.values()):
            blocks: list[np.ndarray] = []
            with self._lock:
                queues = list(self._queues.values())
            if not queues:
                time.sleep(0.01)
                continue
            for q in queues:
                try:
                    b = q.get(timeout=0.02)
                    blocks.append(b)
                except queue.Empty:
                    continue
            if not blocks:
                continue
            n = max(b.shape[0] for b in blocks)
            mix = np.zeros((n, 2), dtype=np.float32)
            for b in blocks:
                if b.shape[0] < n:
                    pad = np.zeros((n - b.shape[0], 2), dtype=np.float32)
                    b = np.vstack([b, pad])
                mix += b
            np.clip(mix, -1.0, 1.0, out=mix)
            with self._lock:
                if self._sf:
                    self._sf.write(mix)
                    self._frames_written += mix.shape[0]


# Single shared recorder instance
recorder = Recorder()
