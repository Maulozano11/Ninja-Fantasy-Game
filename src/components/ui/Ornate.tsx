// Lacquer-and-brass UI pieces: dark navy panels with gold hairlines and brass corners, parchment
// paper, a scroll button, a ribbon label and a round bronze gauge. Everything is drawn with CSS and
// inline SVG (no image files), so any screen can use them.

import React, { useId } from 'react';
import { Flame } from 'lucide-react';

const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

/** Paper texture: large mottling, long horizontal fibres and a fine grain, in brown ink. */
const PAPER_GRAIN = svgUrl(
  "<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>" +
    "<filter id='m' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='0.014' numOctaves='3' seed='3' stitchTiles='stitch'/>" +
    "<feColorMatrix values='0 0 0 0 0.52  0 0 0 0 0.34  0 0 0 0 0.14  1.1 0 0 0 -0.46'/></filter>" +
    "<filter id='f' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='0.006 0.5' numOctaves='2' seed='8' stitchTiles='stitch'/>" +
    "<feColorMatrix values='0 0 0 0 0.42  0 0 0 0 0.29  0 0 0 0 0.13  1.4 0 0 0 -0.72'/></filter>" +
    "<filter id='g' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' seed='5' stitchTiles='stitch'/>" +
    "<feColorMatrix values='0 0 0 0 0.3  0 0 0 0 0.2  0 0 0 0 0.08  0.9 0 0 0 -0.36'/></filter>" +
    "<rect width='200' height='200' filter='url(#m)'/><rect width='200' height='200' filter='url(#f)'/><rect width='200' height='200' filter='url(#g)'/>" +
    '</svg>',
);

/** Cream paper, darker towards the edges, with the grain on top. */
const PAPER_BG = `${PAPER_GRAIN}, radial-gradient(ellipse 85% 75% at 50% 45%, #f3e6c4 0%, #ead7ab 55%, #d9bd86 88%, #c7a46a 100%)`;
const PAPER_EDGE = 'inset 0 0 0 1px rgba(92,58,22,0.55), inset 0 0 6px 1px rgba(110,68,26,0.55), inset 0 0 22px rgba(140,92,40,0.4)';

/** A ragged outline for worn paper: the edges are bitten in by 0 to 2.5 px. */
function roughEdge(seed: number, per = 12, depth = 2.5): string {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647) * depth;
  const pts: string[] = [];
  for (let i = 0; i < per; i++) pts.push(`${(i / per) * 100}% ${r().toFixed(1)}px`);
  for (let i = 0; i < per; i++) pts.push(`calc(100% - ${r().toFixed(1)}px) ${(i / per) * 100}%`);
  for (let i = 0; i < per; i++) pts.push(`${100 - (i / per) * 100}% calc(100% - ${r().toFixed(1)}px)`);
  for (let i = 0; i < per; i++) pts.push(`${r().toFixed(1)}px ${100 - (i / per) * 100}%`);
  return `polygon(${pts.join(', ')})`;
}
const ROUGH = [roughEdge(11), roughEdge(29), roughEdge(47)];

/** Dark ink for text on parchment (all at least 4.5:1 on the paper). */
export const INK = {
  text: 'text-[#2e2012]',
  muted: 'text-[#5b4426]',
  good: 'text-[#1d5228]',
  bad: 'text-[#8a1c1c]',
  roll: 'text-[#18466e]',
  title: 'text-[#6a370b] font-bold',
} as const;

/** A keyboard focus ring that reads on navy and on paper. */
export const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd77a]';

export type PlaqueTone = 'gold' | 'lacquer' | 'ember' | 'crimson' | 'indigo';

