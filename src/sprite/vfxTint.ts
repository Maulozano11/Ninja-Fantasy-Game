// Elemental jutsu effects in the caster's chakra colour.
//
// The owner (2026-10-21): the colour a player gives his chakra colours his elemental jutsu (fire,
// water, wind, lightning and earth: projectiles, hits, blasts, walls, streams, breath, spheres,
// beasts and signatures). Genjutsu, poison, chakra and every other effect keep their colours.
//
// The effect sheets are copied from his pictures, so this only recolours: every pixel keeps its
// place and its alpha, his dark line stays his, and smoke, dust, stone and moss keep their colours.
// The rest is a gradient map: how light a pixel is among the element's own tones picks the same
// place among the chosen colour's five tones (the aura's, `tintPal` in chakra.ts), so a green
// fireball matches a green aura and the element keeps its light, its shade and its shape.
// - Fire takes the aura's tones as they are (they warm toward the core, as flames do). The other
//   elements keep the colour's own hue up to the lightest tone, so red water has pale-pink foam
//   instead of turning into flame.
// - Black has no light to map onto, so it is drawn like the black aura: a near-black body with a
//   violet rim along the outer edge, a violet glow, and the aura's red accent in the hottest core.
// - White takes the white aura's warm gold shading, so it is never a flat blob.
// - With no colour picked (Natural) or the sheet's own colour, the sheet comes back untouched: the
//   same buffer, his pixels byte for byte.
// Pure pixels, no canvas.

import { CHAKRA_COLORS, tintPal } from './chakra';
import { hexToRgb, hslToHex, rgbToHsl } from './color';
import type { ChakraChoice } from './types';

export type VfxElement = 'fire' | 'water' | 'wind' | 'lightning' | 'earth';
export const VFX_ELEMENTS: readonly VfxElement[] = ['fire', 'water', 'wind', 'lightning', 'earth'];

type RGB = readonly [number, number, number];
type Tones = readonly [RGB, RGB, RGB, RGB, RGB];

/** One sheet's colours: an element's effect set, or its beast, which has colours of its own. */
interface Family {
  /** Chakra colours that already are this sheet's colour: with them the sheet stays his. */
  natural: readonly string[];
  /** The luma of his five tones, dark edge to core (the 2nd, 20th, 50th, 80th and 98th percentile of the pixels that change, except where noted). */
  stops: readonly [number, number, number, number, number];
  /** His dark line: never touched. Any pixel at HSL lightness 0.1 or below counts as line too. */
  line: readonly string[];
  /**
   * Saturation below `material[0]` is smoke, dust or stone and stays his; above `material[1]` it is
   * the element and takes the colour; in between it takes part of it. Null: all of it is the element
   * (earth: the rock is the element).
   */
  material: readonly [number, number] | null;
  /** How vivid the new colour is: 1 is the chakra colour's own tones; earth stays rock. */
  vivid: number;
  /** Fire: the light tones warm toward the core as the aura's do. Otherwise they keep the colour's hue. */
  fiery?: boolean;
  /** Earth: see-through pixels are dust, not light (in black they stay dark instead of glowing). */
  dust?: boolean;
  /** Earth: the green moss on the rock stays green. */
  moss?: boolean;
}

// His outline colours, from the palettes his sheets were converted with (tools/world-sprites/*-refdata.ts).
const FIRE_LINE = ['#191014', '#1c1319', '#24141a', '#260606', '#2d1c22', '#332023', '#361921', '#3b1e22', '#3c0d0d', '#3e0708', '#3f0908', '#45171f', '#470807', '#4d171e', '#53120f', '#580907'];
const WIND_LINE = ['#000600', '#000700', '#000800', '#000a00', '#000b00', '#001100', '#001202', '#001400', '#001401', '#011612', '#041c17', '#051d1c', '#061b15', '#071b18', '#0a1c18', '#0c211f', '#0e1f1b', '#0e201e', '#0f2523', '#102320', '#355544', '#413f3b', '#45443f', '#4d4c45'];
const EARTH_LINE = ['#311a10', '#311e13', '#321708', '#32190e', '#321f15', '#33180a', '#331909', '#33251b', '#34180b', '#341f10', '#342013', '#342016', '#342118', '#342419', '#35160b', '#352012', '#35281c', '#352c16', '#362019', '#362116', '#391e0e', '#3a200f', '#3a2015', '#3a2416', '#3a2516', '#3a261e', '#3b2410', '#3c2820', '#3c2b16', '#3d271b', '#3d2920', '#3e2920', '#402418', '#42210e', '#422310', '#44230e', '#442315', '#442410'];

