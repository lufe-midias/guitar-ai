import { useEffect, useRef, useState } from "react";
import { Cpu, Power, Trash2, Upload, X, FileAudio2, Sparkles } from "lucide-react";
import { api, type ActiveNam, type IRFile, type NamModel } from "@/lib/api";

export function AmpRig() {
  const [models, setModels] = useState<NamModel[]>([]);
  const [active, setActive] = useState<ActiveNam | null>(null);
  const [irs, setIrs] = useState<IRFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const namInputRef = useRef<HTMLInputElement>(null);
  const irInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      const [m, i] = await Promise.all([api.namModels(), api.irs()]);
      setModels(m.models);
      setActive(m.active);
      setIrs(i.irs);
    } catch (e: any) {
      setError(String(e.message ?? e));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function loadNam(m: NamModel) {
    setBusy(true);
    setError(null);
    try {
      const r = await api.namLoad(m.path);
      setActive(r.model);
    } catch (e: any) {
      setError(String(e.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function unloadNam() {
    setBusy(true);
    try {
      await api.namUnload();
      setActive(null);
    } finally {
      setBusy(false);
    }
  }

  async function uploadNam(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const f of Array.from(files)) {
        await api.namUpload(f);
      }
      await refresh();
    } catch (e: any) {
      setError(String(e.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function deleteNam(filename: string) {
    if (!confirm(`Apagar ${filename}?`)) return;
    await api.namDelete(filename);
    await refresh();
  }

  async function uploadIr(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const f of Array.from(files)) {
        await api.irUpload(f);
      }
      await refresh();
    } catch (e: any) {
      setError(String(e.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function deleteIr(filename: string) {
    if (!confirm(`Apagar ${filename}?`)) return;
    await api.irDelete(filename);
    await refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* NAM amp models */}
      <div className="app-panel p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="t-eyebrow flex items-center gap-1.5">
              <Cpu size={11} /> Neural Amp Modeler
            </div>
            <div className="text-[16px] font-semibold mt-1">Amp clones IA</div>
            <p className="text-[12px] text-white/55 mt-1 leading-relaxed">
              Drop arquivos <span className="t-mono text-white/85">.nam</span> aqui.
              Pegue grátis em{" "}
              <a href="https://tonehunt.org" target="_blank" rel="noopener noreferrer"
                className="text-[hsl(11_89%_75%)] underline">
                tonehunt.org
              </a>
              {" "}— 5000+ amps Mesa, Marshall, Fender, etc.
            </p>
          </div>
          <button onClick={() => namInputRef.current?.click()} className="btn primary !py-2 !px-3">
            <Upload size={13} />
            Upload .nam
          </button>
          <input
            ref={namInputRef}
            type="file"
            accept=".nam"
            multiple
            className="hidden"
            onChange={(e) => uploadNam(e.target.files)}
          />
        </div>

        {/* Active NAM card */}
        {active && (
          <div
            className="mt-4 rounded-xl border p-4 relative overflow-hidden"
            style={{
              borderColor: "hsl(11 89% 61% / 0.5)",
              background: "hsl(11 89% 61% / 0.08)",
              boxShadow: "0 0 24px hsl(11 89% 61% / 0.18)",
            }}
          >
            <div className="absolute -top-12 right-0 h-24 w-24 rounded-full opacity-50"
              style={{ background: "radial-gradient(circle, hsl(11 89% 61%), transparent 70%)" }}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[hsl(11_89%_75%)]" />
                <span className="t-mono text-[9px] uppercase tracking-[0.22em] text-[hsl(11_89%_75%)]">
                  ATIVO · {active.device.toUpperCase()}
                </span>
              </div>
              <button onClick={unloadNam} disabled={busy} className="btn ghost !py-1 !px-2">
                <Power size={12} /> Desligar
              </button>
            </div>
            <div className="text-[18px] font-semibold mt-1">{active.name}</div>
            {(active.author || active.modeled_by) && (
              <div className="t-mono text-[11px] text-white/55 mt-1">
                {active.modeled_by && `modelado por ${active.modeled_by}`}
                {active.modeled_by && active.author && " · "}
                {active.author && `autor ${active.author}`}
              </div>
            )}
            <div className="t-mono text-[10px] text-white/40 mt-1">
              {active.sample_rate} Hz
            </div>
          </div>
        )}

        {/* List */}
        <div className="mt-4 space-y-1.5">
          {models.length === 0 && (
            <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-[12px] text-white/50">
              Nenhum modelo .nam ainda.<br />
              Drop um arquivo ou cole em{" "}
              <span className="t-mono text-white/70">~/Library/Application Support/GuitarAI/nam_models/</span>
            </div>
          )}
          {models.map((m) => {
            const isActive = active?.path === m.path;
            return (
              <div
                key={m.filename}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 transition ${
                  isActive
                    ? "border-[hsl(11_89%_61%/0.5)] bg-[hsl(11_89%_61%/0.06)]"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-medium truncate">{m.name}</div>
                  <div className="t-mono text-[10px] text-white/40">
                    {m.filename} · {m.size_kb} KB · {m.sample_rate} Hz
                    {m.modeled_by && ` · ${m.modeled_by}`}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {!isActive && (
                    <button
                      onClick={() => loadNam(m)}
                      disabled={busy}
                      className="btn ghost !py-1 !px-2 !text-[11px]"
                    >
                      Ativar
                    </button>
                  )}
                  <button
                    onClick={() => deleteNam(m.filename)}
                    className="btn ghost icon !p-1"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* IR cabinets */}
      <div className="app-panel p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="t-eyebrow flex items-center gap-1.5">
              <FileAudio2 size={11} /> Cabinet IR
            </div>
            <div className="text-[16px] font-semibold mt-1">Impulse responses</div>
            <p className="text-[12px] text-white/55 mt-1 leading-relaxed">
              Drop <span className="t-mono text-white/85">.wav</span> de cabinets (Mesa OS, Marshall 1960, Fender Bassman).
              Use em qualquer chain com pedal Convolution.
            </p>
          </div>
          <button onClick={() => irInputRef.current?.click()} className="btn primary !py-2 !px-3">
            <Upload size={13} />
            Upload IR
          </button>
          <input
            ref={irInputRef}
            type="file"
            accept=".wav,.aif,.aiff,.flac"
            multiple
            className="hidden"
            onChange={(e) => uploadIr(e.target.files)}
          />
        </div>

        <div className="mt-4 space-y-1.5">
          {irs.length === 0 && (
            <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-[12px] text-white/50">
              Nenhum IR ainda. Drop arquivos .wav curtos (10–500ms) com gravações de cabinet.
            </div>
          )}
          {irs.map((ir) => (
            <div
              key={ir.filename}
              className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 hover:border-white/20"
            >
              <div className="min-w-0">
                <div className="text-[13px] font-medium truncate">{ir.filename}</div>
                <div className="t-mono text-[10px] text-white/40">
                  {ir.sample_rate} Hz · {ir.channels}ch · {ir.duration_ms} ms · {ir.size_kb} KB
                </div>
              </div>
              <button onClick={() => deleteIr(ir.filename)} className="btn ghost icon !p-1">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="lg:col-span-2 rounded-lg border border-[hsl(0_84%_60%/0.4)] bg-[hsl(0_84%_60%/0.08)] px-3 py-2 text-[12px] text-[hsl(0_84%_75%)] flex items-center gap-2">
          <X size={12} />
          {error}
        </div>
      )}
    </div>
  );
}
