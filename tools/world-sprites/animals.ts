// Small animals for the battle maps: ambient life that flees when combat starts.
//
//   npx tsx tools/world-sprites/animals.ts [previewDir]
//
// The bodies are modelled, not painted: every part (torso, haunch, head, ear, leg) is a small
// signed-distance shape (ellipsoids and tapered capsules, smoothly merged where flesh flows into
// flesh). Each part is ray-cast from the viewer, lit from the upper left by its 3D normal and
// quantized to a 6-step ramp with cluster-shaped band edges. Parts are layered back to front like
// a painter would: a part in front leaves a dark 1 px inner line on the part behind it, far limbs
// sit one shade darker, and the kit adds the material-tinted outline. Eyes, noses, spots and
// feather marks are placed by hand on top. Tiny critters (insects, the frog) are pixel templates.
//
// Animations are key poses of the same rig, so nothing jitters between frames: the band noise is
// anchored to each part, rooted feet stay on the ground row and loops end where they begin.

import { join } from 'node:path';
import { Anim, Canvas, Color, MATERIALS, WorldSprite, hash, hex, lambert, m, mix, noise, preview, previewDir, ramp, toHex, withAlpha, writeGroup } from './kit';

// --- palettes --------------------------------------------------------------------------------

const PAL: Color[][] = [];
function pal(r: Color[]): number {
  PAL.push(r);
  return PAL.length - 1;
}
const blend = (a: string, b: string, t: number): string => toHex(mix(hex(a), hex(b), t));

const R = {
  fur: ramp(MATERIALS.fur),
  // Wild rabbit: the shared fur pulled toward stone gray (agouti brown-gray).
  rabbit: ramp(blend(MATERIALS.fur, MATERIALS.stone, 0.32), { shift: 12 }),
  cream: ramp(MATERIALS.canvas, { shift: 12 }),
  white: ramp(MATERIALS.paper, { shift: 10 }),
  // Sika summer coat: the shared fur warmed toward wood (chestnut).
  sika: ramp(blend(MATERIALS.fur, MATERIALS.wood, 0.55), { shift: 14 }),
  dark: ramp(MATERIALS.charred, { shift: 8 }),
  woodDark: ramp(MATERIALS.woodDark),
  pink: ramp('#c48a86', { shift: 10 }),
};
const P = {
  rabbit: pal(R.rabbit),
  cream: pal(R.cream),
  white: pal(R.white),
  sika: pal(R.sika),
  dark: pal(R.dark),
  woodDark: pal(R.woodDark),
  pink: pal(R.pink),
};

// --- small helpers ---------------------------------------------------------------------------

type P2 = [number, number];
type P3 = [number, number, number];
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const lerp2 = (a: P2, b: P2, t: number): P2 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const rad = (deg: number): number => (deg * Math.PI) / 180;

// --- step buffer -----------------------------------------------------------------------------

interface PartInfo {
  /** Ramp step drawn on parts behind along this part's edge (null: no inner line). */
  line: number | null;
  /** Cast-shadow reach (px, toward the lower right) on parts behind. */
  shadow: number;
  layer: number;
  /** Parts this one never draws an inner line on. */
  noLine: Set<number>;
}

