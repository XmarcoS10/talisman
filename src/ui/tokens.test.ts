// Il tema chiaro si legge: ogni colore usato per il testo ha contrasto WCAG AA (4,5) sulle superfici chiare.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrast } from './procgen/color.ts';

const css = readFileSync('src/ui/tokens.css', 'utf8');
const light = css.slice(css.indexOf(":root[data-theme='light'] {"));
const tok = (name: string) => light.match(new RegExp(`--${name}: (#[0-9a-f]{6})`))![1]!;

describe('tema chiaro', () => {
  const text = ['text-1', 'text-2', 'text-3', 'accent', 'warning', 'negative', 'data-1', 'cyan-soft', 'gold', 'badge-def', 'badge-mid', 'badge-att'];
  it.each(text)('%s si legge su bianco e sul fondo', (name) => {
    expect(contrast(tok(name), tok('surface-1'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tok(name), tok('bg-0'))).toBeGreaterThanOrEqual(4.5);
  });
  it('il testo dei pulsanti principali si legge sul verde', () => {
    expect(contrast(tok('accent-ink'), tok('accent'))).toBeGreaterThanOrEqual(4.5);
  });
});
