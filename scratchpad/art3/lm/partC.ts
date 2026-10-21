
// --- painting helpers -----------------------------------------------------------------------

/** Ramp color by palette and step. */
const C = (p: number, s: number): Color => PAL[p][clamp(Math.round(s), 0, PAL[p].length - 1)];

/** A 2D layer drawn with its own tinted outline over the frame canvas. */
function layer(w: number, h: number, draw: (c: Canvas) => void, outline = true): Canvas {
  const c = new Canvas(w, h);
  draw(c);
  if (outline) outlineTinted(c);
  return c;
}

/** Outlines a finished frame and then draws its post-outline details (moss sprigs) on top. */
function seal(c: Canvas, f?: Frame): Canvas {
  outlineTinted(c);
  if (f) for (const [x, y, col] of f.post) c.set(x, y, col);
  return c;
}

/** True for a pixel still showing the bare material of one of `meshes` (not moss, paint or a hole). */
const isBare = (f: Frame, i: number, meshes: number[]): boolean => i >= 0 && i < f.w * f.h && meshes.includes(f.mesh[i]) && !f.over[i] && f.pal[i] === f.scene.meshes[f.mesh[i]].pal;

/** Clears 4-connected islands of `mask === 1` smaller than `minArea` px (single-pixel moss reads as noise). */
function dropIslands(w: number, h: number, mask: Uint8Array, minArea: number): void {
  const seen = new Uint8Array(w * h);
  for (let s = 0; s < w * h; s++) {
    if (mask[s] !== 1 || seen[s]) continue;
    const comp: number[] = [s];
    seen[s] = 1;
    for (let k = 0; k < comp.length; k++) {
      const i = comp[k], x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j < 0 || j >= w * h || seen[j] || mask[j] !== 1) continue;
        seen[j] = 1;
        comp.push(j);
      }
    }
    if (comp.length < minArea) for (const i of comp) mask[i] = 0;
  }
}

interface MossOpts {
  meshes: number[];
  /** 0..1: how much of the up-facing surface grows moss. */
  amount: number;
  seed: number;
  cell?: number;
  minUp?: number;
  /** Longest strand hanging over a front edge (px). */
  drip?: number;
  /** Cushions may puff up to 2 px above the silhouette. */
  bumps?: boolean;
  size?: number;
  /** Chance of a sprig on each lit top-edge pixel. */
  tufts?: number;
  minArea?: number;
}

/**
 * Moss as a mass of small cushions rather than a flat patch. A world-anchored mask picks the
 * up-facing pixels that grow moss; cushions (3-6 px ellipses on a jittered 3 px grid) are then
 * stamped back to front, each with a lit upper-left crescent, a few sunlit leaf tips and a dark
 * under-edge, so every cushion overlaps the one behind it and the patch reads as clustered
 * leaves. Gaps between cushions stay deep green; strands hang over front edges; sprigs of 1-3 px
 * stand on the lit top edges (drawn after the outline so they stay thin).
 */
function paintMoss(f: Frame, o: MossOpts): void {
  const N = f.w * f.h;
  const mask = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (!isBare(f, i, o.meshes)) continue;
    const n = f.normal(i), p = f.world(i);
    if (n[1] < (o.minUp ?? 0.45)) continue;
    const v = fbm(p[0] + 50, p[2] * 1.4 + 50, o.cell ?? 9, 3, o.seed);
    if (v + (n[1] - 0.7) * 0.25 > 1 - o.amount) mask[i] = 1;
  }
  dropIslands(f.w, f.h, mask, o.minArea ?? 7);
  const M = (x: number, y: number): number => {
    const j = f.idx(x, y);
    return j < 0 ? 0 : mask[j];
  };
  // Strands over front edges (onto faces that turn away from the sky).
  const drip = o.drip ?? 2;
  for (let y = f.h - 2; y >= 0; y--)
    for (let x = 0; x < f.w; x++) {
      if (M(x, y) !== 1) continue;
      const below = f.idx(x, y + 1);
      if (below < 0 || mask[below] || !isBare(f, below, o.meshes) || f.normal(below)[1] > 0.45) continue;
      const n = Math.floor(hash(x, 3, o.seed + 9) * (drip + 1));
      for (let k = 1; k <= n; k++) {
        const j = f.idx(x, y + k);
        if (j >= 0 && isBare(f, j, o.meshes)) mask[j] = 2;
      }
    }
  // Cushions, back to front.
  const cover = new Int8Array(N).fill(-1);
  const sz = o.size ?? 1;
  const clumps: [number, number, number, number, boolean][] = [];
  const g = 3;
  for (let gy = 0; gy < f.h; gy += g)
    for (let gx = 0; gx < f.w; gx += g) {
      const cx = gx + hash(gx, gy, o.seed + 1) * g, cy = gy + hash(gx, gy, o.seed + 2) * g;
      const ci = f.idx(Math.floor(cx), Math.floor(cy));
      if (ci < 0 || mask[ci] !== 1) continue;
      const rx = (1.5 + hash(gx, gy, o.seed + 3) * 1.4) * sz;
      clumps.push([cx, cy, rx, rx * 0.72, f.lightv[ci] > 0.34]);
    }
  clumps.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  for (const [cx, cy, rx, ry, lit] of clumps) {
    const base = lit ? 4 : 2;
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx); x++) {
        const j = f.idx(x, y);
        if (j < 0) continue;
        const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, d = u * u + v * v;
        if (d > 1) continue;
        const puff = !!o.bumps && f.pal[j] < 0 && !f.over[j] && v < 0 && (M(x, y + 1) === 1 || M(x, y + 2) === 1);
        if (!mask[j] && !puff) continue;
        let s = base;
        if (u + v * 1.3 < -0.45) s += 1;
        else if (u * 0.5 + v > 0.3) s -= 1;
        if (v > 0.4 && d > 0.45) s = base - 2;
        if (s > base && hash(x, y, o.seed + 11) < 0.3) s += 1;
        cover[j] = clamp(s, 1, 6);
      }
  }
  for (let i = 0; i < N; i++) {
    if (cover[i] >= 0) continue;
    const x = i % f.w, y = (i / f.w) | 0;
    if (mask[i] === 1) cover[i] = f.lightv[i] > 0.34 ? 2 : 1;
    else if (mask[i] === 2) cover[i] = M(x, y + 1) !== 2 ? 1 : hash(x, y, o.seed + 5) < 0.5 ? 2 : 3;
  }
  // Sprigs.
  const tuftP = o.tufts ?? 0.12;
  for (let i = 0; i < N; i++) {
    if (cover[i] < 3) continue;
    const x = i % f.w, y = (i / f.w) | 0;
    const up = f.idx(x, y - 1);
    if (up < 0 || cover[up] >= 0 || hash(x, y, o.seed + 13) > tuftP) continue;
    const hgt = 1 + Math.floor(hash(x, y, o.seed + 14) * 2.4);
    const r = hash(x, y, o.seed + 15);
    const lean = r < 0.3 ? -1 : r > 0.75 ? 1 : 0;
    for (let k = 1; k <= hgt; k++) {
      const tip = k === hgt;
      f.post.push([x + (tip && hgt > 1 ? lean : 0), y - k, C(MOSS, tip ? 5 : k === 1 ? 3 : 4)]);
    }
  }
  for (let i = 0; i < N; i++) {
    if (cover[i] < 0) continue;
    f.pal[i] = MOSS;
    f.step[i] = cover[i];
    f.over[i] = null;
    if (f.mesh[i] < 0) f.lightv[i] = 0.5;
  }
}

/**
 * Lichen rosettes: irregular crusts 3-6 px across with a paler rim (and the odd pore), mostly
 * on lit faces; a few are orange. Shadowed ones drop a step so they never glow.
 */
function paintLichen(f: Frame, o: { meshes: number[]; seed: number; density: number; minLight?: number; orange?: number }): void {
  const g = 6;
  for (let gy = 0; gy < f.h; gy += g)
    for (let gx = 0; gx < f.w; gx += g) {
      if (hash(gx, gy, o.seed) > o.density) continue;
      const cx = gx + Math.floor(hash(gx, gy, o.seed + 1) * g), cy = gy + Math.floor(hash(gx, gy, o.seed + 2) * g);
      const i = f.idx(cx, cy);
      if (!isBare(f, i, o.meshes) || f.lightv[i] < (o.minLight ?? 0.3)) continue;
      const P = hash(gx, gy, o.seed + 4) < (o.orange ?? 0.18) ? LICHEN_O : LICHEN;
      const r = 1.0 + hash(gx, gy, o.seed + 3) * 1.3;
      const mi = f.mesh[i];
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          const d = Math.hypot(dx * 0.8, dy * 1.15) + (hash(cx + dx, cy + dy, o.seed + 5) - 0.5) * 0.9;
          if (d > r) continue;
          const j = f.idx(cx + dx, cy + dy);
          if (!isBare(f, j, [mi]) || hash(cx + dx, cy + dy, o.seed + 6) < 0.12) continue;
          const rim = d > r - 0.8;
          let s = rim ? 4 : 3;
          if (f.lightv[j] < 0.5) s -= 1;
          if (rim && dx + dy < 0 && f.lightv[j] > 0.62) s += 1;
          f.pal[j] = P;
          f.step[j] = clamp(s, 1, 6);
        }
    }
}

/**
 * Rain streaks: 1 px stains running down vertical faces from the ledge or moss above them, one
 * step darker, breaking up toward the end; under moss the first part takes an algae tint.
 */
function paintStreaks(f: Frame, o: { meshes: number[]; seed: number; density: number; maxLen?: number }): void {
  for (let x = 0; x < f.w; x++)
    for (let y = 1; y < f.h; y++) {
      const i = y * f.w + x;
      if (!isBare(f, i, o.meshes) || f.normal(i)[1] > 0.4) continue;
      const up = i - f.w;
      const underMoss = f.pal[up] === MOSS;
      const underLedge = !underMoss && f.mesh[up] >= 0 && f.pal[up] >= 0 && f.normal(up)[1] > 0.55;
      if (!underMoss && !underLedge) continue;
      if (hash(x, y, o.seed) > o.density * (underMoss ? 1.7 : 1)) continue;
      const L = 2 + Math.floor(hash(x, y, o.seed + 1) * ((o.maxLen ?? 7) - 1));
      for (let k = 0; k < L; k++) {
        const j = f.idx(x, y + k);
        if (!isBare(f, j, o.meshes) || f.normal(j)[1] > 0.4) break;
        if (k > L * 0.55 && (k + x) % 2 === 1) continue;
        f.step[j] = Math.max(1, f.step[j] - 1);
        if (underMoss && k < L * 0.6) f.pal[j] = STAIN;
      }
    }
}

/**
 * Chipped edges: knocks 1-2 px out of the silhouette here and there (top and side edges, never
 * the ground line) and lights the fresh break just inside it; `fresh` repaints the break in
 * another material (pale new wood under weathered timber).
 */
function autoChips(f: Frame, o: { meshes: number[]; seed: number; density: number; fresh?: number; gap?: number }): void {
  const solid = (x: number, y: number): boolean => {
    const j = f.idx(x, y);
    return j >= 0 && (f.pal[j] >= 0 || f.over[j] !== null);
  };
  const picks: [number, number, number][] = [];
  const gap = o.gap ?? 7;
  for (let y = 1; y < f.h - 1; y++)
    for (let x = 1; x < f.w - 1; x++) {
      const i = y * f.w + x;
      if (!isBare(f, i, o.meshes)) continue;
      const side = !solid(x, y - 1) ? 0 : !solid(x - 1, y) ? 1 : !solid(x + 1, y) ? 2 : -1;
      if (side < 0 || !solid(x, y + 1) || !solid(x, y + 2)) continue;
      if (hash(x, y, o.seed) > o.density) continue;
      if (picks.some(([px, py]) => Math.abs(px - x) + Math.abs(py - y) < gap)) continue;
      picks.push([x, y, side]);
    }
  for (const [x, y, side] of picks) {
    const along: [number, number] = side === 0 ? [1, 0] : [0, 1];
    const inward: [number, number] = side === 0 ? [0, 1] : side === 1 ? [1, 0] : [-1, 0];
    const gone: [number, number][] = [[x, y]];
    if (hash(x, y, o.seed + 1) < 0.55) {
      const nx = x + along[0], ny = y + along[1];
      const open = side === 0 ? !solid(nx, ny - 1) : side === 1 ? !solid(nx - 1, ny) : !solid(nx + 1, ny);
      if (isBare(f, f.idx(nx, ny), o.meshes) && open) gone.push([nx, ny]);
    }
    for (const [gx, gy] of gone) {
      const j = f.idx(gx, gy);
      f.pal[j] = -1;
      f.mesh[j] = -1;
      f.over[j] = null;
    }
    gone.forEach(([gx, gy], k) => {
      const j = f.idx(gx + inward[0], gy + inward[1]);
      if (!isBare(f, j, o.meshes)) return;
      const lit = side !== 2 && f.lightv[j] > 0.3;
      if (o.fresh !== undefined) f.pal[j] = o.fresh;
      f.step[j] = lit ? (k === 0 ? 6 : 5) : Math.min(6, f.step[j] + 1);
    });
  }
}

