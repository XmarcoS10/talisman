// Tutte le costanti di calibrazione in un unico file (GUIDA §11.3).
// Si tarano guardando il report di `pnpm sim`, mai a occhio nel codice.
import type { Position } from './model.ts';

export const BALANCE = {
  // --- generazione ---
  caFromReputation: (rep: number) => 48 + rep * 1.08, // CA medio della rosa per reputazione club
  caSpread: 13,
  ageMean: 26,
  ageSigma: 4.5,
  youthPenaltyPerYear: 6, // CA in meno per ogni anno sotto i 22

  retireFrom: 33,
} as const;

/** interruttori per i test A/B del sim-cli (non salvati) */
export const FLAGS = { psychology: true };

// --- sviluppo settimanale (GUIDA §7.1) ---
// Ogni settimana ogni attributo sale di 1 con probabilità `crescita` o scende di 1 con probabilità `declino`:
// in media delta piccoli e continui, mai scatti.
export type AgeCurve = { growFull: number; growEnd: number; declineFrom: number; declineRate: number };
export const DEV = {
  growth: 0.0026, // probabilità settimanale di +1 per ogni 10 punti di gap PA−CA (poi × fattori)
  plateauGrowth: 0.35, // crescita residua tra fine crescita e declino (esperienza)
  // curve d'età per macro-area: crescita piena fino a growFull, si spegne a growEnd, declino da declineFrom
  curves: {
    physical: { growFull: 20, growEnd: 24, declineFrom: 30, declineRate: 0.005 },
    technical: { growFull: 21, growEnd: 26, declineFrom: 32, declineRate: 0.003 },
    mental: { growFull: 22, growEnd: 29, declineFrom: 34, declineRate: 0.002 },
    goalkeeping: { growFull: 23, growEnd: 29, declineFrom: 33, declineRate: 0.004 },
  } satisfies Record<string, AgeCurve>,
  weightCore: 1.5, // gli attributi chiave del ruolo crescono di più
  weightGeneral: 1.2,
  weightOther: 0.6,
  injuredGrowth: 0.3,
  injuredDecline: 1.5,
  mentorRate: 0.012, // prob. settimanale di +1 a un mentale in cui il mentore è migliore (× Influenza sociale/20)
  mentorPersonality: 0.03, // prob. settimanale che un asse di personalità si avvicini a quello del mentore
  mentorMinAge: 27,
  menteeMaxAge: 21,
} as const;

// --- allenamento, condizione, infortuni (§7.1-7.2) ---
export const TRAIN = {
  load: { tactical: 0.5, physical: 1, technical: 0.6, setPieces: 0.3, match: 0.8, recovery: -0.5, rest: 0 },
  fitnessPerLoad: 4, // forma fisica spesa in allenamento per unità di carico settimanale
  fatigueMatch: 3.5, // affaticamento stagionale per 90 minuti giocati
  fatigueLoad: 0.25, // per unità di carico
  fatigueRecovery: 2.2, // recupero settimanale di base
  fatigueRest: 0.8, // in più per seduta di recupero o riposo
  sharpMatch: 30, // condizione partita per 90 minuti
  sharpDecay: 8, // persa a settimana
  sharpPartitella: 3,
  sharpPreseason: 60, // a inizio stagione, dopo le amichevoli
  famGain: 1.5, // familiarità col modulo per seduta tattica (× Adattabilità tattica media/11)
  famDecay: 0.5, // persa a settimana dai moduli non usati
  famStart: 80, // modulo iniziale
  famOther: 40,
  injuryBase: 0.0028, // infortunio in allenamento a settimana, al carico di riferimento
  loadRef: 5.5, // carico della settimana tipo
  loadExp: 3, // oltre il riferimento il rischio esplode
  relapseWindow: 0.5, // giorni a rischio ricaduta = durata × questo (max 28)
  relapseMatch: 0.6, // probabilità di ricaduta in partita = ricaduta del tipo × questo (appena rientrato)
} as const;

