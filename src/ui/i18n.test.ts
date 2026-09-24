// Ogni chiave scritta per intero in una chiamata t('...') deve esistere in it.json: una svista qui mostra la chiave al giocatore.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import it_ from './it.json' with { type: 'json' };
import press from '../data/narrative/press.json' with { type: 'json' };

const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
});

describe('testi', () => {
  it('nessuna chiave mancante in it.json', () => {
    const keys = new Set(Object.keys(it_));
    const missing: string[] = [];
    for (const f of files('src/ui').filter((f) => !/i18n/.test(f))) {
      for (const m of readFileSync(f, 'utf8').matchAll(/\bt\(\s*'([\w.]+)'/g)) if (!keys.has(m[1]!)) missing.push(`${f}: ${m[1]}`);
    }
    expect(missing).toEqual([]);
  });

  it('ogni tipo di risposta in conferenza stampa ha la sua etichetta', () => {
    const kinds = Object.keys(press).filter((k) => k.startsWith('a.')).map((k) => `press.kind.${k.slice(2)}`);
    expect(kinds.filter((k) => !(k in it_))).toEqual([]);
  });

  it('ogni tratto di personalità, alto e basso, ha nome e frase', () => {
    const keys = ['ambition', 'professionalism', 'loyalty', 'temperament', 'sociability', 'pressureTolerance']
      .flatMap((k) => ['hi', 'lo'].flatMap((l) => [`trait.${k}.${l}.name`, `trait.${k}.${l}.what`]));
    expect(keys.filter((k) => !(k in it_))).toEqual([]);
  });
});
