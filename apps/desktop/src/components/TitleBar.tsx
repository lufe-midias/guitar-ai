import { useStore } from "@/lib/store";
import { VuMeter } from "./ui/VuMeter";
import { Activity } from "lucide-react";

export function TitleBar() {
  const inputLevel = useStore((s) => s.inputLevel);
  const outputLevel = useStore((s) => s.outputLevel);
  const playerLevel = useStore((s) => s.playerLevel);
  const monitoring = useStore((s) => s.monitoring);

  return (
    <div className="titlebar-drag flex h-12 shrink-0 items-center justify-between px-4 border-b border-white/5">
      <div className="flex items-center gap-3 pl-16">
        <Activity size={14} className="text-[hsl(191_75%_44%)]" />
        <span className="t-eyebrow">Holographic command deck</span>
      </div>
      <div className="titlebar-no-drag flex items-center gap-4">
        <div className="flex items-end gap-1.5">
          <VuMeter level={inputLevel * 4} height={28} label="IN" tone="coral" />
          <VuMeter level={outputLevel * 4} height={28} label="OUT" tone="cyan" />
          <VuMeter level={playerLevel * 4} height={28} label="MIX" tone="purple" />
        </div>
        <div className="t-mono text-[10px] text-white/40">
          {monitoring ? "monitor on" : "monitor off"}
        </div>
      </div>
    </div>
  );
}
