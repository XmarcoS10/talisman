// Forma delle squadre (piano 2D, fase 3): senza palla un blocco corto, con palla una squadra larga, la linea difensiva
// che segue la palla. Se una modifica alle posizioni rompe il blocco, questo test se ne accorge.
import { describe, expect, it } from 'vitest';
import { matchSetups } from '../match.ts';
import { Rng } from '../rng.ts';
import { newWorld } from '../world.ts';
import { runMatch } from './engine.ts';
import type { TraceStep } from './state.ts';

describe('forma delle squadre in campo', () => {
  it('senza palla blocco di 30-42 m, con palla larghezza oltre 48 m, linea che segue la palla', () => {
    const w = newWorld(42); w.manager.clubId = -1;
    const A = w.competitions.ITA1!.clubIds;
    let offLen = 0, onWid = 0, n = 0, lineHigh = 0, lineLow = 0, nh = 0, nl = 0;
    for (let g = 0; g < 2; g++) {
      const su = matchSetups(w, { day: 0, home: A[g]!, away: A[g + 5]! });
      const gk = new Set(su.flatMap((s) => s.xi.filter((e) => e.slot.pos === 'GK').map((e) => e.player.id)));
      const trace: TraceStep[] = [];
      const run = runMatch(new Rng(77 + g), su, trace);
      run.result();
      for (const f of run.track) {
        const side = trace[f.step]?.side;
        if (f.dead || side === undefined) continue;
        const team = (t: 0 | 1) => f.ids.map((id, i) => [id, i] as const).filter(([id, i]) => !gk.has(id) && (i < f.n0) === (t === 0)).map(([, i]) => [f.xy[2 * i]!, f.xy[2 * i + 1]!] as const);
        const def = team((1 - side) as 0 | 1), att = team(side);
        const xs = def.map((p) => p[0]);
        offLen += (Math.max(...xs) - Math.min(...xs)) * 8.75;
        const ys = att.map((p) => p[1]);
        onWid += (Math.max(...ys) - Math.min(...ys)) * 8.5;
        n++;
        // linea difensiva (i quattro più arretrati, dalla propria porta) con la palla nella metà avversaria o vicino alla propria area
        const own = xs.map((x) => (side === 1 ? x : 12 - x)).sort((a, b) => a - b);
        const line = (own[0]! + own[1]! + own[2]! + own[3]!) / 4, ball = side === 1 ? f.bx : 12 - f.bx;
        if (ball > 8) { lineHigh += line; nh++; } else if (ball < 3) { lineLow += line; nl++; }
      }
    }
    expect(offLen / n).toBeGreaterThan(30);
    expect(offLen / n).toBeLessThan(42);
    expect(onWid / n).toBeGreaterThan(48);
    expect((lineHigh / nh - lineLow / nl) * 8.75).toBeGreaterThan(15); // la linea sale di almeno 15 m quando la palla è lontana
  }, 60_000);
});
