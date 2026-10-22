// Closes the 1-pixel holes turned pieces leave in a figure (the owner's "pixeles blancos muertos",
// 2026-10-22: "si arregla el hueco de 1 pixel a todos").
//
// Pieces turned by RotSprite (his arms, cowl, cuirass, sandals, our limbs) meet each other at angles
// where a pixel or two falls between them: the background shows through as a white dot between the far
// upper arm and the torso, between the cowl's pieces, under a leaning torso or at a bent elbow. After the
// figure is flattened, closePinholes fills them:
//
// - a pinhole: up to PINHOLE transparent pixels the figure walls in on every side (not reached from the
//   frame's edge). Between two pieces (its border belongs to more than one depth or body part) it takes
//   the line of the pieces round it; inside one piece, the colour most of its neighbours have.
// - a nick: a transparent pixel open to the outside with the figure on three sides, where one of the three
//   is not a line (the figure's line is missing there). It takes the line round it.
// - a speck: at most SPECK pixels apart from everything else (a stray pixel of an outline left floating
//   off the figure). It is taken away.
//
// Real gaps are left as drawn: anything bigger than PINHOLE or open to the outside (between the legs,
// between an arm and the body, the owner's white gap between arm and body in his Roman picture), and the
// notches of an outline he drew (a nick whose three sides are all line, as between two hair spikes).
// Effects drawn on top of the figure (cast runes, the glow round a palm) are never filled or used.
//
// Pure: works on the flattened frame (sprite/compose.ts calls it), no DOM.

import { GRID, partIndex } from './raster';

/** The largest hole (in pixels) that counts as a pinhole. */
export const PINHOLE = 3;
/** The largest piece (in pixels) apart from everything else that counts as a stray speck. */
export const SPECK = 2;

const N = GRID * GRID;
const HELD = partIndex('held');

/** A pixel reads as line (his black, or our outline toward #07060b): HSL lightness at most 0.2. */
export function isLinePixel(rgba: Uint8ClampedArray, i: number): boolean {
  const r = rgba[i * 4];
  const g = rgba[i * 4 + 1];
  const b = rgba[i * 4 + 2];
  return Math.max(r, g, b) + Math.min(r, g, b) <= 102;
}

/** The air round the figure: the transparent pixels reached from the frame's edge, 4-connected. */
export function airOf(rgba: Uint8ClampedArray): Uint8Array {
  const air = new Uint8Array(N);
  const stack = new Int32Array(N);
  let n = 0;
  const reach = (i: number) => {
    if (air[i] || rgba[i * 4 + 3] > 0) return;
    air[i] = 1;
    stack[n++] = i;
  };
  for (let k = 0; k < GRID; k++) {
    reach(k);
    reach(N - GRID + k);
    reach(k * GRID);
    reach(k * GRID + GRID - 1);
  }
  while (n) {
    const i = stack[--n];
    const x = i % GRID;
    if (x > 0) reach(i - 1);
    if (x < GRID - 1) reach(i + 1);
    if (i >= GRID) reach(i - GRID);
    if (i < N - GRID) reach(i + GRID);
  }
  return air;
}

/** The 4 neighbours of a pixel inside the frame. */
function sides(i: number): number[] {
  const x = i % GRID;
  const out: number[] = [];
  if (x > 0) out.push(i - 1);
  if (x < GRID - 1) out.push(i + 1);
  if (i >= GRID) out.push(i - GRID);
  if (i < N - GRID) out.push(i + GRID);
  return out;
}

/** The 8 neighbours of a pixel inside the frame. */
function around(i: number): number[] {
  const x = i % GRID;
  const y = (i / GRID) | 0;
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && x + dx >= 0 && x + dx < GRID && y + dy >= 0 && y + dy < GRID) out.push(i + dy * GRID + dx);
  return out;
}

/**
 * The pinholes of a frame: each group (4-connected) of at most PINHOLE transparent pixels the air never
 * reaches, unless an effect pixel (`fx`) borders it.
 */
export function findPinholes(rgba: Uint8ClampedArray, fx: (i: number) => boolean = () => false, air = airOf(rgba)): number[][] {
  const seen = new Uint8Array(N);
  const out: number[][] = [];
  for (let i = 0; i < N; i++) {
    if (seen[i] || air[i] || rgba[i * 4 + 3] > 0) continue;
    const group: number[] = [];
    const stack = [i];
    seen[i] = 1;
    let effect = false;
    while (stack.length) {
      const j = stack.pop()!;
      group.push(j);
      for (const k of sides(j)) {
        if (rgba[k * 4 + 3] > 0) {
          if (fx(k)) effect = true;
        } else if (!seen[k]) {
          seen[k] = 1;
          stack.push(k);
        }
      }
    }
    if (group.length <= PINHOLE && !effect) out.push(group);
  }
  return out;
}

/**
 * The nicks of a frame: pixels of air with the figure on three or four sides, one of them not a line
 * (the figure's line is missing there), no effect pixel among them.
 */
export function findNicks(rgba: Uint8ClampedArray, fx: (i: number) => boolean = () => false, air = airOf(rgba)): number[] {
  const out: number[] = [];
  const solid = (k: number) => k >= 0 && rgba[k * 4 + 3] > 0;
  for (let i = 0; i < N; i++) {
    if (!air[i]) continue;
    const x = i % GRID;
    const l = x > 0 ? i - 1 : -1;
    const r = x < GRID - 1 ? i + 1 : -1;
    const u = i >= GRID ? i - GRID : -1;
    const d = i < N - GRID ? i + GRID : -1;
    if (+solid(l) + +solid(r) + +solid(u) + +solid(d) < 3) continue;
    const near = [l, r, u, d].filter(solid);
    if (near.some(fx) || near.every((k) => isLinePixel(rgba, k))) continue;
    out.push(i);
  }
  return out;
}

