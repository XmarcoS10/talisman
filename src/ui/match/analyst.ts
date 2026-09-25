// Frase dell'analista (GUIDA §8.4, P10 punto 5): regole sui dati live, nessun testo generato a caso.
// Ogni regola guarda il contesto e, se scatta, propone una lettura + un suggerimento concreto (testi in it.json).
import type { MP, MatchRun, TraceStep } from '../../engine/match/engine.ts';
import type { SideStats } from '../../engine/model.ts';

export interface Ctx {
  min: number;
  me: 0 | 1;
  my: SideStats;
  opp: SideStats;
  diff: number; // gol fatti − subiti
  poss: number; // possesso %
  xg: number;
  xgA: number;
  acc: number; // precisione passaggi 0-1
  ppda: number; // passaggi avversari per nostro contrasto (basso = pressiamo alto)
  ppdaA: number;
  boxShare: number; // quota di tiri dentro l'area
  crosses: number;
  momentum: number; // + noi, − loro
  tired: MP[];
  booked: MP[];
  best: MP | null;
  bestR: number;
  worst: MP | null;
  gk: MP | null;
  striker: MP | null;
  duelLoser: MP | null;
  subsLeft: number;
  mentality: number;
  oppMentality: number;
  fam: number;
  morale: number;
  lastGoalMin: number; // ultimo gol (chiunque), −99 se nessuno
  lastGoalUs: boolean;
}

export function context(run: MatchRun, me: 0 | 1, frames: TraceStep[], morale: number): Ctx {
  const team = run.teams[me], other = run.teams[me === 0 ? 1 : 0];
  const my = team.stats, opp = other.stats;
  const mine = frames.filter((f) => f.side === me);
  const shots = mine.filter((f) => f.kind === 'shot');
  const inBox = shots.filter((f) => (me === 0 ? f.bx >= 10.1 : f.bx <= 1.9) && f.by > 2.1 && f.by < 5.9);
  const on = team.on.filter((m) => m.pos !== 'GK');
  const by = (f: (m: MP) => number) => (on.length ? on.reduce((a, b) => (f(b) > f(a) ? b : a)) : null);
  const goals = run.events.filter((e) => e.type === 'goal' || e.type === 'penGoal');
  const last = goals[goals.length - 1];
  const poss = my.passes + opp.passes > 0 ? (100 * my.passes) / (my.passes + opp.passes) : 50; // come Opta: quota dei passaggi
  const bestM = by((m) => run.rating(m));
  return {
    min: run.minute(),
    me,
    my,
    opp,
    diff: run.score[me]! - run.score[me === 0 ? 1 : 0]!,
    poss: Math.round(poss),
    xg: my.xg,
    xgA: opp.xg,
    acc: my.passes ? my.passesOk / my.passes : 0.8,
    ppda: my.tackles ? opp.passes / my.tackles : 99,
    ppdaA: opp.tackles ? my.passes / opp.tackles : 99,
    boxShare: shots.length ? inBox.length / shots.length : 1,
    crosses: mine.filter((f) => f.kind === 'cross').length,
    momentum: (frames[frames.length - 1]?.mom ?? 0) * (me === 0 ? 1 : -1),
    tired: on.filter((m) => m.energy < 62).sort((a, b) => a.energy - b.energy),
    booked: team.on.filter((m) => m.st.yellows > 0),
    best: bestM,
    bestR: bestM ? run.rating(bestM) : 0,
    worst: on.length ? on.reduce((a, b) => (run.rating(b) < run.rating(a) ? b : a)) : null,
    gk: team.on.find((m) => m.pos === 'GK') ?? null,
    striker: by((m) => (m.pos === 'ST' || m.pos === 'AMC' ? m.p.attrs.finishing : 0)),
    duelLoser: by((m) => m.st.duelsLost),
    subsLeft: team.subs,
    mentality: team.mentality,
    oppMentality: other.mentality,
    fam: team.fam,
    morale,
    lastGoalMin: last?.min ?? -99,
    lastGoalUs: last?.side === me,
  };
}

type Rule = { id: string; prio: number; when: (c: Ctx) => boolean; vars?: (c: Ctx) => Record<string, string | number> };
const nm = (m: MP | null) => (m ? `${m.p.firstName[0]}. ${m.p.lastName}` : '');
const shots = (c: Ctx) => c.my.shots;

