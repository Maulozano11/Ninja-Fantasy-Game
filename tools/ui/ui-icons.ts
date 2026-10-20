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
// our four icons in our frame in a row like his picture).

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Img, RGBA, hex, loadPng, savePng, toHex, writeAtomic } from './ui-img';

if (!process.env.UI_OUT) {
  console.error('ui-icons: set UI_OUT to the staging folder (nothing is written to src/ by this tool).');
  process.exit(2);
}
const OUT: string = process.env.UI_OUT;
const REF = join(OUT, 'ref');

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

// --- float images -------------------------------------------------------------------------------

/** An RGB image in floats (sRGB values 0..255), for resampling before the palette is applied. */
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
  toImg(): Img {
    const o = new Img(this.w, this.h);
    for (let i = 0; i < this.w * this.h; i++) {
      for (let k = 0; k < 3; k++) o.px[i * 4 + k] = Math.max(0, Math.min(255, Math.round(this.d[i * 3 + k])));
      o.px[i * 4 + 3] = 255;
    }
    return o;
  }
}

/** 3x3 median per channel: takes out the JPEG ringing without moving his edges. */
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

/** Area resampling: each target pixel is the coverage-weighted mean of the source pixels under it. */
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

/** Unsharp mask (3x3 blur): gives back the edge contrast the area mean takes away. */
function sharpen(src: F, amount: number): F {
  const o = new F(src.w, src.h);
  const K = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++)
      for (let k = 0; k < 3; k++) {
        let b = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) b += src.at(x + dx, y + dy, k) * K[n++];
        b /= 16;
        const v = src.at(x, y, k);
        o.d[(y * src.w + x) * 3 + k] = Math.max(0, Math.min(255, v + (v - b) * amount));
      }
  return o;
}

// --- palette ------------------------------------------------------------------------------------

interface Pal {
  rgb: RGBA[];
  lab: Lab[];
}

/**
 * k-means in OKLab, seeded on lightness quantiles (so every step of his ramps gets a seed), then
 * each centre is replaced by the nearest colour that really occurs in his (median-cleaned) crop,
 * so the palette is sampled from his picture. Sorted dark to light.
 */
function makePalette(samples: F, source: F, k: number, extra: RGBA[] = []): Pal {
  const n = samples.w * samples.h;
  const pts: Lab[] = [];
  for (let i = 0; i < n; i++) pts.push(oklab(samples.d[i * 3], samples.d[i * 3 + 1], samples.d[i * 3 + 2]));
  const order = pts.map((p, i) => [p[0], i] as [number, number]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cen: Lab[] = [];
  for (let j = 0; j < k; j++) cen.push([...pts[order[Math.floor(((j + 0.5) / k) * n)][1]]] as Lab);
  const asg = new Int32Array(n);
  for (let it = 0; it < 30; it++) {
    for (let i = 0; i < n; i++) {
      let best = 0, bd = Infinity;
      for (let j = 0; j < cen.length; j++) {
        const d = dist(pts[i], cen[j]);
        if (d < bd) (bd = d), (best = j);
      }
      asg[i] = best;
    }
    const sum = cen.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) {
      const s = sum[asg[i]];
      s[0] += pts[i][0];
      s[1] += pts[i][1];
      s[2] += pts[i][2];
      s[3]++;
    }
    cen = cen.map((c, j) => (sum[j][3] ? ([sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]] as Lab) : c));
  }
  // Snap each centre to his nearest real colour.
  const srcLab: Lab[] = [];
  const srcRgb: RGBA[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < source.w * source.h; i++) {
    const r = Math.round(source.d[i * 3]), g = Math.round(source.d[i * 3 + 1]), b = Math.round(source.d[i * 3 + 2]);
    const key = (r << 16) | (g << 8) | b;
    if (seen.has(key)) continue;
    seen.add(key);
    srcRgb.push([r, g, b, 255]);
    srcLab.push(oklab(r, g, b));
  }
  const rgb: RGBA[] = [];
  for (const c of cen) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < srcLab.length; i++) {
      const d = dist(c, srcLab[i]);
      if (d < bd) (bd = d), (best = i);
    }
    rgb.push(srcRgb[best]);
  }
  for (const e of extra) rgb.push(e);
  const uniq: RGBA[] = [];
  for (const c of rgb) if (!uniq.some((u) => u[0] === c[0] && u[1] === c[1] && u[2] === c[2])) uniq.push(c);
  const lab = uniq.map((c) => oklab(c[0], c[1], c[2]));
  const idx = uniq.map((_, i) => i).sort((a, b) => lab[a][0] - lab[b][0] || a - b);
  return { rgb: idx.map((i) => uniq[i]), lab: idx.map((i) => lab[i]) };
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

