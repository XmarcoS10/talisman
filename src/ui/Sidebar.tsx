// Barra laterale alla Openfoot: marchio e pulsante per ridurla, l'allenatore col suo club, le voci a sezioni
// (senza titolo le quotidiane, poi Club e Mondo), impostazioni e uscita in fondo.
import { useEffect, useReducer } from 'react';
import { ArrowLeftRight, BriefcaseBusiness, CalendarDays, ChartColumn, Dumbbell, GraduationCap, Landmark, LayoutDashboard, LogOut, Medal,
  Network, Newspaper, PanelLeftClose, PanelLeftOpen, Route, ScanSearch, Settings, User, Users, type LucideIcon } from 'lucide-react';
import type { WorldState } from '../engine/model.ts';
import { settings, updateSettings } from './settings.ts';
import { Crest } from './Crest.tsx';
import { t } from './i18n.ts';

export type NavName = 'desk' | 'stories' | 'squad' | 'tactics' | 'training' | 'dressing' | 'youth' | 'market' | 'scouts' | 'finance' | 'board' | 'tables' | 'fixtures' | 'records' | 'saves';

const GROUPS: [string, [NavName, LucideIcon][]][] = [
  ['', [['desk', LayoutDashboard], ['stories', Newspaper], ['fixtures', CalendarDays]]],
  ['club', [['squad', Users], ['tactics', Route], ['training', Dumbbell], ['dressing', Network], ['youth', GraduationCap],
    ['scouts', ScanSearch], ['finance', Landmark], ['market', ArrowLeftRight], ['board', BriefcaseBusiness]]],
  ['world', [['tables', ChartColumn], ['records', Medal]]],
];

interface Props { world: WorldState; active: string; onNav: (n: NavName) => void; onQuit: () => void }

export function Sidebar({ world, active, onNav, onQuit }: Props) {
  const club = world.clubs[world.manager.clubId]!;
  const [, refresh] = useReducer((x: number) => x + 1, 0);
  const rail = settings().rail;
  useEffect(() => { document.documentElement.classList.toggle('rail', rail); }, [rail]); // la griglia della cornice segue la larghezza
  const item = (n: NavName, Icon: LucideIcon, label = t(`nav.${n}`)) => (
    <button key={n} className={active === n ? 'active' : ''} onClick={() => onNav(n)} title={label} aria-label={label}><Icon size={19} /><span className="lbl">{label}</span></button>
  );
  const toggle = t(rail ? 'nav.expand' : 'nav.collapse');
  return (
    <nav className={`sidebar ${rail ? 'rail' : ''}`}>
      <div className="side-top">
        <div className="side-brand"><img src="icon-64.png" alt="" width={32} height={32} /><div className="lbl">TFM<b>27 MANAGER</b></div></div>
        <button className="side-toggle" onClick={() => { updateSettings({ rail: !rail }); refresh(); }} title={toggle} aria-label={toggle}>
          {rail ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}</button>
        <button className="side-manager" onClick={() => onNav('records')} title={t('nav.manager')} aria-label={t('nav.manager')}>
          {rail ? <User size={19} /> : <>
            <span className="caps">{t('nav.manager')}</span>
            <b>{world.manager.name}</b>
            <span className="side-club"><Crest club={club} size={16} /> {club.name}</span>
          </>}
        </button>
      </div>
      <div className="side-nav">
        {GROUPS.map(([g, items], i) => (
          <div key={g || 'main'} className="side-group">
            {i > 0 && <hr />}
            {g && <div className="caps lbl">{t(`navGroup.${g}`)}</div>}
            {items.map(([n, I]) => item(n, I))}
          </div>
        ))}
      </div>
      <div className="side-bottom">
        {item('saves', Settings)}
        <button className="side-exit" onClick={onQuit} title={t('nav.saveQuit')} aria-label={t('nav.saveQuit')}><LogOut size={19} /><span className="lbl">{t('nav.saveQuit')}</span></button>
      </div>
    </nav>
  );
}
