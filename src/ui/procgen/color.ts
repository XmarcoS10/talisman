// Colori per i generatori procedurali: contrasto WCAG e scelta del colore più leggibile su un fondo.

const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };

/** luminanza relativa di un colore #rrggbb (WCAG 2) */
export function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

/** rapporto di contrasto fra due colori, 1…21 */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

/** colore #rrggbb nello spazio OKLab (L, a, b): le distanze lì somigliano a quelle che vede l'occhio */
function oklab(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  const r = lin((n >> 16) & 255), g = lin((n >> 8) & 255), b = lin(n & 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

/** quanto due colori sono diversi a occhio (distanza OKLab: 0 uguali, ~0,1 si distinguono appena, 1 bianco e nero) */
export function deltaE(a: string, b: string): number {
  const [x, y, z] = oklab(a), [u, v, w] = oklab(b);
  return Math.sqrt((x - u) ** 2 + (y - v) ** 2 + (z - w) ** 2);
}

/** il primo candidato che contrasta abbastanza col fondo; se nessuno ci arriva, il più contrastato (bianco o nero compresi) */
export function readable(bg: string, candidates: readonly string[], min: number): string {
  const ok = candidates.find((c) => contrast(bg, c) >= min);
  if (ok) return ok;
  return [...candidates, '#ffffff', '#111111'].sort((a, b) => contrast(bg, b) - contrast(bg, a))[0]!;
}

/** generatore deterministico piccolo (mulberry32): per la grafica, non per il motore */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
