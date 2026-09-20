// La trattativa deve comportarsi come una trattativa: il prezzo di riserva non si vede, le concessioni
// sono alternate, chi lesina perde l'interlocutore, e dopo una rottura si aspetta.
import { describe, expect, it } from 'vitest';
import { DEAL } from '../balance.ts';
import { Rng } from '../rng.ts';
import { cashNow, ceiling, counterOffer, emptyOffer, openTalk, reopen, reply, worth, type TalkCtx } from './negotiation.ts';

const V = 20_000_000;
const ctx = (o: Partial<TalkCtx> = {}): TalkCtx =>
  ({ value: V, willing: 0.5, need: 0.5, sellerRep: 50, release: null, ...o });
const talkOf = (c = ctx(), seed = 3) => openTalk(new Rng(seed), 1, 10, 20, c);

describe('trattativa (F7)', () => {
  it('il prezzo di riserva non si vede e la richiesta parte più alta', () => {
    const t = talkOf();
    expect(t.ask).toBeGreaterThan(t.reserve);
    expect(t.reserve).toBeGreaterThan(V * 0.5);
    expect(t.reserve).toBeLessThan(V * 1.5);
  });

  it('chi non vuole vendere chiede di più, chi se ne vuole liberare sconta', () => {
    const hard = talkOf(ctx({ willing: 0 })).reserve;
    const soft = talkOf(ctx({ willing: 1 })).reserve;
    expect(hard).toBeGreaterThan(V);
    expect(soft).toBeLessThan(V);
    expect(hard).toBeGreaterThan(soft * 1.5);
  });

  it('sotto il prezzo di riserva non si chiude, per quanti giri si facciano', () => {
    const c = ctx();
    const t = talkOf(c);
    const meagre = Math.round(t.reserve * 0.7);
    for (let i = 0; i < 20 && t.state === 'open'; i++) reply(t, emptyOffer(meagre), c, 0);
    expect(t.state).not.toBe('agreed');
    expect(t.ask).toBeGreaterThanOrEqual(t.reserve);
  });

  it('il venditore concede a ogni giro, senza mai scendere sotto il proprio limite', () => {
    const c = ctx();
    const t = talkOf(c);
    const asks: number[] = [];
    let bid = Math.round(t.reserve * 0.8);
    while (t.state === 'open' && asks.length < 6) {
      const r = reply(t, emptyOffer(bid), c, 0);
      asks.push(r.ask);
      bid = Math.round(bid * 1.06);
    }
    for (let i = 1; i < asks.length; i++) expect(asks[i]!).toBeLessThanOrEqual(asks[i - 1]!);
    expect(Math.min(...asks)).toBeGreaterThanOrEqual(t.reserve);
  });

  it('un rilancio irrisorio brucia la pazienza e rompe la trattativa', () => {
    const c = ctx();
    const patient = talkOf(c);
    const stingy = talkOf(c);
    let a = Math.round(patient.reserve * 0.85), b = a;
    let ga = 0, gb = 0;
    while (patient.state === 'open' && ga < 10) { reply(patient, emptyOffer(a), c, 0); a = Math.round(a * 1.08); ga++; }
    while (stingy.state === 'open' && gb < 10) { reply(stingy, emptyOffer(b), c, 0); b = Math.round(b * 1.001); gb++; }
    expect(gb).toBeLessThan(ga); // chi non rilancia davvero viene mandato via prima
  });

  it('dopo una rottura si aspetta, poi si può riaprire', () => {
    const c = ctx();
    const t = talkOf(c);
    for (let i = 0; i < 20 && t.state === 'open'; i++) reply(t, emptyOffer(1000), c, 5);
    expect(t.state).toBe('broken');
    expect(reopen(t, 5)).toBe(false);
    expect(reopen(t, 5 + DEAL.reopenDays)).toBe(true);
    expect(t.state).toBe('open');
  });

  it('la clausola rescissoria pagata per intero chiude senza discutere', () => {
    const c = ctx({ release: 45_000_000, willing: 0 });
    const t = talkOf(c);
    const r = reply(t, emptyOffer(45_000_000), c, 0);
    expect(r.kind).toBe('accept');
    expect(t.state).toBe('agreed');
  });

  it('rate, bonus, rivendita e contropartite valgono meno dei contanti', () => {
    const cash = emptyOffer(10_000_000);
    expect(worth(cash, V)).toBe(10_000_000);
    const rate = { ...cash, years: 4 };
    expect(worth(rate, V)).toBeLessThan(worth(cash, V));
    const bonus = { ...emptyOffer(9_000_000), bonusApps: 1_000_000 };
    expect(worth(bonus, V)).toBeLessThan(worth(cash, V));
    const sellOn = { ...emptyOffer(9_000_000), sellOn: 0.2 };
    expect(worth(sellOn, V)).toBeGreaterThan(9_000_000);
    expect(worth(sellOn, V)).toBeLessThan(9_000_000 + 0.2 * V);
    const wanted = { ...emptyOffer(5_000_000), swap: [{ playerId: 2, value: 5_000_000, wanted: true }] };
    const unwanted = { ...wanted, swap: [{ playerId: 2, value: 5_000_000, wanted: false }] };
    expect(worth(wanted, V)).toBeGreaterThan(worth(unwanted, V));
    expect(worth(wanted, V)).toBeLessThan(worth(cash, V));
  });

  it('il prestito col diritto di riscatto vale meno che con obbligo', () => {
    const opt = { ...emptyOffer(0), loan: { fee: 1_000_000, buy: 10_000_000, obligation: false } };
    const obb = { ...emptyOffer(0), loan: { fee: 1_000_000, buy: 10_000_000, obligation: true } };
    expect(worth(opt, V)).toBeLessThan(worth(obb, V));
    expect(cashNow(opt)).toBe(1_000_000); // quest'anno esce solo il prestito
  });

  it('chi ha un buco in quel ruolo alza il proprio tetto, ma non all\'infinito', () => {
    expect(ceiling(ctx({ need: 1 }))).toBeGreaterThan(ceiling(ctx({ need: 0 })));
    expect(ceiling(ctx({ need: 1 }))).toBeLessThan(V * 2);
  });

  it('due IA che trattano arrivano a un accordo quando il tetto del compratore basta', () => {
    const c = ctx({ need: 1, willing: 0.6 });
    const t = talkOf(c, 9);
    let guard = 0;
    while (t.state === 'open' && guard++ < 12) {
      const o = counterOffer(t, c, 100_000_000);
      if (!o) break;
      reply(t, o, c, 0);
    }
    expect(t.state).toBe('agreed');
    expect(worth(t.deal!, V)).toBeGreaterThanOrEqual(t.reserve);
  });

  it('...e non ci arrivano quando il venditore non ha nessuna intenzione di vendere', () => {
    const c = ctx({ need: 0.2, willing: 0 });
    const t = talkOf(c, 9);
    let guard = 0;
    while (t.state === 'open' && guard++ < 12) {
      const o = counterOffer(t, c, 100_000_000);
      if (!o) break;
      reply(t, o, c, 0);
    }
    expect(t.state).not.toBe('agreed');
  });

  it('chi non ha contanti rateizza e mette bonus', () => {
    const c = ctx();
    const t = talkOf(c);
    const rich = counterOffer(t, c, 100_000_000)!;
    const poor = counterOffer(t, c, 2_000_000)!;
    expect(rich.years).toBe(1);
    expect(poor.years).toBeGreaterThan(1);
    expect(poor.bonusApps).toBeGreaterThan(0);
    expect(cashNow(poor)).toBeLessThan(cashNow(rich));
  });
});
