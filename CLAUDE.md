# Claude Code — instruções deste projeto

Este projeto é o **Guitar AI** — app macOS que faz stem separation + pedaleira IA + recording. Leia [DOCS.md](./DOCS.md) pra referência completa de arquitetura. Este arquivo é o guia rápido pra Claude operar aqui.

## Stack em uma frase

Electron 33 + React 19 + Vite + TS + Tailwind 4 (UI) ⇄ Python 3.14 + FastAPI + Pedalboard + Demucs + librosa + NAM (engine sidecar). Sidecar empacotado via PyInstaller no `.dmg` distribuível.

## Onde mexer

| Quer fazer | Mexa em |
|---|---|
| Adicionar pedal/preset | `apps/engine/src/guitar_ai/presets.py` (lista) + `audio.py` (PEDAL_BUILDERS se for tipo novo) |
| Endpoint novo | `apps/engine/src/guitar_ai/server.py` |
| Tela / componente UI | `apps/desktop/src/components/<area>/` |
| Tokens de cor / DS | `apps/desktop/src/styles/globals.css` |
| Comportamento ao boot do Electron | `apps/desktop/electron/main.ts` |
| Logic do auto-updater | `apps/desktop/electron/main.ts` + `src/components/UpdateBanner.tsx` |
| Cliente REST | `apps/desktop/src/lib/api.ts` |
| Eventos WebSocket | `apps/desktop/src/lib/ws.ts` + `apps/desktop/src/App.tsx` |
| Store global | `apps/desktop/src/lib/store.ts` |
| Build do bundle Python | `apps/engine/build_engine.py` |
| Empacotamento .dmg | `apps/desktop/package.json` → `build` field + `.github/workflows/release.yml` |

## Convenções (importantes)

### UI
- **Lufe OS DS é obrigatório.** Dark first, glass surfaces, glow coral/cyan, tipografia Space Grotesk display + Inter sans + JetBrains Mono mono. Detalhes em `globals.css`.
- **Sem emoji em UI** — usar Lucide React icons (já importado).
- **Português pt-BR** na UI ("Tocar", não "Play"; "Configurar", não "Settings"). Termos técnicos em inglês ficam (deploy, stem, preset).
- **Sentence case** em títulos de seção. UPPERCASE só em eyebrows com `t-eyebrow` (tracking 0.22em).
- **Decorações absolute (blobs, glow circles) DEVEM ter `pointer-events-none`** — descobrimos na marra que blobs com radial-gradient interceptam cliques. Pattern correto:
  ```tsx
  <div className="pointer-events-none absolute -bottom-24 -right-32 ..." />
  ```

### Engine
- Endpoints REST seguem REST convencional: `GET /resource` (lista), `GET /resource/{id}` (item), `POST /resource` (criar), `DELETE /resource/{id}`, ações via `POST /resource/{verb}`.
- WebSocket em `/ws` faz broadcast — qualquer evento que muda estado global deve passar por `hub.broadcast({event, ...})`.
- Audio callbacks (`audio.py._callback`, `player.py._callback`) NÃO podem alocar lentamente nem chamar I/O bloqueante — runtime real-time. Operações pesadas vão em thread separada.
- Chain swap deve ser **lock-free** (atomic reassignment do `self._chain`).
- Imports relativos OK dentro de `guitar_ai/` mas o entry-point é `run_engine.py` na raiz (pra PyInstaller resolver o pacote).

### Python deps
- venv mora em `apps/engine/.venv/` (com `--system-site-packages` pra reaproveitar `torch` do system Python).
- Dependências CLI puras (que rodamos via subprocess) NÃO ficam em `pyproject.toml` — só as importadas. `demucs` e `spotdl` são CLI, então não estão lá.
- Subprocess pra `demucs` usa `sys.executable -m demucs` pra herdar o venv ativo.

### Git / Release
- Tag = `vX.Y.Z` (semver). Tag dispara `.github/workflows/release.yml` que builda em macOS-14 runner e publica em GitHub Releases.
- **Bump em `apps/desktop/package.json` ANTES de taggear** — electron-builder lê dali.
- Após push do tag, electron-updater nos clientes em produção vai detectar a nova versão e oferecer auto-update.
- **Auto-install só funciona com code signing.** Sem Apple Developer ID, o download chega mas o "Reiniciar e instalar" falha (ShipIt valida signature). Estado atual: sem signing.

