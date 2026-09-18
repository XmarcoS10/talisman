import { useCallback, useEffect, useReducer, useState } from 'react';
import type { Fixture, WorldState } from '../engine/model.ts';
import { deserialize, serialize } from '../engine/save.ts';
import { advance, endSeason, isSeasonOver, standings, type SeasonSummary } from '../engine/world.ts';
import { Crest } from './Crest.tsx';
import { fmtDate, fmtMoney, fmtSeason, t } from './i18n.ts';
import { Desk } from './screens/Desk.tsx';
import { Fixtures } from './screens/Fixtures.tsx';
import { MatchModal, SeasonModal } from './screens/Modals.tsx';
import { PlayerView } from './screens/PlayerView.tsx';
import { Squad } from './screens/Squad.tsx';
import { Start } from './screens/Start.tsx';
import { Tables } from './screens/Tables.tsx';

const SAVE_KEY = 'talisman-save';
// ponytail: un solo salvataggio in localStorage; file .tal multipli via preload Electron quando servono più carriere
const loadSave = () => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? deserialize(raw) : null;
  } catch {
    return null;
  }
};
const writeSave = (w: WorldState) => {
  try {
    localStorage.setItem(SAVE_KEY, serialize(w));
  } catch (e) {
    console.error('Salvataggio fallito', e);
  }
};

type Screen = { name: 'desk' | 'squad' | 'tables' | 'fixtures' } | { name: 'player'; id: number; back: Screen };
type Modal = { kind: 'match'; fx: Fixture; others: Fixture[] } | { kind: 'season'; summary: SeasonSummary; myPos: number } | null;
const NAV = ['desk', 'squad', 'tables', 'fixtures'] as const;

export function App() {
  const [world, setWorld] = useState<WorldState | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'desk' });
  const [modal, setModal] = useState<Modal>(null);
  const [, rerender] = useReducer((x: number) => x + 1, 0); // il motore muta il mondo sul posto

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
    writeSave(world);
    rerender();
  }, [world, modal]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Spazio = continua, ovunque tranne nei campi di testo (chiude anche il risultato aperto)
      if (e.key !== ' ' || e.target instanceof HTMLInputElement) return;
      e.preventDefault();
      if (modal) setModal(null);
      else onAdvance();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAdvance, modal]);

  if (!world) {
    return (
      <Start
        hasSave={localStorage.getItem(SAVE_KEY) !== null}
        onContinue={() => setWorld(loadSave())}
        onStart={(w) => { writeSave(w); setWorld(w); }}
      />
    );
  }

  const club = world.clubs[world.manager.clubId]!;
  const openPlayer = (id: number) => setScreen({ name: 'player', id, back: screen });

  return (
    <div className="shell">
      <header className="topbar">
        <div className="club"><Crest club={club} size={34} />{club.name}</div>
        <span className="muted">{world.competitions[club.compId]!.name} · {fmtSeason(world.season)}</span>
        <div className="spacer" />
        <div className="info">
          <span className="num">{fmtDate(world.season, world.day)}</span>
          <span className="muted">{t('top.balance')} <span className="num">{fmtMoney(club.balance)}</span></span>
        </div>
        <button className="btn primary" onClick={onAdvance} title="Spazio">
          {t(isSeasonOver(world) ? 'top.endSeason' : 'top.advance')} ▸
        </button>
      </header>

      <nav className="sidebar">
        {NAV.map((n) => (
          <button key={n} className={screen.name === n ? 'active' : ''} onClick={() => setScreen({ name: n })}>{t(`nav.${n}`)}</button>
        ))}
        <button className="bottom" onClick={() => { writeSave(world); setWorld(null); setScreen({ name: 'desk' }); }}>{t('nav.saveQuit')}</button>
      </nav>

      <main className="content">
        {screen.name === 'desk' && <Desk world={world} />}
        {screen.name === 'squad' && <Squad world={world} clubId={club.id} onPlayer={openPlayer} />}
        {screen.name === 'tables' && <Tables world={world} clubId={club.id} onPlayer={openPlayer} />}
        {screen.name === 'fixtures' && <Fixtures world={world} clubId={club.id} />}
        {screen.name === 'player' && <PlayerView world={world} playerId={screen.id} onBack={() => setScreen(screen.back)} />}
      </main>

      {modal?.kind === 'match' && <MatchModal world={world} fx={modal.fx} others={modal.others} onClose={() => setModal(null)} />}
      {modal?.kind === 'season' && <SeasonModal world={world} summary={modal.summary} myPos={modal.myPos} onClose={() => setModal(null)} />}
    </div>
  );
}
