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
  band, cbez, cutGem, emboss, fillShape, gem, isoLine, lace, orb, qbez, sdCircle, sdLp, sdRoundRect, spiral, stamp,
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

/** Light from the upper left, as a 2D direction (screen y down). */
const LIT: [number, number] = [-0.6, -0.8];

/**
 * Shades a rim band inside an outline given by an approximate distance field `f` (negative
 * inside): the band's pixels facing the light get the bright steps, those facing away the dark.
 */
function rimShade(img: Img, f: (x: number, y: number) => number, from: number, width: number, ramp: RGBA[], steps: number[]): void {
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const px = x + 0.5, py = y + 0.5, d = -f(px, py) - from;
      if (d < 0 || d >= width) continue;
      const e = 0.4, gx = f(px + e, py) - f(px - e, py), gy = f(px, py + e) - f(px, py - e);
      const l = Math.hypot(gx, gy) || 1;
      const lit = (gx / l) * LIT[0] + (gy / l) * LIT[1]; // +1 when the outward normal faces the light
      const t = (d + 0.5) / width; // 0 outer, 1 inner
      // Outer half follows the light, inner half is one step darker (a rounded wire).
      const k = lit > 0.35 ? 0 : lit > -0.35 ? 1 : 2;
      img.set(x, y, ramp[steps[Math.min(steps.length - 1, k + (t > 0.5 ? 1 : 0))]]);
    }
}

/** His spear-tip finial on the left end of the target plaque (mirrored for the right end). */
function spearTip(img: Img, flip: boolean, cy: number): void {
  const W = 16, Hh = img.h;
  const mk = new Mask(W, Hh);
  // The lozenge tip: point at x 0, widest at x 4.5, a short neck into the collar.
  for (let x = 0; x < 10; x++) {
    const xc = x + 0.5;
    const t = xc <= 4.5 ? xc * 0.82 : Math.max(1.2, 3.7 - (xc - 4.5) * 0.55);
    for (let y = 0; y < Hh; y++) if (Math.abs(y + 0.5 - cy) <= t) mk.set(x, y);
  }
  // The openwork collar: a loop above and below the neck, pierced.
  const holes = new Mask(W, Hh);
  for (const ly of [cy - 5.2, cy + 5.2])
    for (let y = 0; y < Hh; y++)
      for (let x = 0; x < W; x++) {
        const d = Math.hypot((x + 0.5 - 10.2) / 1.05, y + 0.5 - ly);
        if (d <= 3.1) mk.set(x, y);
        if (d <= 1.35) holes.set(x, y);
      }
  // A cross-bar binding the loops to the neck.
  for (let y = Math.floor(cy - 2); y < Math.ceil(cy + 2); y++) for (let x = 8; x <= 11; x++) mk.set(x, y);
  mk.minus(holes);
  const out = new Img(W, Hh);
  emboss(out, mk, METAL, { base: 5 });
  // His small rose-brown jewel in the lozenge.
  stamp(out, 3, Math.floor(cy) - 1, ['ab', 'bc'], { a: GEM.red[3], b: GEM.red[2], c: GEM.red[1] });
  img.draw(out, flip ? img.w - W : 0, 0, flip);
}

