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
// How an icon is made (round 6, the polish after the fifth review: the Kirin rebuilt from his own
// pixels; his antique gold on the frame; the water's hollow his own misty reduction with his spray
// as his own drop shapes; the fireball's arms curling into its core and its outer sparks dimmer; the
// fire wave's embers at 44 half turned to ash):
//  1. His art window (201x206 of his pixels): the 1-pixel seam trimmed and the gold bracket tips in
//     its corners painted over. His specks (sparks, embers, foam flecks, the peach sparks of the
//     Kirin) are found and painted out of the base, to be put back at the end as designed marks.
//     For the Kirin's 88 and the water his crop is first smoothed along his own strokes (a short
//     line-integral blur that follows each stroke's direction), so the mane spikes and the bands
//     stay continuous lines instead of breaking into grain; the water's 44 uses a slightly longer
//     stretch, so its bands curve round the hollow, and its 88 a shorter one on the right half, so
//     his thin bands there stay crisp. The Kirin's 44 is not smoothed: his own strands are kept.
//  2. Area mean (box) straight down to 44 (or 88): every target pixel is the mean of his pixels
//     under it. No point sampling anywhere. Over the Kirin's head (his fangs, horn and teeth are
//     finer than a box keeps) his box reduction without the stroke smoothing is unsharp-masked at
//     the icon size and blended in (`sharp`).
//  3. Light edge-preserving smoothing at that size (a bilateral filter in OKLab).
//  4. Nearest palette entry, no dither. One palette per icon, sampled from his picture. For the fire
//     wave the hue counts more when a pixel is put on the palette, so his crimson bands stay crimson
//     instead of falling into his smoke; off-tone greyish entries can be dropped (the water's), and
//     extra entries are sampled where the k-means misses his colour (the water's misty hollow).
//  5. Clean-up: every area of one colour of one or two pixels (8-connected) joins the neighbouring
//     colour closest to the smoothed picture there, until none is left.
//  6. Only what the reduction loses is put back, traced on his crop with a 44 or 88 grid (his box
//     reduction, and the share of his pixels under each icon pixel that are light or dark): the
//     Kirin's glow (his whitest at the back of the open mouth), his gum stepping down to the nose,
//     his long uneven fangs with dark gaps at their roots, the tip of his crescent horn, his nostril
//     slit and his lower teeth; the fire wave's inner tongue, its swirl (a spiral field at his size)
//     and at 88 his dark-red gaps between the flame tongues of the left flank, his embers and dark ash
//     flakes; the water's lip and foam (his near-white where most of his pixels are near-white, his
//     spray as his own drop shapes); the fireball's darker arm gaps, its white-hot core with his arms
//     curling on into it, its softer fade with his arm tips breaking the rim. Then his sparks. These
//     pixels are protected; the clean-up runs again on the rest.
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
/** Unsharp mask: the image plus `amount` times its difference from its Gaussian blur (sigma px). */
function unsharp(f: F, sigma: number, amount: number): F {
  const o = new F(f.w, f.h);
  for (let k = 0; k < 3; k++) {
    const ch = new Float32Array(f.w * f.h);
    for (let i = 0; i < f.w * f.h; i++) ch[i] = f.d[i * 3 + k];
    const bl = gauss(ch, f.w, f.h, sigma);
    for (let i = 0; i < f.w * f.h; i++) o.d[i * 3 + k] = Math.max(0, Math.min(255, ch[i] + amount * (ch[i] - bl[i])));
  }
  return o;
}
/** The weight (0..1) of the feathered rectangle `rect` (88 coordinates) at pixel (x, y) of an N icon. */
function rectWeight(rect: [number, number, number, number], feather: number, N: number, x: number, y: number): number {
  const X = ((x + 0.5) * 88) / N, Y = ((y + 0.5) * 88) / N;
  return Math.max(0, Math.min(1, Math.min(X - rect[0], rect[2] - X, Y - rect[1], rect[3] - Y) / feather));
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
  /** The weight of the sharp rectangle at each pixel (0 everywhere when the icon has none). */
  sharpW: Float32Array;
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
  /** The 88 only: a shorter stroke smoothing on the right half of his picture (blended in across its middle fifth), so his thin bands there stay crisp. */
  flowRight88?: [number, number];
  /** Palette entries dropped as off-tone: lightness between the first two values with a chroma (OKLab) under the third. */
  greyOut?: [number, number, number];
  /**
   * A sharper base over his subject's fine detail (the Kirin's head: his fangs, horn and teeth, which a
   * plain box reduction averages away): there the box reduction of his crop (specks out, no stroke
   * smoothing) is unsharp-masked at the icon size ([sigma px, amount] at 44 and at 88) and blended in
   * over a feathered rectangle (88 coordinates, feather in 88 pixels).
   */
  sharp?: { rect: [number, number, number, number]; feather: number; s44: [number, number]; s88: [number, number] };
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
  const ground44 = spec.flow44 ? (spec.flow44[1] > 0 ? flowSmooth(ground0, spec.flow44[0], spec.flow44[1]) : ground0) : ground;
  let ground88 = ground;
  if (spec.flowRight88) {
    const right = flowSmooth(ground0, spec.flowRight88[0], spec.flowRight88[1]);
    ground88 = new F(ground.w, ground.h);
    for (let y = 0; y < ground.h; y++)
      for (let x = 0; x < ground.w; x++) {
        const t = Math.max(0, Math.min(1, (x / ground.w - 0.4) / 0.2));
        for (let c = 0; c < 3; c++) ground88.d[(y * ground.w + x) * 3 + c] = ground.d[(y * ground.w + x) * 3 + c] * (1 - t) + right.d[(y * ground.w + x) * 3 + c] * t;
      }
  }
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
    const gbox = areaResize(N === 44 ? ground44 : ground88, N, N);
    // His fine detail (the sharp rectangle): his unsmoothed reduction, unsharp-masked, blended in.
    const sharpW = new Float32Array(N * N);
    if (spec.sharp) {
      const sh = spec.sharp;
      const [sg, am] = N === 44 ? sh.s44 : sh.s88;
      const det = unsharp(areaResize(ground0, N, N), sg, am);
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          const i = y * N + x, t = rectWeight(sh.rect, sh.feather, N, x, y);
          sharpW[i] = t;
          for (let c = 0; c < 3; c++) gbox.d[i * 3 + c] = gbox.d[i * 3 + c] * (1 - t) + det.d[i * 3 + c] * t;
        }
    }
    const [ss, sr] = N === 44 ? spec.bil44 : spec.bil88;
    const smooth = sr > 0 ? bilateral(gbox, ss, sr, 2) : gbox;
    const clean = cleanup(quantize(smooth, pal), pal, smooth, 2, 1, new Set());
    const pt = new Paint(clean.clone(), pal);
    if (!process.env.UI_NOART) spec.art?.(pt, { src, ground0, ground: N === 44 ? ground44 : ground88, specks, box, smooth, sharpW });
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

