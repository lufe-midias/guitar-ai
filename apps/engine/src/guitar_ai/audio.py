"""Live audio engine. Captures input device, applies a Pedalboard chain, sends to output.

Runs in a dedicated thread so the asyncio server stays responsive.
Latency target on Apple Silicon CoreAudio: <10ms with block_size=128 @ 48kHz.
"""
from __future__ import annotations
import threading
import queue
import logging
from dataclasses import dataclass, field
from typing import Optional, Any

import numpy as np
import sounddevice as sd
from pedalboard import (
    Pedalboard, Compressor, Distortion, Reverb, Delay, Chorus, Phaser, Gain,
    HighpassFilter, LowpassFilter, PeakFilter, NoiseGate, Convolution,
    Bitcrush, Clipping, HighShelfFilter, LowShelfFilter, IIRFilter,
    Invert, LadderFilter, Limiter, MP3Compressor, GSMFullRateCompressor,
    PitchShift, Resample,
)

from .nam import NamRuntime
from .recorder import recorder
from .tuner import tuner

log = logging.getLogger("guitar_ai.audio")


PEDAL_BUILDERS: dict[str, type] = {
    "Compressor": Compressor,
    "Distortion": Distortion,
    "Reverb": Reverb,
    "Delay": Delay,
    "Chorus": Chorus,
    "Phaser": Phaser,
    "Gain": Gain,
    "HighpassFilter": HighpassFilter,
    "LowpassFilter": LowpassFilter,
    "PeakFilter": PeakFilter,
    "NoiseGate": NoiseGate,
    "Convolution": Convolution,
    "Bitcrush": Bitcrush,
    "Clipping": Clipping,
    "HighShelfFilter": HighShelfFilter,
    "LowShelfFilter": LowShelfFilter,
    "IIRFilter": IIRFilter,
    "Invert": Invert,
    "LadderFilter": LadderFilter,
    "Limiter": Limiter,
    "MP3Compressor": MP3Compressor,
    "GSMFullRateCompressor": GSMFullRateCompressor,
    "PitchShift": PitchShift,
    "Resample": Resample,
}


def build_chain(spec: list[dict]) -> Pedalboard:
    plugins = []
    for entry in spec:
        if entry.get("bypass"):
            continue
        kind = entry["type"]
        params = entry.get("params", {}) or {}
        cls = PEDAL_BUILDERS.get(kind)
        if cls is None:
            log.warning("unknown pedal %s, skipping", kind)
            continue
        try:
            plugins.append(cls(**params))
        except Exception as e:
            log.warning("failed to build %s: %s", kind, e)
    return Pedalboard(plugins)


@dataclass
class AudioState:
    input_device: Optional[int | str] = None
    output_device: Optional[int | str] = None
    sample_rate: float = 48000.0
    block_size: int = 128
    chain_spec: list[dict] = field(default_factory=list)
    input_gain: float = 1.0
    output_gain: float = 1.0
    monitoring: bool = False


