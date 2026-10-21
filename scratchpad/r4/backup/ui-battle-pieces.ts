// The battle UI pieces, rebuilt as clean pixel art from the owner's picture
// (docs/reference/ui-battle-owner-reference.jpg). Every piece is drawn here in ART pixels; the
// generator (ui-battle-kit.ts) doubles each art pixel when it writes the PNGs, so the pieces sit
// at the screen scale of a 1600x900 window with his chunky 2-pixel look.
//
// Sizes follow his picture times 1600/1024 = 1.5625 (so his 1-pixel detail is about one art
// pixel). Frames that stretch are 9-slice (or 3-slice) images; their insets are in art pixels.

import { Img, RGBA, alpha, hex, mixc } from './ui-img';
import {
  ALLY, BADGE, BROWN, FOE, GEM, GOLD, GREEN, KHAKI, METAL, Mask, OLIVE, PANEL, Pt, RAIL, RED, SILVER, TEAL,
  band, cbez, emboss, fillShape, filledLace, gem, gemOval, isoLine, orb, qbez, rhombGem, sdCircle, sdLp, sdRoundRect, spiral, stamp, wire, WIRE, WIRE_OUTLINE,
} from './ui-draw';

export interface Piece {
  name: string;
  img: Img;
  use: string;
  /** 9-slice insets in art pixels: top, right, bottom, left. */
  slice?: [number, number, number, number];
  /** Transparent margin around the visible frame (corner gems that stick out), art pixels. */
  outset?: [number, number, number, number];
  /** A window inside the frame (where a portrait, a map or an icon shows), art pixels. */
  window?: { x: number; y: number; w: number; h: number; shape: 'rect' | 'circle' };
  group: string;
}

// --- shared bits -------------------------------------------------------------------------------

/** A round gem in a metal bezel, centred on (cx, cy): gem radius r, bezel 1.5 pixels. */
function studGem(img: Img, cx: number, cy: number, r: number, color: keyof typeof GEM, metal: RGBA[] = METAL): void {
  const outer = r + 1.6;
  band(img, sdCircle(cx, cy, outer), { from: 0, width: 1.8, ramp: metal, lo: 2, hi: 7 });
  isoLine(img, sdCircle(cx, cy, outer + 1), 0, metal[0]);
  gem(img, cx, cy, r, GEM[color], false);
}

/** The rail-and-studs border of the action bar, from the outside in (his thin rails, lit top and left). */
function railRows(dir: 'top' | 'bottom'): RGBA[] {
  // His rail is one thin light line (about 3 px on screen) over a darker one, then a dark gap and
  // the dotted line: outline, light, mid, dark, studs, dark.
  const studs = RAIL[4];
  return dir === 'top'
    ? [METAL[0], RAIL[5], RAIL[2], PANEL[0], studs, PANEL[1]]
    : [METAL[0], RAIL[4], RAIL[2], PANEL[0], studs, PANEL[1]];
}

// --- action bar frame (9-slice) ----------------------------------------------------------------------

/**
 * His lace mount around a corner gem (top-left; flipped for the others): small gold curls that run
 * from the bezel along the rails, in the outset outside the frame.
 */
const GEM_MOUNT = [
  '........LL..',
  '.......l..L.',
  '..........M.',
];

export function barFrame(): Piece {
  const S = 40, m = 3;
  const img = new Img(S, S);
  const x0 = m, y0 = m, x1 = S - 1 - m, y1 = S - 1 - m;
  img.rect(x0, y0, x1 - x0 + 1, y1 - y0 + 1, PANEL[3]);
  const top = railRows('top'), bot = railRows('bottom');
  for (let i = 0; i < top.length; i++) {
    for (let x = x0 + i; x <= x1 - i; x++) {
      const studT = i === 4 ? ((x - x0) % 2 === 0 ? top[i] : PANEL[1]) : top[i];
      const studB = i === 4 ? ((x - x0) % 2 === 0 ? bot[i] : PANEL[1]) : bot[i];
      img.set(x, y0 + i, studT);
      img.set(x, y1 - i, studB);
    }
    for (let y = y0 + i; y <= y1 - i; y++) {
      const studL = i === 4 ? ((y - y0) % 2 === 0 ? top[i] : PANEL[1]) : top[i];
      const studR = i === 4 ? ((y - y0) % 2 === 0 ? bot[i] : PANEL[1]) : bot[i];
      img.set(x0 + i, y, studL);
      img.set(x1 - i, y, studR);
    }
  }
  // Panel: one darker row/column under the studs.
  for (let x = x0 + 6; x <= x1 - 6; x++) img.set(x, y0 + 6, PANEL[2]);
  for (let y = y0 + 6; y <= y1 - 6; y++) img.set(x0 + 6, y, PANEL[2]);
  // His gold lace edge down the bar's left and right ends, in the outset: a twisted cord two
  // pixels wide with a scalloped outer edge (period 2, so the edges repeat cleanly).
  for (let y = y0 + 1; y <= y1 - 1; y++) {
    const even = (y - y0) % 2 === 0;
    img.set(0, y, even ? WIRE_OUTLINE : [0, 0, 0, 0]);
    img.set(1, y, even ? WIRE.L : WIRE.M);
    img.set(2, y, even ? WIRE.l : WIRE.H);
    img.set(S - 1, y, even ? WIRE_OUTLINE : [0, 0, 0, 0]);
    img.set(S - 2, y, even ? WIRE.l : WIRE.M);
    img.set(S - 3, y, even ? WIRE.M : WIRE.L);
  }
  // Lace mounts around the corner gems, then the gems: red on top, green below (his).
  const mount = (flipX: boolean, flipY: boolean) => {
    const rows = flipY ? [...GEM_MOUNT].reverse() : GEM_MOUNT;
    const sub = new Img(12, 4);
    wire(sub, rows, { flip: flipX, oy: flipY ? 1 : 0 });
    img.draw(sub, flipX ? S - 12 : 0, flipY ? S - 4 : 0);
  };
  mount(false, false);
  mount(true, false);
  mount(false, true);
  mount(true, true);
  studGem(img, x0 + 2, y0 + 2, 2.6, 'red');
  studGem(img, x1 - 1, y0 + 2, 2.6, 'red');
  studGem(img, x0 + 2, y1 - 1, 2.6, 'green');
  studGem(img, x1 - 1, y1 - 1, 2.6, 'green');
  return {
    name: 'bar_frame', img, group: 'action bar',
    use: 'Action bar frame: 9-slice. His thin grey-silver rails, the dotted inner line, dark panel; a gold lace cord down both ends and lace mounts around the corner gems (red on top, green below). With CSS repeat, keep (width - 48) and (height - 48) multiples of 8.',
    slice: [12, 12, 12, 12], outset: [m, m, m, m],
  };
}

// --- small round gems as loose pieces ------------------------------------------------------------------

export function gemStud(color: 'red' | 'green'): Piece {
  const img = new Img(11, 11);
  studGem(img, 5.5, 5.5, 2.6, color);
  return { name: `gem_${color}`, img, group: 'ornaments', use: `Loose ${color} gem stud in a gold bezel (corners, medallions).` };
}

// --- target bar (top centre) ---------------------------------------------------------------------------

