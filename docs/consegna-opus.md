# Consegna a Claude Opus — tutto quello che è stato fatto, nei dettagli

**A cosa serve questo file.** È il pacchetto di contesto da dare a Claude Opus all'inizio della sessione in cui si
pianifica il **prossimo aggiornamento** (la 0.3.0). Contiene lo stato del codice con le responsabilità di ogni file, i
numeri di taratura, le regole che non si possono rompere, gli errori già commessi e le decisioni già prese con il loro
perché. È pensato per essere letto *da solo*: se Opus ha questo file non gli serve leggere tutto il repository per
proporre un piano sensato — ma prima di scrivere codice dovrà comunque aprire i file che tocca.

- **Progetto**: Tactic F.C. Manager (TFM 27, nome in codice Talisman) — manageriale di calcio, gratuito, open source.
- **Versione pubblicata**: 0.2.0 «la partita» · **formato salvataggi**: 28 · **data di questo documento**: 26/09/2026.
- **Codice**: <https://github.com/XmarcoS10/talisman> (GPL-3.0) · **Sito**: <https://xmarcos10.github.io/talisman/>
- **Stato**: 253 test verdi in 37 file, `tsc --noEmit` pulito, CI verde, ~21.300 righe fra `src/`, `tools/` ed
  `electron/` (di cui ~16.000 di gioco vero), 1.805 stringhe per lingua.
- **Documenti gemelli**: `docs/stato-del-gioco.md` (la stessa cosa con le foto, scritta per Marco), `CLAUDE.md` (regole
  operative, sempre in contesto), `GUIDA.md` (la specifica originale: Blocco B = specifiche, §13 = prompt per fase).

---

## 0. Come è organizzato il lavoro (il metodo, non cambiarlo)

**Marco non programma.** Decide, collauda, gioca, sceglie fra opzioni. Il codice lo scrive Claude, una fase per volta.
Da questo discendono tre abitudini da rispettare in ogni sessione:

1. **Ogni scelta di gioco si presenta come un menù di 2-3 opzioni, con il costo e una raccomandazione**, mai come una
   domanda aperta. Nei commit storici si vede: «Blocco 4, scelta 3A», «Blocco 5, scelta A di Marco».
2. **Un commit = un intervento verificabile.** Il messaggio è in italiano e descrive l'effetto che si vede giocando,
   non il refactor. Se un intervento viene fermato perché peggiora i numeri, si committa lo stesso con la parola
   «fermo» e la patch resta documentata: in `docs/design/motore-v2.md` §6 c'è un cimitero di tentativi con i dati.
3. **Regola delle 3 iterazioni**: se un obiettivo di bilanciamento non rientra nel target dopo tre tarature, ci si
   ferma, si scrive perché nel report e si mette la voce nel backlog. È già successo due volte (distacco Serie A–B,
   gol delle nazionali).

**Definizione di «fatto»**: test verdi + typecheck pulito + report di `pnpm sim` dentro i target di
`docs/balance/targets.md`. Nient'altro conta come finito.

---

## 1. Le regole non negoziabili

Sono in `CLAUDE.md` e quasi tutte sono verificate da test, non dalla buona volontà.

| # | Regola | Chi la fa rispettare |
|---|---|---|
| 1 | TypeScript strict, nessun `any` (solo nelle migrazioni, con commento), `as` solo se giustificato in commento | `pnpm typecheck` + revisione |
| 2 | Il motore (`src/engine/`) non importa React, DOM, Electron né `node:*` | `src/engine/engine.test.ts` |
| 3 | Nel motore niente `Math.random` e niente date reali: solo `Rng` (xoshiro128\*\*) e `season` + `day` | convenzione + golden master |
| 4 | Tutte le costanti di taratura in `src/engine/balance.ts` | revisione + `style.test.ts` |
| 5 | I valori derivati (valore di mercato, classifica, età, forza di una nazionale) si calcolano, non si salvano | revisione |
| 6 | Ogni cambio del formato del mondo: `SCHEMA_VERSION++` e una migrazione nuova in `save.ts`; mai modificare una migrazione già pubblicata | revisione |
| 7 | Nessuna funzione del motore partita oltre 80 righe o 20 punti di decisione | `src/engine/match/structure.test.ts` |
| 8 | Le partite non cambiano senza volerlo | `src/engine/match/golden.test.ts` (1.000 partite a semi fissi) |
| 9 | Dei giocatori non dell'utente non si mostra mai un valore vero: si passa da `scouting/fog.ts` | `fog.test.ts` + revisione |
| 10 | Le stringhe stanno in `it.json` e `en.json` con le stesse chiavi e gli stessi segnaposto | `src/ui/i18n.test.ts` |
| 11 | I colori solo dai token di `tokens.css`; componenti React sotto le 200 righe | revisione |
| 12 | Commenti in italiano, identificatori in inglese | revisione |

**La conseguenza pratica delle regole 3 e 5**: *stesso seme = stesso mondo, stessa partita, stesso campionato*. È
quello che rende misurabile il bilanciamento, riproducibili le immagini generate e possibile il golden master.
Rompere il determinismo è il modo più veloce di fare danni invisibili in questo progetto (§13, lezione 1).

---

## 2. Comandi

```
pnpm dev                    # gioco nel browser (Vite)
pnpm app                    # build + Electron
pnpm test                   # 253 test (vitest), ~4 minuti
pnpm typecheck              # tsc --noEmit
pnpm build                  # bundle di produzione
pnpm dist:win               # installer NSIS in release/  (fermare prima pnpm dev)
pnpm dist:linux             # AppImage, solo su Linux
pnpm sim -- --seasons 10 --seed 42      # report di bilanciamento su 10 stagioni
pnpm sim -- --matches 3000              # partite isolate (16 blocchi in parallelo)
pnpm sim -- --match-stats 4000          # statistiche per partita, target del Blocco 2b
pnpm sim -- --career 25 --seed 42       # carriere lunghe: inflazione, distacco A-B, bancarotte
pnpm sim -- --dev 10                    # curve di sviluppo
pnpm sim -- --psych 20                  # A/B della psicologia (~5 min)
pnpm sim -- --market 5                  # report del mercato
pnpm bench                              # ms a partita del motore su un thread (guardia della CI)
pnpm assets                             # pipeline grafica ComfyUI
GOLDEN=update pnpm vitest run golden    # aggiorna il golden master (solo apposta, motivo nel commit)
pnpm build && npx electron tools/live-check.cjs     # partita 2D nell'app vera: fps, foto (THROTTLE=4)
pnpm build && npx electron tools/worker-check.cjs   # prova del motore nel Web Worker
node tools/docs-world.ts && pnpm build && npx electron tools/shots-docs.cjs   # le 18 foto della documentazione
```

Ambiente: **pnpm 12**, **Node 24**, Windows 11. `pnpm sim -- --x` passa il `--` così com'è: il parser lo tiene in conto.

---

## 3. La storia, fase per fase

155 commit. Le fasi seguono la roadmap della GUIDA §9; dopo la F10 il lavoro è organizzato in «Blocchi».

