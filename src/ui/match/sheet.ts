// Tabellino dell'intervallo e della fine (Blocco 3, punto 8): i numeri si contano dal registro fino all'azione che si
// sta guardando, non dal motore (che è qualche secondo avanti), così combaciano con quello che si è visto.
import type { TraceStep } from '../../engine/match/engine.ts';

export interface SheetSide { xg: number; shots: number; onTarget: number; goals: number; passes: number; passesOk: number; duels: number; possession: number }
export interface ShotDot { x: number; y: number; xg: number; outcome: 'goal' | 'saved' | 'blocked' | 'off'; side: 0 | 1; min: number; who: number }

const side = (): SheetSide => ({ xg: 0, shots: 0, onTarget: 0, goals: 0, passes: 0, passesOk: 0, duels: 0, possession: 50 });

/** numeri e tiri delle due squadre dalle azioni 0..upTo (coordinate globali: la squadra 0 attacca verso x = 12) */
export function sheet(frames: TraceStep[], upTo: number): { sides: [SheetSide, SheetSide]; shots: ShotDot[] } {
  const sides: [SheetSide, SheetSide] = [side(), side()];
  const shots: ShotDot[] = [];
  for (let k = 0; k <= upTo && k < frames.length; k++) {
    const f = frames[k]!, att = sides[f.side]!, def = sides[1 - f.side]!;
    if (f.kind === 'pass' || f.kind === 'cross') { att.passes++; if (f.ok) att.passesOk++; } // come il motore: i cross sono passaggi
    for (const [i, b] of (f.beats ?? []).entries()) {
      if (b.kind === 'tackle' || b.kind === 'intercept') def.duels++;
      else if (b.kind === 'beat') att.duels++;
      else if (b.kind === 'shot') {
        const next = f.beats!.slice(i + 1).find((x) => x.kind === 'goal' || x.kind === 'save' || x.kind === 'parry' || x.kind === 'block' || x.kind === 'wall' || x.kind === 'miss');
        const outcome = next?.kind === 'goal' ? 'goal' : next?.kind === 'save' || next?.kind === 'parry' ? 'saved' : next?.kind === 'block' || next?.kind === 'wall' ? 'blocked' : 'off';
        att.shots++;
        att.xg += b.xg ?? 0;
        if (outcome === 'goal') att.goals++;
        if (outcome === 'goal' || outcome === 'saved') att.onTarget++;
        shots.push({ x: b.x, y: b.y, xg: b.xg ?? 0, outcome, side: f.side as 0 | 1, min: f.min, who: b.who });
      }
    }
  }
  const tot = sides[0].passes + sides[1].passes;
  if (tot) { sides[0].possession = Math.round((100 * sides[0].passes) / tot); sides[1].possession = 100 - sides[0].possession; } // come Opta
  return { sides, shots };
}
