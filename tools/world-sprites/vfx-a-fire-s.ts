// The S-rank Great Fire Annihilation (enhanced): the owner's reference made into a sprite.
//
// A massive wall of fire runs from the caster along the 15 m cone, rising toward the far end,
// over a glowing scorched ground plane. A whole Eastern dragon weaves through it: its tail flicks
// up as a flame near the caster, its body dives into the fire and arches out again (the tail and
// the dive behind the near flames, the arch between the rows, the neck in front of them), with
// dorsal flame-fins, belly plates and scales on every coil and two clawed legs gripping; its head
// at the far end breathes a jet of fire out of the frame's leading edge. The kanji 火 burns above
// the wall in strokes of flame, and enormous layered smoke rolls up behind it all toward the
// upper right: warm and fire-lit low down, cool grey at the top, dark under every billow.
//
// surge: the wall rolls out, the dragon rises out of it and the kanji writes itself stroke by
// stroke; burn: the body undulates, flames lick, the jet roars and the smoke churns; fade:
// everything burns down to embers and the smoke thins away.

import { Canvas, WorldSprite } from './kit';
import { FIRE, SMOKE, TH, embers, erode, tongue } from './vfx-a-fire-kit';
import { spline } from './vfx-a-fire-dragon';
import { burnOut, columnBottoms, dim, displace, dropColumns, dropCrumbs, fillEnclosed, flicker, raggedCut, refPiece, roughen, scaled, sinkColumns } from './vfx-a-ref';
void smokeLayer;
import { Field, Pt, TAU, bez, clamp, dissolve, fract, lerp, palette, pfbm, pnoise, render, rr, smooth, stack, vfxSprite } from './vfx-a-lib';

/** His smoke: warm brown-grey throughout (sampled from his picture), fire-lit low down. */
const SMOKE_HIS = palette('#24141a', '#3a1f22', '#472625', '#553f3d', '#7c4838', '#8a5e4b', '#a07a64');
const SMOKE_LIT = palette('#24141a', '#472625', '#7c4838', '#8a5e4b', '#c0804c', '#f0b560', '#f6cf8a');

const PX = 57;
const W = 1016, H = 968, X0 = 12, GY = 780;
const LEN = Math.round(15 * PX);
/** Tallest flames (px): his wall is lower than the dragon, so the hump's arch and the neck stand clear of it. */
const HMAX = 200;
const SEED = 1900;
/** Half the cone's depth on screen at d px from the apex: the enhanced cone is 80 degrees wide
 * (the normal one is 60), so its near and far edges spread about 1.45 times as far apart. */
const halfDepth = (d: number) => 5 + 0.145 * d;

export interface SState {
  /** How far the wall has rolled out (0..1 of the cone). */
  roll: number;
  /** Flame height (0..1). */
  burn: number;
  /** Flames nearer the caster than this (0..1) have burnt out. */
  dead: number;
  /** Smoke amount (0..1). */
  smoke: number;
  /** Dragon visibility (0..1). */
  dragon: number;
  /** How much of each kanji stroke is written (0..1 each), and its visibility while fading. */
  kanji: number[];
  kanjiVis: number;
  /** The breath jet (0..1). */
  jet: number;
  phase: 'surge' | 'burn' | 'fade';
  t: number;
}

// --- the kanji 火 in strokes of flame ---------------------------------------------------------

/** Where the kanji sits: its box in the frame. */
export interface KanjiBox { x: number; y: number; w: number; h: number }
const SBOX: KanjiBox = { x: 226, y: 88, w: 350, h: 300 };
/** The four strokes in writing order (in the box's 0..1 space): left dot, right dot, the long fall to the left, the sweep to the right. */
const STROKES: { pts: Pt[]; w: (u: number) => number }[] = [
  { pts: bez([0.33, 0.25], [0.24, 0.32], [0.15, 0.42], [0.17, 0.53], 24), w: (u) => lerp(0.006, 0.05, Math.pow(u, 0.7)) * (u > 0.85 ? 1 - (u - 0.85) * 2 : 1) },
  { pts: bez([0.8, 0.17], [0.7, 0.3], [0.6, 0.42], [0.53, 0.49], 26), w: (u) => lerp(0.006, 0.055, Math.pow(u, 0.7)) * (u > 0.85 ? 1 - (u - 0.85) * 2 : 1) },
  { pts: bez([0.43, 0.02], [0.47, 0.42], [0.37, 0.72], [0.02, 0.98], 48), w: (u) => (0.03 + 0.035 * Math.sin(Math.PI * Math.min(1, u * 1.4))) * Math.pow(1 - u, 0.35) + 0.004 },
  { pts: bez([0.45, 0.47], [0.53, 0.68], [0.72, 0.86], [0.99, 0.93], 44), w: (u) => lerp(0.018, 0.068, smooth(0, 0.86, u)) * (u > 0.9 ? Math.max(0.15, (1 - u) / 0.1) : 1) + 0.004 },
];

/**
 * The kanji 火 in strokes of flame inside `box`: each stroke a white-hot core with licking edges
 * and flames rising off it; `prog` writes each stroke part-way (a bright brush head leads it),
 * `vis` < 1 burns it away from the top down. Returns the layer and its hottest points (for sparks).
 */
