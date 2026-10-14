// Water jutsu VFX: lit liquid forms instead of radial heat. Bodies are shaded like tubes and
// balls (light from the upper left, a bright line along the lit edge, deep navy underneath), with
// white foam, round droplets, hollow bubbles and, for the cold side, faceted ice shards.
// Palette: navy outline, deep blue, deep teal, cyan, light cyan, pale aqua, white.

import { Canvas, Color, WorldSprite, withAlpha } from './kit';
import {
  Field, Pt, TAU, arc, bez, clamp, crop, dist, flySprite, frames, fract, glint, lerp, outlineIn, palette, pnoise, qbez, render, rr, seamStack, smooth, stack, vfxSprite,
} from './vfx-a-lib';

export const WATER = palette('#0a1640', '#123f78', '#1670a6', '#22a6d6', '#62d6f0', '#b8f2f8', '#ffffff');
/** Foam: cyan shadow, light cyan, pale aqua, white (outlined in navy). */
const FOAM: Color[] = [WATER[0], WATER[3], WATER[4], WATER[5], WATER[6]];
/** Ice for the cold side: a colder, greyer blue ramp. */
const ICE = palette('#0c1a48', '#1d4f86', '#3d8fc4', '#8fd4ee', '#c8f0fa', '#eafcff', '#ffffff');
const TH = [0, 0.2, 0.38, 0.56, 0.76, 0.9];
const FOAM_TH = [0, 0.3, 0.55, 0.78];

/** Flow lines: band edges stretched along x, scrolled by s (periodic over `per` px). */
const flowW = (s: number, amp = 0.09, per = 64, seed = 7) => (x: number, y: number) => (pnoise((x - s) * 0.2, y, 1.6, per * 0.2, 0, seed) - 0.5) * 2 * amp;

/**
 * A shaded tube along a polyline. shade(u, s) gets the position along the path (0..1) and the
 * signed offset across it (-1..1, positive on the path's left-hand normal: up for a path running
 * left, right for a path running up).
 */
function tube(f: Field, pts: Pt[], r: (u: number) => number, shade: (u: number, s: number) => number): void {
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + dist(pts[i - 1], pts[i]));
  const total = L[L.length - 1] || 1;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy, len = Math.sqrt(L2) || 1;
    const R = Math.max(r(L[i] / total), r(L[i + 1] / total)) + 1;
    f.region(Math.min(x0, x1) - R, Math.min(y0, y1) - R, Math.max(x0, x1) + R, Math.max(y0, y1) + R, (x, y) => {
      const t = L2 ? clamp(((x - x0) * dx + (y - y0) * dy) / L2, 0, 1) : 0;
      const u = (L[i] + (L[i + 1] - L[i]) * t) / total;
      const rr_ = r(u);
      if (rr_ <= 0) return 0;
      const ox = x - (x0 + dx * t), oy = y - (y0 + dy * t);
      const d = Math.hypot(ox, oy);
      if (d >= rr_) return 0;
      const s = (ox * -dy + oy * dx) / len / rr_;
      return Math.max(0.03, shade(u, clamp(s, -1, 1)));
    });
  }
}
/** Standard water shading across a tube: lit edge (s = +1) light cyan, a highlight line, navy underside. */
const liquid = (base = 0.45, hl = true) => (_u: number, s: number) => {
  const v = -s;
  return base - 0.27 * v - 0.08 * v * v + (hl && v > -0.74 && v < -0.42 ? 0.22 : 0);
};

/** A lit ball (top-left light) with a white glint. */
function ball(f: Field, cx: number, cy: number, r: number, base = 0.42, glintOn = true): void {
  f.region(cx - r, cy - r, cx + r, cy + r, (x, y) => {
    const u = (x - cx) / r, v = (y - cy) / r, d2 = u * u + v * v;
    if (d2 >= 1) return 0;
    const nz = Math.sqrt(1 - d2);
    let h = base + 0.32 * (-0.55 * u - 0.7 * v) + 0.12 * nz;
    if (d2 > 0.62 && u + v > 0.55) h = Math.max(h, 0.62);
    if (glintOn && (u + 0.38) ** 2 + (v + 0.42) ** 2 < 0.05) h = 0.97;
    return Math.max(0.04, h);
  });
}

/** A droplet moving toward angle `a`: a lit ball with a tapering tail behind it. */
function drop(f: Field, x: number, y: number, r: number, a: number, tail = 2.2): void {
  if (r < 1.2) {
    f.put(x, y, 0.7);
    return;
  }
  const bx = x - Math.cos(a) * r * tail, by = y - Math.sin(a) * r * tail;
  f.seg(bx, by, x, y, 0.5, r * 0.92, 0.56, 0.6, 0.4);
  ball(f, x, y, r, 0.42, r >= 2.5);
}

/** Hollow bubbles: a pale ring with a see-through middle and a white glint (own outline). */
function bubbles(w: number, h: number, list: { x: number; y: number; r: number }[], pal: Color[] = WATER): Canvas {
  const c = new Canvas(w, h);
  for (const b of list) {
    const r = b.r;
    if (r < 2) {
      const x = Math.round(b.x), y = Math.round(b.y);
      c.set(x, y, pal[6]);
      c.set(x + 1, y, pal[4]);
      c.set(x, y + 1, pal[4]);
      c.set(x + 1, y + 1, pal[3]);
      continue;
    }
    for (let y = Math.floor(b.y - r - 1); y <= Math.ceil(b.y + r + 1); y++)
      for (let x = Math.floor(b.x - r - 1); x <= Math.ceil(b.x + r + 1); x++) {
        const d = Math.hypot(x + 0.5 - b.x, y + 0.5 - b.y);
        if (d > r) continue;
        if (d > r - 1) c.set(x, y, pal[4]);
        else c.set(x, y, withAlpha(pal[5], 70));
      }
    if (r >= 2) c.set(Math.round(b.x - r * 0.45), Math.round(b.y - r * 0.45), pal[6]);
  }
  outlineIn(c, pal[0], { minAlpha: 100 });
  return c;
}

/** Foam layer: white blobs shaded with cyan, outlined in navy. */
const foamR = (f: Field) => render(f, FOAM, { th: FOAM_TH, rim: [1] });
const waterR = (f: Field, s = 0, jitter = true) => render(f, WATER, { th: TH, rim: [1], jitter: jitter ? flowW(s) : undefined });

/** Thin speed lines in pale aqua. */
function speedLines(c: Canvas, list: [number, number, number][]): void {
  for (const [x, y, len] of list)
    for (let k = 0; k < len; k++) c.plot(x - k, y, withAlpha(k < len * 0.4 ? WATER[5] : WATER[4], k < len * 0.4 ? 230 : 150));
}

