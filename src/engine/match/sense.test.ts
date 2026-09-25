// Test di buon senso tattico (Blocco 2b, intervento 10 della richiesta): le scelte che l'utente fa in Tattica devono
// produrre in campo la differenza che ci si aspetta. Stessa squadra, stesso avversario, stessi semi partita per partita,
// due varianti; la differenza deve essere statisticamente netta (t di Welch > 3, p < 0,003) su 500 partite.
import { describe, expect, it } from 'vitest';
import { matchSetups } from '../match.ts';
import type { WorldState } from '../model.ts';
import { Rng } from '../rng.ts';
import { newWorld } from '../world.ts';
import { simulate, type SimOutput } from './engine.ts';

const N = 500;
const T_MIN = 3;

/** A (il club che cambia) contro B, in casa e fuori a turno; `per` estrae la misura di una partita dal punto di vista di A */
function play(tweak: (w: WorldState, a: number, b: number) => void, per: (o: SimOutput, a: 0 | 1) => number | null): number[] {
  const world = newWorld(314);
  world.manager.clubId = -1;
  const ids = world.competitions.ITA1!.clubIds;
  const a = ids[8]!, b = ids[12]!;
  tweak(world, a, b);
  for (const p of Object.values(world.players)) { p.condition.fitness = 100; p.condition.injuryDays = 0; p.discipline.ban = 0; }
  const out: number[] = [];
  for (let i = 0; i < N; i++) {
    const home = i % 2 === 0;
    const o = simulate(new Rng(50_000 + i), matchSetups(world, home ? { day: 0, home: a, away: b } : { day: 0, home: b, away: a }));
    const v = per(o, home ? 0 : 1);
    if (v !== null) out.push(v);
  }
  return out;
}

const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
const variance = (x: number[]) => { const m = mean(x); return x.reduce((s, v) => s + (v - m) ** 2, 0) / (x.length - 1); };
/** t di Welch: quanto è netta la differenza fra le medie di hi e lo (positivo = hi più grande) */
const welch = (hi: number[], lo: number[]) => (mean(hi) - mean(lo)) / Math.sqrt(variance(hi) / hi.length + variance(lo) / lo.length);
const report = (name: string, hi: number[], lo: number[]) => {
  const t = welch(hi, lo);
  console.log(`${name}: ${mean(hi).toFixed(3)} contro ${mean(lo).toFixed(3)} (t = ${t.toFixed(1)})`);
  return t;
};

