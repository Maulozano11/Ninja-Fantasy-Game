import React, { useEffect, useRef } from 'react';
import { renderChakra } from '../../sprite/chakra';
import { renderSpriteCached } from '../../sprite/compose';
import { GRID, RES, opaqueBox } from '../../sprite/raster';
import type { ChakraColorId, EyeSpecial, SpriteAppearance } from '../../sprite/types';
import { blendOver } from '../ShinobiSpriteCanvas';

/** The crop (fine pixels) around the ninja: its body and the burst close around it. */
const W = 74;
const H = 104;

/**
 * The ninja charging chakra with one burst, as a still: a chakra type's card in the creator. It
 * keeps the ninja's chakra color, so every type shows in the color the player chose.
 */
export const BurstThumb: React.FC<{ look: SpriteAppearance; burst: ChakraColorId; eye?: EyeSpecial }> = ({ look, burst, eye = 'none' }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const spr = renderSpriteCached(look, 'charge', 0, eye);
    const fx = renderChakra(burst, 'charge', 6, spr.rgba, spr.rig, look.chakra.tint);
    const out = new Uint8ClampedArray(GRID * GRID * 4);
    blendOver(out, fx.back);
    blendOver(out, spr.rgba);
    blendOver(out, fx.front);
    const box = opaqueBox(spr.rgba);
    const cx = Math.round(spr.rig.pelvis.x * RES);
    const x0 = Math.max(0, Math.min(GRID - W, cx - W / 2));
    const y0 = Math.max(0, Math.min(GRID - H, (box?.y ?? 0) - 8));
    ctx.clearRect(0, 0, W, H);
    ctx.putImageData(new ImageData(out, GRID, GRID), -x0, -y0, x0, y0, W, H);
  }, [look, burst, eye]);
  return <canvas ref={ref} width={W} height={H} className="pixelated" style={{ width: W, height: H, imageRendering: 'pixelated' }} />;
};
