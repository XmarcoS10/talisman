// Finanze del club (GUIDA §7.7): conto economico per cassa, rate, fair play finanziario.
import type { Books, WorldState } from '../../engine/model.ts';
import { costs, income, profit, revenue, wageBill, books } from '../../engine/finance/ledger.ts';
import { fmtMoney, t } from '../i18n.ts';

const IN: (keyof Books)[] = ['gate', 'tv', 'sponsor', 'merch', 'prize', 'transfersIn'];
const OUT: (keyof Books)[] = ['wages', 'staff', 'stadium', 'transfersOut'];

export function Finance({ world }: { world: WorldState }) {
  const club = world.clubs[world.manager.clubId]!;
  const now = books(club, world.season);
  const rev = revenue(world, club);
  const ratio = wageBill(world, club) / Math.max(1, rev);
  const rows = [...club.books].reverse();

  return (
    <div className="grid">
      <div className="panel">
        <div className="row wrap">
          <span className="chip">{t('fin.balance')}: <b className="num">{fmtMoney(club.balance)}</b></span>
          <span className="chip">{t('fin.revenue')}: <b className="num">{fmtMoney(rev)}</b></span>
          <span className={`chip ${ratio > 0.72 ? 'warn' : 'ok'}`}>{t('fin.wageRatio')}: {Math.round(ratio * 100)}%</span>
          <span className={`chip ${club.sanction.kind === 'none' ? 'ok' : 'warn'}`}>{t(`fin.sanction.${club.sanction.kind}`, { n: club.sanction.points })}</span>
        </div>
        <div className="muted">{t('fin.hint')}</div>
      </div>

      <div className="panel">
        <h3>{t('fin.title')}</h3>
        <table className="tbl">
          <thead>
            <tr>
              <th>{t('fin.season')}</th>
              {IN.map((k) => <th key={k} className="num">{t(`fin.${k}`)}</th>)}
              {OUT.map((k) => <th key={k} className="num">{t(`fin.${k}`)}</th>)}
              <th className="num">{t('fin.profit')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.season} className={b === now ? 'now' : ''}>
                <td>{b.season}</td>
                {IN.map((k) => <td key={k} className="num">{fmtMoney(b[k] as number)}</td>)}
                {OUT.map((k) => <td key={k} className="num neg">−{fmtMoney(b[k] as number)}</td>)}
                <td className={`num ${profit(b) >= 0 ? 'pos-good' : 'pos-bad'}`}>{fmtMoney(profit(b))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={1 + IN.length + OUT.length + 1} className="muted">
              {t('fin.income')} {fmtMoney(income(now))} · {t('fin.costs')} {fmtMoney(costs(now))}
            </td></tr>
          </tfoot>
        </table>
      </div>

      <div className="panel">
        <h3>{t('fin.debts')}</h3>
        {club.debts.length === 0 && <div className="muted">{t('fin.none')}</div>}
        {club.debts.map((d, i) => <div key={i}>{t('fin.instalment', { v: fmtMoney(d.amount), n: d.seasons, club: world.clubs[d.to]?.shortName ?? '?' })}</div>)}
        <h3>{t('fin.credits')}</h3>
        {club.credits.length === 0 && <div className="muted">{t('fin.none')}</div>}
        {club.credits.map((c, i) => <div key={i}>{t('fin.instalment', { v: fmtMoney(c.amount), n: c.seasons, club: world.clubs[c.to]?.shortName ?? '?' })}</div>)}
      </div>
    </div>
  );
}
