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
// How an icon is made (round 3, after the second review: his reduction carries more of the picture,
// and less is drawn over it):
//  1. His art window (201x206 of his pixels): the 1-pixel seam trimmed and the gold bracket tips in
//     its corners painted over. His specks (sparks, embers, foam flecks, the peach sparks of the
//     Kirin) are found and painted out of the base, to be put back at the end as designed marks.
//     For the Kirin and the water his crop is first smoothed along his own strokes (a short
//     line-integral blur that follows each stroke's direction), so the mane spikes and the bands
//     stay continuous lines instead of breaking into grain; the water's 44 uses a longer stretch, so
//     its bands curve round the barrel and its bottom foam becomes his diagonal streaks.
//  2. Area mean (box) straight down to 44 (or 88): every target pixel is the mean of his pixels
//     under it. No point sampling anywhere.
//  3. Light edge-preserving smoothing at that size (a bilateral filter in OKLab).
//  4. Nearest palette entry, no dither. One palette per icon, sampled from his picture. For the fire
//     wave the hue counts more when a pixel is put on the palette, so his crimson bands stay crimson
//     instead of falling into his smoke; off-tone greyish entries can be dropped (the water's).
//  5. Clean-up: every area of one colour of one or two pixels (8-connected) joins the neighbouring
//     colour closest to the smoothed picture there, until none is left.
//  6. The hand-traced details are drawn over it (traced on his crop with a 44 or 88 grid): the
//     Kirin's head at 44 is his own plain box reduction with only his horn, eye, sloping gum and
//     fangs, white mouth core and diagonal lower jaw restated, then its mane spikes and bolts; at 88
//     his outlines, eye, curved horn, rounded snout, mouth glow and tapering fangs; the fire wave's
//     inner tongue (a thick flame lit on its left) and swirl (an orange arm curling into an orange
//     eye); the water's barrel, lip and foam (and at 44 its curved band and foam splash, at 88 its
//     bands); the fireball's darker arm gaps, its fade to his near-black beyond the arm tips and its
//     arm gaps into the core. Then his sparks as short streaks. These pixels are protected; the
//     clean-up runs again on the rest.
//  7. Checks (printed and written to the manifest): small clusters per icon (his sparks, drawn
//     details, and what is left over from the reduction), the colour difference to his box
//     reduction after both are blurred, and the longest 1-pixel straight run (a drawn seam or edge).

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
function dist(p: Lab, q: Lab, cw = 1): number {
  const dl = (p[0] - q[0]) * 1.4, da = (p[1] - q[1]) * cw, db = (p[2] - q[2]) * cw;
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

/**
 * Smoothing along his strokes: the direction of every stroke comes from the smoothed structure
 * tensor of his picture, and each pixel is averaged along that direction only (a line-integral
 * convolution of `len` pixels each way). Edges across the strokes (the dark gap between two
 * flames, the line between two bands of the wave) stay sharp; the brush grain along them goes.
 */
function flowSmooth(src: F, sigma: number, len: number): F {
  const { w, h } = src;
  const L = lightness(src);
  const gx = new Float32Array(w * h), gy = new Float32Array(w * h);
  const at = (x: number, y: number) => L[Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      gx[y * w + x] = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
      gy[y * w + x] = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
    }
  const jxx = gauss(gx.map((v) => v * v), w, h, sigma);
  const jxy = gauss(gx.map((v, i) => v * gy[i]), w, h, sigma);
  const jyy = gauss(gy.map((v) => v * v), w, h, sigma);
  // Tangent: the eigenvector of the smaller eigenvalue.
  const tx = new Float32Array(w * h), ty = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = jxx[i], b = jxy[i], c = jyy[i];
    const l2 = (a + c) / 2 - Math.sqrt(((a - c) * (a - c)) / 4 + b * b);
    let vx = l2 - c, vy = b;
    if (Math.abs(vx) + Math.abs(vy) < 1e-9) (vx = b), (vy = l2 - a);
    const n = Math.hypot(vx, vy);
    if (n < 1e-9) (tx[i] = 1), (ty[i] = 0);
    else (tx[i] = vx / n), (ty[i] = vy / n);
  }
  const out = new F(w, h);
  const sample = (x: number, y: number, k: number): number => {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    return (src.at(x0, y0, k) * (1 - fx) + src.at(x0 + 1, y0, k) * fx) * (1 - fy) + (src.at(x0, y0 + 1, k) * (1 - fx) + src.at(x0 + 1, y0 + 1, k) * fx) * fy;
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const acc = [0, 0, 0];
      let wt = 0;
      for (const dir of [1, -1]) {
        let px = x, py = y, dx = tx[y * w + x] * dir, dy = ty[y * w + x] * dir;
        for (let s = dir === 1 ? 0 : 1; s <= len; s++) {
          if (s > 0) {
            const i = Math.max(0, Math.min(h - 1, Math.round(py))) * w + Math.max(0, Math.min(w - 1, Math.round(px)));
            let ndx = tx[i], ndy = ty[i];
            if (ndx * dx + ndy * dy < 0) (ndx = -ndx), (ndy = -ndy);
            (dx = ndx), (dy = ndy);
            px += dx;
            py += dy;
          }
          const g = Math.exp(-(s * s) / (2 * (len / 2) * (len / 2)));
          for (let k = 0; k < 3; k++) acc[k] += sample(px, py, k) * g;
          wt += g;
        }
      }
      for (let k = 0; k < 3; k++) out.d[(y * w + x) * 3 + k] = acc[k] / wt;
    }
  return out;
}

// --- palette ------------------------------------------------------------------------------------

interface Pal {
  rgb: RGBA[];
  lab: Lab[];
  /** Entries kept for his specks and the drawn details only (the base picture is never put on them). */
  spare: boolean[];
  /** Hue weight when a pixel is put on the palette (1 = lightness first; more keeps his crimson apart from his smoke). */
  cw: number;
}

