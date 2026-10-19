// Fire set, third pass: the sprites copied from the owner's paint-over of the fire sheet
// (REF-fire-set-owner.jpg). Each key frame is his own drawing, cut at game scale by
// tools/refs/fire-from-ref.py into vfx-a-fire-refdata.ts; the other frames are derived from it
// (grown, revealed, flickered, cooled into smoke), so the peak frame is his picture.
//
// Frame counts (the owner asked for slower, fuller animations): fly loops 8 frames at 12 fps with
// frame 0 his picture; hit 12 frames (build 3, his picture held 3, dissipate 6); blast 16 frames
// (anticipation 4, his picture held 3, settle and fade 9); walls rise 12 / idle 8 at 10 fps; aura
// and aura_back idle 12 frames at 10 fps.

import { Canvas, Color, WorldSprite, withAlpha } from './kit';
import { FIRE, embers } from './vfx-a-fire-kit';
import { cool, dim, loopDisplace, loopFlicker, placed, refPiece, roughen, scaled, thinOut } from './vfx-a-ref';
import { fireballOld } from './vfx-a-fire-sig';
import { REF_FRAMES } from './vfx-a-fire-refdata';
import {
  TAU, WallKind, clamp, dissolve, flySprite, frames, fract, lerp, pnoise, rr, smooth, stack, vfxSprite,
} from './vfx-a-lib';


// --- blast: his mushroom cloud ---------------------------------------------------------------

/** Warm brown-grey smoke (from his paint-over), dark to light. */
const SMOKE_WARM: Color[] = ['#24141a', '#3a2622', '#4a3532', '#5e4640', '#77594f', '#8f6e60', '#a88a78'].map((h) => hexC(h));
function hexC(h: string): Color {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
}

/** Piecewise-linear keys: kf(i, [[frame, value], ...]), held flat before the first and after the last. */
function kf(i: number, keys: [number, number][]): number {
  if (i <= keys[0][0]) return keys[0][1];
  for (let k = 1; k < keys.length; k++)
    if (i <= keys[k][0]) {
      const [i0, v0] = keys[k - 1], [i1, v1] = keys[k];
      return lerp(v0, v1, (i - i0) / (i1 - i0));
    }
  return keys[keys.length - 1][1];
}

/**
 * His mushroom cloud, built from his own pixels (tools/refs/fire-from-ref.py cuts his panel into the
 * cap, the stem with its flaring root, the far and near halves of the ring of fire and the
 * scorched ground). 16 frames at 12 fps:
 * - 0-3, anticipation: a small dome flares on the ground and climbs his stem as it rises, the cap
 *   blooming and the ring and the scorched ground spreading;
 * - 4-6, the peak: frame 4 is his picture exactly, held with small motion (his ring and stem
 *   flicker, the cap swells and lifts a pixel or two);
 * - 7-15, a long settle: the cap keeps rising and spreading while it cools into smoke from the top,
 *   the stem burns down from the top, the ring burns low and dark, the ground dims, and the smoke
 *   thins from its edges until a few wisps are left.
 */
