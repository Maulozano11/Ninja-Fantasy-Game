// The owner's hair on his Saya (2026-10-21), brought down to our scale in her colours
// (sayaHairArt.ts, tools/refs/saya-hair-from-ref.py): long straight blonde hair to the waist.

import { faceAnchor } from '../body';
import { retintHex } from '../color';
import type { DrawCtx, ItemDef } from '../ctx';
import { PaintedPiece, segAngle } from '../painted';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, RES } from '../raster';
import { rotateTemplate } from '../rotsprite';
import type { PaintedPart } from './capeArt';
import {
  SAYA_HAIR_BACK,
  SAYA_HAIR_BASE,
  SAYA_HAIR_FRONT,
  SAYA_HAIR_LINE,
  SAYA_HAIR_LONG,
  SAYA_HAIR_ORNAMENT,
  SAYA_HAIR_ORNAMENT_BASE,
  SAYA_HAIR_ORNAMENT_LINE,
} from './sayaHairArt';

/** Her hair and ornament recoloured: her lines stay, her golds follow the ornament, the rest the hair. */
const sayaHairColor = (hair: string, ornament: string) => (ch: string, hex: string) => {
  if (ch === SAYA_HAIR_LINE || ch === SAYA_HAIR_ORNAMENT_LINE) return hex;
  return SAYA_HAIR_ORNAMENT.includes(ch) ? retintHex(hex, SAYA_HAIR_ORNAMENT_BASE, ornament) : retintHex(hex, SAYA_HAIR_BASE, hair);
};

/**
 * Stamps a part with its pivot on the face anchor (the near eye's lash start), so it frames the eyes
 * as she has it on every body and in every pose. Her pixels are the final on-screen pixels.
 */
function atFace(g: DrawCtx, L: Layer, p: PaintedPart, color: (ch: string, hex: string) => string): void {
  const { nx, ny } = faceAnchor(g);
  const ax = nx - p.pivot[0];
  const ay = ny - p.pivot[1];
  const pens: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(p.colors)) pens[ch] = g.m(color(ch, hex), 'flat');
  L.noFray = true;
  p.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch !== '.') L.set(ax + i, ay + j, pens[ch], 3, 'head', F_NO_TEXTURE | F_NO_OUTLINE);
    }
  });
}

/**
 * The long hair, hung from the neck and turned with the torso (neck to pelvis), so it runs down the back
 * in every pose. Knocked out (drawn upright, then laid down) only the hair within a few pixels of the
 * back is kept: it lies on her back instead of standing up in the air.
 */
function longHair(g: DrawCtx, p: PaintedPiece, color: (ch: string, hex: string) => string): void {
  const r = g.rig;
  const L = g.L('hairBack');
  const pens: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(p.colors)) pens[ch] = g.m(color(ch, hex), 'flat');
  const back = new Map<number, number>();
  if (r.lay) {
    for (const d of ['head.body', 'torso.body', 'torso.under', 'nearLeg.body', 'farLeg.body'] as const) {
      const B = g.L(d);
      for (let i = 0; i < GRID * GRID; i++) {
        if (B.mat[i] < 0) continue;
        const y = (i / GRID) | 0;
        back.set(y, Math.min(back.get(y) ?? GRID, i % GRID));
      }
    }
  }
  const ax = Math.floor(r.neck.x * RES);
  const ay = Math.floor(r.neck.y * RES);
  for (const q of rotateTemplate(p, segAngle(r.neck, r.pelvis) - p.angle)) {
    const x = ax + q.dx;
    const y = ay + q.dy;
    if (r.lay && !(back.has(y) && x >= back.get(y)! - 3)) continue;
    L.set(x, y, pens[q.ch], 3, 'back', F_NO_TEXTURE | F_NO_OUTLINE);
  }
}

/** Above the eyes her hair is the head's outline: the skull is trimmed to the back part. */
function trimSkull(g: DrawCtx, p: PaintedPart): void {
  const H = g.L('head.body');
  const { nx, ny } = faceAnchor(g);
  const ax = nx - p.pivot[0];
  const ay = ny - p.pivot[1];
  for (let y = Math.max(0, ny - 32); y < ny; y++) {
    for (let x = Math.max(0, nx - 32); x < Math.min(GRID, nx + 32); x++) {
      if (H.has(x, y) && (p.rows[y - ay]?.[x - ax] ?? '.') === '.') H.clear(x, y);
    }
  }
}

export const SAYA_HAIR: ItemDef = {
  id: 'hair_sun_fall',
  slot: 'hair',
  name: 'Sunfall Tresses',
  desc: 'Long straight blonde hair to the waist: side-swept bangs with one long strand between the eyes, a gold knot on the crown, a side lock falling in front of the shoulder, and the rest down the back, a loose strand curling out at the shoulder.',
  colors: [
    { key: 'hair', label: 'Hair', default: SAYA_HAIR_BASE, kind: 'hair' },
    { key: 'ornament', label: 'Ornament', default: SAYA_HAIR_ORNAMENT_BASE, kind: 'metal' },
  ],
  draw: (g, [hair, ornament]) => {
    const tint = sayaHairColor(hair, ornament);
    const B = g.L('hairBack');
    B.noFray = true;
    longHair(g, SAYA_HAIR_LONG, tint);
    atFace(g, B, SAYA_HAIR_BACK, tint);
    atFace(g, g.L('hairFront'), SAYA_HAIR_FRONT, tint);
    trimSkull(g, SAYA_HAIR_BACK);
  },
};
