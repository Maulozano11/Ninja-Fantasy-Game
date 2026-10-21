// The d20 dice art: a true icosahedron (20 triangular faces, opposite faces summing to 21) turned
// in 3D, seen in a mild perspective and drawn as pixel art, one small palette per material. Each
// pixel is lit from a lamp at the upper left, so light runs across a face and a glint moves as the
// die turns; the edges are rounded (the normal bends over them, catching a thin highlight line);
// the numbers are engraved (the groove's near wall in shadow, its far wall lit, the paint inside),
// and upright, centred and crisp on the face that lands on top. A 1-pixel dark outline goes round.
//
// Three styles (the owner chose all three, the player picks one in the main menu):
//   gem       "Gema": a see-through crystal in the caster's chakra colour (key ramp, swapped on screen):
//             the eye's ray is refracted inside, the crystal darkens where it is thick, the faces
//             turned from the light glow with the light leaving them, the back edges show through
//   ivory     "Marfil y oro": warm semi-gloss ivory with a faint grain, a gold inlay on the edges
//             and gold in the engraved numbers, like the HUD frames
//   obsidian  "Obsidiana rúnica": black glass reflecting a sharp sky, a hard glint, faint carved
//             rune lines, and numbers cut in that glow chakra blue
//
// Everything here is pure drawing on Img (tools/ui/ui-img.ts); the generator (dice-d20.ts) lays the
// frames out in sheets and the mockup tool (dice-d20-mock.ts) puts them over the battle screen.

import { Img, RGBA, hex, mixc } from './ui-img';
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

// --- numbers ---------------------------------------------------------------------------------------

const rows = (s: string): string[] => s.split(' ');
/** 3x5 digits for the small die (one pixel strokes: too small to engrave). */
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

/** A number as a bitmap in the small digits (1 pixel between digits); 6 and 9 get a bar under them. */
export function numberBitmap(n: number, bar = true): string[] {
  const gl = String(n).split('').map((d) => DIGITS_S[d]);
  const out: string[] = [];
  for (let y = 0; y < 5; y++) out.push(gl.map((g) => g[y]).join('.'));
  if (bar && (n === 6 || n === 9)) {
    out.push('.'.repeat(out[0].length));
    out.push('#'.repeat(out[0].length));
  }
  return out;
}

// The big die's digits are strokes (a centre line and a width), so they can be engraved: the groove
// is shaded from the direction its wall faces, and they lie on any face in perspective. A glyph's box
// is 6 wide and 10 tall (y down); arcs are in degrees, 0 = right, 90 = down.
type Seg = [number, number, number, number];
function arc(cx: number, cy: number, r: number, a0: number, a1: number, rx = r): Seg[] {
  const n = Math.max(4, Math.ceil(Math.abs(a1 - a0) / 15));
  const out: Seg[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180, t1 = ((a0 + ((a1 - a0) * (i + 1)) / n) * Math.PI) / 180;
    out.push([cx + rx * Math.cos(t0), cy + r * Math.sin(t0), cx + rx * Math.cos(t1), cy + r * Math.sin(t1)]);
  }
  return out;
}
const ln = (x0: number, y0: number, x1: number, y1: number): Seg[] => [[x0, y0, x1, y1]];
const GLYPH: Record<string, Seg[]> = {
  '0': [...arc(3, 3.1, 2, 180, 360, 1.9), ...ln(4.9, 3.1, 4.9, 6.9), ...arc(3, 6.9, 2, 0, 180, 1.9), ...ln(1.1, 6.9, 1.1, 3.1)],
  '1': [...ln(3.3, 1.1, 3.3, 8.9), ...ln(3.3, 1.1, 1.5, 2.7), ...ln(1.4, 8.9, 5, 8.9)],
  '2': [...arc(3, 3.1, 2, 195, 375, 1.9), ...ln(4.84, 3.62, 1.1, 8.9), ...ln(1.1, 8.9, 4.95, 8.9)],
  '3': [...arc(3, 3, 1.9, 200, 450, 1.85), ...arc(3, 6.95, 1.95, 270, 520, 1.95)],
  '4': [...ln(4, 8.9, 4, 1.1), ...ln(4, 1.1, 1.05, 6.4), ...ln(1.05, 6.4, 5.2, 6.4)],
  '5': [...ln(4.85, 1.1, 1.35, 1.1), ...ln(1.35, 1.1, 1.2, 4.75), ...arc(3, 6.75, 2.15, 220, 500, 1.95)],
  '6': [...arc(3, 6.85, 2.05, 0, 360, 1.9), ...arc(5.2, 6.3, 5.2, 180, 250, 4.1)],
  '7': [...ln(1.05, 1.1, 4.9, 1.1), ...ln(4.9, 1.1, 2.2, 8.9)],
  '8': [...arc(3, 3.05, 1.95, 0, 360, 1.75), ...arc(3, 7, 1.95, 0, 360, 1.95)],
  '9': [...arc(3, 3.15, 2.05, 0, 360, 1.9), ...arc(0.8, 3.7, 5.2, 0, 70, 4.1)],
};
/** Half the stroke width, in glyph units. */
const STROKE = 1.08;
/** Digit advance, in glyph units. */
const ADVANCE = 7.1;