// --- bolt: a water bullet with a corkscrew wake ---------------------------------------------

function bolt(): WorldSprite {
  const W = 64, H = 64, cx = 38, cy = 32;
  const fr = frames(4, (t) => {
    const wake = new Field(W, H), ring = new Field(W, H), head = new Field(W, H), dr = new Field(W, H);
    const tailPts = qbez([cx, cy], [cx - 16, cy + 2], [cx - 34, cy - 1], 16);
    tube(wake, tailPts, (u) => lerp(9.8, 1.4, Math.pow(u, 0.7)), liquid(0.42));
    // Crescents of spray shed by the bullet, drifting back and opening up.
    for (let k = 0; k < 2; k++) {
      const p = fract(k / 2 + t);
      const x = cx - 12 - p * 22, h = 11 + p * 5;
      tube(ring, arc(x + 6, cy, 6 + p * 2, h, Math.PI * 0.62, Math.PI * 1.38, 12), (u) => (2.6 - p * 0.9) * Math.sin(Math.PI * u) + 0.5, (_u, s) => 0.8 + 0.15 * s - p * 0.12);
    }
    ball(head, cx, cy, 11.5, 0.44);
    // Droplets shed behind, falling.
    for (let k = 0; k < 3; k++) {
      const p = fract(k / 3 + t);
      drop(dr, cx - 16 - p * 26, cy + [-9, 8, 12][k] + p * p * 8, k === 1 ? 2.4 : 1.6, Math.PI - 0.25, 1.6);
    }
    const wakeC = render(wake, WATER, { th: TH, rim: [1], jitter: flowW(-t * 64, 0.12) });
    // A white twist line spiralling along the wake.
    for (let j = 0; j <= 60; j++) {
      const u = j / 60;
      const ph = u * 9 - t * TAU;
      if (Math.cos(ph) < 0.1) continue;
      const pt = tailPts[Math.round(u * 16)];
      const r = lerp(9.8, 1.4, Math.pow(u, 0.7)) - 1.8;
      if (r < 1) continue;
      const x = Math.round(cx - u * 34), y = Math.round(pt[1] + Math.sin(ph) * r);
      if (wakeC.alpha(x, y)) wakeC.set(x, y, WATER[u < 0.5 ? 6 : 5]);
    }
    const c = stack(W, H, render(ring, WATER, { th: TH, rim: [1] }), wakeC, render(dr, WATER, { th: TH }), render(head, WATER, { th: TH, rim: [1] }));
    speedLines(c, [[cx - 12, cy - 14, 9], [cx - 16, cy + 13, 7]]);
    return stack(W, H, c, bubbles(W, H, [{ x: cx - 30 - fract(t) * 6, y: cy - 6, r: 1.5 }]));
  });
  return flySprite('bolt', 'Water bolt (water bullet)', fr);
}

// --- beast: a serpentine water dragon -------------------------------------------------------
//
// 128 x 80, 6-frame swim: a wave runs back along the body while the head stays put. Parts are
// drawn separately and stacked with light seams: far fins, tail fan, body (lit back, pale belly
// plates), dorsal fins of foam, a clawed foreleg, the head (snout, open jaw with fangs, horns,
// whiskers, a glinting eye) and spray.

