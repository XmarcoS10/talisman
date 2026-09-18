// i18n fatto in casa: un dizionario JSON per lingua, t('chiave', {var}).
import it from './it.json';

const dict: Record<string, string> = it;

export function t(key: string, vars?: Record<string, string | number>): string {
  const s = dict[key];
  if (s === undefined) {
    if (import.meta.env.DEV) console.warn(`[i18n] chiave mancante: ${key}`);
    return key;
  }
  return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : s;
}

/** notizie e voci del Causal Log: le variabili che sono a loro volta chiavi (infortunio, attributo, cause) si traducono */
export function tEvent(key: string, vars: Record<string, string | number>): string {
  const v = { ...vars };
  if (typeof v.injury === 'string') v.injury = t(`injury.${v.injury}`).toLowerCase();
  if (typeof v.attr === 'string') v.attr = t(`attr.${v.attr}`);
  if (typeof v.why === 'string') v.why = v.why.split(',').map((w) => t(w)).join(', ');
  return t(key, v);
}

const money =new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 });
export const fmtMoney = (v: number) => money.format(v);

/** la stagione parte il 22 agosto; `day` = giorni dall'inizio */
export const gameDate = (season: number, day: number) => new Date(Date.UTC(season, 7, 22 + day));
export const fmtDate = (season: number, day: number) =>
  gameDate(season, day).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const fmtSeason = (season: number) => `${season}/${String(season + 1).slice(2)}`;
