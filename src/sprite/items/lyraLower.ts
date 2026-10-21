// The owner's Lyra below the waist (docs/reference/lyra-game-scale-owner-reference.jpg, his picture
// of her at our game scale, 2026-10-21): her short pleated skirt (bottom_striped_pleats), her long
// tabard open at the front (skirt_gilded_tabard) and her belts with the buckle, flap and pouch
// (waist_pouch_belt). Her pieces are his pixels one for one, placed on our female body at idle
// (lyraLowerArt.ts, tools/refs/lyra-lower-from-ref.py); drape() carries them onto any body in any pose:
// above its attach line a piece rides the torso, below it the cloth hangs from that line as the other
// skirts do (armor.ts hang()), and across it is stretched from her hips to the body's own.

import { retintHex } from '../color';
import type { Depth, DrawCtx, ItemDef } from '../ctx';
import { add, F_NO_OUTLINE, F_NO_TEXTURE, GRID, lerp, PartId, RES, scale, sub, v, Vec } from '../raster';
import { BodyParams, drawRig, GROUND, Rig } from '../rig';
import {
  LYRA_BACK,
  LYRA_BELT,
  LYRA_BELT_GOLD,
  LYRA_BELT_GOLD_BASE,
  LYRA_BELT_LEATHER,
  LYRA_BELT_LEATHER_BASE,
  LYRA_BELT_POUCH,
  LYRA_BELT_POUCH_BASE,
  LYRA_BELT_STEEL,
  LYRA_BELT_STEEL_BASE,
  LYRA_FRONT,
  LYRA_SKIRT,
  LYRA_SKIRT_CLOTH,
  LYRA_SKIRT_CLOTH_BASE,
  LYRA_SKIRT_STRIPES,
  LYRA_SKIRT_STRIPES_BASE,
  LYRA_TABARD_CLOTH,
  LYRA_TABARD_CLOTH_BASE,
  LYRA_TABARD_GOLD,
  LYRA_TABARD_GOLD_BASE,
  LYRA_TABARD_TRIM,
  LYRA_TABARD_TRIM_BASE,
} from './lyraLowerArt';

/** A piece of hers as drawn on our female body at idle: rows of her colours from fine pixel (x, y) of the frame. */
export interface DrapedPiece {
  x: number;
  y: number;
  /** One character per colour of hers; '.' is empty. */
  rows: string[];
  colors: Record<string, string>;
}

/**
 * How a piece hangs: its attach line (torso-local y, design units up from the pelvis) and the cloth's
 * length below it in thigh lengths. Above the line it rides the torso; a piece that never hangs (the
 * belt) has its line below everything.
 */
interface Fit {
  top: number;
  k: number;
}

/** The skirt hangs from its waistband; it reaches a little below the hips. */
const SKIRT_FIT: Fit = { top: 3.0, k: 0.72 };
/** The tabard hangs from under the belt to the calves. */
const TABARD_FIT: Fit = { top: 2.0, k: 2.06 };
/** The belt, its flap and its pouch ride the torso. */
const BELT_FIT: Fit = { top: -99, k: 0 };

/** How much a hanging panel follows its thigh (armor.ts HANG_FOLLOW): skirts hang nearly straight down. */
const FOLLOW = 0.22;
/** Lowest a hanging hem goes: crouched or lunging, the cloth gathers on the ground line, not past it. */
const FLOOR = GROUND;

/** Her pieces were drawn on our female body at idle frame 0. */
let REF: Rig | null = null;
const ref = (): Rig => (REF ??= drawRig('female', 'idle', 0));

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

/** Torso-local coordinates of a design point (x along the shoulders toward the face, y up from the pelvis). */
function local(r: Rig, p: Vec): [number, number] {
  const dx = p.x - r.pelvis.x;
  const dy = p.y - r.pelvis.y;
  return [dx * r.right.x + dy * r.right.y, dx * r.up.x + dy * r.up.y];
}

