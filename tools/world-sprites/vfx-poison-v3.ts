// Poison jutsu VFX, third pass: the set rebuilt from the owner's paint-over of our poison sheet
// (docs/reference/poison-set-owner-reference.jpg), copied as exactly as possible.
//
//   WORLD_OUT=<art2>/staging npx tsx tools/world-sprites/vfx-poison-v3.ts
//
// writes the group `vfx_poison_v3` under <WORLD_OUT>/vfx_poison_v3/ (staging only: it refuses to
// run without WORLD_OUT, so it never writes into src/assets). POISON_LIGHT=1 also prints each
// frame's light (mean alpha x brightness), for the flash check.
//
// Every key frame is HIS picture: tools/refs/poison-from-ref.py cuts his panels to game scale (his
// pixels, his palette, his rims as a clean 1 px tinted outline, his light kept semi-transparent)
// and writes them to vfx-poison-v3-refdata.ts as pieces (main body, droplets, light, and named
// parts). This file animates them, deriving every other frame from the key frame, so the peak
// frame of each animation is his picture:
//   - loops start on his picture: the bolt's swirl turns, his slime churns inside its own
//     silhouette (a displacement that runs round a small circle and comes back), his venom mist
//     sways, droplets drift, the stream tile scrolls (it still tiles) into his splash head;
//   - the hit, the blast and the walls' rise grow or reveal into his picture, hold it, then break
//     up, cool down his own colour ramps and fade.
// The owner found the jutsu too fast ("like a flashing star"), so every anim has more, smaller
// steps (see the frame counts below) and no frame jumps in brightness.
// `wall_depth` is NOT his: the owner keeps our end-on wall. It is our mist curtain from
// vfx-b-poison.ts, reproduced here exactly (the code it needs is copied below), with the new frame
// counts. The poison beast (the cobra) is out of scope: beast.png and its manifest entry are copied
// through from vfx_poison unchanged.
// Deterministic: no Math.random.

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { Canvas, Color, PX_PER_M, WorldSprite, hex, writeGroup } from './kit';
import { TAU, clamp, clearEdgeBits, fade, fract, pnoise, rnd, rr, smooth, vfxSprite } from './vfx-a-lib';
import * as B from './vfx-b-lib';
import { DPM, HGT, LEN, Orient, PPM, orientations, proj } from './vfx-b-wall3d';
import { PV3_LIGHT, PV3_PAL, PV3_REF, PV3_VEIL } from './vfx-poison-v3-refdata';

const GROUP = 'vfx_poison_v3';

// --- his palette and key frames ----------------------------------------------------------------

type Kind = 'body' | 'outline' | 'glow';
type Fam = 'green' | 'purple' | 'neutral';
const PAL: Color[] = PV3_PAL.map((p) => hex(p.rgba.slice(0, 7), parseInt(p.rgba.slice(7, 9), 16)));
const KIND: Kind[] = PV3_PAL.map((p) => p.kind);
const FAM: Fam[] = PV3_PAL.map((p) => p.fam);
/** Index value (palette index + 1) of his rim colour for each family. */
const RIM: Record<Fam, number> = {
  green: PV3_PAL.findIndex((p) => p.kind === 'outline' && p.fam === 'green') + 1,
  purple: PV3_PAL.findIndex((p) => p.kind === 'outline' && p.fam === 'purple') + 1,
  neutral: PV3_PAL.findIndex((p) => p.kind === 'outline' && p.fam === 'neutral') + 1,
};
/** The glow entries: colour c at alpha step a is GLOW0 + c * ALPHA_STEPS + a. */
const GLOW0 = KIND.indexOf('glow') + 1;
const ALPHA_STEPS = (() => {
  const first = PV3_PAL[GLOW0 - 1].rgba.slice(0, 7);
  let n = 0;
  while (PV3_PAL[GLOW0 - 1 + n]?.rgba.slice(0, 7) === first) n++;
  return n;
})();
const isKind = (v: number, k: Kind) => v > 0 && KIND[v - 1] === k;
const lumOf = (c: Color) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];

/**
 * One step up or down his own colour ramp: the colour of the same family about 14 levels lighter
 * (or darker) with the nearest hue, so a lit or cooled frame keeps his greens and violets.
 */
const RAMP = (() => {
  const up = new Int16Array(PAL.length + 1), down = new Int16Array(PAL.length + 1);
  for (let v = 1; v <= PAL.length; v++) {
    up[v] = down[v] = v;
    if (KIND[v - 1] !== 'body') continue;
    const c = PAL[v - 1], L = lumOf(c);
    let bu = 1e9, bd = 1e9;
    for (let w = 1; w <= PAL.length; w++) {
      if (w === v || KIND[w - 1] !== 'body' || FAM[w - 1] !== FAM[v - 1]) continue;
      const d = PAL[w - 1], dL = lumOf(d) - L;
      const hue = Math.hypot(d[0] - lumOf(d) - (c[0] - L), d[1] - lumOf(d) - (c[1] - L), d[2] - lumOf(d) - (c[2] - L));
      const score = Math.abs(Math.abs(dL) - 14) + 0.6 * hue;
      if (dL > 4 && score < bu) {
        bu = score;
        up[v] = w;
      }
      if (dL < -4 && score < bd) {
        bd = score;
        down[v] = w;
      }
    }
  }
  return { up, down };
})();
const stepUp = (v: number, n = 1) => {
  for (let i = 0; i < n; i++) v = RAMP.up[v];
  return v;
};
const stepDown = (v: number, n = 1) => {
  for (let i = 0; i < n; i++) v = RAMP.down[v];
  return v;
};

/** An indexed layer (0 = clear, else palette index + 1), the size of a sprite's frame. */
class Layer {
  readonly v: Uint8Array;
  constructor(readonly w: number, readonly h: number, v?: Uint8Array) {
    this.v = v ?? new Uint8Array(w * h);
  }
  get(x: number, y: number): number {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.v[y * this.w + x] : 0;
  }
  set(x: number, y: number, val: number): void {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.v[y * this.w + x] = val;
  }
  clone(): Layer {
    return new Layer(this.w, this.h, new Uint8Array(this.v));
  }
  empty(): Layer {
    return new Layer(this.w, this.h);
  }
  render(): Canvas {
    const c = new Canvas(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const v = this.v[y * this.w + x];
      if (v) c.set(x, y, PAL[v - 1]);
    }
    return c;
  }
}

interface Key { w: number; h: number; ax: number; ay: number; part: (name: string) => Layer }
const keyCache = new Map<string, Key>();
/** His key frame of a sprite: its size, anchor and pieces (each decoded onto the whole frame). */
function key(name: string): Key {
  const hit = keyCache.get(name);
  if (hit) return hit;
  const r = PV3_REF[name];
  if (!r) throw new Error(`vfx-poison-v3: no reference key frame "${name}"`);
  const parts = new Map<string, Layer>();
  const part = (p: string): Layer => {
    const got = parts.get(p);
    if (got) return got.clone();
    const L = new Layer(r.w, r.h);
    const pc = r.pieces[p];
    if (pc) {
      const bytes = Buffer.from(pc.rle, 'base64');
      let i = 0;
      for (let k = 0; k + 1 < bytes.length; k += 2) {
        const n = bytes[k], val = bytes[k + 1];
        if (val) for (let j = 0; j < n; j++) L.set(pc.x + ((i + j) % pc.w), pc.y + Math.floor((i + j) / pc.w), val);
        i += n;
      }
    }
    parts.set(p, L);
    return L.clone();
  };
  const k = { w: r.w, h: r.h, ax: r.anchor[0], ay: r.anchor[1], part };
  keyCache.set(name, k);
  return k;
}

/**
 * A light field: one colour and a full 8-bit alpha per pixel of the frame (his light read straight
 * from his pixels, or the blast's ground glow made from it), so it dims or spreads smoothly; the
 * blast puts it on his alpha steps only when it draws a frame.
 */
class Light {
  constructor(readonly w: number, readonly h: number, readonly rgb: Color, readonly a: Float32Array) {}
  static of(name: string): Light {
    const r = PV3_REF[name], l = PV3_LIGHT[name];
    if (!r || !l) throw new Error(`vfx-poison-v3: no light for "${name}"`);
    const bytes = inflateSync(Buffer.from(l.a, 'base64'));
    const a = new Float32Array(r.w * r.h);
    for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) a[(l.y + y) * r.w + l.x + x] = bytes[y * l.w + x] / 255;
    return new Light(r.w, r.h, hex(l.rgb), a);
  }
  at(x: number, y: number): number {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.a[y * this.w + x] : 0;
  }
  /** Its alpha times k (a number, or a field). */
  mul(k: number | ((x: number, y: number) => number)): Light {
    const a = new Float32Array(this.a.length);
    for (let i = 0; i < a.length; i++) a[i] = this.a[i] * Math.max(0, typeof k === 'number' ? k : k(i % this.w, (i / this.w) | 0));
    return new Light(this.w, this.h, this.rgb, a);
  }
  /** Scaled by s about (cx, cy) (bilinear, so it spreads smoothly). */
  scaled(s: number, cx: number, cy: number): Light {
    if (s >= 0.999) return this;
    const a = new Float32Array(this.a.length);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const u = cx + (x + 0.5 - cx) / s - 0.5, v = cy + (y + 0.5 - cy) / s - 0.5;
      const x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0;
      a[y * this.w + x] = (this.at(x0, y0) * (1 - fx) + this.at(x0 + 1, y0) * fx) * (1 - fy) + (this.at(x0, y0 + 1) * (1 - fx) + this.at(x0 + 1, y0 + 1) * fx) * fy;
    }
    return new Light(this.w, this.h, this.rgb, a);
  }
  render(): Canvas {
    const c = new Canvas(this.w, this.h);
    for (let i = 0; i < this.a.length; i++) {
      const al = Math.round(clamp(this.a[i], 0, 1) * 255);
      if (al) c.set(i % this.w, (i / this.w) | 0, [this.rgb[0], this.rgb[1], this.rgb[2], al]);
    }
    return c;
  }
}

// --- moves ----------------------------------------------------------------------------------------

/** Layers top over bottom: a later layer wins where it is drawn, except that light never covers slime. */
function union(...ls: (Layer | null)[]): Layer {
  const first = ls.find((l): l is Layer => !!l)!;
  const out = first.empty();
  for (const l of ls) {
    if (!l) continue;
    for (let i = 0; i < out.v.length; i++) {
      const v = l.v[i];
      if (!v) continue;
      if (KIND[v - 1] === 'glow' && out.v[i] && KIND[out.v[i] - 1] !== 'glow') continue;
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
/**
 * Like remap, but each output pixel takes the commonest of 3 x 3 samples (src maps continuous
 * positions), so turned or scaled pixel art keeps clean lines instead of nearest-neighbour jaggies.
 */
function remapSS(L: Layer, src: (x: number, y: number) => [number, number] | null): Layer {
  const out = L.empty();
  const votes = new Map<number, number>();
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    votes.clear();
    let centre = 0;
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
      const s = src(x + (i + 0.5) / 3, y + (j + 0.5) / 3);
      const v = s ? L.get(Math.floor(s[0]), Math.floor(s[1])) : 0;
      if (i === 1 && j === 1) centre = v;
      votes.set(v, (votes.get(v) ?? 0) + 1);
    }
    let best = centre, bn = votes.get(centre) ?? 0;
    for (const [v, n] of votes) if (n > bn) {
      best = v;
      bn = n;
    }
    out.v[y * L.w + x] = best;
  }
  return out;
}
const moved = (L: Layer, dx: number, dy: number): Layer => remap(L, (x, y) => [x - Math.round(dx), y - Math.round(dy)]);
/** Scaled by (sx, sy) about (cx, cy). */
function scaled(L: Layer, sx: number, sy: number, cx: number, cy: number): Layer {
  if (sx < 0.02 || sy < 0.02) return L.empty();
  return remap(L, (x, y) => [Math.floor(cx + (x + 0.5 - cx) / sx), Math.floor(cy + (y + 0.5 - cy) / sy)]);
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

interface ChurnOpts {
  amp: number;
  ampY?: number;
  cell: number;
  seed: number;
  where?: (x: number, y: number) => number;
  flow?: [number, number];
  /** Only these values move and are sampled (the rest stays exactly his). */
  movable?: (v: number) => boolean;
  /** Per pixel, the part it belongs to: a pixel only takes a colour from its own part. */
  part?: Int32Array;
  /**
   * A smooth sub-pixel offset (under half a pixel, so t = 0 is still his picture) added before
   * rounding: patches start to move at different frames, so a small churn changes about as much
   * between every pair of frames instead of nothing at first and then a lot at once.
   */
  jitter?: number;
}
/**
 * His slime churning inside its own silhouette: every body pixel takes the colour of a body pixel
 * of the same family a little way off (the rims and the silhouette stay, so the outline stays
 * clean and slime never bleeds into bone or venom). `flow` adds a drift that runs out and back.
 */
function churn(L: Layer, t: number, o: ChurnOpts): Layer {
  if (t === 0) return L.clone();
  const out = L.clone();
  const ay = o.ampY ?? o.amp;
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const v = L.v[y * L.w + x];
    if (!isKind(v, 'body')) continue;
    const w = o.where ? o.where(x, y) : 1;
    if (w <= 0) continue;
    let [dx, dy] = circleDisp(x, y, t, o.cell, o.seed);
    dx *= o.amp * w;
    dy *= ay * w;
    if (o.flow) {
      const f = Math.sin(t * TAU) * w;
      dx += o.flow[0] * f;
      dy += o.flow[1] * f;
    }
    const jx = o.jitter ? o.jitter * (2 * pnoise(x, y, 4, 0, 0, o.seed + 31) - 1) : 0;
    const jy = o.jitter ? o.jitter * (2 * pnoise(x, y, 4, 0, 0, o.seed + 32) - 1) : 0;
    const sx = Math.round(x - dx + jx), sy = Math.round(y - dy + jy);
    const s = L.get(sx, sy);
    if (o.movable && (!o.movable(v) || !o.movable(s))) continue;
    if (o.part && (sx < 0 || sy < 0 || sx >= L.w || sy >= L.h || o.part[sy * L.w + sx] !== o.part[y * L.w + x])) continue;
    if (isKind(s, 'body') && FAM[s - 1] === FAM[v - 1]) out.v[y * L.w + x] = s;
  }
  return out;
}

/** The whole drawing (silhouette included) swayed a little: tongues and spray lick and settle. */
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

/** Each droplet moved as a whole: move(k, cx, cy) gives its offset (or null to drop it). */
function moveDrops(L: Layer, move: (k: number, cx: number, cy: number) => [number, number] | null): Layer {
  const out = L.empty();
  pieces(L).forEach((pc, k) => {
    let sx = 0, sy = 0;
    for (const i of pc) {
      sx += i % L.w;
      sy += (i / L.w) | 0;
    }
    const m = move(k, sx / pc.length, sy / pc.length);
    if (!m) return;
    const dx = Math.round(m[0]), dy = Math.round(m[1]);
    for (const i of pc) out.set((i % L.w) + dx, ((i / L.w) | 0) + dy, L.v[i]);
  });
  return out;
}

/**
 * Keeps only the pixels keep(x, y) picks; where slime was cut, the new edge gets his rim of its
 * family (so a rising or breaking body keeps a clean outline). Tiny crumbs left are dropped.
 */
function cut(L: Layer, keep: (x: number, y: number) => boolean, minPiece = 3, rim = true): Layer {
  const out = L.empty();
  const gone = new Uint8Array(L.v.length);
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const i = y * L.w + x;
    if (!L.v[i]) continue;
    if (keep(x, y)) out.v[i] = L.v[i];
    else gone[i] = 1;
  }
  if (rim)
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      const i = y * L.w + x;
      const v = out.v[i];
      if (!isKind(v, 'body')) continue;
      if ((x > 0 && gone[i - 1]) || (x < L.w - 1 && gone[i + 1]) || (y > 0 && gone[i - L.w]) || (y < L.h - 1 && gone[i + L.w])) out.v[i] = RIM[FAM[v - 1]];
    }
  for (const pc of pieces(out)) if (pc.length <= minPiece || pc.filter((i) => isKind(out.v[i], 'body') || isKind(out.v[i], 'glow')).length < pc.length * 0.4) for (const i of pc) out.v[i] = 0;
  return out;
}

/** His 1 px rim drawn round the outside of a layer's slime (each in its family's rim colour), as his drops have. */
function rimOut(L: Layer): Layer {
  const out = L.clone();
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    if (L.get(x, y)) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const v = L.get(x + dx, y + dy);
      if (isKind(v, 'body')) {
        out.set(x, y, RIM[FAM[v - 1]]);
        break;
      }
    }
  }
  return out;
}

/** The alpha (0-255) of each of his light's alpha steps. */
const STEP_ALPHA = Array.from({ length: ALPHA_STEPS }, (_, a) => parseInt(PV3_PAL[GLOW0 - 1 + a].rgba.slice(7, 9), 16));
/**
 * His light dimmed (or brightened) by a factor: each glow pixel takes the alpha step nearest to its
 * own alpha times m, keeping its colour (and goes when that is under half the first step), so the
 * light fades smoothly whatever the number of steps.
 */
function glowMul(L: Layer, m: number | ((x: number, y: number) => number)): Layer {
  const out = L.clone();
  for (let i = 0; i < out.v.length; i++) {
    const v = out.v[i];
    if (!isKind(v, 'glow')) continue;
    const k = typeof m === 'number' ? m : m(i % L.w, (i / L.w) | 0);
    if (k === 1) continue;
    const a = (v - GLOW0) % ALPHA_STEPS, c = Math.floor((v - GLOW0) / ALPHA_STEPS);
    const want = STEP_ALPHA[a] * Math.max(0, k);
    if (want < STEP_ALPHA[0] / 2) {
      out.v[i] = 0;
      continue;
    }
    let best = 0;
    for (let s = 1; s < ALPHA_STEPS; s++) if (Math.abs(STEP_ALPHA[s] - want) < Math.abs(STEP_ALPHA[best] - want)) best = s;
    out.v[i] = GLOW0 + c * ALPHA_STEPS + best;
  }
  return out;
}

/** His colours stepped up (k > 0, lit) or down (k < 0, cooled) their own ramps, per pixel. */
function tone(L: Layer, k: number | ((x: number, y: number) => number)): Layer {
  const out = L.clone();
  for (let i = 0; i < out.v.length; i++) {
    const v = out.v[i];
    if (!isKind(v, 'body')) continue;
    const s = Math.round(typeof k === 'number' ? k : k(i % L.w, (i / L.w) | 0));
    if (s > 0) out.v[i] = stepUp(v, s);
    else if (s < 0) out.v[i] = stepDown(v, -s);
  }
  return out;
}

/**
 * A soft band of light running across the art (one step up his ramps where it passes), at its own
 * place for every part of the picture, so the whole sprite never brightens at once. It returns to
 * his picture at t = 0.
 */
function shimmer(L: Layer, t: number, o: { period: number; dir: [number, number]; width?: number; where?: (x: number, y: number) => number }): Layer {
  if (t === 0) return L.clone();
  const wdt = o.width ?? 0.18;
  return tone(L, (x, y) => {
    const w = o.where ? o.where(x, y) : 1;
    if (w <= 0) return 0;
    const ph = fract((x * o.dir[0] + y * o.dir[1]) / o.period - t);
    const ph0 = fract((x * o.dir[0] + y * o.dir[1]) / o.period);
    const band = (p: number) => (Math.abs(p - 0.5) < wdt ? 1 : 0);
    return (band(ph) - band(ph0)) * w;
  });
}

/** A thinning noise key in [0, 1) (for breaking slime up into drops as it fades). */
const grain = (x: number, y: number, seed: number) => pnoise(x, y, 3, 0, 0, seed) * 0.6 + pnoise(x, y, 1.5, 0, 0, seed + 1) * 0.4;
/**
 * His colours cooled q steps down their own ramps, gradually: floor(q) steps everywhere and one
 * more in patches covering the fraction of q (a noise threshold), so the slime cools in patches
 * from frame to frame instead of all at once.
 */
const cool = (L: Layer, q: number, seed: number): Layer =>
  q <= 0 ? L : tone(L, (x, y) => -(Math.floor(q) + (grain(x, y, seed) < 0.15 + 0.7 * (q - Math.floor(q)) && q - Math.floor(q) > 0 ? 1 : 0)));

const stackC = (w: number, h: number, ...cs: (Canvas | Layer | null)[]): Canvas => {
  const out = new Canvas(w, h);
  for (const c of cs) if (c) out.draw(c instanceof Layer ? c.render() : c, 0, 0);
  return out;
};

/**
 * His art ran off the top of his panel: the rows near the top fade out, smoothly (smoothstep over n
 * rows, full alpha precision) along a ragged line (each column's start moved by up to +-4 px by a
 * smooth wave on four scales, 3-9 px, low-passed across the columns so neighbouring columns never
 * jump: no comb or barcode stripes; its scales do not line up, so it never runs flat for long either;
 * row 0 stays clear for y0 >= 5), so the pillar and the mist round it end softly with no stripes
 * and no straight edge.
 */
