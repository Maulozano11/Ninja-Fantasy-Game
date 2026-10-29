import React from 'react';
import { OrnatePanel, sliced, ui } from './ornate';

// The creator's pieces. Since 2026-10-28 the panels, rows, step diamonds and big buttons are the
// owner's own (his creator and battle UI sheets, ./ornate.tsx); the layout is still the one of his
// first mockup (docs/reference/creator-scene-owner-reference.jpg): panels at the sides, the ninja
// in the middle, parchment for the details, carved gold headings.

export const serif: React.CSSProperties = { fontFamily: "'Cinzel', 'Trajan Pro', Georgia, 'Times New Roman', serif" };

export const C = {
  ink: '#efe3c4',
  dim: '#b9a98a',
  gold: '#f2c46d',
  bronze: '#8a6a3a',
  iron: '#1a1714',
  parchment: '#dccb9f',
  inkDark: '#2a1d10',
};

/** A bronze corner bracket (one of four on a panel). */
function Corner({ at }: { at: 'tl' | 'tr' | 'bl' | 'br' }) {
  const pos = { tl: 'left-0 top-0', tr: 'right-0 top-0 rotate-90', br: 'right-0 bottom-0 rotate-180', bl: 'left-0 bottom-0 -rotate-90' }[at];
  return (
    <svg className={`absolute ${pos} w-5 h-5 pointer-events-none`} viewBox="0 0 20 20" aria-hidden>
      <path d="M1 19V1h18" fill="none" stroke="#c99a4b" strokeWidth="2" />
      <path d="M4 16V4h12" fill="none" stroke="#5b4426" strokeWidth="1" />
      <rect x="0" y="0" width="5" height="5" fill="#f2c46d" />
    </svg>
  );
}

/** His black panel with the gold filigree, corners and gems, a gold title and his section line. */
export function Frame({
  title,
  sub,
  actions,
  children,
  className = '',
  bodyClass = '',
}: {
  title?: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <OrnatePanel c={28} className={`flex flex-col min-h-0 shadow-[0_10px_40px_rgba(0,0,0,0.7)] ${className}`}>
      <div className="relative flex flex-col flex-1 min-h-0 px-4 pt-5 pb-5">
        {title && (
          <header className="relative flex items-start justify-between gap-3 px-1 pb-1">
            <div className="min-w-0">
              <h2 style={serif} className="truncate text-[1.05rem] font-bold uppercase tracking-wider text-[#f2c46d] [text-shadow:0_2px_0_#000]">
                {title}
              </h2>
              {sub && <div className="truncate text-[11px] text-[#b9a98a]">{sub}</div>}
              <img src={ui('section_header')} alt="" aria-hidden draggable={false} className="mt-1 h-3 w-auto max-w-full" />
            </div>
            {actions}
          </header>
        )}
        <div className={`relative flex-1 min-h-0 overflow-y-auto ${bodyClass}`}>{children}</div>
      </div>
    </OrnatePanel>
  );
}

