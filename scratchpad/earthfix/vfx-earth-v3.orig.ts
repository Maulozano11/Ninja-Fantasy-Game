// Earth jutsu VFX, third pass: the whole set rebuilt from the owner's paint-over of our earth sheet
// (docs/reference/earth-set-owner-reference.jpg), copied as exactly as possible.
//
//   WORLD_OUT=<art2>/staging npx tsx tools/world-sprites/vfx-earth-v3.ts
//
// writes the group `vfx_earth_v3` under <WORLD_OUT>/vfx_earth_v3/ (staging only: it refuses to run
// without WORLD_OUT, so it never writes into src/assets).
//
// Every key frame is HIS picture: tools/refs/earth-from-ref.py cuts his panels to game scale (his
// pixels, a palette from his pixels per sprite, his rims as a clean 1 px deep-brown outline, his
// dust kept semi-transparent) and writes them to vfx-earth-v3-refdata.ts as pieces (main body, loose
// bits, dust, shadow, and named parts). This file only animates them, deriving every other frame
// from the key frame, so the key frame of each animation is his picture:
//   - loops start on his picture and come back to it (displacements that run round a small circle,
//     drifts that wrap), so frame 0 is exact and the loop is seamless;
//   - one-shots (hit, multi_hit, blast, the walls' rise) build up to or break down from his picture.
// Same sprite names, anims, frame counts and fps as vfx_earth, plus `multi_hit` (the rock bullets'
// impact, his unlabelled panel) and `aura_back`. Frames are sized to his art and the anchors moved
// with it. The earth beast is out of scope: beast.png is copied through from vfx_earth unchanged.
// Deterministic: no Math.random.

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Canvas, Color, PX_PER_M, WorldSprite, hex, writeGroup } from './kit';
import { TAU, clamp, fract, pnoise, rr, smooth, vfxSprite } from './vfx-a-lib';
import { EV3_REF } from './vfx-earth-v3-refdata';

// --- his key frames -------------------------------------------------------------------------------

type Kind = 'body' | 'outline' | 'dust' | 'shade';

/** A sprite's palette (his colours): index v (1-based) is cols[v - 1] of kind kinds[v - 1]. */
class Pal {
  readonly cols: Color[];
  readonly kinds: Kind[];
  /** Index of the first dust entry, and how many alpha steps each dust colour has. */
  readonly dust0: number;
  readonly dustSteps: number;
  readonly shade0: number;
  readonly shadeSteps: number;
  /** His deepest rim colour (for new edges cut into his rock). */
  readonly rim: number;
  /** Each dust colour's rank from darkest to lightest, and the colour at each rank. */
  readonly dustRank: number[];
  readonly dustByRank: number[];
  constructor(src: { rgba: string; kind: string }[]) {
    this.cols = src.map((p) => hex(p.rgba.slice(0, 7), parseInt(p.rgba.slice(7, 9), 16)));
    this.kinds = src.map((p) => p.kind as Kind);
    this.dust0 = this.kinds.indexOf('dust') + 1;
    let n = 0;
    if (this.dust0 > 0) {
      const first = src[this.dust0 - 1].rgba.slice(0, 7);
      while (src[this.dust0 - 1 + n]?.rgba.slice(0, 7) === first) n++;
    }
    this.dustSteps = n;
    this.shade0 = this.kinds.indexOf('shade') + 1;
    this.shadeSteps = this.shade0 > 0 ? this.kinds.filter((k) => k === 'shade').length : 0;
    this.rim = this.kinds.indexOf('outline') + 1;
    const nd = this.dustSteps ? this.kinds.filter((k) => k === 'dust').length / this.dustSteps : 0;
    const lum = (c: Color) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
    this.dustByRank = Array.from({ length: nd }, (_, c) => c).sort((a, b) => lum(this.cols[this.dust0 - 1 + a * this.dustSteps]) - lum(this.cols[this.dust0 - 1 + b * this.dustSteps]));
    this.dustRank = new Array<number>(nd);
    this.dustByRank.forEach((c, r) => (this.dustRank[c] = r));
  }
  /** A dust index moved `k` colours down his dust ramp (darker, browner), at the same alpha. */
  cool(v: number, k: number): number {
    if (k <= 0 || this.kind(v) !== 'dust') return v;
    const a = (v - this.dust0) % this.dustSteps, c = Math.floor((v - this.dust0) / this.dustSteps);
    const c2 = this.dustByRank[Math.max(0, this.dustRank[c] - k)];
    return this.dust0 + c2 * this.dustSteps + a;
  }
  kind(v: number): Kind | null {
    return v ? this.kinds[v - 1] : null;
  }
  /** A dust or shade index stepped down by `k` alpha steps (0 when it fades out). */
  dim(v: number, k: number): number {
    const kd = this.kind(v);
    if (kd === 'dust') {
      const a = (v - this.dust0) % this.dustSteps, c = Math.floor((v - this.dust0) / this.dustSteps);
      return a - k < 0 ? 0 : this.dust0 + c * this.dustSteps + Math.min(this.dustSteps - 1, a - k);
    }
    if (kd === 'shade') {
      const a = v - this.shade0;
      return a - k < 0 ? 0 : this.shade0 + Math.min(this.shadeSteps - 1, a - k);
    }
    return v;
  }
}

/** An indexed layer (0 = clear, else palette index + 1), the size of a sprite's frame. */
class Layer {
  readonly v: Uint8Array;
  constructor(readonly pal: Pal, readonly w: number, readonly h: number, v?: Uint8Array) {
    this.v = v ?? new Uint8Array(w * h);
  }
  get(x: number, y: number): number {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.v[y * this.w + x] : 0;
  }
  set(x: number, y: number, val: number): void {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.v[y * this.w + x] = val;
  }
  kind(x: number, y: number): Kind | null {
    return this.pal.kind(this.get(x, y));
  }
  clone(): Layer {
    return new Layer(this.pal, this.w, this.h, new Uint8Array(this.v));
  }
  empty(): Layer {
    return new Layer(this.pal, this.w, this.h);
  }
  render(): Canvas {
    const c = new Canvas(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const v = this.v[y * this.w + x];
      if (v) c.set(x, y, this.pal.cols[v - 1]);
    }
    return c;
  }
  /** Keeps only the pixels whose index passes `keep`. */
  filter(keep: (v: number, x: number, y: number) => boolean): Layer {
    const out = this.empty();
    for (let i = 0; i < this.v.length; i++) if (this.v[i] && keep(this.v[i], i % this.w, (i / this.w) | 0)) out.v[i] = this.v[i];
    return out;
  }
  /** Every pixel's index mapped (0 clears it). */
  map(f: (v: number, x: number, y: number) => number): Layer {
    const out = this.empty();
    for (let i = 0; i < this.v.length; i++) if (this.v[i]) out.v[i] = f(this.v[i], i % this.w, (i / this.w) | 0);
    return out;
  }
}

