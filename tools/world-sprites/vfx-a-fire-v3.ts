// Fire set, third pass: the sprites redone to the owner's paint-over of the fire sheet
// (REF-fire-set-owner.jpg). Richer gradients, warm dark smoke used generously, a glowing
// scorched ground under everything that touches the ground, crisp dark-red outlines and
// white-hot cores.

import { Canvas, Color, WorldSprite, withAlpha } from './kit';
import { Billow, FIRE, GREY, ROCK, SMOKE, TH, billows, embers, erode, flow, tongue } from './vfx-a-fire-kit';
import { cool, dim, flicker, placed, refPiece, roughen, scaled } from './vfx-a-ref';
import { REF_FRAMES } from './vfx-a-fire-refdata';
import {
  Field, Pt, TAU, WallKind, WallLine, bez, clamp, crop, dissolve, flySprite, frames, fract, lerp, pfbm, pnoise, render, rr, seamStack, smooth, stack, tubeShade, vfxSprite, wallGround, wallLine, wp,
} from './vfx-a-lib';

const D = Math.PI / 180;

/** A glowing scorched ground patch: an ellipse of dark char with a hot glowing middle and cracks (alpha). */
function scorch(c: Canvas, cx: number, cy: number, rx: number, ry: number, glowK: number, seed: number): void {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
      const ragged = 1 + 0.08 * (pnoise(x, y, 7, 0, 0, seed) - 0.5) * 2;
      if (d > ragged) continue;
      const n = pfbm(x * 0.8, y * 1.4, 12, 2, 0, 0, seed + 1);
      const crack = Math.abs(pnoise(x * 0.6, y * 1.3, 10, 0, 0, seed + 2) - 0.5) < 0.04;
      const hot = glowK * (1 - d * 0.75) + (crack ? 0.18 * glowK : 0) + (n - 0.5) * 0.16;
      const col: Color = hot > 0.62 ? FIRE[3] : hot > 0.42 ? FIRE[2] : hot > 0.22 ? FIRE[1] : SMOKE[1];
      const a = d > 0.85 ? 110 : hot > 0.42 ? 210 : 170;
      c.plot(x, y, withAlpha(col, Math.round(a * clamp(0.35 + glowK, 0, 1))));
    }
}

// --- blast: his mushroom cloud ---------------------------------------------------------------

/** Warm brown-grey smoke (from his paint-over), dark to light. */
const SMOKE_WARM: Color[] = ['#24141a', '#3a2622', '#4a3532', '#5e4640', '#77594f', '#8f6e60', '#a88a78'].map((h) => hexC(h));
function hexC(h: string): Color {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
}

/**
 * His mushroom cloud, built from his own pixels (art2/vfx-a-extract.py cuts his panel into the
 * cap, the stem with its flaring root, the far and near halves of the ring of fire and the
 * scorched ground). Frame 4 is his picture exactly; the frames before grow into it (a flash,
 * the stem rising, the cap blooming, the ring spreading), the frames after cool it into smoke
 * and let the ring burn down.
 */