describe('buon senso tattico', { timeout: 120_000 }, () => {
  // Passa dal 25/09 (intervento 5): con il portiere che esce, la linea alta concede il doppio delle palle in profondità
  it('la linea alta contro punte veloci concede più palle in profondità', () => {
    const fast = (w: WorldState, b: number) => {
      for (const id of w.clubs[b]!.playerIds) { const p = w.players[id]!; if (p.position === 'ST' || p.position.startsWith('AM')) { p.attrs.pace = 18; p.attrs.acceleration = 18; } }
    };
    // palle giocate alle spalle della linea dagli avversari (le riuscite sono così poche, ~0,1 a partita, che 500 partite non bastano)
    const conceded = (o: SimOutput, a: 0 | 1) => o.log[1 - a]!.deep;
    const high = play((w, a, b) => { fast(w, b); w.clubs[a]!.tactic.line = 2; }, conceded);
    const low = play((w, a, b) => { fast(w, b); w.clubs[a]!.tactic.line = 0; }, conceded);
    expect(report('palle in profondità giocate dagli avversari, linea alta contro bassa', high, low)).toBeGreaterThan(T_MIN);
  });

  it('il pressing alto stanca di più e recupera palla più avanti', () => {
    const energy = (o: SimOutput, a: 0 | 1) => mean(o.played[a].map((m) => m.energy));
    const regain = (o: SimOutput, a: 0 | 1) => (o.log[a].regains ? o.log[a].regainX / o.log[a].regains : null);
    const press = (level: number) => (w: WorldState, a: number) => { w.clubs[a]!.tactic.pressing = level; };
    expect(report('energia a fine partita, pressing basso contro alto', play(press(0), energy), play(press(2), energy))).toBeGreaterThan(T_MIN);
    expect(report('x media dei recuperi, pressing alto contro basso', play(press(2), regain), play(press(0), regain))).toBeGreaterThan(T_MIN);
  });

  it("l'ampiezza larga produce più cross", () => {
    const crosses = (o: SimOutput, a: 0 | 1) => o.log[a].crosses;
    const width = (level: number) => (w: WorldState, a: number) => { w.clubs[a]!.tactic.width = level; };
    expect(report('cross, ampiezza larga contro stretta', play(width(2), crosses), play(width(0), crosses))).toBeGreaterThan(T_MIN);
  });

  it('un giocatore stanco sbaglia di più negli ultimi 20 minuti', () => {
    // la stessa squadra con Resistenza alta o bassa: precisione dei suoi passaggi dal 70' in poi
    const late = (o: SimOutput, a: 0 | 1) => { const [n, ok] = o.log[a].late; return n >= 10 ? ok / n : null; };
    const stamina = (v: number) => (w: WorldState, a: number) => { for (const id of w.clubs[a]!.playerIds) w.players[id]!.attrs.stamina = v; };
    expect(report("precisione dal 70', Resistenza 18 contro 3", play(stamina(18), late), play(stamina(3), late))).toBeGreaterThan(T_MIN);
  });

  it('un portiere migliore subisce meno gol a parità di xG subiti', () => {
    const keeper = (v: number) => (w: WorldState, a: number) => {
      for (const id of w.clubs[a]!.playerIds) {
        const p = w.players[id]!;
        if (p.position !== 'GK') continue;
        for (const k of ['reflexes', 'handling', 'oneOnOnes', 'aerialReach', 'commandOfArea', 'rushingOut', 'kicking', 'positioning'] as const) p.attrs[k] = v;
      }
    };
    // gol subiti meno xG subiti: quanto il portiere toglie (o regala) rispetto alle occasioni concesse
    const overXg = (o: SimOutput, a: 0 | 1) => (a === 0 ? o.result.ag : o.result.hg) - o.result.stats[1 - a]!.xg;
    expect(report('gol subiti oltre gli xG, portiere scarso contro forte', play(keeper(6), overXg), play(keeper(18), overXg))).toBeGreaterThan(T_MIN);
  });

  it('il contro-pressing riprende più palloni subito dopo averli persi e stanca di più', () => {
    const quick = (o: SimOutput, a: 0 | 1) => o.log[a].quickRegains;
    const energy = (o: SimOutput, a: 0 | 1) => mean(o.played[a].map((m) => m.energy));
    const cp = (v: number) => (w: WorldState, a: number) => { w.clubs[a]!.tactic.counterPress = v; };
    expect(report('recuperi subito dopo la perdita, contro-pressing contro ripiego', play(cp(2), quick), play(cp(0), quick))).toBeGreaterThan(T_MIN);
    expect(report('energia a fine partita, ripiego contro contro-pressing', play(cp(0), energy), play(cp(2), energy))).toBeGreaterThan(T_MIN);
  });

  it('"tira di più" fa tirare di più quel giocatore', () => {
    // la punta di A (il primo attaccante della rosa): i suoi tiri a partita, con e senza l'istruzione
    const striker = (w: WorldState, a: number) => w.clubs[a]!.playerIds.find((id) => w.players[id]!.position === 'ST')!;
    let who = 0;
    const shots = (o: SimOutput, a: 0 | 1) => o.played[a].find((m) => m.p.id === who)?.st.shots ?? null;
    const ins = (v: number) => (w: WorldState, a: number) => { who = striker(w, a); w.clubs[a]!.tactic.players = { [who]: { shoot: v } }; };
    expect(report('tiri della punta, "tira di più" contro "tira di meno"', play(ins(2), shots), play(ins(0), shots))).toBeGreaterThan(T_MIN);
  });
});
