// Drawing primitives for the battle UI kit, all in ART pixels (the kit doubles every art pixel
// when it writes a piece, so one art pixel is 2 screen pixels in a 1600x900 window).
//
// Metal is shaded like a rounded bar lit from the upper left and quantized to the palette, so
// edges stay crisp; filigree is drawn as 1-2 pixel strokes into a mask and embossed (lit edge
// up-left, shadow edge down-right, a tinted dark outline around it).

import { Img, RGBA, hex } from './ui-img';

// --- palette (sampled from the owner's picture, then reduced) ---------------------------------

const H = (s: string) => hex(s);
/** Antique gold / bronze metal, outline to highlight (his frames, medallions, scrollwork). */
export const METAL = ['#140c05', '#2e2010', '#4c3b23', '#6e5d40', '#918063', '#b3a383', '#d3c6a5', '#efe7cf'].map(H);
/** Ivory-silver bands (his minimap ring, the bar rails). */
export const IVORY = ['#16120b', '#3a352b', '#5d584b', '#83806f', '#a8a491', '#c8c3ae', '#e0dbc8', '#f4f1e4'].map(H);
/** Bright gold (the acting unit's frame, the active medallion rim). */
export const GOLD = ['#1a1004', '#3e2c0c', '#6b5420', '#958035', '#bca659', '#dcc87e', '#f0e2a6', '#fff6d6'].map(H);
/** Warm bronze (the skill slot frames, the number tags). */
export const BRONZE = ['#170c04', '#3a210d', '#5e3a1c', '#80562f', '#a27448', '#c19468', '#dbb790', '#f1dcbd'].map(H);
/** The dark panels: bar interior, slot wells. */
export const PANEL = ['#0d0a06', '#16120c', '#1e1a13', '#28231b', '#332d23', '#3f382c'].map(H);
/** The dark brown of the round medallions. */
export const BROWN = ['#1d130c', '#2b1e15', '#36271c', '#433123', '#4f3b2b'].map(H);
/** Health red. */
export const RED = ['#2c0d0b', '#5a1d19', '#87302a', '#ad453c', '#c9625a', '#e38c80'].map(H);
/** Movement teal. */
export const TEAL = ['#0f2224', '#1d3d3e', '#2b5d60', '#3d7f84', '#55a1a6', '#86cbcc'].map(H);
/** The party frames' second bar (his green). */
export const GREEN = ['#0f2412', '#1e4a25', '#2f6f37', '#46944b', '#68b864', '#9ad88e'].map(H);
/** Gems: outline, dark, mid, light, highlight, sparkle. */
export const GEM: Record<string, RGBA[]> = {
  red: ['#2a0709', '#62121a', '#9e2430', '#cf4652', '#ef8a90', '#fff0f0'].map(H),
  green: ['#062012', '#0f4826', '#1d7a40', '#36a65d', '#86dca0', '#f0fff4'].map(H),
  orange: ['#2e1504', '#6e3a0a', '#b26a14', '#e89a26', '#ffd27a', '#fffbe8'].map(H),
  blue: ['#07163a', '#13337a', '#2457b8', '#4b8cee', '#a6cdff', '#f4faff'].map(H),
  magenta: ['#260a2a', '#55195c', '#8f3196', '#cf55d6', '#f2a6f6', '#fff2ff'].map(H),
  teal: ['#06201f', '#0f4644', '#1b7a73', '#33aaa0', '#8ee0d6', '#f0fffc'].map(H),
};
/** Initiative rings: allies his muted steel blue, enemies his muted rose. */
export const ALLY = ['#111a21', '#243442', '#395064', '#567087', '#7c94a6', '#aebfca'].map(H);
export const FOE = ['#1f1214', '#40252a', '#613a3f', '#86565a', '#a87b7b', '#cca9a4'].map(H);
/** Count badges (his small, dim blue dots). */
export const BADGE = ['#0a1219', '#152638', '#203c56', '#2f5574', '#4f7697', '#8eaac2'].map(H);
/** The bar's rails and the troughs' light lines: his dim, slightly cool grey-silver. */
export const RAIL = ['#15150f', '#33352e', '#53574e', '#71766c', '#8f978c', '#a1a49b', '#b9bcb1', '#d2d4ca'].map(H);
/** Cool silver-ivory (his minimap band, the number tags' rims). */
export const SILVER = ['#17171a', '#34333a', '#57555a', '#7d7a7a', '#a29d97', '#c4bdb3', '#e2dbd0', '#f3f0e9'].map(H);
/** Khaki-silver (his skill slot frames). */
export const KHAKI = ['#15120d', '#2d281f', '#4a4334', '#695f4c', '#8a7d66', '#a99475', '#bfae92', '#d6cab2'].map(H);
/** Olive gold (his party frames). */
export const OLIVE = ['#121109', '#2a281b', '#47442f', '#66624a', '#857d66', '#aea989', '#c9c4a3', '#e1dcc0'].map(H);
/** Text. */
export const INK = { cream: H('#efe6cf'), dim: H('#b8ad94'), faint: H('#7d735f'), white: H('#fbf8ee'), dark: H('#0b0805'), shadow: H('#000000') };

