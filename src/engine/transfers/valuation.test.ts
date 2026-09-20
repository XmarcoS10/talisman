// Il valore di mercato deve rispettare l'ordine delle cose, non un numero esatto (quello si tara col report).
import { describe, expect, it } from 'vitest';
import type { Player, Position } from '../model.ts';
import { makePlayer, recomputeCA } from '../players.ts';
import { Rng } from '../rng.ts';
import { MARKET } from '../balance.ts';
import { value, wageFor } from './valuation.ts';

const SEASON = 2026;
/** un giocatore su misura: CA e PA imposti a mano, il resto generato */
function who(o: { ca: number; pa?: number; age?: number; pos?: Position; until?: number }): Player {
  const p = makePlayer(new Rng(1), 1, o.pos ?? 'ST', o.ca, SEASON, [o.age ?? 26, o.age ?? 26]);
  p.ca = o.ca;
  p.pa = o.pa ?? o.ca;
  p.contract.until = o.until ?? SEASON + 3;
  p.form = [];
  return p;
}
const v = (p: Player) => value(p, SEASON);

describe('valore di mercato (F7)', () => {
  it('un campione costa decine di milioni, un giocatore da metà classifica qualche milione', () => {
    expect(v(who({ ca: 170 }))).toBeGreaterThan(40_000_000);
    expect(v(who({ ca: 170 }))).toBeLessThan(200_000_000);
    expect(v(who({ ca: 130 }))).toBeGreaterThan(1_000_000);
    expect(v(who({ ca: 130 }))).toBeLessThan(15_000_000);
    expect(v(who({ ca: 90 }))).toBeLessThan(1_000_000);
  });

  it('si paga il potenziale del giovane e si svaluta il veterano', () => {
    expect(v(who({ ca: 130, pa: 180, age: 19 }))).toBeGreaterThan(v(who({ ca: 130, age: 26 })));
    expect(v(who({ ca: 160, age: 34 }))).toBeLessThan(v(who({ ca: 160, age: 27 })) / 2);
    expect(v(who({ ca: 130, pa: 130, age: 19 }))).toBeLessThan(v(who({ ca: 130, pa: 180, age: 19 })));
  });

  it('il contratto in scadenza abbatte il prezzo', () => {
    const long = v(who({ ca: 150, until: SEASON + 4 }));
    expect(v(who({ ca: 150, until: SEASON + 1 }))).toBeLessThan(long);
    expect(v(who({ ca: 150, until: SEASON }))).toBeLessThan(v(who({ ca: 150, until: SEASON + 1 })));
  });

  it('il ruolo e la forma spostano il prezzo, senza ribaltarlo', () => {
    expect(v(who({ ca: 150, pos: 'GK' }))).toBeLessThan(v(who({ ca: 150, pos: 'ST' })));
    const p = who({ ca: 150 });
    const base = v(p);
    p.form = [8, 8, 8, 7.5, 8];
    expect(v(p)).toBeGreaterThan(base);
    p.form = [5, 5, 5.5, 5, 5];
    expect(v(p)).toBeLessThan(base);
    p.form = [];
    p.psych.wantsOut = true;
    expect(v(p)).toBeLessThan(base); // chi ha chiesto di andarsene ha meno potere
  });

  it("l'inflazione e la reputazione del club moltiplicano, senza cambiare l'ordine", () => {
    const p = who({ ca: 150 });
    expect(value(p, SEASON, { inflation: 1.5 })).toBeGreaterThan(value(p, SEASON));
    expect(value(p, SEASON, { clubRep: 90 })).toBeGreaterThan(value(p, SEASON, { clubRep: 20 }));
    expect(value(p, SEASON, { nation: p.nation })).toBeGreaterThan(value(p, SEASON, { nation: 'zz' }));
  });

  it('lo stipendio segue il valore e non scende sotto il minimo', () => {
    expect(wageFor(50_000_000)).toBeGreaterThan(wageFor(5_000_000));
    expect(wageFor(0)).toBe(MARKET.wageMin);
  });

  it('CA ricalcolato dagli attributi: il valore non dipende da una cache stantia', () => {
    const p = who({ ca: 150 });
    recomputeCA(p);
    expect(v(p)).toBeGreaterThan(0);
  });
});