function palOf(rgb: RGBA[], spare: boolean[]): Pal {
  const lab = rgb.map((c) => oklab(c[0], c[1], c[2]));
  const idx = rgb.map((_, i) => i).sort((a, b) => lab[a][0] - lab[b][0] || a - b);
  return { rgb: idx.map((i) => rgb[i]), lab: idx.map((i) => lab[i]), spare: idx.map((i) => spare[i]), cw: 1 };
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
function sampleAt(src: F, his: { rgb: RGBA[]; lab: Lab[] }, box: [number, number, number, number], lo: number, hi: number, by: 'L' | 'warm' | 'teal' = 'L'): RGBA {
  const px: number[] = [];
  for (let y = box[1]; y < box[3]; y++) for (let x = box[0]; x < box[2]; x++) px.push(y * src.w + x);
  const key = (i: number): number => {
    const [r, g, b] = [src.d[i * 3], src.d[i * 3 + 1], src.d[i * 3 + 2]];
    return by === 'L' ? src.lab(i)[0] : by === 'warm' ? r - b + src.lab(i)[0] * 10 : g - r - Math.abs(g - b) * 0.5;
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
        const s = dist(rm, p.lab[v], p.cw) - n * 1e-6;
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

/**
 * Small clusters (8-connected areas of one colour of one or two pixels): all of them, those that
 * hold one of his sparks, embers or flecks (`sparks`), those that hold a drawn detail (`drawn`: a
 * fang, the eye, an outline, a bolt, a seam) and the rest, which are left over from the reduction.
 */
function smallClusters(q: Ix, sparks: Set<number>, drawn: Set<number>): { all: number; sparks: number; drawn: number; other: number } {
  const { lab, size } = components(q);
  const kind = new Map<number, number>(); // 2 spark, 1 drawn, 0 other
  for (let i = 0; i < q.w * q.h; i++) {
    const id = lab[i];
    if (size[id] > 2) continue;
    kind.set(id, Math.max(kind.get(id) ?? 0, sparks.has(i) ? 2 : drawn.has(i) ? 1 : 0));
  }
  const out = { all: 0, sparks: 0, drawn: 0, other: 0 };
  for (const k of kind.values()) {
    out.all++;
    if (k === 2) out.sparks++;
    else if (k === 1) out.drawn++;
    else out.other++;
  }
  return out;
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
  /** His crop (trimmed, 199x204), the same with his specks painted out (`ground0`), and that smoothed along his strokes (`ground`, when the icon asks for it). */
  src: F;
  ground0: F;
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
  /** Hue weight when his pixels are put on the palette (default 1). */
  qChroma?: number;
  /** Extra palette entries sampled from places of his picture (see sampleAt). `spare`: for the details only. */
  extra?: { box: [number, number, number, number]; lo: number; hi: number; spare: boolean; by?: 'L' | 'warm' | 'teal'; why: string }[];
  specks: SpeckRule[];
  /** Smoothing along his strokes on his crop before the reduction: [sigma, length in his pixels], length 0 = none. */
  flow?: [number, number];
  /** The same for the 44 only, when it needs longer strokes than the 88 (the water's bands and foam streaks). */
  flow44?: [number, number];
  /** Palette entries dropped as off-tone: lightness between the first two values with a chroma (OKLab) under the third. */
  greyOut?: [number, number, number];
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
  /** 8-connected areas of one colour of one or two pixels: all; those holding his sparks; those holding a drawn detail; the rest (left over from the reduction). */
  small: number;
  smallSparks: number;
  smallDrawn: number;
  smallOther: number;
  /** The deliberate 1-pixel marks (his sparks, embers, flecks): how many pixels. */
  listedPx: number;
  /** Mean OKLab difference (x100) to his box reduction, both blurred (sigma N/30): ours and his box on our palette. */
  lowFreq: number;
  lowFreqBoxOnPalette: number;
  /** OKLab median hue (degrees) of ours and of his box reduction. */
  hue: number;
  hueHis: number;
  colours: number;
  /** The longest straight run of one colour one pixel thick (its neighbours on both sides another colour), along a row or a column: [length, 'row'|'col', row or column index]. */
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
  const ground0 = removeSpecks(src, specks);
  const ground = spec.flow && spec.flow[1] > 0 ? flowSmooth(ground0, spec.flow[0], spec.flow[1]) : ground0;
  const ground44 = spec.flow44 ? flowSmooth(ground0, spec.flow44[0], spec.flow44[1]) : ground;
  const hc = hisColours(med);
  const base = makePalette(areaResize(ground, 44, 44), hc, spec.colors, spec.flat, spec.chroma);
  const g = spec.greyOut;
  const keep = base.rgb.map((_, i) => !g || !(base.lab[i][0] > g[0] && base.lab[i][0] < g[1] && Math.hypot(base.lab[i][1], base.lab[i][2]) < g[2]));
  const rgb = base.rgb.filter((_, i) => keep[i]), spare = base.spare.filter((_, i) => keep[i]);
  for (const e of spec.extra ?? []) {
    const c = sampleAt(src, hisColours(src), e.box, e.lo, e.hi, e.by);
    if (!rgb.some((u) => u[0] === c[0] && u[1] === c[1] && u[2] === c[2])) rgb.push(c), spare.push(e.spare);
  }
  const pal = palOf(rgb, spare);
  pal.cw = spec.qChroma ?? 1;
  const out: Built['out'] = {};
  for (const N of [44, 88]) {
    const box = areaResize(src, N, N);
    const gbox = areaResize(N === 44 ? ground44 : ground, N, N);
    const [ss, sr] = N === 44 ? spec.bil44 : spec.bil88;
    const smooth = sr > 0 ? bilateral(gbox, ss, sr, 2) : gbox;
    const clean = cleanup(quantize(smooth, pal), pal, smooth, 2, 1, new Set());
    const pt = new Paint(clean.clone(), pal);
    if (!process.env.UI_NOART) spec.art?.(pt, { src, ground0, ground: N === 44 ? ground44 : ground, specks, box, smooth });
    const q = cleanup(pt.q, pal, smooth, 2, 1, pt.drawn);
    const ours = ixToF(q, pal);
    const sm = smallClusters(q, pt.sparks, pt.drawn);
    const used = new Set(q.d);
    out[N] = {
      q,
      img: q.toImg(pal),
      box,
      base: clean,
      listed: pt.sparks,
      checks: {
        small: sm.all,
        smallSparks: sm.sparks,
        smallDrawn: sm.drawn,
        smallOther: sm.other,
        listedPx: pt.sparks.size,
        lowFreq: +lowFreqDiff(ours, box).toFixed(2),
        lowFreqBoxOnPalette: +lowFreqDiff(ixToF(quantize(box, pal), pal), box).toFixed(2),
        hue: Math.round(medianHue(ours)),
        hueHis: Math.round(medianHue(box)),
        colours: used.size,
        thinRun: thinRun(q),
      },
    };
  }
  const p88 = join(REF, `${spec.id}@88.png`);
  return { spec, pal, out, his88: existsSync(p88) ? loadPng(p88) : null };
}

// --- the details, per icon ---------------------------------------------------------------------
//
// Traced on his picture, in the icon's own pixels (44 or 88). Colours are his (each goes to the
// nearest entry of the icon's palette).

/** Pixels within `r` (chessboard) of a polygon, outside it. */
function nearPoly(pt: Paint, poly: [number, number][], r: number): (x: number, y: number) => boolean {
  return (x, y) => {
    if (pt.inside(poly, x, y)) return false;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (pt.inside(poly, x + dx, y + dy)) return true;
    return false;
  };
}

const K_INK = '#181639', K_NAVY = '#1a2453', K_DARK = '#1d3d7f', K_MIDD = '#225da1', K_MID = '#2b7dc0', K_CYAN = '#48b2da', K_GLOW = '#4ebbe2', K_BRIGHT = '#6fe8f5', K_PALE = '#a1f5fa', K_WHITE = '#d8feff';
const K_LEGEND: Record<string, string> = { K: K_INK, N: K_NAVY, d: K_DARK, b: K_MIDD, B: K_MID, c: K_CYAN, g: K_GLOW, C: K_BRIGHT, P: K_PALE, W: K_WHITE };

/** A bolt: a 1-pixel line in his pale cyan with white cores on its middle stretches. */
function bolt(pt: Paint, pts: [number, number][], core: [number, number] = [0.3, 0.7]): void {
  const px = polyPixels(pts);
  const a = Math.round(px.length * core[0]), b = Math.round(px.length * core[1]);
  px.forEach(([x, y], i) => pt.px(x, y, i >= a && i < b ? K_WHITE : K_PALE));
}

/** A mane spike: a tapered wedge (`body`) with its upper edge lit (`edge`), base `b` to tip `t`. */
function spike(pt: Paint, b: [number, number], t: [number, number], wb: number, body = '#388fc7', edge = K_BRIGHT): void {
  pt.wedge(b, t, wb, body);
  // The lit edge: the wedge's side that faces up (or left, for an upright spike), from base to tip.
  const ux = t[0] - b[0], uy = t[1] - b[1], n = Math.hypot(ux, uy);
  let nx = -uy / n, ny = ux / n;
  if (ny > 0 || (ny === 0 && nx > 0)) (nx = -nx), (ny = -ny);
  const off = Math.max(0, wb / 2 - 0.5);
  pt.line([[Math.round(b[0] + nx * off), Math.round(b[1] + ny * off)], [Math.round(t[0]), Math.round(t[1])]], edge);
}

/** His peach spark colours (the two spare entries of the Kirin palette): the warm core and the dimmer end. */
function peach(pt: Paint): [string, string] {
  const sp = pt.p.rgb.map((_, i) => i).filter((i) => pt.p.spare[i]).sort((a, b) => pt.p.lab[b][0] - pt.p.lab[a][0]);
  return [toHex(pt.p.rgb[sp[0]]), toHex(pt.p.rgb[sp[1]])];
}

// His Kirin at 44. The head is his own plain box reduction (his crop with the specks taken out,
// area-averaged to 44 without the smoothing along his strokes that the mane gets), so it keeps his
// silhouette and his light. Over it only what a 44 reduction loses is restated (see kirinFace44).
// Everything outside the head goes one step darker (two away from it) and is simplified, then his
// main mane spikes and crest spikes are drawn as tapered wedges lit on one edge, his five main bolts
// as continuous lines, and his peach sparks as short dashes.
const KIRIN_HEAD_POLY44: [number, number][] = [[20.5, 14], [26, 12], [32, 12.5], [36, 14.5], [39, 15.5], [42, 18], [42, 23.5], [37, 25], [34.5, 27], [33, 31], [31.5, 35.5], [28, 35.5], [24, 31], [20, 25], [19.5, 19]];
function kirinHead44(x: number, y: number): boolean {
  let c = false;
  const P = KIRIN_HEAD_POLY44;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function kirin44(pt: Paint, ctx: Ctx): void {
  // The head: his plain box reduction, lightly smoothed, on the palette.
  const plain = bilateral(areaResize(ctx.ground0, 44, 44), 0.8, 0.03, 2);
  const pq = cleanup(quantize(plain, pt.p), pt.p, plain, 2, 1, new Set());
  for (let y = 0; y < 44; y++) for (let x = 0; x < 44; x++) if (kirinHead44(x, y)) pt.q.set(x, y, pq.get(x, y));
  const near = (x: number, y: number): boolean => {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (kirinHead44(x + dx, y + dy)) return true;
    return false;
  };
  // One step darker outside the head; the dark ground away from it one more; the mane's top
  // lights (pale, white) held one step under the head's.
  pt.shift((x, y) => !kirinHead44(x, y), -1);
  pt.shift((x, y) => !near(x, y) && pt.p.lab[pt.at(x, y)][0] < 0.55, -1);
  pt.recolor((x, y) => !kirinHead44(x, y), [K_PALE, K_WHITE], K_BRIGHT);
  // His mouth glow lights the mane and the breath just around the open jaws (one step back up).
  pt.shift((x, y) => !kirinHead44(x, y) && Math.hypot(x - 30, (y - 26) * 1.3) < 9, 1);
  // The darkened ground simplified: areas of up to four pixels join their neighbours.
  const keepHead = new Set<number>();
  for (let y = 0; y < 44; y++) for (let x = 0; x < 44; x++) if (kirinHead44(x, y)) keepHead.add(y * 44 + x);
  pt.q.d.set(cleanup(pt.q, pt.p, ixToF(pt.q, pt.p), 4, 1, keepHead).d);
  // His mane spikes, sweeping back from the head, and his crest spikes rising from it.
  const M = '#388fc7', ML = '#79e8f2';
  spike(pt, [13, 8], [1, 1], 3, M, ML);
  spike(pt, [12, 12], [1, 7], 3, M, ML);
  spike(pt, [15, 15], [2, 12], 2, M, ML);
  spike(pt, [18, 19], [5, 17], 2, M, ML);
  spike(pt, [20, 25], [7, 24], 2, M, ML);
  spike(pt, [22, 29], [13, 28], 2, M, ML);
  spike(pt, [19, 11], [16, 0], 3, M, ML);
  spike(pt, [24, 12], [21, 1], 2, M, ML);
  spike(pt, [28, 13], [26, 3], 2, M, ML);
  // His five main bolts, each a zigzag as he drew it.
  bolt(pt, [[43, 0], [42, 1], [41, 3], [39, 4], [37, 5], [36, 6], [35, 8], [34, 10], [33, 12]]);
  bolt(pt, [[36, 0], [35, 2], [35, 4]]);
  bolt(pt, [[33, 27], [35, 28], [36, 27], [38, 28], [39, 27], [40, 26], [41, 27], [43, 25]]);
  bolt(pt, [[36, 31], [37, 33], [39, 34], [40, 36], [41, 38], [43, 39]]);
  bolt(pt, [[0, 43], [1, 41], [3, 40], [4, 38], [6, 37], [7, 35], [9, 34], [10, 32], [12, 31]]);
  // His peach sparks: short diagonal dashes, a warm core and one dimmer end.
  const [PEACH, PEACH_DIM] = peach(pt);
  pt.spark([[38, 9], [37, 10], [36, 11]], [PEACH, PEACH, PEACH_DIM]);
  pt.spark([[41, 9], [40, 10]], [PEACH, PEACH_DIM]);
  pt.spark([[37, 30], [38, 31]], [PEACH, PEACH_DIM]);
  pt.spark([[35, 35], [36, 36], [36, 37]], [PEACH_DIM, PEACH, PEACH]);
  if (process.env.UI_KFACE !== '0') kirinFace44(pt);
}

// What his box reduction loses at 44, restated on his head (traced on his crop with a 44 grid):
//  - the horn: a pale spike two pixels wide rising from the snout to a one-pixel tip, curving back,
//    with navy on its back edge only (its front stands against his dark sky);
//  - the eye: two dark pixels under his lit brow;
//  - the upper gum: a navy line sloping down from the mouth corner to the snout, as his, with four
//    fangs hanging from it (two-pixel roots, one-pixel tips, two of them longer);
//  - his white mouth core (his brightest pixel there) inside his own glow;
//  - the lower jaw: running diagonally from the mouth corner down to the chin, a navy outer line, a
//    cyan body and a dark inner edge with three teeth pointing up into the mouth; the mouth is left
//    open to the right.
//   a ink  b navy  d deep  k cyan  q pale  r bright white  W his white  '.' his own pixel
const KIRIN_FACE44 = {
  x0: 20,
  y0: 12,
  rows: [
    '.................bq', // 12
    '.................bqo', // 13
    '.................bqo', // 14
    '..................qo', // 15
    '', // 16
    '..............qqqq', // 17
    '...............aa', // 18
    '', // 19
    '..bbbbbb', // 20
    '.b......bbbbbb', // 21
    '.bk......rr.rrbbbbb', // 22
    '.bkd.WW..r..q..rr.r', // 23
    '.bkkdWWW.q.....r..q', // 24
    '..bkk.W........q', // 25
    '..bkkd', // 26
    '...bkkdq', // 27
    '...bkkr', // 28
    '....bkkdq', // 29
    '.....bkkr', // 30
    '......bkkdq', // 31
    '.......bkkr', // 32
    '........bkkk', // 33
    '.........bbkk', // 34
    '...........bb', // 35
  ],
};
function kirinFace44(pt: Paint): void {
  // His white: the brightest of the entries kept for the details.
  const spare = pt.p.rgb.map((_, i) => i).filter((i) => pt.p.spare[i]).sort((i, j) => pt.p.lab[j][0] - pt.p.lab[i][0]);
  const white = toHex(pt.p.rgb[spare[0]]);
  pt.ascii(KIRIN_FACE44.x0, KIRIN_FACE44.y0, KIRIN_FACE44.rows, { a: K_INK, b: '#1a2351', d: '#1d3f82', k: '#48b2da', q: '#96f3f8', r: '#d3fbfb', o: '#77e6f2', W: white });
}

/**
 * A fang: a pointed wedge from its root (`w` pixels wide) to a one-pixel tip, white with its
 * right-hand (or lower) edge pale on the rows that are three pixels wide.
 */
function fang(pt: Paint, root: [number, number], tip: [number, number], w: number): void {
  const len = Math.hypot(tip[0] - root[0], tip[1] - root[1]);
  const n = Math.max(1, Math.round(len));
  const ux = (tip[0] - root[0]) / len, uy = (tip[1] - root[1]) / len;
  // Across the fang: along x for an upright fang, along y for a lying one.
  const [ax, ay] = Math.abs(uy) >= Math.abs(ux) ? [1, 0] : [0, 1];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const cx = root[0] + (tip[0] - root[0]) * t, cy = root[1] + (tip[1] - root[1]) * t;
    const wi = Math.max(1, Math.round(w * (1 - t) + t));
    for (let j = 0; j < wi; j++) {
      const o = j - (wi - 1) / 2;
      pt.px(Math.round(cx + ax * o), Math.round(cy + ay * o), wi >= 3 && j === wi - 1 ? K_PALE : K_WHITE);
    }
  }
}

/** A polyline moved `d` pixels sideways, toward the point `to`. */
function offsetPoly(pts: [number, number][], d: number, to: [number, number]): [number, number][] {
  return pts.map(([x, y], i) => {
    const [px, py] = pts[Math.max(0, i - 1)], [nx, ny] = pts[Math.min(pts.length - 1, i + 1)];
    let ox = -(ny - py), oy = nx - px;
    const l = Math.hypot(ox, oy) || 1;
    (ox /= l), (oy /= l);
    if (ox * (to[0] - x) + oy * (to[1] - y) < 0) (ox = -ox), (oy = -oy);
    return [Math.round(x + ox * d), Math.round(y + oy * d)] as [number, number];
  });
}

// His Kirin at 88: his own pixels show the head; restated are his dark separation lines (the crease
// over the brow, the lip line back from the mouth corner, the cheek, the outer jaw); the horn as his
// curved spike, tapering from the snout up and back to a one-pixel tip, lit on its front edge and
// outlined in navy on its back edge only; the snout's front rounded out to his nose against the
// sky; the lidded eye (a dark almond five pixels long under a lit lid); the upper gum as his curve
// from the mouth corner to the snout; his mouth glow with a white core (his whitest pixel) and a
// wider pale halo running right along his breath; six fangs at his positions, each a tapering
// triangle (3 or 2 pixels at the root, 3 to 6 long, its back edge straight, lit white with a pale
// front edge); and the lower jaw as his dark band round the open mouth with pointed teeth.
const KIRIN_JAW88: [number, number][] = [[45, 45], [46, 51], [48, 56], [50, 60], [52, 63], [54, 65], [56, 67], [59, 68], [61, 68], [63, 66], [64, 62], [63, 58], [62, 55]];
const KIRIN_HORN88: [number, number][] = [[74, 22.3], [75.5, 25], [77.2, 28.5], [78.6, 31.5], [79.4, 34.5], [79.8, 37]];
const KIRIN_HORN_W88 = [1, 1.6, 2.6, 3.6, 4.4, 5];
/** His snout front at 88: the right-most pixel of the snout on each row (33 to 43). */
const KIRIN_SNOUT88: Record<number, number> = { 33: 80, 34: 81, 35: 81, 36: 82, 37: 82, 38: 82, 39: 82, 40: 81, 41: 81, 42: 80, 43: 79 };
/** His upper fangs at 88: left column, root row, and the shape (W white, P pale front edge). */
const KIRIN_FANGS88: [number, number, string[]][] = [
  [58, 43, ['WWP', 'WWP', 'WP.', 'WP.', 'W..', 'P..']],
  [62, 43, ['WP', 'WP', 'W.', 'P.']],
  [65, 44, ['WP', 'W.', 'P.']],
  [69, 45, ['WWP', 'WWP', 'WP.', 'WP.', 'W..', 'P..']],
  [73, 46, ['WP', 'WP', 'W.', 'P.']],
  [76, 46, ['WP', 'W.', 'W.', 'P.']],
];
function kirin88(pt: Paint): void {
  const L = (x: number, y: number): number => pt.p.lab[pt.at(x, y)]?.[0] ?? 0;
  const lab = (c: string): number => pt.p.lab[pt.c(c)][0];
  // Separation lines.
  pt.line([[49, 31], [53, 31], [57, 32], [61, 33]], K_NAVY); // the crease over the brow
  pt.line([[61, 33], [64, 34], [67, 34]], K_MIDD); // top of the brow ridge
  pt.line([[41, 38], [44, 39], [47, 40]], K_NAVY); // the lip line, back from the mouth corner
  pt.line([[40, 44], [43, 47], [45, 50]], K_NAVY); // cheek
  pt.line([[41, 51], [44, 55], [47, 60], [50, 64], [53, 68]], K_NAVY); // outer jaw, behind the jaw
  // The snout's front, rounded out to his nose: pale up to the edge, the edge pixel bright.
  for (const [ys, edge] of Object.entries(KIRIN_SNOUT88)) {
    const y = +ys;
    for (let x = 77; x <= edge; x++) if (L(x, y) < lab(K_PALE)) pt.px(x, y, x === edge ? K_BRIGHT : K_PALE);
  }
  // The horn: drawn from its tip down to the snout, so its lit side is the front.
  const before = new Set(pt.drawn);
  flameStroke(pt, KIRIN_HORN88, KIRIN_HORN_W88, K_WHITE, K_PALE, K_BRIGHT);
  const horn = [...pt.drawn].filter((i) => !before.has(i));
  for (let y = 22; y <= 33; y++) {
    const xs = horn.filter((i) => Math.floor(i / 88) === y).map((i) => i % 88);
    if (xs.length) pt.px(Math.min(...xs) - 1, y, K_NAVY);
  }
  // The eye: a dark almond under a lit lid, shaded under it.
  pt.line([[67, 35], [70, 35], [72, 36], [74, 37]], K_PALE);
  pt.dots([[69, 37], [73, 39]], K_NAVY);
  pt.dots([[70, 37], [71, 37], [71, 38], [72, 38]], K_INK);
  pt.dots([[70, 38], [70, 39], [71, 39], [72, 39]], K_MIDD);
  // The upper gum, his curve from the mouth corner to the snout, a navy line under it; under that the
  // roof of his mouth in his mid blue (as his: the glow lights the mouth from below and behind), so
  // the white fangs stand out from it; then his fangs.
  const gum: [number, number][] = [[48, 40], [52, 40], [55, 41], [60, 41], [65, 42], [70, 43], [75, 44], [79, 44]];
  pt.line(gum.slice(1).map(([x, y]) => [x, y + 1] as [number, number]), K_NAVY);
  pt.line(gum, K_INK);
  for (const [x, y] of polyPixels(gum)) {
    if (x < 57) continue;
    for (let d = 2; d <= 5 + (x - 57) / 8; d++) if (!pt.drawn.has((y + d) * 88 + x) && L(x, y + d) > lab(K_MID)) pt.px(x, y + d, d <= 3 ? K_MID : K_CYAN);
  }
  // His mouth glow: a pale halo stretched right along his breath, a white ring, his white core.
  const W = (() => {
    const sp = pt.p.rgb.map((_, i) => i).filter((i) => pt.p.spare[i]).sort((i, j) => pt.p.lab[j][0] - pt.p.lab[i][0]);
    return toHex(pt.p.rgb[sp[0]]);
  })();
  for (let y = 40; y <= 58; y++)
    for (let x = 44; x <= 72; x++) {
      const e = Math.hypot((x - 52.5) / (x > 52.5 ? 10 : 5.5), (y - 48) / 5);
      const d = Math.hypot(x - 52.5, y - 47.8);
      if (d <= 2.6) pt.px(x, y, W);
      else if (d <= 3.7) pt.px(x, y, K_WHITE);
      else if (e <= 1 && !pt.drawn.has(y * 88 + x) && L(x, y) < lab(K_PALE) && L(x, y) > lab(K_MIDD)) pt.px(x, y, K_PALE);
    }
  for (const [x0, y0, rows] of KIRIN_FANGS88) pt.ascii(x0, y0, rows, { W: K_WHITE, P: K_PALE });
  // His peach sparks: dashes of 3 to 4 pixels, a warm core and a dimmer end.
  const [PEACH, PEACH_DIM] = peach(pt);
  pt.spark([[77, 18], [76, 19], [75, 20], [74, 21], [73, 22]], [PEACH, PEACH, PEACH, PEACH_DIM, PEACH_DIM]);
  pt.spark([[82, 18], [81, 19], [80, 20], [79, 21]], [PEACH, PEACH, PEACH_DIM, PEACH_DIM]);
  pt.spark([[75, 61], [74, 60], [73, 59], [76, 60]], [PEACH, PEACH, PEACH_DIM, PEACH_DIM]);
  pt.spark([[71, 69], [72, 70], [72, 71], [73, 72], [73, 73]], [PEACH_DIM, PEACH, PEACH, PEACH, PEACH_DIM]);
  // The lower jaw: his navy outer line, a dark band inside it, and his teeth pointing into the mouth.
  const inside: [number, number] = [57, 57];
  pt.line(KIRIN_JAW88, K_INK);
  pt.line(offsetPoly(KIRIN_JAW88, 1, inside), K_NAVY);
  pt.line(offsetPoly(KIRIN_JAW88, 2, inside), K_DARK);
  for (const c of [[49.5, 53.5], [51, 57.5], [53.2, 61], [55.6, 64], [58.5, 66], [61.2, 65.5], [62.2, 61.5], [61.6, 58]] as [number, number][]) {
    const dx = inside[0] - c[0], dy = inside[1] - c[1], l = Math.hypot(dx, dy);
    fang(pt, [c[0] - (dx / l) * 1.2, c[1] - (dy / l) * 1.2], [c[0] + (dx / l) * 2.2, c[1] + (dy / l) * 2.2], 2);
  }
}

/** Points traced at 44 put on an icon of size N (pixel centres kept: 44 -> 88 maps x to 2x + 0.5). */
function at(N: number, pts: [number, number][]): [number, number][] {
  const k = N / 44;
  return pts.map(([x, y]) => [Math.round(x * k + (k - 1) / 2), Math.round(y * k + (k - 1) / 2)]);
}

/** A spiral (1 pixel) around (cx, cy) from radius r0 to r1 over `turns`, starting at angle a0 (radians, clockwise on screen). */
function spiralPts(cx: number, cy: number, r0: number, r1: number, turns: number, a0: number): [number, number][] {
  const out: [number, number][] = [];
  const n = Math.ceil(turns * 48);
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = a0 + t * turns * 2 * Math.PI, r = r0 + (r1 - r0) * t;
    const p: [number, number] = [Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a))];
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  // Keep it a clean 1-pixel line: drop points that only double a corner.
  return polyPixels(out);
}

/** For each pixel of a line, its neighbour on the side away from (cx, cy) (the outer side of a curl). */
function outerSide(px: [number, number][], cx: number, cy: number): [number, number][] {
  const on = new Set(px.map(([x, y]) => x * 1000 + y));
  const out: [number, number][] = [];
  for (const [x, y] of px) {
    const dx = x - cx, dy = y - cy, n = Math.hypot(dx, dy) || 1;
    const o: [number, number] = [x + Math.round(dx / n), y + Math.round(dy / n)];
    if (!on.has(o[0] * 1000 + o[1]) && !out.some((q) => q[0] === o[0] && q[1] === o[1])) out.push(o);
  }
  return out;
}

/**
 * His dark separation lines, found on his own picture at 88: pixels darker than the closing of the
 * lightness (radius 2) by more than `thr`, inside `region` (88 coordinates). Each connected group at
 * least `minLen` pixels long becomes a 1-pixel line (the darkest pixel of each column, or of each row
 * for an upright group); the `max` strongest are drawn in `col`, at 88 as found and at 44 halved
 * (so the 44 lines follow the same seams).
 */
function valleyLines(pt: Paint, src: F, region: (x: number, y: number) => boolean, thr: number, minLen: number, max: number, col: string): void {
  const box = areaResize(src, 88, 88);
  const { w, h } = box;
  const L = lightness(box);
  const cl = morph(morph(L, w, h, 2, true), w, h, 2, false);
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = cl[y * w + x] - L[y * w + x] > thr && region(x, y) ? 1 : 0;
  const found: { px: [number, number][]; score: number }[] = [];
  for (const g of groups(m, w, h)) {
    const xs = g.map((i) => i % w), ys = g.map((i) => Math.floor(i / w));
    const bw = Math.max(...xs) - Math.min(...xs) + 1, bh = Math.max(...ys) - Math.min(...ys) + 1;
    if (Math.max(bw, bh) < minLen) continue;
    const byCol = bw >= bh;
    const best = new Map<number, number>();
    for (const i of g) {
      const key = byCol ? i % w : Math.floor(i / w);
      const cur = best.get(key);
      if (cur === undefined || cl[i] - L[i] > cl[cur] - L[cur] || (cl[i] - L[i] === cl[cur] - L[cur] && i < cur)) best.set(key, i);
    }
    const px = [...best.entries()].sort((a, b) => a[0] - b[0]).map(([, i]) => [i % w, Math.floor(i / w)] as [number, number]);
    found.push({ px, score: g.reduce((a, i) => a + cl[i] - L[i], 0) });
  }
  found.sort((a, b) => b.score - a.score || a.px[0][0] - b.px[0][0] || a.px[0][1] - b.px[0][1]);
  const k = pt.N / 88;
  for (const f of found.slice(0, max)) {
    const pts: [number, number][] = [];
    for (const [x, y] of f.px) {
      const p: [number, number] = [Math.floor(x * k), Math.floor(y * k)];
      const q = pts[pts.length - 1];
      if (!q || q[0] !== p[0] || q[1] !== p[1]) pts.push(p);
    }
    pt.line(pts, col);
  }
}

/**
 * A tapered flame stroke along a polyline given in 88 coordinates (halved for 44): `w88` is its
 * width (88 pixels) at each point. Each pixel takes `lit` on the stroke's left side (left of the
 * way it is drawn), `body` in the middle and `shade` on its right, by where it sits across the stroke.
 */
function flameStroke(pt: Paint, pts88: [number, number][], w88: number[], lit: string, body: string, shade: string): void {
  const k = pt.N / 88;
  const P = pts88.map(([x, y]) => [(x + 0.5) * k - 0.5, (y + 0.5) * k - 0.5] as [number, number]);
  const Wd = w88.map((w) => Math.max(1, w * k));
  const seg: { a: [number, number]; b: [number, number]; wa: number; wb: number }[] = [];
  for (let i = 0; i + 1 < P.length; i++) seg.push({ a: P[i], b: P[i + 1], wa: Wd[i], wb: Wd[i + 1] });
  const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]), m = Math.max(...Wd);
  for (let y = Math.floor(Math.min(...ys) - m); y <= Math.ceil(Math.max(...ys) + m); y++)
    for (let x = Math.floor(Math.min(...xs) - m); x <= Math.ceil(Math.max(...xs) + m); x++) {
      let best = Infinity, side = 0, half = 0;
      for (const { a, b, wa, wb } of seg) {
        const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
        const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2));
        const qx = a[0] + dx * t, qy = a[1] + dy * t;
        const d = Math.hypot(x - qx, y - qy);
        if (d < best) (best = d), (half = (wa + (wb - wa) * t) / 2), (side = (dx * (y - a[1]) - dy * (x - a[0])) / Math.sqrt(l2));
      }
      if (best > half) continue;
      // side < 0: left of the way the stroke is drawn (screen y down).
      const u = half > 0.75 ? -side / half : 0;
      pt.px(x, y, u > 0.34 ? lit : u < -0.34 ? shade : body);
    }
}

