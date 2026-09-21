import { useMemo, useState } from 'react';
import type { WorldState } from '../../engine/model.ts';
import { newWorld } from '../../engine/world.ts';
import { Crest } from '../Crest.tsx';
import { fmtDate, fmtSeason, t } from '../i18n.ts';
import { SLOTS, loadFrom, setCurrentSlot, slotInfo, type Slot } from '../storage.ts';
import { ClubPicker } from './ClubPicker.tsx';

/** obiettivo stagionale della dirigenza in base alla reputazione nel proprio campionato */
export function boardGoal(world: WorldState, clubId: number): string {
  const club = world.clubs[clubId]!;
  const comp = world.competitions[club.compId]!;
  const rank = [...comp.clubIds].sort((a, b) => world.clubs[b]!.reputation - world.clubs[a]!.reputation).indexOf(clubId);
  if (comp.level > 1) return t(rank < 5 ? 'start.expect.5' : 'start.expect.6');
  return t(rank < 3 ? 'start.expect.1' : rank < 7 ? 'start.expect.2' : rank < 14 ? 'start.expect.3' : 'start.expect.4');
}

export function Start({ onLoad, onStart }: { onLoad: (w: WorldState) => void; onStart: (w: WorldState) => void }) {
  // una lettura sola degli slot per tutta la schermata (prima: sei a ogni ridisegno)
  const infos = useMemo(() => SLOTS.map(slotInfo), []);
  const saves = infos.filter((s) => s !== null);
  // il seed viene dall'orologio solo qui, nella UI: il motore resta deterministico
  const world = useMemo(() => newWorld(Date.now() >>> 0), []);
  const [name, setName] = useState('');
  const [clubId, setClubId] = useState<number | null>(null);
  // la nuova carriera va nel primo slot libero; se sono tutti pieni lo scegli tu, e sai che cosa sovrascrivi
  const free = SLOTS.find((_, i) => !infos[i]) ?? null;
  const [slot, setSlot] = useState<Slot | null>(free);

  const go = () => {
    if (clubId === null || !name.trim() || slot === null) return;
    Object.assign(world.manager, { name: name.trim(), clubId });
    setCurrentSlot(slot);
    onStart(world);
  };
  const load = (s: Slot) => {
    const w = loadFrom(s);
    if (w) { setCurrentSlot(s); onLoad(w); }
  };

  return (
    <div className="start">
      <div className="row" style={{ gap: 'var(--s-5)' }}>
        <img src="logo.webp" alt="" width={120} height={140} />
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

      <ClubPicker world={world} selected={clubId} onPick={setClubId} />

      {free === null && (
        <div className="panel">
          <h3>{t('start.slotFull')}</h3>
          <div className="row wrap">
            {saves.map((sv) => (
              <button key={sv.slot} className={`btn ${slot === sv.slot ? 'primary' : ''}`} onClick={() => setSlot(sv.slot)}>
                {t('start.overwrite', { slot: sv.slot, club: sv.clubName })}
              </button>
            ))}
          </div>
          <div className="muted">{t('start.slotHint')}</div>
        </div>
      )}

      <div className="row" style={{ position: 'sticky', bottom: 0, padding: 'var(--s-3) 0', background: 'var(--bg-0)' }}>
        <button className="btn primary" disabled={clubId === null || !name.trim() || slot === null} onClick={go}>{t('start.go')}</button>
        {clubId !== null && <span className="muted">{world.clubs[clubId]!.name}</span>}
      </div>
    </div>
  );
}