export function blast(): WorldSprite {
  const W = 220, H = 170, cx = 110, gy = 128, seed = 3100, PEAK = 4, N = 16;
  const cap = refPiece('b_cap'), stem = refPiece('b_stem');
  const capBottom = cap.y + cap.c.h, capCx = cap.x + cap.c.w / 2;
  const stemTop = stem.y, stemBottom = stem.y + stem.c.h;
  const fr = frames(N, (_, i) => {
    // A small looping phase for the flicker, zero at his frame.
    const ph = ((i - PEAK) / 8) * TAU;
    const ringK = kf(i, [[0, 0.16], [PEAK, 1]]);
    const groundK = kf(i, [[0, 0.28], [PEAK, 1]]);
    const groundDim = kf(i, [[6, 1], [N - 1, 0.24]]);
    const stemK = kf(i, [[8, 1], [14, 0]]);
    const capK = kf(i, [[0, 0.36], [1, 0.58], [2, 0.75], [3, 0.88], [PEAK, 1], [6, 1.012], [N - 1, 1.12]]);
    const capRise = kf(i, [[PEAK, 0], [6, -1.5], [N - 1, -10]]);
    const coolK = kf(i, [[6, 0], [7, 0.12], [11, 0.75], [13, 1]]);
    const thinK = kf(i, [[10, 0], [N - 1, 1]]);
    const ringH = kf(i, [[6, 1], [N - 1, 0.16]]);
    const ringDim = kf(i, [[6, 1], [N - 1, 0.3]]);
    const layers: (Canvas | null)[] = [];
    // The scorched glowing ground, spreading with the ring.
    layers.push(dim(scaled(placed('b_ground', W, H), groundK, groundK, cx, gy), groundDim, [26, 14, 18, 255]));
    // The far half of the ring.
    const ringAt = (name: string) => {
      let c = scaled(placed(name, W, H), ringK, ringK * ringH, cx, gy);
      if (i >= PEAK) c = loopFlicker(c, ph, 1.2, gy, seed + name.length);
      return ringDim < 1 ? dim(c, ringDim) : c;
    };
    layers.push(ringAt('b_ring_back'));
    // Where the cap's bottom centre sits: on the ground, then climbing the stem as it rises, then his.
    const baseY = i < PEAK ? lerp(gy - 2, capBottom, [0, 0.4, 0.7, 0.9][i]) : capBottom + capRise;
    // The stem: revealed from the ground up under the rising cap; after the peak it stretches up
    // with the cap, then thins from its edges, darkens and cools as it dies.
    let stemC: Canvas | null = null;
    if (i > 0 && stemK > 0) {
      let sc = placed('b_stem', W, H);
      if (i < PEAK) {
        // (his stem runs up into the cap's underside: keep it reaching into the growing cap)
        const top = baseY - (capBottom - stemTop) * capK - 2;
        const cut = new Canvas(W, H);
        for (let y = 0; y < H; y++)
          for (let x = 0; x < W; x++) {
            const p = sc.get(x, y);
            if (p[3] && y >= top + 3 * pnoise(x, 0, 4, 0, 0, seed + 1)) cut.set(x, y, p);
          }
        sc = cut;
      } else {
        if (capRise < 0) sc = scaled(sc, 1, (stemBottom - stemTop - capRise) / (stemBottom - stemTop), cx, stemBottom);
        sc = loopFlicker(sc, ph, 0.8, stemBottom, seed + 2);
        if (stemK < 1) {
          // It also burns down from the top (a ragged line), so no thin spire is left standing.
          // (the part inside the cap's underside stays, so the cap keeps no notch where the stem was)
          const top = stemTop + capRise, hgt = stemBottom - top, capBase = capBottom + capRise;
          const down = capBase + (1 - stemK) * (stemBottom - capBase) * 0.62;
          for (let y = Math.round(capBase) + 2; y < H; y++) for (let x = 0; x < W; x++) if (y < down + 8 * pnoise(x, 0, 5, 0, 0, seed + 11) + 16 * clamp(Math.abs(x - cx) / 20, 0, 1) - 8) sc.set(x, y, [0, 0, 0, 0]);
          sc = thinOut(sc, 1 - stemK, 14, seed + 1, null);
          sc = cool(sc, (x, y) => (1 - stemK) * 1.5 - ((y - top) / hgt) * 0.8 + (pnoise(x, y, 10, 0, 0, seed + 9) - 0.5) * 0.4, SMOKE_WARM, seed + 10);
          sc = dim(sc, lerp(0.55, 1, stemK));
        }
      }
      layers.push((stemC = sc));
    }
    // The cap: grown from a small dome at the ground up to his cap on top of the stem.
    {
      const sx = capK, sy = capK;
      let c = scaled(placed('b_cap', W, H), sx, sy, capCx, capBottom);
      const moved = new Canvas(W, H);
      moved.draw(c, 0, Math.round(baseY - capBottom));
      c = moved;
      if (i < PEAK) {
        // While it grows, the dark rim along the cap's underside would cross the stem: let the stem show there.
        for (let y = Math.round(baseY) - 7; y <= Math.round(baseY) + 1; y++)
          for (let x = 0; x < W; x++) {
            const p = c.get(x, y);
            if (p[3] && stemC && stemC.alpha(x, y) && 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2] < 70) c.set(x, y, [0, 0, 0, 0]);
          }
      }
      const top = baseY - cap.c.h * sy, hgt = cap.c.h * sy;
      if (coolK > 0) c = cool(c, (x, y) => coolK * 1.6 - ((y - top) / hgt) * 0.9 + (pnoise(x, y, 12, 0, 0, seed + 8) - 0.5) * 0.5, SMOKE_WARM, seed + 3);
      if (thinK > 0) {
        // The smoke thins from its edges and the last of it drifts up.
        const thin = dim(thinOut(c, thinK, 28, seed + 4, SMOKE_WARM[0]), 1 - thinK * 0.45, SMOKE_WARM[0]);
        c = new Canvas(W, H);
        c.draw(thin, 0, -Math.round(thinK * 6));
      }
      layers.push(c);
    }
    // The near half of the ring, in front of the stem.
    layers.push(ringAt('b_ring_front'));
    const body = stack(W, H, ...layers);
    // Sparks thrown up round the cap, flying out and dying away, and sparks rising off the ring.
    const em: { x: number; y: number; s: number }[] = [];
    if (i >= 2 && i <= 12) {
      const n = i <= 8 ? 12 : 12 - (i - 8) * 3;
      for (let k = 0; k < n; k++) {
        const a = rr(seed + 5, k, Math.PI * 1.1, Math.PI * 1.9), d = rr(seed + 6, k, 40, 80) * (0.55 + (i - 2) * 0.055);
        em.push({ x: capCx + Math.cos(a) * d, y: capBottom - 20 + Math.sin(a) * d * 0.6 + (i - 2) * 1.3, s: k % 4 === 0 && i < 8 ? 2 : 1 });
      }
    }
    const ringN = i <= 9 ? 8 : Math.max(0, 8 - (i - 9) * 2);
    for (let k = 0; k < ringN; k++) {
      const p = fract(k / 8 + (i / N) * 2), a = rr(seed + 7, k, 0, TAU);
      em.push({ x: cx + Math.cos(a) * 78 * ringK, y: gy + Math.sin(a) * 15 * ringK - 4 - p * 16, s: 1 });
    }
    return stack(W, H, body, embers(W, H, em.filter((e) => e.x > 3 && e.x < W - 4 && e.y > 3 && e.y < H - 4), body));
  });
  return vfxSprite('blast', 'Fire blast (mushroom-cloud explosion, 3 m)', [cx, gy], { blast: { frames: fr, fps: 12, loop: false } });
}