function quantize(f: F, p: Pal): Ix {
  const q = new Ix(f.w, f.h);
  for (let i = 0; i < f.w * f.h; i++) {
    const c = oklab(f.d[i * 3], f.d[i * 3 + 1], f.d[i * 3 + 2]);
    let best = 0, bd = Infinity;
    for (let j = 0; j < p.lab.length; j++) {
      const d = dist(c, p.lab[j]);
      if (d < bd) (bd = d), (best = j);
    }
    q.d[i] = best;
  }
  return q;
}

const N8: [number, number][] = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
const N4: [number, number][] = [[0, -1], [-1, 0], [1, 0], [0, 1]];

/**
 * Clean-up after the palette: a pixel that none of its 8 neighbours share is JPEG or rounding noise
 * unless it stands out (a spark, an ember, a speck of foam); noise takes its neighbours' most
 * common colour. A pixel with at most one like neighbour that sits on a ragged band edge (five or
 * more neighbours of one other, close colour) is smoothed the same way.
 */
function clean(q: Ix, p: Pal, keepContrast: number, passes = 2): Ix {
  let cur = q;
  for (let pass = 0; pass < passes; pass++) {
    const nx = cur.clone();
    for (let y = 0; y < cur.h; y++)
      for (let x = 0; x < cur.w; x++) {
        const c = cur.get(x, y);
        const cnt = new Map<number, number>();
        let same = 0, tot = 0;
        for (const [dx, dy] of N8) {
          const v = cur.get(x + dx, y + dy);
          if (v < 0) continue;
          tot++;
          if (v === c) same++;
          else cnt.set(v, (cnt.get(v) ?? 0) + 1);
        }
        if (same > 1) continue;
        let mode = -1, mc = 0;
        for (const [v, n] of [...cnt.entries()].sort((a, b) => a[0] - b[0]))
          if (n > mc || (n === mc && dist(p.lab[v], p.lab[c]) < dist(p.lab[mode], p.lab[c]))) (mode = v), (mc = n);
        if (mode < 0) continue;
        const dl = p.lab[c][0] - p.lab[mode][0];
        if (same === 0) {
          // A lone pixel: keep it only when it is a bright speck on darker ground (or a dark
          // notch on light ground) by a clear margin.
          if (Math.abs(dl) < keepContrast) nx.set(x, y, mode);
        } else if (mc >= 5 && Math.abs(dl) < keepContrast * 0.75) nx.set(x, y, mode);
      }
    cur = nx;
  }
  return cur;
}

/** Connected areas of one colour (4-connected): the label of each pixel and each area's size. */
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
      for (const [dx, dy] of N4) {
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
 * Removes specks: every area of one colour no bigger than `minSize` pixels joins the colour it
 * borders most, unless it stands out from its surroundings by more than `keep` in lightness (a
 * spark, an ember, a fleck of foam, a dark notch his picture has on purpose).
 */
function despeckle(q: Ix, p: Pal, minSize: number, keep: number, rounds = 3): Ix {
  let cur = q;
  for (let r = 0; r < rounds; r++) {
    const { lab, size } = components(cur);
    const nx = cur.clone();
    let changed = 0;
    const border = new Map<number, Map<number, number>>();
    for (let y = 0; y < cur.h; y++)
      for (let x = 0; x < cur.w; x++) {
        const i = y * cur.w + x, id = lab[i];
        if (size[id] > minSize) continue;
        for (const [dx, dy] of N8) {
          const v = cur.get(x + dx, y + dy);
          if (v < 0 || v === cur.d[i]) continue;
          let m = border.get(id);
          if (!m) border.set(id, (m = new Map()));
          m.set(v, (m.get(v) ?? 0) + 1);
        }
      }
    const target = new Map<number, number>(), aroundL = new Map<number, number>();
    for (const [id, m] of border) {
      let best = -1, bc = 0, sumL = 0, tot = 0;
      for (const [v, n] of [...m.entries()].sort((a, b) => a[0] - b[0])) {
        sumL += p.lab[v][0] * n;
        tot += n;
        if (n > bc) (bc = n), (best = v);
      }
      target.set(id, best);
      aroundL.set(id, sumL / tot);
    }
    for (let i = 0; i < cur.w * cur.h; i++) {
      const id = lab[i];
      if (size[id] > minSize || !target.has(id)) continue;
      if (Math.abs(p.lab[cur.d[i]][0] - aroundL.get(id)!) >= keep) continue;
      nx.d[i] = target.get(id)!;
      changed++;
    }
    cur = nx;
    if (!changed) break;
  }
  return cur;
}

/**
 * Downsampling that never mixes colours: his (median-cleaned) picture is put on the palette at
 * full size, and each target pixel takes the palette colour that covers most of its cell. A colour
 * that stands out from the cell's mean (a spark, a dark gap) counts extra by `boost`, so thin
 * strokes survive.
 */
function modeResize(srcQ: Ix, p: Pal, w: number, h: number, boost: number): Ix {
  const o = new Ix(w, h);
  const sx = srcQ.w / w, sy = srcQ.h / h;
  const cov = new Float64Array(p.lab.length);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      cov.fill(0);
      const x0 = x * sx, x1 = (x + 1) * sx, y0 = y * sy, y1 = (y + 1) * sy;
      let tot = 0, mL = 0;
      for (let yy = Math.floor(y0); yy < Math.ceil(y1); yy++)
        for (let xx = Math.floor(x0); xx < Math.ceil(x1); xx++) {
          const c = (Math.min(x1, xx + 1) - Math.max(x0, xx)) * (Math.min(y1, yy + 1) - Math.max(y0, yy));
          const v = srcQ.get(Math.min(srcQ.w - 1, xx), Math.min(srcQ.h - 1, yy));
          cov[v] += c;
          tot += c;
          mL += p.lab[v][0] * c;
        }
      mL /= tot;
      let best = 0, bs = -1;
      for (let j = 0; j < cov.length; j++) {
        if (!cov[j]) continue;
        const s = cov[j] * (1 + boost * Math.abs(p.lab[j][0] - mL) * 4);
        if (s > bs) (bs = s), (best = j);
      }
      o.set(x, y, best);
    }
  return o;
}

