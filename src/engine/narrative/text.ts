// Motore di template a grammatica (GUIDA §7.4, stile tracery): niente LLM a runtime, costo zero e offline.
// Sintassi di un template:
//   {var}          variabile già flessa (vedi italian.ts: {club_di} → "della Vignarola")
//   #frammento#    espande un frammento condiviso della grammatica, scegliendone una variante
//   [a|b|c]        scelta in linea, annidabile; "testo^3" pesa tre volte
// La scelta usa l'Rng del mondo: stesso seme, stessa storia.
import type { Rng } from '../rng.ts';
import { tidy } from './italian.ts';

export type Vars = Record<string, string | number>;
export type Grammar = Record<string, string[]>;

/** sceglie fra alternative con peso opzionale "^n" in coda */
function pick(rng: Rng, options: string[]): string {
  const parsed = options.map((o) => {
    const m = /\^(\d+)$/.exec(o);
    return m ? { s: o.slice(0, m.index), w: Number(m[1]) } : { s: o, w: 1 };
  });
  return parsed[rng.weighted(parsed.map((p) => p.w))]!.s;
}

/** divide "a|b|[c|d]" sui | di primo livello, rispettando le parentesi annidate */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '[') depth++;
    else if (c === ']') depth--;
    else if (c === '|' && depth === 0) { out.push(s.slice(start, i)); start = i + 1; }
  }
  out.push(s.slice(start));
  return out;
}

function expandRaw(t: string, vars: Vars, g: Grammar, rng: Rng, depth: number): string {
  if (depth > 12) return t; // protezione contro grammatiche ricorsive
  let out = '';
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '[') {
      let d = 1, j = i + 1;
      while (j < t.length && d > 0) { if (t[j] === '[') d++; else if (t[j] === ']') d--; j++; }
      out += expandRaw(pick(rng, splitTop(t.slice(i + 1, j - 1))), vars, g, rng, depth + 1);
      i = j - 1;
    } else if (c === '#') {
      const j = t.indexOf('#', i + 1);
      const key = t.slice(i + 1, j);
      const opts = g[key];
      out += opts?.length ? expandRaw(pick(rng, opts), vars, g, rng, depth + 1) : '';
      i = j;
    } else if (c === '{') {
      const j = t.indexOf('}', i + 1);
      const v = vars[t.slice(i + 1, j)];
      out += v === undefined ? '' : String(v);
      i = j;
    } else out += c;
  }
  return out;
}

/** espande un template in una frase italiana finita */
export const expand = (t: string, vars: Vars, g: Grammar, rng: Rng) => tidy(expandRaw(t, vars, g, rng, 0));

/**
 * sceglie un template e lo espande evitando le frasi già dette troppe volte (`seen`): la stessa riga
 * non deve comparire più di `max` volte in una stagione (criterio di P8).
 */
export function write(templates: string[], vars: Vars, g: Grammar, rng: Rng, seen: Map<string, number>, max = 3): string {
  let best = '';
  for (let attempt = 0; attempt < 10; attempt++) {
    const s = expand(pick(rng, templates), vars, g, rng);
    best = s;
    if ((seen.get(s) ?? 0) < max) break;
  }
  seen.set(best, (seen.get(best) ?? 0) + 1);
  return best;
}
