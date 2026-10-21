// Hotbar skill icons, sheet 12: the owner's Sabueso rayo, Luna creciente and Nirvana
// (docs/reference/icons-owner-reference-12.jpg) brought down to the hotbar's 44x44 window (and its
// 88x88 @2x file), as exactly as possible. Sheets 2 to 7 (tools/ui/ui-icons-23.ts) stay as they
// are; this file copies the helpers it needs from that file unchanged (it builds and writes its
// icons as soon as it is loaded, so it cannot be imported).
//
//   python3 -I tools/refs/icons-from-ref-12.py docs/reference/icons-owner-reference-12.jpg <stagingDir>
//   UI_OUT=<stagingDir> UI_FRAME=src/assets/ui_icons npx tsx tools/ui/ui-icons-12.ts
//
// reads his squares from <stagingDir>/ref/<jutsu id>.png (in his own pixels) and writes
// <stagingDir>/<jutsu id>.png (44x44, the slot window, shown at 1x), <jutsu id>@2x.png (88x88) and
// manifest_12.json; those seven files are what goes into src/assets/ui_icons. It refuses to run
// without UI_OUT. Every file is written under a temporary name and renamed into place, and the same
// crops always give the same bytes. The slot frame is sheet 1's (skill_slot_steel.png and
// skill_slot_steel_active.png), read from UI_FRAME (default: the folder ui_icons next to UI_OUT)
// and never written.
//
// Optional: UI_SHEETS=<dir> also writes <dir>/ui-icons-12-compare.png (his whole window beside our
// 88 and our 44 shown 2x, then the same at 2x) and <dir>/ui-icons-12-slots.png (the icons inside
// the steel slot at 1x and 2x, beside his row). UI_DEBUG=<dir> writes every stage of every icon
// (and each icon as text, one letter per palette entry, to trace hand-fixes on). For tuning only:
// UI_ONLY=<ids> builds those and writes nothing but the debug files; UI_TUNE='{"<id>": {...}}'
// overrides fields of an icon's spec; UI_NOMARKS and UI_NOART leave out his kept marks and the
// hand-fixes.
//
// What is different from sheets 2 to 7: his windows on this sheet are wider than tall (144x115,
// 128x115 and 135x115 of his pixels) and bigger than 88. The crop script takes the square of his
// full height that holds his whole subject (115x115; the columns left out are listed there and in
// the manifest), so his proportions stay as he drew them. 115 is too many of his pixels for the 88
// to keep them one to one: dropping 27 of every 115 columns and rows breaks his one-pixel
// lightning, quills and crescent edges every fourth pixel and loses a quarter of his specks. So
// the 88 is made the way the 44 is (step 3 below): the area mean of his pixels, with his thin lines
// and specks kept in their own colour one pixel wide.
//
// How an icon is made:
//  1. His square in his own pixels (the crop script has put his art next to them on the tips of his
//     inner line that reach into the square's corners).
//  2. The palette: k-means in OKLab on his pixels (each pixel weighted by how rare its lightness is,
//     so a big dark ground does not take most of the entries), each centre replaced by the nearest
//     colour that really occurs in his pixels; plus a few entries sampled from given places of his
//     picture. One palette per icon, used at both sizes. No dither.
//  3. 88 and 44: area mean (box) of his pixels, except his marks: where his picture has a thin
//     bright line or speck (lighter than everything within one or two of his pixels: the lightning,
//     the golden dots, the quills and the sparkles) or a dark one (the ninjas' silhouettes, the
//     wolf's open mouth, the light blue gaps between his feather barbs), the pixel holding it takes
//     its own colour instead of the mean, so the line stays one clean pixel wide instead of fading
//     into its ground. Only lines of several of his pixels count (and his strongest specks), so his
//     texture is not turned into noise; at 44 they are fewer and may be blended with the mean, as a
//     line one pixel wide there is three of his. Then (when an icon asks for it; none does now) a
//     light edge-preserving smoothing of the rest, nearest palette entry, and the clean-up: a 1- or
//     2-pixel area of one colour joins the neighbouring colour nearest to the picture, except where
//     the picture there stands out from its ring (his mark) or it is one of his kept specks.
//  4. Hand-fixes, per icon, only for what that reduction still loses (see each icon's comment),
//     traced on his pixels. These pixels are protected; the clean-up runs again on the rest.
//  5. Checks (printed and written to the manifest), as for sheets 2 to 7: small clusters (his marks,
//     drawn details, left over from the reduction), the colour difference to his box reduction after
//     both are blurred (sigma size/30), and how close each icon is to his picture: the structural
//     similarity (SSIM, lightness, sigma 1.5) of ours (the 44 shown 2x) and of his own box reduction
//     (to 44, shown 2x), both against his picture box-reduced to 88.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Img, RGBA, hex, loadPng, savePng, toHex, writeAtomic } from './ui-img';
import { screenText } from './ui-font';

if (!process.env.UI_OUT) {
  console.error('ui-icons-12: set UI_OUT to the staging folder (nothing is written to src/ by this tool).');
  process.exit(2);
}
const OUT: string = process.env.UI_OUT;
const REF = join(OUT, 'ref');
const FRAME_DIR = process.env.UI_FRAME ?? join(dirname(OUT), 'ui_icons');
const DEBUG = process.env.UI_DEBUG;

// --- colour maths (as tools/ui/ui-icons.ts) ------------------------------------------------------

type Lab = [number, number, number];
const lin = (c: number): number => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const LIN = Array.from({ length: 256 }, (_, i) => lin(i));
function oklab(r: number, g: number, b: number): Lab {
  const R = LIN[Math.max(0, Math.min(255, Math.round(r)))], G = LIN[Math.max(0, Math.min(255, Math.round(g)))], B = LIN[Math.max(0, Math.min(255, Math.round(b)))];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
/** Distance in OKLab with lightness weighted up: ramps are read by their value first. */
function dist(p: Lab, q: Lab, cw = 1): number {
  const dl = (p[0] - q[0]) * 1.4, da = (p[1] - q[1]) * cw, db = (p[2] - q[2]) * cw;
  return dl * dl + da * da + db * db;
}
const hueDeg = (c: Lab): number => ((Math.atan2(c[2], c[1]) * 180) / Math.PI + 360) % 360;

// --- float images (as tools/ui/ui-icons.ts) -----------------------------------------------------

/** An RGB image in floats (sRGB values 0..255). */
class F {
  readonly d: Float32Array;
  constructor(readonly w: number, readonly h: number, d?: Float32Array) {
    this.d = d ?? new Float32Array(w * h * 3);
  }
  static of(img: Img): F {
    const f = new F(img.w, img.h);
    for (let i = 0; i < img.w * img.h; i++) for (let k = 0; k < 3; k++) f.d[i * 3 + k] = img.px[i * 4 + k];
    return f;
  }
  at(x: number, y: number, k: number): number {
    x = Math.max(0, Math.min(this.w - 1, x));
    y = Math.max(0, Math.min(this.h - 1, y));
    return this.d[(y * this.w + x) * 3 + k];
  }
  lab(i: number): Lab {
    return oklab(this.d[i * 3], this.d[i * 3 + 1], this.d[i * 3 + 2]);
  }
  rgb(i: number): RGBA {
    return [Math.round(this.d[i * 3]), Math.round(this.d[i * 3 + 1]), Math.round(this.d[i * 3 + 2]), 255];
  }
  toImg(): Img {
    const o = new Img(this.w, this.h);
    for (let i = 0; i < this.w * this.h; i++) {
      for (let k = 0; k < 3; k++) o.px[i * 4 + k] = Math.max(0, Math.min(255, Math.round(this.d[i * 3 + k])));
      o.px[i * 4 + 3] = 255;
    }
    return o;
  }
  clone(): F {
    return new F(this.w, this.h, new Float32Array(this.d));
  }
}

/** Area (box) resampling: each target pixel is the coverage-weighted mean of the source pixels under it. */
function areaResize(src: F, w: number, h: number): F {
  const o = new F(w, h);
  const sx = src.w / w, sy = src.h / h;
  for (let y = 0; y < h; y++) {
    const y0 = y * sy, y1 = (y + 1) * sy;
    for (let x = 0; x < w; x++) {
      const x0 = x * sx, x1 = (x + 1) * sx;
      const acc = [0, 0, 0];
      let wt = 0;
      for (let yy = Math.floor(y0); yy < Math.ceil(y1); yy++) {
        const cy = Math.min(y1, yy + 1) - Math.max(y0, yy);
        for (let xx = Math.floor(x0); xx < Math.ceil(x1); xx++) {
          const c = (Math.min(x1, xx + 1) - Math.max(x0, xx)) * cy;
          for (let k = 0; k < 3; k++) acc[k] += src.at(xx, yy, k) * c;
          wt += c;
        }
      }
      for (let k = 0; k < 3; k++) o.d[(y * w + x) * 3 + k] = acc[k] / wt;
    }
  }
  return o;
}

/**
 * Bilateral filter: each pixel becomes the mean of its neighbours within `radius`, weighted by
 * distance (sigma `ss` pixels) and by colour difference in OKLab (sigma `sr`). Flat areas lose
 * their grain; edges between different colours stay where they are.
 */
function bilateral(src: F, ss: number, sr: number, radius: number): F {
  const { w, h } = src;
  const labs: Lab[] = [];
  for (let i = 0; i < w * h; i++) labs.push(src.lab(i));
  const o = new F(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const acc = [0, 0, 0];
      let wt = 0;
      for (let dy = -radius; dy <= radius; dy++)
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          const a = labs[i], b = labs[j];
          const dc = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
          const g = Math.exp(-(dx * dx + dy * dy) / (2 * ss * ss) - dc / (2 * sr * sr));
          for (let k = 0; k < 3; k++) acc[k] += src.d[j * 3 + k] * g;
          wt += g;
        }
      for (let k = 0; k < 3; k++) o.d[i * 3 + k] = acc[k] / wt;
    }
  return o;
}

