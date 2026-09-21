// Dirigenza (GUIDA §7.7): riquadri, quattro barre della fiducia, contratto rinegoziabile con anteprima del costo,
// storico dei giudizi, richieste che costano capitale politico.
import { useState } from 'react';
import { ArrowLeftRight, Banknote, ChartNoAxesColumn, Clock, GraduationCap, Handshake, Newspaper, ScanSearch, Shield, Target, UserMinus, Users } from 'lucide-react';
import { BOARD, YOUTH } from '../../engine/balance.ts';
import { dealCost, expected, fairPosition, position, renegotiate, request, requestCost, type RequestKind } from '../../engine/board/board.ts';
import type { WorldState } from '../../engine/model.ts';
import { fmtMoney, fmtSeason, t } from '../i18n.ts';

const BARS = [['board', Shield], ['fans', Newspaper], ['squad', Users], ['press', ChartNoAxesColumn]] as const;
const REQS = [['budget', Banknote], ['facility', GraduationCap], ['sale', UserMinus], ['scouts', ScanSearch]] as const;
const band = (v: number) => (v >= 70 ? 'high' : v >= 50 ? 'ok' : v >= BOARD.warnAt ? 'low' : 'crisis');

export function BoardView({ world, onChange }: { world: WorldState; onChange: () => void }) {
  const club = world.clubs[world.manager.clubId]!;
  const b = world.manager.board;
  const n = world.competitions[club.compId]!.clubIds.length;
  const fair = fairPosition(world, club);
  const [seasons, setSeasons] = useState(2);
  const [target, setTarget] = useState(Math.min(n, fair + 3));
  const [msg, setMsg] = useState<string | null>(null);
  const cost = dealCost(world, club, seasons, target);
  const tooMuch = b.trust.board - cost < BOARD.sackAt;
  const avg = Math.round((b.trust.board + b.trust.fans + b.trust.squad + b.trust.press) / 4);

  const ask = (kind: RequestKind) => {
    const r = request(world, kind);
    setMsg(r.ok ? 'board.granted' : 'board.refused');
    onChange();
  };

  return (
    <div className="stack">
      <div className="kpis">
        <div className="kpi"><span className="caps">{t('board.minTarget')}</span><div className="big">{expected(world, club)}° <small>{t('board.place')}</small></div>
          <span className="small" style={{ color: 'var(--data-1)' }}><Target size={12} /> {t(b.deal.seasons > 0 ? 'board.agreed' : 'board.byReputation')}</span></div>
        <div className="kpi"><span className="caps">{t('board.now')}</span><div className="big">{position(world, club)}° <small>{t('board.place')}</small></div>
          <span className="muted small">{fmtSeason(world.season)}</span></div>
        <div className="kpi"><span className="caps pos-good">● {t('board.capital')}</span><div className="big num">{Math.round(b.capital)} <small>/ 100 pt</small></div>
          <span className="muted small">{t('board.capitalHint')}</span></div>
        <div className="kpi"><span className="caps">{t('board.pact')}</span><div className="big">{t(b.deal.seasons > 0 ? 'board.pactDeal' : 'board.pactStd')}</div>
          <span className="muted small">{b.deal.seasons > 0 ? t('board.deal', { pos: b.deal.position, n: b.deal.seasons }) : t('board.noDeal')}</span></div>
      </div>

      <div className="panel">
        <div className="row"><h2>● {t('board.trustTitle')}</h2><span className="tag num">{t('board.avg', { n: avg })}</span></div>
        <div className="kpis">
          {BARS.map(([k, Icon]) => (
            <div key={k} className="kpi" style={{ background: 'var(--bg-1)' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}><b className="row" style={{ fontSize: 17 }}><Icon size={17} color="var(--warning)" /> {t(`board.trust.${k}`)}</b>
                <b className={`num ${b.trust[k] < BOARD.warnAt ? 'pos-bad' : 'pos-good'}`}>{Math.round(b.trust[k])}%</b></div>
              <div className="meter"><i className={b.trust[k] < BOARD.warnAt ? 'bad' : b.trust[k] < 50 ? 'warn' : ''} style={{ width: `${b.trust[k]}%` }} /></div>
              <span className="caps pos-good">{t(`board.band.${band(b.trust[k])}`)}{k === 'board' ? ` · ${t('board.sackLine', { n: BOARD.sackAt })}` : ''}</span>
              <span className="muted small">{t(`board.say.${k}.${band(b.trust[k])}`)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cols2" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
        <div className="panel">
          <h2><ArrowLeftRight size={18} /> {t('board.renegotiate')}</h2>
          <span className="muted">{t('board.hint')}</span>
          <div className="deal-box">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div><b className="deal-h">{t('board.horizon')}</b><div className="muted small">{t('board.horizonHint')}</div></div>
              <div className="stepper">
                <button onClick={() => setSeasons(Math.max(1, seasons - 1))}>−</button>
                <b className="num">{t('board.years', { n: seasons })}</b>
                <button onClick={() => setSeasons(Math.min(BOARD.dealMaxSeasons, seasons + 1))}>+</button>
              </div>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div><b className="deal-h">{t('board.target')}</b><div className="muted small">{t('board.targetHint', { fair })}</div></div>
              <span className="tag cyan num" style={{ fontSize: 14 }}>{target}°</span>
            </div>
            <input type="range" min={1} max={n} value={target} onChange={(e) => setTarget(Number(e.target.value))} aria-label={t('board.target')} />
            <div className="row muted small" style={{ justifyContent: 'space-between' }}><span>1°</span><span>{t('board.fairMark', { n: fair })}</span><span>{n}°</span></div>
            <div className="row small">
              <span className="muted">{t('board.impact')}</span>
              <b className={cost > 0 ? 'pos-bad' : 'pos-good'}>{t('board.trustDelta', { v: (cost > 0 ? '−' : '+') + Math.abs(Math.round(cost)) })}</b>
              <span className="tag dim">{t(`board.risk.${target < fair ? 'high' : target <= fair + 2 ? 'mid' : 'low'}`)}</span>
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted small">{tooMuch ? t('board.tooLittle') : t('board.oneAtATime')}</span>
            <button className="btn primary big" disabled={tooMuch} onClick={() => { setMsg(renegotiate(world, seasons, target) ? 'board.dealDone' : 'board.tooLittle'); onChange(); }}>
              <Handshake size={16} /> {t('board.ask')}
            </button>
          </div>
        </div>

        <div className="panel">
          <h2><Clock size={18} /> {t('board.verdicts')}</h2>
          <div className="timeline">
            <div className="tl-item now"><b>{t('board.inProgress', { s: fmtSeason(world.season) })}</b>
              <span className="muted small">{t('board.progressLine', { pos: position(world, club), exp: expected(world, club), v: fmtMoney(club.balance) })}</span></div>
            {[...b.verdicts].reverse().map((v) => (
              <div key={v.season} className="tl-item"><b>{fmtSeason(v.season)}</b>
                <span className={`tag ${v.position <= v.expected ? '' : 'bad'}`}>{t(v.position <= v.expected ? 'board.passed' : 'board.missed')}</span>
                <span className="muted small">{t('board.verdict', { season: fmtSeason(v.season), pos: v.position, exp: v.expected, trust: v.trust })}</span></div>
            ))}
            {b.verdicts.length === 0 && <span className="muted small">{t('board.noVerdicts')}</span>}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}><h2>● {t('board.requests')}</h2><span className="row">{t('board.available')} <span className="tag num">{Math.round(b.capital)} PT</span></span></div>
        {msg && <div className={`banner ${msg === 'board.refused' || msg === 'board.tooLittle' ? 'warn' : ''}`}>{t(msg)}</div>}
        <div className="kpis">
          {REQS.map(([k, Icon]) => {
            const c = requestCost(k);
            const off = b.capital < c || (k === 'scouts' && b.scoutSlots >= BOARD.maxScoutSlots);
            return (
              <div key={k} className="kpi req">
                <div className="row" style={{ justifyContent: 'space-between' }}><span className="hint-icon" style={{ width: 38, height: 38 }}><Icon size={18} /></span><span className="tag num">{t('board.costPt', { n: c })}</span></div>
                <b className="deal-h">{t(`board.req.${k}`)}</b>
                <span className="muted small">{t(`board.reqText.${k}`)}</span>
                <span className="mini-card small">{t(`board.reqGain.${k}`, { v: fmtMoney(Math.round(club.balance * BOARD.budgetGrant)), n: club.youth.facilities, n2: Math.min(20, club.youth.facilities + YOUTH.facilityRequest), slots: b.scoutSlots, slots2: b.scoutSlots + 1 })}</span>
                <div className="row" style={{ justifyContent: 'space-between', marginTop: 'auto' }}>
                  <span className={`small ${off ? 'muted' : 'pos-good'}`}>{t(off ? 'board.notAvailable' : 'board.isAvailable')}</span>
                  <button className="btn" disabled={off} onClick={() => ask(k)}>{t('board.request')}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
