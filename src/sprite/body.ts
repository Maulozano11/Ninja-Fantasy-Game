// Base human: skin body, head, face and eyes. Clothing is layered on top by
// the item catalog; the base keeps simple undergarments so the mannequin is
// always presentable.
//
// Geometry is in design units (64 space); face details are placed as single
// fine pixels (RES per design unit) for 128x128 detail.

import { hexToRgb, hslToHex, isLine, makeRamp, mixHex, retintHex, retintSkinLifted, rgbToHsl } from './color';
import { armJoints, armPoint, armRadius, armSpan, Depth, DrawCtx, fillTorso, FOOT_BARE, footDraw, handDraw, handPose, legJoints, legSpan, Side, torsoPoly } from './ctx';
import { type BasePiece, FEMALE_BASE, FEMALE_BASE_CLOTH, FEMALE_BASE_JOINTS, FEMALE_BASE_SKIN } from './femaleBaseArt';
import { FEMALE_SHOULDER_N } from './femaleBodyArt';
import { type PaintedEye, VALIANT_BROW_HAIR, VALIANT_EYE_COLORS, VALIANT_EYES, VALIANT_IRIS } from './eyeArt';
import { VALIANT_HEAD, VALIANT_SKIN } from './headArt';
import { NIGHT_EYE_COLORS, NIGHT_EYES, NIGHT_IRIS } from './nightEyeArt';
import { NIGHT_HEAD, NIGHT_SKIN } from './nightHeadArt';
import { type PaintedPiece, segAngle, skinTone, stampPiece } from './painted';
import { DAWN_HAND_FIST, DAWN_HAND_LINE, DAWN_HAND_NEAR, DAWN_HAND_SKIN } from './aureliaHandsArt';
import { DAWN_EYE_COLORS, DAWN_EYES, DAWN_IRIS } from './aureliaEyeArt';
import { FOUNDER_FACE_KIND, FOUNDER_HEAD, FOUNDER_IRIS, FOUNDER_SKIN } from './founderFaceArt';
import { KEEN_BROW_HAIR, KEEN_BROWS, KEEN_EYE_COLORS, KEEN_EYES, KEEN_IRIS } from './lyraEyeArt';
import { LONG_NAPE, LONG_NECK_BACK, LONG_NECK_W } from './neck';
import { LYRA_FACE_FAR_LINE, lyraFaceCells, stampLyraFace } from './lyraFace';
import { AURELIA_FACE, AURELIA_FACE_FAR_EYE, AURELIA_FACE_FAR_LINE, AURELIA_FACE_LINE, AURELIA_FACE_SKIN } from './aureliaFaceArt';
import { AURELIA_NECK_BACK, bodyHead, onAureliaHead } from './aureliaHead';
import { LYRA_FACE_FAR_EYE } from './lyraFaceArt';
import { drawOwner, slotTint } from './ownerFrames';
import { rotateTemplate, stampTemplate, type TemplatePalette } from './rotsprite';
import { ROMAN_EYE_COLORS, ROMAN_EYES, ROMAN_IRIS } from './romanEyeArt';
import { ROMAN_HEAD, ROMAN_SKIN } from './romanHeadArt';
import { drawRomanNeck } from './romanNeck';
import { ballShade, capsule, ellipse, F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, PartId, Pen, poly, RES, seam, v, Vec } from './raster';
import { SAYA_EYE_CELLS, SAYA_EYE_COLORS, SAYA_EYES, SAYA_IRIS } from './sayaEyeArt';
import { SAYA_FACE, SAYA_FACE_EYES, SAYA_FACE_LINE, SAYA_FACE_SKIN } from './sayaFaceArt';
import { type EyeShape, isFemaleBody, type FaceShape } from './types';

const SCLERA = '#f4f1ee';
const EYELINE = '#1b1420';

export function drawBody(g: DrawCtx): void {
  if (g.bp.fit) {
    drawBaseBody(g);
    return;
  }
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
    // His heroines' legs: flat skin with a shadow rim just inside the line (see flatSkin).
    if (isFemaleBody(r.body)) flatSkin(L, g.skin, s === 'F' ? 2 : 3);
    // Every footwear item draws its own foot (sandals and wraps with the toes in skin), so the
    // female bodies' short bare foot is left out under it rather than poking out past a boot's toe.
    if (!(isFemaleBody(r.body) && g.has('feet'))) footDraw(g, L, s, FOOT_BARE);
  }

  // Torso + neck
  const torso = g.L('torso.body');
  fillTorso(g, torso, 0, skin('torso'));
  if (isFemaleBody(r.body)) flatTorso(g, torso);
  else if (b.bust > 0) sculptTorso(g, torso, g.skin, 'skin');
  // The long neck (neck.ts) is the owner's heroines': slimmer, and set back under the chin as he drew it.
  const long = g.look.neck === 'long';
  const neckTop = v(r.head.x + 0.4 * b.headScale - (long ? LONG_NECK_BACK : 0), r.head.y + 4 * b.headScale);
  const neckW = long ? Math.min(b.neckW, LONG_NECK_W) : b.neckW;
  // (his is lit but for its far edge: a shade lighter, so it is lit where the chin's shadow falls on it)
  capsule(torso, r.neck, neckTop, neckW, neckW * 0.95, skin('torso'), long ? (x) => (x < r.neck.x + 0.2 ? 4 : 3) : (x) => (x < r.neck.x - 0.6 ? 3 : 2));
  // Nape: the back of the neck, from under the skull down to the shoulders.
  // It fills the gap behind the tapered jaw when the hair doesn't hang there;
  // hair drawn over the head still covers it. It starts well inside the
  // skull's back edge and stays in shadow: the slim nape of the owner's Aiden,
  // the one neck every character has (the owner, 2026-10-22, removed the thick one).
  const fa = faceAnchor(g);
  const napeX = (fa.nx - (long ? LONG_NAPE : 3.5)) / RES;
  poly(
    torso,
    [v(napeX, (fa.ny + 1) / RES), v(napeX, r.neck.y + 0.2), v(napeX - 0.8, r.neck.y + 1.2), v(r.neck.x, r.neck.y + 1.2), v(neckTop.x, (fa.ny + 1) / RES)],
    skin('torso'),
    long ? 4 : 2,
  );
  // Under the owner's Roman face on a male body, his neck (romanNeck.ts).
  drawRomanNeck(g);

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