interface GlyphText {
  segs: Seg[];
  /** Box: centred on (0, 0). */
  w: number;
  h: number;
}
/** A number's strokes, centred on (0, 0); 6 and 9 get a bar under them (as on real dice). */
export function textSegs(n: number, bar = true): GlyphText {
  const s = String(n);
  const w = 6 + (s.length - 1) * ADVANCE;
  const withBar = bar && (n === 6 || n === 9);
  const h = withBar ? 12.4 : 10;
  const segs: Seg[] = [];
  s.split('').forEach((d, i) => {
    for (const g of GLYPH[d]) segs.push([g[0] + i * ADVANCE - w / 2, g[1] - h / 2, g[2] + i * ADVANCE - w / 2, g[3] - h / 2]);
  });
  if (withBar) segs.push([1.2 - w / 2, 12.3 - h / 2 - STROKE * 0.3, 4.8 - w / 2, 12.3 - h / 2 - STROKE * 0.3]);
  return { segs, w, h };
}
function segDist(u: number, v: number, s: Seg): number {
  const dx = s[2] - s[0], dy = s[3] - s[1];
  const l2 = dx * dx + dy * dy || 1e-9;
  const t = Math.max(0, Math.min(1, ((u - s[0]) * dx + (v - s[1]) * dy) / l2));
  return Math.hypot(u - s[0] - t * dx, v - s[1] - t * dy);
}
function glyphDist(t: GlyphText, u: number, v: number): number {
  if (Math.abs(u) > t.w / 2 + 3 || Math.abs(v) > t.h / 2 + 3) return 99;
  let d = 99;
  for (const s of t.segs) d = Math.min(d, segDist(u, v, s));
  return d;
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
export const NAT20_NUM = { ink: H('#ffd23c'), lit: H('#fff8d8'), shadow: H('#8a5a00') };
const NAT20_ON_IVORY = { ink: H('#c98a00'), lit: H('#ffe27a'), shadow: H('#3e2c0c') };
/** The 1 of a natural 1: a bright red with a dark rim, so it reads on any die, even the small one. */
export const NAT1_NUM = { ink: H('#ff5a46'), lit: H('#ffb4a4'), shadow: H('#4a0a06') };

/** Ivory, warm and a little aged, darkest to lightest. */
const IVORY = ['#2a1d10', '#4a3824', '#6a5538', '#88714f', '#a38c67', '#bba57f', '#cfba95', '#dfcdaa', '#ebdcbe', '#f4ead3', '#fbf5e7'].map(H);
/** The ivory's gold inlay: the HUD's gold ramp. */
const INLAY = GOLD20;
/** Volcanic glass: near black, a cold violet sheen, the sky's reflection up to a pale lavender. */
const OBSIDIAN = ['#030206', '#08070d', '#0e0c16', '#15131f', '#1e1b2c', '#2a263b', '#3a3551', '#504a6b', '#6e688c', '#9690b4', '#cdc8e6', '#f2f0fb'].map(H);
/** The obsidian's engraved runes: chakra-blue light in the grooves. */
const RUNE = ['#081626', '#0d2740', '#14416a', '#1f5f95', '#3a8ed0', '#5ab8f0', '#9fe4ff', '#e6faff'].map(H);

export interface StyleDef {
  id: StyleId;
  /** Every colour the style draws with (smear frames snap back to these). */
  palette: RGBA[];
  outline: RGBA;
  /** Halo colour for the result pop. */
  halo: RGBA;
}

/** Colours the sheets use that never change with the caster's tint (gold of a 20, red of a 1, white). */
export const FIXED_COLOURS: string[] = [...GOLD20, ...DULL1, WHITE, NAT20_NUM.ink, NAT20_NUM.lit, NAT20_NUM.shadow, NAT1_NUM.ink, NAT1_NUM.lit, NAT1_NUM.shadow].map((c) => '#' + c.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join(''));
/** The gem's key ramp as drawn in its sheets (the screen swaps these for the caster's ramp). */
export function gemKeys(): string[] {
  return diceGemKeys(FIXED_COLOURS);
}
const GEMK = gemKeys().map(H);

export const STYLES: Record<StyleId, StyleDef> = {
  gem: { id: 'gem', palette: [...GEMK, WHITE], outline: GEMK[0], halo: GEMK[8] },
  ivory: { id: 'ivory', palette: [...IVORY, ...INLAY], outline: H('#1a1209'), halo: GOLD20[6] },
  obsidian: { id: 'obsidian', palette: [...OBSIDIAN, ...RUNE], outline: OBSIDIAN[0], halo: RUNE[5] },
};

// --- light and camera -------------------------------------------------------------------------------

/** The light: upper left and toward the eye (screen y points down). */
export const LIGHT: V3 = norm([-0.5, -0.66, 0.56]);
/**
 * The lamp's position (in die radii): close enough that the light changes across a face. Each
 * material catches it a little differently placed, so the glints are not one pasted-on mark.
 */
const LAMPS: Record<StyleId, V3> = { gem: [-2.5, -3.2, 3.4], ivory: [-2.5, -3.2, 3.4], obsidian: [-1.3, -3.7, 2.9] };
/** The camera's distance (in die radii): a mild perspective, the near corners a little larger. */
const CAM = 6.5;
/** The light's direction on the screen (for engraved grooves). */
const LS: V3 = norm([-0.6, -0.8, 0]);

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

/** For each face, the face across each of its three edges (edge k runs from v[k] to v[k+1]). */
const ACROSS: number[][] = FACES.map((f) =>
  [0, 1, 2].map((k) => {
    const a = f.v[k], b = f.v[(k + 1) % 3];
    return f.adj.find((gi) => FACES[gi].v.includes(a) && FACES[gi].v.includes(b))!;
  }),
);

/** 4x4 ordered dither, 0..1. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** A smooth, fixed noise in 3D (for the ivory's grain): the same on the die however it turns. */
function vnoise(x: number, y: number, z: number): number {
  const h = (i: number, j: number, k: number) => {
    let n = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 2147483647);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const fx = x - xi, fy = y - yi, fz = z - zi;
  const s = (t: number) => t * t * (3 - 2 * t);
  const ux = s(fx), uy = s(fy), uz = s(fz);
  let r = 0;
  for (let dz = 0; dz <= 1; dz++)
    for (let dy = 0; dy <= 1; dy++)
      for (let dx = 0; dx <= 1; dx++) r += h(xi + dx, yi + dy, zi + dz) * (dx ? ux : 1 - ux) * (dy ? uy : 1 - uy) * (dz ? uz : 1 - uz);
  return r;
}

// --- the renderer ---------------------------------------------------------------------------------

/** How the die looks in a frame beyond its turn: the normal style, or a passing look. */
export type Look = 'normal' | 'flash' | 'gold' | 'dull' | 'dim';

export interface DieSpec {
  style: StyleId;
  /** Circumradius in pixels (the die is about 1.9 R tall when it lands). */
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
  /**
   * Draw only this face's number (the throw: a number seen in the air that is not the result,
   * a 20 above all, would read as the roll and then cheat the player).
   */
  only?: number;
  /** The landed number in a bright red whatever the look (a natural 1, so it reads even small). */
  numberRed?: boolean;
}

export interface Rendered {
  img: Img;
  /** Which face covers each pixel (-1 none). */
  faceAt: Int8Array;
  /** What part of a number each pixel is (0 none; see Ink). */
  inkAt: Uint8Array;
  /** Screen corners of each face (projected), for effects. */
  proj: V3[];
  front: boolean[];
  centre: [number, number];
}

/** What a pixel of a number is: 0 none, 1 paint, 2 the groove wall in shadow, 3 the lit wall, 4 glow round it. */
type Ink = 0 | 1 | 2 | 3 | 4;

interface Px {
  x: number;
  y: number;
  fi: number;
  /** The point on the die, its face normal, the normal bent round the rounded edges, and the eye. */
  P: V3;
  n: V3;
  nb: V3;
  V: V3;
  L: V3;
  diff: number;
  /** Distance to the nearest edge of the face (screen pixels). */
  edge: number;
  ink: Ink;
  /** Ordered dither threshold for this pixel (0.5 when the die is too small to dither). */
  b: number;
  big: boolean;
  /** The point in the die's own frame (for grain that turns with it). */
  Po: V3;
  R: number;
  rn: V3[];
  rc: V3[];
}

const reflect = (d: V3, n: V3): V3 => sub(d, scale(n, 2 * dot(d, n)));
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
/** Picks a ramp step for a value 0..1 with the pixel's dither. */
function step(v: number, lo: number, hi: number, b: number, amount: number): number {
  return clamp(Math.floor(lo + v * (hi - lo + 1) + (b - 0.5) * amount), lo, hi);
}
const blinn = (p: Px, power: number): number => Math.pow(Math.max(0, dot(p.nb, norm([p.L[0] + p.V[0], p.L[1] + p.V[1], p.L[2] + p.V[2]]))), power);

/** Ivory with a gold inlay: a semi-gloss bone with a fine grain, gold numbers and gold-lined edges. */
function shadeIvory(p: Px): RGBA {
  const spec = blinn(p, p.big ? 120 : 40);
  const gw = p.big ? 1.15 : 0.6;
  // The small die's digits are too small to engrave: dark bronze, so they read on the bone.
  if (p.ink && !p.big) return INLAY[1];
  if (p.ink) {
    // Old gold deep in an engraved groove: the near wall in dark shadow, the far wall catching the
    // light. Dark enough to read on the pale bone at a glance.
    if (p.ink === 2) return INLAY[0];
    if (p.ink === 3) return INLAY[spec > 0.4 ? 7 : 6];
    return INLAY[step(0.1 + 0.4 * p.diff + 0.5 * spec, 2, 4, p.b, 0.3)];
  }
  if (p.edge < gw) {
    // The inlay: lit, but never a flat white stripe.
    const g = 0.15 + 0.55 * p.diff + 0.8 * blinn(p, 20);
    return INLAY[step(g, 2, 7, p.b, p.big ? 0.4 : 0)];
  }
  const sky = 0.5 - 0.5 * p.nb[1];
  // Growth lines in the bone: long, faint, wavy bands through the die.
  const grain = p.big ? (vnoise(p.Po[0] * 3, p.Po[1] * 18 + vnoise(p.Po[0] * 4, p.Po[2] * 4, 3) * 4, p.Po[2] * 3) - 0.5) * 0.07 : 0;
  // A little patina next to the inlay, where wear does not polish it.
  const patina = p.big && p.edge < gw + 1.4 ? -0.05 : 0;
  // Bone lets a little light through: its shadows stay warm and never go black.
  const v = 0.2 + 0.5 * p.diff + 0.16 * sky + 0.35 * spec + grain + patina;
  return IVORY[step(v, 1, 10, p.b, p.big ? 0.3 : 0)];
}

/** Obsidian: black glass with the sky's sharp reflection, a hard glint, and runes glowing in the grooves. */
function shadeObsidian(p: Px): RGBA {
  if (p.ink === 1) return RUNE[p.big ? 5 : 6];
  if (p.ink === 3) return RUNE[7];
  if (p.ink === 2) return RUNE[3];
  const R = reflect(scale(p.V, -1), p.nb);
  // The sky: a bright window up and to the left, a soft band at the horizon, the dark ground below.
  const up = -R[1];
  let env = up > 0.3 && R[0] < 0.3 ? 0.7 + 0.3 * Math.min(1, (up - 0.3) * 2.2) : up > 0.02 ? 0.26 + 0.3 * (up - 0.02) : 0.03;
  if (R[2] < 0) env *= 0.5;
  const facing = Math.max(0, dot(p.nb, p.V));
  const fres = 0.1 + 0.9 * Math.pow(1 - facing, 3);
  const spec = blinn(p, p.big ? 400 : 300);
  // The small die is lit more broadly, so its faces part from each other at a glance.
  let v = p.big ? 0.05 + 0.12 * p.diff + fres * env * 1.1 + spec * 1.3 : 0.06 + 0.62 * p.diff ** 1.4 + fres * env * 0.7 + spec * 1.3;
  if (p.ink === 4) {
    // The glow round a rune spills onto the glass.
    return RUNE[v > 0.5 ? 3 : 1];
  }
  // Faint carved rune lines inset along the edges of the big die's faces: one unbroken groove.
  if (p.big && p.edge > 3.3 && p.edge < 4.1 && dot(p.n, p.V) > 0.35) return v > 0.45 ? RUNE[3] : RUNE[2];
  // The small die's edges catch a thin line of the sky where they face up (its form at 1x).
  if (!p.big && p.edge < 0.75 && p.nb[1] < -0.2) return OBSIDIAN[v > 0.3 ? 8 : 7];
  if (spec > 0.9) return OBSIDIAN[11];
  v = Math.min(v, 1);
  return OBSIDIAN[step(v, 1, 10, p.b, p.big ? 0.25 : 0)];
}

/** The gem: see-through, darker where it is thick, lit from inside where the light leaves it. */
function shadeGem(p: Px): RGBA {
  const K = GEMK;
  if (p.ink === 1) return K[10];
  if (p.ink === 3) return WHITE;
  if (p.ink === 2) return K[6];
  // Refract the eye's ray into the crystal and find where it leaves (the die is convex).
  const eta = 1 / 1.6;
  const I = scale(p.V, -1);
  const c = -dot(p.nb, I);
  const k = 1 - eta * eta * (1 - c * c);
  const T = norm(k < 0 ? reflect(I, p.nb) : sub(scale(I, eta), scale(p.nb, eta * c - Math.sqrt(k))));
  let tBest = 99, ef = -1;
  for (let fi = 0; fi < 20; fi++) {
    const nf = p.rn[fi];
    const dn = dot(nf, T);
    if (dn <= 1e-6) continue;
    const t = (dot(nf, p.rc[fi]) - dot(nf, p.P)) / dn;
    if (t > 1e-4 && t < tBest) {
      tBest = t;
      ef = fi;
    }
  }
  const ne = ef >= 0 ? p.rn[ef] : p.n;
  const E: V3 = [p.P[0] + T[0] * tBest, p.P[1] + T[1] * tBest, p.P[2] + T[2] * tBest];
  // Light passing through comes out of the faces turned away from the lamp: they glow.
  const through = Math.max(0, dot(ne, scale(LIGHT, -1)));
  const absorb = Math.exp(-0.75 * Math.min(2, tBest));
  const inner = (0.12 + 0.88 * through * through) * absorb;
  const facing = Math.max(0, dot(p.nb, p.V));
  const fres = Math.pow(1 - facing, 3);
  let v = (p.big ? 0.04 : 0.12) + 0.78 * inner + 0.22 * p.diff + 0.5 * fres;
  // The edges at the back show through, bent by the refraction.
  if (ef >= 0) {
    const f = FACES[ef];
    const lineW = (p.big ? 1.1 : 0.9) / p.R;
    for (let e = 0; e < 3; e++) {
      const a = mul(ROT_CUR, VERTS[f.v[e]]), bb = mul(ROT_CUR, VERTS[f.v[(e + 1) % 3]]);
      const ab = sub(bb, a), ae = sub(E, a);
      const t = clamp(dot(ae, ab) / dot(ab, ab), 0, 1);
      if (len(sub(ae, scale(ab, t))) < lineW) {
        v += 0.16;
        break;
      }
    }
  }
  // A caustic: where the light leaving the back gathers, a few bright sparks.
  if (through > 0.92 && absorb > 0.3 && ((p.x * 7 + p.y * 3) % 11 === 0)) return K[10];
  const spec = blinn(p, p.big ? 300 : 260);
  if (spec > 0.7) return WHITE;
  if (spec > 0.35) return K[10];
  return K[step(Math.min(1, v), 1, 9, p.b, p.big ? 0.22 : 0)];
}
/** The rotation being drawn (the gem looks up its back edges with it). */
let ROT_CUR: M3 = IDENTITY;

const SHADERS: Record<StyleId, (p: Px) => RGBA> = { gem: shadeGem, ivory: shadeIvory, obsidian: shadeObsidian };

const inTri = (px: number, py: number, a: number[], b: number[], c: number[]): boolean => {
  const d1 = (px - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (py - b[1]);
  const d2 = (px - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (py - c[1]);
  const d3 = (px - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (py - a[1]);
  const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
};

const lum = (c: RGBA) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;

const same = (a: RGBA, b: RGBA) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const RUNE_SET = new Set(RUNE.map((c) => (c[0] << 16) | (c[1] << 8) | c[2]));
const isRune = (c: RGBA) => RUNE_SET.has((c[0] << 16) | (c[1] << 8) | c[2]);

/** Where a pixel sits on the die, for the looks that treat the edges and numbers apart. */
interface LookAt {
  /** Distance to the face's edge (pixels). */
  edge: number;
  /** Part of a number (any face's): 0 none, 1 paint, 2 the groove's shadowed wall, 3 its lit wall, 4 the glow round it. */
  ink: number;
  big: boolean;
}

/**
 * A look's colour for a pixel drawn in the style's colour `c`. Each material keeps itself through a
 * natural 20 or 1 (the review: the three must not turn into one gold or one red die):
 *   gold  ivory warms to gold; the gem stays crystal in its chakra colour with gold-lit edges; the
 *         obsidian stays black glass, its runes and edges burning gold
 *   dull  ivory stains a dull red-brown; the gem clouds over (darker steps of its own keys); the
 *         obsidian's runes die to a dull ember red
 *   flash one bright gold frame, the same for all (the moment of the 20)
 *   dim   the die advantage did not keep: in shadow, less colour (the obsidian lifted to slate)
 */
function lookColour(st: StyleDef, look: Look, c: RGBA, goldness: number, b: number, at: LookAt = { edge: 99, ink: 0, big: false }): RGBA {
  if (look === 'normal') return c;
  const ls = st.palette.map(lum);
  const lo = Math.min(...ls), hi = Math.max(...ls);
  const t0 = (lum(c) - lo) / Math.max(1, hi - lo);
  const edgeW = at.big ? 1.7 : 0.8;
  if (look === 'flash') return GOLD20[clamp(Math.round(1 + (0.4 + 0.6 * t0) * 7) + 2, 1, 8)];
  if (look === 'gold') {
    const gi = clamp(Math.round(1 + t0 * 7), 1, 8);
    if (st.id === 'ivory') return mixc(c, GOLD20[gi], goldness * 0.85);
    // Gem and obsidian: the edges (and the obsidian's runes) take the gold; part-way by dither, so a
    // gem keeps its key colours for the screen's recolouring.
    const lit = at.edge < edgeW || (st.id === 'obsidian' && (at.ink > 0 || isRune(c)));
    // `b` is the gold's wipe here (see renderDie): it drains away cleanly, never as a checkerboard.
    if (!lit || b >= goldness) return c;
    // The obsidian's numbers keep their contrast in gold: bright paint, a dark gold glow round it
    // (all of it one bright gold read as a blur on the faces around the 20).
    if (st.id === 'obsidian' && at.ink) return at.ink === 4 ? GOLD20[1] : at.ink === 2 ? GOLD20[3] : at.ink === 3 ? GOLD20[8] : GOLD20[6];
    return GOLD20[clamp(Math.round(4 + t0 * 4), 4, 8)];
  }
  if (look === 'dull') {
    if (st.id === 'ivory') return mixc(mixc(c, DULL1[clamp(Math.round(2 + t0 * 6), 1, 8)], 0.5), hex('#2a1d10'), 0.15);
    if (st.id === 'gem') {
      const k = GEMK.findIndex((g) => same(g, c));
      return k > 0 ? GEMK[Math.max(1, Math.round(k * 0.55))] : same(c, WHITE) ? GEMK[6] : c;
    }
    // The obsidian's runes die to a dull red. The glow round the numbers goes out and their grooves
    // go dark, so each number is a thin red stroke on the black glass (a red glow read as a blur).
    if (at.ink) return at.ink === 4 ? OBSIDIAN[2] : at.ink === 2 ? DULL1[1] : at.ink === 3 ? DULL1[8] : DULL1[7];
    return isRune(c) ? DULL1[clamp(Math.round(2 + t0 * 6), 2, 7)] : c;
  }
  // dim: the same die in shadow, less colour (the die advantage did not keep). The gem keeps to
  // darker steps of its own keys, so the screen tints it a dark shade of the roller's chakra.
  if (st.id === 'gem') {
    // Its number stays readable over the darkened crystal.
    if (at.ink === 1 || at.ink === 3) return GEMK[7];
    const k = GEMK.findIndex((g) => same(g, c));
    return k > 0 ? GEMK[Math.max(1, Math.round(k * 0.42))] : same(c, WHITE) ? GEMK[4] : c;
  }
  const grey = lum(c);
  if (st.id === 'obsidian') return mixc(mixc(c, hex('#5d5a72'), 0.45), [grey, grey, grey, 255], 0.3);
  return [Math.round((c[0] * 0.35 + grey * 0.65) * 0.5), Math.round((c[1] * 0.35 + grey * 0.65) * 0.5), Math.round((c[2] * 0.35 + grey * 0.65) * 0.52), 255];
}

/** Draws one die. */
export function renderDie(s: DieSpec): Rendered {
  const st = STYLES[s.style];
  const look = s.look ?? 'normal';
  const R = s.R;
  const big = R >= 24;
  const img = new Img(s.w, s.h);
  const cx = s.cx ?? s.w / 2, cy = s.cy ?? s.h / 2;
  const sx = s.sx ?? 1, sy = s.sy ?? 1;
  ROT_CUR = s.rot;
  // Turn the corners and project them (a mild perspective), then squash about the lowest point.
  const rv = VERTS.map((v) => mul(s.rot, v));
  const pu = rv.map((v) => {
    const k = CAM / (CAM - v[2]);
    return [cx + v[0] * R * k, cy + v[1] * R * k];
  });
  const bottom = Math.max(...pu.map((p) => p[1])) - cy;
  const proj: V3[] = pu.map((p) => [cx + (p[0] - cx) * sx, cy + bottom + (p[1] - cy - bottom) * sy, 0]);
  const rn = FACES.map((f) => mul(s.rot, f.n));
  const rc = FACES.map((f) => mul(s.rot, f.c));
  const camP: V3 = [0, 0, CAM];
  const front = rn.map((n, i) => dot(n, sub(camP, rc[i])) > 1e-6);
  // Each visible face's corners and edge lines on the (unsquashed) screen.
  const tri = FACES.map((f) => f.v.map((i) => pu[i]));
  const edgeLine = tri.map((t) =>
    [0, 1, 2].map((k) => {
      const a = t[k], b = t[(k + 1) % 3];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      return { a, nx: -dy / l, ny: dx / l };
    }),
  );
  // Where each face's number sits and which way it reads.
  const glyphs = new Map<number, GlyphText>();
  const glyphOf = (fi: number, bar: boolean) => {
    const key = fi * 2 + (bar ? 1 : 0);
    let g = glyphs.get(key);
    if (!g) glyphs.set(key, (g = textSegs(NUMBERS[fi], bar)));
    return g;
  };
  const GU = 0.0292; // a glyph unit in die radii (the big die's digits are about 13 pixels tall)
  const frame = FACES.map((f, fi) => {
    const up = mul(s.rot, norm(sub(VERTS[UP[fi]], scale(f.n, dot(VERTS[UP[fi]], f.n)))));
    const right = cross(rn[fi], up);
    return { right, down: scale(up, -1) };
  });
  // The landed face: its number goes on the screen grid (crisp), centred a little under the face's middle.
  let upC: [number, number] | null = null;
  if (s.upright !== undefined) {
    const P = FACES[s.upright].v.map((i) => proj[i]);
    upC = [Math.round((P[0][0] + P[1][0] + P[2][0]) / 3), Math.round((P[0][1] + P[1][1] + P[2][1]) / 3 + (big ? 0.5 : 0.6) * sy)];
  }
  const smallC: ([number, number] | null)[] = FACES.map((f, fi) => {
    if (big || s.plain || (s.only !== undefined && s.only !== fi) || s.upright === fi || rn[fi][2] < 0.9 || frame[fi].down[1] < 0.82) return null;
    const P = f.v.map((i) => proj[i]);
    return [Math.round((P[0][0] + P[1][0] + P[2][0]) / 3), Math.round((P[0][1] + P[1][1] + P[2][1]) / 3 + 0.6)];
  });
  const smallBmp = (fi: number) => numberBitmap(NUMBERS[fi], s.upright !== fi);
  const faceAt = new Int8Array(s.w * s.h).fill(-1);
  const inkAt = new Uint8Array(s.w * s.h);
  // The gold of a natural 20 drains away as a clean diagonal wipe toward the light (upper left):
  // 0 there, 1 at the lower right. A dither would show as a checkerboard on the big die.
  const wipe = (x: number, y: number) => clamp(0.5 + (x + 0.5 - cx + (y + 0.5 - cy)) / (3.4 * R), 0, 0.999);
  // Rounded edges on the big die only: on the small one a highlit edge reads as a stray line by the number.
  const bevel = big ? 2.6 : 0;
  const shade = SHADERS[s.style];
  const inv = rotT(s.rot);
  let glint = { v: 0, x: 0, y: 0 };
  const glintAt = new Float32Array(s.w * s.h);
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      const X = cx + (x + 0.5 - cx) / sx, Y = cy + bottom + (y + 0.5 - cy - bottom) / sy;
      let fi = -1;
      for (let f = 0; f < 20 && fi < 0; f++) if (front[f] && inTri(X, Y, tri[f][0], tri[f][1], tri[f][2])) fi = f;
      if (fi < 0) continue;
      faceAt[y * s.w + x] = fi;
      // The point on the face under this pixel: the camera's ray through it meets the face's plane.
      const n = rn[fi];
      const d: V3 = [(X - cx) / R, (Y - cy) / R, -CAM];
      const t = (dot(n, rc[fi]) - n[2] * CAM) / dot(n, d);
      const P: V3 = [d[0] * t, d[1] * t, CAM + d[2] * t];
      // Round the edges: near an edge the normal bends toward the face across it.
      let nb: V3 = n;
      let edge = 99;
      edgeLine[fi].forEach((e, k) => {
        const dist = Math.abs((X - e.a[0]) * e.nx + (Y - e.a[1]) * e.ny);
        edge = Math.min(edge, dist);
        if (dist < bevel) {
          const w = 0.5 * Math.pow(1 - dist / bevel, 1.6);
          const o = rn[ACROSS[fi][k]];
          nb = norm([nb[0] + (o[0] - n[0]) * w, nb[1] + (o[1] - n[1]) * w, nb[2] + (o[2] - n[2]) * w]);
        }
      });
      const V = norm(sub(camP, P));
      const L = norm(sub(LAMPS[s.style], P));
      // Numbers.
      let ink: Ink = 0;
      if (s.upright === fi || (!s.plain && (s.only === undefined || s.only === fi) && dot(n, V) > (big ? 0.45 : 0.9))) {
        if (!big) {
          const bmp = smallBmp(fi);
          const bw = bmp[0].length, bh = bmp.length;
          // Three-pixel digits only read upright on the screen grid: a turning face shows its
          // number only while it faces the eye and stands near upright.
          const c = s.upright === fi && upC ? upC : smallC[fi];
          const gx = c ? Math.floor(x - (c[0] - Math.floor(bw / 2))) : -1;
          const gy = c ? Math.floor(y - (c[1] - Math.floor(bh / 2))) : -1;
          if (gx >= 0 && gy >= 0 && gx < bw && gy < bh && bmp[gy][gx] === '#') ink = 1;
        } else {
          const g = glyphOf(fi, s.upright !== fi);
          let u: number, v: number, lu: number, lv: number, pxu: number;
          if (s.upright === fi && upC) {
            const unit = GU * R;
            u = (x + 0.5 - upC[0]) / unit;
            v = (y + 0.5 - upC[1]) / unit;
            lu = LS[0];
            lv = LS[1];
            pxu = 1 / unit;
          } else {
            const q = sub(P, rc[fi]);
            u = dot(q, frame[fi].right) / GU;
            v = dot(q, frame[fi].down) / GU;
            lu = dot(LS, frame[fi].right);
            lv = dot(LS, frame[fi].down);
            const ll = Math.hypot(lu, lv) || 1;
            lu /= ll;
            lv /= ll;
            pxu = 1 / (GU * R * Math.max(0.35, dot(n, V)));
          }
          const dd = glyphDist(g, u, v);
          if (dd < STROKE + pxu * 1.05) {
            const e = 0.2;
            const gu = glyphDist(g, u + e, v) - glyphDist(g, u - e, v), gv = glyphDist(g, u, v + e) - glyphDist(g, u, v - e);
            const gl = Math.hypot(gu, gv) || 1;
            const toward = (gu * lu + gv * lv) / gl;
            if (dd < STROKE) {
              const wall = dd > STROKE - pxu * 0.95;
              ink = wall && toward > 0.3 ? 2 : wall && toward < -0.3 ? 3 : 1;
            } else if (s.style === 'obsidian') ink = 4;
          }
        }
      }
      inkAt[y * s.w + x] = ink;
      const p: Px = {
        x, y, fi, P, n, nb, V, L, diff: Math.max(0, dot(nb, L)), edge, ink,
        b: big ? BAYER[(y & 3) * 4 + (x & 3)] : 0.5, big, Po: mul(inv, P), R, rn, rc,
      };
      let c = shade(p);
      if (big && !ink) glintAt[y * s.w + x] = blinn(p, 60);
      // The landed number: brighter for the pop, gold for good after a natural 20, a bright red
      // after a natural 1.
      if (ink && ink !== 4 && s.upright === fi) {
        const fixed = (s.numberGold || s.numberRed) && look !== 'flash' && look !== 'dim';
        // On the pale ivory the 20 is a deeper gold, or it melts into the bone.
        const N = s.numberRed ? NAT1_NUM : s.style === 'ivory' ? NAT20_ON_IVORY : NAT20_NUM;
        if (fixed) c = ink === 2 ? N.shadow : ink === 3 ? N.lit : N.ink;
        else if (s.numberGlow && look === 'normal' && ink === 1) c = s.style === 'ivory' ? INLAY[0] : s.style === 'gem' ? WHITE : RUNE[7];
        if (fixed) {
          img.set(x, y, c);
          continue;
        }
      }
      img.set(x, y, lookColour(st, look, c, s.goldness ?? 1, look === 'gold' ? wipe(x, y) : BAYER[(y & 3) * 4 + (x & 3)], { edge, ink, big }));
    }
  // The glint: where the lamp's reflection is strongest, but never on or beside a number (a star
  // crossing a digit looks pasted on).
  if (big)
    for (let y = 0; y < s.h; y++)
      for (let x = 0; x < s.w; x++) {
        const g = glintAt[y * s.w + x];
        if (g <= glint.v) continue;
        let clear = true;
        for (let dy = -4; dy <= 4 && clear; dy++)
          for (let dx = -4; dx <= 4; dx++) {
            const X = x + dx, Y = y + dy;
            if (X >= 0 && Y >= 0 && X < s.w && Y < s.h && inkAt[Y * s.w + X] && inkAt[Y * s.w + X] !== 4) {
              clear = false;
              break;
            }
          }
        if (clear) glint = { v: g, x, y };
      }
  if (big && glint.v > 0.35 && look !== 'dim' && look !== 'dull') {
    const core = look === 'normal' ? WHITE : GOLD20[8];
    const arm = look === 'normal' ? (s.style === 'gem' ? GEMK[10] : s.style === 'ivory' ? IVORY[10] : OBSIDIAN[10]) : GOLD20[7];
    const L = glint.v > 0.8 ? 3 : 2;
    const on = (x: number, y: number) => x >= 0 && y >= 0 && x < s.w && y < s.h && faceAt[y * s.w + x] >= 0 && !inkAt[y * s.w + x];
    for (let k = 1; k <= L; k++)
      for (const [dx, dy] of [[k, 0], [-k, 0], [0, k], [0, -k]]) if (on(glint.x + dx, glint.y + dy)) img.set(glint.x + dx, glint.y + dy, k === 1 ? core : arm);
    if (on(glint.x, glint.y)) img.set(glint.x, glint.y, core);
  }
  // The outline: every empty pixel touching the die (4-neighbours).
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= s.w || y >= s.h ? -1 : faceAt[y * s.w + x]);
  // The gem's outline stays one of its key colours (or the gold's), so the screen can tint it.
  const oc = look === 'flash' ? GOLD20[2] : look === 'gold' ? (st.id === 'ivory' ? mixc(st.outline, GOLD20[0], s.goldness ?? 1) : (s.goldness ?? 1) >= 0.5 ? GOLD20[0] : st.outline) : look === 'dull' ? DULL1[0] : look === 'dim' ? lookColour(st, 'dim', st.outline, 1, 0) : st.outline;
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      if (at(x, y) >= 0) continue;
      if (at(x - 1, y) >= 0 || at(x + 1, y) >= 0 || at(x, y - 1) >= 0 || at(x, y + 1) >= 0) img.set(x, y, oc);
    }
  // The small die's landed number gets a 1-pixel ring so it reads at a glance.
  // A natural 1's red digit gets a dark rim on every style, so it reads on the dulled die.
  const ring = s.numberRed ? NAT1_NUM.shadow : s.style === 'gem' ? GEMK[1] : null;
  if (!big && ring && s.upright !== undefined && look !== 'flash')
    for (let y = 0; y < s.h; y++)
      for (let x = 0; x < s.w; x++) {
        const i = y * s.w + x;
        if (faceAt[i] < 0 || inkAt[i]) continue;
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const j = (y + dy) * s.w + x + dx;
            if (x + dx >= 0 && y + dy >= 0 && x + dx < s.w && y + dy < s.h && inkAt[j] && faceAt[j] === s.upright) near = true;
          }
        if (near) img.set(x, y, s.numberRed ? ring : lookColour(st, look, ring, s.goldness ?? 1, look === 'gold' ? wipe(x, y) : BAYER[(y & 3) * 4 + (x & 3)]));
      }
  return { img, faceAt, inkAt, proj, front, centre: [cx, cy] };
}

/** The transpose of a rotation (its inverse). */
function rotT(m: M3): M3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
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
