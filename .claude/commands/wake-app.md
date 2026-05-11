---
description: Abre o app instalado + engine sobe + DevTools port habilitado
allowed-tools: Bash
---

# /wake-app — abrir o app pronto pra debug

Acordar o app instalado em `/Applications/Guitar AI.app` com:
- DevTools remoto na porta 9222 (pra inspect)
- Verifica que o engine subiu (porta 7878)
- Reporta estado básico

```bash
# Limpar processos órfãos
lsof -i :7878 2>/dev/null | tail -n +2 | awk '{print $2}' | sort -u | xargs kill -TERM 2>/dev/null
pkill -f "Guitar AI" 2>/dev/null
sleep 3

# Abrir
open -a "Guitar AI" --args --remote-debugging-port=9222
echo "abrindo..."

# Espera engine subir (até 30s)
for i in $(seq 1 15); do
  if curl -s -m 1 http://127.0.0.1:7878/health > /dev/null 2>&1; then
    echo "engine up após $((i * 2))s"
    break
  fi
  sleep 2
done

# Sanity check
curl -s http://127.0.0.1:7878/health
echo ""
echo "DevTools: http://localhost:9222"
echo "Engine API: http://localhost:7878"
```
