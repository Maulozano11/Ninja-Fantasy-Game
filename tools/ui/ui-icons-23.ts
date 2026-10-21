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
//     Sheets 8 to 11 add his rare colours (coverPalette): the k-means follows how much of the picture
//     a colour covers, so a small part of another hue (his ninjas' skin, his violet chains, a dragon's
//     teeth, the white of his spray) went to the nearest entry in lightness, of the wrong hue.
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
//
// Sheets 8 to 11 (2026-10-21: the clan abilities and the clan secrets), one staging folder per sheet:
//
//   python3 -I tools/refs/icons-from-ref-23.py 8=docs/reference/icons-owner-reference-8.jpg <stage8>
//   UI_OUT=<stage8> UI_FRAME=src/assets/ui_icons npx tsx tools/ui/ui-icons-23.ts
//
// Sheets 9 and 10 are made as sheets 4 to 7 (his 98x96 windows). Sheets 8 and 11 have bigger
// windows (127 to 139 of his pixels across): too big to keep one to one at 88, so there the 88 is
// made as the 44 is (area mean of his pixels, his thin lines and specks kept in their own colour,
// palette, clean-up; no bilateral filter on sheets 8 to 11). Two icons carry an edit the owner asked
// for (2026-10-21, to keep clear of Naruto's eyes), made on his window before anything else and then
// drawn crisp at both sizes (`edit` and `art`, recorded in the manifest under `edits`):
//  - Command (northstar_command): the sharingan in his eye's iris goes (the iris is his radiant red
//    all over, as round the sharingan); on it a compass rose of the four cardinal points, drawn as the
//    red star of his Submission icon is drawn (crimson facets, pale pink only as thin strokes), under
//    his upper lid.
//  - Premonition (mirai_evasion): his eye becomes a plain radiant red eye, no symbol: his reds
//    lighter toward a highlight, a round dark pupil and the highlight.
// Two more carry his phase (2026-10-21: the Ryusei warp is a "phase", his ninjas drawn as the figure
// of blue light in his reference picture), made the same way (see phaseEdit and phaseArt):
//  - Swap (ryusei_swap) and Warp Strike (ryusei_warp): his ninjas keep their pose, silhouette and
//    details, but their bodies become light in his reference's blues: a translucent blue body (his
//    greys on the blues, a little of his ground showing through), his lit greys and skin the
//    brighter blues, his outline and fold lines the near-white rim and light lines, a soft blue
//    glow round them; Swap's left ninja dissolves into his streaks on his trailing side. His vortex,
//    portal, kunai, wind, speed lines and stars stay his. At 88 and 44 the rim is drawn again crisp.

import { existsSync, readFileSync } from 'node:fs';
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

/**
 * The palette's coverage (sheets 8 to 11): his rare colours a slot each. The k-means above is led by
 * how much of the picture a colour covers, so a colour of a small part (his ninjas' skin, his violet
 * chains, a dragon's teeth, a spray's white) found no entry and went to the nearest one in lightness,
 * of another hue (skin to lavender, violet to maroon). Here every pixel that is to be put on the
 * palette (the 44's and the 88's pictures, `targets`, each pixel weighted) is lost when its nearest
 * entry is farther than `thr`, in OKLab with hue and chroma weighted `cw` and lightness `wl` (a wrong
 * hue counts more than a step of lightness, which the ramp already has). The group of lost colours
 * (all within `thr` of one of them) that is missed most (the sum over its pixels of how far beyond
 * `thr` each is, times its weight: a small part missed by a whole hue beats a big area a little off)
 * gives a new entry, if it weighs at least `minMass`: its mean, snapped to his nearest real colour.
 * Again until no such group is left or `add` entries were added. Returns them in the order found.
 */
interface Cover {
  thr: number;
  minMass: number;
  add: number;
  cw: number;
  wl: number;
}
function coverPalette(rgb: RGBA[], his: { rgb: RGBA[]; lab: Lab[] }, targets: { f: F; weight: number }[], opt: Cover): RGBA[] {
  const cd = (p: Lab, q: Lab): number => {
    const dl = (p[0] - q[0]) * opt.wl, da = (p[1] - q[1]) * opt.cw, db = (p[2] - q[2]) * opt.cw;
    return Math.sqrt(dl * dl + da * da + db * db);
  };
  const pts: Lab[] = [], wts: number[] = [];
  for (const t of targets)
    for (let i = 0; i < t.f.w * t.f.h; i++) {
      pts.push(t.f.lab(i));
      wts.push(t.weight);
    }
  const pal = rgb.map((c) => oklab(c[0], c[1], c[2]));
  const err = pts.map((p) => Math.min(...pal.map((q) => cd(p, q))));
  const added: RGBA[] = [];
  const done = new Uint8Array(pts.length);
  while (added.length < opt.add) {
    const lost: number[] = [];
    for (let i = 0; i < pts.length; i++) if (err[i] > opt.thr && !done[i]) lost.push(i);
    if (!lost.length) break;
    let best = -1, bs = 0;
    for (const i of lost) {
      let mass = 0, score = 0;
      for (const j of lost)
        if (cd(pts[i], pts[j]) <= opt.thr) {
          mass += wts[j];
          score += wts[j] * (err[j] - opt.thr);
        }
      if (mass >= opt.minMass && score > bs + 1e-9) (bs = score), (best = i);
    }
    if (best < 0) break;
    const grp = lost.filter((j) => cd(pts[best], pts[j]) <= opt.thr);
    const mean: Lab = [0, 0, 0];
    let tw = 0;
    for (const j of grp) {
      for (let k = 0; k < 3; k++) mean[k] += pts[j][k] * wts[j];
      tw += wts[j];
    }
    for (let k = 0; k < 3; k++) mean[k] /= tw;
    let hb = 0, hd = Infinity;
    for (let i = 0; i < his.lab.length; i++) {
      const d = cd(mean, his.lab[i]);
      if (d < hd) (hd = d), (hb = i);
    }
    const c = his.rgb[hb];
    for (const j of grp) done[j] = 1;
    if ([...rgb, ...added].some((u) => u[0] === c[0] && u[1] === c[1] && u[2] === c[2])) continue;
    added.push(c);
    const q = his.lab[hb];
    for (let i = 0; i < pts.length; i++) err[i] = Math.min(err[i], cd(pts[i], q));
  }
  return added;
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
  /** The pixels it marks are kept out of the clean-up as his own (his embers, his teeth: a pixel or two each, which the clean-up merged into their ground). */
  keep?: boolean;
  /** Only his pixels (his window's coordinates) where this holds count (sheets 8 to 11: a rule kept off one part of his picture at both sizes). */
  win?: (x: number, y: number) => boolean;
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
    for (let i = 0; i < w * h; i++) m[i] = t[i] > rule.thr && L[i] >= (rule.minL ?? 0) && L[i] <= (rule.maxL ?? 1) && C[i] >= (rule.minC ?? 0) && inHue(i) && (!rule.win || rule.win(i % w, (i - (i % w)) / w)) ? 1 : 0;
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
    speck[c] = rules[pick].keep ? 1 : lone[pick][c];
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
  /** His window in his pixels (corners cleaned, the owner's edit made), his pixels at 88 (`his88`), the 44 reduction. */
  W: F;
  his88: F;
  red: Reduced;
  /** The picture the clean-up compares with: at 88 his pixels, at 44 the reduction smoothed. */
  ref: F;
  /** Where a point of his window (his pixel coordinates, continuous: a pixel's centre is x + 0.5) falls at this size. */
  map: (x: number, y: number) => [number, number];
}

interface IconSpec {
  id: string;
  name: string;
  /** His label under the slot (his sheet). */
  label?: string;
  sheet: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11';
  /** An edit the owner asked for, made on his window (his pixels) before anything else; returns what it did, for the manifest. */
  edit?: (W: F) => string;
  /** What the hand-drawn part of the owner's edit is at each size, for the manifest. */
  editArt?: string;
  /** The owner's edit as a whole on his window (his pixels), for the comparison sheets, when part of it is drawn only at each size. */
  preview?: (W: F) => void;
  /** The owner's request behind the edit (his words) and why, for the manifest (default: his request of the Command and Premonition edits). */
  asked?: { text: string; why: string };
  /** Colours of his the owner's edit is drawn in (hex, his pixels: this window's or another icon of his), added to the palette. */
  inks?: { hex: string[]; why: string }[];
  /** Palette: k-means entries, lightness flattening, hue weight. */
  colors: number;
  flat: number;
  chroma: number;
  /** Hue weight when his pixels are put on the palette (default 1). */
  qChroma?: number;
  /** Extra palette entries sampled from places of his picture (his pixels; see sampleAt). `spare`: for the details only. */
  extra?: { box: [number, number, number, number]; lo: number; hi: number; spare: boolean; by?: 'L' | 'warm' | 'chroma'; only?: { hue?: [number, number]; minL?: number; maxL?: number }; why: string }[];
  /** Sheets 8 to 11: his rare colours get a palette slot each (see coverPalette). */
  cover?: Cover;
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
  /** True when his window is too big for his pixels one to one at 88 (sheets 8 and 11): the 88 is an area mean as the 44. */
  area88: boolean;
  /** What the owner's edit did to his window. */
  edited: string | null;
  /** The palette entries added for his rare colours (sheets 8 to 11, coverPalette). */
  covered: RGBA[];
  hisLanczos88: Img | null;
}

/** His windows up to this size (his pixels) keep his pixels one to one at 88; bigger ones are reduced. */
const ONE_TO_ONE_MAX = 100;

function loadRef(name: string): Img {
  const path = join(REF, name);
  if (!existsSync(path)) throw new Error(`ui-icons-23: missing ${path} (run tools/refs/icons-from-ref-23.py first)`);
  return loadPng(path);
}

