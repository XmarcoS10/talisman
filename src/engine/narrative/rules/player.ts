// Regole sui giocatori (21-40): rinascite, predestinati, serie di gol, ex, colpi e flop di mercato.
// Quasi tutte guardano la rosa dell'utente; le imprese più grandi (tripletta, classifica marcatori,
// predestinati) valgono per tutto il campionato.
import type { Player } from '../../model.ts';
import type { Hit, Rule } from '../arc.ts';
import { goalsIn, justPlayed, playerMatches, won, type Facts } from '../facts.ts';

const age = (f: Facts, p: Player) => f.world.season - p.birthYear;
const mine = (f: Facts) => f.players.filter((p) => p.clubId === f.me);
const hit = (p: Player, data: Record<string, number | string> = {}): Hit => ({ subject: { player: p.id, club: p.clubId ?? undefined }, data });
/** gol dell'ultima partita del suo club, se l'ha giocata */
const lastGoals = (f: Facts, p: Player) => {
  const m = p.clubId === null ? null : justPlayed(f, p.clubId);
  return m && m.fx.result?.ratings[p.id] !== undefined ? goalsIn(m.fx, p.id) : -1;
};
const ratingsOf = (f: Facts, p: Player) => playerMatches(f, p).map((m) => m.fx.result!.ratings[p.id]!);
/** arrivato in questa stagione: l'ultima stagione in archivio l'ha giocata altrove */
const newcomer = (p: Player) => p.history.length > 0 && p.history[p.history.length - 1]!.clubId !== p.clubId;
const goalsStreak = (f: Facts, p: Player) => {
  const list = playerMatches(f, p);
  let n = 0;
  for (let i = list.length - 1; i >= 0 && goalsIn(list[i]!.fx, p.id) > 0; i--) n++;
  return n;
};
const player = (f: Facts, id: number | undefined) => (id === undefined ? undefined : f.world.players[id]);