/**
 * His spear-tip finial (left end of the target plaque; mirrored for the right), hand-placed at art
 * resolution and mostly pale silver like his: a pale lozenge tip with a small rose stone at its
 * base, a knot, and an open lyre of two pale loops (each with a dark eye) around the channel's
 * pointed end. Keys as in `wire` ('r' / 'R' the rose stone, ':' the dark between the loops).
 */
const SPEAR_TIP = [
  '................',
  '................',
  '..........HHL...',
  '.........HLLLl..',
  '........HLL:Ll..',
  '........Ll::lM..',
  '........Ll:lM...',
  '....HL..LlM.....',
  '..HHLLlLLl......',
  'HHLLrrlLLl......',
  'llllRRMllM......',
  '..lllMMlM.......',
  '....MM..lM......',
  '........lM:M....',
  '........lM::M...',
  '........lMM:MM..',
  '.........lMMMM..',
  '..........MMM...',
  '................',
  '................',
];

/** The pale silver of his target plaque's finials. */
const FINIAL: Record<string, RGBA> = {
  H: hex('#e8dfcf'), L: hex('#cec2ad'), l: hex('#a19480'), M: hex('#756856'),
  r: hex('#e7a3b1'), R: hex('#b14f68'), ':': hex('#241b11'),
};

export function targetBar(): Piece {
  // His plaque: a 14-row body (28 px: outline, a light line, a dark band, the channel's rim and
  // the 6-row channel, and the same below). Near each end the frame swells into his flared
  // collar and narrows onto the knot; the channel ends in a point (his chevron) inside the lyre
  // of the finial. The centre, between the 36-pixel caps, is one repeating column.
  const W = 200, Hh = 20, cap = 36, cy = 10, t0 = 13;
  const img = new Img(W, Hh);
  const ease = (t: number) => (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, t)))) / 2;
  // Frame half-height along the bar: 4.5 at the knot, swelling to 9.6 and settling to 7.
  const hb = (x: number): number => {
    const u = Math.min(x, W - x);
    if (u < 13) return -1;
    if (u < 20) return 4.5 + 5.1 * ease((u - 13) / 7);
    if (u < 32) return 9.6 - 2.6 * ease((u - 20) / 12);
    return 7;
  };
  const fO = (x: number, y: number): number => {
    const e = 0.5, sl = (hb(x + e) - hb(x - e)) / (2 * e);
    return (Math.abs(y - cy) - hb(x)) / Math.sqrt(1 + sl * sl);
  };
  // The channel: 8 rows (rim and 6-row well) with pointed ends (tip at t0 from each end).
  const fC = (x: number, y: number): number => {
    const u = Math.min(x, W - x), v = Math.abs(y - cy);
    return Math.max(v - 4, (v - (u - t0)) / Math.SQRT2);
  };
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < W; x++) {
      const px = x + 0.5, py = y + 0.5, d = -fO(px, py);
      const top = py < cy;
      const e = -fC(px, py);
      if (hb(px) < 0 || d < 0) {
        // Past the frame, only the channel's pointed end (inside the finial's lyre).
        if (e >= -0.8) img.set(x, y, e < 0.2 ? METAL[0] : e < 1 ? (top ? RAIL[5] : RAIL[3]) : PANEL[2]);
        continue;
      }
      let c: RGBA = d < 1 ? METAL[0] : d < 2 ? (top ? METAL[6] : METAL[3]) : d < 2.6 && !top ? METAL[2] : PANEL[0];
      if (e >= 0) c = e < 1 ? (top ? RAIL[5] : RAIL[3]) : PANEL[2];
      else if (e > -1 && d >= 2) c = PANEL[1];
      img.set(x, y, c);
    }
  // His inner curl line inside each flare (light, 1 pixel), mirrored top/bottom and left/right.
  const curl: Pt[] = [[15, 6], [16, 5], [17, 4], [18, 4], [19, 3], [20, 3], [21, 3], [22, 3], [23, 3], [24, 4], [25, 4], [26, 3], [26, 2]];
  for (const [x, y] of curl)
    for (const [fx, fy] of [[x, y], [W - 1 - x, y], [x, Hh - 1 - y], [W - 1 - x, Hh - 1 - y]]) img.set(fx, fy, fy < cy ? METAL[5] : METAL[4]);
  for (const flip of [false, true]) wire(img, SPEAR_TIP, { ox: flip ? W - SPEAR_TIP[0].length : 0, flip, pal: FINIAL });
  return {
    name: 'target_bar', img, group: 'target bar',
    use: 'Chained plaque for the targeted or hovered enemy (or the boss): 3-slice; each 72-px cap holds his pale spear tip (lozenge, rose stone, lyre of two loops), the flared collar and the channel\'s pointed end; the centre is one repeating column (any width works). The red fill goes in the window, with its own pointed ends.',
    slice: [0, cap, 0, cap],
    window: { x: t0 + 2, y: 7, w: W - 2 * (t0 + 2), h: 6, shape: 'rect' },
  };
}

/** A fill strip with rounded ends (3-slice), shaded top-light. */
export function fillBar(name: string, ramp: RGBA[], h: number, use: string, group: string): Piece {
  const W = 16;
  const img = new Img(W, h);
  // Row insets of the rounded ends (his capsule bars).
  const inset: number[] = Array(h).fill(0);
  const ends = h >= 6 ? [2, 1] : [1];
  ends.forEach((v, i) => {
    inset[i] = v;
    inset[h - 1 - i] = v;
  });
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    const k = h <= 4 ? [4, 3, 2, 1][Math.min(3, y)] : t < 0.2 ? 5 : t < 0.45 ? 4 : t < 0.75 ? 3 : t < 0.95 ? 2 : 1;
    for (let x = inset[y]; x < W - inset[y]; x++) img.set(x, y, ramp[k]);
    // A darker last pixel on the right end of each row.
    if (W - 1 - inset[y] > inset[y]) img.set(W - 1 - inset[y], y, ramp[Math.max(1, k - 1)]);
  }
  const s = h >= 6 ? 3 : 2;
  return { name, img, group, use, slice: [0, s, 0, s] };
}

// --- chains -------------------------------------------------------------------------------------------

/** Chain links stamped along a path: face-on rings and edge-on bars in turn (his dim bronze links). */
export function chainAlong(img: Img, pts: Pt[], pitch = 4.2): void {
  // Resample by arc length.
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = L[L.length - 1];
  const at = (s: number): { p: Pt; d: Pt } => {
    let i = 1;
    while (i < L.length - 1 && L[i] < s) i++;
    const t = (s - L[i - 1]) / (L[i] - L[i - 1] || 1);
    const p: Pt = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
    const dl = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) || 1;
    return { p, d: [(pts[i][0] - pts[i - 1][0]) / dl, (pts[i][1] - pts[i - 1][1]) / dl] };
  };
  const mk = new Mask(img.w, img.h);
  const holes = new Mask(img.w, img.h);
  let k = 0;
  for (let s = 0; s <= total; s += pitch, k++) {
    const { p, d } = at(s);
    if (k % 2 === 0) {
      // Face-on link: an oval ring 5 long, 3.4 wide, with a 1-pixel hole.
      for (let y = Math.floor(p[1] - 4); y <= p[1] + 4; y++)
        for (let x = Math.floor(p[0] - 4); x <= p[0] + 4; x++) {
          const rx = x + 0.5 - p[0], ry = y + 0.5 - p[1];
          const u = rx * d[0] + ry * d[1], v = -rx * d[1] + ry * d[0];
          const q = (u / 3.1) ** 2 + (v / 2.1) ** 2;
          if (q <= 1) mk.set(x, y);
          if ((u / 1.7) ** 2 + (v / 0.75) ** 2 <= 1) holes.set(x, y);
        }
    } else {
      // Edge-on link: a short bar.
      mk.stroke([[p[0] - d[0] * 2.6, p[1] - d[1] * 2.6], [p[0] + d[0] * 2.6, p[1] + d[1] * 2.6]], 1.6);
    }
  }
  mk.minus(holes);
  // His chains are a dim bronze that recedes behind the plaque and the turn row.
  emboss(img, mk, METAL, { base: 4, outlineColor: METAL[1] });
}

