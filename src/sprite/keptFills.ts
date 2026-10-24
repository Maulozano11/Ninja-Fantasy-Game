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
  // his Trunks 2 and 3: every fill but the eleven he marked on sheets 1 and 3 (Embestida 1, 2, 4, Herido 1, Victoria 2, Caminar 1; Trunks 3 Embestida 2, Carga 1, Correr 2); sheets 2 and 4 and the other bodies not marked yet
  ['trunks2@bulky', 'hurt', 1, 138, 170],
  ['trunks2@bulky', 'lean', 0, 97, 191],
  ['trunks2@bulky', 'lean', 1, 97, 191],
  ['trunks2@bulky', 'lean', 2, 96, 192],
  ['trunks2@bulky', 'lean', 3, 96, 192],
  ['trunks2@bulky', 'run', 2, 142, 174],
  ['trunks2@bulky', 'train', 0, 102, 203],
  ['trunks2@bulky', 'train', 7, 102, 203],
  ['trunks2@bulky', 'victory', 1, 140, 171],
  ['trunks2@bulky', 'walk', 1, 141, 174],
  ['trunks2@bulky', 'walk', 2, 112, 198],
  ['trunks2@bulky', 'walk', 7, 141, 173],
  ['trunks2@female', 'charge', 0, 101, 201],
  ['trunks2@female', 'combo', 4, 126, 163],
  ['trunks2@female', 'run', 2, 112, 190],
  ['trunks2@female', 'run', 4, 116, 190],
  ['trunks2@female', 'sit', 2, 109, 200],
  ['trunks2@female', 'sit', 3, 109, 200],
  ['trunks2@female', 'sneak', 1, 113, 204],
  ['trunks2@female', 'tackle', 1, 129, 168],
  ['trunks2@female', 'tackle', 2, 134, 167],
  ['trunks2@female', 'tackle', 3, 135, 168],
  ['trunks2@female', 'throw', 3, 128, 167],
  ['trunks2@female', 'throw', 4, 129, 166],
  ['trunks2@female', 'walk', 0, 118, 196],
  ['trunks2@female', 'walk', 6, 118, 191],
  ['trunks2@female', 'walk', 7, 118, 194],
  ['trunks2@male', 'lean', 2, 99, 191],
  ['trunks2@male', 'lean', 3, 99, 191],
  ['trunks2@male', 'read', 0, 122, 180],
  ['trunks2@male', 'read', 1, 122, 180],
  ['trunks2@male', 'read', 2, 122, 180],
  ['trunks2@male', 'read', 3, 122, 180],
  ['trunks2@male', 'read', 4, 122, 180],
  ['trunks2@male', 'read', 5, 122, 180],
  ['trunks2@male', 'read', 6, 122, 180],
  ['trunks2@male', 'read', 7, 122, 180],
  ['trunks2@male', 'read', 8, 122, 180],
  ['trunks2@male', 'read', 9, 122, 180],
  ['trunks2@male', 'read', 10, 122, 180],
  ['trunks2@male', 'read', 11, 122, 180],
  ['trunks2@male', 'walk', 1, 116, 200],
  ['trunks3@bulky', 'charge', 0, 110, 174],
  ['trunks3@bulky', 'charge', 1, 111, 174],
  ['trunks3@bulky', 'combo', 6, 111, 181],
  ['trunks3@bulky', 'hurt', 1, 108, 175],
  ['trunks3@bulky', 'run', 0, 141, 180],
  ['trunks3@bulky', 'run', 1, 113, 160],
  ['trunks3@bulky', 'tackle', 0, 116, 178],
  ['trunks3@bulky', 'train', 0, 140, 175],
  ['trunks3@bulky', 'train', 7, 140, 175],
  ['trunks3@bulky', 'victory', 0, 114, 126],
  ['trunks3@bulky', 'walk', 0, 113, 181],
  ['trunks3@female', 'run', 1, 119, 167],
  ['trunks3@female', 'run', 1, 132, 188],
  ['trunks3@female', 'walk', 0, 117, 167],
  ['trunks3@female', 'walk', 1, 117, 167],
  ['trunks3@female', 'walk', 6, 120, 191],
  ['trunks3@female', 'walk', 7, 117, 166],
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
