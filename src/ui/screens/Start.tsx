// Schermata d'avvio: menu (continua o nuova carriera) e la nuova carriera in due passi — club, poi dossier e firma.
import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Play, Plus } from 'lucide-react';
import type { ManagerStyle, WorldState } from '../../engine/model.ts';
import { newWorld } from '../../engine/world.ts';
import { preseason } from '../../engine/friendlies.ts';
import { fmtDate, fmtMoney, fmtSeason, t } from '../i18n.ts';
import { SLOTS, loadFrom, setCurrentSlot, slotInfo, type Slot } from '../storage.ts';
import { ClubDossier } from './ClubDossier.tsx';
import { ClubPicker, code } from './ClubPicker.tsx';

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
  const [mode, setMode] = useState<'menu' | 'club' | 'dossier'>(saves.length ? 'menu' : 'club');
  // il seed viene dall'orologio solo qui, nella UI: il motore resta deterministico
  const world = useMemo(() => newWorld(Date.now() >>> 0), []);
  const [name, setName] = useState('');
  const [style, setStyle] = useState<ManagerStyle>('none');
  const [clubId, setClubId] = useState<number | null>(null);
  // la nuova carriera va nel primo slot libero; se sono tutti pieni lo scegli tu, e sai che cosa sovrascrivi
  const free = SLOTS.find((_, i) => !infos[i]) ?? null;
  const [slot, setSlot] = useState<Slot | null>(free);

  const load = (s: Slot) => {
    const w = loadFrom(s);
    if (w) { setCurrentSlot(s); onLoad(w); }
  };
  const go = () => {
    if (clubId === null || !name.trim() || slot === null) return;
    Object.assign(world.manager, { name: name.trim(), clubId, style });
    preseason(world);
    setCurrentSlot(slot);
    onStart(world);
  };

  if (mode === 'menu') return (
    <div className="start">
      <div className="row" style={{ gap: 'var(--s-5)' }}>
        <img src="logo.webp" alt="" width={120} height={140} />
        <div><h1>{t('app.title')}</h1><div className="muted">{t('app.tagline')}</div></div>
      </div>
      <div className="panel">
        <h2>{t('start.continue')}</h2>
        {saves.map((s) => (
          <button key={s.slot} className="club-card" onClick={() => load(s.slot)}>
            <span className="num muted">{t('saves.slot', { slot: s.slot })}</span>
            <div><b>{s.clubName}</b> · {s.manager}<div className="muted">{fmtSeason(s.season)} · {fmtDate(s.season, s.day)}</div></div>
            <Play size={16} className="pos-good" style={{ marginLeft: 'auto' }} />
          </button>
        ))}
      </div>
      <button className="btn primary big" style={{ alignSelf: 'flex-start' }} onClick={() => setMode('club')}><Plus size={16} /> {t('start.new')}</button>
    </div>
  );

  const club = clubId !== null ? world.clubs[clubId] : undefined;
  const slotPicker = free === null && (
    <div className="mini-card">
      <b>{t('start.slotFull')}</b>
      <div className="row wrap">
        {saves.map((sv) => (
          <button key={sv.slot} className={`btn ${slot === sv.slot ? 'primary' : ''}`} onClick={() => setSlot(sv.slot)}>{t('start.overwrite', { slot: sv.slot, club: sv.clubName })}</button>
        ))}
      </div>
      <span className="muted small">{t('start.slotHint')}</span>
    </div>
  );

  return (
    <div className="setup">
      <header className="setup-top">
        <div className="brand"><img src="icon-64.png" alt="" width={30} height={30} /><div>TFM <b>27</b><small>{t('start.setup')}</small></div></div>
        <span className="tag"><span className="live-dot" />{t('start.newWorld')}</span>
        <div className="seg-tabs">
          <button className={mode === 'club' ? 'active hot' : ''} onClick={() => setMode('club')}>1. {t('start.step1')}</button>
          <button className={mode === 'dossier' ? 'active hot' : ''} disabled={clubId === null} onClick={() => setMode('dossier')}>2. {t('start.step2')}</button>
        </div>
        <span className="spacer" />
        {saves.length > 0 && <button className="link" onClick={() => setMode('menu')}>{t('start.backMenu')}</button>}
      </header>

      <div className="setup-body">
        {mode === 'club' ? <>
          <div className="row wrap" style={{ justifyContent: 'space-between' }}>
            <div><span className="caps pos-good">{t('start.kicker', { s: fmtSeason(world.season) })}</span><h1 className="setup-title">{t('start.assign')}</h1></div>
            <span className="seg-tabs"><button className="active hot"><Check size={13} /> {t('start.step1')}</button><button disabled>{t('start.step2')}</button></span>
          </div>
          <ClubPicker world={world} selected={clubId} onPick={setClubId} />
        </> : club && <>
          <button className="link" onClick={() => setMode('club')}><ArrowLeft size={14} /> {t('start.backToClubs')}</button>
          <ClubDossier world={world} clubId={club.id} name={name} setName={setName} style={style} setStyle={setStyle}
            canSign={!!name.trim() && slot !== null} onSign={go} slotPicker={slotPicker} />
        </>}
      </div>

      {mode === 'club' && (
        <div className="setup-foot">
          {club ? <span className="row"><span className="club-code small-code">{code(club)}</span><span><b className="deal-h">{club.name}</b> <span className="tag dim">{world.competitions[club.compId]!.name}</span>
            <div className="muted small">{t('start.footLine', { v: fmtMoney(club.balance), goal: boardGoal(world, club.id) })}</div></span></span>
            : <span className="muted">{t('start.pickFirst')}</span>}
          <button className="btn primary big" disabled={!club} onClick={() => setMode('dossier')}>{t('start.toDossier')} <ArrowRight size={16} /></button>
        </div>
      )}
    </div>
  );
}
