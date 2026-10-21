// What appears in the hands while casting, by cast style (see CastStyle in
// types.ts and the cast poses in rig.ts): runes floating before the open
// palm, a grimoire held open, or energy charged in the hands. Energy and runes
// take the character's chakra color.

import { CHAKRA_CHOICES, chakraHex } from './chakraInfo';
import { hexToRgb, mixHex } from './color';
import type { DrawCtx } from './ctx';
import { add, BOX, ellipse, F_NO_OUTLINE, fine, GRID, Layer, line, norm, PartId, partIndex, Pen, px, RES, scale, sub, v, Vec } from './raster';
import { PixelTemplate, stampTemplate, TemplatePalette } from './rotsprite';
import { armJoints } from './ctx';
import { eyeCells, faceAnchor } from './body';
import { drawLightning, drawSpiralOrb } from './items/accessories';

/** Tiny rune glyphs (3 x 5 fine pixels). */
const GLYPHS = [
  ['x.x', 'xxx', 'x.x', '.x.', '.x.'],
  ['xx.', 'x.x', 'xx.', 'x.x', 'x..'],
  ['x..', 'xx.', 'x.x', 'xx.', 'x..'],
  ['.x.', 'x.x', '.x.', 'x.x', '.x.'],
  ['xxx', '.x.', 'xxx', '.x.', '.x.'],
  ['x.x', '.x.', 'x.x', '.x.', 'x.x'],
];

/** A glowing glyph centred on `p`: bright strokes over a soft halo, never outlined. */
function glyph(L: Layer, p: Vec, k: number, pen: Pen): void {
  const rows = GLYPHS[((k % GLYPHS.length) + GLYPHS.length) % GLYPHS.length];
  const x0 = fine(p.x) - 1;
  const y0 = fine(p.y) - 2;
  const on = new Set<string>();
  rows.forEach((r, j) => [...r].forEach((ch, i) => ch === 'x' && on.add(`${x0 + i},${y0 + j}`)));
  for (const key of on) {
    const [x, y] = key.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nk = `${x + dx},${y + dy}`;
      if (!on.has(nk) && !L.has(x + dx, y + dy)) L.set(x + dx, y + dy, pen.mat, 2, pen.part, F_NO_OUTLINE);
    }
  }
  for (const key of on) {
    const [x, y] = key.split(',').map(Number);
    L.set(x, y, pen.mat, 5, pen.part, F_NO_OUTLINE);
  }
}

function palm(g: DrawCtx, s: 'N' | 'F', out: number): Vec {
  const j = armJoints(g.rig, s);
  return add(j.hand, scale(norm(sub(j.hand, j.wrist)), g.bp.handR * out));
}

/** A ring of runes turning before the open far hand, around a faint glow. */
function runes(g: DrawCtx, hex: string): void {
  const T = g.L('top');
  const pen: Pen = { mat: g.m(hex, 'glow'), part: 'handF' };
  const c = palm(g, 'F', 2.6);
  const turn = g.rig.frame * 0.35;
  for (let k = 0; k < 6; k++) {
    const a = turn + (k / 6) * Math.PI * 2;
    glyph(T, v(c.x + Math.cos(a) * 1.6, c.y + Math.sin(a) * 4.6), k + g.rig.frame, pen);
  }
  // the thin ring the runes ride on, seen edge-on, and a spark at the palm
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2;
    if (k % 3) px(T, c.x + Math.cos(a) * 1.2, c.y + Math.sin(a) * 6, { ...pen, flags: F_NO_OUTLINE }, 3);
  }
  ellipse(T, c.x - 1.6, c.y, 0.8, 0.8, { ...pen, flags: F_NO_OUTLINE }, 5);
}

/**
 * The grimoire, opened toward the caster, so the viewer sees it from outside:
 * the left cover turned away, the right one almost facing front (it carries
 * the nature's emblem), and the page tops between them. The pivot is the
 * bottom of the spine, where the fingers hold it.
 */
export const GRIMOIRE: PixelTemplate = {
  pivot: [12, 17],
  rows: [
    '.p............PPPPPPPPPPPPPpp..',
    '.ppq..........PPPPPPPPPPPPPppp.',
    '..ppqp.......PPPPPPPPPPPPPPqqq.',
    '..qppqpp.....PPPPPPPPPPppppppp.',
    '...kppqppq..PPPPPPPppppPPPPooo.',
    '...okmpqppqpPPPppppPPPPoooodgg.',
    '....kmkkqppqpppPPPPoooodddddGg.',
    '....kmkkkkppPPPoooooCdddbbbbdC.',
    '....okmkkkkkooooCdddddbbbccbdC.',
    '.....kmkkkkkoCddddbbbbbccccbdC.',
    '.....okmkkkkoCdbbbbccccccccbdC.',
    '......kmkkkkoCdbcccccccccccbdC.',
    '......okmkkkobdbcccccccccccbdC.',
    '.......kmkkkoCdbcccccccccccbdC.',
    '.......kmkkkoCdbcccccbbbbbbbdg.',
    '.......okmkkobdbbbbbbbddddddGg.',
    '........kmkkoCddddddddooooooog.',
    '........ooko.oddoooooo.........',
    '...........o.oooo..............',
  ],
};

/** The cover emblem for each chakra nature (7 x 7, 'E' bright, 'e' glow). */
const EMBLEMS: Record<string, string[]> = {
  Fire: ['...E...', '..EE...', '..EEE..', '.EEeEE.', '.EeeeE.', '.EeeeE.', '..EEE..'],
  Embers: ['...E...', '.E.E.E.', '..EEE..', 'EEEeEEE', '..EEE..', '.E.E.E.', '...E...'],
  Lightning: ['....EE.', '...EE..', '..EE...', '.EEEEE.', '...EE..', '..EE...', '.EE....'],
  Wind: ['.EE.EE.', 'EeeEeeE', 'EeeEeeE', '.EEEEE.', 'EeeEeeE', 'EeeEeeE', '.EE.EE.'],
  Water: ['...E...', '..EEE..', '..EeE..', '.EeeeE.', '.EeeeE.', '.EeeeE.', '..EEE..'],
  Shadow: ['..EEE..', '.EE....', 'EE.....', 'EE.....', 'EE.....', '.EE....', '..EEE..'],
  Spirit: ['..EEE..', '.EeeeE.', '.E.e.E.', '.EeeeE.', '.EeeeE.', '.EeEeE.', '.E.E.E.'],
  Light: ['E..E..E', '.E.E.E.', '..EEE..', 'EEEeEEE', '..EEE..', '.E.E.E.', 'E..E..E'],
  Void: ['..EEE..', '.E...E.', 'E..E..E', 'E.EEE.E', 'E..E..E', '.E...E.', '..EEE..'],
};

