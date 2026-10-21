// Effects for the rank D and C jutsu (the owner's answers of 2026-10-21; docs/GAMEPLAY_DESIGN.md,
// "Rank D and C jutsu"), cut and turned out of his approved element sheets. Nothing is redrawn:
//
//   vfx_dc/<element>_multi_<n>  one projectile of the element's multi (fire's three comets,
//                               lightning's thunder needles, earth's rock bullets), cut apart so
//                               each flies on its own path (Three Embers, Jolt, Pebble Shot). Turned
//                               with RotSprite to every flight angle from -90 to 90 degrees (rows
//                               a-90 ... a90, 6 degrees apart); the row at the angle it points in his
//                               sheet is his pixels exactly. Anchor: the projectile's head.
//   vfx_dc/lightning_fan        his lightning breath (the forked cone) turned the same way (10
//                               degrees apart), anchor at the fork's root: the Spark Fan chains it
//                               from the hand to each one it reaches.
//   vfx_neutral/slash           his wind slash in white, the cut of a sword art with no element
//                               (the Bleeding Cut): every pixel keeps its place and its light, only
//                               the green is taken out.
//
//   WORLD_OUT=<staging dir> npx tsx tools/world-sprites/vfx-dc.ts
//
// It refuses to run without WORLD_OUT, so it never writes into src/assets: copy the staged groups
// into src/assets/world/ once the owner approves them. Same input, same bytes.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Canvas, WorldSprite, writeGroup } from './kit';
import { readPng } from './creatures-assemble';

const ASSETS = join(import.meta.dirname, '../../src/assets/world');

interface Spec {
  file: string;
  frameW: number;
  frameH: number;
  anchor: [number, number];
  meters: [number, number];
  anims: Record<string, { row: number; frames: number; fps: number; loop: boolean }>;
}

/** One of his sheets (an installed, approved group) cut into frames. */
function frames(group: string, name: string): { spec: Spec; frames: Canvas[]; fps: number } {
  const manifest = JSON.parse(readFileSync(join(ASSETS, group, 'manifest.json'), 'utf8')) as { sprites: Record<string, Spec> };
  const spec = manifest.sprites[name];
  const sheet = readPng(join(ASSETS, group, spec.file));
  const anim = Object.values(spec.anims)[0];
  const out: Canvas[] = [];
  for (let f = 0; f < anim.frames; f++) {
    const c = new Canvas(spec.frameW, spec.frameH);
    for (let y = 0; y < spec.frameH; y++)
      for (let x = 0; x < spec.frameW; x++) c.set(x, y, sheet.get(f * spec.frameW + x, anim.row * spec.frameH + y));
    out.push(c);
  }
  return { spec, frames: out, fps: anim.fps };
}

const lum = (c: number[]): number => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;

// --- cutting a multi apart -----------------------------------------------------------------

/**
 * Which projectile each pixel of a frame belongs to: every projectile grows out from its head
 * (`seeds`) through the opaque pixels, bright ones cheaply and dark or faint ones dearly, so where
 * two meet (a shared glow, the dust between two bullets) the cut runs along the dark valley between
 * them. Specks no path reaches (an ember behind a comet) go with the nearest pixel already claimed.
 * Returns the label per pixel (-1 empty).
 */
