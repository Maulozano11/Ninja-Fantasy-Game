// The pockets (background walled in by the figure) the owner saw filled on his standard characters' sheets and
// left as they are (2026-10-23): the only pockets ever filled (compose.ts standardOf, glitches.ts mendGlitches).
// Every other pocket is his separation or his shape and stays open, reported and looked at: "aqui tambien estas
// cometiendo ese error demasiado porfavor no lo repitas mas en ningun personaje porque cosas que ya estan bien las
// estamos rehaciendo". Each is found by one pixel of it, in that pose and frame of that character on that body.
// Remove an entry when he marks its fill wrong; never add one he has not seen.

import { GRID } from './raster';
import type { SpritePose } from './types';

/** A fill he left: whose (compose.ts standardOf, name@body), the pose and frame, and a pixel of the pocket (x, y). */
export type KeptFill = [who: string, pose: SpritePose, frame: number, x: number, y: number];

export const KEPT_FILLS: KeptFill[] = [
  // his Saya: every fill but the two he marked on sheet 1 (Sellos 1, Sellos 2); sheets 2-6 unmarked
  ['saya@female', 'attack', 2, 145, 155],
  ['saya@female', 'charge', 0, 139, 157],
  ['saya@female', 'charge', 1, 112, 164],
  ['saya@female', 'charge', 1, 121, 164],
  ['saya@female', 'charge', 1, 122, 166],
  ['saya@female', 'crouch', 0, 142, 195],
  ['saya@female', 'crouch', 0, 146, 197],
  ['saya@female', 'crouch', 1, 142, 196],
  ['saya@female', 'crouch', 1, 151, 200],
  ['saya@female', 'hurt', 0, 111, 161],
  ['saya@female', 'hurt', 0, 113, 164],
  ['saya@female', 'hurt', 0, 113, 166],
  ['saya@female', 'hurt', 1, 137, 169],
  ['saya@female', 'hurt', 1, 141, 185],
  ['saya@female', 'hurt', 1, 136, 191],
  ['saya@female', 'hurt', 1, 110, 198],
  ['saya@female', 'lean', 0, 109, 193],
  ['saya@female', 'lean', 0, 110, 194],
  ['saya@female', 'lean', 1, 109, 193],
  ['saya@female', 'lean', 1, 110, 194],
  ['saya@female', 'lean', 2, 109, 193],
  ['saya@female', 'lean', 2, 110, 194],
  ['saya@female', 'lean', 3, 109, 193],
  ['saya@female', 'lean', 3, 110, 194],
  ['saya@female', 'pierce', 2, 126, 172],
  ['saya@female', 'pierce', 2, 124, 173],
  ['saya@female', 'pierce', 2, 160, 193],
  ['saya@female', 'pierce', 3, 125, 173],
  ['saya@female', 'pierce', 3, 161, 193],
  ['saya@female', 'pierce', 4, 123, 163],
  ['saya@female', 'pierce', 4, 111, 192],
  ['saya@female', 'run', 0, 141, 158],
  ['saya@female', 'run', 0, 113, 165],
  ['saya@female', 'run', 1, 141, 160],
  ['saya@female', 'run', 1, 146, 188],
  ['saya@female', 'run', 1, 144, 189],
  ['saya@female', 'run', 1, 140, 191],
  ['saya@female', 'run', 2, 141, 155],
  ['saya@female', 'run', 2, 149, 191],
  ['saya@female', 'run', 3, 141, 158],
  ['saya@female', 'run', 3, 147, 196],
  ['saya@female', 'run', 3, 105, 197],
  ['saya@female', 'run', 3, 101, 199],
  ['saya@female', 'run', 4, 141, 160],
  ['saya@female', 'run', 5, 141, 155],
  ['saya@female', 'sneak', 1, 142, 198],
  ['saya@female', 'sneak', 1, 139, 199],
  ['saya@female', 'sneak', 2, 134, 198],
  ['saya@female', 'sneak', 3, 117, 169],
  ['saya@female', 'sneak', 3, 134, 199],
  ['saya@female', 'throw', 2, 147, 166],
  ['saya@female', 'throw', 2, 153, 194],
  ['saya@female', 'train', 1, 111, 197],
  ['saya@female', 'train', 1, 109, 198],
  ['saya@female', 'train', 2, 145, 194],
  ['saya@female', 'train', 3, 146, 194],
  ['saya@female', 'train', 5, 144, 194],
  ['saya@female', 'victory', 0, 119, 161],
  ['saya@female', 'victory', 0, 137, 164],
  ['saya@female', 'victory', 0, 112, 192],
  ['saya@female', 'victory', 1, 119, 159],
  ['saya@female', 'victory', 1, 137, 162],
  ['saya@female', 'victory', 1, 118, 166],
  ['saya@female', 'victory', 1, 112, 192],
  ['saya@female', 'walk', 2, 115, 164],
  ['saya@female', 'walk', 2, 115, 169],
  ['saya@female', 'walk', 2, 145, 193],
  ['saya@female', 'walk', 3, 143, 193],
  ['saya@female', 'walk', 4, 142, 194],
  ['saya@female', 'walk', 5, 142, 194],
  ['saya@female', 'walk', 6, 115, 164],
  ['saya@female', 'walk', 6, 115, 169],
  ['saya@female', 'walk', 6, 140, 180],
  ['saya@female', 'walk', 6, 139, 194],
  ['saya@female', 'walk', 7, 138, 195],
];

const BY_FRAME = new Map<string, number[]>();
for (const [who, pose, frame, x, y] of KEPT_FILLS) {
  const key = `${who} ${pose} ${frame}`;
  BY_FRAME.set(key, [...(BY_FRAME.get(key) ?? []), y * GRID + x]);
}

/** Whether a pocket (its pixels) of this character's frame is one he left filled. */
export function keptFill(who: string, pose: SpritePose, frame: number, px: number[]): boolean {
  const at = BY_FRAME.get(`${who} ${pose} ${frame}`);
  return !!at && at.some((i) => px.includes(i));
}

/**
 * The pockets he marked to stay open where the 1-pixel pass (holes.ts closePinholes) would close them: his
 * red marks on sheets made before that pass ran on his character. Found as KEPT_FILLS are.
 */
export const LEFT_OPEN: KeptFill[] = [
  // Saya, sheet 1: Sellos 1 and Sellos 2 ("en trunks saya y cazadora tienes unos huecos que si estaban bien")
  ['saya@female', 'handsigns', 0, 119, 161],
  ['saya@female', 'handsigns', 1, 119, 161],
];

const OPEN = new Map<string, number[]>();
for (const [who, pose, frame, x, y] of LEFT_OPEN) {
  const key = `${who} ${pose} ${frame}`;
  OPEN.set(key, [...(OPEN.get(key) ?? []), y * GRID + x]);
}

/** Whether the pocket `px` (fine pixel indices) of `who` (name@body) in that pose and frame is one he marked to stay open. */
export function leftOpen(who: string, pose: SpritePose, frame: number, px: number[]): boolean {
  const at = OPEN.get(`${who} ${pose} ${frame}`);
  return !!at && at.some((i) => px.includes(i));
}
