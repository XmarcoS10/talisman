// Discorsi alla squadra (0.8.0): prima della partita, all'intervallo e alla fine. Chi reagisce bene e chi male dipende dal
// carattere, dal morale e dal punteggio: lodare chi perde non convince, pretendere pesa su chi regge male la pressione,
// la delusione scuote i professionisti solo quando si sta perdendo. Nessun caso: la reazione è una regola.
// Prima e all'intervallo cambia la resa in campo (logit personale, come i richiami: MATCH.talkBoost);
// alla fine resta su morale e fiducia nell'allenatore (PSYCH.talkMorale, PSYCH.talkTrust).
import { PSYCH } from './balance.ts';
import type { Club, Player, WorldState } from './model.ts';
import { addCause } from './news.ts';
import { clamp } from './util.ts';

export const TALKS = ['calm', 'motivate', 'demand', 'passion', 'praise', 'disappointed'] as const;
export type Talk = (typeof TALKS)[number];

/**
 * reazione di un giocatore: 1 = la prende bene, 0 = indifferente, negativa = la prende male.
 * `diff` = gol fatti meno subiti dalla sua squadra (0 prima del calcio d'inizio).
 */
export function talkResponse(p: Player, kind: Talk, diff: number): number {
  const c = p.personality;
  const fragile = c.pressureTolerance <= 8;
  switch (kind) {
    case 'calm': return diff > 0 ? 0.8 : c.temperament >= 14 ? 1 : 0.3;
    case 'motivate': return p.psych.morale < 60 ? 1 : 0.5;
    case 'demand': return fragile ? -1 : diff > 0 ? -0.5 : c.professionalism >= 12 ? 1 : 0.5;
    case 'passion': return c.temperament >= 12 ? (diff > 0 ? 0.3 : 1) : 0.2;
    case 'praise': return diff > 0 ? 1 : diff === 0 ? 0.5 : -0.5;
    case 'disappointed': return diff >= 0 ? -1 : fragile ? -1 : c.professionalism >= 12 ? 0.8 : 0.2;
  }
}

/** quanti l'hanno presa bene, indifferenti, male (per dirlo all'allenatore) */
export const reactions = (rs: number[]) => ({
  good: rs.filter((r) => r >= 0.8).length,
  bad: rs.filter((r) => r < 0).length,
  flat: rs.filter((r) => r >= 0 && r < 0.8).length,
});

/** discorso a fine partita: il morale e la fiducia di tutta la rosa, con la causa scritta nel profilo */
export function fullTimeTalk(world: WorldState, club: Club, kind: Talk, diff: number): number[] {
  return club.playerIds.map((id) => {
    const p = world.players[id]!;
    const r = talkResponse(p, kind, diff);
    p.psych.morale = Math.round(clamp(p.psych.morale + PSYCH.talkMorale * r, 0, 100) * 10) / 10;
    p.psych.trust = Math.round(clamp(p.psych.trust + PSYCH.talkTrust * r, 0, 100) * 10) / 10;
    if (r >= 0.8) addCause(world, p, 'cause.talkGood', { talk: `talk.${kind}` });
    else if (r < 0) addCause(world, p, 'cause.talkBad', { talk: `talk.${kind}` });
    return r;
  });
}
