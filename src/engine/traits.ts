// Tratti del giocatore (0.10.0), come in Football Manager: abitudini in campo salvate sul giocatore, che cambiano come
// decide ("Tenta spesso tiri da fuori", "Si inserisce in area"...). Alla nascita sono più probabili quelli adatti al suo
// gioco; poi si insegnano o si fanno disimparare in allenamento, in qualche settimana. Nessun caso del mondo: la
// nascita usa un hash dell'id, l'apprendimento è una regola.
import { TRAIT } from './balance.ts';
import type { Player, WorldState } from './model.ts';
import { addCause, addNews, pName } from './news.ts';
import { Rng } from './rng.ts';
import { staffEdge } from './staff.ts';

export const TRAITS = ['longShots', 'runsWithBall', 'killerBalls', 'simplePasses', 'crossesEarly', 'getsIntoBox', 'staysBack', 'divesIn', 'rushesOut'] as const;
export type Trait = (typeof TRAITS)[number];

/** bit per la partita (MP.tr): il ciclo caldo del motore guarda un numero, non una lista */
export const TRAIT_BIT = Object.fromEntries(TRAITS.map((k, i) => [k, 1 << i])) as Record<Trait, number>;
export const traitBits = (p: Player) => (p.traits ?? []).reduce((b, k) => b | (TRAIT_BIT[k] ?? 0), 0);

/** effetti in partita dei tratti (bit di MP.tr): il motore chiama queste, così le sue funzioni restano semplici */
const B = TRAIT_BIT;
export const habit = {
  longPass: (tr: number) => (tr & B.simplePasses ? -TRAIT.simpleLong : 0), // logit dei passaggi lunghi
  through: (tr: number) => (tr & B.killerBalls ? TRAIT.through : tr & B.simplePasses ? -TRAIT.through : 0), // utilità del filtrante
  dribble: (tr: number) => (tr & B.runsWithBall ? TRAIT.dribble : 0),
  longShot: (tr: number) => (tr & B.longShots ? TRAIT.longShots : 1),
  cross: (tr: number) => (tr & B.crossesEarly ? TRAIT.cross : 1),
  runs: (tr: number) => (tr & B.getsIntoBox ? TRAIT.runs : tr & B.staysBack ? TRAIT.stayRuns : 1),
  tackle: (tr: number) => (tr & B.divesIn ? TRAIT.tackle : 1),
  foul: (tr: number) => (tr & B.divesIn ? TRAIT.foul : 1),
  sweep: (tr: number) => (tr & B.rushesOut ? TRAIT.sweep : 0),
};

/** coppie che si escludono, come in FM */
const CONFLICTS: [Trait, Trait][] = [['killerBalls', 'simplePasses'], ['getsIntoBox', 'staysBack']];
export const conflicts = (a: Trait, b: Trait) => CONFLICTS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

/** a chi si addice: solo il portiere esce dai pali, e nessun portiere prende gli altri */
export function suits(p: Player, k: Trait): boolean {
  return (k === 'rushesOut') === (p.position === 'GK');
}

/** quanto è probabile che un giocatore nasca con quel tratto: di più se il suo gioco lo porta lì */
function propensity(p: Player, k: Trait): number {
  const a = p.attrs;
  const fit = (v: number) => (v >= 15 ? TRAIT.bornFit : v >= 12 ? TRAIT.bornSome : TRAIT.bornRare);
  switch (k) {
    case 'longShots': return fit(a.longShots);
    case 'runsWithBall': return fit((a.dribbling + a.flair) / 2);
    case 'killerBalls': return fit((a.vision + a.passing) / 2);
    case 'simplePasses': return fit(21 - a.vision) * 0.6;
    case 'crossesEarly': return fit(a.crossing) * (['DL', 'DR', 'ML', 'MR', 'AML', 'AMR'].includes(p.position) ? 1 : 0.3);
    case 'getsIntoBox': return fit(a.offTheBall) * (['MC', 'AMC', 'AML', 'AMR', 'ST'].includes(p.position) ? 1 : 0.2);
    case 'staysBack': return ['DC', 'DM'].includes(p.position) ? fit(a.positioning) : 0;
    case 'divesIn': return fit((a.tackling + a.aggression) / 2) * (['DC', 'DL', 'DR', 'DM', 'MC'].includes(p.position) ? 1 : 0.3);
    case 'rushesOut': return fit(a.rushingOut);
  }
}

/** i tratti con cui nasce un giocatore: dipendono solo da lui (id e attributi) */
export function bornTraits(p: Player): Trait[] {
  const out: Trait[] = [];
  TRAITS.forEach((k, i) => {
    if (!suits(p, k) || out.length >= TRAIT.bornMax || out.some((o) => conflicts(o, k))) return;
    if (new Rng((p.id * 2654435761 + i * 40503) >>> 0).next() < propensity(p, k)) out.push(k);
  });
  return out;
}

/** si possono insegnare: adatti al ruolo, non già suoi, non in contrasto, sotto il massimo */
export const teachable = (p: Player): Trait[] =>
  p.traits.length >= TRAIT.max ? [] : TRAITS.filter((k) => suits(p, k) && !p.traits.includes(k) && !p.traits.some((o) => conflicts(o, k)));

export function startLearning(p: Player, trait: Trait, remove = false) {
  if (remove ? !p.traits.includes(trait) : !teachable(p).includes(trait)) return;
  p.learning = { trait, progress: 0, remove };
}

/** settimane stimate per finire, alla velocità di adesso */
export function learnRate(world: WorldState, p: Player): number {
  const age = world.season - p.birthYear;
  if (p.psych.morale < TRAIT.moraleStop) return 0; // scontento: non ascolta
  const ageF = age <= 21 ? 1.5 : age <= 27 ? 1 : age <= 31 ? 0.7 : 0.45;
  const prof = 0.6 + p.personality.professionalism / 25;
  return TRAIT.learnBase * ageF * prof * (1 + TRAIT.coachK * staffEdge(world, p.clubId ?? -1, 'assistant'));
}

/** una settimana di allenamento sui tratti (solo per i giocatori dell'utente) */
export function weekTraits(world: WorldState, p: Player) {
  const l = p.learning;
  if (!l) return;
  l.progress = Math.min(100, Math.round((l.progress + learnRate(world, p)) * 10) / 10);
  if (l.progress < 100) return;
  p.traits = l.remove ? p.traits.filter((k) => k !== l.trait) : [...p.traits, l.trait];
  p.learning = null;
  const key = l.remove ? 'news.traitUnlearned' : 'news.traitLearned';
  addNews(world, key, { name: pName(p), trait: `trait.${l.trait}`, pid: p.id });
  addCause(world, p, l.remove ? 'cause.traitUnlearned' : 'cause.traitLearned', { trait: `trait.${l.trait}` });
}