// --- aura: the character engulfed in flame (his panel) -------------------------------------

/**
 * Two layers cut from his aura panel, frame-synchronized, same size and anchor (the feet):
 * - `aura_back` goes BEHIND the character: all his fire round and above the figure.
 * - `aura` goes OVER the character: his flames round the legs and a warm glow that lights the
 *   figure; drawn alone it still reads as an aura.
 * The loop (12 frames at 10 fps, frame 0 his picture) flickers his flames upward (higher pixels
 * sway more) and breathes them a little.
 */
export function aura(): WorldSprite[] {
  const F = REF_FRAMES.aura, W = F.w, H = F.h, ax = F.ax, ay = F.ay, seed = 3300;
  const backFr: Canvas[] = [], frontFr: Canvas[] = [];
  const N = 12;
  for (let i = 0; i < N; i++) {
    const t = i / N, ph = t * TAU;
    const breathe = (c: Canvas, k: number) => scaled(c, 1 + 0.02 * Math.sin(ph + k), 1 + 0.05 * Math.sin(ph + k), ax, ay);
    const backC = breathe(loopFlicker(placed('a_back', W, H), ph, 2.4, ay, seed), 0);
    const glowC = new Canvas(W, H);
    for (let y = ay - 100; y < ay; y++)
      for (let x = ax - 26; x <= ax + 26; x++) {
        const d = Math.hypot((x - ax) / 26, (y - (ay - 46)) / 52);
        if (d < 1) glowC.set(x, y, withAlpha(FIRE[4], Math.round(52 * (1 - d * d))));
      }
    // (the flames round the legs move exactly with the back layer they were cut from)
    const frontC = stack(W, H, glowC, breathe(loopFlicker(placed('a_low', W, H), ph, 2.4, ay, seed), 0));
    const em: { x: number; y: number; s: number }[] = [];
    for (let k = 0; k < 12; k++) {
      const p = fract(k / 12 + t);
      const side = k % 2 ? 1 : -1;
      em.push({ x: ax + side * rr(seed + 5, k, 16, 46) + Math.sin(p * 6 + k) * 2, y: ay - 10 - p * 120, s: p < 0.3 ? 2 : 1 });
    }
    backFr.push(backC);
    frontFr.push(stack(W, H, frontC, embers(W, H, em.filter((e) => e.y > 3 && e.x > 2 && e.x < W - 3), stack(W, H, backC, frontC))));
  }
  return [
    vfxSprite('aura', 'Fire aura, front layer (draw OVER the character)', [ax, ay], { idle: { frames: frontFr, fps: 10, loop: true } }),
    vfxSprite('aura_back', 'Fire aura, back layer (draw BEHIND the character)', [ax, ay], { idle: { frames: backFr, fps: 10, loop: true } }),
  ];
}

