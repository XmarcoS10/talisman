// Barra laterale: club in testa, voci a gruppi con icona, impostazioni e uscita in fondo.
import { useEffect, useReducer } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { settings, updateSettings } from './settings.ts';
import { ArrowLeftRight, BriefcaseBusiness, CalendarDays, ChartColumn, Dumbbell, GraduationCap, Landmark, LayoutDashboard, LogOut,
  Network, Newspaper, Route, ScanSearch, Settings, Users, type LucideIcon } from 'lucide-react';
import type { WorldState } from '../engine/model.ts';
import { Crest } from './Crest.tsx';
import { fmtSeason, t } from './i18n.ts';

export type NavName = 'desk' | 'stories' | 'squad' | 'tactics' | 'training' | 'dressing' | 'youth' | 'market' | 'scouts' | 'finance' | 'board' | 'tables' | 'fixtures' | 'saves';

const GROUPS: [string, [NavName, LucideIcon][]][] = [
  ['main', [['desk', LayoutDashboard], ['stories', Newspaper], ['squad', Users], ['tactics', Route]]],
  ['manage', [['training', Dumbbell], ['dressing', Network], ['youth', GraduationCap]]],
  ['market', [['market', ArrowLeftRight], ['scouts', ScanSearch], ['finance', Landmark], ['board', BriefcaseBusiness]]],
  ['comps', [['tables', ChartColumn], ['fixtures', CalendarDays]]],
];

interface Props { world: WorldState; active: string; onNav: (n: NavName) => void; onQuit: () => void }

export function Sidebar({ world, active, onNav, onQuit }: Props) {
  const club = world.clubs[world.manager.clubId]!;
  const [, refresh] = useReducer((x: number) => x + 1, 0);
  const rail = settings().rail;
  useEffect(() => { document.documentElement.classList.toggle('rail', rail); }, [rail]); // la griglia della cornice segue la larghezza
  const item = (n: NavName, Icon: LucideIcon) => (
    <button key={n} className={active === n ? 'active' : ''} onClick={() => onNav(n)} title={t(`nav.${n}`)}><Icon size={17} /><span className="lbl">{t(`nav.${n}`)}</span></button>
  );
  return (
    <nav className={`sidebar ${rail ? 'rail' : ''}`}>
      <div className="side-club">
        <Crest club={club} size={34} />
        <div><b>{club.name}</b><div className="caps">{world.competitions[club.compId]!.name} · {fmtSeason(world.season)}</div></div>
      </div>
      {GROUPS.map(([g, items]) => (
        <div key={g} className="side-group"><div className="caps">{t(`navGroup.${g}`)}</div>{items.map(([n, I]) => item(n, I))}</div>
      ))}
      <div className="side-bottom">
        {item('saves', Settings)}
        <button onClick={() => { updateSettings({ rail: !rail }); refresh(); }} title={t(rail ? 'nav.expand' : 'nav.collapse')}>
          {rail ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}<span className="lbl">{t(rail ? 'nav.expand' : 'nav.collapse')}</span></button>
        <button onClick={onQuit} title={t('nav.saveQuit')}><LogOut size={17} /><span className="lbl">{t('nav.saveQuit')}</span></button>
      </div>
    </nav>
  );
}
