// Diagnosi del motore partita (Blocco 2, docs/design/motore-v2.md): le statistiche che il report di `pnpm sim` non
// misura ancora, lette dal registro delle azioni, più l'equilibrio di moduli e mentalità a parità di rosa.
// Uso: node tools/diag-match.ts [partite=2000] [seme=42]
import { matchSetups } from '../src/engine/match.ts';
import { simulate, type TraceStep } from '../src/engine/match/engine.ts';
import { defaultRoles, FORMATIONS } from '../src/engine/match/tactics.ts';
import { Rng } from '../src/engine/rng.ts';
import { newWorld } from '../src/engine/world.ts';
import type { FormationId, WorldState } from '../src/engine/model.ts';

const N = Number(process.argv[2] ?? 2000);
const seed = Number(process.argv[3] ?? 42);
const world: WorldState = newWorld(seed);
world.manager.clubId = -1;
const rng = new Rng(seed);
const clubs = world.competitions.ITA1!.clubIds;
const fresh = () => { for (const p of Object.values(world.players)) { p.condition.fitness = 100; p.condition.injuryDays = 0; p.discipline.ban = 0; } };
const pick = () => { const h = rng.pick(clubs); let a = rng.pick(clubs); while (a === h) a = rng.pick(clubs); return [h, a] as const; };

// --- statistiche dal registro ---
const c = { n: 0, passes: 0, passesOk: 0, crosses: 0, crossesOk: 0, drib: 0, dribOk: 0, tackles: 0, corners: 0, offsides: 0, shots: 0,
  goals: 0, gOpen: 0, gCross: 0, gCorner: 0, gPen: 0, gFk: 0, gCounter: 0, headers: 0, possStrong: 0, nStrong: 0, actions: 0 };
for (let i = 0; i < N; i++) {
  const [home, away] = pick();
  fresh();
  const fx = { day: 0, home, away };
  const setups = matchSetups(world, fx);
  const trace: TraceStep[] = [];
  const out = simulate(rng, setups, trace);
  const r = out.result;
  c.n++;
  c.actions += trace.length;
  for (const s of r.stats) { c.passes += s.passes; c.passesOk += s.passesOk; c.tackles += s.tackles; c.corners += s.corners; c.offsides += s.offsides; c.shots += s.shots; }
  const str = setups.map((s) => s.xi.reduce((a, e) => a + e.player.ca, 0) / 11);
  if (Math.abs(str[0]! - str[1]!) >= 8) { c.nStrong++; c.possStrong += r.stats[str[0]! > str[1]! ? 0 : 1].possession; }
  c.gPen += r.events.filter((e) => e.type === 'penGoal').length;
  for (let k = 0; k < trace.length; k++) {
    const f = trace[k]!;
    if (f.kind === 'cross') { c.crosses++; if (f.ok) { c.crossesOk++; c.headers++; } }
    if (f.kind === 'dribble') { c.drib++; if (f.ok) c.dribOk++; }
    const next = trace[k + 1]?.score ?? [r.hg, r.ag];
    const scored = next[f.side] - f.score[f.side]; // gol della squadra in possesso dopo questa azione
    if (scored <= 0) continue;
    // nel registro un tiro-gol ha ok = false (kickoff cambia squadra prima dell'esito): conta il punteggio
    if (f.kind === 'shot') c.gOpen++;
    else if (f.kind === 'cross') { if (f.ok) c.gCross++; else c.gCorner++; }
    // gol nato da un'azione che non è un tiro: fallo al passo dopo (rigore o punizione, i rigori si contano dagli eventi)
    // contropiede: il possesso è cominciato nella propria metà campo da meno di 15 s e con al massimo 4 azioni
    let j = k;
    while (j > 0 && trace[j - 1]!.side === f.side && trace[j - 1]!.half === f.half) j--;
    const start = trace[j]!;
    const ownHalf = f.side === 0 ? start.bx < 6 : start.bx > 6;
    if ((f.kind === 'shot' || f.kind === 'cross' && f.ok) && ownHalf && f.t - start.t <= 15 && k - j <= 4) c.gCounter++;
  }
  c.goals += r.hg + r.ag;
}
c.gFk = c.goals - c.gOpen - c.gCross - c.gCorner - c.gPen;
// colpi di testa: cross riusciti + corner giocati di testa (MATCH.cornerHeader, fuori dal registro)
const per = (x: number) => x / c.n / 2;
const pctOf = (x: number, t: number) => `${((x / t) * 100).toFixed(1)}%`;
console.log(`# Diagnosi motore — ${N} partite, seme ${seed}\n`);
console.log('| Statistica | Valore |\n|---|---|');
console.log(`| Azioni per partita | ${(c.actions / c.n).toFixed(0)} |`);
console.log(`| Passaggi per squadra · precisione | ${per(c.passes).toFixed(0)} · ${pctOf(c.passesOk, c.passes)} |`);
console.log(`| Cross per squadra · riusciti | ${per(c.crosses).toFixed(1)} · ${pctOf(c.crossesOk, c.crosses)} |`);
console.log(`| Dribbling tentati per squadra · riusciti | ${per(c.drib).toFixed(1)} · ${pctOf(c.dribOk, c.drib)} |`);
console.log(`| Contrasti + intercetti per squadra | ${per(c.tackles).toFixed(1)} |`);
console.log(`| Corner per squadra | ${per(c.corners).toFixed(1)} |`);
console.log(`| Fuorigioco per squadra | ${per(c.offsides).toFixed(1)} |`);
console.log(`| Colpi di testa su cross riusciti / tiri | ${pctOf(c.headers, c.shots)} (più i corner di testa, fuori registro) |`);
console.log(`| Gol: tiro su azione (compresi i corner dopo una parata) · cross · corner da cross respinto · rigore · punizione | ${pctOf(c.gOpen, c.goals)} · ${pctOf(c.gCross, c.goals)} · ${pctOf(c.gCorner, c.goals)} · ${pctOf(c.gPen, c.goals)} · ${pctOf(c.gFk, c.goals)} |`);
console.log(`| Gol da piazzato (corner, rigore, punizione) | ${pctOf(c.gCorner + c.gPen + c.gFk, c.goals)} |`);
console.log(`| Gol in contropiede | ${pctOf(c.gCounter, c.goals)} |`);
console.log(`| Possesso della più forte (≥ 8 di CA medio in più, ${c.nStrong} partite) | ${(c.possStrong / Math.max(1, c.nStrong)).toFixed(1)}% |`);

