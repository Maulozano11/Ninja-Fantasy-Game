// Plants for the battle maps: bushes and grass the party hides in, reeds for the river bank,
// ferns, wildflowers, lily pads and a mossy log with mushrooms.
//
//   npx tsx tools/world-sprites/plants.ts [previewDir]
//   PLANTS_ONLY=bush_round,fern npx tsx tools/world-sprites/plants.ts [previewDir]   (previews only, no write)
//
// Look (owner reference, Oct 13; machinery in foliage.ts): bushes are built from many small leaf
// clusters, each made of individual leaves, lit on their top-left edges with a warmer green and
// sinking into cool blue-green inside. Grass is individual tapered blades with silver-grass
// plumes; ferns are fronds of paired leaflets; reeds are twisting strap leaves with velvet cattail
// heads; flowers have real petals; lily pads have veins, a notch and a layered lotus; the log has
// furrowed bark, moss cushions and shelf fungi. 7-tone hue-shifted ramps, 1 px dark coloured
// outlines, inner lines only where a part stands in front of another.

import { join } from 'node:path';
import { Anim, Canvas, Color, MATERIALS, WorldSprite, hash, hex, lambert, m, noise, preview, previewDir, ramp, withAlpha, writeGroup } from './kit';
import { Buf, Cluster, Leaf, Mass, N4, PAL, Pt, Tube, TAU, canopy, clamp, composite, drawTube, frac, leafPixels, lerp, outlineBuf, ovalLeaves, paintLeaf, pal, putField, quad, rasterCluster, rnd, shade, smooth, spline } from './foliage';

// --- palettes --------------------------------------------------------------------------------

/** Leaves: 0 outline, 1-7 from cool blue-green shade to warm yellow-green light. */
const BUSH = pal(['#0a181a', '#11292a', '#173a34', '#1e4d39', '#2a633b', '#3f7b39', '#62973c', '#9bbb52']);
const GRASS = pal(['#0b1a17', '#13291f', '#1b3a25', '#27502a', '#37672d', '#508131', '#749d3b', '#acc65c']);
const FERN = pal(['#08181a', '#0f2828', '#153a33', '#1c4f39', '#27663c', '#3a7e3c', '#5a9a40', '#8fbb55']);
const REED = pal(['#111a0e', '#1e2d15', '#2c4219', '#3e5b1f', '#567627', '#759333', '#9fb04c']);
const LILY = pal(['#08181a', '#0f2a26', '#163c30', '#1e5136', '#2b6839', '#40803a', '#63993f', '#9bbb58']);
const SEED = pal(['#1f1a0e', '#3e3318', '#5e4e24', '#7f6a33', '#a08a48', '#c2ab66', '#e2d29a']);
const CATTAIL = pal(['#170d0b', '#2c1912', '#45271a', '#603822', '#7c4d2e', '#9a6943', '#bd9066']);
const BARK = pal(['#130d12', '#22171e', '#35272a', '#4c3a31', '#67513c', '#856d4e', '#a8926c']);
const MOSS = pal(['#0f180e', '#1a2a14', '#283e19', '#3a5520', '#526e27', '#708b31', '#98aa46']);
const WOOD = pal(['#2a1a16', '#4a3122', '#6c4c32', '#8c6a45', '#a98656', '#c4a26c', '#dcc28d']);
const FUNGUS = pal(['#1e1210', '#3c231a', '#64392a', '#8f5a3a', '#b88050', '#d6a66c', '#ecd09a']);
const CAP = pal(['#21130e', '#43261a', '#6a3d25', '#925a34', '#b47b48', '#d09f66', '#e8c794']);
const STALK = pal(['#2a2420', '#57493c', '#85735e', '#ad9b80', '#cdbfa2', '#e6dcc4', '#f6f0e0']);
const PINK = pal(['#3a0f24', '#6c1c3e', '#9c2f5a', '#c94f7e', '#e27ca0', '#f2a8c0', '#fcd8e4']);
const WHITE = pal(['#2c2a3a', '#58566e', '#8a8aa4', '#b4b6cc', '#d6d8e6', '#eceef4', '#ffffff']);
const BLUE = pal(['#1a1640', '#2e2a6e', '#463f9c', '#6058c4', '#7f7ade', '#a7a6ee', '#d4d4fa']);
const YELLOW = pal(['#3a2408', '#6b4610', '#a06d16', '#d29a22', '#ecbf3a', '#f6da6a', '#fff0a8']);
const LOTUS = pal(['#3a1028', '#6b1f45', '#a03a66', '#cf6690', '#e894b2', '#f6c2d4', '#fff0f4']);
const TEAL = pal(['#06201f', '#0d3a37', '#16594f', '#237d6b', '#38a58b', '#63c9aa', '#a6ecd2']);
const R_WATER = ramp(MATERIALS.water);
const R_TEAL = ramp('#38b3a0', { shift: 10 });

const FOLIAGE = new Set([BUSH, GRASS, FERN, REED, LILY]);
const prio = (p: number): number => (FOLIAGE.has(p) ? 2 : 1);
/** Value thresholds between the 7 leaf tones. */
const TH = [0.2, 0.3, 0.4, 0.5, 0.61, 0.73];

// --- helpers ---------------------------------------------------------------------------------

/**
 * Dark 1 px line on a part wherever a part well in front of it touches it. In 'shadow' mode only
 * on the side away from the light (the front part is up-left of the pixel), so lit edges stay clean.
 */
function innerLines(b: Buf, o: { step?: number; gap?: number; mode?: 'all' | 'shadow'; only?: (pal: number) => boolean } = {}): void {
  const st = o.step ?? 1, gap = o.gap ?? 0.5;
  const nb: Pt[] = o.mode === 'shadow' ? [[-1, 0], [0, -1]] : N4;
  const out: [number, number][] = [];
  for (let y = 0; y < b.h; y++)
    for (let x = 0; x < b.w; x++) {
      if (!b.has(x, y)) continue;
      if (o.only && !o.only(b.palAt(x, y))) continue;
      const p = b.partAt(x, y), d = b.zAt(x, y);
      for (const [ox, oy] of nb) {
        const q = b.partAt(x + ox, y + oy);
        if (q >= 0 && q !== p && b.zAt(x + ox, y + oy) > d + gap) {
          out.push([x, y]);
          break;
        }
      }
    }
  for (const [x, y] of out) if (b.stepAt(x, y) > st) b.setStep(x, y, st);
}

/**
 * Strokes a quadratic bezier `width(t)` px wide. A mostly vertical stroke spreads its width across
 * x, a flat one across y. `paint(t, side)` gives [palette, step] (side 0 = left/top .. 1 = right/bottom).
 */
function strokeQuad(b: Buf, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, width: (t: number) => number, paint: (t: number, side: number) => [number, number] | null, part: number, z: number): void {
  const len = Math.hypot(cx - x0, cy - y0) + Math.hypot(x1 - cx, y1 - cy);
  const n = Math.max(4, Math.ceil(len * 3));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [x, y, tx, ty] = quad(x0, y0, cx, cy, x1, y1, t);
    const w = width(t);
    const k = Math.max(1, Math.round(w));
    const vert = Math.abs(ty) >= Math.abs(tx);
    const off = Math.floor((k - 1) / 2);
    for (let j = 0; j < k; j++) {
      const px = vert ? Math.floor(x) + j - off : Math.floor(x);
      const py = vert ? Math.floor(y) : Math.floor(y) + j - off;
      const r = paint(t, k === 1 ? 0.5 : j / (k - 1));
      if (r) b.put(px, py, r[0], r[1], part, z);
    }
  }
}

/** Finishing: outline in each material's own dark colour, then colours. */
function toCanvas(b: Buf): Canvas {
  outlineBuf(b, prio);
  return b.toCanvas();
}

/** Draws `src` over `dst` with an extra opacity. */
function blit(dst: Canvas, src: Canvas, dx: number, dy: number, alpha = 1): void {
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const c = src.get(x, y);
      if (c[3]) dst.plot(dx + x, dy + y, withAlpha(c, c[3] * alpha));
    }
}