/** Toward the light: upper left, out of the screen. */
const L3 = (() => {
  const v = [-0.52, -0.62, 0.59];
  const l = Math.hypot(...v);
  return v.map((k) => k / l) as [number, number, number];
})();

// --- masks ------------------------------------------------------------------------------------

export class Mask {
  readonly m: Uint8Array;
  constructor(readonly w: number, readonly h: number) {
    this.m = new Uint8Array(w * h);
  }
  get(x: number, y: number): number {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.m[y * this.w + x] : 0;
  }
  set(x: number, y: number, v = 1): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.m[y * this.w + x] = v;
  }
  /** A 1-pixel (width 1) or round (width > 1) stroke through the points. */
  stroke(pts: [number, number][], width = 1): void {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3));
      for (let k = 0; k <= n; k++) {
        const x = x0 + ((x1 - x0) * k) / n, y = y0 + ((y1 - y0) * k) / n;
        if (width <= 1) this.set(Math.floor(x), Math.floor(y));
        else this.disc(x, y, width / 2);
      }
    }
  }
  disc(cx: number, cy: number, r: number, v = 1): void {
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++)
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) this.set(x, y, v);
  }
  sdf(fn: (x: number, y: number) => number, v = 1): void {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (fn(x + 0.5, y + 0.5) <= 0) this.set(x, y, v);
  }
  clear(x: number, y: number): void {
    this.set(x, y, 0);
  }
  /** Removes pixels that are set in `o`. */
  minus(o: Mask): void {
    for (let i = 0; i < this.m.length; i++) if (o.m[i]) this.m[i] = 0;
  }
  flipX(): Mask {
    const o = new Mask(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) o.m[y * this.w + x] = this.m[y * this.w + this.w - 1 - x];
    return o;
  }
  /** A stroke whose width goes from w0 at the first point to w1 at the last. */
  taper(pts: [number, number][], w0: number, w1: number): void {
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const tot = L[L.length - 1] || 1;
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3));
      for (let k = 0; k <= n; k++) {
        const t = k / n, s = (L[i] + (L[i + 1] - L[i]) * t) / tot, w = w0 + (w1 - w0) * s;
        const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
        if (w <= 1) this.set(Math.floor(x), Math.floor(y));
        else this.disc(x, y, w / 2);
      }
    }
  }
  /** Pixels within distance r of a set pixel (round structuring element). */
  dilate(r: number): Mask {
    const o = new Mask(this.w, this.h);
    const R = Math.ceil(r);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (!this.get(x, y)) continue;
        for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= r * r) o.set(x + dx, y + dy);
      }
    return o;
  }
  /** Pixels whose whole r-disc is set (outside the image counts as unset unless `edgeSet`). */
  erode(r: number, edgeSet = false): Mask {
    const o = new Mask(this.w, this.h);
    const R = Math.ceil(r);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        let ok = true;
        for (let dy = -R; dy <= R && ok; dy++)
          for (let dx = -R; dx <= R; dx++) {
            if (dx * dx + dy * dy > r * r) continue;
            const xx = x + dx, yy = y + dy;
            const inside = xx >= 0 && yy >= 0 && xx < this.w && yy < this.h;
            if (inside ? !this.m[yy * this.w + xx] : !edgeSet) {
              ok = false;
              break;
            }
          }
        if (ok) o.m[y * this.w + x] = 1;
      }
    return o;
  }
  /** Morphological closing: fills the gaps narrower than about 2r between strokes. */
  closed(r: number, edgeSet = true): Mask {
    return this.dilate(r).erode(r, edgeSet);
  }
  /** Sets every pixel whose centre lies inside the polygon (even-odd rule). */
  poly(pts: [number, number][]): void {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const px = x + 0.5, py = y + 0.5;
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) this.set(x, y);
      }
  }
  and(o: Mask): Mask {
    const n = new Mask(this.w, this.h);
    for (let i = 0; i < this.m.length; i++) n.m[i] = this.m[i] && o.m[i] ? 1 : 0;
    return n;
  }
  or(o: Mask): Mask {
    const n = new Mask(this.w, this.h);
    for (let i = 0; i < this.m.length; i++) n.m[i] = this.m[i] || o.m[i] ? 1 : 0;
    return n;
  }
  count(): number {
    let n = 0;
    for (let i = 0; i < this.m.length; i++) n += this.m[i] ? 1 : 0;
    return n;
  }
}

