// Bancarotta e commissariamento (Blocco 4, scelta 4A).
import { describe, expect, it } from 'vitest';
import { FIN } from '../balance.ts';
import { Rng } from '../rng.ts';
import { newWorld } from '../world.ts';
import { revenue } from './ledger.ts';
import { seasonAdministration, weekDistress } from './administration.ts';

describe('commissariamento', () => {
  it("all'utente arrivano tre avvisi, uno per soglia, e un anno per rientrare", () => {
    const w = newWorld(21);
    const club = w.clubs[w.manager.clubId]!;
    const rev = revenue(w, club);
    const seen = () => w.news.filter((n) => n.key.startsWith('news.distress')).map((n) => n.key);
    for (const r of [-0.1, -0.25, -0.25, -0.45, -0.7]) { club.balance = r * rev; weekDistress(w); }
    expect(seen()).toEqual(['news.distress.1', 'news.distress.2', 'news.distress.3']); // niente doppioni
    seasonAdministration(w, new Rng(1));
    expect(club.crisis.below).toBe(1); // la prima fine stagione in rosso è l'anno per rientrare
    expect(seen()).toContain('news.distress.lastYear');
    expect(club.crisis.since).toBeNull();
  });

  it('due fine stagione di fila oltre la soglia: debiti cancellati, i migliori venduti, penalizzazione e reputazione giù', () => {
    const w = newWorld(22);
    w.manager.clubId = -1;
    const club = w.clubs[w.competitions.ITA1!.clubIds[10]!]!;
    const best = club.playerIds.map((id) => w.players[id]!).sort((a, b) => b.ca - a.ca).slice(0, 5).map((p) => p.id);
    const rep = club.reputation;
    club.balance = revenue(w, club) * (FIN.bankruptAt - 0.2);
    expect(seasonAdministration(w, new Rng(2))).toHaveLength(0);
    club.balance = revenue(w, club) * (FIN.bankruptAt - 0.2);
    expect(seasonAdministration(w, new Rng(3)).map((c) => c.id)).toEqual([club.id]);
    expect(club.balance).toBe(0);
    expect(club.crisis.penalty).toBe(FIN.adminPoints);
    expect(club.crisis.since).toBe(w.season + 1);
    expect(club.reputation).toBe(rep - FIN.adminRep);
    expect(best.filter((id) => club.playerIds.includes(id)).length).toBeLessThan(5); // almeno uno venduto
    // la stagione dopo, a fine campionato, la penalizzazione si azzera
    seasonAdministration(w, new Rng(4));
    expect(club.crisis.penalty).toBe(0);
  });
});
