// Trees for the battle maps: an ancient broadleaf oak, a cloud-pruned black pine, a red maple
// (momiji), a bamboo clump and a stump. They are the largest world sprites (real height,
// 1 m = 57 px), act as cover, block sight, burn and can be climbed.
//
//   npx tsx tools/world-sprites/trees.ts [previewDir]
//   TREES_ONLY=oak,pine npx tsx tools/world-sprites/trees.ts [previewDir]   (previews only, no write)
//
// Look (owner reference, Oct 13: an old Japanese forest in painterly pixel art; see foliage.ts):
// big gnarled trunks with deep bark furrows, knots and moss, exposed roots spreading over the
// ground, limbs that twist, and canopies built from many small clusters of individual leaves,
// lit on their top-left edges with a lighter, warmer green and sinking into cool blue-green
// inside. Hanging leaves and a few vines under the oak. Daytime light from the upper left.
//
// Everything is drawn into a step buffer (palette + ramp step per pixel) and turned into colours
// at the end; clusters are cached in their own coordinates and composited per frame at
// whole-pixel sway offsets, so leaves travel with their cluster instead of shimmering.

import { join } from 'node:path';
import { Canvas, Color, MATERIALS, WorldSprite, hash, hex, lambert, m, mix, noise, preview, previewDir, ramp, writeGroup } from './kit';
import {
  Buf, Cluster, Leaf, Mass, PAL, Pt, Tube, TAU, barkStep, canopy, clamp, composite, despeckle, drawTube, frac, grow, lerp, needleTufts,
  outlineBuf, ovalLeaves, paintLeaf, pal, putField, rasterCluster, rnd, shade, spline, starLeaves, vine,
} from './foliage';

const K = 38 / 57; // ground depth foreshortening of the battle camera

// --- palettes -----------------------------------------------------------------------------

const R_FIRE = ramp(MATERIALS.fire);
/** Flames: dark ember red, red tips, orange body, amber, pale yellow core (kit fire colours). */
const FIRE_RAMP: Color[] = [R_FIRE[0], mix(R_FIRE[1], hex('#ef4444'), 0.3), hex('#ef4444'), hex(MATERIALS.fire), R_FIRE[4], hex('#fde68a')];

/** Leaves: 0 outline, 1-7 from cool blue-green shade to warm yellow-green light. */
const LEAF_OAK = pal(['#0a1719', '#112629', '#173835', '#1f4b3a', '#2c613b', '#427a39', '#68983c', '#a2bf55']);
const LEAF_PINE = pal(['#08161a', '#0f2427', '#14332f', '#1b4436', '#265739', '#376c3b', '#55863f', '#87a64e']);
const LEAF_BAMBOO = pal(['#0a181a', '#11292a', '#173c33', '#205139', '#2e683d', '#45803e', '#6b9d45', '#a3c05e']);
const LEAF_MAPLE = pal(['#1e0619', '#370a20', '#5a1223', '#821d22', '#ab3220', '#d05522', '#e98330', '#f7c260']);
const LEAF_CHAR = pal(['#09080a', '#121012', '#1b1719', '#252022', '#302a2b', '#3e3636', '#4f4644', '#665a55']);
const LEAF_SCORCH = pal(['#181208', '#2a200f', '#3e3014', '#56421b', '#715822', '#8c6e2c', '#a8873b', '#c9a85a']);
/** Bark: 0 outline, 1 furrow, 2-5 shadow to light, 6 pale highlight. Shadows drift violet. */
const BARK_OAK = pal(['#130d12', '#22171e', '#35272a', '#4c3a31', '#67513c', '#856d4e', '#a8926c']);
const BARK_PINE = pal(['#120d12', '#25161b', '#35272b', '#4b3c3b', '#64544e', '#817262', '#a3967f']);
const BARK_MAPLE = pal(['#15111a', '#271f29', '#3b3238', '#554a4b', '#71655f', '#918372', '#b6a68c']);
const CHAR = pal(['#09080a', '#141113', '#1f1a1c', '#2b2527', '#3a3234', '#4a4142', '#5e5452']);
const MOSS = pal(['#0f180e', '#1a2a14', '#283e19', '#3a5520', '#526e27', '#708b31', '#98aa46']);
const WOOD_CUT = pal(['#2a1a16', '#4a3122', '#6c4c32', '#8c6a45', '#a98656', '#c4a26c', '#dcc28d']);
const CULM = pal(['#0d1a14', '#1c3324', '#284a2b', '#376431', '#4c7e37', '#6a9a42', '#97b85c']);
const CULM_OLD = pal(['#1a1c0e', '#333717', '#4c5320', '#68702a', '#848c35', '#a3a847', '#c6c56a']);
const SHEATH = pal(['#1f130f', '#3b2619', '#5a3d24', '#7a5a33', '#9a7a48', '#b99a62', '#d4bb84']);
const FIRE = pal(FIRE_RAMP);
const ASH = pal(ramp(MATERIALS.stone, { spread: 0.8 }));
const FUNGUS = pal(['#1e1210', '#3c231a', '#64392a', '#8f5a3a', '#b88050', '#d6a66c', '#ecd09a']);

const FOLIAGE = new Set([LEAF_OAK, LEAF_PINE, LEAF_BAMBOO, LEAF_MAPLE, LEAF_CHAR, LEAF_SCORCH]);
/** Outline priority: leaves first, then bark. */
const prio = (p: number): number => (FOLIAGE.has(p) ? 2 : p === FIRE ? -1 : 1);

/** Value thresholds between the 7 leaf tones. */
const TH = [0.2, 0.3, 0.4, 0.5, 0.61, 0.73];

// --- fire ---------------------------------------------------------------------------------

interface Flame {
  x: number;
  y: number;
  w: number;
  h: number;
  ph: number;
  seed: number;
  /** Number of tongues (default 3). */
  n?: number;
  /** Horizontal drift of the tips (wind), px over the full height. */
  lean?: number;
}

/** One flame: a burning bed with a few wavy tongues, a hot core, red tips and rising wisps. */
function flameInto(F: Buf, f: Flame, t: number): void {
  const put = (x: number, y: number, s: number) => {
    if (F.stepAt(x, y) < s) F.put(x, y, FIRE, s);
  };
  const brx = f.w * 0.55, bry = Math.max(2.5, f.w * 0.22);
  for (let y = Math.floor(f.y - bry); y <= f.y + bry + 2; y++)
    for (let x = Math.floor(f.x - brx - 1); x <= f.x + brx + 1; x++) {
      const u = (x + 0.5 - f.x) / brx, v = (y + 0.5 - f.y) / bry;
      const rag = y > f.y ? (noise(x, Math.floor(t * 8), 1.5, f.seed + 40) - 0.5) * 0.7 : 0;
      const e = Math.sqrt(u * u + v * v) + rag;
      if (e > 1) continue;
      put(x, y, e > 0.72 || v > 0.55 ? 2 : e > 0.4 ? 3 : 4);
    }
  const n = f.n ?? 3;
  const mid = Math.floor(n / 2);
  for (let i = 0; i < n; i++) {
    const ox = n === 1 ? 0 : (i / (n - 1) - 0.5) * 0.75;
    const hk = i === mid ? 1 : 0.5 + 0.3 * hash(i, 0, f.seed);
    const q = t + f.ph + hash(i, 1, f.seed);
    const hh = f.h * hk * (0.8 + 0.12 * Math.sin(TAU * q) + 0.08 * Math.sin(TAU * 2 * q + 1.3));
    const bx = f.x + ox * f.w;
    const ww = f.w * (i === mid ? 0.7 : 0.46);
    for (let k = 0; k <= hh; k++) {
      const tt = k / hh;
      const prof = Math.pow(1 - tt, 0.9) * Math.min(1, 0.8 + tt * 2);
      const hw = (ww / 2) * prof;
      const cx = bx + Math.sin(TAU * q - tt * 3.6 + f.seed) * ww * 0.3 * tt + (f.lean ?? 0) * tt * tt;
      const y = Math.round(f.y - k);
      for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
        const e = Math.abs(x + 0.5 - cx) / Math.max(0.5, hw);
        if (e > 1) continue;
        put(x, y, tt > 0.74 || e > 0.8 ? 2 : e < 0.3 && tt < 0.26 ? 5 : e < 0.55 && tt < 0.5 ? 4 : 3);
      }
    }
    const wq = frac(q + 0.5);
    const wr = (1 - wq) * ww * 0.2;
    if (wr >= 0.8) {
      const wy = f.y - hh - 2 - wq * f.h * 0.5, wx = bx + Math.sin(TAU * wq + f.seed) * 2 + (f.lean ?? 0);
      for (let y = Math.floor(wy - wr * 1.6); y <= wy + wr * 1.6; y++)
        for (let x = Math.floor(wx - wr); x <= wx + wr; x++) {
          const e = ((x + 0.5 - wx) / wr) ** 2 + ((y + 0.5 - wy) / (wr * 1.6)) ** 2;
          if (e <= 1) put(x, y, e < 0.3 && wr > 1.6 ? 4 : wq > 0.55 ? 2 : 3);
        }
    }
  }
}

