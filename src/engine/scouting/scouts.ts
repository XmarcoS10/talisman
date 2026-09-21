// Osservatori e analisti (GUIDA §7.6): incarichi, crescita della conoscenza, rete di contatti, rapporti.
import { SCOUT } from '../balance.ts';
import type { Club, Player, Scout, ScoutTask, WorldState } from '../model.ts';
import { NATIONS } from '../names.ts';
import { addNews } from '../news.ts';
import type { Rng } from '../rng.ts';
import { knowledge, range } from './fog.ts';
import { clamp } from '../util.ts';


export function makeScout(rng: Rng, id: number, clubId: number | null): Scout {
  const nation = rng.pick(Object.keys(NATIONS));
  const names = NATIONS[nation]!;
  const judge = () => Math.round(clamp(rng.gauss(11, 4), 1, 20));
  const judgeAbility = judge(), judgePotential = judge();
  // la rete di contatti è forte in casa propria e rada altrove: è il senso della copertura geografica
  const contacts: Record<string, number> = {};
  for (const n of Object.keys(NATIONS)) contacts[n] = Math.round(clamp(rng.gauss(n === nation ? 70 : 18, 15), 0, 100));
  return {
    id, name: `${rng.pick(names.first)} ${rng.pick(names.last)}`, nation, clubId,
    judgeAbility, judgePotential,
    bias: Math.round((rng.gauss(0, 0.45) + (11 - (judgeAbility + judgePotential) / 2) * 0.02) * 100) / 100,
    contacts,
    wage: SCOUT.wageBase + (judgeAbility + judgePotential) * SCOUT.wagePerJudge,
    assignment: null,
    analyst: rng.next() < 0.25,
  };
}

/** osservatori per tutti i club, più un mercato di liberi da assumere */
export function makeScouts(world: WorldState, rng: Rng) {
  for (const club of Object.values(world.clubs)) {
    while (club.scoutIds.length < SCOUT.perClub) {
      const s = makeScout(rng, world.nextScoutId++, club.id);
      world.scouts[s.id] = s;
      club.scoutIds.push(s.id);
    }
  }
  for (let i = 0; i < SCOUT.freePool; i++) {
    const s = makeScout(rng, world.nextScoutId++, null);
    world.scouts[s.id] = s;
  }
}

export const scoutsOf = (world: WorldState, club: Club) => club.scoutIds.map((id) => world.scouts[id]!).filter(Boolean);

export function assign(world: WorldState, scoutId: number, task: ScoutTask | null) {
  const s = world.scouts[scoutId];
  if (s) s.assignment = task;
}

export function hire(world: WorldState, club: Club, scoutId: number): boolean {
  const s = world.scouts[scoutId];
  if (!s || s.clubId !== null) return false;
  // lo staff dell'utente ha i posti che la società concede
  if (club.id === world.manager.clubId && club.scoutIds.length >= world.manager.board.scoutSlots) return false;
  s.clubId = club.id;
  club.scoutIds.push(s.id);
  return true;
}

export function fire(world: WorldState, club: Club, scoutId: number) {
  const s = world.scouts[scoutId];
  if (!s || s.clubId !== club.id) return;
  s.clubId = null;
  s.assignment = null;
  club.scoutIds = club.scoutIds.filter((id) => id !== scoutId);
}

/** i giocatori che ricadono sotto un incarico, i più forti per primi */
export function watched(world: WorldState, s: Scout): Player[] {
  const t = s.assignment;
  if (!t) return [];
  const all = Object.values(world.players).filter((p) => p.clubId !== world.manager.clubId);
  const pick = t.kind === 'nation' ? all.filter((p) => p.nation === t.nation)
    : t.kind === 'club' ? all.filter((p) => p.clubId === t.clubId)
    : all.filter((p) => p.id === t.playerId);
  return pick.sort((a, b) => b.ca - a.ca).slice(0, s.analyst ? SCOUT.analystWatch : SCOUT.watchPerWeek);
}

/** quanto cresce la conoscenza in una settimana di lavoro su un giocatore */
export function gain(s: Scout, p: Player): number {
  const judge = (s.judgeAbility + s.judgePotential) / 2;
  const net = s.contacts[p.nation] ?? 0;
  const base = s.analyst ? SCOUT.analystGain : SCOUT.weekGain;
  return base * (1 + (judge - 11) * SCOUT.judgeGain) * (1 + net * SCOUT.contactGain);
}

/**
 * la settimana degli osservatori del club dell'utente: solo lui ha una nebbia da diradare,
 * l'IA lavora sui valori veri (e non le serve raccontarlo).
 */
export function weekScouting(world: WorldState, rng: Rng) {
  const club = world.clubs[world.manager.clubId];
  if (!club) return;
  for (const s of scoutsOf(world, club)) {
    for (const p of watched(world, s)) {
      const before = knowledge(world, p);
      const k = world.known[p.id] ?? { k: before, by: null, reports: [] };
      k.k = Math.min(100, Math.max(k.k, before) + gain(s, p));
      k.by = s.id;
      world.known[p.id] = k;
      // rapporto quando ne sa abbastanza, e poi ogni tanto: quello che scrive è la sua stima, non la verità
      const step = Math.floor((k.k - SCOUT.reportAt) / SCOUT.reportEvery);
      const prev = Math.floor((before - SCOUT.reportAt) / SCOUT.reportEvery);
      if (k.k >= SCOUT.reportAt && step > prev) report(world, s, p, rng);
    }
  }
}

/** un rapporto: giudizio a parole più i due intervalli stimati */
export function report(world: WorldState, s: Scout, p: Player, rng: Rng) {
  const ca = range(world, p, 'ca');
  const pa = range(world, p, 'pa');
  const mid = (pa[0] + pa[1]) / 2;
  const level = mid > 160 ? 'top' : mid > 135 ? 'good' : mid > 110 ? 'useful' : 'no';
  const verdict = `scout.verdict.${level}${rng.next() < 0.5 ? 'A' : 'B'}`;
  const k = world.known[p.id]!;
  k.reports.push({ season: world.season, day: world.day, scoutId: s.id, verdict, ca, pa });
  if (k.reports.length > 6) k.reports.shift();
  addNews(world, 'news.scoutReport', { scout: s.name, name: `${p.firstName} ${p.lastName}` });
}
