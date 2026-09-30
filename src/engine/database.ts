// Database della community (0.4.0, regola 6): un file con il mondo intero — campionati, club, rose, attributi —
// da cui parte una carriera nuova. Il gioco non distribuisce nomi, stemmi o dati reali: il file lo prepara e lo
// carica chi gioca. Quello che il file non dice (personalità, carattere nascosto, agenti, osservatori, calendario)
// lo genera il mondo come sempre, dal seme.
import { ADJACENT } from './balance.ts';
import { ALL_ATTRS, POSITIONS, type AttrKey, type Personality, type Player, type Position, type WorldState } from './model.ts';
import { NATIONS } from './names.ts';
import { makePlayer, recomputeCA } from './players.ts';
import { bornTraits } from './traits.ts';
import type { Rng } from './rng.ts';
import { clamp } from './util.ts';
import { emptyWorld, finishWorld, LEAGUES, makeClub } from './world.ts';

export const DB_FORMAT = 'talisman-db';
export const DB_VERSION = 1;

export interface DbPlayer {
  first: string;
  last: string;
  born: number; // anno di nascita
  nation: string; // codice di tre lettere
  position: Position; // ruolo naturale
  positions?: Partial<Record<Position, number>>; // altri ruoli, 1-5
  foot?: 'L' | 'R' | 'B';
  height?: number; // cm
  attrs?: Partial<Record<AttrKey, number>>; // 1-20; quelli che mancano si generano attorno ad `ability`
  ability?: number; // 1-200, se non ci sono tutti gli attributi
  potential?: number; // 1-200
  personality?: Partial<Personality>; // 1-20
  wage?: number; // euro all'anno
  until?: number; // stagione di scadenza del contratto
  release?: number; // clausola rescissoria, euro
}

export interface DbClub {
  name: string;
  short?: string; // sigla di tre lettere
  city: string;
  colors: [string, string, string]; // #rrggbb
  crest?: string; // immagine PNG, JPEG o WebP come data URL
  founded?: number;
  reputation: number; // 1-100
  stadium?: { name: string; capacity: number };
  balance?: number; // cassa in euro
  players: DbPlayer[];
}

export interface DbFile {
  format: typeof DB_FORMAT;
  version: number;
  name: string; // come si chiama il database («Serie A 2026/27 della community»)
  season?: number; // anno di inizio stagione
  leagues: { id: string; name: string; clubs: DbClub[] }[]; // ITA1, ITA2, ITA3, venti club ciascuno
}

// limiti di sicurezza: il file arriva da fuori
const MAX_CREST = 300_000; // caratteri del data URL (~220 KB di immagine)
const CREST_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const PERSONALITY: (keyof Personality)[] = ['ambition', 'professionalism', 'loyalty', 'temperament', 'sociability', 'pressureTolerance'];

/**
 * controllo del file: restituisce l'elenco dei problemi in chiaro (vuoto = si può caricare). Controlla tutto quello
 * che il gioco legge, così un file sbagliato non entra mai nel mondo.
 */
export function validateDb(raw: unknown): string[] {
  const out: string[] = [];
  const bad = (where: string, what: string) => { if (out.length < 50) out.push(`${where}: ${what}`); };
  if (!isObj(raw)) return ['il file non è un database'];
  if (raw.format !== DB_FORMAT) return [`manca "format": "${DB_FORMAT}"`];
  if (raw.version !== DB_VERSION) return [`versione ${String(raw.version)} non supportata (questa versione del gioco legge la ${DB_VERSION})`];
  if (!isStr(raw.name, 80)) bad('name', 'testo da 1 a 80 caratteri');
  if (raw.season !== undefined && !isInt(raw.season, 1900, 2200)) bad('season', 'anno fra 1900 e 2200');
  if (!Array.isArray(raw.leagues) || raw.leagues.length !== LEAGUES.length) return [...out, `servono ${LEAGUES.length} campionati (${LEAGUES.map((l) => l.id).join(', ')})`];
  const cities = new Set<string>();
  raw.leagues.forEach((lg: unknown, li: number) => {
    const want = LEAGUES[li]!;
    const w = `leagues[${li}]`;
    if (!isObj(lg)) return bad(w, 'non è un campionato');
    if (lg.id !== want.id) bad(`${w}.id`, `deve essere "${want.id}"`);
    if (!isStr(lg.name, 40)) bad(`${w}.name`, 'testo da 1 a 40 caratteri');
    if (!Array.isArray(lg.clubs) || lg.clubs.length !== 20) return bad(`${w}.clubs`, 'servono 20 club');
    lg.clubs.forEach((c: unknown, ci: number) => {
      checkClub(c, `${w}.clubs[${ci}]`, bad);
      if (isObj(c) && typeof c.city === 'string') {
        if (cities.has(c.city)) bad(`${w}.clubs[${ci}].city`, `«${c.city}» è già usata da un altro club`);
        cities.add(c.city);
      }
    });
  });
  return out;
}

