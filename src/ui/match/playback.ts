// Dal motore al campo 2D (GUIDA §6.1, P10 punto 2). Da F6.2 il motore produce già le posizioni continue
// (`run.track`, un fotogramma ogni 0,25 s di gioco): qui si sceglie il fotogramma giusto per l'istante di
// riproduzione e si interpola quel poco che serve a stare a 60 fps.
import type { MatchRun, PosFrame, TraceStep } from '../../engine/match/engine.ts';

// secondi di gioco per secondo reale
export const SPEEDS = [6, 12, 30] as const;
export const SPEED_LABELS = ['1×', '2×', '5×'] as const;

export interface Live {
  x: number[];
  y: number[];
  ids: number[];
  n0: number;
  bx: number;
  by: number;
  min: number;
  score: [number, number];
  dead: boolean; // gioco fermo
  frame: TraceStep | null; // l'azione in corso
  i: number; // indice dell'azione, per il racconto
  carrier: number; // id di chi ha la palla, 0 se è in viaggio
  passTo: number | null; // chi la sta aspettando
  h: number; // quanto è alta la palla, 0-1 (cross, lanci lunghi, rinvii): la sua ombra si stacca
}

/** durata della riproduzione già disponibile, in secondi di gioco */
export const duration = (run: MatchRun) => run.track[run.track.length - 1]?.at ?? 0;

/** durata stimata di una partita intera a questa velocità, in minuti reali */
export const matchMinutes = (speed: number) => Math.round(4200 / SPEEDS[speed]! / 60);

/** simula quanto basta ad avere fotogrammi fino a `until` (più un margine) */
export function ensure(run: MatchRun, until: number) {
  let guard = 0;
  while (!run.done && duration(run) < until + 10 && guard++ < 2000) run.tick();
}

/** primo istante di riproduzione in cui la partita è al minuto `min` */
export function atMinute(track: PosFrame[], min: number): number | null {
  const f = track.find((k) => k.min >= min);
  return f ? f.at : null;
}

/** altezza della palla in volo: una parabola sul tratto in cui nessuno la tiene, se l'azione è una palla alta */
function height(run: MatchRun, i: number, T: number): number {
  const track = run.track, f = track[i]!;
  if (f.carrier !== 0 || !run.frames[f.step]?.high) return 0;
  const inFlight = (k: number) => track[k]!.carrier === 0 && track[k]!.step === f.step && !track[k]!.dead;
  let a = i, b = i;
  while (a > 0 && inFlight(a - 1)) a--;
  while (b < track.length - 1 && inFlight(b + 1)) b++;
  const t0 = track[a]!.at, t1 = track[b + 1]?.at ?? track[b]!.at;
  const u = Math.min(1, Math.max(0, (T - t0) / (t1 - t0 || 1)));
  return 4 * u * (1 - u);
}

/** stato del campo all'istante di riproduzione `T`. `mirror`: la squadra dell'utente attacca sempre verso destra */
export function sample(run: MatchRun, T: number, mirror = false): Live | null {
  const track = run.track;
  if (!track.length) return null;
  let lo = 0, hi = track.length - 1;
  while (lo < hi) { // i fotogrammi sono ordinati nel tempo: ricerca binaria
    const mid = (lo + hi + 1) >> 1;
    if (track[mid]!.at <= T) lo = mid; else hi = mid - 1;
  }
  const f = track[lo]!;
  const nx = track[lo + 1];
  const u = nx && nx.at > f.at ? Math.min(1, Math.max(0, (T - f.at) / (nx.at - f.at))) : 0;
  const same = !!nx && nx.ids === f.ids; // formazione cambiata: niente interpolazione
  const n = f.ids.length;
  const x = new Array<number>(n), y = new Array<number>(n);
  for (let k = 0; k < n; k++) {
    const ax = f.xy[2 * k]!, ay = f.xy[2 * k + 1]!;
    const px = same ? ax + (nx!.xy[2 * k]! - ax) * u : ax;
    const py = same ? ay + (nx!.xy[2 * k + 1]! - ay) * u : ay;
    x[k] = mirror ? 12 - px : px;
    y[k] = mirror ? 8 - py : py;
  }
  let bx = f.bx + ((nx?.bx ?? f.bx) - f.bx) * u;
  let by = f.by + ((nx?.by ?? f.by) - f.by) * u;
  if (mirror) { bx = 12 - bx; by = 8 - by; }
  return {
    h: height(run, lo, T), x, y, ids: f.ids, n0: f.n0, bx, by, min: f.min, score: [f.sc0, f.sc1], dead: f.dead,
    frame: run.frames[f.step] ?? null, i: f.step, carrier: f.carrier, passTo: f.to || null,
  };
}
