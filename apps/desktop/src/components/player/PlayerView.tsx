import { useEffect, useState } from "react";
import { Play, Pause, Square, RotateCcw, Repeat, Gauge } from "lucide-react";
import { api, type Song } from "@/lib/api";
import { useStore } from "@/lib/store";
import { StemMixer } from "./StemMixer";

const SPEEDS = [0.5, 0.7, 0.85, 1.0, 1.15, 1.3, 1.5];

export function PlayerView() {
  const songs = useStore((s) => s.songs);
  const playerLoadedSongId = useStore((s) => s.playerLoadedSongId);
  const playing = useStore((s) => s.playing);
  const position = useStore((s) => s.position);
  const length = useStore((s) => s.length);
  const speed = useStore((s) => s.speed);
  const masterVolume = useStore((s) => s.masterVolume);
  const sampleRate = 48000;
  const song: Song | undefined = songs.find((s) => s.id === playerLoadedSongId);
  const [loopOn, setLoopOn] = useState(false);
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);

  if (!song) {
    return (
      <div className="grid h-full place-items-center p-12">
        <div className="text-center">
          <div className="t-eyebrow">Player</div>
          <h2 className="t-display text-[28px] mt-2">Nenhuma música carregada</h2>
          <p className="text-[13px] text-white/50 mt-2">
            Vá pra Biblioteca e clique em uma música marcada como READY.
          </p>
        </div>
      </div>
    );
  }

  const positionSec = position / sampleRate;
  const lengthSec = length / sampleRate;

  async function toggle() {
    if (playing) await api.pause();
    else await api.play();
  }

  async function seekPct(pct: number) {
    const frame = Math.round((pct / 100) * length);
    await api.seek(frame);
  }

  async function setSpeedNow(s: number) {
    await api.speed(s);
    useStore.getState().setTransport({ speed: s });
  }

  async function setMaster(v: number) {
    await api.master(v);
    useStore.getState().setTransport({ masterVolume: v });
  }

  async function markA() {
    setLoopA(position);
  }
  async function markB() {
    setLoopB(position);
    if (loopA !== null && position > loopA) {
      await api.loop(loopA, position);
      setLoopOn(true);
    }
  }
  async function clearLoop() {
    setLoopA(null);
    setLoopB(null);
    setLoopOn(false);
    await api.loop(null, null);
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <header className="app-panel relative p-6 overflow-hidden">
        <div className="hud-grid" />
        <div className="t-eyebrow">Tocando agora</div>
        <h1 className="t-display text-[36px] mt-2 truncate">{song.title}</h1>
        <div className="t-mono text-[13px] text-white/60 mt-1">
          {song.artist ?? "—"} · {song.stem_model ?? "—"} · {song.duration_sec ? formatDur(song.duration_sec) : "—"}
        </div>
      </header>

      <div className="app-panel p-5">
        {/* timeline */}
        <Timeline
          position={positionSec}
          length={lengthSec}
          loopA={loopA !== null ? loopA / sampleRate : null}
          loopB={loopB !== null ? loopB / sampleRate : null}
          onSeek={(pct) => seekPct(pct)}
        />

        {/* transport */}
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button onClick={() => api.stop()} className="btn ghost icon" title="Stop">
              <Square size={14} />
            </button>
            <button onClick={() => seekPct(0)} className="btn ghost icon" title="Voltar ao início">
              <RotateCcw size={14} />
            </button>
            <button onClick={toggle} className="btn primary !px-6 !py-3" title={playing ? "Pause" : "Play"}>
              {playing ? <Pause size={18} /> : <Play size={18} />}
              {playing ? "Pausar" : "Tocar"}
            </button>
          </div>

          {/* loop */}
          <div className="flex items-center gap-2">
            <span className="t-eyebrow">Loop</span>
            <button onClick={markA} className="btn ghost !px-3 !py-1.5">
              A · {loopA !== null ? formatDur(loopA / sampleRate) : "—"}
            </button>
            <button onClick={markB} className="btn ghost !px-3 !py-1.5">
              B · {loopB !== null ? formatDur(loopB / sampleRate) : "—"}
            </button>
            <button
              onClick={clearLoop}
              className={`btn icon ${loopOn ? "primary" : "ghost"}`}
              title="Limpar loop"
            >
              <Repeat size={14} />
            </button>
          </div>

          {/* speed */}
          <div className="flex items-center gap-2">
            <Gauge size={14} className="text-white/50" />
            <span className="t-eyebrow">Speed</span>
            <div className="flex gap-1">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeedNow(s)}
                  className={`rounded-md px-2 py-1 t-mono text-[11px] transition ${
                    speed === s
                      ? "bg-[hsl(191_75%_44%/0.2)] text-[hsl(191_75%_44%)] border border-[hsl(191_75%_44%/0.4)]"
                      : "text-white/50 border border-transparent hover:bg-white/5"
                  }`}
                >
                  {s.toFixed(2)}x
                </button>
              ))}
            </div>
          </div>

          {/* master */}
          <div className="flex items-center gap-2">
            <span className="t-eyebrow">Master</span>
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.01}
              value={masterVolume}
              onChange={(e) => setMaster(parseFloat(e.target.value))}
              className="lufe cyan w-32"
            />
            <span className="t-mono text-[11px] text-white/60 w-10 text-right">
              {Math.round(masterVolume * 100)}
            </span>
          </div>
        </div>
      </div>

      <StemMixer />
    </div>
  );
}

function Timeline({
  position,
  length,
  loopA,
  loopB,
  onSeek,
}: {
  position: number;
  length: number;
  loopA: number | null;
  loopB: number | null;
  onSeek: (pct: number) => void;
}) {
  const pct = length ? (position / length) * 100 : 0;
  function clickFrac(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = ((e.clientX - rect.left) / rect.width) * 100;
    onSeek(Math.max(0, Math.min(100, frac)));
  }

  return (
    <div>
      <div className="flex justify-between t-mono text-[11px] text-white/50 mb-1.5">
        <span>{formatDur(position)}</span>
        <span>{formatDur(length)}</span>
      </div>
      <div
        className="relative h-2 cursor-pointer rounded-full bg-white/5 hover:h-3 transition-[height]"
        onClick={clickFrac}
      >
        {loopA !== null && loopB !== null && length > 0 && (
          <div
            className="absolute top-0 bottom-0 bg-[hsl(38_95%_58%/0.18)] border-x border-[hsl(38_95%_58%/0.5)]"
            style={{
              left: `${(loopA / length) * 100}%`,
              right: `${100 - (loopB / length) * 100}%`,
            }}
          />
        )}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[hsl(11_89%_61%)] to-[hsl(191_75%_44%)]"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-white shadow-[0_0_12px_hsl(11_89%_61%/0.8)]"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function formatDur(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
