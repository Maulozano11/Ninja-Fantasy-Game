// Elemental jutsu effects in the caster's chakra colour.
//
// The owner (2026-10-21): the colour a player gives his chakra colours his elemental jutsu (fire,
// water, wind, lightning and earth: projectiles, hits, blasts, walls, streams, breath, spheres,
// beasts and signatures). Genjutsu, poison, chakra and every other effect keep their colours.
//
// The effect sheets are copied from his pictures, so this only recolours: every pixel keeps its
// place and its alpha, his line stays his (the outline colours his palettes name, the lightning's
// deep-blue ring among them, and anything nearly black), and smoke, dust, rock debris, a storm
// cloud, moss and the stone drake's eyes keep their colours.
// - His values stay his: each pixel keeps its own brightness (luma), so his shading, his dark
//   ground pools and his cores read the same in every colour. The chosen colour gives the hue and
//   the saturation, from its five tones (`tintPal` in chakra.ts): how light the pixel is among the
//   element's tones picks the place among the colour's tones. From the middle tone up the colour
//   pulls the light a little (a quarter) toward its own, so yellow is a touch lighter than indigo.
// - The saturation follows his pixel's: pale wind stays pale, rich fire stays rich.
// - Fire takes the colour's tones as they are (they warm toward the core, as flames do). Water,
//   wind, lightning and earth keep the colour's hue, and their lightest tone stays pale (foam and
//   sparks stay near-white instead of salmon or blood). Earth is muted so it still reads as rock.
// - White lifts the light (a white jutsu is light, still shaded). Fire's white keeps a warm gold
//   shade (white-hot flame); the other elements get a cool silver one.
// - Black (and any very dark colour) has no light to keep, so his values become dark steps of the
//   colour's hue (violet for the black chakra), with a 1 px rim of its glow colour where the effect
//   meets the air, a glow on tiny specks and on faint pixels next to the bright ones, and the
//   hottest core of fire and lightning turning to the black chakra's red accent.
// - With no colour picked (Natural), the sheet's own colour, a custom colour within a hair of it,
//   or a colour the game does not know, the sheet comes back untouched: the same buffer, his pixels
//   byte for byte.
// Pure pixels, no canvas. A sheet is recoloured whole or frame by frame (the big signature sheets
// should go a frame at a time, ahead of the cast).

import { CHAKRA_COLORS, tintPal } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_e42ad7ec-457-6/src/sprite/chakra';
import { hexToRgb, rgbToHsl } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_e42ad7ec-457-6/src/sprite/color';
import type { ChakraChoice } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_e42ad7ec-457-6/src/sprite/types';

/** The elements whose jutsu take the chakra colour (the battle's own element type has more). */
export type TintElement = 'fire' | 'water' | 'wind' | 'lightning' | 'earth';
export const TINT_ELEMENTS: readonly TintElement[] = ['fire', 'water', 'wind', 'lightning', 'earth'];
export const isTintElement = (el: string): el is TintElement => (TINT_ELEMENTS as readonly string[]).includes(el);

type RGB = readonly [number, number, number];
type Stops = readonly [number, number, number, number, number];

/** One sheet's colours: an element's effect set, its beast, or a signature sheet of its own. */
interface Family {
  /** Chakra colours that already are this sheet's colour: with them the sheet stays his. */
  natural: readonly string[];
  /** The luma of his five tones, dark edge to core (about the 2nd, 20th, 50th, 80th and 98th percentile of the pixels that change). */
  stops: Stops;
  /** His dark line: never touched. Any pixel at HSL lightness 0.1 or below counts as line too. */
  line: readonly string[];
  /** The element's hue (centre, half width, in degrees): a coloured pixel well off it is not the element (dust, rock debris, a storm cloud) and stays his. Null: any hue. */
  hue: readonly [number, number] | null;
  /**
   * Saturation below `material[0]` is smoke, dust or stone and stays his; above `material[1]` it is
   * the element and takes the colour; in between it takes part of it. Null: all of it is the element.
   */
  material: readonly [number, number] | null;
  /** How vivid the new colour is: 1 is the chakra colour's own; earth stays rock. */
  vivid: number;
  /** Fire: the colour's tones warm toward the core as the aura's do. Otherwise they keep the colour's hue. */
  fiery?: boolean;
  /** Black: the hottest core turns to the black chakra's red accent (fire and lightning burn). */
  hot?: boolean;
  /** Earth: the green moss stays green, and see-through pixels are dust and stay his. */
  earth?: boolean;
  /** The stone drake: its yellow eyes stay his. */
  eyes?: boolean;
}

