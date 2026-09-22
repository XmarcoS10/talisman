// Generazione con ComfyUI: un'immagine alla volta (la VRAM è una sola), seed ripetibili, ripresa dopo un'interruzione.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fullPrompt, type Config, type Job, UserError } from './config.ts';

/** seed deterministico: FNV-1a di seedBase + nome + variante. Stesso job, stesse immagini */
export function seedFor(seedBase: number, name: string, variant: number): number {
  let h = 0x811c9dc5;
  for (const ch of `${seedBase}|${name}|${variant}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

type Workflow = Record<string, { inputs: Record<string, unknown>; class_type?: string }>;

/** scrive un valore in "nodo.inputs.campo": così il job non dipende dalla forma interna del workflow */
export function bind(wf: Workflow, path: string, value: unknown) {
  const [node, key, field] = path.split('.');
  if (key !== 'inputs' || !node || !field) throw new UserError(`Collegamento «${path}» non valido: la forma è "nodo.inputs.campo".`);
  const n = wf[node];
  if (!n) throw new UserError(`Il workflow non ha il nodo ${node} (collegamento «${path}»). Hai esportato col menu Export (API)?`);
  n.inputs[field] = value;
}

export const rawFile = (cfg: Config & { root: string }, job: Job, name: string, v: number) => join(cfg.root, cfg.raw, job.output, `${name}_v${v + 1}.png`);

async function call(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new UserError(`ComfyUI non risponde su ${new URL(url).origin}. Avvialo con run_nvidia_gpu.bat e l'opzione --listen 127.0.0.1 --port 8188.`);
  }
}

/** spiega gli errori di ComfyUI con cosa fare */
function explain(msg: string): string {
  if (/out of memory|OutOfMemory|CUDA error/i.test(msg)) return `Memoria video finita. Riduci la misura nel job (size) o chiudi altri programmi che usano la scheda video. (${msg.slice(0, 120)})`;
  if (/not found|does not exist|invalid prompt|node/i.test(msg)) return `Il workflow chiede qualcosa che ComfyUI non ha (un nodo o un modello). Installa il nodo col Manager o controlla il nome del modello. (${msg.slice(0, 160)})`;
  return msg;
}

async function upload(base: string, file: string): Promise<string> {
  const form = new FormData();
  form.append('image', new Blob([readFileSync(file)]), basename(file));
  form.append('overwrite', 'true');
  const r = await call(`${base}/upload/image`, { method: 'POST', body: form });
  if (!r.ok) throw new UserError(`Caricamento di ${file} non riuscito (${r.status}).`);
  return ((await r.json()) as { name: string }).name;
}

/** una richiesta: accoda, aspetta su /history, scarica la prima immagine prodotta */
async function runOne(base: string, wf: Workflow, pollMs: number): Promise<Buffer> {
  const r = await call(`${base}/prompt`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: wf, client_id: 'tfm-assets' }) });
  const body = (await r.json()) as { prompt_id?: string; error?: { message?: string }; node_errors?: unknown };
  if (!r.ok || !body.prompt_id) throw new UserError(explain(`${body.error?.message ?? r.status} ${JSON.stringify(body.node_errors ?? '')}`));
  for (;;) {
    await new Promise((ok) => setTimeout(ok, pollMs));
    const h = (await (await call(`${base}/history/${body.prompt_id}`)).json()) as Record<string, {
      status?: { status_str?: string; messages?: [string, { exception_message?: string }][] };
      outputs?: Record<string, { images?: { filename: string; subfolder: string; type: string }[] }>;
    }>;
    const entry = h[body.prompt_id];
    if (!entry) continue;
    if (entry.status?.status_str === 'error') {
      const m = entry.status.messages?.find(([k]) => k === 'execution_error')?.[1].exception_message ?? 'errore sconosciuto';
      throw new UserError(explain(m));
    }
    const img = Object.values(entry.outputs ?? {}).flatMap((o) => o.images ?? [])[0];
    if (!img) continue;
    const q = new URLSearchParams({ filename: img.filename, subfolder: img.subfolder, type: img.type });
    return Buffer.from(await (await call(`${base}/view?${q}`)).arrayBuffer());
  }
}