/** Gaussian blur of a scalar field (separable, clamped edges). */
function gauss(v: Float32Array, w: number, h: number, sigma: number): Float32Array {
  const r = Math.ceil(sigma * 2.5);
  const k: number[] = [];
  let ks = 0;
  for (let i = -r; i <= r; i++) {
    const e = Math.exp(-(i * i) / (2 * sigma * sigma));
    k.push(e);
    ks += e;
  }
  const t = new Float32Array(w * h), o = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let a = 0;
      for (let i = -r; i <= r; i++) a += v[y * w + Math.max(0, Math.min(w - 1, x + i))] * k[i + r];
      t[y * w + x] = a / ks;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let a = 0;
      for (let i = -r; i <= r; i++) a += t[Math.max(0, Math.min(h - 1, y + i)) * w + x] * k[i + r];
      o[y * w + x] = a / ks;
    }
  return o;
}

/** Lightness (0..1, OKLab L) of every pixel. */
function lightness(f: F): Float32Array {
  const o = new Float32Array(f.w * f.h);
  for (let i = 0; i < f.w * f.h; i++) o[i] = f.lab(i)[0];
  return o;
}
/** Square min (or max) filter of radius r. */
function morph(v: Float32Array, w: number, h: number, r: number, max: boolean): Float32Array {
  const t = new Float32Array(w * h), o = new Float32Array(w * h);
  const pick = max ? Math.max : Math.min;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let m = v[y * w + x];
      for (let d = -r; d <= r; d++) m = pick(m, v[y * w + Math.max(0, Math.min(w - 1, x + d))]);
      t[y * w + x] = m;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let m = t[y * w + x];
      for (let d = -r; d <= r; d++) m = pick(m, t[Math.max(0, Math.min(h - 1, y + d)) * w + x]);
      o[y * w + x] = m;
    }
  return o;
}

// --- palette (as tools/ui/ui-icons.ts) ------------------------------------------------------------

interface Pal {
  rgb: RGBA[];
  lab: Lab[];
  /** Entries kept for the drawn details only (the base picture is never put on them). */
  spare: boolean[];
  /** Hue weight when a pixel is put on the palette (1 = lightness first). */
  cw: number;
}

function palOf(rgb: RGBA[], spare: boolean[]): Pal {
  const lab = rgb.map((c) => oklab(c[0], c[1], c[2]));
  const idx = rgb.map((_, i) => i).sort((a, b) => lab[a][0] - lab[b][0] || a - b);
  return { rgb: idx.map((i) => rgb[i]), lab: idx.map((i) => lab[i]), spare: idx.map((i) => spare[i]), cw: 1 };
}

/** His real colours (each distinct colour of his pixels once), to snap palette entries to. */
function hisColours(source: F): { rgb: RGBA[]; lab: Lab[] } {
  const rgb: RGBA[] = [], lab: Lab[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < source.w * source.h; i++) {
    const r = Math.round(source.d[i * 3]), g = Math.round(source.d[i * 3 + 1]), b = Math.round(source.d[i * 3 + 2]);
    const key = (r << 16) | (g << 8) | b;
    if (seen.has(key)) continue;
    seen.add(key);
    rgb.push([r, g, b, 255]);
    lab.push(oklab(r, g, b));
  }
  return { rgb, lab };
}

/**
 * k-means in OKLab on his pixels, then each centre is replaced by the nearest colour that really
 * occurs in his pixels, so the palette is sampled from his picture. Every pixel is weighted by how
 * rare its lightness is (`flat` 0..1), so a big dark ground does not take most of the entries from
 * the bright subject's ramp; the seeds are spread evenly in lightness for the same reason. `chroma`
 * weighs hue against lightness. Sorted dark to light.
 */
function makePalette(samples: F, his: { rgb: RGBA[]; lab: Lab[] }, k: number, flat: number, chroma: number): Pal {
  const kd = (p: Lab, q: Lab): number => {
    const dl = (p[0] - q[0]) * 1.4, da = (p[1] - q[1]) * chroma, db = (p[2] - q[2]) * chroma;
    return dl * dl + da * da + db * db;
  };
  const n = samples.w * samples.h;
  const pts: Lab[] = [];
  for (let i = 0; i < n; i++) pts.push(samples.lab(i));
  const bins = new Float64Array(32);
  for (const q of pts) bins[Math.max(0, Math.min(31, Math.floor(q[0] * 32)))]++;
  const wt = pts.map((q) => 1 / Math.pow(bins[Math.max(0, Math.min(31, Math.floor(q[0] * 32)))], flat));
  const order = pts.map((q, i) => [q[0], i] as [number, number]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const lo = order[Math.floor(n * 0.002)][0], hi = order[Math.min(n - 1, Math.floor(n * 0.998))][0];
  let cen: Lab[] = [];
  for (let j = 0; j < k; j++) {
    const target = lo + ((hi - lo) * (j + 0.5)) / k;
    let bi = 0, bd = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(pts[i][0] - target);
      if (d < bd) (bd = d), (bi = i);
    }
    cen.push([...pts[bi]] as Lab);
  }
  const asg = new Int32Array(n);
  for (let it = 0; it < 40; it++) {
    for (let i = 0; i < n; i++) {
      let best = 0, bd = Infinity;
      for (let j = 0; j < cen.length; j++) {
        const d = kd(pts[i], cen[j]);
        if (d < bd) (bd = d), (best = j);
      }
      asg[i] = best;
    }
    const sum = cen.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) {
      const s = sum[asg[i]];
      s[0] += pts[i][0] * wt[i];
      s[1] += pts[i][1] * wt[i];
      s[2] += pts[i][2] * wt[i];
      s[3] += wt[i];
    }
    cen = cen.map((c, j) => (sum[j][3] ? ([sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]] as Lab) : c));
  }
  const rgb: RGBA[] = [];
  for (const c of cen) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < his.lab.length; i++) {
      const d = dist(c, his.lab[i]);
      if (d < bd) (bd = d), (best = i);
    }
    if (!rgb.some((u) => u[0] === his.rgb[best][0] && u[1] === his.rgb[best][1] && u[2] === his.rgb[best][2])) rgb.push(his.rgb[best]);
  }
  return palOf(rgb, rgb.map(() => false));
}

/**
 * A colour sampled from one place of his picture (box in his pixels): the mean of the pixels there
 * whose key (lightness, warmth = red over blue as a share of red, or chroma) is in the [lo, hi]
 * quantile band, snapped to his nearest real
 * colour. Used for the entries the k-means misses (his whitest core, a spark's colour).
 */
