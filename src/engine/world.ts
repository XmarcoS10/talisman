// Mondo: generazione, calendario, avanzamento, classifiche, cambio stagione.
import { BALANCE, MATCH, SQUAD_TEMPLATE, TRAIN } from './balance.ts';
import { heal } from './injuries.ts';
import { aiSetFormation, playMatch } from './match.ts';
import { defaultTactic } from './match/tactics.ts';
import type { Club, ClubId, Competition, Fixture, Player, Position, WorldState } from './model.ts';
import { CITIES, CLUB_PREFIX, KIT_COLORS, NATIONS } from './names.ts';
import { seedMinutes, weekPsych } from './morale.ts';
import { age, emptyStats, makePlayer } from './players.ts';
import { Rng } from './rng.ts';
import { SCHEMA_VERSION } from './save.ts';
import { dropRelations, initRelations } from './social.ts';
import { defaultTraining, trainWeek } from './training.ts';

export const DAYS_BETWEEN_ROUNDS = 7;

const LEAGUES = [
  { id: 'ITA1', name: 'Serie A', level: 1, promote: 0, relegate: 3, rep: [55, 90] },
  { id: 'ITA2', name: 'Serie B', level: 2, promote: 3, relegate: 0, rep: [30, 58] },
] as const;

function addPlayer(world: WorldState, rng: Rng, club: Club, pos: Position, ageRange?: [number, number]): Player {
  const p = makePlayer(rng, world.nextPlayerId++, pos, BALANCE.caFromReputation(club.reputation), world.season, ageRange);
  p.clubId = club.id;
  world.players[p.id] = p;
  club.playerIds.push(p.id);
  return p;
}

export function newWorld(seed: number, season = 2026): WorldState {
  const rng = new Rng(seed);
  const world: WorldState = {
    schemaVersion: SCHEMA_VERSION, seed, rng: rng.s, season, day: 0,
    manager: { name: '', clubId: 0, kept: 0, broken: 0 }, players: {}, clubs: {}, competitions: {}, history: [], news: [],
    causal: [], promises: [], nextPlayerId: 1,
  };
  const cities = [...CITIES];
  let clubId = 0;
  for (const lg of LEAGUES) {
    const comp: Competition = { id: lg.id, name: lg.name, level: lg.level, clubIds: [], fixtures: [], promote: lg.promote, relegate: lg.relegate };
    for (let i = 0; i < 20; i++) {
      const city = cities.splice(rng.int(0, cities.length - 1), 1)[0]!;
      const rep = Math.round(lg.rep[1] - (i / 19) * (lg.rep[1] - lg.rep[0]) + rng.gauss(0, 3));
      const [c1, c2, c3] = rng.shuffle(KIT_COLORS);
      const club: Club = {
        id: clubId++, name: `${rng.pick(CLUB_PREFIX)} ${city}`, shortName: city.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase(), city,
        colors: [c1!, c2!, c3!], crest: null, founded: rng.int(1890, 1960), reputation: rep,
        stadium: { name: `Stadio ${rng.pick(NATIONS.ITA!.last)}`, capacity: Math.round((5000 + rep * rep * 7) / 500) * 500 },
        balance: Math.round((rep * rep * 9000) / 100000) * 100000, compId: comp.id, playerIds: [],
        tactic: defaultTactic(), training: defaultTraining(), familiarity: {}, excluded: [], feuds: [],
      };
      for (const [pos, n] of Object.entries(SQUAD_TEMPLATE) as [Position, number][])
        for (let k = 0; k < n; k++) addPlayer(world, rng, club, pos);
      world.clubs[club.id] = club;
      comp.clubIds.push(club.id);
    }
    world.competitions[comp.id] = comp;
  }
  scheduleSeason(world, rng);
  for (const club of Object.values(world.clubs)) {
    club.familiarity = { [club.tactic.formation]: TRAIN.famStart };
    initRelations(world, club, rng);
    seedMinutes(world, club);
  }
  world.rng = rng.s;
  return world;
}

