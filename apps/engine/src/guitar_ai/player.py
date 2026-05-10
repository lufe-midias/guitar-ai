"""Stem-aware player. Loads N stems, syncs them on a single cursor, mixes
to stereo with per-stem volume/mute/solo. Loop A-B and varispeed (basic) supported."""
from __future__ import annotations
import threading
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import numpy as np
import soundfile as sf
import sounddevice as sd

from .recorder import recorder

log = logging.getLogger("guitar_ai.player")


@dataclass
class Stem:
    name: str
    path: str
    samples: np.ndarray  # (frames, channels)
    volume: float = 1.0
    muted: bool = False
    solo: bool = False


@dataclass
class PlayerState:
    output_device: Optional[int | str] = None
    sample_rate: float = 48000.0
    block_size: int = 256
    position: int = 0  # frame cursor
    playing: bool = False
    loop_start: Optional[int] = None
    loop_end: Optional[int] = None
    speed: float = 1.0  # 1.0 = normal; varispeed (changes pitch — MVP)
    master_volume: float = 1.0


def _load_stem(path: str, target_sr: float) -> np.ndarray:
    data, sr = sf.read(path, dtype="float32", always_2d=True)
    if sr != target_sr:
        # quick linear resample (MVP). For production: use scipy.signal.resample_poly.
        ratio = target_sr / sr
        new_len = int(round(data.shape[0] * ratio))
        idx = np.linspace(0, data.shape[0] - 1, new_len, dtype=np.float64)
        i0 = np.floor(idx).astype(np.int64)
        i1 = np.minimum(i0 + 1, data.shape[0] - 1)
        frac = (idx - i0).astype(np.float32)[:, None]
        data = (1 - frac) * data[i0] + frac * data[i1]
    if data.shape[1] == 1:
        data = np.repeat(data, 2, axis=1)
    return data.astype(np.float32, copy=False)


