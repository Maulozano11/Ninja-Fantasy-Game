// The owner's hair on his Saya (2026-10-21), copied 1:1 from his picture at our game's scale
// (sayaHairArt.ts, tools/refs/saya-hair-from-ref.py): long straight blonde hair down the back.
import { faceAnchor } from '../body';
import { retintHex } from '../color';
import type { DrawCtx, ItemDef } from '../ctx';
import { PaintedPiece, segAngle } from '../painted';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, RES } from '../raster';
import { rotateTemplate } from '../rotsprite';
import {
  SAYA_HAIR_BACK,
  SAYA_HAIR_BASE,
  SAYA_HAIR_EYES,
  SAYA_HAIR_FRONT,
  SAYA_HAIR_LINE,
  SAYA_HAIR_LONG,
  SAYA_HAIR_NECK,
  SAYA_HAIR_ORNAMENT,
  SAYA_HAIR_ORNAMENT_BASE,
  SayaFacePart,
} from './sayaHairArt';

type Tint = (ch: string, hex: string) => string;
/** Which pixels of a part to keep (x, y in the frame). */
type Keep = (x: number, y: number) => boolean;

/** His hair and ornament recoloured: his line stays, his ornament follows the ornament colour, the rest the hair. */
const sayaHairColor = (hair: string, ornament: string): Tint => (ch, hex) => {
  if (ch === SAYA_HAIR_LINE) return hex;
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
 * Sets a part's pixels; `keep` drops some, and a kept pixel beside a dropped one takes his black line,
 * so the cut is drawn as the hair's outline.
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
 * A face part's pixels in the frame, its pivot on the face anchor (the near eye), so it frames the
 * eyes as he has it on every body and in every pose. His far iris is SAYA_HAIR_EYES from the anchor;
 * where ours is further off (9 on our standard faces), the part's far side (in each row from
 * `farCols` on) moves out with it, one pixel more each row from `farFrom`, and the strand just inside
 * repeats across the gap where the crown is whole. So the far lock frames our far eye instead of covering it.
 */
function facePixels(g: DrawCtx, p: SayaFacePart): { x: number; y: number; ch: string }[] {
  const { ex, fx, ny } = faceAnchor(g);
  // Her own eyes ('shade') draw the far iris a cell past the template's far eye: the lock frames it there.
  const iris = fx + (g.look.eyeShape === 'shade' ? 1 : 0);
  const d = Math.max(-2, Math.min(3, iris - ex - SAYA_HAIR_EYES));
  const ax = ex - p.pivot[0];
  const ay = ny - p.pivot[1];
  const hair = (ch: string | undefined) => ch !== undefined && ch !== '.' && ch !== SAYA_HAIR_LINE;
  const out: { x: number; y: number; ch: string }[] = [];
  p.rows.forEach((row, j) => {
    if (j < p.farFrom) {
      for (let i = 0; i < row.length; i++) if (row[i] !== '.') out.push({ x: ax + i, y: ay + j, ch: row[i] });
      return;
    }
    const fc = p.farCols[j - p.farFrom] ?? row.length;
    const s = Math.sign(d) * Math.min(Math.abs(d), j - p.farFrom + 1);
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') out.push({ x: ax + i + (i >= fc ? s : 0), y: ay + j, ch: row[i] });
    if (s > 0 && hair(row[fc - 1]) && hair(row[fc])) for (let t = 0; t < s; t++) out.push({ x: ax + fc + t, y: ay + j, ch: row[fc - 1] });
    // Below the eyes, where the far lock's line leaves our jaw, his line spans the gap so no
    // background shows between the cheek and the lock (he has them touching).
    else if (s > 0 && j >= p.pivot[1] + 3 && row[fc] === SAYA_HAIR_LINE && !hair(row[fc - 1]))
      for (let t = 0; t < s; t++) out.push({ x: ax + fc + t, y: ay + j, ch: SAYA_HAIR_LINE });
  });
  return out;
}

/** Stamps a face part. `keep` applies below the jaw only: above it his hair is the head's own outline. */
function atFace(g: DrawCtx, L: Layer, p: SayaFacePart, tint: Tint, keep?: Keep): void {
  const pens = pensOf(g, p.colors, tint);
  const px = facePixels(g, p).map((q) => ({ x: q.x, y: q.y, pen: pens[q.ch] }));
  const jaw = faceAnchor(g).ny + 3;
  put(L, px, pens[SAYA_HAIR_LINE], 'head', keep && ((x, y) => y < jaw || keep(x, y)));
}

/** How far (degrees) the long hair turns with the torso at most: past it, it hangs. */
const LONG_TURN = 22;

/**
 * The long hair, hung from the head (where the neck is at rest, so it moves with the head and its top
 * stays behind it) and turned with the torso (neck to pelvis), so it runs down the back in every pose.
 * When the body pitches far over (the throw's release, the lunge) it turns no further than LONG_TURN
 * and hangs, instead of lying along the raised arm and leaving the back of the head bare.
 */
function longHair(g: DrawCtx, p: PaintedPiece, tint: Tint, keep?: Keep): void {
  const r = g.rig;
  const pens = pensOf(g, p.colors, tint);
  const { ex, ny } = faceAnchor(g);
  const ax = ex + SAYA_HAIR_NECK[0];
  const ay = ny + SAYA_HAIR_NECK[1];
  const turn = Math.max(-LONG_TURN, Math.min(LONG_TURN, segAngle(r.neck, r.pelvis) - p.angle));
  const px = rotateTemplate(p, turn).map((q) => ({ x: ax + q.dx, y: ay + q.dy, pen: pens[q.ch] }));
  put(g.L('hairBack'), px, pens[SAYA_HAIR_LINE], 'back', keep);
}

/** Above the eyes his hair is the head's outline: the skull is trimmed to the back part. */
function trimSkull(g: DrawCtx, p: SayaFacePart): void {
  const H = g.L('head.body');
  const { ny } = faceAnchor(g);
  const own = new Set(facePixels(g, p).map((q) => q.y * GRID + q.x));
  let x0 = GRID;
  let x1 = 0;
  for (const i of own) {
    x0 = Math.min(x0, i % GRID);
    x1 = Math.max(x1, i % GRID);
  }
  for (let y = Math.max(0, ny - 32); y < ny; y++) {
    for (let x = Math.max(0, x0 - 8); x <= Math.min(GRID - 1, x1 + 8); x++) {
      if (H.has(x, y) && !own.has(y * GRID + x)) H.clear(x, y);
    }
  }
}

export const SAYA_HAIR: ItemDef = {
  id: 'hair_sun_fall',
  slot: 'hair',
  name: 'Sunfall Tresses',
  desc: 'Long straight blonde hair down the back: side-swept bangs with a strand between the eyes, a gold checker ornament on the crown, a lock down each cheek, the near one over the chest, and the rest falling behind the near shoulder.',
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
