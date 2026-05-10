import { useEffect, useMemo, useState } from "react";
import { Power, Sparkles, AudioLines, ChevronRight, Library as LibIcon, ChevronDown } from "lucide-react";
import { api, type Preset } from "@/lib/api";
import { useStore } from "@/lib/store";
import { VuMeter } from "../ui/VuMeter";
import { AmpRig } from "./AmpRig";
import { Tuner } from "./Tuner";
import { RecorderPanel } from "./Recorder";
import { ChainBuilder } from "./ChainBuilder";

const PEDAL_VISUAL: Record<string, { label: string; tone: string }> = {
  Compressor: { label: "Compressor", tone: "cyan" },
  NoiseGate:  { label: "Noise Gate", tone: "amber" },
  Distortion: { label: "Drive",      tone: "coral" },
  Clipping:   { label: "Hard Clip",  tone: "coral" },
  Bitcrush:   { label: "Bitcrush",   tone: "coral" },
  MP3Compressor: { label: "MP3",     tone: "amber" },
  GSMFullRateCompressor: { label: "GSM", tone: "amber" },
  Chorus:     { label: "Chorus",     tone: "purple" },
  Phaser:     { label: "Phaser",     tone: "purple" },
  Delay:      { label: "Delay",      tone: "magenta" },
  Reverb:     { label: "Reverb",     tone: "cyan" },
  HighpassFilter: { label: "HPF",    tone: "amber" },
  LowpassFilter:  { label: "LPF",    tone: "amber" },
  HighShelfFilter:{ label: "Hi Shelf",tone: "amber" },
  LowShelfFilter: { label: "Lo Shelf",tone: "amber" },
  PeakFilter:     { label: "EQ peak",tone: "amber" },
  LadderFilter:   { label: "Moog",   tone: "purple" },
  Limiter:    { label: "Limiter",    tone: "cyan" },
  PitchShift: { label: "Pitch",      tone: "magenta" },
  Invert:     { label: "Invert",     tone: "amber" },
  Gain:       { label: "Gain",       tone: "coral" },
  Convolution:{ label: "IR / Cab",   tone: "purple" },
  Resample:   { label: "Resample",   tone: "amber" },
  IIRFilter:  { label: "IIR",        tone: "amber" },
};

const TONE_COLOR: Record<string, string> = {
  coral:   "hsl(11 89% 61%)",
  cyan:    "hsl(191 75% 44%)",
  purple:  "hsl(268 78% 65%)",
  magenta: "hsl(328 82% 52%)",
  amber:   "hsl(38 95% 58%)",
};

