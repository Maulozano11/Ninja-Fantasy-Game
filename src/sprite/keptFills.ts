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
  // his Lyra: Arrojar 3 (the hair on the arm) and Estocada 1 (the skirt on the shin)
  ['lyra@female', 'throw', 2, 129, 146],
  ['lyra@female', 'pierce', 0, 106, 203],
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
