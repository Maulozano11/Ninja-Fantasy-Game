// Base human: skin body, head, face and eyes. Clothing is layered on top by
// the item catalog; the base keeps simple undergarments so the mannequin is
// always presentable.
//
// Geometry is in design units (64 space); face details are placed as single
// fine pixels (RES per design unit) for 128x128 detail.

import { makeRamp, mixHex } from './color';
import { armPoint, armRadius, armSpan, DrawCtx, fillTorso, FOOT_BARE, footDraw, handDraw, legSpan, Side } from './ctx';
import { ballShade, capsule, ellipse, F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, PartId, Pen, poly, RES, seam, v, Vec } from './raster';
import type { FaceShape } from './types';

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
    legSpan(g, L, s, 0, 1, 0, thigh, 'skin');
    legSpan(g, L, s, 1, 2, 0, shin, 'skin');
    footDraw(g, L, s, FOOT_BARE);
  }

  // Torso + neck
  const torso = g.L('torso.body');
  fillTorso(g, torso, 0, skin('torso'));
  const neckTop = v(r.head.x + 0.4 * b.headScale, r.head.y + 4 * b.headScale);
  capsule(torso, r.neck, neckTop, b.neckW, b.neckW * 0.95, skin('torso'), (x) => (x < r.neck.x - 0.6 ? 3 : 2));
  // Nape: the back of the neck, from under the skull down to the shoulders.
  // It fills the gap behind the tapered jaw when the hair doesn't hang there;
  // hair drawn over the head still covers it. 'slim' (default) starts well
  // inside the skull's back edge and stays in shadow; 'strong' is a thick
  // neck flush with the back of the skull, with a lit nape.
  const fa = faceAnchor(g);
  const strong = g.look.neck === 'strong';
  const napeX = (fa.nx - (strong ? 5.5 : 3.5)) / RES;
  poly(
    torso,
    [v(napeX, (fa.ny + 1) / RES), v(napeX, r.neck.y + 0.2), v(napeX - 0.8, r.neck.y + 1.2), v(r.neck.x, r.neck.y + 1.2), v(neckTop.x, (fa.ny + 1) / RES)],
    skin('torso'),
    strong ? (x) => (x < napeX + 1 ? 3 : 2) : 2,
  );

  // Simple form shading only (no muscle lines): a soft chest shadow and collarbone light.
  const T = r.T;
  const L0 = b.torsoLen;
  seam(torso, T(-b.shoulderHalf * 0.45, L0 - 1.6), T(b.shoulderHalf * 0.35, L0 - 1.8), 1);
  if (b.bust > 0) seam(torso, T(-b.chestHalf * 0.3, L0 - 7.2), T(b.chestHalf * 0.6, L0 - 7.0), -1);

  // Undergarments
  const under = g.L('torso.under');
  const cloth: Pen = { mat: g.m('#3b3a46', 'cloth'), part: 'torso' };
  // Fitted shorts: seat on the pelvis plus short legs, with a waistband seam.
  fillTorso(g, under, 0.1, cloth, { top: 2.2 });
  seam(under, T(-b.waistHalf, 1.5), T(b.waistHalf * 0.7, 1.5), -1);
  legSpan(g, g.L('nearLeg.cloth'), 'N', 0, 0.22, 0.1, { ...cloth, part: 'thighN' });
  legSpan(g, g.L('farLeg.cloth'), 'F', 0, 0.22, 0.1, { ...cloth, part: 'thighF', bias: -1 });
  if (b.bust > 0) fillTorso(g, under, 0.3, cloth, { top: L0 - 3.4, bottom: L0 - 7.6 });

  drawHead(g);

  // Near arm (in front of everything on the torso)
  drawArm(g, g.L('nearArm.body'), 'N', skin('upperArmN'), skin('forearmN'));
  handDraw(g, g.L('nearArm.body'), 'N', skin('handN'));
}