/** A small loose leaf (or petal) with its dark outline, for rustle effects. `ang` turns it as it tumbles. */
function looseBit(palId: number, steps: [number, number, number], ang: number, len = 5, wid = 3): Canvas {
  const b = new Buf(14, 14);
  paintLeaf(b, { x: 7 - Math.cos(ang) * len * 0.5, y: 7 - Math.sin(ang) * len * 0.5, ang, len, wid, kind: 'oval', tone: 0 }, palId, steps);
  return toCanvas(b);
}

interface RawAnim {
  frames: Canvas[];
  fps: number;
  loop?: boolean;
}

/**
 * Crops every frame of every animation to the union of their opaque bounds (+1 px margin), so all
 * frames share one size and one anchor. (gx, gy) is the ground contact point on the work canvas; the
 * anchor row snaps to the lowest opaque row of the first frame near gx (the outline under the base).
 */
function assemble(name: string, label: string, meters: [number, number], tags: string[], anims: Record<string, RawAnim>, gx: number, gy: number): WorldSprite {
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
  for (const [k, a] of Object.entries(anims)) {
    out[k] = {
      fps: a.fps,
      loop: a.loop ?? true,
      frames: a.frames.map((f) => {
        const c = new Canvas(w, h);
        c.draw(f, -x0, -y0);
        return c;
      }),
    };
  }
  const first = Object.values(anims)[0].frames[0];
  let ay = gy;
  for (let y = Math.min(first.h - 1, gy + 3); y >= 0; y--) {
    let hit = false;
    for (let x = gx - 4; x <= gx + 4; x++) if (first.alpha(x, y) >= 200) hit = true;
    if (hit) {
      ay = y;
      break;
    }
  }
  return { name, label, meters, anchor: [gx - x0, ay - y0], tags, anims: out };
}

// --- bushes ----------------------------------------------------------------------------------

/**
 * A bush is a few lobes covered in small leaf clusters (each made of individual oval leaves),
 * plus a dark skirt of clusters at its foot so it sits on the ground. Lobes sway as wholes.
 */
interface BushSpec {
  name: string;
  label: string;
  meters: [number, number];
  /** Lobes: [x, height of the centre above the ground, rx, ry]. */
  lobes: [number, number, number, number][];
  W: number;
  H: number;
  gx: number;
  ground: number;
  seed: number;
  /** Extra layer over the foliage (blossoms), given the cluster offsets. */
  extra?: (b: Buf, cl: Cluster[], offs: Pt[]) => void;
  /** Loose bits that fly off in the rustle: [palette, shadow, mid, light]. */
  bits: [number, number, number, number][];
}

function bushCanopy(s: BushSpec): { cl: Cluster[]; ras: ReturnType<typeof rasterCluster>[] } {
  const top = Math.min(...s.lobes.map(([, h, , ry]) => s.ground - h - ry));
  const hgt = s.ground - top;
  const left = Math.min(...s.lobes.map(([x, , rx]) => x - rx)), right = Math.max(...s.lobes.map(([x, , rx]) => x + rx));
  const masses: Mass[] = s.lobes.map(([x, h, rx, ry]) => ({ x: s.gx + x, y: s.ground - h, rx, ry, z: 60 - h, rz: Math.min(rx, ry) * 0.8, rag: 0.1 }));
  // The skirt: low, dark clusters along the ground between the outer lobes.
  masses.push({ x: s.gx + (left + right) / 2, y: s.ground - 4, rx: (right - left) / 2 - 14, ry: 5, z: -20, rz: 4, bias: -0.1, rag: 0.08 });
  const cl = canopy({
    masses, form: [s.gx + (left + right) / 2 - 2, top + hgt * 0.5, (right - left) / 2, hgt / 2], r: 6, spacing: 6.4, pal: BUSH, seed: s.seed, formMix: 0.55,
    leaves: (sd, r, nu, nv) => ovalLeaves(sd, r, { len: 5, wid: 3.1, droop: nv > 0.6 ? 0.9 : 0, nu, nv }),
  });
  for (const c of cl) {
    c.hf = clamp((s.ground - c.y) / hgt, 0, 1);
    // Near the ground the bush sits in its own shade.
    c.bias += -0.08 * smooth(s.ground - hgt * 0.35, s.ground, c.y);
  }
  return { cl, ras: cl.map((c) => rasterCluster(c, { sphere: 0.8, fold: 0.1 })) };
}

function bushFrame(s: BushSpec, C: { cl: Cluster[]; ras: ReturnType<typeof rasterCluster>[] }, offs: Pt[]): Canvas {
  const b = new Buf(s.W, s.H);
  const F = composite(s.W, s.H, C.cl, C.ras, offs, 0.6);
  shade(F, C.cl, { cast: 0.36, castD: 4, rim: 0.15, away: 0.09, lineGap: 9, leafSep: 0.07 });
  putField(b, F, C.cl, { th: TH });
  // Nothing below the ground line.
  for (let y = s.ground + 1; y < s.H; y++) for (let x = 0; x < s.W; x++) b.clear(x, y);
  s.extra?.(b, C.cl, offs);
  return toCanvas(b);
}

function bushSprite(s: BushSpec): WorldSprite {
  const C = bushCanopy(s);
  const n = C.cl.length;
  // Idle: the upper clusters drift 1 px right, back, 1 px left, back (the base never moves).
  const idle = [0, 1, 0, -1].map((p) => bushFrame(s, C, C.cl.map((c) => [c.hf > 0.5 ? p : 0, 0] as Pt)));
  // Rustle: squash back (anticipation), a hard shake that alternates between lobes, smaller swings, rest.
  const shake: Pt[] = [[-1, 1], [2, -1], [-2, 0], [1, 0], [-1, 0], [0, 0]];
  const top = Math.min(...s.lobes.map(([, h, , ry]) => s.ground - h - ry));
  const half = (Math.max(...s.lobes.map(([x, , rx]) => x + rx)) - Math.min(...s.lobes.map(([x, , rx]) => x - rx))) / 2;
  const paths: Pt[][] = [
    [[-0.45, 2], [-0.62, -7], [-0.8, -6], [-0.95, 1]],
    [[0.4, 1], [0.6, -9], [0.82, -8], [1.0, -1]],
    [[0.02, -1], [0.1, -12], [0.22, -13], [0.36, -9]],
  ];
  const rustle = shake.map(([dx, dy], f) => {
    const frame = bushFrame(
      s,
      C,
      C.cl.map((c) => {
        const alt = f >= 1 && f <= 2 && c.group % 2 ? 0.5 : 1;
        return [Math.round(dx * Math.max(0.35, c.hf) * alt), c.hf > 0.5 ? dy : 0] as Pt;
      }),
    );
    if (f >= 1 && f <= 4) {
      const t = f - 1;
      paths.forEach((p, k) => {
        const [px, py] = p[t];
        const bit = s.bits[k % s.bits.length];
        const leaf = looseBit(bit[0], [bit[1], bit[2], bit[3]], 0.6 + k * 1.7 + t * 1.3 * (k % 2 ? 1 : -1));
        blit(frame, leaf, Math.round(s.gx + px * half - 7), Math.round(top + py - 7), f === 4 ? 0.6 : 1);
      });
    }
    return frame;
  });
  void n;
  return assemble(s.name, s.label, s.meters, ['hide-spot', 'cover-half', 'flammable', 'destructible'], { idle: { frames: idle, fps: 4 }, rustle: { frames: rustle, fps: 12, loop: false } }, s.gx, s.ground);
}

const LEAF_BIT: [number, number, number, number] = [BUSH, 3, 5, 7];

