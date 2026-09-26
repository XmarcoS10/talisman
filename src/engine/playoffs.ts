// Playoff e playout della Serie B (Blocco 4, scelta 3A di Marco), come nella Serie B vera.
// Prima e seconda salgono direttamente; dalla 3ª all'8ª i playoff: turno preliminare in gara secca (5ª-8ª, 6ª-7ª, in
// casa della meglio piazzata, col pareggio passa lei), semifinali (3ª e 4ª contro le vincenti) e finale di andata e
// ritorno, a parità di gol passa la meglio piazzata. Playout fra 16ª e 17ª, andata e ritorno, solo se il distacco è
// sotto i 4 punti (a parità si salva la 16ª); altrimenti la 17ª scende direttamente. Si possono spegnere (world.rules).
import { PLAYOFF } from './balance.ts';
import type { ClubId, Competition, Fixture, Playoffs, WorldState } from './model.ts';
import { addNews } from './news.ts';

type Row = { clubId: ClubId; pts: number };

/** la Serie B: la lega di livello 2 */
export const serieB = (world: WorldState): Competition | undefined => Object.values(world.competitions).find((c) => c.level === 2);

export const playoffFixtures = (world: WorldState): Fixture[] => world.playoffs?.ties ?? [];

/** il tabellone, appena finito il campionato di B (`last` = giorno dell'ultima giornata) */
export function makePlayoffs(world: WorldState, table: Row[], last: number): Playoffs {
  const d = (k: number) => last + k;
  const days = { prelim: d(PLAYOFF.gap), semi: [d(2 * PLAYOFF.gap), d(3 * PLAYOFF.gap)] as [number, number],
    final: [d(4 * PLAYOFF.gap), d(5 * PLAYOFF.gap)] as [number, number], playout: [d(2 * PLAYOFF.gap), d(3 * PLAYOFF.gap)] as [number, number] };
  const seeds = table.slice(2, 8).map((r) => r.clubId);
  const po: Playoffs = { season: world.season, seeds, days, ties: [], playout: null, winner: null, relegated: null };
  // preliminare: 5ª-8ª e 6ª-7ª, in casa della meglio piazzata
  po.ties.push({ day: days.prelim, home: seeds[2]!, away: seeds[5]!, stage: 'playoff' }, { day: days.prelim, home: seeds[3]!, away: seeds[4]!, stage: 'playoff' });
  const r16 = table[15]!, r17 = table[16]!;
  if (r16.pts - r17.pts < PLAYOFF.playoutGap) {
    po.playout = [r16.clubId, r17.clubId];
    po.ties.push({ day: days.playout[0], home: r17.clubId, away: r16.clubId, stage: 'playout' }, { day: days.playout[1], home: r16.clubId, away: r17.clubId, stage: 'playout' });
  } else po.relegated = r17.clubId;
  const me = world.manager.clubId;
  if (seeds.includes(me)) addNews(world, 'news.playoff.in', { pos: seeds.indexOf(me) + 3 });
  if (po.playout?.includes(me)) addNews(world, 'news.playout.in', {});
  return po;
}

const rank = (po: Playoffs, id: ClubId) => po.seeds.indexOf(id);

/** chi passa una gara secca: col pareggio la meglio piazzata */
function single(po: Playoffs, fx: Fixture): ClubId {
  const { hg, ag } = fx.result!;
  if (hg !== ag) return hg > ag ? fx.home : fx.away;
  return rank(po, fx.home) < rank(po, fx.away) ? fx.home : fx.away;
}

/** chi passa un doppio confronto: somma dei gol, a parità `better` */
function double(a: Fixture, b: Fixture, better: ClubId): ClubId {
  const goals = (id: ClubId) => (a.home === id ? a.result!.hg : a.result!.ag) + (b.home === id ? b.result!.hg : b.result!.ag);
  const other = a.home === better ? a.away : a.home;
  return goals(other) > goals(better) ? other : better;
}

/** andata in casa della peggio piazzata, ritorno in casa della meglio piazzata */
const legs = (better: ClubId, worse: ClubId, days: [number, number]): Fixture[] => [
  { day: days[0], home: worse, away: better, stage: 'playoff' }, { day: days[1], home: better, away: worse, stage: 'playoff' },
];

/** dopo una giornata: chi passa, il turno dopo, chi sale e chi scende */
export function afterPlayoffDay(world: WorldState, day: number) {
  const po = world.playoffs;
  if (!po || !po.ties.some((f) => f.day === day)) return;
  const me = world.manager.clubId;
  const at = (dd: number, stage: Fixture['stage'] = 'playoff') => po.ties.filter((f) => f.day === dd && f.stage === stage);
  if (day === po.days.prelim) {
    const won = at(day).map((f) => single(po, f)).sort((a, b) => rank(po, a) - rank(po, b));
    // la 3ª affronta la peggio piazzata fra le vincenti, la 4ª l'altra
    po.ties.push(...legs(po.seeds[0]!, won[1]!, po.days.semi), ...legs(po.seeds[1]!, won[0]!, po.days.semi));
    out(world, at(day), won);
  } else if (day === po.days.semi[1]) {
    const firsts = at(po.days.semi[0]), seconds = at(day);
    const won = firsts.map((a) => { const b = seconds.find((x) => x.home === a.away)!; return double(a, b, b.home); })
      .sort((a, b) => rank(po, a) - rank(po, b));
    po.ties.push(...legs(won[0]!, won[1]!, po.days.final));
    out(world, [...firsts, ...seconds], won);
  } else if (day === po.days.final[1]) {
    const [a, b] = [at(po.days.final[0])[0]!, at(day)[0]!];
    po.winner = double(a, b, b.home);
    if (po.winner === me) addNews(world, 'news.playoff.won', {});
    else if (a.home === me || a.away === me) addNews(world, 'news.playoff.out', {});
  }
  if (po.playout && day === po.days.playout[1]) {
    const [a, b] = [at(po.days.playout[0], 'playout')[0]!, at(day, 'playout')[0]!];
    const safe = double(a, b, po.playout[0]); // a parità si salva la 16ª
    po.relegated = safe === po.playout[0] ? po.playout[1] : po.playout[0];
    if (po.playout.includes(me)) addNews(world, po.relegated === me ? 'news.playout.lost' : 'news.playout.won', {});
  }
}

/** notizia per chi è uscito fra i club dell'utente */
function out(world: WorldState, games: Fixture[], won: ClubId[]) {
  const me = world.manager.clubId;
  if (games.some((f) => f.home === me || f.away === me) && !won.includes(me)) addNews(world, 'news.playoff.out', {});
  else if (won.includes(me)) addNews(world, 'news.playoff.through', {});
}
