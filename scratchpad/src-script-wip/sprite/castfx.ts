// What appears in the hands while casting, by cast style (see CastStyle in
// types.ts and the cast poses in rig.ts): runes floating before the open
// palm, a grimoire held open, or energy charged in the hands. Energy and runes
// take the character's chakra color.

import { chakraHex } from './chakraInfo';
import { mixHex } from './color';
import type { DrawCtx } from './ctx';
import { add, ellipse, F_NO_OUTLINE, fine, GRID, Layer, line, norm, PartId, Pen, poly, px, RES, scale, sub, v, Vec } from './raster';
import { armJoints } from './ctx';
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

/** An open book held before the chest, its pages glowing, with runes rising from them. */
function grimoire(g: DrawCtx, hex: string): void {
  const L = g.L('nearArm.held');
  const h = g.rig.handN;
  const cover: Pen = { mat: g.m('#6b3a22', 'leather'), part: 'held' };
  const paper: Pen = { mat: g.m('#efe6cc', 'cloth'), part: 'held' };
  const ink: Pen = { mat: g.m('#5a4a3a', 'flat'), part: 'held', flags: F_NO_OUTLINE };
  const c = add(h, v(1.2, -2.4));
  // cover: a little wider than the pages, tipped toward the viewer
  poly(L, [add(c, v(-4.8, -2.6)), add(c, v(4.6, -3.0)), add(c, v(4.9, 2.4)), add(c, v(-4.6, 2.8))], cover, 2);
  // two pages and the gutter between them
  poly(L, [add(c, v(-4.2, -2.4)), add(c, v(-0.2, -2.0)), add(c, v(-0.2, 2.0)), add(c, v(-4.0, 2.4))], paper, 4);
  poly(L, [add(c, v(0.2, -2.0)), add(c, v(4.0, -2.8)), add(c, v(4.3, 1.9)), add(c, v(0.2, 2.0))], paper, 3);
  line(L, add(c, v(0, -2.0)), add(c, v(0, 2.0)), { ...cover, flags: F_NO_OUTLINE }, 1);
  // lines of script
  for (let k = 0; k < 3; k++) {
    const y = -1.2 + k * 1.1;
    line(L, add(c, v(-3.6, y - 0.1)), add(c, v(-0.9, y + 0.1)), ink, 3);
    line(L, add(c, v(0.9, y - 0.2)), add(c, v(3.5, y - 0.5)), ink, 3);
  }
  // runes lifting off the pages
  const T = g.L('top');
  const glow: Pen = { mat: g.m(hex, 'glow'), part: 'held' };
  const rise = (g.rig.frame % 2) * 1.2;
  glyph(T, add(c, v(-2.2, -5.2 - rise)), 1 + g.rig.frame, glow);
  glyph(T, add(c, v(1.8, -7.0 - rise)), 4 + g.rig.frame, glow);
  glyph(T, add(c, v(-0.2, -9.4 - rise)), 2 + g.rig.frame, glow);
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

/**
 * One glowing letter, `s` fine pixels per box unit, centered on `c`: bright
 * strokes (brightest where they are thick) inside a ring of glow.
 */
function scriptLetter(L: Layer, letter: Letter, c: Vec, s: number, mat: number, part: PartId): void {
  const ox = fine(c.x) - 9 * s;
  const oy = fine(c.y) - 9 * s;
  const core = new Set<number>();
  const disk = (x: number, y: number, r: number) => {
    for (let yy = Math.floor(y - r - 1); yy <= Math.ceil(y + r + 1); yy++) {
      for (let xx = Math.floor(x - r - 1); xx <= Math.ceil(x + r + 1); xx++) {
        if (xx < 0 || yy < 0 || xx >= GRID || yy >= GRID) continue;
        if ((xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= r * r + 0.2) core.add(yy * GRID + xx);
      }
    }
  };
  for (const st of letter.strokes) {
    const n = st.pts.length;
    for (let i = 0; i < n - 1; i++) {
      const [x0, y0] = st.pts[i];
      const [x1, y1] = st.pts[i + 1];
      for (let k = 0; k < 6; k++) {
        const t = k / 6;
        const w = st.w[0] + ((st.w[1] - st.w[0]) * (i + t)) / (n - 1);
        disk(ox + (x0 + (x1 - x0) * t) * s, oy + (y0 + (y1 - y0) * t) * s, (w * s) / 2);
      }
    }
  }
  for (const [x, y] of letter.dots) disk(ox + x * s, oy + y * s, 1.1 * s);
  const inCore = (i: number) => core.has(i);
  for (const i of core) {
    for (const j of [i - 1, i + 1, i - GRID, i + GRID]) {
      if (!inCore(j)) L.set(j % GRID, (j / GRID) | 0, mat, 3, part, F_NO_OUTLINE);
    }
  }
  for (const i of core) {
    const deep = [i - 1, i + 1, i - GRID, i + GRID].every(inCore);
    L.set(i % GRID, (i / GRID) | 0, mat, deep ? 5 : 4, part, F_NO_OUTLINE);
  }
}

/**
 * Arcane Script: gigantic letters of the spell's script whirl around the
 * caster, the nearest ones in front, one behind; they change each frame.
 */
function arcaneScript(g: DrawCtx, hex: string): void {
  const r = g.rig;
  const glow = g.m(hex, 'glow');
  const f = r.frame % 2;
  const F = g.L('top');
  const B = g.L('backGear');
  const pick = (k: number) => SCRIPT[(k + f * 3) % SCRIPT.length];
  // keep each letter whole inside the canvas
  const inside = (c: Vec, s: number) => {
    const m = (9 * s + 1) / RES;
    return v(Math.min(GRID / RES - m, Math.max(m, c.x)), Math.min(GRID / RES - m, Math.max(m, c.y)));
  };
  const letter = (L: Layer, k: number, c: Vec, s: number, part: PartId) => scriptLetter(L, pick(k), inside(c, s), s, glow, part);
  // behind the caster, past the shoulders: the biggest
  letter(B, 0, add(r.head, v(-12, 6 - f)), 1.8, 'back');
  // behind the head, rising over the hair
  letter(B, 4, add(r.head, v(5, -11 + f)), 1.2, 'back');
  // before the open palm
  letter(F, 2, add(r.handN, v(9, -1 - f)), 1.7, 'held');
  // low in front
  letter(F, 6, add(r.handN, v(4, 15 + f)), 1.25, 'held');
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
    case 'castScript':
      arcaneScript(g, hex);
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
