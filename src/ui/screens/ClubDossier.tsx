// Nuova carriera, passo 2: il dossier del club (bilancio, strutture, perni della rosa, moduli adatti),
// poi nome e filosofia dell'allenatore, e la firma.
import { Building2, CalendarDays, FileSignature, Landmark, Star, Users, Wallet } from 'lucide-react';
import { FIN, STYLE } from '../../engine/balance.ts';
import { fairPosition } from '../../engine/board/board.ts';
import { estimate, wageBill } from '../../engine/finance/ledger.ts';
import { bestFormation } from '../../engine/match.ts';
import { MANAGER_STYLES, type ManagerStyle, type WorldState } from '../../engine/model.ts';
import { value } from '../../engine/transfers/valuation.ts';
import { Crest } from '../Crest.tsx';
import { PosBadge, fullName } from '../bits.tsx';
import { fmtMoney, t, locale } from '../i18n.ts';
import { challenge, strengthRank } from './ClubPicker.tsx';
import { boardGoal } from './Start.tsx';

const STYLES = MANAGER_STYLES.filter((s) => s !== 'none');

interface Props {
  world: WorldState; clubId: number; name: string; setName: (s: string) => void;
  style: ManagerStyle; setStyle: (s: ManagerStyle) => void; canSign: boolean; onSign: () => void; slotPicker: React.ReactNode;
}

