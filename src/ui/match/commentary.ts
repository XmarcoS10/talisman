// Racconto dell'azione: da un fotogramma del motore a una riga di testo (le parole stanno in it.json).
import type { TraceStep } from '../../engine/match/engine.ts';

export interface Line {
  key: string;
  vars: Record<string, string | number>;
  big: boolean; // gol: si vede più in grande
}

/** che cosa è appena successo in questa azione */
export function line(f: TraceStep, names: Map<number, string>): Line {
  const a = names.get(f.from) ?? '';
  const b = f.to !== undefined ? names.get(f.to) ?? '' : '';
  const vars = { min: f.min, a, b };
  switch (f.kind) {
    case 'pass':
      return { key: f.ok ? 'say.pass' : 'say.passLost', vars, big: false };
    case 'dribble':
      return { key: f.ok ? 'say.dribble' : 'say.dribbleLost', vars, big: false };
    case 'cross':
      return { key: f.ok ? 'say.cross' : 'say.crossOut', vars, big: false };
    case 'shot':
      return f.ok ? { key: 'say.goal', vars, big: true } : { key: 'say.shot', vars, big: false };
    case 'tackle':
      return { key: 'say.tackle', vars, big: false };
    case 'foul':
      return { key: 'say.foul', vars, big: false };
  }
}

/** le ultime `n` azioni fino a quella corrente, dalla più vecchia alla più recente */
export function lines(frames: TraceStep[], i: number, names: Map<number, string>, n = 3): Line[] {
  return frames.slice(Math.max(0, i - n + 1), i + 1).map((f) => line(f, names));
}
