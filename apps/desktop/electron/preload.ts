import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("guitarAI", {
  engineUrl: "http://127.0.0.1:7878",
  wsUrl: "ws://127.0.0.1:7878/ws",
  platform: process.platform,
  versions: process.versions,
  // Updates
  checkUpdates: () => ipcRenderer.invoke("guitar-ai:check-updates"),
  installUpdate: () => ipcRenderer.invoke("guitar-ai:install-update"),
  getUpdateState: () => ipcRenderer.invoke("guitar-ai:get-update-state"),
  getVersion: () => ipcRenderer.invoke("guitar-ai:get-version"),
  onUpdateState: (cb: (state: any) => void) => {
    const handler = (_e: any, s: any) => cb(s);
    ipcRenderer.on("guitar-ai:update-state", handler);
    return () => ipcRenderer.removeListener("guitar-ai:update-state", handler);
  },
});
