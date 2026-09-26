import type { Fixture, MatchEvent, SideStats, WorldState } from '../../engine/model.ts';
import { fxLabel } from '../league.ts';
import { Crest } from '../Crest.tsx';
import { Star } from 'lucide-react';
import { PosBadge, Rating, shortName } from '../bits.tsx';
import { t } from '../i18n.ts';
import { ResultsList } from './Fixtures.tsx';

const ICON: Record<MatchEvent['type'], string> = { goal: '⚽', penGoal: '⚽', penMiss: '✖', chance: '◎', yellow: '🟨', red: '🟥', injury: '✚', sub: '⇄', plan: '📋' };

/** righe statistiche: [chiave i18n, valore casa, valore ospiti, quota della barra di casa 0-1] */
function statRows(s: [SideStats, SideStats]): [string, string, string, number][] {
  const both = (f: (x: SideStats) => string | number) => {
    const h = f(s[0]), a = f(s[1]);
    const nh = parseFloat(String(h)) || 0, na = parseFloat(String(a)) || 0;
    return [String(h), String(a), nh + na > 0 ? nh / (nh + na) : 0.5] as const;
  };
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
  if (e.type === 'plan') return ( // il vice annuncia il piano partita scattato
    <div className="row muted small" style={{ justifyContent: e.side ? 'flex-start' : 'flex-end', gap: 'var(--s-2)' }}>
      {ICON.plan} {t('match.planFired', { min: e.min, name: e.plan ?? '' })}
    </div>
  );
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
        <div className="row" style={{ justifyContent: 'center' }}><span className="tag">{fxLabel(fx, world.competitions[clubs[0]!.compId]?.name ?? '')}</span><span className="caps">{t('match.fullTime')}</span></div>
        <div className="score">
          <div className="grid" style={{ justifyItems: 'center' }}><Crest club={clubs[0]!} size={72} /><b>{clubs[0]!.name}</b></div>
          <div className="grid" style={{ justifyItems: 'center' }}><div className="big">{r.hg} - {r.ag}</div>{fx.pens && <span className="muted">{t('cup.pens', { a: fx.pens[0], b: fx.pens[1] })}</span>}</div>
          <div className="grid" style={{ justifyItems: 'center' }}><Crest club={clubs[1]!} size={72} /><b>{clubs[1]!.name}</b></div>
        </div>
        {motm?.p && (
          <div className="mvp"><Star size={18} /><span className="caps">{t('match.motm')}</span><PosBadge pos={motm.p.position} /><b className="deal-h">{shortName(motm.p)}</b>
            <span className="muted small">{world.clubs[motm.p.clubId ?? -1]?.name}</span><Rating v={motm.v} /></div>
        )}

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
          <div className="panel">
            <h2>{t('match.timeline')}</h2>
            {r.events.filter((e) => e.type !== 'chance').map((e, i) => <EventLine key={i} world={world} e={e} />)}
          </div>
          <div className="panel">
            <h2>{t('match.stats')}</h2>
            {statRows(r.stats).map(([k, h, a, q]) => (
              <div key={k} className="cmp">
                <span className="row" style={{ justifyContent: 'space-between' }}><b className="num">{h}</b><span className="caps">{t(k)}</span><b className="num">{a}</b></span>
                <span className="cmp-bar"><i style={{ width: `${q * 100}%` }} /></span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>{t('match.ratings')}</h2>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--s-1) var(--s-5)' }}>
            {ratings.map((list, side) => (
              <div key={side}>
                {list.map(({ p, v }) => (
                  <div key={p!.id} className="rating-row">
                    <PosBadge pos={p!.position} /><span>{shortName(p!)}</span><Rating v={v} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <h2>{t('match.otherResults')}</h2>
        <ResultsList world={world} fixtures={others.filter((o) => o !== fx)} />
        <button className="btn primary big" autoFocus onClick={onClose}>{t('match.continue')}</button>
      </div>
    </div>
  );
}
