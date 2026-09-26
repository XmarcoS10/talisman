// Sala stampa (GUIDA §7.4): una domanda per volta, le risposte con tono ed effetti scritti accanto, si conferma.
import { useState } from 'react';
import { Mic, Send } from 'lucide-react';
import type { PressEffect, WorldState } from '../../engine/model.ts';
import { answerPress } from '../../engine/press/press.ts';
import { t, sayLine } from '../i18n.ts';

function Effect({ world, e }: { world: WorldState; e: PressEffect }) {
  const d = `${e.delta > 0 ? '+' : ''}${e.delta}`;
  const p = e.playerId !== undefined ? world.players[e.playerId] : undefined;
  const label = e.target === 'player' ? t('press.effect.player', { name: p?.lastName ?? '?', d }) : t(`press.effect.${e.target}`, { d });
  return <span className={`tag ${e.delta > 0 ? '' : e.delta < 0 ? 'bad' : 'dim'}`}>{label}</span>;
}

export function PressRoom({ world, onChange }: { world: WorldState; onChange: () => void }) {
  const room = world.press;
  const [pick, setPick] = useState<number | null>(null);
  const qi = room ? room.questions.findIndex((q) => q.answered === null) : -1;
  const q = room && qi >= 0 ? room.questions[qi]! : null;
  const club = world.clubs[world.manager.clubId]!;

  return (
    <div className="panel press">
      <div className="row wrap" style={{ justifyContent: 'space-between' }}>
        <span className="tag"><span className="live-dot" /> {room ? t('press.live', { stadium: club.stadium.name }) : t('press.closed')}</span>
        {room && <span className="tag dim">{q ? t('press.step', { n: qi + 1, tot: room.questions.length }) : t('press.done')}</span>}
      </div>
      {!room && <div className="muted">{t('press.none')}</div>}
      {room && !q && <div className="muted">{t('press.allAnswered')}</div>}
      {q && (
        <>
          <div className="question-card">
            <span className="initials"><Mic size={16} /></span>
            <div><span className="muted small">{sayLine(q.asker)}</span><div className="q-text">«{sayLine(q.text)}»</div></div>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            {q.options.map((o, oi) => (
              <button key={oi} className={`answer-card ${pick === oi ? 'chosen' : ''}`} onClick={() => setPick(oi)}>
                <span className="radio" />
                <span className="stack" style={{ gap: 6 }}>
                  <b>{t('press.option', { l: 'ABCDEF'[oi] ?? '' })}: {t(`press.kind.${o.key}`)}</b>
                  <span className="muted">«{sayLine(o.text)}»</span>
                  <span className="row wrap">{o.effects.map((e, i) => <Effect key={i} world={world} e={e} />)}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted small">{t('press.hint')}</span>
            <button className="btn primary big" disabled={pick === null} onClick={() => { answerPress(world, qi, pick!); setPick(null); onChange(); }}>
              {t('press.confirm')} <Send size={15} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