// 'brown' is the Earth burst the chakra types bring; until it exists it is an unknown colour, and an
// unknown colour leaves every sheet as it is.
const FAMILIES: Record<VfxElement, { set: Family; beast: Family }> = {
  fire: {
    set: { natural: ['red', 'orange'], stops: [0.103, 0.276, 0.561, 0.787, 0.965], line: FIRE_LINE, material: [0.22, 0.42], vivid: 1, fiery: true },
    // The phoenix.
    beast: { natural: ['red', 'orange'], stops: [0.138, 0.24, 0.414, 0.63, 0.846], line: ['#2f0e13'], material: [0.22, 0.42], vivid: 1, fiery: true },
  },
  water: {
    set: { natural: ['blue'], stops: [0.207, 0.319, 0.529, 0.819, 0.96], line: ['#0e263b'], material: [0.1, 0.25], vivid: 1 },
    // The water dragon.
    beast: { natural: ['blue'], stops: [0.12, 0.256, 0.419, 0.593, 0.766], line: ['#01071a'], material: [0.1, 0.25], vivid: 1 },
  },
  wind: {
    set: { natural: ['green'], stops: [0.151, 0.282, 0.446, 0.682, 0.936], line: WIND_LINE, material: [0.08, 0.16], vivid: 0.85 },
    // The crane.
    beast: { natural: ['green'], stops: [0.216, 0.395, 0.557, 0.724, 0.903], line: ['#234a49', '#020a10'], material: [0.08, 0.16], vivid: 0.85 },
  },
  lightning: {
    // Set by hand: his electric-blue glow (#0033ff..#0f6cff) is the lightning's own colour, so it is
    // tone 2 (the chakra colour itself), though blue is dark by luma. Kirin uses the same tones.
    set: { natural: ['blue'], stops: [0.15, 0.21, 0.3, 0.6, 0.92], line: [], material: [0.08, 0.16], vivid: 1 },
    // The raiju is yellow.
    beast: { natural: ['yellow'], stops: [0.262, 0.421, 0.731, 0.853, 0.971], line: ['#573213'], material: [0.08, 0.16], vivid: 1 },
  },
  earth: {
    set: { natural: ['brown'], stops: [0.135, 0.26, 0.394, 0.548, 0.808], line: EARTH_LINE, material: null, vivid: 0.55, dust: true, moss: true },
    // The stone drake.
    beast: { natural: ['brown'], stops: [0.125, 0.215, 0.315, 0.473, 0.655], line: ['#191519'], material: null, vivid: 0.55, dust: true, moss: true },
  },
};

const WHITE: RGB = [255, 255, 255];
/** Black only: pixels fainter than this are glow, not body. */
const GLOW_ALPHA = 160;
const key = (h: string): number => parseInt(h.slice(1), 16);
const lineSets = new Map<Family, Set<number>>();
function lineSet(f: Family): Set<number> {
  let s = lineSets.get(f);
  if (!s) lineSets.set(f, (s = new Set(f.line.map(key))));
  return s;
}

const isHex = (c: string): boolean => /^#[0-9a-f]{6}$/i.test(c);
const chakraHexOf = (id: string): string | undefined => CHAKRA_COLORS.find((c) => c.id === id)?.hex;

/**
 * The colour a caster's elemental jutsu take: the chakra's colour (`tint`: a chakra colour or any
 * '#rrggbb'). Natural (no tint) keeps the owner's colours, whatever the burst: the burst is the
 * chakra's type, and the Lightning burst is yellow while his bolts are blue.
 */
export function vfxTintOf(chakra: Pick<ChakraChoice, 'tint'> | undefined): string | undefined {
  return chakra?.tint;
}

/** True when `color` leaves this sheet as he drew it: Natural, the sheet's own colour (or its hex), or a colour this game does not know. */
export function vfxTintIsNatural(element: VfxElement, color: string | undefined, beast = false): boolean {
  if (!color) return true;
  const fam = FAMILIES[element]?.[beast ? 'beast' : 'set'];
  if (!fam) return true;
  if (isHex(color)) return fam.natural.some((id) => chakraHexOf(id)?.toLowerCase() === color.toLowerCase());
  return !chakraHexOf(color) || fam.natural.includes(color);
}

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const luma = (r: number, g: number, b: number) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;

