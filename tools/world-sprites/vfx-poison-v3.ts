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
import { Canvas, Color, PX_PER_M, WorldSprite, hex, writeGroup } from './kit';
import { TAU, clamp, clearEdgeBits, fade, fract, pnoise, rnd, rr, smooth, vfxSprite } from './vfx-a-lib';
import * as B from './vfx-b-lib';
import { DPM, HGT, LEN, Orient, PPM, orientations, proj } from './vfx-b-wall3d';
import { PV3_PAL, PV3_REF, PV3_VEIL } from './vfx-poison-v3-refdata';

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

interface ChurnOpts { amp: number; ampY?: number; cell: number; seed: number; where?: (x: number, y: number) => number; flow?: [number, number] }
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
    const s = L.get(Math.round(x - dx), Math.round(y - dy));
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

/** Rows above y0 + n fade out in stepped alpha (his art ran off the top of his panel there). */
function fadeTop(c: Canvas, y0: number, n: number): Canvas {
  const out = c.clone();
  for (let y = 0; y < Math.min(c.h, y0 + n); y++) {
    const k = Math.round(clamp((y - y0 + 1) / (n + 1), 0, 1) * 6) / 6;
    for (let x = 0; x < c.w; x++) {
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
    const cx = K.ax + 0.5, cy = K.ay + 0.5, a = -t * TAU, ca = Math.cos(a), sa = Math.sin(a);
    const turned = remapSS(coil, (x, y) => {
      const dx = x - cx, dy = y - cy;
      return [cx + dx * ca - dy * sa, cy + dx * sa + dy * ca];
    });
    let m = main.clone();
    for (let k = 0; k < m.v.length; k++) if (coil.v[k]) m.v[k] = turned.v[k] || coil.v[k];
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
  const fr = range(FLY).map((i) => {
    const t = i / FLY;
    const m = churn(main, t, { amp: 1.4, cell: 5, seed });
    const ds = moveDrops(union(dashes, drops), (k) => {
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
  const plan = [
    { s: 0.66, reach: 17, d: 0.66, g: 0.5, thin: 0, cool: 0, a: 1 },
    { s: 0.8, reach: 26, d: 0.8, g: 0.7, thin: 0, cool: 0, a: 1 },
    { s: 0.92, reach: 35, d: 0.92, g: 0.87, thin: 0, cool: 0, a: 1 },
    { s: 1, reach: 99, d: 1, g: 1, thin: 0, cool: 0, a: 1 },
    { s: 1, reach: 99, d: 1.04, g: 1, thin: 0, cool: 0, a: 1 },
    { s: 1.02, reach: 99, d: 1.09, g: 1, thin: 0, cool: 0, a: 1 },
    { s: 1.04, reach: 99, d: 1.15, g: 0.88, thin: 0.12, cool: 0.3, a: 1 },
    { s: 1.06, reach: 99, d: 1.22, g: 0.74, thin: 0.22, cool: 0.7, a: 0.95 },
    { s: 1.08, reach: 99, d: 1.3, g: 0.6, thin: 0.31, cool: 1, a: 0.87 },
    { s: 1.1, reach: 99, d: 1.38, g: 0.46, thin: 0.38, cool: 1.4, a: 0.76 },
    { s: 1.12, reach: 99, d: 1.46, g: 0.32, thin: 0.42, cool: 1.8, a: 0.65 },
    { s: 1.14, reach: 99, d: 1.54, g: 0.18, thin: 0.49, cool: 2.2, a: 0.42 },
  ];
  const fr = plan.map((p, i) => {
    let m = scaled(main, p.s, p.s, K.ax, K.ay);
    if (p.reach < 99) m = cut(m, (x, y) => r(x, y) <= p.reach + 2 * pnoise(x, y, 3, 0, 0, seed));
    if (i >= 3 && i !== 3) m = churn(m, (i - 3) / 9, { amp: 1.2, cell: 5, seed });
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

/**
 * blast: his gushing pillar of slime over its bubbling pool, 16 frames. Frames 0-3 (anticipation):
 * the pool opens out of the ground and the pillar shoots up out of it (revealed from the ground
 * up, its front ragged), his light and his venom mist come up with it. Frame 4 is his picture,
 * held to frame 6 (the slime churns and the mist sways). Frames 7-15 (the settle): the pillar
 * falls back into the pool from the top down, the drops are thrown out and rain down, the mist
 * rises and thins, his light dims, the pool breaks up, cools down his ramps and fades.
 */
function blast(): WorldSprite {
  const K = key('blast'), seed = 7800;
  const col = K.part('main'), pool = K.part('pool'), mist = K.part('mist'), drops = K.part('drops'), light = K.part('glow');
  let top = K.h;
  for (let i = 0; i < col.v.length; i++) if (col.v[i]) top = Math.min(top, (i / K.w) | 0);
  const colH = K.ay - top;
  const PEAK = 4, HOLD = 6;
  /** How far above the anchor his pool's surface meets the pillar's foot (px). */
  const FOOT = 19;
  // pool: its spread; rise: the pillar's height (share of his); mist: how far his mist has come
  // up; light: his light's strength; poolCut: how much of the pool has broken up; a: opacity.
  const plan = [
    { pool: 0.52, rise: 0.25, mist: 0, light: 0.55, poolCut: 0, a: 1 },
    { pool: 0.67, rise: 0.45, mist: 0.3, light: 0.7, poolCut: 0, a: 1 },
    { pool: 0.8, rise: 0.65, mist: 0.58, light: 0.82, poolCut: 0, a: 1 },
    { pool: 0.91, rise: 0.84, mist: 0.82, light: 0.92, poolCut: 0, a: 1 },
    { pool: 1, rise: 1, mist: 1, light: 1, poolCut: 0, a: 1 },
    { pool: 1.01, rise: 1, mist: 1, light: 1, poolCut: 0, a: 1 },
    { pool: 1.02, rise: 1, mist: 1, light: 1, poolCut: 0, a: 1 },
    { pool: 1.03, rise: 0.9, mist: 1, light: 0.94, poolCut: 0.03, a: 1 },
    { pool: 1.04, rise: 0.78, mist: 1, light: 0.86, poolCut: 0.08, a: 1 },
    { pool: 1.05, rise: 0.65, mist: 1, light: 0.77, poolCut: 0.14, a: 0.97 },
    { pool: 1.06, rise: 0.52, mist: 1, light: 0.67, poolCut: 0.2, a: 0.93 },
    { pool: 1.07, rise: 0.4, mist: 1, light: 0.56, poolCut: 0.27, a: 0.87 },
    { pool: 1.08, rise: 0.29, mist: 1, light: 0.45, poolCut: 0.35, a: 0.79 },
    { pool: 1.09, rise: 0.19, mist: 1, light: 0.33, poolCut: 0.44, a: 0.68 },
    { pool: 1.1, rise: 0.1, mist: 1, light: 0.21, poolCut: 0.54, a: 0.54 },
    { pool: 1.11, rise: 0.03, mist: 1, light: 0.1, poolCut: 0.65, a: 0.38 },
  ];
  const fr = plan.map((p, i) => {
    const t = (i - PEAK) / 12;
    // The pool: spreads over the ground from the centre, bubbles churn, breaks up at the end.
    let pl = scaled(pool, p.pool, p.pool, K.ax, K.ay);
    if (i > PEAK) pl = churn(pl, t, { amp: 1.2, ampY: 0.6, cell: 6, seed });
    pl = cool(pl, (i - HOLD - 2) / 3, seed + 9);
    if (p.poolCut) pl = cut(pl, (x, y) => pnoise(x, y * 2, 7, 0, 0, seed + 1) * 0.65 + (Math.hypot((x - K.ax) / 95, (y - K.ay) / 30)) * 0.35 > p.poolCut, 4);
    // The pillar: revealed from the ground up while it shoots, cut from the top as it falls (its
    // foot stays in the pool).
    // (while the pool is still small its surface is lower: the pillar's foot sits down in it)
    let c = i < PEAK ? moved(col, 0, Math.round(FOOT * (1 - p.pool))) : col;
    if (i > PEAK) c = churn(c, t, { amp: 1.3, ampY: 2.2, cell: 7, seed: seed + 2, flow: [0, -1.4] });
    c = cool(c, (i - HOLD - 3) / 3, seed + 10);
    if (p.rise < 1) {
      const lim = K.ay - colH * p.rise;
      const wave = (x: number) => 3 * (pnoise(x, 0, 4, 0, 0, seed + 3 + i) - 0.5) * 2;
      c = cut(c, (x, y) => (i < PEAK ? y >= lim + wave(x) : y >= lim + wave(x) || y >= K.ay - 22 + Math.max(0, i - 12) * 4));
    }
    // His venom mist: comes up with the pillar, sways, then rises and thins away.
    let ms: Layer | null = null;
    if (p.mist > 0) {
      ms = i < PEAK ? cut(moved(mist, 0, (1 - p.mist) * 24), (x, y) => grain(x, y, seed + 4) < p.mist + 0.15, 2, false) : wobble(churn(mist, t, { amp: 1.4, cell: 6, seed: seed + 5 }), t, 1.3, 9, seed + 6);
      if (i > HOLD + 1) ms = cut(moved(ms, 0, -(i - HOLD - 1) * 1.5), (x, y) => grain(x, y, seed + 7) > (i - HOLD - 1) * 0.1, 2, false);
    }
    // The drops: below the pillar's front while it rises, then thrown out and raining down.
    const lim = K.ay - colH * p.rise - 4;
    const d = moveDrops(drops, (k, cx, cy) => {
      if (i < PEAK && cy < lim) return null;
      if (i > HOLD + 6 && rnd(seed + 8, k) < (i - HOLD - 6) * 0.25) return null;
      const dir = Math.sign(cx - K.ax) || 1;
      const u = Math.max(0, i - PEAK) / 3;
      return [dir * 1.2 * u, -1.5 * u + 0.9 * u * u];
    });
    // His light: spreads out with the pool from the pillar's foot as it comes up, then dims.
    const lt = scaled(glowMul(light, p.light), Math.min(1, p.pool), Math.min(1, p.pool), K.ax, K.ay);
    const out = fadeTop(stackC(K.w, K.h, lt, pl, c, ms, d), 3, 14);
    return p.a < 1 ? fade(out, p.a) : out;
  });
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
 * His framed slime barrier (straight or 3/4). `idle`: a soft light runs across his hexagon cells
 * (one ramp step up where it passes), the dripping slime on top churns and licks, the bubbles and
 * drops bob, his runes pulse. `rise`: the stone frame pushes up out of the ground (each column out
 * of its own foot) while the slime starts to fill it from the bottom up; the bubbling top and the
 * drops come up last, his light on the ground growing with it; the last frame is his picture (idle
 * frame 0).
 */
function wall(kind: 'wall' | 'wall_diag', label: string, seed: number): WorldSprite {
  const K = key(kind);
  const frame = K.part('frame'), slime = K.part('main'), drops = K.part('drops'), light = K.part('glow');
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
    const runes = tone(frame, (x, y) => {
      const v = frame.get(x, y);
      return FAM[v - 1] === 'green' ? Math.round(0.5 - 0.5 * Math.cos(t * TAU)) : 0;
    });
    const d = moveDrops(drops, (k) => {
      const ph = rr(seed + 2, k, 0, TAU);
      return bob(t, ph, 1.2);
    });
    return { s, runes, d };
  };
  const idle = range(IDLE).map((i) => {
    const { s, runes, d } = idleAt(i / IDLE);
    return stackC(K.w, K.h, light, runes, s, d);
  });
  // The rise: the frame pushes up out of the ground over frames 0-4 (each column out of its own
  // foot, by its own height); from frame 2 the slime fills it from the bottom at an even pace up
  // to frame 11 (its level climbing from the wall's ground line, fitted through the slime's feet),
  // the drops come up over 8-10 and his light on the ground grows evenly over frames 2-10, so
  // the wall's light climbs in even steps. Frame 11 is his picture.
  const fFoot = feet(frame), fTop = tops(frame);
  const raw = feet(slime);
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
  const ease = (u: number) => 1 - Math.pow(1 - clamp(u, 0, 1), 1.6);
  const rise = range(RISE).map((i) => {
    if (i === RISE - 1) return idle[0];
    const pf = ease((i + 1) / 5), ps = clamp((i - 1.5) / 9.5, 0, 1), pt = clamp((i - 7) / 3, 0, 1);
    const fr = pf >= 1 ? frame : remap(frame, (x, y) => (fFoot[x] < 0 || y > fFoot[x] ? null : [x, y - Math.round((1 - pf) * (fFoot[x] - fTop[x] + 2))]));
    let sl: Layer | null = null;
    if (ps > 0) {
      const { s } = idleAt(fract((i - (RISE - 1)) / IDLE));
      sl = cut(s, (x, y) => ground(x) - y <= ps * hMax + 2.5 * (pnoise(x, i * 3, 6, 0, 0, seed + 4) - 0.5) * 2, 4);
    }
    const d = pt > 0 ? cut(drops, (x, y) => grain(x, y, seed + 6) < pt, 0, false) : null;
    const lt = glowMul(light, clamp((i - 1) / 9, 0, 1));
    return stackC(K.w, K.h, lt, fr, sl, d);
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
 * churn); the odd frames lie halfway in time, their bubbles halfway in size. `rise` (12 at 12 fps):
 * the odd frames 1, 3 ... 11 are our old rise frames 0-5 pixel for pixel (heights 0.2, 0.45, 0.7,
 * 0.92, 1.02, 1); the even frames lie halfway in height and time and keep the drops of the old frame
 * before them (frame 0 boils up at height 0.1 with the first frame's drops). The last rise frame
 * runs into idle frame 0 as before.
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
  const rise = range(RISE).map((j) => {
    // Odd frames: our old frame f exactly. Even frames: halfway between old frames f - 1 and f.
    const f = Math.floor(j / 2);
    const odd = j % 2 === 1;
    const hk = odd ? HK[f] : f === 0 ? HK[0] / 2 : (HK[f - 1] + HK[f]) / 2;
    const t = odd ? f / 6 : fract((2 * f - 1) / 12);
    const df = odd || f === 0 ? f : f - 1; // whose drops
    const c = mist3d(o, hk, t);
    oDrops(c, orange(10).map((k) => {
      const q = at(4 + B.rnd(141, k, df) * 248, MIST_HALF * 0.6, 10 + B.rnd(142, k, df) * 90 * Math.min(1, hk));
      return [q[0], q[1], 1.6, 2] as [number, number, number, number];
    }));
    return c;
  });
  return vfxSprite('wall_depth', 'Poison wall (depth): mist curtain (ours, kept)', [o.ax, o.ay], { rise: { frames: rise, fps: 12, loop: false }, idle: { frames: idle, fps: 10, loop: true } });
}

// --- aura -----------------------------------------------------------------------------------------

/**
 * The tint his aura lays over the figure, as a soft field round the body (not the shape of any one
 * character, so it sits right on every figure): an ellipse centred 50 px above the feet, 46 x 110
 * px, his violet flame colour in the middle at the strength fitted on his figure, running to his
 * green flame light toward its rim and a little stronger there, gone at its edge, stepped. It
 * breathes with the frames (alpha +-12 %, size +-2 %), twice a loop.
 */
function veil(w: number, h: number, ax: number, ay: number, frame: number): Canvas {
  const c = new Canvas(w, h);
  const deep = hex(PV3_VEIL.deep), light = hex(PV3_VEIL.light);
  const ph = (frame / AURA) * TAU * 2;
  const breathe = 1 + 0.12 * Math.sin(ph), size = 1 + 0.02 * Math.sin(ph);
  const cx = ax, cy = ay - 50, rx = 23 * size, ry = 55 * size;
  const a0 = PV3_VEIL.alpha;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const r = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
      let a = (a0 + 0.1 * smooth(0.55, 0.95, r)) * (1 - smooth(0.92, 1.04, r)) * breathe;
      a = Math.round(a / 0.05) * 0.05;
      if (a <= 0.02) continue;
      const t = Math.round(smooth(0.45, 1, r) * 3) / 3;
      const ch = (k: number) => Math.round(deep[k] + (light[k] - deep[k]) * t);
      c.set(x, y, [ch(0), ch(1), ch(2), Math.round(Math.min(1, a) * 255)]);
    }
  return c;
}

/**
 * His aura in two frame-synchronized layers with the same size and anchor (the feet): `aura_back`
 * goes BEHIND the character (his violet flames rising all round the figure, the green flame
 * strands, the motes and the far half of his pool); `aura` goes OVER it (his tint over the figure
 * and the near half of his pool). The flames lick upward (a rising warp that comes round), the
 * motes drift up, the pool shimmers and the tint breathes.
 */
function aura(): WorldSprite[] {
  const KB = key('aura_back'), KF = key('aura'), seed = 7900;
  const bm = KB.part('main'), bd = KB.part('drops'), bg = KB.part('glow');
  const fm = KF.part('main');
  const back: Canvas[] = [], front: Canvas[] = [];
  for (let i = 0; i < AURA; i++) {
    const t = i / AURA;
    const up = (y: number) => 0.35 + 0.65 * smooth(KB.ay - 4, KB.ay - 80, y);
    const b = wobble(churn(bm, t, { amp: 1.3, ampY: 2.4, cell: 7, seed, flow: [0, -1.3], where: (_x, y) => up(y) }), t, 1.2, 10, seed + 1, (_x, y) => up(y));
    const d = moveDrops(bd, (k) => {
      const u = drift(t, rr(seed + 2, k, 0, 1));
      return [Math.sin(u * TAU + k) * 1 - Math.sin(k), -6 * u];
    });
    back.push(stackC(KB.w, KB.h, bg, b, d));
    const f = shimmer(fm, t, { period: 30, dir: [1, 0], width: 0.2 });
    front.push(stackC(KF.w, KF.h, veil(KF.w, KF.h, KF.ax, KF.ay, i), f));
  }
  return [
    vfxSprite('aura', 'Poison aura, front layer (draw OVER the character): venom tint and the near pool', [KF.ax, KF.ay], { idle: { frames: front, fps: AURA_FPS, loop: true } }),
    vfxSprite('aura_back', 'Poison aura, back layer (draw BEHIND the character): violet flames and green light', [KB.ax, KB.ay], { idle: { frames: back, fps: AURA_FPS, loop: true } }),
  ];
}

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

function main(): void {
  // Staging only: refuse to run without WORLD_OUT, so nothing is ever written into src/assets.
  const worldOut = process.env.WORLD_OUT;
  if (!worldOut) throw new Error('vfx-poison-v3: set WORLD_OUT to the staging folder (this generator never writes into src/assets)');
  const beastSrc = join(worldOut, 'vfx_poison', 'beast.png');
  const oldManifest = join(worldOut, 'vfx_poison', 'manifest.json');
  if (!existsSync(beastSrc) || !existsSync(oldManifest)) throw new Error(`vfx-poison-v3: the approved cobra is copied from ${beastSrc}; it is missing`);
  const sprites = poisonV3Sprites();
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
