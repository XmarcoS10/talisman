import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { Fixture, WorldState } from '../engine/model.ts';
import { advance, endSeason, isSeasonOver, standings, type SeasonSummary } from '../engine/world.ts';
import { Crest } from './Crest.tsx';
import { fmtDate, fmtMoney, fmtSeason, t } from './i18n.ts';
import { ClubView } from './screens/ClubView.tsx';
import { Desk } from './screens/Desk.tsx';
import { Dressing } from './screens/Dressing.tsx';
import { Fixtures } from './screens/Fixtures.tsx';
import { MatchModal } from './screens/MatchReport.tsx';
import { SeasonModal } from './screens/Modals.tsx';
import { PlayerView } from './screens/PlayerView.tsx';
import { Saves } from './screens/Saves.tsx';
import { Squad } from './screens/Squad.tsx';
import { Start } from './screens/Start.tsx';
import { Tables } from './screens/Tables.tsx';
import { Tactics } from './screens/Tactics.tsx';
import { Training } from './screens/Training.tsx';
import { Search } from './Search.tsx';
import { currentSlot, saveTo } from './storage.ts';

type Screen =
  | { name: 'desk' | 'squad' | 'tactics' | 'training' | 'dressing' | 'tables' | 'fixtures' | 'saves' }
  | { name: 'player'; id: number; back: Screen }
  | { name: 'club'; id: number; back: Screen };
type Modal = { kind: 'match'; fx: Fixture; others: Fixture[] } | { kind: 'season'; summary: SeasonSummary; myPos: number } | null;
const NAV = ['desk', 'squad', 'tactics', 'training', 'dressing', 'tables', 'fixtures', 'saves'] as const;

const autosave = (w: WorldState) => { if (!saveTo(currentSlot(), w)) console.error('Salvataggio fallito'); };

export function App() {
  const [world, setWorld] = useState<WorldState | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'desk' });
  const [modal, setModal] = useState<Modal>(null);
  const [, rerender] = useReducer((x: number) => x + 1, 0); // il motore muta il mondo sul posto
  const searchRef = useRef<HTMLInputElement>(null);

  const onAdvance = useCallback(() => {
    if (!world || modal) return;
    const me = world.manager.clubId;
    if (isSeasonOver(world)) {
      const comp = world.competitions[world.clubs[me]!.compId]!;
      const myPos = standings(world, comp).findIndex((r) => r.clubId === me) + 1;
      setModal({ kind: 'season', summary: endSeason(world), myPos });
    } else {
      const played = advance(world);
      const fx = played.find((f) => f.home === me || f.away === me);
      if (fx) {
        const others = played.filter((f) => world.clubs[f.home]!.compId === world.clubs[me]!.compId);
        setModal({ kind: 'match', fx, others });
      }
    }
    autosave(world);
    rerender();
  }, [world, modal]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
      // "/" = cerca giocatori e club
      if (e.key === '/' && !typing && world) { e.preventDefault(); searchRef.current?.focus(); return; }
      // Spazio = continua, ovunque tranne nei campi (chiude anche il risultato aperto)
      if (e.key !== ' ' || typing) return;
      e.preventDefault();
      if (modal) setModal(null);
      else onAdvance();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAdvance, modal, world]);

  const open = (w: WorldState) => { setWorld(w); setScreen({ name: 'desk' }); setModal(null); };
  if (!world) return <Start onLoad={open} onStart={(w) => { autosave(w); open(w); }} />;

  const club = world.clubs[world.manager.clubId]!;
  const openPlayer = (id: number) => setScreen({ name: 'player', id, back: screen });
  const openClub = (id: number) => setScreen(id === club.id ? { name: 'squad' } : { name: 'club', id, back: screen });
  const changed = () => { autosave(world); rerender(); };

  return (
    <div className="shell">
      <header className="topbar">
        <div className="club"><Crest club={club} size={34} />{club.name}</div>
        <span className="muted">{world.competitions[club.compId]!.name} · {fmtSeason(world.season)}</span>
        <div className="spacer" />
        <Search ref={searchRef} world={world} onPlayer={openPlayer} onClub={openClub} />
        <div className="info">
          <span className="num">{fmtDate(world.season, world.day)}</span>
          <span className="muted">{t('top.balance')} <span className="num">{fmtMoney(club.balance)}</span></span>
        </div>
        <button className="btn primary" onClick={onAdvance} title={t('top.advanceHint')}>
          {t(isSeasonOver(world) ? 'top.endSeason' : 'top.advance')} ▸
        </button>
      </header>

      <nav className="sidebar">
        {NAV.map((n) => (
          <button key={n} className={screen.name === n ? 'active' : ''} onClick={() => setScreen({ name: n })}>{t(`nav.${n}`)}</button>
        ))}
        <button className="bottom" onClick={() => { autosave(world); setWorld(null); }}>{t('nav.saveQuit')}</button>
      </nav>

      <main className="content">
        {screen.name === 'desk' && <Desk world={world} />}
        {screen.name === 'squad' && <Squad world={world} clubId={club.id} onPlayer={openPlayer} />}
        {screen.name === 'tactics' && <Tactics world={world} onChange={changed} onPlayer={openPlayer} />}
        {screen.name === 'training' && <Training world={world} onChange={changed} onPlayer={openPlayer} />}
        {screen.name === 'dressing' && <Dressing world={world} onChange={changed} onPlayer={openPlayer} />}
        {screen.name === 'tables' && <Tables world={world} clubId={club.id} onPlayer={openPlayer} onClub={openClub} />}
        {screen.name === 'fixtures' && <Fixtures world={world} clubId={club.id} />}
        {screen.name === 'saves' && <Saves world={world} onLoad={open} />}
        {screen.name === 'player' && <PlayerView world={world} playerId={screen.id} onBack={() => setScreen(screen.back)} onClub={openClub} onChange={changed} onPlayer={openPlayer} />}
        {screen.name === 'club' && <ClubView world={world} clubId={screen.id} onPlayer={openPlayer} onBack={() => setScreen(screen.back)} />}
      </main>

      {modal?.kind === 'match' && <MatchModal world={world} fx={modal.fx} others={modal.others} onClose={() => setModal(null)} />}
      {modal?.kind === 'season' && <SeasonModal world={world} summary={modal.summary} myPos={modal.myPos} onClose={() => setModal(null)} />}
    </div>
  );
}
