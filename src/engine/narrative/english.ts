// Grammatica inglese per i testi generati (Blocco 5), la gemella di italian.ts: numeri in lettere, ordinali,
// genitivo sassone, "a"/"an", maiuscole. In inglese le squadre non hanno articolo né genere: "Vignarola",
// "Vignarola's", e i verbi al plurale come usa la stampa britannica ("Vignarola are flying").

const UNITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** numero in lettere fino a 99: twenty-one, forty */
export function numWordEn(n: number): string {
  if (n < 0 || n > 99 || !Number.isInteger(n)) return String(n);
  if (n < 20) return UNITS[n]!;
  const u = n % 10;
  return TENS[Math.floor(n / 10)]! + (u ? `-${UNITS[u]}` : '');
}

const ORD_IRREGULAR: Record<string, string> = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' };

/** ordinale in lettere: third, twelfth, twentieth, forty-first */
export function ordinalWordEn(n: number): string {
  const w = numWordEn(n);
  if (w === String(n)) return ordinalNumEn(n);
  const parts = w.split('-');
  const last = parts.pop()!;
  const ord = ORD_IRREGULAR[last] ?? (last.endsWith('y') ? `${last.slice(0, -1)}ieth` : `${last}th`);
  return [...parts, ord].join('-');
}

/** ordinale in cifre: 1st, 2nd, 3rd, 11th, 91st */
export function ordinalNumEn(n: number): string {
  const t = n % 100;
  return `${n}${t >= 11 && t <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

/** genitivo sassone: Vignarola's, Marks' */
export const possessive = (name: string) => (/s$/i.test(name) ? `${name}'` : `${name}'s`);

/** spazi, "a" → "an" davanti a vocale, maiuscola a inizio frase e dopo punto, esclamativo, interrogativo e due punti */
export function tidyEn(s: string): string {
  let t = s.replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();
  t = t.replace(/([?!])[.:]/g, '$1');
  t = t.replace(/\b([Aa]) (?=(?!one|eu|uni|use)[aeiou]|hour|honest)/gi, (_, a: string) => `${a}n `);
  return t.replace(/(^|[.!?]\s+)([a-z])/g, (_, a: string, c: string) => a + c.toUpperCase());
}
