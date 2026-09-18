// Salvataggi versionati (GUIDA §2.5): ogni save ha schemaVersion e passa dalla catena di migrazioni.
import { defaultRoles } from './match/tactics.ts';
import type { WorldState } from './model.ts';

export const SCHEMA_VERSION = 3;

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
