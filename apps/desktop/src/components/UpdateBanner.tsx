import { useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import type { UpdateState } from "@/lib/api";

export function UpdateBanner() {
  const [state, setState] = useState<UpdateState>({ status: "idle" });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const api = window.guitarAI;
    if (!api?.onUpdateState) return;
    api.getUpdateState?.().then((s) => s && setState(s)).catch(() => {});
    const off = api.onUpdateState((s) => setState(s));
    return off;
  }, []);

  if (dismissed) return null;

  // Hide silently for irrelevant states
  if (state.status === "idle" || state.status === "not-available" || state.status === "checking") {
    return null;
  }

  const colors: Record<string, string> = {
    available: "hsl(217 91% 60%)",
    downloading: "hsl(38 95% 58%)",
    ready: "hsl(152 76% 52%)",
    error: "hsl(0 84% 60%)",
  };
  const color = colors[state.status] ?? "hsl(217 91% 60%)";

  return (
    <div
      className="mx-3 mb-2 flex items-center gap-3 rounded-xl border px-3 py-2 backdrop-blur-md"
      style={{
        borderColor: color.replace(")", " / 0.4)"),
        background: color.replace(")", " / 0.06)"),
      }}
    >
      {state.status === "downloading" ? (
        <RefreshCw size={14} className="animate-spin" style={{ color }} />
      ) : (
        <Download size={14} style={{ color }} />
      )}
      <div className="flex-1 min-w-0">
        {state.status === "available" && (
          <div className="text-[12px]">
            <span className="text-white/85">Atualização disponível</span>
            {state.version && <span className="t-mono ml-1.5 text-white/45">v{state.version}</span>}
            <span className="text-white/45 ml-2">· baixando…</span>
          </div>
        )}
        {state.status === "downloading" && (
          <div>
            <div className="text-[12px] text-white/85">
              Baixando atualização <span className="t-mono text-white/45 ml-1">{state.progress ?? 0}%</span>
            </div>
            <div className="mt-1 h-1 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full transition-[width]"
                style={{ width: `${state.progress ?? 0}%`, background: color }}
              />
            </div>
          </div>
        )}
        {state.status === "ready" && (
          <div className="text-[12px]">
            <span className="text-white/85">Atualização pronta · v{state.version}</span>
            <button
              onClick={() => window.guitarAI?.installUpdate?.()}
              className="btn primary ml-3 !py-1 !px-2 !text-[11px]"
            >
              Reiniciar e instalar
            </button>
          </div>
        )}
        {state.status === "error" && (
          <div className="text-[12px] text-[hsl(0_84%_85%)] truncate">
            Erro: {state.error}
          </div>
        )}
      </div>
      <button onClick={() => setDismissed(true)} className="btn ghost icon !p-1">
        <X size={12} />
      </button>
    </div>
  );
}
