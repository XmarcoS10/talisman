// Modello dati (GUIDA §4). Entità normalizzate in Record<id, entità>, riferimenti per id.
// Questo stesso formato è quello del "database della community" caricabile dall'utente.
import type { RoleId } from './match/roles.ts';
import type { RngState } from './rng.ts';

// ponytail: id numerici semplici, branded types quando ci saranno più tipi di id che si confondono
export type PlayerId = number;
export type ClubId = number;
export type CompId = string;
export type AgentId = number;

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
  condition: Condition;
  discipline: { yellows: number; ban: number }; // gialli stagionali, giornate di squalifica residue
  form: number[]; // voti delle ultime 5 partite
  contract: { wage: number; until: number }; // stipendio annuo, anno di scadenza
  stats: { apps: number; goals: number; assists: number; yellows: number; reds: number; ratingSum: number };
  history: { season: number; clubId: ClubId; apps: number; goals: number; ca: number }[];
  caLog: number[]; // CA ogni 4 giornate della stagione in corso (grafico di crescita)
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
  compId: CompId;
  playerIds: PlayerId[];
  tactic: Tactic;
  lineup?: (PlayerId | null)[]; // titolari scelti dall'allenatore, slot per slot (solo club dell'utente)
  training: TrainingCat[]; // settimana tipo: 12 sedute (mattina/pomeriggio × 6 giorni)
  familiarity: Partial<Record<FormationId, number>>; // quanto la squadra conosce ogni modulo 0-100
  excluded: PlayerId[]; // fuori rosa
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

export interface WorldState {
  schemaVersion: number;
  seed: number;
  rng: RngState;
  season: number; // anno di inizio stagione (2026 = 2026/27)
  day: number; // prossimo giorno da giocare
  manager: { name: string; clubId: ClubId; kept: number; broken: number }; // promesse mantenute/rotte: memoria pluriennale
  players: Record<PlayerId, Player>;
  clubs: Record<ClubId, Club>;
  agents: Record<AgentId, Agent>;
  competitions: Record<CompId, Competition>;
  history: SeasonRecord[];
  news: NewsItem[]; // notizie per l'utente, le più recenti in fondo
  causal: CausalEvent[]; // registro delle cause per i giocatori dell'utente, i più recenti in fondo
  promises: PlayerPromise[]; // promesse attive dell'utente
  nextPlayerId: number;
  nextAgentId: number;
}
