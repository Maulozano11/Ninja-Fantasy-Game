// Hotbar skill icons: the owner's first painted icons (docs/reference/icons-owner-reference-1.jpg)
// reduced to clean pixel art, and his steel slot frame rebuilt.
//
//   python3 -I tools/refs/icons-from-ref.py docs/reference/icons-owner-reference-1.jpg <stagingDir>
//   UI_OUT=<stagingDir> npx tsx tools/ui/ui-icons.ts
//
// reads his crops from <stagingDir>/ref/<jutsu id>.png and writes <stagingDir>/<jutsu id>.png
// (44x44, the slot window, shown at 1x), <jutsu id>@2x.png (88x88), skill_slot_steel.png and
// skill_slot_steel_active.png (56x56) and manifest.json. It refuses to run without UI_OUT. Every
// file is written under a temporary name and renamed into place, and the same crops always give
// the same bytes.
//
// Optional: UI_SHEETS=<dir> also writes <dir>/ui-icons-1-compare.png (his icons beside ours, and
// our four icons in our frame in a row like his picture). UI_DEBUG=<dir> writes the stages of
// every icon (his box reduction, the smoothed base on the palette, the clean base, the final) at x8.
//
// How an icon is made (round 2, after review):
//  1. His art window (201x206 of his pixels): the 1-pixel seam trimmed and the gold bracket tips in
//     its corners painted over. His specks (sparks, embers, foam flecks, the peach sparks of the
//     Kirin) are found and painted out of the base, to be put back at the end as designed marks.
//  2. Area mean (box) straight down to 44 (or 88): every target pixel is the mean of his pixels
//     under it. No point sampling anywhere.
//  3. Light edge-preserving smoothing at that size (a bilateral filter in OKLab).
//  4. Nearest palette entry, no dither. One palette per icon, sampled from his picture.
//  5. Clean-up: every area of one colour of one or two pixels (8-connected) joins the neighbouring
//     colour closest to the smoothed picture there, until none is left.
//  6. The hand-traced details (outlines, eye, fangs, the fire wave's ridge and swirl, the water's
//     bands and lip, the fireball's arm gaps) are drawn over it, then his sparks as short streaks.
//     These pixels are protected; the clean-up runs again on the rest.
//  7. Checks (printed and written to the manifest): small clusters per icon, and the colour
//     difference to his box reduction after both are blurred.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Img, RGBA, hex, loadPng, savePng, toHex, writeAtomic } from './ui-img';
import { screenText } from './ui-font';

if (!process.env.UI_OUT) {
  console.error('ui-icons: set UI_OUT to the staging folder (nothing is written to src/ by this tool).');
  process.exit(2);
}
const OUT: string = process.env.UI_OUT;
const REF = join(OUT, 'ref');
const DEBUG = process.env.UI_DEBUG;

// --- colour maths -----------------------------------------------------------------------------

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
function dist(p: Lab, q: Lab): number {
  const dl = (p[0] - q[0]) * 1.4, da = p[1] - q[1], db = p[2] - q[2];
  return dl * dl + da * da + db * db;
}
const hueDeg = (c: Lab): number => ((Math.atan2(c[2], c[1]) * 180) / Math.PI + 360) % 360;

// --- float images -------------------------------------------------------------------------------

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
  toImg(): Img {
    const o = new Img(this.w, this.h);
    for (let i = 0; i < this.w * this.h; i++) {
      for (let k = 0; k < 3; k++) o.px[i * 4 + k] = Math.max(0, Math.min(255, Math.round(this.d[i * 3 + k])));
      o.px[i * 4 + 3] = 255;
    }
    return o;
  }
}

/** 3x3 median per channel (used only to find his specks, not for the picture itself). */
function median3(src: F): F {
  const o = new F(src.w, src.h);
  const v = new Float32Array(9);
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++)
      for (let k = 0; k < 3; k++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) v[n++] = src.at(x + dx, y + dy, k);
        v.sort();
        o.d[(y * src.w + x) * 3 + k] = v[4];
      }
  return o;
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

// --- palette ------------------------------------------------------------------------------------