function sampleAt(src: F, his: { rgb: RGBA[]; lab: Lab[] }, box: [number, number, number, number], lo: number, hi: number, by: 'L' | 'warm' | 'chroma' = 'L', only?: { hue?: [number, number]; minL?: number; maxL?: number }): RGBA {
  const px: number[] = [];
  for (let y = box[1]; y < box[3]; y++)
    for (let x = box[0]; x < box[2]; x++) {
      const c = src.lab(y * src.w + x), hd = hueDeg(c);
      if (only?.hue && (hd < only.hue[0] || hd > only.hue[1])) continue;
      if (c[0] < (only?.minL ?? 0) || c[0] > (only?.maxL ?? 1)) continue;
      px.push(y * src.w + x);
    }
  if (!px.length) throw new Error('ui-icons-12: sampleAt found none of his pixels there');
  const key = (i: number): number => {
    const c = src.lab(i);
    return by === 'L' ? c[0] : by === 'warm' ? (src.d[i * 3] - src.d[i * 3 + 2]) / (src.d[i * 3] + 1) : Math.hypot(c[1], c[2]);
  };
  const L = px.map(key);
  const ord = px.map((_, j) => j).sort((a, b) => L[a] - L[b] || a - b);
  const sel = ord.slice(Math.floor(lo * ord.length), Math.max(Math.floor(lo * ord.length) + 1, Math.ceil(hi * ord.length)));
  const m: Lab = [0, 0, 0];
  for (const j of sel) {
    const c = src.lab(px[j]);
    for (let k = 0; k < 3; k++) m[k] += c[k] / sel.length;
  }
  let best = 0, bd = Infinity;
  for (let i = 0; i < his.lab.length; i++) {
    const d = dist(m, his.lab[i]);
    if (d < bd) (bd = d), (best = i);
  }
  return his.rgb[best];
}

// --- indexed images (as tools/ui/ui-icons.ts, plus the clean-up that keeps his marks) -------------

class Ix {
  readonly d: Int16Array;
  constructor(readonly w: number, readonly h: number) {
    this.d = new Int16Array(w * h);
  }
  get(x: number, y: number): number {
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : this.d[y * this.w + x];
  }
  set(x: number, y: number, v: number): void {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = v;
  }
  clone(): Ix {
    const o = new Ix(this.w, this.h);
    o.d.set(this.d);
    return o;
  }
  toImg(p: Pal): Img {
    const o = new Img(this.w, this.h);
    for (let i = 0; i < this.w * this.h; i++) o.set(i % this.w, Math.floor(i / this.w), p.rgb[this.d[i]]);
    return o;
  }
}

function nearest(p: Pal, c: Lab, any = false): number {
  let best = 0, bd = Infinity;
  for (let j = 0; j < p.lab.length; j++) {
    if (p.spare[j] && !any) continue;
    const d = dist(c, p.lab[j], p.cw);
    if (d < bd) (bd = d), (best = j);
  }
  return best;
}

function quantize(f: F, p: Pal): Ix {
  const q = new Ix(f.w, f.h);
  for (let i = 0; i < f.w * f.h; i++) q.d[i] = nearest(p, f.lab(i));
  return q;
}

const N8: [number, number][] = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

/** Connected areas of one colour (8-connected): the label of each pixel and each area's size. */
function components(q: Ix): { lab: Int32Array; size: number[] } {
  const lab = new Int32Array(q.w * q.h).fill(-1);
  const size: number[] = [];
  const st: number[] = [];
  for (let i = 0; i < q.w * q.h; i++) {
    if (lab[i] >= 0) continue;
    const id = size.length;
    let n = 0;
    lab[i] = id;
    st.push(i);
    while (st.length) {
      const j = st.pop()!;
      n++;
      const x = j % q.w, y = (j - x) / q.w;
      for (const [dx, dy] of N8) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= q.w || yy >= q.h) continue;
        const k = yy * q.w + xx;
        if (lab[k] < 0 && q.d[k] === q.d[j]) {
          lab[k] = id;
          st.push(k);
        }
      }
    }
    size.push(n);
  }
  return { lab, size };
}

/**
 * The clean-up: every area of one colour of at most `maxSize` pixels (8-connected) that is not
 * protected joins one of the colours around it: the one nearest to the picture `ref` over the area
 * (so the merge keeps his light), ties going to the colour that borders it most. `stays(px)` may keep
 * an area (his own mark, at 88). One area at a time, in reading order, until nothing changes.
 */
function cleanup(q: Ix, p: Pal, ref: F, maxSize: number, protect: Set<number>, stays?: (px: number[]) => boolean, rounds = 12): Ix {
  const cur = q.clone();
  const { w, h } = cur;
  for (let r = 0; r < rounds; r++) {
    let changed = 0;
    const { lab, size } = components(cur);
    const members = new Map<number, number[]>();
    for (let i = 0; i < w * h; i++) {
      if (size[lab[i]] > maxSize || protect.has(i)) continue;
      const m = members.get(lab[i]);
      if (m) m.push(i);
      else members.set(lab[i], [i]);
    }
    for (const [, px] of [...members.entries()].sort((a, b) => a[0] - b[0])) {
      const col = cur.d[px[0]];
      if (px.some((i) => cur.d[i] !== col)) continue;
      if (stays && stays(px)) continue;
      const border = new Map<number, number>();
      const rm: Lab = [0, 0, 0];
      let grown = false;
      for (const i of px) {
        const c = ref.lab(i);
        for (let k = 0; k < 3; k++) rm[k] += c[k] / px.length;
        const x = i % w, y = (i - x) / w;
        for (const [dx, dy] of N8) {
          const v = cur.get(x + dx, y + dy);
          if (v < 0) continue;
          const j = (y + dy) * w + x + dx;
          if (v === col) {
            if (!px.includes(j)) grown = true;
            continue;
          }
          border.set(v, (border.get(v) ?? 0) + 1);
        }
      }
      if (grown || !border.size) continue;
      let best = -1, bs = Infinity;
      for (const [v, n] of [...border.entries()].sort((a, b) => a[0] - b[0])) {
        const s = dist(rm, p.lab[v], p.cw) - n * 1e-6;
        if (s < bs) (bs = s), (best = v);
      }
      for (const i of px) cur.d[i] = best;
      changed++;
    }
    if (!changed) break;
  }
  return cur;
}

/**
 * His own mark, at 88 (where our pixels are his): a small area stays when his pixels under it stand
 * out from his pixels around it (the ring of 8-neighbours) by `minDiff` or more (OKLab, lightness
 * weighted as in `dist`). Where they do not, the palette has split one of his tones and it merges.
 */
function hisMark(his: F, minDiff: number): (px: number[]) => boolean {
  return (px) => {
    const w = his.w, inside = new Set(px);
    const a: Lab = [0, 0, 0], b: Lab = [0, 0, 0];
    let nb = 0;
    for (const i of px) {
      const c = his.lab(i);
      for (let k = 0; k < 3; k++) a[k] += c[k] / px.length;
    }
    const ring = new Set<number>();
    for (const i of px) {
      const x = i % w, y = (i - x) / w;
      for (const [dx, dy] of N8) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= his.h) continue;
        const j = yy * w + xx;
        if (!inside.has(j)) ring.add(j);
      }
    }
    for (const j of ring) {
      const c = his.lab(j);
      for (let k = 0; k < 3; k++) b[k] += c[k];
      nb++;
    }
    if (!nb) return false;
    for (let k = 0; k < 3; k++) b[k] /= nb;
    return Math.sqrt(dist(a, b)) >= minDiff;
  };
}

/**
 * Small clusters (8-connected areas of one colour of one or two pixels): all of them, those that are
 * his own marks (`his`: at 88 his pixel stands out there; at 44 one of his kept specks), those that
 * hold a drawn detail (`drawn`) and the rest, which are left over from the reduction.
 */
function smallClusters(q: Ix, his: Set<number>, drawn: Set<number>): { all: number; his: number; drawn: number; other: number } {
  const { lab, size } = components(q);
  const kind = new Map<number, number>(); // 2 his, 1 drawn, 0 other
  for (let i = 0; i < q.w * q.h; i++) {
    const id = lab[i];
    if (size[id] > 2) continue;
    kind.set(id, Math.max(kind.get(id) ?? 0, his.has(i) ? 2 : drawn.has(i) ? 1 : 0));
  }
  const out = { all: 0, his: 0, drawn: 0, other: 0 };
  for (const k of kind.values()) {
    out.all++;
    if (k === 2) out.his++;
    else if (k === 1) out.drawn++;
    else out.other++;
  }
  return out;
}

// --- his pixels ------------------------------------------------------------------------------------

/** 8-connected groups of a mask. */
function groups(mask: Uint8Array, w: number, h: number): number[][] {
  const out: number[][] = [];
  const seen = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || seen[i]) continue;
    const comp: number[] = [];
    const st = [i];
    seen[i] = 1;
    while (st.length) {
      const j = st.pop()!;
      comp.push(j);
      const x = j % w, y = (j - x) / w;
      for (const [dx, dy] of N8) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const k = yy * w + xx;
        if (mask[k] && !seen[k]) (seen[k] = 1), st.push(k);
      }
    }
    out.push(comp);
  }
  return out;
}

