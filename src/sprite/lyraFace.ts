// The face shape 'fine': the owner's Lyra's face, his pixels from his picture of her at our scale
// (lyraFaceArt.ts, tools/refs/lyra-face-from-ref.py), stamped on the face anchor in the player's skin.
// body.ts draws our skull above it and our near cheek (the face template's) under it, where her hair
// hides his; the eye shapes draw the eyes and brows on it.

import { hexToRgb, hslToHex, rgbToHsl } from './color';
import type { DrawCtx } from './ctx';
import { LYRA_FACE, LYRA_FACE_SKIN } from './lyraFaceArt';
import { F_NO_OUTLINE, type Layer } from './raster';

/** Two skins this close (per channel) are one skin of his, a JPEG step apart. */
const SAME = 6;

/**
 * A colour of his, drawn on his skin `from`, in the character's skin: the hue turned and the saturation
 * scaled as the skin turns his, the lightness scaled so that his skin lands exactly on the character's,
 * his shades and line keeping their distance below it (the rule of Aiden's head, body.ts skinTone). In
 * his skin, his colour: and his skin is any within a JPEG step of his (SAME), as the converters merge
 * his colours, so the skin her preset takes from his thigh (#fbc9aa, lyra-boots-from-ref.py) keeps
 * every pixel of his face and shoulder his.
 */
export function hisSkinTone(hex: string, from: string, skin: string): string {
  const to = hexToRgb(skin);
  const his = hexToRgb(from);
  if (to.every((v, i) => Math.abs(v - his[i]) <= SAME)) return hex;
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  const [h0, s0, l0] = rgbToHsl(...his);
  const [h1, s1, l1] = rgbToHsl(...to);
  const lt = l <= l0 ? (l * l1) / l0 : l1 + ((l - l0) * (1 - l1)) / (1 - l0);
  return hslToHex(h + (h1 - h0), Math.min(1, (s * s1) / s0), lt);
}

/** A colour of his face in the character's skin. */
export const lyraFaceTone = (hex: string, skin: string): string => hisSkinTone(hex, LYRA_FACE_SKIN, skin);

/** Every cell of his face, with its colour, from the face anchor (nx, ny). */
export function lyraFaceCells(nx: number, ny: number): { x: number; y: number; hex: string }[] {
  const out: { x: number; y: number; hex: string }[] = [];
  const [px, py] = LYRA_FACE.pivot;
  LYRA_FACE.rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) if (row[c] !== '.') out.push({ x: nx - px + c, y: ny - py + r, hex: LYRA_FACE.colors[row[c]] });
  });
  return out;
}

/** His far face line's column, from the face anchor: our skull stops short of it (body.ts drawHead). */
export const LYRA_FACE_FAR_LINE = Math.max(...LYRA_FACE.rows.map((row) => row.length - 1)) - LYRA_FACE.pivot[0];

/** His face on the head layer, in the character's skin. */
export function stampLyraFace(g: DrawCtx, L: Layer, nx: number, ny: number): void {
  for (const { x, y, hex } of lyraFaceCells(nx, ny)) L.set(x, y, g.m(lyraFaceTone(hex, g.look.skin), 'flat'), 3, 'head', F_NO_OUTLINE);
}