interface Pal {
  rgb: RGBA[];
  lab: Lab[];
  /** Entries kept for his specks and the drawn details only (the base picture is never put on them). */
  spare: boolean[];
}

function palOf(rgb: RGBA[], spare: boolean[]): Pal {
  const lab = rgb.map((c) => oklab(c[0], c[1], c[2]));
  const idx = rgb.map((_, i) => i).sort((a, b) => lab[a][0] - lab[b][0] || a - b);
  return { rgb: idx.map((i) => rgb[i]), lab: idx.map((i) => lab[i]), spare: idx.map((i) => spare[i]) };
}

/** His real colours (each distinct colour of his crop once), to snap palette entries to. */
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
 * k-means in OKLab on his picture at the icon size, then each centre is replaced by the nearest
 * colour that really occurs in his crop, so the palette is sampled from his picture. Every pixel is
 * weighted by how rare its lightness is (`flat` 0..1), so a big dark ground does not take most of
 * the entries from the bright subject's ramp; the seeds are spread evenly in lightness for the same
 * reason. `chroma` weighs hue against lightness. Sorted dark to light.
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
 * A colour sampled from one place of his picture (box in his crop pixels, 199x204 after the trim):
 * the mean of the pixels there whose lightness is in the [lo, hi] quantile band, snapped to his
 * nearest real colour. Used for the entries the k-means misses (the fireball's core edge, the
 * Kirin's mouth glow, the water's inner curl) and for the colours of his sparks.
 */
function sampleAt(src: F, his: { rgb: RGBA[]; lab: Lab[] }, box: [number, number, number, number], lo: number, hi: number): RGBA {
  const px: number[] = [];
  for (let y = box[1]; y < box[3]; y++) for (let x = box[0]; x < box[2]; x++) px.push(y * src.w + x);
  const L = px.map((i) => src.lab(i)[0]);
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

// --- indexed images -----------------------------------------------------------------------------

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
    const d = dist(c, p.lab[j]);
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
 * protected joins one of the colours around it: the one nearest to the smoothed picture `ref` over
 * the area (so the merge keeps his light), ties going to the colour that borders it most. Areas
 * whose lightness stands out from their surroundings by `keep` or more stay (none, when keep >= 1).
 * One area at a time, in reading order, until nothing changes.
 */
function cleanup(q: Ix, p: Pal, ref: F, maxSize: number, keep: number, protect: Set<number>, rounds = 12): Ix {
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
      // The area may have grown or changed since the labels were taken: check it again.
      const col = cur.d[px[0]];
      if (px.some((i) => cur.d[i] !== col)) continue;
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
      let best = -1, bs = Infinity, sumL = 0, tot = 0;
      for (const [v, n] of [...border.entries()].sort((a, b) => a[0] - b[0])) {
        sumL += p.lab[v][0] * n;
        tot += n;
        const s = dist(rm, p.lab[v]) - n * 1e-6;
        if (s < bs) (bs = s), (best = v);
      }
      if (Math.abs(p.lab[col][0] - sumL / tot) >= keep) continue;
      for (const i of px) cur.d[i] = best;
      changed++;
    }
    if (!changed) break;
  }
  return cur;
}

/** Small clusters (8-connected areas of one colour of one or two pixels), all and outside `listed`. */
function smallClusters(q: Ix, listed: Set<number>): { all: number; unlisted: number } {
  const { lab, size } = components(q);
  const seen = new Map<number, boolean>();
  for (let i = 0; i < q.w * q.h; i++) {
    const id = lab[i];
    if (size[id] > 2) continue;
    seen.set(id, (seen.get(id) ?? false) || listed.has(i));
  }
  let all = 0, unlisted = 0;
  for (const v of seen.values()) {
    all++;
    if (!v) unlisted++;
  }
  return { all, unlisted };
}

// --- his specks: sparks, embers, foam flecks ---------------------------------------------------

interface Speck {
  px: number[];
  cx: number;
  cy: number;
  /** His colour: the mean of its most extreme third (brightest for a spark, darkest for a flake). */
  color: RGBA;
  bright: boolean;
  /** Length along its main axis and across it (his pixels), and the axis angle. */
  long: number;
  across: number;
  angle: number;
  /** Lightness of the ground under it, and its own at its most extreme third. */
  bg: number;
  peak: number;
}