// His outline colours, from the palettes his sheets were converted with (tools/world-sprites/*-refdata.ts).
const FIRE_LINE = ['#191014', '#1c1319', '#24141a', '#260606', '#2d1c22', '#332023', '#361921', '#3b1e22', '#3c0d0d', '#3e0708', '#3f0908', '#45171f', '#470807', '#4d171e', '#53120f', '#580907'];
const WIND_LINE = ['#000600', '#000700', '#000800', '#000a00', '#000b00', '#001100', '#001202', '#001400', '#001401', '#011612', '#041c17', '#051d1c', '#061b15', '#071b18', '#0a1c18', '#0c211f', '#0e1f1b', '#0e201e', '#0f2523', '#102320', '#355544', '#413f3b', '#45443f', '#4d4c45'];
const EARTH_LINE = ['#311a10', '#311e13', '#321708', '#32190e', '#321f15', '#33180a', '#331909', '#33251b', '#34180b', '#341f10', '#342013', '#342016', '#342118', '#342419', '#35160b', '#352012', '#35281c', '#352c16', '#362019', '#362116', '#391e0e', '#3a200f', '#3a2015', '#3a2416', '#3a2516', '#3a261e', '#3b2410', '#3c2820', '#3c2b16', '#3d271b', '#3d2920', '#3e2920', '#402418', '#42210e', '#422310', '#44230e', '#442315', '#442410'];
// His lightning palette labels these two as the outline (the deep blue and indigo ring round every stroke).
const LIGHTNING_LINE = ['#1c3aa8', '#262268'];
// Kirin: darker blues and a white core (its stops are taken over all of its pixels); its violet
// storm cloud is a cloud, off the bolt's hue, and stays (nearly) his.
const KIRIN: Family = { natural: ['blue'], stops: [0.083, 0.152, 0.29, 0.8, 0.98], line: LIGHTNING_LINE, hue: [210, 24], material: [0.08, 0.16], vivid: 1, hot: true };

const FAMILIES: Record<TintElement, { set: Family; beast: Family; sprites?: Record<string, Family> }> = {
  fire: {
    set: { natural: ['red', 'orange'], stops: [0.103, 0.276, 0.561, 0.787, 0.965], line: FIRE_LINE, hue: [20, 45], material: [0.22, 0.42], vivid: 1, fiery: true, hot: true },
    // The phoenix.
    beast: { natural: ['red', 'orange'], stops: [0.138, 0.24, 0.414, 0.63, 0.846], line: ['#2f0e13'], hue: [20, 45], material: [0.22, 0.42], vivid: 1, fiery: true, hot: true },
  },
  water: {
    set: { natural: ['blue'], stops: [0.207, 0.319, 0.529, 0.819, 0.96], line: ['#0e263b'], hue: [200, 25], material: [0.1, 0.25], vivid: 1 },
    // The water dragon.
    beast: { natural: ['blue'], stops: [0.12, 0.256, 0.419, 0.593, 0.766], line: ['#01071a'], hue: [205, 25], material: [0.1, 0.25], vivid: 1 },
  },
  wind: {
    set: { natural: ['green'], stops: [0.151, 0.282, 0.446, 0.682, 0.936], line: WIND_LINE, hue: [148, 40], material: [0.08, 0.16], vivid: 1 },
    // The crane.
    beast: { natural: ['green'], stops: [0.216, 0.395, 0.557, 0.724, 0.903], line: ['#234a49', '#020a10'], hue: [168, 30], material: [0.08, 0.16], vivid: 1 },
  },
  lightning: {
    // Set by hand: his electric-blue glow (#0033ff..#0f6cff) is the lightning's own colour, so it sits
    // at tone 2 (the chakra colour itself) though blue is dark by luma, and the strike's flash is
    // above tone 3, so a black strike still flashes.
    set: { natural: ['blue'], stops: [0.15, 0.21, 0.3, 0.6, 0.92], line: LIGHTNING_LINE, hue: [212, 28], material: [0.08, 0.16], vivid: 1, hot: true },
    // The raiju is yellow.
    beast: { natural: ['yellow'], stops: [0.262, 0.421, 0.731, 0.853, 0.971], line: ['#573213'], hue: [40, 25], material: [0.08, 0.16], vivid: 1, hot: true },
    sprites: { kirin: KIRIN, kirin_enh: KIRIN },
  },
  earth: {
    set: { natural: ['brown'], stops: [0.135, 0.26, 0.394, 0.548, 0.808], line: EARTH_LINE, hue: null, material: null, vivid: 0.75, earth: true },
    // The stone drake.
    beast: { natural: ['brown'], stops: [0.125, 0.215, 0.315, 0.473, 0.655], line: ['#191519'], hue: null, material: null, vivid: 0.75, earth: true, eyes: true },
  },
};