/** Per pixel: palette, ramp step and the part it belongs to. Parts paint back to front. */
class Buf {
  readonly pal: Int16Array;
  readonly step: Int8Array;
  readonly part: Int16Array;
  readonly parts: PartInfo[] = [];
  constructor(readonly w: number, readonly h: number) {
    this.pal = new Int16Array(w * h).fill(-1);
    this.step = new Int8Array(w * h);
    this.part = new Int16Array(w * h).fill(-1);
  }
  in(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  has(x: number, y: number): boolean {
    return this.in(x, y) && this.pal[y * this.w + x] >= 0;
  }
  partAt(x: number, y: number): number {
    return this.in(x, y) ? this.part[y * this.w + x] : -1;
  }
  stepAt(x: number, y: number): number {
    return this.in(x, y) ? this.step[y * this.w + x] : 0;
  }
  palAt(x: number, y: number): number {
    return this.in(x, y) ? this.pal[y * this.w + x] : -1;
  }
  layerAt(x: number, y: number): number {
    const p = this.partAt(x, y);
    return p < 0 ? -Infinity : this.parts[p].layer;
  }
  newPart(o: { line?: number | null; shadow?: number; layer?: number; noLine?: number[] } = {}): number {
    this.parts.push({ line: o.line === undefined ? 0 : o.line, shadow: o.shadow ?? 0, layer: o.layer ?? this.parts.length, noLine: new Set(o.noLine ?? []) });
    return this.parts.length - 1;
  }
  /** Paints a pixel of `part` unless a part in front already owns it. */
  put(x: number, y: number, palIdx: number, step: number, part: number): boolean {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.in(x, y)) return false;
    const i = y * this.w + x;
    if (this.part[i] >= 0 && this.parts[this.part[i]].layer > this.parts[part].layer) return false;
    this.pal[i] = palIdx;
    this.step[i] = clamp(Math.round(step), 0, 5);
    this.part[i] = part;
    return true;
  }
  /** Recolors a pixel that is already painted (decals: eyes, spots), keeping its part. */
  dot(x: number, y: number, palIdx: number, step: number): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.has(x, y)) return;
    const i = y * this.w + x;
    this.pal[i] = palIdx;
    this.step[i] = clamp(Math.round(step), 0, 5);
  }
  shade(x: number, y: number, d: number, min = 1): void {
    if (!this.has(x, y)) return;
    const i = y * this.w + x;
    this.step[i] = clamp(this.step[i] + d, Math.min(min, this.step[i]), 5);
  }
  clear(x: number, y: number): void {
    if (!this.in(x, y)) return;
    const i = y * this.w + x;
    this.pal[i] = -1;
    this.part[i] = -1;
  }
}

/** Inner lines (a part in front darkens the edge of the part behind it), cast shadows, colors and outline. */
function finish(b: Buf, o: { outline?: boolean; outlineAmount?: number } = {}): Canvas {
  const lines: [number, number, number][] = [];
  const shadows: [number, number][] = [];
  for (let y = 0; y < b.h; y++)
    for (let x = 0; x < b.w; x++) {
      const p = b.partAt(x, y);
      if (p < 0) continue;
      const lp = b.parts[p].layer;
      let line = 99;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const q = b.partAt(x + ox, y + oy);
        if (q < 0 || q === p) continue;
        const Q = b.parts[q];
        if (Q.line === null || Q.layer <= lp || Q.noLine.has(p)) continue;
        line = Math.min(line, Q.line);
      }
      if (line < 99) {
        lines.push([x, y, line]);
        continue;
      }
      // Cast shadow: a part in front up-left of this pixel.
      let sh = false;
      for (let k = 1; k <= 3 && !sh; k++)
        for (const [ox, oy] of [[-k, -k], [0, -k], [-k, 0]]) {
          const q = b.partAt(x + ox, y + oy);
          if (q < 0 || q === p) continue;
          const Q = b.parts[q];
          if (Q.shadow >= k && Q.layer > lp && !Q.noLine.has(p)) sh = true;
        }
      if (sh) shadows.push([x, y]);
    }
  for (const [x, y, s] of lines) b.step[y * b.w + x] = Math.min(b.step[y * b.w + x], s);
  for (const [x, y] of shadows) b.shade(x, y, -1);
  const c = new Canvas(b.w, b.h);
  for (let y = 0; y < b.h; y++)
    for (let x = 0; x < b.w; x++) {
      const i = y * b.w + x;
      if (b.pal[i] >= 0) c.set(x, y, PAL[b.pal[i]][b.step[i]]);
    }
  if (o.outline !== false) c.outline({ amount: o.outlineAmount ?? 0.7 });
  return c;
}

// --- signed distance shapes ------------------------------------------------------------------