function buildIcon(spec: IconSpec): Built {
  const W = F.of(prepWin(loadRef(`${spec.id}.png`), spec.sheet === '2'));
  // The owner's edit (Command, Premonition) is made on his pixels first, so the palette, the 88 and
  // the 44 are all made from his window as he wants it.
  const edited = spec.edit && !process.env.UI_NOEDIT ? spec.edit(W) : null;
  const sheetCrop = F.of(loadRef(`${spec.id}@sheet.png`));
  const hc = hisColours(W);
  const base = makePalette(W, hc, spec.colors, spec.flat, spec.chroma);
  const rgb = [...base.rgb], spare = [...base.spare];
  for (const e of spec.extra ?? []) {
    const c = sampleAt(W, hc, e.box, e.lo, e.hi, e.by, e.only);
    if (!rgb.some((u) => u[0] === c[0] && u[1] === c[1] && u[2] === c[2])) rgb.push(c), spare.push(e.spare);
  }
  if (edited)
    for (const ink of spec.inks ?? [])
      for (const h of ink.hex) {
        const c = hex(h);
        if (!rgb.some((u) => u[0] === c[0] && u[1] === c[1] && u[2] === c[2])) rgb.push(c), spare.push(false);
      }
  const area88 = W.w > ONE_TO_ONE_MAX || W.h > ONE_TO_ONE_MAX;
  const h88 = area88 ? { img: areaResize(W, 88, 88), cols: [] as number[], rows: [] as number[] } : his88(W);
  const marks = process.env.UI_NOMARKS ? [] : spec.marks ?? [];
  const reds: Record<number, Reduced> = { 44: reduceKeep(W, 44, marks) };
  if (area88) reds[88] = reduceKeep(W, 88, marks);
  const red = reds[44];
  /** The picture put on the palette at size N: his pixels (88 one to one) or the reduction with his marks in their own colour. */
  const pictureAt = (N: number): F => {
    if (N === 88 && !area88) return h88.img;
    const rN = reds[N] ?? red;
    const [ss, sr] = spec.bil44;
    const sm = sr > 0 ? bilateral(rN.box, ss, sr, 2) : rN.box.clone();
    // His marks keep their own colour (the smoothing is for the rest).
    for (let i = 0; i < N * N; i++) if (rN.mark[i]) for (let k = 0; k < 3; k++) sm.d[i * 3 + k] = rN.img.d[i * 3 + k];
    return sm;
  };
  const pics: Record<number, F> = { 44: pictureAt(44), 88: pictureAt(88) };
  // Sheets 8 to 11: his rare colours get a slot each (see coverPalette), from both pictures (a 44
  // pixel weighs as the four 88 pixels it stands for).
  const covered = spec.cover && !process.env.UI_NOCOVER ? coverPalette(rgb, hc, [{ f: pics[44], weight: 4 }, { f: pics[88], weight: 1 }], spec.cover) : [];
  for (const c of covered) rgb.push(c), spare.push(false);
  const pal = palOf(rgb, spare);
  pal.cw = spec.qChroma ?? 1;
  const hisPic88 = areaResize(sheetCrop, 88, 88);
  const out: Built['out'] = {};
  for (const N of [44, 88]) {
    const box = areaResize(sheetCrop, N, N);
    // His pixels one to one at 88 (sheets 2 to 7, 9, 10), or the area reduction (the 44; the 88 of sheets 8 and 11).
    const oneToOne = N === 88 && !area88;
    const rN = reds[N] ?? red;
    let ref: F, q0: Ix;
    if (oneToOne) {
      ref = h88.img;
      q0 = cleanup(quantize(ref, pal), pal, ref, 2, new Set(), hisMark(ref, spec.mark88));
    } else {
      ref = pics[N];
      const prot = new Set<number>();
      for (let i = 0; i < N * N; i++) if (rN.speck[i]) prot.add(i);
      q0 = cleanup(quantize(ref, pal), pal, ref, spec.clean44 ?? 2, prot);
    }
    const pt = new Paint(q0.clone(), pal);
    if (!oneToOne)
      for (let i = 0; i < N * N; i++) {
        if (rN.speck[i]) pt.keep(i % N, Math.floor(i / N));
        const ink = rN.mark[i] ? (spec.marks ?? [])[rN.mark[i] - 1].ink : undefined;
        if (ink) pt.px(i % N, Math.floor(i / N), ink);
      }
    // His window's points at this size: through his kept columns and rows at 88 one to one, else by scale.
    const map = (x: number, y: number): [number, number] => (oneToOne ? [keptAt(h88.cols, x), keptAt(h88.rows, y)] : [(x * N) / W.w, (y * N) / W.h]);
    if (!process.env.UI_NOART && !(spec.edit && !edited)) spec.art?.(pt, { W, his88: h88.img, red: rN, ref, map });
    const q = cleanup(pt.q, pal, ref, oneToOne ? 2 : spec.clean44 ?? 2, pt.drawn, oneToOne ? hisMark(ref, spec.mark88) : undefined);
    // At 88 one to one the small areas that stayed are his own marks.
    const hisSet = new Set(pt.his);
    if (oneToOne) {
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
  return { spec, pal, out, red, W, cols: h88.cols, rows: h88.rows, area88, edited, covered, hisLanczos88: existsSync(p88) ? loadPng(p88) : null };
}

/** His window with the owner's edit as a whole (the edit, and what is drawn only at each size drawn at his scale). */
function editedWindow(b: Built): F {
  const w = b.W.clone();
  b.spec.preview?.(w);
  return w;
}

/** Where his line `v` (continuous, his pixels) falls among the kept lines at 88 one to one. */
function keptAt(kept: number[], v: number): number {
  // Kept line k covers his [kept[k], kept[k] + 1); a point in a dropped line goes to the kept line's edge.
  let k = 0;
  while (k + 1 < kept.length && kept[k + 1] <= v) k++;
  const f = v - kept[k];
  return k + Math.max(0, Math.min(1, f));
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

// --- the owner's edits (2026-10-21) -----------------------------------------------------------------
//
// He asked (his words): "Comando ponlo con un ojo con una brujula de los signos cardinales asi como en
// la imagen de sumision quita el sharingan y el de premonicion pon solo un ojo rojo radiante sin
// simbolo para evitar el copyright de naruto". Both edits are made on his window first (his pixels:
// what the palette, the 88 and the 44 are made from) and then drawn again at each size, crisp, in his
// colours, where the reduction would soften them.

/** Sets a pixel of his window to a colour (hex). */
function setW(W: F, x: number, y: number, col: string): void {
  if (x < 0 || y < 0 || x >= W.w || y >= W.h) return;
  const c = hex(col);
  for (let k = 0; k < 3; k++) W.d[(y * W.w + x) * 3 + k] = c[k];
}

type StarKey = 'ridge' | 'pale' | 'light' | 'bright' | 'dark' | 'centre' | 'ink';
/**
 * A compass rose of the four cardinal points, drawn as his Submission star is: four long points
 * (north, east, south, west: length `L`, the north one `Ln`, `w` to each side of the axis where they
 * meet) and four short thin ones between them (`l`, `wl`), each point split along its axis into two
 * facets lit from his upper left. Pixel centres at any size: a pixel is the star's when at least half
 * of a 4x4 grid of samples in it is; its facet is the one most of them fall in. `ridge` is the axis of
 * the two long points turned to his light (north and west), from next to the centre to 1.5 short of
 * the tip: his star's thin pale stroke. `ink` is the dark outline round it (4-neighbours), so the
 * crimson rose stands on the bright red iris as his sharingan's dark lines did.
 */
function compassPixels(cx: number, cy: number, L: number, w: number, l: number, wl: number, centre: number, Ln = L): { x: number; y: number; k: StarKey }[] {
  const light: [number, number] = [-Math.SQRT1_2, -Math.SQRT1_2];
  const arms: { u: [number, number]; len: number; hw: number; long: boolean }[] = [];
  for (const [ux, uy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as [number, number][]) arms.push({ u: [ux, uy], len: uy < 0 ? Ln : L, hw: w, long: true });
  for (const [ux, uy] of [[1, -1], [1, 1], [-1, 1], [-1, -1]] as [number, number][]) arms.push({ u: [ux * Math.SQRT1_2, uy * Math.SQRT1_2], len: l, hw: wl, long: false });
  const level = (b: number): StarKey => (b >= 0.5 ? 'pale' : b >= 0 ? 'light' : b >= -0.5 ? 'bright' : 'dark');
  const sample = (px: number, py: number): StarKey | null => {
    const dx = px - cx, dy = py - cy;
    if (Math.hypot(dx, dy) <= centre) return 'centre';
    let best: StarKey | null = null, bs = -Infinity;
    for (const a of arms) {
      const v: [number, number] = [-a.u[1], a.u[0]];
      const s = dx * a.u[0] + dy * a.u[1], t = dx * v[0] + dy * v[1];
      if (s < -1e-9 || s > a.len || Math.abs(t) > a.hw * (1 - s / a.len)) continue;
      // The arm the point lies along most (where arms overlap near the centre).
      const along = s / a.len;
      if (along <= bs) continue;
      bs = along;
      const side: [number, number] = t >= 0 ? v : [-v[0], -v[1]];
      const b = 0.6 * (side[0] * light[0] + side[1] * light[1]) + 0.4 * (a.u[0] * light[0] + a.u[1] * light[1]);
      best = level(b);
    }
    return best;
  };
  const out = new Map<string, { x: number; y: number; k: StarKey }>();
  const R = Math.ceil(Math.max(L, Ln, l) + 1);
  for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++)
    for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
      const n = new Map<StarKey, number>();
      let inside = 0;
      for (let j = 0; j < 4; j++)
        for (let i = 0; i < 4; i++) {
          const k = sample(x + (i + 0.5) / 4, y + (j + 0.5) / 4);
          if (!k) continue;
          inside++;
          n.set(k, (n.get(k) ?? 0) + 1);
        }
      if (inside < 8) continue;
      let k: StarKey = 'bright', kn = -1;
      for (const key of ['centre', 'pale', 'light', 'bright', 'dark'] as StarKey[]) if ((n.get(key) ?? 0) > kn) (kn = n.get(key) ?? 0), (k = key);
      out.set(`${x},${y}`, { x, y, k });
    }
  for (const a of arms) {
    if (!a.long || a.u[0] * light[0] + a.u[1] * light[1] <= 0) continue;
    for (let s = 1; s <= a.len - 1.5; s++) {
      const p = out.get(`${Math.floor(cx + a.u[0] * s)},${Math.floor(cy + a.u[1] * s)}`);
      if (p && p.k !== 'centre') p.k = 'ridge';
    }
  }
  for (const p of [...out.values()])
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const key = `${p.x + dx},${p.y + dy}`;
      if (!out.has(key)) out.set(key, { x: p.x + dx, y: p.y + dy, k: 'ink' });
    }
  return [...out.values()].sort((a, b) => a.y - b.y || a.x - b.x);
}

// His Command eye (his window as cropped, 127x127; continuous coordinates, a pixel's centre at +0.5):
// the iris is a circle about (60, 59), its dark rim at radius 17 to 19; his upper lid covers it above
// y 45 and shades it down to y 52. His sharingan inside: a dark ring at radius 10.5 with three tomoe
// on it (their tips reach radius 15) and a round pupil (radius 4). Round them his iris is his bright
// red (#fe1020 and the like, OKLab L 0.6 to 0.63) from the pupil out to radius 14, darker from 15 to
// his dark rim.
const CMD = { cx: 60, cy: 59, inner: 16.5, pattern: 15.5, bright: 14.5, shade: 52 };
// The compass rose, at 88 (his scale x 127/88 for the comparison sheet): long points of 8.5 pixels
// (the north one ends under his lid's dark line, as the iris does), short ones 4.5. Colours: his
// Submission star's own: his lit crimson (#e80c28) on the facets toward his light, his shaded crimson
// (#a0001e) and his deep red (#6a0418) on the others, his pale pink (#ffb4bc) only as the thin stroke
// along the north and west points, his palest (#ffc5c8) at the heart, his dark maroon (#4c031e) as
// the outline that sets it off his bright iris.
const CMD_STAR = { L: 10, Ln: 8.5, w: 3.8, l: 5.5, wl: 2, centre: 0.7 };
const STAR_INK: Record<StarKey, string> = { centre: '#ffc5c8', ridge: '#ffb4bc', pale: '#dc112d', light: '#dc112d', bright: '#a0001e', dark: '#6a0418', ink: '#4c031e' };
/** His iris's bright red (his pixels round the pupil). */
const CMD_IRIS = '#fe1020';

/**
 * His Command eye without the sharingan, a plain radiant red iris: every pixel of his pattern (his
 * dark ring, tomoe and pupil with their dark red edges: inside radius 14.5 everything darker than his
 * bright iris, out to 15.5 his tomoe tips) takes his iris's own colour at that distance from the
 * centre: the median of his iris pixels there that are not the pattern, his bright ones only inside
 * radius 14.5 (the pupil takes his bright red next to it), and under his lid's shade (above y 52)
 * his shaded iris colour of that row. The compass rose is drawn at each size (commandArt).
 */
function commandEdit(W: F): string {
  const { cx, cy, inner, pattern, bright, shade } = CMD;
  const L = (x: number, y: number) => W.lab(y * W.w + x)[0];
  const r = (x: number, y: number) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
  const isPattern = (x: number, y: number): boolean => {
    const d = r(x, y);
    if (d >= pattern || y + 0.5 < cy - pattern) return false;
    // Under his lid's shade his iris is dark itself: only his pattern's darkest there.
    if (y < shade) return L(x, y) < (d < 12.5 ? 0.43 : 0.33);
    return L(x, y) < (d < bright ? 0.56 : 0.36);
  };
  const bins = new Map<number, number[][]>(), rowsShade = new Map<number, number[][]>();
  for (let y = 0; y < W.h; y++)
    for (let x = 0; x < W.w; x++) {
      const d = r(x, y);
      if (d >= inner || isPattern(x, y) || L(x, y) < 0.2) continue;
      const c = [0, 1, 2].map((k) => W.d[(y * W.w + x) * 3 + k]);
      if (y >= shade) {
        const b = Math.floor(d);
        bins.set(b, [...(bins.get(b) ?? []), c]);
      } else rowsShade.set(y, [...(rowsShade.get(y) ?? []), c]);
    }
  const median = (cs: number[][]): number[] => [0, 1, 2].map((k) => {
    const v = cs.map((c) => c[k]).sort((a, b) => a - b);
    return v[v.length >> 1];
  });
  // The nearest bin with his iris there, out first (the pupil takes the bright ring round it).
  const binAt = (d: number): number[][] | undefined => {
    const b0 = Math.floor(d);
    for (let k = 0; k < inner + 2; k++) for (const b of [b0 + k, b0 - k]) if (bins.has(b)) return bins.get(b);
    return undefined;
  };
  let n = 0;
  for (let y = 0; y < W.h; y++)
    for (let x = 0; x < W.w; x++) {
      if (!isPattern(x, y)) continue;
      const cs = y < shade ? rowsShade.get(y) : binAt(r(x, y));
      if (!cs) continue;
      const m = median(cs);
      for (let k = 0; k < 3; k++) W.d[(y * W.w + x) * 3 + k] = m[k];
      n++;
    }
  return `his sharingan (${n} of his pixels: the dark ring, three tomoe with their tips, the pupil and their dark red edges) painted out with his own iris colour at each distance from the centre (his bright red out to radius ${bright}, under his lid's shade his shaded iris colour of that row): a plain radiant red iris for the compass rose`;
}

/** His window with the compass drawn at his scale (for the comparison sheets: the edit as a whole, in his pixels). */
function commandPreview(W: F): void {
  const s = CMD_STAR, k = W.w / 88;
  for (const p of compassPixels(CMD.cx, CMD.cy, s.L * k, s.w * k, s.l * k, s.wl * k, s.centre * k, s.Ln * k)) setW(W, p.x, p.y, STAR_INK[p.k]);
}

// The compass at 44: the same shape at that size (long points of 4.5 pixels, the north one 3.5 so it
// ends under his lid's dark line, short ones 2.6), round the pixel that holds his iris's centre.
const CMD_STAR44 = { L: 4.5, Ln: 3.5, w: 1.8, l: 2.6, wl: 0.9, centre: 0.5 };

/**
 * His iris round the rose in his own bright red: his iris is one flat bright red (#fe1020) from the
 * pupil out to radius 14.5 below his lid's shade, and the reduction spreads it over the palette's
 * neighbouring reds (one of them the rose's lit crimson); there it is put back on his red.
 */
function irisRadiant(pt: Paint, ctx: Ctx): void {
  const [mx, my] = ctx.map(CMD.cx, CMD.cy);
  const k = pt.N / ctx.W.w, R = CMD.bright * k, top = CMD.shade * k;
  const red = pt.c(CMD_IRIS);
  for (let y = Math.floor(my - R); y <= Math.ceil(my + R); y++)
    for (let x = Math.floor(mx - R); x <= Math.ceil(mx + R); x++) {
      if (y < top || Math.hypot(x + 0.5 - mx, y + 0.5 - my) > R) continue;
      const v = pt.at(x, y), c = pt.p.lab[v];
      // His bright reds only (not the darker rim band or a dark line).
      if (c[0] >= 0.55 && Math.hypot(c[1], c[2]) >= 0.2 && hueDeg(c) < 40) pt.q.set(x, y, red);
    }
}

/** The compass at 88 (the shape above with its dark outline) and at 44 (by hand), on his radiant iris; at 44 also his lower-left sparkle's white core. */
function commandArt(pt: Paint, ctx: Ctx): void {
  const [mx, my] = ctx.map(CMD.cx, CMD.cy);
  if (pt.N === 44) {
    const ax = Math.floor(mx), ay = Math.floor(my);
    irisRadiant(pt, ctx);
    drawRose(pt, ax + 0.5, ay + 0.5, CMD_STAR44);
    // His lower-left sparkle (his pixels 17-26, 89-100): at 44 his box keeps its white core at (7, 33)
    // and his pinks round it, where the palette's nearest was a flat pink square.
    pt.ascii(6, 32, ['.r.', 'rwp', '.p.'], { w: '#ffced2', p: '#f8848e', r: '#f43d4e' });
    return;
  }
  const k = pt.N / 88, s = CMD_STAR;
  const cx = Math.floor(mx) + 0.5, cy = Math.floor(my) + 0.5;
  irisRadiant(pt, ctx);
  drawRose(pt, cx, cy, { L: s.L * k, Ln: s.Ln * k, w: s.w * k, l: s.l * k, wl: s.wl * k, centre: Math.max(0.5, s.centre * k) });
}

/** The compass rose at one size, in his star's colours; its outline only where it sets the rose off something lighter (not on his lid's dark line). */
function drawRose(pt: Paint, cx: number, cy: number, s: typeof CMD_STAR): void {
  const inkL = pt.p.lab[pt.c(STAR_INK.ink)][0];
  for (const p of compassPixels(cx, cy, s.L, s.w, s.l, s.wl, s.centre, s.Ln)) {
    if (p.k === 'ink' && pt.L(p.x, p.y) <= inkL + 0.02) continue;
    pt.px(p.x, p.y, STAR_INK[p.k]);
  }
}

// His Premonition eye (his window, 98x96): the iris a circle about (49, 16.5), its dark rim at
// radius 10.5 to 11.75. Inside it his pattern (a dark ring with three tomoe joined round the pupil).
const MIRAI = { cx: 49, cy: 16.5, inner: 10.4, pupil: 3.3 };
// His reds from his window, dark to light, and his palest pink (the sclera) for the highlight.
const MIRAI_RAMP = ['#580412', '#79081c', '#aa1630', '#c31e39', '#dc1a32', '#f21c33', '#e3687a', '#f098a2'];
const MIRAI_PUPIL = '#12030c', MIRAI_SHINE = '#fbb5b7';

/** The ramp step of a point of the radiant iris (dx, dy from the centre, in units of the iris radius). */
function miraiStep(dx: number, dy: number): number {
  const t = Math.hypot(dx, dy); // 0 at the centre, 1 at the rim
  const lit = (-dx - dy) * Math.SQRT1_2; // toward his upper left
  // Brightest in a ring round the pupil and toward the highlight, darkest at the rim, lower right.
  const v = 1 - Math.pow(t, 1.6) * 0.95 + 0.35 * lit;
  return Math.max(0, Math.min(MIRAI_RAMP.length - 1, Math.round(v * (MIRAI_RAMP.length - 1) - 0.6)));
}

/** His Premonition eye as a plain radiant red eye: his reds lighter toward the highlight, a round dark pupil, the highlight. */
function miraiEdit(W: F): string {
  const { cx, cy, inner, pupil } = MIRAI;
  let n = 0;
  for (let y = Math.floor(cy - inner); y <= Math.ceil(cy + inner); y++)
    for (let x = Math.floor(cx - inner); x <= Math.ceil(cx + inner); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
      if (d > inner) continue;
      setW(W, x, y, d <= pupil ? MIRAI_PUPIL : MIRAI_RAMP[miraiStep(dx / inner, dy / inner)]);
      n++;
    }
  // The highlight: two by two of his palest pink at the pupil's upper left edge.
  for (const [x, y] of [[45, 12], [46, 12], [45, 13], [46, 13]]) setW(W, x, y, MIRAI_SHINE);
  return `his eye's pattern (a dark ring with three tomoe round the pupil: ${n} of his pixels inside the iris's dark rim) replaced by a plain radiant red iris in his reds (${MIRAI_RAMP.join(' ')}), darkest at the rim and lower right, lighter toward the highlight; a round dark pupil (${MIRAI_PUPIL}, radius ${pupil} of his pixels) and a highlight of his palest pink (${MIRAI_SHINE}) at its upper left. His rim, sclera, lids and glow stay his.`;
}

/** The pupil and highlight again at 88 and 44, crisp and round at that size (at 44 the iris too). */
function miraiArt(pt: Paint, ctx: Ctx): void {
  const [mx, my] = ctx.map(MIRAI.cx, MIRAI.cy);
  if (pt.N === 44) {
    // His iris redrawn with the same ramp, so its bands stay clean; the pupil two by two (the
    // roundest at that size) and the highlight one pixel at its upper left.
    const rIn = (MIRAI.inner * pt.N) / ctx.W.w;
    for (let y = Math.floor(my - rIn - 1); y <= Math.ceil(my + rIn + 1); y++)
      for (let x = Math.floor(mx - rIn - 1); x <= Math.ceil(mx + rIn + 1); x++) {
        const dx = x + 0.5 - mx, dy = y + 0.5 - my;
        if (Math.hypot(dx, dy) > rIn) continue;
        pt.px(x, y, MIRAI_RAMP[miraiStep(dx / rIn, dy / rIn)]);
      }
    const px0 = Math.round(mx) - 1, py0 = Math.round(my) - 1;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) pt.px(px0 + dx, py0 + dy, MIRAI_PUPIL);
    pt.px(px0 - 1, py0 - 1, MIRAI_SHINE);
    return;
  }
  // At 88 the iris is his pixels (one to one): the pupil a disc a little under his radius, as a
  // dropped column or row may pass through it.
  const rp = MIRAI.pupil * 0.95;
  for (let y = Math.floor(my - rp - 1); y <= Math.ceil(my + rp + 1); y++)
    for (let x = Math.floor(mx - rp - 1); x <= Math.ceil(mx + rp + 1); x++) if (Math.hypot(x + 0.5 - mx, y + 0.5 - my) <= rp) pt.px(x, y, MIRAI_PUPIL);
  // The highlight at the pupil's upper left, two by two.
  const hx = Math.floor(mx - rp * 0.75), hy = Math.floor(my - rp * 0.75);
  for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) pt.px(hx + dx, hy + dy, MIRAI_SHINE);
}

