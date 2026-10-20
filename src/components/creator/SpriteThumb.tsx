import React, { useEffect, useRef } from 'react';
import { renderSpriteCached } from '../../sprite/compose';
import { BOX, GRID, RES } from '../../sprite/raster';
import type { EyeSpecial, SpriteAppearance, SpritePose } from '../../sprite/types';

/** Body crop (fine pixels, inside the figure's box) and head crop size, shown at whole-pixel zoom so nothing blurs. */
const FULL = { x: BOX.x + 18, y: BOX.y + 12, w: 92, h: 114 };
const HEAD = 44;

/** Static (non-animated) sprite preview, optionally cropped to the head. */
export const SpriteThumb: React.FC<{
  look: SpriteAppearance;
  eye?: EyeSpecial;
  crop?: 'full' | 'head';
  pose?: SpritePose;
  /** Whole-number zoom; defaults to 1 for full body and 2 for heads. */
  zoom?: number;
}> = ({ look, eye = 'none', crop = 'full', pose = 'idle', zoom }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const z = zoom ?? (crop === 'head' ? 2 : 1);
  const w = crop === 'head' ? HEAD : FULL.w;
  const h = crop === 'head' ? HEAD : FULL.h;
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const f = renderSpriteCached(look, pose, 0, eye);
    const img = new ImageData(new Uint8ClampedArray(f.rgba), GRID, GRID);
    let x0 = FULL.x;
    let y0 = FULL.y;
    if (crop === 'head') {
      x0 = Math.max(0, Math.min(GRID - HEAD, f.rig.head.x * RES - HEAD / 2));
      y0 = Math.max(0, Math.min(GRID - HEAD, f.rig.head.y * RES - HEAD / 2 - 3));
    }
    ctx.clearRect(0, 0, w, h);
    ctx.putImageData(img, -x0, -y0, x0, y0, w, h);
  }, [look, eye, crop, pose, w, h]);
  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      className="pixelated"
      style={{ width: w * z, height: h * z, imageRendering: 'pixelated' }}
    />
  );
};
