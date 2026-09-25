// Regola dei «salienti» (Blocco 3, scelta di Marco: per esito). Quali azioni si vedono in modalità Salienti ed
// Estesa, e per quanto: 8 secondi prima e 3 dopo; le azioni vicine si fondono in una. Tra un saliente e l'altro il
// cronometro corre veloce e scorre il racconto. Il test in highlights.test.ts controlla che una partita in Salienti
// duri 4-7 minuti reali e contenga tutti i gol.
import type { MatchRun, TraceStep } from '../../engine/match/engine.ts';

export type ViewMode = 'highlights' | 'extended' | 'full';
export const VIEW_MODES: ViewMode[] = ['highlights', 'extended', 'full'];

export type ClipKind = 'goal' | 'penalty' | 'red' | 'injury' | 'save' | 'chance' | 'press' | 'break';

/** secondi di gioco prima e dopo il momento chiave */
export const PRE = 8;
export const POST = 3;
/** un tiro è saliente da questo xG in su (anche se va fuori) */
export const CHANCE_XG = 0.15;
/** velocità della riproduzione (secondi di gioco per secondo reale): dentro un saliente e fra un saliente e l'altro */
export const CLIP_SPEED = 2;
export const SKIP_SPEED = 16;

// dal più importante: quando due azioni si fondono, il saliente prende il tipo di quella che conta di più
const RANK: ClipKind[] = ['goal', 'penalty', 'red', 'injury', 'save', 'chance', 'break', 'press'];

/** perché questa azione è saliente (null se non lo è) */
export function classify(f: TraceStep, mode: ViewMode, prev?: TraceStep): ClipKind | null {
  let k: ClipKind | null = null;
  const take = (c: ClipKind) => { if (k === null || RANK.indexOf(c) < RANK.indexOf(k)) k = c; };
  for (const b of f.beats ?? []) {
    if (b.kind === 'goal') take('goal');
    else if (b.kind === 'penalty') take('penalty');
    else if (b.kind === 'red') take('red');
    else if (b.kind === 'injury') take('injury');
    else if (b.kind === 'save' || b.kind === 'parry') take('save');
    else if (b.kind === 'shot' && (b.xg ?? 0) >= CHANCE_XG) take('chance');
  }
  if (k !== null || mode !== 'extended') return k;
  // Estesa: anche le fasi di pressione (palla recuperata nell'ultimo terzo avversario che diventa subito un tiro o un
  // cross) e le ripartenze (palla recuperata nella propria metà campo e portata subito nell'ultimo terzo)
  const back = prev && prev.side !== f.side ? regainX(prev) : null;
  if (back === null) return k;
  if (back > 8 && (f.kind === 'shot' || f.kind === 'cross')) take('press');
  else if (back < 6 && f.tx !== undefined && (f.side === 0 ? f.tx : 12 - f.tx) >= 8.5) take('break');
  return k;
}

/** dove la difesa ha recuperato palla in questa azione, vista da chi recupera (0 = la propria porta); null se non l'ha recuperata */
function regainX(f: TraceStep): number | null {
  const b = f.beats?.find((x) => x.kind === 'tackle' || x.kind === 'intercept');
  if (!b) return null;
  return f.side === 0 ? 12 - b.x : b.x; // chi recupera è la squadra che difendeva
}

export interface Clip {
  from: number; // istante di riproduzione (secondi della traccia)
  to: number;
  kind: ClipKind;
  min: number;
  side: 0 | 1;
  step: number; // l'azione chiave
}

/**
 * Salienti di una partita che si sta giocando: si aggiornano man mano che il motore produce fotogrammi.
 * Un'azione si valuta solo quando la traccia l'ha già superata (se ne conosce inizio e fine).
 */
export class Reel {
  clips: Clip[] = [];
  private start: number[] = []; // istante in cui comincia ogni azione
  private live: number[] = []; // fine della parte giocata (non ferma) di ogni azione
  private ti = 0;
  private fi = 0;
  readonly mode: ViewMode;
  constructor(mode: ViewMode) { this.mode = mode; }

  update(run: MatchRun) {
    const { track, frames } = run;
    for (; this.ti < track.length; this.ti++) {
      const p = track[this.ti]!;
      this.start[p.step] ??= p.at;
      if (!p.dead || this.live[p.step] === undefined) this.live[p.step] = p.at;
    }
    const last = track.length ? track[track.length - 1]!.step : 0;
    for (; this.fi < last || (run.done && this.fi < frames.length); this.fi++) {
      const f = frames[this.fi]!;
      const kind = classify(f, this.mode, frames[this.fi - 1]);
      const s = this.start[this.fi];
      if (kind === null || s === undefined) continue;
      this.add({ from: Math.max(0, s - PRE), to: (this.live[this.fi] ?? s) + POST, kind, min: f.min, side: f.side as 0 | 1, step: this.fi });
    }
  }

  private add(c: Clip) {
    const prev = this.clips[this.clips.length - 1];
    if (prev && c.from <= prev.to) { // si sovrappongono: un solo saliente
      prev.to = Math.max(prev.to, c.to);
      if (RANK.indexOf(c.kind) < RANK.indexOf(prev.kind)) { prev.kind = c.kind; prev.step = c.step; prev.min = c.min; prev.side = c.side; }
      return;
    }
    this.clips.push(c);
  }

  /** il saliente in corso all'istante T, o null se T è fra due salienti */
  at(T: number): Clip | null {
    for (let i = this.clips.length - 1; i >= 0; i--) {
      const c = this.clips[i]!;
      if (c.from <= T && T < c.to) return c;
      if (c.to <= T) return null;
    }
    return null;
  }
}

/** velocità di riproduzione all'istante T: in modalità Completa quella scelta, altrimenti dentro o fuori da un saliente */
export const speedAt = (reel: Reel | null, T: number, full: number) => (!reel || reel.mode === 'full' ? full : reel.at(T) ? CLIP_SPEED : SKIP_SPEED);

/** minuti reali che serve a guardare tutta la partita in questa modalità (la partita deve essere finita) */
export function realMinutes(reel: Reel, total: number): number {
  let inClips = 0;
  for (const c of reel.clips) inClips += Math.min(c.to, total) - c.from;
  return (inClips / CLIP_SPEED + (total - inClips) / SKIP_SPEED) / 60;
}
