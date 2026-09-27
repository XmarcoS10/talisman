// Arbitri (0.5.0, scelta di Marco: severità visibile). Un gruppo fisso per ogni mondo, ricavato dal seme e mai salvato
// (regola 4); l'arbitro di una partita si calcola dal calendario, così si può mostrare prima della partita. In campo la
// severità moltiplica di poco cartellini e falli fischiati (una leva piccola, lezione 8).
import { REFEREE } from './balance.ts';
import type { Fixture, WorldState } from './model.ts';
import { NATIONS } from './names.ts';
import { Rng } from './rng.ts';

export interface Referee { id: number; firstName: string; lastName: string; strict: number } // severità 1-20

const cache = new Map<number, Referee[]>();

export function referees(world: WorldState): Referee[] {
  let list = cache.get(world.seed);
  if (!list) {
    const rng = new Rng((world.seed ^ 0x5eed5eed) >>> 0);
    const it = NATIONS.ITA!;
    list = Array.from({ length: REFEREE.count }, (_, id) => ({ id, firstName: rng.pick(it.first), lastName: rng.pick(it.last), strict: rng.int(1, 20) }));
    cache.set(world.seed, list);
  }
  return list;
}

/** l'arbitro della partita: fisso per quella partita, diverso di giornata in giornata */
export function refereeFor(world: WorldState, fx: Pick<Fixture, 'day' | 'home' | 'away'>): Referee {
  const list = referees(world);
  let h = 2166136261;
  for (const n of [world.season, fx.day, fx.home, fx.away]) h = Math.imul(h ^ (n >>> 0), 16777619) >>> 0;
  return list[h % list.length]!;
}

/** moltiplicatore dei cartellini: da `REFEREE.min` (il più tollerante) a `REFEREE.max` (il più severo) */
export const refFactor = (r: Referee) => REFEREE.min + ((r.strict - 1) / 19) * (REFEREE.max - REFEREE.min);
