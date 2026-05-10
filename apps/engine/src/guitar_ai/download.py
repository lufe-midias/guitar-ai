"""Music download — Spotify URLs via spotdl, YouTube/etc via yt-dlp.

Both run as subprocesses so a CLI bug never crashes our process.
Both stream progress lines to a callback so the UI can show a progress bar.
"""
from __future__ import annotations
import asyncio
import json
import logging
import re
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Awaitable, Callable, Optional

from .paths import DOWNLOADS, ensure_dirs

log = logging.getLogger("guitar_ai.download")

ProgressCb = Callable[[dict], Awaitable[None]]

SPOTIFY_RE = re.compile(r"open\.spotify\.com/(track|album|playlist)/")
YOUTUBE_RE = re.compile(r"(youtube\.com|youtu\.be|music\.youtube\.com)")


def detect_kind(url: str) -> str:
    if SPOTIFY_RE.search(url):
        return "spotify"
    if YOUTUBE_RE.search(url):
        return "youtube"
    return "generic"


@dataclass
class DownloadResult:
    audio_path: Path
    title: str
    artist: Optional[str]
    album: Optional[str]
    duration_sec: Optional[float]
    cover_path: Optional[Path]
    raw_metadata: dict


async def _emit(cb: Optional[ProgressCb], event: str, **fields) -> None:
    if cb is None:
        return
    try:
        await cb({"event": event, **fields})
    except Exception:
        log.exception("progress callback raised")


async def _run_streaming(cmd: list[str], cb: Optional[ProgressCb], tag: str) -> int:
    log.info("running %s: %s", tag, " ".join(cmd))
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    assert proc.stdout is not None
    async for line in proc.stdout:
        text = line.decode(errors="replace").rstrip()
        if not text:
            continue
        log.debug("[%s] %s", tag, text)
        await _emit(cb, "log", source=tag, line=text)
        # parse percent if any
        m = re.search(r"(\d{1,3})\.\d+%|(\d{1,3})%", text)
        if m:
            pct = float(m.group(1) or m.group(2))
            await _emit(cb, "progress", source=tag, percent=pct, line=text)
    rc = await proc.wait()
    return rc


async def download_youtube(url: str, dest: Path, cb: Optional[ProgressCb] = None) -> DownloadResult:
    """Download via yt-dlp into dest dir. Audio extracted to mp3."""
    ensure_dirs()
    dest.mkdir(parents=True, exist_ok=True)
    out_template = str(dest / "%(title).200B [%(id)s].%(ext)s")

    if not shutil.which("yt-dlp"):
        raise RuntimeError("yt-dlp não encontrado no PATH (pip install yt-dlp)")

    cmd = [
        "yt-dlp",
        "-x", "--audio-format", "mp3", "--audio-quality", "0",
        "--embed-thumbnail", "--add-metadata",
        "--no-playlist",
        "--print-json",
        "-o", out_template,
        url,
    ]

    info_json: dict = {}
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    assert proc.stdout is not None and proc.stderr is not None
    stdout_chunks: list[bytes] = []

    async def pump_stderr():
        assert proc.stderr is not None
        async for line in proc.stderr:
            text = line.decode(errors="replace").rstrip()
            if not text:
                continue
            await _emit(cb, "log", source="yt-dlp", line=text)
            m = re.search(r"\[download\]\s+(\d{1,3}\.\d)%", text)
            if m:
                await _emit(cb, "progress", source="yt-dlp", percent=float(m.group(1)), line=text)

    pump_task = asyncio.create_task(pump_stderr())
    while True:
        chunk = await proc.stdout.read(65536)
        if not chunk:
            break
        stdout_chunks.append(chunk)
    await pump_task
    rc = await proc.wait()
    if rc != 0:
        raise RuntimeError(f"yt-dlp falhou (exit {rc})")

    raw = b"".join(stdout_chunks).decode(errors="replace").strip()
    # yt-dlp may print multiple json lines; take last
    last_line = raw.splitlines()[-1] if raw else "{}"
    try:
        info_json = json.loads(last_line)
    except json.JSONDecodeError:
        info_json = {}

    title = info_json.get("title") or "Unknown"
    vid = info_json.get("id", "")
    safe_title = re.sub(r"[^\w\-_. ()]", "", title)[:200]
    audio_path = dest / f"{safe_title} [{vid}].mp3"
    if not audio_path.exists():
        # fallback — pick newest mp3 in dir
        candidates = sorted(dest.glob("*.mp3"), key=lambda p: p.stat().st_mtime, reverse=True)
        if not candidates:
            raise RuntimeError("Download terminou mas nenhum mp3 foi encontrado")
        audio_path = candidates[0]

    return DownloadResult(
        audio_path=audio_path,
        title=title,
        artist=info_json.get("uploader") or info_json.get("artist"),
        album=info_json.get("album"),
        duration_sec=info_json.get("duration"),
        cover_path=None,
        raw_metadata=info_json,
    )


async def download_spotify(url: str, dest: Path, cb: Optional[ProgressCb] = None) -> DownloadResult:
    """Download via spotdl — fetches metadata from Spotify, audio from YouTube Music."""
    ensure_dirs()
    dest.mkdir(parents=True, exist_ok=True)
    if not shutil.which("spotdl"):
        raise RuntimeError("spotdl não encontrado (pip install spotdl)")

    out_template = str(dest / "{title} - {artist}.{output-ext}")
    cmd = [
        "spotdl",
        "--output", out_template,
        "--format", "mp3",
        "--bitrate", "320k",
        "download", url,
    ]
    rc = await _run_streaming(cmd, cb, "spotdl")
    if rc != 0:
        raise RuntimeError(f"spotdl falhou (exit {rc})")

    candidates = sorted(dest.glob("*.mp3"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not candidates:
        raise RuntimeError("spotdl terminou mas nenhum mp3 foi encontrado")
    audio_path = candidates[0]

    # parse "Title - Artist.mp3"
    base = audio_path.stem
    if " - " in base:
        title, artist = base.split(" - ", 1)
    else:
        title, artist = base, None

    return DownloadResult(
        audio_path=audio_path,
        title=title,
        artist=artist,
        album=None,
        duration_sec=None,
        cover_path=None,
        raw_metadata={"source": "spotify", "url": url},
    )


async def download(url: str, cb: Optional[ProgressCb] = None) -> DownloadResult:
    kind = detect_kind(url)
    dest = DOWNLOADS / kind
    await _emit(cb, "stage", stage="downloading", kind=kind)
    if kind == "spotify":
        return await download_spotify(url, dest, cb)
    return await download_youtube(url, dest, cb)