/**
 * The open grimoire carried at the side on the near hand, after the user's
 * example: covers tinted after the chakra, the emblem of its nature glowing
 * on the front, a glowing rim in place of the outline, and sparks rising.
 */
function grimoire(g: DrawCtx, hex: string): void {
  // over the arm, like the example; only the fingers come over it (liftHand below)
  const L = g.L('nearArm.over');
  const j = armJoints(g.rig, 'N');
  const cover = g.m(mixHex(hex, '#141018', 0.72), 'leather');
  const paper = g.m(mixHex('#f4ecd4', hex, 0.15), 'cloth');
  const glow = g.m(hex, 'glow');
  const metal = g.m('#d4a531', 'metal');
  const pal: TemplatePalette = {
    o: [cover, 0],
    k: [cover, 1],
    d: [cover, 1],
    m: [cover, 2],
    c: [cover, 2],
    C: [cover, 3],
    b: [cover, 4],
    q: [paper, 3],
    p: [paper, 4],
    P: [paper, 5],
    g: [metal, 4],
    G: [metal, 2],
  };
  // the fingers curl over the bottom of the spine
  const at = add(j.wrist, v(-0.5, -2));
  stampTemplate(L, GRIMOIRE, at, 0, pal, 'held');
  const ox = fine(at.x) - GRIMOIRE.pivot[0];
  const oy = fine(at.y) - GRIMOIRE.pivot[1];
  const nature = CHAKRA_CHOICES.find((c) => c.id === g.look.chakra.color)?.nature ?? 'Water';
  (EMBLEMS[nature] ?? EMBLEMS.Water).forEach((row, r) =>
    [...row].forEach((ch, c) => ch !== '.' && L.set(ox + 18 + c, oy + 8 + r, glow, ch === 'E' ? 5 : 3, 'held', F_NO_OUTLINE)),
  );
  // a glowing rim instead of the dark outline, and a softer halo around it
  const H = GRIMOIRE.rows.length;
  const W = GRIMOIRE.rows[0].length;
  const ring = (inside: (x: number, y: number) => boolean) => {
    const out: [number, number][] = [];
    for (let y = oy - 2; y <= oy + H + 1; y++) {
      for (let x = ox - 2; x <= ox + W + 1; x++) {
        if (inside(x, y)) continue;
        if (inside(x + 1, y) || inside(x - 1, y) || inside(x, y + 1) || inside(x, y - 1)) out.push([x, y]);
      }
    }
    return out;
  };
  const rim = ring((x, y) => L.has(x, y));
  for (const [x, y] of rim) L.set(x, y, glow, y < oy + 4 ? 4 : 3, 'held', F_NO_OUTLINE);
  const T = g.L('top');
  const f = g.rig.frame % 2;
  for (const [x, y] of ring((x, y) => L.has(x, y))) if (!T.has(x, y)) T.set(x, y, glow, 1, 'held', F_NO_OUTLINE);
  // a ribbon marker hanging from the foot of the spine
  for (let k = 0; k < 6; k++) {
    const x = ox + 14 + Math.round(k * 0.35) + (k > 3 ? f : 0);
    const y = oy + 18 + k;
    L.set(x, y, glow, k < 2 ? 2 : 3, 'held', 0);
    L.set(x + 1, y, glow, k < 2 ? 1 : 2, 'held', 0);
  }
  // sparks rising off the pages: small crosses and single motes
  const sparks = f
    ? [[3, -3, 1], [11, -6, 0], [19, -3, 1], [7, -9, 0], [24, -7, 0], [15, -11, 1], [28, -2, 0]]
    : [[5, -5, 0], [14, -3, 1], [22, -5, 0], [9, -8, 1], [26, -9, 0], [17, -12, 0], [1, -2, 0]];
  for (const [dx, dy, big] of sparks) {
    T.set(ox + dx, oy + dy, glow, 5, 'held', F_NO_OUTLINE);
    if (big) for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) T.set(ox + dx + ax, oy + dy + ay, glow, 3, 'held', F_NO_OUTLINE);
  }
  liftHand(g, L);
}

/** Moves the near hand (skin and any glove on it) onto `dest`, over what was drawn there. */
function liftHand(g: DrawCtx, dest: Layer): void {
  const hand = partIndex('handN');
  for (const d of ['nearArm.body', 'nearArm.cloth', 'nearArm.armor'] as const) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || L.part[i] !== hand) continue;
      dest.mat[i] = L.mat[i];
      dest.shade[i] = L.shade[i];
      dest.part[i] = L.part[i];
      dest.flags[i] = L.flags[i];
      dest.used = true;
      L.mat[i] = -1;
    }
  }
}

/**
 * The whirl around the pointing fingertip, copied from the example at our
 * scale ('E' bright arcs, 'e' the glow at the fingertip). The pivot is the
 * fingertip.
 */
const WHIRL: PixelTemplate = {
  pivot: [14, 11],
  rows: [
    '........EEE..............',
    '......EEEeEE....EEEEE....',
    '......EE....EE...EEEEE...',
    '.....EE...EEEEEE....EEE..',
    '.....E...EEEEEEEE...EEE..',
    '........EE...EEEEE...EE..',
    '........EE......EE..EEE..',
    '........EEE..eEeeE..EEE..',
    '.............e.eeE.EEE...',
    '...............eEeeEEE...',
    '..............EEeeEEE....',
    '............eeeeeEEe...E.',
    '.............eeeE..EEE..E',
    '.....................EE.E',
    '.....................EE..',
    '..............EEEE...EE..',
    '....................EEE..',
    '.............EEEEEEEEE...',
    '...............EEEEEE....',
    '.....E.........E....E....',
    '.....EE........EEEEEE....',
    '......EEEEEE.............',
    '.......EEEE..............',
  ],
};

/** The pointing fingertip of the grimoire pose, and the direction it points. */
function fingertip(g: DrawCtx): { tip: Vec; dir: Vec } {
  const j = armJoints(g.rig, 'F');
  const dir = norm(sub(j.hand, j.wrist));
  return { tip: add(j.wrist, scale(dir, 5.2)), dir };
}

/** Paints glow pixels (fine coords) on the top layer, leaving the pointing hand itself clear. */
function fxPainter(g: DrawCtx, hex: string, part: PartId = 'handF'): (x: number, y: number, s: number, mat?: number) => void {
  const T = g.L('top');
  const glow = g.m(hex, 'glow');
  const hand = partIndex('handF');
  const arm = [g.L('farArm.body'), g.L('farArm.cloth'), g.L('farArm.armor')];
  return (x, y, s, mat = glow) => {
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;
    const i = y * GRID + x;
    if (arm.some((L) => L.mat[i] >= 0 && L.part[i] === hand)) return;
    T.set(x, y, mat, s, part, F_NO_OUTLINE);
  };
}

