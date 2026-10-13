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
import { Anim, CHARACTER_FEET, Canvas, Color, LIGHT, characterRef, MATERIALS, WorldSprite, hash, hex, m, mix, noise, preview, previewDir, ramp, toHex, withAlpha, writeGroup } from './kit';

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
  // Belly and chin fur: canvas cream pulled toward paper so the shadows stay gray, not orange.
  pale: ramp(blend(MATERIALS.canvas, MATERIALS.paper, 0.45), { shift: 5, spread: 0.8 }),
  white: ramp(MATERIALS.paper, { shift: 10 }),
  // Sika summer coat: the shared fur warmed toward wood (chestnut).
  sika: ramp(blend(MATERIALS.fur, MATERIALS.wood, 0.55), { shift: 14 }),
  dark: ramp(MATERIALS.charred, { shift: 8 }),
  woodDark: ramp(MATERIALS.woodDark),
  pink: ramp('#b88a80', { shift: 8 }),
  // Crow: charred black pulled toward blue-violet. The ramp is set by hand so even the darkest
  // fill stays well above the outline (dark materials stay readable), with a blue-violet sheen
  // on the lit crests.
  crow: ['#08070c', '#1a1925', '#272636', '#363548', '#4a5384', '#7480ba'].map((c) => hex(c)),
  beak: ['#08080a', '#1d1c21', '#2c2b31', '#403f47', '#57555f', '#706d78'].map((c) => hex(c)),
  // Sparrow: streaked brown between wood and fur, a chestnut cap, a pale gray-buff breast.
  sparrow: ramp(blend(MATERIALS.wood, MATERIALS.fur, 0.45), { shift: 12 }),
  cap: ramp(blend(MATERIALS.wood, MATERIALS.barkCedar, 0.3), { shift: 12 }),
  sparBelly: ramp(blend(MATERIALS.stone, MATERIALS.paper, 0.55), { shift: 8 }),
  legPink: ramp('#a07c6c', { shift: 8 }),
  // Sika spots: the coat lifted toward paper.
  spot: ramp(blend(blend(MATERIALS.fur, MATERIALS.wood, 0.55), MATERIALS.paper, 0.5), { shift: 10 }),
};
const P = {
  rabbit: pal(R.rabbit),
  cream: pal(R.cream),
  pale: pal(R.pale),
  white: pal(R.white),
  sika: pal(R.sika),
  dark: pal(R.dark),
  woodDark: pal(R.woodDark),
  pink: pal(R.pink),
  spot: pal(R.spot),
  crow: pal(R.crow),
  sparrow: pal(R.sparrow),
  cap: pal(R.cap),
  sparBelly: pal(R.sparBelly),
  legPink: pal(R.legPink),
  beak: pal(R.beak),
  fur: pal(R.fur),
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
  /** Inner line only on the shadow side (right of and below this part). */
  shadowSideOnly: boolean;
}

interface PartOpts {
  line?: number | null;
  shadow?: number;
  layer?: number;
  noLine?: number[];
  lineSide?: 'all' | 'shadow';
}

