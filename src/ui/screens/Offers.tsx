// Offerte ricevute (Scrivania): un club IA vuole un tuo giocatore. Accetti, rifiuti o fai una controproposta.
// Il massimo che pagherebbero non si vede; si vede se il giocatore sogna quel club.
import { useState } from 'react';
import { HandCoins } from 'lucide-react';
import type { IncomingOffer, WorldState } from '../../engine/model.ts';
import { Rng } from '../../engine/rng.ts';
import { acceptOffer, counterOffer, keen, rejectOffer } from '../../engine/transfers/offers.ts';
import { Crest } from '../Crest.tsx';
import { PosBadge, fullName } from '../bits.tsx';
import { fmtDate, fmtMoney, t } from '../i18n.ts';

const M = 1e6;
type Props = { world: WorldState; onChange: () => void; onPlayer: (id: number) => void };

export function Offers({ world, onChange, onPlayer }: Props) {
  const [msg, setMsg] = useState<string | null>(null);
  if (!world.offers.length && !msg) return null;

  // ogni decisione usa il generatore del mondo e lo rimette a posto
  const act = (f: (rng: Rng) => string) => {
    const rng = new Rng(world.rng);
    setMsg(f(rng));
    world.rng = rng.s;
    onChange();
  };

  return (
    <div className="panel" style={{ borderColor: 'var(--accent)' }}>
      <h2><HandCoins size={18} /> {t('offers.title')}</h2>
      {msg && <div className="muted small" role="status">{msg}</div>}
      {world.offers.map((o) => <Row key={`${o.playerId}-${o.buyer}`} world={world} o={o} act={act} onPlayer={onPlayer} />)}
    </div>
  );
}

function Row({ world, o, act, onPlayer }: { world: WorldState; o: IncomingOffer; act: (f: (rng: Rng) => string) => void; onPlayer: (id: number) => void }) {
  const p = world.players[o.playerId];
  const buyer = world.clubs[o.buyer];
  const [ask, setAsk] = useState(Math.round((o.fee * 1.2) / M * 10) / 10);
  if (!p || !buyer) return null;
  const name = fullName(p);
  return (
    <div className="stack" style={{ gap: 8, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
      <div className="row wrap" style={{ justifyContent: 'space-between' }}>
        <span className="row"><PosBadge pos={p.position} /><button className="link" onClick={() => onPlayer(p.id)}>{name}</button></span>
        <span className="row"><Crest club={buyer} size={18} />{buyer.name}</span>
      </div>
      <div className="row wrap muted small">
        <span>{t('offers.fee')} <b className="num pos-good">{fmtMoney(o.fee)}</b></span>
        <span>{t('offers.wage', { wage: fmtMoney(o.wage) })}</span>
        <span>{t('offers.until', { date: fmtDate(world.season, o.until) })}</span>
        {keen(world, p, buyer) && <span className="tag">{t('offers.keen')}</span>}
        {o.countered && <span className="tag dim">{t('offers.last')}</span>}
      </div>
      <div className="row wrap">
        <button className="btn primary" onClick={() => act((r) => t(acceptOffer(world, r, o) ? 'offers.sold' : 'offers.void', { name }))}>{t('offers.accept')}</button>
        <button className="btn" onClick={() => act(() => { rejectOffer(world, o); return t('offers.rejected', { name }); })}>{t('offers.reject')}</button>
        <label className="row small">{t('offers.ask')}
          <input type="number" min={0} step={0.5} value={ask} style={{ width: 80 }} onChange={(e) => setAsk(Number(e.target.value))} /> M</label>
        <button className="btn" onClick={() => act((r) => t(`offers.counter.${counterOffer(world, r, o, ask * M)}`, { name, club: buyer.name }))}>{t('offers.send')}</button>
      </div>
    </div>
  );
}