function chainPiece(name: string, w: number, h: number, pts: Pt[], use: string): Piece {
  const img = new Img(w, h);
  chainAlong(img, pts);
  return { name, img, group: 'turn row', use };
}

// --- round medallion (RONDA) ---------------------------------------------------------------------------

/** A small gem set into a rim: a thin bezel ring flush with the metal around it. */
function setGem(img: Img, cx: number, cy: number, r: number, color: keyof typeof GEM, metal: RGBA[] = METAL): void {
  const f = sdCircle(cx, cy, r + 1.1);
  band(img, f, { from: 0, width: 1.1, ramp: metal, lo: 2, hi: 6 });
  gem(img, cx, cy, r, GEM[color], false);
}

/** An oval cabochon in a small gold bezel with a point toward the outside (his rim gems). */
function bezelGem(img: Img, cx: number, cy: number, rx: number, ry: number, color: keyof typeof GEM, out: Pt): void {
  const f = (x: number, y: number) => Math.hypot((x - cx) / (rx + 1.3), (y - cy) / (ry + 1.3)) - 1;
  const mk = new Mask(img.w, img.h);
  mk.sdf(f);
  // The bezel's point, out along the radius.
  mk.set(Math.floor(cx + out[0] * (Math.max(rx, ry) + 1.8)), Math.floor(cy + out[1] * (Math.max(rx, ry) + 1.8)));
  emboss(img, mk, METAL, { base: 5 });
  gemOval(img, cx, cy, rx, ry, GEM[color]);
}

export function roundMedallion(): Piece {
  // His rim is round but drawn slightly toward the four gems (a softened diamond), beaded, with
  // oval cabochons set in small pointed bezels at the tips.
  const W = 40, Hh = 40, cx = 20, cy = 20;
  const img = new Img(W, Hh);
  const f = sdLp(cx, cy, 17.2, 17.2, 1.95);
  // Dark brown face, a touch lighter at the centre.
  fillShape(img, f, 0, (_x, _y, d) => BROWN[d > 8 ? 3 : d > 4 ? 2 : 1]);
  // Beaded rim.
  band(img, f, { from: 0, width: 3.2, ramp: METAL, lo: 3, hi: 7, beads: { period: 2.6, cx, cy, r: 16, depth: 0.9 } });
  isoLine(img, f, -1, METAL[0]);
  isoLine(img, f, 3, METAL[1]);
  // Gems at the four tips: red top and left, green right and bottom (his), long along the radius.
  bezelGem(img, cx, 3.2, 1.6, 2.3, 'red', [0, -1]);
  bezelGem(img, 3.2, cy, 2.3, 1.6, 'red', [-1, 0]);
  bezelGem(img, W - 3.2, cy, 2.3, 1.6, 'green', [1, 0]);
  bezelGem(img, cx, Hh - 3.2, 1.6, 2.3, 'green', [0, 1]);
  return {
    name: 'round_medallion', img, group: 'turn row',
    use: 'Round counter medallion ("RONDA" over the number, no box behind the word); his softly pointed beaded rim with four oval gems in small bezels. The chains hang from its left gem.',
    window: { x: 10, y: 10, w: 20, h: 20, shape: 'rect' },
  };
}

// --- turn row frames -----------------------------------------------------------------------------------

export function initActive(): Piece {
  const S = 22;
  const img = new Img(S, S);
  const f = sdRoundRect(0, 0, S, S, 5);
  band(img, f, { from: 0, width: 2.6, ramp: GOLD, lo: 2, hi: 7, flat: 0.2 });
  isoLine(img, f, 0, GOLD[0]);
  isoLine(img, f, 2.6, GOLD[1]);
  return {
    name: 'init_active', img, group: 'turn row',
    use: 'Turn row: the acting unit, a gold square frame (portrait in the window).',
    window: { x: 3, y: 3, w: 16, h: 16, shape: 'rect' },
  };
}

function initBell(name: string, ramp: RGBA[], use: string): Piece {
  const W = 18, Hh = 21;
  const img = new Img(W, Hh);
  const cx = 9, cy = 8.5, r = 8.5;
  const f = sdCircle(cx, cy, r);
  // Foot: a short flared plinth with the team color.
  for (let y = 15; y <= 20; y++) {
    const inset = y <= 16 ? 4 : y === 17 ? 3 : 2;
    for (let x = inset; x < W - inset; x++) img.set(x, y, y === 15 || y === 20 ? ramp[0] : y === 16 ? ramp[1] : y === 17 ? ramp[4] : y === 18 ? ramp[3] : ramp[2]);
    img.set(inset - 1, y, ramp[0]);
    img.set(W - inset, y, ramp[0]);
  }
  band(img, f, { from: 0, width: 1.7, ramp, lo: 2, hi: 4 });
  isoLine(img, f, -1, ramp[0]);
  isoLine(img, f, 1.7, ramp[0]);
  return { name, img, group: 'turn row', use, window: { x: 2, y: 2, w: 14, h: 14, shape: 'circle' } };
}
export const initAlly = () => initBell('init_ally', ALLY, 'Turn row: an ally (round window, his muted steel-blue rim and base).');
export const initEnemy = () => initBell('init_enemy', FOE, 'Turn row: an enemy (round window, his muted rose rim and base).');

export function initEnd(): Piece {
  // His end circle: a little larger than a portrait ring, dark with a fine checker hatch, a thin
  // antique-gold rim (the chains hook on).
  const S = 20, c = 10;
  const img = new Img(S, S);
  const f = sdCircle(c, c, 9.2);
  fillShape(img, f, 0, (x, y, d) => (d > 1.5 && (x + y) % 2 === 0 ? PANEL[3] : PANEL[1]));
  band(img, f, { from: 0, width: 1.6, ramp: METAL, lo: 2, hi: 5 });
  isoLine(img, f, -1, METAL[0]);
  isoLine(img, f, 1.6, PANEL[0]);
  return { name: 'init_end', img, group: 'turn row', use: 'Turn row: the dark hatched circle that closes the round (a little larger than a portrait ring).', window: { x: 2, y: 2, w: 16, h: 16, shape: 'circle' } };
}

// --- minimap ring --------------------------------------------------------------------------------------------

/** His pearly near-white minimap band, dark to light. */
const PEARL = ['#3e3a33', '#77736a', '#a9a59a', '#cfcbc0', '#e6e2d8', '#f6f3ec'].map((h) => hex(h));

