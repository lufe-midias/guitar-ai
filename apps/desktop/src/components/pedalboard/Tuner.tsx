import { useStore } from "@/lib/store";
import { Music4 } from "lucide-react";

export function Tuner() {
  const tuner = useStore((s) => s.tuner);
  const monitoring = useStore((s) => s.monitoring);

  const detected = tuner?.detected ?? false;
  const note = tuner?.note ?? "—";
  const octave = tuner?.octave ?? 0;
  const cents = tuner?.cents ?? 0;
  const freq = tuner?.frequency ?? 0;

  // visual: cents bar from -50 to +50
  const pct = Math.max(-50, Math.min(50, cents));
  const inTune = Math.abs(cents) < 5 && detected;
  const color = !detected
    ? "hsl(215 16% 70% / 0.4)"
    : inTune
      ? "hsl(152 76% 52%)"
      : Math.abs(cents) < 15
        ? "hsl(38 95% 58%)"
        : "hsl(0 84% 60%)";

  return (
    <div
      className="app-panel relative overflow-hidden p-4"
      style={{ borderColor: detected ? color.replace(")", " / 0.5)") : undefined }}
    >
      <div className="hud-grid" />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 min-w-[120px]">
          <Music4 size={14} className="text-white/40" />
          <span className="t-eyebrow">Tuner</span>
          {!monitoring && (
            <span className="t-mono text-[9px] text-white/30">monitor off</span>
          )}
        </div>

        {/* Big note display */}
        <div className="flex items-baseline gap-1 min-w-[140px]">
          <span
            className="t-display text-[56px] leading-none transition-colors"
            style={{ color: detected ? color : "hsl(215 16% 70% / 0.4)" }}
          >
            {note || "—"}
          </span>
          {detected && (
            <span className="t-mono text-[16px] text-white/50">{octave}</span>
          )}
        </div>

        {/* Cents bar */}
        <div className="flex-1 relative">
          <div className="flex justify-between t-mono text-[9px] text-white/30 mb-1">
            <span>−50¢</span>
            <span className="text-white/60">{detected ? `${cents.toFixed(1)}¢` : "—"}</span>
            <span>+50¢</span>
          </div>
          <div className="relative h-3 rounded-full bg-white/5 overflow-hidden">
            {/* center marker */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30" />
            {/* tick marks */}
            {[-25, 25].map((c) => (
              <div
                key={c}
                className="absolute top-1/4 bottom-1/4 w-px bg-white/10"
                style={{ left: `${50 + c}%` }}
              />
            ))}
            {detected && (
              <div
                className="absolute top-0 bottom-0 transition-all duration-100"
                style={{
                  left: `${50 + Math.min(0, pct)}%`,
                  width: `${Math.abs(pct)}%`,
                  background: color,
                  boxShadow: `0 0 12px ${color}`,
                }}
              />
            )}
          </div>
          <div className="t-mono text-[10px] text-white/40 mt-1">
            {detected ? `${freq.toFixed(2)} Hz` : "aguardando sinal"}
          </div>
        </div>

        {/* Status indicator */}
        <div className="min-w-[60px] text-right">
          {detected && inTune && (
            <span className="t-mono text-[11px] text-[hsl(152_76%_75%)] font-semibold">IN TUNE</span>
          )}
          {detected && !inTune && cents > 0 && (
            <span className="t-mono text-[11px] text-[hsl(38_95%_75%)]">SHARP ↑</span>
          )}
          {detected && !inTune && cents < 0 && (
            <span className="t-mono text-[11px] text-[hsl(38_95%_75%)]">FLAT ↓</span>
          )}
        </div>
      </div>
    </div>
  );
}