function fadeTop(c: Canvas, y0: number, n: number, seed: number): Canvas {
  const out = c.clone();
  for (let x = 0; x < c.w; x++) {
    const ph = (k: number) => rnd(seed + k, 0) * TAU;
  const o = 1.4 * (2 * pnoise(x, 0, 6, 0, 0, seed) - 1) + 1.5 * Math.sin((x * TAU) / 9.1 + ph(1)) + 0.9 * Math.sin((x * TAU) / 5.3 + ph(2)) + 0.6 * Math.sin((x * TAU) / 3.1 + ph(3));
    for (let y = 0; y < Math.min(c.h, y0 + n + 5); y++) {
      const k = smooth(y0 + o - 1, y0 + o + n, y + 0.5);
      const i = (y * c.w + x) * 4 + 3;
      out.px[i] = Math.round(out.px[i] * k);
    }
  }
  return out;
}

/**
 * Frame counts (the owner asked for slower, smoother jutsu: more frames, small steps between them).
 * Flying loops: 8 frames at 10 fps. Hit: 12 at 12. Blast: 16 at 12. Wall rise: 12 at 12, idle: 8 at
 * 10. Aura: 12 at 10. His picture stays the key frame of each.
 */
const FLY = 8, FLY_FPS = 10, AURA = 12, AURA_FPS = 10, RISE = 12, IDLE = 8;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const fly = (frames: Canvas[]) => ({ fly: { frames, fps: FLY_FPS, loop: true } });

/** Drift that starts at 0 and wraps (a droplet leaving is replaced by one arriving). */
const drift = (t: number, ph: number) => fract(ph + t) - ph;
/** A small circle a droplet bobs round, starting from where he drew it. */
const bob = (t: number, ph: number, r: number): [number, number] => [r * (Math.cos(t * TAU + ph) - Math.cos(ph)), r * (Math.sin(t * TAU + ph) - Math.sin(ph))];

// --- projectiles -------------------------------------------------------------------------------------

/**
 * bolt: his swirling slime glob with its purple venom splash and drops. The coil turns (a full
 * turn a loop, inside its own outline), the cone of slime behind it churns back, the venom mist
 * sways and drifts, the drops and motes stream back.
 */
function bolt(): WorldSprite {
  const K = key('bolt'), seed = 7100;
  const main = K.part('main'), mist = K.part('mist'), drops = K.part('drops'), glow = K.part('glow');
  // His coil: the slime within 17 px of the core (the cone behind it stays).
  const R = 17;
  const coil = remap(main, (x, y) => (Math.hypot(x - K.ax, y - K.ay) < R ? [x, y] : null));
  const fr = range(FLY).map((i) => {
    const t = i / FLY;
    // The swirl: his coil turns a full turn a loop inside its own outline (sampled only from the
    // coil, 3 x 3 samples a pixel, so its arms stay clean lines).
    // Only his slime inside the coil turns (nearest pixel, so his dark spiral arms keep their
    // colours and contrast); his rim and its pale highlight stay where he drew them.
    const cx = K.ax + 0.5, cy = K.ay + 0.5, a = -t * TAU, ca = Math.cos(a), sa = Math.sin(a);
    const swirl = (v: number) => isKind(v, 'body') && FAM[v - 1] === 'green';
    let m = main.clone();
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const k = y * m.w + x, v = coil.v[k];
      if (!swirl(v) || Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > R - 2.5) continue;
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const s2 = coil.get(Math.floor(cx + dx * ca - dy * sa), Math.floor(cy + dx * sa + dy * ca));
      if (swirl(s2)) m.v[k] = s2;
    }
    // The cone behind it churns and streams back.
    m = churn(m, t, { amp: 1.4, ampY: 0.7, cell: 6, seed, where: (x, y) => smooth(K.ax - R + 2, K.ax - R - 6, x) * (Math.hypot(x - K.ax, y - K.ay) >= R ? 1 : 0), flow: [-1, 0] });
    const ms = wobble(churn(mist, t, { amp: 1.6, cell: 6, seed: seed + 1 }), t, 1.1, 9, seed + 2);
    const d = moveDrops(drops, (k, cx) => {
      if (cx > K.ax - 6) return bob(t, rr(seed + 3, k, 0, TAU), 1.2);
      const u = drift(t, rr(seed + 4, k, 0, 1));
      return [-5 * u, 2.5 * u];
    });
    return stackC(K.w, K.h, glow, ms, m, d);
  });
  return vfxSprite('bolt', 'Poison bolt: swirling slime glob in a venom splash', [K.ax, K.ay], fly(fr));
}

/** breath: his cone of acid from the orb at its apex. It churns outward, the venom mist sways round its edges, the drops fly on. */
function breath(): WorldSprite {
  const K = key('breath'), seed = 7200;
  const ox = K.ax, oy = K.ay; // his orb at the apex (the caster's hands)
  const main = K.part('main'), mist = K.part('mist'), drops = K.part('drops'), glow = K.part('glow');
  const fr = range(FLY).map((i) => {
    const t = i / FLY;
    const reach = (x: number) => smooth(ox + 8, ox + 36, x);
    let m = churn(main, t, { amp: 2, ampY: 1.3, cell: 6, seed, where: reach, flow: [1.6, 0] });
    m = wobble(m, t, 1, 10, seed + 1, (x) => smooth(ox + 50, ox + 90, x));
    const ms = wobble(churn(mist, t, { amp: 1.5, cell: 6, seed: seed + 2 }), t, 1.2, 10, seed + 3);
    const d = moveDrops(drops, (k, cx, cy) => {
      const u = drift(t, rr(seed + 4, k, 0, 1));
      const a = Math.atan2(cy - oy, cx - ox);
      return [Math.cos(a) * 6 * u, Math.sin(a) * 6 * u + 2 * u * u];
    });
    return stackC(K.w, K.h, glow, ms, m, d);
  });
  return vfxSprite('breath', 'Poison breath: cone of acid with bubbles and venom mist (origin at the anchor)', [ox, oy], fly(fr));
}

/** The principal axes of a layer's pixels round (cx, cy): angle of the long axis, and the radii. */
function ellipseOf(L: Layer, cx: number, cy: number): { ang: number; a: number; b: number } {
  let sxx = 0, syy = 0, sxy = 0, n = 0;
  for (let i = 0; i < L.v.length; i++) {
    if (!L.v[i]) continue;
    const x = (i % L.w) - cx, y = ((i / L.w) | 0) - cy;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
    n++;
  }
  sxx /= n;
  syy /= n;
  sxy /= n;
  const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const l1 = (sxx + syy) / 2 + Math.sqrt(((sxx - syy) / 2) ** 2 + sxy * sxy), l2 = (sxx + syy) / 2 - Math.sqrt(((sxx - syy) / 2) ** 2 + sxy * sxy);
  return { ang, a: Math.sqrt(2 * l1), b: Math.sqrt(2 * Math.max(1, l2)) };
}

/**
 * sphere: his green orb inside a purple swirling ring. The ring swings round its own ellipse
 * (+-11 degrees, its far half passing behind the orb), the slime inside the orb churns under his
 * highlight, the motes and drops orbit a little.
 */
function sphere(): WorldSprite {
  const K = key('sphere'), seed = 7300;
  const main = K.part('main'), ring = K.part('ring'), drops = K.part('drops'), glow = K.part('glow');
  const E = ellipseOf(ring, K.ax, K.ay);
  const ca = Math.cos(E.ang), sa = Math.sin(E.ang);
  // Ring coordinates: along the long axis (u) and across it, stretched to a circle (w).
  const toC = (x: number, y: number): [number, number] => {
    const dx = x - K.ax - 0.5, dy = y - K.ay - 0.5;
    return [dx * ca + dy * sa, (-dx * sa + dy * ca) * (E.a / E.b)];
  };
  const fromC = (u: number, w: number): [number, number] => {
    const v = w * (E.b / E.a);
    return [K.ax + 0.5 + u * ca - v * sa, K.ay + 0.5 + u * sa + v * ca];
  };
  const fr = range(FLY).map((i) => {
    const t = i / FLY;
    const d = 0.19 * Math.sin(t * TAU);
    const rot = remapSS(ring, (x, y) => {
      const [u, w] = toC(x, y);
      const c = Math.cos(-d), s = Math.sin(-d);
      return fromC(u * c - w * s, u * s + w * c);
    });
    // Far half (above the long axis) behind the orb, near half over it.
    const back = rot.empty(), front = rot.empty();
    for (let y = 0; y < rot.h; y++) for (let x = 0; x < rot.w; x++) {
      const v = rot.get(x, y);
      if (!v) continue;
      (toC(x, y)[1] < 0 ? back : front).set(x, y, v);
    }
    const m = churn(main, t, { amp: 1.3, cell: 6, seed, where: (x, y) => 1 - smooth(9, 13, Math.hypot(x - K.ax, y - K.ay)) });
    const dr = moveDrops(drops, (k) => bob(t, rr(seed + 1, k, 0, TAU), 1.3));
    return stackC(K.w, K.h, glow, back, m, front, dr);
  });
  return vfxSprite('sphere', 'Poison sphere: green orb in a swirling venom ring', [K.ax, K.ay], fly(fr));
}

/** slash: his green crescent with its bone-white fang edges. The slime churns along the blade (evenly from frame to frame), the spatter bobs. */
function slash(): WorldSprite {
  const K = key('slash'), seed = 7400;
  const main = K.part('main'), dashes = K.part('dashes'), glow = K.part('glow'), drops = K.part('drops');
  // Each crescent churns only inside itself (its own slime, mid tones only): the dark gap between
  // them, their dark tear lines and the bone-white fang edges stay exactly his.
  const part = new Int32Array(main.w * main.h).fill(-1);
  pieces(main).forEach((pc, k) => {
    for (const j of pc) part[j] = k;
  });
  const movable = (v: number) => isKind(v, 'body') && FAM[v - 1] === 'green' && lumOf(PAL[v - 1]) >= 70;
  const spatter = union(dashes, drops);
  const fixedAt = new Set<number>();
  for (const pc of pieces(spatter)) {
    let touches = false;
    for (const j of pc) {
      const x = j % K.w, y = (j / K.w) | 0;
      for (let dy = -1; dy <= 1 && !touches; dy++) for (let dx = -1; dx <= 1; dx++) if (main.get(x + dx, y + dy)) touches = true;
      if (touches) break;
    }
    if (!touches) continue;
    let sx = 0, sy = 0;
    for (const j of pc) {
      sx += j % K.w;
      sy += (j / K.w) | 0;
    }
    fixedAt.add(Math.round(sy / pc.length) * K.w + Math.round(sx / pc.length));
  }
  const fr = range(FLY).map((i) => {
    const t = i / FLY;
    const m = churn(main, t, { amp: 0.75, cell: 5, seed, movable, part, jitter: 0.45 });
    // (the spatter and dashes bob round small circles, each on its own beat, so every frame moves
    // them about as much and nothing jumps back when the loop closes; a bit that touches a
    // crescent is part of its edge and stays)
    const ds = moveDrops(spatter, (k, cx, cy) => {
      if (fixedAt.has(Math.round(cy) * K.w + Math.round(cx))) return [0, 0];
      return bob(t, rr(seed + 1, k, 0, TAU), 1.4);
    });
    return stackC(K.w, K.h, glow, ds, m);
  });
  return vfxSprite('slash', 'Poison slash: green crescent with bone-white fang edges', [K.ax, K.ay], fly(fr));
}

/** multi: his three glob darts. Each bobs on its own beat and churns; the trails and spatter stream back. */
function multi(): WorldSprite {
  const K = key('multi'), seed = 7500;
  const main = K.part('main'), glow = K.part('glow'), drops = K.part('drops');
  // The darts are the three biggest pieces; what else is in 'main' streams with the spatter.
  const all = pieces(main).sort((a, b) => b.length - a.length);
  const darts = all.slice(0, 3);
  const rest = main.empty();
  for (const pc of all.slice(3)) for (const j of pc) rest.v[j] = main.v[j];
  const fr = range(FLY).map((i) => {
    const t = i / FLY;
    const m = main.empty();
    darts.forEach((pc, k) => {
      const ph = rr(seed, k, 0, TAU);
      const dy = Math.round(1.2 * Math.sin(t * TAU + ph)) - Math.round(1.2 * Math.sin(ph));
      for (const j of pc) m.set(j % m.w, ((j / m.w) | 0) + dy, main.v[j]);
    });
    const mm = churn(m, t, { amp: 1.2, ampY: 0.7, cell: 5, seed: seed + 1, flow: [-1, 0] });
    const sp = moveDrops(union(rest, drops), (k) => [-4 * drift(t, rr(seed + 2, k, 0, 1)), 0]);
    const g = moved(glow, -Math.round(2 * drift(t, 0)), 0);
    return stackC(K.w, K.h, g, sp, mm);
  });
  return vfxSprite('multi', 'Poison multi: three glob darts with trails', [K.ax, K.ay], fly(fr));
}

// --- stream ---------------------------------------------------------------------------------------

/** The stream tile scrolled by s px (content moves right; it wraps, so it still tiles). */
const scrolled = (T: Layer, s: number): Layer => remap(T, (x, y) => [(((x - Math.round(s)) % 64) + 64) % 64, y]);

/**
 * stream: his slime beam, 64 px, scrolling 8 px a frame along the line. stream_head: his splash.
 * On frame 0 the head is his splash as he drew it (the tile ends where his head begins, so the
 * joint is his picture); on later frames the scrolled beam flows into the splash up to a seam cut
 * where the two match best, and the splash churns and throws its spray.
 */
function stream(): WorldSprite[] {
  const KT = key('stream'), KH = key('stream_head'), seed = 7600;
  const T = union(KT.part('glow'), KT.part('main'), KT.part('drops'));
  const step = 64 / FLY;
  const tile = range(FLY).map((i) => scrolled(T, step * i).render());
  const hm = union(KH.part('glow'), KH.part('main')), hd = KH.part('drops'), hp = KH.part('mist');
  const off = KH.ay - KT.ay; // the head's rows below the tile's
  const head = range(FLY).map((i) => {
    const t = i / FLY;
    if (i === 0) return stackC(KH.w, KH.h, hp, hm, hd);
    const crest = wobble(churn(hm, t, { amp: 1.8, cell: 6, seed, where: (x) => smooth(16, 30, x), flow: [1.2, 0] }), t, 1, 8, seed + 1, (x) => smooth(30, 46, x));
    const jet = remap(scrolled(T, step * i), (x, y) => (x < 64 ? [x, y - off] : null));
    // Per row, the seam (between columns 2 and 22) where the beam and the splash differ least,
    // moving at most 1 px from row to row.
    const lo = 2, hi = 22, n = hi - lo + 1;
    const diff = (x: number, y: number) => {
      const a = jet.get(x, y), b = crest.get(x, y);
      if (!a && !b) return 0;
      if (!a || !b) return 220;
      const ca = PAL[a - 1], cb = PAL[b - 1];
      return Math.hypot(ca[0] - cb[0], ca[1] - cb[1], ca[2] - cb[2]);
    };
    const acc: number[][] = [], back: number[][] = [];
    for (let y = 0; y < KH.h; y++) {
      acc.push([]);
      back.push([]);
      for (let k = 0; k < n; k++) {
        const s = lo + k;
        const c = diff(s, y) + diff(s - 1, y) + k * 0.4;
        if (!y) {
          acc[y].push(c);
          back[y].push(k);
          continue;
        }
        let best = k;
        for (const j of [k - 1, k + 1]) if (j >= 0 && j < n && acc[y - 1][j] < acc[y - 1][best]) best = j;
        acc[y].push(c + acc[y - 1][best]);
        back[y].push(best);
      }
    }
    const seam = new Array<number>(KH.h);
    let k = acc[KH.h - 1].indexOf(Math.min(...acc[KH.h - 1]));
    for (let y = KH.h - 1; y >= 0; y--) {
      seam[y] = lo + k;
      k = back[y][k];
    }
    const m = crest.empty();
    for (let y = 0; y < KH.h; y++) for (let x = 0; x < KH.w; x++) m.set(x, y, x < seam[y] ? jet.get(x, y) : crest.get(x, y));
    const mist = wobble(churn(hp, t, { amp: 1.4, cell: 6, seed: seed + 2 }), t, 1.1, 8, seed + 3);
    const d = moveDrops(hd, (q, cx, cy) => {
      if (cx < 30) return null; // (the beam's own spatter comes in with the tile)
      const u = drift(t, rr(seed + 4, q, 0, 1));
      const a = Math.atan2(cy - KH.ay, cx - KH.ax);
      return [Math.cos(a) * 4 * u + 1.5 * u, Math.sin(a) * 4 * u + 1.5 * u * u];
    });
    // The beam's spatter left of the seam scrolls with the tile.
    return stackC(KH.w, KH.h, mist, m, d);
  });
  return [
    vfxSprite('stream', 'Poison stream: green slime beam with spatter (tileable 64 px)', [0, 32], fly(tile)),
    vfxSprite('stream_head', 'Poison stream head: splashing burst of slime', [KH.ax, KH.ay], fly(head)),
  ];
}

// --- hit and blast -------------------------------------------------------------------------------------

/**
 * hit: his spiky green splat, 12 frames. It builds out of a small core over 3 frames, frame 3 is
 * his picture and it holds there to frame 5 (only churning), then it slowly breaks up from the
 * core outward into flying drops that fall, cool down his ramps and fade over 6 frames (6-11). His violet
 * streaks fly out and thin away.
 */
function hit(): WorldSprite {
  const K = key('hit'), seed = 7700;
  const main = K.part('main'), drops = K.part('drops'), glow = K.part('glow'), streaks = K.part('streaks');
  const r = (x: number, y: number) => Math.hypot(x - K.ax, y - K.ay);
  // s: scale; reach: radius shown while it builds; d: spread of drops and streaks; g: his light's
  // strength; thin: how much has broken up; cool: ramp steps down (gradual); a: opacity at the end.
  // churn: how far his slime churns (px; 0 = still): the hold barely moves, so his picture and his
  // cell grid stay through frame 5 and it breaks up over frames 6-11, its last frame at about a tenth
  // of the peak's light (opacity 0.21, so no pixel is over alpha 60).
  const plan = [
    { s: 0.58, reach: 16, d: 0.58, g: 0.4, thin: 0, cool: 0, a: 0.93, churn: 0 },
    { s: 0.75, reach: 24, d: 0.75, g: 0.62, thin: 0, cool: 0, a: 1, churn: 0 },
    { s: 0.875, reach: 32, d: 0.875, g: 0.8, thin: 0, cool: 0, a: 1, churn: 0 },
    { s: 1, reach: 99, d: 1, g: 1, thin: 0, cool: 0, a: 1, churn: 0 },
    { s: 1, reach: 99, d: 1.02, g: 1, thin: 0, cool: 0, a: 1, churn: 0.3 },
    { s: 1, reach: 99, d: 1.06, g: 0.95, thin: 0, cool: 0, a: 1, churn: 0.33 },
    { s: 1.02, reach: 99, d: 1.13, g: 0.82, thin: 0.1, cool: 0.4, a: 0.92, churn: 1 },
    { s: 1.04, reach: 99, d: 1.21, g: 0.68, thin: 0.2, cool: 0.8, a: 0.84, churn: 1.2 },
    { s: 1.06, reach: 99, d: 1.3, g: 0.54, thin: 0.29, cool: 1.2, a: 0.7, churn: 1.2 },
    { s: 1.08, reach: 99, d: 1.39, g: 0.4, thin: 0.36, cool: 1.6, a: 0.62, churn: 1.2 },
    { s: 1.1, reach: 99, d: 1.48, g: 0.27, thin: 0.43, cool: 2, a: 0.45, churn: 1.2 },
    { s: 1.12, reach: 99, d: 1.57, g: 0.14, thin: 0.5, cool: 2.4, a: 0.21, churn: 1.2 },
  ];
  const fr = plan.map((p, i) => {
    let m = scaled(main, p.s, p.s, K.ax, K.ay);
    if (p.reach < 99) m = cut(m, (x, y) => r(x, y) <= p.reach + 2 * pnoise(x, y, 3, 0, 0, seed));
    if (p.churn > 0) m = churn(m, (i - 3) / 9, { amp: p.churn, cell: 5, seed });
    if (p.thin > 0) m = cut(m, (x, y) => grain(x, y, seed + 7) * 0.4 + Math.min(1, r(x, y) / 30) * 0.6 > p.thin, 4);
    m = cool(m, p.cool, seed + 11);
    const spread = (L: Layer, fall: boolean) => moveDrops(L, (k, cx, cy) => {
      if (i >= 9 && rnd(seed + 8, k) < (i - 8) * 0.3) return null;
      const f = fall ? Math.max(0, i - 4) ** 2 * 0.15 : 0;
      return [(cx - K.ax) * (p.d - 1), (cy - K.ay) * (p.d - 1) + f];
    });
    const d = cool(spread(scaled(drops, Math.min(1, p.s), Math.min(1, p.s), K.ax, K.ay), true), p.cool, seed + 12);
    let st = spread(scaled(streaks, Math.min(1, p.s), Math.min(1, p.s), K.ax, K.ay), false);
    if (p.thin > 0) st = cut(st, (x, y) => grain(x, y, seed + 9) > p.thin * 0.9, 1, false);
    const g = scaled(glowMul(glow, p.g), Math.min(1, p.s), Math.min(1, p.s), K.ax, K.ay);
    const c = stackC(K.w, K.h, g, st, m, i === 0 ? null : d);
    return p.a < 1 ? fade(c, p.a) : c;
  });
  return vfxSprite('hit', 'Poison hit: spiky green splat with drops', [K.ax, K.ay], { hit: { frames: fr, fps: 12, loop: false } });
}

