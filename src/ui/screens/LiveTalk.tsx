// Discorso alla squadra (0.8.0): sei toni, poi la reazione del gruppo e chi l'ha presa male. Prima della partita
// sostituisce il campo; all'intervallo e alla fine sta dentro il tabellino.
import { Flame, HandHeart, Megaphone, MessageCircle, ThumbsDown, Wind } from 'lucide-react';
import { useState } from 'react';
import { reactions, TALKS, type Talk } from '../../engine/talks.ts';
import { t } from '../i18n.ts';

const ICON = { calm: Wind, motivate: HandHeart, demand: Megaphone, passion: Flame, praise: MessageCircle, disappointed: ThumbsDown } as const;

export interface Reaction { name: string; r: number }

export function LiveTalk({ phase, react, onDone }: {
  phase: 'pre' | 'half' | 'full';
  /** applica il discorso e dice come l'ha preso ognuno */
  react: (k: Talk) => Reaction[];
  /** prima della partita: si va al calcio d'inizio (con o senza discorso) */
  onDone?: () => void;
}) {
  const [said, setSaid] = useState<{ kind: Talk; rs: Reaction[] } | null>(null);
  const sum = said && reactions(said.rs.map((x) => x.r));
  const bad = said?.rs.filter((x) => x.r < 0).map((x) => x.name) ?? [];
  return (
    <div className="panel live-talk">
      <h2>{t(`talk.title.${phase}`)}</h2>
      {!said ? (
        <div className="talk-grid">
          {TALKS.map((k) => {
            const Icon = ICON[k];
            return (
              <button key={k} className="answer-card" onClick={() => setSaid({ kind: k, rs: react(k) })}>
                <Icon size={18} /><span><b>{t(`talk.${k}`)}</b><small className="muted">{t(`talk.desc.${k}`)}</small></span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="stack" style={{ gap: 6 }}>
          <span><b>{t(`talk.${said.kind}`)}</b> · {t('talk.result', { good: sum!.good, flat: sum!.flat, bad: sum!.bad })}</span>
          {bad.length > 0 && <span className="small pos-bad">{t('talk.badList', { names: bad.join(', ') })}</span>}
          <span className="muted small">{t(phase === 'full' ? 'talk.afterFull' : 'talk.afterMatch')}</span>
        </div>
      )}
      {onDone && <button className="btn primary" onClick={onDone}>{t(said ? 'talk.kickoff' : 'talk.skip')}</button>}
    </div>
  );
}