function roundBush(): BushSpec {
  return {
    name: 'bush_round', label: 'Round Bush', meters: [1.3, 1.1], W: 150, H: 130, gx: 75, ground: 112, seed: 11,
    // One round mass with two softer lobes swelling out of it: one high on the right, one low in front.
    lobes: [[0, 32, 35, 31], [12, 46, 20, 16], [-6, 14, 27, 14], [-22, 30, 16, 16]],
    bits: [LEAF_BIT, LEAF_BIT, LEAF_BIT],
  };
}

function wideBush(): BushSpec {
  return {
    name: 'bush_wide', label: 'Wide Shrub', meters: [2, 0.9], W: 180, H: 110, gx: 90, ground: 94, seed: 23,
    // A long, low mound: a high crown left of centre, a lower one to the right, two front lobes.
    lobes: [[-18, 28, 31, 21], [26, 24, 29, 18], [-34, 12, 24, 13], [16, 11, 32, 13], [48, 14, 14, 12], [34, 22, 18, 13], [4, 30, 16, 14]],
    bits: [LEAF_BIT, LEAF_BIT, LEAF_BIT],
  };
}

function azaleaBush(): BushSpec {
  const W = 150, H = 120, gx = 75, ground = 104, seed = 37;
  const s: BushSpec = {
    name: 'bush_flower', label: 'Azalea Bush', meters: [1.4, 1], W, H, gx, ground, seed,
    lobes: [[-1, 28, 38, 28], [-12, 38, 21, 16], [8, 12, 28, 12], [22, 34, 16, 14]],
    bits: [LEAF_BIT, [PINK, 3, 4, 6], LEAF_BIT],
  };
  // Blossoms: 5-petal flowers on the front clusters of the lit side, two to four per truss,
  // riding with their cluster. Pink with a few white trusses.
  s.extra = (b, cl, offs) => {
    cl.forEach((c, i) => {
      if (c.z < 2 || c.y > ground - 8 || rnd(c.seed, 1) > 0.06 + c.form * 0.22) return;
      const white = rnd(c.seed, 2) < 0.18;
      const nF = 1 + Math.floor(rnd(c.seed, 3) * 3);
      for (let k = 0; k < nF; k++) {
        const a = rnd(c.seed, 4 + k) * TAU, d = k === 0 ? 0 : 3.2 + rnd(c.seed, 9 + k) * 1.2;
        const fx = Math.round(c.x + offs[i][0] + Math.cos(a) * d), fy = Math.round(c.y + offs[i][1] + Math.sin(a) * d * 0.8);
        if (!b.has(fx, fy + 1)) continue;
        blossom(b, fx, fy, white ? WHITE : PINK, c.form > 0.55, 5000 + i * 8 + k, 100 + k);
      }
    });
  };
  return s;
}

/**
 * A 5-petal flower about 5 px across: petals around a darker throat, the ones toward the light
 * brighter, a 1 px dark gap where the lower-right petals overlap the leaves (handled by outline).
 */
function blossom(b: Buf, cx: number, cy: number, palId: number, lit: boolean, part: number, z: number, centre = YELLOW, size = 1): void {
  const base = lit ? 5 : 4;
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k * TAU) / 5;
    const px = cx + 0.5 + Math.cos(a) * 1.3 * size, py = cy + 0.5 + Math.sin(a) * 1.2 * size;
    const toL = Math.cos(a) * -0.62 + Math.sin(a) * -0.79;
    for (let y = Math.floor(py - 1.4); y <= py + 1.4; y++)
      for (let x = Math.floor(px - 1.4); x <= px + 1.4; x++) {
        const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
        if (d > 0.95 * size + 0.15) continue;
        const st = base + (toL > 0.3 ? 1 : toL < -0.4 ? -1 : 0) + (d > 0.7 * size && toL < 0 ? -1 : 0);
        b.put(x, y, palId, clamp(st, 2, 6), part, z);
      }
  }
  b.put(cx, cy, centre, lit ? 5 : 4, part, z + 0.1);
}

// --- tall grass ------------------------------------------------------------------------------

interface Blade {
  bx: number;
  h: number;
  tipX: number;
  tipY: number;
  cx: number;
  cy: number;
  w: number;
  /** 0 back (tall, deep), 1 middle, 2 front (short, leaning out). */
  layer: number;
  z: number;
  /** A silver-grass plume on this stem. */
  plume: boolean;
}

function grassBlades(seed: number, cx: number, ground: number, height: number): Blade[] {
  const blades: Blade[] = [];
  const layers = [
    { n: 14, spread: 11, hMin: 0.7, hMax: 1.0, lean: 0.8, w: 2.6 },
    { n: 13, spread: 15, hMin: 0.48, hMax: 0.84, lean: 1.5, w: 3 },
    { n: 8, spread: 11, hMin: 0.22, hMax: 0.5, lean: 1.6, w: 2.6 },
  ];
  let k = 0;
  layers.forEach((L, li) => {
    for (let i = 0; i < L.n; i++, k++) {
      const fan = ((i + 0.5) / L.n) * 2 - 1;
      const bx = cx + fan * L.spread + (rnd(seed, k, 1) - 0.5) * 3;
      const h = height * (L.hMin + (L.hMax - L.hMin) * rnd(seed, k, 2)) * (1 - Math.abs(fan) * 0.28);
      const lean = fan * 8 * L.lean + (rnd(seed, k, 3) - 0.5) * 5;
      // The outer middle blades arch over and droop; the rest stand up.
      const arch = li === 1 && Math.abs(fan) > 0.55 && rnd(seed, k, 4) < 0.8;
      blades.push({
        bx, h, tipX: bx + lean * (arch ? 1.45 : 1), tipY: ground - h * (arch ? 0.7 : 1), cx: bx + lean * (arch ? 0.6 : 0.2), cy: ground - h * (arch ? 1.08 : 0.6),
        w: L.w, layer: li, z: rnd(seed, k, 5), plume: false,
      });
    }
  });
  // Four tall stems carrying drooping silver-grass plumes.
  [[-6, 1.12, -10], [3, 1.22, 8], [10, 1.02, 15], [-12, 0.98, -15]].forEach(([ox, hk, lean], i) => {
    const bx = cx + ox, h = height * hk;
    blades.push({ bx, h, tipX: bx + lean, tipY: ground - h, cx: bx + lean * 0.25, cy: ground - h * 0.6, w: 1, layer: 0, z: 0.5 + i * 0.1, plume: true });
  });
  return blades.sort((a, b) => a.layer - b.layer || a.z - b.z);
}

