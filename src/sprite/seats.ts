// Seats: what a seated pose sits on, as a prop of its own (not part of the character's appearance). The
// owner: "puedes usar la piedra tambien como objeto pero ese objeto cambiara dependiendo del escenario":
// his rock is the first seat, and the scene picks the seat (a rock in the wild, later a log or a bench in
// camp). His two rocks: "usar las dos una es para leer y la otra cuando conversa sentada asi para todos los
// personajes tendran animaciones sentados": the rock of his read picture is the read seat, the rock of his sit
// picture (sitting to talk) the sit seat, for every character. A seat is drawn in the same frame as the sprite (GRID x GRID, the feet at FEET): laid at the same
// origin as a seated character, under it, its top is under the hips. Every seat's top is on the row the
// seated poses sit at (rig.ts READ_SEAT_TOP), so any seat fits any seated character.

import { hexToRgb } from './color';
import { GRID } from './raster';
import { READ_SEAT_TOP } from './rig';
import { SEAT_ROCK, SEAT_ROCK_TOP } from './seatRockArt';
import { SEAT_ROCK_SIT, SEAT_ROCK_SIT_TOP } from './seatRockSitArt';
import type { SpritePose } from './types';

export type SeatId = 'seat_rock' | 'seat_rock_sit' | 'seat_none';

export interface SeatDef {
  id: SeatId;
  name: string;
  nameEs: string;
  /** The fine pixel row of its top, where the hips rest (READ_SEAT_TOP for every seat). */
  top: number;
  /** Its pixels in the sprite's frame (none: the scene draws its own seat). */
  art: { at: [number, number]; rows: string[]; colors: Record<string, string> } | null;
}

export const SEATS: Record<SeatId, SeatDef> = {
  // The owner's grey rock (docs/reference/lyra-read-owner-reference.jpg), his pixels (seatRockArt.ts).
  seat_rock: { id: 'seat_rock', name: 'Rock', nameEs: 'Piedra', top: SEAT_ROCK_TOP, art: SEAT_ROCK },
  // The owner's sit rock (docs/reference/lyra-sit-owner-reference.jpg), his pixels (seatRockSitArt.ts): the
  // rock his Lyra sits on to talk.
  seat_rock_sit: { id: 'seat_rock_sit', name: 'Talking Rock', nameEs: 'Piedra para conversar', top: SEAT_ROCK_SIT_TOP, art: SEAT_ROCK_SIT },
  // No seat of ours: the scene's own (its log, its bench) is under the hips.
  seat_none: { id: 'seat_none', name: 'None', nameEs: 'Ninguno', top: READ_SEAT_TOP, art: null },
};

/** The seat a scene gets when it does not pick one and the pose has none of its own (SEAT_OF_POSE). */
export const DEFAULT_SEAT: SeatId = 'seat_rock';

/** The seated poses that sit on a seat prop, at READ_SEAT_TOP: his read and sit pictures. */
export const SEATED_POSES: SpritePose[] = ['read', 'sit'];

/** Each seated pose's own rock, for every character: reading on his read rock, sitting to talk on his sit rock. */
const SEAT_OF_POSE: Partial<Record<SpritePose, SeatId>> = { read: 'seat_rock', sit: 'seat_rock_sit' };

/** The seat a pose sits on in a scene that picks `scene` (its own choice, else the pose's rock); none for a pose that is not seated. */
export function seatFor(pose: SpritePose, scene?: SeatId): SeatId | null {
  if (!SEATED_POSES.includes(pose)) return null;
  return scene ?? SEAT_OF_POSE[pose] ?? DEFAULT_SEAT;
}

/** A seat's pixels in a GRID x GRID frame like a sprite's (empty for 'seat_none'). */
export function renderSeat(id: SeatId): Uint8ClampedArray {
  const out = new Uint8ClampedArray(GRID * GRID * 4);
  const art = SEATS[id].art;
  if (!art) return out;
  const rgb = Object.fromEntries(Object.entries(art.colors).map(([c, h]) => [c, hexToRgb(h)]));
  art.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '.') continue;
      const x = art.at[0] + i;
      const y = art.at[1] + j;
      if (x < 0 || y < 0 || x >= GRID || y >= GRID) continue;
      const k = (y * GRID + x) * 4;
      out.set([...rgb[row[i]], 255], k);
    }
  });
  return out;
}

/** A sprite frame on a seat: the seat first, the character over it (for previews and pictures). */
export function onSeat(sprite: Uint8ClampedArray, id: SeatId): Uint8ClampedArray {
  const out = renderSeat(id);
  for (let i = 0; i < GRID * GRID; i++) if (sprite[i * 4 + 3]) out.set(sprite.subarray(i * 4, i * 4 + 4), i * 4);
  return out;
}
