// The weapon a Ryusei throws in its Warp Strike, drawn on its own for the battle to fly it: the held
// item's own art (or the kunai bare hands throw from the pouch), drawn by the item itself exactly as
// in the hand, but at any angle of its flight (RotSprite, like every held weapon), with no body.
// Pure pixels, no canvas: the battle turns each angle into a canvas once and keeps it.

import { renderSprite } from './compose';
import { add, GRID, norm, RES, scale, sub, v, type Vec } from './raster';
import { drawRig, THROW_RELEASE_FRAME } from './rig';
import type { SpriteAppearance } from './types';

/** Where the thrown weapon's anchor (the point the fist held) sits in its frame (fine pixels): the middle, so any angle fits. */
export const THROWN_GRIP: Vec = { x: GRID / 2, y: GRID / 2 };

/** The item a 'throw' flings from this look: the held weapon, or a kunai from empty or busy hands (grip.ts throwsKunai). */
export function thrownItem(look: SpriteAppearance): string {
  const held = look.slots.held?.id;
  return !look.stowed && held && held !== 'held_none' ? held : 'held_kunai';
}

/**
 * The look a thrower catches its weapon with: its own, or, when it threw a kunai from the pouch, the
 * same look holding that kunai (so the thrust that follows the catch is made with it).
 */
export function catchLook(look: SpriteAppearance): SpriteAppearance {
  if (thrownItem(look) !== 'held_kunai' || (look.slots.held?.id === 'held_kunai' && !look.stowed)) return look;
  return { ...look, stowed: undefined, slots: { ...look.slots, held: { id: 'held_kunai', colors: [] } } };
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