// ---------------------------------------------------------------------------
// The owner's bare female body (femaleBaseArt.ts), piece by piece on the fitted rig.
// ---------------------------------------------------------------------------

/** A colour of his near-black line (never recoloured). */
const isInk = (hex: string): boolean => {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b < 22;
};

/**
 * The part above each joint: a piece's round cap over its joint is that part's pixels. A hand's cap of
 * the wrist stays the hand's: a sleeve that takes the forearm off past its cuff leaves the wrist on it.
 */
const CAP_OF: Partial<Record<PartId, PartId>> = {
  forearmN: 'upperArmN',
  forearmF: 'upperArmF',
  shinN: 'thighN',
  shinF: 'thighF',
  footN: 'shinN',
  footF: 'shinF',
};

/** The screen angle (degrees) the torso's up points at. */
const upAngle = (g: DrawCtx): number => (Math.atan2(g.rig.up.y, g.rig.up.x) * 180) / Math.PI;

/**
 * Stamps one of his body pieces with its pivot on `at`, its bone pointing along `deg`: at his angle
 * every pixel is his. His skin follows the character's skin (skinTone: in his own skin, his colour),
 * his line stays his, and his sports top and briefs take `cloth` (their colour slot) when it is given.
 * At rest every pixel is his as he drew it. In any other pose the layer's outline turns a pixel left on
 * its edge into his line: where the piece was cut from the next part of him and moved away from it, or
 * where turning it lost a pixel of his line, so no piece is ever left cut open. `only` = 'cloth'
 * stamps only the cloth (the sports top and briefs items draw it over the body in their colour).
 */
function stampBase(g: DrawCtx, depth: Depth, p: BasePiece, at: Vec, deg: number, part: PartId, cloth?: string, only?: 'cloth', bare = false, noCap = false): void {
  const L = g.L(depth);
  const rest = g.rig.pose === 'idle';
  const pal = new Map<string, [number, number, PartId]>();
  // A cap over the joint above is the upper piece's pixels: it counts as that part (a boot clears the
  // shin below the knee, not the thigh's round over it).
  const upper = CAP_OF[part] ?? part;
  for (const [ch, hex] of Object.entries(p.colors)) {
    const isCloth = p.cloth.includes(ch);
    if ((only === 'cloth' && !isCloth) || (noCap && p.cap.includes(ch))) continue;
    // `bare`: the sports top's straps off, his shoulder's skin under them
    const strap = bare ? p.straps?.[ch] : undefined;
    if (strap && only === 'cloth') continue;
    const c = strap ? skinTone(strap, FEMALE_BASE_SKIN, g.look.skin) : isCloth ? (cloth ? retintHex(hex, FEMALE_BASE_CLOTH, cloth) : hex) : isInk(hex) ? hex : skinTone(hex, FEMALE_BASE_SKIN, g.look.skin);
    pal.set(ch, [g.m(c, 'painted'), rest ? F_NO_OUTLINE | F_NO_TEXTURE : F_NO_TEXTURE, p.cap.includes(ch) ? upper : part]);
  }
  const ax = Math.floor(at.x * RES);
  const ay = Math.floor(at.y * RES);
  for (const q of rotateTemplate(p, deg - p.angle)) {
    const e = pal.get(q.ch);
    if (e) L.set(ax + q.dx, ay + q.dy, e[0], 3, e[2], e[1]);
  }
}

/**
 * His sports top (on the chest) or briefs (on the pelvis) in `color`, on the item's own layer over the
 * body's (items/clothes.ts: the sports top and briefs items). The body always wears them in his black.
 */
export function drawBaseCloth(g: DrawCtx, which: 'top' | 'bottom', color: string): void {
  if (!g.bp.fit) return;
  const r = g.rig;
  if (which === 'top') stampBase(g, 'torso.top', FEMALE_BASE.chest, r.neck, upAngle(g), 'torso', color, 'cloth');
  else stampBase(g, 'torso.bottom', FEMALE_BASE.pelvis, r.pelvis, upAngle(g), 'pelvis', color, 'cloth');
}

/**
 * The female bodies: his bare body (docs/reference/female-base-owner-reference.jpg) as his pieces on
 * the rig fitted to his joints, back to front as he drew it: the far arm behind everything, the far
 * leg, the near leg, the pelvis and chest over the legs, his neck on its way to the head, the head, and the near arm in front. Each limb
 * is upper piece, lower piece and hand or foot, the lower one over the upper with its round cap over the
 * joint. A hand turns with its forearm and a foot stands level under its ankle; under footwear the boot
 * draws the foot. His hands are his closed fists; a hand round a weapon's grip, pointing, open or
 * cradling a book is his heroines' small hand (handDraw), turned with the forearm too.
 */