/**
 * Small pieces of a layer (his drops), each as pixels relative to its centre, smallest first: the
 * shapes the spray is made of.
 */
function dropShapes(L: Layer, minPx: number, maxPx: number, fam: Fam): [number, number, number][][] {
  return pieces(L)
    .filter((pc) => pc.length >= minPx && pc.length <= maxPx && pc.filter((j) => FAM[L.v[j] - 1] === fam).length >= pc.length * 0.6)
    .map((pc) => {
      let sx = 0, sy = 0;
      for (const j of pc) {
        sx += j % L.w;
        sy += (j / L.w) | 0;
      }
      const cx = Math.round(sx / pc.length), cy = Math.round(sy / pc.length);
      return pc.map((j) => [(j % L.w) - cx, ((j / L.w) | 0) - cy, L.v[j]] as [number, number, number]);
    })
    .sort((a, b) => a.length - b.length || a[0][0] - b[0][0] || a[0][1] - b[0][1]);
}
/** A drop shape at a smaller size (nearest), its rim kept round the outside. */
function shrinkShape(s: [number, number, number][], k: number): [number, number, number][] {
  const m = new Map<string, number>();
  for (const [dx, dy, v] of s) m.set(`${dx},${dy}`, v);
  const out: [number, number, number][] = [];
  const R = Math.max(...s.map(([dx, dy]) => Math.max(Math.abs(dx), Math.abs(dy)))) + 1;
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
    const v = m.get(`${Math.round(x / k)},${Math.round(y / k)}`);
    if (v && !out.some((o) => o[0] === x && o[1] === y)) out.push([x, y, v]);
  }
  // (the rim: any body pixel on the outside of the small shape takes his rim colour)
  const has = new Set(out.map(([x, y]) => `${x},${y}`));
  return out.map(([x, y, v]) => {
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !has.has(`${x + a},${y + b}`));
    return [x, y, edge && isKind(v, 'body') ? RIM[FAM[v - 1]] : v] as [number, number, number];
  });
}

/**
 * His art faded out above a ragged line: nothing above line(x) - 1, full from line(x) + n down
 * (smoothstep, full alpha precision), so whatever comes up from below shows a soft, uneven top and
 * never a straight cut.
 */
function fadeAbove(c: Canvas, line: (x: number) => number, n: number): Canvas {
  const out = c.clone();
  for (let x = 0; x < c.w; x++) {
    const y0 = line(x);
    for (let y = 0; y < Math.min(c.h, Math.ceil(y0 + n) + 1); y++) {
      const i = (y * c.w + x) * 4 + 3;
      if (out.px[i]) out.px[i] = Math.round(out.px[i] * smooth(y0 - 1, y0 + n, y + 0.5));
    }
  }
  return out;
}

/**
 * Churning and cooling can leave 2 x 2 checkerboards of two colours (a dither his art does not
 * have there): each such block of opaque pixels takes the commoner of its two colours round it.
 */
function dechecker(c: Canvas): Canvas {
  const out = c.clone();
  const { w, h } = c;
  const at = (x: number, y: number) => (y * w + x) * 4;
  const same = (i: number, j: number) => out.px[i] === out.px[j] && out.px[i + 1] === out.px[j + 1] && out.px[i + 2] === out.px[j + 2] && out.px[i + 3] === out.px[j + 3];
  for (let y = 0; y + 1 < h; y++)
    for (let x = 0; x + 1 < w; x++) {
      const a = at(x, y), b = at(x + 1, y), cc = at(x, y + 1), d = at(x + 1, y + 1);
      if (out.px[a + 3] < 255 || out.px[b + 3] < 255 || out.px[cc + 3] < 255 || out.px[d + 3] < 255) continue;
      if (!same(a, d) || !same(b, cc) || same(a, b)) continue;
      let na = 0, nb = 0;
      for (let v = Math.max(0, y - 1); v <= Math.min(h - 1, y + 2); v++)
        for (let u = Math.max(0, x - 1); u <= Math.min(w - 1, x + 2); u++) {
          if (same(at(u, v), a)) na++;
          else if (same(at(u, v), b)) nb++;
        }
      const src = na >= nb ? a : b;
      const col: Color = [out.px[src], out.px[src + 1], out.px[src + 2], out.px[src + 3]];
      for (const [u, v] of [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]]) out.set(u, v, col);
    }
  return out;
}

/** Lone faint pixels (alpha under maxA, all 8 neighbours clear) taken out. */
function dropSpecks(c: Canvas, maxA: number): Canvas {
  const out = c.clone();
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const a = c.px[(y * c.w + x) * 4 + 3];
      if (!a || a >= maxA) continue;
      let lone = true;
      for (let dy = -1; dy <= 1 && lone; dy++) for (let dx = -1; dx <= 1 && lone; dx++) if ((dx || dy) && c.alpha(x + dx, y + dy)) lone = false;
      if (lone) out.px[(y * c.w + x) * 4 + 3] = 0;
    }
  return out;
}

/**
 * The longest run of neighbouring columns whose topmost violet pixel (alpha 48 or more) lies on the
 * same row: a straight cut across his venom mist (or his violet slime) shows as a long run.
 */
function flatVioletRun(c: Canvas): number {
  const topRow = new Array<number>(c.w).fill(-1);
  for (let x = 0; x < c.w; x++)
    for (let y = 0; y < c.h; y++) {
      const i = (y * c.w + x) * 4;
      if (c.px[i + 3] >= 48 && c.px[i] > c.px[i + 1] + 10 && c.px[i + 2] > c.px[i + 1] + 10) {
        topRow[x] = y;
        break;
      }
    }
  let best = 0, run = 0, at = 0;
  for (let x = 0; x < c.w; x++) {
    run = topRow[x] >= 0 && x > 0 && topRow[x] === topRow[x - 1] ? run + 1 : topRow[x] >= 0 ? 1 : 0;
    if (run > best) (best = run), (at = x);
  }
  if (process.env.POISON_DEBUG && best > 4) console.log(`flat violet run ${best} ending at x ${at}, row ${topRow[at]}`);
  return best;
}
/** Frames with a straight violet top (the build fails on any). */
const MIST_FAULTS: string[] = [];

/** An alpha (0-1) put on his light's own alpha steps (0-255): the nearest step, none under half the first. */
function stepAlpha(a: number): number {
  const want = a * 255;
  if (want < STEP_ALPHA[0] / 2) return 0;
  let best = 0;
  for (let s = 1; s < ALPHA_STEPS; s++) if (Math.abs(STEP_ALPHA[s] - want) < Math.abs(STEP_ALPHA[best] - want)) best = s;
  return STEP_ALPHA[best];
}

/**
 * The blast's light: the pool's green glow on the ground round its right end. In his picture that
 * light is the pool lighting the ground and his character's legs; read from his pixels and continued
 * behind his removed character, it had become a block (a straight top and right edge, a wall of light
 * above the ground). It is one soft ellipse on the ground plane instead, his colour, with no edge:
 *  - centred inside the pool's right end (INSET px in from its rightmost column, on the rows that
 *    reach it), so the light wraps that end of the pool and is brightest at the pool's edge, at his
 *    light's level there (his light just outside the pool's right end);
 *  - falling smoothly to nothing over the ground, by the ellipse's radius r (0 at the centre, 1 at its
 *    rim) past the pool's edge (d = r - INSET / its right radius): exp(-S A (sqrt(1 + (d / A)^2) - 1)),
 *    level at the pool's edge, then falling by a share that grows to S per unit of r and never more
 *    (so its faint outer bands are as wide as its bright ones, and none pinches against his art into
 *    a dark slit). The ellipse reaches right to his panel's edge (x 245), where his own light ended
 *    (79 px from its centre), but only UP px up the far ground and DOWN px down the near ground
 *    (foreshortened, the ground lying flat); its faintest step (alpha 10) ends on the ellipse's rim,
 *    a curve;
 *  - under the pool it stays at the edge's level (no brighter), so the ground the pool leaves as it
 *    breaks up is lit like the ground round it, with no bright core and no dark ghost.
 * The frames put it on his light's alpha steps (stepAlpha), so it falls off in soft elliptical bands.
 */
function groundGlow(pool: Layer, his: Light): Light {
  const { w, h } = his;
  const INSET = 28, RIGHT = 245, LEFT = 40, UP = 48, DOWN = 43, A = 0.2, S = 5.6;
  const slime = (x: number, y: number) => {
    const v = pool.get(x, y);
    return v > 0 && !isKind(v, 'glow');
  };
  let xR = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (slime(x, y)) xR = Math.max(xR, x);
  let sy = 0, ny = 0;
  for (let y = 0; y < h; y++)
    if (slime(xR, y) || slime(xR - 1, y)) {
      sy += y + 0.5;
      ny++;
    }
  const cy = sy / ny, cx = xR + 1 - INSET;
  // (his light just outside the pool's right end: 8 px out, over the 7 rows round its centre)
  let sa = 0, na = 0;
  for (let y = Math.floor(cy) - 3; y <= Math.floor(cy) + 3; y++)
    for (let x = xR + 1; x <= xR + 8; x++) {
      sa += his.at(x, y);
      na++;
    }
  const edge = sa / na, rx = RIGHT - cx, rEdge = INSET / rx;
  const a = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const r = Math.hypot(dx / (dx > 0 ? rx : LEFT), dy / (dy > 0 ? DOWN : UP));
      const d = Math.max(0, r - rEdge);
      if (r < 1) a[y * w + x] = edge * Math.exp(-S * A * (Math.sqrt(1 + (d / A) ** 2) - 1));
    }
  if (process.env.POISON_DEBUG) console.log(`blast ground glow: centre ${cx.toFixed(1)},${cy.toFixed(1)}, pool's right end x ${xR}, his light there ${(edge * 255).toFixed(1)}`);
  return new Light(w, h, his.rgb, a);
}

/**
 * The light check: pixels of a frame darker than half the light round them, a hole in the light and
 * not its own outer edge. A pixel fails when it is not his slime (alpha under 200), the strongest
 * pixel of the light's own colour within 3 px is alpha 24 or more and more than twice its alpha, and
 * along some direction (across, down or a diagonal) there is something more than twice its alpha
 * (light, or slime) on both sides of it within 3 px. Returns the mask.
 */
function lightHoles(c: Canvas, rgb: Color): Uint8Array {
  const { w, h } = c, n = w * h;
  const al = new Int16Array(n), lit = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const a = c.px[i * 4 + 3];
    al[i] = a;
    if (a && Math.abs(c.px[i * 4] - rgb[0]) <= 3 && Math.abs(c.px[i * 4 + 1] - rgb[1]) <= 3 && Math.abs(c.px[i * 4 + 2] - rgb[2]) <= 3) lit[i] = a;
  }
  const S = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : al[y * w + x] >= 200 ? 255 : al[y * w + x]);
  const out = new Uint8Array(n);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x, a = al[i];
      if (a >= 200) continue;
      let m = 0;
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          const u = x + dx, v = y + dy;
          if ((dx || dy) && dx * dx + dy * dy <= 9 && u >= 0 && v >= 0 && u < w && v < h) m = Math.max(m, lit[v * w + u]);
        }
      if (m < 24 || 2 * a >= m) continue;
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        let sp = 0, sn = 0;
        for (let k = 1; k <= 3; k++) {
          sp = Math.max(sp, S(x + dx * k, y + dy * k));
          sn = Math.max(sn, S(x - dx * k, y - dy * k));
        }
        if (sp > 2 * a && sn > 2 * a) {
          out[i] = 1;
          break;
        }
      }
    }
  return out;
}
/** Blast frames with a hole in the light (the build fails on any). */
const LIGHT_FAULTS: string[] = [];
/** Per blast frame: the light-check pixels his own picture has where it stands (exempt), and the faults. */
const LIGHT_LOG: string[] = [];

/**
 * blast: his gushing pillar of slime over its bubbling pool, 16 frames.
 *  - The pillar and the pool are cut apart along the line where his pillar's flared foot meets the
 *    bubbles (traced on his picture), so the pillar can move inside the pool: the pool is drawn in
 *    front of it. Its new top edge has no dark rim while the pillar stands behind it (so no seam
 *    shows at the pillar's foot); his slime rim closes it only where nothing is behind it any more.
 *    While the pillar moves, his pool runs on behind it (made from the pool's own pixels, its back
 *    rim continued across), so the ground never shows between the pool's cut edge and the pillar.
 *  - Anticipation 0-3: the pool opens out of the ground and his pillar gushes up out of it: the
 *    whole pillar is pushed up through the pool's surface (translated, never wiped or stretched),
 *    thin at first and filling out, its top a splashing crown: tongues of his slime licking up,
 *    each throwing off one of his own drop shapes, the round drop clinging to his pillar's side
 *    left off until the pillar stands; his venom mist comes up beside it, its top fading out along
 *    a ragged soft line (never a straight cut); the splash drops fly out from the pool's edge to
 *    where he drew them; his light spreads with the pool.
 *  - Frame 4 is his picture, held to frame 6 (the slime churns, the mist sways).
 *  - Settle 7-15: the pillar sinks back down through the pool's surface, slumping wider, with the
 *    same splashing crown on its falling top, until it is gone (frame 14); drops break off the crown
 *    and fall in arcs back into the pool; his drops rain down, the mist rises and thins, his light
 *    dims, the pool breaks up from its outer edge in (the slime round the pillar's foot goes last)
 *    into shrinking, cooling islands (no dark rims round the holes, its lip breaking up with the
 *    rest, and never opening a hole inside itself), the pillar's violet roots sink into the pool
 *    by frame 11 (a rounded front running down each root), and it fades.
 * The crown is a dome with lobes between its tongues (never a flat top: the build fails on a run
 * over 4 columns). No frame has an enclosed see-through pixel (alpha under 128 that the outside
 * cannot reach): the build fails on any.
 * His pillar ran off the top of his panel, so the top rows fade out along a ragged line.
 */