export function minimapRing(): Piece {
  // Measured on his frame (in art pixels about the centre): the map window r 38; a thin gold line;
  // his pearly near-white band, 5 pixels (10 on screen) to r 44; a thin gold line on its outer
  // edge; then a fine, regular gold lace to r 50 (a row of small rings on the gold line with a bead
  // between each pair). The cardinal gems sit on the band's outer edge in pointed lozenge bezels
  // with side prongs; the diagonal gems sit in the lace in gold lozenge bezels.
  const S = 100, c = 50, RW = 38;
  const img = new Img(S, S);
  // --- the lace: one motif every ~6 pixels round the circle at r 47 ------------------------------
  const RL = 47, N = Math.round((2 * Math.PI * RL) / 6), P = (2 * Math.PI * RL) / N;
  const lace = new Mask(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - c, dy = y + 0.5 - c, r = Math.hypot(dx, dy);
      if (r < 44 || r > 50.2) continue;
      const th = (Math.atan2(dy, dx) + 2.5 * Math.PI) % (2 * Math.PI);
      const sArc = ((th * RL) % P + P) % P, v = r - 44.9; // position in the motif, height above the gold line
      const ring = Math.abs(Math.hypot(sArc - P / 2, v - 2.4) - 1.55) < 0.55;
      const bead = Math.min(Math.hypot(sArc, v - 3.9), Math.hypot(sArc - P, v - 3.9)) < 0.95;
      const stem = Math.min(Math.abs(sArc), Math.abs(sArc - P)) < 0.5 && v > 0 && v < 3.2;
      if (ring || bead || stem) lace.set(x, y);
    }
  emboss(img, lace, METAL, { base: 5, outlineColor: METAL[1] });
  // --- the pearly band, with a thin gold line on each edge ------------------------------------------
  const fB = sdCircle(c, c, 44);
  band(img, fB, { from: 0, width: 5, ramp: PEARL, lo: 2, hi: 5, flat: 0.45 });
  isoLine(img, sdCircle(c, c, 45), 0, METAL[1], 0.6);
  isoLine(img, sdCircle(c, c, 45), 0.6, METAL[5], 0.9);
  isoLine(img, sdCircle(c, c, 39.1), 0, METAL[4], 0.9);
  isoLine(img, sdCircle(c, c, 38.2), 0, METAL[1], 0.7);
  // His small dark marks on the band, every 30 degrees between the gems.
  for (let k = 0; k < 12; k++) {
    if (k % 3 === 0) continue;
    const a = (k * Math.PI) / 6;
    img.set(Math.floor(c + Math.cos(a) * 41.5), Math.floor(c + Math.sin(a) * 41.5), PEARL[1]);
  }
  // --- gems ------------------------------------------------------------------------------------------
  const lozenge = (gx: number, gy: number, ux: number, uy: number, along: number, across: number, prongs: boolean) => {
    const tx = -uy, ty = ux;
    const bz = new Mask(S, S);
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const dx = x + 0.5 - gx, dy = y + 0.5 - gy;
        const al = dx * ux + dy * uy, ac = dx * tx + dy * ty;
        if (Math.abs(al) / along + Math.abs(ac) / across <= 1) bz.set(x, y);
        if (prongs && Math.abs(ac) >= across - 1.2 && Math.abs(ac) <= across + 2 && Math.abs(al + 0.3) <= 1.2 - (Math.abs(ac) - across + 1.2) * 0.3) bz.set(x, y);
      }
    emboss(img, bz, METAL, { base: 5, outlineColor: METAL[1] });
  };
  const diagonal: [number, keyof typeof GEM][] = [[-135, 'green'], [-45, 'green'], [45, 'green'], [135, 'red']];
  for (const [deg, col] of diagonal) {
    const a = (deg * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a);
    const gx = Math.floor(c + ux * 47.6) + 0.5, gy = Math.floor(c + uy * 47.6) + 0.5;
    // A gold lozenge set into the lace, its points along the rim (his diagonal bezels).
    lozenge(gx, gy, -uy, ux, 5.2, 4.2, false);
    gem(img, gx, gy, 2.5, GEM[col], false);
  }
  const cardinal: [number, keyof typeof GEM][] = [[-90, 'green'], [0, 'green'], [90, 'red'], [180, 'green']];
  for (const [deg, col] of cardinal) {
    const a = (deg * Math.PI) / 180;
    const ux = Math.cos(a), uy = Math.sin(a);
    const gx = Math.floor(c + ux * 44.6) + 0.5, gy = Math.floor(c + uy * 44.6) + 0.5;
    // Lozenge bezel, long along the radius (pointed out and in), with a prong on each side.
    lozenge(gx, gy, ux, uy, 5.4, 4.6, true);
    gem(img, gx, gy, 2.5, GEM[col], true);
  }
  return {
    name: 'minimap_ring', img, group: 'minimap',
    use: 'Round minimap frame: his pearly near-white band with a thin gold line on each edge, a fine regular gold lace outside it; cardinal gems in pointed lozenge bezels, diagonal gems in gold lozenges set into the lace (green, red at the lower left, as he painted them). The map shows through the round window.',
    window: { x: c - RW, y: c - RW, w: 2 * RW, h: 2 * RW, shape: 'circle' },
  };
}

// --- action bar contents ------------------------------------------------------------------------------------

/** His warm slot gold (skill slot frames), outline to highlight. */
const SLOT_GOLD = ['#17110a', '#3a2c18', '#5e4a2c', '#86703f', '#a88f5c', '#c8ad78', '#e2cb98', '#f4e6c2'].map((h) => hex(h));

export function skillSlot(active = false): Piece {
  const R = active ? GOLD : SLOT_GOLD;
  const S = 28;
  const img = new Img(S, S);
  // His frame: a dark outline and a two-step gold bevel (lit on the top and left, shaded on the
  // bottom and right), corners rounded; the window inside is open, so the icon shows under the
  // frame and its small corner curls (a dark backing goes under the icon).
  const f = sdRoundRect(0, 0, S, S, 3.5);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const d = -f(x + 0.5, y + 0.5);
      if (d < 0 || d >= 3) continue;
      const lit = x + y < S - 1;
      img.set(x, y, d < 1 ? R[0] : d < 2 ? (lit ? R[6] : R[4]) : lit ? R[4] : R[2]);
    }
  // His small curls in the four inner corners (lit up-left, shaded down-right).
  const curl = ['LL.', 'L.M', '.M.'];
  const lit: Record<string, RGBA> = { L: R[6], M: R[3] };
  const shade: Record<string, RGBA> = { L: R[4], M: R[2] };
  stamp(img, 3, 3, curl, lit);
  stamp(img, S - 6, 3, curl, lit, true);
  stamp(img, 3, S - 6, [...curl].reverse(), shade);
  stamp(img, S - 6, S - 6, [...curl].reverse(), shade, true);
  return {
    name: active ? 'skill_slot_active' : 'skill_slot', img, group: 'action bar',
    use: active
      ? 'Skill slot, selected or hovered: the same frame in bright gold.'
      : 'Skill slot frame: his warm gold, a two-step bevel lit at the top left, rounded corners and small corner curls. The window is open: put a dark backing (panel #16120c) and the skill icon (painted later) under the frame.',
    slice: [8, 8, 8, 8],
    window: { x: 3, y: 3, w: 22, h: 22, shape: 'rect' },
  };
}

