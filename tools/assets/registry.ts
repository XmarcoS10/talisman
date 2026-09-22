// Scelte dal provino, manifest tipizzato per la UI, registro delle licenze e controlli finali.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import sharp from 'sharp';
import { type Config, UserError } from './config.ts';

type Cfg = Config & { root: string };
interface Meta { job?: string; kind?: string; name: string; prompt?: string; seed?: number; model?: string; license?: string; date?: string; width: number; height: number; thumb?: boolean; phash?: string }

const pngs = (dir: string) => (existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.png') && !n.startsWith('_')).sort() : []);

/** `pnpm assets keep <cartella> 3,7,12`: i numeri del provino vanno fra le approvate, le altre in archivio */
export function keep(cfg: Cfg, folder: string, picks: number[]) {
  const dir = join(cfg.root, cfg.raw, folder);
  const files = pngs(dir);
  const bad = picks.filter((n) => n < 1 || n > files.length);
  if (!files.length) throw new UserError(`In ${dir} non ci sono immagini.`);
  if (bad.length) throw new UserError(`Numeri fuori dal provino (1-${files.length}): ${bad.join(', ')}.`);
  const move = (file: string, to: string) => {
    mkdirSync(to, { recursive: true });
    for (const f of [file, file.replace(/\.png$/, '.meta.json')]) if (existsSync(join(dir, f))) renameSync(join(dir, f), join(to, f));
  };
  files.forEach((file, i) => move(file, join(cfg.root, picks.includes(i + 1) ? cfg.approved : cfg.archive, folder)));
  return { kept: picks.length, archived: files.length - picks.length };
}

/** tutti i .meta.json degli asset pronti, cartella per cartella */
export function readMetas(cfg: Cfg): { folder: string; meta: Meta }[] {
  const out = join(cfg.root, cfg.out);
  if (!existsSync(out)) return [];
  return readdirSync(out).filter((d) => statSync(join(out, d)).isDirectory()).sort().flatMap((folder) =>
    readdirSync(join(out, folder)).filter((f) => f.endsWith('.meta.json')).sort()
      .map((f) => ({ folder, meta: JSON.parse(readFileSync(join(out, folder, f), 'utf8')) as Meta }))); // scritti da process
}

/** `pnpm assets manifest`: nome → percorsi e misure. Un asset che manca diventa un errore di compilazione */
export function manifest(cfg: Cfg) {
  const entries = readMetas(cfg).map(({ folder, meta }) => {
    const base = `${relative(join(cfg.root, 'public'), join(cfg.root, cfg.out, folder)).replace(/\\/g, '/')}/${meta.name}`;
    return `  '${folder}/${meta.name}': { src: '${base}.webp', src2x: '${base}@2x.webp', png: '${base}.png', ${meta.thumb ? `thumb: '${base}-256.webp', ` : ''}w: ${meta.width}, h: ${meta.height} },`;
  });
  const file = join(cfg.root, cfg.manifest);
  writeFileSync(file, `// GENERATO da \`pnpm assets manifest\`: non modificare a mano.
// Gli asset grafici pronti per il gioco (tools/assets, GUIDA Blocco C §4). Percorsi relativi alla pagina.
export interface ArtAsset { src: string; src2x: string; png: string; thumb?: string; w: number; h: number }

export const ASSETS = {
${entries.join('\n')}
} as const satisfies Record<string, ArtAsset>;

export type AssetName = keyof typeof ASSETS;

/** per i nomi composti a runtime (lo sfondo di una schermata): se manca, si resta senza immagine */
export const art = (name: string): ArtAsset | undefined => (ASSETS as Record<string, ArtAsset>)[name];
`);
  return entries.length;
}

const START = '<!-- assets:start -->', END = '<!-- assets:end -->';

/** `pnpm assets licenses`: la tabella delle immagini generate dentro LICENSES.md, fra i due segnaposto */
export function licenses(cfg: Cfg) {
  const rows = readMetas(cfg).map(({ folder, meta }) =>
    `| \`${folder}/${meta.name}\` | ${meta.model ?? '—'} | ${meta.license ?? 'da verificare'} | ${meta.seed ?? '—'} | ${meta.date ?? '—'} |`);
  const table = [START, '', '| Asset | Modello | Licenza | Seed | Data |', '|---|---|---|---|---|', ...rows, '', END].join('\n');
  const file = join(cfg.root, cfg.licenses);
  const s = readFileSync(file, 'utf8');
  const next = s.includes(START) ? s.slice(0, s.indexOf(START)) + table + s.slice(s.indexOf(END) + END.length)
    : `${s.trimEnd()}\n\n## Immagini generate (\`pnpm assets licenses\`)\n\n${table}\n`;
  writeFileSync(file, next);
  return rows.length;
}

/** `pnpm assets check`: file mancanti, pesi oltre il limite, metadati EXIF rimasti. Restituisce i problemi */
export async function check(cfg: Cfg): Promise<string[]> {
  const problems: string[] = [];
  const pub = join(cfg.root, 'public');
  for (const { folder, meta } of readMetas(cfg)) {
    const limit = (cfg.limitsKb[meta.kind ?? ''] ?? Infinity) * 1024;
    const files: [string, number][] = [['.webp', limit], ['@2x.webp', limit * 2], ['.png', limit * 2]];
    if (meta.thumb) files.push(['-256.webp', limit]);
    for (const [suffix, max] of files) {
      const f = join(cfg.root, cfg.out, folder, `${meta.name}${suffix}`);
      if (!existsSync(f)) { problems.push(`manca ${relative(pub, f)}`); continue; }
      const kb = statSync(f).size / 1024;
      if (kb * 1024 > max) problems.push(`${relative(pub, f)} pesa ${kb.toFixed(0)} KB (limite ${(max / 1024).toFixed(0)} KB per «${meta.kind}»)`);
      if ((await sharp(f).metadata()).exif) problems.push(`${relative(pub, f)} ha ancora metadati EXIF`);
    }
  }
  return problems;
}