// --- walls: horizontal, 3/4 and end-on (his panels) -----------------------------------------

/**
 * A wall from his panel: `idle` (8 frames at 10 fps, frame 0 his picture) flickers his flames;
 * `rise` (12 frames at 12 fps) reveals his picture from the ground up and from the middle out
 * (height above the ground line) with a burning edge, its flicker running on into the idle loop.
 * Edges where his panel cut the flames are roughened; `prep` can first rework his piece, and
 * where `loose(x)` holds, bits of the reveal that come up on their own (150 px or less) wait for
 * the front instead of popping in ahead of it.
 */
function refWall(kind: WallKind, piece: string, label: string, ground: (x: number, y: number) => number, along: (x: number, y: number) => number, rough: (x: number, y: number) => boolean, seed: number, prep?: (c: Canvas) => Canvas, loose?: (x: number) => boolean): WorldSprite {
  const F = REF_FRAMES[kind], W = F.w, H = F.h;
  const his = placed(piece, W, H);
  const base = roughen(prep ? prep(his) : his, rough, refPiece(piece).pal[0]);
  const IDLE = 8, RISE = 12;
  const idle = frames(IDLE, (t) => loopFlicker(base, t * TAU, 1.6, F.ay, seed));
  const key = (x: number, y: number) => clamp(ground(x, y) * 0.6 + along(x, y) * 0.3 + pnoise(x, y, 8, 0, 0, seed + 1) * 0.1, 0, 1);
  // The reveal is paced partly by height and partly by how much of his wall has come up, so the
  // low dense flames do not all appear at once and the tips do not crawl in over the last frames.
  const keys: number[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (base.alpha(x, y)) keys.push(key(x, y));
  keys.sort((a, b) => a - b);
  const rise = frames(RISE, (_, i) => {
    const c = loopFlicker(base, ((i - RISE) / IDLE) * TAU, 1.6, F.ay, seed);
    if (i === RISE - 1) return c;
    const u = (i + 1) / RISE;
    const vis = lerp(u * keys[keys.length - 1], keys[Math.floor(u * (keys.length - 1))], 0.6);
    const d = dissolve(c, vis, key, [FIRE[2], FIRE[3], FIRE[5]], FIRE[0]).c;
    return loose ? dropLoose(d, 150, loose) : d;
  });
  return vfxSprite(kind, label, [F.ax, F.ay], { rise: { frames: rise, fps: 12, loop: false }, idle: { frames: idle, fps: 10, loop: true } });
}
/** Drops the connected pieces of at most `max` px that lie wholly where `region(x)` holds. */
function dropLoose(c: Canvas, max: number, region: (x: number) => boolean): Canvas {
  const W = c.w, H = c.h, out = c.clone(), seen = new Uint8Array(W * H);
  for (let y0 = 0; y0 < H; y0++)
    for (let x0 = 0; x0 < W; x0++) {
      if (seen[y0 * W + x0] || !c.alpha(x0, y0)) continue;
      const piece: number[] = [], todo = [y0 * W + x0];
      seen[y0 * W + x0] = 1;
      let inside = true;
      while (todo.length) {
        const i = todo.pop()!;
        piece.push(i);
        const x = i % W, y = (i / W) | 0;
        if (!region(x)) inside = false;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const u = x + dx, v = y + dy;
            if (u < 0 || v < 0 || u >= W || v >= H) continue;
            const j = v * W + u;
            if (seen[j] || !c.alpha(u, v)) continue;
            seen[j] = 1;
            todo.push(j);
          }
      }
      if (inside && piece.length <= max) for (const i of piece) out.set(i % W, (i / W) | 0, [0, 0, 0, 0]);
    }
  return out;
}

