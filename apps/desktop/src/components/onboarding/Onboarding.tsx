import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, ChevronRight, ChevronLeft, Music, AudioLines,
  Sliders, Disc3, Cpu, Check, ArrowDownToLine, ArrowUpFromLine,
} from "lucide-react";
import { api, type AudioDevice } from "@/lib/api";
import { useStore } from "@/lib/store";

type Step = "welcome" | "devices" | "tour" | "ready";

export function Onboarding({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>("welcome");
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [inputIdx, setInputIdx] = useState<number | null>(null);
  const [outputIdx, setOutputIdx] = useState<number | null>(null);
  const setView = useStore((s) => s.setView);
  const setStoreInput = useStore((s) => s.setInput);
  const setStoreOutput = useStore((s) => s.setOutput);

  useEffect(() => {
    api.devices().then((r) => {
      setDevices(r.devices);
      const di = r.devices.find((d) => d.is_default_input && d.max_input_channels > 0)?.index ?? null;
      const dout = r.devices.find((d) => d.is_default_output && d.max_output_channels > 0)?.index ?? null;
      setInputIdx(di);
      setOutputIdx(dout);
    });
  }, []);

  const inputs = useMemo(() => devices.filter((d) => d.max_input_channels > 0), [devices]);
  const outputs = useMemo(() => devices.filter((d) => d.max_output_channels > 0), [devices]);

  async function finish() {
    if (inputIdx !== null) setStoreInput(inputIdx);
    if (outputIdx !== null) setStoreOutput(outputIdx);
    await api.onboardingComplete({
      input_device_index: inputIdx,
      output_device_index: outputIdx,
    });
    onClose();
  }

  function next() {
    if (step === "welcome") setStep("devices");
    else if (step === "devices") setStep("tour");
    else if (step === "tour") setStep("ready");
    else finish();
  }

  function prev() {
    if (step === "devices") setStep("welcome");
    else if (step === "tour") setStep("devices");
    else if (step === "ready") setStep("tour");
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-xl">
      <div className="app-panel relative w-[680px] max-w-[92vw] overflow-hidden">
        <div className="hud-grid" />

        <div
          className="absolute -top-32 -left-24 h-72 w-72 rounded-full opacity-50"
          style={{ background: "radial-gradient(circle, hsl(11 89% 61%), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-24 -right-32 h-72 w-72 rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, hsl(191 75% 44%), transparent 70%)" }}
        />

        {/* Step pills */}
        <div className="absolute top-5 right-5 flex items-center gap-1.5">
          {(["welcome", "devices", "tour", "ready"] as Step[]).map((s) => (
            <span
              key={s}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: step === s ? 28 : 8,
                background: step === s ? "hsl(11 89% 61%)" : "hsl(216 18% 21%)",
              }}
            />
          ))}
        </div>

        <div className="relative px-10 pt-12 pb-8">
          {step === "welcome" && <Welcome />}
          {step === "devices" && (
            <Devices
              inputs={inputs}
              outputs={outputs}
              inputIdx={inputIdx}
              outputIdx={outputIdx}
              setInputIdx={setInputIdx}
              setOutputIdx={setOutputIdx}
            />
          )}
          {step === "tour" && <Tour />}
          {step === "ready" && <Ready setView={setView} onClose={onClose} />}
        </div>

        <div className="flex items-center justify-between border-t border-white/5 bg-black/30 px-6 py-4">
          <button
            onClick={prev}
            disabled={step === "welcome"}
            className="btn ghost !py-2 disabled:opacity-30"
          >
            <ChevronLeft size={14} /> Voltar
          </button>
          <div className="t-mono text-[10px] text-white/30">
            {{ welcome: "1", devices: "2", tour: "3", ready: "4" }[step]} de 4
          </div>
          {step === "ready" ? (
            <button onClick={finish} className="btn primary !py-2">
              <Check size={14} /> Começar
            </button>
          ) : (
            <button onClick={next} className="btn primary !py-2">
              Próximo <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Welcome() {
  return (
    <div>
      <div className="t-eyebrow flex items-center gap-1.5">
        <Sparkles size={11} /> Bem-vindo
      </div>
      <h2 className="t-display t-gradient text-[42px] mt-2">Guitar AI</h2>
      <p className="text-[14px] text-white/65 mt-3 max-w-md leading-relaxed">
        Caixa de som com IA. Separe stems de qualquer música, mute a guitarra original,
        toque por cima com 26 presets de pedaleira ou monte sua própria chain. Tudo local.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <Feature icon={Music} label="Stem separation" hint="Demucs htdemucs_6s · MPS-acelerado" />
        <Feature icon={Sliders} label="Pedaleira IA" hint="22 pedais · 26 presets · NAM" />
        <Feature icon={Cpu} label="Tuner ±3¢" hint="YIN-based · 6 cordas calibradas" />
        <Feature icon={Disc3} label="Recorder" hint="Player + monitor → ~/Desktop" />
      </div>

      <div className="mt-6 t-mono text-[11px] text-white/40">
        Vamos passar pela configuração inicial em 30 segundos.
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  label,
  hint,
}: {
  icon: React.FC<any>;
  label: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-[hsl(191_75%_44%)]" />
        <span className="text-[13px] font-semibold">{label}</span>
      </div>
      <div className="t-mono text-[10px] text-white/45 mt-1">{hint}</div>
    </div>
  );
}

function Devices({
  inputs,
  outputs,
  inputIdx,
  outputIdx,
  setInputIdx,
  setOutputIdx,
}: {
  inputs: AudioDevice[];
  outputs: AudioDevice[];
  inputIdx: number | null;
  outputIdx: number | null;
  setInputIdx: (i: number | null) => void;
  setOutputIdx: (i: number | null) => void;
}) {
  return (
    <div>
      <div className="t-eyebrow flex items-center gap-1.5">
        <AudioLines size={11} /> Áudio
      </div>
      <h2 className="t-display text-[28px] mt-2">Selecione seus devices</h2>
      <p className="text-[13px] text-white/55 mt-2">
        Você pode trocar depois em Configurar. Pra usar a pedaleira live, precisa de uma interface USB com entrada Hi-Z.
      </p>

      <div className="mt-5 space-y-4">
        <DeviceGroup
          icon={ArrowUpFromLine}
          label="Input · sua guitarra"
          devices={inputs}
          selected={inputIdx}
          onSelect={setInputIdx}
          emptyHint="Nenhum input encontrado. Conecte uma interface USB pra usar a pedaleira."
        />
        <DeviceGroup
          icon={ArrowDownToLine}
          label="Output · saída de áudio"
          devices={outputs}
          selected={outputIdx}
          onSelect={setOutputIdx}
        />
      </div>
    </div>
  );
}

function DeviceGroup({
  icon: Icon,
  label,
  devices,
  selected,
  onSelect,
  emptyHint,
}: {
  icon: React.FC<any>;
  label: string;
  devices: AudioDevice[];
  selected: number | null;
  onSelect: (i: number | null) => void;
  emptyHint?: string;
}) {
  return (
    <div>
      <div className="t-eyebrow flex items-center gap-1.5 mb-2">
        <Icon size={11} /> {label}
      </div>
      {devices.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-[12px] text-white/45">
          {emptyHint ?? "Sem devices"}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-1.5">
          {devices.map((d) => {
            const active = selected === d.index;
            return (
              <button
                key={d.index}
                onClick={() => onSelect(d.index)}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                  active
                    ? "border-[hsl(191_75%_44%/0.5)] bg-[hsl(191_75%_44%/0.1)]"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div>
                  <div className={`text-[13px] ${active ? "text-white font-medium" : "text-white/85"}`}>
                    {d.name}
                  </div>
                  <div className="t-mono text-[10px] text-white/40 mt-0.5">
                    in:{d.max_input_channels} · out:{d.max_output_channels} · {Math.round(d.default_samplerate)} Hz
                  </div>
                </div>
                {active && <Check size={14} className="text-[hsl(191_75%_70%)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Tour() {
  return (
    <div>
      <div className="t-eyebrow">Tour rápido</div>
      <h2 className="t-display text-[28px] mt-2">Como usar</h2>

      <div className="mt-5 space-y-3">
        <TourStep
          n="1"
          icon={Music}
          title="Biblioteca"
          body="Cole URL de Spotify ou YouTube → o engine baixa, separa stems via Demucs (1-2 min), e fica pronto pra tocar offline."
        />
        <TourStep
          n="2"
          icon={Sliders}
          title="Player"
          body="Mute a guitarra original (clicando no stem), use loop A-B, varispeed 0.5×-1.5×, mixer por canal."
        />
        <TourStep
          n="3"
          icon={Cpu}
          title="Pedaleira"
          body="Tuner sempre on, 26 presets ou monte chain custom, NAM amp models grátis em tonehunt.org, IR cabinets via Convolution."
        />
        <TourStep
          n="4"
          icon={Disc3}
          title="Recorder"
          body="Botão grande em Pedaleira. Captura player + monitor live em .wav 24-bit no ~/Desktop/Guitar AI Recordings/."
        />
      </div>
    </div>
  );
}

function TourStep({
  n,
  icon: Icon,
  title,
  body,
}: {
  n: string;
  icon: React.FC<any>;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="t-display w-7 shrink-0 text-[20px] t-gradient">{n}</div>
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <Icon size={12} className="text-[hsl(11_89%_61%)]" />
          <span className="text-[13px] font-semibold">{title}</span>
        </div>
        <p className="text-[12px] text-white/55 mt-1 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function Ready({
  setView,
  onClose,
}: {
  setView: (v: "library" | "player" | "pedaleira" | "settings") => void;
  onClose: () => void;
}) {
  return (
    <div className="text-center py-4">
      <div
        className="mx-auto h-20 w-20 rounded-full grid place-items-center mb-5"
        style={{
          background: "linear-gradient(135deg, hsl(11 89% 61% / 0.2), hsl(191 75% 44% / 0.2))",
          boxShadow: "0 0 48px hsl(11 89% 61% / 0.35)",
        }}
      >
        <Sparkles size={32} className="text-[hsl(11_89%_61%)]" />
      </div>
      <div className="t-eyebrow">Pronto</div>
      <h2 className="t-display text-[32px] mt-2">Tudo configurado</h2>
      <p className="text-[14px] text-white/55 mt-3 max-w-md mx-auto leading-relaxed">
        Comece importando uma música ou explore a pedaleira. Bom som.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <button
          onClick={() => {
            setView("library");
            onClose();
            window.guitarAI && (window.guitarAI as any).onboardingDone?.();
          }}
          className="btn ghost"
        >
          <Music size={13} /> Ir pra biblioteca
        </button>
        <button
          onClick={() => {
            setView("pedaleira");
            onClose();
          }}
          className="btn ghost"
        >
          <Sliders size={13} /> Abrir pedaleira
        </button>
      </div>
    </div>
  );
}