function blast(): WorldSprite {
  const K = key('blast'), seed = 7800;
  const col = K.part('main'), pool = K.part('pool'), mist = K.part('mist'), drops = K.part('drops'), glow = K.part('glow');
  // (his light as read from his pixels: it sorts his glows and sets the ground glow's level; the
  // light drawn is the ground glow round the pool's right end)
  const hisLight = Light.of('blast');
  const light = groundGlow(pool, hisLight);
  const glowG = glow.empty(), glowP = glow.empty();
  for (let i = 0; i < glow.v.length; i++) if (glow.v[i]) (FAM[glow.v[i] - 1] === 'purple' ? glowP : glowG).v[i] = glow.v[i];
  // (the round drop on top of his right splash stalk is the pool's, not the pillar's: the pieces of
  // `main` away from the shaft go with the pool, so the stalk keeps its drop while the pillar moves)
  const stalkTop = col.empty();
  {
    const pcs = pieces(col).sort((a, b) => b.length - a.length);
    for (const pc of pcs.slice(1)) {
      const cx = pc.reduce((s, j) => s + (j % K.w), 0) / pc.length;
      if (cx > 134 + 8 || cx < 72 - 8)
        for (const j of pc) {
          stalkTop.v[j] = col.v[j];
          col.v[j] = 0;
        }
    }
  }
  const colTop = tops(col);
  const top = Math.min(...colTop);
  // The shaft's centre line and half width, measured on its upper part.
  let sx0 = K.w, sx1 = -1;
  for (let x = 0; x < K.w; x++) if (colTop[x] <= top + 8) {
    sx0 = Math.min(sx0, x);
    sx1 = Math.max(sx1, x);
  }
  const scx = (sx0 + sx1 + 1) / 2, shw = (sx1 - sx0 + 1) / 2;
  const colH = K.ay - top;
  // Where his pillar's flared foot meets the pool's bubbles (traced on his picture, frame px): an
  // arch from y 96 at x 72 and x 134 down to y 112 under the shaft's middle. Above it (between those
  // columns) his pixels are the pillar, below it and to the sides they are the pool.
  const FX0 = 72, FX1 = 134, fcx = (FX0 + FX1 + 1) / 2, fhw = (FX1 - FX0 + 1) / 2;
  // (scalloped like the row of bubbles in front of the pillar's foot, so it never reads as a bowl)
  // (each bubble its own height, so the line never runs flat across the pillar's purple foot)
  const surf = (x: number) => {
    if (x < FX0 || x > FX1) return -1;
    const k = Math.floor((x - FX0 + 3) / 9), ph = fract((x - FX0 + 3) / 9);
    const bump = (3.4 + 2.4 * rnd(seed + 61, k)) * (1 - Math.abs(2 * ph - 1) ** 1.6);
    return Math.round(97 + 12 * (1 - ((x + 0.5 - fcx) / fhw) ** 2) - bump + 1.5 * (2 * pnoise(x, 0, 6, 0, 0, seed + 60) - 1));
  };
  const inShaft = (x: number, y: number) => y < surf(x);
  const shaftL = col.clone();
  for (let y = 0; y < K.h; y++) for (let x = 0; x < K.w; x++) if (inShaft(x, y) && pool.get(x, y)) shaftL.set(x, y, pool.get(x, y));
  // (the pool without the pillar's foot: no rim along the cut; `poolEdge` marks its new top edge)
  const poolOnly = cut(pool, (x, y) => !inShaft(x, y), 2, false);
  const poolEdge = poolOnly.empty();
  for (let y = 1; y < K.h; y++) for (let x = 0; x < K.w; x++) if (poolOnly.get(x, y) && !poolOnly.get(x, y - 1) && inShaft(x, y - 1)) poolEdge.set(x, y, 1);
  /** The pool's surface line in a frame whose pool is scaled by ps about the anchor (the pillar is clipped there). */
  const clipY = (x: number, ps: number) => {
    const xk = K.ax + (x + 0.5 - K.ax) / ps - 0.5;
    const s = surf(Math.round(xk));
    return K.ay + ((s < 0 ? 96 : s) - K.ay) * ps;
  };
  /**
   * The splashing crown on the pillar's moving top: its top line at column x (a low dome with five
   * tongues of slime licking up, each its own height, swaying from frame to frame), and where the
   * tongues' tips are.
   */
  const tongues = (i: number) =>
    range(5).map((k) => ({
      u: -0.78 + 0.39 * k + 0.07 * Math.sin(i * 1.7 + k * 2.3),
      h: (6 + 4 * rnd(seed + 71, k)) * (0.75 + 0.25 * Math.sin(i * 1.3 + k * 1.9)) * (1 - 0.35 * Math.abs(-0.78 + 0.39 * k)),
      w: 0.08 + 0.03 * rnd(seed + 72, k),
    }));
  const CROWN = 11;
  const headTop = (x: number, y0: number, hw: number, i: number) => {
    const u = clamp((x + 0.5 - scx) / Math.max(4, hw), -1, 1);
    // (the dome: its middle bulges up over its shoulders (4 px more than a plain round top) and it
    // drops away steeply at its sides)
    const dome = 0.45 * hw * (1 - Math.sqrt(1 - u * u)) + 4 * u * u;
    const tg = tongues(i);
    let t = 0;
    for (const g of tg) {
      const q = (u - g.u) / g.w;
      if (Math.abs(q) < 1) t = Math.max(t, g.h * (1 - q * q) ** 0.6);
    }
    // (between two tongues the slime swells in a small rounded lobe, 2.4-3.8 px, so no stretch of
    // the crown's top runs flat)
    for (let k = 0; k + 1 < tg.length; k++) {
      const m = (tg[k].u + tg[k + 1].u) / 2, hg = (tg[k + 1].u - tg[k].u) / 2;
      const q = (u - m) / hg;
      if (Math.abs(q) < 1) t += (2.4 + 1.4 * rnd(seed + 73, k + i * 7)) * Math.cos((Math.PI / 2) * q) ** 2;
    }
    return y0 + CROWN + dome - t + 1.2 * (2 * pnoise(x, i * 5, 7, 0, 0, seed + 30) - 1);
  };
  /**
   * The crown's top row per column (the first row kept): headTop rounded, with any run of more than
   * 4 columns on one row lifted 1 px in its middle (2 columns kept at each end, repeated on what is
   * left), so it bulges into a small rounded lobe instead of running flat.
   */
  const crownLine = (y0: number, hw: number, i: number): Int32Array => {
    const L = new Int32Array(K.w);
    for (let x = 0; x < K.w; x++) L[x] = Math.ceil(headTop(x, y0, hw, i));
    const x0 = Math.max(1, Math.floor(scx - hw) - 1), x1 = Math.min(K.w - 1, Math.ceil(scx + hw) + 1);
    for (let pass = 0; pass < 4; pass++) {
      let changed = false;
      for (let x = x0; x <= x1; ) {
        let e = x;
        while (e + 1 <= x1 && L[e + 1] === L[x]) e++;
        const n = e - x + 1;
        if (n > 4) {
          for (let u = x + 2; u <= e - 2; u++) L[u]--;
          changed = true;
        }
        x = e + 1;
      }
      if (!changed) break;
    }
    return L;
  };
  /** The longest run of neighbouring columns of the crown whose top row is the same (above the pool). */
  const crownRun = (c: Layer, hw: number, ps: number): number => {
    const tp = tops(c);
    let best = 0, run = 0, at = 0;
    for (let x = Math.ceil(scx - hw); x <= Math.floor(scx + hw); x++) {
      const ok = tp[x] < K.h && tp[x] < clipY(x, ps) - 3;
      run = ok && tp[x] === tp[x - 1] && tp[x - 1] < clipY(x - 1, ps) - 3 ? run + 1 : ok ? 1 : 0;
      if (run > best) (best = run), (at = x);
    }
    if (process.env.POISON_DEBUG) console.log(`blast crown: flat run ${best} ending at x ${at}, row ${tp[at]}`);
    return best;
  };
  /** The pillar pushed up (or sunk) d px under the pool's surface, scaled across by sxs, swelling a little under its crown. */
  const pillarMove = (L: Layer, d: number, sxs: number, swell: number, ps: number): Layer => {
    const y0 = top + d;
    const bulge = (y: number) => 1 + swell * Math.sin(Math.PI * clamp((y - y0 - CROWN) / 26, 0, 1)) ** 0.7;
    return remap(L, (x, y) => {
      if (y > clipY(x, ps) + 1) return null;
      return [scx + (x + 0.5 - scx) / (sxs * bulge(y)) - 0.5, y - d];
    });
  };
  const pillar = (L: Layer, d: number, sxs: number, swell: number, ps: number, i: number): Layer => {
    const sh = pillarMove(L, d, sxs, swell, ps);
    if (d < 1) return sh;
    const ln = crownLine(top + d, shw * sxs, i);
    return cut(sh, (x, y) => y >= ln[x], 4, true);
  };
  // His soft green glow beside the pillar (1 px, alpha 20-45, along both its sides) goes with the
  // pillar: moved exactly as the pillar is, and cut along the same crown line, so it never stands
  // above the rising or sinking top. His glow round the pool's rim where his light does not reach
  // goes with the pool (scaled with it, and only where the frame's pool still has slime within 2 px).
  // His green glow inside his light (round the pool's right end, the stalks and their drops) is his
  // light, read as glow at his slime's edge (the JPEG's soft edge of his dark rim): it takes the
  // ground glow's share of his light there (so it goes where the ground glow does not reach: no green
  // halo round the stalks over unlit ground), and is drawn only where the frame shows his art round
  // it unchanged and in place (as in his picture); elsewhere the ground glow takes its place. The
  // rest stays.
  const nearArt = (L: Layer, x: number, y: number, r: number) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (L.get(x + dx, y + dy) && !isKind(L.get(x + dx, y + dy), 'glow')) return true;
    return false;
  };
  const poolAll = union(pool, stalkTop);
  const glowRim = glowG.empty(), glowCol = glowG.empty(), glowRest = glowG.empty(), glowLit = glowG.empty();
  const lightNear = (l: Light, x: number, y: number) => {
    let m = 0;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (dx * dx + dy * dy <= 9) m = Math.max(m, l.at(x + dx, y + dy));
    return m;
  };
  for (let y = 0; y < K.h; y++)
    for (let x = 0; x < K.w; x++) {
      const v = glowG.get(x, y);
      if (!v) continue;
      (lightNear(hisLight, x, y) >= 24 / 255 ? glowLit : nearArt(poolAll, x, y, 2) ? glowRim : nearArt(col, x, y, 3) ? glowCol : glowRest).set(x, y, v);
    }
  const glowLitG = glowMul(glowLit, (x, y) => Math.min(1, lightNear(light, x, y) / Math.max(lightNear(hisLight, x, y), 1e-6)));
  const pillarGlow = (L: Layer, d: number, sxs: number, swell: number, ps: number, i: number): Layer => {
    const sh = pillarMove(L, d, sxs, swell, ps);
    if (d < 1) return sh;
    const ln = crownLine(top + d, shw * sxs, i);
    return remap(sh, (x, y) => (y >= ln[x] ? [x, y] : null));
  };
  // (while the pillar moves, the round drop clinging to its left side just under his top is left
  // off, cut along the shaft's own edge above it: under the crown it would read as a single lobe)
  const shaftM = cut(shaftL, (x, y) => !(y >= top + 23 && y <= top + 38 && x < sx0 + 1), 2, true);
  // The pillar's violet roots in the pool (the venom of its flared foot, the violet blobs of the pool
  // that reach up to the line where the pillar meets the pool): in the settle they sink into the
  // pool with the pillar over frames 8-11, so none is left floating once the pillar has gone. Where a
  // root sinks, the pool's own surface shows: each root pixel takes his pool's pixel a set step
  // further down (bubbles keep their shape and their light from above), the same source the pool
  // behind the pillar is made from.
  const isRoot = new Uint8Array(K.w * K.h);
  {
    const vio = poolOnly.empty();
    for (let j = 0; j < vio.v.length; j++) if (poolOnly.v[j] && FAM[poolOnly.v[j] - 1] === 'purple') vio.v[j] = poolOnly.v[j];
    for (const pc of pieces(vio)) {
      const atFoot = pc.some((j) => {
        const x = j % K.w, y = (j / K.w) | 0, sf = surf(Math.min(FX1, Math.max(FX0, x)));
        return x >= FX0 - 4 && x <= FX1 + 4 && y <= sf + 6;
      });
      if (atFoot) for (const j of pc) isRoot[j] = 1;
    }
  }
  /** His pool's surface under (x, y): the pool's pixel a set step further down (not a root, not the pillar's foot). */
  const poolBelow = (x: number, y: number): number => {
    for (const [dx, dy] of [[0, 20], [6, 24], [-6, 26], [3, 31], [-3, 16], [0, 36], [8, 40]]) {
      const u = x + dx, w = y + dy, v = poolOnly.get(u, w);
      if (v && !inShaft(u, w) && !isRoot[w * K.w + u]) return v;
    }
    return 0;
  };
  const rootTo = new Int16Array(K.w * K.h).fill(-1);
  for (let j = 0; j < isRoot.length; j++) {
    if (!isRoot[j]) continue;
    const x = j % K.w, y = (j / K.w) | 0;
    rootTo[j] = poolBelow(x, y);
    // (failing that, the nearest green slime round it)
    let best = 1e9;
    if (rootTo[j] <= 0)
      for (let dy = -12; dy <= 12; dy++) for (let dx = -12; dx <= 12; dx++) {
        const v = poolOnly.get(x + dx, y + dy);
        if (!v || FAM[v - 1] !== 'green' || !isKind(v, 'body')) continue;
        if (dx * dx + dy * dy * 1.5 < best) (best = dx * dx + dy * dy * 1.5), (rootTo[j] = v);
      }
  }
  // (each root pixel's depth in its own root, 0 at the root's top and 1 at its foot in the pool, and
  // how far it lies from the root's middle across, 0 in the middle and 1 at its sides on its row)
  const rootD = new Float32Array(K.w * K.h).fill(-1), rootU = new Float32Array(K.w * K.h);
  {
    const rooted = poolOnly.empty();
    for (let j = 0; j < rooted.v.length; j++) if (isRoot[j]) rooted.v[j] = 1;
    for (const pc of pieces(rooted)) {
      let y0 = K.h, y1 = -1;
      const xl = new Map<number, number>(), xr = new Map<number, number>();
      for (const j of pc) {
        const x = j % K.w, y = (j / K.w) | 0;
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
        xl.set(y, Math.min(xl.get(y) ?? K.w, x));
        xr.set(y, Math.max(xr.get(y) ?? -1, x));
      }
      for (const j of pc) {
        const x = j % K.w, y = (j / K.w) | 0, l = xl.get(y)!, r = xr.get(y)!;
        rootD[j] = (y - y0) / Math.max(1, y1 - y0);
        rootU[j] = r > l ? Math.abs((2 * (x - l)) / (r - l) - 1) : 0;
      }
    }
  }
  /**
   * The pool with its violet roots sunk k of the way (0-1): a front runs down each root from its top
   * to its foot, and every root pixel above it takes the pool's surface under it. The front is a
   * dome across each root (its sides go first), so what is left of a root always has a rounded top,
   * never a flat cut; one clean front per root, never a speckle of single pixels.
   */
  const sunk = (k: number): Layer => {
    if (k <= 0) return poolOnly;
    const out = poolOnly.clone();
    for (let j = 0; j < out.v.length; j++) {
      if (rootTo[j] <= 0) continue;
      const front = 1.3 * k - 0.2 + 0.22 * rootU[j] ** 2 + 0.05 * (2 * pnoise(j % K.w, (j / K.w) | 0, 4, 0, 0, seed + 91) - 1);
      if (rootD[j] < front) out.v[j] = rootTo[j];
    }
    return out;
  };
  // The pool behind the pillar. His pillar stands in the middle of his pool, so his picture has no
  // pool behind it; while the pillar moves (gushing up narrow, sinking) the pool runs on there, behind
  // the pillar and under the pool's cut edge, so the ground never shows between them:
  //  - its back edge is the pool's back rim run on across the pillar's span: an elliptic arc fitted
  //    (least squares) to his shown back rim either side of the pillar (spikes left out), scalloped
  //    like a row of bubbles (each its own height), and closed with his slime rim;
  //  - its slime is his own pool, from its own pixels: each pixel takes the pool's pixel a set step
  //    further down (bubbles keep their shape and their light from above), and a violet root pixel
  //    there takes the green its root sinks into, so no root is doubled behind the pillar.
  const poolBack = poolOnly.empty();
  {
    let px0 = K.w, px1 = -1;
    for (let j = 0; j < pool.v.length; j++) if (pool.v[j]) (px0 = Math.min(px0, j % K.w)), (px1 = Math.max(px1, j % K.w));
    const pcx = (px0 + px1 + 1) / 2, prx = (px1 - px0 + 1) / 2;
    const pt = tops(poolOnly);
    // (his shown rim, each column the median of its neighbours' tops, so his thin spikes drop out)
    const rimAt = (x: number) => {
      const v = range(13).map((k) => pt[x - 6 + k]).filter((t) => t !== undefined && t < K.h).sort((a, b) => a - b);
      return v.length ? v[v.length >> 1] : K.h;
    };
    const arcS = (x: number) => Math.sqrt(Math.max(0, 1 - ((x + 0.5 - pcx) / prx) ** 2));
    let s11 = 0, s1 = 0, n1 = 0, sy = 0, sys = 0;
    for (let x = FX0 - 26; x <= FX1 + 26; x++) {
      if (x >= FX0 - 2 && x <= FX1 + 2) continue;
      const t = rimAt(x), s = arcS(x);
      if (t >= K.h) continue;
      s11 += s * s;
      s1 += s;
      n1++;
      sy += t;
      sys += t * s;
    }
    // top(x) = cyb - ryb * s(x), least squares over his shown rim.
    const det = n1 * s11 - s1 * s1;
    const cyb = (sy * s11 - sys * s1) / det, ryb = (sy * s1 - sys * n1) / det;
    const backTop = (x: number) => {
      const k = Math.floor((x - FX0 + 2) / 8), ph = fract((x - FX0 + 2) / 8);
      const bump = (1 + 1.4 * rnd(seed + 93, k)) * (1 - Math.abs(2 * ph - 1) ** 1.6);
      return Math.round(cyb - ryb * arcS(x) - bump + 0.8 * (2 * pnoise(x, 0, 5, 0, 0, seed + 94) - 1));
    };
    for (let x = FX0; x <= FX1; x++)
      for (let y = backTop(x); y <= surf(x) + 2; y++) if (!poolOnly.get(x, y)) poolBack.set(x, y, poolBelow(x, y));
    // (his slime rim round its back edge and its open sides)
    const bk = poolBack.clone();
    for (let y = 0; y < K.h; y++) for (let x = 0; x < K.w; x++) {
      const v = bk.get(x, y);
      if (!isKind(v, 'body')) continue;
      if ([[1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => !bk.get(x + dx, y + dy) && !poolOnly.get(x + dx, y + dy))) poolBack.set(x, y, RIM[FAM[v - 1]]);
    }
  }
  /** Where the pool (back and front together) leaves the ground showing in a hole it encloses itself. */
  const poolPockets = (L: Layer): number[] => {
    const seen = new Uint8Array(L.v.length), st: number[] = [];
    for (let x = 0; x < K.w; x++) for (const y of [0, K.h - 1]) if (!L.v[y * K.w + x]) (seen[y * K.w + x] = 1), st.push(y * K.w + x);
    for (let y = 0; y < K.h; y++) for (const x of [0, K.w - 1]) if (!L.v[y * K.w + x] && !seen[y * K.w + x]) (seen[y * K.w + x] = 1), st.push(y * K.w + x);
    while (st.length) {
      const j = st.pop()!, x = j % K.w, y = (j / K.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const u = x + dx, w = y + dy;
        if (u < 0 || w < 0 || u >= K.w || w >= K.h) continue;
        const k = w * K.w + u;
        if (!L.v[k] && !seen[k]) (seen[k] = 1), st.push(k);
      }
    }
    const out: number[] = [];
    for (let j = 0; j < L.v.length; j++) if (!L.v[j] && !seen[j]) out.push(j);
    return out;
  };
  // (the pool's ellipse, for the breakup's order: it breaks up from its outer edge in, and the slime
  // round the pillar's foot goes last)
  let qx0 = K.w, qx1 = -1, qy0 = K.h, qy1 = -1;
  for (let j = 0; j < pool.v.length; j++)
    if (pool.v[j]) {
      const x = j % K.w, y = (j / K.w) | 0;
      qx0 = Math.min(qx0, x);
      qx1 = Math.max(qx1, x);
      qy0 = Math.min(qy0, y);
      qy1 = Math.max(qy1, y);
    }
  const qcx = (qx0 + qx1 + 1) / 2, qrx = (qx1 - qx0 + 1) / 2, qry = Math.max(K.ay - qy0, qy1 - K.ay);
  // The spray: his own small drop shapes.
  const big = dropShapes(drops, 20, 60, 'green');
  const shapes = [...big.map((s) => shrinkShape(s, 0.55)), ...big.map((s) => shrinkShape(s, 0.75)), ...big];
  const small = shapes.slice(Math.round(shapes.length * 0.3), Math.max(2, Math.round(shapes.length * 0.75)));
  const stamp = (L: Layer, s: [number, number, number][], x: number, y: number) => {
    for (const [dx, dy, v] of s) if (!L.get(Math.round(x) + dx, Math.round(y) + dy)) L.set(Math.round(x) + dx, Math.round(y) + dy, v);
  };
  /** Each tongue of the crown throws off one of his drop shapes just above its tip. */
  const crownSpray = (L: Layer, y0: number, hw: number, i: number) => {
    tongues(i).forEach((g, k) => {
      if ((k + i) % 3 === 2) return;
      const x = scx + g.u * hw, tip = headTop(x, y0, hw, i);
      stamp(L, small[(k * 3 + i) % small.length], x + 2 * Math.sin(i * 1.3 + k * 2.1), tip - 4 - 7 * fract(0.37 * i + 0.61 * k));
    });
  };
  const PEAK = 4, HOLD = 6;
  // The light is the ground glow (groundGlow): a smooth field defined everywhere, under his art too,
  // so wherever the pool breaks up, a stalk sways or a drop flies off, the ground there is lit like
  // the ground round it (no dark ghost of his art's old outline, no bright core). His glow inside his
  // light (its ground-glow share) is drawn only where the frame shows his art unchanged and in place
  // round it, as on frame 4; his glow round the pool's rim outside his light lies over the ground glow
  // on frame 4 and goes with the pool's slime after.
  /** The alpha of his frame-4 art (without the light), for the light's in-place test. */
  let art4: Uint8Array | null = null;
  const inPlaceOf: (Uint8Array | null)[] = [];
  // pool: its spread; rise: the pillar's height (share of his); mist: how far his mist has come up;
  // light: his light's strength; poolCut: how much of the pool has broken up; a: opacity.
  const plan = [
    { pool: 0.6, rise: 0.22, mist: 0, light: 0.4, poolCut: 0, a: 1 },
    { pool: 0.74, rise: 0.45, mist: 0.3, light: 0.6, poolCut: 0, a: 1 },
    { pool: 0.86, rise: 0.67, mist: 0.58, light: 0.78, poolCut: 0, a: 1 },
    { pool: 0.95, rise: 0.86, mist: 0.82, light: 0.91, poolCut: 0, a: 1 },
    { pool: 1, rise: 1, mist: 1, light: 1, poolCut: 0, a: 1 },
    { pool: 1.01, rise: 1, mist: 1, light: 1, poolCut: 0, a: 1 },
    { pool: 1.02, rise: 1, mist: 1, light: 1, poolCut: 0, a: 1 },
    { pool: 1.03, rise: 0.9, mist: 1, light: 0.93, poolCut: 0.03, a: 1 },
    { pool: 1.04, rise: 0.78, mist: 1, light: 0.85, poolCut: 0.08, a: 1 },
    { pool: 1.05, rise: 0.66, mist: 1, light: 0.76, poolCut: 0.14, a: 0.97 },
    { pool: 1.06, rise: 0.55, mist: 1, light: 0.66, poolCut: 0.2, a: 0.93 },
    { pool: 1.07, rise: 0.45, mist: 1, light: 0.55, poolCut: 0.27, a: 0.87 },
    { pool: 1.08, rise: 0.37, mist: 1, light: 0.44, poolCut: 0.35, a: 0.79 },
    { pool: 1.09, rise: 0.3, mist: 1, light: 0.33, poolCut: 0.44, a: 0.68 },
    { pool: 1.1, rise: 0.24, mist: 1, light: 0.21, poolCut: 0.54, a: 0.54 },
    { pool: 1.11, rise: 0.2, mist: 1, light: 0.1, poolCut: 0.65, a: 0.38 },
  ];
  /** The settle's slump: the pillar widens as it sinks. */
  const slump = (r: number) => 1 + 0.16 * (1 - r);
  // (his mist's own top outline, for the ragged line its rising top fades along)
  const mistTop = tops(mist);
  const mistTop0 = Math.min(...mistTop);
  const fr = plan.map((p, i) => {
    const t = (i - PEAK) / 12;
    const ps = Math.min(1, p.pool);
    const d = (1 - p.rise) * colH;
    const moving = i < PEAK || i > HOLD;
    // The pool: spreads over the ground from the centre, bubbles churn, breaks up at the end (into
    // islands that shrink and cool, with no dark rims round the holes). While the pillar moves, it
    // is the pool without the pillar's foot, in front of the pillar, and the pool behind the pillar
    // (poolBack) runs on under its cut edge: both move, churn, cool and break up as one pool.
    const back0 = moving ? poolBack : null;
    let all = scaled(union(back0, moving ? (i > HOLD ? sunk((i - HOLD - 1) / 4) : poolOnly) : pool, stalkTop), p.pool, p.pool, K.ax, K.ay);
    const backM = back0 ? scaled(back0, p.pool, p.pool, K.ax, K.ay) : null;
    const pe = moving ? scaled(poolEdge, p.pool, p.pool, K.ax, K.ay) : null;
    if (i > PEAK) all = churn(all, t, { amp: 1.2, ampY: 0.6, cell: 6, seed });
    all = cool(all, (i - HOLD - 2) / 3, seed + 9);
    const whole = all;
    if (p.poolCut) {
      // (it breaks up first where it spreads out to the frame's edges, so it never runs off the frame)
      const rim = (x: number, y: number) => Math.max(smooth(8, 0, x), smooth(K.w - 9, K.w - 1, x), smooth(K.h - 9, K.h - 1, y));
      // It breaks up from its outer edge in (the slime round the pillar's foot goes last, so the
      // sinking pillar always stands in its pool), into ragged islands.
      all = cut(all, (x, y) => (pnoise(x, y * 1.5, 7, 0, 0, seed + 1) * 0.8 + pnoise(x, y, 3, 0, 0, seed + 3) * 0.2) * 0.6 + (1 - Math.hypot((x + 0.5 - qcx) / qrx, (y + 0.5 - K.ay) / qry)) * 0.55 - 0.6 * rim(x, y) > p.poolCut, 6, false);
      // (his violet bubbles go or stay whole, so none is left with a flat, cut top)
      {
        const vio = whole.empty();
        for (let j = 0; j < whole.v.length; j++) if (whole.v[j] && FAM[whole.v[j] - 1] === 'purple') vio.v[j] = 1;
        for (const pc of pieces(vio)) {
          const keepIt = pc.filter((j) => all.v[j]).length * 2 >= pc.length;
          for (const j of pc) all.v[j] = keepIt ? whole.v[j] : 0;
        }
      }
      // (it only opens from outside: a hole the breakup would leave enclosed in the pool keeps its slime)
      for (const j of poolPockets(all)) all.v[j] = whole.v[j];
      // (no thin slivers or bars are left floating: a piece must be 12 px or more, and on average
      // 2.5 px thick or more)
      for (const pc of pieces(all)) {
        let x0 = K.w, x1 = -1;
        for (const j of pc) {
          x0 = Math.min(x0, j % K.w);
          x1 = Math.max(x1, j % K.w);
        }
        if (pc.length < 12 || pc.length / (x1 - x0 + 1) < 2.5) for (const j of pc) all.v[j] = 0;
      }
    }
    // (his violet bubbles that come to lie open at the end, nothing violet over them any more, are
    // rounded over their tops: a top row of more than 4 columns is lifted 1 px in its middle, so no
    // violet top runs flat)
    if (i > HOLD) {
      const vio = all.empty();
      for (let j = 0; j < all.v.length; j++) if (all.v[j] && FAM[all.v[j] - 1] === 'purple') vio.v[j] = 1;
      for (const pc of pieces(vio)) {
        const tp = new Map<number, number>();
        for (const j of pc) tp.set(j % K.w, Math.min(tp.get(j % K.w) ?? K.h, (j / K.w) | 0));
        const xs = [...tp.keys()].sort((a, b) => a - b);
        for (let a = 0; a < xs.length; ) {
          let e = a;
          while (e + 1 < xs.length && xs[e + 1] === xs[e] + 1 && tp.get(xs[e + 1]) === tp.get(xs[a])) e++;
          if (e - a + 1 > 4) for (let k = a + 2; k <= e - 2; k++) all.set(xs[k], tp.get(xs[k])! - 1, all.get(xs[k], tp.get(xs[k])!));
          a = e + 1;
        }
      }
    }
    // (split again: the pool behind the pillar, and the pool in front of it)
    const pb = all.empty(), pl = all.clone();
    if (backM)
      for (let j = 0; j < all.v.length; j++)
        if (backM.v[j] && all.v[j]) {
          pb.v[j] = all.v[j];
          pl.v[j] = 0;
        }
    // The pillar.
    let c: Layer = col;
    const spray = col.empty();
    let headY = 0;
    if (i < PEAK) {
      // Gushing up: thin at first, filling out, its crown splashing; drops thrown off the tongues.
      const sxs = 0.74 + 0.26 * p.rise;
      c = pillar(shaftM, d, sxs, 0.2, ps, i);
      headY = top + d;
      crownSpray(spray, headY, shw * sxs, i);
    } else if (i > HOLD) {
      // Sinking back: churning and cooling, slumping wider, the same splashing crown on its falling top.
      let sh = churn(shaftM, t, { amp: 1.3, ampY: 2.2, cell: 7, seed: seed + 2, flow: [0, -1.4] });
      sh = cool(sh, (i - HOLD - 3) / 3, seed + 10);
      c = pillar(sh, d, slump(p.rise), 0.2, ps, i);
      headY = top + d;
      if (i <= HOLD + 5) crownSpray(spray, headY, shw * slump(p.rise), i);
      // Drops break off the crown (three a frame over frames 7-12) and fall in arcs into the pool.
      for (let k = 0; k < 18; k++) {
        const fk = HOLD + 1 + Math.floor(k / 3), dt = i - fk;
        if (dt < 1 || dt > 4) continue;
        const rk = plan[fk].rise, hk = shw * slump(rk);
        const ux = rr(seed + 50, k, -1, 1);
        const x0 = scx + ux * hk * 0.9, y0 = headTop(scx + ux * hk * 0.9, top + (1 - rk) * colH, hk, fk) - 3;
        const vx = (ux < 0 ? -1 : 1) * rr(seed + 51, k, 1.2, 3.4), vy = -rr(seed + 52, k, 1.5, 4.5);
        const x = x0 + vx * dt * 2, y = y0 + vy * dt + 2.4 * dt * dt;
        if (y > clipY(Math.round(x), ps) - 3) continue;
        stamp(spray, shapes[Math.floor(rnd(seed + 53, k) * shapes.length)], x, y);
      }
    } else if (i > PEAK) {
      c = churn(col, t, { amp: 1.3, ampY: 2.2, cell: 7, seed: seed + 2, flow: [0, -1.4] });
    }
    // (the pool's new top edge takes his slime rim only where nothing is behind it any more, neither
    // the pillar nor the pool behind it: over the pool behind, the slime runs on with no seam)
    if (pe)
      for (let y = 1; y < K.h; y++) for (let x = 0; x < K.w; x++) {
        const v = pl.get(x, y);
        if (pe.get(x, y) && isKind(v, 'body') && !pl.get(x, y - 1) && !pb.get(x, y - 1) && !c.get(x, y - 1) && !c.get(x, y - 2)) pl.set(x, y, RIM[FAM[v - 1]]);
      }
    // (check: the crown's top never runs flat over more than 4 columns)
    if (moving && d >= 1 && c.v.some((v) => v > 0)) {
      const run = crownRun(c, shw * (i < PEAK ? 0.74 + 0.26 * p.rise : slump(p.rise)), ps);
      if (run > 4) MIST_FAULTS.push(`blast[${i}]: the crown's top runs flat over ${run} columns`);
    }
    // His venom mist: comes up beside the gushing pillar, its top fading out along a ragged soft
    // line (from his mist's own outline and a little noise) just about the crown's height; then it
    // sways, and after the peak rises and thins away.
    const mistLine = (x: number) =>
      headY + 2 + 0.5 * (mistTop[x] < K.h ? mistTop[x] - mistTop0 : 0) + 3.2 * (2 * pnoise(x, i * 7, 5, 0, 0, seed + 80) - 1) + 1.6 * (2 * pnoise(x, i * 7, 2, 0, 0, seed + 81) - 1);
    let ms: Canvas | null = null;
    if (p.mist > 0) {
      let m: Layer;
      if (i < PEAK) m = cut(moved(mist, 0, d * 0.85), (x, y) => grain(x, y, seed + 4) < p.mist + 0.15, 2, false);
      else m = wobble(churn(mist, t, { amp: 1.4, cell: 6, seed: seed + 5 }), t, 1.3, 9, seed + 6);
      if (i > HOLD + 1) m = cut(moved(m, 0, -(i - HOLD - 1) * 1.5), (x, y) => grain(x, y, seed + 7) > (i - HOLD - 1) * 0.1, 2, false);
      ms = i < PEAK ? fadeAbove(m.render(), mistLine, 9) : m.render();
    }
    // His drops: beside the gushing head they ride with the pillar; the splash drops fly out from the
    // pool's edge to his places by frame 4 (none on frame 0); after the peak they are thrown out and
    // rain down.
    const sc = [0.55, 0.7, 0.84, 0.95][i] ?? 1;
    const sxsR = 0.74 + 0.26 * p.rise;
    const dr = moveDrops(drops, (k, cx, cy) => {
      if (i < PEAK) {
        if (cy < K.ay - 55 && Math.abs(cx - scx) < shw + 26) {
          const nx = scx + (cx + 0.5 - scx) * sxsR - 0.5, ny = cy + d;
          return ny > K.ay - 22 || ny < headY + CROWN + 4 ? null : [nx - cx, ny - cy];
        }
        if (i === 0) return null;
        const nx = K.ax + (cx - K.ax) * sc, ny = K.ay + (cy - K.ay) * sc - 9 * Math.sin(Math.PI * sc) * (1 - sc) * 2;
        return [nx - cx, ny - cy];
      }
      if (i > HOLD + 6 && rnd(seed + 8, k) < (i - HOLD - 6) * 0.25) return null;
      const dir = Math.sign(cx - K.ax) || 1;
      const u = Math.max(0, i - PEAK) / 3;
      return [dir * 1.2 * u, -1.5 * u + 0.9 * u * u];
    });
    // His soft glows: the rest of his green glow stays (scaled with the light as it spreads); his glow
    // beside the pillar moves with the pillar; his glow round the pool's rim and its stalks goes with
    // the pool. All dim with his light.
    const gl = scaled(glowMul(glowRest, p.light), ps, ps, K.ax, K.ay);
    const cgl = glowMul(glowCol, p.light);
    const cg = i < PEAK ? pillarGlow(cgl, d, 0.74 + 0.26 * p.rise, 0.2, ps, i) : i > HOLD ? pillarGlow(cgl, d, slump(p.rise), 0.2, ps, i) : cgl;
    const rg0 = scaled(glowMul(glowRim, p.light), p.pool, p.pool, K.ax, K.ay);
    const glowLitM = glowMul(glowLitG, p.light);
    // (the soft edges of his mist go with the mist)
    let gm: Canvas = glowP.render();
    if (i < PEAK) gm = p.mist > 0 ? fadeAbove(cut(moved(glowP, 0, d * 0.85), (x, y) => grain(x, y, seed + 4) < p.mist + 0.15, 0, false).render(), mistLine, 9) : new Canvas(K.w, K.h);
    else if (i > HOLD + 1) gm = glowMul(moved(glowP, 0, -(i - HOLD - 1) * 1.5), Math.max(0, 1 - (i - HOLD - 1) * 0.12)).render();
    const sp = i > HOLD ? cool(spray, (i - HOLD - 3) / 3, seed + 12) : spray;
    // The ground glow: spreads out with the pool from the pillar's foot as it comes up (scaled with
    // the pool, so it stays round the pool's right end), then dims; on his light's alpha steps.
    const lF = light.mul(p.light).scaled(ps, K.ax, K.ay);
    let inPlace: Uint8Array | null = null;
    const compose = () => {
      const rg = rg0.empty();
      for (let y = 0; y < K.h; y++)
        for (let x = 0; x < K.w; x++) {
          const v = rg0.get(x, y);
          // (only next to the frame's slime, and outside the ground glow: inside it, the ground glow
          // takes its place)
          if (v && (nearArt(pl, x, y, 2) || nearArt(pb, x, y, 2)) && (i === PEAK || lF.a[y * K.w + x] < 20 / 255)) rg.set(x, y, v);
        }
      const art = stackC(K.w, K.h, gl, cg, rg, gm, pb, c, pl, sp, ms, dr).px;
      // (his glow inside his light: only where his art round it is in place)
      if (i === PEAK) art4 = Uint8Array.from(art);
      inPlace = null;
      if (i >= PEAK && art4) {
        const a4 = art4;
        const ip = new Uint8Array(K.w * K.h);
        for (let y = 0; y < K.h; y++)
          for (let x = 0; x < K.w; x++) {
            let same = true;
            for (let dy = -1; dy <= 1 && same; dy++)
              for (let dx = -1; dx <= 1 && same; dx++) {
                const u = x + dx, v = y + dy;
                if (u >= 0 && v >= 0 && u < K.w && v < K.h && art[(v * K.w + u) * 4 + 3] !== a4[(v * K.w + u) * 4 + 3]) same = false;
              }
            ip[y * K.w + x] = same ? 1 : 0;
          }
        inPlace = ip;
      }
      inPlaceOf[i] = inPlace;
      const lg = glowLit.empty();
      if (inPlace) for (let j = 0; j < lg.v.length; j++) if (inPlace[j]) lg.v[j] = glowLitM.v[j];
      const lt = new Canvas(K.w, K.h);
      for (let y = 0; y < K.h; y++)
        for (let x = 0; x < K.w; x++) {
          const al = stepAlpha(lF.a[y * K.w + x]);
          if (al) lt.set(x, y, [light.rgb[0], light.rgb[1], light.rgb[2], al]);
        }
      const stack = () => fadeTop(stackC(K.w, K.h, lt, gl, cg, rg, lg, gm, pb, c, pl, sp, ms, dr), 5, 16, seed + 20);
      let out = stack();
      // (the see-through line, alpha 128, falls between two of his light's steps (125 and 144): where
      // his art and the light's own brighter band close off a bit of the dimmer band, that bit takes
      // the brighter light round it, as the light runs on there, so no slit of dimmer light is left
      // enclosed in the light)
      const pocket = enclosed(out);
      let raised = 0;
      for (let pass = 0, more = true; more && pass < 8; pass++) {
        more = false;
        for (let j = 0; j < pocket.length; j++) {
          if (!pocket[j] || art[j * 4 + 3] || lg.v[j] || !lt.px[j * 4 + 3]) continue;
          const x = j % K.w, y = (j / K.w) | 0;
          let m = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) m = Math.max(m, lt.alpha(x + dx, y + dy));
          if (m >= 128 && m > lt.px[j * 4 + 3]) {
            lt.px[j * 4 + 3] = m;
            more = true;
            raised++;
          }
        }
      }
      if (raised) out = stack();
      if (process.env.POISON_DEBUG && raised) console.log(`blast[${i}] light: ${raised} px of an enclosed slit take the light round it`);
      // (the settle churns and cools his slime: no checkerboard dither is left from it)
      return i > HOLD ? dechecker(out) : out;
    };
    const faded = (cl: Canvas) => (p.a < 1 ? fade(cl, p.a) : cl);
    let clean = compose();
    if (i !== PEAK) {
      // No see-through pocket anywhere in the frame (alpha under 128, enclosed: the ground showing
      // through the middle of the effect). Where the pool had slime before it broke up, the pocket
      // keeps the pool's slime (behind or in front of the pillar, as it lies); a pinhole left between
      // other pieces (the pillar's side and the mist, a drop on the pool's rim) takes the colour round
      // it.
      let hole = enclosed(faded(clean));
      let restored = 0;
      for (let j = 0; j < hole.length; j++)
        if (hole[j] && whole.v[j] && !pl.v[j] && !pb.v[j]) {
          (backM?.v[j] ? pb : pl).v[j] = whole.v[j];
          restored++;
        }
      if (restored) {
        clean = compose();
        hole = enclosed(faded(clean));
      }
      const [sealed, nSealed, left] = sealPockets(clean, hole, 24, Math.ceil(128 / Math.max(p.a, 0.01)));
      clean = sealed;
      if (process.env.POISON_DEBUG) console.log(`blast[${i}] pockets: ${restored} px kept the pool's slime, ${nSealed} px sealed, ${left} left`);
      if (left) BLAST_HOLES.push(`blast[${i}]: ${left} enclosed see-through px left (a pocket over 24 px)`);
    }
    // (the settle leaves no faint lone pixels: one under alpha 64 with nothing round it goes)
    const fin = i > HOLD ? dropSpecks(faded(clean), 64) : faded(clean);
    // (check: no enclosed see-through pixel in any frame, his picture included)
    const nHole = enclosed(fin).reduce((s, v) => s + v, 0);
    if (nHole) BLAST_HOLES.push(`blast[${i}]: ${nHole} enclosed see-through px`);
    // (check: no violet top is a straight cut, the mist's least of all)
    const run = flatVioletRun(fin);
    if (run > 4) MIST_FAULTS.push(`blast[${i}]: ${run} neighbouring columns share their topmost violet row`);
    return fin;
  });
  // (check: no hole in the light on any frame. His own picture (frame 4) has a few pixels the check
  // would count (the dark halo round a drop his JPEG left, a dark column beside the pool's foot):
  // they are left alone only where a frame shows his art unchanged and in place round them)
  const his = lightHoles(fr[PEAK], light.rgb);
  fr.forEach((f, i) => {
    const holes = lightHoles(f, light.rgb), ip = inPlaceOf[i];
    let own = 0, bad = 0;
    for (let j = 0; j < holes.length; j++)
      if (holes[j]) {
        if (ip && ip[j] && his[j]) own++;
        else {
          bad++;
          if (process.env.POISON_DEBUG) console.log(`  light hole blast[${i}] at ${j % K.w},${(j / K.w) | 0}: alpha ${f.px[j * 4 + 3]} rgb ${f.px.slice(j * 4, j * 4 + 3).join(',')} ground glow ${light.a[j].toFixed(3)} inPlace ${ip ? ip[j] : '-'} hisHole ${his[j]} rim ${glowRim.v[j]} rest ${glowRest.v[j]} col ${glowCol.v[j]} lit ${glowLit.v[j]}`);
        }
      }
    LIGHT_LOG.push(`blast[${i}]: ${bad} px darker than half the light round them${own ? ` (his own picture, in place: ${own} px)` : ''}`);
    if (bad) LIGHT_FAULTS.push(`blast[${i}]: ${bad} px darker than half the light within 3 px (a hole in the light)`);
  });
  if (process.env.POISON_DEBUG || process.env.POISON_LIGHT) for (const l of LIGHT_LOG) console.log(l);
  return vfxSprite('blast', 'Poison blast: gushing pillar of slime into a bubbling pool', [K.ax, K.ay], { blast: { frames: fr, fps: 12, loop: false } });
}