/**
 * The specks of a frame: pieces (8-connected) of at most SPECK pixels apart from everything else, with no
 * effect pixel in them (an effect may scatter sparks on purpose).
 */
export function findSpecks(rgba: Uint8ClampedArray, fx: (i: number) => boolean = () => false): number[][] {
  const seen = new Uint8Array(N);
  const out: number[][] = [];
  for (let i = 0; i < N; i++) {
    if (seen[i] || rgba[i * 4 + 3] === 0) continue;
    const piece: number[] = [];
    const stack = [i];
    seen[i] = 1;
    let effect = false;
    while (stack.length) {
      const j = stack.pop()!;
      if (piece.length <= SPECK) piece.push(j);
      if (fx(j)) effect = true;
      for (const k of around(j)) {
        if (seen[k] || rgba[k * 4 + 3] === 0) continue;
        seen[k] = 1;
        stack.push(k);
      }
    }
    if (piece.length <= SPECK && !effect) out.push(piece);
  }
  return out;
}

/** The most common colour among some pixels (ties: the darkest), as one of those pixels. */
function commonest(rgba: Uint8ClampedArray, pixels: number[]): number {
  const count = new Map<number, { n: number; at: number; dark: number }>();
  for (const k of pixels) {
    const c = (rgba[k * 4] << 16) | (rgba[k * 4 + 1] << 8) | rgba[k * 4 + 2];
    const e = count.get(c);
    if (e) e.n++;
    else count.set(c, { n: 1, at: k, dark: rgba[k * 4] + rgba[k * 4 + 1] + rgba[k * 4 + 2] });
  }
  let best: { n: number; at: number; dark: number } | null = null;
  for (const e of count.values()) if (!best || e.n > best.n || (e.n === best.n && e.dark < best.dark)) best = e;
  return best ? best.at : -1;
}

/**
 * The piece a filled pixel joins, among the pixels beside it: the one furthest back, but never the held
 * weapon while something else is there (the weapon keeps only its own pixels: the battle draws it on its
 * own when it is thrown).
 */
function ownerOf(part: Uint8Array, top: Int16Array, beside: number[]): number {
  const body = beside.filter((k) => part[k] !== HELD);
  const from = body.length ? body : beside;
  return from.reduce((b, k) => (top[k] < top[b] ? k : b), from[0]);
}

/**
 * Fills the pinholes and nicks of a flattened frame in place (rgba, the body part and the depth of each
 * pixel), a few rounds while closing one leaves another, then takes the specks away. `fx` marks effect
 * pixels; `outline` gives the line colour (0xRRGGBB) of the material at a pixel, for a nick with no line
 * beside it. Returns the pixels filled.
 */
export function closePinholes(
  rgba: Uint8ClampedArray,
  part: Uint8Array,
  top: Int16Array,
  fx: (i: number) => boolean,
  outline: (i: number) => number,
): number[] {
  const filled: number[] = [];
  // `from` gives the colour, `owner` the piece the pixel joins (its body part and depth).
  const put = (i: number, from: number, owner = from, rgb = -1) => {
    if (rgb < 0) for (let c = 0; c < 3; c++) rgba[i * 4 + c] = rgba[from * 4 + c];
    else [rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]] = [(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255];
    rgba[i * 4 + 3] = 255;
    part[i] = part[owner];
    top[i] = top[owner];
    filled.push(i);
  };
  for (let round = 0; round < 3; round++) {
    const before = filled.length;
    // Filling a pinhole leaves the air as it was: one flood a round serves both.
    const air = airOf(rgba);
    for (const hole of findPinholes(rgba, fx, air)) {
      const inHole = new Set(hole);
      const border = [...new Set(hole.flatMap(sides))].filter((k) => !inHole.has(k));
      const lines = border.filter((k) => isLinePixel(rgba, k));
      const pieces = new Set(border.map((k) => top[k] * 256 + part[k]));
      // Between pieces: their line (ownerOf: the piece it joins). Inside one: what most of each pixel's
      // neighbours are.
      const seamFrom = pieces.size > 1 && lines.length ? commonest(rgba, lines) : -1;
      const back = ownerOf(part, top, border);
      const from = hole.map((i) => (seamFrom >= 0 ? seamFrom : commonest(rgba, around(i).filter((k) => !inHole.has(k) && rgba[k * 4 + 3] > 0))));
      hole.forEach((i, n) => from[n] >= 0 && put(i, from[n], seamFrom >= 0 ? back : from[n]));
    }
    for (const i of findNicks(rgba, fx, air)) {
      // The line goes back round the piece it is missing from (a side that is not line): the line beside
      // it, or else the line a pixel further round of the piece in front.
      const solid = sides(i).filter((k) => rgba[k * 4 + 3] > 0);
      const bare = solid.find((k) => !isLinePixel(rgba, k))!;
      const line = (k: number) => rgba[k * 4 + 3] > 0 && isLinePixel(rgba, k) && !fx(k);
      const round = around(i).filter(line);
      const front = Math.max(...round.map((k) => top[k]));
      const lines = solid.some(line) ? solid.filter(line) : round.filter((k) => top[k] === front);
      const back = ownerOf(part, top, solid);
      if (lines.length) put(i, commonest(rgba, lines), back);
      else put(i, bare, back, outline(bare));
    }
    if (filled.length === before) break;
  }
  for (const speck of findSpecks(rgba, fx))
    for (const i of speck) {
      rgba.fill(0, i * 4, i * 4 + 4);
      part[i] = 0;
      top[i] = -1;
    }
  return filled;
}