function shape(comp: number[], w: number): { cx: number; cy: number; long: number; across: number; angle: number } {
  let cx = 0, cy = 0;
  for (const j of comp) (cx += j % w), (cy += Math.floor(j / w));
  cx /= comp.length;
  cy /= comp.length;
  let sxx = 0, sxy = 0, syy = 0;
  for (const j of comp) {
    const dx = (j % w) - cx, dy = Math.floor(j / w) - cy;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  const n = comp.length;
  (sxx /= n), (sxy /= n), (syy /= n);
  const tr = sxx + syy, det = sxx * syy - sxy * sxy;
  const l1 = tr / 2 + Math.sqrt(Math.max(0, (tr * tr) / 4 - det)), l2 = tr / 2 - Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  return { cx, cy, long: Math.sqrt(12 * l1), across: Math.sqrt(12 * Math.max(0, l2)), angle: 0.5 * Math.atan2(2 * sxy, sxx - syy) };
}

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
 * His small marks on the ground around them: bright ones (top-hat over an opening of radius r) or
 * dark ones (black-hat), or warm ones in a cold picture (red above blue by `warm`).
 */
function findSpecks(src: F, rule: SpeckRule): Speck[] {
  const { w, h } = src;
  const L = lightness(src);
  const m = new Uint8Array(w * h);
  let ref: Float32Array;
  if (rule.warm !== undefined) {
    ref = new Float32Array(w * h).fill(0.3);
    for (let i = 0; i < w * h; i++) m[i] = src.d[i * 3] - src.d[i * 3 + 2] > rule.warm ? 1 : 0;
  } else {
    ref = rule.bright ? morph(morph(L, w, h, rule.r, false), w, h, rule.r, true) : morph(morph(L, w, h, rule.r, true), w, h, rule.r, false);
    for (let i = 0; i < w * h; i++) m[i] = (rule.bright ? L[i] - ref[i] : ref[i] - L[i]) > rule.thr ? 1 : 0;
  }
  const out: Speck[] = [];
  for (const comp of groups(m, w, h)) {
    if (comp.length < rule.minPx || comp.length > rule.maxPx) continue;
    const s = shape(comp, w);
    if (s.across > rule.maxAcross || s.long > rule.maxLong) continue;
    const key = (j: number) => (rule.warm !== undefined ? src.d[j * 3] - src.d[j * 3 + 2] : rule.bright ? L[j] : -L[j]);
    const sorted = [...comp].sort((a, b) => key(b) - key(a) || a - b);
    const top = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 3)));
    const c = [0, 0, 0];
    for (const j of top) for (let k = 0; k < 3; k++) c[k] += src.d[j * 3 + k] / top.length;
    let bg = 0, peak = 0;
    for (const j of comp) bg += ref[j] / comp.length;
    for (const j of top) peak += L[j] / top.length;
    if (rule.bgMax !== undefined && bg > rule.bgMax) continue;
    if (rule.bgMin !== undefined && bg < rule.bgMin) continue;
    if (rule.peakMax !== undefined && peak > rule.peakMax) continue;
    out.push({ px: comp, ...s, color: [Math.round(c[0]), Math.round(c[1]), Math.round(c[2]), 255], bright: rule.bright, bg, peak });
  }
  return out;
}

/** His picture with the specks painted out: each takes the mean colour of the ring just around it. */
function removeSpecks(src: F, specks: Speck[], grow = 1): F {
  const { w, h } = src;
  const out = new F(w, h, new Float32Array(src.d));
  const mark = new Int32Array(w * h).fill(-1);
  specks.forEach((s, n) => {
    for (const j of s.px) {
      const x = j % w, y = (j - x) / w;
      for (let dy = -grow; dy <= grow; dy++)
        for (let dx = -grow; dx <= grow; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h) mark[yy * w + xx] = n;
        }
    }
  });
  specks.forEach((s, n) => {
    const ring = [0, 0, 0];
    let cnt = 0;
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (const j of s.px) {
      const x = j % w, y = (j - x) / w;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    for (let y = y0 - grow - 2; y <= y1 + grow + 2; y++)
      for (let x = x0 - grow - 2; x <= x1 + grow + 2; x++) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const i = y * w + x;
        if (mark[i] >= 0) continue;
        for (let k = 0; k < 3; k++) ring[k] += src.d[i * 3 + k];
        cnt++;
      }
    if (!cnt) return;
    for (let i = 0; i < w * h; i++) if (mark[i] === n) for (let k = 0; k < 3; k++) out.d[i * 3 + k] = ring[k] / cnt;
  });
  return out;
}

