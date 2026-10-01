// Forma delle squadre nel registro del campo (analisi della partita 2D, 01/10): lunghezza e larghezza dei dieci di
// movimento con e senza palla, altezza della linea difensiva rispetto alla palla, giocatori sovrapposti.
// Metri: 1 zona = 8,75 m in lunghezza, 8,5 m in larghezza. Uso: node tools/diag-shape.ts [partite=10]
import { matchSetups } from '../src/engine/match.ts';
import { runMatch } from '../src/engine/match/engine.ts';
import type { TraceStep } from '../src/engine/match/state.ts';
import { Rng } from '../src/engine/rng.ts';
import { newWorld } from '../src/engine/world.ts';

const w = newWorld(42); w.manager.clubId = -1;
const A = w.competitions.ITA1!.clubIds;
const N = Number(process.argv[2] ?? 10);
const acc = { on: { len: 0, wid: 0, n: 0 }, off: { len: 0, wid: 0, line: 0, gap: 0, n: 0 }, overlap: 0, frames: 0, lenHist: [0, 0, 0, 0, 0] };
for (let g = 0; g < N; g++) {
  const fx = { day: 0, home: A[g % 20]!, away: A[(g * 7 + 3) % 20]! };
  if (fx.home === fx.away) fx.away = A[(g + 1) % 20]!;
  const su = matchSetups(w, fx);
  const gk = new Set(su.flatMap((s) => s.xi.filter((e) => e.slot.pos === 'GK').map((e) => e.player.id)));
  const trace: TraceStep[] = [];
  const run = runMatch(new Rng(900 + g), su, trace);
  run.result();
  for (const f of run.track) {
    if (f.dead) continue;
    const side = trace[f.step]?.side;
    if (side === undefined) continue;
    acc.frames++;
    const pts: [number, number][][] = [[], []];
    f.ids.forEach((id, i) => { if (!gk.has(id)) pts[i < f.n0 ? 0 : 1]!.push([f.xy[2 * i]!, f.xy[2 * i + 1]!]); });
    for (const t of [0, 1] as const) {
      const xs = pts[t]!.map((p) => p[0]), ys = pts[t]!.map((p) => p[1]);
      const len = (Math.max(...xs) - Math.min(...xs)) * 8.75, wid = (Math.max(...ys) - Math.min(...ys)) * 8.5;
      if (t === side) { acc.on.len += len; acc.on.wid += wid; acc.on.n++; }
      else {
        // linea difensiva: media dei quattro più arretrati, in metri dalla propria porta; distanza dalla palla
        const own = xs.map((x) => (t === 0 ? x : 12 - x)).sort((a, b) => a - b);
        const line = (own.slice(0, 4).reduce((s, v) => s + v, 0) / 4) * 8.75;
        const ball = (t === 0 ? f.bx : 12 - f.bx) * 8.75;
        acc.off.len += len; acc.off.wid += wid; acc.off.line += line; acc.off.gap += ball - line; acc.off.n++;
        acc.lenHist[Math.min(4, Math.floor(len / 15))]!++;
      }
    }
    const all = [...pts[0]!, ...pts[1]!];
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++)
      if (Math.abs(all[i]![0] - all[j]![0]) * 8.75 < 1.2 && Math.abs(all[i]![1] - all[j]![1]) * 8.5 < 1.2) acc.overlap++;
  }
}
const m = (v: number, n: number) => (v / n).toFixed(1);
console.log(`con palla: lunghezza ${m(acc.on.len, acc.on.n)} m, larghezza ${m(acc.on.wid, acc.on.n)} m   (reale ~45-55 · 55-65)`);
console.log(`senza palla: lunghezza ${m(acc.off.len, acc.off.n)} m, larghezza ${m(acc.off.wid, acc.off.n)} m   (reale ~30-40 · 35-45)`);
console.log(`linea difensiva a ${m(acc.off.line, acc.off.n)} m dalla propria porta, ${m(acc.off.gap, acc.off.n)} m dietro la palla   (reale ~25-35 dietro)`);
console.log(`lunghezza senza palla per fasce di 15 m: ${acc.lenHist.map((v) => (100 * v / acc.off.n).toFixed(0) + '%').join(' · ')}`);
console.log(`coppie sovrapposte (entro 1,2 m) per istante: ${(acc.overlap / acc.frames).toFixed(2)}`);
