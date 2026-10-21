// Aurelia's skirt and sash, after the owner's fourth heroine (docs/reference/aurelia-owner-reference.jpg):
// her long white skirt open at the sides (the front panel, the side panels and the grey lining behind
// her legs) and her gold sash with the belt, the pouch and the charm. The pieces are drawn at our scale
// in her colours by tools/refs/aurelia-lower-from-ref.py (aureliaLowerArt.ts), each on our female at
// idle frame 0; here they ride the rig. Each piece hangs between columns: their tops ride the torso,
// their bottoms hang below the hips and swing a little with the thighs, as the other long skirts do
// (armor.ts hang()), so the panels move with the legs in walk, run, sit and crouch. The piece is
// sampled between its columns: at rest every pixel is hers as drawn, moved it keeps her line round it.

import { retintHex } from '../color';
import type { Depth, DrawCtx, ItemDef } from '../ctx';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, type PartId, RES, v, type Vec } from '../raster';
import { BODY_PARAMS, drawRig, GROUND, type Rig } from '../rig';
import type { BodyType } from '../types';
import { DAWN_BASE, DAWN_FAR, DAWN_FRONT, DAWN_LINE, DAWN_LINING, DAWN_NEAR, DAWN_WAIST, type DawnPiece } from './aureliaLowerArt';

/** How much a hanging piece follows its thigh (as armor.ts HANG_FOLLOW: skirts never bell out). */
const FOLLOW = 0.22;
/** Lowest a hem hangs (design y): the soles' row, so in a deep crouch it rests on the ground. */
const HEM_FLOOR = GROUND + 1.5;
/** Torso-local height of the line the bottoms hang from (as armor.ts hang()). */
const HANG_Y = 0.5;

/** Our female at idle frame 0, where every piece was drawn. */
let restRig: Rig | null = null;
const rest = (): Rig => (restRig ??= drawRig('female', 'idle', 0));

const sub = (a: Vec, b: Vec): Vec => v(a.x - b.x, a.y - b.y);
const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

/** A design point as torso-local (x along rig.right, y along rig.up from the pelvis). */
function local(r: Rig, p: Vec): Vec {
  const d = sub(p, r.pelvis);
  return v(dot(d, r.right), dot(d, r.up));
}

/** Half widths of the torso's silhouette, near and far side, at the waist and at the hips (ctx.ts torsoPoly). */
function widths(body: BodyType) {
  const b = BODY_PARAMS[body];
  return {
    waistN: b.waistHalf * 0.86,
    waistF: b.waistHalf * 0.64 + 0.7,
    hipN: b.hipHalf * 0.5 + b.legR[0] * 0.96,
    hipF: b.hipHalf * 0.42 + b.legR[0] * 0.9,
  };
}

/** A torso-local point drawn on the female, moved onto `body`'s torso: across, by its waist and hips. */
function fitLocal(body: BodyType, p: Vec): Vec {
  if (body === 'female') return p;
  const a = widths('female');
  const b = widths(body);
  const t = clamp((p.y - 1.6) / (5.4 - 1.6), 0, 1);
  const k = p.x < 0 ? b.hipN / a.hipN + (b.waistN / a.waistN - b.hipN / a.hipN) * t : b.hipF / a.hipF + (b.waistF / a.waistF - b.hipF / a.hipF) * t;
  return v(p.x * k, p.y);
}

/** The angle (radians) a piece hangs at, `w` of the way from the near thigh to the far one. */
function hangAngle(r: Rig, w: number): number {
  const tN = sub(r.kneeN, r.hipN);
  const tF = sub(r.kneeF, r.hipF);
  const t = v(tN.x + (tF.x - tN.x) * w, tN.y + (tF.y - tN.y) * w);
  const l = Math.hypot(t.x, t.y);
  const d = v(t.x * FOLLOW, l + (t.y - l) * FOLLOW);
  return Math.atan2(d.y, d.x);
}