/** Hue-shifted glow materials for an effect: a hot (pale, warm) core, the color itself, a deep shade. */
function fxMats(g: DrawCtx, hex: string, hot = '#fff6c8'): { glow: number; hot: number; deep: number } {
  return { glow: g.m(hex, 'glow'), hot: g.m(mixHex(hex, hot, 0.72), 'glow'), deep: g.m(mixHex(hex, '#08060c', 0.5), 'glow') };
}

/** Integer line in fine pixels. */
function finePath(x0: number, y0: number, x1: number, y1: number, fn: (x: number, y: number) => void): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) fn(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n));
}

/** A lit sphere in fine pixels (light from the upper left and the front); `ramp` maps light -1..1 to a call. */
function sphere(cx: number, cy: number, R: number, paint: (x: number, y: number, d: number, nx: number, ny: number) => void): void {
  for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++)
    for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
      const nx = (x + 0.5 - cx) / R;
      const ny = (y + 0.5 - cy) / R;
      const r2 = nx * nx + ny * ny;
      if (r2 > 1) continue;
      paint(x, y, -0.5 * nx - 0.6 * ny + 0.62 * Math.sqrt(1 - r2), nx, ny);
    }
}

/** Wind: the whirl around the fingertip turning half a turn each frame, a bright eye at its center and leaves caught in it. */
function windWhirl(g: DrawCtx, hex: string): void {
  const { tip } = fingertip(g);
  const put = fxPainter(g, hex);
  const m = fxMats(g, hex, '#f4ffe0');
  const leaf = g.m(mixHex(hex, '#d8ffb0', 0.45), 'cloth');
  const f = g.rig.frame % 2;
  const flip = f === 1;
  const tx = fine(tip.x);
  const ty = fine(tip.y);
  WHIRL.rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (row[c] === '.') continue;
      let dx = c - WHIRL.pivot[0];
      let dy = r - WHIRL.pivot[1];
      if (flip) [dx, dy] = [-dx, -dy];
      // the arcs fade from bright on their inner edge to the color outside
      const d = Math.hypot(dx, dy);
      put(tx + dx, ty + dy, row[c] === 'E' ? (d < 6 ? 5 : 4) : 3, row[c] === 'E' && d < 6 ? m.hot : m.glow);
    }
  });
  sphere(tx + 3.5, ty, 2.2, (x, y, d) => put(x, y, d > 0.5 ? 5 : 4, m.hot));
  // three leaves riding the whirl: a pointed oval with a dark vein
  const leaves = f ? [[-9, -9, 1], [10, -6, 0], [6, 11, 1]] : [[9, -10, 0], [-8, 8, 1], [12, 5, 1]];
  for (const [dx, dy, tilt] of leaves) {
    const cells = tilt ? [[0, 0], [1, 0], [1, -1], [2, -1], [0, 1]] : [[0, 0], [1, 0], [-1, 0], [0, -1], [1, 1]];
    cells.forEach(([ax, ay], i) => put(tx + dx + ax, ty + dy + ay, i === 0 ? 2 : 4, leaf));
  }
}

/** Fire: a three-tone flame (white-gold heart, orange body, the color at its edges) with side tongues and rising embers. */
function fireOrb(g: DrawCtx, hex: string): void {
  const { tip, dir } = fingertip(g);
  const put = fxPainter(g, hex);
  const m = fxMats(g, hex, '#ffe9a0');
  const mid = g.m(mixHex(hex, '#ff9a20', 0.5), 'glow');
  const f = g.rig.frame % 2;
  const cx = fine(tip.x + dir.x * 3);
  const cy = fine(tip.y + dir.y * 3);
  const flame = (bx: number, by: number, R: number, tall: number, phase: number, layer: number) => {
    for (let y = by - Math.ceil(R * tall); y <= by + R; y++) {
      for (let x = bx - R - 2; x <= bx + R + 2; x++) {
        const up = by - y;
        const w = up <= 0 ? Math.sqrt(Math.max(0, R * R - up * up)) : R * Math.max(0, 1 - up / (R * tall)) ** 0.8;
        const sway = Math.sin(up * 0.55 + phase) * 1.2 * Math.min(1, Math.max(0, up) / R);
        const dx = x + 0.5 - bx - sway;
        if (Math.abs(dx) > w) continue;
        const k = Math.hypot(dx / Math.max(1, w), (y + 0.5 - (by + R * 0.25)) / (R * 1.9));
        if (layer === 0) put(x, y, dx > w - 1.2 ? 2 : 3, m.glow); // side tongues stay in the outer color
        else if (k < 0.3) put(x, y, 5, m.hot);
        else if (k < 0.52) put(x, y, 4, m.hot);
        else if (k < 0.74) put(x, y, 4, mid);
        else put(x, y, dx > 0 && k > 0.88 ? 2 : 3, m.glow);
      }
    }
  };
  flame(cx - 4, cy + 2, 3, 2.4, 1 + f * 2.4, 0);
  flame(cx + 4, cy + 2, 3, 2.1, 2 + f * 1.8, 0);
  flame(cx, cy, 6, 3, f * 2.2, 1);
  const embers = f ? [[-3, -21, 5], [3, -24, 4], [6, -17, 4], [-6, -15, 3]] : [[2, -21, 5], [-2, -25, 4], [-6, -18, 4], [7, -14, 3]];
  for (const [dx, dy, sh] of embers) {
    put(cx + dx, cy + dy, sh, m.hot);
    put(cx + dx, cy + dy + 1, 2, m.glow);
  }
}

