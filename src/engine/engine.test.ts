import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SQUAD_TEMPLATE } from './balance.ts';
import { developPlayer } from './development.ts';
import { INJURIES, injure } from './injuries.ts';
import { pickXI, playMatch } from './match.ts';
import { chem } from './match/decision.ts';
import { exclude, makePromise } from './morale.ts';
import { influence, leaders } from './social.ts';
import type { Fixture } from './model.ts';
import { Rng } from './rng.ts';
import { deserialize, serialize, SCHEMA_VERSION } from './save.ts';
import { advance, endSeason, isSeasonOver, newWorld, roundRobin, standings } from './world.ts';

describe('confini del motore (GUIDA §2)', () => {
  const dir = new URL('.', import.meta.url);
  const sources = (readdirSync(dir, { recursive: true }) as string[])
    .map((f) => f.replaceAll('\\', '/'))
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
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

describe('salvataggi', () => {
  it('un save della versione 1 (motore L0) si carica e viene migrato', () => {
    const w = newWorld(8);
    // riporta il mondo alla forma della v1: niente condizione estesa, disciplina, forma, tattica
    const raw = JSON.parse(serialize(w));
    raw.schemaVersion = 1;
    for (const p of Object.values(raw.players) as Record<string, unknown>[]) {
      delete p.discipline; delete p.form;
      p.condition = { fitness: 100 };
      p.stats = { apps: 0, goals: 0, assists: 0 };
    }
    for (const c of Object.values(raw.clubs) as Record<string, unknown>[]) delete c.tactic;
    const m = deserialize(JSON.stringify(raw));
    expect(m.schemaVersion).toBe(SCHEMA_VERSION);
    const p = Object.values(m.players)[0]!;
    expect(p.discipline).toEqual({ yellows: 0, ban: 0 });
    expect(p.condition.injuryDays).toBe(0);
    const club = Object.values(m.clubs)[0]!;
    expect(club.tactic.formation).toBe('4-3-3');
    expect(club.tactic.roles).toHaveLength(11);
    expect(m.news).toEqual([]);
    expect(club.training).toHaveLength(12);
    expect(club.playerIds.some((id) => Object.keys(m.players[id]!.rel).length > 0)).toBe(true); // grafo sociale creato
    expect(club.playerIds.every((id) => m.players[id]!.agentId !== null)).toBe(true); // ognuno col suo agente
    advance(m); // e si gioca
  });
});

describe('partita L2', () => {
  const setup = () => {
    const w = newWorld(3);
    const [h, a] = w.competitions.ITA1!.clubIds;
    return { w, fx: { day: 0, home: h!, away: a! } as Fixture };
  };

  it('deterministica: stesso seed, stessa partita (golden)', () => {
    const run = () => {
      const { w, fx } = setup();
      playMatch(w, new Rng(11), fx);
      return fx.result!;
    };
    expect(run()).toEqual(run());
  });

  it('risultato coerente: gol = eventi gol, statistiche plausibili, voti 3-10', () => {
    const { w, fx } = setup();
    playMatch(w, new Rng(12), fx);
    const r = fx.result!;
    const goals = (side: 0 | 1) => r.events.filter((e) => e.side === side && (e.type === 'goal' || e.type === 'penGoal')).length;
    expect(goals(0)).toBe(r.hg);
    expect(goals(1)).toBe(r.ag);
    expect(r.stats[0].possession + r.stats[1].possession).toBe(100);
    for (const s of r.stats) {
      expect(s.passesOk).toBeLessThanOrEqual(s.passes);
      expect(s.onTarget).toBeLessThanOrEqual(s.shots);
    }
    for (const v of Object.values(r.ratings)) expect(v >= 3 && v <= 10).toBe(true);
  });

  it('statistico: in 150 partite media gol realistica e la più forte vince più spesso', () => {
    const w = newWorld(4);
    const ids = [...w.competitions.ITA1!.clubIds].sort((a, b) => w.clubs[b]!.reputation - w.clubs[a]!.reputation);
    const rng = new Rng(5);
    const rest = () => { for (const p of Object.values(w.players)) Object.assign(p.condition, { fitness: 100, injuryDays: 0 }); };
    let goals = 0, strongPts = 0;
    for (let i = 0; i < 150; i++) {
      rest();
      const fx: Fixture = { day: 0, home: ids[i % 20]!, away: ids[(i * 7 + 3) % 20]! }; // accoppiamenti vari
      if (fx.home === fx.away) fx.away = ids[(i + 1) % 20]!;
      playMatch(w, rng, fx);
      goals += fx.result!.hg + fx.result!.ag;
    }
    for (let i = 0; i < 80; i++) {
      rest();
      const fx: Fixture = i % 2 ? { day: 0, home: ids[0]!, away: ids[19]! } : { day: 0, home: ids[19]!, away: ids[0]! };
      playMatch(w, rng, fx);
      const { hg, ag } = fx.result!;
      const strong = fx.home === ids[0] ? hg - ag : ag - hg;
      strongPts += strong > 0 ? 3 : strong === 0 ? 1 : 0;
    }
    expect(goals / 150).toBeGreaterThan(2);
    expect(goals / 150).toBeLessThan(3.4);
    expect(strongPts / 80).toBeGreaterThan(1.8); // la più forte fa ben più di 1,5 punti a partita
  }, 30_000);
});

describe('persone (F5)', () => {
  it('1000 settimane di sviluppo con allenamenti estremi: attributi sempre in 1-20', () => {
    const w = newWorld(21);
    const rng = new Rng(1);
    const focus = { technical: 3, physical: 3, mental: 3, goalkeeping: 3, setPieces: 3 };
    for (const p of Object.values(w.players).slice(0, 30)) {
      for (let week = 0; week < 1000; week++) developPlayer(p, { season: w.season + Math.floor(week / 52), focus, mentor: null }, rng);
      for (const v of Object.values(p.attrs)) expect(v >= 1 && v <= 20).toBe(true);
    }
  });

  it('catalogo infortuni: almeno 60 tipi, durate dentro min-max', () => {
    expect(Object.keys(INJURIES).length).toBeGreaterThanOrEqual(60);
    const p = Object.values(newWorld(2).players)[0]!;
    const rng = new Rng(3);
    for (let i = 0; i < 300; i++) {
      const type = injure(rng, p, (['contact', 'muscle', 'overuse'] as const)[i % 3]!);
      expect(p.condition.injuryDays).toBeGreaterThanOrEqual(type.min);
      expect(p.condition.injuryDays).toBeLessThanOrEqual(type.max);
    }
  });

  it('intesa in campo: al massimo ±8% sul peso di scelta del passaggio', () => {
    expect(chem(undefined)).toBe(1);
    expect(chem(100)).toBeCloseTo(1.08);
    expect(chem(-100)).toBeCloseTo(0.92);
    expect(chem(-500)).toBeCloseTo(0.92);
  });

  it('fuori rosa un leader: il gruppo perde fiducia', () => {
    const w = newWorld(6);
    const club = w.clubs[w.manager.clubId]!;
    const leader = w.players[leaders(influence(w, club))[0]!]!;
    const before = club.playerIds.map((id) => w.players[id]!.psych.trust);
    exclude(w, club, leader);
    const after = club.playerIds.map((id) => w.players[id]!.psych.trust);
    expect(after.reduce((s, v) => s + v, 0)).toBeLessThan(before.reduce((s, v) => s + v, 0) - 20);
    expect(pickXI(w, club).some((e) => e.player === leader)).toBe(false);
  });

  it('promessa rotta: fiducia giù, chiede la cessione, l\'allenatore se lo ricorda', () => {
    const w = newWorld(7);
    const club = w.clubs[w.manager.clubId]!;
    const p = w.players[club.playerIds.at(-1)!]!;
    makePromise(w, p, 'starter');
    exclude(w, club, p); // e poi non lo fa giocare
    for (let i = 0; i < 8 && w.promises.length; i++) advance(w);
    expect(w.manager.broken).toBe(1);
    expect(p.psych.wantsOut).toBe(true);
  }, 30_000);
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
  }, 60_000);

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
    // niente cicli esplosivi: il morale non va a 0 o a 100 per tutti
    const morale = Object.values(w.players).map((p) => p.psych.morale);
    const mean = morale.reduce((s, v) => s + v, 0) / morale.length;
    expect(mean).toBeGreaterThan(35);
    expect(mean).toBeLessThan(80);
    expect(Math.max(...morale) - Math.min(...morale)).toBeGreaterThan(20);
    expect(deserialize(serialize(w))).toEqual(w);
  }, 90_000);
});
