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
  /** A reference point (art pixels), e.g. the centre of a medallion's ring, for placing it. */
  anchor?: { x: number; y: number };
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
 * Open lace drawn from a character map: the strokes and (unless `shadow` is null) a dark shadow
 * pixel under each stroke pixel where nothing else is, so the wire reads on any ground while every
 * other gap stays open (his sparse lace shows the grass between the curls).
 */
function openLace(img: Img, rows: string[], ox: number, oy: number, pal: Record<string, RGBA>, opts: { flipX?: boolean; flipY?: boolean; shadow?: RGBA | null } = {}): void {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const at = (x: number, y: number): string => (x < 0 || y < 0 || x >= w || y >= h ? '.' : rows[opts.flipY ? h - 1 - y : y][opts.flipX ? w - 1 - x : x] ?? '.');
  const sh = opts.shadow === undefined ? WIRE_OUTLINE : opts.shadow;
  if (sh)
    for (let y = 0; y <= h; y++)
      for (let x = 0; x <= w; x++) if (at(x, y) === '.' && at(x, y - 1) !== '.' && img.a(ox + x, oy + y) === 0) img.set(ox + x, oy + y, sh);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = at(x, y);
      if (c === '.') continue;
      if (!pal[c]) throw new Error(`openLace: no color for '${c}'`);
      img.set(ox + x, oy + y, pal[c]);
    }
}

/** His bar lace (warm khaki gold, like the brackets). */
const BAR_LACE: Record<string, RGBA> = { H: hex('#d2c4a4'), L: hex('#ab9c7c'), l: hex('#8c7d60'), M: hex('#66583f') };

/**
 * His sparse lace down the bar's ends (left end; mirrored for the right): a wire scalloped into one
 * small C-curl every 4 rows (8 px on screen), touching the rail between curls, the grass showing
 * through each curl, in the 3-pixel outset outside the rail. The motif repeats every 4 rows from
 * the top of the piece, so the ends tile cleanly.
 */
const END_LACE = [
  '.HL',
  'L..',
  'l..',
  '.lM',
];
/** His wire arms from the corner gems along the rails (left corners; mirrored for the right). */
const ARM_TOP = [
  '.....LL.....LL.',
  '.LLLL..LLLLL..L',
  '............MM.',
];
const ARM_BOTTOM = [
  '..........LLL..',
  '.lllllllll...l.',
  '...........ll..',
];