function drawBaseBody(g: DrawCtx): void {
  const r = g.rig;
  const P = FEMALE_BASE;
  const arm = (s: Side) => {
    const j = armJoints(r, s);
    const depth: Depth = s === 'N' ? 'nearArm.body' : 'farArm.body';
    const fore = segAngle(j.elbow, j.wrist);
    stampBase(g, depth, s === 'N' ? P.upperArmN : P.upperArmF, j.shoulder, segAngle(j.shoulder, j.elbow), s === 'N' ? 'upperArmN' : 'upperArmF');
    const forePiece = s === 'N' ? P.forearmN : P.forearmF;
    stampBase(g, depth, forePiece, j.elbow, fore, s === 'N' ? 'forearmN' : 'forearmF');
    // A forearm longer than his (a look's longer arms, rig.ts solveFit) is his forearm drawn on along
    // the bone by the difference, without its cap of the elbow: his own pixels, the wrist further out.
    const hisFore = Math.hypot(...([0, 1] as const).map((k) => FEMALE_BASE_JOINTS[`wrist${s}`][k] - FEMALE_BASE_JOINTS[`elbow${s}`][k])) / RES;
    const extra = Math.hypot(j.wrist.x - j.elbow.x, j.wrist.y - j.elbow.y) - hisFore;
    if (extra > 0.25) {
      const k = extra / Math.hypot(j.wrist.x - j.elbow.x, j.wrist.y - j.elbow.y);
      const on = v(j.elbow.x + (j.wrist.x - j.elbow.x) * k, j.elbow.y + (j.wrist.y - j.elbow.y) * k);
      stampBase(g, depth, forePiece, on, fore, s === 'N' ? 'forearmN' : 'forearmF', undefined, undefined, false, true);
    }
    const kind = handPose(g, s).kind;
    // (his Lyra's open far hand, the 'long' arms, is his small hand: ctx.ts handPose)
    const longFar = s === 'F' && g.look.arms === 'long';
    if ((kind === 'fist' || kind === 'relaxed') && g.look.hands === 'small' && !longFar) smallHand(g, depth, s, kind, j.wrist, fore);
    else if (kind === 'fist' || (kind === 'relaxed' && !longFar)) stampBase(g, depth, s === 'N' ? P.handN : P.handF, j.wrist, fore, s === 'N' ? 'handN' : 'handF');
    else {
      // his wrist under the small hand, so it stays on the forearm
      stampBase(g, depth, s === 'N' ? P.wristN : P.wristF, j.wrist, fore, s === 'N' ? 'handN' : 'handF');
      handDraw(g, g.L(depth), s, { mat: g.skin, part: s === 'N' ? 'handN' : 'handF', bias: s === 'F' ? -1 : 0 });
    }
  };
  const leg = (s: Side) => {
    const j = legJoints(r, s);
    const depth: Depth = s === 'N' ? 'nearLeg.body' : 'farLeg.body';
    stampBase(g, depth, s === 'N' ? P.thighN : P.thighF, j.hip, segAngle(j.hip, j.knee), s === 'N' ? 'thighN' : 'thighF');
    stampBase(g, depth, s === 'N' ? P.shinN : P.shinF, j.knee, segAngle(j.knee, j.ankle), s === 'N' ? 'shinN' : 'shinF');
    // Every footwear item draws its own foot.
    if (!g.has('feet')) stampBase(g, depth, s === 'N' ? P.footN : P.footF, j.ankle, 0, s === 'N' ? 'footN' : 'footF');
  };
  arm('F');
  leg('F');
  leg('N');
  const up = upAngle(g);
  stampBase(g, 'torso.body', P.pelvis, r.pelvis, up, 'pelvis');
  // Under a top or armour of another kind his sports top's straps come off: a dress with bare shoulders
  // shows his shoulders, not the straps (the rest of the top stays under it).
  const worn = (slot: 'armor' | 'top') => g.has(slot) && !g.look.slots[slot]!.id.endsWith('_none');
  const dressed = worn('armor') || (worn('top') && !g.has('top', 'top_sports_bra'));
  stampBase(g, 'torso.body', P.chest, r.neck, up, 'torso', undefined, undefined, dressed);
  // His neck rides the bone from its foot to the head, so a head pitched forward (the throw) takes the
  // neck with it. The rig keeps the head at his neck's length in every pose (rig.ts solveFit,
  // PoseFrame.neckPitch), so his neck is only turned, never drawn longer.
  // (Aurelia's face carries her head higher than the body's, aureliaHead.ts: his neck turns toward the body's
  // own head, as on every female body, under her collar and chin.)
  const neckL = g.L('torso.body');
  const was = onAureliaHead(g.look) ? { mat: neckL.mat.slice(), shade: neckL.shade.slice(), part: neckL.part.slice(), flags: neckL.flags.slice() } : undefined;
  const own = bodyHead(r, g.look);
  stampBase(g, 'torso.body', P.neck, r.neck, segAngle(r.neck, own), 'torso');
  if (was) {
    // Her head stands higher (aureliaHead.ts): his neck is drawn on up to it, so it closes the space between her
    // chin and her collar in every pose (at rest her collar and chin cover it, as he drew her).
    stampBase(g, 'torso.body', P.neck, v(r.neck.x + r.head.x - own.x, r.neck.y + r.head.y - own.y), segAngle(r.neck, own), 'torso');
    // He drew her neck slimmer than his bare woman's: behind her near lock (his column 47 on, four before
    // the near eye's) is the gap between her lock and her bun, so his neck stops there.
    const { nx, ny } = faceAnchor(g);
    for (let i = 0; i < GRID * GRID; i++) {
      if (neckL.mat[i] === was.mat[i] && neckL.shade[i] === was.shade[i]) continue;
      const dx = (i % GRID) - nx;
      const dy = Math.floor(i / GRID) - ny;
      if (dx * r.right.x + dy * r.right.y < AURELIA_NECK_BACK) {
        neckL.mat[i] = was.mat[i];
        neckL.shade[i] = was.shade[i];
        neckL.part[i] = was.part[i];
        neckL.flags[i] = was.flags[i];
      }
    }
  }
  drawHead(g);
  arm('N');
}

/**
 * The 'small' hands (appearance `hands`): his Aurelia's (aureliaHandsArt.ts, by
 * tools/refs/aurelia-hands-from-ref.py), smaller than his bare woman's, in place of his open hand and fist:
 * her open near hand hangs from the near wrist, her fist closes either arm's. His skin follows the body's
 * skin, his line stays his; on her at rest every pixel is his, where he drew it.
 */
