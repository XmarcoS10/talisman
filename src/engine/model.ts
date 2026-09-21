// Modello dati (GUIDA §4). Entità normalizzate in Record<id, entità>, riferimenti per id.
// Questo stesso formato è quello del "database della community" caricabile dall'utente.
import type { RoleId } from './match/roles.ts';
import type { RngState } from './rng.ts';

// ponytail: id numerici semplici, branded types quando ci saranno più tipi di id che si confondono
export type PlayerId = number;
export type ClubId = number;
export type CompId = string;
export type AgentId = number;
export type ScoutId = number;

export const POSITIONS = ['GK', 'DL', 'DC', 'DR', 'DM', 'ML', 'MC', 'MR', 'AML', 'AMC', 'AMR', 'ST'] as const;
export type Position = (typeof POSITIONS)[number];

// §4.3 — nomi in inglese, etichette italiane in i18n
export const ATTR_GROUPS = {
  technical: ['corners', 'crossing', 'dribbling', 'finishing', 'firstTouch', 'freeKicks', 'heading', 'longShots', 'marking', 'passing', 'penalties', 'tackling', 'technique'],
  mental: ['aggression', 'anticipation', 'bravery', 'composure', 'concentration', 'decisions', 'determination', 'flair', 'leadership', 'offTheBall', 'positioning', 'teamwork', 'vision', 'workRate', 'tacticalAdaptability', 'resilience', 'socialInfluence'],
  physical: ['acceleration', 'agility', 'balance', 'pace', 'stamina', 'strength'],
  goalkeeping: ['aerialReach', 'commandOfArea', 'communication', 'handling', 'kicking', 'oneOnOnes', 'reflexes', 'rushingOut', 'eccentricity'],
} as const;
export type AttrKey = (typeof ATTR_GROUPS)[keyof typeof ATTR_GROUPS][number];
export const ALL_ATTRS: readonly AttrKey[] = Object.values(ATTR_GROUPS).flat();
export type Attributes = Record<AttrKey, number>; // 1-20

// §4.4 — sei assi, l'etichetta mostrata è derivata
export interface Personality {
  ambition: number;
  professionalism: number;
  loyalty: number;
  temperament: number;
  sociability: number;
  pressureTolerance: number;
}

export interface Player {
  id: PlayerId;
  firstName: string;
  lastName: string;
  birthYear: number;
  nation: string;
  foot: 'L' | 'R' | 'B';
  heightCm: number;
  clubId: ClubId | null;
  position: Position; // ruolo naturale
  positions: Partial<Record<Position, number>>; // familiarità 1-5 (5 = naturale)
  attrs: Attributes;
  ca: number; // cache di abilità attuale 1-200, ricalcolata da attrs con recomputeCA
  pa: number; // potenziale 1-200
  personality: Personality;
  hidden: { injuryProneness: number }; // attributi nascosti 1-20 (§4.3), mai mostrati
  psych: Psych;
  rel: Record<PlayerId, number>; // grafo sociale (§7.3): forza −100…100 verso i compagni, solo archi non neutri, simmetrico
  mentorId: PlayerId | null; // veterano che gli fa da mentore (§7.1)
  agentId: AgentId | null; // chi cura i suoi interessi (§7.5)
  intl: { caps: number; goals: number; titles: number }; // carriera in nazionale (§7.8)
  condition: Condition;
  discipline: { yellows: number; ban: number }; // gialli stagionali, giornate di squalifica residue
  form: number[]; // voti delle ultime 5 partite
  contract: Contract;
  stats: { apps: number; goals: number; assists: number; yellows: number; reds: number; ratingSum: number };
  history: { season: number; clubId: ClubId; apps: number; goals: number; ca: number }[];
  caLog: number[]; // CA ogni 4 giornate della stagione in corso (grafico di crescita)
}

/** contratto (§7.5): stipendio annuo, scadenza, clausole, prestito in corso */
export interface Contract {
  wage: number;
  until: number; // stagione in cui scade (until < season = svincolato)
  release: number | null; // clausola rescissoria: pagata per intero, il club non può opporsi
  sellOn: number; // quota della prossima rivendita dovuta al club precedente, 0…0.3
  sellOnTo: ClubId | null; // a chi è dovuta
  loan: Loan | null;
  preSigned: ClubId | null; // ha già firmato per un altro club a parametro zero (§7.5)
}