/** A crack wandering down from (x, y) for `len` px, optionally with one branch. */
function crackPath(x: number, y: number, len: number, seed: number, o: { branch?: boolean; drift?: number } = {}): [number, number][][] {
  const main: [number, number][] = [[x, y]];
  let cx = x, cy = y, drift = o.drift ?? 0;
  for (let k = 1; k < len; k++) {
    const r = hash(k, 1, seed);
    if (r < 0.22) drift = -1;
    else if (r > 0.78) drift = 1;
    else if (r > 0.45 && r < 0.58) drift = 0;
    cy += 1;
    if (hash(k, 2, seed) < 0.55) cx += drift;
    main.push([cx, cy]);
  }
  const paths = [main];
  if (o.branch && len > 5) {
    const at = Math.floor(len * (0.3 + hash(3, 3, seed) * 0.3));
    let [bx, by] = main[at];
    const dir = hash(4, 4, seed) < 0.5 ? -1 : 1;
    const br: [number, number][] = [];
    for (let k = 0; k < Math.max(3, Math.floor(len * 0.45)); k++) {
      bx += dir;
      if (hash(k, 5, seed) < 0.6) by += 1;
      br.push([bx, by]);
    }
    paths.push(br);
  }
  return paths;
}

/**
 * Paints crack paths: a dark core (the material's outline tone), tapering to a mere shadow at its
 * ends, with a lit lip on the right/lower wall that faces the light.
 */
function paintCrack(f: Frame, paths: [number, number][][], meshes: number[]): void {
  const cells = new Map<number, boolean>();
  paths.forEach((pts, pi) =>
    pts.forEach(([x, y], k) => {
      const i = f.idx(x, y);
      if (i < 0 || !meshes.includes(f.mesh[i]) || f.pal[i] < 0 || f.pal[i] === MOSS) return;
      const end = k === pts.length - 1 || (pi === 0 && k === 0);
      cells.set(i, (cells.get(i) ?? true) && end);
    }),
  );
  for (const [i, end] of cells) {
    if (end) f.step[i] = Math.max(1, f.step[i] - 2);
    else f.over[i] = mix(PAL[f.pal[i]][0], PAL[f.pal[i]][1], 0.45);
  }
  for (const [i] of cells)
    for (const j of [i + 1, i + f.w]) {
      if (cells.has(j) || j >= f.w * f.h || f.pal[j] < 0 || !meshes.includes(f.mesh[j]) || f.over[j]) continue;
      if (f.lightv[j] > 0.3) f.step[j] = Math.min(6, f.step[j] + 1);
    }
}

/** Incised marks: '#' cuts a groove (step 1); the uncut pixel right of and below it catches the light. */
function carve(f: Frame, x0: number, y0: number, rows: string[], meshes: number[]): void {
  const cut = new Set<number>();
  rows.forEach((row, dy) =>
    [...row].forEach((ch, dx) => {
      const i = f.idx(x0 + dx, y0 + dy);
      if (ch === '#' && isBare(f, i, meshes)) cut.add(i);
    }),
  );
  for (const i of cut) f.step[i] = 1;
  for (const i of cut)
    for (const j of [i + 1, i + f.w]) if (!cut.has(j) && isBare(f, j, meshes)) f.step[j] = Math.min(6, f.step[j] + 1);
}

/**
 * A knot in wood at (x, y): a dark heart two pixels tall, a lit rim on its upper left, a shadow
 * rim on its lower right, and the grain bending round it above and below.
 */
function knot(f: Frame, x: number, y: number, meshes: number[]): void {
  const put = (dx: number, dy: number, fn: (s: number) => number) => {
    const i = f.idx(x + dx, y + dy);
    if (isBare(f, i, meshes)) f.step[i] = clamp(fn(f.step[i]), 1, 6);
  };
  put(0, 0, () => 1);
  put(0, 1, () => 1);
  put(-1, 0, (s) => s + 1);
  put(-1, 1, (s) => s + 1);
  put(1, 0, (s) => s - 1);
  put(1, 1, () => 2);
  put(0, -1, (s) => s - 1);
  put(0, 2, () => 2);
  put(-1, -2, (s) => s - 1);
  put(1, 3, (s) => s - 1);
}

// --- framing --------------------------------------------------------------------------------

/**
 * Crops every frame of a sprite to the union of their opaque bounds (1 px margin) so all frames
 * share one size and one anchor. (gx, gy) is the ground point on the work canvas; the anchor y is
 * the lowest opaque row of the first frame.
 */
function finish(name: string, label: string, meters: [number, number], tags: string[], anims: Record<string, { frames: Canvas[]; fps: number; loop?: boolean }>, gx: number, gy?: number): WorldSprite {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const a of Object.values(anims))
    for (const fr of a.frames) {
      const b = fr.bounds();
      if (!b) continue;
      x0 = Math.min(x0, b[0]);
      y0 = Math.min(y0, b[1]);
      x1 = Math.max(x1, b[2]);
      y1 = Math.max(y1, b[3]);
    }
  x0 -= 1;
  y0 -= 1;
  x1 += 1;
  y1 += 1;
  const crop = (c: Canvas): Canvas => {
    const out = new Canvas(x1 - x0 + 1, y1 - y0 + 1);
    out.draw(c, -x0, -y0);
    return out;
  };
  const first = Object.values(anims)[0].frames[0];
  const fb = first.bounds()!;
  const out: Record<string, Anim> = {};
  for (const [k, a] of Object.entries(anims)) out[k] = { frames: a.frames.map(crop), fps: a.fps, loop: a.loop };
  return { name, label, meters, anchor: [gx - x0, (gy ?? fb[3]) - y0], tags, anims: out };
}

/** Grass tufts rooted on the lowest opaque pixel of each listed column (the ground contact). */
function baseTufts(c: Canvas, xs: [number, number][], seed: number, h = 4): void {
  xs.forEach(([x, n], k) => {
    let y = -1;
    for (let yy = c.h - 1; yy >= 0; yy--)
      if (c.alpha(x, yy) > 0) {
        y = yy;
        break;
      }
    if (y >= 0) grassTuft(c, x, y, n, seed + k * 17, { h });
  });
}

// ================================================================================================
// STONE LANTERN (toro)
// ================================================================================================

/** A ring on a hexagon of circumradius r (flat face to the viewer), 24 points; corners lift and reach out. */
function kasaRing(h: number, r: number, lift: number, out = 0): V3[] {
  const pts: V3[] = [];
  const N = 24, seg = Math.PI / 3;
  for (let j = 0; j < N; j++) {
    const a = Math.PI / 3 + (j * TAU) / N;
    const rel = (((a - Math.PI / 3) % seg) + seg) % seg;
    const dc = Math.min(rel, seg - rel);
    const polyR = (r * Math.cos(Math.PI / 6)) / Math.cos(Math.PI / 6 - dc);
    const cf = Math.max(0, 1 - dc / (seg * 0.4)) ** 1.5;
    pts.push([Math.cos(a) * (polyR + out * cf), h + lift * cf, Math.sin(a) * (polyR + out * cf)]);
  }
  return pts;
}

/** Flame bitmaps, top row first: d deep red, r red tip, o orange, y yellow, w white-hot core. */
const LANTERN_FLAMES = [
  ['.r.', '.o.', '.oo', 'oyo', 'ywy', 'ywy', 'dod'],
  ['..r', '.ro', '.oy', 'oyo', 'ywy', 'ywy', 'dod'],
  ['.r.', '.o.', 'oyo', 'ywy', 'ywy', 'dod'],
  ['r..', 'or.', 'oo.', 'oyo', 'ywy', 'ywy', 'dod'],
  ['.r.', '.o.', '.o.', 'oyo', 'yyo', 'ywy', 'dod'],
  ['.r.', 'roo', 'oyo', 'ywy', 'ywy', 'dod'],
];

/** Lotus petals round a sloped ring band: a groove between petals and a lit rib down each. */
function lotus(f: Frame, mesh: number, n: number, minUp: number, maxUp: number, rot = 0): void {
  for (let i = 0; i < f.w * f.h; i++) {
    if (!isBare(f, i, [mesh])) continue;
    const nn = f.normal(i);
    if (nn[1] < minUp || nn[1] > maxUp) continue;
    const p = f.world(i);
    const fr = ((((Math.atan2(p[2], p[0]) + rot) / TAU) * n) % 1 + 1) % 1;
    if (fr < 0.14) f.step[i] = Math.max(1, f.step[i] - 2);
    else if (fr < 0.26) f.step[i] = Math.max(1, f.step[i] - 1);
    else if (fr > 0.5 && fr < 0.68 && f.lightv[i] > 0.35) f.step[i] = Math.min(6, f.step[i] + 1);
  }
}

/** Upturned petal arches carved round the vertical faces of a ring between heights h0 and h1. */
function scallops(f: Frame, mesh: number, h0: number, h1: number, n: number, rot = 0): void {
  for (let i = 0; i < f.w * f.h; i++) {
    if (!isBare(f, i, [mesh]) || Math.abs(f.normal(i)[1]) > 0.4) continue;
    const p = f.world(i);
    if (p[1] < h0 || p[1] > h1) continue;
    const fr = ((((Math.atan2(p[2], p[0]) + rot) / TAU) * n) % 1 + 1) % 1;
    const arch = h0 + 0.4 + (h1 - h0 - 1.2) * (1 - (2 * fr - 1) ** 2);
    const d = p[1] - arch;
    if (Math.abs(d) < 0.55) f.step[i] = Math.max(1, f.step[i] - 1);
    else if (d > 0.55) f.step[i] = Math.max(1, f.step[i] - 1);
    else if (d > -1.5 && f.lightv[i] > 0.35) f.step[i] = Math.min(6, f.step[i] + 1);
  }
}

