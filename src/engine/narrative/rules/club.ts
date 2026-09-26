// Regole sulle squadre (1-20): serie, crisi, corse al titolo e alla salvezza, rivalità.
import { BOARD } from '../../balance.ts';
import { expected, fairPosition } from '../../board/board.ts';
import type { ClubId } from '../../model.ts';
import type { Hit, Rule } from '../arc.ts';
import { justPlayed, lastN, lost, streak, won, type Facts, type MatchFact } from '../facts.ts';

const clubs = (f: Facts) => f.comp.clubIds;
const noWin = (m: MatchFact) => !won(m);
const noLoss = (m: MatchFact) => !lost(m);
const each = (f: Facts, test: (c: ClubId) => Record<string, number | string> | null): Hit[] => {
  const out: Hit[] = [];
  for (const c of clubs(f)) {
    const d = test(c);
    if (d) out.push({ subject: { club: c }, data: d });
  }
  return out;
};
const pts = (f: Facts, c: ClubId) => f.table.find((r) => r.clubId === c)?.pts ?? 0;
/** la rimonta: sotto di due gol e poi vinta, ricostruita dagli eventi della partita */
function cameBack(m: MatchFact): boolean {
  if (!won(m) || !m.fx.result) return false;
  const side = m.home ? 0 : 1;
  let mine = 0, theirs = 0, worst = 0;
  for (const e of [...m.fx.result.events].sort((a, b) => a.min - b.min)) {
    if (e.type !== 'goal' && e.type !== 'penGoal') continue;
    if (e.side === side) mine++; else theirs++;
    worst = Math.min(worst, mine - theirs);
  }
  return worst <= -2;
}