export function barFrame(): Piece {
  // 52 x 40 art pixels with a 3-pixel outset: corner slices 12 high and 22 wide, so the gems'
  // wire arms (14 art px, 28 on screen) stay in the corners; the centre repeats every 2 columns
  // (the dotted line) and every 4 rows (the end lace).
  const SW = 52, SH = 40, m = 3, sl = [12, 22, 12, 22] as [number, number, number, number];
  const img = new Img(SW, SH);
  const x0 = m, y0 = m, x1 = SW - 1 - m, y1 = SH - 1 - m;
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
  // His sparse lace down both ends, in the outset (rows between the gems' bezels).
  const lace: string[] = [];
  for (let y = 0; y < SH; y++) lace.push(y >= 10 && y < SH - 10 ? END_LACE[y % 4] : '...');
  openLace(img, lace, 0, 0, BAR_LACE, { shadow: null });
  openLace(img, lace, SW - 3, 0, BAR_LACE, { flipX: true, shadow: null });
  // The gems' wire arms along the outside of the top and bottom rails (the bottom ones end in a
  // clear scroll), then the gems: red on top, green below (his).
  openLace(img, ARM_TOP, 7, 0, BAR_LACE);
  openLace(img, ARM_TOP, SW - 7 - ARM_TOP[0].length, 0, BAR_LACE, { flipX: true });
  openLace(img, ARM_BOTTOM, 7, SH - 3, BAR_LACE);
  openLace(img, ARM_BOTTOM, SW - 7 - ARM_BOTTOM[0].length, SH - 3, BAR_LACE, { flipX: true });
  studGem(img, x0 + 2, y0 + 2, 2.6, 'red');
  studGem(img, x1 - 1, y0 + 2, 2.6, 'red');
  studGem(img, x0 + 2, y1 - 1, 2.6, 'green');
  studGem(img, x1 - 1, y1 - 1, 2.6, 'green');
  return {
    name: 'bar_frame', img, group: 'action bar',
    use: 'Action bar frame: 9-slice (corners 24 px high, 44 px wide). His thin grey-silver rails, the dotted inner line, dark panel; his sparse wire lace down both ends (an S-curl every 8 px, open between) and a wire arm from each corner gem along the rail, the bottom ones ending in a scroll (red gems on top, green below). With CSS repeat, keep (width - 48) a multiple of 8 and (height - 48) a multiple of 16.',
    slice: sl, outset: [m, m, m, m],
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
 * His finial (left end of the target plaque; mirrored for the right), hand-placed at art
 * resolution: the top half of the cap, rows 0..9 (the bottom half is its mirror, a step darker).
 * From the tip inward: a pale lozenge point, a rose stone in a small bezel, an open lyre (a loop
 * above and below, each with a dark eye) around the channel's rounded nose, then a thin bronze
 * arm that rises over the nose, runs along the rail and ends in a small curl about 37 px from the
 * tip. Keys as in `wire` ('r' / 'R' the rose stone, ':' the dark between the strokes).
 */
const FINIAL_TOP = [
  '........................................',
  '...............LLLL...............lL....',
  '..............L....L.............l..l...',
  '.............L......LllllllllllllM..M...',
  '..........LLl...........................',
  '..........L:M...........................',
  '..........lMM...........................',
  '....L....l..............................',
  '..HLl.Ll.l..............................',
  'HHLLlLrrMM..............................',
];
/** The bottom half: the top mirrored, each stroke one step darker (the light is above). */
const FINIAL_MAP = [...FINIAL_TOP, ...[...FINIAL_TOP].reverse().map((r) => r.replace(/[HLl]/g, (c) => ({ H: 'L', L: 'l', l: 'M' })[c as 'H' | 'L' | 'l']).replace(/r/g, 'R'))];

/** His warm bronze for the finials and arms (bright mean about 150, 135, 110 like his). */
const FINIAL: Record<string, RGBA> = {
  H: hex('#cdbf9c'), L: hex('#a4936f'), l: hex('#7f6b4b'), M: hex('#56462e'),
  r: hex('#c47e88'), R: hex('#843d4c'), ':': hex('#1c150c'),
};

/** His plaque rail, a thin warm silver: outline, pale line, mid line (top; the bottom a step darker). */
const PLAQUE_RAIL = { out: hex('#19130b'), paleT: hex('#9d9384'), midT: hex('#5f5649'), paleB: hex('#857b6d'), midB: hex('#4c443a') };

export function targetBar(): Piece {
  // His plaque is only the thin silver rail around the channel: outline, a pale line, a mid line,
  // the 6-row channel and the same below (rows 4..15 of 20). At each end the channel
  // has his rounded bullet nose and the rail follows it round; the finial sits beyond it. The
  // centre, between the 40-pixel caps, is one repeating column.
  const W = 200, Hh = 20, cap = 40, cy = 10, t0 = 18, Ln = 5, R = 3;
  const img = new Img(W, Hh);
  // The well's half-height along the bar (u from the nearer end): an elliptical nose, then flat.
  const hw = (u: number): number => (u < t0 ? -1 : u < t0 + Ln ? R * Math.sqrt(Math.max(0, 1 - ((t0 + Ln - u) / Ln) ** 2)) : R);
  // Signed distance to the well's edge (positive outside), by dense sampling of the nose curve.
  const edge: Pt[] = [];
  for (let u = t0; u <= t0 + Ln + 6; u += 0.05) edge.push([u, hw(u)]);
  const dist = (x: number, y: number): number => {
    const u = Math.min(x, W - x), v = Math.abs(y - cy);
    let m = Infinity;
    for (const [eu, ev] of edge) m = Math.min(m, Math.hypot(u - eu, v - ev));
    if (u > t0 + Ln) m = Math.min(m, Math.abs(v - R));
    return v <= hw(u) ? -m : m;
  };
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < W; x++) {
      const px = x + 0.5, py = y + 0.5, e = dist(px, py), top = py < cy;
      // Facing the light (up or toward the tip on the left end): the pale steps.
      const lit = top || (px < W / 2 && Math.min(px, W - px) < t0 + 1.5 && Math.abs(py - cy) < 2);
      let c: RGBA | null = null;
      if (e <= 0) c = PANEL[2];
      else if (e <= 1) c = lit ? PLAQUE_RAIL.midT : PLAQUE_RAIL.midB;
      else if (e <= 2) c = lit ? PLAQUE_RAIL.paleT : PLAQUE_RAIL.paleB;
      else if (e <= 3) c = PLAQUE_RAIL.out;
      if (c) img.set(x, y, c);
    }
  for (const flip of [false, true]) wire(img, FINIAL_MAP, { ox: flip ? W - FINIAL_MAP[0].length : 0, flip, pal: FINIAL, outline: hex('#281e12') });
  return {
    name: 'target_bar', img, group: 'target bar',
    use: 'Chained plaque for the targeted or hovered enemy (or the boss): 3-slice. Only his thin silver rail runs along the bar; each 80-px cap holds his finial (pale lozenge tip, rose stone, an open lyre of two loops with dark eyes) and a thin bronze arm along the top and bottom rails ending in a small curl, round the channel\'s rounded nose. The centre is one repeating column (any width works). The red fill goes in the window (its rounded ends follow the nose).',
    slice: [0, cap, 0, cap],
    window: { x: t0, y: cy - R, w: W - 2 * t0, h: 2 * R, shape: 'rect' },
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
  const f = (x: number, y: number) => Math.hypot((x - cx) / (rx + 1.0), (y - cy) / (ry + 1.0)) - 1;
  const mk = new Mask(img.w, img.h);
  mk.sdf(f);
  // The bezel's point, out along the radius.
  mk.set(Math.floor(cx + out[0] * (Math.max(rx, ry) + 1.5)), Math.floor(cy + out[1] * (Math.max(rx, ry) + 1.5)));
  emboss(img, mk, METAL, { base: 5 });
  gemOval(img, cx, cy, rx, ry, GEM[color]);
}

export function roundMedallion(): Piece {
  // His round rim, fine and dense: an outline, a thin metal line, a row of 1-pixel pale beads with
  // dark separators, a thin inner line and an inner outline, round the dark brown face. The four
  // oval gems sit on the bead line in small bezels, flush with the rim (only their points reach
  // a pixel past it).
  const W = 40, Hh = 40, cx = 20, cy = 20;
  const img = new Img(W, Hh);
  const RO = 18.4; // outer edge of the outline
  const lit = (x: number, y: number) => {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy) || 1;
    return -(dx * 0.6 + dy * 0.8) / d; // +1 toward the upper-left light
  };
  const beads: { x: number; y: number; a: number }[] = [];
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < W; x++) {
      const r = Math.hypot(x + 0.5 - cx, y + 0.5 - cy), l = lit(x, y);
      if (r > RO) continue;
      let c: RGBA;
      if (r > RO - 0.9) c = METAL[0];
      else if (r > RO - 1.9) c = l > 0.3 ? METAL[5] : l > -0.3 ? METAL[4] : METAL[3];
      else if (r > RO - 2.9) {
        beads.push({ x, y, a: Math.atan2(y + 0.5 - cy, x + 0.5 - cx) });
        continue;
      } else if (r > RO - 3.9) c = l > 0.3 ? METAL[4] : METAL[3];
      else if (r > RO - 4.7) c = METAL[0];
      else c = BROWN[r < 8 ? 3 : r < 11.5 ? 2 : 1];
      img.set(x, y, c);
    }
  // The beads: in order round the ring, pale and dark by turns (lit at the upper left).
  beads.sort((p, q) => p.a - q.a);
  beads.forEach((b, i) => img.set(b.x, b.y, i % 2 === 0 ? (lit(b.x, b.y) > 0.2 ? METAL[7] : lit(b.x, b.y) > -0.4 ? METAL[6] : METAL[5]) : METAL[1]));
  // Gems on the bead line (r 16), red top and left, green right and bottom (his), long along the
  // radius, in thin bezels with a small point outward.
  const RG = RO - 2.4;
  bezelGem(img, cx, cy - RG, 1.9, 2.2, 'red', [0, -1]);
  bezelGem(img, cx - RG, cy, 2.2, 1.9, 'red', [-1, 0]);
  bezelGem(img, cx + RG, cy, 2.2, 1.9, 'green', [1, 0]);
  bezelGem(img, cx, cy + RG, 1.9, 2.2, 'green', [0, 1]);
  return {
    name: 'round_medallion', img, group: 'turn row',
    use: 'Round counter medallion ("RONDA" over the number, no box behind the word): his round rim of fine 1-pixel beads between two thin lines, four oval gems set on the bead line (red top/left, green right/bottom). The chains hang from its left gem.',
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
  const W = 18, Hh = 20;
  const img = new Img(W, Hh);
  const cx = 9, cy = 8.5, r = 8.5;
  const f = sdCircle(cx, cy, r);
  // His base: a thin flat strip under the circle, narrower than it (10 of 17 pixels), two rows of
  // the team color in a dark outline.
  for (let y = 16; y <= 19; y++)
    for (let x = 3; x <= 14; x++) {
      const edge = y === 16 || y === 19 || x === 3 || x === 14;
      img.set(x, y, edge ? ramp[0] : y === 17 ? ramp[4] : ramp[2]);
    }
  band(img, f, { from: 0, width: 1.7, ramp, lo: 2, hi: 4 });
  isoLine(img, f, -1, ramp[0]);
  isoLine(img, f, 1.7, ramp[0]);
  return { name, img, group: 'turn row', use, window: { x: 2, y: 2, w: 14, h: 14, shape: 'circle' } };
}
export const initAlly = () => initBell('init_ally', ALLY, 'Turn row: an ally (round window, his muted steel-blue rim and thin base strip).');
export const initEnemy = () => initBell('init_enemy', FOE, 'Turn row: an enemy (round window, his muted rose rim and thin base strip).');

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

/** His pearl-grey minimap band, dark to light (lower right #8f8b82 up to the upper left #f4f1ea). */
const PEARL = ['#3e3a33', '#6f6b63', '#8f8b82', '#aeaaa0', '#cbc7bc', '#e2ded4', '#f4f1ea'].map((h) => hex(h));

export function minimapRing(): Piece {
  // Measured on his frame (in art pixels about the centre): the map window r 38; a thin gold line;
  // his pearl band, 5 pixels (10 on screen) to r 44, bright at the upper left and grey toward the
  // lower right; a thin gold line on its outer edge; then a gold running scroll to a gold line at
  // r 50 (a wave every 7 pixels, dark between). The cardinal gems sit on the band in pointed lozenge mounts; the
  // diagonal gems sit in pointed lozenge mounts that stand a little outside the ring.
  const S = 100, c = 50, RW = 38;
  const img = new Img(S, S);
  // --- the lace: a running scroll between two gold lines (r 45 and r 50), on a dark backing --------
  const RL = 47, N = Math.round((2 * Math.PI * RL) / 7), P = (2 * Math.PI * RL) / N;
  // One wave of the scroll in (s along the ring, v outward from the inner gold line): it rises
  // from the inner line, rolls over toward the outer line and curls down into an eye; the next
  // wave starts where it began.
  const wave: Pt[] = [
    ...(cbez([0, 0.3], [P * 0.15, 4.4], [P * 0.85, 4.6], [P * 0.8, 2.3], 24) as Pt[]),
    ...spiral(P * 0.56, 2.3, P * 0.24, 0.35, 0, Math.PI * 1.6, 14),
  ];
  const segDist = (px: number, py: number): number => {
    let m = Infinity;
    for (let i = 0; i + 1 < wave.length; i++) {
      const [ax, ay] = wave[i], [bx, by] = wave[i + 1];
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
      const u = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
      m = Math.min(m, Math.hypot(px - ax - u * dx, py - ay - u * dy));
    }
    return m;
  };
  const lace = new Mask(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - c, dy = y + 0.5 - c, r = Math.hypot(dx, dy);
      if (r < 44 || r > 51) continue;
      if (r <= 50.6) img.set(x, y, METAL[1]);
      const th = (Math.atan2(dy, dx) + 2.5 * Math.PI) % (2 * Math.PI);
      const sArc = ((th * RL) % P + P) % P, v = r - 45;
      if (Math.min(segDist(sArc, v), segDist(sArc - P, v), segDist(sArc + P, v)) < 0.58) lace.set(x, y);
    }
  emboss(img, lace, METAL, { base: 5, outline: false });
  isoLine(img, sdCircle(c, c, 50.6), 0, METAL[4], 0.8);
  isoLine(img, sdCircle(c, c, 51.4), 0, METAL[1], 0.8);
  // --- the pearl band, lit from the upper left, with a thin gold line on each edge ------------------
  const light = Math.atan2(-0.8, -0.6);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - c, dy = y + 0.5 - c, r = Math.hypot(dx, dy);
      if (r < 39 || r >= 44) continue;
      const t = Math.max(0, Math.cos(Math.atan2(dy, dx) - light)); // 1 facing the light, 0 on the far half
      let k = 2 + Math.round(t * 3);
      // The band is rounded: its outer and inner pixel a step darker (the inner one two on the lit side, in shadow).
      if (r >= 43) k -= 1;
      else if (r < 40) k -= t > 0.5 ? 2 : 1;
      img.set(x, y, PEARL[Math.max(1, k)]);
    }
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
  /** A gold lozenge mount, long along (ux, uy), pointed at both ends, with optional side prongs. */
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
    emboss(img, bz, METAL, { base: 4, outlineColor: METAL[1] });
  };
  const diagonal: [number, keyof typeof GEM][] = [[-135, 'green'], [-45, 'green'], [45, 'green'], [135, 'red']];
  for (const [deg, col] of diagonal) {
    const a = (deg * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a);
    const gx = Math.floor(c + ux * 49.4) + 0.5, gy = Math.floor(c + uy * 49.4) + 0.5;
    // Pointed along the radius, out past the lace (his diagonal mounts stand outside the ring).
    lozenge(gx, gy, ux, uy, 6.4, 4.4, false);
    gem(img, gx, gy, 2.4, GEM[col], false);
  }
  const cardinal: [number, keyof typeof GEM][] = [[-90, 'green'], [0, 'green'], [90, 'red'], [180, 'green']];
  for (const [deg, col] of cardinal) {
    const a = (deg * Math.PI) / 180;
    const ux = Math.cos(a), uy = Math.sin(a);
    const gx = Math.floor(c + ux * 44.2) + 0.5, gy = Math.floor(c + uy * 44.2) + 0.5;
    // Pointed lozenge mount, long along the radius (out and in), with a prong on each side.
    lozenge(gx, gy, ux, uy, 5.8, 4.0, true);
    gem(img, gx, gy, 2.4, GEM[col], true);
  }
  return {
    name: 'minimap_ring', img, group: 'minimap',
    use: 'Round minimap frame: his pearl band (bright at the upper left, grey toward the lower right) with a thin gold line on each edge, a gold scroll lace outside it; cardinal gems in pointed lozenge mounts on the band, diagonal gems in pointed lozenge mounts standing a little outside the ring (green, red at the lower left, as he painted them). The map shows through the round window.',
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

/** His tag rim: a dim bronze, darkest to lit. */
const TAG_RIM = ['#3f3527', '#54483a', '#6b5d47', '#85755a'].map((h) => hex(h));

export function skillTag(): Piece {
  // His number tag: a free-standing hexagonal shield (chamfered top corners, pointed bottom),
  // a dim bronze rim, dark fill, the cream digit inside; quieter than the slot frame. It overlaps
  // the slot top by 3 art pixels.
  const W = 11, Hh = 12;
  const half = [3, 4, 5, 5, 5, 5, 5, 5, 4, 3, 2, 1];
  const img = new Img(W, Hh);
  const inside = (x: number, y: number) => y >= 0 && y < Hh && Math.abs(x - 5) <= half[y];
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      const rim = !edge && (!inside(x - 2, y) || !inside(x + 2, y) || !inside(x, y - 2) || !inside(x, y + 2) || !inside(x - 1, y - 1) || !inside(x + 1, y - 1) || !inside(x - 1, y + 1) || !inside(x + 1, y + 1));
      // His rim: a dim bronze, lit a little along the top edge, darker on the right and the point.
      const k = y <= 2 ? (x <= 5 ? 3 : 2) : x < 5 && y < 8 ? 2 : x < 5 ? 1 : 0;
      img.set(x, y, edge ? PANEL[0] : rim ? TAG_RIM[k] : PANEL[1]);
    }
  return { name: 'skill_tag', img, group: 'action bar', use: 'Number tag over a skill slot: his dark hexagonal shield with a dim bronze rim (the slot number, cream, in the label font).', window: { x: 2, y: 2, w: 7, h: 7, shape: 'rect' } };
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
  // His movement bar: a trough with a small pointed left end (a chevron, like the target plaque's
  // nose) and a rounded right end, a dark well and a thin lit rim. 3-slice: the 8-pixel left cap,
  // one repeating column, the 3-pixel right cap.
  const L = [
    '....oooo',
    '..oo4444',
    'oo440000',
    'oo331111',
    '..oo2222',
    '....oooo',
  ];
  const R = ['o..', '3o.', '02o', '12o', '2o.', 'o..'];
  const C = ['o', '4', '0', '1', '2', 'o'];
  const W = 24, Hh = 6;
  const img = new Img(W, Hh);
  const rows = L.map((l, y) => l + C[y].repeat(W - l.length - R[y].length) + R[y]);
  stamp(img, 0, 0, rows, { o: METAL[0], '0': PANEL[0], '1': PANEL[1], '2': METAL[3], '3': METAL[4], '4': METAL[5] });
  return { name: 'move_trough', img, group: 'action bar', use: 'Movement bar trough, his (3-slice): a small pointed left end (the fill starts just after it) and a rounded right end; the teal fill goes in the window.', slice: [0, 3, 0, 8], window: { x: 6, y: 1, w: W - 8, h: 4, shape: 'rect' } };
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
  // 100 x 56 art pixels; the ring is centred on (50, 27). His crown steps down on each side from
  // the top gem: a small boss on the arch, the big dark dome boss at shoulder level, then a third
  // small dark boss sitting on the trough rail and a short wire tail along the rail.
  const W = 100, Hh = 56, cx = 50, cy = 27;
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
  // Big boss and third boss centres (pixel centres, mirrored exactly).
  const BIG = { dx: 28.5, y: 22.5, r: 5.4 }, THIRD = { dx: 40.5, y: 27.5, r: 3.2 };
  // The arch reaches the big bosses at its two ends; the crown then steps down to the third boss
  // and the tail on the rail (one dark backing for all of it).
  for (const sgn of [-1, 1]) {
    back.disc(cx + sgn * BIG.dx, BIG.y, BIG.r + 1.1);
    back.disc(cx + sgn * 24.4, cy - 7.4, 3.4);
    back.disc(cx + sgn * THIRD.dx, THIRD.y, THIRD.r + 0.9);
    back.stroke([[cx + sgn * (BIG.dx + 2), BIG.y + 3.5], [cx + sgn * (THIRD.dx - 1.5), THIRD.y - 1.5]], 3);
  }
  // The wire tail: from under the third boss out along the rail, ending in a small upturned curl.
  const tail = new Mask(W, Hh);
  for (const sgn of [-1, 1]) {
    const X = (v: number) => (sgn < 0 ? v : W - v);
    const pts: Pt[] = [[X(9.5), 30.5], [X(6.5), 30.5], [X(4.5), 30.5], [X(3.2), 29.6], [X(3.0), 28.4], [X(4.0), 27.6]];
    tail.stroke(pts, 1);
  }
  filledLace(img, mk, back, METAL, { base: 5, grow: 0, backColor: METAL[1], crevice: METAL[0] });
  emboss(img, tail, METAL, { base: 4, outlineColor: METAL[0] });
  // Knobs on the arch's wire, then the small bosses on the arch.
  for (const sgn of [-1, 1])
    for (const deg of [104]) {
      const a = (deg * Math.PI) / 180;
      const kx = cx + sgn * Math.cos(Math.PI - a) * 26.2, ky = cy - Math.sin(a) * 26.2;
      const fk = sdCircle(kx, ky, 1.5);
      band(img, fk, { from: 0, width: 1.5, ramp: METAL, lo: 3, hi: 7 });
      isoLine(img, fk, -1, METAL[0]);
    }
  /**
   * His dark dome boss: a thin pale rim lit from the upper left, a dark interior (darker toward the
   * lower right) and, on the big ones, his pale twin highlight just above the centre.
   */
  const darkBoss = (bx: number, by: number, r: number, twin: boolean) => {
    for (let y = Math.floor(by - r - 2); y <= by + r + 2; y++)
      for (let x = Math.floor(bx - r - 2); x <= bx + r + 2; x++) {
        const dx = x + 0.5 - bx, dy = y + 0.5 - by, d = Math.hypot(dx, dy);
        if (d > r + 1) continue;
        if (d > r) {
          img.set(x, y, METAL[0]);
          continue;
        }
        const lit = d > 0 ? -(dx * 0.6 + dy * 0.8) / d : 0; // +1 facing the upper-left light
        if (d > r - 1) img.set(x, y, lit > 0.45 ? METAL[6] : lit > -0.2 ? METAL[5] : METAL[4]);
        else img.set(x, y, dx + dy > r * 0.5 ? PANEL[1] : METAL[1]);
      }
    if (twin) {
      // Two pale bumps side by side, a dark pixel between, two rows tall (bright over dim).
      const px = Math.floor(bx), py = Math.floor(by) - 2;
      img.set(px - 2, py, METAL[6]);
      img.set(px - 1, py, METAL[7]);
      img.set(px + 1, py, METAL[7]);
      img.set(px + 2, py, METAL[6]);
      img.set(px - 2, py + 1, METAL[4]);
      img.set(px - 1, py + 1, METAL[5]);
      img.set(px + 1, py + 1, METAL[5]);
      img.set(px + 2, py + 1, METAL[4]);
      img.set(px, py, PANEL[0]);
      img.set(px, py + 1, PANEL[0]);
    } else img.set(Math.floor(bx), Math.floor(by), METAL[6]);
  };
  for (const sgn of [-1, 1]) {
    const sx = cx + sgn * 20.6, sy = cy - 15.6;
    const fs = sdCircle(sx, sy, 3.2);
    fillShape(img, fs, 0, PANEL[2]);
    band(img, fs, { from: 0, width: 1.4, ramp: METAL, lo: 2, hi: 7 });
    isoLine(img, fs, -1, METAL[0]);
    img.set(Math.floor(sx), Math.floor(sy), METAL[5]);
    darkBoss(cx + sgn * BIG.dx, BIG.y, BIG.r, true);
    darkBoss(cx + sgn * THIRD.dx, THIRD.y, THIRD.r, false);
  }
  // Outer beaded ring, then the gold rim.
  const fo = sdCircle(cx, cy, 21.8);
  band(img, fo, { from: 0, width: 2, ramp: METAL, lo: 2, hi: 7, beads: { period: 2.5, cx, cy, r: 21, depth: 0.9 } });
  isoLine(img, fo, -1, METAL[0]);
  const fr = sdCircle(cx, cy, 19.8);
  band(img, fr, { from: 0, width: 3.3, ramp: GOLD, lo: 2, hi: 7, flat: 0.1 });
  isoLine(img, fr, 0, GOLD[0], 0.7);
  isoLine(img, fr, 3.3, GOLD[0]);
  // Gems: red on top; his pale grey-green pearl at the bottom (13 px across on screen), in a thin
  // bezel, resting on the bar's top rail.
  studGem(img, cx, 4.4, 2.6, 'red');
  const pf = sdCircle(cx, cy + 20.6, 4.4);
  band(img, pf, { from: 0, width: 1.2, ramp: METAL, lo: 2, hi: 6 });
  isoLine(img, pf, -1, METAL[0]);
  gem(img, cx, cy + 20.6, 3.25, GEM.pearl, false);
  return {
    name: 'medallion_active', img, group: 'crest',
    use: 'Acting character medallion: the portrait shows through the round window (ring centre at the anchor). His crown: small curls on the arch, a small boss, then on each side his big dark dome boss with a pale twin highlight, stepping down to a third small dark boss on the trough rail and a short wire tail. Red gem on top; his pale pearl at the bottom rests on the bar\'s top rail. Sits on the middle of the crest strip.',
    window: { x: cx - 16.5, y: cy - 16.5, w: 33, h: 33, shape: 'circle' },
    anchor: { x: cx, y: cy },
  };
}

