"""PyInstaller entrypoint — sits at the engine root so it can resolve the
`guitar_ai` package as a regular import (no relative-import shenanigans)."""
import sys
from pathlib import Path

# When frozen, sys._MEIPASS is the unpacked bundle root; src/ sits next to it.
_HERE = Path(__file__).resolve().parent
_SRC = _HERE / "src"
if _SRC.exists():
    sys.path.insert(0, str(_SRC))

from guitar_ai.server import main

if __name__ == "__main__":
    main()