// --- the owner's phase ninjas (2026-10-21) ------------------------------------------------------------
//
// He asked (his words): "en la habilidad de hotbar de intercambio y golpe warp de los ryusei dile al
// artista que quiero que dibuje a los ninjas asi como en esta imagen de referencia y asi va ser el
// efecto de warp de los ryusei en el juego como un "phase"". His reference picture is a figure made
// all of electric-blue light: a translucent deep blue body, brighter blue on the lit forms, near-white
// lines along the silhouette, the muscles and the folds of the clothes, a soft blue glow round it.
// In Swap (two ninjas) and Warp Strike (one ninja out of the portal) his ninjas become that, on his
// window (his pixels) before anything else: each keeps his pose, silhouette and details (hood, mask,
// eyes, folds, hands), but his near-black outline and fold lines become the light lines, his greys
// the blues (his darker greys the deep blues, his lighter greys, his lit forms, the brighter ones),
// his skin the bright blues round his dark eyes; a little of his ground shows through the body; the
// left ninja of Swap dissolves into his streaks and after-image (translucent blue, no rim) on his
// trailing side. Everything that is not his ninjas (his vortex and portal, his kunai, his wind and
// speed lines, his stars, his ground) stays his, but for the glow round the ninjas.

/** His phase blues, dark to light: the median colour of his reference figure's pixels in ten steps of lightness, and its whitest. */
const PHASE_RAMP = ['#00035a', '#041384', '#11249b', '#1d35ba', '#2d49cf', '#415fdc', '#5a7ae8', '#799bf8', '#99bbff', '#c4e3ff', '#e4ffff'];

