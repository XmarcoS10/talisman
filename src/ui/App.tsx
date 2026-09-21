import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { Fixture, NewsItem, WorldState } from '../engine/model.ts';
import { advance, beginMatchDay, endSeason, fixturesOn, isSeasonOver, nextMatchDay, standings, type LiveDay, type SeasonSummary } from '../engine/world.ts';
import { Banknote, CalendarDays, Play, User } from 'lucide-react';
import { HINTS, Hint } from './Hint.tsx';
import { markVisited, settings } from './settings.ts';
import { Alerts, critical } from './Alerts.tsx';
import { playUi } from './audio.ts';
import { fmtDate, fmtMoney, t } from './i18n.ts';
import { BoardView } from './screens/BoardView.tsx';
import { ClubView } from './screens/ClubView.tsx';
import { Desk } from './screens/Desk.tsx';
import { Dressing } from './screens/Dressing.tsx';
import { Fixtures } from './screens/Fixtures.tsx';
import { Live } from './screens/Live.tsx';
import { MatchModal } from './screens/MatchReport.tsx';
import { SeasonModal } from './screens/Modals.tsx';
import { PlayerView } from './screens/PlayerView.tsx';
import { Finance } from './screens/Finance.tsx';
import { Market } from './screens/Market.tsx';
import { Saves } from './screens/Saves.tsx';
import { Scouts } from './screens/Scouts.tsx';
import { Squad } from './screens/Squad.tsx';
import { Stories } from './screens/Stories.tsx';
import { Start } from './screens/Start.tsx';
import { Tables } from './screens/Tables.tsx';
import { Tactics } from './screens/Tactics.tsx';
import { Training } from './screens/Training.tsx';
import { Youth } from './screens/Youth.tsx';
import { Search } from './Search.tsx';
import { Sidebar, type NavName } from './Sidebar.tsx';
import { currentSlot, saveTo, startClock } from './storage.ts';

type Screen =
  | { name: NavName }
  | { name: 'player'; id: number; back: Screen }
  | { name: 'club'; id: number; back: Screen };
type Modal = { kind: 'match'; fx: Fixture; others: Fixture[] } | { kind: 'season'; summary: SeasonSummary; myPos: number } | null;

// l'esito dell'ultimo salvataggio: se fallisce lo si dice, e non si esce perdendo la partita
let lastSaveOk = true;
let pending: ReturnType<typeof setTimeout> | null = null;
const autosave = (w: WorldState) => {
  if (pending) { clearTimeout(pending); pending = null; }
  lastSaveOk = saveTo(currentSlot(), w);
  if (!lastSaveOk) console.error('Salvataggio fallito');
  return lastSaveOk;
};
/**
 * le piccole modifiche (un titolare, una seduta, un incarico) non salvano subito: con un mondo grande ogni salvataggio
 * costa più di un secondo. Si salva un attimo dopo l'ultima modifica, e comunque subito a ogni avanzamento e all'uscita.
 */
let pendingWorld: WorldState | null = null;
const saveSoon = (w: WorldState) => {
  if (pending) clearTimeout(pending);
  pendingWorld = w;
  pending = setTimeout(() => { pending = null; autosave(w); }, 1500);
};
// se la finestra si chiude prima del salvataggio differito, si salva adesso
window.addEventListener('beforeunload', () => { if (pending && pendingWorld) autosave(pendingWorld); });

