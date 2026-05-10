import { WS_URL } from "./api";

export type EngineEvent =
  | { event: "hello"; version: string }
  | {
      event: "levels";
      live: { input: number; output: number };
      player: { output: number; position: number; playing: boolean };
      tuner: { detected: boolean; frequency: number; note: string; octave: number; cents: number; rms: number } | null;
      recorder: { active: boolean; duration_sec: number };
    }
  | { event: "import_progress"; song_id: number | null; stage?: string; source?: string; percent?: number; line?: string; kind?: string; model?: string; device?: string }
  | { event: "import_error"; song_id: number | null; error: string }
  | { event: "song_added"; song_id: number; title: string }
  | { event: "song_ready"; song_id: number; stems: string[] }
  | { event: "song_loaded"; song_id: number; loaded: string[]; length_frames: number; sample_rate: number; stems_summary: any[] }
  | { event: "song_deleted"; id: number }
  | { event: "monitor_started" }
  | { event: "monitor_stopped" }
  | { event: "chain_updated"; length: number }
  | { event: "preset_applied"; name: string; length: number }
  | { event: "nam_loaded"; model: any }
  | { event: "nam_unloaded" }
  | { event: "recording_started"; path: string }
  | { event: "recording_stopped"; path: string; frames: number; duration_sec: number }
  | { event: "user_preset_saved"; name: string };

type Listener = (evt: EngineEvent) => void;

class EngineWs {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private retryDelay = 500;
  private closed = false;

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.closed = false;
    try {
      this.ws = new WebSocket(WS_URL);
    } catch (e) {
      this.scheduleReconnect();
      return;
    }
    this.ws.onopen = () => {
      this.retryDelay = 500;
    };
    this.ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        this.listeners.forEach((l) => l(data));
      } catch (e) {
        console.warn("ws parse fail", e);
      }
    };
    this.ws.onerror = () => {};
    this.ws.onclose = () => {
      if (!this.closed) this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    setTimeout(() => this.connect(), this.retryDelay);
    this.retryDelay = Math.min(this.retryDelay * 2, 5000);
  }

  on(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close() {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
  }
}

export const engineWs = new EngineWs();
