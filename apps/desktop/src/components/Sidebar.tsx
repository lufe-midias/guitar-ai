import { Library, Music, Settings, Sliders } from "lucide-react";
import clsx from "clsx";
import { useStore, type View } from "@/lib/store";
import { StatusDot } from "./ui/StatusDot";

const NAV: Array<{ id: View; label: string; icon: React.FC<any>; hint: string }> = [
  { id: "library", label: "Biblioteca", icon: Library, hint: "Músicas processadas" },
  { id: "player", label: "Player", icon: Music, hint: "Toque a música atual" },
  { id: "pedaleira", label: "Pedaleira", icon: Sliders, hint: "Efeitos · IA" },
  { id: "settings", label: "Configurar", icon: Settings, hint: "Devices · IA · Paths" },
];

export function Sidebar() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const engineOk = useStore((s) => s.engineOk);
  const monitoring = useStore((s) => s.monitoring);
  const playing = useStore((s) => s.playing);
  const songs = useStore((s) => s.songs);

  return (
    <aside className="flex w-[260px] shrink-0 flex-col gap-3 px-3 py-4">
      <div className="px-3 pt-2 pb-4">
        <div className="flex items-baseline gap-2">
          <span className="t-display text-[28px] t-gradient">Guitar AI</span>
          <span className="t-mono text-[10px] text-white/40">v0.1</span>
        </div>
        <div className="t-eyebrow mt-1">Lufe Tone Engine</div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={clsx(
                "group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-150",
                active
                  ? "border-[hsl(11_89%_61%/0.4)] bg-[hsl(11_89%_61%/0.08)] shadow-[0_0_24px_hsl(11_89%_61%/0.18)]"
                  : "border-transparent hover:border-[hsl(216_18%_21%/0.7)] hover:bg-white/[0.03]",
              )}
            >
              <Icon
                size={18}
                className={clsx(
                  "shrink-0 transition-colors",
                  active ? "text-[hsl(11_89%_61%)]" : "text-white/60 group-hover:text-white",
                )}
              />
              <div className="flex flex-col">
                <span className={clsx("text-[14px] font-medium leading-none", active ? "text-white" : "text-white/85")}>
                  {item.label}
                </span>
                <span className="text-[11px] text-white/40 mt-0.5">{item.hint}</span>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="app-panel-soft mt-2 px-3 py-3">
        <div className="flex items-center justify-between">
          <span className="t-eyebrow">Engine</span>
          <div className="flex items-center gap-1.5">
            <StatusDot state={engineOk ? "online" : "offline"} pulse />
            <span className="t-mono text-[11px] text-white/70">
              {engineOk ? "online" : "offline"}
            </span>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Mini label="Pedaleira" value={monitoring ? "ATIVA" : "—"} active={monitoring} />
          <Mini label="Player" value={playing ? "PLAY" : "—"} active={playing} />
        </div>
        <div className="mt-2 t-mono text-[10px] text-white/40">
          {songs.length} {songs.length === 1 ? "música" : "músicas"} · {songs.filter((s) => s.status === "ready").length} prontas
        </div>
      </div>
    </aside>
  );
}

function Mini({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div
      className={clsx(
        "rounded-lg border px-2 py-1.5",
        active ? "border-[hsl(191_75%_44%/0.4)] bg-[hsl(191_75%_44%/0.08)]" : "border-white/10 bg-white/[0.02]",
      )}
    >
      <div className="t-eyebrow !text-[9px]">{label}</div>
      <div
        className={clsx(
          "t-mono text-[11px] mt-0.5",
          active ? "text-[hsl(191_75%_44%)]" : "text-white/40",
        )}
      >
        {value}
      </div>
    </div>
  );
}