/**
 * One kind of his thin marks, kept at 44: `bright` ones are lighter than the opening (radius `r` of
 * his pixels) of his lightness by `thr` or more, `dark` ones darker than its closing. Only groups of
 * at least `minPx` of his pixels count as lines; a smaller group counts only if it stands out by
 * `speck` or more (his strongest sparks and drops). A 44 pixel takes the marks' colour when at least
 * `share` of his pixels whose centres fall in it are marks; `mix` (default 1) blends it with the box
 * mean there. `where` (44 coordinates) limits it to part of the picture. When several rules hold at
 * one pixel, the first listed wins.
 */
interface MarkRule {
  /** bright / dark: by contrast with the opening / closing of his lightness; colour: by his colour alone (hue, chroma, lightness). */
  kind: 'bright' | 'dark' | 'colour';
  /** What it keeps, for the notes and the manifest. */
  what: string;
  r: number;
  thr: number;
  minPx: number;
  speck?: number;
  share: number;
  mix?: number;
  where?: (x: number, y: number) => boolean;
  /** Only his pixels whose own lightness (OKLab L) is within [minL, maxL] count (the lightning's white cores, the near-black outlines). */
  minL?: number;
  maxL?: number;
  /** Only his pixels whose OKLab chroma is at least this, and whose hue (degrees) is within `hue` (his roots, his grass). */
  minC?: number;
  hue?: [number, number];
  /** The colour a marked 44 pixel takes: the mean of his marks there weighted by how much they stand out (default), or the one that stands out most ('peak'). */
  pick?: 'mean' | 'peak';
  /** Or one colour of his for the whole line (hex), so a thin line stays one connected area: the pixels are then kept out of the clean-up as drawn marks. */
  ink?: string;
  /** (Sheet 12) Only his pixels within `r` of one of his pixels at least as light as `minL` count (the gaps between the barbs inside his white feathers, not the haze). */
  near?: { minL: number; r: number };
}

interface Reduced {
  /** The 44 picture: box mean, with his marks in their own colour. */
  img: F;
  box: F;
  /** Per 44 pixel: which rule (index + 1) put his mark there, 0 none; and whether the mark is a lone speck. */
  mark: Int8Array;
  speck: Uint8Array;
  /** His mark masks (his pixels, per rule: 1 line, 2 speck), for the debug sheet. */
  masks: Uint8Array[];
}

function reduceKeep(W: F, N: number, rules: MarkRule[]): Reduced {
  const box = areaResize(W, N, N);
  const out = box.clone();
  const mark = new Int8Array(N * N), speck = new Uint8Array(N * N);
  const L = lightness(W);
  const C = new Float32Array(W.w * W.h), Hd = new Float32Array(W.w * W.h);
  for (let i = 0; i < W.w * W.h; i++) {
    const c = W.lab(i);
    C[i] = Math.hypot(c[1], c[2]);
    Hd[i] = hueDeg(c);
  }
  const { w, h } = W;
  const sx = w / N, sy = h / N;
  const cell = (i: number): number => {
    const x = i % w, y = (i - x) / w;
    return Math.min(N - 1, Math.floor((y + 0.5) / sy)) * N + Math.min(N - 1, Math.floor((x + 0.5) / sx));
  };
  const count = new Float32Array(N * N);
  for (let i = 0; i < w * h; i++) count[cell(i)]++;
  const strength = rules.map(() => new Float32Array(N * N));
  const share = rules.map(() => new Float32Array(N * N));
  const colour = rules.map(() => new Float32Array(N * N * 3));
  const lone = rules.map(() => new Uint8Array(N * N));
  const peakT = rules.map(() => new Float32Array(N * N));
  const peakI = rules.map(() => new Int32Array(N * N).fill(-1));
  const masks: Uint8Array[] = [];
  rules.forEach((rule, s) => {
    const bright = rule.kind === 'bright';
    const op = rule.kind === 'colour' ? L : bright ? morph(morph(L, w, h, rule.r, false), w, h, rule.r, true) : morph(morph(L, w, h, rule.r, true), w, h, rule.r, false);
    const t = rule.kind === 'colour' ? C.map((c) => c + 1e-3) : L.map((v, i) => (bright ? v - op[i] : op[i] - v));
    const inHue = (i: number) => !rule.hue || (rule.hue[0] <= rule.hue[1] ? Hd[i] >= rule.hue[0] && Hd[i] <= rule.hue[1] : Hd[i] >= rule.hue[0] || Hd[i] <= rule.hue[1]);
    const near = rule.near ? morph(L, w, h, rule.near.r, true) : null;
    const m = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) m[i] = t[i] > rule.thr && L[i] >= (rule.minL ?? 0) && L[i] <= (rule.maxL ?? 1) && C[i] >= (rule.minC ?? 0) && inHue(i) && (!near || near[i] >= rule.near!.minL) ? 1 : 0;
    const keep = new Uint8Array(w * h);
    for (const g of groups(m, w, h)) {
      const peak = Math.max(...g.map((i) => t[i]));
      const isLine = g.length >= rule.minPx;
      if (!isLine && !(rule.speck !== undefined && peak >= rule.speck)) continue;
      for (const i of g) keep[i] = isLine ? 1 : 2;
    }
    masks.push(keep);
    for (let i = 0; i < w * h; i++) {
      if (!keep[i]) continue;
      const c = cell(i);
      share[s][c] += 1 / count[c];
      strength[s][c] += t[i];
      for (let k = 0; k < 3; k++) colour[s][c * 3 + k] += W.d[i * 3 + k] * t[i];
      if (keep[i] === 2) lone[s][c] = 1;
      if (t[i] > peakT[s][c]) (peakT[s][c] = t[i]), (peakI[s][c] = i);
    }
  });
  for (let c = 0; c < N * N; c++) {
    const x = c % N, y = (c - x) / N;
    const pick = rules.findIndex((rule, s) => share[s][c] >= rule.share && (!rule.where || rule.where(x, y)));
    if (pick < 0) continue;
    const mix = rules[pick].mix ?? 1;
    const peak = rules[pick].pick === 'peak';
    for (let k = 0; k < 3; k++) {
      const col = peak ? W.d[peakI[pick][c] * 3 + k] : colour[pick][c * 3 + k] / strength[pick][c];
      out.d[c * 3 + k] = box.d[c * 3 + k] + (col - box.d[c * 3 + k]) * mix;
    }
    mark[c] = pick + 1;
    speck[c] = lone[pick][c];
  }
  return { img: out, box, mark, speck, masks };
}

// --- drawing the details (as tools/ui/ui-icons.ts) ---------------------------------------------------

/** A 1-pixel line between two pixels with no doubled corners (each step moves one pixel). */
function linePixels(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const out: [number, number][] = [];
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) {
    out.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) (err -= dy), (x += sx);
    if (e2 < dx) (err += dx), (y += sy);
  }
  return out;
}
/** A polyline through the points, with the inner pixel of every L-shaped corner dropped. */
function polyPixels(pts: [number, number][]): [number, number][] {
  const raw: [number, number][] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const seg = linePixels(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    for (const p of i ? seg.slice(1) : seg) raw.push(p);
  }
  if (pts.length === 1) raw.push(pts[0]);
  const clean: [number, number][] = [];
  for (let i = 0; i < raw.length; i++) {
    const a = clean[clean.length - 1], b = raw[i], c = raw[i + 1];
    if (a && c && Math.abs(a[0] - c[0]) === 1 && Math.abs(a[1] - c[1]) === 1 && (a[0] === b[0] || a[1] === b[1])) continue;
    clean.push(b);
  }
  return clean;
}

/**
 * Drawing on an icon at its own size (44 or 88), in its own pixel coordinates. Every pixel drawn is
 * protected from the clean-up that follows; `shift` and `recolor` change the base and are not.
 * Colours are his (hex); each is put on the palette entry nearest to it.
 */
