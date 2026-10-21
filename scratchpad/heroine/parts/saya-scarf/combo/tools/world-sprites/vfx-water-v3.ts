// Water jutsu VFX, third pass: the whole set rebuilt from the owner's paint-over of our water sheet
// (docs/reference/water-set-owner-reference.jpg), copied as exactly as possible.
//
//   WORLD_OUT=<art2>/staging npx tsx tools/world-sprites/vfx-water-v3.ts
//
// writes the group `vfx_water_v3` under <WORLD_OUT>/vfx_water_v3/ (staging only: it refuses to run
// without WORLD_OUT, so it never writes into src/assets).
//
// Every key frame is HIS picture: tools/refs/water-from-ref.py cuts his panels to game scale (his
// pixels, his palette, his rims as a clean 1 px navy outline, his haze kept semi-transparent) and
// writes them to vfx-water-v3-refdata.ts as pieces (main body, droplets, glow, and named parts).
// This file only animates them, deriving every other frame from the key frame, so the peak frame
// of each animation is his picture:
//   - loops start on his picture and churn the water inside its own silhouette (a displacement
//     that runs round a small circle and comes back, so frame 0 is exact and the loop is seamless);
//   - droplets drift, fall or orbit as whole pieces;
//   - the stream tile scrolls (it still tiles) and flows into his crest head;
//   - the hit, the blast and the walls' rise grow or reveal into his picture, then break up and fade.
// Same sprite names and anims as vfx_water, with more frames at a slower pace (the owner found the
// jutsu too fast; see FLY below); frames are sized to his art and the anchors moved with it
// (projectile core, breath origin + 48, ground centre, feet). The aura is
// split in two layers, `aura_back` (behind the character) and `aura` (over it: the water the figure
// is seen through, as in his picture). The water beast is out of scope: the approved dragon stays,
// and beast.png is copied through from vfx_water unchanged.
// Deterministic: no Math.random.

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Canvas, Color, PX_PER_M, WorldSprite, hex, writeGroup } from './kit';
import { TAU, clamp, clearEdgeBits, fade, fract, pnoise, rnd, rr, smooth, vfxSprite } from './vfx-a-lib';
import { WV3_PAL, WV3_REF, WV3_VEIL } from './vfx-water-v3-refdata';

// --- his palette and key frames ----------------------------------------------------------------

type Kind = 'body' | 'outline' | 'glow';
const PAL: Color[] = WV3_PAL.map((p) => hex(p.rgba.slice(0, 7), parseInt(p.rgba.slice(7, 9), 16)));
const KIND: Kind[] = WV3_PAL.map((p) => p.kind);
/** Index value (palette index + 1) of his rim colour. */
const RIM = KIND.indexOf('outline') + 1;
/** The glow entries: colour c at alpha step a is GLOW0 + c * ALPHA_STEPS + a. */
const GLOW0 = KIND.indexOf('glow') + 1;
const ALPHA_STEPS = (() => {
  const first = WV3_PAL[GLOW0 - 1].rgba.slice(0, 7);
  let n = 0;
  while (WV3_PAL[GLOW0 - 1 + n]?.rgba.slice(0, 7) === first) n++;
  return n;
})();

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
  any(): boolean {
    return this.v.some((x) => x > 0);
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
  const r = WV3_REF[name];
  if (!r) throw new Error(`vfx-water-v3: no reference key frame "${name}"`);
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

/** Layers top over bottom: a later layer wins where it is drawn, except that haze never covers water. */
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
 * His water churning inside its own silhouette: every water pixel takes the colour of the water a
 * little way off (the rims and the silhouette stay where they are, so the outline stays clean).
 * `flow` adds a drift along a direction (it also runs round and comes back).
 */
function churn(L: Layer, t: number, o: ChurnOpts): Layer {
  if (t === 0) return L.clone();
  const out = L.clone();
  const ay = o.ampY ?? o.amp;
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const v = L.v[y * L.w + x];
    if (!v || KIND[v - 1] !== 'body') continue;
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
    if (s && KIND[s - 1] === 'body') out.v[y * L.w + x] = s;
  }
  return out;
}

/** The whole drawing (silhouette included) swayed a little: crests and spray lick and settle. */
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
 * Keeps only the pixels keep(x, y) picks; where water was cut, the new edge gets his rim (so a
 * rising or breaking body keeps a clean outline). Tiny crumbs left floating are dropped.
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
    const v = out.v[i];
    if (!v || KIND[v - 1] !== 'body') continue;
    if ((x > 0 && gone[i - 1]) || (x < L.w - 1 && gone[i + 1]) || (y > 0 && gone[i - L.w]) || (y < L.h - 1 && gone[i + L.w])) out.v[i] = RIM;
  }
  // (and bits that are mostly rim: a broken edge, not water)
  for (const pc of pieces(out)) if (pc.length <= minPiece || pc.filter((i) => KIND[out.v[i] - 1] === 'body').length < pc.length * 0.4) for (const i of pc) out.v[i] = 0;
  return out;
}