export function targetBar(): Piece {
  const W = 200, Hh = 20, cap = 28, cy = 10, ch0 = 16;
  const img = new Img(W, Hh);
  // Outer frame: rails 8 above and below the centre line, flaring at the ends into his collar.
  const hh = (x: number): number => {
    const u = Math.min(x, W - x); // distance from the nearer end
    if (u < 8) return -1;
    if (u < 14) return 2 + 7.2 * Math.sin(((u - 8) / 6) * (Math.PI / 2));
    if (u < 24) return 8 + 1.2 * (1 + Math.cos((Math.PI * (u - 14)) / 10)) / 2;
    return 8;
  };
  const fO = (x: number, y: number): number => {
    const h = hh(x), e = 0.5, s = (hh(x + e) - hh(x - e)) / (2 * e);
    return (Math.abs(y - cy) - h) / Math.sqrt(1 + s * s);
  };
  // The channel: a capsule with rounded ends inside the frame.
  const fC = sdRoundRect(ch0, cy - 3, W - ch0, cy + 3, 3.5);
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < W; x++) {
      const px = x + 0.5, py = y + 0.5;
      if (fO(px, py) > 0) continue;
      const e = fC(px, py);
      // Inside the frame: dark, then the channel's light ring, then the channel.
      img.set(x, y, e <= 0 ? (py < cy - 2 ? PANEL[0] : PANEL[1]) : e <= 1 ? (py < cy ? RAIL[6] : RAIL[4]) : METAL[1]);
    }
  // The gold frame band and its outline.
  rimShade(img, fO, 0, 2, METAL, [6, 5, 3, 2]);
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < W; x++) {
      const v = fO(x + 0.5, y + 0.5);
      if (v > 0 && v <= 1) img.set(x, y, METAL[0]);
    }
  spearTip(img, false, cy);
  spearTip(img, true, cy);
  return {
    name: 'target_bar', img, group: 'target bar',
    use: 'Chained plaque for the targeted or hovered enemy (or the boss): 3-slice (the centre is one repeating column); his spear-tip finials at both ends; the red fill goes in the rounded channel.',
    slice: [0, cap, 0, cap],
    window: { x: ch0, y: cy - 3, w: W - 2 * ch0, h: 6, shape: 'rect' },
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
  const f = sdLp(cx, cy, 16.2, 17.2, 1.72);
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
  const S = 98, c = 49;
  const img = new Img(S, S);
  const R0 = 42.6; // where the silver band meets the gold lace
  // --- the gold openwork rim: a running scroll (one curl per step) over a thin base wire ---------------
  const lc = new Mask(S, S);
  const N = 32;
  // Local (u along the ring, v outward from R0) to the picture.
  const at = (i: number, u: number, v: number): Pt => polar(c, ((i + u) / N) * Math.PI * 2 - Math.PI / 2, R0 + v);
  for (let i = 0; i < N; i++) {
    // A wave rising from the base wire into a curl (the classic running scroll).
    const pts: Pt[] = [];
    for (let k = 0; k <= 12; k++) {
      const t = k / 12;
      pts.push(at(i, t * 0.55, 0.6 + Math.sin(t * Math.PI * 0.9) * 3.6));
    }
    lc.stroke(pts, 1.4);
    const cu: Pt[] = [];
    for (let k = 0; k <= 16; k++) {
      const t = k / 16, a = Math.PI * (0.15 + 1.5 * t), r = 1.9 * (1 - 0.6 * t);
      cu.push(at(i, 0.62 + (Math.cos(a) * r) / ((2 * Math.PI * R0) / N), 2.7 - Math.sin(a) * r));
    }
    lc.stroke(cu, 1.2);
    // A bead on the outer edge between curls.
    const [bx, by] = at(i, 0.05, 4.6);
    lc.disc(bx, by, 0.9);
  }
  // Base wire under the scrolls.
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const r = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      if (r >= R0 - 0.2 && r < R0 + 1.2) lc.set(x, y);
    }
  // The lace is see-through between the curls (openwork): only the strokes, outlined dark.
  emboss(img, lc, METAL, { base: 5 });
  // --- cool silver-ivory band with his fine dark grooves ---------------------------------------------------
  const fIv = sdCircle(c, c, R0 - 0.2);
  band(img, fIv, { from: 0, width: 6, ramp: SILVER, lo: 3, hi: 7, flat: 0.25 });
  isoLine(img, fIv, -0.6, METAL[1], 0.6);
  isoLine(img, fIv, 1.6, SILVER[3], 0.8);
  isoLine(img, fIv, 4.4, SILVER[3], 0.7);
  // --- the thin muted gold inner ring --------------------------------------------------------------------
  const fIn = sdCircle(c, c, R0 - 6.2);
  isoLine(img, fIn, 0, METAL[1]);
  isoLine(img, fIn, 1, METAL[4]);
  isoLine(img, fIn, 2, METAL[1]);
  // --- gems: cardinal ones in pointed lozenge bezels with side prongs, diagonals round -----------------
  const gems: [number, keyof typeof GEM][] = [[-90, 'green'], [-45, 'green'], [0, 'green'], [45, 'green'], [90, 'red'], [135, 'red'], [180, 'green'], [-135, 'green']];
  for (const [deg, col] of gems) {
    const a = (deg * Math.PI) / 180;
    const ux = Math.cos(a), uy = Math.sin(a), tx = -uy, ty = ux;
    if (deg % 90 === 0) {
      const rr = R0 + 1.2;
      const gx = c + ux * rr, gy = c + uy * rr;
      // Lozenge bezel: long along the radius (pointed out and in), with two prongs on the sides.
      const bz = new Mask(S, S);
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const dx = x + 0.5 - gx, dy = y + 0.5 - gy;
          const along = dx * ux + dy * uy, across = dx * tx + dy * ty;
          if (Math.abs(along) / 7.6 + Math.abs(across) / 5.2 <= 1) bz.set(x, y);
          // Side prongs: small leaves pointing along the ring.
          if (Math.abs(across) >= 4 && Math.abs(across) <= 7.4 && Math.abs(along + 0.4) <= 1.25 - (Math.abs(across) - 4) * 0.3) bz.set(x, y);
        }
      emboss(img, bz, METAL, { base: 5 });
      gem(img, Math.floor(gx) + 0.5, Math.floor(gy) + 0.5, 2.5, GEM[col], true);
    } else {
      const rr = R0 + 0.6;
      const gx = Math.floor(c + ux * rr) + 0.5, gy = Math.floor(c + uy * rr) + 0.5;
      const bz = new Mask(S, S);
      bz.disc(gx, gy, 4.1);
      // Two little leaf curls hugging the bezel along the ring.
      for (const sg of [-1, 1]) bz.stroke([[gx + tx * sg * 3.4 + ux * 1.6, gy + ty * sg * 3.4 + uy * 1.6], [gx + tx * sg * 5.6 + ux * 0.4, gy + ty * sg * 5.6 + uy * 0.4]], 1.2);
      emboss(img, bz, METAL, { base: 5 });
      gem(img, gx, gy, 2.3, GEM[col], true);
    }
  }
  return {
    name: 'minimap_ring', img, group: 'minimap',
    use: 'Round minimap frame: gold openwork rim, cool silver band with fine grooves, thin muted gold inner ring, eight gems (pointed bezels N/E/S/W). The map shows through the round window.',
    window: { x: c - 36, y: c - 36, w: 72, h: 72, shape: 'circle' },
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
  // His small corner notches: a light tick and a dark step inside each chamfer.
  for (const [cx, cy, sx, sy] of [[3, 3, 1, 1], [S - 4, 3, -1, 1], [3, S - 4, 1, -1], [S - 4, S - 4, -1, -1]] as const) {
    const lit = sx + sy > 0 || (sx > 0 && sy < 0) || (sx < 0 && sy > 0);
    img.set(cx, cy, lit && !(sx < 0 && sy < 0) ? R[5] : R[3]);
    img.set(cx + sx, cy, PANEL[0]);
    img.set(cx, cy + sy, PANEL[0]);
  }
  return {
    name: active ? 'skill_slot_active' : 'skill_slot', img, group: 'action bar',
    use: active
      ? 'Skill slot, selected or hovered: the same frame in gold.'
      : 'Skill slot frame (his thin khaki-silver chamfered square with corner notches). The skill icon (painted later) goes in the window.',
    slice: [5, 5, 5, 5],
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
      const lit = x < 5 || y < 3;
      img.set(x, y, edge ? SILVER[0] : rim ? (lit && y < 8 ? SILVER[6] : SILVER[4]) : PANEL[2]);
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
  const img = new Img(11, 11);
  if (color === 'spent') {
    orb(img, 1, 1, [PANEL[0], PANEL[1], PANEL[2], PANEL[3], PANEL[4], PANEL[5]]);
  } else {
    // A faint glow ring, then his smooth glossy orb.
    const ramp = GEM[color];
    for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) if (Math.hypot(x + 0.5 - 5.5, y + 0.5 - 5.5) <= 5.6) img.set(x, y, alpha(ramp[2], 80));
    orb(img, 1, 1, ramp);
  }
  return { name, img, group: 'action bar', use };
}

