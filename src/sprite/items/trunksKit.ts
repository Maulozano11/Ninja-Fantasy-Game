// Helpers for the clothes, boots and hair lifted out of the owner's two Trunks paint-overs
// (docs/reference/trunks2-owner-reference.jpg and trunks3-owner-reference.jpg, tools/refs/trunks_ref.py).
// Every piece is pinned to our rig's joint where it lies in his picture: at rest every pixel is his,
// where he drew it; in other poses it turns about our joint as our limb turns.

import { retintHex } from '../color';
import type { Depth, DrawCtx } from '../ctx';
import { segAngle, stampPiece, type PaintedPiece } from '../painted';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, partIndex, PARTS, RES, type PartId, type Vec } from '../raster';
import { turnPoint } from '../rig';
import { rotateTemplate } from '../rotsprite';

/** The skin he painted over (Solen's, which our renders for him wore): in it, his skin pixels are his. */
export const PAINTED_SKIN = '#f3c39c';

/**
 * His pixels recoloured by the colour slots: each of his colours follows its slot (`slotOf`), moved the
 * way the slot's colour (`to`) moved from his (`bases`); his black line ('line') stays. 'skin' follows
 * the character's skin.
 */
export function slotTint(
  g: DrawCtx,
  slotOf: Record<string, string>,
  bases: Record<string, string>,
  to: Record<string, string>,
): (ch: string, hex: string) => string {
  return (_ch, hex) => {
    const s = slotOf[hex];
    if (!s || s === 'line') return hex;
    if (s === 'skin') return retintHex(hex, PAINTED_SKIN, g.look.skin);
    return bases[s] ? retintHex(hex, bases[s], to[s] ?? bases[s]) : hex;
  };
}

/**
 * The colour a slot was saved with, read as his: the creator saved every character with the item's
 * colours, so the old defaults (from before his art) now mean his colour.
 */
export const savedAsHis = (hex: string, old: string, his: string): string => (hex.toLowerCase() === old ? his : hex);

/** Takes these parts of our body away from these layers (his piece takes their place). */
export function partsOff(g: DrawCtx, depths: Depth[], parts: PartId[]): void {
  const ids = new Set(parts.map((p) => partIndex(p)));
  for (const d of depths) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && ids.has(L.part[i])) L.mat[i] = -1;
  }
}

/**
 * Takes our torso and undergarment away below the pelvis, and the undergarment's legs: his trousers are
 * all there is from the waist down (our crotch would show under his seat, between his thighs).
 */
export function belowPelvisOff(g: DrawCtx): void {
  const r = g.rig;
  const torso = partIndex('torso');
  const thighs = new Set([partIndex('thighN'), partIndex('thighF')]);
  for (const d of ['torso.body', 'torso.under'] as Depth[]) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || L.part[i] !== torso) continue;
      const x = ((i % GRID) + 0.5) / RES - r.pelvis.x;
      const y = (Math.floor(i / GRID) + 0.5) / RES - r.pelvis.y;
      if (d === 'torso.under' || x * r.up.x + y * r.up.y < 0) L.mat[i] = -1;
    }
  }
  for (const d of ['nearLeg.cloth', 'farLeg.cloth'] as Depth[]) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && thighs.has(L.part[i])) L.mat[i] = -1;
  }
}

/**
 * Takes our torso away below the neck: his garment is the torso there. Our torso is broader than his at
 * the shoulders, and showed (with its outline) as a strip of skin beside his sleeve when the arm swings.
 */
export function torsoOff(g: DrawCtx): void {
  const r = g.rig;
  const L = g.L('torso.body');
  const torso = partIndex('torso');
  const b = g.bp;
  for (let i = 0; i < GRID * GRID; i++) {
    if (L.mat[i] < 0 || L.part[i] !== torso) continue;
    const x = ((i % GRID) + 0.5) / RES - r.pelvis.x;
    const y = (Math.floor(i / GRID) + 0.5) / RES - r.pelvis.y;
    const up = x * r.up.x + y * r.up.y;
    const across = x * r.right.x + y * r.right.y;
    // The neck stays, down into the collar's opening (it shows there, as in his pictures).
    const neck = up >= b.torsoLen - 4 && Math.abs(across - 0.6) <= b.neckW + 1;
    if (up < b.torsoLen - 1.5 && !neck) L.mat[i] = -1;
  }
}

/**
 * His piece made broader and longer for a bigger body: single columns doubled, spread over each side of
 * the pivot (`left`, `right` of them), and `down` rows doubled, spread over its height. His pixels stay
 * his, only a few repeated.
 */