interface PhaseSpec {
  /** What the edit is, for the manifest. */
  what: string;
  /** Polygons (his pixels, continuous) holding his ninjas; no pixel outside them is his ninja. */
  areas: [number, number][][];
  /** His ninjas' own pixels: his dark greys (OKLab lightness below maxL, chroma below maxC). */
  maxL: number;
  maxC: number;
  /** His see-through after-image (Swap's left ninja): lighter greys (lightness below smearL, chroma below smearC), and inside the `trail` polygons his ninja's streaks too (he dissolves into them: no rim there). */
  smearL?: number;
  smearC?: number;
  trail?: [number, number][][];
  /** His skin round the eyes and on the fists: hue within skinHue (degrees), chroma at least skinC, lightness at least 0.3. */
  skinHue: [number, number];
  skinC: number;
  /** His eyes (his pixels), and the ramp step they take. */
  eyes: [number, number][];
  eyeStep: number;
  /** The ramp step of his fold lines. */
  lineStep: number;
  /** Pieces of his ninja's colours smaller than this are his ground, not his ninja. */
  minPiece: number;
  /** Gaps in his ninja up to this size (pixels; after closing the figure by one pixel) are his ninja too. */
  maxHole: number;
  /** His fold lines: his pixels darker than lineL, or darker than his ninja round them (5x5) by lineDrop, in runs of at least lineMin. */
  lineL: number;
  lineDrop: number;
  lineMin: number;
  /** His greys from fillLo to fillHi (lightness) go on the ramp's blues, steps fillSteps[0] to fillSteps[1]. */
  fillLo: number;
  fillHi: number;
  fillSteps: [number, number];
  /** How much of the phase colour covers his ground (the rest shows through): the body, his after-image. */
  alpha: number;
  smearAlpha: number;
  /** The ramp steps of the rim: where it faces his light (up, left), and elsewhere. */
  rimLit: number;
  rimShade: number;
  /** The ramp step of the glow, laid on his ground as light is (screen: it only ever lightens). */
  glowStep: number;
}

const PH_NONE = 0, PH_BODY = 1, PH_SMEAR = 2, PH_SKIN = 3, PH_EYE = 4, PH_GAP = 5;
/** The ninja mask of each icon (his pixels, PH_*), as its phase edit found it: for the drawing at each size. */
const PHASE_MASK = new Map<string, Uint8Array>();

/**
 * His ninjas in his window (PH_* per pixel), by his colours inside the areas: his dark greys (body),
 * his skin, his eyes, his see-through after-image; then the figure closed by one pixel (his wind
 * streaks across a ninja, a pixel or two of his ground between two of his lines) and its small
 * holes filled: those pixels are PH_GAP (inside the figure, his own colour).
 */