interface SpeckRule {
  bright: boolean;
  /** Found by warmth instead (red minus blue above this): the peach sparks among the bolts. */
  warm?: number;
  /** Top-hat radius and contrast (his pixels, OKLab L). */
  r: number;
  thr: number;
  /** The ground must be darker (bright specks) or lighter (dark specks) than this. */
  bgMax?: number;
  bgMin?: number;
  /** Dark specks only: their own darkest third must be darker than this. */
  peakMax?: number;
  /** Size limits in his pixels: area, length and width. */
  minPx: number;
  maxPx: number;
  maxLong: number;
  maxAcross: number;
}

// --- drawing the details --------------------------------------------------------------------------

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
  /** Pixels of his sparks, embers and flecks (the deliberate 1-pixel marks), for the checks. */
  readonly sparks = new Set<number>();
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
  /** A tapered stroke from `b` (`wb` pixels wide) to the tip `t` (one pixel). */
  wedge(b: [number, number], t: [number, number], wb: number, col: string): void {
    const len = Math.hypot(t[0] - b[0], t[1] - b[1]);
    const ux = (t[0] - b[0]) / len, uy = (t[1] - b[1]) / len;
    for (let y = Math.floor(Math.min(b[1], t[1])) - 2; y <= Math.ceil(Math.max(b[1], t[1])) + 2; y++)
      for (let x = Math.floor(Math.min(b[0], t[0])) - 2; x <= Math.ceil(Math.max(b[0], t[0])) + 2; x++) {
        const vx = x - b[0], vy = y - b[1];
        const along = vx * ux + vy * uy, across = Math.abs(-vx * uy + vy * ux);
        if (along < -0.3 || along > len + 0.3) continue;
        const half = (wb + (1 - wb) * Math.max(0, Math.min(1, along / len))) / 2;
        if (across <= half) this.px(x, y, col);
      }
  }
  /** Pixel centres inside the polygon. */
  inside(poly: [number, number][], x: number, y: number): boolean {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  fill(poly: [number, number][], col: string): void {
    for (let y = 0; y < this.q.h; y++) for (let x = 0; x < this.q.w; x++) if (this.inside(poly, x, y)) this.px(x, y, col);
  }
  /**
   * A patch drawn from text rows: each character is a colour from `legend`, '.' leaves the pixel.
   */
  ascii(x0: number, y0: number, rows: string[], legend: Record<string, string>): void {
    rows.forEach((row, dy) =>
      [...row].forEach((ch, dx) => {
        if (ch === '.' || ch === ' ') return;
        if (!(ch in legend)) throw new Error(`ui-icons: no colour for '${ch}'`);
        this.px(x0 + dx, y0 + dy, legend[ch]);
      }),
    );
  }
  /** Moves the base `steps` entries along the palette's ramp (negative = darker) where `where` holds. */
  shift(where: (x: number, y: number) => boolean, steps: number, floor?: string): void {
    const min = floor ? this.ramp.indexOf(this.c(floor)) : 0;
    for (let y = 0; y < this.q.h; y++)
      for (let x = 0; x < this.q.w; x++) {
        if (!where(x, y) || this.drawn.has(y * this.q.w + x)) continue;
        const r = this.ramp.indexOf(this.q.get(x, y));
        if (r < 0) continue;
        this.q.set(x, y, this.ramp[Math.max(Math.min(r, Math.max(0, min)), Math.min(this.ramp.length - 1, r + steps))]);
      }
  }
  /** Puts every base pixel of the colours `from` (hex) on `to` where `where` holds. */
  recolor(where: (x: number, y: number) => boolean, from: string[], to: string): void {
    const f = new Set(from.map((c) => this.c(c))), t = this.c(to);
    for (let y = 0; y < this.q.h; y++)
      for (let x = 0; x < this.q.w; x++) if (where(x, y) && f.has(this.q.get(x, y)) && !this.drawn.has(y * this.q.w + x)) this.q.set(x, y, t);
  }
  /** A spark: its pixels are drawn and listed as deliberate marks. */
  spark(pts: [number, number][], cols: string[]): void {
    pts.forEach(([x, y], i) => {
      if (x < 0 || y < 0 || x >= this.q.w || y >= this.q.h) return;
      this.px(x, y, cols[Math.min(i, cols.length - 1)]);
      this.sparks.add(y * this.q.w + x);
    });
  }
}

