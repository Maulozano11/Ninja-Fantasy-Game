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
  band, cbez, emboss, fillShape, filledLace, gem, isoLine, lace, orb, qbez, rhombGem, sdCircle, sdLp, sdRoundRect, spiral, stamp, wire,
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

/** The rail-and-studs border used by the action bar, the crest strip and the plaques. */
function railRows(dir: 'top' | 'bottom'): RGBA[] {
  // From the outside in: his dim grey-silver rails, lit on the top and left.
  const studs = RAIL[4];
  return dir === 'top'
    ? [METAL[0], RAIL[5], RAIL[4], RAIL[2], PANEL[0], studs, PANEL[1]]
    : [METAL[0], RAIL[2], RAIL[3], RAIL[4], PANEL[0], studs, PANEL[1]];
}

// --- action bar frame (9-slice) ----------------------------------------------------------------------

export function barFrame(): Piece {
  const S = 40, m = 3;
  const img = new Img(S, S);
  const x0 = m, y0 = m, x1 = S - 1 - m, y1 = S - 1 - m;
  img.rect(x0, y0, x1 - x0 + 1, y1 - y0 + 1, PANEL[3]);
  // Subtle dark vignette inside the studs so the panel reads as a recessed well.
  const top = railRows('top'), bot = railRows('bottom');
  for (let i = 0; i < top.length; i++) {
    for (let x = x0 + i; x <= x1 - i; x++) {
      const studT = i === 5 ? ((x - x0) % 2 === 0 ? top[i] : PANEL[1]) : top[i];
      const studB = i === 5 ? ((x - x0) % 2 === 0 ? bot[i] : PANEL[1]) : bot[i];
      img.set(x, y0 + i, studT);
      img.set(x, y1 - i, studB);
    }
    for (let y = y0 + i; y <= y1 - i; y++) {
      const studL = i === 5 ? ((y - y0) % 2 === 0 ? top[i] : PANEL[1]) : top[i];
      const studR = i === 5 ? ((y - y0) % 2 === 0 ? bot[i] : PANEL[1]) : bot[i];
      img.set(x0 + i, y, studL);
      img.set(x1 - i, y, studR);
    }
  }
  // Panel: one darker row/column under the studs.
  for (let x = x0 + 7; x <= x1 - 7; x++) img.set(x, y0 + 7, PANEL[2]);
  for (let y = y0 + 7; y <= y1 - 7; y++) img.set(x0 + 7, y, PANEL[2]);
  // Corner gems: red on top, green below (his).
  studGem(img, x0 + 2, y0 + 2, 2.6, 'red');
  studGem(img, x1 - 1, y0 + 2, 2.6, 'red');
  studGem(img, x0 + 2, y1 - 1, 2.6, 'green');
  studGem(img, x1 - 1, y1 - 1, 2.6, 'green');
  return {
    name: 'bar_frame', img, group: 'action bar',
    use: 'Action bar frame: 9-slice. Rails, studded inner line, dark panel; red gems on the top corners, green below.',
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
 * resolution: a lozenge tip with a small rose jewel, a narrow neck, an openwork collar of two
 * pierced loops that widens into the plaque, and the cross-bar where the rails begin. '#' metal,
 * ':' dark fill inside the collar, 'r'/'R' the jewel.
 */
const SPEAR_TIP = [
  '................',
  '................',
  '................',
  '................',
  '.........###....',
  '........#:::#...',
  '...##...#:.:#...',
  '..#::#..#:::##..',
  '.#::::######::#.',
  '#:rR::::::::::#.',
  '#:RR::::::::::#.',
  '.#::::######::#.',
  '..#::#..#:::##..',
  '...##...#:.:#...',
  '........#:::#...',
  '.........###....',
  '................',
  '................',
  '................',
  '................',
];

export function targetBar(): Piece {
  // His plaque: a 14-row body (28 px: outline, a gold line, a dark band, the channel's silver rim
  // and the 6-row channel, and the same below). Near each end the frame swells into his flared
  // collar (20 rows at its widest) and narrows onto the spear tip: a pierced knot and a lozenge
  // with a rose jewel. The channel is a capsule with rounded ends. The centre, between the
  // 36-pixel caps, is one repeating column, so any width works.
  const W = 200, Hh = 20, cap = 36, cy = 10, ch0 = 17;
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
  const fC = sdRoundRect(ch0, 6, W - ch0, 14, 4);
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < W; x++) {
      const px = x + 0.5, py = y + 0.5, d = -fO(px, py);
      if (hb(px) < 0 || d < 0) continue;
      const top = py < cy;
      let c: RGBA = d < 1 ? METAL[0] : d < 2 ? (top ? METAL[6] : METAL[3]) : d < 2.6 && !top ? METAL[2] : PANEL[0];
      const e = -fC(px, py);
      if (e >= 0) c = e < 1 ? (top ? RAIL[5] : RAIL[3]) : PANEL[2];
      else if (e > -1 && d >= 2) c = PANEL[1];
      img.set(x, y, c);
    }
  // His inner curl line inside each flare (light, 1 pixel), mirrored top/bottom and left/right.
  const curl: Pt[] = [[15, 6], [16, 5], [17, 4], [18, 4], [19, 3], [20, 3], [21, 3], [22, 3], [23, 3], [24, 4], [25, 4], [26, 3], [26, 2]];
  for (const [x, y] of curl)
    for (const [fx, fy] of [[x, y], [W - 1 - x, y], [x, Hh - 1 - y], [W - 1 - x, Hh - 1 - y]]) img.set(fx, fy, fy < cy ? METAL[5] : METAL[4]);
  for (const flip of [false, true]) {
    const n = SPEAR_TIP[0].length, ox = flip ? W - n : 0;
    const { mk, back } = laceMap(SPEAR_TIP, flip);
    filledLace(img, mk, back, METAL, { base: 5, ox, grow: 0, backColor: PANEL[1], crevice: null });
    for (let y = 0; y < Hh; y++)
      for (let x = 0; x < n; x++) {
        const ch = SPEAR_TIP[y][flip ? n - 1 - x : x];
        if (ch === 'r') img.set(ox + x, y, GEM.red[4]);
        if (ch === 'R') img.set(ox + x, y, GEM.red[2]);
      }
  }
  return {
    name: 'target_bar', img, group: 'target bar',
    use: 'Chained plaque for the targeted or hovered enemy (or the boss): 3-slice; each 72-px cap holds his spear tip, the flared collar and the channel\'s rounded end, the centre is one repeating column (any width works). The red fill goes in the window, with its own rounded ends.',
    slice: [0, cap, 0, cap],
    window: { x: ch0 + 1, y: 7, w: W - 2 * (ch0 + 1), h: 6, shape: 'rect' },
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

/** Chain links stamped along a path: face-on rings and edge-on bars in turn (his pale gold links). */
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
  emboss(img, mk, METAL, { base: 5 });
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

export function roundMedallion(): Piece {
  const W = 36, Hh = 38, cx = 18, cy = 19;
  const img = new Img(W, Hh);
  const f = sdLp(cx, cy, 16.4, 17.4, 1.86);
  // Dark brown face, a touch lighter at the centre.
  fillShape(img, f, 0, (_x, _y, d) => BROWN[d > 7 ? 3 : d > 4 ? 2 : 1]);
  // Beaded rim.
  band(img, f, { from: 0, width: 3.2, ramp: METAL, lo: 3, hi: 7, beads: { period: 2.6, cx, cy, r: 15, depth: 0.9 } });
  isoLine(img, f, -1, METAL[0]);
  isoLine(img, f, 3, METAL[1]);
  // Gems set into the rim at the four tips: red top and left, green right and bottom (his).
  setGem(img, cx, 2.6, 1.9, 'red');
  setGem(img, 2.4, cy, 1.9, 'red');
  setGem(img, W - 2.4, cy, 1.9, 'green');
  setGem(img, cx, Hh - 2.6, 1.9, 'green');
  return {
    name: 'round_medallion', img, group: 'turn row',
    use: 'Round counter medallion ("RONDA" over the number, no box behind the word); four gems set into the rim. The chains hang from its left gem.',
    window: { x: 8, y: 9, w: 20, h: 20, shape: 'rect' },
  };
}

// --- turn row frames -----------------------------------------------------------------------------------

export function initActive(): Piece {
  const S = 22;
  const img = new Img(S, S);
  const f = sdRoundRect(0, 0, S, S, 4);
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
  // His end circle: portrait-ring sized, dark, with a thin antique-gold rim (the chain hooks on).
  const S = 19, c = 9.5;
  const img = new Img(S, S);
  const f = sdCircle(c, c, 8.6);
  fillShape(img, f, 0, (_x, _y, d) => (d > 5 ? PANEL[2] : PANEL[1]));
  band(img, f, { from: 0, width: 1.6, ramp: METAL, lo: 2, hi: 5 });
  isoLine(img, f, -1, METAL[0]);
  isoLine(img, f, 1.6, PANEL[0]);
  return { name: 'init_end', img, group: 'turn row', use: 'Turn row: the dark empty circle that closes the round (the size of a portrait ring).', window: { x: 2, y: 2, w: 15, h: 15, shape: 'circle' } };
}

// --- minimap ring --------------------------------------------------------------------------------------------

/** Polar helper: a point at angle a (radians) and radius r about (c, c). */
const polar = (c: number, a: number, r: number): Pt => [c + Math.cos(a) * r, c + Math.sin(a) * r];

export function minimapRing(): Piece {
  // Measured on his frame (in art pixels about the centre): map window r 38, a thin muted gold ring
  // to 39.5, the cool silver band to 45, the gold openwork lace to 50; the four cardinal gems sit on
  // the band's outer edge in pointed lozenge bezels with side prongs; the four diagonal gems sit
  // outside the ring in square corner brackets (radius 51), which square off his silhouette.
  const S = 100, c = 50, RW = 38, RB = 39.5, R0 = 45;
  const img = new Img(S, S);
  // --- the gold openwork lace: a running scroll, one 8-pixel tile repeated round the ring ----------
  // (v = 0 is the wire on the band's edge, v = 4 the scalloped outer edge; '#' metal, ':' the dark
  // backing, '.' open).
  const TILE = [
    '########',
    '#:::##::',
    '#::#::#:',
    ':#::#:#.',
    '..##::#.',
    '.....##.',
  ];
  const N = 37;
  const lmk = new Mask(S, S), lback = new Mask(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const r = Math.hypot(x + 0.5 - c, y + 0.5 - c), v = Math.floor(r - (R0 - 0.6));
      if (v < 0 || v >= TILE.length) continue;
      const ang = (Math.atan2(y + 0.5 - c, x + 0.5 - c) + Math.PI / 2 + 4 * Math.PI) % (2 * Math.PI);
      const u = Math.floor((ang / (2 * Math.PI)) * N * 8) % 8;
      const ch = TILE[v][u];
      if (ch === '#') lmk.set(x, y);
      if (ch !== '.') lback.set(x, y);
    }
  filledLace(img, lmk, lback, METAL, { base: 5, grow: 0, backColor: METAL[2], crevice: null });
  // --- corner brackets for the diagonal gems (behind the ring) ---------------------------------------
  const corners: [number, keyof typeof GEM][] = [[-135, 'green'], [-45, 'green'], [45, 'green'], [135, 'red']];
  for (const [deg] of corners) {
    const a = (deg * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a);
    const gx = Math.floor(c + ux * 51) + 0.5, gy = Math.floor(c + uy * 51) + 0.5;
    const sx = Math.sign(ux), sy = Math.sign(uy);
    const mk = new Mask(S, S), back = new Mask(S, S);
    // A square plate with its outer corner drawn to a point, and a scroll on each inner side
    // running back into the ring's lace.
    const sq = sdRoundRect(gx - 5, gy - 5, gx + 5, gy + 5, 2);
    back.sdf((x, y) => Math.min(sq(x, y), sdLp(gx + sx * 4.8, gy + sy * 4.8, 2.4, 2.4, 1)(x, y)));
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const d = -sq(x + 0.5, y + 0.5);
        if (d >= 0 && d < 1.2) mk.set(x, y);
      }
    mk.disc(gx + sx * 5.8, gy + sy * 5.8, 1.1);
    for (const [px, py] of [[gx - sx * 7.2, gy + sy * 1.5], [gx + sx * 1.5, gy - sy * 7.2]] as Pt[]) {
      mk.taper(spiral(px, py, 2.1, 0.5, Math.atan2(gy - py, gx - px), Math.atan2(gy - py, gx - px) + Math.PI * 1.8, 20), 1.3, 1);
      back.disc(px, py, 2.6);
    }
    filledLace(img, mk, back, METAL, { base: 5, grow: 0, backColor: METAL[2], crevice: METAL[1] });
  }
  // --- the cool silver-ivory band with his fine groove ------------------------------------------------
  const fB = sdCircle(c, c, R0 - 0.3);
  band(img, fB, { from: 0, width: R0 - 0.3 - RB, ramp: SILVER, lo: 3, hi: 6, flat: 0.3 });
  isoLine(img, fB, 0, METAL[1], 0.7);
  isoLine(img, fB, 1.3, SILVER[3], 0.7);
  // --- the thin muted gold inner ring --------------------------------------------------------------
  const fI = sdCircle(c, c, RB);
  isoLine(img, fI, 0, METAL[1], 0.6);
  isoLine(img, fI, 0.6, METAL[3], 0.8);
  isoLine(img, fI, 1.4, METAL[1], 0.6);
  // --- gems ------------------------------------------------------------------------------------------
  for (const [deg, col] of corners) {
    const a = (deg * Math.PI) / 180;
    const gx = Math.floor(c + Math.cos(a) * 51) + 0.5, gy = Math.floor(c + Math.sin(a) * 51) + 0.5;
    band(img, sdCircle(gx, gy, 4.2), { from: 0, width: 1.3, ramp: METAL, lo: 2, hi: 7 });
    gem(img, gx, gy, 2.8, GEM[col], false);
  }
  const cardinal: [number, keyof typeof GEM][] = [[-90, 'green'], [0, 'green'], [90, 'red'], [180, 'green']];
  for (const [deg, col] of cardinal) {
    const a = (deg * Math.PI) / 180;
    const ux = Math.cos(a), uy = Math.sin(a), tx = -uy, ty = ux;
    const gx = Math.floor(c + ux * (R0 + 0.2)) + 0.5, gy = Math.floor(c + uy * (R0 + 0.2)) + 0.5;
    // Lozenge bezel, long along the radius (pointed out and in), with a prong on each side.
    const bz = new Mask(S, S);
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const dx = x + 0.5 - gx, dy = y + 0.5 - gy;
        const along = dx * ux + dy * uy, across = dx * tx + dy * ty;
        if (Math.abs(along) / 6.6 + Math.abs(across) / 4.8 <= 1) bz.set(x, y);
        if (Math.abs(across) >= 3.6 && Math.abs(across) <= 6.8 && Math.abs(along + 0.3) <= 1.2 - (Math.abs(across) - 3.6) * 0.3) bz.set(x, y);
      }
    emboss(img, bz, METAL, { base: 5 });
    gem(img, gx, gy, 2.5, GEM[col], true);
  }
  return {
    name: 'minimap_ring', img, group: 'minimap',
    use: 'Round minimap frame: gold openwork lace, cool silver band with a fine groove, thin muted gold inner ring; cardinal gems in pointed lozenge bezels, diagonal gems in square corner brackets (green, red at the lower left, as he painted them). The map shows through the round window.',
    window: { x: c - RW, y: c - RW, w: 2 * RW, h: 2 * RW, shape: 'circle' },
  };
}

// --- action bar contents ------------------------------------------------------------------------------------

/** Chamfered-square ring index: 0 on the outer edge, 1 the next ring in, ...; -1 outside. */
function chamferRing(x: number, y: number, W: number, H: number, ch: number): number {
  const dx = Math.min(x, W - 1 - x), dy = Math.min(y, H - 1 - y);
  const r = Math.min(dx, dy, dx + dy - ch);
  return r < 0 ? -1 : r;
}

export function skillSlot(active = false): Piece {
  const R = active ? GOLD : KHAKI;
  const S = 28, ch = 3;
  const img = new Img(S, S);
  // His frame: a thin khaki-silver line (gold when active) between dark lines, 45-degree chamfered
  // corners, a dark well.
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const ring = chamferRing(x, y, S, S, ch);
      if (ring < 0) continue;
      const lit = x + y < S - 1;
      img.set(x, y, ring === 0 ? PANEL[0] : ring === 1 ? (lit ? R[6] : R[4]) : ring === 2 ? PANEL[0] : PANEL[1]);
    }
  // His small curled corner brackets just inside the line (lit up-left, shaded down-right).
  const curl = ['665', '6.4', '54.'];
  const lit: Record<string, RGBA> = { '6': R[6], '5': R[5], '4': R[4] };
  const shade: Record<string, RGBA> = { '6': R[5], '5': R[4], '4': R[3] };
  stamp(img, 3, 3, curl, lit);
  stamp(img, S - 6, 3, curl, lit, true);
  stamp(img, 3, S - 6, [...curl].reverse(), shade);
  stamp(img, S - 6, S - 6, [...curl].reverse(), shade, true);
  return {
    name: active ? 'skill_slot_active' : 'skill_slot', img, group: 'action bar',
    use: active
      ? 'Skill slot, selected or hovered: the same frame in gold.'
      : 'Skill slot frame (his thin khaki-silver line, 45-degree chamfered corners with small curled brackets inside). The skill icon (painted later) goes in the window, over the corner curls.',
    slice: [6, 6, 6, 6],
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
  const f = sdRoundRect(0, 0, S, S, 3);
  const g = sdRoundRect(3, 3, S - 3, S - 3, 2);
  fillShape(img, f, 0, PANEL[2]);
  isoLine(img, f, 0, PANEL[0]);
  isoLine(img, f, 1, PANEL[4]);
  isoLine(img, g, 0, PANEL[4]);
  isoLine(img, g, 1, PANEL[0]);
  fillShape(img, g, 2, PANEL[1]);
  return {
    name: 'item_slot', img, group: 'action bar',
    use: 'Item slot, greyed (his): double faint outline, dark well; the icon and label are drawn dim.',
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

/** A hand-placed lace map: '#' is embossed metal, ':' the dark fill between the curls, '.' empty. */
function laceMap(rows: string[], flip: boolean): { mk: Mask; back: Mask } {
  const W = rows[0].length, Hh = rows.length;
  const mk = new Mask(W, Hh), back = new Mask(W, Hh);
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < W; x++) {
      const ch = rows[y][flip ? W - 1 - x : x];
      if (ch === '#') mk.set(x, y);
      if (ch !== '.') back.set(x, y);
    }
  return { mk, back };
}

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
    for (const deg of [112, 136, 160]) {
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
    for (const deg of [104, 124]) {
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
    const bx = cx + sgn * 28.4, by = cy - 5;
    const fb = sdCircle(bx, by, 5.2);
    fillShape(img, fb, 0, PANEL[2]);
    band(img, fb, { from: 0, width: 2, ramp: METAL, lo: 2, hi: 7 });
    isoLine(img, fb, -1, METAL[0]);
    img.set(Math.floor(bx) - 1, Math.floor(by), METAL[6]);
    img.set(Math.floor(bx) + 1, Math.floor(by), METAL[6]);
    img.set(Math.floor(bx), Math.floor(by) + 1, METAL[4]);
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
  studGem(img, cx, cy + 20.6, 1.9, 'green');
  return {
    name: 'medallion_active', img, group: 'crest',
    use: 'Acting character medallion: the portrait shows through the round window. Sits on the middle of the crest strip; its bottom gem rests on the bar\'s top rail.',
    window: { x: cx - 16.5, y: cy - 16.5, w: 33, h: 33, shape: 'circle' },
  };
}

// --- plaque under the bar ------------------------------------------------------------------------------------

/**
 * His lower bracket (left end of the plaque under the bar), hand-placed at art resolution: a wire
 * along the bar's underside, a double diagonal sweep down to the plaque's bottom corner, a small
 * curl and a leaf, an eye curl holding his pale stone, and the X binding by the plaque's end.
 */
const LOWER_BRACKET = [
  '########################################',
  '####:::::#:::::::::::::#:::::::#::::::::',
  '#######:#:#:####::###:::#:::::#:::::::::',
  '.....######::::::#:::#:::#:::#::::::::::',
  '........####:::::#:::#::::#:##::::::::::',
  '..........#####::#:::#::::###:::::::::::',
  '.............#####:::#:::::##:::::::::::',
  '................#####:::::#:#:::::::::::',
  '...................#####:#:::#::::::::::',
  '......................#####:::#:::::::::',
  '........................######:#::::::::',
  '...........................######:::::::',
  '..............................######::::',
  '.................................######:',
  '....................................####',
  '......................................##',
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
  for (const flip of [false, true]) {
    const { mk, back } = laceMap(LOWER_BRACKET, flip);
    filledLace(img, mk, back, METAL, { base: 5, ox: flip ? W - LOWER_BRACKET[0].length : 0, grow: 0, backColor: METAL[1], crevice: METAL[0] });
  }
  gem(img, 19.5, 5, 1.2, GEM.teal, true);
  gem(img, W - 19.5, 5, 1.2, GEM.teal, true);
  return {
    name: 'lower_plaque', img, group: 'action bar',
    use: 'Dark plaque under the action bar (3-slice): his scrolled corner brackets (eye, pale stone, X binding) and rounded capsule ends with a silver rail; for the hint line or the combat log.',
    slice: [0, cap, 0, cap],
    window: { x: end + 3, y: 1, w: W - 2 * (end + 3), h: Hh - 5, shape: 'rect' },
  };
}

// --- party frames ----------------------------------------------------------------------------------------------

export function partyFrame(): Piece {
  const W = 30, Hh = 40;
  const img = new Img(W, Hh);
  // His thin olive-gold line: a dark outline, one gold pixel (lit top and left), a dark inner line.
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < W; x++) {
      const r = Math.min(x, y, W - 1 - x, Hh - 1 - y);
      if (r === 0) img.set(x, y, OLIVE[0]);
      else if (r === 1) img.set(x, y, x === 1 || y === 1 ? (x === W - 2 || y === Hh - 2 ? OLIVE[4] : OLIVE[5]) : OLIVE[4]);
      else if (r === 2) img.set(x, y, OLIVE[1]);
    }
  // Soften the outer corners (one pixel).
  for (const [x, y] of [[0, 0], [W - 1, 0], [0, Hh - 1], [W - 1, Hh - 1]]) img.set(x, y, [0, 0, 0, 0]);
  // The bar wells under the portrait: red (HP) then green.
  img.rect(3, 28, W - 6, 1, OLIVE[2]);
  img.rect(3, 29, W - 6, 4, PANEL[0]);
  img.rect(3, 33, W - 6, 1, PANEL[1]);
  img.rect(3, 34, W - 6, 3, PANEL[0]);
  // His small curled brackets in the four inner corners: a diagonal hook out of the corner
  // with a leaf on each side (lit at the top, shaded at the bottom).
  const curl = [
    '55...',
    '5.6..',
    '.6.4.',
    '..4..',
  ];
  const pal = { '6': OLIVE[6], '5': OLIVE[5], '4': OLIVE[3] };
  const pal2 = { '6': OLIVE[5], '5': OLIVE[4], '4': OLIVE[3] };
  stamp(img, 3, 3, curl, pal);
  stamp(img, W - 8, 3, curl, pal, true);
  stamp(img, 3, Hh - 7, [...curl].reverse(), pal2);
  stamp(img, W - 8, Hh - 7, [...curl].reverse(), pal2, true);
  return {
    name: 'party_frame', img, group: 'party',
    use: 'Party portrait frame (9-slice): his thin olive-gold line with curled corner brackets; portrait window on top, two bar wells below (red HP at 3,29 4 high, green at 3,34 3 high, in art pixels).',
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
    use: 'Menu button (top left, replaces the web navigation bar in battle): his thin-rimmed dark square with a red gem set into the top rim, three bars.',
  };
}

export function smallButton(): Piece {
  const S = 12;
  const img = new Img(S, S);
  squareButton(img, 0, 0, S);
  return { name: 'button_small', img, group: 'buttons', use: 'Small square button (his, above the party frames); 9-slice with a flat centre; the trefoil emblem goes inside.', slice: [4, 4, 4, 4], window: { x: 3, y: 3, w: 6, h: 6, shape: 'rect' } };
}

export function endTurnGem(): Piece {
  const img = new Img(9, 9);
  studGem(img, 4.5, 4.5, 2.4, 'red');
  return { name: 'end_turn_gem', img, group: 'action bar', use: 'Small red gem inside the bar\'s top-right corner (his); a candidate for the end-turn control.' };
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
  right: { w: 46, h: 56, pts: qbez([44, -2], [40, 38], [2, 52], 40) as Pt[] },
  sag: { w: 58, h: 18, pts: qbez([1, 4], [26, 26], [57, 1], 40) as Pt[] },
};

export function allPieces(): Piece[] {
  const dimIcon = hex('#8a8170');
  return [
    menuButton(),
    smallButton(),
    targetBar(),
    fillBar('target_fill', RED, 6, 'Red fill for the target plaque channel (3-slice, stretch to the HP fraction).', 'target bar'),
    chainPiece('chain_left', CHAIN_PATHS.left.w, CHAIN_PATHS.left.h, CHAIN_PATHS.left.pts, 'Chain from the top edge down to the round medallion\'s left gem.'),
    chainPiece('chain_right', CHAIN_PATHS.right.w, CHAIN_PATHS.right.h, CHAIN_PATHS.right.pts, 'Chain from the top edge down to the end circle of the turn row.'),
    chainPiece('chain_sag', CHAIN_PATHS.sag.w, CHAIN_PATHS.sag.h, CHAIN_PATHS.sag.pts, 'Chain hanging under the turn row.'),
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
