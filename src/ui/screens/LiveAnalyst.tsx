// Pannello analista (GUIDA §8.4): momentum, pressing, catene di passaggi, duelli, più la frase dell'analista.
import { useState } from 'react';
import type { MatchRun, TraceStep } from '../../engine/match/engine.ts';
import { context, pick, type Ctx } from '../match/analyst.ts';
import { shortName } from '../bits.tsx';
import { t } from '../i18n.ts';

type Tab = 'momentum' | 'pressing' | 'chains' | 'duels';
const TABS: Tab[] = ['momentum', 'pressing', 'chains', 'duels'];

/**
 * grafico a fiume del momentum, minuto per minuto fino a quello che si sta guardando (Blocco 3, correzione: prima
 * all'inizio era una riga piatta larga tutto il grafico). Sopra la linea comanda la tua squadra, sotto l'altra.
 */
function Momentum({ frames, me, upTo }: { frames: TraceStep[]; me: 0 | 1; upTo: number }) {
  const byMin: number[] = [0];
  for (let k = 0; k <= upTo && k < frames.length; k++) byMin[Math.min(95, frames[k]!.min)] = (frames[k]!.mom * (me === 0 ? 1 : -1)) / 100;
  const pts: [number, number][] = [];
  byMin.forEach((v, m) => { if (v !== undefined) pts.push([(m / 95) * 300, 45 - v * 40]); });
  const last = pts[pts.length - 1]!;
  const area = `0,45 ${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} ${last[0].toFixed(1)},45`;
  return (
    <svg viewBox="0 0 300 90" className="chart river" role="img" aria-label={t('live.tab.momentum')}>
      <defs><clipPath id="mom-up"><rect x="0" y="0" width="300" height="45" /></clipPath><clipPath id="mom-down"><rect x="0" y="45" width="300" height="45" /></clipPath></defs>
      {[15, 30, 45, 60, 75, 90].map((m) => <line key={m} className="tick" x1={(m / 95) * 300} y1="0" x2={(m / 95) * 300} y2="90" />)}
      <line x1="0" y1="45" x2="300" y2="45" />
      <polygon points={area} className="up" clipPath="url(#mom-up)" />
      <polygon points={area} className="down" clipPath="url(#mom-down)" />
      {pts.length > 1 && <polyline points={pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} />}
      <circle cx={last[0]} cy={last[1]} r="3" className="now" />
      {pts.length < 3 && <text x="150" y="20" textAnchor="middle">{t('live.momentumSoon')}</text>}
    </svg>
  );
}

/** dove si gioca: quota di azioni per terzo di campo (nel senso d'attacco della tua squadra) */
function Zones({ frames, me }: { frames: TraceStep[]; me: 0 | 1 }) {
  const zones = [0, 0, 0];
  for (const f of frames) {
    const x = me === 0 ? f.bx : 12 - f.bx;
    zones[x < 4 ? 0 : x < 8 ? 1 : 2]!++;
  }
  const tot = Math.max(1, zones[0]! + zones[1]! + zones[2]!);
  return (
    <div className="zones">
      {zones.map((z, i) => (
        <div key={i} style={{ background: `color-mix(in srgb, var(--accent) ${Math.round((z / tot) * 160)}%, transparent)` }}>
          <b className="num">{Math.round((z / tot) * 100)}%</b>
          <span className="muted">{t(`live.zone.${i}`)}</span>
        </div>
      ))}
    </div>
  );
}

