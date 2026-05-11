---
description: Rebuilda o .app e substitui em /Applications (sem passar pelo CI)
allowed-tools: Bash, Read
---

# /install-local — testar build local em /Applications

Use quando você fez mudanças e quer testar como o user vai ver (app instalado, não dev).

Faça:

1. **Pare o app rodando**:
   ```bash
   pkill -f "Guitar AI" 2>/dev/null
   pkill -f "guitar-ai-engine" 2>/dev/null
   sleep 3
   ```

2. **Se mudou código Python do engine**, re-bundle (lento, ~3 min):
   - Pergunte ao user se houve mudança em `apps/engine/` antes de rodar
   - Se sim: `cd apps/engine && source .venv/bin/activate && python build_engine.py`
   - Se não: skip, reaproveita `apps/engine/dist/guitar-ai-engine/` existente

3. **Build .app via electron-builder**:
   ```bash
   cd apps/desktop && npm run package
   ```

4. **Substituir em /Applications**:
   ```bash
   rm -rf "/Applications/Guitar AI.app"
   cp -R "/Users/agentesia/Code/guitar-ai/apps/desktop/release/mac-arm64/Guitar AI.app" /Applications/
   xattr -dr com.apple.quarantine "/Applications/Guitar AI.app"
   ```

5. **Abrir com DevTools remoto habilitado**:
   ```bash
   open -a "Guitar AI" --args --remote-debugging-port=9222
   ```

6. Aguarde ~14s e confirme `/health`:
   ```bash
   sleep 14
   curl -s http://127.0.0.1:7878/health
   ```

7. Se quiser, ofereça resetar o onboarding pro user testar do zero:
   ```bash
   rm -f "$HOME/Library/Application Support/GuitarAI/onboarding.json"
   ```

Reporte: versão instalada, processos rodando, health endpoint OK.