interface Prim {
  sd: (x: number, y: number, z: number) => number;
  /** x0, y0, z0, x1, y1, z1 */
  box: [number, number, number, number, number, number];
}

/** Ellipsoid at `c` with radii `r`, its x axis turned `ang` radians (clockwise on screen). */
function ell(c: P3, r: P3, ang = 0): Prim {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const R0 = Math.max(r[0], r[1]);
  return {
    sd: (x, y, z) => {
      const dx = x - c[0], dy = y - c[1], dz = z - c[2];
      const lx = dx * ca + dy * sa, ly = -dx * sa + dy * ca;
      const k0 = Math.hypot(lx / r[0], ly / r[1], dz / r[2]);
      const k1 = Math.hypot(lx / (r[0] * r[0]), ly / (r[1] * r[1]), dz / (r[2] * r[2]));
      return k1 < 1e-9 ? -Math.min(r[0], r[1], r[2]) : (k0 * (k0 - 1)) / k1;
    },
    box: [c[0] - R0, c[1] - R0, c[2] - r[2], c[0] + R0, c[1] + R0, c[2] + r[2]],
  };
}

/** An ellipsoid stretched between two points (ears, flat limbs): half-length along a-b, `w` across, `t` thick. */
function seg(a: P3, b: P3, w: number, t: number): Prim {
  const c: P3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) / 2;
  return ell(c, [Math.max(len, w), w, t], Math.atan2(b[1] - a[1], b[0] - a[0]));
}

/** Tapered capsule from a (radius r1) to b (radius r2). */
function cone(a: P3, b: P3, r1: number, r2: number): Prim {
  const ba: P3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l2 = ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2];
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  return {
    sd: (x, y, z) => {
      const pa: P3 = [x - a[0], y - a[1], z - a[2]];
      const yy = pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2];
      const zz = yy - l2;
      const qx = pa[0] * l2 - ba[0] * yy, qy = pa[1] * l2 - ba[1] * yy, qz = pa[2] * l2 - ba[2] * yy;
      const x2 = qx * qx + qy * qy + qz * qz;
      const y2 = yy * yy * l2;
      const z2 = zz * zz * l2;
      const k = Math.sign(rr) * rr * rr * x2;
      if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
      if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
      return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
    },
    box: [
      Math.min(a[0] - r1, b[0] - r2), Math.min(a[1] - r1, b[1] - r2), Math.min(a[2] - r1, b[2] - r2),
      Math.max(a[0] + r1, b[0] + r2), Math.max(a[1] + r1, b[1] + r2), Math.max(a[2] + r1, b[2] + r2),
    ],
  };
}

const smin = (a: number, b: number, k: number): number => {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};

/** Smooth union (k = blend radius in px; 0 = hard). */
function uni(k: number, ...ps: Prim[]): Prim {
  const box = ps[0].box.slice() as Prim['box'];
  for (const p of ps)
    for (let i = 0; i < 3; i++) {
      box[i] = Math.min(box[i], p.box[i] - k * 0.25);
      box[i + 3] = Math.max(box[i + 3], p.box[i + 3] + k * 0.25);
    }
  return {
    sd: (x, y, z) => {
      let d = ps[0].sd(x, y, z);
      for (let i = 1; i < ps.length; i++) d = smin(d, ps[i].sd(x, y, z), k);
      return d;
    },
    box,
  };
}
/** Cuts `b` out of `a`. */
function sub(a: Prim, b: Prim): Prim {
  return { sd: (x, y, z) => Math.max(a.sd(x, y, z), -b.sd(x, y, z)), box: a.box };
}
/** Keeps only where both overlap. */
function inter(a: Prim, b: Prim): Prim {
  return { sd: (x, y, z) => Math.max(a.sd(x, y, z), b.sd(x, y, z)), box: a.box };
}

// --- shading ---------------------------------------------------------------------------------

