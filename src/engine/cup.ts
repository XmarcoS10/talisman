// La Coppa nazionale (F10): eliminazione diretta fra tutti i club, partita secca in casa di chi è sorteggiato primo,
// turni infrasettimanali fra una giornata e l'altra, rigori se finisce pari. Il turno dopo si sorteggia appena
// l'ultimo si è chiuso. Le partite di coppa non contano nelle statistiche di campionato.
import { CUP } from './balance.ts';
import { books } from './finance/ledger.ts';
import type { ClubId, Cup, Fixture, WorldState } from './model.ts';
import { addNews } from './news.ts';
import type { Rng } from './rng.ts';

/** chi passa il turno (null se la gara non si è ancora giocata) */
export function tieWinner(fx: Fixture): ClubId | null {
  if (!fx.result) return null;
  const { hg, ag } = fx.result;
  if (hg !== ag) return hg > ag ? fx.home : fx.away;
  return fx.pens ? (fx.pens[0] > fx.pens[1] ? fx.home : fx.away) : null;
}

const pair = (ids: ClubId[], day: number, rng: Rng): Fixture[] => {
  const s = rng.shuffle(ids);
  const out: Fixture[] = [];
  for (let i = 0; i + 1 < s.length; i += 2) out.push({ day, home: s[i]!, away: s[i + 1]!, cup: true });
  return out;
};

/**
 * il tabellone della stagione: se i club non sono una potenza di 2, i meno blasonati fanno un turno preliminare.
 * Si sorteggia subito solo il primo turno; i giorni dei turni successivi sono già fissati.
 */
export function makeCup(world: WorldState, rng: Rng): Cup {
  const ids = Object.values(world.clubs).sort((a, b) => b.reputation - a.reputation).map((c) => c.id);
  // teste di serie: le prime S entrano quando le altre si sono ridotte a S (serve che le altre siano S·2^k)
  const S = CUP.seeds;
  let k = 0;
  while (S * 2 ** k < ids.length - S) k++;
  if (S * 2 ** k === ids.length - S && k > 0) {
    const n = k + Math.log2(2 * S);
    const days = CUP.days.slice(-n);
    const rounds = days.map((day) => ({ day, ties: [] as Fixture[] }));
    rounds[0]!.ties = pair(ids.slice(S), days[0]!, rng);
    return { season: world.season, rounds, byes: ids.slice(0, S), byesAt: k, winner: null };
  }
  // altrimenti: turno preliminare per i meno blasonati fino alla potenza di 2
  let p = 1;
  while (p * 2 <= ids.length) p *= 2;
  const prelim = ids.length > p ? 2 * (ids.length - p) : 0;
  const n = Math.log2(p) + (prelim ? 1 : 0);
  const days = CUP.days.slice(-n);
  const rounds = days.map((day) => ({ day, ties: [] as Fixture[] }));
  rounds[0]!.ties = pair(prelim ? ids.slice(ids.length - prelim) : ids, days[0]!, rng);
  return { season: world.season, rounds, byes: prelim ? ids.slice(0, ids.length - prelim) : [], byesAt: 1, winner: null };
}

export const cupFixtures = (world: WorldState): Fixture[] => world.cup?.rounds.flatMap((r) => r.ties) ?? [];

/** dopo una giornata: rigori per i pareggi, sorteggio del turno dopo, premi e notizie */
export function afterCupDay(world: WorldState, rng: Rng, day: number) {
  const cup = world.cup;
  if (!cup) return;
  const r = cup.rounds.findIndex((x) => x.day === day);
  if (r < 0) return;
  const round = cup.rounds[r]!;
  const me = world.manager.clubId;
  for (const fx of round.ties) {
    if (!fx.result || tieWinner(fx)) continue;
    const win = rng.int(3, 5);
    const lose = rng.int(Math.max(0, win - 3), win - 1);
    fx.pens = rng.next() < 0.5 ? [win, lose] : [lose, win];
  }
  if (round.ties.some((fx) => !fx.result)) return;
  const winners = round.ties.map((fx) => tieWinner(fx)!);
  const mine = round.ties.find((fx) => fx.home === me || fx.away === me);
  const last = r === cup.rounds.length - 1;
  if (mine) {
    const opp = world.clubs[mine.home === me ? mine.away : mine.home]!.name;
    const key = tieWinner(mine) !== me ? 'news.cup.out' : last ? 'news.cup.won' : 'news.cup.through';
    addNews(world, key, { opp, round: cup.rounds.length - r });
  }
  if (last) {
    cup.winner = winners[0]!;
    const runnerUp = round.ties[0]!.home === cup.winner ? round.ties[0]!.away : round.ties[0]!.home;
    for (const [id, v] of [[cup.winner, CUP.prize], [runnerUp, CUP.prize / 2]] as const) {
      const c = world.clubs[id]!;
      books(c, world.season).prize += v;
      c.balance += v;
    }
    world.cupWinners.push({ season: world.season, clubId: cup.winner });
    if (world.cupWinners.length > 30) world.cupWinners.shift();
    return;
  }
  const next = cup.rounds[r + 1]!;
  next.ties = pair(r + 1 === cup.byesAt ? [...cup.byes, ...winners] : winners, next.day, rng);
}