/**
 * His 3/4 wall, finished at its far end. His panel's frame lines (round the crop) are dropped,
 * and the far (right) end, which his panel cut off at the top and the right and which held the
 * flat fill where his character stood, is rebuilt from his own wall: the stretch 120 px back along
 * the ground line is carried forward, smaller with distance (and never taller than the frame
 * allows), joined to his wall along a ragged seam. `g` is the ground line.
 */
function diagWall(src: Canvas, g: (x: number) => number): Canvas {
  const W = src.w, H = src.h, SEAM = 182, P = 120, END = 266;
  const c = new Canvas(W, H);
  for (let y = 14; y < 183; y++) for (let x = 12; x < 273; x++) c.set(x, y, src.get(x, y));
  // How tall his flames stand above the ground line in each column.
  const hgt = new Float64Array(W);
  for (let x = 0; x < W; x++) {
    let top = -1;
    for (let y = 14; y < g(x) && top < 0; y++) {
      const p = c.get(x, y);
      if (p[3] && p[0] > 150 && p[0] - p[2] > 60) top = y;
    }
    hgt[x] = top < 0 ? 0 : g(x) - top;
  }
  // The scale of the carried stretch: smaller toward the far end, and low enough to stay under the frame top.
  const xsOf = new Float64Array(W), sc = new Float64Array(W);
  const persp = (x: number) => lerp(0.95, 0.66, smooth(SEAM, END, x));
  let xs = SEAM - P;
  for (let x = SEAM - 12; x < W; x++) {
    let h = 1;
    for (let k = -10; k <= 10; k++) h = Math.max(h, hgt[clamp(Math.round(xs) + k, 0, W - 1)]);
    sc[x] = Math.min(persp(x), (g(x) - 7) / h);
    if (x >= SEAM) xs += 1 / sc[x];
    xsOf[x] = x < SEAM ? SEAM - P - (SEAM - x) : xs;
  }
  const sm = new Float64Array(W);
  for (let x = SEAM - 12; x < W; x++) {
    let m = 1;
    for (let k = -8; k <= 8; k++) m = Math.min(m, sc[clamp(x + k, SEAM - 12, W - 1)]);
    sm[x] = m;
  }
  // The last flames burn low: squashed toward the ground over the last 34 px, like his near end.
  const endLow = (x: number) => lerp(1, 0.32, smooth(END - 34, END + 2, x));
  const out = c.clone();
  for (let x = SEAM - 10; x < W; x++) {
    const s = sm[x] * endLow(x), xs0 = Math.round(xsOf[x]);
    for (let y = 0; y < H; y++) {
      // (a ragged seam: his wall on the left, the carried stretch on the right)
      if (x < SEAM + 10 && pnoise(x, y, 5, 0, 0, 3610) * 20 - 10 > x - SEAM) continue;
      const ys = Math.round(g(xs0) + (y - g(x)) / s);
      out.set(x, y, ys >= 14 && ys < 183 ? c.get(xs0, ys) : [0, 0, 0, 0]);
    }
  }
  return out;
}
export function walls(): WorldSprite[] {
  const fw = REF_FRAMES.wall, fd = REF_FRAMES.wall_diag;
  // His 3/4 wall's ground line runs from (22, 176) to (270, 50) in its frame.
  const diagG = (x: number) => lerp(176, 50, clamp((x - 22) / 248, 0, 1));
  return [
    refWall('wall', 'w_wall', 'Fire wall (4.5 m x 1.8 m)', (_x, y) => clamp((fw.ay - y) / (fw.ay - 8), 0, 1), (x) => Math.abs(x - fw.ax) / (fw.w / 2),
      (x, y) => y > fw.h - 9 - 6 * pnoise(x, 0, 5, 0, 0, 3501), 3500),
    refWall('wall_diag', 'w_diag', 'Fire wall, 3/4 (4.5 m x 1.8 m, turned 45 degrees)', (x, y) => clamp((diagG(x) - y) / 150, 0, 1), (x) => Math.abs(x - fd.ax) / (fd.w / 2),
      // The glowing ground strip runs along the wall's foot as a band (his panel's crop made it a
      // triangle with a flat bottom), thinner with distance; the far end burns out raggedly, the
      // strip ending a little before the flames.
      (x, y) => {
        const below = y - diagG(x), end = 265 + 6 * pnoise(0, y, 5, 0, 0, 3602) - Math.max(0, below) * 0.7 - Math.max(0, -below) * 0.3;
        const depth = lerp(28, 12, clamp((x - 22) / 244, 0, 1)) * (1 - 0.75 * smooth(234, 266, x)) + 7 * pnoise(x, 0, 9, 0, 0, 3606);
        return x > end || below > depth;
      }, 3600, (c) => diagWall(c, diagG), (x) => x > 200),
    refWall('wall_depth', 'w_depth', 'Fire wall, end-on (4.5 m x 1.8 m, running into the screen)', (_x, y) => clamp((240 - y) / 200, 0, 1), () => 0,
      (x, y) => x < 10 + 6 * pnoise(0, y, 6, 0, 0, 3701) || x > REF_FRAMES.wall_depth.w - 12 - 14 * pnoise(0, y, 6, 0, 0, 3702) || y > REF_FRAMES.wall_depth.h - 12 - 10 * pnoise(x, 0, 6, 0, 0, 3703) || (y > 108 && x > 60 - 8 * pnoise(0, y, 5, 0, 0, 3704)), 3700),
  ];
}