/** Per pixel: palette, ramp step and the part it belongs to. Parts paint back to front. */
class Buf {
  readonly pal: Int16Array;
  readonly step: Int8Array;
  readonly part: Int16Array;
  /** Hand-placed decal pixels (eyes, noses) that inner lines and shadows leave alone. */
  readonly locked: Uint8Array;
  readonly parts: PartInfo[] = [];
  constructor(readonly w: number, readonly h: number) {
    this.pal = new Int16Array(w * h).fill(-1);
    this.step = new Int8Array(w * h);
    this.part = new Int16Array(w * h).fill(-1);
    this.locked = new Uint8Array(w * h);
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
  newPart(o: PartOpts = {}): number {
    this.parts.push({ line: o.line === undefined ? 0 : o.line, shadow: o.shadow ?? 0, layer: o.layer ?? this.parts.length, noLine: new Set(o.noLine ?? []), shadowSideOnly: o.lineSide === 'shadow' });
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
    this.locked[i] = 1;
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
        if (Q.shadowSideOnly && (ox > 0 || oy > 0)) continue;
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
  // Drop lone line pixels (a line needs a neighbor to read as a line, not a speck).
  const isLine = new Set(lines.map(([x, y]) => y * b.w + x));
  for (const [x, y, s] of lines) {
    let n = 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if ((ox || oy) && isLine.has((y + oy) * b.w + x + ox)) n++;
    if (n > 0 && !b.locked[y * b.w + x]) b.step[y * b.w + x] = Math.min(b.step[y * b.w + x], s);
  }
  for (const [x, y] of shadows) if (!b.locked[y * b.w + x]) b.shade(x, y, -1);
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

/** A lens-shaped leaf from a to b (pointed ends), `w` half-width, `t` half-thickness: ears, fins, wings. */
function leaf(a: P3, b: P3, w: number, t: number): Prim {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
  const R = ((L / 2) ** 2 + w * w) / (2 * w);
  const kz = Math.min(1, t / w);
  const zc = (a[2] + b[2]) / 2;
  return {
    sd: (x, y, z) => {
      const vx = x - a[0], vy = y - a[1];
      const al = vx * ux + vy * uy - L / 2, ac = -vx * uy + vy * ux, zz = (z - zc) / kz;
      const d1 = Math.hypot(al, ac + (R - w), zz) - R;
      const d2 = Math.hypot(al, ac - (R - w), zz) - R;
      return Math.max(d1, d2) * kz;
    },
    box: [Math.min(a[0], b[0]) - w, Math.min(a[1], b[1]) - w, zc - t, Math.max(a[0], b[0]) + w, Math.max(a[1], b[1]) + w, zc + t],
  };
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
interface SolidOpts extends PartOpts {
  pal: number;
  /** Darkens the whole part (far limbs). */
  far?: number;
  /** Light thresholds for steps 2, 3, 4, 5. */
  cuts?: number[];
  jitter?: number;
  cell?: number;
  seed?: number;
  /** Anchor of the band noise, so clusters move with the part. */
  origin?: P2;
  /** Light wrap: how far the light reaches around the form (0 = plain Lambert). */
  wrap?: number;
  bias?: number;
  minStep?: number;
  maxStep?: number;
  /** Per-pixel material override: return a palette and step, or a step, or null to keep. */
  paint?: (h: Hit) => [number, number] | number | null;
}

const CUTS = [0.2, 0.42, 0.72, 0.9];

/** Wrapped Lambert: the light reaches a little past the terminator, so forms turn instead of halving. */
function wrapLight(nx: number, ny: number, nz: number, wrap: number): number {
  return clamp((nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2] + wrap) / (1 + wrap), 0, 1);
}

/** Quantizes light to a ramp step (1..5); band edges wander by low-frequency noise into clusters. */
function quant(light: number, nx: number, ny: number, cuts: number[], jitter: number, cell: number, seed: number): number {
  const t = light + (noise(nx, ny, cell, seed) - 0.5) * 2 * jitter;
  let s = 1;
  for (const c of cuts) if (t >= c) s++;
  return s;
}

/** Ray-casts a shape from the viewer and paints it as one part. Returns the part id. */
function solid(b: Buf, prim: Prim, o: SolidOpts): number {
  const part = b.newPart(o);
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
      const light = wrapLight(nx, ny, nz, o.wrap ?? 0.45) + (o.bias ?? 0);
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
function flat(b: Buf, pts: P2[], o: PartOpts & { pal: number; step: number | ((x: number, y: number) => number | [number, number] | null) }): number {
  const part = b.newPart(o);
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
function stamp(b: Buf, rows: string[], ox: number, oy: number, legend: Record<string, [number, number]>, o: PartOpts & { flipX?: boolean } = {}): number {
  const part = b.newPart(o);
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

interface Oval {
  c: P2;
  r: P2;
  a: number;
}
interface RabbitPose {
  tail: P2;
  haunch: Oval;
  body: Oval;
  chest: Oval;
  head: { c: P2; a: number };
  /** Ear base and tip, near and far. */
  earN: [P2, P2];
  earF: [P2, P2];
  /** Front legs: shoulder and paw. */
  armN: [P2, P2];
  armF: [P2, P2];
  /** Hind leg: knee (inside the haunch) to heel, then heel to toe. The far foot trails by `farFoot`. */
  shin: [P2, P2];
  foot: [P2, P2];
  farFoot?: P2;
  /** Nose wiggle (0 rest, 1 up). */
  nose: number;
  /** Eye: 1 open, 0 closed. */
  eye: number;
}

const RABBIT_SIT: RabbitPose = {
  tail: [-9.2, -4.2],
  haunch: { c: [-4.2, -4.6], r: [4.9, 4.4], a: -0.15 },
  body: { c: [-0.8, -7.2], r: [6.2, 4.6], a: -0.5 },
  chest: { c: [3.3, -8], r: [3, 3.6], a: 0 },
  head: { c: [5.6, -12.2], a: 0.25 },
  earN: [[4.8, -14.4], [3.4, -21.4]],
  earF: [[3.2, -14.4], [-1.6, -19.8]],
  armN: [[3.9, -6.2], [5.4, -1.0]],
  armF: [[2.8, -6.2], [4.2, -1.0]],
  shin: [[-4.5, -4.5], [-6.8, -1.3]],
  foot: [[-7.2, -1.1], [1.2, -0.9]],
  nose: 0,
  eye: 1,
};

const RABBIT_W = 52, RABBIT_H = 44, RABBIT_OX = 26, RABBIT_GY = 38;

function rabbitFrame(pose: RabbitPose): Canvas {
  const ox = RABBIT_OX, gy = RABBIT_GY;
  const b = new Buf(RABBIT_W, RABBIT_H);
  const at = (p: P2, z = 0): P3 => [ox + p[0], gy + p[1], z];
  const org: P2 = [ox + pose.body.c[0], gy + pose.body.c[1]];
  const fur = P.rabbit;
  const base = { pal: fur, origin: org, jitter: 0.05, cuts: [0.2, 0.42, 0.78, 0.93] };

  // Far side first: ear, front leg, hind foot.
  const [ef0, ef1] = pose.earF;
  solid(b, seg(at(ef0, -1.6), at(ef1, -1.6), 1.45, 0.8), { ...base, far: 1, line: 1 });
  solid(b, cone(at(pose.armF[0], -1.8), at(pose.armF[1], -1.8), 1.2, 0.95), { ...base, far: 1 });
  if (pose.farFoot) {
    const [dx, dy] = pose.farFoot;
    const sh: [P2, P2] = [[pose.shin[0][0] + dx, pose.shin[0][1] + dy], [pose.shin[1][0] + dx, pose.shin[1][1] + dy]];
    const ft: [P2, P2] = [[pose.foot[0][0] + dx, pose.foot[0][1] + dy], [pose.foot[1][0] + dx, pose.foot[1][1] + dy]];
    solid(b, uni(1, cone(at(sh[0], -2), at(sh[1], -2), 1.5, 1.1), cone(at(ft[0], -2), at(ft[1], -2), 1.2, 0.9)), { ...base, far: 1 });
  }
  // Tail puff behind the haunch.
  solid(b, ell(at(pose.tail, 0), [2.1, 2.0, 2]), { pal: P.white, origin: org, minStep: 2, maxStep: 4, line: null });
  // Torso: body and chest merged, pale belly.
  const torso = uni(2.5, ell(at(pose.body.c, 0), [pose.body.r[0], pose.body.r[1], 4.2], pose.body.a), ell(at(pose.chest.c, 0.4), [pose.chest.r[0], pose.chest.r[1], 3.6], pose.chest.a));
  solid(b, torso, { ...base, line: 1, paint: (h) => (h.ny > 0.84 && h.x < ox + pose.chest.c[0] - 1 ? [P.pale, clamp(h.step, 2, 3)] : null) });
  // Hind leg: shin under the haunch, then the long foot.
  const leg = uni(1, cone(at(pose.shin[0], 1.5), at(pose.shin[1], 1.8), 1.6, 1.15), cone(at(pose.foot[0], 2.0), at(pose.foot[1], 2.2), 1.25, 0.95));
  solid(b, leg, { ...base, bias: 0.04, line: 1, lineSide: 'shadow' });
  // Near haunch over the torso and the top of the leg: the thigh line runs along its front.
  solid(b, ell(at(pose.haunch.c, 1.2), [pose.haunch.r[0], pose.haunch.r[1], 3.6], pose.haunch.a), { ...base, line: 1, lineSide: 'shadow' });
  // Near front leg.
  solid(b, cone(at(pose.armN[0], 1.8), at(pose.armN[1], 1.8), 1.3, 1.0), { ...base, bias: 0.05, line: 1, lineSide: 'shadow' });
  // Head with muzzle.
  const hc = at(pose.head.c, 0.6);
  const ha = pose.head.a;
  const rot = (dx: number, dy: number): P3 => [hc[0] + dx * Math.cos(ha) - dy * Math.sin(ha), hc[1] + dx * Math.sin(ha) + dy * Math.cos(ha), hc[2]];
  const local = (x: number, y: number): P2 => {
    const dx = x + 0.5 - hc[0], dy = y + 0.5 - hc[1];
    return [dx * Math.cos(ha) + dy * Math.sin(ha), -dx * Math.sin(ha) + dy * Math.cos(ha)];
  };
  const head = uni(1.8, ell(hc, [3.7, 3.2, 3.2], ha), ell(rot(2.8, 0.9), [2.0, 1.9, 2.3], ha));
  solid(b, head, {
    ...base,
    line: 1,
    paint: (h) => {
      const [lx, ly] = local(h.x, h.y);
      if (ly > 2.1 && lx > 0.6 && lx < 3.6) return [P.pale, clamp(h.step, 2, 3)];
      return null;
    },
  });
  // Near ear: a long leaf with a pale inner groove down its middle and a darker tip.
  const [en0, en1] = pose.earN;
  const earA = at(en0, 1.4), earB = at(en1, 1.4);
  const ex0 = earB[0] - earA[0], ey0 = earB[1] - earA[1], elen = Math.hypot(ex0, ey0);
  solid(b, seg(earA, earB, 1.6, 0.9), {
    ...base,
    line: 1,
    paint: (h) => {
      const vx = h.x + 0.5 - earA[0], vy = h.y + 0.5 - earA[1];
      const t = (vx * ex0 + vy * ey0) / (elen * elen);
      const across = (vx * ey0 - vy * ex0) / elen;
      if (t > 0.86) return Math.max(1, h.step - 1);
      if (t > 0.2 && t < 0.74 && Math.abs(across + 0.15) < 0.55) return [P.pink, 2];
      return null;
    },
  });
  // Eye: dark 2x2 with a catchlight toward the light.
  const ec = rot(0.6, -0.7);
  const ex = Math.floor(ec[0]), ey = Math.floor(ec[1]);
  if (pose.eye > 0.5) {
    b.dot(ex, ey, P.cream, 5);
    b.dot(ex + 1, ey, P.dark, 2);
    b.dot(ex, ey + 1, P.dark, 2);
    b.dot(ex + 1, ey + 1, P.dark, 2);
  } else {
    b.dot(ex, ey + 1, P.dark, 2);
    b.dot(ex + 1, ey + 1, P.dark, 2);
  }
  // Nose: the tip of the muzzle, wiggling a pixel.
  const nc = rot(4.5, 0.3 - pose.nose * 0.9);
  b.dot(Math.floor(nc[0]), Math.floor(nc[1]), P.pink, 3);
  return finish(b);
}

/** A pose with some parts replaced. */
function rp(base: RabbitPose, patch: Partial<RabbitPose>): RabbitPose {
  return { ...base, ...patch };
}
const shift2 = (pts: [P2, P2], dx: number, dy: number): [P2, P2] => [[pts[0][0] + dx, pts[0][1] + dy], [pts[1][0] + dx, pts[1][1] + dy]];

function rabbit(): WorldSprite {
  const S = RABBIT_SIT;
  // Idle: hold, nose twitches twice, the near ear flicks back and returns.
  const noseUp = rp(S, { nose: 1 });
  const earFlick = rp(S, { earN: [[4.4, -14.4], [-0.2, -20.4]] });
  const earHalf = rp(S, { earN: [[4.5, -14.4], [1.4, -21.0]] });
  const idle = [S, S, noseUp, S, noseUp, earFlick, earHalf, S].map(rabbitFrame);

  // Graze: leaning forward with the head down at the grass, nibbling.
  const G = rp(S, {
    haunch: { c: [-4.4, -5.4], r: [4.9, 4.5], a: -0.1 },
    body: { c: [-0.6, -7.4], r: [6.4, 4.6], a: 0.12 },
    chest: { c: [3.8, -6.2], r: [3, 3.4], a: 0 },
    head: { c: [7.4, -4.6], a: 1.1 },
    earN: [[5.8, -7.6], [2.6, -14.2]],
    earF: [[4.6, -7.6], [0.2, -13.0]],
    armN: [[4.6, -5.0], [6.6, -1.0]],
    armF: [[3.6, -5.0], [5.4, -1.0]],
    tail: [-9.4, -6.2],
  });
  const Gdown = rp(G, { head: { c: [7.4, -4.0], a: 1.15 }, nose: 1 });
  const Gear = rp(G, { earN: [[5.8, -7.6], [1.0, -13.6]] });
  const graze = [G, Gdown, G, Gdown, Gear, G].map(rabbitFrame);

  // Hop (in place; the engine moves the rabbit): push, stretch in the air, front paws land,
  // hind legs swing forward, hind feet land ahead, rise into the next push.
  const push = rp(S, {
    tail: [-9.2, -9.6],
    haunch: { c: [-4.6, -7.4], r: [4.5, 4.0], a: -0.35 },
    body: { c: [0, -8.4], r: [7.0, 4.2], a: -0.32 },
    chest: { c: [4.4, -10.2], r: [2.8, 3.3], a: 0 },
    head: { c: [7.8, -14.2], a: 0.1 },
    earN: [[6.6, -16.4], [1.4, -20.8]],
    earF: [[5.6, -16.6], [0.2, -19.8]],
    armN: [[5.0, -9.4], [9.8, -6.4]],
    armF: [[4.4, -9.4], [8.8, -7.4]],
    shin: [[-5.2, -6.6], [-8.4, -3.8]],
    foot: [[-8.4, -3.8], [-11.6, -0.9]],
    farFoot: [1.4, -0.4],
  });
  const fly = rp(S, {
    tail: [-9.8, -12.4],
    haunch: { c: [-5.0, -10.4], r: [4.2, 3.9], a: -0.2 },
    body: { c: [0, -11.0], r: [7.4, 4.0], a: -0.1 },
    chest: { c: [5.0, -11.4], r: [2.8, 3.2], a: 0 },
    head: { c: [8.8, -14.8], a: 0.25 },
    earN: [[7.4, -17.2], [2.0, -21.0]],
    earF: [[6.4, -17.4], [0.8, -20.0]],
    armN: [[5.6, -10.2], [10.4, -6.2]],
    armF: [[5.0, -10.2], [9.4, -7.2]],
    shin: [[-6.0, -9.4], [-9.6, -8.0]],
    foot: [[-9.6, -8.0], [-13.4, -6.8]],
    farFoot: [1.2, -0.6],
  });
  const land = rp(S, {
    tail: [-8.6, -11.4],
    haunch: { c: [-4.2, -9.6], r: [4.4, 4.0], a: 0.1 },
    body: { c: [1.0, -7.8], r: [7.0, 4.2], a: 0.22 },
    chest: { c: [5.0, -6.6], r: [2.8, 3.3], a: 0 },
    head: { c: [8.6, -9.6], a: 0.4 },
    earN: [[7.0, -12.0], [2.0, -17.4]],
    earF: [[6.0, -12.2], [0.8, -16.4]],
    armN: [[5.6, -6.0], [7.4, -1.0]],
    armF: [[5.0, -6.0], [6.2, -1.0]],
    shin: [[-4.8, -8.6], [-6.4, -6.0]],
    foot: [[-6.4, -6.0], [-2.6, -5.0]],
    farFoot: [1.2, -0.5],
  });
  const gather = rp(S, {
    tail: [-7.6, -9.2],
    haunch: { c: [-2.8, -7.6], r: [4.6, 4.2], a: 0 },
    body: { c: [0.6, -7.6], r: [6.0, 4.8], a: -0.08 },
    chest: { c: [4.6, -6.6], r: [2.8, 3.3], a: 0 },
    head: { c: [8.0, -10.6], a: 0.3 },
    earN: [[6.6, -13.0], [1.8, -18.6]],
    earF: [[5.6, -13.2], [0.6, -17.6]],
    armN: [[5.2, -5.6], [3.4, -1.0]],
    armF: [[4.6, -5.6], [2.4, -1.0]],
    shin: [[-3.2, -6.2], [-1.6, -3.6]],
    foot: [[-1.6, -3.6], [3.2, -2.6]],
    farFoot: [1.2, -0.4],
  });
  const bunch = rp(S, {
    tail: [-8.0, -6.4],
    haunch: { c: [-3.0, -5.2], r: [4.8, 4.4], a: 0 },
    body: { c: [0, -6.8], r: [5.8, 4.8], a: -0.35 },
    chest: { c: [3.6, -7.8], r: [2.8, 3.4], a: 0 },
    head: { c: [6.6, -11.8], a: 0.2 },
    earN: [[5.6, -14.0], [1.4, -19.8]],
    earF: [[4.6, -14.2], [0.2, -18.8]],
    armN: [[4.6, -7.0], [7.4, -3.6]],
    armF: [[4.0, -7.0], [6.6, -4.4]],
    shin: [[-3.4, -4.2], [-5.0, -1.2]],
    foot: [[-5.0, -1.1], [2.6, -0.9]],
    farFoot: [1.0, 0],
  });
  const rise = rp(S, {
    tail: [-8.8, -7.4],
    haunch: { c: [-4.0, -6.2], r: [4.7, 4.2], a: -0.25 },
    body: { c: [0, -7.6], r: [6.6, 4.5], a: -0.45 },
    chest: { c: [4.0, -9.6], r: [2.8, 3.4], a: 0 },
    head: { c: [7.2, -13.6], a: 0.15 },
    earN: [[6.0, -15.8], [1.2, -21.0]],
    earF: [[5.0, -16.0], [0.0, -20.0]],
    armN: [[4.8, -8.6], [8.8, -5.2]],
    armF: [[4.2, -8.6], [7.8, -6.2]],
    shin: [[-4.4, -5.4], [-6.8, -2.4]],
    foot: [[-6.8, -2.4], [-2.0, -0.9]],
    farFoot: [1.2, -0.3],
  });
  const hop = [push, fly, land, gather, bunch, rise].map(rabbitFrame);
  void shift2;
  return assemble('rabbit', 'Wild Rabbit', [0.35, 0.3], ['animal', 'ambient'], { idle: { frames: idle, fps: 6 }, graze: { frames: graze, fps: 6 }, hop: { frames: hop, fps: 12 } }, RABBIT_OX, RABBIT_GY);
}

// =============================================================================================
// SIKA DEER
// =============================================================================================
//
// A doe in summer coat, side view facing right, at real size (head 1.5 m = 86 px). Legs are
// solved per frame: each hoof follows a stance/swing path and two-bone IK places the carpus
// (front, bends forward) and hock (hind, bends back); the pastern rolls over the planted hoof.

interface LegJoints {
  P: P2; // shoulder or hip pivot (inside the body)
  S?: P2; // stifle (hind)
  J: P2; // carpus (front) or hock (hind)
  F: P2; // fetlock
  H: P2; // hoof tip on the ground
}

/** Circle-circle intersection: the point at distance r0 from a and r1 from b, on the `side` (+1 left of a->b, -1 right). */
function circles(a: P2, r0: number, b: P2, r1: number, side: number): P2 | null {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const d = Math.hypot(dx, dy);
  if (d > r0 + r1 || d < Math.abs(r0 - r1) || d < 1e-6) return null;
  const t = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r0 * r0 - t * t));
  const mx = a[0] + (dx * t) / d, my = a[1] + (dy * t) / d;
  return [mx + (side * -dy * h) / d, my + (side * dx * h) / d];
}

/** Two-bone IK: joint between `a` and `b` with bone lengths l1, l2, bent toward +x (front) or -x (hind). */
function ik2(a: P2, b: P2, l1: number, l2: number, bendFront: boolean): P2 {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (d >= l1 + l2 - 1e-3) return lerp2(a, b, l1 / (l1 + l2));
  const c1 = circles(a, l1, b, l2, 1)!, c2 = circles(a, l1, b, l2, -1)!;
  if (!c1) return lerp2(a, b, l1 / (l1 + l2));
  return (c1[0] > c2[0]) === bendFront ? c1 : c2;
}

const DEER = {
  front: { L1: 21, L2: 12, p: 5 },
  hind: { L1: 24, L2: 13, p: 5, hockAngle: rad(150) },
};

/**
 * Places one leg. `hoof` is the toe on the ground (y = 0) in stance; in swing (s in 0..1) the
 * fetlock is lifted by `lift` and the hoof folds back.
 */
function deerLeg(kind: 'front' | 'hind', P: P2, hoof: P2, s: number, lift: number): LegJoints {
  const front = kind === 'front';
  const g = front ? DEER.front : DEER.hind;
  const Leff = front ? g.L1 + g.L2 : Math.sqrt(g.L1 ** 2 + g.L2 ** 2 - 2 * g.L1 * g.L2 * Math.cos(DEER.hind.hockAngle));
  let F: P2, H: P2;
  if (s <= 0) {
    // Stance: the pastern rolls so the leg keeps its length; the hoof stays planted.
    H = hoof;
    const f = circles(P, Leff, H, g.p, front ? 1 : 1);
    const f2 = circles(P, Leff, H, g.p, -1);
    let pick = f && f2 ? (f[0] < f2[0] ? f : f2) : f ?? f2;
    if (!pick) {
      // Out of reach (end of the stroke): the heel lifts a little and the leg is straight.
      const d = Math.hypot(H[0] - P[0], H[1] - P[1]);
      const t = (Leff + g.p * 0.6) / d;
      pick = [P[0] + (H[0] - P[0]) * t - 1.5, P[1] + (H[1] - P[1]) * t - 3.5];
    }
    F = pick;
  } else {
    const fold = Math.sin(Math.PI * s);
    const beta = rad(35 + 75 * fold);
    F = [hoof[0] - g.p * Math.sin(beta) * 0.9, hoof[1] - lift * fold - g.p * Math.cos(beta)];
    H = [F[0] + g.p * Math.sin(beta), F[1] + g.p * Math.cos(beta)];
  }
  const J = ik2(P, F, g.L1, g.L2, front);
  if (front) return { P, J, F, H };
  const S = ik2(P, J, 11, 15, true);
  return { P, S, J, F, H };
}

interface DeerPose {
  /** Torso offset (walk bob). */
  body: P2;
  /** Top of the neck where the head sits. */
  neck: P2;
  /** Direction of the face (radians from +x, positive turns the muzzle down). */
  headA: number;
  /** Ear angles (radians, positive = rotated back). */
  earN: number;
  earF: number;
  /** Tail: 0 hanging, 1 raised. */
  tail: number;
  /** Rump patch flared (alarm). */
  flare: number;
  /** Mouth open (nibbling). */
  chew: number;
  legs: { fn: LegJoints; ff: LegJoints; hn: LegJoints; hf: LegJoints };
}

const DEER_W = 128, DEER_H = 104, DEER_OX = 60, DEER_GY = 98;
const SHOULDER: P2 = [13, -40], HIP: P2 = [-18, -41];

function standLegs(body: P2, o: { fn?: number; ff?: number; hn?: number; hf?: number } = {}): DeerPose['legs'] {
  const sp: P2 = [SHOULDER[0] + body[0], SHOULDER[1] + body[1]];
  const hp: P2 = [HIP[0] + body[0], HIP[1] + body[1]];
  return {
    fn: deerLeg('front', sp, [17 + (o.fn ?? 0), 0], 0, 0),
    ff: deerLeg('front', [sp[0] - 2, sp[1]], [12 + (o.ff ?? 0), 0], 0, 0),
    hn: deerLeg('hind', hp, [-16 + (o.hn ?? 0), 0], 0, 0),
    hf: deerLeg('hind', [hp[0] + 2, hp[1]], [-10 + (o.hf ?? 0), 0], 0, 0),
  };
}

const DEER_STAND: DeerPose = {
  body: [0, 0],
  neck: [25, -66],
  headA: rad(32),
  earN: 0,
  earF: 0,
  tail: 0,
  flare: 0,
  chew: 0,
  legs: standLegs([0, 0]),
};

// Spots in torso space (summer coat): two rows beside the spine, looser ones down the flank.
// Each is [x, y, r^2]; most are single pixels, a few are 2 px.
const DEER_SPOTS: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  const top = (x: number): number => -48.2 + 0.0035 * (x + 4) ** 2;
  const j = (i: number, k: number): number => hash(i, k, 41) - 0.5;
  let i = 0;
  for (let x = -21; x <= 6; x += 3.6, i++) out.push([x + j(i, 1), top(x) + 3.0 + j(i, 2) * 0.8, i % 3 === 1 ? 0.75 : 0.32]);
  for (let x = -19.5; x <= 2; x += 4.1, i++) out.push([x + j(i, 1) * 1.4, top(x) + 6.6 + j(i, 2), i % 2 ? 0.7 : 0.32]);
  for (let x = -17; x <= -1; x += 4.6, i++) out.push([x + j(i, 1) * 2, top(x) + 10.2 + j(i, 2) * 1.6, 0.32]);
  out.push([-12.5, top(-12.5) + 13.6, 0.32], [-6.5, top(-6) + 14.4, 0.32]);
  return out;
})();

function deerFrame(pose: DeerPose): Canvas {
  const ox = DEER_OX, gy = DEER_GY;
  const b = new Buf(DEER_W, DEER_H);
  const [bx, by] = pose.body;
  const at = (p: P2, z = 0): P3 => [ox + p[0], gy + p[1], z];
  const atB = (p: P2, z = 0): P3 => [ox + p[0] + bx, gy + p[1] + by, z];
  const org: P2 = [ox + bx, gy + by];
  const coat = P.sika;
  const cuts = [0.22, 0.44, 0.78, 0.93];
  const base = { pal: coat, origin: org, jitter: 0.06, cell: 3, cuts };

  // --- legs ---------------------------------------------------------------------------------
  // Upper leg (shoulder and arm, or thigh) is muscle inside the body outline; the lower leg is a
  // part of its own. Near legs merge their upper part into the torso; far legs are one part.
  const legUpper = (L: LegJoints, kind: 'front' | 'hind', z: number): Prim[] => {
    if (kind === 'front') {
      const E = lerp2(L.P, L.J, 0.5);
      return [cone(at(L.P, z - 1), at(E, z), 5.2, 3.6)];
    }
    return [cone(at(L.P, z - 1), at(L.S!, z), 7.0, 4.8)];
  };
  const legLower = (L: LegJoints, kind: 'front' | 'hind', z: number): Prim[] => {
    const parts: Prim[] = [];
    if (kind === 'front') {
      const E = lerp2(L.P, L.J, 0.5);
      parts.push(cone(at(E, z), at(L.J, z), 3.4, 2.0));
    } else {
      parts.push(cone(at(L.S!, z), at(L.J, z), 4.2, 2.0));
    }
    parts.push(ell(at(L.J, z + 0.2), [2.0, 2.2, 2.0]));
    parts.push(cone(at(L.J, z), at(L.F, z), 1.65, 1.45));
    parts.push(ell(at(L.F, z + 0.1), [1.75, 1.75, 1.7]));
    parts.push(cone(at(L.F, z), at(L.H, z), 1.45, 1.25));
    return parts;
  };
  const drawLeg = (L: LegJoints, kind: 'front' | 'hind', z: number, far: number): void => {
    const parts = far ? [...legUpper(L, kind, z), ...legLower(L, kind, z)] : legLower(L, kind, z);
    const leg = uni(1.4, ...parts);
    solid(b, leg, {
      ...base,
      far,
      origin: [ox + L.H[0], gy],
      line: far ? 0 : 1,
      lineSide: 'shadow',
      paint: (h) => {
        // Hoof: the end of the pastern, dark keratin.
        const vx = h.x + 0.5 - (ox + L.F[0]), vy = h.y + 0.5 - (gy + L.F[1]);
        const ex = L.H[0] - L.F[0], ey = L.H[1] - L.F[1];
        const t = (vx * ex + vy * ey) / (ex * ex + ey * ey);
        const dh = Math.hypot(h.x + 0.5 - (ox + L.H[0]), h.y + 0.5 - (gy + L.H[1]));
        if (t > 0.55 && dh < 3.2) return [P.dark, clamp(h.step + 1 - far, 2, 4)];
        // Lower leg a little paler and grayer.
        if (h.y + 0.5 > gy + L.J[1] + 1) return [P.fur, clamp(h.step, 1, 4)];
        return null;
      },
    });
  };
  drawLeg(pose.legs.hf, 'hind', -5.5, 1);
  drawLeg(pose.legs.ff, 'front', -5.5, 1);

  // --- far ear and tail ---------------------------------------------------------------------
  const nk = pose.neck;
  const ha = pose.headA;
  const hdir: P2 = [Math.cos(ha), Math.sin(ha)];
  const hperp: P2 = [-Math.sin(ha), Math.cos(ha)]; // down-side of the face
  const H0: P2 = [nk[0] + hdir[0] * 2.6 - hperp[0] * 0.6, nk[1] + hdir[1] * 2.6 - hperp[1] * 0.6]; // cranium center
  const hp = (u: number, v: number): P2 => [H0[0] + hdir[0] * u + hperp[0] * v, H0[1] + hdir[1] * u + hperp[1] * v];
  const earBase = hp(-3.0, -3.6);
  const earDir = (back: number): P2 => {
    const a = ha - rad(166) - back;
    return [Math.cos(a), Math.sin(a)];
  };
  {
    const d = earDir(pose.earF + rad(-30));
    const e0 = [earBase[0] + 1.2, earBase[1] - 0.4] as P2;
    solid(b, leaf(at(e0, -2.6), at([e0[0] + d[0] * 11.5, e0[1] + d[1] * 11.5], -2.6), 2.3, 1.2), { ...base, far: 1, line: 0 });
  }
  // Tail: hangs over the rump patch, or lifts and fans out the white.
  const tailBase: P2 = [-26.5, -45.5];
  const tailTip: P2 = lerp2([-28.2, -37.5], [-33.5, -47], pose.tail);
  solid(b, cone(atB(tailBase, 0.5), atB(tailTip, 0.5), 2.2, 1.6), {
    ...base,
    pal: P.white,
    minStep: 2,
    maxStep: 4,
    line: 0,
    paint: (h) => {
      // Dark stripe down the upper side of the tail.
      const vx = h.x + 0.5 - (org[0] + tailBase[0]), vy = h.y + 0.5 - (org[1] + tailBase[1]);
      const ex = tailTip[0] - tailBase[0], ey = tailTip[1] - tailBase[1];
      const el = Math.hypot(ex, ey);
      const across = (vx * ey - vy * ex) / el;
      return across < -1.1 ? [P.dark, 3] : null;
    },
  });

  // --- torso and neck -----------------------------------------------------------------------
  const neckBase: P2 = [13 + bx, -45 + by];
  const torso = uni(
    6,
    ell(atB([12, -37.5], 0), [11.5, 11.5, 9]),
    ell(atB([-2, -38], 0), [17, 9.6, 10]),
    ell(atB([-17, -38.5], 0), [10.5, 9.8, 8.6]),
    ell(atB([7, -45], 0), [9, 4.5, 6.5], -0.1),
  );
  const neck = cone(at(neckBase, 0), at(nk, 0.4), 7.2, 4.0);
  const body = uni(5, torso, neck, ...legUpper(pose.legs.hn, 'hind', 5.5), ...legUpper(pose.legs.fn, 'front', 5.5));
  const spotPal = P.spot;
  solid(b, body, {
    ...base,
    line: 1,
    paint: (h) => {
      const lx = h.x + 0.5 - org[0], ly = h.y + 0.5 - org[1];
      // Rump patch: white, framed by a dark crescent along its front.
      const patchX = -23.2 + 2.6 * pose.flare + 0.05 * (ly + 40) ** 2 * 0.12;
      if (lx < patchX && ly > -48 && ly < -31) {
        if (lx > patchX - 1.2 && ly < -34) return [P.dark, clamp(h.step + 1, 2, 3)];
        return [P.white, clamp(h.step, 2, 4)];
      }
      // Pale belly and inner thigh.
      if (h.ny > 0.78 && ly > -32) return [P.pale, clamp(h.step, 1, 3)];
      // Spots follow the coat's light.
      for (const [sx, sy, sr] of DEER_SPOTS) {
        const dx = lx - sx, dy = ly - sy;
        if (dx * dx + dy * dy < sr) return [spotPal, clamp(h.step, 2, 4)];
      }
      // Throat a little paler.
      return null;
    },
  });

  // --- near legs ----------------------------------------------------------------------------
  drawLeg(pose.legs.hn, 'hind', 5.5, 0);
  drawLeg(pose.legs.fn, 'front', 5.5, 0);

  // --- head ---------------------------------------------------------------------------------
  const cran = ell(at(H0, 0.6), [5.0, 4.6, 4.2], ha);
  const muzzle = cone(at(hp(2.5, 0.6), 0.6), at(hp(9.8, 1.6), 0.6), 3.3, 1.9);
  const jaw = ell(at(hp(3.6, 2.8 + pose.chew * 0.8), 0.6), [4.2, 1.6, 2.6], ha + 0.12);
  const head = uni(2.2, cran, muzzle, jaw);
  const nose = hp(10.6, 1.4);
  solid(b, head, {
    ...base,
    line: 1,
    lineSide: 'shadow',
    paint: (h) => {
      const px = h.x + 0.5 - (ox + H0[0]), py = h.y + 0.5 - (gy + H0[1]);
      const u = px * hdir[0] + py * hdir[1], v = px * hperp[0] + py * hperp[1];
      if (u > 9.0) return [P.dark, clamp(h.step, 2, 4)]; // nose leather
      if (v > 2.9 && u > 1) return [P.pale, clamp(h.step, 2, 3)]; // chin and jaw underside
      return null;
    },
  });
  // Near ear: a big leaf with a pale inside.
  {
    const d = earDir(pose.earN);
    const e0: P2 = [earBase[0] - 0.4, earBase[1] + 0.4];
    const e1: P2 = [e0[0] + d[0] * 12, e0[1] + d[1] * 12];
    const A = at(e0, 2.4), B = at(e1, 2.4);
    solid(b, leaf(A, B, 2.5, 1.3), {
      ...base,
      line: 1,
      paint: (h) => {
        const vx = h.x + 0.5 - A[0], vy = h.y + 0.5 - A[1];
        const ex = B[0] - A[0], ey = B[1] - A[1], el = Math.hypot(ex, ey);
        const t = (vx * ex + vy * ey) / (el * el);
        const across = (vx * ey - vy * ex) / el;
        if (t > 0.88) return [P.dark, 3];
        if (t > 0.18 && t < 0.8 && across > -0.6 && across < 1.2) return [P.pale, clamp(h.step - 1, 1, 3)];
        return null;
      },
    });
  }
  // Eye: dark almond with a catchlight, pale ring, dark gland line toward the muzzle.
  {
    const e = hp(1.6, -0.9);
    const ex = Math.floor(ox + e[0]), ey = Math.floor(gy + e[1]);
    b.dot(ex - 1, ey - 1, P.pale, 3);
    b.dot(ex, ey - 1, P.pale, 3);
    b.dot(ex - 1, ey, P.dark, 2);
    b.dot(ex, ey, P.white, 4);
    b.dot(ex + 1, ey, P.dark, 2);
    b.dot(ex - 1, ey + 1, P.dark, 2);
    b.dot(ex, ey + 1, P.dark, 2);
    b.dot(ex + 1, ey + 1, P.dark, 3);
    const g = hp(4.2, 0.9);
    b.dot(ox + g[0], gy + g[1], P.dark, 3);
    const n = nose;
    b.dot(ox + n[0] - 0.6, gy + n[1] - 0.4, P.dark, 1);
  }
  return finish(b);
}

/** Walk cycle: lateral sequence (LH, LF, RH, RF a quarter apart), 62% stance. */
function deerWalk(frames: number): DeerPose[] {
  const out: DeerPose[] = [];
  const sweep = 9.5, duty = 0.62;
  const foot = (phase: number, neutral: number, lift: number): { x: number; s: number; lift: number } => {
    const t = ((phase % 1) + 1) % 1;
    if (t < duty) return { x: neutral + sweep - (2 * sweep * t) / duty, s: 0, lift };
    const u = (t - duty) / (1 - duty);
    const e = u * u * (3 - 2 * u);
    return { x: neutral - sweep + 2 * sweep * e, s: u, lift };
  };
  for (let i = 0; i < frames; i++) {
    const t = i / frames;
    const bob = Math.round(Math.cos(t * 4 * Math.PI + 0.6) * 0.6 * 2) / 2;
    const body: P2 = [0, -Math.max(0, bob)];
    const sp: P2 = [SHOULDER[0] + body[0], SHOULDER[1] + body[1]];
    const hp: P2 = [HIP[0] + body[0], HIP[1] + body[1]];
    const hn = foot(t, -15, 5), fn = foot(t - 0.25, 17, 6), hf = foot(t - 0.5, -16, 5), ff = foot(t - 0.75, 18, 6);
    const nod = Math.sin(t * 4 * Math.PI - 0.4) * 1.1;
    out.push({
      ...DEER_STAND,
      body,
      neck: [DEER_STAND.neck[0] + 0.5, DEER_STAND.neck[1] + 2.5 + nod],
      headA: rad(36),
      legs: {
        hn: deerLeg('hind', hp, [hn.x, 0], hn.s, hn.lift),
        fn: deerLeg('front', sp, [fn.x, 0], fn.s, fn.lift),
        hf: deerLeg('hind', [hp[0] + 1, hp[1]], [hf.x, 0], hf.s, hf.lift),
        ff: deerLeg('front', [sp[0] - 1, sp[1]], [ff.x, 0], ff.s, ff.lift),
      },
    });
  }
  return out;
}

function deer(): WorldSprite {
  const S = DEER_STAND;
  const earFlick: DeerPose = { ...S, earN: rad(38) };
  const earHalf: DeerPose = { ...S, earN: rad(18) };
  const tailUp: DeerPose = { ...S, tail: 0.8 };
  const tailHalf: DeerPose = { ...S, tail: 0.4 };
  const idle = [S, S, earFlick, earHalf, S, tailUp, tailHalf, S].map(deerFrame);

  // Graze: neck down to the grass in front of the forelegs, one foreleg forward.
  const gLegs = standLegs([0, 0], { fn: 3, ff: -1 });
  const G: DeerPose = { ...S, neck: [33, -20], headA: rad(100), earN: rad(-10), earF: rad(-10), legs: gLegs };
  const Gbite: DeerPose = { ...G, neck: [33, -19], chew: 1 };
  const Gear: DeerPose = { ...G, earN: rad(25) };
  const Gtail: DeerPose = { ...G, tail: 0.5 };
  const graze = [G, Gbite, G, Gbite, Gear, Gtail].map(deerFrame);

  const walk = deerWalk(8).map(deerFrame);

  // Alert: head high, ears forward, tail up and the white rump flared.
  const alert = [deerFrame({ ...S, neck: [22, -73], headA: rad(22), earN: rad(-14), earF: rad(-14), tail: 1, flare: 1 })];
  return assemble('deer', 'Sika Deer', [1.4, 1.5], ['animal', 'ambient'], { idle: { frames: idle, fps: 5 }, graze: { frames: graze, fps: 5 }, walk: { frames: walk, fps: 8 }, alert: { frames: alert, fps: 0 } }, DEER_OX + 1, DEER_GY);
}

// =============================================================================================
// BIRDS (crow, sparrow)
// =============================================================================================
//
// One rig for both: an egg-shaped body, a round head, a beak in two mandibles (so it can open),
// a folded wing over the flank and a tail of stacked feathers. In flight the wings are flat
// planforms (arm and fingered hand) rotated about the body axis and projected through the
// battle camera, so a flap shows the far wing over the back and the near wing sweeping below.

interface BirdPose {
  body: { c: P2; r: P3; a: number };
  head: { c: P2; r: P2 };
  /** Beak base, direction (radians), length, base radius, opening (radians). */
  beak: { base: P2; a: number; len: number; r: number; open: number };
  tail: { base: P2; tip: P2; w: number };
  /** Folded wing (perched); omitted in flight. */
  wing?: { base: P2; tip: P2; w: number };
  /** Legs: hip and foot (perched); omitted in flight. */
  legs?: { hip: P2; foot: P2; toe: number };
  eye: P2;
  /** Eye closed. */
  blink?: boolean;
}

interface BirdStyle {
  W: number;
  H: number;
  ox: number;
  gy: number;
  body: number;
  wing: number;
  beak: number;
  leg: number;
  cuts: number[];
  /** Extra per-part paint (pattern: cheeks, bib, streaks). */
  paintBody?: (lx: number, ly: number, h: Hit) => [number, number] | number | null;
  paintHead?: (lx: number, ly: number, h: Hit) => [number, number] | number | null;
  paintWing?: (t: number, across: number, h: Hit) => [number, number] | number | null;
  paintTail?: (t: number, across: number, h: Hit) => [number, number] | number | null;
  /** Feather fingers on the flight wing, how much the hand narrows (chords) and a light offset. */
  fingers: number;
  wingTaper: number;
  wingBias?: number;
  tailFeathers?: number;
  tailBias?: number;
  /** Inner line the beak leaves on the face (null for tiny birds, where it would smear the face). */
  beakLine?: number | null;
  /** Draw the far leg (hidden on tiny birds). */
  farLeg?: boolean;
  eyeDots: (b: Buf, x: number, y: number, blink: boolean) => void;
  /** Glossy rim light color step on the crest (crow sheen). */
  sheen?: boolean;
  jitter: number;
}

/** Flattens a shape along z (a feather tail, a folded wing). */
function flatZ(p: Prim, kz: number, zc: number): Prim {
  return { sd: (x, y, z) => p.sd(x, y, zc + (z - zc) / kz) * kz, box: [p.box[0], p.box[1], zc - (zc - p.box[2]) * kz, p.box[3], p.box[4], zc + (p.box[5] - zc) * kz] };
}

/** Position along a segment (0..1) and signed distance across it (+ = below/right of a->b). */
function along(x: number, y: number, a: P2, b: P2): [number, number] {
  const ex = b[0] - a[0], ey = b[1] - a[1], el = Math.hypot(ex, ey) || 1;
  const vx = x - a[0], vy = y - a[1];
  return [(vx * ex + vy * ey) / (el * el), (vx * -ey + vy * ex) / -el];
}

interface WingFrame {
  /** Arm and hand angles above horizontal (radians). */
  arm: number;
  hand: number;
  /** Span multiplier (the wing folds a little on the upstroke) and sweep back of the tip (px). */
  span: number;
  sweep: number;
}

/** Camera elevation used for the flight wings (a lower angle than the ground plane reads better). */
const WING_ELEV = rad(33);
/** The flying bird turns its head this much toward the viewer, so the wings separate: far one ahead, near one behind. */
const WING_YAW = rad(18);

/** Screen x offset per px of span for a wing raised `th`. */
function wingDx(th: number, near: boolean): number {
  return (near ? -1 : 1) * Math.sin(WING_YAW) * Math.cos(th);
}

/** Screen offset of a point `d` px out along a wing raised `th` (near side = toward the viewer). */
function wingDir(th: number, near: boolean): number {
  return -Math.sin(th) * Math.cos(WING_ELEV) + (near ? 1 : -1) * Math.cos(th) * Math.sin(WING_ELEV);
}

/** Light on a flat wing panel raised `th`, seen from the camera, and whether we see its underside. */
function wingLight(th: number, near: boolean): { light: number; under: boolean } {
  const sgn = near ? 1 : -1;
  // World (Y up, Z toward the viewer): the panel's top normal.
  const nY = Math.cos(th), nZ = -sgn * Math.sin(th);
  // To screen space (y down, z toward the viewer) through the tilted camera.
  let sy = -nY * Math.cos(WING_ELEV) + nZ * Math.sin(WING_ELEV);
  let sz = nY * Math.sin(WING_ELEV) + nZ * Math.cos(WING_ELEV);
  const under = sz < 0;
  if (under) {
    sy = -sy;
    sz = -sz;
  }
  return { light: wrapLight(0, sy, sz, 0.45), under };
}

/**
 * A flight wing, rasterized from its planform: span s (0 shoulder .. 1 tip) by chord c (+ toward
 * the leading edge, in chords). The arm (s < 0.45) and hand rotate separately; the span projects
 * through the camera onto screen y, the chord runs along screen x with the tip swept back. Each
 * pixel center is mapped back to (s, c), so the feathers land on whole pixels:
 *  - top side: a lit sheen rim on the leading edge, a lighter covert band, darker flight feathers
 *    with seams between the secondaries;
 *  - underside: one or two steps darker, a faint rim;
 *  - the hand splits into `fingers` tapered primaries that fan apart toward their tips.
 */
function drawWing(b: Buf, st: BirdStyle, root: P2, len: number, chord: number, wf: WingFrame, near: boolean, layer?: number): void {
  const sw = 0.45;
  let kA = wingDir(wf.arm, near) * len * wf.span, kH = wingDir(wf.hand, near) * len * wf.span;
  // Edge-on panels keep a sliver of thickness.
  if (Math.abs(kA * sw) < 1.6) kA = (kA >= 0 ? 1.6 : -1.6) / sw;
  if (Math.abs(kH * (1 - sw)) < 1.6) kH = (kH >= 0 ? 1.6 : -1.6) / (1 - sw);
  const A = wingLight(wf.arm, near), Hh = wingLight(wf.hand, near);
  const far = near ? 0 : 1;
  const part = b.newPart({ line: 0, layer });
  const n = st.fingers;
  const le = (s: number): number => (s < 0.84 ? 0.3 + 0.06 * Math.sin((Math.PI * s) / 0.84) : 0.3 - 0.3 * ((s - 0.84) / 0.16) ** 2);
  const te = (s: number): number => (s < 0.5 ? -0.72 : -0.72 + st.wingTaper * ((s - 0.5) / 0.5) ** 1.2);
  const xA = wingDx(wf.arm, near) * len * wf.span, xH = wingDx(wf.hand, near) * len * wf.span;
  // Sweep is given for a crow-sized wing (31 px) and scales with the wing.
  const swp = (wf.sweep * len) / 31;
  const sweep = (s: number): number => ((swp * Math.max(0, s - sw)) / (1 - sw)) * 1.4 - (s < sw ? xA * s : xA * sw + xH * (s - sw));
  const yW = root[1] + kA * sw;
  const ys = [root[1], yW, yW + kH * (1 - sw)];
  const y0 = Math.floor(Math.min(...ys)) - 1, y1 = Math.ceil(Math.max(...ys)) + 1;
  const x0 = Math.floor(root[0] - chord * 1.2 - swp * 1.5 - Math.abs(xA) - Math.abs(xH)) - 1, x1 = Math.ceil(root[0] + chord * 0.6 + Math.abs(xA) + Math.abs(xH)) + 1;
  const fingerStart = 0.58;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const py = y + 0.5, px = x + 0.5;
      // Hand first (the outer, overlapping panel), then arm.
      let s = -1, hand = false;
      const sh = sw + (py - yW) / kH;
      if (sh >= sw && sh <= 1) {
        s = sh;
        hand = true;
      } else {
        const sa = (py - root[1]) / kA;
        if (sa >= 0 && sa < sw) s = sa;
      }
      if (s < 0) continue;
      const c = (px - root[0] + sweep(s)) / chord;
      const c0 = te(s), c1 = le(s);
      if (c < c0 || c > c1) continue;
      const u = (c - c0) / Math.max(1e-3, c1 - c0); // 0 trailing .. 1 leading
      const side = hand ? Hh : A;
      // Primaries: `n` feathers side by side, each narrowing toward its own tip so they fan apart.
      let seam = false;
      if (hand && n > 1 && s > fingerStart) {
        const fi = Math.min(n - 1, Math.floor(u * n));
        const fr = u * n - fi;
        const tipS = 1 - 0.08 * (n - 1 - fi);
        if (s > tipS) continue;
        const k = (s - fingerStart) / (tipS - fingerStart);
        const wFrac = 1 - 0.62 * k * k; // the feather's share of its slot
        if (fr > wFrac) continue;
        seam = fr > wFrac - 0.22 && fi < n - 1;
      } else if (hand && n > 1) {
        const fr = (u * n) % 1;
        seam = fr > 0.8 && u < (n - 1) / n;
      }
      let step: number;
      if (!side.under) {
        step = quant(side.light + (st.wingBias ?? 0), x - root[0], y - root[1], st.cuts, st.jitter, 3, 5);
        if (u > 0.86 && s < 0.9) step = Math.max(step, 4); // sheen along the leading edge
        else if (u > 0.5 && s < fingerStart) step = Math.min(4, step + 1); // coverts
        else step = Math.min(step, 3); // flight feathers
        if (!hand && Math.abs(u - 0.5) < 0.07) step = Math.max(1, step - 1); // covert seam
        if (!hand && u < 0.5 && Math.abs(((s * len * 0.5) % 2.4) - 1.2) < 0.3) step = Math.max(1, step - 1); // secondary seams
      } else {
        step = u > 0.86 && s < 0.9 ? 3 : quant(side.light - 0.15, x - root[0], y - root[1], st.cuts, st.jitter, 3, 5) >= 3 ? 2 : 1;
        if (!hand && u < 0.5 && Math.abs(((s * len * 0.5) % 2.4) - 1.2) < 0.3) step = 1;
      }
      if (seam) step = Math.max(1, step - 1);
      // Far wing one shade darker, but its sheen rim still catches the light.
      b.put(x, y, st.wing, clamp(step >= 4 ? step : step - far, 1, 5), part);
    }
}

interface BirdFlight {
  wf: WingFrame;
  /** Shoulder on screen (relative to the origin), wing length and chord (px). */
  root: P2;
  len: number;
  chord: number;
}

function birdFrame(st: BirdStyle, pose: BirdPose, fl?: BirdFlight): Canvas {
  const { ox, gy } = st;
  const b = new Buf(st.W, st.H);
  const at = (p: P2, z = 0): P3 => [ox + p[0], gy + p[1], z];
  const org: P2 = [ox + pose.body.c[0], gy + pose.body.c[1]];
  const base = { pal: st.body, origin: org, jitter: st.jitter, cuts: st.cuts };
  const rootS: P2 | null = fl ? [ox + fl.root[0], gy + fl.root[1]] : null;

  // Far wing (flight), behind everything.
  if (fl && rootS) drawWing(b, st, [rootS[0] - 1, rootS[1] - 1], fl.len, fl.chord, fl.wf, false);
  // Legs and toes (thin, dark scaled skin).
  if (pose.legs) {
    const { hip, foot, toe } = pose.legs;
    const legPart = b.newPart({ line: null });
    const put = (x: number, y: number, s: number): void => {
      b.put(x, y, st.leg, s, legPart);
    };
    const line = (a: P2, c: P2, s: number): void => {
      const n = Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) * 2) + 1;
      for (let i = 0; i <= n; i++) put(ox + lerp(a[0], c[0], i / n), gy + lerp(a[1], c[1], i / n), s);
    };
    // Far leg two pixels back, darker.
    if (st.farLeg !== false) {
      line([hip[0] - 2.2, hip[1]], [foot[0] - 2.4, foot[1]], 2);
      line([foot[0] - 2.4, foot[1]], [foot[0] - 2.4 + toe * 0.8, foot[1] + 0.4], 2);
    }
    line(hip, foot, 3);
    line(foot, [foot[0] + toe, foot[1] + 0.5], 3);
    line(foot, [foot[0] - toe * 0.45, foot[1] + 0.5], 2);
  }
  // Tail: a flat fan of feathers behind the body, lit along its upper edge, seams converging on
  // the base.
  {
    const { base: tb, tip: tt, w } = pose.tail;
    const A: P2 = [ox + tb[0], gy + tb[1]], B: P2 = [ox + tt[0], gy + tt[1]];
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L;
    const nx = -uy, ny = ux; // across (screen-down side when the tail points left)
    const pt = (t: number, a: number): P2 => [A[0] + ux * L * t + nx * a, A[1] + uy * L * t + ny * a];
    const poly: P2[] = [pt(0, -w * 0.55), pt(0.86, -w), pt(0.97, -w * 0.62), pt(1, 0), pt(0.97, w * 0.62), pt(0.86, w), pt(0, w * 0.55)];
    const feathers = st.tailFeathers ?? 4;
    flat(b, poly, {
      pal: st.wing,
      line: 0,
      step: (x, y) => {
        const vx = x + 0.5 - A[0], vy = y + 0.5 - A[1];
        const t = (vx * ux + vy * uy) / L, a = vx * nx + vy * ny;
        const half = w * (0.55 + 0.45 * Math.min(1, t / 0.86));
        const v = clamp(a / half, -1, 1); // -1 .. 1 across the fan
        // Which edge faces up: the one with the smaller screen y.
        const upSide = ny > 0 ? -1 : 1;
        const lit = 0.5 + 0.28 * v * upSide;
        let stp = quant(lit + (st.tailBias ?? 0), x - A[0], y - A[1], st.cuts, st.jitter, 3, 5);
        const f = ((v + 1) / 2) * feathers;
        if (t > 0.25 && Math.abs(f - Math.round(f)) < 0.16 && Math.round(f) > 0 && Math.round(f) < feathers) stp = Math.max(1, stp - 1);
        const r = st.paintTail ? st.paintTail(t, v, { x, y, z: 0, nx: 0, ny: 0, nz: 1, light: lit, step: stp }) : null;
        if (Array.isArray(r)) return r;
        return r ?? stp;
      },
    });
  }
  // Body and head, one smooth form.
  const hc = at(pose.head.c, 0.3);
  const body = uni(2.6, ell(at(pose.body.c, 0), pose.body.r, pose.body.a), ell(hc, [pose.head.r[0], pose.head.r[1], Math.min(pose.head.r[0], pose.head.r[1]) * 0.95]));
  solid(b, body, {
    ...base,
    line: 1,
    paint: (h) => {
      const dxh = h.x + 0.5 - hc[0], dyh = h.y + 0.5 - hc[1];
      const inHead = dxh * dxh + dyh * dyh < (pose.head.r[0] + 0.6) ** 2 && h.y + 0.5 < hc[1] + pose.head.r[1] * 0.9;
      if (inHead && st.paintHead) {
        const r = st.paintHead(dxh, dyh, h);
        if (r !== null) return r;
      }
      return st.paintBody ? st.paintBody(h.x + 0.5 - org[0], h.y + 0.5 - org[1], h) : null;
    },
  });
  // Folded wing over the flank.
  if (pose.wing) {
    const { base: wb, tip: wt, w } = pose.wing;
    const A = at(wb, 2.6), B = at(wt, 2.6);
    solid(b, flatZ(leaf(A, B, w, w * 0.7), 0.6, 2.6), {
      ...base,
      pal: st.wing,
      line: 1,
      lineSide: 'shadow',
      paint: (h) => {
        const [t, ac] = along(h.x + 0.5, h.y + 0.5, [A[0], A[1]], [B[0], B[1]]);
        return st.paintWing ? st.paintWing(t, ac, h) : null;
      },
    });
  }
  // Beak: upper and lower mandibles from the base, opening by `open`.
  {
    const { base: bb, a, len, r, open } = pose.beak;
    const up = a - open * 0.35, lo = a + open * 0.85;
    const U0 = at([bb[0], bb[1] - r * 0.35], 0.6), U1 = at([bb[0] + Math.cos(up) * len, bb[1] - r * 0.35 + Math.sin(up) * len], 0.6);
    const L0 = at([bb[0] - 0.2, bb[1] + r * 0.45], 0.6), L1 = at([bb[0] - 0.2 + Math.cos(lo) * len * 0.88, bb[1] + r * 0.45 + Math.sin(lo) * len * 0.88], 0.6);
    const beakOpts = { ...base, pal: st.beak, cuts: [0.2, 0.42, 0.7, 0.86], line: st.beakLine === undefined ? 0 : st.beakLine, noLine: [] as number[] };
    if (open > 0.05) {
      solid(b, cone(L0, L1, r * 0.75, 0.3), beakOpts);
      // Open mouth: a dark wedge between the mandibles.
      solid(b, cone(at([bb[0] + 0.3, bb[1] + 0.2], 0.4), at([bb[0] + Math.cos(a + open * 0.3) * len * 0.55, bb[1] + 0.2 + Math.sin(a + open * 0.3) * len * 0.55], 0.4), r * 0.55, 0.3), { ...beakOpts, pal: st.leg, maxStep: 1, line: null });
      solid(b, cone(U0, U1, r, 0.3), beakOpts);
    } else {
      solid(b, uni(0.6, cone(U0, U1, r, 0.3), cone(L0, L1, r * 0.75, 0.3)), { ...beakOpts, paint: (h) => {
        // Mouth line between the mandibles.
        const [t, ac] = along(h.x + 0.5, h.y + 0.5, [U0[0], U0[1]], [U1[0], U1[1]]);
        return t > 0.05 && t < 0.75 && ac > r * 0.25 && ac < r * 0.25 + 1.0 ? 1 : null;
      } });
    }
  }
  // Eye.
  st.eyeDots(b, Math.floor(ox + pose.eye[0]), Math.floor(gy + pose.eye[1]), pose.blink ?? false);
  // Near wing (flight), in front.
  if (fl && rootS) drawWing(b, st, rootS, fl.len, fl.chord, fl.wf, true);
  return finish(b);
}

