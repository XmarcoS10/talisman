// Record e storia di carriera (0.3.0): si aggiornano solo a fine stagione, perché dopo le stagioni passate non si
// ricavano più (il calendario si rifà e i ritirati escono dal mondo). Nessuna pesca dal caso: le partite non cambiano.
import type { ClubId, ClubRecords, Competition, Legend, ManagerSeason, Player, WorldState } from './model.ts';
import type { TableRow } from './world.ts';

const LEGENDS = 10; // quanti marcatori e presenze di sempre ricorda ogni club

export const emptyRecords = (): ClubRecords => ({ bigWin: null, bigLoss: null, best: null, scorers: [], apps: [] });

const recordsOf = (world: WorldState, id: ClubId) => (world.records[id] ??= emptyRecords());

/** vittoria e sconfitta più larghe del campionato appena finito (le gare di coppa e spareggi restano fuori) */
function matchRecords(world: WorldState, comp: Competition) {
  for (const fx of comp.fixtures) {
    if (!fx.result || fx.cup || fx.stage) continue;
    const { hg, ag } = fx.result;
    if (hg === ag) continue;
    const [win, lose, gf, ga, home] = hg > ag ? [fx.home, fx.away, hg, ag, true] : [fx.away, fx.home, ag, hg, false];
    const w = recordsOf(world, win);
    const l = recordsOf(world, lose);
    const wider = (r: ClubRecords['bigWin']) => !r || gf - ga > r.gf - r.ga || (gf - ga === r.gf - r.ga && gf > r.gf);
    if (wider(w.bigWin)) w.bigWin = { season: world.season, opp: lose, gf, ga, home };
    // la sconfitta si guarda dalla parte di chi perde: gf sono i suoi gol
    if (!l.bigLoss || gf - ga > l.bigLoss.ga - l.bigLoss.gf || (gf - ga === l.bigLoss.ga - l.bigLoss.gf && gf > l.bigLoss.ga))
      l.bigLoss = { season: world.season, opp: win, gf: ga, ga: gf, home: !home };
  }
}

/** miglior piazzamento: categoria più alta, poi posizione, poi punti */
function bestSeason(world: WorldState, comp: Competition, table: TableRow[]) {
  table.forEach((row, i) => {
    const r = recordsOf(world, row.clubId);
    const b = r.best;
    const better = !b || comp.level < b.level || (comp.level === b.level && (i + 1 < b.pos || (i + 1 === b.pos && row.pts > b.pts)));
    if (better) r.best = { season: world.season, compId: comp.id, level: comp.level, pos: i + 1, pts: row.pts };
  });
}

function upsert(list: Legend[], l: Legend, key: 'goals' | 'apps') {
  const i = list.findIndex((x) => x.playerId === l.playerId);
  if (i >= 0) list.splice(i, 1);
  if (l[key] <= 0) return;
  list.push(l);
  list.sort((a, b) => b[key] - a[key] || b.apps - a.apps);
  if (list.length > LEGENDS) list.length = LEGENDS;
}

/** totali di un giocatore con il club di oggi, dalla sua storia (va chiamata dopo aver scritto la stagione) */
export function legendOf(p: Player): Legend {
  const rows = p.history.filter((h) => h.clubId === p.clubId);
  return { playerId: p.id, name: `${p.firstName} ${p.lastName}`, apps: rows.reduce((s, h) => s + h.apps, 0), goals: rows.reduce((s, h) => s + h.goals, 0) };
}

function legends(world: WorldState) {
  for (const p of Object.values(world.players)) {
    if (p.clubId === null) continue;
    const r = recordsOf(world, p.clubId);
    const l = legendOf(p);
    upsert(r.scorers, l, 'goals');
    upsert(r.apps, l, 'apps');
  }
}

/** la stagione dell'allenatore, una riga */
function managerSeason(world: WorldState, comps: Competition[], tables: TableRow[][]): ManagerSeason | null {
  const me = world.manager.clubId;
  const ci = comps.findIndex((c) => c.clubIds.includes(me));
  if (ci < 0) return null;
  const pos = tables[ci]!.findIndex((r) => r.clubId === me);
  const cup = world.cup?.season === world.season ? world.cup : null;
  let cupRound: ManagerSeason['cup'] = null;
  if (cup) {
    const last = cup.rounds.findLastIndex((r) => r.ties.some((fx) => fx.home === me || fx.away === me));
    if (last >= 0) cupRound = { round: last, of: cup.rounds.length, won: cup.winner === me };
  }
  return { season: world.season, clubId: me, compId: comps[ci]!.id, pos: pos + 1, pts: tables[ci]![pos]?.pts ?? null, cup: cupRound, sacked: world.manager.board.sacked };
}

/**
 * fine stagione: da chiamare dopo il verdetto della dirigenza e dopo aver scritto `p.history`, prima dei ritiri e del
 * calendario nuovo
 */
export function endSeasonRecords(world: WorldState, comps: Competition[], tables: TableRow[][]) {
  comps.forEach((c, i) => { matchRecords(world, c); bestSeason(world, c, tables[i]!); });
  legends(world);
  const s = managerSeason(world, comps, tables);
  if (s) world.manager.seasons.push(s);
}
