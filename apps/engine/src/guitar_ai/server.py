"""FastAPI + WebSocket server bridging the React UI to the audio engine."""
from __future__ import annotations
import asyncio
import json
import logging
import shutil
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Optional

from pathlib import Path as _P  # noqa

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Body, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from .audio import LiveAudio
from .download import download
from .irs import list_irs
from .library import Library
from .nam import list_models as list_nam_models
from .paths import IRS, NAM_MODELS, ROOT, STEMS, ensure_dirs
from .player import Player
from .presets import BUILTIN_PRESETS, get_preset, list_presets, list_pedals, list_categories
from .recorder import recorder
from .stems import separate, DEFAULT_MODEL
from .tuner import tuner
from .user_presets import list_user_presets, save_user_preset, delete_user_preset

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(name)s %(message)s",
)
log = logging.getLogger("guitar_ai.server")


# ---------- broadcast hub ----------
class Hub:
    def __init__(self) -> None:
        self.clients: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def add(self, ws: WebSocket) -> None:
        async with self._lock:
            self.clients.add(ws)

    async def remove(self, ws: WebSocket) -> None:
        async with self._lock:
            self.clients.discard(ws)

    async def broadcast(self, message: dict) -> None:
        if not self.clients:
            return
        payload = json.dumps(message, ensure_ascii=False)
        dead: list[WebSocket] = []
        for ws in list(self.clients):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.remove(ws)


# ---------- app singletons ----------
hub = Hub()
library = Library()
live = LiveAudio()
player = Player()
_jobs: dict[str, asyncio.Task] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_dirs()
    await library.init()
    log.info("Guitar AI engine ready")
    # background level pump for UI
    pump = asyncio.create_task(_pump_levels())
    try:
        yield
    finally:
        pump.cancel()
        live.stop()
        player.stop()


async def _pump_levels() -> None:
    while True:
        try:
            await asyncio.sleep(0.05)  # 20 Hz
            t = tuner.analyze() if live.state.monitoring else None
            await hub.broadcast({
                "event": "levels",
                "live": live.levels(),
                "player": {"output": player.output_level(), "position": player.current_position(), "playing": player.state.playing},
                "tuner": {
                    "detected": t.detected if t else False,
                    "frequency": t.frequency if t else 0,
                    "note": t.note if t else "",
                    "octave": t.octave if t else 0,
                    "cents": t.cents if t else 0,
                    "rms": t.rms if t else 0,
                } if t else None,
                "recorder": {
                    "active": recorder.is_recording,
                    "duration_sec": recorder.status["duration_sec"],
                },
            })
        except asyncio.CancelledError:
            return
        except Exception:
            log.exception("level pump")
            await asyncio.sleep(0.5)


