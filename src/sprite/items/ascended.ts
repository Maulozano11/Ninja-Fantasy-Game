// The owner's Ascended set on the male bodies: his paint-over of our male in the Wrap Kimono, the Wide
// Hakama, the Cloth Sash, the Bandage Wraps and the Foot Wraps (docs/reference/ascended-owner-reference.jpg,
// 2026-10-21, the new standard), his pixels lifted out by tools/refs/ascended-*-from-ref.py. Each piece is
// pinned on our joint and turned rigidly with RotSprite as its limb turns: at rest every pixel is his and
// where he drew it, and in every pose the arms and legs are his sleeves, bandages, fists and hakama legs,
// never our default limb under them. The hair and the cloak are drawn in hair.ts and capes.ts.

import { retintHex } from '../color';
import { armDepth, armJoints, type Depth, DrawCtx, handDraw, legDepth, legJoints, Side } from '../ctx';
import { PaintedPiece, segAngle, stampPiece } from '../painted';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, partIndex, PartId, RES, Vec } from '../raster';
import type { BodyType } from '../types';
import { FOOTWRAPS_CLOTH, FOOTWRAPS_FOOT_F, FOOTWRAPS_FOOT_N, FOOTWRAPS_KIND, FOOTWRAPS_SHIN_F, FOOTWRAPS_SHIN_N, FOOTWRAPS_SKIN } from './footWrapsArt';
import { HAKAMA_CLOTH, HAKAMA_KIND, HAKAMA_SEAT, HAKAMA_SHIN_F, HAKAMA_SHIN_N, HAKAMA_THIGH_F, HAKAMA_THIGH_N } from './hakamaArt';
import { KIMONO_BODY, KIMONO_CLOTH, KIMONO_COLLAR, KIMONO_KIND, KIMONO_SLEEVE_F, KIMONO_SLEEVE_N } from './kimonoArt';
import { SASH_BAND, SASH_EDGE, SASH_KIND, SASH_MAIN } from './sashArt';
import { WRAPS_CLOTH, WRAPS_FIST_F, WRAPS_FIST_N, WRAPS_FORE_F, WRAPS_FORE_N, WRAPS_KIND, WRAPS_SKIN } from './wrapsArt';

const SIDES: Side[] = ['F', 'N'];
const prt = (base: 'upperArm' | 'forearm' | 'hand' | 'thigh' | 'shin' | 'foot', s: Side) => `${base}${s}` as PartId;

/**
 * The colours these items had before his art, which the creator saved with every character that wore
 * them: those colours now mean his, so characters that kept the old defaults wear his colours.
 */
const OLD_DEFAULTS: Record<string, Record<string, string>> = {
  top_kimono: { '#ded8ca': KIMONO_CLOTH, '#2b3557': KIMONO_COLLAR },
  bottom_hakama: { '#2c3043': HAKAMA_CLOTH },
  waist_sash: { '#2f62b5': SASH_MAIN, '#1d3f80': SASH_EDGE },
  hands_wraps: { '#e9e3d3': WRAPS_CLOTH },
  feet_wraps: { '#ddd5c2': FOOTWRAPS_CLOTH },
};
/** A colour slot's saved colour, the old default read as his. */
export const ascendedSlot = (id: string, hex: string): string => OLD_DEFAULTS[id]?.[hex.toLowerCase()] ?? hex;

/** His colours recoloured: his line stays; each other kind of his follows its slot (his colour → the slot's). */
const tinter = (kinds: Record<string, string>, to: Record<string, [string, string]>) => (_ch: string, hex: string): string => {
  const k = kinds[hex];
  const t = k && to[k];
  return t ? retintHex(hex, t[0], t[1]) : hex;
};

/** Past this lean (degrees from his picture) a torso piece is turned with RotSprite; up to it, sheared. */
const LEAN_SHEAR = 20;

/**
 * Stamps a piece of his that rides the torso, leaning `deg`: a small lean shears it, each row moved
 * across whole (his folds and collar stay his pixels, only stepped), as far as a turn would move it; a
 * large one turns it with RotSprite (as armor.ts stamps his cuirass).
 */
