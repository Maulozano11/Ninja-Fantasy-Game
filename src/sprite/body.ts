// Base human: skin body, head, face and eyes. Clothing is layered on top by
// the item catalog; the base keeps simple undergarments so the mannequin is
// always presentable.
//
// Geometry is in design units (64 space); face details are placed as single
// fine pixels (RES per design unit) for 128x128 detail.

import { makeRamp } from './color';
import { armPoint, armSpan, DrawCtx, fillTorso, footPoly, handDraw, legSpan, Side } from './ctx';
import { capsule, ellipse, F_NO_OUTLINE, Layer, PartId, Pen, poly, RES, seam, v, Vec } from './raster';

const SCLERA = '#f4f1ee';
const EYELINE = '#1b1420';

export function drawBody(g: DrawCtx): void {
  const r = g.rig;
  const b = g.bp;
  const skin = (part: PartId, bias = 0): Pen => ({ mat: g.skin, part, bias });

  // Far arm (behind the torso, one shade darker)
  drawArm(g, g.L('farArm.body'), 'F', skin('upperArmF', -1), skin('forearmF', -1));
  handDraw(g, g.L('farArm.body'), 'F', skin('handF', -1));

  // Legs
  for (const s of ['F', 'N'] as Side[]) {
    const L = g.L(s === 'N' ? 'nearLeg.body' : 'farLeg.body');
    const bias = s === 'F' ? -1 : 0;
    const thigh = skin(s === 'N' ? 'thighN' : 'thighF', bias);
    const shin = skin(s === 'N' ? 'shinN' : 'shinF', bias);
    legSpan(g, L, s, 0, 1, 0, thigh);
    legSpan(g, L, s, 1, 2, 0, shin);
    const foot = footPoly(g, s);
    poly(L, foot, skin(s === 'N' ? 'footN' : 'footF', bias), 3);
    // toes
    for (let t = 0; t < 3; t++) {
      const tx = foot[3].x - 0.4 - t * 0.9;
      seam(L, v(tx, foot[4].y - 1.2), v(tx, foot[4].y - 0.2), -1);
    }
  }

  // Torso + neck
  const torso = g.L('torso.body');
  fillTorso(g, torso, 0, skin('torso'));
  const neckTop = v(r.head.x + 0.4 * b.headScale, r.head.y + 4.5 * b.headScale);
  capsule(torso, r.neck, neckTop, b.neckW, b.neckW * 0.95, skin('torso'), (x) => (x < r.neck.x - 0.6 ? 3 : 2));

  // Simple form shading only (no muscle lines): a soft chest shadow and collarbone light.
  const T = r.T;
  const L0 = b.torsoLen;
  seam(torso, T(-b.shoulderHalf * 0.45, L0 - 1.6), T(b.shoulderHalf * 0.35, L0 - 1.8), 1);
  if (b.bust > 0) seam(torso, T(-b.chestHalf * 0.3, L0 - 7.2), T(b.chestHalf * 0.6, L0 - 7.0), -1);

  // Undergarments
  const under = g.L('torso.under');
  const cloth: Pen = { mat: g.m('#3b3a46', 'cloth'), part: 'torso' };
  fillTorso(g, under, 0.2, cloth, { top: 1.4 });
  legSpan(g, g.L('nearLeg.cloth'), 'N', 0, 0.28, 0.25, { ...cloth, part: 'thighN' });
  legSpan(g, g.L('farLeg.cloth'), 'F', 0, 0.28, 0.25, { ...cloth, part: 'thighF', bias: -1 });
  if (b.bust > 0) fillTorso(g, under, 0.3, cloth, { top: L0 - 3.4, bottom: L0 - 7.6 });

  drawHead(g);

  // Near arm (in front of everything on the torso)
  drawArm(g, g.L('nearArm.body'), 'N', skin('upperArmN'), skin('forearmN'));
  handDraw(g, g.L('nearArm.body'), 'N', skin('handN'));
}

