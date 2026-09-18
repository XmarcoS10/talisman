# ADR 0004 — Persone: allenamento, sviluppo, infortuni, spogliatoio (F5)

**Data:** 18/09/2026 · **Stato:** accettato

## Fatto
- **Settimana di allenamento** (`training.ts`): 12 sedute in 7 categorie, 6 programmi pronti. Il carico consuma forma fisica,
  alza l'affaticamento stagionale e il rischio di infortuni (col cubo del carico oltre il riferimento); partitelle = condizione
  partita; sedute tattiche = familiarità col modulo (0-100, entra in partita).
- **Sviluppo settimanale** (`development.ts`, `developPlayer(p, ctx, rng)`): ogni attributo sale o scende di 1 con una piccola
  probabilità (gap PA−CA, curva d'età della macro-area, professionalità, minuti, morale, infortunio, focus dell'allenamento).
  Niente decimali salvati, niente scatti: in media delta continui. Curve per area in `DEV.curves`.
- **Mentori**: un veterano (27+) segue un giovane (≤21): gli passa piano personalità e attributi mentali.
- **Infortuni** (`injuries.ts`): 61 tipi (contatto, muscolari, sovraccarico/malanni) con durata min/media/max e probabilità di
  ricaduta. Rischio personale = tendenza (attributo nascosto) × affaticamento × età. Dopo la guarigione c'è una finestra
  "rientrato da poco": farlo giocare rischia la ricaduta (più lunga).
- **Condizione**: forma fisica, condizione partita (sharpness), affaticamento stagionale invisibile.
- **Spogliatoio** (`social.ts`, `morale.ts`): grafo di relazioni (nazionalità, lingua, età, carattere, concorrenza per il posto),
  che evolve (amicizie, rivalità di chi non gioca, liti, vittorie insieme); influenza e gruppo dirigente derivati; morale a
  componenti (minuti rispetto allo status, risultati rispetto alle attese, fiducia nell'allenatore, rendimento, esclusione,
  faide) con contagio emotivo pesato da influenza e amicizia e attenuato dalla Resilienza; faide tra influenti con tre scelte
  (dai ragione a uno, all'altro, media); promesse di spazio verificate da sole, con memoria (`manager.kept/broken`); fuori rosa
  con reazione del gruppo se è un leader.
- **In campo**: morale, condizione partita e familiarità col modulo diventano un logit personale del portatore; tra amici/nemici
  il peso di scelta del passaggio cambia al massimo del ±8%.
- **Causal Log** (`world.causal`, solo giocatori dell'utente): ogni +1/−1 di attributo, infortunio, lite, promessa, esclusione
  con la sua causa leggibile, mostrato nel profilo.
- **UI**: schermate Allenamento e Spogliatoio (grafo force-directed in SVG), pannelli "Umore e spogliatoio" e "Sviluppo"
  (grafico di crescita + perché) nel profilo, colonna Morale in Rosa, familiarità in Tattica.
- **CLI**: `pnpm sim -- --dev 10` → `docs/balance/development.md`; `pnpm sim -- --psych 20` → `docs/balance/psychology.md`.
- Salvataggi v4 con migrazione (grafo sociale generato, minutaggio iniziale dallo status).

## Scelte e semplificazioni
| Cosa | Perché |
|---|---|
| Attributi interi con passi ±1 probabilistici | niente accumulatori da salvare (il mondo resta ~1-2 MB), e ogni passo è un evento del Causal Log |
| Causal Log solo per il club dell'utente, max 400 voci | è lì che serve il "perché"; per tutti i 1000 giocatori peserebbe troppo |
| Influenza, status in rosa, "chi chiede di parlarti" derivati | regola 4: niente valori derivati salvati |
| Grafo in SVG invece che canvas | 25 nodi: SVG basta, è accessibile e si stila coi token |
| Promesse solo di spazio (titolare / più minuti) | acquisti, rinnovi e cessioni arrivano col mercato (F7); `wantsOut` è già pronto per F7 |
| Staff medico e qualità degli allenatori | arrivano con lo staff (F8): oggi il fattore allenatore vale 1 |
| Focus individuale di allenamento, breakout, agenti con memoria | rimandati: agenti F7, breakout narrativi F8 |
| Mockup della schermata Spogliatoio prima del codice (GUIDA passo 16) | saltato: il grafo è semplice da cambiare dopo il playtest |

## Taratura
Bersagli e valori in `docs/balance/targets.md`; report in `development.md`, `psychology.md`, `f5-*.md`.
