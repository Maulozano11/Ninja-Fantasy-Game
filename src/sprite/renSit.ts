// Ren seated on the male body: the owner's repaint, his four frames one for one (items/renSitArt.ts, from
// tools/refs/ren-sit-from-ref.py). The owner, on his repaint of our Ren sit sheet: "copia la version de abajo
// la de arriba ignorala y va ser para el hombre normal no para el fornido como indica la imagen". On Ren's
// figure (wearsRensFigure: the male body with his face and eyes, his options in his slots in their own
// colours) the sit frame is his, pixel for pixel, on the talking rock where he painted it; his skin and eyes
// follow the character's. Any other look, and Ren on the bulky body, sits as our rig draws it.

import { getItem } from './catalog';
import { retintHex } from './color';
import { REN_SIT, REN_SIT_EYE, REN_SIT_SKIN } from './items/renSitArt';
import { jointPixel, type OwnerPiece } from './ownerFrames';
import { skinTone } from './painted';
import { GRID, partIndex } from './raster';
import type { Rig } from './rig';
import type { EyeSpecial, SlotId, SpriteAppearance, SpritePose } from './types';

/** Ren's options, by slot: what his frames are of. */
const HIS: Partial<Record<SlotId, string>> = {
  hair: 'hair_night',
  top: 'top_night_jacket',
  waist: 'waist_night_belt',
  skirt: 'skirt_night_studded',
  bottom: 'bottom_night_trousers',
  feet: 'feet_night_boots',
  hands: 'hands_fingerless',
  held: 'held_katana_v2',
};

/**
 * Whether a look is the Ren his frames are of: the male body, his 'night' face and eyes, no eye technique,
 * headband or accessory, and in his slots his options and nothing else, in their own colours (his frames
 * would not show another colour or another option).
 */
export function wearsRensFigure(look: SpriteAppearance, eye: EyeSpecial): boolean {
  if (look.body !== 'male' || look.faceShape !== 'night' || look.eyeShape !== 'night' || eye !== 'none') return false;
  if ((look.headband && look.headband.position !== 'none') || look.accessories?.length) return false;
  const worn = Object.entries(look.slots).filter(([, c]) => c && !c.id.endsWith('_none'));
  if (worn.length !== Object.keys(HIS).length) return false;
  return worn.every(([slot, c]) => {
    if (!c || HIS[slot as SlotId] !== c.id) return false;
    const defs = getItem(c.id)?.colors ?? [];
    return c.colors.every((hex, k) => !defs[k] || hex.toLowerCase() === defs[k].default.toLowerCase());
  });
}

/** His frame of Ren seated for this look, pose and frame, if he painted one. */
export function renSitFrame(look: SpriteAppearance, pose: SpritePose, frame: number, eye: EyeSpecial): OwnerPiece[] | null {
  if (pose !== 'sit' || !wearsRensFigure(look, eye)) return null;
  return REN_SIT[((frame % REN_SIT.length) + REN_SIT.length) % REN_SIT.length];
}

/** Lays his pieces on their joint into a frame's pixels, part and hair (his hair: the head's pieces but its skin and eyes). */
export function stampRenSit(pieces: OwnerPiece[], rig: Rig, look: SpriteAppearance, rgba: Uint8ClampedArray, part: Uint8Array, hair: Uint8Array): void {
  for (const p of pieces) {
    const [ax, ay] = jointPixel(rig, p.joint);
    const x0 = ax - p.pivot[0];
    const y0 = ay - p.pivot[1];
    const pi = partIndex(p.part);
    const rgb: Record<string, [number, number, number]> = {};
    for (const [ch, hex] of Object.entries(p.colors)) {
      const k = p.kinds[ch];
      const h = k === 'skin' ? skinTone(hex, REN_SIT_SKIN, look.skin) : k === 'eye' ? retintHex(hex, REN_SIT_EYE, look.eyeColor) : hex;
      rgb[ch] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    }
    p.rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '.') continue;
        const x = x0 + i;
        const y = y0 + j;
        if (x < 0 || y < 0 || x >= GRID || y >= GRID) continue;
        const n = y * GRID + x;
        rgba.set([...rgb[ch], 255], n * 4);
        part[n] = pi;
        if (p.part === 'head' && p.kinds[ch] === 'keep') hair[n >> 3] |= 1 << (n & 7);
      }
    });
  }
}