export function moveTrough(): Piece {
  const W = 24, Hh = 6;
  const img = new Img(W, Hh);
  stamp(img, 0, 0, [
    '.oo' + 'o'.repeat(W - 6) + 'oo.',
    'o4' + '1'.repeat(W - 4) + '3o',
    'o3' + '0'.repeat(W - 4) + '2o',
    'o3' + '0'.repeat(W - 4) + '2o',
    'o2' + '1'.repeat(W - 4) + '2o',
    '.oo' + 'o'.repeat(W - 6) + 'oo.',
  ], { o: METAL[0], '0': PANEL[0], '1': PANEL[1], '2': METAL[3], '3': METAL[4], '4': METAL[6] });
  return { name: 'move_trough', img, group: 'action bar', use: 'Movement bar trough (3-slice); the teal fill goes inside (2 pixels in from each end, 1 from top and bottom).', slice: [0, 3, 0, 3], window: { x: 2, y: 1, w: W - 4, h: 4, shape: 'rect' } };
}

export function chakraGem(color: 'red' | 'orange' | 'blue' | 'empty'): Piece {
  const img = new Img(9, 10);
  cutGem(img, 0, 0, color === 'empty' ? [PANEL[0], PANEL[1], PANEL[2], PANEL[3], PANEL[4], PANEL[4]] : GEM[color]);
  return { name: `chakra_${color}`, img, group: 'crest', use: color === 'empty' ? 'Spent chakra gem (dark socket), on the chakra line.' : `Chakra gem (${color}): his compact round-cut gem, threaded on the chakra line.` };
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
 * His crest shoulder (left end): a C-scroll rising from the rail around the trough's rounded end,
 * curling over its top into a leaf with a knob; three inner curls; a long sweep down to the rail
 * with a big curl (a pale teal bead in its eye) and two small knobs at the tip. Strokes are 2-3
 * art pixels, embossed over a dark backing so the cluster reads dense, like his.
 */
function crestShoulder(W: number, Hh: number): { mk: Mask; bead: Pt } {
  const mk = new Mask(W, Hh);
  // The C-scroll hugging the trough's end, from the rail up and over.
  mk.taper(cbez([41, 23.6], [32.5, 22.4], [29.2, 10], [35, 4.4]), 2.8, 2.3);
  mk.taper(cbez([35, 4.4], [38.6, 1.2], [44.6, 1.2], [48, 4]), 2.3, 1.5);
  mk.disc(49, 5, 1.35);
  // A leaf off the top of the C, pointing back out.
  mk.taper(qbez([33.4, 4.6], [30, 1.4], [27.2, 2.6]), 1.8, 1);
  // Inner curls inside the C.
  mk.taper(spiral(35.7, 8.6, 2.5, 0.6, -Math.PI * 0.55, -Math.PI * 2.3, 30), 1.6, 1);
  mk.taper(spiral(35.4, 15.2, 2.3, 0.5, Math.PI * 0.6, Math.PI * 2.4, 30), 1.6, 1);
  mk.taper(spiral(37.4, 20.6, 1.7, 0.4, -Math.PI * 0.9, Math.PI * 0.8, 24), 1.4, 1);
  // The long sweep down to the rail.
  mk.taper(cbez([31.6, 12], [24.5, 8.4], [16.6, 11.6], [13.2, 18]), 2.7, 2.1);
  mk.taper(qbez([13.2, 18], [10.8, 22.6], [3.6, 22.6]), 2.1, 1.5);
  mk.disc(2, 21.4, 1.5);
  // A small knob on a stem.
  mk.taper([[8.6, 22.6], [8.6, 19.4]], 1.4, 1.2);
  mk.disc(8.6, 18.6, 1.25);
  // The big curl under the sweep (its eye holds the bead).
  mk.taper(spiral(23.2, 18.4, 4.4, 2.3, -Math.PI * 0.95, Math.PI * 0.85, 40), 2, 1.4);
  // Feet of the cluster on the rail.
  mk.taper([[14, 23.5], [33, 23.5]], 1.4, 1.4);
  return { mk, bead: [23.2, 18.4] };
}

export function crestStrip(): Piece {
  const W = 112, Hh = 24, cap = 52, capL = 39, sTop = 7;
  const img = new Img(W, Hh);
  // The shoulders first; the trough lies over their inner ends.
  const { mk, bead } = crestShoulder(cap, Hh);
  lace(img, mk, METAL, { close: 2.2 });
  lace(img, mk.flipX(), METAL, { close: 2.2, ox: W - cap });
  gem(img, bead[0], bead[1], 1.5, GEM.teal, true);
  gem(img, W - bead[0], bead[1], 1.5, GEM.teal, true);
  // The trough: a capsule with his rounded ends whose bottom is the bar's top rail.
  const f = sdRoundRect(capL, sTop, W - capL, Hh + 2, 9.5);
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < W; x++) {
      const d = -f(x + 0.5, y + 0.5);
      if (d < -1) continue;
      let c: RGBA;
      if (d < 0) c = METAL[0];
      else if (d < 2) continue; // the rail, banded below
      else if (d < 3) c = PANEL[0];
      else if (d < 4) c = (x + y) % 2 === 0 ? RAIL[4] : PANEL[0];
      else if (d < 5) c = PANEL[1];
      else c = PANEL[2];
      img.set(x, y, c);
    }
  // His double light rail: a rounded silver wire, then the dotted line inside it (above).
  band(img, f, { from: 0, width: 2, ramp: RAIL, lo: 2, hi: 6, flat: 0 });
  return {
    name: 'crest_strip', img, group: 'crest',
    use: 'Raised crest over the action bar (3-slice; centre repeats every 2 art pixels): the HP trough on the left, the chakra trough on the right, both with his rounded double-rail ends and scroll shoulders; the acting character medallion covers the middle.',
    slice: [0, cap, 0, cap],
    window: { x: capL + 5, y: sTop + 5, w: W - 2 * (capL + 5), h: Hh - sTop - 8, shape: 'rect' },
  };
}

