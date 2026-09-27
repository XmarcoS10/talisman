// Convertitore del database della community (0.4.0): da un foglio CSV o dalle risposte di API-Football al file
// `talisman-db` (docs/database.md). Qui solo trasformazioni pure, niente rete: si provano con risposte finte.
// Il gioco non contiene né scarica dati reali: questo strumento gira sul computer di chi lo usa, con i suoi dati.
import { DB_FORMAT, DB_VERSION, validateDb, type DbClub, type DbFile, type DbPlayer } from '../../src/engine/database.ts';
import type { Position } from '../../src/engine/model.ts';

export const LEAGUE_IDS = ['ITA1', 'ITA2', 'ITA3'] as const;
const clampInt = (v: number, lo: number, hi: number) => Math.round(Math.min(hi, Math.max(lo, v)));

/** reputazione dalla forza media della rosa: l'inverso di come il gioco genera le rose (CA ≈ 48 + 1,08 × reputazione) */
export const reputationFrom = (abilities: number[]) =>
  clampInt((abilities.reduce((a, b) => a + b, 0) / Math.max(1, abilities.length) - 48) / 1.08, 1, 100);

/** colori di ripiego, stabili per nome, quando la fonte non li dà (si correggono a mano nel file) */
const PALETTE = ['#c81e1e', '#1d4ed8', '#111827', '#047857', '#f59e0b', '#7c3aed', '#0e7490', '#be185d', '#f2f2f2', '#9a3412'];
export function colorsFor(name: string): [string, string, string] {
  let h = 2166136261;
  for (const ch of name) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const a = h % PALETTE.length, b = (a + 1 + ((h >>> 8) % (PALETTE.length - 1))) % PALETTE.length;
  return [PALETTE[a]!, PALETTE[b]!, '#0f131d'];
}

// ---------------------------------------------------------------- CSV

/** una riga per giocatore; le colonne del club si ripetono (vale la prima riga del club) */
export const CSV_COLUMNS = ['league', 'club', 'city', 'colors', 'reputation', 'first', 'last', 'born', 'nation', 'position', 'ability', 'potential', 'wage', 'until'] as const;

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const sep = (lines[0]!.match(/;/g)?.length ?? 0) >= (lines[0]!.match(/,/g)?.length ?? 0) ? ';' : ',';
  const split = (line: string) => {
    const out: string[] = [];
    let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i]!;
      if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true;
      else if (c === sep) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const head = split(lines[0]!).map((h) => h.toLowerCase());
  return lines.slice(1).map((l) => Object.fromEntries(split(l).map((v, i) => [head[i] ?? `col${i}`, v])));
}

const num = (s: string | undefined) => (s === undefined || s === '' ? undefined : Number(s.replace(',', '.')));

export function dbFromCsv(rows: Record<string, string>[], name: string, season?: number): DbFile {
  const leagues = LEAGUE_IDS.map((id) => ({ id, name: id, clubs: [] as DbClub[] }));
  const byClub = new Map<string, DbClub>();
  for (const r of rows) {
    const lg = leagues.find((l) => l.id === (r.league ?? '').toUpperCase());
    if (!lg || !r.club) continue; // le righe senza campionato valido le segnala il controllo (club mancanti)
    let club = byClub.get(r.club);
    if (!club) {
      const colors = (r.colors ?? '').split('/').map((c) => c.trim());
      club = { name: r.club, city: r.city || r.club, colors: colors.length === 3 ? (colors as [string, string, string]) : colorsFor(r.club), reputation: num(r.reputation) ?? -1, players: [] };
      byClub.set(r.club, club);
      lg.clubs.push(club);
    }
    const p: DbPlayer = { first: r.first ?? '', last: r.last ?? '', born: num(r.born) ?? 0, nation: (r.nation ?? '').toUpperCase(), position: (r.position ?? '').toUpperCase() as Position };
    for (const [k, v] of [['ability', num(r.ability)], ['potential', num(r.potential)], ['wage', num(r.wage)], ['until', num(r.until)]] as const) if (v !== undefined) p[k] = v;
    club.players.push(p);
  }
  for (const c of byClub.values()) if (c.reputation < 0) c.reputation = reputationFrom(c.players.map((p) => p.ability ?? 100));
  return { format: DB_FORMAT, version: DB_VERSION, name, ...(season ? { season } : {}), leagues };
}

// ---------------------------------------------------------------- API-Football (v3, api-sports.io)

/** le parti delle risposte che servono (il resto si ignora) */
export interface ApiTeam { team: { id: number; name: string; code: string | null; founded: number | null; logo?: string }; venue: { name: string | null; city: string | null; capacity: number | null } }
export interface ApiPlayer {
  player: { id: number; firstname: string | null; lastname: string | null; name: string; birth: { date: string | null }; nationality: string | null; height: string | null };
  statistics: { team: { id: number }; league: { id: number }; games: { appearences: number | null; minutes: number | null; position: string | null; rating: string | null } }[];
}

const POS: Record<string, Position> = { Goalkeeper: 'GK', Defender: 'DC', Midfielder: 'MC', Attacker: 'ST' };

