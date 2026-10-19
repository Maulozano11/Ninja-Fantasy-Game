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
// from the key frame, so the key frame of each animation is his picture. The owner found the jutsu
// too fast ("like a flashing star"), so every animation has about twice the frames, moving a
// little from one to the next, and the light changes evenly (the build prints a flash check):
//   - fly loops    8 frames at 12 fps: frame 0 is his picture; displacements run round a small
//                  circle and drifts wrap, so the loop closes;
//   - hit,         12 frames at 12 fps: builds up over 3, his picture (frame 3) held for 3 with only
//     multi_hit    a little churn, then the dust spreads, settles and fades from its rim inward over
//                  6 while the rocks fly on, fall and crumble away from their outline inward (no
//                  solid rock is left in the last frame);
//   - blast        16 frames at 12 fps: anticipation over 4, his picture (frame 4) held for 3, a
//                  settle over 9 (the dust fades, the rocks fall and crumble, the crystals sink back);
//   - walls        'rise' 12 frames at 12 fps (ease-out) ending on his picture; 'idle' 8 frames at 10 fps;
//   - aura         12 frames at 10 fps, both layers in step.
// In-between frames never open holes: dust lies under the rocks ('under'), pinholes and clear
// pockets where his picture has art are filled from the dust round them (a one-shot's last frame
// excepted), and a wall's frames are sealed (nothing see-through inside). His rims travel with
// their rock (the extractor gives them to it), a drifting pebble carries its dark halo of dust, his
// dark flecks ride on the dust, and nothing is dithered: dust fades in soft bands one alpha step
// apart (rim first), and rock wears away as an outlined stone. A blast crystal's foot ends raggedly
// in the dust as it rises or sinks (no line along the cut), and the walls start wholly below the
// ground and ease out into his picture, the loose rubble landing at their feet at the end.
// Same sprite names and anims as vfx_earth, plus `multi_hit` (the rock bullets' impact, his
// unlabelled panel) and `aura_back`. Frames are sized to his art and the anchors moved with it.
// The earth beast is out of scope: beast.png is copied through from vfx_earth unchanged.
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
/** One Scale2x (EPX) pass on an index grid: each pixel becomes 2x2, its corners taking a neighbour's value where two neighbours agree (edges stay lines). */
function scale2x(v: Uint8Array, w: number, h: number): Uint8Array {
  const o = new Uint8Array(w * h * 4);
  const at = (x: number, y: number) => v[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
    const W2 = w * 2, i = y * 2 * W2 + x * 2;
    o[i] = C === A && C !== D && A !== B ? A : P;
    o[i + 1] = A === B && A !== C && B !== D ? B : P;
    o[i + W2] = D === C && D !== B && C !== A ? C : P;
    o[i + W2 + 1] = B === D && B !== A && D !== C ? D : P;
  }
  return o;
}

/**
 * Turned by `a` radians about (cx, cy) the RotSprite way: the layer is first enlarged 8x with three
 * Scale2x passes (which keep his 1 px cracks and rims as lines), then each pixel samples that
 * enlargement at its own rotated centre. A plain nearest-neighbour turn breaks his thin cracks into
 * dotted lines that crawl from frame to frame.
 */
function rotSprite(L: Layer, a: number, cx: number, cy: number): Layer {
  if (Math.abs(a) < 1e-4) return L.clone();
  let x0 = L.w, y0 = L.h, x1 = -1, y1 = -1;
  for (let i = 0; i < L.v.length; i++) if (L.v[i]) {
    const x = i % L.w, y = (i / L.w) | 0;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  if (x1 < 0) return L.clone();
  x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(L.w - 1, x1 + 2); y1 = Math.min(L.h - 1, y1 + 2);
  let w = x1 - x0 + 1, h = y1 - y0 + 1;
  let v: Uint8Array = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) v[y * w + x] = L.v[(y + y0) * L.w + x + x0];
  for (let k = 0; k < 3; k++) {
    v = scale2x(v, w, h);
    w *= 2;
    h *= 2;
  }
  const c = Math.cos(a), sn = Math.sin(a);
  const out = L.empty();
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
    const sx = cx + dx * c + dy * sn - x0, sy = cy - dx * sn + dy * c - y0;
    const u = Math.floor(sx * 8), t = Math.floor(sy * 8);
    if (u >= 0 && t >= 0 && u < w && t < h) out.v[y * L.w + x] = v[t * w + u];
  }
  return out;
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

/**
 * Each piece (rock, pebble) moved as a whole: move(k, cx, cy, size) gives its offset, or null to
 * drop it. A piece that would reach the edge of the (padded) frame is dropped whole, never cut.
 */
function moveBits(L: Layer, move: (k: number, cx: number, cy: number, n: number) => [number, number] | null): Layer {
  const out = L.empty();
  pieces(L).forEach((pc, k) => {
    const [cx, cy] = centre(L, pc);
    const m = move(k, cx, cy, pc.length);
    if (!m) return;
    const dx = Math.round(m[0]), dy = Math.round(m[1]);
    if (pc.some((i) => {
      const x = (i % L.w) + dx, y = ((i / L.w) | 0) + dy;
      return x < 1 || y < 1 || x > L.w - 2 || y > L.h - 2;
    })) return;
    for (const i of pc) out.set((i % L.w) + dx, ((i / L.w) | 0) + dy, L.v[i]);
  });
  return out;
}

/**
 * Keeps only the pixels keep(x, y) picks; where rock was cut, the new edge gets his rim (so a
 * rising or crumbling rock keeps a clean outline), unless `rimCut` is false (a crystal's foot cut
 * where it sinks into the dust: no line is drawn there, the dust takes it). Tiny crumbs left
 * floating are dropped.
 */
function cut(L: Layer, keep: (x: number, y: number) => boolean, minPiece = 3, rimCut = true): Layer {
  const out = L.empty();
  const gone = new Uint8Array(L.v.length);
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const i = y * L.w + x;
    if (!L.v[i]) continue;
    if (keep(x, y)) out.v[i] = L.v[i];
    else gone[i] = 1;
  }
  if (rimCut) for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
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

/** His dust and shadow `k` whole alpha steps fainter (no dither). */
const dimSoft = (L: Layer, k: number): Layer => (k <= 0 ? L.clone() : L.map((v) => L.pal.dim(v, Math.round(k))));
/**
 * His dust (or shadow) faded with no dither: each pixel steps `cool` colours down his dust ramp and
 * loses round(dim x w(x, y)) alpha steps, where w is a smooth field (more at the cloud's rim, less
 * at its heart, with soft lumps). The dust thins from its edges inward in soft bands one alpha step
 * apart that move a little each frame, never as a per-pixel speckle; a pixel whose alpha runs out
 * goes, so the cloud also shrinks from its edges.
 */
const fadeSoft = (L: Layer, cool: number, dim: number, w: (x: number, y: number) => number): Layer =>
  cool <= 0 && dim <= 0 ? L.clone() : L.map((v, x, y) => L.pal.dim(L.pal.cool(v, cool), dim > 0 ? Math.round(dim * w(x, y)) : 0));
/** A fade field for fadeSoft: 1.45 at the cloud's rim down to 0.55 at its heart (`heart` 0..1), with soft lumps of `cell` px. */
const fadeField = (heart: (x: number, y: number) => number, seed: number, cell = 9) =>
  (x: number, y: number): number => 1.45 - 0.9 * heart(x, y) + 0.4 * (pnoise(x, y, cell, 0, 0, seed) - 0.5);
/**
 * The last of the dust breaking into wisps: a dust pixel goes once a coherent noise (lumps of a few
 * px, so the dust parts in soft wisps, not grain), nudged by `heart` (0..1, the heart goes last),
 * drops under `level` (0 keeps all, 1 drops all). Only the last frame or two of a one-shot use it.
 */
const thinWisps = (L: Layer, level: number, seed: number, heart: (x: number, y: number) => number = () => 0.5): Layer =>
  level <= 0 ? L : L.filter((v, x, y) => L.pal.kind(v) !== 'dust' || pnoise(x, y, 4, 0, 0, seed) * 0.55 + pnoise(x, y, 11, 0, 0, seed + 1) * 0.2 + heart(x, y) * 0.25 > level);

/**
 * Rock moved and crumbling away, piece by piece (pieces of the unmoved layer, so each rock keeps its
 * identity and its timing from frame to frame): move(k, cx, cy, n) gives a piece's offset (null
 * drops it), level(k, cx, cy, n) how far it has crumbled (0 = whole, 1 = gone).
 *   - A rock wears away from its outline inward: the pixels nearest its edge go first, a little
 *     unevenly (a noise in the rock's own coordinates, so its edge breaks up the same way from frame
 *     to frame and travels with it), and every new edge pixel takes his rim. It shrinks as one
 *     outlined stone with his cracks inside: never a sponge with holes, never a web of crack lines.
 *     Its area falls about linearly with the level, so no frame takes much more than another.
 *   - A few chips (bits of its edge, his own pixels) break off as it goes, each at a level of its
 *     own, and fall away outward for about two frames (`step` is the level a frame adds).
 *   - A pebble too small to wear drops a little and goes whole once the level passes its own point.
 * A piece that would reach the frame's edge is dropped.
 */
