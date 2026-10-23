// Where and at what angle the near hand holds a weapon. Shared by the hand
// drawer (ctx.ts) and the held items (items/accessories.ts), so the fist is
// drawn wrapped around the handle exactly where the weapon sits.

import type { DrawCtx } from './ctx';
import { FLAME_LONGSWORD } from './items/flameSwordArt';
import { ICE_SWORD } from './items/iceSwordArt';
import { KATANA_V2 } from './items/katanaV2Art';
import { NIGHT_GLOVE_N } from './items/nightBootsGlovesArt';
import { add, norm, RES, scale, sub, v, Vec } from './raster';
import { LYRA_RAPIER } from './items/lyraSwordArt';
import { drawRig, THROW_RELEASE_FRAME } from './rig';
import { isFemaleBody, type BodyType } from './types';

/**
 * Weapon angles through 'throw' (rig.ts THROW): coiled with the weapon drawn back low behind the
 * hip (blades pointing back, a polearm level and trailing), then raised behind the head (a blade
 * point up and back, a polearm raised nearly upright beside the head, its shaft clear of the hair),
 * then flung: the arm whips forward and the weapon leaves the hand pointing level at the target.
 * From the release on the weapon is no longer in the hand: those entries repeat the angle it was
 * flung at (the one it flies at).
 */
const THROW_BLADE = [166, -116, 4, 4, 4];
const THROW_POLE = [176, -76, 2, 2, 2];

/**
 * Thrust ('pierce'): guard with the point raised at the target, chamber at the hip with the point
 * level, the lunge and its hold dead level at the target, the recoil back up toward the guard.
 */
const PIERCE_BLADE = [-28, -4, 0, 0, -20];
const PIERCE_POLE = [-26, -4, -1, -1, -20];

/** Screen angle of a hand-held blade per pose/frame (degrees, 0 = facing right, + = clockwise/down). */
export function swordAngle(g: DrawCtx): number {
  return paintedGrip(g)?.sword ?? poseSwordAngle(g);
}

/** The pose's own blade angle (swordAngle without the owner's fist round his Katana v2). */
function poseSwordAngle(g: DrawCtx): number {
  if (g.rig.aim !== undefined) return g.rig.aim;
  const f = g.rig.frame;
  switch (g.rig.pose) {
    case 'handsigns':
      return -45;
    case 'attack':
      return [-130, -10, 42][f % 3];
    case 'throw':
      return THROW_BLADE[f % THROW_BLADE.length];
    case 'pierce':
      return PIERCE_BLADE[f % PIERCE_BLADE.length];
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
      // longsword, ice crystal sword and Katana v2 hang at the angles he painted them (35, 35, 37), so at
      // rest they are every pixel his.
      return g.has('held', 'held_flame_sword') ? FLAME_LONGSWORD.angle : g.has('held', 'held_ice_crystal') ? ICE_SWORD.angle : g.has('held', 'held_katana_v2') ? KATANA_V2.angle : 52;
  }
}

/**
 * The owner's fist round his Katana v2 (his Fingerless Gloves on his Ren, items/clothes.ts): how it
 * sits on the wrist and where the sword goes through it. He drew the grip crossing his fist at a fixed
 * angle to the forearm (KATANA_V2.angle - NIGHT_GLOVE_N.angle), so the sword goes through it that way
 * in every pose: the fist turns with the forearm (or, where the blade is carried back, its mirror
 * image, the grip crossing the other way), and the wrist bends it toward the pose's blade angle (his
 * cuff stays on the forearm). In a strike (and when the battle aims the blade) the wrist bends as far
 * as the blade needs; otherwise at most CARRY_BEND, and the blade goes where his fist points it.
 */
export interface PaintedGrip {
  /** His fist drawn mirrored (the grip crossing the forearm the other way). */
  mirror: boolean;
  /** Where the fist points, wrist to knuckles (degrees, as swordAngle). */
  fist: number;
  /** The blade's angle. */
  sword: number;
  /** The point of the grip at the hand joint, where the sword is held (design units). */
  at: Vec;
}

/** How far the wrist bends his fist off the forearm's line while the blade is carried (degrees). */
export const CARRY_BEND = 40;
/** The poses whose blade angle is the strike itself: there the fist follows the blade. */
const STRIKES = new Set(['attack', 'throw', 'pierce', 'train']);
const wrap = (a: number): number => ((((a + 180) % 360) + 360) % 360) - 180;