export function skillTag(): Piece {
  // His number tag: a free-standing hexagonal shield (chamfered top corners, pointed bottom),
  // silver rim, dark fill, the cream digit inside. It overlaps the slot top by 3 art pixels.
  const W = 11, Hh = 12;
  const half = [3, 4, 5, 5, 5, 5, 5, 5, 4, 3, 2, 1];
  const img = new Img(W, Hh);
  const inside = (x: number, y: number) => y >= 0 && y < Hh && Math.abs(x - 5) <= half[y];
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      const rim = !edge && (!inside(x - 2, y) || !inside(x + 2, y) || !inside(x, y - 2) || !inside(x, y + 2) || !inside(x - 1, y - 1) || !inside(x + 1, y - 1) || !inside(x - 1, y + 1) || !inside(x + 1, y + 1));
      // His rim: a light top edge, mid grey-silver sides, darker on the right and the point.
      const k = y <= 2 ? (x <= 5 ? 6 : 5) : x < 5 && y < 8 ? 5 : x < 5 ? 4 : 3;
      img.set(x, y, edge ? SILVER[0] : rim ? SILVER[k] : PANEL[2]);
    }
  return { name: 'skill_tag', img, group: 'action bar', use: 'Number tag over a skill slot: his hexagonal shield (the slot number, cream, in the label font).', window: { x: 2, y: 2, w: 7, h: 7, shape: 'rect' } };
}

export function itemSlot(): Piece {
  const S = 26;
  const img = new Img(S, S);
  const f = sdRoundRect(0, 0, S, S, 4.5);
  const g = sdRoundRect(3, 3, S - 3, S - 3, 3);
  fillShape(img, f, 0, PANEL[2]);
  isoLine(img, f, 0, PANEL[0]);
  isoLine(img, f, 1, PANEL[4]);
  isoLine(img, g, 0, PANEL[4]);
  isoLine(img, g, 1, PANEL[0]);
  fillShape(img, g, 2, PANEL[1]);
  return {
    name: 'item_slot', img, group: 'action bar',
    use: 'Item slot, greyed (his): double faint outline with rounded corners, dark well; the icon and label are drawn dim.',
    slice: [5, 5, 5, 5],
    window: { x: 3, y: 3, w: 20, h: 20, shape: 'rect' },
  };
}

export function itemBadge(): Piece {
  const img = new Img(9, 9);
  gem(img, 4.5, 4.5, 3.6, BADGE, true);
  return { name: 'item_badge', img, group: 'action bar', use: 'His small dim blue count dot on an item slot (the count in the label font, dim blue-white #b4c4d2).' };
}

export function pip(name: string, color: keyof typeof GEM | 'spent', use: string): Piece {
  // His smooth glossy orbs (about 22 px across), soft darker rim, one highlight.
  const img = new Img(11, 11);
  orb(img, 5.5, 5.5, 5.4, color === 'spent' ? [PANEL[0], PANEL[1], PANEL[2], PANEL[3], PANEL[4], PANEL[5]] : GEM[color]);
  return { name, img, group: 'action bar', use };
}

export function moveTrough(): Piece {
  // His movement bar: a capsule trough with rounded ends, a dark well and a thin lit rim.
  const W = 24, Hh = 6;
  const img = new Img(W, Hh);
  stamp(img, 0, 0, [
    '..' + 'o'.repeat(W - 4) + '..',
    '.o4' + '4'.repeat(W - 6) + '3o.',
    'o3' + '0'.repeat(W - 4) + '2o',
    'o3' + '0'.repeat(W - 4) + '2o',
    '.o2' + '1'.repeat(W - 6) + '2o.',
    '..' + 'o'.repeat(W - 4) + '..',
  ], { o: METAL[0], '0': PANEL[0], '1': PANEL[1], '2': METAL[3], '3': METAL[4], '4': METAL[5] });
  return { name: 'move_trough', img, group: 'action bar', use: 'Movement bar trough, his capsule (3-slice); the teal fill goes inside (2 pixels in from each end, 1 from top and bottom).', slice: [0, 3, 0, 3], window: { x: 2, y: 1, w: W - 4, h: 4, shape: 'rect' } };
}

export function chakraGem(color: 'red' | 'orange' | 'blue' | 'empty'): Piece {
  const img = new Img(9, 11);
  rhombGem(img, 0, 0, color === 'empty' ? [PANEL[0], PANEL[1], PANEL[2], PANEL[3], PANEL[4], PANEL[4]] : GEM[color]);
  return { name: `chakra_${color}`, img, group: 'crest', use: color === 'empty' ? 'Spent chakra gem (dark socket), on the chakra line.' : `Chakra gem (${color}): his compact rhombus gem, threaded on the chakra line (centre the gem on the line).` };
}

export function chakraLine(): Piece {
  // The thin line his chakra gems sit on, with a small bead at each end (3-slice).
  const W = 8, Hh = 3;
  const img = new Img(W, Hh);
  for (let x = 0; x < W; x++) {
    img.set(x, 0, PANEL[0]);
    img.set(x, 1, RAIL[3]);
    img.set(x, 2, PANEL[0]);
  }
  for (const x of [0, W - 1]) {
    img.set(x, 0, RAIL[3]);
    img.set(x, 1, RAIL[5]);
    img.set(x, 2, RAIL[2]);
  }
  return { name: 'chakra_line', img, group: 'crest', use: 'The thin line through the chakra trough that the gems sit on (3-slice), centred on the gems.', slice: [0, 2, 0, 2] };
}

// --- crest: the HP and chakra troughs and their scroll shoulders --------------------------------------------

/**
 * His crest shoulder (left end; mirrored for the right) as open wirework, hand-placed at art
 * resolution from his picture (1 art pixel = 1.28 of his): the rail foot along the bar, curling up
 * at the outer end, a small curl on the rail, the long arm sweeping up to the stem of a tall wave
 * curl at the trough end (over the top and in to an eye), a curl between the stem and the trough,
 * his pale hollow bead under the arm, and a tail out to a knob over the trough. Keys as in `wire`.
 */
const CREST_SHOULDER = [
  '.................................HHHHL..........',
  '................................HMMMMML......L..',
  '...............................HMM...lll.LLLL.l.',
  '..............................HMM.HHL.lll....M..',
  '..............................HM.HH.Ll.ll.......',
  '..............................HM.....M.LM.......',
  '..............................Ll....MM.LM.......',
  '..............................Ll..lMM.LLM.......',
  '...............................Ll....LLM........',
  '...............................Ll..LLLM.........',
  '.....................HHHLLL....Ll..MMM..........',
  '...................HHllllllLL.Ll.LL.............',
  '.................HHll........Hl.L...............',
  '................Hll...oo...llHl.L.M.............',
  '...............Ll....occo.M...Ll.M..............',
  '......LLL.....LM.....oCCo.M.M..lM...............',
  '.LL..L...l...LM.......oo...M....lM.L............',
  'L..l.L.M.M..LM.............ll...lML.............',
  'L..M..l..M.LM..LL............M.lM..M............',
  '.MM....MM.LM..L..lM.........M.lM................',
  '..........M....MM..M..........lM................',
  '.MlMlMlMlMlMlMlMlMlMlMlMlMlMlMlMlMlMlMl.........',
];