// --- projectiles and the hit, from his panels -------------------------------------------------

/**
 * A trailing flicker for something flying right: pixels behind (left of) the head at `hx` sway
 * more the further back they are, with a phase that loops (zero at ph = 0: his picture).
 */
function trail(c: Canvas, ph: number, hx: number, span: number, amp: number, seed: number): Canvas {
  return loopDisplace(c, ph, (x, y, p) => {
    const u = clamp((hx - x) / span, 0, 1);
    const n1 = pnoise(x * 0.4 + Math.cos(p) * 6, y * 0.4 + Math.sin(p) * 6, 7, 0, 0, seed) - 0.5;
    const n2 = pnoise(x * 0.4 + Math.sin(p) * 6, y * 0.4 - Math.cos(p) * 6, 7, 0, 0, seed + 1) - 0.5;
    return [n1 * 1.5 * amp * u, n2 * 1.5 * amp * u * 0.7];
  });
}
/** A fly loop of `n` frames from a piece (frame 0 his picture): its trail flickers and it pulses a little. */
function flyFrom(piece: string, frame: string, n: number, amp: number, pulse: number, seed: number): { frames: Canvas[]; anchor: [number, number] } {
  const F = REF_FRAMES[frame];
  const base = placed(piece, F.w, F.h);
  const fr = frames(n, (t) => {
    const ph = t * TAU;
    const c = trail(base, ph, F.ax + 6, F.ax, amp, seed);
    return pulse ? scaled(c, 1 + pulse * Math.sin(ph), 1 + pulse * Math.sin(ph), F.ax, F.ay) : c;
  });
  return { frames: fr, anchor: [F.ax, F.ay] };
}
/** Frames in every fly loop. */
const FLY = 8;
export function bolt(): WorldSprite {
  const f = flyFrom('p_bolt', 'bolt', FLY, 2, 0.03, 3900);
  return flySprite('bolt', 'Fire bolt (spiralling fireball)', f.frames, 12, f.anchor);
}
export function sphere(): WorldSprite {
  const F = REF_FRAMES.sphere;
  const base = placed('p_sphere', F.w, F.h);
  // The orb pulses and its rings shimmer all round (not a trail).
  const fr = frames(FLY, (t) => {
    const ph = t * TAU;
    const c = loopDisplace(base, ph, (x, y, p) => {
      const n = pnoise(x * 0.5 + Math.cos(p) * 5, y * 0.5 + Math.sin(p) * 5, 6, 0, 0, 4000) - 0.5;
      return [n * 1.5, -n * 1.5];
    });
    return scaled(c, 1 + 0.03 * Math.sin(ph), 1 + 0.03 * Math.sin(ph), F.ax, F.ay);
  });
  return flySprite('sphere', 'Fire sphere (burning orb with orbiting rings)', fr, 12, [F.ax, F.ay]);
}
export function slash(): WorldSprite {
  const f = flyFrom('p_slash', 'slash', FLY, 1.5, 0, 4100);
  return flySprite('slash', 'Fire slash (thick crescent of flame)', f.frames, 12, f.anchor);
}
export function multi(): WorldSprite {
  const f = flyFrom('p_multi', 'multi', FLY, 1.6, 0, 4200);
  return flySprite('multi', 'Fire multi (three comet flames in a volley)', f.frames, 12, f.anchor);
}
export function breath(): WorldSprite {
  const F = REF_FRAMES.breath;
  const base = placed('p_breath', F.w, F.h);
  // The cone churns more toward its far end (it flows away from the mouth on the left).
  const fr = frames(FLY, (t) => loopDisplace(base, t * TAU, (x, y, p) => {
    const u = clamp((x - 8) / (F.w - 14), 0, 1), s = (p / TAU) * 30;
    const n1 = pnoise(x * 0.35 - s, y * 0.4, 6, 30, 0, 3700) - 0.5, n2 = pnoise(x * 0.35 - s, y * 0.4, 6, 30, 0, 3701) - 0.5;
    return [n1 * 3 * u, (n2 * 2.2 + Math.sin(p + x * 0.1) * 0.5) * u];
  }));
  return flySprite('breath', 'Fire breath (flame cone wrapped in smoke, origin left middle)', fr, 12, [F.ax, F.ay]);
}
export function stream(): WorldSprite[] {
  const seg = placed('p_stream', 80, 64);
  // His jet, made into a seamless 64 px tile: its first 16 columns hand over (raggedly) from the
  // stretch just after the tile's end, so column 63 runs on into column 0.
  const tile = new Canvas(64, 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const take = x < 16 && pnoise(x, y, 4, 0, 0, 3800) * 0.6 + 0.2 > x / 16;
      tile.set(x, y, seg.get(take ? x + 64 : x, y));
    }
  const shift = (c: Canvas, s: number) => {
    const out = new Canvas(64, 64);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) out.set(x, y, c.get((((x - s) % 64) + 64) % 64, y));
    return out;
  };
  const tiles = frames(FLY, (_, i) => shift(tile, i * (64 / FLY)));
  const H = REF_FRAMES.stream_head;
  const head = placed('p_stream_head', H.w, H.h);
  const heads = frames(FLY, (t, i) => {
    const c = loopDisplace(head, t * TAU, (x, y, p) => {
      const u = clamp((x - 30) / 40, 0, 1);
      const n = pnoise(x * 0.5 + Math.cos(p) * 5, y * 0.5 + Math.sin(p) * 5, 5, 0, 0, 3801) - 0.5;
      return [n * 2.2 * u, n * 2.2 * u];
    });
    // Its left part is the stream itself, scrolling with the tiles.
    const sc = shift(tile, i * (64 / FLY));
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 30; x++) if (x < 22 || pnoise(x, y, 3, 0, 0, 3802) > (x - 22) / 8) c.set(x, y, sc.get(x, y));
    return c;
  });
  return [flySprite('stream', 'Fire stream (fire jet, tileable 64 px)', tiles), flySprite('stream_head', 'Fire stream head', heads, 12, [H.ax, H.ay])];
}
/**
 * His starburst, 12 frames at 12 fps:
 * - 0-2, build: it grows out from the point of impact;
 * - 3-5, the peak: frame 3 is his picture, held with a small shimmer;
 * - 6-11, dissipate: it shrinks back, its spikes thin from the tips and break, it cools into
 *   smoke from the tips inward and darkens, and sparks fly off the spikes and die.
 */
