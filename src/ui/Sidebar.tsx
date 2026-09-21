// Barra laterale: club in testa, voci a gruppi con icona, impostazioni e uscita in fondo.
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
  const item = (n: NavName, Icon: LucideIcon) => (
    <button key={n} className={active === n ? 'active' : ''} onClick={() => onNav(n)}><Icon size={17} />{t(`nav.${n}`)}</button>
  );
  return (
    <nav className="sidebar">
      <div className="side-club">
        <Crest club={club} size={34} />
        <div><b>{club.name}</b><div className="caps">{world.competitions[club.compId]!.name} · {fmtSeason(world.season)}</div></div>
      </div>
      {GROUPS.map(([g, items]) => (
        <div key={g} className="side-group"><div className="caps">{t(`navGroup.${g}`)}</div>{items.map(([n, I]) => item(n, I))}</div>
      ))}
      <div className="side-bottom">
        {item('saves', Settings)}
        <button onClick={onQuit}><LogOut size={17} />{t('nav.saveQuit')}</button>
      </div>
    </nav>
  );
}