/**
 * Adds palette entries for colours the k-means left out (small but distinct: the orange sparks in
 * the lightning, the white-hot core): while some pixels sit far from every entry, the worst group
 * of them gets an entry of its own (his nearest real colour).
 */
function augment(p: Pal, f: F, source: F, maxAdd: number, far: number): Pal {
  let pal = p;
  for (let k = 0; k < maxAdd; k++) {
    const bad: Lab[] = [];
    for (let i = 0; i < f.w * f.h; i++) {
      const c = oklab(f.d[i * 3], f.d[i * 3 + 1], f.d[i * 3 + 2]);
      let bd = Infinity;
      for (const q of pal.lab) bd = Math.min(bd, dist(c, q));
      if (bd > far * far) bad.push(c);
    }
    if (bad.length < 6) break;
    const m: Lab = [0, 0, 0];
    for (const b of bad) for (let j = 0; j < 3; j++) m[j] += b[j] / bad.length;
    // His nearest real colour to the group's mean.
    let best: RGBA = [0, 0, 0, 255], bd = Infinity;
    for (let i = 0; i < source.w * source.h; i++) {
      const c = oklab(source.d[i * 3], source.d[i * 3 + 1], source.d[i * 3 + 2]);
      const d = dist(c, m);
      if (d < bd) (bd = d), (best = [Math.round(source.d[i * 3]), Math.round(source.d[i * 3 + 1]), Math.round(source.d[i * 3 + 2]), 255]);
    }
    const rgb = [...pal.rgb, best];
    const lab = rgb.map((c) => oklab(c[0], c[1], c[2]));
    const idx = rgb.map((_, i) => i).sort((a, b) => lab[a][0] - lab[b][0] || a - b);
    pal = { rgb: idx.map((i) => rgb[i]), lab: idx.map((i) => lab[i]) };
  }
  return pal;
}

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

/** Lightness (0..1, OKLab L) of every pixel. */
function lightness(f: F): Float32Array {
  const o = new Float32Array(f.w * f.h);
  for (let i = 0; i < f.w * f.h; i++) o[i] = oklab(f.d[i * 3], f.d[i * 3 + 1], f.d[i * 3 + 2])[0];
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
 * Thin strokes (his dark gaps between scales, teeth and flames, his bright bolts and sparks) are
 * narrower than one pixel of the small icon and would average away. Strokes found by a closing
 * (dark) or an opening (bright) of radius r are widened by t pixels of his picture, each pixel
 * taking the colour of the strongest stroke pixel near it, before the picture is reduced.
 */
function widenStrokes(src: F, r: number, t: number, thrDark: number, thrBright: number): F {
  const { w, h } = src;
  const L = lightness(src);
  const close = morph(morph(L, w, h, r, true), w, h, r, false);
  const open = morph(morph(L, w, h, r, false), w, h, r, true);
  const out = new F(w, h, new Float32Array(src.d));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let best = -1, bs = 0;
      for (let dy = -t; dy <= t; dy++)
        for (let dx = -t; dx <= t; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          const dk = close[j] - L[j], br = L[j] - open[j];
          const s = Math.max(dk / thrDark, br / thrBright);
          if (s > 1 && s > bs) (bs = s), (best = j);
        }
      if (best >= 0) for (let k = 0; k < 3; k++) out.d[(y * w + x) * 3 + k] = src.d[best * 3 + k];
    }
  return out;
}

