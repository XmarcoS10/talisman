// Grammatica italiana per i testi generati (GUIDA §13 P8 punto 3): articoli, preposizioni articolate,
// genere dei nomi di squadra, numeri in lettere. È la parte che fa la differenza fra "del Vignarola"
// (sbagliato) e "della Vignarola", fra "il Sassorosso" e "lo Spezia".

export type Gender = 'm' | 'f';

const VOWEL = /^[aeiouàèéìòùh]/i;
// "lo" davanti a s impura, z, gn, ps, pn, x, y
const LO = /^(s[bcdfgklmnpqrtvz]|z|gn|ps|pn|x|y)/i;
// nomi di città con la prima parola femminile anche se non finiscono in -a
const FEM_FIRST = new Set(['santa', 'torre', 'rocca', 'villa', 'riva', 'marina', 'porta']);

/** il genere con cui i giornali trattano una squadra che porta il nome di una città */
export function teamGender(city: string): Gender {
  const first = city.split(/[\s']/)[0]!.toLowerCase();
  if (FEM_FIRST.has(first)) return 'f';
  return /a$/i.test(city.trim()) ? 'f' : 'm';
}

type Article = 'il' | 'lo' | "l'" | 'la';

export function article(word: string, g: Gender): Article {
  if (VOWEL.test(word)) return "l'";
  if (g === 'f') return 'la';
  return LO.test(word) ? 'lo' : 'il';
}

// preposizioni articolate: di, a, da, in, su × il, lo, l', la
const ART: Record<string, Record<Article, string>> = {
  di: { il: 'del', lo: 'dello', "l'": "dell'", la: 'della' },
  a: { il: 'al', lo: 'allo', "l'": "all'", la: 'alla' },
  da: { il: 'dal', lo: 'dallo', "l'": "dall'", la: 'dalla' },
  in: { il: 'nel', lo: 'nello', "l'": "nell'", la: 'nella' },
  su: { il: 'sul', lo: 'sullo', "l'": "sull'", la: 'sulla' },
};

/** unisce articolo (o preposizione articolata) e nome: niente spazio dopo l'apostrofo */
const join = (a: string, w: string) => (a.endsWith("'") ? `${a}${w}` : `${a} ${w}`);

/**
 * tutte le forme di una squadra per i template: {club}, {club_di}, {club_a}, … e il nome nudo {club_nome}.
 * Esempio per "Vignarola": la Vignarola, della Vignarola, alla Vignarola, dalla, nella, sulla, con la, contro la.
 */
export function teamForms(prefix: string, city: string): Record<string, string> {
  const g = teamGender(city);
  const art = article(city, g);
  const out: Record<string, string> = {
    [prefix]: join(art, city),
    [`${prefix}_nome`]: city,
    [`${prefix}_con`]: join(`con ${art}`, city),
    [`${prefix}_contro`]: join(`contro ${art}`, city),
    // accordo di aggettivi e participi: "il Ventimonti è caduto", "la Vignarola è caduta"
    [`${prefix}_o`]: g === 'f' ? 'a' : 'o',
  };
  for (const p of Object.keys(ART)) out[`${prefix}_${p}`] = join(ART[p]![art], city);
  return out;
}

const UNITS = ['zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci',
  'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove', 'venti'];
const TENS = ['', '', 'venti', 'trenta', 'quaranta', 'cinquanta', 'sessanta', 'settanta', 'ottanta', 'novanta'];

/** numero in lettere fino a 99, con le elisioni giuste: ventuno, trentotto */
export function numWord(n: number): string {
  if (n < 0 || n > 99 || !Number.isInteger(n)) return String(n);
  if (n <= 20) return UNITS[n]!;
  const t = TENS[Math.floor(n / 10)]!;
  const u = n % 10;
  if (u === 0) return t;
  return (u === 1 || u === 8 ? t.slice(0, -1) : t) + UNITS[u]!;
}

const ORD = ['', 'prim', 'second', 'terz', 'quart', 'quint', 'sest', 'settim', 'ottav', 'non', 'decim'];

/** ordinale concordato: "terzo", "terza", "undicesimo" */
export function ordinal(n: number, g: Gender): string {
  const end = g === 'f' ? 'a' : 'o';
  if (n >= 1 && n <= 10) return ORD[n]! + end;
  const w = numWord(n);
  // undici → undicesimo, ventitré → ventitreesimo, trentasei → trentaseiesimo
  const stem = w.endsWith('tre') ? w : w.replace(/[aeio]$/, '');
  return `${stem}esim${end}`;
}

// elisione davanti a vocale: "la ottava" → "l'ottava", "una altra" → "un'altra", "della ultima" → "dell'ultima"
const ELIDE = /(?<![\p{L}'])(la|lo|il|della|dello|alla|allo|dalla|dallo|nella|nello|sulla|sullo|una) (?=[aeiouàèéìòù])/giu;
const ELIDED: Record<string, string> = {
  la: "l'", lo: "l'", il: "l'", della: "dell'", dello: "dell'", alla: "all'", allo: "all'", dalla: "dall'", dallo: "dall'",
  nella: "nell'", nello: "nell'", sulla: "sull'", sullo: "sull'", una: "un'",
};

/** maiuscole a inizio frase, elisioni, e pulizia degli spazi lasciati dagli slot vuoti */
export function tidy(s: string): string {
  let t = s.replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').replace(/'\s+/g, "'").trim();
  t = t.replace(/([?!])[.:]/g, '$1'); // "Un predestinato?." → "Un predestinato?"
  t = t.replace(ELIDE, (m) => {
    const w = m.slice(0, -1);
    const e = ELIDED[w.toLowerCase()]!;
    return w[0] === w[0]!.toUpperCase() ? e.charAt(0).toUpperCase() + e.slice(1) : e;
  });
  // maiuscola all'inizio e dopo punto, esclamativo, interrogativo (non dopo i due punti, in italiano)
  return t.replace(/(^|[.!?]\s+)([a-zàèéìòù])/g, (_, a: string, c: string) => a + c.toUpperCase());
}
