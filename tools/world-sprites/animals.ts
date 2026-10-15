// Small animals for the battle maps: ambient life that flees when combat starts. Rabbit, deer,
// crow and sparrow on the ground and in the air; butterflies, a dragonfly, a frog, a koi in the
// river and a drift of fireflies.
//
//   npx tsx tools/world-sprites/animals.ts [previewDir]
//   WORLD_OUT=<dir> ... writes the sheets for approval instead of into src/assets/world.
//   FOCUS=frog,koi ... builds only those (inspection images only, no sheets).
//
// The bodies are modelled, not painted: every part (torso, haunch, head, ear, leg) is a small
// signed-distance shape (ellipsoids and tapered capsules, smoothly merged where flesh flows into
// flesh). Each part is ray-cast from the viewer, lit from the upper left by its 3D normal and
// quantized to a 6-step ramp with cluster-shaped band edges. Parts are layered back to front like
// a painter would: a part in front leaves a dark 1 px inner line on the part behind it, far limbs
// sit one shade darker, and the kit adds the material-tinted outline. Eyes, noses, spots and
// feather marks are placed by hand on top. Tiny critters (insects, the frog) are pixel templates.
// The koi is modelled in world space and ray-marched through the battle camera (x across, height
// up, depth away at 38/57), like the landmarks, because it is seen from above in the river.
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
  // Pond frog: the shared grass green lifted toward young leaf, a little more saturated.
  frog: ramp(blend(MATERIALS.grass, MATERIALS.leafLight, 0.45), { shift: 16 }),
  // Frog eye: a gold iris (fire pulled toward rope).
  gold: ramp(blend(MATERIALS.fire, MATERIALS.rope, 0.45), { shift: 12 }),
  // Butterflies: a swallowtail's electric blue (the river water lifted toward sky), a sulphur yellow
  // (fire toward paper), the dull brown-black of a swallowtail's underside, lacquer red for its spots.
  bfBlue: ramp(blend(MATERIALS.water, '#46b4f0', 0.7), { shift: 10 }),
  bfYellow: ramp(blend(MATERIALS.fire, '#f0e05a', 0.82), { shift: 4 }),
  under: ramp(blend(MATERIALS.charred, MATERIALS.woodDark, 0.5), { shift: 8 }),
  red: ramp(MATERIALS.red),
  // Red dragonfly (aka-tombo): lacquer red warmed toward fire; a red-brown thorax.
  dfly: ramp(blend(MATERIALS.red, MATERIALS.fire, 0.32), { shift: 10 }),
  dflyThorax: ramp(blend(MATERIALS.red, MATERIALS.woodDark, 0.45), { shift: 10 }),
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
  frog: pal(R.frog),
  gold: pal(R.gold),
  bfBlue: pal(R.bfBlue),
  bfYellow: pal(R.bfYellow),
  under: pal(R.under),
  red: pal(R.red),
  dfly: pal(R.dfly),
  dflyThorax: pal(R.dflyThorax),
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
  // Pale belly. Sitting and grazing it is the downward-facing fur; in the hop (the body rolls
  // through big angles) it is a band along the bottom of the body ellipse, so it stays one steady
  // stripe from frame to frame instead of flickering on and off.
  const bca = Math.cos(pose.body.a), bsa = Math.sin(pose.body.a);
  const belly = (h: Hit): boolean => {
    if (h.x >= ox + pose.chest.c[0] - 1) return false;
    if (!pose.farFoot) return h.ny > 0.84;
    const dx = h.x + 0.5 - (ox + pose.body.c[0]), dy = h.y + 0.5 - (gy + pose.body.c[1]);
    const lu = dx * bca + dy * bsa, lv = -dx * bsa + dy * bca;
    return lv / pose.body.r[1] > 0.74 && Math.abs(lu) < pose.body.r[0] * 0.75 && h.ny > 0.2;
  };
  solid(b, torso, { ...base, line: 1, paint: (h) => (belly(h) ? [P.pale, pose.farFoot ? 2 : clamp(h.step, 2, 3)] : null) });
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
  const Gdown = rp(G, { head: { c: [7.4, -4.6], a: 1.18 }, nose: 1 });
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
// Each is [x, y, rx, ry]: small dabs of 2-4 px stretched along the body, like brush touches.
const DEER_SPOTS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  const top = (x: number): number => -48.2 + 0.0035 * (x + 4) ** 2;
  const j = (i: number, k: number): number => hash(i, k, 41) - 0.5;
  let i = 0;
  for (let x = -21; x <= 6; x += 4.3, i++) out.push([Math.round(x + j(i, 1)), Math.round(top(x) + 3.1 + j(i, 2) * 0.6), i % 2 ? 1.5 : 1.2, 1.05]);
  for (let x = -19; x <= 2; x += 4.8, i++) out.push([Math.round(x + j(i, 1) * 1.2), Math.round(top(x) + 7.0 + j(i, 2) * 0.8), i % 2 ? 1.4 : 1.15, 1.0]);
  for (let x = -16.5; x <= -1; x += 5.4, i++) out.push([Math.round(x + j(i, 1) * 1.6), Math.round(top(x) + 10.8 + j(i, 2) * 1.2), 1.1, 0.95]);
  out.push([-12, Math.round(top(-12.5) + 14), 1.05, 0.9]);
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
      // Spots follow the coat's light: a lit upper half, the lower edge a step softer. They are
      // placed on whole pixels of the body so the walk's half-pixel bob doesn't reshape them.
      const sx0 = h.x + 0.5 - Math.round(org[0]), sy0 = h.y + 0.5 - Math.round(org[1]);
      for (const [sx, sy, rx, ry] of DEER_SPOTS) {
        const dx = (sx0 - sx) / rx, dy = (sy0 - sy) / ry;
        if (dx * dx + dy * dy < 1) return [spotPal, clamp(h.step + (dy < 0 ? 0 : -1), 2, 4)];
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
  return assemble('deer', 'Sika Deer', [1.4, 1.5], ['animal', 'ambient'], { idle: { frames: idle, fps: 5 }, graze: { frames: graze, fps: 5 }, walk: { frames: walk, fps: 8 }, alert: { frames: alert, fps: 0 } }, DEER_OX + 1, DEER_GY + 1);
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
    // The tree sparrow's face, placed around the eye so it reads at 1x: chestnut crown, a black
    // eye kept off the beak by a chestnut lore, the white cheek wrapped behind and under the eye
    // (its black spot is too small to survive at this size), a small black bib under the beak.
    const put = (dx: number, dy: number, p: number, st: number): void => b.dot(x + dx, y + dy, p, st);
    put(-1, -2, P.cap, 4);
    put(-1, -1, P.cap, 4);
    put(0, -1, P.cap, 4);
    put(1, -1, P.cap, 3);
    put(-2, 0, P.cap, 2);
    put(-1, 0, P.white, 4);
    put(1, 0, P.cap, 2);
    put(-2, 1, P.white, 3);
    put(-1, 1, P.white, 4);
    put(0, 1, P.white, 5);
    put(1, 1, P.beak, 1);
    put(0, 2, P.beak, 2);
    put(1, 2, P.beak, 2);
    put(0, 0, blink ? P.cap : P.beak, blink ? 1 : 0);
  },
  paintBody: (lx, ly, h) => {
    // Pale breast and belly; streaked brown back.
    if (h.ny > -0.05 && lx > -3.2) return [P.sparBelly, clamp(h.step, 2, 4)];
    const k = Math.floor((lx + 20) / 1.7);
    if (h.ny < -0.25 && hash(k, Math.floor(ly + 20), 77) > 0.55) return Math.max(1, h.step - 1);
    return null;
  },
  paintHead: (dx, dy, h) => {
    // Bib under the beak, cheek with its black spot, chestnut cap (the eye hook sharpens the face).
    if (dy > 1.5 && dx > 0) return [P.beak, 2];
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
// PIXEL TEMPLATES (tiny critters)
// =============================================================================================
//
// Below about 12 px a modelled form turns to mush, so the frog and the insects are drawn by hand:
// each row is a string, each character a [palette, step] from a legend (space and '.' are empty).
// The shading is placed like the modelled animals (lit top-left edges, steps 1-3 for the mass,
// 4-5 only on crests and glints), and finish() adds the material-tinted outline.

type Legend = Record<string, [number, number]>;

/**
 * Paints templates into a fresh buffer and returns the outlined canvas. `outline` sets one color
 * for the whole outline (a small critter with a pale throat or wing band would otherwise get gray
 * outline pixels that read as holes).
 */
function tplCanvas(w: number, h: number, layers: { rows: string[]; x: number; y: number; legend: Legend; flipX?: boolean }[], o: { outline?: Color | false } = {}): Canvas {
  const b = new Buf(w, h);
  for (const l of layers) stamp(b, l.rows, l.x, l.y, l.legend, { line: null, flipX: l.flipX });
  const c = finish(b, { outline: o.outline !== false });
  if (o.outline)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (c.alpha(x, y) && !b.has(x, y)) c.set(x, y, o.outline);
  return c;
}

/** Sets template pixels straight onto a finished canvas (antennae, legs: 1 px lines that take no outline). */
function overlay(c: Canvas, rows: string[], ox: number, oy: number, legend: Legend): void {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const L = legend[row[x]];
      if (L) c.set(ox + x, oy + y, PAL[L[0]][L[1]]);
    }
  });
}

