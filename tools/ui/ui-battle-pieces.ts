// The battle UI pieces, rebuilt as clean pixel art from the owner's picture
// (docs/reference/ui-battle-owner-reference.jpg). Every piece is drawn here in ART pixels; the
// generator (ui-battle-kit.ts) doubles each art pixel when it writes the PNGs, so the pieces sit
// at the screen scale of a 1600x900 window with his chunky 2-pixel look.
//
// Sizes follow his picture times 1600/1024 = 1.5625 (so his 1-pixel detail is about one art
// pixel). Frames that stretch are 9-slice (or 3-slice) images; their insets are in art pixels.

import { Img, RGBA, alpha, hex, mixc } from './ui-img';
import {
  ALLY, BADGE, BRONZE, BROWN, FOE, GEM, GOLD, GREEN, IVORY, METAL, Mask, PANEL, Pt, RED, TEAL,
  band, cbez, diamondGem, emboss, fillShape, gem, isoLine, qbez, sdCircle, sdLp, sdRoundRect, spiral, stamp,
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
  // From the outside in.
  const studs = IVORY[4];
  return dir === 'top'
    ? [METAL[0], IVORY[6], IVORY[4], IVORY[2], PANEL[0], studs, PANEL[1]]
    : [METAL[0], IVORY[2], IVORY[3], IVORY[5], PANEL[0], studs, PANEL[1]];
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

/** Left end ornament of the target plaque: arrow tip, two scrolls and a collar (his). */
function plaqueEnd(img: Img, flip: boolean): void {
  const W = 20;
  const mk = new Mask(W, 16);
  const X = (x: number) => (flip ? W - x : x);
  const P = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [X(x), y]);
  // Arrow tip.
  for (let x = 0; x <= 4; x++) for (let y = 8 - Math.floor(x / 1.5); y <= 7 + Math.floor(x / 1.5) + 1; y++) mk.set(flip ? W - 1 - x : x, y);
  // Upper and lower C-scrolls curling back toward the bar.
  mk.stroke(P(spiral(8.5, 5.2, 1.0, 3.6, Math.PI * 0.2, Math.PI * 1.75, 30)));
  mk.stroke(P(spiral(8.5, 10.8, 1.0, 3.6, -Math.PI * 0.2, -Math.PI * 1.75, 30)));
  // Long tendrils along the rails.
  mk.stroke(P(qbez([10, 1.5], [14, 0.5], [19.5, 2.5])));
  mk.stroke(P(qbez([10, 14.5], [14, 15.5], [19.5, 13.5])));
  // Knot at the middle and the collar.
  mk.stroke(P([[4.5, 8], [8, 8]]));
  for (let y = 3; y <= 12; y++) {
    mk.set(flip ? W - 1 - 13 : 13, y);
    mk.set(flip ? W - 1 - 14 : 14, y);
  }
  emboss(img, mk, METAL, { base: 5, ox: flip ? img.w - W : 0 });
}

export function targetBar(): Piece {
  const W = 200, Hh = 16, cap = 20;
  const img = new Img(W, Hh);
  // Rails and channel between the caps (rows 1..14).
  const rows: RGBA[] = [METAL[0], IVORY[6], IVORY[4], IVORY[2], PANEL[0], PANEL[1], PANEL[1], PANEL[1], PANEL[1], PANEL[1], PANEL[1], PANEL[0], IVORY[3], IVORY[5], IVORY[2], METAL[0]];
  for (let x = cap - 5; x < W - cap + 5; x++) for (let y = 0; y < Hh; y++) img.set(x, y, rows[y]);
  // Rounded channel ends.
  for (const [xx, d] of [[cap - 5, 1], [W - cap + 4, -1]] as const) {
    for (let y = 4; y <= 11; y++) img.set(xx, y, IVORY[3]);
    img.set(xx + d, 4, IVORY[4]);
    img.set(xx + d, 11, IVORY[2]);
  }
  plaqueEnd(img, false);
  plaqueEnd(img, true);
  return {
    name: 'target_bar', img, group: 'target bar',
    use: 'Chained plaque for the targeted or hovered enemy (or the boss): 3-slice; the red fill goes in the channel.',
    slice: [0, cap, 0, cap],
    window: { x: cap - 4, y: 5, w: W - 2 * cap + 8, h: 6, shape: 'rect' },
  };
}