/**
 * His swirl: an orange arm curling in from the flames to an orange eye, with dark gaps between the
 * turns. Centre and radii in 88 coordinates. The arm starts at angle `a0` (degrees, screen y down) at
 * radius `r0` and turns counter-clockwise on screen through `turn` degrees, its radius falling to
 * `r1`; it is `w` pixels wide (88) and lit (`lit`) on its outer side. Every other pixel of the disk
 * of radius `R` becomes `gap`.
 */
function swirl(pt: Paint, c88: [number, number], R: number, a0: number, turn: number, r0: number, r1: number, w: number, cols: { lit: string; arm: string; eye: string; gap: string }): void {
  const k = pt.N / 88;
  const cx = (c88[0] + 0.5) * k - 0.5, cy = (c88[1] + 0.5) * k - 0.5;
  const path: [number, number, number][] = [];
  const n = 400;
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = ((a0 - turn * t) * Math.PI) / 180, r = (r0 + (r1 - r0) * t) * k;
    path.push([cx + r * Math.cos(a), cy + r * Math.sin(a), r]);
  }
  for (let y = Math.floor(cy - R * k - 1); y <= Math.ceil(cy + R * k + 1); y++)
    for (let x = Math.floor(cx - R * k - 1); x <= Math.ceil(cx + R * k + 1); x++) {
      const rr = Math.hypot(x - cx, y - cy);
      if (rr > R * k) continue;
      let best = Infinity, ar = 0;
      for (const [px, py, r] of path) {
        const d = Math.hypot(x - px, y - py);
        if (d < best) (best = d), (ar = r);
      }
      if (rr <= Math.max(0.75, 1.1 * k)) pt.px(x, y, cols.eye);
      else if (best <= (w * k) / 2) pt.px(x, y, rr > ar + 0.25 * k && k > 1 ? cols.lit : cols.arm);
      else pt.px(x, y, cols.gap);
    }
}

