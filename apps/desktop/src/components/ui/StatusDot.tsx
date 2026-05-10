import clsx from "clsx";

type Props = { state: "online" | "offline" | "degraded"; pulse?: boolean; size?: number };

const COLOR = {
  online: "hsl(152 76% 52%)",
  offline: "hsl(0 84% 60%)",
  degraded: "hsl(38 95% 58%)",
};

export function StatusDot({ state, pulse, size = 8 }: Props) {
  return (
    <span
      className={clsx("inline-block rounded-full", pulse && state === "online" && "pulse-aura")}
      style={{
        width: size,
        height: size,
        background: COLOR[state],
        boxShadow: `0 0 8px ${COLOR[state]}`,
      }}
    />
  );
}