/** A red fill strip (3-slice: rounded 2-pixel ends). */
export function fillBar(name: string, ramp: RGBA[], h: number, use: string, group: string): Piece {
  const W = 16;
  const img = new Img(W, h);
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    const k = h <= 4 ? [4, 3, 2, 1][Math.min(3, y)] : t < 0.2 ? 5 : t < 0.45 ? 4 : t < 0.75 ? 3 : t < 0.95 ? 2 : 1;
    for (let x = 0; x < W; x++) img.set(x, y, ramp[k]);
  }
  // Rounded ends: clip the corner pixels; a darker last column.
  for (const x of [0, W - 1]) {
    img.set(x, 0, [0, 0, 0, 0]);
    img.set(x, h - 1, [0, 0, 0, 0]);
  }
  for (let y = 1; y < h - 1; y++) img.set(W - 1, y, ramp[Math.max(1, (h <= 4 ? 2 : 2))]);
  return { name, img, group, use, slice: [0, 2, 0, 2] };
}

// --- chains -------------------------------------------------------------------------------------------

/** Chain links stamped along a path: face-on rings and edge-on bars in turn (his pale gold links). */
export function chainAlong(img: Img, pts: Pt[], pitch = 3.4): void {
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
          const q = (u / 2.6) ** 2 + (v / 1.75) ** 2;
          if (q <= 1) mk.set(x, y);
          if ((u / 1.2) ** 2 + (v / 0.6) ** 2 <= 1) holes.set(x, y);
        }
    } else {
      // Edge-on link: a short bar.
      mk.stroke([[p[0] - d[0] * 2, p[1] - d[1] * 2], [p[0] + d[0] * 2, p[1] + d[1] * 2]]);
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

export function roundMedallion(): Piece {
  const W = 36, Hh = 40, cx = 18, cy = 20;
  const img = new Img(W, Hh);
  const f = sdLp(cx, cy, 15.5, 16.5, 1.55);
  // Dark brown face, a touch lighter at the centre.
  fillShape(img, f, 0, (x, y, d) => BROWN[d > 7 ? 3 : d > 4 ? 2 : 1]);
  // Beaded rim.
  band(img, f, { from: 0, width: 3, ramp: METAL, lo: 2, hi: 7, beads: { period: 2.6, cx, cy, r: 15, depth: 0.9 } });
  isoLine(img, f, -1, METAL[0]);
  isoLine(img, f, 3, METAL[1]);
  // Gems at the four tips: red top and left, green right and bottom (his).
  studGem(img, cx, 3.2, 2.4, 'red');
  studGem(img, 2.6, cy, 2.4, 'red');
  studGem(img, W - 2.6, cy, 2.4, 'green');
  studGem(img, cx, Hh - 3.2, 2.4, 'green');
  return {
    name: 'round_medallion', img, group: 'turn row',
    use: 'Round counter medallion ("RONDA" over the number); four gem tips. The chains hang from its left gem.',
    window: { x: 8, y: 10, w: 20, h: 20, shape: 'rect' },
  };
}

// --- turn row frames -----------------------------------------------------------------------------------

export function initActive(): Piece {
  const S = 22;
  const img = new Img(S, S);
  const f = sdRoundRect(0, 0, S, S, 4);
  fillShape(img, f, 2, PANEL[2]);
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
  fillShape(img, f, 1, PANEL[2]);
  // Foot: a short flared plinth with the team color.
  for (let y = 15; y <= 20; y++) {
    const inset = y <= 16 ? 4 : y === 17 ? 3 : 2;
    for (let x = inset; x < W - inset; x++) img.set(x, y, y === 15 || y === 20 ? ramp[0] : y === 16 ? ramp[1] : y === 17 ? ramp[4] : y === 18 ? ramp[3] : ramp[2]);
    img.set(inset - 1, y, ramp[0]);
    img.set(W - inset, y, ramp[0]);
  }
  band(img, f, { from: 0, width: 1.7, ramp, lo: 1, hi: 5 });
  isoLine(img, f, -1, ramp[0]);
  isoLine(img, f, 1.7, ramp[0]);
  return { name, img, group: 'turn row', use, window: { x: 2, y: 2, w: 14, h: 14, shape: 'circle' } };
}
export const initAlly = () => initBell('init_ally', ALLY, 'Turn row: an ally (round window, blue base).');
export const initEnemy = () => initBell('init_enemy', FOE, 'Turn row: an enemy (round window, red base).');

export function initEnd(): Piece {
  const W = 22, Hh = 17;
  const img = new Img(W, Hh);
  const cx = 13.5, cy = 8.5;
  const f = sdCircle(cx, cy, 7.8);
  fillShape(img, f, 0, BROWN[1]);
  band(img, f, { from: 0, width: 1.5, ramp: METAL, lo: 2, hi: 6 });
  isoLine(img, f, -1, METAL[0]);
  // The link bar that joins it to the last portrait.
  const mk = new Mask(W, Hh);
  for (let x = 0; x <= 5; x++) for (let y = 7; y <= 9; y++) mk.set(x, y);
  emboss(img, mk, METAL, { base: 4 });
  isoLine(img, f, 1.5, METAL[1]);
  return { name: 'init_end', img, group: 'turn row', use: 'Turn row: the empty circle that closes the round, with its link.', window: { x: 8, y: 3, w: 11, h: 11, shape: 'circle' } };
}

// --- minimap ring --------------------------------------------------------------------------------------------

export function minimapRing(): Piece {
  const S = 98, c = 49;
  const img = new Img(S, S);
  const R = 46;
  // Outer lace band: scalloped bead ring.
  const lace = new Mask(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - c, dy = y + 0.5 - c;
      const r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const sc = Math.cos(a * 36) * 0.9;
      if (r <= R + 1.2 + Math.max(0, sc) && r >= R - 3) lace.set(x, y);
    }
  // Holes in the lace (between scallops) for an open-work look.
  for (let i = 0; i < 36; i++) {
    const a = ((i + 0.5) / 36) * Math.PI * 2;
    lace.clear(Math.floor(c + Math.cos(a) * (R - 1.2)), Math.floor(c + Math.sin(a) * (R - 1.2)));
  }
  emboss(img, lace, METAL, { base: 4 });
  // Ivory band.
  const fIv = sdCircle(c, c, R - 3.2);
  band(img, fIv, { from: 0, width: 5.4, ramp: IVORY, lo: 2, hi: 7, flat: 0.15 });
  isoLine(img, fIv, -1, METAL[1]);
  // Inner gold ring and its dark lines.
  const fIn = sdCircle(c, c, R - 8.6);
  band(img, fIn, { from: 0, width: 2, ramp: GOLD, lo: 2, hi: 6 });
  isoLine(img, fIn, -0.6, METAL[0], 0.6);
  isoLine(img, fIn, 2, METAL[0]);
  // Gems at the eight points: green except south and south-west (red), as he painted.
  const gems: [number, keyof typeof GEM][] = [[-90, 'green'], [-45, 'green'], [0, 'green'], [45, 'green'], [90, 'red'], [135, 'red'], [180, 'green'], [-135, 'green']];
  for (const [deg, col] of gems) {
    const a = (deg * Math.PI) / 180;
    const rr = deg % 90 === 0 ? R - 0.5 : R - 1.5;
    const gx = c + Math.cos(a) * rr, gy = c + Math.sin(a) * rr;
    if (deg % 90 !== 0) {
      // Diagonal gems sit in small square bezels.
      const sq = new Mask(S, S);
      for (let y = -4; y <= 3; y++) for (let x = -4; x <= 3; x++) sq.set(Math.floor(gx) + x, Math.floor(gy) + y);
      emboss(img, sq, METAL, { base: 4 });
    }
    studGem(img, Math.floor(gx) + 0.5, Math.floor(gy) + 0.5, 2.4, col);
  }
  return {
    name: 'minimap_ring', img, group: 'minimap',
    use: 'Round minimap frame: lace rim, ivory band, gold inner ring, eight gems. The map shows through the round window.',
    window: { x: c - 37, y: c - 37, w: 74, h: 74, shape: 'circle' },
  };
}

// --- action bar contents ------------------------------------------------------------------------------------

export function skillSlot(): Piece {
  const S = 28;
  const img = new Img(S, S);
  // Chamfered square (2-pixel corners), bronze line with a dark outline, dark well.
  const ch = 3;
  const inside = (x: number, y: number, inset: number) => {
    const lo = inset, hi = S - 1 - inset;
    if (x < lo || y < lo || x > hi || y > hi) return false;
    const dx = Math.min(x - lo, hi - x), dy = Math.min(y - lo, hi - y);
    return dx + dy >= ch - inset * 0.5 - 0.01 || inset >= ch;
  };
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      if (!inside(x, y, 0)) continue;
      const ring = !inside(x, y, 1) ? 0 : !inside(x, y, 2) ? 1 : !inside(x, y, 3) ? 2 : 3;
      const lit = x + y < S - 1; // upper-left half
      const c = ring === 0 ? BRONZE[0] : ring === 1 ? (lit ? BRONZE[6] : BRONZE[4]) : ring === 2 ? BRONZE[1] : PANEL[1];
      img.set(x, y, c);
    }
  // A faint inner bevel on the well.
  for (let i = 3; i < S - 3; i++) {
    if (img.get(i, 3)[3]) img.set(i, 3, PANEL[0]);
    if (img.get(3, i)[3]) img.set(3, i, PANEL[0]);
  }
  return {
    name: 'skill_slot', img, group: 'action bar',
    use: 'Skill slot frame (his chamfered bronze square). The skill icon (painted later) goes in the window.',
    slice: [5, 5, 5, 5],
    window: { x: 3, y: 3, w: 22, h: 22, shape: 'rect' },
  };
}

