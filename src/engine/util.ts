// Piccole funzioni usate in tutto il motore. Prima erano copiate file per file: una correzione fatta in un posto
// non arrivava negli altri. Nessun import di valori da altri moduli del motore, così nessuno rischia cicli.
import type { Club, Player, WorldState } from './model.ts';

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** età nella stagione indicata (l'età è un valore derivato: non si salva) */
export const age = (p: Player, season: number) => season - p.birthYear;

/** punti a partita nelle ultime `n` giocate in campionato; 1,4 se non ha ancora giocato */
export function pointsPerGame(world: WorldState, club: Club, n = 5): number {
  const comp = world.competitions[club.compId];
  if (!comp) return 1.4;
  const played = comp.fixtures.filter((f) => f.result && (f.home === club.id || f.away === club.id)).slice(-n);
  if (!played.length) return 1.4;
  return played.reduce((a, f) => {
    const [mine, theirs] = f.home === club.id ? [f.result!.hg, f.result!.ag] : [f.result!.ag, f.result!.hg];
    return a + (mine > theirs ? 3 : mine === theirs ? 1 : 0);
  }, 0) / played.length;
}
