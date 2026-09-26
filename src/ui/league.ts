// Numeri derivati di un campionato per le schermate: classifiche parziali, forma, prossimo avversario, statistiche.
// Tutto calcolato dal calendario, niente di salvato (regola 4).
import type { ClubId, Competition, Fixture, Player, WorldState } from '../engine/model.ts';
import { standings, type TableRow } from '../engine/world.ts';
import { t } from './i18n.ts';

export type TableView = 'all' | 'home' | 'away' | 'form' | 'xg';

/** di che competizione è una partita: coppa, spareggi della Serie B, o il campionato `league` */
export const fxLabel = (fx: Fixture, league: string) => (fx.cup ? t('cup.name') : fx.stage ? t(`${fx.stage}.name`) : league);
export type Row = TableRow & { xgf: number; xga: number };

const played = (comp: Competition, ids: Set<ClubId>) =>
  comp.fixtures.filter((f) => f.result && ids.has(f.home) && ids.has(f.away)).sort((a, b) => a.day - b.day);

/** classifica secondo la vista: casa, trasferta, ultime 5, o per gol attesi */
export function tableFor(world: WorldState, comp: Competition, view: TableView): Row[] {
  if (view === 'all') {
    const xg = xgTotals(comp);
    return standings(world, comp).map((r) => ({ ...r, xgf: xg.get(r.clubId)?.[0] ?? 0, xga: xg.get(r.clubId)?.[1] ?? 0 }));
  }
  const ids = new Set(comp.clubIds);
  const rows = new Map<ClubId, Row>(comp.clubIds.map((id) => [id, { clubId: id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, xgf: 0, xga: 0 }]));
  const last = view === 'form' ? lastFixtures(comp, ids, 5) : null;
  for (const f of played(comp, ids)) {
    const { hg, ag, stats } = f.result!;
    for (const [id, gf, ga, xgf, xga, home] of [[f.home, hg, ag, stats[0].xg, stats[1].xg, true], [f.away, ag, hg, stats[1].xg, stats[0].xg, false]] as const) {
      if (view === 'home' && !home) continue;
      if (view === 'away' && home) continue;
      if (last && !last.get(id)!.includes(f)) continue;
      const r = rows.get(id)!;
      r.p++; r.gf += gf; r.ga += ga; r.xgf += xgf; r.xga += xga;
      if (gf > ga) { r.w++; r.pts += 3; } else if (gf === ga) { r.d++; r.pts++; } else r.l++;
    }
  }
  const key = (r: Row) => (view === 'xg' ? r.xgf - r.xga : r.pts);
  return [...rows.values()].sort((x, y) => key(y) - key(x) || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf);
}

function xgTotals(comp: Competition) {
  const m = new Map<ClubId, [number, number]>();
  for (const f of comp.fixtures) {
    if (!f.result) continue;
    const h = m.get(f.home) ?? [0, 0], a = m.get(f.away) ?? [0, 0];
    h[0] += f.result.stats[0].xg; h[1] += f.result.stats[1].xg;
    a[0] += f.result.stats[1].xg; a[1] += f.result.stats[0].xg;
    m.set(f.home, h); m.set(f.away, a);
  }
  return m;
}

function lastFixtures(comp: Competition, ids: Set<ClubId>, n: number) {
  const m = new Map<ClubId, Fixture[]>(comp.clubIds.map((id) => [id, []]));
  for (const f of played(comp, ids)) { m.get(f.home)!.push(f); m.get(f.away)!.push(f); }
  for (const [id, list] of m) m.set(id, list.slice(-n));
  return m;
}

/** ultime n partite di un club: V/N/P, la più vecchia per prima */
export function formOf(comp: Competition, clubId: ClubId, n = 5): ('W' | 'D' | 'L')[] {
  const list = lastFixtures(comp, new Set(comp.clubIds), n).get(clubId) ?? [];
  return list.map((f) => {
    const [gf, ga] = f.home === clubId ? [f.result!.hg, f.result!.ag] : [f.result!.ag, f.result!.hg];
    return gf > ga ? 'W' : gf === ga ? 'D' : 'L';
  });
}

export function nextFixture(comp: Competition, clubId: ClubId): Fixture | undefined {
  let best: Fixture | undefined;
  for (const f of comp.fixtures) if (!f.result && (f.home === clubId || f.away === clubId) && (!best || f.day < best.day)) best = f;
  return best;
}

/** giocatori del campionato ordinati per una statistica */
export function leaders(world: WorldState, comp: Competition, score: (p: Player) => number, n = 5, filter: (p: Player) => boolean = () => true) {
  const ids = new Set(comp.clubIds);
  return Object.values(world.players)
    .filter((p) => p.clubId !== null && ids.has(p.clubId) && filter(p) && score(p) > 0)
    .sort((a, b) => score(b) - score(a))
    .slice(0, n);
}

export const avgRating = (p: Player) => (p.stats.apps ? p.stats.ratingSum / p.stats.apps : 0);

/** cartellini per club nella stagione: [gialli, rossi] */
export function cards(world: WorldState, comp: Competition) {
  const m = new Map<ClubId, [number, number]>(comp.clubIds.map((id) => [id, [0, 0]]));
  for (const id of comp.clubIds) for (const pid of world.clubs[id]!.playerIds) {
    const s = world.players[pid]!.stats;
    const c = m.get(id)!; c[0] += s.yellows; c[1] += s.reds;
  }
  return m;
}

export function goalsPerGame(comp: Competition) {
  let g = 0, n = 0;
  for (const f of comp.fixtures) if (f.result) { g += f.result.hg + f.result.ag; n++; }
  return n ? g / n : 0;
}
