// Post-produzione: ritaglio sul soggetto, colori verso la palette del gioco, vignettatura, WebP e PNG, provino.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import sharp from 'sharp';
import type { Config, ProcessOpts } from './config.ts';
import { UserError } from './config.ts';

// --- colore: sRGB ↔ CIELAB (D65) ---
const toLin = (c: number) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const toSrgb = (c: number) => { const s = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; return Math.max(0, Math.min(255, Math.round(s * 255))); };
const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
const fi = (t: number) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));
const WX = 0.95047, WZ = 1.08883;

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const R = toLin(r), G = toLin(g), B = toLin(b);
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / WX), y = f(0.2126 * R + 0.7152 * G + 0.0722 * B), z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / WZ);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

export function labToRgb(L: number, a: number, b: number): [number, number, number] {
  const y = (L + 16) / 116, x = fi(a / 500 + y) * WX, z = fi(y - b / 200) * WZ, Y = fi(y);
  return [toSrgb(3.2406 * x - 1.5372 * Y - 0.4986 * z), toSrgb(-0.9689 * x + 1.8758 * Y + 0.0415 * z), toSrgb(0.0557 * x - 0.204 * Y + 1.057 * z)];
}

const hexLab = (hex: string) => { const n = parseInt(hex.slice(1), 16); return rgbToLab((n >> 16) & 255, (n >> 8) & 255, n & 255); };

/**
 * correzione di palette: ogni pixel tiene la sua luminanza (e quindi il dettaglio), mentre la tinta (a, b) si sposta
 * verso il colore della palette più vicino. Due immagini fatte in giorni diversi finiscono nella stessa famiglia.
 */
export function shiftPalette(px: Buffer, channels: number, palette: string[], k: number) {
  if (k <= 0 || !palette.length) return;
  const pal = palette.map(hexLab);
  for (let i = 0; i < px.length; i += channels) {
    const [L, a, b] = rgbToLab(px[i]!, px[i + 1]!, px[i + 2]!);
    let best = pal[0]!, bd = Infinity;
    for (const p of pal) { const d = (p[1] - a) ** 2 + (p[2] - b) ** 2; if (d < bd) { bd = d; best = p; } }
    const [r, g, bl] = labToRgb(L, a + (best[1] - a) * k, b + (best[2] - b) * k);
    px[i] = r; px[i + 1] = g; px[i + 2] = bl;
  }
}

/** vignettatura ai bordi e sfumatura verso il fondo del gioco nel terzo inferiore, dove va il testo */
const overlay = (w: number, h: number) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs><radialGradient id="v" cx="50%" cy="45%" r="75%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.5"/></radialGradient>
  <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0.62" stop-color="#0f131d" stop-opacity="0"/><stop offset="1" stop-color="#0f131d" stop-opacity="0.85"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#v)"/><rect width="100%" height="100%" fill="url(#b)"/></svg>`);

/** hash percettivo (dHash, 64 bit): due immagini quasi uguali hanno hash quasi uguali */
export async function dhash(input: Buffer | string): Promise<string> {
  const px = await sharp(input).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
  let bits = '';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += px[y * 9 + x]! > px[y * 9 + x + 1]! ? '1' : '0';
  return BigInt(`0b${bits}`).toString(16).padStart(16, '0');
}

const images = (dir: string) => (existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.png') && !n.startsWith('_')).sort() : []);

/** `pnpm assets process <cartella>`: dalle immagini approvate ai file del gioco */
export async function processFolder(cfg: Config & { root: string }, folder: string, palette: string[], log = console.log) {
  const src = join(cfg.root, cfg.approved, folder);
  const files = images(src);
  if (!files.length) throw new UserError(`In ${src} non c'è niente: prima «pnpm assets keep ${folder} …» dal provino.`);
  const out = join(cfg.root, cfg.out, folder);
  mkdirSync(out, { recursive: true });
  const seen = new Set<string>();
  for (const file of files) {
    const metaFile = join(src, file.replace(/\.png$/, '.meta.json'));
    const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) as { name?: string; process?: ProcessOpts } : {}; // scritto da generate
    const p = meta.process;
    if (!p) throw new UserError(`${file}: manca il .meta.json con le istruzioni di post-produzione (lo scrive generate).`);
    let name = meta.name ?? basename(file, '.png');
    if (seen.has(name)) name = basename(file, '.png'); // due varianti tenute dello stesso elemento
    seen.add(name);
    // ritaglio alle proporzioni con attenzione al soggetto (la strategia «attention» di sharp) e a misura @2x
    const { data, info } = await sharp(join(src, file)).removeAlpha()
      .resize(p.width * 2, p.height * 2, { fit: 'cover', position: sharp.strategy.attention }).raw().toBuffer({ resolveWithObject: true });
    shiftPalette(data, info.channels, palette, p.palette ?? 0.35);
    let img = sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } });
    if (p.vignette) img = sharp(await img.composite([{ input: overlay(info.width, info.height) }]).png().toBuffer());
    const big = await img.png().toBuffer(); // i metadati (EXIF compresi) non si copiano: sharp li toglie
    await sharp(big).webp({ quality: 82 }).toFile(join(out, `${name}@2x.webp`));
    const one = sharp(big).resize(p.width, p.height);
    await one.clone().webp({ quality: 82 }).toFile(join(out, `${name}.webp`));
    await one.clone().png({ compressionLevel: 9, palette: true }).toFile(join(out, `${name}.png`));
    if (p.thumb) await sharp(big).resize(256, Math.round((256 * p.height) / p.width)).webp({ quality: 82 }).toFile(join(out, `${name}-256.webp`));
    writeFileSync(join(out, `${name}.meta.json`), JSON.stringify({ ...meta, name, width: p.width, height: p.height, thumb: !!p.thumb, phash: await dhash(big) }, null, 2));
    log(`  ${folder}/${name}: pronto`);
  }
  return files.length;
}

/** `pnpm assets contact-sheet <cartella>`: tutte le generate in una griglia numerata, per scegliere a colpo d'occhio */
export async function contactSheet(cfg: Config & { root: string }, folder: string) {
  const dir = join(cfg.root, cfg.raw, folder);
  const files = images(dir);
  if (!files.length) throw new UserError(`In ${dir} non ci sono immagini: prima «pnpm assets generate».`);
  const cell = 256, gap = 8, label = 26, cols = Math.min(6, files.length), rows = Math.ceil(files.length / cols);
  const tiles = await Promise.all(files.map(async (file, i) => {
    const thumb = await sharp(join(dir, file)).resize(cell, cell, { fit: 'contain', background: '#0a0e18' }).png().toBuffer();
    const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="${label}"><rect width="100%" height="100%" fill="#171b26"/>`
      + `<text x="8" y="18" font-family="sans-serif" font-size="15" font-weight="700" fill="#00f59b">${i + 1}</text>`
      + `<text x="40" y="18" font-family="sans-serif" font-size="12" fill="#dfe2f1">${file.replace('.png', '').replace(/&/g, '&amp;')}</text></svg>`);
    const x = gap + (i % cols) * (cell + gap), y = gap + Math.floor(i / cols) * (cell + label + gap);
    return [{ input: thumb, left: x, top: y }, { input: text, left: x, top: y + cell }];
  }));
  const file = join(dir, '_provino.png');
  await sharp({ create: { width: gap + cols * (cell + gap), height: gap + rows * (cell + label + gap), channels: 3, background: '#0f131d' } })
    .composite(tiles.flat()).png().toFile(file);
  return { file, files };
}
