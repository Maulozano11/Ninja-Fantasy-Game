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
import { screenText } from './ui-font';

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

/** Lanczos-3 resampling (the kernel widened by the reduction factor), separable, clamped edges. */
function lanczosResize(src: F, w: number, h: number): F {
  const pass = (inp: F, ow: number, oh: number, horiz: boolean): F => {
    const o = new F(ow, oh);
    const n = horiz ? inp.w : inp.h, m = horiz ? ow : oh;
    const scale = n / m, sup = 3 * Math.max(1, scale);
    const sinc = (x: number) => (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));
    for (let j = 0; j < m; j++) {
      const c = (j + 0.5) * scale - 0.5;
      const i0 = Math.ceil(c - sup), i1 = Math.floor(c + sup);
      const ws: number[] = [];
      let wsum = 0;
      for (let i = i0; i <= i1; i++) {
        const t = (i - c) / Math.max(1, scale);
        const wv = Math.abs(t) < 3 ? sinc(t) * sinc(t / 3) : 0;
        ws.push(wv);
        wsum += wv;
      }
      const other = horiz ? oh : ow;
      for (let a = 0; a < other; a++)
        for (let k = 0; k < 3; k++) {
          let acc = 0;
          for (let i = i0; i <= i1; i++) acc += ws[i - i0] * (horiz ? inp.at(i, a, k) : inp.at(a, i, k));
          const v = acc / wsum;
          const idx = horiz ? (a * ow + j) * 3 + k : (j * ow + a) * 3 + k;
          o.d[idx] = Math.max(0, Math.min(255, v));
        }
    }
    return o;
  };
  return pass(pass(src, w, src.h, true), w, h, false);
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
  /** Entries kept for his specks only (the base picture is never put on them). */
  spare: boolean[];
}

/**
 * k-means in OKLab, then each centre is replaced by the nearest colour that really occurs in his
 * (median-cleaned) crop, so the palette is sampled from his picture. Sorted dark to light.
 * Every pixel is weighted by how rare its lightness is (`flat` 0..1), so a big dark background
 * does not take most of the entries from the bright subject's ramp; the seeds are spread evenly
 * in lightness for the same reason.
 */