/** Rising embers, drawn straight onto the frame after the outline (they glow, no dark rim). */
function sparksOnto(C: Canvas, x0: number, y0: number, spread: number, rise: number, n: number, t: number, seed: number): void {
  for (let k = 0; k < n; k++) {
    const q = frac(t + hash(k, 0, seed));
    if (q > 0.92) continue;
    const x = Math.round(x0 + (hash(k, 1, seed) - 0.5) * spread + Math.sin(TAU * q + k) * 4 + q * 10);
    const y = Math.round(y0 - q * rise - hash(k, 3, seed) * 20);
    const s = q < 0.3 ? 5 : q < 0.65 ? 4 : 3;
    C.set(x, y, FIRE_RAMP[s]);
    if (q < 0.5 && hash(k, 2, seed) < 0.6) C.set(x, y + 1, FIRE_RAMP[Math.max(3, s - 1)]);
  }
}

/** Fire overlay: drawn after the tree's outline, with its own dark red rim. */
function overlayFire(C: Canvas, F: Buf): void {
  const fc = F.toCanvas();
  fc.outline({ toward: '#2a0806', amount: 0.55 });
  C.draw(fc, 0, 0);
}

/** A low mound of ash with charcoal bits and a few live embers. */
function ashPile(L: Buf, gx: number, gy: number, rx: number, ry: number, seed: number): void {
  for (let y = gy - ry * 2; y <= gy + ry; y++)
    for (let x = gx - rx; x <= gx + rx; x++) {
      const u = (x + 0.5 - gx) / rx;
      if (Math.abs(u) > 1) continue;
      const top = gy - ry * (1 - u * u) * (0.7 + 0.6 * noise(x, 0, 5, seed)) - 1;
      const bot = gy + ry * 0.6 * Math.sqrt(1 - u * u);
      if (y < top || y > bot || L.has(x, y)) continue;
      const lit = u < -0.2 ? 1 : 0;
      if (noise(x, y, 2.2, seed + 4) < 0.22) {
        L.put(x, y, CHAR, y < top + 1.5 ? 4 : 2);
        continue;
      }
      if (hash(Math.floor(x / 2), Math.floor(y / 2), seed + 1) < 0.05 && y > top + 1) {
        L.put(x, y, FIRE, 3);
        continue;
      }
      let s = y < top + 1.5 ? 3 + lit : 2;
      s = clamp(s - (noise(x, y, 2, seed) < 0.35 ? 1 : 0), 1, 4);
      L.put(x, y, ASH, s);
    }
}

// --- frames, cropping ---------------------------------------------------------------------

interface Built {
  anims: Record<string, { frames: Canvas[]; fps: number; loop?: boolean }>;
  /** Trunk base on the work canvas: centre x and the ground row. */
  gx: number;
  gy: number;
}

/** Crops every frame of every animation to their common bounds (+1 px); the anchor is the trunk base. */
function finish(name: string, label: string, meters: [number, number], tags: string[], b: Built): WorldSprite {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const a of Object.values(b.anims))
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
  const W = x1 - x0 + 1, H = y1 - y0 + 1;
  const anims: WorldSprite['anims'] = {};
  for (const [k, a] of Object.entries(b.anims)) {
    anims[k] = {
      fps: a.fps,
      loop: a.loop,
      frames: a.frames.map((f) => {
        const c = new Canvas(W, H);
        c.draw(f, -x0, -y0);
        return c;
      }),
    };
  }
  return { name, label, meters, anchor: [b.gx - x0, b.gy - y0], tags, anims };
}

function toFrame(L: Buf, fire?: Buf): Canvas {
  despeckle(L);
  outlineBuf(L, prio);
  const c = L.toCanvas();
  if (fire) overlayFire(c, fire);
  return c;
}

/** Horizontal sway of a point at height `hf` (0 base .. 1 top) in frame f of n. */
function swayAt(hf: number, f: number, n: number, amp: number, lag = 1.1): number {
  if (hf <= 0) return 0;
  return Math.round(amp * hf * Math.sin((TAU * f) / n - lag * hf));
}

/** A canopy ready to composite: clusters (back to front) and their cached rasters. */
interface Canopy {
  cl: Cluster[];
  ras: ReturnType<typeof rasterCluster>[];
}
function makeCanopy(cl: Cluster[], o: { sphere?: number; fold?: number } = {}): Canopy {
  return { cl, ras: cl.map((c) => rasterCluster(c, o)) };
}

/** The wavy burn front of a burning crown: rows above it are charred, a glowing band, then scorched. */
const burnEdge = (x: number, burnY: number, seed: number): number => burnY + (noise(x, 0, 48, seed) - 0.5) * 80 + (noise(x, 0, 15, seed + 1) - 0.5) * 26;

/**
 * Burning foliage, decided per cluster (so the burn eats whole clumps, not a straight line):
 * charred above the wavy front with embers on the lit leaf edges, a glowing band of clusters at
 * the front, scorched brown below it, still green lowest.
 */
function burnPaint(burnY: number, scorch: number, seed: number) {
  return (x: number, y: number, c: Cluster, v: number, line: boolean): [number, number] => {
    const cy = c.y + (hash(c.seed, 0, 3) - 0.5) * 18;
    const e = burnEdge(c.x, burnY, seed);
    const s = line ? 1 : clamp(1 + TH.filter((t) => v >= t).length, 1, 7);
    if (cy < e) {
      if (!line && v > 0.6 && hash(x >> 1, y >> 1, seed) < 0.1) return [FIRE, v > 0.72 ? 3 : 2];
      return [LEAF_CHAR, s];
    }
    if (cy < e + 12) return line || v < 0.42 ? [LEAF_CHAR, 2] : [FIRE, v > 0.62 ? 4 : v > 0.52 ? 3 : 2];
    if (cy < e + 12 + scorch + (hash(c.seed, 1, 3) - 0.5) * 20) return [LEAF_SCORCH, s];
    return [c.pal, s];
  };
}

/**
 * A root: it leaves the trunk's flare well above the ground, bends down along it and runs over the
 * ground toward ground-plane angle `deg` (0 right, 90 toward the viewer), tapering into the soil.
 */
function rootTube(gx: number, gy: number, rT: number, deg: number, len: number, r0: number, seed: number, base: Omit<Tube, 'pts' | 'r0' | 'r1' | 'seed'>, h0 = r0 * 1.5 + 8): Tube {
  const a = (deg * Math.PI) / 180;
  const ca = Math.cos(a), sa = Math.sin(a) * K;
  const wig = (hash(seed, 1, 2) - 0.5) * 10, wig2 = (hash(seed, 3, 2) - 0.5) * 8;
  // Across the ground direction, for the root's sideways wander.
  const px = -Math.sin(a), py = Math.cos(a) * K;
  const at = (d: number, w: number, up: number): Pt => [gx + ca * (rT + d) + px * w, gy + sa * d + py * w - up];
  const pts: Pt[] = [
    [gx + ca * rT * 0.5, gy - h0],
    [gx + ca * (rT * 0.85 + 2), gy - r0 * 0.8 + sa * 3],
    at(len * 0.3, wig * 0.6, r0 * 0.35),
    at(len * 0.62, wig2, r0 * 0.12),
    at(len, wig * 0.3, -1),
  ];
  return { ...base, pts: spline(pts, 2), r0, r1: 2.2, flare: r0 * 0.35, flareLen: 10, point: 6, seed, lineFrom: h0 + rT * 0.4 + 4, spacing: 4.5, twist: 0, wob: 0.14 };
}