/** His haze faded: each glow pixel steps down `steps` alpha levels (and goes below the first). */
function dimGlow(L: Layer, steps: number): Layer {
  const out = L.clone();
  for (let i = 0; i < out.v.length; i++) {
    const v = out.v[i];
    if (!v || KIND[v - 1] !== 'glow') continue;
    const a = (v - GLOW0) % ALPHA_STEPS, c = Math.floor((v - GLOW0) / ALPHA_STEPS);
    out.v[i] = a - steps < 0 ? 0 : GLOW0 + c * ALPHA_STEPS + a - steps;
  }
  return out;
}

/** A thinning noise key in [0, 1) (for breaking water up into spray as it fades). */
const grain = (x: number, y: number, seed: number) => pnoise(x, y, 3, 0, 0, seed) * 0.6 + pnoise(x, y, 1.5, 0, 0, seed + 1) * 0.4;

/**
 * A soft glow of the effect's own light, in banded alpha steps (pixel-art bands, no gradient
 * mush): alpha(x, y) in 0..1 times `peak`.
 */
function glowLight(w: number, h: number, col: Color, peak: number, alpha: (x: number, y: number) => number): Canvas {
  const c = new Canvas(w, h);
  const steps = [0.18, 0.4, 0.66, 1];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const a = alpha(x, y) * smooth(1, 5, Math.min(x, y, w - 1 - x, h - 1 - y));
    if (a < 0.1) continue;
    const q = steps.find((s) => a <= s) ?? 1;
    c.set(x, y, [col[0], col[1], col[2], Math.round(peak * q * 255)]);
  }
  return c;
}
/** His teal light: his glow round his characters, (28, 83, 86) on his panel (32, 33, 43), un-blended: 22 % of this colour. */
const TEAL: Color = [32, 250, 230, 255];

const stackC = (w: number, h: number, ...cs: (Canvas | Layer | null)[]): Canvas => {
  const out = new Canvas(w, h);
  for (const c of cs) if (c) out.draw(c instanceof Layer ? c.render() : c, 0, 0);
  return out;
};

/**
 * Frame counts (the owner asked for slower, smoother jutsu: more frames, small steps between them).
 * Flying loops: 8 frames at 10 fps. Hit: 12 at 12. Blast: 16 at 12. Wall rise: 12 at 12, idle: 8 at
 * 10. Aura: 12 at 10. His picture stays the key frame of each.
 */
const FLY = 8, FLY_FPS = 10, AURA = 12;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Drift that starts at 0 and wraps (a droplet leaving is replaced by one arriving). */
const drift = (t: number, ph: number) => fract(ph + t) - ph;

// --- projectiles -------------------------------------------------------------------------------------

/** bolt: his orb with its swirling tail. The swirl in the orb turns, the tail churns, droplets stream back. */
function bolt(): WorldSprite {
  const K = key('bolt'), seed = 5100;
  const main = K.part('main'), drops = K.part('drops');
  const fr = range(FLY).map((i) => {
    const t = i / FLY;
    // The orb's inner swirl turns a quarter each frame (a vortex: full turn at the centre, none at its rim).
    const R = 10;
    let m = remap(main, (x, y) => {
      const dx = x - K.ax, dy = y - K.ay, r = Math.hypot(dx, dy);
      if (r >= R || KIND[main.get(x, y) - 1] !== 'body') return [x, y];
      const a = -t * TAU * Math.pow(1 - r / R, 1.4);
      const sx = K.ax + dx * Math.cos(a) - dy * Math.sin(a), sy = K.ay + dx * Math.sin(a) + dy * Math.cos(a);
      return KIND[main.get(Math.round(sx), Math.round(sy)) - 1] === 'body' ? [sx, sy] : [x, y];
    });
    // The tail's streaks stream back: each row slides along itself (so the thin streaks stay
    // whole), more toward the tail's end; the water near the orb churns a little.
    m = remap(m, (x, y) => {
      const w = smooth(K.ax - 10, K.ax - 30, x);
      const ph = y * 0.45 + pnoise(0, y, 4, 0, 0, seed + 3) * 3;
      return [x + Math.round(2.2 * w * (Math.sin(t * TAU + ph) - Math.sin(ph))), y];
    });
    m = churn(m, t, { amp: 1.2, ampY: 0.6, cell: 8, seed, where: (x) => smooth(K.ax - 4, K.ax - 14, x) * (1 - smooth(K.ax - 14, K.ax - 24, x)) });
    const d = moveDrops(drops, (k) => {
      const u = drift(t, rr(seed + 2, k, 0, 1));
      return [-9 * u, 2.5 * u * u + 1.5 * u];
    });
    return stackC(K.w, K.h, m, d);
  });
  return vfxSprite('bolt', 'Water bolt (orb with a swirling tail)', [K.ax, K.ay], { fly: { frames: fr, fps: FLY_FPS, loop: true } });
}

