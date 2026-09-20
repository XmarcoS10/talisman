// Contratto di un tuo giocatore: rinnovo, clausola, prestito in corso (GUIDA §7.5).
import { useState } from 'react';
import type { Player, WorldState } from '../../engine/model.ts';
import { Rng } from '../../engine/rng.ts';
import { agentOf } from '../../engine/transfers/agents.ts';
import { acceptsRenewal, askingWage, release, renew, years } from '../../engine/transfers/contracts.ts';
import { fmtMoney, t } from '../i18n.ts';

export function ContractPanel({ world, p, onChange }: { world: WorldState; p: Player; onChange: () => void }) {
  const club = world.clubs[world.manager.clubId]!;
  const ask = askingWage(world, p, club);
  const [wage, setWage] = useState(ask);
  const [msg, setMsg] = useState<string | null>(null);
  const agent = agentOf(world, p);
  const left = p.contract.until - world.season;

  const offer = () => {
    const a = acceptsRenewal(world, p, club, wage);
    if (!a.ok) { setMsg(`deal.no.${a.why}`); return; }
    const rng = new Rng(world.rng);
    renew(world, rng, p, club, wage);
    world.rng = rng.s;
    setMsg('contract.done');
    onChange();
  };

  return (
    <div className="panel">
      <h3>{t('contract.title')}</h3>
      <div className="row wrap">
        <span className={`chip ${left <= 0 ? 'warn' : ''}`}>{t('contract.until', { year: p.contract.until })}</span>
        <span className="chip">{t('contract.wage', { v: fmtMoney(p.contract.wage) })}</span>
        {p.contract.release !== null && <span className="chip">{t('contract.release', { v: fmtMoney(p.contract.release) })}</span>}
        {p.contract.sellOn > 0 && <span className="chip">{t('contract.sellOn', { n: Math.round(p.contract.sellOn * 100), club: world.clubs[p.contract.sellOnTo ?? -1]?.shortName ?? '?' })}</span>}
        {p.contract.loan && <span className="chip warn">{t('contract.loan', { club: world.clubs[p.contract.loan.from]?.shortName ?? '?' })}</span>}
        {p.contract.preSigned !== null && <span className="chip warn">{t('contract.preSigned', { club: world.clubs[p.contract.preSigned]?.shortName ?? '?' })}</span>}
      </div>
      {left <= 1 && !p.contract.loan && (
        <>
          <div className="muted">{t('contract.asks', { agent: agent?.name ?? '—', v: fmtMoney(ask), years: years(p, world.season) })}</div>
          <div className="row">
            <input type="number" min={0} step={50000} value={wage} onChange={(e) => setWage(Number(e.target.value))} />
            <button className="btn primary" onClick={offer}>{t('contract.offer')}</button>
            <button className="btn" onClick={() => { release(world, club, p); setMsg('contract.released'); onChange(); }}>{t('contract.release.do')}</button>
          </div>
        </>
      )}
      {msg && <div className={`banner ${msg === 'contract.done' ? 'ok' : 'warn'}`}>{t(msg)}</div>}
    </div>
  );
}
