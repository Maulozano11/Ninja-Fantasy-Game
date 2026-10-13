// Palettes and 2D painting helpers for the landmarks group (landmarks.ts).
//
// The ramps are hand-tuned rather than generated: 7 entries each,
//   0 outline, 1 deep, 2 shadow, 3 base, 4 light, 5 bright, 6 glint,
// with shadows drifting cool (blue-violet, teal for greens) and lights drifting warm (ochre,
// cream), the way the owner's reference paints its materials. Base steps sit on the shared kit
// MATERIALS so the group still matches the rest of the world (stone #7a7c80, red lacquer #b3322c,
// rope #b49a6a, paper #e8dfc8 ...).

import { Canvas, Color, hash, hex, mix } from './kit';

export const rampOf = (hexes: string[]): Color[] => hexes.map((h) => hex(h));

// --- stone ----------------------------------------------------------------------------------

/** Granite: indigo shadows, neutral body, warm cream lights. */
export const STONE_R = rampOf(['#1b1926', '#33334a', '#4b4e64', '#6b6e7b', '#8d8c8b', '#b0a998', '#d4cbb2']);
/** Warm sandstone / river pebble. */
export const STONE_WARM_R = rampOf(['#221a1d', '#45393e', '#655759', '#857868', '#a39780', '#c1b59a', '#ddd3b7']);
/** Dark slate pebble (blue-grey). */
export const SLATE_R = rampOf(['#14161f', '#262a3a', '#363d50', '#4a5266', '#646d7e', '#8a92a0', '#b8bec6']);
/** Pale quartz pebble. */
export const QUARTZ_R = rampOf(['#2a2630', '#5d5a68', '#8a8690', '#aeaaa8', '#c8c2b6', '#e0d9c8', '#f4efe0']);
/** Rain-streaked stone: the granite ramp pulled toward algae green (streaks under moss). */
export const STAIN_R = STONE_R.map((c, i) => mix(c, rampOf(['#101a14', '#1d2e25', '#2c4232', '#435a3e', '#5e7246', '#7f8c58', '#a6ad78'])[i], 0.42));
/** Wet stone: darker and cooler, with a cold glint. */
export const STONE_WET_R = rampOf(['#141823', '#283041', '#3d4759', '#566072', '#747d88', '#a1a9ad', '#e1e9e8']);
/** Stone seen through water. */
export const STONE_SUB_R = rampOf(['#0f2238', '#1b3a58', '#29506f', '#386784', '#4d7f98', '#6c9eb2', '#a8d2dc']);
export const WATER_R = rampOf(['#0f2238', '#1c3c5c', '#2a5a80', '#3f7fa8', '#5fa2c4', '#8bc6dc', '#c6e9f0']);

// --- growth ---------------------------------------------------------------------------------

/** Moss cushions: blue-green in shadow, yellow-green where the sun hits the leaf tips. */
export const MOSS_R = rampOf(['#12201b', '#1e382c', '#30532f', '#4a7031', '#6c8e35', '#97b043', '#c7d46a']);
/** Pale crust lichen (sage to cream). */
export const LICHEN_R = rampOf(['#2a2f26', '#59624f', '#7f896f', '#a2a886', '#c0c09c', '#d8d3b2', '#ebe5c8']);
/** Orange lichen (sparse accents). */
export const LICHEN_O_R = rampOf(['#2c1a10', '#5e3418', '#8a4f1f', '#b06f2c', '#cc8f3c', '#e0b05a', '#f0d28a']);
/** Grass blades at the foot of stones and posts. */
export const GRASS_R = rampOf(['#10201a', '#1f3a28', '#2f5530', '#457237', '#62903c', '#89ad4a', '#b5cc6e']);

// --- wood, rope, paper, lacquer -------------------------------------------------------------