// --- acting character medallion -----------------------------------------------------------------------------

export function medallionActive(): Piece {
  const W = 72, Hh = 52, cx = 36, cy = 27;
  const img = new Img(W, Hh);
  // His filigree crown and shoulders (behind the ring), drawn for the right side and mirrored.
  const mk = new Mask(W, Hh);
  for (const sgn of [-1, 1]) {
    const P = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [cx + sgn * x, y] as Pt);
    // The arch from the top gem out to the small boss, and its leafy inner scrolls.
    mk.taper(P(cbez([3.5, 4.6], [9, 1.8], [15.5, 4], [18.4, 9.6])), 2.4, 2);
    mk.taper(P(spiral(10.8, 8.2, 2.6, 0.6, -Math.PI * 0.6, Math.PI * 1.2, 30)), 1.8, 1.1);
    mk.taper(P(qbez([5.5, 8.5], [6.5, 6], [8.6, 5.6])), 1.4, 1);
    // From the small boss down and out to the big boss.
    mk.taper(P(cbez([21.6, 14.4], [24, 15.6], [25.4, 18], [25.6, 20.4])), 2.2, 2);
    // Under the big boss: a scroll curling out and down onto the crest.
    mk.taper(P(cbez([24.2, 28.4], [27.8, 31.2], [31.6, 30.6], [33.8, 33])), 2.2, 1.4);
    mk.taper(P(spiral(30.6, 32.6, 1.9, 0.5, -Math.PI * 0.2, Math.PI * 1.5, 22)), 1.3, 1);
    mk.taper(P(cbez([20, 30.5], [22, 34.5], [26.5, 36], [30, 36.4])), 1.8, 1.2);
  }
  lace(img, mk, METAL, { close: 2.4, edgeSet: false });
  // Bosses: two small ones on the arch, two big dark ones at shoulder level (his "eyes").
  for (const sgn of [-1, 1]) {
    const sx = cx + sgn * 20.4, sy = cy - 14.4;
    const fs = sdCircle(sx, sy, 3);
    fillShape(img, fs, 0, PANEL[2]);
    band(img, fs, { from: 0, width: 1.4, ramp: METAL, lo: 2, hi: 7 });
    isoLine(img, fs, -1, METAL[0]);
    const bx = cx + sgn * 28.4, by = cy - 3.4;
    const fb = sdCircle(bx, by, 5.4);
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

/** His lower bracket (left): a scrolled diagonal from the bar's rail down to the plaque's end. */
function lowerBracket(W: number, Hh: number): Mask {
  const mk = new Mask(W, Hh);
  mk.taper([[0.5, 0.6], [30, 0.6]], 1.2, 1.2); // along the bar's underside
  mk.taper(cbez([0.6, 1.2], [9, 2.4], [21, 7.4], [31.6, 14.6]), 2.2, 1.6);
  // The big curl in the triangle (its eye holds his pale stone).
  mk.taper(spiral(17.4, 5.2, 3.4, 1.8, Math.PI * 0.75, Math.PI * 2.55, 36), 1.8, 1.3);
  // The X binding near the plaque's end.
  mk.taper([[24.4, 1.2], [31.6, 10.6]], 1.6, 1.4);
  mk.taper([[31, 1.2], [25.6, 8.4]], 1.4, 1.2);
  mk.taper(spiral(8.4, 2.6, 1.5, 0.4, Math.PI * 0.5, Math.PI * 2.2, 18), 1.2, 1);
  return mk;
}

export function lowerPlaque(): Piece {
  const W = 88, Hh = 16, cap = 40, end = 31;
  const img = new Img(W, Hh);
  const br = lowerBracket(cap, Hh);
  lace(img, br, METAL, { close: 1.8 });
  lace(img, br.flipX(), METAL, { close: 1.8, ox: W - cap });
  // The pale stones in the curls' eyes.
  gem(img, 17.4, 5.2, 1.4, GEM.teal, true);
  gem(img, W - 17.4, 5.2, 1.4, GEM.teal, true);
  // The plaque: dark, with his rounded ends and a silver rail along the bottom; its top is the
  // bar's bottom rail.
  const f = sdRoundRect(end, -8, W - end, Hh, 7.5);
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < W; x++) {
      const d = -f(x + 0.5, y + 0.5);
      if (d < -1) continue;
      img.set(x, y, d < 0 ? METAL[0] : d < 1.6 ? RAIL[3] : d < 2.6 ? PANEL[0] : mixc(PANEL[3], BROWN[1], 0.4));
    }
  band(img, f, { from: 0, width: 1.6, ramp: RAIL, lo: 2, hi: 5 });
  return {
    name: 'lower_plaque', img, group: 'action bar',
    use: 'Dark plaque under the action bar with his scrolled corner brackets and rounded ends (3-slice); for the hint line or the combat log.',
    slice: [0, cap, 0, cap],
    window: { x: end + 4, y: 1, w: W - 2 * (end + 4), h: Hh - 5, shape: 'rect' },
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
      else if (r === 1) img.set(x, y, x === 1 || y === 1 ? (x === W - 2 || y === Hh - 2 ? OLIVE[4] : OLIVE[6]) : OLIVE[4]);
      else if (r === 2) img.set(x, y, OLIVE[1]);
    }
  // Soften the outer corners (one pixel).
  for (const [x, y] of [[0, 0], [W - 1, 0], [0, Hh - 1], [W - 1, Hh - 1]]) img.set(x, y, [0, 0, 0, 0]);
  // The bar wells under the portrait: red (HP) then green.
  img.rect(3, 28, W - 6, 1, OLIVE[2]);
  img.rect(3, 29, W - 6, 4, PANEL[0]);
  img.rect(3, 33, W - 6, 1, PANEL[1]);
  img.rect(3, 34, W - 6, 3, PANEL[0]);
  // His curled L brackets in the four inner corners.
  const curl = [
    '6665.',
    '6..4.',
    '6.54.',
    '544..',
    '.....',
  ];
  const pal = { '6': OLIVE[6], '5': OLIVE[5], '4': OLIVE[4] };
  const pal2 = { '6': OLIVE[5], '5': OLIVE[4], '4': OLIVE[3] };
  stamp(img, 3, 3, curl, pal);
  stamp(img, W - 8, 3, curl, pal, true);
  stamp(img, 3, Hh - 8, [...curl].reverse(), pal2);
  stamp(img, W - 8, Hh - 8, [...curl].reverse(), pal2, true);
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
  const S = 20;
  const img = new Img(S, S + 2);
  squareButton(img, 0, 2, S);
  // Three bars.
  const mk = new Mask(S, S + 2);
  for (const y of [9, 12, 15]) for (let x = 6; x <= 13; x++) mk.set(x, y);
  emboss(img, mk, SILVER, { base: 5 });
  // The red gem set into the top of the rim.
  setGem(img, S / 2, 3, 2, 'red');
  return {
    name: 'menu_button', img, group: 'buttons',
    use: 'Menu button (top left, replaces the web navigation bar in battle): his thin-rimmed square with a red gem set into the top of the frame, three bars.',
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
  emblem: [
    '.#.#.#.',
    '.#####.',
    '#.###.#',
    '.#####.',
    '..###..',
    '...#...',
  ],
};

export function glyphPiece(key: keyof typeof GLYPHS, color: RGBA, use: string): Piece {
  const rows = GLYPHS[key];
  const img = new Img(rows[0].length, rows.length);
  stamp(img, 0, 0, rows, { '#': color });
  return { name: `glyph_${key}`, img, group: 'glyphs', use };
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
    fillBar('hp_fill', RED, 5, 'Red HP fill in the crest strip\'s left half (3-slice).', 'crest'),
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
    glyphPiece('emblem', METAL[6], 'Small gold emblem for the small button.'),
  ];
}
