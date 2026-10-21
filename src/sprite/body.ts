// Base human: skin body, head, face and eyes. Clothing is layered on top by
// the item catalog; the base keeps simple undergarments so the mannequin is
// always presentable.
//
// Geometry is in design units (64 space); face details are placed as single
// fine pixels (RES per design unit) for 128x128 detail.

import { hexToRgb, hslToHex, makeRamp, mixHex, retintHex, rgbToHsl } from './color';
import { armPoint, armRadius, armSpan, DrawCtx, fillTorso, FOOT_BARE, footDraw, handDraw, legSpan, Side, torsoPoly } from './ctx';
import { type PaintedEye, VALIANT_BROW_HAIR, VALIANT_EYE_COLORS, VALIANT_EYES, VALIANT_IRIS } from './eyeArt';
import { VALIANT_HEAD, VALIANT_SKIN } from './headArt';
import { type PaintedPiece, stampPiece } from './painted';
import { stampNobleBrows, stampNobleEyes } from './princessFace';
import { NOBLE_EYES } from './princessEyeArt';
import { NOBLE_HEAD, NOBLE_SKIN } from './princessHeadArt';
import { ballShade, capsule, ellipse, F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, PartId, Pen, poly, RES, seam, v, Vec } from './raster';
import { isFemaleBody, type FaceShape } from './types';

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
  if (b.bust > 0) sculptTorso(g, torso, g.skin, 'skin');
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
  if (b.bust > 0) {
    // a bandeau wrapping the bust: a soft dip between the forms at the top,
    // its lower edge following the curve under the bust
    const { by } = bustForms(g);
    const cx = 1.2;
    poly(under, torsoPoly(g, 0.3), cloth, 3, (x, y) => {
      const [lx, ly] = torsoLocal(g, x + 0.5 / RES, y + 0.5 / RES);
      const top = by + 2.0 - 0.7 * Math.exp(-(((lx - (cx - 0.1)) / 0.9) ** 2));
      const bot = by - 2.3 + 0.35 * ((lx - cx) / 3.5) ** 2;
      return ly <= top && ly >= bot;
    });
    sculptTorso(g, under, cloth.mat, 'cloth');
  }

  drawHead(g);

  // Near arm (in front of everything on the torso)
  drawArm(g, g.L('nearArm.body'), 'N', skin('upperArmN'), skin('forearmN'));
  handDraw(g, g.L('nearArm.body'), 'N', skin('handN'));
}

/** Torso-local coordinates of a design point: x along the shoulders (toward the face), y up from the pelvis. */
function torsoLocal(g: DrawCtx, x: number, y: number): [number, number] {
  const r = g.rig;
  const dx = x - r.pelvis.x;
  const dy = y - r.pelvis.y;
  return [dx * r.right.x + dy * r.right.y, dx * r.up.x + dy * r.up.y];
}

/** The bust of the female bodies as two rounded forms in torso-local units: [x, y, rx, ry, height]. */
function bustForms(g: DrawCtx): { by: number; forms: [number, number, number, number, number][] } {
  const b = g.bp;
  const top = torsoLocal(g, g.rig.neck.x, g.rig.neck.y)[1];
  const cx = 1.2;
  const by = top - 4.7 - b.bust * 0.3;
  return {
    by,
    forms: [
      [cx - 2.2, by, 2.3, 2.0, 0.9 + b.bust * 0.45],
      [cx + 2.0, by, 1.8, 1.9, 0.8 + b.bust * 0.45],
    ],
  };
}

/** Light for sculpted forms: from the upper left and the front. */
const SCULPT_LIGHT = (() => {
  const l = Math.hypot(-0.6, -0.6, 0.55);
  return [-0.6 / l, -0.6 / l, 0.55 / l];
})();

/**
 * Sculpts a female torso layer: every pixel of `mat` is re-shaded from a
 * surface normal (the body rounding away at both sides, the bust's two
 * forms), with a soft crease under the bust and, on skin, a navel.
 */