const K_PALE = '#a1f5fa', K_WHITE = '#d8feff';

/** A bolt: a 1-pixel line in his pale cyan with white cores on its middle stretches. */
function bolt(pt: Paint, pts: [number, number][], core: [number, number] = [0.3, 0.7]): void {
  const px = polyPixels(pts);
  const a = Math.round(px.length * core[0]), b = Math.round(px.length * core[1]);
  px.forEach(([x, y], i) => pt.px(x, y, i >= a && i < b ? K_WHITE : K_PALE));
}

/** His peach spark colours (the two spare entries of the Kirin palette): the warm core and the dimmer end. */
function peach(pt: Paint): [string, string] {
  // Only the warm spare entries (round 3 added his white to the spares, and it had taken the core).
  const sp = pt.p.rgb
    .map((_, i) => i)
    .filter((i) => pt.p.spare[i] && pt.p.lab[i][1] > 0.02)
    .sort((a, b) => pt.p.lab[b][0] - pt.p.lab[a][0]);
  return [toHex(pt.p.rgb[sp[0]]), toHex(pt.p.rgb[sp[1]])];
}

// KIRIN-ART-BEGIN
// His Kirin (round 6). The head is his own pixels: over his head (KIRIN_SHARP) the base is his box
// reduction without the stroke smoothing, unsharp-masked at the icon size, put on his palette, and
// only one- and two-pixel areas that do not stand out are merged. Then only what that reduction loses
// is put back, each traced on his crop (his box reduction, and the share of his pixels under each
// icon pixel that are light or dark):
//  - his glow: his whitest at the back of the open mouth (his box at 0.975 or more) in his white,
//    then his near-white, so the mouth is the brightest part of the icon;
//  - his gum: a navy line from the mouth corner stepping down to the nose;
//  - his upper fangs hanging from it, long, pointed and uneven (a one-pixel tip, the longest in
//    the middle of the jaw, the front ones curving back), navy in the gaps at their roots;
//  - his horn: a short thick crescent rising from the nose, its tip leaning back, a darker notch
//    between its back and the snout top, dark sky in front of its tip;
//  - his nostril slit, and his lower teeth (at 88 all of them, at 44 the one the reduction loses).
// The mane keeps the round-5 treatment (his own reduction, his deepest gaps one step down), and his
// bolts and peach sparks are put back as before.

/** His glow at the back of the mouth: his box lightness for his white and his near-white, in a zone (88 coordinates). */
const KIRIN_GLOW = { zone: [42, 38, 64, 58] as [number, number, number, number], white: 0.975, near: 0.93 };
function kirinGlow(pt: Paint, ctx: Ctx): void {
  const N = pt.N, k = N / 88, z = KIRIN_GLOW.zone;
  const L = lightness(ctx.box);
  const W = kirinWhite(pt), near = pt.c('#d3fbfb');
  for (let y = Math.floor(z[1] * k); y < Math.ceil(z[3] * k); y++)
    for (let x = Math.floor(z[0] * k); x < Math.ceil(z[2] * k); x++) {
      const l = L[y * N + x];
      if (l >= KIRIN_GLOW.white) pt.px(x, y, W);
      else if (l >= KIRIN_GLOW.near && pt.p.lab[pt.at(x, y)][0] < pt.p.lab[near][0]) pt.px(x, y, near);
    }
}

/**
 * His head at 44, restated only where the reduction loses it (traced on his box reduction at 44 and
 * on the share of his pixels under each icon pixel that are light or dark). His fangs are the light
 * pixels under the gum (his box 0.79 to 0.89 at the long middle fang and the two front ones) with
 * darker pixels between them (his 0.57 to 0.62); at his size they are white with navy outlines, so
 * here they are his near-white with his dark blue between, and his gum (his navy line, averaged
 * with his lit lip to 0.5 at this size) a tinted line one step darker than his box there. Legend:
 * r his near-white (fangs), q his pale (fang tips, horn tip), d his dark blue (gaps between fangs,
 * the nostril slit), e his blue one step lighter (the gum).
 */
const KIRIN_PATCH44 = {
  x0: 23,
  y0: 14,
  rows: [
    '..............q', // 14 his horn tip (his horn below it is his own reduction)
    '',
    '',
    '',
    '............d', // 18 his nostril slit
    '.............d', // 19
    '.eeeeeee', // 20 his gum from the mouth corner
    '.....rdreeeeee', // 21 two back fangs; the gum stepping down
    '.......q.drdrree', // 22 the long middle fang, the front fang two wide at its root; the gum stepping down to the nose
    '..........r.qdr', // 23 the front fang's tip, the fang at the nose
    '..........q...q', // 24 the tips of the long middle fang and the fang at the nose
  ],
};
/** His lower front tooth, lost by the reduction (his box 0.88 there). */
const KIRIN_TEETH44: [number, number][] = [[28, 32]];

function kirin44(pt: Paint, ctx: Ctx): void {
  const head = (x: number, y: number): boolean => ctx.sharpW[y * 44 + x] > 0;
  const mane = (x: number, y: number): boolean => !head(x, y);
  // The mane as round 5: his own reduction, his deepest gaps between strands one step down.
  const L = lightness(ctx.smooth), B = gauss(L, 44, 44, 1.5);
  pt.shift((x, y) => mane(x, y) && L[y * 44 + x] - B[y * 44 + x] < -0.09, -1);
  const keepHead = new Set<number>();
  ctx.sharpW.forEach((t, i) => t > 0 && keepHead.add(i));
  pt.q.d.set(cleanup(pt.q, pt.p, ctx.smooth, 2, 1, keepHead).d);
  // His five main bolts, each a zigzag as he drew it.
  bolt(pt, [[43, 0], [42, 1], [41, 3], [39, 4], [37, 5], [36, 6], [35, 8], [34, 10], [33, 12]]);
  bolt(pt, [[36, 0], [35, 2], [35, 4]]);
  bolt(pt, [[33, 27], [35, 28], [36, 27], [38, 28], [39, 27], [40, 26], [41, 27], [43, 25]]);
  bolt(pt, [[36, 31], [37, 33], [39, 34], [40, 36], [41, 38], [43, 39]]);
  bolt(pt, [[0, 43], [1, 41], [3, 40], [4, 38], [6, 37], [7, 35], [9, 34], [10, 32], [12, 31]]);
  // His head: the glow, then what the reduction loses.
  kirinGlow(pt, ctx);
  pt.ascii(KIRIN_PATCH44.x0, KIRIN_PATCH44.y0, KIRIN_PATCH44.rows, { d: '#1d3f82', e: '#1d4f91', q: '#96f3f8', r: '#d3fbfb' });
  for (const [x, y] of KIRIN_TEETH44) pt.px(x, y, '#96f3f8');
  // His peach sparks, at his three places: short diagonal streaks, his warm core and a dimmer end.
  const [PEACH, PEACH_DIM] = peach(pt);
  pt.spark([[43, 8], [42, 9], [41, 10]], [PEACH, PEACH, PEACH_DIM]);
  pt.spark([[38, 29], [37, 30], [36, 31]], [PEACH, PEACH, PEACH_DIM]);
  pt.spark([[37, 35], [36, 36], [35, 37]], [PEACH, PEACH, PEACH_DIM]);
}

