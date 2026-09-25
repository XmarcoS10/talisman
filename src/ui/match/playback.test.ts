// Riproduzione 2D: il motore deve produrre posizioni continue che bastino a disegnare una partita credibile.
import { describe, expect, it } from 'vitest';
import { matchSetups } from '../../engine/match.ts';
import { runMatch, shoutResponse } from '../../engine/match/engine.ts';
import type { Fixture } from '../../engine/model.ts';
import { Rng } from '../../engine/rng.ts';
import { newWorld } from '../../engine/world.ts';
import { RULES, context, pick } from './analyst.ts';
import { duration, ensure, sample } from './playback.ts';
import { line } from './commentary.ts';
import { momentsAt } from './moments.ts';

const setup = (mine: 0 | 1 = 0) => {
  const w = newWorld(17);
  const [home, away] = w.competitions.ITA1!.clubIds;
  w.manager.clubId = (mine === 0 ? home : away)!;
  const fx: Fixture = { day: 0, home: home!, away: away! };
  return { w, fx, run: runMatch(new Rng(4), matchSetups(w, fx, true), []) };
};

describe('partita in 2D (F6)', { timeout: 30000 }, () => {
  it("le indicazioni dalla panchina spostano il logit secondo il carattere, e non si ripetono prima di un quarto d'ora", () => {
    const { run } = setup();
    const before = run.teams[0].on.map((m) => m.mod);
    expect(run.shout(0, 'demand')).toBe(true);
    run.teams[0].on.forEach((m, i) => {
      const r = shoutResponse(m.p, 'demand');
      expect(Math.sign(m.mod - before[i]!)).toBe(Math.sign(r));
    });
    expect(run.shout(0, 'calm')).toBe(false); // troppo presto
    expect(run.nextShout(0)).toBeGreaterThan(run.minute());
    expect(run.shout(1, 'calm')).toBe(true); // l'altra panchina è libera
  });

  it('ogni fotogramma ha i giocatori dentro il campo e il tempo non torna indietro', () => {
    const { run } = setup();
    run.result();
    expect(run.track.length).toBeGreaterThan(5000);
    let last = -1;
    for (const f of run.track) {
      expect(f.ids.length).toBe(f.xy.length / 2);
      expect(f.ids.length).toBeGreaterThanOrEqual(18); // qualche espulsione è possibile
      expect(f.ids.length).toBeLessThanOrEqual(22);
      for (let i = 0; i < f.ids.length; i++) {
        expect(f.xy[2 * i]! >= -0.6 && f.xy[2 * i]! <= 12.6).toBe(true);
        expect(f.xy[2 * i + 1]! >= -0.6 && f.xy[2 * i + 1]! <= 8.6).toBe(true);
      }
      expect(f.bx >= -0.6 && f.bx <= 12.6).toBe(true);
      expect(f.at).toBeGreaterThanOrEqual(last);
      last = f.at;
    }
    expect(run.track[run.track.length - 1]!.min).toBeGreaterThan(85);
  });

  it('i giocatori corrono, non si teletrasportano: nessun salto oltre la velocità massima', () => {
    const { run } = setup();
    run.result();
    let max = 0;
    for (let i = 1; i < run.track.length; i++) {
      const a = run.track[i - 1]!, b = run.track[i]!;
      if (a.ids !== b.ids) continue; // cambio: la formazione è diversa
      for (let k = 0; k < a.ids.length; k++)
        max = Math.max(max, Math.abs(b.xy[2 * k]! - a.xy[2 * k]!) + Math.abs(b.xy[2 * k + 1]! - a.xy[2 * k + 1]!));
    }
    expect(max).toBeLessThan(0.6); // 0,25 s alla velocità di un uomo lanciato: ben meno di mezza zona
  });

  it('la simulazione avanza solo quanto serve alla riproduzione e il campo si muove', () => {
    const { run } = setup();
    ensure(run, 60);
    expect(run.done).toBe(false);
    expect(duration(run)).toBeLessThan(200); // non ha giocato tutta la partita
    const a = sample(run, 10)!;
    const b = sample(run, 55)!;
    expect(a).not.toBeNull();
    const moved = a.ids.filter((id, i) => {
      const j = b.ids.indexOf(id);
      return j >= 0 && Math.abs(a.x[i]! - b.x[j]!) + Math.abs(a.y[i]! - b.y[j]!) > 0.3;
    });
    expect(moved.length).toBeGreaterThan(5);
    expect(Math.abs(a.bx - b.bx) + Math.abs(a.by - b.by)).toBeGreaterThan(0.2);
  });

  it("la palla alta si stacca da terra (ombra) solo mentre vola, e ricade", () => {
    const { run } = setup();
    run.result();
    let up = 0;
    for (let T = 0; T < duration(run); T += 0.5) {
      const s = sample(run, T)!;
      expect(s.h).toBeGreaterThanOrEqual(0);
      expect(s.h).toBeLessThanOrEqual(1);
      if (s.h > 0) { up++; expect(s.carrier).toBe(0); } // nessuno la tiene mentre è in aria
    }
    expect(up).toBeGreaterThan(50); // cross e lanci lunghi ci sono in ogni partita
  });

  it('ogni gol, cartellino e fuorigioco del registro si vede sul campo come momento (Blocco 3)', () => {
    const { run } = setup();
    run.result();
    const seen = new Map<string, Set<number>>();
    for (let T = 0; T < duration(run); T += 0.25) {
      const s = sample(run, T)!;
      for (const m of momentsAt(run, T, s.i, 6, false)) {
        expect(m.age).toBeGreaterThanOrEqual(0);
        expect(m.age).toBeLessThan(1);
        if (!seen.has(m.kind)) seen.set(m.kind, new Set());
        seen.get(m.kind)!.add(m.step);
      }
    }
    for (const kind of ['goal', 'yellow', 'offside', 'foul'] as const) {
      const want = run.frames.filter((f) => f.beats?.some((b) => b.kind === kind)).length;
      expect(seen.get(kind)?.size ?? 0, kind).toBe(want);
    }
  });

  it('cambio deciso dalla panchina: entra chi scelgo io', () => {
    const { run } = setup();
    ensure(run, 600);
    const out = run.teams[0].on.find((m) => m.pos !== 'GK')!;
    const inP = run.teams[0].bench[0]!;
    expect(run.sub(0, out.p.id, inP.id)).toBe(true);
    expect(run.teams[0].on.some((m) => m.p.id === inP.id)).toBe(true);
    expect(run.teams[0].on.some((m) => m.p.id === out.p.id)).toBe(false);
    ensure(run, 900);
    expect(run.track[run.track.length - 1]!.ids).toContain(inP.id);
  });

  it('in trasferta il campo si specchia: attacchiamo sempre verso destra, in tutti e due i tempi', () => {
    const { run } = setup(1); // l'utente allena la squadra ospite
    run.result();
    const gkId = run.teams[1].on.find((m) => m.pos === 'GK')!.p.id;
    for (const half of [1, 2]) {
      // una nostra azione offensiva: nel sistema grezzo la palla va verso x = 0, presentata deve andare verso x = 12
      const f = run.track.find((k) => k.half === half && k.bx < 2.5 && k.carrier !== 0 && run.teams[1].on.some((m) => m.p.id === k.carrier));
      expect(f).toBeDefined();
      const raw = sample(run, f!.at)!;
      const shown = sample(run, f!.at, true)!;
      expect(raw.bx).toBeLessThan(2.5);
      expect(shown.bx).toBeGreaterThan(9.5); // attacchiamo verso destra
      const gk = shown.ids.indexOf(gkId);
      expect(gk).toBeGreaterThanOrEqual(0);
      expect(shown.x[gk]!).toBeLessThan(4); // il nostro portiere resta a sinistra
      shown.ids.forEach((id, i) => {
        const j = raw.ids.indexOf(id);
        expect(shown.x[i]!).toBeCloseTo(12 - raw.x[j]!, 5);
        expect(shown.y[i]!).toBeCloseTo(8 - raw.y[j]!, 5);
      });
    }
  });

  it("l'analista ha almeno 60 regole e dice qualcosa di sensato", () => {
    expect(RULES.length).toBeGreaterThanOrEqual(60);
    expect(new Set(RULES.map((r) => r.id)).size).toBe(RULES.length);
    const { run } = setup();
    ensure(run, 1800);
    const said = new Map<string, number>();
    const c = context(run, 0, run.frames, 65);
    expect(c.poss).toBeGreaterThan(20);
    expect(c.poss).toBeLessThan(80);
    const p = pick(c, said);
    expect(p).not.toBeNull();
    expect(pick(c, said)?.id).not.toBe(p!.id); // non ripete la stessa frase
  });

  it('un tiro che diventa gol è raccontato come gol', () => {
    const { w, fx } = setup();
    const names = new Map<number, string>();
    let told = 0, scored = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const run = runMatch(new Rng(seed), matchSetups(w, fx), []);
      run.result();
      run.frames.forEach((f, k) => {
        if (f.kind !== 'shot') return;
        const after = run.frames[k + 1]?.score ?? run.score;
        if (after[f.side] > f.score[f.side]) scored++;
        if (line(f, names).key === 'say.goal') told++;
      });
    }
    expect(scored).toBeGreaterThan(0);
    expect(told).toBe(scored);
  });

  it('il registro racconta i momenti di ogni azione: un gol per ogni gol, giocatori in campo, piazzati e duelli', () => {
    const { w, fx } = setup();
    let goals = 0, beatsGoal = 0;
    const kinds = new Set<string>();
    for (let seed = 1; seed <= 4; seed++) {
      const run = runMatch(new Rng(seed), matchSetups(w, fx), []);
      run.result();
      goals += run.score[0] + run.score[1];
      for (const f of run.frames) {
        kinds.add(f.kind);
        for (const b of f.beats ?? []) {
          kinds.add(b.kind);
          if (b.kind === 'goal') beatsGoal++;
          expect(f.ids).toContain(b.who); // chi è coinvolto è in campo in quel momento
        }
      }
    }
    expect(beatsGoal).toBe(goals);
    for (const k of ['tackle', 'foul', 'corner', 'header', 'intercept', 'save']) expect(kinds).toContain(k);
  });
});