/** Near (0) .. far (1) thigh blend of a torso-local x (as armor.ts hang()). */
function thighBlend(r: Rig, lx: number): number {
  const xN = -r.bp.hipHalf * 0.55;
  const xF = r.bp.hipHalf * 0.45;
  return clamp((lx - xN) / (xF - xN), 0, 1);
}

type Col = { top: Vec; bot: Vec };

/** A piece's columns at rest (fine pixels). */
const restCols = (p: DawnPiece): Col[] => p.cols.map(([tx, ty, bx, by]) => ({ top: v(tx, ty), bot: v(bx, by) }));

/** A piece's columns in this frame (fine pixels): the tops ride the torso; the bottoms hang, or ride it too. */
function poseCols(g: DrawCtx, p: DawnPiece): Col[] {
  const R0 = rest();
  const r = g.rig;
  const body = g.look.body;
  const legScale = (r.bp.thigh + r.bp.shin) / (R0.bp.thigh + R0.bp.shin);
  const at = (q: Vec): Vec => {
    const l = fitLocal(body, local(R0, v(q.x / RES, q.y / RES)));
    const P = r.T(l.x, l.y);
    return v(P.x * RES, P.y * RES);
  };
  return restCols(p).map(({ top, bot }) => {
    const T = at(top);
    if (!p.hang) return { top: T, bot: at(bot) };
    const lt = local(R0, v(top.x / RES, top.y / RES));
    const w = thighBlend(R0, lt.x);
    const a0 = R0.T(lt.x, HANG_Y);
    const lf = fitLocal(body, v(lt.x, HANG_Y));
    const a1 = r.T(lf.x, lf.y);
    const d = sub(v(bot.x / RES, bot.y / RES), a0);
    const th = hangAngle(r, thighBlend(r, lf.x)) - hangAngle(R0, w);
    const c = Math.cos(th);
    const s = Math.sin(th);
    const b = v(a1.x + (d.x * c - d.y * s) * legScale, a1.y + (d.x * s + d.y * c) * legScale);
    return { top: T, bot: v(b.x * RES, Math.min(b.y, HEM_FLOOR) * RES) };
  });
}

/** (u, v) of a point in the quad p00 p10 p01 p11 (bilinear), or null outside it. */
function invBilinear(q: Vec, p00: Vec, p10: Vec, p01: Vec, p11: Vec): [number, number] | null {
  let u = 0.5;
  let w = 0.5;
  for (let i = 0; i < 12; i++) {
    const ex = p00.x + (p10.x - p00.x) * u + (p01.x - p00.x) * w + (p00.x - p10.x - p01.x + p11.x) * u * w - q.x;
    const ey = p00.y + (p10.y - p00.y) * u + (p01.y - p00.y) * w + (p00.y - p10.y - p01.y + p11.y) * u * w - q.y;
    const ux = p10.x - p00.x + (p00.x - p10.x - p01.x + p11.x) * w;
    const uy = p10.y - p00.y + (p00.y - p10.y - p01.y + p11.y) * w;
    const wx = p01.x - p00.x + (p00.x - p10.x - p01.x + p11.x) * u;
    const wy = p01.y - p00.y + (p00.y - p10.y - p01.y + p11.y) * u;
    const det = ux * wy - uy * wx;
    if (Math.abs(det) < 1e-9) return null;
    const du = (ex * wy - ey * wx) / det;
    const dw = (ux * ey - uy * ex) / det;
    u -= du;
    w -= dw;
    if (Math.abs(du) < 1e-10 && Math.abs(dw) < 1e-10) break;
  }
  const E = 1e-7;
  return u >= -E && u <= 1 + E && w >= -E && w <= 1 + E ? [u, w] : null;
}