/** breath: his fan of jets. The jets churn outward from a still origin; spray flies on and falls. */
function breath(): WorldSprite {
  const K = key('breath'), seed = 5200;
  const ox = K.ax, oy = K.ay; // his cone's tip (the caster's mouth)
  const main = K.part('main'), drops = K.part('drops');
  const fr = range(FLY).map((i) => {
    const t = i / FLY;
    const reach = (x: number) => smooth(ox + 4, ox + 34, x);
    let m = churn(main, t, { amp: 2.4, ampY: 1.4, cell: 6, seed, where: reach, flow: [2, 0] });
    m = wobble(m, t, 1, 10, seed + 1, (x) => smooth(ox + 30, ox + 80, x));
    const d = moveDrops(drops, (k, cx, cy) => {
      const u = drift(t, rr(seed + 2, k, 0, 1));
      const a = Math.atan2(cy - oy, cx - ox);
      return [Math.cos(a) * 8 * u, Math.sin(a) * 8 * u + 3 * u * u];
    });
    return stackC(K.w, K.h, m, d);
  });
  // The anchor is 48 px right of the origin on its row, as before.
  return vfxSprite('breath', 'Water breath (fan of jets, origin 48 px left of the anchor)', [ox + 48, oy], { fly: { frames: fr, fps: FLY_FPS, loop: true } });
}

/** sphere: his glossy bubble. The water inside and the swirl round it churn; droplets orbit. */
function sphere(): WorldSprite {
  const K = key('sphere'), seed = 5300;
  const main = K.part('main'), drops = K.part('drops');
  const fr = range(FLY).map((i) => {
    const t = i / FLY;
    const r = (x: number, y: number) => Math.hypot(x - K.ax, y - K.ay);
    let m = churn(main, t, { amp: 1.3, cell: 8, seed, where: (x, y) => 0.5 + 0.5 * smooth(17, 21, r(x, y)) });
    m = wobble(m, t, 0.7, 14, seed + 1, (x, y) => smooth(19, 24, r(x, y)));
    const d = moveDrops(drops, (k, cx, cy) => {
      const a = 0.22 * Math.sin(t * TAU + rr(seed + 2, k, 0, TAU)) - 0.22 * Math.sin(rr(seed + 2, k, 0, TAU));
      const dx = cx - K.ax, dy = cy - K.ay;
      return [dx * Math.cos(a) - dy * Math.sin(a) - dx, dx * Math.sin(a) + dy * Math.cos(a) - dy];
    });
    return stackC(K.w, K.h, m, d);
  });
  return vfxSprite('sphere', 'Water sphere (glossy bubble with a swirl)', [K.ax, K.ay], { fly: { frames: fr, fps: FLY_FPS, loop: true } });
}

/** slash: his crescent. Its water runs along the blade and its tips lick. */
function slash(): WorldSprite {
  const K = key('slash'), seed = 5400;
  const main = K.part('main'), drops = K.part('drops');
  const fr = range(FLY).map((i) => {
    const t = i / FLY;
    let m = churn(main, t, { amp: 1.8, cell: 5, seed });
    m = wobble(m, t, 0.9, 9, seed + 1);
    const d = moveDrops(drops, (k) => {
      const u = drift(t, rr(seed + 2, k, 0, 1));
      return [-6 * u, 2 * u];
    });
    return stackC(K.w, K.h, m, d);
  });
  return vfxSprite('slash', 'Water slash (crescent of water)', [K.ax, K.ay], { fly: { frames: fr, fps: FLY_FPS, loop: true } });
}

/** multi: his water blades in a fan. Each blade bobs on its own beat, churns, and its pale trail flickers. */
function multi(): WorldSprite {
  const K = key('multi'), seed = 5500;
  const main = K.part('main'), glow = K.part('glow'), drops = K.part('drops');
  const blades = pieces(main);
  const fr = range(FLY).map((i) => {
    const t = i / FLY;
    const m = main.empty();
    blades.forEach((pc, k) => {
      const ph = rr(seed, k, 0, TAU);
      const dy = Math.round(1.3 * Math.sin(t * TAU + ph)) - Math.round(1.3 * Math.sin(ph));
      const dx = Math.round(1 * Math.sin(t * TAU * 2 + ph)) - Math.round(1 * Math.sin(ph));
      for (const j of pc) m.set((j % m.w) + dx, ((j / m.w) | 0) + dy, main.v[j]);
    });
    const mm = churn(m, t, { amp: 1.4, ampY: 0.8, cell: 5, seed: seed + 1, flow: [-1, 0] });
    // The trails stream back a pixel and breathe (two frames on, two off).
    const g = Math.floor(i / 2) % 2 ? dimGlow(moved(glow, -1, 0), 1) : glow;
    const d = moveDrops(drops, (k) => [-4 * drift(t, rr(seed + 2, k, 0, 1)), 0]);
    return stackC(K.w, K.h, g, mm, d);
  });
  return vfxSprite('multi', 'Water multi (water blades in a fan)', [K.ax, K.ay], { fly: { frames: fr, fps: FLY_FPS, loop: true } });
}

