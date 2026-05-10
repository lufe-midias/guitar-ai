export type UpdateState = {
  status: "idle" | "checking" | "available" | "downloading" | "ready" | "not-available" | "error";
  version?: string;
  progress?: number;
  error?: string;
};

declare global {
  interface Window {
    guitarAI?: {
      engineUrl: string;
      wsUrl: string;
      platform: string;
      versions: Record<string, string>;
      checkUpdates?: () => Promise<any>;
      installUpdate?: () => Promise<any>;
      getUpdateState?: () => Promise<UpdateState>;
      getVersion?: () => Promise<string>;
      onUpdateState?: (cb: (s: UpdateState) => void) => () => void;
    };
  }
}

export const ENGINE_URL = window.guitarAI?.engineUrl ?? "http://127.0.0.1:7878";
export const WS_URL = window.guitarAI?.wsUrl ?? "ws://127.0.0.1:7878/ws";

async function call<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ENGINE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

export type AudioDevice = {
  index: number;
  name: string;
  hostapi: number;
  max_input_channels: number;
  max_output_channels: number;
  default_samplerate: number;
  is_default_input: boolean;
  is_default_output: boolean;
};

export type Song = {
  id: number;
  source_url: string | null;
  title: string;
  artist: string | null;
  album: string | null;
  duration_sec: number | null;
  bpm: number | null;
  key: string | null;
  cover_path: string | null;
  audio_path: string;
  stems_dir: string | null;
  stem_model: string | null;
  status: "pending" | "downloading" | "separating" | "ready" | "error";
  error: string | null;
  created_at: number;
  updated_at: number;
};

export type Preset = {
  name: string;
  category?: string;
  description: string;
  chain: Array<{ type: string; params?: Record<string, any>; bypass?: boolean }>;
};

export type PresetCategory = { id: string; label: string };

export type Pedal = {
  type: string;
  category: string;
  label: string;
  color: string;
  params: Record<string, any>;
};

export type StemSummary = { name: string; volume: number; muted: boolean; solo: boolean };

export type NamModel = {
  name: string;
  author: string | null;
  modeled_by: string | null;
  sample_rate: number;
  filename: string;
  path: string;
  size_kb: number;
};

export type IRFile = {
  filename: string;
  path: string;
  sample_rate: number;
  channels: number;
  frames: number;
  duration_ms: number;
  size_kb: number;
};

export type Recording = {
  filename: string;
  path: string;
  duration_sec: number;
  size_kb: number;
  created_at: number;
};

export type RecorderStatus = {
  active: boolean;
  path: string | null;
  frames: number;
  duration_sec: number;
  sample_rate: number;
  sources: string[];
};

export type TunerReading = {
  detected: boolean;
  frequency: number;
  note: string;
  octave: number;
  cents: number;
  rms: number;
};

export type UserPreset = {
  name: string;
  category: string;
  description: string;
  chain: Array<{ type: string; params?: Record<string, any>; bypass?: boolean }>;
  user: true;
  filename: string;
};

export type ActiveNam = {
  name: string;
  author: string | null;
  modeled_by: string | null;
  sample_rate: number;
  device: string;
  path: string;
};

