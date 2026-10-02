// Punto d'ingresso della partita: formazioni, disponibilità, applicazione dei risultati al mondo.
import { MATCH, TRAIN } from './balance.ts';
import { injure, matchInjuryP, relapseRisk } from './injuries.ts';
import { afterMatch } from './morale.ts';
import { runMatch, type SimOutput, type TeamSetup } from './match/engine.ts';
import { oopRolesFor, validRole } from './match/roles.ts';
import { FORMATIONS, defaultRoles, phaseMap, type Slot } from './match/tactics.ts';
import { FORMATION_IDS, type Club, type ClubId, type FormationId, type Fixture, type Player, type Tactic, type WorldState } from './model.ts';
import { addCause, addNews, pName } from './news.ts';
import { ratingAt } from './players.ts';
import { rivalFire } from './press/press.ts';
import { refereeFor, refFactor } from './referees.ts';
import { staffOf } from './staff.ts';
import { fullTimeTalk, viceTalk } from './talks.ts';
import { weatherFor, weatherFx } from './weather.ts';
import { clamp } from './util.ts';
import type { Rng } from './rng.ts';

export type LineupSlot = { slot: Slot; player: Player; rating: number };

export const isAvailable = (p: Player) => p.condition.injuryDays === 0 && p.discipline.ban === 0;
/** selezionabile dal proprio club: disponibile e non messo fuori rosa */
export const canPlay = (club: Club, p: Player, opponent?: ClubId) =>
  isAvailable(p) && !club.excluded.includes(p.id)
  // prestito con divieto: non lo puoi schierare contro chi possiede il cartellino (§7.5)
  && !(opponent !== undefined && p.contract.loan?.noPlayVsOwner && p.contract.loan.from === opponent);
const famOne = (club: Club, f: FormationId) => club.familiarity[f] ?? TRAIN.famOther;
/** familiarità col modulo; con la tattica a due fasi, la media fra il modulo con palla e quello senza */
export const familiarityOf = (club: Club, f: FormationId = club.tactic.formation) =>
  f === club.tactic.formation && club.tactic.formationOut && club.tactic.formationOut !== f ? (famOne(club, f) + famOne(club, club.tactic.formationOut)) / 2 : famOne(club, f);

/** rendimento atteso di p nello slot, stanchezza compresa */
export const slotRating = (p: Player, slot: Slot) => ratingAt(p, slot.pos) * (0.7 + (0.3 * p.condition.fitness) / 100);

/**
 * Formazione per il modulo. `fixed` = scelte dell'allenatore slot per slot (null = decidi tu):
 * le scelte disponibili si rispettano, gli altri slot li riempie il migliore rimasto (greedy, portiere prima).
 */
