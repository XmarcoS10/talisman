// Nazionali (GUIDA §7.8): convocazioni decise dall'IA, pause internazionali che stancano e a volte fanno male,
// tornei estivi (Europeo negli anni divisibili per quattro, Mondiale due anni dopo) che muovono il valore.
// Le partite si giocano col motore vero (`nations/match.ts`): gol, cartellini e infortuni sono quelli della partita.
import { NATIONAL } from '../balance.ts';
import type { IntlMatch, National, WorldState } from '../model.ts';
import { addNews } from '../news.ts';
import { NATIONS } from '../names.ts';
import type { Rng } from '../rng.ts';
import { clamp } from '../util.ts';
import { canPlayIntl, intlWinner, playNational } from './match.ts';
import { callUp, nationOf, strength } from './squad.ts';

export { callUp, nationOf, playIntl, strength } from './squad.ts';

const EUROPE = new Set(['ITA', 'ESP', 'FRA', 'POR', 'NED', 'SRB', 'CRO', 'SWE']);

/**
 * pausa per le nazionali: ogni ct convoca, si gioca, i convocati tornano stanchi e qualcuno si fa male.
 * Gli accoppiamenti cambiano a ogni giornata della finestra, così nessuno rigioca sempre con lo stesso.
 */
export function internationalBreak(world: WorldState, rng: Rng) {
  const me = world.manager.clubId;
  const codes = Object.keys(NATIONS).filter((c) => canPlayIntl(world, c));
  for (const code of codes) nationOf(world, code).callups = callUp(world, code).map((p) => p.id);
  // accoppiamenti per fascia, come nei gironi veri: le nazionali di forza simile si incontrano fra loro.
  // Alla seconda giornata la fascia scorre di uno, così non si rigioca la stessa partita.
  const pots = [...codes].sort((x, y) => strength(world, y) - strength(world, x));
  for (let round = 0; round < NATIONAL.matchesPerWindow; round++) {
    const draw = round % 2 === 0 ? pots : [pots[0]!, ...pots.slice(2), pots[1]!];
    for (let i = 0; i + 1 < draw.length; i += 2) {
      const [x, y] = rng.next() < 0.5 ? [draw[i]!, draw[i + 1]!] : [draw[i + 1]!, draw[i]!]; // chi gioca in casa
      playNational(world, rng, x, y, { kind: 'break' });
    }
  }
  const mine = codes.flatMap((code) => callUp(world, code).filter((p) => p.clubId === me).map((p) => `${p.lastName} (${code})`));
  if (mine.length) addNews(world, 'news.intl.callups', { names: mine.join(', ') });
}

type Place = National['honours'][number]['place'];

/** un torneo estivo: gironi da quattro, poi eliminazione diretta; i pareggi dei gironi valgono un punto per uno */
export function tournament(world: WorldState, rng: Rng, kind: 'world' | 'euro'): { winner: string; places: Map<string, Place> } {
  const codes = Object.keys(NATIONS).filter((c) => (kind === 'world' || EUROPE.has(c)) && canPlayIntl(world, c));
  const places = new Map<string, Place>(codes.map((c) => [c, 'group']));
  const play = (a: string, b: string, stage: IntlMatch['stage'], knockout = false) =>
    playNational(world, rng, a, b, { kind, stage, knockout });

  // gironi: a quattro, passano le prime due (se i gironi sono tre passano anche le due migliori terze)
  const shuffled = rng.shuffle(codes);
  const groups: string[][] = [];
  for (let i = 0; i < shuffled.length; i += 4) groups.push(shuffled.slice(i, i + 4));
  const thirds: { c: string; pts: number }[] = [];
  let through: string[] = [];
  for (const g of groups) {
    const pts = new Map(g.map((c) => [c, 0]));
    for (let i = 0; i < g.length; i++)
      for (let j = i + 1; j < g.length; j++) {
        const m = play(g[i]!, g[j]!, 'group');
        pts.set(m.a, pts.get(m.a)! + (m.ga > m.gb ? 3 : m.ga === m.gb ? 1 : 0));
        pts.set(m.b, pts.get(m.b)! + (m.gb > m.ga ? 3 : m.ga === m.gb ? 1 : 0));
      }
    const order = [...g].sort((a, b) => pts.get(b)! - pts.get(a)! || strength(world, b) - strength(world, a));
    through.push(order[0]!, order[1]!);
    if (order[2]) thirds.push({ c: order[2], pts: pts.get(order[2])! });
  }
  if (through.length === 6) through.push(...thirds.sort((a, b) => b.pts - a.pts).slice(0, 2).map((t) => t.c));

  // eliminazione diretta
  const rounds: ('quarter' | 'semi' | 'final')[] = through.length === 8 ? ['quarter', 'semi', 'final'] : ['semi', 'final'];
  for (const r of rounds) {
    for (const c of through) places.set(c, r);
    const next: string[] = [];
    const draw = rng.shuffle(through);
    for (let i = 0; i + 1 < draw.length; i += 2) next.push(intlWinner(play(draw[i]!, draw[i + 1]!, r, true)));
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
      if (place === 'winner') p.intl.titles++;
    }
  }
  const me = world.manager.clubId;
  const champs = callUp(world, winner).filter((p) => p.clubId === me);
  addNews(world, `news.intl.${kind}${champs.length ? 'Ours' : ''}`, { nation: winner, names: champs.map((p) => p.lastName).join(', ') });
}
