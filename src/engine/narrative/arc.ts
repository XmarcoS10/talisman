// Regole e archi narrativi (GUIDA §7.4, P8 punti 1-2).
// Una regola dichiara quando nasce una storia (detect), come avanza (step), quanto vive (ttl),
// ogni quanto può ripresentarsi sullo stesso soggetto (cooldown) e quanto conta (priority).
import type { Arc, StorySubject } from '../model.ts';
import type { Facts } from './facts.ts';
import type { Vars } from './text.ts';

export type Step = 'stay' | 'next' | 'won' | 'lost';

export interface Hit {
  subject: StorySubject;
  data: Vars; // dati catturati: finiscono nei testi
}

export interface Rule {
  id: string;
  priority: number; // 1 (colore) … 5 (prima pagina)
  cooldown: number; // giorni prima che la stessa storia possa riaprirsi sullo stesso soggetto
  ttl: number; // giorni di vita massima: poi sfuma
  detect(f: Facts): Hit[];
  /** come avanza un arco aperto; senza step la storia è di una tappa sola */
  step?(arc: Arc, f: Facts): { step: Step; data?: Vars };
}

/** chiave di un arco: stessa regola e stesso soggetto = stessa storia */
export const arcKey = (rule: string, s: StorySubject) => `${rule}:${s.club ?? ''}:${s.rival ?? ''}:${s.player ?? ''}`;

export const SEASON_DAYS = 1000; // i giorni assoluti sono stagione × 1000 + giorno