/** prestito con condizioni (§7.5) */
export interface Loan {
  from: ClubId; // il proprietario del cartellino
  until: number; // stagione di rientro
  minutes: number; // minuti garantiti a partita, 0 = nessuna condizione
  noPlayVsOwner: boolean; // non può essere schierato contro chi lo possiede
  buy: number | null; // riscatto pattuito
  obligation: boolean; // obbligo invece che diritto
}

export interface Condition {
  fitness: number; // energia nel breve 0-100
  injuryDays: number; // > 0 = indisponibile
  sharpness: number; // condizione partita 0-100: sale giocando, cala da fermo
  fatigue: number; // affaticamento stagionale 0-100 (invisibile): spiega i cali di marzo
  injury: { id: string; total: number } | null; // ultimo infortunio, finché c'è rischio di ricaduta
  relapse: number; // giorni di rientro "a rischio" dopo la guarigione
}

export interface Psych {
  morale: number; // 0-100
  trust: number; // rapporto con l'allenatore 0-100
  minutes: number; // minutaggio recente 0-1 (media mobile delle ultime partite)
  wantsOut: boolean; // ha chiesto la cessione (promessa rotta): pesa sul mercato (F7)
}

/**
 * agente (§7.5). Ha una personalità e una memoria per club: chi gli ha rotto una promessa paga di più,
 * chi lo ha trattato bene vede i suoi assistiti per primo.
 */
export interface Agent {
  id: AgentId;
  name: string;
  greed: number; // 1-20: quanto vuole di commissione
  honesty: number; // 1-20: basso = gonfia le richieste e apre aste
  reach: number; // 1-20: quanto riesce a muovere il mercato
  clientIds: PlayerId[];
  memory: Record<ClubId, number>; // −100…100 verso ogni club, solo i rapporti non neutri
}

/** filosofia del club (§7.9): decide il gusto sul mercato, non la forza */
export const PHILOSOPHIES = ['youth', 'veterans', 'physical', 'technical', 'balanced'] as const;
export type Philosophy = (typeof PHILOSOPHIES)[number];

/**
 * osservatore (§7.6). Giudizio, rete di contatti per area geografica e un bias sistematico:
 * un osservatore mediocre non fa solo rumore, sbaglia sempre nella stessa direzione. Le bufale sono una feature.
 */
export interface Scout {
  id: ScoutId;
  name: string;
  nation: string;
  clubId: ClubId | null; // null = libero, assumibile
  judgeAbility: number; // 1-20, giudizio delle abilità
  judgePotential: number; // 1-20, giudizio del potenziale
  bias: number; // −1 pessimista … +1 ottimista, sistematico
  contacts: Record<string, number>; // nazione → forza della rete 0-100
  wage: number;
  assignment: ScoutTask | null;
  analyst: boolean; // analista dati invece che osservatore sul campo
}

/** incarico: una nazione, un club o un singolo giocatore */
export type ScoutTask =
  | { kind: 'nation'; nation: string }
  | { kind: 'club'; clubId: ClubId }
  | { kind: 'player'; playerId: PlayerId };

/** quanto ne sappiamo di un giocatore non nostro (§7.6) */
export interface Known {
  k: number; // conoscenza 0-100
  by: ScoutId | null; // chi ce l'ha messa: il suo bias colora la stima
  reports: ScoutReport[];
}

export interface ScoutReport {
  season: number;
  day: number;
  scoutId: ScoutId;
  verdict: string; // chiave i18n
  ca: [number, number]; // intervallo stimato
  pa: [number, number];
}

/** rata di un trasferimento ancora da incassare o da pagare (§7.7) */
export interface Instalment {
  to: ClubId; // la controparte: per un debito chi incassa, per un credito chi paga
  amount: number; // quota per stagione
  seasons: number; // quante ne restano
}

/** una voce del conto economico della stagione, in euro */
export interface Books {
  season: number;
  gate: number; // biglietti
  tv: number;
  sponsor: number;
  merch: number;
  prize: number; // premi di classifica
  transfersIn: number;
  wages: number;
  staff: number;
  stadium: number;
  transfersOut: number;
  monthly: number[]; // cassa alla fine di ogni blocco di 30 giorni della stagione (grafico mese per mese)
}

