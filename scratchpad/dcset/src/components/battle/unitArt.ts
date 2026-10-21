// Character sprites for the battle: frames of the sprite system turned into canvases (cached), the
// chakra aura while casting, and small head portraits for the HUD.

import { renderSpriteCached } from '../../sprite/compose';
import { CHAKRA_LOOP, renderChakra } from '../../sprite/chakra';
import type { ChakraMode } from '../../sprite/chakra';
import { dojutsuToEye, getAppearance } from '../../sprite/legacy';
import { FEET, frameCount, POSE_FPS, rigPoseFor } from '../../sprite/rig';
import type { Rig } from '../../sprite/rig';
import { GRID, opaqueBox, RES } from '../../sprite/raster';
import { phaseFrame } from '../../sprite/phase';
import type { SpriteAppearance, SpritePose } from '../../sprite/types';
import type { Unit } from '../../battle/types';

/** Where the feet touch the ground in a sprite frame (fine pixels). */
export { FEET };

/** Pixels a gait moves per frame, so feet don't slide (1x sprite pixels). */
export const STRIDE: Partial<Record<SpritePose, number>> = { walk: 32 / 10, run: 87 / 12, sneak: 30 / 8 };

// The caches below follow the look itself, not the unit's id: a ninja edited in the creator keeps
// its id, and the next battle must show the new look (its colours, its katana's parts). The battle
// clones its state on every action, so a look is recognised by what it holds, not by its object.
const looks = new Map<string, { src: object; sig: string; look: SpriteAppearance }>();
const lookIds = new WeakMap<SpriteAppearance, number>();
let lookSerial = 0;
const idOf = (l: SpriteAppearance): number => {
  let id = lookIds.get(l);
  if (!id) lookIds.set(l, (id = ++lookSerial));
  return id;
};

/** The appearance a unit is drawn with (the weapon stowed when its hands are free for seals). */
export function lookOf(u: Unit): SpriteAppearance | undefined {
  const src = u.look ?? u.character;
  if (!src) return undefined;
  const stowed = u.weapon.held && !u.armed;
  const key = `${u.id}|${stowed}`;
  const hit = looks.get(key);
  if (hit && hit.src === src) return hit.look;
  const base = u.look ?? getAppearance(u.character!);
  const sig = JSON.stringify(base);
  if (hit && hit.sig === sig) {
    looks.set(key, { ...hit, src });
    return hit.look;
  }
  const l = stowed ? { ...base, stowed: true } : base;
  looks.set(key, { src, sig, look: l });
  return l;
}

const centers = new Map<string, number>();

/**
 * How far right of the feet the drawn body sits, facing right (cape and weapon included): the
 * weighted middle of the shoulders-to-hips band of the idle frame. Auras centre on it, so a cape or
 * a sword hanging to one side doesn't leave the ninja off-centre in the aura.
 */
export function bodyCenterDx(u: Unit, look: SpriteAppearance): number {
  const key = `${idOf(look)}|${u.character?.dojutsu ?? ''}`;
  const hit = centers.get(key);
  if (hit !== undefined) return hit;
  const spr = renderSpriteCached(look, 'idle', 0, dojutsuToEye(u.character?.dojutsu));
  const y0 = Math.max(0, Math.round((spr.rig.neck.y + 0.5) * RES));
  const y1 = Math.min(GRID - 1, Math.round((spr.rig.pelvis.y + 0.5) * RES) + 10 * RES);
  let sum = 0;
  let sumX = 0;
  for (let y = y0; y <= y1; y++)
    for (let x = 0; x < GRID; x++) {
      const a = spr.rgba[(y * GRID + x) * 4 + 3];
      sum += a;
      sumX += a * (x + 0.5);
    }
  const dx = sum ? Math.round(sumX / sum - FEET.x) : 0;
  centers.set(key, dx);
  return dx;
}

export const framesOf = (look: SpriteAppearance, pose: SpritePose): number => frameCount(rigPoseFor(pose, look.cast?.style));
export const fpsOf = (pose: SpritePose): number => POSE_FPS[pose] ?? 6;

interface Cached {
  /** Only the frame's drawn pixels: its top-left is (ox, oy) of the frame. */
  canvas: HTMLCanvasElement;
  ox: number;
  oy: number;
  rig: Rig;
}

const frames = new Map<string, Cached>();
const MAX = 900;