/** Lightning: a bright core at the fingertip and many forked bolts crackling out all around the hand, sparks at their ends. */
function boltOrb(g: DrawCtx, hex: string): void {
  const { tip, dir } = fingertip(g);
  const put = fxPainter(g, hex);
  const m = fxMats(g, hex, '#ffffff');
  const f = g.rig.frame % 2;
  const cx = fine(tip.x);
  const cy = fine(tip.y);
  const back = Math.atan2(-dir.y, -dir.x);
  let seed = 7 + f * 31;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + f * 0.31;
    const off = Math.abs(((a - back + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (off < 0.55) continue; // not back along the arm
    const len = 9 + rnd() * 7;
    let x0 = cx + Math.round(Math.cos(a) * 3);
    let y0 = cy + Math.round(Math.sin(a) * 3);
    const steps = 4;
    for (let st = 1; st <= steps; st++) {
      const r = 3 + (len * st) / steps;
      const j = (rnd() - 0.5) * 5;
      const x1 = Math.round(cx + Math.cos(a) * r - Math.sin(a) * j);
      const y1 = Math.round(cy + Math.sin(a) * r + Math.cos(a) * j);
      // thick and white near the core, thinning into the color
      finePath(x0, y0, x1, y1, (x, y) => {
        put(x, y, st < 3 ? 5 : 4, st < 3 ? m.hot : m.glow);
        if (st === 1) put(x + (Math.abs(Math.sin(a)) > 0.7 ? 1 : 0), y + (Math.abs(Math.sin(a)) > 0.7 ? 0 : 1), 4, m.glow);
      });
      if (st === 2 && rnd() > 0.45) {
        const s2 = rnd() > 0.5 ? 1 : -1;
        const bx = Math.round(x1 + Math.cos(a + 0.9 * s2) * 4);
        const by = Math.round(y1 + Math.sin(a + 0.9 * s2) * 4);
        finePath(x1, y1, bx, by, (x, y) => put(x, y, 3, m.glow));
      }
      x0 = x1;
      y0 = y1;
    }
    put(x0, y0, 5, m.hot);
  }
  sphere(cx, cy, 3.6, (x, y, d) => put(x, y, d > 0.6 ? 5 : d > 0.1 ? 4 : 3, d > 0.1 ? m.hot : m.glow));
}

/** Water: a sphere of water: deep shadow, a refracted rim, a crescent glint, a current and a bubble inside, droplets around. */
function waterOrb(g: DrawCtx, hex: string): void {
  const { tip, dir } = fingertip(g);
  const put = fxPainter(g, hex);
  const m = fxMats(g, hex, '#f0fbff');
  const f = g.rig.frame % 2;
  const R = 6.5;
  const cx = fine(tip.x + dir.x * 3.8) + 0.5;
  const cy = fine(tip.y + dir.y * 3.8) + 0.5;
  sphere(cx, cy, R, (x, y, d, nx, ny) => {
    const r = Math.hypot(nx, ny);
    if (r > 0.86 && nx < 0.2 && ny > 0) return put(x, y, 4, m.glow); // light refracted through the lower rim
    if (r > 0.86) return put(x, y, d > 0.3 ? 4 : 2, d > 0.3 ? m.glow : m.deep);
    put(x, y, d > 0.86 ? 5 : d > 0.55 ? 4 : d > 0.15 ? 3 : d > -0.25 ? 2 : 1, d > -0.25 ? m.glow : m.deep);
  });
  // a crescent glint up and to the left
  for (const [dx, dy] of [[-3, -4], [-2, -5], [-4, -3], [-1, -5]]) put(Math.round(cx) + dx, Math.round(cy) + dy, 5, m.hot);
  // the current turning inside
  for (let t = 0; t < 2.4; t += 0.1) {
    const a = t + f * 1.6;
    put(Math.round(cx + Math.cos(a) * R * 0.52), Math.round(cy + Math.sin(a) * R * 0.38 + 1), t < 1.2 ? 4 : 3, m.glow);
  }
  // a small bubble
  const bx = Math.round(cx + (f ? 2 : -1));
  const by = Math.round(cy + (f ? 1 : 3));
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) put(bx + dx, by + dy, 4, m.glow);
  put(bx - 1, by - 1, 5, m.hot);
  // droplets circling it, each with a glint
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + f * 0.9;
    const x = Math.round(cx + Math.cos(a) * (R + 3.5));
    const y = Math.round(cy + Math.sin(a) * (R + 2.5));
    put(x, y, 3, m.glow);
    put(x, y - 1, 5, m.hot);
    put(x + 1, y, 2, m.deep);
  }
}

/** Embers: a molten coal of a ball, dark crust plates split by glowing cracks, throwing sparks with short trails. */
function emberOrb(g: DrawCtx, hex: string): void {
  const { tip, dir } = fingertip(g);
  const put = fxPainter(g, hex);
  const glow = g.m(hex, 'glow');
  const hot = g.m(mixHex(hex, '#ffc030', 0.5), 'glow');
  const crust = g.m(mixHex(hex, '#2a0c06', 0.7), 'cloth');
  const f = g.rig.frame % 2;
  const R = 5.5;
  const cx = fine(tip.x + dir.x * 3.4) + 0.5;
  const cy = fine(tip.y + dir.y * 3.4) + 0.5;
  // crust plates: cells of a coarse grid, the seams between them glowing
  const plateAt = (x: number, y: number) => {
    // (the waves keyed to the figure's box, so the plates sit on the orb as they always have)
    const u = (x - cx) * 0.3 + Math.sin((y - BOX.y) * 0.7) * 0.5 + 0.5;
    const w = (y - cy) * 0.3 + Math.sin((x - BOX.x) * 0.6 + 1) * 0.5 + 0.3;
    const fu = u - Math.floor(u);
    const fw = w - Math.floor(w);
    return Math.min(fu, 1 - fu, fw, 1 - fw);
  };
  sphere(cx, cy, R, (x, y, d) => {
    const e = plateAt(x + 0.5, y + 0.5);
    if (e < 0.1) return put(x, y, d > 0.3 ? 4 : 3, hot); // glowing seam
    if (e < 0.17) return put(x, y, 3, glow);
    put(x, y, d > 0.55 ? 3 : d > 0.05 ? 2 : 1, crust); // crust plates, lit toward the upper left
  });
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + f * 0.4 + k * 0.3;
    const r = R + 3 + ((k * 5 + f * 3) % 5);
    const x = Math.round(cx + Math.cos(a) * r);
    const y = Math.round(cy + Math.sin(a) * r);
    put(x, y, 5, hot);
    put(x - Math.round(Math.cos(a)), y - Math.round(Math.sin(a)), 3, glow);
  }
}

