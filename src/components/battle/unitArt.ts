// Character sprites for the battle: frames of the sprite system turned into canvases (cached), the
// chakra aura while casting, and small head portraits for the HUD.

import { renderSpriteCached } from '../../sprite/compose';
import { chakraLoop, renderChakra } from '../../sprite/chakra';
import type { ChakraMode } from '../../sprite/chakra';
import { dojutsuToEye, getAppearance } from '../../sprite/legacy';
import { FEET, frameCount, POSE_FPS, rigPoseFor } from '../../sprite/rig';
import type { Rig } from '../../sprite/rig';
import { GRID, opaqueBox, RES } from '../../sprite/raster';
import { phaseBody, phaseFrame } from '../../sprite/phase';
import { catchLook, releaseClear, renderThrown, thrownItem } from '../../sprite/thrown';
import { throwRelease } from '../../sprite/grip';
import { COAT_FRAMES, coatPixels } from '../../sprite/coat';
import { imbueLayers } from '../../sprite/imbue';
import type { ImbueFx } from '../../sprite/imbue';
import type { ChakraColorId, SpriteAppearance, SpritePose } from '../../sprite/types';
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

/** Layer `b` drawn over layer `a` (both GRID x GRID RGBA), as a new buffer. */
function over(a: Uint8ClampedArray, b: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(a);
  for (let i = 0; i < out.length; i += 4) {
    const sa = b[i + 3] / 255;
    if (!sa) continue;
    const da = out[i + 3] / 255;
    const oa = sa + da * (1 - sa);
    for (let c = 0; c < 3; c++) out[i + c] = (b[i + c] * sa + out[i + c] * da * (1 - sa)) / oa;
    out[i + 3] = oa * 255;
  }
  return out;
}

/** The element on a unit's weapon (Weapon Element Enhancement): which, the tick of its loop, and the chakra colour its energy takes. */
export interface ImbueView {
  fx: ImbueFx;
  tick: number;
  tint?: string;
}

/**
 * One frame of a unit's sprite as a canvas. `aura` adds the chakra burst of a cast or a charge
 * (only if the player turned it on for that moment in the creator), `empowered` for an enhanced jutsu.
 * `imbue` draws the element on the weapon in hand (sprite/imbue.ts; nothing when the frame holds none).
 * `coat`: the weapons are coated with poison (sprite/coat.ts), at this tick of the drip.
 */
