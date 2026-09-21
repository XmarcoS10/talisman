// La finestra di mercato: mette insieme piano del club, trattativa e agenti, ed esegue i trasferimenti.
// Il legame col pilastro 1: ogni acquisto entra nello spogliatoio e sposta le aspettative di chi gioca
// in quel ruolo. È la cosa che si vede e che FM non racconta.
import { AGENT, CLUB_AI } from '../balance.ts';
import type { Club, Offer, Player, Talk, WorldState } from '../model.ts';
import { addCause, addNews, pName } from '../news.ts';
import { abilityAt } from '../players.ts';
import type { Rng } from '../rng.ts';
import { dropRelations, initRelations } from '../social.ts';
import { books } from '../finance/ledger.ts';
import { agentOf, commission, remember, renewalWage } from './agents.ts';
import { acceptsRenewal } from './contracts.ts';
import { needs, plan, sellWillingness, shortlist } from './club-ai.ts';
import { cashNow, counterOffer, openTalk, reopen, reply, type TalkCtx } from './negotiation.ts';
import { value } from './valuation.ts';
import { clamp } from '../util.ts';


/** esegue il trasferimento: soldi, contratto, spogliatoio */
export function transfer(world: WorldState, rng: Rng, p: Player, buyer: Club, offer: Offer, wage: number) {
  const seller = world.clubs[p.clubId!]!;
  // il cartellino si paga a rate se così è stato pattuito: la prima quota adesso, le altre a ogni stagione
  const share = Math.round(offer.fee / Math.max(1, offer.years));
  const now = share + offer.agentFee;
  buyer.balance -= now;
  seller.balance += share;
  books(buyer, world.season).transfersOut += now;
  books(seller, world.season).transfersIn += share;
  if (offer.years > 1) {
    buyer.debts.push({ to: seller.id, amount: share, seasons: offer.years - 1 });
    seller.credits.push({ to: seller.id, amount: share, seasons: offer.years - 1 });
  }
  // percentuale di rivendita dovuta al club precedente (§7.5)
  const owed = p.contract.sellOnTo !== null && p.contract.sellOnTo !== seller.id ? world.clubs[p.contract.sellOnTo] : undefined;
  if (owed && p.contract.sellOn > 0) {
    const share = Math.round(offer.fee * p.contract.sellOn);
    seller.balance -= share;
    owed.balance += share;
  }

  seller.playerIds = seller.playerIds.filter((id) => id !== p.id);
  seller.excluded = seller.excluded.filter((id) => id !== p.id);
  seller.feuds = seller.feuds.filter((f) => f.a !== p.id && f.b !== p.id);
  dropRelations(world, p);
  p.clubId = buyer.id;
  p.contract = {
    ...p.contract, wage, until: world.season + rng.int(CLUB_AI.contractYears[0], CLUB_AI.contractYears[1]),
    preSigned: null, release: null, loan: null,
    sellOn: offer.sellOn, sellOnTo: offer.sellOn > 0 ? seller.id : null, // la prossima cessione paga il dazio
  };
  p.psych.wantsOut = false;
  p.psych.trust = 55;
  p.psych.morale = clamp(p.psych.morale + 10, 0, 100); // il trasferimento voluto tira su
  buyer.playerIds.push(p.id);
  initRelations(world, buyer, rng, [p]);

  // effetto spogliatoio: chi giocava in quel ruolo vede arrivare un concorrente
  for (const id of buyer.playerIds) {
    const q = world.players[id]!;
    if (q.id === p.id || (q.positions[p.position] ?? 0) < 4) continue;
    const worse = abilityAt(p, p.position) - abilityAt(q, p.position);
    if (worse <= 0) continue;
    q.psych.morale = clamp(q.psych.morale - Math.min(12, worse * 0.4), 0, 100);
    q.psych.minutes = Math.max(0, q.psych.minutes - 0.05);
    addCause(world, q, 'cause.newRival', { name: pName(p) });
    if (worse > 20 && q.personality.ambition > 13 && rng.next() < 0.3) q.psych.wantsOut = true;
  }

  const a = agentOf(world, p);
  if (a) { remember(a, buyer.id, AGENT.soldWell); remember(a, seller.id, Math.round(AGENT.soldWell / 2)); }
  const me = world.manager.clubId;
  if (buyer.id === me) addNews(world, 'news.signed', { name: pName(p), club: seller.shortName, fee: offer.fee });
  else if (seller.id === me) addNews(world, 'news.sold', { name: pName(p), club: buyer.shortName, fee: offer.fee });
  else if (p.ca >= 150) addNews(world, 'news.transfer', { name: pName(p), from: seller.shortName, to: buyer.shortName, fee: offer.fee });
}

