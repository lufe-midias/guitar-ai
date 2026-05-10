"""Cabinet impulse responses — just a directory listing helper.

Pedalboard's Convolution plugin already loads .wav IRs natively. We just need
to track which files exist and their metadata so the UI can list them.
"""
from __future__ import annotations
import logging
from pathlib import Path

import soundfile as sf

from .paths import IRS, ensure_dirs

log = logging.getLogger("guitar_ai.irs")


def list_irs() -> list[dict]:
    ensure_dirs()
    entries: list[dict] = []
    for p in sorted(IRS.glob("*")):
        if p.suffix.lower() not in (".wav", ".aif", ".aiff", ".flac"):
            continue
        try:
            info = sf.info(str(p))
            entries.append({
                "filename": p.name,
                "path": str(p),
                "sample_rate": int(info.samplerate),
                "channels": int(info.channels),
                "frames": int(info.frames),
                "duration_ms": int(info.frames / info.samplerate * 1000),
                "size_kb": p.stat().st_size // 1024,
            })
        except Exception as e:
            log.warning("could not parse IR %s: %s", p, e)
    return entries
