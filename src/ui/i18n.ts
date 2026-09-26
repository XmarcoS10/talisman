// i18n fatto in casa: un dizionario JSON per lingua, t('chiave', {var}). Italiano e inglese (Blocco 5).
import en from './en.json';
import it from './it.json';
import { teamForms } from '../engine/narrative/italian.ts';
import { render, unpack } from '../engine/narrative/say.ts';
import type { Line } from '../engine/model.ts';
import { settings, updateSettings, type Lang } from './settings.ts';

const DICTS: Record<Lang, Record<string, string>> = { it, en };

/** la lingua in uso (l'italiano finché non se ne sceglie un'altra) */
export const lang = (): Lang => settings().lang || 'it';
/** la lingua dei formati di numeri e date */
export const locale = () => (lang() === 'en' ? 'en-GB' : 'it-IT');

/** cambia lingua: l'interfaccia si ridisegna (main.tsx ascolta l'evento) */
export function setLang(l: Lang) {
  updateSettings({ lang: l });
  window.dispatchEvent(new Event('talisman-lang'));
}

/** ordinale inglese: 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st */
export function ordinalEn(n: number): string {
  const t = n % 100;
  const s = t >= 11 && t <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${s}`;
}

/**
 * `{var|ord}` (solo nei testi inglesi) è un ordinale. `{var}` è il valore così com'è; `{var|da}` (solo nei testi italiani) è una squadra con la sua preposizione:
 * «dalla Vignarola», «del Sassorosso». `{var|art}` con l'articolo. Il motore manda il nome della città; se il valore
 * non comincia con la maiuscola è già flesso (notizie dei salvataggi di prima) e resta com'è.
 */
function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)(?:\|(\w+))?\}/g, (_, k: string, form: string | undefined) => {
    const v = vars[k];
    if (v === undefined) return `{${k}}`;
    if (form === 'ord') return ordinalEn(Number(v)); // solo nei testi inglesi: 1st, 2nd, 3rd, 11th
    if (!form || typeof v !== 'string' || !/^\p{Lu}/u.test(v)) return String(v);
    const forms = teamForms('x', v);
    return forms[form === 'art' ? 'x' : `x_${form}`] ?? v;
  });
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const s = DICTS[lang()][key] ?? it[key as keyof typeof it];
  if (s === undefined) {
    if (import.meta.env.DEV) console.warn(`[i18n] chiave mancante: ${key}`);
    return key;
  }
  return vars ? fill(s, vars) : s;
}

/** una frase delle storie o della conferenza stampa, scritta nella lingua in uso (Blocco 5) */
export const sayLine = (l: Line) => render(l, lang());

/** notizie e voci del Causal Log: le variabili che sono a loro volta chiavi (infortunio, attributo, cause) si traducono */
export function tEvent(key: string, vars: Record<string, string | number>): string {
  const v = { ...vars };
  for (const [k, x] of Object.entries(v)) if (typeof x === 'string' && x.startsWith('§')) v[k] = sayLine(unpack(x)); // frasi di storie e conferenze
  if (typeof v.injury === 'string') v.injury = t(`injury.${v.injury}`).toLowerCase();
  if (typeof v.attr === 'string') v.attr = t(`attr.${v.attr}`);
  if (typeof v.nation === 'string') v.nation = t(`nation.${v.nation}`);
  if (typeof v.why === 'string') v.why = v.why.split(',').map((w) => t(w)).join(', ');
  for (const k of ['fee', 'wage', 'max'] as const) if (typeof v[k] === 'number') v[k] = fmtMoney(v[k]); // cifre del motore in euro
  return t(key, v);
}

// valuta di visualizzazione: il motore conta in euro, qui si converte a cambio fisso (è un gioco, non un listino)
const RATE = { EUR: 1, USD: 1.08, GBP: 0.85 } as const;
const fmts = new Map<string, Intl.NumberFormat>();
export const fmtMoney = (v: number) => {
  const cur = settings().currency;
  let f = fmts.get(`${cur}${lang()}`);
  if (!f) { f = new Intl.NumberFormat(locale(), { style: 'currency', currency: cur, notation: 'compact', maximumFractionDigits: 1 }); fmts.set(`${cur}${lang()}`, f); }
  return f.format(v * RATE[cur]);
};

/** la stagione parte il 22 agosto; `day` = giorni dall'inizio */
export const gameDate = (season: number, day: number) => new Date(Date.UTC(season, 7, 22 + day));
export const fmtDate = (season: number, day: number) =>
  gameDate(season, day).toLocaleDateString(locale(), settings().dateFmt === 'short'
    ? { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }
    : { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const fmtSeason = (season: number) => `${season}/${String(season + 1).slice(2)}`;
