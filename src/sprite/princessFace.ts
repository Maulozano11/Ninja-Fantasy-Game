// The owner's princess's eyes (the 'noble' eye shape): her pixels from his picture at our scale
// (src/sprite/princessEyeArt.ts), laid on the face template's eye cells by drawFace (body.ts).
// Her face shape ('noble', src/sprite/princessHeadArt.ts) is stamped by body.ts as Aiden's head is.

import { retintHex } from './color';
import type { DrawCtx } from './ctx';
import type { PaintedEye } from './eyeArt';
import { PRINCESS_HAIR_BASE } from './items/princessHairArt';
import { NOBLE_BROWS, NOBLE_EYE_COLORS, NOBLE_EYES, NOBLE_IRIS, NOBLE_IRIS_TINTED } from './princessEyeArt';
import { F_NO_OUTLINE, type Layer } from './raster';

export type LidState = keyof typeof NOBLE_EYES;

/**
 * One of her colours in the character's eyes: her violets, lights and her lash's violet ends move the
 * way the eye colour moves her violet; on pale special eyes her iris takes the face's pale tones
 * (`pale`: her dark violet the lighter, her violet the lightest), so they read blank as ours do. Her
 * black, white and flick stay as he painted them.
 */
function tone(ch: string, letter: string, iris: string, pale?: { d: string; i: string }): string {
  const hex = NOBLE_EYE_COLORS[ch];
  if (pale && (letter === 'd' || letter === 'i')) return pale[letter];
  return NOBLE_IRIS_TINTED.includes(ch) ? retintHex(hex, NOBLE_IRIS, iris) : hex;
}

/**
 * Her eyes in a lid state on the template's eye cells: the near eye from (ex, ny), the far from
 * (fx, ny), on the head layer `L`; her lash's flick on the face layer `F`, a column before the near eye.
 */
export function stampNobleEyes(g: DrawCtx, L: Layer, F: Layer, ex: number, fx: number, ny: number, state: LidState, iris: string, pale?: { d: string; i: string }): void {
  const eyes = NOBLE_EYES[state];
  const stamp = (eye: PaintedEye, x0: number) =>
    eye.rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) if (row[c] !== '.') L.set(x0 + c, ny + r, g.m(tone(row[c], eye.letters[r][c], iris, pale), 'flat'), 3, 'head', F_NO_OUTLINE);
    });
  stamp(eyes.near, ex);
  stamp(eyes.far, fx);
  const { at, ch } = eyes.flick;
  F.set(ex + at[0], ny + at[1], g.m(NOBLE_EYE_COLORS[ch], 'flat'), 3, 'head', F_NO_OUTLINE);
}

/**
 * Her brows, her pixels on the row over her lash, moved the way the hair colour (`hair`) moves her hair's pink:
 * from her hair item's base colour (hair_rose_dawn), so with her own hair in its own colour they are his pixels.
 */
export function stampNobleBrows(g: DrawCtx, F: Layer, ex: number, fx: number, ny: number, hair?: string): void {
  for (const [side, x0] of [['near', ex], ['far', fx]] as const) {
    const { at, rows } = NOBLE_BROWS[side];
    rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        if (row[c] === '.') continue;
        const hex = NOBLE_EYE_COLORS[row[c]];
        F.set(x0 + at[0] + c, ny + at[1] + r, g.m(hair ? retintHex(hex, PRINCESS_HAIR_BASE, hair) : hex, 'flat'), 3, 'head', F_NO_OUTLINE);
      }
    });
  }
}