| Fase | Contenuto |
|---|---|
| **F0-F2** | Bootstrap, modello dati, mondo popolato, tempo che gira |
| **F3** | Motore partita L2 a zone (la fase difficile): griglia 12×8, xT, xG, softmax |
| **F4** | Prima build davvero giocabile: tattica, ruoli, salvataggi versionati |
| **F5** | Le persone: allenamento, sviluppo, infortuni, morale, grafo sociale, promesse, Causal Log |
| **F6** | Partita in 2D (F6.1 leggibilità, F6.2 movimento continuo) |
| **F7** | Mercato: valore, trattativa, agenti, IA di mercato, contratti, scouting e nebbia, 3 schermate |
| **F8** | Finanze, dirigenza, motore narrativo, conferenze stampa, vivaio e nazionali (prima versione) |
| **Debito 1-3** | Salvataggi su file in Electron, funzioni condivise in `util.ts`, costanti in `balance.ts` |
| **F9** | Rifinitura: suggerimenti, prima partita guidata, glossario, audio, diagnostica, prestazioni, GPL-3.0, installer |
| **F10** | 13 schermate rifatte sui disegni Stitch + Coppa nazionale, amichevoli estive, filosofia dell'allenatore |
| **Grafica** | GP1 stemmi, GP2 maglie, GP3 volti (procedurali); pipeline asset ComfyUI; 162 immagini generate, 54 tenute |
| **Blocco 1** | Economia ritarata (valori ×0,25, stipendi concavi), stelle relative al campionato, offerte dell'IA per i tuoi giocatori |
| **Blocco 2a** | Motore in moduli con stato esplicito, golden master, benchmark, motore nel Web Worker, 10.000 partite in 6,5 s |
| **Blocco 2b** | 10 interventi sul realismo: dribbling, cross e duelli aerei, portiere, piazzati, transizioni, istruzioni individuali e piani partita, ritarature |
| **Blocco 3** | Partita 2D rifatta: tre visioni, tre telecamere, leggibilità, momenti animati, replay, sovrapposizioni, racconto, tabellino, folla, 60 fps |
| **Blocco 4** | «Il mondo invecchia bene»: carriere da 25 stagioni, inflazione del talento fermata, Serie C di contorno, playoff e playout, bancarotte |
| **Blocco 5** | Inglese: interfaccia (`en.json`), storie e conferenze scritte nella lingua di chi legge (schema 27) |
| **Blocco 6** | Uscita: versione 0.2.0, note di rilascio IT/EN, sito bilingue con clip della partita, storyboard del trailer, pagina itch.io |
| **Ultimo** | Nazionali giocate col motore vero (schema 28), pannello nel Vivaio, documenti aggiornati |

---

## 4. Mappa del codice, file per file

### `src/engine/` — il motore puro

**Nucleo**

| File | Righe | Responsabilità |
|---|---|---|
| `model.ts` | 535 | Tutte le entità. `Record<id, entità>`, riferimenti per id, mai oggetti annidati |
| `balance.ts` | 688 | Ogni costante di taratura, in sezioni: `BALANCE FLAGS DEV STYLE PLAYOFF CUP TRAIN PSYCH MATCH SQUAD_TEMPLATE ADJACENT MARKET DEAL AGENT CLUB_AI OFFERS CONTRACT SCOUT FIN BOARD PRESS YOUTH NATIONAL` |
| `world.ts` | 496 | Generazione, calendario, `passDays`, `advance`, `endSeason`, classifiche, promozioni |
| `save.ts` | 186 | `SCHEMA_VERSION = 28` e la catena di 27 migrazioni |
| `rng.ts` | — | `Rng` xoshiro128\*\*: `next`, `int`, `pick`, `shuffle`, `gauss`; stato serializzabile in `world.rng` |
| `util.ts` | — | `clamp`, `len` e le altre funzioni prima copiate file per file |
| `names.ts` | — | Nomi inventati (club, città, persone, nazioni). Nessun nome reale nel repository |
| `players.ts` | 128 | Generazione dei giocatori, CA per ruolo, `recomputeCA` |
| `development.ts` | — | Crescita settimanale attributo per attributo, declino, mentori |
| `training.ts` | — | Le 12 sedute settimanali, carico, condizione, familiarità col modulo, infortuni |
| `injuries.ts` | — | Catalogo infortuni, durata, ricadute, rischio personale |
| `morale.ts` | 179 | Morale multi-componente, contagio, promesse, esclusioni |
| `social.ts` | 156 | Grafo sociale, gerarchia, liti, faide (`weekSocial`: 36 punti di decisione, il massimo del motore) |
| `news.ts` | — | Notizie e Causal Log come chiave i18n + variabili (il motore non conosce le lingue) |
| `cup.ts` | — | Coppa nazionale, teste di serie dagli ottavi, rigori, premi |
| `playoffs.ts` | — | Playoff e playout della Serie B |
| `friendlies.ts` | — | Tre amichevoli estive dell'utente, col motore vero ma senza conseguenze |

**Motore partita** (`src/engine/match/`, ingresso `src/engine/match.ts`)

| File | Responsabilità |
|---|---|
| `match.ts` (186) | `playMatch`, `runMatch`, formazioni, disponibilità, applicazione al mondo. Esporta anche `teamSetup` e `aiMentality`, che usano le nazionali |
| `match/engine.ts` (150) | Il ciclo: una `step()` = un'azione del portatore |
| `match/state.ts` (260) | Stato esplicito: tutto quello che il motore ricorda fra un'azione e l'altra |
| `match/positioning.ts` (271) | Posizioni dei 22, corsa a velocità limitata, marcature, blocco che sale |
| `match/pressure.ts` | Pressione sul portatore dai difensori entro `pressRadius` |
| `match/decision.ts` (214) | Opzioni (passaggio, profondità, dribbling, tiro, cross), utilità, softmax. **Ciclo più caldo: niente allocazioni nei loop, niente `Math.hypot` (usa `len`)** |
| `match/execute.ts` (170) | Esecuzione dell'opzione scelta e conseguenze |
| `match/events.ts` | Falli, cartellini, infortuni, stanchezza |
| `match/aerial.ts` | Cross alto o basso, uscita del portiere, duello aereo, respinta, seconda palla |
| `match/keeper.ts` | Parata per tipo di tiro, presa o respinta, uscita, rinvio |
| `match/setpieces.ts` | Corner (primo palo, secondo, corto), punizioni, rigori |
| `match/subs.ts` | Cambi e mentalità che segue il punteggio |
| `match/ratings.ts` | Voti, possesso come quota dei passaggi (misura Opta), chiusura |
| `match/roles.ts` | 27 ruoli, ognuno un vettore di tendenze |
| `match/tactics.ts` | 5 moduli, posizione base di ogni slot sulla griglia |
| `match/plans.ts` | Fino a 3 piani partita condizionali |
| `match/pitch.ts` | Geometria, xT (`0,0006·e^(0,45x)`), modello xG |
| `match/trace.ts` | Registro per il 2D: un fotogramma per azione più i «momenti» (`beats`) |

**Sistemi**

