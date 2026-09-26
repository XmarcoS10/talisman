# Note di rilascio

## 0.2.0 — la partita

Le carriere della 0.1.x si aprono: passano da sole al formato 27. Le storie scritte prima restano in italiano, quelle
nuove si scrivono nella lingua che scegli.

- **La partita in 2D, rifatta.**
  - Tre visioni: **Salienti** (4-7 minuti con le azioni che contano), **Estesa** (anche pressing e ripartenze) e
    **Completa**.
  - Tre telecamere: campo intero, segue la palla, ravvicinata.
  - **Replay** al rallentatore dei gol e delle grandi occasioni.
  - Ogni momento dell'azione ha la sua animazione: dribbling, contrasto, colpo di testa, parata, uscita, respinta, fuorigioco.
  - **Sovrapposizioni tattiche** sul campo: linea e baricentro, rete dei passaggi, zone calde, zone di pressing.
    Quando cambi un'istruzione, la forma di prima resta tratteggiata.
  - Il nome sopra chi ha la palla, l'ombra della palla alta e chi sta pressando. Le maglie non si confondono.
  - Un racconto più vivo, con 22 tipi di evento e cinque frasi ciascuno. Il tabellino arriva all'intervallo e alla fine.
  - La folla reagisce.
  - La partita scorre fluida anche su un portatile lento.
- **Un motore della partita più ricco**:
  - dribbling e uno contro uno;
  - cross alti e bassi, con il duello aereo;
  - il portiere che para, respinge ed esce;
  - piazzati con schemi (primo palo, secondo palo, corto, barriera) e battitori scelti;
  - transizioni (ripiegare, riaggredire, ripartire);
  - fatica vera.
  I numeri delle partite sono tarati su quelli dei campionati veri.
- **Istruzioni individuali** (tiro, ampiezza, inserimenti, restare dietro, marcare a uomo un ruolo) e **piani partita**:
  «se siamo sotto dal 70', mentalità offensiva e un attaccante in più». Il vice te li annuncia quando scattano.
- **Tre campionati**:
  - Serie C di contorno, da cui salgono e in cui scendono le squadre;
  - **playoff** per la terza promossa della Serie B e **playout** per non retrocedere.
- **I club possono fallire**: chi spende troppo va in amministrazione controllata, con penalizzazione in classifica.
  I club ricchi reinvestono, e la Serie A attira i migliori della B.
- **In inglese**: l'interfaccia, le storie e le conferenze stampa. La lingua si sceglie alla prima apertura e si cambia
  dalle Impostazioni.
- Mercato su una scala più realistica, finestra invernale a gennaio, stelle di abilità relative al tuo campionato.
- Ogni risposta in conferenza stampa ha il suo tipo. La scheda del giocatore mostra i tratti di personalità che spiccano.
- Il gioco non si blocca più mentre passa la giornata: il motore lavora in un thread a parte.

### Limiti noti

- L'installer non è firmato: Windows mostra l'avviso «editore sconosciuto».
- La versione Linux va costruita su Linux (`pnpm dist:linux`).
- Le partite delle nazionali non si guardano.
- La distanza fra Serie A e Serie B oscilla più del previsto nelle prime stagioni. Si assesta dopo 5-10 stagioni
  (`docs/balance/2026-09-26.md`).

## 0.2.0 — the match (English)

Careers from 0.1.x open fine: they move to save format 27 on their own. Stories written before stay in Italian. New
ones are written in the language you choose.

- **The 2D match, rebuilt.**
  - Three views: **Highlights** (4–7 minutes of the moves that matter), **Extended** (pressing and counter-attacks
    too) and **Full**.
  - Three cameras: whole pitch, follow the ball, close.
  - Slow-motion **replays** of goals and big chances.
  - Every moment of a move has its own animation: dribble, tackle, header, save, keeper coming out, parry, offside.
  - **Tactical overlays** on the pitch: line and shape, passing network, heatmap, pressing zones. When you change an
    instruction, the old shape stays dashed.
  - The name above the ball carrier, a shadow under the high ball, and who is pressing. Kits never clash.
  - Livelier commentary, with 22 kinds of event and five lines each. A match sheet at half-time and full-time.
  - The crowd reacts.
  - The match runs smoothly even on a slow laptop.
- **A richer match engine**:
  - dribbles and one-on-ones;
  - high and low crosses, with aerial duels;
  - a goalkeeper who saves, parries and comes out;
  - set-piece routines (near post, far post, short, wall) and chosen takers;
  - transitions (drop back, counter-press, break);
  - real fatigue.
  Match numbers are tuned against real leagues.
- **Player instructions** (shooting, width, forward runs, stay back, man-mark a role) and **match plans**: "if we're
  behind from the 70th minute, attacking mentality and an extra striker". Your assistant tells you when they kick in.
- **Three leagues**:
  - a background Serie C, where teams come up from and go down to;
  - **play-offs** for the third promotion spot in Serie B, and a **play-out** to avoid relegation.
- **Clubs can go bust**: clubs that overspend go into administration, with a points deduction. Rich clubs reinvest,
  and Serie A pulls the best players out of Serie B.
- **In English**: the interface, the stories and the press conferences. You choose the language at first launch and
  can change it in Settings.