function stoneLantern(): WorldSprite {
  const W = 90, H = 130, ox = 45, oy = 112;
  const build = () => {
    GROUP = 1;
    const sc = new Scene();
    const st = (seed: number, extra: Partial<MeshOpts> = {}): MeshOpts => ({ pal: STONE, seed, tex: 0.07, texCell: 6, steps: [1, 2, 3, 4, 5], ...extra });
    // Base: a wide hexagonal slab and a chamfered second tier (petals are carved on its slope).
    const base = sc.add(loft([hexRing(0, 0, 0, 16), hexRing(0, 4.5, 0, 16), hexRing(0, 6.5, 0, 14.5)], { capEnd: true }), st(11, { ao: 2 }));
    const base2 = sc.add(loft([hexRing(0, 6.5, 0, 11.5), hexRing(0, 9, 0, 11.5), hexRing(0, 10.5, 0, 8.5)], { capEnd: true }), st(12));
    // Pillar (sao) with a raised band (fushi) below the middle and a thin collar near the top.
    const pillarRings: V3[][] = [];
    const prof: [number, number][] = [[10.5, 5.4], [19.5, 5.2], [19.5, 6.3], [22, 6.3], [22, 5.1], [32.4, 4.9], [32.4, 5.6], [33.8, 5.6], [33.8, 4.8], [36, 4.8]];
    for (const [hh, r] of prof) pillarRings.push(ring(0, hh, 0, r, r, 14));
    const pillar = sc.add(loft(pillarRings, { smooth: true }), st(13, { steps: [1, 2, 3, 3, 4, 5], bias: -0.04 }));
    // Middle platform (chudai): lotus flare then a hexagonal slab.
    const chudai = sc.add(loft([hexRing(0, 35.5, 0, 6.5), hexRing(0, 38.5, 0, 10.8), hexRing(0, 39.5, 0, 12), hexRing(0, 43, 0, 12)], { capEnd: true }), st(14));
    // Firebox (hibukuro).
    const fire = sc.add(loft([hexRing(0, 43, 0, 9.5), hexRing(0, 62, 0, 9.5)], { capEnd: true }), st(15, { bias: -0.06 }));
    // Roof (kasa): eave fascia, a concave sloped top with upturned corners, the finial seat.
    const roof = sc.add(
      loft([kasaRing(61.5, 17, 1, 0), kasaRing(61.5, 18.5, 3.5, 1.5), kasaRing(64, 18.5, 4.2, 1.5), kasaRing(66.5, 15, 1.4, 0.4), kasaRing(70, 10.5, 0.4), kasaRing(74, 6.2, 0), kasaRing(75.5, 4.2, 0)], { capStart: true, capEnd: true }),
      st(16, { bias: -0.08 }),
    );
    // Finial: lotus cup and the jewel (hoju).
    const cup = sc.add(loft([ring(0, 75.5, 0, 2.6, 2.6, 8), ring(0, 77.2, 0, 3.8, 3.8, 8), ring(0, 78, 0, 3, 3, 8)], { capEnd: true, smooth: true }), st(17));
    const jewelR: V3[][] = [];
    for (const [hh, r] of [[78, 2.2], [79, 3.3], [81, 3.7], [83, 3], [84.5, 1.6]] as [number, number][]) jewelR.push(ring(0, hh, 0, r, r, 10));
    const jewel = sc.add(loft(jewelR, { capStart: true, capEnd: [0, 86.5, 0], smooth: true }), st(18, { steps: [1, 2, 3, 4, 5, 6], bias: -0.05 }));
    return { sc, base, base2, pillar, chudai, fire, roof, cup, jewel };
  };

  const frame = (lit: boolean, t: number): Canvas => {
    const parts = build();
    const f = render(parts.sc, W, H, ox, oy);
    const id = (mm: Mesh) => mm.id;
    const all = [parts.base, parts.base2, parts.pillar, parts.chudai, parts.fire, parts.roof].map(id);
    // --- carving
    lotus(f, id(parts.base2), 12, 0.3, 0.97, 0.26);
    scallops(f, id(parts.chudai), 39.5, 43, 12, 0.26);
    for (let i = 0; i < W * H; i++) {
      if (!isBare(f, i, [id(parts.fire)])) continue;
      const p = f.world(i);
      if (f.normal(i)[1] > 0.4) continue;
      // Rails at the top and bottom of the firebox: a groove with a lit lip under it.
      for (const gh of [45, 60.2]) {
        const d = p[1] - gh;
        if (Math.abs(d) < 0.5) f.step[i] = Math.max(1, f.step[i] - 1);
        else if (d < -0.5 && d > -1.5 && f.lightv[i] > 0.3) f.step[i] = Math.min(6, f.step[i] + 1);
      }
    }
    // Raised hips on the roof: the six corner ridges catch the light.
    for (let i = 0; i < W * H; i++) {
      if (!isBare(f, i, [id(parts.roof)]) || f.normal(i)[1] < 0.25) continue;
      const p = f.world(i);
      const r = Math.hypot(p[0], p[2]);
      if (r < 5.5 || r > 17.5) continue;
      const seg = Math.PI / 3;
      const a = (((Math.atan2(p[2], p[0]) - Math.PI / 3) % seg) + seg) % seg;
      const arc = Math.min(a, seg - a) * r;
      if (arc < 0.7) f.step[i] = Math.min(6, f.step[i] + (p[0] < 2 ? 2 : 1));
      else if (arc < 1.6 && a < seg / 2) f.step[i] = Math.max(1, f.step[i] - 1);
    }
    // An inscription down the pillar's front, above and below the band.
    const [px, py] = f.proj([0, 30.5, -4.9]).map(Math.round);
    carve(f, px - 1, py, ['###', '.#.', '###', '#.#', '...', '.#.', '###', '#.#'], [id(parts.pillar)]);
    const [qx, qy] = f.proj([0, 18, -5.2]).map(Math.round);
    carve(f, qx - 1, qy, ['#.#', '###', '.#.', '##.'], [id(parts.pillar)]);
    // --- growth and weather
    paintMoss(f, { meshes: [id(parts.roof)], amount: 0.42, seed: 301, cell: 7, drip: 3, bumps: true, tufts: 0.22 });
    paintMoss(f, { meshes: [id(parts.chudai), id(parts.base2)], amount: 0.3, seed: 302, cell: 6, drip: 2, tufts: 0.15 });
    paintMoss(f, { meshes: [id(parts.base)], amount: 0.42, seed: 303, cell: 7, drip: 2, bumps: true, tufts: 0.2 });
    paintStreaks(f, { meshes: all, seed: 320, density: 0.2, maxLen: 9 });
    paintLichen(f, { meshes: all, seed: 310, density: 0.2, minLight: 0.4 });
    autoChips(f, { meshes: all, seed: 330, density: 0.07 });
    paintCrack(f, crackPath(ox - 12, oy - 3, 6, 341, { drift: 1 }), [id(parts.base)]);
    paintCrack(f, crackPath(ox + 3, oy - 31, 5, 342), [id(parts.pillar)]);
    paintCrack(f, crackPath(ox + 7, oy - 64, 5, 343, { branch: true }), [id(parts.fire)]);
    // --- the firebox: a front opening, a sun on the left face and a moon on the right
    const frontD = -9.5 * Math.cos(Math.PI / 6);
    const [wx0, wy1] = f.proj([-3.5, 45.8, frontD]).map(Math.round);
    const [wx1, wy0] = f.proj([3.5, 56.5, frontD]).map(Math.round);
    const flick = [0, 1, 1, 0, -1, -1][t % 6];
    const warmSet = (x: number, y: number, v: number) => {
      const i = f.idx(x, y);
      if (i >= 0) f.warm[i] = Math.max(f.warm[i], v);
    };
    const fcx = wx0 + Math.floor((wx1 - wx0 - 3) / 2) + 1; // flame center column
    for (let y = wy0; y < wy1; y++)
      for (let x = wx0; x < wx1; x++) {
        const i = f.idx(x, y);
        const fromBottom = wy1 - 1 - y;
        if (fromBottom < 2) {
          // The sill: the bottom inside face, seen from above.
          f.set(x, y, STONE, fromBottom === 0 ? 2 : 3);
          if (lit) warmSet(x, y, fromBottom === 1 ? 0.95 : 0.7);
          continue;
        }
        if (!lit) {
          f.over[i] = y === wy0 || x === wx0 ? C(STONE, 0) : mix(C(STONE, 0), C(STONE, 1), 0.45);
          continue;
        }
        // Lit inside: the back wall glows, brightest low and round the flame, banded on the ember ramp.
        const dx = Math.abs(x - fcx), up = fromBottom - 2;
        const v = 1.05 - up / 9 - dx / 4.5 + flick * 0.06;
        f.over[i] = y === wy0 ? C(EMBER, 1) : x === wx0 ? C(EMBER, v > 0.5 ? 3 : 2) : C(EMBER, v > 0.78 ? 5 : v > 0.52 ? 4 : v > 0.28 ? 3 : 2);
      }
    const sideHole = (cxW: number, cdW: number, moon: boolean) => {
      const [sx, sy] = f.proj([cxW, 51.5, cdW]).map(Math.round);
      const pts: [number, number][] = moon ? [[1, -1], [0, 0], [0, 1], [1, 2]] : [[0, -1], [1, -1], [0, 0], [1, 0], [0, 1], [1, 1]];
      for (const [dx, dy] of pts) {
        const i = f.idx(sx + dx, sy + dy);
        if (i < 0) continue;
        f.over[i] = lit ? C(EMBER, dy >= 1 ? 5 + (flick > 0 ? 1 : 0) : 4) : dy === -1 ? C(STONE, 0) : mix(C(STONE, 0), C(STONE, 1), 0.5);
        if (lit) for (const [ax, ay] of [[-1, 0], [2, 0], [0, 2], [1, 2], [-1, 1]]) warmSet(sx + dx + ax, sy + dy + ay, 0.3);
      }
    };
    sideHole(-7.2, -2.6, false);
    sideHole(6.8, -2.6, true);
    if (lit) {
      // Light spill: the platform in front of the window and a rim of the stone round the opening.
      const cx = fcx + 0.5, cy = wy1 - 1;
      const rad = 9 + flick * 0.9;
      for (let y = 0; y < f.h; y++)
        for (let x = 0; x < f.w; x++) {
          const i = f.idx(x, y);
          if (f.pal[i] < 0 || f.over[i]) continue;
          const mi = f.mesh[i];
          if (mi !== id(parts.fire) && mi !== id(parts.chudai)) continue;
          const isTop = f.normal(i)[1] > 0.5;
          const dx = (x + 0.5 - cx) / rad, dy = (y + 0.5 - cy) / (isTop ? rad * 0.45 : rad * 0.75);
          const d = Math.hypot(dx, dy);
          if (d > 1) continue;
          const v = isTop ? (1 - d) * 1.1 : y >= wy0 - 1 && y < wy1 ? (1 - d) * 0.7 : (1 - d) * 0.35;
          warmSet(x, y, v * (1 + flick * 0.08));
        }
    }
    const c = f.compose();
    if (lit) {
      const bm = LANTERN_FLAMES[t % 6];
      const fx = fcx - 1, fb = wy1 - 2;
      bm.forEach((row, k) => {
        for (let dx = 0; dx < row.length; dx++) {
          const ch = row[dx] as keyof typeof FLAME | '.';
          if (ch !== '.') c.set(fx + dx, fb - (bm.length - k), FLAME[ch]);
        }
      });
      // The wick sits in a little oil dish on the sill.
      c.set(fx + 1, fb, C(INK, 3));
      c.set(fx, fb, mix(C(EMBER, 2), C(INK, 3), 0.5));
      c.set(fx + 2, fb, mix(C(EMBER, 2), C(INK, 3), 0.5));
    } else {
      // An unlit candle stub on the sill.
      const fb = wy1 - 2;
      c.set(fcx, fb - 1, C(PAPER, 2));
      c.set(fcx, fb - 2, C(PAPER, 3));
      c.set(fcx, fb - 3, C(INK, 2));
    }
    seal(c, f);
    baseTufts(c, [[ox - 13, 3], [ox + 11, 2]], 351, 4);
    return c;
  };

  const litFrames = [0, 1, 2, 3, 4, 5].map((t) => frame(true, t));
  const unlit = frame(false, 0);
  return finish('stone_lantern', 'Stone Lantern', [0.7, 1.7], ['light-source', 'cover-half', 'interactable'], { lit: { frames: litFrames, fps: 8 }, unlit: { frames: [unlit], fps: 0 } }, ox);
}

// ================================================================================================
// STONES
// ================================================================================================

/**
 * A faceted stone: jittered rings stacked by `profile` ([height fraction, radius fraction]),
 * leaning toward `lean` px at the top, closed by a low pyramid so the top breaks into facets.
 */
function rockMesh(o: { cx: number; cd: number; rx: number; rd: number; h: number; n?: number; seed: number; lean?: number; leanD?: number; profile?: [number, number][]; rot?: number; jit?: number; hJit?: number; h0?: number; apexUp?: number }): Tri[] {
  const prof = o.profile ?? [[0, 0.9], [0.32, 1], [0.72, 0.82], [0.94, 0.45]];
  const n = o.n ?? 8;
  const h0 = o.h0 ?? 0;
  const rings = prof.map(([hf, rf], k) =>
    ring(o.cx + (o.lean ?? 0) * hf, h0 + hf * o.h, o.cd + (o.leanD ?? 0) * hf, o.rx * rf, o.rd * rf, n, {
      rot: (o.rot ?? 0.3) + (k % 2) * (Math.PI / n) * 0.35,
      jit: o.jit ?? 0.12,
      hJit: k > 0 ? o.h * (o.hJit ?? 0.05) : 0,
      seed: o.seed + k * 7,
    }),
  );
  const apex: V3 = [o.cx + (o.lean ?? 0) * 1.05 + (rnd(o.seed, 9) - 0.5) * o.rx * 0.3, h0 + o.h * (1 + (o.apexUp ?? 0.03)), o.cd + (o.leanD ?? 0) + (rnd(o.seed, 10) - 0.5) * o.rd * 0.3];
  return loft(rings, { capEnd: apex });
}

const stoneOpts = (seed: number, extra: Partial<MeshOpts> = {}): MeshOpts => ({ pal: STONE, seed, tex: 0.035, texCell: 10, contrast: 1.2, facetVar: 0.07, ao: 3, form: 0.35, steps: [1, 2, 3, 4, 5], ...extra });

function boulder(): WorldSprite {
  const W = 130, H = 110, ox = 62, oy = 90;
  GROUP = 1;
  const sc = new Scene();
  const main = sc.add(rockMesh({ cx: -3, cd: 0, rx: 39, rd: 22, h: 52, n: 8, seed: 21, lean: -7, leanD: 2, profile: [[0, 0.86], [0.22, 1], [0.6, 0.9], [0.88, 0.55]], rot: 0.25, jit: 0.12, hJit: 0.07 }), stoneOpts(21));
  const lump = sc.add(rockMesh({ cx: 25, cd: -7, rx: 18, rd: 13, h: 24, n: 7, seed: 22, lean: -2, profile: [[0, 0.95], [0.4, 1], [0.8, 0.7]], rot: 0.6, jit: 0.15 }), stoneOpts(22));
  const feet: Mesh[] = [];
  const foot = (cx: number, cd: number, rx: number, h: number, seed: number, p: number) =>
    feet.push(sc.add(rockMesh({ cx, cd, rx, rd: rx * 0.75, h, n: 6, seed, profile: [[0, 0.95], [0.5, 1], [0.9, 0.6]], jit: 0.18 }), { pal: p, seed, crest: true, bias: -0.04, steps: [1, 2, 3, 4, 5] }));
  foot(40, -16, 5.5, 5, 31, STONE);
  foot(48, -10, 3.5, 3.5, 32, STONE_W);
  foot(-38, -16, 4.5, 4, 33, STONE_W);
  foot(-30, -21, 3, 2.5, 34, SLATE);
  foot(33, -21, 2.5, 2.5, 35, STONE);
  const f = render(sc, W, H, ox, oy);
  const big = [main.id, lump.id];
  paintMoss(f, { meshes: [main.id], amount: 0.5, seed: 401, cell: 10, drip: 3, minUp: 0.4, bumps: true, tufts: 0.2, size: 1.1 });
  paintMoss(f, { meshes: [lump.id], amount: 0.32, seed: 402, cell: 7, drip: 2, minUp: 0.4, bumps: true, tufts: 0.15 });
  paintStreaks(f, { meshes: big, seed: 420, density: 0.26, maxLen: 11 });
  paintLichen(f, { meshes: big, seed: 410, density: 0.3, minLight: 0.35 });
  autoChips(f, { meshes: [...big, ...feet.map((x) => x.id)], seed: 430, density: 0.08 });
  paintCrack(f, crackPath(ox - 9, oy - 31, 17, 441, { branch: true }), [main.id]);
  paintCrack(f, crackPath(ox + 15, oy - 41, 8, 442, { drift: 1 }), [main.id]);
  paintCrack(f, crackPath(ox - 26, oy - 14, 7, 443), [main.id]);
  paintCrack(f, crackPath(ox + 30, oy - 15, 6, 444, { branch: true }), [lump.id]);
  const c = f.compose();
  seal(c, f);
  baseTufts(c, [[ox - 31, 4], [ox - 4, 3], [ox + 20, 3], [ox + 44, 2]], 451, 5);
  return finish('boulder', 'Mossy Boulder', [1.6, 1.3], ['cover-3q', 'climbable'], { idle: { frames: [c], fps: 0 } }, ox);
}