// His Great Fire Annihilation. His own bands carry the picture (the base is put on the palette with
// hue weighed up, so his crimson bands stay crimson and do not fall into his smoke). Drawn on it:
// his inner tongue rising and hooking inside the crest as a thick flame, lit on its left (3 pixels
// at 44, 5 at 88), and his swirl low on the left as an orange arm curling into an orange eye with
// dark crimson gaps. Then his embers and dark flakes. Traced on his picture at 88.
const ANNI_TONGUE88: [number, number][] = [[30.5, 55], [31.5, 47], [32.5, 41], [34, 37], [36.5, 34.5], [39.5, 33.2], [42, 33.6], [44, 35], [45.3, 37.5]];
const ANNI_TONGUE_W88 = [5, 5, 4.6, 4, 3.6, 3.2, 2.8, 2.2, 1];
// At 44 the swirl is drawn by hand (a computed spiral that small closes into a blob): the arm comes
// in from the flames at the top right, runs over the top, down the left side, along the bottom and
// up the right side, then turns left into the eye; his own dark ring is left round it.  O eye, o arm,
// d gap, '.' his own pixel.
const ANNI_SWIRL44 = {
  x0: 10,
  y0: 32,
  rows: [
    '.ooooo', // 32
    '.ooddddd', // 33
    '.odOOo', // 34
    '.oddOo', // 35
    '.ooddoo', // 36
    '..oooo', // 37
  ],
};
const N44 = (pt: Paint): boolean => pt.N === 44;
function annihilation(pt: Paint, ctx: Ctx): void {
  flameStroke(pt, ANNI_TONGUE88, ANNI_TONGUE_W88, '#f49933', '#e2691f', '#d2541a');
  const sw = { O: '#ee8029', o: N44(pt) ? '#d2541a' : '#e2691f', d: '#67191c' };
  if (pt.N === 44) pt.ascii(ANNI_SWIRL44.x0, ANNI_SWIRL44.y0, ANNI_SWIRL44.rows, sw);
  else swirl(pt, [28.5, 70], 8.6, -52, 400, 6.8, 1.8, 3.8, { lit: sw.O, arm: sw.o, eye: sw.O, gap: sw.d });
  embers(pt, ctx);
}