/** Flap cycle: arm angle, the hand lagging behind, folding and sweeping back on the upstroke. */
function flap(t: number, top = 56, bottom = -42): WingFrame {
  const mid = (top + bottom) / 2, amp = (top - bottom) / 2;
  const arm = rad(mid + amp * Math.cos(2 * Math.PI * t));
  const hand = rad(mid + (amp + 6) * Math.cos(2 * Math.PI * (t - 0.05)));
  const up = Math.max(0, -Math.sin(2 * Math.PI * t));
  return { arm, hand, span: 1 - 0.24 * up, sweep: 8 * up };
}

// --- crow ------------------------------------------------------------------------------------

const CROW_STYLE: BirdStyle = {
  W: 76,
  H: 84,
  ox: 36,
  gy: 72,
  body: P.crow,
  wing: P.crow,
  beak: P.beak,
  leg: P.beak,
  cuts: [0.26, 0.5, 0.84, 0.95],
  jitter: 0.05,
  fingers: 4,
  wingTaper: 0.3,
  wingBias: -0.04,
  eyeDots: (b, x, y, blink) => {
    if (blink) {
      b.dot(x, y + 1, P.crow, 1);
      b.dot(x + 1, y + 1, P.crow, 1);
      return;
    }
    b.dot(x, y, P.beak, 1);
    b.dot(x + 1, y, P.beak, 1);
    b.dot(x, y + 1, P.beak, 1);
    b.dot(x + 1, y + 1, P.beak, 2);
    b.dot(x, y, P.white, 4);
  },
  paintWing: (t, ac, h) => {
    // Primaries: dark seams between the long feathers near the tip; coverts edge.
    if (t > 0.5 && Math.abs(((ac * 1.4 + t * 3) % 1.6) - 0.8) < 0.18) return Math.max(1, h.step - 1);
    if (t < 0.45 && Math.abs(ac + 0.6) < 0.4) return Math.max(1, h.step - 1);
    return null;
  },
};

