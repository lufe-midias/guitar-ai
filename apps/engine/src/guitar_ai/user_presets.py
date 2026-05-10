"""User-saved presets — JSON files in ~/Library/Application Support/GuitarAI/presets/."""
from __future__ import annotations
import json
import logging
from pathlib import Path

from .paths import PRESETS, ensure_dirs

log = logging.getLogger("guitar_ai.user_presets")


def list_user_presets() -> list[dict]:
    ensure_dirs()
    out: list[dict] = []
    for p in sorted(PRESETS.glob("*.json")):
        try:
            with open(p, "r") as fp:
                data = json.load(fp)
            data["filename"] = p.name
            out.append(data)
        except Exception as e:
            log.warning("could not parse preset %s: %s", p, e)
    return out


def save_user_preset(name: str, description: str, chain: list[dict], category: str = "user") -> dict:
    ensure_dirs()
    if not name.strip():
        raise ValueError("preset name required")
    safe = "".join(c if c.isalnum() or c in (" ", "-", "_") else "_" for c in name).strip()
    if not safe:
        raise ValueError("preset name produced empty filename")
    path = PRESETS / f"{safe}.json"
    data = {
        "name": name,
        "category": category,
        "description": description,
        "chain": chain,
        "user": True,
    }
    with open(path, "w") as fp:
        json.dump(data, fp, indent=2, ensure_ascii=False)
    log.info("user preset saved: %s", path)
    return {**data, "filename": path.name}


def delete_user_preset(filename: str) -> bool:
    p = PRESETS / Path(filename).name
    if not p.exists():
        return False
    p.unlink()
    return True