const mmss = (ms: number) => { const s = Math.round(ms / 1000); return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`; };

/** `pnpm assets generate <job>`: tutte le varianti di tutti gli elementi, saltando quelle già fatte */
export async function generate(cfg: Config & { root: string }, job: Job, { force = false, pollMs = 1000, log = (s: string): void => { process.stdout.write(s); } }: { force?: boolean; pollMs?: number; log?: (s: string) => void } = {}) {
  const wfFile = join(cfg.root, cfg.workflows, job.workflow);
  if (!existsSync(wfFile)) throw new UserError(`Manca il workflow ${wfFile}. In ComfyUI: menu → Export (API), e salvalo lì.`);
  const template = readFileSync(wfFile, 'utf8');
  const todo = job.items.flatMap((it) => Array.from({ length: job.variants }, (_, v) => ({ it, v })))
    .filter(({ it, v }) => force || !existsSync(rawFile(cfg, job, it.name, v)));
  const skipped = job.items.length * job.variants - todo.length;
  log(`Job ${job.id}: ${todo.length} immagini da generare${skipped ? `, ${skipped} già fatte (--force per rifarle)` : ''}.\n`);
  const t0 = Date.now();
  const refs = new Map<string, string>();
  for (const [i, { it, v }] of todo.entries()) {
    const wf = JSON.parse(template) as Workflow; // il file è un workflow ComfyUI in formato API
    for (const [p, val] of Object.entries({ ...job.overrides, ...it.overrides })) bind(wf, p, val);
    const seed = seedFor(job.seedBase, it.name, v);
    const prompt = fullPrompt(job, it);
    const negative = it.negativePrompt ?? job.negativePrompt ?? '';
    const b = job.nodeBindings;
    bind(wf, b.positive!, prompt);
    bind(wf, b.seed!, seed);
    if (b.negative) bind(wf, b.negative, negative);
    if (b.width) bind(wf, b.width, job.size[0]);
    if (b.height) bind(wf, b.height, job.size[1]);
    if (it.styleRef) {
      if (!b.styleRef) throw new UserError(`L'elemento ${it.name} ha uno styleRef ma il job non ha nodeBindings.styleRef.`);
      const ref = join(cfg.root, 'assets', it.styleRef);
      if (!refs.has(ref)) refs.set(ref, await upload(cfg.comfyUrl, ref));
      bind(wf, b.styleRef, refs.get(ref));
    }
    const done = i / todo.length;
    const eta = i ? mmss(((Date.now() - t0) / i) * (todo.length - i)) : '…';
    log(`\r[${'#'.repeat(Math.round(done * 20)).padEnd(20, '-')}] ${i + 1}/${todo.length} ${it.name} v${v + 1} · manca ${eta}   `);
    const png = await runOne(cfg.comfyUrl, wf, pollMs);
    const file = rawFile(cfg, job, it.name, v);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, png);
    const model = Object.values(wf).map((n) => n.inputs.ckpt_name ?? n.inputs.unet_name).find((x) => typeof x === 'string') as string | undefined; // il primo modello caricato dal workflow
    writeFileSync(`${file.slice(0, -4)}.meta.json`, JSON.stringify({
      job: job.id, kind: job.kind, name: it.name, variant: v + 1, prompt, negative, seed, workflow: job.workflow,
      model: model ?? 'sconosciuto', license: cfg.models[model ?? ''] ?? 'da verificare', date: new Date().toISOString().slice(0, 10), process: job.process,
    }, null, 2));
  }
  log(`\rFatto: ${todo.length} immagini in ${mmss(Date.now() - t0)}.${' '.repeat(30)}\n`);
  return todo.length;
}