function beast(): WorldSprite {
  const W = 128, H = 80;
  const N = 56;
  const fr = frames(6, (t) => {
    const ph = t * TAU;
    const parts: (Canvas | null)[] = [];
    const look = { th: TH, rim: [1], outline: false };
    // The spine: a wave travelling back toward the tail; the neck and head stay put.
    const spine: Pt[] = [];
    for (let k = 0; k <= N; k++) {
      const u = k / N;
      const A = 12 * smooth(0.02, 0.32, u) * (1 - 0.3 * u);
      spine.push([lerp(92, 6, u), 42 + A * Math.sin(u * 1.35 * TAU - ph + 0.7) + smooth(0, 0.2, u) * 3 - (1 - smooth(0, 0.1, u)) * 6]);
    }
    const rad = (u: number) => (u < 0.06 ? lerp(9, 11, u / 0.06) : lerp(11, 1.6, Math.pow((u - 0.06) / 0.94, 0.8)));
    const frame = (u: number) => {
      const i = Math.min(N - 1, Math.round(u * N));
      const p = spine[i], q = spine[i + 1];
      const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
      return { p, d: [dx / l, dy / l] as Pt, up: [-dy / l, dx / l] as Pt };
    };
    // Tail fan of water.
    const tf = new Field(W, H);
    const tp = spine[N], tq = spine[N - 3];
    const ta = Math.atan2(tp[1] - tq[1], tp[0] - tq[0]);
    for (let k = -1; k <= 1; k++) {
      const a = ta + k * 0.55 + Math.sin(ph + k) * 0.08;
      tf.path([[tp[0] + 2, tp[1]], [tp[0] + Math.cos(a) * 10, tp[1] + Math.sin(a) * 10]], (u) => lerp(2.2, 3.4, Math.sin(u * Math.PI)), (u) => lerp(0.5, 0.75, u));
    }
    parts.push(render(tf, FOAM, { th: FOAM_TH, rim: [1], outline: false }));
    // Dorsal fins of foam along the back, swept toward the tail (behind the body).
    const fins = new Field(W, H);
    for (let k = 0; k < 9; k++) {
      const u = 0.08 + k * 0.085;
      const { p, d, up } = frame(u);
      const r = rad(u);
      const b: Pt = [p[0] + up[0] * (r - 2.5), p[1] + up[1] * (r - 2.5)];
      const hgt = (12 - k * 0.9) * (1 + 0.1 * Math.sin(ph * 2 + k));
      const tip: Pt = [b[0] + d[0] * 9 + up[0] * hgt, b[1] + d[1] * 9 + up[1] * hgt];
      fins.poly([[b[0] - d[0] * 6, b[1] - d[1] * 6], tip, [b[0] + d[0] * 4, b[1] + d[1] * 4]], (x, y) => 0.35 + 0.6 * (1 - Math.hypot(x - tip[0], y - tip[1]) / 15));
    }
    parts.push(render(fins, FOAM, { th: FOAM_TH, rim: [1], outline: false }));
    // A clawed foreleg reaching forward under the chest (behind the body).
    const leg = new Field(W, H);
    const { p: lp } = frame(0.12);
    const knee: Pt = [lp[0] + 2, lp[1] + 13 + Math.sin(ph) * 1];
    const paw: Pt = [knee[0] + 9, knee[1] + 2];
    leg.path([[lp[0] - 3, lp[1] + 5], knee, paw], (u) => lerp(3.6, 2.4, u), (u) => lerp(0.62, 0.7, u));
    for (let k = 0; k < 3; k++) leg.path([paw, [paw[0] + 4 + k * 0.5, paw[1] - 2 + k * 2.5]], (u) => lerp(1.4, 0.6, u), 0.85);
    parts.push(render(leg, WATER, look));
    // The body: lit along the back, a pale belly with plate seams, flowing streaks.
    const body = new Field(W, H);
    tube(body, spine, rad, (u, s) => {
      const v = -s;
      if (v > 0.38) {
        const plate = fract(u * 26) < 0.16 ? -0.2 : 0;
        return 0.66 - (v - 0.38) * 0.45 + plate;
      }
      return 0.48 - 0.28 * v - 0.06 * v * v + (v > -0.78 && v < -0.5 ? 0.22 : 0);
    });
    parts.push(render(body, WATER, { ...look, jitter: (x, y) => flowW(-t * 128, 0.08, 128)(x, y) }));
    // The head: skull and snout, an open lower jaw, horns and whiskers.
    const hx = 98, hy = 33;
    const jaw = new Field(W, H);
    jaw.poly([[hx - 4, hy + 6], [hx + 16, hy + 10], [hx + 24, hy + 13], [hx + 21, hy + 16], [hx + 2, hy + 13], [hx - 6, hy + 11]], (_x, y) => 0.66 - (y - hy - 10) * 0.05);
    parts.push(render(jaw, WATER, look));
    const mouth = new Canvas(W, H);
    const mf = new Field(W, H);
    mf.poly([[hx - 2, hy + 4], [hx + 14, hy + 4], [hx + 10, hy + 11], [hx - 3, hy + 8]], 1);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mf.at(x, y)) mouth.set(x, y, WATER[0]);
    parts.push(mouth);
    const head = new Field(W, H);
    head.poly([[hx - 13, hy + 4], [hx - 11, hy - 6], [hx - 4, hy - 10], [hx + 4, hy - 9], [hx + 12, hy - 6], [hx + 22, hy - 4], [hx + 27, hy - 2], [hx + 27, hy + 2], [hx + 20, hy + 4], [hx + 6, hy + 5], [hx - 4, hy + 8], [hx - 12, hy + 8]], (x, y) => {
      const v = (y - hy + 2) / 10;
      return 0.6 - 0.25 * v + (y < hy - 6 && x < hx + 14 ? 0.2 : 0);
    });
    parts.push(render(head, WATER, look));
    // Horns swept back and a frilled cheek of foam.
    const horn = new Field(W, H);
    horn.path([[hx - 3, hy - 8], [hx - 13, hy - 14], [hx - 24, hy - 16], [hx - 33, hy - 13]], (u) => lerp(3.2, 1, u), (u) => lerp(0.85, 0.6, u));
    horn.path([[hx + 1, hy - 8], [hx - 7, hy - 16], [hx - 17, hy - 21], [hx - 28, hy - 21]], (u) => lerp(3, 0.9, u), (u) => lerp(0.95, 0.65, u));
    horn.path([[hx - 10, hy - 17], [hx - 12, hy - 24], [hx - 16, hy - 28]], (u) => lerp(2, 0.7, u), 0.85);
    for (let k = 0; k < 2; k++) horn.path([[hx - 10, hy + 2 + k * 3], [hx - 19 - k * 2, hy + k * 6], [hx - 27 - k * 3, hy - 1 + k * 9]], (u) => lerp(3, 0.8, u), 0.7);
    parts.push(render(horn, FOAM, { th: FOAM_TH, rim: [1], outline: false }));
    // Whiskers flowing back from the snout.
    const wh = new Field(W, H);
    wh.path([[hx + 24, hy + 1], [hx + 26, hy + 8], [hx + 22, hy + 16 + Math.sin(ph) * 1.5], [hx + 14, hy + 22 + Math.cos(ph) * 2], [hx + 4, hy + 24 + Math.sin(ph + 1) * 2]], (u) => lerp(1.3, 0.6, u), 0.85);
    parts.push(render(wh, FOAM, { th: FOAM_TH, outline: false }));
    const all = seamStack(W, H, parts, WATER[1], WATER[0]);
    // Fangs, eye and nostril.
    for (const fx of [hx + 2, hx + 7, hx + 12, hx + 17]) {
      all.set(fx, hy + 5, WATER[6]);
      all.set(fx, hy + 6, WATER[5]);
    }
    for (const fx of [hx + 4, hx + 10]) all.set(fx, hy + 9, WATER[6]);
    all.set(hx + 2, hy - 5, WATER[0]);
    all.set(hx + 3, hy - 5, WATER[0]);
    all.set(hx + 4, hy - 5, WATER[0]);
    all.set(hx + 2, hy - 4, WATER[0]);
    all.set(hx + 3, hy - 4, WATER[6]);
    all.set(hx + 4, hy - 4, WATER[0]);
    all.set(hx + 24, hy - 2, WATER[0]);
    // Spray shed from the body.
    const dr = new Field(W, H);
    for (let k = 0; k < 7; k++) {
      const p = fract(k / 7 + t);
      const sp = spine[Math.round(lerp(10, 44, rr(11, k, 0, 1)))];
      drop(dr, sp[0] - p * 12, sp[1] - 19 - p * 6 + p * p * 14, k % 2 ? 1.6 : 2.4, Math.PI + 0.4, 1.4);
    }
    return stack(W, H, all, render(dr, WATER, { th: TH }));
  });
  return flySprite('beast', 'Water beast (water dragon)', fr);
}

// --- stream: a tileable torrent + a splash-burst head ---------------------------------------

