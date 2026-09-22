// La pipeline degli asset dall'inizio alla fine, contro un finto ComfyUI (stesse API: /prompt, /history, /view).
import { createServer, type Server } from 'node:http';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig, loadJob, ROOT, UserError } from './config.ts';
import { generate, seedFor } from './comfy.ts';
import { contactSheet, dhash, labToRgb, processFolder, rgbToLab, shiftPalette } from './image.ts';
import { check, keep, licenses, manifest } from './registry.ts';

let server: Server;
let port = 0;
let fail: string | null = null; // se impostato, il finto ComfyUI risponde con questo errore di esecuzione
const seeds: number[] = [];

beforeAll(async () => {
  let n = 0;
  server = createServer(async (req, res) => {
    const url = new URL(req.url!, 'http://x');
    if (req.method === 'POST' && url.pathname === '/prompt') {
      let body = '';
      for await (const c of req) body += c;
      const wf = JSON.parse(body).prompt as Record<string, { inputs: Record<string, unknown> }>;
      seeds.push(Number(wf['3']!.inputs.seed));
      res.end(JSON.stringify({ prompt_id: `p${++n}` }));
    } else if (url.pathname.startsWith('/history/')) {
      const id = url.pathname.split('/')[2]!;
      res.end(JSON.stringify({ [id]: fail
        ? { status: { status_str: 'error', messages: [['execution_error', { exception_message: fail }]] }, outputs: {} }
        : { status: { status_str: 'success' }, outputs: { 9: { images: [{ filename: `${id}.png`, subfolder: '', type: 'output' }] } } } }));
    } else if (url.pathname === '/view') {
      // un'immagine diversa per ogni richiesta: sfumatura dal colore del numero
      const k = Number(url.searchParams.get('filename')!.replace(/\D/g, ''));
      const png = await sharp({ create: { width: 320, height: 200, channels: 3, background: { r: (k * 53) % 255, g: (k * 97) % 255, b: 120 } } })
        .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><circle cx="${60 + k * 20}" cy="100" r="50" fill="#fff"/></svg>`) }]).png().toBuffer();
      res.setHeader('content-type', 'image/png');
      res.end(png);
    } else { res.statusCode = 404; res.end(); }
  });
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  port = (server.address() as { port: number }).port; // server TCP: l'indirizzo è un oggetto
});
afterAll(() => { server.close(); });

/** un progetto finto in una cartella temporanea, con la configurazione vera e un job da 2 elementi × 3 varianti */
function project() {
  const root = mkdtempSync(join(tmpdir(), 'tfm-assets-'));
  mkdirSync(join(root, 'assets', 'jobs'), { recursive: true });
  mkdirSync(join(root, 'public'), { recursive: true });
  mkdirSync(join(root, 'src', 'ui'), { recursive: true });
  cpSync(join(ROOT, 'assets', 'comfy-workflows'), join(root, 'assets', 'comfy-workflows'), { recursive: true });
  const cfg = { ...JSON.parse(readFileSync(join(ROOT, 'assets', 'config.json'), 'utf8')), comfyUrl: `http://127.0.0.1:${port}` };
  writeFileSync(join(root, 'assets', 'config.json'), JSON.stringify(cfg));
  writeFileSync(join(root, 'assets', 'LICENSES.md'), '# Licenze\n');
  const job = readFileSync(join(ROOT, 'assets', 'jobs', 'sfondi.yaml'), 'utf8').replace(/items:[\s\S]*$/, 'items:\n  - name: desk\n    prompt: an office\n  - name: squad\n    prompt: a pitch\n')
    .replace('{ width: 1280, height: 720, palette: 0.35, vignette: true }', '{ width: 160, height: 90, palette: 0.35, vignette: true, thumb: true }');
  writeFileSync(join(root, 'assets', 'jobs', 'prova.yaml'), job);
  return { root, cfg: loadConfig(root), job: loadJob(join(root, 'assets', 'jobs', 'prova.yaml')) };
}

const quiet = { pollMs: 5, log: () => {} };

describe('pipeline degli asset (Blocco C §4)', () => {
  it('dal job alle immagini pronte: generate, provino, keep, process, manifest, licenze, check', async () => {
    const { root, cfg, job } = project();
    expect(await generate(cfg, job, quiet)).toBe(6);
    expect(seeds.slice(-6)).toEqual(['desk', 'squad'].flatMap((n) => [0, 1, 2].map((v) => seedFor(job.seedBase, n, v))));
    expect(await generate(cfg, job, quiet)).toBe(0); // ripartendo, salta quello che c'è già

    const sheet = await contactSheet(cfg, 'sfondi');
    expect(sheet.files).toHaveLength(6);
    expect((await sharp(sheet.file).metadata()).width).toBeGreaterThan(256 * 3);

    expect(keep(cfg, 'sfondi', [1, 4])).toEqual({ kept: 2, archived: 4 });
    expect(() => keep(cfg, 'sfondi', [9])).toThrow(UserError); // nel grezzo non c'è più niente da scegliere

    expect(await processFolder(cfg, 'sfondi', ['#0f131d', '#00f59b', '#808080'], () => {})).toBe(2);
    for (const f of ['desk.webp', 'desk@2x.webp', 'desk.png', 'desk-256.webp', 'squad.webp']) expect(existsSync(join(root, 'public', 'art', 'sfondi', f))).toBe(true);
    expect((await sharp(join(root, 'public', 'art', 'sfondi', 'desk@2x.webp')).metadata()).width).toBe(320);

    expect(manifest(cfg)).toBe(2);
    const ts = readFileSync(join(root, 'src', 'ui', 'assets-manifest.ts'), 'utf8');
    expect(ts).toContain("'sfondi/desk': { src: 'art/sfondi/desk.webp'");
    expect(licenses(cfg)).toBe(2);
    expect(readFileSync(join(root, 'assets', 'LICENSES.md'), 'utf8')).toContain('`sfondi/desk` | sd_xl_base_1.0.safetensors | CreativeML');
    licenses(cfg); // la seconda volta sostituisce la tabella, non ne aggiunge un'altra
    expect(readFileSync(join(root, 'assets', 'LICENSES.md'), 'utf8').match(/assets:start/g)).toHaveLength(1);
    expect(await check(cfg)).toEqual([]);
  }, 60_000);

  it('errori spiegati: ComfyUI spento, memoria finita, workflow mancante', async () => {
    const { cfg, job } = project();
    await expect(generate({ ...cfg, comfyUrl: 'http://127.0.0.1:1' }, job, quiet)).rejects.toThrow(/non risponde/);
    fail = 'CUDA error: out of memory';
    await expect(generate(cfg, job, quiet)).rejects.toThrow(/Memoria video finita/);
    fail = null;
    await expect(generate(cfg, { ...job, workflow: 'manca.json' }, quiet)).rejects.toThrow(/Export \(API\)/);
  });

  it('la palette sposta la tinta ma tiene la luminanza', () => {
    const [r, g, b] = labToRgb(...rgbToLab(200, 40, 90));
    expect([r, g, b]).toEqual([200, 40, 90]);
    const px = Buffer.from([200, 40, 90]);
    shiftPalette(px, 3, ['#00f59b'], 1);
    expect(Math.abs(rgbToLab(px[0]!, px[1]!, px[2]!)[0] - rgbToLab(200, 40, 90)[0])).toBeLessThan(2);
    expect(px[1]).toBeGreaterThan(px[0]!); // ora è verde
  });

  it('hash percettivo: la stessa immagine ridimensionata ha lo stesso hash', async () => {
    const img = await sharp({ create: { width: 200, height: 100, channels: 3, background: '#224466' } })
      .composite([{ input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect x="120" width="80" height="100" fill="#fff"/></svg>') }]).png().toBuffer();
    expect(await dhash(await sharp(img).resize(100, 50).png().toBuffer())).toBe(await dhash(img));
  });
});