export function skillTag(): Piece {
  const W = 11, Hh = 10;
  const img = new Img(W, Hh);
  stamp(img, 0, 0, [
    '..ooooooo..',
    '.o6666665o.',
    'o6411111140',
    'o6111111130',
    'o6111111130',
    'o6111111130',
    'o5111111130',
    'o5111111130',
    'o4333333330',
    'ooooooooooo',
  ], { o: BRONZE[0], '0': BRONZE[0], '1': PANEL[2], '3': BRONZE[3], '4': BRONZE[4], '5': BRONZE[5], '6': BRONZE[6] });
  return { name: 'skill_tag', img, group: 'action bar', use: 'Number tag over a skill slot (the slot number in the label font).', window: { x: 2, y: 2, w: 7, h: 6, shape: 'rect' } };
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
  const img = new Img(8, 8);
  gem(img, 4, 4, 3.2, BADGE, true);
  return { name: 'item_badge', img, group: 'action bar', use: 'Blue count badge on an item slot (the count in the label font, white).' };
}

export function pip(name: string, color: keyof typeof GEM | 'spent', use: string): Piece {
  const img = new Img(11, 11);
  if (color === 'spent') {
    gem(img, 5.5, 5.5, 4.2, [PANEL[0], PANEL[1], PANEL[2], PANEL[3], PANEL[4], PANEL[5]], true);
  } else {
    // A soft glow ring, then the orb.
    const ramp = GEM[color];
    for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) if (Math.hypot(x + 0.5 - 5.5, y + 0.5 - 5.5) <= 5.6) img.set(x, y, alpha(ramp[2], 110));
    gem(img, 5.5, 5.5, 4.2, ramp, true);
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
  const img = new Img(9, 11);
  if (color === 'empty') {
    diamondGem(img, 4.5, 5.5, 7, 9, [PANEL[0], PANEL[1], PANEL[2], PANEL[3], PANEL[4], PANEL[4]]);
  } else diamondGem(img, 4.5, 5.5, 7, 9, GEM[color]);
  return { name: `chakra_${color}`, img, group: 'crest', use: color === 'empty' ? 'Spent chakra gem (socket).' : `Chakra gem (${color}).` };
}