const TOR_Y = 32;
const torC = (x: number, s: number) => TOR_Y + (pnoise(x - s, 5, 32, 64, 0, 201) - 0.5) * 4;
const torR = (x: number, s: number) => 9.5 + 3 * pnoise(x - s, 9, 16, 64, 0, 203);
function torrent(f: Field, s: number, x0: number, x1: number, ox: number): void {
  f.region(x0, 0, x1, f.h - 1, (x, y) => {
    const xx = x - ox;
    const v = (y - torC(xx, s)) / torR(xx, s);
    if (Math.abs(v) >= 1) return 0;
    const hl = v > -0.74 && v < -0.46 && pnoise(xx - s, 0, 8, 64, 0, 205) > 0.42 ? 0.22 : 0;
    return 0.45 - 0.27 * v - 0.08 * v * v + hl;
  });
}
function torrentFoam(f: Field, s: number, ox: number, x0: number, x1: number): void {
  // Curling foam crests riding the top edge.
  for (let k = 0; k < 2; k++)
    for (const rep of [-64, 0, 64]) {
      const bx = fract((k * 32 + 6 + s) / 64) * 64 + rep;
      if (bx + ox < x0 - 20 || bx + ox > x1 + 20) continue;
      const top = torC(bx, s) - torR(bx, s);
      const lip = bez([bx - 12, top + 2], [bx - 4, top - 4], [bx + 4, top - 5], [bx + 7, top - 1], 12);
      f.path(lip.map(([x, y]) => [x + ox, y] as Pt), (u) => lerp(1.8, 3, Math.sin(u * Math.PI)), (u) => lerp(0.5, 0.95, u));
      f.disc(bx + ox + 7, top, 2.6, 0.8);
      f.disc(bx + ox - 6, top + 1, 2.4, 0.6);
    }
}
function stream(): WorldSprite[] {
  const W = 64, H = 64, PAD = 32;
  const tile = frames(4, (t) => {
    const s = t * 64;
    const w = new Field(W + PAD * 2, H), fo = new Field(W + PAD * 2, H), dr = new Field(W + PAD * 2, H);
    torrent(w, s, 0, W + PAD * 2 - 1, PAD);
    torrentFoam(fo, s, PAD, 0, W + PAD * 2);
    for (let k = 0; k < 3; k++)
      for (const rep of [-64, 0, 64]) {
        const x = fract((k * 21 + 3 + s) / 64) * 64 + rep + PAD;
        const up = k !== 1;
        drop(dr, x, TOR_Y + (up ? -1 : 1) * rr(207, k, 15, 19), k === 2 ? 1.6 : 2.2, up ? -0.4 : 0.35, 1.6);
      }
    const bl: { x: number; y: number; r: number }[] = [];
    for (let k = 0; k < 2; k++) for (const rep of [-64, 0, 64]) bl.push({ x: fract((k * 32 + 20 + s) / 64) * 64 + rep + PAD, y: TOR_Y + (k ? 3 : -2), r: k ? 2.5 : 1.5 });
    const c = stack(W + PAD * 2, H, render(w, WATER, { th: TH, rim: [1], jitter: (x, y) => flowW(s)(x - PAD, y) }), bubbles(W + PAD * 2, H, bl), foamR(fo), render(dr, WATER, { th: TH }));
    return crop(c, PAD, 0, W, H);
  });
  const head = frames(4, (t) => {
    const s = t * 64;
    const w = new Field(W + PAD, H), fo = new Field(W + PAD, H), dr = new Field(W + PAD, H);
    torrent(w, s, 0, PAD + 26, PAD);
    // The torrent swells into a frothing front that bursts into spray.
    const hx = PAD + 32;
    ball(w, hx, TOR_Y, 14, 0.44, false);
    ball(w, hx + 8, TOR_Y - 5, 9, 0.48, false);
    ball(w, hx + 8, TOR_Y + 6, 8, 0.4, false);
    const fl = (k: number) => Math.sin(t * TAU + k * 1.7);
    for (let k = 0; k < 6; k++) {
      const a = -1.05 + (k * 2.1) / 5;
      fo.disc(hx + 4 + Math.cos(a) * 12, TOR_Y + Math.sin(a) * 13, 4.2 + fl(k) * 0.7, 0.85, 1.4);
    }
    fo.disc(hx + 15, TOR_Y - 1, 4, 0.9);
    for (let k = 0; k < 9; k++) {
      const p = fract(k / 9 + t);
      const a = rr(211, k, -1.2, 1.2);
      const d = 17 + p * 12;
      drop(dr, hx + 4 + Math.cos(a) * d, TOR_Y + Math.sin(a) * d * 1.05, lerp(2.6, 1.4, p), a, 1.8);
    }
    const c = stack(W + PAD, H, render(w, WATER, { th: TH, rim: [1], jitter: (x, y) => flowW(s)(x - PAD, y) * (x < hx - 6 ? 1 : 0.3) }), foamR(fo), render(dr, WATER, { th: TH }));
    return crop(c, PAD, 0, W, H);
  });
  return [flySprite('stream', 'Water stream (torrent, tileable 64 px)', tile), flySprite('stream_head', 'Water stream head', head)];
}

// --- breath: a high-pressure spray cone -----------------------------------------------------

function breath(): WorldSprite {
  const W = 96, H = 64, oy = 32;
  const fr = frames(4, (t) => {
    const jets = new Field(W, H), dr = new Field(W, H), fo = new Field(W, H);
    const lanes = [-0.36, -0.24, -0.12, 0, 0.12, 0.24, 0.36];
    lanes.forEach((a, j) => {
      const solid = 44 + rr(221, j, 0, 12) - Math.abs(a) * 26;
      const pts: Pt[] = [];
      for (let k = 0; k <= 12; k++) {
        const d = 2 + (solid * k) / 12;
        pts.push([d * Math.cos(a), oy + d * Math.sin(a) + Math.sin(d * 0.2 + t * TAU + j) * 0.8]);
      }
      tube(jets, pts, (u) => lerp(2.6, 4.2, u), liquid(0.5));
      // Foam where the jet breaks up, and long droplets flying on.
      const end = pts[pts.length - 1];
      fo.disc(end[0] + 1, end[1], 2.4 + Math.sin(t * TAU + j * 2) * 0.5, 0.85);
      for (let k = 0; k < 3; k++) {
        const p = fract(k / 3 + t + j * 0.13);
        const d = solid + 6 + p * 34;
        if (d > 90) continue;
        drop(dr, d * Math.cos(a) + 2, oy + d * Math.sin(a) * 1.05, lerp(2.6, 1.5, p), a, 3.2);
      }
    });
    // The mouth: a white core of pressure.
    jets.poly([[0, oy - 2.5], [14, oy - 6], [14, oy + 6], [0, oy + 2.5]], (x, y) => 0.98 - Math.abs(y - oy) * 0.06 - x * 0.01);
    const c = stack(W, H, render(jets, WATER, { th: TH, rim: [1] }), foamR(fo), render(dr, WATER, { th: TH }));
    const bl: { x: number; y: number; r: number }[] = [];
    for (let k = 0; k < 2; k++) {
      const p = fract(k / 2 + t);
      bl.push({ x: 26 + p * 40, y: oy + (k ? 9 : -10) * (0.6 + p), r: k ? 1.5 : 2.5 });
    }
    return stack(W, H, c, bubbles(W, H, bl));
  });
  return flySprite('breath', 'Water breath (spray cone, origin left middle)', fr);
}

// --- sphere: a water bomb with a whirlpool inside -------------------------------------------