/**
 * Pierced filigree (his "lace"): the strokes embossed in metal over a dark backing that fills
 * the gaps between them (a closing of the strokes), so the openwork reads dense, with dark
 * holes, instead of a thin wire. `hole` keeps the bigger gaps see-through.
 */
export function lace(img: Img, strokes: Mask, ramp: RGBA[], opts: { close?: number; back?: RGBA; base?: number; ox?: number; oy?: number; edgeSet?: boolean } = {}): void {
  const back = strokes.closed(opts.close ?? 2, opts.edgeSet ?? true);
  const ox = opts.ox ?? 0, oy = opts.oy ?? 0, bc = opts.back ?? ramp[1];
  // The backing, with an outline in the ramp's darkest step.
  for (let y = -1; y <= back.h; y++)
    for (let x = -1; x <= back.w; x++) {
      if (back.get(x, y)) img.set(x + ox, y + oy, bc);
      else if (back.get(x - 1, y) || back.get(x + 1, y) || back.get(x, y - 1) || back.get(x, y + 1)) img.set(x + ox, y + oy, ramp[0]);
    }
  emboss(img, strokes, ramp, { base: opts.base ?? 5, ox, oy, outlineColor: ramp[0] });
}

/**
 * Dense filled scrollwork (his crest shoulders, brackets, crowns): an explicit dark silhouette
 * (`back`, outlined in the ramp's darkest step) with the strokes embossed over it, so the cluster
 * reads as one solid embossed mass with dark gaps between the curls, not as loose wire.
 */
export function filledLace(
  img: Img, strokes: Mask, back: Mask, ramp: RGBA[],
  opts: { base?: number; ox?: number; oy?: number; backColor?: RGBA; crevice?: RGBA | null; grow?: number } = {},
): void {
  const ox = opts.ox ?? 0, oy = opts.oy ?? 0, grow = opts.grow ?? 1;
  const full = back.or(grow > 0 ? strokes.dilate(grow) : strokes);
  const bc = opts.backColor ?? ramp[1];
  const cv = opts.crevice === undefined ? ramp[0] : opts.crevice;
  const st = (x: number, y: number) => strokes.get(x, y) === 1;
  for (let y = -1; y <= full.h; y++)
    for (let x = -1; x <= full.w; x++) {
      if (full.get(x, y)) img.set(x + ox, y + oy, cv && !st(x, y) && (st(x - 1, y) || st(x + 1, y) || st(x, y - 1) || st(x, y + 1)) ? cv : bc);
      else if (full.get(x - 1, y) || full.get(x + 1, y) || full.get(x, y - 1) || full.get(x, y + 1)) img.set(x + ox, y + oy, ramp[0]);
    }
  emboss(img, strokes, ramp, { base: opts.base ?? 5, ox, oy, outline: false });
}

