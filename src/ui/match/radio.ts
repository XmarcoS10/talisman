// Radiocronaca delle partite che non guardi (0.5.0): si scrive al momento della lettura da quello che la partita ha
// già salvato (eventi, statistiche), come le storie del Blocco 5. Niente motore, niente partite rigiocate, niente
// salvataggi più pesanti; la stessa partita si legge in italiano o in inglese. Le frasi variano, ma sono sempre le stesse
// per la stessa partita (scelta da un hash, niente caso).
import type { Fixture, MatchEvent, WorldState } from '../../engine/model.ts';
import { shortName } from '../bits.tsx';
import { fmtN, t } from '../i18n.ts';

export interface RadioLine { min: number; text: string; big: boolean }

/** quante varianti ha ogni tipo di frase (le chiavi radio.<tipo>.<n> in it.json ed en.json) */
const V = { kickoff: 3, goal: 4, penGoal: 2, penMiss: 2, chance: 3, yellow: 2, red: 2, injury: 2, sub: 2, half: 3, end: 3 } as const;
type Kind = keyof typeof V;

function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/** la frase di un tipo, variante stabile per partita e posizione */
function say(fxKey: string, kind: Kind, i: number, vars: Record<string, string | number>) {
  // le chiavi sono radio.<tipo>.<n>: tutte presenti in it.json ed en.json, controllate da radio.test.ts
  return t(`radio.${kind}.${hash(`${fxKey}:${kind}:${i}`) % V[kind]}`, vars);
}

export function radio(world: WorldState, fx: Fixture): RadioLine[] {
  const r = fx.result;
  if (!r) return [];
  const club = [world.clubs[fx.home]!, world.clubs[fx.away]!];
  const key = `${world.season}:${fx.day}:${fx.home}:${fx.away}`;
  const name = (id: number | undefined) => { const p = id !== undefined ? world.players[id] : undefined; return p ? shortName(p) : '?'; };
  const score = [0, 0];
  const out: RadioLine[] = [{ min: 0, text: say(key, 'kickoff', 0, { home: club[0]!.name, away: club[1]!.name }), big: false }];
  const all = [...r.events].sort((a, b) => a.min - b.min);
  // il secondo giallo: il motore registra il giallo e poi il rosso; la radio dice una cosa sola
  const sentOff = new Set(all.filter((e) => e.type === 'red').map((e) => `${e.playerId}:${e.min}`));
  const booked = new Set<number>(); // chi ha già un giallo
  const events: MatchEvent[] = [];
  for (const e of all) {
    if (e.type === 'plan' || (e.type === 'chance' && (e.xg ?? 0) < 0.25)) continue;
    if (e.type === 'yellow') {
      if (booked.has(e.playerId) && sentOff.has(`${e.playerId}:${e.min}`)) continue; // il secondo giallo lo racconta il rosso
      booked.add(e.playerId);
    }
    events.push(e);
  }
  let halfDone = false;
  events.forEach((e: MatchEvent, i) => {
    if (!halfDone && e.min > 45) { out.push(half(key, club.map((c) => c.name), score)); halfDone = true; }
    const team = club[e.side]!.name;
    if (e.type === 'goal' || e.type === 'penGoal') score[e.side]!++;
    const vars = { min: e.min, name: name(e.playerId), team, other: name(e.assistId), score: `${score[0]}-${score[1]}`, xg: fmtN(e.xg ?? 0, 2) };
    const kind: Kind = e.type === 'goal' && e.assistId === undefined ? 'goal' : (e.type as Kind);
    const text = e.type === 'goal' && e.assistId !== undefined ? t(`radio.assist.${hash(`${key}:a:${i}`) % 2}`, vars)
      : e.type === 'red' && booked.has(e.playerId) ? t('radio.red2', vars) : say(key, kind, i, vars);
    out.push({ min: e.min, text, big: e.type === 'goal' || e.type === 'penGoal' || e.type === 'red' });
  });
  if (!halfDone) out.push(half(key, club.map((c) => c.name), score));
  const s = r.stats;
  out.push({ min: 90, big: true, text: say(key, 'end', 0, {
    home: club[0]!.name, away: club[1]!.name, score: `${r.hg}-${r.ag}`, pos: s[0].possession, shots: `${s[0].shots}-${s[1].shots}`,
  }) });
  return out;
}

function half(key: string, names: string[], score: number[]): RadioLine {
  return { min: 45, big: false, text: say(key, 'half', 0, { home: names[0]!, away: names[1]!, score: `${score[0]}-${score[1]}` }) };
}

export const RADIO_KEYS = [...Object.entries(V).flatMap(([k, n]) => Array.from({ length: n }, (_, i) => `radio.${k}.${i}`)), 'radio.assist.0', 'radio.assist.1', 'radio.red2'];