// --- stream ---------------------------------------------------------------------------------------

/** The stream tile scrolled by s px (content moves right; it wraps, so it still tiles). */
const scrolled = (T: Layer, s: number): Layer => remap(T, (x, y) => [(((x - s) % 64) + 64) % 64, y]);

/**
 * stream: his jet, 64 px, scrolling 8 px a frame along the line. stream_head: his crest. On frame
 * 0 the head is his crest as he drew it (the tile ends where his head begins, so the joint is his
 * picture); on later frames the scrolled jet flows into the crest up to a seam cut where the two
 * match best, and the crest churns and throws its spray.
 */
function stream(): WorldSprite[] {
  const KT = key('stream'), KH = key('stream_head'), seed = 5600;
  const T = union(KT.part('main'), KT.part('drops'));
  const step = 64 / FLY;
  const tile = range(FLY).map((i) => scrolled(T, step * i).render());
  const hm = KH.part('main'), hd = KH.part('drops');
  const off = KH.ay - KT.ay; // the head's rows above the tile's
  const head = range(FLY).map((i) => {
    const t = i / FLY;
    if (i === 0) return stackC(KH.w, KH.h, hm, hd);
    const crest = wobble(churn(hm, t, { amp: 2, cell: 6, seed, where: (x) => smooth(14, 30, x), flow: [1.5, 0] }), t, 1, 8, seed + 1, (x) => smooth(24, 44, x));
    const jet = remap(scrolled(T, step * i), (x, y) => (x < 64 ? [x, y - off] : null));
    // Per row, the seam (between columns 2 and 24) where the jet and the crest differ least,
    // moving at most 1 px from row to row.
    const lo = 2, hi = 24, n = hi - lo + 1;
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
    const d = moveDrops(hd, (q, cx, cy) => {
      const u = drift(t, rr(seed + 2, q, 0, 1));
      const a = Math.atan2(cy - KH.ay, cx - 30);
      return [Math.cos(a) * 6 * u + 2 * u, Math.sin(a) * 5 * u + 3 * u * u];
    });
    return stackC(KH.w, KH.h, m, d);
  });
  return [
    vfxSprite('stream', 'Water stream (rushing jet, tileable 64 px)', [32, 32], { fly: { frames: tile, fps: FLY_FPS, loop: true } }),
    vfxSprite('stream_head', 'Water stream head (crested wave)', [KH.ax, KH.ay], { fly: { frames: head, fps: FLY_FPS, loop: true } }),
  ];
}

// --- hit and blast -------------------------------------------------------------------------------------

/**
 * Darkens his water by `steps` shades of his own palette (the body colours are sorted by
 * brightness), as a splash loses its light while it falls apart.
 */
function cool(L: Layer, steps: number): Layer {
  if (steps <= 0) return L;
  const out = L.clone();
  for (let i = 0; i < out.v.length; i++) {
    const v = out.v[i];
    if (v && KIND[v - 1] === 'body') out.v[i] = Math.max(1, v - steps);
  }
  return out;
}

/**
 * hit: his star-burst splash, 12 frames. It builds out of a small core over 3 frames, frame 4 is his
 * picture and it holds there for 3 frames (only churning), then it slowly empties from the core
 * outward into flying fragments and droplets that fall, darken and fade over 6 frames.
 */