interface Key { w: number; h: number; ax: number; ay: number; pal: Pal; part: (name: string) => Layer; has: (name: string) => boolean }
const keyCache = new Map<string, Key>();
/**
 * Room round his frame while animating: dust billows and rocks fly further than his picture, so
 * every frame is drawn on his frame grown by PAD px on each side, then the whole sprite is trimmed
 * to what its frames use (see `fit`). The stream tile is the exception: it stays his 64x64 tile.
 */
const PAD = 28;
/** His key frame of a sprite: its size, anchor, palette and pieces (each decoded onto the whole frame). */
function key(name: string): Key {
  const hit = keyCache.get(name);
  if (hit) return hit;
  const r = EV3_REF[name];
  if (!r) throw new Error(`vfx-earth-v3: no reference key frame "${name}"`);
  const P = name === 'stream' ? 0 : PAD;
  const pal = new Pal(r.pal);
  const parts = new Map<string, Layer>();
  const part = (p: string): Layer => {
    const got = parts.get(p);
    if (got) return got.clone();
    const L = new Layer(pal, r.w + 2 * P, r.h + 2 * P);
    const pc = r.pieces[p];
    if (pc) {
      const bytes = Buffer.from(pc.rle, 'base64');
      let i = 0;
      for (let k = 0; k + 1 < bytes.length; k += 2) {
        const n = bytes[k], val = bytes[k + 1];
        if (val) for (let j = 0; j < n; j++) L.set(P + pc.x + ((i + j) % pc.w), P + pc.y + Math.floor((i + j) / pc.w), val);
        i += n;
      }
    }
    parts.set(p, L);
    return L.clone();
  };
  const k = { w: r.w + 2 * P, h: r.h + 2 * P, ax: r.anchor[0] + P, ay: r.anchor[1] + P, pal, part, has: (p: string) => !!r.pieces[p] };
  keyCache.set(name, k);
  return k;
}

// --- moves ----------------------------------------------------------------------------------------

/** Layers bottom to top: a later layer wins where it is drawn, except that dust and shade never cover rock. */
function union(...ls: (Layer | null)[]): Layer {
  const first = ls.find((l): l is Layer => !!l)!;
  const out = first.empty();
  const soft = (v: number) => {
    const k = first.pal.kind(v);
    return k === 'dust' || k === 'shade';
  };
  for (const l of ls) {
    if (!l) continue;
    for (let i = 0; i < out.v.length; i++) {
      const v = l.v[i];
      if (!v) continue;
      if (soft(v) && out.v[i] && !soft(out.v[i])) continue;
      out.v[i] = v;
    }
  }
  return out;
}

/** Every pixel moved: out(x, y) = L(src(x, y)) (nearest). */
function remap(L: Layer, src: (x: number, y: number) => [number, number] | null): Layer {
  const out = L.empty();
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const s = src(x, y);
    if (s) out.v[y * L.w + x] = L.get(Math.round(s[0]), Math.round(s[1]));
  }
  return out;
}
const moved = (L: Layer, dx: number, dy: number): Layer => remap(L, (x, y) => [x - Math.round(dx), y - Math.round(dy)]);
/** Scaled by (sx, sy) about (cx, cy). */
function scaled(L: Layer, sx: number, sy: number, cx: number, cy: number): Layer {
  if (sx < 0.02 || sy < 0.02) return L.empty();
  return remap(L, (x, y) => [Math.floor(cx + (x + 0.5 - cx) / sx), Math.floor(cy + (y + 0.5 - cy) / sy)]);
}
/** Turned by `a` radians about (cx, cy) (nearest; small angles keep his pixel clusters). */
function rotated(L: Layer, a: number, cx: number, cy: number): Layer {
  if (Math.abs(a) < 1e-4) return L.clone();
  const c = Math.cos(a), s = Math.sin(a);
  return remap(L, (x, y) => {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
    return [Math.floor(cx + dx * c + dy * s), Math.floor(cy - dx * s + dy * c)];
  });
}

/**
 * A displacement that runs round a small circle as t goes 0 -> 1 and is zero at t = 0, so a loop
 * starts on his picture and closes seamlessly; its size and direction vary smoothly over the frame.
 */
function circleDisp(x: number, y: number, t: number, cell: number, seed: number): [number, number] {
  const n1 = pnoise(x, y, cell, 0, 0, seed) * 2 - 1;
  const n2 = pnoise(x, y, cell, 0, 0, seed + 17) * 2 - 1;
  const c = Math.cos(t * TAU) - 1, s = Math.sin(t * TAU);
  return [n1 * c + n2 * s, n2 * c - n1 * s];
}

interface ChurnOpts { amp: number; ampY?: number; cell: number; seed: number; where?: (x: number, y: number) => number; flow?: (x: number, y: number) => [number, number]; kinds?: Kind[] }
/**
 * His dust (or rock) churning inside its own silhouette: every pixel of the given kinds takes the
 * value of a pixel of the same kind a little way off (the silhouette stays, so edges stay clean).
 * `flow` adds a drift along a direction (it also runs round and comes back).
 */
function churn(L: Layer, t: number, o: ChurnOpts): Layer {
  if (t === 0) return L.clone();
  const out = L.clone();
  const kinds = o.kinds ?? ['dust'];
  const ay = o.ampY ?? o.amp;
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const k = L.kind(x, y);
    if (!k || !kinds.includes(k)) continue;
    const w = o.where ? o.where(x, y) : 1;
    if (w <= 0) continue;
    let [dx, dy] = circleDisp(x, y, t, o.cell, o.seed);
    dx *= o.amp * w;
    dy *= ay * w;
    if (o.flow) {
      const f = Math.sin(t * TAU) * w;
      const [fx, fy] = o.flow(x, y);
      dx += fx * f;
      dy += fy * f;
    }
    const sv = L.get(Math.round(x - dx), Math.round(y - dy));
    if (sv && L.pal.kind(sv) === k) out.v[y * L.w + x] = sv;
  }
  return out;
}

/** The whole drawing (silhouette included) swayed a little. */
function wobble(L: Layer, t: number, amp: number, cell: number, seed: number, where?: (x: number, y: number) => number): Layer {
  if (t === 0) return L.clone();
  return remap(L, (x, y) => {
    const w = where ? where(x, y) : 1;
    const [dx, dy] = circleDisp(x, y, t, cell, seed);
    return [x - dx * amp * w, y - dy * amp * w];
  });
}

