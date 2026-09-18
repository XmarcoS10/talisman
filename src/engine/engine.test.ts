import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SQUAD_TEMPLATE } from './balance.ts';
import { Rng } from './rng.ts';
import { deserialize, serialize } from './save.ts';
import { advance, endSeason, isSeasonOver, newWorld, roundRobin, standings } from './world.ts';

describe('confini del motore (GUIDA §2)', () => {
  const dir = new URL('.', import.meta.url);
  const sources = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
  it.each(sources)('%s non importa UI/Node e non usa caso o tempo reale', (f) => {
    const src = readFileSync(new URL(f, dir), 'utf8');
    expect(src).not.toMatch(/from ['"](react|react-dom|electron|node:[^'"]+|fs|path)['"]/);
    expect(src).not.toMatch(/Math\.random|Date\.now|new Date\(\)/);
  });
});

describe('Rng', () => {
  it('stesso seed, stessa sequenza', () => {
    const a = new Rng(42), b = new Rng(42);
    expect(Array.from({ length: 5 }, () => a.u32())).toEqual(Array.from({ length: 5 }, () => b.u32()));
  });
  it('uniforme e gaussiana con media e varianza giuste', () => {
    const r = new Rng(7);
    const u = Array.from({ length: 50000 }, () => r.next());
    const g = Array.from({ length: 50000 }, () => r.gauss(10, 2));
    const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    const variance = (a: number[]) => {
      const m = mean(a);
      return mean(a.map((v) => (v - m) ** 2));
    };
    expect(mean(u)).toBeCloseTo(0.5, 2);
    expect(variance(u)).toBeCloseTo(1 / 12, 2);
    expect(mean(g)).toBeCloseTo(10, 1);
    expect(Math.sqrt(variance(g))).toBeCloseTo(2, 1);
    expect(Math.min(...u)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...u)).toBeLessThan(1);
  });
  it('poisson ha media lambda', () => {
    const r = new Rng(3);
    const xs = Array.from({ length: 20000 }, () => r.poisson(1.4));
    expect(xs.reduce((s, v) => s + v, 0) / xs.length).toBeCloseTo(1.4, 1);
  });
});

describe('calendario', () => {
  it('ogni coppia si affronta due volte, una in casa e una fuori', () => {
    const ids = Array.from({ length: 20 }, (_, i) => i);
    const fx = roundRobin(ids, new Rng(1));
    expect(fx).toHaveLength(380);
    const pairs = new Set(fx.map((f) => `${f.home}-${f.away}`));
    expect(pairs.size).toBe(380);
    for (const d of new Set(fx.map((f) => f.day))) {
      const teams = fx.filter((f) => f.day === d).flatMap((f) => [f.home, f.away]);
      expect(new Set(teams).size).toBe(20); // nessuno gioca due volte nello stesso turno
    }
  });
});

describe('mondo', () => {
  it('rose complete e nessun giocatore in due club', () => {
    const w = newWorld(1);
    const seen = new Set<number>();
    const size = Object.values(SQUAD_TEMPLATE).reduce((a, b) => a + b, 0);
    for (const c of Object.values(w.clubs)) {
      expect(c.playerIds).toHaveLength(size);
      for (const id of c.playerIds) {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
        expect(w.players[id]!.clubId).toBe(c.id);
      }
    }
  });

  it('deterministico: stesso seed, stessa stagione', () => {
    const run = () => {
      const w = newWorld(99);
      while (!isSeasonOver(w)) advance(w);
      return standings(w, w.competitions.ITA1!).map((r) => `${r.clubId}:${r.pts}`).join();
    };
    expect(run()).toBe(run());
  });

  it('tre stagioni: promozioni, rose ≥ 25, attributi in 1-20, salvataggio reversibile', () => {
    const w = newWorld(5);
    for (let s = 0; s < 3; s++) {
      while (!isSeasonOver(w)) advance(w);
      const sum = endSeason(w);
      expect(sum.promoted).toHaveLength(3);
      expect(sum.relegated).toHaveLength(3);
    }
    expect(w.competitions.ITA1!.clubIds).toHaveLength(20);
    for (const c of Object.values(w.clubs)) expect(c.playerIds.length).toBeGreaterThanOrEqual(25);
    for (const p of Object.values(w.players)) for (const v of Object.values(p.attrs)) expect(v >= 1 && v <= 20).toBe(true);
    expect(deserialize(serialize(w))).toEqual(w);
  });
});