// 60 regole, dalle più urgenti alle più generiche
export const RULES: Rule[] = [
  { id: 'redUs', prio: 100, when: (c) => c.my.reds > 0 },
  { id: 'redThem', prio: 99, when: (c) => c.opp.reds > 0 },
  { id: 'twoBooked', prio: 95, when: (c) => c.booked.length >= 2, vars: (c) => ({ n: c.booked.length }) },
  { id: 'bookedRisk', prio: 88, when: (c) => c.booked.some((m) => m.p.attrs.aggression >= 14), vars: (c) => ({ name: nm(c.booked.find((m) => m.p.attrs.aggression >= 14) ?? null) }) },
  { id: 'tiredKey', prio: 86, when: (c) => c.tired.length > 0 && c.subsLeft > 0 && c.min > 55, vars: (c) => ({ name: nm(c.tired[0] ?? null), v: Math.round(c.tired[0]?.energy ?? 0) }) },
  { id: 'tiredMany', prio: 84, when: (c) => c.tired.length >= 3 && c.subsLeft > 0, vars: (c) => ({ n: c.tired.length }) },
  { id: 'noSubsLate', prio: 70, when: (c) => c.min > 70 && c.subsLeft >= 4 },
  { id: 'justConceded', prio: 92, when: (c) => c.lastGoalMin > 0 && !c.lastGoalUs && c.min - c.lastGoalMin <= 3 },
  { id: 'justScored', prio: 90, when: (c) => c.lastGoalMin > 0 && c.lastGoalUs && c.min - c.lastGoalMin <= 3 },
  { id: 'twoDownLate', prio: 89, when: (c) => c.diff <= -2 && c.min >= 60 },
  { id: 'twoUpLate', prio: 82, when: (c) => c.diff >= 2 && c.min >= 65 },
  { id: 'trailLate', prio: 87, when: (c) => c.diff === -1 && c.min >= 70 },
  { id: 'leadLate', prio: 80, when: (c) => c.diff === 1 && c.min >= 75 },
  { id: 'drawLate', prio: 78, when: (c) => c.diff === 0 && c.min >= 75 },
  { id: 'trailEarly', prio: 60, when: (c) => c.diff < 0 && c.min < 35 },
  { id: 'leadEarly', prio: 55, when: (c) => c.diff > 0 && c.min < 35 },
  { id: 'xgHighNoGoals', prio: 76, when: (c) => c.xg >= 1.2 && c.diff <= 0 && c.my.shots >= 8, vars: (c) => ({ xg: c.xg.toFixed(2) }) },
  { id: 'xgLowManyShots', prio: 72, when: (c) => shots(c) >= 8 && c.xg / Math.max(1, shots(c)) < 0.07, vars: (c) => ({ n: shots(c), xg: c.xg.toFixed(2) }) },
  { id: 'xgAHigh', prio: 74, when: (c) => c.xgA >= 1.2 && c.min > 40, vars: (c) => ({ xg: c.xgA.toFixed(2) }) },
  { id: 'luckyLead', prio: 68, when: (c) => c.diff > 0 && c.xgA > c.xg + 0.6, vars: (c) => ({ xg: c.xg.toFixed(2), xga: c.xgA.toFixed(2) }) },
  { id: 'unluckyTrail', prio: 69, when: (c) => c.diff < 0 && c.xg > c.xgA + 0.6, vars: (c) => ({ xg: c.xg.toFixed(2), xga: c.xgA.toFixed(2) }) },
  { id: 'xgBalanced', prio: 30, when: (c) => Math.abs(c.xg - c.xgA) < 0.2 && c.min > 30 },
  { id: 'fewShots', prio: 66, when: (c) => c.min > 30 && shots(c) < c.min / 10, vars: (c) => ({ n: shots(c) }) },
  { id: 'manyShots', prio: 40, when: (c) => shots(c) >= 12, vars: (c) => ({ n: shots(c) }) },
  { id: 'lowOnTarget', prio: 58, when: (c) => shots(c) >= 6 && c.my.onTarget / shots(c) < 0.25 },
  { id: 'longShots', prio: 64, when: (c) => shots(c) >= 5 && c.boxShare < 0.4, vars: (c) => ({ v: Math.round(c.boxShare * 100) }) },
  { id: 'boxShotsGood', prio: 32, when: (c) => shots(c) >= 5 && c.boxShare > 0.75 },
  { id: 'oppShotsMany', prio: 71, when: (c) => c.opp.shots >= shots(c) + 5, vars: (c) => ({ n: c.opp.shots }) },
  { id: 'possHigh', prio: 36, when: (c) => c.poss >= 62 && c.min > 25, vars: (c) => ({ v: c.poss }) },
  { id: 'possHighNoShots', prio: 73, when: (c) => c.poss >= 60 && shots(c) < 6 && c.min > 35, vars: (c) => ({ v: c.poss, n: shots(c) }) },
  { id: 'possLow', prio: 62, when: (c) => c.poss <= 40 && c.min > 25, vars: (c) => ({ v: c.poss }) },
  { id: 'possLowButDanger', prio: 48, when: (c) => c.poss <= 45 && c.xg > c.xgA },
  { id: 'accLow', prio: 65, when: (c) => c.my.passes > 80 && c.acc < 0.74, vars: (c) => ({ v: Math.round(c.acc * 100) }) },
  { id: 'accHigh', prio: 28, when: (c) => c.my.passes > 120 && c.acc > 0.86, vars: (c) => ({ v: Math.round(c.acc * 100) }) },
  { id: 'fewPasses', prio: 44, when: (c) => c.min > 30 && c.my.passes < c.min * 3 },
  { id: 'ppdaGood', prio: 34, when: (c) => c.ppda < 9 && c.min > 25, vars: (c) => ({ v: c.ppda.toFixed(1) }) },
  { id: 'ppdaBad', prio: 67, when: (c) => c.ppda > 18 && c.min > 25, vars: (c) => ({ v: c.ppda.toFixed(1) }) },
  { id: 'oppPressHigh', prio: 63, when: (c) => c.ppdaA < 8 && c.acc < 0.8, vars: (c) => ({ v: c.ppdaA.toFixed(1) }) },
  { id: 'weRecoverHigh', prio: 33, when: (c) => c.my.tackles >= c.opp.tackles + 6, vars: (c) => ({ n: c.my.tackles }) },
  { id: 'weLoseDuels', prio: 61, when: (c) => c.opp.tackles >= c.my.tackles + 6, vars: (c) => ({ n: c.opp.tackles }) },
  { id: 'duelLoser', prio: 59, when: (c) => (c.duelLoser?.st.duelsLost ?? 0) >= 4, vars: (c) => ({ name: nm(c.duelLoser), n: c.duelLoser?.st.duelsLost ?? 0 }) },
  { id: 'crossesMany', prio: 57, when: (c) => c.crosses >= 8 && c.xg < 1, vars: (c) => ({ n: c.crosses }) },
  { id: 'crossesNone', prio: 42, when: (c) => c.min > 40 && c.crosses <= 1 },
  { id: 'offsidesMany', prio: 56, when: (c) => c.my.offsides >= 4, vars: (c) => ({ n: c.my.offsides }) },
  { id: 'oppOffsides', prio: 31, when: (c) => c.opp.offsides >= 4, vars: (c) => ({ n: c.opp.offsides }) },
  { id: 'cornersMany', prio: 38, when: (c) => c.my.corners >= 7, vars: (c) => ({ n: c.my.corners }) },
  { id: 'foulsMany', prio: 54, when: (c) => c.my.fouls >= 12, vars: (c) => ({ n: c.my.fouls }) },
  { id: 'oppFoulsMany', prio: 35, when: (c) => c.opp.fouls >= 12, vars: (c) => ({ n: c.opp.fouls }) },
  { id: 'gkBusy', prio: 75, when: (c) => (c.gk?.st.saves ?? 0) >= 4, vars: (c) => ({ name: nm(c.gk), n: c.gk?.st.saves ?? 0 }) },
  { id: 'gkQuiet', prio: 26, when: (c) => c.min > 60 && (c.gk?.st.saves ?? 0) === 0 },
  { id: 'starPlayer', prio: 46, when: (c) => c.bestR >= 7.2 && c.min > 25, vars: (c) => ({ name: nm(c.best), v: c.bestR.toFixed(1) }) },
  { id: 'poorPlayer', prio: 52, when: (c) => c.worst !== null && c.min > 35 && c.worst.st.passes > 10 && c.worst.st.passesOk / Math.max(1, c.worst.st.passes) < 0.7, vars: (c) => ({ name: nm(c.worst) }) },
  { id: 'strikerQuiet', prio: 53, when: (c) => c.min > 45 && (c.striker?.st.shots ?? 9) <= 1, vars: (c) => ({ name: nm(c.striker) }) },
  { id: 'mentalityLowTrail', prio: 85, when: (c) => c.diff < 0 && c.mentality <= 2 && c.min > 55 },
  { id: 'mentalityHighLead', prio: 77, when: (c) => c.diff > 0 && c.mentality >= 4 && c.min > 70 },
  { id: 'oppAttacking', prio: 50, when: (c) => c.oppMentality >= 4, vars: (c) => ({ v: c.oppMentality }) },
  { id: 'oppDefending', prio: 49, when: (c) => c.oppMentality <= 2 && c.min > 20 },
  { id: 'famLow', prio: 51, when: (c) => c.fam < 70, vars: (c) => ({ v: Math.round(c.fam) }) },
  { id: 'moraleLow', prio: 47, when: (c) => c.morale < 45, vars: (c) => ({ v: Math.round(c.morale) }) },
  { id: 'moraleHigh', prio: 24, when: (c) => c.morale > 75, vars: (c) => ({ v: Math.round(c.morale) }) },
  { id: 'momentumUs', prio: 43, when: (c) => c.momentum > 35 },
  { id: 'momentumThem', prio: 45, when: (c) => c.momentum < -35 },
  { id: 'opening', prio: 20, when: (c) => c.min <= 10 },
  { id: 'halfTime', prio: 79, when: (c) => c.min >= 45 && c.min <= 47 },
  { id: 'lastTen', prio: 41, when: (c) => c.min >= 80 },
  { id: 'quiet', prio: 10, when: () => true },
];

/** la regola più urgente che non è già stata detta di recente */
export function pick(c: Ctx, saidAt: Map<string, number>): { id: string; vars: Record<string, string | number> } | null {
  let best: Rule | null = null;
  for (const r of RULES) {
    if (!r.when(c)) continue;
    const said = saidAt.get(r.id);
    if (said !== undefined && c.min - said < 20) continue;
    if (!best || r.prio > best.prio) best = r;
  }
  if (!best) return null;
  saidAt.set(best.id, c.min);
  return { id: best.id, vars: best.vars?.(c) ?? {} };
}

