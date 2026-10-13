// What appears in the hands while casting, by cast style (see CastStyle in
// types.ts and the cast poses in rig.ts): runes floating before the open
// palm, a grimoire held open, or energy charged in the hands. Energy and runes
// take the character's chakra color.

import { chakraHex } from './chakraInfo';
import { mixHex } from './color';
import type { DrawCtx } from './ctx';
import { add, ellipse, F_NO_OUTLINE, fine, Layer, line, norm, Pen, poly, px, scale, sub, v, Vec } from './raster';
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
function energyBall(g: DrawCtx, c: Vec, R: number, hex: string, rays: number): void {
  const L = g.L('nearArm.over');
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
      const r = g.rig;
      energyBall(g, add(scale(add(r.handN, r.handF), 0.5), v(-0.6, 0.2)), 3.1, hex, 6);
      break;
    }
    case 'castFlash': {
      const r = g.rig;
      energyBall(g, add(scale(add(r.handN, r.handF), 0.5), v(3.4, 0)), 4.2, hex, 10);
      break;
    }
    default:
  }
}