const CROW_PERCH: BirdPose = {
  body: { c: [-1, -10.6], r: [7.2, 5.2, 5.0], a: -0.32 },
  head: { c: [6.0, -16.6], r: [3.8, 3.4] },
  beak: { base: [8.6, -16.6], a: 0.2, len: 5.8, r: 1.55, open: 0 },
  tail: { base: [-6, -8.4], tip: [-15.2, -2.6], w: 1.9 },
  wing: { base: [3.6, -13.2], tip: [-12, -5.4], w: 3.4 },
  legs: { hip: [0.4, -5.6], foot: [0.8, -0.9], toe: 3.2 },
  eye: [6.8, -17.4],
};

function crow(): WorldSprite {
  const S = CROW_PERCH;
  const fr = (p: BirdPose): Canvas => birdFrame(CROW_STYLE, p);
  const tiltUp: BirdPose = { ...S, head: { c: [6.2, -16.8], r: [3.8, 3.4] }, beak: { ...S.beak, base: [8.8, -17.4], a: -0.2 }, eye: [6.8, -18.0] };
  const tiltDown: BirdPose = { ...S, head: { c: [6.4, -16.0], r: [3.8, 3.4] }, beak: { ...S.beak, base: [8.8, -15.6], a: 0.55 }, eye: [7.0, -16.9] };
  const lean: BirdPose = {
    ...S,
    body: { ...S.body, c: [-0.6, -10.2], a: -0.26 },
    head: { c: [7.0, -15.6], r: [3.8, 3.4] },
    beak: { ...S.beak, base: [9.6, -15.6], a: 0.1 },
    tail: { ...S.tail, tip: [-15.4, -5.0] },
    wing: { w: 3.4, base: [4.2, -12.8], tip: [-11.6, -6.4] },
    eye: [7.8, -16.6],
  };
  const caw: BirdPose = {
    ...lean,
    head: { c: [7.6, -15.4], r: [3.8, 3.5] },
    beak: { ...S.beak, base: [10.2, -15.6], a: -0.05, open: 0.6 },
    tail: { ...S.tail, tip: [-15.0, -6.8] },
    eye: [8.4, -16.4],
  };
  const perch = [S, S, tiltUp, tiltUp, S, tiltDown, S, lean, caw, caw, lean, S].map(fr);

  const fly: Canvas[] = [];
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const wf = flap(t);
    const bob = Math.round(Math.sin(2 * Math.PI * t) * 0.9);
    const P0: BirdPose = {
      body: { c: [0, -12 + bob], r: [7.6, 4.3, 4.6], a: -0.06 },
      head: { c: [8.6, -13.8 + bob], r: [3.6, 3.2] },
      beak: { base: [11.2, -13.8 + bob], a: 0.12, len: 5.6, r: 1.5, open: 0 },
      tail: { base: [-5, -11.8 + bob], tip: [-16.5, -11.2 + bob], w: 3.0 },
      eye: [9.4, -14.8 + bob],
    };
    fly.push(birdFrame(CROW_STYLE, P0, { wf, root: [1.5, -13.5 + bob], len: 31, chord: 11 }));
  }
  return assemble('crow', 'Crow', [0.45, 0.35], ['animal', 'ambient'], { perch: { frames: perch, fps: 6 }, fly: { frames: fly, fps: 10 } }, CROW_STYLE.ox + 1, CROW_STYLE.gy);
}