function makePalette(samples: F, source: F, k: number, flat = 0.6, chroma = 1, vivid = 1.15, extra: RGBA[] = []): Pal {
  const kd = (p: Lab, q: Lab): number => {
    const dl = (p[0] - q[0]) * 1.4, da = (p[1] - q[1]) * chroma, db = (p[2] - q[2]) * chroma;
    return dl * dl + da * da + db * db;
  };
  const n = samples.w * samples.h;
  const pts: Lab[] = [];
  for (let i = 0; i < n; i++) pts.push(oklab(samples.d[i * 3], samples.d[i * 3 + 1], samples.d[i * 3 + 2]));
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
  for (const c0 of cen) {
    // The mean of a cluster is greyer than the colours in it (and his JPEG greys them a little
    // more), so the snap aims at a slightly richer colour along the same hue.
    const c: Lab = [c0[0], c0[1] * vivid, c0[2] * vivid];
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
  return { rgb: idx.map((i) => uniq[i]), lab: idx.map((i) => lab[i]), spare: idx.map(() => false) };
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
      if (p.spare[j]) continue;
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
 * the lightning): while at least `minCount` pixels sit farther than `far` from every entry, the
 * densest group of them (pixels within `far` of one another's centre) gets an entry of its own,
 * his nearest real colour to the group's mean.
 */
function augment(p: Pal, f: F, source: F, maxAdd: number, far: number, minCount = 6): Pal {
  let pal = p;
  const all: Lab[] = [];
  for (let i = 0; i < f.w * f.h; i++) all.push(oklab(f.d[i * 3], f.d[i * 3 + 1], f.d[i * 3 + 2]));
  for (let k = 0; k < maxAdd; k++) {
    const bad = all.filter((c) => Math.min(...pal.lab.map((q) => dist(c, q))) > far * far);
    if (bad.length < minCount) break;
    let best = -1, bc = 0;
    bad.forEach((c, i) => {
      let n = 0;
      for (const d of bad) if (dist(c, d) < far * far) n++;
      if (n > bc) (bc = n), (best = i);
    });
    if (bc < minCount) break;
    const grp = bad.filter((d) => dist(bad[best], d) < far * far);
    const m: Lab = [0, 0, 0];
    for (const g of grp) for (let j = 0; j < 3; j++) m[j] += g[j] / grp.length;
    let pick: RGBA = [0, 0, 0, 255], bd = Infinity;
    for (let i = 0; i < source.w * source.h; i++) {
      const c = oklab(source.d[i * 3], source.d[i * 3 + 1], source.d[i * 3 + 2]);
      const d = dist(c, m);
      if (d < bd) (bd = d), (pick = [Math.round(source.d[i * 3]), Math.round(source.d[i * 3 + 1]), Math.round(source.d[i * 3 + 2]), 255]);
    }
    if (pal.rgb.some((c) => c[0] === pick[0] && c[1] === pick[1] && c[2] === pick[2])) break;
    const rgb = [...pal.rgb, pick];
    const spare = [...pal.spare, true];
    const lab = rgb.map((c) => oklab(c[0], c[1], c[2]));
    const idx = rgb.map((_, i) => i).sort((a, b) => lab[a][0] - lab[b][0] || a - b);
    pal = { rgb: idx.map((i) => rgb[i]), lab: idx.map((i) => lab[i]), spare: idx.map((i) => spare[i]) };
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
  /** Area (his pixels) it needs to be kept in the 44 version. */
  min44?: number;
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

/** Warm marks in a cold picture (red above blue by `warm`): his orange sparks among the bolts. */
function findWarm(src: F, warm: number, minPx: number, maxPx: number): Speck[] {
  const { w, h } = src;
  const L = lightness(src);
  const m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) m[i] = src.d[i * 3] - src.d[i * 3 + 2] > warm ? 1 : 0;
  const out: Speck[] = [];
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
        if (m[k] && !seen[k]) (seen[k] = 1), st.push(k);
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
    const n = comp.length;
    (sxx /= n), (sxy /= n), (syy /= n);
    const tr = sxx + syy, det = sxx * syy - sxy * sxy;
    const l1 = tr / 2 + Math.sqrt(Math.max(0, (tr * tr) / 4 - det)), l2 = tr / 2 - Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
    const sorted = [...comp].sort((a, b) => src.d[b * 3] - src.d[b * 3 + 2] - (src.d[a * 3] - src.d[a * 3 + 2]) || a - b);
    const top = sorted.slice(0, Math.max(1, Math.ceil(n / 3)));
    const c = [0, 0, 0];
    for (const j of top) for (let k = 0; k < 3; k++) c[k] += src.d[j * 3 + k] / top.length;
    let peak = 0;
    for (const j of top) peak += L[j] / top.length;
    out.push({ px: comp, cx, cy, color: [Math.round(c[0]), Math.round(c[1]), Math.round(c[2]), 255], bright: true, long: Math.sqrt(12 * l1), across: Math.sqrt(12 * Math.max(0, l2)), angle: 0.5 * Math.atan2(2 * sxy, sxx - syy), bg: 0.3, peak });
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

/**
 * Unsharp mask with a Gaussian of `sigma` (his pixels): local contrast that survives the reduction.
 * Each value is kept inside the range of his pixels within `sigma` of it, so the edges get crisp
 * without dark or bright halos (which would turn into stray pixels).
 */
function usm(src: F, sigma: number, amount: number, clamp = true): F {
  const { w, h } = src;
  const out = new F(w, h);
  const r = Math.max(1, Math.round(sigma));
  for (let k = 0; k < 3; k++) {
    const ch = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) ch[i] = src.d[i * 3 + k];
    const b = gauss(ch, w, h, sigma);
    const lo = morph(ch, w, h, r, false), hi = morph(ch, w, h, r, true);
    for (let i = 0; i < w * h; i++) out.d[i * 3 + k] = clamp ? Math.max(lo[i], Math.min(hi[i], ch[i] + (ch[i] - b[i]) * amount)) : Math.max(0, Math.min(255, ch[i] + (ch[i] - b[i]) * amount));
  }
  return out;
}

/**
 * Reduction that keeps his own colours: each target pixel takes the one pixel of his inside its
 * cell that is nearest to the cell's mean (a medoid), so strokes keep their contrast instead of
 * being averaged with their neighbours.
 */
function medoidResize(src: F, w: number, h: number): F {
  const o = new F(w, h);
  const sx = src.w / w, sy = src.h / h;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const xs: number[] = [];
      for (let yy = Math.floor(y * sy); yy < Math.ceil((y + 1) * sy); yy++) for (let xx = Math.floor(x * sx); xx < Math.ceil((x + 1) * sx); xx++) xs.push(Math.min(src.h - 1, yy) * src.w + Math.min(src.w - 1, xx));
      const labs = xs.map((i) => oklab(src.d[i * 3], src.d[i * 3 + 1], src.d[i * 3 + 2]));
      const m: Lab = [0, 0, 0];
      for (const l of labs) for (let k = 0; k < 3; k++) m[k] += l[k] / labs.length;
      let bi = 0, bd = Infinity;
      labs.forEach((l, j) => {
        const d = dist(l, m);
        if (d < bd) (bd = d), (bi = j);
      });
      for (let k = 0; k < 3; k++) o.d[(y * w + x) * 3 + k] = src.d[xs[bi] * 3 + k];
    }
  return o;
}

/**
 * Halves an indexed picture. Each 2x2 block normally keeps the one of its four pixels nearest to
 * the block's mean (so the balance of light and dark stays his). When the block holds a stroke
 * that stands out from its surroundings by more than `strong` in lightness (a bright stroke, a
 * tooth, a bolt, or a dark gap), it keeps that stroke's pixel instead (toggle mapping: the lightest
 * if the block is lighter than its surroundings, the darkest if darker), so thin strokes of the
 * large version survive in the small one.
 */
function halve(q: Ix, p: Pal, strong: number): Ix {
  const w = q.w >> 1, h = q.h >> 1;
  const o = new Ix(w, h);
  const bl = new Float32Array(w * h);
  const block = (x: number, y: number) => [0, 1, 2, 3].map((k) => q.get(x * 2 + (k & 1), y * 2 + (k >> 1)));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) bl[y * w + x] = block(x, y).reduce((a, v) => a + p.lab[v][0] / 4, 0);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let n = 0, c = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h || (dx === 0 && dy === 0)) continue;
          n += bl[yy * w + xx];
          c++;
        }
      const around = n / c;
      const b = block(x, y);
      const lighter = bl[y * w + x] >= around;
      let ext = b[0];
      for (const v of b) if (lighter ? p.lab[v][0] > p.lab[ext][0] : p.lab[v][0] < p.lab[ext][0]) ext = v;
      if (Math.abs(p.lab[ext][0] - around) > strong && Math.abs(bl[y * w + x] - around) > strong * 0.35) {
        o.set(x, y, ext);
        continue;
      }
      const mean: Lab = [0, 0, 0];
      for (const v of b) for (let k = 0; k < 3; k++) mean[k] += p.lab[v][k] / 4;
      let best = b[0], bd = Infinity;
      for (const v of b) {
        const d = dist(p.lab[v], mean);
        if (d < bd - 1e-12) (bd = d), (best = v);
      }
      o.set(x, y, best);
    }
  return o;
}