// --- crest: HP strip, chakra strip and their scrolls ------------------------------------------------------

/** The scrollwork on the crest's end: a volute rising off the strip end and sweeping down to the bar rail. */
function crestScroll(): Mask {
  const W = 30, Hh = 26;
  const mk = new Mask(W, Hh);
  // Main volute: from the strip end up and over into a curl.
  mk.stroke(cbez([22, 12], [18, 4], [11, 2], [8, 6]), 1);
  mk.stroke(spiral(10.6, 7.6, 3.2, 0.8, Math.PI * 1.05, Math.PI * 2.7, 30), 1);
  // Lower sweep down to the rail with a small curl at its foot.
  mk.stroke(cbez([21, 15], [14, 16], [7, 19], [2, 24]), 1);
  mk.stroke(cbez([21, 18], [15, 19], [10, 21], [5, 25]), 1);
  mk.stroke(spiral(5.2, 21.2, 2.2, 0.6, Math.PI * 0.7, Math.PI * 2.4, 20), 1);
  // Beads.
  mk.disc(15.5, 9.5, 1.1);
  mk.disc(3.5, 15.5, 1);
  mk.disc(13.5, 20.5, 0.9);
  return mk;
}

export function crestStrip(): Piece {
  const W = 72, Hh = 26, cap = 30, sTop = 9;
  const img = new Img(W, Hh);
  const sh = Hh - sTop; // 17 rows
  // Strip body between the rounded ends.
  const f = sdRoundRect(cap - 8, sTop, W - cap + 8, Hh + 6, 7);
  fillShape(img, f, 0, PANEL[2]);
  band(img, f, { from: 0, width: 3, ramp: IVORY, lo: 2, hi: 7, flat: 0.25 });
  isoLine(img, f, -1, METAL[0]);
  isoLine(img, f, 3, PANEL[0]);
  // Studded line.
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < W; x++) {
      const d = -f(x + 0.5, y + 0.5);
      if (d >= 4 && d < 5 && (x + y) % 2 === 0) img.set(x, y, IVORY[4]);
      else if (d >= 4 && d < 5) img.set(x, y, PANEL[1]);
    }
  // Scrolls on both ends.
  const sc = crestScroll();
  emboss(img, sc, METAL, { base: 5 });
  emboss(img, sc.flipX(), METAL, { base: 5, ox: W - sc.w });
  void sh;
  return {
    name: 'crest_strip', img, group: 'crest',
    use: 'Raised strip over the action bar (3-slice): the HP bar sits in its left half, the chakra gems in its right half; the acting character medallion covers the middle. Scrollwork at both ends.',
    slice: [0, cap, 0, cap],
    window: { x: cap - 2, y: sTop + 6, w: W - 2 * cap + 4, h: 7, shape: 'rect' },
  };
}