// --- oak ----------------------------------------------------------------------------------

function oak(): WorldSprite {
  const W = 600, H = 600, gx = 300, gy = 560;
  const n = 8;
  // Canopy: about 6 m wide and 7.3 m tall: cloud masses at the ends of the twisting limbs, the
  // lower ones hanging out to the sides like an arch.
  const hfOf = (y: number) => clamp((gy - 130 - y) / 280, 0, 1);
  const masses: Mass[] = [
    { x: gx - 126, y: gy - 244, rx: 60, ry: 42, z: 0, rz: 30, flat: 0.72 },
    { x: gx - 66, y: gy - 322, rx: 80, ry: 56, z: 6, rz: 44 },
    { x: gx + 8, y: gy - 372, rx: 72, ry: 46, z: -6, rz: 40 },
    { x: gx + 76, y: gy - 316, rx: 82, ry: 56, z: 4, rz: 44 },
    { x: gx + 128, y: gy - 240, rx: 58, ry: 40, z: -2, rz: 30, flat: 0.72 },
    { x: gx - 4, y: gy - 272, rx: 64, ry: 34, z: 26, rz: 26, flat: 0.7 },
    { x: gx - 84, y: gy - 254, rx: 40, ry: 26, z: 12, rz: 20, flat: 0.7 },
    { x: gx + 84, y: gy - 250, rx: 40, ry: 26, z: 10, rz: 20, flat: 0.7 },
    { x: gx - 168, y: gy - 212, rx: 22, ry: 16, z: 4, rz: 12, flat: 0.8 },
    { x: gx + 168, y: gy - 208, rx: 20, ry: 15, z: 0, rz: 12, flat: 0.8 },
  ];
  const cl = canopy({
    masses, form: [gx, gy - 300, 178, 112], r: 8.5, spacing: 9.6, pal: LEAF_OAK, seed: 11, formMix: 0.5,
    leaves: (sd, r, nu, nv) => ovalLeaves(sd, r, { len: 6.6, wid: 3.8, droop: nv > 0.5 ? 1.2 : 0.1, nu, nv }),
  });
  for (const c of cl) {
    c.hf = hfOf(c.y);
    // Clusters on the front of a mass go in front of the limbs; deep and underside ones behind.
    c.tag = c.z > (masses[c.group].z ?? 0) + (masses[c.group].rz ?? 30) * 0.45 ? 1 : 0;
    // The lower interior sits in the canopy's own shade; deep clusters are darker still.
    c.bias = -0.08 * clamp((c.y - (gy - 310)) / 80, 0, 1) - (c.tag === 0 ? 0.05 : 0);
  }
  const C = makeCanopy(cl);

  const F: Pt = [gx - 2, gy - 124];
  const dim = (x: number, y: number) => {
    if (y > gy - 100) return 1;
    const k = clamp((gy - 100 - y) / 34, 0, 1);
    const dap = noise(x * 0.8, y * 0.55, 6, 99) > 0.7;
    return 1 - k * (dap ? 0.08 : 0.42);
  };
  const skeleton = (burnt: boolean): Tube[] => {
    const palB = burnt ? CHAR : BARK_OAK;
    const tex = burnt ? 'charred' : 'furrow';
    const bark: Omit<Tube, 'pts' | 'r0' | 'r1' | 'seed'> = { pal: palB, tex, dim, moss: burnt ? undefined : MOSS, mossAmt: 0.5, ember: burnt ? 0.1 : 0, firePal: FIRE };
    const back: Tube[] = [], front: Tube[] = [], limbs: Tube[] = [];
    const rT = 30;
    // Buttress roots: two behind the trunk, the rest spreading to the sides and toward the viewer.
    const roots: [number, number, number, boolean][] = [
      [-162, 36, 10, true], [-20, 34, 9, true], [-120, 22, 8, true], [180, 64, 13, false], [-2, 58, 12, false], [150, 46, 11, false], [28, 40, 10, false], [96, 20, 9, false],
    ];
    roots.forEach(([deg, len, r0, behind], i) => {
      const t = rootTube(gx, gy, rT, deg, len, r0, 200 + i, { ...bark, mossAmt: 0.8 });
      (behind ? back : front).push(t);
    });
    const trunk: Tube = {
      ...bark, pts: spline([[gx + 1, gy + 2], [gx - 5, gy - 40], [gx + 6, gy - 84], F], 2), r0: rT, r1: 21, flare: 14, flareLen: 16, wob: 0.08,
      seed: 11, clipY: gy + 1, spacing: 7.5, twist: 0.14, mossAmt: 0.4,
      knots: [{ s: 58, a: -10, r: 7 }, { s: 100, a: 13, r: 4.5 }],
    };
    // Limbs forking into the masses, twisting as they go.
    const L: { pts: Pt[]; r0: number; r1: number; kids: [number, number][] }[] = [
      { pts: [F, [gx - 32, gy - 142], [gx - 62, gy - 150], [gx - 96, gy - 176], [gx - 126, gy - 204]], r0: 15, r1: 7, kids: [[-2.6, 24], [-1.9, 26]] },
      { pts: [F, [gx - 14, gy - 166], [gx - 38, gy - 200], [gx - 42, gy - 244], [gx - 64, gy - 286]], r0: 16, r1: 7.5, kids: [[-2.0, 30], [-1.4, 30]] },
      { pts: [F, [gx + 16, gy - 162], [gx + 22, gy - 210], [gx + 46, gy - 250], [gx + 56, gy - 300]], r0: 15, r1: 7, kids: [[-1.7, 30], [-1.0, 28]] },
      { pts: [F, [gx + 34, gy - 140], [gx + 70, gy - 152], [gx + 102, gy - 180], [gx + 130, gy - 202]], r0: 14, r1: 6.5, kids: [[-1.2, 24], [-0.5, 22]] },
    ];
    L.forEach((l, i) => {
      const pts = burnt && i === 2 ? l.pts.slice(0, 4) : l.pts;
      limbs.push({ ...bark, pts: spline(pts), r0: l.r0, r1: l.r1, seed: 31 + i, lineFrom: 30, spacing: 5.5, twist: 0.22 * (i % 2 ? 1 : -1), point: burnt && i === 2 ? 16 : 0, wob: 0.14, mossAmt: 0.6 });
      const end = pts[pts.length - 1];
      l.kids.forEach(([ang, len], k) => {
        const out: Tube[] = [];
        grow(out, end, ang, burnt ? len * 0.9 : len, l.r1 * 0.75, 1, 50 + i * 10 + k, { ...bark, mossAmt: 0 });
        for (const tb of out) {
          if (burnt) tb.point = Math.min(8, tb.r0 * 3);
          limbs.push(tb);
        }
      });
    });
    return [...back.map((t) => ({ ...t, z: -1 })), { ...trunk, z: 0 }, ...front.map((t) => ({ ...t, z: 1 })), ...limbs.map((t) => ({ ...t, z: 2 }))];
  };

  const render = (f: number, mode: 'idle' | 'burning' | 'burnt'): Canvas => {
    const B = new Buf(W, H);
    const sway = (y: number) => (mode === 'idle' ? swayAt(hfOf(y), f, n, 3) * clamp((gy - 130 - y) / 40, 0, 1) : 0);
    const tubes = skeleton(mode === 'burnt').map((t) => ({ ...t, pts: t.pts.map(([x, y]) => [x + sway(y), y] as Pt) }));
    if (mode === 'burnt') {
      for (const t of tubes) drawTube(B, t);
      ashPile(B, gx, gy + 6, 50, 5, 5);
      return toFrame(B);
    }
    const offs = C.cl.map((c) => [sway(c.y), 0] as Pt);
    const Fo = composite(W, H, C.cl, C.ras, offs, 0.55);
    shade(Fo, C.cl, { cast: 0.42, castD: 5, rim: 0.16, away: 0.1, lineGap: 14, leafSep: 0.07 });
    const burnY = gy - 320;
    const paint = mode === 'burning' ? burnPaint(burnY, 46, 77) : undefined;
    // Order: roots and trunk, back foliage, limbs, front foliage, then vines.
    for (const t of tubes) if ((t.z ?? 0) < 2) drawTube(B, t);
    putField(B, Fo, C.cl, { th: TH, filter: (c) => c.tag === 0, paint });
    for (const t of tubes) if ((t.z ?? 0) >= 2) drawTube(B, t);
    putField(B, Fo, C.cl, { th: TH, filter: (c) => c.tag === 1, paint });
    if (mode === 'idle') {
      // Vines hang from the underside of the canopy (the lowest leaf pixel in their column).
      const vines: [number, number][] = [[-152, 44], [-104, 62], [-46, 30], [58, 38], [108, 54], [156, 34]];
      vines.forEach(([dx, len], i) => {
        const x0 = gx + dx;
        let y0 = -1;
        for (let y = gy - 120; y > gy - 330; y--)
          if (B.palAt(x0, y) === LEAF_OAK) {
            y0 = y;
            break;
          }
        if (y0 < 0) return;
        vine(B, x0, y0 - 2, len, { sway: Math.round(Math.sin((TAU * f) / n + i) * 1.4), seed: 90 + i, stemPal: LEAF_OAK, leafPal: LEAF_OAK, z: 50 });
      });
      return toFrame(B);
    }
    // Burning: flames rise from clumps along the burn front and from the charred crown, at
    // different sizes and heights; small ones at the fork and from a wound in the trunk.
    const fire = new Buf(W, H);
    const t = f / n;
    const picks: Cluster[] = [];
    const cand = C.cl.filter((c) => {
      const e = burnEdge(c.x, burnY, 77);
      const cy = c.y + (hash(c.seed, 0, 3) - 0.5) * 18;
      return cy < e + 10 && c.tag === 1;
    });
    cand.sort((a, b) => hash(a.seed, 5, 1) - hash(b.seed, 5, 1));
    for (const c of cand) {
      if (picks.length >= 11) break;
      if (picks.some((p) => Math.abs(p.x - c.x) < 30 && Math.abs(p.y - c.y) < 40)) continue;
      picks.push(c);
    }
    picks.forEach((c, k) => {
      const big = hash(c.seed, 6, 1);
      flameInto(fire, { x: Math.round(c.x), y: Math.round(c.y + 4), w: 18 + big * 26, h: 30 + big * 64, ph: hash(c.seed, 7, 1), seed: k + 3, n: big > 0.5 ? 3 : 2, lean: 5 }, t);
    });
    flameInto(fire, { x: gx - 4, y: gy - 126, w: 16, h: 34, ph: 0.1, seed: 6, n: 2, lean: 3 }, t);
    flameInto(fire, { x: gx + 12, y: gy - 64, w: 9, h: 20, ph: 0.6, seed: 4, n: 1, lean: 2 }, t);
    const c = toFrame(B, fire);
    sparksOnto(c, gx + 10, gy - 440, 240, 90, 26, t, 9);
    return c;
  };

  const idle = Array.from({ length: n }, (_, f) => render(f, 'idle'));
  const burning = Array.from({ length: n }, (_, f) => render(f, 'burning'));
  const burnt = [render(0, 'burnt')];
  return finish('oak', 'Broadleaf Tree', [6, 7.4], ['cover-half', 'blocks-sight', 'flammable', 'destructible', 'climbable'], {
    gx, gy,
    anims: { idle: { frames: idle, fps: 5 }, burning: { frames: burning, fps: 11 }, burnt: { frames: burnt, fps: 0 } },
  });
}

