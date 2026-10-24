// The figure errors the owner has found on our characters (the "known errors" of
// docs/SPRITE_STYLE_GUIDE.md), on a flattened frame: body parts apart with white pixels between them, dead
// white pixels on an arm, a torso apart from its legs, a piece loose from the figure. His words on Solen on
// the bulky body (2026-10-23): "aun tiene varios errores solen de parte del cuerpo separadas por pixeles
// blancos o algunos de sus brazos mal dibujados con pixeles blancos muertos y en la de victoria tambien esta
// separado el torso de las piernas ... recuerda todos los errores de todos los personajes y verifica que
// este y los futuros no los tengan".
//
// findGlitches finds them (src/sprite/standard.test.ts runs it on every character, body, pose and frame);
// mendGlitches closes them on the bulky body, whose looks were drawn on the male and open gaps between
// their pieces on its bigger frame (compose.ts). Effects drawn over the figure (depth 'top': cast runes, a
// palm's glow) are never looked at. Pure: works on the frame's buffers, no DOM.

import { airOf } from './holes';
import { GRID, PARTS } from './raster';

const N = GRID * GRID;

export type GlitchKind = 'loose' | 'pocket' | 'crack' | 'edge';

/** One error: what it is, where (the pixel nearest its middle, x and y), how many pixels, the parts round it. */
export interface Glitch {
  kind: GlitchKind;
  x: number;
  y: number;
  n: number;
  /** The body parts round it (pocket, crack) or its own (edge, loose). */
  parts: string[];
}

/** The largest pocket of background walled in by the figure that is an error and not a real gap (as under a hand on the hip). */
export const POCKET_MAX = 14;
/** The shortest crack (pixels) that parts the body; a 2-pixel notch is the inner corner of a joint (above a sandal's heel). */
export const CRACK_MIN = 3;
/** Light enough to show white against the background (luminance 0-255). */
export const LIGHT = 150;

/** Parts whose edge may be light as drawn: the held weapon (a blade's glow), our face and hair, our hand pictures (lit knuckles). */
const EDGE_FREE = new Set(['none', 'held', 'head', 'handN', 'handF']);
/** The parts that meet at a joint, or where a limb leaves the body: a crack between two of them parts the body. */
const JOINED = new Set(
  ['N', 'F']
    .flatMap((s) => [
      ['upperArm' + s, 'forearm' + s],
      ['forearm' + s, 'hand' + s],
      ['thigh' + s, 'shin' + s],
      ['shin' + s, 'foot' + s],
      ['torso', 'upperArm' + s],
      ['pelvis', 'thigh' + s],
      ['torso', 'thigh' + s],
    ])
    .concat([
      ['torso', 'pelvis'],
      ['head', 'torso'],
    ])
    .map(([a, b]) => [a, b].sort().join('/')),
);

const LEGS = new Set(['pelvis', 'thighN', 'shinN', 'footN', 'thighF', 'shinF', 'footF']);

const opaque = (rgba: Uint8ClampedArray, i: number) => rgba[i * 4 + 3] > 0;
const lum = (rgba: Uint8ClampedArray, i: number) => rgba[i * 4] * 0.299 + rgba[i * 4 + 1] * 0.587 + rgba[i * 4 + 2] * 0.114;
/** A pixel reads as line (his black, our outline): HSL lightness at most 0.2 (holes.ts isLinePixel). */
const isLine = (rgba: Uint8ClampedArray, i: number) => Math.max(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]) + Math.min(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]) <= 102;

function sides(i: number): number[] {
  const x = i % GRID;
  const out: number[] = [];
  if (x > 0) out.push(i - 1);
  if (x < GRID - 1) out.push(i + 1);
  if (i >= GRID) out.push(i - GRID);
  if (i < N - GRID) out.push(i + GRID);
  return out;
}

function around(i: number): number[] {
  const x = i % GRID;
  const y = (i / GRID) | 0;
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && x + dx >= 0 && x + dx < GRID && y + dy >= 0 && y + dy < GRID) out.push(i + dy * GRID + dx);
  return out;
}

/** Groups of the pixels `inSet` accepts, 4- or 8-connected. */
function flood(inSet: (i: number) => boolean, eight: boolean): number[][] {
  const seen = new Uint8Array(N);
  const out: number[][] = [];
  for (let i = 0; i < N; i++) {
    if (seen[i] || !inSet(i)) continue;
    const g: number[] = [];
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const j = stack.pop()!;
      g.push(j);
      for (const k of eight ? around(j) : sides(j)) {
        if (seen[k] || !inSet(k)) continue;
        seen[k] = 1;
        stack.push(k);
      }
    }
    out.push(g);
  }
  return out;
}

const mid = (g: number[]) => {
  const cx = g.reduce((a, i) => a + (i % GRID), 0) / g.length;
  const cy = g.reduce((a, i) => a + ((i / GRID) | 0), 0) / g.length;
  const d = (i: number) => Math.hypot((i % GRID) - cx, ((i / GRID) | 0) - cy);
  const best = g.reduce((b, i) => (d(i) < d(b) ? i : b), g[0]);
  return { x: best % GRID, y: (best / GRID) | 0 };
};