export function paintedGrip(g: DrawCtx): PaintedGrip | null {
  if (!g.has('held', 'held_katana_v2') || !g.has('hands', 'hands_fingerless') || isFemaleBody(g.rig.body)) return null;
  if (throwsKunai(g) || handsBusy(g) || handsLimp(g) || handsReleased(g)) return null;
  const r = g.rig;
  const fo = (Math.atan2(r.handN.y - r.wristN.y, r.handN.x - r.wristN.x) * 180) / Math.PI;
  const rel = KATANA_V2.angle - NIGHT_GLOVE_N.angle;
  const want = poseSwordAngle(g);
  const bendOf = (m: boolean) => wrap(want - (fo + (m ? -rel : rel)));
  const mirror = Math.abs(bendOf(true)) < Math.abs(bendOf(false));
  const full = bendOf(mirror);
  const bend = STRIKES.has(r.pose) || r.aim !== undefined ? full : Math.max(-CARRY_BEND, Math.min(CARRY_BEND, full));
  const fist = fo + bend;
  // The hand joint turned about the wrist as far as the wrist bends (where he holds it, unbent).
  const c = Math.cos((bend * Math.PI) / 180);
  const s = Math.sin((bend * Math.PI) / 180);
  const d = sub(r.handN, r.wristN);
  const at = Math.abs(bend) < 0.5 ? r.handN : add(r.wristN, v(d.x * c - d.y * s, d.x * s + d.y * c));
  return { mirror, fist, sword: Math.abs(full) < 0.5 || bend === full ? want : fist + (mirror ? -rel : rel), at };
}

