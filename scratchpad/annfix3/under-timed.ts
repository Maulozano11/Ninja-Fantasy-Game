// Fills the dead spaces under the dragon of the enhanced Great Fire Annihilation (owner: "debajo
// del dragon hay espacios muertos en negro"). Drawn behind everything in each frame: wherever the
// night shows through between the flame tips and the dragon's body (inside the hump's arch, between
// the tail and the hump, between the neck and the claw, between the tips along the wall's top),
// his smoke fills it: grey cumulus puffs lit from the upper left in his own smoke colours, warmed
// by the fire just under them, with his bright ember dots drifting up through it.
//
// Also strips the flat brown haze that his wall piece carries above the flames (his grey smoke
// quantized into the wall's fire palette), so the puffs show there instead.

import { Canvas, Color, hex } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
import { TAU, clamp, pnoise, rr } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-a-lib';
let T0 = 0; const lap = (n: string) => { const t = Date.now(); console.log(n, t - T0); T0 = t; };

// His smoke under the dragon, sampled from REF-s-tier-fire-annihilation.jpg (dark to light).
const PUFF: Color[] = ['#24141a', '#302424', '#3c2626', '#4a3432', '#56403c', '#6a524c', '#7e665a'].map((h) => hex(h));
// Where the fire lights it from below: his dark ember red up to his firelit smoke.
const WARM: Color[] = ['#3c1a16', '#4a1e18', '#5e2a1e', '#743624', '#84483c'].map((h) => hex(h));
// His ember dots.
const EMBER: Color[] = ['#ffdc78', '#ffaa3c', '#e8762a'].map((h) => hex(h));

/** Distance (chamfer, px) from every pixel to the nearest pixel where m is set. */
function distTo(m: Uint8Array, W: number, H: number): Float32Array {
  const INF = 1e9, D = Math.SQRT2;
  const d = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) d[i] = m[i] ? 0 : INF;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) {
        v = Math.min(v, d[i - W] + 1);
        if (x > 0) v = Math.min(v, d[i - W - 1] + D);
        if (x < W - 1) v = Math.min(v, d[i - W + 1] + D);
      }
      d[i] = v;
    }
  for (let y = H - 1; y >= 0; y--)
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x;
      let v = d[i];
      if (x < W - 1) v = Math.min(v, d[i + 1] + 1);
      if (y < H - 1) {
        v = Math.min(v, d[i + W] + 1);
        if (x < W - 1) v = Math.min(v, d[i + W + 1] + D);
        if (x > 0) v = Math.min(v, d[i + W - 1] + D);
      }
      d[i] = v;
    }
  return d;
}

export interface UnderOpts {
  /** Loop time (0..1): the puffs churn and the embers drift up, seamlessly over the loop. */
  t: number;
  /** How much of the smoke is there (1 = all; it breaks up into puffs as it goes in the fade). */
  k: number;
  /** The band it fills: only under the dragon. */
  x0: number;
  x1: number;
  /** The band's top; from xHead on it is yHead (under the jaw: nothing fills inside the head). */
  yTop: number;
  xHead?: number;
  yHead?: number;
  yBottom: number;
  seed: number;
  /** Gaps narrower than about 2 * close px between the wall and the dragon get filled. */
  close?: number;
}

/**
 * The smoke behind the wall and the dragon. `fg` is the frame's wall and dragon layers stacked;
 * the result goes behind everything else.
 */