const PLAQUE: Record<PlaqueTone, string> = {
  gold: 'border-[#5e3c10] bg-gradient-to-b from-[#f4d685] via-[#d8a74f] to-[#a06c26] text-[#1d1204] hover:from-[#fbe39e] hover:via-[#e2b45c]',
  lacquer: 'border-[#b08a4e]/80 bg-gradient-to-b from-[#1e2e52] to-[#0e1830] text-[#f6ead0] hover:border-[#e6c06d] hover:from-[#253860]',
  ember: 'border-[#f0b26a]/70 bg-gradient-to-b from-[#b4441a] to-[#7a220e] text-[#fff4e2] hover:from-[#c64f1f]',
  crimson: 'border-[#f2a3ae]/60 bg-gradient-to-b from-[#a8223a] to-[#650e1e] text-white hover:from-[#bb2944]',
  indigo: 'border-[#bdb6ff]/60 bg-gradient-to-b from-[#4c45b5] to-[#29216c] text-white hover:from-[#5850c8]',
};

const PLAQUE_SIZE = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' } as const;

/** Classes for a lacquered or brass plaque button. */
export const plaque = (tone: PlaqueTone = 'gold', size: keyof typeof PLAQUE_SIZE = 'md'): string =>
  `inline-flex items-center justify-center gap-1.5 rounded-md border font-bold shadow-[inset_0_1px_0_rgba(255,246,220,0.35),0_1px_3px_rgba(0,0,0,0.5)] transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0 ${FOCUS} ${PLAQUE_SIZE[size]} ${PLAQUE[tone]}`;

// ---------------------------------------------------------------------------------------------
// Brass corners

type CornerPos = 'tl' | 'tr' | 'bl' | 'br';
const FLIP: Record<CornerPos, string> = { tl: 'none', tr: 'scaleX(-1)', bl: 'scaleY(-1)', br: 'scale(-1,-1)' };

/**
 * One brass corner plate, like the fittings on a lacquered box: two arms along the edges ending in
 * round knobs, a fan-shaped plate between them with an engraved arc, and three rivets.
 */
function Corner({ pos, size }: { pos: CornerPos; size: number | string }) {
  const off = typeof size === 'number' ? -Math.round(size * 0.12) : -3;
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="pointer-events-none absolute z-[2]"
      style={{
        width: size,
        height: size,
        [pos[0] === 't' ? 'top' : 'bottom']: off,
        [pos[1] === 'l' ? 'left' : 'right']: off,
        transform: FLIP[pos],
        filter: 'drop-shadow(0 1px 1.2px rgba(0,0,0,0.7))',
      }}
    >
      <path d="M0.5 0.5H20a2.3 2.3 0 0 1 0 4.6H13C13 10 10 13 5.1 13V20a2.3 2.3 0 0 1-4.6 0Z" fill="#b8843a" stroke="#2e1b07" strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M1.2 1.2H12.6L1.2 12.6Z" fill="#d9a752" />
      <path d="M1.2 1.4H20M1.4 1.2V20" stroke="#f6dc95" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M10.9 5.1C10.9 8.6 8.6 10.9 5.1 10.9" fill="none" stroke="#5e3a12" strokeWidth="0.8" />
      <path d="M11.6 5.4C11.5 9.1 9.1 11.5 5.4 11.6" fill="none" stroke="#f2d283" strokeWidth="0.5" opacity="0.8" />
      <path d="M13 5.1C13 10 10 13 5.1 13" fill="none" stroke="#6e4718" strokeWidth="0.7" />
      <circle cx="4.4" cy="4.4" r="1.7" fill="#fff0bd" stroke="#4a2e0c" strokeWidth="0.5" />
      <circle cx="4" cy="4" r="0.6" fill="#ffffff" />
      <circle cx="17" cy="2.8" r="0.95" fill="#fbe7ad" stroke="#4a2e0c" strokeWidth="0.4" />
      <circle cx="2.8" cy="17" r="0.95" fill="#fbe7ad" stroke="#4a2e0c" strokeWidth="0.4" />
      <circle cx="20" cy="2.8" r="1.2" fill="#e6bc68" />
      <circle cx="2.8" cy="20" r="1.2" fill="#e6bc68" />
    </svg>
  );
}

