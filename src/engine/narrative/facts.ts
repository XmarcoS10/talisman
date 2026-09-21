// I fatti della settimana, calcolati una volta sola e letti da tutte le regole dello scanner.
// Si guarda il campionato dell'utente: è lì che le storie gli interessano.
import type { ClubId, Competition, Fixture, Player, PlayerId, WorldState } from '../model.ts';
import { standings, type TableRow } from '../world.ts';

export interface MatchFact {
  fx: Fixture;
  day: number;
  home: boolean;
  opp: ClubId;
  gf: number;
  ga: number;
}

export interface Facts {
  world: WorldState;
  now: number; // giorno assoluto
  me: ClubId;
  comp: Competition;
  table: TableRow[];
  pos: Map<ClubId, number>; // posizione in classifica, da 1
  round: number; // giornate giocate
  left: number; // giornate che restano
  matches: Map<ClubId, MatchFact[]>; // partite giocate, in ordine
  lastDay: number; // giorno dell'ultima giornata giocata
  players: Player[]; // giocatori delle squadre del campionato
}

export const absDay = (season: number, day: number) => season * 1000 + day;

export function facts(world: WorldState): Facts | null {
  const me = world.manager.clubId;
  const comp = world.competitions[world.clubs[me]?.compId ?? ''];
  if (!comp) return null;
  const table = standings(world, comp);
  const matches = new Map<ClubId, MatchFact[]>(comp.clubIds.map((id) => [id, []]));
  let lastDay = -1;
  for (const fx of comp.fixtures) {
    if (!fx.result) continue;
    lastDay = Math.max(lastDay, fx.day);
    matches.get(fx.home)?.push({ fx, day: fx.day, home: true, opp: fx.away, gf: fx.result.hg, ga: fx.result.ag });
    matches.get(fx.away)?.push({ fx, day: fx.day, home: false, opp: fx.home, gf: fx.result.ag, ga: fx.result.hg });
  }
  for (const list of matches.values()) list.sort((a, b) => a.day - b.day);
  const round = Math.max(0, ...[...matches.values()].map((l) => l.length));
  const total = (comp.clubIds.length - 1) * 2;
  const ids = new Set(comp.clubIds);
  return {
    world, now: absDay(world.season, world.day), me, comp, table,
    pos: new Map(table.map((r, i) => [r.clubId, i + 1])),
    round, left: total - round, matches, lastDay,
    players: Object.values(world.players).filter((p) => p.clubId !== null && ids.has(p.clubId)),
  };
}

export const won = (m: MatchFact) => m.gf > m.ga;
export const lost = (m: MatchFact) => m.gf < m.ga;

/** le ultime n partite di un club */
export const lastN = (f: Facts, club: ClubId, n: number) => (f.matches.get(club) ?? []).slice(-n);

/** serie in corso dall'ultima partita all'indietro, finché vale la condizione */
export function streak(f: Facts, club: ClubId, test: (m: MatchFact) => boolean): number {
  const list = f.matches.get(club) ?? [];
  let n = 0;
  for (let i = list.length - 1; i >= 0 && test(list[i]!); i--) n++;
  return n;
}

/** gol di un giocatore in una partita */
export const goalsIn = (fx: Fixture, pid: PlayerId) =>
  fx.result ? fx.result.events.filter((e) => (e.type === 'goal' || e.type === 'penGoal') && e.playerId === pid).length : 0;

/** le partite del suo club che un giocatore ha giocato davvero (ha un voto) */
export function playerMatches(f: Facts, p: Player): MatchFact[] {
  if (p.clubId === null) return [];
  return (f.matches.get(p.clubId) ?? []).filter((m) => m.fx.result?.ratings[p.id] !== undefined);
}

/** la partita dell'ultima giornata giocata, se il club l'ha giocata */
export const justPlayed = (f: Facts, club: ClubId) => (f.matches.get(club) ?? []).find((m) => m.day === f.lastDay) ?? null;
