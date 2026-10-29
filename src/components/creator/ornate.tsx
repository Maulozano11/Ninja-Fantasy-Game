import React from 'react';

// The owner's creator pieces (2026-10-28, docs/reference/creator-ui-sheet-owner-reference.png, cut
// by tools/refs/creator-ui-assets.py into src/assets/ui_creator/): black panels with a thin gold
// filigree, ornate corners and red diamond gems; his step diamonds, group rows, swatches, arrows,
// icons and, from his battle sheet, the gem buttons. His pixels are never redrawn: frames of any
// size are put together from his corners, edges and gems, so those are never stretched.

const FILES = import.meta.glob('../../assets/ui_creator/*.png', { eager: true, import: 'default' }) as Record<string, string>;

/** The url of one of his pieces by name (e.g. 'step_active', 'icon_body', 'btn_red'). */
export function ui(name: string): string {
  return FILES[`../../assets/ui_creator/${name}.png`] ?? '';
}

const img = (name: string): React.CSSProperties => ({ backgroundImage: `url(${ui(name)})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' });

/**
 * A piece stretched between its own caps (CSS border-image): `slice` source px of each side stay as
 * they are, shown at `edge` CSS px; the middle stretches. For rows and buttons of any width.
 */
export function sliced(name: string, slice: number | string, edge: number | string): React.CSSProperties {
  return {
    borderStyle: 'solid',
    borderColor: 'transparent',
    borderWidth: typeof edge === 'number' ? `${edge}px` : edge,
    borderImageSource: `url(${ui(name)})`,
    borderImageSlice: `${slice} fill`,
    borderImageWidth: typeof edge === 'number' ? `${edge}px` : edge,
    borderImageRepeat: 'stretch',
    backgroundClip: 'padding-box',
  };
}

/**
 * His panel, any size: his four corners and two red gems at `c` CSS px, his edge lines stretched
 * between them, his dark fill inside. Children sit in the inner area.
 */
export function OrnatePanel({ c = 30, gems = true, className = '', style, children }: { c?: number; gems?: boolean; className?: string; style?: React.CSSProperties; children?: React.ReactNode }) {
  const gw = c * 1.5;
  const part = (name: string, s: React.CSSProperties) => <span aria-hidden className="absolute pointer-events-none" style={{ ...img(`panel_c_${name}`), imageRendering: 'auto', ...s }} />;
  return (
    <div className={`${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative'} ${className}`} style={style}>
      {part('fill', { left: c * 0.4, right: c * 0.4, top: c * 0.4, bottom: c * 0.4 })}
      {part('top', { left: c, right: c, top: 0, height: c })}
      {part('bottom', { left: c, right: c, bottom: 0, height: c })}
      {part('left', { top: c, bottom: c, left: 0, width: c })}
      {part('right', { top: c, bottom: c, right: 0, width: c })}
      {part('tl', { left: 0, top: 0, width: c, height: c })}
      {part('tr', { right: 0, top: 0, width: c, height: c })}
      {part('bl', { left: 0, bottom: 0, width: c, height: c })}
      {part('br', { right: 0, bottom: 0, width: c, height: c })}
      {gems && part('gem_top', { left: `calc(50% - ${gw / 2}px)`, top: 0, width: gw, height: c })}
      {gems && part('gem_bottom', { left: `calc(50% - ${gw / 2}px)`, bottom: 0, width: gw, height: c })}
      {children}
    </div>
  );
}

/** One of his round gold icons (icon_body, icon_head, icon_origin, ...). */
export function UiIcon({ name, size = 28, className = '' }: { name: string; size?: number; className?: string }) {
  return <img src={ui(name)} alt="" aria-hidden draggable={false} width={size} height={size} className={`shrink-0 select-none ${className}`} style={{ width: size, height: size }} />;
}

/** His carousel arrow (lit on hover), for strips that scroll. */
export function UiArrow({ dir, onClick, title }: { dir: 'left' | 'right'; onClick: () => void; title?: string }) {
  const [hot, setHot] = React.useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      className="shrink-0 w-6 h-12 grid place-items-center"
    >
      <img src={ui(`arrow_${dir}${hot ? '_lit' : ''}`)} alt="" aria-hidden draggable={false} className="w-6 h-12 object-contain" />
    </button>
  );
}

/**
 * The custom colour button the owner asked for on every colour (2026-10-28: "el botón de color
 * personalizado a cada cosa"): a colour wheel with a + in a black-and-gold box, the native colour
 * picker under it. Its own painted piece waits for his card 10b sheet; until then the wheel is CSS.
 */
export function CustomColor({ value, onChange, title, size = 28 }: { value: string; onChange: (hex: string) => void; title?: string; size?: number }) {
  return (
    <label
      title={title}
      className="relative shrink-0 cursor-pointer border-2 border-[#d9b46a] bg-[#0e0b09] shadow-[0_0_8px_rgba(242,196,109,0.35)] hover:shadow-[0_0_12px_rgba(242,196,109,0.7)] transition"
      style={{ width: size, height: size }}
    >
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
      <span
        aria-hidden
        className="absolute inset-[3px] rounded-full"
        style={{ background: 'conic-gradient(#ff3b3b, #ffb43b, #f5ff3b, #3bff6a, #3be5ff, #3b5bff, #c23bff, #ff3b3b)' }}
      />
      <span aria-hidden className="absolute inset-[30%] rounded-full grid place-items-center text-[10px] font-bold leading-none text-white" style={{ backgroundColor: value }}>
        +
      </span>
    </label>
  );
}
