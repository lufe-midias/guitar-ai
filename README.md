# Guitar AI

> **Caixa de som com IA**: separe stems de qualquer música, isole/mute a guitarra original, toque por cima com pedaleira completa baseada em IA. 100% local, em macOS.

## Recursos

- **Stem separation** com Demucs (4 ou 6 stems incluindo guitarra isolada). MPS-acelerado em Apple Silicon.
- **Player multi-stem** com mute/solo por canal, varispeed (0.5×-1.5×), loop A-B
- **Pedaleira IA** — 26 presets em 7 categorias + 22 pedais editáveis (drive, dynamics, EQ, modulation, time, pitch, util)
- **NAM (Neural Amp Modeler)** — carrega `.nam` de [tonehunt.org](https://tonehunt.org) (5000+ amps grátis)
- **Cabinet IRs** — convolução .wav nativa
- **Tuner cromático** YIN-based, ±3¢ em todas as 6 cordas
- **Recorder/Looper** — captura player mix + monitor live em .wav 24-bit no Desktop
- **Chain Builder** — drag-and-drop de pedais com knobs editáveis, salvar como preset próprio
- **Spotify / YouTube** — paste URL, baixa via spotDL/yt-dlp, 100% offline depois

## Stack

- **UI:** Electron 33 + React 19 + Vite 6 + TypeScript + Tailwind 4 (Lufe OS DS)
- **Audio Engine:** Python 3.14 + FastAPI + Pedalboard (Spotify) + Demucs (Meta) + sounddevice + librosa
- **IA:** htdemucs_6s (separação) · NAM core (Neural Amp Modeler) · YIN (tuner)

## Estrutura

```
guitar-ai/
├── apps/
│   ├── desktop/     # Electron + React (UI Lufe OS DS) — ~2900 LoC
│   └── engine/      # Python FastAPI sidecar — ~2000 LoC
│       └── build_engine.py   # PyInstaller bundler
├── data/            # SQLite + músicas processadas (em ~/Library/...)
├── scripts/
│   ├── dev.sh       # roda engine + UI em modo dev
│   ├── install.sh   # primeira instalação
│   └── release.sh   # builda .dmg distribuível
└── ROADMAP.md       # P0 entregue · P1/P2/P3 documentados
```

## Setup (primeira vez)

```bash
# Pré-requisitos
brew install ffmpeg python@3.14 node

# Setup
cd apps/engine
python3 -m venv --system-site-packages .venv
source .venv/bin/activate
pip install -e .
pip install demucs spotdl pyinstaller neural-amp-modeler

cd ../desktop
npm install
```

## Modo dev

```bash
# Terminal 1 — engine
cd apps/engine && source .venv/bin/activate && python -m guitar_ai.server

# Terminal 2 — UI
cd apps/desktop && GUITAR_AI_NO_SPAWN=1 npm run dev

# Ou tudo de uma vez:
./scripts/dev.sh
```

## Build do .dmg distribuível

```bash
./scripts/release.sh
# → release/Guitar AI-0.1.0-arm64.dmg (~1-2 GB com engine bundled)
```

O `release.sh` faz:
1. **PyInstaller** bundla engine Python (torch + demucs + librosa) em `apps/engine/dist/guitar-ai-engine/`
2. **electron-builder** empacota UI + bundle como `extraResources` num `.dmg`

## Onde ficam os dados

```
~/Library/Application Support/GuitarAI/
├── library.db          # SQLite (músicas, stems_dir, status)
├── downloads/          # mp3 baixados (yt-dlp / spotDL)
├── stems/              # stems do Demucs por música
├── nam_models/         # .nam files (drop aqui)
├── irs/                # cabinet impulse responses
├── presets/            # presets custom do usuário
└── cache/

~/Desktop/Guitar AI Recordings/
└── jam · 2026-05-10 11-45-26.wav   # gravações
```

## Ports

| Porta | Serviço |
|---|---|
| 7878 | Engine FastAPI + WebSocket |
| 5173 | Vite dev server (apenas em dev) |

## Roadmap

P0 (vendável) está 100% entregue. Veja `ROADMAP.md` pra P1/P2/P3.

## License

[Elastic License 2.0](./LICENSE) — source-available. Você pode usar pessoalmente,
estudar, modificar, contribuir. Não pode oferecer como serviço gerenciado
nem revender. Copyright © 2026 Lufe Mídias.