/** Arm: rounded shoulder + tapered upper arm and forearm. */
function drawArm(g: DrawCtx, L: Layer, s: Side, upper: Pen, fore: Pen): void {
  const R = g.bp.armR;
  armSpan(g, L, s, 0, 1, 0, upper, 'skin');
  armSpan(g, L, s, 1, 2, 0, fore, 'skin');
  const sh = armPoint(g, s, 0.06);
  ellipse(L, sh.x, sh.y, R[0] + 0.3, R[0] + 0.2, upper, ballShade(sh.x, sh.y, R[0] + 0.3, R[0] + 0.2));
  // Muscle definition: a lit crest along the biceps and along the forearm
  // muscle just below the elbow, on the side facing the light; a shadow line
  // under the forearm crest and at the inner elbow.
  muscleLine(g, L, s, upper.mat, 0.22, 0.72, 0.42, 1);
  muscleLine(g, L, s, fore.mat, 1.06, 1.58, 0.4, 1);
  despeckle(L, upper.mat);
}

/**
 * Smooths skin shading: a pixel whose four neighbours are all the same
 * material but none share its shade takes the most common neighbour shade,
 * so no stray single pixels are left. Hand templates (F_NO_TEXTURE) are kept.
 */
function despeckle(L: Layer, mat: number): void {
  const fixes: [number, number][] = [];
  for (let y = 1; y < GRID - 1; y++) {
    for (let x = 1; x < GRID - 1; x++) {
      const i = y * GRID + x;
      if (L.mat[i] !== mat || L.flags[i] & F_NO_TEXTURE || L.shade[i] === 0) continue;
      const nb = [i - 1, i + 1, i - GRID, i + GRID];
      if (nb.some((j) => L.mat[j] !== mat)) continue;
      const own = L.shade[i];
      const shades = nb.map((j) => L.shade[j]).filter((v) => v > 0);
      if (shades.length < 4 || shades.includes(own)) continue;
      const count = new Map<number, number>();
      for (const v of shades) count.set(v, (count.get(v) || 0) + 1);
      fixes.push([i, [...count].sort((a, b) => b[1] - a[1])[0][0]]);
    }
  }
  for (const [i, v] of fixes) L.shade[i] = v;
}

/**
 * Re-shades skin along an arm from t0 to t1, `off` radii toward the light
 * (negative = away from it), by `d` shades. Only touches pixels of `mat`
 * that are not outline, so it never widens the arm.
 */
function muscleLine(g: DrawCtx, L: Layer, s: Side, mat: number, t0: number, t1: number, off: number, d: number): void {
  const steps = 24;
  let last = -1;
  for (let k = 0; k <= steps; k++) {
    const t = t0 + ((t1 - t0) * k) / steps;
    const p = armPoint(g, s, t);
    const q = armPoint(g, s, Math.min(2, t + 0.02));
    let n = v(-(q.y - p.y), q.x - p.x);
    const ln = Math.hypot(n.x, n.y) || 1;
    n = v(n.x / ln, n.y / ln);
    if (n.x * -0.72 + n.y * -0.69 < 0) n = v(-n.x, -n.y); // toward the light
    const r = armRadius(g, t);
    const fx = Math.floor((p.x + n.x * r * off) * RES);
    const fy = Math.floor((p.y + n.y * r * off) * RES);
    const i = fy * GRID + fx;
    if (i === last || fx < 0 || fy < 0 || fx >= GRID || fy >= GRID) continue;
    last = i;
    if (!L.has(fx, fy) || L.mat[i] !== mat) continue;
    const sh0 = L.getShade(fx, fy);
    if (sh0 <= 0) continue;
    L.reshade(fx, fy, Math.max(1, Math.min(4, sh0 + d)));
  }
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
    const dx = (x + 0.5 - (hx - 0.7)) / 6.0;
    const dy = (y + 0.5 - (hy - 1.3)) / 6.6;
    if (dx < -0.78 || dx > 0.8) return 2; // edges turning away
    if (dx > -0.35 && dx < 0.35 && dy < -0.45) return 4; // forehead light
    return 3;
  };
  ellipse(L, hx - 0.7, hy - 1.3, 6.0, 6.6, pen, shadeHead);
  poly(
    L,
    [
      H(-6.0, -0.5),
      H(5.0, -1.5),
      H(5.2, 2.0),
      H(4.7 + heavy * 0.4, 3.4),
      H(3.4 - fem * 0.3 + heavy * 0.6, 5.5),
      H(1.0 + heavy * 0.4, 6.8 - fem * 0.3),
      H(-1.6 - heavy * 0.6, 6.1),
      H(-4.0 - heavy * 0.6, 4.0),
      H(-5.7, 3),
    ],
    pen,
    shadeHead,
  );
  // Everything from the eye line down is the hand-drawn face template.
  const { nx, ny } = faceAnchor(g);
  for (let i = ny * GRID; i < GRID * GRID; i++) L.mat[i] = -1;
  drawFace(g);
}

