// Contratti (GUIDA §7.5): rinnovi, clausole, svincolati e parametro zero, prestiti con condizioni.
import { CLUB_AI, CONTRACT, SQUAD_TEMPLATE } from '../balance.ts';
import type { Club, Player, WorldState } from '../model.ts';
import { addCause, addNews, pName } from '../news.ts';
import { abilityAt } from '../players.ts';
import type { Rng } from '../rng.ts';
import { dropRelations, initRelations } from '../social.ts';
import { agentOf, renewalWage } from './agents.ts';
import { sellWillingness, wageRoom } from './club-ai.ts';
import { value, wageFor } from './valuation.ts';

const age = (p: Player, season: number) => season - p.birthYear;
export const isFree = (p: Player) => p.clubId === null;
export const expires = (p: Player, season: number) => p.contract.until - season;

/** durata che un club offre: lunga ai giovani, corta ai vecchi */
export function years(p: Player, season: number): number {
  const a = age(p, season);
  return a < CONTRACT.youngTo ? CONTRACT.yearsYoung : a >= CONTRACT.oldFrom ? CONTRACT.yearsOld : CONTRACT.yearsPeak;
}

/** lo stipendio che chiede per firmare (lo decide l'agente, se ce l'ha) */
export const askingWage = (world: WorldState, p: Player, club: Club) =>
  renewalWage(agentOf(world, p), p, world.season, club.reputation);

export type Answer = { ok: true } | { ok: false; why: 'wage' | 'unhappy' | 'ambition' | 'preSigned' };

/**
 * il giocatore accetta? Conta lo stipendio rispetto a quello che chiede (sconto per chi è leale),
 * il morale, e l'ambizione: chi punta in alto non firma per un club sotto il suo livello.
 */
export function acceptsRenewal(world: WorldState, p: Player, club: Club, wage: number): Answer {
  if (p.contract.preSigned !== null && p.contract.preSigned !== club.id) return { ok: false, why: 'preSigned' };
  if (p.psych.morale < CONTRACT.unhappyRefuse || p.psych.wantsOut) return { ok: false, why: 'unhappy' };
  const ask = askingWage(world, p, club);
  const discount = 1 - Math.max(0, p.personality.loyalty - 10) * CONTRACT.loyalty;
  if (wage < ask * CONTRACT.acceptWage * discount) return { ok: false, why: 'wage' };
  // ambizione: il club deve essere all'altezza di quanto è forte
  const deserved = Math.min(95, p.ca / 2);
  const gap = Math.max(0, deserved - club.reputation);
  if (gap * CONTRACT.ambitionLevel * Math.max(0, p.personality.ambition - 10) > 1) return { ok: false, why: 'ambition' };
  return { ok: true };
}

/** firma il rinnovo. La clausola rescissoria si mette solo se pattuita */
export function renew(world: WorldState, rng: Rng, p: Player, club: Club, wage: number, withRelease = rng.next() < CONTRACT.releaseP) {
  p.contract = {
    ...p.contract,
    wage,
    until: world.season + years(p, world.season),
    release: withRelease ? Math.round(value(p, world.season, { clubRep: club.reputation }) * CONTRACT.releaseMul) : null,
    preSigned: null,
  };
  p.psych.trust = Math.min(100, p.psych.trust + 6);
  addCause(world, p, 'cause.renewed', { wage });
}

/** il club vuole tenerlo? Vecchio, scarso per il suo livello o in esubero: si lascia andare */
export function wantsToKeep(world: WorldState, club: Club, p: Player): boolean {
  if (age(p, world.season) >= CONTRACT.keepBelowAge) return false;
  const level = club.playerIds.reduce((a, id) => a + world.players[id]!.ca, 0) / Math.max(1, club.playerIds.length);
  if (abilityAt(p, p.position) - level < CONTRACT.keepGap) return false;
  return sellWillingness(world, club, p) < CLUB_AI.sellSurplus || club.playerIds.length <= CLUB_AI.squadMin;
}