/** Where a sheet's frames are and whose sheet it is. */
export interface VfxSheet {
  width: number;
  height: number;
  /** Frame size (default: the whole sheet). Black's rim stops at a frame's edge, so tiles and touching frames get none there. */
  frameW?: number;
  frameH?: number;
  /** The element's beast (vfx_beasts/<element>.png), which has its own colours (the raiju is yellow). */
  beast?: boolean;
  /** The sprite's name in its group ('bolt', 'kirin'...): a signature sheet with colours of its own (Kirin) needs it. */
  sprite?: string;
}

function familyOf(element: TintElement, sheet: Pick<VfxSheet, 'beast' | 'sprite'>): Family | undefined {
  const f = FAMILIES[element];
  if (!f) return undefined;
  if (sheet.beast) return f.beast;
  return (sheet.sprite && f.sprites?.[sheet.sprite]) || f.set;
}

const WHITE: RGB = [255, 255, 255];
/** Black only: pixels fainter than this are glow or shade, not body. */
const GLOW_ALPHA = 160;
/** A custom colour this close (RGB distance) to a chakra colour is that colour, so a hair off his own colour keeps his sheet. */
const SNAP = 10;
/** Black only: a speck smaller than this (pixels) glows instead of getting a rim round a dark middle. */
const SPECK = 6;
const key = (h: string): number => parseInt(h.slice(1), 16);
const lineSets = new Map<Family, Set<number>>();
function lineSet(f: Family): Set<number> {
  let s = lineSets.get(f);
  if (!s) lineSets.set(f, (s = new Set(f.line.map(key))));
  return s;
}