// ---------------------------------------------------------------------------
// Face template (fine pixels), copied pixel by pixel from the reference sprite.
// Columns 0..11 start at the near eye's lash; rows 0..9 start at the lash row.
// Skin: o outline · D dark · s shadow · b base · l light
// Eyes: L lash · h sclera (shaded) · w sclera · d iris dark · i iris bright
// Mouth: m lip · M mouth crease.  '.' = transparent.
// ---------------------------------------------------------------------------

/**
 * Near side of the face (cheek + jaw), columns -7..-1, one per face shape.
 * tapered (default): the cheek drops straight for two rows below the eye,
 *   then the jaw tapers to the chin so the lower face stays small.
 * soft: a fuller cheek, three rows straight before a gentle taper.
 * square: the reference's original strong jaw, with a flat jaw line.
 */
const FACE_LEFT: Record<FaceShape, string[]> = {
  tapered: ['osbbbbb', 'ossbbbb', '.osbbbb', '..osbbb', '...osbb', '....osb', '.....os', '......o', '.......', '.......'],
  soft: ['osbbbbb', 'ossbbbb', 'ossbbbb', '.osbbbb', '..osbbb', '...osbb', '....osb', '.....oo', '.......', '.......'],
  square: ['osbbbbb', 'ossbbbb', 'osDsbbb', 'ossbbbb', '.osbbbs', '..osbbs', '...osbs', '....ooo', '.......', '.......'],
};

const faceLeft = (g: DrawCtx): string[] => FACE_LEFT[g.look.faceShape || 'tapered'] || FACE_LEFT.tapered;

const FACE_MAIN: Record<string, string[]> = {
  male: [
    'LLLLbbbbbLLL',
    'LhddDbbbbdLL',
    'swiilbbbsiLo',
    'sbbbbbblsso.',
    'sbbbbbbDsso.',
    'ssbbbbbssDo.',
    'sbbbmMmsso..',
    'oDbbbbbsDo..',
    '.oDsbbsDo...',
    '..oDoooo....',
  ],
  female: [
    'LLLLbbbbbLLL',
    'LhddDbbbbdLL',
    'swiilbbbsiLo',
    'sbbbbbblsso.',
    'sbbbbbbDso..',
    'ssbbbbbsDo..',
    'sbbbmMsso...',
    'oDbbbbsDo...',
    '.oDsbsDo....',
    '..oDooo.....',
  ],
  bulky: [
    'LLLLbbbbbLLL',
    'LhddDbbbbdLL',
    'swiilbbbsiLo',
    'sbbbbbblssso',
    'sbbbbbbDssso',
    'ssbbbbbsssDo',
    'sbbbmMmsssDo',
    'oDbbbbbbssDo',
    '.oDsbbbbsDo.',
    '..oDDoooooo.',
  ],
};

