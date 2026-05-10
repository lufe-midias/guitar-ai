import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { api } from "@/lib/api";

export function AddSongDialog({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [model, setModel] = useState<"htdemucs_6s" | "htdemucs_ft">("htdemucs_6s");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!url.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.importSong(url.trim(), model);
      onClose();
    } catch (e: any) {
      setError(String(e.message ?? e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="app-panel relative w-[520px] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hud-grid" />
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-white/50 hover:bg-white/5 hover:text-white"
        >
          <X size={16} />
        </button>
        <div className="t-eyebrow">Importar música</div>
        <h2 className="t-display text-[26px] mt-1">Cole a URL · Spotify ou YouTube</h2>
        <p className="text-[13px] text-white/60 mt-2">
          O engine baixa, separa em 6 stems via Demucs e adiciona à sua biblioteca local. Depois disso, toca offline.
        </p>

        <input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="https://open.spotify.com/track/..."
          className="mt-5 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 t-mono text-[13px] outline-none transition focus:border-[hsl(11_89%_61%/0.5)] focus:bg-black/60"
        />

        <div className="mt-4">
          <div className="t-eyebrow">Modelo de separação</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ModelOption
              active={model === "htdemucs_6s"}
              onClick={() => setModel("htdemucs_6s")}
              title="6 stems"
              hint="drums · bass · vocals · guitar · piano · other"
              tag="recomendado"
            />
            <ModelOption
              active={model === "htdemucs_ft"}
              onClick={() => setModel("htdemucs_ft")}
              title="4 stems · rápido"
              hint="drums · bass · vocals · other"
              tag="2x mais rápido"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-[hsl(0_84%_60%/0.4)] bg-[hsl(0_84%_60%/0.08)] px-3 py-2 text-[12px] text-[hsl(0_84%_75%)]">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn ghost">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting || !url.trim()}
            className="btn primary disabled:opacity-50"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Importar
          </button>
        </div>
      </div>
    </div>
  );
}

function ModelOption({
  active,
  onClick,
  title,
  hint,
  tag,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  hint: string;
  tag: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-3 text-left transition ${
        active
          ? "border-[hsl(11_89%_61%/0.5)] bg-[hsl(11_89%_61%/0.08)]"
          : "border-white/10 hover:bg-white/[0.03]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium">{title}</span>
        <span
          className={`t-mono text-[9px] uppercase tracking-[0.18em] ${
            active ? "text-[hsl(11_89%_75%)]" : "text-white/40"
          }`}
        >
          {tag}
        </span>
      </div>
      <div className="t-mono text-[11px] text-white/50 mt-1">{hint}</div>
    </button>
  );
}