export interface Club {
  id: ClubId;
  name: string;
  shortName: string;
  city: string;
  colors: [string, string, string];
  crest: string | null; // dataURL/percorso dal database importato; null = stemma procedurale
  founded: number;
  reputation: number; // 1-100
  philosophy: Philosophy;
  stadium: { name: string; capacity: number };
  balance: number;
  books: Books[]; // conto economico stagione per stagione, il più recente in fondo (§7.7)
  debts: Instalment[]; // rate ancora da pagare
  credits: Instalment[]; // rate ancora da incassare
  sanction: { kind: 'none' | 'warning' | 'freeze' | 'points'; seasons: number; points: number }; // fair play finanziario
  compId: CompId;
  playerIds: PlayerId[];
  tactic: Tactic;
  lineup?: (PlayerId | null)[]; // titolari scelti dall'allenatore, slot per slot (solo club dell'utente)
  training: TrainingCat[]; // settimana tipo: 12 sedute (mattina/pomeriggio × 6 giorni)
  familiarity: Partial<Record<FormationId, number>>; // quanto la squadra conosce ogni modulo 0-100
  excluded: PlayerId[]; // fuori rosa
  scoutIds: ScoutId[];
  youth: { facilities: number; recruitment: number }; // settore giovanile 1-20 (§7.8)
  feuds: Feud[]; // faide aperte nello spogliatoio
}

export const TRAINING_CATS = ['tactical', 'physical', 'technical', 'setPieces', 'match', 'recovery', 'rest'] as const;
export type TrainingCat = (typeof TRAINING_CATS)[number];

export interface Feud {
  a: PlayerId;
  b: PlayerId;
  season: number;
  day: number;
}

/** promessa dell'allenatore a un giocatore, verificata da sola a scadenza (§7.3) */
export interface PlayerPromise {
  playerId: PlayerId;
  kind: 'starter' | 'minutes'; // titolare / più spazio
  need: number; // presenze richieste…
  left: number; // …nelle prossime `left` partite
  apps: number; // presenze fatte finora
}

/** voce del registro delle cause (Causal Log): perché è cambiato un attributo, il morale, un rapporto */
export interface CausalEvent {
  season: number;
  day: number;
  playerId: PlayerId;
  key: string; // chiave i18n
  vars: Record<string, string | number>;
}

export const FORMATION_IDS = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2'] as const;
export type FormationId = (typeof FORMATION_IDS)[number];

/** tattica di squadra (GUIDA §6.4). Istruzioni 0 = basso, 1 = standard, 2 = alto */
export interface Tactic {
  formation: FormationId;
  mentality: number; // 1 difensiva … 5 molto offensiva
  pressing: number;
  tempo: number;
  width: number;
  line: number; // linea difensiva
  directness: number; // passaggi diretti/verticali
  roles: RoleId[]; // ruolo di ogni slot del modulo, nello stesso ordine
}

export interface NewsItem {
  season: number;
  day: number;
  key: string; // chiave i18n
  vars: Record<string, string | number>;
}

export type MatchEventType = 'goal' | 'penGoal' | 'penMiss' | 'chance' | 'yellow' | 'red' | 'injury' | 'sub';
export type MatchEvent = {
  min: number;
  side: 0 | 1;
  type: MatchEventType;
  playerId: PlayerId;
  assistId?: PlayerId; // per 'sub': chi entra
  xg?: number;
};

export interface SideStats {
  possession: number; // %
  shots: number;
  onTarget: number;
  xg: number;
  passes: number;
  passesOk: number;
  tackles: number;
  fouls: number;
  corners: number;
  offsides: number;
  yellows: number;
  reds: number;
}

export interface MatchResult {
  hg: number;
  ag: number;
  events: MatchEvent[];
  stats: [SideStats, SideStats];
  ratings: Record<PlayerId, number>; // voto di chi è sceso in campo
}

export interface Fixture {
  day: number; // giorni dall'inizio stagione
  home: ClubId;
  away: ClubId;
  result?: MatchResult;
}

export interface Competition {
  id: CompId;
  name: string;
  level: number; // 1 = massima serie
  clubIds: ClubId[];
  fixtures: Fixture[];
  promote: number; // quante salgono di categoria (0 in cima)
  relegate: number; // quante scendono (0 in fondo)
}

export interface SeasonRecord {
  season: number;
  compId: CompId;
  championId: ClubId;
  topScorer: { playerId: PlayerId; goals: number } | null;
}

/** l'offerta, con tutti i parametri della specifica */
export interface Offer {
  fee: number; // parte fissa
  years: number; // in quante stagioni è rateizzata (1 = subito)
  bonusApps: number; // bonus presenze
  bonusGoals: number; // bonus gol
  sellOn: number; // % sulla futura rivendita, 0…0.3
  swap: { playerId: PlayerId; value: number; wanted: boolean }[]; // contropartite, col loro valore
  loan: { fee: number; buy: number; obligation: boolean } | null; // prestito con diritto o obbligo di riscatto
  agentFee: number; // commissione all'agente, a carico del compratore
}