function moveCrumble(L: Layer, move: (k: number, cx: number, cy: number, n: number) => [number, number] | null,
  level: (k: number, cx: number, cy: number, n: number) => number, seed: number, step = 0.28): Layer {
  const out = L.empty();
  const { w } = L;
  const rim = L.pal.rim;
  const fits = (px: number[], dx: number, dy: number) => !px.some((i) => {
    const x = (i % w) + dx, y = ((i / w) | 0) + dy;
    return x < 1 || y < 1 || x > L.w - 2 || y > L.h - 2;
  });
  // (its body pixels on its own edge take his rim, so whatever is left is an outlined stone)
  const outlined = (px: number[]): number[] => {
    const s = new Set(px);
    return px.map((i) => (L.pal.kind(L.v[i]) === 'body' && [i - 1, i + 1, i - w, i + w].some((j) => !s.has(j)) ? rim : L.v[i]));
  };
  const place = (px: number[], vals: number[], dx: number, dy: number) => {
    if (fits(px, dx, dy)) px.forEach((i, j) => out.set((i % w) + dx, ((i / w) | 0) + dy, vals[j]));
  };
  pieces(L).forEach((pc, k) => {
    const [pcx, pcy] = centre(L, pc);
    const n = pc.length;
    const m = move(k, pcx, pcy, n);
    if (!m) return;
    const mx = Math.round(m[0]), my = Math.round(m[1]);
    const c = clamp(level(k, pcx, pcy, n), 0, 1);
    if (c <= 0) return place(pc, pc.map((i) => L.v[i]), mx, my);
    if (n < 10) {
      if (c < 1 && c < 0.25 + 0.6 * rr(seed, k, 0, 1)) place(pc, pc.map((i) => L.v[i]), mx, my + Math.round(3 * c * c));
      return;
    }
    const inPc = new Set(pc);
    // Depth from the rock's edge (4-way).
    const depth = new Map<number, number>();
    let front: number[] = [];
    for (const i of pc) if ([i - 1, i + 1, i - w, i + w].some((j) => !inPc.has(j))) {
      depth.set(i, 0);
      front.push(i);
    }
    let D = 0;
    while (front.length) {
      const next: number[] = [];
      for (const i of front) for (const j of [i - 1, i + 1, i - w, i + w]) if (inPc.has(j) && !depth.has(j)) {
        depth.set(j, depth.get(i)! + 1);
        D = Math.max(D, depth.get(i)! + 1);
        next.push(j);
      }
      front = next;
    }
    const xs = pc.map((i) => i % w), ys = pc.map((i) => (i / w) | 0);
    const bx = Math.min(...xs), by = Math.min(...ys);
    // Chips: small bits of its edge (a blob round an edge pixel, at angles of their own round the
    // rock), each breaking off at its own level and falling for about two frames.
    const nc = n < 50 ? 0 : clamp(Math.round(n / 110), 1, 2);
    const edge = pc.filter((i) => depth.get(i) === 0);
    const chipOf = new Map<number, number>();
    const chips: { px: number[]; at: number; dir: number }[] = [];
    for (let j = 0; j < nc; j++) {
      const a = rr(seed + 3, k * 5 + j, 0, TAU);
      let best = edge[0], bd = -Infinity;
      for (const i of edge) {
        const d = Math.cos(Math.atan2(((i / w) | 0) - pcy, (i % w) - pcx) - a);
        if (d > bd) {
          bd = d;
          best = i;
        }
      }
      const r = n > 120 ? 2 : 1;
      const sx = best % w, sy = (best / w) | 0;
      const px = pc.filter((i) => !chipOf.has(i) && Math.abs((i % w) - sx) <= r && Math.abs(((i / w) | 0) - sy) <= r && depth.get(i)! <= 2 * r);
      // (a chip with almost no rock inside its rim would fall as a hollow ring: none)
      if (px.length < 4 || px.filter((i) => L.pal.kind(L.v[i]) === 'body').length < 3) continue;
      for (const i of px) chipOf.set(i, chips.length);
      chips.push({ px, at: 0.08 + (j / nc) * 0.55 + rr(seed + 4, k * 5 + j, 0, 0.12), dir: Math.sign(sx - pcx) || 1 });
    }
    // Worn from the outside in: the area left goes down about linearly with c.
    const e = (D + 1) * (1 - Math.sqrt(1 - c));
    const kept = c >= 1 ? [] : pc.filter((i) => {
      const ch = chipOf.get(i);
      if (ch !== undefined && c >= chips[ch].at) return false;
      return depth.get(i)! + pnoise((i % w) - bx, ((i / w) | 0) - by, 2.5, 0, 0, seed + 9 + k) * 0.95 >= e;
    });
    if (kept.length >= 3) place(kept, outlined(kept), mx, my);
    for (const ch of chips) {
      const age = (c - ch.at) / step;
      if (c >= 1 || age < 0 || age >= 2.2) continue;
      const dx = Math.round(ch.dir * (1 + 1.5 * age)), dy = Math.round(1 + 2 * age + 1.5 * age * age);
      // (his own pixels: his rim on the side that was the rock's outside, his rock inside)
      place(ch.px, ch.px.map((i) => L.v[i]), mx + dx, my + dy);
    }
  });
  return out;
}

/** Drift that starts at 0 and wraps (a pebble leaving is replaced by one arriving). */
const drift = (t: number, ph: number) => fract(ph + t) - ph;

/** Rock (body and rim) and soft (dust and shade) parts of a layer. */
const rockOf = (L: Layer) => L.filter((v) => ['body', 'outline'].includes(L.pal.kind(v)!));
const softOf = (L: Layer) => L.filter((v) => ['dust', 'shade'].includes(L.pal.kind(v)!));

/** His dust, continued under the rocks sitting in it (so a rock that moves leaves dust, not a hole). */
const dustOf = (K: Key): Layer => union(K.part('under'), K.part('dust'));

/** A mask grown (r > 0) or shrunk (r < 0) by |r| px (square neighbourhood, one px a step). */
function grow(m: Uint8Array, w: number, h: number, r: number): Uint8Array {
  let cur = m;
  for (let k = 0; k < Math.abs(r); k++) {
    const nx = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let any = 0, all = 1;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const u = x + dx, v = y + dy;
        const on = u >= 0 && v >= 0 && u < w && v < h ? cur[v * w + u] : 0;
        any |= on;
        all &= on;
      }
      nx[y * w + x] = r > 0 ? any : all;
    }
    cur = nx;
  }
  return cur;
}

/**
 * A layer's silhouette: its pixels and every clear pixel it encloses (the border cannot reach it
 * through clear). With `close`, bays narrower than about 2 x close px count as inside too (the
 * gaps his crystals leave in the cloud open to its top).
 */