function hit(): WorldSprite {
  const K = key('hit'), seed = 5700;
  const main = K.part('main'), drops = K.part('drops'), glow = K.part('glow');
  const r = (x: number, y: number) => Math.hypot(x - K.ax, y - K.ay);
  // s: scale; reach: radius shown while it builds; d: droplet spread; g: glow steps down;
  // thin: how much has emptied; cool: shades darker; a: opacity at the very end.
  const plan = [
    { s: 0.45, reach: 11, d: 0.45, g: 3, thin: 0, cool: 0, a: 1 },
    { s: 0.68, reach: 22, d: 0.68, g: 2, thin: 0, cool: 0, a: 1 },
    { s: 0.87, reach: 34, d: 0.87, g: 1, thin: 0, cool: 0, a: 1 },
    { s: 1, reach: 99, d: 1, g: 0, thin: 0, cool: 0, a: 1 },
    { s: 1.02, reach: 99, d: 1.05, g: 0, thin: 0, cool: 0, a: 1 },
    { s: 1.04, reach: 99, d: 1.1, g: 0, thin: 0, cool: 0, a: 1 },
    { s: 1.06, reach: 99, d: 1.17, g: 1, thin: 0.2, cool: 0, a: 1 },
    { s: 1.09, reach: 99, d: 1.25, g: 1, thin: 0.31, cool: 1, a: 1 },
    { s: 1.12, reach: 99, d: 1.34, g: 2, thin: 0.42, cool: 1, a: 1 },
    { s: 1.15, reach: 99, d: 1.43, g: 3, thin: 0.51, cool: 2, a: 0.94 },
    { s: 1.18, reach: 99, d: 1.52, g: 4, thin: 0.6, cool: 2, a: 0.82 },
    { s: 1.21, reach: 99, d: 1.62, g: 9, thin: 0.69, cool: 3, a: 0.62 },
  ];
  const fr = plan.map((p, i) => {
    let m = scaled(main, p.s, p.s, K.ax, K.ay);
    if (p.reach < 99) m = cut(m, (x, y) => r(x, y) <= p.reach + 2 * pnoise(x, y, 3, 0, 0, seed));
    if (i >= 3) m = churn(m, (i - 3) / 8, { amp: 1.4, cell: 5, seed });
    if (p.thin > 0) {
      // The splash empties from its core outward: its spikes fly on as loose fragments.
      m = cut(m, (x, y) => grain(x, y, seed + 7) * 0.4 + Math.min(1, r(x, y) / 34) * 0.6 > p.thin, 5);
    }
    m = cool(m, p.cool);
    const d = cool(moveDrops(drops, (k, cx, cy) => {
      if (i >= 10 && rnd(seed + 8, k) < (i - 9) * 0.3) return null;
      const fall = Math.max(0, i - 4) ** 2 * 0.2;
      return [(cx - K.ax) * (p.d - 1), (cy - K.ay) * (p.d - 1) + fall];
    }), p.cool);
    const g = p.g < 9 ? scaled(dimGlow(glow, p.g), Math.min(1, p.s), Math.min(1, p.s), K.ax, K.ay) : null;
    const c = stackC(K.w, K.h, g, m, i === 0 ? null : d);
    return p.a < 1 ? fade(c, p.a) : c;
  });
  return vfxSprite('hit', 'Water hit (star-burst splash)', [K.ax, K.ay], { hit: { frames: fr, fps: 12, loop: false } });
}

/**
 * blast: his geyser, 16 frames. The pool's ripples spread and the column shoots up out of it
 * (frames 1-4), frame 5 is his picture and it holds there for 3 frames (churning), then the crown
 * breaks into falling spray, the column drops back into the pool from the top down, and the ripples
 * spread, break up and fade (frames 8-16). His soft teal light glows round it and fades with it.
 */
