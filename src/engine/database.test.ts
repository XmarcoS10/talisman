// Database della community (0.4.0): un mondo esportato si ricarica uguale, un file sbagliato non entra mai.
import { describe, expect, it } from 'vitest';
import { validateDb, worldFromDb, worldToDb, type DbFile } from './database.ts';
import { integrity } from './save.ts';
import { advance, newWorld } from './world.ts';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const copy = (db: DbFile): DbFile => JSON.parse(JSON.stringify(db)) as DbFile;

describe('database della community', () => {
  const src = newWorld(3);
  const db = worldToDb(src, 'prova');

  it('un mondo esportato è un database valido e si ricarica uguale', () => {
    expect(validateDb(db)).toEqual([]);
    const d = copy(db);
    d.leagues[0]!.clubs[0]!.crest = PNG;
    d.leagues[0]!.clubs[0]!.players[0]!.nation = 'ENG'; // una nazione che il gioco non genera
    const w = worldFromDb(d, 5);
    expect(integrity(w).problems).toEqual([]);
    expect(Object.keys(w.players)).toHaveLength(Object.keys(src.players).length);
    const a = src.clubs[src.competitions.ITA1!.clubIds[0]!]!, b = w.clubs[w.competitions.ITA1!.clubIds[0]!]!;
    expect([b.name, b.city, b.reputation, b.crest]).toEqual([a.name, a.city, a.reputation, PNG]);
    const pa = src.players[a.playerIds[3]!]!, pb = w.players[b.playerIds[3]!]!;
    expect([pb.firstName, pb.lastName, pb.birthYear, pb.position, pb.ca, pb.pa, pb.contract.wage])
      .toEqual([pa.firstName, pa.lastName, pa.birthYear, pa.position, pa.ca, pa.pa, pa.contract.wage]);
    expect(pb.attrs).toEqual(pa.attrs);
    expect(w.players[b.playerIds[0]!]!.nation).toBe('ENG');
    for (let i = 0; i < 12; i++) advance(w); // e si gioca, pause delle nazionali comprese
    expect(w.competitions.ITA1!.fixtures.some((fx) => fx.result)).toBe(true);
  }, 30_000);

  it('bastano abilità e dati anagrafici: il resto lo genera il mondo', () => {
    const d = copy(db);
    for (const c of d.leagues.flatMap((l) => l.clubs)) for (const p of c.players) {
      delete p.attrs; delete p.personality; delete p.wage; delete p.positions; p.ability = 120;
    }
    expect(validateDb(d)).toEqual([]);
    const w = worldFromDb(d, 1);
    const cas = Object.values(w.players).map((p) => p.ca);
    expect(Math.abs(cas.reduce((s, x) => s + x, 0) / cas.length - 120)).toBeLessThan(12);
  });

  it('i file sbagliati o malevoli si rifiutano con un motivo', () => {
    for (const junk of [null, 'ciao', 42, [], {}, { format: 'talisman-db', version: 99 }]) expect(validateDb(junk).length).toBeGreaterThan(0);
    const cases: [string, (d: DbFile) => void][] = [
      ['stemma SVG (può contenere script)', (d) => { d.leagues[0]!.clubs[0]!.crest = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='; }],
      ['stemma troppo grande', (d) => { d.leagues[0]!.clubs[0]!.crest = `data:image/png;base64,${'A'.repeat(400_000)}`; }],
      ['19 club', (d) => { d.leagues[1]!.clubs.pop(); }],
      ['senza portieri', (d) => { for (const p of d.leagues[0]!.clubs[2]!.players) if (p.position === 'GK') p.position = 'DC'; }],
      ['attributo fuori scala', (d) => { d.leagues[0]!.clubs[0]!.players[0]!.attrs!.pace = 25; }],
      ['attributo inventato', (d) => { (d.leagues[0]!.clubs[0]!.players[0]!.attrs as Record<string, number>).__proto__x = 5; }],
      ['colore non valido', (d) => { d.leagues[0]!.clubs[0]!.colors[0] = 'red'; }],
      ['nome troppo lungo', (d) => { d.leagues[0]!.clubs[0]!.name = 'x'.repeat(200); }],
      ['città doppia', (d) => { d.leagues[0]!.clubs[1]!.city = d.leagues[0]!.clubs[0]!.city; }],
    ];
    for (const [why, spoil] of cases) {
      const d = copy(db);
      spoil(d);
      expect(validateDb(d).length, why).toBeGreaterThan(0);
    }
  });
});
