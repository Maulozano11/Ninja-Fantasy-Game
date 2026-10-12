// Base human: skin body, head, face and eyes. Clothing is layered on top by
// the item catalog; the base keeps simple undergarments so the mannequin is
// always presentable.

import { makeRamp } from './color';
import {
  armSpan,
  DrawCtx,
  fillTorso,
  footPoly,
  handDraw,
  legSpan,
  Side,
} from './ctx';
import { capsule, ellipse, F_NO_OUTLINE, PartId, Pen, poly, px, seam, v, Vec } from './raster';

const SCLERA = '#f4f1ee';
const EYELINE = '#1b1420';

export function drawBody(g: DrawCtx): void {
  const r = g.rig;
  const b = g.bp;
  const skin = (part: PartId, bias = 0): Pen => ({ mat: g.skin, part, bias });

  // Far arm (behind the torso, one shade darker)
  const farArm = g.L('farArm.body');
  armSpan(g, farArm, 'F', 0, 1, 0, skin('upperArmF', -1));
  armSpan(g, farArm, 'F', 1, 2, 0, skin('forearmF', -1));
  handDraw(g, farArm, 'F', skin('handF', -1));

  // Legs
  for (const s of ['F', 'N'] as Side[]) {
    const L = g.L(s === 'N' ? 'nearLeg.body' : 'farLeg.body');
    const bias = s === 'F' ? -1 : 0;
    legSpan(g, L, s, 0, 1, 0, skin(s === 'N' ? 'thighN' : 'thighF', bias));
    legSpan(g, L, s, 1, 2, 0, skin(s === 'N' ? 'shinN' : 'shinF', bias));
    poly(L, footPoly(g, s), skin(s === 'N' ? 'footN' : 'footF', bias), 3 + 0);
    // Toe line
    const f = footPoly(g, s);
    seam(L, v(f[3].x - 1, f[3].y + 0.5), v(f[4].x - 0.5, f[4].y - 0.5), -1);
  }

  // Torso + neck
  const torso = g.L('torso.body');
  fillTorso(g, torso, 0, skin('torso'));
  const neckTop = v(r.head.x - 0.2, r.head.y + 4);
  capsule(torso, r.neck, neckTop, b.neckW, b.neckW, skin('torso'), (x) => (x < r.neck.x - 0.5 ? 3 : 2));

  // Light anatomy hints, only visible when the torso is bare.
  const T = r.T;
  const L0 = b.torsoLen;
  if (b.bust === 0) {
    seam(torso, T(0.2, L0 - 6.4), T(b.chestHalf * 0.62, L0 - 6.6), -1);
    seam(torso, T(1.4, L0 - 7.4), T(1.4, 3.6), -1);
    px(torso, T(1.6, 4.8).x, T(1.6, 4.8).y, skin('torso'), 2);
  }

  // Undergarments
  const under = g.L('torso.under');
  const cloth: Pen = { mat: g.m('#3b3a46', 'cloth'), part: 'torso' };
  fillTorso(g, under, 0.2, cloth, { top: 1.4 });
  legSpan(g, g.L('nearLeg.cloth'), 'N', 0, 0.28, 0.25, { ...cloth, part: 'thighN' });
  legSpan(g, g.L('farLeg.cloth'), 'F', 0, 0.28, 0.25, { ...cloth, part: 'thighF', bias: -1 });
  if (b.bust > 0) fillTorso(g, under, 0.3, cloth, { top: L0 - 3.6, bottom: L0 - 7.4 });

  // Head
  drawHead(g);

  // Near arm (in front of everything on the torso)
  const nearArm = g.L('nearArm.body');
  armSpan(g, nearArm, 'N', 0, 1, 0, skin('upperArmN'));
  armSpan(g, nearArm, 'N', 1, 2, 0, skin('forearmN'));
  handDraw(g, nearArm, 'N', skin('handN'));
}

/** Head center helper: offsets in pixels from the integer head center. */
export function headAt(g: DrawCtx, dx: number, dy: number): Vec {
  return v(g.rig.head.x + dx, g.rig.head.y + dy);
}

// Hand-drawn head silhouettes (13x15), 3/4 view facing right.
// o outline · d dark · s shadow · b base · l light · h highlight
// Template pixel (6, 7) sits on the head center.
const HEAD_TOP = [
  '....ooooo....',
  '..oollllbbo..',
  '.olllllllbbo.',
  '.ollllbbbbbbo',
  'olllbbbbbbbbo',
  'ollbbbbbbbbbo',
  'olbbbbbbbbbbo',
  'osbbbbbbbbbbo',
  'osbbbbbbbbbbo',
  'osdsbbbbbbbbo',
  'osssbbbbbbbbo',
];
const HEAD_JAW: Record<string, string[]> = {
  male: ['.osbbbbbbbbo.', '..osbbbbbbbo.', '...ossbbbbo..', '....oooooo...'],
  female: ['.osbbbbbbbbo.', '..osbbbbbbo..', '...osbbbbo...', '....ooooo....'],
  bulky: ['osbbbbbbbbbbo', '.osbbbbbbbbo.', '..ossbbbbbo..', '...ooooooo...'],
};
const SHADE: Record<string, number> = { o: 0, d: 1, s: 2, b: 3, l: 4, h: 5 };
export const HEAD_OX = 6;
export const HEAD_OY = 7;