export function PedalboardView() {
  const presets = useStore((s) => s.presets);
  const presetCategories = useStore((s) => s.presetCategories);
  const pedals = useStore((s) => s.pedals);
  const activePresetName = useStore((s) => s.activePresetName);
  const setActivePreset = useStore((s) => s.setActivePreset);
  const monitoring = useStore((s) => s.monitoring);
  const inputLevel = useStore((s) => s.inputLevel);
  const outputLevel = useStore((s) => s.outputLevel);
  const inputDeviceIndex = useStore((s) => s.inputDeviceIndex);
  const outputDeviceIndex = useStore((s) => s.outputDeviceIndex);
  const devices = useStore((s) => s.devices);
  const setView = useStore((s) => s.setView);
  const [busy, setBusy] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");

  const presetsByCategory = useMemo(() => {
    const m: Record<string, Preset[]> = {};
    for (const p of presets) {
      const cid = p.category ?? "other";
      (m[cid] ||= []).push(p);
    }
    return m;
  }, [presets]);

  const filteredPresets = useMemo(() => {
    if (activeCategory === "all") return presets;
    return presetsByCategory[activeCategory] ?? [];
  }, [activeCategory, presets, presetsByCategory]);

  const activePreset: Preset | undefined = presets.find((p) => p.name === activePresetName);

  async function applyPreset(p: Preset) {
    setActivePreset(p.name);
    await api.applyPreset(p.name);
  }

  async function toggleMonitor() {
    setBusy(true);
    try {
      if (monitoring) {
        await api.monitorStop();
        useStore.getState().setMonitoring(false);
      } else {
        const inputDev = devices.find((d) => d.index === inputDeviceIndex && d.max_input_channels > 0);
        const outputDev = devices.find((d) => d.index === outputDeviceIndex && d.max_output_channels > 0);
        if (!inputDev) {
          alert("Nenhum input device com canais de entrada selecionado. Vai em Configurar e escolhe sua interface de áudio.");
          setView("settings");
          return;
        }
        await api.monitorStart({
          input_device: inputDev.index,
          output_device: outputDev?.index,
          sample_rate: 48000,
          block_size: 128,
        });
        useStore.getState().setMonitoring(true);
        if (activePreset) await api.applyPreset(activePreset.name);
      }
    } catch (e: any) {
      alert(`Erro: ${e.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <header className="flex items-end justify-between">
        <div>
          <div className="t-eyebrow">Pedaleira IA · live monitor</div>
          <h1 className="t-display text-[44px] mt-1">Sua guitarra ao vivo</h1>
          <p className="text-[14px] text-white/55 mt-1">
            {presets.length} presets em {presetCategories.length} categorias · {pedals.length} pedais disponíveis · processamento em tempo real
          </p>
        </div>
        <button
          onClick={toggleMonitor}
          disabled={busy}
          className={`btn !py-3 !px-5 ${monitoring ? "primary pulse-aura" : ""}`}
        >
          <Power size={16} />
          {monitoring ? "Desligar monitor" : "Ligar monitor"}
        </button>
      </header>

      {/* Active chain visualization */}
      <div className="app-panel relative p-6 overflow-hidden">
        <div className="hud-grid" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles size={18} className="text-[hsl(11_89%_61%)]" />
            <div>
              <div className="t-eyebrow">Chain ativa</div>
              <div className="text-[18px] font-semibold mt-0.5">
                {activePreset?.name ?? "Bypass — sem efeitos"}
              </div>
              <div className="text-[12px] text-white/50">{activePreset?.description}</div>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <VuMeter level={inputLevel * 4} height={56} label="GTR" tone="coral" />
            <VuMeter level={outputLevel * 4} height={56} label="OUT" tone="cyan" />
          </div>
        </div>

        <div className="mt-6 flex items-stretch gap-2 overflow-x-auto pb-2">
          <ChainEdge label="Guitarra" />
          {(activePreset?.chain ?? []).map((p, i) => (
            <PedalCard key={i} type={p.type} params={p.params ?? {}} />
          ))}
          {(!activePreset || activePreset.chain.length === 0) && (
            <div className="grid place-items-center px-6 text-[12px] text-white/30">sem efeitos</div>
          )}
          <ChainEdge label="Saída" tone="cyan" />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap items-center gap-1 px-1">
        <CatTab
          active={activeCategory === "all"}
          onClick={() => setActiveCategory("all")}
          label="Tudo"
          count={presets.length}
        />
        {presetCategories.map((c) => (
          <CatTab
            key={c.id}
            active={activeCategory === c.id}
            onClick={() => setActiveCategory(c.id)}
            label={c.label}
            count={(presetsByCategory[c.id] ?? []).length}
          />
        ))}
      </div>

      {/* Presets grid */}
      <div className="app-panel p-5">
        <div className="t-eyebrow mb-3">
          {activeCategory === "all" ? "Todos os presets" : presetCategories.find((c) => c.id === activeCategory)?.label}
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
          {filteredPresets.map((p) => {
            const active = activePresetName === p.name;
            return (
              <button
                key={p.name}
                onClick={() => applyPreset(p)}
                className={`group relative overflow-hidden rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-[hsl(11_89%_61%/0.5)] bg-[hsl(11_89%_61%/0.08)] shadow-[0_0_24px_hsl(11_89%_61%/0.18)]"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[14px] font-semibold ${active ? "text-white" : "text-white/85"}`}>
                    {p.name}
                  </span>
                  {active && (
                    <span className="t-mono text-[9px] uppercase tracking-[0.2em] text-[hsl(11_89%_75%)]">ativo</span>
                  )}
                </div>
                <p className="text-[11px] text-white/50 mt-1.5 leading-relaxed line-clamp-2">{p.description}</p>
                <div className="t-mono text-[9px] text-white/30 mt-2">{p.chain.length} pedais</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tuner */}
      <Tuner />

      {/* Chain builder (drag-and-drop + user presets) */}
      <ChainBuilder />

      {/* Recorder */}
      <RecorderPanel />

      {/* Amp Rig — NAM models + IR cabinets */}
      <AmpRig />

      {/* Pedal library (collapsible) */}
      <div className="app-panel p-5">
        <button
          onClick={() => setShowLibrary((v) => !v)}
          className="flex w-full items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <LibIcon size={14} className="text-white/50" />
            <span className="t-eyebrow">Biblioteca de pedais · {pedals.length} disponíveis</span>
          </div>
          <ChevronDown
            size={14}
            className={`text-white/40 transition-transform ${showLibrary ? "rotate-180" : ""}`}
          />
        </button>
        {showLibrary && (
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
            {pedals.map((p) => {
              const color = TONE_COLOR[p.color] ?? TONE_COLOR.cyan;
              return (
                <div
                  key={p.type}
                  className="relative overflow-hidden rounded-xl border p-3"
                  style={{
                    borderColor: color.replace(")", " / 0.3)"),
                    background: "hsl(220 30% 6% / 0.5)",
                  }}
                >
                  <div
                    className="absolute -top-8 right-0 h-16 w-16 rounded-full opacity-30"
                    style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }}
                  />
                  <div
                    className="t-mono text-[8px] uppercase tracking-[0.22em]"
                    style={{ color: color.replace(")", " / 0.7)") }}
                  >
                    {p.category}
                  </div>
                  <div className="text-[13px] font-semibold mt-0.5">{p.label}</div>
                  <div className="t-mono text-[10px] text-white/40 mt-0.5">{p.type}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Devices summary */}
      <div className="app-panel-soft p-4 flex items-center gap-4 t-mono text-[12px]">
        <AudioLines size={14} className="text-white/40" />
        <span className="text-white/50">IN</span>
        <span className="text-white/85">
          {devices.find((d) => d.index === inputDeviceIndex)?.name ?? "—"}
        </span>
        <ChevronRight size={12} className="text-white/30" />
        <span className="text-white/50">OUT</span>
        <span className="text-white/85">
          {devices.find((d) => d.index === outputDeviceIndex)?.name ?? "—"}
        </span>
        <button onClick={() => setView("settings")} className="btn ghost ml-auto !py-1 !px-2 !text-[11px]">
          Trocar
        </button>
      </div>
    </div>
  );
}

function CatTab({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] transition ${
        active
          ? "border-[hsl(191_75%_44%/0.5)] bg-[hsl(191_75%_44%/0.1)] text-white"
          : "border-white/10 bg-white/[0.02] text-white/60 hover:text-white/90 hover:border-white/20"
      }`}
    >
      <span>{label}</span>
      <span className="t-mono text-[10px] text-white/40">{count}</span>
    </button>
  );
}

function ChainEdge({ label, tone = "coral" }: { label: string; tone?: "coral" | "cyan" }) {
  return (
    <div
      className="flex items-center justify-center px-4 py-3 rounded-xl border"
      style={{
        borderColor: tone === "cyan" ? "hsl(191 75% 44% / 0.4)" : "hsl(11 89% 61% / 0.4)",
        background: tone === "cyan" ? "hsl(191 75% 44% / 0.08)" : "hsl(11 89% 61% / 0.08)",
        boxShadow: tone === "cyan" ? "0 0 24px hsl(191 75% 44% / 0.2)" : "0 0 24px hsl(11 89% 61% / 0.2)",
        minWidth: 90,
      }}
    >
      <span
        className="t-mono text-[10px] uppercase tracking-[0.22em] font-semibold"
        style={{ color: tone === "cyan" ? "hsl(191 75% 70%)" : "hsl(11 89% 75%)" }}
      >
        {label}
      </span>
    </div>
  );
}

function PedalCard({ type, params }: { type: string; params: Record<string, any> }) {
  const visual = PEDAL_VISUAL[type] ?? { label: type, tone: "cyan" };
  const color = TONE_COLOR[visual.tone] ?? TONE_COLOR.cyan;
  const keys = Object.keys(params).slice(0, 3);
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-4 min-w-[160px] backdrop-blur-md"
      style={{
        borderColor: color.replace(")", " / 0.35)"),
        background: "hsl(220 30% 6% / 0.7)",
      }}
    >
      <div
        className="absolute -top-12 right-0 h-24 w-24 rounded-full opacity-50"
        style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }}
      />
      <div className="t-eyebrow !text-[9px]" style={{ color: color.replace(")", " / 0.85)") }}>
        {visual.label}
      </div>
      <div className="text-[14px] font-semibold mt-1.5">{type}</div>
      <div className="t-mono mt-2 space-y-0.5 text-[10px] text-white/50">
        {keys.map((k) => (
          <div key={k} className="flex justify-between gap-2">
            <span className="text-white/35">{k}</span>
            <span style={{ color }}>{formatVal(params[k])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatVal(v: any): string {
  if (typeof v === "number") return v.toFixed(2).replace(/\.00$/, "");
  return String(v);
}
