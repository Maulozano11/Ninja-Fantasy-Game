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
  SAYA_HAIR_EDGE,
  SAYA_HAIR_FRONT,
  SAYA_HAIR_LINE,
  SAYA_HAIR_LONG,
  SAYA_HAIR_ORNAMENT,
  SAYA_HAIR_ORNAMENT_BASE,
  SAYA_HAIR_ORNAMENT_LINE,
} from './sayaHairArt';

type Tint = (ch: string, hex: string) => string;
/** Which pixels of a part to keep (x, y in the frame). */
type Keep = (x: number, y: number) => boolean;

/** Her hair and ornament recoloured: her lines stay, her golds follow the ornament, the rest the hair. */
const sayaHairColor = (hair: string, ornament: string): Tint => (ch, hex) => {
  if (ch === SAYA_HAIR_LINE || ch === SAYA_HAIR_ORNAMENT_LINE) return hex;
  return SAYA_HAIR_ORNAMENT.includes(ch) ? retintHex(hex, SAYA_HAIR_ORNAMENT_BASE, ornament) : retintHex(hex, SAYA_HAIR_BASE, hair);
};

/**
 * Knocked out, the figure is drawn upright and then laid down on its front: hair hanging out behind
 * the head and back would stand up in the air. Only the hair within a few pixels of the body's back
 * (the head, the torso and the legs) is kept then, so it lies on her. Standing, all of it is kept.
 */
function lying(g: DrawCtx): Keep | undefined {
  if (!g.rig.lay) return undefined;
  const back = new Map<number, number>();
  for (const d of ['head.body', 'torso.body', 'torso.under', 'nearLeg.body', 'farLeg.body'] as const) {
    const B = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) {
      if (B.mat[i] < 0) continue;
      const y = (i / GRID) | 0;
      back.set(y, Math.min(back.get(y) ?? GRID, i % GRID));
    }
  }
  return (x, y) => back.has(y) && x >= back.get(y)! - 3;
}

/**
 * Sets a part's pixels; `keep` drops some, and a kept pixel beside a dropped one takes her edge line,
 * so the cut is drawn as her hair's outline.
 */
function put(L: Layer, px: { x: number; y: number; pen: number }[], edge: number, part: 'head' | 'back', keep?: Keep): void {
  const flags = F_NO_TEXTURE | F_NO_OUTLINE;
  if (!keep) {
    for (const p of px) L.set(p.x, p.y, p.pen, 3, part, flags);
    return;
  }
  const all = new Set(px.map((p) => p.y * GRID + p.x));
  const cut = new Set(px.filter((p) => !keep(p.x, p.y)).map((p) => p.y * GRID + p.x));
  for (const p of px) {
    const i = p.y * GRID + p.x;
    if (cut.has(i)) continue;
    const onCut = [i - 1, i + 1, i - GRID, i + GRID].some((q) => all.has(q) && cut.has(q));
    L.set(p.x, p.y, onCut ? edge : p.pen, 3, part, flags);
  }
}

const pensOf = (g: DrawCtx, colors: Record<string, string>, tint: Tint): Record<string, number> => {
  const pens: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(colors)) pens[ch] = g.m(tint(ch, hex), 'flat');
  return pens;
};

/**
 * Stamps a part with its pivot on the face anchor (the near eye's lash start), so it frames the eyes
 * as she has it on every body and in every pose. Her pixels are the final on-screen pixels. `keep`
 * applies below the jaw only: above it her hair is the head's own outline.
 */
function atFace(g: DrawCtx, L: Layer, p: PaintedPart, tint: Tint, keep?: Keep): void {
  const { nx, ny } = faceAnchor(g);
  const ax = nx - p.pivot[0];
  const ay = ny - p.pivot[1];
  const pens = pensOf(g, p.colors, tint);
  const px: { x: number; y: number; pen: number }[] = [];
  p.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') px.push({ x: ax + i, y: ay + j, pen: pens[row[i]] });
  });
  const jaw = ny + 3;
  put(L, px, pens[SAYA_HAIR_EDGE], 'head', keep && ((x, y) => y < jaw || keep(x, y)));
}

/** The long hair, hung from the neck and turned with the torso (neck to pelvis), so it runs down the back in every pose. */
function longHair(g: DrawCtx, p: PaintedPiece, tint: Tint, keep?: Keep): void {
  const r = g.rig;
  const pens = pensOf(g, p.colors, tint);
  const ax = Math.floor(r.neck.x * RES);
  const ay = Math.floor(r.neck.y * RES);
  const px = rotateTemplate(p, segAngle(r.neck, r.pelvis) - p.angle).map((q) => ({ x: ax + q.dx, y: ay + q.dy, pen: pens[q.ch] }));
  put(g.L('hairBack'), px, pens[SAYA_HAIR_EDGE], 'back', keep);
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
    const keep = lying(g);
    const B = g.L('hairBack');
    const F = g.L('hairFront');
    B.noFray = true;
    F.noFray = true;
    longHair(g, SAYA_HAIR_LONG, tint, keep);
    atFace(g, B, SAYA_HAIR_BACK, tint, keep);
    atFace(g, F, SAYA_HAIR_FRONT, tint, keep);
    trimSkull(g, SAYA_HAIR_BACK);
  },
};