export const PLAYER_RULES: Rule[] = [
  // 21 · RINASCITA: sei partite storte, poi una doppietta
  {
    id: 'redemption', priority: 4, cooldown: 200, ttl: 40,
    detect: (f) => mine(f).filter((p) => {
      const r = ratingsOf(f, p);
      if (r.length < 7 || lastGoals(f, p) < 2) return false;
      const before = r.slice(-7, -1);
      return before.reduce((a, b) => a + b, 0) / before.length < 6.3;
    }).map((p) => hit(p, { g: lastGoals(f, p) })),
    step: (arc, f) => {
      const p = player(f, arc.subject.player);
      if (!p) return { step: 'lost' };
      return lastGoals(f, p) > 0 && arc.stage === 0 ? { step: 'won' } : { step: 'stay' };
    },
  },
  // 22 · IN STATO DI GRAZIA: a segno in quattro partite di fila
  {
    id: 'hotStreak', priority: 3, cooldown: 60, ttl: 80,
    detect: (f) => f.players.filter((p) => (p.clubId === f.me || p.stats.goals >= 8) && goalsStreak(f, p) >= 4)
      .map((p) => hit(p, { n: goalsStreak(f, p) })),
    step: (arc, f) => {
      const p = player(f, arc.subject.player);
      if (!p) return { step: 'lost' };
      const n = goalsStreak(f, p);
      if (n === 0) return { step: 'lost', data: { n: Number(arc.data.n) } };
      if (n >= 6 && arc.stage === 0) return { step: 'next', data: { n } };
      arc.data.n = n;
      return { step: 'stay' };
    },
  },
  // 23 · IL PREDESTINATO: under 19 dal potenziale enorme all'esordio. Arco pluriennale
  {
    id: 'predestined', priority: 5, cooldown: 3000, ttl: 3500,
    detect: (f) => f.players.filter((p) => age(f, p) <= 19 && p.pa >= 160 && p.stats.apps === 1 && p.history.every((h) => h.apps === 0))
      .map((p) => hit(p, { age: age(f, p), club: p.clubId ?? -1 })),
    step: (arc, f) => {
      const p = player(f, arc.subject.player);
      if (!p || p.clubId === null) return { step: 'lost' };
      if (arc.stage === 0 && p.stats.goals + p.history.reduce((a, h) => a + h.goals, 0) > 0) return { step: 'next' };
      if (arc.stage === 1 && p.ca >= 135) return { step: 'next' };
      if (p.ca >= 155 || (arc.data.club !== undefined && p.clubId !== Number(arc.data.club) && f.world.clubs[p.clubId]!.reputation > 80)) return { step: 'won' };
      if (age(f, p) >= 23 && p.ca < 130) return { step: 'lost' };
      return { step: 'stay' };
    },
  },
  // 24 · UOMO DECISIVO: da solo fa quattro gol su dieci della squadra
  {
    id: 'talisman', priority: 3, cooldown: 400, ttl: 200,
    detect: (f) => {
      const club = f.world.clubs[f.me]!;
      const team = (f.matches.get(f.me) ?? []).reduce((a, m) => a + m.gf, 0);
      if (team < 12) return [];
      return club.playerIds.map((id) => f.world.players[id]!).filter((p) => p.stats.goals / team >= 0.4)
        .map((p) => hit(p, { g: p.stats.goals, team }));
    },
  },
  // 25 · CORSA AL TITOLO DI CAPOCANNONIERE: un nostro a due gol dal primo, dopo quindici giornate
  {
    id: 'scorerRace', priority: 3, cooldown: 400, ttl: 300,
    detect: (f) => {
      if (f.round < 15) return [];
      const top = [...f.players].sort((a, b) => b.stats.goals - a.stats.goals)[0];
      if (!top || top.stats.goals < 8) return [];
      return mine(f).filter((p) => top.stats.goals - p.stats.goals <= 2 && p.stats.goals >= 8)
        .map((p) => ({ ...hit(p, { g: p.stats.goals, top: top.stats.goals }), subject: { player: p.id, club: p.clubId ?? undefined, rival: top.clubId ?? undefined } }));
    },
    step: (arc, f) => {
      if (f.left > 0) return { step: 'stay' };
      const top = [...f.players].sort((a, b) => b.stats.goals - a.stats.goals)[0];
      return top && top.id === arc.subject.player ? { step: 'won', data: { g: top.stats.goals } } : { step: 'lost' };
    },
  },
  // 26 · SARACINESCA: il nostro portiere senza gol subiti per quattro partite
  {
    id: 'keeper', priority: 2, cooldown: 120, ttl: 90,
    detect: (f) => mine(f).filter((p) => p.position === 'GK').filter((p) => {
      const list = playerMatches(f, p);
      let n = 0;
      for (let i = list.length - 1; i >= 0 && list[i]!.ga === 0; i--) n++;
      return n >= 4;
    }).map((p) => hit(p)),
    step: (arc, f) => {
      const m = justPlayed(f, f.me);
      return m && m.ga > 0 ? { step: 'lost' } : { step: 'stay' };
    },
  },
  // 27 · IL RITORNO: due mesi e più di infortunio, poi il gol
  {
    id: 'comebackKid', priority: 4, cooldown: 300, ttl: 7,
    detect: (f) => mine(f).filter((p) => (p.condition.injury?.total ?? 0) >= 60 && p.condition.injuryDays === 0 && lastGoals(f, p) > 0)
      .map((p) => hit(p, { days: p.condition.injury!.total })),
  },
  // 28 · CRISI DI RENDIMENTO: uno dei nostri tre migliori sotto il 6 per cinque partite
  {
    id: 'slump', priority: 3, cooldown: 120, ttl: 90,
    detect: (f) => {
      const best = [...mine(f)].sort((a, b) => b.ca - a.ca).slice(0, 3);
      return best.filter((p) => { const r = ratingsOf(f, p).slice(-5); return r.length === 5 && r.every((x) => x < 6.1); })
        .map((p) => hit(p));
    },
    step: (arc, f) => {
      const p = player(f, arc.subject.player);
      if (!p) return { step: 'lost' };
      const r = ratingsOf(f, p).at(-1) ?? 0;
      return r >= 7 ? { step: 'won' } : { step: 'stay' };
    },
  },
  // 29 · SEPARATO IN CASA: ha chiesto la cessione
  {
    id: 'wantsOut', priority: 4, cooldown: 200, ttl: 250,
    detect: (f) => mine(f).filter((p) => p.psych.wantsOut).map((p) => hit(p)),
    step: (arc, f) => {
      const p = player(f, arc.subject.player);
      if (!p || p.clubId !== f.me) return { step: 'lost' };
      return p.psych.wantsOut ? { step: 'stay' } : { step: 'won' };
    },
  },
  // 30 · FAIDA: due dei nostri non si parlano più
  {
    id: 'feud', priority: 4, cooldown: 200, ttl: 150,
    detect: (f) => f.world.clubs[f.me]!.feuds.filter((x) => f.world.players[x.a] && f.world.players[x.b])
      .map((x) => ({ subject: { player: x.a, club: f.me }, data: { other: `${f.world.players[x.b]!.firstName} ${f.world.players[x.b]!.lastName}`, otherId: x.b } })),
    step: (arc, f) => {
      const still = f.world.clubs[f.me]!.feuds.some((x) => x.a === arc.subject.player && x.b === Number(arc.data.otherId));
      return still ? { step: 'stay' } : { step: 'won' };
    },
  },
  // 31 · IL MAESTRO E L'ALLIEVO: il ragazzo seguito da un veterano va a segno
  {
    id: 'mentor', priority: 3, cooldown: 300, ttl: 7,
    detect: (f) => mine(f).filter((p) => p.mentorId !== null && f.world.players[p.mentorId] && lastGoals(f, p) > 0)
      .map((p) => { const m = f.world.players[p.mentorId!]!; return hit(p, { mentor: `${m.firstName} ${m.lastName}` }); }),
  },
  // 32 · ESORDIO: un nostro ragazzo alla prima partita
  {
    id: 'debut', priority: 2, cooldown: 3000, ttl: 7,
    detect: (f) => mine(f).filter((p) => age(f, p) <= 19 && p.stats.apps === 1 && p.pa < 160 && p.history.every((h) => h.apps === 0) && lastGoals(f, p) >= 0)
      .map((p) => hit(p, { age: age(f, p) })),
  },
  // 33 · L'ULTIMO BALLO: un trentaquattrenne ancora decisivo
  {
    id: 'veteran', priority: 2, cooldown: 120, ttl: 7,
    detect: (f) => mine(f).filter((p) => age(f, p) >= 34 && lastGoals(f, p) > 0).map((p) => hit(p, { age: age(f, p) })),
  },
  // 34 · IMPATTO DEL NUOVO ACQUISTO: a segno in una delle prime tre partite
  {
    id: 'newSigning', priority: 3, cooldown: 3000, ttl: 7,
    detect: (f) => mine(f).filter((p) => newcomer(p) && p.stats.apps <= 3 && lastGoals(f, p) > 0)
      .map((p) => { const from = f.world.clubs[p.history[p.history.length - 1]!.clubId]; return from ? { ...hit(p), subject: { player: p.id, club: f.me, rival: from.id } } : hit(p); }),
  },
  // 35 · IL FLOP: acquisto dell'estate sotto il 6,2 di media dopo sei partite
  {
    id: 'flop', priority: 3, cooldown: 3000, ttl: 150,
    detect: (f) => mine(f).filter((p) => newcomer(p) && p.stats.apps >= 6 && p.stats.ratingSum / p.stats.apps < 6.2)
      .map((p) => hit(p, { apps: p.stats.apps })),
    step: (arc, f) => {
      const p = player(f, arc.subject.player);
      if (!p || p.clubId !== f.me) return { step: 'lost' };
      return (ratingsOf(f, p).at(-1) ?? 0) >= 7.5 ? { step: 'won' } : { step: 'stay' };
    },
  },
  // 36 · L'EX: segna alla sua vecchia squadra
  {
    id: 'formerClub', priority: 3, cooldown: 60, ttl: 7,
    detect: (f) => f.players.filter((p) => {
      if (p.clubId === null || lastGoals(f, p) <= 0) return false;
      const opp = justPlayed(f, p.clubId)?.opp;
      return opp !== undefined && (p.clubId === f.me || opp === f.me) && p.history.some((h) => h.clubId === opp && h.apps > 0);
    }).map((p) => ({ subject: { player: p.id, club: p.clubId ?? undefined, rival: justPlayed(f, p.clubId!)!.opp }, data: {} })),
  },
  // 37 · TRIPLETTA
  {
    id: 'hatTrick', priority: 4, cooldown: 7, ttl: 7,
    detect: (f) => f.players.filter((p) => lastGoals(f, p) >= 3).map((p) => {
      const m = justPlayed(f, p.clubId!)!;
      return { subject: { player: p.id, club: p.clubId ?? undefined, rival: m.opp }, data: { g: lastGoals(f, p), won: won(m) ? 1 : 0 } };
    }),
  },
  // 38 · TESTA CALDA: il secondo rosso della stagione
  {
    id: 'hothead', priority: 2, cooldown: 400, ttl: 7,
    detect: (f) => mine(f).filter((p) => p.stats.reds >= 2 && justPlayed(f, f.me)?.fx.result?.events.some((e) => e.type === 'red' && e.playerId === p.id))
      .map((p) => hit(p, { n: p.stats.reds })),
  },
  // 39 · ADDIO A PARAMETRO ZERO: ha già firmato altrove
  {
    id: 'preSigned', priority: 4, cooldown: 3000, ttl: 250,
    detect: (f) => mine(f).filter((p) => p.contract.preSigned !== null)
      .map((p) => ({ subject: { player: p.id, club: f.me, rival: p.contract.preSigned! }, data: {} })),
    step: (arc, f) => {
      const p = player(f, arc.subject.player);
      return !p || p.clubId !== f.me ? { step: 'lost' } : { step: 'stay' };
    },
  },
  // 40 · ALLO SCADERE: il gol vittoria dall'ottantacinquesimo in poi
  {
    id: 'lateWinner', priority: 3, cooldown: 14, ttl: 7,
    detect: (f) => {
      const m = justPlayed(f, f.me);
      if (!m || !won(m) || !m.fx.result || m.gf - m.ga !== 1) return [];
      const side = m.home ? 0 : 1;
      const last = [...m.fx.result.events].filter((e) => e.type === 'goal' || e.type === 'penGoal').sort((a, b) => a.min - b.min).at(-1);
      if (!last || last.side !== side || last.min < 85) return [];
      const p = f.world.players[last.playerId];
      return p ? [{ subject: { player: p.id, club: f.me, rival: m.opp }, data: { min: last.min } }] : [];
    },
  },
];
