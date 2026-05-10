"""PyInstaller build script.

Bundles the Python engine into a standalone macOS binary at
apps/engine/dist/guitar-ai-engine/. Electron-builder then includes that
folder as extraResources so the .dmg is fully self-contained.

Run from apps/engine/:
    python build_engine.py
"""
from __future__ import annotations
import shutil
import subprocess
import sys
from pathlib import Path


HERE = Path(__file__).resolve().parent
SRC = HERE / "run_engine.py"
DIST = HERE / "dist"
WORK = HERE / "build"
SPEC = HERE / "guitar-ai-engine.spec"


def main() -> int:
    if DIST.exists():
        shutil.rmtree(DIST)
    if WORK.exists():
        shutil.rmtree(WORK)

    # Hidden imports — PyInstaller's static analysis misses lazy imports
    # in torch / demucs / librosa.
    hidden = [
        "guitar_ai",
        "guitar_ai.server",
        "guitar_ai.audio",
        "guitar_ai.player",
        "guitar_ai.stems",
        "guitar_ai.download",
        "guitar_ai.library",
        "guitar_ai.presets",
        "guitar_ai.recorder",
        "guitar_ai.tuner",
        "guitar_ai.user_presets",
        "guitar_ai.nam",
        "guitar_ai.irs",
        "guitar_ai.paths",
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "soundfile",
        "sounddevice",
        "pedalboard",
        "demucs.separate",
        "torchaudio",
        "torchcodec",
        "librosa",
    ]
    excludes = [
        "tkinter",
        "matplotlib",
        "PIL",
        "IPython",
        "jupyter",
        "notebook",
        "pytest",
    ]

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--name", "guitar-ai-engine",
        "--onedir",
        "--console",  # so we can read logs from the spawned process
        "--paths", str(HERE / "src"),
        "--distpath", str(DIST),
        "--workpath", str(WORK),
        "--specpath", str(HERE),
        # Pull in CLI binaries that we shell out to:
        "--collect-binaries", "torch",
        "--collect-binaries", "torchaudio",
        "--collect-binaries", "torchcodec",
        "--collect-data", "demucs",
        "--collect-data", "torch",
        "--collect-data", "librosa",
    ]
    for h in hidden:
        cmd.extend(["--hidden-import", h])
    for x in excludes:
        cmd.extend(["--exclude-module", x])

    cmd.append(str(SRC))

    print("→ running PyInstaller…")
    print("  " + " ".join(cmd))
    rc = subprocess.run(cmd, cwd=HERE).returncode
    if rc != 0:
        print(f"PyInstaller failed (exit {rc})")
        return rc

    out = DIST / "guitar-ai-engine"
    if not out.exists():
        print(f"expected output not found: {out}")
        return 1

    size_mb = sum(p.stat().st_size for p in out.rglob("*") if p.is_file()) // (1024 * 1024)
    print(f"\n✓ engine bundle ready at {out} ({size_mb} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
