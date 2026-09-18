// Sviluppo settimanale degli attributi (GUIDA §7.1): crescita verso il potenziale, declino con l'età, mentori.
// Funzione pura rispetto al mondo: legge il giocatore e il contesto, restituisce cosa è cambiato e perché.
import { DEV, type AgeCurve } from './balance.ts';
import { ALL_ATTRS, ATTR_GROUPS, type AttrKey, type Personality, type Player } from './model.ts';
import { GENERAL, PROFILES, age, recomputeCA } from './players.ts';
import type { Rng } from './rng.ts';

export type Area = keyof typeof DEV.curves;
const AREA = new Map<AttrKey, Area>();
for (const [g, keys] of Object.entries(ATTR_GROUPS)) for (const k of keys) AREA.set(k, g as Area);
const SET_PIECES = new Set<AttrKey>(['corners', 'freeKicks', 'penalties']);
const MENTOR_ATTRS: AttrKey[] = ['determination', 'composure', 'leadership', 'teamwork', 'decisions', 'concentration'];
const MENTOR_AXES: (keyof Personality)[] = ['professionalism', 'ambition', 'temperament', 'pressureTolerance'];

/** contesto della settimana: focus dell'allenamento per area (≈1 = equilibrato), mentore */
export interface DevContext {
  season: number;
  focus: Record<Area | 'setPieces', number>;
  mentor: Player | null;
}

/** una variazione di attributo con le sue cause (chiavi i18n why.*) */
export type DevChange = { attr: AttrKey; delta: 1 | -1; why: string[] };

/** 1 = crescita piena, poi cala fino a `plateauGrowth` tra fine crescita e declino, 0 dal declino */
export function ageGrowth(c: AgeCurve, a: number): number {
  if (a <= c.growFull) return 1;
  if (a < c.growEnd) return 1 - ((1 - DEV.plateauGrowth) * (a - c.growFull)) / (c.growEnd - c.growFull);
  return a < c.declineFrom ? DEV.plateauGrowth : 0;
}
/** probabilità settimanale di perdere un punto: cresce con gli anni oltre l'inizio del declino */
export const ageDecline = (c: AgeCurve, a: number) => (a >= c.declineFrom ? c.declineRate * (a - c.declineFrom + 1) : 0);

export function developPlayer(p: Player, ctx: DevContext, rng: Rng): DevChange[] {
  const a = age(p, ctx.season);
  const pers = p.personality;
  const injured = p.condition.injuryDays > 0;
  const gap = Math.max(0, p.pa - p.ca) / 10;
  const minutesF = 0.5 + 0.9 * p.psych.minutes; // chi non gioca cresce poco
  const common = gap * (0.4 + (1.2 * pers.professionalism) / 20) * minutesF * (0.85 + (0.3 * p.psych.morale) / 100) * (injured ? DEV.injuredGrowth : 1);
  const declineF = 1.4 - (0.8 * pers.professionalism) / 20;
  const core = new Set(PROFILES[p.position]);
  const general = new Set(GENERAL);
  const changes: DevChange[] = [];

  for (const k of ALL_ATTRS) {
    const area = AREA.get(k)!;
    const curve = DEV.curves[area];
    const w = core.has(k) ? DEV.weightCore : general.has(k) ? DEV.weightGeneral : DEV.weightOther;
    const focus = SET_PIECES.has(k) ? ctx.focus.setPieces : ctx.focus[area === 'goalkeeping' ? 'technical' : area];
    const g = DEV.growth * common * ageGrowth(curve, a) * w * focus;
    const d = ageDecline(curve, a) * declineF * (injured && area === 'physical' ? DEV.injuredDecline : 1);
    const r = rng.next();
    if (r < g && p.attrs[k] < 20) {
      p.attrs[k]++;
      const why = [a <= curve.growFull ? 'why.youth' : 'why.experience'];
      if (focus >= 1.2) why.push('why.training');
      if (minutesF >= 1.1) why.push('why.minutes');
      if (pers.professionalism >= 15) why.push('why.prof');
      changes.push({ attr: k, delta: 1, why });
    } else if (r > 1 - d && p.attrs[k] > 1) {
      p.attrs[k]--;
      const why = ['why.age'];
      if (injured) why.push('why.injury');
      if (pers.professionalism <= 7) why.push('why.lowProf');
      changes.push({ attr: k, delta: -1, why });
    }
  }

  // mentore: trasmette piano personalità e attributi mentali in cui è migliore
  const m = ctx.mentor;
  if (m) {
    const inf = m.attrs.socialInfluence / 20;
    for (const k of MENTOR_ATTRS) {
      if (m.attrs[k] > p.attrs[k] && p.attrs[k] < 20 && rng.next() < DEV.mentorRate * inf) {
        p.attrs[k]++;
        changes.push({ attr: k, delta: 1, why: ['why.mentor'] });
      }
    }
    for (const ax of MENTOR_AXES) {
      if (m.personality[ax] !== p.personality[ax] && rng.next() < DEV.mentorPersonality * inf)
        p.personality[ax] += Math.sign(m.personality[ax] - p.personality[ax]);
    }
  }

  if (changes.length) {
    recomputeCA(p);
    p.pa = Math.max(p.pa, p.ca);
  }
  return changes;
}
