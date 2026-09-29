# Rifare l'interfaccia con Stitch (v2)

Strumento: **Google Stitch** (stitch.withgoogle.com, gratuito con un account Google). È lo stesso della F10
(`docs/design/stitch/`): genera schermate da una descrizione, le tiene nello stesso progetto con lo stesso stile, e le
esporta in Figma o come HTML. Il codice che esporta non entra nel gioco: serve da riferimento, e le schermate le
ricostruisce Claude sui componenti React e sui token di `src/ui/tokens.css`.

## Come si usa

1. Nuovo progetto in Stitch, modalità **Web** (non mobile), modello migliore disponibile (quello «Pro» o «Experimental»).
2. Incolla il **prompt principale**. Stitch genera la prima schermata (la Scrivania) e fissa lo stile.
3. Se lo stile non piace, correggilo a parole prima di andare avanti («più sobrio», «meno neon», «caratteri più grandi»).
4. Poi incolla **un prompt per schermata**, nello stesso progetto, uno alla volta.
5. Alla fine esporta tutto (immagini + codice) e mettilo in `docs/design/stitch-v2/`, poi dillo a Claude.

Consiglio: fai prima Scrivania, Partita dal vivo e Rosa. Se quelle tre convincono, il resto viene da sé.

---

## Prompt principale (da incollare per primo)

```
Design a complete desktop UI for "Tactic F.C. Manager" (short name TFM 27), a free, offline football (soccer) management game in the style of Football Manager, played on Windows at 1280×800 and larger. All on-screen text must be in ITALIAN.

WHO PLAYS IT: people who love football but are not spreadsheet experts. The game is deep (tactics, transfers, finances, dressing-room psychology) but every screen must be readable at a glance: one clear main action per screen, the key number big, details on demand.

VISUAL DIRECTION: a modern sports-broadcast / editorial look — think a premium match-day TV graphic package crossed with a clean data dashboard. Confident typography, generous spacing, strong hierarchy, restrained color: one accent color for actions, green/amber/red only for good/warning/bad. No neon glow, no glassmorphism everywhere, no gradients on data. It must work in BOTH a dark theme and a light theme (show dark first). Numbers use a tabular monospaced font; headings a bold condensed grotesque; body a readable sans.

LAYOUT SHELL (same on every screen): left sidebar with the club crest and name, grouped navigation (Principale: Scrivania, Storie & Media, Rosa, Tattica · Gestione: Allenamento, Spogliatoio, Vivaio · Mercato: Mercato, Osservatori, Finanze, Dirigenza · Competizioni: Classifiche, Calendario, Record & Storia · Impostazioni), collapsible to icons. Top bar: game date (e.g. "sab 12 set 2026"), club cash ("45,4 Mln €"), global search, a secondary button "Guarda la partita" and a big primary button "Avanza" (keyboard: space).

HARD RULES:
- All clubs, players, cities and competitions are invented (e.g. "Sporting Ventimonti", "Unione Casalforte", "Serie A", "Coppa nazionale"). Never use real clubs, real players, real sponsors or real crests. Crests are simple generated shields with two colors and initials.
- Other clubs' players are shown only as scout ESTIMATES: star ratings with an uncertainty range (e.g. 3–4 stars), never exact hidden numbers. Your own players show exact values.
- The game is fully offline: no login, no cloud, no online status, no social features.
- Italian number format: "26,6", "45,4 Mln €", "0,23%".
- Accessible contrast (WCAG AA) in both themes; nothing that relies on color alone.

FIRST SCREEN — "Scrivania" (the home dashboard): four KPI tiles (Posizione 5° / 20 with the board's target 9°; Ultime partite V V N P V; Cassa 45,4 Mln € with board trust 62%; Morale della squadra 68/100). A large "Prossima partita" card (home vs away crests, date, time, stadium, buttons "Imposta formazione" and "Vai alla partita"). A "La tua prima partita" guide with six checkable steps. A news feed (results, injuries, an agent asking for a contract renewal with a link to the player, a press story). A compact league table around the club's position with the relegation zone marked.
```

---

## Un prompt per schermata (dopo il principale, uno alla volta)

