"""Stem separation via Demucs (htdemucs_6s isolates guitar separately).

Runs in a worker thread (Demucs releases the GIL during torch ops). MPS-aware
on Apple Silicon — uses Metal Performance Shaders if available, else CPU.
"""
from __future__ import annotations
import asyncio
import logging
import shutil
import sys
from pathlib import Path
from typing import Awaitable, Callable, Optional

import torch

from .paths import STEMS, ensure_dirs

log = logging.getLogger("guitar_ai.stems")

ProgressCb = Callable[[dict], Awaitable[None]]

# htdemucs_6s — 6 stems including isolated guitar (drums/bass/vocals/guitar/piano/other)
# htdemucs_ft — 4 stems (drums/bass/vocals/other) — fastest
DEFAULT_MODEL = "htdemucs_6s"
ALT_MODEL = "htdemucs_ft"

STEM_NAMES_6S = ("drums", "bass", "vocals", "guitar", "piano", "other")
STEM_NAMES_4S = ("drums", "bass", "vocals", "other")


def best_device() -> str:
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


async def separate(
    audio_path: Path,
    model: str = DEFAULT_MODEL,
    cb: Optional[ProgressCb] = None,
    out_root: Path = STEMS,
) -> dict:
    """Returns {model, stems_dir, stems: {drums: <path>, bass: <path>, ...}}."""
    ensure_dirs()
    audio_path = Path(audio_path)
    if not audio_path.exists():
        raise FileNotFoundError(audio_path)

    device = best_device()
    if cb:
        await cb({"event": "stage", "stage": "separating", "model": model, "device": device})

    cmd = [
        sys.executable, "-m", "demucs",
        "-n", model,
        "-d", device,
        "-o", str(out_root),
        str(audio_path),
    ]
    if cb:
        await cb({"event": "log", "source": "demucs", "line": " ".join(cmd)})

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    assert proc.stdout is not None
    last_lines: list[str] = []
    # demucs prints progress with \r so we read by chunks not lines
    while True:
        chunk = await proc.stdout.read(4096)
        if not chunk:
            break
        text = chunk.decode(errors="replace")
        for piece in text.replace("\r", "\n").split("\n"):
            piece = piece.strip()
            if not piece:
                continue
            log.debug("[demucs] %s", piece)
            last_lines.append(piece)
            if len(last_lines) > 30:
                last_lines.pop(0)
            if cb:
                # send only short lines (skip noisy progress bars)
                if len(piece) < 200:
                    await cb({"event": "log", "source": "demucs", "line": piece})
            if "%" in piece:
                try:
                    pct_token = piece.split("%")[0].strip().split()[-1]
                    pct = float(pct_token)
                    if cb:
                        await cb({"event": "progress", "source": "demucs", "percent": pct})
                except Exception:
                    pass
    rc = await proc.wait()
    if rc != 0:
        tail = "\n".join(last_lines[-10:])
        raise RuntimeError(f"demucs falhou (exit {rc}): {tail}")

    # demucs writes to <out_root>/<model>/<track_stem>/<stem>.wav
    stems_dir = out_root / model / audio_path.stem
    if not stems_dir.exists():
        raise RuntimeError(f"diretório de stems não encontrado: {stems_dir}")

    expected = STEM_NAMES_6S if model == "htdemucs_6s" else STEM_NAMES_4S
    stems: dict[str, str] = {}
    for name in expected:
        p = stems_dir / f"{name}.wav"
        if p.exists():
            stems[name] = str(p)
        else:
            log.warning("stem ausente: %s", p)

    # tidy: move stems_dir under our STEMS root with track stem name only.
    # Demucs places at <out_root>/<model>/<stem>; flatten to <out_root>/<stem>.
    final_dir = out_root / audio_path.stem
    if final_dir.resolve() != stems_dir.resolve():
        if final_dir.exists():
            shutil.rmtree(final_dir)
        shutil.move(str(stems_dir), str(final_dir))
        try:
            (out_root / model).rmdir()
        except OSError:
            pass
        stems = {k: str(final_dir / Path(v).name) for k, v in stems.items()}
        stems_dir = final_dir

    return {"model": model, "device": device, "stems_dir": str(stems_dir), "stems": stems}
