// Diagnosi dell'economia (Blocco 1.1): valori, stipendi e fatturati a confronto, a inizio mondo e dopo N stagioni.
// Uso: node tools/diag-econ.ts [seed] [stagioni]
import { revenue, wageBill } from '../src/engine/finance/ledger.ts';
import { value } from '../src/engine/transfers/valuation.ts';
import { renewalWage, agentOf } from '../src/engine/transfers/agents.ts';
import { advance, endSeason, isSeasonOver, newWorld } from '../src/engine/world.ts';
import type { WorldState } from '../src/engine/model.ts';

const M = (v: number) => (v / 1e6).toFixed(1);
const seed = Number(process.argv[2] ?? 42);
const seasons = Number(process.argv[3] ?? 0);
const world: WorldState = newWorld(seed);
world.manager.clubId = -1;
for (let s = 0; s < seasons; s++) { while (!isSeasonOver(world)) advance(world); endSeason(world); }

const q = (xs: number[], f: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(f * (s.length - 1))]!; };
for (const level of [1, 2]) {
  const clubs = Object.values(world.clubs).filter((c) => world.competitions[c.compId]?.level === level).sort((a, b) => b.reputation - a.reputation);
  console.log(`\n## livello ${level} (stagione ${world.season})`);
  console.log('club | rep | fatturato | cassa | monte ingaggi | valore max | stip. max | offerta-stip. del più caro');
  for (const c of [clubs[0]!, clubs[1]!, clubs[Math.floor(clubs.length / 2)]!, clubs.at(-1)!]) {
    const ps = c.playerIds.map((id) => world.players[id]!);
    const vals = ps.map((p) => value(p, world.season, { clubRep: c.reputation }));
    const top = ps[vals.indexOf(Math.max(...vals))]!;
    console.log(`${c.name} | ${c.reputation} | ${M(revenue(world, c))} | ${M(c.balance)} | ${M(wageBill(world, c))} | ${M(Math.max(...vals))} | ${M(Math.max(...ps.map((p) => p.contract.wage)))} | ${M(renewalWage(agentOf(world, top), top, world.season, 90))}`);
  }
  const rev = clubs.map((c) => revenue(world, c));
  const cash = clubs.map((c) => c.balance);
  const vals = clubs.flatMap((c) => c.playerIds.map((id) => value(world.players[id]!, world.season, { clubRep: c.reputation })));
  console.log(`fatturato mediano ${M(q(rev, 0.5))} (max ${M(Math.max(...rev))}) · cassa mediana ${M(q(cash, 0.5))} · valore giocatori p50 ${M(q(vals, 0.5))} p90 ${M(q(vals, 0.9))} p99 ${M(q(vals, 0.99))} max ${M(Math.max(...vals))}`);
  console.log(`valore del più caro / fatturato del club più ricco: ${(Math.max(...vals) / Math.max(...rev)).toFixed(2)}`);
}