/** Replaces characters of a template at [row, col] positions (for small per-frame changes). */
function patch(rows: string[], edits: [number, number, string][]): string[] {
  const out = rows.map((r) => r.split(''));
  for (const [r, c, ch] of edits) {
    while (out[r].length <= c) out[r].push('.');
    out[r][c] = ch;
  }
  return out.map((r) => r.join(''));
}

// =============================================================================================
// FROG
// =============================================================================================
//
// A pond frog sitting by the water, facing right, at about 1.6x so the eyes and throat read
// (10 x 8 px). At this size a modelled body turns to a blob, so every pose is a hand-placed
// template. The jump is a one-shot: crouch, push off, stretched in the air with both hind legs
// trailing, reaching down, the landing squash, and sitting again 27 px (0.47 m) to the right.

const FROG_LEG: Legend = {
  '1': [P.frog, 1], '2': [P.frog, 2], '3': [P.frog, 3], '4': [P.frog, 4], '5': [P.frog, 5],
  a: [P.pale, 2], b: [P.pale, 3], c: [P.pale, 4],
  Y: [P.gold, 4], Z: [P.gold, 5],
  k: [P.dark, 1],
};

// The steep battle camera sees the frog from above the side, so both eye bumps show: the far eye
// up and behind the near one. Mostly steps 2-3 with a lit back crest, a few dark spots in clusters,
// the pale throat under the mouth line, the near thigh as a lit band. The bottom row is the ground.
const FROG_SIT = [
  '....43....',
  '..44Yk43..',
  '.4433Zk33.',
  '4322333333',
  '3322331112',
  '3344412bb.',
  '2333312ba.',
  '.122221.2.',
];
// Throat pulse (half and full) and a blink.
const FROG_THROAT1 = patch(FROG_SIT, [[5, 8, 'c'], [5, 9, 'b'], [6, 8, 'b'], [6, 9, 'a']]);
const FROG_THROAT2 = patch(FROG_SIT, [[5, 6, '1'], [5, 7, 'b'], [5, 8, 'c'], [5, 9, 'c'], [6, 6, '1'], [6, 7, 'b'], [6, 8, 'b'], [6, 9, 'b'], [7, 5, '2'], [7, 7, '2'], [7, 8, 'a']]);
const FROG_BLINK = patch(FROG_SIT, [[1, 4, '3'], [1, 5, '1'], [2, 5, '3'], [2, 6, '1']]);
// Jump: crouch, push off, stretched in the air, reaching down, landing squash (then the sit pose).
const FROG_CROUCH = [
  '.....43....',
  '...44Yk43..',
  '.44433Zk33.',
  '43223333332',
  '3344431111.',
  '233332bba..',
  '.1222212...',
];
const FROG_LAUNCH = [
  '........43...',
  '......44Yk43.',
  '.....4433Zk3.',
  '....43223333.',
  '...43322331112',
  '..433322bbb1.',
  '.3331.1.a1...',
  '231..........',
  '21...........',
];
const FROG_AIR = [
  '...........43...',
  '.........44Yk43.',
  '1.....4444433Zk3',
  '2333.43322233332',
  '....433333331112',
  '21222.22222bb1..',
  '1..........1.1..',
];
const FROG_DESCEND = [
  '1..2..........',
  '2..2..........',
  '.3..3...43....',
  '..3..34.4Yk43..',
  '...3.44443Zk3..',
  '....4322333333',
  '.....33333112.',
  '......222bb1..',
  '........1..1..',
  '.......21..21.',
];
const FROG_LAND = [
  '.....43....',
  '...44Yk43..',
  '.44433Zk33.',
  '43223333332',
  '3344411111.',
  '2333312bb1.',
  '11222.21.12',
];

const FROG_W = 64, FROG_H = 34, FROG_OX = 16, FROG_GY = 28;

/** A frog template: column 0 at anchor + x, its bottom row `lift` px above the ground row. */
function frogFrame(rows: string[], x = -4, lift = 0): Canvas {
  return tplCanvas(FROG_W, FROG_H, [{ rows, x: FROG_OX + x, y: FROG_GY - rows.length - lift, legend: FROG_LEG }], { outline: R.frog[0] });
}

function frog(): WorldSprite {
  const S = frogFrame(FROG_SIT);
  const idle = [S, S, frogFrame(FROG_THROAT1), frogFrame(FROG_THROAT2), frogFrame(FROG_THROAT1), S, frogFrame(FROG_BLINK), S];
  // Leaps 27 px (about 0.47 m) to the right, about 0.2 m high; the last frame sits at the landing spot.
  const jump = [frogFrame(FROG_CROUCH, -4), frogFrame(FROG_LAUNCH, -5, 0), frogFrame(FROG_AIR, 4, 8), frogFrame(FROG_DESCEND, 14, 3), frogFrame(FROG_LAND, 22), frogFrame(FROG_SIT, 23)];
  return assemble('frog', 'Frog', [0.1, 0.06], ['animal', 'ambient', 'water'], { idle: { frames: idle, fps: 6 }, jump: { frames: jump, fps: 12, loop: false } }, FROG_OX, FROG_GY);
}

// =============================================================================================
// BUTTERFLIES
// =============================================================================================
//
// Drawn at 2x real size (an 8 cm wingspan becomes 9 px) as the classic flutter seen from above
// and behind, so the wing pattern faces the camera: open, half raised, edge-on, back to half. The
// blue is a swallowtail with brilliant blue fields, black margins and tails, and a dull underside
// with red spots that shows when the wings close; the yellow is a sulphur with black forewing tips.
// The left wing, tilted toward the light, carries the glints. Antennae are 1 px and take no outline.

const BF_W = 24, BF_H = 22, BF_OX = 12, BF_OY = 11;

interface BflySet {
  legend: Legend;
  outline: Color;
  open: string[];
  half: string[];
  edge: string[];
  closed: string[];
  bask: string[];
}

/** Antennae from the head (col 4, row 1 of a 9-wide template) up and out; spread wider when perched. */
const BF_ANT = ['..a...a..', '...a.a...'];
const BF_ANT_SPREAD = ['.a.....a.', '..a...a..', '...a.a...'];

const BLUE_SET: BflySet = {
  legend: {
    k: [P.crow, 2], j: [P.crow, 3], x: [P.crow, 1], h: [P.crow, 3],
    n: [P.bfBlue, 2], b: [P.bfBlue, 3], B: [P.bfBlue, 4], C: [P.bfBlue, 5],
    u: [P.under, 2], U: [P.under, 3], V: [P.under, 4], r: [P.red, 3], a: [P.crow, 1],
  },
  outline: R.crow[0],
  open: [
    'jk.....kk',
    'kCk.h.kbk',
    'kBbbxbbnk',
    '.kbbxbnk.',
    '..kbxbk..',
    '.kbbxbnk.',
    '.kbk.knk.',
    '..k...k..',
  ],
  half: [
    '.k.....k.',
    '.jk.h.kk.',
    '.kCbxbnk.',
    '..kbxnk..',
    '..kbxbk..',
    '..kbxnk..',
    '..kk.kk..',
    '...k.k...',
  ],
  edge: [
    '.........',
    '....h....',
    '...jxk...',
    '...Bxn...',
    '...jxk...',
    '...kxk...',
    '...k.k...',
  ],
  closed: [
    '.........',
    '....h....',
    '...VxU...',
    '...UxU...',
    '...UxU...',
    '...uxu...',
    '...rxr...',
    '...u.u...',
  ],
  bask: [
    'jk.....kk',
    'kCk.h.kbk',
    'kBbbxbbnk',
    '.kbbxbnk.',
    '..kbxbk..',
    '.kbbxbnk.',
    '.krk.krk.',
    '..k...k..',
  ],
};