/** paesi → codici FIFA; quelli che mancano prendono le prime tre lettere (si correggono a mano) */
const COUNTRY: Record<string, string> = {
  Italy: 'ITA', Spain: 'ESP', France: 'FRA', Brazil: 'BRA', Argentina: 'ARG', Portugal: 'POR', Netherlands: 'NED', Serbia: 'SRB',
  Croatia: 'CRO', Senegal: 'SEN', Nigeria: 'NGA', Sweden: 'SWE', England: 'ENG', Germany: 'GER', Belgium: 'BEL', Switzerland: 'SUI',
  Austria: 'AUT', Denmark: 'DEN', Norway: 'NOR', Poland: 'POL', 'Czech Republic': 'CZE', Slovakia: 'SVK', Slovenia: 'SVN', Albania: 'ALB',
  Kosovo: 'KVX', Montenegro: 'MNE', 'Bosnia and Herzegovina': 'BIH', 'North Macedonia': 'MKD', Greece: 'GRE', Turkey: 'TUR', Romania: 'ROU',
  Hungary: 'HUN', Ukraine: 'UKR', Georgia: 'GEO', Scotland: 'SCO', Wales: 'WAL', Ireland: 'IRL', Uruguay: 'URU', Colombia: 'COL',
  Chile: 'CHI', Paraguay: 'PAR', Venezuela: 'VEN', Ecuador: 'ECU', Peru: 'PER', Mexico: 'MEX', USA: 'USA', Canada: 'CAN', Morocco: 'MAR',
  Algeria: 'ALG', Tunisia: 'TUN', Egypt: 'EGY', Ghana: 'GHA', 'Ivory Coast': 'CIV', "Côte d'Ivoire": 'CIV', Cameroon: 'CMR', Mali: 'MLI',
  Gambia: 'GAM', Guinea: 'GUI', 'Congo DR': 'COD', Angola: 'ANG', Japan: 'JPN', 'South Korea': 'KOR', 'Korea Republic': 'KOR', Australia: 'AUS',
  Iceland: 'ISL', Finland: 'FIN', Bulgaria: 'BUL', Lithuania: 'LTU', Latvia: 'LVA', Estonia: 'EST', Israel: 'ISR', Russia: 'RUS',
};
export const countryCode = (c: string | null) => (c ? COUNTRY[c] ?? (c.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X')) : 'XXX');

/**
 * abilità stimata dalle statistiche: base della categoria, poi voto medio e minuti giocati. Le API danno gol, minuti e
 * voti, non attributi: è una stima, e gli attributi il gioco li genera attorno a questo numero.
 */
export function estimateAbility(level: number, rating: number | null, minutes: number, season: number, born: number) {
  const base = [132, 100, 75][level - 1] ?? 75;
  const share = Math.min(1, minutes / 3000);
  let a = base + (share - 0.4) * 30;
  if (rating !== null && Number.isFinite(rating)) a += (rating - 6.8) * 45;
  else if (minutes === 0) a -= 12;
  const age = season - born;
  if (age < 21) a -= (21 - age) * 3; // i ragazzi con pochi minuti non sono ancora titolari
  return clampInt(a, 35, 190);
}

export function apiPlayer(p: ApiPlayer, leagueId: number, teamId: number, level: number, season: number): DbPlayer & { minutes: number } {
  const st = p.statistics.find((s) => s.league.id === leagueId && s.team.id === teamId) ?? p.statistics[0];
  const born = Number((p.player.birth.date ?? '').slice(0, 4)) || season - 25;
  const minutes = st?.games.minutes ?? 0;
  const ability = estimateAbility(level, st?.games.rating ? Number(st.games.rating) : null, minutes, season, born);
  const age = season - born;
  const first = (p.player.firstname ?? '').split(' ')[0] || p.player.name.split(' ')[0] || '?';
  const last = p.player.lastname || p.player.name.split(' ').slice(1).join(' ') || p.player.name;
  const height = Number((p.player.height ?? '').replace(/[^0-9]/g, ''));
  return {
    first: first.slice(0, 30), last: last.slice(0, 40), born, nation: countryCode(p.player.nationality), position: POS[st?.games.position ?? ''] ?? 'MC',
    ...(height >= 150 && height <= 215 ? { height } : {}), ability, potential: age < 24 ? clampInt(ability + (24 - age) * 5, ability, 200) : ability + 2, minutes,
  };
}

/** un club dall'API: la rosa si ordina per minuti e si taglia a 45; servono almeno 2 portieri (lo dice il controllo) */
export function apiClub(t: ApiTeam, players: ApiPlayer[], leagueId: number, level: number, season: number, crest?: string): DbClub {
  const squad = players.map((p) => apiPlayer(p, leagueId, t.team.id, level, season)).sort((a, b) => b.minutes - a.minutes).slice(0, 45);
  const city = (t.venue.city ?? t.team.name).split(',')[0]!.slice(0, 40);
  return {
    name: t.team.name.slice(0, 40), ...(t.team.code && /^[A-Za-z]{2,4}$/.test(t.team.code) ? { short: t.team.code } : {}), city, colors: colorsFor(t.team.name),
    ...(crest ? { crest } : {}), ...(t.team.founded ? { founded: t.team.founded } : {}),
    reputation: reputationFrom(squad.slice(0, 16).map((p) => p.ability ?? 100)),
    ...(t.venue.name && t.venue.capacity && t.venue.capacity >= 500 ? { stadium: { name: t.venue.name.slice(0, 60), capacity: Math.min(150_000, t.venue.capacity) } } : {}),
    players: squad.map(({ minutes: _m, ...p }) => p),
  };
}

/** il file finale, con i problemi del controllo (se ci sono, il file va sistemato prima di caricarlo) */
export function finish(db: DbFile): { db: DbFile; problems: string[] } {
  // due club con la stessa città (Roma, Milano, Genova...): il secondo prende il nome del club come città
  const seen = new Set<string>();
  for (const c of db.leagues.flatMap((l) => l.clubs)) { if (seen.has(c.city)) c.city = c.name.slice(0, 40); seen.add(c.city); }
  return { db, problems: validateDb(db) };
}
