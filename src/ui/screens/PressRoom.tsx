// Sala stampa (GUIDA §7.4): domande dalle storie, risposte con gli effetti scritti accanto.
import type { PressEffect, WorldState } from '../../engine/model.ts';
import { answerPress } from '../../engine/press/press.ts';
import { t } from '../i18n.ts';

function Effect({ world, e }: { world: WorldState; e: PressEffect }) {
  const d = `${e.delta > 0 ? '+' : ''}${e.delta}`;
  const p = e.playerId !== undefined ? world.players[e.playerId] : undefined;
  const label = e.target === 'player' ? t('press.effect.player', { name: p?.lastName ?? '?', d }) : t(`press.effect.${e.target}`, { d });
  return <span className={`chip ${e.delta >= 0 ? 'ok' : 'warn'}`}>{label}</span>;
}

export function PressRoom({ world, onChange }: { world: WorldState; onChange: () => void }) {
  const room = world.press;
  return (
    <div className="panel">
      <h3>{t('press.title')}</h3>
      {!room && <div className="muted">{t('press.none')}</div>}
      {room?.questions.map((q, qi) => (
        <div key={qi} className="question">
          <div className="muted">{q.asker}</div>
          <b>{q.text}</b>
          <div className="answers">
            {q.options.map((o, oi) => (
              <button key={oi} className={`answer ${q.answered === oi ? 'chosen' : ''}`} disabled={q.answered !== null}
                onClick={() => { answerPress(world, qi, oi); onChange(); }}>
                <span>«{o.text}»</span>
                <span className="row wrap">{o.effects.map((e, i) => <Effect key={i} world={world} e={e} />)}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      {room && <div className="muted">{t('press.hint')}</div>}
    </div>
  );
}
