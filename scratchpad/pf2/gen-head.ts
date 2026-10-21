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
 * His light read straight from his pixels (the blast's green light): one colour and a full 8-bit
 * alpha per pixel of the frame, so it has no steps or rings and dims or spreads smoothly.
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
    const sx = Math.round(x - dx), sy = Math.round(y - dy);
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
 * rows, full alpha precision) along a ragged line (each column's start moved by up to +-3 px; row 0
 * stays clear for y0 >= 5), so
 * the pillar and the mist round it end softly with no stripes and no straight edge.
 */
function fadeTop(c: Canvas, y0: number, n: number, seed: number): Canvas {
  const out = c.clone();
  for (let x = 0; x < c.w; x++) {
    const o = 2.2 * (2 * pnoise(x, 0, 5, 0, 0, seed) - 1) + 0.8 * (2 * pnoise(x, 0, 2, 0, 0, seed + 1) - 1);
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

/** slash: his green crescent with its bone-white fang edges. The slime churns along the blade, the spatter streams back. */
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
    const m = churn(main, t, { amp: 0.75, cell: 5, seed, movable, part });
    // (the spatter streams back; a bit that touches a crescent is part of its edge and stays)
    const ds = moveDrops(spatter, (k, cx, cy) => {
      if (fixedAt.has(Math.round(cy) * K.w + Math.round(cx))) return [0, 0];
      const u = drift(t, rr(seed + 1, k, 0, 1));
      return [-4 * u, 0];
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
 * his picture and it holds there for 3 frames (only churning), then it slowly breaks up from the
 * core outward into flying drops that fall, cool down his ramps and fade over 6 frames. His violet
 * streaks fly out and thin away.
 */
function hit(): WorldSprite {
  const K = key('hit'), seed = 7700;
  const main = K.part('main'), drops = K.part('drops'), glow = K.part('glow'), streaks = K.part('streaks');
  const r = (x: number, y: number) => Math.hypot(x - K.ax, y - K.ay);
  // s: scale; reach: radius shown while it builds; d: spread of drops and streaks; g: his light's
  // strength; thin: how much has broken up; cool: ramp steps down (gradual); a: opacity at the end.
  // churn: how far his slime churns (px; 0 = still): the hold barely moves, so his picture and his
  // cell grid stay through frame 6 and only break up from frame 7.
  const plan = [
    { s: 0.68, reach: 19, d: 0.68, g: 0.55, thin: 0, cool: 0, a: 1, churn: 0 },
    { s: 0.81, reach: 27, d: 0.81, g: 0.72, thin: 0, cool: 0, a: 1, churn: 0 },
    { s: 0.92, reach: 35, d: 0.92, g: 0.87, thin: 0, cool: 0, a: 1, churn: 0 },
    { s: 1, reach: 99, d: 1, g: 1, thin: 0, cool: 0, a: 1, churn: 0 },
    { s: 1, reach: 99, d: 1.02, g: 1, thin: 0, cool: 0, a: 1, churn: 0.3 },
    { s: 1, reach: 99, d: 1.04, g: 0.98, thin: 0, cool: 0, a: 1, churn: 0.32 },
    { s: 1, reach: 99, d: 1.1, g: 0.88, thin: 0, cool: 0, a: 1, churn: 0.34 },
    { s: 1.03, reach: 99, d: 1.17, g: 0.75, thin: 0.14, cool: 0.6, a: 0.96, churn: 1 },
    { s: 1.05, reach: 99, d: 1.25, g: 0.61, thin: 0.25, cool: 1, a: 0.88, churn: 1.2 },
    { s: 1.08, reach: 99, d: 1.34, g: 0.47, thin: 0.34, cool: 1.4, a: 0.77, churn: 1.2 },
    { s: 1.1, reach: 99, d: 1.43, g: 0.33, thin: 0.41, cool: 1.8, a: 0.67, churn: 1.2 },
    { s: 1.12, reach: 99, d: 1.52, g: 0.19, thin: 0.48, cool: 2.2, a: 0.48, churn: 1.2 },
  ];
  const fr = plan.map((p, i) => {
    let m = scaled(main, p.s, p.s, K.ax, K.ay);
    if (p.reach < 99) m = cut(m, (x, y) => r(x, y) <= p.reach + 2 * pnoise(x, y, 3, 0, 0, seed));
    if (p.churn > 0) m = churn(m, (i - 3) / 9, { amp: p.churn, cell: 5, seed });
    if (p.thin > 0) m = cut(m, (x, y) => grain(x, y, seed + 7) * 0.4 + Math.min(1, r(x, y) / 30) * 0.6 > p.thin, 4);
    m = cool(m, p.cool, seed + 11);
    const spread = (L: Layer, fall: boolean) => moveDrops(L, (k, cx, cy) => {
      if (i >= 10 && rnd(seed + 8, k) < (i - 9) * 0.3) return null;
      const f = fall ? Math.max(0, i - 5) ** 2 * 0.15 : 0;
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