export const CLUB_RULES: Rule[] = [
  // 1 · CRISI: quattro partite senza vittoria (per l'utente anche col morale basso o sotto l'obiettivo)
  {
    id: 'crisis', priority: 5, cooldown: 60, ttl: 70,
    detect: (f) => each(f, (c) => {
      const n = streak(f, c, noWin);
      if (c === f.me) {
        const mine = f.world.clubs[c]!;
        const morale = mine.playerIds.reduce((a, id) => a + f.world.players[id]!.psych.morale, 0) / Math.max(1, mine.playerIds.length);
        const behind = (f.pos.get(c) ?? 10) > expected(f.world, mine);
        return n >= 4 && (morale < 50 || behind) ? { n } : null;
      }
      return n >= 5 && fairPosition(f.world, f.world.clubs[c]!) <= 8 ? { n } : null;
    }),
    step: (arc, f) => {
      const c = arc.subject.club!;
      const n = streak(f, c, noWin);
      if (n === 0) return { step: 'won', data: { n: Number(arc.data.n) } };
      if (n >= 8) return { step: 'lost', data: { n } };
      if (n >= 6 && arc.stage === 0) return { step: 'next', data: { n } };
      return { step: 'stay' };
    },
  },
  // 2 · SERIE DI VITTORIE
  {
    id: 'winStreak', priority: 4, cooldown: 60, ttl: 90,
    detect: (f) => each(f, (c) => { const n = streak(f, c, won); return n >= 5 ? { n } : null; }),
    step: (arc, f) => {
      const n = streak(f, arc.subject.club!, won);
      if (n === 0) return { step: 'lost', data: { n: Number(arc.data.n) } };
      if (n >= 8 && arc.stage === 0) return { step: 'next', data: { n } };
      arc.data.n = n;
      return { step: 'stay' };
    },
  },
  // 3 · IMBATTIBILI
  {
    id: 'unbeaten', priority: 3, cooldown: 90, ttl: 120,
    detect: (f) => each(f, (c) => { const n = streak(f, c, noLoss); return n >= 10 ? { n } : null; }),
    step: (arc, f) => {
      const n = streak(f, arc.subject.club!, noLoss);
      if (n === 0) return { step: 'lost', data: { n: Number(arc.data.n) } };
      if (n >= 15 && arc.stage === 0) return { step: 'next', data: { n } };
      arc.data.n = n;
      return { step: 'stay' };
    },
  },
  // 4 · CORSA AL TITOLO: le prime due a tre punti o meno, a otto giornate dalla fine
  {
    id: 'titleRace', priority: 5, cooldown: 300, ttl: 90,
    detect: (f) => {
      const [a, b] = f.table;
      if (!a || !b || f.left > 8 || f.left === 0 || a.pts - b.pts > 3) return [];
      return [{ subject: { club: a.clubId, rival: b.clubId }, data: { gap: a.pts - b.pts, gapPts: a.pts - b.pts, left: f.left } }]; // le parole le mette la lingua (say.ts)
    },
    step: (arc, f) => {
      if (f.left > 0) return { step: 'stay' };
      return { step: f.table[0]!.clubId === arc.subject.club ? 'won' : 'lost' };
    },
  },
  // 5 · LOTTA SALVEZZA: nelle ultime tre dalla decima giornata (solo il club dell'utente)
  {
    id: 'relegation', priority: 5, cooldown: 300, ttl: 300,
    detect: (f) => {
      const p = f.pos.get(f.me) ?? 1;
      const n = f.table.length;
      if (f.round < 10 || f.comp.relegate === 0 || p <= n - f.comp.relegate) return [];
      return [{ subject: { club: f.me }, data: { pos: p, left: f.left } }];
    },
    step: (arc, f) => {
      const p = f.pos.get(f.me) ?? 1;
      const safe = p <= f.table.length - f.comp.relegate;
      if (f.left === 0) return { step: safe ? 'won' : 'lost', data: { pos: p } };
      if (safe && arc.stage === 0) return { step: 'next', data: { pos: p } };
      return { step: 'stay' };
    },
  },
  // 6 · LA SORPRESA: un club piccolo fra le prime quattro dopo otto giornate
  {
    id: 'surprise', priority: 3, cooldown: 300, ttl: 250,
    detect: (f) => (f.round < 8 ? [] : each(f, (c) => {
      const p = f.pos.get(c)!;
      return p <= 4 && fairPosition(f.world, f.world.clubs[c]!) >= 12 ? { pos: p } : null;
    })),
    step: (arc, f) => {
      const p = f.pos.get(arc.subject.club!)!;
      if (p > 8) return { step: 'lost', data: { pos: p } };
      if (f.left === 0) return { step: 'won', data: { pos: p } };
      return { step: 'stay' };
    },
  },
  // 7 · IL GIGANTE IN CRISI: una delle tre più blasonate nella metà bassa
  {
    id: 'giant', priority: 4, cooldown: 300, ttl: 250,
    detect: (f) => (f.round < 8 ? [] : each(f, (c) => {
      const p = f.pos.get(c)!;
      return p > f.table.length / 2 && fairPosition(f.world, f.world.clubs[c]!) <= 3 ? { pos: p } : null;
    })),
    step: (arc, f) => {
      const p = f.pos.get(arc.subject.club!)!;
      if (p <= 6) return { step: 'won', data: { pos: p } };
      if (f.left === 0) return { step: 'lost', data: { pos: p } };
      return { step: 'stay' };
    },
  },
  // 8 · FORTINO: sei vittorie di fila in casa
  {
    id: 'fortress', priority: 2, cooldown: 120, ttl: 150,
    detect: (f) => each(f, (c) => {
      const home = (f.matches.get(c) ?? []).filter((m) => m.home);
      let n = 0;
      for (let i = home.length - 1; i >= 0 && won(home[i]!); i--) n++;
      return n >= 6 && justPlayed(f, c)?.home ? { n } : null;
    }),
    step: (arc, f) => {
      const m = justPlayed(f, arc.subject.club!);
      return m?.home && !won(m) ? { step: 'lost', data: { n: Number(arc.data.n) } } : { step: 'stay' };
    },
  },
  // 9 · MALEDIZIONE IN TRASFERTA: sette trasferte senza vittoria
  {
    id: 'awayCurse', priority: 2, cooldown: 120, ttl: 150,
    detect: (f) => each(f, (c) => {
      const away = (f.matches.get(c) ?? []).filter((m) => !m.home);
      let n = 0;
      for (let i = away.length - 1; i >= 0 && !won(away[i]!); i--) n++;
      return n >= 7 && c === f.me ? { n } : null;
    }),
    step: (arc, f) => {
      const m = justPlayed(f, arc.subject.club!);
      return m && !m.home && won(m) ? { step: 'won', data: { n: Number(arc.data.n) } } : { step: 'stay' };
    },
  },
  // 10 · DIGIUNO: tre partite senza segnare
  {
    id: 'drought', priority: 3, cooldown: 60, ttl: 60,
    detect: (f) => each(f, (c) => { const n = streak(f, c, (m) => m.gf === 0); return n >= 3 ? { n } : null; }),
    step: (arc, f) => (streak(f, arc.subject.club!, (m) => m.gf === 0) === 0 ? { step: 'won' } : { step: 'stay' }),
  },
  // 11 · DIFESA COLABRODO: dieci gol presi in quattro partite
  {
    id: 'leaky', priority: 3, cooldown: 60, ttl: 60,
    detect: (f) => each(f, (c) => {
      const l = lastN(f, c, 4);
      const ga = l.reduce((a, m) => a + m.ga, 0);
      return l.length === 4 && ga >= 10 ? { ga } : null;
    }),
    step: (arc, f) => (justPlayed(f, arc.subject.club!)?.ga === 0 ? { step: 'won' } : { step: 'stay' }),
  },
  // 12 · PORTA BLINDATA: quattro partite senza subire gol
  {
    id: 'cleanRun', priority: 2, cooldown: 90, ttl: 90,
    detect: (f) => each(f, (c) => { const n = streak(f, c, (m) => m.ga === 0); return n >= 4 ? { n } : null; }),
    step: (arc, f) => {
      const n = streak(f, arc.subject.club!, (m) => m.ga === 0);
      if (n === 0) return { step: 'lost', data: { n: Number(arc.data.n) } };
      arc.data.n = n;
      return { step: 'stay' };
    },
  },
  // 13 · NEMESI: tre sconfitte di fila contro la stessa squadra, anche a cavallo delle stagioni
  {
    id: 'nemesis', priority: 4, cooldown: 400, ttl: 500,
    detect: (f) => {
      const out: Hit[] = [];
      for (const [id, s] of Object.entries(f.world.manager.h2h)) {
        const opp = Number(id);
        if (s.endsWith('LLL') && f.world.clubs[opp] && justPlayed(f, f.me)?.opp === opp)
          out.push({ subject: { club: f.me, rival: opp }, data: { n: s.length - s.replace(/L+$/, '').length } });
      }
      return out;
    },
    step: (arc, f) => {
      const m = justPlayed(f, f.me);
      if (!m || m.opp !== arc.subject.rival) return { step: 'stay' };
      return won(m) ? { step: 'won' } : lost(m) ? { step: 'next', data: { n: Number(arc.data.n) + 1 } } : { step: 'stay' };
    },
  },
  // 14 · RIVINCITA: all'andata presi tre gol di scarto, il ritorno è la prossima partita
  {
    id: 'revenge', priority: 3, cooldown: 200, ttl: 30,
    detect: (f) => {
      const next = f.comp.fixtures.filter((x) => !x.result && (x.home === f.me || x.away === f.me)).sort((a, b) => a.day - b.day)[0];
      if (!next) return [];
      const opp = next.home === f.me ? next.away : next.home;
      const first = (f.matches.get(f.me) ?? []).find((m) => m.opp === opp);
      return first && first.ga - first.gf >= 3 ? [{ subject: { club: f.me, rival: opp }, data: { gf: first.gf, ga: first.ga } }] : [];
    },
    step: (arc, f) => {
      const m = justPlayed(f, f.me);
      if (!m || m.opp !== arc.subject.rival) return { step: 'stay' };
      return won(m) ? { step: 'won', data: { gf: m.gf, ga: m.ga } } : { step: 'lost', data: { gf: m.gf, ga: m.ga } };
    },
  },
  // 15 · RIMONTA: vinta dopo essere stati sotto di due gol
  {
    id: 'comeback', priority: 3, cooldown: 30, ttl: 7,
    detect: (f) => each(f, (c) => {
      const m = justPlayed(f, c);
      return m && cameBack(m) && (c === f.me || m.opp === f.me || fairPosition(f.world, f.world.clubs[c]!) <= 6)
        ? { gf: m.gf, ga: m.ga, rivalId: m.opp } : null;
    }).map((h) => ({ subject: { club: h.subject.club, rival: Number(h.data.rivalId) }, data: h.data })),
  },
  // 16 · SCONTRO DIRETTO: due squadre a due punti o meno che si incontrano alla prossima, nel finale
  {
    id: 'showdown', priority: 4, cooldown: 120, ttl: 14,
    detect: (f) => {
      if (f.left > 6 || f.left === 0) return [];
      const nextDay = Math.min(...f.comp.fixtures.filter((x) => !x.result).map((x) => x.day));
      const out: Hit[] = [];
      for (const fx of f.comp.fixtures.filter((x) => x.day === nextDay)) {
        const [pa, pb] = [pts(f, fx.home), pts(f, fx.away)];
        const [ra, rb] = [f.pos.get(fx.home)!, f.pos.get(fx.away)!];
        const stakes = Math.max(ra, rb) <= 4 || Math.min(ra, rb) > f.table.length - 5;
        if (Math.abs(pa - pb) <= 2 && stakes) out.push({ subject: { club: fx.home, rival: fx.away }, data: { gapPts: Math.abs(pa - pb), left: f.left, high: Math.max(ra, rb) <= 4 ? 1 : 0 } });
      }
      return out;
    },
    step: (arc, f) => {
      const m = justPlayed(f, arc.subject.club!);
      if (!m || m.opp !== arc.subject.rival) return { step: 'stay' };
      return won(m) ? { step: 'won', data: { gf: m.gf, ga: m.ga } } : lost(m) ? { step: 'lost', data: { gf: m.gf, ga: m.ga } } : { step: 'next', data: { gf: m.gf, ga: m.ga } };
    },
  },
  // 17 · LA BATOSTA: sconfitta con quattro gol di scarto (club dell'utente o grandi)
  {
    id: 'thrashing', priority: 3, cooldown: 30, ttl: 20,
    detect: (f) => each(f, (c) => {
      const m = justPlayed(f, c);
      return m && m.ga - m.gf >= 4 && (c === f.me || fairPosition(f.world, f.world.clubs[c]!) <= 5) ? { gf: m.gf, ga: m.ga, rivalId: m.opp } : null;
    }).map((h) => ({ subject: { club: h.subject.club, rival: Number(h.data.rivalId) }, data: h.data })),
    step: (arc, f) => {
      const m = justPlayed(f, arc.subject.club!);
      if (!m || m.opp === arc.subject.rival) return { step: 'stay' };
      return won(m) ? { step: 'won' } : lost(m) ? { step: 'lost' } : { step: 'stay' };
    },
  },
  // 18 · CONTI NEI GUAI: il club dell'utente sotto sanzione del fair play finanziario
  {
    id: 'ffp', priority: 4, cooldown: 300, ttl: 400,
    detect: (f) => {
      const s = f.world.clubs[f.me]!.sanction;
      return s.kind !== 'none' ? [{ subject: { club: f.me }, data: { kind: s.kind, n: s.points } }] : [];
    },
    step: (arc, f) => {
      const s = f.world.clubs[f.me]!.sanction;
      if (s.kind === 'none') return { step: 'won' };
      if (s.kind !== arc.data.kind) return { step: s.kind === 'warning' ? 'stay' : 'next', data: { kind: s.kind, n: s.points } };
      return { step: 'stay' };
    },
  },
  // 18b · COMMISSARIATO (Blocco 4): la stagione dopo la bancarotta, dall'inizio alla fine
  {
    id: 'administration', priority: 5, cooldown: 300, ttl: 400,
    detect: (f) => each(f, (c) => (f.world.clubs[c]!.crisis.since === f.world.season && f.round >= 1 ? { n: f.world.clubs[c]!.crisis.penalty || 8 } : null)),
    step: (arc, f) => {
      if (f.left > 0) return f.round === 19 && arc.stage === 0 ? { step: 'next' } : { step: 'stay' };
      const pos = f.pos.get(arc.subject.club!) ?? 1;
      return pos > f.table.length - f.comp.relegate ? { step: 'lost' } : { step: 'won' };
    },
  },
  // 19 · PANCHINA IN BILICO: la fiducia della dirigenza sotto la soglia d'allarme
  {
    id: 'boardUnrest', priority: 5, cooldown: 90, ttl: 200,
    detect: (f) => (f.world.manager.board.trust.board < BOARD.warnAt && f.round >= 5
      ? [{ subject: { club: f.me }, data: { trust: Math.round(f.world.manager.board.trust.board) } }] : []),
    step: (_arc, f) => {
      const b = f.world.manager.board;
      if (b.trust.board > BOARD.warnAt + 12) return { step: 'won' };
      if (b.trust.board < BOARD.sackAt + 4) return { step: 'next' };
      return { step: 'stay' };
    },
  },
  // 20 · LA CURVA SI GIRA: la fiducia dei tifosi crolla
  {
    id: 'fans', priority: 3, cooldown: 90, ttl: 150,
    detect: (f) => (f.world.manager.board.trust.fans < 35 && f.round >= 4 ? [{ subject: { club: f.me }, data: {} }] : []),
    step: (_arc, f) => (f.world.manager.board.trust.fans > 52 ? { step: 'won' } : { step: 'stay' }),
  },
];
