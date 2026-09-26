// Lo scanner narrativo (GUIDA §7.4): ogni settimana valuta le regole sui fatti, fa avanzare gli archi aperti,
// ne apre di nuovi e scrive le tappe. I testi escono da template a grammatica, mai da un modello a runtime.
import type { Arc, WorldState } from '../model.ts';
import { addNews } from '../news.ts';
import type { Rng } from '../rng.ts';
import { arcKey, type Rule, type Step } from './arc.ts';
import { facts } from './facts.ts';
import { CLUB_RULES } from './rules/club.ts';
import { PLAYER_RULES } from './rules/player.ts';
import { compose, GRAMMARS, pack, rawVars, render, TEXTS } from './say.ts';
import type { Grammar } from './text.ts';

export const RULES: Rule[] = [...CLUB_RULES, ...PLAYER_RULES];
const BY_ID = new Map(RULES.map((r) => [r.id, r]));
/** i testi italiani (gli inglesi stanno accanto, in say.ts: TEXTS.en) */
export const TEMPLATES: Record<string, string[]> = TEXTS.it;
export const GRAMMAR: Grammar = GRAMMARS.it;

const MAX_NEW = 3; // storie nuove a settimana: il feed deve restare leggibile
const MEMORY = 150; // archi chiusi che si ricordano

export { rawVars as varsFor };

/** frasi già scritte in questa stagione: nessuna può ripetersi più di tre volte */
function seenThisSeason(world: WorldState): Map<string, number> {
  const seen = new Map<string, number>();
  for (const a of world.arcs) for (const l of a.lines) {
    if (l.season !== world.season) continue;
    const text = render(l.text);
    seen.set(text, (seen.get(text) ?? 0) + 1);
  }
  return seen;
}

const involvesMe = (world: WorldState, a: Arc) => {
  const me = world.manager.clubId;
  return a.subject.club === me || a.subject.rival === me;
};

function tell(world: WorldState, arc: Arc, kind: 'open' | Step | 'faded', rng: Rng, seen: Map<string, number>) {
  const key = kind === 'next' ? `${arc.rule}.next` : `${arc.rule}.${kind}`;
  if (!TEMPLATES[key]?.length) return;
  // si salva la frase da scrivere, non la frase scritta: la scrive chi legge, nella sua lingua
  const text = compose(key, rawVars(world, arc), rng, seen);
  arc.lines.push({ season: world.season, day: world.day, text });
  // notifiche non invasive: in notizia solo quello che riguarda te o fa prima pagina
  if (involvesMe(world, arc) || (BY_ID.get(arc.rule)?.priority ?? 0) >= 5) addNews(world, 'news.story', { text: pack(text) });
}

/** la settimana delle storie */
export function weekStories(world: WorldState, rng: Rng) {
  const f = facts(world);
  if (!f || f.round === 0) return;
  const seen = seenThisSeason(world);

  // 1. gli archi aperti avanzano, si chiudono o sfumano
  for (const arc of world.arcs) {
    if (arc.state !== 'open') continue;
    const rule = BY_ID.get(arc.rule);
    if (!rule) { arc.state = 'faded'; continue; }
    if (f.now > arc.until) { arc.state = 'faded'; tell(world, arc, 'faded', rng, seen); continue; }
    const r = rule.step?.(arc, f);
    if (!r || r.step === 'stay') continue;
    if (r.data) Object.assign(arc.data, r.data);
    if (r.step === 'next') { arc.stage++; tell(world, arc, 'next', rng, seen); continue; }
    arc.state = r.step;
    tell(world, arc, r.step, rng, seen);
  }

  // 2. storie nuove: non già aperte, non in pausa di cooldown, le più importanti per prime
  const last = new Map<string, number>();
  for (const a of world.arcs) {
    const k = arcKey(a.rule, a.subject);
    if (a.state === 'open') last.set(k, Infinity);
    else last.set(k, Math.max(last.get(k) ?? -Infinity, a.opened));
  }
  const candidates = RULES.flatMap((rule) => rule.detect(f).map((hit) => ({ rule, hit, key: arcKey(rule.id, hit.subject) })))
    .filter((c) => { const t = last.get(c.key); return t === undefined || (t !== Infinity && f.now - t >= c.rule.cooldown); })
    .map((c) => ({ ...c, score: c.rule.priority + (c.hit.subject.club === f.me || c.hit.subject.rival === f.me ? 2 : 0) + rng.next() * 0.5 }))
    .sort((a, b) => b.score - a.score);
  const used = new Set<string>();
  let opened = 0;
  for (const c of candidates) {
    if (opened >= MAX_NEW || used.has(c.rule.id)) continue;
    used.add(c.rule.id);
    const arc: Arc = {
      id: world.nextArcId++, rule: c.rule.id, subject: c.hit.subject, stage: 0, state: 'open',
      opened: f.now, until: f.now + c.rule.ttl, data: { ...c.hit.data }, lines: [],
    };
    world.arcs.push(arc);
    tell(world, arc, 'open', rng, seen);
    opened++;
  }

  // 3. memoria: gli aperti restano tutti, dei chiusi si tengono i più recenti
  const closed = world.arcs.filter((a) => a.state !== 'open');
  if (closed.length > MEMORY) {
    const drop = new Set(closed.slice(0, closed.length - MEMORY));
    world.arcs = world.arcs.filter((a) => !drop.has(a));
  }
}

