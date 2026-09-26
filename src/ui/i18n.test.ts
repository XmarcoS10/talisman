// Ogni chiave scritta per intero in una chiamata t('...') deve esistere in it.json: una svista qui mostra la chiave al giocatore.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import it_ from './it.json' with { type: 'json' };
import en_ from './en.json' with { type: 'json' };
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

  it('italiano e inglese hanno le stesse chiavi e gli stessi segnaposto (Blocco 5)', () => {
    const it2: Record<string, string> = it_, en2: Record<string, string> = en_;
    expect(Object.keys(en2).filter((k) => !(k in it2))).toEqual([]); // niente chiavi solo inglesi
    expect(Object.keys(it2).filter((k) => !(k in en2))).toEqual([]); // niente chiavi senza traduzione
    // {var|da} è la stessa variabile con la preposizione italiana
    const vars = (s: string) => [...new Set([...s.matchAll(/\{(\w+)(?:\|\w+)?\}/g)].map((m) => m[1]))].sort().join(',');
    expect(Object.keys(it2).filter((k) => vars(it2[k]!) !== vars(en2[k]!))).toEqual([]);
    // nessuna frase inglese lasciata in italiano per sbaglio (stessa identica frase, lunga)
    const same = Object.keys(it2).filter((k) => it2[k] === en2[k] && it2[k]!.split(' ').length > 3);
    expect(same).toEqual([]);
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

describe('ordinali inglesi', () => {
  it('1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st, 22nd, 101st', async () => {
    const { ordinalEn } = await import('./i18n.ts');
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 111].map(ordinalEn)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '101st', '111th']);
  });
});