/**
 * Embossed metal from a mask: edges facing the light get the bright steps, edges facing away
 * the dark ones, the middle the base step; then a 1-pixel outline (4-neighbour) in the ramp's
 * darkest color. `base` is the ramp index of the flat middle.
 */
export function emboss(img: Img, mk: Mask, ramp: RGBA[], opts: { base?: number; outline?: boolean; ox?: number; oy?: number; outlineColor?: RGBA } = {}): void {
  const base = opts.base ?? 5, ox = opts.ox ?? 0, oy = opts.oy ?? 0;
  const on = (x: number, y: number) => mk.get(x, y) === 1;
  if (opts.outline !== false)
    for (let y = -1; y <= mk.h; y++)
      for (let x = -1; x <= mk.w; x++) {
        if (on(x, y)) continue;
        if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) img.set(x + ox, y + oy, opts.outlineColor ?? ramp[0]);
      }
  for (let y = 0; y < mk.h; y++)
    for (let x = 0; x < mk.w; x++) {
      if (!on(x, y)) continue;
      const lit = (on(x, y - 1) ? 0 : 1) + (on(x - 1, y) ? 0 : 1) + (on(x - 1, y - 1) ? 0 : 0.5);
      const dark = (on(x, y + 1) ? 0 : 1) + (on(x + 1, y) ? 0 : 1) + (on(x + 1, y + 1) ? 0 : 0.5);
      const s = lit - dark;
      const k = s >= 1.5 ? base + 2 : s >= 0.5 ? base + 1 : s <= -1.5 ? base - 2 : s <= -0.5 ? base - 1 : base;
      img.set(x + ox, y + oy, ramp[Math.max(1, Math.min(ramp.length - 1, k))]);
    }
}

// --- shaded bands from distance fields -----------------------------------------------------------

export type Sdf = (x: number, y: number) => number;

export const sdCircle = (cx: number, cy: number, r: number): Sdf => (x, y) => Math.hypot(x - cx, y - cy) - r;
export function sdRoundRect(x0: number, y0: number, x1: number, y1: number, r: number): Sdf {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hx = (x1 - x0) / 2 - r, hy = (y1 - y0) / 2 - r;
  return (x, y) => {
    const qx = Math.abs(x - cx) - hx, qy = Math.abs(y - cy) - hy;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  };
}
/** A rounded diamond: the L^p ball (p between 1 and 2), stretched to rx by ry. */
export function sdLp(cx: number, cy: number, rx: number, ry: number, p: number): Sdf {
  return (x, y) => {
    const u = Math.abs(x - cx) / rx, v = Math.abs(y - cy) / ry;
    const n = Math.pow(Math.pow(u, p) + Math.pow(v, p), 1 / p);
    return (n - 1) * Math.min(rx, ry);
  };
}

function grad(f: Sdf, x: number, y: number): [number, number] {
  const e = 0.35;
  const gx = f(x + e, y) - f(x - e, y), gy = f(x, y + e) - f(x, y - e);
  const l = Math.hypot(gx, gy) || 1;
  return [gx / l, gy / l];
}

export interface BandOpts {
  /** Distance inward from the shape's edge where the band starts (0 = the edge). */
  from: number;
  /** Band width in art pixels. */
  width: number;
  ramp: RGBA[];
  /** Fraction of the band that is flat on top (0 = fully round). */
  flat?: number;
  /** Raised beads along the band: their spacing in pixels, measured as angle * radius about (cx, cy). */
  beads?: { period: number; cx: number; cy: number; r: number; depth?: number };
  /** Lowest and highest ramp index to use. */
  lo?: number;
  hi?: number;
  /** Ramp thresholds bias (+ brighter). */
  bias?: number;
}