function phaseMask(W: F, s: PhaseSpec): Uint8Array {
  const { w, h } = W, n = w * h;
  const m = new Uint8Array(n);
  const inside = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const x = i % w, y = (i - x) / w;
    if (!s.areas.some((p) => inPoly(p, x + 0.5, y + 0.5))) continue;
    inside[i] = 1;
    const c = W.lab(i), C = Math.hypot(c[1], c[2]), hd = hueDeg(c);
    if (C >= s.skinC && c[0] >= 0.3 && hd >= s.skinHue[0] && hd <= s.skinHue[1]) m[i] = PH_SKIN;
    else if (c[0] < s.maxL && C < s.maxC) m[i] = PH_BODY;
    else if (s.smearL !== undefined && c[0] < s.smearL && C < (s.smearC ?? 0)) m[i] = PH_SMEAR;
  }
  // Pieces too small to be his ninja go back to his ground.
  const any = new Uint8Array(n);
  for (let i = 0; i < n; i++) any[i] = m[i] ? 1 : 0;
  for (const g of groups(any, w, h)) if (g.length < s.minPiece) for (const i of g) m[i] = PH_NONE;
  for (let i = 0; i < n; i++) {
    const x = i % w, y = (i - x) / w;
    if (m[i] === PH_BODY && (s.trail ?? []).some((p) => inPoly(p, x + 0.5, y + 0.5))) m[i] = PH_SMEAR;
  }
  for (const [x, y] of s.eyes) m[y * w + x] = PH_EYE;
  // The figure (body, skin, eyes) closed by one pixel (3x3), inside his areas.
  const fig = new Uint8Array(n);
  for (let i = 0; i < n; i++) fig[i] = m[i] === PH_BODY || m[i] === PH_SKIN || m[i] === PH_EYE ? 1 : 0;
  const grow = (a: Uint8Array, on: boolean): Uint8Array => {
    const o = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const x = i % w, y = (i - x) / w;
      let v = on ? 0 : 1;
      for (let dy = -1; dy <= 1 && v !== (on ? 1 : 0); dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = Math.max(0, Math.min(w - 1, x + dx)), yy = Math.max(0, Math.min(h - 1, y + dy));
          if (on ? a[yy * w + xx] : !a[yy * w + xx]) {
            v = on ? 1 : 0;
            break;
          }
        }
      o[i] = v;
    }
    return o;
  };
  const closed = grow(grow(fig, true), false);
  for (let i = 0; i < n; i++) {
    const x = i % w, y = (i - x) / w;
    if (closed[i] && inside[i] && m[i] === PH_NONE && !(s.trail ?? []).some((p) => inPoly(p, x + 0.5, y + 0.5))) m[i] = PH_GAP;
  }
  // Small holes left inside him are his too.
  const hole = new Uint8Array(n);
  for (let i = 0; i < n; i++) hole[i] = m[i] === PH_NONE || m[i] === PH_SMEAR ? 1 : 0;
  for (const g of groups(hole, w, h)) {
    if (g.length > s.maxHole) continue;
    if (g.some((i) => i % w === 0 || i % w === w - 1 || i < w || i >= n - w)) continue;
    for (const i of g) m[i] = PH_GAP;
  }
  return m;
}

/** The phase edit on his window: his ninjas become figures of blue light (see PHASE_RAMP); returns what it did. */
function phaseEdit(id: string, s: PhaseSpec): (W: F) => string {
  return (W: F): string => {
    const { w, h } = W, n = w * h;
    const m = phaseMask(W, s);
    PHASE_MASK.set(id, m);
    const R = PHASE_RAMP.map((c) => hex(c));
    const his = new Float32Array(W.d);
    const L = new Float32Array(n);
    for (let i = 0; i < n; i++) L[i] = W.lab(i)[0];
    const fig = (i: number) => m[i] === PH_BODY || m[i] === PH_SKIN || m[i] === PH_EYE || m[i] === PH_GAP;
    // Steps in from the figure's silhouette (4-neighbours; outside 0, the rim 1). His after-image
    // counts as outside: the rim is the figure's. The window's edge is not his silhouette.
    const dOut = new Int32Array(n).fill(-1);
    let ring: number[] = [];
    for (let i = 0; i < n; i++) if (!fig(i)) (dOut[i] = 0), ring.push(i);
    for (let d = 1; ring.length; d++) {
      const next: number[] = [];
      for (const i of ring) {
        const x = i % w, y = (i - x) / w;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (dOut[j] < 0) (dOut[j] = d), next.push(j);
        }
      }
      ring = next;
    }
    // His ground behind his ninja, as it would show through: filled in ring by ring from his pixels
    // round the figure (each pixel the mean of its 8-neighbours one ring further out).
    const bg = new Float32Array(his);
    let maxD = 0;
    for (let i = 0; i < n; i++) maxD = Math.max(maxD, dOut[i]);
    for (let d = 1; d <= maxD; d++)
      for (let i = 0; i < n; i++) {
        if (dOut[i] !== d) continue;
        const x = i % w, y = (i - x) / w;
        const acc = [0, 0, 0];
        let k = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            const j = yy * w + xx;
            if (dOut[j] < 0 || dOut[j] >= d) continue;
            for (let c = 0; c < 3; c++) acc[c] += bg[j * 3 + c];
            k++;
          }
        if (k) for (let c = 0; c < 3; c++) bg[i * 3 + c] = acc[c] / k;
      }
    // His ninja's lightness round each pixel (his body pixels only): r 1 for the fill, r 2 for his lines.
    const meanBody = (i: number, r: number): number => {
      const x = i % w, y = (i - x) / w;
      let t = 0, k = 0;
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (m[j] !== PH_BODY) continue;
          t += L[j];
          k++;
        }
      return k ? t / k : NaN;
    };
    // His fold lines: his darkest, or darker than his ninja round them, in runs of lineMin or more.
    const lineM = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (m[i] === PH_BODY && dOut[i] > 1 && (L[i] < s.lineL || L[i] < meanBody(i, 2) - s.lineDrop)) lineM[i] = 1;
    for (const g of groups(lineM, w, h)) if (g.length < s.lineMin) for (const i of g) lineM[i] = 0;
    const fillStep = (i: number): number => {
      const v = m[i] === PH_BODY ? L[i] : meanBody(i, 1);
      const t = Math.max(0, Math.min(1, ((Number.isNaN(v) ? s.fillLo : v) - s.fillLo) / (s.fillHi - s.fillLo)));
      const [a, b] = s.fillSteps;
      return a + Math.round((b - a) * t);
    };
    // The rim runs where the figure meets his ground, not where it dissolves into his after-image.
    const rimAt = (i: number): boolean => {
      const x = i % w, y = (i - x) / w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if (!fig(j) && m[j] !== PH_SMEAR) return true;
      }
      return false;
    };
    const mixTo = (i: number, base: Float32Array, col: RGBA, a: number) => {
      for (let c = 0; c < 3; c++) W.d[i * 3 + c] = base[i * 3 + c] * (1 - a) + col[c] * a;
    };
    const count = { rim: 0, line: 0, fill: 0, gap: 0, skin: 0, eye: 0, smear: 0, glow: 0 };
    for (let i = 0; i < n; i++) {
      if (m[i] === PH_NONE) continue;
      const x = i % w, y = (i - x) / w;
      if (m[i] === PH_SMEAR) (mixTo(i, his, R[6], s.smearAlpha), count.smear++);
      else if (m[i] === PH_EYE) (mixTo(i, his, R[s.eyeStep], 1), count.eye++);
      else if (dOut[i] === 1 && rimAt(i)) {
        // The rim: his reference's pale blue where it faces his light (up, left), a lit blue elsewhere.
        const lit = (y > 0 && !fig(i - w)) || (x > 0 && !fig(i - 1));
        mixTo(i, his, R[lit ? s.rimLit : s.rimShade], 1);
        count.rim++;
      } else if (m[i] === PH_SKIN) (mixTo(i, his, R[L[i] < 0.45 ? 7 : L[i] < 0.6 ? 8 : 9], 1), count.skin++);
      else if (lineM[i]) (mixTo(i, his, R[s.lineStep], 1), count.line++);
      else if (m[i] === PH_GAP) (mixTo(i, his, R[fillStep(i)], s.alpha), count.gap++);
      else (mixTo(i, bg, R[fillStep(i)], s.alpha), count.fill++);
    }
    // The glow round him: his ground outside the figure takes the ramp's blue as light (screen), less
    // with distance: it lightens his ground, never darkens it (on Swap's cyan a darker blue mix read as
    // a dark outline).
    const G = R[s.glowStep];
    const near = (x: number, y: number): number => {
      let best = Infinity;
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          if (fig(yy * w + xx)) best = Math.min(best, Math.hypot(dx, dy));
        }
      return best;
    };
    for (let i = 0; i < n; i++) {
      if (fig(i)) continue;
      const x = i % w, y = (i - x) / w;
      const d = near(x, y);
      if (d > 3) continue;
      const a = d <= 1 ? 0.5 : d <= 1.5 ? 0.4 : d <= 2 ? 0.25 : d <= 2.9 ? 0.12 : 0.06;
      for (let c = 0; c < 3; c++) {
        const v = W.d[i * 3 + c];
        W.d[i * 3 + c] = v * (1 - a) + (255 - ((255 - v) * (255 - G[c])) / 255) * a;
      }
      count.glow++;
    }
    return (
      `${s.what}: his ninja${s.areas.length > 1 ? 's' : ''} (${count.rim + count.line + count.fill + count.gap + count.skin + count.eye} of his pixels${count.smear ? `, and ${count.smear} of his see-through after-image` : ''}) redrawn as ${s.areas.length > 1 ? 'figures' : 'a figure'} of blue light in his reference's blues (${PHASE_RAMP.join(' ')}): ` +
      `the silhouette as the near-white rim (${count.rim} pixels; his reference's whitest where it faces up or left), ` +
      `his fold lines (darker than ${s.lineL}, or ${s.lineDrop} darker than his ninja round them) as light blue lines (${count.line}), ` +
      `his greys on the blues (his lightness ${s.fillLo} to ${s.fillHi} on steps ${s.fillSteps[0]} to ${s.fillSteps[1]}, ${PHASE_RAMP[s.fillSteps[0]]} to ${PHASE_RAMP[s.fillSteps[1]]}, a step lighter just inside the rim) at ${Math.round(s.alpha * 100)}% over his ground filled in from round the figure, so a little of it shows through (${count.fill}; his wind across the figure the same over his own pixels, ${count.gap}), ` +
      `his skin his bright blues (${PHASE_RAMP[7]} to ${PHASE_RAMP[9]} by his lightness, ${count.skin})${count.eye ? `, his eyes ${PHASE_RAMP[s.eyeStep]} so they stay dark in that light band (${count.eye})` : ''}` +
      (count.smear ? `, his after-image his reference's blue (${PHASE_RAMP[6]}) over his pixels at ${Math.round(s.smearAlpha * 100)}% (${count.smear})` : '') +
      `; a soft glow of his blue (${PHASE_RAMP[5]}) round the figure, half at the edge, gone at three pixels (${count.glow}). Everything else stays his.`
    );
  };
}