export function blast(): WorldSprite {
  const W = 220, H = 170, cx = 110, gy = 128, seed = 3100;
  const cap = refPiece('b_cap'), stem = refPiece('b_stem');
  const capBottom = cap.y + cap.c.h, capCx = cap.x + cap.c.w / 2;
  const stemTop = stem.y, stemBottom = stem.y + stem.c.h;
  const fr = frames(8, (_, i) => {
    const t = i / 8, ph = t * TAU;
    // Per frame: ring and ground spread, stem height revealed, cap size, cooling, ring burning down.
    const ringK = [0.2, 0.45, 0.72, 1, 1, 1, 1, 1][i];
    const groundK = [0.3, 0.55, 0.8, 1, 1, 1, 1, 1][i];
    const groundDim = [1, 1, 1, 1, 1, 0.85, 0.62, 0.42][i];
    const stemK = [0, 0.45, 0.8, 1, 1, 0.92, 0.6, 0][i];
    const capK = [0.24, 0.5, 0.8, 1, 1.03, 1.06, 1.09, 1.12][i];
    const capRise = [0, 0, 0, 0, -2, -5, -8, -11][i];
    const coolK = [0, 0, 0, 0, 0, 0.4, 0.8, 1][i];
    const ringH = [1, 1, 1, 1, 1, 0.8, 0.55, 0.3][i];
    const ringDim = [1, 1, 1, 1, 1, 0.9, 0.72, 0.5][i];
    const layers: (Canvas | null)[] = [];
    // The scorched glowing ground, spreading with the ring.
    layers.push(dim(scaled(placed('b_ground', W, H), groundK, groundK, cx, gy), groundDim, [26, 14, 18, 255]));
    // The far half of the ring.
    const ringAt = (name: string) => {
      let c = scaled(placed(name, W, H), ringK, ringK * ringH, cx, gy);
      if (i >= 3) c = flicker(c, ph, 1.2, gy, seed + name.length);
      return ringDim < 1 ? dim(c, ringDim) : c;
    };
    layers.push(ringAt('b_ring_back'));
    // The stem: revealed from the ground up while it rises, eroded from the top as it dies.
    if (stemK > 0) {
      const top = stemBottom - (stemBottom - stemTop) * stemK;
      const sc = placed('b_stem', W, H);
      const cut = new Canvas(W, H);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const p = sc.get(x, y);
          if (p[3] && y >= top + 3 * pnoise(x, 0, 4, 0, 0, seed + 1)) cut.set(x, y, p);
        }
      layers.push(i >= 3 ? flicker(cut, ph, 0.8, stemBottom, seed + 2) : cut);
    }
    // The cap: grown from a small dome at the ground (the flash) up to his cap on top of the stem.
    {
      const sx = capK, sy = capK;
      // Where the cap's bottom centre sits: on the ground for the flash, on the rising stem, then his.
      const baseY = i === 0 ? gy - 2 : i < 3 ? stemBottom - (stemBottom - capBottom) * [0, 0.55, 0.85][i] : capBottom + capRise;
      let c = scaled(placed('b_cap', W, H), sx, sy, capCx, capBottom);
      const moved = new Canvas(W, H);
      moved.draw(c, 0, Math.round(baseY - capBottom));
      c = moved;
      if (coolK > 0) {
        const top = baseY - cap.c.h * sy, hgt = cap.c.h * sy;
        c = cool(c, (x, y) => coolK * 1.6 - ((y - top) / hgt) * 0.9 + (pnoise(x, y, 12, 0, 0, seed + 8) - 0.5) * 0.5, SMOKE_WARM, seed + 3);
      }
      if (i === 7) c = dissolve(c, 0.62, (x, y) => clamp(pnoise(x, y, 14, 0, 0, seed + 4) * 0.7 + ((y - (baseY - cap.c.h * sy)) / (cap.c.h * sy)) * 0.3, 0, 1), [], SMOKE_WARM[0]).c;
      layers.push(c);
    }
    // The near half of the ring, in front of the stem.
    layers.push(ringAt('b_ring_front'));
    const body = stack(W, H, ...layers);
    // Sparks thrown up round the cap and off the ring.
    const em: { x: number; y: number; s: number }[] = [];
    if (i >= 1 && i <= 6)
      for (let k = 0; k < 12; k++) {
        const a = rr(seed + 5, k, Math.PI * 1.1, Math.PI * 1.9), d = rr(seed + 6, k, 40, 80) * (0.5 + i * 0.1);
        em.push({ x: capCx + Math.cos(a) * d, y: capBottom - 20 + Math.sin(a) * d * 0.6 + i * 2, s: k % 4 === 0 && i < 5 ? 2 : 1 });
      }
    for (let k = 0; k < 8; k++) {
      const p = fract(k / 8 + t * 2), a = rr(seed + 7, k, 0, TAU);
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
 * The loop flickers his flames upward (higher pixels sway more) and breathes them a little.
 */
export function aura(): WorldSprite[] {
  const F = REF_FRAMES.aura, W = F.w, H = F.h, ax = F.ax, ay = F.ay, seed = 3300;
  const backFr: Canvas[] = [], frontFr: Canvas[] = [];
  for (let i = 0; i < 6; i++) {
    const t = i / 6, ph = t * TAU;
    const breathe = (c: Canvas, k: number) => scaled(c, 1 + 0.02 * Math.sin(ph + k), 1 + 0.05 * Math.sin(ph + k), ax, ay);
    const backC = breathe(flicker(placed('a_back', W, H), ph, 2.4, ay, seed), 0);
    const glowC = new Canvas(W, H);
    for (let y = ay - 100; y < ay; y++)
      for (let x = ax - 26; x <= ax + 26; x++) {
        const d = Math.hypot((x - ax) / 26, (y - (ay - 46)) / 52);
        if (d < 1) glowC.set(x, y, withAlpha(FIRE[4], Math.round(52 * (1 - d * d))));
      }
    // (the flames round the legs move exactly with the back layer they were cut from)
    const frontC = stack(W, H, glowC, breathe(flicker(placed('a_low', W, H), ph, 2.4, ay, seed), 0));
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
    vfxSprite('aura', 'Fire aura, front layer (draw OVER the character)', [ax, ay], { idle: { frames: frontFr, fps: 12, loop: true } }),
    vfxSprite('aura_back', 'Fire aura, back layer (draw BEHIND the character)', [ax, ay], { idle: { frames: backFr, fps: 12, loop: true } }),
  ];
}

// --- walls: horizontal, 3/4 and end-on (his panels) -----------------------------------------

/**
 * A wall from his panel: `idle` flickers his flames; `rise` reveals his picture from the
 * ground up and from the middle out (height above the ground line), with a burning edge, ending
 * on his picture. Edges where his panel cut the flames are roughened.
 */
function refWall(kind: WallKind, piece: string, label: string, ground: (x: number, y: number) => number, along: (x: number, y: number) => number, rough: (x: number, y: number) => boolean, seed: number): WorldSprite {
  const F = REF_FRAMES[kind], W = F.w, H = F.h;
  const base = roughen(placed(piece, W, H), rough, refPiece(piece).pal[0]);
  const idle = frames(4, (t) => flicker(base, t * TAU, 1.6, F.ay, seed));
  const vis = [0.16, 0.32, 0.5, 0.68, 0.86, 1.01];
  const rise = frames(6, (_, i) => {
    const c = flicker(base, (i / 6) * TAU, 1.6, F.ay, seed);
    if (vis[i] > 1) return c;
    return dissolve(c, vis[i], (x, y) => clamp(ground(x, y) * 0.6 + along(x, y) * 0.3 + pnoise(x, y, 8, 0, 0, seed + 1) * 0.1, 0, 1), [FIRE[2], FIRE[3], FIRE[5]], FIRE[0]).c;
  });
  return vfxSprite(kind, label, [F.ax, F.ay], { rise: { frames: rise, fps: 12, loop: false }, idle: { frames: idle, fps: 12, loop: true } });
}
export function walls(): WorldSprite[] {
  const fw = REF_FRAMES.wall, fd = REF_FRAMES.wall_diag;
  // His 3/4 wall's ground line runs from (22, 176) to (270, 50) in its frame.
  const diagG = (x: number) => lerp(176, 50, clamp((x - 22) / 248, 0, 1));
  return [
    refWall('wall', 'w_wall', 'Fire wall (4.5 m x 1.8 m)', (_x, y) => clamp((fw.ay - y) / (fw.ay - 8), 0, 1), (x) => Math.abs(x - fw.ax) / (fw.w / 2),
      (x, y) => y > fw.h - 9 - 6 * pnoise(x, 0, 5, 0, 0, 3501), 3500),
    refWall('wall_diag', 'w_diag', 'Fire wall, 3/4 (4.5 m x 1.8 m, turned 45 degrees)', (x, y) => clamp((diagG(x) - y) / 150, 0, 1), (x) => Math.abs(x - fd.ax) / (fd.w / 2),
      (x, y) => y < 10 + 16 * pnoise(x, 0, 6, 0, 0, 3601) || x > fd.w - 11 - 16 * pnoise(0, y, 6, 0, 0, 3602) || (y > 52 && x > 194 - 12 * pnoise(0, y, 5, 0, 0, 3603)), 3600),
    refWall('wall_depth', 'w_depth', 'Fire wall, end-on (4.5 m x 1.8 m, running into the screen)', (_x, y) => clamp((240 - y) / 200, 0, 1), () => 0,
      (x, y) => x < 10 + 6 * pnoise(0, y, 6, 0, 0, 3701) || x > REF_FRAMES.wall_depth.w - 12 - 14 * pnoise(0, y, 6, 0, 0, 3702) || y > REF_FRAMES.wall_depth.h - 12 - 10 * pnoise(x, 0, 6, 0, 0, 3703) || (y > 108 && x > 60 - 8 * pnoise(0, y, 5, 0, 0, 3704)), 3700),
  ];
}

// --- breath: a cone of flame wrapped in smoke ------------------------------------------------

export function breath(): WorldSprite {
  // The origin (the mouth) is 48 px left of the anchor on its row, as before.
  const o = 4, W = 108, H = 76, oy = 38, seed = 3700;
  const fr = frames(4, (t) => {
    const ph = t * TAU;
    const f = new Field(W, H);
    // The cone: hot white-yellow along its axis, widening and breaking into billowing tongues.
    f.region(o, 0, W - 1, H - 1, (x, y) => {
      const d = x - o;
      if (d < 0) return 0;
      const u = d / 78;
      if (u > 1.05) return 0;
      const half = lerp(2, 25, Math.pow(Math.min(1, u), 0.7)) * (1 + 0.18 * (pnoise(d - t * 108, y, 9, 108, 0, seed) - 0.5) * 2);
      const q = Math.abs(y - oy) / half;
      if (q > 1) return 0;
      const streak = (pnoise((d - t * 108) * 0.35, (y - oy) * 1.2, 2, 108 * 0.35, 0, seed + 1) - 0.5) * 0.22;
      return (1.06 - 0.55 * Math.pow(q, 1.5) - 0.35 * Math.pow(u, 1.4)) * (u > 0.85 ? smooth(1.05, 0.85, u) : 1) + streak;
    });
    for (let k = 0; k < 9; k++) {
      const u = fract(k / 9 + t);
      const d = 20 + u * 58, side = k % 2 ? 1 : -1;
      const half = lerp(2, 25, Math.pow(d / 78, 0.7));
      tongue(f, [o + d, oy + side * half * 0.7], side * (0.35 + 0.3 * u), 10 + 8 * u, 4.5, 0.62, 0.2, ph + k, side * 0.2);
    }
    erode(f, 0.6, (x, y) => pfbm(x - t * 108, y, 7, 2, 108, 0, seed + 2), (x) => smooth(o + 30, o + 70, x));
    // Dark smoke puffs along its edges and tail, rolling out with it.
    const bl: Billow[] = [];
    for (let k = 0; k < 12; k++) {
      const u = fract(k / 12 + t * 0.5);
      const d = 26 + u * 56, side = k % 2 ? 1 : -1;
      const half = lerp(2, 25, Math.pow(Math.min(1, d / 78), 0.7));
      const r = lerp(6, 11, u) * rr(seed + 3, k, 0.85, 1.15);
      const x = Math.min(W - r * 1.2 - 3, o + d + 4), y = clamp(oy + side * (half + r * 0.2), r * 1.6 + 3, H - r - 3);
      bl.push({ x, y, r, heat: 0, glow: side < 0 ? 0 : 0.6, back: true, bumps: 2 });
    }
    const smoke = billows(W, H, bl, seed + 4, t);
    const fire = render(f, FIRE, { th: TH, rim: [1] });
    const em: { x: number; y: number; s: number }[] = [];
    for (let k = 0; k < 8; k++) {
      const p = fract(k / 8 + t);
      em.push({ x: o + 30 + p * 66, y: oy + rr(seed + 5, k, -1, 1) * (12 + p * 22), s: k % 3 === 0 ? 2 : 1 });
    }
    return stack(W, H, smoke, fire, embers(W, H, em.filter((e) => e.x < W - 3 && e.y > 2 && e.y < H - 3), fire));
  });
  return flySprite('breath', 'Fire breath (flame cone wrapped in smoke, origin left middle)', fr, 12, [48 + o, oy]);
}

// --- stream: a jet with a white-hot core and raking flame tongues -------------------------------

const JY = 32;
/** The jet across [x0, x1] at scroll s (periodic in 64 px): a hot core line inside a flame sheath. */
function jet(f: Field, s: number, x0: number, x1: number, ox: number, seed: number): void {
  f.region(x0, 0, x1, f.h - 1, (x, y) => {
    const xx = x - ox;
    const r = 7.5 + 1.5 * pnoise(xx - s, 3, 16, 64, 0, seed);
    const q = Math.abs(y - JY) / r;
    if (q > 1) return 0;
    const streak = (pnoise((xx - s) * 0.3, (y - JY) * 1.2, 2, 64 * 0.3, 0, seed + 1) - 0.5) * 0.2;
    return 1.06 - 0.6 * Math.pow(q, 1.6) + streak;
  });
}
/** Tongues raking back along the top and bottom edges, every 16 px, scrolling with s. */
function rakes(f: Field, s: number, x0: number, x1: number, ox: number, ph: number): void {
  for (let k = 0; k < 4; k++)
    for (const rep of [-64, 0, 64]) {
      for (const side of [-1, 1]) {
        const bx = fract((k * 16 + (side > 0 ? 8 : 0) + s) / 64) * 64 + rep + ox;
        if (bx < x0 - 14 || bx > x1 + 4) continue;
        const a = Math.PI + side * 0.55;
        tongue(f, [bx, JY + side * 5], a, 15 + 2 * Math.sin(ph + k), 3.6, 0.78, 0.12, ph + k + side, side * -0.25);
      }
    }
}
export function stream(): WorldSprite[] {
  const W = 64, H = 64, PAD = 32, HR = 10, seed = 3800;
  const tile = frames(4, (t) => {
    const s = t * 64, ph = t * TAU;
    const f = new Field(W + PAD * 2, H);
    jet(f, s, 0, W + PAD * 2 - 1, PAD, seed);
    rakes(f, s, 0, W + PAD * 2, PAD, ph);
    const c = render(f, FIRE, { th: TH, rim: [1] });
    const em: { x: number; y: number; s: number }[] = [];
    for (let k = 0; k < 3; k++) for (const rep of [-64, 0, 64]) em.push({ x: fract((k * 21 + 5 + s) / 64) * 64 + rep + PAD, y: JY + (k % 2 ? 1 : -1) * rr(seed + 2, k, 16, 22), s: 1 });
    return crop(stack(W + PAD * 2, H, c, embers(W + PAD * 2, H, em)), PAD, 0, W, H);
  });
  const head = frames(4, (t) => {
    const s = t * 64, ph = t * TAU;
    const f = new Field(W + PAD + HR, H);
    jet(f, s, 0, PAD + 30, PAD, seed);
    rakes(f, s, 0, PAD + 26, PAD, ph);
    // The mouth: the jet flares into a bright ragged burst.
    const hx = PAD + 38;
    f.ell(hx, JY, 15, 13, 0, 1.08, 1.5);
    for (let k = 0; k < 11; k++) {
      const a = -1.35 + (k / 10) * 2.7 + rr(seed + 3, k, -0.1, 0.1);
      tongue(f, [hx + Math.cos(a) * 9, JY + Math.sin(a) * 9], a * 0.85, 9 + rr(seed + 4, k, 0, 7) + 3 * Math.sin(ph + k * 1.7), 3.6, 0.82, 0.18, ph + k, a > 0 ? 0.2 : -0.2);
    }
    erode(f, 0.5, (x, y) => pfbm(x, y, 5, 2, 0, 0, seed + 5 + Math.round(t * 4)), (x) => smooth(hx - 6, hx + 12, x));
    const c = render(f, FIRE, { th: TH, rim: [1] });
    const em: { x: number; y: number; s: number }[] = [];
    for (let k = 0; k < 10; k++) {
      const p = fract(k / 10 + t);
      const a = rr(seed + 6, k, -1.2, 1.2);
      em.push({ x: hx + Math.cos(a) * (18 + p * 14), y: JY + Math.sin(a) * (18 + p * 12), s: p < 0.4 ? 2 : 1 });
    }
    return crop(stack(W + PAD + HR, H, c, embers(W + PAD + HR, H, em.filter((e) => e.x < W + PAD + HR - 3 && e.y > 2 && e.y < H - 3), c)), PAD, 0, W + HR, H);
  });
  return [flySprite('stream', 'Fire stream (fire jet, tileable 64 px)', tile), flySprite('stream_head', 'Fire stream head', head, 12, [32, 32])];
}

// --- bolt: a spiralling fireball with a comet tail ---------------------------------------------

/** A ball whose bands spiral into a white core, turning with the loop. */
function spiralBall(f: Field, cx: number, cy: number, R: number, t: number, seed: number): void {
  f.region(cx - R, cy - R, cx + R, cy + R, (x, y) => {
    const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy) / R;
    if (r > 1) return 0;
    const a = Math.atan2(dy, dx);
    const sp = Math.sin(a * 2 + r * 9 - t * TAU * 2);
    return 0.62 + 0.4 * (1 - r) + 0.16 * sp * smooth(0.12, 0.4, r) * (1 - smooth(0.82, 1, r)) - 0.15 * smooth(0.7, 1, r) + (pnoise(x, y, 3, 0, 0, seed) - 0.5) * 0.06;
  });
}
export function bolt(): WorldSprite {
  const o = 6, W = 64 + o, H = 64, cx = 40 + o, cy = 32, seed = 3900;
  const fr = frames(4, (t) => {
    const ph = t * TAU;
    const f = new Field(W, H);
    // The comet tail: licking tongues streaming back, longest in the middle.
    for (let k = 0; k < 7; k++) {
      const u = k / 6;
      const a = Math.PI + lerp(-0.6, 0.6, u);
      const len = (16 + 20 * (1 - Math.abs(u - 0.5) * 2)) * (1 + 0.12 * Math.sin(ph + k * 1.7));
      tongue(f, [cx + Math.cos(a) * 9, cy + Math.sin(a) * 9], Math.atan2(Math.sin(a) * 0.45, -1), len, 5, 0.78, 0.16, ph + k * 1.3, Math.sin(a) * 0.15);
    }
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * TAU;
      tongue(f, [cx + Math.cos(a) * 10, cy + Math.sin(a) * 10], Math.atan2(Math.sin(a), Math.cos(a) - 0.9), 5 + 2 * Math.sin(ph * 2 + k), 2.6, 0.72, 0.14, ph + k, 0);
    }
    spiralBall(f, cx, cy, 12, t, seed);
    erode(f, 0.55, (x, y) => pfbm(x + t * 64, y, 5, 2, 64, 0, seed + 1), (x, y) => smooth(11, 14, Math.hypot(x - cx, y - cy)));
    const c = render(f, FIRE, { th: TH, rim: [1] });
    const em: { x: number; y: number; s: number }[] = [];
    for (let k = 0; k < 8; k++) {
      const p = fract(k / 8 + t);
      em.push({ x: cx - 16 - p * 28 + rr(seed + 2, k, -3, 3), y: cy + rr(seed + 3, k, -18, 16) - p * 4, s: p < 0.4 ? 2 : 1 });
    }
    return stack(W, H, c, embers(W, H, em.filter((e) => e.x > 3 && e.y > 2 && e.y < H - 3), c));
  });
  return flySprite('bolt', 'Fire bolt (spiralling fireball)', fr, 12, [32 + o, 32]);
}

// --- sphere: a burning orb with orbiting rings of fire ------------------------------------------

export function sphere(): WorldSprite {
  const W = 72, H = 72, cx = 36, cy = 36, R = 13, seed = 4000;
  const rings = [{ rx: 30, ry: 9, rot: -0.35 }, { rx: 27, ry: 10, rot: 0.75 }, { rx: 24, ry: 7, rot: 1.75 }];
  const fr = frames(4, (t) => {
    const ph = t * TAU;
    const ball = new Field(W, H), back = new Field(W, H), front = new Field(W, H);
    // The orb: a corona of short flames round a white-hot core.
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * TAU + 0.2;
      tongue(ball, [cx + Math.cos(a) * R * 0.85, cy + Math.sin(a) * R * 0.85], a - 0.3, 6 + 3 * Math.sin(ph * 2 + k * 1.3), 3.4, 0.74, 0.16, ph + k, 0);
    }
    spiralBall(ball, cx, cy, R, t, seed);
    // The rings: each a thin band of fire on a tilted ellipse, hottest at a bright head running round it.
    rings.forEach((rg, j) => {
      const cr = Math.cos(rg.rot), sr = Math.sin(rg.rot);
      const head = ph + j * 2.1;
      for (let k = 0; k < 90; k++) {
        const a = (k / 90) * TAU;
        const ex = Math.cos(a) * rg.rx, ey = Math.sin(a) * rg.ry;
        const x = cx + ex * cr - ey * sr, y = cy + ex * sr + ey * cr;
        const behind = Math.sin(a) < 0;
        const lag = fract((head - a) / TAU);
        const heat = 0.5 + 0.48 * Math.pow(1 - lag, 3);
        (behind ? back : front).disc(x, y, 1.9 + (1 - lag) * 1.1, heat, 1.2);
      }
    });
    const c = stack(W, H, render(back, FIRE, { th: TH, rim: [1], hi: 5 }), render(ball, FIRE, { th: TH, rim: [1] }), render(front, FIRE, { th: TH, rim: [1] }));
    const em: { x: number; y: number; s: number }[] = [];
    for (let k = 0; k < 9; k++) {
      const a = rr(seed + 1, k, 0, TAU) + t * 0.6, r = rr(seed + 2, k, 22, 32);
      em.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.8, s: k % 3 === 0 ? 2 : 1 });
    }
    return stack(W, H, c, embers(W, H, em.filter((e) => e.x > 2 && e.x < W - 3 && e.y > 2 && e.y < H - 3), c));
  });
  return flySprite('sphere', 'Fire sphere (burning orb with orbiting rings)', fr, 12, [cx, cy]);
}

