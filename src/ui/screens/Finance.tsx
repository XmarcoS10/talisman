// Finanze del club (GUIDA §7.7): riquadri, conto economico per stagione (quella in corso è una proiezione), rate,
// andamento della cassa mese per mese.
import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChartColumn, PiggyBank, ReceiptText, ShieldCheck, TrendingUp } from 'lucide-react';
import type { Books, WorldState } from '../../engine/model.ts';
import { FIN } from '../../engine/balance.ts';
import { costs, income, profit, projection, revenue, wageBill } from '../../engine/finance/ledger.ts';
import { standings } from '../../engine/world.ts';
import { fmtMoney, gameDate, t, locale } from '../i18n.ts';
import { Instalments } from './FinanceParts.tsx';

const IN: (keyof Books)[] = ['gate', 'tv', 'sponsor', 'merch', 'prize', 'transfersIn'];
const OUT: (keyof Books)[] = ['wages', 'staff', 'stadium', 'transfersOut'];

export function Finance({ world }: { world: WorldState }) {
  const club = world.clubs[world.manager.clubId]!;
  const comp = world.competitions[club.compId]!;
  const table = standings(world, comp);
  const pos = table.findIndex((r) => r.clubId === club.id) + 1;
  const proj = projection(world, club, pos, table.length);
  const past = club.books.filter((b) => b.season < world.season).reverse();
  const [season, setSeason] = useState(world.season);
  const shown = season === world.season ? proj : past.find((b) => b.season === season) ?? proj;
  const rev = revenue(world, club);
  const bill = wageBill(world, club);
  const cap = rev * FIN.ffpWageCap;
  const ratio = bill / Math.max(1, rev);
  const cur = club.books.at(-1)?.season === world.season ? club.books.at(-1)! : undefined;
  const lastYearEnd = past[0]?.monthly.at(-1);

  return (
    <div className="stack">
      <div className="kpis">
        <div className="kpi">
          <span className="row" style={{ justifyContent: 'space-between' }}><span className="caps">{t('fin.balance')}</span>
            <span className={`tag ${club.sanction.kind === 'none' ? '' : 'warn'}`}>{t(club.sanction.kind === 'none' ? 'fin.ok' : 'fin.watch')}</span></span>
          <div className="big num">{fmtMoney(club.balance)}</div>
          {lastYearEnd !== undefined && <span className="muted small"><TrendingUp size={12} /> {t('fin.vsLast', { v: fmtMoney(club.balance - lastYearEnd) })}</span>}
        </div>
        <div className="kpi">
          <span className="caps">{t('fin.projRevenue')}</span>
          <div className="big num">{fmtMoney(income(proj) - proj.transfersIn)}</div>
          <span className="muted small">{t('fin.lastRevenue', { v: fmtMoney(rev) })}</span>
        </div>
        <div className="kpi">
          <span className="row" style={{ justifyContent: 'space-between' }}><span className="caps">{t('fin.wageBill')}</span><span className="tag dim num">{t('fin.cap', { v: fmtMoney(cap) })}</span></span>
          <div className="big num">{fmtMoney(bill)} <small className={ratio > FIN.ffpWageCap ? 'pos-bad' : 'pos-good'}>{Math.round(ratio * 100)}%</small></div>
          <div className="meter"><i className={ratio > FIN.ffpWageCap ? 'bad' : ratio > FIN.ffpWageCap - 0.08 ? 'warn' : ''} style={{ width: `${Math.min(100, ratio / FIN.ffpWageCap * 100)}%` }} /></div>
          <span className="muted small">{t('fin.margin', { v: fmtMoney(Math.max(0, cap - bill)), p: Math.round(FIN.ffpWageCap * 100) })}</span>
        </div>
        <div className="kpi">
          <span className="caps">{t('fin.ffp')}</span>
          <div className="row"><ShieldCheck size={22} className={club.sanction.kind === 'none' ? 'pos-good' : 'pos-bad'} /><b className="big" style={{ fontSize: 22 }}>{t(`fin.ffpState.${club.sanction.kind}`)}</b></div>
          <span className="muted small">{t(`fin.sanction.${club.sanction.kind}`, { n: club.sanction.points })}</span>
        </div>
      </div>

      <div className="panel">
        <div className="row wrap" style={{ justifyContent: 'space-between' }}>
          <h2><ReceiptText size={18} /> {t('fin.statement', { s: `${season}/${String(season + 1).slice(2)}` })}</h2>
          <div className="seg-tabs">
            <button className={season === world.season ? 'active' : ''} onClick={() => setSeason(world.season)}>{t('fin.current', { s: `${world.season}/${String(world.season + 1).slice(2)}` })}</button>
            {past.slice(0, 3).map((b) => <button key={b.season} className={season === b.season ? 'active' : ''} onClick={() => setSeason(b.season)}>{t('fin.closed', { s: `${b.season}/${String(b.season + 1).slice(2)}` })}</button>)}
          </div>
        </div>
        <span className="muted small">{season === world.season ? t('fin.projHint') : t('fin.closedHint')}</span>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Side kind="in" b={shown} keys={IN} />
          <Side kind="out" b={shown} keys={OUT} />
        </div>
        <div className="net">
          <PiggyBank size={22} />
          <div><b>{t(season === world.season ? 'fin.netProj' : 'fin.net')}</b><div className="muted small">{t('fin.cashBasis')}</div></div>
          <b className={`num ${profit(shown) >= 0 ? 'pos-good' : 'pos-bad'}`}>{profit(shown) >= 0 ? '+' : ''}{fmtMoney(profit(shown))}</b>
        </div>
      </div>

      <Instalments world={world} club={club} />

      <div className="panel">
        <h2><ChartColumn size={18} /> {t('fin.trend', { s: `${world.season}/${String(world.season + 1).slice(2)}` })}</h2>
        <CashChart world={world} monthly={cur?.monthly ?? []} />
      </div>
    </div>
  );
}

