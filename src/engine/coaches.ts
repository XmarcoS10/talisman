// Allenatori dei club IA (0.5.0, scelta di Marco: contano in campo). Ogni club dell'IA ha un allenatore con uno stile
// che decide istruzioni di squadra, spinta sulla mentalità e modulo preferito; chi va male viene esonerato a metà
// stagione e arriva qualcuno dal gruppo dei senza panchina. Le scelte degli allenatori pescano da un Rng proprio
// (lezione 1: non spostano il caso del mondo).
import { COACH } from './balance.ts';
import { fairPosition } from './board/board.ts';
import { bestFormation, pickXI, xiStrength } from './match.ts';
import { oopRolesFor } from './match/roles.ts';
import { defaultRoles, FORMATIONS, phaseMap } from './match/tactics.ts';
import { COACH_STYLES, FORMATION_IDS, type Club, type Coach, type WorldState } from './model.ts';
import { NATIONS } from './names.ts';
import { addNews } from './news.ts';
import { pickNation } from './players.ts';
import { Rng } from './rng.ts';
import { clamp } from './util.ts';

/** il generatore degli allenatori: derivato da valori stabili, mai da world.rng */
const coachRng = (world: WorldState, salt: number) => new Rng((world.seed * 31 + world.season * 1009 + world.day * 7919 + salt * 104729) >>> 0);

export const coachOf = (world: WorldState, clubId: number): Coach | undefined =>
  Object.values(world.coaches).find((c) => c.clubId === clubId);

function makeCoach(world: WorldState, rng: Rng, reputation: number): Coach {
  const nation = pickNation(rng, COACH.italian);
  const names = NATIONS[nation]!;
  const c: Coach = {
    id: world.nextCoachId++, firstName: rng.pick(names.first), lastName: rng.pick(names.last), nation,
    birthYear: world.season - rng.int(COACH.age[0], COACH.age[1]), reputation: Math.round(clamp(reputation, 1, 100)),
    style: rng.pick(COACH_STYLES), formation: rng.pick(FORMATION_IDS), clubId: null, since: world.season, sinceDay: 0, career: [],
  };
  world.coaches[c.id] = c;
  return c;
}

/** istruzioni, mentalità e modulo del club secondo il suo allenatore */
export function coachTactics(world: WorldState, club: Club) {
  const coach = coachOf(world, club.id);
  const best = bestFormation(world, club);
  let formation = best;
  if (coach && coach.formation !== best) {
    const gap = xiStrength(pickXI(world, club, best)) - xiStrength(pickXI(world, club, coach.formation));
    if (gap <= COACH.formationSlack) formation = coach.formation;
  }
  const style = coach?.style ?? 'balanced';
  const s = COACH.styles[style];
  // modulo e ruoli senza palla dello stile (FM26)
  const out = COACH.outShape[style]?.[formation] ?? formation, want = COACH.outRoles[style];
  const map = phaseMap(formation, out);
  const rolesOut = want && FORMATIONS[formation].map((_, i) => {
    const pos = FORMATIONS[out][map[i]!]!.pos, r = want[pos];
    return r && oopRolesFor(pos).includes(r) ? r : null;
  });
  Object.assign(club.tactic, { formation, roles: defaultRoles(formation), mentality: 3 + s.mentality, pressing: s.pressing, tempo: s.tempo,
    width: s.width, line: s.line, directness: s.directness, counterPress: s.counterPress,
    formationOut: out === formation ? undefined : out, rolesOut });
}

/** chi prende una panchina: il senza panchina col blasone più adatto al club */
function hire(world: WorldState, rng: Rng, club: Club): Coach {
  const free = Object.values(world.coaches).filter((c) => c.clubId === null);
  let best = free[0], bestS = -Infinity;
  for (const c of free) {
    const s = -Math.abs(c.reputation - club.reputation) + c.reputation * 0.3 + rng.next() * 6;
    if (s > bestS) { best = c; bestS = s; }
  }
  const coach = best ?? makeCoach(world, rng, club.reputation - 10);
  coach.clubId = club.id;
  coach.since = world.season;
  coach.sinceDay = world.day;
  coachTactics(world, club);
  return coach;
}

