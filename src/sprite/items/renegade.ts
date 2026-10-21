// The owner's Renegade: his paint-over of our Renegado 2 (docs/reference/renegade-owner-reference.jpg,
// 2026-10-21), his pixels for the hair (hair.ts), the cloth mask, the sleeveless tunic with his bare
// arms, the woven rope belt, the cargo trousers, the wrapped sandals and the kunai, lifted out by
// tools/refs/renegade-*-from-ref.py. His figure stands where our male's does at idle frame 0, so each
// piece hangs from our joint where he drew it: at rest every pixel is his, and other poses turn each
// piece with its limb (RotSprite), a lean of the torso shears it (armor.ts stampLeaning).
//
// His colours follow the colour slots (retintHex: at his base colour every pixel stays his), his skin
// follows the character's skin and his black line never changes. He drew them on the male body; on the
// bulky body (his broad man, body/bulky-v2) the same pieces are fitted to it, every pixel still his, by
// leaving out or repeating whole columns and rows of his (fit.ts), and its own arms (his broad man's)
// stay. The other bodies keep the items' own drawing.

import { faceAnchor } from '../body';
import { retintHex } from '../color';
import { armDepth, armJoints, Depth, DrawCtx, handPose, legDepth, legJoints, Side } from '../ctx';
import { centered, refit, uprightPiece } from '../fit';
import { PaintedPiece, segAngle, stampPiece } from '../painted';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, partIndex, PartId, RES, Vec } from '../raster';
import { BODY_PARAMS, type BodyParams } from '../rig';
import { stampTemplate, TemplatePalette } from '../rotsprite';
import { stampLeaning } from './armor';
import { BELT_BAND, BELT_ENDS, BELT_ENDS_PIECE, BELT_KIND, BELT_ROPE } from './ropeBeltArt';
import { CARGO_CLOTH, CARGO_KIND, CARGO_SEAT, CARGO_SHIN_F, CARGO_SHIN_N, CARGO_THIGH_F, CARGO_THIGH_N } from './cargoTrousersArt';
import { CLOTH_MASK, CLOTH_MASK_KIND, MASK_CLOTH } from './clothMaskArt';
import { KUNAI_KIND, KUNAI_PIECE, KUNAI_STEEL, KUNAI_WRAP } from './kunaiArt';
import { TUNIC_BODY, TUNIC_CLOTH, TUNIC_FIST_F, TUNIC_FIST_N, TUNIC_FORE_F, TUNIC_FORE_N, TUNIC_KIND, TUNIC_SKIN, TUNIC_UPPER_F, TUNIC_UPPER_N } from './sleevelessTopArt';
import { WRAP_CLOTH, WRAP_FOOT_F, WRAP_FOOT_N, WRAP_KIND, WRAP_SHIN_F, WRAP_SHIN_N, WRAP_SKIN } from './wrapSandalsArt';

export { BELT_ENDS, BELT_ROPE, CARGO_CLOTH, KUNAI_STEEL, KUNAI_WRAP, MASK_CLOTH, TUNIC_CLOTH, TUNIC_SKIN, WRAP_CLOTH };

type Tint = (ch: string, hex: string) => string;

/** His colours recoloured by kind: each kind in `to` moves from his base to the slot's colour; his line and the rest stay his. */
function tint(kinds: Record<string, string>, to: Record<string, [string, string]>): Tint {
  return (_ch, hex) => {
    const k = kinds[hex];
    const m = k && k !== 'line' ? to[k] : undefined;
    return m ? retintHex(hex, m[0], m[1]) : hex;
  };
}

const torsoAngle = (g: DrawCtx): number => segAngle(g.rig.pelvis, g.rig.neck);

/** The Renegade's pieces are drawn on the male body, the one he painted, and fitted to the bulky body. */
export const renegadeFits = (g: DrawCtx): boolean => g.rig.body === 'male' || g.rig.body === 'bulky';

const MALE = BODY_PARAMS.male;
const ratio = (g: DrawCtx, f: (b: BodyParams) => number): number => f(g.bp) / f(MALE);

/**
 * A piece riding the torso fitted to this body: as much wider on each side of its pivot (and longer below
 * it) as this body's torso is than the male's. On the male body, his piece as he drew it.
 */