// --- walls ----------------------------------------------------------------------------------------

/** Per column, the lowest drawn pixel of a layer (-1 where the column is empty). */
function feet(L: Layer): number[] {
  const f = new Array<number>(L.w).fill(-1);
  for (let x = 0; x < L.w; x++) for (let y = L.h - 1; y >= 0; y--) if (L.get(x, y)) {
    f[x] = y;
    break;
  }
  return f;
}
/** Per column, the highest drawn pixel of a layer (L.h where the column is empty). */
function tops(L: Layer): number[] {
  const f = new Array<number>(L.w).fill(L.h);
  for (let x = 0; x < L.w; x++) for (let y = 0; y < L.h; y++) if (L.get(x, y)) {
    f[x] = y;
    break;
  }
  return f;
}

/**
 * Enclosed see-through pixels of a frame (alpha under 128 that the outside cannot reach, 4-way,
 * through other such pixels), as a mask.
 */
function enclosed(c: Canvas): Uint8Array {
  const { w, h } = c;
  const open = new Uint8Array(w * h), seen = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) open[i] = c.px[i * 4 + 3] < 128 ? 1 : 0;
  const st: number[] = [];
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) if (open[y * w + x] && !seen[y * w + x]) (seen[y * w + x] = 1), st.push(y * w + x);
  for (let y = 0; y < h; y++) for (const x of [0, w - 1]) if (open[y * w + x] && !seen[y * w + x]) (seen[y * w + x] = 1), st.push(y * w + x);
  while (st.length) {
    const i = st.pop()!, x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const u = x + dx, v = y + dy;
      if (u < 0 || v < 0 || u >= w || v >= h) continue;
      const j = v * w + u;
      if (open[j] && !seen[j]) (seen[j] = 1), st.push(j);
    }
  }
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = open[i] && !seen[i] ? 1 : 0;
  return out;
}

/**
 * His stone is solid: every enclosed see-through pixel on or next to the stone frame (`near`), and
 * any enclosed pinhole of `maxPocket` px or less elsewhere (12 by default), takes the commonest opaque colour round it
 * (repeated inward). Returns the frame and how many pixels were sealed.
 */
function sealFrame(c: Canvas, near: (x: number, y: number) => boolean, maxPocket = 12): [Canvas, number] {
  const out = c.clone();
  const { w, h } = c;
  const hole = enclosed(c);
  // (the pockets: 4-connected groups of enclosed pixels)
  const seen = new Uint8Array(w * h);
  let todo: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (!hole[i] || seen[i]) continue;
    const pc: number[] = [], st = [i];
    seen[i] = 1;
    let touches = false;
    while (st.length) {
      const j = st.pop()!, x = j % w, y = (j / w) | 0;
      pc.push(j);
      if (near(x, y)) touches = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const u = x + dx, v = y + dy;
        if (u < 0 || v < 0 || u >= w || v >= h) continue;
        const k = v * w + u;
        if (hole[k] && !seen[k]) (seen[k] = 1), st.push(k);
      }
    }
    if (touches || pc.length <= maxPocket) todo = todo.concat(pc);
  }
  const n = todo.length;
  let guard = 0;
  while (todo.length && guard++ < 64) {
    const next: number[] = [], fills: [number, Color][] = [];
    for (const j of todo) {
      const x = j % w, y = (j / w) | 0;
      const votes = new Map<string, [number, Color]>();
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const col = out.get(x + dx, y + dy);
        if (col[3] < 200) continue;
        const key = col.join(',');
        const e = votes.get(key);
        votes.set(key, [(e?.[0] ?? 0) + 1, col]);
      }
      let best: [number, Color] | null = null;
      for (const [, e] of [...votes.entries()].sort((p, q) => (p[0] < q[0] ? -1 : 1))) if (!best || e[0] > best[0]) best = e;
      if (best) fills.push([j, best[1]]);
      else next.push(j);
    }
    for (const [j, col] of fills) out.set(j % w, (j / w) | 0, col);
    if (!fills.length) break;
    todo = next;
  }
  return [out, n];
}

/**
 * The pockets of a hole mask (4-connected) of `maxPocket` px or less each take the commonest colour
 * round them (neighbours with alpha minA or more, filled inward). Returns the frame, how many pixels
 * were sealed and how many hole pixels are left (in bigger pockets).
 */