export function stretchedPiece(p: PaintedPiece, left: number, right: number, down: number): PaintedPiece {
  const w = Math.max(...p.rows.map((r) => r.length));
  const spread = (a: number, b: number, n: number) => new Set(Array.from({ length: n }, (_, k) => Math.round(a + ((b - a) * (k + 0.5)) / n)));
  const px0 = Math.max(0, Math.min(w - 1, p.pivot[0]));
  const cols = new Set([...spread(1, px0 - 1, left), ...spread(px0 + 1, w - 2, right)]);
  const rows = spread(1, p.rows.length - 2, down);
  const out: string[] = [];
  p.rows.forEach((r, j) => {
    const row = r.padEnd(w, '.').split('').map((ch, i) => (cols.has(i) ? ch + ch : ch)).join('');
    out.push(row);
    if (rows.has(j)) out.push(row);
  });
  let px = p.pivot[0];
  for (const c of cols) if (c < p.pivot[0]) px++;
  let py = p.pivot[1];
  for (const j of rows) if (j < p.pivot[1]) py++;
  return { ...p, rows: out, pivot: [px, py] };
}

/** His black line: every channel of his colour under 20 (tools/refs/trunks_ref.py kind()). */
const isHisLine = (hex: string): boolean => [1, 3, 5].every((i) => parseInt(hex.slice(i, i + 2), 16) < 20);

/** An angle in degrees brought into -180..180. */
export const turnOf = (d: number): number => ((((d + 180) % 360) + 360) % 360) - 180;

/** How near the knee (fine pixels) his thigh's cells turn with it as it bends: about half his leg's width. */
const KNEE_R = 7;
/** The widest gap (fine pixels, each side of a pixel) the fill of a bending knee closes. */
const KNEE_GAP = 3;
/** Degrees between the copies that fill a bending knee (small enough to leave no holes). */
const BEND_STEP = 5;

/**
 * One of his trouser legs on `depth`: his shin piece turned whole about the ankle (it reaches on into the
 * boot, whose shaft turns about the ankle too, so the hem never parts from it), then his thigh piece
 * turned whole about the hip over it. As the knee bends past the way he drew it, the thigh's cells past the
 * knee ride the shin (turned by the whole bend, as the shin is), and the knee is filled with his own
 * cloth: the thigh's cloth next to the knee stamped again under the thigh, turned about the knee
 * by every angle up to the bend, only where neither piece is and the leg lies on both sides (so it closes
 * what opens at the knee and never bulges past the leg's outline), with his line where that fill lies
 * bare. Unbent, it is the two pieces as stampPiece puts them. A pixel the turned pieces leave open inside
 * the leg is closed too.
 */
