# TALISMAN — GUIDA COMPLETA
## Costruire un gioco manageriale di calcio stile Football Manager 2026/27, gratuito, da solo, con Claude Opus e IA gratuite

**Versione:** 2.0 — 18 settembre 2026 · **Autore del progetto:** Marco
**Durata prevista:** 30 settimane a 13-14 ore a settimana · **Costo:** zero

---

## COME SI USA QUESTA GUIDA

Questo documento contiene tutto: cosa devi fare tu, in che ordine, e cosa incollare all'IA. È diviso in tre blocchi.

| Blocco | Capitoli | Quando lo apri |
|---|---|---|
| **A — I 25 PASSI** | Parte I → VI | **Ogni giorno.** È la sequenza operativa: un passo alla volta, con casella da spuntare |
| **B — LE SPECIFICHE** | Parte VII | Quando un passo ti dice "incolla il §X". Non si legge di seguito |
| **C — LA GRAFICA** | Parte VIII | Ai passi 6-11 (installazione) e 20-22 (produzione asset) |

**Struttura di ogni passo del blocco A:**

> **COSA FAI** → **COME VERIFICHI CHE È ANDATA BENE** → **SE VA STORTO**

**Se non sai da dove cominciare:** Passo 1, più sotto. Nella prossima ora puoi arrivare al Passo 4 e avere il progetto già in piedi.

---

## INDICE

**BLOCCO A — I 25 PASSI**
- Parte I — Preparazione (passi 1-5)
- Parte II — Installazione di ComfyUI (passi 6-11)
- Parte III — Sviluppo del gioco, fase per fase (passi 12-19)
- Parte IV — Produzione della grafica (passi 20-22)
- Parte V — Rifinitura e uscita (passi 23-25)
- Parte VI — Le regole che ti portano in fondo

**BLOCCO B — LE SPECIFICHE** (Parte VII)
- §1 Visione · §2 Regole non negoziabili · §3 Stack tecnico · §4 Modello dati · §5 Dati
- §6 Motore partita · §7 I sistemi di gioco · §8 UI e design system · §9 Roadmap
- §10 Il tuo lavoro · §11 Metodo con Opus · §12 Grafica · **§13 I 14 PROMPT PER OPUS**
- §14 Qualità e test · §15 Rischi · §16 Il primo prompt

**BLOCCO C — LA GRAFICA IN LOCALE** (Parte VIII)
- Verdetto sulla RTX 3060 · Installazione · I 4 workflow · Bibbia di stile
- Il prompt per la pipeline asset · Ordine di lavoro

---

# BLOCCO A — I 25 PASSI

# PARTE I — PREPARAZIONE (una volta sola, ~3 ore)

## Passo 1 — Installa gli strumenti di base

**COSA FAI** (in quest'ordine, sono ~40 minuti quasi tutti di attesa):

1. **Node.js 22 LTS** — da nodejs.org, installer predefinito.
2. **pnpm** — apri il terminale (su Windows: PowerShell) e lancia:
   ```
   npm install -g pnpm
   ```
3. **Git** — da git-scm.com. Durante l'installazione lascia tutto com'è tranne "default editor": scegli VS Code se te lo chiede.
4. **Visual Studio Code** — da code.visualstudio.com. Estensioni da installare subito: *ESLint*, *Prettier*, *Error Lens*, *GitLens*.
5. **Claude Code** (è il modo giusto di far lavorare Opus su un progetto vero: legge e scrive i file da solo, esegue i test, fa i commit):
   ```
   npm install -g @anthropic-ai/claude-code
   ```

**COME VERIFICHI**: nel terminale, questi quattro comandi devono rispondere con un numero di versione:
```
node -v      →  v22.x
pnpm -v      →  10.x o superiore
git --version
claude --version
```

**SE VA STORTO**: il 90% dei problemi su Windows è che il terminale era già aperto prima dell'installazione — chiudilo e riaprilo. Se `pnpm` non viene riconosciuto, riavvia il PC.

- [ ] Passo 1 completato

---

## Passo 2 — Crea l'account GitHub e il repository

**COSA FAI**:
1. Crea l'account su github.com (se non ce l'hai).
2. Crea un repository **privato** chiamato `talisman`. Non aggiungere README, .gitignore o licenza: lo farà Opus.
3. Configura git con la tua identità:
   ```
   git config --global user.name "Marco"
   git config --global user.email "la-tua-email@esempio.it"
   ```
4. Sul PC, crea la cartella del progetto e entraci:
   ```
   mkdir C:\dev\talisman
   cd C:\dev\talisman
   git init
   git remote add origin https://github.com/TUONOME/talisman.git
   ```

**COME VERIFICHI**: `git remote -v` mostra il tuo repository.

**SE VA STORTO**: se git ti chiede la password e la rifiuta, ti serve un *personal access token* (GitHub → Settings → Developer settings → Tokens) da usare al posto della password. Oppure installa GitHub Desktop, che gestisce tutto da solo.

> **Perché è il passo più importante del manuale:** da qui in poi lavorerai con un'IA che modifica decine di file alla volta. Git è l'unica cosa che ti permette di dire "annulla tutto" senza perdere il lavoro. **Non saltarlo e non rimandarlo.**

- [ ] Passo 2 completato

---

## Passo 3 — Prepara i file di contesto

**COSA FAI**: nella cartella `C:\dev\talisman` crea due file. Sono le uniche cose che scrivi tu prima di iniziare.

1. `GUIDA.md` → salvaci dentro **questa guida per intero**. Serve a te per consultarla, e serve a Claude Code, che potrà leggerla da solo quando gli dirai "leggi il §6 di GUIDA.md".
2. `NOTE.md` → un file vuoto dove annoterai le idee che ti vengono mentre lavori, per non seguirle subito. È la tua valvola di sfogo contro lo scope creep: ogni idea scritta lì è un'idea che non ti fa deragliare oggi.

**COME VERIFICHI**: `GUIDA.md` è nella cartella ed è grande circa 120 KB.

- [ ] Passo 3 completato

---

## Passo 4 — Prima sessione con Claude Code (il bootstrap)

**COSA FAI**:
1. Nel terminale, dentro `C:\dev\talisman`, lancia:
   ```
   claude
   ```
2. Al primo avvio ti chiede di autenticarti: segui le istruzioni nel browser.
3. Quando vedi il prompt, incolla **il prompt del **§16 del Blocco B** di questa guida** (quello intitolato "IL PROSSIMO PROMPT DA DARE A OPUS"), avendo prima sostituito i due segnaposto:
   - `[incolla il §8.2 del piano]` → la lista dei token colore
   - `[incolla il §11.1 del piano]` → il blocco delle regole per CLAUDE.md
4. **Opus ti risponderà con un piano, non con del codice.** Leggilo. Se qualcosa non ti convince, dillo in italiano, normalmente: *"non voglio Tailwind, preferisco CSS puro"* o *"spiegami perché hai scelto Zustand"*. Quando sei d'accordo, scrivi: `procedi`.
5. Mentre lavora, ti chiederà il permesso di creare file ed eseguire comandi. Dai l'ok.

**COME VERIFICHI**: quando dice di aver finito, lancia tu questi comandi:
```
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm dev
```
Devono andare tutti a buon fine e l'ultimo deve aprire una finestra Electron con la pagina delle componenti ("kitchen sink"). **Non passare oltre finché non succede.**

**SE VA STORTO**: non correggere tu. Copia l'errore esatto dal terminale e incollalo nella sessione: *"questo comando dà questo errore: [incolla]"*. È il modo corretto di lavorare: tu sei il collaudatore, lui il meccanico.

**QUANDO FUNZIONA — salva subito:**
```
git add -A
git commit -m "F0: impalcatura del progetto"
git branch -M main
git push -u origin main
```

- [ ] Passo 4 completato — **hai il progetto in piedi**

---

## Passo 5 — Impara i 6 comandi che userai ogni giorno

Non ti serve sapere altro di git per i prossimi sei mesi.

| Comando | Quando |
|---|---|
| `git status` | "Cosa è cambiato?" — prima di ogni commit |
| `git add -A && git commit -m "messaggio"` | Salvi un punto di ripristino. **Almeno 3 volte al giorno** |
| `git push` | Mandi tutto su GitHub. **Sempre a fine giornata** |
| `git diff` | Vedi esattamente cosa ha cambiato Opus |
| `git reset --hard` | **Il pulsante di emergenza**: annulla tutte le modifiche non salvate |
| `git checkout -b fase-3-motore` | Apri un ramo per una fase. Se va male, lo butti |

**La regola che ti salverà:** prima di iniziare una sessione con Opus, fai sempre commit di quello che hai. Così se la sessione va male, `git reset --hard` ti riporta indietro in un secondo.

- [ ] Passo 5 completato

---

# PARTE II — INSTALLAZIONE DI COMFYUI (una volta sola, ~2 ore di cui 90 minuti di download)

Puoi farla in parallelo alla Parte I: mentre scaricano i modelli, lavori al codice.

## Passo 6 — Prepara il terreno

**COSA FAI**:
1. Verifica di avere **almeno 60 GB liberi** sul disco. I modelli pesano, e ne vorrai altri.
2. Aggiorna i driver NVIDIA (GeForce Experience → Driver → Scarica). Serve una versione recente, altrimenti PyTorch non vede bene la scheda.
3. Crea la cartella `C:\AI\` (tienila fuori da `Documenti` e da OneDrive: la sincronizzazione su cartelle da 40 GB è un disastro).

**COME VERIFICHI**: apri il terminale e lancia `nvidia-smi`. Deve mostrarti "NVIDIA GeForce RTX 3060" e "12288MiB". Se il comando non esiste, i driver non sono installati correttamente.

- [ ] Passo 6 completato

---

## Passo 7 — Installa ComfyUI

**COSA FAI** (versione facile, consigliata su Windows):
1. Vai su github.com/comfyanonymous/ComfyUI, sezione **Releases**, e scarica il pacchetto **portable per Windows** (`ComfyUI_windows_portable_nvidia.7z`, circa 1,5 GB).
2. Estrailo in `C:\AI\` con 7-Zip (WinRAR o l'estrattore di Windows possono corrompere i file lunghi: usa 7-Zip).
3. Dentro `C:\AI\ComfyUI_windows_portable\` trovi `run_nvidia_gpu.bat`. **Fai doppio clic.**
4. Si apre una finestra nera che scrive molte righe, e dopo un minuto il browser si apre da solo su `http://127.0.0.1:8188`.

**COME VERIFICHI**: vedi un'interfaccia a nodi collegati da fili. Non toccare nulla, per ora.

**SE VA STORTO**:
- Finestra nera che si chiude subito → mancano le Visual C++ Redistributable: installale da Microsoft.
- "Torch not compiled with CUDA" → hai estratto il pacchetto sbagliato (quello CPU). Riscarica quello `nvidia`.

- [ ] Passo 7 completato

---

## Passo 8 — Installa il Manager (ti risparmia ore)

**COSA FAI**:
1. Chiudi ComfyUI (chiudi la finestra nera).
2. Apri il terminale nella cartella `C:\AI\ComfyUI_windows_portable\ComfyUI\custom_nodes` e lancia:
   ```
   git clone https://github.com/ltdrdata/ComfyUI-Manager.git
   ```
3. Riavvia con `run_nvidia_gpu.bat`.
4. Ora in alto a destra nell'interfaccia c'è il pulsante **Manager**.
5. Dal Manager → *Custom Nodes Manager* → cerca e installa, uno alla volta:
   - `ComfyUI-GGUF`
   - `ComfyUI_essentials`
   - `ComfyUI_IPAdapter_plus`
   - `comfyui_controlnet_aux`
   - `ComfyUI-Crystools`
   - `rgthree-comfy`
6. **Restart** dal Manager quando hai finito.

**COME VERIFICHI**: dopo il riavvio, in basso a sinistra Crystools mostra una barra con l'uso di VRAM in tempo reale. Quella barra sarà la tua amica: quando si avvicina al 100%, stai per avere un errore di memoria.

- [ ] Passo 8 completato

---

## Passo 9 — Scarica i modelli

