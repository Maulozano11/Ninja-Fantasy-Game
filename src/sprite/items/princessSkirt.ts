// The owner's princess below the waist (docs/reference/princess-owner-reference.jpg, his picture of her at our
// game scale, provisional "Rosalind, la Princesa del Alba Rosa"): her ball-gown skirt (skirt_rose_gown), the open
// pink overskirt with its lilac and gold embroidered hems over the lilac underskirt with its gold hem band and the
// dark purple petticoat. The piece is his pixels one for one, placed on our female body at idle
// (princessSkirtArt.ts, tools/refs/princess-skirt-from-ref.py); drape() carries it onto any female body in any
// pose: above the hips it rides the torso, below them the cloth hangs from the hip line as the other long skirts
// do (armor.ts hang(), the same drape as Lyra's tabard), and across it is stretched from her hips to the body's
// own. It is one piece, the overskirt, the underskirt and the petticoat together, so no gap opens between them
// when the legs swing.

import { retintHex } from '../color';
import type { DrawCtx, ItemDef } from '../ctx';
import { add, F_NO_OUTLINE, F_NO_TEXTURE, GRID, lerp, RES, scale, sub, v, Vec } from '../raster';
import { BodyParams, drawRig, GROUND, Rig } from '../rig';
import {
  type GownPiece,
  PRINCESS_SKIRT,
  PRINCESS_SKIRT_CLOTH,
  PRINCESS_SKIRT_CLOTH_BASE,
  PRINCESS_SKIRT_GOLD,
  PRINCESS_SKIRT_GOLD_BASE,
  PRINCESS_SKIRT_LILAC,
  PRINCESS_SKIRT_LILAC_BASE,
  PRINCESS_SKIRT_PETTICOAT,
  PRINCESS_SKIRT_PETTICOAT_BASE,
} from './princessSkirtArt';

/**
 * How the gown hangs: its hip line (torso-local y, design units up from the pelvis) and the cloth's length
 * below it in thigh lengths (to the hem). Above the line it rides the torso.
 */
interface Fit {
  top: number;
  k: number;
}

/** The gown flares from the hips (his row 54) to the floor, about two and a half thighs down. */
const GOWN_FIT: Fit = { top: 1.0, k: 2.5 };

/** How much the hanging cloth follows its thigh (armor.ts HANG_FOLLOW): a gown hangs nearly straight down. */
const FOLLOW = 0.22;
/** How much the cloth follows the thighs when they are level (sitting): over the knees. */
const KNEE_FOLLOW = 0.6;
/** How far each side of the bell follows its own thigh rather than the two together. */
const SIDE = 0.5;
/** Lowest a hanging hem goes (armor.ts HEM_FLOOR): crouched, the cloth gathers on the ground. */
const FLOOR = GROUND + 1.5;

/** The gown was drawn on our female body at idle frame 0. */
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

/** How much the hanging cloth follows the thighs: nearly straight down standing (FOLLOW), more where the thighs
 * come up toward level (sitting, a deep lunge: the gown drapes over the knees) and all the way when the torso
 * lies down (the gown lies along the legs). */
function follow(r: Rig): number {
  const t = add(sub(r.kneeN, r.hipN), sub(r.kneeF, r.hipF));
  const level = clamp((Math.abs(Math.atan2(t.x, t.y)) - 0.6) / (Math.PI / 2 - 0.6), 0, 1);
  const lying = clamp((1 + r.up.y) / 0.7, 0, 1);
  return Math.max(FOLLOW + (KNEE_FOLLOW - FOLLOW) * level * level * (3 - 2 * level), FOLLOW + (1 - FOLLOW) * lying);
}

/** Where the cloth hung from local x on the hip line hangs to (armor.ts hang(), from the line). The gown is one
 * bell: each place follows the thigh on its side only SIDE of the way, the rest the two thighs together, so the
 * cloth between them does not shear apart when they swing opposite ways. */
function hangVec(r: Rig, lx: number, fit: Fit): Vec {
  const b = r.bp;
  const xN = -b.hipHalf * 0.55;
  const xF = b.hipHalf * 0.45;
  const w = 0.5 + (clamp((lx - xN) / (xF - xN), 0, 1) - 0.5) * SIDE;
  const thigh = lerp(sub(r.kneeN, r.hipN), sub(r.kneeF, r.hipF), w);
  const d = scale(lerp(v(0, Math.hypot(thigh.x, thigh.y)), thigh, follow(r)), fit.k);
  const top = r.T(lx, fit.top);
  if (top.y + d.y > FLOOR) d.y = Math.max(FLOOR - top.y, d.y * 0.25);
  return d;
}

const hangPoint = (r: Rig, lx: number, s: number, fit: Fit): Vec => add(r.T(lx, fit.top), scale(hangVec(r, lx, fit), s));

/** A point below the hip line as (where on the line its cloth hangs from, how far down the hang it is). */
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
 * A point of the figure as drawn -> where the gown has it on our female body at idle. It moves by the
 * difference of the two maps at the same place on the cloth, so on her own body and pose every pixel lands
 * exactly where it was drawn.
 */