function silhouette(L: Layer, close = 0): Uint8Array {
  const { w, h } = L;
  const base = close ? grow(L.v.map((v) => (v ? 1 : 0)), w, h, close) : L.v;
  const seen = new Uint8Array(w * h);
  const st: number[] = [];
  const push = (i: number) => {
    if (!base[i] && !seen[i]) {
      seen[i] = 1;
      st.push(i);
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (st.length) {
    const i = st.pop()!;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w);
    if (y < h - 1) push(i + w);
  }
  const sil = seen.map((s) => (s ? 0 : 1));
  return close ? grow(sil, w, h, -close) : sil;
}

/**
 * Pinholes an in-between frame opened where his key frame has art (a rock moved off, dust churned
 * apart): a clear pixel with art on at least three of its four sides takes the commonest dust value
 * round it (else the commonest value). His own pinholes (his dithered dust edges) stay, so the
 * dither does not flicker.
 */
function patch(L: Layer, key: Layer): Layer {
  const out = L.clone();
  for (let y = 1; y < L.h - 1; y++) for (let x = 1; x < L.w - 1; x++) {
    const i = y * L.w + x;
    if (L.v[i] || !key.v[i]) continue;
    const nb = [L.v[i - 1], L.v[i + 1], L.v[i - L.w], L.v[i + L.w]].filter((v) => v);
    if (nb.length < 3) continue;
    const soft = nb.filter((v) => L.pal.kind(v) === 'dust');
    const from = soft.length ? soft : nb;
    out.v[i] = from.reduce((best, v) => (from.filter((u) => u === v).length > from.filter((u) => u === best).length ? v : best), from[0]);
  }
  return out;
}

/**
 * A wall is solid: any clear pocket a rising frame encloses (the border cannot reach it through
 * clear pixels) is filled in from its edge inward, each pixel taking the commonest value round it
 * (dust where there is dust), so no ground ever shows through the stone.
 */
function seal(L: Layer, only?: Layer): Layer {
  const out = L.clone();
  const sil = silhouette(L);
  let todo: number[] = [];
  for (let i = 0; i < L.v.length; i++) if (sil[i] && !L.v[i] && (!only || only.v[i])) todo.push(i);
  while (todo.length) {
    const next: number[] = [], set: [number, number][] = [];
    for (const i of todo) {
      const x = i % L.w, y = (i / L.w) | 0;
      const nb = [x > 0 ? out.v[i - 1] : 0, x < L.w - 1 ? out.v[i + 1] : 0, y > 0 ? out.v[i - L.w] : 0, y < L.h - 1 ? out.v[i + L.w] : 0].filter((v) => v);
      if (!nb.length) {
        next.push(i);
        continue;
      }
      const soft = nb.filter((v) => L.pal.kind(v) === 'dust');
      const from = soft.length ? soft : nb;
      set.push([i, from.reduce((best, v) => (from.filter((u) => u === v).length > from.filter((u) => u === best).length ? v : best), from[0])]);
    }
    if (!set.length) break;
    for (const [i, v] of set) out.v[i] = v;
    todo = next;
  }
  return out;
}

/**
 * His loose rocks with their dark halo: the dark dust pixels hugging each rock in his cloud (the
 * rock's shading smeared into the dust, darker than his dust round it) go with the rock, and the
 * dust takes their place from the dust round them. A rock that drifts then carries its shading
 * along instead of leaving a dark ring of specks behind in the cloud.
 * Returns [rocks with halo, dust without it].
 */
function withHalo(rocks: Layer, dust: Layer): [Layer, Layer] {
  const pal = dust.pal;
  const lumOf = (v: number) => {
    const c = pal.cols[v - 1];
    return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
  };
  const ls: number[] = [];
  for (const v of dust.v) if (v && pal.kind(v) === 'dust') ls.push(lumOf(v));
  ls.sort((a, b) => a - b);
  const dark = (ls[Math.floor(ls.length / 2)] ?? 0) * 0.8;
  const r = rocks.clone(), d = dust.clone();
  const halo: number[] = [];
  for (let y = 0; y < dust.h; y++) for (let x = 0; x < dust.w; x++) {
    const i = y * dust.w + x, v = dust.v[i];
    if (!v || rocks.v[i] || pal.kind(v) !== 'dust' || lumOf(v) >= dark) continue;
    let near = false;
    for (let oy = -1; oy <= 1 && !near; oy++) for (let ox = -1; ox <= 1; ox++) if (rocks.get(x + ox, y + oy)) near = true;
    if (near) halo.push(i);
  }
  for (const i of halo) {
    r.v[i] = dust.v[i];
    d.v[i] = 0;
  }
  // (the dust closes over where the halo was, from the dust round it)
  const holes = d.empty();
  for (const i of halo) holes.v[i] = 1;
  let todo = halo;
  while (todo.length) {
    const next: number[] = [], set: [number, number][] = [];
    for (const i of todo) {
      const x = i % d.w, y = (i / d.w) | 0;
      const nb = [d.get(x - 1, y), d.get(x + 1, y), d.get(x, y - 1), d.get(x, y + 1)].filter((v) => v && pal.kind(v) === 'dust');
      if (!nb.length) {
        next.push(i);
        continue;
      }
      set.push([i, nb.reduce((best, v) => (nb.filter((u) => u === v).length > nb.filter((u) => u === best).length ? v : best), nb[0])]);
    }
    if (!set.length) break;
    for (const [i, v] of set) d.v[i] = v;
    todo = next;
  }
  return [r, d];
}

/**
 * The frames rendered, every one but the key frame (his picture) patched against it: pinholes
 * where his picture has art are patched, and so is any clear pocket a frame encloses where his
 * picture has art (dust churned apart round a moving rock), filled in from its edge with the dust
 * round it (seal). Frames after `plugTo` (a one-shot's last frame, whose wisps' gaps are
 * meant) only get the pinhole patch.
 */
const finish = (frames: Layer[], keyIndex: number, plugTo = Infinity): Canvas[] =>
  frames.map((f, i) => {
    if (i === keyIndex) return f.render();
    const p = patch(f, frames[keyIndex]);
    return (i <= plugTo ? seal(p, frames[keyIndex]) : p).render();
  });

// --- frame counts --------------------------------------------------------------------------------
// The owner found the first cut too fast ("like a flashing star"): every animation has about twice
// the frames, with his picture still the key frame and the motion between frames small.
const FLY_N = 8, FLY_FPS = 12;
const HIT_N = 12, HIT_FPS = 12, HIT_KEY = 3;
const BLAST_N = 16, BLAST_FPS = 12, BLAST_KEY = 4;
const RISE_N = 12, RISE_FPS = 12, IDLE_N = 8, IDLE_FPS = 10;
const AURA_N = 12, AURA_FPS = 10;
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

// --- projectiles -----------------------------------------------------------------------------------
// Each flies in a loop of FLY_N frames: frame 0 is his picture, and every motion runs round once a
// loop (a small circle, a rocking, a drift that wraps), so the loop closes and each frame moves a
// pixel or two from the one before.

/**
 * bolt: his tumbling boulder with its dust trail. The boulder rocks on its way (a few degrees each
 * side, about its centre, which is the anchor; turned the RotSprite way, so his cracks stay lines),
 * its trail churns and streams back, the pebbles in it drift back, and the speed streaks slide.
 * Dust lies under the boulder, so it uncovers dust.
 */
function bolt(): WorldSprite {
  const K = key('bolt'), seed = 7100;
  const boulder = K.part('boulder'), main = K.part('main');
  const [bits, dust] = withHalo(K.part('bits'), dustOf(K));
  const fr = range(FLY_N).map((i) => {
    const t = i / FLY_N;
    const b = rotSprite(boulder, 0.11 * Math.sin(t * TAU), K.ax, K.ay);
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
    return union(d, m, p, b);
  });
  return vfxSprite('bolt', 'Earth bolt: tumbling boulder with a dust trail', [K.ax, K.ay], { fly: { frames: finish(fr, 0), fps: FLY_FPS, loop: true } });
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
  const fr = range(FLY_N).map((i) => {
    const t = i / FLY_N;
    const pl = churn(planet, t, { amp: 0.6, cell: 6, seed, kinds: ['body'] });
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
    return union(back, d, m, pl, front);
  });
  return vfxSprite('sphere', 'Earth sphere: striped boulder-planet with a dusty orbit ring', [K.ax, K.ay], { fly: { frames: finish(fr, 0), fps: FLY_FPS, loop: true } });
}

/** slash: his crescent of rock and dirt. The rock holds, the dirt on its inner side churns and trails back, pebbles drift back. */
function slash(): WorldSprite {
  const K = key('slash'), seed = 7300;
  const main = K.part('main');
  const [bits, dust] = withHalo(K.part('bits'), dustOf(K));
  const fr = range(FLY_N).map((i) => {
    const t = i / FLY_N;
    const d = churn(dust, t, { amp: 1.2, cell: 6, seed, flow: () => [-1.2, 0] });
    const m = churn(main, t, { amp: 0.5, cell: 7, seed: seed + 1, kinds: ['body'] });
    const p = moveBits(bits, (k, cx) => {
      const u = drift(t, rr(seed + 2, k, 0, 1));
      return u > 0 && cx - 6 * u < 4 ? null : [-6 * u, 0.8 * (Math.sin(u * 5 + k) - Math.sin(k))];
    });
    return union(d, m, p);
  });
  return vfxSprite('slash', 'Earth slash: crescent of rock and dirt with a golden edge', [K.ax, K.ay], { fly: { frames: finish(fr, 0), fps: FLY_FPS, loop: true } });
}

/** multi: his three rock bullets. Each bobs on its own beat with its dust trail; the trails churn and stream back. */
function multi(): WorldSprite {
  const K = key('multi'), seed = 7400;
  const bullets = ['b0', 'b1', 'b2'].map((n) => K.part(n));
  const main = K.part('main');
  const [bits, dust] = withHalo(K.part('bits'), dustOf(K));
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
  const fr = range(FLY_N).map((i) => {
    const t = i / FLY_N;
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
    return union(d, m, p, ...bl);
  });
  return vfxSprite('multi', 'Earth multi: three rock bullets with dust trails', [K.ax, K.ay], { fly: { frames: finish(fr, 0), fps: FLY_FPS, loop: true } });
}

/** breath: his cone of dust. The cloud rolls outward from a still origin (his puffs slide whole); the rocks tumble outward and the streaks slide. */
function breath(): WorldSprite {
  const K = key('breath'), seed = 7500;
  const ox = K.ax, oy = K.ay;  // the cone's tip (the caster's mouth or hands): the anchor
  const [rocks, dust] = withHalo(union(K.part('main'), K.part('bits')), dustOf(K));
  const fr = range(FLY_N).map((i) => {
    const t = i / FLY_N;
    const reach = (x: number) => smooth(ox + 4, ox + 40, x);
    // (his puffs slide outward whole, inside the cloud's outline, with only a hair of churn: a
    // stronger churn blurred them into mush away from his frame)
    let d = churn(dust, t, { amp: 0.4, ampY: 0.3, cell: 7, seed, where: reach, flow: (x, y) => {
      const a = Math.atan2(y - oy, x - ox);
      return [Math.cos(a) * 2.5, Math.sin(a) * 2.5];
    } });
    d = wobble(d, t, 0.8, 12, seed + 1, (x) => smooth(ox + 40, ox + 110, x));
    const r = moveBits(rocks, (k, cx, cy, n) => {
      if (n > 220) return [0, 0];
      const u = drift(t, rr(seed + 2, k, 0, 1));
      const a = Math.atan2(cy - oy, cx - ox);
      const dist = Math.hypot(cx - ox, cy - oy);
      const step = (n > 30 ? 5 : 9) * u;
      if (step > 0 && dist + step > 128) return null;
      return [Math.cos(a) * step, Math.sin(a) * step + 1.5 * u * u];
    });
    return union(d, r);
  });
  return vfxSprite('breath', 'Earth breath: cone of dust with tumbling rocks (anchor = cone origin)', [ox, oy], { fly: { frames: finish(fr, 0), fps: FLY_FPS, loop: true } });
}

// --- stream -----------------------------------------------------------------------------------------

/**
 * The spikes in a row of his rock. A spike's tip is a piece of rock reaching above `line - 16`; it
 * is followed down row by row, one run of rock a row that overlaps the run above and widens by at
 * most 1 px a side a row, down to `line - 8`, above the rubble. Through the rubble band it is its
 * own body only (reached through body pixels from its body above, within its two sides run on
 * straight), so the pebbles heaped against its foot, which his outline parts from it, stay rubble.
 * A piece whose run stops above the band (a flying pebble) is a spike too: it moves with the
 * wave. Everything else is rubble.
 */
function spikeMask(rock: Layer, line: number): Uint8Array {
  const { w } = rock;
  const m = new Uint8Array(rock.v.length);
  const tips = rock.filter((_v, _x, y) => y < line - 16);
  const fit = (ys: number[], xs: number[]) => {
    const n = ys.length, my = ys.reduce((a, v) => a + v, 0) / n, mx = xs.reduce((a, v) => a + v, 0) / n;
    let sxy = 0, syy = 0;
    ys.forEach((y, j) => {
      sxy += (y - my) * (xs[j] - mx);
      syy += (y - my) ** 2;
    });
    const k = syy ? sxy / syy : 0;
    return (y: number) => mx + k * (y - my);
  };
  for (const pc of pieces(tips)) {
    if (pc.length < 4) continue;
    const y0 = Math.min(...pc.map((i) => (i / w) | 0));
    const row0 = pc.filter((i) => ((i / w) | 0) === y0).map((i) => i % w);
    let lo = Math.min(...row0), hi = Math.max(...row0);
    const ys: number[] = [], los: number[] = [], his: number[] = [];
    let y = y0;
    for (; y < line - 8; y++) {
      let a = -1, b = -1;
      for (let x = lo - 1; x <= hi + 1; x++) if (rock.get(x, y)) {
        if (a < 0) a = x;
        b = x;
      }
      if (a < 0) break;
      lo = a;
      hi = b;
      ys.push(y);
      los.push(lo);
      his.push(hi);
      for (let x = lo; x <= hi; x++) if (rock.get(x, y)) m[y * w + x] = 1;
    }
    if (y < line - 8 || ys.length < 6) continue;
    // (the sides fitted over the lower half of the rows above the band, where the spike is widest)
    const h0 = Math.floor(ys.length / 2);
    const fl = fit(ys.slice(h0), los.slice(h0)), fh = fit(ys.slice(h0), his.slice(h0));
    const inside = (x: number, yy: number) => x >= Math.round(fl(yy)) - 1 && x <= Math.round(fh(yy)) + 1;
    // Through the band: the spike's own body, reached from its body above through body pixels
    // within its sides (his outline parts it from each pebble heaped against it), then its outline
    // where it borders only the spike (an outline shared with a pebble stays with the pebble).
    const isBody = (x: number, yy: number) => rock.kind(x, yy) === 'body';
    const sb = new Set<number>();
    const todo: number[] = [];
    for (let x = 0; x < w; x++) if (m[(line - 9) * w + x] && isBody(x, line - 9)) todo.push((line - 9) * w + x);
    while (todo.length) {
      const i = todo.pop()!;
      const x = i % w, yy = (i / w) | 0;
      for (const [u, v] of [[x - 1, yy], [x + 1, yy], [x, yy + 1], [x, yy - 1]] as [number, number][]) {
        const j = v * w + u;
        if (v < line - 8 || v >= line || sb.has(j) || !isBody(u, v) || !inside(u, v)) continue;
        sb.add(j);
        todo.push(j);
      }
    }
    for (const j of sb) m[j] = 1;
    for (let yy = line - 8; yy < line; yy++) for (let x = 0; x < w; x++) {
      if (rock.kind(x, yy) !== 'outline' || !inside(x, yy)) continue;
      const nb = [[x - 1, yy], [x + 1, yy], [x, yy - 1], [x, yy + 1]] as [number, number][];
      const bySpike = nb.some(([u, v]) => (v < line - 8 ? m[v * w + u] && isBody(u, v) : sb.has(v * w + u)));
      const byPebble = nb.some(([u, v]) => v >= line - 8 && isBody(u, v) && !sb.has(v * w + u));
      if (bySpike && !byPebble) m[yy * w + x] = 1;
    }
  }
  return m;
}

/**
 * His spikes in a row rise and sink in a wave that runs along the line. On frame 0 every spike is
 * as he drew it; through the loop each spike settles down by up to `amp` px and comes back, with a
 * phase from its place on the line (period 64 px, so the tile still tiles and the head joins it).
 * Only the spikes move (see spikeMask): his rubble stays exactly as he drew it, every pebble whole.
 * A spike rooted in the rubble is squashed toward its foot (rows dropped evenly, its tip and its
 * foot kept), so it never leaves a gap among the pebbles; a flying pebble just drops. line: the row
 * of the rubble's top.
 */
function spikeWave(L: Layer, t: number, line: number, x0: number, amp: number | ((cx: number) => number), seed: number): Layer {
  const rock = rockOf(L);
  const sm = spikeMask(rock, line);
  const spikes = rock.filter((_v, x, y) => y < line && !!sm[y * rock.w + x]);
  const rubble = rock.filter((_v, x, y) => y >= line || !sm[y * rock.w + x]);
  const out = spikes.empty();
  const { w } = spikes;
  const env = Math.sin(Math.PI * t);
  for (const pc of pieces(spikes)) {
    if (pc.length < 6) {
      for (const i of pc) out.v[i] = spikes.v[i];
      continue;
    }
    const [cx] = centre(spikes, pc);
    const ph = ((cx + x0) / 64) * TAU + rr(seed, Math.round(cx + x0) % 64, 0, 0.6);
    const a = typeof amp === 'number' ? amp : amp(cx);
    const d = Math.round(a * env * (0.55 + 0.45 * Math.cos(t * TAU - ph)));
    const ys = pc.map((i) => (i / w) | 0);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    if (d <= 0) {
      for (const i of pc) out.v[i] = spikes.v[i];
      continue;
    }
    if (y1 < line - 8) {
      for (const i of pc) out.set(i % w, ((i / w) | 0) + d, spikes.v[i]);
      continue;
    }
    const inPc = new Set(pc);
    const H = y1 - y0 + 1, H2 = Math.max(2, H - d);
    for (let y = y1 - H2 + 1; y <= y1; y++) {
      const src = y1 - Math.round(((y1 - y) * (H - 1)) / Math.max(1, H2 - 1));
      for (let x = 0; x < w; x++) if (inPc.has(src * w + x)) out.set(x, y, spikes.v[src * w + x]);
    }
  }
  return union(softOf(L), out, rubble);
}

/**
 * stream: his row of golden spikes over rubble, 64 px, the spikes rising and sinking in a wave
 * along the line (the tile still tiles). stream_head: his flaring end: the haze slides along its
 * own streaks, the spikes pulse with the same wave, and the chunks fly up and on. Dust lies under
 * the spikes, so a sinking spike uncovers his haze, not a hole.
 * The game puts the head's anchor (the joint, 32 px into the head) on the end of the last tile, so
 * the head's first 32 columns lie over that tile's right half. They are his same columns, and they
 * wave exactly as the tile's do, so in each frame the two draw the same pixels there.
 */
function stream(): WorldSprite[] {
  const KT = key('stream'), KH = key('stream_head'), seed = 7600;
  const line = KT.ay + 6;
  const TILE_AMP = 7;
  const T = union(KT.part('under'), KT.part('dust'), KT.part('main'), KT.part('bits'));
  const tile = range(FLY_N).map((i) => {
    const t = i / FLY_N;
    // The tile wraps: spikes are found on a tile laid out twice, so one crossing the seam moves whole.
    const twice = new Layer(T.pal, 128, T.h);
    for (let y = 0; y < T.h; y++) for (let x = 0; x < 128; x++) twice.set(x, y, T.get(x % 64, y));
    const w = spikeWave(twice, t, line, 0, TILE_AMP, seed);
    const out = T.empty();
    for (let y = 0; y < T.h; y++) for (let x = 0; x < 64; x++) out.set(x, y, w.get(x < 32 ? x + 64 : x, y));
    return out;
  });
  const hl = KH.ay + 6;
  // Head x <-> tile x: the joint (head anchor) is the tile's x 64; head rows sit (KH.ay - KT.ay) lower.
  const toTile = KH.ax - 64, dyT = KH.ay - KT.ay;
  const over = (cx: number) => cx < KH.ax;
  const hm = KH.part('main'), hb = KH.part('bits'), hd = dustOf(KH);
  // (the loose pebbles over the last tile wave with its spikes, as the tile's do; the head's own fly)
  const bitsOver = KH.part('bits').empty(), bitsOwn = KH.part('bits').empty();
  for (const pc of pieces(hb)) {
    const dest = over(centre(hb, pc)[0]) ? bitsOver : bitsOwn;
    for (const j of pc) dest.v[j] = hb.v[j];
  }
  const head = range(FLY_N).map((i) => {
    const t = i / FLY_N;
    // (his whole head is one connected mass of spikes, streaks and rubble, so it pulses as one: a
    // smaller push than the tile's keeps the haze it uncovers at its top to a thin band; the pieces
    // over the last tile take the tile's push and phase)
    const m = spikeWave(union(hm, bitsOver), t, hl, -toTile, (cx) => (over(cx) ? TILE_AMP : 4), seed);
    // His haze is drawn as crisp diagonal streaks: it only slides along them (up and on), inside its
    // own outline, so the streaks stay whole instead of being churned apart.
    const d = churn(hd, t, { amp: 0, cell: 7, seed: seed + 1, flow: () => [1.3, -1.3] });
    const b = moveBits(bitsOwn, (k, cx, cy) => {
      const u = drift(t, rr(seed + 3, k, 0, 1));
      const up = cy < hl - 4;
      return up ? [3 * u, -5 * u + 2 * u * u] : [0, 0];
    });
    return union(d, m, b);
  });
  const headC = finish(head, 0);
  const tileC = tile.map((f) => f.render());
  // The columns over the last tile are the tile's own opaque pixels in that frame (exactly, after
  // the pinhole patching the rest of the head gets). Its see-through pixels are left to the tile
  // underneath: drawn twice they would read denser there than anywhere else on the line.
  let overDiff = 0;
  headC.forEach((c, i) => {
    for (let y = 0; y < c.h; y++) for (let x = 0; x < KH.ax; x++) {
      const tx = x - toTile, ty = y - dyT;
      if (tx < 32 || tx > 63) continue;
      const px = tileC[i].get(tx, ty);
      const was = c.get(x, y);
      const want: Color = px[3] === 255 ? px : [0, 0, 0, 0];
      if (was[3] !== want[3] || (want[3] && (was[0] !== want[0] || was[1] !== want[1] || was[2] !== want[2]))) overDiff++;
      c.set(x, y, want);
    }
  });
  console.log(`stream_head: ${overDiff} px of the columns over the last tile differed from the tile's opaque pixels before copying (all frames)`);
  return [
    vfxSprite('stream', 'Earth stream: golden spike row over rubble (tileable 64 px)', [0, KT.ay], { fly: { frames: tileC, fps: FLY_FPS, loop: true } }),
    vfxSprite('stream_head', 'Earth stream head: bigger spikes, dust haze and flying chunks (anchor = joint with the last tile)', [KH.ax, KH.ay], { fly: { frames: headC, fps: FLY_FPS, loop: true } }),
  ];
}

// --- impacts ------------------------------------------------------------------------------------------

/**
 * One frame of an impact: the dust scaled by (s, sy) about the anchor, the rocks at d times his
 * distance from it (d = 1 is his picture) and fallen `fall` px, the dust churned by `t`, settled
 * `cool` steps down his ramp, faded `dim` alpha steps (rim first, see fadeSoft) and parted into
 * wisps to `thin`, the fraction `gone` of the small pebbles and ray dashes gone, and the rocks
 * crumbled to `crumble` (see moveCrumble).
 */
interface Step { s: number; sy?: number; d: number; t: number; cool: number; dim: number; thin: number; fall: number; gone: number; crumble: number }

/**
 * An impact in HIT_N frames: it builds up over HIT_KEY frames, his picture (frame HIT_KEY) holds
 * for three frames with only a little churn and drift, then the dust spreads, settles into browner
 * dust and fades from its rim inward while the rocks fly on and fall, over the last six frames.
 * Each rock wears away from its outline inward over frames 8-11, on a beat of its own, shedding a
 * chip or two that fall, and the pebbles go one by one, so the last frame holds no solid rock: only
 * faint dust is left, and the end does not pop. Every step is small, so nothing flashes.
 */
// (the dust fades through its alpha, rim first, in soft bands; only the last frame also parts it
// into wisps)
const HIT_PLAN: Step[] = [
  { s: 0.65, d: 0.7, t: 0, cool: 0, dim: 1, thin: 0, fall: 0, gone: 0.35, crumble: 0 },
  { s: 0.79, d: 0.83, t: 0, cool: 0, dim: 0, thin: 0, fall: 0, gone: 0.15, crumble: 0 },
  { s: 0.9, d: 0.92, t: 0, cool: 0, dim: 0, thin: 0, fall: 0, gone: 0, crumble: 0 },
  { s: 1, d: 1, t: 0, cool: 0, dim: 0, thin: 0, fall: 0, gone: 0, crumble: 0 },
  { s: 1.02, d: 1.04, t: 0.05, cool: 0, dim: 0, thin: 0, fall: 0, gone: 0, crumble: 0 },
  { s: 1.04, d: 1.08, t: 0.1, cool: 0, dim: 0, thin: 0, fall: 1, gone: 0.04, crumble: 0 },
  { s: 1.06, d: 1.13, t: 0.15, cool: 1, dim: 0.6, thin: 0, fall: 2, gone: 0.12, crumble: 0 },
  { s: 1.08, d: 1.19, t: 0.2, cool: 1, dim: 1.3, thin: 0, fall: 3, gone: 0.24, crumble: 0.05 },
  { s: 1.1, d: 1.25, t: 0.25, cool: 2, dim: 2.1, thin: 0, fall: 5, gone: 0.38, crumble: 0.2 },
  { s: 1.12, d: 1.31, t: 0.3, cool: 3, dim: 3, thin: 0, fall: 7, gone: 0.56, crumble: 0.45 },
  { s: 1.14, d: 1.37, t: 0.35, cool: 3, dim: 3.9, thin: 0, fall: 9, gone: 0.78, crumble: 0.72 },
  { s: 1.16, d: 1.43, t: 0.4, cool: 4, dim: 4.7, thin: 0.22, fall: 12, gone: 1, crumble: 1 },
];

/**
 * His dark flecks: a piece with (almost) no light rock in it, his dark radial specks and the
 * rims drawn on the dust with nothing inside. They are marks on the cloud, so they travel with
 * the cloud (moved as the dust round them moves), never on their own toward the core, where they
 * would cross the bright burst as scratches. Returns [rocks, flecks].
 */
function splitFlecks(L: Layer): [Layer, Layer] {
  const rocks = L.empty(), flecks = L.empty();
  const lum = (v: number) => {
    const c = L.pal.cols[v - 1];
    return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
  };
  for (const pc of pieces(L)) {
    const light = pc.filter((i) => L.pal.kind(L.v[i]) === 'body' && lum(L.v[i]) >= 95).length;
    const dest = light < Math.max(2, pc.length * 0.15) ? flecks : rocks;
    for (const i of pc) dest.v[i] = L.v[i];
  }
  return [rocks, flecks];
}

/**
 * Flying rock is solid: a clear pixel a pebble's rim encloses (or nearly: a 1 px gap in a small
 * pebble's rim is closed; his dust showed through there in his picture) takes the pebble's own
 * commonest rock, so off his cloud no pebble is a hollow ring of outline.
 */
function solidPebbles(L: Layer): Layer {
  const out = L.clone();
  for (const pc of pieces(L)) {
    const body = pc.map((i) => L.v[i]).filter((v) => L.pal.kind(v) === 'body');
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (const i of pc) {
      x0 = Math.min(x0, i % L.w); x1 = Math.max(x1, i % L.w);
      y0 = Math.min(y0, (i / L.w) | 0); y1 = Math.max(y1, (i / L.w) | 0);
    }
    const sub = new Layer(L.pal, x1 - x0 + 5, y1 - y0 + 5);
    for (const i of pc) sub.set((i % L.w) - x0 + 2, ((i / L.w) | 0) - y0 + 2, 1);
    const inside = silhouette(sub, pc.length <= 40 ? 1 : 0);
    const fill = body.length ? body.reduce((a, v) => (body.filter((u) => u === v).length > body.filter((u) => u === a).length ? v : a), body[0]) : L.pal.rim;
    for (let y = 0; y < sub.h; y++) for (let x = 0; x < sub.w; x++) {
      const X = x + x0 - 2, Y = y + y0 - 2;
      if (inside[y * sub.w + x] && !sub.get(x, y) && !L.get(X, Y)) out.set(X, Y, fill);
    }
  }
  return out;
}

/**
 * The frames of an impact (see HIT_PLAN). `big`: the size from which a piece is a chunk (it flies
 * on along `fly`, falls with `bigFall` x the plan's fall, and never goes before it crumbles);
 * `heart` (0..1) is how deep in the burst a pixel is (the heart fades last).
 */
function impact(K: Key, seed: number, plan: Step[], dustFlow: [number, number], heart: (x: number, y: number) => number, big: number, fly: [number, number] = [0, 0], bigFall = 1): Layer[] {
  const dust = K.part('dust'), under = K.part('under');
  const all = union(K.part('main'), K.part('bits'));
  const [rocks0, flecks] = splitFlecks(all);
  const rocks = solidPebbles(rocks0);
  const field = fadeField(heart, seed + 7);
  return plan.map((p, i) => {
    if (i === HIT_KEY) return union(under, dust, all);
    const sy = p.sy ?? p.s;
    // The dust behind the rocks only shows inside the dust cloud's own outline (bays up to about
    // 14 px wide closed: a rock sitting in a bite at the cloud's edge leaves cloud, not a notch).
    const ds = scaled(dust, p.s, sy, K.ax, K.ay);
    const sil = silhouette(ds, 7);
    const us = scaled(under, p.s, sy, K.ax, K.ay).filter((_v, x, y) => !!sil[y * ds.w + x]);
    let d = union(us, ds);
    if (p.t > 0) d = churn(d, p.t, { amp: 1.4, cell: 6, seed, flow: () => dustFlow });
    d = thinWisps(fadeSoft(d, p.cool, p.dim, field), p.thin, seed + 1, heart);
    // His flecks ride on the dust (each whole, where the dust under its centre went), never on
    // their own, and go one by one as the dust thins.
    const fl = moveBits(flecks, (k, cx, cy) => {
      if (rr(seed + 5, k, 0, 1) < Math.max(p.gone, i > HIT_KEY ? p.dim / 5 : 0)) return null;
      return [(cx - K.ax) * (p.s - 1), (cy - K.ay) * (sy - 1)];
    });
    // (each rock wears away on a beat of its own round the plan's: a little ahead or behind)
    const lag = (k: number) => (p.crumble > 0 && p.crumble < 1 ? rr(seed + 8, k, -0.07, 0.07) : 0);
    const r = moveCrumble(rocks, (k, cx, cy, n) => {
      // Small pebbles and ray dashes go one by one as the burst spends itself (and are not
      // there yet at the very start).
      if (n < big && rr(seed + 2, k, 0, 1) < p.gone) return null;
      // (building up, the big rocks break out one after another, not all bunched at the core)
      if (n >= big && i < HIT_KEY && rr(seed + 4, k, 0, 1) < p.gone * 1.2) return null;
      // (the big chunks fly on along `fly` as well as out from the core, and fall: a chunk
      // thrown upward slows and comes down, so every chunk is falling by the end)
      if (n >= big && i > HIT_KEY) {
        const up = cy < K.ay ? 0.4 : 1;
        return [(cx - K.ax) * (p.d - 1) + fly[0] * (p.d - 1), (cy - K.ay) * (p.d - 1) * up + fly[1] * (p.d - 1) + p.fall * bigFall];
      }
      return [(cx - K.ax) * (p.d - 1), (cy - K.ay) * (p.d - 1) + p.fall * (n >= big ? 1 : 0.6)];
    }, (k) => p.crumble + lag(k), seed + 6);
    return union(d, fl, r);
  });
}

/** hit: his rock explosion (frame HIT_KEY is his picture): a dusty core, rocks, golden ray dashes. */
function hit(): WorldSprite {
  const K = key('hit'), seed = 7700;
  const heart = (x: number, y: number) => 1 - Math.min(1, Math.hypot(x - K.ax, y - K.ay) / 40);
  const fr = impact(K, seed, HIT_PLAN, [0, -0.6], heart, 20);
  return vfxSprite('hit', 'Earth hit: rock explosion (dusty core, rocks, golden rays)', [K.ax, K.ay], { hit: { frames: finish(fr, HIT_KEY, HIT_N - 2), fps: HIT_FPS, loop: false } });
}

/**
 * multi_hit: the rock bullets' impact, his burst panel (frame HIT_KEY is his picture). The anchor
 * is the impact point, where his rays meet: the dust kicks back from it (left, toward the shooter)
 * and the broken chunks fly on (right) and fall. The renderer mirrors it for bullets flying left.
 * Its dust fans out along the burst (it grows across more than down).
 */
function multiHit(): WorldSprite {
  const K = key('multi_hit'), seed = 7800;
  const plan = HIT_PLAN.map((p) => ({ ...p, sy: 1 + (p.s - 1) * 0.6 }));
  const heart = (x: number) => 1 - Math.min(1, Math.abs(x - K.ax) / 50);
  // (both big chunks fly on to the right together, the upper one too, and fall, faster and
  // faster: by the last frame the upper one has dropped about 20 px)
  const fr = impact(K, seed, plan, [-1.2, 0], heart, 20, [26, 10], 1.8);
  return vfxSprite('multi_hit', 'Earth multi impact: rock bullet burst (anchor = impact point; dust kicks back left, chunks fly right)', [K.ax, K.ay], { hit: { frames: finish(fr, HIT_KEY, HIT_N - 2), fps: HIT_FPS, loop: false } });
}

/**
 * blast: his eruption in BLAST_N frames (frame BLAST_KEY is his picture).
 *   - Anticipation (frames 0-3): the shadow spreads on the ground, the dust bursts out of the
 *     ground centre, his crystals thrust up out of the ground (the middle ones first) and the
 *     rocks fly out from the centre.
 *   - His picture holds for three frames (4-6), the dust stirring a little and the rocks drifting.
 *   - A long settle (7-15): the dust billows out, settles browner and fades rim first, the rocks fall
 *     and go, the crystals sink back into the ground and the shadow fades.
 * The dust behind his crystals (which his picture never shows) is a smooth fill from the cloud
 * round them, clipped to the cloud's own outline, so a sinking crystal uncovers his cloud.
 */
function blast(): WorldSprite {
  const K = key('blast'), seed = 7900;
  const shade = K.part('shade'), dust = K.part('dust'), under = K.part('under');
  const loose0 = union(K.part('main'), K.part('bits'));
  // His dark flecks and the rims he drew on the dust with nothing inside are marks on the cloud:
  // they ride with it (see splitFlecks), so none flies off the cloud as a hollow ring of outline.
  const [rocks0, flecks] = splitFlecks(loose0);
  const loose = solidPebbles(rocks0);
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
    // (the columns of its foot: where it has pixels in its lowest 3 rows)
    const feet: number[] = [];
    for (let x = 0; x < c.w; x++) for (let y = y1 - 2; y <= y1; y++) if (c.get(x, y)) {
      feet.push(x);
      break;
    }
    const cx = sx / Math.max(1, n);
    return { base: y1, h: y1 - y0 + 1, cx, off: Math.abs(cx - K.ax) / 100, feet };
  });
  // sh: shadow scale; ds: dust scale; up: how much of the crystals shows (1 = his picture);
  // bits: how far the loose rocks have flown (1 = his picture); the rest as in Step.
  const plan = [
    { sh: 0.6, ds: 0.62, up: 0.3, bits: 0.45, t: 0, cool: 0, dim: 1, thin: 0, shDim: 1 },
    { sh: 0.75, ds: 0.76, up: 0.55, bits: 0.65, t: 0, cool: 0, dim: 0, thin: 0, shDim: 0 },
    { sh: 0.88, ds: 0.88, up: 0.78, bits: 0.82, t: 0, cool: 0, dim: 0, thin: 0, shDim: 0 },
    { sh: 0.96, ds: 0.96, up: 0.94, bits: 0.94, t: 0, cool: 0, dim: 0, thin: 0, shDim: 0 },
    { sh: 1, ds: 1, up: 1, bits: 1, t: 0, cool: 0, dim: 0, thin: 0, shDim: 0 },
    { sh: 1.01, ds: 1.01, up: 1, bits: 1.04, t: 0.04, cool: 0, dim: 0, thin: 0, shDim: 0 },
    { sh: 1.02, ds: 1.02, up: 1, bits: 1.08, t: 0.08, cool: 0, dim: 0, thin: 0, shDim: 0 },
    { sh: 1.03, ds: 1.03, up: 0.92, bits: 1.14, t: 0.12, cool: 0, dim: 0.4, thin: 0, shDim: 0.2 },
    { sh: 1.04, ds: 1.05, up: 0.8, bits: 1.22, t: 0.16, cool: 1, dim: 1, thin: 0, shDim: 0.6 },
    { sh: 1.05, ds: 1.07, up: 0.65, bits: 1.3, t: 0.2, cool: 1, dim: 1.6, thin: 0, shDim: 1.1 },
    { sh: 1.05, ds: 1.09, up: 0.5, bits: 1.39, t: 0.24, cool: 2, dim: 2.3, thin: 0, shDim: 1.7 },
    { sh: 1.06, ds: 1.1, up: 0.36, bits: 1.48, t: 0.28, cool: 2, dim: 3, thin: 0, shDim: 2.4 },
    { sh: 1.06, ds: 1.11, up: 0.23, bits: 1.57, t: 0.32, cool: 3, dim: 3.7, thin: 0, shDim: 3.1 },
    { sh: 1.07, ds: 1.12, up: 0.12, bits: 1.66, t: 0.36, cool: 3, dim: 4.4, thin: 0, shDim: 3.9 },
    { sh: 1.07, ds: 1.13, up: 0.04, bits: 1.75, t: 0.4, cool: 3, dim: 5, thin: 0, shDim: 4.6 },
    { sh: 1.08, ds: 1.14, up: 0, bits: 1.84, t: 0.44, cool: 4, dim: 5.6, thin: 0.2, shDim: 5.2 },
  ];
  // (in the settle the dust fades through its alpha, rim first, in soft bands (fadeSoft); only the
  // last frame also parts it into wisps)
  // How far up a crystal's foot is ragged into the dust while it rises or sinks.
  const FOOT = 4;
  // Up per crystal: rising, the middle ones lead; sinking, all together.
  const upOf = (i: number, u: number, off: number) => (i < BLAST_KEY ? clamp(u * 1.3 - off * 0.3, 0, 1) : u);
  const heart = (x: number, y: number) => 1 - Math.min(1, Math.hypot((x - K.ax) / 110, (y - K.ay) / 70));
  const field = fadeField(heart, seed + 9, 12);
  const fr = plan.map((p, i) => {
    if (i === BLAST_KEY) return union(shade, under, dust, ...crystals, loose0);
    const sh = fadeSoft(scaled(shade, p.sh, p.sh, K.ax, K.ay), 0, p.shDim, field);
    // His cloud and its continuation behind the crystals (the extractor reads where his cloud goes
    // on behind each crystal from the cloud round it, so it has his outline, never a crystal's).
    let d = scaled(union(under, dust), p.ds, p.ds, K.ax, K.ay);
    // (the cloud's own outline at this size, before it churns and thins: a crystal stands in it)
    const cloud = silhouette(d, 3);
    if (p.t > 0) d = churn(d, p.t, { amp: 1.6, cell: 7, seed, flow: (x) => [Math.sign(x - K.ax) * 1.4, -1] });
    d = thinWisps(fadeSoft(d, p.cool, p.dim, field), p.thin, seed + 1, heart);
    const ks = crystals.map((c, k) => {
      let u = upOf(i, p.up, info[k].off);
      // Each crystal stands where it stands in his cloud, wherever the cloud is: while the cloud
      // is smaller (bursting out) or bigger (billowing), the crystal is moved with it, so its foot
      // stays in the dust instead of hanging in the sky beside a small cloud.
      const tx = Math.round((info[k].cx - K.ax) * (p.ds - 1)), ty = Math.round((info[k].base - K.ay) * (p.ds - 1));
      if (u < 1) {
        // (and it never shows unless the cloud is under its foot)
        const by = info[k].base + ty;
        const inCloud = info[k].feet.filter((x) => cloud[by * K.w + x + tx] || cloud[(by - 2) * K.w + x + tx]).length;
        if (inCloud < info[k].feet.length * 0.75) u = 0;
      }
      if (u <= 0.02) return null;
      const placed = tx || ty ? moved(c, tx, ty) : c;
      if (u >= 1) return placed;
      // The crystal thrusts up out of the cloud (or sinks back into it): moved down and cut at its
      // foot with no line drawn along the cut, the cut wavy, and below the cut's ragged top (each
      // column ending a pixel or few above it, a column at a time, never a dither) his dust takes
      // over, so it grows out of the dust instead of standing on a straight dark shelf. A crystal
      // nearly sunk is ragged over less of its height, so its last tip stays a tip.
      const sink = Math.round(info[k].h * (1 - u));
      const foot = (x: number) => info[k].base + ty - 1 + Math.round(2.5 * (pnoise(x, k, 3, 0, 0, seed + 5) - 0.5) * 2);
      const fh = Math.max(1, Math.min(FOOT, Math.round(info[k].h * u * 0.3)));
      const top = (x: number) => foot(x) - Math.floor(fh * rr(seed + 11, x * 31 + k, 0, 1.0));
      const cr = cut(moved(placed, 0, sink), (x, y) => y <= foot(x), 3, false);
      return cr.map((v, x, y) => {
        if (y <= top(x)) return v;
        const dv = d.get(x, y);
        return dv && d.pal.kind(dv) === 'dust' ? dv : v;
      });
    });
    // His flecks ride on the cloud (moved as it grows) and go one by one as it fades.
    const fl = moveBits(flecks, (k, cx, cy) => {
      // (and all are gone by the second-last frame, with the cloud's heart)
      if (i !== BLAST_KEY && rr(seed + 10, k, 0, 1) < (i < BLAST_KEY ? 0.6 - p.bits * 0.6 : (i - 7) / 7)) return null;
      return [(cx - K.ax) * (p.ds - 1), (cy - K.ay) * (p.ds - 1)];
    });
    // Rising, the rocks fly out from the centre; settling, they fly on and fall, and each wears
    // away from its outline inward over about four frames, on its own beat between frames 8 and
    // 15, shedding a chip or two (no rock pops out, no speckled dissolve).
    const rs = moveCrumble(loose, (k, cx, cy, n) => {
      if (p.bits < 1 && p.bits < 0.35 + rr(seed + 6, k, 0, 0.3)) return null;
      const s = p.bits - 1;
      // (bursting out, a rock is at `bits` of his distance from the centre: it flies out with the cloud)
      if (s < 0) return [(cx - K.ax) * s, (cy - K.ay) * s];
      return [(cx - K.ax) * s * 0.25, (cy - K.ay) * s * 0.2 + (s > 0 ? 6 * s * s : 0) * (n > 12 ? 1 : 0.7)];
    }, (k) => (i > BLAST_KEY ? (i - 8 - rr(seed + 7, k, 0, 4)) / 4 : 0), seed + 8, 0.25);
    return union(sh, d, fl, ...ks, rs);
  });
  return vfxSprite('blast', 'Earth blast: crystal spikes erupting in a dust cloud (anchor = ground centre)', [K.ax, K.ay], { blast: { frames: finish(fr, BLAST_KEY, BLAST_N - 2), fps: BLAST_FPS, loop: false } });
}