export function kanjiFire(Wd: number, Hd: number, box: KanjiBox, prog: number[], vis: number, t: number, seed: number): { c: Canvas | null; hot: Pt[] } {
  if (!prog.some((p) => p > 0) || vis <= 0) return { c: null, hot: [] };
  const f = new Field(Wd, Hd);
  const ph = t * TAU;
  let hot: Pt[] = [];
  const K = ([x, y]: Pt): Pt => [box.x + x * box.w, box.y + y * box.h];
  STROKES.forEach((st, si) => {
    const p = prog[si];
    if (p <= 0) return;
    const n = Math.max(2, Math.round(st.pts.length * p));
    const pts = st.pts.slice(0, n).map(K);
    const w = (u: number) => st.w(u * (n - 1) / (st.pts.length - 1)) * box.w * 1.45;
    // The stroke: a white-hot core inside licking edges.
    f.path(pts, (u) => w(u) * (1 + 0.14 * Math.sin(ph * 2 + u * 9 + si)), (u) => 1.04 - 0.1 * u, 1.35);
    // Flames rising off the stroke, and a bright brush head while it is being written.
    for (let k = 1; k < n - 1; k += 2) {
      const [x, y] = pts[k];
      const r = w(k / (n - 1));
      if (r < 3) continue;
      const len = r * 2.2 + 8 + 5 * Math.sin(ph + k + si * 2);
      tongue(f, [x + rr(seed + si, k, -3, 3), y - r * 0.3], -Math.PI / 2 + rr(seed + 10 + si, k, -0.4, 0.4), len, r * 0.62, 0.72, 0.24, ph + k * 0.7 + si, rr(seed + 20 + si, k, -0.25, 0.25));
      if (k % 4 === 1) hot.push([x, y - r]);
    }
    if (p < 1) {
      const [hx, hy] = pts[n - 1];
      f.disc(hx, hy, Math.max(4, w(1) * 1.3), 1.05, 1.4);
      for (let k = 0; k < 6; k++) hot.push([hx + rr(seed + 30, k + si * 6, -10, 10), hy + rr(seed + 31, k + si * 6, -10, 6)]);
    }
  });
  erode(f, 0.85, (x, y) => pfbm(x, y + t * 90, 7, 2, 0, 90, seed + 40));
  let c = render(f, FIRE, { th: TH, rim: [1] });
  if (vis < 1) {
    // It dies like fire: the strokes thin from their edges, darken to embers and their tops cool
    // into smoke (no blocky holes).
    c = burnOut(c, 1 - vis, SMOKE_HIS, FIRE[0], seed + 160, box.y, box.h);
    hot = hot.filter((_, i) => i % 3 === 0);
  }
  return { c, hot };
}

/** The kanji's writing schedule over an 8-frame surge (strokes 1-4 written over frames 3-7). */
export const kanjiSurge = (i: number): number[] =>
  [clamp((i - 2.5) / 1, 0, 1), clamp((i - 3.5) / 1, 0, 1), clamp((i - 4) / 1.5, 0, 1), clamp((i - 5) / 1.6, 0, 1)].map((p) => (p > 0 && p < 0.25 ? 0.25 : p));
/** The kanji burning away over a 6-frame fade. */
export const KANJI_FADE = [0.82, 0.58, 0.36, 0.17, 0.05, 0];

// --- smoke: billowing volumes up to the upper right --------------------------------------------