function smallHand(g: DrawCtx, depth: Depth, s: Side, kind: 'fist' | 'relaxed', wrist: Vec, deg: number): void {
  const piece = s === 'N' && kind === 'relaxed' ? DAWN_HAND_NEAR : DAWN_HAND_FIST;
  const L = g.L(depth);
  const part: PartId = s === 'N' ? 'handN' : 'handF';
  const line = g.m(DAWN_HAND_LINE, 'flat');
  const mat = new Map(Object.entries(piece.colors).map(([ch, hex]) => [ch, hex === DAWN_HAND_LINE ? line : g.m(skinTone(hex, DAWN_HAND_SKIN, g.look.skin), 'flat')]));
  const ax = Math.floor(wrist.x * RES);
  const ay = Math.floor(wrist.y * RES);
  const cells = rotateTemplate(piece, deg - piece.angle).filter((q) => mat.has(q.ch));
  const at = new Set(cells.map((q) => (ay + q.dy) * GRID + ax + q.dx));
  for (const q of cells) {
    const x = ax + q.dx;
    const y = ay + q.dy;
    // turned, a pixel of his skin left on the hand's edge (where his cuff closed it at rest) is his line
    const open = g.rig.pose !== 'idle' && [-1, 1, -GRID, GRID].some((d) => !at.has(y * GRID + x + d));
    L.set(x, y, open ? line : mat.get(q.ch)!, 3, part, F_NO_OUTLINE | F_NO_TEXTURE);
  }
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
  if (isFemaleBody(g.rig.body)) {
    // The owner paints his heroines' arms flat: no muscle lines (see flatSkin). The near shoulder
    // is his: Aurelia's bare shoulder (femaleBodyArt.ts), turned with the upper arm.
    flatSkin(L, upper.mat, s === 'F' ? 2 : 3);
    // His shoulder is the round of a hanging arm: turned far from his angle (an arm raised, swung
    // across the chest or flung back) its line falls inside the arm and the torso and its round
    // stands off the body, so there the shoulder is the body's own round, outlined like the rest.
    const j = armJoints(g.rig, s);
    const P = FEMALE_SHOULDER_N;
    const turn = ((segAngle(j.shoulder, j.elbow) - P.angle + 540) % 360) - 180;
    if (s === 'N' && Math.abs(turn) <= SHOULDER_TURN) {
      const pal: TemplatePalette = { o: [upper.mat, 0], D: [upper.mat, 1], s: [upper.mat, 2], b: [upper.mat, 3] };
      stampTemplate(L, P, j.shoulder, turn, pal, upper.part, { flags: F_NO_OUTLINE | F_NO_TEXTURE });
    }
    return;
  }
  muscleLine(g, L, s, upper.mat, 0.22, 0.72, 0.42, 1);
  muscleLine(g, L, s, fore.mat, 1.06, 1.58, 0.4, 1);
  despeckle(L, upper.mat);
}

/** How far (degrees) the near upper arm may turn from his before his shoulder piece is left out (see drawArm). */
export const SHOULDER_TURN = 30;

/**
 * Skin painted the way the owner paints his heroines (his game-scale pictures: Aurelia's and Saya's
 * bare shoulders, Lyra's thighs): one flat tone (`base`) inside a rim one shade darker, the pixel
 * just inside the line all round. A pixel on the silhouette's edge becomes the line in the layer's
 * outline pass, so the rim is the pixel next to it. Hands, feet and his painted pieces
 * (F_NO_TEXTURE) keep their own pixels.
 */
function flatSkin(L: Layer, mat: number, base: number): void {
  const own = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID && y < GRID && L.mat[y * GRID + x] === mat;
  const edge = (x: number, y: number) => own(x, y) && !(own(x + 1, y) && own(x - 1, y) && own(x, y + 1) && own(x, y - 1));
  const out: [number, number][] = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const i = y * GRID + x;
      if (L.mat[i] !== mat || L.shade[i] === 0 || L.flags[i] & F_NO_TEXTURE || edge(x, y)) continue;
      const rim = edge(x + 1, y) || edge(x - 1, y) || edge(x, y + 1) || edge(x, y - 1);
      out.push([i, rim ? base - 1 : base]);
    }
  }
  for (const [i, sh] of out) L.shade[i] = sh;
}

/**
 * The female torso's bare skin, the owner's way (see flatSkin): flat, with his shadow only where a
 * form turns under: a soft crease under the bust and the navel.
 */
function flatTorso(g: DrawCtx, L: Layer): void {
  flatSkin(L, g.skin, 3);
  const { forms } = bustForms(g);
  for (let fy = 0; fy < GRID; fy++) {
    for (let fx = 0; fx < GRID; fx++) {
      const i = fy * GRID + fx;
      if (L.mat[i] !== g.skin || L.shade[i] === 0) continue;
      const [lx, ly] = torsoLocal(g, (fx + 0.5) / RES, (fy + 0.5) / RES);
      const under = forms.some(([cx, cy, rx, ry]) => {
        const u = (lx - cx) / rx;
        return Math.abs(u) < 0.8 && Math.abs(ly - (cy - ry * 0.95 + 0.9 * u * u)) < 0.3;
      });
      if (under) L.reshade(fx, fy, 2);
    }
  }
  const n = g.rig.T(1.5, (g.bp.waistY ?? 5.4) - 1.2);
  const nx = Math.floor(n.x * RES);
  const ny = Math.floor(n.y * RES);
  if (L.has(nx, ny) && L.mat[ny * GRID + nx] === g.skin) L.reshade(nx, ny, 2);
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
    const r = armRadius(g, t, s);
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
 * The owner's heads, his pixels (face shapes 'valiant', from his Aiden, 'night', from his Ren, and 'roman', from his Roman): the
 * head, the skin he painted it in, where his eyes sit from the face anchor's column (the near eye's
 * first column and the far eye's), and whether the face template draws its mouth on it (his Ren and Roman
 * heads have their own mouths). `neckRows`: his bottom rows that are the top of the neck under the chin, left off
 * when the head is turned forward on the neck (Rig.neckPitch), where his collar no longer covers them.
 */
interface PaintedHead {
  head: PaintedPiece;
  skin: string;
  ex: number;
  fx: number;
  mouth: boolean;
  neckRows?: number;
  /** How his skin follows the character's: his Roman face as his skin on the male limbs does, so they match. */
  tint: (hex: string, from: string, to: string) => string;
}
const PAINTED_HEADS: Partial<Record<FaceShape, PaintedHead>> = {
  valiant: { head: VALIANT_HEAD, skin: VALIANT_SKIN, ex: 1, fx: 8, mouth: true, tint: skinTone },
  // His Roman face (src/sprite/romanHeadArt.ts): its eyes where his Aiden head has them, his own mouth.
  roman: { head: ROMAN_HEAD, skin: ROMAN_SKIN, ex: 1, fx: 8, mouth: false, tint: retintSkinLifted },
  // His Ren's last row is the top of his neck: with the head turned forward in the throw it hung under the
  // jaw on its own line (the owner: "la papada debajo del cuello esta mal").
  night: { head: NIGHT_HEAD, skin: NIGHT_SKIN, ex: 1, fx: 9, mouth: false, neckRows: 1, tint: skinTone },
};
const paintedHead = (g: DrawCtx): PaintedHead | undefined => (g.look.faceShape ? PAINTED_HEADS[g.look.faceShape] : undefined);

