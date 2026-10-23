// Seats: what a seated pose sits on, as a prop of its own (not part of the character's appearance). The
// owner: "puedes usar la piedra tambien como objeto pero ese objeto cambiara dependiendo del escenario":
// his rock is the first seat, and the scene picks the seat (a rock in the wild, later a log or a bench in
// camp). A seat is drawn in the same frame as the sprite (GRID x GRID, the feet at FEET): laid at the same
// origin as a seated character, under it, its top is under the hips. Every seat's top is on the row the
// seated poses sit at (rig.ts READ_SEAT_TOP), so any seat fits any seated character.

import { hexToRgb } from './color';
import { GRID } from './raster';
import { READ_SEAT_TOP } from './rig';
import { SEAT_ROCK, SEAT_ROCK_TOP } from './seatRockArt';
import type { SpritePose } from './types';

export type SeatId = 'seat_rock' | 'seat_none';

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
  // No seat of ours: the scene's own (its log, its bench) is under the hips.
  seat_none: { id: 'seat_none', name: 'None', nameEs: 'Ninguno', top: READ_SEAT_TOP, art: null },
};

/** The seat a scene gets when it does not pick one. */
export const DEFAULT_SEAT: SeatId = 'seat_rock';

/** The seated poses that sit on a seat prop, at READ_SEAT_TOP. ('sit' keeps the camp's log until the owner's sit picture.) */
export const SEATED_POSES: SpritePose[] = ['read'];

/** The seat a pose sits on in a scene that picks `scene` (its own choice, else the default); none for a pose that is not seated. */
export function seatFor(pose: SpritePose, scene?: SeatId): SeatId | null {
  if (!SEATED_POSES.includes(pose)) return null;
  return scene ?? DEFAULT_SEAT;
}

/** How many rows at the foot of a seat's art are the earth under it (kept whole when the seat is lowered). */
const EARTH_ROWS = 6;

/**
 * Which rows of a seat's art show when its top is laid `drop` rows lower on the same ground: the rows
 * most like the row below them are left out (his rows, whole, as owner_paintover.keep brings his figures
 * down), never two side by side, never its top line or the earth at its foot. A figure the owner painted
 * sitting lower than the pose's seat (ownerFrames.ts seatTopFor) gets the scene's seat that much lower.
 */
function keptRows(rows: string[], drop: number): number[] {
  const n = rows.length;
  const keep = rows.map((_, j) => j);
  if (drop <= 0) return keep;
  const unlike = (a: string, b: string) => {
    let d = 0;
    for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] ?? '.') !== (b[i] ?? '.')) d++;
    return d;
  };
  const cost = rows.map((r, j) => (j < 2 || j >= n - EARTH_ROWS - 1 ? Infinity : unlike(r, rows[j + 1])));
  const out = new Set(keep);
  for (let k = 0; k < drop; k++) {
    let best = -1;
    for (let j = 0; j < n; j++) if (Number.isFinite(cost[j]) && (best < 0 || cost[j] < cost[best])) best = j;
    if (best < 0) break;
    out.delete(best);
    cost[best] = Infinity;
    if (best > 0) cost[best - 1] = Infinity;
    if (best < n - 1) cost[best + 1] = Infinity;
  }
  return [...out].sort((a, b) => a - b);
}

/**
 * A seat's pixels in a GRID x GRID frame like a sprite's (empty for 'seat_none'), its top on row `top`:
 * its own top (the pose's seat) unless a figure sits lower, then standing on the same ground, lower.
 */
export function renderSeat(id: SeatId, top: number = SEATS[id].top): Uint8ClampedArray {
  const out = new Uint8ClampedArray(GRID * GRID * 4);
  const art = SEATS[id].art;
  if (!art) return out;
  const rgb = Object.fromEntries(Object.entries(art.colors).map(([c, h]) => [c, hexToRgb(h)]));
  const rows = keptRows(art.rows, top - SEATS[id].top);
  const y0 = art.at[1] + art.rows.length - rows.length;
  rows.forEach((r, j) => {
    const row = art.rows[r];
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '.') continue;
      const x = art.at[0] + i;
      const y = y0 + j;
      if (x < 0 || y < 0 || x >= GRID || y >= GRID) continue;
      const k = (y * GRID + x) * 4;
      out.set([...rgb[row[i]], 255], k);
    }
  });
  return out;
}

/** A sprite frame on a seat: the seat first, the character over it (for previews and pictures). */
export function onSeat(sprite: Uint8ClampedArray, id: SeatId, top?: number): Uint8ClampedArray {
  const out = renderSeat(id, top);
  for (let i = 0; i < GRID * GRID; i++) if (sprite[i * 4 + 3]) out.set(sprite.subarray(i * 4, i * 4 + 4), i * 4);
  return out;
}