const YELLOW_SET: BflySet = {
  legend: {
    k: [P.crow, 2], x: [P.crow, 1], h: [P.crow, 3],
    q: [P.bfYellow, 2], y: [P.bfYellow, 3], Y: [P.bfYellow, 4], Z: [P.bfYellow, 5],
    e: [P.pale, 3], E: [P.pale, 4], a: [P.crow, 1],
  },
  outline: R.bfYellow[0],
  open: [
    'kk.....kk',
    'kZq.h.qqk',
    'qYyyxyyqq',
    '.qyyxyqq.',
    '..qyxyq..',
    '.qyyxyyq.',
    '.qqq.qqq.',
  ],
  half: [
    '.k.....k.',
    '.kq.h.qk.',
    '.qZyxyqq.',
    '..qyxyq..',
    '..qyxyq..',
    '..qyxyq..',
    '..qq.qq..',
  ],
  edge: [
    '.........',
    '....h....',
    '...qxq...',
    '...Yxy...',
    '...yxq...',
    '...qxq...',
    '...q.q...',
  ],
  closed: [
    '.........',
    '....h....',
    '...ExE...',
    '...ZxY...',
    '...YxY...',
    '...yxy...',
    '...q.q...',
  ],
  bask: [
    'kk.....kk',
    'kZq.h.qqk',
    'qYyyxyyqq',
    '.qyyxyqq.',
    '..qyxyq..',
    '.qyyxyyq.',
    '.qqq.qqq.',
  ],
};

/** One butterfly frame: the template centered on the anchor (the thorax), raised by `lift` px. */
function bflyFrame(set: BflySet, rows: string[], lift = 0, spread = false): Canvas {
  const x0 = BF_OX - 4, y0 = BF_OY - 3 - lift;
  const c = tplCanvas(BF_W, BF_H, [{ rows, x: x0, y: y0, legend: set.legend }], { outline: set.outline });
  const ant = spread ? BF_ANT_SPREAD : BF_ANT;
  overlay(c, ant, x0, y0 + 1 - ant.length, set.legend);
  return c;
}

function butterfly(name: string, label: string, set: BflySet): WorldSprite {
  // Flight: the body dips a pixel as the wings come up, so the flutter bobs.
  const fly = [bflyFrame(set, set.open), bflyFrame(set, set.half), bflyFrame(set, set.edge, -1), bflyFrame(set, set.half)];
  // Perched: wings held closed, part, open flat to bask, part again; antennae spread, body still.
  const rest = [bflyFrame(set, set.closed, 0, true), bflyFrame(set, set.half, 0, true), bflyFrame(set, set.bask, 0, true), bflyFrame(set, set.half, 0, true)];
  return assemble(name, label, [0.08, 0.06], ['animal', 'ambient'], { fly: { frames: fly, fps: 12 }, rest: { frames: rest, fps: 4 } }, BF_OX, BF_OY);
}

// =============================================================================================
// DRAGONFLY
// =============================================================================================
//
// A red dragonfly (aka-tombo) at 2x real size, side view facing right: a hand-placed body (big
// eyes, a stout thorax, the long abdomen with darker segment rings). The four wings are flat
// planes beating about the body axis and projected through the battle camera, so the far pair
// shows above the body and the near pair below, each going edge-on in turn; hind wings lead the
// fore wings by a quarter beat. Wings are translucent with a dark leading edge, a pterostigma near
// the tip and a white glint on whichever wing faces the light.

const DF_W = 64, DF_H = 30, DF_OX = 16, DF_OY = 15;

const DF_LEG: Legend = {
  '1': [P.dfly, 1], '2': [P.dfly, 2], '3': [P.dfly, 3], '4': [P.dfly, 4], '5': [P.dfly, 5],
  t: [P.dflyThorax, 2], T: [P.dflyThorax, 3], U: [P.dflyThorax, 4],
  e: [P.dfly, 2], E: [P.dfly, 4], W: [P.white, 5], k: [P.dark, 1],
};
// Body: abdomen cols 0-5 (tip at 0), thorax cols 6-8, head (all eye) cols 9-10. Row 1 is the body axis.
const DF_BODY = [
  '......TU.WE',
  '233343TTTE4',
  '......tt.ee',
];

interface DfWing {
  /** Root on screen relative to the thorax center, length (px), sweep (radians, + forward), chord (px). */
  root: P2;
  len: number;
  sweep: number;
  chord: number;
  /** +1 far side, -1 near side. */
  side: number;
}

const DF_WINGS: DfWing[] = [
  { root: [0.6, 0], len: 6.6, sweep: 0.42, chord: 2.4, side: 1 }, // far fore
  { root: [-0.8, 0], len: 6.2, sweep: -0.38, chord: 2.8, side: 1 }, // far hind
  { root: [0.6, 0.6], len: 6.6, sweep: 0.42, chord: 2.4, side: -1 }, // near fore
  { root: [-0.8, 0.6], len: 6.2, sweep: -0.38, chord: 2.8, side: -1 }, // near hind
];

/**
 * Paints one wing raised `phi` (radians): the span runs out across the body (depth), swept toward
 * the head or tail, tilted up by phi and projected as (X, -H - K D); the chord stays along the
 * body. Coverage is 4x4 supersampled. The wing reads as glass: a pale film, a rim where it ends,
 * a darker leading edge, the pterostigma near the tip, and a white glint when `glint`.
 */
function dfWing(c: Canvas, cx: number, cy: number, w: DfWing, phi: number, glint: boolean, alphaK = 1): void {
  const K = 38 / 57;
  const cs = Math.cos(w.sweep);
  const sx = Math.sin(w.sweep) * w.len, sy = -(cs * Math.sin(phi) + w.side * K * cs * Math.cos(phi)) * w.len;
  const rx = cx + w.root[0], ry = cy + w.root[1];
  const SS = 4;
  const syy = Math.abs(sy) < 1.2 ? (sy >= 0 ? 1.2 : -1.2) : sy;
  const x0 = Math.floor(Math.min(rx, rx + sx) - w.chord - 1), x1 = Math.ceil(Math.max(rx, rx + sx) + w.chord + 1);
  const y0 = Math.floor(Math.min(ry, ry + syy) - 2), y1 = Math.ceil(Math.max(ry, ry + syy) + 2);
  const cells = new Map<number, { a: number; lead: number; tip: number; u: number }>();
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      let a = 0, lead = 0, tip = 0, us = 0;
      for (let j = 0; j < SS; j++)
        for (let i = 0; i < SS; i++) {
          const px = x + (i + 0.5) / SS - rx, py = y + (j + 0.5) / SS - ry;
          const u = py / syy;
          if (u < 0 || u > 1) continue;
          const v = px - sx * u; // along the chord, + toward the head
          // Planform: narrow at the root, full by a third, rounded tip.
          const half = (w.chord / 2) * Math.min(1, 0.45 + u * 2) * (u > 0.82 ? Math.sqrt(Math.max(0, (1 - u) / 0.18)) : 1);
          const mid = w.sweep > 0 ? 0.2 : -0.25;
          if (Math.abs(v - mid) > half) continue;
          a++;
          us += u;
          if (v - mid > half - 0.6) lead++;
          if (u > 0.7 && u < 0.88 && v - mid > half - 1.1) tip++;
        }
      if (a) cells.set(y * 1000 + x, { a: a / (SS * SS), lead: lead / a, tip: tip / a, u: us / a });
    }
  // Glass: a pale film the stage shows through, edges catching a little more light, a cooler
  // leading edge, and the dark pterostigma only when the wing shows its length.
  const film = mix(R.white[5], KOI_PAL.water[5], 0.35);
  const lead = mix(KOI_PAL.water[4], R.crow[4], 0.3);
  const long = Math.abs(sy) > 3;
  const on = (k: number): boolean => (cells.get(k)?.a ?? 0) >= 0.3;
  let stig = false;
  for (const [k, v] of [...cells].sort((p, q) => q[1].tip - p[1].tip)) {
    if (v.a < 0.3) continue;
    const x = k % 1000, y = Math.floor(k / 1000);
    const edge = !on(k - 1) || !on(k + 1) || !on(k - 1000) || !on(k + 1000);
    let col: Color;
    if (long && !stig && v.tip > 0.4) {
      col = withAlpha(R.dflyThorax[2], 220 * alphaK);
      stig = true;
    } else if (edge && v.lead > 0.5) col = withAlpha(lead, 190 * alphaK);
    else if (edge) col = withAlpha(film, 165 * alphaK);
    else col = withAlpha(film, 110 * alphaK);
    c.plot(x, y, col);
  }
  if (glint) {
    const gx = Math.round(rx + sx * 0.45), gy = Math.round(ry + syy * 0.45);
    c.set(gx, gy, withAlpha(hex('#ffffff'), 240 * alphaK));
    c.plot(gx + 1, gy, withAlpha(film, 180 * alphaK));
  }
}

/** Wing angles for beat phase t (0..1): fore and hind pairs a quarter beat apart. */
function dfPhis(t: number, amp = 0.55): [number, number] {
  return [amp * Math.sin(2 * Math.PI * t), amp * Math.sin(2 * Math.PI * (t + 0.25))];
}

