// The d20 dice art: a true icosahedron (20 triangular faces, opposite faces summing to 21) turned
// in 3D, projected and drawn as pixel art. Faces are flat-shaded from a small ramp per style with
// the light from the upper left; a 1-pixel dark outline goes round the silhouette; the numbers are
// drawn on the faces that show them, and upright, centred and crisp on the face that lands on top.
//
// Three styles (the owner chose all three, the player picks one in the main menu):
//   gem       "Gema": a see-through crystal in the caster's chakra colour (key ramp, swapped on screen)
//   ivory     "Marfil y oro": ivory with gold edges and gold numbers, like the HUD frames
//   obsidian  "Obsidiana rúnica": black volcanic glass with engraved numbers that glow
//
// Everything here is pure drawing on Img (tools/ui/ui-img.ts); the generator (dice-d20.ts) lays the
// frames out in sheets and the mockup tool (dice-d20-mock.ts) puts them over the battle screen.

import { Img, RGBA, hex, mixc } from './ui-img';
import { FONTS } from './ui-font';
import { diceGemKeys } from '../../src/sprite/diceGem';

// --- vectors ------------------------------------------------------------------------------------

export type V3 = [number, number, number];
/** A 3x3 rotation, row-major. */
export type M3 = number[];

const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => scale(a, 1 / (len(a) || 1));
export const mul = (m: M3, v: V3): V3 => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
export function mmul(a: M3, b: M3): M3 {
  const o: M3 = new Array(9).fill(0);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) o[r * 3 + c] += a[r * 3 + k] * b[k * 3 + c];
  return o;
}
/** Rotation by `deg` degrees about the unit axis `a` (right-handed, screen x right, y down, z toward the eye). */
export function axisAngle(a: V3, deg: number): M3 {
  const [x, y, z] = norm(a), t = (deg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t), C = 1 - c;
  return [c + x * x * C, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, c + y * y * C, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, c + z * z * C];
}
export const IDENTITY: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

// --- the icosahedron ---------------------------------------------------------------------------------

const PHI = (1 + Math.sqrt(5)) / 2;
export const VERTS: V3[] = [];
for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) VERTS.push(norm([0, s1, s2 * PHI]), norm([s1, s2 * PHI, 0]), norm([s2 * PHI, 0, s1]));

export interface Face {
  v: [number, number, number];
  /** Outward unit normal (the centroid's direction). */
  n: V3;
  c: V3;
  /** The face across the die. */
  opp: number;
  /** The three faces sharing an edge. */
  adj: number[];
}

export const FACES: Face[] = (() => {
  const edge = Math.min(...VERTS.slice(1).map((v) => len(sub(v, VERTS[0]))));
  const near = (i: number, j: number) => Math.abs(len(sub(VERTS[i], VERTS[j])) - edge) < 1e-6;
  const out: Face[] = [];
  for (let i = 0; i < 12; i++)
    for (let j = i + 1; j < 12; j++)
      for (let k = j + 1; k < 12; k++) {
        if (!near(i, j) || !near(j, k) || !near(i, k)) continue;
        const c = scale([VERTS[i][0] + VERTS[j][0] + VERTS[k][0], VERTS[i][1] + VERTS[j][1] + VERTS[k][1], VERTS[i][2] + VERTS[j][2] + VERTS[k][2]], 1 / 3);
        const ccw = dot(cross(sub(VERTS[j], VERTS[i]), sub(VERTS[k], VERTS[i])), c) > 0;
        out.push({ v: ccw ? [i, j, k] : [i, k, j], n: norm(c), c, opp: -1, adj: [] });
      }
  for (const f of out) {
    f.opp = out.findIndex((g) => dot(g.n, f.n) < -0.999);
    f.adj = out.flatMap((g, gi) => (g !== f && g.v.filter((x) => f.v.includes(x)).length === 2 ? [gi] : []));
  }
  return out;
})();

/** Every edge once: its two vertices and the two faces either side. */
export const EDGES: { a: number; b: number; f: [number, number] }[] = (() => {
  const out: { a: number; b: number; f: [number, number] }[] = [];
  FACES.forEach((f, fi) =>
    f.adj.forEach((gi) => {
      if (gi < fi) return;
      const sh = f.v.filter((x) => FACES[gi].v.includes(x));
      out.push({ a: sh[0], b: sh[1], f: [fi, gi] });
    }),
  );
  return out;
})();