// --- acting character medallion -----------------------------------------------------------------------------

export function medallionActive(): Piece {
  const W = 62, Hh = 52, cx = 31, cy = 27;
  const img = new Img(W, Hh);
  // Filigree wings and side bosses (behind the ring).
  const mk = new Mask(W, Hh);
  for (const s of [-1, 1]) {
    const X = (x: number) => cx + s * x;
    mk.stroke([[X(19), 14], [X(23), 10], [X(27), 10], [X(29), 13]].map(([x, y]) => [x, y] as Pt), 1);
    mk.stroke(cbez([X(18), 31], [X(24), 34], [X(28), 38], [X(29), 44]), 1);
    mk.stroke(spiral(X(26.2), 41, 2.3, 0.6, s > 0 ? Math.PI * 1.1 : -Math.PI * 0.1, s > 0 ? Math.PI * 2.8 : -Math.PI * 1.8, 20), 1);
    mk.stroke(cbez([X(19), 24], [X(23), 25], [X(27), 27], [X(30), 31]), 1);
  }
  emboss(img, mk, METAL, { base: 5 });
  for (const s of [-1, 1]) {
    // Round boss with a dark socket and two pale dots (his little "eyes").
    const bx = cx + s * 24, by = 17;
    const fb = sdCircle(bx, by, 4.6);
    fillShape(img, fb, 0, PANEL[2]);
    band(img, fb, { from: 0, width: 1.8, ramp: METAL, lo: 2, hi: 7 });
    isoLine(img, fb, -1, METAL[0]);
    img.set(Math.floor(bx) - 1, by, METAL[6]);
    img.set(Math.floor(bx) + 1, by, METAL[6]);
  }
  // Outer beaded ring, then the gold rim.
  const fo = sdCircle(cx, cy, 22.6);
  band(img, fo, { from: 0, width: 2.4, ramp: METAL, lo: 2, hi: 7, beads: { period: 2.5, cx, cy, r: 21.5, depth: 0.9 } });
  isoLine(img, fo, -1, METAL[0]);
  const fr = sdCircle(cx, cy, 20.2);
  band(img, fr, { from: 0, width: 3.6, ramp: GOLD, lo: 2, hi: 7, flat: 0.1 });
  isoLine(img, fr, 0, GOLD[0], 0.7);
  isoLine(img, fr, 3.6, GOLD[0]);
  // Gems: red on top (with leaf flares), green at the bottom, two tiny teal ones on the sides.
  const leaf = new Mask(W, Hh);
  leaf.stroke([[cx - 6, 5], [cx - 3, 3]], 1);
  leaf.stroke([[cx + 5, 5], [cx + 2, 3]], 1);
  emboss(img, leaf, METAL, { base: 5 });
  studGem(img, cx, 3.6, 2.6, 'red');
  studGem(img, cx, 49, 1.9, 'green');
  studGem(img, cx - 15.5, cy + 15, 1.3, 'teal');
  studGem(img, cx + 15.5, cy + 15, 1.3, 'teal');
  return {
    name: 'medallion_active', img, group: 'crest',
    use: 'Acting character medallion: the portrait shows through the round window. Sits on the middle of the crest strip.',
    window: { x: cx - 16.5, y: cy - 16.5, w: 33, h: 33, shape: 'circle' },
  };
}

