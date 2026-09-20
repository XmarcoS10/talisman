// Report del mercato (GUIDA §13, P9 punto 8): inflazione, monte ingaggi, movimenti, età delle rose.
import { revenue, wageBill } from '../engine/finance/ledger.ts';
import { value } from '../engine/transfers/valuation.ts';
import type { WorldState } from '../engine/model.ts';
import { advance, endSeason, isSeasonOver, newWorld } from '../engine/world.ts';

const avg = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0);
const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const money = (v: number) => `${(v / 1e6).toFixed(1)}M`;

const row = (label: string, v: number, lo: number, hi: number, fmt: (v: number) => string = (x) => x.toFixed(2)) =>
  `| ${label} | ${fmt(v)} | ${fmt(lo)} – ${fmt(hi)} | ${v >= lo && v <= hi ? '✅' : '❌'} |`;
const info = (label: string, v: string, target = '') => `| ${label} | ${v} | ${target} | |`;

/** dove sono finiti i più forti: nei club più ricchi, ma non tutti */
function migration(world: WorldState) {
  const rich = new Set(Object.values(world.clubs).sort((a, b) => b.reputation - a.reputation).slice(0, 10).map((c) => c.id));
  const top = Object.values(world.players).filter((p) => p.clubId !== null).sort((a, b) => b.ca - a.ca).slice(0, 50);
  return top.filter((p) => rich.has(p.clubId!)).length / top.length;
}

export function marketReport(seed: number, seasons: number): string[] {
  const world = newWorld(seed);
  world.manager.clubId = -1; // nessun club umano: tutte le squadre sono IA
  const clubs = () => Object.values(world.clubs);
  const values: number[] = [];
  const signings: number[] = [];
  const loaned: number[] = [];
  const freeLeft: number[] = [];
  const ratios: number[] = [];
  const ages: number[] = [];
  const lines: string[] = [];
  let overCap = 0; // club oltre l'85% di monte ingaggi per più di due stagioni
  const over = new Map<number, number>();
  const start = avg(Object.values(world.players).map((p) => value(p, world.season, { clubRep: 50 })));

  for (let s = 0; s < seasons; s++) {
    while (!isSeasonOver(world)) advance(world);
    const sum = endSeason(world);
    signings.push(sum.signings);
    const r = clubs().map((c) => wageBill(world, c) / revenue(world, c));
    for (const c of clubs()) {
      const x = wageBill(world, c) / revenue(world, c);
      const n = x > 0.85 ? (over.get(c.id) ?? 0) + 1 : 0;
      over.set(c.id, n);
      if (n > 2) overCap++;
    }
    ratios.push(avg(r));
    ages.push(avg(clubs().map((c) => avg(c.playerIds.map((id) => world.season - world.players[id]!.birthYear)))));
    const loans = Object.values(world.players).filter((p) => p.contract.loan).length;
    const free = Object.values(world.players).filter((p) => p.clubId === null).length;
    loaned.push(loans);
    freeLeft.push(free);
    const v = avg(Object.values(world.players).map((p) => value(p, world.season, { clubRep: 50 })));
    values.push(v);
    lines.push(`- ${world.season - 1}/${String(world.season).slice(2)}: ${sum.signings} acquisti · valore medio ${money(v)} · ingaggi/fatturato ${pct(avg(r))} (max ${pct(Math.max(...r))}) · età ${ages[ages.length - 1]!.toFixed(1)} · ${loans} in prestito · ${free} svincolati`);
  }
  const inflation = values[values.length - 1]! / start;
  const red = clubs().filter((c) => c.balance < 0).length;
  return [
    `# Report mercato — ${seasons} stagioni, seed ${seed}`, '',
    '| Metrica | Valore | Target | |', '|---|---|---|---|',
    row('Acquisti per finestra estiva', avg(signings), 20, 90, (v) => v.toFixed(0)),
    row('Inflazione dei prezzi sull\'intero periodo', inflation, 0.7, 1.4, (v) => `${v.toFixed(2)}×`),
    row('Monte ingaggi su fatturato (media)', avg(ratios), 0.15, 0.75, pct),
    row('Monte ingaggi su fatturato (massimo)', Math.max(...clubs().map((c) => wageBill(world, c) / revenue(world, c))), 0, 0.85, pct),
    row('Club sopra l\'85% per più di due stagioni', overCap, 0, 0, (v) => String(v)),
    row('Età media delle rose', avg(ages), 24, 28, (v) => v.toFixed(1)),
    row('Top 50 nei dieci club più blasonati', migration(world), 0.4, 0.95, pct),
    row('Giocatori in prestito', avg(loaned), 5, 120, (v) => v.toFixed(0)),
    row('Svincolati rimasti senza squadra', avg(freeLeft), 0, 60, (v) => v.toFixed(0)),
    info('Club col bilancio in rosso', String(red), 'raro'),
    info('Cassa media dei club', money(avg(clubs().map((c) => c.balance)))),
    '', '## Stagione per stagione', ...lines,
  ];
}