/** A chakra colour id, or a custom '#rgb' / '#rrggbb' as '#rrggbb' (snapped to a chakra colour it is within a hair of); undefined: Natural or unknown. */
function resolve(color: string | undefined): string | undefined {
  if (!color) return undefined;
  if (CHAKRA_COLORS.some((c) => c.id === color)) return color;
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) return undefined;
  const [r, g, b] = hexToRgb(color);
  let best: string | undefined;
  let bestD = SNAP + 1e-9;
  for (const c of CHAKRA_COLORS) {
    const [cr, cg, cb] = hexToRgb(c.hex);
    const d = Math.hypot(r - cr, g - cg, b - cb);
    if (d <= bestD) [best, bestD] = [c.id, d];
  }
  return best ?? `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/**
 * The colour a caster's elemental jutsu take: the chakra's colour (`tint`: a chakra colour or any
 * '#rrggbb'). Natural (no tint) keeps the owner's colours, whatever the burst: the burst is the
 * chakra's type, and the Lightning burst is yellow while his bolts are blue.
 */
export function vfxTintOf(chakra: Pick<ChakraChoice, 'tint'> | undefined): string | undefined {
  return chakra?.tint;
}

/** True when `color` leaves this sheet as he drew it: Natural, the sheet's own colour (or a custom colour within a hair of it), or a colour this game does not know. */
export function vfxTintIsNatural(element: TintElement, color: string | undefined, sheet: Pick<VfxSheet, 'beast' | 'sprite'> = {}): boolean {
  const fam = familyOf(element, sheet);
  const c = resolve(color);
  return !fam || !c || fam.natural.includes(c);
}

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const luma = (r: number, g: number, b: number) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
const hueGap = (a: number, b: number) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);

function hslRgb(h: number, s: number, l: number): RGB {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/** The colour of hue `h` and saturation `s` whose luma is `y` (luma grows with HSL lightness). */
function withLuma(h: number, s: number, y: number): RGB {
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 18; k++) {
    const mid = (lo + hi) / 2;
    const c = hslRgb(h, s, mid);
    if (luma(c[0], c[1], c[2]) < y) lo = mid;
    else hi = mid;
  }
  return hslRgb(h, s, (lo + hi) / 2);
}

/** Where luma `y` sits among his five tones: 0 (dark edge) to 4 (core). */
function placeOf(y: number, stops: Stops): number {
  if (y <= stops[0]) return 0;
  if (y >= stops[4]) return 4;
  let i = 0;
  while (y > stops[i + 1]) i++;
  return i + (y - stops[i]) / (stops[i + 1] - stops[i]);
}

function toneAt(t: readonly RGB[], p: number): RGB {
  const i = Math.min(3, Math.floor(p));
  return mix(t[i], t[i + 1], p - i);
}

/** How one of his colours turns out. */
interface Look {
  /** His line, or smoke, dust, debris, moss: stays his. */
  keep: boolean;
  /** His line (black's rim follows it where it meets the air). */
  line: boolean;
  /** How much of the new colour it takes (a pixel that is part smoke takes part). */
  w: number;
  /** His luma. */
  y: number;
  /** The new colour (not black: final; black: the body's dark step). */
  c: RGB;
}

interface Scheme {
  fam: Family;
  lines: Set<number>;
  tones: readonly RGB[];
  /** Water, wind, lightning, earth: the colour's hue in every tone. */
  hue?: number;
  /** White: the light is lifted. */
  white: boolean;
  /** Black, or a very dark custom colour: dark steps, a rim, a glow. */
  dark: boolean;
  /** Black only: the body's hue and saturation, the rim, its inner band, and the hottest core. */
  darkHue: number;
  darkSat: number;
  rim: RGB;
  band: RGB;
  core: RGB;
}

function schemeOf(fam: Family, id: string): Scheme {
  const raw = tintPal(id) as unknown as RGB[];
  const [h2, s2, l2] = rgbToHsl(...raw[2]);
  const dark = id === 'black' || (id.startsWith('#') && l2 < 0.22);
  const white = id === 'white' || (id.startsWith('#') && l2 > 0.8);
  let tones: RGB[] = raw;
  let hue: number | undefined = fam.fiery ? undefined : h2;
  if (white && !fam.fiery) {
    // Silver: a cool grey shade under the light (the chakra's white is gold; on water, wind,
    // lightning and stone gold reads as sand). A custom near-white keeps its own faint hue.
    const [h, s] = id === 'white' ? [215, 0.16] : [h2, Math.min(0.3, s2)];
    hue = h;
    tones = [0.25, 0.45, 0.65, 0.85, 0.97].map((l, i) => hslRgb(h, s * (1 - i * 0.18), l));
  } else if (white) {
    // White fire: the white chakra's warm gold, faint, so the flame is white-hot, not yellow.
    tones = raw.map((c) => {
      const [h, s, l] = rgbToHsl(c[0], c[1], c[2]);
      return hslRgb(h, s * 0.45, l);
    });
  } else if (!fam.fiery) {
    // Keep the colour's hue up to the lightest tone, and keep that tone pale (foam, sparks).
    tones = raw.map((c, i) => {
      const [, s, l] = rgbToHsl(c[0], c[1], c[2]);
      return hslRgb(h2, i === 4 ? Math.min(0.3, s) : s, l);
    });
  }
  const lines = lineSet(fam);
  if (!dark) return { fam, lines, tones, hue, white, dark, darkHue: 0, darkSat: 0, rim: WHITE, band: WHITE, core: WHITE };
  // Black: the black chakra's own violet and red; a dark custom colour: its own hue, lit.
  const black = id === 'black';
  const rim: RGB = black ? raw[3] : hslRgb(h2, Math.min(1, s2 * 1.2), 0.52);
  const core: RGB = fam.hot ? (black ? raw[4] : hslRgb(h2, s2 * 0.8, 0.74)) : mix(rim, WHITE, 0.45);
  return { fam, lines, tones, white, dark, darkHue: h2, darkSat: Math.min(0.38, s2), rim, band: mix(raw[2], rim, 0.35), core };
}

function lookOf(s: Scheme, r: number, g: number, b: number): Look {
  const { fam } = s;
  const [h, sat, l] = rgbToHsl(r, g, b);
  const y = luma(r, g, b);
  const line = s.lines.has((r << 16) | (g << 8) | b) || l <= 0.1;
  let keep = line;
  // Moss is a mid-dark green; the pale yellow flash of an impact is light, not moss.
  if (fam.earth && h >= 55 && h <= 160 && sat >= 0.15 && l < 0.7) keep = true;
  if (fam.eyes && h >= 40 && h <= 65 && sat > 0.6 && l > 0.3) keep = true;
  let w = 1;
  if (l <= 0.8) {
    if (fam.material) w = clamp01((sat - fam.material[0]) / (fam.material[1] - fam.material[0]));
    // Off the element's hue (dust, debris, a cloud): fades out over 20 degrees past the half width.
    if (fam.hue && sat >= 0.08) w = Math.min(w, clamp01((fam.hue[1] + 20 - hueGap(h, fam.hue[0])) / 20));
  }
  if (w <= 0) keep = true;
  if (keep) return { keep, line, w: 0, y, c: [r, g, b] };
  const p = placeOf(y, fam.stops);
  if (s.dark) {
    const yn = clamp01((y - fam.stops[0]) / (fam.stops[3] - fam.stops[0]));
    return { keep, line, w, y, c: hslRgb(s.darkHue, s.darkSat, 0.02 + 0.22 * yn) };
  }
  const t = toneAt(s.tones, p);
  const [th, ts] = rgbToHsl(t[0], t[1], t[2]);
  const hue = s.hue ?? th;
  // His saturation scales the colour's: pale wind stays pale; a grey stone keeps a little colour.
  const k = Math.min(1.25, Math.max(fam.earth ? 0.45 : 0.3, sat / 0.75));
  const st = clamp01(ts * fam.vivid * k);
  // His luma: kept in the dark tones; from the middle tone up a quarter of the way toward the
  // colour's own; white lifts it all. Never past his own lightest.
  let yo = s.white ? 0.32 + 0.64 * clamp01(y / Math.max(0.8, fam.stops[4])) : y + 0.25 * clamp01((p - 1.5) / 1.5) * (luma(t[0], t[1], t[2]) - y);
  yo = Math.min(yo, Math.max(y, 0.97));
  // A part-smoke pixel takes the new hue only, at its own saturation and luma, and only part of it.
  if (w < 1) return { keep, line, w, y, c: mix([r, g, b], withLuma(hue, Math.min(st, sat), y), w) };
  return { keep, line, w, y, c: withLuma(hue, st, yo) };
}

/**
 * An elemental effect sheet (RGBA) in a chakra colour: `color` is a chakra colour id or '#rrggbb'
 * (`vfxTintOf(chakra)`). Natural, the sheet's own colour or an unknown colour return `rgba` itself,
 * untouched; otherwise a new buffer of the same size: every pixel keeps its alpha, his line, smoke,
 * dust, debris and moss keep their colour, and the rest takes the colour at his own brightness.
 */
export function tintVfx<T extends Uint8Array | Uint8ClampedArray>(rgba: T, element: TintElement, color: string | undefined, sheet: VfxSheet): T {
  if (vfxTintIsNatural(element, color, sheet)) return rgba;
  const { width: W, height: H } = sheet;
  if (rgba.length !== W * H * 4) throw new RangeError(`tintVfx: ${rgba.length} bytes is not ${W} x ${H} RGBA`);
  const fam = familyOf(element, sheet)!;
  const s = schemeOf(fam, resolve(color)!);
  const n = W * H;
  const out = rgba.slice() as T;
  // Each colour is worked out once: `at` holds each pixel's entry in `list` (-1: empty air).
  const index = new Map<number, number>();
  const list: Look[] = [];
  const at = new Int32Array(n).fill(-1);
  let lastC = -1;
  let lastK = -1;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (rgba[o + 3] === 0) continue;
    const c = (rgba[o] << 16) | (rgba[o + 1] << 8) | rgba[o + 2];
    if (c !== lastC) {
      let k = index.get(c);
      if (k === undefined) {
        index.set(c, (k = list.length));
        list.push(lookOf(s, rgba[o], rgba[o + 1], rgba[o + 2]));
      }
      lastC = c;
      lastK = k;
    }
    at[i] = lastK;
  }
  const put = (o: number, v: RGB) => {
    out[o] = Math.round(v[0]);
    out[o + 1] = Math.round(v[1]);
    out[o + 2] = Math.round(v[2]);
  };
  if (!s.dark) {
    for (let i = 0; i < n; i++) {
      // Earth's see-through pixels are its dust cloud, which stays his.
      if (at[i] < 0 || list[at[i]].keep || (fam.earth && rgba[i * 4 + 3] < 255)) continue;
      put(i * 4, list[at[i]].c);
    }
    return out;
  }
  darkPass(rgba, out, at, list, s, sheet);
  return out;
}

/**
 * Black: the body keeps its dark steps; solid pixels along the air (or along his line where it
 * meets the air) are the rim, the ones inside it a softer band; the bright parts climb through the
 * rim colour to the core; tiny specks glow; faint pixels glow only next to bright ones (a halo),
 * and a wide faint ground pool stays dark. Neighbours stop at the frame's edge.
 */
function darkPass(rgba: Uint8Array | Uint8ClampedArray, out: Uint8Array | Uint8ClampedArray, at: Int32Array, list: Look[], s: Scheme, sheet: VfxSheet): void {
  const { width: W, height: H } = sheet;
  const fw = sheet.frameW ?? W;
  const fh = sheet.frameH ?? H;
  const n = W * H;
  const { fam } = s;
  const s0 = fam.stops[0];
  const s3 = fam.stops[3];
  // Which of the four neighbours lie in the same frame (bits: left, right, up, down), by column and row.
  const colIn = new Uint8Array(W);
  const rowIn = new Uint8Array(H);
  for (let x = 0; x < W; x++) colIn[x] = (x % fw > 0 ? 1 : 0) | (x % fw < fw - 1 && x + 1 < W ? 2 : 0);
  for (let y = 0; y < H; y++) rowIn[y] = (y % fh > 0 ? 4 : 0) | (y % fh < fh - 1 && y + 1 < H ? 8 : 0);
  // Per pixel: 1 air, 2 his line, 4 moves (takes the whole colour), 8 solid, 16 bright (above his tone 3).
  const AIR = 1;
  const LINE = 2;
  const MOVES = 4;
  const SOLID = 8;
  const BRIGHT = 16;
  const kind = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (at[i] < 0) {
      kind[i] = AIR;
      continue;
    }
    const lk = list[at[i]];
    const a = rgba[i * 4 + 3];
    let k = a >= GLOW_ALPHA ? SOLID : 0;
    if (lk.line) k |= LINE;
    if (!lk.keep && !(fam.earth && a < 255)) {
      if (lk.w >= 1) k |= MOVES;
      if (lk.y > s3) k |= BRIGHT;
    }
    kind[i] = k;
  }
  // 1. His line where it touches the air (edge), then the rim along the air or that line, then its inner band.
  const edge = new Uint8Array(n);
  const rim = new Uint8Array(n);
  const touches = (test: Uint8Array, mask: number, i: number, x: number, y: number): boolean => {
    const nb = colIn[x] | rowIn[y];
    return (nb & 1 && test[i - 1] & mask) || (nb & 2 && test[i + 1] & mask) || (nb & 4 && test[i - W] & mask) || (nb & 8 && test[i + W] & mask) ? true : false;
  };
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) if (kind[i] & LINE && touches(kind, AIR, i, x, y)) edge[i] = 1;
  const RIMMABLE = MOVES | SOLID;
  for (let y = 0, i = 0; y < H; y++)
    for (let x = 0; x < W; x++, i++) if ((kind[i] & RIMMABLE) === RIMMABLE && (touches(kind, AIR, i, x, y) || touches(edge, 1, i, x, y))) rim[i] = 1;
  for (let y = 0, i = 0; y < H; y++)
    for (let x = 0; x < W; x++, i++) if ((kind[i] & RIMMABLE) === RIMMABLE && !rim[i] && touches(rim, 1, i, x, y)) rim[i] = 2;
  // 2. Specks: pieces of the effect smaller than SPECK pixels (4-connected, within the frame).
  const speck = new Uint8Array(n);
  const seen = new Uint8Array(n);
  const stack = new Int32Array(n);
  const piece: number[] = [];
  for (let i = 0; i < n; i++) {
    if (kind[i] & AIR || seen[i]) continue;
    let top = 0;
    stack[top++] = i;
    seen[i] = 1;
    piece.length = 0;
    while (top > 0) {
      const j = stack[--top];
      if (piece.length < SPECK) piece.push(j);
      const nb = colIn[j % W] | rowIn[(j / W) | 0];
      if (nb & 1 && !(kind[j - 1] & AIR) && !seen[j - 1]) (seen[j - 1] = 1), (stack[top++] = j - 1);
      if (nb & 2 && !(kind[j + 1] & AIR) && !seen[j + 1]) (seen[j + 1] = 1), (stack[top++] = j + 1);
      if (nb & 4 && !(kind[j - W] & AIR) && !seen[j - W]) (seen[j - W] = 1), (stack[top++] = j - W);
      if (nb & 8 && !(kind[j + W] & AIR) && !seen[j + W]) (seen[j + W] = 1), (stack[top++] = j + W);
    }
    if (piece.length < SPECK) for (const j of piece) speck[j] = 1;
  }
  // 3. The halo: within 2 px of a bright pixel (a square, within the frame), in two passes.
  const near = new Uint8Array(n);
  const rowNear = new Uint8Array(n);
  for (let y = 0, i = 0; y < H; y++)
    for (let x = 0; x < W; x++, i++) {
      if (!(kind[i] & BRIGHT)) continue;
      const x0 = Math.max(x - 2, x - (x % fw));
      const x1 = Math.min(x + 2, x - (x % fw) + fw - 1, W - 1);
      for (let xx = x0; xx <= x1; xx++) rowNear[y * W + xx] = 1;
    }
  for (let y = 0, i = 0; y < H; y++)
    for (let x = 0; x < W; x++, i++) {
      if (!rowNear[i]) continue;
      const y0 = Math.max(y - 2, y - (y % fh));
      const y1 = Math.min(y + 2, y - (y % fh) + fh - 1, H - 1);
      for (let yy = y0; yy <= y1; yy++) near[yy * W + x] = 1;
    }
  const low = hslRgb(s.darkHue, s.darkSat, 0.26);
  const glowDim = hslRgb(s.darkHue, s.darkSat, 0.26);
  // The bright parts climb from the body's top step to the rim colour; fire and lightning go on to
  // the core (their white-hot heart), the others stop part way (foam, a lit stone face).
  const peak = Math.max(fam.stops[4], 0.97);
  const hotOf = (y: number): RGB => {
    const t = clamp01((y - s3) / (peak - s3));
    if (!fam.hot) return mix(low, s.rim, t * 0.6);
    return t < 0.45 ? mix(low, s.rim, t / 0.45) : t < 0.8 ? s.rim : mix(s.rim, s.core, (t - 0.8) / 0.2);
  };
  for (let i = 0; i < n; i++) {
    const k = kind[i];
    if (k & AIR) continue;
    const lk = list[at[i]];
    if (lk.keep || (fam.earth && rgba[i * 4 + 3] < 255)) continue;
    const yn = clamp01((lk.y - s0) / (s3 - s0));
    let c = k & BRIGHT ? hotOf(lk.y) : lk.c;
    if (speck[i]) c = mix(glowDim, s.rim, 0.5 + 0.5 * yn);
    else if (!(k & SOLID)) {
      if (near[i]) c = mix(glowDim, s.rim, yn);
    } else if (!(k & BRIGHT) && rim[i] === 1) c = s.rim;
    else if (!(k & BRIGHT) && rim[i] === 2) c = mix(c, s.band, 0.55);
    const o = i * 4;
    const v = lk.w >= 1 ? c : mix([rgba[o], rgba[o + 1], rgba[o + 2]], c, lk.w);
    out[o] = Math.round(v[0]);
    out[o + 1] = Math.round(v[1]);
    out[o + 2] = Math.round(v[2]);
  }
}
