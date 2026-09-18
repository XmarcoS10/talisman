// Grafo sociale dello spogliatoio (GUIDA §7.3): relazioni, gerarchia, liti e faide.
import { PSYCH } from './balance.ts';
import type { Club, Feud, Player, PlayerId, WorldState } from './model.ts';
import { addCause, addNews, pName } from './news.ts';
import { age } from './players.ts';
import type { Rng } from './rng.ts';

const LANG: Record<string, string> = {
  ITA: 'it', ESP: 'es', ARG: 'es', FRA: 'fr', SEN: 'fr', BRA: 'pt', POR: 'pt', NED: 'nl', SRB: 'sh', CRO: 'sh', NGA: 'en', SWE: 'sv',
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const relOf = (a: Player, b: Player) => a.rel[b.id] ?? 0;

/** cambia la relazione tra a e b (simmetrica); gli archi quasi neutri non si salvano */
export function bond(a: Player, b: Player, delta: number) {
  const s = Math.round(clamp(relOf(a, b) + delta, -100, 100) * 10) / 10;
  if (Math.abs(s) < 5) { delete a.rel[b.id]; delete b.rel[a.id]; }
  else { a.rel[b.id] = s; b.rel[a.id] = s; }
}

/** affinità naturale tra due compagni: nazionalità, lingua, età, carattere, concorrenza per il posto */
function affinity(rng: Rng, a: Player, b: Player, season: number): number {
  let s = rng.gauss(0, PSYCH.noise);
  if (a.nation === b.nation) s += PSYCH.sameNation;
  else if (LANG[a.nation] === LANG[b.nation]) s += PSYCH.sameLanguage;
  if (Math.abs(age(a, season) - age(b, season)) <= 3) s += PSYCH.closeAge;
  s += (a.personality.sociability + b.personality.sociability - 22) * PSYCH.sociability;
  if (a.position === b.position && Math.abs(a.ca - b.ca) < 15) s -= PSYCH.roleRivalry;
  return s;
}

/** relazioni iniziali dei nuovi arrivati (o di tutta la rosa) con i compagni */
export function initRelations(world: WorldState, club: Club, rng: Rng, newcomers: Player[] = club.playerIds.map((id) => world.players[id]!)) {
  const isNew = new Set(newcomers.map((p) => p.id));
  for (const a of newcomers)
    for (const id of club.playerIds) {
      const b = world.players[id]!;
      if (b === a || (isNew.has(b.id) && b.id < a.id)) continue; // ogni coppia una volta
      const s = affinity(rng, a, b, world.season);
      if (Math.abs(s) >= PSYCH.edgeMin) bond(a, b, clamp(s, -60, 60));
    }
}

/** chi lascia il club (ritiro, cessione) sparisce dal grafo */
export function dropRelations(world: WorldState, p: Player) {
  for (const id of Object.keys(p.rel)) delete world.players[Number(id)]?.rel[p.id];
  p.rel = {};
}

/** anni consecutivi nel club attuale */
const seniority = (p: Player) => {
  let n = 0;
  for (let i = p.history.length - 1; i >= 0 && p.history[i]!.clubId === p.clubId; i--) n++;
  return n;
};

/** influenza nello spogliatoio 0-100 (derivata, mai salvata): leadership, carisma, qualità, anzianità, minuti, rendimento */
export function influence(world: WorldState, club: Club): Map<PlayerId, number> {
  const raw = new Map<PlayerId, number>();
  let max = 1;
  for (const id of club.playerIds) {
    const p = world.players[id]!;
    const form = p.form.length ? p.form.reduce((s, v) => s + v, 0) / p.form.length : 6.6;
    const v = 2 * p.attrs.leadership + 1.5 * p.attrs.socialInfluence + 0.15 * p.ca + 4 * Math.min(5, seniority(p))
      + 20 * p.psych.minutes + 3 * (form - 6.6) + Math.min(12, Math.max(0, age(p, world.season) - 18) * 0.8);
    raw.set(id, Math.max(1, v));
    max = Math.max(max, v);
  }
  for (const [id, v] of raw) raw.set(id, Math.round((100 * v) / max));
  return raw;
}

/** il gruppo dirigente: i più influenti (§7.3) */
export const leaders = (infl: Map<PlayerId, number>, n = 4) => [...infl].sort((a, b) => b[1] - a[1]).slice(0, n).map(([id]) => id);

/** evoluzione settimanale del grafo: amicizie che crescono, ferite che si rimarginano, rivalità per il posto, liti */
export function weekSocial(world: WorldState, club: Club, rng: Rng, infl: Map<PlayerId, number>) {
  const me = club.id === world.manager.clubId;
  const players = club.playerIds.map((id) => world.players[id]!);
  for (const a of players) {
    for (const [key, s] of Object.entries(a.rel)) {
      const b = world.players[Number(key)];
      if (!b || b.id < a.id) continue;
      if (s > 0 && s < 80) bond(a, b, (PSYCH.friendDrift * (a.personality.sociability + b.personality.sociability)) / 20);
      else if (s < 0) bond(a, b, PSYCH.healDrift);
    }
  }
  // concorrenza per il posto: chi resta fuori (ed è ambizioso) si inasprisce con chi gioca al suo posto
  for (const a of players)
    for (const b of players)
      if (a !== b && a.position === b.position && a.psych.minutes < 0.3 && b.psych.minutes > 0.6 && a.personality.ambition >= 12)
        bond(a, b, -PSYCH.rivalryDrift);
  // lite in allenamento: la accende chi ha un carattere esplosivo (temperamento basso)
  if (players.length > 1 && rng.next() < PSYCH.bustupP) {
    const hot = (p: Player) => (21 - p.personality.temperament) ** 2;
    const a = players[rng.weighted(players.map(hot))]!;
    const others = players.filter((p) => p !== a);
    const b = others[rng.weighted(others.map(hot))]!;
    bond(a, b, -(20 + rng.int(0, 15)));
    a.psych.morale -= 5;
    b.psych.morale -= 5;
    if (me) {
      addNews(world, 'news.bustup', { a: pName(a), b: pName(b) });
      addCause(world, a, 'cause.bustup', { other: pName(b) });
      addCause(world, b, 'cause.bustup', { other: pName(a) });
    }
  }
  // faide: due giocatori influenti ai ferri corti
  club.feuds = club.feuds.filter((f) => {
    const a = world.players[f.a], b = world.players[f.b];
    return a && b && a.clubId === club.id && b.clubId === club.id && relOf(a, b) <= -40;
  });
  for (const a of players)
    for (const [key, s] of Object.entries(a.rel)) {
      const b = world.players[Number(key)];
      if (!b || b.id < a.id || s > PSYCH.feudAt || b.clubId !== club.id) continue;
      if ((infl.get(a.id) ?? 0) < PSYCH.feudInfluence || (infl.get(b.id) ?? 0) < PSYCH.feudInfluence) continue;
      if (club.feuds.some((f) => (f.a === a.id && f.b === b.id) || (f.a === b.id && f.b === a.id))) continue;
      if (!me) { bond(a, b, -30 - s); continue; } // l'allenatore dell'IA media subito
      club.feuds.push({ a: a.id, b: b.id, season: world.season, day: world.day });
      addNews(world, 'news.feud', { a: pName(a), b: pName(b) });
    }
}

/** intervento dell'allenatore in una faida: dare ragione a uno dei due */
export function sideWith(world: WorldState, club: Club, feud: Feud, winnerId: PlayerId) {
  const w = world.players[winnerId]!;
  const l = world.players[winnerId === feud.a ? feud.b : feud.a]!;
  w.psych.trust = clamp(w.psych.trust + 10, 0, 100);
  l.psych.trust = clamp(l.psych.trust - 25, 0, 100);
  l.psych.morale = clamp(l.psych.morale - 10, 0, 100);
  for (const [key, s] of Object.entries(l.rel)) {
    const f = world.players[Number(key)];
    if (f && s >= 40 && f !== w) f.psych.trust = clamp(f.psych.trust - 5, 0, 100); // gli amici dello sconfitto
  }
  bond(w, l, -50 - relOf(w, l)); // restano rivali, ma la questione è chiusa
  club.feuds = club.feuds.filter((f) => f !== feud);
  addCause(world, w, 'cause.feudWon', { other: pName(l) });
  addCause(world, l, 'cause.feudLost', { other: pName(w) });
}

/** mediare: riesce più facilmente tra caratteri calmi; se fallisce peggiora */
export function mediate(world: WorldState, club: Club, feud: Feud, rng: Rng): boolean {
  const a = world.players[feud.a]!, b = world.players[feud.b]!;
  const ok = rng.next() < 0.3 + ((a.personality.temperament + b.personality.temperament) / 40) * 0.4;
  if (ok) {
    bond(a, b, -20 - relOf(a, b));
    club.feuds = club.feuds.filter((f) => f !== feud);
  } else bond(a, b, -10);
  for (const p of [a, b]) {
    p.psych.trust = clamp(p.psych.trust + (ok ? 5 : -5), 0, 100);
    addCause(world, p, ok ? 'cause.mediateOk' : 'cause.mediateFail', { other: pName(p === a ? b : a) });
  }
  return ok;
}