/** Connected pieces (8-way) of a layer: each a list of pixel indices. */
function pieces(L: Layer): number[][] {
  const seen = new Uint8Array(L.v.length);
  const out: number[][] = [];
  for (let i = 0; i < L.v.length; i++) {
    if (!L.v[i] || seen[i]) continue;
    const pc: number[] = [], todo = [i];
    seen[i] = 1;
    while (todo.length) {
      const j = todo.pop()!;
      pc.push(j);
      const x = j % L.w, y = (j / L.w) | 0;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const u = x + ox, w = y + oy;
        if (u < 0 || w < 0 || u >= L.w || w >= L.h) continue;
        const k = w * L.w + u;
        if (L.v[k] && !seen[k]) {
          seen[k] = 1;
          todo.push(k);
        }
      }
    }
    out.push(pc);
  }
  return out;
}
const centre = (L: Layer, pc: number[]): [number, number] => {
  let sx = 0, sy = 0;
  for (const i of pc) {
    sx += i % L.w;
    sy += (i / L.w) | 0;
  }
  return [sx / pc.length, sy / pc.length];
};

/** Each piece (rock, pebble) moved as a whole: move(k, cx, cy, size) gives its offset, or null to drop it. */
function moveBits(L: Layer, move: (k: number, cx: number, cy: number, n: number) => [number, number] | null): Layer {
  const out = L.empty();
  pieces(L).forEach((pc, k) => {
    const [cx, cy] = centre(L, pc);
    const m = move(k, cx, cy, pc.length);
    if (!m) return;
    const dx = Math.round(m[0]), dy = Math.round(m[1]);
    for (const i of pc) out.set((i % L.w) + dx, ((i / L.w) | 0) + dy, L.v[i]);
  });
  return out;
}

/**
 * Keeps only the pixels keep(x, y) picks; where rock was cut, the new edge gets his rim (so a
 * rising or crumbling rock keeps a clean outline). Tiny crumbs left floating are dropped.
 */
function cut(L: Layer, keep: (x: number, y: number) => boolean, minPiece = 3): Layer {
  const out = L.empty();
  const gone = new Uint8Array(L.v.length);
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const i = y * L.w + x;
    if (!L.v[i]) continue;
    if (keep(x, y)) out.v[i] = L.v[i];
    else gone[i] = 1;
  }
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const i = y * L.w + x;
    if (out.pal.kind(out.v[i]) !== 'body') continue;
    if ((x > 0 && gone[i - 1]) || (x < L.w - 1 && gone[i + 1]) || (y > 0 && gone[i - L.w]) || (y < L.h - 1 && gone[i + L.w])) out.v[i] = L.pal.rim;
  }
  for (const pc of pieces(out)) {
    const rock = pc.filter((i) => out.pal.kind(out.v[i]) === 'body').length;
    const soft = pc.filter((i) => ['dust', 'shade'].includes(out.pal.kind(out.v[i]) ?? '')).length;
    if (pc.length <= minPiece || (rock + soft < pc.length * 0.4)) for (const i of pc) out.v[i] = 0;
  }
  return out;
}

/** His dust and shadow faded by `k` alpha steps. */
const dimSoft = (L: Layer, k: number): Layer => (k <= 0 ? L.clone() : L.map((v) => L.pal.dim(v, k)));
/** His dust settling: each colour `k` steps down his dust ramp, then `dim` alpha steps fainter. */
const settle = (L: Layer, k: number, dim = 0): Layer => L.map((v) => L.pal.dim(L.pal.cool(v, k), dim));
/** Breaks dust up in soft blobs as it thins: keeps a pixel where its blob noise beats `level`. */
const thinOut = (L: Layer, level: number, seed: number, bias: (x: number, y: number) => number): Layer =>
  level <= 0 ? L : L.filter((v, x, y) => L.pal.kind(v) !== 'dust' || pnoise(x, y, 5, 0, 0, seed) * 0.5 + pnoise(x, y, 2.5, 0, 0, seed + 1) * 0.2 + bias(x, y) * 0.3 > level);


/** Drift that starts at 0 and wraps (a pebble leaving is replaced by one arriving). */
const drift = (t: number, ph: number) => fract(ph + t) - ph;

/** Rock (body and rim) and soft (dust and shade) parts of a layer. */
const rockOf = (L: Layer) => L.filter((v) => ['body', 'outline'].includes(L.pal.kind(v)!));
const softOf = (L: Layer) => L.filter((v) => ['dust', 'shade'].includes(L.pal.kind(v)!));

const frameOf = (...ls: (Layer | null)[]): Canvas => union(...ls).render();
/** His dust, continued under the rocks sitting in it (so a rock that moves leaves dust, not a hole). */
const dustOf = (K: Key): Layer => union(K.part('under'), K.part('dust'));

// --- projectiles -----------------------------------------------------------------------------------

/**
 * bolt: his tumbling boulder with its dust trail. The boulder rocks on its way (a few degrees each
 * side, about its centre, which is the anchor), its trail churns and streams back, the pebbles in
 * it drift back, and the speed streaks slide.
 */
function bolt(): WorldSprite {
  const K = key('bolt'), seed = 7100;
  const boulder = K.part('boulder'), main = K.part('main'), bits = K.part('bits'), dust = dustOf(K);
  const fr = [0, 1, 2, 3, 4, 5].map((i) => {
    const t = i / 6;
    const b = rotated(boulder, 0.11 * Math.sin(t * TAU), K.ax, K.ay);
    const tail = (x: number) => smooth(K.ax - 14, K.ax - 60, x);
    let d = churn(dust, t, { amp: 1.6, ampY: 1, cell: 7, seed, where: (x) => 0.4 + 0.6 * tail(x), flow: () => [-2, 0] });
    // Each row of the trail slides along itself, more toward its end (the streaks stay whole).
    d = remap(d, (x, y) => {
      const ph = y * 0.5 + pnoise(0, y, 4, 0, 0, seed + 3) * 3;
      return [x + Math.round(2 * tail(x) * (Math.sin(t * TAU + ph) - Math.sin(ph))), y];
    });
    const m = moveBits(main, (k) => [-2 * (Math.sin(t * TAU + k) - Math.sin(k)), 0]);
    const p = moveBits(bits, (k, cx) => {
      const u = drift(t, rr(seed + 2, k, 0, 1));
      return u > 0 && cx - 9 * u < 6 ? null : [-9 * u, 1.2 * (Math.sin(u * 4 + k) - Math.sin(k))];
    });
    return frameOf(d, m, p, b);
  });
  return vfxSprite('bolt', 'Earth bolt: tumbling boulder with a dust trail', [K.ax, K.ay], { fly: { frames: fr, fps: 12, loop: true } });
}

/**
 * sphere: his striped boulder-planet. The planet holds (its bands churn a hair), the dusty ring
 * flows round it, and the pebbles orbit along the ring: in front of the planet on the near half of
 * their orbit, behind it on the far half.
 */
