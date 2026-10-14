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
import { DRAGON_TILT, dragonHead, dragonLeg, serpentBody, spline } from './vfx-a-fire-dragon';
import { Field, Pt, TAU, bez, clamp, dissolve, fract, lerp, palette, pfbm, pnoise, render, rr, smooth, stack, vfxSprite } from './vfx-a-lib';

/** Cool smoke for the tops of the billows, away from the fire. */
const SMOKE_COOL = palette('#121019', '#24212b', '#38333d', '#4f4851', '#675e66', '#82787e', '#a0969a');

const PX = 57;
const W = 1016, H = 912, X0 = 12, GY = 780;
const LEN = Math.round(15 * PX);
const HMAX = 270;
const SEED = 1900;
const halfDepth = (d: number) => 5 + 0.1 * d;

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

const KX = 250, KY = 92, KW = 350, KH = 300;
const K = (x: number, y: number): Pt => [KX + x * KW, KY + y * KH];
/** The four strokes in writing order: left dot, right dot, the long fall to the left, the sweep to the right. */
const STROKES: { pts: Pt[]; w: (u: number) => number }[] = [
  { pts: bez(K(0.33, 0.25), K(0.24, 0.32), K(0.15, 0.42), K(0.17, 0.53), 24), w: (u) => lerp(0.006, 0.05, Math.pow(u, 0.7)) * (u > 0.85 ? 1 - (u - 0.85) * 2 : 1) },
  { pts: bez(K(0.8, 0.17), K(0.7, 0.3), K(0.6, 0.42), K(0.53, 0.49), 26), w: (u) => lerp(0.006, 0.055, Math.pow(u, 0.7)) * (u > 0.85 ? 1 - (u - 0.85) * 2 : 1) },
  { pts: bez(K(0.43, 0.02), K(0.47, 0.42), K(0.37, 0.72), K(0.02, 0.98), 48), w: (u) => (0.03 + 0.035 * Math.sin(Math.PI * Math.min(1, u * 1.4))) * Math.pow(1 - u, 0.35) + 0.004 },
  { pts: bez(K(0.45, 0.47), K(0.53, 0.68), K(0.72, 0.86), K(0.99, 0.93), 44), w: (u) => lerp(0.018, 0.068, smooth(0, 0.86, u)) * (u > 0.9 ? Math.max(0.15, (1 - u) / 0.1) : 1) + 0.004 },
];

/** Writes the kanji into `f` (heat) and returns its hottest points for sparks. */
function kanji(f: Field, prog: number[], t: number): Pt[] {
  const ph = t * TAU;
  const hot: Pt[] = [];
  STROKES.forEach((st, si) => {
    const p = prog[si];
    if (p <= 0) return;
    const n = Math.max(2, Math.round(st.pts.length * p));
    const pts = st.pts.slice(0, n);
    const w = (u: number) => st.w(u * (n - 1) / (st.pts.length - 1)) * KW * 1.45;
    // The stroke: a white-hot core inside licking edges.
    f.path(pts, (u) => w(u) * (1 + 0.14 * Math.sin(ph * 2 + u * 9 + si)), (u) => 1.04 - 0.1 * u, 1.35);
    // Flames rising off the stroke, and a bright brush head while it is being written.
    for (let k = 1; k < n - 1; k += 2) {
      const [x, y] = pts[k];
      const r = w(k / (n - 1));
      if (r < 3) continue;
      const len = r * 2.2 + 8 + 5 * Math.sin(ph + k + si * 2);
      tongue(f, [x + rr(SEED + si, k, -3, 3), y - r * 0.3], -Math.PI / 2 + rr(SEED + 10 + si, k, -0.4, 0.4), len, r * 0.62, 0.72, 0.24, ph + k * 0.7 + si, rr(SEED + 20 + si, k, -0.25, 0.25));
      if (k % 4 === 1) hot.push([x, y - r]);
    }
    if (p < 1) {
      const [hx, hy] = pts[n - 1];
      f.disc(hx, hy, Math.max(5, w(1) * 1.3), 1.05, 1.4);
      for (let k = 0; k < 6; k++) hot.push([hx + rr(SEED + 30, k + si * 6, -10, 10), hy + rr(SEED + 31, k + si * 6, -10, 6)]);
    }
  });
  erode(f, 0.85, (x, y) => pfbm(x, y + t * 90, 7, 2, 0, 90, SEED + 40));
  return hot;
}

// --- smoke: billowing volumes up to the upper right --------------------------------------------

