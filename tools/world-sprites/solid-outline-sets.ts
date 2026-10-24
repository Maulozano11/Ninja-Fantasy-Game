// The line options of the solid jutsu built by generators that run as scripts (vfx-beasts.ts,
// vfx-round1.ts), kept here so src/sprite/solidOutline.test.ts checks the shipped sheets with the
// very options they were lined with (solid-outline.ts; the owner's decision of 2026-10-22).

import { refPiece } from './vfx-a-ref';
import { lightOf, type SolidOutlineOptions } from './solid-outline';
import * as REF_LIGHTNING from './vfx-beasts-ref-lightning';
import * as REF_WIND from './vfx-beasts-ref-wind';

/** The raiju's line in his sheet (brown), and the crane's (teal): on the silhouette they take the characters' black ("2 cambia"). */
const RAIJU_LINE = 0x573213, CRANE_LINE = 0x234a49;
const rgbIs = (v: number) => (r: number, g: number, b: number): boolean => ((r << 16) | (g << 8) | b) === v;

/** The raiju: his streaks are his semi-transparent yellows and whites, no line round them. */
export const RAIJU_OUTLINE: SolidOutlineOptions = { particleColour: lightOf(REF_LIGHTNING.PALETTE), lineColour: rgbIs(RAIJU_LINE) };
/** The crane: his wind wisps are his semi-transparent greys, no line round them. */
export const CRANE_OUTLINE: SolidOutlineOptions = { particleColour: lightOf(REF_WIND.PALETTE), lineColour: rgbIs(CRANE_LINE) };
/** The stone drake: his dust and flung dirt are warm tans and browns (the drake is grey stone and green moss). */
export const DRAKE_OUTLINE: SolidOutlineOptions = { particleColour: (r, g, b) => r > b + 25 && r >= g && Math.max(r, g, b) - Math.min(r, g, b) > 40 };

// The fire dragon head (vfx_dragon/fire_head and fire_head_half) is his s_head piece of the enhanced
// Great Fire Annihilation: where his picture has fire round it (the wall, the fire behind, the breath),
// the head comes out of it, and that cut gets no line.
const head = refPiece('s_head');
const FIRE_ROUND = ['s_wall', 's_back', 's_breath'].map((n) => refPiece(n));
/** A spot of the head piece within a pixel of his fire there: a cut. */
const inFire = (x: number, y: number): boolean =>
  FIRE_ROUND.some((p) => [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => p.c.alpha(head.x + x + dx - p.x, head.y + y + dy - p.y) > 0)));
export const FIRE_HEAD_OUTLINE: SolidOutlineOptions = { noLine: inFire };
/** The same at half size (a pixel is a 2x2 block of the piece). */
export const FIRE_HEAD_HALF_OUTLINE: SolidOutlineOptions = {
  noLine: (x, y) => inFire(2 * x, 2 * y) || inFire(2 * x + 1, 2 * y) || inFire(2 * x, 2 * y + 1) || inFire(2 * x + 1, 2 * y + 1),
};