function blast(): WorldSprite {
  const K = key('blast'), seed = 5800;
  const col = K.part('main'), crown = K.part('crown'), pool = K.part('pool'), drops = K.part('drops');
  // The column's extent, for revealing it from the ground up and dropping it from the top down.
  let top = K.h, crownBottom = 0;
  for (let i = 0; i < col.v.length; i++) if (col.v[i]) top = Math.min(top, (i / K.w) | 0);
  for (let i = 0; i < crown.v.length; i++) if (crown.v[i]) crownBottom = Math.max(crownBottom, (i / K.w) | 0);
  const colH = K.ay - top;
  const plan = [
    { pool: 0.4, rise: 0.14, crown: 0, fall: 0, light: 0.25, poolCut: 0, a: 1 },
    { pool: 0.6, rise: 0.36, crown: 0, fall: 0, light: 0.45, poolCut: 0, a: 1 },
    { pool: 0.78, rise: 0.6, crown: 0.3, fall: 0, light: 0.66, poolCut: 0, a: 1 },
    { pool: 0.92, rise: 0.84, crown: 0.7, fall: 0, light: 0.86, poolCut: 0, a: 1 },
    { pool: 1, rise: 1, crown: 1, fall: 0, light: 1, poolCut: 0, a: 1 },
    { pool: 1.01, rise: 1, crown: 1, fall: 0, light: 1, poolCut: 0, a: 1 },
    { pool: 1.02, rise: 1, crown: 1, fall: 0, light: 1, poolCut: 0, a: 1 },
    { pool: 1.04, rise: 0.92, crown: 1, fall: 0.4, light: 0.95, poolCut: 0, a: 1 },
    { pool: 1.06, rise: 0.8, crown: 1, fall: 0.9, light: 0.85, poolCut: 0.08, a: 1 },
    { pool: 1.08, rise: 0.66, crown: 1, fall: 1.4, light: 0.72, poolCut: 0.18, a: 1 },
    { pool: 1.1, rise: 0.52, crown: 1, fall: 1.9, light: 0.6, poolCut: 0.28, a: 1 },
    { pool: 1.12, rise: 0.38, crown: 1, fall: 2.4, light: 0.48, poolCut: 0.38, a: 1 },
    { pool: 1.14, rise: 0.25, crown: 1, fall: 2.9, light: 0.36, poolCut: 0.5, a: 1 },
    { pool: 1.16, rise: 0.14, crown: 0, fall: 0, light: 0.25, poolCut: 0.62, a: 0.95 },
    { pool: 1.18, rise: 0.05, crown: 0, fall: 0, light: 0.15, poolCut: 0.74, a: 0.8 },
    { pool: 1.2, rise: 0, crown: 0, fall: 0, light: 0.06, poolCut: 0.85, a: 0.55 },
  ];
  const PEAK = 4;
  const fr = plan.map((p, i) => {
    const t = (i - PEAK) / 8;
    // The pool: his ripples, spreading over the ground from the centre, then fading out.
    let pl = scaled(pool, p.pool, p.pool, K.ax, K.ay);
    if (i > PEAK) pl = churn(pl, t, { amp: 1.3, ampY: 0.6, cell: 7, seed });
    if (p.poolCut) pl = cut(pl, (x, y) => pnoise(x, y * 2, 7, 0, 0, seed + 1) * 0.7 + (Math.abs(x - K.ax) / 90) * 0.3 > p.poolCut, 4);
    // The column: revealed from the ground up while it shoots up, dropped from the top as it falls.
    let c = col;
    if (i > PEAK) c = churn(c, t, { amp: 1.6, ampY: 2.4, cell: 7, seed: seed + 2, flow: [0, -1.5] });
    if (p.rise < 1) {
      const lim = K.ay - colH * p.rise;
      c = p.rise > 0 ? cut(c, (x, y) => y >= lim + 3 * (pnoise(x, 0, 4, 0, 0, seed + 3 + i) - 0.5) * 2) : c.empty();
    }
    // The crown: grows out of the column's top, then breaks up and falls.
    let cr: Layer | null = null;
    if (p.crown > 0) {
      cr = p.crown < 1 ? moved(scaled(crown, p.crown, p.crown, K.ax, crownBottom), 0, colH * (1 - p.rise)) : crown;
      if (i > PEAK) cr = wobble(churn(cr, t, { amp: 1.5, cell: 5, seed: seed + 4 }), t, 1.2, 8, seed + 5);
      if (p.fall) cr = cut(moved(scaled(cr, 1 + 0.12 * p.fall, 1, K.ax, crownBottom), 0, 7 * p.fall + 2 * p.fall * p.fall), (x, y) => grain(x, y, seed + 6) > 0.18 + 0.27 * p.fall);
    }
    // The spray: thrown up and out, then falling (only drops below the column's top while it
    // rises); it thins out at the end.
    const lim = K.ay - colH * p.rise - 4;
    const d = moveDrops(drops, (k, cx, cy) => {
      if (i < PEAK && cy < lim) return null;
      if (i > 12 && rnd(seed + 7, k) < (i - 12) * 0.28) return null;
      const dir = Math.sign(cx - K.ax) || 1;
      const u = Math.max(0, i - PEAK) / 2.75;
      return [dir * 1.4 * u, -2 * u + 1.1 * u * u];
    });
    // His teal light round the geyser.
    const light = glowLight(K.w, K.h, TEAL, 0.16 * p.light, (x, y) => {
      const e = Math.hypot((x - K.ax) / (70 * Math.max(0.5, p.pool)), (y - (K.ay - 30)) / 50);
      return clamp(1.15 - e, 0, 1) * clamp(p.light * 1.2, 0, 1);
    });
    const out = stackC(K.w, K.h, light, pl, c, cr, d);
    return p.a < 1 ? fade(out, p.a) : out;
  });
  return vfxSprite('blast', 'Water blast (geyser bursting from a splash pool, 3 m)', [K.ax, K.ay], { blast: { frames: fr, fps: 12, loop: false } });
}

// --- walls ----------------------------------------------------------------------------------------

/**
 * A wall: `idle` churns his water inside its silhouette, its crests and spray lick and his droplets
 * bob; `rise` surges it up out of the ground (each column grows up from its own ground point)
 * into his picture on the last frame, ready for `idle`.
 */
