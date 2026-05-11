# Guitar AI — Documentação completa

> Referência única do projeto. Para visão geral curta veja [README.md](./README.md).
> Para roadmap de features futuras veja [ROADMAP.md](./ROADMAP.md).

---

## 1. O que é

Aplicativo macOS standalone que combina:

1. **Stem separation** (Demucs htdemucs_6s) — extrai drums · bass · vocals · guitar · piano · other de qualquer mp3
2. **Player multi-stem** — mute/solo por canal, varispeed, loop A-B, sincronizado em amostra
3. **Pedaleira IA ao vivo** — 22 pedais + 26 presets prontos + chain builder drag-and-drop
4. **NAM** (Neural Amp Modeler) — carrega `.nam` para amp sim por rede neural (5000+ amps grátis em [tonehunt.org](https://tonehunt.org))
5. **Cabinet IR loader** — convolução .wav nativa via Pedalboard
6. **Tuner cromático** — YIN-based, ±3¢ em todas as 6 cordas
7. **Recorder** — captura player mix + monitor live → `.wav` 24-bit em `~/Desktop/Guitar AI Recordings/`
8. **Download Spotify/YouTube** — yt-dlp + spotDL, 100% offline depois do primeiro download
9. **Auto-updater** — checa GitHub Releases, baixa e instala v→v+1 automaticamente
10. **Onboarding wizard** — 4 steps na primeira execução

Funciona 100% offline depois do primeiro download. Otimizado para Apple Silicon (MPS — Metal Performance Shaders).

---

## 2. Arquitetura

```
┌────────────────────────────────────────────┐
│         ELECTRON (Guitar AI.app)           │
│  ┌──────────────────────────────────────┐  │
│  │ Renderer (React 19 + Vite + TS)      │  │
│  │ • Library / Player / Pedaleira /     │  │
│  │   Configurar views                   │  │
│  │ • Onboarding wizard                  │  │
│  │ • Auto-updater banner                │  │
│  └────────────┬─────────────────────────┘  │
│               │ HTTP + WebSocket            │
│               │ (localhost:7878)            │
│  ┌────────────▼─────────────────────────┐  │
│  │ Python Engine (PyInstaller bundle)   │  │
│  │ • FastAPI + uvicorn (42 rotas)       │  │
│  │ • Pedalboard (live FX)               │  │
│  │ • Demucs (stem separation)           │  │
│  │ • sounddevice (CoreAudio I/O)        │  │
│  │ • librosa.yin (tuner)                │  │
│  │ • NAM core (amp sim)                 │  │
│  │ • yt-dlp + spotDL (download)         │  │
│  │ • aiosqlite (library DB)             │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘

         ↓ produces files in

~/Library/Application Support/GuitarAI/   ← dados do usuário
~/Desktop/Guitar AI Recordings/           ← gravações
```

Renderer e engine se comunicam via HTTP REST + WebSocket (`localhost:7878`).
Engine é spawnado pelo Electron main process e morre junto.

---

## 3. Layout de pastas

### 3.1 Código-fonte
```
~/Code/guitar-ai/
├── README.md                  visão geral curta
├── ROADMAP.md                 P1/P2/P3 features futuras
├── DOCS.md                    este arquivo
├── LICENSE                    Elastic License 2.0
├── .gitignore
│
├── apps/
│   ├── desktop/               Electron + React UI
│   │   ├── electron/          main process + preload
│   │   │   ├── main.ts        spawn engine, auto-updater, window mgmt
│   │   │   └── preload.ts     IPC bridge
│   │   ├── src/
│   │   │   ├── App.tsx        root + WS handler + bootstrap
│   │   │   ├── main.tsx       React entry
│   │   │   ├── components/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── TitleBar.tsx
│   │   │   │   ├── UpdateBanner.tsx
│   │   │   │   ├── library/        LibraryView + AddSongDialog
│   │   │   │   ├── player/         PlayerView + StemMixer
│   │   │   │   ├── pedalboard/     PedalboardView + Tuner + Recorder
│   │   │   │   │                   + ChainBuilder + AmpRig
│   │   │   │   ├── settings/       SettingsView
│   │   │   │   ├── onboarding/     Onboarding wizard
│   │   │   │   └── ui/             VuMeter · StatusDot
│   │   │   ├── lib/
│   │   │   │   ├── api.ts          REST client tipado
│   │   │   │   ├── ws.ts           WebSocket auto-reconnect
│   │   │   │   └── store.ts        Zustand store
│   │   │   └── styles/
│   │   │       └── globals.css     Lufe OS DS tokens + Tailwind
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── tsconfig.electron.json
│   │   ├── index.html
│   │   ├── build/
│   │   │   └── icon.icns           auto-pegado pelo electron-builder
│   │   ├── dist/                   vite build output (gitignored)
│   │   ├── dist-electron/          tsc output (gitignored)
│   │   └── release/                .dmg gerado (gitignored)
│   │
│   └── engine/                Python audio engine
│       ├── pyproject.toml
│       ├── run_engine.py           PyInstaller entry-point
│       ├── build_engine.py         PyInstaller script
│       ├── src/guitar_ai/
│       │   ├── __init__.py
│       │   ├── __main__.py         python -m guitar_ai
│       │   ├── server.py           FastAPI + WS + lifespan
│       │   ├── audio.py            Live monitor (sounddevice + Pedalboard)
│       │   ├── player.py           Multi-stem player
│       │   ├── stems.py            Demucs wrapper
│       │   ├── download.py         yt-dlp + spotDL
│       │   ├── library.py          SQLite (aiosqlite)
│       │   ├── presets.py          26 built-in presets
│       │   ├── nam.py              NAM model runtime
│       │   ├── irs.py              IR file listing
│       │   ├── recorder.py         Multi-source WAV recorder
│       │   ├── tuner.py            YIN pitch detection
│       │   ├── user_presets.py     User-saved presets
│       │   └── paths.py            Filesystem paths
│       ├── .venv/                  (gitignored)
│       ├── dist/                   PyInstaller output (gitignored)
│       └── build/                  (gitignored)
│
├── assets/
│   ├── icon.svg                    fonte editável do ícone
│   ├── icon.icns                   ícone macOS multi-resolução
│   └── icon.iconset/               (gitignored — intermediário)
│
├── scripts/
│   ├── dev.sh                      sobe engine + UI em modo dev
│   ├── install.sh                  primeira instalação
│   ├── release.sh                  PyInstaller + electron-builder
│   └── build_icon.py               SVG → .icns via cairosvg
│
└── .github/workflows/
    └── release.yml                 GitHub Actions: build + publish on tag
```

### 3.2 App instalado
```
/Applications/Guitar AI.app/
└── Contents/
    ├── MacOS/Guitar AI                       binário Electron
    ├── Resources/
    │   ├── app.asar                          renderer + electron main bundlados
    │   ├── icon.icns
    │   └── engine/guitar-ai-engine/
    │       ├── guitar-ai-engine              Mach-O Python sidecar
    │       └── _internal/                    torch, demucs, librosa, etc
    └── Frameworks/                           Electron + helpers
```

### 3.3 Dados do usuário
```
~/Library/Application Support/GuitarAI/
├── library.db                  SQLite (músicas, status, stem_dir)
├── onboarding.json             {completed, version, preferences}
├── downloads/
│   ├── youtube/                .mp3 baixados via yt-dlp
│   └── spotify/                .mp3 via spotDL
├── stems/<song stem>/          drums.wav · bass.wav · vocals.wav · etc
├── nam_models/                 .nam (drop seus aqui)
├── irs/                        cabinet impulse responses .wav
├── presets/                    presets do usuário (.json)
└── cache/

~/Desktop/Guitar AI Recordings/
└── jam · YYYY-MM-DD HH-MM-SS.wav    24-bit 48kHz stereo
```

### 3.4 Logs do auto-updater
```
~/Library/Logs/Guitar AI/main.log
```

---

## 4. API do engine (porta 7878)

42 rotas. Lista resumida:

### Meta
- `GET /health` — `{ok, version, ts}`
- `GET /state` — estado completo (live + player + tuner + recorder)
- `GET /devices` — sounddevice list
- `GET /openapi.json` — schema completo

### Library
- `GET /songs` — lista
- `GET /songs/{id}` — detalhe
- `POST /songs/import` — `{url, model}` → dispara download + Demucs
- `DELETE /songs/{id}` — apaga música + stems
- `POST /songs/{id}/load` — carrega stems no player

### Player
- `POST /player/play` · `/pause` · `/stop` · `/seek` · `/loop` · `/speed` · `/master`
- `POST /player/stems/{name}` — `{volume?, muted?, solo?}`

### Monitor (live FX chain)
- `POST /monitor/start` · `/stop`
- `POST /monitor/chain` — `{chain: [{type, params}]}`
- `POST /monitor/preset/{name}` — aplica built-in preset
- `POST /monitor/gain` — `{input_gain?, output_gain?}`

### Presets / Pedals
- `GET /presets` — 26 built-in + categorias
- `GET /preset/{name}`
- `GET /pedals` — 22 pedais com defaults

### User Presets
- `GET /presets/user` · `POST /presets/user` · `DELETE /presets/user/{filename}`

### NAM
- `GET /nam/models` · `POST /nam/upload` · `POST /nam/load` · `POST /nam/unload` · `POST /nam/bypass` · `DELETE /nam/{filename}`

### IRs
- `GET /irs` · `POST /irs/upload` · `DELETE /irs/{filename}`

### Recorder
- `POST /recorder/start` · `/recorder/stop` · `GET /recorder/status`
- `GET /recordings` · `DELETE /recordings/{filename}`

### Onboarding
- `GET /onboarding` · `POST /onboarding/complete` · `POST /onboarding/reset`

### WebSocket
- `WS /ws` — broadcast 20 Hz: levels (in/out/player) · tuner · recorder · import progress · state changes

---

## 5. Stack técnico

| Camada | Tech | Versão |
|---|---|---|
| UI | Electron | 33.4 |
|  | React | 19 |
|  | Vite | 6 |
|  | TypeScript | 5.9 |
|  | Tailwind | 4 |
|  | Zustand | 5 |
|  | Lucide icons | 0.462 |
|  | electron-updater | 6.8 |
| Engine | Python | 3.14 |
|  | FastAPI | 0.135 |
|  | uvicorn | 0.46 |
|  | sounddevice | 0.5 |
|  | Pedalboard (Spotify) | 0.9.22 |
|  | Demucs (Meta) | 4.0.1 |
|  | torch | 2.11 (+MPS) |
|  | torchcodec | 0.11 |
|  | torchaudio | 2.11 |
|  | librosa | 0.11 |
|  | neural-amp-modeler | 0.12.3 |
|  | aiosqlite | 0.22 |
|  | yt-dlp | latest |
|  | spotdl | 4.4 |
| Build | PyInstaller | 6.20 |
|  | electron-builder | 25.1 |
|  | cairosvg | 2.9 |

---

## 6. Como rodar

### 6.1 Como usuário final
1. Baixar `Guitar-AI-x.y.z-arm64.dmg` em https://github.com/lufe-midias/guitar-ai/releases
2. Duplo-clique → arrastar pra Applications
3. Primeira execução: macOS pode pedir confirmação (app sem code signing) — System Settings → Privacy & Security → "Open Anyway"
4. Onboarding wizard guia pelos primeiros 30 segundos
5. Auto-updater vai checar GitHub a cada 6h e oferecer atualizações

### 6.2 Como dev local
```bash
# Primeira vez
brew install ffmpeg python@3.14 node python-tk@3.14
cd ~/Code/guitar-ai/apps/engine
python3 -m venv --system-site-packages .venv
source .venv/bin/activate
pip install -e .
pip install demucs spotdl pyinstaller neural-amp-modeler cairosvg

cd ../desktop
npm install

# Rodar
~/Code/guitar-ai/scripts/dev.sh
# Ou separado:
# Terminal 1: cd apps/engine && source .venv/bin/activate && python -m guitar_ai
# Terminal 2: cd apps/desktop && GUITAR_AI_NO_SPAWN=1 npm run dev
```

### 6.3 Empacotar localmente
```bash
~/Code/guitar-ai/scripts/release.sh
# → apps/desktop/release/Guitar AI-x.y.z-arm64.dmg
```

### 6.4 Publicar release (GitHub Actions builda automaticamente)
```bash
# bump version
sed -i '' 's/"version": "0.1.0"/"version": "0.1.1"/' apps/desktop/package.json

git commit -am "v0.1.1 — changelog aqui"
git tag v0.1.1
git push origin main v0.1.1
# workflow .github/workflows/release.yml dispara
# ~6-15 min depois: release aparece em github.com/lufe-midias/guitar-ai/releases
# usuários com app instalado veem banner "atualização disponível"
```

---

## 7. Design system — Lufe OS

UI segue o `lufe-os-design` system. Resumo dos tokens:

- **Background:** `hsl(220 30% 8%)` — midnight deep
- **Coral primary:** `hsl(11 89% 61%)` — coral/pink-orange
- **Cyan accent:** `hsl(191 75% 44%)` — electric cyan
- **Purple:** `hsl(268 78% 65%)`
- **Magenta:** `hsl(328 82% 52%)`

**Tipografia:**
- Display: Space Grotesk 700 (tracking -0.02em)
- Sans: Inter 400-700
- Mono: JetBrains Mono (tabular-nums)
- HUD labels: uppercase + tracking 0.22em

**Surfaces:** Glass (`bg-card/0.7 + backdrop-blur(20px)`) é o container padrão.
**Animations:** `pulse-aura` em status badges, `scan-line` em loading, transições 150-300ms com `cubic-bezier(0.4, 0, 0.2, 1)`.

Tokens completos em `apps/desktop/src/styles/globals.css`.

---

## 8. Audio engine — detalhes

### 8.1 Live monitor
- Single duplex sounddevice stream
- Sample rate: 48 kHz (target)
- Block size: 128 samples (~2.7 ms hardware latency)
- Mono in (guitar Hi-Z) → NAM (se carregado) → Pedalboard chain → stereo out
- Atomic chain swap: trocar de preset em runtime sem corte de áudio

### 8.2 Player
- Single output stream (separado do monitor)
- Cada stem é carregado em memória como np.float32 (frames, 2)
- Resample linear pra 48 kHz na carga
- Varispeed via linear resample no callback (afeta pitch — produção futura usa rubberband)
- Loop A-B: cursor pula de B → A

### 8.3 Stem separation
- Comando: `python -m demucs -n <model> -d <device> -o <dir> <audio>`
- `htdemucs_6s` (default): drums/bass/vocals/guitar/piano/other — modelo único, ~30s pra 213s no M-chip
- `htdemucs_ft`: drums/bass/vocals/other — bag of 4 models (×4 mais lento)
- Modelos cached em `~/.cache/torch/hub/checkpoints/`
- Device escolhido automaticamente: MPS (Apple Silicon) > CUDA > CPU

### 8.4 Tuner
- librosa.yin com janela de 200 ms (9600 samples a 48 kHz)
- Range 70-1500 Hz (cobre E2 drop até além de E4)
- Silence floor: RMS < 0.005
- Resultados broadcast por WS a 20 Hz

### 8.5 Recorder
- Multi-source: player.py e audio.py chamam `recorder.feed(source, block)` no callback
- Worker thread pega blocks de cada queue, time-aligns (zip), soma, escreve
- Output: `.wav` 24-bit PCM 48 kHz stereo no `~/Desktop/Guitar AI Recordings/`

### 8.6 NAM
- Loader: `nam.models.init_from_nam(config)` — modelo PyTorch
- Inferência: `model(tensor)` no callback antes do Pedalboard chain
- MPS-acelerado se disponível
- Bypass / unload thread-safe

---

## 9. Build & distribuição

### 9.1 PyInstaller bundle
- `apps/engine/build_engine.py` → `apps/engine/dist/guitar-ai-engine/`
- Output: ~900 MB (torch + demucs + librosa + soundfile + pedalboard + cffi/numpy/scipy)
- Entrypoint: `run_engine.py` → adiciona `src/` ao path → `from guitar_ai.server import main`

### 9.2 electron-builder
- Config em `apps/desktop/package.json` → `build` field
- `extraResources` copia `apps/engine/dist/guitar-ai-engine` pra `Contents/Resources/engine/`
- Ícone auto-detectado em `apps/desktop/build/icon.icns`
- DMG output: ~415 MB (compressed APFS)

### 9.3 GitHub Actions
- Workflow: `.github/workflows/release.yml`
- Trigger: push de tag `v*` ou manual
- Runner: `macos-14` (arm64)
- Steps: setup → install deps → PyInstaller → npm ci → `npx electron-builder --mac --publish always`
- Publica em GitHub Releases: `.dmg` + `.blockmap` + `latest-mac.yml`

### 9.4 Auto-updater (electron-updater)
- Lê `latest-mac.yml` do release mais recente
- Compara `app.getVersion()` com `version` do yml
- Se houver update: download em background → notifica renderer via IPC `guitar-ai:update-state`
- UI: `<UpdateBanner>` no topo da janela com ações Cancelar / Reiniciar e instalar
- Em dev (`app.isPackaged === false`): updater desativado

---

## 10. Troubleshooting

### Engine não sobe (porta 7878)
```bash
# Ver o que está na porta
lsof -i :7878
# Matar
lsof -i :7878 | tail -n +2 | awk '{print $2}' | xargs kill -9
# Ver logs do app
tail -50 "$HOME/Library/Logs/Guitar AI/main.log"
```

### Demucs falha
```bash
# Modelo corrompido?
rm -rf ~/.cache/torch/hub/checkpoints/
# Rodar import de novo — vai re-baixar (~250 MB pro htdemucs_6s)
```

### Audio device não aparece
- Conferir System Settings → Privacy & Security → **Microphone** com Guitar AI marcado
- Pra entrada USB, conectar a interface ANTES de abrir o app
- Re-scan: na tela Configurar, botão "Re-scan devices"

### App não abre (Gatekeeper)
- System Settings → Privacy & Security → procurar Guitar AI → "Open Anyway"
- Alternativa CLI:
  ```bash
  xattr -dr com.apple.quarantine "/Applications/Guitar AI.app"
  ```

### Reset onboarding
```bash
rm "$HOME/Library/Application Support/GuitarAI/onboarding.json"
# Próxima abertura mostra wizard de novo
```

### Reset library completa
```bash
rm -rf "$HOME/Library/Application Support/GuitarAI"
# Música e stems se vão
```

### DevTools em produção
```bash
open -a "Guitar AI" --args --remote-debugging-port=9222
# Abrir http://localhost:9222 no Chrome
```

---

## 11. Decisões de design

### Por que Electron + Python sidecar?
- UI rica em React + dev veloz com HMR
- Pedalboard / Demucs / NAM são Python-first (re-implementar em Rust seria meses)
- Sidecar isolado: crash do engine não derruba a UI

### Por que macOS-only no v0.1?
- Foco. CoreAudio + MPS + sounddevice é consistente. Windows/Linux entram quando houver demanda.
- Apple Silicon (M-series) dá MPS pra Demucs/NAM 5-8× CPU sem CUDA.

### Por que YIN em vez de FFT pra tuner?
- Autocorrelação simples falha em low frequencies (E2 = 82 Hz) por confusão com harmônicos
- YIN é cumulative-mean-normalized difference function, robusta em qualquer freq
- librosa.yin é referência da indústria

### Por que single port 7878?
- Reduz superfície de configuração
- FastAPI faz REST + WebSocket no mesmo binding
- Localhost-only (não escuta em interfaces externas)

### Por que Elastic License?
- Source-available: comunidade pode auditar e contribuir
- Anti-revenda: ninguém oferece Guitar AI como serviço gerenciado
- Permite uso pessoal/interno sem fricção
- Plano comercial fica claro: hosted/managed only via licença separada

---

## 12. Versões

| Versão | Data | Mudanças principais |
|---|---|---|
| 0.1.0 | 2026-05-10 | Primeira release pública |

---

## 13. Links

- **Repo:** https://github.com/lufe-midias/guitar-ai
- **Releases:** https://github.com/lufe-midias/guitar-ai/releases
- **Actions:** https://github.com/lufe-midias/guitar-ai/actions
- **Issues:** https://github.com/lufe-midias/guitar-ai/issues
- **License:** [LICENSE](./LICENSE)
- **Roadmap:** [ROADMAP.md](./ROADMAP.md)
