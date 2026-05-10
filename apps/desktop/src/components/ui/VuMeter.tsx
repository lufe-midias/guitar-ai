type Props = {
  level: number; // 0-1
  height?: number;
  label?: string;
  tone?: "coral" | "cyan" | "purple";
};

export function VuMeter({ level, height = 64, label, tone = "cyan" }: Props) {
  const clamped = Math.max(0, Math.min(1, level));
  const display = Math.sqrt(clamped); // perceptual
  const pct = Math.round(display * 100);
  const color =
    tone === "coral"
      ? "hsl(11 89% 61%)"
      : tone === "purple"
        ? "hsl(268 78% 65%)"
        : "hsl(191 75% 44%)";

  return (
    <div className="flex flex-col items-center gap-1">
      {label && <span className="t-eyebrow !text-[9px]">{label}</span>}
      <div
        className="relative w-2 rounded-full overflow-hidden border"
        style={{
          height,
          borderColor: "hsl(216 18% 21% / 0.6)",
          background: "hsl(220 30% 6% / 0.8)",
        }}
      >
        <div
          className="absolute bottom-0 left-0 right-0 transition-[height] duration-75"
          style={{
            height: `${pct}%`,
            background: `linear-gradient(180deg, ${tone === "coral" ? "hsl(0 84% 60%)" : "hsl(38 95% 58%)"} 0%, ${color} 60%, hsl(152 76% 52%) 100%)`,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
      </div>
    </div>
  );
}