function sphere(): WorldSprite {
  const K = key('sphere'), seed = 7200;
  const planet = K.part('planet'), main = K.part('main'), bits = K.part('bits'), dust = dustOf(K);
  // The ring: an ellipse round the anchor (the planet's centre), about as wide as his ring.
  const RX = 48, RY = 16;
  const fr = [0, 1, 2, 3, 4, 5].map((i) => {
    const t = i / 6;
    const pl = churn(planet, t, { amp: 0.7, cell: 6, seed, kinds: ['body'] });
    // The ring's dust flows along the ring (counter-clockwise as seen from the front).
    const d = churn(dust, t, {
      amp: 1, cell: 6, seed: seed + 1,
      flow: (x, y) => {
        const dx = (x - K.ax) / RX, dy = (y - K.ay) / RY;
        const l = Math.hypot(dx, dy) || 1;
        return [(-dy / l) * 3, (dx / l) * 1];
      },
    });
    const m = churn(main, t, { amp: 0.8, cell: 6, seed: seed + 3, kinds: ['body'] });
    const front = K.part('bits').empty(), back = K.part('bits').empty();
    pieces(bits).forEach((pc, k) => {
      const [cx, cy] = centre(bits, pc);
      const ex = (cx - K.ax) / RX, ey = (cy - K.ay) / RY;
      const r = Math.hypot(ex, ey), a0 = Math.atan2(ey, ex);
      // Pebbles on the ring go round it once a loop; the ones further out bob in place.
      const orbits = r >= 0.6 && r <= 1.3;
      const a = a0 + (orbits ? t * TAU : 0);
      const nx = K.ax + Math.cos(a) * r * RX, ny = K.ay + Math.sin(a) * r * RY;
      const ph = rr(seed + 4, k, 0, TAU);
      const dx = Math.round(nx - cx), dy = Math.round(ny - cy) + (orbits ? 0 : Math.round(Math.sin(t * TAU + ph) - Math.sin(ph)));
      const dest = orbits && Math.sin(a) < -0.2 && i > 0 ? back : front;
      for (const j of pc) dest.set((j % bits.w) + dx, ((j / bits.w) | 0) + dy, bits.v[j]);
    });
    return frameOf(back, d, m, pl, front);
  });
  return vfxSprite('sphere', 'Earth sphere: striped boulder-planet with a dusty orbit ring', [K.ax, K.ay], { fly: { frames: fr, fps: 12, loop: true } });
}

/** slash: his crescent of rock and dirt. The rock holds, the dirt on its inner side churns and trails back, pebbles drift back. */
function slash(): WorldSprite {
  const K = key('slash'), seed = 7300;
  const main = K.part('main'), bits = K.part('bits'), dust = dustOf(K);
  const fr = [0, 1, 2, 3, 4, 5].map((i) => {
    const t = i / 6;
    const d = churn(dust, t, { amp: 1.4, cell: 5, seed, flow: () => [-1.5, 0] });
    const m = churn(main, t, { amp: 0.6, cell: 6, seed: seed + 1, kinds: ['body'] });
    const p = moveBits(bits, (k, cx) => {
      const u = drift(t, rr(seed + 2, k, 0, 1));
      return u > 0 && cx - 6 * u < 4 ? null : [-6 * u, 0.8 * (Math.sin(u * 5 + k) - Math.sin(k))];
    });
    return frameOf(d, m, p);
  });
  return vfxSprite('slash', 'Earth slash: crescent of rock and dirt with a golden edge', [K.ax, K.ay], { fly: { frames: fr, fps: 12, loop: true } });
}