| Cartella | File e contenuto |
|---|---|
| `transfers/` | `valuation.ts` (valore e stipendio, derivati) · `negotiation.ts` (trattativa a concessioni alternate) · `agents.ts` (personalità, memoria per club) · `club-ai.ts` (piano di mercato del club IA, `sellWillingness` col richiamo del club grande) · `contracts.ts` (rinnovi, clausole, svincolati, prestiti) · `market.ts` (la finestra che mette tutto insieme) · `offers.ts` (offerte dell'IA per i giocatori dell'utente, **con un `Rng` proprio**) |
| `scouting/` | `fog.ts` (informazione imperfetta: banda di incertezza deterministica, metà dell'errore è sistematico dell'osservatore) · `scouts.ts` (incarichi, crescita della conoscenza, rapporti) |
| `finance/` | `ledger.ts` (conto per cassa: biglietti, tv, sponsor, stipendi, fair play) · `administration.ts` (bancarotta e commissariamento) |
| `board/` | `board.ts` (quattro barre della fiducia, contratto negoziato, capitale politico, esonero) |
| `narrative/` | `scanner.ts` (valuta le regole ogni settimana) · `facts.ts` (i fatti calcolati una volta sola) · `arc.ts` (archi) · `rules/club.ts` (storie 1-20) · `rules/player.ts` (storie 21-40) · `text.ts` (template tipo tracery) · `italian.ts` / `english.ts` (grammatica) · `say.ts` (frase scritta al momento della lettura, schema 27) |
| `press/` | `press.ts` (fino a 3 domande dalle storie aperte, effetti dichiarati prima della scelta) |
| `youth/` | `intake.ts` (annata del vivaio) · `primavera.ts` (campionato derivato, non salvato) |
| `nations/` | `squad.ts` (convocazioni, forza, `playIntl` di Poisson rimasto solo per la Primavera) · `match.ts` (partite col motore vero; la nazionale è un `Club` costruito al momento con id negativo) · `nations.ts` (pause, tornei estivi, Europeo e Mondiale) |

### `src/ui/` — React 19

| File | Responsabilità |
|---|---|
| `App.tsx` (199) | Il crocevia: navigazione, modali, avanzamento, partita dal vivo, avvisi. **55 punti di decisione: è la voce 2 del debito tecnico** |
| `engine-client.ts`, `engine.worker.ts`, `engine-ops.ts` | Il motore in un Web Worker: il mondo va e torna come **testo serializzato** e si sostituisce (`setWorld`); le partite tornano come chiavi. Senza worker, `handle` gira sul posto |
| `i18n.ts`, `it.json`, `en.json` | 1.805 chiavi per lingua, `t('chiave', {var})` |
| `storage.ts`, `settings.ts`, `diag.ts` | 5 slot di salvataggio, impostazioni del giocatore, registro degli errori |
| `art.ts`, `assets-manifest.ts` | Le immagini generate. **Il manifest è generato da `pnpm assets manifest`: non si tocca a mano** |
| `procgen/` | `crest.ts` (8 scudi × 12 partizioni × 10 simboli), `kit.ts` (15 disegni × 3 colletti × 2 maniche), `face.ts` (facesjs), `color.ts` (contrasto WCAG) |
| `match/` | `playback.ts` (interpolazione), `renderer.ts` (canvas, nessuna libreria), `moments.ts`, `fx.ts`, `overlays.ts`, `highlights.ts`, `commentary.ts`, `analyst.ts`, `sheet.ts` |
| `screens/` | 46 componenti. I più grossi: `Live.tsx`, `Tables.tsx`, `PlayerView.tsx`, `Market.tsx`, `Squad.tsx`, `Fixtures.tsx` |
| `app.css`, `tokens.css` | Componenti comuni della F10: `kpis/kpi`, `seg-tabs`, `chips`, `tag`, `meter`, `mini-card`, `section-h`. Attenzione ai nomi già usati (`.slot` è della tattica, `.timeline` non esiste più) |

### `src/sim-cli/`, `tools/`, `electron/`

- `sim-cli/sim.ts` è il laboratorio; `career.ts`, `market.ts`, `people.ts`, `stories.ts`, `match-stats.ts` sono i
  report; `matches-worker.ts` e `match-stats-worker.ts` girano in thread separati (16 blocchi in parallelo).
- `tools/diag-*.ts`: diagnosi usa-e-getta ma conservate (correlazione, appiattimento, economia, moduli, possesso, partita).
- `tools/assets/`: la pipeline grafica. `tools/*.cjs`: le prove nell'app vera (live, worker, clip, foto).
- `electron/main.cjs` + `preload.cjs`: finestra, salvataggi in `%APPDATA%/talisman/saves`, log in `%APPDATA%/talisman/logs`.

---

## 5. Il modello dati

Tutto normalizzato in `Record<id, entità>`; i riferimenti sono id, mai oggetti annidati. Questo formato **è anche il
formato del database della community**: un domani l'utente carica nomi e stemmi veri, noi non li distribuiamo.

### `WorldState` (i campi, uno per uno)

```
schemaVersion, seed, rng                     stato del generatore: il mondo è riproducibile
season (2026 = 2026/27), day                 nessuna data reale, mai
manager { name, clubId, kept, broken,        promesse mantenute/rotte e testa a testa: memoria pluriennale
          board, h2h, style }
players, clubs, agents, scouts               le entità
known                                        la nebbia: solo ciò che l'utente ha scoperto
competitions, history                        campionati e albo d'oro
news, causal, promises                       notizie, Causal Log, promesse attive
talks, offers                                trattative aperte dall'utente, offerte ricevute
arcs, press                                  storie aperte, conferenza della settimana
nations, intl                                nazionali e archivio delle loro partite (ultime 60)
cup, playoffs, rules, friendlies             coppa, spareggi, regole della carriera, amichevoli
cupWinners, intake                           albo della coppa, ultime annate del vivaio
nextArcId, nextPlayerId, nextAgentId, nextScoutId
```

### `Player`

45 attributi in quattro gruppi (13 tecnici, 17 mentali, 6 fisici, 9 da portiere: un giocatore di movimento ne usa 36),
`ca` 1-200 (cache ricalcolata da `attrs` con `recomputeCA`), `pa` potenziale, sei assi di personalità (**ambizione,
professionalità, lealtà, temperamento, socievolezza, tolleranza alla pressione**), attributi nascosti (`injuryProneness`,
mai mostrati), `psych` (morale, fiducia, attesa di minuti, voglia di andarsene), `rel` (grafo sociale, solo gli archi
non neutri, simmetrico), `mentorId`, `agentId`, `intl` (presenze, gol, titoli), `condition` (forma fisica, condizione
partita, affaticamento, infortunio, ricaduta), disciplina, `form` (ultimi 5 voti), contratto, statistiche, storico,
`caLog` (CA ogni 4 giornate, per il grafico).

### `Club`