function sealPockets(c: Canvas, hole: Uint8Array, maxPocket: number, minA = 128): [Canvas, number, number] {
  const out = c.clone();
  const { w, h } = c;
  const seen = new Uint8Array(w * h);
  let todo: number[] = [], left = 0;
  for (let i = 0; i < w * h; i++) {
    if (!hole[i] || seen[i]) continue;
    const pc: number[] = [], st = [i];
    seen[i] = 1;
    while (st.length) {
      const j = st.pop()!, x = j % w, y = (j / w) | 0;
      pc.push(j);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const u = x + dx, v = y + dy;
        if (u < 0 || v < 0 || u >= w || v >= h) continue;
        const k = v * w + u;
        if (hole[k] && !seen[k]) (seen[k] = 1), st.push(k);
      }
    }
    if (pc.length <= maxPocket) todo = todo.concat(pc);
    else left += pc.length;
  }
  const n = todo.length;
  for (let guard = 0; todo.length && guard < 64; guard++) {
    const next: number[] = [], fills: [number, Color][] = [];
    for (const j of todo) {
      const x = j % w, y = (j / w) | 0;
      const votes = new Map<string, [number, Color]>();
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const col = out.get(x + dx, y + dy);
        if (col[3] < minA) continue;
        const key = col.join(',');
        const e = votes.get(key);
        votes.set(key, [(e?.[0] ?? 0) + 1, col]);
      }
      let best: [number, Color] | null = null;
      for (const [, e] of [...votes.entries()].sort((p, q) => (p[0] < q[0] ? -1 : 1))) if (!best || e[0] > best[0]) best = e;
      if (best) fills.push([j, best[1]]);
      else next.push(j);
    }
    if (!fills.length) break;
    for (const [j, col] of fills) out.set(j % w, (j / w) | 0, col);
    todo = next;
  }
  return [out, n - todo.length, left + todo.length];
}

/** Enclosed see-through pockets left in a blast frame (the build fails on any). */
const BLAST_HOLES: string[] = [];
/** Holes left in the stone after sealing, per wall frame (the build fails on any). */
const WALL_HOLES: string[] = [];
/** Post tops that change shape during a rise (the build fails on any). */
const TOP_FAULTS: string[] = [];

/**
 * His post tops (the capitals), outlined on his picture (rise frame 11 = idle frame 0), in frame px
 * (pixel corners), for each post (0: left / near, 1: right / far). The straight wall's capitals
 * are flat blocks; the 3/4 wall's are cubes (top face and the upper rows of the side faces). Every
 * pixel of his picture inside an outline is that post's stone, except his slime lying over it.
 */
const POST_TOPS: Record<'wall' | 'wall_diag', [number, number][][]> = {
  wall: [
    [[11, 33], [34, 33], [34, 46], [11, 46]],
    [[257, 33], [281, 33], [281, 46], [257, 46]],
  ],
  wall_diag: [
    [[28, 124.5], [48.5, 134.5], [48.5, 147], [8, 147], [8, 136.5]],
    [[200, 20.5], [223, 31.5], [223, 42], [205, 42], [191.5, 35.5], [191.5, 28.5]],
  ],
};
/** Even-odd test of the point (x, y) against a polygon. */
function inPoly(P: [number, number][], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [x1, y1] = P[i], [x2, y2] = P[j];
    if (y1 > y !== y2 > y && x < x1 + ((y - y1) * (x2 - x1)) / (y2 - y1)) c = !c;
  }
  return c;
}

/**
 * His framed slime barrier (straight or 3/4). `idle`: a soft light runs across his hexagon cells
 * (one ramp step up where it passes), the dripping slime on top churns and licks, the bubbles and
 * drops bob, his runes pulse. `rise`: the stone frame pushes up out of the ground block by block
 * (each post whole, and the base beam whole along its own foot line, so nothing comes up broken),
 * the slime filling it from the beam up and riding with the beam; the bubbling top and the drops
 * come up last, with the glow round the top; his light on the ground grows with it; the last frame
 * is his picture (idle frame 0). His stone is solid on every frame (enclosed see-through pixels are
 * sealed, and the build fails if any remain).
 */
function wall(kind: 'wall' | 'wall_diag', label: string, seed: number): WorldSprite {
  const K = key(kind);
  const blocks = [K.part('frame0'), K.part('frame1'), K.part('frame2')];
  const slime = K.part('main'), drops = K.part('drops'), light = K.part('glow');
  // (his light on the ground has no pinholes: a see-through pixel or pair with his light all round
  // it (6 or more of its 8 neighbours) and nothing else of his art there is a speck the clean-up of
  // his JPEG left (near-black on a dark map); it takes the dimmest of the light round it, so his
  // dark streaks stay dark lines, never specks)
  {
    const art = union(slime, drops, ...blocks);
    const holes: [number, number, number][] = [];
    for (let y = 1; y < K.h - 1; y++) for (let x = 1; x < K.w - 1; x++) {
      if (light.get(x, y) || art.get(x, y)) continue;
      let n = 0, open = 0, best = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const v = light.get(x + dx, y + dy);
        if (isKind(v, 'glow')) {
          n++;
          if (!best || STEP_ALPHA[(v - GLOW0) % ALPHA_STEPS] < STEP_ALPHA[(best - GLOW0) % ALPHA_STEPS]) best = v;
        } else if (!art.get(x + dx, y + dy) && (dx === 0 || dy === 0)) open++;
      }
      if (n >= 6 && open <= 1) holes.push([x, y, best]);
    }
    for (const [x, y, v] of holes) light.set(x, y, v);
    if (process.env.POISON_DEBUG) console.log(`${kind} light pinholes filled: ${holes.length}`);
  }
  // (what of his slime lies above a post's stone in its column is slime, not post: it must not
  // rise with the post)
  for (const k of [0, 1]) {
    const Bk = blocks[k];
    for (let x = 0; x < K.w; x++) {
      let st = -1;
      for (let y = 0; y < K.h && st < 0; y++) if (Bk.get(x, y) && FAM[Bk.get(x, y) - 1] === 'neutral') st = y;
      for (let y = 0; y < st; y++) if (Bk.get(x, y)) {
        slime.set(x, y, Bk.get(x, y));
        Bk.set(x, y, 0);
      }
    }
  }
  // (his slime's own colours on a post where it touches the slime: the slime spilling over the
  // capitals; up to 3 px in from the slime, saturated green only, so his runes stay stone)
  const satGreen = (v: number) => v > 0 && FAM[v - 1] === 'green' && (KIND[v - 1] === 'outline' || Math.max(...PAL[v - 1].slice(0, 3)) - Math.min(...PAL[v - 1].slice(0, 3)) >= 45);
  for (const k of [0, 1]) {
    const Bk = blocks[k];
    for (let step = 0; step < 3; step++) {
      const mv: number[] = [];
      for (let y = 0; y < K.h; y++) for (let x = 0; x < K.w; x++) {
        if (!satGreen(Bk.get(x, y))) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isKind(slime.get(x + dx, y + dy), 'body') && FAM[slime.get(x + dx, y + dy) - 1] === 'green')) mv.push(y * K.w + x);
      }
      for (const j of mv) {
        slime.v[j] = Bk.v[j];
        Bk.v[j] = 0;
      }
    }
  }
  // (small loose bits of his slime and light inside the frame's outline, not touching its stone:
  // they come up with his light on the ground, not with the stone)
  const bits = slime.empty();
  for (const Bk of blocks) {
    const ps = pieces(Bk).sort((a, b) => b.length - a.length);
    for (const pc of ps.slice(1)) {
      if (pc.length > 40 || pc.some((j) => FAM[Bk.v[j] - 1] === 'neutral')) continue;
      for (const j of pc) {
        bits.v[j] = Bk.v[j];
        Bk.v[j] = 0;
      }
    }
  }
  // His post tops whole: every pixel of his picture inside a post top's outline (POST_TOPS) is that
  // post's stone, so each capital rises as his shape from the first frame (his lit stone, his rims
  // and highlight lines were split off into the slime). Only his slime lying over a top stays slime
  // and comes in with the slime: bright slime that reaches into the outline from outside it
  // (4-way, through bright pixels that are not the post's). Nothing of a top is rebuilt.
  const brightSlime = (v: number) => {
    if (!isKind(v, 'body') || FAM[v - 1] !== 'green') return false;
    const c = PAL[v - 1];
    return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) >= 45 && lumOf(c) >= 100;
  };
  const topIn = POST_TOPS[kind].map((P) => {
    const m = new Uint8Array(K.w * K.h);
    for (let y = 0; y < K.h; y++) for (let x = 0; x < K.w; x++) if (inPoly(P, x + 0.5, y + 0.5)) m[y * K.w + x] = 1;
    return m;
  });
  /** His post-top pixels per post (frame 11): what each top must show in every rise frame. */
  const topMask = topIn.map(() => new Uint8Array(K.w * K.h));
  topIn.forEach((inside, k) => {
    const Bk = blocks[k];
    const layerAt = (i: number) => [slime, drops, bits].find((L) => L.v[i]) ?? null;
    // (his slime over the top: bright slime reached from outside the outline)
    const over = new Uint8Array(K.w * K.h), st: number[] = [];
    const isBright = (i: number) => !Bk.v[i] && brightSlime(layerAt(i)?.v[i] ?? 0);
    for (let i = 0; i < K.w * K.h; i++) if (!inside[i] && isBright(i)) (over[i] = 1), st.push(i);
    while (st.length) {
      const i = st.pop()!, x = i % K.w, y = (i / K.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const u = x + dx, w = y + dy;
        if (u < 0 || w < 0 || u >= K.w || w >= K.h) continue;
        const j = w * K.w + u;
        if (!over[j] && isBright(j)) (over[j] = 1), st.push(j);
      }
    }
    for (let i = 0; i < K.w * K.h; i++) {
      if (!inside[i]) continue;
      if (Bk.v[i]) {
        topMask[k][i] = 1;
        continue;
      }
      const L = layerAt(i);
      if (!L || isKind(L.v[i], 'glow') || over[i]) continue;
      Bk.v[i] = L.v[i];
      L.v[i] = 0;
      topMask[k][i] = 1;
    }
    // (where his slime lies over the corner between a top face and the side face under it, with
    // the post's stone above and below it in the column, the side face runs up to the top face's
    // edge, in the side face's own colour, under the slime: so no corner is chipped)
    for (let x = 0; x < K.w; x++) for (let y = 0; y < K.h; y++) {
      const i = y * K.w + x;
      if (!inside[i] || !over[i] || Bk.v[i]) continue;
      let up = false, below = 0;
      for (let yy = y - 1; yy >= 0 && inside[yy * K.w + x]; yy--) if (Bk.v[yy * K.w + x] && !over[yy * K.w + x]) up = true;
      for (let yy = y + 1; yy < K.h && yy <= y + 8 && !below; yy++) if (Bk.v[yy * K.w + x] && !over[yy * K.w + x]) below = Bk.v[yy * K.w + x];
      if (up && below) {
        Bk.v[i] = below;
        topMask[k][i] = 1;
      }
    }
  });
  const frame = union(...blocks);
  /**
   * His stone is lit green by the slime (his mossy green-grey stone): until the slime has come up,
   * the stone is its own grey (the nearest stone colour by brightness); the green light on it comes
   * in with the slime, in patches. His glowing runes (saturated green) keep their colour.
   */
  const unlit = (() => {
    const map = new Int16Array(PAL.length + 1);
    for (let v = 1; v <= PAL.length; v++) {
      map[v] = v;
      const c = PAL[v - 1];
      if (KIND[v - 1] !== 'body' || FAM[v - 1] !== 'green' || Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) >= 45) continue;
      let best = 1e9;
      for (let w = 1; w <= PAL.length; w++) {
        if (KIND[w - 1] !== 'body' || FAM[w - 1] !== 'neutral') continue;
        const dl = Math.abs(lumOf(PAL[w - 1]) - lumOf(c));
        if (dl < best) {
          best = dl;
          map[v] = w;
        }
      }
    }
    return (L: Layer, lit: number): Layer => {
      if (lit >= 1) return L;
      const out = L.clone();
      for (let i = 0; i < out.v.length; i++) if (out.v[i] && grain(i % L.w, (i / L.w) | 0, seed + 9) >= lit) out.v[i] = map[out.v[i]];
      return out;
    };
  })();
  const top = tops(slime);
  // Smoothed top line of the slime: the bubbling top is the band below it.
  const topS = top.map((_, x) => {
    let s = 0, n = 0;
    for (let k = -6; k <= 6; k++) {
      const v = top[clamp(x + k, 0, K.w - 1)];
      if (v < K.h) {
        s += v;
        n++;
      }
    }
    return n ? s / n : K.h;
  });
  const topBand = (x: number, y: number) => 1 - smooth(topS[x] + 10, topS[x] + 18, y);
  const dir: [number, number] = kind === 'wall' ? [1, 0.35] : [1, -0.2];
  const idleAt = (t: number) => {
    let s = shimmer(slime, t, { period: 46, dir, width: 0.16, where: (x, y) => 1 - topBand(x, y) });
    s = churn(s, t, { amp: 1.4, ampY: 1.2, cell: 6, seed, where: topBand, flow: [0, -0.8] });
    s = wobble(s, t, 0.9, 9, seed + 1, (x, y) => topBand(x, y) * smooth(topS[x] + 6, topS[x] - 4, y));
    const runes = union(tone(frame, (x, y) => {
      const v = frame.get(x, y);
      return FAM[v - 1] === 'green' ? Math.round(0.5 - 0.5 * Math.cos(t * TAU)) : 0;
    }), bits);
    const d = moveDrops(drops, (k) => {
      const ph = rr(seed + 2, k, 0, TAU);
      return bob(t, ph, 1.2);
    });
    return { s, runes, d };
  };
  // The stone's footprint (grown by 2): enclosed see-through pockets there are sealed.
  const near = (L: Layer) => (x: number, y: number) => {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (L.get(x + dx, y + dy)) return true;
    return false;
  };
  const sealed = (c: Canvas, fr: Layer, tag: string): Canvas => {
    const [out, n] = sealFrame(c, near(fr));
    const left = enclosed(out);
    let bad = 0;
    const nr = near(fr);
    for (let i = 0; i < left.length; i++) if (left[i] && nr(i % out.w, (i / out.w) | 0)) bad++;
    if (bad) WALL_HOLES.push(`${kind} ${tag}: ${bad} see-through px in the stone`);
    if (process.env.POISON_LIGHT && n) console.log(`seal ${kind} ${tag}: ${n} px`);
    return out;
  };
  const idle = range(IDLE).map((i) => {
    const { s, runes, d } = idleAt(i / IDLE);
    return sealed(stackC(K.w, K.h, light, runes, s, d), frame, `idle[${i}]`);
  });
  // The rise: each block of the frame pushes up out of the ground over frames 0-4 (by its own
  // height, cut at its own foot line); from frame 2 the slime fills it from the beam up at an even
  // pace, riding with the beam while the beam is still coming up; the drops and the glow round
  // the bubbling top come up with the top over 8-10; his light on the ground grows evenly over
  // frames 2-10. Frame 11 is his picture.
  const blk = blocks.map((B, k) => {
    const f = feet(B), t = tops(B);
    if (k < 2) {
      // (a post's columns that do not reach down to its base, the capital's overhang, are cut at
      // the ground under the post, taken from the nearest columns that do: so the whole capital
      // comes up with the post instead of only its part above the shaft)
      const low = Math.max(...f), g: number[] = [];
      for (let x = 0; x < K.w; x++) if (f[x] >= 0 && f[x] >= low - 24) g.push(x);
      const f0 = f.slice();
      for (let x = 0; x < K.w; x++) {
        if (f0[x] < 0 || f0[x] >= low - 24) continue;
        let l = -1, r = -1;
        for (const u of g) {
          if (u < x) l = u;
          else if (r < 0) r = u;
        }
        f[x] = l < 0 ? f0[r] : r < 0 ? f0[l] : Math.round(f0[l] + ((f0[r] - f0[l]) * (x - l)) / (r - l));
      }
    }
    let hmax = 0;
    for (let x = 0; x < K.w; x++) if (f[x] >= 0) hmax = Math.max(hmax, f[x] - t[x]);
    return { B, f, hmax };
  });
  const raw = feet(slime);
  // The beam's foot line (a straight line under its lowest feet) and its thickness above it.
  let fa = 0, fb = 0;
  {
    let pts = blk[2].f.map((f, x) => [x, f] as [number, number]).filter((p) => p[1] >= 0);
    for (let it = 0; it < 4; it++) {
      const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
      const sxy = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0), sxx = pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
      fb = sxx ? sxy / sxx : 0;
      fa = my - fb * mx;
      pts = pts.filter((p) => p[1] >= fa + fb * p[0] - 2);
    }
    fa += Math.max(0, ...blk[2].f.map((f, x) => (f < 0 ? 0 : f - (fa + fb * x))));
  }
  const beamFoot = (x: number) => fa + fb * x;
  // (his bright streaks lying in the light on the ground, below the beam's foot line, are not the
  // barrier's slime: in the rise they come with his light on the ground, not with the slime)
  for (let y = 0; y < K.h; y++) for (let x = 0; x < K.w; x++) {
    const v = slime.get(x, y);
    if (!v || y <= beamFoot(x) + 2) continue;
    bits.set(x, y, v);
    slime.set(x, y, 0);
  }
  const beamT = tops(blk[2].B);
  const beamTh = beamT.map((t, x) => (blk[2].f[x] < 0 ? -1 : beamFoot(x) - t)).filter((v) => v >= 0).sort((a, b) => a - b);
  const beamH = beamTh[Math.floor(beamTh.length * 0.9)], beamMed = beamTh[beamTh.length >> 1];
  // The beam as stone all along, for the rise: where his slime drips over its top edge (hidden
  // under the slime in his picture), its edge is carried on from the nearest columns along its
  // foot line, so before the slime comes up the beam's top edge is whole.
  const beamFull = blk[2].B.clone();
  for (let x = 0; x < K.w; x++) {
    if (blk[2].f[x] < 0) continue;
    for (let y = Math.ceil(beamFoot(x) - beamMed); y <= beamFoot(x); y++) {
      if (blk[2].B.get(x, y) || !slime.get(x, y)) continue;
      const off = beamFoot(x) - y;
      for (let k = 1; k <= 24; k++) {
        const v = [x - k, x + k].map((u) => blk[2].B.get(u, Math.round(beamFoot(u) - off))).find((w) => w > 0);
        if (v) {
          beamFull.set(x, y, v);
          break;
        }
      }
    }
  }
  // The ground line under the slime: a straight line through the feet of its columns (the
  // highest feet, where the slime only shows above the posts, are dropped and the line refitted).
  let ga = 0, gb = 0;
  {
    let pts = raw.map((f, x) => [x, f] as [number, number]).filter((p) => p[1] >= 0);
    for (let it = 0; it < 4; it++) {
      const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
      const sxy = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0), sxx = pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
      gb = sxx ? sxy / sxx : 0;
      ga = my - gb * mx;
      pts = pts.filter((p) => p[1] >= ga + gb * p[0] - 4);
    }
  }
  const ground = (x: number) => ga + gb * x;
  const hMax = Math.max(...top.map((tp, x) => (tp >= K.h ? 0 : ground(x) - tp))) + 4;
  // The straight wall's rising slime surface is never a level line: it climbs the posts' inner faces (a meniscus,
  // 3 px higher at each post and falling away over about 7 px), slow waves run along it (37 and 21 px
  // long, in opposite directions, with a 10 px ripple), and a broad bulge slides across it as it
  // fills (all scaled down while the layer is still thin). His dripping top comes over it on frames
  // 8-10.
  // (each post's inner face: its stone's extent across, half way up the slime)
  const postIn = [0, 1].map((k) => {
    const xs: number[] = [];
    for (let x = 0; x < K.w; x++) {
      const y = Math.round(ground(x) - hMax / 2);
      if (blocks[k].get(x, y)) xs.push(x);
    }
    return k === 0 ? Math.max(...xs) + 1 : Math.min(...xs) - 1;
  });
  const surfLift = (x: number, i: number, level: number) => {
    const k = clamp(level / 12, 0, 1), ph = i / RISE;
    const men = 3.2 * (Math.exp(-Math.max(0, x - postIn[0]) / 7) + Math.exp(-Math.max(0, postIn[1] - x) / 7));
    const wave = 2.0 * Math.sin((x / 37 - 0.9 * ph) * TAU + 1.3) + 1.4 * Math.sin((x / 21 + 1.3 * ph) * TAU + 4.1) + 0.9 * Math.sin((x / 10.5 - 1.7 * ph) * TAU + 2.2);
    const bc = postIn[0] + (postIn[1] - postIn[0]) * (0.2 + 0.6 * ph);
    const bulge = 2.4 * Math.exp(-(((x - bc) / 30) ** 2));
    return k * (men + wave + bulge);
  };
  // His glow round the bubbling top (above the band's foot) comes up with the top; the rest of his
  // light lies on the ground.
  const topGlow = light.empty(), groundGlow = light.empty();
  for (let y = 0; y < K.h; y++) for (let x = 0; x < K.w; x++) {
    const v = light.get(x, y);
    if (!v) continue;
    (topS[x] < K.h && y < topS[x] + 20 && y < ground(x) - 10 ? topGlow : groundGlow).set(x, y, v);
  }
  // The posts as stone all along, for the rise: in each row, where his slime lay over a post (its
  // capital's top, between its own pixels), the stone is carried on from the nearest stone in the row.
  const postFull = [0, 1].map((k) => {
    const Bk = blk[k].B, out = Bk.clone();
    for (let y = 0; y < K.h; y++) {
      let x0 = -1, x1 = -1;
      for (let x = 0; x < K.w; x++) if (Bk.get(x, y)) {
        if (x0 < 0) x0 = x;
        x1 = x;
      }
      for (let x = x0 + 1; x < x1; x++) {
        if (Bk.get(x, y) || !slime.get(x, y) || topIn[k][y * K.w + x]) continue;
        for (let k2 = 1; k2 < K.w; k2++) {
          const v = Bk.get(x - k2, y) || Bk.get(x + k2, y);
          if (v) {
            out.set(x, y, v);
            break;
          }
        }
      }
    }
    // (and in each column, where his slime ran across the post's neck between its stone)
    for (let x = 0; x < K.w; x++) {
      let y0 = -1, y1 = -1;
      for (let y = 0; y < K.h; y++) if (Bk.get(x, y)) {
        if (y0 < 0) y0 = y;
        y1 = y;
      }
      for (let y = y0 + 1; y < y1; y++) {
        if (out.get(x, y) || !slime.get(x, y) || topIn[k][y * K.w + x]) continue;
        for (let k2 = 1; k2 < K.h; k2++) {
          const v = Bk.get(x, y - k2) || Bk.get(x, y + k2);
          if (v) {
            out.set(x, y, v);
            break;
          }
        }
      }
    }
    return out;
  });
  // (3/4 wall) His slime hides the far cube's left face. In the rise, before the slime comes up, the
  // cube must still read as a solid cube, not a slab on a thin leg: its left face is filled under
  // the top face's lower-left edge (the capital outline's), down to the post's neck, with his near
  // cube's left face (his dark stone, sampled across the face, so it is shaded with the same ramp);
  // his own stone there and his front-edge highlight line are kept. The slime covers it as in his
  // picture (the idle frames and rise frame 11 are his picture, without it).
  if (kind === 'wall_diag') {
    const FAR = { x0: 192, y0: 35.5, x1: 204, y1: 41.5, depth: 13.5 }, NEAR = { x0: 11, y0: 139.5, x1: 29.5, y1: 145.5, depth: 16 };
    const slope = (FAR.y1 - FAR.y0) / (FAR.x1 - FAR.x0);
    for (let x = FAR.x0; x < FAR.x1; x++) {
      const yt = FAR.y0 + (x + 0.5 - FAR.x0) * slope;
      for (let y = Math.floor(yt); y < yt + FAR.depth; y++) {
        const j = y * K.w + x;
        if (topIn[1][j] || blocks[1].v[j]) continue;
        const u = (x + 0.5 - FAR.x0) / (FAR.x1 - FAR.x0), v = (y + 0.5 - yt) / FAR.depth;
        const nx = Math.floor(NEAR.x0 + u * (NEAR.x1 - NEAR.x0)), ny = Math.floor(NEAR.y0 + u * (NEAR.y1 - NEAR.y0) + v * NEAR.depth);
        const val = blocks[0].get(nx, ny);
        postFull[1].set(x, y, val && FAM[val - 1] === 'neutral' ? val : RIM.neutral);
      }
    }
  }
  // (his dark stone streaks on the ground in front of the beam (the 3/4 wall's dashes): small pieces
  // of the beam's block lying wholly below the beam in their columns. They are not the beam: in the
  // rise they come in with his light on the ground, at its strength where they lie, like his bright
  // streaks there, instead of popping in with the rising beam onto bare ground)
  {
    const pcs = pieces(blk[2].B);
    const low = new Int32Array(K.w).fill(-1);
    for (const pc of pcs) if (pc.length > 200) for (const j of pc) low[j % K.w] = Math.max(low[j % K.w], (j / K.w) | 0);
    for (const pc of pcs) {
      if (pc.length > 80 || !pc.every((j) => low[j % K.w] >= 0 && ((j / K.w) | 0) > low[j % K.w])) continue;
      for (const j of pc) {
        bits.v[j] = blk[2].B.v[j];
        beamFull.v[j] = 0;
      }
      if (process.env.POISON_DEBUG) console.log(`${kind}: a ${pc.length} px stone streak in front of the beam comes with the ground light`);
    }
  }
  const full = [postFull[0], postFull[1], beamFull];
  // Per block, its pixels next to his slime (and on which side), for the rise.
  const slimeEdge = full.map((Bf) => {
    const out: [number, number, [number, number][]][] = [];
    for (let y = 0; y < K.h; y++) for (let x = 0; x < K.w; x++) {
      if (!Bf.get(x, y)) continue;
      const offs = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]).filter(([dx, dy]) => slime.get(x + dx, y + dy) && !full.some((F) => F.get(x + dx, y + dy)));
      if (offs.length) out.push([x, y, offs]);
    }
    return out;
  });
  const ease = (u: number) => 1 - Math.pow(1 - clamp(u, 0, 1), 1.6);
  let glowReach = 0;
  for (let y = 0; y < K.h; y++) for (let x = 0; x < K.w; x++) if (groundGlow.get(x, y)) glowReach = Math.max(glowReach, y - beamFoot(x));
  const rise = range(RISE).map((i) => {
    if (i === RISE - 1) return idle[0];
    const pf = ease((i + 1) / 5), ps = clamp((i - 1.5) / 9.5, 0, 1), pt = clamp((i - 7) / 3, 0, 1);
    const dB = blk.map((b) => Math.round((1 - pf) * (b.hmax + 2)));
    // (the base beam: cut at each column's own (ragged) foot it would come up in dashes, so it is
    // pushed up whole out of one straight foot line along its length (along the diagonal for the
    // 3/4 wall), and its top edge comes up at once, unbroken)
    const push = (b: (typeof blk)[number]) => {
      const d = Math.round((1 - pf) * (beamH + 2));
      return remap(beamFull, (x, y) => (b.f[x] < 0 || y > beamFoot(x) + 0.5 ? null : [x, y - d]));
    };
    const shift = blk.map((b, k) => (k === 2 ? Math.round((1 - pf) * (beamH + 2)) : dB[k]));
    const posts = [0, 1].map((k) => remap(full[k], (x, y) => (blk[k].f[x] < 0 || y > blk[k].f[x] ? null : [x, y - dB[k]])));
    const fr = unlit(union(posts[0], posts[1], shift[2] === 0 ? beamFull : push(blk[2])), clamp((i - 3) / 7, 0, 1));
    // (check: each post top keeps his outline all the way up: above the ground, the post shows
    // exactly his top's pixels, moved with the post, and nothing else inside the outline)
    for (const k of [0, 1]) {
      let bad = 0;
      for (let y = 0; y < K.h; y++) for (let x = 0; x < K.w; x++) {
        const j = y * K.w + x, yo = y + dB[k];
        if (!topIn[k][j] || yo >= K.h || yo > blk[k].f[x]) continue;
        if (!!posts[k].get(x, yo) !== !!topMask[k][j] || (topMask[k][j] && !fr.get(x, yo))) bad++;
      }
      if (bad) TOP_FAULTS.push(`${kind} rise[${i}] post ${k}: ${bad} px of its top differ from his outline`);
    }
    // (the slime rides on the beam while the beam is still coming up)
    dB[2] = shift[2];
    let sl: Layer | null = null;
    if (ps > 0) {
      const { s } = idleAt(fract((i - (RISE - 1)) / IDLE));
      // (the 3/4 wall's surface runs up along the diagonal and is ragged already: only the straight
      // wall's level top takes the meniscus and the waves)
      sl = cut(s, (x, y) => ground(x) - y <= ps * hMax + (kind === 'wall' ? surfLift(x, i, ps * hMax) + 1.2 * (pnoise(x, i * 3, 6, 0, 0, seed + 4) - 0.5) * 2 : 2.5 * (pnoise(x, i * 3, 6, 0, 0, seed + 4) - 0.5) * 2), 4);
      if (dB[2]) {
        // (it rides with the beam, never below the ground it stands on)
        const bf = blk[2].f;
        sl = remap(sl, (x, y) => (y > Math.max(raw[x], bf[x]) ? null : [x, y - dB[2]]));
      }
    }
    const d = pt > 0 ? cut(drops, (x, y) => grain(x, y, seed + 6) < pt, 0, false) : null;
    // (the glow round the bubbling top only where the top already is: within 3 px of the slime)
    const tg = pt > 0 && sl ? remap(glowMul(topGlow, pt), (x, y) => {
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (isKind(sl!.get(x + dx, y + dy), 'body')) return [x, y];
      return null;
    }) : null;
    // (his light on the ground has the slime as its source: it starts once the slime shows (frame
    // 4), grows with how far the slime has filled, and spreads out from the wall's foot line, its
    // reach growing with it and fading softly at its front)
    const gk = clamp((ps - 0.16) / 0.73, 0, 1);
    const reach = (glowReach + 14) * gk;
    const lt = gk > 0 ? union(glowMul(groundGlow, (x, y) => gk * smooth(reach, reach - 14, Math.max(0, y - beamFoot(x)))), tg) : tg;
    // (his bright streaks and loose bits in that light brighten with it: each takes the light's own
    // strength where it lies, so none arrives bright while the light round it is still dim)
    let bt: Canvas | null = null;
    if (gk > 0) {
      bt = bits.render();
      for (let y = 0; y < K.h; y++) for (let x = 0; x < K.w; x++) {
        const j = (y * K.w + x) * 4 + 3;
        if (bt.px[j]) bt.px[j] = Math.round(bt.px[j] * clamp(gk * smooth(reach, reach - 14, Math.max(0, y - beamFoot(x))), 0, 1));
      }
    }
    // (where his slime covered the stone's edge and it has not come up yet, the stone ends in his
    // dark stone rim, so a capital or a post is never left open on the side the slime hid)
    const frR = fr.clone();
    blk.forEach((b, k) => {
      for (const [x, y, offs] of slimeEdge[k]) {
        const yo = y + shift[k];
        if (fr.get(x, yo) === 0 || !isKind(fr.get(x, yo), 'body')) continue;
        if (offs.some(([dx, dy]) => !fr.get(x + dx, yo + dy) && !(sl && sl.get(x + dx, yo + dy)))) frR.set(x, yo, RIM.neutral);
      }
    });
    return sealed(stackC(K.w, K.h, lt, frR, bt, sl, d), fr, `rise[${i}]`);
  });
  return vfxSprite(kind, label, [K.ax, K.ay], { rise: { frames: rise, fps: 12, loop: false }, idle: { frames: idle, fps: 10, loop: true } });
}