/** A small deterministic generator (the generator never uses Math.random: same input, same bytes). */
export function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * The number on each face: opposite faces sum to 21 (as on a real d20), high numbers sit between low
 * ones (the 20 between 5, 8 and 12), and the five faces round each corner sum to about 52.5. Found
 * by a seeded search, so it is always the same layout.
 */
export const NUMBERS: number[] = (() => {
  const pairs: [number, number][] = [];
  FACES.forEach((f, i) => {
    if (i < f.opp) pairs.push([i, f.opp]);
  });
  const vf: number[][] = VERTS.map((_, vi) => FACES.flatMap((f, fi) => (f.v.includes(vi) ? [fi] : [])));
  const build = (val: number[], flip: boolean[]) => {
    const n = new Array(20).fill(0);
    pairs.forEach(([a, b], k) => {
      n[flip[k] ? b : a] = val[k];
      n[flip[k] ? a : b] = 21 - val[k];
    });
    return n;
  };
  const cost = (n: number[]) => {
    let c = 0;
    for (const fs of vf) c += (fs.reduce((s, f) => s + n[f], 0) - 52.5) ** 2;
    let spread = 0;
    for (const e of EDGES) spread += Math.abs(n[e.f[0]] - n[e.f[1]]);
    return c - 5 * spread;
  };
  const rnd = lcg(20);
  let best: number[] | null = null, bestC = Infinity;
  for (let restart = 0; restart < 24; restart++) {
    const val = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    for (let i = 9; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [val[i], val[j]] = [val[j], val[i]];
    }
    const flip = val.map(() => rnd() < 0.5);
    let cur = cost(build(val, flip));
    for (let it = 0; it < 4000; it++) {
      const a = Math.floor(rnd() * 10), b = Math.floor(rnd() * 10), doFlip = rnd() < 0.5;
      if (doFlip) flip[a] = !flip[a];
      else [val[a], val[b]] = [val[b], val[a]];
      const c = cost(build(val, flip));
      if (c <= cur) cur = c;
      else if (doFlip) flip[a] = !flip[a];
      else [val[a], val[b]] = [val[b], val[a]];
    }
    if (cur < bestC) {
      bestC = cur;
      best = build(val, flip);
    }
  }
  return best!;
})();
export const faceOf = (n: number): number => NUMBERS.indexOf(n);

/** The corner each face's number points to (its "up"): spread so neighbouring numbers turn different ways. */
export const UP: number[] = FACES.map((f, fi) => f.v[(fi * 7 + NUMBERS[fi]) % 3]);

/** The light: upper left and toward the eye (screen y points down). */
export const LIGHT: V3 = norm([-0.5, -0.66, 0.56]);
const HALF: V3 = norm([LIGHT[0], LIGHT[1], LIGHT[2] + 1]);

/** How far the landed die leans back, so the eye sees a little of it from above (degrees). */
export const REST_TILT = 14;

/** The rotation that lays face `fi` toward the eye with its number upright, leaning back REST_TILT. */
export function restRotation(fi: number): M3 {
  const f = FACES[fi];
  const up = norm(sub(VERTS[UP[fi]], scale(f.n, dot(VERTS[UP[fi]], f.n))));
  const row1 = scale(up, -1);
  const row2 = f.n;
  const row0 = cross(row1, row2);
  const align: M3 = [...row0, ...row1, ...row2];
  return mmul(axisAngle([1, 0, 0], REST_TILT), align);
}

// --- fonts ----------------------------------------------------------------------------------------

const rows = (s: string): string[] => s.split(' ');
/** 3x5 digits for the small die. */
export const DIGITS_S: Record<string, string[]> = {
  '0': rows('### #.# #.# #.# ###'),
  '1': rows('.#. ##. .#. .#. ###'),
  '2': rows('##. ..# .#. #.. ###'),
  '3': rows('##. ..# .#. ..# ##.'),
  '4': rows('#.# #.# ### ..# ..#'),
  '5': rows('### #.. ##. ..# ##.'),
  '6': rows('.## #.. ### #.# ###'),
  '7': rows('### ..# .#. .#. .#.'),
  '8': rows('### #.# ### #.# ###'),
  '9': rows('### #.# ### ..# ##.'),
};
/** The big die's digits: the HUD's round-number digits (6x10, 2-pixel strokes). */
export const DIGITS_L: Record<string, string[]> = FONTS.big.glyphs;