interface Hit {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  light: number;
  step: number;
}
interface SolidOpts {
  pal: number;
  layer?: number;
  line?: number | null;
  shadow?: number;
  noLine?: number[];
  /** Darkens the whole part (far limbs). */
  far?: number;
  /** Light thresholds for steps 2, 3, 4, 5. */
  cuts?: number[];
  jitter?: number;
  cell?: number;
  seed?: number;
  /** Anchor of the band noise, so clusters move with the part. */
  origin?: P2;
  ambient?: number;
  bias?: number;
  minStep?: number;
  maxStep?: number;
  /** Per-pixel material override: return a palette and step, or a step, or null to keep. */
  paint?: (h: Hit) => [number, number] | number | null;
}

const CUTS = [0.34, 0.52, 0.8, 0.94];

/** Quantizes light to a ramp step (1..5); band edges wander by low-frequency noise into clusters. */
function quant(light: number, nx: number, ny: number, cuts: number[], jitter: number, cell: number, seed: number): number {
  const t = light + (noise(nx, ny, cell, seed) - 0.5) * 2 * jitter;
  let s = 1;
  for (const c of cuts) if (t >= c) s++;
  return s;
}

/** Ray-casts a shape from the viewer and paints it as one part. Returns the part id. */
function solid(b: Buf, prim: Prim, o: SolidOpts): number {
  const part = b.newPart({ line: o.line, shadow: o.shadow, layer: o.layer, noLine: o.noLine });
  const [x0, y0, z0, x1, y1, z1] = prim.box;
  const cuts = o.cuts ?? CUTS;
  const org = o.origin ?? [0, 0];
  const e = 0.3;
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(b.h - 1, Math.ceil(y1)); y++)
    for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(b.w - 1, Math.ceil(x1)); x++) {
      const px = x + 0.5, py = y + 0.5;
      let z = z1 + 0.5, hit = false;
      for (let i = 0; i < 90; i++) {
        const d = prim.sd(px, py, z);
        if (d < 0.02) {
          hit = true;
          break;
        }
        z -= Math.max(d * 0.8, 0.03);
        if (z < z0 - 0.6) break;
      }
      if (!hit) continue;
      let nx = prim.sd(px + e, py, z) - prim.sd(px - e, py, z);
      let ny = prim.sd(px, py + e, z) - prim.sd(px, py - e, z);
      let nz = prim.sd(px, py, z + e) - prim.sd(px, py, z - e);
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl;
      ny /= nl;
      nz /= nl;
      const light = lambert(nx, ny, nz, o.ambient ?? 0.2) + (o.bias ?? 0);
      let step = quant(light, x - org[0], y - org[1], cuts, o.jitter ?? 0.07, o.cell ?? 2.5, o.seed ?? 7);
      step -= o.far ?? 0;
      step = clamp(step, o.minStep ?? 1, o.maxStep ?? 5);
      let palIdx = o.pal;
      if (o.paint) {
        const r = o.paint({ x, y, z, nx, ny, nz, light, step });
        if (Array.isArray(r)) {
          palIdx = r[0];
          step = r[1];
        } else if (r !== null) step = r;
      }
      b.put(x, y, palIdx, step, part);
    }
  return part;
}

/** A flat polygon part with one step (or a step per pixel). */
function flat(b: Buf, pts: P2[], o: { pal: number; step: number | ((x: number, y: number) => number | [number, number] | null); layer?: number; line?: number | null; shadow?: number; noLine?: number[] }): number {
  const part = b.newPart({ line: o.line, shadow: o.shadow, layer: o.layer, noLine: o.noLine });
  let y0 = Infinity, y1 = -Infinity;
  for (const [, y] of pts) {
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(b.h - 1, Math.ceil(y1)); y++) {
    const cy = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((a, c) => a - c);
    for (let k = 0; k + 1 < xs.length; k += 2)
      for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) {
        const s = typeof o.step === 'function' ? o.step(x, y) : o.step;
        if (s === null) continue;
        if (Array.isArray(s)) b.put(x, y, s[0], s[1], part);
        else b.put(x, y, o.pal, s, part);
      }
  }
  return part;
}

// --- templates -------------------------------------------------------------------------------

