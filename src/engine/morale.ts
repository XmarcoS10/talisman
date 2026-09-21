// Morale multi-componente, contagio emotivo, promesse ed esclusioni (GUIDA §7.3).
import { AGENT, PSYCH } from './balance.ts';
import type { Club, Player, PlayerId, PlayerPromise, WorldState } from './model.ts';
import { addCause, addNews, pName } from './news.ts';
import { age } from './players.ts';
import type { Rng } from './rng.ts';
import { bond, influence, leaders, weekSocial } from './social.ts';
import { agentOf, remember } from './transfers/agents.ts';
import { clamp } from './util.ts';


export type SquadStatus = 'key' | 'first' | 'rotation' | 'backup' | 'youth';
export const EXPECTED: Record<SquadStatus, number> = { key: 0.9, first: 0.7, rotation: 0.35, backup: 0.1, youth: 0.03 };

/** minutaggio di partenza (mondo nuovo o salvataggio migrato): quello atteso dallo status */
export function seedMinutes(world: WorldState, club: Club) {
  for (const [id, st] of squadStatus(world, club)) world.players[id]!.psych.minutes = EXPECTED[st];
}

/** status in rosa (derivato dalla qualità): stabilisce quanto si aspetta di giocare */
export function squadStatus(world: WorldState, club: Club): Map<PlayerId, SquadStatus> {
  const out = new Map<PlayerId, SquadStatus>();
  const players = club.playerIds.map((id) => world.players[id]!).sort((a, b) => b.ca - a.ca);
  players.filter((p) => p.position === 'GK').forEach((p, i) => out.set(p.id, i === 0 ? 'first' : 'backup'));
  players.filter((p) => p.position !== 'GK').forEach((p, i) => {
    const s: SquadStatus = i < 3 ? 'key' : i < 10 ? 'first' : i < 15 ? 'rotation' : 'backup';
    out.set(p.id, age(p, world.season) <= 19 && i >= 10 ? 'youth' : s);
  });
  return out;
}

/** punti/partita nelle ultime 5 e punti/partita attesi per la reputazione (rango nel campionato) */
function results(world: WorldState, club: Club): { ppg: number; expected: number } {
  const comp = world.competitions[club.compId]!;
  const byRep = [...comp.clubIds].sort((a, b) => world.clubs[b]!.reputation - world.clubs[a]!.reputation);
  const expected = 2.1 - (1.2 * byRep.indexOf(club.id)) / Math.max(1, byRep.length - 1);
  const last = comp.fixtures.filter((f) => f.result && (f.home === club.id || f.away === club.id)).slice(-5);
  if (!last.length) return { ppg: expected, expected };
  const pts = last.reduce((s, f) => {
    const d = f.home === club.id ? f.result!.hg - f.result!.ag : f.result!.ag - f.result!.hg;
    return s + (d > 0 ? 3 : d === 0 ? 1 : 0);
  }, 0);
  return { ppg: pts / last.length, expected };
}

export type MoraleParts = { minutes: number; results: number; trust: number; form: number; status: number; feud: number };

/** da cosa dipende il morale del giocatore adesso (mostrato nel profilo) */
export function moraleParts(world: WorldState, club: Club, p: Player, status: SquadStatus, res = results(world, club)): MoraleParts {
  const promised = world.promises.some((x) => x.playerId === p.id);
  let diff = p.psych.minutes - EXPECTED[status];
  if (promised) diff *= 0.5; // ha una promessa: aspetta
  const minutes = diff < 0 ? Math.max(-25, diff * PSYCH.minutesPenalty * (0.5 + p.personality.ambition / 20)) : Math.min(8, diff * 15);
  const form = p.form.length ? clamp((p.form.slice(-3).reduce((s, v) => s + v, 0) / Math.min(3, p.form.length) - 6.65) * PSYCH.formK, -8, 8) : 0;
  return {
    minutes,
    results: clamp((res.ppg - res.expected) * PSYCH.resultsK, -15, 12),
    trust: (p.psych.trust - 50) * PSYCH.trustK,
    form,
    status: club.excluded.includes(p.id) ? -PSYCH.excludedPenalty : 0,
    feud: club.feuds.some((f) => f.a === p.id || f.b === p.id) ? -PSYCH.feudPenalty : 0,
  };
}

export const moraleTarget = (m: MoraleParts) => clamp(PSYCH.moraleBase + m.minutes + m.results + m.trust + m.form + m.status + m.feud, 5, 98);

/** settimana dello spogliatoio: grafo, morale verso il bersaglio, contagio, fiducia nell'allenatore */
export function weekPsych(world: WorldState, club: Club, rng: Rng) {
  const infl = influence(world, club);
  weekSocial(world, club, rng, infl);
  const status = squadStatus(world, club);
  const res = results(world, club);
  const players = club.playerIds.map((id) => world.players[id]!);
  const trustBase = club.id === world.manager.clubId ? 50 + clamp((world.manager.kept - world.manager.broken) * 3, -20, 20) : 50;
  for (const p of players) {
    const target = moraleTarget(moraleParts(world, club, p, status.get(p.id)!, res));
    const r = p.attrs.resilience / 20;
    const rate = target > p.psych.morale ? PSYCH.moraleUp + 0.2 * r : PSYCH.moraleDown - 0.12 * r;
    p.psych.morale += (target - p.psych.morale) * rate;
    p.psych.trust += (trustBase - p.psych.trust) * 0.03;
  }
  // contagio emotivo: morale_i += Σ_j w_ij · (morale_j − morale_i) · influenza_j · k, attenuato dalla Resilienza
  const snap = players.map((p) => p.psych.morale);
  players.forEach((p, i) => {
    let d = 0;
    players.forEach((q, j) => {
      if (i === j) return;
      const w = 0.3 + (Math.max(0, p.rel[q.id] ?? 0) / 100) * 0.7;
      d += w * (snap[j]! - snap[i]!) * ((infl.get(q.id) ?? 0) / 100);
    });
    p.psych.morale = Math.round(clamp(p.psych.morale + d * PSYCH.contagion * (1 - p.attrs.resilience / 40), 0, 100) * 10) / 10;
    p.psych.trust = Math.round(clamp(p.psych.trust, 0, 100) * 10) / 10;
  });
}

