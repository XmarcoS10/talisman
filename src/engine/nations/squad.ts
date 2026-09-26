// Convocazioni e forza di una nazionale (§7.8). Sta in un file suo perché lo leggono sia le pause e i tornei
// (`nations.ts`) sia le partite vere (`nations/match.ts`), senza che i due si importino a vicenda.
import { NATIONAL } from '../balance.ts';
import type { National, Player, Position, WorldState } from '../model.ts';
import type { Rng } from '../rng.ts';

export const nationOf = (world: WorldState, code: string): National =>
  (world.nations[code] ??= { callups: [], honours: [] });

type Unit = keyof typeof NATIONAL.shape;
const unit = (pos: Position): Unit =>
  pos === 'GK' ? 'gk' : pos === 'DC' || pos === 'DL' || pos === 'DR' ? 'def' : pos === 'AML' || pos === 'AMR' || pos === 'ST' ? 'att' : 'mid';

/**
 * i convocati, fra chi ha una squadra e sta bene (il ct guarda chi gioca): i migliori di ogni reparto secondo
 * `NATIONAL.shape`, poi i migliori rimasti se un reparto non basta. In ordine di abilità.
 */
export function callUp(world: WorldState, code: string): Player[] {
  const pool = Object.values(world.players)
    .filter((p) => p.nation === code && p.clubId !== null && p.condition.injuryDays === 0)
    .sort((a, b) => b.ca - a.ca || a.id - b.id);
  const left = { ...NATIONAL.shape };
  const picked = pool.filter((p) => left[unit(p.position)]-- > 0);
  const rest = pool.filter((p) => !picked.includes(p)).slice(0, Math.max(0, NATIONAL.squad - picked.length));
  return [...picked, ...rest].sort((a, b) => b.ca - a.ca || a.id - b.id);
}

/** forza di una nazionale: media dei migliori undici convocati */
export function strength(world: WorldState, code: string): number {
  const xi = callUp(world, code).slice(0, 11);
  return xi.length ? xi.reduce((a, p) => a + p.ca, 0) / xi.length : NATIONAL.emptyStrength;
}

/** gol di Poisson (algoritmo di Knuth): niente caso nativo, solo un Rng */
function poisson(rng: Rng, mean: number): number {
  const l = Math.exp(-mean);
  let k = 0, p = 1;
  do { k++; p *= rng.next(); } while (p > l);
  return k - 1;
}

/**
 * risultato veloce fra due forze, senza passare dal motore: lo usa la Primavera (che non si salva e si ricalcola
 * a ogni apertura della schermata). Le partite vere delle nazionali passano invece dal motore (`nations/match.ts`).
 */
export function playIntl(rng: Rng, sa: number, sb: number): [number, number] {
  const d = (sa - sb) / NATIONAL.strengthScale;
  return [poisson(rng, NATIONAL.goalsBase * Math.exp(d / 2)), poisson(rng, NATIONAL.goalsBase * Math.exp(-d / 2))];
}
