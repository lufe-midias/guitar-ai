import { create } from "zustand";
import type { AudioDevice, Pedal, Preset, PresetCategory, Song, StemSummary, TunerReading, RecorderStatus } from "./api";

export type View = "library" | "player" | "pedaleira" | "settings";

export type ImportProgress = {
  songId: number | null;
  stage: string;
  percent: number;
  line: string;
  kind?: string;
};

export type StoreState = {
  view: View;
  setView: (v: View) => void;

  // engine status
  engineOk: boolean;
  setEngineOk: (ok: boolean) => void;

  // devices
  devices: AudioDevice[];
  inputDeviceIndex: number | null;
  outputDeviceIndex: number | null;
  setDevices: (d: AudioDevice[]) => void;
  setInput: (i: number | null) => void;
  setOutput: (i: number | null) => void;

  // library
  songs: Song[];
  setSongs: (s: Song[]) => void;
  upsertSong: (s: Song) => void;
  removeSong: (id: number) => void;

  selectedSongId: number | null;
  setSelectedSong: (id: number | null) => void;

  // import
  imports: ImportProgress[];
  pushImportEvent: (p: ImportProgress) => void;
  clearImport: (songId: number | null) => void;

  // presets
  presets: Preset[];
  setPresets: (p: Preset[]) => void;
  presetCategories: PresetCategory[];
  setPresetCategories: (c: PresetCategory[]) => void;
  pedals: Pedal[];
  setPedals: (p: Pedal[]) => void;
  activePresetName: string | null;
  setActivePreset: (name: string | null) => void;

  // player
  playerLoadedSongId: number | null;
  setPlayerLoaded: (id: number | null) => void;
  playing: boolean;
  position: number;
  length: number;
  speed: number;
  masterVolume: number;
  setTransport: (s: Partial<{ playing: boolean; position: number; length: number; speed: number; masterVolume: number }>) => void;
  stems: StemSummary[];
  setStems: (s: StemSummary[]) => void;

  // monitor (pedalboard)
  monitoring: boolean;
  setMonitoring: (m: boolean) => void;

  // levels (rolling)
  inputLevel: number;
  outputLevel: number;
  playerLevel: number;
  setLevels: (in_: number, out: number, player: number) => void;

  // tuner
  tuner: TunerReading | null;
  setTuner: (t: TunerReading | null) => void;

  // recorder
  recorder: RecorderStatus;
  setRecorder: (r: Partial<RecorderStatus>) => void;
};

export const useStore = create<StoreState>((set, get) => ({
  view: "library",
  setView: (view) => set({ view }),

  engineOk: false,
  setEngineOk: (engineOk) => set({ engineOk }),

  devices: [],
  inputDeviceIndex: null,
  outputDeviceIndex: null,
  setDevices: (devices) => {
    const defIn = devices.find((d) => d.is_default_input && d.max_input_channels > 0)?.index ?? null;
    const defOut = devices.find((d) => d.is_default_output && d.max_output_channels > 0)?.index ?? null;
    set((st) => ({
      devices,
      inputDeviceIndex: st.inputDeviceIndex ?? defIn,
      outputDeviceIndex: st.outputDeviceIndex ?? defOut,
    }));
  },
  setInput: (inputDeviceIndex) => set({ inputDeviceIndex }),
  setOutput: (outputDeviceIndex) => set({ outputDeviceIndex }),

  songs: [],
  setSongs: (songs) => set({ songs }),
  upsertSong: (s) =>
    set((st) => {
      const idx = st.songs.findIndex((x) => x.id === s.id);
      const next = [...st.songs];
      if (idx >= 0) next[idx] = s;
      else next.unshift(s);
      return { songs: next };
    }),
  removeSong: (id) => set((st) => ({ songs: st.songs.filter((s) => s.id !== id) })),

  selectedSongId: null,
  setSelectedSong: (selectedSongId) => set({ selectedSongId }),

  imports: [],
  pushImportEvent: (p) =>
    set((st) => {
      const idx = st.imports.findIndex((i) => i.songId === p.songId);
      const next = [...st.imports];
      if (idx >= 0) next[idx] = { ...next[idx], ...p };
      else next.unshift(p);
      return { imports: next.slice(0, 6) };
    }),
  clearImport: (songId) =>
    set((st) => ({ imports: st.imports.filter((i) => i.songId !== songId) })),

  presets: [],
  setPresets: (presets) => set({ presets }),
  presetCategories: [],
  setPresetCategories: (presetCategories) => set({ presetCategories }),
  pedals: [],
  setPedals: (pedals) => set({ pedals }),
  activePresetName: null,
  setActivePreset: (activePresetName) => set({ activePresetName }),

  playerLoadedSongId: null,
  setPlayerLoaded: (playerLoadedSongId) => set({ playerLoadedSongId }),
  playing: false,
  position: 0,
  length: 0,
  speed: 1.0,
  masterVolume: 1.0,
  setTransport: (s) => set((st) => ({ ...st, ...s })),
  stems: [],
  setStems: (stems) => set({ stems }),

  monitoring: false,
  setMonitoring: (monitoring) => set({ monitoring }),

  inputLevel: 0,
  outputLevel: 0,
  playerLevel: 0,
  setLevels: (inputLevel, outputLevel, playerLevel) =>
    set({ inputLevel, outputLevel, playerLevel }),

  tuner: null,
  setTuner: (tuner) => set({ tuner }),

  recorder: { active: false, path: null, frames: 0, duration_sec: 0, sample_rate: 48000, sources: [] },
  setRecorder: (r) => set((st) => ({ recorder: { ...st.recorder, ...r } })),
}));
