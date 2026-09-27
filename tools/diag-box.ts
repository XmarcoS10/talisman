// Chi riceve in area e cosa ci fa (movimento senza palla, motore-v2 §11). Uso: node tools/diag-box.ts [seme=42] [partite=200]
import { matchSetups } from '../src/engine/match.ts';
import { simulate } from '../src/engine/match/engine.ts';
import type { TraceStep } from '../src/engine/match/state.ts';
import { Rng } from '../src/engine/rng.ts';
import { newWorld } from '../src/engine/world.ts';

const seed = Number(process.argv[2] ?? 42), N = Number(process.argv[3] ?? 200);
const w = newWorld(seed); w.manager.clubId = -1;
const fx = w.competitions.ITA1!.fixtures;
const group = (pos: string) => (pos === 'ST' ? 'punta' : ['AML', 'AMR', 'ML', 'MR'].includes(pos) ? 'esterno' : ['AMC', 'MC', 'DM'].includes(pos) ? 'centro' : 'difesa');
// in area avversaria, coordinate globali: la squadra 0 attacca verso x = 12
const inBox = (side: number, x: number, y: number) => (side === 0 ? x >= 10.1 : x <= 1.9) && y > 1.7 && y < 6.3;
const outOf = new Map<string, number>(); // passaggi della punta dall'area: verso chi, e se dentro o fuori area
const shotsBy = new Map<string, number>(); // tiri per reparto e tipo (dai momenti 'shot' del registro)
const origin = new Map<string, number>(); // da dove nasce il tiro su azione della punta: l'azione prima
const build = { n: 0, ok: 0, p: 0, off: 0 }; // passaggi dei difensori nel proprio terzo
const acts = new Map<string, Record<string, number>>(), recv = new Map<string, number>(), sent = new Map<string, number>();
for (let i = 0; i < N; i++) {
  const f = fx[i % fx.length]!;
  const trace: TraceStep[] = [];
  simulate(new Rng(i), matchSetups(w, { day: 0, home: f.home, away: f.away }), trace);
  trace.forEach((s, i) => {
    if (s.kind !== 'shot' || group(w.players[s.from]!.position) !== 'punta' || i === 0) return;
    const pr = trace[i - 1]!;
    const k = pr.side !== s.side ? `recupero dopo ${pr.kind} (${group(w.players[pr.from]!.position)})` : pr.from === s.from ? `sua azione ${pr.kind}` : `${pr.kind} di ${group(w.players[pr.from]!.position)}`;
    origin.set(k, (origin.get(k) ?? 0) + 1);
  });
  for (const s of trace) {
    if (s.kind === 'pass' && group(w.players[s.from]!.position) === 'difesa' && (s.side === 0 ? s.bx < 4 : s.bx > 8)) {
      build.n++; if (s.ok) build.ok++; build.p += s.p ?? 0;
    }
    for (const b of s.beats ?? []) if (b.kind === 'shot') {
      const k = `${group(w.players[b.who]!.position)} ${b.high ? 'testa' : inBox(s.side, b.x, b.y) ? 'area' : 'fuori'} ${s.kind}`;
      shotsBy.set(k, (shotsBy.get(k) ?? 0) + 1);
    }
    const g = group(w.players[s.from]!.position);
    if (inBox(s.side, s.bx, s.by)) { const r = acts.get(g) ?? {}; r[s.kind] = (r[s.kind] ?? 0) + 1; acts.set(g, r); }
    if (s.kind === 'pass' && s.to !== undefined && s.tx !== undefined && g === 'punta' && inBox(s.side, s.bx, s.by)) {
      const k = `${group(w.players[s.to]!.position)}${inBox(s.side, s.tx, s.ty!) ? ' in area' : ' fuori'}${s.ok ? '' : ' (persa)'}`;
      outOf.set(k, (outOf.get(k) ?? 0) + 1);
    }
    if (s.kind === 'pass' && s.to !== undefined && s.tx !== undefined) {
      if (inBox(s.side, s.tx, s.ty!)) { // tx, ty in coordinate globali
        const gt = group(w.players[s.to]!.position);
        sent.set(gt, (sent.get(gt) ?? 0) + 1);
        if (s.ok) recv.set(gt, (recv.get(gt) ?? 0) + 1);
      }
    }
  }
}
console.log('passaggi verso l\'area (tentati · riusciti, a partita):', [...sent].map(([g, n]) => `${g} ${(n / N).toFixed(1)} · ${((recv.get(g) ?? 0) / N).toFixed(1)}`).join(' | '));
for (const [g, r] of acts) console.log(`in area, ${g}:`, Object.entries(r).map(([k, n]) => `${k} ${(n / N).toFixed(2)}`).join(' · '));
console.log('passaggi della punta dall area:', [...outOf].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${(n / N).toFixed(1)}`).join(' | '));
console.log('tiri (reparto, tipo, azione che li porta):', [...shotsBy].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${(n / N).toFixed(2)}`).join(' | '));
console.log('tiro della punta, l azione prima:', [...origin].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${(n / N).toFixed(2)}`).join(' | '));
console.log(`impostazione (difensori nel proprio terzo): ${(build.n / N).toFixed(1)} passaggi a partita, riusciti ${(build.ok / build.n * 100).toFixed(1)}%, p media ${(build.p / build.n * 100).toFixed(1)}%`);
