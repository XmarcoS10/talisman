// Configurazione della pipeline degli asset (GUIDA, Blocco C §4): cartelle, limiti, palette, e i file di job.
// Nessun percorso assoluto nel codice: tutto parte da assets/config.json, relativo alla radice del progetto.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';

export const ROOT = resolve(import.meta.dirname, '..', '..');

export interface Config {
  comfyUrl: string;
  workflows: string; // cartella dei workflow ComfyUI in formato API
  raw: string; // dove arrivano le immagini generate
  approved: string; // quelle scelte dal provino
  archive: string; // quelle scartate (non si cancella niente)
  out: string; // quelle pronte per il gioco
  manifest: string; // file TypeScript generato per la UI
  licenses: string;
  limitsKb: Record<string, number>; // peso massimo per tipo di asset
  models: Record<string, string>; // licenza di ogni modello, per il registro
}

export interface ProcessOpts {
  width: number;
  height: number;
  palette?: number; // intensità della correzione verso la palette, 0-1 (default 0.35)
  vignette?: boolean; // vignettatura e sfumatura nel terzo inferiore, per il testo sopra
  thumb?: boolean; // versione da 256 px per le liste
}

export interface JobItem { name: string; prompt: string; negativePrompt?: string; styleRef?: string; overrides?: Record<string, unknown> }

export interface Job {
  id: string;
  workflow: string;
  output: string;
  kind: string; // sfondo, illustrazione, icona, texture: decide il limite di peso
  variants: number;
  seedBase: number;
  size: [number, number];
  styleSuffix?: string;
  negativePrompt?: string;
  nodeBindings: Record<string, string>; // positive, negative, seed, width, height, styleRef → "nodo.inputs.campo"
  overrides?: Record<string, unknown>;
  process: ProcessOpts;
  items: JobItem[];
}

export interface StyleBible { palette: string[]; notes?: string }

const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T; // forma verificata da chi la usa

export function loadConfig(root = ROOT): Config & { root: string } {
  const file = join(root, 'assets', 'config.json');
  if (!existsSync(file)) throw new UserError(`Manca ${file}: è la configurazione della pipeline.`);
  return { ...readJson<Config>(file), root };
}

export const loadStyle = (root = ROOT) => readJson<StyleBible>(join(root, 'assets', 'style-bible.json'));

/** un errore da spiegare a chi usa il comando, senza stack trace */
export class UserError extends Error {}

export function loadJob(file: string): Job {
  if (!existsSync(file)) throw new UserError(`Il job ${file} non esiste.`);
  const raw = parse(readFileSync(file, 'utf8')) as Partial<Job>; // controllato campo per campo qui sotto
  const missing = (['id', 'workflow', 'output', 'kind', 'variants', 'seedBase', 'size', 'nodeBindings', 'process', 'items'] as const).filter((k) => raw[k] === undefined);
  if (missing.length) throw new UserError(`Nel job ${file} mancano: ${missing.join(', ')}.`);
  const job = raw as Job;
  for (const k of ['positive', 'seed'] as const) if (!job.nodeBindings[k]) throw new UserError(`Nel job ${job.id} manca nodeBindings.${k}.`);
  const names = new Set<string>();
  for (const it of job.items) {
    if (!it.name || !it.prompt) throw new UserError(`Nel job ${job.id} c'è un elemento senza name o prompt.`);
    if (names.has(it.name)) throw new UserError(`Nel job ${job.id} il nome «${it.name}» è ripetuto.`);
    names.add(it.name);
  }
  return job;
}

/** il prompt completo: quello dell'elemento più il suffisso di stile del job, scritto una volta sola */
export const fullPrompt = (job: Job, it: JobItem) => (job.styleSuffix ? `${it.prompt}, ${job.styleSuffix}` : it.prompt);
