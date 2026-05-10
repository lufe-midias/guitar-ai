"""SQLite-backed song library."""
from __future__ import annotations
import json
import time
from dataclasses import dataclass, asdict
from typing import Optional

import aiosqlite

from .paths import DB_PATH, ensure_dirs


SCHEMA = """
CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_url TEXT,
    title TEXT NOT NULL,
    artist TEXT,
    album TEXT,
    duration_sec REAL,
    bpm REAL,
    key TEXT,
    cover_path TEXT,
    audio_path TEXT NOT NULL,
    stems_dir TEXT,
    stem_model TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_songs_status ON songs(status);
CREATE INDEX IF NOT EXISTS idx_songs_created ON songs(created_at DESC);

CREATE TABLE IF NOT EXISTS presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    chain_json TEXT NOT NULL,
    builtin INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);
"""


@dataclass
class Song:
    id: int
    source_url: Optional[str]
    title: str
    artist: Optional[str]
    album: Optional[str]
    duration_sec: Optional[float]
    bpm: Optional[float]
    key: Optional[str]
    cover_path: Optional[str]
    audio_path: str
    stems_dir: Optional[str]
    stem_model: Optional[str]
    status: str  # pending | downloading | separating | ready | error
    error: Optional[str]
    created_at: int
    updated_at: int

    def to_dict(self) -> dict:
        return asdict(self)


def _now() -> int:
    return int(time.time())


class Library:
    def __init__(self, db_path=DB_PATH) -> None:
        self.db_path = db_path

    async def init(self) -> None:
        ensure_dirs()
        async with aiosqlite.connect(self.db_path) as db:
            await db.executescript(SCHEMA)
            await db.commit()

    async def list_songs(self, limit: int = 200) -> list[dict]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute(
                "SELECT * FROM songs ORDER BY created_at DESC LIMIT ?", (limit,)
            )
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

    async def get_song(self, song_id: int) -> Optional[dict]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute("SELECT * FROM songs WHERE id = ?", (song_id,))
            row = await cur.fetchone()
            return dict(row) if row else None

    async def insert_song(
        self,
        title: str,
        audio_path: str,
        source_url: Optional[str] = None,
        artist: Optional[str] = None,
        album: Optional[str] = None,
        duration_sec: Optional[float] = None,
        cover_path: Optional[str] = None,
        status: str = "pending",
    ) -> int:
        now = _now()
        async with aiosqlite.connect(self.db_path) as db:
            cur = await db.execute(
                """INSERT INTO songs(source_url,title,artist,album,duration_sec,cover_path,audio_path,status,created_at,updated_at)
                   VALUES(?,?,?,?,?,?,?,?,?,?)""",
                (source_url, title, artist, album, duration_sec, cover_path, audio_path, status, now, now),
            )
            await db.commit()
            return cur.lastrowid or 0

    async def update_song(self, song_id: int, **fields) -> None:
        if not fields:
            return
        fields["updated_at"] = _now()
        cols = ", ".join(f"{k} = ?" for k in fields.keys())
        values = list(fields.values()) + [song_id]
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(f"UPDATE songs SET {cols} WHERE id = ?", values)
            await db.commit()

    async def delete_song(self, song_id: int) -> None:
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM songs WHERE id = ?", (song_id,))
            await db.commit()