/** prova a comprare `p`: trattativa completa, dal primo contatto all'accordo o alla rottura */
export function pursue(world: WorldState, rng: Rng, buyer: Club, p: Player, budget: number, room: number, urgency = 0.6): Offer | null {
  const seller = world.clubs[p.clubId!]!;
  const a = agentOf(world, p);
  const wage = renewalWage(a, p, world.season, buyer.reputation);
  if (wage > room) return null; // lo stipendio non sta nel monte ingaggi
  const ctx: TalkCtx = {
    value: value(p, world.season, { clubRep: seller.reputation }),
    willing: sellWillingness(world, seller, p),
    need: urgency,
    sellerRep: seller.reputation,
    release: null,
  };
  const talk = openTalk(rng, p.id, seller.id, buyer.id, ctx);
  let last: Offer | null = null;
  while (talk.state === 'open') {
    const o = counterOffer(talk, ctx, budget);
    if (!o) break;
    o.agentFee = commission(a, o.fee, buyer.id);
    if (cashNow(o) > budget) break;
    last = o;
    reply(talk, o, ctx, world.day);
  }
  if (talk.state !== 'agreed' || !talk.deal) return null;
  const deal = talk.deal;
  transfer(world, rng, p, buyer, deal, wage);
  return last;
}

/**
 * una finestra di mercato: ogni club IA lavora il proprio piano, i più urgenti per primi.
 * ponytail: l'IA non compra dal club dell'utente finché non c'è la schermata per accettare le offerte.
 */
export function runWindow(world: WorldState, rng: Rng, winter = false): number {
  let done = 0;
  const clubs = rng.shuffle(Object.values(world.clubs).filter((c) => c.id !== world.manager.clubId));
  for (const club of clubs) {
    if (club.sanction.kind === 'freeze' || club.sanction.kind === 'points') continue; // mercato bloccato
    const pl = plan(world, club);
    if (pl.full || pl.needs.length === 0) continue;
    let budget = pl.budget;
    let room = pl.wageRoom;
    let deals = 0;
    const max = winter ? CLUB_AI.winterDeals : CLUB_AI.dealsPerWindow;
    for (const need of pl.needs) {
      if (deals >= max || budget <= 0 || room <= 0) break;
      for (const target of shortlist(world, club, need, budget)) {
        if (target.clubId === world.manager.clubId) continue;
        const o = pursue(world, rng, club, target, budget, room, need.urgency);
        if (!o) continue;
        budget -= cashNow(o);
        room -= renewalWage(agentOf(world, target), target, world.season, club.reputation);
        deals++;
        done++;
        break;
      }
    }
  }
  return done;
}

/** le finestre: l'estate fra due stagioni, e due settimane a metà campionato */
export const isWinterWindow = (day: number) => day >= CLUB_AI.winterFrom && day < CLUB_AI.winterTo;

// --- la trattativa condotta dall'utente (§7.5, schermata Trattativa) ---

/** il contesto di una trattativa, ricalcolato ogni volta: niente valori derivati salvati */
export function talkCtx(world: WorldState, p: Player, buyer: Club): TalkCtx {
  const seller = world.clubs[p.clubId!]!;
  const urgency = needs(world, buyer).find((n) => (p.positions[n.pos] ?? 0) >= 4)?.urgency ?? 0.3;
  return {
    value: value(p, world.season, { clubRep: seller.reputation }),
    willing: sellWillingness(world, seller, p),
    need: urgency,
    sellerRep: seller.reputation,
    release: p.contract.release,
  };
}

export const talkFor = (world: WorldState, p: Player) =>
  world.talks.find((t) => t.playerId === p.id && t.buyer === world.manager.clubId) ?? null;

/** apre (o riapre) la trattativa per un giocatore. `null` se non è trattabile */
export function startTalk(world: WorldState, rng: Rng, p: Player): Talk | null {
  if (p.clubId === null || p.clubId === world.manager.clubId) return null;
  const buyer = world.clubs[world.manager.clubId]!;
  const open = talkFor(world, p);
  if (open) { reopen(open, world.day); return open; }
  const t = openTalk(rng, p.id, p.clubId, buyer.id, talkCtx(world, p, buyer));
  world.talks.push(t);
  return t;
}

export type OfferResult = { kind: 'accept' | 'counter' | 'reject'; ask: number; signed: boolean; why?: 'wage' | 'unhappy' | 'ambition' | 'preSigned' | 'cash' };

/**
 * manda un'offerta. Due sì servono per chiudere: quello del club che vende e quello del giocatore,
 * che sullo stipendio ha voce in capitolo come chiunque altro.
 */
export function sendOffer(world: WorldState, rng: Rng, p: Player, o: Offer, wage: number): OfferResult {
  const buyer = world.clubs[world.manager.clubId]!;
  const talk = talkFor(world, p) ?? startTalk(world, rng, p);
  if (!talk) return { kind: 'reject', ask: 0, signed: false };
  const ctx = talkCtx(world, p, buyer);
  if (cashNow(o) > buyer.balance) return { kind: 'counter', ask: talk.ask, signed: false, why: 'cash' };
  const r = reply(talk, o, ctx, world.day);
  if (r.kind !== 'accept' || !talk.deal) return { ...r, signed: false };
  const answer = acceptsRenewal(world, p, buyer, wage);
  if (!answer.ok) return { ...r, signed: false, why: answer.why }; // il club ha detto sì, lui no
  transfer(world, rng, p, buyer, talk.deal, wage);
  world.talks = world.talks.filter((t) => t !== talk);
  return { ...r, signed: true };
}

/** lascia perdere: la trattativa si chiude e il venditore se lo ricorda */
export function dropTalk(world: WorldState, p: Player) {
  const t = talkFor(world, p);
  if (!t) return;
  world.talks = world.talks.filter((x) => x !== t);
  const a = agentOf(world, p);
  if (a) remember(a, world.manager.clubId, -AGENT.walkedAway);
}
