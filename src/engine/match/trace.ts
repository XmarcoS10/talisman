// Registro per il 2D (Blocco 2b): un fotogramma per azione (passaggio, dribbling, tiro, cross, e il contrasto o il
// fallo che fermano il portatore prima che giochi) e, dentro, i momenti che la compongono: intercetto, contrasto,
// uomo saltato, fallo, cartellino, fuorigioco, piazzati, colpo di testa, respinta, seconda palla, parata, uscita, gol.
// Solo con il registro acceso (partita guardata): altrimenti non costa niente e non cambia niente.
import { gx, gy, minute, type MatchState, type MP, type TraceStep } from './state.ts';

export type BeatKind =
  | 'intercept' | 'offside' | 'beat' | 'tackle' | 'foul' | 'yellow' | 'red'
  | 'corner' | 'freeKick' | 'wall' | 'penalty' | 'header' | 'clear' | 'secondBall'
  | 'claim' | 'sweep' | 'save' | 'parry' | 'rebound' | 'block' | 'miss' | 'goal' | 'longKick';

/** un momento dell'azione: chi (e contro chi), dove era la palla (coordinate globali), se la palla era alta */
export interface Beat { kind: BeatKind; who: number; vs?: number; x: number; y: number; high?: boolean }

type Extra = Pick<TraceStep, 'tx' | 'ty' | 'p' | 'xg' | 'to' | 'high'>;

/** il fotogramma dell'azione che comincia: posizioni di tutti in coordinate globali (la squadra 1 gioca a specchio) */
export function frame(st: MatchState, kind: TraceStep['kind'], extra: Partial<Extra> = {}): TraceStep {
  const ids: number[] = [], px: number[] = [], py: number[] = [];
  for (const tm of st.teams)
    for (const m of tm.on) {
      ids.push(m.p.id);
      px.push(tm.side === 0 ? m.x : 12 - m.x);
      py.push(tm.side === 0 ? m.y : 8 - m.y);
    }
  const f: TraceStep = {
    half: st.half, t: st.t, min: minute(st), side: st.s, kind, bx: gx(st, st.bx), by: gy(st, st.by), pressure: 0,
    mom: Math.round(st.momentum), from: st.carrier.p.id, ids, px, py, n0: st.teams[0].on.length, score: [st.score[0], st.score[1]],
    ...extra,
  };
  st.trace!.push(f);
  st.curFrame = f;
  return f;
}

/** aggiunge un momento all'azione in corso (niente, se il registro è spento) */
export function beat(st: MatchState, kind: BeatKind, who: MP, vs?: MP, high?: boolean) {
  const f = st.curFrame;
  if (!f) return;
  (f.beats ??= []).push({ kind, who: who.p.id, ...(vs ? { vs: vs.p.id } : {}), x: gx(st, st.bx), y: gy(st, st.by), ...(high ? { high } : {}) });
}
