// Notizie importanti (impostazione «pausa sulle notizie critiche»): dopo un avanzamento restano in cima finché non le chiudi.
import { BellRing, X } from 'lucide-react';
import type { NewsItem } from '../engine/model.ts';
import { fmtDate, t, tEvent } from './i18n.ts';

const CRITICAL = /^news\.(injury|trainingInjury|intl\.injury|board\.(warning|sacked)|ffp\.|youth\.jackpot|agentPropose|agentPush|expiring|promiseBroken|feud|bustup|offerIn)/;
export const critical = (items: NewsItem[]) => items.filter((n) => CRITICAL.test(n.key));

export function Alerts({ items, onClose }: { items: NewsItem[]; onClose: () => void }) {
  if (!items.length) return null;
  return (
    <div className="panel alerts" role="alert">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 className="row"><BellRing size={16} /> {t('alerts.title', { n: items.length })}</h3>
        <button className="btn small" onClick={onClose} aria-label={t('alerts.close')}><X size={14} /></button>
      </div>
      {items.map((n, i) => <div key={i}><span className="num muted small">{fmtDate(n.season, n.day)}</span> {tEvent(n.key, n.vars)}</div>)}
    </div>
  );
}