// --- the end-on wall: OURS (vfx-b-poison.ts), kept as the owner asked -----------------------------
// Copied from vfx-b-poison.ts (unchanged there): its palettes, drops, bubbles, fumes and the mist
// curtain volume, with the same seeds, so idle frame 0 is our wall exactly.

/** 0 outline, 1 very dark green, 2 deep green, 3 forest, 4 green, 5 toxic green, 6 acid yellow-green, 7 pale lime, 8 white-lime. */
const OP = B.pal('#0a1f0e', '#123e18', '#1b5e22', '#247e2a', '#36a42c', '#58c82a', '#9ee22c', '#d6f772', '#f6ffd4');
/** Sickly purple accent: 0 outline .. 5 light. */
const OPUR = B.pal('#1e0a28', '#3e1656', '#642a86', '#8c44ae', '#b474d6', '#dcaaf0');
const OWW = 272, OWALL_H = 103, OWALL_W = 257, MIST_HALF = 15;

function oBubbles(c: Canvas, list: [number, number, number][], o: { purple?: boolean; alpha?: number } = {}): void {
  const l = new B.L(c.w, c.h);
  for (const [x, y, r] of list) {
    if (r < 1) {
      l.set(x, y, 7);
      continue;
    }
    l.disc(x, y, r, 4);
    l.erase((px, py) => Math.hypot(px + 0.5 - x, py + 0.5 - y) < r - 1);
    l.set(x - r * 0.4, y - r * 0.4, 8);
  }
  if (o.purple) l.map((v) => (v === 4 ? 4 : 5));
  l.render(c, o.purple ? OPUR : OP, { outline: null, alpha: o.alpha });
}
function oDrop(l: B.L, x: number, y: number, r: number, len: number, ang = Math.PI / 2): void {
  const tail = B.polar(x, y, len, ang + Math.PI);
  l.tube([tail, [x, y]], [0.3, r * 0.75], 1);
  l.disc(x, y, r, 1);
}
function oDrops(c: Canvas, list: [number, number, number, number][], o: { purple?: boolean; alpha?: number } = {}): void {
  const l = new B.L(c.w, c.h);
  for (const [x, y, r, len] of list) oDrop(l, x, y, Math.max(1.5, r), len);
  l.bands([1, 2], [6, 7, 8]);
  for (const [x, y, r] of list) if (r >= 1.5) l.set(x - r * 0.4, y - r * 0.4, 8);
  l.render(c, o.purple ? OPUR : OP, { alpha: o.alpha, outlineAlpha: o.alpha });
}
function oFumes(c: Canvas, list: B.Puff[], o: { seed?: number; alpha?: number; purple?: boolean; steps?: number[]; wrapX?: boolean } = {}): void {
  const l = new B.L(c.w, c.h);
  B.puffs(l, list, { steps: o.steps ?? (o.purple ? [1, 2, 3, 4, 5] : [2, 3, 4, 5, 6, 7]), rim: o.purple ? 1 : 2, seed: o.seed ?? 3, wobble: 0.45, wrapX: o.wrapX });
  l.clean(1, o.wrapX);
  l.render(c, o.purple ? OPUR : OP, { alpha: o.alpha, outlineAlpha: o.alpha, wrapX: o.wrapX });
}
const orange = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

/** Our mist curtain as a gas volume, seen end-on (vfx-b-poison.ts `mist3d`, unchanged). */
function mist3d(o: Orient, hk: number, t: number): Canvas {
  const c = new Canvas(o.w, o.h);
  const hu = new Float32Array(LEN + 41);
  for (let i = 0; i < hu.length; i++) {
    const x = i - 20 + (OWW - OWALL_W) / 2;
    hu[i] = Math.max(1, OWALL_H * hk * (0.68 + 0.24 * B.pnoise(x, 0, 20, OWW, 141) + 0.1 * Math.abs(Math.sin((x / OWW) * TAU * 7 + t * TAU))));
  }
  const D = (u: number, s: number, v: number): number => {
    if (u < -20 || u > LEN + 20 || v < -2) return 0;
    const k = v / hu[Math.round(u) + 20];
    if (k > 1.08) return 0;
    const half = (MIST_HALF + 5 * (1 - B.smooth(0, 12, v))) * (1 - 0.45 * B.smooth(0.25, 1, k));
    const as = Math.abs(s);
    if (as > half) return 0;
    const ends = B.smooth(-4, 16, u) * (1 - B.smooth(LEN - 16, LEN + 4, u));
    return ends * (1 - B.smooth(half * 0.55, half, as)) * (1 - B.smooth(0.62, 1.08, k)) * (0.85 + 0.25 * (1 - B.smooth(0, 0.25, k)));
  };
  const N2 = o.w * o.h;
  const sd = new Float32Array(N2), ua = new Float32Array(N2).fill(-99);
  const uB = (o.dz * PPM) / DPM, sB = (o.nz * PPM) / DPM, vMax = HGT * 1.12;
  for (let py = 0; py < o.h; py++)
    for (let px = 0; px < o.w; px++) {
      const x = (px + 0.5 - o.ax) / PPM, Y = py + 0.5 - o.ay;
      const u0 = ((x - o.ox) * o.dx + (Y / DPM - o.oz) * o.dz) * PPM;
      const s0 = ((x - o.ox) * o.nx + (Y / DPM - o.oz) * o.nz) * PPM;
      let mx = 0, acc = 0, um = -99;
      for (let v = -2; v <= vMax; v += 1) {
        const d = D(u0 + uB * v, s0 + sB * v, v);
        acc += d;
        if (d > mx) {
          mx = d;
          um = u0 + uB * v;
        }
      }
      const i = py * o.w + px;
      sd[i] = mx * (0.82 + 0.22 * (1 - Math.exp(-acc / 10)));
      ua[i] = um;
    }
  const dens = (x: number, y: number): number => (x < 0 || y < 0 || x >= o.w || y >= o.h ? 0 : sd[y * o.w + x]);
  const g = B.gasLayer(o.w, o.h, dens, t, { seed: 142, thr: 0.34, steps: [2, 3, 3, 4, 5, 6, 7], lx: 0 });
  g.map((st, x, y) => {
    const u = ua[y * o.w + x];
    if (u > LEN * 0.66) return Math.max(2, st - 1);
    if (u < LEN * 0.2 && st >= 6) return st + 1;
    return st;
  });
  g.render(c, OP, { alpha: 235, outlineAlpha: 235 });
  oFumes(c, orange(4).map((k) => {
    const ph = B.fract(B.rnd(145, k) + t);
    const q = proj(o, 22 + k * 64 + Math.sin(ph * TAU) * 6, 0, 22 + (B.rnd(146, k) * 0.5 + ph * 0.4) * OWALL_H * hk * 0.8);
    return { x: q[0], y: q[1], r: 6 * (1 - ph * 0.35) };
  }), { purple: true, seed: 147, alpha: 205 });
  return c;
}

/**
 * Our end-on mist curtain with the new frame counts, made of our own frames. `idle` (8 at 10 fps):
 * the even frames 0, 2, 4, 6 are our old idle frames 0-3 pixel for pixel (t = f / 8 runs the same
 * churn); the odd frames lie halfway in time, their bubbles halfway in size. `rise` (12 at 12 fps),
 * one ease-out: our old rise frame 0 was already 73 % of the wall's light, so it now comes up out
 * of the ground first (frames 0-3: pushed up whole, its round top carried along, 30 / 55 / 75 / 89
 * % of its height); frames 4, 5, 7, 9, 10, 11 are our old rise frames 0-5 pixel for pixel, and
 * frames 6 and 8 lie between the old frames round them. The last rise frame runs into idle frame 0
 * as before.
 */
function wallDepth(): WorldSprite {
  const o = orientations().wall_depth;
  const at = (u: number, s: number, v: number): B.Pt => proj(o, u, s, v);
  const HK = [0.2, 0.45, 0.7, 0.92, 1.02, 1];
  /** Bubble k's radius on old idle frame f (every third one big, as before). */
  const bubbleR = (k: number, f: number) => ((k + f) % 3 === 0 ? 2 : 1.2);
  const idle = range(IDLE).map((i) => {
    const t = i / IDLE;
    const c = mist3d(o, 1, t);
    oDrops(c, orange(8).map((k) => {
      const ph = B.fract(B.rnd(143, k) + t);
      const q = at(8 + B.rnd(144, k) * 240, MIST_HALF * 0.6, 60 - ph * 56);
      return [q[0], q[1], 1.6, 2 + ph * 2] as [number, number, number, number];
    }));
    const f0 = Math.floor(i / 2), f1 = (Math.ceil(i / 2)) % (IDLE / 2);
    oBubbles(c, orange(8).map((k) => {
      const q = at(8 + B.rnd(145, k) * 240, (k % 2 ? 1 : -1) * (MIST_HALF + 2 + B.rnd(148, k) * 4), 3 + B.fract(B.rnd(146, k) + t) * 12);
      return [q[0], q[1], (bubbleR(k, f0) + bubbleR(k, f1)) / 2] as [number, number, number];
    }));
    return c;
  });
  /** Our old rise frame f (heights HK, time f / 6, its own drops), exactly as vfx-b-poison.ts drew it. */
  const oldRise = (hk: number, t: number, df: number): Canvas => {
    const c = mist3d(o, hk, t);
    oDrops(c, orange(10).map((k) => {
      const q = at(4 + B.rnd(141, k, df) * 248, MIST_HALF * 0.6, 10 + B.rnd(142, k, df) * 90 * Math.min(1, hk));
      return [q[0], q[1], 1.6, 2] as [number, number, number, number];
    }));
    return c;
  };
  const old0 = oldRise(HK[0], 0, 0);
  // (old frame 0's extent: each column's foot, and the whole curtain's height)
  const foot = new Array<number>(old0.w).fill(-1);
  let yTop = old0.h, yBot = -1;
  for (let x = 0; x < old0.w; x++) for (let y = 0; y < old0.h; y++) if (old0.alpha(x, y)) {
    foot[x] = y;
    yTop = Math.min(yTop, y);
    yBot = Math.max(yBot, y);
  }
  /** Old frame 0 coming up out of the ground: pushed up from below, its round top carried along, each column cut at its own foot. */
  const reveal = (k: number): Canvas => {
    const d = Math.round((1 - k) * (yBot - yTop + 1));
    const c = new Canvas(old0.w, old0.h);
    for (let x = 0; x < old0.w; x++) for (let y = 0; y <= foot[x]; y++) if (y - d >= 0) c.set(x, y, old0.get(x, y - d));
    return c;
  };
  // The rise, re-timed as one ease-out that starts from (almost) nothing: frames 0-3 push old frame
  // 0 up out of the ground (30 %, 55 %, 75 %, 89 % of its height), frame 4 is old frame 0, then old
  // frames 1-5 with an in-between in each of the two big old steps, placed so the column's top
  // slows down evenly: 4 old 0, 5 old 1, 6 in-between (75 % of the way to old 2), 7 old 2, 8
  // in-between (40 % of the way to old 3), 9 old 3, 10 old 4, 11 old 5. The top climbs 45, 36, 26,
  // 20, 20, 14, 9, 7, 8, 8 and 1 px a frame. Every frame named "old" is our old frame pixel for pixel.
  const plan: (number | [number, number, number] | { reveal: number })[] = [{ reveal: 0.3 }, { reveal: 0.55 }, { reveal: 0.75 }, { reveal: 0.89 }, 0, 1, [1, 2, 0.75], 2, [2, 3, 0.4], 3, 4, 5];
  const rise = plan.map((pl) => {
    if (typeof pl === 'number') return pl === 0 ? old0.clone() : oldRise(HK[pl], pl / 6, pl);
    if (Array.isArray(pl)) {
      const [a, b, f] = pl;
      return oldRise(HK[a] + (HK[b] - HK[a]) * f, (a + (b - a) * f) / 6, a);
    }
    return reveal(pl.reveal);
  });
  return vfxSprite('wall_depth', 'Poison wall (depth): mist curtain (ours, kept)', [o.ax, o.ay], { rise: { frames: rise, fps: 12, loop: false }, idle: { frames: idle, fps: 10, loop: true } });
}