class LiveAudio:
    """Sounddevice duplex stream with hot-swappable Pedalboard chain.

    Chain swaps lock-free: producer thread (the audio callback) reads the
    current Pedalboard via an atomic reference (`self._chain`); set_chain just
    rebinds it. Pedalboard's apply runs in C++ so the GIL is released.
    """

    def __init__(self) -> None:
        self.state = AudioState()
        self._chain: Pedalboard = Pedalboard([])
        self._stream: Optional[sd.Stream] = None
        self._lock = threading.RLock()
        # rolling RMS for the UI vu meter
        self._level_in: float = 0.0
        self._level_out: float = 0.0
        # NAM amp simulator runs before the FX chain
        self.nam = NamRuntime()

    # ---------- introspection ----------
    @staticmethod
    def list_devices() -> list[dict]:
        devices = sd.query_devices()
        out = []
        default_in, default_out = sd.default.device
        for idx, d in enumerate(devices):
            out.append({
                "index": idx,
                "name": d["name"],
                "hostapi": d["hostapi"],
                "max_input_channels": d["max_input_channels"],
                "max_output_channels": d["max_output_channels"],
                "default_samplerate": d["default_samplerate"],
                "is_default_input": idx == default_in,
                "is_default_output": idx == default_out,
            })
        return out

    def levels(self) -> dict:
        return {"input": float(self._level_in), "output": float(self._level_out)}

    # ---------- chain control ----------
    def set_chain(self, spec: list[dict]) -> None:
        with self._lock:
            self.state.chain_spec = list(spec)
            self._chain = build_chain(spec)
            log.info("chain swapped: %d pedals", len(self._chain))

    def set_gain(self, *, input_gain: Optional[float] = None, output_gain: Optional[float] = None) -> None:
        with self._lock:
            if input_gain is not None:
                self.state.input_gain = max(0.0, min(4.0, float(input_gain)))
            if output_gain is not None:
                self.state.output_gain = max(0.0, min(4.0, float(output_gain)))

    # ---------- monitor lifecycle ----------
    def start(
        self,
        input_device: Optional[int | str] = None,
        output_device: Optional[int | str] = None,
        sample_rate: Optional[float] = None,
        block_size: Optional[int] = None,
    ) -> None:
        self.stop()
        with self._lock:
            if input_device is not None:
                self.state.input_device = input_device
            if output_device is not None:
                self.state.output_device = output_device
            if sample_rate is not None:
                self.state.sample_rate = float(sample_rate)
            if block_size is not None:
                self.state.block_size = int(block_size)

            sr = self.state.sample_rate
            block = self.state.block_size

            stream = sd.Stream(
                samplerate=sr,
                blocksize=block,
                dtype="float32",
                channels=(1, 2),  # mono in (guitar), stereo out
                device=(self.state.input_device, self.state.output_device),
                callback=self._callback,
                latency="low",
            )
            stream.start()
            self._stream = stream
            self.state.monitoring = True
            log.info("audio started sr=%.0f block=%d in=%s out=%s",
                     sr, block, self.state.input_device, self.state.output_device)

    def stop(self) -> None:
        with self._lock:
            if self._stream is not None:
                try:
                    self._stream.stop()
                    self._stream.close()
                except Exception:
                    pass
                self._stream = None
            self.state.monitoring = False
            self._level_in = 0.0
            self._level_out = 0.0

    # ---------- audio callback ----------
    def _callback(self, indata: np.ndarray, outdata: np.ndarray, frames: int, time_info, status):
        if status:
            log.debug("audio status: %s", status)

        # mono guitar in
        x = indata[:, 0:1].astype(np.float32, copy=False) * self.state.input_gain

        # 1) NAM amp simulation (mono → mono, before FX chain)
        if self.nam.is_loaded():
            try:
                x = self.nam.process(x)
            except Exception:
                pass

        # 2) Pedalboard FX chain (pre/post amp colour: EQ, comp, time, IR cab, etc.)
        chain = self._chain  # atomic-ish: assignment in set_chain swaps the binding
        try:
            y = chain.process(x.T, self.state.sample_rate, reset=False).T  # (frames, 1)
        except Exception:
            y = x

        # mono → stereo
        if y.shape[1] == 1:
            y = np.repeat(y, 2, axis=1)
        elif y.shape[1] > 2:
            y = y[:, :2]

        y *= self.state.output_gain
        np.clip(y, -1.0, 1.0, out=y)
        outdata[:] = y

        # cheap rolling rms for UI
        rms_in = float(np.sqrt(np.mean(np.square(x), dtype=np.float32) + 1e-12))
        rms_out = float(np.sqrt(np.mean(np.square(y), dtype=np.float32) + 1e-12))
        a = 0.2
        self._level_in = a * rms_in + (1 - a) * self._level_in
        self._level_out = a * rms_out + (1 - a) * self._level_out

        # feed tuner with mono input + recorder with processed stereo output
        try:
            tuner.feed(indata[:, 0])
        except Exception:
            pass
        try:
            recorder.feed("monitor", y)
        except Exception:
            pass
