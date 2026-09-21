# SPECIFICHE TECNICHE COMPLETE & ARCHITETTURA DI IMPLEMENTAZIONE: TALISMAN FOOTBALL MANAGER 27 (TFM 27)

> **Prompt Master per Claude**:
> "Sei un Senior Full-Stack Engineer ed UI/UX Developer specializzato in interfacce per videogiochi manageriali (ispirati a Football Manager, OOTP, Motorsport Manager).
> Di seguito trovi le specifiche complete di design, layout, token stilistici e tutte le schermate riprogettate per il gioco **Talisman Football Manager 27 (TFM 27)**.
> Il tuo compito è implementare l'intero frontend (in React/Next.js/Vue o Tailwind CSS + TypeScript) in modo modulare, pulito, reattivo e fedele alle specifiche grafiche."

---

## 1. DESIGN SYSTEM & IDENTITY (TFM 27)

### 1.1 Identità & Mood
- **Titolo Ufficiale**: Talisman Football Manager 27 (abbreviato in **TFM 27**).
- **Stile Visivo**: Dark tactical UI, denso, tecnico, ad alta leggibilità, ispirato all'ecosistema di *Football Manager* moderno.
- **Accenti Cromatici**:
  - **Colore Primario / Brand Accent**: `#00f59b` (Verde neon / Electric Emerald per azioni principali, indicatori attivi, status positivi).
  - **Sfondo Base (Surface)**: `#0f131d` (Dark Navy profondo).
  - **Surface Container Low**: `#171b26` (Card, pannelli, tabelle).
  - **Surface Container High / Bright**: `#222838` / `#353944` (Hover, bordi, divider e header di sezione).
  - **Colori Semantici**:
    - Ruoli & Badge: POR (`#eab308` ambra/giallo), DC/TD/TS (`#3b82f6` blu/ciano), CC/MED (`#10b981` verde smeraldo), ATT/AS/AD (`#ef4444` rosso/arancione).
    - Status Finanziari & Morale: Verde (`#00f59b`), Neutro/Stabile (`#94a3b8`), Critico/Debito (`#f43f5e`).
- **Tipografia**:
  - Font Primario: `Space Grotesk`, sans-serif tecnico/monospaced nei dati numerici.
  - Pesi: 400 (Regular copy), 500 (Medium tabelle), 600 (Semibold header/valori), 700 (Bold numeri chiave).

---

## 2. ARCHITETTURA DELLA SHELL (APP FRAME)