export function App() {
  const [world, setWorld] = useState<WorldState | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'desk' });
  useEffect(() => { markVisited(screen.name); }, [screen.name]);
  // un clic leggero sui pulsanti, col volume dell'interfaccia
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if ((e.target as HTMLElement).closest('button')) playUi('click'); }; // target è sempre un elemento nei clic
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  const [modal, setModal] = useState<Modal>(null);
  const [liveDay, setLiveDay] = useState<LiveDay | null>(null);
  const [alerts, setAlerts] = useState<NewsItem[]>([]);
  const [, rerender] = useReducer((x: number) => x + 1, 0); // il motore muta il mondo sul posto
  const searchRef = useRef<HTMLInputElement>(null);

  const onAdvance = useCallback(() => {
    if (!world || modal) return;
    const me = world.manager.clubId;
    const seen = world.news.length;
    if (isSeasonOver(world)) {
      const comp = world.competitions[world.clubs[me]!.compId]!;
      const myPos = standings(world, comp).findIndex((r) => r.clubId === me) + 1;
      setModal({ kind: 'season', summary: endSeason(world), myPos });
    } else {
      const played = advance(world);
      const fx = played.find((f) => f.home === me || f.away === me);
      if (fx) {
        markVisited('live');
        const others = played.filter((f) => (fx.cup ? f.cup : !f.cup && world.clubs[f.home]!.compId === world.clubs[me]!.compId));
        setModal({ kind: 'match', fx, others });
      }
    }
    if (settings().pauseNews) setAlerts(critical(world.news.slice(seen)));
    if (settings().autosave) autosave(world);
    rerender();
  }, [world, modal]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
      // "/" = cerca giocatori e club
      if (e.key === '/' && !typing && world) { e.preventDefault(); searchRef.current?.focus(); return; }
      // Spazio = continua, ovunque tranne nei campi (chiude anche il risultato aperto)
      if (e.key !== ' ' || typing || liveDay) return;
      e.preventDefault();
      if (modal) setModal(null);
      else onAdvance();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAdvance, modal, world, liveDay]);

  const open = (w: WorldState) => { setWorld(w); setScreen({ name: 'desk' }); setModal(null); setLiveDay(null); };
  if (!world) return <Start onLoad={open} onStart={(w) => { startClock(); autosave(w); open(w); }} />;
  if (liveDay) {
    return (
      <Live world={world} live={liveDay} onFinish={(played) => {
        setLiveDay(null);
        markVisited('live'); // prima partita guidata: fatta
        const others = played.slice(1).filter((f) => (played[0]!.cup ? f.cup : !f.cup && world.clubs[f.home]!.compId === world.clubs[world.manager.clubId]!.compId));
        setModal({ kind: 'match', fx: played[0]!, others });
        autosave(world);
        rerender();
      }} />
    );
  }

  const club = world.clubs[world.manager.clubId]!;
  const openPlayer = (id: number) => setScreen({ name: 'player', id, back: screen });
  const openClub = (id: number) => setScreen(id === club.id ? { name: 'squad' } : { name: 'club', id, back: screen });
  const changed = () => { saveSoon(world); rerender(); };
  // gioca il club dell'utente nel prossimo turno? allora si può seguire dal vivo
  const day = nextMatchDay(world);
  const myMatchDay = day !== null && fixturesOn(world, day).some((f) => !f.result && (f.home === club.id || f.away === club.id));

  return (
    <div className="shell">
      {!lastSaveOk && <div className="save-failed">{t('save.failed')}</div>}
      <header className="topbar">
        <div className="brand"><img src="icon-64.png" alt="" width={30} height={30} /><div>TFM <b>27</b><small>MANAGER</small></div></div>
        <Search ref={searchRef} world={world} onPlayer={openPlayer} onClub={openClub} />
        <div className="spacer" />
        <span className="pill num"><CalendarDays size={15} />{fmtDate(world.season, world.day)}</span>
        <span className="pill num" title={t('top.balance')}><Banknote size={15} />{fmtMoney(club.balance)}</span>
        {myMatchDay && <button className="btn" onClick={() => setLiveDay(beginMatchDay(world))}><Play size={14} /> {t('top.watch')}</button>}
        <button className="btn primary big" onClick={onAdvance} title={t('top.advanceHint')}>
          {t(isSeasonOver(world) ? 'top.endSeason' : 'top.advance')} ▸
        </button>
        <span className="avatar" title={world.manager.name}><User size={17} /></span>
      </header>

      <Sidebar world={world} active={screen.name} onNav={(n) => setScreen({ name: n })}
        onQuit={() => { if (autosave(world)) setWorld(null); else rerender(); }} />

      <main className="content">
        <Alerts items={alerts} onClose={() => setAlerts([])} />
        {(HINTS as readonly string[]).includes(screen.name) && <Hint key={screen.name} id={screen.name as (typeof HINTS)[number]} />}
        {screen.name === 'desk' && <Desk world={world} onNav={(n) => setScreen({ name: n })} />}
        {screen.name === 'stories' && <Stories world={world} onChange={changed} />}
        {screen.name === 'squad' && <Squad world={world} clubId={club.id} onPlayer={openPlayer} />}
        {screen.name === 'tactics' && <Tactics world={world} onChange={changed} onPlayer={openPlayer} />}
        {screen.name === 'training' && <Training world={world} onChange={changed} onPlayer={openPlayer} />}
        {screen.name === 'dressing' && <Dressing world={world} onChange={changed} onPlayer={openPlayer} />}
        {screen.name === 'youth' && <Youth world={world} onPlayer={openPlayer} onChange={changed} />}
        {screen.name === 'market' && <Market world={world} onPlayer={openPlayer} />}
        {screen.name === 'scouts' && <Scouts world={world} onChange={changed} onPlayer={openPlayer} />}
        {screen.name === 'finance' && <Finance world={world} />}
        {screen.name === 'board' && <BoardView world={world} onChange={changed} />}
        {screen.name === 'tables' && <Tables world={world} clubId={club.id} onPlayer={openPlayer} onClub={openClub} />}
        {screen.name === 'fixtures' && <Fixtures world={world} clubId={club.id} onPlayer={openPlayer} />}
        {screen.name === 'saves' && <Saves world={world} onLoad={open} />}
        {screen.name === 'player' && <PlayerView world={world} playerId={screen.id} onBack={() => setScreen(screen.back)} onClub={openClub} onChange={changed} onPlayer={openPlayer} />}
        {screen.name === 'club' && <ClubView world={world} clubId={screen.id} onPlayer={openPlayer} onBack={() => setScreen(screen.back)} />}
      </main>

      {modal?.kind === 'match' && <MatchModal world={world} fx={modal.fx} others={modal.others} onClose={() => setModal(null)} />}
      {modal?.kind === 'season' && <SeasonModal world={world} summary={modal.summary} myPos={modal.myPos} onClose={() => setModal(null)} onQuit={() => { setModal(null); setWorld(null); }} />}
    </div>
  );
}
