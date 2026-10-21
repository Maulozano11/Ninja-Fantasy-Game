// Helpers for the hair, clothes and sandals lifted out of the owner's Joven salvaje paint-over
// (docs/reference/joven-salvaje-owner-reference.jpg, tools/refs/youth_ref.py). Every piece is pinned to our
// rig's joint where it lies in his picture: at rest every pixel is his, where he drew it; in other poses it
// turns rigidly about our joint as our limb turns.

import { retintHex } from '../color';
import { armJoints, legJoints, type Depth, type DrawCtx, type Side } from '../ctx';
import { type PaintedPiece, segAngle } from '../painted';
import { GRID, partIndex, type PartId, RES, type Vec } from '../raster';
import { rotateTemplate } from '../rotsprite';
import { drawRig, type Rig } from '../rig';
import type { BodyType } from '../types';

/** The skin he painted over (Solen's, which our render wore): in it, his skin pixels are his. */
export const YOUTH_SKIN = '#f3c39c';

/**
 * His pixels recoloured by the colour slots: each of his colours follows its slot (`slotOf`), moved the
 * way the slot's colour (`to`) moved from his (`bases`); his black line ('line') stays; 'skin' follows the
 * character's skin.
 */
export function slotTint(g: DrawCtx, slotOf: Record<string, string>, bases: Record<string, string>, to: Record<string, string>): (ch: string, hex: string) => string {
  return (_ch, hex) => {
    const s = slotOf[hex];
    if (!s || s === 'line') return hex;
    if (s === 'skin') return retintHex(hex, YOUTH_SKIN, g.look.skin);
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
 * His piece made broader for the bulky body's broader limbs and torso: single columns doubled, spread
 * over each side of the pivot (`left`, `right` of them), and `down` rows doubled, spread over its height.
 * His pixels stay his, only a few repeated; the piece keeps his length, so it turns about our joint as
 * it does on the male body.
 */
export function broadened(p: PaintedPiece, left: number, right: number, down = 0, like?: PaintedPiece): PaintedPiece {
  const w = Math.max(...p.rows.map((r) => r.length));
  const spread = (a: number, b: number, n: number) => new Set(Array.from({ length: n }, (_, k) => Math.round(a + ((b - a) * (k + 0.5)) / n)));
  const px0 = Math.max(0, Math.min(w - 1, p.pivot[0]));
  // `like`: double the same columns (counted from the pivot) as on that piece, so pieces stamped together
  // stay lined up.
  const lw = like ? Math.max(...like.rows.map((r) => r.length)) : w;
  const dx = like ? p.pivot[0] - like.pivot[0] : 0;
  const lx0 = like ? Math.max(0, Math.min(lw - 1, like.pivot[0])) : px0;
  const cols = new Set([...spread(1, lx0 - 1, left), ...spread(lx0 + 1, lw - 2, right)].map((c) => c + dx).filter((c) => c >= 0));
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

const IDLE = new Map<BodyType, Rig>();
const idleRig = (body: BodyType): Rig => {
  let r = IDLE.get(body);
  if (!r) IDLE.set(body, (r = drawRig(body, 'idle', 0)));
  return r;
};

/** An angle wrapped into -180..180 degrees. */
const wrap180 = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;

/**
 * How far an arm bends past the way he drew it (degrees, the torso's turn taken off): `shoulder` turns its
 * upper arm back to where it hangs at rest, `elbow` turns its upper arm on about the elbow until the elbow
 * is bent as at rest (what stampBent sweeps his cells through).
 */
export function wildArmBends(r: Rig, s: Side): { shoulder: number; elbow: number } {
  const idle = idleRig(r.body);
  const t = segAngle(r.pelvis, r.neck) - segAngle(idle.pelvis, idle.neck);
  const j = armJoints(r, s);
  const j0 = armJoints(idle, s);
  const upper = segAngle(j.shoulder, j.elbow);
  const upper0 = segAngle(j0.shoulder, j0.elbow);
  return {
    shoulder: wrap180(upper0 + t - upper),
    elbow: wrap180(segAngle(j.elbow, j.wrist) - upper - (segAngle(j0.elbow, j0.wrist) - upper0)),
  };
}

/**
 * How far a leg bends past the way he drew it (degrees): `hip` turns its thigh back to where it stands at
 * rest, `knee` turns its thigh on about the knee until the knee is bent as at rest (see stampBent).
 */
export function youthLegBends(r: Rig, s: Side): { hip: number; knee: number } {
  const idle = idleRig(r.body);
  const j = legJoints(r, s);
  const j0 = legJoints(idle, s);
  const thigh = segAngle(j.hip, j.knee);
  const thigh0 = segAngle(j0.hip, j0.knee);
  return { hip: wrap180(thigh0 - thigh), knee: wrap180(segAngle(j.knee, j.ankle) - thigh - (segAngle(j0.knee, j0.ankle) - thigh0)) };
}

/** The fine pixels (y * GRID + x) a piece stamped at `at` along `deg` covers (stampPiece). */
export function stampCells(piece: PaintedPiece, at: Vec, deg: number): Set<number> {
  const ax = Math.floor(at.x * RES);
  const ay = Math.floor(at.y * RES);
  const out = new Set<number>();
  for (const p of rotateTemplate(piece, deg - piece.angle)) out.add((ay + p.dy) * GRID + ax + p.dx);
  return out;
}
