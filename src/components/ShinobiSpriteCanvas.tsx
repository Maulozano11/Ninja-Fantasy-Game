import React, { useEffect, useMemo, useRef } from 'react';
import { ShinobiCharacter } from '../types/shinobi';
import { renderSpriteCached } from '../sprite/compose';
import { CHAKRA_LOOP, ChakraMode, renderChakra } from '../sprite/chakra';
import { dojutsuToEye, getAppearance } from '../sprite/legacy';
import { frameCount, GROUND, POSE_FPS } from '../sprite/rig';
import { GRID, RES } from '../sprite/raster';
import { subscribeTick, TICK_FPS } from '../sprite/ticker';
import type { SpriteAppearance, SpritePose } from '../sprite/types';

export interface ShinobiSpriteCanvasProps {
  character: ShinobiCharacter;
  /** Draw this appearance instead of the character's own (live preview in the creator). */
  appearance?: SpriteAppearance;
  stance?: SpritePose;
  /** Display size in CSS pixels (the sprite itself is always 128x128). */
  size?: number;
  isEnhanced?: boolean;
  className?: string;
  showAura?: boolean;
  showShadow?: boolean;
}

/** Alpha-composites `src` over `dst` (both 64x64 RGBA). */
export function blendOver(dst: Uint8ClampedArray, src: Uint8ClampedArray): void {
  for (let i = 0; i < dst.length; i += 4) {
    const a = src[i + 3];
    if (!a) continue;
    if (a === 255) {
      dst[i] = src[i];
      dst[i + 1] = src[i + 1];
      dst[i + 2] = src[i + 2];
      dst[i + 3] = 255;
      continue;
    }
    const t = a / 255;
    const da = dst[i + 3] / 255;
    const oa = t + da * (1 - t);
    dst[i] = (src[i] * t + dst[i] * da * (1 - t)) / oa;
    dst[i + 1] = (src[i + 1] * t + dst[i + 1] * da * (1 - t)) / oa;
    dst[i + 2] = (src[i + 2] * t + dst[i + 2] * da * (1 - t)) / oa;
    dst[i + 3] = oa * 255;
  }
}

/** Soft pixel ellipse under the feet; `cx` in fine pixels. */
function drawShadow(dst: Uint8ClampedArray, cx: number): void {
  const g = GROUND * RES;
  const cy = g - 1;
  for (let y = g - 5; y <= g + 4; y++) {
    for (let x = Math.floor(cx - 26); x <= Math.ceil(cx + 26); x++) {
      if (x < 0 || x >= GRID || y < 0 || y >= GRID) continue;
      const dx = (x + 0.5 - cx) / 24;
      const dy = (y + 0.5 - cy) / 4.5;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      const i = (y * GRID + x) * 4;
      dst[i] = 6;
      dst[i + 1] = 8;
      dst[i + 2] = 16;
      dst[i + 3] = d < 0.45 ? 120 : 70;
    }
  }
}

export const ShinobiSpriteCanvas: React.FC<ShinobiSpriteCanvasProps> = ({
  character,
  appearance,
  stance = 'idle',
  size = 256,
  isEnhanced = false,
  className = '',
  showAura = true,
  showShadow = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const look = useMemo(() => appearance ?? getAppearance(character), [appearance, character]);
  const eye = dojutsuToEye(character.dojutsu);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const img = ctx.createImageData(GRID, GRID);
    // Which chakra effect plays: the burst for charge/cast/victory (if the
    // player enabled it), otherwise the subtle aura while empowered.
    const c = look.chakra;
    let mode: ChakraMode | null = null;
    if (showAura) {
      if (stance === 'charge' && c.onCharge) mode = 'charge';
      else if (stance === 'cast' && c.onCast) mode = 'cast';
      else if (stance === 'victory' && c.onVictory) mode = 'victory';
      else if (isEnhanced) mode = 'aura';
    }
    let lastKey = '';
    return subscribeTick((tick) => {
      const frame = Math.floor((tick * POSE_FPS[stance]) / TICK_FPS) % frameCount(stance);
      const fxTick = tick % CHAKRA_LOOP;
      const key = mode ? `${frame}|${fxTick}` : `${frame}`;
      if (key === lastKey) return;
      lastKey = key;
      const spr = renderSpriteCached(look, stance, frame, eye);
      const out = img.data;
      out.fill(0);
      if (showShadow) drawShadow(out, spr.rig.pelvis.x * RES + 1);
      const fx = mode ? renderChakra(c.color, mode, fxTick, spr.rgba, spr.rig) : null;
      if (fx) blendOver(out, fx.back);
      blendOver(out, spr.rgba);
      if (fx) blendOver(out, fx.front);
      ctx.putImageData(img, 0, 0);
    });
  }, [look, stance, eye, isEnhanced, showAura, showShadow]);

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        width={GRID}
        height={GRID}
        className="w-full h-full pointer-events-none pixelated"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};