/** One dragonfly frame: body at (dx, dy) from the anchor, wings at beat phase t; `under` draws wings behind first. */
function dflyFrame(t: number, dx = 0, dy = 0, o: { amp?: number; wingAlpha?: number; tilt?: number } = {}): Canvas {
  const bx = DF_OX - 7 + dx, by = DF_OY - 1 + dy;
  const body = tplCanvas(DF_W, DF_H, [{ rows: DF_BODY, x: bx, y: by, legend: DF_LEG }], { outline: R.dfly[0] });
  const c = new Canvas(DF_W, DF_H);
  const [pf, ph] = dfPhis(t, o.amp);
  const cx = DF_OX + dx + 0.5, cy = DF_OY + dy + 0.5;
  // The wing facing the light this frame carries the glint (the far fore wing on the upstroke).
  const glintFar = pf > 0.2, glintNear = pf < -0.2;
  dfWing(c, cx, cy, DF_WINGS[1], ph, false, o.wingAlpha);
  dfWing(c, cx, cy, DF_WINGS[0], pf, glintFar, o.wingAlpha);
  c.draw(body, 0, 0);
  dfWing(c, cx, cy, DF_WINGS[3], ph, false, o.wingAlpha);
  dfWing(c, cx, cy, DF_WINGS[2], pf, glintNear, o.wingAlpha);
  return c;
}

/** Motion smear: the body's rows streaked back from `from` to the body, fading toward the start. */
function dfSmear(c: Canvas, from: number, to: number, dy: number, strength: number): void {
  const rows: [number, Color][] = [[-1, R.dflyThorax[3]], [0, R.dfly[3]], [1, R.dfly[2]]];
  for (const [ry, col] of rows)
    for (let x = Math.round(from); x < Math.round(to); x++) {
      const k = (x - from) / Math.max(1, to - from);
      if (ry !== 0 && k < 0.45) continue;
      c.plot(DF_OX + x - 7, DF_OY + dy + ry, withAlpha(mix(col, R.white[5], 0.25), (30 + 120 * k * k) * strength));
    }
}

function dragonfly(): WorldSprite {
  const hover = [0, 0.25, 0.5, 0.75].map((t) => dflyFrame(t));
  // Dart: a quick pull back with the wings high, the dash (a smear back to the start), the end of
  // the dash with a short smear, then hovering at the new spot 20 px (0.35 m) ahead.
  const d0 = dflyFrame(0.25, -1, 0, { amp: 0.7 });
  const d1 = dflyFrame(0.6, 11, -1, { amp: 0.3, wingAlpha: 0.55 });
  dfSmear(d1, -1, 11 + 2, -1, 1);
  const d2 = dflyFrame(0.9, 19, 0, { amp: 0.4, wingAlpha: 0.75 });
  dfSmear(d2, 10, 19 + 2, 0, 0.7);
  const d3 = dflyFrame(0.0, 20, 0);
  return assemble('dragonfly', 'Dragonfly', [0.1, 0.06], ['animal', 'ambient'], { hover: { frames: hover, fps: 14 }, dart: { frames: [d0, d1, d2, d3], fps: 12, loop: false } }, DF_OX, DF_OY);
}

// =============================================================================================
// FIREFLIES
// =============================================================================================
//
// Seven glowing dots drifting in a 1.2 x 1 m box, each on its own small closed path (so the 12
// frame loop is seamless) and blinking on its own schedule: a warm yellow-green core with a 1 px
// soft glow, no outline. At least four are lit in every frame so the group always reads.

const FF_W = 72, FF_H = 61, FF_OX = 36, FF_OY = 30;