/** Shadow: a dark core with a cold rim light and a slow inner swirl, smoke ribbons curling off it. */
function shadowOrb(g: DrawCtx, hex: string): void {
  const { tip, dir } = fingertip(g);
  const put = fxPainter(g, hex);
  const m = fxMats(g, hex, '#e8e0ff');
  const f = g.rig.frame % 2;
  const R = 5.5;
  const cx = fine(tip.x + dir.x * 3.4) + 0.5;
  const cy = fine(tip.y + dir.y * 3.4) + 0.5;
  for (let k = 0; k < 4; k++) {
    const a0 = (k / 4) * Math.PI * 2 + f * 0.8;
    for (let t = 0; t < 1; t += 0.05) {
      const a = a0 + t * 2.4;
      const r = R + 1 + t * 7;
      const x = Math.round(cx + Math.cos(a) * r);
      const y = Math.round(cy + Math.sin(a) * r * 0.8 - t * 5);
      put(x, y, t < 0.4 ? 2 : 3, m.glow);
      if (t < 0.5) put(x, y + 1, 1, m.deep);
    }
  }
  sphere(cx, cy, R, (x, y, d, nx, ny) => {
    const r = Math.hypot(nx, ny);
    if (r > 0.82 && d > 0.05) return put(x, y, 4, m.glow); // rim light
    const sw = Math.sin(Math.atan2(ny, nx) * 2 + r * 6 + f * 1.5);
    put(x, y, sw > 0.7 && r < 0.75 ? 3 : r < 0.45 ? 0 : 1, sw > 0.7 && r < 0.75 ? m.glow : m.deep);
  });
}

/** Spirit: a wisp with a face, its tail streaming up and back in two tones, motes drifting around it. */
function spiritOrb(g: DrawCtx, hex: string): void {
  const { tip, dir } = fingertip(g);
  const put = fxPainter(g, hex);
  const m = fxMats(g, hex, '#ffffff');
  const f = g.rig.frame % 2;
  const R = 5;
  const cx = fine(tip.x + dir.x * 3.4) + 0.5;
  const cy = fine(tip.y + dir.y * 3.4) + 0.5;
  for (let t = 0; t < 1; t += 0.03) {
    const w = (1 - t) * 4;
    const x = cx - t * 11 + Math.sin(t * 7 + f * 2) * 1.8;
    const y = cy - t * 13;
    for (let dx = -w; dx <= w; dx += 1) put(Math.round(x + dx), Math.round(y), Math.abs(dx) < w * 0.45 ? 4 : t < 0.5 ? 3 : 2, m.glow);
  }
  sphere(cx, cy, R, (x, y, d) => put(x, y, d > 0.6 ? 5 : d > 0.15 ? 4 : 3, d > 0.6 ? m.hot : m.glow));
  const ex = Math.round(cx);
  const ey = Math.round(cy);
  for (const [dx, dy] of [[-2, -1], [-2, 0], [1, -1], [1, 0]]) put(ex + dx, ey + dy, 1, m.deep);
  put(ex - 1, ey + 2, 2, m.deep);
  put(ex, ey + 2, 2, m.deep);
  for (const [dx, dy] of f ? [[7, -6], [-6, 6], [9, 4]] : [[8, -3], [-7, 3], [5, 8]]) put(ex + dx, ey + dy, 4, m.glow);
}

/** Light: a small sun: a white-gold core, a broken halo, long and short rays and a lens flare cross. */
function lightOrb(g: DrawCtx, hex: string): void {
  const { tip, dir } = fingertip(g);
  const put = fxPainter(g, hex);
  const m = fxMats(g, hex, '#fff3c0');
  const f = g.rig.frame % 2;
  const R = 4;
  const cx = fine(tip.x + dir.x * 3.6);
  const cy = fine(tip.y + dir.y * 3.6);
  for (let t = 0; t < Math.PI * 2; t += 0.12) {
    if (Math.sin(t * 3 + f * 2) < -0.3) continue;
    put(Math.round(cx + Math.cos(t) * (R + 3)), Math.round(cy + Math.sin(t) * (R + 3)), 3, m.glow);
  }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + f * (Math.PI / 8);
    const len = k % 2 ? 4 : 8;
    for (let r = R + 1; r <= R + len; r++) put(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), r < R + len * 0.5 ? 5 : r < R + len * 0.8 ? 4 : 3, r < R + len * 0.5 ? m.hot : m.glow);
  }
  for (let r = R + 1; r <= R + 12; r++) {
    put(cx + r, cy, r < R + 6 ? 4 : 3, m.glow);
    put(cx - r, cy, r < R + 6 ? 4 : 3, m.glow);
  }
  sphere(cx, cy, R + 0.5, (x, y, d) => put(x, y, d > 0.1 ? 5 : 4, d > 0.1 ? m.hot : m.glow));
}

/** Void: a black orb in a thin bright ring, an accretion disk hot in front and dim behind, motes falling in. */
function voidOrb(g: DrawCtx, hex: string): void {
  const { tip, dir } = fingertip(g);
  const put = fxPainter(g, hex);
  const f = g.rig.frame % 2;
  const [r, gg, b] = hexToRgb(hex);
  const dark = (0.299 * r + 0.587 * gg + 0.114 * b) / 255 < 0.18;
  const acc = dark ? '#d02a48' : mixHex(hex, '#ffffff', 0.35);
  const rim = g.m(acc, 'glow');
  const hot = g.m(mixHex(acc, '#ffe0e0', 0.6), 'glow');
  const core = g.m('#08050b', 'flat');
  const R = 5;
  const cx = fine(tip.x + dir.x * 3.8);
  const cy = fine(tip.y + dir.y * 3.8);
  const disk = (front: boolean) => {
    for (let t = 0; t < Math.PI * 2; t += 0.04) {
      const s = Math.sin(t);
      if (s > 0 !== front) continue;
      for (const w of [0, 1]) {
        const rx = R + 3.5 + w * 1.5;
        const x = Math.round(cx + Math.cos(t) * rx);
        const y = Math.round(cy + s * (2.2 + w * 0.6) - Math.cos(t) * 1.1);
        put(x, y, front ? (w ? 3 : 4) : w ? 1 : 2, front && !w ? hot : rim);
      }
    }
  };
  disk(false);
  for (let y = cy - R - 1; y <= cy + R + 1; y++)
    for (let x = cx - R - 1; x <= cx + R + 1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= R - 0.8) put(x, y, 3, core);
      else if (d <= R + 0.3) put(x, y, x < cx && y < cy ? 4 : 3, x < cx && y < cy ? hot : rim);
    }
  disk(true);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + f * 0.7;
    const rr = R + 7 - ((k + f) % 3) * 1.5;
    put(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr * 0.7), 4, rim);
  }
}

/** Grimoire I: the orb of the chakra's nature gathered before the pointing finger. */
function natureOrb(g: DrawCtx, hex: string): void {
  const nature = CHAKRA_CHOICES.find((c) => c.id === g.look.chakra.color)?.nature ?? 'Water';
  const draw: Record<string, (g: DrawCtx, hex: string) => void> = {
    Wind: windWhirl,
    Fire: fireOrb,
    Lightning: boltOrb,
    Water: waterOrb,
    Embers: emberOrb,
    Shadow: shadowOrb,
    Spirit: spiritOrb,
    Light: lightOrb,
    Void: voidOrb,
  };
  (draw[nature] ?? waterOrb)(g, hex);
}