/** A number as a bitmap (1 pixel between digits); 6 and 9 get a bar under them, as on real dice. */
export function numberBitmap(n: number, big: boolean, bar = true): string[] {
  const font = big ? DIGITS_L : DIGITS_S;
  const gl = String(n).split('').map((d) => font[d]);
  const h = gl[0].length;
  const out: string[] = [];
  for (let y = 0; y < h; y++) out.push(gl.map((g) => g[y]).join('.'));
  if (bar && (n === 6 || n === 9)) {
    const w = out[0].length;
    out.push('.'.repeat(w));
    out.push(big ? '.' + '#'.repeat(w - 2) + '.' : '#'.repeat(w));
    if (big) out.push('.' + '#'.repeat(w - 2) + '.');
  }
  return out;
}

// --- styles ---------------------------------------------------------------------------------------

export type StyleId = 'gem' | 'ivory' | 'obsidian';
export const STYLE_IDS: StyleId[] = ['gem', 'ivory', 'obsidian'];

const H = (s: string): RGBA => hex(s);

/** Gold for a natural 20 (every style turns to it), from the HUD's bright gold. */
export const GOLD20 = ['#1a1004', '#3e2c0c', '#6b5420', '#958035', '#bca659', '#dcc87e', '#f0e2a6', '#fff6d6', '#ffffff'].map(H);
/** The dull red of a natural 1. */
export const DULL1 = ['#0f0606', '#2a0e0d', '#3f1714', '#55211c', '#6b2d25', '#7f3a30', '#93493c', '#a8604f', '#c27a68'].map(H);
export const WHITE = H('#ffffff');
/** The 20 left shining after a natural 20: a richer gold than any style's own numbers. */
export const NAT20_NUM = { ink: H('#ffd23c'), top: H('#fff8d8'), ring: H('#3a2200') };

export interface StyleDef {
  id: StyleId;
  /** Face ramp, darkest to lightest (index 0 is the outline). */
  ramp: RGBA[];
  /** Ramp index for a lit amount 0..1 (Lambert plus the style's extras). */
  tone: (lit: number, n: V3) => number;
  outline: RGBA;
  /** Colour of an edge between two visible faces, from their tones; null = no line. */
  edge: (t0: number, t1: number, lit: boolean, big: boolean) => RGBA | null;
  /** Colour of edges seen through the die (only the gem). */
  backEdge?: (tone: number) => RGBA | null;
  /** The landed number: fill, its lit top row, the ring round it. */
  num: { ink: RGBA; top: RGBA; ring: RGBA; glow?: RGBA };
  /** A number on a turning face, from that face's tone (what the eye sees through the turn). */
  faceNum: (tone: number) => RGBA;
  /** Light picked up by the most lit faces (glints): colour, or null. */
  glint?: RGBA;
  /** Halo colour for the result pop. */
  halo: RGBA;
  /** A thin light on the silhouette's upper-left inside edge (so a dark die reads on dark ground). */
  rim?: RGBA;
  /** Carved lines inset in every face (the obsidian's runes), big die only. */
  runes?: RGBA;
}

function gemStyle(): StyleDef {
  const ramp = gemKeys().map(H);
  return {
    id: 'gem',
    ramp,
    // A crystal: lit faces bright, and the faces turned away still glow where light comes through.
    tone: (lit, n) => {
      const through = Math.max(0, -dot(n, LIGHT)) * 0.55 + Math.max(0, n[1]) * 0.25;
      const v = Math.max(lit, through * 0.9) + 0.05;
      return v > 0.9 ? 7 : v > 0.72 ? 6 : v > 0.52 ? 5 : v > 0.34 ? 4 : v > 0.18 ? 3 : 2;
    },
    outline: ramp[0],
    edge: (t0, t1, lit) => (lit ? ramp[Math.min(8, Math.max(t0, t1) + 2)] : ramp[Math.min(t0, t1) <= 3 ? 5 : Math.min(8, Math.max(t0, t1) + 1)]),
    backEdge: (t) => ramp[Math.min(8, t + 1)],
    num: { ink: ramp[8], top: WHITE, ring: ramp[1] },
    faceNum: (t) => ramp[t >= 5 ? Math.min(8, t + 2) : Math.min(8, t + 3)],
    glint: WHITE,
    halo: ramp[6],
  };
}