interface Puff { x: number; y: number; r: number; back: boolean; warm: number }
/** The smoke's billows for this frame: a broad diagonal mass rolling up and right from behind the wall, with loose puffs breaking off its top. */
function puffs(st: SState): Puff[] {
  const out: Puff[] = [];
  const ph = st.t * TAU;
  const a: Pt = [190, GY - 170], b: Pt = [905, 150];
  const n = 130;
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
    out.push({ x: Math.min(x, W - r * 1.2 - 8), y: Math.max(y, r * 1.5 + 8), r, back: g < -0.1, warm: smooth(GY - 470, GY - 230, y) });
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
    const pal = warm[i] > 0.45 + 0.2 * (pnoise(i % W, (i / W) | 0, 12, 0, 0, SEED + 62) - 0.5) ? SMOKE : SMOKE_COOL;
    c.set(i % W, (i / W) | 0, pal[Math.min(6, idx)]);
  }
  // Outline the silhouette in the darkest smoke.
  const ol: number[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (c.alpha(x, y)) continue;
      if (c.alpha(x + 1, y) || c.alpha(x - 1, y) || c.alpha(x, y + 1) || c.alpha(x, y - 1)) ol.push(x, y);
    }
  for (let i = 0; i < ol.length; i += 2) c.set(ol[i], ol[i + 1], SMOKE[0]);
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
    char.put(x, y, edge > 0.2 ? 0.3 : 0);
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
    let h = HMAX * lerp(0.42, 1, Math.pow(Math.min(1, u), 0.75)) * rowH[row];
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
        const yg = GY + rowSide[row] * halfDepth(d) + 2 - 3 * pnoise(x, row * 9, 5, 0, 0, SEED + 82);
        if (y > yg) return 0;
        const hFull = heightAt(Math.min(x, crestX), row);
        if (hFull <= 0) return 0;
        const front = Math.sqrt(clamp((crestX + (surging ? 6 : 0) - x + 6 * (pnoise(y, row, 5, 0, 0, SEED + 83) - 0.5)) / (surging ? 22 : 30), 0, 1));
        const hb = hFull * 0.62 * bodyK * (0.82 + 0.3 * pnoise(x - t * 90, row * 40, 22, 90, 0, SEED + 84 + row)) * front;
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

/** The body's path from the tail tip to the neck's end, undulating with the loop. */
function bodyPath(st: SState): Pt[] {
  const ph = st.t * TAU;
  const wob = (k: number) => (st.phase === 'burn' ? 1 : 0.6) * Math.sin(ph + k * 0.9);
  const P: Pt[] = [
    [205, GY - 345], [236, GY - 300], [262, GY - 228], [290, GY - 140], [338, GY - 118],
    [382, GY - 210], [444, GY - 300], [520, GY - 334], [590, GY - 300], [628, GY - 214],
    [655, GY - 132], [694, GY - 170], [706, GY - 270], [714, GY - 352],
  ];
  return spline(P.map(([x, y], k) => [x + wob(k) * 3, y + wob(k + 2) * 6] as Pt), 8);
}
const radius = (u: number) => lerp(5, 19, Math.pow(smooth(0, 0.55, u), 0.8)) * (u > 0.9 ? lerp(1, 0.92, (u - 0.9) / 0.1) : 1);