/** Draws blades and plumes; `bend(bl)` adds a tip displacement in px for the frame. */
function drawBlades(b: Buf, blades: Blade[], ground: number, bend: (bl: Blade) => number, seed: number): void {
  blades.forEach((bl, i) => {
    const d = bend(bl);
    const back = bl.layer === 0;
    const z = bl.layer * 10 + bl.z;
    if (bl.plume) {
      // A thin stem nodding over at the top, carrying a fuzzy seed head (a bristly spike) that
      // hangs along the curve: pale straw, lit on its upper-left side, bristles poking out.
      const x1 = bl.tipX + d, y1 = bl.tipY + Math.abs(d) * 0.2;
      strokeQuad(b, bl.bx, ground, bl.cx + d * 0.4, bl.cy, x1, y1, () => 1, (t) => [t < 0.45 ? GRASS : SEED, t < 0.45 ? 3 : 2], 500 + i, z);
      const dir = Math.sign(bl.tipX - bl.bx) || 1;
      const L = 10 + rnd(seed, i, 20) * 3;
      // The head arches: it leaves the stem rising up and out, then nods over.
      let x = x1, y = y1;
      for (let k = 0; k <= L; k++) {
        const t = k / L;
        const th = lerp(-1.25, 0.75, t);
        x += dir * Math.cos(th) * 0.9;
        y += Math.sin(th) * 0.9;
        const r = 1.5 * Math.sin(Math.PI * Math.min(1, 0.12 + t * 0.95));
        for (let q = -2; q <= 2; q++) {
          // Thickness across the arc (mostly vertical offset where the head runs flat).
          const u = q / Math.max(0.6, r);
          if (Math.abs(u) > 1.05) continue;
          const px = Math.round(x - Math.sin(th) * q * dir), py = Math.round(y + Math.cos(th) * q);
          const st = u < -0.3 ? 5 : u > 0.4 ? 3 : 4;
          b.put(px, py, SEED, k < 2 ? st - 1 : st, 500 + i, z + 0.2);
        }
        // Bristles poking out of the upper side.
        if (k % 2 === 0 && k > 1 && k < L - 1) b.put(Math.round(x + Math.sin(th) * (r + 1.3) * dir), Math.round(y - Math.cos(th) * (r + 1.3)), SEED, 6, 500 + i, z + 0.2);
      }
      return;
    }
    const tipLit = rnd(seed, i, 11) < (back ? 0.4 : 0.7);
    strokeQuad(
      b, bl.bx, ground, bl.cx + d * 0.4, bl.cy, bl.tipX + d, bl.tipY + Math.abs(d) * 0.15,
      (t) => bl.w * (1 - t * 0.75) + 0.3,
      (t, side) => {
        // Cool dark base (ending at a different height on every blade), warm lit tip.
        const foot = 0.12 + rnd(seed, i, 12) * 0.16;
        let st = t < foot ? 2 : t < 0.42 ? 3 : t < 0.72 ? 4 : 5;
        if (back) st -= 1;
        // The left edge of a blade faces the light, the right edge sinks.
        if (side < 0.3 && t > foot && bl.w > 1.5) st += 1;
        else if (side > 0.7) st -= 1;
        if (t > 0.88 && tipLit) st = Math.max(st, back ? 5 : 6);
        if (t > 0.94 && tipLit && !back && rnd(seed, i, 13) < 0.5) st = 7;
        return [GRASS, clamp(st, 1, 7)];
      },
      i, z,
    );
  });
}

function tallGrass(): WorldSprite {
  const W = 120, H = 110, cx = 60, ground = 96, height = m(0.8);
  const seed = 51;
  const blades = grassBlades(seed, cx, ground, height);
  const frame = (bend: (bl: Blade) => number, bits?: (c: Canvas) => void): Canvas => {
    const b = new Buf(W, H);
    drawBlades(b, blades, ground, bend, seed);
    innerLines(b, { step: 1, gap: 3, mode: 'all', only: (p) => p === GRASS });
    const c = toCanvas(b);
    bits?.(c);
    return c;
  };
  // Idle: a wind wave crossing from left to right; tips move up to 2 px, the base stays put.
  const idle = Array.from({ length: 6 }, (_, f) => frame((bl) => Math.round((0.3 + 1.9 * (bl.h / height)) * Math.sin(((f + 0.5) / 6) * TAU - (bl.bx - cx) * 0.06))));
  // Rustle: blades squeeze in, part to both sides as someone pushes through, overshoot and settle.
  const part = [-1, 6, 4, -2, 1, 0];
  const paths: Pt[][] = [
    [[-6, -2], [-11, -9], [-15, -8], [-19, -2]],
    [[5, -3], [10, -11], [14, -10], [18, -4]],
  ];
  const rustle = part.map((a, f) =>
    frame(
      (bl) => Math.round(a * Math.sign(bl.bx - cx + 0.5) * (0.4 + 0.6 * Math.min(1, bl.h / height))),
      (c) => {
        if (f < 1 || f > 4) return;
        const t = f - 1;
        paths.forEach((p, k) => {
          const leaf = looseBit(GRASS, [3, 4, 6], 0.3 + k * 2.1 + t * 1.5 * (k ? 1 : -1), 6, 2.2);
          blit(c, leaf, Math.round(cx + p[t][0] - 7), Math.round(ground - height + p[t][1] - 7), f === 4 ? 0.6 : 1);
        });
      },
    ),
  );
  return assemble('tall_grass', 'Tall Grass', [1, 0.8], ['hide-spot', 'flammable'], { idle: { frames: idle, fps: 5 }, rustle: { frames: rustle, fps: 12, loop: false } }, cx, ground);
}

// --- reeds -----------------------------------------------------------------------------------

function cattails(): WorldSprite {
  const W = 100, H = 140, cx = 50, ground = 126, height = m(1.5), halfW = m(0.8) / 2;
  const seed = 63;
  // Strap leaves fan from a tight clump; a few arch over and hang their tips. Each strap twists
  // once: where it turns, its lit and shaded faces swap.
  const leaves = Array.from({ length: 13 }, (_, i) => {
    const fan = (i / 12 - 0.5) * 2;
    const h = height * (0.42 + rnd(seed, i, 1) * 0.36) * (1 - Math.abs(fan) * 0.3);
    const arch = Math.abs(fan) > 0.3 && rnd(seed, i, 2) < 0.5;
    const lean = fan * halfW * 0.75 + (rnd(seed, i, 3) - 0.5) * 6;
    return { bx: cx + fan * 4, h, lean, arch, back: i % 3 === 1, z: rnd(seed, i, 4), twist: 0.35 + rnd(seed, i, 5) * 0.4 };
  });
  // Stems with their brown heads: [x offset, height, lean, head length].
  const stems: [number, number, number, number][] = [
    [-2, height * 0.93, -5, 15],
    [2, height * 0.85, 6, 14],
    [6, height * 0.74, 13, 12],
    [-6, height * 0.66, -12, 12],
  ];
  const frame = (f: number): Canvas => {
    const b = new Buf(W, H);
    const sway = (h: number, x: number): number => Math.round(Math.sin(((f + 0.5) / 6) * TAU - (x - cx) * 0.06) * (0.3 + 2.2 * (h / height)));
    leaves
      .slice()
      .sort((a, b2) => (a.back === b2.back ? a.z - b2.z : a.back ? -1 : 1))
      .forEach((l, i) => {
        const d = sway(l.h, l.bx);
        const dep = l.back ? l.z : 1 + l.z;
        const paint = (t: number, side: number): [number, number] => {
          let st = t < 0.16 ? 1 : t < 0.4 ? 2 : t < 0.75 ? 3 : 4;
          const flip = t > l.twist ? -1 : 1;
          const s2 = flip > 0 ? side : 1 - side;
          if (s2 < 0.4 && t > 0.2) st += 1;
          else if (s2 > 0.6) st -= 1;
          if (Math.abs(t - l.twist) < 0.03) st = 2;
          if (l.back) st -= 1;
          return [REED, clamp(st, 1, 6)];
        };
        const wd = (t: number) => (t < 0.2 ? 3.4 : t < 0.6 ? 2.6 : t < 0.85 ? 1.8 : 1);
        if (!l.arch) strokeQuad(b, l.bx, ground, l.bx + l.lean * 0.2 + d * 0.3, ground - l.h * 0.6, l.bx + l.lean + d, ground - l.h, wd, paint, i, dep);
        else strokeQuad(b, l.bx, ground, l.bx + l.lean * 0.45 + d * 0.5, ground - l.h * 1.08, l.bx + l.lean * 1.45 + d, ground - l.h * 0.66, wd, paint, i, dep);
      });
    stems.forEach(([ox, h, lean, head], i) => {
      const bx = cx + ox;
      const d = sway(h, bx);
      const x1 = bx + lean + d, y1 = ground - h;
      const c1x = bx + lean * 0.3 + d * 0.3, c1y = ground - h * 0.55;
      const part = 50 + i, dep = 3 + i * 0.1;
      strokeQuad(b, bx, ground, c1x, c1y, x1, y1, (t) => (t < 0.55 ? 2 : 1), (t, side) => [REED, side > 0.6 ? 2 : t > 0.5 ? 4 : 3], part, dep);
      // Head: a velvet cylinder along the stem, lit on the left with a soft sheen band, dark on
      // the right, rounded ends; then a thin spike with pale pollen at its tip.
      const t0 = 1 - (head + 7) / h, t1 = 1 - 7 / h;
      for (let t = t0; t <= t1; t += 0.25 / h) {
        const [x, y] = quad(bx, ground, c1x, c1y, x1, y1, t);
        const e = (t - t0) / (t1 - t0);
        const r = 3 * Math.min(1, Math.sin(Math.PI * e) * 2.4);
        for (let ox2 = -4; ox2 <= 4; ox2++) {
          const u = (ox2 + 0.5) / Math.max(0.9, r);
          if (Math.abs(u) > 1) continue;
          let st = u < -0.55 ? 5 : u < -0.1 ? 4 : u < 0.45 ? 3 : 2;
          if (e < 0.08 || e > 0.94) st = Math.max(2, st - 1);
          if (st === 5 && e > 0.18 && e < 0.42) st = 6;
          if (Math.abs(u) > 0.85) st = Math.max(1, st - 1);
          if (hash(Math.floor(x) + ox2, Math.floor(y), 9 + i) < 0.12) st = Math.max(1, st - 1);
          b.put(Math.floor(x) + ox2, Math.floor(y), CATTAIL, st, part, dep + 0.05);
        }
      }
      const [sx, sy] = quad(bx, ground, c1x, c1y, x1, y1, t1);
      strokeQuad(b, sx, sy, x1 + 0.2, y1 - 3, x1 + 0.4, y1 - 6, () => 1, (t) => (t > 0.75 ? [SEED, 5] : [REED, 3]), part, dep);
    });
    innerLines(b, { step: 1, gap: 0.6, mode: 'all' });
    return toCanvas(b);
  };
  const idle = Array.from({ length: 6 }, (_, f) => frame(f));
  return assemble('reeds', 'Cattail Reeds', [0.8, 1.5], ['hide-spot', 'water', 'flammable'], { idle: { frames: idle, fps: 5 } }, cx, ground);
}