function sculptTorso(g: DrawCtx, L: Layer, mat: number, kind: 'skin' | 'cloth'): void {
  const b = g.bp;
  const { forms } = bustForms(g);
  const hgt = (x: number, y: number) => {
    let sum = 0;
    for (const [fx, fy, rx, ry, a] of forms) sum += a * Math.exp(-(((x - fx) / rx) ** 2 + ((y - fy) / ry) ** 2) * 1.6);
    return sum;
  };
  const x0 = -b.chestHalf * 0.86 - 0.6;
  const x1 = b.chestHalf * 0.62 + b.bust + 1.0;
  const crease = (lx: number, ly: number) =>
    forms.some(([fx, fy, rx, ry]) => {
      const u = (lx - fx) / rx;
      return Math.abs(u) < 0.9 && Math.abs(ly - (fy - ry * 0.95 + 0.9 * u * u)) < 0.3;
    });
  for (let fy = 0; fy < GRID; fy++) {
    for (let fx = 0; fx < GRID; fx++) {
      const i = fy * GRID + fx;
      if (L.mat[i] !== mat || L.shade[i] === 0) continue;
      const [lx, ly] = torsoLocal(g, (fx + 0.5) / RES, (fy + 0.5) / RES);
      if (ly < 1.4) continue; // below the waistband: leave the hips to their own shading
      const t = Math.max(0, Math.min(1, (lx - x0) / (x1 - x0)));
      const th = (t - 0.36) * 2.1;
      const e = 0.2;
      const nx = Math.sin(th) - ((hgt(lx + e, ly) - hgt(lx - e, ly)) / (2 * e)) * 2.2;
      const ny = ((hgt(lx, ly + e) - hgt(lx, ly - e)) / (2 * e)) * 2.2;
      const nz = Math.cos(th) + 0.15;
      const d = (nx * SCULPT_LIGHT[0] + ny * SCULPT_LIGHT[1] + nz * SCULPT_LIGHT[2]) / (Math.hypot(nx, ny, nz) || 1);
      let sh = d > 0.8 ? 4 : d > 0.4 ? 3 : d > -0.02 ? 2 : 1;
      if (kind === 'skin' && sh === 1) sh = 2;
      if (crease(lx, ly)) sh = kind === 'skin' ? 2 : 1;
      L.reshade(fx, fy, sh);
    }
  }
  if (kind === 'skin') {
    const n = g.rig.T(1.5, 4.6);
    const fx = Math.floor(n.x * RES);
    const fy = Math.floor(n.y * RES);
    if (L.has(fx, fy) && L.mat[fy * GRID + fx] === mat) L.reshade(fx, fy, 1);
  }
}

/**
 * Gives clothes worn over a female torso the bust's volume without repainting
 * them: over each form the upper, lit part gains a shade and the underside
 * loses one, with a soft crease beneath; seams, outlines and trims keep their
 * own values relative to the cloth around them.
 */
