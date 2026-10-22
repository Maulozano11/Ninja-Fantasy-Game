// Aurelia's skirt and sash, the owner's pixels from his Aurelia at our scale
// (docs/reference/aurelia-escala-juego-owner-reference.jpg): her long white skirt open at the sides (the
// front panel, the side panels and the grey lining behind her legs) and her gold sash with the belt, the
// pouch and the charm. tools/refs/aurelia-lower-from-ref.py copies his pixels onto our female at idle
// frame 0 (aureliaLowerArt.ts); here they ride the rig. Each piece hangs between columns: their tops ride
// the torso, their bottoms hang below the hips and swing a little with the thighs, as the other long
// skirts do (armor.ts hang()), so the panels move with the legs in walk, run, sit and crouch. The piece
// is sampled between its columns: at rest every pixel is his as drawn, moved it keeps his line round it.

import { skinTone } from '../body';
import { retintHex } from '../color';
import { type Depth, type DrawCtx, type ItemDef, legDepth, legJoints, type Side } from '../ctx';
import { segAngle, stampPiece } from '../painted';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, type Layer, partIndex, type PartId, RES, v, type Vec } from '../raster';
import { BODY_PARAMS, drawRig, GROUND, type Rig } from '../rig';
import type { BodyType } from '../types';
import { fillHoles, sealLegsAfter } from './aureliaBoots';
import { DAWN_SLIT_F, DAWN_SLIT_N, DAWN_SLIT_SKIN, DAWN_THIGH_N } from './aureliaBootsArt';
import { DAWN_BASE, DAWN_FAR, DAWN_FRONT, DAWN_LINE, DAWN_LINING, DAWN_NEAR, DAWN_WAIST, type DawnPiece } from './aureliaLowerArt';

/** How much a hanging piece follows its thigh (as armor.ts HANG_FOLLOW: skirts never bell out). */
const FOLLOW = 0.22;
/**
 * Lowest a hem hangs (design y of its bottom edge): four rows above the soles' last row, as at rest (his
 * front panel's point, the lowest of her hems, ends five rows above it). A hem that came down to the ground
 * beside a boot stood there like a third leg (the owner, 2026-10-22: "tienes un bug en la falda que esta
 * poniendo como piernas o botas extra en diferentes posiciones").
 */
const HEM_FLOOR = GROUND - 0.5;
/** How far (degrees) a hem that would hang lower swings away first, toward where its cloth already points; past that it gathers. */
const HEM_SWING = 40;
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

/** A column a piece hangs from: its points top down (the top, the bottom; the far panel's also bends at the far knee). */
type Col = Vec[];

/**
 * A column end (fine pixels) kept off the floor when she lies down: a lying figure is drawn upright and
 * laid on its front afterwards (rig.ts layFor: its x becomes the row, lay.groundX the ground line), so
 * there the floor is a column of x. Her skirt's panels reach no further than her body does (two pixels
 * past the ground line), as standing they reach no lower than her soles.
 */
function floor(r: Rig, q: Vec): Vec {
  return r.lay ? v(Math.min(q.x, (r.lay.groundX + 1.5) * RES), q.y) : q;
}

/**
 * A piece's columns at rest (fine pixels). The far panel's also bend at the far knee's height (farOnLeg):
 * at rest that is a point on the straight column, so the piece is as drawn.
 */
const restCols = (p: DawnPiece): Col[] =>
  p.cols.map(([tx, ty, bx, by]) => {
    if (p !== DAWN_FAR) return [v(tx, ty), v(bx, by)];
    const k = clamp((rest().kneeF.y * RES - ty) / (by - ty), 0, 1);
    return [v(tx, ty), v(tx + (bx - tx) * k, ty + (by - ty) * k), v(bx, by)];
  });

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
  return restCols(p).map((col) => {
    const top = col[0];
    const bot = col[col.length - 1];
    const T = floor(r, at(top));
    if (!p.hang) return [T, at(bot)];
    // (lying down she is drawn upright and laid afterwards: there the floor is a column, see floor())
    const end = (a: Vec, b: Vec, swing: boolean): Vec => floor(r, scaleRes(r.lay ? v(b.x, Math.min(b.y, GROUND + 1.5)) : hemAbove(a, b, swing)));
    if (p === DAWN_FAR) {
      // it bends at the far knee's height, riding the far thigh above and the far shin below
      const knee = farOnLeg(R0, r, v(col[1].x / RES, col[1].y / RES), 'thigh');
      return [T, floor(r, scaleRes(knee)), end(knee, farOnLeg(R0, r, v(bot.x / RES, bot.y / RES), 'shin'), true)];
    }
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
    return [T, end(a1, b, p !== DAWN_LINING)];
  });
}