function rock(): WorldSprite {
  const W = 80, H = 60, ox = 38, oy = 46;
  GROUP = 1;
  const sc = new Scene();
  const main = sc.add(rockMesh({ cx: 0, cd: 0, rx: 23, rd: 13, h: 21, n: 8, seed: 51, lean: -4, profile: [[0, 0.92], [0.35, 1], [0.75, 0.8], [0.95, 0.45]], rot: 0.5, jit: 0.12 }), stoneOpts(51, { texCell: 9, ao: 2 }));
  const side = sc.add(rockMesh({ cx: 17, cd: -6, rx: 7, rd: 5, h: 6, n: 6, seed: 52, profile: [[0, 0.95], [0.5, 1], [0.9, 0.6]], jit: 0.15 }), { pal: STONE_W, seed: 52, bias: -0.04, steps: [1, 2, 3, 4, 5] });
  const f = render(sc, W, H, ox, oy);
  paintMoss(f, { meshes: [main.id], amount: 0.34, seed: 451, cell: 6, drip: 2, minUp: 0.45, bumps: true, tufts: 0.18 });
  paintStreaks(f, { meshes: [main.id], seed: 455, density: 0.25, maxLen: 6 });
  paintLichen(f, { meshes: [main.id], seed: 452, density: 0.3, minLight: 0.35 });
  autoChips(f, { meshes: [main.id, side.id], seed: 456, density: 0.09, gap: 6 });
  paintCrack(f, crackPath(ox + 4, oy - 17, 9, 453, { branch: true }), [main.id]);
  const c = f.compose();
  seal(c, f);
  baseTufts(c, [[ox - 18, 3], [ox + 9, 2]], 457, 4);
  return finish('rock', 'Rock', [0.9, 0.6], ['cover-half'], { idle: { frames: [c], fps: 0 } }, ox);
}

function pebbles(): WorldSprite {
  const W = 50, H = 30, ox = 24, oy = 22;
  GROUP = 1;
  const sc = new Scene();
  const list: [number, number, number, number, number, number][] = [
    // cx, cd, rx, h, seed, palette
    [-6, 2, 7, 6, 61, STONE],
    [5, -1, 6, 5, 62, STONE_W],
    [-13, -4, 4, 3.5, 63, SLATE],
    [12, -6, 4, 3, 64, STONE],
    [0, -8, 3.5, 3, 65, QUARTZ],
    [-2, 9, 4.5, 4, 66, STONE_W],
    [13, 5, 3, 2.5, 67, SLATE],
  ];
  const ms = list.map(([cx, cd, rx, h, seed, p]) =>
    sc.add(rockMesh({ cx, cd, rx, rd: rx * 0.75, h, n: 7, seed, profile: [[0, 0.9], [0.45, 1], [0.85, 0.65]], jit: 0.12, apexUp: 0.05 }), { pal: p, seed, crest: true, bias: -0.05, steps: [1, 2, 3, 4, 5], form: 0.3 }),
  );
  const f = render(sc, W, H, ox, oy);
  paintMoss(f, { meshes: [ms[0].id], amount: 0.3, seed: 471, cell: 4, drip: 1, minUp: 0.5, tufts: 0.2, minArea: 5 });
  autoChips(f, { meshes: ms.map((x) => x.id), seed: 472, density: 0.08, gap: 5 });
  const c = f.compose();
  seal(c, f);
  return finish('rocks_small', 'Pebbles', [0.6, 0.25], ['ambient'], { idle: { frames: [c], fps: 0 } }, ox);
}

/** Pixels of a 1 px ellipse ring (no doubled corners), as [x, y, angle] with angle 0 at the right, PI/2 at the front. */
function ellipseRing(cx: number, cy: number, rx: number, ry: number): [number, number, number][] {
  const seen = new Map<string, [number, number, number]>();
  const n = Math.ceil((rx + ry) * 8);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU;
    const x = Math.floor(cx + Math.cos(a) * rx), y = Math.floor(cy + Math.sin(a) * ry);
    const key = `${x},${y}`;
    if (!seen.has(key)) seen.set(key, [x, y, a]);
  }
  const pts = [...seen.values()];
  // Pixel-perfect: drop the corner pixel of every L so the ring stays 1 px thin.
  const out: [number, number, number][] = [];
  for (let k = 0; k < pts.length; k++) {
    const prev = out[out.length - 1], next = pts[(k + 1) % pts.length], c = pts[k];
    if (prev && Math.abs(prev[0] - next[0]) === 1 && Math.abs(prev[1] - next[1]) === 1 && Math.abs(prev[0] - c[0]) + Math.abs(prev[1] - c[1]) === 1 && Math.abs(next[0] - c[0]) + Math.abs(next[1] - c[1]) === 1) continue;
    out.push(c);
  }
  return out;
}

function riverStones(): WorldSprite {
  const W = 110, H = 64, ox = 54, oy = 38;
  const stones = [
    { cx: -25, cd: -9, rx: 13.5, rd: 9.5, h: 5, seed: 71 },
    { cx: 2, cd: 2, rx: 12, rd: 8.5, h: 6, seed: 72 },
    { cx: 27, cd: 13, rx: 10.5, rd: 7.5, h: 4.5, seed: 73 },
  ];
  GROUP = 1;
  const sc = new Scene();
  const meshes = stones.map((s) =>
    sc.add(rockMesh({ cx: s.cx, cd: s.cd, rx: s.rx, rd: s.rd, h: s.h + 3, h0: -3, n: 8, seed: s.seed, profile: [[0, 1.03], [0.4, 1], [0.74, 0.88], [1, 0.56]], apexUp: 0.09, jit: 0.11, hJit: 0.04 }), {
      pal: STONE_WET,
      seed: s.seed,
      contrast: 1.15,
      facetVar: 0.05,
      tex: 0.03,
      texCell: 8,
      form: 0.25,
      steps: [1, 2, 3, 3, 4, 5],
    }),
  );
  const ids = meshes.map((x) => x.id);
  const f = render(sc, W, H, ox, oy);
  const sub = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (f.mesh[i] < 0) continue;
    const p = f.world(i);
    if (p[1] < -0.3) {
      f.pal[i] = STONE_SUB;
      f.over[i] = null;
      sub[i] = 1;
    } else if (p[1] < 1.4) {
      // The wet band just above the water, with a fringe of green algae on the front.
      if (f.normal(i)[1] < 0.6 && hash(i % W, 5, 79) < 0.55) {
        f.pal[i] = MOSS;
        f.step[i] = p[1] < 0.5 ? 1 : 2;
      } else f.step[i] = Math.max(1, f.step[i] - 1);
    }
  }
  paintMoss(f, { meshes: [ids[0]], amount: 0.28, seed: 481, cell: 5, drip: 1, minUp: 0.6, tufts: 0.1, minArea: 6 });
  autoChips(f, { meshes: ids, seed: 482, density: 0.05, gap: 8 });
  // Glints on the wet tops (upper-left part of each top).
  stones.forEach((s, k) => {
    const [gx, gy] = f.proj([s.cx - s.rx * 0.35, s.h + 0.5, s.cd - s.rd * 0.1]).map(Math.round);
    const streak: [number, number, number][] = k === 1 ? [[0, 0, 6], [1, 0, 5], [2, 0, 5], [-1, 1, 5], [4, 2, 5]] : [[0, 0, 6], [1, 0, 5], [-1, 1, 5], [3, -1, 5]];
    for (const [dx, dy, st] of streak) {
      const i = f.idx(gx + dx, gy + dy);
      if (i >= 0 && f.mesh[i] === ids[k] && !sub[i] && f.pal[i] === STONE_WET && f.normal(i)[1] > 0.6) f.step[i] = Math.max(f.step[i], st);
    }
  });
  const base = f.compose();
  base.outline({ toward: '#0b1a2c', amount: 0.55 });
  // Soften the outline under water: outline pixels touching submerged stone take a water tone.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (f.pal[i] >= 0 || f.over[i] || base.alpha(x, y) === 0) continue;
      const nearSub = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const j = f.idx(x + dx, y + dy);
        return j >= 0 && sub[j] === 1;
      });
      if (nearSub) base.set(x, y, WATER_R[1]);
    }
  for (const [x, y, col] of f.post) base.set(x, y, col);
  // Waterline: a light lip where each stone meets the water (front half), broken on the shadow side.
  stones.forEach((s, k) => {
    const [cx, cy] = f.proj([s.cx, 0, s.cd]);
    for (const [x, y, a] of ellipseRing(cx, cy, s.rx * 1.0 + 0.6, (s.rd * 1.0 + 0.6) * K)) {
      if (a <= 0.15 || a >= Math.PI - 0.15) continue;
      const i = f.idx(x, y);
      if (i < 0 || f.mesh[i] !== ids[k]) continue;
      const lit = Math.cos(a) < 0.35;
      if (!lit && hash(x, y, 77) < 0.5) continue;
      base.set(x, y, lit ? mix(WATER_R[6], PAPER_R[5], 0.35) : WATER_R[4]);
    }
  });

  const frames: Canvas[] = [];
  for (let t = 0; t < 6; t++) {
    const c = base.clone();
    const canDraw = (x: number, y: number) => {
      const i = f.idx(x, y);
      return i >= 0 && (c.alpha(x, y) === 0 || sub[i] === 1 || (f.pal[i] < 0 && !f.over[i]));
    };
    stones.forEach((s, k) => {
      const [cx, cy] = f.proj([s.cx, 0, s.cd]);
      for (let r = 0; r < 2; r++) {
        const age = ((t + 3 * r + k * 2) % 6) / 6; // 0 new .. 5/6 old
        const d = 1.5 + age * 7;
        const col = age < 0.3 ? WATER_R[5] : age < 0.6 ? WATER_R[4] : WATER_R[3];
        for (const [x, y, a] of ellipseRing(cx, cy, s.rx + d, (s.rd + d) * K)) {
          // Three arcs per ring that shorten as the ring spreads and fades.
          if (Math.cos(a * 3 + k * 1.7 + r * 2.1) < -0.75 + age * 1.3) continue;
          if (!canDraw(x, y)) continue;
          c.set(x, y, col);
        }
      }
    });
    // Little sun glints on the water that come and go.
    const glints: [number, number, number][] = [
      [-40, -2, 0],
      [-8, 6, 2],
      [14, -12, 4],
      [38, 2, 1],
      [-30, 9, 3],
    ];
    for (const [gx, gy, ph] of glints) {
      const on = (t + ph) % 6;
      if (on > 2) continue;
      const x = ox + gx, y = oy + gy;
      const len2 = on === 1 ? 3 : 2;
      for (let k = 0; k < len2; k++) if (canDraw(x + k, y)) c.set(x + k, y, on === 1 ? mix(WATER_R[6], PAPER_R[5], 0.5) : WATER_R[6]);
    }
    frames.push(c);
  }
  const front = stones[0];
  const [, gy] = f.proj([front.cx, 0, front.cd - front.rd]);
  return finish('river_stones', 'Stepping Stones', [1.4, 0.15], ['water', 'climbable'], { idle: { frames, fps: 5 } }, ox, Math.round(gy) + 1);
}

// ================================================================================================
// HOKORA (roadside shrine)
// ================================================================================================

/** Extrudes a star-shaped polygon given in the X-H plane along depth from d0 to d1 (closed both ends). */
function extrudeXH(poly: [number, number][], d0: number, d1: number): Tri[] {
  const r0: V3[] = poly.map(([x, h]) => [x, h, d0]);
  const r1: V3[] = poly.map(([x, h]) => [x, h, d1]);
  return loft([r0, r1], { capStart: true, capEnd: true });
}
/** A box with a chamfered top edge. */
function slab(x0: number, x1: number, h0: number, h1: number, d0: number, d1: number, ch = 1): Tri[] {
  const rect = (h: number, i: number): V3[] => [[x0 + i, h, d0 + i], [x1 - i, h, d0 + i], [x1 - i, h, d1 - i], [x0 + i, h, d1 - i]];
  return loft([rect(h0, 0), rect(h1 - ch, 0), rect(h1, ch)], { capEnd: true });
}
/** A flat quad as two triangles with a face normal turned toward `hint`. */
function quad(a: V3, b: V3, c: V3, d: V3, hint: V3, group: number): Tri[] {
  let n = unit(cross(sub(b, a), sub(c, a)));
  if (len(cross(sub(b, a), sub(c, a))) < 1e-6) n = unit(cross(sub(c, a), sub(d, a)));
  if (dot(n, hint) < 0) n = mul(n, -1);
  const out: Tri[] = [];
  if (len(cross(sub(b, a), sub(c, a))) > 1e-6) out.push({ v: [a, b, c], vn: [n, n, n], n, group });
  if (len(cross(sub(c, a), sub(d, a))) > 1e-6) out.push({ v: [a, c, d], vn: [n, n, n], n, group });
  return out;
}
/**
 * A curved roof shell with its gable to the front: the cross-section `hOf(x)` sampled at `xs`,
 * swept along depth from d0 (front) to d1, `thick` px thick. Each strip between two samples is its
 * own plane, so the sweep of the curve shades in bands like courses of bark shingles.
 */