/** Arm: rounded shoulder + tapered upper arm and forearm. */
function drawArm(g: DrawCtx, L: Layer, s: Side, upper: Pen, fore: Pen): void {
  const R = g.bp.armR;
  armSpan(g, L, s, 0, 1, 0, upper);
  armSpan(g, L, s, 1, 2, 0, fore);
  const sh = armPoint(g, s, 0.06);
  ellipse(L, sh.x, sh.y, R[0] + 0.3, R[0] + 0.2, upper);
}

/** Head center helper: offsets in design units from the integer head center. */
export function headAt(g: DrawCtx, dx: number, dy: number): Vec {
  return v(g.rig.head.x + dx, g.rig.head.y + dy);
}

function drawHead(g: DrawCtx): void {
  const L = g.L('head.body');
  const H = (dx: number, dy: number) => headAt(g, dx, dy);
  const pen: Pen = { mat: g.skin, part: 'head' };
  const body = g.rig.body;
  const fem = body === 'female' ? 1 : 0;
  const heavy = body === 'bulky' ? 1 : 0;
  const hx = g.rig.head.x;
  const hy = g.rig.head.y;

  const shadeHead = (x: number, y: number): number => {
    const dx = (x + 0.5 - (hx - 0.4)) / 6.3;
    const dy = (y + 0.5 - (hy - 1.3)) / 6.6;
    const lt = dx * -0.72 + dy * -0.69;
    if (y + 0.5 > hy + 5.2 && x + 0.5 < hx + 1.2) return 2; // under the jaw
    if (x + 0.5 > hx + 5.6) return 2; // far cheek turning away
    return lt > 0.55 ? 4 : 3;
  };
  ellipse(L, hx - 0.4, hy - 1.3, 6.3, 6.6, pen, shadeHead);
  poly(
    L,
    [
      H(-6.2, -0.5),
      H(6.4, -1.5),
      H(6.6, 2.2),
      H(6.1 + heavy * 0.3, 4),
      H(4.7 - fem * 0.5 + heavy * 0.6, 5.0),
      H(3.0 - fem * 0.4 + heavy * 0.6, 6.2),
      H(1.2, 6.5 - fem * 0.3),
      H(-0.8 - heavy * 0.6, 6.0),
      H(-3.6 - heavy * 0.6, 4.6),
      H(-5.7, 3),
    ],
    pen,
    shadeHead,
  );
  // Ear (near side)
  const ear = H(-3.4, 1.8);
  ellipse(L, ear.x, ear.y, 1.2, 1.7, pen, (x) => (x + 0.5 < ear.x - 0.4 ? 4 : 3));
  seam(L, H(-3.2, 1.0), H(-3.0, 2.6), -1);
  seam(L, H(-2.2, 0.6), H(-2.0, 3.2), -1);
  // Cheekbone / jaw line on the face side

  drawFace(g);
}

// ---------------------------------------------------------------------------
// Face (fine-pixel templates)
// ---------------------------------------------------------------------------
// L lash · w sclera · d iris dark · I iris base · i iris light · p pupil
// c catchlight · s lid shadow (skin)

const EYE_NEAR: Record<string, string[]> = {
  standard: ['LLLLL', 'LwcdL', '.wIp.', '..iI.'],
  sharp: ['..LLL', 'LLLcd', '.wIpL', '..iI.'],
  round: ['.LLL.', 'LwcdL', 'LwIpL', '.wiI.', '..ii.'],
  calm: ['.....', 'LLLLL', 'LwIpL', '..iI.'],
};
const EYE_FAR: Record<string, string[]> = {
  standard: ['LLLL', 'cdwL', 'Ipw.', 'iI..'],
  sharp: ['LLL.', 'cdLL', 'Ip..', 'iI..'],
  round: ['LLL.', 'cdwL', 'Ipw.', 'iIw.', '.i..'],
  calm: ['....', 'LLLL', 'Ipw.', 'iI..'],
};

function stamp(L: Layer, fx: number, fy: number, rows: string[], pens: Record<string, Pen>): void {
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const pen = pens[row[c]];
      if (!pen) continue;
      L.set(fx + c, fy + r, pen.mat, 3, pen.part, pen.flags || 0);
    }
  });
}