// --- psicologia e spogliatoio (§7.3) ---
export const PSYCH = {
  moraleBase: 62,
  moraleUp: 0.12, // velocità verso il bersaglio quando sale (+ Resilienza)
  moraleDown: 0.25, // quando scende (− Resilienza)
  minutesEma: 0.2, // peso dell'ultima partita nel minutaggio
  minutesPenalty: 60, // morale perso per minutaggio sotto le attese (× ambizione)
  resultsK: 12, // morale per punto/partita sopra o sotto le attese (ultime 5)
  trustK: 0.3,
  formK: 6,
  excludedPenalty: 20,
  feudPenalty: 8,
  contagion: 0.02,
  // grafo sociale
  sameNation: 25,
  sameLanguage: 12,
  closeAge: 6,
  sociability: 0.8,
  roleRivalry: 12,
  noise: 10,
  edgeMin: 20, // sotto questa forza iniziale l'arco è neutro (non salvato)
  friendDrift: 0.4, // a settimana, per gli archi positivi (× socievolezza)
  healDrift: 0.3, // gli archi negativi si ricuciono piano
  rivalryDrift: 1, // due dello stesso ruolo: chi non gioca si inasprisce
  winBond: 1,
  bustupP: 0.05, // lite in allenamento, per club a settimana
  feudAt: -60,
  feudInfluence: 45,
  // promesse ed esclusioni
  promiseWindow: 8,
  promiseNeed: { starter: 6, minutes: 3 },
} as const;

