// Abilità (CA) per ruolo, generazione giocatori, valore. Lo sviluppo è in development.ts.
import { ADJACENT, BALANCE } from './balance.ts';
import { ALL_ATTRS, ATTR_GROUPS, type AttrKey, type Attributes, type Personality, type Player, type Position } from './model.ts';
import { NATIONS } from './names.ts';
import type { Rng } from './rng.ts';
import { value, wageFor } from './transfers/valuation.ts';

// Profili di ruolo: attributi chiave per posizione (GUIDA §5.2). I 25 ruoli fini arrivano con la tattica.
export const PROFILES: Record<Position, AttrKey[]> = {
  GK: ['reflexes', 'oneOnOnes', 'handling', 'aerialReach', 'commandOfArea', 'communication', 'kicking', 'rushingOut', 'positioning', 'concentration'],
  DC: ['marking', 'tackling', 'heading', 'positioning', 'anticipation', 'bravery', 'strength', 'concentration'],
  DL: ['tackling', 'marking', 'crossing', 'pace', 'stamina', 'positioning', 'workRate', 'acceleration'],
  DR: ['tackling', 'marking', 'crossing', 'pace', 'stamina', 'positioning', 'workRate', 'acceleration'],
  DM: ['tackling', 'passing', 'positioning', 'anticipation', 'teamwork', 'workRate', 'concentration', 'firstTouch'],
  MC: ['passing', 'firstTouch', 'technique', 'vision', 'decisions', 'teamwork', 'workRate', 'stamina'],
  ML: ['crossing', 'dribbling', 'passing', 'pace', 'stamina', 'workRate', 'technique', 'acceleration'],
  MR: ['crossing', 'dribbling', 'passing', 'pace', 'stamina', 'workRate', 'technique', 'acceleration'],
  AMC: ['passing', 'technique', 'vision', 'firstTouch', 'dribbling', 'flair', 'offTheBall', 'longShots'],
  AML: ['dribbling', 'pace', 'acceleration', 'technique', 'crossing', 'flair', 'offTheBall', 'finishing'],
  AMR: ['dribbling', 'pace', 'acceleration', 'technique', 'crossing', 'flair', 'offTheBall', 'finishing'],
  ST: ['finishing', 'offTheBall', 'composure', 'firstTouch', 'heading', 'pace', 'acceleration', 'dribbling'],
};
// attributi che contano per tutti i giocatori di movimento
export const GENERAL: AttrKey[] = ['decisions', 'composure', 'anticipation', 'teamwork', 'pace', 'acceleration', 'stamina', 'strength', 'agility'];
const GK_ATTRS = new Set<AttrKey>(ATTR_GROUPS.goalkeeping);
const OUTFIELD_ONLY = new Set<AttrKey>(['crossing', 'dribbling', 'finishing', 'heading', 'longShots', 'marking', 'tackling', 'offTheBall', 'flair']);
const LEFT_SIDED = new Set<Position>(['DL', 'ML', 'AML']);
const RIGHT_SIDED = new Set<Position>(['DR', 'MR', 'AMR']);

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const mean = (p: Player, keys: readonly AttrKey[]) => keys.reduce((s, k) => s + p.attrs[k], 0) / keys.length;

/** abilità del giocatore nel ruolo (scala 1-200) senza penalità di familiarità */
export function abilityAt(p: Player, pos: Position): number {
  const core = mean(p, PROFILES[pos]);
  return pos === 'GK' ? Math.round(core * 10) : Math.round((0.65 * core + 0.35 * mean(p, GENERAL)) * 10);
}

const FAMILIARITY_FACTOR = [0.55, 0.6, 0.7, 0.82, 0.93, 1];

/** rendimento atteso nel ruolo: abilità × familiarità */
export function ratingAt(p: Player, pos: Position): number {
  if ((pos === 'GK') !== (p.position === 'GK')) return 10; // portiere fuori dalla porta e viceversa
  return abilityAt(p, pos) * FAMILIARITY_FACTOR[p.positions[pos] ?? 0]!;
}

export const emptyStats = (): Player['stats'] => ({ apps: 0, goals: 0, assists: 0, yellows: 0, reds: 0, ratingSum: 0 });

export function recomputeCA(p: Player) {
  p.ca = abilityAt(p, p.position);
}

