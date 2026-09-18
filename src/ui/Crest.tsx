// Stemma SVG procedurale e deterministico (versione base del GP1): stesso club = stesso stemma.
import type { Club } from '../engine/model.ts';

const SHIELDS = [
  'M4 4h56v26c0 16-12 26-28 30C16 56 4 46 4 30z',
  'M32 2l28 10v20c0 14-12 24-28 30C16 56 4 46 4 32V12z',
  'M6 4h52l-4 36L32 62 10 40z',
  'M32 3a29 29 0 1 1 0 58a29 29 0 1 1 0-58z',
];

export function Crest({ club, size = 32 }: { club: Club; size?: number }) {
  if (club.crest) return <img src={club.crest} width={size} height={size} alt="" />;
  const h = Math.imul(club.id + 1, 2654435761) >>> 0;
  const shape = SHIELDS[h % SHIELDS.length]!;
  const pattern = (h >>> 4) % 5;
  const [c1, c2] = club.colors;
  const clip = `crest-${club.id}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs><clipPath id={clip}><path d={shape} /></clipPath></defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="64" height="64" fill={c1} />
        {pattern === 1 && [8, 24, 40, 56].map((x) => <rect key={x} x={x} width="8" height="64" fill={c2} />)}
        {pattern === 2 && <rect x="32" width="32" height="64" fill={c2} />}
        {pattern === 3 && <path d="M0 22L32 40L64 22V34L32 52L0 34z" fill={c2} />}
        {pattern === 4 && <path d="M0 0L64 64V44L20 0z" fill={c2} />}
        {pattern === 0 && <rect y="40" width="64" height="24" fill={c2} />}
      </g>
      <path d={shape} fill="none" stroke="rgb(0 0 0 / .45)" strokeWidth="2.5" />
      {size >= 48 && (
        <text x="32" y="30" textAnchor="middle" dominantBaseline="middle" fontFamily="Barlow Condensed, sans-serif" fontWeight="700" fontSize="17"
          fill="#fff" stroke="rgb(0 0 0 / .6)" strokeWidth="3" paintOrder="stroke">{club.shortName}</text>
      )}
    </svg>
  );
}