// --- motore partita L2 (GUIDA §6) ---
// Unità: il campo è 12x8 zone (1 zona ≈ 8,75 m in lunghezza, 8,5 m in larghezza). "logit" = argomento della sigmoide.
export const MATCH = {
  // durata delle azioni (secondi di gioco)
  passTime: 3.8, // + passTimePerZone per zona di distanza
  passTimePerZone: 0.5,
  dribbleTime: 3.5,
  turnoverTime: 2,
  restartTime: 22, // palla inattiva: rimessa, rinvio dal fondo, punizione
  goalTime: 55, // esultanza + calcio d'inizio

  // valore del possesso (expected threat): xT(x) = xtA·e^(xtB·x), ridotto verso le fasce
  xtA: 0.0006,
  xtB: 0.45,
  xtWing: 0.05, // riduzione per zona di distanza dal centro
  lossWeight: 0.6, // quanto pesa perdere palla: valore regalato all'avversario
  possessionValue: 0.03, // K: valore di avere la palla in sé (azioni future, gestione): rende prudenti

  // passaggio: logit di riuscita = base − dist·d − corsia − marcatura − pressione + abilità
  passBase: 4.0,
  passDist: 0.45,
  passLane: 0.8, // difensori vicini alla linea di passaggio
  passMark: 0.9, // difensori vicini al ricevitore
  passPress: 0.35,
  passSkill: 0.06, // per punto di Passaggio sopra/sotto 11
  passVision: 0.05, // Visione, solo sui passaggi lunghi
  passTouch: 0.06, // Primo controllo del ricevitore
  laneRadius: 0.9,
  markRadius: 1.5,
  pressRadius: 1.4,
  runSpeed: 0.55, // zone al secondo con cui un giocatore raggiunge la sua posizione (≈ 4,8 m/s di media)
  // movimento continuo (F6.2): tra una decisione e l'altra il campo avanza a passi fissi
  frameTick: 0.25, // secondi di gioco per fotogramma di posizione
  ballFlight: 0.6, // quota dell'intervallo in cui la palla è in viaggio (il resto è gioco fermo o conduzione)
  deadSpeed: 8, // il gioco fermo (rimesse, esultanza) scorre più in fretta nella riproduzione
  deadFrom: 12, // oltre questi secondi un intervallo è gioco fermo
  offBallMove: 1.2, // ampiezza (zone) degli smarcamenti casuali di chi attacca
  patience: 0.0015, // voglia di verticalizzare in più per ogni passaggio consecutivo oltre il 5°
  boxRun: 0.6, // zone di inserimento in area (× Inserimenti/20) per centrocampisti e trequartisti
  defCompact: 0.75, // senza palla: quanto si accorcia il modulo verso la propria porta (1 = per niente)
  mentalityCompact: 0.04, // per livello di mentalità: più offensiva = meno uomini che rientrano
  mentalityPush: 0.1, // zone in avanti in possesso per livello di mentalità
  mentalityCover: 0.15, // per livello: impegno difensivo in meno (pressione, corsie, marcature)
  mentalityRisk: 0.04, // per livello: quanto meno pesa perdere palla
  mentalityShot: 0.04, // per livello: voglia di tirare
  markTightness: 0.75, // quanto i difensori stringono sull'uomo nella propria metà campo
  markGoalSide: 0.35, // distanza tenuta tra uomo e porta
  spareStepUp: 1.2, // zone di cui avanza un difensore senza uomo da marcare
  // palla in profondità
  gkLineX: 11.2, // fin dove si spinge l'attaccante in corsa prima che esca il portiere
  throughDepth: 1.5, // zone guadagnate alle spalle della linea
  throughBase: -0.6,
  throughRace: 0.1, // per punto di velocità in più dell'attaccante rispetto al difensore
  throughOffside: 0.12,
  offsideWindow: 0.6, // zone prima della linea difensiva in cui un inserimento rischia il fuorigioco
  offsideBase: 0.03,
  offsidePerZone: 0.15, // per zona oltre la linea difensiva

  // dribbling
  dribBase: 0.1,
  dribSkill: 0.09,
  dribDef: 0.08,
  dribPress: 0.9,
  dribGain: 1.0, // zone guadagnate

  // tiro e xG (§6.3): logit = base + angolo·a − distanza_m·d − pressione·p (+ colpo di testa)
  shotMinX: 7,
  xgBase: -1.27,
  xgAngle: 1.6,
  xgDist: 0.1,
  xgPress: 0.45,
  xgHeader: -0.9,
  penaltyXg: 0.76,
  shotSkill: 0.025, // Finalizzazione: moltiplicatore sulla probabilità di gol
  gkSkill: 0.025, // Portiere: riduzione
  onTargetBase: 0.25,
  onTargetXg: 0.3,
  blockedShare: 0.25,

  // cross e piazzati
  crossMinX: 8.3,
  crossBase: 0.2,
  crossSkill: 0.1,
  crossAtt: 0.35, // per attaccante in area
  crossDef: 0.25, // per difensore in area
  crossPress: 0.5,
  headerXg: 0.1,
  cornerAfterSave: 0.45,
  cornerAfterBlock: 0.5,
  cornerAfterClear: 0.6,
  cornerHeader: 0.3,
  cornerHeaderXg: 0.07,
  fkShot: 0.4,
  fkXg: 0.05,

  // scelta dell'opzione (§6.2 punto 4): softmax con temperatura
  tempBase: 0.008,
  tempDecisions: 0.04, // per punto di Decisioni sotto 11
  tempPressure: 0.25,
  directnessK: 0.004, // bonus per zona guadagnata, scalato dall'istruzione "verticalità"
  shotBias: 0.84,

  // contrasti, falli, cartellini, infortuni
  foulBase: 0.3,
  foulAggression: 0.05,
  foulInBox: 0.12, // in area si entra con più cautela
  pressFoul: 0.045, // fallo "di pressione" per unità di pressione, a ogni azione
  yellowP: 0.18,
  bookedCaution: 0.35, // probabilità di giallo ridotta per chi è già ammonito
  redP: 0.003,
  injuryOnFoul: 0.025,
  injuryPerPlayer: 0.006, // infortunio "senza contatto" per giocatore a partita (× rischio personale, injuries.ts)

  // condizione fisica
  drainBase: 0.22, // energia persa al minuto
  drainStamina: 0.25, // in più con Resistenza bassa
  energySkill: 0.012, // logit perso per ogni punto di energia sotto 100
  fitnessRecoveryPerDay: 12,
  subMinutes: [58, 68, 78],
  subEnergy: 74,
  maxSubs: 5,
  benchSize: 9,

  // momentum (§6.5)
  momentumGoal: 25,
  momentumShot: 3,
  momentumDecay: 0.97,
  momentumK: 0.15, // logit massimo dato dal momentum, attenuato dalla Compostezza

  // persone (F5): logit in più/in meno per il portatore
  moraleK: 0.002, // per punto di morale sopra/sotto 60
  sharpK: 0.003, // per punto di condizione partita sotto 100
  famK: 0.15, // modulo del tutto sconosciuto
  chemPass: 0.08, // peso della scelta di passaggio: ±8% tra amici/nemici (§7.3)

  homeBoost: 0.12, // logit in più per la squadra di casa (pubblico)
  protectLeadFrom: 55, // minuto da cui chi è in vantaggio abbassa la mentalità di 1
  chaseFrom: 60, // minuto da cui chi è sotto la alza di 1 (di 2 dal 75')
} as const;