/** The owner's eyes, his pixels in each lid state ('valiant' from his Aiden, 'night' from his Ren, 'roman' from his Roman). */
interface PaintedEyes {
  eyes: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }>;
  colors: Record<string, string>;
  /** The eye colour his iris is painted in: the player's eye colour moves it as far. */
  iris: string;
  /** His hair colour his brows are painted in (the hair colour moves them), if he painted brows. */
  brow?: string;
}
const PAINTED_EYES: Partial<Record<EyeShape, PaintedEyes>> = {
  valiant: { eyes: VALIANT_EYES, colors: VALIANT_EYE_COLORS, iris: VALIANT_IRIS, brow: VALIANT_BROW_HAIR },
  night: { eyes: NIGHT_EYES, colors: NIGHT_EYE_COLORS, iris: NIGHT_IRIS },
  roman: { eyes: ROMAN_EYES, colors: ROMAN_EYE_COLORS, iris: ROMAN_IRIS },
};

function drawHead(g: DrawCtx): void {
  // Her face ('fine') in the owner's own frames of her (ownerFrames.ts): his face, eyes and neck there,
  // pixel for pixel, in the character's skin and eye colour; her hair covers the rest of the head.
  if (g.look.faceShape === 'fine' && drawOwner(g, 'face', (k, hex) => (k === 'eye' ? retintHex(hex, KEEN_IRIS, g.look.eyeColor) : slotTint({}, g.look.skin)(k, hex)))) return;
  const ph = paintedHead(g);
  if (ph) {
    drawPaintedHead(g, ph);
    drawFace(g);
    return;
  }
  if (g.look.faceShape === 'founder') {
    drawFounderHead(g);
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
  // Lyra's face ('fine') is narrower than the template: the skull stops short of his far face line, so
  // its outline runs on up from his line.
  if (g.look.faceShape === 'fine') for (let y = 0; y < ny; y++) for (let x = nx + LYRA_FACE_FAR_LINE; x < GRID; x++) L.mat[y * GRID + x] = -1;
  // Aurelia's face ('aurelia') too: the skull stops at his far line (her lash closes the face there).
  if (g.look.faceShape === 'aurelia') for (let y = 0; y < ny; y++) for (let x = nx + AURELIA_FACE_FAR_LINE; x < GRID; x++) L.mat[y * GRID + x] = -1;
  drawFace(g);
}

/**
 * The owner's head (face shapes 'valiant', 'night' and 'roman': src/sprite/headArt.ts, nightHeadArt.ts,
 * romanHeadArt.ts): his pixels from his Aiden or his Ren picture or his Roman paint-over, skull to chin,
 * stamped on the face anchor as they are, in the character's skin (PaintedHead.tint), his black line
 * keeping its colour in every skin. They are already the final on-screen pixels, so the head group's scale
 * does not touch them; the eye options draw the eyes on them (and on his Aiden head the face template draws
 * the brows and mouth) as on ours, and the hair covers the skull as it covers ours.
 */
function drawPaintedHead(g: DrawCtx, ph: PaintedHead): void {
  const { nx, ny } = faceAnchor(g);
  const at = v((nx + 0.5) / RES, (ny + 0.5) / RES);
  const head = ph.neckRows && g.rig.neckPitch !== undefined ? { ...ph.head, rows: ph.head.rows.slice(0, -ph.neckRows) } : ph.head;
  stampPiece(g, 'head.body', head, at, head.angle, 'head', (_ch, hex) => (isLine(hex) ? hex : ph.tint(hex, ph.skin, g.look.skin)));
}

/**
 * The owner's face on his Solen (face shape 'founder', src/sprite/founderFaceArt.ts): his pixels, skull to
 * chin, with his eyes and mouth, stamped on the face anchor as they are (he kept our face template's place).
 * His skin follows the character's skin as his Aiden head's does; his eyes' reds follow the eye colour. The
 * face template draws only what his picture does not show (closed or lowered lids, another eye shape, the
 * clans' special eyes: see drawFace).
 */
function drawFounderHead(g: DrawCtx): void {
  const { nx, ny } = faceAnchor(g);
  const at = v((nx + 0.5) / RES, (ny + 0.5) / RES);
  const iris = g.look.eyeColor || FOUNDER_IRIS;
  stampPiece(g, 'head.body', FOUNDER_HEAD, at, FOUNDER_HEAD.angle, 'head', (_ch, hex) => (FOUNDER_FACE_KIND[hex] === 'red' ? retintHex(hex, FOUNDER_IRIS, iris) : FOUNDER_FACE_KIND[hex] === 'line' || FOUNDER_FACE_KIND[hex] === 'white' ? hex : skinTone(hex, FOUNDER_SKIN, g.look.skin)));
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
 * (valiant, night, roman and founder, the owner's heads, are his pixels whole: see drawPaintedHead, drawFounderHead.)
 */
const FACE_LEFT: Record<Exclude<FaceShape, 'valiant' | 'night' | 'shade' | 'founder' | 'fine' | 'aurelia' | 'roman'>, string[]> = {
  tapered: ['osbbbbb', 'ossbbbb', '.osbbbb', '..osbbb', '...osbb', '....osb', '.....os', '......o', '.......', '.......'],
  soft: ['osbbbbb', 'ossbbbb', 'ossbbbb', '.osbbbb', '..osbbb', '...osbb', '....osb', '.....oo', '.......', '.......'],
  square: ['osbbbbb', 'ossbbbb', 'osDsbbb', 'ossbbbb', '.osbbbs', '..osbbs', '...osbs', '....ooo', '.......', '.......'],
};

const faceLeft = (g: DrawCtx): string[] => {
  const s = g.look.faceShape;
  // (Lyra's face, 'fine', has the default near cheek under her hair)
  return (s && s !== 'valiant' && s !== 'night' && s !== 'shade' && s !== 'founder' && s !== 'fine' && s !== 'aurelia' && s !== 'roman' && FACE_LEFT[s]) || FACE_LEFT.tapered;
};

/** Aurelia's face (aureliaFaceArt.ts) in fine pixels, its pivot on the face anchor. */
function aureliaFaceCells(nx: number, ny: number): { x: number; y: number; hex: string }[] {
  const out: { x: number; y: number; hex: string }[] = [];
  const [px, py] = AURELIA_FACE.pivot;
  AURELIA_FACE.rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) if (row[c] !== '.') out.push({ x: nx - px + c, y: ny - py + r, hex: AURELIA_FACE.colors[row[c]] });
  });
  return out;
}

