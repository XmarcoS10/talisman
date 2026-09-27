// Radiocronaca di una partita (0.5.0): le righe le scrive ui/match/radio.ts dagli eventi salvati.
import { Radio as RadioIcon } from 'lucide-react';
import type { Fixture, WorldState } from '../../engine/model.ts';
import { t } from '../i18n.ts';
import { radio } from '../match/radio.ts';

export function RadioPanel({ world, fx }: { world: WorldState; fx: Fixture }) {
  const lines = radio(world, fx);
  return (
    <details className="panel radio" open>
      <summary><h3 className="row"><RadioIcon size={16} /> {t('radio.title')}</h3></summary>
      <div className="stack" style={{ maxHeight: 260, overflowY: 'auto' }}>
        {lines.map((l, i) => (
          <div key={i} className="row" style={{ alignItems: 'baseline', gap: 'var(--s-2)' }}>
            <span className="num muted" style={{ minWidth: 30 }}>{l.min}'</span>
            <span className={l.big ? '' : 'muted'}>{l.big ? <b>{l.text}</b> : l.text}</span>
          </div>
        ))}
      </div>
      <span className="muted small">{t('radio.hint')}</span>
    </details>
  );
}