// =============================================================================================
// SPARROW
// =============================================================================================
//
// Eurasian tree sparrow at 1.6x so the face reads: chestnut cap, white cheek with the black spot,
// black bib, streaked brown back, white wing bar, pale gray-buff breast.

const SPARROW_STYLE: BirdStyle = {
  W: 44,
  H: 44,
  ox: 22,
  gy: 32,
  body: P.sparrow,
  wing: P.sparrow,
  beak: P.beak,
  leg: P.legPink,
  cuts: [0.2, 0.42, 0.8, 0.94],
  jitter: 0.04,
  fingers: 1,
  wingTaper: 0.3,
  tailFeathers: 2,
  tailBias: -0.08,
  beakLine: null,
  farLeg: false,
  eyeDots: (b, x, y, blink) => {
    if (blink) b.dot(x, y, P.cap, 1);
    else b.dot(x, y, P.beak, 1);
  },
  paintBody: (lx, ly, h) => {
    // Pale breast and belly; streaked brown back.
    if (h.ny > -0.05 && lx > -3.2) return [P.sparBelly, clamp(h.step, 2, 4)];
    const k = Math.floor((lx + 20) / 1.7);
    if (h.ny < -0.25 && hash(k, Math.floor(ly + 20), 77) > 0.55) return Math.max(1, h.step - 1);
    return null;
  },
  paintHead: (dx, dy, h) => {
    // Bib under the beak, cheek with its black spot, chestnut cap.
    if (dy > 0.9 && dx > -0.6) return [P.beak, 2];
    if (dy > -0.6 && dx > -2.0 && dx < 0.9 && dy < 1.6) {
      if (dx > -1.4 && dx < -0.4 && dy > 0.1 && dy < 1.1) return [P.beak, 2];
      return [P.white, clamp(h.step, 2, 4)];
    }
    if (dy <= -0.6) return [P.cap, clamp(h.step, 2, 4)];
    return null;
  },
  paintWing: (t, ac, h) => {
    // Pale wing bar across the coverts, dark feather centers behind it.
    if (t > 0.3 && t < 0.37 && ac < 0.8) return [P.sparBelly, 4];
    if (t > 0.45 && ac > -0.3 && ac < 0.7) return Math.max(1, h.step - 1);
    return null;
  },
};