export function crestStrip(): Piece {
  // 22 rows: the shoulders rise 6 above the trough; the trough (rows 6..21) sits on the bar's top rail.
  const W = 104, Hh = 22, cap = 48, tTop = 6, tL = 38;
  const img = new Img(W, Hh);
  // The shoulders first; the trough lies over their inner ends.
  for (const flip of [false, true]) wire(img, CREST_SHOULDER, { ox: flip ? W - cap : 0, flip });
  // The trough: his capsule, fully rounded at both ends (radius 8), with a dark outline, a two-step
  // silver rail (lit above, shaded below), a dark line, the dotted inner line, and the dark well.
  const f = sdRoundRect(tL, tTop, W - tL, Hh, 8);
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < W; x++) {
      const d = -f(x + 0.5, y + 0.5);
      if (d < -1) continue;
      const top = y + 0.5 < (tTop + Hh) / 2;
      let c: RGBA;
      if (d < 0) c = METAL[0];
      else if (d < 1) c = top ? RAIL[6] : RAIL[3];
      else if (d < 2) c = top ? RAIL[4] : RAIL[2];
      else if (d < 3) c = PANEL[0];
      else if (d < 4) c = x % 2 === 0 ? (top ? RAIL[4] : RAIL[3]) : PANEL[0];
      else c = d < 5 ? PANEL[1] : PANEL[2];
      img.set(x, y, c);
    }
  return {
    name: 'crest_strip', img, group: 'crest',
    use: 'Raised crest over the action bar (3-slice; the centre repeats every 2 art pixels): one long trough (his capsule with rounded ends, double rail and dotted line), HP on the left half, chakra on the right; his dense scroll shoulders at both ends. The acting character medallion covers the middle. Its bottom row sits on the bar\'s top rail.',
    slice: [0, cap, 0, cap],
    window: { x: tL + 4, y: tTop + 5, w: W - 2 * (tL + 4), h: 6, shape: 'rect' },
  };
}

// --- acting character medallion -----------------------------------------------------------------------------

export function medallionActive(): Piece {
  const W = 72, Hh = 52, cx = 36, cy = 27;
  const img = new Img(W, Hh);
  // His crown: a filled dark arch over the ring (r 21 to 26.5, from the big bosses over the top),
  // with a thin metal wire on its outer edge, small curls and knobs set in it, then the bosses.
  const back = new Mask(W, Hh), mk = new Mask(W, Hh);
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
      const inArc = ang < -0.12 && ang > -Math.PI + 0.12;
      if (inArc && r >= 20.5 && r <= 26.6) back.set(x, y);
      if (inArc && r > 25.4 && r <= 26.6) mk.set(x, y);
    }
  for (const sgn of [-1, 1]) {
    // Curls along the arch, each opening toward the top gem.
    for (const deg of [120, 152]) {
      const a = -(deg * Math.PI) / 180, px = cx + sgn * Math.cos(a) * 23.6 * -1, py = cy + Math.sin(a) * 23.6;
      mk.taper(spiral(px, py, 1.9, 0.5, sgn > 0 ? Math.PI * 0.2 : Math.PI * 0.8, sgn > 0 ? Math.PI * 2 : -Math.PI, 18), 1.2, 1);
    }
  }
  // The arch reaches the big bosses at its two ends.
  for (const sgn of [-1, 1]) {
    back.disc(cx + sgn * 28.4, cy - 5, 6.3);
    back.disc(cx + sgn * 24.4, cy - 7.4, 3.4);
  }
  filledLace(img, mk, back, METAL, { base: 5, grow: 0, backColor: METAL[1], crevice: METAL[0] });
  // Knobs on the arch's wire, then the bosses: two small ones on the arch, two big dark ones at
  // shoulder level (his "eyes").
  for (const sgn of [-1, 1])
    for (const deg of [104]) {
      const a = (deg * Math.PI) / 180;
      const kx = cx + sgn * Math.cos(Math.PI - a) * 26.2, ky = cy - Math.sin(a) * 26.2;
      const fk = sdCircle(kx, ky, 1.5);
      band(img, fk, { from: 0, width: 1.5, ramp: METAL, lo: 3, hi: 7 });
      isoLine(img, fk, -1, METAL[0]);
    }
  for (const sgn of [-1, 1]) {
    const sx = cx + sgn * 20.6, sy = cy - 15.6;
    const fs = sdCircle(sx, sy, 3.2);
    fillShape(img, fs, 0, PANEL[2]);
    band(img, fs, { from: 0, width: 1.4, ramp: METAL, lo: 2, hi: 7 });
    isoLine(img, fs, -1, METAL[0]);
    img.set(Math.floor(sx), Math.floor(sy), METAL[5]);
    // His big bosses: a metal dome with two dark oval holes side by side.
    const bx = cx + sgn * 28.4, by = cy - 5;
    const fb = sdCircle(bx, by, 5.2);
    band(img, fb, { from: 0, width: 5.2, ramp: METAL, lo: 2, hi: 6 });
    isoLine(img, fb, -1, METAL[0]);
    isoLine(img, fb, 1.2, METAL[2], 0.6);
    for (const ex of [-1.9, 1.9]) fillShape(img, (x, y) => Math.hypot((x - (bx + ex)) / 0.85, (y - by - 0.2) / 1.55) - 1, 0, PANEL[0]);
  }
  // Outer beaded ring, then the gold rim.
  const fo = sdCircle(cx, cy, 21.8);
  band(img, fo, { from: 0, width: 2, ramp: METAL, lo: 2, hi: 7, beads: { period: 2.5, cx, cy, r: 21, depth: 0.9 } });
  isoLine(img, fo, -1, METAL[0]);
  const fr = sdCircle(cx, cy, 19.8);
  band(img, fr, { from: 0, width: 3.3, ramp: GOLD, lo: 2, hi: 7, flat: 0.1 });
  isoLine(img, fr, 0, GOLD[0], 0.7);
  isoLine(img, fr, 3.3, GOLD[0]);
  // Gems: red on top, a small pale green one on the bottom rim (it sits on the bar's rail).
  studGem(img, cx, 4.4, 2.6, 'red');
  studGem(img, cx, cy + 20.6, 1.9, 'pearl');
  return {
    name: 'medallion_active', img, group: 'crest',
    use: 'Acting character medallion: the portrait shows through the round window. A calm crown of a few curls, bosses with two dark oval holes, a red gem on top and his pale pearl at the bottom, which rests on the bar\'s top rail. Sits on the middle of the crest strip.',
    window: { x: cx - 16.5, y: cy - 16.5, w: 33, h: 33, shape: 'circle' },
  };
}

// --- plaque under the bar ------------------------------------------------------------------------------------

/**
 * His lower bracket (left end of the plaque under the bar; mirrored for the right) as open
 * wirework, hand-placed at art resolution: a wire along the bar's underside, a curled tip at the
 * outer end, the long two-row arm sweeping down to the plaque's bottom corner, his "eye" (a pale
 * ring with two dark dots), the X binding of two crossing curves by the plaque's end, and small
 * curls on the bar wire and under the arm. Keys as in `wire`; the background shows between them.
 */
