// His Lyra's hands in his read and sit frames (items/lyraReadArt.ts, items/lyraSitArt.ts), as the hands of
// every fitted female body reading or sitting. The owner made those pictures the standard read and sit for
// every character (2026-10-22: "copialo exacto me encanta estas poses nuevas de sentado y leyendo es el
// nuevo standard") and said of her hands: "mira como estan sus manos se ven excelentes copialo igual". The
// read and sit rig of the fitted bodies puts every wrist where he drew hers (rig.ts READ, FIT_SIT), so his
// hand, pinned to the wrist as in his frame, holds the book (campfx.ts) and reaches out as hers do.
//
// His hand is taken as its shape: his skin pixels and the line round them (not her sleeve's cuff), each
// skin pixel the shade of the female skin ramp nearest his colour, so the pen draws it (the character's
// skin, or a glove's material: a glove item paints its zones over it, items/sayaUpper.ts).

import { hexToRgb, makeRamp } from './color';
import { LYRA_READ } from './items/lyraReadArt';
import { LYRA_SIT } from './items/lyraSitArt';
import { OWNER_FRAME_SKIN, readKey, type OwnerPiece } from './ownerFrames';
import type { PixelTemplate } from './rotsprite';
import type { SpritePose } from './types';

/** His hand as a template ('o' his line, '1'-'3' the skin shades) and the way it points from the wrist (unit vector). */
export interface OwnerHand {
  t: PixelTemplate;
  dir: [number, number];
}

const RAMP = makeRamp(OWNER_FRAME_SKIN, 'skinF');
const SHADES = [1, 2, 3].map((i) => [i, hexToRgb(RAMP[i])] as const);

/** The female skin shade (1 deep, 2 shadow, 3 base) nearest one of his skin colours. */
function shadeOf(hex: string): number {
  const c = hexToRgb(hex);
  let best = 3;
  let d = Infinity;
  for (const [i, s] of SHADES) {
    const e = (c[0] - s[0]) ** 2 + (c[1] - s[1]) ** 2 + (c[2] - s[2]) ** 2;
    if (e < d) [best, d] = [i, e];
  }
  return best;
}

/**
 * Whether one of his colours in a hand piece is the hand: his skin, or the red-brown shadows between
 * the fingers that the lift filed under her sleeve's lining (warm, red well above green); not the cream
 * of her cuff.
 */
function handColour(hex: string): boolean {
  const [r, g] = hexToRgb(hex);
  return r - g > 45;
}

function handOf(p: OwnerPiece): OwnerHand {
  const kind = (r: number, i: number) => {
    const ch = p.rows[r]?.[i];
    if (!ch || ch === '.') return undefined;
    return p.kinds[ch] === 'line' ? 'line' : p.kinds[ch] === 'skin' || handColour(p.colors[ch]) ? 'skin' : 'other';
  };
  let sx = 0;
  let sy = 0;
  let n = 0;
  const rows = p.rows.map((row, r) =>
    [...row]
      .map((ch, i) => {
        const k = kind(r, i);
        if (k === 'skin') {
          sx += i - p.pivot[0];
          sy += r - p.pivot[1];
          n++;
          return String(shadeOf(p.colors[ch]));
        }
        // his line where it closes the skin (the cuff's own line goes with the cuff)
        if (k === 'line') {
          for (let dr = -1; dr <= 1; dr++) for (let di = -1; di <= 1; di++) if (kind(r + dr, i + di) === 'skin') return 'o';
        }
        return '.';
      })
      .join(''),
  );
  const l = Math.hypot(sx, sy) || 1;
  return { t: { pivot: p.pivot, rows }, dir: [sx / l, sy / l] };
}

const CACHE = new Map<string, OwnerHand | null>();

/** His Lyra's hand for this side in a read or sit frame, if he drew it there (her near hand sitting is hidden). */
export function ownerHand(pose: SpritePose | string, frame: number, s: 'N' | 'F'): OwnerHand | null {
  const pieces = pose === 'read' ? LYRA_READ[readKey(frame)] : pose === 'sit' ? LYRA_SIT : null;
  if (!pieces) return null;
  const key = `${pose}${pose === 'read' ? readKey(frame) : 0}${s}`;
  if (!CACHE.has(key)) {
    const p = pieces.find((q) => q.owner === 'top' && q.part === (s === 'N' ? 'handN' : 'handF'));
    CACHE.set(key, p ? handOf(p) : null);
  }
  return CACHE.get(key)!;
}
