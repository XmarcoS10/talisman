import type { Fixture, MatchEvent, SideStats, WorldState } from '../../engine/model.ts';
import { Crest } from '../Crest.tsx';
import { shortName } from '../bits.tsx';
import { t } from '../i18n.ts';
import { ResultsList } from './Fixtures.tsx';

const ICON: Record<MatchEvent['type'], string> = { goal: '⚽', penGoal: '⚽', penMiss: '✖', chance: '◎', yellow: '🟨', red: '🟥', injury: '✚', sub: '⇄' };

/** righe statistiche: [chiave i18n, valore casa, valore ospiti] */
function statRows(s: [SideStats, SideStats]): [string, string, string][] {
  const both = (f: (x: SideStats) => string | number) => [String(f(s[0])), String(f(s[1]))] as const;
  const acc = (x: SideStats) => (x.passes ? Math.round((x.passesOk / x.passes) * 100) : 0);
  return [
    ['match.stat.possession', ...both((x) => `${x.possession}%`)],
    ['match.stat.xg', ...both((x) => x.xg.toFixed(2))],
    ['match.stat.shots', ...both((x) => `${x.shots} (${x.onTarget})`)],
    ['match.stat.passes', ...both((x) => `${x.passes} · ${acc(x)}%`)],
    ['match.stat.tackles', ...both((x) => x.tackles)],
    ['match.stat.fouls', ...both((x) => x.fouls)],
    ['match.stat.corners', ...both((x) => x.corners)],
    ['match.stat.offsides', ...both((x) => x.offsides)],
    ['match.stat.cards', ...both((x) => `${x.yellows} / ${x.reds}`)],
  ];
}

function EventLine({ world, e }: { world: WorldState; e: MatchEvent }) {
  const name = (id: number) => { const p = world.players[id]; return p ? shortName(p) : '?'; };
  const extra = e.type === 'sub' && e.assistId !== undefined ? ` → ${name(e.assistId)}`
    : e.assistId !== undefined ? ` (${t('match.assist', { name: name(e.assistId) })})`
    : e.type === 'penGoal' ? ` (${t('match.pen')})` : e.type === 'chance' ? ` · xG ${e.xg?.toFixed(2)}` : '';
  return (
    <div className="row" style={{ justifyContent: e.side ? 'flex-start' : 'flex-end', gap: 'var(--s-2)' }}>
      {e.side === 1 && <span className="num muted">{e.min}'</span>}
      <span title={t(`match.ev.${e.type}`)}>{ICON[e.type]}</span>
      <span className={e.type === 'goal' || e.type === 'penGoal' ? '' : 'muted'}>{name(e.playerId)}{extra}</span>
      {e.side === 0 && <span className="num muted">{e.min}'</span>}
    </div>
  );
}

export function MatchModal({ world, fx, others, onClose }: { world: WorldState; fx: Fixture; others: Fixture[]; onClose: () => void }) {
  const clubs = [world.clubs[fx.home]!, world.clubs[fx.away]!];
  const r = fx.result!;
  const ratings = clubs.map((c) =>
    Object.entries(r.ratings)
      .map(([id, v]) => ({ p: world.players[Number(id)], v }))
      .filter((x) => x.p && x.p.clubId === c.id)
      .sort((a, b) => b.v - a.v),
  );
  const motm = [...ratings[0]!, ...ratings[1]!].sort((a, b) => b.v - a.v)[0];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="muted c">{t('match.fullTime')}</div>
        <div className="score">
          <div className="grid" style={{ justifyItems: 'center' }}><Crest club={clubs[0]!} size={72} /><b>{clubs[0]!.name}</b></div>
          <div className="big">{r.hg} - {r.ag}</div>
          <div className="grid" style={{ justifyItems: 'center' }}><Crest club={clubs[1]!} size={72} /><b>{clubs[1]!.name}</b></div>
        </div>
        {motm?.p && <div className="c muted">★ {t('match.motm')}: <b>{shortName(motm.p)}</b> <span className="num">{motm.v.toFixed(1)}</span></div>}

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
          <div className="panel">
            <h3>{t('match.timeline')}</h3>
            {r.events.filter((e) => e.type !== 'chance').map((e, i) => <EventLine key={i} world={world} e={e} />)}
          </div>
          <div className="panel">
            <h3>{t('match.stats')}</h3>
            <table>
              <tbody>
                {statRows(r.stats).map(([k, h, a]) => (
                  <tr key={k}><td className="num r" style={{ width: '30%' }}>{h}</td><td className="c muted">{t(k)}</td><td className="num" style={{ width: '30%' }}>{a}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <h3>{t('match.ratings')}</h3>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--s-1) var(--s-5)' }}>
            {ratings.map((list, side) => (
              <div key={side}>
                {list.map(({ p, v }) => (
                  <div key={p!.id} className="row" style={{ justifyContent: 'space-between' }}>
                    <span>{shortName(p!)}</span>
                    <b className={`num ${v >= 7.5 ? 'pos-good' : v < 6 ? 'pos-bad' : ''}`}>{v.toFixed(1)}</b>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <h3>{t('match.otherResults')}</h3>
        <ResultsList world={world} fixtures={others.filter((o) => o !== fx)} />
        <button className="btn primary" autoFocus onClick={onClose}>{t('match.continue')}</button>
      </div>
    </div>
  );
}
