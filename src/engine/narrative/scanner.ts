// Lo scanner narrativo (GUIDA §7.4): ogni settimana valuta le regole sui fatti, fa avanzare gli archi aperti,
// ne apre di nuovi e scrive le tappe. I testi escono da template a grammatica, mai da un modello a runtime.
import CLUB_T from '../../data/narrative/club.json' with { type: 'json' };
import FRAG from '../../data/narrative/fragments.json' with { type: 'json' };
import PLAYER_T from '../../data/narrative/player.json' with { type: 'json' };
import type { Arc, Position, WorldState } from '../model.ts';
import { addNews } from '../news.ts';
import type { Rng } from '../rng.ts';
import { arcKey, type Rule, type Step } from './arc.ts';
import { facts } from './facts.ts';
import { article, numWord, ordinal, teamForms } from './italian.ts';
import { CLUB_RULES } from './rules/club.ts';
import { PLAYER_RULES } from './rules/player.ts';
import { write, type Grammar, type Vars } from './text.ts';

export const RULES: Rule[] = [...CLUB_RULES, ...PLAYER_RULES];
const BY_ID = new Map(RULES.map((r) => [r.id, r]));
export const TEMPLATES: Record<string, string[]> = { ...CLUB_T, ...PLAYER_T };
export const GRAMMAR: Grammar = FRAG;

const MAX_NEW = 3; // storie nuove a settimana: il feed deve restare leggibile
const MEMORY = 150; // archi chiusi che si ricordano

const ROLE: Record<Position, [string, 'm' | 'f']> = {
  GK: ['portiere', 'm'], DL: ['terzino', 'm'], DR: ['terzino', 'm'], DC: ['difensore', 'm'], DM: ['mediano', 'm'],
  ML: ['esterno', 'm'], MR: ['esterno', 'm'], MC: ['centrocampista', 'm'], AMC: ['trequartista', 'm'],
  AML: ['ala', 'f'], AMR: ['ala', 'f'], ST: ['attaccante', 'm'],
};

/** tutte le variabili di un arco: squadre flesse, giocatore, numeri in lettere, allenatore */
export function varsFor(world: WorldState, arc: Arc): Vars {
  const v: Vars = { ...arc.data };
  const s = arc.subject;
  if (s.club !== undefined && world.clubs[s.club]) Object.assign(v, teamForms('club', world.clubs[s.club]!.city));
  if (s.rival !== undefined && world.clubs[s.rival]) Object.assign(v, teamForms('rival', world.clubs[s.rival]!.city));
  const p = s.player !== undefined ? world.players[s.player] : undefined;
  if (p) {
    const [role, g] = ROLE[p.position];
    Object.assign(v, { nome: `${p.firstName} ${p.lastName}`, cognome: p.lastName, ruolo: role, ruolo_art: `${article(role, g)}${article(role, g).endsWith("'") ? '' : ' '}${role}` });
  }
  for (const [k, x] of Object.entries(arc.data)) {
    if (typeof x !== 'number') continue;
    v[`${k}_w`] = numWord(x);
    v[`${k}_o`] = ordinal(x, 'm');
    v[`${k}_a`] = ordinal(x, 'f');
  }
  // l'allenatore ha un nome solo se è l'utente: degli altri club si parla di "l'allenatore"
  v.mister = involvesMe(world, arc) && world.manager.name ? world.manager.name : "l'allenatore";
  return v;
}

/** frasi già scritte in questa stagione: nessuna può ripetersi più di tre volte */
function seenThisSeason(world: WorldState): Map<string, number> {
  const seen = new Map<string, number>();
  for (const a of world.arcs) for (const l of a.lines) if (l.season === world.season) seen.set(l.text, (seen.get(l.text) ?? 0) + 1);
  return seen;
}

const involvesMe = (world: WorldState, a: Arc) => {
  const me = world.manager.clubId;
  return a.subject.club === me || a.subject.rival === me;
};

function tell(world: WorldState, arc: Arc, kind: 'open' | Step | 'faded', rng: Rng, seen: Map<string, number>) {
  const key = kind === 'next' ? `${arc.rule}.next` : `${arc.rule}.${kind}`;
  const tpl = TEMPLATES[key];
  if (!tpl?.length) return;
  const text = write(tpl, varsFor(world, arc), GRAMMAR, rng, seen);
  arc.lines.push({ season: world.season, day: world.day, text });
  // notifiche non invasive: in notizia solo quello che riguarda te o fa prima pagina
  if (involvesMe(world, arc) || (BY_ID.get(arc.rule)?.priority ?? 0) >= 5) addNews(world, 'news.story', { text });
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

