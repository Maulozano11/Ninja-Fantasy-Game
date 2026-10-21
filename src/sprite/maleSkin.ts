// The owner's skin on our male bodies (male and bulky), from his Roman paint-over: his darker shadow
// tone in the skin ramp, and his skin on the upper arms, hands and thighs as painted pieces
// (maleSkinArt.ts) that turn with each limb. Approved by the owner on 2026-10-21 ("si" to the proposal):
// the body's shape and joints stay ours, so his pixels only recolour our own limb's skin.

import { retintSkin } from './color';
import { armJoints, Depth, DrawCtx, handPose, Side } from './ctx';
import { MALE_SKIN_BASE, MALE_SKIN_DARK, MALE_SKIN_JOINT, SKIN_HAND_F, SKIN_HAND_N, SKIN_THIGH_F, SKIN_THIGH_N, SKIN_UPPER_ARM_F, SKIN_UPPER_ARM_N } from './maleSkinArt';
import { segAngle, type PaintedPiece } from './painted';
import { F_NO_EDGE, F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, PartId, partIndex, RES, Vec } from './raster';
import { BODY_PARAMS, type Rig } from './rig';
import { rotateTemplate } from './rotsprite';
import { isFemaleBody } from './types';

/** Male bodies take his skin; the female bodies (female, slender) keep theirs exactly. */
export const takesMaleSkin = (body: string): boolean => !isFemaleBody(body);

type Joint = 'shoulderN' | 'shoulderF' | 'elbowN' | 'elbowF' | 'wristN' | 'wristF' | 'handN' | 'handF' | 'hipN' | 'hipF' | 'kneeN' | 'kneeF';

interface Limb {
  name: string;
  piece: PaintedPiece;
  part: PartId;
  /** The limb's direction (its angle is the segment's), hip to knee, shoulder to elbow, wrist to hand. */
  from: Joint;
  to: Joint;
  /** Hands follow our hand pictures' turn and mirror (ctx.ts handPose), as the owner's painted fists do. */
  hand?: Side;
  /** Which radius the bulky body widens it by: the limb's root radius, of the arm or the leg. */
  widen?: 'arm' | 'leg';
}

const LIMBS: Limb[] = [
  { name: 'SKIN_UPPER_ARM_N', piece: SKIN_UPPER_ARM_N, part: 'upperArmN', from: 'shoulderN', to: 'elbowN', widen: 'arm' },
  { name: 'SKIN_UPPER_ARM_F', piece: SKIN_UPPER_ARM_F, part: 'upperArmF', from: 'shoulderF', to: 'elbowF', widen: 'arm' },
  { name: 'SKIN_HAND_N', piece: SKIN_HAND_N, part: 'handN', from: 'wristN', to: 'handN', hand: 'N' },
  { name: 'SKIN_HAND_F', piece: SKIN_HAND_F, part: 'handF', from: 'wristF', to: 'handF', hand: 'F' },
  { name: 'SKIN_THIGH_N', piece: SKIN_THIGH_N, part: 'thighN', from: 'hipN', to: 'kneeN', widen: 'leg' },
  { name: 'SKIN_THIGH_F', piece: SKIN_THIGH_F, part: 'thighF', from: 'hipF', to: 'kneeF', widen: 'leg' },
];

/**
 * The skin ramp's dark tone (shade 1) becomes his darker shadow, in the character's skin: our far limbs,
 * muscle lines, creases and the face's darks on a male body are drawn in it.
 */
export function maleSkinRamp(g: DrawCtx): void {
  if (!takesMaleSkin(g.rig.body)) return;
  g.mats.ramps[g.skin][1] = retintSkin(MALE_SKIN_DARK, MALE_SKIN_BASE, g.look.skin);
}

const widened = new Map<string, PaintedPiece>();

/**
 * His piece for a wider limb (the bulky body): `n` of his columns repeated, spread evenly across it, so
 * the limb's width is filled with his own pixels (never redrawn). The pivot keeps its cell.
 */
export function widenPiece(p: PaintedPiece, n: number): PaintedPiece {
  if (n <= 0) return p;
  const key = `${p.rows.join('|')}@${n}`;
  const hit = widened.get(key);
  if (hit) return hit;
  const w = Math.max(...p.rows.map((r) => r.length));
  const cols = Array.from({ length: n }, (_, k) => Math.round((w * (k + 1)) / (n + 1)) - 1);
  const rows = p.rows.map((r) => {
    const pad = r.padEnd(w, '.');
    let out = '';
    for (let x = 0; x < w; x++) out += cols.includes(x) ? pad[x] + pad[x] : pad[x];
    return out;
  });
  const out: PaintedPiece = { ...p, rows, pivot: [p.pivot[0] + cols.filter((c) => c < p.pivot[0]).length, p.pivot[1]] };
  widened.set(key, out);
  return out;
}

