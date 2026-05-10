import { useEffect, useState } from "react";
import { Disc3, Square, Trash2, FolderOpen, Circle } from "lucide-react";
import { api, type Recording } from "@/lib/api";
import { useStore } from "@/lib/store";

export function RecorderPanel() {
  const recorder = useStore((s) => s.recorder);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const r = await api.recordings();
      setRecordings(r.recordings);
    } catch {}
  }

  useEffect(() => {
    refresh();
  }, [recorder.active]);

  async function toggle() {
    setBusy(true);
    try {
      if (recorder.active) {
        await api.recordStop();
        await refresh();
      } else {
        await api.recordStart();
      }
    } catch (e: any) {
      alert(`Erro: ${e.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  async function del(filename: string) {
    if (!confirm(`Apagar ${filename}?`)) return;
    await api.recordingDelete(filename);
    await refresh();
  }

  return (
    <div className="app-panel p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="t-eyebrow flex items-center gap-1.5">
            <Disc3 size={11} /> Recorder · Looper
          </div>
          <div className="text-[16px] font-semibold mt-1">
            {recorder.active ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[hsl(0_84%_60%)] animate-pulse" />
                <span className="text-[hsl(0_84%_75%)]">REC · {fmtDur(recorder.duration_sec)}</span>
              </span>
            ) : (
              "Gravar jam"
            )}
          </div>
          <p className="text-[12px] text-white/55 mt-0.5">
            Captura player mix + monitor live → ~/Desktop/Guitar AI Recordings/
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={busy}
          className={`btn !py-3 !px-5 ${recorder.active ? "" : "primary"}`}
          style={recorder.active ? { background: "hsl(0 84% 60% / 0.15)", borderColor: "hsl(0 84% 60% / 0.5)", color: "hsl(0 84% 75%)" } : {}}
        >
          {recorder.active ? <Square size={14} fill="currentColor" /> : <Circle size={14} fill="currentColor" />}
          {recorder.active ? "Parar" : "Gravar"}
        </button>
      </div>

      {recordings.length > 0 && (
        <div className="mt-4 space-y-1">
          <div className="t-eyebrow flex items-center gap-1.5 mb-2">
            <FolderOpen size={11} /> Últimas gravações
          </div>
          {recordings.slice(0, 5).map((r) => (
            <div
              key={r.filename}
              className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 hover:border-white/20"
            >
              <div className="min-w-0">
                <div className="text-[13px] font-medium truncate">{r.filename}</div>
                <div className="t-mono text-[10px] text-white/40">
                  {fmtDur(r.duration_sec)} · {r.size_kb} KB
                </div>
              </div>
              <button onClick={() => del(r.filename)} className="btn ghost icon !p-1">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function fmtDur(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const tenths = Math.floor((s - Math.floor(s)) * 10);
  return `${m}:${sec.toString().padStart(2, "0")}.${tenths}`;
}