/** His white (his whitest mouth pixel, an entry kept for the details). */
function kirinWhite(pt: Paint): string {
  const sp = pt.p.rgb.map((_, i) => i).filter((i) => pt.p.spare[i]).sort((i, j) => pt.p.lab[j][0] - pt.p.lab[i][0]);
  return toHex(pt.p.rgb[sp[0]]);
}

/** His gum at 88: from the mouth corner stepping down to the nose (traced: his darkest pixels under the snout). */
const KIRIN_GUM88: [number, number][] = [[49, 41], [51, 40], [58, 40], [59, 41], [62, 41], [63, 42], [64, 43], [74, 43], [75, 44], [76, 45], [77, 45], [78, 44]];
/**
 * His upper fangs at 88, traced on his crop (the pixels where most of his are his near-white): each
 * its pixels from the root down; two pixels wide at the root, a one-pixel tip, the front ones'
 * tips a pixel back.
 */
const KIRIN_FANGS88: [number, number][][] = [
  [[53, 41], [54, 41], [53, 42], [54, 42], [54, 43]],
  [[56, 41], [57, 41], [56, 42], [57, 42], [56, 43]],
  [[59, 42], [60, 42], [59, 43], [60, 43], [59, 44]],
  [[63, 43], [63, 44], [62, 45]],
  [[66, 44], [67, 44], [66, 45], [67, 45], [66, 46], [67, 46], [66, 47], [66, 48]],
  [[70, 44], [71, 44], [70, 45], [71, 45], [70, 46]],
  [[73, 44], [73, 45], [73, 46]],
  [[75, 46], [76, 46], [75, 47], [76, 47], [75, 48]],
];
/** His dark blue at the roots between his fangs (his darkest pixels there, under the gum). */
const KIRIN_GAPS88: [number, number][] = [[55, 41], [55, 42], [58, 41], [58, 42], [61, 42], [61, 43], [62, 43], [64, 44], [65, 44], [65, 45], [68, 44], [68, 45], [69, 44], [72, 44], [74, 44], [74, 45], [74, 46], [77, 46]];

/** His lower teeth at 88: the pixels along the inner edge of his lower jaw where most of his are his near-white. */
const KIRIN_TEETH88: [number, number][] = [[50, 56], [52, 59], [54, 61], [54, 62], [57, 64], [56, 65], [57, 65], [58, 67], [61, 59], [62, 59], [61, 60], [62, 62], [63, 62], [64, 64], [63, 65]];

function kirin88(pt: Paint, ctx: Ctx): void {
  kirinGlow(pt, ctx);
  pt.line(KIRIN_GUM88, '#1a2351');
  for (const [x, y] of KIRIN_GAPS88) pt.px(x, y, '#1d3f82');
  for (const f of KIRIN_FANGS88) f.forEach(([x, y], i) => pt.px(x, y, i === f.length - 1 && f.length > 3 ? '#96f3f8' : '#d3fbfb'));
  for (const [x, y] of KIRIN_TEETH88) pt.px(x, y, '#96f3f8');
  const [PEACH, PEACH_DIM] = peach(pt);
  pt.spark([[77, 18], [76, 19], [75, 20], [74, 21], [73, 22]], [PEACH, PEACH, PEACH, PEACH_DIM, PEACH_DIM]);
  pt.spark([[82, 18], [81, 19], [80, 20], [79, 21]], [PEACH, PEACH, PEACH_DIM, PEACH_DIM]);
  pt.spark([[75, 61], [74, 60], [73, 59], [76, 60]], [PEACH, PEACH, PEACH_DIM, PEACH_DIM]);
  pt.spark([[71, 69], [72, 70], [72, 71], [73, 72], [73, 73]], [PEACH_DIM, PEACH, PEACH, PEACH, PEACH_DIM]);
}
// KIRIN-ART-END

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
 * His swirl, at either size, as he painted it: a dark-red band two tones deep (`mid` on its outer
 * side, `dark` inside) spiralling in clockwise from its open end, with his orange between the turns,
 * lit (`lit`) along the edge just inside each dark turn, and his lighter orange (`centre`) at the
 * eye. Laid out as a spiral field on his oval: centre `c`, semi-axes `rx` and `ry` (icon pixels), `k`
 * the step between turns (a fraction of the oval), the open end at angle `a0` (degrees, clockwise on
 * screen from the right), `turns` turns of the dark band. Outside the outer turn his own pixels stay.
 */
function swirlField(pt: Paint, c: [number, number], rx: number, ry: number, k: number, a0: number, turns: number, cols: { mid: string; dark: string; lit: string; orange: string; centre: string }): void {
  for (let y = Math.floor(c[1] - ry) - 1; y <= Math.ceil(c[1] + ry) + 1; y++)
    for (let x = Math.floor(c[0] - rx) - 1; x <= Math.ceil(c[0] + rx) + 1; x++) {
      const ux = (x - c[0]) / rx, uy = (y - c[1]) / ry, rho = Math.hypot(ux, uy);
      const phi = ((((Math.atan2(uy, ux) * 180) / Math.PI - a0) % 360) + 360) % 360 / 360;
      const s = (1 - rho) / k - phi;
      if (s < 0) continue;
      const n = Math.floor(s), f = s - n;
      if (rho < k * 0.3 || n >= turns + 1) pt.px(x, y, cols.centre);
      else if (f < 0.5 && n < turns) pt.px(x, y, f < 0.24 ? cols.mid : cols.dark);
      else pt.px(x, y, f < 0.72 ? cols.lit : cols.orange);
    }
}