const scaleRes = (q: Vec): Vec => v(q.x * RES, q.y * RES);

/**
 * How far (design units) the far panel's middle hangs out past the far leg's bone once the leg moves: at
 * rest he drew it beside the far boot (its middle about three and a half units out), a narrow white strip as
 * long and as wide as the boot, so wherever the leg went without it the strip stood on its own like another
 * leg. It is the far side's panel, on the far side of the far leg: moved, it hangs behind the leg (his far
 * boot lies inside of its bone, its outer line on the bone), only its gold edge showing past the boot.
 */
const FAR_OUT = -1.25;

/**
 * Where a point of the far panel's column goes (design units): its bend rides the far thigh and its hem
 * the far shin, each as far along the bone and as far out from it as at rest; once the leg has moved (the
 * idle frames' legs do not) the panel comes in behind the leg, its middle FAR_OUT past the bone's line,
 * the whole width of it together.
 */
function farOnLeg(R0: Rig, r: Rig, q: Vec, bone: 'thigh' | 'shin'): Vec {
  const [a0, b0, a1, b1] = bone === 'thigh' ? [R0.hipF, R0.kneeF, r.hipF, r.kneeF] : [R0.kneeF, R0.ankleF, r.kneeF, r.ankleF];
  const dir = (a: Vec, b: Vec): Vec => {
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return v((b.x - a.x) / l, (b.y - a.y) / l);
  };
  const s0 = dir(a0, b0);
  const s1 = dir(a1, b1);
  const n0 = v(s0.y, -s0.x);
  const n1 = v(s1.y, -s1.x);
  const along = (Math.hypot(b1.x - a1.x, b1.y - a1.y) || 1) / (Math.hypot(b0.x - a0.x, b0.y - a0.y) || 1);
  // the middle of the panel's cloth on this point's row at rest (its last row for the hem), and how far it
  // comes in (all of it once the knee and ankle moved half a unit between them)
  const [ox, oy] = DAWN_FAR.origin;
  const row = DAWN_FAR.rows[clamp(Math.floor(q.y * RES) - oy, 0, DAWN_FAR.rows.length - 1)];
  const xs = [...row].flatMap((ch, x) => (ch === '.' ? [] : [x]));
  const mid = sub(v((ox + (xs[0] + xs[xs.length - 1] + 1) / 2) / RES, q.y), a0);
  const moved = Math.hypot(r.kneeF.x - R0.kneeF.x, r.kneeF.y - R0.kneeF.y) + Math.hypot(r.ankleF.x - R0.ankleF.x, r.ankleF.y - R0.ankleF.y);
  const inward = Math.max(0, dot(mid, n0) - FAR_OUT) * clamp(moved * 2, 0, 1);
  const rel = sub(q, a0);
  const t = dot(rel, s0) * along;
  const o = dot(rel, n0) - inward;
  return v(a1.x + s1.x * t + n1.x * o, a1.y + s1.y * t + n1.y * o);
}

/**
 * A hem kept off the ground (HEM_FLOOR): a column from `a` to `b` that would hang lower swings (`swing`)
 * up to HEM_SWING degrees the nearer way (its cloth carried by the leg it hangs by), and what still reaches
 * lower gathers above the ground. The lining behind the legs only gathers: swung out it lay along the
 * ground past a foot, like another shoe. At rest every hem hangs above the ground, unmoved.
 */