interface DragonLayers {
  /** Behind the middle row of flames (the tail and the dive). */
  back: Canvas;
  /** Between the middle and near rows (the arch). */
  mid: Canvas;
  /** In front of everything (the neck, the legs, the head). */
  front: Canvas;
  mouth: Pt;
  edge: Pt[];
}
function dragonLayers(st: SState): DragonLayers {
  const t = st.t, ph = t * TAU;
  const pts = bodyPath(st);
  // The tail and the dive are behind the near flames, the arch between the rows, the neck in front.
  const [back, mid, neck] = serpentBody(W, H, pts, radius, [[0, 0.3], [0.29, 0.73], [0.72, 1]], t, SEED + 100);
  const head = dragonHead(2.0, t, 6 + (st.phase === 'burn' ? 2 * Math.sin(ph * 2) : 0), DRAGON_TILT * 0.4, true);
  const joint = pts[pts.length - 1];
  const dx = Math.round(joint[0] - head.joint[0]), dy = Math.round(joint[1] - head.joint[1]);
  const front = new Canvas(W, H);
  // The hind leg grips out of the flames under the arch; the foreleg reaches down at the front.
  const hind = dragonLeg(W, H, [396, GY - 210], [414, GY - 160], [446, GY - 150], 11, t, 3);
  const fore = dragonLeg(W, H, [702, GY - 236], [752, GY - 204], [790, GY - 168], 13, t, 7);
  const midC = new Canvas(W, H);
  midC.draw(hind, 0, 0);
  midC.draw(mid, 0, 0);
  front.draw(head.back, dx, dy);
  front.draw(neck, 0, 0);
  front.draw(fore, 0, 0);
  front.draw(head.front, dx, dy);
  const mouth: Pt = [head.mouth[0] + dx, head.mouth[1] + dy];
  if (st.dragon >= 1) return { back, mid: midC, front, mouth, edge: [] };
  // Forming: it rises out of the fire from the bottom up. Fading: it burns away from the bottom
  // up, the head going last; the burning edge runs red, orange, yellow.
  const top = GY - 560, bottom = GY - 80;
  const key = (x: number, y: number) => {
    const n = pnoise(x, y, 16, 0, 0, SEED + 110) * 0.55 + pnoise(x, y, 34, 0, 0, SEED + 111) * 0.45;
    const hgt = clamp((bottom - y) / (bottom - top), 0, 1);
    return st.phase === 'fade' ? clamp((1 - hgt) * 0.7 + (n - 0.5) * 0.34 + 0.15, 0, 1) : clamp(hgt * 0.65 + n * 0.35, 0, 1);
  };
  const burn = [FIRE[2], FIRE[3], FIRE[4], FIRE[5]];
  const parts = [back, midC, front].map((c) => dissolve(c, st.dragon, key, burn, FIRE[0]));
  return { back: parts[0].c, mid: parts[1].c, front: parts[2].c, mouth, edge: parts.flatMap((p) => p.edge) };
}

/** Flames wrapped round the body where it dives into and rises out of the fire (unused: the rows of flames do it). */
export function collars(st: SState): Canvas | null {
  const k = smooth(0.15, 0.6, st.dragon) * st.burn * (st.phase === 'fade' ? smooth(0.6, 0.85, st.dragon) : 1);
  if (k < 0.05) return null;
  const f = new Field(W, H);
  const ph = st.t * TAU;
  const spots: [number, number, number][] = [[676, GY - 118, 5]];
  spots.forEach(([x, y, n], s) => {
    for (let j = 0; j < n; j++) {
      const xx = x - 26 + j * 13 + rr(SEED + 120 + s, j, -5, 5);
      tongue(f, [xx, y + 30 + rr(SEED + 125 + s, j, -14, 14)], -Math.PI / 2 + rr(SEED + 130 + s, j, -0.3, 0.3), (30 + rr(SEED + 135 + s, j, 0, 40)) * k, rr(SEED + 136 + s, j, 6, 10) * Math.min(1, 0.4 + k), 0.9, 0.16, ph + j * 1.7 + s, rr(SEED + 137 + s, j, -0.2, 0.2));
    }
  });
  erode(f, 0.45, (x, y) => pfbm(x, y + st.t * 180, 9, 2, 0, 180, SEED + 140));
  return render(f, FIRE, { th: TH, rim: [1] });
}

/** The jet of fire out of the dragon's mouth, roaring off the frame's leading edge. */
function breathJet(st: SState, mouth: Pt): { c: Canvas; sparks: { x: number; y: number; s: number }[] } | null {
  if (st.jet <= 0.02) return null;
  const f = new Field(W + 80, H);
  const ph = st.t * TAU;
  const a = 0.1;
  const L = (W + 60 - mouth[0]) * Math.min(1, st.jet * 1.2);
  const ca = Math.cos(a), sa = Math.sin(a);
  f.region(mouth[0] - 6, mouth[1] - 80, Math.min(W + 79, mouth[0] + L + 10), mouth[1] + 90, (x, y) => {
    const dx = x - mouth[0], dy = y - mouth[1];
    const along = dx * ca + dy * sa, across = -dx * sa + dy * ca;
    if (along < -4 || along > L) return 0;
    const u = along / Math.max(1, L);
    const half = lerp(9, 58, Math.pow(u, 0.75)) * (1 + 0.28 * (pnoise(along - st.t * 240, across, 10, 240, 0, SEED + 150) - 0.5) * 2);
    const q = Math.abs(across) / half;
    if (q >= 1) return 0;
    const flick = pnoise(along * 0.5 - st.t * 240, across * 1.5, 6, 120, 0, SEED + 151);
    return (1.05 - 0.55 * Math.pow(q, 1.4) - 0.25 * u) * (0.85 + 0.25 * flick) * (u > 0.85 ? smooth(1, 0.85, u) * 0.5 + 0.5 : 1);
  });
  // Licks of flame tearing off its edges.
  for (let k = 0; k < 10; k++) {
    const u = fract(k / 10 + st.t);
    const along = u * L, side = k % 2 ? 1 : -1;
    const half = lerp(9, 58, Math.pow(u, 0.75));
    const bx = mouth[0] + along * ca - side * half * 0.8 * sa, by = mouth[1] + along * sa + side * half * 0.8 * ca;
    tongue(f, [bx, by], a + side * 0.9, 16 + 10 * u, 5, 0.66, 0.2, ph + k, side * 0.2);
  }
  erode(f, 0.6, (x, y) => pfbm(x - st.t * 240, y, 8, 2, 240, 0, SEED + 152));
  const full = render(f, FIRE, { th: TH, rim: [1] });
  const c = new Canvas(W, H);
  c.draw(full, 0, 0);
  const sparks: { x: number; y: number; s: number }[] = [];
  for (let k = 0; k < 18; k++) {
    const u = fract(k / 18 + st.t * 2);
    const along = 30 + u * L, across = rr(SEED + 155, k, -1, 1) * lerp(20, 70, u);
    sparks.push({ x: mouth[0] + along * ca - across * sa, y: mouth[1] + along * sa + across * ca, s: u < 0.4 ? 2 : 1 });
  }
  void ph;
  return { c, sparks };
}