function fireflies(): WorldSprite {
  // Warm yellow-green: the fire glow pulled toward young leaf; the hottest core almost white.
  const core = mix(hex('#fde68a'), R.frog[5], 0.4), hot = mix(core, hex('#ffffff'), 0.6), glow = mix(R.frog[5], hex('#fde68a'), 0.35);
  // [x, y] in the box (px from the center), path radii, path harmonics, blink offset.
  const flies: [number, number, number, number, number, number, number][] = [
    [-28, -17, 3, 2, 1, 1, 0],
    [-9, -24, 2, 2, 1, 2, 5],
    [13, -18, 4, 2, 1, 1, 9],
    [29, -3, 2, 3, 2, 1, 3],
    [-24, 10, 3, 3, 1, 2, 7],
    [2, 3, 4, 3, 1, 1, 1],
    [20, 21, 3, 2, 2, 1, 10],
  ];
  // Brightness over the 12 frames for offset 0: fade in, glow, fade out, dark.
  const blink = [0.35, 0.75, 1, 1, 0.8, 0.5, 0.25, 0, 0, 0, 0.1, 0.2];
  const frames: Canvas[] = [];
  for (let f = 0; f < 12; f++) {
    const c = new Canvas(FF_W, FF_H);
    flies.forEach(([x, y, ax, ay, kx, ky, off], i) => {
      const t = f / 12;
      const px = Math.round(FF_OX + x + ax * Math.sin(2 * Math.PI * kx * t + i * 1.7));
      const py = Math.round(FF_OY + y + ay * Math.sin(2 * Math.PI * ky * t + i * 2.3 + 0.8));
      const b = blink[(f + off) % 12];
      if (b <= 0) return;
      // Glow first (soft), then the core over it.
      if (b >= 0.7) {
        for (const [dx, dy2] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.plot(px + dx, py + dy2, withAlpha(glow, 205 * b));
        for (const [dx, dy2] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) c.plot(px + dx, py + dy2, withAlpha(glow, 95 * b));
        c.set(px, py, b >= 0.95 ? hot : core);
      } else if (b >= 0.4) {
        for (const [dx, dy2] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.plot(px + dx, py + dy2, withAlpha(glow, 120 * b));
        c.set(px, py, core);
      } else c.set(px, py, withAlpha(glow, 150 + 250 * b));
    });
    frames.push(c);
  }
  return assemble('fireflies', 'Fireflies', [1.2, 1.0], ['ambient', 'light-source'], { idle: { frames, fps: 8 } }, FF_OX, FF_OY);
}

// =============================================================================================
// KOI
// =============================================================================================
//
// An orange and white koi (kohaku pattern), 0.4 m nose to tail, modelled in world space and
// rendered through the battle camera like the landmarks: x across, height up and depth away
// project to the screen as (X, -H - 38/57 D), so the koi swimming right in the river shows its
// back foreshortened above its near flank, both pectoral fins, and the tail fan side-on.
//
// The body is a chain of ellipsoids along a spine that undulates sideways (a wave running back
// toward the tail); fins are thin extruded outlines. Every pixel is ray-marched along the camera
// ray, lit from the upper left by its normal and quantized with cluster noise anchored to the
// fish. The patches live in body coordinates (along the spine, around the body) so they ride
// the undulation. Under the surface the colors sink into the water in three depth bands and the
// outline turns deep teal; out of the water (the jump) the fish is drawn fully saturated.

type W3 = [number, number, number]; // X right, H up, D away from the viewer (px)
const KOI_K = 38 / 57;

interface WPrim {
  sd: (p: W3) => number;
  /** World bounds: [X0, H0, D0, X1, H1, D1]. */
  box: [number, number, number, number, number, number];
}

/** Signed distance to a 2D polygon (negative inside). */
function sdPoly2(x: number, y: number, pts: P2[]): number {
  let d = Infinity, inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, ay] = pts[j], [bx, by] = pts[i];
    const ex = bx - ax, ey = by - ay;
    const t = clamp(((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey || 1), 0, 1);
    d = Math.min(d, Math.hypot(x - ax - ex * t, y - ay - ey * t));
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
  }
  return inside ? -d : d;
}

/** Ellipsoid at c with radii (along, up, across), turned `yaw` about the vertical (positive turns +X toward +D). */
function wEll(c: W3, r: W3, yaw = 0): WPrim {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const R0 = Math.max(r[0], r[2]);
  return {
    sd: (p) => {
      const dx = p[0] - c[0], dh = p[1] - c[1], dd = p[2] - c[2];
      const lx = dx * cy + dd * sy, ld = -dx * sy + dd * cy;
      const k0 = Math.hypot(lx / r[0], dh / r[1], ld / r[2]);
      const k1 = Math.hypot(lx / (r[0] * r[0]), dh / (r[1] * r[1]), ld / (r[2] * r[2]));
      return k1 < 1e-9 ? -Math.min(...r) : (k0 * (k0 - 1)) / k1;
    },
    box: [c[0] - R0, c[1] - r[1], c[2] - R0, c[0] + R0, c[1] + r[1], c[2] + R0],
  };
}

/** A thin plate: a 2D outline in a plane through `o` spanned by unit axes u and v, `t` half-thick. */
function wPlate(o: W3, u0: W3, v0: W3, pts: P2[], t: number): WPrim {
  // Orthonormal axes: u as given, v made perpendicular to it within the plate's plane.
  const ul = Math.hypot(...u0);
  const u: W3 = [u0[0] / ul, u0[1] / ul, u0[2] / ul];
  const vd = v0[0] * u[0] + v0[1] * u[1] + v0[2] * u[2];
  const vr: W3 = [v0[0] - u[0] * vd, v0[1] - u[1] * vd, v0[2] - u[2] * vd];
  const vl = Math.hypot(...vr);
  const v: W3 = [vr[0] / vl, vr[1] / vl, vr[2] / vl];
  const n: W3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  let x0 = Infinity, x1 = -Infinity, h0 = Infinity, h1 = -Infinity, d0 = Infinity, d1 = -Infinity;
  for (const [a, b2] of pts) {
    const q: W3 = [o[0] + u[0] * a + v[0] * b2, o[1] + u[1] * a + v[1] * b2, o[2] + u[2] * a + v[2] * b2];
    x0 = Math.min(x0, q[0]);
    x1 = Math.max(x1, q[0]);
    h0 = Math.min(h0, q[1]);
    h1 = Math.max(h1, q[1]);
    d0 = Math.min(d0, q[2]);
    d1 = Math.max(d1, q[2]);
  }
  return {
    sd: (p) => {
      const w: W3 = [p[0] - o[0], p[1] - o[1], p[2] - o[2]];
      const a = w[0] * u[0] + w[1] * u[1] + w[2] * u[2], b2 = w[0] * v[0] + w[1] * v[1] + w[2] * v[2], c = w[0] * n[0] + w[1] * n[1] + w[2] * n[2];
      const d2 = sdPoly2(a, b2, pts);
      const dz = Math.abs(c) - t;
      return d2 > 0 && dz > 0 ? Math.hypot(d2, dz) : Math.max(d2, dz);
    },
    box: [x0 - t, h0 - t, d0 - t, x1 + t, h1 + t, d1 + t],
  };
}

function wUni(k: number, ...ps: WPrim[]): WPrim {
  const box = ps[0].box.slice() as WPrim['box'];
  for (const p of ps)
    for (let i = 0; i < 3; i++) {
      box[i] = Math.min(box[i], p.box[i] - k * 0.25);
      box[i + 3] = Math.max(box[i + 3], p.box[i + 3] + k * 0.25);
    }
  return {
    sd: (p) => {
      let d = ps[0].sd(p);
      for (let i = 1; i < ps.length; i++) d = smin(d, ps[i].sd(p), k);
      return d;
    },
    box,
  };
}

interface CamHit {
  x: number;
  y: number;
  p: W3;
  n: W3;
  light: number;
}

/**
 * Ray-marches a world-space shape through the battle camera into the buffer. The camera ray for a
 * pixel runs away from the viewer and down: (0, -K, 1). `paint` returns [palette, step] or null to
 * leave the pixel. The world origin projects to (ox, oy).
 */
function solidCam(b: Buf, prim: WPrim, ox: number, oy: number, part: number, paint: (h: CamHit) => [number, number] | null): void {
  const [X0, H0, D0, X1, H1, D1] = prim.box;
  const sy0 = oy - H1 - KOI_K * D1, sy1 = oy - H0 - KOI_K * D0;
  const rl = Math.hypot(1, KOI_K);
  for (let y = Math.max(0, Math.floor(sy0) - 1); y <= Math.min(b.h - 1, Math.ceil(sy1) + 1); y++)
    for (let x = Math.max(0, Math.floor(ox + X0) - 1); x <= Math.min(b.w - 1, Math.ceil(ox + X1) + 1); x++) {
      const X = x + 0.5 - ox, c = oy - (y + 0.5);
      // Start where the ray enters the box's depth range.
      let D = Math.max(D0 - 1, (c - H1 - 1) / KOI_K);
      const Dend = Math.min(D1 + 1, (c - H0 + 1) / KOI_K);
      let hit = false;
      for (let i = 0; i < 80 && D <= Dend; i++) {
        const d = prim.sd([X, c - KOI_K * D, D]);
        if (d < 0.02) {
          hit = true;
          break;
        }
        D += Math.max(d * 0.85, 0.03) / rl;
      }
      if (!hit) continue;
      const p: W3 = [X, c - KOI_K * D, D];
      const e = 0.25;
      let nx = prim.sd([p[0] + e, p[1], p[2]]) - prim.sd([p[0] - e, p[1], p[2]]);
      let nh = prim.sd([p[0], p[1] + e, p[2]]) - prim.sd([p[0], p[1] - e, p[2]]);
      let nd = prim.sd([p[0], p[1], p[2] + e]) - prim.sd([p[0], p[1], p[2] - e]);
      const nl = Math.hypot(nx, nh, nd) || 1;
      nx /= nl;
      nh /= nl;
      nd /= nl;
      // Same light as the landmarks: screen x, screen down = -H, toward the viewer = -D.
      const light = wrapLight(nx, -nh, -nd, 0.4);
      const r = paint({ x, y, p, n: [nx, nh, nd], light });
      if (r) b.put(x, y, r[0], r[1], part);
    }
}

// --- the fish -------------------------------------------------------------------------------

/** Body half-width (across) and half-height along the spine, s = 0 nose .. 1 tail root. */
function koiGirth(s: number): [number, number] {
  const k = s < 0.3 ? 0.5 + 0.5 * Math.sin((s / 0.3) * (Math.PI / 2)) : 1 - 0.8 * ((s - 0.3) / 0.7) ** 1.15;
  return [2.75 * k, 2.5 * k];
}

interface KoiPose {
  /** Body center in world px (relative to the anchor on the water line). */
  c: W3;
  /** Pitch (radians, nose up positive) and roll of nothing: koi stay upright. */
  pitch: number;
  /** Lateral wave: phase (0..1) and amplitude scale. */
  phase: number;
  amp: number;
  /** Extra sideways curl of the whole body (radians over its length), for the leap. */
  curl?: number;
  /** Pectoral fin beat (-1..1). */
  fin: number;
}

const KOI_LEN = 16; // nose to tail root (px); with the head and the tail fan the koi is 0.4 m (23 px)

interface KoiBody {
  /** Far pectoral fin, body (with the dorsal fin), tail fan, near pectoral fin. */
  parts: WPrim[];
  /** Spine samples in fish space (x along, d across), nose first. */
  spine: [number, number][];
  toFish: (p: W3) => W3;
  toWorld: (q: W3) => W3;
}

function koiBody(pose: KoiPose): KoiBody {
  const N = 12;
  const spine: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const x = KOI_LEN * (0.62 - s);
    // The wave runs from the head to the tail; its amplitude grows toward the tail.
    const A = (0.25 + 1.5 * s * s) * pose.amp;
    const d = A * Math.sin(2 * Math.PI * (pose.phase - s * 0.85)) + (pose.curl ?? 0) * KOI_LEN * s * s * 0.5;
    spine.push([x, d]);
  }
  const parts: WPrim[] = [];
  for (let i = 0; i < N; i++) {
    const s = (i + 0.5) / N;
    const [ax, ad] = spine[i], [bx, bd] = spine[i + 1];
    const yaw = Math.atan2(bd - ad, bx - ax) - Math.PI;
    const [ww, hh] = koiGirth(s);
    const seg = Math.hypot(bx - ax, bd - ad);
    parts.push(wEll([(ax + bx) / 2, 0, (ad + bd) / 2], [seg * 0.95, hh, ww], -yaw));
  }
  // Head: a rounder nose.
  const [nx0, nd0] = spine[0];
  parts.push(wEll([nx0 - 0.6, -0.15, nd0], [1.9, 1.5, 1.45]));
  const body = wUni(1.6, ...parts);
  // Tail fan: a forked outline in the vertical plane through the tail root, turned with the tail.
  const [tx, td] = spine[N], [px2, pd2] = spine[N - 1];
  const tyaw = Math.atan2(td - pd2, tx - px2);
  const tu: W3 = [Math.cos(tyaw), 0, Math.sin(tyaw)];
  const fan: P2[] = [[-0.8, 0.7], [1.6, 1.5], [4.4, 3.2], [5.9, 3.7], [6.3, 3.0], [5.3, 1.2], [4.9, 0], [5.3, -1.2], [6.3, -3.0], [5.9, -3.7], [4.4, -3.2], [1.6, -1.5], [-0.8, -0.7]];
  const tail = wPlate([tx, 0, td], tu, [0, 1, 0], fan, 0.3);
  // Dorsal fin along the back, low and long.
  const [dx0, dd0] = spine[4], [dx1, dd1] = spine[8];
  const dorsal = wPlate([dx0, koiGirth(0.33)[1] - 0.5, dd0], [(dx1 - dx0) / Math.hypot(dx1 - dx0, dd1 - dd0), 0, (dd1 - dd0) / Math.hypot(dx1 - dx0, dd1 - dd0)], [0, 1, 0], [[0.4, 0], [1.4, 1.2], [3.4, 1.1], [7.2, 0.2], [7.2, -0.6], [0, -0.6]], 0.3);
  // Pectoral fins: paddles out to each side behind the head, swept back and a little down.
  const [qx, qd] = spine[3];
  const [qw, qh] = koiGirth(0.25);
  const fins: WPrim[] = [];
  for (const side of [-1, 1]) {
    const sweep = 0.95 + pose.fin * 0.18 * side;
    const u: W3 = [-Math.sin(sweep), -0.22, side * Math.cos(sweep)];
    const ul = Math.hypot(...u);
    const uu: W3 = [u[0] / ul, u[1] / ul, u[2] / ul];
    fins.push(wPlate([qx + 0.3, -qh * 0.35, qd + side * qw * 0.8], uu, [1, 0, 0], [[0, -0.6], [1.3, -1.0], [2.7, -0.6], [3.1, 0.2], [2.4, 0.9], [0.6, 0.8]], 0.28));
  }
  const trunk = wUni(0.5, body, dorsal);
  // Fish space to world: pitch about the body center (nose up positive), then move.
  const cp = Math.cos(pose.pitch), sp = Math.sin(pose.pitch);
  const toFish = (p: W3): W3 => {
    const x = p[0] - pose.c[0], h = p[1] - pose.c[1];
    return [x * cp + h * sp, -x * sp + h * cp, p[2] - pose.c[2]];
  };
  const toWorld = (q: W3): W3 => [pose.c[0] + q[0] * cp - q[1] * sp, pose.c[1] + q[0] * sp + q[1] * cp, pose.c[2] + q[2]];
  const place = (w: WPrim): WPrim => {
    const fb = w.box;
    const corners: W3[] = [];
    for (const a of [fb[0], fb[3]]) for (const h of [fb[1], fb[4]]) for (const d of [fb[2], fb[5]]) corners.push(toWorld([a, h, d]));
    const box: WPrim['box'] = [
      Math.min(...corners.map((q) => q[0])), Math.min(...corners.map((q) => q[1])), Math.min(...corners.map((q) => q[2])),
      Math.max(...corners.map((q) => q[0])), Math.max(...corners.map((q) => q[1])), Math.max(...corners.map((q) => q[2])),
    ];
    return { sd: (p) => w.sd(toFish(p)), box };
  };
  // fins[1] points away from the viewer (+D): it is the far fin.
  return { parts: [place(fins[1]), place(trunk), place(tail), place(fins[0])], spine, toFish, toWorld };
}

