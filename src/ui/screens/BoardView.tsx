// Dirigenza (GUIDA §7.7): quattro barre, l'obiettivo concordato, le richieste che costano capitale.
import { useState } from 'react';
import { BOARD } from '../../engine/balance.ts';
import { expected, fairPosition, position, renegotiate, request, type RequestKind } from '../../engine/board/board.ts';
import type { WorldState } from '../../engine/model.ts';
import { fmtMoney, t } from '../i18n.ts';

const BARS = ['board', 'fans', 'squad', 'press'] as const;
const COSTS: Record<RequestKind, number> = { budget: BOARD.costBudget, facility: BOARD.costFacility, sale: BOARD.costSale };

export function BoardView({ world, onChange }: { world: WorldState; onChange: () => void }) {
  const club = world.clubs[world.manager.clubId]!;
  const b = world.manager.board;
  const fair = fairPosition(world, club);
  const [seasons, setSeasons] = useState(2);
  const [target, setTarget] = useState(Math.min(20, fair + 3));
  const [msg, setMsg] = useState<string | null>(null);

  const ask = (kind: RequestKind) => {
    if (b.capital < COSTS[kind]) { setMsg('board.tooLittle'); return; }
    const r = request(world, kind);
    setMsg(r.ok ? null : 'board.refused');
    onChange();
  };

  return (
    <div className="grid">
      <div className="panel">
        <h3>{t('board.title')}</h3>
        <div className="bars">
          {BARS.map((k) => (
            <div key={k} className="bar-row">
              <span>{t(`board.trust.${k}`)}</span>
              <div className="meter">
                <div className={`fill ${b.trust[k] < BOARD.warnAt ? 'bad' : b.trust[k] > 70 ? 'good' : ''}`} style={{ width: `${b.trust[k]}%` }} />
              </div>
              <b className="num">{Math.round(b.trust[k])}</b>
            </div>
          ))}
        </div>
        <div className="row wrap">
          <span className="chip">{t('board.expected', { pos: expected(world, club) })}</span>
          <span className="chip">{t('board.position', { pos: position(world, club) })}</span>
          <span className="chip">{t('board.capital')}: <b className="num">{Math.round(b.capital)}</b></span>
        </div>
        <div className="muted">{b.deal.seasons > 0 ? t('board.deal', { pos: b.deal.position, n: b.deal.seasons }) : t('board.noDeal')}</div>
      </div>

      <div className="panel">
        <h3>{t('board.renegotiate')}</h3>
        <div className="row wrap">
          <label>{t('board.seasons')} <input type="number" min={1} max={BOARD.dealMaxSeasons} value={seasons} onChange={(e) => setSeasons(Number(e.target.value))} /></label>
          <label>{t('board.target')} <input type="number" min={1} max={20} value={target} onChange={(e) => setTarget(Number(e.target.value))} /></label>
          <button className="btn primary" onClick={() => { setMsg(renegotiate(world, seasons, target) ? null : 'board.tooLittle'); onChange(); }}>
            {t('board.ask')}
          </button>
        </div>
        <div className="muted">{t('board.hint')}</div>
      </div>

      <div className="panel">
        <h3>{t('board.requests')}</h3>
        <div className="row wrap">
          {(['budget', 'facility', 'sale'] as RequestKind[]).map((k) => (
            <button key={k} className="btn" disabled={b.capital < COSTS[k]} onClick={() => ask(k)}>
              {t(`board.req.${k}`)} <span className="muted">({t('board.cost', { n: COSTS[k] })})</span>
            </button>
          ))}
        </div>
        {msg && <div className="banner warn">{t(msg)}</div>}
        <div className="muted">{t('fin.balance')}: {fmtMoney(club.balance)}</div>
      </div>

      <div className="panel">
        <h3>{t('board.verdicts')}</h3>
        {b.verdicts.length === 0 && <div className="muted">{t('board.noVerdicts')}</div>}
        {[...b.verdicts].reverse().map((v) => (
          <div key={v.season}>{t('board.verdict', { season: v.season, pos: v.position, exp: v.expected, trust: v.trust })}</div>
        ))}
      </div>
    </div>
  );
}