const lerp2 = (p00: Vec, p10: Vec, p01: Vec, p11: Vec, u: number, w: number): Vec =>
  v(
    p00.x * (1 - u) * (1 - w) + p10.x * u * (1 - w) + p01.x * (1 - u) * w + p11.x * u * w,
    p00.y * (1 - u) * (1 - w) + p10.y * u * (1 - w) + p01.y * (1 - u) * w + p11.y * u * w,
  );

/**
 * The piece in this frame: frame pixel index -> its character. At rest it is the piece as drawn; moved,
 * each pixel takes the pixel of hers its centre comes from between the columns, and her line goes
 * round the edge again (an edge pixel of hers pulled inside takes the colour inside it, an edge pixel
 * of the moved piece is her line, except along the open top).
 */
export function placePiece(g: DrawCtx, p: DawnPiece): Map<number, string> {
  const R = restCols(p);
  const P = poseCols(g, p);
  const [ox, oy] = p.origin;
  const H = p.rows.length;
  const W = p.rows[0].length;
  const out = new Map<number, string>();
  const still = P.every((c, i) => Math.abs(c.top.x - R[i].top.x) + Math.abs(c.top.y - R[i].top.y) + Math.abs(c.bot.x - R[i].bot.x) + Math.abs(c.bot.y - R[i].bot.y) < 1e-6);
  if (still) {
    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++) {
        const ch = p.rows[j][i];
        const x = ox + i;
        const y = oy + j;
        if (ch !== '.' && x >= 0 && y >= 0 && x < GRID && y < GRID) out.set(y * GRID + x, ch);
      }
    return out;
  }
  const src = new Map<number, [number, number]>();
  for (let k = 0; k + 1 < P.length; k++) {
    const [a, b] = [P[k], P[k + 1]];
    const [ra, rb] = [R[k], R[k + 1]];
    const x0 = Math.floor(Math.min(a.top.x, b.top.x, a.bot.x, b.bot.x));
    const x1 = Math.ceil(Math.max(a.top.x, b.top.x, a.bot.x, b.bot.x));
    const y0 = Math.floor(Math.min(a.top.y, b.top.y, a.bot.y, b.bot.y));
    const y1 = Math.ceil(Math.max(a.top.y, b.top.y, a.bot.y, b.bot.y));
    for (let y = Math.max(0, y0); y <= Math.min(GRID - 1, y1); y++)
      for (let x = Math.max(0, x0); x <= Math.min(GRID - 1, x1); x++) {
        const idx = y * GRID + x;
        if (out.has(idx)) continue;
        const uv = invBilinear(v(x + 0.5, y + 0.5), a.top, b.top, a.bot, b.bot);
        if (!uv) continue;
        const q = lerp2(ra.top, rb.top, ra.bot, rb.bot, uv[0], uv[1]);
        const i = Math.floor(q.x) - ox;
        const j = Math.floor(q.y) - oy;
        if (i < 0 || j < 0 || i >= W || j >= H) continue;
        const ch = p.rows[j][i];
        if (ch === '.') continue;
        out.set(idx, ch);
        src.set(idx, [i, j]);
      }
  }
  // her line round the moved piece
  const fixed = new Map<number, string>();
  for (const [idx, ch] of out) {
    const x = idx % GRID;
    const y = (idx - x) / GRID;
    const edge = [idx - 1, idx + 1, idx - GRID, idx + GRID].some((n) => !out.has(n)) || x === 0 || x === GRID - 1;
    const [i, j] = src.get(idx)!;
    if (edge && j >= p.openTop) fixed.set(idx, 'k');
    else if (!edge && p.fill[j][i] !== '.') fixed.set(idx, p.fill[j][i]);
    else fixed.set(idx, ch);
  }
  return fixed;
}