// --- slash: a thick crescent of fire --------------------------------------------------------

export function slash(): WorldSprite {
  const W = 64, H = 72, seed = 4100;
  const C: Pt = [14, 36], R = 33;
  const fr = frames(4, (t) => {
    const ph = t * TAU;
    const f = new Field(W, H);
    f.region(0, 0, W - 1, H - 1, (x, y) => {
      const dx = x - C[0], dy = y - C[1];
      const a = Math.atan2(dy, dx);
      if (Math.abs(a) > 1.12) return 0;
      const taper = Math.pow(Math.cos((a / 1.12) * Math.PI * 0.5), 0.75);
      const r = Math.hypot(dx, dy);
      const inner = R - 15 * taper;
      if (r > R || r < inner) return 0;
      const u = (r - inner) / Math.max(1, R - inner);
      // Inner flame strokes: bands raking in from the back edge.
      const strokes = (pnoise(a * 30 + 4, (r - t * 30) * 0.4, 2.2, 0, 12, seed) - 0.5) * 0.3;
      return 0.3 + 0.78 * Math.pow(u, 1.3) + strokes * (1 - u);
    });
    // Flames tearing back off the inner edge.
    for (let k = 0; k < 7; k++) {
      const a = -0.9 + (k / 6) * 1.8;
      const taper = Math.pow(Math.cos((a / 1.12) * Math.PI * 0.5), 0.75);
      const r = R - 15 * taper + 2;
      tongue(f, [C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r], Math.PI + a * 0.4, (8 + 6 * taper) * (1 + 0.2 * Math.sin(ph + k)), 3 * taper + 1, 0.55, 0.2, ph + k * 1.6, 0.1);
    }
    erode(f, 0.45, (x, y) => pfbm(x, y + t * 64, 5, 2, 0, 64, seed + 1), (x) => smooth(C[0] + R - 8, C[0] + R - 20, x));
    const c = render(f, FIRE, { th: TH, rim: [1] });
    const em: { x: number; y: number; s: number }[] = [];
    for (let k = 0; k < 10; k++) {
      const p = fract(k / 10 + t);
      const a = rr(seed + 2, k, -0.9, 0.9);
      em.push({ x: C[0] + Math.cos(a) * (R - 18) - p * 14, y: C[1] + Math.sin(a) * (R - 10), s: p < 0.3 ? 2 : 1 });
    }
    return stack(W, H, c, embers(W, H, em.filter((e) => e.x > 2 && e.y > 2 && e.y < H - 3), c));
  });
  return flySprite('slash', 'Fire slash (thick crescent of flame)', fr, 12, [32, 36]);
}