/** The torso's near and far edges at local height `ly` (ctx.ts torsoPoly: the waist at 5.4, the hips at 1.6). */
function edges(b: BodyParams, ly: number): [number, number] {
  const t = clamp((ly - 1.6) / (5.4 - 1.6), 0, 1);
  const hipN = -(b.hipHalf * 0.5 + b.legR[0] * 0.96);
  const hipF = b.hipHalf * 0.42 + b.legR[0] * 0.9;
  return [hipN + (-b.waistHalf * 0.86 - hipN) * t, hipF + (b.waistHalf * 0.64 + 0.7 - hipF) * t];
}

/** Torso-local x at height `ly` on one body -> the same place across the other body's torso. */
function across(from: BodyParams, to: BodyParams, lx: number, ly: number): number {
  const [a0, a1] = edges(from, ly);
  const [b0, b1] = edges(to, ly);
  return b0 + ((lx - a0) * (b1 - b0)) / (a1 - a0);
}

/** Where the cloth attached at local x on the attach line hangs to (armor.ts hang(), from the line). */
function hangVec(r: Rig, lx: number, fit: Fit): Vec {
  const b = r.bp;
  const xN = -b.hipHalf * 0.55;
  const xF = b.hipHalf * 0.45;
  const w = clamp((lx - xN) / (xF - xN), 0, 1);
  const thigh = lerp(sub(r.kneeN, r.hipN), sub(r.kneeF, r.hipF), w);
  const d = scale(lerp(v(0, Math.hypot(thigh.x, thigh.y)), thigh, FOLLOW), fit.k);
  const top = r.T(lx, fit.top);
  if (top.y + d.y > FLOOR) d.y = Math.max(FLOOR - top.y, d.y * 0.25);
  return d;
}

const hangPoint = (r: Rig, lx: number, s: number, fit: Fit): Vec => add(r.T(lx, fit.top), scale(hangVec(r, lx, fit), s));

/** A point below the attach line as (where on the line its cloth hangs from, how far down the hang it is). */
function hangCoords(r: Rig, p: Vec, fit: Fit): [number, number] {
  const q = sub(p, r.T(0, fit.top));
  const R = r.right;
  let lx = q.x * R.x + q.y * R.y;
  let s = 0;
  for (let i = 0; i < 8; i++) {
    const D = hangVec(r, lx, fit);
    const det = R.x * D.y - R.y * D.x;
    if (Math.abs(det) < 1e-9) break;
    lx = (q.x * D.y - q.y * D.x) / det;
    s = (R.x * q.y - R.y * q.x) / det;
  }
  return [lx, s];
}

/**
 * A point of the figure as drawn -> where the piece has it on our female body at idle. It moves by
 * the difference of the two maps at the same place on the cloth, so on her own body and pose every
 * pixel lands exactly where it was drawn.
 */
function toRef(r: Rig, p: Vec, fit: Fit): Vec {
  const R0 = ref();
  const [lx, ly] = local(r, p);
  if (ly >= fit.top) return add(p, sub(R0.T(across(r.bp, R0.bp, lx, ly), ly), r.T(lx, ly)));
  const [ax, s] = hangCoords(r, p, fit);
  return add(p, sub(hangPoint(R0, across(r.bp, R0.bp, ax, fit.top), s, fit), hangPoint(r, ax, s, fit)));
}

/** The other way: a point of the piece -> where it goes on this figure (for the piece's bounds). */
function fromRef(r: Rig, p: Vec, fit: Fit): Vec {
  const R0 = ref();
  const [lx, ly] = local(R0, p);
  if (ly >= fit.top) return r.T(across(R0.bp, r.bp, lx, ly), ly);
  const [ax, s] = hangCoords(R0, p, fit);
  return hangPoint(r, across(R0.bp, r.bp, ax, fit.top), s, fit);
}

