// Dal registro discreto del motore L2 al movimento continuo del campo 2D (GUIDA §6.1, P10 punto 2).
// Idea: la grafica non è la verità, racconta la verità di L2. Ogni azione è un fotogramma con le posizioni
// dei 22; tra un fotogramma e il successivo i giocatori "corrono" (interpolazione), la palla viaggia sulla
// traiettoria dell'azione (passaggio, conduzione, tiro) e poi aspetta.
import type { MatchRun, TraceStep } from '../../engine/match/engine.ts';

// secondi di gioco per secondo reale: a 1× un'azione media (≈ 6,7 s di gioco) dura più di un secondo sullo schermo
export const SPEEDS = [6, 12, 30] as const;
export const SPEED_LABELS = ['1×', '2×', '5×'] as const;
/** durata stimata di una partita intera a questa velocità, in minuti */
export const matchMinutes = (speed: number) => Math.round(5700 / SPEEDS[speed]! / 60);
const GAP = 2; // secondi di stacco tra primo e secondo tempo

export interface Live {
  x: number[];
  y: number[];
  ids: number[];
  n0: number;
  bx: number;
  by: number;
  frame: TraceStep;
  next: TraceStep | null;
  i: number; // indice del fotogramma corrente
  carrier: number; // id di chi ha la palla
  passTo: number | null; // destinatario di un passaggio ancora in volo
}

/** tempo cumulato: i fotogrammi hanno il tempo del proprio tempo di gioco */
export function timeline(frames: TraceStep[]): number[] {
  const at: number[] = [];
  let acc = 0;
  frames.forEach((f, i) => {
    if (i > 0) acc += frames[i - 1]!.half === f.half ? Math.max(0.2, f.t - frames[i - 1]!.t) : GAP;
    at.push(acc);
  });
  return at;
}

/** simula quanto basta ad avere fotogrammi fino a `until` (più un margine) */
export function ensure(run: MatchRun, at: number[], until: number) {
  let guard = 0;
  while (!run.done && (at.length < 2 || at[at.length - 1]! < until + 20) && guard++ < 400) {
    const before = run.frames.length;
    run.tick();
    for (let i = before; i < run.frames.length; i++) {
      const f = run.frames[i]!;
      const prev = run.frames[i - 1];
      at.push(i === 0 ? 0 : at[i - 1]! + (prev!.half === f.half ? Math.max(0.2, f.t - prev!.t) : GAP));
    }
  }
}

const ease = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (1 - u) ** 2 * 2);

/**
 * stato del campo al tempo di riproduzione `T` (secondi cumulati).
 * `mirror` specchia tutto per la presentazione: la squadra dell'utente attacca sempre verso destra, in ogni tempo
 * (il motore non cambia campo all'intervallo: la squadra 0 attacca sempre verso x = 12).
 */
export function sample(frames: TraceStep[], at: number[], T: number, mirror = false): Live | null {
  if (!frames.length) return null;
  let i = at.length - 1;
  while (i > 0 && at[i]! > T) i--;
  const f = frames[i]!;
  const next = frames[i + 1] ?? null;
  const dur = next ? Math.max(0.2, at[i + 1]! - at[i]!) : 1;
  const u = Math.max(0, Math.min(1, (T - at[i]!) / dur));

  // giocatori: chi c'è in entrambi i fotogrammi corre verso la posizione nuova, chi entra appare dov'è
  const x = f.px.slice(), y = f.py.slice();
  if (next) {
    const pos = new Map<number, number>();
    next.ids.forEach((id, k) => pos.set(id, k));
    f.ids.forEach((id, k) => {
      const j = pos.get(id);
      if (j === undefined) return;
      x[k] = f.px[k]! + (next.px[j]! - f.px[k]!) * u;
      y[k] = f.py[k]! + (next.py[j]! - f.py[k]!) * u;
    });
  }

  // palla: viaggia sulla traiettoria dell'azione nella prima parte dell'intervallo, poi resta col portatore
  const goalX = f.side === 0 ? 12 : 0;
  const tx = f.kind === 'shot' ? goalX : f.tx ?? (next ? next.bx : f.bx);
  const ty = f.kind === 'shot' ? 4 : f.ty ?? (next ? next.by : f.by);
  const flight = f.kind === 'dribble' ? 1 : 0.65;
  const v = ease(Math.min(1, u / flight));
  let bx = f.bx + (tx - f.bx) * v;
  let by = f.by + (ty - f.by) * v;
  if (next && u > flight) { // raccordo verso dove riparte l'azione (rimessa, rinvio, recupero)
    const w = (u - flight) / (1 - flight);
    bx += (next.bx - bx) * w;
    by += (next.by - by) * w;
  }
  if (mirror) {
    for (let k = 0; k < x.length; k++) { x[k] = 12 - x[k]!; y[k] = 8 - y[k]!; }
    bx = 12 - bx;
    by = 8 - by;
  }
  return {
    x, y, ids: f.ids, n0: f.n0, bx, by, frame: f, next, i,
    carrier: f.from,
    passTo: f.kind === 'pass' && u < flight ? f.to ?? null : null,
  };
}