/** The frame's buffers the finders read: colours, body parts, and which pixels are effects. */
export interface Flat {
  rgba: Uint8ClampedArray;
  part: Uint8Array;
  fx: (i: number) => boolean;
}

const partsOf = (f: Flat, px: number[]) => [...new Set(px.map((i) => PARTS[f.part[i]]))].sort();

/**
 * Background walled in by the figure, up to `max` pixels, between two or more parts of the body, with what
 * walls it in. Not a gap inside one piece (between his fingers, in a lock of hair), nor one beside the held
 * weapon (a sword's hilt, a blade against a leg), nor one between the hair and a shoulder or the cape's
 * collar (a lock hanging beside the face), nor a window between the two legs: those are drawn so.
 */
export function findPockets(f: Flat, max = POCKET_MAX, air = airOf(f.rgba)): { px: number[]; border: number[]; parts: string[] }[] {
  const out: { px: number[]; border: number[]; parts: string[] }[] = [];
  for (const g of flood((i) => !opaque(f.rgba, i) && !air[i], false)) {
    if (g.length > max) continue;
    const inG = new Set(g);
    const border = [...new Set(g.flatMap(sides))].filter((k) => !inG.has(k));
    const parts = partsOf(f, border);
    if (border.some(f.fx) || parts.length < 2 || parts.includes('held')) continue;
    if (parts.includes('head') && parts.some((p) => p.startsWith('upperArm') || p === 'back')) continue;
    // a window between the two legs (under the crotch, between a bent knee and the other leg) is a real gap
    if (parts.every((p) => LEGS.has(p)) && parts.some((p) => p.endsWith('N')) && parts.some((p) => p.endsWith('F'))) continue;
    out.push({ px: g, border, parts });
  }
  return out;
}

/**
 * Background open to the outside but one pixel wide between two parts that meet (JOINED), CRACK_MIN pixels
 * or more long, with the pixels across it.
 */
export function findCracks(f: Flat, air = airOf(f.rgba)): { px: number[]; border: number[]; parts: string[] }[] {
  const { rgba, part } = f;
  const joined = (a: number, b: number) => JOINED.has([PARTS[part[a]], PARTS[part[b]]].sort().join('/'));
  const across = (i: number): number[] | null => {
    const x = i % GRID;
    if (x > 0 && x < GRID - 1 && opaque(rgba, i - 1) && opaque(rgba, i + 1) && joined(i - 1, i + 1)) return [i - 1, i + 1];
    if (i >= GRID && i < N - GRID && opaque(rgba, i - GRID) && opaque(rgba, i + GRID) && joined(i - GRID, i + GRID)) return [i - GRID, i + GRID];
    return null;
  };
  const out: { px: number[]; border: number[]; parts: string[] }[] = [];
  for (const g of flood((i) => !!air[i] && !!across(i), false)) {
    if (g.length < CRACK_MIN) continue;
    const border = g.flatMap((i) => across(i)!);
    if (border.some(f.fx)) continue;
    out.push({ px: g, border, parts: partsOf(f, border) });
  }
  return out;
}

/** Light pixels on the figure's edge, next to the background, but on the parts of EDGE_FREE. */
export function findEdges(f: Flat, air = airOf(f.rgba)): number[] {
  const out: number[] = [];
  for (let i = 0; i < N; i++) {
    if (!opaque(f.rgba, i) || f.fx(i) || EDGE_FREE.has(PARTS[f.part[i]]) || lum(f.rgba, i) <= LIGHT) continue;
    if (sides(i).some((k) => air[k])) out.push(i);
  }
  return out;
}

/**
 * The errors of a frame:
 * - loose: a piece of the figure (8-connected) apart from the rest: a piece floating off its body, a
 *   torso apart from its legs, a weapon out of its hand, a stray speck.
 * - pocket: background walled in between parts of the body (findPockets): a crack between two pieces
 *   that no longer meet, the pocket under a chin.
 * - crack: a line of background between two parts that meet (findCracks): the body parted by white.
 * - edge: a light pixel on the figure's edge (findEdges): the black line missing there, a piece cut or
 *   turned past his line, a dead white pixel.
 * `atRest`: the frame is his picture as he drew it (idle on the body he drew the look on): only loose
 * pieces are looked for.
 */