**Partita dal vivo**
```
Next screen: "Partita dal vivo", the live 2D match. Top: scoreboard (crests, 1–0, minute 63', 2° tempo), playback controls (pause, 1×/2×/5×, "Prossimo episodio", "Pausa tattica", "Salta al finale"), view mode (Salienti / Estesa / Completa) and camera (Campo / Segui / Vicina), a momentum bar 0'–90' with goal/card/sub icons. Center and biggest: a top-down 2D pitch with 22 numbered player dots, the ball, the carrier's name, rain effect optional. Under the pitch: a scrolling one-line commentary ticker. Left column: bench with the 11 on the pitch (role badge, name, energy %, match rating 6,8), 5 substitutions left, touchline shouts (Incoraggia / Chiedi di più / Calma). Right column: tabs Momentum / Pressing / Passaggi / Duelli, live stats (xG 1,24 – 0,61, possesso 57%, tiri 9 (4) – 5 (1)), an "L'analista" advice card, and quick tactical controls (mentality 5 steps, pressing, tempo, width, defensive line, directness, after losing the ball). The pitch must be fully visible at 1280×800 without scrolling.
```

**Rosa**
```
Next screen: "Rosa" (squad). A dense but calm table of 25 players: role badge (POR, DC, TS, TD, MED, CC, ES, ED, TRQ, AS, AD, ATT), name, nationality flag, age, ability and potential as stars, fitness %, morale, market value, wage, contract end year, status icons (injured, suspended, unhappy, expiring). Tabs for views (Generale, Contratti, Forma & Stat, Report medico, Tecnici, Mentali, Fisici, Portiere), filters by unit (Tutti, POR, DIF, CEN, ATT, In scadenza), sortable columns, a CSV export button. Header pills: average age "26,6", wage bill "37,1 Mln €/a", under-21 count. Clicking a row opens the player profile.
```

**Scheda giocatore**
```
Next screen: player profile. Header with generated face, name, age, nationality, role, club, value and wage. Attributes in three groups (Tecnici, Mentali, Fisici; 1–20 scale) with a small radar chart, personality traits in words, morale and the reasons behind it, relationships in the dressing room (friends, rivals), season stats and career history, development chart, contract panel with a "Rinnova" action, individual instructions. For another club's player the same layout shows estimates with ranges and "Fai un'offerta".
```

**Tattica**
```
Next screen: "Tattica". A large pitch with the formation (4-2-3-1) and 11 player cards (number, short name, role dropdown, green/cyan rings for condition and role familiarity), drag and drop to swap. Top: formation selector, "Familiarità tattica 80%" bar, lineup strength stars, "Scegli i migliori" button. Side panel: team instructions as segmented controls (Mentalità 5 steps; Pressing, Ritmo, Ampiezza, Linea difensiva, Verticalità, Dopo la palla persa each 3 steps) with a one-line explanation of the trade-off of the selected option. Below: set-piece takers (corners, free kicks, penalties), "Piani partita" (automatic in-match plans, e.g. "Se perdiamo al 70' → Propositiva"), starters and substitutes list.
```

**Calendario e report sull'avversario**
```
Next screen: "Calendario". A featured next-match card, preseason friendlies results, the 38-round fixture list with date, opponent, home/away, time or result (V/N/P badges), month filter and "Esporta calendario iCal". Right column: results of the round (clickable, opening a match report with radio commentary) and a "Report tattico avversario" card: probable formation, mentality, opposing coach and style ("Daniele Testa, possesso palla"), dangerous player, last 3 head-to-heads, referee with strictness ("tollerante 4/20"), weather forecast with its effect ("pioggia: palla a terra meno precisa"), and one line of advice from the analyst.
```

**Resoconto della partita**
```
Next screen: the post-match report as a large modal. Header: competition, "Fine partita", referee and weather, crests and score 2–1, man of the match with rating 8,1. Two-sided timeline of goals, cards and substitutions. Side-by-side stats (possesso, xG, tiri in porta, passaggi e precisione, palloni recuperati, falli, corner, fuorigioco, cartellini). Shot map. Player ratings for both teams. A collapsible radio commentary. Other results of the day as clickable rows. Primary button "Continua".
```