function stampRiding(g: DrawCtx, depth: Depth, piece: PaintedPiece, at: Vec, deg: number, part: PartId, color: (ch: string, hex: string) => string): void {
  const d = deg - piece.angle;
  if (Math.abs(d) > LEAN_SHEAR) {
    stampPiece(g, depth, piece, at, deg, part, color);
    return;
  }
  const pens: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(piece.colors)) pens[ch] = g.m(color(ch, hex), 'flat');
  const L = g.L(depth);
  const ax = Math.floor(at.x * RES) - piece.pivot[0];
  const ay = Math.floor(at.y * RES) - piece.pivot[1];
  const s = Math.sin((d * Math.PI) / 180);
  piece.rows.forEach((row, j) => {
    const dx = -Math.round((j - piece.pivot[1]) * s);
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') L.set(ax + i + dx, ay + j, pens[row[i]], 3, part, F_NO_TEXTURE | F_NO_OUTLINE);
  });
}

/** Takes these parts of our body away from a layer (his piece takes their place). */
function partsOff(g: DrawCtx, depth: Depth, parts: PartId[]): void {
  const L = g.L(depth);
  if (!L.used) return;
  const ids = parts.map((p) => partIndex(p));
  for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && ids.includes(L.part[i])) L.mat[i] = -1;
}

/**
 * A piece of his widened for the bulky body, whose torso is broader: single columns repeated, spread
 * evenly (never side by side, so no flat band appears) over its middle third on each side of the pivot,
 * `left` columns before it and `right` after it.
 */
function widened(p: PaintedPiece, left: number, right: number): PaintedPiece {
  const w = Math.max(...p.rows.map((r) => r.length));
  const spread = (a: number, b: number, n: number) => new Set(Array.from({ length: n }, (_, k) => Math.round(a + ((b - a) * (k + 0.5)) / n)));
  const cols = new Set([...spread(Math.round(p.pivot[0] * 0.34), Math.round(p.pivot[0] * 0.9), left), ...spread(Math.round(p.pivot[0] + (w - p.pivot[0]) * 0.1), Math.round(p.pivot[0] + (w - p.pivot[0]) * 0.66), right)]);
  const rows = p.rows.map((r) => r.padEnd(w, '.').split('').map((ch, i) => (cols.has(i) ? ch + ch : ch)).join(''));
  let px = p.pivot[0];
  for (const c of cols) if (c < p.pivot[0]) px++;
  return { ...p, rows, pivot: [px, p.pivot[1]] };
}

/** How far broader the bulky torso is than the male's on each side (fine pixels, at the chest and hips). */
const BULKY_WIDER: Record<'chest' | 'hips', [number, number]> = { chest: [4, 4], hips: [3, 3] };
const forBody = (body: BodyType, p: PaintedPiece, at: 'chest' | 'hips', cache: Map<PaintedPiece, PaintedPiece>): PaintedPiece => {
  if (body !== 'bulky') return p;
  let q = cache.get(p);
  if (!q) cache.set(p, (q = widened(p, ...BULKY_WIDER[at])));
  return q;
};
const BULKY = new Map<PaintedPiece, PaintedPiece>();

// ---------------------------------------------------------------------------
// Wrap Kimono
// ---------------------------------------------------------------------------

/**
 * His kimono: the body over the torso (the V left open, our chest shows there), each wide sleeve riding
 * its upper arm about the shoulder in place of our upper arm (the far one behind the body). His beige
 * follows Kimono and his navy Collar.
 */
export function drawAscendedKimono(g: DrawCtx, main: string, collar: string): void {
  const r = g.rig;
  const tint = tinter(KIMONO_KIND, { cloth: [KIMONO_CLOTH, ascendedSlot('top_kimono', main)], collar: [KIMONO_COLLAR, ascendedSlot('top_kimono', collar)] });
  for (const s of SIDES) partsOff(g, armDepth(s, 'body'), [prt('upperArm', s)]);
  stampPiece(g, 'farArm.armor', KIMONO_SLEEVE_F, r.shoulderF, segAngle(r.shoulderF, r.elbowF), 'upperArmF', tint);
  stampRiding(g, 'torso.top', forBody(r.body, KIMONO_BODY, 'chest', BULKY), r.neck, segAngle(r.pelvis, r.neck), 'torso', tint);
  stampPiece(g, 'nearArm.armor', KIMONO_SLEEVE_N, r.shoulderN, segAngle(r.shoulderN, r.elbowN), 'upperArmN', tint);
  torsoBesideOff(g);
}

/**
 * Our torso beside his kimono gives way: on each row the kimono covers, our torso's skin outside it (where
 * a twisting pose swings our shoulder away from his kimono) is taken away, so his cloth and what hangs
 * behind it show there, never our bare side. Inside it (his V) our chest stays.
 */