// --- plaque under the bar ------------------------------------------------------------------------------------

function bracket(): Mask {
  const W = 28, Hh = 16;
  const mk = new Mask(W, Hh);
  // Triangle bracket hanging under the rail, an eye in the middle and crossing scrolls (his).
  mk.stroke([[0, 0.5], [27, 0.5]], 1);
  mk.stroke(cbez([1, 1], [6, 6], [14, 11], [24, 14.5]), 1);
  mk.stroke(cbez([27, 2], [24, 6], [21, 10], [24, 14.5]), 1);
  mk.stroke(cbez([8, 1], [11, 6], [18, 10], [27, 12]), 1);
  // The eye.
  const eye = (x: number, y: number) => ((x + 0.5 - 13) / 4) ** 2 + ((y + 0.5 - 5.5) / 2.6) ** 2;
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) if (eye(x, y) <= 1 && eye(x, y) > 0.38) mk.set(x, y);
  mk.stroke(spiral(5.5, 4, 1.8, 0.5, Math.PI * 0.6, Math.PI * 2.4, 16), 1);
  return mk;
}

export function lowerPlaque(): Piece {
  const W = 80, Hh = 16, cap = 30;
  const img = new Img(W, Hh);
  const f = sdRoundRect(cap - 6, 1, W - cap + 6, Hh - 1, 4);
  fillShape(img, f, 0, mixc(PANEL[3], BROWN[1], 0.4));
  isoLine(img, f, -1, METAL[0]);
  isoLine(img, f, 0, PANEL[0]);
  isoLine(img, f, 1, PANEL[4]);
  const br = bracket();
  emboss(img, br, METAL, { base: 5, ox: 1, oy: 0 });
  // The eye's dark pupil.
  img.set(14, 5, GEM.teal[1]);
  img.set(13, 5, GEM.teal[2]);
  const fl = br.flipX();
  emboss(img, fl, METAL, { base: 5, ox: W - fl.w - 1, oy: 0 });
  img.set(W - 15, 5, GEM.teal[1]);
  img.set(W - 14, 5, GEM.teal[2]);
  return {
    name: 'lower_plaque', img, group: 'action bar',
    use: 'Dark plaque under the action bar with corner brackets (3-slice); for the hint line or the combat log.',
    slice: [0, cap, 0, cap],
    window: { x: cap - 4, y: 3, w: W - 2 * cap + 8, h: Hh - 6, shape: 'rect' },
  };
}