// --- black pine ---------------------------------------------------------------------------

function pine(): WorldSprite {
  const W = 380, H = 620, gx = 190, gy = 580;
  const n = 8;
  const TOP = gy - m(8.4);
  const hfOf = (y: number) => clamp((gy - 150 - y) / (gy - 150 - TOP), 0, 1);
  // The trunk leans and zigzags up; long elbowed branches carry flat cloud pads of needles.
  const spine: Pt[] = [[gx + 1, gy + 2], [gx + 6, gy - 60], [gx - 6, gy - 140], [gx - 18, gy - 214], [gx - 6, gy - 290], [gx + 12, gy - 360], [gx + 6, gy - 420], [gx - 2, TOP + 22]];
  const trunkPts = spline(spine, 2);
  const xAt = (y: number): number => {
    let best = trunkPts[0];
    for (const p of trunkPts) if (Math.abs(p[1] - y) < Math.abs(best[1] - y)) best = p;
    return best[0];
  };
  // Pads: branch start height, pad centre, pad radii, side.
  const pads: { y0: number; px: number; py: number; rx: number; ry: number; side: number }[] = [
    { y0: gy - 150, px: gx - 78, py: gy - 178, rx: 50, ry: 18, side: -1 },
    { y0: gy - 196, px: gx + 76, py: gy - 224, rx: 52, ry: 19, side: 1 },
    { y0: gy - 262, px: gx - 72, py: gy - 292, rx: 48, ry: 18, side: -1 },
    { y0: gy - 318, px: gx + 66, py: gy - 346, rx: 46, ry: 18, side: 1 },
    { y0: gy - 372, px: gx - 54, py: gy - 398, rx: 40, ry: 16, side: -1 },
    { y0: gy - 408, px: gx + 46, py: gy - 430, rx: 34, ry: 15, side: 1 },
    { y0: gy - 236, px: gx - 6, py: gy - 250, rx: 32, ry: 14, side: 0 },
    { y0: gy - 350, px: gx + 8, py: gy - 368, rx: 28, ry: 13, side: 0 },
    { y0: gy - 440, px: gx + 2, py: TOP + 28, rx: 40, ry: 20, side: 0 },
  ];
  const masses: Mass[] = [];
  pads.forEach((p, i) => {
    const z = p.side === 0 && i < 8 ? 12 : 0;
    masses.push({ x: p.px, y: p.py, rx: p.rx, ry: p.ry, z, rz: 10, flat: 0.5, top: 1, rag: 0.16, tag: i });
    // Cloud bumps on top of each pad.
    masses.push({ x: p.px - p.rx * 0.4, y: p.py - p.ry * 0.55, rx: p.rx * 0.46, ry: p.ry * 0.72, z: z - 2, rz: 8, flat: 0.6, rag: 0.18, tag: i });
    masses.push({ x: p.px + p.rx * 0.34, y: p.py - p.ry * 0.5, rx: p.rx * 0.44, ry: p.ry * 0.66, z: z - 3, rz: 8, flat: 0.6, rag: 0.18, tag: i });
  });
  const cl = canopy({
    masses, form: [gx, gy - 310, 140, 190], r: 6.2, spacing: 6.4, pal: LEAF_PINE, seed: 21, formMix: 0.25,
    leaves: (sd, r) => needleTufts(sd, r, { len: 7.5, needles: 11 }),
  });
  for (const c of cl) {
    c.hf = hfOf(c.y);
    c.tag = 1;
  }
  const C = makeCanopy(cl, { sphere: 0.75, fold: 0.06 });
  const dim = (_x: number, y: number) => {
    for (const p of pads) if (y > p.py && y < p.py + 26 && Math.abs(_x - p.px) < p.rx) return 0.62;
    return 1;
  };
  const skeleton = (burnt: boolean): Tube[] => {
    const palB = burnt ? CHAR : BARK_PINE;
    const tex = burnt ? 'charred' : 'plates';
    const bark: Omit<Tube, 'pts' | 'r0' | 'r1' | 'seed'> = { pal: palB, tex, dim, moss: burnt ? undefined : MOSS, mossAmt: 0.35, ember: burnt ? 0.08 : 0, firePal: FIRE };
    const out: Tube[] = [];
    const rT = 13;
    const roots: [number, number, number, boolean][] = [[-150, 30, 6, true], [-28, 28, 6, true], [174, 44, 8, false], [6, 42, 8, false], [140, 32, 7, false], [52, 26, 6, false]];
    const back: Tube[] = [], front: Tube[] = [];
    roots.forEach(([deg, len, r0, behind], i) => (behind ? back : front).push(rootTube(gx, gy, rT, deg, len, r0, 400 + i, { ...bark, mossAmt: 0.6 })));
    const top = burnt ? spline(spine.slice(0, 6), 2) : trunkPts;
    out.push(...back.map((t) => ({ ...t, z: -1 })));
    out.push({ ...bark, pts: top, r0: rT, r1: burnt ? 5 : 3, flare: 8, flareLen: 11, wob: 0.1, seed: 41, clipY: gy + 1, spacing: 6.5, twist: 0.05, point: burnt ? 24 : 0, knots: [{ s: 70, a: 6, r: 3.5 }, { s: 150, a: -5, r: 3 }], z: 0 });
    out.push(...front.map((t) => ({ ...t, z: 1 })));
    // Elbowed branches out to the pads.
    pads.forEach((p, i) => {
      if (i === pads.length - 1) return;
      const x0 = xAt(p.y0);
      const ex = p.px - p.side * p.rx * 0.2, ey = p.py + p.ry * 0.5;
      const elbow: Pt = [lerp(x0, ex, 0.45) + p.side * 4, p.y0 - 4 - hash(i, 1, 9) * 10];
      const pts = burnt ? [[x0, p.y0], elbow] as Pt[] : ([[x0, p.y0], elbow, [lerp(elbow[0], ex, 0.6), lerp(elbow[1], ey, 0.4) + 4], [ex, ey]] as Pt[]);
      out.push({ ...bark, pts: spline(pts), r0: 5.5 - i * 0.35, r1: burnt ? 3 : 2.4, seed: 60 + i, lineFrom: 10, spacing: 4, point: burnt ? 7 : 0, mossAmt: 0.45, z: 2 });
      if (!burnt)
        for (let k = 0; k < 3; k++) {
          const sx = ex + p.side * (k - 1) * p.rx * 0.4 - p.side * 6, sy = ey - 2;
          out.push({ ...bark, tex: 'plain', pts: spline([[ex, ey], [lerp(ex, sx, 0.5), ey + 3], [sx, sy - 6]]), r0: 2, r1: 1, seed: 80 + i * 3 + k, lineFrom: 3, mossAmt: 0, z: 2 });
        }
    });
    return out;
  };
  const render = (f: number, mode: 'idle' | 'burnt'): Canvas => {
    const B = new Buf(W, H);
    const sway = (y: number) => (mode === 'idle' ? swayAt(hfOf(y), f, n, 3) : 0);
    const tubes = skeleton(mode === 'burnt').map((t) => ({ ...t, pts: t.pts.map(([x, y]) => [x + sway(y), y] as Pt) }));
    for (const t of tubes) drawTube(B, t);
    if (mode === 'burnt') {
      ashPile(B, gx, gy + 5, 40, 4, 8);
      return toFrame(B);
    }
    const Fo = composite(W, H, C.cl, C.ras, C.cl.map((c) => [sway(c.y), 0] as Pt), 0.62);
    shade(Fo, C.cl, { cast: 0.3, castD: 4, rim: 0.16, away: 0.1, lineGap: 9, leafSep: 0.05 });
    putField(B, Fo, C.cl, { th: TH });
    return toFrame(B);
  };
  // Tag clusters with their pad index for the underside shade.
  cl.forEach((c) => (c.tag = masses[c.group].tag ?? 0));
  const idle = Array.from({ length: n }, (_, f) => render(f, 'idle'));
  const burnt = [render(0, 'burnt')];
  return finish('pine', 'Black Pine', [4.5, 8.4], ['cover-half', 'blocks-sight', 'flammable', 'destructible', 'climbable'], {
    gx, gy,
    anims: { idle: { frames: idle, fps: 5 }, burnt: { frames: burnt, fps: 0 } },
  });
}