## Workflows comuns

### "Mudei código e quero testar localmente"
```bash
# UI puramente: HMR do vite faz pra você se dev server estiver up
cd ~/Code/guitar-ai && scripts/dev.sh

# Mudou engine Python: precisa restart do engine
# (no dev script, ctrl+C e roda de novo)

# Pra testar o app COMO INSTALADO (não dev):
/install-local   # slash command — rebuild + copia pra /Applications
```

### "Quero publicar uma versão"
```bash
/release minor "changelog em uma linha"   # slash command
# Faz: bump version, commit, tag, push, dispara CI
```

### "App tá travado / engine não responde"
```bash
/restart-engine   # slash command — mata + relança
```

### "Quero rebuildar só o engine bundle (sem mexer no .dmg)"
```bash
cd apps/engine && source .venv/bin/activate && python build_engine.py
```

## Debug do app instalado em produção

Habilita DevTools remoto:
```bash
open -a "Guitar AI" --args --remote-debugging-port=9222
# Depois abra http://localhost:9222 no Chrome pra ver a página
# Ou conectar via websocket: ws://127.0.0.1:9222/devtools/page/<id>
```

Pra ver logs do auto-updater:
```bash
tail -50 "$HOME/Library/Logs/Guitar AI/main.log"
```

## Gotchas conhecidos

1. **Blobs decorativos sem `pointer-events-none` bloqueiam cliques.** Sempre adicione a classe em divs com `position: absolute` + `radial-gradient`.
2. **Sample rate mismatch.** sounddevice exige bate o sample rate do device. Mac mini speakers + TANX100 ambos rodam 48 kHz nativo, mas alguns USB interfaces forçam 44.1 — código resampla na carga dos stems.
3. **First-run demora.** PyInstaller bundle leva ~14s pra cold start (torch + uvicorn precisam carregar). Electron mostra splash, faz polling em `/health` até OK antes de mostrar a janela.
4. **Quarantine attribute.** Apps construídos localmente herdam o xattr quarantine se forem movidos via Finder. Use `xattr -dr com.apple.quarantine "/Applications/Guitar AI.app"` quando instalar manualmente.
5. **electron-updater no macOS precisa `.zip` target.** Só `.dmg` não basta pro auto-update — config em `package.json` → `mac.target: ["dmg", "zip"]`.
6. **Auto-install exige code signing.** Sem Developer ID, ShipIt falha com "Code signature did not pass validation". Workaround: download manual do `.dmg` da release.
7. **Demucs precisa de `torchcodec`** desde torchaudio 2.10 (pro `save_with_torchcodec`). Está em `pyproject.toml`.

## Não fazer

- ❌ Comentar código sem motivo claro — DOCS.md já cobre o "porquê" geral.
- ❌ Adicionar dependência só pra usar 1 vez — prefira código próprio simples.
- ❌ Mexer em `apps/engine/.venv/` ou `node_modules/` (managed by package managers).
- ❌ Commitar `dist/`, `build/`, `release/`, ou `*.dmg` (gitignored).
- ❌ Reproduzir verbatim a licença BUSL ou textos legais grandes — Anthropic filter bloqueia. Use `curl` pra baixar de fonte oficial.

## Tarefas pendentes (alto-nível, P0+ roadmap)

Veja [ROADMAP.md](./ROADMAP.md). Resumo:

- [ ] **Apple Developer ID + code signing** — destrava o auto-install. CSR já existe em `~/Documents/guitar-ai-signing/devid.csr`. Falta upload em developer.apple.com, baixar `.cer`, bundler em `.p12`, push 5 secrets no GH.
- [ ] Notarization (mesma conta Apple Dev)
- [ ] Ícone próprio se for trocar — fonte em `assets/icon.svg`, regenera via `scripts/build_icon.py`
- [ ] Realtime Spotify capture (BlackHole)
- [ ] Bpm/key detection
- [ ] MIDI controller support
- [ ] Marketplace de presets
- [ ] Landing page

## Quem é o user

Luiz Fernando · CEO Lufe Mídias · pt-BR · desenvolve sozinho · gosta de saber estado real do sistema, não respostas otimistas. Auditoria > otimismo. Implementação > documentação. Real > mock.