// Rosa tipo per ruolo naturale (25 giocatori: 3 POR, 8 DIF, 8 CEN, 6 ATT)
export const SQUAD_TEMPLATE: Record<Position, number> = {
  GK: 3, DL: 2, DC: 4, DR: 2, DM: 2, ML: 1, MC: 3, MR: 1, AML: 1, AMC: 1, AMR: 1, ST: 4,
};

// ruoli vicini: familiarità secondaria
export const ADJACENT: Partial<Record<Position, Position[]>> = {
  DL: ['ML'], DR: ['MR'], DC: ['DM'], DM: ['MC', 'DC'], MC: ['DM', 'AMC'],
  ML: ['AML', 'DL'], MR: ['AMR', 'DR'], AMC: ['MC', 'ST'], AML: ['ML', 'ST'], AMR: ['MR', 'ST'], ST: ['AMC'],
};

// --- mercato (GUIDA §7.5) ---
// Il valore è derivato, mai salvato. La spina dorsale è 10^(CA/caK + caC): ≈70M a CA 170, ≈1,4M a CA 110.
export const MARKET = {
  caK: 35,
  caC: 3,
  // età: si paga il picco, si svaluta la coda
  peakFrom: 24,
  peakTo: 29,
  youngGap: 1 / 60, // per punto di potenziale non ancora espresso, sotto i 24 anni
  youngMax: 1.8, // tetto al premio per il potenziale
  oldFrom: 30,
  oldRate: 0.15, // valore perso per anno oltre i 30: a 34 anni vale meno della metà di un 27enne pari abilità
  oldFloor: 0.2,
  // contratto residuo (anni): chi scade vale meno perché puoi aspettarlo
  contractShort: 0.45, // scade a fine stagione
  contractOne: 0.75,
  contractLong: 1.08, // tre anni o più
  // ruolo: il mercato non paga tutti i ruoli allo stesso modo
  roleMul: { GK: 0.75, DC: 0.85, DL: 0.9, DR: 0.9, DM: 0.95, MC: 1, ML: 1, MR: 1, AMC: 1.15, AML: 1.12, AMR: 1.12, ST: 1.2 } as Record<Position, number>,
  homeNation: 1.06, // giocatore della stessa nazione della lega: meno attriti, più richiesta
  repK: 0.0025, // per punto di reputazione del club di appartenenza
  formK: 0.04, // per punto di media voto sopra o sotto il 6,5 nelle ultime 5
  formMax: 0.2,
  wantsOut: 0.85, // chi ha chiesto la cessione ha meno potere contrattuale
  wageOfValue: 0.12, // stipendio annuo tipico come quota del valore
  wageMin: 30000,
} as const;