/** His embers in the smoke, and his dark flakes, as short streaks (the strongest of them). */
function embers(pt: Paint, ctx: Ctx): void {
  const N = pt.N;
  const bright = ctx.specks.filter((s) => s.bright), dark = ctx.specks.filter((s) => !s.bright);
  stampStreaks(pt, bright, ctx.src.w, ctx.src.h, N === 44 ? 10 : 20, N === 44 ? 2 : 3, 0.12);
  stampStreaks(pt, dark, ctx.src.w, ctx.src.h, N === 44 ? 5 : 10, N === 44 ? 2 : 3, 0.1);
}

const W_NIGHT = '#233850', W_BARREL_LOW = '#164c71', W_DEEP = '#0a3a64', W_MID = '#1c6d8b', W_TEAL = '#11a0a6', W_TURQ = '#21b3b2', W_SHADOW = '#18a7b8', W_FOAM = '#abeef4', W_WHITE = '#ccf5f8';

// His Water Wall: the barrel under the curl as one clean dark area (darker at the top, as his), his
// bands as continuous curved stripes wrapping into it (the bright turquoise band at the barrel's
// edge, then dark, mid and dark again), the foam lip with a white top edge, a pale underside and a
// turquoise shadow line where it overhangs the barrel, his spray flecks at the top left, and his
// bottom foam as short horizontal dashes. Traced at 44, drawn at either size.
function water(pt: Paint, ctx: Ctx): void {
  const N = pt.N, k = N / 44;
  // The barrel.
  const barrel = at(N, [[9, 15], [12, 14], [15, 15], [16, 17], [16, 25], [15, 28], [12, 30], [9, 29], [7, 26], [8, 20]]);
  // Darkest under the lip and against the wave, one step lighter toward his lower left (as his).
  const pool: string[] = pt.p.rgb.map((c) => toHex(c)).filter((_, i) => pt.p.lab[i][0] < 0.8);
  const upper = (x: number, y: number) => (y - (k - 1) / 2) / k < 16 + ((x - (k - 1) / 2) / k - 7) * 0.7;
  pt.recolor((x, y) => pt.inside(barrel, x, y) && upper(x, y), pool, W_NIGHT);
  pt.recolor((x, y) => pt.inside(barrel, x, y) && !upper(x, y), pool, W_BARREL_LOW);
  if (N === 44) return water44(pt, ctx, barrel);
  // The bands, from the barrel's edge outwards.
  const bands: [string, [number, number][]][] = [
    [W_TURQ, [[12, 13], [14, 13], [16, 14], [17, 16], [17, 25], [16, 28], [14, 30], [11, 31]]],
    [W_TEAL, [[15, 12], [17, 13], [18, 15], [18, 26], [17, 29], [15, 31], [12, 32]]],
    [W_DEEP, [[18, 11], [19, 13], [20, 16], [20, 27], [19, 30], [17, 32], [14, 33]]],
    [W_MID, [[21, 11], [22, 14], [22, 28], [21, 31], [19, 33], [16, 35]]],
    [W_DEEP, [[24, 10], [25, 13], [25, 29], [24, 32], [22, 34], [19, 36]]],
  ];
  // Each long upright stretch bows out by 3/4 of a 44 pixel at its middle, so the band curves round
  // the barrel as his do instead of running straight down.
  const bow = (pts: [number, number][]): [number, number][] => {
    const out: [number, number][] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      if (x0 === x1 && Math.abs(y1 - y0) >= 6) for (const f of [0.15, 0.3, 0.5, 0.7, 0.85]) out.push([x0 + 0.75 * Math.sin(Math.PI * f), y0 + (y1 - y0) * f]);
      out.push(pts[i]);
    }
    return out;
  };
  for (const [col, raw] of bands) {
    const pts = bow(raw);
    pt.line(at(N, pts), col);
    // At 88 each band is two pixels wide, as his.
    if (N === 88 && col !== W_DEEP) pt.line(at(N, pts).map(([x, y]) => [x + 1, y] as [number, number]), col);
  }
  // The lip: its underside pale, then the shadow line where it overhangs the barrel.
  pt.line(at(N, [[6, 15], [8, 13], [11, 12], [14, 12]]), W_FOAM);
  pt.line(at(N, [[7, 15], [9, 14], [11, 13], [13, 13]]), W_SHADOW);
  // A white top edge on his foam: foam pixels with the night above them.
  const night = pt.p.lab[pt.c(W_NIGHT)][0];
  for (let y = 1; y < Math.round(20 * k); y++)
    for (let x = 0; x < N; x++) {
      const v = pt.at(x, y), up = pt.at(x, y - 1);
      if (pt.p.lab[v][0] > 0.8 && up >= 0 && pt.p.lab[up][0] < night + 0.08 && !pt.drawn.has(y * N + x)) pt.px(x, y, W_WHITE);
    }
  // His spray flecks at the top left (and in the barrel), as 1- and 2-pixel marks.
  const inBarrel = (s: Speck) => pt.inside(barrel, Math.round(((s.cx + 0.5) * N) / ctx.src.w - 0.5), Math.round(((s.cy + 0.5) * N) / ctx.src.h - 0.5));
  const spray = ctx.specks.filter((s) => s.cx < 100 && s.cy < 140);
  stampStreaks(pt, spray.filter((s) => !inBarrel(s)), ctx.src.w, ctx.src.h, N === 44 ? 8 : 16, N === 44 ? 2 : 3, 0.2);
  stampStreaks(pt, spray.filter(inBarrel), ctx.src.w, ctx.src.h, N === 44 ? 4 : 8, 1, 0.2);
  // The bottom foam: every pale run in the lower part becomes a horizontal dash of 2 to 4 pixels.
  const pale = (v: number) => pt.p.lab[v][0] > 0.8;
  for (let y = Math.round(30 * k); y < N; y++) {
    let x = 0;
    while (x < N) {
      if (!pale(pt.at(x, y)) || pt.drawn.has(y * N + x)) {
        x++;
        continue;
      }
      let e = x;
      while (e + 1 < N && pale(pt.at(e + 1, y))) e++;
      const len = e - x + 1;
      if (len === 1) {
        // A lone fleck grows into a dash along the row, toward the paler neighbour of his.
        const r = ctx.box.lab(y * N + Math.min(N - 1, x + 1))[0], l = ctx.box.lab(y * N + Math.max(0, x - 1))[0];
        pt.px(r >= l ? x + 1 : x - 1, y, toHex(pt.p.rgb[pt.at(x, y)]));
        pt.px(x, y, toHex(pt.p.rgb[pt.at(x, y)]));
      }
      x = e + 1;
    }
  }
}

