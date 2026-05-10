import { Drum, Music2, Mic, Guitar, Piano, Layers, Volume2, VolumeX } from "lucide-react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";

const STEM_META: Record<string, { label: string; color: string; icon: React.FC<any> }> = {
  drums:  { label: "Drums",  color: "hsl(38 95% 58%)",   icon: Drum },
  bass:   { label: "Bass",   color: "hsl(268 78% 65%)",  icon: Music2 },
  vocals: { label: "Vocals", color: "hsl(11 89% 61%)",   icon: Mic },
  guitar: { label: "Guitar", color: "hsl(191 75% 44%)",  icon: Guitar },
  piano:  { label: "Piano",  color: "hsl(152 76% 52%)",  icon: Piano },
  other:  { label: "Other",  color: "hsl(217 91% 60%)",  icon: Layers },
};

export function StemMixer() {
  const stems = useStore((s) => s.stems);

  if (stems.length === 0) {
    return (
      <div className="app-panel-soft p-6 text-center">
        <Layers className="mx-auto text-white/20" size={28} />
        <div className="t-eyebrow mt-3">Stems</div>
        <div className="text-[13px] text-white/50 mt-1">Carregue uma música pra ver o mixer</div>
      </div>
    );
  }

  return (
    <div className="app-panel p-5">
      <div className="t-eyebrow mb-4">Mixer · multi-stem</div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stems.map((s) => (
          <StemCard key={s.name} stem={s} />
        ))}
      </div>
      <p className="t-mono mt-4 text-[10px] text-white/40">
        Dica · pra tocar guitarra por cima da música, mute o stem Guitar
      </p>
    </div>
  );
}

function StemCard({ stem }: { stem: { name: string; volume: number; muted: boolean; solo: boolean } }) {
  const meta = STEM_META[stem.name] ?? { label: stem.name, color: "hsl(215 16% 70%)", icon: Layers };
  const Icon = meta.icon;
  const setStems = useStore((s) => s.setStems);

  async function set(opts: Partial<{ volume: number; muted: boolean; solo: boolean }>) {
    const r = await api.stem(stem.name, opts);
    setStems(r.stems);
  }

  return (
    <div
      className={`app-panel-soft relative flex flex-col gap-3 p-3 transition ${
        stem.muted ? "opacity-50" : ""
      } ${stem.solo ? "border-[hsl(38_95%_58%/0.5)]" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color: meta.color }} />
          <span className="text-[13px] font-medium">{meta.label}</span>
        </div>
        <span
          className="t-mono text-[10px] tabular-nums"
          style={{ color: stem.muted ? "hsl(215 16% 70% / 0.5)" : meta.color }}
        >
          {Math.round(stem.volume * 100).toString().padStart(3, " ")}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={1.5}
        step={0.01}
        value={stem.volume}
        onChange={(e) => set({ volume: parseFloat(e.target.value) })}
        className="lufe"
        style={{ accentColor: meta.color as any }}
      />

      <div className="flex items-center gap-1">
        <button
          onClick={() => set({ muted: !stem.muted })}
          className={`btn ghost flex-1 !px-2 !py-1 !text-[11px] ${
            stem.muted ? "!bg-[hsl(0_84%_60%/0.15)] !text-[hsl(0_84%_75%)] !border-[hsl(0_84%_60%/0.4)]" : ""
          }`}
        >
          {stem.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
          {stem.muted ? "Muted" : "Mute"}
        </button>
        <button
          onClick={() => set({ solo: !stem.solo })}
          className={`btn ghost !px-2 !py-1 !text-[11px] ${
            stem.solo ? "!bg-[hsl(38_95%_58%/0.15)] !text-[hsl(38_95%_75%)] !border-[hsl(38_95%_58%/0.4)]" : ""
          }`}
        >
          Solo
        </button>
      </div>
    </div>
  );
}
