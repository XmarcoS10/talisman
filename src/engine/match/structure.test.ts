// Il motore partita resta leggibile (Blocco 2a): nessuna funzione oltre 80 righe e complessità 20.
// Complessità = 1 + punti di decisione (if, cicli, case, catch, ternari, && || ??), contata per ogni funzione a sé.
import { readdirSync, readFileSync } from 'node:fs';
import { parseAst } from 'vite';
import { describe, expect, it } from 'vitest';

const DIR = new URL('./', import.meta.url);
const MAX_LINES = 80, MAX_CX = 20;
type Node = { type: string; start: number; end: number; [k: string]: unknown };
const FN = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);
const BRANCH = new Set(['IfStatement', 'ForStatement', 'ForOfStatement', 'ForInStatement', 'WhileStatement', 'DoWhileStatement',
  'CatchClause', 'ConditionalExpression']);

const kids = (n: Node): Node[] => Object.values(n).flatMap((v) => (Array.isArray(v) ? v : [v]))
  .filter((v): v is Node => typeof v === 'object' && v !== null && typeof (v as Node).type === 'string');

/** le funzioni di un file con righe e complessità; `name` è quella della variabile o della proprietà che la contiene */
export function measure(text: string) {
  const ast = parseAst(text, { lang: 'ts' }) as unknown as Node; // l'AST ESTree di oxc: basta la forma di Node
  const line = (pos: number) => text.slice(0, pos).split('\n').length;
  const out: { name: string; lines: number; cx: number }[] = [];
  const decisions = (n: Node): number => kids(n).reduce((c, k) => c + (FN.has(k.type) ? 0
    : (BRANCH.has(k.type) || (k.type === 'SwitchCase' && k.test) || (k.type === 'LogicalExpression') ? 1 : 0) + decisions(k)), 0);
  (function visit(n: Node, name: string) {
    for (const k of kids(n)) {
      const id = (k.id ?? k.key) as Node | undefined;
      const here = id && typeof id.name === 'string' ? id.name : name;
      if (FN.has(k.type)) out.push({ name: here, lines: line(k.end) - line(k.start) + 1, cx: 1 + decisions(k) });
      visit(k, here);
    }
  })(ast, '(anonima)');
  return out;
}

describe('struttura del motore partita', () => {
  it(`nessuna funzione oltre ${MAX_LINES} righe o complessità ${MAX_CX}`, () => {
    const bad: string[] = [];
    for (const f of readdirSync(DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts')))
      for (const m of measure(readFileSync(new URL(f, DIR), 'utf8')))
        if (m.lines > MAX_LINES || m.cx > MAX_CX) bad.push(`${f}: ${m.name} (${m.lines} righe, complessità ${m.cx})`);
    expect(bad).toEqual([]);
  });
});
