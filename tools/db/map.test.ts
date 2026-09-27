// Convertitore del database: CSV e risposte finte di API-Football diventano un file che il gioco accetta.
import { describe, expect, it } from 'vitest';
import { worldFromDb } from '../../src/engine/database.ts';
import type { Position } from '../../src/engine/model.ts';
import { apiClub, countryCode, dbFromCsv, estimateAbility, finish, parseCsv, type ApiPlayer, type ApiTeam } from './map.ts';

const ROLES: Position[] = ['GK', 'GK', 'DC', 'DC', 'DC', 'DL', 'DR', 'DM', 'MC', 'MC', 'MC', 'AML', 'AMR', 'AMC', 'ST', 'ST', 'ST', 'MR'];

describe('convertitore del database', () => {
  it('dal CSV: righe raggruppate per club, reputazione stimata, file accettato dal gioco', () => {
    const head = 'league;club;city;colors;reputation;first;last;born;nation;position;ability;potential;wage;until';
    const rows = [head];
    for (const [li, lg] of ['ITA1', 'ITA2', 'ITA3'].entries())
      for (let c = 0; c < 20; c++)
        for (const [i, pos] of ROLES.entries())
          rows.push(`${lg};"Club ${li}-${c}";Città ${li}-${c};${c ? '' : '#c81e1e/#ffffff/#111827'};;Nome${i};"Cognome; ${i}";${1995 + (i % 10)};${i % 3 ? 'ITA' : 'ENG'};${pos};${150 - li * 30};;;`);
    const db = dbFromCsv(parseCsv(rows.join('\r\n')), 'prova CSV', 2026);
    const { problems } = finish(db);
    expect(problems).toEqual([]);
    const club = db.leagues[0]!.clubs[0]!;
    expect(club.colors).toEqual(['#c81e1e', '#ffffff', '#111827']);
    expect(club.players[0]!.last).toBe('Cognome; 0'); // il separatore dentro le virgolette resta nel nome
    expect(club.reputation).toBe(Math.round((150 - 48) / 1.08));
    const w = worldFromDb(db, 1);
    expect(Object.keys(w.players)).toHaveLength(60 * ROLES.length);
  });

  it('da API-Football: stime ragionevoli e file accettato dal gioco', () => {
    const season = 2025;
    const team = (id: number, city: string): ApiTeam => ({ team: { id, name: `Squadra ${id}`, code: 'SQU', founded: 1920 }, venue: { name: `Stadio ${id}`, city, capacity: 30000 } });
    const player = (id: number, team: number, league: number, pos: string, minutes: number, rating: string | null, nat: string): ApiPlayer => ({
      player: { id, firstname: 'Nome Secondo', lastname: `Cognome${id}`, name: `N. Cognome${id}`, birth: { date: '1998-03-01' }, nationality: nat, height: '184 cm' },
      statistics: [{ team: { id: team }, league: { id: league }, games: { appearences: 20, minutes, position: pos, rating } }],
    });
    const leagues = [135, 136, 138].map((lg, li) => ({
      id: (['ITA1', 'ITA2', 'ITA3'] as const)[li], name: `Lega ${lg}`,
      clubs: Array.from({ length: 20 }, (_, c) => {
        const id = lg * 100 + c;
        const ps = ['Goalkeeper', 'Goalkeeper', ...Array(6).fill('Defender'), ...Array(6).fill('Midfielder'), ...Array(4).fill('Attacker')]
          .map((pos, i) => player(id * 100 + i, id, lg, pos, 3000 - i * 120, i % 5 ? (7.4 - c * 0.05).toFixed(2) : null, i % 2 ? 'Italy' : 'Ivory Coast'));
        return apiClub(team(id, c === 1 ? 'Roma' : c === 2 ? 'Roma' : `Città ${id}`), ps, lg, li + 1, season);
      }),
    }));
    const { db, problems } = finish({ format: 'talisman-db', version: 1, name: 'prova API', season, leagues });
    expect(problems).toEqual([]);
    expect(db.leagues[0]!.clubs[2]!.city).not.toBe('Roma'); // due club della stessa città: il secondo prende il nome
    const p = db.leagues[0]!.clubs[0]!.players[0]!; // il più impiegato: il primo portiere, ivoriano
    expect([p.first, p.nation, p.position, p.height]).toEqual(['Nome', 'CIV', 'GK', 184]);
    expect(countryCode('Atlantide')).toBe('ATL');
  });

  it("l'abilità stimata segue categoria, voto e minuti", () => {
    expect(estimateAbility(1, 7.5, 3200, 2025, 1997)).toBeGreaterThan(155);
    expect(estimateAbility(1, 6.4, 400, 2025, 1997)).toBeLessThan(125);
    expect(estimateAbility(3, 6.8, 1500, 2025, 1997)).toBeLessThan(estimateAbility(1, 6.8, 1500, 2025, 1997));
  });
});
