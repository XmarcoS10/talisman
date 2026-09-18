// Partita L0 (GUIDA §6.1): risultato da forze relative con Poisson.
// Il motore a zone L2 (F3) sostituirà playMatch mantenendo la stessa firma.
import { ASSIST_W, ATTACK_W, BALANCE, DEFAULT_FORMATION, DEFENCE_W, SCORER_W } from './balance.ts';
import type { Club, Fixture, MatchEvent, Player, Position, WorldState } from './model.ts';
import { ratingAt } from './players.ts';
import type { Rng } from './rng.ts';

export type LineupSlot = { pos: Position; player: Player; rating: number };

/** formazione migliore per il modulo: greedy, portiere prima, poi ogni slot prende il migliore rimasto */
export function pickXI(world: WorldState, club: Club, formation = DEFAULT_FORMATION): LineupSlot[] {
  const pool = club.playerIds.map((id) => world.players[id]!);
  const used = new Set<number>();
  return formation.map((pos) => {
    let best: Player | undefined;
    let bestR = -1;
    for (const p of pool) {
      if (used.has(p.id)) continue;
      const r = ratingAt(p, pos);
      if (r > bestR) [best, bestR] = [p, r];
    }
    if (!best) throw new Error(`${club.name}: rosa insufficiente`);
    used.add(best.id);
    return { pos, player: best, rating: bestR };
  });
}

function weightedMean(xi: LineupSlot[], w: Partial<Record<Position, number>>) {
  let s = 0;
  let tot = 0;
  for (const e of xi) {
    const k = w[e.pos] ?? 0;
    s += e.rating * k;
    tot += k;
  }
  return s / tot;
}

export function teamStrength(xi: LineupSlot[]) {
  return { attack: weightedMean(xi, ATTACK_W), defence: weightedMean(xi, DEFENCE_W) };
}

function scorers(rng: Rng, xi: LineupSlot[], goals: number, side: 0 | 1): MatchEvent[] {
  const sw = xi.map((e) => SCORER_W[e.pos] * e.player.attrs.finishing);
  const aw = xi.map((e) => ASSIST_W[e.pos] * e.player.attrs.passing);
  const events: MatchEvent[] = [];
  for (let g = 0; g < goals; g++) {
    const si = rng.weighted(sw);
    const ev: MatchEvent = { min: rng.int(1, 90), side, type: 'goal', playerId: xi[si]!.player.id };
    if (rng.next() < BALANCE.assistChance) {
      const ai = rng.weighted(aw.map((w, i) => (i === si ? 0 : w)));
      ev.assistId = xi[ai]!.player.id;
    }
    events.push(ev);
  }
  return events;
}

export function playMatch(world: WorldState, rng: Rng, fx: Fixture) {
  const xi = [pickXI(world, world.clubs[fx.home]!), pickXI(world, world.clubs[fx.away]!)] as const;
  const [h, a] = xi.map(teamStrength) as [ReturnType<typeof teamStrength>, ReturnType<typeof teamStrength>];
  const lambda = (att: number, def: number, adv: number) =>
    BALANCE.goalBase * adv * Math.exp(BALANCE.strengthK * (att - def) + rng.gauss(0, BALANCE.formSigma));
  const hg = rng.poisson(lambda(h.attack, a.defence, BALANCE.homeAdv));
  const ag = rng.poisson(lambda(a.attack, h.defence, BALANCE.awayAdv));
  const events = [...scorers(rng, xi[0], hg, 0), ...scorers(rng, xi[1], ag, 1)].sort((x, y) => x.min - y.min);

  for (const side of xi) for (const e of side) e.player.stats.apps++;
  for (const ev of events) {
    world.players[ev.playerId]!.stats.goals++;
    if (ev.assistId !== undefined) world.players[ev.assistId]!.stats.assists++;
  }
  fx.result = { hg, ag, events };
}