export function underSmoke(fg: Canvas, dragon: Canvas, smoke: Canvas | null, o: UnderOpts): Canvas | null {
  if (o.k <= 0.01) return null;
  // (worked out in the band's box only, in frame coordinates for the noise and the puffs)
  const bx0 = Math.max(0, Math.floor(o.x0 - 70)), bx1 = Math.min(fg.w, Math.ceil(o.x1 + 70));
  const by0 = Math.max(0, Math.floor(o.yTop - 80)), by1 = Math.min(fg.h, Math.ceil(o.yBottom + 40));
  const bw = bx1 - bx0, bh = by1 - by0;
  const crop = (c: Canvas) => {
    const out = new Canvas(bw, bh);
    for (let y = 0; y < bh; y++) out.px.set(c.px.subarray(((y + by0) * c.w + bx0) * 4, ((y + by0) * c.w + bx1) * 4), y * bw * 4);
    return out;
  };
  const lo: UnderOpts = {
    ...o, x0: o.x0 - bx0, x1: o.x1 - bx0, yTop: o.yTop - by0, yBottom: o.yBottom - by0,
    xHead: o.xHead === undefined ? undefined : o.xHead - bx0, yHead: o.yHead === undefined ? undefined : o.yHead - by0,
  };
  const c = underSmokeIn(crop(fg), crop(dragon), smoke ? crop(smoke) : null, lo, bx0, by0);
  const out = new Canvas(fg.w, fg.h);
  out.draw(c, bx0, by0);
  return out;
}