export function stampTrouserLeg(
  g: DrawCtx,
  depth: Depth,
  thigh: PaintedPiece,
  shin: PaintedPiece,
  joints: { hip: Vec; knee: Vec; ankle: Vec },
  parts: [PartId, PartId],
  color: (ch: string, hex: string) => string,
): void {
  const { hip, knee, ankle } = joints;
  const L = g.L(depth);
  stampPiece(g, depth, shin, ankle, segAngle(knee, ankle), parts[1], color);
  const deg = segAngle(hip, knee);
  const bend = turnOf(segAngle(knee, ankle) - shin.angle - (deg - thigh.angle));
  // The knee among the thigh's cells as he drew them (rotateTemplate turns by whole degrees).
  const turn = Math.round(deg - thigh.angle);
  const t = (turn * Math.PI) / 180;
  const kx = knee.x * RES - Math.floor(hip.x * RES) - 0.5;
  const ky = knee.y * RES - Math.floor(hip.y * RES) - 0.5;
  const jx = thigh.pivot[0] + kx * Math.cos(t) + ky * Math.sin(t);
  const jy = thigh.pivot[1] - kx * Math.sin(t) + ky * Math.cos(t);
  let upper = thigh;
  if (Math.abs(bend) >= 1) {
    // Bent, the thigh's cells past the knee (across the middle of the knee's bend as he drew it) ride the
    // shin, turned by the whole bend: below the knee the leg stays as he drew it.
    const mid = (((thigh.angle + shin.angle) / 2) * Math.PI) / 180;
    const past = (i: number, j: number) => (i - jx) * Math.cos(mid) + (j - jy) * Math.sin(mid) > 0;
    const isLine = (ch: string) => isHisLine(thigh.colors[ch]);
    const keep = (f: (i: number, j: number, ch: string) => boolean): PaintedPiece => ({
      ...thigh,
      rows: thigh.rows.map((row, j) => [...row].map((ch, i) => (ch !== '.' && f(i, j, ch) ? ch : '.')).join('')),
    });
    upper = keep((i, j) => !past(i, j));
    stampPiece(g, depth, keep((i, j) => past(i, j)), turnPoint(hip, knee, bend), deg + bend, parts[1], color);
    // The fill is his cloth next to the knee (his line goes round it after).
    const near = keep((i, j, ch) => !past(i, j) && !isLine(ch) && Math.hypot(i - jx, j - jy) <= KNEE_R);
    const mat = new Map<string, number>();
    for (const [ch, hex] of Object.entries(thigh.colors)) mat.set(ch, g.m(color(ch, hex), 'flat'));
    // The fill only closes what opens between the limbs at the knee (an empty pixel with the leg on both
    // sides of it, a few pixels apart), so it never bulges past the leg's outline.
    const over = new Set<number>();
    const ux = Math.floor(hip.x * RES);
    const uy = Math.floor(hip.y * RES);
    for (const p of rotateTemplate(upper, turn)) over.add((uy + p.dy) * GRID + ux + p.dx);
    const leg = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID && y < GRID && (L.mat[y * GRID + x] >= 0 || over.has(y * GRID + x));
    const side = (x: number, y: number, dx: number, dy: number) => {
      for (let k = 1; k <= KNEE_GAP; k++) if (leg(x + dx * k, y + dy * k)) return true;
      return false;
    };
    const inGap = (x: number, y: number) =>
      !leg(x, y) && ([[1, 0], [0, 1], [1, 1], [1, -1]] as const).some(([dx, dy]) => side(x, y, dx, dy) && side(x, y, -dx, -dy));
    const fill = new Map<number, string>();
    const n = Math.ceil(Math.abs(bend) / BEND_STEP);
    for (let k = 1; k <= n; k++) {
      const d = (bend * k) / n;
      const at = turnPoint(hip, knee, d);
      const ax = Math.floor(at.x * RES);
      const ay = Math.floor(at.y * RES);
      for (const p of rotateTemplate(near, turn + d)) {
        const x = ax + p.dx;
        const y = ay + p.dy;
        if (x < 0 || y < 0 || x >= GRID || y >= GRID || !inGap(x, y)) continue;
        const i = y * GRID + x;
        const was = fill.get(i);
        if (was !== undefined) {
          if (isLine(was) && !isLine(p.ch)) fill.set(i, p.ch);
          continue;
        }
        fill.set(i, p.ch);
      }
    }
    // Where the fill lies bare (nothing of the leg beside it, nor the thigh drawn over it): his line.
    const counts = new Map<string, number>();
    for (const row of thigh.rows) for (const ch of row) if (ch !== '.' && isLine(ch)) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    const edge = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
    const bare = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= GRID || y >= GRID) return true;
      const i = y * GRID + x;
      return L.mat[i] < 0 && !fill.has(i) && !over.has(i);
    };
    const lined: number[] = [];
    for (const [i, ch] of fill) {
      const x = i % GRID;
      const y = (i / GRID) | 0;
      if (edge && !isLine(ch) && (bare(x - 1, y) || bare(x + 1, y) || bare(x, y - 1) || bare(x, y + 1))) lined.push(i);
    }
    for (const i of lined) fill.set(i, edge!);
    for (const [i, ch] of fill) L.set(i % GRID, (i / GRID) | 0, mat.get(ch)!, 3, parts[0], F_NO_TEXTURE | F_NO_OUTLINE);
  }
  stampPiece(g, depth, upper, hip, deg, parts[0], color);
  // A pixel the turned pieces left open inside the leg (all four sides cloth) takes the cloth above it.
  const holes: number[] = [];
  for (let y = 1; y < GRID - 1; y++) {
    for (let x = 1; x < GRID - 1; x++) {
      const i = y * GRID + x;
      if (L.mat[i] < 0 && L.mat[i - 1] >= 0 && L.mat[i + 1] >= 0 && L.mat[i - GRID] >= 0 && L.mat[i + GRID] >= 0) holes.push(i);
    }
  }
  for (const i of holes) L.set(i % GRID, (i / GRID) | 0, L.mat[i - GRID], L.shade[i - GRID], PARTS[L.part[i - GRID]], L.flags[i - GRID]);
}