// --- walls --------------------------------------------------------------------------------------------

/**
 * A wall: `rise` (RISE_N frames) pushes his stone up out of the ground: it starts wholly below the
 * ground, bursts up and eases out into his picture, kicking up his dust at the base; its last frame
 * is his picture, ready for `idle`. The straight and the 3/4 walls rise column by column, each from
 * its own ground point, so they rise along their footprint; the end-on pillar (seen end-on, its
 * footprint runs into the screen) rises as one block from one shared ground line, so its top comes
 * up level. Nothing floats: the loose pebbles are not lifted with the stone but land at their
 * resting places over the last frames (each on a beat of its own, a few px from above, into his
 * dust there), the end-on pillar's heap of rubble (`rubble`, anchor-relative) pushes up out of the
 * ground at its foot over the last four frames, after the stone, and only the dust he shows is
 * drawn (none from behind the stone, which would hang in the air while the stone is down).
 * `idle` (IDLE_N frames) keeps the stone still while the moss and vines stir, the dust at the base
 * drifts and the pebbles settle.
 */
function wall(kind: 'wall' | 'wall_diag' | 'wall_depth', label: string, seed: number, rubbleAt?: (dx: number, dy: number) => boolean): WorldSprite {
  const K = key(kind);
  const main = K.part('main'), bits = K.part('bits'), dust = dustOf(K);
  const level = kind === 'wall_depth';
  const isRubble = (x: number, y: number) => !!rubbleAt && rubbleAt(x - K.ax, y - K.ay);
  const stone = main.filter((_v, x, y) => !isRubble(x, y));
  const rubble = main.filter((_v, x, y) => isRubble(x, y));
  // Each column's ground point: the foot of his stone in that column (the lowest pixel within
  // a few columns, so a rubble gap does not cut a column short).
  const groundOf = (L: Layer) => {
    const foot = new Array<number>(K.w).fill(-1);
    for (let x = 0; x < K.w; x++) for (let y = K.h - 1; y >= 0; y--) if (L.get(x, y)) {
      foot[x] = y;
      break;
    }
    return foot.map((_, x) => {
      let best = -1;
      for (let k = -6; k <= 6; k++) best = Math.max(best, foot[clamp(x + k, 0, K.w - 1)]);
      return best < 0 ? K.ay : best;
    });
  };
  const g = groundOf(stone), gr = groundOf(rubble);
  // Each column's whole height above its ground point: every wall starts wholly below the ground
  // (the 3/4 and end-on walls too), so the first frame shows only the tops breaking through.
  const heightOf = (L: Layer, gg: number[]) => {
    const topY = new Array<number>(K.w).fill(K.h);
    for (let i = 0; i < L.v.length; i++) if (L.v[i]) topY[i % K.w] = Math.min(topY[i % K.w], (i / K.w) | 0);
    return gg.map((gy, x) => (topY[x] < K.h ? gy - topY[x] + 2 : 0));
  };
  const colH = heightOf(stone, g), rubH = heightOf(rubble, gr);
  const tallest = Math.max(...colH);
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
    const d = churn(dust, t, { amp: 1.2, ampY: 0.7, cell: 6, seed: seed + 1, flow: () => [1, -0.3] });
    const b = moveBits(bits, (k) => {
      const ph = rr(seed + 2, k, 0, TAU);
      return [0, Math.round(0.6 * (Math.sin(t * TAU + ph) - Math.sin(ph)))];
    });
    return union(d, m, b);
  };
  const idle = range(IDLE_N).map((i) => idleAt(i / IDLE_N));
  // (his dust the stone does not hide in his picture: the dust behind it is never shown rising)
  const shown = dust.filter((_v, x, y) => !main.get(x, y));
  const rise = range(RISE_N).map((i) => {
    if (i === RISE_N - 1) return union(dust, main, bits);
    // How much of the wall is up: it bursts up fast and slows into his picture (an ease-out: the
    // biggest steps first, a pixel or two over the last frames), so it settles instead of stopping
    // dead on the last frame.
    const u = (i + 1) / RISE_N;
    const s = 1 - (1 - u) * (1 - u);
    // (neighbouring columns smoothed, so the rising top edge stays his outline, a little uneven;
    // a short column, the rubble at the foot, never sinks much deeper than it is tall, so it comes
    // up with the rest instead of appearing on the last frame)
    const sink = (x: number) => {
      if (level) return Math.round(tallest * (1 - s));
      let h = 0;
      for (let k = -3; k <= 3; k++) h = Math.max(h, colH[clamp(x + k, 0, K.w - 1)]);
      h = Math.min(h, colH[x] + 8);
      return Math.round(h * (1 - s) * (0.9 + 0.2 * pnoise(x, 0, 24, 0, 0, seed + 3)));
    };
    const m = cut(remap(stone, (x, y) => [x, y - sink(x)]), (x, y) => y <= g[x]);
    // (the end-on pillar's rubble pushes up out of the ground at its foot over the last four frames)
    const ru = rubbleAt ? (() => {
      const v = clamp((i - (RISE_N - 5)) / 4, 0, 1);
      if (v <= 0) return null;
      const e = 1 - (1 - v) * (1 - v);
      return cut(remap(rubble, (x, y) => [x, y - Math.round(rubH[x] * (1 - e))]), (x, y) => y <= gr[x]);
    })() : null;
    // His dust at the base bursts up with it, then settles into his picture.
    const d = dimSoft(wobble(shown, u * 0.5, 2 * (1 - u) + 0.5, 8, seed + 4), u < 0.2 ? 1 : 0);
    // The loose pebbles land at their resting places over the last frames, each on a beat of its
    // own (frames RISE_N - 4 to RISE_N - 2), dropping the last few px into his dust.
    const b = moveBits(bits, (k) => {
      const at = RISE_N - 4 + (k % 3);
      return i < at ? null : [0, -2 * Math.max(0, RISE_N - 2 - i)];
    });
    return union(d, m, ru, b);
  });
  const key0 = idle[0];
  const riseC = rise.map((f, i) => (i === RISE_N - 1 ? f : seal(patch(f, key0))).render());
  const idleC = idle.map((f, i) => (i === 0 ? f : seal(patch(f, key0))).render());
  return vfxSprite(kind, label, [K.ax, K.ay], { rise: { frames: riseC, fps: RISE_FPS, loop: false }, idle: { frames: idleC, fps: IDLE_FPS, loop: true } });
}