/** A frame (and its aura) as a canvas trimmed to its drawn pixels: the frame is big, the figure small. */
function toCanvas(rgba: Uint8ClampedArray, layers?: { back: Uint8ClampedArray; front: Uint8ClampedArray } | null): { canvas: HTMLCanvasElement; ox: number; oy: number } {
  const box = opaqueBox(rgba, layers?.back, layers?.front) ?? { x: 0, y: 0, w: 1, h: 1 };
  const c = document.createElement('canvas');
  c.width = box.w;
  c.height = box.h;
  const g = c.getContext('2d')!;
  const put = (data: Uint8ClampedArray) => {
    const tmp = document.createElement('canvas');
    tmp.width = box.w;
    tmp.height = box.h;
    tmp.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(data), GRID, GRID), -box.x, -box.y, box.x, box.y, box.w, box.h);
    g.drawImage(tmp, 0, 0);
  };
  if (layers) put(layers.back);
  put(rgba);
  if (layers) put(layers.front);
  return { canvas: c, ox: box.x, oy: box.y };
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
  const key = `${idOf(look)}|${eye}|${pose}|${f}|${wantAura ? `${aura!.mode}${fxTick}` : ''}`;
  let c = frames.get(key);
  if (c) {
    frames.delete(key);
    frames.set(key, c);
    return c;
  }
  const spr = renderSpriteCached(look, pose, f, eye);
  const fx = wantAura ? renderChakra(look.chakra.color, aura!.mode, fxTick, spr.rgba, spr.rig, look.chakra.tint) : null;
  c = { ...toCanvas(spr.rgba, fx), rig: spr.rig };
  frames.set(key, c);
  if (frames.size > MAX) frames.delete(frames.keys().next().value as string);
  return c;
}

const phases = new Map<string, Cached>();
const PHASE_MAX = 120;

/**
 * One frame of a unit's sprite as its Ryusei phase body (sprite/phase.ts): the frame turned into
 * blue light, with its glow. Made once per look, pose and frame, like the frames themselves.
 */
export function phaseFrameOf(u: Unit, look: SpriteAppearance, pose: SpritePose, frame: number): Cached {
  const n = framesOf(look, pose);
  const f = ((frame % n) + n) % n;
  const eye = dojutsuToEye(u.character?.dojutsu);
  const key = `${idOf(look)}|${eye}|${pose}|${f}`;
  let c = phases.get(key);
  if (c) {
    phases.delete(key);
    phases.set(key, c);
    return c;
  }
  const spr = renderSpriteCached(look, pose, f, eye);
  c = { ...toCanvas(phaseFrame(spr)), rig: spr.rig };
  phases.set(key, c);
  if (phases.size > PHASE_MAX) phases.delete(phases.keys().next().value as string);
  return c;
}

/** Whether a unit's phase frame is made already (the screen makes the missing ones a few at a time, ahead of need). */
export function hasPhaseFrame(u: Unit, look: SpriteAppearance, pose: SpritePose, frame: number): boolean {
  const n = framesOf(look, pose);
  return phases.has(`${idOf(look)}|${dojutsuToEye(u.character?.dojutsu)}|${pose}|${((frame % n) + n) % n}`);
}

const portraits = new Map<string, { src: object; sig: string; url: string }>();

/** A small head portrait (a data URL) for the HUD. */
export function portraitOf(u: Unit, size = 44): string | undefined {
  const from = u.look ?? u.character;
  if (!from) return undefined;
  const key = `${u.id}|${size}`;
  const hit = portraits.get(key);
  if (hit && hit.src === from) return hit.url;
  const look = u.look ?? getAppearance(u.character!);
  const sig = `${JSON.stringify(look)}|${u.character?.dojutsu ?? ''}`;
  if (hit && hit.sig === sig) {
    portraits.set(key, { ...hit, src: from });
    return hit.url;
  }
  const spr = renderSpriteCached(look, 'idle', 0, dojutsuToEye(u.character?.dojutsu));
  const { canvas: src, ox, oy } = toCanvas(spr.rgba);
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const hx = spr.rig.head.x * RES;
  const hy = spr.rig.head.y * RES;
  const crop = 40;
  g.drawImage(src, Math.round(hx - crop / 2) - ox, Math.round(hy - crop / 2 + 2) - oy, crop, crop, 0, 0, size, size);
  const url = c.toDataURL();
  portraits.set(key, { src: from, sig, url });
  return url;
}