function underSmokeIn(fg: Canvas, dragon: Canvas, smoke: Canvas | null, o: UnderOpts, ox: number, oy: number): Canvas {
  const W = fg.w, H = fg.h, R = o.close ?? 13;
  T0 = Date.now();
  const ph = o.t * TAU;
  const m = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) m[i] = fg.px[i * 4 + 3] > 0 ? 1 : 0;
  lap('m0');
  // Closing (dilate, then erode) of the wall + dragon: the gaps between them close up.
  const d1 = distTo(m, W, H);
  const notDil = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) notDil[i] = d1[i] <= R ? 0 : 1;
  const d2 = distTo(notDil, W, H);
  const closed = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) closed[i] = d2[i] > R ? 1 : 0;
  lap('m1');
  // Anything the wall and the dragon enclose (the hump's arch) is filled too.
  const outside = new Uint8Array(W * H);
  const todo: number[] = [];
  const seedAt = (i: number) => {
    if (!closed[i] && !outside[i]) {
      outside[i] = 1;
      todo.push(i);
    }
  };
  for (let x = 0; x < W; x++) {
    seedAt(x);
    seedAt((H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    seedAt(y * W);
    seedAt(y * W + W - 1);
  }
  while (todo.length) {
    const i = todo.pop()!;
    const x = i % W, y = (i / W) | 0;
    if (x > 0) seedAt(i - 1);
    if (x < W - 1) seedAt(i + 1);
    if (y > 0) seedAt(i - W);
    if (y < H - 1) seedAt(i + W);
  }
  lap('m2');
  // The band under the dragon, its ends and top ragged so it never shows a straight edge.
  const inBand = (x: number, y: number) => {
    const n = (pnoise(x + ox, y + oy, 23, 0, 0, o.seed + 3) - 0.5) * 30;
    const nx = (pnoise(x + ox, y + oy, 19, 0, 0, o.seed + 4) - 0.5) * 56;
    const top = o.xHead !== undefined && x + nx * 0.3 >= o.xHead ? o.yHead ?? o.yTop : o.yTop;
    return x >= o.x0 + nx && x <= o.x1 + nx && y >= top + n && y <= o.yBottom;
  };
  const region = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if ((closed[i] || !outside[i]) && inBand(x, y)) region[i] = 1;
    }
  lap('m3');
  // Straight under the dragon's body (or his smoke cloud), down to the flames (or the claw) below
  // it, all of it.
  const covers = (i: number) => dragon.px[i * 4 + 3] > 0 || (smoke !== null && smoke.px[i * 4 + 3] > 0);
  for (let x = Math.max(0, o.x0 - 30); x < Math.min(W, o.x1 + 30); x++) {
    let underDragon = false;
    for (let y = Math.max(0, o.yTop - 20); y < Math.min(H, o.yBottom); y++) {
      const i = y * W + x;
      if (m[i] || covers(i)) {
        underDragon = covers(i);
        continue;
      }
      if (!underDragon) continue;
      // A gap under it: fill it if anything (the fire, the dragon, more smoke) closes it from below.
      let y2 = y;
      while (y2 < o.yBottom && !m[y2 * W + x] && !covers(y2 * W + x)) y2++;
      if (y2 < o.yBottom) for (let v = y; v < y2; v++) if (inBand(x, v)) region[v * W + x] = 1;
      y = y2 - 1;
      underDragon = false;
    }
  }
  if (process.env.UNDER_DEBUG) {
    const dbg = new Canvas(W, H);
    for (let i = 0; i < W * H; i++) {
      const x = i % W, y = (i / W) | 0;
      if (m[i]) dbg.set(x, y, dragon.px[i * 4 + 3] ? [255, 120, 0, 255] : [120, 60, 0, 255]);
      else if (region[i]) dbg.set(x, y, [0, 200, 255, 255]);
      else if (smoke && smoke.px[i * 4 + 3]) dbg.set(x, y, [90, 90, 90, 255]);
    }
    dbg.save(process.env.UNDER_DEBUG);
  }
  lap('m4');
  // Its free edge billows out a little past the closed outline, in round lumps (no geometric arcs).
  const d3 = distTo(region, W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (region[i] || d3[i] > 7) continue;
      const lump = 7 * Math.pow(pnoise(x + ox + 3 * Math.sin(ph), y + oy + 2 * Math.cos(ph), 9, 0, 0, o.seed + 5), 1.5);
      if (d3[i] <= lump && inBand(x, y)) region[i] = 2;
    }
  lap('m5');
  // His smoke: cumulus puffs on a jittered grid, each a lit sphere, the nearest one in front winning.
  const CELL = 19;
  interface Puff { x: number; y: number; r: number; z: number; keep: number; id: number }
  const gx0 = Math.floor(ox / CELL) - 3, gy0 = Math.floor(oy / CELL) - 3;
  const GW = Math.ceil(W / CELL) + 7, GH = Math.ceil(H / CELL) + 7;
  const grid: Puff[] = [];
  for (let cy = gy0; cy < gy0 + GH; cy++)
    for (let cx = gx0; cx < gx0 + GW; cx++) {
      const id = cx * 7919 + cy * 104729;
      const a = rr(o.seed + 11, id, 0, TAU);
      grid.push({
        x: (cx + rr(o.seed + 12, id, 0.1, 0.9)) * CELL + 2.2 * Math.cos(ph + a) - ox,
        y: (cy + rr(o.seed + 13, id, 0.1, 0.9)) * CELL + 1.6 * Math.sin(ph + a) - oy,
        // (big and small billows mixed, as in his smoke)
        r: rr(o.seed + 14, id, 8, 13) * (0.8 + 0.7 * pnoise(cx * CELL, cy * CELL, 60, 0, 0, o.seed + 18)),
        z: rr(o.seed + 15, id, 0, 5),
        keep: rr(o.seed + 16, id, 0, 1),
        id,
      });
    }
  const puffAt = (cx: number, cy: number): Puff => grid[(cy - gy0) * GW + cx - gx0];
  // The light comes from the upper left.
  const L = [-0.5, -0.65, 0.57];
  const out = new Canvas(W, H);
  const owner = new Int32Array(W * H).fill(-1);
  lap('m6');
  // How far below is the fire (the wall or the dragon) in this column: the smoke is warmer there.
  const fireBelow = new Float32Array(W * H).fill(99);
  for (let x = 0; x < W; x++) {
    let last = -1;
    for (let y = H - 1; y >= 0; y--) {
      const i = y * W + x;
      if (m[i]) last = y;
      fireBelow[i] = last < 0 ? 99 : last - y;
    }
  }
  lap('m7');
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!region[i] || m[i]) continue;
      const gx = Math.floor((x + ox) / CELL), gy = Math.floor((y + oy) / CELL);
      let best = -1e9, bestP: Puff | null = null, ph2 = 0, bdx = 0, bdy = 0;
      for (let cy = gy - 2; cy <= gy + 2; cy++)
        for (let cx = gx - 2; cx <= gx + 2; cx++) {
          const p = puffAt(cx, cy);
          const dx = x - p.x, dy = y - p.y, dd = dx * dx + dy * dy;
          if (dd >= p.r * p.r) continue;
          const h = Math.sqrt(p.r * p.r - dd);
          if (h + p.z > best) {
            best = h + p.z;
            bestP = p;
            ph2 = h;
            bdx = dx;
            bdy = dy;
          }
        }
      // In the fade the smoke breaks up puff by puff.
      if (o.k < 1 && (!bestP || bestP.keep > o.k * 1.1 - 0.05 + 0.15 * (pnoise(x + ox, y + oy, 17, 0, 0, o.seed + 17) - 0.5))) continue;
      let idx: number;
      if (!bestP) idx = 1;
      else {
        const r = bestP.r;
        const s = (bdx / r) * L[0] + (bdy / r) * L[1] + (ph2 / r) * L[2];
        // (the puffs further back are a shade darker)
        idx = clamp(Math.round(1.2 + (s * 0.5 + 0.5) * 4.0 + bestP.z * 0.14), 1, 6);
        // A darker seam where a puff's rim lies over the one behind it.
        if (ph2 < 1.3) idx = Math.max(1, idx - 2);
        owner[i] = bestP.id;
      }
      // Lit warm from below just over the fire (his firelit undersides), ragged.
      const fb = fireBelow[i] + 6 * (pnoise(x + ox, y + oy, 7, 0, 0, o.seed + 19) - 0.5);
      let c = PUFF[idx];
      if (fb < 16) {
        const w = clamp(1 - fb / 16, 0, 1);
        const wi = clamp(Math.round(w * 2 + (idx - 1) * 0.5), 0, WARM.length - 1);
        if (w > 0.35) c = WARM[wi];
      }
      out.set(x, y, c);
    }
  lap('m8');
  // His dark edge where the smoke meets the night.
  const edge = new Uint8Array(W * H);
  const A = (j: number) => out.px[j * 4 + 3] > 0 || m[j] > 0;
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (!out.px[i * 4 + 3]) continue;
      if (!A(i - 1) || !A(i + 1) || !A(i - W) || !A(i + W)) edge[i] = 1;
    }
  for (let i = 0; i < W * H; i++) if (edge[i]) out.set(i % W, (i / W) | 0, PUFF[0]);
  lap('m9');
  // His ember dots drifting up through it (solid dots, no rings).
  const n = Math.round(260 * o.k);
  for (let j = 0; j < n; j++) {
    const u = (rr(o.seed + 21, j, 0, 1) + o.t) % 1;
    const x = Math.round(rr(o.seed + 22, j, o.x0, o.x1) + 3 * Math.sin(ph + j));
    const y = Math.round(rr(o.seed + 23, j, o.yTop + 20, o.yBottom) - u * 26);
    if (x < 2 || y < 2 || x >= W - 3 || y >= H - 3 || !out.alpha(x, y) || m[y * W + x]) continue;
    const big = rr(o.seed + 24, j, 0, 1) < 0.25 && u < 0.6;
    const col = EMBER[u < 0.35 ? 0 : u < 0.7 ? 1 : 2];
    out.set(x, y, col);
    if (big) {
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1]]) if (out.alpha(x + dx, y + dy)) out.set(x + dx, y + dy, col);
    }
  }
  lap('m10');
  return out;
}