/** girone all'italiana, metodo del cerchio: ogni coppia si incontra due volte a campi invertiti */
export function roundRobin(clubIds: ClubId[], rng: Rng): Fixture[] {
  const ids = rng.shuffle(clubIds);
  const n = ids.length;
  const firstLeg: [ClubId, ClubId][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const round: [ClubId, ClubId][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = ids[i]!;
      const b = ids[n - 1 - i]!;
      round.push(r % 2 ? [b, a] : [a, b]);
    }
    firstLeg.push(round);
    ids.splice(1, 0, ids.pop()!);
  }
  const rounds = [...firstLeg, ...firstLeg.map((r) => r.map(([a, b]) => [b, a] as [ClubId, ClubId]))];
  return rounds.flatMap((round, r) => round.map(([home, away]) => ({ day: r * DAYS_BETWEEN_ROUNDS, home, away })));
}

function scheduleSeason(world: WorldState, rng: Rng) {
  world.day = 0;
  for (const comp of Object.values(world.competitions)) comp.fixtures = roundRobin(comp.clubIds, rng);
  // l'IA riadatta il modulo alla rosa ogni estate (il club dell'utente lo sceglie l'utente)
  for (const club of Object.values(world.clubs))
    if (club.id !== world.manager.clubId || world.history.length === 0) aiSetFormation(world, club);
}

/**
 * giorni che passano: `weeks` settimane di allenamento e spogliatoio, poi recupero fisico (più lento se l'affaticamento
 * stagionale è alto) e guarigioni
 */
function passDays(world: WorldState, rng: Rng, days: number, weeks: number) {
  for (let w = 0; w < weeks; w++)
    for (const club of Object.values(world.clubs)) {
      trainWeek(world, club, rng);
      weekPsych(world, club, rng);
    }
  if (days <= 0) return;
  for (const p of Object.values(world.players)) {
    const rec = days * MATCH.fitnessRecoveryPerDay * (1 - p.condition.fatigue / 200);
    p.condition.fitness = Math.round(Math.min(100, p.condition.fitness + rec));
    heal(p, days);
  }
}

export function nextMatchDay(world: WorldState): number | null {
  let min: number | null = null;
  for (const comp of Object.values(world.competitions))
    for (const fx of comp.fixtures) if (!fx.result && fx.day >= world.day && (min === null || fx.day < min)) min = fx.day;
  return min;
}

export function isSeasonOver(world: WorldState) {
  return nextMatchDay(world) === null;
}

/**
 * Gioca il prossimo turno di tutte le competizioni e porta il calendario al giorno della partita successiva,
 * così forma fisica e infortuni che l'utente vede sono quelli che conteranno. Restituisce le partite giocate.
 */
export function advance(world: WorldState): Fixture[] {
  const day = nextMatchDay(world);
  if (day === null) return [];
  const rng = new Rng(world.rng);
  passDays(world, rng, day - world.day, 0);
  world.day = day;
  const played: Fixture[] = [];
  for (const comp of Object.values(world.competitions))
    for (const fx of comp.fixtures)
      if (fx.day === day) {
        playMatch(world, rng, fx);
        played.push(fx);
      }
  // ogni 4 giornate un punto nel grafico di crescita
  if ((day / DAYS_BETWEEN_ROUNDS) % 4 === 0) for (const p of Object.values(world.players)) p.caLog.push(p.ca);
  const next = nextMatchDay(world);
  passDays(world, rng, (next ?? day + 1) - day, next === null ? 0 : 1);
  world.day = next ?? day + 1;
  world.rng = rng.s;
  return played;
}

export type TableRow = { clubId: ClubId; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number };

/** classifica derivata dai risultati (non salvata) */
export function standings(world: WorldState, comp: Competition): TableRow[] {
  const rows = new Map<ClubId, TableRow>(comp.clubIds.map((id) => [id, { clubId: id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }]));
  for (const fx of comp.fixtures) {
    if (!fx.result) continue;
    const h = rows.get(fx.home)!;
    const a = rows.get(fx.away)!;
    const { hg, ag } = fx.result;
    h.p++; a.p++;
    h.gf += hg; h.ga += ag; a.gf += ag; a.ga += hg;
    if (hg > ag) { h.w++; a.l++; h.pts += 3; }
    else if (hg < ag) { a.w++; h.l++; a.pts += 3; }
    else { h.d++; a.d++; h.pts++; a.pts++; }
  }
  return [...rows.values()].sort(
    (x, y) => y.pts - x.pts || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf || world.clubs[x.clubId]!.name.localeCompare(world.clubs[y.clubId]!.name),
  );
}

