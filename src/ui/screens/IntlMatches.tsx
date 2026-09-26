// Le partite delle nazionali (§7.8): quelle delle nazioni dei tuoi giocatori, le più recenti in alto, coi marcatori.
// Si giocano col motore vero, quindi i gol hanno un nome e un minuto.
import type { IntlMatch, WorldState } from '../../engine/model.ts';
import { t } from '../i18n.ts';

const label = (m: IntlMatch) => (m.stage ? t(`intl.stage.${m.stage}`) : t('intl.stage.break'));

export function IntlMatches({ world, nations, onPlayer }: { world: WorldState; nations: Set<string>; onPlayer: (id: number) => void }) {
  const matches = world.intl.filter((m) => nations.has(m.a) || nations.has(m.b)).slice(-6).reverse();
  return (
    <div className="panel">
      <h2>{t('intl.matches')}</h2>
      {matches.length === 0 && <span className="muted small">{t('intl.noMatches')}</span>}
      {matches.map((m, i) => (
        <div key={`${m.season}-${m.day}-${i}`} className="mini-card">
          <div className="row wrap" style={{ justifyContent: 'space-between' }}>
            <b>{t(`nation.${m.a}`)} {m.ga}–{m.gb} {t(`nation.${m.b}`)}</b>
            <span className="tag dim">{m.kind === 'break' ? label(m) : `${t(`intl.${m.kind}`, { season: m.season, nation: '' }).split(':')[0]} · ${label(m)}`}</span>
          </div>
          {m.pens && <span className="small muted">{t('intl.pens', { a: m.pens[0], b: m.pens[1] })}</span>}
          <span className="row wrap small">
            {m.scorers.length === 0 && <span className="muted">{t('intl.noGoals')}</span>}
            {m.scorers.map((s, k) => {
              const p = world.players[s.playerId];
              if (!p) return null;
              const mine = p.clubId === world.manager.clubId;
              // i tuoi si aprono con un clic e si vedono; gli altri restano testo
              return mine
                ? <button key={k} className="link" onClick={() => onPlayer(p.id)}>{p.lastName} {s.min}'</button>
                : <span key={k} className="muted">{p.lastName} {s.min}'</span>;
            })}
          </span>
        </div>
      ))}
    </div>
  );
}