export function ClubDossier({ world, clubId, name, setName, style, setStyle, canSign, onSign, slotPicker }: Props) {
  const c = world.clubs[clubId]!;
  const rev = estimate(world, c);
  const bill = wageBill(world, c);
  const cap = rev * FIN.ffpWageCap;
  const stars = c.playerIds.map((id) => world.players[id]!).sort((a, b) => b.ca - a.ca).slice(0, 3);
  const best = bestFormation(world, c);
  const grade = bill / rev < 0.5 ? 'A+' : bill / rev < 0.62 ? 'A' : bill / rev < 0.72 ? 'B' : 'C';
  const lines = challenge(world, c);

  return (
    <div className="stack">
      <div className="panel dossier-hero">
        <span className="dossier-crest"><Crest club={c} size={96} /></span>
        <div className="stack" style={{ gap: 8 }}>
          <span className="row wrap">
            <span className="tag">{world.competitions[c.compId]!.name}</span>
            <span className="tag dim">{t('start.founded', { y: c.founded })}</span>
            <span className="tag dim"><CalendarDays size={11} /> {t('start.stadium', { name: c.stadium.name, cap: c.stadium.capacity.toLocaleString(locale()) })}</span>
          </span>
          <h1 className="dossier-name">{c.name}</h1>
          <span className="serif muted">“{lines.join(' ')}”</span>
        </div>
        <div className="dossier-side">
          <span className="caps">{t('start.forecast')}</span><b className="deal-h pos-good">{t('start.forecastPos', { n: strengthRank(world, c) })}</b>
          <span className="caps">{t('start.health')}</span><b className="deal-h" style={{ color: 'var(--data-1)' }}>{t('start.healthGrade', { g: grade })}</b>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', alignItems: 'start' }}>
        <div className="panel">
          <div className="row" style={{ justifyContent: 'space-between' }}><h2><Wallet size={18} /> {t('start.finance')}</h2><span className="tag dim">{t('start.season', { s: `${world.season % 100}/${(world.season + 1) % 100}` })}</span></div>
          <div className="mini-card"><span className="caps">{t('start.budget')}</span><b className="big-num">{fmtMoney(c.balance)}</b><div className="meter"><i style={{ width: `${Math.min(100, c.balance / Math.max(1, rev) * 100)}%` }} /></div></div>
          <div className="mini-card"><span className="row" style={{ justifyContent: 'space-between' }}><span className="caps">{t('start.wages')}</span><span className="muted small">{t('fin.cap', { v: fmtMoney(cap) })}</span></span>
            <b className="deal-h num">{fmtMoney(bill)} <small className="muted">/ {t('start.year')}</small></b>
            <div className="meter"><i className="cyan" style={{ width: `${Math.min(100, bill / cap * 100)}%` }} /></div>
            <span className="small pos-good">{t('start.margin', { v: fmtMoney(Math.max(0, cap - bill)) })}</span></div>
          <div className="tile-facts">
            <span>{t('start.goalLabel')}</span><span>{boardGoal(world, c.id)}</span>
            <span>{t('start.fair')}</span><span>{t('start.forecastPos', { n: fairPosition(world, c) })}</span>
            <span>{t('start.revenue')}</span><span className="num">{fmtMoney(rev)}</span>
          </div>
        </div>

        <div className="panel">
          <h2><Building2 size={18} /> {t('start.infra')}</h2>
          <div className="mini-card"><span className="row" style={{ justifyContent: 'space-between' }}><span className="caps">{t('youth.facilities')}</span><b className="num" style={{ color: 'var(--data-1)' }}>{t('start.level', { n: c.youth.facilities })}</b></span>
            <span className="segbar">{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < c.youth.facilities / 2 ? 'on' : ''} />)}</span></div>
          <div className="mini-card"><span className="row" style={{ justifyContent: 'space-between' }}><span className="caps">{t('youth.recruitment')}</span><b className="num pos-mid">{t('start.level', { n: c.youth.recruitment })}</b></span>
            <span className="segbar">{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < c.youth.recruitment / 2 ? 'on warn' : ''} />)}</span></div>
          <div className="tile-facts">
            <span><Landmark size={12} /> {t('start.stadiumLabel')}</span><span>{c.stadium.capacity.toLocaleString(locale())}</span>
            <span>{t('start.reputation')}</span><span>{c.reputation}/100</span>
            <span>{t('start.styleReq')}</span><span className="pos-good">{t(`start.style.${c.philosophy}`)}</span>
          </div>
        </div>

        <div className="panel">
          <div className="row" style={{ justifyContent: 'space-between' }}><h2><Star size={18} /> {t('start.keyPlayers')}</h2><span className="tag dim">{t('start.leaders', { n: stars.length })}</span></div>
          {stars.map((p) => (
            <div key={p.id} className="leader" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
              <PosBadge pos={p.position} />
              <span><b>{fullName(p)}</b><small>{t('start.playerLine', { age: world.season - p.birthYear, nat: t(`nation.${p.nation}`) })}</small></span>
              <span className="num small">{fmtMoney(value(p, world.season, { clubRep: c.reputation }))}</span>
            </div>
          ))}
          <div className="mini-card"><span className="caps">{t('start.bestFormation')}</span><b className="deal-h">{best}</b></div>
        </div>
      </div>

      <div className="panel sign-box">
        <h2><FileSignature size={20} /> {t('start.profile')}</h2>
        <span className="muted">{t('start.profileSub', { club: c.name })}</span>
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', alignItems: 'start' }}>
          <label className="field"><span className="caps">{t('start.managerName')}</span>
            <input className="big-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('start.managerPlaceholder')} maxLength={40} /></label>
          <div className="field"><span className="caps">{t('start.philosophy')}</span>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {STYLES.map((s) => (
                <button key={s} className={`style-card ${style === s ? 'selected' : ''}`} onClick={() => setStyle(style === s ? 'none' : s)}>
                  <Users size={16} /><b>{t(`start.styleName.${s}`)}</b>
                  <small>{t(`start.styleFx.${s}`, { m: STYLE.morale, f: Math.round((STYLE.famGain - 1) * 100), y: Math.round((STYLE.youthGrowth - 1) * 100), a: STYLE.youthAge })}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
        {slotPicker}
        <div className="sign-row">
          <span className="row"><span className="hint-icon" style={{ width: 40, height: 40 }}><FileSignature size={18} /></span>
            <span><b>{t('start.approved')}</b><div className="muted small">{t('start.approvedSub', { goal: boardGoal(world, c.id) })}</div></span></span>
          <button className="btn primary big" disabled={!canSign} onClick={onSign}><FileSignature size={16} /> {t('start.sign')}</button>
        </div>
      </div>
    </div>
  );
}