/** Paints a pixel template: each character maps to [palette, step] ('.' and ' ' are empty). */
function stamp(b: Buf, rows: string[], ox: number, oy: number, legend: Record<string, [number, number]>, o: { layer?: number; line?: number | null; flipX?: boolean } = {}): number {
  const part = b.newPart({ line: o.line, layer: o.layer });
  const w = Math.max(...rows.map((r) => r.length));
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const L = legend[ch];
      if (!L) continue;
      b.put(ox + (o.flipX ? w - 1 - x : x), oy + y, L[0], L[1], part);
    }
  });
  return part;
}

// --- sprite assembly -------------------------------------------------------------------------

interface RawAnim {
  frames: Canvas[];
  fps: number;
  loop?: boolean;
}

/** Crops every frame to the union of the opaque bounds (+1 px) so all frames share one size and anchor. */
function assemble(name: string, label: string, meters: [number, number], tags: string[], anims: Record<string, RawAnim>, ax: number, ay: number): WorldSprite {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const a of Object.values(anims))
    for (const f of a.frames) {
      const bb = f.bounds();
      if (!bb) continue;
      x0 = Math.min(x0, bb[0]);
      y0 = Math.min(y0, bb[1]);
      x1 = Math.max(x1, bb[2]);
      y1 = Math.max(y1, bb[3]);
    }
  x0 -= 1;
  y0 -= 1;
  x1 += 1;
  y1 += 1;
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const out: Record<string, Anim> = {};
  for (const [k, a] of Object.entries(anims))
    out[k] = {
      fps: a.fps,
      loop: a.loop ?? true,
      frames: a.frames.map((f) => {
        const c = new Canvas(w, h);
        c.draw(f, -x0, -y0);
        return c;
      }),
    };
  return { name, label, meters, anchor: [Math.round(ax - x0), Math.round(ay - y0)], tags, anims: out };
}

// =============================================================================================
// RABBIT
// =============================================================================================
//
// Side view, facing right, about 1.2x real size so the face reads. Origin (0, 0) is the ground
// contact under the body center; y grows down, z toward the viewer.

interface RabbitPose {
  lift: number;
  tail: P2;
  haunch: { c: P2; r: P2; a: number };
  body: { c: P2; r: P2; a: number };
  chest: { c: P2; r: P2 };
  head: { c: P2; a: number };
  /** Ear base and tip, near and far. */
  earN: [P2, P2];
  earF: [P2, P2];
  /** Front legs: shoulder and paw. */
  armN: [P2, P2];
  armF: [P2, P2];
  /** Hind feet: heel and toe. */
  footN: [P2, P2];
  footF?: [P2, P2];
  /** Nose wiggle (0 rest, 1 up). */
  nose: number;
  /** Eye: 1 open, 0 closed. */
  eye: number;
}

const RABBIT_SIT: RabbitPose = {
  lift: 0,
  tail: [-9.2, -4.2],
  haunch: { c: [-4.2, -4.6], r: [4.9, 4.4], a: -0.15 },
  body: { c: [-0.8, -7.2], r: [6.2, 4.6], a: -0.5 },
  chest: { c: [3.3, -8], r: [3, 3.6] },
  head: { c: [5.6, -12.2], a: 0.25 },
  earN: [[4.4, -14.6], [1.9, -20.6]],
  earF: [[3.2, -14.9], [0.4, -20.0]],
  armN: [[3.9, -6.2], [5.4, -1.0]],
  armF: [[2.8, -6.2], [4.2, -1.0]],
  footN: [[-7.2, -1.1], [1.2, -0.9]],
  nose: 0,
  eye: 1,
};