/** Fresh-cut wood (end grain, splinters). */
export const WOOD_R = rampOf(['#22140f', '#4a2a1d', '#6e4128', '#8f5c35', '#ae7a45', '#c99a5c', '#e2bd7e']);
/** Weathered, sun-greyed timber (signpost, rails). */
export const WOOD_OLD_R = rampOf(['#1e1517', '#3c2c2c', '#5a463e', '#786151', '#977f65', '#b69e7e', '#d2bf9c']);
/** Dark old wood (doors, caps). */
export const WOOD_DK_R = rampOf(['#170f10', '#2d1f1e', '#43302a', '#5b4236', '#765845', '#927257', '#ae8f6e']);
/** Round posts with bark. */
export const BARK_R = rampOf(['#171010', '#2b1f1d', '#41312a', '#584436', '#725a44', '#8d7456', '#a88f6c']);
/** Cedar bark shingles (signpost cap). */
export const CEDAR_R = rampOf(['#1e1110', '#3d2421', '#5a352b', '#774a37', '#966446', '#b48258', '#cfa274']);
/** Straw rope. */
export const ROPE_R = rampOf(['#2b1f14', '#53412a', '#786238', '#9b824c', '#b8a063', '#d2bd82', '#e7daa8']);
/** Shide and ofuda paper: cool lilac shadows, warm white light. */
export const PAPER_R = rampOf(['#3a3647', '#78748a', '#a5a1b2', '#cbc6c8', '#e6e0d2', '#f6f1e3', '#fffdf5']);
/** Shrine vermilion lacquer (base = kit red #b3322c). */
export const RED_R = rampOf(['#2a0b12', '#571626', '#83202a', '#b3322c', '#cf4932', '#e46c3c', '#f39a5e']);
/** Black lacquer beams and roofing: cool charcoal with a blue sheen. */
export const BLACK_R = rampOf(['#0b0a10', '#17141d', '#231f2a', '#312c38', '#45404e', '#615d70', '#8b8ca2']);
/** Gilt fittings. */
export const GOLD_R = rampOf(['#2a1a08', '#5c3a12', '#8a5e1c', '#b48a2c', '#d4ae44', '#ead070', '#f8eaa8']);
export const IRON_R = rampOf(['#121219', '#272834', '#3d404e', '#565b6b', '#737a8b', '#98a0ae', '#c2c8d2']);
export const RUST: Color[] = rampOf(['#4a2418', '#7a3d22', '#a3592c']);
/** Brush ink. */
export const INK_R = rampOf(['#0c0a0e', '#16131a', '#221d25', '#2f2a2c', '#4a4448', '#6a6266', '#8e8689']);

// --- bamboo ---------------------------------------------------------------------------------

/** Dried bamboo (straw yellow with a little green). */
export const BAMBOO_R = rampOf(['#23200f', '#4b4626', '#6d6736', '#908749', '#b0a65d', '#cbc27a', '#e2dba2']);
/** Fresher, greener slats. */
export const BAMBOO_G_R = rampOf(['#18210f', '#334424', '#4e6337', '#6c8049', '#8b9d5c', '#adbd7a', '#d0dba4']);
/** Weathered grey slats. */
export const BAMBOO_GREY_R = rampOf(['#1e1d18', '#403d33', '#5f5b4c', '#7f7a65', '#9d977e', '#bab399', '#d6d0b8']);
/** Aged posts (brown). */
export const BAMBOO_DK_R = rampOf(['#21170f', '#45321f', '#634a2d', '#81653d', '#9d8250', '#b89f6a', '#d2bd8e']);

// --- fire -----------------------------------------------------------------------------------

/** Lantern flame, cool to hot: deep red edge, red tip, orange, yellow, white-hot core. */
export const FLAME = { d: hex('#a8321c'), r: hex('#e0502a'), o: hex('#f59a2a'), y: hex('#fcd04a'), w: hex('#fff4c0') } as const;
/** Inside of a lit firebox, dark to bright. */
export const EMBER_R = rampOf(['#3a160e', '#6e2612', '#a43e16', '#d8631f', '#f2912e', '#fbc04e', '#ffe7a0']);

// --- outline --------------------------------------------------------------------------------

/** Deep indigo that outlines are pulled toward (not black: they keep the material's hue). */
export const OUTLINE_TINT = hex('#120e1c');

/**
 * Adds a 1 px outline tinted by the material it surrounds. The darkest 4-neighbour is pulled
 * toward deep indigo: less on the lit upper-left side (a lighter, coloured edge), more on the
 * shadow side, so the silhouette stays crisp but never reads as a black cartoon line.
 */
export function outlineTinted(c: Canvas, opts: { lit?: number; dark?: number; minAlpha?: number } = {}): void {
  const litAmt = opts.lit ?? 0.58, darkAmt = opts.dark ?? 0.7, minA = opts.minAlpha ?? 200;
  const add: [number, number, Color][] = [];
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      if (c.alpha(x, y) >= minA) continue;
      let best: Color | null = null, bestL = Infinity, litSide = false;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = c.get(x + ox, y + oy);
        if (n[3] < minA) continue;
        const l = n[0] * 0.3 + n[1] * 0.59 + n[2] * 0.11;
        if (l < bestL) {
          bestL = l;
          best = n;
        }
        // The shape lies to the right or below: this pixel is on its upper-left (lit) edge.
        if (ox === 1 || oy === 1) litSide = true;
      }
      if (!best) continue;
      const shadowSide = c.get(x - 1, y)[3] >= minA || c.get(x, y - 1)[3] >= minA;
      const amt = litSide && !shadowSide ? litAmt : darkAmt;
      add.push([x, y, mix([best[0], best[1], best[2], 255], OUTLINE_TINT, amt)]);
    }
  for (const [x, y, col] of add) c.set(x, y, col);
}