// --- trattative (GUIDA §7.5) ---
// La trattativa è a concessioni alternate: il venditore parte alto, scende verso un prezzo di riserva
// che il compratore non vede mai, e perde la pazienza se viene preso in giro.
export const DEAL = {
  askStart: 1.45, // prima richiesta, come multiplo del valore
  sellPremium: 0.7, // sovrapprezzo massimo per chi non vuole vendere per niente
  fireSale: 0.55, // sconto massimo per chi vuole liberarsene (fuori rosa, ha chiesto la cessione, scade)
  needPremium: 0.6, // quanto in più è disposto a pagare chi ha un buco in quel ruolo
  noise: 0.08, // rumore sul prezzo di riserva: due club non valutano mai identico
  // come il venditore valuta un pacchetto che non è solo contanti
  instalment: 0.07, // sconto per ogni anno di dilazione
  bonusOdds: 0.45, // quanto conta un bonus presenze/gol: si incassa forse
  sellOnWorth: 0.45, // la % rivendita vale meno di quanto varrebbe incassata oggi
  swapDiscount: 0.7, // le contropartite si valutano meno del loro prezzo di listino
  swapUnwanted: 0.45, // ...e molto meno se in quel ruolo sei già coperto
  optionWorth: 0.3, // un diritto di riscatto vale una frazione dell'obbligo
  loanFeeWorth: 1, // il prestito oneroso si incassa e basta
  // concessioni e pazienza
  concession: 0.22, // quanto il venditore si avvicina al proprio limite a ogni giro
  accept: 0.99, // si accetta a partire da questa quota della richiesta
  minStep: 0.04, // rilancio minimo perché l'offerta non sia una presa in giro
  patienceRound: 12, // pazienza persa a ogni giro
  patienceLowball: 28, // pazienza persa per un rilancio irrisorio
  patiencePro: 1.4, // il club più blasonato ne ha meno: tratta da posizione di forza
  rounds: 8, // oltre questi giri la trattativa si chiude comunque
  walkAway: 1.5, // il compratore molla se la richiesta supera di tanto il proprio tetto
  reopenDays: 14, // giorni prima di poter riaprire dopo una rottura
  agentCut: 0.06, // commissione dell'agente sull'affare
} as const;

// --- agenti (GUIDA §7.5) ---
export const AGENT = {
  portfolio: [5, 18] as const, // quanti assistiti a testa
  greedCut: 0.6, // moltiplicatore base della commissione, + avidità/20
  grudge: 0.01, // commissione in più per punto di memoria negativa verso il club
  memoryDrift: 1.5, // la memoria torna verso lo zero, a settimana
  brokenPromise: 22, // memoria persa quando l'allenatore rompe una promessa a un assistito
  keptPromise: 10,
  soldWell: 8, // memoria guadagnata da un affare concluso
  walkedAway: 6, // memoria persa da una trattativa rotta
  renewFrom: 1, // anni di contratto residuo sotto i quali l'agente chiede il rinnovo
  renewAsk: 1.25, // stipendio chiesto al rinnovo, come multiplo di quello coerente col valore
  renewGreed: 0.02, // in più per punto di avidità sopra 10
  proposeP: 0.1, // probabilità settimanale che un agente proponga un assistito a un club
  threatFrom: -50, // sotto questa memoria l'agente comincia a spingere per l'uscita
  threatMorale: 45, // ...e serve anche un assistito scontento
  threatP: 0.25,
} as const;

// --- IA di mercato dei club (GUIDA §7.5, §7.9) ---
export const CLUB_AI = {
  budgetShare: 0.45, // quota di cassa che un club è disposto a spendere in una finestra
  wageCapOfRevenue: 0.7, // monte ingaggi sostenibile: oltre si vende e non si compra
  revenuePerSeat: 1100, // ponytail: fatturato stimato da stadio e blasone finché non ci sono le finanze (§7.7, F8)
  revenuePerRep2: 9700, // per reputazione al quadrato: i diritti tv e gli sponsor non sono lineari
  squadMax: 30, // oltre questa rosa non si compra
  squadMin: 22,
  starterBonus: 15, // il titolare di un club sta sopra la media della sua rosa: è quello il livello da tenere
  needCount: 0.6, // urgenza per ogni uomo mancante rispetto alla rosa tipo
  needQuality: 0.05, // urgenza per punto di CA mancante
  buyFrom: 0.35, // urgenza minima per aprire una trattativa
  dealsPerWindow: 3, // tentativi di acquisto per club in una finestra
  shortlist: 6,
  upgrade: 4, // punti di CA in più perché valga la pena comprarlo
  // gusto: moltiplicatore di appetito secondo la filosofia
  tasteYouth: 0.06, // per anno sotto i 24
  tasteVeteran: 0.05, // per anno sopra i 28
  tastePhysical: 0.02, // per punto di fisico sopra la media
  tasteTechnical: 0.02,
  // finestra invernale, in giorni dall'inizio stagione
  winterFrom: 175,
  winterTo: 189,
  winterDeals: 1,
  // quanto è disposto a cedere il venditore
  sellExcluded: 0.95,
  sellWantsOut: 0.8,
  sellExpiring: 0.7,
  sellSurplus: 0.6,
  sellKey: 0.08,
  sellStripped: 0.05, // rosa già ridotta all'osso
  sellBackup: 0.32,
  contractYears: [3, 5] as const,
} as const;