function hemAbove(a: Vec, b: Vec, swing: boolean): Vec {
  if (b.y <= HEM_FLOOR) return b;
  if (!swing) return v(b.x, HEM_FLOOR);
  const L = Math.hypot(b.x - a.x, b.y - a.y);
  const phi = Math.atan2(b.y - a.y, b.x - a.x);
  const dy = HEM_FLOOR - a.y;
  if (dy <= 0 || L < 1e-6) return v(b.x, HEM_FLOOR);
  // the two directions that reach the floor line, forward (under 90 degrees) and back (over)
  const fwd = Math.asin(Math.min(1, dy / L));
  const want = phi < Math.PI / 2 ? fwd : Math.PI - fwd;
  const max = (HEM_SWING * Math.PI) / 180;
  const to = phi + clamp(want - phi, -max, max);
  return v(a.x + Math.cos(to) * L, Math.min(HEM_FLOOR, a.y + Math.sin(to) * L));
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
  if (!(u >= -E && u <= 1 + E && w >= -E && w <= 1 + E)) return null;
  // a quad folded flat (lying down, its tops resting on the floor) can leave Newton unsettled: only a
  // (u, w) that really lands on the point counts
  const p = lerp2(p00, p10, p01, p11, u, w);
  return Math.abs(p.x - q.x) + Math.abs(p.y - q.y) < 1e-3 ? [u, w] : null;
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
export function placePiece(g: DrawCtx, p: DawnPiece, rowsTo = Infinity): Map<number, string> {
  const R = restCols(p);
  const P = poseCols(g, p);
  const [ox, oy] = p.origin;
  const H = p.rows.length;
  const W = p.rows[0].length;
  const out = new Map<number, string>();
  const still = P.every((c, i) => c.every((q, j) => Math.abs(q.x - R[i][j].x) + Math.abs(q.y - R[i][j].y) < 1e-6));
  if (still) {
    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++) {
        const ch = p.rows[j][i];
        const x = ox + i;
        const y = oy + j;
        if (ch !== '.' && j < rowsTo && x >= 0 && y >= 0 && x < GRID && y < GRID) out.set(y * GRID + x, ch);
      }
    return out;
  }
  const src = new Map<number, [number, number]>();
  // each pair of columns, each stretch of them between two of their points (top and bottom; on the far
  // panel also the bend at the knee)
  for (let k = 0; k + 1 < P.length; k++)
    for (let m = 0; m + 1 < P[k].length; m++) {
      const [a0, b0, a1, b1] = [P[k][m], P[k + 1][m], P[k][m + 1], P[k + 1][m + 1]];
      const [ra0, rb0, ra1, rb1] = [R[k][m], R[k + 1][m], R[k][m + 1], R[k + 1][m + 1]];
      const x0 = Math.floor(Math.min(a0.x, b0.x, a1.x, b1.x));
      const x1 = Math.ceil(Math.max(a0.x, b0.x, a1.x, b1.x));
      const y0 = Math.floor(Math.min(a0.y, b0.y, a1.y, b1.y));
      const y1 = Math.ceil(Math.max(a0.y, b0.y, a1.y, b1.y));
      for (let y = Math.max(0, y0); y <= Math.min(GRID - 1, y1); y++)
        for (let x = Math.max(0, x0); x <= Math.min(GRID - 1, x1); x++) {
          const idx = y * GRID + x;
          if (out.has(idx)) continue;
          const uv = invBilinear(v(x + 0.5, y + 0.5), a0, b0, a1, b1);
          if (!uv) continue;
          const q = lerp2(ra0, rb0, ra1, rb1, uv[0], uv[1]);
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
    // only the rows asked for, her line where the whole piece has its edge (the cut goes on unseen)
    if (j >= rowsTo) continue;
    if (edge && j >= p.openTop) fixed.set(idx, 'k');
    else if (!edge && p.fill[j][i] !== '.') fixed.set(idx, p.fill[j][i]);
    else fixed.set(idx, ch);
  }
  return fixed;
}

/** Stamps a piece (its rows above `rowsTo`) into a depth in her colours (`tint` recolours a colour of a slot). */
function drawPiece(g: DrawCtx, depth: Depth, part: PartId, p: DawnPiece, tint: (role: string, hex: string) => string, rowsTo = Infinity): void {
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
  for (const [idx, ch] of placePiece(g, p, rowsTo)) L.set(idx % GRID, Math.floor(idx / GRID), mat(ch), 3, part, F_NO_TEXTURE | F_NO_OUTLINE);
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

/**
 * His bare thighs in the slits (aureliaBootsArt.ts, by tools/refs/aurelia-legs-from-ref.py): his skin with
 * the shade the panels cast on it, over our thigh's flat skin, each turning with its thigh about the knee
 * as the lace top does. In the body's skin (at his, his colours).
 */
function slitThighs(g: DrawCtx): void {
  for (const s of ['F', 'N'] as Side[]) {
    const { hip, knee } = legJoints(g.rig, s);
    stampPiece(g, legDepth(s, 'body'), s === 'N' ? DAWN_SLIT_N : DAWN_SLIT_F, knee, segAngle(hip, knee), `thigh${s}`, (_ch, hex) => skinTone(hex, g.look.skin, DAWN_SLIT_SKIN));
  }
}

/**
 * Trims a side panel's spur: moved, a panel's hem riding the far leg past the knee can end in a strip a
 * pixel wide standing out below the leg (run frame 2: two pixels of his line hanging under the far knee).
 * A pixel of a panel with at most one drawn neighbour on these depths, and that one his line, goes, again
 * until none is left. At rest the caller leaves his panels be.
 */
function trimPanelSpurs(g: DrawCtx, depths: Depth[]): void {
  const Ls = depths.map((d) => g.L(d)).filter((L) => L.used);
  const panels = new Set([partIndex('thighF'), partIndex('thighN')]);
  const drawn = (i: number) => Ls.some((L) => L.mat[i] >= 0);
  const lines = new Set([g.m(DAWN_LINE, 'flat'), g.m(DAWN_THIGH_N.colors.k, 'flat')]);
  for (let pass = 0; pass < 8; pass++) {
    const off: [Layer, number][] = [];
    for (const d of ['backGear', 'farLeg.armor', 'skirt'] as Depth[]) {
      const L = g.L(d);
      if (!L.used) continue;
      for (let y = 1; y < GRID - 1; y++)
        for (let x = 1; x < GRID - 1; x++) {
          const i = y * GRID + x;
          const ns = [i - 1, i + 1, i - GRID, i + GRID].filter(drawn);
          if (L.mat[i] < 0 || !panels.has(L.part[i]) || ns.length > 1) continue;
          // only where nothing else of hers is drawn under it, and where its going leaves his line closed (the
          // pixel beside it is line)
          if (Ls.some((M) => M !== L && M.mat[i] >= 0) || ns.some((j) => !Ls.some((M) => lines.has(M.mat[j])))) continue;
          off.push([L, i]);
        }
    }
    if (!off.length) break;
    for (const [L, i] of off) L.mat[i] = -1;
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
    slitThighs(g);
    // the lining and the far panel behind the legs and the far arm, the near panel behind the near leg;
    // the far panel's top over the far thigh (his panel hangs over it there; ours is wider than his)
    drawPiece(g, 'backGear', 'pelvis', DAWN_LINING, tint);
    drawPiece(g, 'backGear', 'thighF', DAWN_FAR, tint);
    drawPiece(g, 'skirt', 'thighF', DAWN_FAR, tint, DAWN_FAR.front);
    drawPiece(g, 'farLeg.armor', 'thighN', DAWN_NEAR, tint);
    drawPiece(g, 'skirt', 'thighN', DAWN_NEAR, tint, DAWN_NEAR.front);
    drawPiece(g, 'skirt', 'pelvis', DAWN_FRONT, tint);
    // moved, a pixel left empty between her panels and her legs is filled (at rest each piece is as drawn)
    const below: Depth[] = ['backGear', 'farLeg.body', 'farLeg.cloth', 'farLeg.feet', 'farLeg.armor', 'nearLeg.body', 'nearLeg.cloth', 'nearLeg.feet', 'skirt'];
    if (g.rig.pose !== 'idle') {
      fillHoles(g, below);
      trimPanelSpurs(g, below);
    }
    // and her legs' outline closed where they show past it
    sealLegsAfter(g, 'skirt');
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
    sealLegsAfter(g, 'waist');
  },
};