// --- fern ------------------------------------------------------------------------------------

/** Points along an arching frond every 0.5 px: [x, y, direction (rad from vertical, + = right)]. */
function frondPath(x0: number, y0: number, a0: number, a1: number, len: number, bend = 1.4): [number, number, number][] {
  const pts: [number, number, number][] = [];
  let x = x0, y = y0;
  const n = Math.ceil(len * 2);
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * Math.pow(i / n, bend);
    pts.push([x, y, a]);
    x += Math.sin(a) * 0.5;
    y -= Math.cos(a) * 0.5;
  }
  return pts;
}

function fern(): WorldSprite {
  const W = 110, H = 70, cx = 55, ground = 58;
  // Fronds: [start angle, end angle (deg from vertical, + = right), length, layer 0 back / 1 side / 2 front].
  const F: [number, number, number, number][] = [
    [-3, -76, 40, 0],
    [6, 80, 39, 0],
    [-26, -116, 33, 1],
    [28, 120, 34, 1],
    [-52, -150, 26, 1],
    [54, 152, 26, 1],
    [-12, -150, 19, 2],
    [16, 156, 18, 2],
  ];
  const deg = Math.PI / 180;
  const frame = (f: number): Canvas => {
    const b = new Buf(W, H);
    F.forEach(([a0, a1, L, layer], i) => {
      const side = Math.sign(a1);
      const pts = frondPath(cx + side * 0.5, ground - 1, a0 * deg, a1 * deg, L, 1.7);
      // Sway: the outer half shifts by whole pixels (rigid, so nothing shimmers); the base stays put.
      const sw = [0, 1, 0, -1][(f + i) % 4] * (layer === 2 ? 0 : 1);
      const off = (k: number): number => (k / (pts.length - 1) > 0.5 ? sw : 0);
      const steps: [number, number, number] = layer === 0 ? [1, 2, 4] : layer === 1 ? [2, 4, 6] : [3, 5, 7];
      const z = layer * 2 + i * 0.1;
      // Leaflets in pairs pointing forward along the rachis, longest a third of the way out and
      // tiny at the tip; each is lit on the half that faces the light.
      const pmax = layer === 2 ? 5.5 : 7.5;
      for (let s = 2.2, j = 0; s < L - 0.5; s += 2.3, j++) {
        const k = Math.min(pts.length - 1, Math.round(s * 2));
        const [px, py, a] = pts[k];
        const u = s / L;
        const pl = Math.max(1.6, pmax * Math.pow(Math.sin(Math.PI * clamp(u * 0.9 + 0.1, 0, 1)), 0.6) * (1 - 0.55 * u));
        for (const sgn of [-1, 1]) {
          const pa = a + sgn * 1.05 - Math.PI / 2;
          const lf: Leaf = { x: px + 0.5 + off(k), y: py + 0.5, ang: pa, len: pl, wid: Math.min(2.6, 1.2 + pl * 0.25), kind: 'oval', tone: 0 };
          const st: [number, number, number] = u < 0.18 ? [steps[0], steps[0], steps[1]] : steps;
          paintLeaf(b, lf, FERN, st, i, z);
        }
      }
      pts.forEach(([x, y], k) => b.put(Math.round(x) + off(k), Math.round(y), FERN, k / pts.length < 0.3 ? 1 : 2, i, z + 0.01));
    });
    // A young fiddlehead curling up in the middle.
    const fx = cx, fy = ground - 21;
    strokeQuad(b, cx, ground - 1, cx + 1, ground - 11, fx, fy + 3, () => 1, () => [FERN, 3], 40, 1.5);
    const curl: [number, number, number][] = [[0, 2, 4], [0, 1, 4], [0, 0, 5], [1, -1, 6], [2, -1, 5], [3, 0, 4], [3, 1, 3], [2, 2, 3], [1, 1, 2]];
    for (const [dx, dy, st] of curl) b.put(fx + dx, fy + dy, FERN, st, 40, 1.5);
    innerLines(b, { step: 1, gap: 1, mode: 'all' });
    return toCanvas(b);
  };
  const idle = Array.from({ length: 4 }, (_, f) => frame(f));
  return assemble('fern', 'Fern', [0.9, 0.6], ['ambient'], { idle: { frames: idle, fps: 5 } }, cx, ground);
}

// --- wildflowers -----------------------------------------------------------------------------

