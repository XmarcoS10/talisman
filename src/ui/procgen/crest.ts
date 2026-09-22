// Generatore di stemmi SVG (GUIDA GP1): 8 scudi × 12 partizioni × 10 simboli, deterministico dall'id del club.
// La combinazione nasce da una biiezione sull'id, così fino a 960 club non esistono due stemmi con la stessa forma;
// i colori sono quelli del club, corretti se non contrastano abbastanza. Niente testo dentro: legge a 24 px come a 256.
import type { Club } from '../../engine/model.ts';
import { contrast, readable } from './color.ts';

const SHIELDS = [
  'M4 4h56v26c0 16-12 26-28 30C16 56 4 46 4 30z',
  'M32 2l28 10v20c0 14-12 24-28 30C16 56 4 46 4 32V12z',
  'M6 4h52l-4 36L32 62 10 40z',
  'M32 3a29 29 0 1 1 0 58a29 29 0 1 1 0-58z',
  'M6 6h52v30c0 6-4 10-10 12L32 60 16 48C10 46 6 42 6 36z',
  'M8 4h48c2 0 4 2 4 4v44L32 62 4 52V8c0-2 2-4 4-4z',
  'M32 2c16 0 26 13 26 30S48 62 32 62 6 49 6 32 16 2 32 2z',
  'M32 2l30 16-6 30-24 14L8 48 2 18z',
];

// partizioni del campo, disegnate col secondo colore dentro lo scudo
const PATTERNS: ((c: string) => string)[] = [
  () => '',
  (c) => [8, 24, 40, 56].map((x) => `<rect x="${x}" width="8" height="64" fill="${c}"/>`).join(''),
  (c) => [10, 30, 50].map((y) => `<rect y="${y}" width="64" height="9" fill="${c}"/>`).join(''),
  (c) => `<rect x="32" width="32" height="64" fill="${c}"/>`,
  (c) => `<rect y="32" width="64" height="32" fill="${c}"/>`,
  (c) => `<rect x="32" width="32" height="32" fill="${c}"/><rect y="32" width="32" height="32" fill="${c}"/>`,
  (c) => `<rect x="26" width="12" height="64" fill="${c}"/><rect y="24" width="64" height="12" fill="${c}"/>`,
  (c) => `<path d="M0 0l64 64M64 0L0 64" stroke="${c}" stroke-width="11"/>`,
  (c) => `<path d="M0 22L32 40L64 22V34L32 52L0 34z" fill="${c}"/>`,
  (c) => `<path d="M0 0L64 64V44L20 0z" fill="${c}"/>`,
  (c) => `<path d="SHIELD" fill="none" stroke="${c}" stroke-width="14"/>`,
  (c) => `<rect width="64" height="19" fill="${c}"/>`,
];

// simboli astratti in un riquadro 24×24
const SYMBOLS = [
  'M12 2l2.9 6.9 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21.2l1.6-7L2 9.5l7.1-.6z', // stella
  'M4 22V8h3V4h3v4h4V4h3v4h3v14h-6v-5h-4v5z', // torre
  'M2 14C6 6 14 3 22 4c-3 2-5 4-6 6 2 0 4 0 5 1-3 1-6 2-8 4 1 0 3 1 3 2-4 1-9 1-14-3z', // ala
  'M2 8c3-3 6-3 9 0s6 3 9 0v5c-3 3-6 3-9 0s-6-3-9 0zm0 8c3-3 6-3 9 0s6 3 9 0v4c-3 3-6 3-9 0s-6-3-9 0z', // onde
  'M3 17L2 6l6 5 4-8 4 8 6-5-1 11zM3 19h18v3H3z', // corona
  'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20zm0 5l4.5 3.3-1.7 5.2H8.9l-1.7-5.2z', // pallone
  'M11 2h2v3h3v2h-3v11c3-.5 5-2.5 6-5l-2-1 4-2 1 4-2-1c-1 4-5 7-8 7s-7-3-8-7l-2 1 1-4 4 2-2 1c1 2.5 3 4.5 6 5V7H8V5h3z', // ancora
  'M13 2L4 14h7l-2 8 9-12h-7z', // fulmine
  'M12 2c6 4 8 10 4 16-1 1-3 2-4 4-1-2-3-3-4-4C4 12 6 6 12 2z', // foglia
  'M12 2l7 9h-4l5 6h-6v5h-4v-5H4l5-6H5z', // albero
];

export const CREST_KINDS = SHIELDS.length * PATTERNS.length * SYMBOLS.length; // 960

/**
 * forma dello stemma: una biiezione sull'id (77 è primo con 960), quindi club diversi hanno forme diverse. Con 77 = 7 + 10·7
 * due id consecutivi cambiano simbolo (passo 7 su 10) e partizione (passo 7 su 12): i club vicini non si somigliano.
 */
export function crestShape(id: number) {
  const k = (((id * 77 + 101) % CREST_KINDS) + CREST_KINDS) % CREST_KINDS;
  return { symbol: k % SYMBOLS.length, pattern: Math.floor(k / SYMBOLS.length) % PATTERNS.length, shield: Math.floor(k / (SYMBOLS.length * PATTERNS.length)) };
}

type CrestClub = Pick<Club, 'id' | 'colors' | 'founded'>;

/** lo stemma in SVG. Sopra i 96 px compare l'anno di fondazione; i club storici (prima del 1920) hanno un filetto doppio */
export function crestSvg(club: CrestClub, size = 64): string {
  const { shield, pattern, symbol } = crestShape(club.id);
  const d = SHIELDS[shield]!;
  const [c1, c2, c3] = club.colors;
  const band = contrast(c1, c2) >= 1.4 ? c2 : readable(c1, [c3], 1.4);
  const mark = readable(c1, [c3, c2], 3);
  const edge = contrast(mark, '#111111') > contrast(mark, '#ffffff') ? 'rgb(0 0 0 / .55)' : 'rgb(255 255 255 / .7)';
  const clip = `c${club.id}`;
  const year = size >= 96 ? `<text x="32" y="50" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="7" fill="${mark}" stroke="${edge}" stroke-width="1.2" paint-order="stroke">${club.founded}</text>` : '';
  const old = club.founded < 1920 ? `<path d="${d}" fill="none" stroke="${mark}" stroke-width="1" transform="translate(32 32) scale(.86) translate(-32 -32)" opacity=".8"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">`
    + `<defs><clipPath id="${clip}"><path d="${d}"/></clipPath></defs>`
    + `<g clip-path="url(#${clip})"><rect width="64" height="64" fill="${c1}"/>${PATTERNS[pattern]!(band).replace('SHIELD', d)}</g>`
    + old
    + `<path d="${SYMBOLS[symbol]}" fill="${mark}" fill-rule="evenodd" stroke="${edge}" stroke-width="1.4" paint-order="stroke" transform="translate(19 ${year ? 15 : 19}) scale(1.08)"/>`
    + year
    + `<path d="${d}" fill="none" stroke="rgb(0 0 0 / .45)" stroke-width="2.5"/></svg>`;
}

const cache = new Map<string, string>();

/** come data URI, con una cache in memoria: gli stemmi si ridisegnano centinaia di volte nelle tabelle */
export function crestDataUri(club: CrestClub, size = 64): string {
  const key = `${club.id}|${club.colors.join()}|${club.founded}|${size >= 96 ? 'l' : 's'}`;
  let uri = cache.get(key);
  if (!uri) { uri = `data:image/svg+xml;utf8,${encodeURIComponent(crestSvg(club, size >= 96 ? 128 : 64))}`; cache.set(key, uri); }
  return uri;
}