function torsoFit(g: DrawCtx, p: PaintedPiece, key: string, f: { left: (b: BodyParams) => number; right: (b: BodyParams) => number; down?: (b: BodyParams) => number }): PaintedPiece {
  if (g.rig.body === 'male') return p;
  return refit(p, { left: ratio(g, f.left), right: ratio(g, f.right), down: f.down ? ratio(g, f.down) : 1 }, `RENEGADE_${key}@${g.rig.body}`);
}

/**
 * A limb piece fitted to this body: turned upright, as much wider as this body's limb is there, as much
 * longer (below the joint, or above it for a piece hanging from the ankle) as its bone, centred on the limb.
 */
function limbFit(g: DrawCtx, p: PaintedPiece, key: string, width: (b: BodyParams) => number, length?: (b: BodyParams) => number, above = false): PaintedPiece {
  if (g.rig.body === 'male') return p;
  const w = ratio(g, width);
  const l = length ? ratio(g, length) : 1;
  return centered(refit(uprightPiece(p), { left: w, right: w, ...(above ? { up: l } : { down: l }) }, `RENEGADE_${key}@${g.rig.body}`));
}

const tunicOn = (g: DrawCtx) => torsoFit(g, TUNIC_BODY, 'TUNIC', { left: (b) => b.shoulderHalf, right: (b) => b.chestHalf, down: (b) => b.torsoLen });
const beltOn = (g: DrawCtx) => torsoFit(g, BELT_BAND, 'BELT', { left: (b) => b.waistHalf, right: (b) => b.waistHalf });
const thighOn = (g: DrawCtx, s: Side) => limbFit(g, s === 'N' ? CARGO_THIGH_N : CARGO_THIGH_F, `THIGH_${s}`, (b) => b.legR[0], (b) => b.thigh);

/** The belt's hanging ends, moved out with the waist on a broader body (they hang from its side). */
function beltEndsOn(g: DrawCtx): PaintedPiece {
  if (g.rig.body === 'male') return BELT_ENDS_PIECE;
  const dx = Math.round((g.bp.waistHalf - MALE.waistHalf) * RES);
  return refit(BELT_ENDS_PIECE, { shift: [dx, 0] }, `RENEGADE_BELT_ENDS@${g.rig.body}`);
}

/**
 * Stamps a piece of his head (the mask) with its pivot on our face anchor, unscaled and unturned like
 * the hair templates, so it sits on the face as he drew it in every pose.
 */
function stampOnFace(g: DrawCtx, depth: Depth, p: PaintedPiece, color: Tint): void {
  const { nx, ny } = faceAnchor(g);
  const L = g.L(depth);
  const pens: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(p.colors)) pens[ch] = g.m(color(ch, hex), 'flat');
  p.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') L.set(nx - p.pivot[0] + i, ny - p.pivot[1] + j, pens[row[i]], 3, 'head', F_NO_TEXTURE | F_NO_OUTLINE);
  });
}

/** His cloth mask over the lower face, its point hanging over the collar. */
export function drawClothMaskPiece(g: DrawCtx, cloth: string): void {
  stampOnFace(g, 'head.mask', CLOTH_MASK, tint(CLOTH_MASK_KIND, { cloth: [MASK_CLOTH, cloth] }));
}

/**
 * His fist, turned and mirrored as our hand template would be (ctx.ts handDraw), while the hand is
 * shaped as he drew it: the near one round a grip, the far one closed. In other shapes (open, signs)
 * our hand shows.
 */
function stampFist(g: DrawCtx, s: Side, p: PaintedPiece, color: Tint): void {
  const hp = handPose(g, s);
  if (hp.kind !== (s === 'N' ? 'grip' : 'fist')) return;
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(p.colors)) pal[ch] = [g.m(color(ch, hex), 'flat'), 3];
  stampTemplate(g.L(armDepth(s, 'cloth')), p, armJoints(g.rig, s).wrist, hp.rot, pal, s === 'N' ? 'handN' : 'handF', { flipX: hp.flipX, flags: F_NO_TEXTURE | F_NO_OUTLINE });
}

/** Where a piece lands, stamped as `stamp` stamps it: a scratch layer of its pixels. */
function footprint(g: DrawCtx, stamp: (on: DrawCtx) => void): Layer {
  const scratch = new Layer(false);
  stamp({ ...g, L: () => scratch });
  return scratch;
}

