// Pianificatore di mercato del club IA (GUIDA §7.5 punto "finestre di interesse", §7.9).
// Deve essere plausibile, non ottimale: guarda i buchi della rosa, quello che può spendere, e compra
// secondo il proprio gusto. Nessun impulso casuale: un piano per la finestra.
import { BALANCE, CLUB_AI, SQUAD_TEMPLATE } from '../balance.ts';
import type { Club, Player, Position, WorldState } from '../model.ts';
import { abilityAt } from '../players.ts';
import { value } from './valuation.ts';

/** fatturato stimato. ponytail: stadio + reputazione finché non arrivano le finanze vere (§7.7, F8) */
export const revenue = (club: Club) =>
  club.stadium.capacity * CLUB_AI.revenuePerSeat + club.reputation * club.reputation * CLUB_AI.revenuePerRep2;

export const wageBill = (world: WorldState, club: Club) =>
  club.playerIds.reduce((a, id) => a + world.players[id]!.contract.wage, 0);

/** quanto può ancora mettere in stipendi prima di sforare */
export const wageRoom = (world: WorldState, club: Club) =>
  revenue(club) * CLUB_AI.wageCapOfRevenue - wageBill(world, club);

/** quanto può spendere in cartellini in questa finestra */
export const transferBudget = (world: WorldState, club: Club) =>
  Math.max(0, Math.round(club.balance * CLUB_AI.budgetShare));

export interface Need {
  pos: Position;
  have: number; // quanti ne ha
  best: number; // il migliore che ha, in CA
  target: number; // il livello che il club dovrebbe avere
  urgency: number; // 0…1
}

/** i buchi della rosa: pochi uomini in un ruolo, o uomini sotto il livello del club */
export function needs(world: WorldState, club: Club): Need[] {
  const target = BALANCE.caFromReputation(club.reputation) + CLUB_AI.starterBonus;
  const out: Need[] = [];
  for (const [pos, want] of Object.entries(SQUAD_TEMPLATE) as [Position, number][]) {
    const mine = club.playerIds.map((id) => world.players[id]!).filter((p) => (p.positions[pos] ?? 0) >= 4);
    const best = mine.reduce((a, p) => Math.max(a, abilityAt(p, pos)), 0);
    const missing = Math.max(0, want - mine.length);
    const gap = Math.max(0, target - best);
    const urgency = Math.min(1, missing * CLUB_AI.needCount + gap * CLUB_AI.needQuality);
    out.push({ pos, have: mine.length, best: Math.round(best), target: Math.round(target), urgency });
  }
  return out.sort((a, b) => b.urgency - a.urgency);
}

/** il gusto del club: a parità di forza, chi somiglia alla sua filosofia piace di più */
export function taste(club: Club, p: Player, season: number): number {
  const a = season - p.birthYear;
  const phys = (p.attrs.pace + p.attrs.strength + p.attrs.stamina + p.attrs.acceleration) / 4;
  const tech = (p.attrs.technique + p.attrs.firstTouch + p.attrs.passing + p.attrs.dribbling) / 4;
  switch (club.philosophy) {
    case 'youth': return 1 + Math.max(0, 24 - a) * CLUB_AI.tasteYouth;
    case 'veterans': return 1 + Math.max(0, a - 28) * CLUB_AI.tasteVeteran;
    case 'physical': return 1 + (phys - 11) * CLUB_AI.tastePhysical;
    case 'technical': return 1 + (tech - 11) * CLUB_AI.tasteTechnical;
    default: return 1;
  }
}

/** quanto il club proprietario è disposto a cederlo, 0…1 */
export function sellWillingness(world: WorldState, club: Club, p: Player): number {
  if (club.playerIds.length <= CLUB_AI.squadMin) return CLUB_AI.sellStripped; // con la rosa all'osso non si cede
  if (club.excluded.includes(p.id)) return CLUB_AI.sellExcluded;
  if (p.psych.wantsOut) return CLUB_AI.sellWantsOut;
  if (p.contract.until <= world.season) return CLUB_AI.sellExpiring;
  // quanti gli stanno davanti nel suo ruolo: le riserve delle riserve si lasciano andare
  const same = club.playerIds.map((id) => world.players[id]!).filter((q) => q.position === p.position);
  const rank = same.filter((q) => q.ca > p.ca).length;
  const spare = Math.max(1, Math.ceil((SQUAD_TEMPLATE[p.position] ?? 2) / 2));
  if (club.playerIds.length > CLUB_AI.squadMin && rank >= spare) return CLUB_AI.sellSurplus;
  return rank === 0 ? CLUB_AI.sellKey : CLUB_AI.sellBackup;
}

/** i nomi su cui il club proverebbe davvero: migliorano la rosa, si possono pagare, e piacciono */
export function shortlist(world: WorldState, club: Club, need: Need, budget: number): Player[] {
  const season = world.season;
  const scored: { p: Player; score: number }[] = [];
  for (const p of Object.values(world.players)) {
    if (p.clubId === null || p.clubId === club.id) continue;
    if ((p.positions[need.pos] ?? 0) < 4) continue;
    if (abilityAt(p, need.pos) < need.best + CLUB_AI.upgrade && need.have >= (SQUAD_TEMPLATE[need.pos] ?? 2)) continue;
    const owner = world.clubs[p.clubId]!;
    const v = value(p, season, { clubRep: owner.reputation });
    if (v > budget) continue;
    const will = sellWillingness(world, owner, p);
    if (will < 0.2) continue;
    scored.push({ p, score: abilityAt(p, need.pos) * taste(club, p, season) * (0.6 + will) });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, CLUB_AI.shortlist).map((x) => x.p);
}

export interface Plan {
  budget: number;
  wageRoom: number;
  needs: Need[]; // i buchi da colmare, i più urgenti per primi
  full: boolean; // rosa già piena: non si compra
}

/** il piano del club per la finestra */
export function plan(world: WorldState, club: Club): Plan {
  return {
    budget: transferBudget(world, club),
    wageRoom: wageRoom(world, club),
    needs: needs(world, club).filter((n) => n.urgency >= CLUB_AI.buyFrom),
    full: club.playerIds.length >= CLUB_AI.squadMax,
  };
}
