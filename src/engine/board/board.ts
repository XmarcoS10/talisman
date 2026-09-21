// Dirigenza, fiducia e obiettivi (GUIDA §7.7).
// L'idea distintiva: la fiducia non è un umore opaco, è un **contratto esplicito rinegoziabile**.
// Puoi chiedere due stagioni di transizione in cambio di obiettivi più bassi, e paghi subito in fiducia.
import { BOARD, YOUTH } from '../balance.ts';
import type { Board, Club, WorldState } from '../model.ts';
import { addNews } from '../news.ts';
import { standings } from '../world.ts';
import { clamp, pointsPerGame } from '../util.ts';


export const newBoard = (): Board => ({
  trust: { board: BOARD.start, fans: BOARD.start, squad: BOARD.start, press: BOARD.start },
  deal: { seasons: 0, position: 0 },
  capital: BOARD.capitalStart,
  verdicts: [],
  sacked: false,
});

/** la posizione che il club merita per blasone: è il metro di default */
export function fairPosition(world: WorldState, club: Club): number {
  const comp = world.competitions[club.compId];
  if (!comp) return 10;
  return [...comp.clubIds].sort((x, y) => world.clubs[y]!.reputation - world.clubs[x]!.reputation).indexOf(club.id) + 1;
}

/** la posizione che ti chiedono: quella concordata se c'è un contratto in corso, altrimenti quella di blasone */
export function expected(world: WorldState, club: Club): number {
  const b = world.manager.board;
  return b.deal.seasons > 0 ? b.deal.position : fairPosition(world, club);
}

/** posizione attuale in classifica */
export function position(world: WorldState, club: Club): number {
  const comp = world.competitions[club.compId];
  if (!comp) return 10;
  return standings(world, comp).findIndex((r) => r.clubId === club.id) + 1;
}

/** le quattro barre si muovono piano verso il loro bersaglio: la fiducia ha memoria */
export function weekBoard(world: WorldState) {
  const club = world.clubs[world.manager.clubId];
  if (!club) return;
  const b = world.manager.board;
  const gap = expected(world, club) - position(world, club); // positivo = meglio del previsto
  const form = (pointsPerGame(world, club) - 1.4) * 10; // i tifosi guardano le ultime cinque, non la tabella
  const squad = club.playerIds.length
    ? club.playerIds.reduce((a, id) => a + world.players[id]!.psych.morale, 0) / club.playerIds.length
    : BOARD.start;
  const target = {
    board: clamp(BOARD.start + gap * BOARD.boardPerPlace, 0, 100),
    fans: clamp(BOARD.start + gap * BOARD.fansPerPlace + form * BOARD.formWeight, 0, 100),
    squad: clamp(BOARD.start + (squad - 60) * BOARD.squadFromMorale + gap, 0, 100),
    press: clamp(BOARD.start + gap * BOARD.pressPerPlace + form * BOARD.formWeight, 0, 100),
  };
  for (const k of ['board', 'fans', 'squad', 'press'] as const)
    b.trust[k] = Math.round((b.trust[k] + (target[k] - b.trust[k]) * BOARD.inertia) * 10) / 10;
}

/**
 * il contratto con la dirigenza: chiedi tempo e obiettivi più bassi, e paghi in fiducia adesso.
 * Accettare un obiettivo più alto di quello che ti spetterebbe la fa invece salire.
 */
export function renegotiate(world: WorldState, seasons: number, position: number): boolean {
  const club = world.clubs[world.manager.clubId];
  if (!club || seasons < 1 || seasons > BOARD.dealMaxSeasons) return false;
  const b = world.manager.board;
  const fair = fairPosition(world, club);
  const easier = position - fair; // positivo = obiettivo più comodo di quello che ti spetta
  const cost = seasons * BOARD.dealCostPerSeason + easier * BOARD.dealCostPerPlace;
  if (b.trust.board - cost < BOARD.sackAt) return false; // non hai il credito per chiederlo
  b.trust.board = clamp(b.trust.board - cost, 0, 100);
  b.deal = { seasons, position };
  addNews(world, cost > 0 ? 'news.board.dealEasier' : 'news.board.dealHarder', { n: seasons, pos: position });
  return true;
}

export type RequestKind = 'budget' | 'facility' | 'sale';

/** una richiesta alla dirigenza costa capitale politico: non puoi chiedere tutto sempre */
export function request(world: WorldState, kind: RequestKind): { ok: boolean; amount?: number } {
  const club = world.clubs[world.manager.clubId];
  if (!club) return { ok: false };
  const b = world.manager.board;
  const cost = kind === 'budget' ? BOARD.costBudget : kind === 'facility' ? BOARD.costFacility : BOARD.costSale;
  if (b.capital < cost) return { ok: false };
  b.capital -= cost;
  // la dirigenza ascolta chi sta facendo bene: sotto la soglia di allarme dice di no
  if (b.trust.board < BOARD.warnAt) {
    addNews(world, `news.board.no.${kind}`);
    return { ok: false };
  }
  if (kind === 'budget') {
    const amount = Math.round(club.balance * BOARD.budgetGrant);
    addNews(world, 'news.board.budget', { v: amount });
    return { ok: true, amount };
  }
  if (kind === 'facility') {
    club.youth.facilities = Math.min(20, club.youth.facilities + YOUTH.facilityRequest); // strutture migliori, vivaio migliore
    addNews(world, 'news.board.facility');
    return { ok: true };
  }
  addNews(world, 'news.board.sale');
  return { ok: true };
}

/** il verdetto di fine stagione: si guarda la posizione contro quella concordata */
export function endSeasonBoard(world: WorldState) {
  const club = world.clubs[world.manager.clubId];
  if (!club) return;
  const b = world.manager.board;
  const pos = position(world, club);
  const exp = expected(world, club);
  const gap = exp - pos;
  // dentro un contratto di transizione un anno storto pesa la metà
  const shielded = b.deal.seasons > 0 && gap < 0 ? gap * BOARD.shield : gap;
  b.trust.board = clamp(b.trust.board + shielded * BOARD.boardPerPlace, 0, 100);
  b.capital = Math.min(100, b.capital + BOARD.capitalPerSeason);
  b.verdicts.push({ season: world.season, position: pos, expected: exp, trust: Math.round(b.trust.board) });
  if (b.verdicts.length > 10) b.verdicts.shift();
  if (b.deal.seasons > 0) b.deal.seasons--;
  if (b.trust.board < BOARD.sackAt) {
    b.sacked = true;
    addNews(world, 'news.board.sacked', { pos, exp });
  } else if (b.trust.board < BOARD.warnAt) {
    addNews(world, 'news.board.warning', { pos, exp });
  }
}
