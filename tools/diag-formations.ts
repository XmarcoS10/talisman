// Equilibrio dei moduli (Blocco 2b, intervento 9): matrice modulo contro modulo, stessa rosa da una parte e dall'altra.
// Punti a partita del modulo di riga contro quello di colonna. Uso: node tools/diag-formations.ts [partite per cella=300]
import { matchSetups } from '../src/engine/match.ts';
import { simulate } from '../src/engine/match/engine.ts';
import { defaultRoles } from '../src/engine/match/tactics.ts';
import { FORMATION_IDS, type FormationId, type WorldState } from '../src/engine/model.ts';
import { Rng } from '../src/engine/rng.ts';
import { newWorld } from '../src/engine/world.ts';

const N = Number(process.argv[2] ?? 300);
const world: WorldState = newWorld(42);
world.manager.clubId = -1;
for (const p of Object.values(world.players)) { p.condition.fitness = 100; p.condition.injuryDays = 0; p.discipline.ban = 0; }
const clubs = world.competitions.ITA1!.clubIds;
const use = (id: number, f: FormationId) => { const c = world.clubs[id]!; c.familiarity[f] = 100; c.tactic.formation = f; c.tactic.roles = defaultRoles(f); c.tactic.mentality = 3; };
const rows: string[] = ['| riga contro colonna | ' + FORMATION_IDS.join(' | ') + ' | media |', '|---' + '|---'.repeat(FORMATION_IDS.length + 1) + '|'];
let seed = 1;
for (const a of FORMATION_IDS) {
  const cells: number[] = [];
  for (const b of FORMATION_IDS) {
    let pts = 0;
    for (let i = 0; i < N; i++) {
      // due club di forza simile (vicini in classifica di reputazione), casa e fuori a turno
      const x = clubs[i % clubs.length]!, y = clubs[(i + 1) % clubs.length]!;
      use(x, a); use(y, b);
      const home = i % 2 === 0;
      const setups = matchSetups(world, home ? { day: 0, home: x, away: y } : { day: 0, home: y, away: x });
      setups[0].mentality = 3; setups[1].mentality = 3;
      const r = simulate(new Rng(seed++), setups).result;
      const d = home ? r.hg - r.ag : r.ag - r.hg;
      pts += d > 0 ? 3 : d === 0 ? 1 : 0;
    }
    cells.push(pts / N);
  }
  rows.push(`| ${a} | ${cells.map((c) => c.toFixed(2)).join(' | ')} | **${(cells.reduce((s, c) => s + c, 0) / cells.length).toFixed(2)}** |`);
}
console.log(rows.join('\n'));
