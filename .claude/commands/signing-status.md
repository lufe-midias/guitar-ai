---
description: Inspeciona estado do code signing + caminho pra completar Apple Developer ID
allowed-tools: Bash
---

# /signing-status — code signing + notarization

Faça uma auditoria do estado:

1. **Cert no Keychain**:
   ```bash
   security find-identity -v -p codesigning
   ```
   Identifique se já existe "Developer ID Application: ..." válido.

2. **CSR pendente**:
   ```bash
   ls -la ~/Documents/guitar-ai-signing/
   ```
   Mostra se a key + CSR já foram gerados.

3. **Secrets no GitHub**:
   ```bash
   gh secret list -R lufe-midias/guitar-ai
   ```
   Os 5 secrets que precisam existir pro CI assinar:
   - `MAC_CERTIFICATE_BASE64`
   - `MAC_CERTIFICATE_PASSWORD`
   - `APPLE_ID`
   - `APPLE_APP_SPECIFIC_PASSWORD`
   - `APPLE_TEAM_ID` (Team ID = 4PQKC87U2U)

4. **Workflow está configurado pra usar?**:
   ```bash
   grep -A 5 "CSC_LINK\|APPLE_ID" .github/workflows/release.yml
   ```
   Se as 5 env vars estão lá: workflow vai usar. Senão: precisa re-adicionar.

5. **App instalado tá assinado?**:
   ```bash
   codesign -dv --verbose=4 "/Applications/Guitar AI.app" 2>&1 | head -10
   ```

Reporte qual etapa falta. Caminho típico:
- Falta cert: gerar CSR (já temos) → upload em developer.apple.com/account/resources/certificates/add → baixar .cer → instalar
- Falta secret: combinar .cer + .key em .p12 → base64 → `gh secret set`
- Falta workflow: editar `.github/workflows/release.yml` re-adicionando env vars
- Falta app-specific password: gerar em account.apple.com → Sign-In and Security → App-Specific Passwords

Não execute mudanças destrutivas (escrever secrets, editar workflow) sem confirmar com user.