// --- contratti (GUIDA §7.5) ---
export const CONTRACT = {
  yearsYoung: 5, // durata offerta sotto i 24 anni
  yearsPeak: 4,
  yearsOld: 2, // sopra i 31
  oldFrom: 31,
  youngTo: 24,
  releaseMul: 2.2, // clausola rescissoria come multiplo del valore, quando c'è
  releaseP: 0.25, // quanti contratti ne hanno una
  acceptWage: 0.92, // accetta se gli offri almeno questa quota di quanto chiede…
  loyalty: 0.02, // …meno uno sconto per ogni punto di Lealtà sopra 10 (al massimo il 20%)
  ambitionLevel: 0.02, // chi è ambizioso vuole anche il club all'altezza: per punto di reputazione mancante
  unhappyRefuse: 40, // sotto questo morale non rinnova comunque
  renewFrom: 1, // si rinnova quando mancano al massimo tot stagioni
  keepBelowAge: 33, // oltre questa età un club IA non rinnova quasi mai
  keepGap: -18, // se è sotto il livello del club di così tanto, si lascia andare
  preContractFrom: 175, // da gennaio (stesso giorno della finestra invernale) si firma a parametro zero
  freeWageMul: 1.15, // chi arriva gratis chiede più stipendio: non c'è cartellino da pagare
  loanMaxAge: 21, // oltre questa età non è più un prestito formativo
  loanRank: 2, // quanti gli stanno davanti nel ruolo perché convenga mandarlo a giocare
  loanRepGap: 8, // il club ospite deve essere di un gradino sotto
  loanP: 0.45,
  loanMinutes: 45, // minuti garantiti tipici in un prestito con condizioni
  loanBuyMul: 1.05, // riscatto pattuito, sul valore di oggi
} as const;

// --- scouting e informazione imperfetta (GUIDA §7.6) ---
export const SCOUT = {
  // quello che si sa gratis
  publicBase: 8,
  publicRep: 0.35, // per punto di reputazione del club
  publicApps: 0.4, // per presenza in carriera
  publicAppsMax: 25,
  publicCap: 62, // senza osservatori non si arriva mai a conoscerlo davvero
  // incertezza
  bandMax: 5, // ± punti su un attributo, a conoscenza zero
  caBand: 22, // ± sull'abilità attuale
  paBand: 40, // ± sul potenziale
  paFloor: 6, // il potenziale non si sa mai con certezza
  noiseShare: 0.55, // quanta parte della banda è errore casuale
  biasShare: 0.5, // …e quanta errore sistematico dell'osservatore
  personalityAt: 55, // conoscenza da cui si capisce che tipo è
  sampleOk: 12, // sotto queste presenze i numeri per 90 minuti non dicono niente
  // osservatori
  perClub: 3,
  freePool: 12,
  wageBase: 40000,
  wagePerJudge: 6000,
  weekGain: 2.2, // conoscenza a settimana su un giocatore osservato
  judgeGain: 0.12, // per punto di Giudizio
  contactGain: 0.01, // per punto di rete di contatti nella sua nazione
  watchPerWeek: 6, // quanti giocatori riesce a seguire in una settimana
  analystGain: 1.2, // l'analista dati cresce più piano ma su tutti i giocatori dell'incarico
  analystWatch: 20,
  reportAt: 45, // conoscenza da cui manda un rapporto
  reportEvery: 25, // e poi ogni tot punti in più
} as const;