/** rete dei passaggi riusciti: posizione media di chi gioca, spessore = quante volte si sono cercati */
function Chains({ frames, me, names }: { frames: TraceStep[]; me: 0 | 1; names: Map<number, string> }) {
  const sumX = new Map<number, [number, number, number]>(); // id → [x, y, n]
  const links = new Map<string, number>();
  for (const f of frames) {
    f.ids.forEach((id, i) => {
      const home = i < f.n0;
      if ((home ? 0 : 1) !== me) return;
      const a = sumX.get(id) ?? [0, 0, 0];
      sumX.set(id, [a[0] + f.px[i]!, a[1] + f.py[i]!, a[2] + 1]);
    });
    if (f.side === me && f.kind === 'pass' && f.ok && f.to !== undefined) {
      const k = `${Math.min(f.from, f.to)}-${Math.max(f.from, f.to)}`;
      links.set(k, (links.get(k) ?? 0) + 1);
    }
  }
  const pos = new Map([...sumX].map(([id, [x, y, n]]) => [id, { x: me === 0 ? x / n : 12 - x / n, y: me === 0 ? y / n : 8 - y / n }]));
  const X = (x: number) => (x / 12) * 300;
  const Y = (y: number) => (y / 8) * 190;
  const top = [...links].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 18);
  return (
    <svg viewBox="0 0 300 190" className="network" role="img" aria-label={t('live.tab.chains')}>
      <rect x="0" y="0" width="300" height="190" rx="4" />
      {top.map(([k, n]) => {
        const [a, b] = k.split('-').map(Number) as [number, number];
        const pa = pos.get(a), pb = pos.get(b);
        return pa && pb ? <line key={k} x1={X(pa.x)} y1={Y(pa.y)} x2={X(pb.x)} y2={Y(pb.y)} strokeWidth={Math.min(5, n / 3)} /> : null;
      })}
      {[...pos].map(([id, p]) => (
        <g key={id}>
          <circle cx={X(p.x)} cy={Y(p.y)} r="7" />
          <text x={X(p.x)} y={Y(p.y) + 16} textAnchor="middle">{(names.get(id) ?? '').split(' ').pop()}</text>
        </g>
      ))}
    </svg>
  );
}

function Duels({ run, me }: { run: MatchRun; me: 0 | 1 }) {
  const rows = run.teams[me].on
    .map((m) => ({ m, won: m.st.tackles + m.st.dribbles, lost: m.st.duelsLost }))
    .filter((r) => r.won + r.lost > 0)
    .sort((a, b) => b.lost - a.lost || b.won - a.won);
  return (
    <table>
      <thead><tr><th>{t('col.name')}</th><th className="r">{t('live.won')}</th><th className="r">{t('live.lost')}</th></tr></thead>
      <tbody>
        {rows.map(({ m, won, lost }) => (
          <tr key={m.p.id}>
            <td>{shortName(m.p)}</td>
            <td className="r num pos-good">{won}</td>
            <td className={`r num ${lost > won ? 'pos-bad' : 'muted'}`}>{lost}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function LiveAnalyst({ run, me, names, phrase, ctx, upTo }: {
  run: MatchRun; me: 0 | 1; names: Map<number, string>; phrase: { id: string; vars: Record<string, string | number> } | null; ctx: Ctx; upTo: number;
}) {
  const [tab, setTab] = useState<Tab>('momentum');
  return (
    <div className="panel live-analyst">
      <div className="tabs">
        {TABS.map((x) => <button key={x} className={x === tab ? 'active' : ''} onClick={() => setTab(x)}>{t(`live.tab.${x}`)}</button>)}
      </div>
      {tab === 'momentum' && <>
        <Momentum frames={run.frames} me={me} upTo={upTo} />
        <div className="attr"><span className="muted">xG</span><b className="num">{ctx.xg.toFixed(2)} – {ctx.xgA.toFixed(2)}</b></div>
        <div className="attr"><span className="muted">{t('match.stat.possession')}</span><b className="num">{ctx.poss}%</b></div>
        <div className="attr"><span className="muted">{t('match.stat.shots')}</span><b className="num">{ctx.my.shots} ({ctx.my.onTarget}) – {ctx.opp.shots} ({ctx.opp.onTarget})</b></div>
      </>}
      {tab === 'pressing' && <>
        <div className="attr" title={t('live.ppdaHint')}><span className="muted">PPDA</span><b className="num">{ctx.ppda.toFixed(1)} – {ctx.ppdaA.toFixed(1)}</b></div>
        <div className="attr"><span className="muted">{t('match.stat.tackles')}</span><b className="num">{ctx.my.tackles} – {ctx.opp.tackles}</b></div>
        <div className="attr"><span className="muted">{t('match.stat.passes')}</span><b className="num">{ctx.my.passes} · {Math.round(ctx.acc * 100)}%</b></div>
        <Zones frames={run.frames} me={me} />
      </>}
      {tab === 'chains' && <Chains frames={run.frames} me={me} names={names} />}
      {tab === 'duels' && <Duels run={run} me={me} />}
      <div className="analyst">
        <b>{t('live.analyst')}</b>
        <p>{phrase ? t(`an.${phrase.id}`, phrase.vars) : t('an.quiet')}</p>
      </div>
    </div>
  );
}

export { context, pick };