export const api = {
  health: () => call<{ ok: boolean; version: string }>("/health"),
  devices: () => call<{ devices: AudioDevice[] }>("/devices"),
  presets: () => call<{ presets: Preset[]; categories: PresetCategory[] }>("/presets"),
  pedals: () => call<{ pedals: Pedal[] }>("/pedals"),
  state: () => call<any>("/state"),

  // library
  songs: () => call<{ songs: Song[] }>("/songs"),
  song: (id: number) => call<Song>(`/songs/${id}`),
  importSong: (url: string, model?: string) =>
    call<{ ok: boolean; job_id: string }>("/songs/import", {
      method: "POST",
      body: JSON.stringify({ url, model }),
    }),
  deleteSong: (id: number) => call<{ ok: boolean }>(`/songs/${id}`, { method: "DELETE" }),
  loadSong: (id: number) =>
    call<{ ok: boolean; loaded: string[]; length_frames: number; sample_rate: number }>(
      `/songs/${id}/load`,
      { method: "POST" },
    ),

  // player
  play: (output_device?: any) =>
    call<{ ok: boolean }>("/player/play", { method: "POST", body: JSON.stringify({ output_device }) }),
  pause: () => call<{ ok: boolean }>("/player/pause", { method: "POST" }),
  stop: () => call<{ ok: boolean }>("/player/stop", { method: "POST" }),
  seek: (frame: number) =>
    call<{ ok: boolean }>("/player/seek", { method: "POST", body: JSON.stringify({ frame }) }),
  loop: (start: number | null, end: number | null) =>
    call<{ ok: boolean }>("/player/loop", { method: "POST", body: JSON.stringify({ start, end }) }),
  speed: (speed: number) =>
    call<{ ok: boolean; speed: number }>("/player/speed", {
      method: "POST",
      body: JSON.stringify({ speed }),
    }),
  master: (volume: number) =>
    call<{ ok: boolean }>("/player/master", { method: "POST", body: JSON.stringify({ volume }) }),
  stem: (name: string, opts: Partial<{ volume: number; muted: boolean; solo: boolean }>) =>
    call<{ ok: boolean; stems: StemSummary[] }>(`/player/stems/${encodeURIComponent(name)}`, {
      method: "POST",
      body: JSON.stringify(opts),
    }),

  // monitor (pedalboard)
  monitorStart: (cfg: { input_device?: any; output_device?: any; sample_rate?: number; block_size?: number }) =>
    call<{ ok: boolean }>("/monitor/start", { method: "POST", body: JSON.stringify(cfg) }),
  monitorStop: () => call<{ ok: boolean }>("/monitor/stop", { method: "POST" }),
  setChain: (chain: any[]) =>
    call<{ ok: boolean }>("/monitor/chain", { method: "POST", body: JSON.stringify({ chain }) }),
  applyPreset: (name: string) =>
    call<{ ok: boolean; chain: any[] }>(`/monitor/preset/${encodeURIComponent(name)}`, { method: "POST" }),
  setGain: (input_gain?: number, output_gain?: number) =>
    call<{ ok: boolean }>("/monitor/gain", {
      method: "POST",
      body: JSON.stringify({ input_gain, output_gain }),
    }),

  // NAM amp models
  namModels: () => call<{ models: NamModel[]; active: ActiveNam | null }>("/nam/models"),
  namLoad: (path: string) =>
    call<{ ok: boolean; model: ActiveNam }>("/nam/load", {
      method: "POST",
      body: JSON.stringify({ path }),
    }),
  namUnload: () => call<{ ok: boolean }>("/nam/unload", { method: "POST" }),
  namBypass: (bypass: boolean) =>
    call<{ ok: boolean }>("/nam/bypass", { method: "POST", body: JSON.stringify({ bypass }) }),
  namUpload: async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${ENGINE_URL}/nam/upload`, { method: "POST", body: fd });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<{ ok: boolean; filename: string }>;
  },
  namDelete: (filename: string) =>
    call<{ ok: boolean }>(`/nam/${encodeURIComponent(filename)}`, { method: "DELETE" }),

  // IR cabinets
  irs: () => call<{ irs: IRFile[] }>("/irs"),
  irUpload: async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${ENGINE_URL}/irs/upload`, { method: "POST", body: fd });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<{ ok: boolean; filename: string }>;
  },
  irDelete: (filename: string) =>
    call<{ ok: boolean }>(`/irs/${encodeURIComponent(filename)}`, { method: "DELETE" }),

  // Recorder
  recordStart: (prefix?: string) =>
    call<RecorderStatus & { ok: true }>("/recorder/start", {
      method: "POST",
      body: JSON.stringify({ prefix: prefix ?? "jam" }),
    }),
  recordStop: () =>
    call<RecorderStatus & { ok: true }>("/recorder/stop", { method: "POST" }),
  recordStatus: () => call<RecorderStatus>("/recorder/status"),
  recordings: () => call<{ recordings: Recording[] }>("/recordings"),
  recordingDelete: (filename: string) =>
    call<{ ok: boolean }>(`/recordings/${encodeURIComponent(filename)}`, { method: "DELETE" }),

  // User presets
  userPresets: () => call<{ presets: UserPreset[] }>("/presets/user"),
  userPresetSave: (preset: { name: string; description: string; chain: any[]; category?: string }) =>
    call<{ ok: boolean; preset: UserPreset }>("/presets/user", {
      method: "POST",
      body: JSON.stringify(preset),
    }),
  userPresetDelete: (filename: string) =>
    call<{ ok: boolean }>(`/presets/user/${encodeURIComponent(filename)}`, { method: "DELETE" }),

  // Onboarding
  onboarding: () => call<{ completed: boolean; version: string | null; completed_at: number | null; preferences?: any }>("/onboarding"),
  onboardingComplete: (preferences: Record<string, any> = {}) =>
    call<{ ok: boolean }>("/onboarding/complete", {
      method: "POST",
      body: JSON.stringify({ preferences }),
    }),
  onboardingReset: () => call<{ ok: boolean }>("/onboarding/reset", { method: "POST" }),
};