interface Puff { x: number; y: number; r: number; back: boolean; warm: number }
/** The smoke's billows for this frame: a broad diagonal mass rolling up and right from behind the wall, with loose puffs breaking off its top. */
function puffs(st: SState): Puff[] {
  const out: Puff[] = [];
  const ph = st.t * TAU;
  const a: Pt = [190, GY - 170], b: Pt = [905, 150];
  const n = 160;
  for (let k = 0; k < n; k++) {
    // Billows drift along the mass over a loop and wrap round.
    const u = fract(rr(SEED + 49, k, 0, 1) + (st.phase === 'burn' ? st.t * 0.06 : 0));
    const grow = st.phase === 'surge' ? smooth(u - 0.12, u + 0.08, st.smoke * 1.15) : 1;
    if (grow <= 0.02) continue;
    if (st.phase === 'fade' && rr(SEED + 50, k, 0, 1) > st.smoke * 1.2) continue;
    const g = (rr(SEED + 51, k, -1, 1) + rr(SEED + 56, k, -1, 1)) * 0.5;
    const wid = lerp(70, 250, u);
    const x = lerp(a[0], b[0], u) + g * wid * 0.62 + Math.sin(ph + k) * 2.5;
    const y = lerp(a[1], b[1], Math.pow(u, 0.9)) + g * wid * 0.42 + Math.cos(ph + k * 1.3) * 2;
    let r = lerp(17, 36, u) * rr(SEED + 52, k, 0.65, 1.2) * (0.5 + 0.5 * grow) * (st.phase === 'fade' ? 0.75 + 0.25 * st.smoke : 1);
    r *= 1 + 0.06 * Math.sin(ph + k * 2.1);
    out.push({ x: Math.min(x, W - r * 1.2 - 8), y: Math.max(y, r * 1.5 + 8), r, back: g < -0.1, warm: smooth(GY - 560, GY - 300, y) });
  }
  // Loose puffs breaking off the top of the mass, rising to the top of the frame.
  for (let k = 0; k < 14; k++) {
    const u = fract(k / 14 + (st.phase === 'burn' ? st.t / 14 : 0));
    if (st.phase === 'surge' && st.smoke < 0.7 + u * 0.3) continue;
    if (st.phase === 'fade' && rr(SEED + 54, k, 0, 1) > st.smoke * 1.2) continue;
    const r = lerp(18, 9, u) * rr(SEED + 55, k, 0.8, 1.2);
    out.push({ x: lerp(600, 720, u) + rr(SEED + 57, k, -40, 40) + Math.sin(ph + k) * 3, y: Math.max(r + 8, lerp(150, 24, u)), r, back: true, warm: 0 });
  }
  // Paint the back ones first, and lower ones before the ones above them.
  return out.sort((p, q) => Number(q.back) - Number(p.back) || q.y - p.y);
}
/** Paints the billows (each a lit ball overwriting the ones behind it) and renders them warm near the fire and cool above. */
function smokeLayer(st: SState): Canvas | null {
  const list = puffs(st);
  if (!list.length) return null;
  const v = new Float32Array(W * H), warm = new Float32Array(W * H);
  const ball = (px: number, py: number, pr: number, near: number, back: boolean) => {
    const x0 = Math.max(0, Math.floor(px - pr * 1.1)), x1 = Math.min(W - 1, Math.ceil(px + pr * 1.1));
    const y0 = Math.max(0, Math.floor(py - pr * 1.1)), y1 = Math.min(H - 1, Math.ceil(py + pr * 1.1));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - px) / pr, dy = (y + 0.5 - py) / pr;
        const d = Math.hypot(dx, dy);
        const edge = 1 + 0.07 * (pnoise(x, y - st.t * 40, 9, 0, 40, SEED + 60) - 0.5) * 2;
        if (d > edge) continue;
        const i = y * W + x;
        // Lit from the upper left, dark underneath; near the fire the underside glows warm instead.
        let val = 0.46 - 0.36 * dy - 0.12 * dx - 0.2 * Math.pow(d, 4) + 0.08 * (pnoise(x, y, 5, 0, 0, SEED + 61) - 0.5);
        if (dy < -0.4 && dx < 0.35 && d > 0.55) val += 0.1;
        if (near > 0.3 && dy > 0.25) val += 0.3 * near * dy;
        if (back) val -= 0.12;
        // A dark crease where a billow overlaps the one behind it.
        if (v[i] > 0 && d > 0.86 && dy > -0.3) val = 0.07;
        v[i] = clamp(val, 0.03, 0.95);
        warm[i] = near;
      }
  };
  for (const p of list) {
    ball(p.x, p.y, p.r, p.warm, p.back);
    // Cauliflower bumps along its top.
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + (k - 1) * 0.95 + rr(SEED + 63, Math.round(p.x * 3 + p.y) + k, -0.2, 0.2);
      const br = p.r * rr(SEED + 64, Math.round(p.x + p.y * 3) + k, 0.42, 0.6);
      const bx = p.x + Math.cos(a) * p.r * 0.72, by = p.y + Math.sin(a) * p.r * 0.72;
      if (by - br < 6 || bx + br > W - 6) continue;
      ball(bx, by, br, p.warm, p.back);
    }
  }
  const c = new Canvas(W, H);
  const th = [0, 0.12, 0.26, 0.42, 0.58, 0.76];
  for (let i = 0; i < W * H; i++) {
    if (!v[i]) continue;
    let idx = 1;
    for (let k = 1; k < th.length; k++) if (v[i] >= th[k]) idx = k + 1;
    const pal = warm[i] > 0.6 + 0.2 * (pnoise(i % W, (i / W) | 0, 12, 0, 0, SEED + 62) - 0.5) && idx >= 5 ? SMOKE_LIT : SMOKE_HIS;
    c.set(i % W, (i / W) | 0, pal[Math.min(6, idx)]);
  }
  // Outline the silhouette in the darkest smoke.
  const ol: number[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (c.alpha(x, y)) continue;
      if (c.alpha(x + 1, y) || c.alpha(x - 1, y) || c.alpha(x, y + 1) || c.alpha(x, y - 1)) ol.push(x, y);
    }
  for (let i = 0; i < ol.length; i += 2) c.set(ol[i], ol[i + 1], SMOKE_HIS[0]);
  return c;
}

/** His smoke, cut from his picture (with its edges at the frame's top and right roughened). */
let hisSmokeBase: Canvas | null = null;
function hisSmoke(): Canvas {
  if (hisSmokeBase) return hisSmokeBase;
  const pc = refPiece('s_smoke');
  const c = new Canvas(W, H);
  c.draw(pc.c, pc.x, pc.y);
  const src = c.clone();
  const cut = new Uint8Array(W * H);
  const right = Math.min(W - 6, pc.x + pc.c.w - 2);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!c.alpha(x, y)) continue;
      // Near the frame's top and his piece's right edge the smoke ends in round billows.
      const e = Math.min((y - 6) / 34, (right - x) / 70);
      const n = pnoise(x, y, 26, 0, 0, SEED + 66) * 0.7 + pnoise(x, y, 11, 0, 0, SEED + 65) * 0.3;
      if (e < 1 && n > e) {
        c.set(x, y, [0, 0, 0, 0]);
        cut[y * W + x] = 1;
      }
    }
  // No holes inside it: anything cut that is enclosed by smoke goes back.
  const filled = dropCrumbs(fillEnclosed(c, src), 12);
  for (let i = 0; i < W * H; i++) if (filled.px[i * 4 + 3]) cut[i] = 0;
  c.px.set(filled.px);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!c.alpha(x, y)) continue;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < W && y + dy < H && cut[(y + dy) * W + x + dx]);
      if (nb) c.set(x, y, pc.pal[0]);
    }
  hisSmokeBase = c;
  return c;
}
/** His smoke, churning in the loop, rolling up from the caster's end in the surge, thinning away in the fade. */
function hisSmokeLayer(st: SState): Canvas | null {
  if (st.smoke <= 0.01) return null;
  const ph = st.t * TAU;
  let c = displace(hisSmoke(), (x, y) => {
    const n1 = pnoise(x, y, 40, 0, 0, SEED + 67), n2 = pnoise(x, y, 40, 0, 0, SEED + 68);
    return [1.8 * Math.sin(ph + n1 * TAU), 1.4 * Math.cos(ph + n2 * TAU)];
  });
  // Distance along the smoke's diagonal, from the caster's end (0) to the upper right (1).
  const along = (x: number, y: number) => clamp(((x - 150) * 0.75 + (780 - y) * 0.66) / 1100, 0, 1);
  if (st.phase === 'surge' && st.smoke < 1) {
    const out = new Canvas(W, H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const p = c.get(x, y);
        if (p[3] && along(x, y) + 0.12 * pnoise(x, y, 20, 0, 0, SEED + 69) < st.smoke * 1.12) out.set(x, y, p);
      }
    c = out;
  } else if (st.phase === 'fade') {
    // It clears from the caster's end up along its diagonal, its edge ragged in big billows.
    c = dissolve(c, st.smoke / 0.85, (x, y) => clamp((1 - along(x, y)) * 0.86 + pnoise(x, y, 60, 0, 0, SEED + 70) * 0.14, 0, 1), [], SMOKE_HIS[0]).c;
  }
  return c;
}

