// Cambi e stato della partita: chi entra, quando esce il più stanco, e come la mentalità segue il punteggio.
import { MATCH } from '../balance.ts';
import type { Player } from '../model.ts';
import { ratingAt } from '../players.ts';
import { clamp } from '../util.ts';
import { ev, minute, mp, type MatchState, type MP, type Team } from './state.ts';

export function substitute(st: MatchState, tm: Team, out: MP, chosen?: Player): boolean {
  if (tm.subs <= 0 || tm.bench.length === 0 || !out.on) return false;
  const inP = chosen ?? tm.bench.reduce((a, b) => (ratingAt(b, out.pos) > ratingAt(a, out.pos) ? b : a));
  tm.bench = tm.bench.filter((b) => b !== inP);
  const m = mp(inP, { pos: out.pos, x: out.hx, y: out.hy }, out.roleId, tm.fam, minute(st), tm.tactic.players?.[inP.id]); // entra nello stesso ruolo
  m.x = out.x; m.y = out.y;
  tm.on = tm.on.map((x) => (x === out ? m : x));
  st.idsDirty = true;
  tm.played.push(m);
  out.on = false;
  out.st.to = minute(st);
  tm.subs--;
  if (st.carrier === out) st.carrier = m;
  ev(st, 'sub', tm.side, out, { assistId: inP.id });
  return true;
}

/** stato della partita: nel finale chi è avanti si copre, chi è sotto si sbilancia */
export function gameState(st: MatchState, min: number) {
  for (const tm of st.teams) {
    const diff = st.score[tm.side] - st.score[tm.side === 0 ? 1 : 0];
    let m = tm.baseMentality;
    if (min >= MATCH.protectLeadFrom && diff > 0) m--;
    if (min >= MATCH.chaseFrom && diff < 0) m++;
    if (min >= MATCH.chaseFrom + 15 && diff < 0) m++;
    tm.mentality = clamp(m, 1, 5);
  }
}

/** ai minuti previsti esce il più stanco, se è sotto soglia (non per chi gestisce la panchina dal vivo) */
export function autoSubs(st: MatchState, min: number) {
  if (st.subIdx >= MATCH.subMinutes.length || min < MATCH.subMinutes[st.subIdx]!) return;
  st.subIdx++;
  for (const tm of st.teams) {
    if (tm.auto === false) continue; // la panchina la gestisce l'utente
    const tired = tm.on.filter((m) => m.pos !== 'GK').sort((a, b) => a.energy - b.energy)[0];
    if (tired && tired.energy < MATCH.subEnergy) substitute(st, tm, tired);
  }
}