// --- red maple ----------------------------------------------------------------------------

function maple(): WorldSprite {
  const W = 420, H = 400, gx = 210, gy = 360;
  const n = 8;
  const TOP = gy - m(5);
  const hfOf = (y: number) => clamp((gy - 100 - y) / (gy - 100 - TOP), 0, 1);
  // Layered tiers of foliage, flat underneath, like a momiji in a temple garden.
  const masses: Mass[] = [
    { x: gx - 104, y: gy - 138, rx: 60, ry: 24, z: 4, rz: 18, flat: 0.55, top: 0.9 },
    { x: gx + 100, y: gy - 148, rx: 62, ry: 24, z: 2, rz: 18, flat: 0.55, top: 0.9 },
    { x: gx - 54, y: gy - 192, rx: 74, ry: 30, z: 0, rz: 22, flat: 0.55 },
    { x: gx + 58, y: gy - 198, rx: 70, ry: 30, z: -2, rz: 22, flat: 0.55 },
    { x: gx + 2, y: gy - 240, rx: 72, ry: 30, z: -4, rz: 22, flat: 0.6 },
    { x: gx - 8, y: gy - 266, rx: 40, ry: 18, z: -8, rz: 14, flat: 0.7 },
    { x: gx + 4, y: gy - 158, rx: 44, ry: 20, z: 10, rz: 14, flat: 0.55 },
  ];
  const cl = canopy({
    masses, form: [gx, gy - 200, 165, 90], r: 8, spacing: 8, pal: LEAF_MAPLE, seed: 31, formMix: 0.5,
    leaves: (sd, r) => starLeaves(sd, r, { size: 8.6, tone: 0.06, n: 4 + Math.floor(rnd(sd, 9) * 2) }),
  });
  for (const c of cl) {
    c.hf = hfOf(c.y);
    c.tag = c.z > (masses[c.group].z ?? 0) + (masses[c.group].rz ?? 20) * 0.4 ? 1 : 0;
    c.bias = c.tag === 0 ? -0.06 : 0;
  }
  const C = makeCanopy(cl, { sphere: 0.8, fold: 0.1 });
  const dim = (x: number, y: number) => (y < gy - 110 ? (noise(x * 0.8, y * 0.6, 6, 7) > 0.7 ? 0.95 : 0.66) : 1);
  const skeleton = (burnt: boolean): Tube[] => {
    const palB = burnt ? CHAR : BARK_MAPLE;
    const tex = burnt ? 'charred' : 'smooth';
    const bark: Omit<Tube, 'pts' | 'r0' | 'r1' | 'seed'> = { pal: palB, tex, dim, moss: burnt ? undefined : MOSS, mossAmt: 0.5, ember: burnt ? 0.08 : 0, firePal: FIRE };
    const out: Tube[] = [];
    const rT = 13;
    const roots: [number, number, number, boolean][] = [[-150, 26, 6, true], [-24, 24, 6, true], [174, 40, 8, false], [6, 38, 8, false], [136, 28, 6, false], [56, 24, 6, false]];
    const back: Tube[] = [], front: Tube[] = [];
    roots.forEach(([deg, len, r0, behind], i) => (behind ? back : front).push(rootTube(gx, gy, rT, deg, len, r0, 600 + i, { ...bark, mossAmt: 0.5 })));
    out.push(...back.map((t) => ({ ...t, z: -1 })));
    const Fk: Pt = [gx + 3, gy - 76];
    out.push({ ...bark, pts: spline([[gx, gy + 2], [gx - 9, gy - 26], [gx + 7, gy - 54], Fk]), r0: rT, r1: 9.5, flare: 7, flareLen: 9, wob: 0.12, seed: 71, clipY: gy + 1, knots: [{ s: 36, a: 4, r: 3.6 }], z: 0 });
    out.push(...front.map((t) => ({ ...t, z: 1 })));
    const limbs: { pts: Pt[]; r0: number; r1: number; kids: [number, number][] }[] = [
      { pts: [Fk, [gx - 20, gy - 100], [gx - 30, gy - 132], [gx - 62, gy - 154], [gx - 92, gy - 160]], r0: 8, r1: 3.4, kids: [[-2.4, 16], [-1.9, 18]] },
      { pts: [Fk, [gx + 22, gy - 104], [gx + 26, gy - 144], [gx + 58, gy - 170], [gx + 94, gy - 180]], r0: 8, r1: 3.4, kids: [[-1.0, 22], [-0.5, 20]] },
      { pts: [Fk, [gx + 2, gy - 120], [gx - 12, gy - 170], [gx - 4, gy - 214], [gx + 6, gy - 246]], r0: 7, r1: 3, kids: [[-1.9, 18], [-1.2, 18]] },
      { pts: [[gx + 5, gy - 62], [gx + 32, gy - 86], [gx + 64, gy - 110], [gx + 92, gy - 140]], r0: 5, r1: 2.4, kids: [[-1.0, 14]] },
      { pts: [[gx - 2, gy - 70], [gx - 30, gy - 94], [gx - 60, gy - 112], [gx - 90, gy - 134]], r0: 4.6, r1: 2.2, kids: [[-2.3, 14]] },
    ];
    limbs.forEach((l, i) => {
      out.push({ ...bark, pts: spline(l.pts), r0: l.r0, r1: l.r1, seed: 80 + i, lineFrom: 12, wob: 0.1, point: burnt && i === 2 ? 10 : 0, z: 2 });
      const end = l.pts[l.pts.length - 1];
      l.kids.forEach(([ang, len], k) => {
        const kids: Tube[] = [];
        grow(kids, end, ang, len, l.r1 * 0.7, 1, 90 + i * 7 + k, { ...bark, mossAmt: 0 });
        for (const tb of kids) {
          if (burnt) tb.point = Math.min(6, tb.r0 * 3);
          out.push({ ...tb, z: 2 });
        }
      });
    });
    return out;
  };
  const render = (f: number, mode: 'idle' | 'burnt'): Canvas => {
    const B = new Buf(W, H);
    const sway = (y: number) => (mode === 'idle' ? swayAt(hfOf(y), f, n, 3) * clamp((gy - 100 - y) / 30, 0, 1) : 0);
    const tubes = skeleton(mode === 'burnt').map((t) => ({ ...t, pts: t.pts.map(([x, y]) => [x + sway(y), y] as Pt) }));
    if (mode === 'burnt') {
      for (const t of tubes) drawTube(B, t);
      ashPile(B, gx, gy + 5, 34, 4, 11);
      return toFrame(B);
    }
    const Fo = composite(W, H, C.cl, C.ras, C.cl.map((c) => [sway(c.y), 0] as Pt), 0.58);
    shade(Fo, C.cl, { cast: 0.4, castD: 5, rim: 0.15, away: 0.1, lineGap: 10, leafSep: 0.07 });
    for (const t of tubes) if ((t.z ?? 0) < 2) drawTube(B, t);
    putField(B, Fo, C.cl, { th: TH, filter: (c) => c.tag === 0 });
    for (const t of tubes) if ((t.z ?? 0) >= 2) drawTube(B, t);
    putField(B, Fo, C.cl, { th: TH, filter: (c) => c.tag === 1 });
    // A few fallen leaves on the ground.
    for (let k = 0; k < 9; k++) {
      const a = rnd(5, k) * TAU, d = 20 + rnd(5, k, 1) * 70;
      const lf: Leaf = { x: gx + Math.cos(a) * d + 0.5, y: gy + 3 + Math.sin(a) * d * K * 0.35 + 0.5, ang: rnd(5, k, 2) * TAU, len: 5, wid: 5, kind: 'star', n: 5, tone: 0 };
      if (B.has(Math.round(lf.x), Math.round(lf.y))) continue;
      paintLeaf(B, lf, LEAF_MAPLE, [3, 4, 6]);
    }
    return toFrame(B);
  };
  const idle = Array.from({ length: n }, (_, f) => render(f, 'idle'));
  const burnt = [render(0, 'burnt')];
  return finish('maple', 'Red Maple', [5.8, 5], ['cover-half', 'blocks-sight', 'flammable', 'destructible', 'climbable'], {
    gx, gy,
    anims: { idle: { frames: idle, fps: 5 }, burnt: { frames: burnt, fps: 0 } },
  });
}