/** The colour at luma `y` on five tones that sit at `stops`; darker than tone 0 fades toward its shadow, lighter than tone 4 toward `hot`. */
function rampAt(y: number, stops: Family['stops'], t: Tones, hot: RGB): RGB {
  if (y <= stops[0]) return mix([t[0][0] * 0.45, t[0][1] * 0.45, t[0][2] * 0.45], t[0], clamp01(y / stops[0]));
  if (y >= stops[4]) return mix(t[4], hot, clamp01((y - stops[4]) / (1 - stops[4])));
  let i = 0;
  while (y > stops[i + 1]) i++;
  return mix(t[i], t[i + 1], (y - stops[i]) / (stops[i + 1] - stops[i]));
}

/** `c` with its saturation scaled by `k` and, when `hue` is given, turned to that hue. */
function shade(c: RGB, k: number, hue?: number): RGB {
  if (k >= 1 && hue === undefined) return c;
  const [h, s, l] = rgbToHsl(c[0], c[1], c[2]);
  return hexToRgb(hslToHex(hue ?? h, s * k, l));
}

/** How one of his colours turns out. */
interface Look {
  /** His line, or smoke and stone: stays his. */
  keep: boolean;
  /** His line (black rims follow it where it meets the air). */
  line: boolean;
  /** Smoke, or part smoke: a black rim runs along it as along the air (moss is no edge). */
  edge: boolean;
  /** How much of the new colour it takes (part-smoke takes part). */
  w: number;
  /** The new colour, for a solid pixel. */
  body: RGB;
  /** Black only: the colour of a see-through (glow) pixel. */
  glow: RGB;
}

interface Scheme {
  fam: Family;
  lines: Set<number>;
  /** Black (or any very dark colour): drawn like the black aura, with a rim and a glow. */
  dark: boolean;
  body: Tones;
  glow: Tones;
  hot: RGB;
  /** Black only: the rim along the outer edge (1 px), and the band inside it. */
  rim: RGB;
  rim2: RGB;
}

function schemeOf(fam: Family, color: string): Scheme {
  const pal = tintPal(color) as unknown as Tones;
  const [, , l] = rgbToHsl(...hexToRgb(isHex(color) ? color : chakraHexOf(color)!));
  const dark = color === 'black' || (isHex(color) && l < 0.22);
  // Water, wind, lightning and earth keep the colour's hue in their light tones (fire warms like the aura).
  const hue = fam.fiery || dark ? undefined : rgbToHsl(...pal[2])[0];
  const p = pal.map((c) => shade(c, 1, hue)) as unknown as Tones;
  // Black: the body stays near black, a little of its colour in the lit parts, so the rim, the glow
  // and the white-hot core, which turns to the aura's red accent (tone 4), carry the light, as on the
  // black aura. A flame's heart already burns toward that red; a bolt stays black round its red core.
  const top = fam.fiery ? mix(p[2], p[4], 0.3) : mix(p[1], p[2], 0.8);
  const body: Tones = dark ? [p[0], p[1], mix(p[1], p[2], 0.2), mix(p[1], p[2], 0.45), top] : p;
  const glow: Tones = [p[1], p[2], mix(p[2], p[3], 0.6), p[3], mix(p[3], p[4], 0.5)];
  return { fam, lines: lineSet(fam), dark, body, glow, hot: dark ? p[4] : WHITE, rim: p[3], rim2: mix(p[2], p[3], 0.35) };
}

function lookOf(s: Scheme, r: number, g: number, b: number): Look {
  const { fam } = s;
  const [h, sat, l] = rgbToHsl(r, g, b);
  const line = s.lines.has((r << 16) | (g << 8) | b) || l <= 0.1;
  // Moss is a mid-dark green; the pale yellow flash of an impact is light, not moss.
  const mossy = !!fam.moss && h >= 55 && h <= 160 && sat >= 0.15 && l < 0.7;
  let w = 1;
  if (fam.material && l <= 0.8) w = clamp01((sat - fam.material[0]) / (fam.material[1] - fam.material[0]));
  if (mossy) w = 0;
  const keep = line || w <= 0;
  const y = luma(r, g, b);
  // Earth keeps the rock's own spread of colour (grey stone stays greyer than brown earth).
  const k = fam.vivid * (fam.moss ? 0.45 + 0.55 * clamp01(sat / 0.4) : 1);
  const body = shade(rampAt(y, fam.stops, s.body, s.hot), k);
  const glow = shade(rampAt(y, fam.stops, s.glow, s.hot), k);
  return { keep, line, edge: !line && !mossy && w < 1, w, body, glow };
}

