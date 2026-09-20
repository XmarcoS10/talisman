// Trattativa (GUIDA §7.5, P9 punto 7): tutti i parametri sul tavolo, e il prezzo di riserva mai visibile.
import { useState } from 'react';
import type { Offer, Player, WorldState } from '../../engine/model.ts';
import { Rng } from '../../engine/rng.ts';
import { agentOf, commission } from '../../engine/transfers/agents.ts';
import { askingWage } from '../../engine/transfers/contracts.ts';
import { dropTalk, sendOffer, startTalk, talkCtx, talkFor } from '../../engine/transfers/market.ts';
import { cashNow, emptyOffer, worth } from '../../engine/transfers/negotiation.ts';
import { value } from '../../engine/transfers/valuation.ts';
import { fullName } from '../bits.tsx';
import { fmtMoney, t } from '../i18n.ts';

const M = 1e6;

export function Deal({ world, p, onChange, onClose }: { world: WorldState; p: Player; onChange: () => void; onClose: () => void }) {
  const me = world.clubs[world.manager.clubId]!;
  const seller = p.clubId !== null ? world.clubs[p.clubId]! : null;
  const talk = talkFor(world, p);
  const ctx = seller ? talkCtx(world, p, me) : null;
  const agent = agentOf(world, p);
  const ask = talk?.ask ?? Math.round(value(p, world.season, { clubRep: seller?.reputation ?? 40 }) * 1.45);
  const [o, setO] = useState<Offer>(() => emptyOffer(Math.round(ask / M) * M));
  const [wage, setWage] = useState(() => askingWage(world, p, me));
  const [msg, setMsg] = useState<string | null>(null);
  const set = <K extends keyof Offer>(k: K, v: Offer[K]) => setO({ ...o, [k]: v });

  if (!seller || !ctx) return <button className="btn" onClick={onClose}>{t('player.back')}</button>;
  const fee = agent ? commission(agent, o.fee, me.id) : 0;
  const full = { ...o, agentFee: fee };
  const out = cashNow(full);

  const send = () => {
    const rng = new Rng(world.rng);
    const r = sendOffer(world, rng, p, full, wage);
    world.rng = rng.s;
    setMsg(r.signed ? 'deal.signed' : r.why ? `deal.no.${r.why}` : `deal.${r.kind}`);
    onChange();
  };

  return (
    <div className="panel deal">
      <div className="row">
        <h3>{t('deal.title', { name: fullName(p), club: seller.shortName })}</h3>
        <div className="spacer" />
        <button className="btn" onClick={onClose}>{t('deal.close')}</button>
      </div>

      <div className="row wrap">
        <span className="chip">{t(talk ? 'deal.ask' : 'deal.askGuess', { v: fmtMoney(ask) })}</span>
        <span className="chip">{t('deal.value', { v: fmtMoney(ctx.value) })}</span>
        <span className="chip">{t('deal.cash', { v: fmtMoney(me.balance) })}</span>
        {talk && <span className={`chip ${talk.state === 'broken' ? 'warn' : ''}`}>{t(`deal.state.${talk.state}`, { n: talk.round })}</span>}
        {p.contract.release !== null && <span className="chip ok">{t('deal.release', { v: fmtMoney(p.contract.release) })}</span>}
      </div>

      <div className="grid two">
        <label>{t('deal.fee')} <input type="number" min={0} step={0.5} value={o.fee / M} onChange={(e) => set('fee', Number(e.target.value) * M)} /></label>
        <label>{t('deal.years')} <input type="number" min={1} max={4} value={o.years} onChange={(e) => set('years', Number(e.target.value))} /></label>
        <label>{t('deal.bonusApps')} <input type="number" min={0} step={0.1} value={o.bonusApps / M} onChange={(e) => set('bonusApps', Number(e.target.value) * M)} /></label>
        <label>{t('deal.bonusGoals')} <input type="number" min={0} step={0.1} value={o.bonusGoals / M} onChange={(e) => set('bonusGoals', Number(e.target.value) * M)} /></label>
        <label>{t('deal.sellOn')} <input type="number" min={0} max={30} step={5} value={Math.round(o.sellOn * 100)} onChange={(e) => set('sellOn', Number(e.target.value) / 100)} /></label>
        <label>{t('deal.wage')} <input type="number" min={0} step={50000} value={wage} onChange={(e) => setWage(Number(e.target.value))} /></label>
      </div>

      <div className="row wrap muted">
        <span>{t('deal.agent', { name: agent?.name ?? '—', v: fmtMoney(fee) })}</span>
        <span>{t('deal.worth', { v: fmtMoney(worth(full, ctx.value)) })}</span>
        <span className={out > me.balance ? 'pos-bad' : ''}>{t('deal.outNow', { v: fmtMoney(out) })}</span>
        <span>{t('deal.askWage', { v: fmtMoney(askingWage(world, p, me)) })}</span>
      </div>

      {msg && <div className={`banner ${msg === 'deal.signed' ? 'ok' : msg.startsWith('deal.no') || msg === 'deal.reject' ? 'warn' : ''}`}>{t(msg)}</div>}

      <div className="row">
        <button className="btn primary" disabled={talk?.state === 'agreed' || talk?.state === 'broken'} onClick={send}>{t('deal.send')}</button>
        {!talk && <button className="btn" onClick={() => { const rng = new Rng(world.rng); startTalk(world, rng, p); world.rng = rng.s; onChange(); }}>{t('deal.open')}</button>}
        {talk && <button className="btn" onClick={() => { dropTalk(world, p); setMsg(null); onChange(); }}>{t('deal.drop')}</button>}
      </div>
      <div className="muted">{t('deal.hint')}</div>
    </div>
  );
}