/** A row of a choice list: an emblem, a carved name and a line under it; gold when chosen. */
export function Row({
  selected,
  onClick,
  onHover,
  icon,
  title,
  sub,
  right,
  disabled,
  indent,
}: {
  selected?: boolean;
  onClick?: () => void;
  onHover?: (on: boolean) => void;
  icon?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
  disabled?: boolean;
  indent?: boolean;
}) {
  // His group row: the red gem row when chosen, the lit one on hover, the plain dark one otherwise.
  const [hot, setHot] = React.useState(false);
  const hover = (on: boolean) => {
    setHot(on);
    onHover?.(on);
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => hover(true)}
      onMouseLeave={() => hover(false)}
      onFocus={() => hover(true)}
      onBlur={() => hover(false)}
      style={sliced(selected ? 'row_active_plain' : hot && !disabled ? 'row_hover' : 'row', '20 34', '7px 12px')}
      className={`group relative w-full flex items-center gap-3 text-left px-2 py-1.5 my-0.5 transition ${indent ? 'pl-6' : ''} ${disabled ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span style={serif} className={`block truncate font-semibold tracking-wide ${selected ? 'text-[#fff1d6]' : 'text-[#efe3c4] group-hover:text-[#f6d58e]'}`}>
          {title}
        </span>
        {sub && <span className="block truncate text-[11px] text-[#b9a98a]">{sub}</span>}
      </span>
      {right && <span className="shrink-0">{right}</span>}
    </button>
  );
}

/** A heading inside a panel, with the engraved arrows of his "Noble Clan Heritage" line. */
export function Heading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-3 pt-4 pb-1.5">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#8a6a3a]" />
      <span style={serif} className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#d9b46a]">
        {children}
      </span>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#8a6a3a]" />
    </div>
  );
}

/** Parchment, as his clan cards: dark ink on aged paper inside a thin iron line. */
export function Parchment({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`border border-[#3a2f22] p-[3px] bg-[#2a2520] ${className}`}
      style={{ boxShadow: 'inset 0 0 0 1px #6b5434' }}
    >
      <div className="px-4 py-3 text-[13px] leading-relaxed text-[#2a1d10] bg-[radial-gradient(ellipse_at_30%_20%,#e8d9b0,#d6c290_70%,#c4ad79)]">{children}</div>
    </div>
  );
}

/** A bonus or tag, stamped in gold on iron. */
export function Chip({ children, tone = 'gold' }: { children: React.ReactNode; tone?: 'gold' | 'dark' }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[11px] font-bold tracking-wide border ${
        tone === 'gold' ? 'border-[#c99a4b] bg-[#3a2a12] text-[#f2c46d]' : 'border-[#6b5434] bg-[#2a1d10] text-[#efe3c4]'
      }`}
    >
      {children}
    </span>
  );
}

/** The step tabs across the top: a gold-rimmed seal per step and its carved name. */
export function StepTabs<S extends string>({
  steps,
  active,
  onPick,
  label,
  icon,
}: {
  steps: readonly S[];
  active: S;
  onPick: (s: S) => void;
  label: (s: S) => string;
  icon: (s: S) => React.ReactNode;
}) {
  const at = steps.indexOf(active);
  return (
    <nav className="flex items-end justify-center gap-1 sm:gap-3" aria-label="Steps">
      {steps.map((s, i) => {
        const on = s === active;
        return (
          <React.Fragment key={s}>
            {i > 0 && <span className={`mb-[30px] hidden sm:block h-px w-6 ${i <= at ? 'bg-[#c99a4b]' : 'bg-[#4a3a26]'}`} />}
            <button type="button" onClick={() => onPick(s)} className="group flex flex-col items-center gap-1 px-1 outline-none">
              {/* his step diamond: red and lit for this step, gold for the ones done, grey ahead */}
              <span className="relative grid place-items-center w-14 h-14 transition group-hover:brightness-125">
                <img src={ui(on ? 'step_active' : i < at ? 'step_on' : 'step_off')} alt="" aria-hidden draggable={false} className="absolute inset-0 w-full h-full" />
                <span className="relative">{icon(s)}</span>
              </span>
              <span
                style={serif}
                className={`mt-1 text-[11px] font-bold uppercase tracking-[0.14em] [text-shadow:0_1px_0_#000] ${on ? 'text-[#f2c46d]' : 'text-[#b9a98a] group-hover:text-[#efe3c4]'}`}
              >
                {label(s)}
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

/** A big button of the bottom bar: his red gem for the way on, his blue gem for the way back. */
export function BigButton({
  children,
  onClick,
  tone = 'iron',
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'gold' | 'iron';
}) {
  const [hot, setHot] = React.useState(false);
  const gem = tone === 'gold' ? 'btn_red' : 'btn_blue';
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      style={{ ...serif, ...sliced(hot ? `${gem}_hover` : gem, '60 90', '14px 26px') }}
      className="relative inline-flex items-center gap-2 px-4 py-1.5 text-[15px] font-bold uppercase tracking-[0.16em] text-[#fff4dc] transition [text-shadow:0_2px_0_#000] drop-shadow-[0_6px_16px_rgba(0,0,0,0.6)]"
    >
      {children}
    </button>
  );
}

/** A small iron button (randomize, export). */
export function IronButton({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[#d9b46a] text-[#efe3c4] bg-[#0e0b09]/90 shadow-[0_0_8px_rgba(242,196,109,0.25)] hover:shadow-[0_0_12px_rgba(242,196,109,0.6)] hover:text-[#f2c46d] transition"
    >
      {children}
    </button>
  );
}