// --- party frames ----------------------------------------------------------------------------------------------

export function partyFrame(): Piece {
  const W = 30, Hh = 40;
  const img = new Img(W, Hh);
  const f = sdRoundRect(0, 0, W, Hh, 1.5);
  fillShape(img, f, 0, PANEL[2]);
  // Thin olive-gold double line (his) with dark outline.
  isoLine(img, f, 0, METAL[0]);
  band(img, sdRoundRect(1, 1, W - 1, Hh - 1, 1), { from: 0, width: 2, ramp: METAL, lo: 2, hi: 6, flat: 0.3 });
  isoLine(img, sdRoundRect(1, 1, W - 1, Hh - 1, 1), 2, METAL[1]);
  // Corner notches: little L ornaments just inside each corner.
  const notch = ['66.', '6..', '...'];
  stamp(img, 3, 3, notch, { '6': METAL[6] });
  stamp(img, W - 6, 3, notch, { '6': METAL[6] }, true);
  stamp(img, 3, Hh - 6, [...notch].reverse(), { '6': METAL[5] });
  stamp(img, W - 6, Hh - 6, [...notch].reverse(), { '6': METAL[5] }, true);
  // Bar wells under the portrait: red (HP) then green.
  const bars = [[29, 3], [33, 3]];
  for (const [y, h] of bars) {
    img.rect(3, y, W - 6, h, PANEL[0]);
  }
  img.rect(3, 28, W - 6, 1, METAL[1]);
  return {
    name: 'party_frame', img, group: 'party',
    use: 'Party portrait frame (9-slice): portrait window on top, two bar wells below (red HP, then green).',
    slice: [5, 5, 13, 5],
    window: { x: 3, y: 3, w: W - 6, h: 25, shape: 'rect' },
  };
}

// --- buttons ---------------------------------------------------------------------------------------------------

function squareButton(img: Img, x0: number, y0: number, S: number): void {
  const f = sdRoundRect(x0, y0, x0 + S, y0 + S, 2);
  fillShape(img, f, 0, PANEL[2]);
  band(img, f, { from: 0, width: 2.2, ramp: METAL, lo: 2, hi: 7, flat: 0.25 });
  isoLine(img, f, 0, METAL[0], 0.8);
  isoLine(img, f, 2.2, METAL[0]);
  fillShape(img, f, 3.2, (x, y) => (y - y0 < S / 2 ? PANEL[3] : PANEL[2]));
}

export function menuButton(): Piece {
  const S = 20;
  const img = new Img(S, S + 2);
  squareButton(img, 0, 2, S);
  // Three bars.
  const mk = new Mask(S, S + 2);
  for (const y of [8, 12, 16]) for (let x = 6; x <= 13; x++) mk.set(x, y);
  emboss(img, mk, IVORY, { base: 5 });
  studGem(img, S / 2, 2.6, 1.9, 'red');
  return {
    name: 'menu_button', img, group: 'buttons',
    use: 'Menu button (top left, replaces the web navigation bar in battle): bronze square, red gem, three bars.',
  };
}

export function smallButton(): Piece {
  const S = 12;
  const img = new Img(S, S);
  squareButton(img, 0, 0, S);
  return { name: 'button_small', img, group: 'buttons', use: 'Small square button (his, above the party frames); 9-slice; an emblem goes inside.', slice: [4, 4, 4, 4], window: { x: 3, y: 3, w: 6, h: 6, shape: 'rect' } };
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
    '..#####..',
    '.#.....#.',
    '#.#...#.#',
    '#..###..#',
    '#...#...#',
    '#...#...#',
    '.#..#..#.',
    '..#.#.#..',
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
    skillTag(),
    itemSlot(),
    itemBadge(),
    lowerPlaque(),
    partyFrame(),
    fillBar('party_hp_fill', RED, 3, 'Party frame HP fill (red, 3-slice).', 'party'),
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