function wildflowers(): WorldSprite {
  const W = 80, H = 46, cx = 40, ground = 36, height = m(0.32), halfW = m(0.8) / 2;
  const seed = 83;
  type Kind = 'daisy' | 'bell' | 'pink';
  const kinds: Kind[] = ['daisy', 'bell', 'pink', 'daisy', 'bell', 'daisy', 'pink', 'bell', 'daisy', 'pink'];
  const heads = kinds.map((kind, i) => {
    const x = cx - halfW + 5 + (i / (kinds.length - 1)) * (halfW * 2 - 10) + (rnd(seed, i, 1) - 0.5) * 3;
    const h = height * (0.55 + rnd(seed, i, 2) * 0.45) * (1 - Math.abs(x - cx) / (halfW * 2.4));
    return { x, h, kind, lean: (rnd(seed, i, 3) - 0.5) * 5 };
  });
  // The leafy base: short blades and a few small round leaves in two layers.
  const blades = Array.from({ length: 22 }, (_, i) => {
    const fan = ((i + 0.5) / 22) * 2 - 1;
    const x = cx + fan * (halfW - 3) + (rnd(seed, i, 5) - 0.5) * 2;
    const h = 5 + rnd(seed, i, 6) * 6 * (1 - Math.abs(fan) * 0.45);
    return { x, h, lean: fan * 3 + (rnd(seed, i, 7) - 0.5) * 4, back: i % 2 === 0 };
  });
  const frame = (f: number): Canvas => {
    const b = new Buf(W, H);
    blades.forEach((bl, i) => {
      strokeQuad(b, bl.x, ground, bl.x + bl.lean * 0.3, ground - bl.h * 0.6, bl.x + bl.lean, ground - bl.h, (t) => (t < 0.45 ? 2 : 1), (t, side) => {
        let st = t < 0.3 ? 2 : side > 0.6 ? 3 : t > 0.7 ? 5 : 4;
        if (bl.back) st -= 1;
        return [GRASS, st];
      }, i, bl.back ? 0 : 1);
    });
    for (let k = 0; k < 6; k++) {
      const x = cx - halfW + 6 + k * ((halfW * 2 - 12) / 5), a = k % 2 ? -0.5 : Math.PI + 0.5;
      paintLeaf(b, { x: x + 0.5, y: ground - 1.5, ang: a + (rnd(seed, k, 8) - 0.5) * 0.6, len: 4.5, wid: 3, kind: 'oval', tone: 0 }, GRASS, [2, 4, 5], 30 + k, 1.5);
    }
    heads.forEach((hd, i) => {
      const sway = [0, 1, 0, -1][(f + i) % 4];
      const hx = Math.round(hd.x + hd.lean + sway), hy = Math.round(ground - hd.h);
      const part = 60 + i, dep = 2 + i * 0.05;
      strokeQuad(b, hd.x, ground, hd.x + hd.lean * 0.2, ground - hd.h * 0.5, hx, hy + 1, () => 1, (t) => [GRASS, t < 0.4 ? 2 : 3], part, dep);
      // A leaf on the stem.
      if (i % 2 === 0) paintLeaf(b, { x: hd.x + hd.lean * 0.1 + 0.5, y: ground - hd.h * 0.4, ang: i % 4 ? -0.6 : Math.PI + 0.6, len: 4, wid: 2.2, kind: 'oval', tone: 0 }, GRASS, [3, 4, 6], part, dep);
      if (hd.kind === 'daisy') {
        // Daisy: eight short petals around a yellow eye, the petals toward the light brightest.
        for (let k = 0; k < 8; k++) {
          const a = (k * TAU) / 8;
          const toL = Math.cos(a) * -0.62 + Math.sin(a) * -0.79;
          for (let q = 1; q <= 2.2; q += 0.6) b.put(Math.round(hx + Math.cos(a) * q), Math.round(hy + Math.sin(a) * q * 0.85), WHITE, toL > 0.3 ? 6 : toL < -0.4 ? 3 : 5, part, dep + 0.1);
        }
        b.put(hx, hy, YELLOW, 5, part, dep + 0.2);
        b.put(hx + 1, hy, YELLOW, 3, part, dep + 0.2);
      }
      else if (hd.kind === 'pink') blossom(b, hx, hy, PINK, true, part, dep + 0.1, PINK, 1.3);
      else {
        // Kikyo bellflower: a five-pointed blue star, a balloon bud beside it.
        for (let k = 0; k < 5; k++) {
          const a = -Math.PI / 2 + (k * TAU) / 5;
          for (let q = 0; q <= 2.4; q += 0.5) {
            const x = Math.round(hx + Math.cos(a) * q), y = Math.round(hy + Math.sin(a) * q * 0.9);
            const toL = Math.cos(a) * -0.62 + Math.sin(a) * -0.79;
            b.put(x, y, BLUE, q > 1.8 ? (toL > 0 ? 5 : 3) : toL > 0.2 ? 5 : 4, part, dep + 0.1);
          }
        }
        b.put(hx, hy, BLUE, 6, part, dep + 0.2);
        b.put(hx + 3, hy - 3, BLUE, 4, part, dep);
        b.put(hx + 3, hy - 4, BLUE, 5, part, dep);
        b.put(hx + 4, hy - 3, BLUE, 3, part, dep);
      }
    });
    innerLines(b, { step: 1, gap: 0.5, mode: 'all', only: (p) => p === GRASS });
    return toCanvas(b);
  };
  const idle = Array.from({ length: 4 }, (_, f) => frame(f));
  return assemble('flowers', 'Wildflowers', [0.8, 0.32], ['ambient'], { idle: { frames: idle, fps: 5 } }, cx, ground);
}

// --- lily pads -------------------------------------------------------------------------------

function lilyPads(): WorldSprite {
  const W = 130, H = 90, cx = 65, wy = 52;
  // The steep battle camera shows ground (and water) planes at 38/57 of their width.
  const FLAT = 38 / 57;
  // Pads: [x, y, rx, notch angle, bob phase], back to front.
  const pads: [number, number, number, number, number][] = [
    [12, -11, 12, 2.3, 2],
    [-20, -8, 13, 0.9, 0],
    [-2, -1, 17, 0.35, 4],
    [24, 3, 13, 1.2, 3],
    [-29, 6, 10, 2.7, 1],
    [7, 11, 10, 2.9, 5],
  ];
  const bob = (ph: number, f: number): number => [0, 0, 1, 1, 1, 0][(f + ph) % 6];
  const frame = (f: number): Canvas => {
    const b = new Buf(W, H);
    pads.forEach(([x, y, rx, na, ph], i) => {
      const ry = rx * FLAT;
      const pcx = cx + x, pcy = wy + y + bob(ph, f);
      const inNotch = (u: number, v: number): boolean => {
        const th = Math.atan2(v, u);
        return Math.abs(((th - na + Math.PI * 3) % TAU) - Math.PI) < 0.22 && u * u + v * v > 0.02;
      };
      // Thickness: a dark rim one pixel below the top surface, so the pad floats.
      for (let py = Math.floor(pcy - ry); py <= pcy + ry + 2; py++)
        for (let px = Math.floor(pcx - rx - 1); px <= pcx + rx + 1; px++) {
          const u = (px + 0.5 - pcx) / rx, v = (py + 0.5 - pcy - 1.4) / ry;
          if (u * u + v * v > 1 || inNotch(u, (py + 0.5 - pcy) / ry)) continue;
          b.put(px, py, LILY, 1, i, i);
        }
      for (let py = Math.floor(pcy - ry - 1); py <= pcy + ry + 1; py++)
        for (let px = Math.floor(pcx - rx - 1); px <= pcx + rx + 1; px++) {
          const u = (px + 0.5 - pcx) / rx, v = (py + 0.5 - pcy) / ry;
          const r2 = u * u + v * v;
          if (r2 > 1 || inNotch(u, v)) continue;
          // The pad is a shallow dish: its far upper-left rim turns up into the light, the near
          // lower-right side lies in its own shade; a soft sheen on the lit half.
          let st = 4;
          const tl = -0.62 * u - 0.79 * v;
          if (tl > 0.25) st = 5;
          if (r2 > 0.62 && tl > 0.35) st = 6;
          if (r2 > 0.78 && tl > 0.55) st = 7;
          if (tl < -0.35) st = 3;
          if (r2 > 0.7 && tl < -0.2) st = 2;
          // Veins: thin lighter lines radiating from the centre, darker near the notch.
          const th = Math.atan2(v, u);
          const nv = Math.round(rx * 0.7);
          const va = ((th - na) / TAU) * nv;
          if (r2 > 0.05 && r2 < 0.86 && Math.abs(va - Math.round(va)) < 0.11 * (1.2 - Math.sqrt(r2)) * 2) st = Math.min(7, st + 1);
          if (r2 < 0.03) st = 3;
          b.put(px, py, LILY, st, i, i + 0.1);
        }
    });
    // A lotus on the big pad: back petals rise inside the cup, side and front petals open over them.
    const [lx, ly, , , lph] = pads[2];
    const fx = cx + lx + 2, fy = wy + ly - 1 + bob(lph, f);
    const petals: [number, number, number, number][] = [
      [-90, 12, 5, 0], [-120, 11.5, 5, 0], [-60, 11.5, 5, 0],
      [-148, 10, 5, 1], [-32, 10, 5, 1],
      [-106, 8.5, 5.4, 2], [-74, 8.5, 5.4, 2], [-170, 7, 4.2, 2], [-10, 7, 4.2, 2],
    ];
    petals.forEach(([dg, len, wd, ring], k) => {
      const a = (dg * Math.PI) / 180;
      const z = 20 + ring * 2 + k * 0.1;
      leafPixels({ x: fx + 0.5, y: fy + 0.5, ang: a, len, wid: wd, kind: 'oval', tone: 0 }, (px, py, t, sd, dir) => {
        const toL = -Math.sin(dir) * -0.62 + Math.cos(dir) * -0.79;
        const lit = sd * Math.sign(toL || 1);
        let st = ring === 0 ? 3 : ring === 1 ? 4 : 5;
        if (lit > 0.2) st += 1;
        else if (lit < -0.4) st -= 1;
        if (t > 0.75) st += 1; // pale petal tips
        if (t < 0.25) st -= 1;
        if (dg > -90 && ring > 0) st -= 1; // the right side of the cup is in shade
        b.put(px, py, LOTUS, clamp(st, 1, 6), 40 + k, z);
      });
    });
    for (const [dx, dy, st] of [[0, -5, 5], [-1, -5, 6], [1, -5, 4], [0, -6, 5], [-1, -6, 6], [1, -6, 5]] as [number, number, number][]) b.put(fx + dx, fy + dy, YELLOW, st, 60, 25);
    // A closed bud on the right pad.
    const [bx2, by2, , , bph] = pads[3];
    const ux = cx + bx2 - 3, uy = wy + by2 - 1 + bob(bph, f);
    const bud: [number, number, number, number][] = [
      [0, -8, LOTUS, 5], [0, -7, LOTUS, 5], [1, -7, LOTUS, 4], [-1, -6, LOTUS, 5], [0, -6, LOTUS, 4], [1, -6, LOTUS, 3],
      [-1, -5, LOTUS, 4], [0, -5, LOTUS, 4], [1, -5, LOTUS, 2], [-1, -4, LOTUS, 3], [0, -4, LOTUS, 3], [1, -4, LOTUS, 2],
      [-1, -3, LILY, 5], [0, -3, LILY, 4], [1, -3, LILY, 3], [0, -2, LILY, 3], [0, -1, LILY, 3],
    ];
    for (const [dx, dy, mt, st] of bud) b.put(ux + dx, uy + dy, mt, st, 61, 30);
    innerLines(b, { step: 1, gap: 0.5, mode: 'all' });
    const c = toCanvas(b);
    // Ripples: two broken rings that grow and fade, half a cycle apart.
    const ring = (rx: number, alpha: number, seedR: number): void => {
      if (alpha <= 8) return;
      const ry = rx * FLAT;
      const n = Math.ceil(rx * 5);
      for (let i = 0; i < n; i++) {
        const th = (i / n) * TAU;
        if (rnd(seedR, Math.floor((i / n) * 16), 1) < 0.4) continue;
        const px = Math.round(cx - 1 + Math.cos(th) * rx), py = Math.round(wy + 1 + Math.sin(th) * ry);
        if (c.alpha(px, py) > 0) continue;
        c.set(px, py, withAlpha(R_WATER[5], alpha));
      }
    };
    for (const ph of [0, 3]) {
      const p = ((f + ph) % 6) / 6;
      ring(39 + p * 10, 150 * (1 - p), 90 + ph);
    }
    return c;
  };
  const idle = Array.from({ length: 6 }, (_, f) => frame(f));
  return assemble('lily_pads', 'Lily Pads', [1.2, 0.15], ['water', 'ambient'], { idle: { frames: idle, fps: 4 } }, cx, wy + 17);
}