/** Points of an ellipse arc (centre, semi-axes, from angle a0 to a1 in degrees, screen y down) as a clean 1-pixel line. */
function arcPixels(cx: number, cy: number, a: number, b: number, a0: number, a1: number): [number, number][] {
  const pts: [number, number][] = [];
  const n = Math.ceil((Math.abs(a1 - a0) / 360) * 2 * Math.PI * Math.max(a, b) * 3);
  for (let i = 0; i <= n; i++) {
    const t = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    const p: [number, number] = [Math.round(cx + a * Math.cos(t)), Math.round(cy + b * Math.sin(t))];
    const q = pts[pts.length - 1];
    if (!q || q[0] !== p[0] || q[1] !== p[1]) pts.push(p);
  }
  return polyPixels(pts);
}

// The Water Wall at 44. The base is his crop smoothed along his strokes over a longer stretch than
// the 88 (10 of his pixels), so his bands come out as continuous curves round the barrel and his
// bottom foam as his diagonal streaks instead of blocks. Over it: the bright turquoise band hugging
// the barrel as one curved line (an arc concentric to the barrel, as his), the lip, the white top
// edge of his foam, his spray flecks, and his foam splash at the lower left, put back from his own
// lightness (his pale where the smoothed picture is pale, his white where it is brightest).
function water44(pt: Paint, ctx: Ctx, barrel: [number, number][]): void {
  for (const [x, y] of arcPixels(12.4, 22, 5.6, 8.6, -98, 118)) if (!pt.inside(barrel, x, y)) pt.px(x, y, W_TURQ);
  // The lip: its underside pale, then the shadow line where it overhangs the barrel.
  pt.line([[6, 15], [8, 13], [11, 12], [14, 12]], W_FOAM);
  pt.line([[7, 15], [9, 14], [11, 13], [13, 13]], W_SHADOW);
  // A white top edge on his foam: foam pixels with the night above them.
  const night = pt.p.lab[pt.c(W_NIGHT)][0];
  for (let y = 1; y < 20; y++)
    for (let x = 0; x < 44; x++) {
      const v = pt.at(x, y), up = pt.at(x, y - 1);
      if (pt.p.lab[v][0] > 0.8 && up >= 0 && pt.p.lab[up][0] < night + 0.08 && !pt.drawn.has(y * 44 + x)) pt.px(x, y, W_WHITE);
    }
  // His foam splash, falling in the barrel's lower part and down to the lower left, from his own
  // lightness (his box reduction): his pale where he is pale, his white where he is brightest.
  const L = lightness(ctx.box);
  const splash = (x: number, y: number) => x <= 18 && y >= 21 && !pt.drawn.has(y * 44 + x);
  const all = pt.p.rgb.map(toHex);
  pt.recolor((x, y) => splash(x, y) && L[y * 44 + x] > 0.72, all, '#99d6de');
  pt.recolor((x, y) => splash(x, y) && L[y * 44 + x] > 0.8, all, W_FOAM);
  pt.recolor((x, y) => splash(x, y) && L[y * 44 + x] > 0.87, all, W_WHITE);
  // His spray flecks at the top left (and in the barrel), as 1- and 2-pixel marks.
  const inBarrel = (s: Speck) => pt.inside(barrel, Math.round(((s.cx + 0.5) * 44) / ctx.src.w - 0.5), Math.round(((s.cy + 0.5) * 44) / ctx.src.h - 0.5));
  const spray = ctx.specks.filter((s) => s.cx < 100 && s.cy < 140);
  stampStreaks(pt, spray.filter((s) => !inBarrel(s)), ctx.src.w, ctx.src.h, 8, 2, 0.2);
  stampStreaks(pt, spray.filter(inBarrel), ctx.src.w, ctx.src.h, 4, 1, 0.2);
}

// His Fireball. His arms are told apart by the dark gaps between them: every pixel of the base that
// is darker than its surroundings in his picture (his own lightness against its blur, sigma 1.5 px at
// 44) goes one step darker, two where the gap is deep, so about six arms read at 44. Beyond his arm
// tips the ground fades to his near-black: the dark entries step down with the distance from his
// centre, to his darkest (#170e16) at the corners. The arm gaps are carried into the white core as
// thin pale-yellow lines (three, as his arms curl in). His sparks are dim wisps off the arm tips: the
// strongest of his specks that lie outside the arms, drawn as short streaks along the swirl in his
// dimmer ramp entries with one warmer pixel.
function fireball(pt: Paint, ctx: Ctx): void {
  const N = pt.N, k = N / 44;
  const [cx, cy] = [21.6 * k + (k - 1) / 2, 22.4 * k + (k - 1) / 2];
  const L = lightness(ctx.smooth);
  const B = gauss(L, N, N, 1.5 * k);
  const r = (x: number, y: number) => Math.hypot(x - cx, y - cy) / k;
  pt.shift((x, y) => r(x, y) > 4.5 && r(x, y) < 21 && B[y * N + x] - L[y * N + x] > 0.06, -1);
  pt.shift((x, y) => r(x, y) > 4.5 && r(x, y) < 21 && B[y * N + x] - L[y * N + x] > 0.11, -1);
  const dark = (x: number, y: number) => pt.p.lab[pt.at(x, y)][0] < pt.p.lab[pt.c('#712116')][0];
  pt.shift((x, y) => dark(x, y) && r(x, y) > 18, -1, '#170e16');
  pt.shift((x, y) => dark(x, y) && r(x, y) > 20.5, -1, '#170e16');
  pt.shift((x, y) => dark(x, y) && r(x, y) > 23.5, -2, '#170e16');
  for (const a0 of [-150, -30, 90])
    for (const [x, y] of spiralPts(cx, cy, 3.5 * k, 10 * k, 0.34, (a0 * Math.PI) / 180)) pt.px(x, y, Math.hypot(x - cx, y - cy) < 6.5 * k ? '#fded8e' : '#f9ce5d');
  // His sparks off the arm tips.
  const sx = N / ctx.src.w, sy = N / ctx.src.h;
  const tips = ctx.specks
    .filter((s) => r((s.cx + 0.5) * sx - 0.5, (s.cy + 0.5) * sy - 0.5) > 16.5)
    .sort((a, b) => b.px.length * (b.peak - b.bg) - a.px.length * (a.peak - a.bg) || a.cx - b.cx || a.cy - b.cy)
    .slice(0, N === 44 ? 9 : 14);
  for (const s of tips) {
    const x = (s.cx + 0.5) * sx - 0.5, y = (s.cy + 0.5) * sy - 0.5;
    const a = Math.atan2(y - cy, x - cx) + Math.PI / 2, ux = Math.cos(a), uy = Math.sin(a);
    const n = N === 44 ? 2 : 3;
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const t = i - (n - 1) / 2;
      const p: [number, number] = [Math.round(x + ux * t), Math.round(y + uy * t)];
      if (!pts.some((q) => q[0] === p[0] && q[1] === p[1])) pts.push(p);
    }
    pt.spark(pts, n === 2 ? ['#b73f19', '#8b2916'] : ['#8b2916', '#cf5218', '#8b2916']);
  }
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
    extra: [
      { box: [59, 59, 139, 139], lo: 0.5, hi: 0.53, spare: false, by: 'L', why: 'his core edge: the step between his pale yellow and his white' },
      { box: [0, 0, 199, 204], lo: 0.13, hi: 0.17, spare: false, by: 'L', why: 'his vignette: one more dark step, so the rim fades as his' },
    ],
    art: fireball,
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
    extra: [
      { box: [158, 164, 170, 178], lo: 0.97, hi: 1, spare: true, by: 'warm', why: 'his peach spark, its warmest bright pixel (the spark cores)' },
      { box: [158, 164, 170, 178], lo: 0.88, hi: 0.94, spare: true, by: 'warm', why: 'his peach spark, a dimmer pixel (the spark ends)' },
      { box: [110, 100, 130, 118], lo: 0.97, hi: 1, spare: true, by: 'L', why: 'his mouth core, its brightest pixels (the white core of the glow)' },
    ],
    bil44: [0.8, 0.03],
    flow: [2, 6],
    art: (pt, ctx) => (pt.N === 44 ? kirin44(pt, ctx) : kirin88(pt)),
    bil88: [0.8, 0.03],
  },
  {
    id: 'great_fire_annihilation',
    name: 'Great Fire Annihilation',
    colors: 16,
    flat: 0.6,
    chroma: 1.6,
    qChroma: 1.6,
    extra: [{ box: [118, 84, 190, 122], lo: 0.4, hi: 0.6, spare: false, by: 'L', why: 'his smoke right of the crest, its middle tone (between his dark smoke and his crimson)' }],
    specks: [FIRE_SPECK, { bright: false, r: 4, thr: 0.1, bgMin: 0.28, peakMax: 0.27, minPx: 4, maxPx: 200, maxLong: 16, maxAcross: 6 }],
    bil44: [1, 0.05],
    art: annihilation,
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
    flow: [2, 4],
    flow44: [3, 10],
    greyOut: [0.5, 0.8, 0.07],
    extra: [
      { box: [68, 68, 92, 104], lo: 0.85, hi: 0.95, spare: false, by: 'teal', why: 'his inner curl, its greenest turquoise (the bright band round the barrel)' },
      { box: [68, 68, 92, 104], lo: 0.55, hi: 0.75, spare: false, by: 'teal', why: 'his inner curl, its mid turquoise' },
    ],
    art: water,
    bil88: [1, 0.05],
  },
];

