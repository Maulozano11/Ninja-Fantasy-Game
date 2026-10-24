import React from 'react';

// The creator's pieces in the look of the owner's mockup (docs/reference/creator-scene-owner-reference.jpg)
// laid out the way Baldur's Gate 3 lays out its character creation: dark iron panels with bronze
// edges and gold corners, parchment for the details, carved gold headings.

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

/** An iron panel with a bronze edge, gold corners and an engraved title bar. */
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
    <section
      className={`${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative'} flex flex-col min-h-0 border border-[#6b5434] bg-[linear-gradient(180deg,rgba(30,27,24,0.94),rgba(14,12,10,0.94))] shadow-[0_10px_40px_rgba(0,0,0,0.7)] ${className}`}
    >
      <div className="absolute inset-[3px] border border-[#2e251a] pointer-events-none" />
      <Corner at="tl" />
      <Corner at="tr" />
      <Corner at="bl" />
      <Corner at="br" />
      {title && (
        <header className="relative flex items-center justify-between gap-3 mx-[3px] mt-[3px] px-4 py-2.5 border-b border-[#3d3122] bg-[linear-gradient(180deg,#34373d,#202226)]">
          <div className="min-w-0">
            <h2 style={serif} className="truncate text-[1.05rem] font-bold tracking-wider text-[#f2c46d] [text-shadow:0_2px_0_#000]">
              {title}
            </h2>
            {sub && <div className="truncate text-[11px] text-[#b9a98a]">{sub}</div>}
          </div>
          {actions}
        </header>
      )}
      <div className={`relative flex-1 min-h-0 overflow-y-auto ${bodyClass}`}>{children}</div>
    </section>
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
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
      className={`group relative w-full flex items-center gap-3 text-left px-3 py-2 border transition ${indent ? 'pl-8' : ''} ${
        selected
          ? 'border-[#c99a4b] bg-[linear-gradient(90deg,rgba(242,196,109,0.18),rgba(242,196,109,0.04))]'
          : 'border-transparent hover:border-[#5b4426] hover:bg-white/[0.03]'
      } ${disabled ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
    >
      {selected && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-[70%] w-[3px] bg-[#f2c46d]" />}
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span style={serif} className={`block truncate font-semibold tracking-wide ${selected ? 'text-[#f2c46d]' : 'text-[#efe3c4] group-hover:text-[#f6d58e]'}`}>
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
            {i > 0 && <span className={`mb-[22px] hidden sm:block h-px w-6 ${i <= at ? 'bg-[#c99a4b]' : 'bg-[#4a3a26]'}`} />}
            <button type="button" onClick={() => onPick(s)} className="group flex flex-col items-center gap-1 px-1 outline-none">
              <span
                className={`grid place-items-center w-11 h-11 rotate-45 border-2 transition ${
                  on
                    ? 'border-[#f2c46d] bg-[#3a2a12] shadow-[0_0_18px_rgba(242,196,109,0.45)]'
                    : i < at
                      ? 'border-[#8a6a3a] bg-[#1d1812]'
                      : 'border-[#4a3a26] bg-[#14110d] group-hover:border-[#8a6a3a]'
                }`}
              >
                <span className={`-rotate-45 ${on ? 'text-[#f2c46d]' : 'text-[#b9a98a] group-hover:text-[#efe3c4]'}`}>{icon(s)}</span>
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

/** A big button of the bottom bar: gold for the way on, iron for the way back. */
export function BigButton({
  children,
  onClick,
  tone = 'iron',
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'gold' | 'iron';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={serif}
      className={`relative inline-flex items-center gap-2 px-6 py-2.5 text-[15px] font-bold uppercase tracking-[0.16em] border-2 transition [text-shadow:0_1px_0_#000] ${
        tone === 'gold'
          ? 'border-[#f2c46d] text-[#1c1206] bg-[linear-gradient(180deg,#f6d58e,#c99a4b)] hover:bg-[linear-gradient(180deg,#ffe3a6,#d9a95a)] [text-shadow:none] shadow-[0_0_24px_rgba(242,196,109,0.35)]'
          : 'border-[#8a6a3a] text-[#efe3c4] bg-[linear-gradient(180deg,#34373d,#1c1d21)] hover:border-[#c99a4b] hover:text-[#f2c46d]'
      }`}
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
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[#6b5434] text-[#efe3c4] bg-[linear-gradient(180deg,#2c2f35,#1a1b1f)] hover:border-[#c99a4b] hover:text-[#f2c46d] transition"
    >
      {children}
    </button>
  );
}