class Paint {
  readonly drawn = new Set<number>();
  /** His own marks kept as they are (his specks at 44), for the checks. */
  readonly his = new Set<number>();
  private ramp: number[];
  constructor(readonly q: Ix, readonly p: Pal) {
    this.ramp = p.rgb.map((_, i) => i).filter((i) => !p.spare[i]);
  }
  get N(): number {
    return this.q.w;
  }
  c(col: string): number {
    const c = hex(col);
    return nearest(this.p, oklab(c[0], c[1], c[2]), true);
  }
  at(x: number, y: number): number {
    return this.q.get(x, y);
  }
  L(x: number, y: number): number {
    const v = this.q.get(x, y);
    return v < 0 ? 0 : this.p.lab[v][0];
  }
  px(x: number, y: number, col: string | number): void {
    if (x < 0 || y < 0 || x >= this.q.w || y >= this.q.h) return;
    this.q.set(x, y, typeof col === 'number' ? col : this.c(col));
    this.drawn.add(y * this.q.w + x);
  }
  dots(pts: [number, number][], col: string): void {
    for (const [x, y] of pts) this.px(x, y, col);
  }
  line(pts: [number, number][], col: string): void {
    for (const [x, y] of polyPixels(pts)) this.px(x, y, col);
  }
  /** A patch drawn from text rows: each character is a colour from `legend`, '.' leaves the pixel. */
  ascii(x0: number, y0: number, rows: string[], legend: Record<string, string>): void {
    rows.forEach((row, dy) =>
      [...row].forEach((ch, dx) => {
        if (ch === '.' || ch === ' ') return;
        if (!(ch in legend)) throw new Error(`ui-icons-12: no colour for '${ch}'`);
        this.px(x0 + dx, y0 + dy, legend[ch]);
      }),
    );
  }
  /** Moves the base `steps` entries along the palette's ramp (negative = darker) where `where` holds. */
  shift(where: (x: number, y: number) => boolean, steps: number): void {
    for (let y = 0; y < this.q.h; y++)
      for (let x = 0; x < this.q.w; x++) {
        if (!where(x, y) || this.drawn.has(y * this.q.w + x)) continue;
        const r = this.ramp.indexOf(this.q.get(x, y));
        if (r < 0) continue;
        this.q.set(x, y, this.ramp[Math.max(0, Math.min(this.ramp.length - 1, r + steps))]);
      }
  }
  /** Puts every base pixel of the colours `from` (hex) on `to` where `where` holds. */
  recolor(where: (x: number, y: number) => boolean, from: string[], to: string): void {
    const f = new Set(from.map((c) => this.c(c))), t = this.c(to);
    for (let y = 0; y < this.q.h; y++)
      for (let x = 0; x < this.q.w; x++) if (where(x, y) && f.has(this.q.get(x, y)) && !this.drawn.has(y * this.q.w + x)) this.q.set(x, y, t);
  }
  /** One of his own marks, kept as it is: protected and listed as his. */
  keep(x: number, y: number): void {
    if (x < 0 || y < 0 || x >= this.q.w || y >= this.q.h) return;
    this.drawn.add(y * this.q.w + x);
    this.his.add(y * this.q.w + x);
  }
}

// --- checks ----------------------------------------------------------------------------------------

interface Checks {
  /** 8-connected areas of one colour of one or two pixels: all; his own marks; drawn details; the rest (left over from the reduction). */
  small: number;
  smallHis: number;
  smallDrawn: number;
  smallOther: number;
  /** Mean OKLab difference (x100) to his box reduction, both blurred (sigma N/30): ours and his box on our palette. */
  lowFreq: number;
  lowFreqBoxOnPalette: number;
  /** Structural similarity (lightness, sigma 1.5 at 88) to his picture box-reduced to 88: ours, and (at 44) his own box reduction to 44; both shown 2x. */
  ssim: number;
  ssimBox: number;
  /** OKLab median hue (degrees) of ours and of his box reduction. */
  hue: number;
  hueHis: number;
  colours: number;
  /** The longest straight run of one colour one pixel thick: [length, 'row'|'col', index]. */
  thinRun: [number, string, number];
}

function thinRun(q: Ix): [number, string, number] {
  let best: [number, string, number] = [0, 'row', 0];
  for (const horiz of [true, false])
    for (let a = 0; a < q.h; a++) {
      let run = 0;
      for (let b = 0; b < q.w; b++) {
        const x = horiz ? b : a, y = horiz ? a : b;
        const v = q.get(x, y);
        const g = (xx: number, yy: number): number => (xx < 0 || yy < 0 || xx >= q.w || yy >= q.h ? v : q.get(xx, yy));
        const thin = horiz ? g(x, y - 1) !== v && g(x, y + 1) !== v : g(x - 1, y) !== v && g(x + 1, y) !== v;
        const prev = b > 0 ? (horiz ? q.get(x - 1, y) : q.get(x, y - 1)) : -2;
        run = thin ? (prev === v && run > 0 ? run + 1 : 1) : 0;
        if (run > best[0]) best = [run, horiz ? 'row' : 'col', a];
      }
    }
  return best;
}

function blurLab(img: F, sigma: number): Float32Array[] {
  const n = img.w * img.h;
  const ch = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
  for (let i = 0; i < n; i++) {
    const c = img.lab(i);
    for (let k = 0; k < 3; k++) ch[k][i] = c[k];
  }
  return ch.map((c) => gauss(c, img.w, img.h, sigma));
}
function lowFreqDiff(a: F, b: F): number {
  const s = a.w / 30;
  const A = blurLab(a, s), B = blurLab(b, s);
  let t = 0;
  for (let i = 0; i < a.w * a.h; i++) t += Math.hypot(A[0][i] - B[0][i], A[1][i] - B[1][i], A[2][i] - B[2][i]);
  return (t / (a.w * a.h)) * 100;
}
function medianHue(f: F): number {
  const hs: number[] = [];
  for (let i = 0; i < f.w * f.h; i++) {
    const c = f.lab(i);
    if (Math.hypot(c[1], c[2]) > 0.02) hs.push(hueDeg(c));
  }
  hs.sort((a, b) => a - b);
  return hs.length ? hs[hs.length >> 1] : 0;
}
/** An image doubled (nearest), as floats. */
function up2(f: F): F {
  const o = new F(f.w * 2, f.h * 2);
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) for (let k = 0; k < 3; k++) o.d[(y * o.w + x) * 3 + k] = f.d[((y >> 1) * f.w + (x >> 1)) * 3 + k];
  return o;
}
/** Mean SSIM of the lightness of two pictures of one size (Gaussian window, sigma 1.5). */
function ssim(a: F, b: F): number {
  const { w, h } = a, n = w * h;
  const A = lightness(a), B = lightness(b);
  const g = (v: Float32Array) => gauss(v, w, h, 1.5);
  const ma = g(A), mb = g(B);
  const saa = g(A.map((v) => v * v)), sbb = g(B.map((v) => v * v)), sab = g(A.map((v, i) => v * B[i]));
  const C1 = 0.01 ** 2, C2 = 0.03 ** 2;
  let t = 0;
  for (let i = 0; i < n; i++) {
    const va = saa[i] - ma[i] * ma[i], vb = sbb[i] - mb[i] * mb[i], cv = sab[i] - ma[i] * mb[i];
    t += ((2 * ma[i] * mb[i] + C1) * (2 * cv + C2)) / ((ma[i] * ma[i] + mb[i] * mb[i] + C1) * (va + vb + C2));
  }
  return t / n;
}
const ixToF = (q: Ix, p: Pal): F => F.of(q.toImg(p));

// --- the icons --------------------------------------------------------------------------------------

/** His square: 115x115 of his pixels (his full window height). */
const SIDE = 115;

interface Ctx {
  /** His square in his pixels, the reduction to this size (box mean with his marks), the picture the clean-up compares with. */
  W: F;
  red: Reduced;
  ref: F;
}

interface IconSpec {
  id: string;
  name: string;
  /** His label under the slot on the sheet. */
  label: string;
  /** Palette: k-means entries, lightness flattening, hue weight. */
  colors: number;
  flat: number;
  chroma: number;
  /** Hue weight when his pixels are put on the palette (default 1). */
  qChroma?: number;
  /** Extra palette entries sampled from places of his picture (his pixels; see sampleAt). `spare`: for the details only. */
  extra?: { box: [number, number, number, number]; lo: number; hi: number; spare: boolean; by?: 'L' | 'warm' | 'chroma'; only?: { hue?: [number, number]; minL?: number; maxL?: number }; why: string }[];
  /** His thin marks kept at 88 and at 44 (see MarkRule). */
  marks88?: MarkRule[];
  marks44?: MarkRule[];
  /** Bilateral smoothing of the box mean: [sigma space (px), sigma colour (OKLab)]; [0, 0] = none. */
  bil88?: [number, number];
  bil44: [number, number];
  /** At 44: areas of one colour up to this many pixels are merged into their neighbours (default 2). */
  clean44?: number;
  /** How far (OKLab) the picture must stand out from its ring for a 1- or 2-pixel area to stay as his mark: at 88, and at 44 when given. */
  mark88: number;
  mark44?: number;
  /** The hand-fixes, at either size, and what they put back (for the manifest). */
  art?: (pt: Paint, ctx: Ctx) => void;
  fixes?: string[];
}

interface Built {
  spec: IconSpec;
  pal: Pal;
  out: Record<number, { q: Ix; img: Img; box: F; base: Ix; ref: F; red: Reduced; checks: Checks }>;
  W: F;
}

