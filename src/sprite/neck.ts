// The 'long' neck: the owner's heroines carry the head higher and further forward on a slimmer neck
// than our base bodies do. In his picture of Lyra at our scale (docs/reference/lyra-game-scale-owner-reference.jpg)
// her shoulders, arms and clothes sit where ours do, but her head (hair, eyes, chin) sits one design
// unit (two fine pixels) higher and one further forward, on a neck about three fine pixels wide.

import type { NeckType } from './types';
import type { Rig } from './rig';
import { RES } from './raster';

/** How far the long neck carries the head: design units up along the torso and forward along the shoulders. */
export const LONG_NECK_UP = 1;
export const LONG_NECK_AHEAD = 1;
/** The long neck's radius (design units): about three fine pixels across, as he drew it. */
export const LONG_NECK_W = 0.8;
/** How much further back than ours its top sits (design units): under the back of her chin, not under the chin. */
export const LONG_NECK_BACK = 1.5;
/** Where the nape starts, in fine pixels behind the face anchor (ours: 3.5): right behind the slim neck, his hair showing past it. */
export const LONG_NAPE = 1;

/**
 * The rig with the head where the neck type carries it: unchanged but for the long neck, whose head
 * moves LONG_NECK_UP along the torso and LONG_NECK_AHEAD along the shoulder line (so it follows a
 * leaning or pitched torso), rounded as the rig rounds it (whole units, half units on snapped poses).
 */
export function carryHead(r: Rig, neck: NeckType | undefined): Rig {
  if (neck !== 'long') return r;
  const snapped = !Number.isInteger(r.head.x) || !Number.isInteger(r.head.y);
  const round = (n: number) => (snapped ? Math.round(n * RES) / RES : Math.round(n));
  const x = r.head.x + r.up.x * LONG_NECK_UP + r.right.x * LONG_NECK_AHEAD;
  const y = r.head.y + r.up.y * LONG_NECK_UP + r.right.y * LONG_NECK_AHEAD;
  return { ...r, head: { x: round(x), y: round(y) } };
}