// --- mossy log -------------------------------------------------------------------------------

function mushroomLog(): WorldSprite {
  const W = 160, H = 90, ground = 74, len = m(2), rad = 15;
  const x0 = Math.round((W - len) / 2), x1 = x0 + len - 1;
  const xa = x0 + 7, xb = x1 - 2;
  const cy = ground - rad;
  const seed = 97;
  // The body: a horizontal tube, bark furrows running along it, moss cushions on top.
  const body: Tube = {
    pts: spline([[xa, cy + 0.5], [lerp(xa, xb, 0.5), cy - 0.5], [xb, cy + 0.5]], 2), r0: rad, r1: rad - 1, wob: 0.05, pal: BARK, tex: 'furrow', seed,
    spacing: 4.6, twist: 0.04, moss: MOSS, mossAmt: 0.95, knots: [{ s: 40, a: 2, r: 3.4 }], part: 1, z: 1,
  };
  const frame = (f: number): Canvas => {
    const b = new Buf(W, H);
    drawTube(b, body);
    // Flat ends: the tube's rounded caps are cut off (the cut face and the break replace them).
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < xa || x > xb) b.clear(x, y);
    // A broken branch stub, angled up and back, with a pale cut end.
    drawTube(b, { pts: spline([[xa + 34, cy - rad + 4], [xa + 38, cy - rad - 3], [xa + 41, cy - rad - 7]]), r0: 3.4, r1: 2.6, pal: BARK, tex: 'furrow', seed: seed + 1, moss: MOSS, mossAmt: 0.4, part: 3, z: 2 });
    for (const [dx, dy, st] of [[40, -8, 5], [41, -8, 6], [42, -8, 4], [40, -7, 4], [42, -7, 3]] as [number, number, number][]) b.put(xa + dx, cy - rad + dy + 1, WOOD, st, 3, 2.1);
    // Broken right end: pale splintered wood, jagged.
    for (let k = 0; k < 6; k++) {
      const y0 = cy - rad + 3 + k * 4.5;
      const jl = 2 + Math.floor(rnd(seed, k, 3) * 5);
      for (let y = Math.floor(y0); y < y0 + 4; y++)
        for (let x = xb - 2; x <= xb + jl - Math.abs(y - y0 - 2); x++) if (y > cy - rad + 1 && y < cy + rad - 1) b.put(x, y, WOOD, y < cy - 4 ? (x > xb + 1 ? 4 : 3) : 2, 5, 3);
    }
    // Cut face (left): concentric rings, a bark rim and a radial crack.
    const rx = 7.5, ry = rad + 0.5;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = Math.floor(xa - rx); x <= xa + rx; x++) {
        const u = (x + 0.5 - xa) / rx, v = (y + 0.5 - cy) / ry;
        const r = Math.sqrt(u * u + v * v);
        if (r > 1) continue;
        if (r > 0.84) {
          b.put(x, y, BARK, v > 0.55 ? 2 : u < 0.1 && v < 0 ? 5 : 3, 4, 4);
          continue;
        }
        const wob = r + (noise(x, y, 4, seed + 10) - 0.5) * 0.08;
        const ring = Math.floor(wob * 6) !== Math.floor((wob + 0.06) * 6);
        let st = 4;
        if (-0.6 * u - 0.8 * v > 0.25 && r > 0.3) st = 5;
        if (u * 0.6 + v * 0.8 > 0.45) st = 3;
        if (ring) st -= 1;
        if (r < 0.32) st -= 1; // darker heartwood
        if (r < 0.1) st = 2;
        if (Math.abs(v - u * 1.3) < 0.1 && r > 0.16 && u > 0) st = 1;
        b.put(x, y, WOOD, clamp(st, 1, 6), 4, 4);
      }
    // Moss lip over the top of the cut face.
    for (let x = xa - 5; x <= xa + 6; x++) b.put(x, Math.floor(cy - ry) + (x < xa - 3 || x > xa + 4 ? 1 : 0), MOSS, x < xa ? 5 : 4, 4, 4.1);
    // Shelf fungi stacked on the front of the log.
    shelf(b, xa + 62, cy + 6, 8, 3.2, 6);
    shelf(b, xa + 70, cy + 1, 6, 2.6, 7);
    shelf(b, xa + 55, cy + 10, 5, 2.2, 8);
    // Mushrooms on top. Caps breathe: frames 2-5 raise every cap by 1 px.
    const breath = f >= 2 && f <= 5 ? 1 : 0;
    const topAt = (x: number): number => {
      for (let y = 0; y < H; y++) if (b.has(x, y)) return y;
      return cy - rad;
    };
    const shroom = (mx: number, baseY: number, capW: number, capH: number, stemH: number, palId: number, part: number, z: number): void => {
      const top = baseY - stemH - capH - breath;
      for (let y = top + capH; y <= baseY; y++) for (let x = mx - 1; x <= mx; x++) b.put(x, y, STALK, y === top + capH ? 2 : x < mx ? 5 : 3, part, z);
      const hwMax = capW / 2;
      for (let j = 0; j < capH; j++) {
        const fr = (j + 1) / capH;
        const hw = hwMax * Math.sqrt(1 - (1 - fr) * (1 - fr) * 0.85);
        for (let x = Math.round(mx - 0.5 - hw); x <= Math.round(mx - 0.5 + hw); x++) {
          const u = (x + 0.5 - (mx - 0.5)) / hwMax;
          let st = u < -0.25 && j < capH - 1 ? 5 : u > 0.4 ? 3 : 4;
          if (j === capH - 1) st = Math.max(2, st - 1);
          if (u > -0.7 && u < -0.15 && j === 0 && capW > 4) st = 6;
          b.put(x, top + j, palId, st, part, z);
        }
      }
      // Gills: the dark underside just below the rim.
      for (let x = Math.round(mx - hwMax + 0.5); x <= Math.round(mx + hwMax - 1.5); x++) if (x < mx - 1 || x > mx) b.put(x, top + capH, palId, 1, part, z);
    };
    const mbx = xb - 34;
    shroom(mbx - 8, topAt(mbx - 8) + 3, 7, 3, 2, CAP, 12, 6.4);
    shroom(mbx, topAt(mbx) + 2, 11, 4, 4, CAP, 10, 6);
    shroom(mbx + 9, topAt(mbx + 9) + 3, 8, 3, 3, CAP, 11, 6.2);
    // Faintly glowing teal caps at the foot of the log.
    const teal: [number, number, number, number, number][] = [
      [xb - 16, 6, 2, 3, 13],
      [xb - 9, 4, 2, 2, 14],
      [xb - 22, 4, 2, 1, 15],
    ];
    for (const [tx, w, h, sh, part] of teal) shroom(tx, ground, w, h, sh, TEAL, part, 7);
    // The glow lights the bark around the teal caps.
    for (const [tx, , h, sh] of teal)
      for (let y = ground - h - sh - 6; y <= ground; y++)
        for (let x = tx - 6; x <= tx + 6; x++) if (b.palAt(x, y) === BARK && Math.hypot(x + 0.5 - tx, (y - (ground - sh - h)) * 1.2) < 4.5) b.shade(x, y, 1);
    innerLines(b, { step: 1, gap: 0.5, mode: 'all', only: (p) => p !== MOSS });
    const c = toCanvas(b);
    // A soft, stepped halo around the teal caps, a little brighter while they breathe in.
    for (const [tx, , h, sh] of teal) {
      const gy = ground - sh - h - breath;
      for (let y = gy - 7; y <= ground; y++)
        for (let x = tx - 8; x <= tx + 8; x++) {
          if (c.alpha(x, y) > 0) continue;
          const d = Math.hypot(x + 0.5 - tx, (y + 0.5 - gy) * 1.15);
          const a = d < 3.2 ? 72 : d < 5.6 ? 34 : 0;
          if (a) c.plot(x, y, withAlpha(R_TEAL[5], a * (breath ? 1.3 : 1)));
        }
    }
    // Spores drift up and fade; each lives for the whole 8-frame cycle.
    for (let k = 0; k < 5; k++) {
      const life = ((f + k * 3) % 8) / 8;
      const tanSpore = k >= 3;
      const ox = tanSpore ? mbx + (k === 3 ? -3 : 4) : teal[k][0];
      const oy = tanSpore ? topAt(mbx) - 8 : ground - teal[k][2] - teal[k][3] - 1;
      const x = Math.round(ox + Math.sin(life * 5 + k) * 1.5 + (k - 2) * 0.6);
      const y = Math.round(oy - 1 - life * 18);
      const a = life < 0.15 ? life / 0.15 : 1 - (life - 0.15) / 0.85;
      if (a > 0.1) c.plot(x, y, withAlpha(tanSpore ? PAL[CAP][6] : R_TEAL[5], 235 * a));
    }
    return c;
  };
  const idle = Array.from({ length: 8 }, (_, f) => frame(f));
  return assemble('mushroom_log', 'Mossy Log with Mushrooms', [2, 0.6], ['cover-half', 'climbable', 'flammable'], { idle: { frames: idle, fps: 5 } }, Math.round((x0 + x1) / 2), ground);
}