type Stroke = { pts: [number, number][]; w: [number, number] };
type Letter = { strokes: Stroke[]; dots: [number, number][] };

const arcPts = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 24): [number, number][] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });

/**
 * Letters of an Arabic-style script, isolated forms (nun, ba, ayn, mim, qaf,
 * hha, waw), as calligraphic pen strokes in an 18 x 18 box: each stroke
 * swells or thins from its start width to its end width.
 */
const SCRIPT: Letter[] = [
  { strokes: [{ pts: arcPts(8, 7, 6, 6.5, 0, 185), w: [1, 2.6] }], dots: [[8, 1.5]] },
  { strokes: [{ pts: [[1, 6.5], ...arcPts(8.5, 6, 7.5, 4, 160, 20).slice(1)], w: [1, 2.2] }], dots: [[8.5, 13]] },
  {
    strokes: [
      { pts: arcPts(8.4, 4.4, 3, 2.6, -40, -250), w: [1, 2] },
      { pts: [[6, 6.6], [5, 8.6], ...arcPts(9, 12, 4.4, 4.6, 200, 20).slice(1)], w: [2.4, 1] },
    ],
    dots: [],
  },
  {
    strokes: [
      { pts: arcPts(10.2, 5.2, 2.6, 2.6, 0, 360), w: [1.6, 1.6] },
      { pts: [[7.8, 6.4], [6.6, 10], [6.2, 16.5]], w: [2.4, 1] },
    ],
    dots: [],
  },
  {
    strokes: [
      { pts: arcPts(11.2, 5, 2.2, 2.2, 0, 360), w: [1.6, 1.6] },
      { pts: arcPts(8, 8.6, 6, 6, -15, 190), w: [2.6, 1] },
    ],
    dots: [[9.6, 0.6], [13, 0.6]],
  },
  { strokes: [{ pts: [[2.2, 3], [11.8, 3.6], [7, 7], ...arcPts(9, 11.2, 5.4, 5, 220, 70).slice(1)], w: [1.4, 2.4] }], dots: [] },
  {
    strokes: [
      { pts: arcPts(9.6, 4.6, 2.6, 2.6, 160, 520), w: [1.6, 1.6] },
      { pts: arcPts(4.6, 6, 5.6, 9, -5, 115), w: [2.4, 1] },
    ],
    dots: [],
  },
];

interface GlyphOpts {
  /** Box the strokes are drawn in (units), centered on the point given. */
  box?: [number, number];
  /** Fraction of the strokes' length written so far (right to left, stroke order); dots come with the last bit. */
  reveal?: number;
  /** Fraction of the ink already crumbled away. */
  dissolve?: number;
  /** Halo shade (3 normal, 4 when it flares). */
  haloShade?: number;
}

/**
 * Draws script glyphs (a letter or a whole word), `s` fine pixels per box
 * unit, centered on `c`: strokes in `ink` (darkest where they are thick)
 * inside a thin ring of `halo`. Returns where the pen is (the end of the
 * written part) while it is still writing.
 */