function ivoryStyle(): StyleDef {
  // Warm ivory, a little aged; gold from the HUD frames.
  const ramp = ['#24180c', '#5a4a36', '#7e6c52', '#a39074', '#c5b496', '#ddd0b2', '#eee5cc', '#faf5e6'].map(H);
  const gold = GOLD20;
  return {
    id: 'ivory',
    ramp,
    tone: (lit) => (lit > 0.9 ? 7 : lit > 0.72 ? 6 : lit > 0.5 ? 5 : lit > 0.3 ? 4 : lit > 0.12 ? 3 : lit > -0.1 ? 2 : 1),
    outline: ramp[0],
    edge: (t0, t1, lit, big) => {
      const t = Math.max(t0, t1);
      if (!big) return lit ? gold[5] : gold[3];
      // Darker gold where it crosses bright ivory, brighter gold across the shadowed faces.
      return t >= 5 ? (lit ? gold[5] : gold[4]) : gold[5];
    },
    num: { ink: gold[5], top: gold[7], ring: H('#3e2c0c') },
    faceNum: (t) => (t >= 5 ? gold[3] : t >= 3 ? gold[2] : gold[2]),
    halo: gold[6],
  };
}

function obsidianStyle(): StyleDef {
  // Volcanic glass: near black with a cold violet sheen; the numbers are cut in and glow chakra blue.
  const ramp = ['#030206', '#0b0a12', '#13111d', '#1c1a2a', '#29263b', '#3a3551', '#544d70', '#7a7398'].map(H);
  return {
    id: 'obsidian',
    ramp,
    tone: (lit, n) => {
      const spec = Math.pow(Math.max(0, dot(n, HALF)), 18);
      const v = lit * 0.75 + spec * 0.9;
      return v > 0.92 ? 6 : v > 0.66 ? 5 : v > 0.45 ? 4 : v > 0.25 ? 3 : v > 0.05 ? 2 : 1;
    },
    outline: ramp[0],
    edge: (t0, t1, lit) => (lit ? ramp[Math.min(7, Math.max(t0, t1) + 2)] : Math.max(t0, t1) >= 4 ? ramp[Math.max(t0, t1) + 1] : null),
    num: { ink: H('#7fe0ff'), top: H('#e8fbff'), ring: H('#0a1b2e'), glow: H('#1f5f95') },
    faceNum: (t) => (t >= 4 ? H('#5ab8f0') : t >= 2 ? H('#3a8ed0') : H('#2a6aa8')),
    glint: H('#b8b0d8'),
    halo: H('#5ab8f0'),
    rim: H('#4a4466'),
    runes: H('#1d4f7c'),
  };
}

/** Colours the sheets use that never change with the caster's tint (gold of a 20, red of a 1, white). */
export const FIXED_COLOURS: string[] = [...GOLD20, ...DULL1, WHITE, NAT20_NUM.ink, NAT20_NUM.top, NAT20_NUM.ring].map((c) => '#' + c.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join(''));
/** The gem's key ramp as drawn in its sheets (the screen swaps these for the caster's ramp). */
export function gemKeys(): string[] {
  return diceGemKeys(FIXED_COLOURS);
}

export const STYLES: Record<StyleId, StyleDef> = { gem: gemStyle(), ivory: ivoryStyle(), obsidian: obsidianStyle() };

// --- the renderer ---------------------------------------------------------------------------------

/** How the die looks in a frame beyond its turn: the normal style, or a passing look. */
export type Look = 'normal' | 'flash' | 'gold' | 'dull' | 'dim';