/** Eye-shape variants replace the first rows of the near (cols 0-4) and far (cols 9-11) eye. */
const EYE_ROWS: Record<string, { near: string[]; far: string[] }> = {
  standard: { near: ['LLLLb', 'LhddD', 'swiil'], far: ['LLL', 'dLL', 'iLo'] },
  sharp: { near: ['bLLLL', 'LLddD', 'swiil'], far: ['LLL', 'dLL', 'iLo'] },
  round: { near: ['LLLLb', 'LhddD', 'wiiil'], far: ['LLL', 'dLL', 'iio'] },
  calm: { near: ['bbbbb', 'LLLLL', 'swiil'], far: ['bbb', 'LLL', 'iLo'] },
  // Lid slanting down toward the nose over the iris (scowl).
  fierce: { near: ['LLLbb', 'LhdLL', 'swiiD'], far: ['bLL', 'LLL', 'iLo'] },
  // Big anime eye: thick lash, a white glint in the iris and a soft lower lid.
  bright: { near: ['LLLLL', 'LhwdL', 'swiil', 'sbiib'], far: ['LLL', 'wLL', 'iio'] },
  // Small iris with white on both sides: an intense stare.
  piercing: { near: ['LLLLb', 'LhdhD', 'swiwl'], far: ['LLL', 'dhL', 'iLo'] },
};

/** A face row with the eye shape's rows swapped in (near eye cols 0-4, far eye cols 9-11). */
function eyeRow(row: string, r: number, eyes: { near: string[]; far: string[] }): string {
  const n = eyes.near[r];
  const f = eyes.far[r];
  if (!n && !f) return row;
  return (n ?? row.slice(0, 5)) + row.slice(5, 9) + (f ?? row.slice(9, 12));
}

/**
 * Fine-pixel indices covered by the face templates (from the lash row down:
 * eyes, cheeks, nose, mouth, jaw). Used to keep certain hairstyles' front
 * hair off the face (see compose.ts). The first `skipBack` columns of the
 * near side (jaw edge, in front of the ear) are left out, so side locks can
 * still frame the face there.
 */
export function faceCells(g: DrawCtx, skipBack = 0): Set<number> {
  const { nx, ny } = faceAnchor(g);
  const shape = g.look.eyeShape || 'standard';
  const eyes = EYE_ROWS[shape] || EYE_ROWS.standard;
  const main = (FACE_MAIN[g.rig.body] || FACE_MAIN.male).map((row, r) => eyeRow(row, r, eyes));
  const out = new Set<number>();
  const add = (x: number, y: number) => {
    if (x >= 0 && y >= 0 && x < GRID && y < GRID) out.add(y * GRID + x);
  };
  faceLeft(g).forEach((row, r) => {
    for (let c = skipBack; c < row.length; c++) if (row[c] !== '.') add(nx - 7 + c, ny + r);
  });
  main.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) if (row[c] !== '.') add(nx + c, ny + r);
  });
  return out;
}

/** Fine-pixel anchors of the face: near-eye lash start and far-eye lash start. */
export function faceAnchor(g: DrawCtx): { nx: number; ny: number; fx: number; fy: number } {
  const k = g.bp.headScale;
  const nx = Math.floor((g.rig.head.x - 1.9 * k) * RES);
  const ny = Math.floor((g.rig.head.y + 1.0 * k) * RES);
  return { nx, ny, fx: nx + 9, fy: ny };
}