export type TalkState = 'open' | 'agreed' | 'broken' | 'closed';

export interface Talk {
  playerId: PlayerId;
  seller: ClubId;
  buyer: ClubId;
  reserve: number; // prezzo di riserva, nascosto al compratore
  ask: number; // richiesta attuale, questa si vede
  last: number; // valore percepito dell'ultima offerta ricevuta
  patience: number; // 0-100
  round: number;
  state: TalkState;
  reopenDay: number; // dal giorno in cui si può riprovare
  deal: Offer | null; // l'offerta accettata
}


/** rapporto con la dirigenza (§7.7): quattro barre separate, e un contratto esplicito rinegoziabile */
export interface Board {
  trust: { board: number; fans: number; squad: number; press: number }; // 0-100
  deal: { seasons: number; position: number }; // obiettivo concordato: entro quante stagioni, quale piazzamento
  capital: number; // capitale politico per le richieste, 0-100
  verdicts: { season: number; position: number; expected: number; trust: number }[];
  sacked: boolean;
}

/** chi è protagonista di una storia: un club, un avversario, un giocatore (§7.4) */
export interface StorySubject {
  club?: ClubId;
  rival?: ClubId;
  player?: PlayerId;
}

/**
 * arco narrativo: nasce da una regola, attraversa tappe, si chiude con un esito o sfuma.
 * Resta nel mondo dopo la chiusura: è la memoria che sopravvive alle stagioni.
 */
export interface Arc {
  id: number;
  rule: string;
  subject: StorySubject;
  stage: number; // tappe raccontate dopo l'apertura
  state: 'open' | 'won' | 'lost' | 'faded';
  opened: number; // giorno assoluto (stagione × 1000 + giorno)
  until: number; // scade qui se nessuno lo chiude prima
  data: Record<string, string | number>; // dati catturati al rilevamento e lungo la strada
  lines: { season: number; day: number; text: string }[];
}

/** effetto dichiarato di una risposta in conferenza stampa: si vede prima di scegliere (§7.4) */
export interface PressEffect {
  target: 'player' | 'squad' | 'board' | 'fans' | 'press';
  playerId?: PlayerId;
  delta: number; // punti di morale (giocatore, squadra) o di fiducia (dirigenza, tifosi, stampa)
}

export interface PressOption {
  text: string;
  effects: PressEffect[];
}

export interface PressQuestion {
  arcId: number | null; // la storia da cui nasce la domanda
  asker: string; // la testata
  text: string;
  options: PressOption[];
  answered: number | null;
}

export interface PressRoom {
  season: number;
  day: number;
  questions: PressQuestion[];
}

/** nazionale (§7.8): gli ultimi convocati e l'albo dei tornei */
export interface National {
  callups: PlayerId[];
  honours: { season: number; tournament: 'world' | 'euro'; place: 'winner' | 'final' | 'semi' | 'quarter' | 'group' }[];
}

export interface WorldState {
  schemaVersion: number;
  seed: number;
  rng: RngState;
  season: number; // anno di inizio stagione (2026 = 2026/27)
  day: number; // prossimo giorno da giocare
  manager: { name: string; clubId: ClubId; kept: number; broken: number; board: Board; h2h: Record<ClubId, string> }; // promesse mantenute/rotte e testa a testa: memoria pluriennale
  players: Record<PlayerId, Player>;
  clubs: Record<ClubId, Club>;
  agents: Record<AgentId, Agent>;
  scouts: Record<ScoutId, Scout>;
  known: Record<PlayerId, Known>; // la nebbia: solo quello che l'utente ha scoperto
  competitions: Record<CompId, Competition>;
  history: SeasonRecord[];
  news: NewsItem[]; // notizie per l'utente, le più recenti in fondo
  causal: CausalEvent[]; // registro delle cause per i giocatori dell'utente, i più recenti in fondo
  promises: PlayerPromise[]; // promesse attive dell'utente
  talks: Talk[]; // trattative aperte dall'utente (§7.5)
  arcs: Arc[]; // storie aperte e ricordate (§7.4)
  press: PressRoom | null; // la conferenza stampa della settimana
  nations: Record<string, National>;
  intake: { season: number; clubId: ClubId; playerIds: PlayerId[] }[]; // ultimi vivai, per la schermata
  nextArcId: number;
  nextPlayerId: number;
  nextAgentId: number;
  nextScoutId: number;
}
