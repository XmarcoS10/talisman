// Le immagini generate con la pipeline (tools/assets) dove il gioco le usa. Se un asset non c'è ancora, niente cambia.
import type { CSSProperties } from 'react';
import { art } from './assets-manifest.ts';

/** lo sfondo di una schermata, sotto un velo scuro perché i pannelli restino leggibili */
export function screenArt(screen: string): { className: string; style?: CSSProperties } {
  const a = art(`sfondi/${screen}`);
  if (!a) return { className: 'content' };
  // una proprietà CSS personalizzata: React la passa così com'è, il tipo non la prevede
  return { className: 'content has-art', style: { '--art': `image-set(url("${a.src}") 1x, url("${a.src2x}") 2x)` } as CSSProperties };
}

/** l'illustrazione di un tipo di storia (rule dell'arco), se c'è */
export const storyArt = (rule: string) => art(`illustrazioni/${rule}`);
