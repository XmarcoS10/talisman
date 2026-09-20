// Finanze del club (GUIDA §7.7). Conto per cassa: niente ammortamenti, le rate sono rate.
// Entrate: biglietti (dinamici), diritti tv, sponsor, merchandising, premi, cessioni.
// Uscite: stipendi, staff, stadio, acquisti. Il fair play finanziario è progressivo, non una condanna.
import { FIN } from '../balance.ts';
import type { Books, Club, ClubId, Competition, Fixture, WorldState } from '../model.ts';
import { addNews } from '../news.ts';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const emptyBooks = (season: number): Books =>
  ({ season, gate: 0, tv: 0, sponsor: 0, merch: 0, prize: 0, transfersIn: 0, wages: 0, staff: 0, stadium: 0, transfersOut: 0 });

/** il conto della stagione in corso, creato al volo la prima volta che serve */
export function books(club: Club, season: number): Books {
  const last = club.books[club.books.length - 1];
  if (last && last.season === season) return last;
  const b = emptyBooks(season);
  club.books.push(b);
  if (club.books.length > 8) club.books.shift();
  return b;
}

export const income = (b: Books) => b.gate + b.tv + b.sponsor + b.merch + b.prize + b.transfersIn;
export const costs = (b: Books) => b.wages + b.staff + b.stadium + b.transfersOut;
export const profit = (b: Books) => income(b) - costs(b);

/** fatturato della stagione precedente, o la stima se non c'è ancora storia */
export function revenue(world: WorldState, club: Club): number {
  const prev = club.books.filter((b) => b.season < world.season).at(-1);
  if (prev) return income(prev) - prev.transfersIn; // le plusvalenze non sono fatturato ricorrente
  return estimate(world, club);
}

/** stima del fatturato per un club senza storia: stadio, blasone, categoria */
export function estimate(world: WorldState, club: Club): number {
  const level = world.competitions[club.compId]?.level ?? 1;
  const tv = FIN.tvBase[level === 1 ? 0 : 1];
  return Math.round(club.stadium.capacity * 19 * FIN.fillBase * FIN.ticket * (level === 1 ? 1 : FIN.ticketByLevel)
    + tv * 0.8 + club.reputation * club.reputation * (FIN.sponsorPerRep2 + FIN.merchPerRep2));
}

export const wageBill = (world: WorldState, club: Club) =>
  club.playerIds.reduce((a, id) => a + world.players[id]!.contract.wage, 0)
  + club.scoutIds.reduce((a, id) => a + (world.scouts[id]?.wage ?? 0), 0);

/** spese fisse di una settimana: stipendi, staff, stadio */
export function weekCosts(world: WorldState, weeks: number) {
  for (const club of Object.values(world.clubs)) {
    const b = books(club, world.season);
    const wages = Math.round((wageBill(world, club) / 52) * weeks);
    const rev = revenue(world, club);
    const staff = Math.round((rev * FIN.staffOfRevenue / 52) * weeks);
    const stadium = Math.round((rev * FIN.stadiumOfRevenue / 52) * weeks);
    b.wages += wages;
    b.staff += staff;
    b.stadium += stadium;
    club.balance -= wages + staff + stadium;
  }
}

/** quanti punti a partita ha fatto ultimamente: muove il riempimento dello stadio */
function form(world: WorldState, club: Club): number {
  const comp = world.competitions[club.compId];
  if (!comp) return 1.4;
  const played = comp.fixtures.filter((f) => f.result && (f.home === club.id || f.away === club.id)).slice(-5);
  if (!played.length) return 1.4;
  const pts = played.reduce((a, f) => {
    const [mine, theirs] = f.home === club.id ? [f.result!.hg, f.result!.ag] : [f.result!.ag, f.result!.hg];
    return a + (mine > theirs ? 3 : mine === theirs ? 1 : 0);
  }, 0);
  return pts / played.length;
}

/** incasso di una partita in casa: dipende da come vai e da chi arriva */
export function gate(world: WorldState, fx: Fixture) {
  const home = world.clubs[fx.home]!;
  const away = world.clubs[fx.away]!;
  const level = world.competitions[home.compId]?.level ?? 1;
  const fill = clamp(FIN.fillBase + (form(world, home) - 1.4) * FIN.fillForm + away.reputation * FIN.fillRep, FIN.fillMin, 1);
  const price = FIN.ticket * (level === 1 ? 1 : FIN.ticketByLevel);
  const take = Math.round(home.stadium.capacity * fill * price);
  books(home, world.season).gate += take;
  home.balance += take;
  return take;
}

