import { useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { TitleBar } from "./components/TitleBar";
import { LibraryView } from "./components/library/LibraryView";
import { PlayerView } from "./components/player/PlayerView";
import { PedalboardView } from "./components/pedalboard/PedalboardView";
import { SettingsView } from "./components/settings/SettingsView";
import { UpdateBanner } from "./components/UpdateBanner";
import { Onboarding } from "./components/onboarding/Onboarding";
import { useState as useReactState } from "react";
import { api } from "./lib/api";
import { engineWs, type EngineEvent } from "./lib/ws";
import { useStore } from "./lib/store";

export default function App() {
  const view = useStore((s) => s.view);
  const setEngineOk = useStore((s) => s.setEngineOk);
  const [showOnboarding, setShowOnboarding] = useReactState(false);
  const setDevices = useStore((s) => s.setDevices);
  const setPresets = useStore((s) => s.setPresets);
  const setSongs = useStore((s) => s.setSongs);
  const upsertSong = useStore((s) => s.upsertSong);
  const removeSong = useStore((s) => s.removeSong);
  const pushImportEvent = useStore((s) => s.pushImportEvent);
  const clearImport = useStore((s) => s.clearImport);
  const setLevels = useStore((s) => s.setLevels);
  const setStems = useStore((s) => s.setStems);
  const setTransport = useStore((s) => s.setTransport);

  // ---------- bootstrap ----------
  useEffect(() => {
    let alive = true;
    async function boot() {
      try {
        await api.health();
        if (!alive) return;
        setEngineOk(true);
      } catch {
        setEngineOk(false);
        return;
      }
      try {
        const [d, p, s, pd, ob] = await Promise.all([
          api.devices(),
          api.presets(),
          api.songs(),
          api.pedals(),
          api.onboarding(),
        ]);
        if (!alive) return;
        setDevices(d.devices);
        setPresets(p.presets);
        useStore.getState().setPresetCategories(p.categories);
        useStore.getState().setPedals(pd.pedals);
        setSongs(s.songs);
        if (!ob.completed) setShowOnboarding(true);
      } catch (e) {
        console.warn("bootstrap failed", e);
      }
    }
    boot();

    const healthTimer = setInterval(async () => {
      try {
        await api.health();
        setEngineOk(true);
      } catch {
        setEngineOk(false);
      }
    }, 5000);

    engineWs.connect();
    const off = engineWs.on(async (evt: EngineEvent) => {
      switch (evt.event) {
        case "levels":
          setLevels(evt.live.input, evt.live.output, evt.player.output);
          setTransport({ playing: evt.player.playing, position: evt.player.position });
          useStore.getState().setTuner(evt.tuner);
          useStore.getState().setRecorder({ active: evt.recorder.active, duration_sec: evt.recorder.duration_sec });
          break;
        case "import_progress":
          pushImportEvent({
            songId: evt.song_id,
            stage: evt.stage ?? "running",
            percent: evt.percent ?? 0,
            line: evt.line ?? "",
            kind: evt.kind,
          });
          break;
        case "import_error":
          pushImportEvent({
            songId: evt.song_id,
            stage: "error",
            percent: 0,
            line: evt.error,
          });
          break;
        case "song_added":
        case "song_ready":
          // refresh song row
          try {
            const s = await api.song(evt.song_id);
            upsertSong(s);
          } catch {}
          if (evt.event === "song_ready") clearImport(evt.song_id);
          break;
        case "song_loaded":
          setStems(evt.stems_summary as any);
          setTransport({ length: evt.length_frames, position: 0, playing: false });
          useStore.getState().setPlayerLoaded(evt.song_id);
          break;
        case "song_deleted":
          removeSong(evt.id);
          break;
        case "monitor_started":
          useStore.getState().setMonitoring(true);
          break;
        case "monitor_stopped":
          useStore.getState().setMonitoring(false);
          break;
        case "preset_applied":
          useStore.getState().setActivePreset(evt.name);
          break;
      }
    });

    return () => {
      alive = false;
      clearInterval(healthTimer);
      off();
    };
  }, [
    setEngineOk, setDevices, setPresets, setSongs,
    upsertSong, removeSong, pushImportEvent, clearImport,
    setLevels, setStems, setTransport,
  ]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <TitleBar />
        <UpdateBanner />
        <div className="flex-1 overflow-y-auto">
          {view === "library" && <LibraryView />}
          {view === "player" && <PlayerView />}
          {view === "pedaleira" && <PedalboardView />}
          {view === "settings" && <SettingsView />}
        </div>
      </main>
      {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}
    </div>
  );
}
