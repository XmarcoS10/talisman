// Difetti visibili della partita 2D (01/10): si campiona la riproduzione come lo schermo (ogni 0,1 s di gioco, con
// `sample` dell'interfaccia) e si cercano palla e giocatori che saltano, palla lontana da chi la porta, passaggi che
// arrivano lontano dal ricevitore, contrasti fatti da lontano, tiri che non partono dal tiratore o non vanno in porta.
// Metri: 1 zona = 8,75 m (x) e 8,5 m (y). Uso: node tools/diag-glitches.ts [partite=6]
import { matchSetups } from '../src/engine/match.ts';
import { runMatch } from '../src/engine/match/engine.ts';
import type { TraceStep } from '../src/engine/match/state.ts';
import { Rng } from '../src/engine/rng.ts';
import { newWorld } from '../src/engine/world.ts';
import { sample } from '../src/ui/match/playback.ts';

const w = newWorld(42); w.manager.clubId = -1;
const A = w.competitions.ITA1!.clubIds;
const N = Number(process.argv[2] ?? 6);
const m = (dx: number, dy: number) => Math.hypot(dx * 8.75, dy * 8.5);
const c = { mins: 0, ballJump: 0, playerJump: 0, carrierTime: 0, carrierFar: 0, passes: 0, passFar: 0, passFarSum: 0, slowPass: 0, fastPass: 0,
  tackles: 0, tackleFar: 0, tackleSum: 0, shots: 0, shotFar: 0, shotWide: 0, goals: 0, goalOut: 0, examples: [] as string[] };
const ex = (s: string) => { if (c.examples.length < 14) c.examples.push(s); };
for (let g = 0; g < N; g++) {
  const fx = { day: 0, home: A[g % 20]!, away: A[(g * 7 + 3) % 20]! };
  if (fx.home === fx.away) fx.away = A[(g + 1) % 20]!;
  const trace: TraceStep[] = [];
  const run = runMatch(new Rng(700 + g), matchSetups(w, fx), trace);
  run.result();
  const end = run.track.at(-1)!.at;
  c.mins += 90;
  let prev = sample(run, 0)!, flight: { t: number; x: number; y: number; to: number | null } | null = null;
  for (let T = 0.1; T < end; T += 0.1) {
    const s = sample(run, T)!;
    const idx = (id: number) => s.ids.indexOf(id);
    if (!s.dead && !prev.dead && s.i === prev.i) {
      if (m(s.bx - prev.bx, s.by - prev.by) > 5) { c.ballJump++; ex(`palla salta ${m(s.bx - prev.bx, s.by - prev.by).toFixed(1)} m in 0,1 s al ${s.min}' (azione ${trace[s.i]?.kind})`); }
      if (s.ids === prev.ids) for (let k = 0; k < s.ids.length; k++) if (m(s.x[k]! - prev.x[k]!, s.y[k]! - prev.y[k]!) > 1.2) { c.playerJump++; break; }
    }
    if (!s.dead && s.carrier) {
      const k = idx(s.carrier);
      if (k >= 0) { c.carrierTime++; if (m(s.bx - s.x[k]!, s.by - s.y[k]!) > 1.5) c.carrierFar++; }
    }
    // passaggio: palla in volo verso qualcuno, poi qualcuno la prende
    if (!s.carrier && prev.carrier && !s.dead) flight = { t: T, x: s.bx, y: s.by, to: s.passTo };
    if (s.carrier && !prev.carrier && flight) {
      const k = idx(s.carrier), d = k >= 0 ? m(s.bx - s.x[k]!, s.by - s.y[k]!) : 0;
      const dist = m(s.bx - flight.x, s.by - flight.y), v = dist / Math.max(0.1, T - flight.t);
      c.passes++; c.passFarSum += d;
      if (d > 2) { c.passFar++; ex(`palla presa a ${d.toFixed(1)} m dal giocatore al ${s.min}'`); }
      if (dist > 8 && v < 6) c.slowPass++;
      if (v > 40) c.fastPass++;
      flight = null;
    }
    prev = s;
  }
  // contrasti e tiri: posizioni al primo fotogramma dell'azione
  for (const [k, f] of trace.entries()) {
    const fr = run.track.find((p) => p.step === k);
    if (!fr || !f.beats) continue;
    const pos = (id: number) => { const i = fr.ids.indexOf(id); return i < 0 ? null : [fr.xy[2 * i]!, fr.xy[2 * i + 1]!] as const; };
    for (const b of f.beats) {
      if (b.kind === 'tackle' && b.vs) {
        const a = pos(b.who), v = pos(b.vs);
        if (a && v) { const d = m(a[0] - v[0], a[1] - v[1]); c.tackles++; c.tackleSum += d; if (d > 3) { c.tackleFar++; ex(`contrasto da ${d.toFixed(1)} m al ${f.min}'`); } }
      }
      if (b.kind === 'shot') {
        const a = pos(b.who);
        if (a) { c.shots++; const d = m(a[0] - fr.bx, a[1] - fr.by); if (d > 2) { c.shotFar++; ex(`tiro con la palla a ${d.toFixed(1)} m dal tiratore al ${f.min}'`); } }
        // dove finisce la palla in questa azione
        const last = [...run.track].reverse().find((p) => p.step === k);
        const goalX = f.side === 0 ? 12 : 0;
        if (last && Math.abs(last.bx - goalX) > 1.5 && !f.beats.some((x) => ['block', 'save', 'parry', 'claim'].includes(x.kind))) { c.shotWide++; ex(`tiro che finisce a ${(Math.abs(last.bx - goalX) * 8.75).toFixed(0)} m dalla porta senza parata né muro al ${f.min}'`); }
        if (f.beats.some((x) => x.kind === 'goal') && last) { c.goals++; if (Math.abs(last.bx - goalX) > 0.4 || last.by < 3.4 || last.by > 4.6) { c.goalOut++; ex(`gol con la palla in (${last.bx.toFixed(1)}, ${last.by.toFixed(1)}) al ${f.min}'`); } }
      }
    }
  }
}
const pm = (v: number) => (v / c.mins * 90).toFixed(1);
console.log(`palla che salta (> 5 m in 0,1 s): ${pm(c.ballJump)} a partita`);
console.log(`giocatori che saltano (> 1,2 m in 0,1 s): ${pm(c.playerJump)} a partita`);
console.log(`palla lontana da chi la porta (> 1,5 m): ${(100 * c.carrierFar / Math.max(1, c.carrierTime)).toFixed(1)}% del tempo`);
console.log(`passaggi: ${pm(c.passes)} a partita; presi a più di 2 m: ${(100 * c.passFar / c.passes).toFixed(1)}% (media ${(c.passFarSum / c.passes).toFixed(1)} m); lenti ${pm(c.slowPass)}, velocissimi ${pm(c.fastPass)}`);
console.log(`contrasti: ${pm(c.tackles)} a partita; da più di 3 m: ${(100 * c.tackleFar / Math.max(1, c.tackles)).toFixed(0)}% (media ${(c.tackleSum / Math.max(1, c.tackles)).toFixed(1)} m)`);
console.log(`tiri: ${pm(c.shots)} a partita; palla a più di 2 m dal tiratore: ${(100 * c.shotFar / Math.max(1, c.shots)).toFixed(0)}%; finiti lontano dalla porta senza parata/muro: ${(100 * c.shotWide / Math.max(1, c.shots)).toFixed(0)}%`);
console.log(`gol: ${c.goals}; palla non nella porta alla fine: ${c.goalOut}`);
console.log('esempi:'); for (const e of c.examples) console.log('  ' + e);