/** Four brass corners for a positioned box (size in px, or any CSS length such as a clamp()). */
export function BrassCorners({ size = 20 }: { size?: number | string }) {
  return (
    <>
      <Corner pos="tl" size={size} />
      <Corner pos="tr" size={size} />
      <Corner pos="bl" size={size} />
      <Corner pos="br" size={size} />
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Lacquer panels

export type PanelTint = 'navy' | 'indigo' | 'crimson' | 'dawn';
export type PanelState = 'idle' | 'active' | 'muted';

const TINT_BG: Record<PanelTint, string> = {
  navy: 'linear-gradient(160deg, #16233f 0%, #0f1931 55%, #0a1226 100%)',
  indigo: 'linear-gradient(160deg, #1d1d4a 0%, #121539 55%, #0a0f26 100%)',
  crimson: 'linear-gradient(160deg, #3a1020 0%, #1c0d1d 50%, #0b0f22 100%)',
  dawn: 'linear-gradient(160deg, #3a2a18 0%, #1d1b26 55%, #0e1428 100%)',
};
const SHEEN = 'linear-gradient(180deg, rgba(255,238,200,0.05), rgba(255,238,200,0) 40%)';

const BORDER: Record<PanelState, string> = {
  idle: 'border-[#a98448]/70',
  active: 'border-[#ecc672]',
  muted: 'border-[#6b5534]/50',
};
const TINT_BORDER: Partial<Record<PanelTint, string>> = { crimson: 'border-[#d26474]/70', indigo: 'border-[#9d93e6]/50' };

/** The background and shadows of a lacquer panel, for elements that are not an OrnatePanel. */
export const lacquerStyle = (tint: PanelTint = 'navy', state: PanelState = 'idle'): React.CSSProperties => ({
  backgroundImage: `${SHEEN}, ${TINT_BG[tint]}`,
  boxShadow:
    'inset 0 1px 0 rgba(255,236,190,0.07), inset 0 0 0 1px rgba(2,5,14,0.55), 0 2px 10px rgba(0,0,0,0.35)' +
    (state === 'active' ? ', 0 0 0 1px rgba(240,205,120,0.25), 0 0 18px rgba(240,205,120,0.16)' : ''),
});

type PanelTag = 'div' | 'section' | 'aside' | 'button' | 'li';

export interface OrnatePanelProps extends React.HTMLAttributes<HTMLElement> {
  as?: PanelTag;
  tint?: PanelTint;
  state?: PanelState;
  /** Brightens the gold border on hover. */
  interactive?: boolean;
  /** Brass corners: true for the normal size, or a size in px. */
  corners?: boolean | number;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

/** A dark navy lacquered panel with a thin gold border and, optionally, brass corners. */
export function OrnatePanel({ as = 'div', tint = 'navy', state = 'idle', interactive, corners, className = '', style, children, ...rest }: OrnatePanelProps) {
  const Tag = as as React.ElementType;
  const border = state === 'idle' && TINT_BORDER[tint] ? TINT_BORDER[tint] : BORDER[state];
  return (
    <Tag
      className={`relative isolate rounded-md border ${border} ${interactive ? 'hover:border-[#dcb563]/90' : ''} ${as === 'button' ? FOCUS : ''} ${className}`}
      style={{ ...lacquerStyle(tint, state), ...style }}
      {...rest}
    >
      {corners ? <BrassCorners size={typeof corners === 'number' ? corners : 20} /> : null}
      {children}
    </Tag>
  );
}

/** A bronze picture frame for a scene or an image: gold hairlines around a dark bronze band. */
export function OrnateFrame({ children, className = '', corners = 'clamp(22px, 2.4vw, 30px)' }: { children: React.ReactNode; className?: string; corners?: number | string }) {
  return (
    <div
      className={`relative isolate rounded-md p-[4px] ${className}`}
      style={{
        background: 'linear-gradient(180deg, #4a3415 0%, #2a1c0a 50%, #3d2a10 100%)',
        boxShadow: 'inset 0 0 0 1px #d9b469, inset 0 0 0 3px #22170a, inset 0 0 0 4px rgba(217,180,105,0.55), 0 0 0 1px #120b03, 0 8px 28px rgba(0,0,0,0.55)',
      }}
    >
      <BrassCorners size={corners} />
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Parchment

export interface ParchmentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Picks one of a few ragged outlines, so neighbouring sheets don't match. */
  variant?: 0 | 1 | 2;
}

/** A sheet of worn cream paper with darker edges; text inside is dark ink. */
export function Parchment({ variant = 0, className = '', style, children, ...rest }: ParchmentProps) {
  return (
    <div className="relative" style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.55))' }}>
      <div
        className={`relative ${INK.text} ${className}`}
        style={{ backgroundImage: PAPER_BG, boxShadow: PAPER_EDGE, clipPath: ROUGH[variant], ...style }}
        {...rest}
      >
        {children}
      </div>
    </div>
  );
}

/** A small heading for a parchment sheet: small caps between two ink rules. */
export function ParchmentTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-transparent to-[#7a5328]/70" />
      <span className="font-serif text-[11px] font-bold uppercase tracking-[0.22em] text-[#5a330c]">{children}</span>
      <span aria-hidden className="h-px flex-1 bg-gradient-to-l from-transparent to-[#7a5328]/70" />
    </div>
  );
}

/** A wooden scroll rod for the ends of a paper strip. */
function Rod({ side }: { side: 'left' | 'right' }) {
  return (
    <span
      aria-hidden
      className={`absolute top-0 bottom-0 w-[9px] rounded-[4px] ${side === 'left' ? 'left-0' : 'right-0'}`}
      style={{
        background: 'linear-gradient(90deg, #2c1708 0%, #7a4a1f 30%, #c58e4f 52%, #6e411a 75%, #2a1607 100%)',
        boxShadow: 'inset 0 3px 0 #d9b469, inset 0 -3px 0 #d9b469, 0 1px 2px rgba(0,0,0,0.6)',
      }}
    />
  );
}

/** A button drawn as a paper strip between two scroll rods, with a flame by default. */
export function ScrollButton({
  icon,
  className = '',
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      className={`group relative inline-flex min-h-10 items-center justify-center gap-2 px-7 py-2 text-sm font-bold ${INK.text} transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 rounded-md ${FOCUS} ${className}`}
      {...rest}
    >
      <span
        aria-hidden
        className="absolute inset-y-[3px] inset-x-[5px] transition group-hover:brightness-[1.06]"
        style={{ backgroundImage: PAPER_BG, boxShadow: PAPER_EDGE, clipPath: ROUGH[1] }}
      />
      <Rod side="left" />
      <Rod side="right" />
      <span className="relative transition-transform group-hover:scale-110">{icon ?? <Flame className="h-4 w-4 text-[#b8360f]" strokeWidth={2.4} />}</span>
      <span className="relative">{children}</span>
    </button>
  );
}

/** A small ribbon with swallowtail ends, for a label under a gauge or over a panel. */
export function ScrollBanner({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`relative inline-block ${className}`} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.7))', ...style }}>
      <span
        className="block whitespace-nowrap px-3.5 py-[3px] text-[9px] font-extrabold uppercase leading-none tracking-[0.16em] text-[#3a220a]"
        style={{
          backgroundImage: `${PAPER_GRAIN}, linear-gradient(180deg, #c9a467 0%, #f0dfb5 30%, #ead6a6 70%, #b48a4f 100%)`,
          clipPath: 'polygon(0 0, 100% 0, calc(100% - 6px) 50%, 100% 100%, 0 100%, 6px 50%)',
        }}
      >
        {children}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------------------------