/** Stamps a piece into a depth in her colours (`tint` recolours a colour of a slot). */
function drawPiece(g: DrawCtx, depth: Depth, part: PartId, p: DawnPiece, tint: (role: string, hex: string) => string): void {
  const L = g.L(depth);
  const mats = new Map<string, number>();
  const mat = (ch: string): number => {
    let m = mats.get(ch);
    if (m === undefined) {
      const hex = ch === 'k' ? DAWN_LINE : p.colors[ch];
      const role = p.roles[ch];
      m = g.m(role ? tint(role, hex) : hex, 'flat');
      mats.set(ch, m);
    }
    return m;
  };
  for (const [idx, ch] of placePiece(g, p)) L.set(idx % GRID, Math.floor(idx / GRID), mat(ch), 3, part, F_NO_TEXTURE | F_NO_OUTLINE);
}

/** The base body's shorts (body.ts undergarments): her skirt is open at the sides, her thighs show bare. */
const SHORTS = '#3b3a46';

/** Takes the base body's shorts away under the skirt (when no trousers are worn): the slits show her thighs. */
function bareThighs(g: DrawCtx): void {
  if (g.has('bottom')) return;
  const shorts = g.m(SHORTS, 'cloth');
  const r = g.rig;
  for (const d of ['torso.under', 'nearLeg.cloth', 'farLeg.cloth'] as const) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] !== shorts) continue;
      if (d === 'torso.under') {
        // only the shorts: the bandeau over the bust stays
        const x = ((i % GRID) + 0.5) / RES - r.pelvis.x;
        const y = (Math.floor(i / GRID) + 0.5) / RES - r.pelvis.y;
        if (x * r.up.x + y * r.up.y > 4.5) continue;
      }
      L.mat[i] = -1;
    }
  }
}

const tinter = (slots: Record<string, string>) => (role: string, hex: string): string => (slots[role] ? retintHex(hex, DAWN_BASE[role], slots[role]) : hex);

export const SKIRT_DAWN_PANELS: ItemDef = {
  id: 'skirt_dawn_panels',
  slot: 'skirt',
  name: 'Dawn Priestess Skirt',
  desc: 'A long white skirt open at the sides: an embroidered front panel with a gold border, side panels flaring back over a pale grey lining, gold scrolls along the hems. Women only.',
  colors: [
    { key: 'cloth', label: 'Cloth', default: DAWN_BASE.cloth },
    { key: 'gold', label: 'Gold', default: DAWN_BASE.gold, kind: 'metal' },
    { key: 'lining', label: 'Lining', default: DAWN_BASE.lining },
  ],
  bodies: ['female', 'slender'],
  draw: (g, [cloth, gold, lining]) => {
    const tint = tinter({ cloth, gold, lining });
    bareThighs(g);
    // the lining and the far panel behind the legs and the far arm, the near panel behind the near leg
    drawPiece(g, 'backGear', 'pelvis', DAWN_LINING, tint);
    drawPiece(g, 'backGear', 'thighF', DAWN_FAR, tint);
    drawPiece(g, 'farLeg.armor', 'thighN', DAWN_NEAR, tint);
    drawPiece(g, 'skirt', 'pelvis', DAWN_FRONT, tint);
  },
};

export const WAIST_DAWN_SASH: ItemDef = {
  id: 'waist_dawn_sash',
  slot: 'waist',
  name: 'Dawn Priestess Sash',
  desc: 'A wide gold sash over a brown belt with a steel buckle, a leather pouch with a gold stud on the hip, a red charm and the sash end draped over the hip. Women only.',
  colors: [
    { key: 'sash', label: 'Sash', default: DAWN_BASE.sash, kind: 'metal' },
    { key: 'leather', label: 'Leather', default: DAWN_BASE.leather, kind: 'leather' },
    { key: 'buckle', label: 'Buckle', default: DAWN_BASE.buckle, kind: 'metal' },
  ],
  bodies: ['female', 'slender'],
  draw: (g, [sash, leather, buckle]) => {
    drawPiece(g, 'waist', 'pelvis', DAWN_WAIST, tinter({ sash, leather, buckle }));
  },
};
