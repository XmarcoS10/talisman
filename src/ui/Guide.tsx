// Prima partita guidata (P13 punto 2): cinque passi, una decina di minuti, dalla scelta del club alla prima
// partita giocata. Sta in Scrivania finché non è finita o finché non la chiudi.
import { useReducer } from 'react';
import { settings, updateSettings } from './settings.ts';
import { t } from './i18n.ts';

type Nav = 'board' | 'squad' | 'tactics' | 'training' | 'stories';
const STEPS: { id: string; nav: Nav | null }[] = [
  { id: 'board', nav: 'board' },
  { id: 'squad', nav: 'squad' },
  { id: 'tactics', nav: 'tactics' },
  { id: 'training', nav: 'training' },
  { id: 'live', nav: null }, // la partita si guarda dal pulsante in alto
];

export function Guide({ onNav }: { onNav: (n: Nav) => void }) {
  const [, refresh] = useReducer((x: number) => x + 1, 0);
  const s = settings();
  if (s.guideDone) return null;
  const done = (id: string) => s.visited.includes(id);
  const all = STEPS.every((st) => done(st.id));
  const next = STEPS.find((st) => !done(st.id));
  return (
    <div className="panel guide">
      <div className="row">
        <h3>{t('guide.title')}</h3>
        <div className="spacer" />
        <button className="btn small" onClick={() => { updateSettings({ guideDone: true }); refresh(); }}>{t(all ? 'guide.finish' : 'guide.skip')}</button>
      </div>
      <div className="muted">{t(all ? 'guide.allDone' : 'guide.intro')}</div>
      <ol className="steps">
        {STEPS.map((st) => (
          <li key={st.id} className={done(st.id) ? 'done' : st === next ? 'next' : ''}>
            <span>{done(st.id) ? '✓' : '○'}</span>
            <div>
              <b>{t(`guide.${st.id}.title`)}</b>
              <div className="muted">{t(`guide.${st.id}.text`)}</div>
            </div>
            {st.nav && !done(st.id) && <button className="btn small" onClick={() => onNav(st.nav!)}>{t('guide.go')}</button>}
          </li>
        ))}
      </ol>
    </div>
  );
}
