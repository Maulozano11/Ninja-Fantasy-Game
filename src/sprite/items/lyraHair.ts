// Lyra's hair, the owner's picture of her at our game scale (docs/reference/lyra-game-scale-owner-reference.jpg):
// his pixels one for one (lyraHairArt.ts). Every piece rides the face anchor, so the three move as
// one with the head; the long hair and the braid also turn with the torso.

import { faceAnchor } from '../body';
import { retintHex } from '../color';
import type { DrawCtx, ItemDef } from '../ctx';
import { PaintedPiece, segAngle } from '../painted';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, PartId } from '../raster';
import type { Rig } from '../rig';
import { rotateTemplate } from '../rotsprite';
import type { PaintedPart } from './capeArt';
import {
  LYRA_HAIR_BASE,
  LYRA_HAIR_BOW,
  LYRA_HAIR_BRAID,
  LYRA_HAIR_EAR,
  LYRA_HAIR_HEAD,
  LYRA_HAIR_LINE,
  LYRA_HAIR_LONG,
  LYRA_HAIR_PIN,
  LYRA_PIN_BASE,
  LYRA_RIBBON_BASE,
} from './lyraHairArt';

/** Below this tilt from her angle (degrees) a piece goes in as drawn, pixel for pixel. */
const EXACT_TILT = 3;

/**
 * Stamps a piece with its pivot on the face anchor, turned by `tilt` degrees (RotSprite) when the
 * torso leans. Her ear takes the player's skin; every other pixel the colour `color` gives it.
 */
function stamp(g: DrawCtx, L: Layer, p: PaintedPart | PaintedPiece, tilt: number, part: PartId, color: (ch: string, hex: string) => string): void {
  const { nx, ny } = faceAnchor(g);
  const pens: Record<string, [number, number]> = {};
  for (const [ch, hex] of Object.entries(p.colors)) pens[ch] = ch in LYRA_HAIR_EAR ? [g.skin, LYRA_HAIR_EAR[ch]] : [g.m(color(ch, hex), 'flat'), 3];
  const put = (x: number, y: number, ch: string) => {
    const pen = pens[ch];
    if (pen) L.set(x, y, pen[0], pen[1], part, F_NO_TEXTURE | F_NO_OUTLINE);
  };
  L.noFray = true;
  if (Math.abs(tilt) < EXACT_TILT) {
    p.rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] !== '.') put(nx - p.pivot[0] + i, ny - p.pivot[1] + j, row[i]);
    });
    return;
  }
  for (const q of rotateTemplate(p, tilt)) put(nx + q.dx, ny + q.dy, q.ch);
}

/**
 * Our skull takes his head's outline above the eyes: a pixel of it left or right of the head piece's
 * row (or above its top) goes, so no bald edge shows past his hair.
 */
function trimSkull(g: DrawCtx, p: PaintedPart): void {
  const H = g.L('head.body');
  const { nx, ny } = faceAnchor(g);
  const ax = nx - p.pivot[0];
  const ay = ny - p.pivot[1];
  for (let y = Math.max(0, ny - 32); y < ny; y++) {
    const row = p.rows[y - ay];
    const a = row ? row.search(/[^.]/) : -1;
    const b = row ? row.length - 1 - [...row].reverse().join('').search(/[^.]/) : -1;
    for (let x = Math.max(0, nx - 32); x < Math.min(GRID, nx + 32); x++) {
      if (H.has(x, y) && (a < 0 || x - ax < a || x - ax > b)) H.clear(x, y);
    }
  }
}

/**
 * Pitched far forward (the throw, rig.ts THROW) her head is carried out ahead of her neck, and long
 * hair turned only with the torso would hang down over her chest and between her legs: for each
 * design unit the head is ahead of the neck past HEAD_AHEAD, the long hair swings back by HEAD_TURN
 * degrees, up to HEAD_TURN_MAX, so it streams out along her back as a cape does. No other pose
 * carries the head that far forward. (The same rule as Elise's hair.)
 */
const HEAD_AHEAD = 1;
const HEAD_TURN = 18;
const HEAD_TURN_MAX = 60;

/** How far the head sits ahead of the neck, along the shoulder line (design units). */
const headAhead = (r: Rig): number => (r.head.x - r.neck.x) * r.right.x + (r.head.y - r.neck.y) * r.right.y;

/** The extra turn of the long hair (degrees, with the clock) when the head is pitched far forward. */
const swingBack = (r: Rig): number => (r.lay ? 0 : Math.min(HEAD_TURN_MAX, HEAD_TURN * Math.max(0, headAhead(r) - HEAD_AHEAD)));

export const HAIR_COPPER_BRAID: ItemDef = {
  id: 'hair_copper_braid',
  slot: 'hair',
  name: 'Copper Braid',
  desc: 'Waist-long wavy auburn hair with a thick braid over the near shoulder, a fringe swept over the brow, a gold pin and a black bow at the back.',
  colors: [
    { key: 'hair', label: 'Hair', default: LYRA_HAIR_BASE, kind: 'hair' },
    { key: 'ribbon', label: 'Ribbon', default: LYRA_RIBBON_BASE, kind: 'cloth' },
    { key: 'ornament', label: 'Ornament', default: LYRA_PIN_BASE, kind: 'metal' },
  ],
  draw: (g, [hair, ribbon, pin]) => {
    // Her line stays as she drew it; her auburns, the bow's greys and the pin's golds each follow
    // their colour slot (with the defaults, every pixel is hers).
    const color = (ch: string, hex: string) => {
      if (LYRA_HAIR_LINE.includes(ch)) return hex;
      if (LYRA_HAIR_BOW.includes(ch)) return retintHex(hex, LYRA_RIBBON_BASE, ribbon);
      if (LYRA_HAIR_PIN.includes(ch)) return retintHex(hex, LYRA_PIN_BASE, pin);
      return retintHex(hex, LYRA_HAIR_BASE, hair);
    };
    const r = g.rig;
    const tilt = segAngle(r.pelvis, r.neck) - LYRA_HAIR_LONG.angle;
    stamp(g, g.L('hairBack'), LYRA_HAIR_LONG, tilt + swingBack(r), 'back', color);
    const F = g.L('hairFront');
    stamp(g, F, LYRA_HAIR_HEAD, 0, 'head', color);
    stamp(g, F, LYRA_HAIR_BRAID, tilt, 'back', color);
    trimSkull(g, LYRA_HAIR_HEAD);
  },
};