export interface DieSpec {
  style: StyleId;
  /** Circumradius in pixels (the die is about 1.96 R tall when it lands). */
  R: number;
  rot: M3;
  /** Frame size; the die's centre is at the frame's centre unless `cx`/`cy` say otherwise. */
  w: number;
  h: number;
  cx?: number;
  cy?: number;
  /** Squash on contact: x and y scale, about the die's lowest point. */
  sx?: number;
  sy?: number;
  look?: Look;
  /** How far to the gold (0..1) for the 'gold' look; 'flash' is everything near white. */
  goldness?: number;
  /** Draw the number on this face upright and crisp (the landed face). */
  upright?: number;
  /** The landed number glows (result pop). */
  numberGlow?: boolean;
  /** The landed number in gold whatever the look (after a natural 20). */
  numberGold?: boolean;
  /** Skip the numbers on faces that are not the landed one. */
  plain?: boolean;
}

export interface Rendered {
  img: Img;
  /** Which face covers each pixel (-1 none). */
  faceAt: Int8Array;
  /** Screen corners of each face (projected), for effects. */
  proj: V3[];
  front: boolean[];
  centre: [number, number];
}

/** A look's ramp for a style: the normal ramp, or one pulled toward gold, white, dull red or shadow. */
function lookRamp(st: StyleDef, look: Look, goldness: number): RGBA[] {
  const r = st.ramp;
  if (look === 'normal') return r;
  if (look === 'gold' || look === 'flash') {
    const g = goldness;
    return r.map((c, i) => {
      // The gold ramp step with the same place in the ramp (outline stays dark).
      const gi = i === 0 ? 0 : Math.round(1 + ((i - 1) * 7) / Math.max(1, r.length - 2));
      const gc = look === 'flash' ? GOLD20[Math.min(8, gi + 2)] : GOLD20[Math.min(8, gi)];
      return g >= 1 ? gc : mixc(c, gc, g);
    });
  }
  if (look === 'dull') return r.map((_, i) => DULL1[i === 0 ? 0 : Math.round(1 + ((i - 1) * 7) / Math.max(1, r.length - 2))]);
  // dim: the same ramp in shadow, less colour (the die advantage did not keep).
  return r.map((c) => {
    const grey = (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) | 0;
    return [Math.round((c[0] * 0.35 + grey * 0.65) * 0.5), Math.round((c[1] * 0.35 + grey * 0.65) * 0.5), Math.round((c[2] * 0.35 + grey * 0.65) * 0.52), 255] as RGBA;
  });
}