// --- hand-placed details -----------------------------------------------------------------------

/**
 * A detail traced on his picture, in the coordinates of his crop (201x206 pixels, before the
 * 1-pixel trim), drawn after the reduction at either size. `color` is a colour of his; the nearest
 * palette entry is used.
 *  - line: a 1-pixel line through the points (pixel-perfect: no doubled corners).
 *  - dots: single pixels.
 *  - wedge: a tooth, from its base (first point) to its tip (second), `width` pixels wide at the
 *    base and one at the tip.
 * `sizes` limits it to the 44 or the 88 version.
 */
interface Feature {
  kind: 'line' | 'dots' | 'wedge';
  width?: number;
  color: string;
  pts: [number, number][];
  sizes?: number[];
}

function toTarget(N: number, x: number, y: number): [number, number] {
  return [((x - 1 + 0.5) * N) / 199 - 0.5, ((y - 1 + 0.5) * N) / 204 - 0.5];
}

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
  // Drop the inner pixel of every L-shaped corner.
  const clean: [number, number][] = [];
  for (let i = 0; i < out.length; i++) {
    const a = clean[clean.length - 1], b = out[i], c = out[i + 1];
    if (a && c && a[0] !== c[0] && a[1] !== c[1] && (a[0] === b[0] || a[1] === b[1]) && Math.abs(a[0] - c[0]) === 1 && Math.abs(a[1] - c[1]) === 1) continue;
    clean.push(b);
  }
  return clean;
}

