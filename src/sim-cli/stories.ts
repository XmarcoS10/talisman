// Report narrativo (GUIDA §13, P8): quanti archi distinti in una stagione, quante frasi ripetute,
// e un campione di testi da far leggere a un revisore umano.
import { Rng } from '../engine/rng.ts';
import { render } from '../engine/narrative/say.ts';
import { advance, isSeasonOver, newWorld } from '../engine/world.ts';

export function storiesReport(seed: number, seasons: number): string[] {
  const out: string[] = [];
  const rows: { distinct: number; arcs: number; lines: number; maxRep: number; mine: number }[] = [];
  const sample: string[] = [];
  for (let s = 0; s < seasons; s++) {
    const world = newWorld(seed + s);
    // l'utente allena una squadra di metà classifica: le storie devono nascere anche lì
    const comp = world.competitions.ITA1!;
    world.manager.clubId = [...comp.clubIds].sort((a, b) => world.clubs[b]!.reputation - world.clubs[a]!.reputation)[9]!;
    world.manager.name = 'Marco Talisman';
    while (!isSeasonOver(world)) advance(world);
    const lines = world.arcs.flatMap((a) => a.lines.map((l) => render(l.text)));
    const count = new Map<string, number>();
    for (const l of lines) count.set(l, (count.get(l) ?? 0) + 1);
    rows.push({
      distinct: new Set(world.arcs.map((a) => a.rule)).size,
      arcs: world.arcs.length,
      lines: lines.length,
      maxRep: Math.max(0, ...count.values()),
      mine: world.arcs.filter((a) => a.subject.club === world.manager.clubId || a.subject.rival === world.manager.clubId).length,
    });
    if (s === 0) {
      const rng = new Rng(seed);
      sample.push(...rng.shuffle(lines).slice(0, 30));
    }
  }
  const avg = (k: 'distinct' | 'arcs' | 'lines' | 'maxRep' | 'mine') => rows.reduce((a, r) => a + r[k], 0) / rows.length;
  const ok = (v: boolean) => (v ? '✅' : '❌');
  out.push(`# Report narrativo — ${seasons} stagioni, seed ${seed}`, '',
    '| Metrica | Valore | Target | |', '|---|---|---|---|',
    `| Archi distinti per stagione (regole diverse) | ${avg('distinct').toFixed(1)} | ≥ 8 | ${ok(Math.min(...rows.map((r) => r.distinct)) >= 8)} |`,
    `| Archi aperti per stagione | ${avg('arcs').toFixed(0)} | | |`,
    `| …di cui sulla squadra dell'utente | ${avg('mine').toFixed(0)} | | |`,
    `| Frasi scritte per stagione | ${avg('lines').toFixed(0)} | | |`,
    `| Ripetizioni massime della stessa frase | ${Math.max(...rows.map((r) => r.maxRep))} | ≤ 3 | ${ok(Math.max(...rows.map((r) => r.maxRep)) <= 3)} |`,
    '', '## 30 testi a campione (da rileggere)', '', ...sample.map((l, i) => `${i + 1}. ${l}`));
  return out;
}