function loadRef(name: string): Img {
  const path = join(REF, name);
  if (!existsSync(path)) throw new Error(`ui-icons-12: missing ${path} (run tools/refs/icons-from-ref-12.py first)`);
  return loadPng(path);
}

function buildIcon(spec: IconSpec): Built {
  const W = F.of(loadRef(`${spec.id}.png`));
  if (W.w !== SIDE || W.h !== SIDE) throw new Error(`ui-icons-12: ${spec.id}.png is ${W.w}x${W.h}, not his ${SIDE}x${SIDE} square`);
  const sheetCrop = F.of(loadRef(`${spec.id}@sheet.png`));
  const hc = hisColours(W);
  const base = makePalette(W, hc, spec.colors, spec.flat, spec.chroma);
  const rgb = [...base.rgb], spare = [...base.spare];
  for (const e of spec.extra ?? []) {
    const c = sampleAt(W, hc, e.box, e.lo, e.hi, e.by, e.only);
    if (!rgb.some((u) => u[0] === c[0] && u[1] === c[1] && u[2] === c[2])) rgb.push(c), spare.push(e.spare);
  }
  const pal = palOf(rgb, spare);
  pal.cw = spec.qChroma ?? 1;
  const hisPic88 = areaResize(sheetCrop, 88, 88);
  const out: Built['out'] = {};
  for (const N of [44, 88]) {
    const box = areaResize(sheetCrop, N, N);
    const red = reduceKeep(W, N, process.env.UI_NOMARKS ? [] : (N === 88 ? spec.marks88 : spec.marks44) ?? []);
    const [ss, sr] = N === 88 ? spec.bil88 ?? [0, 0] : spec.bil44;
    const ref = sr > 0 ? bilateral(red.box, ss, sr, 2) : red.box.clone();
    // His marks keep their own colour (the smoothing is for the rest).
    for (let i = 0; i < N * N; i++) if (red.mark[i]) for (let k = 0; k < 3; k++) ref.d[i * 3 + k] = red.img.d[i * 3 + k];
    const prot = new Set<number>();
    for (let i = 0; i < N * N; i++) if (red.speck[i]) prot.add(i);
    const minDiff = N === 88 ? spec.mark88 : spec.mark44;
    const stays = minDiff !== undefined ? hisMark(ref, minDiff) : undefined;
    const clean = N === 44 ? spec.clean44 ?? 2 : 2;
    const q0 = cleanup(quantize(ref, pal), pal, ref, clean, prot, stays);
    const pt = new Paint(q0.clone(), pal);
    for (let i = 0; i < N * N; i++) {
      if (red.speck[i]) pt.keep(i % N, Math.floor(i / N));
      const rules = (N === 88 ? spec.marks88 : spec.marks44) ?? [];
      const ink = red.mark[i] ? rules[red.mark[i] - 1].ink : undefined;
      if (ink) pt.px(i % N, Math.floor(i / N), ink);
    }
    if (!process.env.UI_NOART) spec.art?.(pt, { W, red, ref });
    const q = cleanup(pt.q, pal, ref, clean, pt.drawn, stays);
    // The small areas that stayed because the picture stands out there are his own marks.
    const hisSet = new Set(pt.his);
    if (stays) {
      const { lab, size } = components(q);
      for (let i = 0; i < N * N; i++) if (size[lab[i]] <= 2 && !pt.drawn.has(i)) hisSet.add(i);
    }
    const ours = ixToF(q, pal);
    const sm = smallClusters(q, hisSet, pt.drawn);
    out[N] = {
      q,
      img: q.toImg(pal),
      box,
      base: q0,
      ref,
      red,
      checks: {
        small: sm.all,
        smallHis: sm.his,
        smallDrawn: sm.drawn,
        smallOther: sm.other,
        lowFreq: +lowFreqDiff(ours, box).toFixed(2),
        lowFreqBoxOnPalette: +lowFreqDiff(ixToF(quantize(box, pal), pal), box).toFixed(2),
        ssim: +ssim(N === 44 ? up2(ours) : ours, hisPic88).toFixed(3),
        ssimBox: +ssim(N === 44 ? up2(box) : box, hisPic88).toFixed(3),
        hue: Math.round(medianHue(ours)),
        hueHis: Math.round(medianHue(box)),
        colours: new Set(q.d).size,
        thinRun: thinRun(q),
      },
    };
  }
  return { spec, pal, out, W };
}

// --- the details, per icon ---------------------------------------------------------------------------
//
// Traced on his pixels (his square shown under the icon's grid), in the icon's own pixels.
// Colours are his (each goes to the nearest entry of the icon's palette).

// His Sabueso rayo. The base is his box reduction with the white cores of his lightning kept (at
// 88 also his thinner cyan strands; at 44 the dark navy inside the wolf, so his open mouth and the
// shade under the eye stay dark). What the 44 still loses: his eye. It is a white slit of his
// (his pixels 91..95, 47..49) between the bright streak of his brow and the cyan outline of the
// snout, with his blue in between; the box mean spreads it into that cyan. Put back at its place:
// his white on the cell that holds the slit, his blue on the cell between it and the outline.
// (At 88 his eye is there as he drew it.)
function hound(pt: Paint): void {
  if (pt.N !== 44) return;
  pt.px(35, 18, '#f3fffe');
  pt.px(36, 18, '#1c88e6');
}

const ICONS: IconSpec[] = [
  {
    id: 'lightning_hound_raidon',
    name: 'Thunder Hound',
    label: 'SABUESO RAYO',
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    marks88: [
      { kind: 'bright', what: "the white cores of his lightning and the wolf's outline", r: 1, thr: 0.05, minL: 0.86, minPx: 6, speck: 0.12, share: 0.3 },
      { kind: 'bright', what: 'his thinner cyan strands', r: 1, thr: 0.08, minL: 0.6, maxL: 0.86, minPx: 5, share: 0.35, mix: 0.8 },
    ],
    // At 44 only his longest white cores, softened: kept all and in full, they turned the wolf into
    // a white web (one of his pixels is a third of a pixel here).
    marks44: [
      { kind: 'bright', what: "the white cores of his lightning and the wolf's outline", r: 1, thr: 0.05, minL: 0.9, minPx: 12, share: 0.35, mix: 0.6 },
      { kind: 'dark', what: 'the dark navy inside the wolf (the open mouth, under the eye, between the legs)', r: 1, thr: 0.06, maxL: 0.4, minPx: 6, share: 0.4, mix: 0.7 },
    ],
    bil44: [0, 0],
    mark88: 0.06,
    art: hound,
    fixes: ['44: his eye, the white slit between his brow streak and the cyan outline of the snout (his pixels 91..95, 47..49): his white #f3fffe at 35,18 and his blue #1c88e6 at 36,18'],
  },
  {
    id: 'crescent_moon_dance',
    name: 'Crescent Moon Dance',
    label: 'LUNA CRECIENTE',
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    marks88: [
      { kind: 'bright', what: "his golden dots, sparkles and the ninjas' eyes", r: 1, thr: 0.08, minL: 0.5, minPx: 3, speck: 0.1, share: 0.3 },
      { kind: 'dark', what: 'the dark silhouettes of his ninjas', r: 1, thr: 0.03, maxL: 0.3, minPx: 6, share: 0.4 },
    ],
    marks44: [
      { kind: 'bright', what: 'his golden dots and sparkles', r: 1, thr: 0.1, minL: 0.55, minPx: 3, speck: 0.15, share: 0.3, mix: 0.8 },
      { kind: 'dark', what: 'the dark silhouettes of his ninjas', r: 1, thr: 0.04, maxL: 0.3, minPx: 8, share: 0.4, mix: 0.8 },
    ],
    bil44: [0, 0],
    mark88: 0.06,
  },
  {
    id: 'temple_of_nirvana',
    name: 'Temple of Nirvana',
    label: 'NIRVANA',
    // More entries, hue weighed up: his haze runs from violet to lilac, blue and teal, which 22
    // entries chosen mostly by lightness flattened into one lavender.
    colors: 28,
    flat: 0.5,
    chroma: 2.2,
    qChroma: 1.6,
    extra: [
      { box: [0, 60, 115, 115], lo: 0.5, hi: 0.9, spare: false, by: 'chroma', only: { hue: [200, 250], minL: 0.5, maxL: 0.72 }, why: 'the teal of his haze at the bottom' },
      { box: [50, 40, 100, 100], lo: 0.7, hi: 0.95, spare: false, by: 'chroma', only: { hue: [255, 272], minL: 0.68, maxL: 0.8 }, why: 'the blue glow round his feathers' },
      { box: [50, 40, 100, 100], lo: 0.4, hi: 0.7, spare: false, by: 'chroma', only: { hue: [255, 275], minL: 0.8, maxL: 0.88 }, why: 'the light blue between the barbs of his feathers' },
    ],
    // His feathers: white quills, white barbs with light blue gaps between them, a blue glow round
    // them; the box mean turns them into flat pale bananas. The gaps (darker than their white
    // neighbours, and only next to his white) keep their light blue; at 44 also the longest white
    // lines of the quills keep their white.
    marks88: [
      { kind: 'bright', what: 'his sparkles, specks and the tips of his quills', r: 1, thr: 0.08, minL: 0.75, minPx: 3, speck: 0.1, share: 0.3 },
      { kind: 'dark', what: 'the light blue gaps between the barbs of his feathers', r: 1, thr: 0.02, minL: 0.7, maxL: 0.95, minPx: 2, share: 0.35, near: { minL: 0.96, r: 1 } },
    ],
    marks44: [
      { kind: 'bright', what: 'his sparkles and specks', r: 1, thr: 0.12, minL: 0.8, minPx: 3, speck: 0.15, share: 0.3, mix: 0.85 },
      { kind: 'bright', what: 'the white quills of his feathers', r: 1, thr: 0.025, minL: 0.97, minPx: 6, share: 0.35 },
      { kind: 'dark', what: 'the light blue gaps between the barbs of his feathers', r: 1, thr: 0.03, minL: 0.7, maxL: 0.94, minPx: 2, share: 0.25, mix: 0.8, near: { minL: 0.96, r: 1 } },
    ],
    bil44: [0, 0],
    mark44: 0.08,
    mark88: 0.06,
  },
];