export function hit(): WorldSprite {
  const F = REF_FRAMES.hit, W = F.w, H = F.h, seed = 4300, PEAK = 3;
  const base = placed('p_hit', W, H);
  let R = 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (base.alpha(x, y)) R = Math.max(R, Math.hypot(x - F.ax, y - F.ay));
  const shimmer = (c: Canvas, ph: number, amp: number) => loopDisplace(c, ph, (x, y, p) => {
    const r = Math.hypot(x - F.ax, y - F.ay) || 1, n = pnoise(x * 0.5 + Math.cos(p) * 4, y * 0.5 + Math.sin(p) * 4, 6, 0, 0, seed) - 0.5;
    return [((x - F.ax) / r) * n * amp * (r / R), ((y - F.ay) / r) * n * amp * (r / R)];
  });
  const fr = frames(12, (_, i) => {
    if (i < PEAK) {
      const k = [0.45, 0.68, 0.86][i];
      return scaled(base, k, k, F.ax, F.ay);
    }
    const ph = ((i - PEAK) / 8) * TAU;
    if (i <= 5) {
      const k = 1 + 0.012 * (i - PEAK);
      return scaled(shimmer(base, ph, 2.4), k, k, F.ax, F.ay);
    }
    const k = (i - 5) / 6, sk = 1.024 - 0.26 * k;
    let c = scaled(shimmer(base, ph, 2.4), sk, sk, F.ax, F.ay);
    c = thinOut(c, k, 12, seed + 1, null);
    c = cool(c, (x, y) => k * 1.5 - 0.42 + (Math.hypot(x - F.ax, y - F.ay) / (R * sk)) * 0.6 + (pnoise(x, y, 10, 0, 0, seed + 2) - 0.5) * 0.3, SMOKE_WARM, seed + 3);
    c = dim(c, 1 - 0.55 * k, SMOKE_WARM[0]);
    // The smoke rises a little as it goes.
    const body = new Canvas(W, H);
    body.draw(c, 0, -Math.round(k * 4));
    const em: { x: number; y: number; s: number }[] = [];
    const n = i <= 8 ? 10 : 10 - (i - 8) * 3;
    for (let j = 0; j < n; j++) {
      const a = rr(seed + 5, j, 0, TAU), d = R * (0.62 + rr(seed + 6, j, 0, 0.2) + k * 0.45);
      em.push({ x: F.ax + Math.cos(a) * d, y: F.ay + Math.sin(a) * d * 0.85 - k * 6, s: j % 3 === 0 && i < 9 ? 2 : 1 });
    }
    return stack(W, H, body, embers(W, H, em.filter((e) => e.x > 3 && e.x < W - 4 && e.y > 3 && e.y < H - 4), body));
  });
  return vfxSprite('hit', 'Fire hit (starburst of flame spikes)', [F.ax, F.ay], { hit: { frames: fr, fps: 12, loop: false } });
}