// His Great Fire Annihilation. His own bands carry the picture (the base is put on the palette with
// hue weighed up, so his crimson bands stay crimson and do not fall into his smoke). Drawn on it:
// his inner tongue rising and hooking inside the crest as a thick flame, lit on its left (3 pixels
// at 44, 5 at 88); his swirl low on the left at his size (about 11 of 44 across, 22 of 88), a
// dark-red band two tones deep spiralling in on his orange, lit just inside each turn, and his
// second small curl at its lower right; at 88 his dark-red gaps between the flame tongues of the
// left flank pulled one step darker along his own crimson ramp. Then his embers and dark ash
// flakes. Traced on his picture at 88.
const ANNI_TONGUE88: [number, number][] = [[30.5, 55], [31.5, 47], [32.5, 41], [34, 37], [36.5, 34.5], [39.5, 33.2], [42, 33.6], [44, 35], [45.3, 37.5]];
const ANNI_TONGUE_W88 = [5, 5, 4.6, 4, 3.6, 3.2, 2.8, 2.2, 1];
/** His swirl and its small second curl, in 88 pixels: centre, semi-axes, step between turns, open end (degrees), turns. */
const ANNI_SWIRLS88: { c: [number, number]; rx: number; ry: number; k: number; a0: number; turns: number }[] = [
  { c: [29.2, 70.8], rx: 11.2, ry: 8.6, k: 0.6, a0: -35, turns: 2 },
  { c: [41.6, 81.2], rx: 4.8, ry: 4.2, k: 0.85, a0: -60, turns: 1 },
];
/** His crimson ramp, dark to light: a gap between his flame tongues steps down along it. */
const ANNI_CRIMSON = ['#361f27', '#67191c', '#7c3127', '#9a311d', '#b74320', '#d2541a', '#e2691f', '#ee8029', '#f49933', '#f8b148', '#f9c659', '#fcdb73', '#fff2a2'];
const N44 = (pt: Paint): boolean => pt.N === 44;
function annihilation(pt: Paint, ctx: Ctx): void {
  const N = pt.N, k = N / 88;
  if (!N44(pt)) {
    // The left flank: his dark-red gaps between the flame tongues (darker than their surroundings in
    // his picture) one step down his crimson ramp, two where the gap is deep.
    const L = lightness(ctx.box), B = gauss(L, N, N, 1.4);
    const ramp = ANNI_CRIMSON.map((c) => pt.c(c));
    const flank = (x: number, y: number) => x < 34 && y > 6 && y < 62;
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const g = B[y * N + x] - L[y * N + x], r = ramp.indexOf(pt.at(x, y));
        if (!flank(x, y) || g <= 0.025 || r < 0) continue;
        pt.q.set(x, y, ramp[Math.max(1, r - (g > 0.06 ? 2 : 1))]);
      }
  }
  flameStroke(pt, ANNI_TONGUE88, ANNI_TONGUE_W88, '#f49933', '#e2691f', '#d2541a');
  for (const w of ANNI_SWIRLS88)
    swirlField(pt, [(w.c[0] + 0.5) * k - 0.5, (w.c[1] + 0.5) * k - 0.5], w.rx * k, w.ry * k, w.k, w.a0, w.turns, { mid: '#7c3127', dark: '#67191c', lit: N44(pt) ? '#ee8029' : '#f49933', orange: '#e2691f', centre: '#ee8029' });
  embers(pt, ctx);
}

/**
 * His embers in the smoke as short streaks (the strongest of them), then his dark ash flakes. At 44
 * (round 6) only his embers in the smoke are drawn (the bright specks in his flames are the fire's own
 * highlights, which the base keeps): his five nearest the crest stay bright, the next five become
 * dark ash flakes like his others, each with one glowing pixel on its rim.
 */
const ANNI_CREST44: [number, number] = [25, 9];
function embers(pt: Paint, ctx: Ctx): void {
  const N = pt.N;
  const bright = ctx.specks.filter((s) => s.bright);
  if (N === 88) {
    stampStreaks(pt, bright, ctx.src.w, ctx.src.h, 12, 3, 0.08);
    return ashFlakes(pt, []);
  }
  const pos = (s: Speck): [number, number] => [((s.cx + 0.5) * N) / ctx.src.w - 0.5, ((s.cy + 0.5) * N) / ctx.src.h - 0.5];
  // His ten strongest embers that lie in the smoke (above his fire's base, 30 of 44; the bright specks
  // lower down are highlights in his flames and swirl, which the base keeps), nearest the crest first.
  const inSmoke = (s: Speck): boolean => pos(s)[1] <= 30;
  const ranked = [...bright].filter(inSmoke).sort((a, b) => b.px.length * Math.abs(b.peak - b.bg) - a.px.length * Math.abs(a.peak - a.bg) || a.cx - b.cx || a.cy - b.cy).slice(0, 10);
  const d = (s: Speck) => Math.hypot(pos(s)[0] - ANNI_CREST44[0], pos(s)[1] - ANNI_CREST44[1]);
  const byCrest = ranked.sort((a, b) => d(a) - d(b) || a.cx - b.cx || a.cy - b.cy);
  stampStreaks(pt, byCrest.slice(0, 5), ctx.src.w, ctx.src.h, 5, 2, 0.12);
  ashFlakes(pt, byCrest.slice(5).map((s) => pos(s).map(Math.round) as [number, number]));
}

/**
 * His dark ash flakes in the smoke right of the crest, at his places (88 coordinates, traced on his
 * picture): each a dark mark tilted down-right along the wind (2 rows of 2 at 88, a diagonal pair
 * at 44) with one glowing pixel (his #b74320) at its upper-left end, where it still glows. At 44 also
 * at `more` (44 coordinates): his embers that turn to ash there.
 */
const ANNI_FLAKES88: [number, number][] = [[61.5, 11.5], [59.5, 20], [80, 18], [74, 29.5], [75, 43], [81.5, 47.5], [61.5, 49.5], [63, 56], [44, 42.5]];
function ashFlakes(pt: Paint, more: [number, number][]): void {
  const D = '#361f27', E = '#b74320';
  for (const [fx, fy] of ANNI_FLAKES88) {
    if (pt.N === 88) {
      const x = Math.round(fx - 1), y = Math.round(fy - 0.5);
      pt.spark([[x - 1, y], [x, y], [x + 1, y], [x + 1, y + 1], [x + 2, y + 1]], [E, D]);
    } else {
      const x = Math.round((fx - 0.5) / 2 - 0.5), y = Math.round((fy - 0.5) / 2 - 0.5);
      pt.spark([[x - 1, y], [x, y], [x + 1, y + 1]], [E, D]);
    }
  }
  for (const [x, y] of more) pt.spark([[x - 1, y], [x, y], [x + 1, y + 1]], [E, D]);
}

