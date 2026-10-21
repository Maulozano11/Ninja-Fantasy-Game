// The weapon a Ryusei throws in its Shooting-Star Thrust, drawn on its own for the battle to fly it: the held
// item's own art (or the kunai bare hands throw from the pouch), drawn by the item itself exactly as
// in the hand, but at any angle of its flight (RotSprite, like every held weapon), with no body.
// Pure pixels, no canvas: the battle turns each angle into a canvas once and keeps it.

import { renderSprite } from './compose';
import { isWeapon } from './grip';
import { add, GRID, norm, RES, scale, sub, v, type Vec } from './raster';
import { drawRig, THROW_RELEASE_FRAME } from './rig';
import type { SpriteAppearance } from './types';

/** Where the thrown weapon's anchor (the point the fist held) sits in its frame (fine pixels): the middle, so any angle fits. */
export const THROWN_GRIP: Vec = { x: GRID / 2, y: GRID / 2 };

/** Whether a look throws the weapon in its hand (not a kunai from the pouch: grip.ts throwsKunai). */
const throwsOwn = (look: SpriteAppearance): boolean => !look.stowed && isWeapon(look.slots.held?.id);

/**
 * The item a 'throw' flings from this look: the held weapon, or a kunai from the pouch when the
 * hands have none (empty, a technique in the palm, or the weapon stowed: grip.ts throwsKunai).
 */
export function thrownItem(look: SpriteAppearance): string {
  return throwsOwn(look) ? look.slots.held!.id : 'held_kunai';
}

/**
 * The look a thrower catches its weapon with: its own, or, when it threw a kunai from the pouch, the
 * same look with that kunai in the fist (so the thrust that follows the catch is made with it),
 * everything else as it was: a stowed weapon stays where it is put away.
 */
export function catchLook(look: SpriteAppearance): SpriteAppearance {
  return throwsOwn(look) ? look : { ...look, pouchKunai: true };
}

export interface Thrown {
  /** GRID x GRID RGBA. */
  rgba: Uint8ClampedArray;
  /**
   * The fine pixel the art is anchored on (where the fist held it, grip.ts throwRelease lastHeld):
   * the floor of the anchor, as the item stamps it. Near THROWN_GRIP.
   */
  grip: Vec;
}

/**
 * The thrown weapon at `angle` (screen degrees, 0 = pointing right, + = clockwise/down; a figure
 * facing right), anchored near the middle of a frame. It is the item's own drawing in the frame
 * that flings it ('throw' just before the release), moved by whole pixels and turned to `angle`: at
 * the angle it was flung at, it is pixel for pixel the weapon that left the hand.
 */
export function renderThrown(look: SpriteAppearance, angle: number): Thrown {
  const base = drawRig(look.body, 'throw', THROW_RELEASE_FRAME - 1);
  // The flame longsword is held at the hand joint, the others at the fist's middle (grip.ts gripPoint).
  const anchor = thrownItem(look) === 'held_flame_sword' ? base.handN : add(base.handN, scale(norm(sub(base.handN, base.wristN)), 0.9));
  // The arm moved by whole fine pixels (so even a weapon drawn with shapes, the naginata, comes out
  // the same) to put the anchor near THROWN_GRIP, the weapon turned to `angle`.
  const D = v(Math.round(THROWN_GRIP.x - anchor.x * RES), Math.round(THROWN_GRIP.y - anchor.y * RES));
  const d = scale(D, 1 / RES);
  const rig = { ...base, handN: add(base.handN, d), wristN: add(base.wristN, d), elbowN: add(base.elbowN, d), aim: angle };
  const { rgba } = renderSprite(look, 'throw', THROW_RELEASE_FRAME - 1, 'none', { heldOnly: rig });
  return { rgba, grip: v(Math.floor(anchor.x * RES) + D.x, Math.floor(anchor.y * RES) + D.y) };
}

/** How far round the release figure the thrown weapon keeps clear of it (fine pixels): its light body glows past its outline. */
export const RELEASE_MARGIN = 4;

/**
 * How far ahead of the fist that flung it (whole fine pixels along `angle`, the angle it flies at)
 * the thrown weapon is first drawn in flight, so that none of it lies on the thrower's release pose
 * or within `margin` of it. The release ('throw' THROW_RELEASE_FRAME, the owner's reference) pitches
 * the head forward into the place where the fist let go of the weapon: drawn there, it would seem
 * to come out of the face. `figure`: that frame (GRID x GRID RGBA, facing right); `weapon`: the
 * weapon at `angle` (renderThrown); `at`: where the fist held it (grip.ts throwRelease lastHeld).
 * At most `most` (a weapon that cannot clear the figure is not flung further than that).
 */
export function releaseClear(figure: Uint8ClampedArray, weapon: Thrown, at: Vec, angle: number, margin = RELEASE_MARGIN, most = 64): number {
  // The figure, grown by the margin (a round brush).
  const near = new Uint8Array(GRID * GRID);
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      if (!figure[(y * GRID + x) * 4 + 3]) continue;
      for (let dy = -margin; dy <= margin; dy++)
        for (let dx = -margin; dx <= margin; dx++) {
          const X = x + dx;
          const Y = y + dy;
          if (dx * dx + dy * dy <= margin * margin + margin && X >= 0 && Y >= 0 && X < GRID && Y < GRID) near[Y * GRID + X] = 1;
        }
    }
  // The weapon's pixels, from where the fist held it.
  const px: number[] = [];
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (weapon.rgba[(y * GRID + x) * 4 + 3]) px.push(x - weapon.grip.x, y - weapon.grip.y);
  const ux = Math.cos((angle * Math.PI) / 180);
  const uy = Math.sin((angle * Math.PI) / 180);
  const bx = Math.floor(at.x);
  const by = Math.floor(at.y);
  for (let s = 0; s < most; s++) {
    const ox = bx + Math.round(s * ux);
    const oy = by + Math.round(s * uy);
    let hit = false;
    for (let i = 0; i < px.length && !hit; i += 2) {
      const X = ox + px[i];
      const Y = oy + px[i + 1];
      hit = X >= 0 && Y >= 0 && X < GRID && Y < GRID && near[Y * GRID + X] === 1;
    }
    if (!hit) return s;
  }
  return most;
}

/** Where the thrown weapon is first drawn in flight (fine pixels of the release frame, facing right): `clear` (releaseClear) ahead of the fist. */
export const releaseStart = (at: Vec, angle: number, clear: number): Vec =>
  v(at.x + Math.round(clear * Math.cos((angle * Math.PI) / 180)), at.y + Math.round(clear * Math.sin((angle * Math.PI) / 180)));