/** mondo nuovo e carriere di prima della 0.5.0: ogni club dell'IA riceve il suo allenatore, più un gruppo di liberi */
export function ensureCoaches(world: WorldState) {
  // sulla panchina dell'utente c'è l'utente: chi c'era torna libero
  const mine = coachOf(world, world.manager.clubId);
  if (mine) mine.clubId = null;
  const rng = coachRng(world, 1);
  const busy = new Set(Object.values(world.coaches).map((c) => c.clubId));
  const clubs = Object.values(world.clubs).filter((c) => c.id !== world.manager.clubId && !busy.has(c.id));
  if (!clubs.length && Object.keys(world.coaches).length) return;
  for (const club of clubs) {
    const coach = makeCoach(world, rng, club.reputation + rng.gauss(0, 8));
    coach.clubId = club.id;
    coach.since = world.season - rng.int(0, 3);
    coachTactics(world, club);
  }
  while (Object.values(world.coaches).filter((c) => c.clubId === null).length < COACH.pool) makeCoach(world, rng, rng.int(25, 75));
}

/** ogni settimana: chi è troppo sotto il suo blasone rischia l'esonero (serie A e B, dove si gioca davvero) */
export function weekCoaches(world: WorldState, table: (club: Club) => { pos: number; played: number }) {
  let rng: Rng | null = null;
  for (const club of Object.values(world.clubs)) {
    if (club.id === world.manager.clubId || (world.competitions[club.compId]?.level ?? 3) > 2) continue;
    const { pos, played } = table(club);
    const gap = pos - fairPosition(world, club);
    if (played < COACH.sackFrom || gap < COACH.sackGap) continue;
    const old = coachOf(world, club.id);
    if (old && old.since === world.season && world.day - old.sinceDay < COACH.grace) continue;
    rng ??= coachRng(world, 2);
    if (rng.next() >= COACH.sackP * (gap - COACH.sackGap + 1)) continue;
    if (old) {
      old.career.push({ season: world.season, clubId: club.id, sacked: true });
      old.clubId = null;
      old.reputation = clamp(old.reputation + COACH.sackedRep, 1, 100);
    }
    const coach = hire(world, rng, club);
    if (club.compId === world.clubs[world.manager.clubId]?.compId)
      addNews(world, 'news.coach.sacked', { club: club.name, old: old ? `${old.firstName} ${old.lastName}` : '—', coach: `${coach.firstName} ${coach.lastName}` });
  }
}

/** fine stagione: la reputazione segue il piazzamento, i più anziani smettono, arrivano i giovani */
export function seasonCoaches(world: WorldState, posOf: (club: Club) => number) {
  const rng = coachRng(world, 3);
  for (const coach of Object.values(world.coaches)) {
    const club = coach.clubId !== null ? world.clubs[coach.clubId] : undefined;
    if (club) coach.reputation = Math.round(clamp(coach.reputation + (fairPosition(world, club) - posOf(club)) * COACH.repPerPlace, 1, 100));
    if (world.season - coach.birthYear >= COACH.retireFrom) {
      delete world.coaches[coach.id];
      if (club) hire(world, rng, club);
    }
  }
  for (let i = 0; i < COACH.newPerSeason; i++) makeCoach(world, rng, rng.int(20, 55));
  // il gruppo dei liberi non cresce all'infinito: escono quelli col blasone più basso
  const free = Object.values(world.coaches).filter((c) => c.clubId === null).sort((a, b) => a.reputation - b.reputation);
  for (const c of free.slice(0, Math.max(0, free.length - COACH.pool * 2))) delete world.coaches[c.id];
}