// --- the scorched, glowing ground ------------------------------------------------------------

function groundLayer(st: SState): Canvas {
  const f = new Field(W, H), char = new Field(W, H);
  const glowK = st.phase === 'fade' ? Math.max(0, 1 - st.dead * 1.1) : smooth(0, 0.5, st.roll);
  const reach = X0 + st.roll * LEN;
  f.region(X0 + 10, GY - halfDepth(LEN) - 14, Math.min(W - 6, reach + 50), GY + halfDepth(LEN) + 44, (x, y) => {
    const d = x - X0, u = d / LEN;
    if (x > reach + 40 * st.roll) return 0;
    // The plane spreads a little in front of the cone's near edge and past its end.
    const near = GY + halfDepth(Math.min(d, LEN)) + 30 * smooth(0.1, 0.6, u);
    const far = GY - halfDepth(Math.min(d, LEN)) - 6;
    if (y < far || y > near) return 0;
    const n = pfbm(x * 0.7, y * 1.6, 14, 2, 0, 0, SEED + 70);
    const edge = smooth(near, near - 26, y) * smooth(reach + 40, reach - 30, x) * smooth(X0 + 10, X0 + 50, x);
    const cracks = Math.abs(pnoise(x * 0.5, y * 1.4, 9, 0, 0, SEED + 71) - 0.5) < 0.07 ? 0.34 : 0;
    const apron = smooth(near - 30, near - 4, y) * 0.35;
    const g = (n - 0.36) * 1.9 * edge + (cracks + apron) * edge;
    if (g > 0.12) return Math.min(0.9, g) * glowK + (st.phase === 'fade' ? 0 : 0.02);
    // Charred patches, which go with the glow as the fire dies (the last fade frame is empty).
    if (st.phase !== 'fade' || st.dead < 0.6) char.put(x, y, edge > 0.2 ? 0.3 : 0);
    return 0;
  });
  const charC = render(char, SMOKE, { th: [0, 0.2], lo: 1, hi: 1, outline: false, alpha: [0, 150] });
  return stack(W, H, charC, f.any() ? render(f, FIRE, { th: TH, hi: 5, outline: false }) : null);
}

// --- the wall of fire ------------------------------------------------------------------------