class Player:
    def __init__(self) -> None:
        self.state = PlayerState()
        self.stems: dict[str, Stem] = {}
        self._stream: Optional[sd.OutputStream] = None
        self._lock = threading.RLock()
        self._level: float = 0.0
        self._length: int = 0

    # ---------- introspection ----------
    def length_frames(self) -> int:
        return self._length

    def current_position(self) -> int:
        return self.state.position

    def stem_summary(self) -> list[dict]:
        return [
            {"name": s.name, "volume": s.volume, "muted": s.muted, "solo": s.solo}
            for s in self.stems.values()
        ]

    def output_level(self) -> float:
        return float(self._level)

    # ---------- loading ----------
    def load_stems(self, stems: dict[str, str]) -> dict:
        """stems = {name: path}. Returns summary."""
        with self._lock:
            self.unload()
            sr = self.state.sample_rate
            loaded: dict[str, Stem] = {}
            length = 0
            for name, path in stems.items():
                if not Path(path).exists():
                    log.warning("stem missing: %s", path)
                    continue
                samples = _load_stem(path, sr)
                loaded[name] = Stem(name=name, path=path, samples=samples)
                length = max(length, samples.shape[0])
            # pad shorter ones to common length
            for s in loaded.values():
                if s.samples.shape[0] < length:
                    pad = np.zeros((length - s.samples.shape[0], 2), dtype=np.float32)
                    s.samples = np.vstack([s.samples, pad])
            self.stems = loaded
            self._length = length
            self.state.position = 0
            return {"loaded": list(loaded.keys()), "length_frames": length, "sample_rate": sr}

    def unload(self) -> None:
        with self._lock:
            self.stop()
            self.stems = {}
            self._length = 0
            self.state.position = 0
            self.state.loop_start = None
            self.state.loop_end = None

    # ---------- transport ----------
    def play(self, output_device: Optional[int | str] = None) -> None:
        with self._lock:
            if not self.stems:
                raise RuntimeError("no stems loaded")
            if output_device is not None:
                self.state.output_device = output_device
            if self._stream is None:
                self._stream = sd.OutputStream(
                    samplerate=self.state.sample_rate,
                    blocksize=self.state.block_size,
                    dtype="float32",
                    channels=2,
                    device=self.state.output_device,
                    callback=self._callback,
                    latency="low",
                )
                self._stream.start()
            self.state.playing = True

    def pause(self) -> None:
        with self._lock:
            self.state.playing = False

    def stop(self) -> None:
        with self._lock:
            self.state.playing = False
            self.state.position = 0
            if self._stream is not None:
                try:
                    self._stream.stop()
                    self._stream.close()
                except Exception:
                    pass
                self._stream = None

    def seek(self, frame: int) -> None:
        with self._lock:
            self.state.position = max(0, min(frame, self._length))

    def set_loop(self, start: Optional[int], end: Optional[int]) -> None:
        with self._lock:
            self.state.loop_start = start
            self.state.loop_end = end

    def set_speed(self, speed: float) -> None:
        with self._lock:
            self.state.speed = max(0.25, min(2.0, float(speed)))

    def set_master_volume(self, vol: float) -> None:
        with self._lock:
            self.state.master_volume = max(0.0, min(2.0, float(vol)))

    def set_stem_volume(self, name: str, vol: float) -> None:
        with self._lock:
            if name in self.stems:
                self.stems[name].volume = max(0.0, min(2.0, float(vol)))

    def set_stem_muted(self, name: str, muted: bool) -> None:
        with self._lock:
            if name in self.stems:
                self.stems[name].muted = bool(muted)

    def set_stem_solo(self, name: str, solo: bool) -> None:
        with self._lock:
            if name in self.stems:
                self.stems[name].solo = bool(solo)

    # ---------- callback ----------
    def _callback(self, outdata: np.ndarray, frames: int, time_info, status):
        if status:
            log.debug("player status: %s", status)
        if not self.state.playing or not self.stems or self._length == 0:
            outdata.fill(0.0)
            return

        speed = self.state.speed
        # varispeed: read frames * speed source samples, linear-resample to `frames` out
        src_needed = int(round(frames * speed))
        pos = self.state.position
        end = pos + src_needed

        # loop handling
        loop_a, loop_b = self.state.loop_start, self.state.loop_end
        if loop_a is not None and loop_b is not None and loop_b > loop_a:
            if pos >= loop_b:
                pos = loop_a
                self.state.position = loop_a
                end = pos + src_needed

        # any solo'd stems?
        any_solo = any(s.solo for s in self.stems.values())

        mix = np.zeros((src_needed, 2), dtype=np.float32)
        for s in self.stems.values():
            if s.muted:
                continue
            if any_solo and not s.solo:
                continue
            seg = s.samples[pos:end]
            if seg.shape[0] < src_needed:
                # past end — pad with zeros (or we could loop track)
                pad = np.zeros((src_needed - seg.shape[0], 2), dtype=np.float32)
                seg = np.vstack([seg, pad])
            mix += seg * s.volume

        mix *= self.state.master_volume

        if speed != 1.0:
            # linear resample mix → frames samples
            idx = np.linspace(0, src_needed - 1, frames, dtype=np.float64)
            i0 = np.floor(idx).astype(np.int64)
            i1 = np.minimum(i0 + 1, src_needed - 1)
            frac = (idx - i0).astype(np.float32)[:, None]
            mix = (1 - frac) * mix[i0] + frac * mix[i1]

        np.clip(mix, -1.0, 1.0, out=mix)
        outdata[:] = mix

        # advance source cursor
        self.state.position = end
        if loop_a is not None and loop_b is not None and self.state.position >= loop_b:
            self.state.position = loop_a
        if self.state.position >= self._length:
            self.state.playing = False
            self.state.position = self._length

        # vu meter
        rms = float(np.sqrt(np.mean(np.square(mix), dtype=np.float32) + 1e-12))
        a = 0.2
        self._level = a * rms + (1 - a) * self._level

        # feed recorder with player output
        try:
            recorder.feed("player", mix)
        except Exception:
            pass