const LOWER_BRACKET = [
  '.LL..L....LLL.....LL...........Ll.......',
  'L..lL.l.LL...LL.....L........Ll.........',
  'L.M....L...ooo.L....ML......LM..........',
  '.l.H......occco.LL...ML....LM...........',
  '...MH....ocKcKco.l....ML..LM............',
  '....MH...oCCCCCo.M.....MLLM.............',
  '.....MH...oCCCo.........LLM.............',
  '......MH...ooo..........LLM.............',
  '.......MH..............L..L.............',
  '.......lMHH...........LM..ML............',
  '......M.MMMHH........LM....ML..l........',
  '.......M...MMHL.....LM......ML..........',
  '.............MMLLL..M........l..........',
  '..............lMllLLLLLL................',
  '.............M.M..llllllLLLLLLLLLLL.....',
  '..............M.........lllllllllll.....',
];

export function lowerPlaque(): Piece {
  const W = 96, Hh = 16, cap = 44, end = 33;
  const img = new Img(W, Hh);
  // The plaque: dark, its top on the bar's bottom rail, his silver rail along the bottom, and
  // rounded (capsule) lower corners; the brackets overlap its ends.
  const f = sdRoundRect(end, -10, W - end, Hh - 1, 5);
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < W; x++) {
      const d = -f(x + 0.5, y + 0.5);
      if (d < -1) continue;
      const rail = y >= Hh - 4;
      img.set(x, y, d < 0 ? METAL[0] : rail && d < 1 ? RAIL[5] : rail && d < 2 ? RAIL[3] : d < 2 && rail ? PANEL[0] : d < 2.5 ? PANEL[0] : mixc(PANEL[3], BROWN[1], 0.4));
    }
  for (const flip of [false, true]) wire(img, LOWER_BRACKET, { ox: flip ? W - LOWER_BRACKET[0].length : 0, flip, pal: { ...WIRE, K: hex('#14100a') } });
  return {
    name: 'lower_plaque', img, group: 'action bar',
    use: 'Dark plaque under the action bar (3-slice): his openwork corner brackets (curled tip, long arm, an eye of two dark dots in a pale ring, an X binding; the background shows through) and rounded capsule ends with a silver rail; for the hint line or the combat log.',
    slice: [0, cap, 0, cap],
    window: { x: end + 3, y: 1, w: W - 2 * (end + 3), h: Hh - 5, shape: 'rect' },
  };
}

// --- party frames ----------------------------------------------------------------------------------------------

export function partyFrame(): Piece {
  const W = 30, Hh = 40;
  const img = new Img(W, Hh);
  // His thin olive-gold double line: a gold outer line (lit top and left), a dark line, and a
  // finer, dimmer gold inner line around the portrait.
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < W; x++) {
      const r = Math.min(x, y, W - 1 - x, Hh - 1 - y);
      const lit = x + y < Math.min(W, Hh) - 1 || (x < W / 2 && y < Hh - 1 - x) || (y < Hh / 2 && x < W - 1 - y);
      if (r === 0) img.set(x, y, lit && (x === 0 || y === 0) ? OLIVE[5] : OLIVE[4]);
      else if (r === 1) img.set(x, y, OLIVE[0]);
      else if (r === 2) img.set(x, y, lit && (x === 2 || y === 2) ? OLIVE[4] : OLIVE[3]);
    }
  // Soften the outer corners (one pixel).
  for (const [x, y] of [[0, 0], [W - 1, 0], [0, Hh - 1], [W - 1, Hh - 1]]) img.set(x, y, [0, 0, 0, 0]);
  // His gold corner flourishes, on the frame: a bead joining the two lines across the corner and
  // a small leaf running along each side in the dark line.
  const flourish = (fx: boolean, fy: boolean, lit: boolean) => {
    const X = (x: number) => (fx ? W - 1 - x : x), Y = (y: number) => (fy ? Hh - 1 - y : y);
    const hi = lit ? OLIVE[6] : OLIVE[5], mid = lit ? OLIVE[5] : OLIVE[4];
    img.set(X(1), Y(1), hi);
    img.set(X(1), Y(3), mid);
    img.set(X(1), Y(4), OLIVE[3]);
    img.set(X(3), Y(1), mid);
    img.set(X(4), Y(1), OLIVE[3]);
  };
  flourish(false, false, true);
  flourish(true, false, true);
  flourish(false, true, false);
  flourish(true, true, false);
  // The bar wells under the portrait: red (HP) then green.
  img.rect(3, 28, W - 6, 1, OLIVE[2]);
  img.rect(3, 29, W - 6, 4, PANEL[0]);
  img.rect(3, 33, W - 6, 1, PANEL[1]);
  img.rect(3, 34, W - 6, 3, PANEL[0]);
  return {
    name: 'party_frame', img, group: 'party',
    use: 'Party portrait frame (9-slice): his thin olive-gold double line with small gold flourishes on the corners; portrait window on top, two bar wells below (red HP at 3,29 4 high, green at 3,34 3 high, in art pixels).',
    slice: [8, 8, 14, 8],
    window: { x: 3, y: 3, w: W - 6, h: 25, shape: 'rect' },
  };
}

// --- buttons ---------------------------------------------------------------------------------------------------

/** His small square button: a thin grey-gold rim lit on the top and left, on a dark square. */
function squareButton(img: Img, x0: number, y0: number, S: number): void {
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const r = Math.min(x, y, S - 1 - x, S - 1 - y);
      const corner = (x === 0 || x === S - 1) && (y === 0 || y === S - 1);
      if (corner) continue;
      let c: RGBA;
      if (r === 0) c = PANEL[0];
      else if (r === 1) c = x === 1 || y === 1 ? (x === S - 2 || y === S - 2 ? KHAKI[4] : KHAKI[6]) : KHAKI[3];
      else if (r === 2) c = PANEL[0];
      else c = PANEL[2];
      img.set(x0 + x, y0 + y, c);
    }
}

export function menuButton(): Piece {
  // His small-button style at menu size: the same thin rim on a dark square, with a red gem set
  // into the middle of the top rim (inside the button's bounds, its bezel flush with the rim).
  const S = 20;
  const img = new Img(S, S);
  squareButton(img, 0, 0, S);
  // Small khaki curls in the inner corners, like his slot frames.
  const curl = ['LL', 'L.'];
  stamp(img, 3, 3, curl, { L: KHAKI[5] });
  stamp(img, S - 5, 3, curl, { L: KHAKI[5] }, true);
  stamp(img, 3, S - 5, [...curl].reverse(), { L: KHAKI[4] });
  stamp(img, S - 5, S - 5, [...curl].reverse(), { L: KHAKI[4] }, true);
  const mk = new Mask(S, S);
  for (const y of [8, 11, 14]) for (let x = 6; x <= 13; x++) mk.set(x, y);
  emboss(img, mk, SILVER, { base: 5 });
  const f = sdCircle(10, 2.5, 3.1);
  fillShape(img, f, 0, KHAKI[3]);
  band(img, f, { from: 0, width: 1.2, ramp: KHAKI, lo: 2, hi: 7 });
  isoLine(img, f, -1, PANEL[0]);
  gem(img, 10, 2.5, 1.9, GEM.red, false);
  return {
    name: 'menu_button', img, group: 'buttons',
    use: 'Menu button (top left, replaces the web navigation bar in battle): his thin-rimmed dark square with small corner curls, a red gem set into the top rim, three bars.',
  };
}

