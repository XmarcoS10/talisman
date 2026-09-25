// Racconto dell'azione (Blocco 3, punto 7): da un fotogramma del motore a una riga di testo. Si racconta il momento
// che conta di più dell'azione (gol, cartellino, parata, fuorigioco...), non solo il tipo di giocata; ogni tipo ha
// VARIANTS frasi in it.json (`say.<tipo>.<n>`), scelte in modo fisso dall'indice dell'azione, così non si ripetono
// di fila e la stessa partita si racconta sempre uguale.
import type { TraceStep } from '../../engine/match/engine.ts';
import type { BeatKind } from '../../engine/match/trace.ts';

export const VARIANTS = 5;

export const SAY = ['goal', 'red', 'penalty', 'yellow', 'save', 'parry', 'block', 'miss', 'offside', 'injury', 'corner', 'freeKick',
  'foul', 'tackle', 'intercept', 'claim', 'dribble', 'dribbleLost', 'cross', 'crossOut', 'passLost', 'pass'] as const;
export type SayKind = typeof SAY[number];

export interface Line {
  key: string;
  vars: Record<string, string | number>;
  big: boolean; // gol: si vede più in grande
  kind: SayKind;
}

// momenti del registro che danno il tono alla riga, dal più importante
const BY_BEAT: [BeatKind, SayKind][] = [['goal', 'goal'], ['red', 'red'], ['penalty', 'penalty'], ['yellow', 'yellow'], ['save', 'save'],
  ['parry', 'parry'], ['block', 'block'], ['miss', 'miss'], ['offside', 'offside'], ['injury', 'injury'], ['corner', 'corner'],
  ['freeKick', 'freeKick'], ['foul', 'foul'], ['tackle', 'tackle'], ['intercept', 'intercept'], ['claim', 'claim']];

/** chi è il protagonista (a) e chi l'altro (b) per ogni tipo di riga */
function who(kind: SayKind, f: TraceStep, beat: { who: number; vs?: number } | undefined): [number | undefined, number | undefined] {
  const shooter = f.beats?.find((b) => b.kind === 'shot')?.who ?? f.from;
  switch (kind) {
    case 'save': case 'parry': return [shooter, beat?.who]; // il tiratore e il portiere
    case 'block': return [shooter, beat?.who];
    case 'foul': return [beat?.vs, beat?.who]; // chi lo subisce e chi lo fa
    case 'tackle': return [f.from, beat?.who]; // chi perde palla e chi la ruba
    case 'intercept': return [beat?.who, f.from]; // chi intercetta e chi ha sbagliato
    case 'pass': return [f.from, f.to];
    case 'dribbleLost': return [f.from, undefined];
    case 'dribble': return [f.from, f.beats?.find((b) => b.kind === 'beat')?.vs];
    default: return [beat?.who ?? f.from, beat?.vs];
  }
}

/** che cosa è appena successo in questa azione; `i` è l'indice dell'azione (per variare la frase) */
export function line(f: TraceStep, names: Map<number, string>, i = 0): Line {
  let kind: SayKind | null = null, beat: { who: number; vs?: number } | undefined;
  for (const [b, k] of BY_BEAT) {
    const found = f.beats?.find((x) => x.kind === b);
    if (found) { kind = k; beat = found; break; }
  }
  if (kind === 'tackle' && f.kind === 'dribble') kind = 'dribbleLost'; // il dribbling fermato da un contrasto
  if (kind === null) {
    kind = f.kind === 'pass' ? (f.ok ? 'pass' : 'passLost') : f.kind === 'dribble' ? (f.ok ? 'dribble' : 'dribbleLost')
      : f.kind === 'cross' ? (f.ok ? 'cross' : 'crossOut') : f.kind === 'shot' ? 'miss' : f.kind === 'foul' ? 'foul' : 'tackle';
  }
  const [a, b] = who(kind, f, beat);
  const n = ((i * 7 + SAY.indexOf(kind) * 3) % VARIANTS) + 1;
  return {
    key: `say.${kind}.${n}`,
    vars: { min: f.min, a: a !== undefined ? names.get(a) ?? '' : '', b: b !== undefined ? names.get(b) ?? '' : '' },
    big: kind === 'goal',
    kind,
  };
}

/**
 * le ultime `n` righe fino all'azione corrente, dalla più vecchia alla più recente. `quiet`: nei salienti i passaggi
 * riusciti non si raccontano (niente «X serve Y» a ogni tocco), restano solo le cose che cambiano l'azione.
 */
export function lines(frames: TraceStep[], i: number, names: Map<number, string>, n = 3, quiet = false): Line[] {
  const out: Line[] = [];
  for (let k = Math.min(i, frames.length - 1); k >= 0 && k > i - 300 && out.length < n; k--) {
    const l = line(frames[k]!, names, k);
    if (!quiet || l.kind !== 'pass') out.unshift(l);
  }
  return out;
}