/** Where a fish-space point sits along the body: s (0 nose .. 1 tail root), and its angle around (0 near flank, PI/2 back). */
function koiCoords(spine: [number, number][], q: W3): { s: number; around: number; fin: boolean } {
  let best = Infinity, bs = 0, bd = 0;
  const N = spine.length - 1;
  for (let i = 0; i < N; i++) {
    const [ax, ad] = spine[i], [bx, bd2] = spine[i + 1];
    const ex = bx - ax, ed = bd2 - ad;
    const t = clamp(((q[0] - ax) * ex + (q[2] - ad) * ed) / (ex * ex + ed * ed), 0, 1);
    const dd = Math.hypot(q[0] - ax - ex * t, q[2] - ad - ed * t);
    if (dd < best) {
      best = dd;
      bs = (i + t) / N;
      bd = q[2] - (ad + ed * t);
    }
  }
  const [ww, hh] = koiGirth(clamp(bs, 0, 1));
  const tailX = spine[N][0];
  const fin = q[0] < tailX - 0.3 || Math.hypot(q[1] / hh, bd / ww) > 1.25;
  return { s: bs, around: Math.atan2(q[1] / hh, -bd / ww), fin };
}

/** Kohaku patches: a head cap, a large saddle and a small spot before the tail (body coordinates). */
function koiPatch(s: number, around: number): boolean {
  const edge = (noise(s * 14, around * 1.6, 1, 61) - 0.5) * 0.06;
  const top = around + edge * 5;
  if (s > 0.07 + edge && s < 0.23 + edge && top > 0.2) return true;
  if (s > 0.31 + edge && s < 0.6 - edge && top > -0.35 + 1.4 * Math.max(0, (s - 0.5) / 0.1)) return true;
  if (s > 0.69 + edge && s < 0.84 + edge && top > 0.25) return true;
  return false;
}

/** Palettes sinking into the water: depth band 0 (just under the surface) to 2 (deeper). */
const KOI_PAL = (() => {
  const water = ramp(MATERIALS.water);
  const white = ramp(blend(MATERIALS.paper, '#ffffff', 0.15), { shift: 12, spread: 1.15 });
  // Hi (the red-orange of a kohaku): fire pulled toward lacquer red, highlights kept from going lemon.
  const orange = ramp(blend(MATERIALS.fire, MATERIALS.red, 0.4), { shift: 6 });
  const sink = (r: Color[], t: number): number => pal(r.map((c, i) => (i === 0 ? c : mix(c, water[Math.min(5, i + 1)], t))));
  return {
    white: [pal(white), sink(white, 0.12), sink(white, 0.26), sink(white, 0.45)],
    orange: [pal(orange), sink(orange, 0.1), sink(orange, 0.22), sink(orange, 0.4)],
    water,
  };
})();

const KOI_W = 96, KOI_H = 80, KOI_OX = 30, KOI_OY = 58;

/** Renders the koi; `wet` (default true) sinks the parts below the water line into the river. */
function koiFrame(pose: KoiPose, o: { wet?: boolean; cut?: number } = {}): { c: Canvas; sub: Uint8Array; body: KoiBody } {
  const b = new Buf(KOI_W, KOI_H);
  const body = koiBody(pose);
  const sub = new Uint8Array(KOI_W * KOI_H);
  const org = body.toWorld([0, 0, 0]);
  const tailX = body.spine[body.spine.length - 1][0];
  body.parts.forEach((prim, k) => {
    const isFin = k !== 1;
    // Far fin behind, then body, tail fan (the body's end overlaps its root), near fin in front.
    const part = b.newPart({ line: k === 3 ? 1 : k === 1 ? 1 : null, layer: [0, 2, 1, 3][k], lineSide: 'all' });
    solidCam(b, prim, KOI_OX, KOI_OY, part, (h) => {
      const q = body.toFish(h.p);
      const kc = koiCoords(body.spine, q);
      // Depth bands under the surface (world height < 0).
      const depth = -h.p[1];
      // Leaping: what is deeper than `cut` is lost in the churned water.
      if (o.cut !== undefined && depth > o.cut) return null;
      const band = depth < 0 ? 0 : depth < 1.8 ? 1 : depth < 3.8 ? 2 : 3;
      if (o.wet || depth > -0.8) sub[h.y * KOI_W + h.x] = 1;
      let step = quant(h.light, h.x - KOI_OX - org[0], h.y - KOI_OY + org[1], [0.2, 0.44, 0.8, 0.94], 0.06, 2.5, 13);
      if (isFin) {
        // Fins: thin and translucent, a band deeper into the water, with soft rays.
        const fb = Math.min(3, band + 1);
        if (k === 2) {
          const ray = Math.floor((Math.atan2(q[1], tailX - q[0] + 1.5) + 2) / 0.32);
          step = clamp(step, 2, 4) - (ray % 2 === 0 ? 1 : 0);
          // An orange blush at the root of the tail.
          if (q[0] > tailX - 1.6 && Math.abs(q[1]) < 1.6) return [KOI_PAL.orange[fb], clamp(step, 2, 3)];
        } else step = clamp(step, 2, 4);
        return [KOI_PAL.white[fb], Math.max(1, step)];
      }
      const orange = koiPatch(kc.s, kc.around);
      // Orange keeps its light step for the crest only.
      if (orange && step === 4 && h.light < 0.88) step = 3;
      return [(orange ? KOI_PAL.orange : KOI_PAL.white)[band], step];
    });
  });
  // Eye on the near side of the head.
  const e = body.toWorld([KOI_LEN * 0.62 - 1.3, 0.55, -1.2]);
  const ex = Math.floor(KOI_OX + e[0]), ey = Math.floor(KOI_OY - e[1] - KOI_K * e[2]);
  b.dot(ex, ey, P.dark, 1);
  const c = finish(b, { outline: false });
  // Outline: deep teal where the fish is under water, the usual near-black above it.
  const add: [number, number, Color][] = [];
  for (let y = 0; y < KOI_H; y++)
    for (let x = 0; x < KOI_W; x++) {
      if (c.alpha(x, y)) continue;
      let wet = false, dry = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!b.has(x + dx, y + dy)) continue;
        if (sub[(y + dy) * KOI_W + x + dx]) wet = true;
        else dry = true;
      }
      if (dry) add.push([x, y, mix(hex('#3a1e10'), hex(OUTLINE_INK), 0.55)]);
      else if (wet) add.push([x, y, mix(KOI_PAL.water[0], KOI_PAL.water[1], 0.35)]);
    }
  for (const [x, y, col] of add) c.set(x, y, col);
  return { c, sub, body };
}
const OUTLINE_INK = '#07060b';

// --- water effects --------------------------------------------------------------------------

