// Where and at what angle the near hand holds a weapon. Shared by the hand
// drawer (ctx.ts) and the held items (items/accessories.ts), so the fist is
// drawn wrapped around the handle exactly where the weapon sits.

import type { DrawCtx } from './ctx';
import { add, norm, scale, sub, Vec } from './raster';

/** Screen angle of a hand-held blade per pose/frame (degrees, 0 = facing right, + = clockwise/down). */
export function swordAngle(g: DrawCtx): number {
  const f = g.rig.frame;
  switch (g.rig.pose) {
    case 'handsigns':
      return -45;
    case 'attack':
      return [-130, -10, 42][f % 3];
    case 'cast':
      return -42;
    case 'hurt':
      return f % 2 ? 50 : 58;
    case 'victory':
      return -62;
    case 'charge':
      return 34;
    default:
      // Matches the reference: blade hangs across the legs at about 50 degrees.
      return 52;
  }
}

/** Polearm angle: upright at rest, thrust forward in attacks. */
export function poleAngle(g: DrawCtx): number {
  const f = g.rig.frame;
  switch (g.rig.pose) {
    case 'handsigns':
      return -50;
    case 'attack':
      return [-130, -8, 30][f % 3];
    case 'cast':
      return -45;
    case 'hurt':
      return -110;
    case 'victory':
      return -82;
    case 'charge':
      return -18;
    default:
      return -84;
  }
}

/**
 * Hand signs, the grimoire and the charged casts need both hands: held weapons
 * are stowed meanwhile (see items/accessories.ts). The runes cast keeps them.
 */
const BUSY = new Set(['handsigns', 'castBook', 'castSphere', 'castLightning', 'castWave', 'castFlash', 'castEye', 'castScript']);
export const handsBusy = (g: DrawCtx): boolean => BUSY.has(g.rig.pose);

/** Angle of the handle the near hand wraps, or null when it holds nothing with a handle. */
export function gripAngle(g: DrawCtx): number | null {
  if (handsBusy(g)) return null;
  if (g.has('held', 'held_naginata')) return poleAngle(g);
  if (g.has('held', 'held_katana') || g.has('held', 'held_crystal') || g.has('held', 'held_kunai')) return swordAngle(g);
  return null;
}

/** Middle of the near fist, where the handle passes through. */
export function gripPoint(g: DrawCtx): Vec {
  const r = g.rig;
  return add(r.handN, scale(norm(sub(r.handN, r.wristN)), 0.9));
}