interface Rows {
  rows: Canvas[];
  bed: Canvas | null;
}
function wallLayers(st: SState): Rows {
  const t = st.t, ph = t * TAU;
  const rowSide = [-1, 0, 1], rowH = [1, 0.84, 0.62], rowHeat = [0.84, 0.93, 1];
  const crestX = X0 + st.roll * LEN;
  const surging = st.roll < 1;
  const deadAt = (x: number) => (st.dead <= 0 ? -1 : st.dead + 0.08 * (pnoise(x, 0, 18, 0, 0, SEED + 80) - 0.5) * 2);
  const heightAt = (x: number, row: number) => {
    const d = x - X0, u = d / LEN;
    if (x > crestX + 2 || d < 0) return 0;
    let h = HMAX * lerp(0.52, 1, Math.pow(Math.min(1, u), 0.75)) * rowH[row];
    if (surging) h *= 1 + 0.25 * smooth(80, 10, crestX - x);
    h *= smooth(12, 60, d);
    const da = deadAt(x);
    return h * st.burn * (da < 0 ? 1 : smooth(da, da + 0.12, u));
  };
  const er = (x: number, y: number) => pfbm(x, y + t * 180, 9, 2, 0, 180, SEED + 81);
  const bodyK = smooth(0.62, 0.85, st.burn);
  const rows = [0, 1, 2].map((row) => {
    const f = new Field(W, H);
    if (bodyK > 0)
      f.region(X0 + 10, 0, Math.min(W - 1, crestX + 8), H - 1, (x, y) => {
        const d = x - X0;
        // (the back and middle rows reach down behind the rows in front, so no base line shows)
        const yg = GY + (row === 2 ? 1 : row === 1 ? 0.85 : 0) * halfDepth(d) + 2 - 3 * pnoise(x, row * 9, 5, 0, 0, SEED + 82);
        if (y > yg) return 0;
        const hFull = heightAt(Math.min(x, crestX), row);
        if (hFull <= 0) return 0;
        const front = Math.sqrt(clamp((crestX + (surging ? 6 : 0) - x + 6 * (pnoise(y, row, 5, 0, 0, SEED + 83) - 0.5)) / (surging ? 22 : 30), 0, 1));
        const hb = hFull * 0.62 * bodyK * (0.72 + 0.5 * pnoise(x - t * 90, row * 40, 14, 90, 0, SEED + 84 + row)) * front;
        if (hb < 10) return 0;
        const u = (yg - y) / hb;
        if (u >= 1 || u < 0) return 0;
        return lerp(rowHeat[row] * 0.88, 0.4, Math.pow(u, 1.1));
      });
    const step = 15;
    for (let x = X0 + 4; x <= crestX + 2; x += step * (row === 1 ? 0.9 : 1)) {
      const jx = x + rr(SEED + row, Math.round(x), -step * 0.3, step * 0.3) + (row === 1 ? step * 0.5 : 0);
      const d = jx - X0;
      if (d < 2 || jx > crestX + 2) continue;
      if (st.burn < 1 && rr(SEED + 90 + row, Math.round(jx), 0, 1) > 0.3 + st.burn * 1.1) continue;
      const scatter = smooth(0, 0.3, st.dead);
      const jit = row === 1 ? rr(SEED + 93 + row, Math.round(jx), -0.45, 0.45) : -rowSide[row] * rr(SEED + 93 + row, Math.round(jx), 0, 0.9);
      const yg = GY + rowSide[row] * halfDepth(d) + jit * halfDepth(d) * scatter;
      const h = heightAt(jx, row) * rr(SEED + 10 + row, Math.round(jx), 0.82, 1.12) * lerp(1, rr(SEED + 96 + row, Math.round(jx), 0.4, 1.3), scatter) * (1 + 0.08 * Math.sin(ph + jx * 0.05));
      if (h < 5) continue;
      const lean = 0.35 * smooth(80, 0, crestX - jx) * (surging ? 1 : 0);
      const wdt = Math.min(17, 5 + h * 0.08);
      tongue(f, [jx, yg - h * 0.42 * (0.4 + 0.6 * bodyK)], -Math.PI / 2 + lean + rr(SEED + 20, Math.round(jx), -0.08, 0.08), h * 0.6, wdt, rowHeat[row] * 0.85, 0.13, ph + jx * 0.07, lean * 0.4);
    }
    erode(f, 0.55, er);
    return f;
  });
  // The burning bed over the footprint, with a hot white line along the front face's foot.
  const bed = new Field(W, H);
  const edge = Math.min(crestX, W - 2);
  bed.region(X0, GY - halfDepth(LEN) - 9, edge, GY + halfDepth(LEN) + 9, (x, y) => {
    const d = x - X0, u = d / LEN;
    if (x > edge - 10 * pnoise(y, 0, 4, 0, 0, SEED + 85) - 4) return 0;
    const hd = halfDepth(d) + 3 + 4 * (pnoise(x, y > GY ? 30 : 0, 9, 0, 0, SEED + 86) - 0.5) * 2;
    if (d < 16 || Math.abs(y - GY) > hd) return 0;
    const n = pnoise(x, y, 6, 0, 0, SEED + 87);
    const da = deadAt(x);
    if (st.dead > 0) {
      const behind = da >= 0 ? smooth(da + 0.15, da - 0.1, u) : 0;
      const cut = 0.62 + st.dead * 0.22 + behind * 0.12;
      if (n < cut) return 0;
      return 0.3 + 0.4 * ((n - cut) / (1 - cut)) * (1 - behind * 0.5);
    }
    const frontLine = y > GY + hd - 3 ? 0.3 : 0;
    const v = (0.42 + 0.3 * pnoise(x, y, 8, 0, 0, SEED + 88) + frontLine) * Math.min(1, st.burn * 1.5);
    return v > 0.12 || n > 0.6 ? Math.max(v, 0.2) : 0;
  });
  const streaks = (x: number, y: number) => (pnoise(x * 0.5, (y + t * 180) * 0.15, 2, 0, 27, SEED + 89) - 0.5) * 0.26;
  return {
    rows: rows.map((f, i) => render(f, FIRE, { th: TH, rim: [1], hi: i === 0 ? 5 : undefined, jitter: streaks })),
    bed: bed.any() ? render(bed, FIRE, { th: TH, hi: 6, rim: [1] }) : null,
  };
}

// --- the dragon ------------------------------------------------------------------------------

interface DragonLayers {
  /** Behind the middle row of flames: the tail, the hump and the neck with the head. */
  back: Canvas;
  /** Between the middle and near rows (unused now: kept for the layer order). */
  mid: Canvas;
  /** In front of everything: the claw and the breath. */
  front: Canvas;
  mouth: Pt;
  edge: Pt[];
}
/**
 * The dragon is the owner's own dragon, cut from his reference image (REF-s-tier-fire-annihilation.jpg)
 * at game scale by art2/vfx-a-extract.py: the flame-tipped tail, the hump, the neck with the head,
 * and the claw, each placed where his picture has it. They move a little (each part bobs on its
 * own, the tail's flame flickers) and their bottoms sink raggedly into the flames.
 */
