---
description: Bump version, commit, tag, push (dispara CI release)
argument-hint: <major|minor|patch> "<changelog em uma linha>"
allowed-tools: Bash, Read, Edit
---

# /release — publicar nova versão

Argumento `$1`: tipo de bump (`major`, `minor`, `patch`).
Argumento `$2`: changelog (uma linha).

Faça nesta ordem:

1. Leia `apps/desktop/package.json` e identifique a versão atual.
2. Calcule a próxima versão:
   - `major`: x.0.0
   - `minor`: x.y.0
   - `patch`: x.y.z+1
3. Use `sed -i ''` pra alterar **só** o campo `"version"` em `apps/desktop/package.json`.
4. Confirme com o user: "Subindo vX.Y.Z. OK?". Espere resposta.
5. Se confirmado:
   - `git add apps/desktop/package.json` + qualquer arquivo modificado relevante (não dá `git add -A` sem revisar)
   - `git commit -m "vX.Y.Z · $2"`
   - `git push origin main`
   - `git tag -a vX.Y.Z -m "vX.Y.Z — $2"`
   - `git push origin vX.Y.Z`
6. Imprima a URL do workflow no GitHub Actions.
7. Pergunte se quer monitorar o build (sim → `gh run watch <id>` em background, te aviso quando terminar).

Se houver mudanças não-stageadas suspeitas (binários, .env, etc.), pergunte antes.