function torsoBesideOff(g: DrawCtx): void {
  const top = g.L('torso.top');
  const body = g.L('torso.body');
  const torso = partIndex('torso');
  for (let y = 0; y < GRID; y++) {
    let x0 = GRID;
    let x1 = -1;
    for (let x = 0; x < GRID; x++) {
      if (top.mat[y * GRID + x] >= 0) {
        x0 = Math.min(x0, x);
        x1 = x;
      }
    }
    if (x1 < 0) continue;
    for (let x = 0; x < GRID; x++) {
      const i = y * GRID + x;
      if ((x < x0 || x > x1) && body.mat[i] >= 0 && body.part[i] === torso) body.mat[i] = -1;
    }
  }
}

// ---------------------------------------------------------------------------
// Wide Hakama
// ---------------------------------------------------------------------------

/**
 * Our leg under his hakama leg gives way down to his hem (his leg is wider at the hip and slants out to
 * the hem, so ours would show beside it): the thigh, and the shin above the hem's height along the shin.
 * Below the hem our shin stays, for the footwear.
 */
function legUnderOff(g: DrawCtx, s: Side, shin: PaintedPiece): void {
  const { knee, ankle } = legJoints(g.rig, s);
  const len = Math.hypot(ankle.x - knee.x, ankle.y - knee.y);
  const ux = (ankle.x - knee.x) / len;
  const uy = (ankle.y - knee.y) / len;
  const hem = (shin.rows.length - 1 - shin.pivot[1]) / RES;
  const thigh = partIndex(prt('thigh', s));
  const shinPart = partIndex(prt('shin', s));
  const L = g.L(legDepth(s, 'body'));
  for (let i = 0; i < GRID * GRID; i++) {
    if (L.mat[i] < 0) continue;
    if (L.part[i] === thigh) L.mat[i] = -1;
    else if (L.part[i] === shinPart && (((i % GRID) + 0.5) / RES - knee.x) * ux + ((Math.floor(i / GRID) + 0.5) / RES - knee.y) * uy < hem) L.mat[i] = -1;
  }
}

/**
 * His hakama: each leg's thigh about the hip and shin about the knee, over the footwear (so boots and
 * bandages go inside its hem), and its top round the hips riding the torso over both legs' tops. His
 * black follows Hakama.
 */
export function drawAscendedHakama(g: DrawCtx, main: string): void {
  const r = g.rig;
  const tint = tinter(HAKAMA_KIND, { cloth: [HAKAMA_CLOTH, ascendedSlot('bottom_hakama', main)] });
  for (const s of SIDES) {
    const { hip, knee, ankle } = legJoints(r, s);
    const D = legDepth(s, 'armor');
    legUnderOff(g, s, s === 'N' ? HAKAMA_SHIN_N : HAKAMA_SHIN_F);
    stampPiece(g, D, s === 'N' ? HAKAMA_THIGH_N : HAKAMA_THIGH_F, hip, segAngle(hip, knee), prt('thigh', s), tint);
    stampPiece(g, D, s === 'N' ? HAKAMA_SHIN_N : HAKAMA_SHIN_F, knee, segAngle(knee, ankle), prt('shin', s), tint);
  }
  stampRiding(g, 'torso.bottom', forBody(r.body, HAKAMA_SEAT, 'hips', BULKY), r.pelvis, segAngle(r.pelvis, r.neck), 'pelvis', tint);
}

// ---------------------------------------------------------------------------
// Cloth Sash
// ---------------------------------------------------------------------------

/** His sash round the waist, its panel across the far thigh, riding the torso. His blues follow Sash, his navy Edge. */
export function drawAscendedSash(g: DrawCtx, main: string, edge: string): void {
  const r = g.rig;
  const tint = tinter(SASH_KIND, { main: [SASH_MAIN, ascendedSlot('waist_sash', main)], edge: [SASH_EDGE, ascendedSlot('waist_sash', edge)] });
  stampRiding(g, 'waist', forBody(r.body, SASH_BAND, 'hips', BULKY), r.pelvis, segAngle(r.pelvis, r.neck), 'pelvis', tint);
}

// ---------------------------------------------------------------------------
// Bandage Wraps
// ---------------------------------------------------------------------------

/**
 * An arm bent past this many degrees at the elbow brings the forearm in front of the upper arm (hand
 * signs, a guard, a fist at the chest): the bandaged forearm and hand are drawn over the sleeve then.
 */