function dragonLayers(st: SState): DragonLayers {
  const t = st.t, ph = t * TAU;
  const live = st.phase === 'burn' ? 1 : 0.5;
  const part = (name: string, bob: Pt, cutY: number, flick?: { amp: number; baseY: number }) => {
    const pc = refPiece(name);
    let c = pc.c;
    if (flick) c = flicker(c, ph, flick.amp * live, flick.baseY, SEED + name.length);
    if (cutY > 0) c = raggedCut(c, (x) => cutY - pc.y - 8 * pnoise(x + pc.x, 0, 7, 0, 0, SEED + 115) - 3 * Math.sin(ph + x * 0.2));
    const out = new Canvas(W, H);
    out.draw(c, pc.x + Math.round(bob[0]), pc.y + Math.round(bob[1]));
    return out;
  };
  const back = new Canvas(W, H);
  back.draw(part('s_tail', [0, Math.sin(ph) * live], 0, { amp: 2, baseY: 110 }), 0, 0);
  back.draw(part('s_hump', [0, Math.sin(ph + 1.8) * live], 0), 0, 0);
  const headBob: Pt = [Math.sin(ph + 3) * live, 1.5 * Math.sin(ph + 3.4) * live];
  back.draw(part('s_head', headBob, 0), 0, 0);
  const front = new Canvas(W, H);
  front.draw(part('s_claw', [0, 0], 0), 0, 0);
  // Where the breath leaves the mouth (his mouth, mapped to our frame).
  const mouth: Pt = [914 + Math.round(headBob[0]), 456 + Math.round(headBob[1])];
  const mid = new Canvas(W, H);
  if (st.dragon >= 1) return { back, mid, front, mouth, edge: [] };
  // Forming: it rises out of the fire from the bottom up. Fading: it burns away from the bottom
  // up, the head going last; the burning edge runs red, orange, yellow.
  const top = GY - 500, bottom = GY - 130;
  const reach = X0 + st.roll * LEN + 40;
  const key = (x: number, y: number) => {
    // Nothing forms ahead of the wall while it is still rolling out.
    if (st.phase === 'surge' && x > reach) return 1;
    const n = pnoise(x, y, 16, 0, 0, SEED + 110) * 0.55 + pnoise(x, y, 34, 0, 0, SEED + 111) * 0.45;
    const hgt = clamp((bottom - y) / (bottom - top), 0, 1);
    return st.phase === 'fade' ? clamp((1 - hgt) * 0.7 + (n - 0.5) * 0.34 + 0.15, 0, 1) : clamp(hgt * 0.65 + n * 0.35, 0, 1);
  };
  const burn = [FIRE[2], FIRE[3], FIRE[4], FIRE[5]];
  if (st.phase === 'fade') {
    // It dies with the fire: its body sinks with the wall (no night opens under it), darkens
    // to embers, thins from its edges and cools into smoke from the top.
    const k = 1 - st.dragon;
    const sink = (c: Canvas) => dropColumns(c, (x) => wallDrop(st, x), (x) => GY - 60 + 20 * pnoise(x, 0, 9, 0, 0, SEED + 117));
    const parts = [back, front].map((c) => burnOut(sink(c), k, SMOKE_HIS, FIRE[0], SEED + 118, GY - 520, 420));
    const edge: Pt[] = [];
    parts[0].px.forEach((_, i) => {
      if (i % 4 === 3 && parts[0].px[i] && (i >> 2) % 97 === 0) edge.push([(i >> 2) % W, Math.floor((i >> 2) / W)]);
    });
    return { back: parts[0], mid, front: parts[1], mouth, edge };
  }
  const parts = [back, front].map((c) => dissolve(c, st.dragon, key, burn, FIRE[0]));
  return { back: parts[0].c, mid, front: parts[1].c, mouth, edge: parts.flatMap((p) => p.edge) };
}

/** Flames licking up in front of the dragon where its body dives into and rises out of the fire. */
export function collars(st: SState): Canvas | null {
  const k = smooth(0.15, 0.6, st.dragon) * st.burn * (st.phase === 'fade' ? smooth(0.6, 0.85, st.dragon) : 1);
  if (k < 0.05) return null;
  const f = new Field(W, H);
  const ph = st.t * TAU;
  // x ranges of the tail's dive, the hump's two legs and the neck (from his picture).
  const spans: [number, number][] = [[186, 256], [344, 418], [578, 672], [688, 852]];
  spans.forEach(([x0, x1], s) => {
    const n = Math.max(3, Math.round((x1 - x0) / 13));
    for (let j = 0; j < n; j++) {
      const xx = lerp(x0, x1, (j + 0.5) / n) + rr(SEED + 120 + s, j, -4, 4);
      tongue(f, [xx, GY - 104 + rr(SEED + 125 + s, j, -8, 8)], -Math.PI / 2 + rr(SEED + 130 + s, j, -0.25, 0.25), (44 + rr(SEED + 135 + s, j, 0, 30)) * k, rr(SEED + 136 + s, j, 7, 11) * Math.min(1, 0.4 + k), 0.9, 0.16, ph + j * 1.7 + s, rr(SEED + 137 + s, j, -0.2, 0.2));
    }
  });
  erode(f, 0.45, (x, y) => pfbm(x, y + st.t * 180, 9, 2, 0, 180, SEED + 140));
  return render(f, FIRE, { th: TH, rim: [1] });
}

/**
 * The breath: his jet of fire, cut from his picture, roaring out of the mouth and off the frame's
 * leading edge. It churns (pixels sway along and across it) and grows out of the mouth in the surge.
 */