**Mercato**
```
Next screen: "Mercato". Left filter panel (role, age range slider, max value, max wage, league, contract expiring toggle, "solo stime affidabili" toggle). Main: a results table of players from other clubs with scout-estimate stars and a confidence indicator, age, club, estimated value, contract end, and an "Offri" button per row. Sorting chips, pagination, CSV export. A side drawer for the negotiation: asking price, our offer (fee, years, appearance and goal bonuses, sell-on %, wage), agent fee, cash available, response banner (accepted / counter-offer / rejected).
```

**Finanze**
```
Next screen: "Finanze". KPI tiles: cash, projected revenue, wage bill vs cap (46% of 72% limit) with a meter, financial fair play status. Income and expenses statement for the season (tickets, TV, sponsors, merchandising, prizes, player sales; wages, staff, stadium, purchases) with amounts and percentages, projected season result. Instalments to pay and to receive. A month-by-month cash bar chart with a note that TV, sponsor and prize money arrive at the end of the season.
```

**Nuova carriera**
```
Next screen: new career, step 1 "Assegnazione panchina": a grid of club cards (crest, name, founded, stadium, board objective tag, transfer budget, wage bill, squad stars, reputation, youth facilities, club style), with filters (league, objective, search, sort) and a bottom bar with the selected club and "Vai al dossier del club". Step 2 "Dossier e firma": the club's story in two lines, forecast position, finances grade, facilities, three key players, best formation, manager name input, optional manager philosophy (Gestore / Tattico / Scopritore with their bonus), "Firma il contratto e inizia la carriera".
```

**Tema chiaro**
```
Show the Scrivania and the Rosa screens again in the LIGHT theme, same layout and hierarchy. The 2D pitch stays green in both themes.
```

---

## Scrivania personalizzabile (dopo la prima versione, 29/09)

La prima Scrivania di Stitch è in `docs/design/stitch-v2/01-scrivania.png` (stile «Pitch Command Editorial»,
`DESIGN.md` accanto). Marco la vuole più personalizzabile. Prompt da incollare nello stesso progetto:

```
Update the "Scrivania" screen: keep exactly this visual style, but make the dashboard CUSTOMIZABLE by the player, like widgets on a phone home screen. Show it in three states, as three separate frames.

1) NORMAL VIEW: the same dashboard, built from widgets on a 12-column grid. Each widget has a small title bar; hovering shows a "⋯" menu (Riduci / Ingrandisci / Nascondi / Sposta). A button "Personalizza scrivania" at the top right of the page, next to a layout selector "Layout: Allenatore ▾".

2) EDIT MODE (after clicking "Personalizza scrivania"): widgets show dashed outlines, drag handles and resize handles; three sizes S (1/4 width), M (1/2), L (full width); an "×" to remove each widget; empty slots show "+ Aggiungi widget". A top banner: "Trascina i riquadri per spostarli · Salva · Annulla · Ripristina predefinita".

3) WIDGET GALLERY: a right-side drawer "Aggiungi widget" with categories and small previews, each with an "Aggiungi" button and a note of the sizes it supports:
- Partite: Prossima partita, Prossime 5 partite, Ultimi risultati, Focus avversario, Meteo e arbitro della prossima partita.
- Squadra: Morale dello spogliatoio, Infermeria e squalificati, Contratti in scadenza, Giocatori in forma, Giovani e minutaggio.
- Competizioni: Classifica (intorno alla mia posizione o completa), Capocannonieri, Coppa nazionale (tabellone), Statistiche di squadra (xG, possesso, tiri).
- Società: Cassa e bilancio, Fiducia della dirigenza, Obiettivo di stagione, Monte ingaggi.
- Mercato: Offerte ricevute, Trattative in corso, Lista osservati, Rapporti degli osservatori.
- Notizie: Notizie e sala stampa, Conferenza stampa della settimana, Storie del campionato.
- Guida: La tua prima partita (can be removed once completed).

Also show a small "Layout" menu with presets: "Allenatore" (matches, squad, table), "Direttore sportivo" (market, finances, contracts), "Essenziale" (next match, table, news only), and "Il mio layout" (the saved custom one).

Content fixes for this screen: remove the betting odds ("Quote scommesse") — the game has no betting; remove "Rivedi il discorso motivazionale / Prepara discorso" — there is no team talk feature. Everything else in the widgets must use data the game already has: results, table, cash, board trust, morale, injuries, contracts, scout estimates as star ranges, news, press conferences, weather, referee, opposing coach.
```