// --- moduli e mentalità a parità di rosa: il club di casa cambia modulo, l'avversario gioca il suo ---
const M = Math.max(200, Math.round(N / 4));
function ppg(apply: (w: WorldState, clubId: number) => void): number {
  let pts = 0;
  for (let i = 0; i < M; i++) {
    const [me, opp] = pick();
    const club = world.clubs[me]!;
    const saved = { ...club.tactic, roles: [...club.tactic.roles] };
    const fam = { ...club.familiarity };
    apply(world, me);
    fresh();
    const fx = i % 2 ? { day: 0, home: me, away: opp } : { day: 0, home: opp, away: me };
    const setups = matchSetups(world, fx);
    const mine = fx.home === me ? 0 : 1;
    setups[mine].mentality = club.tactic.mentality;
    const r = simulate(rng, setups).result;
    const d = mine === 0 ? r.hg - r.ag : r.ag - r.hg;
    pts += d > 0 ? 3 : d === 0 ? 1 : 0;
    club.tactic = saved;
    club.familiarity = fam;
  }
  return pts / M;
}
console.log(`\n## Moduli (${M} partite ciascuno, mentalità 3)\n`);
for (const f of Object.keys(FORMATIONS) as FormationId[])
  console.log(`- ${f}: ${ppg((w, id) => { const t = w.clubs[id]!.tactic; const cl = w.clubs[id]!; cl.familiarity[f] = cl.familiarity[t.formation] ?? 100; t.formation = f; t.roles = defaultRoles(f); t.mentality = 3; }).toFixed(2)} punti a partita`);
console.log(`\n## Mentalità (${M} partite ciascuna, modulo del club)\n`);
for (const m of [1, 2, 3, 4, 5]) console.log(`- ${m}: ${ppg((w, id) => { w.clubs[id]!.tactic.mentality = m; }).toFixed(2)} punti a partita`);