type Bad = (where: string, what: string) => void;

function checkClub(c: unknown, w: string, bad: Bad) {
  if (!isObj(c)) return bad(w, 'non è un club');
  if (!isStr(c.name, 40)) bad(`${w}.name`, 'testo da 1 a 40 caratteri');
  if (c.short !== undefined && !(typeof c.short === 'string' && /^[A-Za-z]{2,4}$/.test(c.short))) bad(`${w}.short`, 'sigla di 2-4 lettere');
  if (!isStr(c.city, 40)) bad(`${w}.city`, 'testo da 1 a 40 caratteri');
  if (!Array.isArray(c.colors) || c.colors.length !== 3 || !c.colors.every((x: unknown) => typeof x === 'string' && COLOR_RE.test(x))) bad(`${w}.colors`, 'tre colori #rrggbb');
  if (c.crest !== undefined && !(typeof c.crest === 'string' && c.crest.length <= MAX_CREST && CREST_RE.test(c.crest))) bad(`${w}.crest`, 'immagine PNG, JPEG o WebP (data URL base64) sotto i 220 KB');
  if (c.founded !== undefined && !isInt(c.founded, 1850, 2100)) bad(`${w}.founded`, 'anno fra 1850 e 2100');
  if (!isInt(c.reputation, 1, 100)) bad(`${w}.reputation`, 'intero da 1 a 100');
  if (c.stadium !== undefined && !(isObj(c.stadium) && isStr(c.stadium.name, 60) && isInt(c.stadium.capacity, 500, 150_000))) bad(`${w}.stadium`, 'nome e capienza (500-150.000)');
  if (c.balance !== undefined && !isInt(c.balance, -2e9, 5e9)) bad(`${w}.balance`, 'euro, intero');
  if (!Array.isArray(c.players) || c.players.length < 16 || c.players.length > 45) return bad(`${w}.players`, 'da 16 a 45 giocatori');
  if (c.players.filter((p: unknown) => isObj(p) && p.position === 'GK').length < 2) bad(`${w}.players`, 'servono almeno 2 portieri');
  c.players.forEach((p: unknown, pi: number) => checkPlayer(p, `${w}.players[${pi}]`, bad));
}

function checkPlayer(p: unknown, w: string, bad: Bad) {
  if (!isObj(p)) return bad(w, 'non è un giocatore');
  if (!isStr(p.first, 30)) bad(`${w}.first`, 'nome da 1 a 30 caratteri');
  if (!isStr(p.last, 40)) bad(`${w}.last`, 'cognome da 1 a 40 caratteri');
  if (!isInt(p.born, 1950, 2200)) bad(`${w}.born`, 'anno di nascita');
  if (!(typeof p.nation === 'string' && /^[A-Z]{3}$/.test(p.nation))) bad(`${w}.nation`, 'codice di tre lettere maiuscole');
  if (!POSITIONS.includes(p.position as Position)) bad(`${w}.position`, `uno di ${POSITIONS.join(' ')}`);
  if (p.positions !== undefined && !(isObj(p.positions) && Object.entries(p.positions).every(([k, v]) => POSITIONS.includes(k as Position) && isInt(v, 1, 5)))) bad(`${w}.positions`, 'ruoli con familiarità 1-5');
  if (p.foot !== undefined && !['L', 'R', 'B'].includes(p.foot as string)) bad(`${w}.foot`, 'L, R o B');
  if (p.height !== undefined && !isInt(p.height, 150, 215)) bad(`${w}.height`, 'cm fra 150 e 215');
  if (p.attrs !== undefined && !(isObj(p.attrs) && Object.entries(p.attrs).every(([k, v]) => ALL_ATTRS.includes(k as AttrKey) && isInt(v, 1, 20)))) bad(`${w}.attrs`, 'attributi conosciuti, interi 1-20');
  if (p.ability !== undefined && !isInt(p.ability, 1, 200)) bad(`${w}.ability`, 'intero 1-200');
  if (p.potential !== undefined && !isInt(p.potential, 1, 200)) bad(`${w}.potential`, 'intero 1-200');
  if (p.attrs === undefined && p.ability === undefined) bad(w, 'servono gli attributi o almeno "ability"');
  if (p.personality !== undefined && !(isObj(p.personality) && Object.entries(p.personality).every(([k, v]) => PERSONALITY.includes(k as keyof Personality) && isInt(v, 1, 20)))) bad(`${w}.personality`, 'assi conosciuti, interi 1-20');
  if (p.wage !== undefined && !isInt(p.wage, 0, 1e9)) bad(`${w}.wage`, 'euro all\'anno, intero');
  if (p.until !== undefined && !isInt(p.until, 1900, 2200)) bad(`${w}.until`, 'anno');
  if (p.release !== undefined && !isInt(p.release, 0, 5e9)) bad(`${w}.release`, 'euro, intero');
}