/** Polearm angle: upright at rest, thrust forward in attacks. */
export function poleAngle(g: DrawCtx): number {
  if (g.rig.aim !== undefined) return g.rig.aim;
  const f = g.rig.frame;
  switch (g.rig.pose) {
    case 'handsigns':
      return -50;
    case 'attack':
      return [-130, -8, 30][f % 3];
    case 'throw':
      return THROW_POLE[f % THROW_POLE.length];
    case 'pierce':
      return PIERCE_POLE[f % PIERCE_POLE.length];
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
 * Resting at camp (leaning, sitting, reading) the weapon is put away too, and a
 * tackle is thrown with it put away (the owner: the Rush stows the weapon).
 */
const BUSY = new Set(['handsigns', 'castBook', 'castSphere', 'castLightning', 'castWave', 'castFlash', 'castEye', 'castScript', 'lean', 'sit', 'read', 'tackle', 'combo']);
export const handsBusy = (g: DrawCtx): boolean => BUSY.has(g.rig.pose) || !!g.look.stowed;

/**
 * The held weapon (or technique) has been thrown and is not in the hand ('throw' from its release
 * frame on): it is not drawn on the body, the battle draws it in flight. A stowed weapon stays put.
 */
export const handsReleased = (g: DrawCtx): boolean => g.rig.released && !handsBusy(g);

/** The held items that are weapons, with a handle the fist holds; the others are empty hands or a technique held in the palm. */
const WEAPONS = new Set(['held_katana', 'held_katana_v2', 'held_crystal', 'held_ice_crystal', 'held_flame_sword', 'held_gilded_rapier', 'held_kunai', 'held_naginata']);

/** The owner's painted swords, held by their own grip at the hand joint (the others at the fist's middle, gripPoint). */
export const HAND_JOINT_SWORDS = new Set(['held_flame_sword', 'held_ice_crystal', 'held_katana_v2']);
export const isWeapon = (held: string | undefined): boolean => !!held && WEAPONS.has(held);

/** The owner's painted swords are held by their own grip at the hand joint (items/accessories.ts), the others at the fist's middle. */
export const heldAtHandJoint = (held: string | undefined): boolean => HAND_JOINT_SWORDS.has(held ?? '');

/**
 * A kunai from the pouch in the near fist, like the Kunai item: in the wind-up of 'throw' with no
 * weapon in the hand (none held, a technique in the palm, which is not thrown, or the weapon
 * stowed), until the release; and in a look that caught the kunai it threw
 * (SpriteAppearance.pouchKunai). A technique in the palm is not drawn meanwhile.
 */
export const throwsKunai = (g: DrawCtx): boolean =>
  !g.rig.released && !handsLimp(g) && (g.rig.pose === 'throw' ? !!g.look.stowed || !isWeapon(g.look.slots.held?.id) : !!g.look.pouchKunai && !BUSY.has(g.rig.pose));

/** Angle of the handle the near hand wraps, or null when it holds nothing with a handle. */
export function gripAngle(g: DrawCtx): number | null {
  if (throwsKunai(g)) return swordAngle(g);
  if (handsBusy(g) || handsLimp(g) || handsReleased(g)) return null;
  if (g.has('held', 'held_gilded_rapier')) return swordAngle(g);
  if (g.has('held', 'held_naginata')) return poleAngle(g);
  if (g.has('held', 'held_katana') || g.has('held', 'held_katana_v2') || g.has('held', 'held_crystal') || g.has('held', 'held_ice_crystal') || g.has('held', 'held_flame_sword') || g.has('held', 'held_kunai')) return swordAngle(g);
  return null;
}

/** Middle of the near fist, where the handle passes through. */
export function gripPoint(g: DrawCtx): Vec {
  const r = g.rig;
  return add(r.handN, scale(norm(sub(r.handN, r.wristN)), 0.9));
}

/** Where a thrown weapon leaves the hand: see throwRelease. */
export interface ThrowRelease {
  /**
   * The first 'throw' frame without the weapon in the hand: the owner's reference pose, where the
   * phase starts. The weapon is flung in the frame before (THROW_RELEASE_FRAME - 1).
   */
  frame: number;
  /** Middle of the open near hand at that frame (fine pixels of the sprite frame, facing right; FEET is the feet). */
  hand: Vec;
  /** Direction the open hand points at that frame, wrist to fingers (degrees, 0 = facing right, + = clockwise/down). */
  handAngle: number;
  /**
   * Where the weapon starts its flight: the point of the handle the fist held in the frame before,
   * the last one it is drawn in, with the arm whipped forward (fine pixels).
   */
  lastHeld: Vec;
  /** Angle it flies at: the one it was flung at in that frame, level at the target (degrees, as swordAngle/poleAngle). */
  weaponAngle: number;
  /** The item that flies: the held weapon, or a kunai from hands without one (see throwsKunai). */
  thrown: string;
}

/**
 * Where the battle starts a thrown weapon in flight for a body and the item in its hand (`held`:
 * its id, missing when the hands are empty or the weapon is stowed): it leaves the fist where the
 * last frame that draws it holds it, at the angle it was flung at, and is drawn in flight from the
 * release frame on. The figure faces right; mirror x around FEET.x for a figure facing left.
 */
export function throwRelease(body: BodyType, held?: string): ThrowRelease {
  const at = drawRig(body, 'throw', THROW_RELEASE_FRAME);
  const before = drawRig(body, 'throw', THROW_RELEASE_FRAME - 1);
  const fist = (r: typeof at): Vec => add(r.handN, scale(norm(sub(r.handN, r.wristN)), 0.9));
  const d = norm(sub(at.handN, at.wristN));
  const pole = held === 'held_naginata';
  // The owner's painted swords are held by their own grip at the hand joint (items/accessories.ts), the others at the fist's middle.
  const grip = heldAtHandJoint(held) ? before.handN : fist(before);
  return {
    frame: THROW_RELEASE_FRAME,
    hand: scale(fist(at), RES),
    handAngle: (Math.atan2(d.y, d.x) * 180) / Math.PI,
    lastHeld: scale(grip, RES),
    weaponAngle: (pole ? THROW_POLE : THROW_BLADE)[THROW_RELEASE_FRAME - 1],
    thrown: isWeapon(held) ? held! : 'held_kunai',
  };
}

/**
 * Where the held weapon sits in a frame of a weapon technique ('throw' before the release, or
 * 'pierce'): the point its art is anchored at (fine pixels of the frame, facing right; the art's
 * pixels start at the floor of it) and its angle. A weapon caught out of the air is drawn there
 * (the battle's Shooting-Star Thrust lands its thrown weapon in the hand of the thrust).
 */
export function heldAt(body: BodyType, pose: 'throw' | 'pierce', frame: number, held?: string): { at: Vec; angle: number } {
  const r = drawRig(body, pose, frame);
  const pole = held === 'held_naginata';
  const table = pose === 'throw' ? (pole ? THROW_POLE : THROW_BLADE) : pole ? PIERCE_POLE : PIERCE_BLADE;
  const fist = add(r.handN, scale(norm(sub(r.handN, r.wristN)), 0.9));
  return { at: scale(heldAtHandJoint(held) ? r.handN : fist, RES), angle: table[((frame % table.length) + table.length) % table.length] };
}
