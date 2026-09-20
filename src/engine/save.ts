// Salvataggi versionati (GUIDA §2.5): ogni save ha schemaVersion e passa dalla catena di migrazioni.
import { TRAIN } from './balance.ts';
import { defaultRoles } from './match/tactics.ts';
import { PHILOSOPHIES, type Club, type WorldState } from './model.ts';
import { Rng } from './rng.ts';
import { seedMinutes } from './morale.ts';
import { initRelations } from './social.ts';
import { defaultTraining } from './training.ts';
import { assignAgents } from './transfers/agents.ts';
import { makeScouts } from './scouting/scouts.ts';

export const SCHEMA_VERSION = 10;

// MIGRATIONS[n] porta un save dalla versione n+1 alla n+2. Mai modificarne una già pubblicata.
// I save vecchi non hanno tipi: si lavora su oggetti generici.
type Obj = Record<string, any>; // any giustificato: forma dei dati di versioni precedenti, non tipizzabile
type Raw = Obj & { schemaVersion: number };
const emptySide = () => ({ possession: 50, shots: 0, onTarget: 0, xg: 0, passes: 0, passesOk: 0, tackles: 0, fouls: 0, corners: 0, offsides: 0, yellows: 0, reds: 0 });
const MIGRATIONS: ((w: Raw) => void)[] = [
  // 1 → 2 (F3, motore L2): condizione, disciplina, forma, statistiche estese, tattica di club
  (w) => {
    for (const p of Object.values(w.players as Obj)) {
      p.condition = { fitness: 100, injuryDays: 0 };
      p.discipline = { yellows: 0, ban: 0 };
      p.form = [];
      Object.assign(p.stats, { yellows: 0, reds: 0, ratingSum: 0 });
    }
    for (const c of Object.values(w.clubs as Obj))
      c.tactic = { formation: '4-3-3', mentality: 3, pressing: 1, tempo: 1, width: 1, line: 1, directness: 1 };
    for (const comp of Object.values(w.competitions as Obj))
      for (const fx of comp.fixtures) if (fx.result) Object.assign(fx.result, { stats: [emptySide(), emptySide()], ratings: {} });
  },
  // 2 → 3 (F4, tattica): ruoli per slot, notizie
  (w) => {
    for (const c of Object.values(w.clubs as Obj)) c.tactic.roles = defaultRoles(c.tactic.formation);
    w.news = [];
  },
  // 3 → 4 (F5, persone): allenamento, condizione estesa, psicologia, grafo sociale, promesse, registro delle cause
  (w) => {
    const rng = new Rng(w.seed + w.season);
    for (const p of Object.values(w.players as Obj)) {
      p.hidden = { injuryProneness: Math.round(Math.max(1, Math.min(20, rng.gauss(10, 4)))) };
      p.psych = { morale: p.psych?.morale ?? 68, trust: 50, minutes: 0.5, wantsOut: false };
      p.rel = {};
      p.mentorId = null;
      Object.assign(p.condition, { sharpness: 70, fatigue: 0, injury: null, relapse: 0 });
      for (const h of p.history) h.ca = p.ca;
      p.caLog = [p.ca];
    }
    for (const c of Object.values(w.clubs as Obj)) {
      Object.assign(c, { training: defaultTraining(), familiarity: { [c.tactic.formation]: TRAIN.famStart }, excluded: [], feuds: [] });
      initRelations(w as unknown as WorldState, c as Club, rng); // forma garantita dalle righe sopra
      seedMinutes(w as unknown as WorldState, c as Club);
    }
    Object.assign(w.manager, { kept: 0, broken: 0 });
    w.causal = [];
    w.promises = [];
  },
  // 4 → 5 (F7, mercato): ogni giocatore ha un agente
  (w) => {
    for (const p of Object.values(w.players as Obj)) p.agentId = null;
    w.agents = {};
    w.nextAgentId = 1;
    assignAgents(w as unknown as WorldState, new Rng(w.seed + 77)); // forma garantita dalle righe sopra
  },
  // 5 → 6 (F7, IA di mercato): ogni club ha una filosofia
  (w) => {
    const rng = new Rng(w.seed + 91);
    for (const c of Object.values(w.clubs as Obj)) c.philosophy = rng.pick([...PHILOSOPHIES]);
  },
  // 6 → 7 (F7, contratti): clausole, percentuale di rivendita, prestiti, parametro zero
  (w) => {
    for (const p of Object.values(w.players as Obj))
      Object.assign(p.contract, { release: null, sellOn: 0, sellOnTo: null, loan: null, preSigned: null });
  },
  // 7 → 8 (F7, scouting): osservatori e nebbia dell'informazione
  (w) => {
    for (const c of Object.values(w.clubs as Obj)) c.scoutIds = [];
    w.scouts = {};
    w.known = {};
    w.nextScoutId = 1;
    makeScouts(w as unknown as WorldState, new Rng(w.seed + 113)); // forma garantita dalle righe sopra
  },
  // 8 → 9 (F7, schermate): le trattative aperte dall'utente si salvano
  (w) => { w.talks = []; },
  // 9 → 10 (F8, finanze): conto economico, rate, fair play finanziario
  (w) => {
    for (const c of Object.values(w.clubs as Obj))
      Object.assign(c, { books: [], debts: [], credits: [], sanction: { kind: 'none', seasons: 0, points: 0 } });
  },
];

export function serialize(world: WorldState): string {
  return JSON.stringify(world);
}

export function deserialize(json: string): WorldState {
  const raw = JSON.parse(json) as Raw;
  if (typeof raw.schemaVersion !== 'number') throw new Error('Salvataggio non valido');
  if (raw.schemaVersion > SCHEMA_VERSION) throw new Error('Salvataggio creato da una versione più recente del gioco');
  while (raw.schemaVersion < SCHEMA_VERSION) {
    MIGRATIONS[raw.schemaVersion - 1]!(raw);
    raw.schemaVersion++;
  }
  return raw as unknown as WorldState; // struttura garantita dalla catena di migrazioni
}
