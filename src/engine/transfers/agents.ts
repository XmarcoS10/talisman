// Agenti (GUIDA §7.5): personalità, memoria per club, commissioni, iniziative.
// Sono loro a creare movimento: propongono assistiti, chiedono rinnovi, spingono per uscire.
import { AGENT, DEAL, MARKET } from '../balance.ts';
import type { Agent, ClubId, Player, PlayerId, WorldState } from '../model.ts';
import { NATIONS } from '../names.ts';
import type { Rng } from '../rng.ts';
import { value } from './valuation.ts';
import { clamp } from '../util.ts';


export function makeAgent(rng: Rng, id: number): Agent {
  const n = NATIONS.ITA!;
  const axis = () => Math.round(clamp(rng.gauss(11, 4), 1, 20));
  return { id, name: `${rng.pick(n.first)} ${rng.pick(n.last)}`, greed: axis(), honesty: axis(), reach: axis(), clientIds: [], memory: {} };
}

/**
 * dà un agente a chi non ce l'ha: alla creazione del mondo sono tutti, dopo solo i nuovi arrivati.
 * I portafogli hanno dimensioni diverse, e chi ha ancora posto si prende i nuovi prima di aprirne un altro.
 */
export function assignAgents(world: WorldState, rng: Rng) {
  const ids = rng.shuffle(Object.values(world.players).filter((p) => p.agentId === null).map((p) => p.id));
  const open = Object.values(world.agents).filter((a) => a.clientIds.length < AGENT.portfolio[1]);
  let a: Agent | null = null;
  let room = 0;
  for (const pid of ids) {
    if (!a || room <= 0) {
      a = open.pop() ?? null;
      if (a) room = AGENT.portfolio[1] - a.clientIds.length;
      else {
        a = makeAgent(rng, world.nextAgentId++);
        world.agents[a.id] = a;
        room = rng.int(AGENT.portfolio[0], AGENT.portfolio[1]);
      }
    }
    a.clientIds.push(pid);
    world.players[pid]!.agentId = a.id;
    room--;
  }
}

/** chi si ritira esce dal portafoglio: gli agenti non curano gli interessi dei pensionati */
export function dropClient(world: WorldState, p: Player) {
  const a = agentOf(world, p);
  if (a) a.clientIds = a.clientIds.filter((id) => id !== p.id);
  p.agentId = null;
}

export const agentOf = (world: WorldState, p: Player): Agent | null => (p.agentId === null ? null : world.agents[p.agentId] ?? null);

/** memoria verso un club: solo i rapporti non neutri si tengono */
export function remember(a: Agent, clubId: ClubId, delta: number) {
  const v = clamp((a.memory[clubId] ?? 0) + delta, -100, 100);
  if (Math.abs(v) < 1) delete a.memory[clubId];
  else a.memory[clubId] = Math.round(v);
}

/** commissione richiesta su un affare: più alta se è avido, molto più alta se ce l'ha con te */
export function commission(a: Agent | null, fee: number, clubId: ClubId): number {
  if (!a) return Math.round(fee * DEAL.agentCut);
  const grudge = 1 + Math.max(0, -(a.memory[clubId] ?? 0)) * AGENT.grudge;
  return Math.round(fee * DEAL.agentCut * (AGENT.greedCut + a.greed / 20) * grudge);
}

/** stipendio chiesto per rinnovare: sopra quello coerente col valore, tanto più quanto è avido */
export function renewalWage(a: Agent | null, p: Player, season: number, clubRep: number): number {
  const fair = value(p, season, { clubRep }) * MARKET.wageOfValue;
  const greed = a ? AGENT.renewAsk + Math.max(0, a.greed - 10) * AGENT.renewGreed : AGENT.renewAsk;
  return Math.max(MARKET.wageMin, Math.round((fair * greed) / 10000) * 10000);
}

/** gli assistiti che l'agente porterebbe volentieri a questo club: scontenti, in scadenza, o fuori rosa */
export function proposals(world: WorldState, a: Agent, clubId: ClubId): Player[] {
  if ((a.memory[clubId] ?? 0) <= AGENT.threatFrom) return []; // con chi non stima non lavora
  const out: Player[] = [];
  for (const id of a.clientIds) {
    const p = world.players[id];
    if (!p || p.clubId === null || p.clubId === clubId) continue;
    const stuck = p.psych.wantsOut || p.contract.until <= world.season + AGENT.renewFrom
      || world.clubs[p.clubId]!.excluded.includes(p.id) || p.psych.minutes < 0.25;
    if (stuck) out.push(p);
  }
  return out.sort((x, y) => y.ca - x.ca);
}

export type AgentMove =
  | { kind: 'renew'; agent: Agent; player: Player; wage: number }
  | { kind: 'propose'; agent: Agent; player: Player; to: ClubId }
  | { kind: 'push'; agent: Agent; player: Player };

/**
 * la settimana degli agenti: la memoria si stempera, chi ha un assistito in scadenza chiede il rinnovo,
 * chi ne ha uno scontento in un club che non stima spinge per l'uscita, e ogni tanto ne propone uno in giro.
 */
export function weekAgents(world: WorldState, rng: Rng): AgentMove[] {
  const moves: AgentMove[] = [];
  for (const a of Object.values(world.agents)) {
    for (const [k, v] of Object.entries(a.memory)) {
      const next = v > 0 ? v - AGENT.memoryDrift : v + AGENT.memoryDrift;
      if (Math.abs(next) < 1) delete a.memory[Number(k)];
      else a.memory[Number(k)] = Math.round(next);
    }
    for (const id of a.clientIds) {
      const p = world.players[id];
      if (!p || p.clubId === null) continue;
      const club = world.clubs[p.clubId]!;
      const mem = a.memory[club.id] ?? 0;
      if (p.contract.until <= world.season + AGENT.renewFrom && rng.next() < 0.2)
        moves.push({ kind: 'renew', agent: a, player: p, wage: renewalWage(a, p, world.season, club.reputation) });
      else if (mem <= AGENT.threatFrom && p.psych.morale < AGENT.threatMorale && rng.next() < AGENT.threatP) {
        p.psych.wantsOut = true;
        moves.push({ kind: 'push', agent: a, player: p });
      }
    }
    if (rng.next() < AGENT.proposeP * (a.reach / 11)) {
      const clubIds = Object.keys(world.clubs).map(Number);
      const to = clubIds[rng.int(0, clubIds.length - 1)]!;
      const who = proposals(world, a, to)[0];
      if (who) moves.push({ kind: 'propose', agent: a, player: who, to });
    }
  }
  return moves;
}
