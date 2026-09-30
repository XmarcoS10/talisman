// Catalogo dei riquadri della Scrivania (interfaccia v2, fase 2): categoria, taglie ammesse, disegno; più i layout pronti.
// Taglie sulla griglia a 12 colonne: S = un quarto, M = metà, L = tutta la riga.
import { Ambulance, BriefcaseBusiness, CalendarRange, FileClock } from 'lucide-react';
import type { ComponentType } from 'react';
import { BOARD } from '../../engine/balance.ts';
import { cupFixtures } from '../../engine/cup.ts';
import type { Fixture } from '../../engine/model.ts';
import { Crest } from '../Crest.tsx';
import { Guide } from '../Guide.tsx';
import { PosBadge, fullName } from '../bits.tsx';
import { fmtDate, fmtMoney, t } from '../i18n.ts';
import { fxLabel } from '../league.ts';
import { DeskStories } from './Stories.tsx';
import { Offers } from './Offers.tsx';
import { type DeskCtx, History, KpiCash, KpiForm, KpiMorale, KpiPos, News, NextMatch, Table } from './DeskParts.tsx';

export type Size = 'S' | 'M' | 'L';
export type WidgetId = 'pos' | 'form' | 'cash' | 'morale' | 'next' | 'next5' | 'injuries' | 'contracts' | 'table' | 'history' | 'board' | 'offers' | 'news' | 'stories' | 'guide';
export type Category = 'matches' | 'squad' | 'comps' | 'club' | 'market' | 'news' | 'guide';
export interface DeskItem { id: WidgetId; size: Size }
export type Preset = 'coach' | 'director' | 'essential';

function Injuries({ world, onPlayer }: DeskCtx) {
  const out = world.clubs[world.manager.clubId]!.playerIds.map((id) => world.players[id]!).filter((p) => p.condition.injuryDays > 0 || p.discipline.ban > 0);
  return (
    <div className="panel">
      <h2><Ambulance size={18} /> {t('desk.w.injuries')}</h2>
      {out.length ? out.map((p) => (
        <button key={p.id} className="list-row link" onClick={() => onPlayer(p.id)}>
          <PosBadge pos={p.position} /><span>{fullName(p)}</span>
          <span className="num small pos-bad">{p.condition.injuryDays > 0 ? t('desk.inj.days', { n: p.condition.injuryDays }) : t('desk.inj.ban', { n: p.discipline.ban })}</span>
        </button>
      )) : <span className="muted small">{t('desk.inj.none')}</span>}
    </div>
  );
}

function Contracts({ world, onPlayer }: DeskCtx) {
  const due = world.clubs[world.manager.clubId]!.playerIds.map((id) => world.players[id]!).filter((p) => p.contract.until <= world.season && !p.contract.loan);
  return (
    <div className="panel">
      <h2><FileClock size={18} /> {t('desk.w.contracts')}</h2>
      {due.length ? due.map((p) => (
        <button key={p.id} className="list-row link" onClick={() => onPlayer(p.id)}>
          <PosBadge pos={p.position} /><span>{fullName(p)}</span><span className="num small muted">{t('desk.wage', { v: fmtMoney(p.contract.wage) })}</span>
        </button>
      )) : <span className="muted small">{t('desk.contracts.none')}</span>}
    </div>
  );
}

function Next5({ world }: DeskCtx) {
  const me = world.manager.clubId;
  const comp = world.competitions[world.clubs[me]!.compId]!;
  const open = (f: Fixture) => !f.result && (f.home === me || f.away === me);
  const list = [...comp.fixtures.filter(open), ...cupFixtures(world).filter(open)].sort((a, b) => a.day - b.day).slice(0, 5);
  return (
    <div className="panel">
      <h2><CalendarRange size={18} /> {t('desk.w.next5')}</h2>
      {list.map((f) => {
        const opp = world.clubs[f.home === me ? f.away : f.home]!;
        return (
          <div key={`${f.day}${f.home}`} className="list-row">
            <span className="num small muted">{fmtDate(world.season, f.day)}</span>
            <span className="row"><Crest club={opp} size={16} /> {opp.name}</span>
            <span className="tag dim">{f.cup ? fxLabel(f, '') : t(f.home === me ? 'desk.home' : 'desk.away')}</span>
          </div>
        );
      })}
      {!list.length && <span className="muted small">{t('desk.noMatch')}</span>}
    </div>
  );
}

function Board({ world, onNav }: DeskCtx) {
  const tr = world.manager.board.trust;
  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2><BriefcaseBusiness size={18} /> {t('desk.w.board')}</h2>
        <button className="link small" onClick={() => onNav('board')}>{t('nav.board')} ›</button>
      </div>
      {(['board', 'fans', 'squad'] as const).map((k) => (
        <div key={k} className="stack" style={{ gap: 4 }}>
          <span className="row" style={{ justifyContent: 'space-between' }}><span className="small">{t(`board.trust.${k}`)}</span><b className="num small">{Math.round(tr[k])}%</b></span>
          <div className="meter"><i className={tr[k] < BOARD.warnAt ? 'bad' : tr[k] < 50 ? 'warn' : ''} style={{ width: `${tr[k]}%` }} /></div>
        </div>
      ))}
      <span className="caps">{t('board.sackLine', { n: BOARD.sackAt })}</span>
    </div>
  );
}

export const WIDGETS: Record<WidgetId, { cat: Category; sizes: Size[]; view: ComponentType<DeskCtx> }> = {
  next: { cat: 'matches', sizes: ['M', 'L'], view: NextMatch },
  next5: { cat: 'matches', sizes: ['S', 'M'], view: Next5 },
  morale: { cat: 'squad', sizes: ['S'], view: KpiMorale },
  injuries: { cat: 'squad', sizes: ['S', 'M'], view: Injuries },
  contracts: { cat: 'squad', sizes: ['S', 'M'], view: Contracts },
  pos: { cat: 'comps', sizes: ['S'], view: KpiPos },
  form: { cat: 'comps', sizes: ['S'], view: KpiForm },
  table: { cat: 'comps', sizes: ['S', 'M'], view: Table },
  history: { cat: 'comps', sizes: ['S', 'M'], view: History },
  cash: { cat: 'club', sizes: ['S'], view: KpiCash },
  board: { cat: 'club', sizes: ['S', 'M'], view: Board },
  offers: { cat: 'market', sizes: ['M', 'L'], view: Offers },
  news: { cat: 'news', sizes: ['M', 'L'], view: News },
  stories: { cat: 'news', sizes: ['M', 'L'], view: DeskStories },
  guide: { cat: 'guide', sizes: ['M', 'L'], view: Guide },
};
export const CATEGORIES: Category[] = ['matches', 'squad', 'comps', 'club', 'market', 'news', 'guide'];

const it = (id: WidgetId, size: Size): DeskItem => ({ id, size });
export const PRESETS: Record<Preset, DeskItem[]> = {
  coach: [it('pos', 'S'), it('form', 'S'), it('cash', 'S'), it('morale', 'S'), it('next', 'M'), it('table', 'M'), it('offers', 'L'),
    it('guide', 'M'), it('next5', 'S'), it('injuries', 'S'), it('stories', 'M'), it('news', 'M'), it('history', 'S')],
  director: [it('cash', 'S'), it('pos', 'S'), it('morale', 'S'), it('board', 'S'), it('offers', 'L'), it('contracts', 'M'), it('injuries', 'M'),
    it('news', 'M'), it('table', 'M')],
  essential: [it('next', 'M'), it('table', 'M'), it('news', 'L')],
};