// --- plaque under the bar ------------------------------------------------------------------------------------

/**
 * Rasterizes 1-pixel curves into a character map for `wire`: each stroke is a list of points and
 * the key it is drawn with (later strokes draw over earlier ones); `stamps` are small hand-placed
 * maps laid over the result ('.' leaves the pixel alone).
 */
function strokeMap(w: number, h: number, strokes: { pts: Pt[]; ch: string }[], stamps: { x: number; y: number; rows: string[] }[] = []): string[] {
  const g: string[][] = Array.from({ length: h }, () => Array(w).fill('.'));
  for (const s of strokes) for (const [x, y] of pixelPath(s.pts)) if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = s.ch;
  for (const st of stamps)
    st.rows.forEach((r, dy) => [...r].forEach((c, dx) => {
      const x = st.x + dx, y = st.y + dy;
      if (c !== '.' && x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c === '_' ? '.' : c;
    }));
  return g.map((r) => r.join(''));
}

/**
 * The pixels of a curve as a clean 1-pixel line: the pixels it passes through, in order, with the
 * corner pixels of every staircase step dropped (a pixel goes when the ones before and after it
 * touch diagonally), so curves have no doubled steps.
 */
export function pixelPath(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 4));
    for (let k = 0; k <= n; k++) {
      const p: Pt = [Math.floor(x0 + ((x1 - x0) * k) / n), Math.floor(y0 + ((y1 - y0) * k) / n)];
      const q = out[out.length - 1];
      if (!q || q[0] !== p[0] || q[1] !== p[1]) out.push(p);
    }
  }
  for (let i = 1; i + 1 < out.length; ) {
    const a = out[i - 1], c = out[i + 1];
    if (Math.abs(a[0] - c[0]) === 1 && Math.abs(a[1] - c[1]) === 1) out.splice(i, 1);
    else i++;
  }
  return out;
}