function drawFace(g: DrawCtx): void {
  const L = g.L('head.face');
  const hx = g.rig.head.x;
  const hy = g.rig.head.y;
  const k = g.bp.headScale;
  const F = (dx: number, dy: number) => [Math.floor((hx + dx * k) * RES), Math.floor((hy + dy * k) * RES)] as const;
  const flat = (hex: string): Pen => ({ mat: g.m(hex, 'flat'), part: 'head', flags: F_NO_OUTLINE });
  const sk = makeRamp(g.look.skin, 'skin');
  const sp = g.eyeSpecial;
  const female = g.rig.body === 'female';

  let iris = g.look.eyeColor || '#3b82f6';
  if (sp === 'tomoe1' || sp === 'tomoe3' || sp === 'pinwheel') iris = '#d81b2a';
  if (sp === 'pale' || sp === 'paleVeins') iris = '#e4defc';
  if (sp === 'sage') iris = '#f5a524';
  const ir = makeRamp(iris, 'cloth');
  const pale = sp === 'pale' || sp === 'paleVeins';
  const pens: Record<string, Pen> = {
    L: flat(EYELINE),
    w: flat(SCLERA),
    d: flat(ir[pale ? 3 : 2]),
    I: flat(ir[3]),
    i: flat(ir[4]),
    p: flat(pale ? ir[4] : sp === 'none' || sp === 'sage' ? '#120c18' : '#14040a'),
    c: flat(pale ? ir[5] : '#ffffff'),
    s: flat(sk[2]),
  };

  const shape = g.look.eyeShape || 'standard';
  const near = [...(EYE_NEAR[shape] || EYE_NEAR.standard)];
  const far = [...(EYE_FAR[shape] || EYE_FAR.standard)];
  if (female) {
    near.unshift('L....');
    far.unshift('...L');
  }
  const [nx, ny] = F(-2.2, female ? 0 : 0.6);
  const [fx, fy] = F(2.5, female ? 0 : 0.6);
  stamp(L, nx, ny, near, pens);
  stamp(L, fx, fy, far, pens);

  const set = (x: number, y: number, hex: string) => L.set(x, y, g.m(hex, 'flat'), 3, 'head', F_NO_OUTLINE);

  // Special patterns on top of the iris
  const irisRow = ny + (female ? 3 : 2);
  if (sp === 'tomoe3' || sp === 'tomoe1' || sp === 'pinwheel') {
    set(nx + 2, irisRow, '#14040a');
    set(fx + 1, fy + 1, '#14040a');
    if (sp !== 'tomoe1') set(nx + 3, irisRow + 1, '#14040a');
    if (sp === 'pinwheel') set(nx + 1, irisRow + 1, '#14040a');
  }
  if (sp === 'paleVeins') {
    for (const [dx, dy] of [
      [-1, 1],
      [-2, 0],
      [-1, -1],
      [5, 0],
    ])
      set(nx + dx, ny + dy, sk[1]);
    set(fx + 4, fy, sk[1]);
  }
  if (sp === 'sage') {
    for (let x = -1; x <= 4; x++) set(nx + x, ny - 1, '#c2410c');
    for (let x = 0; x <= 3; x++) set(fx + x, fy - 1, '#c2410c');
    set(nx + 2, irisRow, '#120c18');
    set(nx + 3, irisRow, '#120c18');
  }

  // Brows (hair-colored)
  const hairChoice = g.look.slots.hair;
  const br = makeRamp(hairChoice?.colors[0] || '#2a2230', 'hair');
  const browTop = ny - 2;
  const sharp = shape === 'sharp';
  for (let x = -1; x <= 3; x++) set(nx + x, browTop + (sharp ? (x >= 2 ? 1 : 0) : x <= -1 ? 1 : 0), br[1]);
  for (let x = 0; x <= 2; x++) set(fx + x, browTop + (sharp && x === 0 ? 1 : 0), br[1]);

  // Mouth (no drawn nose: at this size the face reads cleaner without it)
  const [mx, my] = F(2.0, female ? 3.9 : 4.2);
  set(mx, my, female ? '#b9506a' : sk[1]);
  set(mx + 1, my, female ? '#d06a80' : sk[2]);
}