/** A bracket fungus: a half-disc shelf lit on top, with concentric growth bands, a pale rim and a dark underside. */
function shelf(b: Buf, x0: number, y0: number, rx: number, ry: number, part: number): void {
  for (let y = Math.floor(y0 - ry - 1); y <= y0 + 2; y++)
    for (let x = Math.floor(x0 - rx - 1); x <= x0 + rx + 1; x++) {
      const u = (x + 0.5 - x0) / rx, v = (y + 0.5 - y0) / ry;
      if (v > 0) {
        if (y <= y0 + 1 && Math.abs(u) < 0.92 && v < 1.6) b.put(x, y, FUNGUS, 1, part, 5);
        continue;
      }
      const d = Math.hypot(u, v);
      if (d > 1) continue;
      const band = frac(d * 3.2);
      let st = u < -0.3 ? 5 : u < 0.4 ? 4 : 3;
      if (band < 0.28) st -= 1;
      if (d > 0.8) st = u < 0.2 ? 6 : 4;
      b.put(x, y, FUNGUS, clamp(st, 1, 6), part, 5);
    }
}

// --- main ------------------------------------------------------------------------------------

const ONLY = process.env.PLANTS_ONLY?.split(',');
const all: [string, () => WorldSprite][] = [
  ['bush_round', () => bushSprite(roundBush())],
  ['bush_wide', () => bushSprite(wideBush())],
  ['bush_flower', () => bushSprite(azaleaBush())],
  ['tall_grass', tallGrass],
  ['reeds', cattails],
  ['fern', fern],
  ['flowers', wildflowers],
  ['lily_pads', lilyPads],
  ['mushroom_log', mushroomLog],
];
const sprites: WorldSprite[] = all.filter(([k]) => !ONLY || ONLY.includes(k)).map(([, f]) => f());

if (!ONLY) writeGroup('plants', sprites);
const dir = previewDir();
preview(sprites, join(dir, 'plants.png'), { scale: 3 });

// Review crops: every animation as a strip of frames, and the first frame zoomed so single pixels can be judged.
const BG: Color = [93, 107, 87, 255];
for (const s of sprites) {
  for (const [key, a] of Object.entries(s.anims)) {
    const fw = a.frames[0].w, fh = a.frames[0].h;
    const strip = new Canvas((fw + 2) * a.frames.length, fh);
    strip.fillRect(0, 0, strip.w, strip.h, BG);
    a.frames.forEach((fr, i) => strip.draw(fr, i * (fw + 2), 0));
    strip.scaled(fw > 100 ? 3 : 4).save(join(dir, `plants-${s.name}-${key}.png`));
  }
  const first = Object.values(s.anims)[0].frames[0];
  const z = new Canvas(first.w, first.h);
  z.fillRect(0, 0, z.w, z.h, BG);
  z.draw(first, 0, 0);
  z.set(s.anchor[0], s.anchor[1], [255, 0, 255, 255]);
  z.scaled(6).save(join(dir, `plants-${s.name}-zoom.png`));
  const bb = first.bounds(200);
  const h = bb ? bb[3] - bb[1] + 1 : 0, w = bb ? bb[2] - bb[0] + 1 : 0;
  console.log(
    `${s.name.padEnd(13)} frame ${first.w}x${first.h} anchor ${s.anchor} opaque ${w}x${h} (target ${m(s.meters[0])}x${m(s.meters[1])}) anims ${Object.entries(s.anims)
      .map(([k, a]) => `${k}:${a.frames.length}@${a.fps}${a.loop === false ? '(once)' : ''}`)
      .join(' ')}`,
  );
}
void hex;
void lambert;