function toRef(r: Rig, p: Vec, fit: Fit): Vec {
  const R0 = ref();
  const [lx, ly] = local(r, p);
  if (ly >= fit.top) return add(p, sub(R0.T(across(r.bp, R0.bp, lx, ly), ly), r.T(lx, ly)));
  const [ax, s] = hangCoords(r, p, fit);
  return add(p, sub(hangPoint(R0, across(r.bp, R0.bp, ax, fit.top), s, fit), hangPoint(r, ax, s, fit)));
}

/** The other way: a point of the gown -> where it goes on this figure (for the piece's bounds). */
function fromRef(r: Rig, p: Vec, fit: Fit): Vec {
  const R0 = ref();
  const [lx, ly] = local(R0, p);
  if (ly >= fit.top) return r.T(across(R0.bp, r.bp, lx, ly), ly);
  const [ax, s] = hangCoords(R0, p, fit);
  return hangPoint(r, across(R0.bp, r.bp, ax, fit.top), s, fit);
}

/**
 * The gown on this figure: fine pixel index -> its character. Each pixel within the piece's bounds takes the
 * character of the pixel of his it maps back to. Every pixel on his piece's edge is his line, so a pixel on
 * the edge of the moved piece is his line too (where the cloth is squeezed his line is not skipped), after the
 * spurs a shear leaves are taken off; at rest that changes nothing.
 */
export function placeGown(r: Rig, piece: GownPiece, fit: Fit = GOWN_FIT): Map<number, string> {
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
  const out = new Map<number, string>();
  const pad = 3;
  for (let y = Math.max(0, Math.floor(y0) - pad); y <= Math.min(GRID - 1, Math.ceil(y1) + pad); y++) {
    for (let x = Math.max(0, Math.floor(x0) - pad); x <= Math.min(GRID - 1, Math.ceil(x1) + pad); x++) {
      const p = toRef(r, v((x + 0.5) / RES, (y + 0.5) / RES), fit);
      const ch = piece.rows[Math.floor(p.y * RES) - piece.y]?.[Math.floor(p.x * RES) - piece.x];
      if (ch && ch !== '.') out.set(y * GRID + x, ch);
    }
  }
  // a pixel the stretch left hanging by one side (a spur off the hem where the cloth shears) goes: his piece has
  // none, so at rest this changes nothing
  for (let pass = 0; pass < 2; pass++) {
    const spurs = [...out.keys()].filter((i) => +out.has(i - 1) + +out.has(i + 1) + +out.has(i - GRID) + +out.has(i + GRID) < 2);
    for (const i of spurs) out.delete(i);
  }
  const lined = new Map<number, string>();
  for (const [idx, ch] of out) {
    const x = idx % GRID;
    const edge = x === 0 || x === GRID - 1 || !out.has(idx - 1) || !out.has(idx + 1) || !out.has(idx - GRID) || !out.has(idx + GRID);
    lined.set(idx, edge ? 'k' : ch);
  }
  return lined;
}

/** His colours recoloured by the item's slots: each slot moves the characters it owns the way its base colour moves. */
const tint =
  (slots: [string, string, string][]) =>
  (ch: string, hex: string): string => {
    for (const [chars, base, to] of slots) if (chars.includes(ch)) return retintHex(hex, base, to);
    return hex;
  };

function drawGown(g: DrawCtx, color: (ch: string, hex: string) => string): void {
  const L = g.L('skirt');
  const pens: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(PRINCESS_SKIRT.colors)) pens[ch] = g.m(color(ch, hex), 'flat');
  for (const [idx, ch] of placeGown(g.rig, PRINCESS_SKIRT)) L.set(idx % GRID, Math.floor(idx / GRID), pens[ch], 3, 'pelvis', F_NO_TEXTURE | F_NO_OUTLINE);
}

export const ROSE_GOWN_SKIRT: ItemDef = {
  id: 'skirt_rose_gown',
  slot: 'skirt',
  name: 'Rose Dawn Gown Skirt',
  desc: 'A ball-gown skirt to the floor: a pink overskirt open at the front, its hems embroidered in lilac and gold, over a lilac underskirt with a gold hem band and a dark purple petticoat. Women only.',
  colors: [
    { key: 'cloth', label: 'Cloth', default: PRINCESS_SKIRT_CLOTH_BASE },
    { key: 'lilac', label: 'Underskirt', default: PRINCESS_SKIRT_LILAC_BASE },
    { key: 'gold', label: 'Embroidery', default: PRINCESS_SKIRT_GOLD_BASE, kind: 'metal' },
    { key: 'petticoat', label: 'Petticoat', default: PRINCESS_SKIRT_PETTICOAT_BASE },
  ],
  bodies: ['female', 'slender'],
  draw: (g, [cloth, lilac, gold, petticoat]) => {
    drawGown(
      g,
      tint([
        [PRINCESS_SKIRT_CLOTH, PRINCESS_SKIRT_CLOTH_BASE, cloth],
        [PRINCESS_SKIRT_LILAC, PRINCESS_SKIRT_LILAC_BASE, lilac],
        [PRINCESS_SKIRT_GOLD, PRINCESS_SKIRT_GOLD_BASE, gold],
        [PRINCESS_SKIRT_PETTICOAT, PRINCESS_SKIRT_PETTICOAT_BASE, petticoat],
      ]),
    );
  },
};
