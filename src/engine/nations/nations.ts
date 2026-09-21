// Nazionali (GUIDA §7.8): convocazioni decise dall'IA, pause internazionali che stancano e a volte fanno male,
// tornei estivi (Europeo negli anni divisibili per quattro, Mondiale due anni dopo) che muovono il valore.
// ponytail: le partite delle nazionali non passano dal motore L2 (non hanno club né tattica): gol di Poisson
// dalla differenza di forza. Basta finché le nazionali non si guardano dal vivo.
import { NATIONAL } from '../balance.ts';
import type { National, Player, WorldState } from '../model.ts';
import { injure } from '../injuries.ts';
import { addNews, pName } from '../news.ts';
import { NATIONS } from '../names.ts';
import type { Rng } from '../rng.ts';
import { clamp } from '../util.ts';

const EUROPE = new Set(['ITA', 'ESP', 'FRA', 'POR', 'NED', 'SRB', 'CRO', 'SWE']);

export const nationOf = (world: WorldState, code: string): National =>
  (world.nations[code] ??= { callups: [], honours: [] });

/** i convocati: i migliori per abilità, fra chi ha una squadra (il ct guarda chi gioca) */
export function callUp(world: WorldState, code: string): Player[] {
  return Object.values(world.players)
    .filter((p) => p.nation === code && p.clubId !== null && p.condition.injuryDays === 0)
    .sort((a, b) => b.ca - a.ca)
    .slice(0, NATIONAL.squad);
}

/** forza di una nazionale: media dei migliori undici convocati */
export function strength(world: WorldState, code: string): number {
  const xi = callUp(world, code).slice(0, 11);
  return xi.length ? xi.reduce((a, p) => a + p.ca, 0) / xi.length : 60;
}

/** gol di Poisson (algoritmo di Knuth): niente caso nativo, solo l'Rng del mondo */
function poisson(rng: Rng, mean: number): number {
  const l = Math.exp(-mean);
  let k = 0, p = 1;
  do { k++; p *= rng.next(); } while (p > l);
  return k - 1;
}

export function playIntl(rng: Rng, sa: number, sb: number): [number, number] {
  const d = (sa - sb) / NATIONAL.strengthScale;
  return [poisson(rng, NATIONAL.goalsBase * Math.exp(d / 2)), poisson(rng, NATIONAL.goalsBase * Math.exp(-d / 2))];
}

/**
 * pausa per le nazionali: ogni ct convoca, i convocati giocano due partite, si stancano,
 * qualcuno si fa male e qualcuno segna. All'utente arriva la notizia dei suoi.
 */
export function internationalBreak(world: WorldState, rng: Rng) {
  const me = world.manager.clubId;
  const mine: string[] = [];
  for (const code of Object.keys(NATIONS)) {
    const squad = callUp(world, code);
    nationOf(world, code).callups = squad.map((p) => p.id);
    squad.forEach((p, i) => {
      const starter = i < 11;
      p.intl.caps += starter ? NATIONAL.matchesPerWindow : 1;
      for (let m = 0; m < NATIONAL.matchesPerWindow; m++)
        if (starter && rng.next() < NATIONAL.goalP * (p.position === 'ST' ? 1 : p.position.startsWith('AM') ? 0.6 : 0.2)) p.intl.goals++;
      p.condition.fatigue = clamp(p.condition.fatigue + NATIONAL.fatigue, 0, 100);
      p.psych.morale = clamp(p.psych.morale + NATIONAL.morale, 0, 100);
      if (rng.next() < NATIONAL.injuryP) {
        const type = injure(rng, p, 'contact');
        if (p.clubId === me) addNews(world, 'news.intl.injury', { name: pName(p), injury: type.id, days: p.condition.injuryDays });
      }
      if (p.clubId === me) mine.push(`${p.lastName} (${code})`);
    });
  }
  if (mine.length) addNews(world, 'news.intl.callups', { names: mine.join(', ') });
}