// --- aura -----------------------------------------------------------------------------------------

/**
 * The tint his aura lays over the figure, as a soft field round the body (not the shape of any one
 * character, so it sits right on every figure): an ellipse centred 50 px above the feet, 46 x 110
 * px, his violet flame colour at the strength fitted on his figure, full out to 60 % of its radius
 * and falling to nothing at its edge (smoothstep, full alpha precision: no rim, no ring, no green
 * edge). It breathes with the frames (alpha +-12 %, size +-2 %), twice a loop.
 */
function veil(w: number, h: number, ax: number, ay: number, frame: number): Canvas {
  const c = new Canvas(w, h);
  const deep = hex(PV3_VEIL.deep);
  const ph = (frame / AURA) * TAU * 2;
  const breathe = 1 + 0.12 * Math.sin(ph), size = 1 + 0.02 * Math.sin(ph);
  const cx = ax, cy = ay - 50, rx = 23 * size, ry = 55 * size;
  const a0 = PV3_VEIL.alpha;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const r = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
      const a = Math.round(a0 * (1 - smooth(0.6, 1, r)) * breathe * 255);
      if (a < 1) continue;
      c.set(x, y, [deep[0], deep[1], deep[2], a]);
    }
  return c;
}

/**
 * His aura in two frame-synchronized layers with the same size and anchor (the feet): `aura_back`
 * goes BEHIND the character (his violet flames rising all round the figure, the green flame
 * strands, the motes and the far half of his pool); `aura` goes OVER it (his tint over the figure
 * and the near half of his pool). The flames lick upward (a rising warp that comes round, pinned
 * still over the pool's bottom rows), the motes float as rigid sprites round small ellipses, the
 * pool shimmers and the tint breathes. The build fails if the two layers together leave a
 * see-through pixel in his pool or deep inside his flames on any frame.
 */
function aura(): WorldSprite[] {
  const KB = key('aura_back'), KF = key('aura'), seed = 7900;
  const bm = KB.part('main'), bd = KB.part('drops'), bg = KB.part('glow');
  const fm = KF.part('main');
  // His motes (the violet diamond, the round grey mote, the small violet embers and his drops) are
  // lifted out of the flames' warp with their own faint dark halos: each floats as a rigid sprite,
  // exactly his shape, round its own small upright ellipse (up to 5 px up, 2 px across), so it never
  // stretches or shears and its halo goes with it.
  const solid = union(bm, bd);
  const owner = new Int16Array(KB.w * KB.h).fill(-1);
  const pcs = pieces(solid).sort((a, b) => b.length - a.length);
  const motes: { body: [number, number, number][]; halo: [number, number, number][] }[] = [];
  for (const pc of pcs.slice(1)) {
    if (pc.length > 80 && !pc.some((j) => bd.v[j])) continue;
    const k = motes.length;
    motes.push({ body: pc.map((j) => [j % KB.w, (j / KB.w) | 0, solid.v[j]] as [number, number, number]), halo: [] });
    for (const j of pc) {
      owner[j] = k;
      bm.v[j] = 0;
      bd.v[j] = 0;
    }
  }
  // (a halo pixel belongs to the mote whose body is nearest to it, within 4 px)
  for (let y = 0; y < KB.h; y++) for (let x = 0; x < KB.w; x++) {
    const v = bg.get(x, y);
    if (!v) continue;
    let best = 99, who = -1;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const u = x + dx, w = y + dy;
      if (u < 0 || w < 0 || u >= KB.w || w >= KB.h || !solid.v[w * KB.w + u]) continue;
      const dd = Math.hypot(dx, dy);
      if (dd < best) {
        best = dd;
        who = owner[w * KB.w + u];
      }
    }
    if (who < 0) continue;
    motes[who].halo.push([x, y, v]);
    bg.set(x, y, 0);
  }
  // The pool's bottom never moves: the rising warp is pinned to zero over the bottom rows, so the
  // back layer's pool always meets the front layer's (no see-through slit at the seam between them).
  const pin = (y: number) => smooth(KB.ay - 4, KB.ay - 14, y + 0.5);
  // ...and the two layers overlap: the far half of the pool runs on 2 rows under the near half,
  // only where the near half is opaque on every frame (so the picture does not change).
  let fy0 = KF.h;
  for (let y = 0; y < KF.h && fy0 === KF.h; y++) for (let x = 0; x < KF.w; x++) if (fm.get(x, y)) {
    fy0 = y;
    break;
  }
  // His panel cut his flames and his pool at its sides: from row 80 down, both layers fade out
  // over their outer 5 columns along a ragged line (each row's start moved by up to 2 px), as the
  // blast's panel cuts do, so the aura never ends in straight sides or square corners.
  let ex0 = KB.w, ex1 = -1;
  for (const L of [bm, fm]) for (let y = 0; y < KB.h; y++) for (let x = 0; x < KB.w; x++) if (L.get(x, y)) {
    ex0 = Math.min(ex0, x);
    ex1 = Math.max(ex1, x);
  }
  const sideK = new Float32Array(KB.w * KB.h).fill(1);
  for (let y = 0; y < KB.h; y++) {
    const on = smooth(78, 86, y + 0.5);
    if (on <= 0) continue;
    const oL = 1.3 * (2 * pnoise(0, y, 4, 0, 0, seed + 40) - 1) + 0.7 * (2 * rnd(seed + 41, y) - 1);
    const oR = 1.3 * (2 * pnoise(0, y, 4, 0, 0, seed + 42) - 1) + 0.7 * (2 * rnd(seed + 43, y) - 1);
    for (let x = 0; x < KB.w; x++) {
      const k = smooth(ex0 - 0.5 + oL, ex0 + 5 + oL, x + 0.5) * smooth(ex1 + 1.5 - oR, ex1 - 4 - oR, x + 0.5);
      sideK[y * KB.w + x] = 1 - on * (1 - k);
    }
  }
  const under = bm.clone();
  for (const y of [fy0, fy0 + 1])
    for (let x = 0; x < KB.w; x++) {
      const v = bm.get(x, fy0 - 1);
      if (v && !bm.get(x, y) && fm.get(x, y) && sideK[y * KB.w + x] >= 1) under.set(x, y, v);
    }
  // His pale-lime highlights on the green flame strands (a small spot of 7 px on each strand, his
  // brightest colour) are lifted out of the warp too: each is taken out of the flames (its pixels take
  // the strand's colour round it) and drawn back as a rigid sprite, exactly his shape, carried along
  // with the strand by the warp at its centre, so it never changes shape from frame to frame.
  const lum = (v: number) => (isKind(v, 'body') ? lumOf(PAL[v - 1]) : 0);
  const highlights: { px: [number, number, number][]; cx: number; cy: number }[] = [];
  {
    const bright = under.empty();
    for (let j = 0; j < under.v.length; j++) if (lum(under.v[j]) >= 135) bright.v[j] = under.v[j];
    const todo: number[] = [];
    for (const pc of pieces(bright)) {
      const cx = pc.reduce((a, j) => a + (j % KB.w), 0) / pc.length, cy = pc.reduce((a, j) => a + ((j / KB.w) | 0), 0) / pc.length;
      if (pc.length > 12 || !pc.some((j) => lum(under.v[j]) >= 225) || cy >= KB.ay - 14) continue;
      highlights.push({ px: pc.map((j) => [j % KB.w, (j / KB.w) | 0, under.v[j]] as [number, number, number]), cx, cy });
      for (const j of pc) {
        under.v[j] = 0;
        todo.push(j);
      }
    }
    // (the strand under it: each pixel takes the commonest of his strand colours round it, inward)
    for (let guard = 0; todo.length && guard < 8; guard++) {
      const fills: [number, number][] = [];
      for (const j of todo) {
        const x = j % KB.w, y = (j / KB.w) | 0, votes = new Map<number, number>();
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const v = under.get(x + dx, y + dy);
          if ((dx || dy) && isKind(v, 'body')) votes.set(v, (votes.get(v) ?? 0) + 1);
        }
        let best = 0, bn = 0;
        for (const [v, n] of [...votes.entries()].sort((a, b) => a[0] - b[0])) if (n > bn) (best = v), (bn = n);
        if (best) fills.push([j, best]);
      }
      for (const [j, v] of fills) under.v[j] = v;
      const left = todo.filter((j) => !under.v[j]);
      todo.length = 0;
      todo.push(...left);
    }
  }
  const sides = (c: Canvas): Canvas => {
    const out = c.clone();
    for (let i = 0; i < sideK.length; i++) if (sideK[i] < 1 && out.px[i * 4 + 3]) out.px[i * 4 + 3] = Math.round(out.px[i * 4 + 3] * sideK[i]);
    return out;
  };
  const back: Canvas[] = [], front: Canvas[] = [];
  for (let i = 0; i < AURA; i++) {
    const t = i / AURA;
    const up = (y: number) => (0.35 + 0.65 * smooth(KB.ay - 4, KB.ay - 80, y)) * pin(y);
    // (the tips lick up 2-3 px; the flames' feet barely move; the pool's bottom rows stay still)
    const b = wobble(churn(under, t, { amp: 1.3, ampY: 2.6, cell: 7, seed, flow: [0, -1.8], where: (_x, y) => up(y) }), t, 2.4, 10, seed + 1, (_x, y) => up(y) ** 1.5);
    // (his highlights, rigid, where the warp carries their strand: the warp moves what lies at s to
    // the x with x - d(x) = s, found in two steps)
    for (const h of highlights) {
      const d = (x: number, y: number): [number, number] => {
        const [dx, dy] = circleDisp(x, y, t, 10, seed + 1), w = up(y) ** 1.5;
        return [dx * 2.4 * w, dy * 2.4 * w];
      };
      let [px, py] = [h.cx, h.cy];
      for (let k = 0; k < 2; k++) {
        const [dx, dy] = d(px, py);
        px = h.cx + dx;
        py = h.cy + dy;
      }
      const ox = Math.round(px - h.cx), oy = Math.round(py - h.cy);
      for (const [x, y, v] of h.px) if (isKind(b.get(x + ox, y + oy), 'body')) b.set(x + ox, y + oy, v);
    }
    const halo = bg.empty(), body = bg.empty();
    motes.forEach((m, k) => {
      const ph = rr(seed + 2, k, 0, TAU);
      const dx = Math.round(1 * (Math.cos(t * TAU + ph) - Math.cos(ph))), dy = Math.round(2.5 * (Math.sin(t * TAU + ph) - Math.sin(ph)));
      for (const [x, y, v] of m.halo) halo.set(x + dx, y + dy, v);
      for (const [x, y, v] of m.body) body.set(x + dx, y + dy, v);
    });
    // (the warp can leave a pinhole, or a slit of up to 24 px between two tongues whose tips it
    // brings together, enclosed in the flames: it is sealed with the colour round it, as the walls'
    // stone is, so no see-through slit opens and closes from frame to frame)
    const bc = stackC(KB.w, KB.h, bg, halo, b, body);
    back.push(sides(i ? sealFrame(bc, () => false, 24)[0] : bc));
    const f = shimmer(fm, t, { period: 30, dir: [1, 0], width: 0.2 });
    front.push(stackC(KF.w, KF.h, veil(KF.w, KF.h, KF.ax, KF.ay, i), sides(f.render())));
  }
  // (check: back + front together cover his flames and his pool on every frame: no enclosed
  // see-through pixel deep inside his silhouette (3 px or more in from its edge: the gaps between
  // his tongues may shift as they lick, by up to 3 px), and none in his pool away from the faded sides)
  const sil = union(solid, fm);
  const deep = new Uint8Array(KB.w * KB.h);
  for (let y = 0; y < KB.h; y++) for (let x = 0; x < KB.w; x++) {
    let all = true;
    for (let dy = -3; dy <= 3 && all; dy++) for (let dx = -3; dx <= 3 && all; dx++) if (!sil.get(x + dx, y + dy)) all = false;
    deep[y * KB.w + x] = all ? 1 : 0;
  }
  for (let i = 0; i < AURA; i++) {
    const c = stackC(KB.w, KB.h, back[i], front[i]);
    const enc = enclosed(c);
    let holes = 0, pool = 0;
    for (let j = 0; j < enc.length; j++) {
      if (enc[j] && deep[j]) {
        holes++;
        if (process.env.POISON_DEBUG) console.log(`aura[${i}] hole at ${j % KB.w},${(j / KB.w) | 0}`);
      }
      const y = (j / KB.w) | 0;
      if (y >= KB.ay - 24 && (bm.v[j] || fm.v[j]) && sideK[j] >= 1 && c.px[j * 4 + 3] < 128) pool++;
    }
    if (holes || pool) AURA_FAULTS.push(`aura[${i}]: ${holes} enclosed see-through px, ${pool} see-through px in his pool`);
  }
  return [
    vfxSprite('aura', 'Poison aura, front layer (draw OVER the character): venom tint and the near pool', [KF.ax, KF.ay], { idle: { frames: front, fps: AURA_FPS, loop: true } }),
    vfxSprite('aura_back', 'Poison aura, back layer (draw BEHIND the character): violet flames and green light', [KB.ax, KB.ay], { idle: { frames: back, fps: AURA_FPS, loop: true } }),
  ];
}
/** Aura frames where back + front leave a see-through pixel in his flames or pool (the build fails on any). */
const AURA_FAULTS: string[] = [];

// --- the group ------------------------------------------------------------------------------------

/**
 * No loose bit may be cut by its frame (a droplet that drifts onto the border is dropped). The
 * stream tile wraps by design and the head's left edge is its joint with the tile.
 */
function edgeClean(s: WorldSprite): WorldSprite {
  if (s.name === 'stream') return s;
  const sides = s.name === 'stream_head' ? 'trb' : 'ltrb';
  const anims = Object.fromEntries(Object.entries(s.anims).map(([k, a]) => [k, { ...a, frames: a.frames.map((f) => clearEdgeBits(f, 64, sides)) }]));
  return { ...s, anims };
}

/** No frame may have art on its border (except the stream tile's sides and the head's joint). */
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

/** The sprites in the order of the vfx_poison manifest (beast copied through), then aura_back. */
const ORDER = ['bolt', 'beast', 'stream', 'stream_head', 'breath', 'sphere', 'slash', 'multi', 'hit', 'blast', 'wall', 'aura', 'aura_back', 'wall_diag', 'wall_depth'];

export function poisonV3Sprites(): WorldSprite[] {
  return [
    bolt(), ...stream(), breath(), sphere(), slash(), multi(), hit(), blast(),
    wall('wall', 'Poison wall: slime barrier of hexagon cells in a stone frame with runes', 8000),
    ...aura(),
    wall('wall_diag', 'Poison wall (3/4): framed slime barrier on its lit ground', 8100),
    wallDepth(),
  ].map(edgeClean);
}

/** For review tools only: one of his pieces of a key frame, or one sprite built alone (nothing is written). */
export const poisonV3Dev = {
  piece: (name: string, p: string): Canvas => key(name).part(p).render(),
  faults: (): string[] => [...WALL_HOLES, ...TOP_FAULTS, ...MIST_FAULTS, ...AURA_FAULTS, ...BLAST_HOLES, ...LIGHT_FAULTS],
  sprite: (name: string): WorldSprite[] =>
    (({
      bolt: () => [bolt()], stream: () => stream(), breath: () => [breath()], sphere: () => [sphere()], slash: () => [slash()], multi: () => [multi()], hit: () => [hit()], blast: () => [blast()],
      wall: () => [wall('wall', 'wall', 8000)], wall_diag: () => [wall('wall_diag', 'wall_diag', 8100)], aura: () => aura(), wall_depth: () => [wallDepth()],
    }) as Record<string, () => WorldSprite[]>)[name]().map(edgeClean),
};

function main(): void {
  // Staging only: refuse to run without WORLD_OUT, so nothing is ever written into src/assets.
  const worldOut = process.env.WORLD_OUT;
  if (!worldOut) throw new Error('vfx-poison-v3: set WORLD_OUT to the staging folder (this generator never writes into src/assets)');
  const beastSrc = join(worldOut, 'vfx_poison', 'beast.png');
  const oldManifest = join(worldOut, 'vfx_poison', 'manifest.json');
  if (!existsSync(beastSrc) || !existsSync(oldManifest)) throw new Error(`vfx-poison-v3: the approved cobra is copied from ${beastSrc}; it is missing`);
  const sprites = poisonV3Sprites();
  if (WALL_HOLES.length) throw new Error('vfx-poison-v3: see-through stone:\n  ' + WALL_HOLES.join('\n  '));
  if (MIST_FAULTS.length) throw new Error('vfx-poison-v3: straight-topped mist:\n  ' + MIST_FAULTS.join('\n  '));
  if (TOP_FAULTS.length) throw new Error('vfx-poison-v3: post tops change shape in the rise:\n  ' + TOP_FAULTS.join('\n  '));
  if (AURA_FAULTS.length) throw new Error('vfx-poison-v3: see-through aura:\n  ' + AURA_FAULTS.join('\n  '));
  if (BLAST_HOLES.length) throw new Error('vfx-poison-v3: see-through pockets in the blast:\n  ' + BLAST_HOLES.join('\n  '));
  if (LIGHT_FAULTS.length) throw new Error('vfx-poison-v3: holes in the blast light:\n  ' + LIGHT_FAULTS.join('\n  '));
  const bad = sprites.flatMap(borderCheck);
  if (bad.length) throw new Error('vfx-poison-v3: art on the frame border:\n  ' + bad.join('\n  '));
  for (const s of sprites)
    for (const [k, a] of Object.entries(s.anims)) {
      const rowW = a.frames.length * a.frames[0].w;
      if (rowW >= 8192) throw new Error(`vfx-poison-v3: ${s.name}.${k} row is ${rowW} px wide (limit 8192)`);
    }
  // Every file is written whole under a temp folder, then moved in: PNGs first, the manifest last.
  const tmpRoot = join(worldOut, '.vfx-poison-v3-tmp');
  rmSync(tmpRoot, { recursive: true, force: true });
  writeGroup(GROUP, sprites, tmpRoot);
  const tmpDir = join(tmpRoot, GROUP);
  copyFileSync(beastSrc, join(tmpDir, 'beast.png'));
  const ours = JSON.parse(readFileSync(join(tmpDir, 'manifest.json'), 'utf8'));
  const old = JSON.parse(readFileSync(oldManifest, 'utf8'));
  const all: Record<string, unknown> = { ...ours.sprites, beast: old.sprites.beast };
  const manifest = { group: GROUP, pxPerMeter: PX_PER_M, sprites: Object.fromEntries(ORDER.filter((n) => all[n]).map((n) => [n, all[n]])) };
  writeFileSync(join(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  const dest = join(worldOut, GROUP);
  mkdirSync(dest, { recursive: true });
  const files = readdirSync(tmpDir).sort((a, b) => Number(a === 'manifest.json') - Number(b === 'manifest.json') || (a < b ? -1 : a > b ? 1 : 0));
  for (const f of files) renameSync(join(tmpDir, f), join(dest, f));
  rmSync(tmpRoot, { recursive: true, force: true });
  for (const s of sprites) {
    const f0 = Object.values(s.anims)[0].frames[0];
    const anims = Object.entries(s.anims).map(([k, a]) => `${k}:${a.frames.length}@${a.fps}${a.loop === false ? ' once' : ''}`).join(' ');
    console.log(`${GROUP} ${s.name.padEnd(12)} ${f0.w}x${f0.h} anchor ${s.anchor} ${anims}`);
  }
  // POISON_LIGHT=1: each frame's light (mean alpha x brightness, per mille), for the flash check.
  if (process.env.POISON_LIGHT)
    for (const s of sprites)
      for (const [k, a] of Object.entries(s.anims)) {
        const e = a.frames.map((f) => {
          let sum = 0;
          for (let i = 0; i < f.px.length; i += 4) sum += (f.px[i + 3] / 255) * ((0.3 * f.px[i] + 0.59 * f.px[i + 1] + 0.11 * f.px[i + 2]) / 255);
          return (sum / (f.w * f.h)) * 1000;
        });
        const peak = Math.max(...e);
        const steps = e.map((v, i) => (i ? Math.abs(v - e[i - 1]) : a.loop !== false ? Math.abs(v - e[e.length - 1]) : 0));
        console.log(`light ${s.name.padEnd(12)} ${k.padEnd(5)} max step ${((Math.max(...steps) / peak) * 100).toFixed(1).padStart(5)} %  [${e.map((v) => v.toFixed(1)).join(' ')}]`);
      }
}

if (process.argv[1] && /vfx-poison-v3\.ts$/.test(process.argv[1])) main();