app = FastAPI(title="Guitar AI Engine", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- request models ----------
class ImportSongIn(BaseModel):
    url: str
    model: Optional[str] = None  # demucs model


class GainIn(BaseModel):
    input_gain: Optional[float] = None
    output_gain: Optional[float] = None


class StartMonitorIn(BaseModel):
    input_device: Optional[Any] = None
    output_device: Optional[Any] = None
    sample_rate: Optional[float] = 48000.0
    block_size: Optional[int] = 128


class ChainIn(BaseModel):
    chain: list[dict]


class PlayIn(BaseModel):
    output_device: Optional[Any] = None


class SeekIn(BaseModel):
    frame: int


class LoopIn(BaseModel):
    start: Optional[int] = None
    end: Optional[int] = None


class SpeedIn(BaseModel):
    speed: float


class StemControlIn(BaseModel):
    volume: Optional[float] = None
    muted: Optional[bool] = None
    solo: Optional[bool] = None


# ---------- meta ----------
@app.get("/health")
async def health():
    return {"ok": True, "version": "0.1.0", "ts": time.time()}


# ---------- onboarding ----------
ONBOARDING_FILE = ROOT / "onboarding.json"


@app.get("/onboarding")
async def onboarding_get():
    import json as _json
    if ONBOARDING_FILE.exists():
        try:
            with open(ONBOARDING_FILE, "r") as fp:
                return _json.load(fp)
        except Exception:
            pass
    return {"completed": False, "version": None, "completed_at": None}


@app.post("/onboarding/complete")
async def onboarding_complete(payload: dict = Body(default=None)):
    import json as _json
    ensure_dirs()
    data = {
        "completed": True,
        "version": "0.1.0",
        "completed_at": time.time(),
        "preferences": (payload or {}).get("preferences", {}),
    }
    with open(ONBOARDING_FILE, "w") as fp:
        _json.dump(data, fp, indent=2)
    return {"ok": True, **data}


@app.post("/onboarding/reset")
async def onboarding_reset():
    if ONBOARDING_FILE.exists():
        ONBOARDING_FILE.unlink()
    return {"ok": True}


@app.get("/devices")
async def devices():
    return {"devices": LiveAudio.list_devices()}


@app.get("/presets")
async def presets():
    return {"presets": list_presets(), "categories": list_categories()}


@app.get("/pedals")
async def pedals():
    return {"pedals": list_pedals()}


@app.get("/preset/{name}")
async def preset_one(name: str):
    if name not in BUILTIN_PRESETS:
        raise HTTPException(404, "preset not found")
    return get_preset(name)


# ---------- library ----------
@app.get("/songs")
async def songs():
    return {"songs": await library.list_songs()}


@app.get("/songs/{song_id}")
async def song_one(song_id: int):
    s = await library.get_song(song_id)
    if not s:
        raise HTTPException(404, "song not found")
    return s


@app.delete("/songs/{song_id}")
async def song_delete(song_id: int):
    s = await library.get_song(song_id)
    if not s:
        raise HTTPException(404, "song not found")
    if s.get("stems_dir"):
        shutil.rmtree(s["stems_dir"], ignore_errors=True)
    if s.get("audio_path") and Path(s["audio_path"]).exists():
        try:
            Path(s["audio_path"]).unlink()
        except OSError:
            pass
    await library.delete_song(song_id)
    await hub.broadcast({"event": "song_deleted", "id": song_id})
    return {"ok": True}


# ---------- import pipeline ----------
async def _process_import(url: str, model: str) -> None:
    song_id: Optional[int] = None
    try:
        async def cb(evt: dict) -> None:
            await hub.broadcast({"event": "import_progress", "song_id": song_id, **evt})

        await cb({"event": "stage", "stage": "starting", "url": url})
        result = await download(url, cb)

        song_id = await library.insert_song(
            title=result.title,
            audio_path=str(result.audio_path),
            source_url=url,
            artist=result.artist,
            album=result.album,
            duration_sec=result.duration_sec,
            cover_path=str(result.cover_path) if result.cover_path else None,
            status="separating",
        )
        await hub.broadcast({"event": "song_added", "song_id": song_id, "title": result.title})

        sep = await separate(result.audio_path, model=model, cb=cb)
        await library.update_song(
            song_id,
            stems_dir=sep["stems_dir"],
            stem_model=sep["model"],
            status="ready",
        )
        await hub.broadcast({"event": "song_ready", "song_id": song_id, "stems": list(sep["stems"].keys())})
    except Exception as e:
        log.exception("import failed")
        if song_id is not None:
            await library.update_song(song_id, status="error", error=str(e))
        await hub.broadcast({"event": "import_error", "song_id": song_id, "error": str(e)})


@app.post("/songs/import")
async def songs_import(payload: ImportSongIn):
    model = payload.model or DEFAULT_MODEL
    job_id = f"import-{time.time()}"
    task = asyncio.create_task(_process_import(payload.url, model))
    _jobs[job_id] = task
    return {"ok": True, "job_id": job_id}


# ---------- player ----------
@app.post("/songs/{song_id}/load")
async def song_load(song_id: int):
    s = await library.get_song(song_id)
    if not s:
        raise HTTPException(404, "song not found")
    if s["status"] != "ready" or not s.get("stems_dir"):
        raise HTTPException(409, f"song not ready (status={s['status']})")
    stems_dir = Path(s["stems_dir"])
    stems = {}
    for wav in stems_dir.glob("*.wav"):
        stems[wav.stem] = str(wav)
    if not stems:
        raise HTTPException(500, "no stem wavs found")
    info = player.load_stems(stems)
    await hub.broadcast({"event": "song_loaded", "song_id": song_id, **info, "stems_summary": player.stem_summary()})
    return {"ok": True, **info}


@app.post("/player/play")
async def player_play(payload: PlayIn = Body(default=None)):
    output_device = payload.output_device if payload else None
    player.play(output_device=output_device)
    return {"ok": True, "playing": True}


@app.post("/player/pause")
async def player_pause():
    player.pause()
    return {"ok": True, "playing": False}


@app.post("/player/stop")
async def player_stop():
    player.stop()
    return {"ok": True}


@app.post("/player/seek")
async def player_seek(payload: SeekIn):
    player.seek(payload.frame)
    return {"ok": True, "position": player.current_position()}


@app.post("/player/loop")
async def player_loop(payload: LoopIn):
    player.set_loop(payload.start, payload.end)
    return {"ok": True}


@app.post("/player/speed")
async def player_speed(payload: SpeedIn):
    player.set_speed(payload.speed)
    return {"ok": True, "speed": player.state.speed}


@app.post("/player/master")
async def player_master(payload: dict = Body(...)):
    vol = float(payload.get("volume", 1.0))
    player.set_master_volume(vol)
    return {"ok": True, "master_volume": player.state.master_volume}


@app.post("/player/stems/{name}")
async def player_stem(name: str, payload: StemControlIn):
    if payload.volume is not None:
        player.set_stem_volume(name, payload.volume)
    if payload.muted is not None:
        player.set_stem_muted(name, payload.muted)
    if payload.solo is not None:
        player.set_stem_solo(name, payload.solo)
    return {"ok": True, "stems": player.stem_summary()}


# ---------- live monitor (pedalboard) ----------
@app.post("/monitor/start")
async def monitor_start(payload: StartMonitorIn):
    live.start(
        input_device=payload.input_device,
        output_device=payload.output_device,
        sample_rate=payload.sample_rate,
        block_size=payload.block_size,
    )
    await hub.broadcast({"event": "monitor_started"})
    return {"ok": True, "state": _live_state()}


@app.post("/monitor/stop")
async def monitor_stop():
    live.stop()
    await hub.broadcast({"event": "monitor_stopped"})
    return {"ok": True}


@app.post("/monitor/chain")
async def monitor_chain(payload: ChainIn):
    live.set_chain(payload.chain)
    await hub.broadcast({"event": "chain_updated", "length": len(payload.chain)})
    return {"ok": True, "length": len(payload.chain)}


@app.post("/monitor/preset/{name}")
async def monitor_preset(name: str):
    if name not in BUILTIN_PRESETS:
        raise HTTPException(404, "preset not found")
    chain = BUILTIN_PRESETS[name]["chain"]
    live.set_chain(chain)
    await hub.broadcast({"event": "preset_applied", "name": name, "length": len(chain)})
    return {"ok": True, "chain": chain}


@app.post("/monitor/gain")
async def monitor_gain(payload: GainIn):
    live.set_gain(input_gain=payload.input_gain, output_gain=payload.output_gain)
    return {"ok": True, "input_gain": live.state.input_gain, "output_gain": live.state.output_gain}


# ---------- NAM amp models ----------
@app.get("/nam/models")
async def nam_models():
    return {"models": list_nam_models(), "active": live.nam.metadata if live.nam.is_loaded() else None}


@app.post("/nam/load")
async def nam_load(payload: dict = Body(...)):
    path = payload.get("path") or payload.get("filename")
    if not path:
        raise HTTPException(400, "missing 'path' or 'filename'")
    p = Path(path)
    if not p.is_absolute():
        p = NAM_MODELS / p
    if not p.exists():
        raise HTTPException(404, f"model not found: {p}")
    try:
        meta = live.nam.load(p)
    except Exception as e:
        log.exception("nam load failed")
        raise HTTPException(500, f"failed to load NAM: {e}")
    await hub.broadcast({"event": "nam_loaded", "model": meta})
    return {"ok": True, "model": meta}


@app.post("/nam/unload")
async def nam_unload():
    live.nam.unload()
    await hub.broadcast({"event": "nam_unloaded"})
    return {"ok": True}


@app.post("/nam/bypass")
async def nam_bypass(payload: dict = Body(...)):
    live.nam.bypass = bool(payload.get("bypass", False))
    return {"ok": True, "bypass": live.nam.bypass}


@app.post("/nam/upload")
async def nam_upload(file: UploadFile = File(...)):
    ensure_dirs()
    if not file.filename:
        raise HTTPException(400, "missing filename")
    if not file.filename.lower().endswith(".nam"):
        raise HTTPException(400, "expecting .nam file")
    target = NAM_MODELS / Path(file.filename).name
    content = await file.read()
    target.write_bytes(content)
    log.info("NAM uploaded: %s (%d bytes)", target.name, len(content))
    return {"ok": True, "filename": target.name, "path": str(target), "size": len(content)}


@app.delete("/nam/{filename}")
async def nam_delete(filename: str):
    p = NAM_MODELS / Path(filename).name
    if not p.exists():
        raise HTTPException(404)
    if live.nam.current_path and Path(live.nam.current_path) == p:
        live.nam.unload()
    p.unlink()
    return {"ok": True}


# ---------- Recorder ----------
@app.post("/recorder/start")
async def recorder_start(payload: dict = Body(default=None)):
    prefix = (payload or {}).get("prefix", "jam")
    sr = int((payload or {}).get("sample_rate", 48000))
    s = recorder.start(sample_rate=sr, prefix=prefix)
    await hub.broadcast({"event": "recording_started", **s})
    return {"ok": True, **s}


@app.post("/recorder/stop")
async def recorder_stop():
    s = recorder.stop()
    await hub.broadcast({"event": "recording_stopped", **s})
    return {"ok": True, **s}


@app.get("/recorder/status")
async def recorder_status():
    return recorder.status


@app.get("/recordings")
async def recordings():
    return {"recordings": recorder.list_recordings()}


@app.delete("/recordings/{filename}")
async def recordings_delete(filename: str):
    from .recorder import default_recordings_dir
    p = default_recordings_dir() / Path(filename).name
    if not p.exists():
        raise HTTPException(404)
    p.unlink()
    return {"ok": True}


# ---------- User presets ----------
class UserPresetIn(BaseModel):
    name: str
    description: str = ""
    chain: list[dict]
    category: str = "user"


@app.get("/presets/user")
async def presets_user():
    return {"presets": list_user_presets()}


@app.post("/presets/user")
async def presets_user_save(payload: UserPresetIn):
    try:
        p = save_user_preset(payload.name, payload.description, payload.chain, payload.category)
    except ValueError as e:
        raise HTTPException(400, str(e))
    await hub.broadcast({"event": "user_preset_saved", "name": p["name"]})
    return {"ok": True, "preset": p}


@app.delete("/presets/user/{filename}")
async def presets_user_delete(filename: str):
    if not delete_user_preset(filename):
        raise HTTPException(404)
    return {"ok": True}


# ---------- IR (cabinet impulse responses) ----------
@app.get("/irs")
async def irs():
    return {"irs": list_irs()}


@app.post("/irs/upload")
async def irs_upload(file: UploadFile = File(...)):
    ensure_dirs()
    if not file.filename:
        raise HTTPException(400, "missing filename")
    if not file.filename.lower().endswith((".wav", ".aif", ".aiff", ".flac")):
        raise HTTPException(400, "expecting .wav / .aif / .aiff / .flac")
    target = IRS / Path(file.filename).name
    content = await file.read()
    target.write_bytes(content)
    log.info("IR uploaded: %s (%d bytes)", target.name, len(content))
    return {"ok": True, "filename": target.name, "path": str(target), "size": len(content)}


@app.delete("/irs/{filename}")
async def irs_delete(filename: str):
    p = IRS / Path(filename).name
    if not p.exists():
        raise HTTPException(404)
    p.unlink()
    return {"ok": True}


def _live_state() -> dict:
    return {
        "monitoring": live.state.monitoring,
        "input_device": live.state.input_device,
        "output_device": live.state.output_device,
        "sample_rate": live.state.sample_rate,
        "block_size": live.state.block_size,
        "input_gain": live.state.input_gain,
        "output_gain": live.state.output_gain,
        "chain_length": len(live.state.chain_spec),
        "nam": live.nam.metadata if live.nam.is_loaded() else None,
    }


@app.get("/state")
async def state():
    return {
        "live": _live_state(),
        "player": {
            "playing": player.state.playing,
            "position": player.current_position(),
            "length": player.length_frames(),
            "speed": player.state.speed,
            "master_volume": player.state.master_volume,
            "stems": player.stem_summary(),
        },
    }


# ---------- websocket ----------
@app.websocket("/ws")
async def ws(ws: WebSocket):
    await ws.accept()
    await hub.add(ws)
    try:
        await ws.send_json({"event": "hello", "version": "0.1.0"})
        while True:
            msg = await ws.receive_text()
            # echo / future: bidirectional commands
            log.debug("ws msg: %s", msg)
    except WebSocketDisconnect:
        pass
    finally:
        await hub.remove(ws)


def main() -> None:
    import os
    host = os.environ.get("GUITAR_AI_HOST", "127.0.0.1")
    port = int(os.environ.get("GUITAR_AI_PORT", "7878"))
    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
