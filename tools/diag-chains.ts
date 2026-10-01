// Possessi della forte e della debole (01/10): dove cominciano, quanto durano, fin dove arrivano e come finiscono.
// Un possesso = fotogrammi consecutivi della stessa squadra nel registro. Uso: node tools/diag-chains.ts [pari]
import { matchSetups } from '../src/engine/match.ts';
import { runMatch } from '../src/engine/match/engine.ts';
import type { TraceStep } from '../src/engine/match/state.ts';
import { Rng } from '../src/engine/rng.ts';
import { newWorld } from '../src/engine/world.ts';

const w = newWorld(42); w.manager.clubId = -1;
const A = w.competitions.ITA1!.clubIds;
const byRep = [...A].sort((a, b) => w.clubs[b]!.reputation - w.clubs[a]!.reputation);
const pair = process.argv[2] === 'pari' ? [byRep[9]!, byRep[10]!] : [byRep[0]!, byRep.at(-1)!];
const N = 20;
type S = { n: number; acts: number; start: number; reach: number; pres: number; presN: number; ends: Record<string, number>; startZ: number[]; reach8: number };
const st: S[] = [0, 1].map(() => ({ n: 0, acts: 0, start: 0, reach: 0, pres: 0, presN: 0, ends: {}, startZ: [0, 0, 0], reach8: 0 }));
for (let i = 0; i < N; i++) {
  const trace: TraceStep[] = [];
  runMatch(new Rng(500 + i), matchSetups(w, { day: 0, home: pair[0]!, away: pair[1]! }), trace).result();
  let k = 0;
  while (k < trace.length) {
    const side = trace[k]!.side;
    let j = k;
    while (j + 1 < trace.length && trace[j + 1]!.side === side && trace[j + 1]!.half === trace[k]!.half) j++;
    const own = (f: TraceStep) => (side === 0 ? f.bx : 12 - f.bx);
    const s = st[side]!, last = trace[j]!;
    s.n++; s.acts += j - k + 1; s.start += own(trace[k]!);
    s.startZ[Math.min(2, Math.floor(own(trace[k]!) / 4))]!++;
    let reach = 0;
    for (let q = k; q <= j; q++) { reach = Math.max(reach, own(trace[q]!)); s.pres += trace[q]!.pressure; s.presN++; }
    s.reach += reach; if (reach >= 8) s.reach8++;
    const end = last.kind === 'shot' ? 'tiro' : last.kind === 'tackle' ? 'contrasto' : last.kind === 'foul' ? 'fallo' : last.ok === false ? `${last.kind} sbagliato` : `${last.kind} (poi persa)`;
    s.ends[end] = (s.ends[end] ?? 0) + 1;
    k = j + 1;
  }
}
for (const [i, s] of st.entries()) {
  console.log(`${i ? 'seconda' : 'prima  '}: ${(s.n / N).toFixed(0)} possessi · ${(s.acts / s.n).toFixed(1)} azioni l'uno · partenza media x ${(s.start / s.n).toFixed(1)} (terzi ${s.startZ.map((v) => (100 * v / s.n).toFixed(0)).join('/')}%) · arrivo medio ${(s.reach / s.n).toFixed(1)} · arrivano a x 8: ${(100 * s.reach8 / s.n).toFixed(0)}% · pressione media ${(s.pres / s.presN).toFixed(2)}`);
  console.log('   finiscono:', Object.entries(s.ends).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(100 * v / s.n).toFixed(0)}%`).join(', '));
}