// Gauge

export interface GaugeProps {
  /** 0 to 100. */
  value: number;
  /** The ribbon under the dial. */
  label: string;
  /** A short line under the ribbon. */
  sub?: string;
  title?: string;
  /** Diameter in px. */
  size?: number;
  /** 'alarm' turns the arc red. */
  tone?: 'calm' | 'alarm';
  className?: string;
  style?: React.CSSProperties;
}

const BEADS = Array.from({ length: 24 }, (_, i) => (i / 24) * Math.PI * 2);
const TICKS = Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2);

/** A round bronze dial with a blue arc for a percentage, a big number and a ribbon label. */
export function Gauge({ value, label, sub, title, size = 78, tone = 'calm', className = '', style }: GaugeProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const R = 32;
  const C = 2 * Math.PI * R;
  const arc = tone === 'alarm' ? ['#ffe4e6', '#fb7185', '#be123c'] : ['#cffafe', '#38bdf8', '#2563eb'];
  const glow = tone === 'alarm' ? 'rgba(251,113,133,0.85)' : 'rgba(56,189,248,0.85)';
  return (
    <div
      role="meter"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      aria-valuetext={sub ? `${v} % · ${sub}` : `${v} %`}
      title={title}
      className={`flex flex-col items-center ${className}`}
      style={style}
    >
      <div className="relative" style={{ width: size, height: size, filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.6))' }}>
        <svg aria-hidden viewBox="0 0 100 100" width={size} height={size} className="block">
          <defs>
            <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f8df9a" />
              <stop offset="0.35" stopColor="#c99545" />
              <stop offset="0.7" stopColor="#875818" />
              <stop offset="1" stopColor="#4a2e0c" />
            </linearGradient>
            <radialGradient id={`${id}f`} cx="0.42" cy="0.36" r="0.75">
              <stop offset="0" stopColor="#213a6e" />
              <stop offset="0.6" stopColor="#0f1b3a" />
              <stop offset="1" stopColor="#060c1d" />
            </radialGradient>
            <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={arc[0]} />
              <stop offset="0.45" stopColor={arc[1]} />
              <stop offset="1" stopColor={arc[2]} />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="49.5" fill="#1a0f04" />
          <circle cx="50" cy="50" r="48" fill={`url(#${id}b)`} />
          <circle cx="50" cy="50" r="45.2" fill="none" stroke="#3b2408" strokeWidth="0.6" opacity="0.7" />
          {BEADS.map((a, i) =>
            i % 6 === 0 ? (
              <path
                key={i}
                d="M0 -2.6 2 0 0 2.6 -2 0Z"
                transform={`translate(${50 + 44 * Math.sin(a)} ${50 - 44 * Math.cos(a)}) rotate(${(a * 180) / Math.PI})`}
                fill="#fff0c2"
                stroke="#4a2e0c"
                strokeWidth="0.6"
              />
            ) : (
              <circle key={i} cx={50 + 44 * Math.sin(a)} cy={50 - 44 * Math.cos(a)} r="1.05" fill="#fbe7ad" stroke="#5a3a12" strokeWidth="0.35" />
            ),
          )}
          <circle cx="50" cy="50" r="40.5" fill="#24160a" />
          <circle cx="50" cy="50" r="39.3" fill={`url(#${id}f)`} />
          <circle cx="50" cy="50" r={R} fill="none" stroke="#ffffff" strokeOpacity="0.09" strokeWidth="6" />
          {TICKS.map((a, i) => (
            <line key={i} x1={50 + 25.5 * Math.sin(a)} y1={50 - 25.5 * Math.cos(a)} x2={50 + 27.5 * Math.sin(a)} y2={50 - 27.5 * Math.cos(a)} stroke="#c9d6f0" strokeOpacity="0.35" strokeWidth="0.8" />
          ))}
          {v > 0 && (
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={`url(#${id}a)`}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(v / 100) * C} ${C}`}
              transform="rotate(-90 50 50)"
              style={{ filter: `drop-shadow(0 0 2.5px ${glow})`, transition: 'stroke-dasharray 0.6s ease' }}
            />
          )}
          <ellipse cx="50" cy="34" rx="22" ry="9" fill="#ffffff" opacity="0.05" />
        </svg>
        <span
          aria-hidden
          className="absolute inset-0 grid place-items-center font-black tabular-nums leading-none text-[#f8fbff]"
          style={{ fontSize: size * 0.3, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
        >
          <span>
            {v}
            <span style={{ fontSize: '0.5em' }}>%</span>
          </span>
        </span>
      </div>
      <ScrollBanner className="z-[1]" style={{ marginTop: -Math.round(size * 0.13) }}>
        {label}
      </ScrollBanner>
      {sub && <span className="mt-1 whitespace-nowrap rounded bg-[#060b1a]/80 px-1.5 py-px text-[10px] leading-tight text-slate-100">{sub}</span>}
    </div>
  );
}
