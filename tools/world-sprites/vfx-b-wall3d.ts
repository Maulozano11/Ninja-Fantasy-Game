// Oblique-projection walls for the vfx-b elements: one 4.5 m x 1.8 m wall drawn in three
// orientations on the battle map (the renderer picks the closest one):
//
//   wall        horizontal: runs along x and faces the camera;
//   wall_diag   3/4: turned 45 degrees, from its near-left end to its far-right end ("/");
//   wall_depth  vertical on screen: runs straight into the depth (along z).
//
// The battle projection is oblique: world x -> screen X at 57 px per meter, world depth z ->
// screen Y at +38 px per meter (bigger z = nearer = lower on screen), height -> 57 px per meter
// up. A wall is a solid in wall-local coordinates (u along the wall from its near/left end,
// s across its thickness toward the camera side, v up; all in px of 57 per meter). Every
// pixel casts its view ray through that solid from the camera side, nearest point first, so
// the front face, the top cap and the near end show with correct overlaps. The hit buffer
// keeps the face that was hit and its local coordinates, and each element paints its own
// materials from them (re-painted along the wall, never a warped copy of a sheet).

import { Canvas } from './kit';
import { Pt } from './vfx-b-lib';

export const PPM = 57;
export const DPM = 38;
/** Wall length and height in px (4.5 m x 1.8 m). */
export const LEN = 257;
export const HGT = 103;

export type WallKey = 'wall' | 'wall_diag' | 'wall_depth';

export interface Orient {
  key: WallKey;
  /** Frame size and the anchor: the wall's centre point on the ground. */
  w: number;
  h: number;
  ax: number;
  ay: number;
  /** World position (m) of u = 0 on the centre line, unit direction of +u, unit normal of +s. */
  ox: number;
  oz: number;
  dx: number;
  dz: number;
  nx: number;
  nz: number;
}

const S2 = Math.SQRT1_2;
const HALF = LEN / PPM / 2;

/** The three orientations with frames sized for a wall up to about 0.6 m thick plus its debris. */
export function orientations(o: { horizW?: number; horizH?: number; horizAy?: number } = {}): Record<WallKey, Orient> {
  const hw = o.horizW ?? 288, hh = o.horizH ?? 152;
  return {
    wall: { key: 'wall', w: hw, h: hh, ax: hw / 2, ay: o.horizAy ?? 128, ox: -HALF, oz: 0, dx: 1, dz: 0, nx: 0, nz: 1 },
    wall_diag: { key: 'wall_diag', w: 240, h: 272, ax: 120, ay: 188, ox: -HALF * S2, oz: HALF * S2, dx: S2, dz: -S2, nx: S2, nz: S2 },
    wall_depth: { key: 'wall_depth', w: 112, h: 304, ax: 56, ay: 206, ox: 0, oz: HALF, dx: 0, dz: -1, nx: 1, nz: 0 },
  };
}

/** Screen position of a wall-local point (u along, s across toward the camera side, v up; px). */
export function proj(o: Orient, u: number, s: number, v: number): Pt {
  const x = o.ox + (o.dx * u + o.nx * s) / PPM, z = o.oz + (o.dz * u + o.nz * s) / PPM;
  return [o.ax + x * PPM, o.ay + z * DPM - v];
}

/** Faces: 0 top, 1 front (+s, toward the camera side), 2 back, 3 near end (u = 0), 4 far end (u = LEN). */
export type Face = 0 | 1 | 2 | 3 | 4;

/**
 * Result of a solid test at a wall-local point: -1 inside, otherwise why the point is outside,
 * which names the face a ray crosses when it enters from there: 0 above the top, 1 beside the
 * wall (front or back by the sign of s), 3 beyond the near end, 4 beyond the far end.
 */
export type Inside = (u: number, s: number, v: number) => number;

export interface Hits {
  w: number;
  h: number;
  face: Int8Array;
  u: Float32Array;
  s: Float32Array;
  v: Float32Array;
}

/**
 * Casts every pixel's view ray through the solid, from the camera side (highest v on the ray,
 * which is also the nearest point) down to the ground, and records the first point inside.
 * `bound` limits the march to the wall's slab: |s| <= sMax, u in [uMin, uMax], v in [0, vMax].
 */
export function march(o: Orient, inside: Inside, bound: { sMax: number; uMin?: number; uMax?: number; vMax: number; step?: number }, shiftX = 0): Hits {
  const { w, h } = o;
  const N = w * h;
  const hits: Hits = { w, h, face: new Int8Array(N).fill(-1), u: new Float32Array(N), s: new Float32Array(N), v: new Float32Array(N) };
  const step = bound.step ?? 0.5;
  const uMin = bound.uMin ?? -2, uMax = bound.uMax ?? LEN + 2;
  const uB = (o.dz * PPM) / DPM, sB = (o.nz * PPM) / DPM;
  for (let py = 0; py < h; py++)
    for (let px = 0; px < w; px++) {
      const x = (px + 0.5 - o.ax - shiftX) / PPM, Y = py + 0.5 - o.ay;
      const u0 = ((x - o.ox) * o.dx + (Y / DPM - o.oz) * o.dz) * PPM;
      const s0 = ((x - o.ox) * o.nx + (Y / DPM - o.oz) * o.nz) * PPM;
      let lo = 0, hi = bound.vMax;
      const clip = (a0: number, b: number, mn: number, mx: number): boolean => {
        if (Math.abs(b) < 1e-9) return a0 >= mn && a0 <= mx;
        let t0 = (mn - a0) / b, t1 = (mx - a0) / b;
        if (t0 > t1) [t0, t1] = [t1, t0];
        lo = Math.max(lo, t0);
        hi = Math.min(hi, t1);
        return lo <= hi;
      };
      if (!clip(s0, sB, -bound.sMax, bound.sMax) || !clip(u0, uB, uMin, uMax)) continue;
      const top = Math.floor(hi / step) * step;
      let prev = inside(u0 + uB * (top + step), s0 + sB * (top + step), top + step);
      for (let v = top; v >= lo - 1e-6; v -= step) {
        const u = u0 + uB * v, s = s0 + sB * v;
        const r = inside(u, s, v);
        if (r < 0) {
          const i = py * w + px;
          const pr = prev < 0 ? 0 : prev;
          hits.face[i] = pr === 1 ? (s >= 0 ? 1 : 2) : pr;
          hits.u[i] = u;
          hits.s[i] = s;
          hits.v[i] = v;
          break;
        }
        prev = r;
      }
    }
  return hits;
}

/** Frames whose opaque pixels touch the border (indices into `frames`). */
export function borderTouches(frames: Canvas[]): number[] {
  const bad: number[] = [];
  frames.forEach((c, k) => {
    for (let x = 0; x < c.w; x++)
      if (c.alpha(x, 0) || c.alpha(x, c.h - 1)) {
        bad.push(k);
        return;
      }
    for (let y = 0; y < c.h; y++)
      if (c.alpha(0, y) || c.alpha(c.w - 1, y)) {
        bad.push(k);
        return;
      }
  });
  return bad;
}