/**
 * Draws a piece of hers onto this figure: each pixel of the layer within the piece's bounds takes
 * the colour of the pixel of hers it maps back to (her own line included: no outline is added).
 * `keep` can turn pixels down (a panel behind the far hand).
 */
function drape(
  g: DrawCtx,
  depth: Depth,
  piece: DrapedPiece,
  part: PartId,
  fit: Fit,
  color: (ch: string, hex: string) => string,
  keep?: (x: number, y: number) => boolean,
): void {
  const r = g.rig;
  const L = g.L(depth);
  const pens: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(piece.colors)) pens[ch] = g.m(color(ch, hex), 'flat');
  let x0 = GRID;
  let y0 = GRID;
  let x1 = 0;
  let y1 = 0;
  piece.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '.') continue;
      const q = fromRef(r, v((piece.x + i + 0.5) / RES, (piece.y + j + 0.5) / RES), fit);
      x0 = Math.min(x0, q.x * RES);
      y0 = Math.min(y0, q.y * RES);
      x1 = Math.max(x1, q.x * RES);
      y1 = Math.max(y1, q.y * RES);
    }
  });
  const pad = 3;
  for (let y = Math.max(0, Math.floor(y0) - pad); y <= Math.min(GRID - 1, Math.ceil(y1) + pad); y++) {
    for (let x = Math.max(0, Math.floor(x0) - pad); x <= Math.min(GRID - 1, Math.ceil(x1) + pad); x++) {
      const p = toRef(r, v((x + 0.5) / RES, (y + 0.5) / RES), fit);
      const ch = piece.rows[Math.floor(p.y * RES) - piece.y]?.[Math.floor(p.x * RES) - piece.x];
      if (!ch || ch === '.' || (keep && !keep(x, y))) continue;
      L.set(x, y, pens[ch], 3, part, F_NO_TEXTURE | F_NO_OUTLINE);
    }
  }
}

/** Her colours recoloured by an item's slots: each slot moves the characters it owns the way its base colour moves. */
const tint =
  (slots: [string, string, string][]) =>
  (ch: string, hex: string): string => {
    for (const [chars, base, to] of slots) if (chars.includes(ch)) return retintHex(hex, base, to);
    return hex;
  };

/** Under her skirt her thighs are bare: the plain body's fitted shorts lose their legs (its seat stays under the skirt). */
function bareThighs(g: DrawCtx): void {
  for (const d of ['nearLeg.cloth', 'farLeg.cloth'] as const) g.L(d).mat.fill(-1);
}

/** The far arm is in front of the tabard's far edge: those pixels are left to it. */
function behindFarArm(g: DrawCtx): (x: number, y: number) => boolean {
  const arm = [g.L('farArm.body'), g.L('farArm.cloth')];
  return (x, y) => !arm.some((A) => A.has(x, y));
}

/**
 * The lowest row of her legs and feet (boots and all, drawn before the tabard): the tabard's tails
 * never hang past her soles, however far a lunge carries their hang toward the ground.
 */
function soleRow(g: DrawCtx): number {
  let low = 0;
  for (const d of ['nearLeg.body', 'farLeg.body', 'nearLeg.feet', 'farLeg.feet', 'nearLeg.armor', 'farLeg.armor'] as const) {
    const L = g.L(d);
    for (let y = GRID - 1; y > low; y--) {
      let hit = false;
      for (let x = 0; x < GRID && !hit; x++) hit = L.has(x, y);
      if (hit) {
        low = y;
        break;
      }
    }
  }
  return low;
}