/** i rinnovi di fine stagione dell'IA: chi si vuole tenere riceve un'offerta, gli altri vanno a scadenza */
export function aiRenewals(world: WorldState, rng: Rng) {
  for (const club of Object.values(world.clubs)) {
    if (club.id === world.manager.clubId) { userExpiring(world, club); continue; } // i tuoi li decidi tu
    for (const id of [...club.playerIds]) {
      const p = world.players[id]!;
      if (p.contract.loan || expires(p, world.season) > CONTRACT.renewFrom) continue;
      const wage = askingWage(world, p, club);
      // il rinnovo deve stare nel monte ingaggi: chi è già sforato perde i giocatori a scadenza,
      // a meno che la rosa non sia ridotta all'osso e una squadra vada comunque schierata
      const fits = wageRoom(world, club) + p.contract.wage >= wage || club.playerIds.length <= CLUB_AI.squadMin;
      const keep = fits && wantsToKeep(world, club, p) && wage <= p.contract.wage * 3;
      if (keep && acceptsRenewal(world, p, club, wage).ok) {
        renew(world, rng, p, club, wage);
        if (club.id === world.manager.clubId) addNews(world, 'news.renewed', { name: pName(p), wage, until: p.contract.until });
      } else if (expires(p, world.season) < 0) {
        release(world, club, p);
        if (club.id === world.manager.clubId) addNews(world, 'news.expired', { name: pName(p) });
      }
    }
  }
}

/** i tuoi in scadenza: l'assistente non firma niente al posto tuo, ti avvisa e basta */
function userExpiring(world: WorldState, club: Club) {
  for (const id of [...club.playerIds]) {
    const p = world.players[id]!;
    if (p.contract.loan || expires(p, world.season) > CONTRACT.renewFrom) continue;
    if (expires(p, world.season) < 0) {
      release(world, club, p);
      addNews(world, 'news.expired', { name: pName(p) });
    } else {
      addNews(world, 'news.expiring', { name: pName(p), wage: askingWage(world, p, club), until: p.contract.until });
    }
  }
}

/** svincolo: il giocatore esce dalla rosa e resta senza club */
export function release(world: WorldState, club: Club, p: Player) {
  club.playerIds = club.playerIds.filter((x) => x !== p.id);
  club.excluded = club.excluded.filter((x) => x !== p.id);
  dropRelations(world, p);
  p.clubId = null;
  p.contract = { ...p.contract, wage: 0, release: null, loan: null };
}

export const freeAgents = (world: WorldState) => Object.values(world.players).filter(isFree);

/** un club prende uno svincolato: niente cartellino, stipendio più alto */
export function signFree(world: WorldState, rng: Rng, p: Player, club: Club): boolean {
  const wage = Math.round(askingWage(world, p, club) * CONTRACT.freeWageMul);
  if (!acceptsRenewal(world, p, club, wage).ok) return false;
  p.clubId = club.id;
  club.playerIds.push(p.id);
  renew(world, rng, p, club, wage, false);
  initRelations(world, club, rng, [p]);
  if (club.id === world.manager.clubId) addNews(world, 'news.freeSigned', { name: pName(p) });
  return true;
}

/**
 * prestiti formativi: i ragazzi che non giocherebbero mai vanno a farsi le ossa più in basso,
 * con minuti garantiti e il divieto di giocare contro di noi.
 */
export function loanOutYouth(world: WorldState, rng: Rng): number {
  let n = 0;
  for (const club of Object.values(world.clubs)) {
    if (club.id === world.manager.clubId) continue;
    for (const id of [...club.playerIds]) {
      const p = world.players[id]!;
      if (p.contract.loan || age(p, world.season) > CONTRACT.loanMaxAge || club.playerIds.length <= CLUB_AI.squadMin) continue;
      const same = club.playerIds.map((x) => world.players[x]!).filter((q) => q.position === p.position);
      if (same.filter((q) => q.ca > p.ca).length < CONTRACT.loanRank) continue; // qui giocherebbe
      const hosts = Object.values(world.clubs).filter((c) => c.id !== club.id && c.id !== world.manager.clubId
        && c.reputation < club.reputation - CONTRACT.loanRepGap && c.playerIds.length < CLUB_AI.squadMax);
      if (!hosts.length || rng.next() > CONTRACT.loanP) continue;
      loanOut(world, rng, p, hosts[rng.int(0, hosts.length - 1)]!);
      n++;
    }
  }
  return n;
}

/** gli svincolati trovano squadra: chi ha un buco in quel ruolo e spazio a bilancio se li prende */
export function signFreeAgents(world: WorldState, rng: Rng): number {
  let n = 0;
  for (const p of rng.shuffle(freeAgents(world))) {
    const suitors = Object.values(world.clubs).filter((c) => c.id !== world.manager.clubId
      && c.playerIds.length < CLUB_AI.squadMax
      && c.playerIds.filter((id) => world.players[id]!.position === p.position).length < (SQUAD_TEMPLATE[p.position] ?? 2)
      && wageRoom(world, c) > askingWage(world, p, c));
    if (!suitors.length) continue;
    // va dove è più ambito: il club più blasonato che lo vuole
    const to = suitors.sort((a, b) => b.reputation - a.reputation)[0]!;
    if (signFree(world, rng, p, to)) n++;
  }
  return n;
}