export function age(p: Player, season: number) {
  return season - p.birthYear;
}


function personality(rng: Rng): Personality {
  const axis = () => Math.round(clamp(rng.gauss(11, 4), 1, 20));
  return { ambition: axis(), professionalism: axis(), loyalty: axis(), temperament: axis(), sociability: axis(), pressureTolerance: axis() };
}

function pickNation(rng: Rng) {
  const keys = Object.keys(NATIONS);
  return keys[rng.weighted(keys.map((k) => NATIONS[k]!.w))]!;
}

/** distribuisce un CA obiettivo sugli attributi secondo il profilo di ruolo (GUIDA §5.2 punto 3) */
function distribute(rng: Rng, pos: Position, targetCA: number): Attributes {
  const level = targetCA / 10;
  const core = new Set(PROFILES[pos]);
  const general = new Set(GENERAL);
  const attrs = {} as Attributes; // riempito sotto per ogni chiave di ALL_ATTRS
  for (const k of ALL_ATTRS) {
    let v: number;
    if (pos === 'GK') v = core.has(k) ? level + 1 + rng.gauss(0, 1.5) : OUTFIELD_ONLY.has(k) ? rng.int(1, 6) : level - 2 + rng.gauss(0, 2.5);
    else if (GK_ATTRS.has(k)) v = rng.int(1, 4);
    else if (core.has(k)) v = level + 1.5 + rng.gauss(0, 1.5);
    else if (general.has(k)) v = level + rng.gauss(0, 1.8);
    else v = level - 3 + rng.gauss(0, 2.5);
    attrs[k] = Math.round(clamp(v, 1, 20));
  }
  return attrs;
}

export function makePlayer(rng: Rng, id: number, pos: Position, meanCA: number, season: number, ageRange?: [number, number]): Player {
  const nation = pickNation(rng);
  const names = NATIONS[nation]!;
  const a = ageRange ? rng.int(ageRange[0], ageRange[1]) : Math.round(clamp(rng.gauss(BALANCE.ageMean, BALANCE.ageSigma), 17, 36));
  let ca = meanCA + rng.gauss(0, BALANCE.caSpread) - Math.max(0, 22 - a) * BALANCE.youthPenaltyPerYear;
  ca = clamp(ca, 25, 190);
  const pa = clamp(
    a <= 23 ? ca + Math.max(0, rng.gauss(25, 15)) + (23 - a) * 5 : ca + Math.max(0, rng.gauss(3, 4)),
    ca, 200,
  );
  const positions: Player['positions'] = { [pos]: 5 };
  for (const adj of ADJACENT[pos] ?? []) if (rng.next() < 0.5) positions[adj] = rng.int(2, 4);

  const p: Player = {
    id,
    firstName: rng.pick(names.first),
    lastName: rng.pick(names.last),
    birthYear: season - a,
    nation,
    foot: LEFT_SIDED.has(pos) ? (rng.next() < 0.8 ? 'L' : 'R') : RIGHT_SIDED.has(pos) ? 'R' : rng.next() < 0.2 ? 'L' : rng.next() < 0.1 ? 'B' : 'R',
    heightCm: Math.round(clamp(rng.gauss(pos === 'GK' ? 190 : pos === 'DC' ? 187 : 180, 5), 165, 202)),
    clubId: null,
    position: pos,
    positions,
    attrs: distribute(rng, pos, ca),
    ca: 0,
    pa: Math.round(pa),
    personality: personality(rng),
    hidden: { injuryProneness: Math.round(clamp(rng.gauss(10, 4), 1, 20)) },
    psych: { morale: 68, trust: 50, minutes: 0.5, wantsOut: false },
    rel: {},
    mentorId: null, agentId: null,
    condition: { fitness: 100, injuryDays: 0, sharpness: 70, fatigue: 0, injury: null, relapse: 0 },
    discipline: { yellows: 0, ban: 0 },
    form: [],
    contract: { wage: 0, until: season + rng.int(1, 5), release: null, sellOn: 0, sellOnTo: null, loan: null, preSigned: null },
    stats: emptyStats(),
    history: [],
    caLog: [],
  };
  recomputeCA(p);
  p.pa = Math.max(p.pa, p.ca);
  p.contract.wage = wageFor(value(p, season));
  return p;
}