export const STRIPED_PLEATS: ItemDef = {
  id: 'bottom_striped_pleats',
  slot: 'bottom',
  name: 'Striped Pleated Skirt',
  desc: 'A short charcoal skirt in deep knife pleats, a red stripe in every fold and a red hem. Women only.',
  colors: [
    { key: 'cloth', label: 'Cloth', default: LYRA_SKIRT_CLOTH_BASE },
    { key: 'stripes', label: 'Stripes', default: LYRA_SKIRT_STRIPES_BASE },
  ],
  bodies: ['female', 'slender'],
  draw: (g, [cloth, stripes]) => {
    bareThighs(g);
    const t = tint([
      [LYRA_SKIRT_CLOTH, LYRA_SKIRT_CLOTH_BASE, cloth],
      [LYRA_SKIRT_STRIPES, LYRA_SKIRT_STRIPES_BASE, stripes],
    ]);
    drape(g, 'torso.bottom', LYRA_SKIRT, 'pelvis', SKIRT_FIT, t);
  },
};

export const GILDED_TABARD: ItemDef = {
  id: 'skirt_gilded_tabard',
  slot: 'skirt',
  name: 'Gilded Tabard',
  desc: 'Long cream coat tails open at the front, from the belt to the calves: edged in red and gold, lined in grey-brown, the hems cut to a point. Women only.',
  colors: [
    { key: 'cloth', label: 'Cloth', default: LYRA_TABARD_CLOTH_BASE },
    { key: 'trim', label: 'Trim', default: LYRA_TABARD_TRIM_BASE },
    { key: 'gold', label: 'Gold', default: LYRA_TABARD_GOLD_BASE, kind: 'metal' },
  ],
  // cut for her hips, as her skirt is: on the male and bulky bodies it would sit off them
  bodies: ['female', 'slender'],
  draw: (g, [cloth, trim, gold]) => {
    const t = tint([
      [LYRA_TABARD_CLOTH, LYRA_TABARD_CLOTH_BASE, cloth],
      [LYRA_TABARD_TRIM, LYRA_TABARD_TRIM_BASE, trim],
      [LYRA_TABARD_GOLD, LYRA_TABARD_GOLD_BASE, gold],
    ]);
    // the lining and the far tail behind the legs and the far arm; the near panel and the far
    // panel's top over the skirt and the near leg, as he drew them (behind the far arm)
    const sole = soleRow(g);
    const arm = behindFarArm(g);
    drape(g, 'backGear', LYRA_BACK, 'back', TABARD_FIT, t, (_x, y) => y <= sole);
    drape(g, 'skirt', LYRA_FRONT, 'pelvis', TABARD_FIT, t, (x, y) => y <= sole && arm(x, y));
  },
};

export const POUCH_BELT: ItemDef = {
  id: 'waist_pouch_belt',
  slot: 'waist',
  name: 'Buckled Belt and Pouch',
  desc: 'Dark leather belts slung across the hips with a steel buckle, a small gold-edged flap at the front and a red leather pouch capped in steel at the far hip. Women only.',
  colors: [
    { key: 'leather', label: 'Leather', default: LYRA_BELT_LEATHER_BASE, kind: 'leather' },
    { key: 'steel', label: 'Steel', default: LYRA_BELT_STEEL_BASE, kind: 'metal' },
    { key: 'pouch', label: 'Pouch', default: LYRA_BELT_POUCH_BASE, kind: 'leather' },
    { key: 'gold', label: 'Gold', default: LYRA_BELT_GOLD_BASE, kind: 'metal' },
  ],
  // cut for her hips (on the bulky body it stopped short of the far hip)
  bodies: ['female', 'slender'],
  draw: (g, [leather, steel, pouch, gold]) => {
    const t = tint([
      [LYRA_BELT_LEATHER, LYRA_BELT_LEATHER_BASE, leather],
      [LYRA_BELT_STEEL, LYRA_BELT_STEEL_BASE, steel],
      [LYRA_BELT_POUCH, LYRA_BELT_POUCH_BASE, pouch],
      [LYRA_BELT_GOLD, LYRA_BELT_GOLD_BASE, gold],
    ]);
    drape(g, 'waist', LYRA_BELT, 'pelvis', BELT_FIT, t);
  },
};