/**
 * His wall piece with the flat brown haze above the flames taken out: his grey smoke there was
 * quantized into the wall's two dark browns. Those pixels, where no bright fire is within a few px
 * (so the dark lines inside the flames stay), become clear, and the under-smoke shows through.
 */
export function stripHaze(c: Canvas, yMax: number, dark: string[] = ['#74412e', '#6f2c1c', '#64140d'], near = 4): Canvas {
  const W = c.w, H = c.h;
  const darkSet = new Set(dark.map((h) => h.toLowerCase()));
  const isDark = new Uint8Array(W * H), bright = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const a = c.px[i * 4 + 3];
    if (!a) continue;
    const r = c.px[i * 4], g = c.px[i * 4 + 1], b = c.px[i * 4 + 2];
    const h = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
    if (darkSet.has(h)) isDark[i] = 1;
    else if (0.3 * r + 0.59 * g + 0.11 * b > 105) bright[i] = 1;
  }
  const db = distTo(bright, W, H);
  const haze = new Uint8Array(W * H);
  for (let y = 0; y < Math.min(H, yMax); y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (isDark[i] && db[i] >= near) haze[i] = 1;
    }
  // Its dark fringe goes with it (dark pixels touching the haze), but never bright fire.
  const dh = distTo(haze, W, H);
  const out = c.clone();
  for (let y = 0; y < Math.min(H, yMax); y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (haze[i] || (isDark[i] && dh[i] <= 3)) out.px[i * 4 + 3] = 0, out.px[i * 4] = out.px[i * 4 + 1] = out.px[i * 4 + 2] = 0;
    }
  // Loose specks left floating in the cleared area go too.
  for (let y = 1; y < Math.min(H, yMax) - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (!out.px[i * 4 + 3] || dh[i] > 8) continue;
      let k = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (out.px[((y + dy) * W + x + dx) * 4 + 3]) k++;
      if (k <= 1 && !bright[i]) out.px[i * 4 + 3] = 0;
    }
  return out;
}

