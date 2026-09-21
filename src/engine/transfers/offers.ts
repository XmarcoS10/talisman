// Le offerte dell'IA per i giocatori dell'utente. Durante le finestre un club che vorrebbe un tuo giocatore non lo
// compra da solo: ti manda un'offerta, e decidi tu. Il legame col pilastro 1: se il giocatore sogna quel club e tu
// dici di no, se lo ricorda.
import { CLUB_AI, DEAL, OFFERS } from '../balance.ts';
import type { Club, IncomingOffer, Offer, Player, WorldState } from '../model.ts';
import { addCause, addNews, pName } from '../news.ts';
import { Rng } from '../rng.ts';
import { clamp } from '../util.ts';
import { teamForms } from '../narrative/italian.ts';
import { agentOf, renewalWage } from './agents.ts';
import { transfer } from './market.ts';
import { value } from './valuation.ts';

/** il giocatore sogna il club che lo cerca: molto più blasonato del suo, e lui è ambizioso */
export const keen = (world: WorldState, p: Player, buyer: Club) =>
  buyer.reputation - world.clubs[world.manager.clubId]!.reputation >= OFFERS.keenGap && p.personality.ambition >= OFFERS.keenAmbition;

/**
 * un club IA fa un'offerta per un giocatore dell'utente. Parte sotto il valore e tiene per sé il massimo che
 * pagherebbe (come il prezzo di riserva di una trattativa: non si vede). `false` se non c'è posto per un'altra offerta.
 * Il rumore sul prezzo ha un generatore suo: le offerte non spostano il caso del mondo (e il bilanciamento).
 */
export function makeOffer(world: WorldState, buyer: Club, p: Player, budget: number, urgency: number): boolean {
  if (world.offers.length >= OFFERS.max || world.offers.some((o) => o.playerId === p.id)) return false;
  const seller = world.clubs[world.manager.clubId]!;
  const noise = new Rng(world.seed + p.id * 7919 + buyer.id * 104729 + world.day).next();
  const v = value(p, world.season, { clubRep: seller.reputation }) * (1 + (noise - 0.5) * 2 * DEAL.noise);
  const max = Math.min(budget, Math.round(v * (1 + DEAL.needPremium * urgency)));
  const fee = Math.round(Math.min(max, v * OFFERS.open) / 10000) * 10000;
  if (fee <= 0) return false;
  world.offers.push({ playerId: p.id, buyer: buyer.id, fee, max, wage: renewalWage(agentOf(world, p), p, world.season, buyer.reputation), until: world.day + OFFERS.days, countered: false });
  addNews(world, 'news.offerIn', { club: buyer.name, name: pName(p), fee });
  return true;
}

const drop = (world: WorldState, o: IncomingOffer) => { world.offers = world.offers.filter((x) => x !== o); };

/** l'offerta accettata diventa un trasferimento, pagato in un'unica soluzione */
function close(world: WorldState, rng: Rng, o: IncomingOffer, fee: number): boolean {
  const p = world.players[o.playerId];
  const buyer = world.clubs[o.buyer]!;
  drop(world, o);
  if (!p || p.clubId !== world.manager.clubId) return false;
  if (buyer.balance < fee) { addNews(world, 'news.offerVoid', { club: buyer.name, name: pName(p) }); return false; }
  const deal: Offer = { fee, years: 1, bonusApps: 0, bonusGoals: 0, sellOn: 0, swap: [], loan: null, agentFee: 0 };
  transfer(world, rng, p, buyer, deal, o.wage);
  return true;
}

export function acceptOffer(world: WorldState, rng: Rng, o: IncomingOffer): boolean {
  return close(world, rng, o, o.fee);
}

/** dire di no. Se il giocatore ci teneva, il morale scende e la fiducia in te anche */
export function rejectOffer(world: WorldState, o: IncomingOffer) {
  drop(world, o);
  const p = world.players[o.playerId];
  const buyer = world.clubs[o.buyer];
  if (!p || !buyer || p.clubId !== world.manager.clubId || !keen(world, p, buyer)) return;
  p.psych.morale = clamp(p.psych.morale - OFFERS.blockedMorale, 0, 100);
  p.psych.trust = clamp(p.psych.trust - OFFERS.blockedTrust, 0, 100);
  addCause(world, p, 'cause.offerBlocked', { club: teamForms('x', buyer.city).x_da ?? buyer.name });
}

export type CounterResult = 'accept' | 'raise' | 'walk';

/**
 * la controproposta: se la cifra sta entro il loro massimo, affare fatto. Se lo supera di poco, rilanciano una volta
 * al massimo; se è troppo, o se hai già rilanciato, se ne vanno.
 */
export function counterOffer(world: WorldState, rng: Rng, o: IncomingOffer, ask: number): CounterResult {
  if (ask <= o.max) return close(world, rng, o, ask) ? 'accept' : 'walk';
  if (!o.countered && ask <= o.max * OFFERS.stretch) {
    o.fee = o.max;
    o.countered = true;
    return 'raise';
  }
  rejectOffer(world, o); // chi se ne va per colpa del prezzo pesa sul giocatore come un no
  return 'walk';
}

/** le offerte scadute sono dei no detti in silenzio */
export function expireOffers(world: WorldState) {
  for (const o of [...world.offers]) if (world.day > o.until) rejectOffer(world, o);
}

/** le offerte fatte nel mercato estivo scadono contando dal primo giorno della stagione nuova */
export function rebaseSummerOffers(world: WorldState) {
  for (const o of world.offers) o.until = OFFERS.days;
}

// usata dalla finestra: il club IA preferirebbe comprare il tuo, ma ti fa un'offerta
export const offerInstead = (world: WorldState, buyer: Club, p: Player, budget: number, urgency: number) =>
  p.clubId === world.manager.clubId && buyer.playerIds.length < CLUB_AI.squadMax && makeOffer(world, buyer, p, budget, urgency);
