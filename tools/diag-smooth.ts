// Fluidità del movimento nella partita 2D (02/10): velocità di ogni giocatore campionata ogni 0,1 s di gioco, come lo
// schermo. Conta le accelerazioni oltre 8 m/s² (uno sprinter vero) e le frenate brusche, e dice se cadono a cavallo
// fra un'azione e l'altra. Uso: node tools/diag-smooth.ts [partite=3]
import { matchSetups } from '../src/engine/match.ts';
import { runMatch } from '../src/engine/match/engine.ts';
import type { TraceStep } from '../src/engine/match/state.ts';
import { Rng } from '../src/engine/rng.ts';
import { newWorld } from '../src/engine/world.ts';
import { sample } from '../src/ui/match/playback.ts';

const w = newWorld(42); w.manager.clubId = -1;
const A = w.competitions.ITA1!.clubIds;
const N = Number(process.argv[2] ?? 3), DT = 0.1;
let n = 0, hard = 0, hardAtStep = 0, stopGo = 0, speedSum = 0, frames = 0, ballHard = 0, ballN = 0;
const hist = [0, 0, 0, 0, 0, 0]; // velocità m/s: 0-1, 1-3, 3-5, 5-7, 7-9, 9+
for (let g = 0; g < N; g++) {
  const trace: TraceStep[] = [];
  const run = runMatch(new Rng(500 + g), matchSetups(w, { day: 0, home: A[g]!, away: A[g + 7]! }), trace);
  run.result();
  const end = run.track.at(-1)!.at;
  let p0 = sample(run, 0)!, p1 = sample(run, DT)!;
  for (let T = 2 * DT; T < end; T += DT) {
    const p2 = sample(run, T)!;
    if (p2.dead || p1.dead || p0.dead || p2.ids !== p0.ids) { p0 = p1; p1 = p2; continue; }
    frames++;
    const stepChange = p2.i !== p0.i;
    for (let k = 0; k < p2.ids.length; k++) {
      const v1x = (p1.x[k]! - p0.x[k]!) * 8.75 / DT, v1y = (p1.y[k]! - p0.y[k]!) * 8.5 / DT;
      const v2x = (p2.x[k]! - p1.x[k]!) * 8.75 / DT, v2y = (p2.y[k]! - p1.y[k]!) * 8.5 / DT;
      const s1 = Math.hypot(v1x, v1y), s2 = Math.hypot(v2x, v2y);
      const acc = Math.hypot(v2x - v1x, v2y - v1y) / DT;
      n++; speedSum += s2; hist[Math.min(5, Math.floor((s2 + 1) / 2))]!++;
      if (acc > 8) { hard++; if (stepChange) hardAtStep++; }
      if ((s1 < 0.5 && s2 > 4) || (s1 > 4 && s2 < 0.5)) stopGo++;
    }
    const b1 = Math.hypot((p1.bx - p0.bx) * 8.75, (p1.by - p0.by) * 8.5) / DT, b2 = Math.hypot((p2.bx - p1.bx) * 8.75, (p2.by - p1.by) * 8.5) / DT;
    ballN++; if (Math.abs(b2 - b1) / DT > 60) ballHard++;
    p0 = p1; p1 = p2;
  }
}
console.log(`velocità media dei giocatori ${(speedSum / n).toFixed(1)} m/s (reale ~2-2,5 di media, sprint 7-9)`);
console.log(`distribuzione velocità: ${['0-1', '1-3', '3-5', '5-7', '7-9', '9+'].map((l, i) => `${l} ${(100 * hist[i]! / n).toFixed(0)}%`).join(' · ')}`);
console.log(`accelerazioni oltre 8 m/s²: ${(100 * hard / n).toFixed(1)}% dei campioni, di cui a cavallo fra due azioni ${(100 * hardAtStep / Math.max(1, hard)).toFixed(0)}%`);
console.log(`fermo → corsa (o il contrario) in 0,1 s: ${(stopGo / frames).toFixed(2)} per istante`);
console.log(`palla: cambi di velocità bruschi (> 60 m/s²) ${(100 * ballHard / ballN).toFixed(1)}% del tempo`);