export function sculptClothes(g: DrawCtx, L: Layer): void {
  if (!(g.bp.bust > 0) || !L.used) return;
  const { forms } = bustForms(g);
  for (let fy = 0; fy < GRID; fy++) {
    for (let fx = 0; fx < GRID; fx++) {
      const i = fy * GRID + fx;
      if (L.mat[i] < 0 || L.shade[i] === 0) continue;
      const [lx, ly] = torsoLocal(g, (fx + 0.5) / RES, (fy + 0.5) / RES);
      let delta = 0;
      for (const [cx, cy, rx, ry] of forms) {
        const u = (lx - cx) / (rx * 1.05);
        const w = (ly - cy) / (ry * 1.05);
        const r2 = u * u + w * w;
        if (r2 > 1) {
          // the crease just under the form
          if (Math.abs(u) < 0.85 && w < -0.95 && w > -1.35) delta = Math.min(delta, -1);
          continue;
        }
        // lit cap toward the upper left, turning into shade underneath
        if (w > 0.25 && u < 0.35 && r2 < 0.75) delta = Math.max(delta, 1);
        else if (w < -0.45) delta = Math.min(delta, -1);
      }
      if (delta) L.reshade(fx, fy, Math.max(1, Math.min(4, L.shade[i] + delta)));
    }
  }
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

/**
 * The owner's heads, his pixels whole (skull to chin) and the skin he painted each in: Aiden's
 * ('valiant', src/sprite/headArt.ts) and his princess's ('noble', src/sprite/princessHeadArt.ts).
 */
const PAINTED_HEADS: Partial<Record<FaceShape, { piece: PaintedPiece; skin: string }>> = {
  valiant: { piece: VALIANT_HEAD, skin: VALIANT_SKIN },
  noble: { piece: NOBLE_HEAD, skin: NOBLE_SKIN },
};
const paintedHead = (g: DrawCtx) => (g.look.faceShape ? PAINTED_HEADS[g.look.faceShape] : undefined);

function drawHead(g: DrawCtx): void {
  const painted = paintedHead(g);
  if (painted) {
    drawPaintedHead(g, painted.piece, painted.skin);
    drawFace(g);
    return;
  }
  const L = g.L('head.body');
  const H = (dx: number, dy: number) => headAt(g, dx, dy);
  const pen: Pen = { mat: g.skin, part: 'head' };
  const body = g.rig.body;
  const fem = isFemaleBody(body) ? 1 : 0;
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

/**
 * One of the owner's heads (PAINTED_HEADS: Aiden's from his Aiden picture, his princess's from hers):
 * his pixels, skull to chin, stamped on the face anchor as they are. They are already the final
 * on-screen pixels, so the head group's scale does not touch them; the face template draws the eyes
 * and brows (on Aiden's the mouth too) on them as it does on ours, and the hair covers the skull as
 * it covers ours.
 */
function drawPaintedHead(g: DrawCtx, piece: PaintedPiece, base: string): void {
  const { nx, ny } = faceAnchor(g);
  const at = v((nx + 0.5) / RES, (ny + 0.5) / RES);
  stampPiece(g, 'head.body', piece, at, piece.angle, 'head', (_ch, hex) => skinTone(hex, g.look.skin, base));
}

/**
 * A colour of the owner's head in the character's skin: the hue turned and the saturation scaled
 * from the skin he painted it in, as retintHex turns his cloth, but the lightness scaled so that his
 * skin lands exactly on the character's (the rest of the body is drawn in that skin), his shadows
 * and black line staying as far below it and his lights as far above. In his own skin, his colour.
 */
function skinTone(hex: string, skin: string, base = VALIANT_SKIN): string {
  if (skin.toLowerCase() === base) return hex;
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  const [h0, s0, l0] = rgbToHsl(...hexToRgb(base));
  const [h1, s1, l1] = rgbToHsl(...hexToRgb(skin));
  const lt = l <= l0 ? (l * l1) / l0 : l1 + ((l - l0) * (1 - l1)) / (1 - l0);
  return hslToHex(h + (h1 - h0), Math.min(1, (s * s1) / s0), lt);
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
 * (valiant and noble, the owner's heads, are his pixels whole: see drawPaintedHead.)
 */
const FACE_LEFT: Record<Exclude<FaceShape, 'valiant' | 'noble'>, string[]> = {
  tapered: ['osbbbbb', 'ossbbbb', '.osbbbb', '..osbbb', '...osbb', '....osb', '.....os', '......o', '.......', '.......'],
  soft: ['osbbbbb', 'ossbbbb', 'ossbbbb', '.osbbbb', '..osbbb', '...osbb', '....osb', '.....oo', '.......', '.......'],
  square: ['osbbbbb', 'ossbbbb', 'osDsbbb', 'ossbbbb', '.osbbbs', '..osbbs', '...osbs', '....ooo', '.......', '.......'],
};

const faceLeft = (g: DrawCtx): string[] => {
  const s = g.look.faceShape;
  return (s && s !== 'valiant' && s !== 'noble' && FACE_LEFT[s]) || FACE_LEFT.tapered;
};

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
  // The owner's eyes (src/sprite/eyeArt.ts), a row lower than ours and heavy-lidded: his brow (B) on
  // the row above the lash line, a single row of white and red iris under it. Drawn in his pixels.
  valiant: { near: VALIANT_EYES.open.near.letters, far: VALIANT_EYES.open.far.letters },
  // The owner's princess's eyes (src/sprite/princessEyeArt.ts), her pixels from his picture at our
  // scale: her black lash on the lash row, two rows of violet iris and lights under it.
  noble: { near: NOBLE_EYES.open.near.letters, far: NOBLE_EYES.open.far.letters },
};

/** Closed eyes (knocked out): each eye a dark lid line across its middle row. */
const CLOSED_EYES = { near: ['bbbbb', 'LLLLb', 'sbbbl'], far: ['bbo', 'LLL', 'bbo'] };

/** A face row with the eye shape's rows swapped in (near eye cols 0-4, far eye cols 9-11). */
function eyeRow(row: string, r: number, eyes: { near: string[]; far: string[] }): string {
  const n = eyes.near[r];
  const f = eyes.far[r];
  if (!n && !f) return row;
  return (n ?? row.slice(0, 5)) + row.slice(5, 9) + (f ?? row.slice(9, 12));
}

/**
 * The eye pixels for the character's eye shape, in fine pixels: each with its
 * template letter ('L' lash, 'w'/'h' white, 'd'/'i' iris) and which eye.
 */
export function eyeCells(g: DrawCtx): { x: number; y: number; ch: string; near: boolean }[] {
  const { ex, fx, ny } = faceAnchor(g);
  const eyes = EYE_ROWS[g.look.eyeShape || 'standard'] || EYE_ROWS.standard;
  const out: { x: number; y: number; ch: string; near: boolean }[] = [];
  eyes.near.forEach((row, r) => [...row].forEach((ch, c) => out.push({ x: ex + c, y: ny + r, ch, near: true })));
  eyes.far.forEach((row, r) => [...row].forEach((ch, c) => out.push({ x: fx + c, y: ny + r, ch, near: false })));
  return out;
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
  const main = (FACE_MAIN[isFemaleBody(g.rig.body) ? 'female' : g.rig.body] || FACE_MAIN.male).map((row, r) => eyeRow(row, r, eyes));
  const out = new Set<number>();
  const add = (x: number, y: number) => {
    if (x >= 0 && y >= 0 && x < GRID && y < GRID) out.add(y * GRID + x);
  };
  const painted = paintedHead(g);
  if (painted) {
    // The owner's head from the lash row down, from the column the other shapes' near side starts at.
    const { piece } = painted;
    const ox = nx - piece.pivot[0];
    const oy = ny - piece.pivot[1];
    piece.rows.forEach((row, r) => {
      if (oy + r < ny) return;
      for (let c = 0; c < row.length; c++) if (row[c] !== '.' && ox + c >= nx - 7 + skipBack) add(ox + c, oy + r);
    });
    return out;
  }
  faceLeft(g).forEach((row, r) => {
    for (let c = skipBack; c < row.length; c++) if (row[c] !== '.') add(nx - 7 + c, ny + r);
  });
  main.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) if (row[c] !== '.') add(nx + c, ny + r);
  });
  return out;
}