- A more realistic transfer market scale, a January winter window, star ratings relative to your league.
- Every press conference answer has its own type. The player profile shows the personality traits that stand out.
- The game no longer freezes while a matchday is played: the engine runs on a separate thread.

### Known limits

- The installer isn't signed: Windows shows an "unknown publisher" warning.
- The Linux version has to be built on Linux (`pnpm dist:linux`).
- National team matches can't be watched.
- The gap between Serie A and Serie B swings more than planned in the first seasons. It settles after 5–10 seasons.

## 0.1.1 — per il collaudo esterno

La versione da dare ai tester (istruzioni e modulo in `docs/collaudo.md`). I salvataggi della 0.1.0 si aprono:
passano al formato 20.

- **Offerte per i tuoi giocatori**: nelle finestre di mercato gli altri club ti fanno offerte, e decidi tu dalla
  Scrivania: accetti, rifiuti o chiedi di più. Se un giocatore sognava quel club e gli dici di no, se lo ricorda.
- **Mercato dell'IA più vivo**: i club grandi riescono a comprare i titolari dei piccoli, e il campionato non si
  appiattisce dopo qualche stagione.
- **Stemmi** tutti diversi (8 scudi, 12 partizioni, 10 simboli), **maglie** con 15 disegni e seconda maglia (in partita
  le squadre non si confondono più), **volti** dei giocatori secondo nazionalità, età e altezza.
- **Grafica generata**: sfondi delle schermate, illustrazioni delle storie e grana dell'erba sul campo 2D.
- Modelli di segnalazione su GitHub per bug e impressioni.

## 0.1.0 — Tactic F.C. Manager (TFM 27)

Il gioco cambia nome (prima era Talisman) e faccia: tutte le schermate rifatte sui disegni di Marco. I salvataggi di
prima si ritrovano. Novità di gioco:

- **Coppa nazionale** a eliminazione diretta, con rigori, premi e albo d'oro; **amichevoli estive**.
- **Campionato Primavera** del vivaio e anteprima della prossima annata.
- **Filosofia dell'allenatore** da scegliere a inizio carriera: gestore, tattico o scopritore di talenti.
- **Indicazioni dalla panchina** in partita: incoraggia, chiedi di più, calma.
- Finanze con proiezione di fine stagione e cassa mese per mese; richiesta alla dirigenza per allargare lo staff
  osservatori; classifiche casa/trasferta/forma/xG; report sull'avversario; esportazione del calendario.
- **5 slot** con nome e tempo di gioco, valuta e formato data a scelta, pausa sulle notizie importanti.

### Prima versione di collaudo

La prima versione da far provare a persone che non hanno scritto il gioco. Obiettivo del collaudo (GUIDA §9, F9):
tre tester esterni completano una stagione senza chiedere aiuto.

### Cosa c'è

- Installer per Windows (`TFM27-Setup.exe`, 113 MB): si installa nella cartella dell'utente, senza
  permessi di amministratore; aggiornamento automatico spento. Funziona senza internet: i caratteri sono nel gioco.

- Due campionati inventati, Serie A e Serie B, venti squadre ciascuno, promozioni e retrocessioni.
- Partita dal vivo in 2D con panchina, pausa tattica, analista; oppure simulata all'istante.
- Tattica con cinque moduli e i ruoli per ogni posizione; allenamento a dodici sedute settimanali.
- Spogliatoio: grafo dei rapporti, leader, faide, morale contagioso, promesse.
- Mercato con trattative, agenti, contratti, prestiti, parametro zero; osservatori e stime al posto dei valori veri.
- Finanze per cassa con fair play finanziario; dirigenza con obiettivo rinegoziabile ed esonero.
- Vivaio con annate estive; nazionali con pause, Europeo e Mondiale.
- Quaranta tipi di storie e le conferenze stampa che ne nascono.
- Suggerimenti alla prima apertura di ogni schermata e una prima partita guidata.
- Salvataggi su file, registro degli errori e diagnostica esportabile.

### Limiti noti

- **L'installer non è firmato**: Windows mostrerà l'avviso «editore sconosciuto» (SmartScreen). Firmarlo richiede un
  certificato di firma del codice, che si compra; per il collaudo basta cliccare «Ulteriori informazioni → Esegui comunque».
- **La versione Linux (AppImage)** è configurata ma va costruita su Linux (`pnpm dist:linux`): da Windows non si può.
- Le partite delle nazionali non si guardano: si calcolano con un modello semplificato.
- L'intelligenza artificiale non fa offerte per i giocatori dell'utente (manca la schermata per accettarle).
- Il mercato dell'IA è prudente: i club accumulano cassa e le bancarotte, possibili come regola, non succedono.
- La partita in 2D è leggibile ma essenziale: duelli, parate e piazzati non hanno ancora una rappresentazione propria.
- Una simulazione di 10.000 partite richiede circa 47 secondi, oltre l'obiettivo di 20: non si nota giocando.

### Per chi aggiorna da versioni di sviluppo

I salvataggi vecchi si aprono: passano dalle migrazioni fino al formato 14. Nell'app desktop, alla prima apertura, gli
slot vengono copiati dall'archivio del browser a file veri; la copia vecchia resta come riserva.
