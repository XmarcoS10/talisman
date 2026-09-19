// Riproduzione 2D: il registro del motore deve bastare a disegnare una partita credibile.
import { describe, expect, it } from 'vitest';
import { matchSetups } from '../../engine/match.ts';
import { runMatch } from '../../engine/match/engine.ts';
import type { Fixture } from '../../engine/model.ts';
import { Rng } from '../../engine/rng.ts';
import { newWorld } from '../../engine/world.ts';
import { RULES, context, pick } from './analyst.ts';
import { ensure, sample, timeline } from './playback.ts';

const setup = () => {
  const w = newWorld(17);
  const [home, away] = w.competitions.ITA1!.clubIds;
  w.manager.clubId = home!;
  const fx: Fixture = { day: 0, home: home!, away: away! };
  return { w, fx, run: runMatch(new Rng(4), matchSetups(w, fx, true), []) };
};

describe('partita in 2D (F6)', () => {
  it('ogni fotogramma ha 22 giocatori dentro il campo e il tempo non torna indietro', () => {
    const { run } = setup();
    run.result();
    expect(run.frames.length).toBeGreaterThan(300);
    let last = -1;
    for (const f of run.frames) {
      expect(f.ids.length).toBe(f.px.length);
      expect(f.ids.length).toBeGreaterThanOrEqual(18); // qualche espulsione è possibile
      expect(f.ids.length).toBeLessThanOrEqual(22);
      expect(new Set(f.ids).size).toBe(f.ids.length);
      for (let i = 0; i < f.px.length; i++) {
        expect(f.px[i]! >= -0.5 && f.px[i]! <= 12.5).toBe(true);
        expect(f.py[i]! >= -0.5 && f.py[i]! <= 8.5).toBe(true);
      }
      expect(f.bx >= -0.5 && f.bx <= 12.5).toBe(true);
      const abs = (f.half - 1) * 10000 + f.t;
      expect(abs).toBeGreaterThanOrEqual(last);
      last = abs;
    }
    expect(run.frames.at(-1)!.min).toBeGreaterThan(85);
  });

  it('la simulazione avanza solo quanto serve alla riproduzione e il campo si muove', () => {
    const { run } = setup();
    const at: number[] = timeline(run.frames);
    ensure(run, at, 60);
    expect(run.done).toBe(false);
    expect(run.frames.length).toBeLessThan(200); // non ha giocato tutta la partita
    const a = sample(run.frames, at, 10)!;
    const b = sample(run.frames, at, 55)!;
    expect(a).not.toBeNull();
    const moved = a.ids.filter((id, i) => {
      const j = b.ids.indexOf(id);
      return j >= 0 && Math.abs(a.x[i]! - b.x[j]!) + Math.abs(a.y[i]! - b.y[j]!) > 0.3;
    });
    expect(moved.length).toBeGreaterThan(5);
    expect(Math.abs(a.bx - b.bx) + Math.abs(a.by - b.by)).toBeGreaterThan(0.2);
  });

  it('cambio deciso dalla panchina: entra chi scelgo io', () => {
    const { run } = setup();
    const at: number[] = [];
    ensure(run, at, 600);
    const out = run.teams[0].on.find((m) => m.pos !== 'GK')!;
    const inP = run.teams[0].bench[0]!;
    expect(run.sub(0, out.p.id, inP.id)).toBe(true);
    expect(run.teams[0].on.some((m) => m.p.id === inP.id)).toBe(true);
    expect(run.teams[0].on.some((m) => m.p.id === out.p.id)).toBe(false);
    ensure(run, at, 900);
    expect(run.frames.at(-1)!.ids).toContain(inP.id);
  });

  it("l'analista ha almeno 60 regole e dice qualcosa di sensato", () => {
    expect(RULES.length).toBeGreaterThanOrEqual(60);
    expect(new Set(RULES.map((r) => r.id)).size).toBe(RULES.length);
    const { run } = setup();
    const at: number[] = [];
    ensure(run, at, 1800);
    const said = new Map<string, number>();
    const c = context(run, 0, run.frames, 65);
    expect(c.poss).toBeGreaterThan(20);
    expect(c.poss).toBeLessThan(80);
    const p = pick(c, said);
    expect(p).not.toBeNull();
    expect(pick(c, said)?.id).not.toBe(p!.id); // non ripete la stessa frase
  });
});