function rabbitFrame(pose: RabbitPose): Canvas {
  const W = 48, H = 40, ox = 24, gy = 34;
  const b = new Buf(W, H);
  const L = pose.lift;
  const at = (p: P2, z = 0): P3 => [ox + p[0], gy + p[1] + L, z];
  const org: P2 = [ox + pose.body.c[0], gy + pose.body.c[1] + L];
  const fur = P.rabbit;
  const furCuts = [0.34, 0.5, 0.79, 0.95];

  // Far side first: ear, front leg, hind foot.
  const [ef0, ef1] = pose.earF;
  solid(b, seg(at(ef0, -1.6), at(ef1, -1.6), 1.25, 0.8), { pal: fur, far: 1, cuts: furCuts, origin: org, line: 0 });
  solid(b, cone(at(pose.armF[0], -1.8), at(pose.armF[1], -1.8), 1.3, 1.0), { pal: fur, far: 1, cuts: furCuts, origin: org });
  if (pose.footF) solid(b, cone(at(pose.footF[0], -2), at(pose.footF[1], -2), 1.3, 0.9), { pal: fur, far: 1, cuts: furCuts, origin: org });
  // Tail puff behind the haunch.
  solid(b, ell(at(pose.tail, 0), [2.1, 2.0, 2]), { pal: P.white, cuts: [0.3, 0.45, 0.7, 0.9], origin: org, maxStep: 4 });
  // Torso: body and chest merged.
  const torso = uni(2.5, ell(at(pose.body.c, 0), [pose.body.r[0], pose.body.r[1], 4.2], pose.body.a), ell(at(pose.chest.c, 0.4), [pose.chest.r[0], pose.chest.r[1], 3.6]));
  solid(b, torso, {
    pal: fur,
    cuts: furCuts,
    origin: org,
    paint: (h) => (h.ny > 0.62 && h.y > org[1] ? [P.cream, Math.max(1, h.step - 1)] : null),
  });
  // Near haunch over the torso, with its thigh line.
  const hp = at(pose.haunch.c, 1.2);
  solid(b, ell(hp, [pose.haunch.r[0], pose.haunch.r[1], 3.6], pose.haunch.a), { pal: fur, cuts: furCuts, origin: org, line: 1 });
  // Hind foot (long, flat on the ground).
  solid(b, cone(at(pose.footN[0], 2.2), at(pose.footN[1], 2.2), 1.35, 1.0), { pal: fur, cuts: furCuts, origin: org, bias: 0.06, line: 1 });
  // Near front leg.
  solid(b, cone(at(pose.armN[0], 1.8), at(pose.armN[1], 1.8), 1.35, 1.05), { pal: fur, cuts: furCuts, origin: org, bias: 0.04, line: 1 });
  // Head with muzzle and cheek.
  const hc = at(pose.head.c, 0.6);
  const ha = pose.head.a;
  const rot = (dx: number, dy: number): P3 => [hc[0] + dx * Math.cos(ha) - dy * Math.sin(ha), hc[1] + dx * Math.sin(ha) + dy * Math.cos(ha), hc[2]];
  const head = uni(1.8, ell(hc, [3.7, 3.2, 3.2], ha), ell(rot(2.8, 0.9), [2.0, 1.9, 2.3], ha));
  const hpart = solid(b, head, {
    pal: fur,
    cuts: furCuts,
    origin: org,
    line: 0,
    shadow: 1,
    paint: (h) => {
      // Pale chin and the cream ring under the eye.
      const lx = (h.x + 0.5 - hc[0]) * Math.cos(ha) + (h.y + 0.5 - hc[1]) * Math.sin(ha);
      const ly = -(h.x + 0.5 - hc[0]) * Math.sin(ha) + (h.y + 0.5 - hc[1]) * Math.cos(ha);
      if (ly > 1.6 && lx > 0.5) return [P.cream, Math.max(1, h.step - 1)];
      return null;
    },
  });
  // Near ear: a long leaf with a pale inner groove and a dark rim at the tip.
  const [en0, en1] = pose.earN;
  const earA = at(en0, 1.4), earB = at(en1, 1.4);
  solid(b, seg(earA, earB, 1.35, 0.9), {
    pal: fur,
    cuts: furCuts,
    origin: org,
    line: 0,
    paint: (h) => {
      const t = ((h.x + 0.5 - earA[0]) * (earB[0] - earA[0]) + (h.y + 0.5 - earA[1]) * (earB[1] - earA[1])) / ((earB[0] - earA[0]) ** 2 + (earB[1] - earA[1]) ** 2);
      if (t > 0.86) return Math.max(1, h.step - 1);
      return null;
    },
  });
  // Inner ear groove: a pale line from base to near the tip, set just behind the front edge.
  {
    const n = 6;
    for (let i = 1; i < n; i++) {
      const t = 0.2 + (i / n) * 0.6;
      const x = Math.floor(lerp(earA[0], earB[0], t) + 0.35), y = Math.floor(lerp(earA[1], earB[1], t));
      if (b.partAt(x, y) === b.parts.length - 1) b.dot(x, y, P.pink, 2);
    }
  }
  // Eye: dark 2x2 with a catchlight toward the light; pale rim above.
  const ec = rot(0.7, -0.6);
  const ex = Math.floor(ec[0]), ey = Math.floor(ec[1]);
  if (pose.eye > 0.5) {
    b.dot(ex, ey, P.dark, 1);
    b.dot(ex + 1, ey, P.dark, 1);
    b.dot(ex, ey + 1, P.dark, 1);
    b.dot(ex + 1, ey + 1, P.dark, 2);
    b.dot(ex, ey, P.white, 3);
    b.dot(ex - 1, ey + 1, P.cream, 2);
  } else {
    b.dot(ex, ey + 1, P.dark, 1);
    b.dot(ex + 1, ey + 1, P.dark, 1);
  }
  // Nose: the tip of the muzzle, wiggling a pixel.
  const nc = rot(4.6, 0.2 - pose.nose * 0.8);
  b.dot(Math.floor(nc[0]), Math.floor(nc[1]), P.pink, 2);
  void hpart;
  return finish(b);
}

