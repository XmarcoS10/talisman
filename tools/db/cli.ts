// Convertitore del database della community (0.4.0). Gira sul tuo computer e scrive un file da caricare nel gioco
// (Nuova carriera → Carica un database). Il gioco non contiene né scarica dati reali.
//
//   node tools/db/cli.ts csv giocatori.csv [--out database.json] [--name "Il mio database"] [--season 2026]
//   node tools/db/cli.ts api-football --season 2025 [--a 135 --b 136 --c 138] [--crests] [--out database.json]
//
// API-Football (api-sports.io): serve una chiave tua, nella variabile d'ambiente API_FOOTBALL_KEY. Le risposte si
// salvano in .cache/api-football: il piano gratuito dà 100 richieste al giorno, e rilanciando si riparte da dove si
// era arrivati. Le condizioni d'uso del servizio (e dei dati che ne escono) restano di chi usa la chiave.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DbFile } from '../../src/engine/database.ts';
import { apiClub, dbFromCsv, finish, LEAGUE_IDS, parseCsv, type ApiPlayer, type ApiTeam } from './map.ts';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (k: string, d?: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const out = opt('out', 'database.json')!;
const season = Number(opt('season', '2025'));

function write(db: DbFile) {
  const { problems } = finish(db);
  writeFileSync(out, JSON.stringify(db));
  console.log(`scritto ${out}`);
  if (problems.length) {
    console.log(`\nATTENZIONE: il gioco rifiuterà il file finché non sistemi ${problems.length} problemi:`);
    for (const p of problems.slice(0, 30)) console.log(`  - ${p}`);
    process.exitCode = 1;
  } else console.log('il file passa il controllo del gioco');
}

// ---------------------------------------------------------------- API-Football

const API = 'https://v3.football.api-sports.io';
const CACHE = join('.cache', 'api-football');
let last = 0;

async function get<T>(path: string): Promise<T> {
  const file = join(CACHE, `${path.replace(/[^A-Za-z0-9]+/g, '_')}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')) as T;
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error('manca la chiave: imposta la variabile d\'ambiente API_FOOTBALL_KEY');
  const wait = last + 6500 - Date.now(); // piano gratuito: 10 richieste al minuto
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const res = await fetch(`${API}${path}`, { headers: { 'x-apisports-key': key } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  const body = await res.json() as { errors?: unknown; response: unknown; paging?: { current: number; total: number } };
  const errors = body.errors && (Array.isArray(body.errors) ? body.errors : Object.values(body.errors));
  if (errors && (errors as unknown[]).length) throw new Error(`${path}: ${JSON.stringify(body.errors)} (le risposte già scaricate restano in cache: rilancia domani)`);
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, JSON.stringify(body));
  return body as T;
}

async function players(league: number, team: number): Promise<ApiPlayer[]> {
  const all: ApiPlayer[] = [];
  for (let page = 1, total = 1; page <= total; page++) {
    const body = await get<{ response: ApiPlayer[]; paging: { total: number } }>(`/players?league=${league}&season=${season}&team=${team}&page=${page}`);
    all.push(...body.response);
    total = body.paging.total;
  }
  return all;
}

async function crestOf(url: string | undefined): Promise<string | undefined> {
  if (!url || !args.includes('--crests')) return undefined;
  const res = await fetch(url);
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || !/^image\/(png|jpeg|webp)/.test(type)) return undefined;
  const b64 = Buffer.from(await res.arrayBuffer()).toString('base64');
  return b64.length < 290_000 ? `data:${type.split(';')[0]};base64,${b64}` : undefined;
}

async function fromApi(): Promise<DbFile> {
  const ids = [Number(opt('a', '135')), Number(opt('b', '136')), Number(opt('c', '138'))];
  const leagues = [];
  for (const [li, league] of ids.entries()) {
    const teams = (await get<{ response: ApiTeam[] }>(`/teams?league=${league}&season=${season}`)).response;
    console.log(`${LEAGUE_IDS[li]} (lega ${league}): ${teams.length} squadre`);
    const clubs = [];
    for (const t of teams) {
      clubs.push(apiClub(t, await players(league, t.team.id), league, li + 1, season, await crestOf(t.team.logo)));
      process.stdout.write('.');
    }
    console.log('');
    leagues.push({ id: LEAGUE_IDS[li]!, name: LEAGUE_IDS[li]!, clubs });
  }
  return { format: 'talisman-db', version: 1, name: opt('name', `API-Football ${season}/${String(season + 1).slice(2)}`)!, season, leagues };
}

// ---------------------------------------------------------------- avvio

const [mode, file] = args;
if (mode === 'csv' && file) write(dbFromCsv(parseCsv(readFileSync(file, 'utf8')), opt('name', file)!, opt('season') ? season : undefined));
else if (mode === 'api-football') fromApi().then(write, (e: Error) => { console.error(e.message); process.exitCode = 1; });
else console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(0, 12).join('\n'));
