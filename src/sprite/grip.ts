// Where and at what angle the near hand holds a weapon. Shared by the hand
// drawer (ctx.ts) and the held items (items/accessories.ts), so the fist is
// drawn wrapped around the handle exactly where the weapon sits.

import type { DrawCtx } from './ctx';
import { FLAME_LONGSWORD } from './items/flameSwordArt';
import { add, norm, scale, sub, Vec } from './raster';
import { LYRA_RAPIER } from './items/lyraSwordArt';

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
    // Moving: carried low at the side, the blade angled back (trailing when
    // running), then held forward and ready when sneaking or crouched.
    case 'walk':
      return 134 + 3 * Math.cos((f / 8) * Math.PI * 2);
    case 'run':
      return 150 - 10 * Math.cos((f / 6) * Math.PI * 2);
    case 'sneak':
      return 22;
    case 'crouch':
      return -12;
    // Sword kata: ready, raised with the blade laid back over the head, cut down, follow through,
    // side guard (blade back and low), level cut, rising guard, ready.
    case 'train':
      return [-38, -165, 30, 64, 145, 12, -40, -42][f % 8];
    default:
      // Lyra's rapier hangs at the angle the owner drew it, so at rest it is his pixels.
      if (g.has('held', 'held_gilded_rapier')) return LYRA_RAPIER.angle;
      // Matches the reference: blade hangs across the legs at about 50 degrees. The owner's flame
      // longsword hangs at the angle he painted it (35), so at rest it is every pixel his.
      return g.has('held', 'held_flame_sword') ? FLAME_LONGSWORD.angle : 52;
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
    case 'walk':
      return -102;
    case 'run':
      return -30;
    case 'sneak':
      return -18;
    case 'crouch':
      return -28;
    // Polearm drill: guard, thrust, recoil, raised back overhead, chop, low sweep, spun upright, guard.
    case 'trainPole':
      return [-28, -8, -34, -150, 30, 48, -70, -30][f % 8];
    default:
      return -84;
  }
}

/** Knocked out: the hands are limp, a weapon lies dropped beside the body and held techniques fade. */
export const handsLimp = (g: DrawCtx): boolean => g.rig.pose === 'downed';

/**
 * Hand signs, the grimoire and the charged casts need both hands: held weapons
 * are stowed meanwhile (see items/accessories.ts). The runes cast keeps them.
 * Resting at camp (leaning, sitting, reading) the weapon is put away too.
 */
const BUSY = new Set(['handsigns', 'castBook', 'castSphere', 'castLightning', 'castWave', 'castFlash', 'castEye', 'castScript', 'lean', 'sit', 'read']);
export const handsBusy = (g: DrawCtx): boolean => BUSY.has(g.rig.pose) || !!g.look.stowed;

/** Angle of the handle the near hand wraps, or null when it holds nothing with a handle. */
export function gripAngle(g: DrawCtx): number | null {
  if (handsBusy(g) || handsLimp(g)) return null;
  if (g.has('held', 'held_gilded_rapier')) return swordAngle(g);
  if (g.has('held', 'held_naginata')) return poleAngle(g);
  if (g.has('held', 'held_katana') || g.has('held', 'held_crystal') || g.has('held', 'held_ice_crystal') || g.has('held', 'held_flame_sword') || g.has('held', 'held_kunai')) return swordAngle(g);
  return null;
}

/** Middle of the near fist, where the handle passes through. */
export function gripPoint(g: DrawCtx): Vec {
  const r = g.rig;
  return add(r.handN, scale(norm(sub(r.handN, r.wristN)), 0.9));
}
