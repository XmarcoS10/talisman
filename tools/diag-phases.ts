// Diagnosi della tattica con e senza palla (FM26): una squadra con una coppia di moduli (o un ruolo senza palla per tutti)
// contro avversari normali, a rose pari, 1.200 partite per riga. Nessuna coppia deve staccare il modulo semplice di oltre
// 0,10 punti a partita (≈ 3-4 punti percentuali di vittorie). Uso: node tools/diag-phases.ts
import { matchSetups } from '../src/engine/match.ts';
import { simulate } from '../src/engine/match/engine.ts';
import type { OopRoleId } from '../src/engine/match/roles.ts';
import { defaultRoles } from '../src/engine/match/tactics.ts';
import type { FormationId } from '../src/engine/model.ts';
import { Rng } from '../src/engine/rng.ts';
import { newWorld } from '../src/engine/world.ts';

const w = newWorld(42); w.manager.clubId = -1;
const clubs = w.competitions.ITA1!.clubIds;
const fresh = () => { for (const p of Object.values(w.players)) { p.condition.fitness = 100; p.condition.injuryDays = 0; p.discipline.ban = 0; } };
const N = Number(process.env.N ?? 1200);
const CASES: [string, FormationId, FormationId | undefined, OopRoleId | null][] = [
  ['4-3-3 (uno solo)', '4-3-3', undefined, null],
  ['4-3-3 / 4-4-2', '4-3-3', '4-4-2', null],
  ['4-3-3 / 5-4-1', '4-3-3', '5-4-1', null],
  ['4-2-3-1 / 4-4-2', '4-2-3-1', '4-4-2', null],
  ['3-2-5 (uno solo)', '3-2-5', undefined, null],
  ['3-2-5 / 4-4-2', '3-2-5', '4-4-2', null],
  ['3-2-5 / 5-4-1', '3-2-5', '5-4-1', null],
  ['4-3-3, tutti «Pressa»', '4-3-3', undefined, 'press'],
  ['4-3-3, tutti «Copre»', '4-3-3', undefined, 'cover'],
  ['4-3-3, tutti «Tiene la posizione»', '4-3-3', undefined, 'holdShape'],
];
for (const [name, inF, outF, oop] of CASES) {
  const rng = new Rng(5);
  let pts = 0, gd = 0;
  for (let i = 0; i < N; i++) {
    const h = rng.pick(clubs); let a = rng.pick(clubs); while (a === h) a = rng.pick(clubs);
    const test = i % 2 ? h : a;
    for (const id of [h, a]) Object.assign(w.clubs[id]!.tactic, { formation: '4-3-3', roles: defaultRoles('4-3-3'), formationOut: undefined, rolesOut: undefined, mentality: 3 });
    Object.assign(w.clubs[test]!.tactic, { formation: inF, roles: defaultRoles(inF), formationOut: outF, rolesOut: oop ? Array(11).fill(oop) : undefined });
    fresh();
    const r = simulate(rng, matchSetups(w, { day: 0, home: h, away: a })).result;
    const [f, g] = test === h ? [r.hg, r.ag] : [r.ag, r.hg];
    pts += f > g ? 3 : f === g ? 1 : 0; gd += f - g;
  }
  console.log(`${name.padEnd(34)} ${(pts / N).toFixed(2)} punti a partita, differenza reti ${(gd / N >= 0 ? '+' : '') + (gd / N).toFixed(2)}`);
}