// --- rope and paper -------------------------------------------------------------------------

/**
 * A twisted rope along a screen-space polyline. `thick` rows across the rope, lit on its upper
 * edge; the twist is a diagonal stripe (dark groove, then a lit strand) every `period` px.
 * `steps` picks the ramp tones [groove, lower, body, upper, strand highlight].
 */
export function drawRope(c: Canvas, pts: [number, number][], thick: number, ramp: Color[], o: { period?: number; steps?: number[]; taper?: boolean } = {}): void {
  const period = o.period ?? 3;
  const [sGroove, sLow, sBody, sUp, sHi] = o.steps ?? [1, 2, 3, 4, 5];
  let s = 0;
  const total = pts.slice(1).reduce((acc, p, i) => acc + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
  for (let k = 0; k + 1 < pts.length; k++) {
    const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
    const L = Math.hypot(bx - ax, by - ay);
    const n = Math.max(1, Math.ceil(L * 2));
    const nx = -(by - ay) / (L || 1), ny = (bx - ax) / (L || 1); // normal (points down for a left-to-right rope)
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const px = ax + (bx - ax) * t, py = ay + (by - ay) * t;
      const arc = s + L * t;
      const th = o.taper ? Math.max(1, Math.round(thick * Math.min(1, (Math.min(arc, total - arc) + 1.5) / 4))) : thick;
      for (let r = 0; r < th; r++) {
        const off = r - (th - 1) / 2;
        const x = Math.floor(px + nx * off), y = Math.floor(py + Math.abs(ny) * off);
        const ph = (((arc + r * 1.1) % period) + period) % period;
        let st = r === 0 ? sUp : r === th - 1 ? sLow : sBody;
        if (ph < 0.9) st = sGroove;
        else if (ph < 1.9 && r < th - 1) st = sHi;
        c.set(x, y, ramp[st]);
      }
    }
    s += L;
  }
}

/**
 * Shide: a zigzag paper streamer hanging from (x, y), `segs` folds, each 2 px tall, stepping
 * right then left. Lit faces 5, the underside of every fold 3, the fold crease 2.
 */
export function drawShide(c: Canvas, x: number, y: number, segs: number, ramp: Color[], o: { dir?: 1 | -1; sway?: number } = {}): void {
  const dir = o.dir ?? 1;
  // A short tab where the paper is tucked into the rope.
  c.set(x, y, ramp[4]);
  c.set(x + dir, y, ramp[3]);
  for (let k = 0; k < segs; k++) {
    const off = (k % 2 ? dir : 0) + Math.round((o.sway ?? 0) * (k / Math.max(1, segs - 1)));
    const yy = y + 1 + k * 2;
    const x0 = x + off;
    c.set(x0, yy, ramp[k === 0 ? 6 : 5]);
    c.set(x0 + 1, yy, ramp[k % 2 ? 4 : 5]);
    c.set(x0, yy + 1, ramp[k % 2 ? 3 : 4]);
    c.set(x0 + 1, yy + 1, ramp[2]);
  }
}

// --- grass ----------------------------------------------------------------------------------

/**
 * A small tuft of grass blades rooted along the ground line at (x, y): `n` blades 2-5 px tall,
 * leaning outward, dark at the root and lit at the tips (no outline: they are drawn after it).
 */
export function grassTuft(c: Canvas, x: number, y: number, n: number, seed: number, o: { h?: number; ramp?: Color[] } = {}): void {
  const ramp = o.ramp ?? GRASS_R;
  const hMax = o.h ?? 4;
  for (let b = 0; b < n; b++) {
    const bx = x + Math.round((b - (n - 1) / 2) * 1.2 + (hash(b, 1, seed) - 0.5));
    const hh = 2 + Math.floor(hash(b, 2, seed) * (hMax - 1));
    const lean = (bx < x ? -1 : bx > x ? 1 : hash(b, 3, seed) < 0.5 ? -1 : 1) * (hash(b, 4, seed) < 0.6 ? 1 : 0);
    for (let k = 0; k < hh; k++) {
      const xx = bx + (k >= hh - 1 ? lean : 0) + (k >= hh - 3 && hh > 3 ? lean : 0) * 0;
      const st = k === 0 ? 1 : k === hh - 1 ? (hash(b, 5, seed) < 0.5 ? 5 : 4) : k === hh - 2 ? 4 : 3;
      c.set(xx, y - k, ramp[st]);
    }
  }
}