export function topScorers(world: WorldState, comp: Competition, n = 10): Player[] {
  const ids = new Set(comp.clubIds);
  return Object.values(world.players)
    .filter((p) => p.clubId !== null && ids.has(p.clubId) && p.stats.goals > 0)
    .sort((a, b) => b.stats.goals - a.stats.goals || b.stats.assists - a.stats.assists)
    .slice(0, n);
}

export type SeasonSummary = { season: number; champions: Record<string, ClubId>; promoted: ClubId[]; relegated: ClubId[]; retired: number };

/** fine stagione: albo d'oro, promozioni/retrocessioni, sviluppo, ritiri, vivaio, nuovo calendario */
export function endSeason(world: WorldState): SeasonSummary {
  const rng = new Rng(world.rng);
  const comps = Object.values(world.competitions).sort((a, b) => a.level - b.level);
  const summary: SeasonSummary = { season: world.season, champions: {}, promoted: [], relegated: [], retired: 0 };

  const tables = comps.map((c) => standings(world, c));
  comps.forEach((comp, i) => {
    const table = tables[i]!;
    const top = topScorers(world, comp, 1)[0];
    summary.champions[comp.id] = table[0]!.clubId;
    world.history.push({ season: world.season, compId: comp.id, championId: table[0]!.clubId, topScorer: top ? { playerId: top.id, goals: top.stats.goals } : null });
  });
  // scambi tra divisioni adiacenti
  for (let i = 0; i < comps.length - 1; i++) {
    const upper = comps[i]!;
    const lower = comps[i + 1]!;
    const down = tables[i]!.slice(-upper.relegate).map((r) => r.clubId);
    const up = tables[i + 1]!.slice(0, lower.promote).map((r) => r.clubId);
    upper.clubIds = upper.clubIds.filter((id) => !down.includes(id)).concat(up);
    lower.clubIds = lower.clubIds.filter((id) => !up.includes(id)).concat(down);
    for (const id of up) world.clubs[id]!.compId = upper.id;
    for (const id of down) world.clubs[id]!.compId = lower.id;
    summary.promoted.push(...up);
    summary.relegated.push(...down);
  }

  for (const p of Object.values(world.players)) {
    if (p.clubId === null) continue;
    p.history.push({ season: world.season, clubId: p.clubId, apps: p.stats.apps, goals: p.stats.goals, ca: p.ca });
    p.stats = emptyStats();
    p.discipline.yellows = 0;
    p.caLog = [p.ca];
    p.condition.fatigue = Math.round(p.condition.fatigue * 0.3); // vacanze
  }
  world.season++;

  for (const club of Object.values(world.clubs)) {
    // ritiri
    club.playerIds = club.playerIds.filter((id) => {
      const p = world.players[id]!;
      const a = age(p, world.season);
      const retire = a >= BALANCE.retireFrom && rng.next() < (a - BALANCE.retireFrom + 1) * 0.25;
      if (retire) {
        dropRelations(world, p);
        delete world.players[id];
        summary.retired++;
      }
      return !retire;
    });
    // ponytail: rinnovo automatico di tutti i contratti finché non c'è il mercato (F7)
    for (const id of club.playerIds) {
      const p = world.players[id]!;
      if (p.contract.until < world.season) p.contract.until = world.season + rng.int(1, 3);
    }
    // vivaio: riempie i ruoli scoperti con ragazzi di 16-18 anni (stub dello youth intake §7.8)
    club.excluded = club.excluded.filter((id) => club.playerIds.includes(id));
    const youth: Player[] = [];
    for (const [pos, n] of Object.entries(SQUAD_TEMPLATE) as [Position, number][]) {
      let have = club.playerIds.filter((id) => world.players[id]!.position === pos).length;
      while (have++ < n) youth.push(addPlayer(world, rng, club, pos, [16, 18]));
    }
    initRelations(world, club, rng, youth);
  }
  world.promises = world.promises.filter((pr) => world.players[pr.playerId]);

  passDays(world, rng, 90, 13); // pausa estiva e preparazione
  scheduleSeason(world, rng);
  for (const p of Object.values(world.players)) p.condition.sharpness = TRAIN.sharpPreseason; // amichevoli estive
  world.rng = rng.s;
  return summary;
}