function drawFeatures(q: Ix, p: Pal, fs: Feature[] | undefined): void {
  if (!fs) return;
  const N = q.w;
  for (const f of fs) {
    if (f.sizes && !f.sizes.includes(N)) continue;
    const c = hex(f.color);
    const lab = oklab(c[0], c[1], c[2]);
    let idx = 0, bd = Infinity;
    p.lab.forEach((l, i) => {
      const d = dist(l, lab);
      if (d < bd) (bd = d), (idx = i);
    });
    const pts = f.pts.map(([x, y]) => toTarget(N, x, y).map(Math.round) as [number, number]);
    if (f.kind === 'dots') for (const [x, y] of pts) q.set(x, y, idx);
    else if (f.kind === 'wedge') {
      const [b, t] = f.pts.map(([x, y]) => toTarget(N, x, y));
      const len = Math.hypot(t[0] - b[0], t[1] - b[1]);
      const ux = (t[0] - b[0]) / len, uy = (t[1] - b[1]) / len;
      const wb = f.width ?? 2;
      for (let y = Math.floor(Math.min(b[1], t[1])) - 2; y <= Math.ceil(Math.max(b[1], t[1])) + 2; y++)
        for (let x = Math.floor(Math.min(b[0], t[0])) - 2; x <= Math.ceil(Math.max(b[0], t[0])) + 2; x++) {
          const vx = x - b[0], vy = y - b[1];
          const along = vx * ux + vy * uy, across = Math.abs(-vx * uy + vy * ux);
          if (along < -0.25 || along > len + 0.25) continue;
          const half = (wb + (1 - wb) * (along / len)) / 2;
          if (across <= half) q.set(x, y, idx);
        }
    } else
      for (let i = 0; i + 1 < pts.length; i++) {
        const seg = linePixels(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
        for (const [x, y] of seg) q.set(x, y, idx);
      }
  }
}

// His Kirin: the dragon's open jaws, teeth, eye and head outline, traced on his picture. At 44 the
// reduction alone leaves the head unreadable (his picture is full of fine strokes), so these are
// drawn over it; at 88 his own pixels show them and only the eye and the gum lines are restated.
const NAVY = '#1a2453', INK = '#161638', TOOTH = '#d8feff', PALE = '#a1f5fa';
const KIRIN: Feature[] = [
  // Outline of the snout, the horn on the nose and the upper jaw tip, just outside his edge.
  { kind: 'line', color: NAVY, pts: [[142, 66], [158, 70], [164, 70], [167, 58], [172, 60], [179, 72], [184, 84], [186, 96], [183, 105], [178, 111]], sizes: [44] },
  // Upper gum line (dark) and the teeth hanging from it.
  { kind: 'line', color: INK, pts: [[104, 99], [124, 95], [140, 97], [160, 101], [176, 104]] },
  { kind: 'dots', color: TOOTH, pts: [[124, 100], [133, 101], [142, 104], [151, 106], [160, 107], [169, 108]], sizes: [44] },
  ...([[[125, 97], [125, 105]], [[130, 97], [131, 106]], [[137, 98], [137, 107]], [[144, 99], [144, 108]], [[152, 101], [152, 109]], [[159, 102], [160, 109]], [[166, 103], [166, 109]], [[172, 104], [172, 109]]] as [number, number][][]).map(
    (pts): Feature => ({ kind: 'wedge', color: TOOTH, pts, width: 2, sizes: [88] }),
  ),
  ...([[[134, 133], [139, 128]], [[135, 140], [140, 135]], [[137, 147], [142, 142]], [[140, 152], [145, 147]], [[143, 158], [147, 153]]] as [number, number][][]).map(
    (pts): Feature => ({ kind: 'wedge', color: TOOTH, pts, width: 2, sizes: [88] }),
  ),
  { kind: 'dots', color: TOOTH, pts: [[124, 104], [142, 108], [160, 111]], sizes: [44] },
  // The dark gaps between them, so the row reads as teeth at 44.
  { kind: 'dots', color: INK, pts: [[128, 100], [137, 102], [146, 104], [155, 106], [164, 107]], sizes: [44] },
  // Lower gum line and the teeth standing on it.
  { kind: 'line', color: INK, pts: [[106, 118], [114, 132], [122, 146], [132, 158], [144, 164]], sizes: [44] },
  { kind: 'dots', color: TOOTH, pts: [[114, 126], [122, 138], [130, 148], [139, 156]], sizes: [44] },
  { kind: 'dots', color: INK, pts: [[118, 132], [126, 143], [134, 152]], sizes: [44] },
  // The eye: his dark slit with the lit brow ridge above it.
  { kind: 'line', color: INK, pts: [[156, 85], [161, 86], [166, 90]] },
  { kind: 'line', color: PALE, pts: [[152, 80], [160, 81], [166, 85]], sizes: [44] },
];

// --- the icons ----------------------------------------------------------------------------------

interface SpeckRule {
  bright: boolean;
  /** Found by warmth instead (red minus blue above this): the orange sparks in the lightning. */
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
  /** Area (his pixels) a speck needs to be kept at 44. */
  min44: number;
}

interface IconSpec {
  id: string;
  name: string;
  colors: number;
  specks: SpeckRule[];
  /** Weight of hue against lightness when the palette is chosen (1 = as lightness). */
  chroma: number;
  /** How much richer than the cluster means the palette snaps (1 = none). */
  vivid: number;
  /** Smoothing along his strokes before the small version is made: [sigma, length], length 0 = none. */
  flow44: [number, number];
  /** Hand-placed details drawn over the reduction (see Feature). */
  features?: Feature[];
  /** Lightness step that makes a stroke worth keeping when the 88 version is halved (see halve). */
  strong44: number;
  /** Colours of the 44 version (a smaller palette, also sampled from his picture), 0 = the same. */
  colors44: number;
  /** Unsharp mask before each reduction: [sigma in his pixels, amount]; the small one is not clamped. */
  usm44: [number, number];
  usm88: [number, number];
}

const ICONS: IconSpec[] = [
  {
    id: 'fireball_goukakyu',
    name: 'Fireball',
    colors: 14,
    specks: [{ bright: true, r: 4, thr: 0.1, bgMax: 0.42, minPx: 4, maxPx: 400, maxLong: 30, maxAcross: 7, min44: 8 }],
    chroma: 1,
    vivid: 1,
    colors44: 0,
    strong44: 0.12,
    flow44: [2, 0],
    usm44: [3, 1.2],
    usm88: [2, 1],
  },
  {
    id: 'kirin_thunder',
    name: 'Kirin',
    colors: 14,
    specks: [{ bright: true, warm: 14, r: 0, thr: 0, minPx: 3, maxPx: 300, maxLong: 40, maxAcross: 12, min44: 3 }],
    chroma: 1,
    vivid: 1,
    colors44: 0,
    strong44: 0.12,
    flow44: [2, 4],
    features: KIRIN,
    usm44: [3, 2],
    usm88: [2, 1],
  },
  {
    id: 'great_fire_annihilation',
    name: 'Great Fire Annihilation',
    colors: 14,
    specks: [
      { bright: true, r: 4, thr: 0.1, bgMax: 0.42, minPx: 4, maxPx: 400, maxLong: 30, maxAcross: 7, min44: 8 },
      { bright: false, r: 4, thr: 0.1, bgMin: 0.28, peakMax: 0.27, minPx: 4, maxPx: 200, maxLong: 16, maxAcross: 6, min44: 8 },
    ],
    chroma: 1,
    vivid: 1,
    colors44: 0,
    strong44: 0.12,
    flow44: [2, 0],
    usm44: [3, 1.2],
    usm88: [2, 1],
  },
  {
    id: 'water_shield_suijinheki',
    name: 'Water Wall',
    colors: 15,
    specks: [{ bright: true, r: 4, thr: 0.1, bgMax: 0.42, minPx: 4, maxPx: 400, maxLong: 30, maxAcross: 7, min44: 6 }],
    chroma: 2.2,
    vivid: 1.15,
    colors44: 0,
    strong44: 0.12,
    flow44: [2, 0],
    usm44: [3, 1.2],
    usm88: [2, 1],
  },
];

function loadHis(id: string): Img {
  const path = join(REF, `${id}.png`);
  if (!existsSync(path)) throw new Error(`ui-icons: missing ${path} (run tools/refs/icons-from-ref.py first)`);
  return loadPng(path);
}

function specksFor(src: F, rules: SpeckRule[]): Speck[] {
  const out: Speck[] = [];
  for (const r of rules) {
    const found = r.warm !== undefined ? findWarm(src, r.warm, r.minPx, r.maxPx) : findSpecks(src, r.r, r.thr, r.minPx, r.maxPx, r.maxAcross, r.bright ? 'bright' : 'dark');
    for (const s of found) {
      if (s.long > r.maxLong) continue;
      if (r.bgMax !== undefined && s.bg > r.bgMax) continue;
      if (r.bgMin !== undefined && s.bg < r.bgMin) continue;
      if (r.peakMax !== undefined && s.peak > r.peakMax) continue;
      out.push({ ...s, min44: r.min44 });
    }
  }
  return out;
}

/** Nearest palette entry to a colour, stepping along the ramp until it stands out from `bgL` by `minC`. */
function pickContrast(p: Pal, c: RGBA, bgL: number, minC: number): number {
  const lab = oklab(c[0], c[1], c[2]);
  const order = p.lab.map((q, i) => [dist(lab, q), i] as [number, number]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const [, i] of order) if (Math.abs(p.lab[i][0] - bgL) >= minC && Math.sign(p.lab[i][0] - bgL) === Math.sign(lab[0] - bgL)) return i;
  return order[0][1];
}

/** Puts each speck back as a clean mark: one pixel, or a short 1-pixel dash along its length. */
function stampSpecks(q: Ix, p: Pal, specks: Speck[], srcW: number, srcH: number): Set<number> {
  const N = q.w, sx = N / srcW, sy = q.h / srcH;
  const keep = new Set<number>();
  for (const s of [...specks].sort((a, b) => a.px.length - b.px.length || a.cx - b.cx)) {
    if (q.w < 88 && s.px.length < (s.min44 ?? 0)) continue;
    const cx = (s.cx + 0.5) * sx - 0.5, cy = (s.cy + 0.5) * sy - 0.5;
    const len = s.long * sx;
    const bgIdx = q.get(Math.round(cx), Math.round(cy));
    const bgL = bgIdx >= 0 ? p.lab[bgIdx][0] : 0;
    const c = pickContrast(p, s.color, bgL, 0.12);
    const n = Math.max(1, Math.round(len * 0.8));
    const ux = Math.cos(s.angle), uy = Math.sin(s.angle);
    for (let k = 0; k < n; k++) {
      const t = n === 1 ? 0 : k - (n - 1) / 2;
      const x = Math.round(cx + ux * t), y = Math.round(cy + uy * t);
      if (x < 0 || y < 0 || x >= q.w || y >= q.h) continue;
      q.set(x, y, c);
      keep.add(y * q.w + x);
    }
  }
  return keep;
}

interface Built {
  spec: IconSpec;
  pal: Pal;
  pal44: Pal;
  i44: Img;
  i88: Img;
  q44: Ix;
  q88: Ix;
  his: Img;
  his88: Img | null;
}

function buildIcon(spec: IconSpec): Built {
  const his = loadHis(spec.id);
  const src = median3(F.of(prep(his)));
  const specks = specksFor(src, spec.specks);
  const ground = removeSpecks(src, specks);
  const m88 = areaResize(src, 88, 88);
  const pal = augment(makePalette(m88, src, spec.colors, 0.6, spec.chroma, spec.vivid), m88, src, 2, 0.1);
  const pal44 = spec.colors44 ? augment(makePalette(m88, src, spec.colors44, 0.6, spec.chroma, spec.vivid), m88, src, 2, 0.1) : pal;
  // 88: his picture sharpened a little (no halos), Lanczos, on the palette, specks cleaned.
  const q88 = despeckle(quantize(lanczosResize(usm(ground, spec.usm88[0], spec.usm88[1]), 88, 88), pal), pal, 1, 0.2);
  stampSpecks(q88, pal, specks, src.w, src.h);
  drawFeatures(q88, pal, spec.features);
  // 44: his picture's area mean at 88 on the palette, halved by toggle mapping (each 2x2 block
  // keeps its lightest or darkest pixel, whichever stands out from its surroundings), cleaned.
  const g44 = spec.flow44[1] > 0 ? flowSmooth(ground, spec.flow44[0], spec.flow44[1]) : ground;
  const q44 = despeckle(halve(despeckle(quantize(areaResize(g44, 88, 88), pal44), pal44, 1, 0.2), pal44, spec.strong44), pal44, 2, 0.2);
  stampSpecks(q44, pal44, specks, src.w, src.h);
  drawFeatures(q44, pal44, spec.features);
  const p88 = join(REF, `${spec.id}@88.png`);
  return { spec, pal, pal44, q44, q88, i44: q44.toImg(pal44), i88: q88.toImg(pal), his, his88: existsSync(p88) ? loadPng(p88) : null };
}

// --- his slot frame -----------------------------------------------------------------------------

/**
 * His skill slot (56x56, the icon window 44x44 at 6,6), one art pixel per screen pixel like the
 * icons. From the outside in, as he painted it (his colours, measured on all four slots by
 * tools/refs/icons-from-ref.py): a black line, the dark steel bar (lit outer edge, then its body),
 * a dark gap, his thin gold line and a black line before the picture. Each side keeps his own
 * shade of steel and gold. Over the corners sit his gold brackets: a block holding a steel rivet,
 * two arms along the bar that end in a 45-degree cut, a small barb on each arm, lit from the top
 * left. The window is left transparent, so the frame can be drawn over the icon (the brackets
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
  bracket: { hi: '#ebd8a9', light: '#cab082', mid: '#a6875b', dark: '#876b46', edge: '#1a1206' },
  rivet: { hi: '#d2d6de', mid: '#8a909c', dark: '#4c525e', rim: '#15161a' },
};

// Selected or hovered: the same frame in gold (as the kit's skill_slot_active), the rivets glinting.
const GOLDEN: FrameColors = {
  outline: '#05060a',
  steelLight: ['#f0e2a6', '#bca659', '#bca659', '#dcc87e'],
  steel: ['#958035', '#806c2a', '#806c2a', '#8a7530'],
  gap: '#2a1d06',
  gold: ['#fff6d6', '#e6d08e', '#f6e7b8', '#f0dfa8'],
  inner: '#0a0607',
  bracket: { hi: '#fff6d6', light: '#f0e2a6', mid: '#dcc87e', dark: '#bca659', edge: '#2a1d06' },
  rivet: { hi: '#ffffff', mid: '#b4bac4', dark: '#5e6470', rim: '#15161a' },
};

const SLOT = 56, RING = 6, SLICE = 16;

/** The top-left bracket's shape (1 = gold), before mirroring into the other corners. */
function bracketMask(): boolean[][] {
  const m = Array.from({ length: SLICE }, () => Array(SLICE).fill(false) as boolean[]);
  // The block that holds the rivet, its inner corner cut at 45 degrees (it stays on the ring).
  for (let y = 1; y <= 6; y++) for (let x = 1; x <= 6; x++) if (x + y <= 11) m[y][x] = true;
  // Arms along the bar: two pixels thick, ending in a 45-degree cut.
  for (let x = 7; x <= 12; x++) m[1][x] = true;
  for (let x = 7; x <= 11; x++) m[2][x] = true;
  for (let y = 7; y <= 12; y++) m[y][1] = true;
  for (let y = 7; y <= 11; y++) m[y][2] = true;
  // His barb: a small tooth under each arm, past a notch.
  m[3][9] = true;
  m[9][3] = true;
  return m;
}

/** The rivet: a 4x4 steel ball lit from the top left ('.' leaves the bracket under it). */
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
        const col = up || left ? (up && left ? c.bracket.hi : up ? c.bracket.hi : c.bracket.light) : down || right ? c.bracket.dark : c.bracket.mid;
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
    // Its shadow rim on the lower right.
    for (const [dx, dy] of [[4, 1], [4, 2], [1, 4], [2, 4], [3, 3]]) img.set(ox + dx, oy + dy, hex(c.rivet.rim));
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

const built = ICONS.map(buildIcon);
for (const b of built) {
  savePng(join(OUT, `${b.spec.id}.png`), b.i44);
  savePng(join(OUT, `${b.spec.id}@2x.png`), b.i88);
  console.log(b.spec.id, b.pal.rgb.length, b.pal.rgb.map(toHex).join(' '));
}
savePng(join(OUT, 'skill_slot_steel.png'), frame);
savePng(join(OUT, 'skill_slot_steel_active.png'), frameActive);

// --- manifest -----------------------------------------------------------------------------------

const manifest = {
  kit: 'ui_icons',
  reference: 'docs/reference/icons-owner-reference-1.jpg',
  screen: [1600, 900],
  pixel: 'one art pixel per screen pixel (finer than ui_battle, whose art pixels are 2x2): draw at 1x on a 1600x900 screen, @2x on a 2x screen, always with image-rendering: pixelated',
  sliceOrder: 'top, right, bottom, left (pixels)',
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
      use: "His skill slot from the icon picture: dark steel bar with a lit outer edge, his thin gold line inside, gold corner brackets with steel rivets. The skill icon goes in the window.",
    },
    skill_slot_steel_active: {
      file: 'skill_slot_steel_active.png',
      size: [SLOT, SLOT],
      slice: [SLICE, SLICE, SLICE, SLICE],
      window: { x: RING, y: RING, w: SLOT - 2 * RING, h: SLOT - 2 * RING, shape: 'rect' },
      layer: 'as skill_slot_steel',
      use: 'The same slot, selected or hovered: the steel turns gold and the rivets glint (as the kit pairs skill_slot with skill_slot_active).',
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
    row.draw(b.i44, x + RING, RING);
    row.draw(i === act ? frameActive : frame, x, 0);
  });
  return row;
}