// --- bamboo clump -------------------------------------------------------------------------

interface Culm {
  bx: number;
  by: number;
  h: number;
  r: number;
  lean: number;
  curve: number;
  pal: number;
  seed: number;
  phase: number;
  amp: number;
  /** Behind the others (darker). */
  back: boolean;
}

function bamboo(): WorldSprite {
  const W = 300, H = 460, gx = 150, gy = 420;
  const n = 8;
  const culms: Culm[] = [
    { bx: -24, by: -10, h: 312, r: 3.4, lean: -0.06, curve: -0.05, pal: CULM_OLD, seed: 1, phase: 0.6, amp: 3, back: true },
    { bx: 14, by: -11, h: 330, r: 3.6, lean: 0.03, curve: 0.04, pal: CULM, seed: 2, phase: 2.1, amp: 3, back: true },
    { bx: 38, by: -7, h: 276, r: 3.1, lean: 0.08, curve: 0.08, pal: CULM, seed: 3, phase: 1.2, amp: 3, back: true },
    { bx: -42, by: -5, h: 268, r: 3.1, lean: -0.1, curve: -0.08, pal: CULM, seed: 4, phase: 2.8, amp: 3, back: true },
    { bx: -4, by: -3, h: 350, r: 4.4, lean: -0.01, curve: -0.02, pal: CULM, seed: 5, phase: 0, amp: 4, back: false },
    { bx: 24, by: 0, h: 300, r: 4, lean: 0.05, curve: 0.05, pal: CULM_OLD, seed: 6, phase: 1.7, amp: 3, back: false },
    { bx: -26, by: 1, h: 236, r: 3.7, lean: -0.07, curve: -0.05, pal: CULM, seed: 7, phase: 3.6, amp: 2, back: false },
    { bx: 6, by: 3, h: 190, r: 3.3, lean: 0.02, curve: 0.1, pal: CULM, seed: 8, phase: 4.2, amp: 2, back: false },
  ];
  const at = (c: Culm, t: number, f: number): Pt => {
    const sw = c.amp * t * t * Math.sin((TAU * f) / n + c.phase - t * 0.6);
    return [gx + c.bx + c.lean * t * c.h + c.curve * t * t * c.h + sw, gy + c.by - t * c.h];
  };
  const nodesOf = (c: Culm): number[] => {
    const out: number[] = [];
    let y = 0, k = 0;
    while (y < c.h - 14) {
      y += lerp(12, 26, Math.min(1, k / 6)) * (0.92 + hash(k, 0, c.seed) * 0.16) * (k > 9 ? 0.85 : 1);
      if (y < c.h - 10) out.push(y);
      k++;
    }
    return out;
  };
  // A culm: a lit cylinder; at each node a dark ring, a lit ridge above it and a pale powdery band below.
  const drawCulm = (B: Buf, c: Culm, f: number, part: number) => {
    const nodes = nodesOf(c);
    const px: [number, number, number, number][] = [];
    for (let k = 0; k <= Math.ceil(c.h); k++) {
      const t = k / c.h;
      const [cx, cy] = at(c, t, f);
      const y = Math.round(cy);
      const nd = nodes.some((v) => Math.abs(v - k) < 0.5);
      const hw = c.r * (1 - 0.45 * t - 0.25 * Math.max(0, t - 0.85) / 0.15) + (nd ? 0.6 : 0);
      for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw - 1); x++) {
        const u = (x + 0.5 - cx) / hw;
        if (Math.abs(u) <= 1) px.push([x, y, u, k]);
      }
    }
    // Inner line on what lies behind.
    const mine = new Set(px.map(([x, y]) => y * W + x));
    for (const [x, y] of px)
      for (const [dx, dy] of [[1, 0], [-1, 0]] as Pt[]) {
        const q = (y + dy) * W + x + dx;
        if (!mine.has(q) && B.has(x + dx, y + dy) && B.partAt(x + dx, y + dy) !== part) B.setStep(x + dx, y + dy, 1);
      }
    for (const [x, y, u, k] of px) {
      const Lv = lambert(u, 0, Math.sqrt(Math.max(0, 1 - u * u))) - (c.back ? 0.1 : 0) - (k > c.h * 0.55 ? 0.08 : 0);
      let s = Lv > 0.86 ? 5 : Lv > 0.64 ? 4 : Lv > 0.44 ? 3 : Lv > 0.28 ? 2 : 1;
      const dn = nodes.reduce((b, v) => (Math.abs(v - k) < Math.abs(b) ? v - k : b), 99);
      if (Math.abs(dn) < 0.5) s = Math.max(1, s - 2);
      else if (dn > -1.5 && dn < -0.5) s = Math.min(6, s + 1);
      else if (dn > 0.5 && dn < 3.5 && u < 0.5) s = Math.min(6, s + (dn < 2 ? 2 : 1));
      // Faint vertical streaks on old culms.
      if (c.pal === CULM_OLD && hash(Math.round(u * 3), Math.floor(k / 7), c.seed) < 0.12) s = Math.max(1, s - 1);
      B.put(x, y, c.pal, clamp(s, 1, 6), part, c.back ? 0 : 10);
    }
    // A papery sheath on the lowest node.
    const v = nodes[0];
    if (c.seed % 3 !== 0 && v < 40) {
      const len = 12 + hash(1, 2, c.seed) * 5;
      for (let k = Math.round(v - 3); k <= v + len; k++) {
        const [cx, cy] = at(c, k / c.h, f);
        const tt = (k - v + 3) / (len + 3);
        const lo = cx - c.r - 0.8, hi = cx + c.r + 0.8 - tt * tt * (c.r * 2 + 1.6);
        for (let x = Math.floor(lo); x <= Math.ceil(hi - 1); x++) {
          const u = (x + 0.5 - cx) / (c.r + 0.8);
          const st = u < -0.55 ? 5 : u < 0.1 ? 4 : u < 0.6 ? 3 : 2;
          B.put(x, Math.round(cy), SHEATH, (k + Math.round(u * 2)) % 5 === 0 ? st - 1 : st, part + 500, 11);
        }
      }
    }
  };
  // Leaf sprays: fans of drooping lance leaves at the ends of thin twigs, as clusters.
  interface Spray { culm: number; t: number; ang: number; tl: number; seed: number }
  const sprays: Spray[] = [];
  culms.forEach((c, ci) => {
    const nodes = nodesOf(c).filter((v) => v > c.h * 0.44);
    nodes.forEach((v, k) => {
      const t = v / c.h;
      const one = (k + c.seed) % 2 === 0 ? -1 : 1;
      const sides = hash(k, 7, c.seed) < (t > 0.6 ? 0.75 : 0.3) ? [one, -one] : [one];
      sides.forEach((side, q) =>
        sprays.push({ culm: ci, t, ang: -Math.PI / 2 + side * ((t > 0.85 ? 0.4 : 0.65) + hash(k, 9 + q, c.seed) * 0.5), tl: (10 + hash(k, 8 + q, c.seed) * 18) * (1 - t * 0.35), seed: c.seed * 100 + k * 3 + q }),
      );
    });
  });
  const sprayLeaves = (s: Spray): Leaf[] => {
    const crown = s.tl < 4;
    const nL = crown ? 3 : 5 + Math.floor(hash(s.seed, 1, 3) * 3);
    const out: Leaf[] = [];
    const side = Math.cos(s.ang) >= 0 ? 1 : -1;
    const ux = Math.cos(s.ang), uy = Math.sin(s.ang);
    for (let i = 0; i < nL; i++) {
      const q = nL === 1 ? 0.5 : i / (nL - 1);
      // A fan of fingers held out from the twig, from a little above level to hanging; the
      // middle ones longest. Leaves start at points along the end of the twig.
      const a = crown ? -Math.PI / 2 + (q - 0.5) * 2.6 : side > 0 ? lerp(-0.6, 0.95, q) : Math.PI - lerp(-0.6, 0.95, q);
      const len = (13 + hash(s.seed, i, 5) * 7) * (1 - 0.32 * Math.abs(q - 0.4));
      const back = crown ? 0 : (nL - 1 - i) * 1.6;
      out.push({ x: -ux * back, y: -uy * back, ang: a + (hash(s.seed, i, 4) - 0.5) * 0.25, len, wid: 2.9, kind: 'lance', bend: crown ? 0.4 : 0.12 + 0.16 * hash(s.seed, i, 6), tone: (hash(s.seed, i, 7) - 0.5) * 0.08 });
    }
    return out;
  };
  const sprayCl: Cluster[] = sprays.map((s, i) => {
    const c = culms[s.culm];
    const [nx, ny] = at(c, s.t, 0);
    const ex = nx + Math.cos(s.ang) * s.tl, ey = ny + Math.sin(s.ang) * s.tl;
    const hf = (gy - ey) / 340;
    const form = clamp(0.55 + 0.3 * hf - (c.back ? 0.12 : 0) + (ex < gx ? 0.06 : -0.04), 0, 1);
    return { x: ex, y: ey, r: 9, z: (c.back ? 0 : 20) + i * 0.01, form, pal: LEAF_BAMBOO, seed: s.seed, leaves: sprayLeaves(s), group: s.culm, hf: s.t, bias: 0, tag: c.back ? 0 : 1 };
  });
  const order = sprayCl.map((_, i) => i).sort((a, b) => sprayCl[a].z - sprayCl[b].z);
  const cl = order.map((i) => sprayCl[i]);
  const spr = order.map((i) => sprays[i]);
  const C = makeCanopy(cl, { sphere: 0.55, fold: 0.13 });
  const render = (f: number): Canvas => {
    const B = new Buf(W, H);
    // Culms back to front with their twigs; sprays of the back culms behind the front culms.
    const offs: Pt[] = cl.map((c, i) => {
      const s = spr[i];
      const cu = culms[s.culm];
      const [nx0] = at(cu, s.t, 0), [nx1] = at(cu, s.t, f);
      return [Math.round(nx1 - nx0), 0];
    });
    const Fo = composite(W, H, C.cl, C.ras, offs, 0.55);
    shade(Fo, C.cl, { cast: 0.22, castD: 4, rim: 0.15, away: 0.06, lineGap: 10, leafSep: 0.1 });
    const twigs = (back: boolean) =>
      spr.forEach((s) => {
        const c = culms[s.culm];
        if (c.back !== back || s.tl < 4) return;
        const [nx, ny] = at(c, s.t, f);
        const ex = nx + Math.cos(s.ang) * s.tl, ey = ny + Math.sin(s.ang) * s.tl;
        const steps = Math.ceil(s.tl);
        for (let q = 0; q <= steps; q++) B.put(Math.round(lerp(nx, ex, q / steps)), Math.round(lerp(ny, ey, q / steps)), c.pal, 2, 900, 0);
      });
    culms.forEach((c, i) => {
      if (c.back) drawCulm(B, c, f, i);
    });
    twigs(true);
    putField(B, Fo, C.cl, { th: TH, filter: (c) => c.tag === 0, z: () => 1 });
    culms.forEach((c, i) => {
      if (!c.back) drawCulm(B, c, f, i);
    });
    twigs(false);
    putField(B, Fo, C.cl, { th: TH, filter: (c) => c.tag === 1 });
    // A young shoot (takenoko) wrapped in scale-like sheaths, and fallen leaves.
    const sx0 = gx + 50;
    for (let y = gy - 20; y <= gy + 1; y++) {
      const k = (gy + 1 - y) / 21;
      const hw = 5 * Math.pow(1 - k, 0.8) + 0.4;
      for (let x = Math.floor(sx0 - hw); x <= sx0 + hw - 1; x++) {
        const u = (x + 0.5 - sx0) / hw;
        const scale = frac((gy - y + (u + 1) * 1.5) / 5);
        B.put(x, y, SHEATH, scale < 0.22 ? 1 : u < -0.35 ? 5 : u < 0.3 ? 4 : 3, 950, 12);
      }
    }
    for (const [lx, ly, a] of [[-22, 2, 0.15], [14, 3, -0.2], [34, 1, 0.1], [-44, 0, -0.1]] as Pt3[]) paintLeaf(B, { x: gx + lx, y: gy + ly, ang: a, len: 10, wid: 2.6, kind: 'lance', tone: 0 }, SHEATH, [2, 3, 5], 960, 12);
    return toFrame(B);
  };
  const idle = Array.from({ length: n }, (_, f) => render(f));
  return finish('bamboo', 'Bamboo Grove', [2.4, 6.2], ['cover-half', 'blocks-sight', 'hide-spot', 'flammable', 'destructible'], {
    gx, gy,
    anims: { idle: { frames: idle, fps: 5 } },
  });
}
type Pt3 = [number, number, number];

