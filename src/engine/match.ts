// Punto d'ingresso della partita: formazioni, disponibilità, applicazione dei risultati al mondo.
import { MATCH } from './balance.ts';
import { simulate, type TeamSetup } from './match/engine.ts';
import { FORMATIONS, type Slot } from './match/tactics.ts';
import { FORMATION_IDS, type Club, type FormationId, type Fixture, type Player, type WorldState } from './model.ts';
import { ratingAt } from './players.ts';
import type { Rng } from './rng.ts';

export type LineupSlot = { slot: Slot; player: Player; rating: number };

export const isAvailable = (p: Player) => p.condition.injuryDays === 0 && p.discipline.ban === 0;

/** formazione migliore per il modulo: greedy, portiere prima, poi ogni slot prende il migliore rimasto */
export function pickXI(world: WorldState, club: Club, formation: FormationId = club.tactic.formation): LineupSlot[] {
  const pool = club.playerIds.map((id) => world.players[id]!).filter(isAvailable);
  const used = new Set<number>();
  return FORMATIONS[formation].map((slot) => {
    let best: Player | undefined;
    let bestR = -1;
    for (const p of pool) {
      if (used.has(p.id)) continue;
      // la stanchezza pesa: chi non ha recuperato rende meno
      const r = ratingAt(p, slot.pos) * (0.7 + 0.3 * p.condition.fitness / 100);
      if (r > bestR) { best = p; bestR = r; }
    }
    if (!best) throw new Error(`${club.name}: rosa insufficiente`);
    used.add(best.id);
    return { slot, player: best, rating: bestR };
  });
}

export const xiStrength = (xi: LineupSlot[]) => xi.reduce((a, e) => a + e.rating, 0) / xi.length;

/** l'IA sceglie il modulo che valorizza meglio la rosa */
export function bestFormation(world: WorldState, club: Club): FormationId {
  let best: FormationId = '4-3-3', bestS = -1;
  for (const f of FORMATION_IDS) {
    const s = xiStrength(pickXI(world, club, f));
    if (s > bestS) { best = f; bestS = s; }
  }
  return best;
}

function setup(world: WorldState, club: Club, xi: LineupSlot[], mentality: number): TeamSetup {
  const inXI = new Set(xi.map((e) => e.player.id));
  const bench = club.playerIds.map((id) => world.players[id]!)
    .filter((p) => !inXI.has(p.id) && isAvailable(p))
    .sort((a, b) => b.ca - a.ca)
    .slice(0, MATCH.benchSize);
  return { club, tactic: club.tactic, mentality, xi: xi.map((e) => ({ player: e.player, slot: e.slot })), bench };
}

/** mentalità dell'IA: prudente se più debole, propositiva se più forte (in casa conta un po') */
function aiMentality(mine: number, theirs: number, home: boolean) {
  const diff = mine - theirs + (home ? 3 : -3);
  return diff > 8 ? 4 : diff < -8 ? 2 : 3;
}

export function playMatch(world: WorldState, rng: Rng, fx: Fixture) {
  const clubs = [world.clubs[fx.home]!, world.clubs[fx.away]!] as const;
  const xis = clubs.map((c) => pickXI(world, c));
  const str = xis.map(xiStrength);
  const setups = clubs.map((c, i) => {
    const mentality = c.id === world.manager.clubId ? c.tactic.mentality : aiMentality(str[i]!, str[1 - i]!, i === 0);
    return setup(world, c, xis[i]!, mentality);
  }) as [TeamSetup, TeamSetup];

  const { result, played } = simulate(rng, setups);
  fx.result = result;

  played.forEach((list, side) => {
    const playedIds = new Set(list.map((m) => m.p.id));
    for (const m of list) {
      const p = m.p;
      const rating = result.ratings[p.id]!;
      p.stats.apps++;
      p.stats.goals += m.st.goals;
      p.stats.assists += m.st.assists;
      p.stats.ratingSum += rating;
      p.form = [...p.form.slice(-4), rating];
      p.condition.fitness = Math.round(m.energy);
      if (m.st.injured) p.condition.injuryDays = 1 + Math.round(-Math.log(1 - rng.next()) * MATCH.injuryMeanDays);
      if (m.st.red) {
        p.stats.reds++;
        p.discipline.ban += m.st.yellows === 2 ? 1 : rng.int(1, 2);
      } else if (m.st.yellows) {
        p.stats.yellows++;
        p.discipline.yellows++;
        if (p.discipline.yellows % 5 === 0) p.discipline.ban++; // diffida: 5 gialli = 1 turno
      }
    }
    // chi era squalificato ha scontato una giornata
    for (const id of clubs[side]!.playerIds) {
      const p = world.players[id]!;
      if (p.discipline.ban > 0 && !playedIds.has(id)) p.discipline.ban--;
    }
  });
}