Tutte le schermate in-game (dopo l'avvio carriera) condividono lo stesso master frame:
1. **Top Navigation Bar (Header)**:
   - Logo TFM 27 con icona campo tattico.
   - Omnisearch / Ricerca globale: `Cerca giocatori, club o staff... [ / ]`.
   - Data in-game: es. `sab 22 ago 2026`.
   - Saldo Cassa rapido: es. `13,0 Mln €`.
   - Action Hub: Pulsante **"Guarda la partita"** / Pulsante prioritario verde neon **"AVANZA ▶"**.
   - Icona Profilo Manager (in alto a destra).
2. **Persistent Left Sidebar (Navigazione Principale)**:
   - **Header Squadra**: Stemma + `Virtus Roccabianca` (Serie B • 2026/27).
   - **Sezione PRINCIPALE**:
     - Scrivania (Home Dashboard)
     - Storie & Media
     - Rosa
     - Tattica
   - **Sezione GESTIONE**:
     - Allenamento
     - Dinamiche & Spogliatoio
     - Vivaio
   - **Sezione MERCATO**:
     - Mercato & Trasferimenti
     - Osservatori
     - Finanze
     - Dirigenza
   - **Sezione COMPETIZIONI**:
     - Classifiche
     - Calendario
   - **Footer Sidebar**:
     - Impostazioni & Salvataggi
     - Esci al menu

---

## 3. CATALOGO COMPLETO DELLE SCHERMATE IMPLEMENTATE

Di seguito l'elenco di tutte le schermate riprogettate con i requisiti di ciascuna:

### 🎮 Schermate di Setup & Avvio Carriera (Standalone Web Standard Shell)

#### 1. Nuova Carriera: Selezione Club (`Selezione Club - Talisman Football Manager 27`)
- **Scopo**: Selezione della squadra da allenare all'inizio del salvataggio.
- **Componenti chiave**:
  - Stepper a due fasi in alto: `1. SCEGLI CLUB` (attivo) -> `2. DOSSIER ROSA & FIRMA`.
  - Filtri orizzontali: Pill di selezione `Tutti (28)`, `Serie A (16)`, `Serie B (12)`.
  - Ordinamento rapido: Per budget di mercato, blasone, reputazione.
  - Griglia schede club spaziose a 3 colonne con: nome, stemma/acronimo, anno fondazione, stadio e capienza, obiettivo CdA (es. Promozione diretta, Salvezza con affanno, Metà classifica), budget mercato, monte ingaggi, OVR rosa, reputazione (stelle) e stile tattico richiesto (Gegenpressing, Contropiede, ecc.).
  - Card di **Virtus Roccabianca** con highlight attivo e selettore verde `#00f59b`.
  - Barra fissa inferiore con riassunto del club e CTA: **"VAI ALLE INFORMAZIONI SQUADRA ➔"**.

#### 2. Informazioni Squadra & Dossier Club (`Informazioni Squadra - Virtus Roccabianca`)
- **Scopo**: Esame dettagliato della società scelta prima di ratificare l'accordo contrattuale.
- **Componenti chiave**:
  - Breadcrumb e tasto per tornare alla selezione club (`← Torna alla Selezione Club`).
  - Hero Club: Nome, fondazione 1913, Stadio Comunale Falcone (14.200), previsione media (13° Posto), indice salute CdA (A+ Stabile) e citazione/filosofia societaria.
  - 3 Pannelli Dati Principali:
    1. **Bilancio & Finanze**: Budget trasferimenti (13,00 Mln € - 100% reinvestibile), monte ingaggi (6,40 Mln € / tetto 8,50 Mln €), margine residuo (+2,10 Mln €).
    2. **Infrastrutture & Ambiente**: Cantera & strutture (Livello 9/20), clima tifoseria con gauge fedeltà curva (82%), centro sportivo e staff medico.
    3. **Perni della Rosa**: I 3 leader chiave (Isak Karlsson, Erik Holm, Enrico Mancini) con schede compresse, valori di mercato e moduli consigliati (4-3-3 Fluido / 3-5-2 Contropiede).
  - Box inferiore **Configurazione Profilo Tecnico & Firma**: Input nome allenatore, nazionalità, scelta filosofia (Gestore +15% morale, Tattico familiarità rapida, Scout crescita U21) e pulsante finale verde smeraldo **"FIRMA IL CONTRATTO E INIZIA LA CARRIERA"**.

---

### 📋 Hub & Gestione Tattica In-Game (Dashboard Shell)

#### 3. Scrivania Principale (`Scrivania - Virtus Roccabianca`)
- **Scopo**: Home hub centrale del manager per gestire le priorità giornaliere.
- **Componenti chiave**:
  - **Matchday Widget**: Prossima partita (avversario, data, competizione, luogo casa/trasferta) con pulsante rapido "Vai alla Partita".
  - **To-Do List / Guida**: Task manageriali interattivi per la prima stagione.
  - **Feed Notizie & Notifiche**: Rassegna stampa rapida, messaggi della dirigenza e dello staff.
  - **Mini Classifica**: Posizione corrente del club rispetto alla zona playoff/salvezza.

#### 4. Tattica & Formazione (`Tattica & Formazione - Virtus Roccabianca`)
- **Scopo**: Impostazione del modulo, ruoli dei giocatori e istruzioni di squadra.
- **Componenti chiave**:
  - Pitch 2D interattivo con visualizzazione delle 11 maglie numerate sul campo verde a strisce.
  - Dropdown modulo tattico (es. 5-3-2, 4-3-3, 4-4-2, 3-5-2) e indicatore di **Familiarità tattica (%)**.
  - Dropdown di ruolo individuale per ciascuna posizione sul campo (es. Quinto di fascia, Mediano, Regista, Punta).
  - Pannello Istruzioni di Squadra con selettori a segmenti: Mentalità (Difensiva, Prudente, Equilibrata, Propositiva, Offensiva), Pressing, Ritmo, Ampiezza, Linea Difensiva, Verticalità.
  - Tabella titolari e riserve con condizione atletica, ruolo naturale e rating stellare.

#### 5. Rosa Prima Squadra (`Rosa Prima Squadra - Virtus Roccabianca`)
- **Scopo**: Elenco completo dei calciatori sotto contratto con filtri di visualizzazione.
- **Componenti chiave**:
  - Tabella completa (25 giocatori) con colonne ordinabili: Ruolo (badge colorati per reparto), Nome, Nazionalità, Età, Abilità attuale (stelle), Potenziale (stelle), Forma atletica (100%), Morale (score numerico su 100), Valore di mercato, Stipendio annuo, Scadenza contratto.
  - Tab di vista rapida: *Generale, Statistiche, Tecnici, Mentali, Fisici, Portiere*.
  - Link diretto da ogni riga alla scheda dettagliata del singolo giocatore.

#### 6. Scheda Giocatore Individuale (`Scheda Giocatore - Isak Karlsson`)
- **Scopo**: Profilo analitico del singolo atleta.
- **Componenti chiave**:
  - Header giocatore: Foto/avatar, nome, ruolo (es. POR), club, età (35 anni), altezza, piede preferito, stelle abilità e potenziale.
  - Navigazione interna con spaziatura calibrata: Profilo, Attributi, Statistiche, Prestazioni, Contratto, Dinamiche.
  - **Griglia degli Attributi (Scala 1 - 20)**:
    - Tecnico/Portiere (Presa, Riflessi, Uscite, Rinvio, Uno contro uno).
    - Mentali (Aggressività, Concentrazione, Determinazione, Leadership, Decisioni, Visione di gioco).
    - Fisici (Accelerazione, Agilità, Equilibrio, Velocità, Forza, Resistenza).
  - Box Umore & Spogliatoio: Morale, fiducia nell'allenatore, status in rosa (Titolare), amici/rivali, promesse in corso.
  - Box Finanziario: Scadenza contratto, stipendio, valore stimato e clausole.

#### 7. Dinamiche & Spogliatoio (`Dinamiche & Spogliatoio - Virtus Roccabianca`)
- **Scopo**: Gestione psicologica del gruppo, gerarchie e rete sociale dei calciatori.
- **Componenti chiave**:
  - **Mappa a Rete dei Nodi Sociali (Graph View)**: Cerchi con dimensione proporzionale all'influenza sociale dei giocatori e connessioni verdi (amicizia/coesione) o rosse (rivalità/frizioni).
  - Widget Gruppo Dirigente (Leader carismatici: Santoro, Holm, Karlsson, Ferrara) e loro morale.
  - Riquadro Faide interne e giocatori scontenti del minutaggio.
  - Gestione Promesse in corso e stato di adempimento.

#### 8. Allenamento & Programmazione (`Allenamento & Programmazione - Virtus Roccabianca`)
- **Scopo**: Pianificazione dei carichi di lavoro settimanali e tutoraggio giovani.
- **Componenti chiave**:
  - **Matrice Settimanale (Giorno 1 - Giorno 6)**: Sessioni di mattina e pomeriggio (Recupero, Fisico, Tattica, Tecnica, Partitella, Palle inattive, Riposo).
  - Bar di selezione Programmi Preimpostati (*Equilibrato, Fisico, Tecnico, Tattico, Leggero, Intenso*).
  - Monitoraggio Carico Settimanale vs Rischio Infortuni (indicatore numerico e soglia limite).
  - Barra di familiarità con i vari moduli di gioco.
  - **Sezione Mentori & Tutoraggio**: Accoppiamento tra veterani (+27 anni, es. Ferrara, Holm, Karlsson) e giovani talenti (Under 21, es. Moretti, Mancini) per trasmettere tratti di personalità.

---

### 💼 Trasferimenti, Scouting & Finanze

#### 9. Mercato & Trasferimenti - Variante B (`Mercato - Variante B: Pannello Laterale Moderno con Slider`)
- **Scopo**: Ricerca, filtro e trattative per i trasferimenti di calciatori.
- **Componenti chiave**:
  - **Pannello Laterale Sinistro con Filtri Moderni**:
    - Dropdown Ruolo e Nazionalità.
    - Slider o input numerici per Età massima, Valore massimo (milioni €), Stipendio massimo.
    - Toggle rapidi: *Solo in scadenza*, *Solo chi partirebbe*, *Solo quelli che conosciamo*.
  - **Tabella Mercato Risultati**:
    - Nome, Squadra di appartenenza, Nazionalità, Età, Abilità stimata (stelle), Potenziale stimato, Valore, Stipendio, Anno di scadenza contratto e tasto rapido di trattativa ("Fai offerta").

#### 10. Osservatori & Rete Scouting (`Osservatori & Rete Scouting - Virtus Roccabianca`)
- **Scopo**: Gestione dello staff di scouting e report di mercato.
- **Componenti chiave**:
  - Lista degli osservatori del club: Nome, nazionalità, abilità scouting, valutazione potenziale, incarico attuale (fermo o assegnato a una nazione/campionato) e stipendio.
  - Sezione osservatori sul mercato disponibili per l'ingaggio con relative licenze.
  - Feed dei report ricevuti sui calciatori visionati.

#### 11. Finanze & Bilancio (`Finanze & Bilancio - Virtus Roccabianca`)
- **Scopo**: Controllo del conto economico, stipendi e fair play interno.
- **Componenti chiave**:
  - Saldo cassa attuale e fatturato stagionale.
  - Percentuale monte ingaggi su fatturato (con warning sul limite massimo del 72%).
  - **Conto Economico Dettagliato**: Tabella entrate (Biglietti, Diritti TV, Sponsor, Merchandising, Premi, Cessioni) e uscite (Stipendi, Strutture, Stadio, Acquisti, Saldo netto).
  - Gestione rateizzazioni: Rate attive da incassare e rate passive da pagare alle prossime finestre di mercato.

#### 12. Dirigenza & Obiettivi (`Dirigenza & Obiettivi - Virtus Roccabianca`)
- **Scopo**: Dialogo con la presidenza societaria e richieste di budget/strutture.
- **Componenti chiave**:
  - Indicatori di Fiducia a barre orizzontali: Fiducia Dirigenza, Tifosi, Squadra, Stampa (su scala 0 - 100).
  - Valutazione del capitale politico a disposizione del manager.
  - **Rinegoziazione Obiettivi**: Possibilità di chiedere più tempo in cambio di fiducia o alzare l'asticella per ottenere cassa extra.
  - Richieste speciali al CdA con costo in capitale politico (*Sblocca budget, Migliora le strutture del vivaio, Autorizza cessione*).

#### 13. Vivaio & Settore Giovanile (`Vivaio & Settore Giovanile - Virtus Roccabianca`)
- **Scopo**: Supervisione delle giovanili, convocazioni in nazionale e promozioni in prima squadra.
- **Componenti chiave**:
  - Rating delle strutture giovanili (es. 9/20) e livello della rete di reclutamento giovani (8/20).
  - Countdown arrivo dell'annata estiva dei nuovi giovani dalla cantera.
  - Monitoraggio minutaggio e presenze dei giovani aggregati (es. Mancini, Moretti).
  - Giocatori convocati nelle rappresentative nazionali giovanili.

---

### 🏆 Competizioni & Media

#### 14. Classifiche & Statistiche (`Classifiche & Statistiche - Virtus Roccabianca`)
- **Scopo**: Tabella campionato e indicatori stagionali.
- **Componenti chiave**:
  - Switch rapido tra Serie A e Serie B.
  - Tabella classifica a 20 squadre: Posizione (#), Squadra, Giocate (G), Vinte (V), Nulle (N), Perse (P), Gol Fatti (GF), Gol Subiti (GS), Differenza Reti (DR), Punti (PT).
  - Highlight riga per la propria squadra (*Virtus Roccabianca*) e bordi colorati per zone promozione diretta, playoff e retrocessione.
  - Pannello laterale Classifica Marcatori e assist-man.

#### 15. Calendario & Risultati (`Calendario & Risultati - Virtus Roccabianca`)
- **Scopo**: Elenco di tutte le 38 giornate di campionato e dettaglio del turno.
- **Componenti chiave**:
  - Lista verticale scorrevole delle giornate (Giornata 1 - 38) con data, avversario (casa/trasferta) e punteggio/risultato finale.
  - Pannello destro: Risultati completi di tutte le altre gare del campionato per la giornata selezionata.

#### 16. Storie & Stampa / Sala Stampa (`Storie & Stampa - Virtus Roccabianca`)
- **Scopo**: Relazioni con i media, conferenze stampa e reazioni emotive.
- **Componenti chiave**:
  - Tabella conferenza stampa pre e post-gara con domande dei giornalisti e opzioni di risposta con impatto visivo su morale e fiducia.
  - Sezione Storie in corso (serie di vittorie, crisi di gol, indiscrezioni di mercato o malumori).
  - Archivio delle storie concluse e rassegna stampa dei quotidiani sportivi.

---

### ⚽ Matchday Engine & Simulazione

#### 17. Partita dal Vivo - Motore 2D (`Partita dal Vivo - Motore 2D (Rifinita)`)
- **Scopo**: Schermata principale durante lo svolgimento della partita dal vivo.
- **Componenti chiave**:
  - Campo verde 2D con fasce alternate, porte, cerchio di centrocampo e dischetti delle due squadre con i rispettivi numeri di maglia e pallone in movimento.
  - Scoreboard superiore: Stemmi delle squadre, punteggio (es. ROC 0 - 0 CAS) e minuto di gioco con cronometro.
  - Pannello Sinistro: Titolari in campo con voto provvisorio in tempo reale e condizione, più slot per le sostituzioni (5 cambi disponibili).
  - Pannello Destro a 4 tab: *Momentum, Pressing (PPDA), Passaggi (precisione per zona), Duelli*, più i consigli tattici in tempo reale dell'analista.
  - Barra di controllo inferiore: Tasti Play/Pausa, selettore velocità (1x, 2x, 5x), "Prossimo episodio", "Pausa tattica" (per cambiare istruzioni senza fermare la gara) e "Salta al finale".
  - Feed testuale della telecronaca in basso a sinistra (es. passaggi, conclusioni, falli).

#### 18. Report Partita & Simulazione (`Report Partita & Simulazione (Rifinita)`)
- **Scopo**: Schermata riassuntiva post-gara o al termine di una simulazione rapida.
- **Componenti chiave**:
  - Modal overlay / schermata centrale ad alto contrasto con risultato finale, stemmi club e marcatore migliore in campo (*MVP*).
  - Cronologia eventi: Gol, assist, sostituzioni, cartellini gialli e rossi con minutaggio esatto.
  - Statistiche comparative: Possesso palla %, xG (Expected Goals), Tiri totali e in porta, Precisione passaggi, Falli, Calci d'angolo, Fuorigioco.
  - Pagelle individuali: Voti ufficiali di tutti i 22 titolari e subentrati su scala 0 - 10 con codice colore (verde sopra 7.0, rosso sotto 6.0).
  - Riquadro altri risultati di giornata del campionato.

---

### ⚙️ Sistema & Dati

#### 19. Salvataggi & Impostazioni (`Salvataggi & Impostazioni - Talisman Football Manager`)
- **Scopo**: Gestione dei file di salvataggio, slot locali/cloud, backup ed opzioni di gioco.
- **Componenti chiave**:
  - **Slot di Carriera (Colonna Sinistra)**:
    - Path cartella salvataggi (`C:\Users\...\talisman\saves`) con tasti "Copia percorso" e "Apri cartella".
    - Badge autosalvataggio intelligente attivo.
    - Slot 1 (Carriera Attiva - Virtus Roccabianca): Data in-game, orario salvataggio, ore giocate, dimensione file `.dsa`, con pulsante principale verde neon **"SALVA ORA"** e pulsante secondario **"RICARICA"**.
    - Slot 2 e Slot 3 per carriere secondarie con tasti "Carica" e "Sovrascrivi".
    - Slot 4 e 5 disponibili con tasto "+ CREA SALVATAGGIO QUI".
    - Riquadri di utilità: "Esporta Carriera (.dsa) su disco" e "Importa Carriera (.dsa)".
  - **Impostazioni di Gioco & Interfaccia (Colonna Destra)**:
    - Checkbox interattive per tutorial all'apertura, autosalvataggio a fine gara, pausa automatica su notizie critiche.
    - Selettore valuta (EUR, USD, GBP), formato data, switch risoluzione schermo (es. 2560x1440 fullscreen).
    - Slider audio surround 3D (Volume interfaccia, Volume stadio/cori, Effetti partita dal vivo) con opzione muto su Alt-Tab.
    - Diagnostica engine: Versione build (`v1.0.4 Build 20260820`), integrità database (100%) e tasto "Esporta Diagnostica".

---

## 4. ISTRUZIONI STEP-BY-STEP PER CLAUDE

Quando incolli questo file a Claude, puoi usare questo prompt di accompagnamento:

```markdown
Ciao Claude! Ho riprogettato l'intera UI/UX per il mio gioco manageriale di calcio, "Talisman Football Manager 27" (TFM 27).
Qui sopra trovi il documento completo con le specifiche tecniche, il Design System (palette colori scura con accenti verde neon #00f59b, font Space Grotesk) e l'architettura di tutte le 19 schermate.

Voglio che implementiamo l'applicazione passo dopo passo:
1. Inizia impostando il Design System e la Shell condivisa (Top Bar con data/cassa/avanza e Sidebar laterale con tutte le rotte).
2. Procedi implementando i componenti chiave riutilizzabili (Tabelle statistiche FM, badge ruoli, barre di progresso, rating stellari).
3. Implementa le schermate una ad una partendo dalla Scrivania (Home), Tattica (con campo 2D) e Rosa, proseguendo poi con il matchday 2D e il mercato.

Dimmi se hai compreso tutte le specifiche e da quale schermata preferisci partire!
```
