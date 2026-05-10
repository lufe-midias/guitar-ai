import { useEffect, useState } from "react";
import { Loader2, Music, Plus, Play, Trash2, AlertTriangle, RefreshCw } from "lucide-react";
import { api, type Song } from "@/lib/api";
import { useStore } from "@/lib/store";
import { AddSongDialog } from "./AddSongDialog";

const STATUS_LABEL: Record<Song["status"], { label: string; color: string }> = {
  pending: { label: "PENDING", color: "hsl(38 95% 58%)" },
  downloading: { label: "DOWNLOADING", color: "hsl(217 91% 60%)" },
  separating: { label: "SEPARATING", color: "hsl(268 78% 65%)" },
  ready: { label: "READY", color: "hsl(152 76% 52%)" },
  error: { label: "ERROR", color: "hsl(0 84% 60%)" },
};

export function LibraryView() {
  const songs = useStore((s) => s.songs);
  const setSongs = useStore((s) => s.setSongs);
  const removeSong = useStore((s) => s.removeSong);
  const setSelectedSong = useStore((s) => s.setSelectedSong);
  const setView = useStore((s) => s.setView);
  const imports = useStore((s) => s.imports);
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      const r = await api.songs();
      setSongs(r.songs);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function loadAndOpen(song: Song) {
    if (song.status !== "ready") return;
    try {
      await api.loadSong(song.id);
      setSelectedSong(song.id);
      useStore.setState({ playerLoadedSongId: song.id });
      setView("player");
    } catch (e: any) {
      alert(`Erro ao carregar: ${e.message ?? e}`);
    }
  }

  async function del(song: Song) {
    if (!confirm(`Apagar "${song.title}" e seus stems?`)) return;
    await api.deleteSong(song.id);
    removeSong(song.id);
  }

  return (
    <>
      <div className="flex flex-col gap-6 p-6">
        <header className="flex items-end justify-between">
          <div>
            <div className="t-eyebrow">Biblioteca</div>
            <h1 className="t-display text-[44px] mt-1">Suas músicas</h1>
            <p className="text-[14px] text-white/55 mt-1">
              Cole uma URL de Spotify ou YouTube. O engine baixa, separa stems e fica pronto pra você tocar por cima · 100% local.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="btn ghost">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Atualizar
            </button>
            <button onClick={() => setAdding(true)} className="btn primary">
              <Plus size={14} />
              Adicionar música
            </button>
          </div>
        </header>

        {imports.length > 0 && (
          <div className="app-panel-soft p-4">
            <div className="t-eyebrow mb-3">Importações em andamento</div>
            <div className="space-y-2">
              {imports.map((p, idx) => (
                <div key={p.songId ?? `i${idx}`} className="space-y-1">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-white/70">
                      {p.kind ?? "—"} · {p.stage}
                    </span>
                    <span className="t-mono text-white/50">{Math.round(p.percent)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-[hsl(11_89%_61%)] to-[hsl(191_75%_44%)] transition-[width]"
                      style={{ width: `${Math.min(100, p.percent)}%` }}
                    />
                  </div>
                  {p.line && <div className="t-mono truncate text-[10px] text-white/40">{p.line}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {songs.length === 0 ? (
          <div className="app-panel relative grid place-items-center p-16">
            <div className="hud-grid" />
            <div className="text-center">
              <Music size={42} className="mx-auto text-white/20" />
              <div className="t-eyebrow mt-4">Biblioteca vazia</div>
              <h2 className="t-display text-[24px] mt-2">Nenhuma música ainda</h2>
              <p className="text-[13px] text-white/50 mt-2 max-w-md mx-auto">
                Cole a URL de qualquer faixa do Spotify ou YouTube. A primeira separação leva ~1-2 min num Mac mini Apple Silicon.
              </p>
              <button onClick={() => setAdding(true)} className="btn primary mt-5">
                <Plus size={14} />
                Importar a primeira música
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {songs.map((s) => {
              const st = STATUS_LABEL[s.status];
              const ready = s.status === "ready";
              return (
                <div
                  key={s.id}
                  className="app-panel group relative cursor-pointer p-4 transition hover:border-[hsl(11_89%_61%/0.4)]"
                  onClick={() => loadAndOpen(s)}
                >
                  <div className="hud-grid" />
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="t-mono text-[9px] uppercase tracking-[0.22em]"
                          style={{ color: st.color }}
                        >
                          {st.label}
                        </span>
                        {s.stem_model && (
                          <span className="t-mono text-[9px] uppercase tracking-[0.18em] text-white/30">
                            · {s.stem_model}
                          </span>
                        )}
                      </div>
                      <h3 className="text-[16px] font-semibold leading-tight truncate">{s.title}</h3>
                      <div className="text-[12px] text-white/50 truncate mt-0.5">
                        {s.artist ?? "—"}
                      </div>
                      {s.error && (
                        <div className="mt-2 flex items-start gap-1 text-[11px] text-[hsl(0_84%_75%)]">
                          <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                          <span className="truncate">{s.error}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="t-mono text-[10px] text-white/30">
                      {s.duration_sec ? formatDur(s.duration_sec) : "—"}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        className="btn ghost icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          del(s);
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                      {ready && (
                        <button
                          className="btn primary icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadAndOpen(s);
                          }}
                        >
                          <Play size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  {!ready && s.status !== "error" && (
                    <div className="absolute inset-0 grid place-items-center rounded-[20px] bg-black/40 backdrop-blur-[2px]">
                      <Loader2 className="animate-spin text-white/60" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {adding && <AddSongDialog onClose={() => setAdding(false)} />}
    </>
  );
}

function formatDur(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