/** multi: his three rock bullets. Each bobs on its own beat with its dust trail; the trails churn and stream back. */
function multi(): WorldSprite {
  const K = key('multi'), seed = 7400;
  const bullets = ['b0', 'b1', 'b2'].map((n) => K.part(n));
  const main = K.part('main'), bits = K.part('bits'), dust = dustOf(K);
  // Each bullet's rows (for its trail): the bullet's own vertical span, widened.
  const spans = bullets.map((b) => {
    let y0 = b.h, y1 = 0;
    for (let i = 0; i < b.v.length; i++) if (b.v[i]) {
      const y = (i / b.w) | 0;
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    return (y0 + y1) / 2;
  });
  const owner = (y: number) => spans.reduce((best, c, k) => (Math.abs(y - c) < Math.abs(y - spans[best]) ? k : best), 0);
  const fr = [0, 1, 2, 3, 4, 5].map((i) => {
    const t = i / 6;
    const bob = spans.map((_, k) => {
      const ph = rr(seed, k, 0, TAU);
      return Math.round(1.2 * Math.sin(t * TAU + ph)) - Math.round(1.2 * Math.sin(ph));
    });
    const bl = bullets.map((b, k) => moved(b, 0, bob[k]));
    let d = churn(dust, t, { amp: 1.3, ampY: 0.7, cell: 5, seed: seed + 1, flow: () => [-2, 0] });
    d = remap(d, (x, y) => [x, y - bob[owner(y)]]);
    const m = remap(main, (x, y) => [x + Math.round((Math.sin(t * TAU * 2 + y) - Math.sin(y)) * 1.2), y - bob[owner(y)]]);
    const p = moveBits(bits, (k, cx, cy) => {
      const u = drift(t, rr(seed + 2, k, 0, 1));
      return u > 0 && cx - 7 * u < 3 ? null : [-7 * u, bob[owner(cy)]];
    });
    return frameOf(d, m, p, ...bl);
  });
  return vfxSprite('multi', 'Earth multi: three rock bullets with dust trails', [K.ax, K.ay], { fly: { frames: fr, fps: 12, loop: true } });
}

/** breath: his cone of dust. The cloud churns and rolls outward from a still origin; the rocks tumble outward and the streaks slide. */
function breath(): WorldSprite {
  const K = key('breath'), seed = 7500;
  const ox = K.ax, oy = K.ay;  // the cone's tip (the caster's mouth or hands): the anchor
  const main = K.part('main'), bits = K.part('bits'), dust = dustOf(K);
  const fr = [0, 1, 2, 3, 4, 5].map((i) => {
    const t = i / 6;
    const reach = (x: number) => smooth(ox + 4, ox + 40, x);
    let d = churn(dust, t, { amp: 2.2, ampY: 1.6, cell: 7, seed, where: reach, flow: (x, y) => {
      const a = Math.atan2(y - oy, x - ox);
      return [Math.cos(a) * 2.5, Math.sin(a) * 2.5];
    } });
    d = wobble(d, t, 1, 12, seed + 1, (x) => smooth(ox + 40, ox + 110, x));
    const rocks = union(main, bits);
    const r = moveBits(rocks, (k, cx, cy, n) => {
      if (n > 220) return [0, 0];
      const u = drift(t, rr(seed + 2, k, 0, 1));
      const a = Math.atan2(cy - oy, cx - ox);
      const dist = Math.hypot(cx - ox, cy - oy);
      const step = (n > 30 ? 5 : 9) * u;
      if (step > 0 && dist + step > 128) return null;
      return [Math.cos(a) * step, Math.sin(a) * step + 1.5 * u * u];
    });
    return frameOf(d, r);
  });
  return vfxSprite('breath', 'Earth breath: cone of dust with tumbling rocks (anchor = cone origin)', [ox, oy], { fly: { frames: fr, fps: 12, loop: true } });
}

// --- stream -----------------------------------------------------------------------------------------

/**
 * His spikes in a row rise and sink in a wave that runs along the line. On frame 0 every spike is
 * as he drew it; on the others each spike sinks into the rubble by up to `amp` px, with a phase
 * from its place on the line (period 64 px, so the tile still tiles and the head joins it).
 * line: the row of the rubble's top (spike parts below it stay put, hidden behind the rubble).
 */
function spikeWave(L: Layer, t: number, line: number, x0: number, amp: number, seed: number): Layer {
  const rock = rockOf(L);
  const below = rock.filter((_v, _x, y) => y >= line);
  const above = rock.filter((_v, _x, y) => y < line);
  const out = above.empty();
  const env = (1 - Math.cos(t * TAU)) / 2;
  for (const pc of pieces(above)) {
    if (pc.length < 6) {
      for (const i of pc) out.v[i] = above.v[i];
      continue;
    }
    const [cx] = centre(above, pc);
    const ph = ((cx + x0) / 64) * TAU + rr(seed, Math.round(cx + x0) % 64, 0, 0.6);
    const d = Math.round(amp * env * (0.55 + 0.45 * Math.cos(t * TAU * 2 - ph)));
    for (const i of pc) {
      const y = ((i / above.w) | 0) + d;
      if (y < line) out.set(i % above.w, y, above.v[i]);
    }
  }
  return union(softOf(L), out, below);
}

/**
 * stream: his row of golden spikes over rubble, 64 px, the spikes rising and sinking in a wave
 * along the line (the tile still tiles). stream_head: his flaring end: the haze rolls up and on,
 * the spikes pulse with the same wave, and the chunks fly up and on.
 */
function stream(): WorldSprite[] {
  const KT = key('stream'), KH = key('stream_head'), seed = 7600;
  const line = KT.ay + 6;
  const T = union(KT.part('dust'), KT.part('main'), KT.part('bits'));
  const tile = [0, 1, 2, 3, 4, 5].map((i) => {
    const t = i / 6;
    // The tile wraps: spikes are found on a tile laid out twice, so one crossing the seam moves whole.
    const twice = new Layer(T.pal, 128, T.h);
    for (let y = 0; y < T.h; y++) for (let x = 0; x < 128; x++) twice.set(x, y, T.get(x % 64, y));
    const w = spikeWave(twice, t, line, 0, 7, seed);
    const out = T.empty();
    for (let y = 0; y < T.h; y++) for (let x = 0; x < 64; x++) out.set(x, y, w.get(x < 32 ? x + 64 : x, y));
    return out.render();
  });
  const hl = KH.ay + 6;
  const hm = KH.part('main'), hb = KH.part('bits'), hd = dustOf(KH);
  const head = [0, 1, 2, 3, 4, 5].map((i) => {
    const t = i / 6;
    const m = spikeWave(hm, t, hl, 64, 6, seed);
    let d = churn(hd, t, { amp: 1.6, cell: 6, seed: seed + 1, flow: () => [1.5, -1.5] });
    d = wobble(d, t, 1, 9, seed + 2, (x) => smooth(30, 70, x));
    const b = moveBits(hb, (k, cx, cy) => {
      const u = drift(t, rr(seed + 3, k, 0, 1));
      const up = cy < hl - 4;
      return up ? [3 * u, -5 * u + 2 * u * u] : [0, 0];
    });
    return frameOf(d, m, b);
  });
  return [
    vfxSprite('stream', 'Earth stream: golden spike row over rubble (tileable 64 px)', [0, KT.ay], { fly: { frames: tile, fps: 12, loop: true } }),
    vfxSprite('stream_head', 'Earth stream head: bigger spikes, dust haze and flying chunks', [KH.ax, KH.ay], { fly: { frames: head, fps: 12, loop: true } }),
  ];
}

// --- impacts ------------------------------------------------------------------------------------------

/**
 * hit: his rock explosion (frame 3 of 6 is his picture). A bright dusty core bursts out of the hit
 * point, the rocks and golden ray dashes fly out to his picture, then the core thins out while the
 * rocks fly on and drop.
 */
function hit(): WorldSprite {
  const K = key('hit'), seed = 7700;
  const dust = dustOf(K);
  const rocks = union(K.part('main'), K.part('bits'));
  const plan = [
    { s: 0.42, d: 0.45, cool: 0, dim: 1, thin: 0, fall: 0 },
    { s: 0.75, d: 0.75, cool: 0, dim: 0, thin: 0, fall: 0 },
    { s: 1, d: 1, cool: 0, dim: 0, thin: 0, fall: 0 },
    { s: 1.06, d: 1.16, cool: 1, dim: 0, thin: 0.12, fall: 1 },
    { s: 1.12, d: 1.32, cool: 2, dim: 1, thin: 0.32, fall: 3 },
    { s: 1.17, d: 1.46, cool: 3, dim: 3, thin: 0.52, fall: 5 },
  ];
  const fr = plan.map((p, i) => {
    let d = scaled(dust, p.s, p.s, K.ax, K.ay);
    if (i >= 3) d = churn(d, (i - 2) / 4, { amp: 1.5, cell: 6, seed });
    d = thinOut(settle(d, p.cool, p.dim), p.thin, seed + i, (x, y) => Math.min(1, Math.hypot(x - K.ax, y - K.ay) / 34));
    const r = moveBits(rocks, (k, cx, cy, n) => {
      if (i === 5 && n < 10 && k % 2) return null;
      return [(cx - K.ax) * (p.d - 1), (cy - K.ay) * (p.d - 1) + p.fall * (n > 20 ? 1 : 0.5)];
    });
    return frameOf(d, r);
  });
  return vfxSprite('hit', 'Earth hit: rock explosion (dusty core, rocks, golden rays)', [K.ax, K.ay], { hit: { frames: fr, fps: 15, loop: false } });
}

/**
 * multi_hit: the rock bullets' impact, his burst panel (frame 1 of 6 is his picture: the burst
 * at its fullest the instant the bullet strikes). The anchor is
 * the impact point, where his rays meet: the dust kicks back from it (left, toward the shooter)
 * and the broken chunks fly on (right). The renderer mirrors it for bullets flying left.
 */
function multiHit(): WorldSprite {
  const K = key('multi_hit'), seed = 7800;
  const dust = dustOf(K);
  const rocks = union(K.part('main'), K.part('bits'));
  const plan = [
    { s: 1, d: 1, cool: 0, dim: 0, thin: 0, fall: 0 },
    { s: 1.07, d: 1.14, cool: 0, dim: 0, thin: 0, fall: 1 },
    { s: 1.13, d: 1.28, cool: 1, dim: 0, thin: 0.12, fall: 2 },
    { s: 1.18, d: 1.4, cool: 2, dim: 1, thin: 0.3, fall: 4 },
    { s: 1.22, d: 1.5, cool: 3, dim: 2, thin: 0.48, fall: 6 },
    { s: 1.25, d: 1.58, cool: 4, dim: 4, thin: 0.62, fall: 9 },
  ];
  const fr = plan.map((p, i) => {
    let d = scaled(dust, p.s, 1 + (p.s - 1) * 0.6, K.ax, K.ay);
    if (i >= 1) d = churn(d, i / 6, { amp: 1.4, cell: 5, seed, flow: () => [-1.5, 0] });
    d = thinOut(settle(d, p.cool, p.dim), p.thin, seed + i, (x) => 1 - Math.min(1, Math.abs(x - K.ax) / 50));
    const r = moveBits(rocks, (k, cx, cy, n) => {
      if (i >= 4 && n < 8 && (k + i) % 2) return null;
      return [(cx - K.ax) * (p.d - 1), (cy - K.ay) * (p.d - 1) + p.fall * (n > 20 ? 1 : 0.6)];
    });
    return frameOf(d, r);
  });
  return vfxSprite('multi_hit', 'Earth multi impact: rock bullet burst (anchor = impact point; dust kicks back left, chunks fly right)', [K.ax, K.ay], { hit: { frames: fr, fps: 12, loop: false } });
}

/**
 * blast: his eruption (frame 4 of 8 is his picture). The shadow spreads on the ground and the dust
 * bursts out of the ground centre while his crystals thrust up out of the ground, the middle ones
 * first; then the dust billows out and thins, the rocks fall, and the crystals sink back into the
 * ground.
 */
function blast(): WorldSprite {
  const K = key('blast'), seed = 7900;
  const shade = K.part('shade'), dust = dustOf(K);
  const loose = union(K.part('main'), K.part('bits'));
  const crystals: Layer[] = [];
  for (let k = 0; K.has('k' + k); k++) crystals.push(K.part('k' + k));
  // The chunks at its foot come up out of the ground with the crystals.
  for (const pc of pieces(K.part('rocks'))) {
    const L = K.part('rocks').empty();
    const src = K.part('rocks');
    for (const j of pc) L.v[j] = src.v[j];
    crystals.push(L);
  }
  // Each crystal's base (its lowest pixel) and height, and how far it stands from the centre.
  const info = crystals.map((c) => {
    let y0 = c.h, y1 = 0, sx = 0, n = 0;
    for (let i = 0; i < c.v.length; i++) if (c.v[i]) {
      const y = (i / c.w) | 0;
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      sx += i % c.w;
      n++;
    }
    return { base: y1, h: y1 - y0 + 1, off: Math.abs(sx / Math.max(1, n) - K.ax) / 100 };
  });
  // Up: how much of each crystal shows (0 = still underground, 1 = his picture).
  const up = (i: number, off: number) => {
    const rise = [0.3, 0.66, 0.92, 1, 1, 0.9, 0.62, 0.3][i];
    return i < 3 ? clamp(rise - off * 0.3, 0, 1) : rise;
  };
  const plan = [
    { sh: 0.5, ds: 0.55, cool: 0, dim: 0, thin: 0, bits: 0 },
    { sh: 0.78, ds: 0.8, cool: 0, dim: 0, thin: 0, bits: 0.4 },
    { sh: 0.94, ds: 0.95, cool: 0, dim: 0, thin: 0, bits: 0.8 },
    { sh: 1, ds: 1, cool: 0, dim: 0, thin: 0, bits: 1 },
    { sh: 1.02, ds: 1.04, cool: 0, dim: 0, thin: 0, bits: 1.2 },
    { sh: 1.04, ds: 1.08, cool: 1, dim: 0, thin: 0.1, bits: 1.4 },
    { sh: 1.05, ds: 1.11, cool: 2, dim: 1, thin: 0.25, bits: 1.6 },
    { sh: 1.06, ds: 1.14, cool: 3, dim: 2, thin: 0.42, bits: 1.8 },
  ];
  const fr = plan.map((p, i) => {
    let sh = scaled(shade, p.sh, p.sh, K.ax, K.ay);
    sh = dimSoft(sh, i === 0 ? 2 : i >= 6 ? i - 5 : 0);
    let d = scaled(dust, p.ds, p.ds, K.ax, K.ay);
    if (i >= 4) d = churn(d, (i - 3) / 6, { amp: 1.8, cell: 7, seed, flow: (x) => [Math.sign(x - K.ax) * 1.5, -1] });
    d = thinOut(settle(d, p.cool, p.dim), p.thin, seed + i, (x, y) => Math.min(1, Math.hypot((x - K.ax) / 110, (y - K.ay) / 70)) * 0.5 + 0.25);
    const ks = crystals.map((c, k) => {
      const u = up(i, info[k].off);
      if (u >= 1) return c;
      if (u <= 0) return null;
      // The crystal thrusts up out of the ground (or sinks back): moved down and cut at its foot,
      // the cut broken a little so it reads as rock breaking through the ground.
      const sink = Math.round(info[k].h * (1 - u));
      return cut(moved(c, 0, sink), (x, y) => y <= info[k].base - 1 + Math.round(2.5 * (pnoise(x, k, 3, 0, 0, seed + 5) - 0.5) * 2));
    });
    const r = p.bits === 1 ? loose : moveBits(loose, (k, cx, cy, n) => {
      if (p.bits < 1 && Math.hypot(cx - K.ax, cy - K.ay) > 70 * p.bits + 10) return null;
      if (i === 7 && n < 12 && k % 2) return null;
      const s = p.bits - 1;
      return [(cx - K.ax) * s * 0.25, (cy - K.ay) * s * 0.2 + (s > 0 ? 6 * s * s : 0)];
    });
    return frameOf(sh, d, ...ks, r);
  });
  return vfxSprite('blast', 'Earth blast: crystal spikes erupting in a dust cloud (anchor = ground centre)', [K.ax, K.ay], { blast: { frames: fr, fps: 12, loop: false } });
}

// --- walls --------------------------------------------------------------------------------------------

/**
 * A wall: `rise` pushes his stone up out of the ground (each column comes up from its own ground
 * point, so the 3/4 and end-on walls rise along their footprint), kicking up his dust and rubble
 * at the base; its last frame is his picture, ready for `idle`. `idle` (4 frames) keeps the stone
 * still while the moss and vines stir, the dust at the base drifts and the pebbles settle.
 */
function wall(kind: 'wall' | 'wall_diag' | 'wall_depth', label: string, seed: number): WorldSprite {
  const K = key(kind);
  const main = K.part('main'), bits = K.part('bits'), dust = dustOf(K);
  // Each column's ground point: the foot of his stone in that column (the lowest pixel within
  // a few columns, so a rubble gap does not cut a column short).
  const foot = new Array<number>(K.w).fill(-1);
  for (let x = 0; x < K.w; x++) for (let y = K.h - 1; y >= 0; y--) if (main.get(x, y)) {
    foot[x] = y;
    break;
  }
  const g = foot.map((_, x) => {
    let best = -1;
    for (let k = -6; k <= 6; k++) best = Math.max(best, foot[clamp(x + k, 0, K.w - 1)]);
    return best < 0 ? K.ay : best;
  });
  // Each column's own height above its ground point; a column rises at most the wall's own rise
  // (so the 3/4 and end-on walls come up along their footprint, as the ground under them would).
  const topY = new Array<number>(K.w).fill(K.h);
  for (let i = 0; i < main.v.length; i++) if (main.v[i]) topY[i % K.w] = Math.min(topY[i % K.w], (i / K.w) | 0);
  const lift = kind === 'wall' ? 999 : kind === 'wall_diag' ? 118 : 122;
  const colH = g.map((gy, x) => (topY[x] < K.h ? Math.min(lift, gy - topY[x] + 2) : 0));
  const green = (v: number) => {
    if (!v) return false;
    const c = main.pal.cols[v - 1];
    return main.pal.kind(v) !== 'dust' && c[1] > c[0] + 4;
  };
  const idleAt = (t: number) => {
    // Moss and vines stir (only his greens move, by a pixel), the stone stays.
    const m = remap(main, (x, y) => {
      if (!green(main.get(x, y))) return [x, y];
      const [dx, dy] = circleDisp(x, y, t, 9, seed);
      const sx = Math.round(x - dx * 0.9), sy = Math.round(y - dy * 0.6);
      return green(main.get(sx, sy)) ? [sx, sy] : [x, y];
    });
    const d = churn(dust, t, { amp: 1.4, ampY: 0.8, cell: 6, seed: seed + 1, flow: () => [1.2, -0.4] });
    const b = moveBits(bits, (k) => {
      const ph = rr(seed + 2, k, 0, TAU);
      return [0, Math.round(0.6 * (Math.sin(t * TAU + ph) - Math.sin(ph)))];
    });
    return { m, d, b };
  };
  const idle = [0, 1, 2, 3].map((i) => {
    const { m, d, b } = idleAt(i / 4);
    return frameOf(d, m, b);
  });
  const heights = [0.18, 0.4, 0.62, 0.82, 0.95, 1];
  const rise = heights.map((s, i) => {
    // (neighbouring columns smoothed, so the rising top edge stays his outline, a little uneven)
    const sink = (x: number) => {
      let h = 0;
      for (let k = -3; k <= 3; k++) h = Math.max(h, colH[clamp(x + k, 0, K.w - 1)]);
      return Math.round(h * (1 - s) * (0.9 + 0.2 * pnoise(x, 0, 24, 0, 0, seed + 3)));
    };
    const m = i === 5 ? main : cut(remap(main, (x, y) => [x, y - sink(x)]), (x, y) => y <= g[x]);
    // His dust and rubble at the base burst up with it, then settle into his picture.
    const d = i === 5 ? dust : dimSoft(wobble(dust, i / 6, 2, 8, seed + 4), i < 2 ? 1 : 0);
    const b = i === 5 ? bits : i < 2 ? null : moveBits(bits, (k) => {
      const u = 1 - s;
      return [0, -Math.round(10 * u * (1 + (k % 3)))];
    });
    return frameOf(d, m, b);
  });
  return vfxSprite(kind, label, [K.ax, K.ay], { rise: { frames: rise, fps: 12, loop: false }, idle: { frames: idle, fps: 8, loop: true } });
}

// --- aura ---------------------------------------------------------------------------------------------

/**
 * His aura in two frame-synchronized layers with the same size and anchor (the feet):
 * `aura_back` goes BEHIND the character (his two columns of rocks and golden pebbles, the dust
 * ring's far arc and its sides); `aura` goes OVER it (the ring's near arc across the waist and the
 * pebbles on the ground at the feet). His figure is not tinted, so the middle stays clear. The
 * rocks bob up and down in a wave that climbs the columns, the small pebbles rise, and the ring's
 * dust flows round (both layers in step).
 */
function aura(): WorldSprite[] {
  const KB = key('aura_back'), KF = key('aura'), seed = 8000;
  const flow = (x: number, y: number): [number, number] => {
    // Round the figure: right along the near arc (below the waist), left along the far arc.
    const near = y > KB.ay - 70;
    return [near ? 2 : -2, x < KB.ax ? (near ? -0.5 : 0.5) : near ? 0.5 : -0.5];
  };
  const layer = (K: Key, i: number): Canvas => {
    const t = i / 6;
    const rocks = union(K.part('main'), K.part('bits'));
    const d = churn(dustOf(K), t, { amp: 1.2, ampY: 0.8, cell: 6, seed, flow });
    const r = moveBits(rocks, (k, cx, cy, n) => {
      if (cy > K.ay - 2) return [0, 0];                       // pebbles on the ground stay
      const ph = (cy / 20) * TAU;
      const bob = Math.round(2 * (Math.sin(t * TAU + ph) - Math.sin(ph)));
      if (n <= 12) {
        const u = drift(t, rr(seed + 1, k, 0, 1));
        return [0, -6 * u + bob * 0.5];
      }
      return [0, bob];
    });
    return frameOf(d, r);
  };
  const back = [0, 1, 2, 3, 4, 5].map((i) => layer(KB, i));
  const front = [0, 1, 2, 3, 4, 5].map((i) => layer(KF, i));
  return [
    vfxSprite('aura', 'Earth aura, front layer (draw OVER the character): dust ring near arc, pebbles at the feet', [KF.ax, KF.ay], { idle: { frames: front, fps: 10, loop: true } }),
    vfxSprite('aura_back', 'Earth aura, back layer (draw BEHIND the character): rock columns and the dust ring', [KB.ax, KB.ay], { idle: { frames: back, fps: 10, loop: true } }),
  ];
}

// --- frames, checks and output -------------------------------------------------------------------------

/**
 * Trims sprites to what their frames use, plus one clear pixel all round, and moves the anchor
 * with the trim. Sprites given together share one frame (the two aura layers). With `keepLeft`
 * the frame's left edge stays at his (the stream head's joint with the last tile).
 */
function fit(sprites: WorldSprite[], keepLeft = false): WorldSprite[] {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (const s of sprites) for (const a of Object.values(s.anims)) for (const f of a.frames)
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (f.alpha(x, y)) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  const f0 = Object.values(sprites[0].anims)[0].frames[0];
  const L = keepLeft ? PAD : Math.max(0, x0 - 1), T = Math.max(0, y0 - 1);
  const R = Math.min(f0.w - 1, x1 + 1), B = Math.min(f0.h - 1, y1 + 1);
  const w = R - L + 1, h = B - T + 1;
  return sprites.map((s) => {
    const anims = Object.fromEntries(Object.entries(s.anims).map(([k, a]) => [k, { ...a, frames: a.frames.map((f) => {
      const c = new Canvas(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const px = f.get(L + x, T + y);
        if (px[3]) c.set(x, y, px);
      }
      return c;
    }) }]));
    return vfxSprite(s.name, s.label, [s.anchor[0] - L, s.anchor[1] - T], anims);
  });
}

/**
 * No frame may have art on its border, except the stream tile's left and right (it wraps) and the
 * head's left (the joint).
 */
function borderCheck(s: WorldSprite): string[] {
  const bad: string[] = [];
  for (const [an, a] of Object.entries(s.anims))
    a.frames.forEach((f, i) => {
      const sides = { top: 0, bottom: 0, left: 0, right: 0 };
      for (let x = 0; x < f.w; x++) {
        if (f.alpha(x, 0)) sides.top++;
        if (f.alpha(x, f.h - 1)) sides.bottom++;
      }
      for (let y = 0; y < f.h; y++) {
        if (f.alpha(0, y)) sides.left++;
        if (f.alpha(f.w - 1, y)) sides.right++;
      }
      if (s.name === 'stream') sides.left = sides.right = 0;
      if (s.name === 'stream_head') sides.left = 0;
      for (const [side, nPx] of Object.entries(sides)) if (nPx) bad.push(`${s.name} ${an}[${i}] ${side}: ${nPx} px`);
    });
  return bad;
}

/** The sprites in the order of the vfx_earth manifest (beast copied through), with multi_hit after multi and aura_back after aura. */
const ORDER = ['bolt', 'beast', 'stream', 'stream_head', 'breath', 'sphere', 'slash', 'multi', 'multi_hit', 'hit', 'blast', 'wall', 'aura', 'aura_back', 'wall_diag', 'wall_depth'];

/**
 * The stream tile and its head on one frame height and one anchor row (the line), so they line up
 * when drawn side by side in any layout, not only by their anchors: the tile gets empty rows above
 * (for the head's flying chunks) and both get the same rows below.
 */
function lineUp(tile: WorldSprite, head: WorldSprite): WorldSprite[] {
  // The rows the art of either uses, above and below the line, plus one clear row each way.
  let above = 0, below = 0;
  for (const s of [tile, head]) for (const f of s.anims.fly.frames)
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (f.alpha(x, y)) {
      above = Math.max(above, s.anchor[1] - y + 1);
      below = Math.max(below, y - s.anchor[1] + 2);
    }
  const pad = (s: WorldSprite): WorldSprite => {
    const dy = above - s.anchor[1];
    const anims = Object.fromEntries(Object.entries(s.anims).map(([k, a]) => [k, { ...a, frames: a.frames.map((f) => {
      const c = new Canvas(f.w, above + below);
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
        const px = f.get(x, y);
        if (px[3]) c.set(x, y + dy, px);
      }
      return c;
    }) }]));
    return vfxSprite(s.name, s.label, [s.anchor[0], above], anims);
  };
  return [pad(tile), pad(head)];
}

