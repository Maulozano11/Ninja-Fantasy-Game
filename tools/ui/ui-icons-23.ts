// Hotbar skill icons, sheets 2 and 3: the owner's icons (docs/reference/icons-owner-reference-2.jpg
// and -3.jpg) brought down to the hotbar's 44x44 window (and its 88x88 @2x file), as exactly as
// possible. Sheet 1 (tools/ui/ui-icons.ts) stays as it is; this file copies the helpers it needs from
// it (that file builds and writes its icons as soon as it is loaded, so it cannot be imported).
//
//   python3 -I tools/refs/icons-from-ref-23.py docs/reference/icons-owner-reference-2.jpg \
//       docs/reference/icons-owner-reference-3.jpg <stagingDir>
//   UI_OUT=<stagingDir> npx tsx tools/ui/ui-icons-23.ts
//
// reads his windows from <stagingDir>/ref/<jutsu id>.png (in his own pixels) and writes
// <stagingDir>/<jutsu id>.png (44x44, the slot window, shown at 1x), <jutsu id>@2x.png (88x88) and
// manifest.json. It refuses to run without UI_OUT. Every file is written under a temporary name and
// renamed into place, and the same crops always give the same bytes. The slot frame is sheet 1's
// (skill_slot_steel.png and skill_slot_steel_active.png), read from UI_FRAME (default: the folder
// ui_icons next to UI_OUT) and never written.
//
// Optional: UI_SHEETS=<dir> also writes <dir>/ui-icons-23-compare.png (his icons beside ours, and his
// two rows beside ours in the frame). UI_DEBUG=<dir> writes every stage of every icon at x8.
//
// What is different from sheet 1: these two sheets are pixel art. Each is a 480x268 picture scaled up
// 4.1667 times and saved as JPEG; the crop script takes his pixels back (the median of each block's
// interior), so his windows here are his own pixels: 90x90 on sheet 2, 93x91 on sheet 3.
//
// How an icon is made:
//  1. His window in his own pixels. On sheet 2 the tip of each gold bracket (and its dark edge)
//     reaches into the corner of his window: those three pixels per corner take his art next to them.
//  2. The palette: k-means in OKLab on his pixels (each pixel weighted by how rare its lightness is,
//     so a big dark ground does not take most of the entries), each centre replaced by the nearest
//     colour that really occurs in his pixels; plus a few entries sampled from given places of his
//     picture (his whitest core, a spark). One palette per icon, used at both sizes. No dither.
//  3. 88 (the @2x file): his own pixels. His window is 90 (or 93x91) of his pixels, so the 88 keeps
//     his pixels one to one and drops the 2 (or 5 and 3) columns and rows that show least: a column
//     whose pixels match their neighbour's is dropped without a trace (chosen by dynamic programming,
//     spread at least 60% of the even spacing apart). Then nearest palette entry. A 1- or 2-pixel area
//     of one colour is merged into its neighbours only where his own pixels there do not stand out
//     (it is the palette splitting one of his tones); where they do, it is his mark and it stays.
//  4. 44: area mean (box) of his pixels, except his thin marks: where his picture has a thin bright
//     line or speck (lighter than everything within one or two of his pixels: the lightning, the
//     spiral strands, the slime drops' shine, the water's spray) or a thin dark one (the cracks and
//     roots, the boulders' outlines, the sword's outline), the 44 pixel holding its centre takes the
//     line's own colour instead of the mean, so the line stays one clean pixel wide instead of
//     fading into its ground. Only lines of several of his pixels count (and, per icon, his
//     strongest specks), so his texture is not turned into noise. Then a light edge-preserving
//     smoothing of the rest (bilateral in OKLab), nearest palette entry, and the clean-up: every
//     1- or 2-pixel area of one colour joins the neighbouring colour nearest to the smoothed picture.
//  5. Hand-fixes, per icon, only for what that reduction still loses (see each icon's comment),
//     traced on his pixels. These pixels are protected; the clean-up runs again on the rest.
//  6. Checks (printed and written to the manifest): small clusters (his marks, drawn details, left
//     over from the reduction), the colour difference to his box reduction after both are blurred
//     (sigma size/30, as sheet 1), and how close each 44 is to his picture: the structural
//     similarity (SSIM, lightness, sigma 1.5) of ours at 44 shown 2x and of his own box reduction to
//     44 shown 2x, both against his picture box-reduced to 88.

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Img, RGBA, hex, loadPng, savePng, toHex, writeAtomic } from './ui-img';
import { screenText } from './ui-font';

if (!process.env.UI_OUT) {
  console.error('ui-icons-23: set UI_OUT to the staging folder (nothing is written to src/ by this tool).');
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
  if (!px.length) throw new Error('ui-icons-23: sampleAt found none of his pixels there');
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

/** His window with the gold bracket tips in its corners (sheet 2) painted over with his art next to them. */
function prepWin(img: Img, tips: boolean): Img {
  if (!tips) return img;
  const o = img.clone();
  const { w, h } = img;
  for (const [cx, cy, sx, sy] of [[0, 0, 1, 1], [w - 1, 0, -1, 1], [0, h - 1, 1, -1], [w - 1, h - 1, -1, -1]]) {
    o.set(cx, cy, img.get(cx + sx, cy + sy));
    o.set(cx + sx, cy, img.get(cx + 2 * sx, cy));
    o.set(cx, cy + sy, img.get(cx, cy + 2 * sy));
  }
  return o;
}

/**
 * Which of his lines (columns for axis 'x', rows for 'y') to keep so that `n` are left: the ones
 * dropped are those that show least. Dropping a line costs, summed along it, how far each of its
 * pixels is from the nearer of its two neighbours (a line that repeats its neighbour drops without a
 * trace; at the edge it is the one neighbour). Dropped lines are at least 60% of the even spacing
 * apart, so the picture is not squeezed in one place. Dynamic programming over all choices.
 */
function keptLines(W: F, n: number, axis: 'x' | 'y'): number[] {
  const len = axis === 'x' ? W.w : W.h, along = axis === 'x' ? W.h : W.w, m = len - n;
  const all = Array.from({ length: len }, (_, i) => i);
  if (m <= 0) return all;
  const labs: Lab[] = [];
  for (let i = 0; i < W.w * W.h; i++) labs.push(W.lab(i));
  const at = (line: number, t: number): Lab => (axis === 'x' ? labs[t * W.w + line] : labs[line * W.w + t]);
  const cost = all.map((i) => {
    let c = 0;
    for (let t = 0; t < along; t++) {
      const me = at(i, t);
      const l = i > 0 ? Math.sqrt(dist(me, at(i - 1, t))) : Infinity, r = i < len - 1 ? Math.sqrt(dist(me, at(i + 1, t))) : Infinity;
      c += Math.min(l, r);
    }
    return c;
  });
  const gap = Math.max(2, Math.floor((len / (m + 1)) * 0.6));
  // best[j][i]: least cost of dropping j + 1 lines, the last of them line i.
  const best: number[][] = [], from: number[][] = [];
  for (let j = 0; j < m; j++) {
    best.push(new Array(len).fill(Infinity));
    from.push(new Array(len).fill(-1));
    for (let i = 0; i < len; i++) {
      if (j === 0) {
        best[0][i] = cost[i];
        continue;
      }
      for (let k = 0; k + gap <= i; k++)
        if (best[j - 1][k] + cost[i] < best[j][i]) (best[j][i] = best[j - 1][k] + cost[i]), (from[j][i] = k);
    }
  }
  let last = 0;
  for (let i = 1; i < len; i++) if (best[m - 1][i] < best[m - 1][last]) last = i;
  const drop = new Set<number>();
  for (let j = m - 1, i = last; j >= 0; i = from[j][i], j--) drop.add(i);
  return all.filter((i) => !drop.has(i));
}

/** His pixels at 88: the kept columns and rows of his window, one to one. */
function his88(W: F): { img: F; cols: number[]; rows: number[] } {
  const cols = keptLines(W, 88, 'x'), rows = keptLines(W, 88, 'y');
  const o = new F(88, 88);
  rows.forEach((sy, y) => cols.forEach((sx, x) => {
    for (let k = 0; k < 3; k++) o.d[(y * 88 + x) * 3 + k] = W.d[(sy * W.w + sx) * 3 + k];
  }));
  return { img: o, cols, rows };
}

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
    const m = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) m[i] = t[i] > rule.thr && L[i] >= (rule.minL ?? 0) && L[i] <= (rule.maxL ?? 1) && C[i] >= (rule.minC ?? 0) && inHue(i) ? 1 : 0;
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
        if (!(ch in legend)) throw new Error(`ui-icons-23: no colour for '${ch}'`);
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