function sphere(): WorldSprite {
  const W = 64, H = 64, cx = 33, cy = 32, R = 20;
  const fr = frames(4, (t) => {
    const f = new Field(W, H), ringB = new Field(W, H), ringF = new Field(W, H);
    f.region(cx - R, cy - R, cx + R, cy + R, (x, y) => {
      const u = (x - cx) / R, v = (y - cy) / R, d2 = u * u + v * v;
      if (d2 >= 1) return 0;
      const r = Math.sqrt(d2), a = Math.atan2(v, u);
      // Whirlpool: spiral bands turning inward.
      const sw = Math.sin(a * 2 + r * 10 + t * TAU);
      let h = 0.38 + 0.16 * (-0.5 * u - 0.6 * v) + 0.17 * sw * smooth(0.12, 0.35, r) * (1 - smooth(0.75, 0.95, r)) + 0.24 * (1 - smooth(0, 0.3, r));
      if (d2 > 0.6 && u + v > 0.62) h = Math.max(h, 0.66);
      return Math.max(0.05, h);
    });
    const body = render(f, WATER, { th: TH, rim: [1, 2] });
    // Specular crescent and a glint.
    for (let k = 0; k <= 14; k++) {
      const a = Math.PI * (1.08 + (0.38 * k) / 14);
      for (const rr_ of [0.72, 0.78]) body.set(Math.round(cx + Math.cos(a) * R * rr_), Math.round(cy + Math.sin(a) * R * rr_), k > 2 && k < 12 ? WATER[6] : WATER[5]);
    }
    body.set(cx - 4, cy - 12, WATER[6]);
    body.set(cx - 3, cy - 12, WATER[5]);
    // Droplets orbiting on a tilted ring: behind first, in front last.
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * TAU + t * TAU * (2 / 7) * 3.5 / 3.5;
      const p = arc(cx, cy, 29, 8, a, a, 1, -0.35)[0];
      drop(Math.sin(a) < 0 ? ringB : ringF, p[0], p[1], k % 2 ? 1.8 : 2.5, a + Math.PI / 2 - 0.35, 1.8);
    }
    const bl: { x: number; y: number; r: number }[] = [];
    for (let k = 0; k < 4; k++) {
      const p = fract(k / 4 + t);
      bl.push({ x: cx + rr(231, k, -9, 9), y: cy + 10 - p * 20, r: k % 2 ? 1.5 : 2.5 });
    }
    return stack(W, H, render(ringB, WATER, { th: TH, hi: 4 }), body, bubbles(W, H, bl), render(ringF, WATER, { th: TH }));
  });
  return flySprite('sphere', 'Water sphere (water bomb)', fr);
}

// --- slash: a curling crest wave ------------------------------------------------------------

function slash(): WorldSprite {
  const W = 64, H = 64;
  const fr = frames(4, (t) => {
    const w = new Field(W, H), fo = new Field(W, H), dr = new Field(W, H);
    // The wave climbs from the bottom tip, bulges forward and curls over at the top.
    const pts = bez([20, 60], [50, 48], [52, 18], [34, 8], 26).concat(bez([34, 8], [28, 5], [24, 9], [27, 14], 8).slice(1));
    const rad = (u: number) => (u < 0.55 ? lerp(1.5, 10, Math.sin((u / 0.55) * Math.PI * 0.5)) : lerp(10, 2, (u - 0.55) / 0.45));
    tube(w, pts, rad, (u, s) => 0.42 + 0.28 * s + (s > 0.45 && s < 0.75 ? 0.2 : 0) - 0.05 * (1 - u));
    // Foam riding the leading edge and the lip.
    for (let k = 0; k < 15; k++) {
      const u = 0.24 + k * 0.046;
      const i = Math.round(u * (pts.length - 1));
      const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)];
      const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
      const n: Pt = [-dy / l, dx / l];
      const r = rad(u);
      fo.disc(p[0] + n[0] * (r - 1.5), p[1] + n[1] * (r - 1.5), rr(244, k, 1.8, 3.2) + Math.sin(t * TAU + k * 1.3) * 0.5 + (k > 9 ? 0.7 : 0), 0.85, 1.4);
    }
    // Spray thrown forward off the lip and droplets shed behind.
    for (let k = 0; k < 7; k++) {
      const p = fract(k / 7 + t);
      if (k < 4) drop(dr, 40 + p * 18, 8 + rr(241, k, -4, 8) + p * p * 10, lerp(2.4, 1.4, p), 0.4, 1.6);
      else drop(dr, 28 - p * 18, 30 + rr(242, k, -14, 16), lerp(2, 1.2, p), Math.PI, 1.6);
    }
    const c = stack(W, H, render(w, WATER, { th: TH, rim: [1], jitter: (x, y) => (pnoise(x * 0.5 + y * 0.6, (y - x * 0.3) * 0.25 - t * 16, 1.6, 0, 0, 243) - 0.5) * 0.16 }), foamR(fo), render(dr, WATER, { th: TH }));
    speedLines(c, [[16, 22, 10], [12, 40, 8], [18, 50, 6]]);
    return c;
  });
  return flySprite('slash', 'Water slash (curling crest wave)', fr);
}

// --- multi: ice shards in a staggered fan ---------------------------------------------------

function shard(c: Canvas, x: number, y: number, len: number, w: number, a: number, glintAt: number): void {
  const f = new Field(c.w, c.h);
  const ca = Math.cos(a), sa = Math.sin(a);
  const P = (l: number, q: number): Pt => [x + l * ca - q * sa, y + l * sa + q * ca];
  const poly: Pt[] = [P(len / 2, 0), P(len / 2 - w * 1.6, -w), P(-len / 2 + 1, -w * 0.8), P(-len / 2 - 1.5, -w * 0.2), P(-len / 2, w * 0.6), P(len / 2 - w * 1.6, w)];
  f.poly(poly, (px, py) => {
    const dx = px - x, dy = py - y;
    const l = dx * ca + dy * sa, q = -dx * sa + dy * ca;
    let h = q < -w * 0.18 ? 0.74 : q < w * 0.18 ? 0.86 : 0.36;
    if (l < -len / 2 + 3) h -= 0.18;
    if (Math.abs(q) < w * 0.18 && Math.abs(l - glintAt * len * 0.5) < 2) h = 0.97;
    return h;
  });
  c.draw(render(f, ICE, { th: [0, 0.22, 0.4, 0.6, 0.8, 0.92], rim: [2] }), 0, 0);
}
function multi(): WorldSprite {
  const W = 64, H = 64;
  const shards = [
    { a: -0.38, d: 42, len: 22, w: 4.4 },
    { a: -0.12, d: 50, len: 26, w: 5 },
    { a: 0.13, d: 36, len: 21, w: 4.2 },
    { a: 0.38, d: 45, len: 23, w: 4.6 },
  ].map((s) => ({ ...s, x: Math.cos(s.a) * s.d + 2, y: 32 + Math.sin(s.a) * s.d }));
  const fr = frames(4, (t) => {
    const trail = new Canvas(W, H), c = new Canvas(W, H), sp = new Canvas(W, H);
    shards.forEach((s, k) => {
      // A frosty trail of pale mist behind each shard.
      for (let j = 0; j < 14; j++) {
        const l = -s.len / 2 - 2 - j;
        const px = s.x + Math.cos(s.a) * l, py = s.y + Math.sin(s.a) * l;
        const half = Math.max(0, 1.6 - j * 0.1);
        for (let q = -half; q <= half; q += 1) trail.plot(Math.round(px - Math.sin(s.a) * q), Math.round(py + Math.cos(s.a) * q), withAlpha(ICE[j < 5 ? 5 : 4], j < 5 ? 150 : 90));
      }
      shard(c, s.x, s.y, s.len, s.w, s.a, lerp(-0.8, 0.8, fract(t + k * 0.3)));
      // Sparkles of frost.
      const p = fract(t + k / 4);
      glint(sp, s.x - s.len / 2 - 5 - p * 10, s.y + (k % 2 ? 4 : -4), p < 0.5 ? 2 : 1, ICE);
    });
    return stack(W, H, trail, c, sp);
  });
  return flySprite('multi', 'Water multi (ice shards)', fr);
}