/** Paints a rounded metal band lying along the inside of the shape's edge. */
export function band(img: Img, f: Sdf, o: BandOpts): void {
  const lo = o.lo ?? 1, hi = o.hi ?? o.ramp.length - 1, flat = o.flat ?? 0;
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const px = x + 0.5, py = y + 0.5;
      const d = -f(px, py) - o.from; // 0 at the band's outer edge, width at its inner edge
      if (d < 0 || d >= o.width) continue;
      const [nx, ny] = grad(f, px, py);
      let t = 1 - (2 * (d + 0.5)) / o.width; // +1 outer, -1 inner
      const at = Math.abs(t);
      t = at <= flat ? 0 : (Math.sign(t) * (at - flat)) / (1 - flat);
      let N: [number, number, number] = [nx * t, ny * t, Math.sqrt(Math.max(0, 1 - t * t))];
      if (o.beads) {
        const { period, cx, cy, r } = o.beads;
        const ang = Math.atan2(py - cy, px - cx);
        const s = ang * r;
        const ph = Math.sin((2 * Math.PI * s) / period) * (o.beads.depth ?? 0.8);
        const tx = -Math.sin(ang), ty = Math.cos(ang);
        N = [N[0] + tx * ph, N[1] + ty * ph, N[2]];
        const nl = Math.hypot(...N);
        N = [N[0] / nl, N[1] / nl, N[2] / nl];
        // The grooves between beads go dark.
        if (Math.cos((2 * Math.PI * s) / period) < -0.82 && Math.abs(t) < 0.9) N = [N[0] * 0.3, N[1] * 0.3, 0.05];
      }
      const l = N[0] * L3[0] + N[1] * L3[1] + N[2] * L3[2] + (o.bias ?? 0);
      const steps = hi - lo;
      const k = lo + Math.max(0, Math.min(steps, Math.round(((l + 0.35) / 1.3) * steps)));
      img.set(x, y, o.ramp[k]);
    }
}

/** Fills the inside of a shape (d <= -inset) with a color or a function of the distance. */
export function fillShape(img: Img, f: Sdf, inset: number, paint: RGBA | ((x: number, y: number, d: number) => RGBA | null)): void {
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const d = -f(x + 0.5, y + 0.5);
      if (d < inset) continue;
      const c = typeof paint === 'function' ? paint(x, y, d) : paint;
      if (c) img.set(x, y, c);
    }
}
/** A 1-pixel line along the iso-distance `at` (inward positive) of the shape. */
export function isoLine(img: Img, f: Sdf, at: number, c: RGBA, thick = 1): void {
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const d = -f(x + 0.5, y + 0.5) - at;
      if (d >= 0 && d < thick) img.set(x, y, c);
    }
}

// --- gems -------------------------------------------------------------------------------------

/** A round cabochon of radius r centred on (cx, cy) (pixel centres at +0.5). */
export function gem(img: Img, cx: number, cy: number, r: number, ramp: RGBA[], outline = true): void {
  for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y++)
    for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
      const u = (x + 0.5 - cx) / r, v = (y + 0.5 - cy) / r;
      const q = u * u + v * v;
      if (q > 1) {
        if (outline && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r + 1) img.set(x, y, ramp[0]);
        continue;
      }
      const z = Math.sqrt(1 - q);
      const l = u * L3[0] + v * L3[1] + z * L3[2];
      // Gems are lit from inside too: the far lower side glows.
      const back = Math.max(0, u * 0.5 + v * 0.7) * (1 - z) * 1.2;
      const k = l > 0.93 ? 5 : l > 0.75 ? 4 : l + back * 0.6 > 0.45 ? 3 : l + back > 0.1 ? 2 : 1;
      img.set(x, y, ramp[k]);
    }
}