const inTri = (px: number, py: number, a: V3, b: V3, c: V3): boolean => {
  const d1 = (px - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (py - b[1]);
  const d2 = (px - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (py - c[1]);
  const d3 = (px - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (py - a[1]);
  const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
};

/** Draws one die. */
export function renderDie(s: DieSpec): Rendered {
  const st = STYLES[s.style];
  const look = s.look ?? 'normal';
  const ramp = lookRamp(st, look, s.goldness ?? 1);
  const big = s.R >= 24;
  const img = new Img(s.w, s.h);
  const cx = s.cx ?? s.w / 2, cy = s.cy ?? s.h / 2;
  const sx = s.sx ?? 1, sy = s.sy ?? 1;
  // Turn and project the corners; squash about the lowest point.
  const rv = VERTS.map((v) => mul(s.rot, v));
  const bottom = Math.max(...rv.map((v) => v[1])) * s.R;
  const proj: V3[] = rv.map((v) => [cx + v[0] * s.R * sx, cy + bottom + (v[1] * s.R - bottom) * sy, v[2] * s.R]);
  const rn = FACES.map((f) => mul(s.rot, f.n));
  const front = rn.map((n) => n[2] > 1e-6);
  const faceAt = new Int8Array(s.w * s.h).fill(-1);
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++)
      for (let fi = 0; fi < 20; fi++) {
        if (!front[fi]) continue;
        const [a, b, c] = FACES[fi].v;
        if (inTri(x + 0.5, y + 0.5, proj[a], proj[b], proj[c])) {
          faceAt[y * s.w + x] = fi;
          break;
        }
      }
  const tone = rn.map((n) => st.tone(dot(n, LIGHT), n));
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= s.w || y >= s.h ? -1 : faceAt[y * s.w + x]);
  // Faces.
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      const fi = at(x, y);
      if (fi >= 0) img.set(x, y, ramp[tone[fi]]);
    }
  const lineOK = (x: number, y: number) => at(x, y) >= 0 && at(x - 1, y) >= 0 && at(x + 1, y) >= 0 && at(x, y - 1) >= 0 && at(x, y + 1) >= 0;
  const line = (p: V3, q: V3, paint: (x: number, y: number) => void) => {
    const dx = q[0] - p[0], dy = q[1] - p[1];
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
    let lx = -9999, ly = -9999;
    for (let k = 0; k <= n; k++) {
      const x = Math.floor(p[0] + (dx * k) / n), y = Math.floor(p[1] + (dy * k) / n);
      if (x === lx && y === ly) continue;
      lx = x;
      ly = y;
      paint(x, y);
    }
  };
  // Edges seen through a crystal: faint lines inside the front faces.
  if (st.backEdge && look !== 'dull')
    for (const e of EDGES) {
      if (front[e.f[0]] || front[e.f[1]]) continue;
      line(proj[e.a], proj[e.b], (x, y) => {
        const fi = at(x, y);
        if (fi < 0 || !lineOK(x, y)) return;
        const c = st.backEdge!(tone[fi]);
        if (c) img.set(x, y, lookRamp(st, look, s.goldness ?? 1)[st.ramp.indexOf(c)] ?? c);
      });
    }
  // Edges between visible faces.
  for (const e of EDGES) {
    const [f0, f1] = e.f;
    if (!front[f0] || !front[f1]) continue;
    // An edge is "lit" when its outward direction leans to the light.
    const mid = norm([rn[f0][0] + rn[f1][0], rn[f0][1] + rn[f1][1], rn[f0][2] + rn[f1][2]]);
    const lit = dot(mid, LIGHT) > 0.62;
    let c = st.edge(tone[f0], tone[f1], lit, big);
    if (!c) continue;
    if (look !== 'normal') {
      const i = st.ramp.findIndex((r) => r.every((v, k) => v === c![k]));
      if (i >= 0) c = ramp[i];
      else if (look === 'dim') c = lookRamp({ ...st, ramp: [c] }, 'dim', 1)[0];
      else if (look === 'dull') c = DULL1[6];
      else if (look === 'flash') c = GOLD20[8];
    }
    line(proj[e.a], proj[e.b], (x, y) => {
      if (at(x, y) >= 0 && lineOK(x, y)) img.set(x, y, c!);
    });
  }
  // Runes: a broken carved line round the inside of every face, glowing faintly.
  if (st.runes && big && (look === 'normal' || look === 'gold' || look === 'flash')) {
    const rc = look === 'normal' ? st.runes : GOLD20[look === 'flash' ? 6 : 4];
    const DASH = [1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0];
    for (let fi = 0; fi < 20; fi++) {
      if (!front[fi] || rn[fi][2] < 0.3) continue;
      const P = FACES[fi].v.map((i) => proj[i]);
      const g: V3 = [(P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3, 0];
      // Inset by about 3 pixels of the face's own size.
      const size = Math.max(...P.map((p) => Math.hypot(p[0] - g[0], p[1] - g[1])));
      const k = Math.max(0.55, 1 - 4.2 / Math.max(1, size));
      const Q = P.map((p) => [g[0] + (p[0] - g[0]) * k, g[1] + (p[1] - g[1]) * k, 0] as V3);
      let step = fi * 3;
      for (let e = 0; e < 3; e++)
        line(Q[e], Q[(e + 1) % 3], (x, y) => {
          if (at(x, y) !== fi || !lineOK(x, y)) return;
          if (DASH[step++ % DASH.length]) img.set(x, y, mixc(img.get(x, y), rc, 0.75));
        });
    }
  }
  // Rim light on the silhouette's upper-left inside edge.
  if (st.rim && look !== 'dull' && look !== 'flash') {
    const rc = look === 'dim' ? lookRamp({ ...st, ramp: [st.rim] }, 'dim', 1)[0] : look === 'gold' ? GOLD20[5] : st.rim;
    for (let y = 0; y < s.h; y++)
      for (let x = 0; x < s.w; x++) {
        if (at(x, y) < 0) continue;
        const up = at(x, y - 1) < 0, left = at(x - 1, y) < 0;
        const down = at(x, y + 1) < 0, right = at(x + 1, y) < 0;
        if ((up || left) && !down && !right && (up ? 1 : 0) + (left ? 1 : 0) >= 1 && x + y < s.w + s.h * 0.15 - 6) img.set(x, y, rc);
      }
  }
  // Glints: the face that catches the light most gets a short bright streak.
  if (st.glint && (look === 'normal' || look === 'gold')) {
    let bf = -1, bv = -1;
    rn.forEach((n, fi) => {
      if (!front[fi]) return;
      const v = dot(n, HALF);
      if (v > bv) {
        bv = v;
        bf = fi;
      }
    });
    if (bf >= 0 && bv > 0.82) {
      const [a, b, c] = FACES[bf].v.map((i) => proj[i]);
      const gx = (a[0] + b[0] + c[0]) / 3, gy = (a[1] + b[1] + c[1]) / 3;
      const L = big ? 4 : 1;
      for (let k = -L; k <= L; k++) {
        const x = Math.floor(gx - 2 + k * 0.7), y = Math.floor(gy - 2 - k * 0.7);
        if (at(x, y) === bf && lineOK(x, y)) img.set(x, y, k === 0 || Math.abs(k) < L ? st.glint! : ramp[Math.min(ramp.length - 1, tone[bf] + 1)]);
      }
    }
  }
  // Numbers.
  const numCol = (c: RGBA): RGBA => {
    if (look === 'normal') return c;
    if (look === 'gold' || look === 'flash') return GOLD20[look === 'flash' ? 8 : 7];
    if (look === 'dull') return DULL1[1];
    return lookRamp({ ...st, ramp: [c] }, 'dim', 1)[0];
  };
  for (let fi = 0; fi < 20; fi++) {
    if (!front[fi]) continue;
    const n = rn[fi];
    const upright = s.upright === fi;
    const f = FACES[fi];
    const cen = (FACES[fi].v.map((i) => proj[i]).reduce((acc, p) => [acc[0] + p[0] / 3, acc[1] + p[1] / 3, 0] as V3, [0, 0, 0] as V3));
    const bmp = numberBitmap(NUMBERS[fi], big, big && !upright);
    const bw = bmp[0].length, bh = bmp.length;
    // The digits sit a pixel under the face's centre, where an upward triangle has the most room.
    const drop = big ? 0.5 : 1;
    if (upright) {
      drawUpright(img, bmp, cen[0], cen[1] + drop * sy, st, look, s.numberGlow ?? false, at, fi, big, s.numberGold ?? false);
      continue;
    }
    if (s.plain) continue;
    // Small faces are too steep to read: leave them bare.
    if (n[2] < (big ? 0.42 : 0.93)) continue;
    const upW = mul(s.rot, norm(sub(VERTS[UP[fi]], scale(f.n, dot(VERTS[UP[fi]], f.n)))));
    const rightW = cross(rn[fi], upW);
    const downW = scale(upW, -1);
    const col = numCol(st.faceNum(tone[fi]));
    // Inverse map each pixel of the face into the digits' grid (4x4 samples, ink above 40%).
    for (let y = 0; y < s.h; y++)
      for (let x = 0; x < s.w; x++) {
        if (at(x, y) !== fi || !lineOK(x, y)) continue;
        let hits = 0;
        for (let sy4 = 0; sy4 < 4; sy4++)
          for (let sx4 = 0; sx4 < 4; sx4++) {
            const X = x + (sx4 + 0.5) / 4, Y = y + (sy4 + 0.5) / 4;
            // Undo the squash, then step onto the face's plane.
            const ux = cx + (X - cx) / sx, uy = cy + bottom + (Y - cy - bottom) / sy;
            const ccx = cx + mul(s.rot, f.c)[0] * s.R, ccy = cy + mul(s.rot, f.c)[1] * s.R, ccz = mul(s.rot, f.c)[2] * s.R;
            const dz = -(n[0] * (ux - ccx) + n[1] * (uy - ccy)) / n[2];
            const d: V3 = [ux - ccx, uy - ccy, dz + ccz - ccz];
            const gx = dot(d, rightW) + bw / 2, gy = dot(d, downW) + bh / 2 - drop;
            const ix = Math.floor(gx), iy = Math.floor(gy);
            if (ix >= 0 && iy >= 0 && ix < bw && iy < bh && bmp[iy][ix] === '#') hits++;
          }
        if (hits >= 7) img.set(x, y, col);
      }
  }
  // The outline: every empty pixel touching the die (4-neighbours).
  const oc = look === 'flash' ? GOLD20[2] : look === 'gold' ? mixc(st.outline, GOLD20[0], s.goldness ?? 1) : look === 'dull' ? DULL1[0] : st.outline;
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      if (at(x, y) >= 0) continue;
      if (at(x - 1, y) >= 0 || at(x + 1, y) >= 0 || at(x, y - 1) >= 0 || at(x, y + 1) >= 0) img.set(x, y, oc);
    }
  return { img, faceAt, proj, front, centre: [cx, cy] };
}