/**
 * parametro zero: da gennaio chi è in scadenza può firmare con un altro club per la stagione dopo.
 * Firma con chi è più blasonato del suo, se lo stipendio lo convince.
 */
export function preContracts(world: WorldState, rng: Rng): number {
  let n = 0;
  for (const p of Object.values(world.players)) {
    if (p.clubId === null || p.contract.preSigned !== null || expires(p, world.season) > 0 || p.contract.loan) continue;
    const owner = world.clubs[p.clubId]!;
    const suitors = Object.values(world.clubs).filter((c) => c.id !== owner.id && c.id !== world.manager.clubId
      && c.reputation > owner.reputation && c.playerIds.length < CLUB_AI.squadMax);
    if (!suitors.length || rng.next() > 0.3) continue;
    const to = suitors[rng.int(0, suitors.length - 1)]!;
    const wage = Math.round(askingWage(world, p, to) * CONTRACT.freeWageMul);
    if (acceptsRenewal(world, p, to, wage).ok) {
      p.contract.preSigned = to.id;
      n++;
      if (owner.id === world.manager.clubId) addNews(world, 'news.preSigned', { name: pName(p), club: to.shortName });
    }
  }
  return n;
}

/** a fine stagione chi aveva già firmato altrove ci va, gratis */
export function movePreSigned(world: WorldState, rng: Rng): number {
  let n = 0;
  for (const p of Object.values(world.players)) {
    const to = p.contract.preSigned;
    if (to === null || p.clubId === null) continue;
    const club = world.clubs[to];
    if (!club) { p.contract.preSigned = null; continue; }
    release(world, world.clubs[p.clubId]!, p);
    p.contract.preSigned = null;
    p.clubId = club.id;
    club.playerIds.push(p.id);
    renew(world, rng, p, club, Math.round(askingWage(world, p, club) * CONTRACT.freeWageMul), false);
    initRelations(world, club, rng, [p]);
    n++;
  }
  return n;
}

/** condizioni con cui si manda uno in prestito */
export interface LoanTerms {
  minutes?: number;
  noPlayVsOwner?: boolean;
  buy?: number | null;
  obligation?: boolean;
}

/** manda in prestito, con le condizioni della specifica */
export function loanOut(world: WorldState, rng: Rng, p: Player, to: Club, terms: LoanTerms = {}) {
  const from = world.clubs[p.clubId!]!;
  from.playerIds = from.playerIds.filter((id) => id !== p.id);
  dropRelations(world, p);
  p.clubId = to.id;
  to.playerIds.push(p.id);
  p.contract.loan = {
    from: from.id,
    until: world.season + 1,
    minutes: terms.minutes ?? CONTRACT.loanMinutes,
    noPlayVsOwner: terms.noPlayVsOwner ?? true,
    buy: terms.buy === undefined ? Math.round(value(p, world.season, { clubRep: from.reputation }) * CONTRACT.loanBuyMul) : terms.buy,
    obligation: terms.obligation ?? false,
  };
  initRelations(world, to, rng, [p]);
}

/** fine prestito: torna a casa, o resta se c'era l'obbligo di riscatto */
export function returnLoans(world: WorldState, rng: Rng): number {
  let n = 0;
  for (const p of Object.values(world.players)) {
    const l = p.contract.loan;
    if (!l || l.until > world.season || p.clubId === null) continue;
    const here = world.clubs[p.clubId]!;
    const owner = world.clubs[l.from];
    p.contract.loan = null;
    n++;
    if (!owner) continue;
    if (l.obligation && l.buy !== null) { // riscatto obbligatorio: resta dov'è e si paga
      here.balance -= l.buy;
      owner.balance += l.buy;
      p.contract.until = Math.max(p.contract.until, world.season + years(p, world.season));
      continue;
    }
    here.playerIds = here.playerIds.filter((id) => id !== p.id);
    here.excluded = here.excluded.filter((id) => id !== p.id);
    dropRelations(world, p);
    p.clubId = owner.id;
    owner.playerIds.push(p.id);
    initRelations(world, owner, rng, [p]);
    p.contract.wage = wageFor(value(p, world.season, { clubRep: owner.reputation }));
  }
  return n;
}