function isObj(v: unknown): v is Record<string, unknown> { return typeof v === 'object' && v !== null && !Array.isArray(v); }
const isStr = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isInt = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;

/** un giocatore del file: si genera come sempre (il resto della scheda) e poi si scrive sopra quello che il file dice */
function dbPlayer(world: WorldState, rng: Rng, d: DbPlayer): Player {
  const age = clamp(world.season - d.born, 15, 45);
  const gen = NATIONS[d.nation] ? d.nation : 'ITA'; // i nomi generati non servono: si sovrascrivono subito
  const p = makePlayer(rng, world.nextPlayerId++, d.position, d.ability ?? 100, world.season, [age, age], gen);
  Object.assign(p, { firstName: d.first, lastName: d.last, birthYear: d.born, nation: d.nation });
  if (d.foot) p.foot = d.foot;
  if (d.height) p.heightCm = d.height;
  p.positions = { ...d.positions, [d.position]: 5 };
  for (const adj of ADJACENT[d.position] ?? []) if (!d.positions) p.positions[adj] ??= 3;
  if (d.attrs) Object.assign(p.attrs, d.attrs);
  recomputeCA(p);
  p.traits = bornTraits(p); // dagli attributi del file, non da quelli generati
  p.pa = clamp(d.potential ?? p.pa, p.ca, 200);
  if (d.personality) Object.assign(p.personality, d.personality);
  if (d.until !== undefined) p.contract.until = Math.max(world.season, d.until);
  if (d.release !== undefined) p.contract.release = d.release;
  return p;
}

/** il mondo di una carriera nuova dal database: stessa costruzione di `newWorld`, con club e rose del file */
export function worldFromDb(db: DbFile, seed: number): WorldState {
  const { world, rng } = emptyWorld(seed, db.season ?? 2026);
  db.leagues.forEach((lg, li) => {
    const def = LEAGUES[li]!;
    const comp = { id: def.id, name: lg.name, level: def.level, clubIds: [], fixtures: [], promote: def.promote, relegate: def.relegate };
    world.competitions[comp.id] = comp;
    lg.clubs.forEach((d, i) => {
      const club = makeClub(world, rng, comp, i, d.city, (c) => {
        for (const dp of d.players) {
          const p = dbPlayer(world, rng, dp);
          p.clubId = c.id;
          world.players[p.id] = p;
          c.playerIds.push(p.id);
        }
      });
      Object.assign(club, { name: d.name, shortName: (d.short ?? d.city.replace(/[^A-Za-z]/g, '').slice(0, 3)).toUpperCase(), colors: d.colors, crest: d.crest ?? null, reputation: d.reputation });
      if (d.founded) club.founded = d.founded;
      if (d.stadium) club.stadium = { ...d.stadium };
      if (d.balance !== undefined) club.balance = d.balance;
    });
  });
  finishWorld(world, rng);
  // gli stipendi del file valgono più di quelli stimati (finishWorld li riscala sul fatturato)
  db.leagues.forEach((lg, li) => lg.clubs.forEach((d, ci) => {
    const club = world.clubs[world.competitions[LEAGUES[li]!.id]!.clubIds[ci]!]!;
    d.players.forEach((dp, pi) => { if (dp.wage !== undefined) world.players[club.playerIds[pi]!]!.contract.wage = dp.wage; });
  }));
  return world;
}

/** il mondo come database, per chi vuole partire da quello generato e riscriverlo (i campi del formato, niente altro) */
export function worldToDb(world: WorldState, name: string): DbFile {
  return {
    format: DB_FORMAT, version: DB_VERSION, name, season: world.season,
    leagues: LEAGUES.map((def) => {
      const comp = world.competitions[def.id]!;
      return {
        id: def.id, name: comp.name,
        clubs: comp.clubIds.map((id) => world.clubs[id]!).map((c) => ({
          name: c.name, short: c.shortName, city: c.city, colors: c.colors, ...(c.crest ? { crest: c.crest } : {}),
          founded: c.founded, reputation: c.reputation, stadium: { ...c.stadium }, balance: c.balance,
          players: c.playerIds.map((pid) => world.players[pid]!).map((p) => ({
            first: p.firstName, last: p.lastName, born: p.birthYear, nation: p.nation, position: p.position, positions: { ...p.positions },
            foot: p.foot, height: p.heightCm, attrs: { ...p.attrs }, potential: p.pa, personality: { ...p.personality },
            wage: p.contract.wage, until: p.contract.until, ...(p.contract.release !== null ? { release: p.contract.release } : {}),
          })),
        })),
      };
    }),
  };
}