export function smallButton(): Piece {
  const S = 12;
  const img = new Img(S, S);
  squareButton(img, 0, 0, S);
  return { name: 'button_small', img, group: 'buttons', use: 'Small square button (his, above the party frames); 9-slice with a flat centre; the trefoil emblem goes inside.', slice: [4, 4, 4, 4], window: { x: 3, y: 3, w: 6, h: 6, shape: 'rect' } };
}

export function endTurnGem(): Piece {
  // His small pink gem, set inside the panel (not on the corner stud): a rose cabochon in a thin bezel.
  const img = new Img(7, 7);
  setGem(img, 3.5, 3.5, 1.9, 'rose');
  isoLine(img, sdCircle(3.5, 3.5, 3.0), -0.6, METAL[0]);
  return { name: 'end_turn_gem', img, group: 'action bar', use: 'His small pink gem inside the panel, about 10 px down and left of the bar\'s top-right corner gem; a candidate for the end-turn control.' };
}

// --- glyphs (dim line icons for items, the empty skill placeholder, the party emblem) ---------------------------

const GLYPHS: Record<string, string[]> = {
  pills: [
    '.....##..',
    '....#..#.',
    '...#..#.#',
    '..#..#..#',
    '.#..#..#.',
    '#..#..#..',
    '#.#..#...',
    '.#..#....',
    '..##.....',
  ],
  bandage: [
    '.........',
    '#########',
    '#.......#',
    '#..#.#..#',
    '#...#...#',
    '#..#.#..#',
    '#.......#',
    '#########',
    '.........',
  ],
  antidote: [
    '...###...',
    '....#....',
    '....#....',
    '...#.#...',
    '...#.#...',
    '..#...#..',
    '.#.....#.',
    '#########',
    '.#######.',
  ],
  seal: [
    '......#.#',
    '.....#.#.',
    '..####...',
    '.#....#..',
    '#......#.',
    '#......#.',
    '#......#.',
    '.#....#..',
    '..####...',
  ],
  more: [
    '....#....',
    '..##.##..',
    '##.....##',
    '#.##.##.#',
    '#...#...#',
    '#...#...#',
    '#...#...#',
    '.##.#.##.',
    '...###...',
  ],
  placeholder: [
    '.....#.....',
    '....#.#....',
    '...#...#...',
    '..#..#..#..',
    '.#..#.#..#.',
    '#..#...#..#',
    '.#..#.#..#.',
    '..#..#..#..',
    '...#...#...',
    '....#.#....',
    '.....#.....',
  ],
};

export function glyphPiece(key: keyof typeof GLYPHS, color: RGBA, use: string): Piece {
  const rows = GLYPHS[key];
  const img = new Img(rows[0].length, rows.length);
  stamp(img, 0, 0, rows, { '#': color });
  return { name: `glyph_${key}`, img, group: 'glyphs', use };
}

/** His trefoil emblem for the small button: three round lobes and a stem, gold lit from the upper left. */
export function emblemPiece(): Piece {
  const img = new Img(7, 7);
  stamp(img, 0, 0, [
    '..abc..',
    '..bcd..',
    'ab.c.bc',
    'bcccccd',
    'cd.c.cd',
    '...d...',
    '..cdd..',
  ], { a: METAL[7], b: METAL[6], c: METAL[5], d: METAL[3] });
  return { name: 'glyph_emblem', img, group: 'glyphs', use: 'His small gold trefoil for the small button above the party frames.' };
}

// --- everything ------------------------------------------------------------------------------------------------

export const CHAIN_PATHS = {
  left: { w: 38, h: 54, pts: qbez([2, -2], [6, 34], [36, 50], 40) as Pt[] },
  // From the end circle it runs nearly flat, then curves up to the top edge (a hanging curve).
  right: { w: 52, h: 58, pts: cbez([1, 55.5], [28, 59], [47, 44], [50, -2], 48) as Pt[] },
  // Its ends rise behind the bells' bases (the bells are drawn over them).
  sag: { w: 58, h: 16, pts: qbez([1, 0], [28, 26], [57, -1], 40) as Pt[] },
  // The short link between the last bell and the end circle.
  link: { w: 8, h: 5, pts: [[0, 2.5], [8, 2.5]] as Pt[] },
};

export function allPieces(): Piece[] {
  const dimIcon = hex('#8a8170');
  return [
    menuButton(),
    smallButton(),
    targetBar(),
    fillBar('target_fill', RED, 6, 'Red fill for the target plaque channel (3-slice, stretch to the HP fraction).', 'target bar'),
    chainPiece('chain_left', CHAIN_PATHS.left.w, CHAIN_PATHS.left.h, CHAIN_PATHS.left.pts, 'Chain from the top edge down to the round medallion\'s left gem.'),
    chainPiece('chain_right', CHAIN_PATHS.right.w, CHAIN_PATHS.right.h, CHAIN_PATHS.right.pts, 'Chain from the end circle of the turn row: flat at first, then curving up to the top edge.'),
    chainPiece('chain_sag', CHAIN_PATHS.sag.w, CHAIN_PATHS.sag.h, CHAIN_PATHS.sag.pts, 'Chain hanging under the turn row; draw it under the bells so its ends tuck behind their bases.'),
    chainPiece('chain_link', CHAIN_PATHS.link.w, CHAIN_PATHS.link.h, CHAIN_PATHS.link.pts, 'The short chain link between the last bell of the turn row and the end circle.'),
    roundMedallion(),
    initActive(),
    initAlly(),
    initEnemy(),
    initEnd(),
    minimapRing(),
    barFrame(),
    gemStud('red'),
    gemStud('green'),
    endTurnGem(),
    crestStrip(),
    medallionActive(),
    fillBar('hp_fill', RED, 6, 'Red HP fill in the crest trough\'s left half (3-slice; 12 px tall, in the trough window).', 'crest'),
    chakraLine(),
    chakraGem('red'),
    chakraGem('orange'),
    chakraGem('blue'),
    chakraGem('empty'),
    pip('pip_action', 'green', 'Action pip (green); "spent" when used.'),
    pip('pip_bonus', 'orange', 'Bonus action pip (orange).'),
    pip('pip_reaction', 'magenta', 'Reaction pip (magenta).'),
    pip('pip_spent', 'spent', 'A used pip (dark socket).'),
    moveTrough(),
    fillBar('move_fill', TEAL, 4, 'Teal movement fill (3-slice).', 'action bar'),
    skillSlot(),
    skillSlot(true),
    skillTag(),
    itemSlot(),
    itemBadge(),
    lowerPlaque(),
    partyFrame(),
    fillBar('party_hp_fill', RED, 4, 'Party frame HP fill (red, 3-slice).', 'party'),
    fillBar('party_ch_fill', GREEN, 3, 'Party frame second bar (his green; chakra), 3-slice.', 'party'),
    glyphPiece('placeholder', alpha(hex('#9a8f78'), 70), 'Faint placeholder in an empty skill slot until the owner paints the icons.'),
    glyphPiece('pills', dimIcon, 'Item icon: pills (dim).'),
    glyphPiece('bandage', dimIcon, 'Item icon: bandages (dim).'),
    glyphPiece('antidote', dimIcon, 'Item icon: antidote (dim).'),
    glyphPiece('seal', dimIcon, 'Item icon: explosive seal (dim).'),
    glyphPiece('more', dimIcon, 'Item icon: more (dim).'),
    emblemPiece(),
  ];
}