function wall(kind: 'wall' | 'wall_diag' | 'wall_depth', label: string, seed: number, light = false): WorldSprite {
  const K = key(kind);
  const main = K.part('main'), drops = K.part('drops');
  // Each column's ground point: the foot of his water in that column (smoothed), so the 3/4 slab
  // and the end-on column rise along their own footprint.
  const foot = new Array<number>(K.w).fill(-1);
  for (let x = 0; x < K.w; x++) for (let y = K.h - 1; y >= 0; y--) if (main.get(x, y)) {
    foot[x] = y;
    break;
  }
  const g = foot.map((_, x) => {
    let best = -1;
    for (let k = -8; k <= 8; k++) best = Math.max(best, foot[clamp(x + k, 0, K.w - 1)]);
    return best < 0 ? K.ay : kind === 'wall' ? K.ay + 4 : best;
  });
  const idleAt = (t: number) => {
    let m = churn(main, t, { amp: 1.6, ampY: 2.2, cell: 8, seed, flow: [0, -1.2] });
    m = wobble(m, t, 1, 13, seed + 1);
    const d = moveDrops(drops, (k) => {
      const ph = rr(seed + 2, k, 0, TAU), r = 1.6;
      return [r * (Math.cos(t * TAU + ph) - Math.cos(ph)), r * (Math.sin(t * TAU + ph) - Math.sin(ph)) * 1.4];
    });
    return { m, d };
  };
  const glow = light ? slabGlow(main, K.w, K.h, 1) : null;
  const IDLE = 8, RISE = 12;
  const idle = range(IDLE).map((i) => {
    const { m, d } = idleAt(i / IDLE);
    return stackC(K.w, K.h, glow, m, d);
  });
  // The height grows fast at first and settles into his picture on the last frame.
  const heights = range(RISE).map((i) => 1 - Math.pow(1 - (i + 1) / RISE, 1.35));
  const rise = heights.map((s, i) => {
    const { m, d } = idleAt((((i - (RISE - 1)) / IDLE) % 1 + 1) % 1);
    const grow = (L: Layer) => remap(L, (x, y) => [x, g[x] - (g[x] - y) / s]);
    const dd = i === RISE - 1 ? d : i >= 5 ? cut(grow(d), (x, y) => grain(x, y, seed + 3) < 0.1 + 0.15 * (i - 4), 0) : null;
    const gm = grow(m);
    return stackC(K.w, K.h, light ? slabGlow(gm, K.w, K.h, s) : null, gm, dd);
  });
  return vfxSprite(kind, label, [K.ax, K.ay], { rise: { frames: rise, fps: 12, loop: false }, idle: { frames: idle, fps: 10, loop: true } });
}

/** A soft teal light hugging a slab of water: banded by distance from it, up to 12 px out. */
function slabGlow(L: Layer, w: number, h: number, k: number): Canvas {
  const R = 12;
  const dist = new Float32Array(w * h).fill(99);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (L.get(x, y)) dist[y * w + x] = 0;
  // Two-pass chamfer distance.
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (x > 0) dist[i] = Math.min(dist[i], dist[i - 1] + 1);
    if (y > 0) dist[i] = Math.min(dist[i], dist[i - w] + 1);
    if (x > 0 && y > 0) dist[i] = Math.min(dist[i], dist[i - w - 1] + 1.41);
    if (x < w - 1 && y > 0) dist[i] = Math.min(dist[i], dist[i - w + 1] + 1.41);
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x;
    if (x < w - 1) dist[i] = Math.min(dist[i], dist[i + 1] + 1);
    if (y < h - 1) dist[i] = Math.min(dist[i], dist[i + w] + 1);
    if (x < w - 1 && y < h - 1) dist[i] = Math.min(dist[i], dist[i + w + 1] + 1.41);
    if (x > 0 && y < h - 1) dist[i] = Math.min(dist[i], dist[i + w - 1] + 1.41);
  }
  return glowLight(w, h, TEAL, 0.14 * k, (x, y) => {
    const d = dist[y * w + x];
    return d > 0 && d <= R && x > 1 && y > 1 && x < w - 2 && y < h - 2 ? 1 - d / (R + 1) : 0;
  });
}

// --- aura -----------------------------------------------------------------------------------------

/**
 * The water over the figure, as in his picture, where the figure is seen through the water (the
 * owner chose the tint over a clear middle). A soft field round the body, not the shape of any one
 * character, so it sits right on every figure: an ellipse centred 50 px above the feet, 46 x 110 px,
 * about 42 % in the middle and 55 % toward its rim (his own tint fits to about 73 %), stepped. Its
 * colour runs from his water tint over the body (deep) to his bright water round the figure
 * (light) toward the rim, in four steps. It breathes with the frames (alpha +-10 %, size +-2 %).
 */
