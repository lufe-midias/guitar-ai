---
description: Conecta no DevTools do app instalado pra debug
argument-hint: [expressão JS opcional pra avaliar no renderer]
allowed-tools: Bash
---

# /inspect-app — debugar o app rodando via DevTools remoto

Pré-requisito: app aberto com `--remote-debugging-port=9222`. Se não estiver, peça ao user pra fechar o app e abrir com:
```bash
open -a "Guitar AI" --args --remote-debugging-port=9222
```

Use isso pra:
- Inspecionar estado do React (Zustand store)
- Avaliar expressões JS no renderer
- Ver erros no console
- Verificar event handlers, DOM, etc.

Snippet base (use sempre via Python + websockets):

```python
import json, urllib.request, asyncio, websockets

targets = json.loads(urllib.request.urlopen('http://127.0.0.1:9222/json').read())
URL = targets[0]['webSocketDebuggerUrl']

async def main():
    async with websockets.connect(URL, max_size=10_000_000) as ws:
        i = [0]
        async def call(m, p=None):
            i[0] += 1
            await ws.send(json.dumps({"id": i[0], "method": m, "params": p or {}}))
            while True:
                msg = json.loads(await ws.recv())
                if msg.get("id") == i[0]: return msg
        await call("Runtime.enable")

        # Replace expression here:
        expr = """$1""" if """$1""" else "({version: window.guitarAI?.versions?.electron, hasGuitarAI: !!window.guitarAI})"

        r = await call("Runtime.evaluate", {
            "expression": expr if not expr.startswith("(async") else expr,
            "awaitPromise": expr.startswith("(async"),
            "returnByValue": True,
        })
        print(json.dumps(r.get("result", {}).get("result", {}).get("value"), indent=2))

asyncio.run(main())
```

Casos úteis:
- `(async () => await window.guitarAI.getUpdateState())()` — estado do auto-updater
- `Array.from(document.querySelectorAll('button')).map(b => b.textContent)` — lista botões
- `useStore.getState()` — não funciona direto (Zustand não está em window) — pegue via React DevTools