function drawHead(g: DrawCtx): void {
  const L = g.L('head.body');
  const pen: Pen = { mat: g.skin, part: 'head' };
  const hx = g.rig.head.x;
  const hy = g.rig.head.y;
  const rows = [...HEAD_TOP, ...(HEAD_JAW[g.rig.body] || HEAD_JAW.male)];
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      px(L, hx + c - HEAD_OX, hy + r - HEAD_OY, pen, SHADE[ch]);
    }
  });
  drawFace(g);
}

function drawFace(g: DrawCtx): void {
  const L = g.L('head.face');
  const hx = g.rig.head.x;
  const hy = g.rig.head.y;
  const flat = (hex: string): Pen => ({ mat: g.m(hex, 'flat'), part: 'head', flags: F_NO_OUTLINE });
  const skinPen: Pen = { mat: g.skin, part: 'head', flags: F_NO_OUTLINE };
  const sp = g.eyeSpecial;
  const female = g.bp.bust > 0;

  // Iris colors (special eyes override the chosen color)
  let iris = g.look.eyeColor || '#3b82f6';
  if (sp === 'tomoe1' || sp === 'tomoe3' || sp === 'pinwheel') iris = '#d81b2a';
  if (sp === 'pale' || sp === 'paleVeins') iris = '#ddd6fe';
  if (sp === 'sage') iris = '#f59e0b';
  const ir = makeRamp(iris, 'cloth');
  const I = (shade: number): Pen => flat(ir[shade]);
  const line1 = flat(EYELINE);
  const white = flat(SCLERA);

  const shape = g.look.eyeShape;
  const ey = hy + 1; // top row of the iris
  const nx = hx - 1; // near-eye left column (sclera)
  const fx = hx + 3; // far-eye left column

  // Lashes / upper lid
  const lashY = shape === 'calm' ? ey : ey - 1;
  for (let x = nx - 1; x <= nx + 2; x++) px(L, x, lashY, line1);
  if (female) px(L, nx - 2, lashY - 1, line1);
  px(L, fx, lashY, line1);
  px(L, fx + 1, lashY, line1);
  px(L, fx + 2, lashY, line1);
  if (shape === 'sharp') {
    px(L, nx + 2, lashY + 1, line1);
    px(L, fx + 1, lashY + 1, line1);
  }

  // Near eye: sclera on the back side, iris looking forward (right)
  const rows = shape === 'round' ? 3 : shape === 'calm' ? 1 : 2;
  for (let k = 0; k < rows; k++) {
    const y = (shape === 'calm' ? ey + 1 : ey) + k;
    if (shape !== 'sharp' || k === 0) px(L, nx, y, k === 0 ? white : skinPen, k === 0 ? 3 : 3);
    px(L, nx + 1, y, I(k === 0 ? 4 : 3));
    px(L, nx + 2, y, I(k === 0 ? 2 : 1));
  }
  // Catchlight
  if (sp !== 'pale' && sp !== 'paleVeins') px(L, nx + 1, shape === 'calm' ? ey + 1 : ey, flat('#ffffff'));

  // Far eye (slightly foreshortened)
  for (let k = 0; k < rows; k++) {
    const y = (shape === 'calm' ? ey + 1 : ey) + k;
    px(L, fx, y, I(k === 0 ? 4 : 3));
    px(L, fx + 1, y, I(k === 0 ? 2 : 1));
  }
  if (sp !== 'pale' && sp !== 'paleVeins') px(L, fx, shape === 'calm' ? ey + 1 : ey, flat('#ffffff'));

  // Special patterns
  if (sp === 'tomoe3' || sp === 'pinwheel') {
    px(L, nx + 2, ey + (rows > 1 ? 1 : 0), flat('#120308'));
    px(L, fx + 1, ey + (rows > 1 ? 1 : 0), flat('#120308'));
  }
  if (sp === 'pinwheel') px(L, nx + 1, ey + 1, flat('#120308'));
  if (sp === 'tomoe1') px(L, nx + 2, ey, flat('#3b0509'));
  if (sp === 'paleVeins') {
    px(L, nx - 1, ey, flat(makeRamp(g.look.skin, 'skin')[1]));
    px(L, nx - 1, ey - 2, flat(makeRamp(g.look.skin, 'skin')[1]));
    px(L, fx + 2, ey - 1, flat(makeRamp(g.look.skin, 'skin')[1]));
  }
  if (sp === 'sage') {
    px(L, nx + 1, ey + (rows > 1 ? 1 : 0), flat('#1b1420'));
    px(L, nx + 2, ey + (rows > 1 ? 1 : 0), flat('#1b1420'));
    for (let x = nx - 1; x <= nx + 2; x++) px(L, x, lashY - 1, flat('#c2410c'));
  }

  // Brows (hair-colored)
  const hairChoice = g.look.slots.hair;
  const browHex = hairChoice?.colors[0] || '#2a2230';
  const br = makeRamp(browHex, 'hair');
  const brow = flat(br[1]);
  const browY = lashY - 2;
  if (shape === 'sharp') {
    px(L, nx, browY, brow);
    px(L, nx + 1, browY + 1, brow);
    px(L, nx + 2, browY + 1, brow);
  } else {
    for (let x = nx; x <= nx + 2; x++) px(L, x, browY, brow);
  }
  px(L, fx, browY, brow);
  px(L, fx + 1, browY, brow);

  // Nose & mouth
  px(L, hx + 3, hy + 3, skinPen, 2);
  const mouth = flat(female ? '#c2566b' : makeRamp(g.look.skin, 'skin')[1]);
  px(L, hx + 2, hy + 5, mouth);
  px(L, hx + 3, hy + 5, mouth);
}
