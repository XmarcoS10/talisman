// Informazione imperfetta (GUIDA §7.6). Regola: dei giocatori non tuoi non vedi mai i valori veri,
// vedi stime con una banda di incertezza. La stima è deterministica — stesso giocatore, stessa conoscenza,
// stesso numero — perché altrimenti basterebbe riaprire la scheda per "tirare a indovinare" meglio.
import { SCOUT } from '../balance.ts';
import { ALL_ATTRS, type AttrKey, type Player, type ScoutId, type WorldState } from '../model.ts';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** rumore stabile in −1…1 da una terna di interi: nessun caso di sistema, nessuna stima che balla */
function noise(a: number, b: number, c: number): number {
  let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 2147483648 - 1;
}

/** quello che si sa di un giocatore senza muovere un osservatore: fama del club, presenze, gol */
export function publicKnowledge(world: WorldState, p: Player): number {
  if (p.clubId === world.manager.clubId) return 100;
  const rep = p.clubId === null ? 30 : world.clubs[p.clubId]!.reputation;
  const apps = p.stats.apps + p.history.reduce((a, h) => a + h.apps, 0);
  return clamp(SCOUT.publicBase + rep * SCOUT.publicRep + Math.min(SCOUT.publicAppsMax, apps * SCOUT.publicApps), 0, SCOUT.publicCap);
}

/** conoscenza effettiva: quella pubblica più quella guadagnata dagli osservatori */
export const knowledge = (world: WorldState, p: Player): number =>
  Math.max(publicKnowledge(world, p), world.known[p.id]?.k ?? 0);

/** chi ha firmato l'ultima valutazione: il suo errore sistematico colora le stime */
const scoutOf = (world: WorldState, p: Player): ScoutId | null => world.known[p.id]?.by ?? null;

export interface Band {
  mid: number;
  band: number; // ± incertezza: 0 = lo conosci davvero
}

/** stima di un attributo. La banda si stringe con la conoscenza, il centro sbaglia dentro la banda */
export function estimate(world: WorldState, p: Player, attr: AttrKey): Band {
  const real = p.attrs[attr];
  const k = knowledge(world, p);
  const band = Math.round(SCOUT.bandMax * (1 - k / 100) * 10) / 10;
  if (band <= 0.05) return { mid: real, band: 0 };
  const sid = scoutOf(world, p);
  const err = noise(world.seed + p.id, ALL_ATTRS.indexOf(attr), sid ?? 0) * band * SCOUT.noiseShare;
  const bias = sid !== null ? (world.scouts[sid]?.bias ?? 0) * band * SCOUT.biasShare : 0;
  return { mid: clamp(Math.round(real + err + bias), 1, 20), band };
}

/** tutti gli attributi stimati in un colpo solo */
export const estimates = (world: WorldState, p: Player): Record<AttrKey, Band> =>
  Object.fromEntries(ALL_ATTRS.map((a) => [a, estimate(world, p, a)])) as Record<AttrKey, Band>;

/** intervallo stimato per abilità attuale e potenziale (sul potenziale si sbaglia sempre di più) */
export function range(world: WorldState, p: Player, which: 'ca' | 'pa'): [number, number] {
  const k = knowledge(world, p);
  const real = which === 'ca' ? p.ca : p.pa;
  if (k >= 100 && which === 'ca') return [real, real];
  const width = (which === 'ca' ? SCOUT.caBand : SCOUT.paBand) * (1 - k / 100) + (which === 'pa' ? SCOUT.paFloor : 0);
  const sid = scoutOf(world, p);
  const err = noise(world.seed + p.id, which === 'ca' ? 101 : 102, sid ?? 0) * width * SCOUT.noiseShare;
  const bias = sid !== null ? (world.scouts[sid]?.bias ?? 0) * width * SCOUT.biasShare : 0;
  const mid = clamp(Math.round(real + err + bias), 1, 200);
  return [Math.max(1, Math.round(mid - width)), Math.min(200, Math.round(mid + width))];
}

/** la personalità si conosce solo frequentandolo */
export const personalityKnown = (world: WorldState, p: Player) => knowledge(world, p) >= SCOUT.personalityAt;

/** numeri per il data-scouting: per 90 minuti, con quanto campione ci sta dietro (§7.6, la trappola) */
export function metrics(p: Player) {
  const apps = p.stats.apps;
  const per90 = (v: number) => (apps ? Math.round((v / apps) * 100) / 100 : 0);
  return {
    apps,
    small: apps < SCOUT.sampleOk, // campione piccolo: i numeri non dicono niente
    goals: per90(p.stats.goals),
    assists: per90(p.stats.assists),
    rating: apps ? Math.round((p.stats.ratingSum / apps) * 10) / 10 : 0,
  };
}