/**
 * Fine-pixel anchors of the face: the template's first column and its lash row (nx, ny), and where
 * the near and far eyes' lashes start (ex, fx; the mouth's columns count from ex too). The owner's
 * heads have their eyes where he painted them: Aiden's ('valiant') the near one a column further in,
 * the far one closer to it, against his far cheek; his princess's ('noble') the near one where ours
 * is, the far one a column closer, against her narrower far cheek.
 * hy is the head's own row, the lash row of every face shape but hers: her face sits a row higher
 * (ny = hy - 1), so her chin meets her high collar and her eyes sit under her bangs as he drew them
 * (her hair, tiara and gown ride hy and the torso, his pixels at the same offset as her face).
 */
export function faceAnchor(g: DrawCtx): { nx: number; ny: number; ex: number; fx: number; fy: number; hy: number } {
  const k = g.bp.headScale;
  const nx = Math.floor((g.rig.head.x - 1.9 * k) * RES);
  const hy = Math.floor((g.rig.head.y + 1.0 * k) * RES);
  const valiant = g.look.faceShape === 'valiant';
  const noble = g.look.faceShape === 'noble';
  const ny = noble ? hy - 1 : hy;
  return { nx, ny, ex: valiant ? nx + 1 : nx, fx: valiant || noble ? nx + 8 : nx + 9, fy: ny, hy };
}