// --- aura ---------------------------------------------------------------------------------------------

/**
 * His aura in two frame-synchronized layers with the same size and anchor (the feet):
 * `aura_back` goes BEHIND the character (his two columns of glossy golden pebbles and rocks, the
 * dust ring's far arc and its sides); `aura` goes OVER it (the ring's near arc across the waist and
 * the pebbles on the ground at the feet). His figure is not tinted, so the middle stays clear. In
 * AURA_N frames the rocks bob in a wave that climbs the columns, the small pebbles rise and wrap,
 * and the ring's dust flows round (both layers in step).
 */
function aura(): WorldSprite[] {
  const KB = key('aura_back'), KF = key('aura'), seed = 8000;
  const flow = (x: number, y: number): [number, number] => {
    // Round the figure: right along the near arc (below the waist), left along the far arc.
    const near = y > KB.ay - 70;
    return [near ? 2 : -2, x < KB.ax ? (near ? -0.5 : 0.5) : near ? 0.5 : -0.5];
  };
  const layer = (K: Key, i: number): Layer => {
    const t = i / AURA_N;
    const rocks = union(K.part('main'), K.part('bits'));
    const d = churn(dustOf(K), t, { amp: 1.1, ampY: 0.7, cell: 6, seed, flow });
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
    return union(d, r);
  };
  const back = finish(range(AURA_N).map((i) => layer(KB, i)), 0);
  const front = finish(range(AURA_N).map((i) => layer(KF, i)), 0);
  return [
    vfxSprite('aura', 'Earth aura, front layer (draw OVER the character): dust ring near arc, pebbles at the feet', [KF.ax, KF.ay], { idle: { frames: front, fps: AURA_FPS, loop: true } }),
    vfxSprite('aura_back', 'Earth aura, back layer (draw BEHIND the character): rock columns and the dust ring', [KB.ax, KB.ay], { idle: { frames: back, fps: AURA_FPS, loop: true } }),
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

/**
 * The flash check the owner's "flashing star" note asks for: each frame's light (the sum over its
 * pixels of alpha x brightness, in units of a fully opaque white pixel) and the largest change
 * between neighbouring frames, as a fraction of the brighter of the two. Loops include the step
 * from the last frame back to the first; a one-shot's first frame (rising out of nothing) is not
 * a step.
 */
function flashReport(s: WorldSprite): string {
  const out: string[] = [];
  for (const [an, a] of Object.entries(s.anims)) {
    const e = a.frames.map((f) => {
      let sum = 0;
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
        const p = f.get(x, y);
        if (p[3]) sum += (p[3] / 255) * ((0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2]) / 255);
      }
      return sum;
    });
    let worst = 0;
    const n = e.length;
    for (let i = 0; i < n; i++) {
      const j = i + 1;
      if (j >= n && a.loop === false) break;
      const b = e[j % n];
      worst = Math.max(worst, Math.abs(b - e[i]) / Math.max(1e-6, e[i], b));
    }
    out.push(`${an} [${e.map((v) => Math.round(v)).join(' ')}] max step ${(worst * 100).toFixed(0)}%`);
  }
  return `flash ${s.name.padEnd(12)} ${out.join('; ')}`;
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
    // (the end-on pillar's heap of rubble: right of its face and the mound below its foot)
    ...fit([wall('wall_depth', 'Earth wall (end-on): overgrown stone pillar running into the screen', 8300, (dx, dy) => (dx >= 47 && dy >= 21) || dy >= 82)]),
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
  for (const s of sprites) console.log(flashReport(s));
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
