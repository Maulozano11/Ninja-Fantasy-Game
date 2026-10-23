import React, { useEffect, useMemo, useRef } from 'react';
import { ShinobiCharacter } from '../types/shinobi';
import { renderSpriteCached } from '../sprite/compose';
import { ChakraMode, chakraLoop, renderChakra } from '../sprite/chakra';
import { dojutsuToEye, getAppearance } from '../sprite/legacy';
import { COMBO_TURNED, FEET, frameCount, GROUND, POSE_FPS, rigPoseFor } from '../sprite/rig';
import { BOX, GRID, RES } from '../sprite/raster';
import { subscribeTick, TICK_FPS } from '../sprite/ticker';
import type { CastStyle, SpriteAppearance, SpritePose } from '../sprite/types';

export interface ShinobiSpriteCanvasProps {
  character: ShinobiCharacter;
  /** Draw this appearance instead of the character's own (live preview in the creator). */
  appearance?: SpriteAppearance;
  stance?: SpritePose;
  /** Cast style to show for the 'cast' stance (a jutsu's own style); defaults to the look's. */
  castStyle?: CastStyle;
  /** Display size in CSS pixels of the part shown (see `frame`). */
  size?: number;
  /**
   * 'body' (the default) shows the figure's 128 x 128 box, as cards and lists always have; 'full'
   * shows the whole frame, with the room around the figure for long weapons and effects.
   */
  frame?: 'body' | 'full';
  isEnhanced?: boolean;
  className?: string;
  showAura?: boolean;
  showShadow?: boolean;
}

/** The whole frame, for `frame: 'full'`. */
const WHOLE = { x: 0, y: 0, w: GRID, h: GRID };

/** Alpha-composites `src` over `dst` (two RGBA buffers of the same size). */
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

/** Mirrors a GRID x GRID RGBA buffer left to right about the column `cx` (fine px), in place. */
function mirrorAbout(buf: Uint8ClampedArray, cx: number): void {
  const row = new Uint8ClampedArray(GRID * 4);
  for (let y = 0; y < GRID; y++) {
    const o = y * GRID * 4;
    row.set(buf.subarray(o, o + GRID * 4));
    buf.fill(0, o, o + GRID * 4);
    for (let x = 0; x < GRID; x++) {
      const m = 2 * cx - 1 - x;
      if (m < 0 || m >= GRID) continue;
      buf.set(row.subarray(x * 4, x * 4 + 4), o + m * 4);
    }
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
  castStyle,
  size = 256,
  isEnhanced = false,
  className = '',
  showAura = true,
  showShadow = true,
  frame: view = 'body',
}) => {
  const win = view === 'full' ? WHOLE : BOX;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const look = useMemo(() => {
    const base = appearance ?? getAppearance(character);
    return castStyle ? { ...base, cast: { ...(base.cast ?? { style: castStyle }), style: castStyle } } : base;
  }, [appearance, character, castStyle]);
  const eye = dojutsuToEye(character.dojutsu);
  // when Battle Static's loop started: kept across appearance edits, so only a new stance or burst restarts it
  const fxStart = useRef({ key: '', t0: 0 });

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
    // Battle Static's loop starts when the stance does, so a victory opens with its burst of bolts;
    // the other bursts keep running on the shared tick as before
    const startKey = c.color === 'cyan' && mode ? `${stance}|${mode}|${isEnhanced}` : '';
    return subscribeTick((tick) => {
      const frame = Math.floor((tick * POSE_FPS[stance]) / TICK_FPS) % frameCount(rigPoseFor(stance, look.cast?.style));
      if (fxStart.current.key !== startKey) fxStart.current = { key: startKey, t0: tick };
      const fxTick = (startKey ? tick - fxStart.current.t0 : tick) % chakraLoop(c.color);
      const key = mode ? `${frame}|${fxTick}` : `${frame}`;
      if (key === lastKey) return;
      lastKey = key;
      const spr = renderSpriteCached(look, stance, frame, eye);
      const out = img.data;
      out.fill(0);
      if (showShadow) drawShadow(out, spr.rig.pelvis.x * RES + 1);
      // with the chakra aura on, a charge, a cast or a victory plays empowered too (Battle Static crackles harder)
      const fx = mode ? renderChakra(c.color, mode, fxTick, spr.rgba, spr.rig, c.tint, isEnhanced) : null;
      if (fx) blendOver(out, fx.back);
      blendOver(out, spr.rgba);
      if (fx) blendOver(out, fx.front);
      // The combo's spin shows the ninja turned away for a moment, as in battle (renderer.ts: about the feet's column).
      if (stance === 'combo' && COMBO_TURNED.includes(frame)) mirrorAbout(out, FEET.x);
      ctx.putImageData(img, -win.x, -win.y, win.x, win.y, win.w, win.h);
    });
  }, [look, stance, eye, isEnhanced, showAura, showShadow, win]);

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        width={win.w}
        height={win.h}
        className="w-full h-full pointer-events-none pixelated"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};