const SPARROW_PERCH: BirdPose = {
  body: { c: [-0.6, -5.0], r: [4.0, 3.0, 3.0], a: -0.25 },
  head: { c: [2.7, -7.9], r: [2.7, 2.6] },
  beak: { base: [5.0, -7.7], a: 0.25, len: 1.9, r: 0.95, open: 0 },
  tail: { base: [-3.4, -4.8], tip: [-8.4, -6.4], w: 1.3 },
  wing: { base: [1.6, -6.5], tip: [-5.0, -3.9], w: 2.0 },
  legs: { hip: [0.3, -2.8], foot: [0.5, -0.7], toe: 1.8 },
  eye: [3.3, -8.6],
};

/** Moves a whole bird pose by (dx, dy) (hops), legs excluded. */
function birdShift(p: BirdPose, dx: number, dy: number): BirdPose {
  const s = (q: P2): P2 => [q[0] + dx, q[1] + dy];
  return {
    ...p,
    body: { ...p.body, c: s(p.body.c) },
    head: { ...p.head, c: s(p.head.c) },
    beak: { ...p.beak, base: s(p.beak.base) },
    tail: { ...p.tail, base: s(p.tail.base), tip: s(p.tail.tip) },
    wing: p.wing ? { ...p.wing, base: s(p.wing.base), tip: s(p.wing.tip) } : undefined,
    eye: s(p.eye),
  };
}

