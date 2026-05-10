"""NAM (Neural Amp Modeler) integration.

Loads .nam files and runs them on-the-fly in the audio callback. Models live in
~/Library/Application Support/GuitarAI/nam_models/ — drop a file there and call
load_model(path) to swap the active amp.
"""
from __future__ import annotations
import json
import logging
import threading
from pathlib import Path
from typing import Optional

import numpy as np
import torch

from .paths import NAM_MODELS, ensure_dirs

log = logging.getLogger("guitar_ai.nam")


class NamRuntime:
    """Holds an active NAM model and runs inference per-block."""

    def __init__(self) -> None:
        self._model = None  # nam BaseNet
        self._device = self._best_device()
        self._lock = threading.Lock()
        self.current_path: Optional[str] = None
        self.metadata: dict = {}
        self.input_gain: float = 1.0
        self.output_gain: float = 1.0
        self.bypass: bool = False

    @staticmethod
    def _best_device() -> str:
        if torch.backends.mps.is_available():
            return "mps"
        if torch.cuda.is_available():
            return "cuda"
        return "cpu"

    def load(self, path: str | Path) -> dict:
        """Load a .nam file and return metadata."""
        from nam.models import init_from_nam

        p = Path(path)
        if not p.exists():
            raise FileNotFoundError(p)
        with open(p, "r") as fp:
            config = json.load(fp)
        model = init_from_nam(config)
        model.eval()
        try:
            model.to(self._device)
        except Exception:
            log.warning("NAM model could not move to %s; falling back to cpu", self._device)
            self._device = "cpu"
            model.to("cpu")

        meta = {
            "name": config.get("metadata", {}).get("name") or p.stem,
            "author": config.get("metadata", {}).get("author"),
            "modeled_by": config.get("metadata", {}).get("modeled_by"),
            "sample_rate": config.get("metadata", {}).get("sample_rate", 48000),
            "device": self._device,
            "path": str(p),
        }
        with self._lock:
            self._model = model
            self.current_path = str(p)
            self.metadata = meta
        log.info("NAM loaded: %s (device=%s)", meta["name"], self._device)
        return meta

    def unload(self) -> None:
        with self._lock:
            self._model = None
            self.current_path = None
            self.metadata = {}

    def is_loaded(self) -> bool:
        return self._model is not None

    @torch.no_grad()
    def process(self, x: np.ndarray) -> np.ndarray:
        """Process mono float32 (frames, 1) → (frames, 1)."""
        if self._model is None or self.bypass:
            return x
        flat = x.reshape(-1).astype(np.float32, copy=False) * self.input_gain
        t = torch.from_numpy(flat).to(self._device)
        try:
            y = self._model(t)
        except Exception as e:
            log.warning("NAM inference failed: %s", e)
            return x
        out = y.detach().cpu().numpy().astype(np.float32, copy=False)
        out *= self.output_gain
        # NAM models are mono; return as (frames, 1)
        return out.reshape(-1, 1)


def list_models() -> list[dict]:
    """Scan the NAM models dir."""
    ensure_dirs()
    entries = []
    for p in sorted(NAM_MODELS.glob("*.nam")):
        try:
            with open(p, "r") as fp:
                cfg = json.load(fp)
            md = cfg.get("metadata", {})
            entries.append({
                "name": md.get("name") or p.stem,
                "author": md.get("author"),
                "modeled_by": md.get("modeled_by"),
                "sample_rate": md.get("sample_rate", 48000),
                "filename": p.name,
                "path": str(p),
                "size_kb": p.stat().st_size // 1024,
            })
        except Exception as e:
            log.warning("could not parse %s: %s", p, e)
    return entries
