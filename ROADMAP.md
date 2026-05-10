# Guitar AI — Roadmap de melhorias

> v0.1 (atual) faz: download → demucs 6 stems → player com mute por stem → 26 presets de pedaleira aplicados em tempo real.
> Aqui é o que faz dele um produto vendável.

## P0 · matar antes de vender (1–2 semanas)

### 1. NAM model loader (Neural Amp Modeler) — _o killer feature_
Pedalboard hosta VST3, e existe um VST3 wrapper open source pro **NAM** (`neural-amp-modeler-vst`). Plug:
- UI: drag-and-drop de arquivo `.nam` na chain → vira pedal "NAM · Mesa Mark IV" com slider de gain
- Tonehunt.org tem 5000+ amps modelados grátis (Mesa, Marshall, Fender, Bogner, Engl…)
- Diferencial vs concorrência: Neural DSP cobra US$ 99 por amp, a gente tem 5k de graça
**Impacto:** transforma o produto de "pedaleira simples" em "rig completo IA"

### 2. IR loader (Cabinet impulse responses)
Já temos `Convolution` no Pedalboard. UI: pasta de IRs (`.wav`) na lateral, drag pra chain. **Stack típico:** Drive → Amp NAM → Cabinet IR → Reverb. Sem IR o NAM soa quase nasal direto.

### 3. Looper / Recorder
Captura input + mix do player → `.wav` no Desktop. Use casos:
- Praticar e gravar progresso
- Criar conteúdo pra Instagram/TikTok
- Compartilhar jam
**Bônus:** loop com overdub (camadas) sem precisar de pedal físico Boss RC-30

### 4. Tuner cromático
PyAudio + autocorrelation/yin (já tem scipy). Mostra nota + cents. Detecta drop tunings (D, Eb, C#, Drop D etc).

### 5. Pedaleira drag-and-drop
Hoje o usuário só escolhe presets. Adicionar:
- Drag pedal da biblioteca → chain
- Reordenar
- Editar params com knobs
- Salvar como preset próprio

---

## P1 · features que justificam upgrade (3–6 semanas)

### 6. Realtime Spotify capture (sem precisar baixar)
Via **BlackHole** (driver loopback gratuito):
- Spotify toca → BlackHole captura → engine pega via sounddevice como input
- Demucs streaming separa em tempo real (buffer 2-4s)
- Toca por cima ao vivo, sem precisar baixar antes
**Dificuldade:** Demucs realtime (variante streaming já existe, precisa adaptar)
**Vantagem comercial:** "qualquer música, agora, sem espera" — diferencial absoluto

### 7. Detecção de BPM e key (chord transcription)
- `librosa` faz BPM/key automaticamente
- AI mais avançada: detectar acordes por compasso (Spotify Basic Pitch ou Chordify approach)
- UI: timeline mostra acordes em sync com música (G - D - Em - C…)
- Quem tá aprendendo lê os acordes enquanto toca

### 8. Práticas guiadas
- Loop A-B com slowdown automático: começa 60%, sobe 5% a cada loop até 100%
- "Practice mode" pra solos famosos: separa só o stem do solo, mostra notação

### 9. Time-stretch sem mudar pitch
Hoje varispeed muda o tom. Plug **rubberband** (lib C++) ou phase vocoder via librosa: slow down sem afetar afinação. Essencial pra estudar solos.

### 10. MIDI controller support
Pedais de palco tipo BOSS GT, Line 6 HX Stomp, FCB1010:
- Mapear botões → mudar preset
- Pedais expression → controlar gain/wah
- Já existe `mido` em Python pra MIDI I/O

### 11. Marketplace de presets
- Usuário cria preset → exporta JSON
- Comunidade compartilha → download in-app
- Cobra USD 5 por pack curado
**Modelo Splice/Tonelib funciona — alvo $5–10/mês**

---

## P2 · escala / polish (2–3 meses)

### 12. macOS code signing + notarization
Sem isso, abrir o `.dmg` mostra "developer não verificado" e usuário desiste. Custa US$ 99/ano (Apple Developer).

### 13. Auto-updater (electron-updater)
Pra empurrar fixes/presets novos sem usuário re-baixar.

### 14. Onboarding wizard
- Detecta interfaces USB conectadas
- Sugere presets pelo gênero ("o que você toca?")
- Importa primeira música automaticamente

### 15. Cloud sync (opcional)
- Stems processados no servidor (libera CPU local)
- Library sincroniza entre Mac mini + MacBook
- Plano cloud: USD 9/mês

### 16. Backing track exporter
Separa stems → exporta versão sem guitarra como .mp3 pra carregar no celular ou pendrive (pra plugar no TANX100 sem precisar do Mac).

### 17. Tab/notation OCR (IA)
Foto de tablatura → OCR → toca no app sincronizado. Pode usar Claude Vision pra parsear.

### 18. AI cover band
Demucs separa stems → IA recompõe stem com instrumento de outro estilo. Ex: "tocar essa música em estilo bossa nova". Usar **MusicLM** ou **MusicGen** open source.

---

## P3 · extras visionários

- **Stage mode**: UI minimalista pra usar no palco (2 botões grandes, foot pedal MIDI)
- **Multi-jam online**: jam com outros guitarristas via WebRTC com latência <30ms
- **Lufe Hub integração**: vendas/marketing automático integrado ao Lufe OS dashboard (CEO acompanha receita do produto direto no painel)
- **iPad version** via React Native + Metal audio

---

## Modelo de monetização proposto

| Tier | Preço | Limite |
|---|---|---|
| Free | grátis | 5 músicas processadas/mês · 9 presets básicos |
| Pro | R$ 49,90/mês | ilimitado · NAM models · IRs · looper · marketplace |
| Lifetime | R$ 999 (one-time) | tudo do Pro pra sempre · sem cloud sync |
| Studio | R$ 199/mês | tudo + stem cloud processing + multi-device sync |

**Posicionamento**: "**Neural DSP no preço do Spotify**". Concorrência:
- Neural DSP: US$ 99 por amp (single)
- BIAS FX: US$ 199 + addons
- Tonex: US$ 149+
- Guitar AI: cobre mais que todos junto + tem stem separation

## Métrica de sucesso v1

- 100 usuários pagantes em 90 dias = MRR R$ 5k
- Churn <5%/mês
- NPS >50

## Esforço estimado

- P0 completo: 2 semanas full-time (você ou um dev)
- P1 completo: +6 semanas (pra justificar tier Pro)
- Lançamento beta: P0 done = pode lançar
- Lançamento comercial: P0 + P1 itens 6, 7 = MVP vendável

## Riscos pontuais

1. **Spotify TOS**: usar spotDL/yt-dlp pode dar problema legal. Solução: deixar usuário trazer próprio arquivo de áudio + indicar que ele tem direito de usar.
2. **Latência BT do TANX100**: testes mostram que pra monitor live precisa cabo. Comunicar isso na onboarding.
3. **Mac App Store**: Apple não aceita stem separation por uso de yt-dlp. Distribuir via DMG direto ou via Setapp.
