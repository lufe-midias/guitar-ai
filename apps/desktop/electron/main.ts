import { app, BrowserWindow, ipcMain, shell, dialog } from "electron";
import { spawn, ChildProcess } from "node:child_process";
import path from "node:path";
import http from "node:http";
import { autoUpdater } from "electron-updater";
import log from "electron-log";

const isDev = !app.isPackaged;
const ENGINE_URL = "http://127.0.0.1:7878";

log.transports.file.level = "info";
autoUpdater.logger = log;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow: BrowserWindow | null = null;
let engineProc: ChildProcess | null = null;
let updateState: {
  status: "idle" | "checking" | "available" | "downloading" | "ready" | "not-available" | "error";
  version?: string;
  progress?: number;
  error?: string;
} = { status: "idle" };

function pushUpdateState(next: typeof updateState) {
  updateState = next;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("guitar-ai:update-state", next);
  }
}

function setupAutoUpdater() {
  if (isDev) {
    log.info("[updater] skipping in dev");
    return;
  }
  autoUpdater.on("checking-for-update", () => pushUpdateState({ status: "checking" }));
  autoUpdater.on("update-available", (info) =>
    pushUpdateState({ status: "available", version: info.version }),
  );
  autoUpdater.on("update-not-available", () => pushUpdateState({ status: "not-available" }));
  autoUpdater.on("download-progress", (p) =>
    pushUpdateState({ status: "downloading", progress: Math.round(p.percent) }),
  );
  autoUpdater.on("update-downloaded", (info) =>
    pushUpdateState({ status: "ready", version: info.version }),
  );
  autoUpdater.on("error", (err) =>
    pushUpdateState({ status: "error", error: String(err?.message ?? err) }),
  );

  // Check on launch (silent), then every 6h
  setTimeout(() => autoUpdater.checkForUpdates().catch((e) => log.warn("[updater]", e)), 8000);
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 6 * 60 * 60 * 1000);
}

ipcMain.handle("guitar-ai:check-updates", async () => {
  try {
    return await autoUpdater.checkForUpdates();
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
});
ipcMain.handle("guitar-ai:install-update", () => {
  autoUpdater.quitAndInstall(false, true);
  return { ok: true };
});
ipcMain.handle("guitar-ai:get-update-state", () => updateState);
ipcMain.handle("guitar-ai:get-version", () => app.getVersion());

function spawnEngine() {
  if (process.env.GUITAR_AI_NO_SPAWN === "1") return;
  const fs = require("node:fs") as typeof import("node:fs");

  // Production: bundled binary in app.getPath('appData') resources
  const resourcesDir = process.resourcesPath; // .../Guitar AI.app/Contents/Resources
  const bundledBin = path.join(resourcesDir || "", "engine", "guitar-ai-engine", "guitar-ai-engine");
  if (resourcesDir && fs.existsSync(bundledBin)) {
    console.log(`[engine] launching bundled engine at ${bundledBin}`);
    engineProc = spawn(bundledBin, [], {
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      stdio: "inherit",
    });
    engineProc.on("exit", (code) => console.log(`[engine] exited code=${code}`));
    return;
  }

  // Dev: use the venv python from the repo
  const repoRoot = path.resolve(__dirname, "..", "..", "..");
  const enginePy = path.resolve(repoRoot, "apps/engine/.venv/bin/python");
  if (fs.existsSync(enginePy)) {
    console.log(`[engine] launching dev engine via ${enginePy}`);
    engineProc = spawn(enginePy, ["-m", "guitar_ai.server"], {
      cwd: path.resolve(repoRoot, "apps/engine"),
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      stdio: "inherit",
    });
    engineProc.on("exit", (code) => console.log(`[engine] exited code=${code}`));
  } else {
    console.warn(`[engine] no engine found — assuming external`);
  }
}

function pingEngine(retries = 30): Promise<void> {
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(`${ENGINE_URL}/health`, (res) => {
        if (res.statusCode === 200) {
          res.resume();
          resolve();
        } else {
          res.resume();
          retry();
        }
      });
      req.on("error", retry);
      req.setTimeout(500, () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (--retries <= 0) return reject(new Error("engine not ready"));
      setTimeout(tryOnce, 500);
    };
    tryOnce();
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0b1020",
    vibrancy: "under-window",
    visualEffectState: "active",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.on("ready-to-show", () => mainWindow?.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    await mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    await mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(async () => {
  spawnEngine();
  try {
    await pingEngine();
    console.log("[engine] healthy");
  } catch (e) {
    console.warn("[engine] timeout — continuing anyway", e);
  }
  await createWindow();
  setupAutoUpdater();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("before-quit", () => {
  if (engineProc && !engineProc.killed) engineProc.kill("SIGTERM");
});