// --- his slot frame -----------------------------------------------------------------------------

/**
 * His skill slot (56x56, the icon window 44x44 at 6,6), one art pixel per screen pixel like the
 * icons. From the outside in, as he painted it (his colours, measured on all four slots by
 * tools/refs/icons-from-ref.py): a black line, the dark steel bar (lit outer edge, then its body),
 * a dark gap, his thin gold line and a black line before the picture. Each side keeps his own
 * shade of steel and gold. Over the corners sit his gold brackets: a block holding a steel rivet,
 * two arms along the bar that end in a 45-degree cut (10 pixels from the corner, as his), lit from
 * the top left. The window is left transparent, so the frame can be drawn over the icon (the brackets
 * then overlap the icon's corners by a pixel or two, as in his picture) or under it.
 */
interface FrameColors {
  outline: string;
  steelLight: [string, string, string, string]; // top, right, bottom, left
  steel: [string, string, string, string];
  gap: string;
  gold: [string, string, string, string];
  inner: string;
  bracket: { hi: string; light: string; mid: string; dark: string; edge: string };
  rivet: { hi: string; mid: string; dark: string; rim: string };
}

const STEEL: FrameColors = {
  outline: '#05060a',
  steelLight: ['#626978', '#404858', '#434856', '#484e5c'],
  steel: ['#2d3444', '#2f3340', '#2d3440', '#2e3544'],
  gap: '#0e0f13',
  gold: ['#c2b38d', '#8c765a', '#af9c7e', '#a18a6a'],
  inner: '#0a0607',
  // His antique gold, measured on his brackets: the pale only on the lit outer edge, his two main
  // tones for the lit inner edges and the body, his darkest for the shadow edges.
  bracket: { hi: '#ebd8a9', light: '#a6875b', mid: '#876b46', dark: '#584429', edge: '#1a1206' },
  // His dark steel rivets (his three measured tones).
  rivet: { hi: '#b4b7bf', mid: '#78787c', dark: '#555251', rim: '#15161a' },
};

// Selected or hovered: his steel bar kept; his inner gold line and the brackets one step brighter,
// the rivets glinting, and a 1-pixel warm glow just outside the slot (its outer line turns amber),
// so the brackets still stand out from the bar.
const GOLDEN: FrameColors = {
  outline: '#c8902c',
  steelLight: STEEL.steelLight,
  steel: STEEL.steel,
  gap: '#2a1c0a',
  gold: ['#ead9a8', '#b89c74', '#d6c39c', '#c8b08a'],
  inner: '#0a0607',
  bracket: { hi: '#fff3c8', light: '#cfab6f', mid: '#a8875a', dark: '#7c6646', edge: '#1a1206' },
  rivet: { hi: '#ffffff', mid: '#a8aeba', dark: '#5a606c', rim: '#15161a' },
};

const SLOT = 56, RING = 6, SLICE = 16;

/** The top-left bracket's shape (1 = gold), before mirroring into the other corners. */
function bracketMask(): boolean[][] {
  const m = Array.from({ length: SLICE }, () => Array(SLICE).fill(false) as boolean[]);
  // The block that holds the rivet, its inner corner cut at 45 degrees (it stays on the ring).
  for (let y = 1; y <= 6; y++) for (let x = 1; x <= 6; x++) if (x + y <= 11) m[y][x] = true;
  // Arms along the bar: two pixels thick, ending in his 45-degree cut. They reach 10 pixels from
  // the corner (his reach 42 of his 236 pixels, 18% of the side).
  for (let x = 7; x <= 10; x++) m[1][x] = true;
  for (let x = 7; x <= 9; x++) m[2][x] = true;
  for (let y = 7; y <= 10; y++) m[y][1] = true;
  for (let y = 7; y <= 9; y++) m[y][2] = true;
  return m;
}

/** The rivet: a round steel ball four pixels across, lit from the top left; its four corners are left to the bracket ('.'). */
const RIVET = ['.mm.', 'mhmd', 'mmdd', '.dd.'];

function buildFrame(c: FrameColors): Img {
  const img = new Img(SLOT, SLOT);
  const side = (x: number, y: number): number => {
    // Which side of the ring a pixel belongs to (0 top, 1 right, 2 bottom, 3 left), split on the diagonals.
    const dt = y, db = SLOT - 1 - y, dl = x, dr = SLOT - 1 - x;
    const m = Math.min(dt, db, dl, dr);
    return m === dt ? 0 : m === dr ? 1 : m === db ? 2 : 3;
  };
  for (let y = 0; y < SLOT; y++)
    for (let x = 0; x < SLOT; x++) {
      const d = Math.min(x, y, SLOT - 1 - x, SLOT - 1 - y);
      if (d >= RING) continue;
      const sd = side(x, y);
      const col = [c.outline, c.steelLight[sd], c.steel[sd], c.gap, c.gold[sd], c.inner][d];
      img.set(x, y, hex(col));
    }
  // Brackets: the mask mirrored into each corner, then shaded with the light from the top left.
  const mk = bracketMask();
  const gold = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= SLOT || y >= SLOT) return false;
    const mx = x < SLOT / 2 ? x : SLOT - 1 - x, my = y < SLOT / 2 ? y : SLOT - 1 - y;
    return mx < SLICE && my < SLICE && mk[my][mx];
  };
  for (let y = 0; y < SLOT; y++)
    for (let x = 0; x < SLOT; x++) {
      if (gold(x, y)) {
        const up = !gold(x, y - 1), left = !gold(x - 1, y), down = !gold(x, y + 1), right = !gold(x + 1, y);
        // The pale only on the lit outer edge (the slot's top row and left column of the brackets).
        const col = (up && y === 1) || (left && x === 1) ? c.bracket.hi : up || left ? c.bracket.light : down || right ? c.bracket.dark : c.bracket.mid;
        img.set(x, y, hex(col));
      }
    }
  // A dark edge where the bracket meets the bar, the gold line or the window (not on the outline).
  for (let y = 1; y < SLOT - 1; y++)
    for (let x = 1; x < SLOT - 1; x++) {
      if (gold(x, y)) continue;
      if (gold(x - 1, y) || gold(x + 1, y) || gold(x, y - 1) || gold(x, y + 1)) img.set(x, y, hex(c.bracket.edge));
    }
  // Rivets, each in its corner block, all lit from the top left.
  const rv: Record<string, string> = { h: c.rivet.hi, m: c.rivet.mid, d: c.rivet.dark };
  for (const [ox, oy] of [[2, 2], [SLOT - 6, 2], [2, SLOT - 6], [SLOT - 6, SLOT - 6]]) {
    RIVET.forEach((row, ry) =>
      [...row].forEach((ch, rx) => {
        if (ch !== '.') img.set(ox + rx, oy + ry, hex(rv[ch]));
      }),
    );
    // Its shadow on the bracket, at the lower right only (the corners stay round).
    img.set(ox + 3, oy + 3, hex(c.bracket.dark));
  }
  return img;
}

const frame = buildFrame(STEEL);
const frameActive = buildFrame(GOLDEN);

