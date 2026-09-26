// Frasi scritte al momento della lettura (Blocco 5, scelta A di Marco). Il motore non salva più la frase finita di una
// storia o di una conferenza stampa, ma «quale testo, con quali dati, con quale seme» (`Said`): chi la legge la scrive
// nella sua lingua, e cambiando lingua anche le storie già passate si rileggono nella lingua nuova. I dati sono neutri
// (città, nomi, numeri): articoli, preposizioni, numeri in lettere li mette la grammatica della lingua.
import CLUB_IT from '../../data/narrative/club.json' with { type: 'json' };
import FRAG_IT from '../../data/narrative/fragments.json' with { type: 'json' };
import PLAYER_IT from '../../data/narrative/player.json' with { type: 'json' };
import PRESS_IT from '../../data/narrative/press.json' with { type: 'json' };
import CLUB_EN from '../../data/narrative/en/club.json' with { type: 'json' };
import FRAG_EN from '../../data/narrative/en/fragments.json' with { type: 'json' };
import PLAYER_EN from '../../data/narrative/en/player.json' with { type: 'json' };
import PRESS_EN from '../../data/narrative/en/press.json' with { type: 'json' };
import type { Arc, Line, Position, Said, WorldState } from '../model.ts';
import { Rng } from '../rng.ts';
import { numWordEn, ordinalNumEn, ordinalWordEn, possessive, tidyEn } from './english.ts';
import { article, numWord, ordinal, teamForms, tidy } from './italian.ts';
import { expand, pick, type Grammar, type Vars } from './text.ts';

export type NarrativeLang = 'it' | 'en';

export const TEXTS: Record<NarrativeLang, Record<string, string[]>> = {
  it: { ...CLUB_IT, ...PLAYER_IT, ...PRESS_IT },
  en: { ...CLUB_EN, ...PLAYER_EN, ...PRESS_EN },
};
export const GRAMMARS: Record<NarrativeLang, Grammar> = { it: FRAG_IT, en: FRAG_EN };

// i dati grezzi che non sono numeri da scrivere in lettere
const NOT_NUMBERS = new Set(['gapPts', 'left', 'high', 'otherId']);

/** i dati di una storia al momento in cui si scrive: città, nomi, ruolo, numeri. Niente parole di una lingua. */
export function rawVars(world: WorldState, arc: Arc): Vars {
  const v: Vars = { ...arc.data };
  const s = arc.subject;
  const club = s.club !== undefined ? world.clubs[s.club] : undefined;
  const rival = s.rival !== undefined ? world.clubs[s.rival] : undefined;
  if (club) v.clubCity = club.city;
  if (rival) v.rivalCity = rival.city;
  const p = s.player !== undefined ? world.players[s.player] : undefined;
  if (p) Object.assign(v, { first: p.firstName, last: p.lastName, ppos: p.position }); // ppos: `pos` è già la posizione in classifica
  // l'allenatore ha un nome solo se è l'utente: degli altri club si parla di "l'allenatore"
  const me = world.manager.clubId;
  v.mgr = (s.club === me || s.rival === me) && world.manager.name ? world.manager.name : '';
  return v;
}

const ROLE_IT: Record<Position, [string, 'm' | 'f']> = {
  GK: ['portiere', 'm'], DL: ['terzino', 'm'], DR: ['terzino', 'm'], DC: ['difensore', 'm'], DM: ['mediano', 'm'],
  ML: ['esterno', 'm'], MR: ['esterno', 'm'], MC: ['centrocampista', 'm'], AMC: ['trequartista', 'm'],
  AML: ['ala', 'f'], AMR: ['ala', 'f'], ST: ['attaccante', 'm'],
};
const ROLE_EN: Record<Position, string> = {
  GK: 'goalkeeper', DL: 'full-back', DR: 'full-back', DC: 'centre-back', DM: 'holding midfielder', ML: 'wide midfielder',
  MR: 'wide midfielder', MC: 'midfielder', AMC: 'playmaker', AML: 'winger', AMR: 'winger', ST: 'striker',
};

/** i numeri di una storia, già flessi */
function numbers(raw: Vars, f: (k: string, n: number) => Record<string, string>): Vars {
  const out: Vars = {};
  for (const [k, x] of Object.entries(raw)) if (typeof x === 'number' && !NOT_NUMBERS.has(k)) Object.assign(out, f(k, x));
  return out;
}