/**
 * His lower bracket (left end of the plaque under the bar; mirrored for the right): a triangular
 * gusset of curved wire, wide along the bar's underside and pointed at the plaque's lower corner.
 * A wire along the top with a small curl at the outer tip; the long edge sagging down to the
 * point; an S-scroll from the top wire down to the edge with his small eye (two dark dots in a pale
 * ring, about 10 px) in its upper bowl; and the X binding by the plaque's end, two crossing C-curves.
 * The background shows between the wires.
 */
function lowerBracket(): string[] {
  const W = 38, H = 16;
  const edge = qbez([1.5, 2.2], [11.5, 14.6], [36.5, 15.5], 40) as Pt[];
  return strokeMap(W, H, [
    // The top wire along the bar, and the small curl at the outer tip.
    { pts: [[3.5, 0.5], [31.5, 0.5]], ch: 'L' },
    { pts: spiral(2.6, 2.4, 1.9, 0.6, -Math.PI / 2, -Math.PI * 2.3, 20), ch: 'L' },
    // The long edge, sagging from the tip to the plaque's corner.
    { pts: edge, ch: 'L' },
    // The S-scroll: from the top wire down round the eye and back to the edge.
    { pts: cbez([7.5, 0.5], [9.5, 6.5], [20.5, 2.5], [17.5, 11.8], 30) as Pt[], ch: 'l' },
    // A small C-curl under the top wire, between the tip and the scroll.
    { pts: spiral(7.0, 5.6, 2.0, 0.7, -Math.PI * 0.1, Math.PI * 1.5, 18), ch: 'l' },
    // The X binding: two C-curves crossing near the plaque's end.
    { pts: qbez([21.5, 0.5], [30.5, 3.5], [31.5, 14.5], 24) as Pt[], ch: 'L' },
    { pts: qbez([31.5, 0.5], [22.5, 3.5], [22.5, 13.4], 24) as Pt[], ch: 'l' },
  ], [
    // His eye: a pale ring with two dark dots.
    { x: 12, y: 3, rows: ['.LLl.', 'LK.Kl', '.lMM.'] },
  ]);
}