/**
 * The Great Fireballs: `fly` (8 frames) is his ball with its big smoke trail and debris, cut from his panel;
 * `burst` is the approved burst, unchanged. Both share one anchor (the ball's centre / the
 * burst's ground centre), so the frame is the union of the two around it.
 */
export function fireballs(): WorldSprite[] {
  return ([false, true] as const).map((great) => {
    const old = fireballOld(great);
    const F = REF_FRAMES[great ? 'fireball_great_fly' : 'fireball_fly'];
    const fly = flyFrom(great ? 'p_fireball_great' : 'p_fireball', great ? 'fireball_great_fly' : 'fireball_fly', FLY, great ? 3 : 2.4, 0.015, great ? 4500 : 4400);
    const ob = old.anims.burst.frames[0];
    const left = Math.max(F.ax, old.anchor[0]), top = Math.max(F.ay, old.anchor[1]);
    const W = left + Math.max(F.w - F.ax, ob.w - old.anchor[0]), H = top + Math.max(F.h - F.ay, ob.h - old.anchor[1]);
    const put = (c: Canvas, ax: number, ay: number) => {
      const out = new Canvas(W, H);
      out.draw(c, left - ax, top - ay);
      return out;
    };
    return vfxSprite(old.name, old.label, [left, top], {
      fly: { frames: fly.frames.map((c) => put(c, F.ax, F.ay)), fps: 12, loop: true },
      burst: { frames: old.anims.burst.frames.map((c) => put(c, old.anchor[0], old.anchor[1])), fps: 12, loop: false },
    });
  });
}