// --- hit: a splash --------------------------------------------------------------------------

function hit(): WorldSprite {
  const W = 64, H = 64, cx = 32, cy = 32;
  const fr = frames(6, (_, i) => {
    const w = new Field(W, H), fo = new Field(W, H), dr = new Field(W, H), ring = new Field(W, H);
    const N = 8;
    if (i === 0) {
      ball(w, cx, cy, 8, 0.52);
      fo.ell(cx, cy, 12, 4, 0, 0.85);
      fo.ell(cx, cy, 4, 11, 0, 0.75);
    }
    // Petals: thick jets of water bursting out radially, breaking into droplets at their tips.
    const petal = [0, 9, 15, 0, 0, 0][i];
    if (petal > 0) {
      for (let k = 0; k < N; k++) {
        const a = (k / N) * TAU + 0.2 + rr(250, k, -0.12, 0.12);
        const L = petal * rr(251, k, 0.8, 1.2);
        const r0 = i <= 2 ? 6 : 9;
        const pts: Pt[] = [];
        const bend = (k % 2 ? 1 : -1) * L * 0.22;
        for (let j = 0; j <= 6; j++) {
          const u = j / 6, d = r0 + L * u;
          const side = Math.sin(u * Math.PI * 0.5) * bend * u;
          pts.push([cx + Math.cos(a) * d - Math.sin(a) * side, cy + Math.sin(a) * d + Math.cos(a) * side + u * u * (i >= 3 ? 5 : 2)]);
        }
        tube(w, pts, (u) => lerp(i <= 2 ? 5 : 3, i <= 2 ? 3 : 1.6, u), (u, sgn) => 0.5 + 0.2 * sgn + (u > 0.7 ? 0.15 : 0));
        const tip = pts[pts.length - 1];
        if (i <= 3) fo.disc(tip[0], tip[1], i <= 2 ? 2.8 : 2.2, 0.85);
      }
      if (i <= 2) {
        ball(w, cx, cy, i === 1 ? 10 : 8, 0.46, false);
        fo.disc(cx - 2, cy - 2, i === 1 ? 5 : 4, 0.8);
      }
    }
    // Droplets thrown off, arcing down.
    if (i >= 2) {
      const p = (i - 1) / 4;
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * TAU + rr(252, k, -0.2, 0.2);
        const d = (k % 2 ? 12 + 16 * p : 18 + 20 * p) * rr(253, k, 0.85, 1.15);
        drop(dr, cx + Math.cos(a) * d, cy + Math.sin(a) * d + p * p * 14, lerp(k % 2 ? 2.4 : 3.2, 1.3, p) * rr(254, k, 0.8, 1.1), a + p * 0.6, 2);
      }
    }
    if (i === 3) for (let k = 0; k < 6; k++) fo.disc(cx + Math.cos(k * 1.05) * 6, cy + Math.sin(k * 1.05) * 6, 2.6, 0.75);
    // A ring wave spreading out.
    if (i >= 1 && i <= 3) {
      const rk = 11 + i * 6;
      ring.region(0, 0, W - 1, H - 1, (x, y) => {
        const d = Math.abs(Math.hypot(x - cx, (y - cy) * 1.1) - rk);
        return d < 0.9 ? 0.8 : 0;
      });
    }
    const ringC = ring.any() ? render(ring, WATER, { th: TH, lo: 5, hi: 5, outline: false, alpha: [0, 0, 0, 0, 0, i === 3 ? 90 : 150, 0] }) : null;
    const bl: { x: number; y: number; r: number }[] = [];
    if (i >= 4) for (let k = 0; k < 4; k++) bl.push({ x: cx + rr(257, k, -12, 12), y: cy + rr(258, k, -10, 10) - (i - 4) * 4, r: k % 2 ? 1.5 : 2.5 });
    return stack(W, H, ringC, render(w, WATER, { th: TH, rim: [1] }), foamR(fo), render(dr, WATER, { th: TH }), bubbles(W, H, bl));
  });
  return vfxSprite('hit', 'Water hit (splash)', [32, 32], { hit: { frames: fr, fps: 12, loop: false } });
}

// --- blast: a geyser erupting from the ground -----------------------------------------------