export function unitFrame(
  u: Unit,
  look: SpriteAppearance,
  pose: SpritePose,
  frame: number,
  aura?: { mode: ChakraMode; tick: number; empowered?: boolean; burst?: { color: ChakraColorId; tint?: string } },
  imbue?: ImbueView,
  coat?: number,
): Cached {
  const n = framesOf(look, pose);
  const f = ((frame % n) + n) % n;
  const eye = dojutsuToEye(u.character?.dojutsu);
  // `burst`: another burst than the ninja's own (a charged hand's Battle Static crackling round it).
  const color = aura?.burst?.color ?? look.chakra.color;
  const tint = aura?.burst ? aura.burst.tint : look.chakra.tint;
  const wantAura = aura && (!!aura.burst || (aura.mode === 'cast' && look.chakra.onCast) || (aura.mode === 'charge' && look.chakra.onCharge) || aura.mode === 'aura');
  const fxTick = wantAura ? aura!.tick % chakraLoop(color) : -1;
  const coatTick = coat === undefined ? -1 : ((coat % COAT_FRAMES) + COAT_FRAMES) % COAT_FRAMES;
  const key = `${idOf(look)}|${eye}|${pose}|${f}|${wantAura ? `${aura!.mode}${aura!.empowered ? '+' : ''}${fxTick}${aura!.burst ? `|${color}:${tint ?? ''}` : ''}` : ''}${imbue ? `|w:${imbue.fx}${imbue.tick}:${imbue.tint ?? ''}` : ''}${coatTick >= 0 ? `|coat${coatTick}` : ''}`;
  let c = frames.get(key);
  if (c) {
    frames.delete(key);
    frames.set(key, c);
    return c;
  }
  const spr = renderSpriteCached(look, pose, f, eye);
  let fx = wantAura ? renderChakra(color, aura!.mode, fxTick, spr.rgba, spr.rig, tint, aura!.empowered) : null;
  const w = imbue ? imbueLayers(look, pose, f, imbue.fx, imbue.tick, imbue.tint, eye) : null;
  if (w) fx = fx ? { back: over(fx.back, w.back), front: over(fx.front, w.front) } : w;
  c = { ...toCanvas(coatTick >= 0 ? coatPixels(spr, coatTick) : spr.rgba, fx), rig: spr.rig };
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

/** Whether a unit's plain frame (no aura) is made already: see hasPhaseFrame. */
export function hasUnitFrame(u: Unit, look: SpriteAppearance, pose: SpritePose, frame: number): boolean {
  const n = framesOf(look, pose);
  return frames.has(`${idOf(look)}|${dojutsuToEye(u.character?.dojutsu)}|${pose}|${((frame % n) + n) % n}|`);
}

const catches = new WeakMap<SpriteAppearance, SpriteAppearance>();

/** The look a Shooting-Star Thrust catches its thrown weapon with (sprite/thrown.ts catchLook), one object per look so its frames are kept. */
export function catchLookOf(look: SpriteAppearance): SpriteAppearance {
  let c = catches.get(look);
  if (!c) catches.set(look, (c = catchLook(look)));
  return c;
}

export interface ThrownCanvas {
  canvas: HTMLCanvasElement;
  /** The weapon's phase light round it (sprite/phase.ts), the same size: added as light, it glows blue. */
  glow: HTMLCanvasElement;
  /** The pixel of both canvases the weapon is anchored on (where the fist held it). */
  gx: number;
  gy: number;
  /** How far the weapon reaches behind the anchor (its pommel) and ahead of it (its point), along its angle (pixels). */
  back: number;
  front: number;
}

const thrown = new Map<string, ThrownCanvas>();
// Room for every Ryusei's flights with its weapon drawn and stowed (renderer.ts warmPhases makes both).
const THROWN_MAX = 480;
const thrownKey = (look: SpriteAppearance, angle: number): string => `${idOf(look)}|${thrownItem(look)}|${Math.round(angle)}`;

/**
 * A Shooting-Star Thrust's thrown weapon at a whole-degree angle (a figure facing right; mirror it for one
 * facing left): the item's own art turned with RotSprite (sprite/thrown.ts), made once per look
 * and angle.
 */
export function thrownFrame(look: SpriteAppearance, angle: number): ThrownCanvas {
  const key = thrownKey(look, angle);
  let c = thrown.get(key);
  if (c) {
    thrown.delete(key);
    thrown.set(key, c);
    return c;
  }
  const t = renderThrown(look, Math.round(angle));
  const light = phaseBody(t.rgba, GRID, GRID);
  // Both on the glow's box (it reaches past the weapon).
  const box = opaqueBox(light) ?? { x: 0, y: 0, w: 1, h: 1 };
  const cut = (rgba: Uint8ClampedArray): HTMLCanvasElement => {
    const cv = document.createElement('canvas');
    cv.width = box.w;
    cv.height = box.h;
    cv.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(rgba), GRID, GRID), -box.x, -box.y, box.x, box.y, box.w, box.h);
    return cv;
  };
  // Its reach along its angle, from the anchor: where a trail starts behind it and a glint at its point.
  const ux = Math.cos((Math.round(angle) * Math.PI) / 180);
  const uy = Math.sin((Math.round(angle) * Math.PI) / 180);
  let back = 0;
  let front = 0;
  for (let y = box.y; y < box.y + box.h; y++)
    for (let x = box.x; x < box.x + box.w; x++) {
      if (t.rgba[(y * GRID + x) * 4 + 3] < 128) continue;
      const along = (x + 0.5 - t.grip.x) * ux + (y + 0.5 - t.grip.y) * uy;
      if (-along > back) back = -along;
      if (along > front) front = along;
    }
  c = { canvas: cut(t.rgba), glow: cut(light), gx: t.grip.x - box.x, gy: t.grip.y - box.y, back, front };
  thrown.set(key, c);
  if (thrown.size > THROWN_MAX) thrown.delete(thrown.keys().next().value as string);
  return c;
}

export const hasThrownFrame = (look: SpriteAppearance, angle: number): boolean => thrown.has(thrownKey(look, angle));

const clears = new Map<number, number>();

/**
 * How far ahead of the fist a unit's Shooting-Star Thrust weapon is first drawn in flight, clear of its
 * release pose (sprite/thrown.ts releaseClear), worked out once per look (from the release frame
 * the screen makes anyway, and the weapon at the angle it is flung at).
 */
export function releaseClearOf(u: Unit, look: SpriteAppearance): number {
  const key = idOf(look);
  let c = clears.get(key);
  if (c === undefined) {
    const rel = throwRelease(look.body, thrownItem(look));
    const figure = renderSpriteCached(look, 'throw', rel.frame, dojutsuToEye(u.character?.dojutsu)).rgba;
    clears.set(key, (c = releaseClear(figure, renderThrown(look, rel.weaponAngle), rel.lastHeld, rel.weaponAngle)));
  }
  return c;
}

export const hasReleaseClear = (look: SpriteAppearance): boolean => clears.has(idOf(look));

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
