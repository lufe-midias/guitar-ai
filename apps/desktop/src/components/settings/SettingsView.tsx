import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Cpu, RefreshCw } from "lucide-react";
import { api, type AudioDevice } from "@/lib/api";
import { useStore } from "@/lib/store";

export function SettingsView() {
  const devices = useStore((s) => s.devices);
  const setDevices = useStore((s) => s.setDevices);
  const inputDeviceIndex = useStore((s) => s.inputDeviceIndex);
  const outputDeviceIndex = useStore((s) => s.outputDeviceIndex);
  const setInput = useStore((s) => s.setInput);
  const setOutput = useStore((s) => s.setOutput);
  const monitoring = useStore((s) => s.monitoring);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      const r = await api.devices();
      setDevices(r.devices);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const inputs = devices.filter((d) => d.max_input_channels > 0);
  const outputs = devices.filter((d) => d.max_output_channels > 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-end justify-between">
        <div>
          <div className="t-eyebrow">Configurar</div>
          <h1 className="t-display text-[40px] mt-1">Áudio · Engine · Paths</h1>
        </div>
        <button onClick={refresh} className="btn ghost">
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Re-scan devices
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <DeviceList
          title="Input · sua guitarra"
          icon={ArrowUpFromLine}
          devices={inputs}
          selected={inputDeviceIndex}
          onSelect={setInput}
          emptyHint="Nenhum input encontrado. Conecte uma interface de áudio USB (Scarlett, Audient, etc) ou habilite o microfone do sistema."
        />
        <DeviceList
          title="Output · pra saída (LINE IN do TANX100)"
          icon={ArrowDownToLine}
          devices={outputs}
          selected={outputDeviceIndex}
          onSelect={setOutput}
        />
      </div>

      <div className="app-panel p-5">
        <div className="t-eyebrow flex items-center gap-2">
          <Cpu size={12} />
          Engine
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4 t-mono text-[12px] text-white/70 md:grid-cols-4">
          <Stat label="Sample rate" value="48000 Hz" />
          <Stat label="Block size" value="128" />
          <Stat label="Latency target" value="~3 ms" />
          <Stat label="Monitor" value={monitoring ? "ATIVO" : "—"} />
        </div>
        <p className="mt-4 text-[12px] text-white/45 leading-relaxed">
          O Engine roda como sidecar Python na porta <span className="t-mono text-white/70">7878</span>, hospedando Pedalboard +
          Demucs. As músicas e stems ficam em <span className="t-mono text-white/70">~/Library/Application Support/GuitarAI</span>.
        </p>
      </div>
    </div>
  );
}

function DeviceList({
  title,
  icon: Icon,
  devices,
  selected,
  onSelect,
  emptyHint,
}: {
  title: string;
  icon: React.FC<any>;
  devices: AudioDevice[];
  selected: number | null;
  onSelect: (i: number) => void;
  emptyHint?: string;
}) {
  return (
    <div className="app-panel p-5">
      <div className="t-eyebrow flex items-center gap-2">
        <Icon size={12} />
        {title}
      </div>
      <div className="mt-3 space-y-1">
        {devices.length === 0 && (
          <div className="rounded-lg border border-dashed border-white/10 p-4 text-[12px] text-white/50">
            {emptyHint ?? "Nenhum device disponível"}
          </div>
        )}
        {devices.map((d) => {
          const active = selected === d.index;
          return (
            <button
              key={d.index}
              onClick={() => onSelect(d.index)}
              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${
                active
                  ? "border-[hsl(191_75%_44%/0.5)] bg-[hsl(191_75%_44%/0.1)]"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <div>
                <div className={`text-[13px] font-medium ${active ? "text-white" : "text-white/85"}`}>
                  {d.name}
                </div>
                <div className="t-mono text-[10px] text-white/40 mt-0.5">
                  in:{d.max_input_channels} · out:{d.max_output_channels} · {Math.round(d.default_samplerate)} Hz
                </div>
              </div>
              {active && (
                <span className="t-mono text-[9px] uppercase tracking-[0.22em] text-[hsl(191_75%_70%)]">ativo</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="t-eyebrow !text-[9px]">{label}</div>
      <div className="text-[15px] mt-0.5 text-white/85">{value}</div>
    </div>
  );
}
