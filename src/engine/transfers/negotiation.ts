// Trattativa multi-parametro a concessioni alternate (GUIDA §7.5).
// Regole del gioco: il venditore ha un prezzo di riserva che il compratore non vede mai, parte da una richiesta
// più alta e scende di poco a ogni giro; la pazienza si consuma, e un rilancio irrisorio la brucia in fretta.
// Rotta la trattativa si può riaprire, ma non subito.
import { DEAL } from '../balance.ts';
import type { ClubId, PlayerId } from '../model.ts';
import type { Rng } from '../rng.ts';

/** l'offerta, con tutti i parametri della specifica */
export interface Offer {
  fee: number; // parte fissa
  years: number; // in quante stagioni è rateizzata (1 = subito)
  bonusApps: number; // bonus presenze
  bonusGoals: number; // bonus gol
  sellOn: number; // % sulla futura rivendita, 0…0.3
  swap: { playerId: PlayerId; value: number; wanted: boolean }[]; // contropartite, col loro valore
  loan: { fee: number; buy: number; obligation: boolean } | null; // prestito con diritto o obbligo di riscatto
  agentFee: number; // commissione all'agente, a carico del compratore
}

export const emptyOffer = (fee = 0): Offer =>
  ({ fee, years: 1, bonusApps: 0, bonusGoals: 0, sellOn: 0, swap: [], loan: null, agentFee: 0 });

/** quello che il venditore vede in un'offerta, tradotto in contanti di oggi */
export function worth(o: Offer, value: number): number {
  if (o.loan) return o.loan.fee * DEAL.loanFeeWorth + o.loan.buy * (o.loan.obligation ? 1 - DEAL.instalment : DEAL.optionWorth);
  let w = o.fee * (1 - DEAL.instalment * (o.years - 1));
  w += (o.bonusApps + o.bonusGoals) * DEAL.bonusOdds;
  w += o.sellOn * value * DEAL.sellOnWorth;
  for (const s of o.swap) w += s.value * (s.wanted ? DEAL.swapDiscount : DEAL.swapUnwanted);
  return Math.max(0, w);
}

/** quanto costa davvero al compratore (per il bilancio della prima stagione) */
export const cashNow = (o: Offer) =>
  (o.loan ? o.loan.fee : o.fee / o.years) + o.agentFee;

export interface TalkCtx {
  value: number; // valore di mercato del giocatore
  willing: number; // 0 = non lo vende per niente, 1 = se ne vuole liberare
  need: number; // 0…1: quanto il compratore ha bisogno di quel ruolo
  sellerRep: number; // reputazione del venditore 1-100
  release: number | null; // clausola rescissoria, se c'è
}

export type TalkState = 'open' | 'agreed' | 'broken' | 'closed';

export interface Talk {
  playerId: PlayerId;
  seller: ClubId;
  buyer: ClubId;
  reserve: number; // prezzo di riserva, nascosto al compratore
  ask: number; // richiesta attuale, questa si vede
  last: number; // valore percepito dell'ultima offerta ricevuta
  patience: number; // 0-100
  round: number;
  state: TalkState;
  reopenDay: number; // dal giorno in cui si può riprovare
  deal: Offer | null; // l'offerta accettata
}

/**
 * apre la trattativa. Il prezzo di riserva dipende da quanto il venditore vuole vendere e da un po' di
 * rumore: due dirigenze non valutano mai lo stesso giocatore allo stesso modo.
 */
export function openTalk(rng: Rng, playerId: PlayerId, seller: ClubId, buyer: ClubId, ctx: TalkCtx): Talk {
  const mood = ctx.willing < 0.5
    ? 1 + DEAL.sellPremium * (1 - ctx.willing * 2) // non lo vende: si fa pagare
    : 1 - DEAL.fireSale * (ctx.willing - 0.5) * 2; // se ne libera: sconta
  const reserve = Math.round(ctx.value * mood * (1 + (rng.next() - 0.5) * 2 * DEAL.noise));
  return {
    playerId, seller, buyer,
    reserve,
    ask: Math.round(reserve * DEAL.askStart),
    last: 0,
    patience: Math.max(20, Math.min(100, 100 - (ctx.sellerRep - 50) * DEAL.patiencePro)),
    round: 0,
    state: 'open',
    reopenDay: 0,
    deal: null,
  };
}