// --- stump --------------------------------------------------------------------------------

function stump(): WorldSprite {
  const W = 140, H = 110, gx = 70, gy = 88;
  // About 0.8 m across; the cut top is an ellipse 2/3 as deep as wide above a 0.42 m wall.
  const Rr = 23, ryT = 15, ryB = 14, hgt = m(0.42);
  const cyb = gy - ryB * 0.55; // base ellipse centre
  const cyt = cyb - hgt; // top ellipse centre
  const B = new Buf(W, H);
  const bark: Omit<Tube, 'pts' | 'r0' | 'r1' | 'seed'> = { pal: BARK_OAK, tex: 'furrow', moss: MOSS, mossAmt: 0.7, spacing: 4.5 };
  const roots: [number, number, number, boolean][] = [[-150, 14, 6, true], [-30, 13, 6, true], [176, 20, 7, false], [6, 19, 7, false], [130, 15, 6, false], [58, 13, 6, false]];
  for (const [deg, len, r0, behind] of roots) if (behind) drawTube(B, rootTube(gx, gy - 4, Rr - 4, deg, len, r0, 700 + deg, bark, 9));
  // Wall: a bark cylinder with a slightly irregular rim.
  const rimJ = (u: number) => (noise(u * 6 + 3, 0, 1, 31) - 0.5) * 3;
  const tb: Tube = { ...bark, pts: [], r0: Rr, r1: Rr, seed: 9, knots: [{ s: 12, a: 8, r: 3.5 }] };
  for (let x = gx - Rr; x <= gx + Rr; x++) {
    const u = clamp((x + 0.5 - gx) / Rr, -1, 1);
    const yt = cyt + ryT * Math.sqrt(1 - u * u) + rimJ(u);
    const yb = cyb + ryB * Math.sqrt(Math.max(0, 1 - u * u));
    for (let y = Math.floor(yt - 1); y <= Math.ceil(yb); y++) {
      const s = yb - y;
      const Lv = lambert(u, 0.1, Math.sqrt(Math.max(0, 1 - u * u))) - (s > hgt ? 0.1 : 0);
      const a = Math.asin(u) * Rr;
      // Moss creeping up the shaded side and the base.
      const mv = clamp((u - 0.1) * 1.6, 0, 1) * 0.7 + clamp(1 - s / 12, 0, 1) * 0.45 + (noise(a * 0.3, s * 0.25, 1, 12) - 0.5) * 0.7;
      if (mv > 0.62) {
        B.put(x, y, MOSS, clamp((Lv > 0.6 ? 4 : Lv > 0.38 ? 3 : 2) + (noise(a * 0.5, s * 0.5, 1, 13) > 0.6 ? 1 : 0), 1, 6), 1, 0);
        continue;
      }
      const [p, st] = barkStep(tb, Lv, a, s, Rr, 0, u);
      B.put(x, y, p, st, 1, 0);
    }
  }
  for (const [deg, len, r0, behind] of roots) if (!behind) drawTube(B, { ...rootTube(gx, gy - 4, Rr - 4, deg, len, r0, 700 + deg, bark, 9), part: 2, point: 4 });
  // The cut face: growth rings, radial cracks, a dark heart, a lit sapwood rim and a bark lip.
  for (let y = Math.floor(cyt - ryT) - 2; y <= cyt + ryT + 2; y++)
    for (let x = gx - Rr - 1; x <= gx + Rr + 1; x++) {
      const u = (x + 0.5 - gx) / Rr, v = (y + 0.5 - cyt) / ryT;
      const d0 = Math.sqrt(u * u + v * v);
      const jag = rimJ(u) / ryT;
      if (d0 > 1 + (v > 0 ? jag : 0)) continue;
      const d = d0 + (noise(x, y, 3, 21) - 0.5) * 0.06;
      const lit = u + v * 1.2;
      if (d > 0.9) {
        B.put(x, y, BARK_OAK, lit < -0.7 ? 5 : lit < 0.3 ? 4 : lit < 0.9 ? 3 : 2, 3, 1);
        continue;
      }
      if (d > 0.8) {
        B.put(x, y, WOOD_CUT, lit < -0.3 ? 6 : lit < 0.5 ? 5 : 4, 3, 1);
        continue;
      }
      const ring = frac(d * 7.5 + noise(x, y, 6, 22) * 0.4);
      let s = lit < -0.5 ? 5 : lit > 0.6 ? 3 : 4;
      if (d < 0.45) s -= 1; // darker heartwood
      if (ring < 0.2) s -= 1;
      const ang = Math.atan2(v, u);
      for (const ca of [0.7, 2.6, -1.9]) if (Math.abs(ang - ca) < 0.06 / Math.max(0.12, d) && d > 0.15 && d < 0.85) s = 1;
      if (d < 0.07) s = 1;
      B.put(x, y, WOOD_CUT, clamp(s, 1, 6), 3, 1);
    }
  // A moss cushion creeping over the shaded back rim, and two small shelf fungi on the wall.
  for (let y = Math.floor(cyt - ryT) - 5; y <= cyt; y++)
    for (let x = gx + 2; x <= gx + Rr + 3; x++) {
      const u = (x + 0.5 - gx - 13) / 8, v = (y + 0.5 - cyt + ryT * 0.72) / 4;
      const cell = noise(x, y, 2, 33);
      if (u * u + v * v > 1 - (cell < 0.3 ? 0.35 : 0)) continue;
      B.put(x, y, MOSS, clamp(Math.round(3.6 - (u + v) * 1.2 + (cell - 0.5) * 2), 1, 5), 4, 2);
    }
  shelfFungus(B, gx + 13, cyb - 14, 7, 3, 5);
  shelfFungus(B, gx + 18, cyb - 8, 5, 2.4, 6);
  const frame = toFrame(B);
  // Anchor: the front of the wall's base, where it meets the ground (as before).
  return finish('stump', 'Tree Stump', [0.8, 0.5], ['cover-half', 'climbable'], { gx, gy: Math.round(cyb + ryB), anims: { idle: { frames: [frame], fps: 0 } } });
}