/** Nearest palette entry to a colour that stands out from `bgL` by at least `minC`, on the colour's side. */
function pickContrast(p: Pal, c: RGBA, bgL: number, minC: number): number {
  const lab = oklab(c[0], c[1], c[2]);
  const order = p.lab.map((q, i) => [dist(lab, q), i] as [number, number]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const [, i] of order) if (Math.abs(p.lab[i][0] - bgL) >= minC && Math.sign(p.lab[i][0] - bgL) === Math.sign(lab[0] - bgL)) return i;
  return order[0][1];
}

/**
 * His specks put back as short streaks: the `count` most visible of them (size times contrast),
 * each 1 to `maxLen` pixels along its own axis (or along `dir` when given: the fireball's swirl),
 * in his colour pushed until it stands out from the ground by `minC`.
 */
function stampStreaks(pt: Paint, specks: Speck[], srcW: number, srcH: number, count: number, maxLen: number, minC: number, dir?: (x: number, y: number) => number): void {
  const N = pt.N, sx = N / srcW, sy = N / srcH;
  const ranked = [...specks].sort((a, b) => b.px.length * Math.abs(b.peak - b.bg) - a.px.length * Math.abs(a.peak - a.bg) || a.cx - b.cx || a.cy - b.cy).slice(0, count);
  for (const s of ranked) {
    const cx = (s.cx + 0.5) * sx - 0.5, cy = (s.cy + 0.5) * sy - 0.5;
    const ang = dir ? dir(cx, cy) : s.angle;
    const n = Math.max(1, Math.min(maxLen, Math.round(s.long * sx * 0.8)));
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const pts: [number, number][] = [];
    for (let k = 0; k < n; k++) {
      const t = n === 1 ? 0 : k - (n - 1) / 2;
      const p: [number, number] = [Math.round(cx + ux * t), Math.round(cy + uy * t)];
      if (!pts.some((o) => o[0] === p[0] && o[1] === p[1])) pts.push(p);
    }
    const bg = pt.at(Math.round(cx), Math.round(cy));
    const c = pickContrast(pt.p, s.color, bg >= 0 ? pt.p.lab[bg][0] : 0, minC);
    pt.spark(pts, [toHex(pt.p.rgb[c])]);
  }
}

// --- the icons ----------------------------------------------------------------------------------

/** His crop with the 1-pixel dark seam at each side trimmed and the gold bracket tips in the corners painted over. */
function prep(his: Img): Img {
  const t = his.crop(1, 1, his.w - 2, his.h - 2);
  const R = 9;
  const o = t.clone();
  for (const [cx, cy, sx, sy] of [[0, 0, 1, 1], [t.w - 1, 0, -1, 1], [0, t.h - 1, 1, -1], [t.w - 1, t.h - 1, -1, -1]])
    for (let y = 0; y < R; y++)
      for (let x = 0; x < R - y; x++) {
        const d = Math.ceil((R - x - y) / 2) + 1;
        o.set(cx + sx * x, cy + sy * y, t.get(cx + sx * (x + d), cy + sy * (y + d)));
      }
  return o;
}

interface Ctx {
  /** His crop (trimmed, 199x204) and the same with his specks painted out. */
  src: F;
  ground: F;
  specks: Speck[];
  /** His box reduction at this size (unquantized) and the smoothed base. */
  box: F;
  smooth: F;
}

