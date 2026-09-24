// Stelle di abilità e potenziale relative al campionato dell'utente (Blocco 1.3, opzione A): 5 stelle = fra i
// migliori del campionato in cui giochi. Così la scala resta leggibile anche quando il talento del mondo cresce, e
// un giocatore di un'altra lega si legge sullo stesso metro dei tuoi. Derivate, mai salvate (regola 4).
import type { WorldState } from '../engine/model.ts';

// percentili dell'abilità del campionato da cui si prendono 1, 1½, 2 … 5 stelle: 5 stelle al 3% più forte,
// 4 dal 20%, 3 dalla metà, sotto il 5% mezza stella
const CUTS = [0.05, 0.12, 0.22, 0.35, 0.5, 0.65, 0.8, 0.91, 0.97];

const cache = new WeakMap<WorldState, { key: string; cuts: number[] }>();

/** soglie di abilità per ogni mezza stella, dalla lega dell'utente (o dalla massima serie, prima di scegliere) */
export function starCuts(world: WorldState): number[] {
  const own = world.clubs[world.manager.clubId]?.compId;
  const comp = (own && world.competitions[own]) || Object.values(world.competitions).find((c) => c.level === 1)!;
  const key = `${comp.id}:${world.season}`;
  const hit = cache.get(world);
  if (hit?.key === key) return hit.cuts;
  const cas = comp.clubIds.flatMap((id) => world.clubs[id]!.playerIds.map((p) => world.players[p]!.ca)).sort((a, b) => a - b);
  const cuts = CUTS.map((q) => cas[Math.floor(q * (cas.length - 1))] ?? 0);
  cache.set(world, { key, cuts });
  return cuts;
}

/** abilità (o potenziale) in stelle da ½ a 5 */
export function toStars(world: WorldState, ca: number): number {
  const cuts = starCuts(world);
  let n = 0;
  while (n < cuts.length && ca >= cuts[n]!) n++;
  return 0.5 + n * 0.5;
}