export function pickXI(world: WorldState, club: Club, formation: FormationId = club.tactic.formation, fixed: readonly (number | null)[] = [], opponent?: ClubId): LineupSlot[] {
  const pool = club.playerIds.map((id) => world.players[id]!).filter((p) => canPlay(club, p, opponent));
  const slots = FORMATIONS[formation];
  const chosen: (Player | undefined)[] = slots.map((_, i) => {
    const id = fixed[i];
    const p = id != null ? world.players[id] : undefined;
    return p && p.clubId === club.id && canPlay(club, p, opponent) ? p : undefined;
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
export function userXI(world: WorldState, club: Club, opponent?: ClubId): LineupSlot[] {
  const fixed = club.lineup?.length === FORMATIONS[club.tactic.formation].length ? club.lineup : [];
  const xi = pickXI(world, club, club.tactic.formation, fixed, opponent);
  xi.forEach((e, i) => {
    const wanted = fixed[i];
    if (wanted != null && wanted !== e.player.id) {
      const out = world.players[wanted];
      if (out) addNews(world, 'news.lineupChange', { out: `${out.firstName} ${out.lastName}`, in: `${e.player.firstName} ${e.player.lastName}` });
    }
  });
  return xi;
}

/** fase senza palla dello slot i (FM26): dove va nel modulo senza palla e con che ruolo; niente se il modulo è uno solo */
function outOf(tac: Tactic, i: number) {
  const outF = tac.formationOut;
  const oop = tac.rolesOut?.[i] ?? null;
  if ((!outF || outF === tac.formation) && !oop) return {};
  const slot = outF && outF !== tac.formation ? FORMATIONS[outF][phaseMap(tac.formation, outF)[i]!] : undefined;
  const pos = (slot ?? FORMATIONS[tac.formation][i])?.pos;
  return { out: slot && { x: slot.x, y: slot.y }, oop: oop && pos && oopRolesFor(pos).includes(oop) ? oop : null };
}

/** la squadra pronta per il motore: titolari coi loro ruoli, panchina, familiarità, rischio di infortunio */
export function teamSetup(world: WorldState, club: Club, xi: LineupSlot[], mentality: number, opponent?: ClubId): TeamSetup {
  const inXI = new Set(xi.map((e) => e.player.id));
  const bench = club.playerIds.map((id) => world.players[id]!)
    .filter((p) => !inXI.has(p.id) && canPlay(club, p, opponent))
    .sort((a, b) => b.ca - a.ca)
    .slice(0, MATCH.benchSize);
  return {
    club, tactic: club.tactic, mentality, bench, familiarity: familiarityOf(club),
    injuryP: (p) => ({ muscle: matchInjuryP(p, world.season), relapse: relapseRisk(p) }),
    xi: xi.map((e, i) => ({ player: e.player, slot: e.slot, role: validRole(club.tactic.roles[i], e.slot.pos), ...outOf(club.tactic, i) })),
  };
}

/** mentalità dell'IA: prudente se più debole, propositiva se più forte (in casa conta un po') */
export function aiMentality(mine: number, theirs: number, home: boolean) {
  const diff = mine - theirs + (home ? 3 : -3);
  return diff > 8 ? 4 : diff < -8 ? 2 : 3;
}

/** formazioni e istruzioni delle due squadre; `live` = la panchina del club dell'utente la gestisce lui (F6) */
export function matchSetups(world: WorldState, fx: Fixture, live = false): [TeamSetup, TeamSetup] {
  const me = world.manager.clubId;
  const clubs = [world.clubs[fx.home]!, world.clubs[fx.away]!] as const;
  const xis = clubs.map((c, i) => (c.id === me ? userXI(world, c, clubs[1 - i]!.id) : pickXI(world, c, c.tactic.formation, [], clubs[1 - i]!.id)));
  const str = xis.map(xiStrength);
  const ref = refFactor(refereeFor(world, fx));
  const wx = weatherFx(weatherFor(world, fx));
  return clubs.map((c, i) => {
    const mine = c.id === me;
    // l'IA: la mentalità segue il rapporto di forze, spostata dallo stile del suo allenatore (tactic.mentality − 3)
    const mentality = mine ? c.tactic.mentality : clamp(aiMentality(str[i]!, str[1 - i]!, i === 0) + c.tactic.mentality - 3, 1, 5);
    // la carica della conferenza pre-partita, per l'avversario dell'utente
    const boost = clubs[1 - i]!.id === me ? rivalFire(world, c.id, fx.day) * MATCH.rivalFireK : 0;
    return { ...teamSetup(world, c, xis[i]!, mentality, clubs[1 - i]!.id), auto: !(mine && live), ref, wx, boost };
  }) as [TeamSetup, TeamSetup];
}

/** partita non seguita dal vivo; se gioca l'utente, i discorsi (prima e alla fine) li fa il suo vice */
export function playMatch(world: WorldState, rng: Rng, fx: Fixture) {
  const run = runMatch(rng, matchSetups(world, fx));
  const me = world.manager.clubId;
  const side = fx.home === me ? 0 : fx.away === me ? 1 : -1;
  const vice = side < 0 ? undefined : staffOf(world, me, 'assistant');
  const pre = vice && viceTalk(run.teams[side as 0 | 1].on.map((m) => m.p), vice.skill, 0); // as: side ≥ 0 qui
  if (pre) run.talk(side as 0 | 1, pre);
  applyMatch(world, rng, fx, run.result());
  if (!vice || !pre) return;
  const club = world.clubs[me]!;
  const diff = (side === 0 ? 1 : -1) * (fx.result!.hg - fx.result!.ag);
  const end = viceTalk(club.playerIds.map((id) => world.players[id]!), vice.skill, diff);
  fullTimeTalk(world, club, end, diff);
  addNews(world, 'news.viceTalk', { name: vice.name, talk: `talk.${pre}`, talkEnd: `talk.${end}` });
}

/** scrive nel mondo quello che è successo in partita: statistiche, condizione, infortuni, cartellini, spogliatoio */
export function applyMatch(world: WorldState, rng: Rng, fx: Fixture, out: SimOutput) {
  const me = world.manager.clubId;
  const clubs = [world.clubs[fx.home]!, world.clubs[fx.away]!] as const;
  const { result, played } = out;
  fx.result = result;
  // testa a testa dell'utente, che sopravvive alle stagioni: serve alle storie di nemesi (§7.4)
  if (fx.home === me || fx.away === me) {
    const opp = fx.home === me ? fx.away : fx.home;
    const [mine, theirs] = fx.home === me ? [result.hg, result.ag] : [result.ag, result.hg];
    world.manager.h2h[opp] = ((world.manager.h2h[opp] ?? '') + (mine > theirs ? 'W' : mine < theirs ? 'L' : 'D')).slice(-6);
  }

  played.forEach((list, side) => {
    const club = clubs[side]!;
    const mine = club.id === me;
    const playedIds = new Set(list.map((m) => m.p.id));
    const mins = new Map(list.map((m) => [m.p.id, { mins: Math.max(1, m.st.to - m.st.from), started: m.st.from === 0 }]));
    for (const m of list) {
      const p = m.p;
      const name = pName(p);
      const rating = result.ratings[p.id]!;
      if (!fx.cup && !fx.stage) { // coppa e spareggi non entrano nelle statistiche di campionato
        p.stats.apps++;
        p.stats.goals += m.st.goals;
        p.stats.assists += m.st.assists;
        p.stats.ratingSum += rating;
      }
      p.form = [...p.form.slice(-4), rating];
      const c = p.condition;
      const share = mins.get(p.id)!.mins / 90;
      c.fitness = Math.round(m.energy);
      c.sharpness = Math.min(100, c.sharpness + TRAIN.sharpMatch * share);
      c.fatigue = Math.min(100, Math.round((c.fatigue + TRAIN.fatigueMatch * share) * 10) / 10);
      if (m.st.injured) {
        const type = injure(rng, p, m.st.injuryCtx);
        if (mine) {
          addNews(world, 'news.injury', { name, injury: type.id, days: c.injuryDays });
          addCause(world, p, 'cause.injury', { injury: type.id, days: c.injuryDays });
        }
      }
      if (m.st.red) {
        p.stats.reds++;
        p.discipline.ban += m.st.yellows === 2 ? 1 : rng.int(1, 2);
        if (mine) addNews(world, p.discipline.ban === 1 ? 'news.ban1' : 'news.ban', { name, n: p.discipline.ban });
      } else if (m.st.yellows && !fx.cup && !fx.stage) {
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
    const diff = side === 0 ? result.hg - result.ag : result.ag - result.hg;
    afterMatch(world, club, mins, diff > 0);
  });
}