interface IconSpec {
  id: string;
  name: string;
  /** Palette: k-means entries, lightness flattening, hue weight. */
  colors: number;
  flat: number;
  chroma: number;
  /** Extra palette entries sampled from places of his picture (see sampleAt): [box, lo, hi, spare]. */
  extra?: [[number, number, number, number], number, number, boolean][];
  specks: SpeckRule[];
  /** Bilateral smoothing at 44 and at 88: [sigma space (px), sigma colour (OKLab)]. */
  bil44: [number, number];
  bil88: [number, number];
  /** The details drawn over the clean base, at either size. */
  art?: (pt: Paint, ctx: Ctx) => void;
}

interface Built {
  spec: IconSpec;
  pal: Pal;
  out: Record<number, { q: Ix; img: Img; box: F; base: Ix; listed: Set<number>; checks: Checks }>;
  his88: Img | null;
}

interface Checks {
  /** 8-connected areas of one colour of one or two pixels: all, and those that are not listed marks. */
  small: number;
  smallUnlisted: number;
  /** The deliberate 1-pixel marks (his sparks, embers, flecks): how many pixels. */
  listedPx: number;
  /** Mean OKLab difference (x100) to his box reduction, both blurred (sigma N/30): ours and his box on our palette. */
  lowFreq: number;
  lowFreqBoxOnPalette: number;
  /** OKLab median hue (degrees) of ours and of his box reduction. */
  hue: number;
  hueHis: number;
  colours: number;
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
const ixToF = (q: Ix, p: Pal): F => F.of(q.toImg(p));

function loadHis(id: string): Img {
  const path = join(REF, `${id}.png`);
  if (!existsSync(path)) throw new Error(`ui-icons: missing ${path} (run tools/refs/icons-from-ref.py first)`);
  return loadPng(path);
}

function buildIcon(spec: IconSpec): Built {
  const src = F.of(prep(loadHis(spec.id)));
  const med = median3(src);
  const specks: Speck[] = [];
  for (const r of spec.specks) specks.push(...findSpecks(med, r));
  const ground = removeSpecks(src, specks);
  const hc = hisColours(med);
  const base = makePalette(areaResize(ground, 44, 44), hc, spec.colors, spec.flat, spec.chroma);
  const rgb = [...base.rgb], spare = [...base.spare];
  for (const [box, lo, hi, sp] of spec.extra ?? []) {
    const c = sampleAt(med, hc, box, lo, hi);
    if (!rgb.some((u) => u[0] === c[0] && u[1] === c[1] && u[2] === c[2])) rgb.push(c), spare.push(sp);
  }
  const pal = palOf(rgb, spare);
  const out: Built['out'] = {};
  for (const N of [44, 88]) {
    const box = areaResize(src, N, N);
    const gbox = areaResize(ground, N, N);
    const [ss, sr] = N === 44 ? spec.bil44 : spec.bil88;
    const smooth = sr > 0 ? bilateral(gbox, ss, sr, 2) : gbox;
    const clean = cleanup(quantize(smooth, pal), pal, smooth, 2, 1, new Set());
    const pt = new Paint(clean.clone(), pal);
    spec.art?.(pt, { src, ground, specks, box, smooth });
    const q = cleanup(pt.q, pal, smooth, 2, 1, pt.drawn);
    const ours = ixToF(q, pal);
    const sm = smallClusters(q, pt.sparks);
    const used = new Set(q.d);
    out[N] = {
      q,
      img: q.toImg(pal),
      box,
      base: clean,
      listed: pt.sparks,
      checks: {
        small: sm.all,
        smallUnlisted: sm.unlisted,
        listedPx: pt.sparks.size,
        lowFreq: +lowFreqDiff(ours, box).toFixed(2),
        lowFreqBoxOnPalette: +lowFreqDiff(ixToF(quantize(box, pal), pal), box).toFixed(2),
        hue: Math.round(medianHue(ours)),
        hueHis: Math.round(medianHue(box)),
        colours: used.size,
      },
    };
  }
  const p88 = join(REF, `${spec.id}@88.png`);
  return { spec, pal, out, his88: existsSync(p88) ? loadPng(p88) : null };
}

const FIRE_SPECK: SpeckRule = { bright: true, r: 4, thr: 0.1, bgMax: 0.42, minPx: 4, maxPx: 400, maxLong: 30, maxAcross: 7 };

const ICONS: IconSpec[] = [
  {
    id: 'fireball_goukakyu',
    name: 'Fireball',
    colors: 14,
    flat: 0.6,
    chroma: 1,
    specks: [FIRE_SPECK],
    bil44: [1, 0.05],
    bil88: [1, 0.05],
  },
  {
    id: 'kirin_thunder',
    name: 'Kirin',
    colors: 16,
    flat: 0.6,
    chroma: 1,
    specks: [{ bright: true, warm: 14, r: 0, thr: 0, minPx: 3, maxPx: 300, maxLong: 40, maxAcross: 12 }],
    bil44: [0.8, 0.03],
    bil88: [1, 0.05],
  },
  {
    id: 'great_fire_annihilation',
    name: 'Great Fire Annihilation',
    colors: 16,
    flat: 0.6,
    chroma: 1.6,
    specks: [FIRE_SPECK, { bright: false, r: 4, thr: 0.1, bgMin: 0.28, peakMax: 0.27, minPx: 4, maxPx: 200, maxLong: 16, maxAcross: 6 }],
    bil44: [1, 0.05],
    bil88: [1, 0.05],
  },
  {
    id: 'water_shield_suijinheki',
    name: 'Water Wall',
    colors: 15,
    flat: 0.6,
    chroma: 2.2,
    specks: [{ bright: true, r: 4, thr: 0.1, bgMax: 0.42, minPx: 4, maxPx: 400, maxLong: 30, maxAcross: 7 }],
    bil44: [1, 0.05],
    bil88: [1, 0.05],
  },
];

const built = ICONS.map(buildIcon);
for (const b of built) {
  console.log(b.spec.id, b.pal.rgb.length, b.pal.rgb.map((c, i) => toHex(c) + (b.pal.spare[i] ? '*' : '')).join(' '));
  for (const N of [44, 88]) console.log('  ', N, JSON.stringify(b.out[N].checks));
}

if (DEBUG) {
  for (const b of built) {
    const o44 = b.out[44], o88 = b.out[88];
    const Z = 8;
    const sheet = new Img(44 * Z * 4 + 30, 44 * Z * 2 + 10);
    sheet.fill(hex('#101014'));
    sheet.draw(o44.box.toImg().scaled(Z), 0, 0);
    sheet.draw(o44.base.toImg(b.pal).scaled(Z), 44 * Z + 10, 0);
    sheet.draw(o44.img.scaled(Z), 2 * (44 * Z + 10), 0);
    sheet.draw(o88.box.toImg().scaled(4), 0, 44 * Z + 10);
    sheet.draw(o88.base.toImg(b.pal).scaled(4), 44 * Z + 10, 44 * Z + 10);
    sheet.draw(o88.img.scaled(4), 2 * (44 * Z + 10), 44 * Z + 10);
    sheet.draw(o44.img.scaled(2), 3 * (44 * Z + 10), 0);
    sheet.draw(o44.img, 3 * (44 * Z + 10), 100);
    sheet.draw(o88.img, 3 * (44 * Z + 10), 160);
    savePng(join(DEBUG, `dbg-${b.spec.id}.png`), sheet);
    savePng(join(DEBUG, `${b.spec.id}-44-x10.png`), o44.img.scaled(10));
    savePng(join(DEBUG, `${b.spec.id}-88-x6.png`), o88.img.scaled(6));
    savePng(join(DEBUG, `${b.spec.id}-44.png`), o44.img);
    savePng(join(DEBUG, `${b.spec.id}-88.png`), o88.img);
    savePng(join(DEBUG, `${b.spec.id}-base44.png`), o44.base.toImg(b.pal));
    savePng(join(DEBUG, `${b.spec.id}-base88.png`), o88.base.toImg(b.pal));
  }
}