/** A faceted diamond-shaped gem (the chakra gems), w by h, centred on (cx, cy). */
export function diamondGem(img: Img, cx: number, cy: number, w: number, h: number, ramp: RGBA[]): void {
  const rx = w / 2, ry = h / 2;
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
    for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
      const q = Math.abs(u) + Math.abs(v);
      if (q > 1) {
        if (Math.abs(x + 0.5 - cx) / (rx + 1) + Math.abs(y + 0.5 - cy) / (ry + 1) <= 1) img.set(x, y, ramp[0]);
        continue;
      }
      // Four facets around a small flat table.
      let k: number;
      if (q < 0.34) k = u + v < -0.1 ? 4 : 3;
      else if (u <= 0 && v <= 0) k = 4;
      else if (u > 0 && v <= 0) k = 3;
      else if (u <= 0 && v > 0) k = 2;
      else k = 1;
      img.set(x, y, ramp[k]);
    }
  img.set(Math.floor(cx - rx / 2.6), Math.floor(cy - ry / 2.4), ramp[5]);
}

/**
 * A smooth glossy orb (his action pips), radius r about (cx, cy): smooth shading lit from the upper
 * left, a soft darker rim (no black outline) and one specular highlight.
 */
export function orb(img: Img, cx: number, cy: number, r: number, ramp: RGBA[]): void {
  for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++)
    for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      const u = (x + 0.5 - cx) / r, v = (y + 0.5 - cy) / r, q = u * u + v * v;
      if (q > 1) continue;
      const z = Math.sqrt(1 - q);
      const l = -0.55 * u - 0.62 * v + 0.55 * z;
      const rim = q > 0.72;
      let k = l > 0.62 ? 4 : l > 0.25 ? 3 : l > -0.15 ? 2 : 1;
      if (rim) k = Math.min(k, l > 0.3 ? 2 : 1);
      img.set(x, y, ramp[k]);
    }
  const hx = Math.floor(cx - r * 0.42), hy = Math.floor(cy - r * 0.45);
  img.set(hx, hy, ramp[5]);
  img.set(hx + 1, hy, ramp[4]);
  img.set(hx, hy + 1, ramp[4]);
}

/**
 * His chakra gem: a compact rhombus (pointed top and bottom, blunt sides), outlined in the ramp's
 * darkest step, four facets lit from the upper left around a small table, one sparkle. 9 x 11.
 */
export function rhombGem(img: Img, x0: number, y0: number, ramp: RGBA[]): void {
  const half = [0, 1, 2, 3, 4, 4, 4, 3, 2, 1, 0];
  const inside = (x: number, y: number) => y >= 0 && y < 11 && Math.abs(x - 4) <= half[y];
  for (let y = 0; y < 11; y++)
    for (let x = 0; x < 9; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      if (edge) {
        img.set(x0 + x, y0 + y, ramp[0]);
        continue;
      }
      const u = x - 4, v = y - 5;
      let k: number;
      if (Math.abs(u) + Math.abs(v) <= 1) k = 3; // the table
      else if (u <= 0 && v <= 0) k = 4;
      else if (u > 0 && v <= 0) k = 3;
      else if (u <= 0 && v > 0) k = 2;
      else k = 1;
      img.set(x0 + x, y0 + y, ramp[k]);
    }
  img.set(x0 + 3, y0 + 3, ramp[5]);
}

/**
 * A compact round-cut faceted gem (his chakra gems): an octagonal outline in the ramp's darkest
 * step, a lit table, crown facets lighter up-left and darker down-right, one sparkle.
 */
export function cutGem(img: Img, x0: number, y0: number, ramp: RGBA[]): void {
  // 9 wide, 10 tall: half-widths per row about the centre column 4.
  const half = [1, 2, 3, 4, 4, 4, 4, 3, 2, 1];
  const inside = (x: number, y: number) => y >= 0 && y < 10 && Math.abs(x - 4) <= half[y];
  for (let y = 0; y < 10; y++)
    for (let x = 0; x < 9; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      if (edge) {
        img.set(x0 + x, y0 + y, ramp[0]);
        continue;
      }
      const u = x - 4, v = y - 4.5;
      let k: number;
      if (Math.abs(u) <= 1 && Math.abs(v) <= 1.5) k = 3; // the table
      else if (u + v < -1.5) k = 4; // upper-left crown
      else if (u + v > 1.5) k = 1; // lower-right crown
      else k = u < 0 ? 3 : 2;
      img.set(x0 + x, y0 + y, ramp[k]);
    }
  img.set(x0 + 3, y0 + 3, ramp[5]);
  img.set(x0 + 4, y0 + 4, ramp[4]);
}

