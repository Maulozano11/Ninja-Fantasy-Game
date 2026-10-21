// The princess's heeled shoes (docs/reference/princess-owner-reference.jpg, the owner's picture of her at our
// game scale, provisional "Rosalind, la Princesa del Alba Rosa"): his pixels, cut by
// tools/refs/princess-shoes-from-ref.py (princessShoesArt.ts), on lilac stockings that run from our knee to
// his feet.

import { retintHex } from '../color';
import { DrawCtx, ItemDef, legDepth, legJoints, Side } from '../ctx';
import { segAngle, stampPiece } from '../painted';
import { F_NO_EDGE, F_NO_OUTLINE, F_NO_TEXTURE, GRID, norm, partIndex, PartId, RES, sub, v, Vec } from '../raster';
import {
  PRINCESS_SHOE_F,
  PRINCESS_SHOE_GOLD,
  PRINCESS_SHOE_KIND,
  PRINCESS_SHOE_LEGS,
  PRINCESS_SHOE_LILAC,
  PRINCESS_SHOE_N,
  PRINCESS_STOCKING,
} from './princessShoesArt';

/**
 * Takes our leg off below the knee (skin and trousers: the shin past the line across the knee, and the
 * foot), so his stocking and shoe are the lower leg. The leg is not outlined along the cut: the stocking's
 * line is across its top.
 */
function lowerLegOff(g: DrawCtx, s: Side, knee: Vec, ankle: Vec): void {
  const shin = partIndex(`shin${s}`);
  const foot = partIndex(`foot${s}`);
  const dir = norm(sub(ankle, knee));
  for (const d of [legDepth(s, 'body'), legDepth(s, 'cloth')]) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || (L.part[i] !== shin && L.part[i] !== foot)) continue;
      const dx = ((i % GRID) + 0.5) / RES - knee.x;
      const dy = (Math.floor(i / GRID) + 0.5) / RES - knee.y;
      if (L.part[i] === foot || dx * dir.x + dy * dir.y > 0) {
        L.mat[i] = -1;
        L.flags[i] |= F_NO_EDGE;
      }
    }
  }
}

/** A point turned by `r` radians about `o` (all in fine pixels). */
const turn = (p: Vec, o: Vec, r: number): Vec => {
  const x = p.x - o.x;
  const y = p.y - o.y;
  return v(o.x + x * Math.cos(r) - y * Math.sin(r), o.y + x * Math.sin(r) + y * Math.cos(r));
};

/**
 * The stocking, from `a` (the middle of its top, half width `ra` to the middle of its line) to `b` (the middle
 * of the shoe piece's first row, half width `rb`), fine pixels: a tube along a curve that leaves the knee down
 * our shin (`shin`, the way it points) and comes into the shoe along `foot` (the way his ankle points), so the
 * top sits square on our leg where it is cut and the bottom on his ankle's lines. Drawn in the pose rather than
 * turned from a picture, so his line stays one clean pixel round it at any angle: his line where a pixel of it
 * touches the outside (along the sides and across the top; not where the shoe covers it, `shoe`), his
 * ribbon's band just under the top line, and his lilac, in shade on the side away from the light (right, or
 * below when it lies).
 */
function stocking(g: DrawCtx, s: Side, a: Vec, ra: number, b: Vec, rb: number, shin: Vec, foot: Vec, shoe: (x: number, y: number) => boolean, color: (hex: string) => number): void {
  const L = g.L(legDepth(s, 'feet'));
  const part: PartId = `shin${s}`;
  const h = Math.hypot(b.x - a.x, b.y - a.y) / 3;
  const c1 = v(a.x + shin.x * h, a.y + shin.y * h);
  const c2 = v(b.x - foot.x * h, b.y - foot.y * h);
  // the curve as a polyline, and on past the foot a little (under the shoe) so no gap opens there
  const N = 32;
  const pts: Vec[] = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const m = 1 - t;
    const w = [m * m * m, 3 * m * m * t, 3 * m * t * t, t * t * t];
    pts.push(v(w[0] * a.x + w[1] * c1.x + w[2] * c2.x + w[3] * b.x, w[0] * a.y + w[1] * c1.y + w[2] * c2.y + w[3] * b.y));
  }
  pts.push(v(b.x + foot.x * 1.5, b.y + foot.y * 1.5));
  /** The nearest point of the curve to a pixel's middle: how far along (0 at the top, 1 at the foot) and to the side (+ toward the shade). */
  const near = (x: number, y: number) => {
    const px = x + 0.5;
    const py = y + 0.5;
    let best = { dist: Infinity, t: 0, side: 0 };
    for (let k = 0; k + 1 < pts.length; k++) {
      const p = pts[k];
      const q = pts[k + 1];
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const l2 = dx * dx + dy * dy || 1e-9;
      const f = Math.max(0, Math.min(1, ((px - p.x) * dx + (py - p.y) * dy) / l2));
      const ex = px - (p.x + dx * f);
      const ey = py - (p.y + dy * f);
      const dist = Math.hypot(ex, ey);
      if (dist < best.dist) {
        const l = Math.sqrt(l2);
        // the side away from the light: right, or below when the stocking lies
        const flip = dy - dx < 0 ? -1 : 1;
        best = { dist, t: (k + f) / N, side: (flip * (ex * dy - ey * dx)) / l };
      }
    }
    return best;
  };
  const below = (x: number, y: number) => (x + 0.5 - a.x) * shin.x + (y + 0.5 - a.y) * shin.y;
  const half = (t: number) => ra + (rb - ra) * Math.max(0, Math.min(1, t));
  const inside = (x: number, y: number) => {
    if (below(x, y) < 0) return false;
    const n = near(x, y);
    return n.dist <= half(n.t) + 0.25;
  };
  const r = Math.max(ra, rb) + 2;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const S = PRINCESS_STOCKING;
  const around = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let y = Math.floor(Math.min(...ys) - r); y <= Math.ceil(Math.max(...ys) + r); y++) {
    for (let x = Math.floor(Math.min(...xs) - r); x <= Math.ceil(Math.max(...xs) + r); x++) {
      if (!inside(x, y)) continue;
      const edge = around.some(([dx, dy]) => !inside(x + dx, y + dy) && !shoe(x + dx, y + dy));
      let hex: string;
      if (edge) hex = S.line;
      else {
        const n = near(x, y);
        const w = half(n.t) - 1.5;
        const side = n.side > w ? 2 : n.side < -w ? 0 : 1;
        if (below(x, y) < 2.0) hex = S.band[side];
        else hex = side === 2 ? S.shade : S.lit;
      }
      L.set(x, y, color(hex), 3, part, F_NO_TEXTURE | F_NO_OUTLINE);
    }
  }
}