/**
 * Kuwahara filter: each pixel takes the mean of whichever of its four corner windows (radius r)
 * varies least, which flattens his brush texture into clean areas while keeping the edges sharp.
 */
function kuwahara(src: F, r: number): F {
  const { w, h } = src;
  const L = lightness(src);
  // Summed-area tables of L, L^2 and the three channels.
  const W = w + 1;
  const sat = (fn: (i: number) => number): Float64Array => {
    const t = new Float64Array(W * (h + 1));
    for (let y = 0; y < h; y++) {
      let row = 0;
      for (let x = 0; x < w; x++) {
        row += fn(y * w + x);
        t[(y + 1) * W + x + 1] = t[y * W + x + 1] + row;
      }
    }
    return t;
  };
  const tl = sat((i) => L[i]), tl2 = sat((i) => L[i] * L[i]);
  const tc = [0, 1, 2].map((k) => sat((i) => src.d[i * 3 + k]));
  const box = (t: Float64Array, x0: number, y0: number, x1: number, y1: number): number => t[y1 * W + x1] - t[y0 * W + x1] - t[y1 * W + x0] + t[y0 * W + x0];
  const out = new F(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let bv = Infinity, bx0 = 0, by0 = 0, bx1 = 0, by1 = 0;
      for (const [qx, qy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const x0 = Math.max(0, qx < 0 ? x - r : x), x1 = Math.min(w, (qx < 0 ? x : x + r) + 1);
        const y0 = Math.max(0, qy < 0 ? y - r : y), y1 = Math.min(h, (qy < 0 ? y : y + r) + 1);
        const n = (x1 - x0) * (y1 - y0);
        const m = box(tl, x0, y0, x1, y1) / n;
        const v = box(tl2, x0, y0, x1, y1) / n - m * m;
        if (v < bv - 1e-12) (bv = v), (bx0 = x0), (by0 = y0), (bx1 = x1), (by1 = y1);
      }
      const n = (bx1 - bx0) * (by1 - by0);
      for (let k = 0; k < 3; k++) out.d[(y * w + x) * 3 + k] = box(tc[k], bx0, by0, bx1, by1) / n;
    }
  return out;
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

// --- specks: sparks, embers, foam flecks, bolts ------------------------------------------------

interface Speck {
  /** Pixels of his picture (indices) that belong to it. */
  px: number[];
  cx: number;
  cy: number;
  /** His colour: the mean of its most extreme third (brightest for a spark, darkest for an ember). */
  color: RGBA;
  bright: boolean;
  /** Length along its main axis and across it (his pixels), and the axis angle. */
  long: number;
  across: number;
  angle: number;
  /** Lightness of the ground under it (the opening or closing his picture would have there). */
  bg: number;
  /** Its own lightness at its most extreme third. */
  peak: number;
}

/**
 * Finds his small marks on the ground around them: bright ones (top-hat over an opening of radius
 * r) and dark ones (black-hat). A mark is a connected group of at least `minPx` of his pixels whose
 * contrast passes `thr`, no wider across than `maxAcross`.
 */
function findSpecks(src: F, r: number, thr: number, minPx: number, maxPx: number, maxAcross: number, which: 'bright' | 'dark' | 'both'): Speck[] {
  const { w, h } = src;
  const L = lightness(src);
  const out: Speck[] = [];
  for (const bright of [true, false]) {
    if ((bright && which === 'dark') || (!bright && which === 'bright')) continue;
    const ref = bright ? morph(morph(L, w, h, r, false), w, h, r, true) : morph(morph(L, w, h, r, true), w, h, r, false);
    const m = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) m[i] = (bright ? L[i] - ref[i] : ref[i] - L[i]) > thr ? 1 : 0;
    const seen = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      if (!m[i] || seen[i]) continue;
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
          if (m[k] && !seen[k]) {
            seen[k] = 1;
            st.push(k);
          }
        }
      }
      if (comp.length < minPx || comp.length > maxPx) continue;
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
      sxx /= comp.length;
      sxy /= comp.length;
      syy /= comp.length;
      const tr = sxx + syy, det = sxx * syy - sxy * sxy;
      const l1 = tr / 2 + Math.sqrt(Math.max(0, (tr * tr) / 4 - det)), l2 = tr / 2 - Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
      const long = Math.sqrt(12 * l1), across = Math.sqrt(12 * Math.max(0, l2));
      if (across > maxAcross) continue;
      const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
      const sorted = [...comp].sort((a, b) => (bright ? L[b] - L[a] : L[a] - L[b]) || a - b);
      const top = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 3)));
      const c = [0, 0, 0];
      for (const j of top) for (let k = 0; k < 3; k++) c[k] += src.d[j * 3 + k] / top.length;
      let bg = 0, peak = 0;
      for (const j of comp) bg += ref[j] / comp.length;
      for (const j of top) peak += L[j] / top.length;
      out.push({ px: comp, cx, cy, color: [Math.round(c[0]), Math.round(c[1]), Math.round(c[2]), 255], bright, long, across, angle, bg, peak });
    }
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

