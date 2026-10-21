// The princess's hair and tiara (provisional "Rosalind, the Rose Dawn Princess"), the owner's picture at our
// game scale: his pixels one for one (princessHairArt.ts, tools/refs/princess-hair-from-ref.py). The hair is a
// hairstyle; the tiara is a separate accessory that sits where it sits on her (it fits any hairstyle).

import { faceAnchor } from '../body';
import { retintHex } from '../color';
import type { DrawCtx, ItemDef } from '../ctx';
import { PaintedPiece, segAngle } from '../painted';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, RES } from '../raster';
import { rotateTemplate } from '../rotsprite';
import {
  PRINCESS_EYES_APART,
  PRINCESS_FAR_COL,
  PRINCESS_FAR_FROM,
  PRINCESS_HAIR_BACK,
  PRINCESS_HAIR_BARE,
  PRINCESS_HAIR_BASE,
  PRINCESS_HAIR_EAR,
  PRINCESS_HAIR_HEAD,
  PRINCESS_HAIR_LINE,
  PRINCESS_HAIR_LONG,
  PRINCESS_HAIR_STRAND,
  PRINCESS_TIARA,
  PRINCESS_TIARA_FIXED,
  PRINCESS_TIARA_GEM,
  PRINCESS_TIARA_GOLD,
  PRINCESS_TIARA_RED,
  type PrincessFacePart,
} from './princessHairArt';

/** Below this tilt from his angle (degrees) a hanging piece goes in as he drew it, pixel for pixel. */
const EXACT_TILT = 3;

type Tint = (ch: string, hex: string) => string;
/** Which pixels to keep (x, y in the frame). */
type Keep = (x: number, y: number) => boolean;
type Px = { x: number; y: number; ch: string };

/**
 * A face piece's pixels in the frame, its pivot on the face anchor. His far eye is PRINCESS_EYES_APART from
 * his near one; where ours is further off (or closer), the piece's far side moves with it, one pixel more each
 * row from the forehead down, and where it moves out the column just inside repeats across the gap.
 */
function facePixels(g: DrawCtx, p: PrincessFacePart): Px[] {
  const { ex, fx, ny } = faceAnchor(g);
  const d = Math.max(-2, Math.min(3, fx - ex - PRINCESS_EYES_APART));
  const ax = ex - p.pivot[0];
  const ay = ny - p.pivot[1];
  const out: Px[] = [];
  p.rows.forEach((row, j) => {
    const dy = j - p.pivot[1];
    const s = dy < PRINCESS_FAR_FROM ? 0 : Math.sign(d) * Math.min(Math.abs(d), dy - PRINCESS_FAR_FROM + 1);
    const fc = p.pivot[0] + PRINCESS_FAR_COL;
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') out.push({ x: ax + i + (i >= fc ? s : 0), y: ay + j, ch: row[i] });
    if (s > 0 && row[fc - 1] && row[fc - 1] !== '.' && row[fc] && row[fc] !== '.') for (let t = 0; t < s; t++) out.push({ x: ax + fc + t, y: ay + j, ch: row[fc - 1] });
  });
  return out;
}

/** A hanging piece's pixels, its pivot on our neck, turned with the torso (neck to pelvis). */
function neckPixels(g: DrawCtx, p: PaintedPiece): Px[] {
  const r = g.rig;
  const ax = Math.floor(r.neck.x * RES);
  const ay = Math.floor(r.neck.y * RES);
  const tilt = segAngle(r.neck, r.pelvis) - p.angle;
  if (Math.abs(tilt) < EXACT_TILT) {
    const out: Px[] = [];
    p.rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] !== '.') out.push({ x: ax - p.pivot[0] + i, y: ay - p.pivot[1] + j, ch: row[i] });
    });
    return out;
  }
  return rotateTemplate(p, tilt).map((q) => ({ x: ax + q.dx, y: ay + q.dy, ch: q.ch }));
}

/**
 * Sets pixels on a layer in his colours (recoloured by `tint`); her ear takes the player's skin. `keep`
 * drops some, and a kept pixel beside a dropped one takes his line, so the cut reads as the hair's outline.
 */
function put(g: DrawCtx, L: Layer, px: Px[], colors: Record<string, string>, tint: Tint, part: 'head' | 'back', keep?: Keep, ear?: Record<string, number>): void {
  const pens: Record<string, [number, number]> = {};
  for (const [ch, hex] of Object.entries(colors)) pens[ch] = ear && ch in ear ? [g.skin, ear[ch]] : [g.m(tint(ch, hex), 'flat'), 3];
  const edge = pens[PRINCESS_HAIR_LINE[0]];
  const flags = F_NO_TEXTURE | F_NO_OUTLINE;
  const cut = keep ? new Set(px.filter((p) => !keep(p.x, p.y)).map((p) => p.y * GRID + p.x)) : undefined;
  const all = cut ? new Set(px.map((p) => p.y * GRID + p.x)) : undefined;
  for (const p of px) {
    if (p.x < 0 || p.y < 0 || p.x >= GRID || p.y >= GRID) continue;
    const i = p.y * GRID + p.x;
    if (cut?.has(i)) continue;
    const onCut = cut && [i - 1, i + 1, i - GRID, i + GRID].some((q) => all!.has(q) && cut.has(q));
    const pen = onCut && edge ? edge : pens[p.ch];
    if (pen) L.set(p.x, p.y, pen[0], pen[1], part, flags);
  }
}