function shell(xs: number[], hOf: (x: number) => number, d0: number, d1: number, thick: number): Tri[] {
  const tris: Tri[] = [];
  const endG = GROUP++, frontG = GROUP++, backG = GROUP++, underG = GROUP++;
  for (let k = 0; k + 1 < xs.length; k++) {
    const xa = xs[k], xb = xs[k + 1], ha = hOf(xa), hb = hOf(xb);
    const mid = (xa + xb) / 2;
    tris.push(...quad([xa, ha, d0], [xb, hb, d0], [xb, hb, d1], [xa, ha, d1], [mid * 0.06, 1, 0], GROUP++));
    tris.push(...quad([xa, ha - thick, d0], [xb, hb - thick, d0], [xb, hb - thick, d1], [xa, ha - thick, d1], [0, -1, 0], underG));
    tris.push(...quad([xa, ha, d0], [xb, hb, d0], [xb, hb - thick, d0], [xa, ha - thick, d0], [0, 0, -1], frontG));
    tris.push(...quad([xa, ha, d1], [xb, hb, d1], [xb, hb - thick, d1], [xa, ha - thick, d1], [0, 0, 1], backG));
  }
  for (const x of [xs[0], xs[xs.length - 1]]) {
    const hh = hOf(x);
    tris.push(...quad([x, hh, d0], [x, hh, d1], [x, hh - thick, d1], [x, hh - thick, d0], [Math.sign(x), 0, 0], endG));
  }
  return tris;
}

/**
 * A small Kasuga-style shrine on a mossy stone plinth, in the torii's colours: vermilion posts
 * and beams, black lacquered bargeboards, ridge, chigi and katsuogi (gilt caps), a white gable,
 * a dark hinoki-bark roof that sags into a curve and flicks up at the eaves, black doors with gilt
 * studs, a shimenawa with zigzag shide across the front, and an offering of kagami mochi between
 * two sakaki vases.
 */
function hokora(): WorldSprite {
  const W = 90, H = 110, ox = 45, oy = 92;
  GROUP = 1;
  const sc = new Scene();
  const st = (seed: number): MeshOpts => ({ pal: STONE, seed, tex: 0.04, texCell: 8, contrast: 1.1, ao: 2, steps: [1, 2, 3, 4, 5] });
  const lac = (p: number, seed: number, extra: Partial<MeshOpts> = {}): MeshOpts => ({ pal: p, seed, contrast: 1.15, facetVar: 0.02, steps: [1, 2, 3, 4, 5], ...extra });
  // Stone plinth: a footing, a pedestal and a top slab deep enough to hold the offering.
  const foot = sc.add(slab(-17, 17, 0, 5.5, -15, 12, 1.4), st(81));
  const ped = sc.add(slab(-11, 11, 5.5, 16.5, -10, 8, 1), st(82));
  const top = sc.add(slab(-14.5, 14.5, 16.5, 21, -13.5, 10.5, 1.2), st(83));
  // Black floor, white walls, vermilion posts, sill and lintel, a black head beam.
  sc.add(slab(-12, 12, 21, 23, -9.5, 8, 0.6), lac(BLACK, 84));
  sc.add(box(-9, 9, 23, 41, -6.5, 6), lac(PAPER, 85, { contrast: 0.9 }));
  sc.add(box(-9.6, -7, 23, 40.5, -7.6, -5), lac(RED, 86));
  sc.add(box(7, 9.6, 23, 40.5, -7.6, -5), lac(RED, 87));
  sc.add(box(-9.6, 9.6, 23, 24.6, -7.3, -5.5), lac(RED, 88));
  sc.add(box(-9.6, 9.6, 36.2, 38, -7.4, -5.5), lac(RED, 89));
  sc.add(box(-11.5, 11.5, 39.6, 42, -8, -4.8), lac(BLACK, 90));
  // The roof's curve: steep at the ridge, sagging toward the eaves, flicking up at the tips.
  const X = 17.5;
  const hOf = (x: number): number => {
    const ax = Math.abs(x);
    if (ax > X) return 44 + (ax - X) * 0.6;
    const t = ax / X;
    return 59 - 15 * (0.55 * t + 0.45 * (2 * t - t * t));
  };
  const d0 = -10.5, d1 = 9;
  // White gable under the bargeboards, with a red tie beam and king post.
  const gxs = [10, 7.5, 5, 2.5, 0, -2.5, -5, -7.5, -10];
  sc.add(extrudeXH([[-10, 42], [10, 42], ...gxs.map((x) => [x, hOf(x) - 2.3] as [number, number])], -8.4, -7), lac(PAPER, 91, { contrast: 0.9 }));
  sc.add(box(-7.8, 7.8, 45.2, 46.8, -9, -7.8), lac(RED, 92));
  sc.add(box(-0.9, 0.9, 46.8, 55, -8.9, -7.9), lac(RED, 93));
  const xs = [-19, -17.5, -15, -12.5, -10, -7.5, -5, -2.5, 0, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 19];
  const roof = sc.add(shell(xs, hOf, d0, d1, 2.2), { pal: HIWADA, seed: 94, contrast: 1.25, facetVar: 0.02, steps: [1, 2, 3, 4, 5] });
  const xsB = [-19.7, ...xs.slice(1, -1), 19.7];
  const barge = sc.add(shell(xsB, (x) => hOf(x) + 0.7, d0 - 0.9, d0 + 0.9, 3), lac(BLACK, 95));
  const ridge = sc.add(box(-1.6, 1.6, 58.3, 60.4, d0 - 0.4, d1 - 0.5), lac(BLACK, 96));
  const chigi = [0.62, -0.62].map((a, k) => sc.add(rotZ(box(-0.85, 0.85, 54, 65.5, d0 - 0.7, d0 + 0.7), a, 0, 58.5), lac(BLACK, 97 + k)));
  const katsuo = [-3, 4].map((dk, k) => sc.add(pole([-3.8, 61.6, dk], [3.8, 61.6, dk], 1.35, 8), lac(BLACK, 99 + k)));
  const f = render(sc, W, H, ox, oy);
  const stone = [foot.id, ped.id, top.id];
  // Bark courses on the roof: a dark seam every 2.4 px of rise with a lit edge above it.
  for (let i = 0; i < W * H; i++) {
    if (!isBare(f, i, [roof.id]) || f.normal(i)[1] < 0.3) continue;
    const p = f.world(i);
    const r = (((59 - p[1]) % 2.4) + 2.4) % 2.4;
    if (r < 0.7) f.step[i] = Math.max(1, f.step[i] - 1);
    else if (r > 1.8 && f.lightv[i] > 0.5) f.step[i] = Math.min(6, f.step[i] + 1);
  }
  // A lit edge along the top of the bargeboards and gilt caps on the katsuogi and chigi tips.
  for (let i = 0; i < W * H; i++) {
    const mi = f.mesh[i];
    if (mi < 0) continue;
    const p = f.world(i);
    if (katsuo.some((k) => k.id === mi) && Math.abs(p[0]) > 2.6) {
      f.pal[i] = GOLD;
      f.step[i] = clamp(f.step[i] + 1, 2, 6);
    }
    if (mi === barge.id && f.normal(i)[1] > 0.3 && p[0] < 0) f.step[i] = Math.min(6, f.step[i] + 1);
    if (chigi.some((k) => k.id === mi) && p[1] > 63.6) {
      f.pal[i] = GOLD;
      f.step[i] = clamp(f.step[i], 2, 5);
    }
  }
  void ridge;
  paintMoss(f, { meshes: [roof.id], amount: 0.24, seed: 811, cell: 6, drip: 1, minUp: 0.3, bumps: true, tufts: 0.18 });
  paintMoss(f, { meshes: [foot.id], amount: 0.38, seed: 812, cell: 6, drip: 2, tufts: 0.18 });
  paintMoss(f, { meshes: [top.id], amount: 0.22, seed: 815, cell: 5, drip: 2, tufts: 0.12 });
  paintStreaks(f, { meshes: stone, seed: 816, density: 0.22, maxLen: 6 });
  paintLichen(f, { meshes: stone, seed: 813, density: 0.3, minLight: 0.35 });
  autoChips(f, { meshes: stone, seed: 817, density: 0.08, gap: 6 });
  paintCrack(f, crackPath(ox + 6, oy - 14, 6, 818, { branch: true }), [ped.id]);
  const fr = (x: number, h: number, d: number) => f.proj([x, h, d]).map(Math.round) as [number, number];
  const c0 = f.compose();
  // Doors: black lacquer leaves with a lattice over the dark inside, gilt studs and hinges.
  const [dx0, dy0] = fr(-7, 36.2, -6.6);
  const [dx1, dy1] = fr(7, 24.6, -6.6);
  const midX = Math.floor((dx0 + dx1) / 2);
  for (let y = dy0; y < dy1; y++)
    for (let x = dx0; x < dx1; x++) {
      const u = x - dx0, v = y - dy0;
      const edge = u === 0 || x === dx1 - 1 || v === 0 || y === dy1 - 1 || x === midX - 1 || x === midX;
      let col: Color;
      if (edge) col = C(BLACK, v === 0 ? 2 : x === midX ? 2 : u === 0 || x === midX + 1 ? 4 : 3);
      else if ((x - dx0) % 2 === 0) col = C(BLACK, v < 2 ? 3 : 4);
      else col = v < 3 ? C(BLACK, 0) : C(BLACK, 1);
      c0.set(x, y, col);
    }
  for (const [x, y] of [[midX - 2, dy0 + 5], [midX + 1, dy0 + 5]]) {
    c0.set(x, y, C(GOLD, 5));
    c0.set(x, y + 1, C(GOLD, 3));
  }
  for (const x of [dx0 + 1, dx1 - 2]) for (const y of [dy0 + 2, dy1 - 3]) c0.set(x, y, C(GOLD, x < midX ? 5 : 4));
  // Gegyo: a gilt boss where the bargeboards meet.
  {
    const [gx, gy] = fr(0, 55.6, d0 - 1);
    const boss: [number, number, number][] = [[-1, 0, 4], [0, 0, 6], [1, 0, 4], [-1, 1, 3], [0, 1, 4], [1, 1, 2], [0, 2, 2]];
    for (const [dx, dy, s] of boss) c0.set(gx + dx, gy + dy, C(GOLD, s));
  }
  // Shimenawa: a twisted straw rope sagging between the posts, thickest in the middle, with shide.
  const sh = new Canvas(W, H);
  const ropePts: [number, number][] = [];
  for (let k = 0; k <= 20; k++) {
    const x = -10.2 + k * 1.02;
    const sag = 2.2 * (1 - (x / 10.2) ** 2);
    const [px, py] = f.proj([x, 38.9 - sag, -9.2]);
    ropePts.push([px, py]);
  }
  drawRope(sh, ropePts, 3, ROPE_R, { period: 3, taper: true, steps: [1, 2, 3, 4, 5] });
  // Straw tassels between the shide.
  for (const x of [-7.5, 2.6]) {
    const [tx, ty] = fr(x, 38.9 - 2.2 * (1 - (x / 10.2) ** 2), -9.2);
    for (let k = 1; k <= 3; k++) sh.set(tx, ty + k, C(ROPE, k === 3 ? 2 : 3));
    sh.set(tx + 1, ty + 1, C(ROPE, 4));
  }
  for (const [x, dir] of [[-5, 1], [0, -1], [5.2, 1]] as [number, 1 | -1][]) {
    const [tx, ty] = fr(x, 38.9 - 2.2 * (1 - (x / 10.2) ** 2), -9.2);
    drawShide(sh, tx, ty + 1, 4, PAPER_R, { dir });
  }
  c0.draw(sh, 0, 0);
  // Offering on the slab: kagami mochi with a mikan on a little hinoki stand, sakaki in two vases.
  const off = new Canvas(W, H);
  {
    const [cx, by] = fr(0, 21, -11.6);
    const MIKAN = rampOf(['#5a2408', '#a2440f', '#d9701c', '#f29a34', '#fbc25e']);
    const rows: [number, string][] = [
      [-8, '...l...'],
      [-7, '..mmm..'],
      [-6, '..wwW..'],
      [-5, '.wwwwW.'],
      [-4, 'wwwwwwW'],
      [-3, 'ttttttt'],
      [-2, '.s...s.'],
      [-1, '.sssss.'],
    ];
    for (const [dy, row] of rows)
      [...row].forEach((ch, k) => {
        const x = cx - 3 + k, y = by + dy;
        const lit = k < 3;
        if (ch === 'l') off.set(x, y, C(MOSS, 4));
        else if (ch === 'm') off.set(x, y, MIKAN[k === 2 ? 4 : k === 3 ? 3 : 2]);
        else if (ch === 'w') off.set(x, y, C(PAPER, dy === -4 && k > 4 ? 3 : lit ? 6 : 5));
        else if (ch === 'W') off.set(x, y, C(PAPER, 3));
        else if (ch === 't') off.set(x, y, C(WOOD, k < 2 ? 6 : k > 5 ? 4 : 5));
        else if (ch === 's') off.set(x, y, C(WOOD, dy === -1 ? 3 : 4));
      });
    for (const sx of [-12.2, 12.2]) {
      const [vx, vy] = fr(sx, 21, -11.2);
      // Vase.
      off.set(vx, vy - 1, C(PAPER, sx < 0 ? 5 : 4));
      off.set(vx + 1, vy - 1, C(PAPER, 3));
      off.set(vx, vy - 2, C(PAPER, sx < 0 ? 6 : 5));
      off.set(vx + 1, vy - 2, C(PAPER, 4));
      off.set(vx, vy - 3, C(PAPER, 4));
      // Sakaki: a fan of glossy dark leaves.
      const leaves: [number, number, number][] = [[0, -4, 3], [1, -4, 2], [-1, -5, 4], [0, -5, 3], [1, -5, 3], [2, -5, 2], [0, -6, 5], [-1, -6, 3], [1, -6, 4], [0, -7, 4], [2, -6, 2]];
      for (const [dx, dy, s] of leaves) off.set(vx + dx, vy + dy, C(MOSS, s - 1));
    }
  }
  outlineTinted(off);
  c0.draw(off, 0, 0);
  seal(c0, f);
  baseTufts(c0, [[ox - 15, 3], [ox + 14, 3]], 819, 4);
  return finish('hokora', 'Roadside Shrine', [0.65, 1.3], ['interactable'], { idle: { frames: [c0], fps: 0 } }, ox);
}