function cut(c: Canvas, seeds: [number, number][]): Int16Array {
  const { w, h } = c;
  const label = new Int16Array(w * h).fill(-1);
  const cost = new Float64Array(w * h).fill(Infinity);
  const weight = (i: number): number => {
    const p = c.get(i % w, Math.floor(i / w));
    return 1 + 8 * (1 - lum(p) * (p[3] / 255));
  };
  // A plain binary heap of [cost, index].
  const heap: [number, number][] = [];
  const push = (e: [number, number]) => {
    heap.push(e);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = (): [number, number] => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  seeds.forEach(([sx, sy], k) => {
    // The brightest opaque pixel near the head (the frames shimmer a little).
    let best = -1, bestL = -1;
    for (let y = sy - 4; y <= sy + 4; y++)
      for (let x = sx - 4; x <= sx + 4; x++) {
        if (!c.inside(x, y) || !c.alpha(x, y)) continue;
        const l = lum(c.get(x, y)) - 0.01 * Math.hypot(x - sx, y - sy);
        if (l > bestL) {
          bestL = l;
          best = y * w + x;
        }
      }
    if (best < 0) throw new Error(`vfx-dc: no pixel near seed ${sx},${sy}`);
    cost[best] = 0;
    label[best] = k;
    push([0, best]);
  });
  while (heap.length) {
    const [d, i] = pop();
    if (d > cost[i]) continue;
    const x = i % w, y = Math.floor(i / w);
    for (let oy = -1; oy <= 1; oy++)
      for (let ox = -1; ox <= 1; ox++) {
        if (!ox && !oy) continue;
        const nx = x + ox, ny = y + oy;
        if (!c.inside(nx, ny) || !c.alpha(nx, ny)) continue;
        const j = ny * w + nx;
        const nd = d + ((weight(i) + weight(j)) / 2) * (ox && oy ? Math.SQRT2 : 1);
        if (nd < cost[j]) {
          cost[j] = nd;
          label[j] = label[i];
          push([nd, j]);
        }
      }
  }
  const claimed: number[] = [];
  for (let i = 0; i < w * h; i++) if (label[i] >= 0) claimed.push(i);
  for (let i = 0; i < w * h; i++) {
    if (label[i] >= 0 || !c.alpha(i % w, Math.floor(i / w))) continue;
    let best = -1, bestD = Infinity;
    for (const j of claimed) {
      const d = Math.hypot((j % w) - (i % w), Math.floor(j / w) - Math.floor(i / w));
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    if (best >= 0) label[i] = label[best];
  }
  return label;
}

// --- RotSprite on colours ------------------------------------------------------------------

const key = (c: number[]): number => (c[3] ? ((c[0] << 24) | (c[1] << 16) | (c[2] << 8) | c[3]) >>> 0 : 0);
const unkey = (k: number): [number, number, number, number] => [(k >>> 24) & 255, (k >>> 16) & 255, (k >>> 8) & 255, k & 255];

/** Scale2x on colour keys (the same rules as src/sprite/rotsprite.ts). */
function scale2x(src: Uint32Array, w: number, h: number): Uint32Array {
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[y * w + x]);
  const out = new Uint32Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      let e0 = P, e1 = P, e2 = P, e3 = P;
      if (C === A && C !== D && A !== B) e0 = A;
      if (A === B && A !== C && B !== D) e1 = B;
      if (D === C && D !== B && C !== A) e2 = C;
      if (B === D && B !== A && D !== C) e3 = D;
      out[y * 2 * (w * 2) + x * 2] = e0;
      out[y * 2 * (w * 2) + x * 2 + 1] = e1;
      out[(y * 2 + 1) * (w * 2) + x * 2] = e2;
      out[(y * 2 + 1) * (w * 2) + x * 2 + 1] = e3;
    }
  return out;
}

/**
 * Turns a picture by `deg` (screen degrees, + = clockwise) around the pixel `pivot`, RotSprite
 * style (src/sprite/rotsprite.ts): up 8x with Scale2x three times, nearest-neighbour turn, and each
 * output pixel sampled at its centre, so at 0 degrees every pixel is copied exactly. Returns the
 * pixels relative to the pivot.
 */
function rotSprite(c: Canvas, pivot: [number, number], deg: number): { dx: number; dy: number; c: [number, number, number, number] }[] {
  const S = 8;
  let g = new Uint32Array(c.w * c.h);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) g[y * c.w + x] = key(c.get(x, y));
  let w = c.w, h = c.h;
  for (let k = 0; k < 3; k++) {
    g = scale2x(g, w, h);
    w *= 2;
    h *= 2;
  }
  const px0 = (pivot[0] + 0.5) * S, py0 = (pivot[1] + 0.5) * S;
  const rad = (deg * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad);
  const corners = [[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => [(x - px0) * cos - (y - py0) * sin, (x - px0) * sin + (y - py0) * cos]);
  const minX = Math.floor(Math.min(...corners.map((p) => p[0])) / S) - 1, maxX = Math.ceil(Math.max(...corners.map((p) => p[0])) / S) + 1;
  const minY = Math.floor(Math.min(...corners.map((p) => p[1])) / S) - 1, maxY = Math.ceil(Math.max(...corners.map((p) => p[1])) / S) + 1;
  const out: { dx: number; dy: number; c: [number, number, number, number] }[] = [];
  for (let oy = minY; oy <= maxY; oy++)
    for (let ox = minX; ox <= maxX; ox++) {
      const rx = ox * S, ry = oy * S;
      const sx = Math.floor(rx * cos + ry * sin + px0), sy = Math.floor(-rx * sin + ry * cos + py0);
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
      const k = g[sy * w + sx];
      if (k) out.push({ dx: ox, dy: oy, c: unkey(k) });
    }
  return out;
}

