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

/**
 * il tono che sceglie il vice nelle partite non seguite dal vivo: il migliore per la rosa fra quelli che conosce.
 * Più è bravo più toni conosce (TALKS in ordine: a 10 calma, motivare, pretendere; a 20 anche lode e delusione).
 */
export function viceTalk(ps: Player[], skill: number, diff: number): Talk {
  const known = TALKS.slice(0, clamp(Math.round((skill * TALKS.length) / 20), 2, TALKS.length));
  let best: Talk = known[0]!, top = -Infinity;
  for (const k of known) {
    const s = ps.reduce((a, p) => a + talkResponse(p, k, diff), 0);
    if (s > top) { top = s; best = k; }
  }
  return best;
}

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

// --- colloqui individuali (0.13.0, come le interazioni di FM): lodare o criticare il rendimento di un giocatore ---
export const CHATS = ['praiseForm', 'criticiseForm'] as const; // quelli del profilo
/** earnIt: risposta a chi chiede più minuti (Spogliatoio), «il posto te lo devi guadagnare» */
export type Chat = (typeof CHATS)[number] | 'earnIt';

/** media degli ultimi tre voti, null se non ha ancora giocato */
const recentForm = (p: Player) => (p.form.length ? p.form.slice(-3).reduce((s, v) => s + v, 0) / Math.min(3, p.form.length) : null);

/**
 * come la prende: `r` come nei discorsi (1 bene, negativo male) e il perché, che il giocatore dice.
 * Lodare chi gioca bene lo convince, chi gioca male no; criticare chi gioca bene è ingiusto, chi regge male la
 * pressione ci resta male, un professionista che sta giocando male la prende come uno stimolo.
 */
export function chatResponse(p: Player, kind: Chat): { r: number; why: string } {
  const c = p.personality;
  if (kind === 'earnIt') {
    // chi punta in alto e non è un professionista vuole spazio adesso; il professionista capisce
    if (c.ambition >= 15 && c.professionalism < 12) return { r: -1, why: 'wantsMore' };
    return c.professionalism >= 12 ? { r: 0.5, why: 'understands' } : { r: -0.3, why: 'disappointed' };
  }
  const f = recentForm(p);
  const good = f !== null && f >= PSYCH.chatGoodForm, bad = f !== null && f < PSYCH.chatBadForm;
  if (kind === 'praiseForm') return good ? { r: 1, why: 'deserved' } : bad ? { r: -0.5, why: 'empty' } : { r: 0.3, why: 'fine' };
  if (good) return { r: -1, why: 'unfair' };
  if (c.pressureTolerance <= 8) return { r: -0.8, why: 'hurt' };
  if (bad) return c.professionalism >= 12 ? { r: 1, why: 'fair' } : { r: 0.3, why: 'accepts' };
  return { r: -0.3, why: 'harsh' };
}

/** giorno dell'ultimo colloquio con lui in questa stagione (dal registro delle cause: nessun campo in più nel mondo) */
export function lastChat(world: WorldState, p: Player): number | null {
  for (let i = world.causal.length - 1; i >= 0; i--) {
    const e = world.causal[i]!;
    if (e.playerId === p.id && e.season === world.season && e.key.startsWith('cause.chat')) return e.day;
  }
  return null;
}

export const canChat = (world: WorldState, p: Player) => {
  const d = lastChat(world, p);
  return d === null || world.day - d >= PSYCH.chatEvery;
};

/** colloquio con un giocatore dell'utente: morale e fiducia, e la causa nel profilo (che fa anche da attesa) */
export function holdChat(world: WorldState, p: Player, kind: Chat): { r: number; why: string } | null {
  if (p.clubId !== world.manager.clubId || !canChat(world, p)) return null;
  const res = chatResponse(p, kind);
  // rende sempre meno a chi ha già fiducia piena (a 50 tutto, a 75 metà): lodare tutti ogni settimana non basta
  const k = res.r > 0 ? Math.min(1, 2 * (1 - p.psych.trust / 100)) : 1;
  p.psych.morale = Math.round(clamp(p.psych.morale + PSYCH.chatMorale * res.r * k, 0, 100) * 10) / 10;
  p.psych.trust = Math.round(clamp(p.psych.trust + PSYCH.chatTrust * res.r * k, 0, 100) * 10) / 10;
  addCause(world, p, res.r >= 0.8 ? 'cause.chatGood' : res.r < 0 ? 'cause.chatBad' : 'cause.chatFlat', { talk: `chat.${kind}` });
  return res;
}
