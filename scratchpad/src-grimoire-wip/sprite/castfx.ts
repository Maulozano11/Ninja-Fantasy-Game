// What appears in the hands while casting, by cast style (see CastStyle in
// types.ts and the cast poses in rig.ts): runes floating before the open
// palm, a grimoire held open, or energy charged in the hands. Energy and runes
// take the character's chakra color.

import { CHAKRA_CHOICES, chakraHex } from './chakraInfo';
import { mixHex } from './color';
import type { DrawCtx } from './ctx';
import { add, ellipse, F_NO_OUTLINE, fine, GRID, Layer, line, norm, partIndex, Pen, px, scale, sub, v, Vec } from './raster';
import { PixelTemplate, stampTemplate, TemplatePalette } from './rotsprite';
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

/**
 * The grimoire, opened toward the caster, so the viewer sees it from outside:
 * the left cover turned away, the right one almost facing front (it carries
 * the nature's emblem), and the page tops between them. The pivot is the
 * bottom of the spine, where the fingers hold it.
 */
const GRIMOIRE: PixelTemplate = {
  pivot: [10, 17],
  rows: [
    '.qp........PPPPPPPPPPPPP.',
    '.ppqp......PPPPPPPPPPppq.',
    '..qppqp...PPPPPPPPpppqqq.',
    '..okqppqp.PPPPPpppPPoooo.',
    '...kkkqppqPPpppPPooocccC.',
    '...okkkpqoPpPooooccccccC.',
    '....kkkkkooooccccccccccC.',
    '....kkkkkocccccccccccccC.',
    '....okkkkocccccccccccccC.',
    '.....kkkkocccccccccccccC.',
    '.....kkkkokccccccccccccC.',
    '.....okkkokccccccccccccC.',
    '......kkkkoccccccccccccC.',
    '......kkkkoccccccccccccC.',
    '......okkkoccccccccccccC.',
    '.......kkkocccccccckkkkk.',
    '.......ookockkkkkkkk.....',
    '.........ookk............',
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
  const pal: TemplatePalette = {
    o: [cover, 0],
    k: [cover, 1],
    c: [cover, 2],
    C: [cover, 3],
    q: [paper, 3],
    p: [paper, 4],
    P: [paper, 5],
  };
  // the fingers curl over the bottom of the spine
  const at = add(j.wrist, v(-0.5, -2));
  stampTemplate(L, GRIMOIRE, at, 0, pal, 'held');
  const ox = fine(at.x) - GRIMOIRE.pivot[0];
  const oy = fine(at.y) - GRIMOIRE.pivot[1];
  const nature = CHAKRA_CHOICES.find((c) => c.id === g.look.chakra.color)?.nature ?? 'Water';
  (EMBLEMS[nature] ?? EMBLEMS.Water).forEach((row, r) =>
    [...row].forEach((ch, c) => ch !== '.' && L.set(ox + 14 + c, oy + 6 + r, glow, ch === 'E' ? 5 : 3, 'held', F_NO_OUTLINE)),
  );
  // a glowing rim instead of the dark outline
  const H = GRIMOIRE.rows.length;
  const W = GRIMOIRE.rows[0].length;
  const ring: [number, number][] = [];
  for (let y = oy - 1; y <= oy + H; y++) {
    for (let x = ox - 1; x <= ox + W; x++) {
      if (L.has(x, y)) continue;
      if (L.has(x + 1, y) || L.has(x - 1, y) || L.has(x, y + 1) || L.has(x, y - 1)) ring.push([x, y]);
    }
  }
  for (const [x, y] of ring) L.set(x, y, glow, y < oy + 3 ? 4 : 3, 'held', F_NO_OUTLINE);
  // sparks rising off the pages
  const T = g.L('top');
  const f = g.rig.frame % 2;
  const sparks = f ? [[3, -3], [11, -5], [19, -3], [7, -7], [22, -6]] : [[5, -4], [14, -3], [21, -5], [9, -6], [1, -2]];
  for (const [dx, dy] of sparks) T.set(ox + dx, oy + dy, glow, (dx + dy) % 2 ? 5 : 4, 'held', F_NO_OUTLINE);
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

/** Energy whirling around the pointing fingertip (turning half a turn each frame); the finger stays clear. */
function fingerSwirl(g: DrawCtx, hex: string): void {
  const j = armJoints(g.rig, 'F');
  const dir = norm(sub(j.hand, j.wrist));
  const tip = add(j.wrist, scale(dir, 5.2));
  const T = g.L('top');
  const hand = partIndex('handF');
  const arm = [g.L('farArm.body'), g.L('farArm.cloth'), g.L('farArm.armor')];
  const glow = g.m(hex, 'glow');
  const flip = g.rig.frame % 2 === 1;
  const tx = fine(tip.x);
  const ty = fine(tip.y);
  WHIRL.rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      let dx = c - WHIRL.pivot[0];
      let dy = r - WHIRL.pivot[1];
      if (flip) [dx, dy] = [-dx, -dy];
      const i = (ty + dy) * GRID + tx + dx;
      if (arm.some((L) => L.mat[i] >= 0 && L.part[i] === hand)) continue;
      T.set(tx + dx, ty + dy, glow, ch === 'E' ? 4 : 3, 'handF', F_NO_OUTLINE);
    }
  });
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
      fingerSwirl(g, hex);
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
