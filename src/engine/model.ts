// Modello dati (GUIDA §4). Entità normalizzate in Record<id, entità>, riferimenti per id.
// Questo stesso formato è quello del "database della community" caricabile dall'utente.
import type { RngState } from './rng.ts';

// ponytail: id numerici semplici, branded types quando ci saranno più tipi di id che si confondono
export type PlayerId = number;
export type ClubId = number;
export type CompId = string;

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
  psych: { morale: number }; // 0-100, il resto arriva in F5
  condition: { fitness: number };
  contract: { wage: number; until: number }; // stipendio annuo, anno di scadenza
  stats: { apps: number; goals: number; assists: number };
  history: { season: number; clubId: ClubId; apps: number; goals: number }[];
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
  stadium: { name: string; capacity: number };
  balance: number;
  compId: CompId;
  playerIds: PlayerId[];
}

export type MatchEvent = { min: number; side: 0 | 1; type: 'goal'; playerId: PlayerId; assistId?: PlayerId };

export interface Fixture {
  day: number; // giorni dall'inizio stagione
  home: ClubId;
  away: ClubId;
  result?: { hg: number; ag: number; events: MatchEvent[] };
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
  manager: { name: string; clubId: ClubId };
  players: Record<PlayerId, Player>;
  clubs: Record<ClubId, Club>;
  competitions: Record<CompId, Competition>;
  history: SeasonRecord[];
  nextPlayerId: number;
}
