// Il campionato Primavera: le squadre giovanili dei club di una lega giocano lo stesso calendario della prima squadra.
// Non si salva niente (regola 4): ogni risultato nasce da un seme fisso (mondo, stagione, gara) e dalla forza del
// vivaio, che dipende da strutture, reclutamento e blasone — valori che in stagione non cambiano. Così lo stesso
// risultato esce identico a ogni apertura della schermata.
import { YOUTH } from '../balance.ts';
import type { Club, ClubId, Competition, Fixture, WorldState } from '../model.ts';
import { playIntl } from '../nations/nations.ts';
import { Rng } from '../rng.ts';

/** forza della squadra giovanile, sulla stessa scala delle nazionali (≈ 60-160) */
export const youthStrength = (c: Club) =>
  YOUTH.paBase + c.youth.facilities * YOUTH.paFacilities * 1.5 + c.youth.recruitment * 1.2 + c.reputation * YOUTH.paRep;

const seedOf = (world: WorldState, fx: Fixture) =>
  (Math.imul(world.seed ^ 0x5bd1e995, 31) + world.season * 7919 + fx.day * 131 + fx.home * 17 + fx.away) >>> 0;

/** il risultato della Primavera per una gara della prima squadra già giocata (null se non ancora) */
export function youthResult(world: WorldState, fx: Fixture): [number, number] | null {
  if (!fx.result) return null;
  const h = world.clubs[fx.home], a = world.clubs[fx.away];
  if (!h || !a) return null;
  return playIntl(new Rng(seedOf(world, fx)), youthStrength(h) + 4, youthStrength(a)); // in casa un piccolo vantaggio
}

export type YouthRow = { clubId: ClubId; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number };

export function youthTable(world: WorldState, comp: Competition): YouthRow[] {
  const rows = new Map<ClubId, YouthRow>(comp.clubIds.map((id) => [id, { clubId: id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }]));
  for (const fx of comp.fixtures) {
    const h = rows.get(fx.home), a = rows.get(fx.away);
    const r = h && a ? youthResult(world, fx) : null;
    if (!r || !h || !a) continue;
    const [hg, ag] = r;
    h.p++; a.p++; h.gf += hg; h.ga += ag; a.gf += ag; a.ga += hg;
    if (hg > ag) { h.w++; a.l++; h.pts += 3; } else if (hg < ag) { a.w++; h.l++; a.pts += 3; } else { h.d++; a.d++; h.pts++; a.pts++; }
  }
  return [...rows.values()].sort((x, y) => y.pts - x.pts || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf || x.clubId - y.clubId);
}

/** anteprima della prossima annata: quanti ragazzi e quanto buoni in media, dalle stesse regole di `intake` */
export function intakePreview(c: Club) {
  const size = YOUTH.base + Math.round(c.youth.recruitment * YOUTH.perRecruitment);
  const pa = Math.round(YOUTH.paBase + c.youth.facilities * YOUTH.paFacilities + c.reputation * YOUTH.paRep);
  return { size: [size, size + 1] as const, pa };
}
