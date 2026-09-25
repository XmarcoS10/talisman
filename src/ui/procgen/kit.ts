// Generatore di maglie SVG (GUIDA GP2): 15 disegni × 3 colletti × 2 tipi di manica, deterministico dall'id del club.
// Prima maglia coi colori del club, seconda coi colori scambiati (o il terzo colore). La versione mini (≤ 28 px) toglie
// i dettagli sottili e il numero, che a quella misura diventano rumore.
import type { Club } from '../../engine/model.ts';
import { contrast, deltaE, readable } from './color.ts';

const BODY = 'M20 6l6-3h12l6 3 14 8-6 12-6-3v35H18V23l-6 3-6-12z';
const SLEEVES = 'M20 6L6 14l6 12 6-3V10zM44 6l14 8-6 12-6-3V10z';
const COLLARS = [
  'M26 3c1 4 3 6 6 6s5-2 6-6', // girocollo
  'M26 3l6 9 6-9', // a V
  'M26 3l-2 5 8 4 8-4-2-5', // polo
];

// i disegni del corpo, col secondo colore; `fine` = dettaglio che sparisce nella versione mini
const PATTERNS: { draw: (c: string) => string; fine?: boolean }[] = [
  { draw: () => '' },
  { draw: (c) => [22, 30, 38].map((x) => `<rect x="${x}" width="4" height="64" fill="${c}"/>`).join('') }, // strisce
  { draw: (c) => [16, 32].map((x) => `<rect x="${x}" width="8" height="64" fill="${c}"/>`).join('') }, // strisce larghe
  { draw: (c) => [16, 30, 44].map((y) => `<rect y="${y}" width="64" height="7" fill="${c}"/>`).join('') }, // cerchi
  { draw: (c) => `<rect x="32" width="32" height="64" fill="${c}"/>` }, // metà e metà
  { draw: (c) => `<path d="M14 12L22 4 56 58 48 64z" fill="${c}"/>` }, // fascia diagonale
  { draw: (c) => `<path d="M0 18l32 16 32-16v9L32 43 0 27z" fill="${c}"/>` }, // V sul petto
  { draw: (c) => `<rect x="27" width="10" height="64" fill="${c}"/>` }, // banda centrale
  { draw: (c) => `<rect y="24" width="64" height="11" fill="${c}"/>` }, // banda orizzontale
  { draw: (c) => [21, 25, 29, 33, 37, 41].map((x) => `<rect x="${x}" width="1.2" height="64" fill="${c}"/>`).join(''), fine: true }, // gessato
  { draw: (c) => `<rect x="32" width="32" height="36" fill="${c}"/><rect y="36" width="32" height="28" fill="${c}"/>` }, // quarti
  { draw: (c) => `<path d="M0 64L64 20v44z" fill="${c}"/>` }, // taglio diagonale
  { draw: (c) => `<rect x="18" width="5" height="64" fill="${c}"/><rect x="41" width="5" height="64" fill="${c}"/>` }, // fianchi
  { draw: (c) => `<rect width="64" height="15" fill="${c}"/>` }, // spalle
  { draw: (c) => [0, 1, 2, 3, 4, 5, 6].map((r) => [0, 1, 2, 3].map((q) => ((r + q) % 2 ? '' : `<rect x="${18 + q * 7}" y="${6 + r * 8}" width="7" height="8" fill="${c}"/>`)).join('')).join(''), fine: true }, // scacchi
];

export const KIT_KINDS = PATTERNS.length * COLLARS.length * 2; // 90

/** disegno della maglia: biiezione sull'id (37 è primo con 90) */
export function kitShape(id: number) {
  const k = (((id * 37 + 11) % KIT_KINDS) + KIT_KINDS) % KIT_KINDS;
  return { pattern: k % PATTERNS.length, collar: Math.floor(k / PATTERNS.length) % COLLARS.length, contrastSleeves: k >= KIT_KINDS / 2 };
}

type KitClub = Pick<Club, 'id' | 'colors'>;
export interface KitOpts { away?: boolean; number?: number; size?: number }

/** colore di fondo della maglia. La seconda: il secondo colore; se è troppo vicino al primo il terzo, o bianco/nero */
export const kitBase = (club: KitClub, away = false) => (away ? readable(club.colors[0], [club.colors[1], club.colors[2]], 1.6) : club.colors[0]);

/** sotto questa distanza (OKLab) due maglie in campo si confondono */
export const KIT_APART = 0.2;
/** erba del campo 2D (--pitch-1 e --pitch-2 di tokens.css): una maglia troppo vicina prende il bordo */
const GRASS = ['#143823', '#1a452b'];
const GRASS_APART = 0.12;

/**
 * Maglie in partita (Blocco 3): l'ospite mette la seconda se la prima si confonde con quella di casa; se si
 * confonde anche la seconda tiene la più diversa e i suoi giocatori hanno un bordo. Bordo anche per chi si confonde col prato.
 */
export function matchKits(home: KitClub, away: KitClub): { colors: [string, string]; alt: boolean; ring: [boolean, boolean] } {
  const h = kitBase(home), first = kitBase(away), second = kitBase(away, true);
  const alt = deltaE(h, first) < KIT_APART && deltaE(h, second) > deltaE(h, first);
  const a = alt ? second : first;
  const onGrass = (c: string) => GRASS.some((g) => deltaE(c, g) < GRASS_APART);
  return { colors: [h, a], alt, ring: [onGrass(h), deltaE(h, a) < KIT_APART || onGrass(a)] };
}

export const awayWearsAlt = (home: KitClub, away: KitClub) => matchKits(home, away).alt;

export function kitSvg(club: KitClub, { away = false, number, size = 64 }: KitOpts = {}): string {
  const { pattern, collar, contrastSleeves } = kitShape(club.id);
  const [p, s, t] = club.colors;
  const base = kitBase(club, away);
  const trim = away ? p : contrast(p, s) >= 1.4 ? s : readable(p, [t], 1.4);
  const mini = size <= 28;
  const pat = PATTERNS[pattern]!;
  const body = mini && pat.fine ? '' : pat.draw(trim);
  const ink = readable(base, [trim, t], 3);
  const clip = `k${club.id}${away ? 'a' : 'h'}`;
  const num = number !== undefined && !mini
    ? `<text x="32" y="44" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="17" fill="${ink}" stroke="${contrast(ink, '#111111') > 4 ? 'rgb(0 0 0 / .5)' : 'rgb(255 255 255 / .6)'}" stroke-width="1.5" paint-order="stroke">${number}</text>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">`
    + `<defs><clipPath id="${clip}"><path d="${BODY}"/></clipPath></defs>`
    + `<path d="${SLEEVES}" fill="${contrastSleeves ? trim : base}"/>`
    + `<g clip-path="url(#${clip})"><rect width="64" height="64" fill="${base}"/>${body}</g>`
    + `<path d="${COLLARS[collar]}" fill="none" stroke="${trim === base ? ink : trim}" stroke-width="2.5" stroke-linejoin="round"/>`
    + num
    + `<path d="${BODY}" fill="none" stroke="rgb(0 0 0 / .45)" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
}

const cache = new Map<string, string>();

export function kitDataUri(club: KitClub, opts: KitOpts = {}): string {
  const key = `${club.id}|${club.colors.join()}|${opts.away ? 1 : 0}|${opts.number ?? ''}|${(opts.size ?? 64) <= 28 ? 'm' : 'l'}`;
  let uri = cache.get(key);
  if (!uri) { uri = `data:image/svg+xml;utf8,${encodeURIComponent(kitSvg(club, opts))}`; cache.set(key, uri); }
  return uri;
}
