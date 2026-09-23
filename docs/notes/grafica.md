# Grafica: cosa è fatto e cosa tocca a Marco (GUIDA Parte IV e Blocco C)

## Fatto (22/09/2026)

| GUIDA | Cosa | Dove |
|---|---|---|
| GP1 | **Stemmi**: 8 scudi × 12 partizioni × 10 simboli = 960 forme, tutte diverse fino a 960 club; contrasto WCAG fra campo e simbolo; anno di fondazione sopra i 96 px; filetto doppio per i club nati prima del 1920 | `src/ui/procgen/crest.ts` |
| GP2 | **Maglie**: 15 disegni × 3 colletti × 2 maniche; seconda maglia; in partita l'ospite cambia maglia se si confonde (anche nel campo 2D) | `src/ui/procgen/kit.ts`, scheda club, Scrivania |
| GP3 | **Volti** con facesjs: aspetto secondo la nazionalità, rughe e capelli grigi con l'età, spalle con l'altezza, maglia del club | `src/ui/procgen/face.ts`, scheda giocatore, storie |
| Passo 20, Blocco C §4 | **Pipeline degli asset**: `pnpm assets` (generate, contact-sheet, keep, process, manifest, licenses, check) | `tools/assets/`, `assets/` |

La pipeline è provata contro un finto ComfyUI (`tools/assets/assets.test.ts`): generazione con seed ripetibili, ripresa
dopo un'interruzione, provino, scelta, correzione di palette in LAB, vignettatura, WebP @1x/@2x + PNG, miniatura da
256 px, hash percettivo, manifest tipizzato, registro licenze, controllo di pesi ed EXIF, errori spiegati (ComfyUI
spento, memoria video finita, workflow mancante).

Il gioco usa già le immagini appena esistono: sfondo di ogni schermata (`sfondi/<schermata>`, sotto un velo scuro) e
illustrazione della storia in prima pagina del giornale (`illustrazioni/<tipo di storia>`). Senza immagini non cambia
niente.

## La produzione, fatta il 22-23/09/2026

ComfyUI (0.37.0 portable NVIDIA) è installato in `D:\AI\ComfyUI_windows_portable`, i modelli in `D:\AI\models`
(`extra_model_paths.yaml` li collega, così un aggiornamento del programma non li tocca). `run_nvidia_gpu.bat` apre già
la porta 8188 per `pnpm assets`. Generati con **FLUX.1-dev Q6_K** su RTX 3060: 36 sfondi, 120 illustrazioni, 6 texture;
tenute 12 + 40 + 2, il resto è in `assets/archive/`. Parametri congelati in `assets/style-bible.json`.

**Lezione:** FLUX disegna «football» come pallone da football americano. Nei prompt va scritto
«round soccer ball with black and white hexagonal panels» (otto soggetti sono stati rifatti per questo).

Nel repository vanno solo i file pronti (`public/art`, ~10 MB): le immagini grandi si rifanno identiche, perché i seed
stanno nei job e nei `.meta.json`.

## Restava a Marco (ora fatto da Claude, salvo il gusto)

1. **Installa ComfyUI** e i modelli (Blocco C §1). Avvialo con `--listen 127.0.0.1 --port 8188`.
2. **Trova lo stile prima di automatizzare** (Blocco C §5): 20 varianti dello sfondo della Scrivania, scegline uno;
   una illustrazione di prova diventa `assets/style-anchor.png`. Annota modello, seed e guidance in
   `assets/style-bible.json` (campo `frozen`).
3. **Esporta i tuoi workflow** in formato API in `assets/comfy-workflows/` e aggiorna `workflow:` e `nodeBindings` nei
   job (`assets/jobs/*.yaml`). Il `base-sdxl.json` che c'è già funziona subito con SDXL base.
4. **La notte di produzione** (Passo 21):
   ```
   pnpm assets generate assets/jobs/sfondi.yaml
   pnpm assets generate assets/jobs/illustrazioni.yaml
   pnpm assets generate assets/jobs/texture.yaml
   ```
   Si possono interrompere e rilanciare: saltano quello che è già fatto.
5. **La mattina**, per ogni cartella (`sfondi`, `illustrazioni`, `texture`):
   ```
   pnpm assets contact-sheet sfondi      # apri assets/raw/sfondi/_provino.png
   pnpm assets keep sfondi 2,4,9,...     # i numeri che ti piacciono, uno per schermata
   pnpm assets all sfondi                # post-produzione, manifest, licenze, controlli
   ```
6. **Logo** (Passo 22): fatto con Stitch (proposte 1 e 2). **Audio**: il gioco sintetizza già i suoi suoni; i file
   CC0 da Freesound/Pixabay restano facoltativi — se li scarichi, annotali in `assets/LICENSES.md`.

I nomi degli sfondi sono quelli delle schermate (`desk`, `squad`, `tactics`, `training`, `dressing`, `youth`, `market`,
`scouts`, `finance`, `board`, `stories`, `fixtures`); quelli delle illustrazioni sono i 40 tipi di storia.
