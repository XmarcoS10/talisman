// Infortuni (GUIDA §7.2): catalogo, rischio personale, durata, ricadute.
import { MATCH, TRAIN } from './balance.ts';
import type { Player } from './model.ts';
import type { Rng } from './rng.ts';

/** contesto di insorgenza: contrasto, sforzo muscolare, sovraccarico/malanno (allenamento) */
export type InjuryCtx = 'contact' | 'muscle' | 'overuse';
export interface InjuryType { id: string; ctx: InjuryCtx; min: number; avg: number; max: number; relapse: number; w: number }

// [id, contesto, giorni min, medi, max, probabilità di ricaduta, frequenza relativa]. Nomi in it.json (injury.<id>).
const RAW: [string, InjuryCtx, number, number, number, number, number][] = [
  ['thighBruise', 'contact', 2, 5, 10, 0.02, 10], ['ankleBruise', 'contact', 2, 4, 8, 0.02, 8],
  ['kneeBruise', 'contact', 3, 6, 12, 0.03, 6], ['ankleSprain', 'contact', 7, 14, 28, 0.12, 9],
  ['kneeSprain', 'contact', 10, 21, 40, 0.1, 5], ['aclTear', 'contact', 180, 240, 330, 0.08, 0.6],
  ['meniscusTear', 'contact', 30, 55, 90, 0.1, 1.5], ['mclTear', 'contact', 28, 45, 75, 0.08, 1.5],
  ['brokenLeg', 'contact', 120, 180, 270, 0.02, 0.3], ['brokenFoot', 'contact', 45, 70, 100, 0.05, 0.6],
  ['brokenMetatarsal', 'contact', 40, 60, 90, 0.08, 0.8], ['brokenWrist', 'contact', 21, 35, 50, 0.02, 0.5],
  ['brokenRib', 'contact', 14, 28, 42, 0.02, 0.6], ['brokenNose', 'contact', 3, 10, 21, 0.01, 0.8],
  ['brokenCheekbone', 'contact', 14, 25, 40, 0.02, 0.3], ['concussion', 'contact', 5, 10, 21, 0.05, 1.5],
  ['dislocatedShoulder', 'contact', 21, 35, 60, 0.15, 0.8], ['headCut', 'contact', 1, 3, 7, 0.01, 2],
  ['dislocatedFinger', 'contact', 3, 7, 14, 0.02, 0.8], ['twistedAnkle', 'contact', 3, 6, 12, 0.08, 8],
  ['hipBruise', 'contact', 3, 6, 12, 0.02, 3], ['ankleLigaments', 'contact', 28, 45, 75, 0.12, 2],
  ['backBruise', 'contact', 2, 5, 10, 0.02, 3], ['toeInjury', 'contact', 3, 8, 16, 0.03, 2],
  ['heelBruise', 'contact', 4, 9, 18, 0.05, 2],
  ['muscleFatigue', 'muscle', 2, 4, 7, 0.1, 10], ['calfStrain', 'muscle', 5, 10, 21, 0.15, 8],
  ['thighStrain', 'muscle', 5, 12, 21, 0.15, 8], ['hamstringStrain', 'muscle', 10, 21, 35, 0.25, 10],
  ['hamstringTear', 'muscle', 30, 50, 80, 0.3, 2.5], ['quadStrain', 'muscle', 10, 18, 30, 0.2, 5],
  ['quadTear', 'muscle', 30, 45, 70, 0.25, 1.5], ['groinStrain', 'muscle', 10, 18, 30, 0.2, 7],
  ['groinTear', 'muscle', 28, 42, 60, 0.25, 1.5], ['calfTear', 'muscle', 21, 35, 55, 0.22, 2],
  ['achillesRupture', 'muscle', 180, 240, 300, 0.1, 0.4], ['backSpasm', 'muscle', 3, 7, 14, 0.12, 5],
  ['groinSpasm', 'muscle', 4, 8, 14, 0.15, 5], ['calfTightness', 'muscle', 2, 5, 9, 0.1, 6],
  ['hipFlexorStrain', 'muscle', 7, 14, 25, 0.18, 3], ['gluteStrain', 'muscle', 7, 12, 21, 0.15, 3],
  ['sideStrain', 'muscle', 10, 18, 30, 0.1, 1.5], ['neckStrain', 'muscle', 2, 5, 10, 0.05, 2],
  ['hamstringTightness', 'muscle', 2, 5, 9, 0.12, 7], ['adductorTear', 'muscle', 21, 35, 50, 0.25, 1],
  ['pubalgia', 'overuse', 21, 45, 90, 0.3, 2], ['patellarTendinitis', 'overuse', 10, 21, 45, 0.25, 2],
  ['achillesTendinitis', 'overuse', 10, 21, 42, 0.25, 2], ['plantarFasciitis', 'overuse', 14, 28, 56, 0.2, 1.5],
  ['stressFracture', 'overuse', 42, 60, 90, 0.15, 0.8], ['shinSplints', 'overuse', 7, 14, 28, 0.2, 2],
  ['kneeInflammation', 'overuse', 7, 14, 28, 0.15, 3], ['herniatedDisc', 'overuse', 30, 60, 120, 0.2, 0.5],
  ['hipInflammation', 'overuse', 7, 14, 25, 0.15, 2], ['ankleInflammation', 'overuse', 5, 10, 21, 0.12, 2],
  ['shoulderTendinitis', 'overuse', 7, 14, 21, 0.1, 0.5], ['metatarsalStress', 'overuse', 21, 35, 60, 0.2, 0.8],
  ['kneeCartilage', 'overuse', 40, 70, 120, 0.2, 0.4], ['flu', 'overuse', 3, 6, 10, 0, 3],
  ['gastroenteritis', 'overuse', 2, 4, 7, 0, 2],
];
export const INJURIES: Record<string, InjuryType> = Object.fromEntries(
  RAW.map(([id, ctx, min, avg, max, relapse, w]) => [id, { id, ctx, min, avg, max, relapse, w }]),
);
const BY_CTX = (ctx: InjuryCtx) => Object.values(INJURIES).filter((i) => i.ctx === ctx);
const POOLS: Record<InjuryCtx, InjuryType[]> = { contact: BY_CTX('contact'), muscle: BY_CTX('muscle'), overuse: BY_CTX('overuse') };