// ================================================================================================
// SIGNPOST
// ================================================================================================

/** A procedural brush glyph (no real script) in a 4x6 cell: '#' full ink, '+' dry brush. */
function makeGlyph(seed: number): string[] {
  const g = Array.from({ length: 6 }, () => ['.', '.', '.', '.']);
  const put = (x: number, y: number, ch: string) => {
    if (x >= 0 && x < 4 && y >= 0 && y < 6 && g[y][x] !== '#') g[y][x] = ch;
  };
  const sx = 1 + Math.floor(hash(seed, 1) * 2);
  const y0 = Math.floor(hash(seed, 2) * 2), y1 = 4 + Math.floor(hash(seed, 3) * 2);
  for (let y = y0; y < y1; y++) put(sx, y, '#');
  put(sx + (hash(seed, 12) < 0.5 ? -1 : 0), y1, '+');
  const nh = 1 + Math.floor(hash(seed, 4) * 2);
  for (let k = 0; k < nh; k++) {
    const row = 1 + Math.floor(hash(seed, 5 + k) * 3) + k;
    const a = Math.floor(hash(seed, 7 + k) * 2), b = 2 + Math.floor(hash(seed, 9 + k) * 2);
    for (let x = a; x < b; x++) put(x, row, '#');
    put(b, row, '+');
  }
  if (hash(seed, 11) < 0.6) {
    const dx = sx === 1 ? 3 : 0;
    put(dx, 0, '#');
    put(dx + (dx ? -1 : 1), 1, '+');
  }
  return g.map((r) => r.join(''));
}

/** Vertical grain on wood: dark streaks that follow the board, in 2-3 px clusters. */
function grain(u: number, v: number, seed: number, amount = 0.72): boolean {
  return noise(u * 1.3, v / 6, 1.2, seed) * 0.7 + noise(u, v / 2.5, 1.5, seed + 1) * 0.3 > amount;
}

function signpost(): WorldSprite {
  const W = 100, H = 130, ox = 50, oy = 116;
  const POST_A = -0.4; // the post turns its broad face to the light and shows a shaded right side
  const A_ANG = -0.18, B_ANG = 0.22;
  const build = () => {
    GROUP = 1;
    const sc = new Scene();
    const wood = (seed: number, extra: Partial<MeshOpts> = {}): MeshOpts => ({ pal: WOOD_OLD, seed, contrast: 1.15, facetVar: 0.02, steps: [1, 2, 3, 4, 5], ...extra });
    const post = sc.add(rotY(box(-3.6, 3.6, 0, 92, -3.6, 3.6), POST_A), wood(101, { ao: 4 }));
    // Tiny hipped cap with a knob on top.
    const capF = sc.add(rotY(loft([rectRing(-7, 7, -7, 7, 93, 3, 0.8, 0.5), rectRing(-7, 7, -7, 7, 94.8, 3, 0.8, 0.5), rectRing(-1.2, 1.2, -1.2, 1.2, 100, 3)], { capStart: true, capEnd: true }), POST_A), { pal: CEDAR, seed: 102, contrast: 1.15, facetVar: 0.02, steps: [1, 2, 3, 4, 5] });
    const capB = sc.add(loft([ring(0, 99.5, 0, 1.6, 1.6, 8), ring(0, 101.3, 0, 1.9, 1.9, 8), ring(0, 102.6, 0, 1, 1, 8)], { capEnd: true, smooth: true }), { pal: WOOD_DK, seed: 103, steps: [1, 2, 3, 4, 5] });
    const capBlock = sc.add(rotY(box(-4.4, 4.4, 90.5, 93.2, -4.4, 4.4), POST_A), wood(104, { pal: WOOD_DK }));
    // Arrow boards: the upper one in front pointing right, the lower one behind pointing left.
    const boardA = sc.add(rotY(extrudeXH([[-6.5, 76], [21, 76], [27.5, 80.5], [21, 85], [-6.5, 85]], -6.4, -4.6), A_ANG), wood(105));
    const boardB = sc.add(rotY(extrudeXH([[6.5, 61], [6.5, 69.5], [-20, 69.5], [-26.5, 65.2], [-20, 61]], 4.6, 6.4), B_ANG), wood(106));
    // Stones at the foot.
    const feet: Mesh[] = [];
    const foot = (cx: number, cd: number, rx: number, h: number, seed: number, p: number) =>
      feet.push(sc.add(rockMesh({ cx, cd, rx, rd: rx * 0.75, h, n: 6, seed, profile: [[0, 0.95], [0.5, 1], [0.9, 0.6]], jit: 0.18 }), { pal: p, seed, crest: true, bias: -0.04, steps: [1, 2, 3, 4, 5] }));
    foot(-6.5, -5, 3.6, 3.5, 111, STONE);
    foot(5.5, -6.5, 4.2, 4, 112, STONE_W);
    foot(9.5, -1, 2.6, 2.5, 113, SLATE);
    return { sc, post, capF, capB, capBlock, boardA, boardB, feet };
  };
  // Local (unrotated) coordinates of a world point.
  const unrot = (p: V3, a: number): V3 => {
    const c = Math.cos(-a), s = Math.sin(-a);
    return [p[0] * c - p[2] * s, p[1], p[0] * s + p[2] * c];
  };
  const rotP = (p: V3, a: number): V3 => {
    const c = Math.cos(a), s = Math.sin(a);
    return [p[0] * c - p[2] * s, p[1], p[0] * s + p[2] * c];
  };
  const glyphs = [0, 1, 2, 3, 4, 5].map((k) => makeGlyph(1300 + k * 7));

  const frame = (t: number): Canvas => {
    const parts = build();
    const f = render(parts.sc, W, H, ox, oy);
    const post = parts.post.id, bA = parts.boardA.id, bB = parts.boardB.id;
    for (let i = 0; i < W * H; i++) {
      const mi = f.mesh[i];
      if (mi < 0) continue;
      const p = f.world(i), n = f.normal(i);
      if (mi === post) {
        const q = unrot(p, POST_A), nq = unrot(n, POST_A);
        const side = Math.abs(nq[0]) > 0.7;
        const u = side ? q[2] : q[0];
        if (nq[1] > 0.5) {
          f.step[i] = 4;
          continue;
        }
        // Two-tone grain: dark streaks and a few pale ones on the lit face.
        if (grain(u + (nq[0] < -0.7 ? 20 : 0), q[1], 120)) f.step[i] = Math.max(1, f.step[i] - 1);
        else if (!side && noise(u * 1.3, q[1] / 5, 1.2, 125) < 0.16) f.step[i] = Math.min(5, f.step[i] + 1);
        // Weather checks: long splits down the front face and one on the side.
        const check = (cu: number, h0: number, h1: number) => q[1] > h0 && q[1] < h1 && Math.abs(u - (cu + Math.sin(q[1] * 0.17) * 0.5)) < 0.5;
        if ((!side && (check(1.2, 14, 47) || check(-1.9, 60, 74))) || (side && check(0.6, 30, 52))) f.over[i] = mix(C(WOOD_OLD, 0), C(WOOD_OLD, 1), 0.5);
      }
      for (const [mesh, ang, seed, glyphX, gi] of [
        [bA, A_ANG, 130, [-3, 3.5, 10, 15.5], 0],
        [bB, B_ANG, 140, [-22, -16, -10], 4],
      ] as [number, number, number, number[], number][]) {
        if (mi !== mesh) continue;
        const q = unrot(p, ang), nq = unrot(n, ang);
        if (nq[2] > -0.9) continue;
        const bottom = mesh === bA ? 76 : 61;
        // A plank seam along the board, fine grain, and the board's lit upper edge worn pale.
        if (Math.abs(q[1] - (bottom + 4.5)) < 0.5 && hash(Math.floor(q[0] / 5), 1, seed) > 0.4) f.step[i] = Math.max(1, f.step[i] - 1);
        else if (grain(q[1] * 3, q[0] * 0.5, seed, 0.76)) f.step[i] = Math.max(1, f.step[i] - 1);
        if (q[1] > bottom + 8.2) f.step[i] = Math.min(5, f.step[i] + 1);
        glyphX.forEach((gx, k) => {
          const g = glyphs[(k + gi) % glyphs.length];
          const lx = Math.floor(q[0] - gx), ly = Math.floor(bottom + 7.5 - q[1]);
          if (lx < 0 || lx > 3 || ly < 0 || ly > 5) return;
          const ch = g[ly][lx];
          if (ch === '#') f.over[i] = C(INK, 2);
          else if (ch === '+') f.over[i] = mix(C(INK, 4), C(WOOD_OLD, 2), 0.4);
        });
      }
    }
    // Knots: two in the post, one in each board.
    for (const [lp, ang, mesh] of [
      [[-1.5, 36, -3.7], POST_A, post],
      [[1.3, 68, -3.7], POST_A, post],
      [[14.5, 82.3, -6.5], A_ANG, bA],
      [[-4.5, 63, 4.5], B_ANG, bB],
    ] as [V3, number, number][]) {
      const [x, y] = f.proj(rotP(lp, ang)).map(Math.round);
      knot(f, x, y, [mesh]);
    }
    // The boards' tail end splits along the grain.
    {
      const [x, y] = f.proj(rotP([-19.5, 66.5, 4.5], B_ANG)).map(Math.round);
      for (let k = 0; k < 4; k++) {
        const i = f.idx(x + k, y + (k > 2 ? 1 : 0));
        if (isBare(f, i, [bB])) f.over[i] = C(WOOD_OLD, 1);
      }
    }
    paintMoss(f, { meshes: parts.feet.map((x) => x.id), amount: 0.45, seed: 160, cell: 3, drip: 1, minUp: 0.4, tufts: 0.2, minArea: 4 });
    paintMoss(f, { meshes: [parts.capF.id], amount: 0.3, seed: 161, cell: 4, drip: 1, minUp: 0.3, bumps: true, tufts: 0.2, minArea: 5 });
    autoChips(f, { meshes: [post, bA, bB], seed: 162, density: 0.06, fresh: WOOD, gap: 8 });
    // Nails where the boards meet the post, with rust bleeding below.
    const nails: [number, number][] = [];
    for (const [lp, ang] of [
      [[-1.5, 80.5, -6.4], A_ANG],
      [[1.5, 80.5, -6.4], A_ANG],
      [[-1.2, 64.5, 4.6], B_ANG],
    ] as [V3, number][]) {
      const [x, y] = f.proj(rotP(lp, ang)).map(Math.round);
      nails.push([x, y]);
    }
    const c = f.compose();
    nails.forEach(([x, y], k) => {
      if (c.alpha(x, y) === 0) return;
      c.set(x, y, C(IRON, 5));
      c.set(x + 1, y, C(IRON, 2));
      c.set(x, y + 1, RUST[1]);
      if (k !== 1) c.set(x, y + 2, mix(RUST[0], c.get(x, y + 2), 0.4));
    });
    // Rope: two wraps around the post (lit left face, front face), a knot and the ofuda.
    const ropeH = [56, 53.2];
    const corners: V3[] = [[-3.6, 0, -3.6], [3.6, 0, -3.6], [3.6, 0, 3.6]].map((p) => rotP(p as V3, POST_A));
    const rope = new Canvas(W, H);
    for (const hh of ropeH) {
      const pts: [number, number][] = [];
      for (let k = 0; k < 2; k++) {
        const a = corners[k], b = corners[k + 1];
        for (let s = 0; s <= 8; s++) {
          const tt = s / 8;
          const pt: V3 = [a[0] + (b[0] - a[0]) * tt + (k === 1 ? 0.6 : 0), hh + (k === 1 ? -0.5 * tt : 0), a[2] + (b[2] - a[2]) * tt - 0.6];
          pts.push(f.proj(pt));
        }
      }
      drawRope(rope, pts, 2, ROPE_R, { period: 2.6, steps: [1, 2, 3, 4, 5] });
    }
    c.draw(rope, 0, 0);
    const [kx, ky] = f.proj(rotP([1.6, 54.5, -4.2], POST_A)).map(Math.round);
    const sway = [0, 1, 2, 2, 1, 0][t % 6];
    const flutter = layer(W, H, (cv) => {
      const kn: [number, number, number][] = [[0, 0, 4], [1, 0, 3], [-1, 1, 3], [0, 1, 5], [1, 1, 2], [0, 2, 2]];
      for (const [dx, dy, s] of kn) cv.set(kx + dx, ky + dy, C(ROPE, s));
      // Two rope tails trailing in the wind, frayed at the ends.
      const tails = [
        [[1, 3], [1 + (sway > 1 ? 1 : 0), 4], [2 + (sway > 0 ? 1 : 0), 5]],
        [[-1, 3], [-1, 4], [-1 + (sway > 1 ? 1 : 0), 5], [-1 + sway, 6]],
      ];
      for (const tail of tails) tail.forEach(([dx, dy], k) => cv.set(kx + dx, ky + dy, C(ROPE, k === tail.length - 1 ? 4 : k % 2 ? 2 : 3)));
    });
    // The paper charm hangs from a short cord and swings from its top.
    const paper = layer(W, H, (cv) => {
      const top = ky + 4, len2 = 15;
      const swing = [0, 1, 2, 3, 2, 1][t % 6];
      const turn = [5, 5, 4, 4, 5, 5][t % 6]; // width: the strip twists edge-on a little at full swing
      cv.set(kx + 1, ky + 3, C(ROPE, 2));
      for (let k = 0; k < len2; k++) {
        const tt = k / (len2 - 1);
        const off = Math.round(swing * tt * tt + (k > 6 ? Math.sin((k + t * 2) * 0.9) * 0.6 : 0));
        const x0 = kx + off;
        for (let u = 0; u < turn; u++) {
          let s = u === 0 ? 5 : u === turn - 1 ? 3 : 4;
          if (k === 0) s = Math.min(6, s + 1);
          if (k === len2 - 1) s = Math.max(1, s - 1);
          if (k === 5 && u === turn - 2) s = 3; // a soft crease across the paper
          cv.set(x0 + u, top + k, C(PAPER, s));
        }
        // Ink: a vertical line of brush marks and a red seal stamp.
        if (k >= 2 && k <= 11 && k !== 7) cv.set(x0 + Math.floor(turn / 2), top + k, k % 3 === 0 ? mix(C(INK, 4), C(PAPER, 3), 0.3) : C(INK, 2));
        if (k === 4 || k === 9) cv.set(x0 + Math.floor(turn / 2) - 1, top + k, C(INK, 3));
        if (k >= 12 && k <= 13) for (let u = 1; u < turn - 1; u++) cv.set(x0 + u, top + k, C(RED, k === 12 ? 4 : 3));
      }
    });
    c.draw(paper, 0, 0);
    c.draw(flutter, 0, 0);
    seal(c, f);
    baseTufts(c, [[ox - 4, 3], [ox + 1, 2]], 165, 5);
    return c;
  };
  const frames = [0, 1, 2, 3, 4, 5].map(frame);
  return finish('signpost', 'Signpost', [0.95, 1.9], ['interactable'], { idle: { frames, fps: 8 } }, ox);
}