// His hollow under the curl at 44: a rounded dome, open toward his lower left.
const W_HOLLOW44: [number, number][] = [[7.4, 21], [8.2, 18], [9, 16.3], [10.4, 15.2], [12.3, 14.7], [14.2, 15], [15.6, 16.2], [16.4, 18], [16.6, 20.5], [16.4, 23], [15.6, 25.5], [14.4, 27.5], [12.6, 28.8], [10.6, 29], [8.8, 28.2], [7.6, 26.5], [7.2, 24]];
const W_NIGHT = '#164c71', W_DEEP = '#0a3a64', W_MID = '#1c6d8b', W_TEAL = '#11a0a6', W_SHADOW = '#18a7b8', W_FOAM = '#abeef4', W_WHITE = '#ccf5f8';
/** His near-white foam (sampled from his crest: see the water's extra palette entries). */
const W_NEAR = '#d2ffff';

// His Water Wall (round 6): his hollow under the curl is his own reduction (a misty grey-blue
// gradient, his splash rising in it, his teal fading in at its right); his bands as continuous curved
// stripes outside it, the foam lip with a white top edge, a pale underside and a turquoise shadow line
// where it overhangs the hollow, his spray as his own drop shapes (chunky at 88), his chunky white
// foam where most of his pixels are near-white, and his bottom foam as short horizontal dashes.
// Traced at 44, drawn at either size.
function water(pt: Paint, ctx: Ctx): void {
  const N = pt.N, k = N / 44;
  // His hollow under the curl (traced at 44): round 6 leaves it as his own reduction, a misty
  // grey-blue gradient from under the lip down to his lower left with his splash rising in it and his
  // teal fading in at its right (two misty tones sampled from his hollow are on the palette for it).
  const hollow = W_HOLLOW44.map(([x, y]) => [x * k + (k - 1) / 2, y * k + (k - 1) / 2] as [number, number]);
  const inHollow = (x: number, y: number) => pt.inside(hollow, x, y);
  if (N === 44) return water44(pt, ctx, inHollow);
  // The bands, from the barrel's edge outwards.
  // (Round 6: no drawn turquoise band hugging the barrel any more; his teal fades in there by itself.)
  const bands: [string, [number, number][]][] = [
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
  // His spray at the top left and over the hollow (round 6: his own shapes, not streaks): every fleck
  // of his (his coarser spray and his finer flecks) put on the pixels it covers by a third or more,
  // so his bigger drops come out as chunky clumps of two to four pixels, in his colour pushed until
  // it stands out from the ground.
  const spray = ctx.specks.filter((s) => s.cx < 100 && s.cy < 150);
  const fine = hollowFlecks(ctx).filter((f) => f.cx < 100 && f.cy < 150 && !spray.some((s) => Math.hypot(s.cx - f.cx, s.cy - f.cy) < 4));
  sprayBlobs(pt, ctx, [...spray, ...fine], 1 / 3, 0.18);
  // His chunky white foam: where most of his own pixels under a pixel are near-white, his near-white
  // (his crest, his splash in the hollow, his foam crests at the bottom and on the right), and his
  // pale where a third of them are.
  const L = lightness(ctx.box);
  const share = whiteShare(ctx.src, N, 0.9);
  const all = pt.p.rgb.map((c) => toHex(c));
  pt.recolor((x, y) => !pt.drawn.has(y * N + x) && (share[y * N + x] >= 0.33 || L[y * N + x] > 0.87), all, W_WHITE);
  pt.recolor((x, y) => !pt.drawn.has(y * N + x) && share[y * N + x] >= 0.55, all, W_NEAR);
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

/**
 * His foam flecks in the hollow: smaller than his spray (one to a few of his pixels), so they are found
 * with their own finer rule on his crop itself (the 3x3 median the other specks are found on wipes them
 * out). They are only drawn: the base keeps them, where its reduction averages them out.
 */
/**
 * His spray drops as his own shapes: each fleck put on every icon pixel it covers by `minCover` or
 * more (at least its centre pixel), in his colour pushed until it stands out from the ground by `minC`.
 */
function sprayBlobs(pt: Paint, ctx: Ctx, specks: Speck[], minCover: number, minC: number): void {
  const N = pt.N, sx = N / ctx.src.w, sy = N / ctx.src.h, per = (1 / sx) * (1 / sy);
  for (const s of specks) {
    const cover = new Map<number, number>();
    for (const j of s.px) {
      const x = Math.floor(((j % ctx.src.w) + 0.5) * sx), y = Math.floor((Math.floor(j / ctx.src.w) + 0.5) * sy);
      cover.set(y * N + x, (cover.get(y * N + x) ?? 0) + 1 / per);
    }
    let cells = [...cover.entries()].filter(([, c]) => c >= minCover).map(([i]) => i);
    if (!cells.length) cells = [Math.round((s.cy + 0.5) * sy - 0.5) * N + Math.round((s.cx + 0.5) * sx - 0.5)];
    const bg = pt.at(cells[0] % N, Math.floor(cells[0] / N));
    const c = pickContrast(pt.p, s.color, bg >= 0 ? pt.p.lab[bg][0] : 0, minC);
    pt.spark(cells.sort((a, b) => a - b).map((i) => [i % N, Math.floor(i / N)] as [number, number]), [toHex(pt.p.rgb[c])]);
  }
}

const W_HOLLOW_FLECK: SpeckRule = { bright: true, r: 3, thr: 0.07, bgMax: 0.5, minPx: 2, maxPx: 40, maxLong: 9, maxAcross: 5 };
function hollowFlecks(ctx: Ctx): Speck[] {
  return findSpecks(ctx.src, W_HOLLOW_FLECK);
}

// The Water Wall at 44. The base is his crop smoothed along his strokes over a longer stretch than
// the 88 (6 of his pixels), so his bands come out as continuous curves round the hollow and his
// bottom foam as his diagonal streaks instead of blocks. Over it: the lip, the white top edge of his
// foam, his spray flecks, his foam splash at the lower left put back from his own lightness (his
// pale where the smoothed picture is pale, his white where it is brightest), and his three brightest
// foam drops in the hollow. (Round 6: the hollow is his own misty reduction; no drawn turquoise ring.)
function water44(pt: Paint, ctx: Ctx, inHollow: (x: number, y: number) => boolean): void {
  // The lip: its underside pale, then the shadow line where it overhangs the barrel.
  pt.line([[6, 15], [8, 13], [11, 12], [14, 12]], W_FOAM);
  pt.line([[7, 15], [9, 14], [11, 13], [13, 13]], W_SHADOW);
  // His crest foam in his near-white: where most of his own pixels in the cell are near-white, and
  // along its top edge (foam pixels with the night above them).
  const share = whiteShare(ctx.src, 44, 0.93);
  pt.recolor((x, y) => y < 20 && share[y * 44 + x] >= 0.5 && !pt.drawn.has(y * 44 + x), pt.p.rgb.map((c) => toHex(c)), W_NEAR);
  const night = pt.p.lab[pt.c(W_NIGHT)][0];
  for (let y = 1; y < 20; y++)
    for (let x = 0; x < 44; x++) {
      const v = pt.at(x, y), up = pt.at(x, y - 1);
      if (pt.p.lab[v][0] > 0.8 && up >= 0 && pt.p.lab[up][0] < night + 0.08 && !pt.drawn.has(y * 44 + x)) pt.px(x, y, W_NEAR);
    }
  // His foam splash, falling down to the lower left (not in the hollow), from his own lightness (his
  // box reduction): his pale where he is pale; then his foam crests there restated in his two
  // lightest tones, where his own white pixels fill much of the cell (his box averages them away).
  const L = lightness(ctx.box);
  const splash = (x: number, y: number) => x <= 18 && y >= 21 && !inHollow(x, y) && !pt.drawn.has(y * 44 + x);
  const all = pt.p.rgb.map((c) => toHex(c));
  pt.recolor((x, y) => splash(x, y) && L[y * 44 + x] > 0.72, all, '#99d6de');
  pt.recolor((x, y) => splash(x, y) && L[y * 44 + x] > 0.8, all, W_FOAM);
  const white = whiteShare(ctx.src, 44, 0.85);
  const crests = (x: number, y: number) => x <= 22 && y >= 26 && !inHollow(x, y) && !pt.drawn.has(y * 44 + x);
  pt.recolor((x, y) => crests(x, y) && white[y * 44 + x] >= 0.3, all, W_WHITE);
  pt.recolor((x, y) => crests(x, y) && white[y * 44 + x] >= 0.5, all, W_NEAR);
  // His spray flecks at the top left, as 1- and 2-pixel marks.
  const inBarrel = (s: Speck) => inHollow(Math.round(((s.cx + 0.5) * 44) / ctx.src.w - 0.5), Math.round(((s.cy + 0.5) * 44) / ctx.src.h - 0.5));
  const spray = ctx.specks.filter((s) => s.cx < 100 && s.cy < 140);
  stampStreaks(pt, spray.filter((s) => !inBarrel(s)), ctx.src.w, ctx.src.h, 8, 2, 0.2);
  // His foam drops in the hollow: three separate drops along his falling spray, at the brightest
  // places of his own picture there (local peaks of his box reduction, each at least two pixels of
  // hollow away from the others), the lowest two pixels long.
  const peaks: [number, number, number][] = [];
  for (let y = 1; y < 43; y++)
    for (let x = 1; x < 43; x++) {
      const l = L[y * 44 + x];
      if (!inHollow(x, y) || l < 0.62 || N8.some(([dx, dy]) => L[(y + dy) * 44 + x + dx] > l)) continue;
      peaks.push([x, y, l]);
    }
  peaks.sort((a, b) => b[2] - a[2] || a[1] - b[1] || a[0] - b[0]);
  const drops: [number, number][] = [];
  for (const [x, y] of peaks) {
    if (drops.length >= 3) break;
    if (drops.some(([u, v]) => Math.max(Math.abs(u - x), Math.abs(v - y)) < 3)) continue;
    drops.push([x, y]);
  }
  const low = Math.max(...drops.map(([, y]) => y));
  for (const [x, y] of drops) pt.spark(y === low ? [[x, y], [x, y + 1]] : [[x, y]], [W_WHITE, W_FOAM]);
}

/** For each pixel of an N x N icon, the share of his pixels under it whose lightness is over `thr`. */
function whiteShare(src: F, N: number, thr: number): Float32Array {
  const L = lightness(src);
  const n = new Float32Array(N * N), t = new Float32Array(N * N);
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const i = Math.min(N - 1, Math.floor(((y + 0.5) * N) / src.h)) * N + Math.min(N - 1, Math.floor(((x + 0.5) * N) / src.w));
      t[i]++;
      if (L[y * src.w + x] > thr) n[i]++;
    }
  return n.map((v, i) => (t[i] ? v / t[i] : 0));
}

// His Fireball. His arms are told apart by the dark gaps between them: every pixel of the base that
// is darker than its surroundings in his picture (his own lightness against its blur, sigma 1.5 px at
// 44) goes one step darker, two where the gap is deep, so about six arms read at 44. His
// white-hot core: his whitest at the centre (radius 2.6 of 44) inside his near-white (#fdfde2, to
// radius 4), with three thin bright streaks (his pale yellow) curling into it between three gaps (his
// yellow, then his orange-yellow), as his arms curl in. Beyond his arm tips the ground fades to his
// near-black, softer than round 4 (the dark entries step down once, from radius 21.5, where round 4
// stepped from 18), and where his arm tips reach past the rim they keep one mid-dark step (his
// #8b2916), so the rim breaks as his. His sparks fly off at his own places,
// irregular: the most visible of his specks beyond radius 15, one to a place, each 1 to 3 pixels
// long by his speck's size and coloured by his own brightness (his #f7ab3b, #f38a2f or #cf5218 core),
// dimmer beyond radius 23.
function fireball(pt: Paint, ctx: Ctx): void {
  const N = pt.N, k = N / 44;
  const [cx, cy] = [21.6 * k + (k - 1) / 2, 22.4 * k + (k - 1) / 2];
  const L = lightness(ctx.smooth);
  const B = gauss(L, N, N, 1.5 * k);
  const r = (x: number, y: number) => Math.hypot(x - cx, y - cy) / k;
  const d = (x: number, y: number) => B[y * N + x] - L[y * N + x];
  pt.shift((x, y) => r(x, y) > 4.5 && r(x, y) < 21 && d(x, y) > 0.06, -1);
  pt.shift((x, y) => r(x, y) > 4.5 && r(x, y) < 21 && d(x, y) > 0.11, -1);
  // The fade beyond the arm tips, softer than round 4; his arm tips past the rim keep a mid-dark step.
  const box = lightness(ctx.box);
  const dark = (x: number, y: number) => pt.p.lab[pt.at(x, y)][0] < pt.p.lab[pt.c('#712116')][0];
  pt.shift((x, y) => dark(x, y) && r(x, y) > 21.5, -1, '#170e16');
  pt.recolor((x, y) => r(x, y) > 18.5 && r(x, y) < 22.5 && box[y * N + x] > 0.3 && dark(x, y), pt.p.rgb.map((c) => toHex(c)), '#8b2916');
  // The core: his three gaps curling in (his yellow near the core, his orange-yellow farther out),
  // his three bright streaks between them, and his white over their inner ends: his whitest at the
  // centre (radius 2.6 of 44), his near-white round it (to radius 4).
  // (His bright arms leave the core at about 90, 210 and 330 degrees and turn clockwise by about 0.05
  // of a turn per pixel of radius: a three-armed spiral fitted to his picture between radius 4 and 16.)
  // Round 6: his arms curl on into the white-hot core: the core is laid first and the spiral runs on
  // inside it along the same turn (1.5 px further in at 44, 3.5 px at 88), the gaps there his pale
  // yellow cutting into the white, so the core is his pinwheel rather than a round disc.
  const white = toHex(pt.p.rgb[pt.p.rgb.length - 1]);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (r(x, y) <= 4) pt.px(x, y, r(x, y) <= 2.6 ? white : '#fdfde2');
  const inward = N === 44 ? 1.5 : 1.75; // in 44 pixels: 1.5 px at 44, 3.5 px at 88
  // A spiral from r0 to r1 over `turns`, extended inward by `inward` along the same turn rate.
  const arm = (r0: number, r1: number, turns: number, a0: number): [number, number][] => {
    const rate = turns / (r1 - r0);
    return spiralPts(cx, cy, (r0 - inward) * k, r1 * k, turns + rate * inward, ((a0 - rate * inward * 360) * Math.PI) / 180);
  };
  for (const a0 of [-90, 30, 150])
    for (const [x, y] of arm(4, 11, 0.34, a0)) {
      const d = Math.hypot(x - cx, y - cy) / k;
      pt.px(x, y, d < 4 ? '#fded8e' : d < 7 ? '#f9ce5d' : '#f7ab3b');
    }
  for (const a0 of [-150, -30, 90])
    for (const [x, y] of arm(3.6, 10, 0.3, a0)) {
      const d = Math.hypot(x - cx, y - cy) / k;
      if (d >= 4) pt.px(x, y, d < 7 ? '#fdf7ab' : '#fded8e');
    }
  // His sparks: irregular, at his own places.
  const sx = N / ctx.src.w, sy = N / ctx.src.h;
  const pos = (s: Speck): [number, number] => [(s.cx + 0.5) * sx - 0.5, (s.cy + 0.5) * sy - 0.5];
  const cand = ctx.specks
    .filter((s) => r(...pos(s)) > 15)
    .sort((a, b) => b.px.length * (b.peak - b.bg) - a.px.length * (a.peak - a.bg) || a.cx - b.cx || a.cy - b.cy);
  const tips: Speck[] = [];
  for (const s of cand) {
    if (tips.length >= (N === 44 ? 12 : 18)) break;
    const [x, y] = pos(s);
    if (tips.some((t) => Math.hypot(pos(t)[0] - x, pos(t)[1] - y) / k < 2)) continue;
    tips.push(s);
  }
  for (const s of tips) {
    const [x, y] = pos(s);
    const a = Math.atan2(y - cy, x - cx) + Math.PI / 2, ux = Math.cos(a), uy = Math.sin(a);
    const n = Math.max(1, Math.min(N === 44 ? 2 : 3, Math.round(s.long * sx * 0.7)));
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const t = i - (n - 1) / 2;
      const p: [number, number] = [Math.round(x + ux * t), Math.round(y + uy * t)];
      if (!pts.some((q) => q[0] === p[0] && q[1] === p[1])) pts.push(p);
    }
    // Round 6: bright (his yellow or orange, by his own brightness) only near the centre; the outer
    // ones his dim #cf5218 with a darker tail, the farthest dimmer still.
    const far = r(x, y) > 23, outer = r(x, y) > 18;
    const core = far ? '#b73f19' : outer ? '#cf5218' : s.peak > 0.66 ? '#f7ab3b' : s.peak > 0.56 ? '#f38a2f' : '#cf5218';
    const tail = far ? '#8b2916' : outer ? '#a0321a' : '#cf5218';
    pt.spark(pts, n === 1 ? [core] : n === 2 ? [core, tail] : [core, core, tail]);
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
      { box: [88, 94, 108, 114], lo: 0.9, hi: 1, spare: false, by: 'L', why: 'his white-hot core, its whitest pixels (the centre of the core)' },
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
    flow44: [0, 0],
    sharp: { rect: [40, 22, 84, 76], feather: 4, s44: [0.9, 0.4], s88: [1.5, 0.5] },
    art: (pt, ctx) => (pt.N === 44 ? kirin44(pt, ctx) : kirin88(pt, ctx)),
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
    bil44: [0.6, 0.03],
    flow: [2, 4],
    flow44: [2, 6],
    flowRight88: [1.5, 1],
    greyOut: [0.5, 0.8, 0.07],
    extra: [
      { box: [68, 68, 92, 104], lo: 0.85, hi: 0.95, spare: false, by: 'teal', why: 'his inner curl, its greenest turquoise (the bright band round the barrel)' },
      { box: [68, 68, 92, 104], lo: 0.55, hi: 0.75, spare: false, by: 'teal', why: 'his inner curl, its mid turquoise' },
      { box: [20, 0, 199, 60], lo: 0.97, hi: 1, spare: false, by: 'L', why: 'his crest foam, its near-white (his whitest foam)' },
      { box: [36, 70, 72, 135], lo: 0.25, hi: 0.4, spare: false, by: 'L', why: 'his hollow, its misty grey-blue (the mist under the curl)' },
      { box: [36, 70, 72, 135], lo: 0.45, hi: 0.6, spare: false, by: 'L', why: 'his hollow, its lighter misty grey-teal (where his teal fades in)' },
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
 * shade of steel and gold. Over the corners sit his gold brackets (round 5, BRACKET below): a block
 * holding his rivet, a grey ball lit from the top left in a one-pixel dark socket, and two arms along
 * the bar, two pixels of gold for their full ten pixels (his lighter gold on the outer edge, his gold inside) with
 * his step on the inner edge near the block (three pixels thick there) and a 45-degree tip. Every
 * bracket is drawn the same way mirrored into its corner, so all four are lit on their outer
 * edges, with his shadow only on their inner edges. The brackets stay on the 6-pixel border; the
 * window is transparent except its 4 corner pixels (the dark edge where the bracket blocks end), so
 * the frame can be drawn over the icon or under it.
 */
interface FrameColors {
  outline: string;
  steelLight: [string, string, string, string]; // top, right, bottom, left
  steel: [string, string, string, string];
  gap: string;
  gold: [string, string, string, string];
  inner: string;
  bracket: { hi: string; gold: string; light: string; mid: string; dark: string; edge: string };
  rivet: { hi: string; mid: string; dark: string; rim: string };
}

const STEEL: FrameColors = {
  outline: '#05060a',
  steelLight: ['#626978', '#404858', '#434856', '#484e5c'],
  steel: ['#2d3444', '#2f3340', '#2d3440', '#2e3544'],
  gap: '#0e0f13',
  // His gold line, per side (round 6: moved toward his antique gold, measured on his four slots: the
  // median of the line on each side and its brighter half; a little darker and warmer than round 5).
  gold: ['#b8a27a', '#83684c', '#967c5a', '#8c7253'],
  inner: '#0a0607',
  // His antique gold on the brackets (round 6, measured on his four slots: the median of his bracket
  // gold is (144, 117, 85) with a saturation of 0.38, its brighter half (171, 143, 107)): his upper
  // ramp on the outer edges (no longer a pale cream), his brighter half round the socket, his median
  // for the arms' inner row, then his two darker steps for the body and the shadow on the inner edges.
  bracket: { hi: '#bc9c6c', gold: '#a4835c', light: '#8c6d4c', mid: '#6e5437', dark: '#4f3c26', edge: '#1a1206' },
  // His dark steel rivets (his three measured tones) in a dark socket.
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
  // One step up his ramp from the resting slot, every tone.
  gold: ['#d0b88a', '#9c8260', '#ae9470', '#a48864'],
  inner: '#0a0607',
  bracket: { hi: '#dcbc84', gold: '#bc9c6c', light: '#a4835c', mid: '#8c6d4c', dark: '#6e5437', edge: '#1a1206' },
  rivet: { hi: '#ffffff', mid: '#a8aeba', dark: '#5a606c', rim: '#15161a' },
};

const SLOT = 56, RING = 6, SLICE = 16;

/**
 * The top-left bracket, drawn (row y, column x of the slot), mirrored into the other corners: H his
 * lighter gold on the outer edge, G his light gold (round the socket), L his gold (the arms' inner row) and M his
 * darker gold, D his shadow (inner edges only), r the rivet's dark socket, c the rivet's ball ('.'
 * the frame below).
 */
const BRACKET = [
  '............', // 0 the slot's outer line
  '.HHHHHHHHHHH', // 1
  '.HGrrGLLLLL.', // 2
  '.HrccrLMD...', // 3
  '.HrccrM.....', // 4
  '.HGrrMD.....', // 5
  '.HLLMD......', // 6
  '.HLM........', // 7
  '.HLD........', // 8
  '.HL.........', // 9
  '.HL.........', // 10
  '.H..........', // 11
];

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
  // Brackets: the drawn bracket mirrored into each corner (so every one is lit on its outer edges).
  const at = (x: number, y: number): string => {
    if (x < 0 || y < 0 || x >= SLOT || y >= SLOT) return '.';
    const mx = x < SLOT / 2 ? x : SLOT - 1 - x, my = y < SLOT / 2 ? y : SLOT - 1 - y;
    return BRACKET[my]?.[mx] ?? '.';
  };
  const on = (x: number, y: number): boolean => at(x, y) !== '.';
  // The rivet's ball is lit from the top left in every corner: its top-left pixel brightest.
  const ball = (x: number, y: number): string => {
    const left = at(x - 1, y) !== 'c', top = at(x, y - 1) !== 'c';
    return left && top ? c.rivet.hi : left || top ? c.rivet.mid : c.rivet.dark;
  };
  const tone: Record<string, string> = { H: c.bracket.hi, G: c.bracket.gold, L: c.bracket.light, M: c.bracket.mid, D: c.bracket.dark, r: c.rivet.rim };
  for (let y = 0; y < SLOT; y++)
    for (let x = 0; x < SLOT; x++) {
      const ch = at(x, y);
      if (ch !== '.') img.set(x, y, hex(ch === 'c' ? ball(x, y) : tone[ch]));
    }
  // A dark edge where the bracket meets the bar, the gold line or the window (not on the outline).
  for (let y = 1; y < SLOT - 1; y++)
    for (let x = 1; x < SLOT - 1; x++) {
      if (on(x, y)) continue;
      if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) img.set(x, y, hex(c.bracket.edge));
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
  round: 6,
  screen: [1600, 900],
  pixel: 'one art pixel per screen pixel (finer than ui_battle, whose art pixels are 2x2): draw at 1x on a 1600x900 screen, @2x on a 2x screen, always with image-rendering: pixelated',
  sliceOrder: 'top, right, bottom, left (pixels)',
  method:
    'his crop area-averaged (box) straight to the size (smoothed along his strokes first for the Kirin 88 and the water; over the Kirin head his unsmoothed box reduction unsharp-masked at the size), a light bilateral filter, nearest palette entry with no dither (hue weighed up for the fire wave), every 1- or 2-pixel area of one colour merged into its neighbours, then only what the reduction loses restated on his picture (traced on his crop: the Kirin glow, gum, fangs, horn tip, nostril and teeth; the fire wave swirl, tongue and embers; the water lip, foam and spray; the fireball core and arms) and his sparks drawn on top (see tools/ui/ui-icons.ts)',
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
      layer: 'over or under the icon, either way: the window is transparent except its 4 corner pixels (dark #1a1206, where the bracket blocks end), and the gold brackets sit on the 6-pixel border, so nothing else of the frame covers the icon.',
      emptyFill: '#0f1116',
      at2x: 'on a 2x screen: the frame doubled (nearest, 112x112, slices 32) and the @2x icon in its 88x88 window at 12,12',
      use: 'His skill slot from the icon picture: dark steel bar with a lit outer edge, his thin gold line inside, antique gold corner brackets (his gold, measured on his four slots) (arms 2 px of gold for their full 10 px, his lighter gold on the outer edge and his gold inside, with his step on the inner edge near the block and a 45-degree tip; every bracket lit on its outer edges, his shadow only on the inner edges) holding his rivet, a grey ball lit from the top left in a 1-px dark socket (4 px across). The skill icon goes in the window.',
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
  const title = screenText('SKILL ICONS 1 (round 6)  -  his icons beside ours (sheet at 2x: every pixel shown 2x2)', 'title', HEAD);
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
