// The owner's pixel-art battle interface kit (src/assets/ui_battle, approved 2026-10-20), as React
// pieces. Every piece is drawn at its screen size on a 1600x900 layout (each art pixel is 2x2 screen
// pixels); the HUD scales the whole layout by one factor so the art stays even.

import React from 'react';
import manifest from '../../assets/ui_battle/manifest.json';

const FILES = import.meta.glob('../../assets/ui_battle/*.png', { eager: true, import: 'default' }) as Record<string, string>;
/** The owner's painted skill icons, by jutsu id (and weapon_attack), each at 44x44 and @2x 88x88. */
const ICONS = import.meta.glob('../../assets/ui_icons/*.png', { eager: true, import: 'default' }) as Record<string, string>;

interface Spec {
  file: string;
  size: [number, number];
  slice?: [number, number, number, number];
  window?: { x: number; y: number; w: number; h: number; shape: string };
}
const PIECES = manifest.pieces as unknown as Record<string, Spec>;
export type PieceId = keyof typeof manifest.pieces;

export const spec = (p: PieceId): Spec => PIECES[p];
const url = (p: PieceId): string => FILES[`../../assets/ui_battle/${PIECES[p].file}`];

/** The painted icon for a skill (jutsu id, or 'weapon_attack'); the @2x file when the screen is dense. */
export function iconUrl(id: string, dense: boolean): string | undefined {
  return (dense && ICONS[`../../assets/ui_icons/${id}@2x.png`]) || ICONS[`../../assets/ui_icons/${id}.png`];
}

type Box = { x?: number; y?: number; w?: number; h?: number };

/**
 * A kit piece placed at x, y (when given) on the layout. A sliced piece stretches to w x h with its
 * corners kept (CSS border-image); a whole piece keeps its own size unless w or h say otherwise.
 */
export function Piece({
  p,
  x,
  y,
  w,
  h,
  className,
  style,
  children,
  ...rest
}: Box & { p: PieceId; className?: string; style?: React.CSSProperties; children?: React.ReactNode } & Omit<React.HTMLAttributes<HTMLDivElement>, 'style'>) {
  const s = PIECES[p];
  const width = w ?? s.size[0];
  const height = h ?? s.size[1];
  const at: React.CSSProperties = x !== undefined || y !== undefined ? { position: 'absolute', left: x ?? 0, top: y ?? 0 } : { position: 'relative' };
  const art: React.CSSProperties = s.slice
    ? {
        borderStyle: 'solid',
        borderWidth: s.slice.map((n) => `${n}px`).join(' '),
        borderImageSource: `url(${url(p)})`,
        borderImageSlice: `${s.slice.join(' ')} fill`,
        borderImageRepeat: 'repeat',
        boxSizing: 'border-box',
      }
    : { backgroundImage: `url(${url(p)})`, backgroundSize: '100% 100%' };
  return (
    <div {...rest} className={className} style={{ ...at, width, height, imageRendering: 'pixelated', ...art, ...style }}>
      {children}
    </div>
  );
}

/** The HUD's scale: whole half-steps from 1600x900 up (so art pixels stay even), smoothly below it. */
export function useHudScale(el: React.RefObject<HTMLElement | null>): number {
  const [k, setK] = React.useState(1);
  React.useLayoutEffect(() => {
    const node = el.current;
    if (!node) return;
    const fit = () => {
      const r = node.getBoundingClientRect();
      const f = Math.min(r.width / 1600, r.height / 900);
      setK(f >= 1 ? Math.floor(f * 2) / 2 : Math.max(0.55, f));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(node);
    return () => ro.disconnect();
  }, [el]);
  return k;
}

/**
 * One corner (or edge middle) of the layout: its children are placed in layout pixels relative to
 * that anchor and scaled by k from it.
 */
export function Anchor({
  at,
  k,
  children,
  innerRef,
  className,
}: {
  at: 'top-left' | 'top' | 'top-right' | 'bottom-left' | 'bottom' | 'bottom-right';
  k: number;
  children: React.ReactNode;
  innerRef?: (el: HTMLDivElement | null) => void;
  className?: string;
}) {
  const v = at.startsWith('top') ? 'top' : 'bottom';
  const hz = at.endsWith('left') ? 'left' : at.endsWith('right') ? 'right' : 'center';
  const style: React.CSSProperties = {
    position: 'absolute',
    [v]: 0,
    ...(hz === 'center' ? { left: '50%' } : { [hz]: 0 }),
    width: 0,
    height: 0,
    transform: `scale(${k})`,
    transformOrigin: `${hz === 'center' ? 'left' : hz} ${v}`,
  };
  return (
    <div ref={innerRef} className={className} style={style}>
      {children}
    </div>
  );
}

/** Pixel-style label text: light, with a dark one-pixel outline so it reads on any art. */
export const kitText: React.CSSProperties = {
  color: '#efe6cf',
  textShadow: '1px 0 0 #120d08, -1px 0 0 #120d08, 0 1px 0 #120d08, 0 -1px 0 #120d08, 1px 1px 0 #120d08',
  fontWeight: 700,
  letterSpacing: '0.01em',
  whiteSpace: 'nowrap',
};
