// Conferenze stampa (GUIDA §7.4, P8 punto 5): le domande nascono dalle storie aperte, non dal caso.
// Ogni risposta dichiara i suoi effetti prima che tu la scelga — su giocatori con nome e cognome, sul gruppo,
// su dirigenza, tifosi e stampa — e quello che tocca un giocatore finisce nel suo Causal Log.
import { PRESS } from '../balance.ts';
import type { Arc, PressEffect, PressOption, PressQuestion, WorldState } from '../model.ts';
import { addCause } from '../news.ts';
import type { Rng } from '../rng.ts';
import { pack, rawVars, said, TEXTS } from '../narrative/say.ts';
import { clamp } from '../util.ts';

const T: Record<string, string[]> = TEXTS.it; // le chiavi sono le stesse in ogni lingua

// che tipo di domanda fa una storia: sul giocatore o sulla squadra, bella o brutta
const PLAYER_GOOD = new Set(['redemption', 'hotStreak', 'predestined', 'talisman', 'scorerRace', 'keeper', 'comebackKid',
  'mentor', 'debut', 'veteran', 'newSigning', 'formerClub', 'hatTrick', 'lateWinner']);
const PLAYER_BAD = new Set(['slump', 'wantsOut', 'feud', 'flop', 'hothead', 'preSigned']);
const CLUB_GOOD = new Set(['winStreak', 'unbeaten', 'titleRace', 'surprise', 'fortress', 'cleanRun', 'revenge', 'comeback', 'showdown']);

type Kind = 'playerGood' | 'playerBad' | 'clubGood' | 'clubBad';
const kindOf = (a: Arc): Kind => PLAYER_GOOD.has(a.rule) ? 'playerGood' : PLAYER_BAD.has(a.rule) ? 'playerBad'
  : CLUB_GOOD.has(a.rule) ? 'clubGood' : 'clubBad';

/** le risposte possibili per tipo di domanda, con gli effetti già calcolati per quel giocatore */
function options(world: WorldState, a: Arc, kind: Kind): { key: string; effects: PressEffect[] }[] {
  const pid = a.subject.player;
  const p = pid !== undefined ? world.players[pid] : undefined;
  const no = { key: 'a.noComment', effects: [{ target: 'press' as const, delta: PRESS.noComment }] };
  if ((kind === 'playerGood' || kind === 'playerBad') && p) {
    // pungolare in pubblico: chi regge la pressione si carica, chi non la regge si abbatte
    const sting = p.personality.pressureTolerance >= PRESS.challengeTolerance ? PRESS.challengeUp : PRESS.challengeDown;
    if (kind === 'playerGood') return [
      { key: 'a.praise', effects: [{ target: 'player', playerId: p.id, delta: PRESS.praise }, { target: 'fans', delta: PRESS.bar / 2 }] },
      { key: 'a.keepCalm', effects: [{ target: 'player', playerId: p.id, delta: PRESS.squadSmall }, { target: 'press', delta: -PRESS.bar / 2 }] },
      { key: 'a.group', effects: [{ target: 'squad', delta: PRESS.squadSmall }] },
      { key: 'a.demand', effects: [{ target: 'player', playerId: p.id, delta: sting }] },
      no,
    ];
    return [
      { key: 'a.defend', effects: [{ target: 'player', playerId: p.id, delta: PRESS.defend }, { target: 'press', delta: -PRESS.bar / 2 }] },
      { key: 'a.challenge', effects: [{ target: 'player', playerId: p.id, delta: sting }, { target: 'board', delta: PRESS.bar / 2 }] },
      { key: 'a.internal', effects: [{ target: 'squad', delta: PRESS.squadSmall / 2 }, { target: 'press', delta: -PRESS.bar / 2 }] },
      no,
    ];
  }
  if (kind === 'clubGood') return [
    { key: 'a.humble', effects: [{ target: 'board', delta: PRESS.bar / 2 }] },
    { key: 'a.ambition', effects: [{ target: 'fans', delta: PRESS.bar }, { target: 'squad', delta: PRESS.squadSmall }, { target: 'board', delta: -PRESS.bar / 2 }] },
    { key: 'a.credit', effects: [{ target: 'squad', delta: PRESS.squadSmall }, { target: 'press', delta: PRESS.bar / 2 }] },
    no,
  ];
  return [
    { key: 'a.responsibility', effects: [{ target: 'squad', delta: PRESS.squadSmall }, { target: 'board', delta: -PRESS.bar / 2 }] },
    { key: 'a.blame', effects: [{ target: 'squad', delta: PRESS.squadBlame }, { target: 'board', delta: PRESS.bar / 2 }] },
    { key: 'a.reaction', effects: [{ target: 'fans', delta: PRESS.bar }, { target: 'press', delta: PRESS.bar / 2 }] },
    { key: 'a.luck', effects: [{ target: 'fans', delta: PRESS.bar / 2 }, { target: 'press', delta: -PRESS.bar }] },
    no,
  ];
}

/**
 * la conferenza della settimana: una domanda per ciascuna delle storie aperte più fresche che ti riguardano.
 * Senza storie non c'è conferenza: nessuno ti fa domande per riempire il tempo.
 */
export function weekPress(world: WorldState, rng: Rng) {
  const me = world.manager.clubId;
  const arcs = world.arcs
    .filter((a) => a.state === 'open' && a.lines.length > 0 && (a.subject.club === me || a.subject.rival === me))
    .filter((a) => !a.subject.player || world.players[a.subject.player]?.clubId === me || kindOf(a).startsWith('club'))
    .sort((a, b) => b.opened - a.opened)
    .slice(0, PRESS.questions);
  if (!arcs.length) { world.press = null; return; }
  const questions: PressQuestion[] = arcs.map((a) => {
    const kind = kindOf(a);
    // domande e risposte si scrivono al momento della lettura, nella lingua di chi legge (say.ts)
    const raw = rawVars(world, a);
    const seed = () => rng.int(1, 2 ** 31 - 1);
    const qKey = T[`q.${a.rule}`] ? `q.${a.rule}` : `q.${kind}`;
    return {
      arcId: a.id,
      asker: said('askers', raw, seed()),
      text: said(qKey, raw, seed()),
      options: options(world, a, kind).map((o): PressOption => ({ key: o.key.slice(2), text: said(o.key, raw, seed()), effects: o.effects })),
      answered: null,
    };
  });
  world.press = { season: world.season, day: world.day, questions };
}

/** applica la risposta scelta: gli effetti sono esattamente quelli mostrati */
export function answerPress(world: WorldState, qi: number, oi: number): boolean {
  const q = world.press?.questions[qi];
  const o = q?.options[oi];
  if (!q || !o || q.answered !== null) return false;
  q.answered = oi;
  const club = world.clubs[world.manager.clubId]!;
  const board = world.manager.board.trust;
  for (const e of o.effects) {
    if (e.target === 'player' && e.playerId !== undefined) {
      const p = world.players[e.playerId];
      if (!p) continue;
      p.psych.morale = clamp(p.psych.morale + e.delta, 0, 100);
      addCause(world, p, e.delta >= 0 ? 'cause.pressUp' : 'cause.pressDown', { text: pack(o.text) });
    } else if (e.target === 'squad') {
      for (const id of club.playerIds) world.players[id]!.psych.morale = clamp(world.players[id]!.psych.morale + e.delta, 0, 100);
    } else if (e.target !== 'player') {
      board[e.target] = clamp(board[e.target] + e.delta, 0, 100);
    }
  }
  return true;
}