// --- multi: three comet flames in a staggered volley ---------------------------------------------

export function multi(): WorldSprite {
  const W = 72, H = 64, seed = 4200;
  const comets = [{ x: 46, y: 14, r: 6 }, { x: 56, y: 32, r: 6.5 }, { x: 42, y: 50, r: 5.5 }];
  const fr = frames(4, (t) => {
    const ph = t * TAU;
    const f = new Field(W, H);
    comets.forEach((cm, j) => {
      for (let k = 0; k < 4; k++) {
        const u = k / 3;
        const a = Math.PI + lerp(-0.45, 0.45, u);
        tongue(f, [cm.x + Math.cos(a) * cm.r * 0.7, cm.y + Math.sin(a) * cm.r * 0.7], Math.atan2(Math.sin(a) * 0.5, -1), cm.r * (2.4 + 1.6 * (1 - Math.abs(u - 0.5) * 2)) * (1 + 0.15 * Math.sin(ph + k + j)), cm.r * 0.55, 0.8, 0.16, ph + k * 1.3 + j, 0.1);
      }
      f.disc(cm.x, cm.y, cm.r, 1.06, 1.8);
    });
    erode(f, 0.5, (x, y) => pfbm(x + t * 64, y, 4, 2, 64, 0, seed), (x) => smooth(36, 20, x));
    const c = render(f, FIRE, { th: TH, rim: [1] });
    const em: { x: number; y: number; s: number }[] = [];
    comets.forEach((cm, j) => {
      for (let k = 0; k < 3; k++) {
        const p = fract(k / 3 + t + j * 0.3);
        em.push({ x: cm.x - 18 - p * 16, y: cm.y + rr(seed + 1, k + j * 3, -5, 5), s: 1 });
      }
    });
    return stack(W, H, c, embers(W, H, em.filter((e) => e.x > 2 && e.y > 2 && e.y < H - 3), c));
  });
  return flySprite('multi', 'Fire multi (three comet flames in a volley)', fr, 12, [32, 32]);
}