Nome, città, tre colori, stemma caricato o `null` (allora è procedurale), fondazione, reputazione 1-100, filosofia,
stadio, cassa, `books` (conto economico per stagione), `debts`/`credits` (rate), `sanction` (fair play), `crisis`
(bancarotta), rosa, tattica, `lineup` (solo l'utente), `training` (12 sedute), `familiarity` per modulo, fuori rosa,
osservatori, `youth` (strutture e reclutamento 1-20), faide.

### Le entità che non si salvano

Valore di mercato, stipendio richiesto, classifica, età, forza di una nazionale, squadra nazionale, campionato
Primavera, stelle di abilità. Si ricalcolano sempre. **Aggiungerne una di salvata è un errore di progetto.**

---

## 6. Salvataggi: le 27 migrazioni

`SCHEMA_VERSION = 28`. `MIGRATIONS[n]` porta dalla versione n+1 alla n+2. **Una migrazione pubblicata non si tocca
più.** Un salvataggio della prima versione si apre ancora oggi; prima del caricamento c'è un controllo di integrità
che verifica che ogni riferimento punti a qualcosa che esiste.

| Da → a | Fase | Cosa aggiunge |
|---|---|---|
| 1→2 | F3 | condizione, disciplina, forma, statistiche estese, tattica di club |
| 2→3 | F4 | ruoli per slot, notizie |
| 3→4 | F5 | allenamento, condizione estesa, psicologia, grafo sociale, promesse, Causal Log |
| 4→5 | F7 | un agente per giocatore |
| 5→6 | F7 | filosofia del club |
| 6→7 | F7 | clausole, percentuale di rivendita, prestiti, parametro zero |
| 7→8 | F7 | osservatori e nebbia |
| 8→9 | F7 | le trattative aperte si salvano |
| 9→10 | F8 | conto economico, rate, fair play |
| 10→11 | F8 | quattro barre della fiducia e contratto con la società |
| 11→12 | F8 | archi narrativi |
| 12→13 | F8 | conferenza della settimana |
| 13→14 | F8 | strutture del vivaio, carriera in nazionale |
| 14→15 | F10 | cassa mese per mese |
| 15→16 | F10 | posti nello staff osservatori |
| 16→17 | F10 | filosofia dell'allenatore |
| 17→18 | F10 | Coppa nazionale |
| 18→19 | F10 | amichevoli estive |
| 19→20 | — | offerte dell'IA per i giocatori dell'utente |
| 20→21 | 0.2.0 | tipo di ogni risposta in conferenza; conferenza lasciata a metà |
| 21→22 | 0.2.0 | battitori dei piazzati |
| 22→23 | 0.2.0 | istruzione «dopo la palla persa» |
| 23→24 | 0.2.0 | istruzioni individuali e piani partita |
| 24→25 | 0.2.0 | Serie C, playoff e playout |
| 25→26 | 0.2.0 | bancarotte |
| 26→27 | 0.2.0 | storie salvate come `{key, seed, v}` (lingua di chi legge) |
| 27→28 | ultimo | `world.intl = []`: archivio delle partite delle nazionali |

---

## 7. Il mondo e il tempo

**Generazione** (`newWorld`): 3 campionati da 20 club (Serie A, Serie B, Serie C di contorno), **1.500 giocatori**,
~130 agenti (127 sul seme 42), 192 osservatori, 12 nazionalità (il 62% dei giocatori è italiano). Qualità della rosa dalla reputazione: `CA medio = 48 + reputazione × 1,08`, dispersione 13.
Età attorno a 26 (sigma 4,5); sotto i 22 anni si pagano 6 punti di abilità per anno mancante; dai 33 comincia qualche
ritiro. Serie B generata con reputazione 36-60 (era 30-58: correzione del Blocco 4).

**Una stagione**: 38 giornate ogni 7 giorni, 4 pause per le nazionali (giorni 56, 98, 168, 224), finestra di mercato
invernale ai giorni 133-147 (2-16 gennaio; il parametro zero si firma dal 2 gennaio), finestra estiva nel cambio di
stagione.

**`passDays`** — per ogni giorno, in ordine: pause delle nazionali se le attraversa, mercato di gennaio se entra nella
finestra; poi, per ogni settimana intera e per ogni club: `trainWeek` (allenamento, condizione, infortuni, sviluppo),
`weekPsych` (grafo, morale, contagio), stipendi, fiducia della dirigenza, lavoro degli osservatori, scanner delle
storie, domande della stampa, mosse degli agenti. Poi le partite del giorno (campionato **e** coppa: si prendono con
`fixturesOn`, mai solo dai campionati), classifiche e statistiche, e ogni 4 giornate un punto nel `caLog`.

**`endSeason`**: promozioni e retrocessioni (3 e 3), playoff e playout della B, albo d'oro, ritiri, rientri dai
prestiti, rinnovi dell'IA, annata del vivaio, torneo estivo negli anni pari, taglio degli ingaggi di chi sfora,
mercato estivo, svincolati, prestiti dei giovani, nuovo calendario, amichevoli.

**Coppa nazionale**: eliminazione diretta fra tutti i 40 club, gara secca, rigori, turni infrasettimanali; le 8 più
blasonate entrano agli ottavi (altrimenti la stagione schiaccia le grandi). Premi: 3 milioni alla vincitrice, metà alla
finalista. Le gare di coppa non entrano nelle statistiche di campionato ma stancano e fanno male.

---

## 8. I sistemi, con i numeri

### 8.1 Allenamento, condizione, infortuni, crescita

Tre numeri diversi, per cose diverse:
- **Forma fisica** 0-100: si recupera 12 al giorno; il carico ne consuma 4 per unità.
- **Condizione partita**: +30 per 90 minuti, −8 a settimana senza giocare, +3 per partitella; parte da 60 a inizio
  stagione. Sotto 100 costa precisione in campo.
- **Affaticamento stagionale**: +3,5 per 90 minuti, −2,2 a settimana (di più col riposo). Alto = più infortuni.

**Infortuni**: in allenamento 0,0024 a settimana al carico di riferimento (5,5), e cresce con la **terza potenza** del
carico. In partita: 2,5% dei falli (poi ritarato a 0,019) e 0,6% per giocatore a partita senza contatto, moltiplicato
per il rischio personale. Chi rientra resta esposto a una ricaduta per metà della durata, fino a 28 giorni.

**Crescita**: ogni settimana ogni attributo può fare ±1. Probabilità base 0,26% per ogni 10 punti di distanza dal
potenziale, moltiplicata da carico, ruolo (attributi chiave ×1,5, generali ×1,2, altri ×0,6), professionalità ed età.
Curve per macro-area: fisico fino a 20 e cala dai 30; tecnica fino a 21, cala dai 32; testa fino a 22, cala dai 34.
Un **mentore** over 27 accanto a un under 21 gli passa 1,2% a settimana per attributo mentale, e un po' di carattere.

### 8.2 Le persone (il pilastro del progetto)

**Morale 1-100** verso un bersaglio calcolato da: risultati contro le attese (ultime 5), minutaggio rispetto all'attesa
(pesata con l'ambizione), forma personale, fiducia nell'allenatore, esclusione, faide. Scende più in fretta (0,25) di
quanto salga (0,12); la Resilienza cambia la velocità.

**Grafo sociale**: nazionalità comune +25, lingua +12, età vicina +6, socievolezza, rivalità di ruolo −12, un po' di
rumore. Deriva nel tempo. 5% a settimana che scoppi una lite in un club; sotto −60 nasce una **faida**, e se coinvolge
un leader (influenza 45+) pesa su tutto lo spogliatoio. Il morale **contagia**: 2% a settimana lungo i legami.

**Promesse**: spazio da titolare (6 partite) o minuti (3), finestra di 8 settimane. Mantenuta dà fiducia, rotta la
toglie — e l'agente se ne ricorda al tavolo.

**Causal Log**: ogni cosa che tocca un giocatore dell'utente lascia una riga leggibile nella sua scheda.

**In campo** tutto questo diventa numeri piccoli e onesti: morale 0,002 di logit per punto sopra o sotto 60, condizione
partita 0,003 per punto sotto 100, familiarità col modulo fino a 0,15, e fra due amici il passaggio arriva l'8% più
spesso che fra due che non si parlano. Con `FLAGS.psychology = false` niente di tutto questo entra in campo: serve per
l'A/B (`pnpm sim -- --psych 20`).

### 8.3 Il motore partita

Campo: griglia **12 × 8 continua** (una zona ≈ 8,75 × 8,5 m). Ogni squadra ragiona nel proprio sistema: x = 0 la
propria porta, x = 12 quella avversaria. Una partita è una sequenza di **azioni del portatore**; a ogni azione:

1. **Posizioni**: ideale = modulo + palla + ruolo, e ci si *corre* a velocità limitata (Velocità, Accelerazione,
   energia). Chi attacca sale a blocco, chi difende accorcia e marca a uomo nella propria metà campo.
2. **Pressione** dai difensori entro 1,4 zone (Sacrificio, energia, istruzione di pressing).
3. **Opzioni**: passaggio a ogni compagno, palla in profondità, dribbling, tiro, cross. Ognuna ha una probabilità `p`
   (sigmoide di un logit documentato) e utilità `u = p·(xT dopo + K) − (1−p)·(valore regalato + K)`, con K = valore del
   possesso in sé.
4. **Scelta**: softmax con temperatura. Decisioni alte → quasi sempre l'opzione migliore; pressione e poca Compostezza
   → più errori.
5. **Esecuzione**: intercetti, contrasti, falli, fuorigioco, tiri, cambi, infortuni, stanchezza, momentum.

Dopo l'ora di gioco chi è avanti abbassa la mentalità e chi è sotto la alza.

**Perché le posizioni non sono teletrasportate**: con posizioni ricalcolate da zero attaccare in massa non costava
nulla e la mentalità 5 dominava. Con il movimento a velocità limitata chi perde palla sbilanciato deve rientrare:
nascono contropiedi, e la palla in profondità punisce le linee alte.

**Registro per il 2D**: con il registro acceso (partita seguita dal vivo) il motore emette anche `run.track`, il campo
ogni 0,25 s, e i «momenti» di ogni azione (intercetto, contrasto, uomo saltato, fallo, cartellini, fuorigioco,
piazzati, colpo di testa, respinta, seconda palla, parata, uscita, gol). Le posizioni di fine intervallo sono quelle
del motore: i passi intermedi non spostano il bilanciamento e il sim-cli non li calcola.

**La partita guardata** si gioca nel thread dell'interfaccia (~0,07 ms ad azione) e si simula solo quanto serve a stare
davanti alla riproduzione, così cambi e istruzioni decisi in panchina contano davvero.

### 8.4 Tattica

5 moduli (4-3-3, 4-4-2, 4-2-3-1, 3-5-2, 5-3-2), 27 ruoli, mentalità 1-5, 5 istruzioni a 3 livelli (pressing, ritmo,
ampiezza, linea, verticalità), istruzioni individuali, transizioni, battitori dei piazzati, fino a 3 piani partita
condizionali annunciati dal vice.

Ogni ruolo è un vettore di tendenze: `follow, push, maxX, baseX, dy, runs, hold`, voglia di tirare/crossare/dribblare,
verticalità, pressing, colpo di testa, `drain`. **Lezione di bilanciamento**: «restare alti senza palla» (hold > 1) è
un vantaggio nel modello, non un costo, quindi i ruoli offensivi lo pagano con la fatica.

**Familiarità col modulo** 0-100: +1,5 a seduta tattica (scalata dall'Adattabilità media), −0,5 a settimana per i
moduli che non usi; il modulo iniziale parte da 80, gli altri da 40. Un modulo del tutto sconosciuto costa 0,15 di
logit a ogni azione.

### 8.5 Mercato

**Valore** (derivato): abilità, potenziale non espresso (sotto i 24), età (picco 24-29, −15% l'anno dopo i 30),
contratto residuo (in scadenza vale il 45%), ruolo (punta ×1,2, portiere ×0,75), lega, reputazione del club, forma.

**Trattativa** a concessioni alternate: il venditore ha un **prezzo di riserva mai visibile**, parte dal +45% sul
valore e scende poco per volta; la pazienza si consuma e un rilancio irrisorio la brucia. Sul tavolo: contanti, rate
(−7% l'anno di dilazione), bonus presenze e gol (valgono il 45%), percentuale sulla rivendita, contropartite, prestito
con diritto o obbligo. Servono **due sì**: club e giocatore.

**Agenti** (~130 nel mondo): personalità, commissione, memoria per club.

**Contratti**: 5 anni sotto i 24, 4 nel picco, 2 sopra i 31. Un quarto ha una clausola (2,2 × valore). Accetta al 92%
di quello che chiede, meno fino al 20% per lealtà; sotto 40 di morale non rinnova. Parametro zero da gennaio, e chi
arriva gratis chiede il 15% in più.

**IA dei club**: un piano per finestra — buchi della rosa, 45% della cassa spendibile, 70% del fatturato di monte
ingaggi, fino a 5 acquisti. `sellWillingness` ha il **richiamo del club grande**: un club molto più blasonato strappa
il giocatore anche a chi non venderebbe (è la correzione che ha riportato la correlazione forza-punti a 0,81).

**Offerte per i tuoi giocatori**: l'IA non compra mai di nascosto da te. Manda un'offerta con cifra, stipendio e
scadenza (10 giorni): accetti, rifiuti o fai una controproposta. Se il giocatore sognava quel club (12 punti di
reputazione in più, e lui ambizioso), dirgli di no costa 12 di morale e 10 di fiducia, e finisce nel Causal Log.
**Le offerte hanno un `Rng` proprio**: non spostano il caso del mondo (§13, lezione 1).

### 8.6 Scouting e nebbia

**Regola di ferro (§7.6): dei giocatori non tuoi non si vede mai un numero vero.** Stime con banda, deterministiche
(riaprire la scheda non migliora la conoscenza). Gratis si arriva al massimo a 62 di conoscenza su 100; a zero la banda
è ±22 sull'abilità e ±40 sul potenziale, e **metà dell'errore è sistematico dell'osservatore** (uno che sopravvaluta i
fisici lo farà sempre). 4 posti nello staff (uno in più si chiede alla dirigenza, fino a 8). Un osservatore guadagna
2,2 punti a settimana su chi segue (fino a 6); un analista cresce più piano ma su venti insieme. Rapporto a 45 di
conoscenza, poi ogni 25. Da 55 in su si capisce la personalità.

### 8.7 Finanze e dirigenza

Conto **per cassa**: niente ammortamenti, le rate sono rate. Entrate: biglietti (24 € a spettatore in A, riempimento
base 62%), diritti tv a fine stagione (48 milioni al primo in A, 7 in B, 4 in C, il 55% all'ultima), sponsor e
merchandising proporzionali al **quadrato** della reputazione, premi. Uscite: stipendi settimanali, staff 12% del
fatturato, stadio 10%, acquisti e rate.

**Fair play progressivo**: monte ingaggi oltre il 72% del fatturato o cassa sotto il −35% → richiamo, poi blocco del
mercato, poi −4 punti. **Bancarotta**: stagioni consecutive sotto soglia → avvisi → commissariamento con penalità.

**Dirigenza**: quattro barre (dirigenza, tifosi, stampa, squadra) che seguono lo scarto fra posizione reale e attesa
(2,2 · 1,8 · 1,5 punti per posizione) e il morale; si muovono del 25% a settimana verso il bersaglio. L'obiettivo è un
**contratto**: fino a 3 stagioni di transizione, ognuna costa 6 di fiducia, accettare un obiettivo più alto ne
restituisce 3 per posizione. Capitale politico 50 + 20 a stagione: budget 25, strutture del vivaio 35, permesso di
vendere 15, posto in più fra gli osservatori 20. Sotto 18 di fiducia a fine stagione: **esonerato**; sotto 32: avviso.

### 8.8 Storie e stampa

**40 archetipi** (20 club, 20 giocatori) che nascono dai fatti, ognuno con quando nasce, come avanza, quanto vive e
ogni quanto può tornare. Testi da **template a grammatica** (niente modelli linguistici a runtime: costo zero,
offline), con articoli e preposizioni corretti — «della Vignarola», non «del Vignarola». Dal Blocco 5 la frase si
scrive **al momento della lettura** (`{key, seed, v}` salvato), così la stessa carriera si legge in italiano o in
inglese.

**Conferenze**: fino a 3 domande dalle storie aperte più recenti che ti riguardano, mai a caso. Ogni risposta dichiara
gli effetti prima della scelta: difendere +6 di morale, elogiare +5, pungolare +4 se regge la pressione ma −8 se no
(soglia 13 di Tolleranza); le risposte sul gruppo muovono ±2/4; ogni risposta sposta di 4 una barra; «no comment»
costa 3 alla stampa.

### 8.9 Vivaio e nazionali

**Vivaio**: ogni estate 3 ragazzi più uno ogni 7 punti di reclutamento, 15-16 anni. Potenziale medio
`70 + 2,2 × strutture + 0,35 × reputazione` (≈138 in un grande club, ≈98 in uno piccolo), con l'1,2% di **colpo di
fortuna** (potenziale 172-192 anche nel club più piccolo). **Primavera**: campionato derivato da un seme fisso, non
salvato.

**Nazionali (§7.8, l'ultima cosa fatta)**:
- `nations/squad.ts`: `callUp` prende i 23 migliori per CA fra chi ha una squadra e sta bene; `strength` è la media
  dei migliori 11 (derivata, non salvata).
- `nations/match.ts`: `nationalTeam` costruisce un `Club` al volo con **id negativo** (`-(indice+1)`), colori e
  reputazione = forza; sceglie il modulo migliore per i convocati e lo conosce al 75% (`NATIONAL.familiarity`).
  `playNational` gioca con `simulate` usando `teamSetup` e `aiMentality` esportati da `match.ts`, quindi la più debole
  si chiude davvero. I rigori usano `NATIONAL.penaltyScale = 200` (la forza conta poco).
- `applyIntl` aggiorna presenze, gol, condizione, fatica, morale e infortuni, e **non tocca mai `p.stats`**: le partite
  delle nazionali non entrano nelle statistiche di campionato. Restano in `world.intl` (le ultime 60).
- Pause: 2 partite per finestra, accoppiamenti per fascia (le nazionali di forza simile fra loro), la fascia scorre di
  uno alla seconda giornata.
- Estate: **Europeo** negli anni divisibili per 4, **Mondiale** due anni dopo. Gironi da quattro, poi eliminazione
  diretta, rigori. Presenze e titoli alzano il valore (fino al 15% e 5%).
- UI: `src/ui/screens/IntlMatches.tsx`, dentro la schermata Vivaio. I tuoi marcatori sono link, gli altri testo grigio.
- `playIntl` (Poisson) è rimasto **solo per la Primavera**.

---

## 9. Interfaccia

46 schermate/componenti, organizzate in una barra laterale a gruppi. Le principali: Avvio e nuova carriera in due passi
(club a schede con filtri, poi dossier e filosofia dell'allenatore), Scrivania, Rosa, Tattica, Allenamento, Spogliatoio,
Scheda giocatore (sei schede, radar a otto assi, Causal Log), Classifiche (viste casa/trasferta/forma/xG), Calendario
(con Coppa, amichevoli e report sull'avversario, esportazione iCal), Mercato (filtri, ordinamenti, pagine, CSV),
Trattativa, Osservatori, Finanze, Dirigenza, Vivaio (con le nazionali), Storie e stampa, Partita dal vivo, Report
partita, Impostazioni e salvataggi.

**Filosofia dell'allenatore** (`STYLE`): gestore (+4 al morale di tutti), tattico (moduli imparati il 30% più in
fretta), scopritore di talenti (under 21 che crescono il 15% di più).

**Stelle** relative al campionato dell'utente: 5 stelle = il 3% più forte.

**Impostazioni**: 12 suggerimenti contestuali, guida della prima partita in 5 passi, valuta, formato data, schermo
intero, pausa sulle notizie importanti, salvataggio automatico, volumi separati (interfaccia, folla, effetti), silenzio
fuori fuoco, esportazione della diagnostica. **Il gioco non si collega a internet.**

---

## 10. Grafica

**Procedurale e deterministica** (niente immagini da distribuire):
- **Stemmi** (GP1): 8 scudi × 12 partizioni × 10 simboli = 960 combinazioni, da una **biiezione sull'id**
  (`(((id * 77 + 101) % CREST_KINDS) + CREST_KINDS) % CREST_KINDS`, con l'ordine simbolo/partizione/scudo: il
  moltiplicatore 577 usato prima faceva passi da 6 e usava solo 5 simboli su 10). Contrasto WCAG garantito, anno di
  fondazione sopra i 96 px, filetto doppio per i club nati prima del 1920.
- **Maglie** (GP2): 15 disegni × 3 colletti × 2 maniche, prima e seconda; in partita l'ospite cambia se i colori si
  confondono.
- **Volti** (GP3): `facesjs` (Apache-2.0) da id, nazionalità, età, altezza. In browser si rende con `display()` in un
  div fuori schermo ma *attaccato* al documento, perché `faceToSvgString` usa il `global` di Node e serve `getBBox`.

**Generata con l'IA in locale** (ComfyUI + FLUX.1-dev su RTX 3060): 162 immagini prodotte, **54 tenute** — 12 sfondi,
40 illustrazioni (una per tipo di storia), 2 texture. La pipeline `pnpm assets` (`tools/assets/`): seed deterministici
FNV-1a, provino numerato, spostamento dei colori verso la palette in spazio OKLab/CIELAB tenendo la luminanza, ritaglio
sul soggetto, WebP @1x/@2x + PNG, manifest tipizzato per la UI, registro delle licenze, controlli su peso ed EXIF.
Comandi: `generate`, `contact-sheet`, `keep`, `process`, `manifest`, `licenses`, `check`.

Nel repository stanno **solo le immagini lavorate** (`public/art`, ~10 MB): i 41 MB di originali approvati sono
ignorati da git perché i seed li rendono riproducibili.

---

## 11. Qualità: test, bilanciamento, prestazioni

### 11.1 I 253 test in 37 file

| File | Cosa protegge |
|---|---|
| `engine/engine.test.ts` | Il motore non importa React/DOM/Electron/`node:*`; determinismo del mondo |
| `match/golden.test.ts` | **Golden master**: 1.000 partite a semi fissi (risultati, statistiche, eventi, voti) e 30 guardate dal vivo (registro e traccia densa identici alle simulate) |
| `match/structure.test.ts` | Nessuna funzione del motore oltre 80 righe o 20 punti di decisione |
| `match/sense.test.ts` | Buon senso tattico: 5 test su 500 partite appaiate, differenza netta con t di Welch > 3 |
| `match/plans.test.ts`, `setpieces.test.ts` | Piani partita e piazzati |
| `transfers/*.test.ts` (6) | Valore, trattativa, agenti, contratti, mercato, offerte, trattative dell'utente |
| `scouting/fog.test.ts` | Nessun valore vero sui giocatori altrui; stime deterministiche |
| `finance/*.test.ts` | Conto economico, fair play, bancarotte |
| `board/board.test.ts` | Fiducia, contratto, esonero |
| `narrative/*.test.ts` (3) | Grammatica italiana, grammatica inglese, scanner |
| `press/press.test.ts` | Domande dalle storie, effetti dichiarati |
| `youth/*.test.ts` | Vivaio, Primavera, nazionali (marcatori = gol, gol internazionali contati, presenze di campionato immutate, determinismo di `world.intl`) |
| `cup.test.ts`, `playoffs.test.ts`, `style.test.ts` | Coppa, spareggi, filosofia dell'allenatore |
| `ui/i18n.test.ts` | `it.json` e `en.json` hanno le stesse chiavi e gli stessi segnaposto; le chiavi si scrivono per intero nel codice |
| `ui/match/*.test.ts` (4) | Riproduzione, sovrapposizioni, salienti, tabellino |
| `ui/procgen/*.test.ts` (3) | Stemmi, maglie, volti: deterministici e tutti diversi |
| `ui/stars.test.ts`, `ui/engine-ops.test.ts` | Stelle relative, operazioni del worker |
| `tools/assets/assets.test.ts` | Pipeline provata contro un finto ComfyUI, **indipendente dal workflow** (trova il primo `seed` numerico, riconosce la riga della licenza con una regex) |

La suite completa impiega **~4 minuti** perché parecchi test giocano stagioni intere (voce 3 del debito tecnico).

### 11.2 Bilanciamento (`pnpm sim -- --seasons 10 --seed 42`, 26/09/2026)

| Metrica | Target | Valore |
|---|---|---|
| Gol per partita | 2,5 – 2,9 | **2,51** ✅ |
| Vittorie in casa | 42 – 46% | 42,8% ✅ |
| Pareggi | 22 – 30% | 23,8% ✅ |
| Tiri per squadra | 10 – 15 | 13,2 ✅ |
| Correlazione forza ↔ punti | 0,75 – 0,85 | 0,87 sul seme 42 ⚠️, 0,80 e 0,82 sui semi 7 e 99 (il seme sposta ±0,03) |
| Campioni diversi in 10 stagioni | ≥ 4 | 5 ✅ |
| Infortuni per squadra/stagione | 12 – 18 | 13,7 ✅ |
| Gol per partita delle nazionali | ~2,9 | **3,9** ⚠️ |
| 10.000 partite simulate | < 20 s | 6,5 s ✅ |
| Motore su un thread (`pnpm bench`) | ≤ 4,2 ms | 3,85 ms ✅ |
| Avanzamento di un giorno (UI) | < 400 ms | ~150 ms ✅ |

**Carriere da 25 stagioni** (tre semi): correlazione media 0,79 / 0,77 / 0,80 ✅; i 60 migliori crescono di 1,3-2 punti
in 25 stagioni (prima si gonfiavano di 13); 1,6-2 bancarotte ogni 10 stagioni ✅; i conti dei club restano fra 50 e 60
milioni invece di salire a 400. **Fuori bersaglio**: il distacco Serie A–B oscilla nelle prime 5-10 stagioni (scarto
massimo 8,4-11 contro un target di ≤ 5), poi si assesta attorno a 23,5-24 punti di forza.

**Statistiche per partita** (Blocco 2b, `--match-stats`): i target sono in `docs/balance/targets.md` con le fonti
(Serie A 2024-25, Opta sulla Premier). Restano sotto target: possesso poco legato alla qualità (la nettamente più forte
fa ~51% invece di 57-63%), gol in contropiede, equilibrio dei moduli (4-3-3 1,44 punti a partita contro 1,18 del
4-2-3-1).

**Prestazioni**: un salvataggio da 100 MB si legge in 0,5 s e si scrive in 0,7 s; la giornata gira nel worker, quindi
l'interfaccia non si blocca mai.

---

## 12. Distribuzione

Installer Windows NSIS (123 MB, nella cartella utente, senza permessi di amministratore, aggiornamento automatico
spento); AppImage configurato ma da costruire su Linux. Sito bilingue su GitHub Pages (`.github/workflows/pages.yml`),
CI su ogni modifica (`ci.yml`: typecheck + test su Linux, più `pnpm bench` come guardia), moduli per le segnalazioni,
note di rilascio IT/EN, `docs/itch.md`, `docs/trailer.md`, `docs/collaudo.md`, licenze in `assets/LICENSES.md`.

**Privacy del repository**: le email dei commit sono state riscritte all'indirizzo noreply di GitHub prima di rendere
il repository pubblico. Esiste un ramo locale `backup-prima-di-pubblicare` che **non va mai pushato**.

---

## 13. Lezioni già pagate (leggere prima di toccare il motore)

1. **Il caso è una risorsa condivisa.** Aggiungendo le offerte dell'IA la correlazione forza-punti è scesa da 0,81 a
   0,72. Non era un problema di bilanciamento: era **deriva del flusso di numeri casuali** — una chiamata in più a
   `rng.next()` cambia tutto il resto del mondo. Soluzione: chi aggiunge un sistema che pesca a caso durante la
   stagione gli dà un `Rng` **proprio**, derivato da valori stabili:
   `new Rng(world.seed + p.id * 7919 + buyer.id * 104729 + world.day)`.
2. **Misurare prima di credere.** Quando la correlazione è cambiata dopo le nazionali col motore, la spiegazione era il
   rumore del seme: rimisurando il codice *precedente* sugli stessi tre semi si vedeva la stessa dispersione. Prima di
   dare la colpa a un intervento, rimisura la base.
3. **Un modulo sconosciuto rompe il campo.** Le nazionali facevano 4,23 gol a partita perché la squadra costruita al
   volo aveva familiarità 0 con il proprio modulo. `NATIONAL.familiarity = 75` + `aiMentality` per le nazionali hanno
   portato a 3,88 (3,21 fra pari forza).
4. **Un intervento che peggiora i numeri si committa lo stesso, con la parola «fermo»** e la patch in
   `docs/design/motore-v2.md` §6. Nel Blocco 2b è successo 6 volte: quel cimitero è il documento più utile del repo.
5. **Le biiezioni procedurali vanno verificate sulla varietà**, non solo sull'unicità: il moltiplicatore 577 sugli
   stemmi produceva stemmi tutti diversi ma con solo 5 simboli su 10.
6. **Test che dipendono dal workflow si rompono**: la prova della pipeline assumeva che il nodo `3` contenesse il seed
   e il nome del modello SDXL. Ora cerca il primo `seed` numerico e usa una regex sulla riga della licenza.
7. **Non committare con un test rosso.** È successo una volta (prova della pipeline) ed è stato corretto nel commit
   immediatamente successivo, ma la CI resta l'unico giudice.
8. **La familiarità e il morale sono leve piccole**: 0,15 e 0,002 di logit. Chi propone leve grandi sta per rompere il
   bilanciamento.

---

## 14. Debito tecnico aperto

| # | Voce | Impatto | Rischio | Priorità | Stima |
|---|---|---|---|---|---|
| 1 | **Nessun test sull'interfaccia.** Il motore è coperto, le schermate no: un errore in una schermata lo trova solo chi gioca. Basterebbero pochi test di montaggio sulle cinque più usate | 3 | 3 | **9** | 5 h |
| 2 | **`App.tsx` è il crocevia di tutto** (55 punti di decisione): navigazione, modali, giornata, partita dal vivo, avvisi. Si spezza in un router e due o tre contenitori senza cambiare comportamento | 2 | 3 | 6 | 3 h |
| 3 | **Test lenti**: la suite completa impiega ~4 minuti perché molti test giocano stagioni intere. Si può marcare la parte lenta e lasciarla alla CI | 2 | 2 | 4 | 2 h |
| 4 | **`balance.ts` a 688 righe**: resta leggibile (sezioni commentate), ma conviene spezzarlo per sistema quando lo si toccherà di nuovo | 1 | 2 | 2 | 2 h |
| 5 | **`world.ts` fa da direttore d'orchestra** (496 righe): ogni sistema nuovo aggiunge una riga lì | 2 | 1 | 2 | 3 h |

Le funzioni con più punti di decisione sono oggi **tutte componenti React** (`App` 55, `Live` 46, `Tables` 46,
`PlayerView` 43, `Market` 38), dove i rami sono soprattutto JSX. Nel motore la peggiore è `weekSocial` (36).

**Pulito**: nessun `any` fuori dalle migrazioni, nessun TODO aperto, nessuna costante di taratura fuori da `balance.ts`.

---

## 15. Limiti noti del gioco

1. **Partite delle nazionali non seguibili dal vivo**: si giocano col motore vero e se ne vedono risultati e marcatori,
   ma il campo 2D è legato al club dell'utente.
2. **Gol delle nazionali 3,9 contro i 2,5 dei club**: nel mondo generato il 62% dei giocatori è italiano, quindi
   l'Italia schiera un undici da ~145 di CA medio e il Senegal da ~100. **Non è il motore, è la generazione del mondo**:
   si sistema dando più peso alle altre nazioni in `newWorld`.
3. **Distacco Serie A – Serie B** che oscilla nelle prime 5-10 stagioni prima di assestarsi.
4. **Possesso poco legato alla qualità** e **moduli non equilibrati** (4-3-3 favorito): materiale pronto in
   `docs/design/motore-v2.md` §7 e §9.
5. **Installer non firmato**: Windows mostra «editore sconosciuto» (serve un certificato a pagamento).
6. **Nessun test sull'interfaccia**.

---

## 16. Cosa tocca a Marco (non è codice)

1. **Collaudo esterno**: tre persone, una stagione intera, senza chiedere aiuto (`docs/collaudo.md`). È il criterio di
   «fatto» della fase 9 e l'unica cosa che dice davvero cosa non si capisce.
2. **Pagina itch.io** (testi pronti IT/EN in `docs/itch.md`) e **annuncio**.
3. **Video**: storyboard da 60 secondi in `docs/trailer.md`, clip già pronte.
4. **Firma dell'installer**: certificato a pagamento.
5. **Versione Linux**: `pnpm dist:linux` su un computer Linux.

---

## 17. Tre strade per il prossimo aggiornamento

Sono proposte, non decisioni: la scelta è di Marco. Si possono mescolare.

### A — «Un mondo più largo» (contenuti, ~2 settimane)

Coppe europee semplificate fra club, **altre nazioni con vivai propri** (che sistema anche il limite 2 qui sopra),
editor del mondo nel gioco (rinominare club e giocatori, cambiare colori e stemmi), import di un database della
community. **Perché**: allunga la vita di una carriera e apre la porta a chi vuole i nomi veri.
**Attenzione**: tocca `newWorld`, quindi cambia tutti i mondi generati; richiede una migrazione e una rimisura completa
del bilanciamento.

### B — «Il gioco si spiega» (rifinitura e fiducia, ~1 settimana)

Test di montaggio sulle schermate principali (voce 1 del debito), tutorial rivisto sui punti che i collaudatori
sbagliano, statistiche storiche di carriera (albo d'oro, record personali), esportazione CSV.
**Perché**: è la strada giusta **subito dopo il collaudo esterno**, quando si sa cosa non si capisce.
**Attenzione**: metà del valore di questa strada dipende dai dati del collaudo, che non ci sono ancora.

### C — «La panchina viva» (profondità, ~1-2 settimane)

Allenatori dell'IA con carriera e reputazione (esoneri, panchine che cambiano), arbitri con personalità, meteo e
terreno, cronaca radiofonica testuale delle partite che non guardi.
**Perché**: dà al mondo attorno alla tua squadra la stessa cura che oggi ha la tua squadra.
**Attenzione**: arbitri e meteo toccano il motore partita, quindi golden master da rigenerare e bilanciamento da
rimisurare.

### Comunque, prima di tutto

- **Collaudo esterno** con tre persone e una stagione intera.
- **Pubblicare la 0.2.1** con le nazionali giocate dal motore (l'installer pubblicato è la 0.2.0, che è precedente).

### Idee già in lista per dopo la 1.0 (GUIDA, appendice B)

Altre leghe · editor del mondo · import dei database della community · modalità sfida · storico pluridecennale ·
più allenatori sullo stesso computer · modalità «solo direttore sportivo» · allenatori IA con carriera · meteo e
terreno · arbitri con personalità · cronaca radiofonica · CSV · tema chiaro · spagnolo.

---

## 18. Come impostare la sessione con Opus

1. Dare questo file, `CLAUDE.md` e `docs/balance/targets.md`.
2. Chiedere **un piano**, non codice: elenco di interventi, ognuno con file toccati, se serve una migrazione, se
   serve rigenerare il golden master, quale comando di `pnpm sim` lo verifica e quale target deve rientrare.
3. Far dichiarare in anticipo, per ogni intervento, **cosa può rompere**: determinismo, schema, golden master,
   prestazioni (`pnpm bench` ≤ 4,2 ms), chiavi i18n.
4. Ordinare gli interventi per rischio crescente, e mettere per primi quelli che non toccano il motore.
5. Tenere fermo il criterio di «fatto»: test verdi + typecheck pulito + report nei target.

---

*Scritto il 26/09/2026, sullo stato del commit `a84b1ff`. Le foto delle schermate stanno in `docs/stato-del-gioco.md`.*
