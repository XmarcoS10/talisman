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
