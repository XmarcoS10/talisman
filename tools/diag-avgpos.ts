// Posizioni medie per ruolo, con e senza palla (analisi della partita 2D, 01/10), come la mappa di FM: in metri dalla
// propria porta (x, 0-105) e dalla fascia sinistra (y, 0-68). Uso: node tools/diag-avgpos.ts [moduloCasa] [moduloOspiti] [partite]
import { matchSetups } from '../src/engine/match.ts';
import { runMatch } from '../src/engine/match/engine.ts';
import { defaultRoles } from '../src/engine/match/tactics.ts';
import type { FormationId } from '../src/engine/model.ts';
import type { TraceStep } from '../src/engine/match/state.ts';
import { Rng } from '../src/engine/rng.ts';
import { newWorld } from '../src/engine/world.ts';

const [fH = '4-3-3', fA = '4-4-2', nArg = '6'] = process.argv.slice(2);
const w = newWorld(42); w.manager.clubId = -1;
const A = w.competitions.ITA1!.clubIds;
const home = w.clubs[A[4]!]!, away = w.clubs[A[5]!]!;
for (const [c, f] of [[home, fH], [away, fA]] as const) Object.assign(c.tactic, { formation: f as FormationId, roles: defaultRoles(f as FormationId), formationOut: undefined, rolesOut: undefined });
const sum = new Map<string, { on: number[]; off: number[] }>(); // chiave: lato:posizione:slot
for (let g = 0; g < Number(nArg); g++) {
  const su = matchSetups(w, { day: 0, home: home.id, away: away.id });
  const key = new Map<number, string>();
  su.forEach((s, t) => s.xi.forEach((e, i) => key.set(e.player.id, `${t}:${String(i).padStart(2, '0')}:${e.slot.pos}`)));
  const trace: TraceStep[] = [];
  const run = runMatch(new Rng(300 + g), su, trace);
  run.result();
  for (const f of run.track) {
    if (f.dead || f.min > 60) continue; // prima dei cambi
    const side = trace[f.step]?.side;
    if (side === undefined) continue;
    f.ids.forEach((id, i) => {
      const k = key.get(id); if (!k) return;
      const t = i < f.n0 ? 0 : 1;
      const x = (t === 0 ? f.xy[2 * i]! : 12 - f.xy[2 * i]!) * 8.75, y = (t === 0 ? f.xy[2 * i + 1]! : 8 - f.xy[2 * i + 1]!) * 8.5;
      const s = sum.get(k) ?? { on: [0, 0, 0], off: [0, 0, 0] };
      const b = t === side ? s.on : s.off;
      b[0]! += x; b[1]! += y; b[2]!++;
      sum.set(k, s);
    });
  }
}
for (const t of [0, 1]) {
  console.log(`\n${t ? 'ospiti ' + fA : 'casa ' + fH}  (x dalla propria porta, y dalla sinistra; con palla → senza palla)`);
  for (const [k, s] of [...sum].filter(([k]) => k.startsWith(`${t}:`)).sort()) {
    const p = (b: number[]) => `${(b[0]! / b[2]!).toFixed(0).padStart(3)},${(b[1]! / b[2]!).toFixed(0).padStart(3)}`;
    console.log(`  ${k.split(':')[2]!.padEnd(4)} ${p(s.on)}  →  ${p(s.off)}`);
  }
}