/**
 * A ring around a rectangle (x0..x1, d0..d1) at height h with `per` points per side; points near the
 * corners lift by `lift` and reach out by `out` (upturned eaves).
 */
function rectRing(x0: number, x1: number, d0: number, d1: number, h: number, per: number, lift = 0, out = 0): V3[] {
  const pts: V3[] = [];
  const corners: [number, number][] = [[x0, d0], [x1, d0], [x1, d1], [x0, d1]];
  const cx = (x0 + x1) / 2, cd = (d0 + d1) / 2;
  for (let s = 0; s < 4; s++) {
    const [ax, ad] = corners[s], [bx, bd] = corners[(s + 1) % 4];
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const x = ax + (bx - ax) * t, d = ad + (bd - ad) * t;
      const cf = (1 - 2 * Math.min(t, 1 - t)) ** 2; // 1 at the corners, 0 mid-side: a curved eave
      const ux = x - cx, ud = d - cd, ul = Math.hypot(ux, ud) || 1;
      pts.push([x + (ux / ul) * out * cf, h + lift * cf, d + (ud / ul) * out * cf]);
    }
  }
  return pts;
}

// ================================================================================================
// FENCES
// ================================================================================================

/** A tube along a polyline (rings perpendicular to the path), smooth shaded; r may vary per point. */
function tube(path: V3[], r: number | number[], n = 8, o: { caps?: boolean; seed?: number; wob?: number } = {}): Tri[] {
  const rings: V3[][] = [];
  for (let i = 0; i < path.length; i++) {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
    const t = unit(sub(b, a));
    const ref: V3 = Math.abs(t[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = unit(cross(t, ref)), w = unit(cross(t, u));
    const rr = typeof r === 'number' ? r : r[i];
    const pts: V3[] = [];
    for (let j = 0; j < n; j++) {
      const ang = (j * TAU) / n;
      const wob = o.wob ? 1 + (rnd(o.seed ?? 5, j, i) - 0.5) * o.wob : 1;
      pts.push(add(path[i], add(mul(u, Math.cos(ang) * rr * wob), mul(w, Math.sin(ang) * rr * wob))));
    }
    rings.push(pts);
  }
  return loft(rings, { capStart: o.caps ?? true, capEnd: o.caps ?? true, smooth: true });
}
/** Points along a sagging span from a to b (sag px at the middle), with a little wander. */
function span(a: V3, b: V3, sag: number, n: number, seed: number): V3[] {
  const pts: V3[] = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const p = add(a, mul(sub(b, a), t));
    pts.push([p[0], p[1] - sag * 4 * t * (1 - t) + (k > 0 && k < n ? (rnd(seed, k) - 0.5) * 0.8 : 0), p[2]]);
  }
  return pts;
}

/** Bark on a round post: dark vertical fissures in clusters, pale ridges between them on the lit side. */
function barkShade(cx: number, cd: number, seed: number) {
  return (px: PixelInfo, s: number): number => {
    const ang = Math.atan2(px.p[2] - cd, px.p[0] - cx);
    const v = noise(ang * 5 + 10, px.p[1] / 7, 1, seed);
    if (px.n[1] > 0.8) return s;
    if (v > 0.66) return Math.max(1, s - 1);
    if (v < 0.14 && px.light > 0.45) return Math.min(5, s + 1);
    return s;
  };
}

/** Cut end grain on a round post top: heart, rings and a radial check, centered on `top`. */
function endGrain(f: Frame, mesh: number, top: V3): void {
  for (let i = 0; i < f.w * f.h; i++) {
    if (f.mesh[i] !== mesh || f.normal(i)[1] < 0.85) continue;
    const p = f.world(i);
    const dx = p[0] - top[0], dd = p[2] - top[2];
    const d = Math.hypot(dx, dd);
    f.pal[i] = WOOD;
    f.step[i] = d < 0.9 ? 2 : d < 1.8 ? 4 : d < 2.4 ? 3 : d < 2.9 ? 5 : 2;
    if (dx > 0.3 && Math.abs(dd) < 0.45 && d < 2.6) f.step[i] = 1;
  }
}

const FENCE_SPAN = m(1); // posts every meter; the segment is 2 m, end posts sit on the tile seam
const RAIL_H = [19, 40];

/** Screen points of one rope wrap (the front half of a ring round a post), slanted a little. */
function wrapPts(f: Frame, hh: number, r: number, tilt: (p: V3) => V3): [number, number][] {
  const pts: [number, number][] = [];
  for (let a = 0; a <= 12; a++) {
    const th = Math.PI + (a / 12) * Math.PI;
    pts.push(f.proj(tilt([Math.cos(th) * r, hh + (a / 12 - 0.5) * 1.4, Math.sin(th) * r])));
  }
  return pts;
}

/**
 * One rustic fence post, rendered alone and outlined so it can be stamped at both ends of a
 * segment (identical pixels on the seam when segments tile 2 m apart). Rope lashings wrap it at
 * both rail heights.
 */
function fencePost(lean = 0, broken = false): { c: Canvas; ox: number; oy: number } {
  const W = 40, H = 80, ox = 20, oy = 70;
  GROUP = 1;
  const sc = new Scene();
  const postT = tube([[0, 0, 0], [0.3, 18, 0], [-0.2, 36, 0], [0.2, 53, 0]].map((p) => p as V3), [3.8, 3.6, 3.5, 3.3], 10, { seed: 151, wob: 0.12, caps: true });
  const post = sc.add(lean ? rotZ(postT, lean, 0, 0) : postT, { pal: BARK, seed: 151, contrast: 1.1, shade: barkShade(0, 0, 152), ao: 4, steps: [1, 2, 3, 4, 5] });
  const f = render(sc, W, H, ox, oy);
  endGrain(f, post.id, lean ? [Math.sin(lean) * 53, 53, 0] : [0.2, 53, 0]);
  paintLichen(f, { meshes: [post.id], seed: 153, density: 0.25, minLight: 0.45, orange: 0.3 });
  const c = f.compose();
  const tilt = (p: V3): V3 => (lean ? [p[0] * Math.cos(lean) + p[1] * Math.sin(lean), -p[0] * Math.sin(lean) + p[1] * Math.cos(lean), p[2]] : p);
  const lash = new Canvas(W, H);
  RAIL_H.forEach((rh, k) => {
    if (broken && k === 1) return;
    for (let w = 0; w < 2; w++) drawRope(lash, wrapPts(f, rh + 2 - w * 3, 3.9, tilt), 2, ROPE_R, { period: 2.5, steps: [1, 1, 2, 3, 4] });
  });
  c.draw(lash, 0, 0);
  seal(c);
  return { c, ox, oy };
}

function fence(): WorldSprite {
  const W = 170, H = 90, ox = 85, oy = 74;
  const build = (broken: boolean): Canvas => {
    GROUP = 1;
    const sc = new Scene();
    const lean = broken ? 0.18 : 0; // the middle post leans right when broken
    const tilt = (p: V3): V3 => (lean ? [p[0] * Math.cos(lean) + p[1] * Math.sin(lean), -p[0] * Math.sin(lean) + p[1] * Math.cos(lean), p[2]] : p);
    const railD = 4.6;
    const rails: Mesh[] = [];
    const rail = (a: V3, b: V3, r0: number, seed: number, sag = 1.2, capped = true) =>
      rails.push(sc.add(tube(span(a, b, sag, 6, seed), r0, 8, { seed, wob: 0.15, caps: capped }), { pal: WOOD_OLD, seed, contrast: 1.1, facetVar: 0.02, steps: [1, 2, 3, 4, 5], shade: (px, s) => (noise(px.p[0] / 5, px.p[1] * 1.5 + px.p[2], 1.2, seed) > 0.72 ? Math.max(1, s - 1) : noise(px.p[0] / 4, px.p[1] * 2, 1.2, seed + 3) < 0.14 && px.light > 0.5 ? Math.min(5, s + 1) : s) }));
    const L = -FENCE_SPAN, Rr = FENCE_SPAN;
    const mid = (h: number): V3 => {
      const p = tilt([0, h, 0]);
      return [p[0], p[1], railD];
    };
    rail([L - 1, RAIL_H[0], railD], mid(RAIL_H[0]), 2.5, 161);
    rail([L - 1, RAIL_H[1], railD], mid(RAIL_H[1]), 2.3, 162);
    rail(mid(RAIL_H[0]), [Rr + 1, RAIL_H[0], railD], 2.5, 163);
    if (!broken) rail(mid(RAIL_H[1]), [Rr + 1, RAIL_H[1], railD], 2.3, 164);
    else {
      // The upper rail snapped: one piece hangs from the middle post, the other from the right post.
      rail(mid(RAIL_H[1]), [27, 28, railD - 2], 2.3, 165, 0.3, true);
      rail([Rr + 1, RAIL_H[1], railD], [33, 21, railD - 3], 2.3, 166, 0.3, true);
    }
    const midPost = sc.add(rotZ(tube([[0, 0, 0], [-0.3, 18, 0], [0.2, 36, 0], [-0.1, 51, 0]].map((p) => p as V3), [3.7, 3.5, 3.4, 3.2], 10, { seed: 171, wob: 0.12 }), lean, 0, 0), {
      pal: BARK,
      seed: 171,
      contrast: 1.1,
      shade: barkShade(0, 0, 172),
      ao: 4,
      steps: [1, 2, 3, 4, 5],
    });
    const f = render(sc, W, H, ox, oy);
    endGrain(f, midPost.id, tilt([-0.1, 51, 0]));
    // Rails: strips of bark left on the underside, knots, and pale worn tops.
    const railIds = rails.map((r) => r.id);
    for (let i = 0; i < W * H; i++) {
      if (!isBare(f, i, railIds)) continue;
      const p = f.world(i), n = f.normal(i);
      if (n[1] < -0.05 && fbm(p[0] / 3 + 40, p[1] + p[2], 4, 2, 167) > 0.56) {
        f.pal[i] = BARK;
        f.step[i] = Math.max(1, f.step[i] - 1);
      }
    }
    for (const [x, h] of [[-38, RAIL_H[0]], [-20, RAIL_H[1]], [22, RAIL_H[0]], [44, RAIL_H[1]]] as [number, number][]) {
      if (broken && x === 44) continue;
      const [kx, ky] = f.proj([x, h + 0.4, railD - 2.2]).map(Math.round);
      knot(f, kx, ky - 1, railIds);
    }
    paintLichen(f, { meshes: [midPost.id, ...railIds], seed: 168, density: 0.18, minLight: 0.5, orange: 0.35 });
    autoChips(f, { meshes: railIds, seed: 169, density: 0.04, fresh: WOOD, gap: 12 });
    const c = f.compose();
    if (broken) {
      // Splintered ends: pale fresh wood spikes at the break.
      const spl = layer(W, H, (cv) => {
        for (const [bx, bh, bd, dir] of [
          [27, 28, railD - 2, 1],
          [33, 21, railD - 3, -1],
        ] as [number, number, number, number][]) {
          const [x, y] = f.proj([bx, bh, bd]).map(Math.round);
          const spikes: [number, number, number][] = [[0, -1, 6], [1, -2, 5], [0, 0, 5], [1, 1, 3], [2, 0, 4], [0, 1, 3], [2, -1, 5]];
          for (const [dx, dy, s] of spikes) cv.set(x + dx * dir, y + dy, C(WOOD, s));
        }
      });
      c.draw(spl, 0, 0);
    }
    // Lashings on the middle post.
    const lash = new Canvas(W, H);
    RAIL_H.forEach((rh, k) => {
      for (let w = 0; w < 2; w++) {
        if (broken && k === 1 && w === 1) continue;
        drawRope(lash, wrapPts(f, rh + 2 - w * 3, 3.8, tilt), 2, ROPE_R, { period: 2.5, steps: [1, 1, 2, 3, 4] });
      }
    });
    if (broken) {
      // A loose rope end dangling from the leaning post.
      const [x, y] = f.proj(tilt([3.5, RAIL_H[1] - 2, -3])).map(Math.round);
      for (let k = 0; k < 7; k++) lash.set(x + (k > 3 ? 1 : 0) + (k > 5 ? 1 : 0), y + k, C(ROPE, k === 6 ? 4 : k % 2 ? 2 : 3));
    }
    c.draw(lash, 0, 0);
    seal(c, f);
    // End posts: one pre-rendered post stamped on both tile seams.
    const ep = fencePost(0, false);
    for (const px of [L, Rr]) c.draw(ep.c, ox + px - ep.ox, oy - ep.oy);
    baseTufts(c, [[ox - 3, 3], [ox + L + 3, 2], [ox + Rr - 3, 2]], 173, 4);
    return c;
  };
  const idle = build(false);
  const broken = build(true);
  return finish('fence', 'Wooden Fence', [2, 1], ['cover-half', 'destructible'], { idle: { frames: [idle], fps: 0 }, broken: { frames: [broken], fps: 0 } }, ox);
}

const BF_H = 60; // panel height (px); the posts stand a little taller

/** One thick bamboo post with nodes, a split and a hollow cut top, rendered alone (stamped on both seams). */
function bambooPost(): { c: Canvas; ox: number; oy: number } {
  const W = 30, H = 90, ox = 15, oy = 80;
  GROUP = 1;
  const sc = new Scene();
  const nodes = [12, 28, 44, 58];
  const post = sc.add(pole([0, 0, -3], [0, BF_H + 3, -3], 3.6, 12, { caps: true }), {
    pal: BAMBOO_DK,
    seed: 181,
    contrast: 1.1,
    ao: 4,
    steps: [1, 2, 3, 4, 5],
    shade: (px, s) => {
      const d = nodes.map((nh) => px.p[1] - nh).find((v) => v > -1.6 && v < 1.6);
      if (d === undefined) return px.light > 0.5 && noise(px.p[0] * 2, px.p[1] / 6, 1, 183) < 0.18 ? Math.min(5, s + 1) : s;
      return d < -0.5 ? Math.min(5, s + 1) : d < 0.5 ? Math.max(1, s - 2) : s;
    },
  });
  const f = render(sc, W, H, ox, oy);
  // Hollow cut top: a light rim around a dark hole.
  for (let i = 0; i < W * H; i++) {
    if (f.mesh[i] !== post.id || f.normal(i)[1] < 0.85) continue;
    const p = f.world(i);
    const d = Math.hypot(p[0], p[2] + 3);
    f.pal[i] = BAMBOO;
    if (d < 2.3) f.over[i] = d < 1.4 ? C(BAMBOO_DK, 0) : C(BAMBOO_DK, 1);
    else f.step[i] = p[0] < 0.5 ? 5 : 3;
  }
  // A long split down the front from the top, with a lit lip on its right.
  const [sx, sy] = f.proj([0.8, BF_H + 2, -6.6]).map(Math.round);
  for (let k = 0; k < 15; k++) {
    const i = f.idx(sx + (k > 8 ? 1 : 0), sy + k);
    if (!isBare(f, i, [post.id])) continue;
    f.over[i] = C(BAMBOO_DK, k < 12 ? 0 : 1);
    if (isBare(f, i + 1, [post.id])) f.step[i + 1] = Math.min(5, f.step[i + 1] + 1);
  }
  const c = f.compose();
  // Black palm-rope ties holding the panel's top cap and middle batten.
  const ties = new Canvas(W, H);
  for (const hh of [BF_H - 2, 31]) {
    const pts: [number, number][] = [];
    for (let a = 0; a <= 10; a++) {
      const th = Math.PI + (a / 10) * Math.PI;
      pts.push(f.proj([Math.cos(th) * 3.9, hh + (a / 10 - 0.5) * 1.2, -3 + Math.sin(th) * 3.9]));
    }
    drawRope(ties, pts, 2, INK_R, { period: 2.4, steps: [0, 1, 2, 3, 5] });
  }
  c.draw(ties, 0, 0);
  seal(c);
  return { c, ox, oy };
}

/**
 * Bamboo fence (misugaki): split-bamboo slats of mixed age (straw, green, sun-greyed) and width
 * with staggered nodes and the odd split, darker and stained where they meet the ground; three
 * split battens tied with black palm rope; a bundled cap along the top; thick posts on the seams.
 */
function fenceBamboo(): WorldSprite {
  const W = 170, H = 100, ox = 85, oy = 84;
  GROUP = 1;
  const sc = new Scene();
  const capNodes = [-48, -21, 6, 33];
  sc.add(tube([[-FENCE_SPAN, BF_H - 2.5, -1.2], [FENCE_SPAN, BF_H - 2.5, -1.2]], 3, 10, { caps: true }), {
    pal: BAMBOO,
    seed: 191,
    contrast: 1.1,
    steps: [1, 2, 3, 4, 5],
    shade: (px, s) => {
      const d = capNodes.map((nx) => px.p[0] - nx).find((v) => v > -1.2 && v < 1.2);
      return d === undefined ? s : d < 0 ? Math.min(5, s + 1) : Math.max(1, s - 2);
    },
  });
  const f = render(sc, W, H, ox, oy);
  const x0 = ox - FENCE_SPAN + 3, x1 = ox + FENCE_SPAN - 3;
  const yTop = oy - (BF_H - 4), yBot = oy;
  const battens = [10, 30, 48];
  const battenRows = new Map<number, number>();
  for (const bh of battens) for (let k = 0; k < 4; k++) battenRows.set(oy - bh + k, k);
  const panel = new Canvas(W, H);
  // Slats: widths 3-5 px plus a 1 px seam, each with its own age, node rhythm and maybe a split.
  let sx = x0, slat = 0;
  while (sx <= x1) {
    const wdt = 3 + Math.floor(hash(slat, 1, 193) * 2.6);
    const r = hash(slat, 2, 193);
    const P = r < 0.18 ? BAMBOO_G : r > 0.8 ? BAMBOO_GREY : BAMBOO;
    const nodeOff = 4 + Math.floor(hash(slat, 3, 193) * 16);
    const nodeGap = 18 + Math.floor(hash(slat, 4, 193) * 5);
    const split = hash(slat, 5, 193) < 0.2 ? { u: 1 + Math.floor(hash(slat, 6, 193) * (wdt - 1)), y0: yTop + 4 + Math.floor(hash(slat, 7, 193) * 25), len: 6 + Math.floor(hash(slat, 8, 193) * 10) } : null;
    for (let u = 0; u <= wdt; u++) {
      const x = sx + u;
      if (x > x1) break;
      for (let y = yTop; y <= yBot; y++) {
        const hh = oy - y;
        if (u === wdt) {
          panel.set(x, y, C(P, 1)); // seam
          continue;
        }
        // Round slat: lit left edge, body, shaded right edge.
        let s = u === 0 ? 4 : u === wdt - 1 ? 2 : 3;
        if (u === 0 && noise(slat, hh / 3, 1, 198) < 0.4) s = 3;
        if (u === 1 && wdt > 3 && noise(slat * 3, hh / 4, 1, 194) > 0.72) s = 4;
        // Nodes: a dark groove with a lit ridge above.
        const nd = (((hh - nodeOff) % nodeGap) + nodeGap) % nodeGap;
        if (nd === 0) s = Math.max(1, s - 2);
        else if (nd === 1) s = Math.min(5, s + 1);
        // Shade under the cap, damp and grime near the ground.
        if (y < yTop + 2) s = Math.max(1, s - 1);
        if (hh < 6) s = Math.max(1, s - (hh < 2 ? 2 : 1));
        let col = C(P, s);
        if (hh < 9 && hash(x, y, 195) < (9 - hh) / 14) col = mix(col, C(MOSS, 2), 0.45);
        if (split && u === split.u && y >= split.y0 && y < split.y0 + split.len) col = C(P, y < split.y0 + split.len - 2 ? 0 : 1);
        else if (split && u === split.u + 1 && y >= split.y0 && y < split.y0 + split.len - 1) col = C(P, Math.min(5, s + 1));
        panel.set(x, y, col);
      }
    }
    sx += wdt + 1;
    slat++;
  }
  // Battens: split bamboo laid across the slats, with nodes, each casting a short shadow below-right.
  for (const bh of battens) {
    const yb = oy - bh;
    const nodeOff = Math.floor(hash(bh, 1, 196) * 23);
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      const nodeAt = (x - x0 + nodeOff) % 23;
      for (let k = 0; k < 4; k++) {
        let s = [4, 3, 3, 2][k];
        if (k === 0 && noise(x / 3, bh, 1, 199) < 0.3) s = 5;
        if (nodeAt === 0) s = k === 0 ? 3 : 1;
        else if (nodeAt === 22 && k < 2) s = 5;
        panel.set(x, yb + k, C(BAMBOO, s));
      }
      for (let k = 4; k < 6; k++) {
        const c = panel.get(x + 1, yb + k);
        if (c[3]) panel.set(x + 1, yb + k, k === 4 ? C(BAMBOO, 1) : mix(c, C(BAMBOO, 1), 0.5));
      }
    }
  }
  // The left post's shadow falls on the slats to its right.
  for (let y = yTop; y <= yBot; y++)
    for (let x = x0; x < x0 + 3; x++) {
      const c = panel.get(x, y);
      if (c[3] && !battenRows.has(y)) panel.set(x, y, mix(c, C(BAMBOO, 1), 0.55));
    }
  outlineTinted(panel);
  const c = f.compose();
  const comp = new Canvas(W, H);
  comp.draw(panel, 0, 0);
  // Black palm-rope ties: a twisted wrap over each batten every other slat, a knot and two tails.
  const knots = new Canvas(W, H);
  for (const bh of battens) {
    const yb = oy - bh;
    for (let x = x0 + 7, k = 0; x < x1 - 3; x += 10, k++) {
      const tw = (yy: number) => (yy + x) % 3;
      for (let dy = -1; dy <= 4; dy++) {
        knots.set(x, yb + dy, C(INK, tw(dy) === 0 ? 5 : dy < 1 ? 3 : 2));
        knots.set(x + 1, yb + dy, C(INK, tw(dy + 1) === 0 ? 4 : 1));
      }
      const t1 = 1 + Math.floor(hash(x, bh, 197) * 3), t2 = 1 + Math.floor(hash(x, bh, 198) * 2);
      for (let q = 0; q < t1; q++) knots.set(x - 1 - (q > 1 ? 1 : 0), yb + 5 + q, C(INK, q === t1 - 1 ? 4 : 2));
      for (let q = 0; q < t2; q++) knots.set(x + 2, yb + 5 + q, C(INK, q === t2 - 1 ? 3 : 1));
    }
  }
  comp.draw(knots, 0, 0);
  comp.draw(c, 0, 0);
  const capTies = new Canvas(W, H);
  for (let x = x0 + 7; x < x1 - 3; x += 20) {
    const [, y] = f.proj([0, BF_H - 2.5, -1.2]).map(Math.round);
    for (let dy = -3; dy <= 3; dy++) {
      capTies.set(x, y + dy, C(INK, (dy + x) % 3 === 0 ? 5 : dy < 0 ? 3 : 2));
      capTies.set(x + 1, y + dy, C(INK, (dy + x + 1) % 3 === 0 ? 4 : dy < 0 ? 2 : 1));
    }
  }
  comp.draw(capTies, 0, 0);
  seal(comp, f);
  const bp = bambooPost();
  for (const px of [-FENCE_SPAN, FENCE_SPAN]) comp.draw(bp.c, ox + px - bp.ox, oy - bp.oy);
  baseTufts(comp, [[ox - 30, 3], [ox + 12, 2], [ox + 40, 3]], 199, 4);
  return finish('fence_bamboo', 'Bamboo Fence', [2, 1.2], ['cover-half', 'blocks-sight', 'destructible'], { idle: { frames: [comp], fps: 0 } }, ox);
}