interface Ctx {
  /** His window in his pixels (corners cleaned), his pixels at 88 (`his88`), the 44 reduction. */
  W: F;
  his88: F;
  red: Reduced;
  /** The picture the clean-up compares with: at 88 his pixels, at 44 the reduction smoothed. */
  ref: F;
}

interface IconSpec {
  id: string;
  name: string;
  sheet: '2' | '3' | '4' | '5' | '6' | '7';
  /** Palette: k-means entries, lightness flattening, hue weight. */
  colors: number;
  flat: number;
  chroma: number;
  /** Hue weight when his pixels are put on the palette (default 1). */
  qChroma?: number;
  /** Extra palette entries sampled from places of his picture (his pixels; see sampleAt). `spare`: for the details only. */
  extra?: { box: [number, number, number, number]; lo: number; hi: number; spare: boolean; by?: 'L' | 'warm' | 'chroma'; only?: { hue?: [number, number]; minL?: number; maxL?: number }; why: string }[];
  /** His thin marks kept at 44 (see MarkRule). */
  marks?: MarkRule[];
  /** Bilateral smoothing of the box mean at 44: [sigma space (px), sigma colour (OKLab)]; [0, 0] = none. */
  bil44: [number, number];
  /** At 44: areas of one colour up to this many pixels are merged into their neighbours (default 2). */
  clean44?: number;
  /** At 88: how far (OKLab) his pixels must stand out for a 1- or 2-pixel area to stay as his mark. */
  mark88: number;
  /** The hand-fixes, at either size. */
  art?: (pt: Paint, ctx: Ctx) => void;
}

interface Built {
  spec: IconSpec;
  pal: Pal;
  out: Record<number, { q: Ix; img: Img; box: F; base: Ix; ref: F; checks: Checks }>;
  red: Reduced;
  W: F;
  cols: number[];
  rows: number[];
  hisLanczos88: Img | null;
}

function loadRef(name: string): Img {
  const path = join(REF, name);
  if (!existsSync(path)) throw new Error(`ui-icons-23: missing ${path} (run tools/refs/icons-from-ref-23.py first)`);
  return loadPng(path);
}