export function lowerPlaque(): Piece {
  const W = 96, Hh = 16, cap = 44, end = 31, rr = 6;
  const img = new Img(W, Hh);
  // The plaque: dark, its top on the bar's bottom rail, his silver rail along the bottom, and
  // rounded ends (radius 6) under the brackets' X bindings.
  const f = sdRoundRect(end, -10, W - end, Hh - 1, rr);
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < W; x++) {
      const d = -f(x + 0.5, y + 0.5);
      if (d < -1) continue;
      const rail = y >= Hh - 4;
      img.set(x, y, d < 0 ? METAL[0] : rail && d < 1 ? RAIL[5] : rail && d < 2 ? RAIL[3] : d < 1.5 ? PANEL[0] : mixc(PANEL[3], BROWN[1], 0.4));
    }
  const map = lowerBracket();
  // His bracket metal is a warm khaki gold (bright mean about 160, 150, 124).
  const pal = { H: hex('#d2c4a4'), L: hex('#ab9c7c'), l: hex('#8c7d60'), M: hex('#66583f'), K: hex('#14100a') };
  for (const flip of [false, true]) wire(img, map, { ox: flip ? W - map[0].length : 0, flip, pal });
  return {
    name: 'lower_plaque', img, group: 'action bar',
    use: 'Dark plaque under the action bar (3-slice): his triangular openwork brackets of curved wire (a curl at the tip, the sagging long edge, an S-scroll holding his small eye, an X of two crossing C-curves; the background shows through) and rounded plaque ends with a silver rail along the bottom; for the hint line or the combat log.',
    slice: [0, cap, 0, cap],
    window: { x: end + rr, y: 1, w: W - 2 * (end + rr), h: Hh - 5, shape: 'rect' },
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
  // His slightly rounded corners: the outer line cuts each corner on the diagonal.
  for (const [fx, fy] of [[false, false], [true, false], [false, true], [true, true]]) {
    const X = (x: number) => (fx ? W - 1 - x : x), Y = (y: number) => (fy ? Hh - 1 - y : y);
    img.set(X(0), Y(0), [0, 0, 0, 0]);
    img.set(X(1), Y(0), [0, 0, 0, 0]);
    img.set(X(0), Y(1), [0, 0, 0, 0]);
    img.set(X(1), Y(1), fy ? OLIVE[4] : OLIVE[5]);
    // His small gold curl in the corner, curling in from the inner line (at the bottom corners
    // the bar wells take that space, so only a bright knot on the inner line).
    if (fy) {
      img.set(X(2), Y(2), OLIVE[6]);
      img.set(X(3), Y(2), OLIVE[5]);
      img.set(X(2), Y(3), OLIVE[5]);
      continue;
    }
    img.set(X(3), Y(3), OLIVE[6]);
    img.set(X(4), Y(3), OLIVE[5]);
    img.set(X(3), Y(4), OLIVE[5]);
    img.set(X(5), Y(4), OLIVE[3]);
    img.set(X(4), Y(5), OLIVE[3]);
  }
  // The bar wells under the portrait: red (HP) then green.
  img.rect(3, 28, W - 6, 1, OLIVE[2]);
  img.rect(3, 29, W - 6, 4, PANEL[0]);
  img.rect(3, 33, W - 6, 1, PANEL[1]);
  img.rect(3, 34, W - 6, 3, PANEL[0]);
  return {
    name: 'party_frame', img, group: 'party',
    use: 'Party portrait frame (9-slice): his thin olive-gold double line with slightly rounded corners and a small gold curl in each corner (over the portrait corner, like his); portrait window on top, two bar wells below (red HP at 3,29 4 high, green at 3,34 3 high, in art pixels).',
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