const FOLDED = 45;
const folded = (upper: number, fore: number): boolean => Math.abs(((fore - upper + 540) % 360) - 180) > FOLDED;

/** Hands he drew as fists (closed round a grip, clenched, or hanging loosely closed). */
const FIST_SHAPES = new Set(['fist', 'grip', 'hold', 'relaxed']);

/**
 * His bandaged forearms, each about its elbow in place of our forearm, and his fists about the wrist in
 * place of our hand while the hand is closed. Open, pointing, signing or holding a book, the hand is our
 * hand picture in his bandage. His bandage follows Bandage and his bare fingers the character's skin.
 * Drawn under the sleeves (the cloth layer: a kimono's cuff lies over the bandage, as he drew it), but
 * over them while the arm is folded and the forearm comes in front of the upper arm.
 */
export function drawAscendedWraps(g: DrawCtx, main: string): void {
  const bandage = ascendedSlot('hands_wraps', main);
  const tint = tinter(WRAPS_KIND, { cloth: [WRAPS_CLOTH, bandage], skin: [WRAPS_SKIN, g.look.skin] });
  for (const s of SIDES) {
    const j = armJoints(g.rig, s);
    const D = armDepth(s, folded(segAngle(j.shoulder, j.elbow), segAngle(j.elbow, j.wrist)) ? 'armor' : 'cloth');
    partsOff(g, armDepth(s, 'body'), [prt('forearm', s), prt('hand', s)]);
    stampPiece(g, D, s === 'N' ? WRAPS_FORE_N : WRAPS_FORE_F, j.elbow, segAngle(j.elbow, j.wrist), prt('forearm', s), tint);
    if (FIST_SHAPES.has(j.shape)) stampPiece(g, D, s === 'N' ? WRAPS_FIST_N : WRAPS_FIST_F, j.wrist, segAngle(j.wrist, j.hand), prt('hand', s), tint);
    else handDraw(g, g.L(D), s, { mat: g.m(retintHex(WRAPS_CLOTH, WRAPS_CLOTH, bandage), 'cloth'), part: prt('hand', s), bias: s === 'F' ? -1 : 0 });
  }
}

// ---------------------------------------------------------------------------
// Foot Wraps
// ---------------------------------------------------------------------------

/**
 * Our shin gives way under his bandaged one: from `above` (rig units) over the ankle down, so our leg's
 * edge never shows beside his narrower bandage.
 */
function shinUnderOff(g: DrawCtx, s: Side, above: number): void {
  const { knee, ankle } = legJoints(g.rig, s);
  const len = Math.hypot(ankle.x - knee.x, ankle.y - knee.y);
  const ux = (ankle.x - knee.x) / len;
  const uy = (ankle.y - knee.y) / len;
  const shin = partIndex(prt('shin', s));
  const L = g.L(legDepth(s, 'body'));
  for (let i = 0; i < GRID * GRID; i++) {
    if (L.mat[i] < 0 || L.part[i] !== shin) continue;
    if ((((i % GRID) + 0.5) / RES - knee.x) * ux + ((Math.floor(i / GRID) + 0.5) / RES - knee.y) * uy > len - above) L.mat[i] = -1;
  }
}

/**
 * His bandaged shins and bare-toed feet on our legs (moved there from where he drew his wider stance:
 * his sole on ours): each shin turns with the shin about the ankle, each foot stays flat like our feet.
 * Our bare foot and the shin under his bandage give way. His bandage follows Bandage, his toes the
 * character's skin.
 */
export function drawAscendedFootWraps(g: DrawCtx, main: string): void {
  const tint = tinter(FOOTWRAPS_KIND, { cloth: [FOOTWRAPS_CLOTH, ascendedSlot('feet_wraps', main)], skin: [FOOTWRAPS_SKIN, g.look.skin] });
  for (const s of SIDES) {
    const { knee, ankle } = legJoints(g.rig, s);
    const shin = s === 'N' ? FOOTWRAPS_SHIN_N : FOOTWRAPS_SHIN_F;
    partsOff(g, legDepth(s, 'body'), [prt('foot', s)]);
    shinUnderOff(g, s, shin.pivot[1] / RES);
    const foot = s === 'N' ? FOOTWRAPS_FOOT_N : FOOTWRAPS_FOOT_F;
    stampPiece(g, legDepth(s, 'feet'), shin, ankle, segAngle(knee, ankle), prt('shin', s), tint);
    stampPiece(g, legDepth(s, 'feet'), foot, ankle, foot.angle, prt('foot', s), tint);
  }
}