/** A bracket fungus: a half-disc shelf lit on top, with concentric growth bands and a dark underside. */
function shelfFungus(B: Buf, x0: number, y0: number, rx: number, ry: number, part: number): void {
  for (let y = Math.floor(y0 - ry - 1); y <= y0 + 2; y++)
    for (let x = Math.floor(x0 - rx - 1); x <= x0 + rx + 1; x++) {
      const u = (x + 0.5 - x0) / rx, v = (y + 0.5 - y0) / ry;
      if (v > 0) {
        if (y <= y0 + 1 && Math.abs(u) < 0.9 && v < 1.6) B.put(x, y, FUNGUS, 1, part, 3);
        continue;
      }
      const d = Math.hypot(u, v);
      if (d > 1) continue;
      const band = frac(d * 3);
      let s = u < -0.3 ? 5 : u < 0.4 ? 4 : 3;
      if (band < 0.3) s -= 1;
      if (d > 0.82) s = u < 0 ? 6 : 4;
      B.put(x, y, FUNGUS, clamp(s, 1, 6), part, 3);
    }
}

// --- group --------------------------------------------------------------------------------

const ONLY = process.env.TREES_ONLY?.split(',');
const all: [string, () => WorldSprite][] = [['oak', oak], ['pine', pine], ['maple', maple], ['bamboo', bamboo], ['stump', stump]];
const sprites: WorldSprite[] = all.filter(([k]) => !ONLY || ONLY.includes(k)).map(([, f]) => f());
if (!ONLY) writeGroup('trees', sprites);
const dir = previewDir();
preview(sprites, join(dir, 'trees.png'), { scale: 1 });
for (const s of sprites) {
  const f0 = Object.values(s.anims)[0].frames[0];
  const bb = f0.bounds()!;
  const anims = Object.entries(s.anims).map(([k, a]) => `${k} ${a.frames.length}f@${a.fps}`).join(', ');
  console.log(`${s.name}: frame ${f0.w}x${f0.h}, anchor ${s.anchor}, opaque ${bb[2] - bb[0] + 1}x${bb[3] - bb[1] + 1}px (${((bb[3] - bb[1] + 1) / 57).toFixed(2)} m tall, target ${s.meters[1]} m), ${anims}`);
  for (const [k, a] of Object.entries(s.anims)) {
    const strip = new Canvas(a.frames.reduce((t, f) => t + f.w + 2, 0), a.frames[0].h);
    a.frames.forEach((f, i) => strip.draw(f, i * (f.w + 2), 0));
    strip.save(join(dir, `trees-${s.name}-${k}.png`));
  }
}
void PAL;
