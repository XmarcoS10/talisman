// Diagnosi dei marcatori (0.3.0): perché il capocannoniere fa 40-65 gol. Una stagione di Serie A col motore vero
// (condizione sempre piena), tiri, gol e rigori per giocatore, quota dei gol della squadra al miglior marcatore.
// Uso: node tools/diag-scorers.ts [seme=42] [stagioni=2]
import { matchSetups } from '../src/engine/match.ts';
import { simulate } from '../src/engine/match/engine.ts';
import { Rng } from '../src/engine/rng.ts';
import { newWorld } from '../src/engine/world.ts';

const seed = Number(process.argv[2] ?? 42);
const seasons = Number(process.argv[3] ?? 2);
const world = newWorld(seed);
world.manager.clubId = -1;
const rng = new Rng(seed);
const comp = world.competitions.ITA1!;
type Row = { id: number; club: number; shots: number; goals: number; pens: number; apps: number };
const rows = new Map<number, Row>();
const team = new Map<number, number>();
let pens = 0, goals = 0, shots = 0;
for (let s = 0; s < seasons; s++) {
  for (const fx of comp.fixtures) {
    for (const p of Object.values(world.players)) { p.condition.fitness = 100; p.condition.injuryDays = 0; p.discipline.ban = 0; }
    const out = simulate(rng, matchSetups(world, { day: 0, home: fx.home, away: fx.away }));
    out.played.forEach((list, side) => {
      const club = side === 0 ? fx.home : fx.away;
      for (const m of list) {
        const r = rows.get(m.p.id) ?? { id: m.p.id, club, shots: 0, goals: 0, pens: 0, apps: 0 };
        r.shots += m.st.shots; r.goals += m.st.goals; r.apps++;
        rows.set(m.p.id, r);
        team.set(club, (team.get(club) ?? 0) + m.st.goals);
        goals += m.st.goals; shots += m.st.shots;
      }
    });
    for (const e of out.result.events) if (e.kind === 'penGoal' && e.playerId) { pens++; rows.get(e.playerId)!.pens++; }
  }
}
const n = seasons;
const top = [...rows.values()].sort((a, b) => b.goals - a.goals).slice(0, 12);
console.log(`gol a partita ${(goals / (comp.fixtures.length * n)).toFixed(2)} · tiri a squadra ${(shots / (comp.fixtures.length * n * 2)).toFixed(1)} · conversione ${(goals / shots * 100).toFixed(1)}% · rigori segnati a stagione ${(pens / n).toFixed(0)}`);
console.log('giocatore        ruolo  CA  fin  gol/st  tiri/p  conv  rig  quota squadra');
for (const r of top) {
  const p = world.players[r.id]!;
  console.log(`${(p.lastName + '          ').slice(0, 16)} ${p.position.padEnd(4)} ${String(p.ca).padStart(4)} ${String(p.attrs.finishing).padStart(4)} ${(r.goals / n).toFixed(1).padStart(6)} ${(r.shots / r.apps).toFixed(2).padStart(7)} ${(r.goals / r.shots * 100).toFixed(0).padStart(4)}% ${String(r.pens).padStart(4)} ${(r.goals / team.get(r.club)! * 100).toFixed(0).padStart(6)}%`);
}
// quota media dei gol di squadra segnata dal miglior marcatore di ogni club (Serie A reale: ~25-35%)
const shares = comp.clubIds.map((id) => Math.max(...[...rows.values()].filter((r) => r.club === id).map((r) => r.goals)) / team.get(id)!);
console.log(`quota media del miglior marcatore sul totale della squadra: ${(shares.reduce((a, b) => a + b, 0) / shares.length * 100).toFixed(0)}%`);
// tiri per reparto (Serie A reale: attaccanti ~45%, centrocampisti e trequartisti ~40%, difensori ~15%)
const group = (pos: string) => (pos === 'ST' ? 'punte' : ['AML', 'AMR', 'AMC'].includes(pos) ? 'trequarti/ali' : ['DM', 'MC', 'ML', 'MR'].includes(pos) ? 'centrocampo' : pos === 'GK' ? 'portiere' : 'difesa');
const by = new Map<string, number>();
for (const r of rows.values()) by.set(group(world.players[r.id]!.position), (by.get(group(world.players[r.id]!.position)) ?? 0) + r.shots);
console.log('tiri per reparto:', [...by].map(([k, v]) => `${k} ${(v / shots * 100).toFixed(0)}%`).join(' · '));