// --- the slot frame (sheet 1's, read only) ------------------------------------------------------------

const SLOT = 56, RING = 6;
function loadFrame(name: string): Img {
  const path = join(FRAME_DIR, name);
  if (!existsSync(path)) throw new Error(`ui-icons-12: missing ${path} (sheet 1's frame: set UI_FRAME to src/assets/ui_icons)`);
  const img = loadPng(path);
  if (img.w !== SLOT || img.h !== SLOT) throw new Error(`ui-icons-12: ${path} is ${img.w}x${img.h}, not ${SLOT}x${SLOT}`);
  return img;
}
const frame = loadFrame('skill_slot_steel.png');
const frameActive = loadFrame('skill_slot_steel_active.png');

// --- build, write, check ------------------------------------------------------------------------------

const only = process.env.UI_ONLY ? new Set(process.env.UI_ONLY.split(',')) : null;
const crops = JSON.parse(readFileSync(join(REF, 'crops.json'), 'utf8')) as { icons: Record<string, { window: number[]; windowSize: number[]; square: number[]; squareInWindow: number[]; cutColumns: number[]; cornerTipsFilled: number[][] }> };
const TUNE = process.env.UI_TUNE ? (JSON.parse(process.env.UI_TUNE) as Record<string, Partial<IconSpec>>) : {};
const built = ICONS.filter((s) => !only || only.has(s.id)).map((s) => buildIcon({ ...s, ...(TUNE[s.id] ?? {}) }));
for (const b of built) {
  console.log(b.spec.id, b.pal.rgb.length, b.pal.rgb.map((c, i) => toHex(c) + (b.pal.spare[i] ? '*' : '')).join(' '));
  for (const N of [44, 88]) {
    const per = ((N === 88 ? b.spec.marks88 : b.spec.marks44) ?? []).map((r, k) => `${r.what}: ${b.out[N].red.mark.filter((m) => m === k + 1).length}`);
    console.log('  ', N, JSON.stringify(b.out[N].checks));
    console.log('      marks:', per.join('; '));
  }
}

if (DEBUG) {
  for (const b of built) {
    const o44 = b.out[44], o88 = b.out[88];
    // Stages: box mean, with his marks, on the palette, final; at 44 (x8) and 88 (x4).
    const Z = 8;
    const sheet = new Img(44 * Z * 4 + 30, 44 * Z * 2 + 10);
    sheet.fill(hex('#101014'));
    sheet.draw(o44.red.box.toImg().scaled(Z), 0, 0);
    sheet.draw(o44.red.img.toImg().scaled(Z), 44 * Z + 10, 0);
    sheet.draw(o44.base.toImg(b.pal).scaled(Z), 2 * (44 * Z + 10), 0);
    sheet.draw(o44.img.scaled(Z), 3 * (44 * Z + 10), 0);
    sheet.draw(o88.red.box.toImg().scaled(4), 0, 44 * Z + 10);
    sheet.draw(o88.red.img.toImg().scaled(4), 44 * Z + 10, 44 * Z + 10);
    sheet.draw(o88.base.toImg(b.pal).scaled(4), 2 * (44 * Z + 10), 44 * Z + 10);
    sheet.draw(o88.img.scaled(4), 3 * (44 * Z + 10), 44 * Z + 10);
    savePng(join(DEBUG, `dbg-${b.spec.id}.png`), sheet);
    savePng(join(DEBUG, `${b.spec.id}-his-x6.png`), b.W.toImg().scaled(6));
    savePng(join(DEBUG, `${b.spec.id}-44.png`), o44.img);
    savePng(join(DEBUG, `${b.spec.id}-88.png`), o88.img);
    // The 44 as text (one letter per palette entry), to trace the hand-fixes on.
    const A = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const [N, o] of [[44, o44], [88, o88]] as const)
      writeAtomic(join(DEBUG, `${b.spec.id}-${N}.txt`), b.pal.rgb.map((c, i) => A[i] + ' ' + toHex(c)).join('\n') + '\n\n' + Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) => A[o.q.get(x, y)]).join('')).join('\n') + '\n');
    savePng(join(DEBUG, `${b.spec.id}-88-x6.png`), o88.img.scaled(6));
    savePng(join(DEBUG, `${b.spec.id}-box88-x6.png`), o88.box.toImg().scaled(6));
    savePng(join(DEBUG, `${b.spec.id}-44-x10.png`), o44.img.scaled(10));
    savePng(join(DEBUG, `${b.spec.id}-box44-x10.png`), o44.box.toImg().scaled(10));
    // His mark masks over his pixels (rule colours; lone specks lighter), per size.
    for (const N of [44, 88]) {
      const mk = b.W.toImg();
      const masks = b.out[N].red.masks;
      for (let i = 0; i < b.W.w * b.W.h; i++) {
        const x = i % b.W.w, y = Math.floor(i / b.W.w);
        const cols = ['#ffd800', '#ff00c8', '#00ffd0', '#ff7000'];
        for (let r = masks.length - 1; r >= 0; r--) if (masks[r][i]) mk.set(x, y, hex(cols[r % cols.length], masks[r][i] === 2 ? 160 : 255));
      }
      savePng(join(DEBUG, `${b.spec.id}-marks${N}-x6.png`), mk.scaled(6));
      const o = b.out[N];
      const { lab, size } = components(o.q);
      const m = o.img.clone();
      for (let i = 0; i < N * N; i++) if (size[lab[i]] <= 2) m.set(i % N, Math.floor(i / N), hex('#ff00ff'));
      savePng(join(DEBUG, `${b.spec.id}-${N}-small-x${N === 44 ? 8 : 4}.png`), m.scaled(N === 44 ? 8 : 4));
    }
  }
}

if (only) process.exit(0);

for (const b of built) {
  savePng(join(OUT, `${b.spec.id}.png`), b.out[44].img);
  savePng(join(OUT, `${b.spec.id}@2x.png`), b.out[88].img);
}

// --- manifest -------------------------------------------------------------------------------------

