import { useMemo, useState } from 'react';
import type { WorldState } from '../../engine/model.ts';
import { newWorld } from '../../engine/world.ts';
import { Crest } from '../Crest.tsx';
import { fmtDate, fmtSeason, t } from '../i18n.ts';
import { SLOTS, currentSlot, loadFrom, setCurrentSlot, slotInfo, type Slot } from '../storage.ts';

/** obiettivo stagionale della dirigenza in base alla reputazione nel proprio campionato */
export function boardGoal(world: WorldState, clubId: number): string {
  const club = world.clubs[clubId]!;
  const comp = world.competitions[club.compId]!;
  const rank = [...comp.clubIds].sort((a, b) => world.clubs[b]!.reputation - world.clubs[a]!.reputation).indexOf(clubId);
  if (comp.level > 1) return t(rank < 5 ? 'start.expect.5' : 'start.expect.6');
  return t(rank < 3 ? 'start.expect.1' : rank < 7 ? 'start.expect.2' : rank < 14 ? 'start.expect.3' : 'start.expect.4');
}

export function Start({ onLoad, onStart }: { onLoad: (w: WorldState) => void; onStart: (w: WorldState) => void }) {
  const saves = SLOTS.map(slotInfo).filter((s) => s !== null);
  // il seed viene dall'orologio solo qui, nella UI: il motore resta deterministico
  const world = useMemo(() => newWorld(Date.now() >>> 0), []);
  const [name, setName] = useState('');
  const [clubId, setClubId] = useState<number | null>(null);
  const comps = Object.values(world.competitions).sort((a, b) => a.level - b.level);

  const go = () => {
    if (clubId === null || !name.trim()) return;
    Object.assign(world.manager, { name: name.trim(), clubId });
    // la nuova carriera va nel primo slot libero (se sono pieni, in quello in uso)
    setCurrentSlot(SLOTS.find((s) => !slotInfo(s)) ?? currentSlot());
    onStart(world);
  };
  const load = (s: Slot) => {
    const w = loadFrom(s);
    if (w) { setCurrentSlot(s); onLoad(w); }
  };

  return (
    <div className="start">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>{t('app.title')}</h1>
          <div className="muted">{t('app.tagline')}</div>
        </div>
      </div>

      {saves.length > 0 && (
        <div className="panel">
          <h2>{t('start.continue')}</h2>
          {saves.map((s) => (
            <button key={s.slot} className="club-card" onClick={() => load(s.slot)}>
              <span className="num muted">{t('saves.slot', { slot: s.slot })}</span>
              <div><b>{s.clubName}</b> · {s.manager}<div className="muted">{fmtSeason(s.season)} · {fmtDate(s.season, s.day)}</div></div>
            </button>
          ))}
        </div>
      )}

      <div className="panel">
        <h2>{t('start.new')}</h2>
        <label className="row">
          <span style={{ width: 120 }}>{t('start.managerName')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('start.managerPlaceholder')} maxLength={40} />
        </label>
      </div>

      {comps.map((comp) => (
        <div key={comp.id} className="panel">
          <h2>{t('start.chooseClub')} · {comp.name}</h2>
          <div className="clubs">
            {[...comp.clubIds].sort((a, b) => world.clubs[b]!.reputation - world.clubs[a]!.reputation).map((id) => {
              const c = world.clubs[id]!;
              return (
                <button key={id} className={`club-card ${clubId === id ? 'selected' : ''}`} onClick={() => setClubId(id)}>
                  <Crest club={c} size={36} />
                  <div>
                    <div><b>{c.name}</b></div>
                    <div className="muted">{t('start.reputation')} {c.reputation} · {boardGoal(world, id)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="row" style={{ position: 'sticky', bottom: 0, padding: 'var(--s-3) 0', background: 'var(--bg-0)' }}>
        <button className="btn primary" disabled={clubId === null || !name.trim()} onClick={go}>{t('start.go')}</button>
        {clubId !== null && <span className="muted">{world.clubs[clubId]!.name}</span>}
      </div>
    </div>
  );
}