function ripple(back: Field, front: Field, cx: number, gy: number, rx: number, ry: number, heat: number): void {
  for (const f of [back, front])
    f.region(cx - rx - 3, gy - ry - 3, cx + rx + 3, gy + ry + 3, (x, y) => {
      if ((f === back) !== y < gy) return 0;
      const r = Math.hypot((x - cx) / rx, (y - gy) / ry);
      const d = Math.abs(r - 1) * ry;
      return d < 1.7 ? heat * (1 - d / 3) : 0;
    });
}
function blast(): WorldSprite {
  const W = 176, H = 128, cx = 88, gy = 72, RX = 82, RY = 54;
  const fr = frames(8, (_, i) => {
    const back = new Field(W, H), front = new Field(W, H), col = new Field(W, H), fo = new Field(W, H), foF = new Field(W, H), dr = new Field(W, H), pud = new Field(W, H);
    // Ripples racing out over the ground ellipse.
    const rings = [[0.22], [0.42, 0.18], [0.62, 0.36], [0.84, 0.56, 0.3], [1, 0.74, 0.5], [1, 0.9, 0.64], [0.98, 0.8], [0.9]][i];
    rings.forEach((k, j) => ripple(back, front, cx, gy, RX * k, RY * k, j === 0 ? 0.86 : 0.7));
    // The leading ripple breaks into foam.
    if (i >= 1 && i <= 5) {
      const k = rings[0];
      for (let q = 0; q < 22; q++) {
        const a = (q / 22) * TAU + i * 0.3;
        const x = cx + Math.cos(a) * RX * k, y = gy + Math.sin(a) * RY * k;
        (Math.sin(a) < 0 ? fo : foF).disc(x, y - 1, rr(268, q + i * 22, 1.6, 3) * (i === 5 ? 0.7 : 1), 0.8, 1.4);
      }
    }
    if (i >= 5) pud.ell(cx, gy, RX * 0.6, RY * 0.6, 0, 0.5, 4);
    // The column of water.
    const top = [0, 36, 8, 4, 22, 48, 0, 0][i];
    const rC = [0, 7, 11, 13, 12, 10, 0, 0][i];
    if (i === 0) {
      ball(col, cx, gy - 2, 14, 0.42, false);
      col.cut((_x, y) => y > gy + 4);
      foF.ell(cx, gy + 2, 16, 4, 0, 0.8);
    }
    if (top > 0) {
      const pts: Pt[] = [];
      for (let k = 0; k <= 12; k++) {
        const y = lerp(gy + 4, top + rC * 0.6, k / 12);
        pts.push([cx + Math.sin(k * 0.9 + i) * 1.2, y]);
      }
      tube(col, pts, (u) => rC * lerp(1.25, 0.9, u), (_u, s) => 0.48 + 0.26 * s + (s > 0.4 && s < 0.7 ? 0.2 : 0));
      // Foam skirt at the base and a crown of spray at the top.
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI + Math.PI;
        (Math.sin(a) < -0.3 ? fo : foF).disc(cx + Math.cos(a) * (rC + 6), gy + 2 + Math.sin(a) * -4, 4, 0.8);
      }
      for (let k = 0; k < 5; k++) foF.disc(cx + Math.cos(Math.PI + (k / 4) * Math.PI) * (rC + 5), gy + 3, 3.5, 0.75);
      const crownR = [0, 6, 13, 18, 14, 9][i];
      for (let k = 0; k < 7; k++) {
        const a = Math.PI + (k / 6) * Math.PI;
        fo.disc(cx + Math.cos(a) * crownR, top + 4 + Math.sin(a) * crownR * 0.5, lerp(5, 3.5, Math.abs(k - 3) / 3), 0.88);
      }
      fo.disc(cx, top + 2, rC * 0.7, 0.95);
    }
    // Droplets arcing out of the crown and falling.
    if (i >= 2 && i <= 6) {
      const tt = (i - 1.5) / 5;
      for (let k = 0; k < 16; k++) {
        const vx = rr(261, k, -1, 1) * 80, vy = -rr(262, k, 20, 70);
        const x = cx + vx * tt, y = 12 + vy * tt + 180 * tt * tt;
        if (y > gy + RY * 0.7 || y < 1) continue;
        drop(dr, x, y, k % 3 ? 2 : 2.8, Math.atan2(vy + 360 * tt, vx), 1.8);
      }
    }
    // Splash crowns where droplets land.
    if (i >= 5 && i <= 6)
      for (let k = 0; k < 6; k++) {
        const a = rr(263, k, 0, TAU), rk = rr(264, k, 0.3, 0.85);
        const x = cx + Math.cos(a) * RX * rk, y = gy + Math.sin(a) * RY * rk;
        (y < gy ? fo : foF).ell(x, y - 1, 3.5, 2, 0, 0.75);
      }
    const bl: { x: number; y: number; r: number }[] = [];
    if (i >= 6) for (let k = 0; k < 6; k++) bl.push({ x: cx + rr(265, k, -50, 50), y: gy + rr(266, k, -26, 26) - (i - 6) * 3, r: k % 2 ? 1.5 : 2.5 });
    return stack(W, H,
      pud.any() ? render(pud, WATER, { th: [0, 0.3], lo: 2, hi: 3, outline: false, alpha: [0, 0, 60, 75, 0, 0, 0] }) : null,
      render(back, WATER, { th: TH, lo: 3, hi: 5 }),
      col.any() ? render(col, WATER, { th: TH, rim: [1], jitter: (x, y) => (pnoise(x, (y + i * 9) * 0.25, 1.6, 0, 0, 267) - 0.5) * 0.16 }) : null,
      fo.any() ? foamR(fo) : null,
      render(front, WATER, { th: TH, lo: 3, hi: 5 }),
      foF.any() ? foamR(foF) : null,
      render(dr, WATER, { th: TH }),
      bubbles(W, H, bl));
  });
  return vfxSprite('blast', 'Water blast (geyser, 3 m)', [cx, gy], { blast: { frames: fr, fps: 12, loop: false } });
}

// --- wall: a standing sheet of water 4.5 m long ---------------------------------------------

function wallFrame(t: number, g: number, W: number, H: number, gy: number): Canvas {
  const w = new Field(W, H), fo = new Field(W, H), dr = new Field(W, H);
  const ph = t * TAU;
  const topAt = (x: number) => {
    const env = Math.pow(Math.sin(((x - 4) / (W - 8)) * Math.PI), 0.25);
    return gy - (96 * env + 4 * Math.sin(x * 0.07 - ph) + 3 * Math.sin(x * 0.15 + ph * 2)) * g;
  };
  w.region(4, 0, W - 5, gy + 3, (x, y) => {
    const tp = topAt(x);
    if (y < tp || y > gy + 3) return 0;
    const dTop = y - tp;
    // Streaks rising up the sheet; a lit band under the crest, darker toward the ground.
    const streak = pnoise(x * 1, (y + t * 120) * 0.18, 2.2, 0, 120 * 0.18, 271);
    let h = 0.46 + 0.16 * (streak - 0.5) * 2 - 0.14 * smooth(30, 100, dTop);
    if (dTop < 7) h = 0.66;
    else if (dTop < 10) h = 0.82;
    const edge = Math.min(x - 4, W - 5 - x);
    if (edge < 4) h -= 0.12;
    return Math.max(0.05, h);
  });
  // Foam along the crest, rolling with the waves.
  for (let k = 0; k < 46; k++) {
    const x = 8 + ((k + fract(t * 2) * 2) / 46) * (W - 16);
    const tp = topAt(x);
    fo.disc(x, tp + 1 + rr(272, k, -1.5, 1.5), rr(274, k, 2.6, 4.8) + Math.sin(ph + k * 1.7) * 0.6, 0.85, 1.6);
  }
  // Crest lips curling forward over the top.
  for (let k = 0; k < 6; k++) {
    const x = 30 + ((k + fract(t)) / 6) * (W - 60);
    const tp = topAt(x);
    fo.path([[x - 8, tp + 2], [x - 2, tp - 4], [x + 5, tp - 3], [x + 8, tp + 2]], (u) => lerp(2.6, 1.4, u), 0.9);
  }
  // Foam churning at the base.
  for (let k = 0; k < 40; k++) {
    const x = 6 + (k / 39) * (W - 12);
    if (g < 0.2 && Math.abs(x - W / 2) > W * 0.45 * (g / 0.2)) continue;
    fo.ell(x, gy + rr(276, k, -1, 2), rr(277, k, 3.5, 7) + Math.sin(ph * 2 + k) * 1.2, rr(278, k, 2.2, 3.6), 0, 0.78, 1.5);
  }
  for (let k = 0; k < 12; k++) {
    const p = fract(k / 12 * 2 + t);
    const x = rr(273, k, 14, W - 14);
    drop(dr, x + p * 4, topAt(x) - 4 - p * 10 + p * p * 12, k % 3 ? 1.6 : 2.4, -1.2, 1.5);
  }
  const body = render(w, WATER, { th: TH, rim: [1], alpha: [255, 220, 220, 230, 255, 255, 255] });
  return stack(W, H, body, foamR(fo), render(dr, WATER, { th: TH }));
}
function wall(): WorldSprite {
  const W = 264, H = 120, gy = 112;
  const idle = frames(4, (t) => wallFrame(t, 1, W, H, gy));
  const rise = frames(6, (_, i) => wallFrame(i / 6, [0.08, 0.28, 0.55, 0.84, 1.07, 1][i], W, H, gy));
  return vfxSprite('wall', 'Water wall (4.5 m x 1.8 m)', [W / 2, gy], { rise: { frames: rise, fps: 12, loop: false }, idle: { frames: idle, fps: 12, loop: true } });
}