export function earthV3Sprites(): WorldSprite[] {
  const [tile, head] = stream();
  return [
    ...fit([bolt()]), ...lineUp(tile, fit([head], true)[0]), ...fit([breath()]), ...fit([sphere()]), ...fit([slash()]), ...fit([multi()]),
    ...fit([multiHit()]), ...fit([hit()]), ...fit([blast()]),
    ...fit([wall('wall', 'Earth wall: fitted stone slabs with moss, grass and rubble (4.5 m)', 8100)]),
    ...fit(aura()),
    ...fit([wall('wall_diag', 'Earth wall (3/4): stone slabs along the diagonal, vines and rubble', 8200)]),
    ...fit([wall('wall_depth', 'Earth wall (end-on): overgrown stone pillar running into the screen', 8300)]),
  ];
}

function main(): void {
  // Staging only: refuse to run without WORLD_OUT, so nothing is ever written into src/assets.
  const worldOut = process.env.WORLD_OUT;
  if (!worldOut) throw new Error('vfx-earth-v3: set WORLD_OUT to the staging folder (this generator never writes into src/assets)');
  const group = 'vfx_earth_v3';
  const beastSrc = join(worldOut, 'vfx_earth', 'beast.png');
  const oldManifest = join(worldOut, 'vfx_earth', 'manifest.json');
  if (!existsSync(beastSrc) || !existsSync(oldManifest)) throw new Error(`vfx-earth-v3: the earth beast is copied from ${beastSrc}; it is missing`);
  const sprites = earthV3Sprites();
  const bad = sprites.flatMap(borderCheck);
  const nFrames = sprites.reduce((n, s) => n + Object.values(s.anims).reduce((m, a) => m + a.frames.length, 0), 0);
  console.log(bad.length ? `border check FAILED:\n  ${bad.join('\n  ')}` : `border check: ${sprites.length} sprites, ${nFrames} frames, no pixel on any frame border (stream tiles and the head joint excepted)`);
  if (bad.length) process.exitCode = 1;
  // Every file is written whole under a temp folder, then moved in: PNGs first, the manifest last.
  const tmpRoot = join(worldOut, '.vfx-earth-v3-tmp');
  rmSync(tmpRoot, { recursive: true, force: true });
  writeGroup(group, sprites, tmpRoot);
  const tmpDir = join(tmpRoot, group);
  copyFileSync(beastSrc, join(tmpDir, 'beast.png'));
  const ours = JSON.parse(readFileSync(join(tmpDir, 'manifest.json'), 'utf8'));
  const old = JSON.parse(readFileSync(oldManifest, 'utf8'));
  const all: Record<string, unknown> = { ...ours.sprites, beast: old.sprites.beast };
  const manifest = { group, pxPerMeter: PX_PER_M, sprites: Object.fromEntries(ORDER.filter((n) => all[n]).map((n) => [n, all[n]])) };
  writeFileSync(join(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  const dest = join(worldOut, group);
  mkdirSync(dest, { recursive: true });
  const files = readdirSync(tmpDir).sort((a, b) => Number(a === 'manifest.json') - Number(b === 'manifest.json') || (a < b ? -1 : a > b ? 1 : 0));
  for (const f of files) renameSync(join(tmpDir, f), join(dest, f));
  rmSync(tmpRoot, { recursive: true, force: true });
  for (const s of sprites) {
    const f0 = Object.values(s.anims)[0].frames[0];
    const anims = Object.entries(s.anims).map(([k, a]) => `${k}:${a.frames.length}@${a.fps}${a.loop === false ? ' once' : ''}`).join(' ');
    console.log(`${group} ${s.name.padEnd(12)} ${f0.w}x${f0.h} anchor ${s.anchor} ${anims}`);
  }
}

main();