/** A sliced frame must stretch cleanly: the pixels between the insets repeat along each edge. */
function checkSlice(img: Img, inset: number): void {
  for (let a = inset; a < img.w - inset - 1; a++)
    for (let k = 0; k < img.h; k++) {
      const p = img.get(a, k), q = img.get(a + 1, k), r = img.get(k, a), t = img.get(k, a + 1);
      if (p.join() !== q.join() || r.join() !== t.join()) throw new Error(`skill_slot_steel: the centre between the ${inset}-pixel slices does not repeat (at ${a})`);
    }
}
checkSlice(frame, SLICE);
checkSlice(frameActive, SLICE);

// --- build, write, check ------------------------------------------------------------------------

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
    for (const N of [44, 88]) {
      const o = b.out[N];
      const { lab, size } = components(o.q);
      const m = o.img.clone();
      for (let i = 0; i < N * N; i++) if (size[lab[i]] <= 2) m.set(i % N, Math.floor(i / N), o.listed.has(i) ? hex('#ffff00') : hex('#ff00ff'));
      savePng(join(DEBUG, `${b.spec.id}-${N}-small-x8.png`), m.scaled(8));
    }
    savePng(join(DEBUG, `${b.spec.id}-88.png`), o88.img);
    const A = 'abcdefghijklmnopqrstuvwxyz';
    writeAtomic(join(DEBUG, `${b.spec.id}-44.txt`), b.pal.rgb.map((c, i) => A[i] + ' ' + toHex(c)).join('\n') + '\n\n' + Array.from({ length: 44 }, (_, y) => Array.from({ length: 44 }, (_, x) => A[o44.q.get(x, y)]).join('')).join('\n') + '\n');
    savePng(join(DEBUG, `${b.spec.id}-base44.png`), o44.base.toImg(b.pal));
    savePng(join(DEBUG, `${b.spec.id}-base88.png`), o88.base.toImg(b.pal));
  }
}

for (const b of built) {
  savePng(join(OUT, `${b.spec.id}.png`), b.out[44].img);
  savePng(join(OUT, `${b.spec.id}@2x.png`), b.out[88].img);
}
savePng(join(OUT, 'skill_slot_steel.png'), frame);
savePng(join(OUT, 'skill_slot_steel_active.png'), frameActive);

// --- manifest -----------------------------------------------------------------------------------

const manifest = {
  kit: 'ui_icons',
  reference: 'docs/reference/icons-owner-reference-1.jpg',
  round: 3,
  screen: [1600, 900],
  pixel: 'one art pixel per screen pixel (finer than ui_battle, whose art pixels are 2x2): draw at 1x on a 1600x900 screen, @2x on a 2x screen, always with image-rendering: pixelated',
  sliceOrder: 'top, right, bottom, left (pixels)',
  method:
    'his crop area-averaged (box) straight to the size (smoothed along his strokes first for the Kirin and the water), a light bilateral filter, nearest palette entry with no dither (hue weighed up for the fire wave), every 1- or 2-pixel area of one colour merged into its neighbours, then only what the reduction loses restated on his picture (traced on his crop) and his sparks drawn on top (see tools/ui/ui-icons.ts)',
  checks:
    'small = 8-connected areas of one colour of 1 or 2 pixels: smallSparks hold one of his sparks, embers or foam flecks, smallDrawn hold a drawn detail (fang, eye, outline, bolt, seam), smallOther are left over from the reduction; lowFreq = mean OKLab difference x100 to his box reduction after both are blurred (sigma size/30), lowFreqBoxOnPalette = the same for his box reduction put on our palette; hue = OKLab median hue in degrees (hueHis: his box reduction); thinRun = the longest straight run of one colour one pixel thick, along a row or a column [length, row or col, index]',
  icons: Object.fromEntries(
    built.map((b) => [
      b.spec.id,
      {
        name: b.spec.name,
        file: `${b.spec.id}.png`,
        file2x: `${b.spec.id}@2x.png`,
        size: [44, 44],
        size2x: [88, 88],
        palette: b.pal.rgb.map(toHex),
        paletteDetailOnly: b.pal.rgb.filter((_, i) => b.pal.spare[i]).map(toHex),
        sampled: (b.spec.extra ?? []).map((e) => e.why),
        checks: { '44': b.out[44].checks, '88': b.out[88].checks },
        use: 'Hotbar skill icon: fills the 44x44 window of skill_slot_steel (or of ui_battle skill_slot), at 6,6.',
      },
    ]),
  ),
  pieces: {
    skill_slot_steel: {
      file: 'skill_slot_steel.png',
      size: [SLOT, SLOT],
      slice: [SLICE, SLICE, SLICE, SLICE],
      window: { x: RING, y: RING, w: SLOT - 2 * RING, h: SLOT - 2 * RING, shape: 'rect' },
      layer: 'over the icon (the window is transparent; his gold brackets overlap the icon corners). Drawn under the icon it works too, the brackets are then hidden where the icon covers them.',
      emptyFill: '#0f1116',
      at2x: 'on a 2x screen: the frame doubled (nearest, 112x112, slices 32) and the @2x icon in its 88x88 window at 12,12',
      use: 'His skill slot from the icon picture: dark steel bar with a lit outer edge, his thin gold line inside, antique gold corner brackets (arms 10 px, 45-degree ends; pale only on the lit outer edge, his two main gold tones for the rest, his darkest on the shadow edges) with round dark steel rivets. The skill icon goes in the window.',
    },
    skill_slot_steel_active: {
      file: 'skill_slot_steel_active.png',
      size: [SLOT, SLOT],
      slice: [SLICE, SLICE, SLICE, SLICE],
      window: { x: RING, y: RING, w: SLOT - 2 * RING, h: SLOT - 2 * RING, shape: 'rect' },
      layer: 'as skill_slot_steel',
      use: 'The same slot, selected or hovered: the steel bar stays, his gold line and the brackets are one step brighter, the rivets glint, and the outer line turns into a 1-pixel warm glow.',
    },
  },
};
writeAtomic(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');

// --- comparison sheet ---------------------------------------------------------------------------

/** Our four icons in our frame, in a row like his picture (his slots are 18 of his pixels apart, 4 of ours). */
function slotRow(act = -1): Img {
  const gap = 4;
  const row = new Img(built.length * SLOT + (built.length - 1) * gap, SLOT);
  built.forEach((b, i) => {
    const x = i * (SLOT + gap);
    row.draw(b.out[44].img, x + RING, RING);
    row.draw(i === act ? frameActive : frame, x, 0);
  });
  return row;
}

if (process.env.UI_SHEETS) {
  const BG = hex('#15171d'), HEAD = hex('#e9dfc4'), SUB = hex('#9aa3b0');
  const Z = 2; // the sheet shows everything at 2x
  const pad = 24, cell = 88 * Z, gap = 20, LEFT = 290;
  const parts: { img: Img; x: number; y: number }[] = [];
  let y = pad;
  const put = (img: Img, x: number) => parts.push({ img, x, y });
  const title = screenText('SKILL ICONS 1 (round 3)  -  his icons beside ours (sheet at 2x: every pixel shown 2x2)', 'title', HEAD);
  put(title, pad);
  y += title.h + 14;
  const heads = ['his, at 88', 'ours, 88 (the 2x file)', 'ours, 44 at 2x', 'his box to 44, 2x', 'ours, 44 at 1x'];
  heads.forEach((h, i) => put(screenText(h, 'label', SUB), pad + LEFT + i * (cell + gap)));
  y += 24;
  for (const b of built) {
    put(screenText(b.spec.name, 'label', HEAD), pad);
    parts.push({ img: screenText(b.spec.id, 'label', SUB), x: pad, y: y + 20 });
    if (b.his88) put(b.his88.scaled(Z), pad + LEFT);
    put(b.out[88].img.scaled(Z), pad + LEFT + (cell + gap));
    put(b.out[44].img.scaled(2 * Z), pad + LEFT + 2 * (cell + gap));
    put(b.out[44].box.toImg().scaled(2 * Z), pad + LEFT + 3 * (cell + gap));
    put(b.out[44].img.scaled(Z), pad + LEFT + 4 * (cell + gap));
    y += cell + gap;
  }
  // His row and ours, his slot scaled to our 4x slot (224 pixels).
  y += 10;
  put(screenText('In the frame, in a row like his picture. Top: his picture. Below: ours at 4x, then at 1x (true size) and at 2x', 'title', HEAD), pad);
  y += 34;
  const hisRowPath = join(REF, 'row.png');
  if (existsSync(hisRowPath)) {
    const hr = loadPng(hisRowPath);
    const k = 224 / 240;
    put(hr.resized(Math.round(hr.w * k), Math.round(hr.h * k)), pad);
    y += Math.round(hr.h * k) + 16;
  }
  const row = slotRow();
  put(row.scaled(4), pad);
  y += row.h * 4 + 16;
  put(row, pad);
  put(row.scaled(2), pad + row.w + 40);
  y += row.h * 2 + 16;
  put(screenText('Selected or hovered (skill_slot_steel_active), first slot, at 4x and 1x', 'label', SUB), pad);
  y += 22;
  const act = slotRow(0);
  put(act.scaled(4), pad);
  y += act.h * 4 + 16;
  put(act, pad);
  y += act.h + pad;
  const W = Math.max(...parts.map((p) => p.x + p.img.w)) + pad;
  const out = new Img(W, y);
  out.fill(BG);
  for (const p of parts) out.draw(p.img, p.x, p.y);
  savePng(join(process.env.UI_SHEETS, 'ui-icons-1-compare.png'), out);
}
