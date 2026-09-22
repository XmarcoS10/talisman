// pnpm assets <comando>: la pipeline degli asset grafici (GUIDA, Blocco C §4). Senza argomenti mostra l'aiuto.
import { join, resolve } from 'node:path';
import { loadConfig, loadJob, loadStyle, UserError } from './config.ts';
import { generate } from './comfy.ts';
import { contactSheet, processFolder } from './image.ts';
import { check, keep, licenses, manifest } from './registry.ts';

const HELP = `Uso: pnpm assets <comando>
  generate <job.yaml> [--force]   genera con ComfyUI tutte le varianti del job (salta quelle già fatte)
  contact-sheet <cartella>        provino numerato delle immagini generate
  keep <cartella> 3,7,12          tiene quei numeri del provino, archivia gli altri
  process <cartella>              ritaglio, palette del gioco, WebP @1x/@2x e PNG
  manifest                        scrive il manifest tipizzato per la UI
  licenses                        aggiorna la tabella in assets/LICENSES.md
  check                           file mancanti, pesi oltre il limite, EXIF
  all <cartella>                  process + manifest + licenses + check`;

async function main([cmd, a, b]: string[]) {
  const cfg = loadConfig();
  const need = (x: string | undefined, what: string) => { if (!x) throw new UserError(`Manca ${what}.\n\n${HELP}`); return x; };
  switch (cmd) {
    case 'generate': await generate(cfg, loadJob(resolve(need(a, 'il file del job'))), { force: process.argv.includes('--force') }); break;
    case 'contact-sheet': {
      const { file, files } = await contactSheet(cfg, need(a, 'la cartella'));
      console.log(`Provino con ${files.length} immagini: ${file}\nPoi: pnpm assets keep ${a} <numeri separati da virgola>`);
      break;
    }
    case 'keep': {
      const picks = need(b, 'i numeri da tenere').split(',').map((n) => Number(n.trim())).filter(Number.isFinite);
      const r = keep(cfg, need(a, 'la cartella'), picks);
      console.log(`Tenute ${r.kept}, archiviate ${r.archived}. Poi: pnpm assets process ${a}`);
      break;
    }
    case 'process': console.log(`Pronte ${await processFolder(cfg, need(a, 'la cartella'), loadStyle().palette)} immagini.`); break;
    case 'manifest': console.log(`Manifest: ${manifest(cfg)} asset in ${join(cfg.manifest)}.`); break;
    case 'licenses': console.log(`Registro delle licenze: ${licenses(cfg)} immagini.`); break;
    case 'check': case 'all': {
      if (cmd === 'all') { await processFolder(cfg, need(a, 'la cartella'), loadStyle().palette); manifest(cfg); licenses(cfg); }
      const problems = await check(cfg);
      console.log(problems.length ? `Problemi:\n${problems.map((p) => `  - ${p}`).join('\n')}` : 'Tutto a posto.');
      if (problems.length) process.exitCode = 1;
      break;
    }
    default: console.log(HELP);
  }
}

main(process.argv.slice(2)).catch((e: unknown) => {
  if (e instanceof UserError) { console.error(`\n${e.message}`); process.exitCode = 1; return; }
  throw e;
});