const PHASE_ASKED = {
  text: 'en la habilidad de hotbar de intercambio y golpe warp de los ryusei dile al artista que quiero que dibuje a los ninjas asi como en esta imagen de referencia y asi va ser el efecto de warp de los ryusei en el juego como un "phase"',
  why: "his ninjas drawn as his reference picture's figure of blue light: the Ryusei warp in the game is a phase",
};

// Swap (his window as cropped, 139x127): his two ninjas, the left one leaping out to the left with
// his see-through after-image behind him, the right one landing on the right; his vortex between.
const SWAP_PHASE: PhaseSpec = {
  what: "Swap's two ninjas",
  areas: [
    // The left ninja, his after-image leg reaching under the vortex to his pixel 66.
    [[0, 25], [62, 25], [62, 95], [67, 95], [67, 112], [0, 112]],
    [[70, 25], [139, 25], [139, 110], [70, 110]],
  ],
  maxL: 0.5,
  maxC: 0.1,
  smearL: 0.72,
  smearC: 0.085,
  // The left ninja's trailing side (right of his torso and thigh): he dissolves into his streaks.
  trail: [[[36, 38], [67, 38], [67, 112], [36, 112], [36, 80], [43, 80], [43, 66], [36, 66]]],
  skinHue: [15, 95],
  skinC: 0.035,
  // His eyes: the dark pixel in the left ninja's skin band, the two in the right one's.
  eyes: [[20, 38], [118, 38], [120, 37]],
  eyeStep: 1,
  lineStep: 7,
  minPiece: 12,
  maxHole: 6,
  lineL: 0.225,
  lineDrop: 0.07,
  lineMin: 3,
  fillLo: 0.2,
  fillHi: 0.4,
  fillSteps: [1, 4],
  alpha: 0.92,
  smearAlpha: 0.6,
  rimLit: 9,
  rimShade: 6,
  glowStep: 7,
};

// Warp Strike (his window, 98x96): his ninja bursting out of the portal, his right arm thrown
// forward after his kunai; the portal's dark inside round him is violet, his greys are not.
const WARP_PHASE: PhaseSpec = {
  what: "Warp Strike's ninja",
  areas: [[[45, 18], [86, 18], [86, 66], [45, 66]]],
  maxL: 0.5,
  maxC: 0.058,
  skinHue: [15, 95],
  skinC: 0.035,
  // His eyes: the two dark red pixels in his face's skin band; they stay dark in the light band.
  eyes: [[66, 29], [67, 29]],
  eyeStep: 1,
  lineStep: 7,
  minPiece: 12,
  maxHole: 6,
  lineL: 0.225,
  lineDrop: 0.07,
  lineMin: 3,
  fillLo: 0.16,
  fillHi: 0.34,
  fillSteps: [1, 4],
  alpha: 0.92,
  smearAlpha: 0.6,
  rimLit: 9,
  rimShade: 6,
  glowStep: 7,
};

/**
 * The phase figure again at each size, crisp: a pixel is the figure's when at least `cover` of his
 * pixels in it are (the mask the edit found), and the figure's pixels next to one that is not (4-
 * neighbours) are its rim, drawn in his reference's whitest where it faces up or left and the next
 * step elsewhere; the pixels just outside take the glow's blue at `glow`. The reduction alone
 * spread his one-pixel rim into the ground and the figures went soft.
 */
function phaseArt(id: string, s: PhaseSpec, at: Record<number, { cover: number; rim: number }>): (pt: Paint, ctx: Ctx) => void {
  return (pt: Paint, ctx: Ctx): void => {
    const m = PHASE_MASK.get(id);
    if (!m) return;
    const N = pt.N, W = ctx.W, o = at[N];
    const hit = new Float32Array(N * N), all = new Float32Array(N * N), smear = new Float32Array(N * N);
    const figSum = new Float32Array(N * N * 3), restSum = new Float32Array(N * N * 3);
    const eye = new Uint8Array(N * N);
    for (let y = 0; y < W.h; y++)
      for (let x = 0; x < W.w; x++) {
        const [u, v] = ctx.map(x + 0.5, y + 0.5);
        const cx = Math.min(N - 1, Math.floor(u)), cy = Math.min(N - 1, Math.floor(v));
        if (cx < 0 || cy < 0) continue;
        const i = y * W.w + x, c = cy * N + cx, k = m[i];
        all[c]++;
        const isFig = k === PH_BODY || k === PH_SKIN || k === PH_EYE || k === PH_GAP;
        if (isFig) hit[c]++;
        if (k === PH_SMEAR) smear[c]++;
        if (k === PH_EYE) eye[c] = 1;
        const sum = isFig ? figSum : restSum;
        for (let j = 0; j < 3; j++) sum[c * 3 + j] += W.d[i * 3 + j];
      }
    const fig = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < N && y < N && all[y * N + x] > 0 && hit[y * N + x] / all[y * N + x] >= o.cover;
    // His ground (not his after-image, into which the figure dissolves without a rim).
    const out = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < N && y < N && !fig(x, y) && smear[y * N + x] / all[y * N + x] < 0.3;
    const mean = (sum: Float32Array, c: number, k: number): string => toHex([0, 1, 2].map((j) => Math.round(sum[c * 3 + j] / k)).concat(255) as RGBA);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const c = y * N + x;
        if (fig(x, y)) {
          // The figure: his eyes dark; the rim where it faces his light; else the mean of the figure's own pixels here (not his ground's).
          if (eye[c]) pt.px(x, y, PHASE_RAMP[s.eyeStep]);
          else if (o.rim >= 0 && (out(x, y - 1) || out(x - 1, y))) pt.px(x, y, PHASE_RAMP[o.rim]);
          else pt.px(x, y, mean(figSum, c, hit[c]));
        } else if (hit[c] > 0 && all[c] > hit[c]) pt.px(x, y, mean(restSum, c, all[c] - hit[c]));
      }
  };
}

/** His window with the phase mask over it (for the debug sheets). */
function phaseMaskView(W: F, id: string): Img {
  const m = PHASE_MASK.get(id);
  const o = W.toImg();
  if (!m) return o;
  const cols = ['', '#ff00c8', '#ffd800', '#00ff60', '#ffffff', '#ff8000'];
  for (let i = 0; i < W.w * W.h; i++) if (m[i]) o.set(i % W.w, Math.floor(i / W.w), hex(cols[m[i]], 255));
  return o;
}

