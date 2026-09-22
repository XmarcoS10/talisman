// Volti dei giocatori (GUIDA GP3) con facesjs: stesso giocatore, stesso volto, sempre. La base nasce dall'id e dalla
// nazionalità; l'età aggiunge rughe e capelli grigi col passare delle stagioni; l'altezza allarga le spalle.
// La maglia è quella del club. Cache in memoria: un volto si calcola una volta per età e per maglia.
import { display, faceToSvgString, generate } from 'facesjs';
import type { FaceConfig, Race } from 'facesjs';
import type { Club, Player } from '../../engine/model.ts';
import { seeded } from './color.ts';

// quanto è probabile ogni aspetto per nazionalità: bianco, nero, mediterraneo/sudamericano, asiatico
const LOOKS: Record<string, [number, number, number, number]> = {
  ITA: [0.84, 0.07, 0.07, 0.02], ESP: [0.8, 0.07, 0.11, 0.02], FRA: [0.55, 0.33, 0.1, 0.02], POR: [0.72, 0.18, 0.09, 0.01],
  NED: [0.72, 0.2, 0.06, 0.02], SWE: [0.82, 0.12, 0.05, 0.01], SRB: [0.97, 0.02, 0.01, 0], CRO: [0.98, 0.01, 0.01, 0],
  BRA: [0.4, 0.3, 0.3, 0], ARG: [0.65, 0.03, 0.31, 0.01], SEN: [0.01, 0.97, 0.02, 0], NGA: [0, 0.99, 0.01, 0],
};
const RACES: Race[] = ['white', 'black', 'brown', 'asian'];

/** il generatore di facesjs usa Math.random: per renderlo ripetibile lo si sostituisce solo mentre genera */
function baseFace(p: Pick<Player, 'id' | 'nation'>): FaceConfig {
  const rnd = seeded(p.id * 2654435761);
  const w = LOOKS[p.nation] ?? LOOKS.ITA!;
  let r = rnd(), i = 0;
  while (i < w.length - 1 && r >= w[i]!) r -= w[i++]!;
  const real = Math.random;
  Math.random = rnd; // ponytail: patch globale sincrona e ripristinata subito; se facesjs accettasse un generatore, lo si passerebbe
  try {
    return generate({ glasses: { id: 'none' }, accessories: { id: 'none' }, jersey: { id: 'football' } }, { gender: 'male', race: RACES[i]! });
  } finally {
    Math.random = real;
  }
}

/** grigio verso cui virano i capelli con l'età */
const grey = (hex: string, k: number) => {
  const n = parseInt(hex.replace('#', ''), 16);
  const mix = (c: number) => Math.round(c + (170 - c) * k);
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => mix(c).toString(16).padStart(2, '0')).join('')}`;
};

/** il volto a una certa età, con l'altezza e i colori del club */
export function faceFor(p: Pick<Player, 'id' | 'nation' | 'heightCm'>, age: number, club?: Pick<Club, 'colors'>): FaceConfig {
  const f = baseFace(p);
  f.fatness = Math.min(f.fatness, 0.35) + Math.max(0, age - 31) * 0.03; // atleti: magri, un po' meno a fine carriera
  f.body.size = 0.95 + Math.max(0, Math.min(1, (p.heightCm - 168) / 30)) * 0.1;
  if (age >= 29) f.smileLine = { id: f.smileLine.id === 'none' ? 'line1' : f.smileLine.id, size: 0.6 + (age - 29) * 0.15 };
  if (age >= 33 && f.miscLine.id === 'none') f.miscLine = { id: 'forehead1' };
  if (age >= 32) f.hair.color = grey(f.hair.color, Math.min(0.6, (age - 32) * 0.1));
  if (club) f.teamColors = [club.colors[0], club.colors[1], club.colors[2]];
  return f;
}

/** nel browser si disegna in un nodo staccato; faceToSvgString vale solo in Node (usa `global.document`) */
function toSvg(f: FaceConfig): string {
  if (typeof document === 'undefined') return faceToSvgString(f);
  // facesjs misura le forme con getBBox: il nodo deve stare nel documento, fuori dallo schermo
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;left:-10000px;top:0;width:400px;height:600px';
  document.body.appendChild(box);
  try {
    display(box, f);
    const svg = box.querySelector('svg');
    svg?.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return svg?.outerHTML ?? '';
  } finally {
    box.remove();
  }
}

const cache = new Map<string, string>();

export function faceDataUri(p: Pick<Player, 'id' | 'nation' | 'heightCm'>, age: number, club?: Pick<Club, 'colors'>): string {
  const key = `${p.id}|${age}|${club?.colors.join() ?? ''}`;
  let uri = cache.get(key);
  if (!uri) {
    uri = `data:image/svg+xml;utf8,${encodeURIComponent(toSvg(faceFor(p, age, club)))}`;
    cache.set(key, uri);
  }
  return uri;
}