type Place = National['honours'][number]['place'];

/** un torneo estivo: gironi da quattro, poi eliminazione diretta; i pareggi si decidono ai rigori, con la forza che pesa */
export function tournament(world: WorldState, rng: Rng, kind: 'world' | 'euro'): { winner: string; places: Map<string, Place> } {
  const codes = Object.keys(NATIONS).filter((c) => kind === 'world' || EUROPE.has(c));
  const str = new Map(codes.map((c) => [c, strength(world, c)]));
  const places = new Map<string, Place>(codes.map((c) => [c, 'group']));
  const ko = (a: string, b: string) => {
    const [ga, gb] = playIntl(rng, str.get(a)!, str.get(b)!);
    if (ga !== gb) return ga > gb ? a : b;
    return rng.next() < 0.5 + (str.get(a)! - str.get(b)!) / 200 ? a : b; // rigori
  };
  // gironi: a quattro, passano le prime due (per il Mondiale a 12 passano anche le due migliori terze)
  const shuffled = rng.shuffle(codes);
  const groups: string[][] = [];
  for (let i = 0; i < shuffled.length; i += 4) groups.push(shuffled.slice(i, i + 4));
  const thirds: { c: string; pts: number }[] = [];
  let through: string[] = [];
  for (const g of groups) {
    const pts = new Map(g.map((c) => [c, 0]));
    for (let i = 0; i < g.length; i++)
      for (let j = i + 1; j < g.length; j++) {
        const [a, b] = [g[i]!, g[j]!];
        const [ga, gb] = playIntl(rng, str.get(a)!, str.get(b)!);
        pts.set(a, pts.get(a)! + (ga > gb ? 3 : ga === gb ? 1 : 0));
        pts.set(b, pts.get(b)! + (gb > ga ? 3 : ga === gb ? 1 : 0));
      }
    const order = [...g].sort((a, b) => pts.get(b)! - pts.get(a)! || str.get(b)! - str.get(a)!);
    through.push(order[0]!, order[1]!);
    if (order[2]) thirds.push({ c: order[2], pts: pts.get(order[2])! });
  }
  if (through.length === 6) through.push(...thirds.sort((a, b) => b.pts - a.pts).slice(0, 2).map((t) => t.c));
  // eliminazione diretta
  const rounds: Place[] = through.length === 8 ? ['quarter', 'semi', 'final'] : ['semi', 'final'];
  for (const r of rounds) {
    for (const c of through) places.set(c, r);
    const next: string[] = [];
    const draw = rng.shuffle(through);
    for (let i = 0; i < draw.length; i += 2) next.push(ko(draw[i]!, draw[i + 1]!));
    through = next;
  }
  const winner = through[0]!;
  places.set(winner, 'winner');
  return { winner, places };
}

/** l'estate: se c'è un torneo si gioca, stanca i convocati e fa salire chi lo vince */
export function summerTournament(world: WorldState, rng: Rng) {
  const year = world.season; // l'estate che segue la stagione appena chiusa
  const kind = year % 4 === 0 ? 'euro' : year % 4 === 2 ? 'world' : null;
  if (!kind) return;
  const { winner, places } = tournament(world, rng, kind);
  for (const [code, place] of places) {
    nationOf(world, code).honours.push({ season: year, tournament: kind, place });
    for (const p of callUp(world, code)) {
      p.condition.fatigue = clamp(p.condition.fatigue + NATIONAL.tournamentFatigue, 0, 100);
      p.intl.caps += place === 'group' ? 3 : place === 'quarter' ? 4 : place === 'semi' ? 5 : 6;
      if (place === 'winner') p.intl.titles++;
    }
  }
  const me = world.manager.clubId;
  const champs = callUp(world, winner).filter((p) => p.clubId === me);
  addNews(world, `news.intl.${kind}${champs.length ? 'Ours' : ''}`, { nation: winner, names: champs.map((p) => p.lastName).join(', ') });
}