export function findGlitches(fr: { rgba: Uint8ClampedArray; part: Uint8Array; fx?: Uint8Array }, atRest = false): Glitch[] {
  const f: Flat = { rgba: fr.rgba, part: fr.part, fx: (i) => !!fr.fx && !!(fr.fx[i >> 3] & (1 << (i & 7))) };
  const out: Glitch[] = [];
  const pieces = flood((i) => opaque(f.rgba, i), true);
  const main = pieces.reduce((m, p) => (p.length > m.length ? p : m), pieces[0] ?? []);
  for (const p of pieces) if (p !== main && !p.some(f.fx)) out.push({ kind: 'loose', ...mid(p), n: p.length, parts: partsOf(f, p) });
  if (atRest) return out;
  const air = airOf(f.rgba);
  for (const p of findPockets(f, POCKET_MAX, air)) out.push({ kind: 'pocket', ...mid(p.px), n: p.px.length, parts: p.parts });
  for (const c of findCracks(f, air)) out.push({ kind: 'crack', ...mid(c.px), n: c.px.length, parts: c.parts });
  for (const i of findEdges(f, air)) out.push({ kind: 'edge', x: i % GRID, y: (i / GRID) | 0, n: 1, parts: [PARTS[f.part[i]]] });
  return out;
}

/** The biggest pocket mended when the piece furthest back round it is the cape (it hangs behind the whole body). */
export const CAPE_POCKET_MAX = 48;

/**
 * Closes a frame's pockets, cracks and light edge pixels in place (rgba, part and depth of each pixel):
 * - a pocket is filled only where `fill` says (never by default: the owner, 2026-10-23, "cosas que ya estan
 *   bien las estamos rehaciendo"; a pocket is reported by findGlitches and looked at, not filled). Then it
 *   takes the piece furthest back round it, as if it went on behind the pieces in front: each pixel the
 *   colour of that piece's nearest pixel that is not line (its line where none is near). Up to POCKET_MAX
 *   pixels, CAPE_POCKET_MAX when that piece is the cape.
 * - a crack takes the line across it, so the two parts meet.
 * - a light edge pixel takes its piece's line (`outline`, 0xRRGGBB).
 * With `keep`, what `keep` accepts all round is left as drawn.
 * Returns the pixels changed.
 */
export function mendGlitches(
  rgba: Uint8ClampedArray,
  part: Uint8Array,
  top: Int16Array,
  fx: (i: number) => boolean,
  outline: (i: number) => number,
  keep: (i: number) => boolean = () => false,
  fill: (px: number[]) => boolean = () => false,
): number[] {
  const f: Flat = { rgba, part, fx };
  const changed: number[] = [];
  const copy = (i: number, from: number) => {
    for (let c = 0; c < 4; c++) rgba[i * 4 + c] = rgba[from * 4 + c];
    part[i] = part[from];
    top[i] = top[from];
    changed.push(i);
  };
  const pockets = () => {
    for (const p of findPockets(f, CAPE_POCKET_MAX)) {
      if (p.border.every(keep) || !fill(p.px)) continue;
      const back = p.border.reduce((b, k) => (top[k] < top[b] ? k : b), p.border[0]);
      if (p.px.length > POCKET_MAX && PARTS[part[back]] !== 'back') continue;
      // the back piece's pixels that are not line, up to four pixels in from the pocket
      const same = (k: number) => opaque(rgba, k) && top[k] === top[back] && part[k] === part[back];
      const near: number[] = [];
      let ring = p.border.filter(same);
      const seen = new Set<number>([...p.px, ...ring]);
      for (let r = 0; r < 4 && ring.length; r++) {
        const next: number[] = [];
        for (const k of ring) {
          if (!isLine(rgba, k)) near.push(k);
          for (const j of around(k)) if (!seen.has(j) && same(j)) seen.add(j), next.push(j);
        }
        ring = next;
      }
      const fallback = p.border.find((k) => isLine(rgba, k)) ?? back;
      const dist = (a: number, b: number) => Math.hypot((a % GRID) - (b % GRID), ((a / GRID) | 0) - ((b / GRID) | 0));
      const src = p.px.map((i) => (near.length ? near.reduce((b, k) => (dist(k, i) < dist(b, i) ? k : b), near[0]) : fallback));
      p.px.forEach((i, n) => {
        copy(i, src[n]);
        top[i] = top[back];
        part[i] = part[back];
      });
    }
  };
  const cracks = () => {
    for (const c of findCracks(f)) {
      if (c.border.every(keep)) continue;
      const line = c.border.find((k) => isLine(rgba, k)) ?? c.border[0];
      for (const i of c.px) copy(i, line);
    }
  };
  const edges = () => {
    for (const i of findEdges(f)) {
      if (keep(i)) continue;
      // the line beside it, else its material's line if that reads as line, else our outline's
      const beside = around(i).find((k) => opaque(rgba, k) && isLine(rgba, k) && !fx(k));
      const own = outline(i);
      const ch = [(own >> 16) & 255, (own >> 8) & 255, own & 255];
      const rgb = beside !== undefined ? (rgba[beside * 4] << 16) | (rgba[beside * 4 + 1] << 8) | rgba[beside * 4 + 2] : Math.max(...ch) + Math.min(...ch) <= 102 ? own : 0x07060b;
      [rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]] = [(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255];
      changed.push(i);
    }
  };
  // (closing a crack or an edge can wall in a new pocket: a few rounds while anything changes)
  for (let round = 0; round < 3; round++) {
    const before = changed.length;
    pockets();
    cracks();
    edges();
    if (changed.length === before) break;
  }
  return changed;
}