const manifest = {
  kit: 'ui_icons_12',
  references: ['docs/reference/icons-owner-reference-12.jpg'],
  round: 1,
  screen: [1600, 900],
  pixel: 'one art pixel per screen pixel (as ui_icons, sheet 1): draw at 1x on a 1600x900 screen, @2x on a 2x screen, always with image-rendering: pixelated',
  frame: {
    from: 'ui_icons (sheet 1), read only: skill_slot_steel.png and skill_slot_steel_active.png, 56x56, the icon window 44x44 at 6,6; see ui_icons/manifest.json for its slices',
    window: { x: RING, y: RING, w: SLOT - 2 * RING, h: SLOT - 2 * RING },
  },
  method:
    'his sheet is pixel art (480x268 scaled 4.1667x and saved as JPEG); his pixels are taken back first (tools/refs/icons-from-ref-12.py, with the grid of icons-from-ref-23.py). His windows are wider than tall (144x115, 128x115, 135x115 of his pixels): each icon is the square of his full height (115x115) that holds his whole subject, so his proportions stay as he drew them (the columns left out are listed per icon). 88 and 44: area mean of his pixels, except his thin lines and strongest specks (and, per icon, his dark silhouettes and the gaps between his feather barbs), which keep their own colour one pixel wide (115 of his pixels are too many for the 88 to keep them one to one: dropping 27 columns and rows breaks his one-pixel lines); palette sampled from his pixels; nearest palette entry, 1-2 pixel areas merged where the picture does not stand out there; then hand-fixes only where that still loses his picture (listed per icon; see tools/ui/ui-icons-12.ts)',
  checks:
    'small = 8-connected areas of one colour of 1 or 2 pixels: smallHis are his own marks (the picture stands out there, or one of his kept specks), smallDrawn hold a hand-fixed detail, smallOther are left over from the reduction; lowFreq = mean OKLab difference x100 to his box reduction after both are blurred (sigma size/30), lowFreqBoxOnPalette = the same for his box reduction put on our palette; ssim = structural similarity of the lightness (Gaussian window sigma 1.5) to his picture box-reduced to 88, ours (the 44 shown 2x) against ssimBox, his own box reduction to 44 shown 2x; hue = OKLab median hue in degrees (hueHis: his box reduction); thinRun = the longest straight run of one colour one pixel thick [length, row or col, index]',
  icons: Object.fromEntries(
    built.map((b) => {
      const c = crops.icons[b.spec.id];
      return [
        b.spec.id,
        {
          name: b.spec.name,
          label: b.spec.label,
          sheet: 'docs/reference/icons-owner-reference-12.jpg',
          file: `${b.spec.id}.png`,
          file2x: `${b.spec.id}@2x.png`,
          size: [44, 44],
          size2x: [88, 88],
          hisWindow: c.windowSize,
          hisWindowBox: c.window,
          square: { box: c.square, columnsInWindow: [c.squareInWindow[0], c.squareInWindow[2] - 1], cutColumns: c.cutColumns, cornerTipsFilled: c.cornerTipsFilled },
          reduced88: `area mean of his ${SIDE}x${SIDE} pixels to 88, his marks kept`,
          marks: {
            '88': (b.spec.marks88 ?? []).map((r) => r.what),
            '44': (b.spec.marks44 ?? []).map((r) => r.what),
          },
          palette: b.pal.rgb.map(toHex),
          paletteDetailOnly: b.pal.rgb.filter((_, i) => b.pal.spare[i]).map(toHex),
          sampled: (b.spec.extra ?? []).map((e) => e.why),
          handFixes: b.spec.fixes ?? [],
          checks: { '44': b.out[44].checks, '88': b.out[88].checks },
          use: 'Hotbar skill icon: fills the 44x44 window of skill_slot_steel (ui_icons), at 6,6.',
        },
      ];
    }),
  ),
};
writeAtomic(join(OUT, 'manifest_12.json'), JSON.stringify(manifest, null, 1) + '\n');

// --- comparison sheets ------------------------------------------------------------------------------

/** Our icons in our frame, in a row like his picture; `k` = 1 (the 44s in the 56 frame) or 2 (the @2x files in the frame shown 2x). */
function slotRow(list: Built[], k: 1 | 2, act = -1): Img {
  const gap = 4 * k, S = SLOT * k;
  const row = new Img(list.length * S + (list.length - 1) * gap, S);
  list.forEach((b, i) => {
    const x = i * (S + gap);
    row.draw(k === 1 ? b.out[44].img : b.out[88].img, x + RING * k, RING * k);
    const f = i === act ? frameActive : frame;
    row.draw(k === 1 ? f : f.scaled(2), x, 0);
  });
  return row;
}

/** A picture scaled to a height (nearest when it divides, area mean otherwise). */
function toHeight(img: Img, h: number): Img {
  if (img.h === h) return img;
  if (h % img.h === 0) return img.scaled(h / img.h);
  const w = Math.round((img.w * h) / img.h);
  return areaResize(F.of(img), w, h).toImg();
}

if (process.env.UI_SHEETS) {
  const BG = hex('#15171d'), HEAD = hex('#e9dfc4'), SUB = hex('#9aa3b0'), MARK = hex('#e0b84a');
  const pad = 24, gap = 24, LEFT = 230;
  const compose = (parts: { img: Img; x: number; y: number }[], h: number, file: string) => {
    const W = Math.max(...parts.map((p) => p.x + p.img.w)) + pad;
    const out = new Img(W, h);
    out.fill(BG);
    for (const p of parts) out.draw(p.img, p.x, p.y);
    savePng(join(process.env.UI_SHEETS!, file), out);
  };
  // 1. His whole window (his pixels, as tall as ours; gold ticks above and below mark the square we
  //    take), ours at 88, ours at 44 shown 2x; then the same at 2x.
  {
    const parts: { img: Img; x: number; y: number }[] = [];
    let y = pad;
    const put = (img: Img, x: number) => parts.push({ img, x, y });
    const title = screenText('SKILL ICONS 12  -  his window beside ours', 'title', HEAD);
    put(title, pad);
    y += title.h + 14;
    for (const z of [1, 2]) {
      const H = 88 * z;
      put(screenText(z === 1 ? 'As big as in the game at 2x: his window 88 tall, our 88, our 44 shown 2x' : 'All of it at 2x', 'label', SUB), pad);
      y += 24;
      for (const b of built) {
        const c = crops.icons[b.spec.id];
        const win = loadRef(`${b.spec.id}@window.png`);
        const k = H / win.h;
        const his = toHeight(win, H);
        // Ticks: the square's first and last column of his window.
        const tick = new Img(his.w, 6);
        const x0 = Math.round(c.squareInWindow[0] * k), x1 = Math.round(c.squareInWindow[2] * k) - 1;
        for (let t = 0; t < 6; t++) for (const xx of [x0, x0 + 1, x1 - 1, x1]) tick.set(Math.max(0, Math.min(his.w - 1, xx)), t, MARK);
        for (let xx = x0; xx <= x1; xx++) tick.set(xx, 2, MARK);
        put(screenText(b.spec.label, 'label', HEAD), pad);
        parts.push({ img: screenText(b.spec.id, 'label', SUB), x: pad, y: y + 20 });
        parts.push({ img: tick, x: pad + LEFT, y: y });
        parts.push({ img: his, x: pad + LEFT, y: y + 8 });
        parts.push({ img: tick, x: pad + LEFT, y: y + 10 + H });
        const xo = pad + LEFT + Math.round(144 * k) + gap;
        parts.push({ img: b.out[88].img.scaled(z), x: xo, y: y + 8 });
        parts.push({ img: b.out[44].img.scaled(2 * z), x: xo + H + gap, y: y + 8 });
        parts.push({ img: b.out[44].img, x: xo + 2 * (H + gap), y: y + 8 });
        y += H + 16 + gap;
      }
      y += 10;
    }
    put(screenText('Columns: his window (the gold ticks mark the square used), ours 88, ours 44 at 2x, ours 44 at 1x', 'label', SUB), pad);
    y += 24 + pad;
    compose(parts, y, 'ui-icons-12-compare.png');
  }
  // 2. In the steel slot: his row, ours at 1x and at 2x (and selected).
  {
    const parts: { img: Img; x: number; y: number }[] = [];
    let y = pad;
    const put = (img: Img, x: number) => parts.push({ img, x, y });
    put(screenText('SKILL ICONS 12 IN THE SLOT  -  his row, then ours', 'title', HEAD), pad);
    y += 34;
    const h4 = join(REF, 'row-12@4x.png'), h1 = join(REF, 'row-12@1x.png');
    put(screenText('His row (his window as tall as ours at 4x)', 'label', SUB), pad);
    y += 22;
    const hr4 = loadPng(h4);
    put(hr4, pad);
    y += hr4.h + 16;
    put(screenText('Ours in the slot at 4x (the 44s, nearest)', 'label', SUB), pad);
    y += 22;
    const r1 = slotRow(built, 1);
    put(r1.scaled(4), pad);
    y += r1.h * 4 + 16;
    put(screenText('At 1x: his row, ours, ours with the first selected', 'label', SUB), pad);
    y += 22;
    const hr1 = loadPng(h1);
    put(hr1, pad);
    put(r1, pad + hr1.w + 40);
    put(slotRow(built, 1, 0), pad + hr1.w + 40 + r1.w + 40);
    y += Math.max(hr1.h, r1.h) + 16;
    put(screenText('At 2x (a 2x screen: the frame doubled, the 88 icons), then the first selected', 'label', SUB), pad);
    y += 22;
    const r2 = slotRow(built, 2);
    put(r2, pad);
    put(slotRow(built, 2, 0), pad + r2.w + 40);
    y += r2.h + pad;
    compose(parts, y, 'ui-icons-12-slots.png');
  }
}