function scriptLetter(L: Layer, letter: Letter, c: Vec, s: number, ink: number, halo: number, part: PartId, thick = 1, o: GlyphOpts = {}): [number, number] | null {
  const [bw, bh] = o.box ?? [18, 18];
  const ox = fine(c.x) - (bw / 2) * s;
  const oy = fine(c.y) - (bh / 2) * s;
  const reveal = o.reveal ?? 1;
  const dissolve = o.dissolve ?? 0;
  const core = new Set<number>();
  const disk = (x: number, y: number, r: number) => {
    for (let yy = Math.floor(y - r - 1); yy <= Math.ceil(y + r + 1); yy++) {
      for (let xx = Math.floor(x - r - 1); xx <= Math.ceil(x + r + 1); xx++) {
        if (xx < 0 || yy < 0 || xx >= GRID || yy >= GRID) continue;
        if ((xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= r * r + 0.2) core.add(yy * GRID + xx);
      }
    }
  };
  // total length, so the reveal runs at an even speed along the strokes
  let total = 0;
  for (const st of letter.strokes) for (let i = 0; i < st.pts.length - 1; i++) total += Math.hypot(st.pts[i + 1][0] - st.pts[i][0], st.pts[i + 1][1] - st.pts[i][1]);
  const limit = total * reveal;
  let run = 0;
  let pen: [number, number] | null = null;
  for (const st of letter.strokes) {
    const n = st.pts.length;
    for (let i = 0; i < n - 1; i++) {
      const [x0, y0] = st.pts[i];
      const [x1, y1] = st.pts[i + 1];
      const seg = Math.hypot(x1 - x0, y1 - y0);
      for (let k = 0; k < 6; k++) {
        const t = k / 6;
        if (run + seg * t > limit) break;
        const w = st.w[0] + ((st.w[1] - st.w[0]) * (i + t)) / (n - 1);
        const px0 = ox + (x0 + (x1 - x0) * t) * s;
        const py0 = oy + (y0 + (y1 - y0) * t) * s;
        disk(px0, py0, (w * s * thick) / 2);
        pen = [px0, py0];
      }
      run += seg;
    }
  }
  if (reveal >= 1) {
    pen = null;
    for (const [x, y] of letter.dots) disk(ox + x * s, oy + y * s, 1.1 * s * thick);
  }
  if (dissolve > 0)
    for (const i of [...core]) {
      const h = Math.sin(((i % GRID) - BOX.x) * 12.9898 + (((i / GRID) | 0) - BOX.y) * 78.233) * 43758.5453;
      if (h - Math.floor(h) < dissolve) core.delete(i);
    }
  const inCore = (i: number) => core.has(i);
  for (const i of core) {
    for (const j of [i - 1, i + 1, i - GRID, i + GRID]) {
      if (!inCore(j)) L.set(j % GRID, (j / GRID) | 0, halo, o.haloShade ?? 3, part, F_NO_OUTLINE);
    }
  }
  for (const i of core) {
    const deep = [i - 1, i + 1, i - GRID, i + GRID].every(inCore);
    L.set(i % GRID, (i / GRID) | 0, ink, deep ? 1 : 2, part, F_NO_OUTLINE);
  }
  return pen;
}

/**
 * Arcane Script: gigantic letters of the spell's script whirl around the
 * caster, the nearest ones in front, one behind; they change each frame.
 */

const circlePts = (cx: number, cy: number, r: number): [number, number][] => arcPts(cx, cy, r, r, 90, 450);

/**
 * The word each nature's incantation writes, joined script in a 32 x 18 box
 * (baseline at y 11), strokes listed right to left in writing order: nar
 * (fire), jamr (embers), barq (lightning), rih (wind), ma' (water), zill
 * (shadow), ruh (spirit), nur (light), 'adam (void).
 */
const WORDS: Record<string, Letter> = {
  Fire: {
    strokes: [
      { pts: [[27, 8], [27, 11], [21, 11]], w: [1.6, 1.6] },
      { pts: [[20.4, 2], [20.6, 7], [20.8, 11]], w: [1.4, 2] },
      { pts: [[15.6, 8.4], [15.4, 11], [14.2, 13.4], [11.4, 15]], w: [2.2, 0.8] },
    ],
    dots: [[27, 5.2]],
  },
  Embers: {
    strokes: [
      { pts: [[27.4, 7.4], [24.2, 7.8], [25.4, 9.6], [27, 11], [22.4, 11]], w: [1.5, 1.5] },
      { pts: circlePts(21, 10, 1.4), w: [1.3, 1.3] },
      { pts: [[19.6, 11], [17, 11], [16.4, 13], [13.8, 14.8]], w: [1.6, 0.8] },
    ],
    dots: [[25.4, 13.6]],
  },
  Lightning: {
    strokes: [
      { pts: [[27, 8], [27, 11], [22.4, 11], [21.6, 12.8], [19.2, 14.8]], w: [1.6, 0.9] },
      { pts: circlePts(13.8, 8.4, 1.8), w: [1.4, 1.4] },
      { pts: arcPts(11.6, 10.4, 4, 4.6, 0, 185), w: [2.4, 1] },
    ],
    dots: [[27, 13.8], [12.8, 5], [14.9, 5]],
  },
  Wind: {
    strokes: [
      { pts: [[27.6, 8.4], [27.4, 11], [26.2, 13.4], [23.6, 15]], w: [2.2, 0.8] },
      { pts: [[21.6, 8], [21.6, 11], [17.4, 11]], w: [1.5, 1.5] },
      { pts: [[17.4, 11], [16.4, 8.6], [12.6, 8.2]], w: [1.5, 1.5] },
      { pts: arcPts(13.8, 12.4, 3.2, 3.4, 250, 25), w: [2.4, 1] },
    ],
    dots: [[20.8, 13.6], [22.8, 13.6]],
  },
  Water: {
    strokes: [
      { pts: circlePts(26.2, 9.6, 1.6), w: [1.4, 1.4] },
      { pts: [[25, 11], [20.8, 11]], w: [1.6, 1.6] },
      { pts: [[20.2, 2], [20.4, 7], [20.6, 11]], w: [1.4, 2] },
      { pts: [[16.8, 8], [15.2, 8], [14.6, 9.4], [15.8, 10.2], [14.2, 11.2], [17.4, 10.8]], w: [1.3, 1.3] },
    ],
    dots: [],
  },
  Shadow: {
    strokes: [
      { pts: [[23.6, 2], [23.8, 10.8]], w: [1.4, 1.8] },
      { pts: arcPts(25.8, 9.6, 2.2, 1.5, 180, 540), w: [1.4, 1.4] },
      { pts: [[24, 11], [18.8, 11]], w: [1.6, 1.6] },
      { pts: [[18.4, 2], [18.6, 11]], w: [1.4, 1.8] },
      { pts: arcPts(15.6, 11, 3, 2.8, 0, 175), w: [2.2, 1] },
    ],
    dots: [[26.2, 5.6]],
  },
  Spirit: {
    strokes: [
      { pts: [[28, 8.4], [27.8, 11], [26.8, 13.2], [24.4, 14.8]], w: [2.2, 0.8] },
      { pts: circlePts(21.4, 9.2, 1.8), w: [1.4, 1.4] },
      { pts: [[20, 10.4], [19.6, 13], [17.2, 14.8]], w: [2.2, 0.8] },
      { pts: [[14.4, 7.2], [10.4, 7.8]], w: [1.4, 1.4] },
      { pts: arcPts(12.2, 12, 3.4, 3.6, 255, 25), w: [2.4, 1] },
    ],
    dots: [],
  },
  Light: {
    strokes: [
      { pts: [[27, 8], [27, 11], [21.8, 11]], w: [1.5, 1.5] },
      { pts: circlePts(20.2, 9.4, 1.7), w: [1.4, 1.4] },
      { pts: [[18.8, 10.4], [18.4, 12.8], [15.6, 14.8]], w: [2.2, 0.8] },
      { pts: [[12.8, 8.4], [12.6, 11], [11.6, 13.2], [9, 14.8]], w: [2.2, 0.8] },
    ],
    dots: [[27, 5.4]],
  },
  Void: {
    strokes: [
      { pts: arcPts(26.8, 8.8, 1.9, 1.7, -60, -270), w: [1.3, 1.6] },
      { pts: [[26.6, 10.8], [26.6, 11], [21.4, 11]], w: [1.6, 1.6] },
      { pts: [[21.2, 7.6], [19.6, 9.6], [19.4, 10.8], [21.6, 11]], w: [1.6, 1.6] },
      { pts: circlePts(14.6, 9.2, 1.7), w: [1.4, 1.4] },
      { pts: [[13, 10.2], [12.6, 13], [12.8, 16]], w: [2.2, 0.8] },
    ],
    dots: [],
  },
};

/** Grimoire II, 8 frames: how much of the word is written, how much has crumbled, and the halo, per frame. */
const WRITE = [0.22, 0.48, 0.74, 1, 1, 1, 1, 1];
const CRUMBLE = [0, 0, 0, 0, 0, 0, 0.4, 0.8];

/**
 * Grimoire II: the incantation is written in the air before the caster, a
 * great black word of the nature's name in joined script, stroke by stroke
 * from right to left with a spark at the pen, then it flares, holds and
 * crumbles into motes; a new word begins.
 */
function scriptLetters(g: DrawCtx, hex: string): void {
  const { tip } = fingertip(g);
  const f = ((g.rig.frame % 8) + 8) % 8;
  const T = g.L('top');
  const ink = g.m('#1d1724', 'cloth');
  const m = fxMats(g, hex, '#ffffff');
  const nature = CHAKRA_CHOICES.find((c) => c.id === g.look.chakra.color)?.nature ?? 'Water';
  const word = WORDS[nature] ?? WORDS.Water;
  const s = 1.45;
  const half = (16 * s + 1) / RES;
  const c = add(tip, v(-6, -12 - (f >= 4 ? 0.5 : 0)));
  const at = v(Math.min(GRID / RES - half, Math.max(half, c.x)), Math.max((9 * s + 1) / RES, c.y));
  const pen = scriptLetter(T, word, at, s, ink, m.glow, 'held', 1.75, {
    box: [32, 18],
    reveal: WRITE[f],
    dissolve: CRUMBLE[f],
    haloShade: f === 3 || f === 4 ? 4 : 3,
  });
  if (pen) {
    // the spark of the pen writing it
    const [px0, py0] = pen.map(Math.round);
    T.set(px0, py0, m.hot, 5, 'held', F_NO_OUTLINE);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) T.set(px0 + dx, py0 + dy, m.glow, 4, 'held', F_NO_OUTLINE);
  }
  if (f >= 6) {
    // motes rising off the crumbling word
    const cx = fine(at.x);
    const cy = fine(at.y);
    for (let k = 0; k < 9; k++) {
      const x = cx - 16 + ((k * 13 + f * 5) % 32);
      const y = cy - 4 - ((k * 7) % 9) - (f - 5) * 4;
      T.set(x, y, k % 3 ? ink : m.glow, k % 3 ? 2 : 4, 'held', F_NO_OUTLINE);
    }
  }
}