const black = () => '#000000';

/**
 * Our torso (its skin, and the drawn tunic and trousers' waistband under his) trimmed to his tunic:
 * on each row past his tunic's far edge (or his belt's, on the belt's rows), where our torso is a
 * pixel broader than his and his far arm's line shows; and the drawn tunic below his hem. The near
 * side is not trimmed: his tunic is hidden there under the near arm, which shows our torso when it
 * swings away.
 */
function trimTorso(g: DrawCtx): void {
  const r = g.rig;
  const tunic = footprint(g, (on) => stampLeaning(on, 'torso.top', tunicOn(g), r.neck, torsoAngle(g), 'torso', black));
  const belt = footprint(g, (on) => stampLeaning(on, 'waist', beltOn(g), r.pelvis, torsoAngle(g), 'torso', black));
  const far = new Int16Array(GRID).fill(-1);
  const low = new Int16Array(GRID).fill(-1);
  for (let i = 0; i < GRID * GRID; i++) {
    const x = i % GRID;
    const y = Math.floor(i / GRID);
    if (tunic.mat[i] >= 0 || belt.mat[i] >= 0) far[y] = Math.max(far[y], x);
    if (tunic.mat[i] >= 0) low[x] = Math.max(low[x], y);
  }
  // His hem: the columns whose tunic reaches within a few rows of its lowest row.
  const hem = Math.max(...low) - 4;
  const torso = partIndex('torso');
  for (const d of ['torso.body', 'torso.bottom', 'torso.top'] as Depth[]) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || L.part[i] !== torso) continue;
      const x = i % GRID;
      const y = Math.floor(i / GRID);
      if ((far[y] >= 0 && x > far[y]) || (d === 'torso.top' && low[x] >= hem && y > low[x])) L.mat[i] = -1;
    }
  }
}

/**
 * Our far thigh (its skin and the drawn trousers under his) trimmed to his: above his far leg in each
 * column, where the top of our thigh would cover his far forearm's line.
 */
function trimFarThigh(g: DrawCtx): void {
  const { hip, knee } = legJoints(g.rig, 'F');
  const leg = footprint(g, (on) => stampPiece(on, 'farLeg.cloth', thighOn(g, 'F'), hip, segAngle(hip, knee), 'thighF', black));
  const top = new Int16Array(GRID).fill(-1);
  for (let i = GRID * GRID - 1; i >= 0; i--) if (leg.mat[i] >= 0) top[i % GRID] = Math.floor(i / GRID);
  const thigh = partIndex('thighF');
  for (const d of ['farLeg.body', 'farLeg.cloth'] as Depth[]) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && L.part[i] === thigh && top[i % GRID] >= 0 && Math.floor(i / GRID) < top[i % GRID]) L.mat[i] = -1;
  }
}

/**
 * His sleeveless tunic over the torso and his bare arms: each upper arm about its shoulder, each
 * forearm about its elbow, each fist about its wrist. His skin follows the character's. The bulky body
 * keeps its own arms (his broad man's).
 */
export function drawTunicPieces(g: DrawCtx, cloth: string): void {
  const r = g.rig;
  const color = tint(TUNIC_KIND, { cloth: [TUNIC_CLOTH, cloth], skin: [TUNIC_SKIN, g.look.skin] });
  trimTorso(g);
  stampLeaning(g, 'torso.top', tunicOn(g), r.neck, torsoAngle(g), 'torso', color);
  if (r.body !== 'male') return;
  const arms: [Side, PaintedPiece, PaintedPiece, PaintedPiece][] = [
    ['F', TUNIC_UPPER_F, TUNIC_FORE_F, TUNIC_FIST_F],
    ['N', TUNIC_UPPER_N, TUNIC_FORE_N, TUNIC_FIST_N],
  ];
  for (const [s, upper, fore, fist] of arms) {
    const j = armJoints(r, s);
    stampPiece(g, armDepth(s, 'cloth'), upper, j.shoulder, segAngle(j.shoulder, j.elbow), s === 'N' ? 'upperArmN' : 'upperArmF', color);
    stampPiece(g, armDepth(s, 'cloth'), fore, j.elbow, segAngle(j.elbow, j.wrist), s === 'N' ? 'forearmN' : 'forearmF', color);
    stampFist(g, s, fist, color);
  }
}