// --- one frame ---------------------------------------------------------------------------------

export function sFrame(st: SState): Canvas {
  const t = st.t, ph = t * TAU;
  const smoke = st.smoke > 0 ? smokeLayer(st) : null;
  const ground = groundLayer(st);
  const wall = wallLayers(st);
  const dr = st.dragon > 0.01 ? dragonLayers(st) : null;
  // The kanji, written stroke by stroke and burning away at the end.
  let kanjiC: Canvas | null = null;
  let hot: Pt[] = [];
  if (st.kanji.some((p) => p > 0) && st.kanjiVis > 0) {
    const kf = new Field(W, H);
    hot = kanji(kf, st.kanji, t);
    kanjiC = render(kf, FIRE, { th: TH, rim: [1] });
    if (st.kanjiVis < 1) {
      const key = (x: number, y: number) => clamp(pnoise(x, y, 18, 0, 0, SEED + 160) * 0.7 + ((y - KY) / KH) * 0.3, 0, 1);
      const dz = dissolve(kanjiC, st.kanjiVis, key, [FIRE[2], FIRE[3], FIRE[4], FIRE[5]], FIRE[0]);
      kanjiC = dz.c;
      hot = hot.filter((_, i) => i % 2 === 0).concat(dz.edge.filter((_, i) => i % 3 === 0));
    }
  }
  const jet = dr ? breathJet(st, dr.mouth) : null;
  const layers: (Canvas | null)[] = [ground, smoke, wall.bed, wall.rows[0]];
  if (dr) layers.push(dr.back);
  layers.push(wall.rows[1]);
  if (dr) layers.push(dr.mid);
  layers.push(wall.rows[2]);
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
    const top = GY - halfDepth(d) - HMAX * lerp(0.42, 1, Math.pow(d / LEN, 0.75)) * 0.6 * st.burn;
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
      kanji: [clamp((i - 2.5) / 1, 0, 1), clamp((i - 3.5) / 1, 0, 1), clamp((i - 4) / 1.5, 0, 1), clamp((i - 5) / 1.6, 0, 1)].map((p) => (p > 0 && p < 0.25 ? 0.25 : p)),
      kanjiVis: 1, jet: clamp((i - 5.4) / 1.8, 0, 1), phase: 'surge' as const, t: i / 8,
    })),
    burn: n(6).map((i) => ({ roll: 1, burn: 1, dead: 0, smoke: 1, dragon: 1, kanji: [1, 1, 1, 1], kanjiVis: 1, jet: 1, phase: 'burn' as const, t: i / 6 })),
    fade: n(6).map((i) => ({
      roll: 1, burn: [0.8, 0.58, 0.38, 0.2, 0.08, 0][i], dead: [0.1, 0.3, 0.5, 0.7, 0.88, 1][i], smoke: [0.85, 0.65, 0.45, 0.26, 0.1, 0][i],
      dragon: [0.85, 0.62, 0.4, 0.2, 0.06, 0][i], kanji: [1, 1, 1, 1], kanjiVis: [0.82, 0.58, 0.36, 0.17, 0.05, 0][i], jet: [0.55, 0.15, 0, 0, 0, 0][i],
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
