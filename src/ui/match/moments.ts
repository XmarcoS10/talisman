// Momenti dell'azione sul campo 2D (Blocco 3, punto 3): dal registro del motore (`beats`) a quando si vedono.
// Ogni intervallo della traccia racconta l'azione appena giocata: la palla vola nella prima parte (MATCH.ballFlight),
// poi raccordo. Fallo, contrasto, fuorigioco, cartellini e piazzati si vedono all'inizio; intercetto, colpo di testa,
// parata, gol e simili quando la palla arriva. Qui si decide solo il quando; il disegno è in fx.ts.
import { MATCH } from '../../engine/balance.ts';
import type { MatchRun } from '../../engine/match/engine.ts';
import type { BeatKind } from '../../engine/match/trace.ts';

/** momenti che si vedono appena comincia l'azione; gli altri quando la palla arriva */
const AT_START = new Set<BeatKind>(['offside', 'tackle', 'foul', 'yellow', 'red', 'corner', 'freeKick', 'wall', 'penalty', 'injury', 'longKick', 'shot']);

/** quanto dura sullo schermo, in secondi reali */
const SHOW: Partial<Record<BeatKind, number>> = { goal: 3.5, yellow: 2.5, red: 3, injury: 2.5, penalty: 3.5, offside: 1.6, save: 1.2, parry: 1.2 };
const SHOW_DEFAULT = 0.9;

export interface Moment {
  kind: BeatKind;
  who: number;
  vs?: number;
  x: number; // dove era la palla (già specchiato se serve)
  y: number;
  age: number; // 0 appena successo, 1 sta per sparire
  xg?: number; // per il tiro
  step: number;
}

interface Timing { start: number[]; dead: boolean[]; ti: number }
const cache = new WeakMap<MatchRun, Timing>();

/** inizio di ogni azione sulla traccia, aggiornato man mano */
function timing(run: MatchRun): Timing {
  let tm = cache.get(run);
  if (!tm) { tm = { start: [], dead: [], ti: 0 }; cache.set(run, tm); }
  for (; tm.ti < run.track.length; tm.ti++) {
    const p = run.track[tm.ti]!;
    if (tm.start[p.step] === undefined) { tm.start[p.step] = p.at; tm.dead[p.step] = p.dead; }
  }
  return tm;
}

/** istante della traccia in cui la palla arriva, nell'azione `s` */
function arrival(run: MatchRun, tm: Timing, s: number): number {
  const a = tm.start[s]!;
  const b = tm.start[s + 1] ?? run.track[run.track.length - 1]!.at;
  const flight = tm.dead[s] ? 0.2 : run.frames[s]?.kind === 'dribble' ? 1 : MATCH.ballFlight;
  return a + (b - a) * flight;
}

/** istante della traccia in cui si vede il momento `kind` dell'azione `s` (per il replay) */
export function beatTime(run: MatchRun, s: number, kind: BeatKind): number {
  const tm = timing(run);
  return AT_START.has(kind) ? tm.start[s] ?? 0 : arrival(run, tm, s);
}

/**
 * i momenti visibili all'istante T. `step`: l'azione in corso; si guardano anche le ultime prima (un gol resta a
 * schermo mentre si riparte). `speed`: secondi di gioco per secondo reale, perché le durate sono in tempo reale.
 */
export function momentsAt(run: MatchRun, T: number, step: number, speed: number, mirror: boolean): Moment[] {
  const tm = timing(run);
  const out: Moment[] = [];
  for (let s = Math.max(0, step - 6); s <= step; s++) {
    const f = run.frames[s];
    if (!f?.beats || tm.start[s] === undefined) continue;
    const end = arrival(run, tm, s);
    for (const b of f.beats) {
      const at = AT_START.has(b.kind) ? tm.start[s]! : end;
      const age = (T - at) / (speed * (SHOW[b.kind] ?? SHOW_DEFAULT));
      if (age < 0 || age >= 1) continue;
      out.push({ kind: b.kind, who: b.who, ...(b.vs !== undefined ? { vs: b.vs } : {}), ...(b.xg !== undefined ? { xg: b.xg } : {}), x: mirror ? 12 - b.x : b.x, y: mirror ? 8 - b.y : b.y, age, step: s });
    }
  }
  return out;
}