/** Sparks as his solid ember dots (1 px, or 2 x 2 for the big ones), no ring outline. */
export function solidEmbers(W: number, H: number, list: { x: number; y: number; s: number }[]): Canvas {
  const c = new Canvas(W, H);
  list.forEach((e, k) => {
    const x = Math.round(e.x), y = Math.round(e.y);
    if (e.s >= 2) {
      c.set(x, y, EMBER[0]);
      c.set(x + 1, y, EMBER[1]);
      c.set(x, y + 1, EMBER[1]);
      c.set(x + 1, y + 1, EMBER[2]);
    } else c.set(x, y, EMBER[k % 3 === 0 ? 1 : 0]);
  });
  return c;
}

/**
 * His white-hot glow along the base of the wall: his brightest colours there (near-white cream)
 * were quantized into the wall's top yellow. In the band just above the wall's base line (the
 * lowest white-hot pixel of each column), the top yellows go back to his cream whites, brightest
 * nearest the line, so his bright streaks there come back.
 */
export function whiteHotBase(c: Canvas, band = 18, top = '#fde678', next = '#fcd856'): Canvas {
  const W = c.w, H = c.h;
  const T = hex(top), N = hex(next);
  const same = (p: Color, q: Color) => p[0] === q[0] && p[1] === q[1] && p[2] === q[2];
  const lum = (p: Color) => 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2];
  const out = c.clone();
  const CREAM: Color[] = ['#fffbea', '#fff5d7', '#ffeebb'].map((h) => hex(h));
  for (let x = 0; x < W; x++) {
    let base = -1;
    for (let y = H - 1; y >= 0; y--) {
      const p = c.get(x, y);
      if (p[3] && lum(p) > 205) {
        base = y;
        break;
      }
    }
    if (base < 0) continue;
    for (let y = Math.max(0, base - band); y <= base; y++) {
      const p = c.get(x, y);
      if (!p[3]) continue;
      const u = (base - y) / band; // 0 at the line, 1 at the band's top
      const n = pnoise(x, y, 4, 0, 0, 1931) * 0.35;
      if (same(p, T) && u + n < 0.95) out.set(x, y, CREAM[u + n < 0.35 ? 0 : u + n < 0.65 ? 1 : 2]);
      else if (same(p, N) && u + n < 0.45) out.set(x, y, CREAM[2]);
    }
  }
  return out;
}
