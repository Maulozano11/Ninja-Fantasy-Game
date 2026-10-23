// Seats: what a seated pose sits on, as a prop of its own (not part of the character's appearance). The
// owner: "puedes usar la piedra tambien como objeto pero ese objeto cambiara dependiendo del escenario":
// his rock is the first seat, and the scene picks the seat (a rock in the wild, later a log or a bench in
// camp). A seat is drawn in the same frame as the sprite (GRID x GRID, the feet at FEET): laid at the same
// origin as a seated character, under it, its top is under the hips. (The same design as heroine/lyra-v2's
// seats.ts, which has his read rock; this branch has his sit rock.)

import { hexToRgb } from './color';
import { GRID } from './raster';
import { SIT_SEAT_TOP } from './rig';
import { SEAT_BOULDER } from './seatBoulderArt';
import { isFemaleBody, type BodyType, type SpritePose } from './types';

export type SeatId = 'seat_boulder' | 'seat_none';

export interface SeatDef {
  id: SeatId;
  name: string;
  nameEs: string;
  /** The fine pixel row the hips rest on (the seated pose's seat top). */
  top: number;
  /** Its pixels in the sprite's frame (none: the scene draws its own seat). */
  art: { at: [number, number]; rows: string[]; colors: Record<string, string> } | null;
}

export const SEATS: Record<SeatId, SeatDef> = {
  // The owner's grey rock from his Roman sit (docs/reference/roman-sit-owner-reference.jpg), his pixels scaled
  // by 1.25 like his figure (seatBoulderArt.ts): it is a prop, so it is brought to our scale with the pose.
  seat_boulder: { id: 'seat_boulder', name: 'Boulder', nameEs: 'Roca', top: SIT_SEAT_TOP, art: SEAT_BOULDER },
  // No seat of ours: the scene's own (its log, its bench) is under the hips.
  seat_none: { id: 'seat_none', name: 'None', nameEs: 'Ninguno', top: SIT_SEAT_TOP, art: null },
};

/** The seat a scene gets when it does not pick one. */
export const DEFAULT_SEAT: SeatId = 'seat_boulder';

/**
 * The seated poses that sit on a seat prop: 'sit' (every body, at SIT_SEAT_TOP) and 'read' (the male bodies'
 * read, his Trunks read, rig.ts READ_MALE: the hips where he drew them, at READ_SEAT_TOP, the rock behind them
 * as his rock is behind his Trunks). The female bodies' read keeps the camp's seat until her read moves to a
 * seat prop (heroine/lyra-v2).
 */
export const SEATED_POSES: SpritePose[] = ['sit', 'read'];

/**
 * The seat a pose sits on in a scene that picks `scene` (its own choice, else the default); none for a pose that
 * is not seated on a seat prop (for `body`, when given: the female bodies' read is not).
 */
export function seatFor(pose: SpritePose, scene?: SeatId, body?: BodyType): SeatId | null {
  if (!SEATED_POSES.includes(pose)) return null;
  if (pose === 'read' && body && isFemaleBody(body)) return null;
  return scene ?? DEFAULT_SEAT;
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