/** Pixels of a ring on the water (an ellipse 2/3 as tall as wide), broken into arcs; angle 0 right, PI/2 front. */
function waterRing(c: Canvas, cx: number, cy: number, rx: number, alpha: number, seed: number, gaps = 0.35, color: Color = KOI_PAL.water[5], behind = false): void {
  if (alpha < 10 || rx < 1) return;
  const ry = rx * KOI_K;
  const n = Math.ceil(rx * 7);
  const seen = new Set<number>();
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2;
    if (hash(Math.floor((i / n) * 14), seed, 5) < gaps) continue;
    const x = Math.round(cx + Math.cos(th) * rx - 0.5), y = Math.round(cy + Math.sin(th) * ry - 0.5);
    if (seen.has(y * c.w + x)) continue;
    seen.add(y * c.w + x);
    // The near (front) half of the ring is brighter than the far half.
    const a = Math.sin(th) > 0 ? alpha : alpha * 0.65;
    if (behind && c.alpha(x, y)) continue;
    c.plot(x, y, withAlpha(color, a));
  }
}

/** Plots a pixel only where the canvas is empty (water effects stay behind the fish). */
function plotEmpty(c: Canvas, x: number, y: number, col: Color): void {
  if (c.alpha(Math.floor(x), Math.floor(y)) === 0) c.plot(x, y, col);
}

interface Drop {
  /** Launch frame, start (X, H), velocity (px per frame), size. */
  f0: number;
  x: number;
  h: number;
  vx: number;
  vh: number;
  big?: boolean;
}

/** Droplets in flight at frame f (gravity 1.5 px/frame^2); each drawn with a 1 px streak behind it. */
function drawDrops(c: Canvas, drops: Drop[], f: number): void {
  const g = 1.5;
  for (const d of drops) {
    const t = f - d.f0;
    if (t < 0) continue;
    const x = d.x + d.vx * t, h = d.h + d.vh * t - 0.5 * g * t * t;
    if (h < -0.5) continue;
    const sx = KOI_OX + x, sy = KOI_OY - h;
    const white = mix(KOI_PAL.water[5], hex('#ffffff'), 0.45);
    c.plot(sx, sy, white);
    if (d.big) c.plot(sx + 1, sy, KOI_PAL.water[5]);
    // Streak toward where it came from.
    const vh = d.vh - g * t;
    c.plot(sx - Math.sign(d.vx) * (Math.abs(d.vx) > 0.6 ? 1 : 0), sy + (vh > 0 ? 1 : -1), withAlpha(KOI_PAL.water[4], 150));
  }
}

/** A splash crown at a water entry: short upright jets around a ring, `k` 0..1 (rising, then falling). */
function crown(c: Canvas, cx: number, cy: number, rx: number, k: number): void {
  const jets: [number, number][] = [[-1, 0.2], [-0.6, -0.7], [-0.25, 0.85], [0.2, -0.9], [0.55, 0.75], [0.95, -0.2]];
  const white = mix(KOI_PAL.water[5], hex('#ffffff'), 0.55);
  // Foam where the water is thrown up: a broken rim of the crown on the surface.
  for (let u = -1; u <= 1.001; u += 0.25) {
    const x = Math.round(cx + u * rx), y = Math.round(cy + Math.sqrt(Math.max(0, 1 - u * u)) * rx * KOI_K * 0.8);
    c.plot(x, y, withAlpha(white, 220));
  }
  jets.forEach(([u, v], i) => {
    const x = Math.round(cx + u * rx), y0 = Math.round(cy + v * Math.sqrt(Math.max(0, 1 - u * u)) * rx * KOI_K);
    const hgt = Math.max(1, Math.round((v > 0 ? 3 : 4 + (i % 2)) * k));
    for (let j = 0; j < hgt; j++) c.plot(x + (j === hgt - 1 && u !== 0 ? Math.sign(u) * (k > 0.7 ? 1 : 0) : 0), y0 - j, j >= hgt - 2 ? white : withAlpha(KOI_PAL.water[5], 220));
  });
}