/** Where a sheet's frames are and whose sheet it is. */
export interface VfxSheet {
  width: number;
  height: number;
  /** Frame size (default: the whole sheet). A black rim stops at a frame's edge, so tiles and touching frames get none there. */
  frameW?: number;
  frameH?: number;
  /** The element's beast (vfx_beasts/<element>.png), which has its own colours (the raiju is yellow). */
  beast?: boolean;
}

/**
 * An elemental effect sheet (RGBA) in a chakra colour: `color` is a chakra colour id or '#rrggbb'
 * (`vfxTintOf(chakra)`). Natural, the sheet's own colour or an unknown colour return `rgba` itself,
 * untouched; otherwise a new buffer of the same size: every pixel keeps its alpha, his line, smoke,
 * stone and moss keep their colour, and the rest is mapped onto the colour's tones.
 */
export function tintVfx<T extends Uint8Array | Uint8ClampedArray>(rgba: T, element: VfxElement, color: string | undefined, sheet: VfxSheet): T {
  if (vfxTintIsNatural(element, color, sheet.beast)) return rgba;
  const s = schemeOf(FAMILIES[element][sheet.beast ? 'beast' : 'set'], color!);
  const { width: W, height: H } = sheet;
  const n = W * H;
  const out = rgba.slice() as T;
  // Each colour is worked out once: `at` holds each pixel's entry in `list` (-1: empty air).
  const index = new Map<number, number>();
  const list: Look[] = [];
  const at = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (rgba[o + 3] === 0) continue;
    const c = (rgba[o] << 16) | (rgba[o + 1] << 8) | rgba[o + 2];
    let k = index.get(c);
    if (k === undefined) {
      index.set(c, (k = list.length));
      list.push(lookOf(s, rgba[o], rgba[o + 1], rgba[o + 2]));
    }
    at[i] = k;
  }
  // Black only: the changing pixels along the outer edge (next to the air, his outline round it, or
  // smoke) are the rim, and the ones next to those its inner band. Lines inside (cracks between the
  // stones, a dragon's scales) and moss get none, so the inside stays dark; part-smoke gets none.
  let rim: Uint8Array | null = null;
  if (s.dark) {
    rim = new Uint8Array(n);
    const fw = sheet.frameW ?? W;
    const fh = sheet.frameH ?? H;
    const near = (i: number, test: (j: number) => boolean): boolean => {
      const x = i % W;
      const y = (i / W) | 0;
      const fx = x - (x % fw);
      const fy = y - (y % fh);
      return (x > fx && test(i - 1)) || (x + 1 < Math.min(W, fx + fw) && test(i + 1)) || (y > fy && test(i - W)) || (y + 1 < Math.min(H, fy + fh) && test(i + W));
    };
    const air = (j: number) => at[j] < 0;
    const moves = (i: number) => at[i] >= 0 && list[at[i]].w >= 1 && !list[at[i]].keep;
    const edge = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (at[i] >= 0 && (list[at[i]].edge || (list[at[i]].line && near(i, air)))) edge[i] = 1;
    for (let i = 0; i < n; i++) if (moves(i) && near(i, (j) => air(j) || edge[j] === 1)) rim[i] = 1;
    for (let i = 0; i < n; i++) if (moves(i) && !rim[i] && near(i, (j) => rim![j] === 1)) rim[i] = 2;
  }
  for (let i = 0; i < n; i++) {
    if (at[i] < 0) continue;
    const lk = list[at[i]];
    if (lk.keep) continue;
    const o = i * 4;
    let c = lk.body;
    if (rim) {
      // Faint pixels are glow (lightning's halo, spray, wisps); earth's are dust and stay dark.
      if (rgba[o + 3] < GLOW_ALPHA) c = s.fam.dust ? lk.body : lk.glow;
      else if (rim[i] === 1) c = s.rim;
      else if (rim[i] === 2) c = mix(lk.body, s.rim2, 0.55);
    }
    const src: RGB = [rgba[o], rgba[o + 1], rgba[o + 2]];
    const v = lk.w >= 1 ? c : mix(src, c, lk.w);
    out[o] = Math.round(v[0]);
    out[o + 1] = Math.round(v[1]);
    out[o + 2] = Math.round(v[2]);
  }
  return out;
}