/** Sheets 8 to 11: the palette's coverage of his rare colours (see coverPalette). */
// A colour is lost when its nearest entry is 0.06 away (OKLab, hue and chroma counted twice, lightness
// 0.6: the k-means ramp has the lightness steps, what it misses is hues); a group needs the weight of six
// 88 pixels (a 44 pixel counts four); up to 20 entries. Each icon's entries are listed in its manifest
// (paletteCovered).
const COVER: Cover = { thr: 0.06, minMass: 6, add: 20, cw: 2, wl: 0.6 };

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
    // degrees clockwise (the owner: the other way from anticlockwise, which he saw first),
    // drawn at both sizes where his sits (his x 36-59, y 37-57), on his glow cream, in his gold
    // #fcf79a with his brown outline #926d46.
    art: (pt) => {
      const big = pt.N === 88;
      const [cx, cy] = big ? [46, 44] : [23, 22];
      const a = big ? 2 : 1; // half the arm's width (arms about 5 or 3 wide)
      const half = big ? 12 : 5; // half the plus's span (25 or 11)
      const tilt = (-12 * Math.PI) / 180;
      const [ux, uy] = [Math.cos(tilt), -Math.sin(tilt)]; // along the cross arm, falling to the right
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
  // Sheets 8 to 11 (2026-10-21): the clan abilities and the clan secrets. Sheets 8 and 11 have his
  // bigger windows: their 88 is reduced as their 44 is (see buildIcon). No bilateral smoothing here:
  // it lightened his dark figures into his ground (Premonition's ninja), and without it every one of
  // the fourteen came closer to his picture (ssim at 44 up by 0.01 to 0.02).
  {
    id: 'ryusei_swap',
    name: 'Swap',
    label: 'INTERCAMBIO',
    sheet: '8',
    edit: phaseEdit('ryusei_swap', SWAP_PHASE),
    art: phaseArt('ryusei_swap', SWAP_PHASE, { 44: { cover: 0.5, rim: 8 }, 88: { cover: 0.5, rim: 9 } }),
    editArt: "at each size the phase figures' rim drawn again crisp (the reduction spread his one-pixel rim into his ground): a pixel is the figure's when at least half of his pixels in it are, the figure's pixels next to his ground (not his after-image) are the rim, his reference's whitest (#e4ffff) where it faces up or left and #c4e3ff elsewhere, the pixels just outside 40% toward the glow's blue (#415fdc)",
    asked: PHASE_ASKED,
    inks: [{ hex: PHASE_RAMP, why: "his reference picture's blues, for his phase ninjas" }],
    cover: COVER,
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    marks: [
      { kind: 'bright', what: 'the light strands of his vortex and wind, the light lines of his phase ninjas', r: 1, thr: 0.08, minL: 0.75, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],
    bil44: [0, 0],
    mark88: 0.06,
  },
  {
    id: 'northstar_command',
    name: 'Command',
    label: 'COMANDO',
    sheet: '8',
    cover: COVER,
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    edit: commandEdit,
    editArt: "at each size his iris put back on his own bright red (#fe1020) where the reduction spread it over the neighbouring reds, then the compass rose drawn on it, centred on the iris: four long points (at 88 8.5 pixels long, at 44 4.5; the north one shorter, 8.5 and 3.5, so it ends under his lid's dark line) and four short ones between, each split into a lit facet (his crimson #dc112d) and a shaded one (his #a0001e and #6a0418), his pale pink #ffb4bc only as the thin stroke along the north and west points, his palest #ffc5c8 at the heart, his dark maroon #4c031e as the outline (not drawn over his darker lid line); at 44 also his lower-left sparkle's white core (#ffced2) with his pinks round it",
    preview: commandPreview,
    inks: [
      { hex: [...new Set(Object.values(STAR_INK))], why: "his Submission star's colours, for the compass rose" },
      { hex: [CMD_IRIS], why: "his iris's bright red, for the radiant iris round the rose" },
    ],
    art: commandArt,
    marks: [
      { kind: 'bright', what: 'his glowing ring, his flare and his embers', r: 1, thr: 0.08, minL: 0.7, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
      { kind: 'dark', what: 'the dark lines of his lids and lashes', r: 1, thr: 0.1, maxL: 0.2, minPx: 6, share: 0.3, mix: 0.6 },
    ],
    bil44: [0, 0],
    mark88: 0.06,
  },
  {
    id: 'northstar_submission',
    name: 'Submission',
    label: 'SUMISION',
    sheet: '8',
    cover: COVER,
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    qChroma: 1.6,
    // His star is crimson (#e80c28 lit, #a0001e shaded) with his pale pink only as thin strokes; his
    // violet chains (#8e3293) are a hue of their own. Neither had an entry: the star came out
    // raspberry and pale, the violet chains maroon.
    extra: [
      { box: [37, 3, 92, 45], lo: 0.5, hi: 0.95, spare: false, by: 'chroma', only: { hue: [20, 32], minL: 0.5, maxL: 0.62 }, why: "his star's crimson body" },
      { box: [37, 3, 92, 45], lo: 0.5, hi: 0.95, spare: false, by: 'chroma', only: { hue: [20, 32], minL: 0.5, maxL: 0.56 }, why: "his star's crimson, a step darker" },
      { box: [37, 3, 92, 45], lo: 0.5, hi: 0.95, spare: false, by: 'chroma', only: { hue: [18, 32], minL: 0.4, maxL: 0.5 }, why: "his star's shaded crimson" },
      { box: [79, 55, 121, 101], lo: 0.6, hi: 1, spare: false, by: 'chroma', only: { hue: [305, 336], minL: 0.35 }, why: 'his violet chains' },
    ],
    marks: [
      { kind: 'colour', what: 'his violet chains', r: 0, thr: 0, hue: [305, 336], minC: 0.12, minL: 0.35, minPx: 4, share: 0.15, mix: 0.7 },
      // Not on his star: kept in their own colour at 88 and 44 his thin pale strokes grew into pale facets.
      { kind: 'bright', what: 'the lit links of his chains and his embers (not his star)', r: 1, thr: 0.08, minL: 0.62, minPx: 3, speck: 0.15, share: 0.2, mix: 0.75, win: (x, y) => !(x >= 35 && x < 95 && y < 48) },
      { kind: 'dark', what: 'the dark links of his chains', r: 1, thr: 0.08, maxL: 0.25, minPx: 6, share: 0.3, mix: 0.6 },
    ],
    bil44: [0, 0],
    mark88: 0.06,
  },
  {
    id: 'mirai_evasion',
    name: 'Premonition',
    label: 'PREMONICION',
    sheet: '9',
    cover: COVER,
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    edit: miraiEdit,
    editArt: 'the pupil and the highlight drawn again at each size so they stay round and clean: at 88 a disc of radius 3.1 and a 2x2 highlight at its upper left; at 44 the iris redrawn in the same ramp, a 2x2 pupil and a one-pixel highlight at its upper left',
    inks: [{ hex: [...MIRAI_RAMP, MIRAI_PUPIL, MIRAI_SHINE], why: 'his reds, his darkest and his palest pink, for the radiant eye' }],
    art: miraiArt,
    marks: [
      // His embers are thin pale orange streaks (#ffdaa8): a 44 pixel holding a fifth of one is his ember.
      { kind: 'colour', what: 'his pale orange embers', r: 0, thr: 0, hue: [45, 85], minC: 0.04, minL: 0.75, minPx: 2, share: 0.2, mix: 1, pick: 'peak', keep: true },
      { kind: 'dark', what: 'the near-black outline of his ninja', r: 1, thr: 0.1, maxL: 0.16, minPx: 6, share: 0.25, mix: 0.55 },
      { kind: 'bright', what: 'his embers and the glowing edge of the ghost', r: 1, thr: 0.08, minL: 0.7, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],
    bil44: [0, 0],
    mark88: 0.06,
  },
  {
    id: 'koton_block',
    name: 'Koton Block',
    label: 'BLOQUE KOTON',
    sheet: '9',
    cover: COVER,
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    // Without it the lit corner of his cube took the dust's beige.
    extra: [{ box: [40, 36, 60, 47], lo: 0, hi: 0.4, spare: false, by: 'chroma', only: { minL: 0.74, maxL: 0.9 }, why: "his cube's light steel (the lit edges at its near corner)" }],
    marks: [
      // His golden sparks, and his cyan circuits only half: they are lines two of his pixels apart,
      // too close for 44 (kept whole they read as letters), but without them the faces go flat.
      { kind: 'bright', what: 'his golden sparks at the impact', r: 1, thr: 0.08, minL: 0.7, minC: 0.05, hue: [40, 110], minPx: 3, speck: 0.15, share: 0.35, mix: 0.8 },
      { kind: 'bright', what: 'his glowing cyan circuits, half toward the box mean', r: 1, thr: 0.08, minL: 0.72, minPx: 6, share: 0.4, mix: 0.45 },
      { kind: 'dark', what: 'the dark seams of his cube and the flying debris', r: 1, thr: 0.1, maxL: 0.2, minPx: 4, speck: 0.2, share: 0.3, mix: 0.6 },
    ],
    bil44: [0, 0],
    mark88: 0.06,
  },
  {
    id: 'koton_wall',
    name: 'Koton Wall',
    label: 'MURO KOTON',
    sheet: '9',
    cover: COVER,
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    marks: [
      { kind: 'dark', what: 'the dark joints between his steel blocks', r: 1, thr: 0.07, maxL: 0.3, minPx: 8, share: 0.35, mix: 0.7 },
      { kind: 'bright', what: 'his sparks and the lit block edges', r: 1, thr: 0.08, minL: 0.7, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],
    bil44: [0, 0],
    mark88: 0.06,
  },
  {
    id: 'ryusei_warp',
    name: 'Warp Strike',
    label: 'GOLPE WARP',
    sheet: '9',
    edit: phaseEdit('ryusei_warp', WARP_PHASE),
    art: phaseArt('ryusei_warp', WARP_PHASE, { 44: { cover: 0.5, rim: 8 }, 88: { cover: 0.5, rim: 9 } }),
    editArt: "at each size the phase figure's rim drawn again crisp (at 88 through his kept columns and rows, at 44 the reduction spread his one-pixel rim into his ground): a pixel is the figure's when at least half of his pixels in it are, the figure's pixels next to his ground are the rim, his reference's whitest (#e4ffff) where it faces up or left and #c4e3ff elsewhere, the pixels just outside 40% toward the glow's blue (#415fdc)",
    asked: PHASE_ASKED,
    inks: [{ hex: PHASE_RAMP, why: "his reference picture's blues, for his phase ninja" }],
    cover: COVER,
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    marks: [
      // The tan wrap of his kunai's grip (#c4a491, #a07f61; his pixels 22-40, 54-70): at 44 it went to
      // the palette's blue-grey.
      { kind: 'colour', what: "the tan wrap of his kunai's grip", r: 0, thr: 0, hue: [40, 85], minC: 0.03, minL: 0.4, minPx: 2, share: 0.35, mix: 0.7, keep: true, win: (x, y) => x >= 22 && x < 40 && y >= 54 && y < 70 },
      { kind: 'dark', what: 'the near-black outline of his kunai (his ninja is the phase figure now)', r: 1, thr: 0.1, maxL: 0.16, minPx: 6, share: 0.25, mix: 0.55 },
      { kind: 'bright', what: 'his portal rings, speed lines and stars', r: 1, thr: 0.08, minL: 0.72, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],
    bil44: [0, 0],
    mark88: 0.06,
  },
  {
    id: 'dragon_fire_bomb',
    name: 'Dragon Flame',
    label: 'LLAMA DRAGON',
    sheet: '10',
    cover: COVER,
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    // The yellow-white cores of his heads' mouths (#fbe832, #ffed3c): at 44 a pixel each, which the
    // palette's orange and the clean-up took; his dark jaw lines round them a little stronger.
    extra: [{ box: [15, 54, 26, 64], lo: 0.6, hi: 1, spare: false, by: 'L', only: { hue: [95, 112] }, why: "the yellow core of his left head's mouth" }],
    marks: [
      { kind: 'colour', what: "the yellow cores of his heads' mouths", r: 0, thr: 0, hue: [95, 112], minC: 0.12, minL: 0.88, minPx: 2, share: 0.2, mix: 1, pick: 'peak', keep: true },
      { kind: 'dark', what: 'the dark outlines of his three dragon heads', r: 1, thr: 0.1, maxL: 0.25, minPx: 6, share: 0.25, mix: 0.6 },
      { kind: 'bright', what: 'his fire in the mouths, the teeth and the embers', r: 1, thr: 0.08, minL: 0.8, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],
    bil44: [0, 0],
    mark88: 0.06,
  },
  {
    id: 'wood_dragon_jutsu',
    name: 'Wood Dragon',
    label: 'DRAGON MADERA',
    sheet: '10',
    cover: COVER,
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    marks: [
      { kind: 'dark', what: 'the dark grooves of his twisted wood', r: 1, thr: 0.08, maxL: 0.25, minPx: 6, share: 0.3, mix: 0.6 },
      { kind: 'bright', what: 'his green eye, the light leaves and the lit bark', r: 1, thr: 0.08, minL: 0.65, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],
    bil44: [0, 0],
    mark88: 0.06,
  },
  {
    id: 'adamantine_sealing_chains',
    name: 'Chains',
    label: 'CADENAS',
    sheet: '10',
    cover: COVER,
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    marks: [
      { kind: 'bright', what: 'his gold links, runes, spear tips and sparkles', r: 1, thr: 0.08, minL: 0.7, minPx: 3, speck: 0.15, share: 0.35, mix: 0.8 },
      { kind: 'dark', what: 'the dark gaps inside his chain links', r: 1, thr: 0.1, maxL: 0.3, minPx: 4, share: 0.3, mix: 0.6 },
    ],
    bil44: [0, 0],
    mark88: 0.06,
  },
  {
    id: 'taki_sixtyfour_palms',
    name: '64 Palms',
    label: '64 PALMAS',
    sheet: '10',
    cover: COVER,
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    marks: [
      { kind: 'dark', what: 'the near-black outlines of his ninja and the palms', r: 1, thr: 0.1, maxL: 0.16, minPx: 6, share: 0.25, mix: 0.55 },
      { kind: 'bright', what: 'his glowing trigram circle and the light swirl', r: 1, thr: 0.08, minL: 0.75, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],
    bil44: [0, 0],
    mark88: 0.06,
  },
  {
    id: 'shadow_clone',
    name: 'Shadow Clone',
    label: 'CLON SOMBRA',
    sheet: '11',
    cover: COVER,
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    extra: [{ box: [20, 30, 115, 65], lo: 0.5, hi: 0.9, spare: false, by: 'L', only: { hue: [25, 75], minL: 0.55 }, why: "the skin of his ninjas' hands making the sign" }],
    marks: [
      { kind: 'colour', what: "the skin of his ninjas' hands making the sign", r: 0, thr: 0, hue: [25, 75], minC: 0.04, minL: 0.45, minPx: 2, share: 0.25, mix: 0.6, win: (x, y) => y >= 30 && y < 62 && ((x >= 15 && x < 45) || (x >= 95 && x < 125)) },
      { kind: 'dark', what: 'the near-black outlines of his ninja and the clone', r: 1, thr: 0.1, maxL: 0.16, minPx: 6, share: 0.25, mix: 0.55 },
      { kind: 'bright', what: 'his stars and the light edges of the smoke', r: 1, thr: 0.08, minL: 0.75, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],
    bil44: [0, 0],
    mark88: 0.06,
  },
  {
    id: 'dragon_fire_stream',
    name: 'Dragon Fire',
    label: 'FUEGO DRAGON',
    sheet: '11',
    cover: COVER,
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    marks: [
      // His teeth: pale yellow (#fffa94) in his dark mouth; at 44 his box makes them tan (#d4974d), where
      // the dark rule darkened them and the palette took them to flame orange. In the jaws (his pixels
      // 95-127, 38-66) a 44 pixel with a fifth of it tooth keeps his box colour and stays.
      { kind: 'colour', what: 'his teeth (his box colour kept)', r: 0, thr: 0, hue: [85, 112], minC: 0.08, minL: 0.85, minPx: 2, share: 0.2, mix: 0, keep: true, win: (x, y) => x >= 95 && y >= 38 && y < 66 },
      { kind: 'dark', what: 'the dark mouth, teeth gaps and outline of his dragon head', r: 1, thr: 0.1, maxL: 0.3, minPx: 6, share: 0.3, mix: 0.6 },
      { kind: 'bright', what: 'his teeth, eye and the brightest flame tongues', r: 1, thr: 0.08, minL: 0.85, minPx: 3, speck: 0.15, share: 0.35, mix: 0.75 },
    ],
    bil44: [0, 0],
    mark88: 0.06,
  },
  {
    id: 'water_dragon_suiryuudan',
    name: 'Water Dragon',
    label: 'DRAGON AGUA',
    sheet: '11',
    cover: COVER,
    colors: 22,
    flat: 0.5,
    chroma: 1.1,
    // His spray and foam are near-white specks on his navy: his box makes them muted grey-blue, which
    // the palette's saturated blues took (a blue halo where his spray is). Hue weighed more, and his
    // whitest foam kept white.
    qChroma: 1.6,
    marks: [
      { kind: 'colour', what: 'his whitest foam and spray', r: 0, thr: 0, minL: 0.93, minPx: 2, share: 0.5, mix: 1, pick: 'peak' },
      { kind: 'bright', what: 'his white foam, spray and the light crests of the water', r: 1, thr: 0.08, minL: 0.8, minPx: 3, speck: 0.15, share: 0.35, mix: 0.8 },
      { kind: 'dark', what: 'the dark lines between his water bands', r: 1, thr: 0.07, maxL: 0.35, minPx: 6, share: 0.3, mix: 0.6 },
    ],
    bil44: [0, 0],
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
const SHEETS_BUILT = [...new Set(built.map((b) => b.spec.sheet))].sort((a, b) => +a - +b);
// The crop script's boxes (his window and, for sheets 8 and 11, the square part of it), for the manifest.
const CROPS: Record<string, { box: number[]; window?: number[] }> = existsSync(join(REF, 'crops.json')) ? JSON.parse(readFileSync(join(REF, 'crops.json'), 'utf8')).icons : {};
for (const b of built) {
  console.log(b.spec.id, b.pal.rgb.length, b.pal.rgb.map((c, i) => toHex(c) + (b.pal.spare[i] ? '*' : '')).join(' '));
  if (b.area88) console.log(`   88 is the area mean of his ${b.W.w}x${b.W.h} pixels`);
  else console.log('   88 drops columns', [...Array(b.W.w).keys()].filter((i) => !b.cols.includes(i)).join(','), 'rows', [...Array(b.W.h).keys()].filter((i) => !b.rows.includes(i)).join(','));
  if (b.edited) console.log('   edit:', b.edited);
  if (b.covered.length) console.log('   covered:', b.covered.map(toHex).join(' '));
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
    // His window as the owner's edit left it (his pixels, x4); for the phase ninjas also the mask they were found by (x6).
    if (b.edited) savePng(join(DEBUG, `${b.spec.id}-edited-x4.png`), editedWindow(b).toImg().scaled(4));
    if (PHASE_MASK.has(b.spec.id)) savePng(join(DEBUG, `${b.spec.id}-phasemask-x6.png`), phaseMaskView(F.of(loadRef(`${b.spec.id}.png`)), b.spec.id).scaled(6));
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
    'his sheets are pixel art (480x268 scaled 4.1667x and saved as JPEG); his pixels are taken back first (tools/refs/icons-from-ref-23.py). 88: his own pixels one to one (his 90x90 or 93x91 window with the columns and rows that show least dropped), on a palette sampled from his pixels, 1-2 pixel areas merged only where his own pixels do not stand out. 44: area mean of his pixels, except his thin lines and strongest specks, which keep their own colour one pixel wide; a light bilateral filter, nearest palette entry, 1-2 pixel areas merged; then hand-fixes only where that still loses his picture (see tools/ui/ui-icons-23.ts)' +
    (built.some((b) => +b.spec.sheet >= 8)
      ? ". Sheets 8 to 11 use no bilateral filter (it lightened his dark figures into his ground), and their palettes give his rare colours a slot each: after the k-means, every colour of the 44's and the 88's pictures still far from the palette in hue (his skin, his violet chains, a dragon's teeth, his greys and whites) is grouped and the group missed most gets its own entry, his nearest real colour, up to 20 (paletteCovered); his thin marks of one colour (skin, violet chains, embers, teeth, mouth cores, foam) are kept by colour rules"
      : '') +
    (built.some((b) => b.area88)
      ? '. Sheets 8 and 11 have bigger windows (127 to 139 of his pixels across, not square): the icon is the square part of his window (cropInWindow; Swap keeps 139x127 and is squeezed 9% across so his two ninjas stay whole), and its 88 is made as its 44 (area mean of his pixels with his thin lines and specks kept, palette, clean-up: method88)'
      : '') +
    (built.some((b) => b.edited) ? '. Edits the owner asked for are listed per icon under edits: made on his window first, then drawn again crisp at 88 and 44' : ''),
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
        ...(b.spec.label ? { label: b.spec.label } : {}),
        hisWindow: [b.W.w, b.W.h],
        ...(CROPS[b.spec.id]?.window
          ? { hisWholeWindow: [CROPS[b.spec.id].window![2] - CROPS[b.spec.id].window![0], CROPS[b.spec.id].window![3] - CROPS[b.spec.id].window![1]], cropInWindow: CROPS[b.spec.id].box.map((v, i) => v - CROPS[b.spec.id].window![i % 2]) }
          : {}),
        ...(b.area88
          ? { method88: `area mean of his ${b.W.w}x${b.W.h} pixels (too many to keep one to one), his thin lines and specks kept in their own colour, as the 44` }
          : { dropped88: { columns: [...Array(b.W.w).keys()].filter((i) => !b.cols.includes(i)), rows: [...Array(b.W.h).keys()].filter((i) => !b.rows.includes(i)) } }),
        ...(b.edited
          ? {
              edits: [
                {
                  by: 'the owner',
                  date: '2026-10-21',
                  asked: b.spec.asked?.text ?? 'Comando ponlo con un ojo con una brujula de los signos cardinales asi como en la imagen de sumision quita el sharingan y el de premonicion pon solo un ojo rojo radiante sin simbolo para evitar el copyright de naruto',
                  why: b.spec.asked?.why ?? "to keep clear of Naruto's eyes (copyright)",
                  onHisWindow: b.edited,
                  atEachSize: b.spec.editArt ?? '',
                  colours: (b.spec.inks ?? []).map((k) => `${k.why}: ${k.hex.join(' ')}`),
                },
              ],
            }
          : {}),
        palette: b.pal.rgb.map(toHex),
        paletteDetailOnly: b.pal.rgb.filter((_, i) => b.pal.spare[i]).map(toHex),
        ...(b.spec.cover ? { paletteCovered: b.covered.map(toHex) } : {}),
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