/** How many of his columns a limb gains on this body: his width scaled as our limb's radius is. */
function extraColumns(body: Rig['body'], widen: Limb['widen'], p: PaintedPiece): number {
  if (!widen || body === 'male') return 0;
  const R = widen === 'arm' ? 'armR' : 'legR';
  const k = BODY_PARAMS[body][R][0] / BODY_PARAMS.male[R][0];
  const w = Math.max(...p.rows.map((r) => r.length));
  return Math.max(0, Math.round(w * (k - 1)));
}

/** Whether the layer's outline pass will turn this pixel into outline (raster.ts Layer.applyOutline). */
function isEdge(L: Layer, i: number): boolean {
  if (!L.outline || L.flags[i] & F_NO_OUTLINE) return false;
  const x = i % GRID;
  const y = (i / GRID) | 0;
  const empty = (xx: number, yy: number) => {
    if (xx < 0 || yy < 0 || xx >= GRID || yy >= GRID) return true;
    const j = yy * GRID + xx;
    return L.mat[j] < 0 && !(L.flags[j] & F_NO_EDGE);
  };
  return empty(x, y - 1) || empty(x - 1, y) || empty(x + 1, y) || empty(x, y + 1);
}

/**
 * Lays his skin on our male limbs: each piece is placed with its pivot on its joint and turned as the
 * limb turns (RotSprite), and every pixel of our skin on that limb that is not outline takes his colour
 * there, in the character's skin. Runs once everything is drawn, just before the outlines, so it sees
 * the limbs as they are shown (hands lifted in front, shins taken off under boots).
 */
export function paintMaleSkin(g: DrawCtx, layers: Map<Depth, Layer>): void {
  const r = g.rig;
  if (!takesMaleSkin(r.body)) return;
  const tone = new Map<string, number>();
  const mat = (hex: string) => {
    let m = tone.get(hex);
    if (m === undefined) {
      m = g.m(retintSkin(hex, MALE_SKIN_BASE, g.look.skin), 'flat');
      tone.set(hex, m);
    }
    return m;
  };
  const all = [...layers.values()].filter((L) => L.used);
  for (const limb of LIMBS) {
    const piece = widenPiece(limb.piece, extraColumns(r.body, limb.widen, limb.piece));
    const at: Vec = r[MALE_SKIN_JOINT[limb.name] as Joint];
    let deg = segAngle(r[limb.from], r[limb.to]) - piece.angle;
    let flipX = false;
    if (limb.hand) {
      // As our hand pictures (and his painted fists, clothes.ts paintedFist): unturned within 30 degrees,
      // mirrored with them, his hand then pointing the other way across the vertical.
      // A cradling hand (holding a book from below) is our picture with the fingers up above the wrist,
      // never mirrored: his hand is turned fingers up with it.
      const j = armJoints(r, limb.hand);
      const hp = handPose(g, limb.hand);
      flipX = hp.kind !== 'cradle' && hp.flipX;
      const drawn = flipX ? 180 - piece.angle : piece.angle;
      const turn = ((segAngle(j.wrist, j.hand) - drawn + 540) % 360) - 180;
      deg = hp.kind === 'cradle' ? 180 : Math.abs(turn) <= 30 ? 0 : turn;
    }
    let t = piece;
    if (flipX) {
      const w = Math.max(...t.rows.map((row) => row.length));
      t = { ...t, rows: t.rows.map((row) => row.padEnd(w, '.').split('').reverse().join('')), pivot: [w - 1 - t.pivot[0], t.pivot[1]] };
    }
    // His colour per fine pixel, where the turned piece lands.
    const ax = Math.floor(at.x * RES);
    const ay = Math.floor(at.y * RES);
    const his = new Map<number, number>();
    for (const p of rotateTemplate(t, deg)) {
      const x = ax + p.dx;
      const y = ay + p.dy;
      if (x < 0 || y < 0 || x >= GRID || y >= GRID) continue;
      his.set(y * GRID + x, mat(piece.colors[p.ch]));
    }
    const part = partIndex(limb.part);
    for (const L of all) {
      for (const [i, m] of his) {
        if (L.mat[i] !== g.skin || L.part[i] !== part || L.shade[i] === 0 || isEdge(L, i)) continue;
        L.mat[i] = m;
        L.shade[i] = 3;
        L.flags[i] |= F_NO_TEXTURE;
      }
    }
  }
}