/** The landed number: crisp digits with a ring, a lit top row, and for obsidian a glow in the groove. */
function drawUpright(img: Img, bmp: string[], ccx: number, ccy: number, st: StyleDef, look: Look, glow: boolean, at: (x: number, y: number) => number, fi: number, big: boolean, gold20: boolean): void {
  const bw = bmp[0].length, bh = bmp.length;
  const x0 = Math.round(ccx - bw / 2), y0 = Math.round(ccy - bh / 2);
  const ink = (x: number, y: number) => x >= 0 && y >= 0 && x < bw && y < bh && bmp[y][x] === '#';
  let { ink: fill, top, ring } = st.num;
  let halo = st.num.glow;
  if (look === 'gold' || look === 'flash') {
    fill = look === 'flash' ? GOLD20[8] : GOLD20[7];
    top = GOLD20[8];
    ring = GOLD20[1];
    halo = st.id === 'obsidian' ? GOLD20[4] : undefined;
  } else if (look === 'dull') {
    fill = DULL1[2];
    top = DULL1[3];
    ring = DULL1[0];
    halo = undefined;
  } else if (look === 'dim') {
    const d = (c: RGBA) => lookRamp({ ...st, ramp: [c] }, 'dim', 1)[0];
    fill = d(fill);
    top = d(top);
    ring = d(ring);
    halo = undefined;
  }
  if (glow && look === 'normal') {
    fill = top;
  }
  if (gold20 && look !== 'flash' && look !== 'dim') {
    ({ ink: fill, top, ring } = NAT20_NUM);
    halo = st.id === 'obsidian' ? GOLD20[3] : undefined;
  }
  // A soft halo (obsidian's glowing groove): the ring pixels' outer neighbours, where the face is.
  if (halo)
    for (let y = -2; y <= bh + 1; y++)
      for (let x = -2; x <= bw + 1; x++) {
        if (ink(x, y)) continue;
        let near = false, ring1 = false;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (ink(x + dx, y + dy)) ring1 = true;
        if (ring1) continue;
        for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 2 && ink(x + dx, y + dy)) near = true;
        if (near && big && at(x0 + x, y0 + y) === fi) img.set(x0 + x, y0 + y, mixc(img.get(x0 + x, y0 + y), halo, 0.55));
      }
  for (let y = -1; y <= bh; y++)
    for (let x = -1; x <= bw; x++) {
      if (ink(x, y)) {
        img.set(x0 + x, y0 + y, !ink(x, y - 1) && big ? top : fill);
        continue;
      }
      let n = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (ink(x + dx, y + dy)) n = true;
      if (n && at(x0 + x, y0 + y) >= 0) img.set(x0 + x, y0 + y, halo && !big ? mixc(ring, halo, 0.5) : ring);
    }
}

/** A copy of `img` with every pixel of colour from[i] turned to to[i] (how the screen tints a gem). */
export function recolour(img: Img, from: string[], to: string[]): Img {
  const map = new Map<number, RGBA>();
  from.forEach((f, i) => {
    const c = hex(f);
    map.set((c[0] << 16) | (c[1] << 8) | c[2], hex(to[i]));
  });
  const o = img.clone();
  for (let i = 0; i < o.px.length; i += 4) {
    if (!o.px[i + 3]) continue;
    const t = map.get((o.px[i] << 16) | (o.px[i + 1] << 8) | o.px[i + 2]);
    if (t) {
      o.px[i] = t[0];
      o.px[i + 1] = t[1];
      o.px[i + 2] = t[2];
    }
  }
  return o;
}
