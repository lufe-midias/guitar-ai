"""Build macOS .icns from assets/icon.svg.

Output: assets/icon.icns and a wired path in apps/desktop/build/icon.icns
"""
from __future__ import annotations
import shutil
import subprocess
from pathlib import Path

import cairosvg

ROOT = Path(__file__).resolve().parents[1]
SVG = ROOT / "assets" / "icon.svg"
ICNS = ROOT / "assets" / "icon.icns"
WIRED = ROOT / "apps" / "desktop" / "build" / "icon.icns"

ICONSET = ROOT / "assets" / "icon.iconset"

# All required sizes for macOS .icns
SIZES = [
    ("icon_16x16.png", 16),
    ("icon_16x16@2x.png", 32),
    ("icon_32x32.png", 32),
    ("icon_32x32@2x.png", 64),
    ("icon_128x128.png", 128),
    ("icon_128x128@2x.png", 256),
    ("icon_256x256.png", 256),
    ("icon_256x256@2x.png", 512),
    ("icon_512x512.png", 512),
    ("icon_512x512@2x.png", 1024),
]


def main() -> int:
    if ICONSET.exists():
        shutil.rmtree(ICONSET)
    ICONSET.mkdir(parents=True)

    print(f"→ rendering {SVG}")
    for name, size in SIZES:
        out = ICONSET / name
        cairosvg.svg2png(
            url=str(SVG),
            write_to=str(out),
            output_width=size,
            output_height=size,
        )
        print(f"  ✓ {name}  {size}×{size}")

    print(f"\n→ iconutil → {ICNS}")
    rc = subprocess.run(
        ["iconutil", "-c", "icns", str(ICONSET), "-o", str(ICNS)],
    ).returncode
    if rc != 0:
        print(f"iconutil failed (exit {rc})")
        return rc

    WIRED.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ICNS, WIRED)
    print(f"  ✓ wired to {WIRED}")

    size = ICNS.stat().st_size // 1024
    print(f"\n✓ icon.icns ready ({size} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