function breathJet(st: SState, mouth: Pt): { c: Canvas; sparks: { x: number; y: number; s: number }[] } | null {
  if (st.jet <= 0.02) return null;
  const ph = st.t * TAU;
  const pc = refPiece('s_breath');
  const reach = Math.min(1, st.jet * 1.2) * (pc.c.w + 20);
  const moved = displace(pc.c, (x, y) => [Math.round(2 * Math.sin(y * 0.3 - ph * 2) + (x / pc.c.w) * 2 * Math.sin(ph + y * 0.1)), Math.round(2 * Math.sin(x * 0.2 - ph * 3) * (x / pc.c.w))]);
  const c = new Canvas(W, H);
  const dx = mouth[0] - 914, dy = mouth[1] - 456;
  for (let y = 0; y < pc.c.h; y++)
    for (let x = 0; x < Math.min(pc.c.w, reach); x++) {
      const p = moved.get(x, y);
      if (p[3]) c.set(pc.x + x + dx, pc.y + y + dy, p);
    }
  const sparks: { x: number; y: number; s: number }[] = [];
  const L = (W - mouth[0]) * Math.min(1, st.jet * 1.2);
  for (let k = 0; k < 18; k++) {
    const u = fract(k / 18 + st.t * 2);
    const along = 30 + u * L, across = rr(SEED + 155, k, -1, 1) * lerp(16, 60, u);
    sparks.push({ x: mouth[0] + along, y: mouth[1] + 6 + along * 0.18 + across, s: u < 0.4 ? 2 : 1 });
  }
  return { c, sparks };
}

// --- one frame ---------------------------------------------------------------------------------

/** His fire wall, cut as one opaque mass (only the night sky keyed out), its left end roughened at the frame edge. */
let hisWallBase: Canvas | null = null;
function hisWall(): Canvas {
  if (hisWallBase) return hisWallBase;
  const pc = refPiece('s_wall');
  const c = new Canvas(W, H);
  c.draw(pc.c, pc.x, pc.y);
  hisWallBase = roughen(c, (x, y) => x < 6 + 8 * pnoise(0, y, 5, 0, 0, SEED + 90), pc.pal[0]);
  return hisWallBase;
}
/**
 * His fire wall in time. burn: his flames flicker upward (pixels sway more the higher above the
 * ground they are; the mass itself never opens). surge: it rolls out from the caster with a
 * burning front and grows to full height. fade: it sinks and darkens to embers, dying back from
 * the caster outward along a ragged burning edge, until the last frame is almost empty.
 */
function hisWallLayer(st: SState): Canvas | null {
  const ph = st.t * TAU;
  let c = flicker(hisWall(), ph, 1.6, GY + 40, SEED + 91);
  if (st.phase !== 'fade') {
    const sy = lerp(0.72, 1, smooth(0.75, 1, st.burn));
    if (sy < 0.999) c = scaled(c, 1, sy, 0, GY + 60);
  } else {
    c = sinkColumns(c, (x) => wallH(st, x), wallBottoms());
    c = dim(c, lerp(0.35, 1, st.burn));
  }
  const burn = [FIRE[2], FIRE[3], FIRE[4], FIRE[5]];
  if (st.phase === 'surge' && st.roll < 1) {
    const reach = X0 + st.roll * (LEN + 60);
    // (the front is ragged along its height only, so it never punches holes into the mass)
    const frontAt = (y: number) => reach + 26 * (pnoise(0, y, 18, 0, 0, SEED + 92) - 0.5) * 2 + 8 * (pnoise(0, y, 5, 0, 0, SEED + 95) - 0.5) * 2;
    c = dissolve(c, 1, (x, y) => (x > frontAt(y) ? 2 : 0), burn, FIRE[0]).c;
    // A burning front where it is rolling out.
    const front = new Canvas(W, H);
    for (let y = 0; y < H; y++)
      for (let x = Math.max(0, Math.floor(reach - 70)); x < Math.min(W, reach + 40); x++) {
        const p = c.get(x, y);
        const fx = frontAt(y);
        if (p[3] && x > fx - 12) front.set(x, y, burn[Math.max(0, Math.min(3, 3 - Math.floor((fx - x) / 4)))]);
      }
    c = stack(W, H, c, front);
  }
  return c;
}
/** The wall's column bottoms (its glowing ground's lower edge), computed once. */
let wallBottomsCache: Int32Array | null = null;
function wallBottoms(): Int32Array {
  return (wallBottomsCache ??= columnBottoms(hisWall()));
}
/**
 * How much of each wall column still stands in the fade (1 = full height): the fire burns down
 * from the caster outward and toward the far end, every tongue at its own pace, so the dying
 * front is a row of uneven flames sinking into embers rather than a cut.
 */
function wallH(st: SState, x: number): number {
  const front = X0 + st.dead * (LEN + 120) - 40;
  const tongue = 0.55 + 0.9 * pnoise(x, 0, 7, 0, 0, SEED + 96) * pnoise(x, 3, 19, 0, 0, SEED + 97);
  const behind = smooth(front - 90, front + 50, x);
  const end = smooth(W - 120 + 40 * pnoise(0, x, 9, 0, 0, SEED + 98), W - 300, x + (1 - st.burn) * 200);
  return clamp(lerp(0.3, 1, st.burn) * behind * Math.min(1, end + 0.25 * st.burn) * Math.min(1, tongue * (1.3 - 0.3 * st.burn)), 0, 1);
}
/** How far the top of each wall column has sunk (px), for the dragon to sink with it. */
function wallDrop(st: SState, x: number): number {
  const col = Math.max(0, Math.min(W - 1, Math.round(x)));
  const yb = wallBottoms()[col];
  if (yb < 0) return 0;
  // Smoothed over the columns so the body bends rather than shears.
  let h = 0;
  for (let k = -12; k <= 12; k += 4) h += wallHsmooth(st, x + k);
  h /= 7;
  return (1 - h) * Math.max(0, yb - (GY - 330));
}
function wallHsmooth(st: SState, x: number): number {
  const front = X0 + st.dead * (LEN + 120) - 40;
  return clamp(lerp(0.3, 1, st.burn) * smooth(front - 90, front + 50, x), 0, 1);
}

