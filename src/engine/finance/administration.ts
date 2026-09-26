// Bancarotta e commissariamento (Blocco 4, scelta 4A di Marco). Scatta se a fine stagione la cassa è sotto
// FIN.bankruptAt volte il fatturato per due stagioni di fila (la prima volta è l'anno per rientrare). Il club resta
// nella sua lega ma: -8 punti nella stagione dopo, reputazione -15, vende i 5 migliori al 60% del valore, i debiti
// vengono cancellati (cassa a zero), arriva un'annata del vivaio in più. Il club dell'utente riceve tre avvisi prima,
// quando la cassa scende sotto il 20%, il 40% e il 60% del fatturato in rosso: mai una sorpresa.
import { CLUB_AI, FIN } from '../balance.ts';
import type { Club, WorldState } from '../model.ts';
import { addNews, pName } from '../news.ts';
import type { Rng } from '../rng.ts';
import { renewalWage } from '../transfers/agents.ts';
import { transfer } from '../transfers/market.ts';
import { value } from '../transfers/valuation.ts';
import { intake } from '../youth/intake.ts';
import { revenue } from './ledger.ts';
import { LEAGUES } from '../world.ts';

const ratio = (world: WorldState, club: Club) => club.balance / Math.max(1, revenue(world, club));

/** ogni settimana: gli avvisi al club dell'utente, uno per soglia, finché la cassa non torna su */
export function weekDistress(world: WorldState) {
  const club = world.clubs[world.manager.clubId];
  if (!club) return;
  const r = ratio(world, club);
  if (r > FIN.warnReset) { club.crisis.warned = 0; return; }
  const level = FIN.warnAt.filter((w) => r < w).length; // 0-3
  if (level > club.crisis.warned) {
    club.crisis.warned = level;
    addNews(world, `news.distress.${level}`, { pct: Math.round(-r * 100) });
  }
}

/**
 * a fine stagione, dopo incassi e premi: chi è sotto la soglia per la seconda stagione di fila viene commissariato.
 * La penalizzazione della stagione appena finita si azzera qui (la classifica l'ha già contata).
 */
export function seasonAdministration(world: WorldState, rng: Rng): Club[] {
  const out: Club[] = [];
  for (const club of Object.values(world.clubs)) {
    club.crisis.penalty = 0;
    if (ratio(world, club) >= FIN.bankruptAt) { club.crisis.below = 0; continue; }
    club.crisis.below++;
    if (club.crisis.below === 1 && club.id === world.manager.clubId) addNews(world, 'news.distress.lastYear', {});
    if (club.crisis.below >= 2) { administer(world, rng, club); out.push(club); }
  }
  return out;
}

function administer(world: WorldState, rng: Rng, club: Club) {
  const me = world.manager.clubId;
  // i cinque migliori vanno a chi può pagarli, al 60% del valore; se nessuno può, restano
  const best = club.playerIds.map((id) => world.players[id]!).filter((p) => !p.contract.loan).sort((a, b) => b.ca - a.ca).slice(0, FIN.adminSell);
  let sold = 0;
  for (const p of best) {
    const fee = Math.round(value(p, world.season, { clubRep: club.reputation }) * FIN.adminPrice);
    const buyer = Object.values(world.clubs)
      .filter((c) => c.id !== club.id && c.id !== me && c.balance >= fee && c.playerIds.length < CLUB_AI.squadMax)
      .sort((a, b) => b.reputation - a.reputation)[0];
    if (!buyer) continue;
    transfer(world, rng, p, buyer, { fee, years: 1, bonusApps: 0, bonusGoals: 0, sellOn: 0, swap: [], loan: null, agentFee: 0 },
      renewalWage(null, p, world.season, buyer.reputation));
    sold++;
    if (club.id === me) addNews(world, 'news.admin.sold', { name: pName(p), to: buyer.name });
  }
  // nuova proprietà: debiti cancellati, niente sanzioni pendenti, reputazione a picco, penalizzazione l'anno dopo
  club.balance = 0;
  club.debts = [];
  club.sanction = { kind: 'none', seasons: 0, points: 0 };
  // non sotto il minimo della sua lega: altrimenti sponsor e incassi crollano e il club fallisce di nuovo dopo due anni
  const floor = LEAGUES.find((l) => l.id === club.compId)?.rep[0] ?? FIN.adminRepMin;
  club.reputation = Math.max(Math.min(floor, club.reputation), club.reputation - FIN.adminRep);
  club.crisis = { below: 0, warned: 0, since: world.season + 1, penalty: FIN.adminPoints };
  intake(world, rng, club); // si riparte dai ragazzi
  if (club.id === me) {
    world.manager.board.trust.board = Math.max(0, world.manager.board.trust.board - FIN.adminTrust);
    addNews(world, 'news.admin.mine', { n: FIN.adminPoints, sold });
  } else addNews(world, 'news.admin.other', { club: club.name, n: FIN.adminPoints });
}
