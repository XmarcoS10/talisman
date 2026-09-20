// Valore di mercato e stipendio (GUIDA §7.5). Derivati: non si salvano mai, si ricalcolano.
// I fattori sono quelli della specifica: CA, potenziale, età, contratto residuo, ruolo, nazionalità,
// reputazione del club, forma, inflazione di mercato. Il "premio di necessità" dell'acquirente NON sta qui:
// è una cosa della trattativa, non del giocatore.
import { MARKET } from '../balance.ts';
import type { Player } from '../model.ts';

// niente import da players.ts: l'età è una sottrazione e il ciclo di import non serve a nessuno
const age = (p: Player, season: number) => season - p.birthYear;

/** media voto delle ultime partite, o 6,5 se non ha ancora giocato */
const formAvg = (p: Player) => (p.form.length ? p.form.reduce((a, b) => a + b, 0) / p.form.length : 6.5);

/** quanto vale l'età: si paga il picco, si svaluta la coda, si scommette sul potenziale */
function ageMul(p: Player, season: number): number {
  const a = age(p, season);
  let m = 1;
  if (a < MARKET.peakFrom) m = Math.min(MARKET.youngMax, 1 + Math.max(0, p.pa - p.ca) * MARKET.youngGap);
  if (a > MARKET.oldFrom) m *= Math.max(MARKET.oldFloor, 1 - (a - MARKET.oldFrom) * MARKET.oldRate);
  return m;
}

/** contratto residuo in anni: chi scade vale meno, perché lo puoi aspettare */
function contractMul(p: Player, season: number): number {
  const left = p.contract.until - season;
  if (left <= 0) return MARKET.contractShort;
  if (left === 1) return MARKET.contractOne;
  return left >= 3 ? MARKET.contractLong : 1;
}

/**
 * valore di mercato in euro, arrotondato alle due cifre significative.
 * `nation` è la nazione della lega in cui gioca (per il premio al giocatore di casa).
 */
export function value(p: Player, season: number, opts: { inflation?: number; clubRep?: number; nation?: string } = {}): number {
  const { inflation = 1, clubRep = 50, nation } = opts;
  let v = Math.pow(10, p.ca / MARKET.caK + MARKET.caC);
  v *= ageMul(p, season);
  v *= contractMul(p, season);
  v *= MARKET.roleMul[p.position];
  v *= 1 + (clubRep - 50) * MARKET.repK;
  if (nation && p.nation === nation) v *= MARKET.homeNation;
  v *= 1 + Math.max(-MARKET.formMax, Math.min(MARKET.formMax, (formAvg(p) - 6.5) * MARKET.formK));
  if (p.psych.wantsOut) v *= MARKET.wantsOut;
  v *= inflation;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(1, v))) - 1);
  return Math.round(v / mag) * mag;
}

/** stipendio annuo coerente con un valore di mercato */
export const wageFor = (v: number) => Math.max(MARKET.wageMin, Math.round((v * MARKET.wageOfValue) / 10000) * 10000);