// ================================================================================================
// main
// ================================================================================================

const SCRATCH = previewDir();
function debugDump(s: WorldSprite): void {
  const bg = hex('#5d6b57');
  for (const [k, a] of Object.entries(s.anims)) {
    const fw = a.frames[0].w, fh = a.frames[0].h;
    const strip = new Canvas((fw + 2) * a.frames.length, fh);
    strip.fillRect(0, 0, strip.w, strip.h, bg);
    a.frames.forEach((fr, i) => strip.draw(fr, i * (fw + 2), 0));
    strip.scaled(4).save(join(SCRATCH, `landmarks-${s.name}-${k}.png`));
  }
  const first = Object.values(s.anims)[0].frames[0];
  const z = new Canvas(first.w, first.h);
  z.fillRect(0, 0, z.w, z.h, bg);
  z.draw(first, 0, 0);
  z.scaled(first.h > 80 ? 6 : 8).save(join(SCRATCH, `landmarks-${s.name}-zoom.png`));
}

const sprites: WorldSprite[] = [stoneLantern(), signpost(), fence(), fenceBamboo(), boulder(), rock(), pebbles(), riverStones(), hokora()];
writeGroup('landmarks', sprites);
preview(sprites, join(SCRATCH, 'landmarks.png'), { scale: 3 });
for (const s of sprites) {
  debugDump(s);
  const first = Object.values(s.anims)[0].frames[0];
  const bb = first.bounds();
  console.log(`${s.name.padEnd(14)} frame ${first.w}x${first.h} anchor ${s.anchor} opaque h ${bb ? bb[3] - bb[1] + 1 : 0} w ${bb ? bb[2] - bb[0] + 1 : 0} target ${m(s.meters[0])}x${m(s.meters[1])}`);
}