/**
 * A turned sprite: for every flight angle in `angles` a row of the frames turned from `own` (the
 * angle the art points in his sheet) to it, all on one frame size with the pivot as the anchor.
 */
function turned(name: string, label: string, src: Canvas[], pivot: [number, number], own: number, angles: number[], fps: number): WorldSprite {
  const rows = angles.map((a) => src.map((f) => rotSprite(f, pivot, a - own)));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const row of rows)
    for (const f of row)
      for (const p of f) {
        x0 = Math.min(x0, p.dx);
        y0 = Math.min(y0, p.dy);
        x1 = Math.max(x1, p.dx);
        y1 = Math.max(y1, p.dy);
      }
  const W = x1 - x0 + 1, H = y1 - y0 + 1;
  const anims: WorldSprite['anims'] = {};
  angles.forEach((a, r) => {
    anims[`a${a}`] = {
      fps,
      frames: rows[r].map((f) => {
        const c = new Canvas(W, H);
        for (const p of f) c.set(p.dx - x0, p.dy - y0, p.c);
        return c;
      }),
    };
  });
  return { name, label, meters: [+(W / 57).toFixed(2), +(H / 57).toFixed(2)], anchor: [-x0, -y0], tags: ['vfx'], anims };
}

/** Flight angles from -90 to 90 degrees, `step` apart. */
const fan = (step: number): number[] => Array.from({ length: 180 / step + 1 }, (_, i) => -90 + i * step);

/**
 * The angle a piece points in his sheet, to the nearest `step`: the long axis of its pixels (head
 * and trail, weighted by how solid they are), taken pointing right, the way his volleys fly.
 */
function pointing(src: Canvas[], labels: Int16Array[], k: number, step: number): number {
  let sx = 0, sy = 0, n = 0;
  const each = (fn: (x: number, y: number, a: number) => void) =>
    src.forEach((f, i) => {
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (labels[i][y * f.w + x] === k) fn(x, y, f.alpha(x, y));
    });
  each((x, y, a) => {
    sx += x * a;
    sy += y * a;
    n += a;
  });
  const mx = sx / n, my = sy / n;
  let xx = 0, xy = 0, yy = 0;
  each((x, y, a) => {
    xx += a * (x - mx) ** 2;
    xy += a * (x - mx) * (y - my);
    yy += a * (y - my) ** 2;
  });
  // The principal axis of the covariance, turned to point right.
  let deg = (0.5 * Math.atan2(2 * xy, xx - yy) * 180) / Math.PI;
  if (deg > 90) deg -= 180;
  if (deg < -90) deg += 180;
  return Math.round(deg / step) * step;
}

/** For checking the cut: each frame's pieces in flat colours (VFX_DC_CHECK=<dir>). */
function writeCheck(dir: string, el: string, src: Canvas[], labels: Int16Array[]): void {
  const tint: [number, number, number][] = [[255, 80, 80], [80, 220, 80], [90, 140, 255], [240, 220, 60]];
  const out = new Canvas(src[0].w * src.length, src[0].h);
  src.forEach((f, i) =>
    labels[i].forEach((k, p) => {
      if (k < 0) return;
      const [r, g, b] = tint[k % tint.length];
      const l = lum(f.get(p % f.w, Math.floor(p / f.w)));
      out.set(i * f.w + (p % f.w), Math.floor(p / f.w), [Math.round(r * (0.4 + 0.6 * l)), Math.round(g * (0.4 + 0.6 * l)), Math.round(b * (0.4 + 0.6 * l)), 255]);
    }),
  );
  out.scaled(4).save(join(dir, `cut-${el}.png`));
}

/**
 * Where each element's projectiles have their heads in his multi (frame pixels), and which of them
 * fly. Lightning's multi has four needles and the owner asked for three paths: the inner needle's
 * head (from x `drop` on) is left out and its trail, the crackling knot in the middle, goes with
 * the middle needle (`merge`), whose own trail runs into it.
 */