/** Her face's lines: they stay his whatever the skin. */
const AURELIA_LINES = new Set([...AURELIA_FACE_LINE].map((ch) => AURELIA_FACE.colors[ch]));

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
  // The owner's Saya's eyes (src/sprite/sayaEyeArt.ts, from his picture at our scale) on our own
  // rows: her black lash turning down the outer corner, her whites and two blues under it.
  shade: SAYA_EYE_CELLS.open,
  // The owner's eyes on his Ren (src/sprite/nightEyeArt.ts): his lash line on the anchor row, his white
  // and blue iris in the two rows under it. Drawn in his pixels.
  night: { near: NIGHT_EYES.open.near.letters, far: NIGHT_EYES.open.far.letters },
  // Aurelia's eyes from the owner's game-scale picture (src/sprite/aureliaEyeArt.ts), his pixels on our
  // own cells and rows: his navy lash with its brown outer tip, his whites, his blue over light blues.
  dawn: { near: DAWN_EYES.open.near.letters, far: DAWN_EYES.open.far.letters },
  // The owner's Lyra's eyes (src/sprite/lyraEyeArt.ts), his pixels from his picture at our scale: two
  // rows like his Aiden's, her black lash over a single row of white and green iris; her brows right over it.
  keen: { near: KEEN_EYES.open.near.letters, far: KEEN_EYES.open.far.letters },
  // His Roman eyes (src/sprite/romanEyeArt.ts), where his Aiden eyes sit: a heavy black line, brow and
  // lash in one, and a single row of white and red iris under it. Drawn in his pixels.
  roman: { near: ROMAN_EYES.open.near.letters, far: ROMAN_EYES.open.far.letters },
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
  const ph = paintedHead(g);
  const head = g.look.faceShape === 'founder' ? FOUNDER_HEAD : ph?.head;
  if (head) {
    // The owner's head from the lash row down, from the column the other shapes' near side starts at.
    const ox = nx - head.pivot[0];
    const oy = ny - head.pivot[1];
    head.rows.forEach((row, r) => {
      if (oy + r < ny) return;
      for (let c = 0; c < row.length; c++) if (row[c] !== '.' && ox + c >= nx - 7 + skipBack) add(ox + c, oy + r);
    });
    return out;
  }
  faceLeft(g).forEach((row, r) => {
    for (let c = skipBack; c < row.length; c++) if (row[c] !== '.') add(nx - 7 + c, ny + r);
  });
  if (g.look.faceShape === 'shade') {
    // Saya's face from the lash row down (her cells), on the template's near cheek
    sayaFace(g, (x, y) => {
      if (y >= ny) add(x, y);
    });
    for (let r = 0; r < 8; r++) add(nx, ny + r);
    return out;
  }
  if (g.look.faceShape === 'aurelia') {
    // Aurelia's face from the lash row down: his pixels only (her near lock covers his near cheek).
    out.clear();
    for (const c of aureliaFaceCells(nx, ny)) if (c.y >= ny && c.x >= nx - 7 + skipBack) add(c.x, c.y);
    return out;
  }
  if (g.look.faceShape === 'fine') {
    // Lyra's face from the lash row down, over the template's near cheek.
    for (const c of lyraFaceCells(nx, ny)) if (c.y >= ny) add(c.x, c.y);
    return out;
  }
  main.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) if (row[c] !== '.') add(nx + c, ny + r);
  });
  return out;
}

/**
 * Fine-pixel anchors of the face: the template's first column and its lash row (nx, ny), and where
 * the near and far eyes' lashes start (ex, fx; the mouth's columns count from ex too). The owner's
 * heads ('valiant', 'night', 'roman') have their eyes where he painted them: the near one a column further in,
 * the far one (on his Aiden and his Roman) closer to it, against his far cheek.
 */
export function faceAnchor(g: DrawCtx): { nx: number; ny: number; ex: number; fx: number; fy: number } {
  const k = g.bp.headScale;
  const nx = Math.floor((g.rig.head.x - 1.9 * k) * RES);
  const ny = Math.floor((g.rig.head.y + 1.0 * k) * RES);
  const ph = paintedHead(g);
  // Saya's face ('shade') has her eyes where he drew them, her far one a cell nearer than the template's.
  // Lyra's face ('fine'): her far eye where he drew it, closer in on her narrower face.
  // (Aurelia's, 'aurelia': hers where he drew it too)
  const shade = g.look.faceShape === 'shade';
  const far = shade ? SAYA_FACE_EYES.far : g.look.faceShape === 'fine' ? LYRA_FACE_FAR_EYE : g.look.faceShape === 'aurelia' ? AURELIA_FACE_FAR_EYE : 9;
  return { nx, ny, ex: nx + (ph?.ex ?? (shade ? SAYA_FACE_EYES.near : 0)), fx: nx + (ph?.fx ?? far), fy: ny };
}

/**
 * Saya's face ('shade', src/sprite/sayaFaceArt.ts) cell by cell: its pivot on the face anchor, her
 * skin moved to the player's skin as Aiden's head is (in her own skin, her colours), her line kept.
 */
