// Allenamento settimanale (GUIDA §7.1-7.2): carico, condizione, infortuni, sviluppo, mentori, familiarità col modulo.
import { DEV, STYLE, TRAIN } from './balance.ts';
import { developPlayer, type DevContext } from './development.ts';
import { injure, injuryRisk, relapseRisk } from './injuries.ts';
import { FORMATION_IDS, type Club, type Player, type TrainingCat, type WorldState } from './model.ts';
import { addCause, addNews, pName } from './news.ts';
import { age } from './players.ts';
import type { Rng } from './rng.ts';
import { bond } from './social.ts';

// settimana tipo (mattina/pomeriggio × 6 giorni, la partita è il 7°)
export const PRESETS: Record<string, TrainingCat[]> = {
  balanced: ['recovery', 'rest', 'physical', 'technical', 'tactical', 'technical', 'physical', 'match', 'tactical', 'setPieces', 'tactical', 'rest'],
  physical: ['recovery', 'rest', 'physical', 'physical', 'physical', 'technical', 'physical', 'match', 'tactical', 'setPieces', 'physical', 'rest'],
  technical: ['recovery', 'rest', 'technical', 'technical', 'technical', 'match', 'technical', 'tactical', 'technical', 'setPieces', 'tactical', 'rest'],
  tactical: ['recovery', 'rest', 'tactical', 'tactical', 'physical', 'tactical', 'technical', 'match', 'tactical', 'setPieces', 'tactical', 'rest'],
  light: ['recovery', 'rest', 'recovery', 'technical', 'tactical', 'rest', 'match', 'recovery', 'tactical', 'setPieces', 'rest', 'rest'],
  intense: ['physical', 'technical', 'match', 'physical', 'technical', 'physical', 'match', 'tactical', 'physical', 'technical', 'tactical', 'setPieces'],
};
export const defaultTraining = (): TrainingCat[] => [...PRESETS.balanced!];

const count = (plan: TrainingCat[], c: TrainingCat) => plan.filter((x) => x === c).length;

/** carico settimanale (unità: una seduta fisica = 1) */
export const planLoad = (plan: TrainingCat[]) => plan.reduce((s, c) => s + TRAIN.load[c], 0);

/** quanto ogni area viene allenata rispetto a una settimana equilibrata (≈1) */
export function planFocus(plan: TrainingCat[]): DevContext['focus'] {
  const sh = (c: TrainingCat) => count(plan, c) / plan.length;
  const m = sh('match');
  return {
    technical: 0.4 + 3 * sh('technical') + m,
    physical: 0.4 + 3 * sh('physical') + m,
    mental: 0.4 + 3 * sh('tactical') + m,
    goalkeeping: 0.4 + 3 * sh('technical') + m,
    setPieces: 0.4 + 6 * sh('setPieces'),
  };
}

/** probabilità di infortunarsi in allenamento questa settimana (mostrata come "a rischio") */
export function trainingInjuryP(p: Player, plan: TrainingCat[], season: number): number {
  const load = Math.max(0.5, planLoad(plan));
  return TRAIN.injuryBase * (load / TRAIN.loadRef) ** TRAIN.loadExp * injuryRisk(p, season) + relapseRisk(p) * 0.3;
}

/** il mentore vale solo se è un veterano del club e l'allievo è giovane */
export function validMentor(world: WorldState, p: Player): Player | null {
  const m = p.mentorId !== null ? world.players[p.mentorId] : undefined;
  if (!m || m.clubId !== p.clubId || age(m, world.season) < DEV.mentorMinAge || age(p, world.season) > DEV.menteeMaxAge) return null;
  return m;
}

export function trainWeek(world: WorldState, club: Club, rng: Rng) {
  const me = club.id === world.manager.clubId;
  const plan = club.training;
  const load = planLoad(plan);
  const focus = planFocus(plan);
  const restSlots = count(plan, 'recovery') + count(plan, 'rest');
  for (const id of club.playerIds) {
    const p = world.players[id]!;
    const c = p.condition;
    const injured = c.injuryDays > 0;
    const trains = !injured && !club.excluded.includes(id) ? 1 : 0.3; // fuori rosa si allena a parte
    c.fitness = Math.max(20, c.fitness - (injured ? 0 : load * TRAIN.fitnessPerLoad));
    c.fatigue = Math.round(Math.max(0, Math.min(100, c.fatigue + load * TRAIN.fatigueLoad * trains - TRAIN.fatigueRecovery - restSlots * TRAIN.fatigueRest)) * 10) / 10;
    c.sharpness = Math.max(20, Math.min(100, c.sharpness - TRAIN.sharpDecay + (injured ? 0 : count(plan, 'match') * TRAIN.sharpPartitella)));
    if (!injured && rng.next() < trainingInjuryP(p, plan, world.season)) {
      const relapse = c.relapse > 0 && rng.next() < 0.5;
      const type = injure(rng, p, relapse ? 'relapse' : rng.next() < 0.5 ? 'muscle' : 'overuse');
      if (me) {
        addNews(world, 'news.trainingInjury', { name: pName(p), injury: type.id, days: c.injuryDays });
        addCause(world, p, 'cause.injury', { injury: type.id, days: c.injuryDays });
      }
    }
    const mentor = validMentor(world, p);
    if (!mentor) p.mentorId = null;
    else bond(p, mentor, 1);
    const f = trains === 1 ? focus : { technical: 0.5, physical: 0.5, mental: 0.5, goalkeeping: 0.5, setPieces: 0.5 };
    const boost = me && world.manager.style === 'developer' && world.season - p.birthYear <= STYLE.youthAge ? STYLE.youthGrowth : 1;
    const changes = developPlayer(p, { season: world.season, focus: f, mentor, boost }, rng);
    if (me) for (const ch of changes) addCause(world, p, ch.delta > 0 ? 'cause.up' : 'cause.down', { attr: ch.attr, v: p.attrs[ch.attr], why: ch.why.join(',') });
  }
  // familiarità: si impara il modulo che si usa, si dimenticano piano gli altri
  const players = club.playerIds.map((id) => world.players[id]!);
  const adapt = players.reduce((s, p) => s + p.attrs.tacticalAdaptability, 0) / players.length / 11;
  const gain = TRAIN.famGain * (count(plan, 'tactical') + 0.5 * count(plan, 'match') + 1) * adapt
    * (me && world.manager.style === 'tactician' ? STYLE.famGain : 1);
  for (const f of FORMATION_IDS) {
    const v = club.familiarity[f] ?? TRAIN.famOther;
    club.familiarity[f] = Math.round(Math.max(TRAIN.famOther / 2, Math.min(100, f === club.tactic.formation ? v + gain : v - TRAIN.famDecay)) * 10) / 10;
  }
}
