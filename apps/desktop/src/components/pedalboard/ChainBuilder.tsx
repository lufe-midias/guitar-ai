import { useEffect, useState } from "react";
import { Plus, X, ChevronUp, ChevronDown, Save, Sparkles, Hammer } from "lucide-react";
import { api, type Pedal, type UserPreset } from "@/lib/api";
import { useStore } from "@/lib/store";

type ChainItem = {
  id: number;
  type: string;
  params: Record<string, any>;
  bypass?: boolean;
};

const TONE_COLOR: Record<string, string> = {
  coral: "hsl(11 89% 61%)",
  cyan: "hsl(191 75% 44%)",
  purple: "hsl(268 78% 65%)",
  magenta: "hsl(328 82% 52%)",
  amber: "hsl(38 95% 58%)",
};

let nextId = 1;

export function ChainBuilder() {
  const pedals = useStore((s) => s.pedals);
  const setActivePreset = useStore((s) => s.setActivePreset);
  const [chain, setChain] = useState<ChainItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDesc, setSaveDesc] = useState("");
  const [userPresets, setUserPresets] = useState<UserPreset[]>([]);

  async function refreshUserPresets() {
    try {
      const r = await api.userPresets();
      setUserPresets(r.presets);
    } catch {}
  }

  useEffect(() => {
    refreshUserPresets();
  }, []);

  // ---------- chain manipulation ----------
  function addPedal(p: Pedal) {
    const item: ChainItem = { id: nextId++, type: p.type, params: { ...p.params } };
    setChain((c) => {
      const next = [...c, item];
      pushChain(next);
      return next;
    });
  }

  function removeAt(i: number) {
    setChain((c) => {
      const next = c.filter((_, idx) => idx !== i);
      pushChain(next);
      return next;
    });
  }

  function move(i: number, dir: -1 | 1) {
    setChain((c) => {
      const j = i + dir;
      if (j < 0 || j >= c.length) return c;
      const next = [...c];
      [next[i], next[j]] = [next[j], next[i]];
      pushChain(next);
      return next;
    });
  }

  function setParam(i: number, key: string, value: any) {
    setChain((c) => {
      const next = [...c];
      next[i] = { ...next[i], params: { ...next[i].params, [key]: value } };
      pushChain(next);
      return next;
    });
  }

  function clear() {
    setChain([]);
    pushChain([]);
  }

  async function pushChain(items: ChainItem[]) {
    setBusy(true);
    try {
      await api.setChain(items.map((c) => ({ type: c.type, params: c.params, bypass: c.bypass })));
      setActivePreset(null); // chain is now custom
    } catch (e: any) {
      console.warn("setChain failed", e);
    } finally {
      setBusy(false);
    }
  }

  async function savePreset() {
    if (!saveName.trim()) return;
    try {
      await api.userPresetSave({
        name: saveName.trim(),
        description: saveDesc.trim() || `Chain custom · ${chain.length} pedais`,
        chain: chain.map((c) => ({ type: c.type, params: c.params })),
        category: "user",
      });
      setShowSave(false);
      setSaveName("");
      setSaveDesc("");
      await refreshUserPresets();
    } catch (e: any) {
      alert(`Erro: ${e.message ?? e}`);
    }
  }

  async function loadUserPreset(p: UserPreset) {
    const items = p.chain.map((entry) => ({
      id: nextId++,
      type: entry.type,
      params: entry.params ?? {},
      bypass: entry.bypass,
    }));
    setChain(items);
    await pushChain(items);
    setActivePreset(p.name);
  }

  async function deleteUserPreset(filename: string) {
    if (!confirm(`Apagar ${filename}?`)) return;
    await api.userPresetDelete(filename);
    await refreshUserPresets();
  }

  // ---------- group pedals by category ----------
  const byCat = pedals.reduce<Record<string, Pedal[]>>((acc, p) => {
    (acc[p.category] ||= []).push(p);
    return acc;
  }, {});

  return (
    <div className="app-panel p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="t-eyebrow flex items-center gap-1.5">
            <Hammer size={11} /> Chain builder
          </div>
          <div className="text-[16px] font-semibold mt-1">
            {chain.length === 0
              ? "Monte sua pedaleira"
              : `${chain.length} ${chain.length === 1 ? "pedal" : "pedais"} na chain`}
          </div>
          <p className="text-[12px] text-white/55 mt-0.5">
            Clique em um pedal abaixo pra adicionar. Reordene com as setas. Salve como preset próprio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {chain.length > 0 && (
            <>
              <button onClick={() => setShowSave(true)} className="btn !py-2 !px-3">
                <Save size={13} /> Salvar como preset
              </button>
              <button onClick={clear} className="btn ghost !py-2 !px-3">
                <X size={13} /> Limpar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Active chain */}
      {chain.length > 0 && (
        <div className="mt-4 space-y-2">
          {chain.map((item, i) => {
            const lib = pedals.find((p) => p.type === item.type);
            const color = TONE_COLOR[lib?.color ?? "cyan"];
            return (
              <div
                key={item.id}
                className="rounded-xl border p-3 transition"
                style={{
                  borderColor: color.replace(")", " / 0.4)"),
                  background: color.replace(")", " / 0.04)"),
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="t-mono text-[10px] text-white/40 w-6">{i + 1}.</div>
                  <span
                    className="t-mono text-[10px] uppercase tracking-[0.2em] font-semibold"
                    style={{ color: color.replace(")", " / 0.85)") }}
                  >
                    {lib?.label ?? item.type}
                  </span>
                  <span className="t-mono text-[9px] text-white/30 ml-1">{item.type}</span>
                  <div className="flex-1" />
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="btn ghost icon !p-1 disabled:opacity-30">
                    <ChevronUp size={12} />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === chain.length - 1}
                    className="btn ghost icon !p-1 disabled:opacity-30"
                  >
                    <ChevronDown size={12} />
                  </button>
                  <button onClick={() => removeAt(i)} className="btn ghost icon !p-1">
                    <X size={12} />
                  </button>
                </div>
                {Object.keys(item.params).length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 md:grid-cols-3 lg:grid-cols-4">
                    {Object.entries(item.params).map(([key, value]) => (
                      <ParamControl
                        key={key}
                        label={key}
                        value={value}
                        color={color}
                        onChange={(v) => setParam(i, key, v)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pedal library — clickable */}
      <div className="mt-4">
        <div className="t-eyebrow mb-2">Adicionar pedal</div>
        {Object.entries(byCat).map(([cat, items]) => (
          <div key={cat} className="mb-3">
            <div className="t-mono text-[9px] uppercase tracking-[0.22em] text-white/30 mb-1.5">{cat}</div>
            <div className="flex flex-wrap gap-1.5">
              {items.map((p) => {
                const color = TONE_COLOR[p.color] ?? TONE_COLOR.cyan;
                return (
                  <button
                    key={p.type}
                    onClick={() => addPedal(p)}
                    disabled={busy}
                    className="group relative overflow-hidden rounded-lg border px-3 py-1.5 transition disabled:opacity-50"
                    style={{
                      borderColor: color.replace(")", " / 0.3)"),
                      background: color.replace(")", " / 0.04)"),
                    }}
                  >
                    <span className="flex items-center gap-1.5 text-[12px]">
                      <Plus size={11} style={{ color }} />
                      <span className="text-white/85 group-hover:text-white">{p.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User presets */}
      {userPresets.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="t-eyebrow mb-2 flex items-center gap-1.5">
            <Sparkles size={11} /> Seus presets · {userPresets.length}
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
            {userPresets.map((p) => (
              <div
                key={p.filename}
                className="group relative overflow-hidden rounded-xl border border-white/10 p-3 hover:border-[hsl(11_89%_61%/0.4)]"
              >
                <button onClick={() => loadUserPreset(p)} className="text-left w-full">
                  <div className="text-[13px] font-medium">{p.name}</div>
                  <div className="text-[11px] text-white/45 mt-0.5 line-clamp-2">{p.description}</div>
                  <div className="t-mono text-[9px] text-white/30 mt-1.5">{p.chain.length} pedais</div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteUserPreset(p.filename);
                  }}
                  className="absolute top-2 right-2 rounded-md p-1 text-white/30 opacity-0 transition group-hover:opacity-100 hover:bg-white/5 hover:text-white"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save dialog */}
      {showSave && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
          onClick={() => setShowSave(false)}
        >
          <div className="app-panel relative w-[420px] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="t-eyebrow">Salvar preset</div>
            <h2 className="t-display text-[22px] mt-1">Nomeie sua chain</h2>
            <input
              autoFocus
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Ex: Meu lead crocante"
              className="mt-4 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-[14px] outline-none focus:border-[hsl(11_89%_61%/0.5)]"
            />
            <input
              value={saveDesc}
              onChange={(e) => setSaveDesc(e.target.value)}
              placeholder="Descrição (opcional)"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-[13px] outline-none focus:border-[hsl(11_89%_61%/0.5)]"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowSave(false)} className="btn ghost">Cancelar</button>
              <button onClick={savePreset} disabled={!saveName.trim()} className="btn primary disabled:opacity-50">
                <Save size={13} /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ParamControl({
  label,
  value,
  color,
  onChange,
}: {
  label: string;
  value: any;
  color: string;
  onChange: (v: any) => void;
}) {
  if (typeof value === "number") {
    // Smart range guesses
    let min = 0;
    let max = 1;
    let step = 0.01;
    if (label.endsWith("_db") || label.endsWith("_gain") || label === "drive_db" || label === "gain_db") {
      min = -60;
      max = 60;
      step = 0.5;
    } else if (label.endsWith("_hz") || label.includes("frequency")) {
      min = 20;
      max = 20000;
      step = 10;
    } else if (label.endsWith("_ms")) {
      min = 0;
      max = 500;
      step = 1;
    } else if (label === "ratio") {
      min = 1;
      max = 20;
      step = 0.1;
    } else if (label === "delay_seconds") {
      min = 0;
      max = 2;
      step = 0.01;
    } else if (label === "semitones") {
      min = -24;
      max = 24;
      step = 1;
    } else if (label === "bit_depth") {
      min = 1;
      max = 32;
      step = 1;
    } else if (label.includes("vbr")) {
      min = 0;
      max = 9;
      step = 0.5;
    }

    return (
      <div>
        <div className="flex justify-between t-mono text-[10px] text-white/45">
          <span>{label}</span>
          <span style={{ color }}>{value.toFixed(2).replace(/\.00$/, "")}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="lufe w-full"
          style={{ accentColor: color as any }}
        />
      </div>
    );
  }
  return (
    <div className="t-mono text-[10px] text-white/45">
      <span>{label}</span>: <span style={{ color }}>{String(value)}</span>
    </div>
  );
}
