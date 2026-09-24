// Le richieste al motore che girano nel Web Worker (engine.worker.ts), o qui quando il worker non c'è (engine-client.ts).
// Il mondo viaggia come testo serializzato (lo stesso formato del salvataggio); le partite tornano come chiavi.
import { deserialize, serialize } from '../engine/save.ts';
import type { SimOutput } from '../engine/match/engine.ts';
import type { Fixture, WorldState } from '../engine/model.ts';
import type { RngState } from '../engine/rng.ts';
import { advance, closeMatchDay, endSeason, fixturesOn, openMatchDay, type SeasonSummary } from '../engine/world.ts';
import { Rng } from '../engine/rng.ts';

export interface FxKey { day: number; home: number; away: number; cup: boolean }
export type Req =
  | { op: 'advance'; world: string }
  | { op: 'endSeason'; world: string }
  | { op: 'open'; world: string }
  | { op: 'close'; world: string; day: number; fx: FxKey; rng: RngState; out: SimOutput };
export type Res =
  | { op: 'advance'; world: string; played: FxKey[] }
  | { op: 'endSeason'; world: string; summary: SeasonSummary }
  | { op: 'open'; world: string; open: { day: number; fx: FxKey; rng: RngState } | null }
  | { op: 'close'; world: string; played: FxKey[] };

export const keyOf = (f: Fixture): FxKey => ({ day: f.day, home: f.home, away: f.away, cup: !!f.cup });
export const findFx = (w: WorldState, k: FxKey) =>
  fixturesOn(w, k.day).find((f) => f.home === k.home && f.away === k.away && !!f.cup === k.cup)!;

/** esegue una richiesta sul mondo: la usa il worker, e il thread principale quando il worker non c'è */
export function handle(req: Req): Res {
  const w = deserialize(req.world);
  if (req.op === 'advance') { const played = advance(w).map(keyOf); return { op: 'advance', world: serialize(w), played }; }
  if (req.op === 'endSeason') { const summary = endSeason(w); return { op: 'endSeason', world: serialize(w), summary }; }
  if (req.op === 'open') {
    const o = openMatchDay(w);
    return { op: 'open', world: serialize(w), open: o && { day: o.day, fx: keyOf(o.fx), rng: o.rng } };
  }
  // la partita è stata giocata nell'interfaccia: i giocatori del risultato si ricollegano a quelli di questo mondo
  for (const side of req.out.played) for (const m of side) m.p = w.players[m.p.id]!;
  const played = closeMatchDay(w, req.day, findFx(w, req.fx), new Rng(req.rng), req.out).map(keyOf);
  return { op: 'close', world: serialize(w), played };
}