/** His woven rope band round the waist and the knot's hanging ends, riding the torso. */
export function drawRopeBeltPieces(g: DrawCtx, rope: string, ends: string): void {
  const r = g.rig;
  stampLeaning(g, 'waist', beltEndsOn(g), r.pelvis, torsoAngle(g), 'torso', tint(BELT_KIND, { cloth: [BELT_ENDS, ends] }));
  stampLeaning(g, 'waist', beltOn(g), r.pelvis, torsoAngle(g), 'torso', tint(BELT_KIND, { cloth: [BELT_ROPE, rope] }));
}

/** His cargo trousers: the seat riding the torso, each thigh about its hip and each shin about its knee. */
export function drawCargoPieces(g: DrawCtx, cloth: string): void {
  const r = g.rig;
  const color = tint(CARGO_KIND, { cloth: [CARGO_CLOTH, cloth] });
  trimFarThigh(g);
  for (const s of ['F', 'N'] as Side[]) {
    const { hip, knee, ankle } = legJoints(r, s);
    const shin = limbFit(g, s === 'N' ? CARGO_SHIN_N : CARGO_SHIN_F, `SHIN_${s}`, (b) => b.legR[2], (b) => b.shin);
    stampPiece(g, legDepth(s, 'cloth'), thighOn(g, s), hip, segAngle(hip, knee), `thigh${s}` as PartId, color);
    stampPiece(g, legDepth(s, 'cloth'), shin, knee, segAngle(knee, ankle), `shin${s}` as PartId, color);
  }
  const seat = torsoFit(g, CARGO_SEAT, 'SEAT', { left: (b) => b.hipHalf, right: (b) => b.hipHalf });
  stampLeaning(g, 'torso.bottom', seat, r.pelvis, torsoAngle(g), 'pelvis', color);
}

/** His wrapped sandals: each shin's wraps turn with the shin about the ankle, each sandal stays flat on the ground. */
export function drawWrapSandalPieces(g: DrawCtx, wrap: string): void {
  const color = tint(WRAP_KIND, { cloth: [WRAP_CLOTH, wrap], skin: [WRAP_SKIN, g.look.skin] });
  const legs: [Side, PaintedPiece, PaintedPiece][] = [
    ['F', WRAP_SHIN_F, WRAP_FOOT_F],
    ['N', WRAP_SHIN_N, WRAP_FOOT_N],
  ];
  for (const [s, shin0, foot0] of legs) {
    const { knee, ankle } = legJoints(g.rig, s);
    const shin = limbFit(g, shin0, `WRAP_SHIN_${s}`, (b) => b.legR[2], undefined, true);
    // The sandal stays flat on the ground: as much broader as this body's foot is longer.
    const foot = g.rig.body === 'male' ? foot0 : refit(foot0, { left: ratio(g, (b) => b.footLen), right: ratio(g, (b) => b.footLen) }, `RENEGADE_WRAP_FOOT_${s}@${g.rig.body}`);
    stampPiece(g, legDepth(s, 'feet'), shin, ankle, segAngle(knee, ankle), `shin${s}` as PartId, color);
    stampPiece(g, legDepth(s, 'feet'), foot, ankle, foot.angle, `foot${s}` as PartId, color);
  }
}

/**
 * His kunai with its pivot on `at` (where the grip passes through the fist) pointing along `deg`: at
 * our idle blade's angle (52) every pixel is his. Pointing back past straight up or down it is
 * mirrored, as drawPaintedWeapon does, so the ring stays on the fist's back.
 */
export function drawKunaiPiece(g: DrawCtx, depth: Depth, at: Vec, deg: number, steel: string, wrap: string): void {
  const color = tint(KUNAI_KIND, { metal: [KUNAI_STEEL, steel], rust: [KUNAI_WRAP, wrap] });
  const a = ((deg % 360) + 540) % 360 - 180;
  const flip = Math.abs(a) > 90;
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(KUNAI_PIECE.colors)) pal[ch] = [g.m(color(ch, hex), 'flat'), 3];
  stampTemplate(g.L(depth), KUNAI_PIECE, at, flip ? a + KUNAI_PIECE.angle : a - KUNAI_PIECE.angle, pal, 'held', { flipY: flip, flags: F_NO_TEXTURE | F_NO_OUTLINE });
}