export const PRINCESS_SHOES: ItemDef = {
  id: 'feet_rose_heels',
  slot: 'feet',
  name: 'Rose Dawn Heels',
  desc: 'Gold heeled shoes over lilac stockings to the knee, gold ribbons wound round the ankles. Women only.',
  colors: [
    { key: 'gold', label: 'Gold', default: PRINCESS_SHOE_GOLD, kind: 'metal' },
    { key: 'stocking', label: 'Stocking', default: PRINCESS_SHOE_LILAC, kind: 'cloth' },
  ],
  bodies: ['female', 'slender'],
  draw: (g, [gold, lilac]) => {
    // His feet stand lower and further left than ours at idle, so each leg's stocking runs from our knee to
    // his foot and turns with our shin about the knee; the shoe stays flat (as our feet do) where the stocking
    // ends. At idle frame 0 every pixel of the shoes is where he drew it. His gold (shoes, ribbons) and lilac
    // (stockings) follow the colour slots; his black line stays.
    const tint = (hex: string, k: 'line' | 'lilac' | 'gold') =>
      k === 'gold' ? retintHex(hex, PRINCESS_SHOE_GOLD, gold) : k === 'lilac' ? retintHex(hex, PRINCESS_SHOE_LILAC, lilac) : hex;
    const S = PRINCESS_STOCKING;
    const stockingKind = (hex: string) => (hex === S.line ? 'line' : (S.band as readonly string[]).includes(hex) ? 'gold' : 'lilac');
    for (const s of ['F', 'N'] as Side[]) {
      const { knee, ankle } = legJoints(g.rig, s);
      lowerLegOff(g, s, knee, ankle);
      const leg = PRINCESS_SHOE_LEGS[s];
      // our shin's turn from idle, about our knee (fine pixels)
      const r = ((segAngle(knee, ankle) - segAngle(v(leg.knee[0], leg.knee[1]), v(leg.ankle[0], leg.ankle[1]))) * Math.PI) / 180;
      const k = v(knee.x * RES, knee.y * RES);
      const move = (p: readonly [number, number]) => turn(v(p[0] - leg.knee[0] + k.x, p[1] - leg.knee[1] + k.y), k, r);
      const top = move(leg.top);
      // the shoe on whole pixels (its first row's middle falls between two of them), the stocking down into it
      // straight from above as he drew his ankles, whichever way the shin turns
      const at = move(leg.foot);
      const foot = v(Math.round(at.x), Math.round(at.y));
      const shoe = s === 'N' ? PRINCESS_SHOE_N : PRINCESS_SHOE_F;
      // which pixels the shoe will cover (the stocking needs no line there)
      const covers = (x: number, y: number) => (shoe.rows[y - foot.y + shoe.pivot[1]]?.[x - foot.x + 1 + shoe.pivot[0]] ?? '.') !== '.';
      stocking(g, s, top, leg.topHalf, foot, leg.footHalf, norm(sub(ankle, knee)), v(0, 1), covers, (hex) => g.m(tint(hex, stockingKind(hex)), 'flat'));
      // the shoe's pivot is the cell left of the middle of its first row
      stampPiece(g, legDepth(s, 'feet'), shoe, v((foot.x - 0.5) / RES, (foot.y + 0.5) / RES), shoe.angle, `foot${s}`, (ch, hex) => tint(hex, PRINCESS_SHOE_KIND[ch]));
    }
  },
};