function italianVars(raw: Vars): Vars {
  const v: Vars = { ...raw };
  if (typeof raw.clubCity === 'string') Object.assign(v, teamForms('club', raw.clubCity));
  if (typeof raw.rivalCity === 'string') Object.assign(v, teamForms('rival', raw.rivalCity));
  if (typeof raw.last === 'string') {
    const [role, g] = ROLE_IT[raw.ppos as Position] ?? ['giocatore', 'm'];
    const art = article(role, g);
    Object.assign(v, { nome: `${raw.first} ${raw.last}`, cognome: raw.last, ruolo: role, ruolo_art: `${art}${art.endsWith("'") ? '' : ' '}${role}` });
  }
  Object.assign(v, numbers(raw, (k, n) => ({ [`${k}_w`]: numWord(n), [`${k}_o`]: ordinal(n, 'm'), [`${k}_a`]: ordinal(n, 'f') })));
  v.mister = raw.mgr || "l'allenatore";
  // distacco, giornate e zona: prima erano parole salvate nella storia, ora si scrivono qui (le storie vecchie le hanno già)
  if (typeof raw.gapPts === 'number') {
    const g = raw.gapPts;
    v.distacco = g === 0 ? 'a pari punti' : g === 1 ? 'a un solo punto' : `a ${numWord(g)} punti`;
  }
  if (typeof raw.left === 'number') v.fine = raw.left === 1 ? "all'ultima giornata" : `a ${numWord(raw.left)} giornate dalla fine`;
  if (typeof raw.high === 'number') v.zona = raw.high ? 'alta' : 'bassa';
  return v;
}

function englishVars(raw: Vars): Vars {
  const v: Vars = { ...raw };
  for (const who of ['club', 'rival'] as const) {
    const city = raw[`${who}City`];
    if (typeof city === 'string') Object.assign(v, { [who]: city, [`${who}_nome`]: city, [`${who}_s`]: possessive(city) });
  }
  if (typeof raw.last === 'string') {
    const name = `${raw.first} ${raw.last}`;
    Object.assign(v, { nome: name, nome_s: possessive(name), cognome: raw.last, cognome_s: possessive(raw.last), ruolo: ROLE_EN[raw.ppos as Position] ?? 'player' });
  }
  Object.assign(v, numbers(raw, (k, n) => ({ [`${k}_w`]: numWordEn(n), [`${k}_o`]: ordinalWordEn(n), [`${k}_a`]: ordinalWordEn(n), [`${k}_th`]: ordinalNumEn(n) })));
  v.mister = raw.mgr || 'the manager';
  if (typeof raw.gapPts === 'number') {
    const g = raw.gapPts;
    v.distacco = g === 0 ? 'level on points' : g === 1 ? 'separated by a single point' : `${numWordEn(g)} points apart`;
  } else v.distacco = 'separated by very little'; // storie italiane di prima: il distacco era già una frase italiana
  if (typeof raw.left === 'number') v.fine = raw.left === 1 ? 'on the final day' : `with ${numWordEn(raw.left)} games to go`;
  else v.fine = 'in the final stretch';
  return v;
}

/** le variabili dei testi in una lingua, dai dati grezzi (per i test) */
export const langVars = (raw: Vars, lang: NarrativeLang) => (lang === 'en' ? englishVars(raw) : italianVars(raw));

/** una frase pronta da scrivere: il testo `key`, i dati grezzi, un seme per le scelte */
export const said = (key: string, raw: Vars, seed: number): Said => ({ key, seed, v: raw });

/** scrive la frase nella lingua richiesta; le righe dei salvataggi di prima sono già testo */
export function render(line: Line, lang: NarrativeLang = 'it'): string {
  if (typeof line === 'string') return line;
  const list = TEXTS[lang][line.key] ?? TEXTS.it[line.key];
  if (!list?.length) return '';
  const rng = new Rng(line.seed);
  const tpl = pick(rng, list);
  return lang === 'en'
    ? expand(tpl, englishVars(line.v), GRAMMARS.en, rng, tidyEn)
    : expand(tpl, italianVars(line.v), GRAMMARS.it, rng, tidy);
}

/**
 * sceglie il seme di una frase evitando quelle già dette troppe volte in stagione (`seen`, in italiano): la stessa
 * riga non deve comparire più di `max` volte (criterio di P8).
 */
export function compose(key: string, raw: Vars, rng: Rng, seen: Map<string, number>, max = 3): Said {
  let best = said(key, raw, 0);
  for (let attempt = 0; attempt < 10; attempt++) {
    best = said(key, raw, rng.int(1, 2 ** 31 - 1));
    if ((seen.get(render(best)) ?? 0) < max) break;
  }
  const text = render(best);
  seen.set(text, (seen.get(text) ?? 0) + 1);
  return best;
}

/** una frase dentro le variabili di una notizia o di una voce del registro: la UI la riconosce e la scrive */
export const pack = (line: Line) => (typeof line === 'string' ? line : `§${JSON.stringify(line)}`);
export function unpack(v: string): Line {
  if (!v.startsWith('§')) return v;
  try { return JSON.parse(v.slice(1)) as Said; } catch { return v; } // as: il formato lo scrive solo pack
}