// --- curves -------------------------------------------------------------------------------------

export type Pt = [number, number];
/** Points of a spiral about (cx, cy): radius r0 at angle a0 to r1 at a1 (radians, screen y down). */
export function spiral(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number, n = 40): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = a0 + (a1 - a0) * t, r = r0 + (r1 - r0) * t;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}
export function qbez(p0: Pt, c: Pt, p1: Pt, n = 24): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([s * s * p0[0] + 2 * s * t * c[0] + t * t * p1[0], s * s * p0[1] + 2 * s * t * c[1] + t * t * p1[1]]);
  }
  return out;
}
export function cbez(p0: Pt, c0: Pt, c1: Pt, p1: Pt, n = 32): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([
      s * s * s * p0[0] + 3 * s * s * t * c0[0] + 3 * s * t * t * c1[0] + t * t * t * p1[0],
      s * s * s * p0[1] + 3 * s * s * t * c0[1] + 3 * s * t * t * c1[1] + t * t * t * p1[1],
    ]);
  }
  return out;
}

// --- hand-drawn maps ------------------------------------------------------------------------------

/**
 * His open gold wirework (crest shoulders, lower brackets): 1-art-pixel strokes in light and mid
 * metal, each outlined in a dark brown, with the background showing through every gap wider than
 * the outline. Map keys: 'H' highlight, 'L' light, 'l' light-mid, 'M' mid, 'D' dark metal, 'o' the pale bead rim,
 * 'c' / 'C' the bead's olive-grey centre, '.' open.
 */
export const WIRE: Record<string, RGBA> = {
  H: H('#e0d3b7'), L: H('#bcaf9e'), l: H('#9c8e74'), M: H('#7a6d58'), D: H('#544934'),
  o: H('#cfc4b2'), c: H('#5e5c4d'), C: H('#535740'),
};
export const WIRE_OUTLINE = H('#2c2316');
export function wire(img: Img, rows: string[], opts: { ox?: number; oy?: number; flip?: boolean; pal?: Record<string, RGBA>; outline?: RGBA } = {}): void {
  const ox = opts.ox ?? 0, oy = opts.oy ?? 0, pal = opts.pal ?? WIRE, ol = opts.outline ?? WIRE_OUTLINE;
  const w = Math.max(...rows.map((r) => r.length)), h = rows.length;
  const at = (x: number, y: number): string => (y < 0 || y >= h || x < 0 || x >= w ? '.' : rows[y][opts.flip ? w - 1 - x : x] ?? '.');
  for (let y = -1; y <= h; y++)
    for (let x = -1; x <= w; x++) {
      if (at(x, y) !== '.') continue;
      if (at(x - 1, y) !== '.' || at(x + 1, y) !== '.' || at(x, y - 1) !== '.' || at(x, y + 1) !== '.') img.set(ox + x, oy + y, ol);
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const ch = at(x, y);
      if (ch === '.') continue;
      const c = pal[ch];
      if (!c) throw new Error(`wire: no color for '${ch}'`);
      img.set(ox + x, oy + y, c);
    }
}

/**
 * Draws a character map: each character is a palette key, '.' or ' ' is left alone. Rows are
 * separated by spaces or given as an array.
 */
export function stamp(img: Img, x0: number, y0: number, rows: string[] | string, pal: Record<string, RGBA>, flipX = false): void {
  const rs = typeof rows === 'string' ? rows.trim().split(/\s+/) : rows;
  const w = Math.max(...rs.map((r) => r.length));
  for (let y = 0; y < rs.length; y++)
    for (let x = 0; x < rs[y].length; x++) {
      const ch = rs[y][x];
      if (ch === '.' || ch === ' ') continue;
      const c = pal[ch];
      if (!c) throw new Error(`stamp: no color for '${ch}'`);
      img.set(x0 + (flipX ? w - 1 - x : x), y0 + y, c);
    }
}
