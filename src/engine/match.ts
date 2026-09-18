// Punto d'ingresso della partita: formazioni, disponibilità, applicazione dei risultati al mondo.
import { MATCH } from './balance.ts';
import { simulate, type TeamSetup } from './match/engine.ts';
import { validRole } from './match/roles.ts';
import { FORMATIONS, defaultRoles, type Slot } from './match/tactics.ts';
import { FORMATION_IDS, type Club, type FormationId, type Fixture, type Player, type WorldState } from './model.ts';
import { addNews } from './news.ts';
import { ratingAt } from './players.ts';
import type { Rng } from './rng.ts';

export type LineupSlot = { slot: Slot; player: Player; rating: number };

export const isAvailable = (p: Player) => p.condition.injuryDays === 0 && p.discipline.ban === 0;

/** rendimento atteso di p nello slot, stanchezza compresa */
export const slotRating = (p: Player, slot: Slot) => ratingAt(p, slot.pos) * (0.7 + (0.3 * p.condition.fitness) / 100);

/**
 * Formazione per il modulo. `fixed` = scelte dell'allenatore slot per slot (null = decidi tu):
 * le scelte disponibili si rispettano, gli altri slot li riempie il migliore rimasto (greedy, portiere prima).
 */
export function pickXI(world: WorldState, club: Club, formation: FormationId = club.tactic.formation, fixed: readonly (number | null)[] = []): LineupSlot[] {
  const pool = club.playerIds.map((id) => world.players[id]!).filter(isAvailable);
  const slots = FORMATIONS[formation];
  const chosen: (Player | undefined)[] = slots.map((_, i) => {
    const id = fixed[i];
    const p = id != null ? world.players[id] : undefined;
    return p && p.clubId === club.id && isAvailable(p) ? p : undefined;
  });
  const used = new Set(chosen.filter((p) => p).map((p) => p!.id));
  return slots.map((slot, i) => {
    let best = chosen[i];
    if (!best) {
      let bestR = -1;
      for (const p of pool) {
        if (used.has(p.id)) continue;
        const r = slotRating(p, slot);
        if (r > bestR) { best = p; bestR = r; }
      }
      if (!best) throw new Error(`${club.name}: rosa insufficiente`);
      used.add(best.id);
    }
    return { slot, player: best, rating: slotRating(best, slot) };
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

/** l'IA adatta modulo e ruoli alla rosa */
export function aiSetFormation(world: WorldState, club: Club) {
  club.tactic.formation = bestFormation(world, club);
  club.tactic.roles = defaultRoles(club.tactic.formation);
}

/** titolari del club dell'utente: le sue scelte, con chi non è disponibile sostituito dal migliore */
export function userXI(world: WorldState, club: Club): LineupSlot[] {
  const fixed = club.lineup?.length === FORMATIONS[club.tactic.formation].length ? club.lineup : [];
  const xi = pickXI(world, club, club.tactic.formation, fixed);
  xi.forEach((e, i) => {
    const wanted = fixed[i];
    if (wanted != null && wanted !== e.player.id) {
      const out = world.players[wanted];
      if (out) addNews(world, 'news.lineupChange', { out: `${out.firstName} ${out.lastName}`, in: `${e.player.firstName} ${e.player.lastName}` });
    }
  });
  return xi;
}

function setup(world: WorldState, club: Club, xi: LineupSlot[], mentality: number): TeamSetup {
  const inXI = new Set(xi.map((e) => e.player.id));
  const bench = club.playerIds.map((id) => world.players[id]!)
    .filter((p) => !inXI.has(p.id) && isAvailable(p))
    .sort((a, b) => b.ca - a.ca)
    .slice(0, MATCH.benchSize);
  return {
    club, tactic: club.tactic, mentality, bench,
    xi: xi.map((e, i) => ({ player: e.player, slot: e.slot, role: validRole(club.tactic.roles[i], e.slot.pos) })),
  };
}

/** mentalità dell'IA: prudente se più debole, propositiva se più forte (in casa conta un po') */
function aiMentality(mine: number, theirs: number, home: boolean) {
  const diff = mine - theirs + (home ? 3 : -3);
  return diff > 8 ? 4 : diff < -8 ? 2 : 3;
}

export function playMatch(world: WorldState, rng: Rng, fx: Fixture) {
  const me = world.manager.clubId;
  const clubs = [world.clubs[fx.home]!, world.clubs[fx.away]!] as const;
  const xis = clubs.map((c) => (c.id === me ? userXI(world, c) : pickXI(world, c)));
  const str = xis.map(xiStrength);
  const setups = clubs.map((c, i) => {
    const mentality = c.id === me ? c.tactic.mentality : aiMentality(str[i]!, str[1 - i]!, i === 0);
    return setup(world, c, xis[i]!, mentality);
  }) as [TeamSetup, TeamSetup];

  const { result, played } = simulate(rng, setups);
  fx.result = result;

  played.forEach((list, side) => {
    const club = clubs[side]!;
    const mine = club.id === me;
    const playedIds = new Set(list.map((m) => m.p.id));
    for (const m of list) {
      const p = m.p;
      const name = `${p.firstName} ${p.lastName}`;
      const rating = result.ratings[p.id]!;
      p.stats.apps++;
      p.stats.goals += m.st.goals;
      p.stats.assists += m.st.assists;
      p.stats.ratingSum += rating;
      p.form = [...p.form.slice(-4), rating];
      p.condition.fitness = Math.round(m.energy);
      if (m.st.injured) {
        p.condition.injuryDays = 1 + Math.round(-Math.log(1 - rng.next()) * MATCH.injuryMeanDays);
        if (mine) addNews(world, 'news.injury', { name, days: p.condition.injuryDays });
      }
      if (m.st.red) {
        p.stats.reds++;
        p.discipline.ban += m.st.yellows === 2 ? 1 : rng.int(1, 2);
        if (mine) addNews(world, 'news.ban', { name, n: p.discipline.ban });
      } else if (m.st.yellows) {
        p.stats.yellows++;
        p.discipline.yellows++;
        if (p.discipline.yellows % 5 === 0) {
          p.discipline.ban++; // diffida: 5 gialli = 1 turno
          if (mine) addNews(world, 'news.banYellows', { name });
        }
      }
    }
    // chi era squalificato ha scontato una giornata
    for (const id of club.playerIds) {
      const p = world.players[id]!;
      if (p.discipline.ban > 0 && !playedIds.has(id)) p.discipline.ban--;
    }
  });
}