/** rate: a ogni cambio di stagione si paga e si incassa una quota */
export function settleInstalments(world: WorldState) {
  for (const club of Object.values(world.clubs)) {
    const b = books(club, world.season);
    for (const d of club.debts) {
      club.balance -= d.amount;
      b.transfersOut += d.amount;
      d.seasons--;
    }
    for (const c of club.credits) {
      club.balance += c.amount;
      b.transfersIn += c.amount;
      c.seasons--;
    }
    club.debts = club.debts.filter((d) => d.seasons > 0);
    club.credits = club.credits.filter((c) => c.seasons > 0);
  }
}

/** entrate di fine stagione: tv per posizione, sponsor e merchandising per blasone, premi */
export function seasonIncome(world: WorldState, comp: Competition, table: { clubId: ClubId }[]) {
  const n = table.length;
  table.forEach((row, i) => {
    const club = world.clubs[row.clubId]!;
    const b = books(club, world.season);
    const tv = Math.round(FIN.tvBase[comp.level === 1 ? 0 : 1] * (FIN.tvLast + (1 - FIN.tvLast) * ((n - i) / n)));
    const sponsor = Math.round(club.reputation * club.reputation * FIN.sponsorPerRep2);
    const merch = Math.round(club.reputation * club.reputation * FIN.merchPerRep2);
    const prize = (n - i) * FIN.prizePerPosition + (i === 0 ? FIN.prizeChampion : 0);
    b.tv += tv; b.sponsor += sponsor; b.merch += merch; b.prize += prize;
    club.balance += tv + sponsor + merch + prize;
  });
}

/**
 * fair play finanziario semplificato: prima un richiamo, poi il blocco del mercato,
 * poi la penalizzazione in classifica. Chi continua a sfondare fallisce, ma ci vuole del tempo.
 */
export function checkFFP(world: WorldState) {
  for (const club of Object.values(world.clubs)) {
    const rev = Math.max(1, revenue(world, club));
    const over = wageBill(world, club) / rev > FIN.ffpWageCap || club.balance / rev < FIN.ffpDebtCap;
    const s = club.sanction;
    s.seasons = over ? s.seasons + 1 : Math.max(0, s.seasons - 1);
    s.kind = s.seasons === 0 ? 'none' : s.seasons === 1 ? 'warning' : s.seasons === 2 ? 'freeze' : 'points';
    s.points = s.kind === 'points' ? FIN.ffpPoints : 0;
    if (!over) continue;
    if (club.id === world.manager.clubId)
      addNews(world, `news.ffp.${s.kind}`, { n: s.points });
  }
}

/**
 * taglio del monte ingaggi: chi sfora il tetto lascia andare i suoi stipendi più pesanti,
 * partendo da chi non è indispensabile. Doloroso, ma è quello che fa un club nei guai.
 */
export function trimWages(world: WorldState, release: (club: Club, playerId: number) => void): number {
  let n = 0;
  for (const club of Object.values(world.clubs)) {
    const cap = revenue(world, club) * FIN.ffpWageCap;
    let guard = 0;
    while (wageBill(world, club) > cap && club.playerIds.length > FIN.minSquad && guard++ < 6) {
      // il più pagato fra quelli che non sono il migliore del proprio ruolo
      const squad = club.playerIds.map((id) => world.players[id]!);
      const cut = squad
        .filter((p) => squad.some((q) => q.position === p.position && q.ca > p.ca))
        .sort((a, b) => b.contract.wage - a.contract.wage)[0] ?? squad.sort((a, b) => b.contract.wage - a.contract.wage)[0];
      if (!cut) break;
      release(club, cut.id);
      if (club.id === world.manager.clubId)
        addNews(world, 'news.ffp.trim', { name: `${cut.firstName} ${cut.lastName}` });
      n++;
    }
  }
  return n;
}

/** con la cassa a picco si vende per forza: lo decide il mercato, qui si dice solo che è ora */
export const mustSell = (world: WorldState, club: Club) =>
  club.balance / Math.max(1, revenue(world, club)) < FIN.fireSaleAt;
