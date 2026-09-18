import { useState } from 'react';
import { moraleParts, squadStatus } from '../../engine/morale.ts';
import { Rng } from '../../engine/rng.ts';
import { influence, leaders, mediate, sideWith } from '../../engine/social.ts';
import type { Feud, WorldState } from '../../engine/model.ts';
import { PosBadge, shortName } from '../bits.tsx';
import { t } from '../i18n.ts';
import { Graph, moraleClass } from './Graph.tsx';

/** schermata Spogliatoio (GUIDA §7.3): grafo, gruppo dirigente, faide, promesse, richieste */
export function Dressing({ world, onChange, onPlayer }: { world: WorldState; onChange: () => void; onPlayer: (id: number) => void }) {
  const club = world.clubs[world.manager.clubId]!;
  const [msg, setMsg] = useState<string | null>(null);
  const infl = influence(world, club);
  const players = club.playerIds.map((id) => world.players[id]!);
  const status = squadStatus(world, club);
  const avg = (f: (p: (typeof players)[number]) => number) => Math.round(players.reduce((s, p) => s + f(p), 0) / players.length);
  const promised = new Set(world.promises.map((p) => p.playerId));
  const requests = players.filter((p) => !promised.has(p.id) && !club.excluded.includes(p.id)
    && moraleParts(world, club, p, status.get(p.id)!).minutes <= -12);
  const name = (id: number) => shortName(world.players[id]!);
  const doMediate = (f: Feud) => {
    const rng = new Rng(world.rng);
    const ok = mediate(world, club, f, rng);
    world.rng = rng.s;
    setMsg(t(ok ? 'dressing.mediateOk' : 'dressing.mediateFail'));
    onChange();
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) 1fr', alignItems: 'start' }}>
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>{t('dressing.graph')}</h2>
          <span className="row muted">
            {t('dressing.mood')} <b className={`num m-text-${moraleClass(avg((p) => p.psych.morale))}`}>{avg((p) => p.psych.morale)}</b>
            · {t('dressing.trust')} <b className="num">{avg((p) => p.psych.trust)}</b>
          </span>
        </div>
        <Graph world={world} club={club} infl={infl} onPlayer={onPlayer} />
        <div className="muted" style={{ fontSize: 11 }}>{t('dressing.graphHint')}</div>
      </div>

      <div className="grid">
        <div className="panel">
          <h3>{t('dressing.leaders')}</h3>
          <div className="muted" style={{ fontSize: 11 }}>{t('dressing.leadersHint')}</div>
          {leaders(infl).map((id) => {
            const p = world.players[id]!;
            return (
              <div key={id} className="attr clickable" onClick={() => onPlayer(id)}>
                <span><PosBadge pos={p.position} /> {shortName(p)}</span>
                <span className="muted">{t('people.morale')} <b className={`num m-text-${moraleClass(p.psych.morale)}`}>{Math.round(p.psych.morale)}</b></span>
              </div>
            );
          })}
        </div>

        <div className="panel">
          <h3>{t('dressing.feuds')}</h3>
          {msg && <div className="pos-mid">{msg}</div>}
          {club.feuds.length === 0 && <div className="muted">{t('dressing.noFeuds')}</div>}
          {club.feuds.map((f) => (
            <div key={`${f.a}-${f.b}`} className="grid" style={{ gap: 'var(--s-2)' }}>
              <b>{name(f.a)} ⚡ {name(f.b)}</b>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <button className="btn" onClick={() => { sideWith(world, club, f, f.a); onChange(); }}>{t('dressing.side', { name: name(f.a) })}</button>
                <button className="btn" onClick={() => { sideWith(world, club, f, f.b); onChange(); }}>{t('dressing.side', { name: name(f.b) })}</button>
                <button className="btn" onClick={() => doMediate(f)}>{t('dressing.mediate')}</button>
              </div>
            </div>
          ))}
        </div>

        <div className="panel">
          <h3>{t('dressing.requests')}</h3>
          {requests.length === 0 && <div className="muted">{t('dressing.noRequests')}</div>}
          {requests.map((p) => (
            <div key={p.id} className="attr clickable" onClick={() => onPlayer(p.id)}>
              <span><PosBadge pos={p.position} /> {shortName(p)}</span>
              <span className="muted">{t(`sstatus.${status.get(p.id)}`)} · <b className={`num m-text-${moraleClass(p.psych.morale)}`}>{Math.round(p.psych.morale)}</b></span>
            </div>
          ))}
        </div>

        <div className="panel">
          <h3>{t('dressing.promises')}</h3>
          <div className="muted">{t('dressing.record', { kept: world.manager.kept, broken: world.manager.broken })}</div>
          {world.promises.length === 0 && <div className="muted">{t('dressing.noPromises')}</div>}
          {world.promises.map((pr) => (
            <div key={pr.playerId} className="clickable" onClick={() => onPlayer(pr.playerId)}>
              {t('dressing.promiseRow', { name: name(pr.playerId), kind: t(`promise.${pr.kind}`), apps: pr.apps, need: pr.need, left: pr.left })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
