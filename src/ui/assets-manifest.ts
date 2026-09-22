// GENERATO da `pnpm assets manifest`: non modificare a mano.
// Gli asset grafici pronti per il gioco (tools/assets, GUIDA Blocco C §4). Percorsi relativi alla pagina.
export interface ArtAsset { src: string; src2x: string; png: string; thumb?: string; w: number; h: number }

export const ASSETS = {

} as const satisfies Record<string, ArtAsset>;

export type AssetName = keyof typeof ASSETS;

/** per i nomi composti a runtime (lo sfondo di una schermata): se manca, si resta senza immagine */
export const art = (name: string): ArtAsset | undefined => (ASSETS as Record<string, ArtAsset>)[name];