/**
 * Knocked out, the figure is drawn upright and then laid down on its front: hair hanging out behind the
 * head and back would stand up in the air. Only the hair within a few pixels of the body's back is kept
 * then, so it lies on her. Standing, all of it is kept.
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

/** Above the eyes his hair is the head's outline: our skull is trimmed to the head piece. */
function trimSkull(g: DrawCtx): void {
  const H = g.L('head.body');
  const { ny } = faceAnchor(g);
  const own = new Map<number, [number, number]>();
  let top = GRID;
  for (const q of facePixels(g, PRINCESS_HAIR_HEAD)) {
    const s = own.get(q.y);
    own.set(q.y, s ? [Math.min(s[0], q.x), Math.max(s[1], q.x)] : [q.x, q.x]);
    top = Math.min(top, q.y);
  }
  for (let y = Math.max(0, ny - 32); y < ny; y++) {
    const s = own.get(y);
    for (let x = 0; x < GRID; x++) {
      if (H.has(x, y) && (y < top || !s || x < s[0] || x > s[1])) H.clear(x, y);
    }
  }
}

export const TIARA_ID = 'acc_rose_tiara';

export const HAIR_ROSE_DAWN: ItemDef = {
  id: 'hair_rose_dawn',
  slot: 'hair',
  name: 'Rose Dawn Waves',
  desc: 'Long wavy pink hair to the waist: soft bangs, a lock framing each cheek, the near one falling over the shoulder onto the chest, and the rest in big waves down the back with a curled tip.',
  colors: [{ key: 'hair', label: 'Hair', default: PRINCESS_HAIR_BASE, kind: 'hair' }],
  draw: (g, [hair]) => {
    // His line stays as he drew it; every pink of his follows the hair colour (with the default, every
    // pixel is his).
    const tint: Tint = (ch, hex) => (PRINCESS_HAIR_LINE.includes(ch) ? hex : retintHex(hex, PRINCESS_HAIR_BASE, hair));
    const keep = lying(g);
    // Above the jaw his hair is the head's own outline: the cut while lying only applies below it.
    const jaw = faceAnchor(g).ny + 3;
    const headKeep: Keep | undefined = keep && ((x, y) => y < jaw || keep(x, y));
    const B = g.L('hairBack');
    const F = g.L('hairFront');
    B.noFray = true;
    F.noFray = true;
    const C = PRINCESS_HAIR_HEAD.colors;
    put(g, B, neckPixels(g, PRINCESS_HAIR_LONG), C, tint, 'back', keep);
    put(g, B, facePixels(g, PRINCESS_HAIR_BACK), C, tint, 'head', headKeep);
    put(g, F, neckPixels(g, PRINCESS_HAIR_STRAND), C, tint, 'back', keep);
    put(g, F, facePixels(g, PRINCESS_HAIR_HEAD), C, tint, 'head', headKeep, PRINCESS_HAIR_EAR);
    // Without her tiara, the band's shadow on the crown goes.
    if (!g.look.accessories.some((a) => a.id === TIARA_ID)) put(g, F, facePixels(g, PRINCESS_HAIR_BARE), C, tint, 'head', headKeep);
    trimSkull(g);
  },
};

export const ACC_ROSE_TIARA: ItemDef = {
  id: TIARA_ID,
  slot: 'accessory',
  name: 'Rose Dawn Tiara',
  desc: 'A gold tiara with a red gem at its peak, worn on the crown.',
  colors: [
    { key: 'gold', label: 'Gold', default: PRINCESS_TIARA_GOLD, kind: 'metal' },
    { key: 'gem', label: 'Gem', default: PRINCESS_TIARA_RED, kind: 'cloth' },
  ],
  draw: (g, [gold, gem]) => {
    const tint: Tint = (ch, hex) => {
      if (PRINCESS_TIARA_FIXED.includes(ch)) return hex;
      return PRINCESS_TIARA_GEM.includes(ch) ? retintHex(hex, PRINCESS_TIARA_RED, gem) : retintHex(hex, PRINCESS_TIARA_GOLD, gold);
    };
    put(g, g.L('head.gear'), facePixels(g, PRINCESS_TIARA), PRINCESS_TIARA.colors, tint, 'head');
  },
};