// --- the icons ----------------------------------------------------------------------------------

interface IconSpec {
  id: string;
  name: string;
  colors: number;
}
const ICONS: IconSpec[] = [
  { id: 'fireball_goukakyu', name: 'Fireball', colors: 14 },
  { id: 'kirin_thunder', name: 'Kirin', colors: 14 },
  { id: 'great_fire_annihilation', name: 'Great Fire Annihilation', colors: 14 },
  { id: 'water_shield_suijinheki', name: 'Water Wall', colors: 14 },
];

function loadHis(id: string): Img {
  const path = join(REF, `${id}.png`);
  if (!existsSync(path)) throw new Error(`ui-icons: missing ${path} (run tools/refs/icons-from-ref.py first)`);
  return loadPng(path);
}

if (process.env.UI_SPECKS) {
  for (const spec of ICONS) {
    const his = prep(loadHis(spec.id));
    const src = median3(F.of(his));
    const sp = findSpecks(src, 4, 0.1, 4, 400, 7, 'both').filter((s) => (s.bright ? s.bg < 0.42 : s.bg > 0.3 && s.peak < 0.3));
    const o = F.of(his).toImg().scaled(3);
    for (const s of sp)
      for (const j of s.px) {
        const x = j % src.w, y = (j - x) / src.w;
        o.rect(x * 3, y * 3, 3, 3, s.bright ? [255, 0, 255, 160] : [0, 255, 0, 160]);
      }
    savePng(join(process.env.UI_SPECKS, `specks-${spec.id}.png`), o);
    console.log(spec.id, sp.length, sp.filter((s) => s.bright).length);
  }
  process.exit(0);
}
if (process.env.UI_EXPERIMENT) {
  const rows: Img[][] = [];
  for (const spec of ICONS) {
    const his = prep(loadHis(spec.id));
    const src = median3(F.of(his));
    const m88 = areaResize(src, 88, 88);
    let pal = makePalette(m88, src, spec.colors);
    pal = augment(pal, m88, src, 3, 0.09);
    const srcQ = quantize(src, pal);
    const v: Img[] = [];
    v.push(F.of(his).toImg().resized(88, 88).scaled(4));
    const a88 = despeckle(quantize(sharpen(m88, 0.5), pal), pal, 2, 0.18);
    const b88 = despeckle(modeResize(srcQ, pal, 88, 88, 1), pal, 2, 0.18);
    v.push(a88.toImg(pal).scaled(4), b88.toImg(pal).scaled(4));
    const m44 = areaResize(src, 44, 44);
    v.push(despeckle(quantize(sharpen(m44, 0.6), pal), pal, 1, 0.18).toImg(pal).scaled(8));
    v.push(despeckle(modeResize(srcQ, pal, 44, 44, 0), pal, 1, 0.18).toImg(pal).scaled(8));
    for (const [sg, ln] of [[2, 4], [3, 6], [3, 9]]) {
      const fs = flowSmooth(src, sg, ln);
      v.push(despeckle(quantize(areaResize(fs, 44, 44), pal), pal, 2, 0.2).toImg(pal).scaled(8));
    }
    v.push(despeckle(quantize(areaResize(flowSmooth(src, 2, 3), 88, 88), pal), pal, 2, 0.2).toImg(pal).scaled(4));
    rows.push(v);
    console.log(spec.id, pal.rgb.length, pal.rgb.map(toHex).join(' '));
  }
  for (let r = 0; r < rows.length; r++) {
    const v = rows[r];
    const o = new Img(v.length * 360, 356);
    o.fill(hex('#15171d'));
    v.forEach((im, i) => o.draw(im, i * 360, 2));
    savePng(join(process.env.UI_EXPERIMENT, `exp-${ICONS[r].id}.png`), o);
  }
  process.exit(0);
}