**COSA FAI**: tutti i file si scaricano da **huggingface.co** (account gratuito richiesto per alcuni; per FLUX.1-dev devi accettare la licenza sulla pagina del modello — è consentito l'uso non commerciale, quindi verifica le condizioni se un domani volessi vendere il gioco; per un gioco gratuito va bene, ma **annotalo in `assets/LICENSES.md`**. Se preferisci stare tranquillo al 100%, usa **FLUX.1-schnell**, che è Apache 2.0, quindi libero anche commercialmente).

Metti ogni file nella sua cartella, dentro `C:\AI\ComfyUI_windows_portable\ComfyUI\models\`:

| File da cercare su HuggingFace | Cartella di destinazione | Peso |
|---|---|---|
| `flux1-dev-Q6_K.gguf` (repo: city96/FLUX.1-dev-gguf) | `unet\` | ~9 GB |
| `flux1-schnell-Q4_K_S.gguf` (repo: city96/FLUX.1-schnell-gguf) | `unet\` | ~6 GB |
| `t5xxl_fp8_e4m3fn.safetensors` | `clip\` | ~4,9 GB |
| `clip_l.safetensors` | `clip\` | ~250 MB |
| `ae.safetensors` (VAE di FLUX) | `vae\` | ~330 MB |
| Un checkpoint SDXL realistico/artistico (da Civitai va benissimo) | `checkpoints\` | ~6,5 GB |
| `4x-UltraSharp.pth` | `upscale_models\` | ~65 MB |
| IP-Adapter per SDXL (`ip-adapter-plus_sdxl_vit-h.safetensors`) | `ipadapter\` | ~800 MB |
| `CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors` | `clip_vision\` | ~2,5 GB |

**Scorciatoia**: molti di questi li puoi scaricare direttamente dal **Model Manager** dentro ComfyUI, che li mette da solo nella cartella giusta. Provalo prima di scaricare a mano.

**COME VERIFICHI**: riavvia ComfyUI; nei nodi di caricamento modello i file devono comparire nei menu a tendina.

- [ ] Passo 9 completato

---

## Passo 10 — La prima immagine (il collaudo)

**COSA FAI**:
1. Nell'interfaccia, menu **Workflow → Browse Templates** → scegli il template **Flux** (oppure trascina nella finestra un workflow FLUX-GGUF scaricato dalla community).
2. Nel nodo di caricamento scegli `flux1-schnell-Q4_K_S.gguf`, il T5 fp8 e il VAE `ae.safetensors`.
3. Nel campo del prompt incolla questo (è il tuo primo asset vero, lo sfondo della Scrivania):
   ```
   Wide cinematic background for a football management game interface, empty
   modern stadium at night seen from the players tunnel, deep teal and midnight
   blue palette, volumetric floodlight haze, shallow depth of field, heavily
   darkened lower third, no people, no logos, no text, subtle film grain
   ```
4. Imposta 1536×864, 4 passi (schnell), e premi **Queue Prompt**.

**COME VERIFICHI**: in 10-20 secondi appare un'immagine. È il momento in cui sai che tutta la catena funziona.

**SE VA STORTO**:
- `CUDA out of memory` → chiudi il browser e le altre applicazioni, riprova a 1024×576. Se persiste, avvia con `--normalvram` modificando il .bat.
- Immagine grigia o nera → VAE sbagliato o non caricato.
- Lentissimo (minuti) → sta usando la CPU: hai il pacchetto sbagliato, torna al Passo 7.

- [ ] Passo 10 completato — **la grafica è operativa**

---

## Passo 11 — Trova lo stile PRIMA di automatizzare

Questo passo dura un pomeriggio intero e non va saltato. È l'unico momento in cui il tuo gusto conta più della tecnica.

**COSA FAI**:
1. Con **FLUX.1-dev** (22 passi, guidance 3.2) genera **20 varianti** dello sfondo della Scrivania cambiando solo il seed.
2. Scegline **uno**. Non due. Uno.
3. Annota in un file di testo: modello, seed, passi, guidance, prompt completo. Questo è il tuo riferimento per tutto il gioco.
4. Passa a SDXL e genera **una** illustrazione piatta di evento (usa il prompt G3 del §12.3 (Blocco B)). Iterala finché non ti piace davvero.
5. Salvala come `C:\dev\talisman\assets\style-anchor.png`. Tutte le altre 39 illustrazioni nasceranno da lei via IP-Adapter.
6. Crea ora `C:\dev\talisman\docs\style-bible.md` copiando il §3 del Blocco C e compilandolo con i parametri che hai trovato.

**COME VERIFICHI**: metti i due file (sfondo e illustrazione) uno accanto all'altro. Sembrano dello stesso gioco? Se sì, hai uno stile. Se no, insisti su quello che ti convince meno.

- [ ] Passo 11 completato — **hai la direzione artistica**

> Da qui in poi la grafica è in pausa fino alla Parte IV. **Non generare i restanti 50 asset adesso**: non sai ancora che forma avranno le schermate, e li rifaresti. Torna al codice.

---

# PARTE III — SVILUPPO DEL GIOCO, FASE PER FASE

## Come funziona ogni sessione di lavoro (imparalo una volta, vale per tutte)

Il ciclo è sempre questo, sette passaggi:

1. **Salva** lo stato attuale: `git add -A && git commit -m "prima di [nome fase]"`.
2. **Apri un ramo**: `git checkout -b f3-motore-partita`.
3. **Avvia** `claude` nella cartella del progetto.
4. **Incolla il prompt della fase** (dal §13 del Blocco B), sostituendo i `[INCOLLA ...]` con i paragrafi indicati del Blocco B.
5. **Leggi il piano che ti propone e correggilo.** Questa è la parte in cui aggiungi valore: cinque minuti qui valgono tre ore dopo. Poi scrivi `procedi`.
6. **Collauda tu**: `pnpm test`, `pnpm typecheck`, e il comando specifico della fase. Se qualcosa non va, incolli l'errore e lo fai correggere a lui.
7. **Chiudi**: chiedi *"scrivi SUMMARY.md con le decisioni prese, il debito tecnico lasciato e cosa andrebbe fatto nella prossima sessione"*, poi committa, unisci il ramo e fai push.

**Regola di sicurezza:** una feature per sessione. Se ti accorgi che la sessione sta durando da tre ore e ha toccato 60 file, fermati, committa quello che funziona e riparti pulito. Le sessioni lunghe degradano.

---

## Passo 12 — FASE 1: modello dati e mondo popolato (settimane 2-3)

**COSA FAI**:
1. Sessione A → prompt **P1** del piano, con incollato il §4 intero.
2. Collaudo: `pnpm test` verde; chiedi *"genera un mondo di prova e dimmi quanto pesa serializzato"* → deve stare sotto 8 MB per 5.000 giocatori.
3. Sessione B → prompt **P2**, con incollato il §5 intero.
4. Collaudo vero: lancia `pnpm data:report` e **apri `docs/balance/data-report.md`. Leggilo con occhio da tifoso**, non da programmatore: i migliori giocatori generati sono nei club giusti? L'età media della Serie A è sensata? Ci sono portieri di 17 anni titolari ovunque?
5. Tutto ciò che non ti convince lo scrivi in una lista e la incolli nella sessione: *"nel report vedo questi problemi: [...]. Correggi le costanti di calibrazione, non la struttura"*.

**COME VERIFICHI**: il report ti sembra un mondo del calcio credibile.

**QUANTO DURA**: 2 settimane, 4-6 sessioni.

**TRAPPOLA DI QUESTA FASE**: perdere giorni a inseguire i nomi reali di tutti i giocatori. Non farlo. Nomi plausibili generati vanno benissimo per adesso: il database si perfeziona alla fine, quando il gioco esiste.

- [ ] Passo 12 completato

---

## Passo 13 — FASE 2: il mondo che gira (settimane 4-6)

**COSA FAI**:
1. Sessione → prompt **P3**.
2. Collaudo: `pnpm sim -- --seasons 10 --seed 42 --report out.md`.
3. Apri `out.md` e controlla tre cose: il campione è diverso in almeno 4 stagioni su 10; nessuna squadra fa 110 punti; la media gol è tra 2,5 e 2,9.
4. Chiedi la creazione di `docs/balance/targets.md` con la tabella del §14.1.

**COME VERIFICHI**: dieci stagioni simulate in meno di un minuto, e le classifiche ti sembrano plausibili.

**IL MOMENTO CHE CONTA**: questa è la settimana in cui il progetto diventa reale. Hai un mondo del calcio che gira da solo. Salva quel primo report da qualche parte: tra sei mesi ti farà piacere riguardarlo.

- [ ] Passo 13 completato

---

## Passo 14 — FASE 3: il motore partita (settimane 7-10) ⚠️ la fase difficile

**COSA FAI**:
1. Sessione → prompt **P4**, con incollato il §6 intero. **Non fare altro nella stessa sessione.**
2. Quando ti propone il piano, fatti dare i moduli separati e approvali uno alla volta.
3. Collaudo: `pnpm sim -- --matches 10000 --report`. Confronta ogni riga con `targets.md`.
4. Se qualcosa è fuori range, apri una sessione nuova con il prompt **P11** (bilanciamento). Non mescolare implementazione e bilanciamento.

**COME VERIFICHI**: tutti i target del §6.7 rispettati e 10.000 partite in meno di 20 secondi.

**ATTENZIONE — è qui che si molla.** Quattro settimane di lavoro su qualcosa che non si vede. Due contromisure concrete:
- Alla settimana 8, **interrompi e chiedi una schermata Rosa provvisoria**, anche brutta. Ti serve qualcosa da guardare.
- Tieni aperta la finestra dei report: vedere la media gol scendere da 4,8 a 2,7 grazie a una tua correzione dà la stessa soddisfazione di un gol.

- [ ] Passo 14 completato

---

## Passo 15 — FASE 4: la prima build giocabile (settimane 11-14) 🎉

**COSA FAI**:
1. Sessione A → prompt **P5**. È grande: dividilo tu in tre sessioni (1: architettura + shell + store in Web Worker; 2: Rosa + Profilo giocatore; 3: Tattica + Calendario + flusso "Avanza").
2. Prima di ogni schermata, chiedi a Opus *"fammi un mockup HTML di questa schermata come artifact, prima di scriverla in React"*. Guardi, correggi, e solo dopo la fa in React. Risparmi ore.
3. Metti lo sfondo generato nel Passo 11 nella Scrivania: è il primo momento in cui sembra un gioco vero.

**COME VERIFICHI — il collaudo più importante di tutto il progetto**: crea una carriera, schiera la squadra, e **gioca una stagione intera** avanzando giornata per giornata. Senza errori in console, senza blocchi.

**DA QUI IN POI CAMBIA IL TUO LAVORO**: ogni settimana giochi 2 ore al tuo gioco e scrivi in `docs/playtest/AAAA-MM-GG.md` tre elenchi: *cosa non ho capito*, *cosa mi ha annoiato*, *cosa mi ha fatto dire wow*. Quel file diventa l'input dei prompt successivi. È il miglior controllo qualità che esista e nessuna IA può farlo al posto tuo.

- [ ] Passo 15 completato — **hai un gioco**

---

## Passo 16 — FASE 5: le persone (settimane 15-18)

**COSA FAI**:
1. Sessione A → prompt **P6** (allenamento, sviluppo, infortuni), con §7.1 e §7.2.
2. Collaudo: `docs/balance/development.md` — i giovani forti crescono? il declino parte tra i 29 e i 32?
3. Sessione B → prompt **P7** (psicologia e spogliatoio), con §7.3 e §4.4. **È la feature che distingue il tuo gioco: dedicagli due sessioni, non una.**
4. Collaudo speciale: il test A/B richiesto nel prompt. Se il sistema psicologico non sposta nulla, non serve a niente; se manda tutti a morale 0, è rotto. Il bersaglio è tra il 6% e il 15% di impatto sui punti.
5. Sessione C → la schermata Spogliatoio con il grafo sociale. Chiedi prima il mockup.

**COME VERIFICHI**: giochi mezza stagione, metti fuori rosa un leader e vedi il gruppo reagire. Se lo senti, funziona.

- [ ] Passo 16 completato

---

## Passo 17 — FASE 6: la partita in 2D (settimane 19-21)

**COSA FAI**:
1. Genera con ComfyUI la texture del campo (prompt G6 del §12.3, deve essere *seamless*).
2. Sessione → prompt **P10**, con §8.4 e §6.1.
3. Collaudo: guarda una partita intera a velocità 2x. Capisci cosa succede senza leggere il testo?
4. **Registra una GIF** (OBS + ffmpeg) del primo gol. È il tuo primo materiale promozionale: pubblicala.

**QUI INIZIA LA PARTE PUBBLICA**: apri la pagina su itch.io (vuota, con solo qualche immagine) e comincia un devlog. Una GIF a settimana su Reddit (r/footballmanagergames) o Bluesky. Il gioco gratuito vive di attenzione, e l'attenzione si costruisce mesi prima dell'uscita.

- [ ] Passo 17 completato

---

## Passo 18 — FASE 7: mercato e osservatori (settimane 22-24)

**COSA FAI**:
1. Sessione A → prompt **P9**, con §7.5 e §7.6. Dividila: (1) valutazione + trattativa, (2) agenti + IA di mercato, (3) scouting e informazione imperfetta, (4) le tre schermate.
2. Collaudo: `docs/balance/market.md` dopo 5 stagioni. Le rose IA sono sensate? Nessuno paga 200 milioni un trentaseienne? Qualche club fallisce, ma raramente?
3. Verifica la cosa che rende speciale il tuo gioco: apri la scheda di un giocatore di un'altra squadra. **Non devi vedere numeri precisi, ma intervalli.**

- [ ] Passo 18 completato

---

## Passo 19 — FASE 8: storie, stampa, società (settimane 25-27)

**COSA FAI**:
1. Sessione A → prompt **P8** (motore narrativo). Attenzione ai testi: fatti generare i template in italiano e **leggine 30 a campione**. Gli errori di lingua rovinano l'immersione più di un bug.
2. Sessione B → dirigenza, finanze, settore giovanile, nazionali (usa le spec §7.7 e §7.8).
3. Collaudo: simula una stagione e leggi il feed della Scrivania dall'inizio alla fine. Ti racconta una storia o è un elenco di notifiche?

- [ ] Passo 19 completato

---

# PARTE IV — PRODUZIONE DELLA GRAFICA (settimana 27-28)

Ora sai che forma hanno le schermate, quindi puoi produrre gli asset definitivi senza rifarli.

## Passo 20 — Costruisci la pipeline

**COSA FAI**:
1. Avvia ComfyUI con l'API accessibile: modifica `run_nvidia_gpu.bat` aggiungendo `--listen 127.0.0.1 --port 8188` alla riga di avvio.
2. Sessione con Opus → **il prompt del §4 del Blocco C** (`packages/assets-cli`).
3. Salva i tuoi 4 workflow in `assets/comfy-workflows/` esportandoli da ComfyUI in **formato API** (menu → Export (API)). Attenzione: *Export* normale e *Export (API)* sono due file diversi; allo script serve il secondo.

**COME VERIFICHI**: `pnpm assets generate assets/jobs/sfondi.yaml` produce 36 immagini senza che tu tocchi ComfyUI.

- [ ] Passo 20 completato

---

## Passo 21 — La notte di produzione

**COSA FAI**:
1. Scrivi i file di job: `sfondi.yaml` (12 prompt × 3 varianti), `illustrazioni.yaml` (40 × 3, tutte con `styleRef: style-anchor.png`), `texture.yaml`.
2. Lancia tutto la sera e vai a dormire. Sono circa 4-6 ore di generazione sulla 3060.
3. La mattina: `pnpm assets contact-sheet` → apri il provino, scegli i numeri che ti piacciono → `pnpm assets keep`.
4. `pnpm assets process` → correzione palette, ritagli, WebP, manifest.
5. `pnpm assets licenses` → il registro si aggiorna da solo.

**COME VERIFICHI**: `pnpm assets check` non segnala nulla, e nel gioco non ci sono più immagini segnaposto.

- [ ] Passo 21 completato

---

## Passo 22 — Logo, icone e audio

**COSA FAI**:
1. **Logo**: su Ideogram (online), prompt G4 del piano. Genera 30 varianti, scegline una, ripuliscila in Inkscape e salvala in SVG. Ti servono tre versioni: completa, solo simbolo, monocromatica.
2. **Icona dell'applicazione**: dal simbolo, esporta a 256×256 e converti in `.ico`.
3. **Stemmi e maglie**: non si generano — sono i prompt **GP1** e **GP2** del piano, che Opus implementa come generatori SVG procedurali. Falli adesso, in una sessione dedicata.
4. **Volti**: prompt **GP3** (integrazione di `facesjs`).
5. **Audio**: scarica da Pixabay/Freesound (licenza CC0) un loop di folla, uno di ambiente stadio vuoto, e 15 suoni di interfaccia. Una traccia di menu da Suno se ti va. Tutto annotato in `LICENSES.md`.

- [ ] Passo 22 completato

---

# PARTE V — RIFINITURA E USCITA (settimane 28-30)

## Passo 23 — Rendi il gioco comprensibile

**COSA FAI**:
1. Sessione → prompt **P13** del §13 (onboarding, tutorial, creazione carriera, glossario, prestazioni, build).
2. Rileggi **tutti** i testi dell'interfaccia. Questa è roba tua, non delegabile: la terminologia incoerente è la cosa che fa sembrare dilettantesco un gioco altrimenti buono.

- [ ] Passo 23 completato

## Passo 24 — Il collaudo esterno

**COSA FAI**:
1. Genera l'installer: `pnpm build:win`.
2. **Provalo su un PC diverso dal tuo** (un amico, un portatile). Il 90% dei bug di distribuzione si vede solo su una macchina pulita.
3. Dallo a 3 persone con una sola richiesta: *"gioca una stagione e poi dimmi cosa non hai capito, cosa ti ha annoiato, e cosa racconteresti a un amico"*.
4. Le risposte alla terza domanda ti dicono qual è il vero nucleo del gioco. **Investi lì**, ignora il resto per la 1.0.

- [ ] Passo 24 completato

## Passo 25 — Pubblica

**COSA FAI**:
1. Pagina itch.io: titolo, descrizione breve (2 righe che dicano cosa lo rende diverso: spogliatoio vivo e storie), 6 screenshot, 2 GIF, la key art.
2. Carica l'installer Windows e l'AppImage Linux.
3. Annuncio su r/footballmanagergames, r/gamedev, Bluesky/X, e nei forum italiani di calcio manageriale. Racconta il *percorso*, non solo il prodotto: le persone seguono le storie di sviluppo.
4. Apri un canale per i bug (Discord o le Issues di GitHub) e il file `docs/backlog.md` pubblico.

- [ ] Passo 25 completato — **il gioco è uscito**

---

# PARTE VI — LE REGOLE CHE TI PORTANO IN FONDO

## Le 7 regole quotidiane

1. **Commit prima di ogni sessione con Opus.** Sempre. Senza eccezioni.
2. **Push a fine giornata.** Il tuo disco può morire stanotte.
3. **Una feature per sessione.** Le sessioni lunghe producono codice peggiore.
4. **Chiedi sempre il piano prima del codice**, e correggilo.
5. **Collauda tu, non fidarti del "fatto".** Test verdi, report nei target, build che parte.
6. **Ogni idea nuova va in `NOTE.md`**, non nel codice di oggi.
7. **Gioca al tuo gioco ogni settimana** dalla Fase 4 in poi.

## Il calendario tipo della settimana

| Giorno | Cosa fai | Ore |
|---|---|---|
| Lunedì | Rileggi la fase, scrivi gli ADR, prepari i prompt | 1-2 |
| Martedì | Sessione Opus (feature principale) | 3 |
| Mercoledì | Sessione Opus (seconda feature o rifinitura) | 3 |
| Giovedì | Collaudo: test, report, correzioni | 2 |
| Venerdì | Grafica/asset, oppure bilanciamento | 2 |
| Sabato | Playtest + note + devlog | 2 |
| Domenica | Riposo | 0 |

Totale: 13-14 ore a settimana. Con questo ritmo, la 1.0 esce in 30 settimane.

## I tre momenti in cui vorrai mollare, e cosa fare

| Quando | Perché | Cosa fai |
|---|---|---|
| **Settimana 8-9** | Quattro settimane sul motore partita senza vedere niente | Interrompi e fatti fare una schermata Rosa brutta ma funzionante. Serve a te, non al gioco |
| **Settimana 16** | Il gioco funziona ma sembra piatto, "non è come FM" | Normale: manca ancora il 2D e mancano le storie. Rileggi il §1 del Blocco B e guarda il tuo primo report della settimana 6 |
| **Settimana 26** | Stanchezza da rifinitura, mille dettagli, nessuna novità | Pubblica una GIF e leggi i commenti. L'attenzione degli altri è carburante |

## Cosa NON fare, mai

- **Non aggiungere leghe prima della versione 1.0.** Va in `docs/backlog.md`. Questa è la regola numero uno: è ciò che uccide il 90% dei progetti di questo tipo.
- **Non riscrivere il motore** perché "si potrebbe fare meglio". Miglioralo a pezzi.
- **Non rimandare i salvataggi versionati.** Rompere i save degli utenti è il modo più veloce per perdere una community.
- **Non inseguire la grafica perfetta** prima di avere il gioco. Uno sfondo buono e coerente batte dieci sfondi bellissimi e scollegati.
- **Non lavorare senza rami git** nelle fasi grandi.

---

# APPENDICE — ORDINE COMPLETO DEI 25 PASSI

| # | Passo | Quando |
|---|---|---|
| 1 | Strumenti di base (Node, pnpm, git, VS Code, Claude Code) | Giorno 1 |
| 2 | GitHub e repository | Giorno 1 |
| 3 | I tre file di contesto | Giorno 1 |
| 4 | Bootstrap del progetto con il prompt P0 | Giorno 1-2 |
| 5 | I 6 comandi git | Giorno 2 |
| 6 | Preparazione disco e driver | Giorno 2 |
| 7 | Installazione ComfyUI | Giorno 2 |
| 8 | ComfyUI Manager e custom node | Giorno 2 |
| 9 | Download dei modelli | Giorno 2-3 |
| 10 | Prima immagine di collaudo | Giorno 3 |
| 11 | Ricerca dello stile (ancora visiva) | Giorno 3-4 |
| 12 | Fase 1 — modello dati e mondo popolato | Sett. 2-3 |
| 13 | Fase 2 — il mondo che gira | Sett. 4-6 |
| 14 | Fase 3 — motore partita | Sett. 7-10 |
| 15 | Fase 4 — prima build giocabile | Sett. 11-14 |
| 16 | Fase 5 — allenamento e psicologia | Sett. 15-18 |
| 17 | Fase 6 — partita in 2D + inizio devlog | Sett. 19-21 |
| 18 | Fase 7 — mercato e scouting | Sett. 22-24 |
| 19 | Fase 8 — narrativa, società, giovanili | Sett. 25-27 |
| 20 | Pipeline asset | Sett. 27 |
| 21 | Notte di produzione grafica | Sett. 27-28 |
| 22 | Logo, stemmi procedurali, volti, audio | Sett. 28 |
| 23 | Onboarding e rifinitura | Sett. 28-29 |
| 24 | Collaudo esterno | Sett. 29 |
| 25 | Pubblicazione | Sett. 30 |

---

*Inizia dal Passo 1. Oggi, nella prossima ora, puoi arrivare al Passo 4 e avere il progetto in piedi.*


---
---

# BLOCCO B
# PARTE VII — LE SPECIFICHE DEL GIOCO

> Questa parte non si legge di seguito: è il materiale che i passi del Blocco A ti dicono di incollare nei prompt. Il capitolo più usato è il **§13**, la libreria dei 14 prompt per Opus.

---

## 0. LE ASSUNZIONI ALLA BASE DI TUTTO

**Regola d'oro:** non dare mai a Opus "fai il gioco". Gli dai **una fase alla volta**, con la specifica del capitolo giusto incollata dentro. I prompt del §13 sono già scritti così.

**Assunzioni prese** (dette esplicitamente perché condizionano tutto):
- Obiettivo dichiarato: *"come quello reale di Football Manager"* → il target finale è la profondità di FM, ma la **v1.0 rilasciabile è una vertical slice profonda** (Italia completa + coppe + Europa semplificata). Espandere il mondo dopo è lavoro di *dati*, non di *codice*: se il motore è generico, aggiungere leghe costa giorni, non mesi. È l'unico modo per arrivare davvero in fondo da solo.
- Stack: **Electron + React + TypeScript**, perché hai già esperienza con Leggenda e riusi il know-how su UI dense a tabelle. Il core di simulazione è scritto in TS **puro e isolato**, così se un giorno serve velocità lo si riscrive in Rust/WASM senza toccare la UI.
- Tutte le innovazioni richieste sono dentro: psicologia/spogliatoio, narrativa dinamica, match engine 2D con analisi dati, scouting e mercato realistici.

---

## 1. VISIONE: PERCHÉ QUESTO GIOCO ESISTE

### 1.1 La frase che guida ogni decisione

> **"In FM alleni una rosa. Qui alleni un gruppo di persone."**

Ogni feature deve poter rispondere a: *rende il giocatore-persona più vivo, o è solo un'altra tabella?* Se è solo un'altra tabella, va in coda.

### 1.2 I 5 pilastri (e cosa fa FM oggi che noi facciamo meglio)

| # | Pilastro | Limite di FM | Cosa facciamo noi |
|---|---|---|---|
| 1 | **Spogliatoio vivo** | Morale è un numero quasi invisibile, le dinamiche sociali sono liste statiche di "gruppi" | Grafo sociale vero: relazioni pesate, leader, faide, mentori, contagio emotivo settimanale, effetto misurabile in campo |
| 2 | **Narrativa emergente** | Le notizie sono template ripetitivi | Motore di storyline che *rileva* pattern (crisi, redenzione, rivalità, predestinato) e li racconta come archi narrativi con memoria pluriennale |
| 3 | **Partita leggibile** | Il 2D dice poco, i dati sono sparsi in 12 schermate | Campo 2D + pannello analista live (xG, mappa pressing, catene di passaggi, "perché stiamo perdendo") in un'unica schermata |
| 4 | **Mercato con attriti** | Le trattative sono poche variabili | Agenti con personalità e memoria, clausole composte, finestre di interesse, informazione imperfetta (i rating che vedi sono *stime* degli osservatori) |
| 5 | **Trasparenza** | Non sai mai perché un giocatore è peggiorato | Ogni cambiamento importante ha una **causa tracciabile** consultabile ("−3 in Decisioni: 6 settimane di morale basso dopo la promessa non mantenuta del 12/11") |

### 1.3 Pilastro 5 spiegato meglio (è il vero differenziatore)

Il sistema si chiama **Causal Log**. Ogni volta che il motore modifica un valore "sensibile" (attributo, morale, relazione, reputazione, interesse di mercato) scrive un record:

```ts
type CausalEvent = {
  id: string; tick: number; date: GameDate;
  subject: { type: 'player'|'club'|'staff'; id: string };
  field: string;            // 'attr.decisions' | 'morale' | 'rel:playerX'
  delta: number; before: number; after: number;
  cause: { kind: string; refId?: string; note: string };
  visibility: 'public'|'scout'|'hidden'; // cosa l'utente può vedere subito
};
```

Costo: basso. Valore percepito: enorme. Nessun manager game lo fa bene.

---

## 2. REGOLE NON NEGOZIABILI (vincoli di progetto)

1. **Costo zero reale.** Nessun servizio a pagamento, nessun asset a pagamento, nessun font non libero. Se una IA gratuita esaurisce il piano, si cambia strumento (cap. 12 ha le alternative).
2. **Determinismo.** Stesso salvataggio + stesso seed + stesse azioni = stesso risultato. Serve per i test, per il bilanciamento e per i bug report. Niente `Math.random()` nel core: solo il PRNG seeded del motore.
3. **Il core non conosce la UI.** `packages/engine` non importa mai React, DOM, Electron. Deve poter girare in Node puro (per i test e per simulare 100 stagioni in batch).
4. **Nessun dato proprietario.** Niente loghi, kit o scudetti reali; nomi da fonti aperte (cap. 5) e possibilità di "database della community" caricabile dall'utente. Questo ti protegge e ti permette di pubblicare.
5. **Salvataggi versionati.** Ogni save ha uno `schemaVersion` e una catena di migrazioni. Rompere i salvataggi degli utenti è il modo più veloce per perdere la community.
6. **Performance target v1:** una giornata di campionato (tutte le partite dell'Italia simulate) < 400 ms su un portatile medio; una stagione intera in batch < 25 s.
7. **Italiano prima lingua**, ma tutte le stringhe passano da un sistema i18n fin dal primo giorno (aggiungere l'inglese dopo costa zero se lo fai subito, costa settimane se lo fai dopo).

---

## 3. STACK TECNICO COMPLETO

### 3.1 Scelte

| Area | Scelta | Perché |
|---|---|---|
| Runtime desktop | **Electron 32+** | Lo conosci, UI HTML/CSS ideale per tabelle dense |
| Linguaggio | **TypeScript strict** (`strict: true`, `noUncheckedIndexedAccess`) | Un gioco manager è 90% modellazione dati: i tipi ti salvano |
| UI | **React 19 + Vite** | Ecosistema, velocità di iterazione |
| Stato UI | **Zustand** (+ selettori) | Leggero; Redux è sovradimensionato qui |
| Tabelle | **TanStack Table v8** (headless) | Virtualizzazione, sorting e filtri su 50.000 righe |
| Virtualizzazione | **TanStack Virtual** | Liste rosa/scouting lunghissime |
| Stile | **Tailwind v4 + CSS variables** per il tema | Design system a token, dark mode nativa |
| Grafici | **visx** o **Recharts** | xG, radar attributi, andamento stagione |
| Campo 2D | **Canvas 2D** (no libreria) o **PixiJS** se servono effetti | Controllo totale, 60 fps facili |
| Database di gioco | **JSON compresso** (fase 1) → **SQLite via better-sqlite3** (fase 4+) | JSON per iterare veloce, SQLite quando il DB supera ~30 MB |
| Salvataggi | `.tal` = zip contenente `meta.json` + `state.msgpack` | Compatto e veloce |
| Test | **Vitest** + property-based con **fast-check** | Il motore va testato statisticamente, non a occhio |
| Lint/format | ESLint + Prettier + `tsc --noEmit` in pre-commit (**husky + lint-staged**) | Evita che Opus introduca regressioni silenziose |
| Build | **electron-builder** (NSIS Windows, AppImage Linux) | Gratis |
| CI | **GitHub Actions** (free tier) | Test + build automatici a ogni push |
| Versionamento | Git + GitHub (repo privato finché non esci) | Obbligatorio: è la tua rete di sicurezza con un'IA che scrive codice |

### 3.2 Struttura del monorepo (da creare esattamente così)

```
talisman/
├─ package.json                  # workspaces
├─ CLAUDE.md                     # regole permanenti per l'agente (cap. 11)
├─ docs/
│  ├─ 00-vision.md
│  ├─ 01-architecture.md
│  ├─ 02-data-model.md
│  ├─ 03-match-engine.md
│  ├─ 04-systems/*.md            # una spec per sistema
│  ├─ adr/                       # Architecture Decision Records numerati
│  └─ balance/                   # report di bilanciamento generati
├─ packages/
│  ├─ engine/                    # CORE — zero dipendenze UI
│  │  ├─ src/
│  │  │  ├─ rng/                 # PRNG seeded (mulberry32/xoshiro)
│  │  │  ├─ model/               # tipi + entità
│  │  │  ├─ world/               # calendario, competizioni, tick
│  │  │  ├─ match/               # motore partita
│  │  │  ├─ training/            # allenamento e sviluppo
│  │  │  ├─ psychology/          # morale, relazioni, personalità
│  │  │  ├─ transfers/           # mercato, agenti, contratti
│  │  │  ├─ finance/             # bilanci, sponsor, stadio
│  │  │  ├─ narrative/           # storyline, stampa
│  │  │  ├─ scouting/            # osservatori, incertezza
│  │  │  ├─ ai/                  # IA dei club non gestiti
│  │  │  ├─ causal/              # Causal Log
│  │  │  └─ save/                # serializzazione + migrazioni
│  │  └─ test/
│  ├─ data/                      # dataset, generatori, pipeline ETL
│  ├─ sim-cli/                   # tool Node: simula N stagioni, produce report
│  └─ ui/                        # React + Electron renderer
│     ├─ src/design-system/      # token, primitive, icone
│     ├─ src/screens/
│     └─ src/match2d/
└─ assets/                       # output delle IA grafiche (cap. 12)
```

**Perché `sim-cli` è fondamentale:** è il tuo laboratorio. Simula 50 stagioni senza UI e ti dice se i gol per partita sono 2,7 o 6,4, se il Napoli vince 40 scudetti su 50, se gli stipendi esplodono. Senza questo strumento il bilanciamento è impossibile. **Va costruito in Fase 2, non alla fine.**

---

## 4. MODELLO DATI (il cuore: sbagliarlo qui costa mesi)

### 4.1 Principi

- **Entità normalizzate + mappe per id.** Niente oggetti annidati profondi: `players: Record<PlayerId, Player>` e riferimenti per id. Rende salvataggi piccoli e update economici.
- **Separazione netta tra `stable` e `volatile`.** Attributi e contratto cambiano raramente; condizione, morale e forma cambiano ogni tick. Vanno in strutture diverse per poter fare update rapidi.
- **Nessun valore derivato salvato**, salvo cache esplicite invalidate (es. `currentAbility` è ricalcolata, non memorizzata a mano).

### 4.2 Entità principali

```ts
type PlayerId = string & { __brand: 'PlayerId' };

interface Player {
  id: PlayerId;
  bio: { firstName; lastName; commonName?; birthDate; nationality: NationId[]; heightCm; weightKg; foot: 'L'|'R'|'B'; footWeakness: 0..20 };
  club: { clubId: ClubId|null; squad: 'first'|'u23'|'u19'; shirtNumber?: number; joined: GameDate };
  attributes: Attributes;            // 36 attributi, 1-20 in float interno (1.0-20.0)
  potential: { ca: number; pa: number; paRange: [number, number]; paHidden: boolean };
  positions: Record<Position, 0|1|2|3|4|5>;  // familiarità 0=nulla 5=naturale
  personality: Personality;
  psych: PsychState;                 // morale, pressione, felicità, fiducia
  condition: { fitness: 0..100; sharpness: 0..100; fatigue: 0..100; injury?: Injury };
  form: { last5Ratings: number[]; seasonAvg: number; hotStreak: number };
  contract?: Contract;
  history: CareerHistory;
  hiddenTraits: Trait[];             // es. 'tira da fuori', 'si tuffa', 'pugnala i compagni'
  relationships: RelationEdge[];     // grafo sociale (cap. 7.3)
  agentId: AgentId;
  scoutKnowledge: Record<ClubId, ScoutFog>; // quanto ogni club sa davvero di lui
}
```

### 4.3 I 36 attributi (griglia definitiva)

**Tecnici (14):** Contrasti, Marcatura, Posizionamento, Anticipo, Testa, Cross, Dribbling, Finalizzazione, Primo controllo, Passaggio, Tiro da fuori, Punizioni, Rigori, Tecnica.
**Mentali (13):** Aggressività, Anticipazione, Coraggio, Compostezza, Concentrazione, Decisioni, Determinazione, Duttilità, Leadership, Inserimenti, Piazzamento, Visione di gioco, Lavoro di squadra.
**Fisici (6):** Accelerazione, Velocità, Agilità, Equilibrio, Resistenza, Forza.
**Portiere (+9, sostituiscono i tecnici di movimento):** Riflessi, Uno contro uno, Presa, Uscite alte, Comunicazione, Gioco con i piedi, Calci, Tendenza a uscire, Tendenza a tuffarsi.
**Nascosti (7, non mostrati mai):** Consistenza, Prestazioni in grandi partite, Tendenza infortuni, Sportività, Polemiche, Ambizione, Lealtà.

> **Scelta di design importante:** noi aggiungiamo **3 attributi che FM non ha** e che alimentano i pilastri:
> - **Adattabilità tattica** (quanto velocemente impara un nuovo ruolo/sistema)
> - **Resilienza** (quanto rapidamente il morale risale dopo un colpo)
> - **Influenza sociale** (quanto il suo umore contagia gli altri nel grafo — diverso da Leadership, che è in campo)

### 4.4 Personalità: non un'etichetta, 6 assi

```ts
interface Personality {
  ambition: 0..20;        // vuole vincere / vuole giocare / vuole soldi
  professionalism: 0..20; // allenamento, recupero, disciplina
  loyalty: 0..20;
  temperament: 0..20;     // esplosivo ↔ calmo
  sociability: 0..20;     // si integra / isolato
  pressureTolerance: 0..20;
}
```
L'etichetta mostrata all'utente ("Professionista modello", "Talento incompreso") è **derivata** dai 6 assi, non memorizzata. E la vedi solo con conoscenza del giocatore sufficiente (cap. 7.6).

### 4.5 Altre entità (elenco con campi chiave)

- **Club**: reputazione (mondiale/nazionale/locale), finanze, stadio, settore giovanile (qualità struttura, qualità reclutamento, coefficiente nazionale), filosofia societaria, storia, rivalità, dirigenza (aspettative stagionali), staff.
- **Staff**: allenatori per area (difesa, attacco, portieri, atletico, tecnica), osservatori (rete di contatti per area geografica), direttore sportivo, fisioterapisti, analisti dati (sbloccano statistiche avanzate — bella meccanica).
- **Competition**: formato (girone, eliminazione, gironi+ko, playoff), regole (3 punti, gol in trasferta, VAR, numero sostituzioni, limite stranieri/liste), premi, coefficienti, promozioni/retrocessioni, qualificazioni europee, calendario generato.
- **Contract**: salario, durata, bonus (presenze, gol, clean sheet, qualificazione), clausole (rescissoria, % rivendita, opzione rinnovo, prestito con obbligo/diritto), status (chiave, importante, rotazione, prospetto), promesse legate.
- **Agent**: personalità (avido, ragionevole, manipolatore), rapporto con ogni club (memoria di trattative passate), portafoglio assistiti, commissioni richieste.
- **GameDate/Tick**: il mondo avanza a **tick giornalieri**; la simulazione è "event-driven" su una coda di eventi programmati (partite, scadenze mercato, riunioni, consigli).

---

## 5. DATI: DOVE PRENDERLI GRATIS E LEGALMENTE

### 5.1 Strategia a tre strati

| Strato | Contenuto | Fonte |
|---|---|---|
| **Base aperta** | Leghe, squadre, calendari storici, stadi, città | `openfootball` (GitHub, dominio pubblico/ODbL), Wikidata via SPARQL, football-data.org (free tier) |
| **Rose** | Nomi giocatori, ruolo, età, nazionalità | Wikidata SPARQL (query per "membro della squadra X"), + fallback generativo |
| **Valori** | CA/PA, attributi, valore di mercato, stipendi | **Generati dal tuo modello**, calibrati su statistiche pubbliche (minuti, gol, età, livello lega) |

**Punto chiave:** nessun database "tipo FM" copiato. Gli attributi li **generi tu** con un modello statistico. Questo è più onesto, più difendibile legalmente e — sorpresa — produce un gioco più interessante perché nessuno sa già i numeri a memoria.

### 5.2 Il generatore di attributi (spec per Opus)

Input per giocatore: età, ruolo principale, livello del club (reputazione), minuti giocati stagione scorsa, gol/assist, lega.
Pipeline:
1. **Stima CA** = f(reputazione club, minutaggio, livello lega) con curve calibrate → 1..200.
2. **Stima PA** = CA + margine legato all'età (curva a campana con picco 26-28) + rumore; `paRange` mostrato agli osservatori.
3. **Distribuzione di CA sugli attributi** tramite *profili di ruolo* (vettori di peso: un "terzino di spinta" ha pesi alti su Velocità, Cross, Resistenza) + rumore gaussiano + vincoli (somma pesata = CA).
4. **Personalità** campionata da distribuzioni condizionate alla nazionalità/età/club (leggere, senza stereotipi grossolani).
5. **Tratti nascosti** con probabilità legate agli attributi.

### 5.3 Editor e database della community

Da subito, formato dati **aperto e documentato** (`/data/*.json` + schema Zod). Fase 7 aggiunge un editor in-game. Così se qualcuno vuole i nomi reali dei club, li mette lui: tu distribuisci il gioco, non i dati.

### 5.4 Volume target v1

- 4 divisioni italiane (A, B, C-A/B/C, D semplificata) ≈ 120 club, ≈ 3.500 giocatori attivi
- 5 leghe estere "ridotte" (top 20 club per nazione) per mercato e coppe europee ≈ 100 club, 2.500 giocatori
- 40 nazionali, giocatori generati per il resto del mondo su richiesta (*lazy world generation*: il Brasile esiste davvero solo quando un tuo osservatore ci va)

**La lazy world generation è la tecnica che ti permette di avere "il mondo" senza avere il mondo.** Spiegala a Opus: i club fuori dal dettaglio hanno solo reputazione e budget; i loro giocatori vengono materializzati alla prima osservazione e poi persistono.

---

## 6. MATCH ENGINE — SPECIFICA COMPLETA

È il 40% della qualità percepita. Va costruito a **livelli**, ognuno testabile.

### 6.1 Architettura a 4 livelli

```
L0  Risolutore istantaneo  → risultato da forze relative (per leghe lontane, velocissimo)
L1  Motore a eventi        → catena di azioni discrete con probabilità (base del gioco)
L2  Motore a zone          → il campo è una griglia 12x8; palla e giocatori hanno posizione
L3  Motore continuo 2D     → tick 200 ms, movimento reale, usato per la visualizzazione
```

v1 usa **L2 per tutte le partite rilevanti** e **L0 per le leghe non dettagliate**. L3 è un obiettivo di fase 6: la resa 2D lavora *sopra* L2 interpolando le posizioni (trucco fondamentale: la grafica non deve essere la verità, deve *raccontare* la verità di L2).

### 6.2 Ciclo di L2 (il cuore)

Ogni "possesso" è una sequenza di decisioni. Pseudo-loop:

```
while (minute < 90 + recupero):
  1. calcola pressione locale e superiorità numerica nella zona della palla
  2. il portatore valuta le opzioni: passaggio (corto/lungo/filtrante), dribbling,
     tiro, cross, fallo subito, protezione palla
  3. utilità di ogni opzione = f(attributi, istruzioni tattiche, rischio, spazio,
     stanchezza, morale, pressione avversaria, momentum)
  4. scelta = softmax(utilità, temperatura = f(Decisioni, Compostezza, pressione))
  5. esecuzione = confronto attributo esecutore vs attributo difensore + rumore
  6. aggiorna posizione palla, stamina, statistiche, xG, momentum, catena di passaggi
  7. genera evento narrativo se soglia superata (occasione, parata, infortunio, fallo)
```

**Nota di design decisiva:** il passo 4 usa *softmax con temperatura*, non un `if`. Un giocatore con Decisioni 18 sceglie quasi sempre l'opzione migliore; uno con 8 sbaglia scelta spesso pur avendo buona tecnica. È ciò che rende i giocatori *diversi* invece che *migliori/peggiori*.

### 6.3 Modello xG interno

Ogni tiro produce `xG = f(distanza, angolo, parte del corpo, pressione difensiva, tipo di assist, portiere fuori posizione)`. Serve a due cose: alimentare il pannello analista e **calibrare il motore** (i tuoi xG per partita devono somigliare a quelli reali: ~1,3 per squadra in Serie A).

### 6.4 Tattiche — profondità richiesta

- **Modulo**: posizioni libere sulla griglia, non solo preset.
- **Ruolo per posizione** (~25 ruoli, es. Mezzala d'inserimento, Regista arretrato, Falso nove, Difensore che imposta) ognuno con *tendenze* che modificano le utilità del punto 3.
- **Mentalità** (5 livelli) e **istruzioni di squadra** (20+): ampiezza, tempo, linea difensiva, trigger di pressing, uscita dal basso, tempo di possesso, falli tattici, contropiede, crossing mirato, trappola del fuorigioco.
- **Istruzioni individuali** (10+ per giocatore).
- **Innovazione nostra — "Piani partita"**: fino a 3 piani condizionali configurabili ("se in svantaggio dopo il 60': piano Assalto"; "se in vantaggio di 2: piano Controllo"). Il cambio è automatico e viene *comunicato* dal tuo vice in panchina. FM ha qualcosa di simile ma sepolto; noi lo rendiamo centrale e visibile.
- **Familiarità tattica**: la squadra impara il sistema nel tempo (0-100%), l'apprendimento dipende da Adattabilità tattica e ore di allenamento tattico.

### 6.5 Momentum e psicologia in partita

Variabile `momentum ∈ [-100, 100]` che si muove su: gol, occasioni, espulsioni, pubblico, minuti finali, rimonte. Influenza la temperatura del softmax e i modificatori di esecuzione, **scalata da pressureTolerance e Compostezza del singolo**. Effetto: le squadre giovani crollano, i veterani gestiscono.

### 6.6 Statistiche da produrre per ogni partita

Possesso, passaggi (tentati/riusciti per terzo di campo), tiri, xG, xGA, grandi occasioni, duelli, contrasti, intercetti, pressioni riuscite, PPDA, distanza percorsa, mappa di calore per giocatore, rete dei passaggi, timeline xG. Sono la base del pannello analista (cap. 8.4) e la prova che il motore funziona.

### 6.7 Test del motore (obbligatori)

`sim-cli` deve produrre un report con: media gol/partita (target 2,5-2,9), % vittorie casa (target 42-46%), distribuzione risultati, cartellini/partita, infortuni/stagione per squadra (target 12-18), correlazione tra CA medio rosa e punti finali (target r ≈ 0,75-0,85 — se è 0,98 il gioco è deterministico e noioso; se è 0,4 è casuale e frustrante).

---

## 7. I SISTEMI DI GIOCO (specifiche da incollare nei prompt)

### 7.1 Allenamento e sviluppo

- **Settimana strutturata**: 12 slot settimanali (mattina/pomeriggio × 6 giorni), ogni slot ha una categoria (tattico, fisico, tecnico, set piece, recupero, partitella, riposo).
- **Carico** calcolato per giocatore → affaticamento → rischio infortunio (curva non lineare: oltre soglia il rischio esplode).
- **Sviluppo attributi**: ogni settimana, per ogni attributo, delta = f(gap CA→PA, età (curva), qualità allenatore d'area, professionalità, minuti giocati, focus individuale, morale, infortuni recenti). Piccolo e continuo, **mai scatti visibili** salvo "breakout" raro (evento narrativo).
- **Curve d'età**: crescita fino a ~24, plateau 24-29, declino da 30 con velocità legata a Professionalità e ruolo (i fisici calano prima dei tecnici).
- **Mentori**: un veterano ad alta Influenza sociale assegnato a un giovane trasferisce lentamente Personalità e alcuni attributi mentali. Meccanica bellissima, poco costosa.

### 7.2 Condizione, infortuni, recupero

- `fitness` (energia nel breve), `sharpness` (minutaggio recente), `fatigue` cumulativa stagionale (invisibile, spiega i cali di marzo).
- Infortuni: catalogo di ~60 tipologie con distribuzione realistica di durata; tipologia legata al contesto (contrasto, sprint, ricaduta). **Ricadute** se rientro forzato: la scelta "lo rischio in finale?" deve avere conseguenze vere.
- Staff medico: riduce durata e probabilità; analisti del carico segnalano i giocatori a rischio (feature premium percepita, costo basso).

### 7.3 Psicologia e spogliatoio — IL PILASTRO 1, in dettaglio

**Grafo sociale.** Ogni giocatore ha archi verso altri:
```ts
type RelationEdge = { to: PlayerId; strength: -100..100; kind: 'amico'|'rivale'|'mentore'|'allievo'|'neutro'; since: GameDate; memory: RelEvent[] };
```
- **Formazione naturale**: nazionalità comune, lingua, età vicina, stesso ruolo (rivalità per il posto), tempo condiviso, successi condivisi.
- **Eventi che modificano gli archi**: litigio in allenamento, gol decisivo, sostituzione contestata, dichiarazione alla stampa, arrivo di un concorrente nel ruolo, rinnovo di un compagno a cifre superiori.
- **Gerarchia**: `influence = f(Leadership, Influenza sociale, reputazione, anzianità, minuti, rendimento)`. I primi 3-5 formano il **gruppo dirigente**. Le tue decisioni vanno "vendute" a loro: se metti fuori rosa un leader, il gruppo reagisce.
- **Contagio emotivo**: ogni settimana `morale_i += Σ_j (w_ij · (morale_j − morale_i) · influenza_j) · k`. Un solo giocatore molto influente e infelice avvelena il gruppo. Con Resilienza alta si assorbe.
- **Faide**: se `strength < -60` tra due giocatori con influenza alta → evento faida, effetti in campo (meno passaggi tra i due nel match engine — sì, il grafo entra davvero in L2 modificando le utilità di passaggio), scelta per te: schierarti, mediare, vendere uno.
- **Promesse**: tempo di gioco, acquisti, rinnovo, cessione, ruolo. Ogni promessa ha scadenza e verifica automatica. Promessa mantenuta = +fiducia diffusa; rotta = −morale, −relazione con te, richiesta di cessione, e **memoria pluriennale** (gli agenti se lo ricordano in trattative future).
- **Interfaccia**: schermata "Spogliatoio" con il grafo visualizzato (nodi = giocatori, dimensione = influenza, colore = morale, archi = relazioni). È una delle immagini che venderà il gioco.

### 7.4 Narrativa dinamica — PILASTRO 2

**Motore a pattern.** Ogni settimana un `NarrativeScanner` valuta ~40 regole sui dati, ognuna con condizioni e priorità. Esempi:
- `CRISI`: 4 partite senza vittoria + morale < 40 + aspettative dirigenza non rispettate → arco "Panchina traballante" (durata, tappe, esito).
- `REDENZIONE`: giocatore con forma pessima per 6 settimane che poi segna una doppietta → arco "Rinascita".
- `PREDESTINATO`: under 19 con PA > 160 esordiente → arco pluriennale con tappe (prima rete, prima convocazione, interesse dei grandi club).
- `RIVALITÀ`: due squadre a pari punti a 5 giornate dalla fine → build-up mediatico crescente.
- `NEMESI`: un allenatore che ti ha battuto 3 volte di fila.
Ogni arco ha: `stages[]`, testi generati da template parametrici **con variabili ricche** (non "X ha segnato", ma "Il terzo gol in quattro giorni di X, arrivato proprio contro la squadra che lo aveva scartato a 16 anni").

**Costruzione dei testi:** grammatica a template con slot + varianti (sistema stile *tracery*), **non** chiamate a LLM in runtime (costo zero e offline). L'LLM (Opus) lo usi **in fase di sviluppo** per generare 2.000 varianti di template di alta qualità, poi le impacchetti.

**Stampa reattiva:** conferenze pre/post partita con domande *derivate dagli archi attivi*, non casuali. Le tue risposte hanno effetti tracciati sul morale di giocatori specifici (e appaiono nel Causal Log).

### 7.5 Mercato, agenti, contratti — PILASTRO 4

- **Valutazione**: `valore = f(CA, PA, età, contratto residuo, ruolo, nazionalità/quota, reputazione, forma, inflazione di mercato)` + moltiplicatore per "premio di necessità" del club acquirente.
- **Trattativa multi-parametro**: prezzo, pagamento rateizzato, bonus (presenze, gol, promozione), % rivendita, contropartite, obbligo/diritto di riscatto, commissioni agente. Motore di negoziazione a concessioni alternate, con `reservationPrice` nascosto e pazienza.
- **Agenti con memoria e personalità**: chi ti ha visto rompere una promessa chiede di più; chi hai trattato bene ti offre i suoi assistiti per primo. Gli agenti *creano* movimento (propongono giocatori, spingono per uscite, alimentano voci di stampa).
- **Finestre di interesse**: i club non comprano sempre; hanno bisogni per ruolo, budget, finestra temporale e priorità. L'IA di mercato ha un piano stagionale, non impulsi casuali.
- **Clausole e svincolati**: rescissorie attivabili, parametro zero da gennaio, prestiti con condizioni (minuti garantiti, divieto di schierarlo contro il proprietario).
- **Effetto spogliatoio**: ogni acquisto modifica il grafo sociale e le aspettative di chi gioca nel suo ruolo. Questo lega il pilastro 4 al pilastro 1: **è la cosa che FM non fa in modo visibile.**

### 7.6 Scouting e informazione imperfetta

**Regola:** l'utente non vede mai i valori veri di un giocatore non suo. Vede **stime** con barra di incertezza.

```ts
interface ScoutFog { knowledge: 0..100; attrEstimates: Record<Attr, {mid:number; band:number}>; paEstimate: [number,number]; personalityKnown: boolean; }
```
- `knowledge` cresce con: partite osservate dal vivo, qualità osservatore (Giudizio del potenziale / Giudizio delle abilità), rete di contatti nell'area, dati disponibili (le leghe minori hanno meno dati).
- **Data-scouting**: puoi assumere analisti e filtrare per metriche (progressive passes, pressioni/90) — con la trappola realistica che i numeri mentono se il campione è piccolo. Feature molto "2026".
- **Errori di valutazione permanenti**: un osservatore mediocre può darti una stima sistematicamente sbagliata (bias, non solo rumore). Le bufale di mercato sono una *feature*.

### 7.7 Finanze, dirigenza, obiettivi

- Entrate: biglietti (dinamici per rendimento/avversario), sponsor, TV (posizione + coefficiente), merchandising, plusvalenze, premi coppe, settore giovanile.
- Uscite: stipendi, ammortamenti, staff, struttura, stadio.
- **Fair play finanziario semplificato**: sanzioni progressive, non morte istantanea.
- **Dirigenza**: aspettative stagionali (campionato, coppa, mercato, sviluppo giovani), fiducia con 4 barre separate (dirigenza, tifosi, squadra, stampa) e memoria; richieste tue (budget, strutture, cessioni) con costo politico.
- **Innovazione nostra**: la fiducia della dirigenza è un **contratto esplicito** rinegoziabile ("chiedo due stagioni di transizione in cambio di obiettivi più bassi") — trasforma un sistema opaco in una scelta strategica.

### 7.8 Settore giovanile e nazionali

- **Youth intake** annuale generato da: qualità struttura, reclutamento, reputazione, nazione (curve realistiche), fortuna. Con "colpo di fortuna" raro (un PA 180 in Serie C: la storia che racconterai agli amici).
- Tutoraggio, prestiti formativi, gestione minuti U21/U23.
- Nazionali: convocazioni con IA, tornei (Mondiale 2026 già in calendario, Europeo 2028), effetti su fatica e valore di mercato.

### 7.9 IA dei club non gestiti

Deve essere *plausibile*, non ottimale. Componenti:
1. **Profilo del club** (filosofia: giovani, veterani, fisico, tecnico) — determina il gusto nel mercato.
2. **Valutatore di rosa**: buchi per ruolo, età media, scadenze.
3. **Pianificatore di mercato** con budget e priorità.
4. **Selezionatore formazione** (ottimizzatore semplice con vincoli di fatica e rotazione) + scelta tattica in base all'avversario.
5. **Gestione allenatori**: esoneri con soglie legate a reputazione e aspettative; carosello panchine a fine stagione (con *te* come candidato: le offerte arrivano).

---

## 8. UI/UX E DESIGN SYSTEM

### 8.1 Direzione artistica

Nome della direzione: **"Sala Analisi"** — l'estetica di un centro sportivo moderno, non di un foglio Excel.
- **Palette**: fondo `#0B1014` → `#121A21`, superfici `#18232C`, accento primario verde campo `#16C784` (segnali positivi e azione), accento secondario ambra `#F2A33C` (attenzione), negativo `#E5484D`, blu dati `#4C8DFF`, testo `#E8EEF2` / `#8FA3B0`.
- **Tipografia**: titoli `Barlow Condensed` (sportiva, compatta), testo/UI `Inter`, numeri tabellari `IBM Plex Mono` (tutti Google Fonts, gratis e ridistribuibili).
- **Densità**: righe tabella 28-32 px, 3 livelli di densità selezionabili.
- **Regola**: ogni schermata ha **una** azione primaria evidenziata. FM soffre di paralisi da bottoni: tu no.
- **Movimento**: transizioni 120-180 ms, easing `cubic-bezier(.2,.8,.2,1)`; mai animazioni che rallentano un giocatore esperto.

### 8.2 Token (da creare in `design-system/tokens.css`)

Scale: spazio 4/8/12/16/24/32/48; raggi 4/8/12; ombre 3 livelli; colori semantici (`--surface-1..3`, `--text-1..3`, `--accent`, `--positive`, `--warning`, `--negative`, `--data-1..8` per i grafici). Tema chiaro come variante, non obbligatorio in v1.

### 8.3 Mappa delle schermate (v1 = 24 schermate)

1. Home/Scrivania (feed narrativo + azioni urgenti)
2. Squadra → Rosa (tabella configurabile, 40 colonne, viste salvate)
3. Squadra → Tattica (campo drag&drop, ruoli, istruzioni, piani partita)
4. Squadra → Allenamento (calendario settimanale, carico, focus individuali)
5. Squadra → **Spogliatoio** (grafo sociale, gerarchia, faide, promesse) ⭐
6. Giocatore → Profilo (attributi + radar + confronto)
7. Giocatore → **Storia causale** (timeline Causal Log) ⭐
8. Giocatore → Contratto / Sviluppo / Statistiche / Rapporti
9. Partita → Prepartita (report avversario generato)
10. Partita → **Live** (campo 2D + pannello analista + panchina) ⭐
11. Partita → Analisi post
12. Mercato → Ricerca (filtri avanzati + data-scouting)
13. Mercato → Trattative (schermata negoziazione multi-parametro)
14. Mercato → Osservatori (assegnazioni, rete, rapporti)
15. Club → Finanze / Dirigenza / Strutture / Storia
16. Club → Staff
17. Competizioni → Classifica / Calendario / Marcatori / Forma
18. Mondo → Notizie / Trasferimenti / Panchine
19. Nazionale
20. Settore giovanile
21. Carriera (tuo profilo, reputazione, trofei, offerte)
22. Impostazioni (i18n, densità, scorciatoie, dati)
23. Editor database (fase 7)
24. Salvataggi

### 8.4 La schermata Partita Live (spec di dettaglio)

Layout a 3 colonne:
- **Sinistra (240px)**: la tua formazione con condizione, rating live, avvisi ("Barella: fatica critica"), pulsanti sostituzione rapida.
- **Centro (flessibile)**: campo 2D 16:9 in alto; sotto, timeline degli eventi con marcatori xG cliccabili.
- **Destra (320px)**: **Pannello Analista** con 4 tab: Momentum (grafico a fiume), Pressing (PPDA + mappa zone), Catene di passaggi (rete), Duelli (chi sta perdendo il suo 1v1). In basso, la frase dell'analista: *"Stiamo creando poco perché il loro mediano sta accorciando su Calhanoglu: prova l'ampiezza a destra."* Generata da regole sui dati — è quello che rende il gioco "intelligente" agli occhi di chi gioca.
- **Controlli**: velocità 1x-4x, pausa tattica, tasti rapidi, "salta al prossimo evento".

---

## 9. ROADMAP: 10 FASI, 30 SETTIMANE

Ipotesi: **10-15 ore a settimana** da parte tua (il resto lo fa Opus). Se ne hai di più, comprimi; l'ordine non va cambiato, perché ogni fase è testabile e le dipendenze sono reali.

| Fase | Settimane | Obiettivo | "Fatto" significa |
|---|---|---|---|
| **F0 — Fondamenta** | 1 | Monorepo, TS strict, CI, CLAUDE.md, ADR, PRNG seeded, i18n | `pnpm test` verde su GitHub Actions, app Electron che apre una finestra con il design system |
| **F1 — Modello e dati** | 2-3 | Entità, schema Zod, pipeline dati Italia, generatore attributi | `sim-cli generate` produce 120 club e 3.500 giocatori con distribuzioni plausibili (report statistico) |
| **F2 — Mondo che gira** | 4-6 | Calendario, competizioni, tick giornaliero, L0+L1, salvataggi, **sim-cli** | Una stagione intera simulata da CLI in < 30 s con classifiche credibili |
| **F3 — Match engine L2** | 7-10 | Zone, tattiche, ruoli, xG, statistiche complete, momentum | Report di bilanciamento dentro i target del §6.7 |
| **F4 — Gioco giocabile (UI core)** | 11-14 | Rosa, tattica, calendario, avanza giornata, risultato partita testuale | **Prima build giocabile end-to-end**: puoi allenare l'Inter per una stagione |
| **F5 — Persone** | 15-18 | Allenamento, sviluppo, infortuni, morale, grafo sociale, promesse, Causal Log | La schermata Spogliatoio funziona e i suoi effetti sono misurabili in un A/B da CLI |
| **F6 — Partita in 2D** | 19-21 | Canvas, interpolazione da L2, pannello analista, controlli live | Guardi 90 minuti senza annoiarti e capisci perché stai perdendo |
| **F7 — Mercato e scouting** | 22-24 | Trattative, agenti, clausole, osservatori, fog, data-scouting, IA mercato | Due stagioni di mercato IA senza rose assurde (test automatico su età media e monte ingaggi) |
| **F8 — Narrativa e contorno** | 25-27 | Storyline, stampa, dirigenza, finanze, giovanili, nazionali | Una stagione produce almeno 8 archi narrativi distinti e coerenti |
| **F9 — Rifinitura e release** | 28-30 | Grafica finale, onboarding/tutorial, audio, bilanciamento, build, pagina itch.io | Build firmata, 3 tester esterni completano una stagione senza aiuto |

**Post-release (continuo):** più leghe (lavoro di dati), editor, workshop community, modalità sfida, statistiche storiche.

### 9.1 Milestone "carote" (per non mollare)
- **Sett. 6**: il primo report di una stagione simulata. È il momento in cui il progetto diventa reale.
- **Sett. 14**: la prima stagione giocata da te. Da qui in poi giochi mentre sviluppi: è il miglior QA che esista.
- **Sett. 21**: il primo gol visto in 2D. Registralo, è il tuo primo materiale promozionale.

---

## 10. COSA FAI TU (il tuo lavoro, settimana per settimana)

Opus scrive il codice. Tu fai **cinque** cose che l'IA non può fare al posto tuo:

### 10.1 Decidi (30% del tempo)
Ogni fase ha 3-6 decisioni di design. Le prendi tu, le scrivi in un **ADR** (`docs/adr/0007-modello-scouting.md`, 15 righe: contesto, opzioni, scelta, conseguenze) e le incolli nei prompt. Senza ADR, Opus in sessioni diverse farà scelte contraddittorie: è la causa numero uno del fallimento dei progetti assistiti da IA.

### 10.2 Testi giocando (30%)
Dalla F4 in poi, **gioca 2 ore a settimana** e tieni un file `docs/playtest/AAAA-MM-GG.md` con: cosa è noioso, cosa non si capisce, cosa sembra sbagliato, cosa ti ha fatto dire "wow". Quel file è l'input migliore per i prompt successivi.

### 10.3 Controlli la qualità (20%)
Non leggi tutto il codice (impossibile), ma **sempre**: i test passano? il report di bilanciamento è nei target? la build parte? il diff tocca solo i file previsti? Se Opus ha toccato 40 file per una feature da 3, fermalo.

### 10.4 Curi dati e asset (15%)
Le pipeline dati e la generazione grafica richiedono giudizio umano: scegliere i 200 volti buoni fra 500 generati, correggere nomi, decidere quali club includere.

### 10.5 Prepari la community (5%)
Dalla F6: devlog su Reddit (r/footballmanagergames, r/gamedev), 1 GIF a settimana su X/Bluesky, pagina itch.io aperta presto. Il gioco gratis vive di attenzione, e l'attenzione si costruisce mesi prima dell'uscita.

### 10.6 Ritmo di lavoro consigliato (una settimana tipo)

| Giorno | Attività |
|---|---|
| Lun | Rileggi il piano di fase, scrivi gli ADR della settimana, prepara i 2-3 prompt |
| Mar-Mer | Sessioni con Opus (1 feature per sessione, commit per feature) |
| Gio | Revisione: test, report bilanciamento, correzioni mirate |
| Ven | Asset/grafica con le IA gratuite (batch) |
| Sab | Playtest + note |
| Dom | Riposo, oppure 1 ora di devlog |

---

## 11. COME LAVORARE CON CLAUDE OPUS (metodo operativo)

### 11.1 Il file `CLAUDE.md` (da mettere nella radice del repo, subito)

È la memoria permanente dell'agente. Contenuto consigliato:

```md
# TALISMAN — regole per l'agente

## Contesto
Gioco manageriale di calcio, Electron + React + TypeScript, monorepo pnpm.
Il core di simulazione sta in packages/engine e NON deve mai importare React,
DOM, Electron o Node-specific API (deve girare in Node e nel browser).

## Regole assolute
1. TypeScript strict. Niente `any`, niente `as` non giustificato da un commento.
2. Nessun `Math.random()`: usa `rng.next()` dal contesto di simulazione.
3. Nessuna data reale (`new Date()`) nel motore: solo `GameDate`.
4. Ogni sistema nuovo ha: tipi, funzione pura, test Vitest, voce in docs/.
5. Le stringhe UI passano da `t('chiave')`. Mai testo hardcoded.
6. Ogni modifica a valori sensibili scrive un CausalEvent.
7. Non modificare file fuori dallo scope dichiarato nel prompt. Se serve, chiedi.
8. Prima di scrivere codice, esponi il piano in 5-10 punti e attendi conferma.
9. Funzioni pure quando possibile; lo stato si muta solo nei reducer del tick.
10. Commenti in italiano, nomi di codice in inglese.

## Comandi
pnpm test • pnpm typecheck • pnpm sim -- --seasons 10 --seed 42 • pnpm dev

## Definizione di "fatto"
Test verdi + typecheck pulito + report bilanciamento nei target + doc aggiornata.
```

### 11.2 Struttura di una sessione con Opus (ripetibile)

1. **Contesto**: "Leggi `CLAUDE.md`, `docs/02-data-model.md` e `docs/adr/0007-*.md`."
2. **Obiettivo**: una sola feature, definita con criteri di accettazione numerici.
3. **Piano prima del codice**: chiedi sempre il piano e correggilo. Costa 5 minuti, risparmia ore.
4. **Implementazione a blocchi** con commit intermedi.
5. **Test e report**: chiedi esplicitamente i test e l'esecuzione di `sim-cli`.
6. **Chiusura**: chiedi un `SUMMARY.md` di 20 righe con decisioni prese, debito tecnico lasciato e cosa andrebbe fatto dopo. **Quel riassunto è l'apertura della sessione successiva.**

### 11.3 Regole anti-disastro
- **Un ramo git per feature**, commit piccoli. Se una sessione va male: `git reset --hard`, nessun dramma.
- **Mai due feature grosse nella stessa sessione**: il contesto si satura e la qualità crolla.
- **Mai far riscrivere "tutto il motore"**: chiedi rifattorizzazioni chirurgiche con elenco file.
- **Fai scrivere i test prima** per i sistemi numerici (sviluppo giocatori, finanze): TDD è l'unico modo di verificare un'IA su logica statistica.
- Se una risposta contiene numeri magici non spiegati, chiedi che diventino **costanti in `balance/constants.ts` documentate**. Tutta la calibrazione deve stare in un unico file.

### 11.4 Uso delle skill/strumenti di Claude
- **Plan mode** per aprire ogni fase.
- **Subagent/Explore** per la ricerca nel codice quando il repo cresce.
- **Skill artifact/design** per prototipare schermate come pagina HTML prima di scriverle in React (validi 10 minuti, risparmi ore).
- **Skill dataviz** per i grafici del pannello analista.
- **Generazione batch di testi** (template narrativi, nomi, commenti) in sessioni dedicate che producono file JSON, non codice.

---

## 12. GRAFICA E AUDIO CON IA GRATUITE

### 12.1 Cosa serve davvero (inventario asset)

| Asset | Quantità | Metodo consigliato |
|---|---|---|
| Volti giocatori | ~6.000 | **Procedurale SVG** (libreria `facesjs`, MIT) — non generativo |
| Kit/maglie | ~220 | **SVG procedurale** parametrico (template + colori dal DB) |
| Stemmi club | ~220 | **SVG procedurale** (forma scudo + simbolo + iniziali) |
| Icone UI | ~150 | **Lucide** (ISC, gratis) + 10 custom |
| Sfondi schermate | ~12 | IA generativa (stadi, spogliatoi, campi astratti) |
| Illustrazioni eventi | ~40 | IA generativa stilizzata (infortunio, trofeo, conferenza) |
| Logo del gioco | 1 + varianti | IA + rifinitura vettoriale |
| Chiave grafica / store | 5-8 | IA generativa |
| Audio ambiente | ~15 loop | Pixabay/Freesound (CC0) + IA musicale |
| UI sound | ~20 | Freesound CC0 |
| Musica menu | 2-3 tracce | IA musicale free tier |

> **La decisione più importante di questo capitolo:** volti, kit e stemmi **non** si generano con l'IA immagine. Devono essere migliaia, coerenti, piccoli e derivati dai dati. Vanno **procedurali in SVG**. L'IA generativa la usi solo dove serve *una* immagine bella: sfondi, illustrazioni, logo, materiale promozionale. Questo ti fa risparmiare mesi e ti evita problemi di licenza.

### 12.2 Strumenti gratuiti consigliati (verifica sempre i limiti attuali del free tier)

**Immagini**
- **Hugging Face Spaces** con FLUX.1-schnell / SDXL — gratuito, senza watermark, ottimo per batch.
- **Krea**, **Leonardo.ai**, **Playground**, **Ideogram** (ottimo per testo nelle immagini, utile per il logo), **Bing/Copilot Image Creator**, **Google AI Studio** — tutti con piani gratuiti a crediti giornalieri. Alternale: un tool al giorno = crediti sufficienti.
- **Recraft** — genera direttamente **vettoriale (SVG)**: utilissimo per icone e forme di stemmi.
- **Stable Diffusion in locale** (ComfyUI/Automatic1111) se il tuo PC ha una GPU: zero limiti, controllo totale, il vero costo zero.
**Vettoriale e rifinitura:** Inkscape, Figma (free), `vtracer`/`potrace` per vettorializzare.
**Audio:** Freesound e Pixabay (CC0) per effetti e folla; Suno/Udio free tier per musica; Audacity per il montaggio.
**Video/promo:** OBS (registrazione), Kdenlive/CapCut (montaggio), ffmpeg per le GIF del devlog.

**Attenzione licenze:** controlla che il free tier consenta l'uso commerciale/redistribuzione anche per un gioco gratuito e che non imponga watermark. Tieni un file `assets/LICENSES.md` con fonte, strumento, prompt e licenza di ogni asset: se un giorno pubblichi su Steam ti servirà.

### 12.3 Prompt pronti per le IA grafiche

**G1 — Sfondo schermata principale (stadio notturno astratto)**
```
Wide cinematic background for a football management game UI, empty modern
stadium at night seen from the tunnel, deep teal and midnight blue palette,
volumetric floodlight haze, shallow depth of field, heavily darkened lower
third for text overlay, no people, no logos, no text, photoreal but slightly
stylized, 16:9, ultra wide, subtle film grain
```
**G2 — Sfondo spogliatoio (per la schermata Spogliatoio)**
```
Modern football dressing room interior, empty, warm low key lighting, wooden
lockers, hanging plain kits without any logo or text, teal and amber color
grading, cinematic, shallow depth of field, dark and moody, space on the left
for UI panels, no people, no branding, 16:9
```
**G3 — Illustrazione evento "infortunio"** (serie coerente: ripeti lo stesso stile per tutte e 40)
```
Minimal flat vector illustration, single scene: a physiotherapy table with a
taped ankle and an ice pack, limited palette of dark teal #18232C, muted green
#16C784 and amber #F2A33C, thick geometric shapes, no outlines, no text,
centered composition, generous negative space, editorial sports magazine style
```
**G4 — Logo del gioco** (usa Ideogram/Recraft, i migliori sul testo)
```
Logo for a football management simulation game, wordmark "TALISMAN" in a bold
condensed geometric sans, a minimal abstract mark combining a shield silhouette
and a tactical arrow, monochrome on dark background, flat vector, sharp,
premium esports/broadcast feel, no photorealism, no mascot
```
**G5 — Key art promozionale**
```
Key art for an indie football manager game: a lone manager silhouette in a dark
technical jacket standing on the touchline, back to camera, blurred floodlit
stadium behind, cinematic teal and amber grading, dramatic rim light, cold
atmosphere, empty upper area for the title, 16:9, painterly realism
```
**G6 — Texture campo (tile per il 2D)**
```
Seamless tileable grass texture for a top-down 2D football pitch, mown stripe
pattern, subtle, desaturated dark green, low contrast, no shadows, no lines,
flat lighting, 1024x1024, seamless
```

**Metodo di lavoro con le IA grafiche (importante):**
1. Definisci **una** "bibbia di stile" (3 righe fisse da mettere in coda a ogni prompt: palette, stile, illuminazione).
2. Genera a batch di 8, scarta senza pietà, tieni 1.
3. Rifinisci in Figma/Inkscape per allineare palette e ritaglio.
4. Ottimizza: PNG → `pngquant`, SVG → `svgo`, sfondi in WebP.
5. Registra tutto in `assets/LICENSES.md`.

### 12.4 Prompt per Opus sui sistemi grafici procedurali

**GP1 — Generatore di stemmi SVG**
```
Implementa packages/ui/src/procgen/crest.ts: genera lo stemma SVG deterministico
di un club a partire da (clubId, colori primario/secondario/terziario, città,
anno fondazione, "carattere" del club). Requisiti:
- 8 forme di scudo, 12 pattern (bande, strisce, quarti, croce, chevron...),
  10 simboli vettoriali astratti (stella, torre, ala, onda, corona geometrica...)
- seed derivato dall'id (stesso club = stesso stemma, sempre)
- output SVG < 2 KB, leggibile a 24px e a 256px
- palette forzata a rispettare un contrasto minimo WCAG tra le parti
- API: crestSvg(club, size) e crestDataUri(club)
- test: 200 club generati, nessuna collisione visiva evidente (hash percettivo)
```
**GP2 — Generatore di maglie SVG** (stessa struttura: 15 pattern, maniche, colletto, numero, versione mini per le liste)
**GP3 — Integrazione facesjs**: mappatura deterministica da (playerId, nazionalità, età, altezza) ai parametri del volto, con invecchiamento nel tempo e cache in memoria.

---

## 13. LIBRERIA DEI PROMPT PER CLAUDE OPUS

**Come si usano:** uno per sessione, nell'ordine. Sostituisci `[...]` dove indicato. Ogni prompt è già scritto con: ruolo, contesto, vincoli, criteri di accettazione, formato di output. Non accorciarli: la lunghezza è il motivo per cui funzionano.

---

### P0 — Bootstrap del progetto (Fase 0)

```
Sei il lead engineer di TALISMAN, un gioco manageriale di calcio in
Electron + React 19 + TypeScript strict, monorepo pnpm.

Obiettivo di questa sessione: creare l'impalcatura del progetto, senza alcuna
logica di gioco.

Consegna:
1. Monorepo pnpm con i package: engine (core puro), data, sim-cli, ui.
   packages/engine NON deve poter importare React/DOM/Electron: aggiungi una
   regola ESLint (no-restricted-imports) che lo impedisca e un test che fallisce
   se qualcuno lo viola.
2. tsconfig strict con noUncheckedIndexedAccess, exactOptionalPropertyTypes,
   noImplicitOverride. Path alias @engine, @data, @ui.
3. Vitest configurato nei package engine e data; un test di esempio.
4. ESLint + Prettier + husky + lint-staged (pre-commit: typecheck + lint + test
   sui file cambiati).
5. GitHub Actions: workflow che esegue typecheck, lint, test su push e PR.
6. Electron 32 + Vite + React: finestra 1440x900, contextIsolation attiva,
   preload con API tipizzata, nessun nodeIntegration nel renderer.
7. Design system minimo: tokens.css con le variabili del §8.2 che ti incollo
   qui sotto, Tailwind v4 collegato ai token, e 6 primitive React tipizzate
   (Button, Panel, Table, Tabs, Badge, StatBar) con una pagina "kitchen sink".
8. i18n: libreria leggera fatta in casa (dizionari JSON + hook useT), lingua
   italiana di default, chiave mancante segnalata in console in dev.
9. PRNG deterministico in engine/src/rng: xoshiro128** con API
   { next(): number; int(min,max): number; gauss(mu,sigma): number; pick<T>(arr): T;
     fork(label: string): Rng } e test statistici (media, varianza, chi-quadro,
   riproducibilità dello stesso seed).
10. CLAUDE.md nella radice con le regole che ti incollo qui sotto.
11. docs/ con 00-vision.md, 01-architecture.md e la cartella adr/ con il
    template ADR e l'ADR 0001 che documenta le scelte di stack.

Vincoli: nessuna dipendenza non necessaria; ogni dipendenza aggiunta va
giustificata in una riga nel README.

Prima di scrivere codice, mostrami il piano dei file che creerai (percorso +
una riga di scopo) e attendi il mio OK.

Criteri di accettazione: `pnpm install && pnpm typecheck && pnpm lint && pnpm test`
verdi; `pnpm dev` apre l'app con la pagina kitchen sink.

[INCOLLA QUI: §8.2 token, §11.1 CLAUDE.md]
```

---

### P1 — Modello dati e schema (Fase 1)

```
Contesto: leggi CLAUDE.md e docs/01-architecture.md.

Obiettivo: definire il modello dati completo del gioco in packages/engine/src/model,
con validazione e serializzazione, senza ancora alcuna simulazione.

Ti incollo la specifica del modello: [INCOLLA §4 INTERO]

Consegna:
1. Tipi TypeScript per: Player, Club, Staff, Competition, Contract, Agent, Nation,
   Stadium, YouthAcademy, Transfer, Fixture, MatchResult, GameDate, WorldState.
   Usa branded types per tutti gli id.
2. Schemi Zod paralleli per la validazione dei dati in ingresso (file JSON) con
   messaggi d'errore utili; funzione parseWorldData(raw) che valida e normalizza.
3. WorldState come struttura normalizzata (Record<Id, Entity>) + indici derivati
   (giocatori per club, per ruolo, per nazione) ricostruibili, non salvati.
4. Separazione stable/volatile come da spec, con commento che spiega il perché.
5. Attributi come Float32Array dietro un accessor tipizzato, per compattezza:
   getAttr(player, 'passing') / setAttr(...) con il Causal Log già agganciato
   (per ora solo interfaccia e implementazione no-op registrabile).
6. Sistema di salvataggio: serializza/deserializza WorldState con msgpack,
   `schemaVersion`, catena di migrazioni (array di funzioni con test) e checksum.
7. Test: round-trip di serializzazione su un mondo generato casualmente
   (property-based con fast-check, 200 casi), invarianti (nessun riferimento
   pendente, nessun giocatore in due club).
8. docs/02-data-model.md generato dal codice, con tabella di tutte le entità.

Criteri di accettazione: test verdi; un WorldState con 5.000 giocatori si
serializza in < 300 ms e occupa < 8 MB.

Mostrami prima il piano e i nomi dei tipi principali; se una scelta del modello
ti sembra sbagliata, dimmelo adesso con l'alternativa.
```

---

### P2 — Pipeline dati e generatore di attributi (Fase 1)

```
Obiettivo: popolare il mondo con dati reali aperti + attributi generati.

Ti incollo la strategia dati: [INCOLLA §5 INTERO]

Consegna in packages/data:
1. Script ETL `pnpm data:fetch` che scarica e normalizza da fonti aperte
   (openfootball su GitHub, Wikidata via SPARQL) leghe, club, città, stadi
   per: Serie A, B, C (3 gironi), e top-20 club di Inghilterra, Spagna,
   Germania, Francia, Portogallo. Cache locale, esecuzione idempotente,
   rispetto dei rate limit, log chiaro di cosa è stato scartato e perché.
2. Normalizzatore nomi (accenti, translitterazioni) e deduplicatore.
3. Generatore di rose: se i dati aperti non hanno la rosa, genera giocatori
   plausibili per nazionalità del club (distribuzione di nazionalità realistica
   per lega), età, ruolo (vincoli: 3 portieri, 8 difensori, 8 centrocampisti,
   6 attaccanti per la prima squadra).
4. Generatore di attributi come da §5.2, con:
   - `roleProfiles.ts`: 25 profili di ruolo, ciascuno vettore di pesi sugli
     attributi, documentato;
   - calibrazione CA per livello di lega (tabella in balance/constants.ts);
   - generazione di personalità, tratti nascosti, PA con curva per età.
5. Generatore di nomi per i giocatori "regen" futuri: liste nome/cognome per
   ~40 nazionalità da fonti aperte, con frequenze.
6. `pnpm data:report` che produce docs/balance/data-report.md con istogrammi
   testuali: distribuzione CA per lega, età media per lega, monte ingaggi per
   club, top 50 giocatori generati. Voglio poterlo leggere e dire "sì, è
   plausibile".

Criteri di accettazione: il report mostra che i 20 migliori giocatori generati
stanno nei club più forti nel 70-85% dei casi; l'età media di Serie A è 26-28;
nessun club ha meno di 18 giocatori.
```

---

### P3 — Tempo, competizioni e il tick del mondo (Fase 2)

```
Obiettivo: far girare il mondo, senza UI e senza il match engine dettagliato.

Consegna in packages/engine:
1. GameDate e calendario: tick giornaliero, coda di eventi programmati
   (priority queue), fasi della stagione (pre-season, regular, finestre
   di mercato, fine stagione, rollover annuale).
2. Motore competizioni generico e configurabile via dati: formato girone
   andata/ritorno, eliminazione diretta, gironi+KO, playoff/playout. Generazione
   calendario (algoritmo del round-robin con vincoli: derby non alla prima,
   squadre della stessa città non in casa nello stesso turno).
3. Regole per competizione: punti, criteri di classifica ordinati e configurabili,
   promozioni/retrocessioni, qualificazioni europee, premi in denaro.
4. Risolutore partita L0: risultato da forze relative con distribuzione di
   Poisson bivariata calibrata, vantaggio casa, varianza. Serve solo per le
   competizioni non dettagliate.
5. Rollover di stagione: invecchiamento, scadenze contratti, promozioni/
   retrocessioni applicate, ritiri, youth intake (stub), reset statistiche,
   archiviazione storica.
6. sim-cli: `pnpm sim -- --seasons 10 --seed 42 --report out.md` che simula e
   produce un report con: albo d'oro, classifiche finali, capocannonieri,
   media gol, distribuzione punti, tempo di esecuzione.

Criteri di accettazione: 10 stagioni in meno di 60 secondi; nessun errore di
calendario (ogni squadra gioca ogni avversario due volte); le classifiche non
sono dominate sempre dalla stessa squadra (campione diverso in almeno 4 delle
10 stagioni).

Attenzione: tutto deterministico dal seed. Nessun Date.now(), nessun Math.random().
```

---

### P4 — Match engine L2 (Fase 3) — la sessione più importante

```
Obiettivo: implementare il motore partita a zone.

Ti incollo la specifica completa: [INCOLLA §6 INTERO]

Consegna in packages/engine/src/match:
1. Rappresentazione del campo a griglia 12x8 con coordinate normalizzate.
2. Stato partita: posizioni dei 22, palla, fatica, cartellini, momentum, statistiche.
3. Il loop di possesso del §6.2, con la funzione di utilità delle opzioni
   separata in un file `decision.ts` documentato riga per riga (è il cuore del
   bilanciamento: voglio poterlo leggere e capire).
4. Softmax con temperatura derivata da Decisioni/Compostezza/pressione.
5. Risoluzione dei duelli: funzione generica contest(a, b, modificatori) → esito,
   usata per contrasti, dribbling, colpi di testa, parate.
6. Modello xG del §6.3.
7. Effetti tattici: modulo, 25 ruoli con tendenze, mentalità, 20 istruzioni di
   squadra, 10 individuali, familiarità tattica. Tutti come modificatori
   espliciti nella funzione di utilità, non come numeri sparsi nel codice.
8. Eventi: gol, occasioni, parate, falli, cartellini, infortuni, sostituzioni,
   fuorigioco, rigori, calci piazzati (modello dedicato per corner e punizioni).
9. Output: MatchResult completo con timeline eventi, statistiche del §6.6,
   rating giocatori (algoritmo documentato), mappe di calore, rete dei passaggi.
10. Costanti di bilanciamento TUTTE in match/balance.ts, con commento sul
    significato e sul range ammesso.
11. Test: partita deterministica dal seed; 10.000 partite simulate in batch con
    verifica dei target statistici del §6.7; test specifici (una squadra molto
    più forte vince nel 65-80% dei casi, non nel 99%).

Criteri di accettazione: `pnpm sim -- --matches 10000 --report` dentro tutti i
target del §6.7 e 10.000 partite in meno di 20 secondi.

Procedi così: prima il piano dettagliato dei moduli e delle firme delle funzioni,
poi implementi un modulo alla volta chiedendomi conferma tra uno e l'altro.
```

---

### P5 — UI core e prima build giocabile (Fase 4)

```
Obiettivo: rendere il gioco giocabile end-to-end (senza 2D, senza mercato).

Consegna in packages/ui:
1. Architettura: store Zustand con lo stato di sessione, engine eseguito in un
   Web Worker (la UI non deve mai bloccarsi), protocollo di messaggi tipizzato,
   selettori memoizzati.
2. Shell dell'app: barra superiore (club, data, denaro, pulsante "Avanza"),
   navigazione laterale, area contenuti, sistema di notifiche/eventi.
3. Schermate: Scrivania, Rosa, Tattica, Calendario, Classifica, Profilo
   giocatore, Risultato partita (testuale con timeline), Salvataggi.
4. Tabella rosa con TanStack Table + virtualizzazione: 40 colonne disponibili,
   viste salvabili, ordinamento multiplo, filtri rapidi, colorazione per valore
   (scala 1-20 con colore accessibile), densità regolabile.
5. Editor tattico: campo drag&drop, assegnazione ruoli, istruzioni di squadra,
   validazione formazione, indicatore di familiarità.
6. Flusso "Avanza": avanzamento giorno con animazione di caricamento, eventi che
   richiedono attenzione che bloccano l'avanzamento, giorno partita che porta
   alla schermata risultato.
7. Scorciatoie da tastiera (barra spaziatrice = avanza, / = ricerca globale).
8. Accessibilità: focus visibile, navigazione da tastiera completa, contrasto AA.

Vincoli: ogni stringa via i18n; nessun colore hardcoded, solo token; nessun
componente sopra le 200 righe (estrai).

Criteri di accettazione: posso iniziare una carriera, schierare, avanzare e
completare una stagione intera senza errori in console, e ogni avanzamento di
giorno risponde in meno di 100 ms.
```

---

### P6 — Allenamento, sviluppo, infortuni (Fase 5)

```
Obiettivo: il sistema che fa crescere e consumare i giocatori.
Ti incollo le specifiche: [INCOLLA §7.1 e §7.2]

Consegna:
1. Modulo training/ con calendario settimanale a 12 slot, categorie, carico.
2. Curva di sviluppo per attributo con tutti i fattori della spec; delta
   settimanali piccoli; funzione pura testabile developPlayer(player, ctx, rng).
3. Curve d'età parametriche in balance/constants.ts (una curva per macro-area).
4. Sistema infortuni: catalogo di 60 tipologie in data/injuries.json (tipo,
   durata min/media/max, gravità, parte del corpo, probabilità di ricaduta,
   contesto di insorgenza), modello di rischio dipendente da carico, fatica,
   età, tendenza infortuni, terreno, minuti recenti.
5. Sistema mentori del §7.1.
6. Ogni variazione di attributo scrive un CausalEvent con causa leggibile.
7. UI: schermata Allenamento, pannello sviluppo nel profilo giocatore con
   grafico di crescita e "perché" (lettura del Causal Log).
8. Test: simula 10 stagioni e verifica che: i giovani ad alto PA crescano nel
   70-90% dei casi, il declino inizi in media tra 29 e 32, gli infortuni per
   squadra per stagione stiano tra 12 e 18, nessun attributo esca da 1-20.

Criteri di accettazione: report `docs/balance/development.md` generato dalla CLI
con le curve medie di crescita per ruolo ed età.
```

---

### P7 — Psicologia e spogliatoio (Fase 5) ⭐ feature distintiva

```
Obiettivo: implementare il grafo sociale e il sistema emotivo, e collegarlo
davvero al campo.

Ti incollo la specifica: [INCOLLA §7.3 INTERO + §4.4]

Consegna:
1. psychology/social-graph.ts: creazione iniziale delle relazioni con i fattori
   della spec, evoluzione settimanale, eventi che modificano gli archi.
2. psychology/morale.ts: morale multi-componente (minuti, risultati, rapporto
   con l'allenatore, contratto, vita personale) + contagio emotivo con la
   formula della spec + Resilienza.
3. psychology/hierarchy.ts: calcolo dell'influenza e del gruppo dirigente,
   con aggiornamento quando cambiano rendimenti e minuti.
4. psychology/promises.ts: tipi di promessa, scadenza, verifica automatica,
   conseguenze, memoria pluriennale (anche lato agenti).
5. psychology/conflict.ts: nascita, escalation e risoluzione delle faide, con
   le opzioni di intervento del manager.
6. **Collegamento al match engine**: le relazioni modificano i pesi della scelta
   di passaggio in decision.ts (due giocatori in faida si passano meno la palla;
   due amici con relazione alta hanno un piccolo bonus di intesa). L'effetto deve
   essere misurabile ma piccolo: massimo ±8% sulla probabilità di scelta.
7. UI: schermata Spogliatoio con grafo interattivo (force-directed su canvas),
   nodi dimensionati per influenza, colorati per morale, archi per relazione;
   pannelli laterali per gerarchia, faide attive, promesse in scadenza.
8. Test A/B da CLI: simula 20 stagioni con il sistema attivo e disattivato e
   produci docs/balance/psychology.md che quantifica l'impatto su punti, gol e
   varianza. Se l'impatto è nullo o caotico, il sistema è sbagliato: dimmelo.

Criteri di accettazione: l'impatto sui punti finali di una squadra con morale
pessimo vs ottimo è tra il 6% e il 15%; nessun ciclo di feedback esplosivo
(morale che va a 0 o 100 per tutti).
```

---

### P8 — Motore narrativo e stampa (Fase 8)

```
Obiettivo: far raccontare al gioco delle storie.
Ti incollo la specifica: [INCOLLA §7.4]

Consegna:
1. narrative/scanner.ts: 40 regole di rilevamento pattern, ognuna in un file
   separato con condizioni dichiarative, priorità, cooldown e dati catturati.
2. narrative/arc.ts: archi con stati, tappe, scadenza, risoluzione, e memoria
   che sopravvive alle stagioni.
3. narrative/text.ts: motore di template a grammatica (slot + varianti pesate +
   flessione italiana corretta: genere, numero, preposizioni articolate). Questo
   punto è delicato: voglio italiano corretto, non traduzioni meccaniche.
4. data/narrative/*.json: i template. Generane 1.500 varianti di alta qualità,
   suddivise per archetipo, evitando ripetizioni riconoscibili.
5. press/: conferenze stampa con domande derivate dagli archi attivi, 4-6
   opzioni di risposta con effetti espliciti su giocatori nominati, registrati
   nel Causal Log.
6. UI: feed della Scrivania con archi in evidenza, schermata "Storie" con gli
   archi attivi e conclusi, notifiche non invasive.

Criteri di accettazione: in una stagione simulata si generano almeno 8 archi
distinti; nessun testo identico ripetuto più di 3 volte in una stagione; un
revisore umano (io) legge 30 testi a campione e nessuno ha errori di italiano.
```

---

### P9 — Mercato, agenti, scouting (Fase 7)

```
Obiettivo: il mercato e l'informazione imperfetta.
Ti incollo le specifiche: [INCOLLA §7.5 e §7.6]

Consegna:
1. transfers/valuation.ts: modello di valore con tutti i fattori della spec.
2. transfers/negotiation.ts: macchina a stati della trattativa, concessioni
   alternate, prezzo di riserva nascosto, pazienza, rottura e riapertura,
   parametri multipli (rate, bonus, %rivendita, contropartite, riscatti).
3. transfers/agents.ts: agenti con personalità, memoria per club, commissioni,
   iniziative (propongono giocatori, chiedono rinnovi, minacciano).
4. transfers/club-ai.ts: pianificatore stagionale del club IA (bisogni per
   ruolo, budget, priorità, finestre), con profilo/filosofia che ne guida i gusti.
5. contracts/: rinnovi, clausole, svincolati, prestiti con condizioni.
6. scouting/: ScoutFog come da spec, crescita della conoscenza, bias per
   osservatore, rapporti generati, assegnazioni, rete di contatti geografica,
   data-scouting con metriche e trappola del campione piccolo.
7. UI: Ricerca giocatori con filtri avanzati, schermata Trattativa multi-parametro,
   schermata Osservatori. Gli attributi non conosciuti si mostrano come intervalli
   sfumati, mai come numeri precisi.
8. Test su 5 stagioni simulate: docs/balance/market.md con inflazione dei prezzi,
   monte ingaggi/fatturato per club, numero di trasferimenti per finestra, età
   media delle rose, club che vanno in bancarotta (deve essere raro ma possibile).

Criteri di accettazione: nessun club IA supera l'85% di monte ingaggi sul
fatturato per più di due stagioni; i migliori giocatori tendono a migrare verso
i club più ricchi ma non nel 100% dei casi; i prezzi non raddoppiano ogni anno.
```

---

### P10 — Partita in 2D e pannello analista (Fase 6)

```
Obiettivo: visualizzare la partita.
Ti incollo la spec della schermata: [INCOLLA §8.4] e del motore: [§6.1]

Consegna:
1. match2d/renderer.ts: canvas 2D, 60 fps, campo con texture tile, 22 giocatori
   come dischi con numero e colori del kit, palla con scia, camera che segue
   l'azione con smoothing.
2. Interpolazione: converti gli eventi discreti di L2 in movimento continuo
   credibile (i giocatori si spostano verso le posizioni attese della fase di
   gioco, non teletrasportati). Documenta l'approccio in docs/03-match-engine.md.
3. Controlli: play/pausa, velocità 1x/2x/4x, salto al prossimo evento, pausa
   tattica con accesso a cambi e istruzioni.
4. Pannello analista con i 4 tab della spec; usa componenti dataviz coerenti con
   il design system e accessibili anche a chi non distingue bene i colori.
5. "Frase dell'analista": sistema a regole che osserva le statistiche live e
   produce 1 osservazione utile ogni 5-10 minuti di gioco, con suggerimento
   tattico concreto. Minimo 60 regole.
6. Performance: nessun calo sotto i 55 fps con 4x attivo su hardware integrato.

Criteri di accettazione: registro una partita intera in GIF e si capisce cosa
succede senza leggere il testo.
```

---

### P11 — Bilanciamento (ricorrente, da usare a ogni fine fase)

```
Obiettivo: sessione di bilanciamento, nessuna feature nuova.

1. Esegui `pnpm sim -- --seasons 25 --seed [N] --report` e analizza il risultato.
2. Confronta ogni metrica con i target in docs/balance/targets.md e segnala
   quelle fuori range in una tabella (metrica, target, valore, scostamento).
3. Per ogni scostamento: individua la costante o la formula responsabile,
   proponi la modifica minima, stima l'effetto, applicala UNA alla volta e
   rilancia la simulazione per verificare.
4. Non introdurre nuove costanti magiche: ogni numero cambiato va documentato
   in balance/constants.ts con il motivo e il valore precedente in commento.
5. Chiudi con docs/balance/AAAA-MM-GG.md: cosa hai cambiato, perché, prima/dopo.

Regola: se una metrica richiede più di 3 iterazioni, fermati e dimmi che il
modello sottostante è probabilmente sbagliato, con la tua ipotesi.
```

---

### P12 — Revisione e debito tecnico (ogni 3 fasi)

```
Obiettivo: nessuna feature. Solo salute del codice.

1. Elenca i 10 file più lunghi e i 10 più complessi (complessità ciclomatica).
2. Individua duplicazioni, tipi troppo permissivi, `any` residui, TODO aperti,
   test mancanti sui percorsi critici, costanti magiche fuori da balance/.
3. Produci docs/tech-debt.md con priorità (impatto × rischio) e stima.
4. Risolvi SOLO le prime 3 voci, ognuna in un commit separato, senza cambiare
   comportamento: i test esistenti devono passare senza modifiche.
5. Verifica che packages/engine sia ancora eseguibile in Node puro e che nessun
   import proibito sia entrato.
```

---

### P13 — Onboarding, rifinitura e release (Fase 9)

```
Obiettivo: rendere il gioco comprensibile a chi non l'ha scritto.

1. Tutorial contestuale: 12 suggerimenti che appaiono la prima volta che si apre
   una schermata, disattivabili, salvati nelle impostazioni.
2. "Prima partita guidata": flusso di 10 minuti che porta il nuovo giocatore
   dalla scelta del club alla prima partita giocata.
3. Schermata di creazione carriera: scelta nazione/lega/club con filtri
   (budget, reputazione, aspettative) e descrizione della sfida.
4. Passaggio finale su tutti i testi UI: coerenza terminologica (un glossario in
   docs/glossario.md), niente anglicismi inutili.
5. Audio: gancio per effetti UI e ambiente stadio con volumi separati.
6. Prestazioni: profila l'avanzamento di un giorno e il caricamento di un save da
   100 MB; ottimizza i 3 colli di bottiglia principali.
7. Build: electron-builder per Windows (NSIS) e Linux (AppImage), auto-update
   disattivato in v1, dimensione finale sotto i 250 MB.
8. Crash reporting locale: log su file, pulsante "esporta diagnostica".
9. README pubblico, LICENSE (codice sotto licenza a mia scelta), assets/LICENSES.md
   verificato, note di rilascio.

Criteri di accettazione: installer che funziona su una macchina pulita, e tre
tester esterni completano una stagione senza chiedermi aiuto.
```

---

## 14. QUALITÀ, TEST E BILANCIAMENTO

### 14.1 Il file `docs/balance/targets.md` (crealo in Fase 2)

Tabella unica con tutti i target numerici del gioco. È il contratto con cui giudichi ogni build.

| Metrica | Target | Perché |
|---|---|---|
| Gol per partita (Serie A) | 2,5 – 2,9 | Realismo |
| Vittorie in casa | 42 – 46% | Realismo |
| Correlazione CA rosa ↔ punti | 0,75 – 0,85 | Merito + imprevedibilità |
| Scudetti diversi in 10 stagioni | ≥ 4 | Il mondo si muove |
| Infortuni per squadra/stagione | 12 – 18 | Realismo |
| xG medio per squadra | 1,2 – 1,5 | Calibrazione motore |
| Trasferimenti per finestra (Serie A) | 90 – 160 | Mercato vivo |
| Monte ingaggi / fatturato | 55 – 80% | Sostenibilità |
| Crescita media giovane PA alto | +25 CA in 5 anni | Sviluppo percepibile |
| Tempo avanzamento giornata | < 400 ms | Fluidità |
| Tempo stagione batch | < 25 s | Iterazione veloce |

### 14.2 Tipi di test richiesti

1. **Unitari** sulle funzioni pure (contest, utilità, valutazione).
2. **Property-based** (fast-check): "nessun attributo esce da 1-20 dopo 1.000 settimane di allenamento", "la serializzazione è sempre reversibile", "nessun club resta con meno di 16 giocatori".
3. **Statistici** su batch (i target sopra), eseguiti in CI settimanale, non a ogni commit (sono lenti).
4. **Golden/snapshot**: una partita con seed fisso produce sempre lo stesso `MatchResult` serializzato. Se cambia, o è un bug o è una modifica di bilanciamento consapevole: in entrambi i casi vuoi saperlo.
5. **Smoke UI** con Playwright: avvia l'app, crea carriera, avanza 30 giorni, nessun errore in console.

### 14.3 Playtest esterno
Dalla F6, 3-5 persone. Chiedi loro tre cose sole: cosa non hai capito, cosa ti ha annoiato, cosa racconteresti a un amico. Le risposte alla terza domanda ti dicono qual è il vero nucleo del gioco su cui investire.

---

## 15. RISCHI E CONTROMISURE

| Rischio | Probabilità | Impatto | Contromisura |
|---|---|---|---|
| **Scope creep** (vuoi 50 leghe subito) | Alta | Fatale | La regola: nessuna lega nuova prima della F9. Lista "dopo la 1.0" in `docs/backlog.md` dove metti tutto senza rimorsi |
| Match engine che non "sente" giusto | Media | Alto | Bilanciamento continuo con sim-cli dalla F3, non alla fine |
| Codice generato che diverge in stili/soluzioni | Alta | Medio | CLAUDE.md + ADR + revisione a fine sessione + P12 ogni 3 fasi |
| Salvataggi rotti dopo un aggiornamento | Media | Alto | schemaVersion + migrazioni + test di round-trip fin dalla F1 |
| Problemi di licenza su dati/asset | Bassa | Alto | Solo fonti aperte, nessun logo reale, `assets/LICENSES.md` |
| Performance che crolla col mondo grande | Media | Medio | Lazy world generation + Web Worker + profiling a ogni fase + budget dichiarati |
| Perdita di motivazione a metà | **Alta** | Fatale | Milestone "carote" (§9.1), devlog pubblico (l'attesa altrui motiva), giocare il proprio gioco ogni settimana |
| Un solo sviluppatore, nessun backup | Media | Fatale | Git + GitHub + push ogni giorno. Non negoziabile |

**Sul rischio più grande (la motivazione):** il momento critico è tra la settimana 7 e la 10, quando lavori sul match engine e non c'è nulla da vedere. Contromisura concreta: **anticipa una versione rozza della schermata Rosa alla settimana 8**, anche brutta, solo per avere qualcosa da guardare.

---

## 16. IL PROSSIMO PROMPT DA DARE A OPUS (inizia da qui, oggi)

Copia-incolla questo in una nuova sessione di Claude Opus, in una cartella vuota. È il **P0** già compilato con i token e le regole; ti serve solo aggiungere i due blocchi indicati.

```
Sei il lead engineer di TALISMAN, un gioco manageriale di calcio (stile Football
Manager) sviluppato da una persona sola con il tuo aiuto. Stack: Electron 32 +
React 19 + TypeScript strict, monorepo pnpm.

Questa è la sessione di bootstrap: NESSUNA logica di gioco, solo fondamenta
solide. Il progetto durerà mesi: ciò che costruisci oggi verrà toccato da
centinaia di sessioni future, quindi privilegia chiarezza, tipi rigorosi e
verificabilità automatica su qualunque scorciatoia.

CONSEGNA
1. Monorepo pnpm: packages/engine (core di simulazione puro), packages/data,
   packages/sim-cli, packages/ui (Electron + React).
2. packages/engine non deve MAI importare React, DOM, Electron o API specifiche
   di Node: imponilo con una regola ESLint no-restricted-imports e con un test
   che fallisce se viene violata.
3. tsconfig strict con noUncheckedIndexedAccess, exactOptionalPropertyTypes,
   noImplicitOverride; path alias @engine @data @ui.
4. Vitest in engine e data; ESLint + Prettier; husky + lint-staged in pre-commit
   (typecheck, lint, test sui file modificati).
5. GitHub Actions: typecheck + lint + test su push e pull request.
6. Electron: finestra 1440x900, contextIsolation attiva, nodeIntegration
   disattivata, preload con API tipizzata.
7. PRNG deterministico in engine/src/rng: xoshiro128** con API
   { next(): number; int(min,max): number; gauss(mu,sigma): number;
     pick<T>(arr: T[]): T; fork(label: string): Rng }
   e test statistici (media, varianza, chi-quadro, riproducibilità del seed).
   Regola permanente del progetto: Math.random() è vietato ovunque.
8. Design system: tokens.css con le variabili che trovi nel blocco TOKEN qui
   sotto, Tailwind v4 collegato ai token, 6 primitive React (Button, Panel,
   Table, Tabs, Badge, StatBar) e una pagina "kitchen sink" che le mostra tutte.
9. i18n fatto in casa: dizionari JSON, hook useT, italiano di default, warning in
   console per le chiavi mancanti in sviluppo.
10. CLAUDE.md nella radice con il blocco REGOLE qui sotto.
11. docs/: 00-vision.md (10 righe, te le detto io dopo), 01-architecture.md con
    un diagramma testuale dei package e delle dipendenze ammesse, adr/ con il
    template e l'ADR 0001 che motiva lo stack.

VINCOLI
- Ogni dipendenza aggiunta va giustificata in una riga nel README.
- Nessun componente React sopra le 200 righe.
- Commenti in italiano, identificatori in inglese.

PROCEDURA
Prima di scrivere codice, mostrami: (a) l'albero dei file che creerai con una
riga di scopo ciascuno, (b) le versioni esatte delle dipendenze principali,
(c) qualunque punto del piano su cui non sei d'accordo, con l'alternativa.
Poi attendi il mio OK.

ACCETTAZIONE
`pnpm install && pnpm typecheck && pnpm lint && pnpm test` verdi, e `pnpm dev`
apre l'app Electron sulla pagina kitchen sink.

--- BLOCCO TOKEN ---
[incolla il §8.2 del piano]

--- BLOCCO REGOLE ---
[incolla il §11.1 del piano]
```

### 16.1 Subito dopo (stesso giorno, se hai tempo)
Chiedi a Opus, in coda alla sessione P0: *"Genera `docs/balance/targets.md` con la tabella dei target del §14.1 e lo script `pnpm sim` come stub che legge quel file"*. Avere i target scritti prima di avere il motore è ciò che manterrà onesto tutto il progetto.

---

## APPENDICE A — Checklist di fine fase (stampala)

- [ ] Tutti i test verdi in CI
- [ ] `pnpm typecheck` pulito, zero `any` nuovi
- [ ] Report di bilanciamento generato e dentro i target
- [ ] Documentazione della fase aggiornata (`docs/04-systems/*.md`)
- [ ] ADR scritti per ogni decisione presa
- [ ] Nessuna costante magica fuori da `balance/constants.ts`
- [ ] Build Electron funzionante
- [ ] Salvataggio della fase precedente ancora caricabile (migrazione testata)
- [ ] Playtest di 60 minuti fatto e annotato
- [ ] Commit pushati, tag `fase-N`
- [ ] 1 GIF/screenshot per il devlog

## APPENDICE B — Backlog post-1.0 (dove metti tutto ciò che ti viene in mente)

Leghe aggiuntive (una alla volta, sono solo dati) · Editor database in-game · Modalità sfida ("salva il club dal fallimento") · Storico pluridecennale con statistiche di carriera · Multi-manager in locale · Modalità "solo direttore sportivo" · Rete di allenatori IA con carriere proprie e reputazione · Meteo e terreno · Arbitri con personalità · Cronaca radiofonica testuale · Import di database della community · Statistiche esportabili in CSV · Tema chiaro · Localizzazione inglese e spagnola.

---

*Fine del piano. Questo documento è vivo: aggiornalo a ogni fine fase, e ogni volta che una decisione cambia, aggiorna prima l'ADR e poi il capitolo corrispondente.*


---
---

# BLOCCO C
# PARTE VIII — LA GRAFICA IN LOCALE (RTX 3060 12 GB)

> Riferimento tecnico per i passi 6-11 e 20-22 del Blocco A.

---

## 0. VERDETTO

La 3060 da 12 GB è **il punto dolce** per questo lavoro. Non è veloce, ma i 12 GB di VRAM contano più della potenza: ti fanno entrare i modelli grandi (FLUX) che su una 4070 da 8 GB vanno in swap. Conclusione operativa:

> **Smetti di usare i servizi online per la generazione.** Installi ComfyUI in locale e generi tutto lì: zero crediti, zero watermark, zero dubbi di licenza, e soprattutto **seed fisso e stile ripetibile** — che per un gioco vale più della qualità del singolo risultato.

I servizi online ti restano utili solo per due cose: **Ideogram** per il logo (il testo dentro le immagini è ancora il suo punto forte) e **Recraft** quando vuoi un output già in SVG.

### Cosa aspettarti come prestazioni (1024×1024, indicativo)

| Modello | Passi | Tempo/immagine | Uso |
|---|---|---|---|
| FLUX.1-schnell (GGUF Q8) | 4 | ~6-10 s | Esplorazione rapida, 50 idee in 10 minuti |
| FLUX.1-dev (GGUF Q6_K/Q8) | 20-25 | ~45-75 s | Sfondi e key art finali |
| SDXL + LoRA di stile | 25-30 | ~8-12 s | Le 40 illustrazioni coerenti degli eventi |
| Upscale 2x (UltraSharp) | — | ~5-8 s | Rifinitura finale |

Tradotto: una notte di generazione batch = 400-600 immagini fra cui scegliere. È esattamente il flusso di lavoro che ti serve.

---

## 1. INSTALLAZIONE (una volta, ~2 ore comprese le scaricate)

### 1.1 Base
1. **ComfyUI** (versione portable per Windows, o `git clone` + venv su Linux).
2. **ComfyUI-Manager** (estensione): da lì installi tutti i custom node con due clic invece che a mano.
3. Dalla scheda Manager installa: `ComfyUI-GGUF` (modelli quantizzati), `ComfyUI_essentials`, `ComfyUI-Impact-Pack`, `ComfyUI-Custom-Scripts` (comodità nella UI), `ComfyUI_IPAdapter_plus` (coerenza di stile), `comfyui_controlnet_aux` (controllo della composizione), `ComfyUI-Crystools` (monitor VRAM).

### 1.2 Modelli da scaricare (~35 GB totali, fai spazio)

| File | Cartella | Note |
|---|---|---|
| `flux1-dev-Q6_K.gguf` (o Q8 se hai spazio) | `models/unet/` | Il tuo modello "finale". Q6_K entra comodo in 12 GB |
| `flux1-schnell-Q4_K_S.gguf` | `models/unet/` | Bozze velocissime |
| `t5xxl_fp8_e4m3fn.safetensors` | `models/clip/` | **Il fp8, non il fp16**: è la differenza fra stare o non stare in VRAM |
| `clip_l.safetensors` | `models/clip/` | |
| `ae.safetensors` (VAE di FLUX) | `models/vae/` | |
| Un checkpoint SDXL "artistico" (es. Juggernaut XL o simile) | `models/checkpoints/` | Per le illustrazioni piatte, molto più veloce di FLUX |
| `4x-UltraSharp.pth` | `models/upscale_models/` | Upscale finale |
| ControlNet SDXL (canny + depth) | `models/controlnet/` | Per imporre la composizione |
| IP-Adapter SDXL + encoder CLIP-ViT-H | `models/ipadapter/`, `models/clip_vision/` | **Il pezzo chiave per la coerenza di stile** |

### 1.3 Impostazioni per non saturare i 12 GB
- Avvia con `--normalvram` (non serve `--lowvram`): la 3060 ce la fa.
- **Batch size sempre 1.** Per generare tante immagini si usa la coda, non il batch.
- Usa il nodo **VAE Decode (Tiled)** quando superi 1536 px: è lì che di solito esplode la memoria.
- Chiudi il browser con 40 schede mentre generi. Non è una battuta: la VRAM condivisa con il desktop è la causa numero uno di "out of memory" su 12 GB.
- Genera a 1024 e fai upscale 2x, invece di generare direttamente a 2048. Più veloce, più stabile, risultato migliore.

---

## 2. I 4 WORKFLOW CHE TI SERVONO (e nient'altro)

Salvali in `assets/comfy-workflows/` e versionali con git: sono parte del progetto.

### W1 — `sfondi.json` (FLUX.1-dev)
Per i 12 sfondi delle schermate. FLUX → 1536×864 (16:9) → upscale 2x → ritaglio.
Parametri: guidance 3.0-3.5, 22 passi, sampler `euler`, scheduler `simple`.

### W2 — `illustrazioni.json` (SDXL + IP-Adapter)
Per le 40 illustrazioni degli eventi. Il trucco della coerenza:
1. Genera **una** illustrazione che ti piace davvero (quella dell'infortunio, ad esempio). Chiamala `style-anchor.png`.
2. In tutti i workflow successivi, passa `style-anchor.png` all'**IP-Adapter** con peso 0.5-0.65.
3. Cambi solo il soggetto nel prompt. Il risultato: 40 immagini che sembrano disegnate dalla stessa persona.

Senza questo passaggio otterrai 40 illustrazioni belle e **stilisticamente scollegate**, che è il modo più sicuro per far sembrare amatoriale un gioco.

### W3 — `composizione.json` (SDXL + ControlNet depth)
Quando ti serve lo spazio vuoto in un punto preciso per metterci la UI: disegni un rettangolo grigio in Paint, lo passi come mappa di profondità, e il modello ci mette lo sfondo attorno.

### W4 — `batch-api.json`
La versione dei workflow sopra esposta via **API di ComfyUI** (`--listen`, endpoint `/prompt`). Serve allo script del capitolo 4.

---

## 3. LA "BIBBIA DI STILE" (il file che rende coerente tutto)

Crea `assets/style-bible.md` e mettici questo. Ogni prompt che scrivi finisce con il blocco `SUFFIX`.

```
PALETTE (obbligatoria)
  fondo scuro   #0B1014 / #18232C
  accento verde #16C784
  accento ambra #F2A33C
  testo chiaro  #E8EEF2

SUFFIX (da accodare a ogni prompt di sfondo/key art)
  "dark teal and midnight blue color grading, single amber accent light,
   cinematic low key lighting, shallow depth of field, subtle film grain,
   no text, no logos, no watermark, no people's faces"

SUFFIX (da accodare a ogni prompt di illustrazione evento)
  "flat vector illustration, thick geometric shapes, no outlines,
   limited palette of dark teal, muted green and amber, generous negative
   space, centered composition, editorial sports magazine style, no text"

NEGATIVE PROMPT (solo per SDXL; FLUX non lo usa)
  "text, watermark, signature, logo, brand, jersey sponsor, blurry, jpeg
   artifacts, extra limbs, deformed hands, oversaturated, neon, cartoon 3d"

SEED: annota il seed di ogni immagine tenuta in assets/LICENSES.md.
```

**Regola operativa:** quando trovi una combinazione (modello + seed + suffix) che funziona, **congelala**. Non cercare di migliorarla per la prossima immagine: la coerenza vale più della qualità marginale.

---

## 4. PROMPT PER OPUS — pipeline di generazione e post-produzione

Da dare in una sessione dedicata, dopo la P0 del piano principale.

```
Contesto: progetto TALISMAN (gioco manageriale di calcio, Electron + React + TS,
monorepo pnpm). Leggi CLAUDE.md. Questa sessione NON tocca il gioco: costruisce
la pipeline degli asset grafici.

Ambiente: genero le immagini in locale con ComfyUI su una RTX 3060 12 GB.
ComfyUI espone la sua API su http://127.0.0.1:8188.

Obiettivo: un tool da riga di comando in packages/assets-cli che (1) genera in
batch le immagini interrogando ComfyUI, (2) le post-produce e le ottimizza per
il gioco, (3) tiene il registro delle licenze.

CONSEGNA

1. packages/assets-cli, TypeScript, eseguibile con `pnpm assets <comando>`.
   Nessuna dipendenza pesante: undici o fetch nativo, sharp per le immagini.

2. Formato sorgente: assets/jobs/*.yaml. Ogni job descrive un lotto:
     id, workflow (nome del file in assets/comfy-workflows/), output (cartella),
     variants (quante per prompt), seedBase, size, items[] dove ogni item ha
     { name, prompt, negativePrompt?, styleRef?, overrides? }.
   Il suffisso di stile NON va ripetuto in ogni item: si definisce una volta a
   livello di job (campo styleSuffix) e il tool lo accoda.

3. Comando `pnpm assets generate <job.yaml>`:
   - carica il workflow ComfyUI (JSON in formato API), sostituisce i nodi di
     prompt/seed/dimensione tramite una mappa di binding dichiarata nel job
     (campo nodeBindings: { positive: "6.inputs.text", seed: "25.inputs.noise_seed", ... })
     così non si dipende dalla struttura interna del workflow;
   - accoda le richieste una alla volta (mai in parallelo: la VRAM è una sola),
     mostra una barra di avanzamento con tempo stimato;
   - fa polling su /history finché l'immagine è pronta, la scarica;
   - seed deterministico: seed = hash(seedBase + item.name + indiceVariante),
     così rigenerare lo stesso job dà gli stessi risultati;
   - resiste alle interruzioni: se il job si ferma, ripartendo salta ciò che
     esiste già (a meno di --force);
   - gestisce gli errori di ComfyUI (out of memory, nodo mancante) con un
     messaggio chiaro su cosa fare, non con uno stack trace.

4. Comando `pnpm assets process <cartella>`:
   - ritaglia alle proporzioni richieste con attenzione al soggetto (smartcrop);
   - applica una **correzione di palette** verso i token del gioco: converte in
     LAB, sposta i colori dominanti verso la palette definita in
     assets/style-bible.json, con intensità regolabile 0-1 (default 0.35),
     preservando luminanza e dettaglio. Voglio che due sfondi generati in giorni
     diversi sembrino appartenere allo stesso gioco;
   - applica una vignettatura e una sfumatura verso il fondo nel terzo inferiore
     (per la leggibilità del testo sopra), opzionale per job;
   - genera le varianti: @1x e @2x, WebP qualità 82 + PNG di riserva;
   - per le illustrazioni piatte, genera anche la versione a 256px per le liste;
   - scrive accanto a ogni file un .meta.json con: prompt completo, seed,
     modello, workflow, data, licenza, hash percettivo.

5. Comando `pnpm assets contact-sheet <cartella>`: costruisce un provino a
   contatto (griglia di miniature numerate, PNG unico) per farmi scegliere
   rapidamente quali tenere. Poi `pnpm assets keep <cartella> 3,7,12` sposta le
   scelte in assets/approved/ e archivia le altre.

6. Comando `pnpm assets manifest`: genera assets/manifest.ts tipizzato
   (mappa nome → percorso + dimensioni) da importare nella UI, così un asset
   mancante diventa un errore di compilazione e non un'immagine rotta a runtime.

7. Comando `pnpm assets licenses`: aggiorna assets/LICENSES.md leggendo tutti i
   .meta.json, in tabella markdown ordinata per cartella.

8. Comando `pnpm assets check`: verifica che ogni asset referenziato nel manifest
   esista, che nessun file superi i limiti di peso (sfondo 400 KB, illustrazione
   80 KB, icona 8 KB) e che nessuna immagine abbia metadati EXIF residui.

VINCOLI
- Tutto deve funzionare anche con ComfyUI spento, per i comandi che non generano.
- Nessun percorso assoluto nel codice: configurazione in assets/config.json.
- Log leggibili: voglio capire cosa sta facendo senza leggere il sorgente.

PROCEDURA
Prima il piano: struttura dei file, schema YAML di esempio compilato con un job
reale ("sfondi delle schermate", 12 immagini), e le firme dei comandi. Attendi il
mio OK prima di implementare.

ACCETTAZIONE
Con ComfyUI in esecuzione, `pnpm assets generate assets/jobs/sfondi.yaml` produce
36 immagini (12 prompt x 3 varianti), `pnpm assets contact-sheet` me le mostra in
un'unica griglia, e dopo `keep` + `process` ho i WebP ottimizzati, il manifest
tipizzato e il file delle licenze aggiornato.
```

---

## 5. ORDINE DI LAVORO CONSIGLIATO (il tuo primo pomeriggio di grafica)

1. Installa ComfyUI + Manager + i modelli (§1). **2 ore, la maggior parte è attesa dei download.**
2. Genera 20 varianti di **un solo** sfondo (la Scrivania) con FLUX.1-dev. Scegline uno. Quello diventa il riferimento visivo del gioco.
3. Genera **una** illustrazione piatta di evento e salvala come `style-anchor.png`.
4. Riempi `assets/style-bible.md` con i parametri che hanno funzionato (modello, seed, guidance, suffix).
5. Solo adesso dai a Opus il prompt del §4 e costruisci la pipeline.
6. Prima notte di batch: lanci i 12 sfondi × 3 varianti e le 40 illustrazioni × 3, vai a dormire, la mattina scegli dal provino a contatto.

**Errore da evitare:** costruire la pipeline prima di aver trovato lo stile. La pipeline automatizza una decisione estetica — se la decisione non c'è ancora, automatizzi il caos.

---

## 6. DOVE I SERVIZI ONLINE RESTANO MIGLIORI

| Lavoro | Strumento | Perché non in locale |
|---|---|---|
| Logo e wordmark | **Ideogram** | Il testo dentro l'immagine: i modelli locali lo sbagliano ancora |
| Icone e forme vettoriali | **Recraft** | Esporta SVG nativo, niente vettorializzazione a posteriori |
| Musica del menu | **Suno / Udio** free tier | Nessuna alternativa locale altrettanto semplice |
| Effetti sonori | **Freesound / Pixabay** (CC0) | Non è generazione, è una libreria: gratis e sicura |

Per tutto il resto — sfondi, illustrazioni, texture, key art promozionale, materiale per il devlog — la tua 3060 basta e avanza.