const MULTI: Record<string, { heads: [number, number][]; keep: number[]; merge?: { from: number; into: number; drop: number }; label: string }> = {
  fire: { heads: [[49, 18], [59, 38], [42, 54]], keep: [0, 1, 2], label: 'comet flame' },
  lightning: { heads: [[48, 16], [59, 27], [46, 41], [51, 55]], keep: [0, 1, 3], merge: { from: 2, into: 1, drop: 39 }, label: 'thunder needle' },
  earth: { heads: [[60, 9], [82, 37], [58, 66]], keep: [0, 1, 2], label: 'rock bullet' },
};

/** The two tan registration crosses his lightning sheets carry (not lightning): left out of the cut pieces. */
const MARKS = new Set([key([167, 155, 125, 255]), key([123, 109, 87, 255])]);
const unmarked = (c: Canvas): Canvas => {
  const out = c.clone();
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (MARKS.has(key(c.get(x, y)))) out.set(x, y, [0, 0, 0, 0]);
  return out;
};

const STEP = 6;

function volley(): WorldSprite[] {
  const out: WorldSprite[] = [];
  for (const [el, m] of Object.entries(MULTI)) {
    const { frames: raw, fps } = frames(`vfx_${el}`, 'multi');
    const src = raw.map(unmarked);
    const labels = src.map((f) => cut(f, m.heads));
    if (m.merge) {
      const { from, into, drop } = m.merge;
      for (const [i, l] of labels.entries()) l.forEach((k, p) => k === from && (l[p] = p % src[i].w >= drop ? -1 : into));
    }
    if (process.env.VFX_DC_CHECK) writeCheck(process.env.VFX_DC_CHECK, el, src, labels);
    m.keep.forEach((k, n) => {
      const piece = src.map((f, i) => {
        const c = new Canvas(f.w, f.h);
        for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (labels[i][y * f.w + x] === k) c.set(x, y, f.get(x, y));
        return c;
      });
      const own = pointing(piece, labels, k, STEP);
      out.push(turned(`${el}_multi_${n}`, `${el[0].toUpperCase()}${el.slice(1)} multi, ${m.label} ${n + 1} of 3 on its own (his frames; row a<deg> flies at that angle, a${own} is his)`, piece, m.heads[k], own, fan(STEP), fps));
    });
  }
  return out;
}

/** His lightning breath turned to each direction, its fork's root (the left tip) as the anchor. */
function lightningFan(): WorldSprite {
  const { frames: raw, fps } = frames('vfx_lightning', 'breath');
  const src = raw.map(unmarked);
  // The root: the middle of the leftmost opaque column of the first frame's solid pixels.
  const f0 = src[0];
  let root: [number, number] = [0, 0];
  outer: for (let x = 0; x < f0.w; x++) {
    const ys: number[] = [];
    for (let y = 0; y < f0.h; y++) if (f0.alpha(x, y) === 255) ys.push(y);
    if (ys.length) {
      root = [x, ys[Math.floor(ys.length / 2)]];
      break outer;
    }
  }
  return turned('lightning_fan', 'Lightning breath (his forked cone) turned to every direction, anchored at the root of the fork', src, root, 0, fan(10), fps);
}

/**
 * His wind slash in white: each colour keeps its brightness (the darkest stays his dark line, the
 * brightest turns pure white), with the green taken out and a cool steel cast, so the cut reads
 * as a blade's with no element.
 */
function neutralSlash(): WorldSprite {
  const { spec, frames: src, fps } = frames('vfx_wind', 'slash');
  let top = 0;
  for (const f of src) for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (f.alpha(x, y)) top = Math.max(top, lum(f.get(x, y)));
  const white = src.map((f) => {
    const c = f.clone();
    c.map((p) => {
      const v = 255 * Math.pow(lum(p) / top, 0.75);
      return [Math.round(Math.min(255, v * 0.95)), Math.round(Math.min(255, v * 0.97)), Math.round(Math.min(255, v)), p[3]];
    });
    return c;
  });
  return { name: 'slash', label: 'Neutral slash: his wind crescent in white (a sword art with no element)', meters: spec.meters, anchor: spec.anchor, tags: ['vfx'], anims: { fly: { fps, frames: white } } };
}

const root = process.env.WORLD_OUT;
if (!root) throw new Error('vfx-dc: set WORLD_OUT to the staging folder (this generator never writes into src/assets)');
writeGroup('vfx_dc', [...volley(), lightningFan()], root);
writeGroup('vfx_neutral', [neutralSlash()], root);
console.log(`vfx-dc: wrote vfx_dc and vfx_neutral under ${root}`);