if (process.env.UI_SHEETS) {
  const BG = hex('#15171d'), HEAD = hex('#e9dfc4'), SUB = hex('#9aa3b0');
  const Z = 2; // the sheet shows everything at 2x
  const pad = 24, cell = 88 * Z, gap = 20;
  const parts: { img: Img; x: number; y: number }[] = [];
  let y = pad;
  const put = (img: Img, x: number) => parts.push({ img, x, y });
  const title = screenText('SKILL ICONS 1  -  his icons beside ours (sheet at 2x: every pixel shown 2x2)', 'title', HEAD);
  put(title, pad);
  y += title.h + 14;
  const heads = ['his picture, cropped, at 88', 'ours at 88 (@2x file)', 'ours at 44, shown at 2x', '44 at 1x'];
  heads.forEach((h, i) => put(screenText(h, 'label', SUB), pad + 200 + i * (cell + gap)));
  y += 24;
  for (const b of built) {
    put(screenText(b.spec.name, 'title', HEAD), pad);
    parts.push({ img: screenText(b.spec.id, 'label', SUB), x: pad, y: y + 22 });
    if (b.his88) put(b.his88.scaled(Z), pad + 200);
    put(b.i88.scaled(Z), pad + 200 + (cell + gap));
    put(b.i44.scaled(2 * Z), pad + 200 + 2 * (cell + gap));
    put(b.i44.scaled(Z), pad + 200 + 3 * (cell + gap));
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