function veil(w: number, h: number, ax: number, ay: number, frame: number): Canvas {
  const c = new Canvas(w, h);
  const deep = hex(WV3_VEIL.deep), light = hex(WV3_VEIL.light);
  const ph = (frame / AURA) * TAU;
  const breathe = 1 + 0.1 * Math.sin(ph), size = 1 + 0.02 * Math.sin(ph);
  const cx = ax, cy = ay - 50, rx = 23 * size, ry = 55 * size;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const r = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
      let a = (0.42 + 0.13 * smooth(0.55, 0.95, r)) * (1 - smooth(0.92, 1.04, r)) * breathe;
      a = Math.round(a / 0.07) * 0.07;
      if (a <= 0.02) continue;
      const t = Math.round(smooth(0.35, 1, r) * 3) / 3;
      const ch = (k: number) => Math.round(deep[k] + (light[k] - deep[k]) * t);
      c.set(x, y, [ch(0), ch(1), ch(2), Math.round(Math.min(1, a) * 255)]);
    }
  return c;
}

/**
 * His aura in two frame-synchronized layers with the same size and anchor (the feet):
 * `aura_back` goes BEHIND the character (all his water round the figure, its halo and spray);
 * `aura` goes OVER it: the veil of water the figure is seen through, with his bright streaks across
 * the legs and the splash at the feet on top. Both churn upward together.
 */
function aura(): WorldSprite[] {
  const KB = key('aura_back'), KF = key('aura'), seed = 5900;
  const bm = KB.part('main'), bd = KB.part('drops'), bg = KB.part('glow');
  const fm = union(KF.part('main'), KF.part('drops')), fg = KF.part('glow');
  const back: Canvas[] = [], front: Canvas[] = [];
  for (let i = 0; i < AURA; i++) {
    const t = i / AURA;
    const opts: ChurnOpts = { amp: 1.4, ampY: 2.6, cell: 7, seed, flow: [0, -1.4] };
    const up = (y: number) => 0.4 + 0.6 * smooth(KB.ay, KB.ay - 90, y);
    const b = wobble(churn(bm, t, opts), t, 1.1, 11, seed + 1, (_x, y) => up(y));
    const d = moveDrops(bd, (k) => {
      const u = drift(t, rr(seed + 2, k, 0, 1));
      return [Math.sin(u * 5 + k) * 1.2, -7 * u];
    });
    const g = i >= 4 && i <= 7 ? dimGlow(bg, 1) : bg;
    back.push(stackC(KB.w, KB.h, g, b, d));
    const f = wobble(churn(fm, t, opts), t, 1.1, 11, seed + 1, (_x, y) => up(y));
    front.push(stackC(KF.w, KF.h, veil(KF.w, KF.h, KF.ax, KF.ay, i), fg, f));
  }
  return [
    vfxSprite('aura', 'Water aura, front layer (draw OVER the character)', [KF.ax, KF.ay], { idle: { frames: front, fps: 10, loop: true } }),
    vfxSprite('aura_back', 'Water aura, back layer (draw BEHIND the character)', [KB.ax, KB.ay], { idle: { frames: back, fps: 10, loop: true } }),
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

/** The sprites in the order of the vfx_water manifest (beast copied through), then aura_back. */
const ORDER = ['bolt', 'beast', 'stream', 'stream_head', 'breath', 'sphere', 'slash', 'multi', 'hit', 'blast', 'wall', 'wall_diag', 'wall_depth', 'aura', 'aura_back'];

export function waterV3Sprites(): WorldSprite[] {
  return [
    bolt(), ...stream(), breath(), sphere(), slash(), multi(), hit(), blast(),
    wall('wall', 'Water wall (crashing wave crests, 4.5 m x 1.8 m)', 6000),
    wall('wall_diag', 'Water wall, 3/4 (slab along the diagonal, turned 45 degrees)', 6100, true),
    wall('wall_depth', 'Water wall, end-on (tall column running into the screen)', 6200),
    ...aura(),
  ].map(edgeClean);
}

function main(): void {
  // Staging only: refuse to run without WORLD_OUT, so nothing is ever written into src/assets.
  const worldOut = process.env.WORLD_OUT;
  if (!worldOut) throw new Error('vfx-water-v3: set WORLD_OUT to the staging folder (this generator never writes into src/assets)');
  const group = 'vfx_water_v3';
  const beastSrc = join(worldOut, 'vfx_water', 'beast.png');
  const oldManifest = join(worldOut, 'vfx_water', 'manifest.json');
  if (!existsSync(beastSrc) || !existsSync(oldManifest)) throw new Error(`vfx-water-v3: the approved water beast is copied from ${beastSrc}; it is missing`);
  const sprites = waterV3Sprites();
  // Every file is written whole under a temp folder, then moved in: PNGs first, the manifest last.
  const tmpRoot = join(worldOut, '.vfx-water-v3-tmp');
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
