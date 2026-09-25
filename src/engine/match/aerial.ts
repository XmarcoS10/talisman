// Gioco sulle fasce e duelli aerei (Blocco 2b, intervento 4): il cross alto o basso, l'uscita del portiere, il duello
// fra chi attacca e chi difende la palla, la respinta e la seconda palla. Costanti in MATCH (cross*, duel*, claim*).
import { MATCH } from '../balance.ts';
import { sigmoid, xG } from './pitch.ts';
import { corner } from './setpieces.ts';
import { shoot } from './execute.ts';
import { best, gain, nearest, type MatchState, type MP, type Origin, type Team } from './state.ts';
import { beat } from './trace.ts';

/** forza nel gioco aereo: Colpo di testa, Coraggio, Forza e altezza (182 cm = 11), più il bonus del ruolo (la punta di peso) */
export const aerial = (m: MP) => {
  const a = m.p.attrs;
  return 0.45 * a.heading + 0.15 * a.bravery + 0.15 * a.strength + 0.25 * (11 + (m.p.heightCm - 182) / 2) + m.role.aerial;
};

/** il portiere esce sul cross alto e lo blocca: Uscite alte e Comando dell'area */
export const claims = (st: MatchState, gk: MP | undefined) =>
  !!gk && st.rng.next() < MATCH.claimBase + MATCH.claimSkill * ((gk.p.attrs.aerialReach + gk.p.attrs.commandOfArea) / 2 - 11);

/** chi va sulla palla in area: fra quelli che ci sono, il più forte di testa; se non c'è nessuno, il migliore in campo */
function target(att: Team, c: MP): MP {
  let pick: MP | undefined, top = -Infinity;
  for (const m of att.on) {
    if (m === c || m.pos === 'GK' || m.x < 9.5) continue;
    const s = aerial(m);
    if (s > top) { top = s; pick = m; }
  }
  return pick ?? best(att, aerial, (m) => m !== c && m.pos !== 'GK');
}

/** chi lo marca: il difensore in area più forte di testa, o il più vicino al dischetto */
function marker(def: Team): MP {
  let pick: MP | undefined, top = -Infinity;
  for (const m of def.on) {
    if (m.pos === 'GK' || 12 - m.x < 9.5) continue;
    const s = aerial(m);
    if (s > top) { top = s; pick = m; }
  }
  return pick ?? nearest(def, 1.2, 4, true);
}

/** respinta della difesa: a volte in corner, a volte la seconda palla la riprende chi attacca al limite dell'area */
function cleared(st: MatchState, att: Team, def: Team, d: MP) {
  const r = st.rng.next();
  if (r < MATCH.crossClearCorner) { corner(st); return; }
  if (r < MATCH.crossClearCorner + MATCH.secondBall) {
    st.carrier = nearest(att, 8.6, 4, true); // seconda palla: chi arriva da dietro
    st.bx = 8.6; st.by = 4 + (st.rng.next() - 0.5) * 3;
    st.lastPass = null;
    st.chain = 0;
    beat(st, 'secondBall', st.carrier);
    return;
  }
  gain(st, def, d);
}

/**
 * palla alta in area da `from` (cross, corner, punizione): duello fra il più forte di testa in area e chi lo marca.
 * `quality`: logit della battuta (Cross o Calci d'angolo); `base`: logit del duello a pari forza; `xgMul`: il colpo di
 * testa vale di più o di meno (primo palo: si vince più spesso ma si tira peggio). Vinto è un tiro, perso una respinta.
 */
export function headerDuel(st: MatchState, att: Team, def: Team, from: MP, quality: number, base: number, xgMul: number, origin: Origin): boolean {
  const a = target(att, from), d = marker(def);
  const margin = aerial(a) - aerial(d);
  if (st.rng.next() >= sigmoid(base + MATCH.duelSkill * margin + quality)) { beat(st, 'clear', d, a, true); cleared(st, att, def, d); return false; }
  beat(st, 'header', a, d, true);
  st.lastPass = from;
  st.bx = 10.8; st.by = 4;
  shoot(st, a, MATCH.headerXg * xgMul * Math.max(0.4, 1 + MATCH.headerMargin * margin), 'header', origin);
  return true;
}

/** palla bassa all'indietro dal fondo: anticipo, e il tiro è di piatto dal dischetto contro una difesa che rientra */
function cutback(st: MatchState, att: Team, def: Team, c: MP): boolean {
  const a = target(att, c), d = marker(def);
  const margin = (a.p.attrs.offTheBall + a.p.attrs.firstTouch - d.p.attrs.anticipation - d.p.attrs.positioning) / 2;
  if (st.rng.next() >= sigmoid(MATCH.lowBase + MATCH.duelSkill * margin + MATCH.crossSkill * (c.p.attrs.crossing - 11))) { cleared(st, att, def, d); return false; }
  st.lastPass = c;
  st.bx = 10.2; st.by = 4;
  shoot(st, a, xG(10.2, 4, MATCH.lowPressure), 'open', 'cross');
  return true;
}

/**
 * esegue il cross: se arriva e il portiere non esce, si contende la palla. Restituisce se ha trovato un compagno
 * (è il "cross riuscito" delle statistiche). Il chiamante ha già contato il passaggio.
 */
export function cross(st: MatchState, att: Team, def: Team, c: MP, p: number, low: boolean): boolean {
  if (st.rng.next() >= p) { // non arriva: respinto subito o fuori
    if (st.rng.next() < MATCH.crossBlockCorner) corner(st);
    else gain(st, def, nearest(def, 12 - st.bx, 8 - st.by, true));
    return false;
  }
  const gk = def.on.find((m) => m.pos === 'GK');
  if (!low && claims(st, gk)) { beat(st, 'claim', gk!, undefined, true); gain(st, def, gk!); return false; }
  return low ? cutback(st, att, def, c) : headerDuel(st, att, def, c, MATCH.crossSkill * (c.p.attrs.crossing - 11), MATCH.duelBase, 1, 'cross');
}