function rabbit(): WorldSprite {
  const sit = RABBIT_SIT;
  const idle = [rabbitFrame(sit)];
  const ox = 24, gy = 34;
  return assemble('rabbit', 'Wild Rabbit', [0.35, 0.3], ['animal', 'ambient'], { idle: { frames: idle, fps: 6 } }, ox, gy);
}

// =============================================================================================
// BUILD
// =============================================================================================

function debugSaves(sprites: WorldSprite[], dir: string): void {
  for (const s of sprites) {
    const anims = Object.entries(s.anims);
    const first = anims[0][1].frames[0];
    first.scaled(Math.max(4, Math.min(16, Math.floor(480 / Math.max(first.w, first.h))))).save(join(dir, `animals-${s.name}-zoom.png`));
    for (const [k, a] of anims) {
      const fw = a.frames[0].w, fh = a.frames[0].h;
      const strip = new Canvas((fw + 2) * a.frames.length, fh);
      strip.fillRect(0, 0, strip.w, strip.h, hex('#5d6b57'));
      a.frames.forEach((f, i) => strip.draw(f, i * (fw + 2), 0));
      strip.scaled(Math.max(2, Math.min(10, Math.floor(1400 / strip.w)))).save(join(dir, `animals-${s.name}-${k}.png`));
    }
  }
}

const sprites: WorldSprite[] = [rabbit()];
writeGroup('animals', sprites);
preview(sprites, join(previewDir(), 'animals.png'), { scale: 4 });
debugSaves(sprites, previewDir());
for (const s of sprites) {
  const f = Object.values(s.anims)[0].frames[0];
  const bb = f.bounds();
  console.log(`${s.name.padEnd(17)} frame ${f.w}x${f.h} anchor ${s.anchor} opaque ${bb ? bb[2] - bb[0] + 1 : 0}x${bb ? bb[3] - bb[1] + 1 : 0} (m ${s.meters} = ${m(s.meters[0])}x${m(s.meters[1])}px) anims ${Object.entries(s.anims).map(([k, a]) => `${k}:${a.frames.length}@${a.fps}${a.loop === false ? '(once)' : ''}`).join(' ')}`);
}
void [hash, withAlpha, lerp2, rad, sub, inter, flat, stamp];