function drawFace(g: DrawCtx): void {
  const L = g.L('head.body');
  const F = g.L('head.face');
  const { nx, ny } = faceAnchor(g);
  const sk = g.mats.ramps[g.skin];
  const sp = g.eyeSpecial;
  const female = g.rig.body === 'female';

  let iris = g.look.eyeColor || '#3b82f6';
  if (sp === 'tomoe1' || sp === 'tomoe3' || sp === 'pinwheel') iris = '#d81b2a';
  if (sp === 'pale' || sp === 'paleVeins') iris = '#ddd6f3';
  if (sp === 'sage') iris = '#f5a524';
  const ir = makeRamp(iris, 'cloth');
  const pale = sp === 'pale' || sp === 'paleVeins';

  const flat = (hex: string) => g.m(hex, 'flat');
  const colors: Record<string, number> = {
    L: flat(EYELINE),
    w: flat(SCLERA),
    h: flat(mixHex(SCLERA, ir[2], 0.32)),
    // Iris after the reference: a dark top row over a mid-tone row, never the
    // brightest tone, so the gaze stays focused instead of glaring.
    d: flat(pale ? ir[3] : ir[1]),
    i: flat(pale ? ir[4] : ir[2]),
    m: flat(female ? '#c4566c' : mixHex(sk[1], '#b8505a', 0.3)),
    M: flat(female ? '#9c3b52' : mixHex(sk[0], sk[1], 0.45)),
  };
  const skinShade: Record<string, number> = { o: 0, D: 1, s: 2, b: 3, l: 4 };

  const shape = g.look.eyeShape || 'standard';
  const eyes = EYE_ROWS[shape] || EYE_ROWS.standard;
  const main = (FACE_MAIN[g.rig.body] || FACE_MAIN.male).map((row, r) => eyeRow(row, r, eyes));

  const put = (x: number, y: number, ch: string) => {
    if (ch === '.') return;
    if (ch in skinShade) L.set(x, y, g.skin, skinShade[ch], 'head', F_NO_OUTLINE);
    else L.set(x, y, colors[ch], 3, 'head', F_NO_OUTLINE);
  };
  faceLeft(g).forEach((row, r) => {
    for (let c = 0; c < row.length; c++) put(nx - 7 + c, ny + r, row[c]);
  });
  main.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) put(nx + c, ny + r, row[c]);
  });

  // Overlays drawn on the face layer (no outline, above the skin).
  const set = (x: number, y: number, hex: string) => F.set(x, y, g.m(hex, 'flat'), 3, 'head', F_NO_OUTLINE);
  if (female) {
    // longer lashes at the outer corners
    set(nx - 1, ny - 1, EYELINE);
    set(nx - 1, ny, EYELINE);
    set(nx + 12, ny, EYELINE);
  }
  // Special eye patterns (pupil marks on the red iris, veins, sage pigment)
  if (sp === 'tomoe1' || sp === 'tomoe3' || sp === 'pinwheel') {
    set(nx + 2, ny + 1, '#14040a');
    if (sp !== 'tomoe1') set(nx + 3, ny + 2, '#14040a');
    if (sp === 'pinwheel') set(nx + 3, ny + 1, '#14040a');
    set(nx + 9, ny + 1, '#14040a');
  }
  if (sp === 'paleVeins') {
    for (const [dx, dy] of [
      [-1, 1],
      [-2, 0],
      [5, 0],
      [8, 1],
    ])
      set(nx + dx, ny + dy, sk[1]);
  }
  if (sp === 'sage') {
    for (let x = -1; x <= 4; x++) set(nx + x, ny - 1, '#c2410c');
    for (let x = 9; x <= 12; x++) set(nx + x, ny - 1, '#c2410c');
    set(nx + 2, ny + 2, '#120c18');
    set(nx + 3, ny + 2, '#120c18');
  }

  // Brows (hair-colored), two rows above the lash; most bangs cover them.
  const hairChoice = g.look.slots.hair;
  const br = makeRamp(hairChoice?.colors[0] || '#2a2230', 'hair');
  // Sharp and fierce eyes get brows angled down toward the nose.
  const sharp = shape === 'sharp' || shape === 'fierce';
  for (let x = 0; x <= 3; x++) set(nx + x, ny - 2 + (sharp && x >= 2 ? 1 : 0), br[1]);
  for (let x = 9; x <= 11; x++) set(nx + x, ny - 2 + (sharp && x === 9 ? 1 : 0), br[1]);
}
