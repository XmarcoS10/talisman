// Rate dei trasferimenti: da pagare e da incassare, con la scadenza (si pagano a ogni cambio di stagione).
import { ArrowDownLeft, ArrowUpRight, CalendarClock } from 'lucide-react';
import type { Club, Instalment, WorldState } from '../../engine/model.ts';
import { Crest } from '../Crest.tsx';
import { fmtMoney, t } from '../i18n.ts';

export function Instalments({ world, club }: { world: WorldState; club: Club }) {
  const sum = (l: Instalment[]) => l.reduce((s, x) => s + x.amount * x.seasons, 0);
  const next = club.debts.reduce((s, d) => s + d.amount, 0);
  const col = (kind: 'debts' | 'credits', list: Instalment[]) => (
    <div className="panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>{kind === 'debts' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />} {t(`fin.${kind}`)}</h2>
        <span className={`tag ${kind === 'debts' ? 'warn' : ''}`}>{t('fin.total', { v: fmtMoney(sum(list)) })}</span>
      </div>
      {list.length === 0 && <span className="muted">{t('fin.none')}</span>}
      {list.map((x, i) => {
        const c = world.clubs[x.to];
        return (
          <div key={i} className="ledger-row">
            <span className="row">{c && <Crest club={c} size={22} />}<span><b>{c?.name ?? '—'}</b>
              <div className="muted small">{t(kind === 'debts' ? 'fin.creditor' : 'fin.debtor')}</div></span></span>
            <div className="r"><b className="num">{fmtMoney(x.amount)}</b><div className="muted small">{t('fin.left', { n: x.seasons })}</div></div>
          </div>
        );
      })}
    </div>
  );
  return (
    <div className="stack">
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
        {col('debts', club.debts)}
        {col('credits', club.credits)}
      </div>
      {(club.debts.length > 0 || club.credits.length > 0) && (
        <div className="muted small row"><CalendarClock size={14} /> {t('fin.nextDue', { v: fmtMoney(next), net: fmtMoney(sum(club.credits) - sum(club.debts)) })}</div>
      )}
    </div>
  );
}