function buildIcon(spec: IconSpec): Built {
  const W = F.of(prepWin(loadRef(`${spec.id}.png`), spec.sheet === '2'));
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
  const h88 = his88(W);
  const red = reduceKeep(W, 44, process.env.UI_NOMARKS ? [] : spec.marks ?? []);
  const hisPic88 = areaResize(sheetCrop, 88, 88);
  const out: Built['out'] = {};
  for (const N of [44, 88]) {
    const box = areaResize(sheetCrop, N, N);
    let ref: F, q0: Ix;
    if (N === 88) {
      ref = h88.img;
      q0 = cleanup(quantize(ref, pal), pal, ref, 2, new Set(), hisMark(ref, spec.mark88));
    } else {
      const [ss, sr] = spec.bil44;
      const sm = sr > 0 ? bilateral(red.box, ss, sr, 2) : red.box.clone();
      // His marks keep their own colour (the smoothing is for the rest).
      for (let i = 0; i < 44 * 44; i++) if (red.mark[i]) for (let k = 0; k < 3; k++) sm.d[i * 3 + k] = red.img.d[i * 3 + k];
      ref = sm;
      const prot = new Set<number>();
      for (let i = 0; i < 44 * 44; i++) if (red.speck[i]) prot.add(i);
      q0 = cleanup(quantize(ref, pal), pal, ref, spec.clean44 ?? 2, prot);
    }
    const pt = new Paint(q0.clone(), pal);
    if (N === 44)
      for (let i = 0; i < 44 * 44; i++) {
        if (red.speck[i]) pt.keep(i % 44, Math.floor(i / 44));
        const ink = red.mark[i] ? (spec.marks ?? [])[red.mark[i] - 1].ink : undefined;
        if (ink) pt.px(i % 44, Math.floor(i / 44), ink);
      }
    if (!process.env.UI_NOART) spec.art?.(pt, { W, his88: h88.img, red, ref });
    const q = cleanup(pt.q, pal, ref, N === 44 ? spec.clean44 ?? 2 : 2, pt.drawn, N === 88 ? hisMark(ref, spec.mark88) : undefined);
    // At 88 the small areas that stayed are his own marks.
    const hisSet = new Set(pt.his);
    if (N === 88) {
      const { lab, size } = components(q);
      for (let i = 0; i < 88 * 88; i++) if (size[lab[i]] <= 2 && !pt.drawn.has(i)) hisSet.add(i);
    }
    const ours = ixToF(q, pal);
    const sm = smallClusters(q, hisSet, pt.drawn);
    out[N] = {
      q,
      img: q.toImg(pal),
      box,
      base: q0,
      ref,
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
  const p88 = join(REF, `${spec.id}@88.png`);
  return { spec, pal, out, red, W, cols: h88.cols, rows: h88.rows, hisLanczos88: existsSync(p88) ? loadPng(p88) : null };
}

// --- the details, per icon ---------------------------------------------------------------------------
//
// Traced on his pixels (tools: his window shown under the 44 grid), in the icon's own pixels (44).
// Colours are his (each goes to the nearest entry of the icon's palette). At 88 the icons are his
// own pixels and need no hand-fixes.

/** Pixel centres inside a polygon. */
function inPoly(poly: [number, number][], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/**
 * One of his four-pointed sparkles at 44: the centre pixel in his white, then along each arm (up,
 * right, down, left: how many pixels) his bright gold next to the centre and his gold beyond, the
 * last pixel of a long arm in his dim gold, as his arms fade.
 */
function sparkle(pt: Paint, cx: number, cy: number, arms: [number, number, number, number], cols: { white: string; bright: string; gold: string; dim: string }): void {
  pt.px(cx, cy, cols.white);
  const dirs: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  arms.forEach((n, k) => {
    for (let i = 1; i <= n; i++) pt.px(cx + dirs[k][0] * i, cy + dirs[k][1] * i, i === 1 ? cols.bright : i === n && n >= 3 ? cols.dim : cols.gold);
  });
}


// His Earth Bullets: his three boulders (centre and semi-axes at 44, traced on his pixels), where his
// near-black outline is kept as one tinted dark line; his dust trails keep their own dark strands.
const B_BOULDERS: [number, number, number, number][] = [[7.1, 10.2, 6, 5], [11.8, 30.4, 9, 8.6], [35.3, 35.2, 6.2, 7.4]];
const onBoulder = (x: number, y: number): boolean => B_BOULDERS.some(([cx, cy, rx, ry]) => Math.hypot((x - cx) / rx, (y - cy) / ry) <= 1.08);

// His Rasengan. The base is his box reduction with his brightest spiral strands kept. What it still
// loses: his four bright motes flying off the ends of the outer arms (found on his pixels: the only
// near-white specks with a dark ground all round, outside his spiral). Each is put back at its place
// as his near-white centre with his cyan glow on its four sides.
const R_MOTES: [number, number][] = [[19, 6], [82, 24], [62, 84], [7, 63]];
function rasengan(pt: Paint, ctx: Ctx): void {
  if (pt.N !== 44) return;
  for (const [x, y] of R_MOTES) {
    const cx = Math.floor(((x + 0.5) * 44) / ctx.W.w), cy = Math.floor(((y + 0.5) * 44) / ctx.W.h);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (pt.L(cx + dx, cy + dy) < 0.62) pt.px(cx + dx, cy + dy, '#1cabf4');
    pt.px(cx, cy, '#edffff');
  }
}

// His Venom Surge. The base is his box reduction with his marks kept (the pale shine on his drops,
// the dark green rims and stream lines). What it still loses: his drops as round drops. Each of his
// drops (found on his pixels as a lime disc inside a dark green ring, and checked one by one: his
// centre and radius in his pixels) is put back at its place and size: his brightest lime inside, his
// dark green rim on its lower right, on the three biggest a ring all round (his mid green on the lit
// side), his pale shine at its upper left.
const V_DROPS: [number, number, number][] = [
  [50, 33, 4], [81, 57, 4.5], [82, 27, 4], [78, 38, 3], [52, 56, 3], [71, 28, 3], [82, 21, 2.5],
  [60, 42, 2], [63, 29, 2], [68, 61, 2], [59, 57, 2], [57, 50, 2], [71, 11, 2], [82, 72, 2],
  [74, 65, 1.5], [27, 35, 1.5], [21, 52, 1.5],
];
function drop(pt: Paint, W: F, x: number, y: number, r: number, cols: { lime: string; rim: string; ring: string; shine: string }): void {
  const cx = ((x + 0.5) * 44) / W.w - 0.5, cy = ((y + 0.5) * 44) / W.h - 0.5, R = (r * 44) / W.w;
  const px: [number, number, number][] = [];
  for (let yy = Math.floor(cy - R - 1); yy <= Math.ceil(cy + R + 1); yy++)
    for (let xx = Math.floor(cx - R - 1); xx <= Math.ceil(cx + R + 1); xx++) {
      const d = Math.hypot(xx - cx, yy - cy);
      if (d <= Math.max(0.75, R)) px.push([xx, yy, d]);
    }
  for (const [xx, yy, d] of px) {
    const edge = d > R - 0.75 && R >= 1.2;
    const lowerRight = xx - cx + (yy - cy) > 0.3 * R;
    pt.px(xx, yy, edge && (lowerRight || R >= 1.8) ? (R >= 1.8 && !lowerRight ? cols.ring : cols.rim) : cols.lime);
  }
  // The shine: the pixel nearest his highlight, up and left of the centre.
  const sx = Math.round(cx - 0.45 * R), sy = Math.round(cy - 0.45 * R);
  pt.px(sx, sy, cols.shine);
}
function venom(pt: Paint, ctx: Ctx): void {
  if (pt.N !== 44) return;
  for (const [x, y, r] of V_DROPS) drop(pt, ctx.W, x, y, r, { lime: '#84fa14', rim: '#029124', ring: '#1ca708', shine: '#d5ffa5' });
}

// His Weapon Attack. The base is his box reduction; his crescent and his ground read as they are.
// What it loses, put back on his pixels:
//  - the blade: his blade lies at 45 degrees, so at 44 each of his lines along it is one diagonal
//    of pixels (x + y constant), at his places: his cyan-blue edge (x + y = 41), his white, his pale
//    cyan, his violet middle line (44, in his lighter violet, as it reads in his picture), his teal,
//    his deep blue edge (47); his pointed tip at
//    (8, 36), where the edges turn upright and level as his do; up to the guard;
//  - the dark outline of his guard, grip and pommel (his navy, kept by the dark-line rule there);
//  - his four sparkles as crosses at his places, white at the centre, his gold along the arms.
const W_BLADE: Record<number, string> = { 41: '#3298c0', 42: '#ecffff', 43: '#b4eeee', 44: '#828cb2', 45: '#7ecdce', 46: '#7ecdce', 47: '#1a6da5' };
const W_TIP: [number, number] = [8, 36];
const W_GUARD_U = 13;
const W_SPARKLES: { c: [number, number]; arms: [number, number, number, number] }[] = [
  { c: [5, 8], arms: [3, 2, 2, 2] },
  { c: [11, 4], arms: [2, 0, 0, 0] },
  { c: [39, 24], arms: [2, 1, 2, 1] },
  { c: [36, 31], arms: [4, 3, 4, 3] },
];
// x 26..42, y 2..16
const W_GUARD = [
  '.............cwn.',
  '............cwcn.',
  '............ngcn.',
  '...........cpnn..',
  '..........cppn...',
  '.cnn.....pPn.....',
  '.cwgg...Ppn......',
  '.cngggnn.........',
  '..ccgYyYnc.......',
  '....nntTvn.......',
  '......Ttvn.......',
  '.......vvvn......',
  '......nnvvn......',
  '........nvl......',
  '.........nn......',
];
const W_SWORD44: [number, number][] = [[25, 9], [29, 5], [33, 6], [39, 0], [44, 0], [44, 5], [39, 10], [38, 18], [33, 19], [27, 15]];
function weapon(pt: Paint): void {
  if (pt.N !== 44) return;
  const tipU = W_TIP[0] - W_TIP[1], tipC = W_TIP[0] + W_TIP[1];
  for (let y = 0; y < 44; y++)
    for (let x = 0; x < 44; x++) {
      const c = x + y, u = x - y;
      if (!(c in W_BLADE) || u > W_GUARD_U || u < tipU + Math.abs(c - tipC)) continue;
      // At the tip each diagonal's last pixel is the edge: upright on his cyan side, level on his deep blue side.
      const end = u === tipU + Math.abs(c - tipC);
      pt.px(x, y, end && c !== tipC ? (c < tipC ? W_BLADE[41] : W_BLADE[47]) : W_BLADE[c]);
    }
  pt.px(W_TIP[0], W_TIP[1], W_BLADE[41]);
  // His guard, grip and pommel, traced cell by cell on his pixels (n his navy outline, g his grey
  // steel, w his white glint, c his cyan glow, y and Y his cream gold, t and T his gem, v his violet
  // grey, p and P his grip, l his lilac glint).
  pt.ascii(26, 2, W_GUARD, { n: '#1e1d54', g: '#a5af96', w: '#ebfff6', c: '#63a2ca', y: '#fbfbbc', Y: '#e5dbae', t: '#1caab4', T: '#59dce2', v: '#7f7894', p: '#9e9294', P: '#665f6e', l: '#e6daf0' });
  for (const s of W_SPARKLES) sparkle(pt, s.c[0], s.c[1], s.arms, { white: '#f8fff3', bright: '#fbe8a2', gold: '#eace9e', dim: '#b09472' });
}

const ICONS: IconSpec[] = [
  {
    id: 'chidori_lightning_blade',
    name: 'Chidori',
    sheet: '2',
    colors: 20,
    flat: 0.4,
    chroma: 1,
    marks: [
      { kind: 'bright', what: 'the white cores of his bolts', r: 1, thr: 0.06, minL: 0.9, minPx: 10, share: 0.25 },
      { kind: 'bright', what: 'his thin radial streaks', r: 1, thr: 0.12, minL: 0.45, maxL: 0.9, minPx: 6, share: 0.35, mix: 0.6 },
    ],
    bil44: [0, 0],
    mark88: 0.06,
  },
  {
    id: 'rasengan',
    name: 'Rasengan',
    sheet: '2',
    colors: 18,
    flat: 0.6,
    chroma: 1,
    extra: [
      { box: [35, 35, 55, 55], lo: 0.97, hi: 1, spare: false, by: 'L', why: 'his white core, its whitest pixels' },
    ],
    marks: [
      { kind: 'bright', what: 'his brightest spiral strands', r: 1, thr: 0.06, minL: 0.82, minPx: 12, share: 0.4, mix: 0.75 },
    ],
    art: rasengan,
    bil44: [0, 0],
    mark88: 0.06,
  },
  {
    id: 'venom_surge',
    name: 'Venom Surge',
    sheet: '2',
    colors: 20,
    flat: 0.6,
    chroma: 1.4,
    clean44: 3,
    marks: [
      { kind: 'bright', what: 'the pale shine on his slime drops', r: 1, thr: 0.04, minL: 0.93, minPx: 99, speck: 0.04, share: 0.2 },
    ],
    art: venom,
    bil44: [0, 0],
    mark88: 0.06,
  },
  {
    id: 'earth_wall_doryuheki',
    name: 'Earth Wall',
    sheet: '2',
    colors: 18,
    flat: 0.6,
    chroma: 1.2,
    qChroma: 1.5,
    extra: [
      { box: [5, 15, 85, 88], lo: 0.85, hi: 1, spare: false, by: 'chroma', only: { hue: [40, 60], minL: 0.45, maxL: 0.6 }, why: 'his roots: their lit orange-brown' },
      { box: [5, 15, 85, 88], lo: 0.8, hi: 0.95, spare: false, by: 'chroma', only: { hue: [30, 75], maxL: 0.45 }, why: 'his roots: their shaded brown' },
      { box: [5, 0, 85, 20], lo: 0.6, hi: 0.9, spare: false, by: 'chroma', only: { hue: [100, 150] }, why: 'his grass: its green' },
    ],
    marks: [
      { kind: 'colour', what: 'his grass', r: 0, thr: 0, hue: [100, 150], minC: 0.06, minPx: 2, share: 0.2 },
      { kind: 'colour', what: 'his roots', r: 0, thr: 0, hue: [35, 60], minC: 0.055, minL: 0.34, maxL: 0.6, minPx: 6, share: 0.2, ink: '#8c5e3e' },
      { kind: 'dark', what: 'the dark joints between his stones', r: 1, thr: 0.08, maxL: 0.33, minPx: 10, share: 0.4, ink: '#38282a' },
      { kind: 'bright', what: 'the lit top edges of his stones', r: 1, thr: 0.06, minL: 0.66, minPx: 4, share: 0.4, mix: 0.8 },
    ],
    bil44: [0, 0],
    mark88: 0.06,
  },
  {
    id: 'earth_spear_doryuudan',
    name: 'Earth Bullets',
    sheet: '3',
    colors: 18,
    flat: 0.6,
    chroma: 1.2,
    qChroma: 1.5,
    extra: [
      { box: [12, 51, 37, 76], lo: 0.08, hi: 0.2, spare: false, by: 'L', why: 'his big boulder: its dark violet-grey shade' },
      { box: [12, 51, 37, 76], lo: 0.3, hi: 0.42, spare: false, by: 'L', why: 'his big boulder: its mid grey-brown' },
    ],
    marks: [{ kind: 'dark', what: 'the near-black outlines of his three boulders', r: 1, thr: 0.08, maxL: 0.4, minPx: 16, share: 0.25, ink: '#2e222a', where: onBoulder }],
    bil44: [0, 0],
    mark88: 0.06,
  },
  {
    id: 'great_fireball',
    name: 'Great Fireball',
    sheet: '3',
    colors: 18,
    flat: 0.6,
    chroma: 1.2,
    extra: [
      { box: [10, 50, 50, 85], lo: 0.97, hi: 1, spare: false, by: 'L', why: 'his white-hot core, its palest yellow' },
    ],
    marks: [{ kind: 'bright', what: 'his embers', r: 1, thr: 0.1, minL: 0.75, minPx: 3, share: 0.25 }],
    bil44: [0, 0],
    mark88: 0.06,
  },
  {
    id: 'water_stream',
    name: 'Water Stream',
    sheet: '3',
    colors: 18,
    flat: 0.6,
    chroma: 1,
    marks: [
      { kind: 'bright', what: 'his white spray drops and his long white foam lines', r: 1, thr: 0.12, minL: 0.88, minPx: 14, speck: 0.15, share: 0.3, mix: 0.8 },
      { kind: 'dark', what: 'the dark lines of his water above and below the jet', r: 1, thr: 0.05, maxL: 0.4, minPx: 8, share: 0.35, mix: 0.8 },
    ],
    bil44: [0, 0],
    mark88: 0.06,
  },
  {
    id: 'weapon_attack',
    name: 'Weapon Attack',
    sheet: '3',
    colors: 22,
    flat: 0.6,
    chroma: 1.4,
    extra: [
      { box: [15, 25, 65, 80], lo: 0.6, hi: 0.95, spare: false, by: 'chroma', only: { hue: [212, 232], minL: 0.55, maxL: 0.72 }, why: 'his blade: its cyan-blue edge line' },
      { box: [15, 25, 65, 80], lo: 0.6, hi: 0.95, spare: false, by: 'chroma', only: { hue: [238, 256], minL: 0.45, maxL: 0.58 }, why: 'his blade: its deep blue edge line' },
      { box: [15, 25, 65, 80], lo: 0.6, hi: 0.95, spare: false, by: 'chroma', only: { hue: [258, 275], minL: 0.52, maxL: 0.66 }, why: 'his blade: its violet-blue middle line' },
      { box: [64, 22, 70, 28], lo: 0.8, hi: 1, spare: true, by: 'chroma', why: 'his gem: its cyan' },
      { box: [55, 14, 85, 40], lo: 0, hi: 0.06, spare: true, by: 'L', why: 'his navy outline round the guard, grip and pommel' },
      { box: [68, 8, 82, 20], lo: 0, hi: 0.15, spare: true, by: 'chroma', only: { minL: 0.55, maxL: 0.75 }, why: 'his grip: its grey' },
    ],
    marks: [{ kind: 'dark', what: 'the dark outline of his guard, grip and pommel', r: 1, thr: 0.08, maxL: 0.33, minPx: 6, share: 0.3, mix: 0.9, where: (x, y) => inPoly(W_SWORD44, x, y) }],
    bil44: [1, 0.05],
    mark88: 0.06,
    art: weapon,
  },
  // Sheet 4 (2026-10-20): the weapon actions. His windows are 98x96 of his pixels.
  {
    id: 'weapon_throw',
    name: 'Throw',
    sheet: '4',
    colors: 22,
    flat: 0.5,
    chroma: 1.2,
    marks: [
      // Only his near-black outline, lightly: kept heavier, it turned his grey steel kunai black at 44.
      { kind: 'dark', what: 'the near-black outlines of his kunai, shuriken and tag', r: 1, thr: 0.1, maxL: 0.16, minPx: 6, share: 0.25, mix: 0.55 },
      { kind: 'bright', what: 'the light edges of his steel and his sparks', r: 1, thr: 0.08, minL: 0.7, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],
    bil44: [1, 0.05],
    mark88: 0.06,
  },
  {
    id: 'dodge',
    name: 'Dodge',
    sheet: '4',
    colors: 20,
    flat: 0.5,
    chroma: 1.1,
    marks: [
      { kind: 'bright', what: 'the white-blue edge of his crescent and his stars', r: 1, thr: 0.08, minL: 0.8, minPx: 6, speck: 0.15, share: 0.35, mix: 0.75 },
      { kind: 'dark', what: 'the dark silhouette of his ninja', r: 1, thr: 0.06, maxL: 0.22, minPx: 8, share: 0.3, mix: 0.8 },
    ],
    bil44: [1, 0.05],
    mark88: 0.06,
  },
  {
    id: 'weapon_stow',
    name: 'Stow Weapon',
    sheet: '4',
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    marks: [
      { kind: 'dark', what: 'the near-black outlines of his hands and katana', r: 1, thr: 0.1, maxL: 0.16, minPx: 6, share: 0.25, mix: 0.55 },
      { kind: 'bright', what: 'his spark at the scabbard mouth and the blade glint', r: 1, thr: 0.08, minL: 0.75, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],
    bil44: [1, 0.05],
    mark88: 0.06,
  },
  {
    id: 'weapon_draw',
    name: 'Draw Weapon',
    sheet: '4',
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    marks: [
      { kind: 'bright', what: 'his white-gold burst and its long rays', r: 1, thr: 0.1, minL: 0.85, minPx: 10, share: 0.3, mix: 0.7 },
      { kind: 'dark', what: 'the near-black outlines of his hands and the hilt', r: 1, thr: 0.1, maxL: 0.16, minPx: 6, share: 0.25, mix: 0.55 },
    ],
    bil44: [1, 0.05],
    mark88: 0.06,
  },
  // Sheets 5 to 7 (2026-10-20): the bar's actions and the More menu's. Sheets 5 and 6 came at 2.13x.
  {
    id: 'dash',
    name: 'Dash',
    sheet: '5',
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    marks: [
      { kind: 'dark', what: 'the near-black outline of his runner', r: 1, thr: 0.1, maxL: 0.16, minPx: 6, share: 0.25, mix: 0.55 },
      { kind: 'bright', what: 'his speed lines', r: 1, thr: 0.08, minL: 0.75, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],
    bil44: [1, 0.05],
    mark88: 0.06,
  },
  {
    id: 'hide',
    name: 'Hide',
    sheet: '5',
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    marks: [
      // His glowing red eyes are a few of his pixels: kept one pixel each at 44 by their colour.
      { kind: 'colour', what: 'his red eyes', r: 0, thr: 0, hue: [340, 45], minC: 0.1, minPx: 1, share: 0.5, mix: 1, pick: 'peak' },
      { kind: 'dark', what: 'the near-black outline of his ninja', r: 1, thr: 0.1, maxL: 0.16, minPx: 6, share: 0.25, mix: 0.55 },
      { kind: 'bright', what: 'the light wisps', r: 1, thr: 0.08, minL: 0.75, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],
    bil44: [1, 0.05],
    mark88: 0.06,
  },
  {
    id: 'more',
    name: 'More Actions',
    sheet: '5',
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    extra: [
      { box: [36, 34, 60, 60], lo: 0.85, hi: 1, spare: false, by: 'chroma', only: { hue: [85, 110], minL: 0.8 }, why: 'his gold cross: its saturated gold' },
      { box: [10, 10, 85, 85], lo: 0, hi: 0.04, spare: true, by: 'L', why: 'the dark brown outline of his scroll' },
    ],
    // The owner (2026-10-20): the cross must be a clean plus sign, turned as his scroll is. His own is
    // skewed with uneven arms, and at 44 it melted into the glowing parchment. A true plus turned 12
    // degrees anticlockwise, as his rods and rune rows rise (his top edge 14.6, bottom 9.9 degrees),
    // drawn at both sizes where his sits (his x 36-59, y 37-57), on his glow cream, in his gold
    // #fcf79a with his brown outline #926d46.
    art: (pt) => {
      const big = pt.N === 88;
      const [cx, cy] = big ? [46, 44] : [23, 22];
      const a = big ? 2 : 1; // half the arm's width (arms about 5 or 3 wide)
      const half = big ? 12 : 5; // half the plus's span (25 or 11)
      const tilt = (12 * Math.PI) / 180;
      const [ux, uy] = [Math.cos(tilt), -Math.sin(tilt)]; // along the scroll, rising to the right
      const inside = (x: number, y: number) => {
        const s = (x - cx) * ux + (y - cy) * uy; // along the scroll
        const t = (x - cx) * -uy + (y - cy) * ux; // across it, downwards
        // Arms just over their width when turned (wider and they read as a clover, not a plus).
        const w = a + (big ? 0.6 : 0.35), l = half + 0.5;
        return (Math.abs(s) <= w && Math.abs(t) <= l) || (Math.abs(t) <= w && Math.abs(s) <= l);
      };
      const r = half + (big ? 3 : 1);
      // His tilted cross goes under the glow first, so none of it shows round the plus.
      // His glow round it: brightest near the plus, one step down at the rim.
      for (let y = cy - r; y <= cy + r; y++)
        for (let x = cx - r; x <= cx + r; x++) {
          const d = Math.hypot(x - cx, y - cy);
          if (d <= r + 0.5) pt.px(x, y, big && d > r - 2 ? '#f0dda1' : '#fbf2a5');
        }
      for (let y = cy - half - 3; y <= cy + half + 3; y++)
        for (let x = cx - half - 3; x <= cx + half + 3; x++) {
          if (inside(x, y)) {
            const edge = !inside(x - 1, y) || !inside(x, y - 1);
            const core = Math.abs(x - cx) <= (big ? 1 : 0) && Math.abs(y - cy) <= (big ? 1 : 0);
            pt.px(x, y, core ? '#fffde0' : big && edge ? '#fffbd0' : '#fcf79a');
          } else if (inside(x + 1, y) || inside(x - 1, y) || inside(x, y + 1) || inside(x, y - 1)) pt.px(x, y, '#926d46');
        }
    },
    marks: [
      // His gold cross and sparkles: bright gold on the light parchment, so kept by their colour.
      { kind: 'colour', what: 'his gold cross and sparkles', r: 0, thr: 0, hue: [85, 110], minC: 0.09, minL: 0.82, minPx: 3, share: 0.5, mix: 1, pick: 'peak' },
      { kind: 'dark', what: 'the dark outline of his scroll', r: 1, thr: 0.1, maxL: 0.16, minPx: 6, share: 0.25, mix: 0.55 },
      { kind: 'bright', what: 'his runes and sparkles', r: 1, thr: 0.08, minL: 0.75, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],
    bil44: [1, 0.05],
    mark88: 0.06,
  },
  {
    id: 'end_turn',
    name: 'End Turn',
    sheet: '5',
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    marks: [
      { kind: 'dark', what: 'the dark frame of his hourglass', r: 1, thr: 0.1, maxL: 0.16, minPx: 6, share: 0.25, mix: 0.55 },
      { kind: 'bright', what: 'his glints and embers', r: 1, thr: 0.08, minL: 0.75, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],
    bil44: [1, 0.05],
    mark88: 0.06,
  },
  {
    id: 'disengage',
    name: 'Disengage',
    sheet: '6',
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    marks: [
      { kind: 'dark', what: 'the near-black outline of his ninja', r: 1, thr: 0.1, maxL: 0.16, minPx: 6, share: 0.25, mix: 0.55 },
      { kind: 'bright', what: 'his white slash crescent and the blade', r: 1, thr: 0.08, minL: 0.75, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],
    bil44: [1, 0.05],
    mark88: 0.06,
  },
  {
    id: 'crouch',
    name: 'Crouch',
    sheet: '6',
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    marks: [
      { kind: 'dark', what: 'the near-black outline of his ninja', r: 1, thr: 0.1, maxL: 0.16, minPx: 6, share: 0.25, mix: 0.55 },
      { kind: 'bright', what: 'his light dust', r: 1, thr: 0.08, minL: 0.75, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],
    bil44: [1, 0.05],
    mark88: 0.06,
  },
  {
    id: 'jump',
    name: 'Jump',
    sheet: '6',
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    marks: [
      { kind: 'dark', what: 'the near-black outline of his ninja', r: 1, thr: 0.1, maxL: 0.16, minPx: 6, share: 0.25, mix: 0.55 },
      { kind: 'bright', what: 'his white sky streaks and clouds', r: 1, thr: 0.08, minL: 0.75, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],
    bil44: [1, 0.05],
    mark88: 0.06,
  },
  {
    id: 'focus',
    name: 'Focus',
    sheet: '6',
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    marks: [
      { kind: 'dark', what: 'the near-black outline of his ninja', r: 1, thr: 0.1, maxL: 0.16, minPx: 6, share: 0.25, mix: 0.55 },
      { kind: 'bright', what: 'his stars and aura wisps', r: 1, thr: 0.08, minL: 0.75, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],
    bil44: [1, 0.05],
    mark88: 0.06,
  },
  {
    id: 'shove',
    name: 'Shove',
    sheet: '7',
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    marks: [
      { kind: 'dark', what: 'the near-black outlines of his two ninjas', r: 1, thr: 0.1, maxL: 0.16, minPx: 6, share: 0.25, mix: 0.55 },
      { kind: 'bright', what: 'his white impact burst', r: 1, thr: 0.08, minL: 0.75, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],
    bil44: [1, 0.05],
    mark88: 0.06,
  },
  {
    id: 'trip',
    name: 'Trip',
    sheet: '7',
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    marks: [
      { kind: 'dark', what: 'the near-black outlines of his ninjas', r: 1, thr: 0.1, maxL: 0.16, minPx: 6, share: 0.25, mix: 0.55 },
      { kind: 'bright', what: 'his light dust', r: 1, thr: 0.08, minL: 0.75, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],
    bil44: [1, 0.05],
    mark88: 0.06,
  },
  {
    id: 'stabilize',
    name: 'Heal',
    sheet: '7',
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    marks: [
      { kind: 'dark', what: 'the near-black outlines of his two ninjas', r: 1, thr: 0.1, maxL: 0.16, minPx: 6, share: 0.25, mix: 0.55 },
      { kind: 'bright', what: 'his green sparkles and the glow at the hands', r: 1, thr: 0.08, minL: 0.75, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],
    bil44: [1, 0.05],
    mark88: 0.06,
  },
  {
    id: 'flee',
    name: 'Escape',
    sheet: '7',
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    marks: [
      { kind: 'dark', what: 'the near-black outline of his runner', r: 1, thr: 0.1, maxL: 0.16, minPx: 6, share: 0.25, mix: 0.55 },
      { kind: 'bright', what: 'his stars and the bright doorway', r: 1, thr: 0.08, minL: 0.75, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],
    bil44: [1, 0.05],
    mark88: 0.06,
  },
];

// --- the slot frame (sheet 1's, read only) ------------------------------------------------------------

const SLOT = 56, RING = 6;
function loadFrame(name: string): Img {
  const path = join(FRAME_DIR, name);
  if (!existsSync(path)) throw new Error(`ui-icons-23: missing ${path} (sheet 1's frame: run tools/ui/ui-icons.ts, or set UI_FRAME)`);
  const img = loadPng(path);
  if (img.w !== SLOT || img.h !== SLOT) throw new Error(`ui-icons-23: ${path} is ${img.w}x${img.h}, not ${SLOT}x${SLOT}`);
  return img;
}
const frame = loadFrame('skill_slot_steel.png');
const frameActive = loadFrame('skill_slot_steel_active.png');

// --- build, write, check ------------------------------------------------------------------------------

const only = process.env.UI_ONLY ? new Set(process.env.UI_ONLY.split(',')) : null;
// The icons whose windows were cropped into this folder (sheets 2 and 3 in ui_icons_23, sheet 4 in ui_icons_4).
const built = ICONS.filter((s) => (!only || only.has(s.id)) && existsSync(join(REF, `${s.id}.png`))).map(buildIcon);
const SHEETS_BUILT = [...new Set(built.map((b) => b.spec.sheet))].sort();
for (const b of built) {
  console.log(b.spec.id, b.pal.rgb.length, b.pal.rgb.map((c, i) => toHex(c) + (b.pal.spare[i] ? '*' : '')).join(' '));
  console.log('   88 drops columns', [...Array(b.W.w).keys()].filter((i) => !b.cols.includes(i)).join(','), 'rows', [...Array(b.W.h).keys()].filter((i) => !b.rows.includes(i)).join(','));
  for (const N of [44, 88]) console.log('  ', N, JSON.stringify(b.out[N].checks));
}

if (DEBUG) {
  for (const b of built) {
    const per = (b.spec.marks ?? []).map((r, k) => `${r.what}: ${b.red.mark.filter((m) => m === k + 1).length}`);
    console.log('   marks at 44:', per.join('; '));
    const o44 = b.out[44], o88 = b.out[88];
    const Z = 8;
    const sheet = new Img(44 * Z * 4 + 30, 44 * Z * 2 + 10);
    sheet.fill(hex('#101014'));
    sheet.draw(b.red.box.toImg().scaled(Z), 0, 0);
    sheet.draw(b.red.img.toImg().scaled(Z), 44 * Z + 10, 0);
    sheet.draw(o44.base.toImg(b.pal).scaled(Z), 2 * (44 * Z + 10), 0);
    sheet.draw(o44.img.scaled(Z), 3 * (44 * Z + 10), 0);
    sheet.draw(o88.box.toImg().scaled(4), 0, 44 * Z + 10);
    sheet.draw(o88.ref.toImg().scaled(4), 44 * Z + 10, 44 * Z + 10);
    sheet.draw(o88.base.toImg(b.pal).scaled(4), 2 * (44 * Z + 10), 44 * Z + 10);
    sheet.draw(o88.img.scaled(4), 3 * (44 * Z + 10), 44 * Z + 10);
    savePng(join(DEBUG, `dbg-${b.spec.id}.png`), sheet);
    // Focus: his pixels at 88 (x5), his box to 44 (x10), ours at 44 (x10); below, the three at 1x and 2x.
    const fo = new Img(440 * 3 + 20, 440 + 110);
    fo.fill(hex('#101014'));
    fo.draw(o88.ref.toImg().scaled(5), 0, 0);
    fo.draw(o44.box.toImg().scaled(10), 450, 0);
    fo.draw(o44.img.scaled(10), 900, 0);
    fo.draw(o88.ref.toImg(), 0, 450);
    fo.draw(o44.box.toImg(), 450, 450);
    fo.draw(o44.img, 900, 450);
    fo.draw(o44.box.toImg().scaled(2), 520, 450);
    fo.draw(o44.img.scaled(2), 970, 450);
    savePng(join(DEBUG, `focus-${b.spec.id}.png`), fo);
    savePng(join(DEBUG, `${b.spec.id}-44-x10.png`), o44.img.scaled(10));
    savePng(join(DEBUG, `${b.spec.id}-44.png`), o44.img);
    savePng(join(DEBUG, `${b.spec.id}-88.png`), o88.img);
    savePng(join(DEBUG, `${b.spec.id}-box44-x10.png`), o44.box.toImg().scaled(10));
    savePng(join(DEBUG, `${b.spec.id}-88-x6.png`), o88.img.scaled(6));
    // His mark masks over his pixels (bright yellow, dark magenta; lone specks lighter).
    const mk = b.W.toImg();
    for (let i = 0; i < b.W.w * b.W.h; i++) {
      const x = i % b.W.w, y = Math.floor(i / b.W.w);
      const cols = ['#ffd800', '#ff00c8', '#00ffd0', '#ff7000'];
      for (let r = b.red.masks.length - 1; r >= 0; r--) if (b.red.masks[r][i]) mk.set(x, y, hex(cols[r % cols.length], b.red.masks[r][i] === 2 ? 160 : 255));
    }
    savePng(join(DEBUG, `${b.spec.id}-marks-x6.png`), mk.scaled(6));
    for (const N of [44, 88]) {
      const o = b.out[N];
      const { lab, size } = components(o.q);
      const m = o.img.clone();
      for (let i = 0; i < N * N; i++) if (size[lab[i]] <= 2) m.set(i % N, Math.floor(i / N), hex('#ff00ff'));
      savePng(join(DEBUG, `${b.spec.id}-${N}-small-x8.png`), m.scaled(N === 44 ? 8 : 4));
    }
    const A = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    writeAtomic(join(DEBUG, `${b.spec.id}-44.txt`), b.pal.rgb.map((c, i) => A[i] + ' ' + toHex(c)).join('\n') + '\n\n' + Array.from({ length: 44 }, (_, y) => Array.from({ length: 44 }, (_, x) => A[o44.q.get(x, y)]).join('')).join('\n') + '\n');
  }
}

if (only) process.exit(0);

for (const b of built) {
  savePng(join(OUT, `${b.spec.id}.png`), b.out[44].img);
  savePng(join(OUT, `${b.spec.id}@2x.png`), b.out[88].img);
}

// --- manifest -------------------------------------------------------------------------------------

const manifest = {
  kit: `ui_icons_${SHEETS_BUILT.join('')}`,
  references: SHEETS_BUILT.map((n) => `docs/reference/icons-owner-reference-${n}.jpg`),
  round: 1,
  screen: [1600, 900],
  pixel: 'one art pixel per screen pixel (as ui_icons, sheet 1): draw at 1x on a 1600x900 screen, @2x on a 2x screen, always with image-rendering: pixelated',
  frame: {
    from: 'ui_icons (sheet 1), read only: skill_slot_steel.png and skill_slot_steel_active.png, 56x56, the icon window 44x44 at 6,6; see ui_icons/manifest.json for its slices',
    window: { x: RING, y: RING, w: SLOT - 2 * RING, h: SLOT - 2 * RING },
  },
  method:
    'his sheets are pixel art (480x268 scaled 4.1667x and saved as JPEG); his pixels are taken back first (tools/refs/icons-from-ref-23.py). 88: his own pixels one to one (his 90x90 or 93x91 window with the columns and rows that show least dropped), on a palette sampled from his pixels, 1-2 pixel areas merged only where his own pixels do not stand out. 44: area mean of his pixels, except his thin lines and strongest specks, which keep their own colour one pixel wide; a light bilateral filter, nearest palette entry, 1-2 pixel areas merged; then hand-fixes only where that still loses his picture (see tools/ui/ui-icons-23.ts)',
  checks:
    'small = 8-connected areas of one colour of 1 or 2 pixels: smallHis are his own marks (at 88 his pixel stands out there; at 44 his kept specks), smallDrawn hold a hand-fixed detail, smallOther are left over from the reduction; lowFreq = mean OKLab difference x100 to his box reduction after both are blurred (sigma size/30), lowFreqBoxOnPalette = the same for his box reduction put on our palette; ssim = structural similarity of the lightness (Gaussian window sigma 1.5) to his picture box-reduced to 88, ours (the 44 shown 2x) against ssimBox, his own box reduction to 44 shown 2x; hue = OKLab median hue in degrees (hueHis: his box reduction); thinRun = the longest straight run of one colour one pixel thick [length, row or col, index]',
  icons: Object.fromEntries(
    built.map((b) => [
      b.spec.id,
      {
        name: b.spec.name,
        sheet: `docs/reference/icons-owner-reference-${b.spec.sheet}.jpg`,
        file: `${b.spec.id}.png`,
        file2x: `${b.spec.id}@2x.png`,
        size: [44, 44],
        size2x: [88, 88],
        hisWindow: [b.W.w, b.W.h],
        dropped88: { columns: [...Array(b.W.w).keys()].filter((i) => !b.cols.includes(i)), rows: [...Array(b.W.h).keys()].filter((i) => !b.rows.includes(i)) },
        palette: b.pal.rgb.map(toHex),
        paletteDetailOnly: b.pal.rgb.filter((_, i) => b.pal.spare[i]).map(toHex),
        sampled: (b.spec.extra ?? []).map((e) => e.why),
        checks: { '44': b.out[44].checks, '88': b.out[88].checks },
        use: 'Hotbar skill icon: fills the 44x44 window of skill_slot_steel (ui_icons), at 6,6.',
      },
    ]),
  ),
};
writeAtomic(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');

// --- comparison sheet -----------------------------------------------------------------------------

/** Our icons of one sheet in our frame, in a row like his picture. */
function slotRow(list: Built[], act = -1): Img {
  const gap = 4;
  const row = new Img(list.length * SLOT + (list.length - 1) * gap, SLOT);
  list.forEach((b, i) => {
    const x = i * (SLOT + gap);
    row.draw(b.out[44].img, x + RING, RING);
    row.draw(i === act ? frameActive : frame, x, 0);
  });
  return row;
}

if (process.env.UI_SHEETS) {
  const BG = hex('#15171d'), HEAD = hex('#e9dfc4'), SUB = hex('#9aa3b0');
  const pad = 24, cell = 176, gap = 20, LEFT = 250;
  const parts: { img: Img; x: number; y: number }[] = [];
  let y = pad;
  const put = (img: Img, x: number) => parts.push({ img, x, y });
  const sheets = SHEETS_BUILT;
  const title = screenText(`SKILL ICONS ${sheets.join(' AND ')}  -  his icons beside ours`, 'title', HEAD);
  put(title, pad);
  y += title.h + 14;
  const heads = ['his, at 88 (2x)', 'ours, 88 (2x)', 'ours, 44 (4x)', 'his box to 44 (4x)', 'ours, 44 at 1x'];
  heads.forEach((h, i) => put(screenText(h, 'label', SUB), pad + LEFT + i * (cell + gap)));
  y += 24;
  for (const b of built) {
    put(screenText(b.spec.name, 'label', HEAD), pad);
    parts.push({ img: screenText(b.spec.id, 'label', SUB), x: pad, y: y + 20 });
    if (b.hisLanczos88) put(b.hisLanczos88.scaled(2), pad + LEFT);
    put(b.out[88].img.scaled(2), pad + LEFT + (cell + gap));
    put(b.out[44].img.scaled(4), pad + LEFT + 2 * (cell + gap));
    put(b.out[44].box.toImg().scaled(4), pad + LEFT + 3 * (cell + gap));
    put(b.out[44].img, pad + LEFT + 4 * (cell + gap));
    y += cell + gap;
  }
  for (const sheet of sheets) {
    const list = built.filter((b) => b.spec.sheet === sheet);
    if (!list.length) continue;
    y += 10;
    put(screenText(`Sheet ${sheet} in the frame, in a row like his picture. His row (his window as big as ours), then ours: at 4x, then at 1x`, 'title', HEAD), pad);
    y += 34;
    const h4 = join(REF, `row-${sheet}@4x.png`), h1 = join(REF, `row-${sheet}@1x.png`);
    if (existsSync(h4)) {
      const hr = loadPng(h4);
      put(hr, pad);
      y += hr.h + 12;
    }
    const row = slotRow(list);
    put(row.scaled(4), pad);
    y += row.h * 4 + 16;
    if (existsSync(h1)) {
      const hr = loadPng(h1);
      put(hr, pad);
      put(row, pad + hr.w + 40);
      y += Math.max(hr.h, row.h) + 10;
    } else {
      put(row, pad);
      y += row.h + 10;
    }
    const act = slotRow(list, 0);
    put(screenText('Selected (skill_slot_steel_active), first slot, at 1x', 'label', SUB), pad);
    y += 22;
    put(act, pad);
    y += act.h + 10;
  }
  y += pad;
  const W = Math.max(...parts.map((p) => p.x + p.img.w)) + pad;
  const out = new Img(W, y);
  out.fill(BG);
  for (const p of parts) out.draw(p.img, p.x, p.y);
  savePng(join(process.env.UI_SHEETS, `ui-icons-${sheets.join('')}-compare.png`), out);
}