/** dopo una partita: minutaggio, legami di chi ha vinto insieme, verifica delle promesse */
export function afterMatch(world: WorldState, club: Club, mins: Map<PlayerId, { mins: number; started: boolean }>, won: boolean) {
  for (const id of club.playerIds) {
    const p = world.players[id]!;
    p.psych.minutes = Math.round(((1 - PSYCH.minutesEma) * p.psych.minutes + (PSYCH.minutesEma * (mins.get(id)?.mins ?? 0)) / 90) * 1000) / 1000;
  }
  if (won) {
    const played = [...mins.keys()].map((id) => world.players[id]!);
    for (const a of played) for (const b of played) if (a.id < b.id && (a.rel[b.id] ?? 0) > 0) bond(a, b, PSYCH.winBond);
  }
  if (club.id !== world.manager.clubId) return;
  for (const pr of [...world.promises]) {
    const p = world.players[pr.playerId];
    if (!p || p.clubId !== club.id) { world.promises = world.promises.filter((x) => x !== pr); continue; }
    const m = mins.get(p.id);
    if (m && (pr.kind === 'minutes' || m.started)) pr.apps++;
    if (--pr.left <= 0 || pr.apps >= pr.need) resolvePromise(world, club, pr, pr.apps >= pr.need);
  }
}

const others = (world: WorldState, club: Club, p: Player) => club.playerIds.filter((id) => id !== p.id).map((id) => world.players[id]!);

function resolvePromise(world: WorldState, club: Club, pr: PlayerPromise, kept: boolean) {
  world.promises = world.promises.filter((x) => x !== pr);
  const p = world.players[pr.playerId]!;
  const ps = p.psych;
  const agent = agentOf(world, p); // l'agente se lo ricorda, e alla prossima trattativa si vede
  if (agent) remember(agent, club.id, kept ? AGENT.keptPromise : -AGENT.brokenPromise);
  if (kept) {
    world.manager.kept++;
    ps.trust = clamp(ps.trust + 12, 0, 100);
    ps.morale = clamp(ps.morale + 8, 0, 100);
    for (const q of others(world, club, p)) q.psych.trust = clamp(q.psych.trust + 1, 0, 100); // fiducia diffusa
    addNews(world, 'news.promiseKept', { name: pName(p) });
    addCause(world, p, 'cause.promiseKept');
  } else {
    world.manager.broken++;
    ps.trust = clamp(ps.trust - 30, 0, 100);
    ps.morale = clamp(ps.morale - 15, 0, 100);
    ps.wantsOut = true;
    for (const q of others(world, club, p)) q.psych.trust = clamp(q.psych.trust - ((p.rel[q.id] ?? 0) >= 40 ? 6 : 2), 0, 100);
    addNews(world, 'news.promiseBroken', { name: pName(p) });
    addCause(world, p, 'cause.promiseBroken');
  }
}

/** promessa di spazio: sollievo immediato, meno se l'allenatore ha fama di non mantenerle */
export function makePromise(world: WorldState, p: Player, kind: PlayerPromise['kind']) {
  if (world.promises.some((x) => x.playerId === p.id)) return;
  world.promises.push({ playerId: p.id, kind, need: PSYCH.promiseNeed[kind], left: PSYCH.promiseWindow, apps: 0 });
  const credible = world.manager.broken > world.manager.kept + 1 ? 0.5 : 1;
  p.psych.trust = clamp(p.psych.trust + 8 * credible, 0, 100);
  p.psych.morale = clamp(p.psych.morale + 6 * credible, 0, 100);
  addCause(world, p, `cause.promise.${kind}`);
}

/** fuori rosa: se è un leader il gruppo reagisce */
export function exclude(world: WorldState, club: Club, p: Player) {
  if (club.excluded.includes(p.id)) return;
  const wasLeader = leaders(influence(world, club)).includes(p.id);
  club.excluded.push(p.id);
  club.lineup = club.lineup?.map((id) => (id === p.id ? null : id));
  p.psych.trust = clamp(p.psych.trust - 35, 0, 100);
  p.psych.morale = clamp(p.psych.morale - 15, 0, 100);
  addCause(world, p, 'cause.excluded');
  const lead = new Set(leaders(influence(world, club)));
  for (const q of others(world, club, p)) {
    const r = Math.max(0, p.rel[q.id] ?? 0);
    const hit = wasLeader ? (r / 100) * 12 + (lead.has(q.id) ? 8 : 0) : r >= 40 ? 3 : 0;
    if (hit > 0) {
      q.psych.trust = clamp(q.psych.trust - hit, 0, 100);
      if (hit >= 5) addCause(world, q, 'cause.teammateExcluded', { name: pName(p) });
    }
  }
  if (wasLeader) addNews(world, 'news.leaderExcluded', { name: pName(p) });
}

export function reinstate(world: WorldState, club: Club, p: Player) {
  if (!club.excluded.includes(p.id)) return;
  club.excluded = club.excluded.filter((id) => id !== p.id);
  p.psych.trust = clamp(p.psych.trust + 10, 0, 100);
  addCause(world, p, 'cause.reinstated');
}
