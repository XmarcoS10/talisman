import { matchSetups } from '../src/engine/match.ts';
import { simulate } from '../src/engine/match/engine.ts';
import { Rng } from '../src/engine/rng.ts';
import { value } from '../src/engine/transfers/valuation.ts';
import { refereeFor } from '../src/engine/referees.ts';
import { weatherFor } from '../src/engine/weather.ts';
import { advance, isSeasonOver, newWorld } from '../src/engine/world.ts';
const w = newWorld(42); w.manager.clubId = -1;
// (a) valore medio dei titolari per ruolo in Serie A
const byPos = new Map<string, number[]>();
for (const id of w.competitions.ITA1!.clubIds) for (const pid of w.clubs[id]!.playerIds) { const p = w.players[pid]!; (byPos.get(p.position) ?? byPos.set(p.position, []).get(p.position)!).push(value(p, w.season)); }
console.log('valore medio (M) per ruolo, Serie A:', [...byPos].map(([k, v]) => `${k} ${(v.reduce((a, b) => a + b, 0) / v.length / 1e6).toFixed(1)}`).join(' · '));
const gk = [...byPos.get('GK')!].sort((a, b) => b - a), all = [...byPos.values()].flat().sort((a, b) => b - a);
console.log('portieri fra i 100 più cari della A:', all.slice(0, 100).filter((v) => gk.includes(v)).length, '(atteso ~5-10: 1 titolare su 11)');
// (c) punteggi e (d) meteo e (e) arbitri su una stagione
let n = 0, big = 0; const wx = new Map<string, number>(); const refs = new Map<string, Map<number, number>>();
const comp = w.competitions.ITA1!;
for (const fx of comp.fixtures) {
  const k = weatherFor(w, fx).kind; wx.set(k, (wx.get(k) ?? 0) + 1);
  const r = refereeFor(w, fx).id;
  for (const c of [fx.home, fx.away]) { const m = refs.get(String(c)) ?? new Map(); m.set(r, (m.get(r) ?? 0) + 1); refs.set(String(c), m); }
}
console.log('meteo nella stagione di A:', [...wx].map(([k, v]) => `${k} ${(v / comp.fixtures.length * 100).toFixed(0)}%`).join(' · '));
const maxRef = [...refs.values()].map((m) => Math.max(...m.values()));
console.log('stesso arbitro per un club in una stagione (38 partite): massimo medio', (maxRef.reduce((a, b) => a + b, 0) / maxRef.length).toFixed(1), '· peggiore', Math.max(...maxRef), '(atteso con 24 arbitri a caso: ~4)');
for (const fx of comp.fixtures.slice(0, 380)) { const o = simulate(new Rng(n), matchSetups(w, { day: 0, home: fx.home, away: fx.away })); n++; if (o.result.hg + o.result.ag >= 7) big++; }
console.log(`partite con 7+ gol: ${big}/${n} = ${(big / n * 100).toFixed(1)}% (Serie A reale ~0,5-1%)`);
