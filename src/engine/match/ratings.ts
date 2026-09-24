// Voti in pagella e chiusura della partita: possesso in percentuale, xG arrotondati, risultato da consegnare al mondo.
import { clamp } from '../util.ts';
import type { MatchState, MP } from './state.ts';

/** voto in pagella 3-10 (algoritmo documentato: base 6 + contributi) */
export function rate(m: MP, goalDiff: number, conceded: number): number {
  const s = m.st;
  let r = 6.2 + 0.85 * s.goals + 0.5 * s.assists + 0.08 * s.keyPasses + 0.08 * s.onTarget + 0.035 * s.tackles + 0.04 * s.dribbles
    - 0.2 * s.yellows - (s.red ? 1.2 : 0);
  if (s.passes >= 5) r += (s.passesOk / s.passes - 0.8) * 1.5;
  const defensive = m.pos === 'GK' || m.pos === 'DC' || m.pos === 'DL' || m.pos === 'DR';
  if (m.pos === 'GK') r += 0.2 * s.saves;
  if (defensive) r += conceded === 0 ? 0.4 : -0.2 * s.conceded;
  r += goalDiff > 0 ? 0.25 : goalDiff < 0 ? -0.25 : 0;
  return Math.round(clamp(r, 3, 10) * 10) / 10;
}

export function finish(st: MatchState) {
  const { teams, score } = st;
  const total = teams[0].stats.possession + teams[1].stats.possession || 1;
  const poss0 = Math.round((teams[0].stats.possession / total) * 100);
  teams[0].stats.possession = poss0;
  teams[1].stats.possession = 100 - poss0;
  for (const tm of teams) tm.stats.xg = Math.round(tm.stats.xg * 100) / 100;
  const ratings: Record<number, number> = {};
  teams.forEach((tm, i) => {
    const diff = score[i]! - score[1 - i]!;
    for (const m of tm.played) ratings[m.p.id] = rate(m, diff, score[1 - i]!);
  });
  st.output = { result: { hg: score[0], ag: score[1], events: st.events, stats: [teams[0].stats, teams[1].stats], ratings }, played: [teams[0].played, teams[1].played] };
}