/** rischio personale (×1 = medio): tendenza agli infortuni, affaticamento stagionale, età */
export function injuryRisk(p: Player, season: number): number {
  const age = season - p.birthYear;
  return (0.5 + p.hidden.injuryProneness / 20) * (1 + p.condition.fatigue / 50) * (1 + Math.max(0, age - 30) * 0.08);
}

/** probabilità di ricaduta se gioca adesso (0 se il rientro non è recente) */
export function relapseRisk(p: Player): number {
  const inj = p.condition.injury;
  if (!inj || p.condition.relapse <= 0) return 0;
  return (INJURIES[inj.id]?.relapse ?? 0) * TRAIN.relapseMatch * Math.min(1, p.condition.relapse / 14);
}

/** probabilità di infortunio "senza contatto" in una partita */
export const matchInjuryP = (p: Player, season: number) => MATCH.injuryPerPlayer * injuryRisk(p, season);

/** mette fuori il giocatore: tipo scelto dal contesto (o la ricaduta dello stesso), durata dalla distribuzione del tipo */
export function injure(rng: Rng, p: Player, ctx: InjuryCtx | 'relapse'): InjuryType {
  let type: InjuryType;
  if (ctx === 'relapse' && p.condition.injury && INJURIES[p.condition.injury.id]) type = INJURIES[p.condition.injury.id]!;
  else {
    const pool = POOLS[ctx === 'relapse' ? 'muscle' : ctx];
    type = pool[rng.weighted(pool.map((i) => i.w))]!;
  }
  const mult = ctx === 'relapse' ? 1.3 : 1; // la ricaduta è più lunga
  const days = Math.round(Math.min(type.max, Math.max(type.min, type.avg * mult * Math.exp(rng.gauss(0, 0.4) - 0.08))));
  p.condition.injuryDays = days;
  p.condition.injury = { id: type.id, total: days };
  p.condition.relapse = 0;
  return type;
}

/** passano i giorni: guarigione, poi una finestra a rischio ricaduta */
export function heal(p: Player, days: number) {
  const c = p.condition;
  if (c.injuryDays > 0) {
    c.injuryDays = Math.max(0, c.injuryDays - days);
    if (c.injuryDays === 0 && c.injury) c.relapse = Math.min(28, Math.round(c.injury.total * TRAIN.relapseWindow));
  } else if (c.relapse > 0) {
    c.relapse = Math.max(0, c.relapse - days);
    if (c.relapse === 0) c.injury = null;
  }
}