function drawFace(g: DrawCtx): void {
  const L = g.L('head.body');
  const F = g.L('head.face');
  const { nx, ny, ex, fx } = faceAnchor(g);
  const sk = g.mats.ramps[g.skin];
  const sp = g.eyeSpecial;
  const female = isFemaleBody(g.rig.body);

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
  const closed = g.rig.pose === 'downed';
  // Reading: the lids come down over the eyes, the gaze lowered to the page.
  const lowered = g.rig.pose === 'read';
  // The owner's eyes ('valiant'): his pixels in each lid state, laid on the template's eye cells.
  const his = shape === 'valiant' ? VALIANT_EYES[closed ? 'closed' : lowered ? 'lowered' : 'open'] : undefined;
  // His princess's eyes ('noble'): her pixels in each lid state, on the template's eye cells and rows.
  const hers = shape === 'noble' ? NOBLE_EYES[closed ? 'closed' : lowered ? 'lowered' : 'open'] : undefined;
  const painted = his || hers;
  const eyes = painted ? { near: painted.near.letters, far: painted.far.letters } : closed ? CLOSED_EYES : lowered ? EYE_ROWS.calm : EYE_ROWS[shape] || EYE_ROWS.standard;
  const main = (FACE_MAIN[isFemaleBody(g.rig.body) ? 'female' : g.rig.body] || FACE_MAIN.male).map((row, r) => eyeRow(row, r, eyes));

  const put = (x: number, y: number, ch: string) => {
    if (ch === '.') return;
    if (ch in skinShade) L.set(x, y, g.skin, skinShade[ch], 'head', F_NO_OUTLINE);
    else if (ch in colors) L.set(x, y, colors[ch], 3, 'head', F_NO_OUTLINE);
  };
  if (paintedHead(g)) {
    // On the owner's heads the template gives only the eyes and (on Aiden's) the mouth, where he
    // painted his: his skin, shading and line stay wherever the template has skin. His princess's
    // head keeps her own mouth.
    const feature = (x: number, y: number, ch: string) => {
      if (!(ch in skinShade)) put(x, y, ch);
    };
    eyes.near.forEach((row, r) => [...row].forEach((ch, c) => feature(ex + c, ny + r, ch)));
    eyes.far.forEach((row, r) => [...row].forEach((ch, c) => feature(fx + c, ny + r, ch)));
    if (g.look.faceShape !== 'noble')
      main.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) if (row[c] === 'm' || row[c] === 'M') put(ex + c, ny + r, row[c]);
      });
  } else {
    faceLeft(g).forEach((row, r) => {
      for (let c = 0; c < row.length; c++) put(nx - 7 + c, ny + r, row[c]);
    });
    main.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) put(nx + c, ny + r, row[c]);
    });
  }
  const hairChoice = g.look.slots.hair;
  if (his) {
    // His pixels over the template's eye cells, on every face shape: his iris moves the way the eye
    // colour (or the clan's special eyes) moves our red, his brows the way the hair colour moves his
    // hair's brown; his lashes and whites stay as he painted them. Pale special eyes take the pale
    // tones ours take (his dark red the lighter, his red the lightest), so they read blank as ours do.
    const hair = hairChoice?.colors[0];
    const tone = (letter: string, hex: string) => {
      if (letter === 'd' || letter === 'i') return pale ? ir[letter === 'd' ? 3 : 4] : retintHex(hex, VALIANT_IRIS, iris);
      return letter === 'B' && hair ? retintHex(hex, VALIANT_BROW_HAIR, hair) : hex;
    };
    const stamp = (eye: PaintedEye, x0: number) =>
      eye.rows.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) if (row[c] !== '.') L.set(x0 + c, ny + r, flat(tone(eye.letters[r][c], VALIANT_EYE_COLORS[row[c]])), 3, 'head', F_NO_OUTLINE);
      });
    stamp(his.near, ex);
    stamp(his.far, fx);
  }
  if (hers) stampNobleEyes(g, L, F, ex, fx, ny, closed ? 'closed' : lowered ? 'lowered' : 'open', iris, pale ? { d: ir[3], i: ir[4] } : undefined);

  // Overlays drawn on the face layer (no outline, above the skin). His eyes open a row lower than
  // ours (his lash line is the template's second row): what sits on the open eye follows them.
  const set = (x: number, y: number, hex: string) => F.set(x, y, g.m(hex, 'flat'), 3, 'head', F_NO_OUTLINE);
  const lash = his ? ny + 1 : ny;
  if (hers) {
    // her lash's flick is her own pixel (stampNobleEyes)
  } else if (female && (closed || lowered)) {
    // the lashes of the closed or lowered lids
    set(ex - 1, ny + 1, EYELINE);
    set(ex - 1, ny + 2, EYELINE);
  } else if (female) {
    // longer lashes at the outer corners
    set(ex - 1, lash - 1, EYELINE);
    set(ex - 1, lash, EYELINE);
    set(fx + 3, lash, EYELINE);
  }
  // Special eye patterns (pupil marks on the red iris, veins, sage pigment); closed eyes show none.
  if (closed || lowered) {
    // nothing to see under the lids
  } else if ((sp === 'tomoe1' || sp === 'tomoe3' || sp === 'pinwheel') && his) {
    // His iris is a single row under the lash: the marks go on his dark red, the near eye's first and
    // past one tomoe the far eye's too, so the near eye's red still shows.
    set(ex + 2, ny + 2, '#14040a');
    if (sp !== 'tomoe1') set(fx + 1, ny + 2, '#14040a');
  } else if (sp === 'tomoe1' || sp === 'tomoe3' || sp === 'pinwheel') {
    set(ex + 2, ny + 1, '#14040a');
    if (sp !== 'tomoe1') set(ex + 3, ny + 2, '#14040a');
    if (sp === 'pinwheel') set(ex + 3, ny + 1, '#14040a');
    set(fx, ny + 1, '#14040a');
  }
  if (sp === 'paleVeins' && !closed && !lowered) {
    for (const [x, y] of [
      [ex - 1, lash + 1],
      [ex - 2, lash],
      [ex + 5, lash],
      [fx - 1, lash + 1],
    ])
      set(x, y, sk[1]);
  }
  if (sp === 'sage') {
    // the pigment on the lids, right above the lash line (his: over his brows, and only out to the
    // far eye's last column, the face's edge on that row)
    for (let x = -1; x <= 4; x++) set(ex + x, lash - 1, '#c2410c');
    for (let x = 0; x <= (his ? 2 : 3); x++) set(fx + x, lash - 1, '#c2410c');
    if (!closed && !lowered) {
      // the bar pupil (on his two-pixel iris only its dark half, so the gold still shows)
      set(ex + 2, ny + 2, '#120c18');
      if (!his) set(ex + 3, ny + 2, '#120c18');
    }
  }

  // Brows (hair-colored), two rows above the lash; most bangs cover them. His eyes bring their own,
  // and his princess's hers, on the row over her lash.
  if (his) return;
  if (hers) return stampNobleBrows(g, F, ex, fx, ny, hairChoice?.colors[0]);
  const br = makeRamp(hairChoice?.colors[0] || '#2a2230', 'hair');
  // Sharp and fierce eyes get brows angled down toward the nose.
  const sharp = shape === 'sharp' || shape === 'fierce';
  for (let x = 0; x <= 3; x++) set(ex + x, ny - 2 + (sharp && x >= 2 ? 1 : 0), br[1]);
  for (let x = 0; x <= 2; x++) set(fx + x, ny - 2 + (sharp && x === 0 ? 1 : 0), br[1]);
}
