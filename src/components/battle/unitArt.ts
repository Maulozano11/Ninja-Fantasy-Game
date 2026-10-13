// Character sprites for the battle: frames of the sprite system turned into canvases (cached), the
// chakra aura while casting, and small head portraits for the HUD.

import { renderSpriteCached } from '../../sprite/compose';
import { CHAKRA_LOOP, renderChakra } from '../../sprite/chakra';
import type { ChakraMode } from '../../sprite/chakra';
import { dojutsuToEye, getAppearance } from '../../sprite/legacy';
import { frameCount, POSE_FPS, rigPoseFor } from '../../sprite/rig';
import type { Rig } from '../../sprite/rig';
import { GRID, RES } from '../../sprite/raster';
import type { SpriteAppearance, SpritePose } from '../../sprite/types';
import type { Unit } from '../../battle/types';

/** Where the feet touch the ground in a 128x128 frame. */
export const FEET = { x: 64, y: 120 };

/** Pixels a gait moves per frame, so feet don't slide (1x sprite pixels). */
export const STRIDE: Partial<Record<SpritePose, number>> = { walk: 32 / 10, run: 87 / 12, sneak: 30 / 8 };

const looks = new Map<string, SpriteAppearance>();

/** The appearance a unit is drawn with (the weapon stowed when its hands are free for seals). */
export function lookOf(u: Unit): SpriteAppearance | undefined {
  const base = u.look ?? (u.character ? getAppearance(u.character) : undefined);
  if (!base) return undefined;
  const stowed = u.weapon.held && !u.armed;
  const key = `${u.id}|${stowed}`;
  let l = looks.get(key);
  if (!l) {
    l = stowed ? { ...base, stowed: true } : base;
    looks.set(key, l);
  }
  return l;
}

export const framesOf = (look: SpriteAppearance, pose: SpritePose): number => frameCount(rigPoseFor(pose, look.cast?.style));
export const fpsOf = (pose: SpritePose): number => POSE_FPS[pose] ?? 6;

interface Cached {
  canvas: HTMLCanvasElement;
  rig: Rig;
}

const frames = new Map<string, Cached>();
const MAX = 900;

function toCanvas(rgba: Uint8ClampedArray, layers?: { back: Uint8ClampedArray; front: Uint8ClampedArray } | null): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = GRID;
  c.height = GRID;
  const g = c.getContext('2d')!;
  const put = (data: Uint8ClampedArray) => {
    const tmp = document.createElement('canvas');
    tmp.width = GRID;
    tmp.height = GRID;
    tmp.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(data), GRID, GRID), 0, 0);
    g.drawImage(tmp, 0, 0);
  };
  if (layers) put(layers.back);
  put(rgba);
  if (layers) put(layers.front);
  return c;
}

/**
 * One frame of a unit's sprite as a canvas. `aura` adds the chakra burst of a cast or a charge
 * (only if the player turned it on for that moment in the creator).
 */
export function unitFrame(u: Unit, look: SpriteAppearance, pose: SpritePose, frame: number, aura?: { mode: ChakraMode; tick: number }): Cached {
  const n = framesOf(look, pose);
  const f = ((frame % n) + n) % n;
  const eye = dojutsuToEye(u.character?.dojutsu);
  const wantAura = aura && ((aura.mode === 'cast' && look.chakra.onCast) || (aura.mode === 'charge' && look.chakra.onCharge) || aura.mode === 'aura');
  const fxTick = wantAura ? aura!.tick % CHAKRA_LOOP : -1;
  const key = `${u.id}|${look.stowed ? 1 : 0}|${pose}|${f}|${wantAura ? `${aura!.mode}${fxTick}` : ''}`;
  let c = frames.get(key);
  if (c) {
    frames.delete(key);
    frames.set(key, c);
    return c;
  }
  const spr = renderSpriteCached(look, pose, f, eye);
  const fx = wantAura ? renderChakra(look.chakra.color, aura!.mode, fxTick, spr.rgba, spr.rig, look.chakra.tint) : null;
  c = { canvas: toCanvas(spr.rgba, fx), rig: spr.rig };
  frames.set(key, c);
  if (frames.size > MAX) frames.delete(frames.keys().next().value as string);
  return c;
}

const portraits = new Map<string, string>();

/** A small head portrait (a data URL) for the HUD. */
export function portraitOf(u: Unit, size = 44): string | undefined {
  const look = u.look ?? (u.character ? getAppearance(u.character) : undefined);
  if (!look) return undefined;
  const key = `${u.id}|${size}`;
  const hit = portraits.get(key);
  if (hit) return hit;
  const spr = renderSpriteCached(look, 'idle', 0, dojutsuToEye(u.character?.dojutsu));
  const src = toCanvas(spr.rgba);
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const hx = spr.rig.head.x * RES;
  const hy = spr.rig.head.y * RES;
  const crop = 40;
  g.drawImage(src, Math.round(hx - crop / 2), Math.round(hy - crop / 2 + 2), crop, crop, 0, 0, size, size);
  const url = c.toDataURL();
  portraits.set(key, url);
  return url;
}
