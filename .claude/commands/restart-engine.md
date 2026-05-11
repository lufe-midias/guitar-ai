---
description: Mata + relança o engine (resolve travas / pega mudanças de código sem rebuild)
allowed-tools: Bash
---

# /restart-engine — restart do Python engine

Use quando o engine travou ou quando mudou código em `apps/engine/src/guitar_ai/*.py` em modo dev e quer recarregar.

Em dev (engine spawnado externamente):
```bash
# Mata processos que estão escutando 7878
lsof -i :7878 2>/dev/null | tail -n +2 | awk '{print $2}' | sort -u | xargs kill -TERM 2>/dev/null
sleep 2

# Relança
cd ~/Code/guitar-ai/apps/engine && source .venv/bin/activate && \
  GUITAR_AI_PORT=7878 python -m guitar_ai &

# Aguarda subir
for i in $(seq 1 15); do
  if curl -s http://127.0.0.1:7878/health > /dev/null 2>&1; then
    echo "engine up after $((i * 2))s"
    break
  fi
  sleep 2
done
```

No app instalado (engine bundled):
```bash
pkill -f "Guitar AI" 2>/dev/null
pkill -f "guitar-ai-engine" 2>/dev/null
sleep 3
open -a "Guitar AI" --args --remote-debugging-port=9222
```

Reporte status final do `/health` e PID dos processos.
