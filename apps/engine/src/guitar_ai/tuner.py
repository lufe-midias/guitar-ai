"""Chromatic tuner — autocorrelation pitch detection on the live input.

Runs in a background thread that pulls samples from a ring buffer fed by the
audio callback. Broadcasts results over the websocket at ~20 Hz.
"""
from __future__ import annotations
import logging
import math
import threading
from collections import deque
from dataclasses import dataclass
from typing import Optional

import numpy as np

log = logging.getLogger("guitar_ai.tuner")


NOTE_NAMES = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")
A4 = 440.0


@dataclass
class TunerReading:
    detected: bool
    frequency: float = 0.0
    note: str = ""
    octave: int = 0
    cents: float = 0.0
    rms: float = 0.0


def freq_to_note(freq: float) -> tuple[str, int, float]:
    """Convert frequency to note name + octave + cents offset."""
    if freq <= 0:
        return "", 0, 0.0
    midi = 69 + 12 * math.log2(freq / A4)
    midi_round = int(round(midi))
    cents = (midi - midi_round) * 100
    note = NOTE_NAMES[midi_round % 12]
    octave = (midi_round // 12) - 1
    return note, octave, cents


class Tuner:
    """Pitch detection using normalized autocorrelation with parabolic
    interpolation. Tuned for guitar range (~70 Hz to ~1.5 kHz)."""

    def __init__(self, sample_rate: float = 48000.0, window_ms: float = 200.0) -> None:
        self.sample_rate = float(sample_rate)
        self.window = int(self.sample_rate * window_ms / 1000)
        self._buf: deque[float] = deque(maxlen=self.window * 2)
        self._lock = threading.Lock()
        self._last: TunerReading = TunerReading(detected=False)
        self.min_freq = 70.0   # below low E (82Hz) for drop tunings
        self.max_freq = 1500.0 # above high E (1320Hz)
        self.silence_rms = 0.005

    def feed(self, mono_block: np.ndarray) -> None:
        with self._lock:
            self._buf.extend(mono_block.reshape(-1).tolist())

    def read(self) -> TunerReading:
        with self._lock:
            return self._last

    def analyze(self) -> TunerReading:
        with self._lock:
            if len(self._buf) < self.window:
                return TunerReading(detected=False)
            x = np.fromiter(self._buf, dtype=np.float32)[-self.window:]

        rms = float(np.sqrt(np.mean(x * x) + 1e-12))
        if rms < self.silence_rms:
            r = TunerReading(detected=False, rms=rms)
            with self._lock:
                self._last = r
            return r

        # YIN pitch detection (Cheveigné & Kawahara 2002) — robust at low freq
        # where autocorrelation gets confused by harmonics.
        try:
            import librosa
            f0 = librosa.yin(
                x.astype(np.float32),
                fmin=self.min_freq,
                fmax=self.max_freq,
                sr=self.sample_rate,
                frame_length=len(x),
            )
            # librosa.yin returns array; we have one frame
            freq = float(f0[0]) if hasattr(f0, "__len__") else float(f0)
        except Exception as e:
            log.debug("librosa.yin failed: %s", e)
            r = TunerReading(detected=False, rms=rms)
            with self._lock:
                self._last = r
            return r

        if not (self.min_freq <= freq <= self.max_freq) or not np.isfinite(freq):
            r = TunerReading(detected=False, rms=rms)
            with self._lock:
                self._last = r
            return r

        note, octave, cents = freq_to_note(freq)
        r = TunerReading(detected=True, frequency=freq, note=note, octave=octave, cents=cents, rms=rms)
        with self._lock:
            self._last = r
        return r


# shared instance
tuner = Tuner()