function sayaFace(g: DrawCtx, at: (x: number, y: number, hex: string) => void): void {
  const { nx, ny } = faceAnchor(g);
  const skin = g.look.skin || SAYA_FACE_SKIN;
  const ox = nx - SAYA_FACE.pivot[0];
  const oy = ny - SAYA_FACE.pivot[1];
  SAYA_FACE.rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      const hex = SAYA_FACE.colors[ch];
      at(ox + c, oy + r, ch === SAYA_FACE_LINE ? hex : skinTone(hex, SAYA_FACE_SKIN, skin));
    }
  });
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
  const lid = closed ? 'closed' : lowered ? 'lowered' : 'open';
  // The owner's eyes ('valiant', 'night', 'roman'): his pixels in each lid state, laid on the template's eye cells.
  const painted = PAINTED_EYES[shape];
  const his = painted?.eyes[lid];
  // Saya's eyes ('shade'): her pixels in each lid state, on the template's eye cells.
  const saya = shape === 'shade' ? SAYA_EYES[lid] : undefined;
  // Aurelia's eyes ('dawn'): her pixels in each lid state, on our own eye cells and rows.
  const hers = shape === 'dawn' ? DAWN_EYES[lid] : undefined;
  // Lyra's eyes ('keen'): her pixels in each lid state, on our own eye cells and rows.
  const lyra = shape === 'keen' ? KEEN_EYES[lid] : undefined;
  const own = his || hers || lyra;
  const eyes = own ? { near: own.near.letters, far: own.far.letters } : saya ? SAYA_EYE_CELLS[lid] : closed ? CLOSED_EYES : lowered ? EYE_ROWS.calm : EYE_ROWS[shape] || EYE_ROWS.standard;
  const main = (FACE_MAIN[isFemaleBody(g.rig.body) ? 'female' : g.rig.body] || FACE_MAIN.male).map((row, r) => eyeRow(row, r, eyes));

  const put = (x: number, y: number, ch: string) => {
    if (ch === '.') return;
    if (ch in skinShade) L.set(x, y, g.skin, skinShade[ch], 'head', F_NO_OUTLINE);
    else if (ch in colors) L.set(x, y, colors[ch], 3, 'head', F_NO_OUTLINE);
  };
  const ph = paintedHead(g);
  if (g.look.faceShape === 'shade') {
    // Saya's face (sayaFaceArt.ts): the template's near cheek under her side hair, then her own
    // pixels (skin, nose, mouth, jaw and line) in the player's skin. The eye options draw only their
    // eyes on it (her lash, whites and irises, or the template's): her skin stays round them.
    faceLeft(g).forEach((row, r) => {
      for (let c = 0; c < row.length; c++) put(nx - 7 + c, ny + r, row[c]);
    });
    for (let r = 0; r < 7; r++) put(nx, ny + r, r < 2 ? 'b' : 's');
    put(nx, ny + 7, 'o');
    sayaFace(g, (x, y, hex) => L.set(x, y, flat(hex), 3, 'head', F_NO_OUTLINE));
    eyes.near.forEach((row, r) => [...row].forEach((ch, c) => !saya && !(ch in skinShade) && put(ex + c, ny + r, ch)));
    eyes.far.forEach((row, r) => [...row].forEach((ch, c) => !saya && !(ch in skinShade) && put(fx + c, ny + r, ch)));
  } else if (g.look.faceShape === 'founder') {
    // His Solen's eyes and mouth are in his head's pixels. The template draws his eyes over only when
    // his picture does not show them: shut or lowered lids, another eye shape, the clans' special eyes
    // (in full, its skin letters in the character's skin, so his open eye never shows under a lid).
    if (closed || lowered || shape !== 'standard' || (sp && sp !== 'none')) {
      eyes.near.forEach((row, r) => [...row].forEach((ch, c) => put(ex + c, ny + r, ch)));
      eyes.far.forEach((row, r) => [...row].forEach((ch, c) => put(fx + c, ny + r, ch)));
    }
  } else if (ph) {
    // On the owner's head the template gives only the eyes and the mouth, where he painted his: his
    // skin, shading and line stay wherever the template has skin. His Roman face keeps his own mouth.
    const feature = (x: number, y: number, ch: string) => {
      if (!(ch in skinShade)) put(x, y, ch);
    };
    eyes.near.forEach((row, r) => [...row].forEach((ch, c) => feature(ex + c, ny + r, ch)));
    eyes.far.forEach((row, r) => [...row].forEach((ch, c) => feature(fx + c, ny + r, ch)));
    // his Ren and Roman heads have their own mouths
    if (ph.mouth)
      main.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) if (row[c] === 'm' || row[c] === 'M') put(ex + c, ny + r, row[c]);
      });
  } else if (g.look.faceShape === 'aurelia') {
    // Aurelia's face (aureliaFaceArt.ts): his pixels from the lash row down, her mouth his own; only the
    // eyes from the template, where he drew them (her far eye closer in: faceAnchor).
    for (const { x, y, hex } of aureliaFaceCells(nx, ny)) L.set(x, y, flat(AURELIA_LINES.has(hex) ? hex : skinTone(hex, AURELIA_FACE_SKIN, g.look.skin)), 3, 'head', F_NO_TEXTURE | F_NO_OUTLINE);
    for (const [side, x0] of [['near', ex], ['far', fx]] as const) {
      eyes[side].forEach((row, r) => [...row].forEach((ch, c) => !(ch in skinShade) && put(x0 + c, ny + r, ch)));
    }
  } else if (g.look.faceShape === 'fine') {
    // Lyra's face (lyraFace.ts): the template's near cheek where her hair hides hers, her pixels over
    // it, and only the eyes from the template (her mouth is her own).
    faceLeft(g).forEach((row, r) => {
      for (let c = 0; c < row.length; c++) put(nx - 7 + c, ny + r, row[c]);
    });
    stampLyraFace(g, L, nx, ny);
    for (const [side, x0] of [['near', ex], ['far', fx]] as const) {
      eyes[side].forEach((row, r) => [...row].forEach((ch, c) => !(ch in skinShade) && put(x0 + c, ny + r, ch)));
    }
  } else {
    faceLeft(g).forEach((row, r) => {
      for (let c = 0; c < row.length; c++) put(nx - 7 + c, ny + r, row[c]);
    });
    main.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) put(nx + c, ny + r, row[c]);
    });
  }
  const hairChoice = g.look.slots.hair;
  if (his && painted) {
    // His pixels over the template's eye cells, on every face shape: his iris moves the way the eye
    // colour (or the clan's special eyes) moves the colour he painted it in, his brows the way the hair
    // colour moves his hair's colour; his lashes and whites stay as he painted them. Pale special eyes
    // take the pale tones ours take (his dark iris the lighter, his bright iris the lightest), so they
    // read blank as ours do.
    const hair = hairChoice?.colors[0];
    const tone = (letter: string, hex: string) => {
      if (letter === 'd' || letter === 'i') return pale ? ir[letter === 'd' ? 3 : 4] : retintHex(hex, painted.iris, iris);
      return letter === 'B' && hair && painted.brow ? retintHex(hex, painted.brow, hair) : hex;
    };
    const stamp = (eye: PaintedEye, x0: number) =>
      eye.rows.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) if (row[c] !== '.') L.set(x0 + c, ny + r, flat(tone(eye.letters[r][c], painted.colors[row[c]])), 3, 'head', F_NO_OUTLINE);
      });
    stamp(his.near, ex);
    stamp(his.far, fx);
  }
  if (saya) {
    // Her pixels over the template's eye cells, on every face shape: her iris moves the way the eye
    // colour moves her blue (pale special eyes take our pale tones); her lash and whites stay hers.
    // Where her skin shows, the face's own skin stays, in the player's skin tone.
    const tone = (letter: string, hex: string) => (letter === 'd' || letter === 'i' ? (pale ? ir[letter === 'd' ? 3 : 4] : retintHex(hex, SAYA_IRIS, iris)) : hex);
    const stamp = (eye: PaintedEye, x0: number) =>
      eye.rows.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) if (row[c] !== '.') L.set(x0 + c, ny + r, flat(tone(eye.letters[r][c], SAYA_EYE_COLORS[row[c]])), 3, 'head', F_NO_OUTLINE);
      });
    stamp(saya.near, ex);
    stamp(saya.far, fx);
  }
  if (hers) {
    // Her pixels over the template's eye cells: her iris moves the way the eye colour moves her mid
    // blue (pale special eyes take our pale tones); her lash, whites and cream stay hers.
    const tone = (letter: string, hex: string) =>
      letter === 'd' || letter === 'i' ? (pale ? ir[letter === 'd' ? 3 : 4] : retintHex(hex, DAWN_IRIS, iris)) : hex;
    const stamp = (eye: PaintedEye, x0: number) =>
      eye.rows.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) if (row[c] !== '.') L.set(x0 + c, ny + r, flat(tone(eye.letters[r][c], DAWN_EYE_COLORS[row[c]])), 3, 'head', F_NO_OUTLINE);
      });
    stamp(hers.near, ex);
    stamp(hers.far, fx);
  }
  if (lyra) {
    // Her pixels over the template's eye cells: her iris moves the way the eye colour moves her green;
    // pale special eyes take our pale tones. Her lash and white stay his.
    const tone = (letter: string, hex: string) => (letter === 'd' || letter === 'i' ? (pale ? ir[letter === 'd' ? 3 : 4] : retintHex(hex, KEEN_IRIS, iris)) : hex);
    const stamp = (eye: PaintedEye, x0: number) =>
      eye.rows.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) if (row[c] !== '.') L.set(x0 + c, ny + r, flat(tone(eye.letters[r][c], KEEN_EYE_COLORS[row[c]])), 3, 'head', F_NO_OUTLINE);
      });
    stamp(lyra.near, ex);
    stamp(lyra.far, fx);
  }

  // Overlays drawn on the face layer (no outline, above the skin). His eyes open a row lower than
  // ours (his lash line is the template's second row): what sits on the open eye follows them.
  const set = (x: number, y: number, hex: string) => F.set(x, y, g.m(hex, 'flat'), 3, 'head', F_NO_OUTLINE);
  const lash = his ? ny + 1 : ny;
  if (saya) {
    // her lash turns down its own outer corner, open, lowered and closed: no lashes added
  } else if (lyra) {
    // her lashes are his pixels: no flick at the corners, open or shut
  } else if (female && (closed || lowered)) {
    // the lashes of the closed or lowered lids
    set(ex - 1, ny + 1, EYELINE);
    set(ex - 1, ny + 2, EYELINE);
  } else if (female && !hers) {
    // longer lashes at the outer corners (Aurelia's open lashes bring their own: his brown tip runs
    // down the outer corner and the far lash stops at the face's edge)
    set(ex - 1, lash - 1, EYELINE);
    set(ex - 1, lash, EYELINE);
    set(fx + 3, lash, EYELINE);
  }
  // Special eye patterns (pupil marks on the red iris, veins, sage pigment); closed eyes show none.
  if (closed || lowered) {
    // nothing to see under the lids
  } else if ((sp === 'tomoe1' || sp === 'tomoe3' || sp === 'pinwheel') && lyra) {
    // Lyra's iris is a single row under her lash (her green, then its dark): the marks go on it, the
    // far eye's dark green past one tomoe.
    set(ex + 2, ny + 1, '#14040a');
    if (sp !== 'tomoe1') set(fx + 1, ny + 1, '#14040a');
    if (sp === 'pinwheel') set(ex + 3, ny + 1, '#14040a');
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
      // the bar pupil (on his two-pixel iris only its dark half, so the gold still shows; on Lyra's
      // single row of iris, her dark green's cell)
      if (lyra) set(ex + 3, ny + 1, '#120c18');
      else set(ex + 2, ny + 2, '#120c18');
      if (!his && !lyra) set(ex + 3, ny + 2, '#120c18');
    }
  }

  // Brows (hair-colored), two rows above the lash; most bangs cover them. His eyes bring their own, and
  // his Solen's head has his brows in its pixels; Saya's face has none (he hid hers under her bangs, and her
  // forehead shows between them).
  if (his || g.look.faceShape === 'founder' || g.look.faceShape === 'shade') return;
  if (lyra) {
    // Hers: her pixels, long and slanting down to the inner corner, in her hair's reds moved the way the
    // hair colour moves her hair's mid red.
    const hair = hairChoice?.colors[0];
    for (const [side, x0] of [['near', ex], ['far', fx]] as const) {
      const { at, rows } = KEEN_BROWS[side];
      rows.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) {
          if (row[c] === '.') continue;
          const hex = KEEN_EYE_COLORS[row[c]];
          set(x0 + at[0] + c, ny + at[1] + r, hair ? retintHex(hex, KEEN_BROW_HAIR, hair) : hex);
        }
      });
    }
    return;
  }
  const br = makeRamp(hairChoice?.colors[0] || '#2a2230', 'hair');
  // Sharp and fierce eyes get brows angled down toward the nose.
  const sharp = shape === 'sharp' || shape === 'fierce';
  for (let x = 0; x <= 3; x++) set(ex + x, ny - 2 + (sharp && x >= 2 ? 1 : 0), br[1]);
  for (let x = 0; x <= 2; x++) set(fx + x, ny - 2 + (sharp && x === 0 ? 1 : 0), br[1]);
}