/** A ball of energy with a bright core, a pulsing rim and a few sparks. */
function energyBall(g: DrawCtx, c: Vec, R: number, hex: string, rays: number, depth: 'nearArm.held' | 'nearArm.over' = 'nearArm.over'): void {
  const L = g.L(depth);
  const T = g.L('top');
  const pen: Pen = { mat: g.m(hex, 'glow'), part: 'held' };
  const r = R + (g.rig.frame % 2) * 0.5;
  ellipse(L, c.x, c.y, r, r, pen, (x, y) => {
    const d = Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y) / r;
    return d < 0.35 ? 5 : d < 0.7 ? 4 : 3;
  });
  const spark: Pen = { mat: g.m(mixHex(hex, '#ffffff', 0.6), 'glow'), part: 'held', flags: F_NO_OUTLINE };
  for (let k = 0; k < rays; k++) {
    const a = (k / rays) * Math.PI * 2 + g.rig.frame * 0.5;
    const a0 = add(c, v(Math.cos(a) * (r + 0.6), Math.sin(a) * (r + 0.6)));
    const a1 = add(c, v(Math.cos(a) * (r + 1.8 + (k % 2)), Math.sin(a) * (r + 1.8 + (k % 2))));
    line(T, a0, a1, spark, k % 2 ? 4 : 5);
  }
}

/**
 * Ocular cast: the eyes blaze in the chakra color, a streak of light trails
 * back from the near eye, and energy surges up off the head like flame.
 */
function eyeSurge(g: DrawCtx, hex: string): void {
  const M = g.L('head.mask');
  const T = g.L('top');
  const glow = g.m(hex, 'glow');
  const f = g.rig.frame % 2;
  // blazing eyes: the whites and the iris turn to light, the lash line stays dark
  for (const c of eyeCells(g)) {
    if (c.ch === 'd' || c.ch === 'i') M.set(c.x, c.y, glow, c.ch === 'd' ? 3 : 4, 'head', F_NO_OUTLINE);
    else if (c.ch === 'w' || c.ch === 'h') M.set(c.x, c.y, glow, 5, 'head', F_NO_OUTLINE);
  }
  // flame surging up from each eye: the near one sweeps up and back, the far one rises off the cheek edge
  const { nx, ny } = faceAnchor(g);
  const flame = (x0: number, y0: number, len: number, back: number) => {
    for (let k = 0; k < len; k++) {
      const t = k / len;
      const x = Math.round(x0 - back * (t * t * len * 0.7 + (k % 2) * 0.4 * f));
      const y = y0 - k;
      const sh = t < 0.3 ? 5 : t < 0.65 ? 4 : 3;
      T.set(x, y, glow, sh, 'head', F_NO_OUTLINE);
      if (t < 0.5) T.set(x - Math.sign(back || 1), y, glow, sh - 1, 'head', F_NO_OUTLINE);
    }
  };
  flame(nx - 1, ny + 1, 10 + f * 2, 1.7);
  flame(nx + 12, ny, 6 + f, -0.5);
  // energy surging up all around the head, behind it
  const B = g.L('hairBack');
  const pen: Pen = { mat: glow, part: 'back', flags: F_NO_OUTLINE };
  const h = g.rig.head;
  for (let n = 0; n < 11; n++) {
    const a = Math.PI * (0.95 + (n / 10) * 1.1);
    const base = add(h, v(Math.cos(a) * 9.5, Math.sin(a) * 10 - 1.5));
    const tall = 3 + ((n * 7 + f * 3) % 5) * 0.8;
    for (let t = 0; t <= 1; t += 0.06) {
      const w = (1 - t) * 1.2;
      const p = add(base, v(-t * tall * 0.35 + Math.sin(t * 6 + n * 1.7 + f * 2) * 0.5, -t * tall));
      for (let dx = -w; dx <= w; dx += 0.5) px(B, p.x + dx, p.y, pen, t < 0.3 ? 4 : t < 0.65 ? 3 : 2);
    }
  }
  // sparks rising off it
  for (const [dx, dy] of f ? [[-7, -17], [4, -19], [-1, -22]] : [[-5, -19], [6, -16], [0, -21]]) {
    px(T, h.x + dx, h.y + dy, { ...pen, part: 'head' }, 5);
  }
}

/** Draws what the hands hold for the current cast pose, if any. */
export function drawCastFx(g: DrawCtx): void {
  const pose = g.rig.pose;
  const hex = chakraHex(g.look.chakra);
  const light = mixHex(hex, '#ffffff', 0.7);
  switch (pose) {
    case 'cast':
      runes(g, hex);
      break;
    case 'castBook':
      grimoire(g, hex);
      natureOrb(g, hex);
      break;
    case 'castScript':
      grimoire(g, hex);
      scriptLetters(g, hex);
      break;
    case 'castSphere':
      drawSpiralOrb(g, { core: hex, swirl: light });
      break;
    case 'castLightning':
      drawLightning(g, { spark: light, core: hex });
      break;
    case 'castWave': {
      // between the palms, the near hand below it and the far hand above it
      const r = g.rig;
      energyBall(g, add(scale(add(r.handN, r.handF), 0.5), v(0.4, 0)), 2.9, hex, 6);
      break;
    }
    case 'castEye':
      eyeSurge(g, hex);
      break;
    case 'castFlash': {
      // in front of both palms, clear of the fingers
      const r = g.rig;
      const R = 4.2;
      energyBall(g, v(Math.max(r.handN.x, r.handF.x) + R + 1.2, (r.handN.y + r.handF.y) / 2), R, hex, 10);
      break;
    }
    default:
  }
}
