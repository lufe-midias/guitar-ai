"""Filesystem paths used by the engine. All data lives under ~/Library/Application Support/GuitarAI on macOS."""
from __future__ import annotations
import os
import sys
from pathlib import Path


def _default_root() -> Path:
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / "GuitarAI"
    if sys.platform.startswith("win"):
        return Path(os.environ.get("APPDATA", str(Path.home()))) / "GuitarAI"
    return Path(os.environ.get("XDG_DATA_HOME", str(Path.home() / ".local" / "share"))) / "guitar-ai"


ROOT = Path(os.environ.get("GUITAR_AI_DATA", _default_root()))
DOWNLOADS = ROOT / "downloads"
STEMS = ROOT / "stems"
PROJECTS = ROOT / "projects"
CACHE = ROOT / "cache"
PRESETS = ROOT / "presets"
IRS = ROOT / "irs"
NAM_MODELS = ROOT / "nam_models"
DB_PATH = ROOT / "library.db"


def ensure_dirs() -> None:
    for p in (ROOT, DOWNLOADS, STEMS, PROJECTS, CACHE, PRESETS, IRS, NAM_MODELS):
        p.mkdir(parents=True, exist_ok=True)