// --- hit: a starburst of flame spikes -------------------------------------------------------------

export function hit(): WorldSprite {
  const W = 84, H = 84, cx = 42, cy = 42, seed = 4300;
  const fr = frames(6, (_, i) => {
    const t = i / 6, ph = t * TAU;
    const f = new Field(W, H), deb = new Field(W, H);
    const R = [10, 20, 28, 30, 26, 0][i];
    const heat = [1.05, 1.02, 0.95, 0.82, 0.62, 0][i];
    if (R > 0) {
      // A star of sharp flame spikes round a white core.
      const n = 12;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU + 0.13;
        const len = R * (k % 2 ? 0.72 : 1) * rr(seed, k, 0.85, 1.12);
        tongue(f, [cx + Math.cos(a) * R * 0.2, cy + Math.sin(a) * R * 0.2], a, len, Math.max(2.5, R * 0.17), heat * 0.88, 0.05, ph + k, 0);
      }
      f.disc(cx, cy, R * 0.42, heat * 1.03, 1.8);
      if (i >= 3) erode(f, 0.6 + (i - 3) * 0.9, (x, y) => pnoise(x, y, 5, 0, 0, seed + 1 + i));
    }
    // Debris chunks flying out and falling.
    if (i >= 1) {
      const p = i / 5;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + rr(seed + 2, k, -0.25, 0.25);
        const d = (14 + 26 * p) * rr(seed + 3, k, 0.85, 1.15);
        const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d + p * p * 10;
        if (x < 4 || x > W - 5 || y < 4 || y > H - 5) continue;
        deb.disc(x, y, k % 3 === 0 ? 2.4 : 1.8, 0.8, 1);
      }
    }
    const c = stack(W, H, deb.any() ? render(deb, ROCK, { th: [0, 0.3, 0.55, 0.75], hi: 4 }) : null, f.any() ? render(f, FIRE, { th: TH, rim: [1] }) : null);
    const em: { x: number; y: number; s: number }[] = [];
    if (i >= 2) for (let k = 0; k < 10; k++) {
      const a = rr(seed + 4, k, 0, TAU), d = (18 + 18 * (i / 5)) * rr(seed + 5, k, 0.8, 1.2);
      em.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d + (i / 5) * 6, s: i < 4 && k % 3 === 0 ? 2 : 1 });
    }
    return stack(W, H, c, embers(W, H, em.filter((e) => e.x > 2 && e.x < W - 3 && e.y > 2 && e.y < H - 3), c));
  });
  return vfxSprite('hit', 'Fire hit (starburst of flame spikes)', [cx, cy], { hit: { frames: fr, fps: 12, loop: false } });
}

void bez; void flow; void flySprite; void lerp; void seamStack; void wallGround; void wallLine; void wp;
export type { WallKind, WallLine };