function Side({ kind, b, keys }: { kind: 'in' | 'out'; b: Books; keys: (keyof Books)[] }) {
  const tot = kind === 'in' ? income(b) : costs(b);
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className={`side-head ${kind}`}>
        <span>{kind === 'in' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />} {t(kind === 'in' ? 'fin.income' : 'fin.costs')}</span>
        <b className="num">{kind === 'in' ? '+' : '−'}{fmtMoney(tot)}</b>
      </div>
      {keys.map((k) => {
        const v = b[k] as number;
        return (
          <div key={k} className="ledger-row">
            <div><b>{t(`fin.${k}`)}</b><div className="muted small">{t(`fin.desc.${k}`)}</div></div>
            <div className="r"><b className="num">{fmtMoney(v)}</b><div className="small" style={{ color: kind === 'in' ? 'var(--accent)' : 'var(--warning)' }}>{tot ? Math.round(v / tot * 1000) / 10 : 0}%</div></div>
          </div>
        );
      })}
    </div>
  );
}

function CashChart({ world, monthly }: { world: WorldState; monthly: number[] }) {
  const max = Math.max(1, ...monthly.map((v) => Math.abs(v)));
  const now = Math.min(11, Math.floor(Math.max(0, world.day) / 30));
  return (
    <div className="cash-chart">
      {Array.from({ length: 12 }, (_, i) => {
        const v = monthly[i];
        return (
          <div key={i} className={`cash-col ${i === now ? 'now' : ''}`} title={v !== undefined ? fmtMoney(v) : ''}>
            <div className="cash-bar-wrap">{v !== undefined && <div className={`cash-bar ${v < 0 ? 'neg' : ''}`} style={{ height: `${Math.abs(v) / max * 100}%` }} />}</div>
            <span className="caps">{gameDate(world.season, i * 30 + 15).toLocaleDateString(locale(), { month: 'short', timeZone: 'UTC' })}</span>
          </div>
        );
      })}
    </div>
  );
}