function sparrow(): WorldSprite {
  const st = SPARROW_STYLE;
  const S = SPARROW_PERCH;
  const fr = (p: BirdPose): Canvas => birdFrame(st, p);
  const peck: BirdPose = {
    ...S,
    body: { c: [0, -4.6], r: [4.0, 3.0, 3.0], a: 0.2 },
    head: { c: [4.0, -3.8], r: [2.7, 2.6] },
    beak: { base: [5.4, -2.4], a: 1.15, len: 1.9, r: 0.95, open: 0 },
    tail: { base: [-3.4, -5.6], tip: [-7.8, -8.6], w: 1.3 },
    wing: { base: [2.0, -5.8], tip: [-4.6, -5.0], w: 2.0 },
    eye: [4.6, -4.4],
  };
  const crouch: BirdPose = { ...birdShift(S, 0, 0.8), legs: { hip: [0.3, -2.0], foot: [0.6, -0.7], toe: 1.8 } };
  const hop: BirdPose = { ...birdShift(S, 0.4, -3.0), tail: { base: [-3.0, -7.6], tip: [-8.0, -8.6], w: 1.3 }, legs: { hip: [0.7, -5.8], foot: [0.2, -3.9], toe: 1.6 } };
  const land: BirdPose = { ...birdShift(S, 0, 0.5), tail: { base: [-3.4, -4.3], tip: [-8.0, -7.6], w: 1.3 }, legs: { hip: [0.3, -2.3], foot: [0.5, -0.7], toe: 1.8 } };
  const perch = [S, peck, S, crouch, hop, land].map(fr);

  const fly: Canvas[] = [];
  for (let i = 0; i < 4; i++) {
    const t = i / 4;
    const wf = flap(t, 58, -40);
    const bob = i === 2 ? -1 : 0;
    const P0: BirdPose = {
      body: { c: [0, -6 + bob], r: [4.3, 2.8, 2.9], a: -0.06 },
      head: { c: [3.7, -7.2 + bob], r: [2.6, 2.5] },
      beak: { base: [6.0, -7.0 + bob], a: 0.15, len: 1.9, r: 0.95, open: 0 },
      tail: { base: [-3.0, -6.2 + bob], tip: [-8.4, -6.0 + bob], w: 1.6 },
      eye: [4.3, -7.9 + bob],
    };
    fly.push(birdFrame(st, P0, { wf, root: [0.4, -7.2 + bob], len: 11.5, chord: 4.6 }));
  }
  return assemble('sparrow', 'Sparrow', [0.15, 0.1], ['animal', 'ambient'], { perch: { frames: perch, fps: 6 }, fly: { frames: fly, fps: 12 } }, st.ox + 1, st.gy);
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

/** Frames of an animation in a grid (for close inspection), saved as animals-<name>-<anim>-grid.png. */
function grid(s: WorldSprite, anim: string, dir: string, scale: number, cols: number, from = 0, count = 99): void {
  const fr = s.anims[anim].frames.slice(from, from + count);
  const fw = fr[0].w, fh = fr[0].h;
  const rows = Math.ceil(fr.length / cols);
  const out = new Canvas((fw + 2) * Math.min(cols, fr.length), (fh + 2) * rows);
  out.fillRect(0, 0, out.w, out.h, hex('#5d6b57'));
  fr.forEach((f, i) => out.draw(f, (i % cols) * (fw + 2), Math.floor(i / cols) * (fh + 2)));
  out.scaled(scale).save(join(dir, `animals-${s.name}-${anim}-grid${from ? '-' + from : ''}.png`));
}

/** All first frames on one ground line next to the character, at the in-game 2x and at 4x. */
function lineup(sprites: WorldSprite[], path: string): void {
  const ref = characterRef();
  const items: { c: Canvas; ax: number; ay: number }[] = [{ c: ref, ax: CHARACTER_FEET[0], ay: CHARACTER_FEET[1] }];
  for (const s of sprites) items.push({ c: Object.values(s.anims)[0].frames[0], ax: s.anchor[0], ay: s.anchor[1] });
  const above = Math.max(...items.map((i) => i.ay)), below = Math.max(...items.map((i) => i.c.h - i.ay));
  const W = items.reduce((t, i) => t + i.c.w + 6, 6), H = above + below + 8;
  const out = new Canvas(W, H);
  out.fillRect(0, 0, W, H, hex('#5d6b57'));
  out.fillRect(0, above + 4, W, below + 4, hex('#4a5a3c'));
  let x = 6;
  for (const i of items) {
    out.draw(i.c, x, above + 4 - i.ay);
    x += i.c.w + 6;
  }
  out.scaled(2).save(path.replace('.png', '-2x.png'));
}

const sprites: WorldSprite[] = [rabbit(), deer(), crow(), sparrow()];
writeGroup('animals', sprites);
preview(sprites, join(previewDir(), 'animals.png'), { scale: 4, maxWidth: 480 });
debugSaves(sprites, previewDir());
lineup(sprites, join(previewDir(), 'animals-lineup.png'));
const GRID = process.env.GRID;
if (GRID) {
  const [nm, an, sc, co, fr, ct] = GRID.split(':');
  const sp = sprites.find((x) => x.name === nm);
  if (sp) grid(sp, an, previewDir(), +(sc || 5), +(co || 4), +(fr || 0), +(ct || 99));
}
for (const s of sprites) {
  const f = Object.values(s.anims)[0].frames[0];
  const bb = f.bounds();
  console.log(`${s.name.padEnd(17)} frame ${f.w}x${f.h} anchor ${s.anchor} opaque ${bb ? bb[2] - bb[0] + 1 : 0}x${bb ? bb[3] - bb[1] + 1 : 0} (m ${s.meters} = ${m(s.meters[0])}x${m(s.meters[1])}px) anims ${Object.entries(s.anims).map(([k, a]) => `${k}:${a.frames.length}@${a.fps}${a.loop === false ? '(once)' : ''}`).join(' ')}`);
}
void [hash, withAlpha, lerp2, rad, sub, inter, flat, stamp];