export function sFrame(st: SState): Canvas {
  const t = st.t, ph = t * TAU;
  const smoke = hisSmokeLayer(st);
  const hisWallC = hisWallLayer(st);
  const dr = st.dragon > 0.01 ? dragonLayers(st) : null;
  // The kanji, written stroke by stroke and burning away at the end.
  const kj = kanjiFire(W, H, SBOX, st.kanji, st.kanjiVis, t, SEED);
  const kanjiC = kj.c, hot = kj.hot;
  const jet = dr ? breathJet(st, dr.mouth) : null;
  // His picture's order: smoke, the dragon's tail, hump and neck rising out of the fire, his fire
  // wall in front of their roots, the claw gripping over the wall, the kanji and the breath.
  const layers: (Canvas | null)[] = [smoke];
  if (dr) layers.push(dr.back, dr.mid);
  layers.push(hisWallC);
  if (dr) layers.push(dr.front);
  layers.push(kanjiC, jet ? jet.c : null);
  const body = stack(W, H, ...layers);
  // Sparks everywhere: off the wall, the kanji, the dragon and the jet; they die with the fire.
  const em: { x: number; y: number; s: number }[] = [];
  const nE = Math.round(70 * clamp(st.burn * 1.3, 0, 1));
  for (let k = 0; k < nE; k++) {
    const p = fract((k / Math.max(1, nE)) * 3 + t);
    const x = X0 + rr(SEED + 170, k, 0.05, 1) * Math.min(st.roll, 1) * LEN;
    const d = x - X0;
    if (st.dead > 0 && d < st.dead * LEN) continue;
    const top = GY - halfDepth(d) - HMAX * lerp(0.52, 1, Math.pow(d / LEN, 0.75)) * 0.6 * st.burn;
    em.push({ x: x + Math.sin(p * 6 + k) * 4, y: top - p * 200, s: p < 0.3 ? 2 : 1 });
  }
  hot.forEach(([x, y], k) => {
    const p = fract(k * 0.37 + t);
    em.push({ x: x + Math.sin(ph + k) * 5, y: y - 8 - p * 40, s: p < 0.4 ? 2 : 1 });
  });
  if (dr) dr.edge.forEach(([x, y], k) => k % 2 === 0 && em.push({ x: x + rr(SEED + 175, k, -6, 6), y: y - rr(SEED + 176, k, 4, 16), s: 1 }));
  if (jet) em.push(...jet.sparks);
  return stack(W, H, body, embers(W, H, em.filter((e) => e.x > 3 && e.x < W - 4 && e.y > 3 && e.y < H - 4)));
}

/** The surge, burn and fade schedules (8, 6 and 6 frames). */
export function sStates(): Record<'surge' | 'burn' | 'fade', SState[]> {
  const n = (k: number) => Array.from({ length: k }, (_, i) => i);
  const ease = (u: number) => 1 - Math.pow(1 - clamp(u, 0, 1), 1.6);
  return {
    surge: n(8).map((i) => ({
      roll: ease((i + 1) / 6), burn: lerp(0.75, 1, i / 7), dead: 0, smoke: smooth(0.5, 7, i), dragon: smooth(1.6, 6.6, i),
      kanji: kanjiSurge(i),
      kanjiVis: 1, jet: clamp((i - 5.4) / 1.8, 0, 1), phase: 'surge' as const, t: i / 8,
    })),
    burn: n(6).map((i) => ({ roll: 1, burn: 1, dead: 0, smoke: 1, dragon: 1, kanji: [1, 1, 1, 1], kanjiVis: 1, jet: 1, phase: 'burn' as const, t: i / 6 })),
    fade: n(6).map((i) => ({
      roll: 1, burn: [0.8, 0.58, 0.38, 0.2, 0.08, 0][i], dead: [0.1, 0.3, 0.5, 0.7, 0.88, 1][i], smoke: [0.85, 0.65, 0.45, 0.26, 0.1, 0][i],
      dragon: [0.85, 0.62, 0.4, 0.2, 0.06, 0][i], kanji: [1, 1, 1, 1], kanjiVis: KANJI_FADE[i], jet: [0.55, 0.15, 0, 0, 0, 0][i],
      phase: 'fade' as const, t: i / 6,
    })),
  };
}

/** The S-rank enhanced annihilation sprite (anchor at the caster's feet, facing right). */
export function annihilationS(): WorldSprite {
  const st = sStates();
  return vfxSprite('annihilation_enh', 'Great Fire Annihilation, enhanced S-rank (15 m cone, dragon, kanji)', [X0, GY], {
    surge: { frames: st.surge.map(sFrame), fps: 12, loop: false },
    burn: { frames: st.burn.map(sFrame), fps: 12, loop: true },
    fade: { frames: st.fade.map(sFrame), fps: 12, loop: false },
  });
}

export const S_FRAME = { W, H, X0, GY };