/** il massimo che il compratore è disposto a mettere sul piatto, col premio di necessità (§7.5) */
export const ceiling = (ctx: TalkCtx) => ctx.value * (1 + DEAL.needPremium * ctx.need);

export type Reply = { kind: 'accept' | 'counter' | 'reject'; ask: number };

/**
 * il venditore risponde a un'offerta. Un giro di concessioni: se il pacchetto vale quasi quanto chiede,
 * accetta; altrimenti scende verso il proprio limite. Se l'offerta è un'elemosina, la pazienza crolla.
 */
export function reply(talk: Talk, offer: Offer, ctx: TalkCtx, day: number): Reply {
  if (talk.state !== 'open') return { kind: 'reject', ask: talk.ask };
  const w = worth(offer, ctx.value);
  // clausola rescissoria pagata per intero: il venditore non ha voce in capitolo
  if (ctx.release !== null && offer.fee >= ctx.release && !offer.loan) {
    talk.state = 'agreed';
    talk.deal = offer;
    return { kind: 'accept', ask: talk.ask };
  }
  talk.round++;
  const lowball = w < talk.last * (1 + DEAL.minStep) && talk.round > 1;
  talk.last = Math.max(talk.last, w);
  if (w >= talk.ask * DEAL.accept && w >= talk.reserve) {
    talk.state = 'agreed';
    talk.deal = offer;
    return { kind: 'accept', ask: talk.ask };
  }
  talk.patience -= DEAL.patienceRound + (lowball ? DEAL.patienceLowball : 0);
  if (talk.patience <= 0 || talk.round >= DEAL.rounds) {
    talk.state = 'broken';
    talk.reopenDay = day + DEAL.reopenDays;
    return { kind: 'reject', ask: talk.ask };
  }
  // concessione: ci si avvicina al proprio limite, mai sotto
  const floor = Math.max(talk.reserve, w);
  talk.ask = Math.round(talk.ask - (talk.ask - floor) * DEAL.concession);
  return { kind: 'counter', ask: talk.ask };
}

/** una trattativa rotta si può riprendere, ma la pazienza riparte più bassa */
export function reopen(talk: Talk, day: number): boolean {
  if (talk.state !== 'broken' || day < talk.reopenDay) return false;
  talk.state = 'open';
  talk.patience = 50;
  talk.round = 0;
  return true;
}

/**
 * offerta del compratore IA: parte bassa e si avvicina alla richiesta, senza superare il proprio tetto.
 * Se i contanti non bastano, allunga le rate e mette bonus e percentuale di rivendita — che al venditore
 * valgono meno, ma a lui costano dopo.
 */
export function counterOffer(talk: Talk, ctx: TalkCtx, cash: number): Offer | null {
  const max = ceiling(ctx);
  const target = Math.min(max, talk.ask);
  // il compratore non vede il prezzo di riserva: si arrende guardando la richiesta e il proprio tetto
  if (talk.ask > max * DEAL.walkAway && talk.round > 2) return null;
  const step = talk.round === 0 ? 0.72 : Math.min(1, 0.72 + 0.14 * talk.round);
  const aim = Math.round(target * step);
  const o = emptyOffer(aim);
  if (cash < aim) { // non ci sono i soldi subito: si rateizza e si carica di bonus
    o.years = Math.min(4, Math.ceil(aim / Math.max(1, cash)));
    o.bonusApps = Math.round(aim * 0.08);
    o.sellOn = 0.1;
  }
  o.agentFee = Math.round(aim * DEAL.agentCut);
  return o;
}