// --- aura: a sheath of water spiralling up around the body ----------------------------------
//
// Built like the fire aura (an outer teardrop minus an inner one, open in the middle) but made of
// water: a see-through sheath whose bright streaks wind up around the body like a helix, a wavy
// outer edge throwing droplets, a spout over the head and a whirlpool at the feet.

function aura(): WorldSprite {
  const W = 80, H = 120, cx = 40, gy = 112, top = 5;
  const fr = frames(6, (t) => {
    const sheath = new Field(W, H), foam = new Field(W, H), pool = new Field(W, H), poolF = new Field(W, H), dr = new Field(W, H);
    const sc = t * 120;
    const outerW = (y: number) => 30 * Math.pow(1 - Math.pow(clamp((gy - y) / (gy - top), 0, 1), 2.6), 0.5);
    const innerW = (y: number) => {
      const vi = clamp((gy - 4 - y) / (gy - 4 - 18), 0, 1);
      return vi >= 1 ? 0 : 19.5 * Math.pow(1 - Math.pow(vi, 2.8), 0.5);
    };
    sheath.fill((x, y) => {
      if (y > gy - 3) return 0;
      const wave = 2.6 * Math.sin(((y + sc) / 120) * TAU * 6 + (x < cx ? 0 : Math.PI));
      const wO = outerW(y) + wave * smooth(gy - 4, gy - 30, y) * smooth(top, top + 30, y);
      const wI = innerW(y);
      const dx = Math.abs(x - cx);
      if (dx > wO || dx < wI) return 0;
      const u = (dx - wI) / Math.max(1, wO - wI);
      const side = x < cx ? -1 : 1;
      // Bright streaks winding up and around: diagonal bands, mirrored on each side.
      const band = fract((y + side * (x - cx) * 0.9 + t * 24) / 12);
      const streak = band < 0.14 ? 0.32 : band < 0.3 ? 0.14 : 0;
      return 0.42 + 0.2 * u * (x < cx ? 1 : 0.75) + streak;
    });
    // Foam on the wave crests of the outer edge.
    for (let side = -1; side <= 1; side += 2)
      for (let k = 0; k < 5; k++) {
        const q = fract(k / 5 + t + (side > 0 ? 0.1 : 0));
        const y = gy - 14 - q * 80;
        foam.disc(cx + side * (outerW(y) + 0.5), y, 2.4 - q * 0.6, 0.85);
      }
    // A spout splashing over the head.
    const sp = t * TAU;
    for (let k = 0; k < 3; k++) foam.disc(cx + (k - 1) * 5 + Math.sin(sp + k) * 1, top + 4 + Math.abs(k - 1) * 3, 3 - Math.abs(k - 1) * 0.6, 0.85);
    // A whirlpool turning at the feet: a ring of water with spiral foam dashes.
    for (const f of [pool, poolF])
      f.region(cx - 34, gy - 12, cx + 34, gy + 8, (x, y) => {
        if ((f === pool) !== y < gy) return 0;
        const r = Math.hypot((x - cx) / 30, (y - gy) / 7.5);
        if (r > 1 || r < 0.6) return 0;
        const a = Math.atan2((y - gy) / 7.5, (x - cx) / 30);
        const dash = fract((a / TAU) * 5 + r * 1.5 - t * 1) < 0.3 ? 0.35 : 0;
        return 0.4 + 0.2 * (1 - Math.abs(r - 0.8) * 5) + dash;
      });
    // Droplets flung off the sides and from the spout.
    for (let k = 0; k < 6; k++) {
      const q = fract(k / 6 + t);
      const side = k % 2 ? 1 : -1;
      const y0 = k < 2 ? top + 6 : gy - 30 - (k % 3) * 22;
      const x0 = cx + side * (k < 2 ? 6 : outerW(y0) + 2);
      drop(dr, x0 + side * q * 12, y0 - 8 * Math.sin(q * Math.PI) + q * q * 18, q < 0.5 ? 2.2 : 1.6, side > 0 ? 0.3 + q : Math.PI - 0.3 - q, 1.5);
    }
    const bl: { x: number; y: number; r: number }[] = [];
    for (let k = 0; k < 6; k++) {
      const q = fract(k / 6 + t);
      const side = k % 2 ? 1 : -1;
      const y = gy - 12 - q * 86;
      bl.push({ x: cx + side * (innerW(y) + (outerW(y) - innerW(y)) * 0.55), y, r: k % 3 ? 1.5 : 2.5 });
    }
    const body = stack(W, H,
      render(pool, WATER, { th: TH, rim: [1] }),
      render(sheath, WATER, { th: TH, rim: [1], alpha: [255, 205, 215, 230, 250, 255, 255] }),
      bubbles(W, H, bl),
      foamR(foam),
      render(poolF, WATER, { th: TH, rim: [1] }));
    return stack(W, H, body, render(dr, WATER, { th: TH }));
  });
  return vfxSprite('aura', 'Water aura (charge / buff)', [cx, gy], { idle: { frames: fr, fps: 12, loop: true } });
}

export function waterSprites(): WorldSprite[] {
  return [bolt(), beast(), ...stream(), breath(), sphere(), slash(), multi(), hit(), blast(), wall(), aura()];
}