function koi(): WorldSprite {
  const swim: Canvas[] = [];
  for (let i = 0; i < 8; i++) {
    const t = i / 8;
    const { c } = koiFrame({ c: [0, -2.6, 0], pitch: 0, phase: t, amp: 1, fin: Math.sin(2 * Math.PI * t) }, { wet: true });
    // A faint V of ripples on the surface from the nose, dashes drifting back one pixel a frame.
    // The surface lies over the fish, so the near arm crosses it (fainter there).
    for (const side of [-1, 1])
      for (let u = 0; u < 16; u++) {
        const k = (u + i) % 8;
        // Dashes of three pixels; a dash cut short at either end of the arm is left out.
        if (k >= 3 || u - k < 0 || u - k + 2 > 15) continue;
        const X = 11.5 - u, D = side * (1.4 + u * 0.55);
        const a = 205 * (1 - u / 19);
        const x = KOI_OX + X, y = KOI_OY - KOI_K * D;
        c.plot(x, y, withAlpha(KOI_PAL.water[5], c.alpha(Math.floor(x), Math.floor(y)) ? a * 0.55 : a));
      }
    // The bow ripple just ahead of the nose.
    plotEmpty(c, KOI_OX + 13, KOI_OY + 1, withAlpha(KOI_PAL.water[5], 110));
    plotEmpty(c, KOI_OX + 13, KOI_OY + 2, withAlpha(KOI_PAL.water[5], 80));
    swim.push(c);
  }

  // Leap: the fish noses up, breaks the surface, arcs about 0.4 m up and one body length
  // forward, and dives back in. Rings spread from the takeoff and entry points; droplets fly.
  const path: { c: W3; pitch: number; phase: number; amp: number; curl?: number }[] = [
    { c: [1, -2.4, 0], pitch: 0.3, phase: 0.25, amp: 1.5 },
    { c: [4, 2.5, 0], pitch: 1.05, phase: 0.5, amp: 0.8 },
    { c: [8, 12, 0], pitch: 0.85, phase: 0.75, amp: 0.6 },
    { c: [12, 19.5, 0], pitch: 0.4, phase: 0.9, amp: 0.5, curl: 0.08 },
    { c: [16, 22, 0], pitch: -0.2, phase: 0.05, amp: 0.5, curl: 0.1 },
    { c: [20, 16, 0], pitch: -0.85, phase: 0.2, amp: 0.6 },
    { c: [23, 4, 0], pitch: -1.15, phase: 0.35, amp: 0.7 },
    { c: [24.5, -4, 0], pitch: -1.25, phase: 0.5, amp: 0.8 },
  ];
  // Where the body crosses the water line on the breach and on the entry (from the path's pitch).
  const cross = (p: { c: W3; pitch: number }): number => p.c[0] - p.c[1] / Math.tan(p.pitch);
  const takeoffX = Math.round(cross(path[1])), entryX = Math.round(cross(path[6]));
  const drops: Drop[] = [
    { f0: 1, x: 3, h: 1, vx: -0.8, vh: 3.2 },
    { f0: 1, x: 7, h: 1, vx: 0.9, vh: 3.6, big: true },
    { f0: 1, x: 5, h: 2, vx: 0.1, vh: 4.4 },
    { f0: 2, x: 4, h: 6, vx: -0.4, vh: 1.5 },
    { f0: 2, x: 6, h: 3, vx: 0.6, vh: 2.2 },
    { f0: 6, x: 22, h: 1, vx: -1.2, vh: 3.4, big: true },
    { f0: 6, x: 28, h: 1, vx: 1.3, vh: 3.0 },
    { f0: 7, x: 23, h: 1, vx: -0.9, vh: 4.6 },
    { f0: 7, x: 27, h: 1, vx: 0.8, vh: 5.0, big: true },
    { f0: 7, x: 25, h: 2, vx: 0.2, vh: 5.6 },
    { f0: 7, x: 21, h: 0, vx: -1.6, vh: 2.6 },
    { f0: 7, x: 29, h: 0, vx: 1.7, vh: 2.4 },
  ];
  const jump: Canvas[] = [];
  for (let f = 0; f < 10; f++) {
    let c: Canvas;
    if (f < path.length) {
      const p = path[f];
      c = koiFrame({ ...p, fin: f % 2 ? 1 : -1 }, { wet: f === 0, cut: f === 0 ? undefined : 4.5 }).c;
    } else c = new Canvas(KOI_W, KOI_H);
    const ty = KOI_OY;
    // Takeoff: a bulge before the breach, then a ring spreading and fading.
    // Anticipation: the nose lifts the surface into a low bulge, a ring of light around the head.
    if (f === 0) waterRing(c, KOI_OX + 10, ty + 1, 4.5, 190, 3, 0.15, KOI_PAL.water[5], true);
    if (f >= 2 && f <= 6) waterRing(c, KOI_OX + takeoffX, ty, 4 + (f - 2) * 2.6, 230 - (f - 2) * 48, 11 + f, 0.22);
    if (f >= 3 && f <= 6) waterRing(c, KOI_OX + takeoffX, ty, 2 + (f - 3) * 2.2, 170 - (f - 3) * 50, 41 + f, 0.4);
    if (f === 1) crown(c, KOI_OX + takeoffX - 1, ty, 3.5, 1);
    if (f === 2) crown(c, KOI_OX + takeoffX, ty, 4.5, 0.55);
    // Entry: crown, then two rings spreading.
    if (f === 6) crown(c, KOI_OX + entryX - 1, ty, 3, 0.7);
    if (f === 7) crown(c, KOI_OX + entryX, ty, 4, 1.1);
    if (f === 8) crown(c, KOI_OX + entryX, ty, 5.5, 0.6);
    if (f >= 7) waterRing(c, KOI_OX + entryX, ty, 5 + (f - 7) * 3.2, 240 - (f - 7) * 55, 21 + f, 0.2);
    if (f >= 8) waterRing(c, KOI_OX + entryX, ty, 2.5 + (f - 8) * 2.6, 200 - (f - 8) * 60, 31 + f, 0.35);
    drawDrops(c, drops, f);
    jump.push(c);
  }
  return assemble('koi', 'Koi', [0.4, 0.12], ['animal', 'ambient', 'water'], { swim: { frames: swim, fps: 8 }, jump: { frames: jump, fps: 12, loop: false } }, KOI_OX, KOI_OY);
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

/** Frames side by side at a fixed scale, cropped to their common opaque bounds (+2 px), with a faint pixel grid. */
function inspect(path: string, frames: Canvas[], k = 12, bg = '#5d6b57'): void {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of frames) {
    const bb = f.bounds();
    if (!bb) continue;
    x0 = Math.min(x0, bb[0]);
    y0 = Math.min(y0, bb[1]);
    x1 = Math.max(x1, bb[2]);
    y1 = Math.max(y1, bb[3]);
  }
  if (x1 < 0) return;
  x0 -= 2;
  y0 -= 2;
  x1 += 2;
  y1 += 2;
  const fw = x1 - x0 + 1, fh = y1 - y0 + 1;
  const row = new Canvas((fw + 1) * frames.length, fh);
  row.fillRect(0, 0, row.w, row.h, hex('#3a4438'));
  frames.forEach((f, i) => {
    row.fillRect(i * (fw + 1), 0, fw, fh, hex(bg));
    row.draw(f, i * (fw + 1) - x0, -y0);
  });
  const big = row.scaled(k);
  for (let y = 0; y < big.h; y++)
    for (let x = 0; x < big.w; x++) if (x % k === 0 || y % k === 0) big.plot(x, y, [0, 0, 0, 22]);
  big.save(path);
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

/** Where each animal shows in the owner's lineup: flyers float at a typical height, the koi sits in a strip of river. */
const LINEUP_LIFT: Record<string, number> = { butterfly_blue: m(0.9), butterfly_yellow: m(0.7), dragonfly: m(0.55), fireflies: m(0.95) };

/** All animals' first frames side by side next to the character (ground line, river strip under the koi), scaled `k`. */
function lineup(sprites: WorldSprite[], path: string, k = 4): void {
  const ref = characterRef();
  const items: { c: Canvas; ax: number; ay: number; lift: number; water: boolean }[] = [{ c: ref, ax: CHARACTER_FEET[0], ay: CHARACTER_FEET[1], lift: 0, water: false }];
  for (const s of sprites) {
    const f = Object.values(s.anims)[0].frames[0];
    const bb = f.bounds()!;
    // Trim each canvas to its first frame's opaque bounds (+2) so wide jump canvases don't pad the row.
    const t = new Canvas(bb[2] - bb[0] + 5, bb[3] - bb[1] + 5);
    t.draw(f, -bb[0] + 2, -bb[1] + 2);
    items.push({ c: t, ax: s.anchor[0] - bb[0] + 2, ay: s.anchor[1] - bb[1] + 2, lift: LINEUP_LIFT[s.name] ?? 0, water: s.name === 'koi' });
  }
  const gap = 10;
  const above = Math.max(...items.map((i) => i.ay + i.lift)) + 6, below = Math.max(...items.map((i) => i.c.h - i.ay - i.lift), 8) + 8;
  const W = items.reduce((t, i) => t + i.c.w + gap, gap), H = above + below;
  const out = new Canvas(W, H);
  out.fillRect(0, 0, W, H, hex('#5d6b57'));
  out.fillRect(0, above, W, below, hex('#4a5a3c'));
  let x = gap;
  for (const i of items) {
    if (i.water) {
      // A pool of the river under the koi (an ellipse 2/3 as tall as wide, like the camera sees it).
      const water = ramp(MATERIALS.water);
      const cx = x + i.ax, cy = above + 3, rx = i.c.w / 2 + 6, ry = rx * (38 / 57) * 0.5;
      out.fillEllipse(cx, cy, rx + 1, ry + 1, mix(water[1], hex('#4a5a3c'), 0.4));
      out.fillEllipse(cx, cy, rx, ry, mix(water[2], hex('#4a5a3c'), 0.25));
      out.fillEllipse(cx - 2, cy + 1, rx - 3, ry - 2, mix(water[3], hex('#4a5a3c'), 0.2));
    }
    if (i.lift) {
      // A faint shadow on the ground under a flyer.
      for (let dx = -2; dx <= 2; dx++) out.plot(x + i.ax + dx, above + 1, [20, 28, 18, Math.abs(dx) === 2 ? 50 : 90]);
    }
    out.draw(i.c, x, above - i.ay - i.lift);
    x += i.c.w + gap;
  }
  out.scaled(k).save(path);
}

/** Every animation as a strip of frames (one row per animation, grouped by animal), scaled `k`. */
function animSheet(sprites: WorldSprite[], path: string, k = 4): void {
  const rows: { s: WorldSprite; key: string; frames: Canvas[]; bb: [number, number, number, number] }[] = [];
  for (const s of sprites)
    for (const [key, a] of Object.entries(s.anims)) {
      if (a.frames.length < 2) continue;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const f of a.frames) {
        const b = f.bounds();
        if (!b) continue;
        x0 = Math.min(x0, b[0]);
        y0 = Math.min(y0, b[1]);
        x1 = Math.max(x1, b[2]);
        y1 = Math.max(y1, b[3]);
      }
      rows.push({ s, key, frames: a.frames, bb: [x0 - 2, y0 - 2, x1 + 2, y1 + 2] });
    }
  const gap = 4, pad = 6;
  const W = Math.max(...rows.map((r) => pad * 2 + r.frames.length * (r.bb[2] - r.bb[0] + 1 + gap)));
  const H = rows.reduce((t, r) => t + r.bb[3] - r.bb[1] + 1 + pad, pad);
  const out = new Canvas(W, H);
  out.fillRect(0, 0, W, H, hex('#45513f'));
  let y = pad;
  let last: WorldSprite | null = null;
  for (const r of rows) {
    const fw = r.bb[2] - r.bb[0] + 1, fh = r.bb[3] - r.bb[1] + 1;
    if (last && last !== r.s) out.fillRect(0, y - Math.ceil(pad / 2) - 1, W, 1, hex('#2c3429'));
    last = r.s;
    r.frames.forEach((f, i) => {
      const x = pad + i * (fw + gap);
      out.fillRect(x, y, fw, fh, hex('#5d6b57'));
      out.draw(f, x - r.bb[0], y - r.bb[1]);
    });
    // Anchor mark on the first frame (a dark tick under/over the anchor point).
    y += fh + pad;
  }
  out.scaled(k).save(path);
}

// FOCUS=frog,koi builds only those sprites and saves their inspection images (nothing else is written).
const FOCUS = process.env.FOCUS?.split(',');
const BUILDERS: [string, () => WorldSprite][] = [
  ['rabbit', rabbit],
  ['deer', deer],
  ['crow', crow],
  ['sparrow', sparrow],
  ['frog', frog],
  ['koi', koi],
  ['butterfly_blue', () => butterfly('butterfly_blue', 'Blue Swallowtail', BLUE_SET)],
  ['butterfly_yellow', () => butterfly('butterfly_yellow', 'Yellow Butterfly', YELLOW_SET)],
  ['dragonfly', dragonfly],
  ['fireflies', fireflies],
];
const sprites: WorldSprite[] = BUILDERS.filter(([n]) => !FOCUS || FOCUS.includes(n)).map(([, f]) => f());
if (!FOCUS) {
  writeGroup('animals', sprites);
  preview(sprites, join(previewDir(), 'animals.png'), { scale: 4, maxWidth: 480 });
  lineup(sprites, join(previewDir(), 'animals-lineup.png'), 4);
  animSheet(sprites, join(previewDir(), 'animals-anims.png'), 4);
}
debugSaves(sprites, previewDir());
for (const s of sprites) for (const [k, a] of Object.entries(s.anims)) inspect(join(previewDir(), `animals-${s.name}-${k}-x.png`), a.frames, Math.max(6, Math.min(16, Math.floor(1500 / ((a.frames[0].w + 1) * a.frames.length)))));
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
