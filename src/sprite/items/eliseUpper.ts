// The owner's Elise's coat and sleeves (armor_azure_coat): the reduced reference's pixels (her picture
// brought down to our scale, in her colours), one painted piece per segment of the rig
// (items/eliseUpperArt.ts, by tools/refs/elise-upper-from-ref.py from
// docs/reference/elise-owner-reference.jpg). Each piece turns with its segment; in our idle pose every
// pixel is the reduced reference's. The coat body ends at the belt (her belt, pouch and coat's tails
// are the lower part's); the bare shoulders and the wrists are our body's.

import { retintHex } from '../color';
import { armDepth, armJoints, type Depth, type DrawCtx, type ItemDef, type Side } from '../ctx';
import { PaintedPiece, segAngle, stampPiece } from '../painted';
import { GRID, partIndex, PartId, RES, Vec } from '../raster';
import { rotateTemplate } from '../rotsprite';
import {
  ELISE_BAND_TOP,
  ELISE_COAT,
  ELISE_COAT_BODY,
  ELISE_COAT_CHARS,
  ELISE_COAT_FROM,
  ELISE_CORSET,
  ELISE_CORSET_CHARS,
  ELISE_CUFF,
  ELISE_PLATE,
  ELISE_PLATE_CHARS,
  ELISE_SKIN,
  ELISE_SKIN_CHARS,
  ELISE_SLEEVE_FORE_F,
  ELISE_SLEEVE_FORE_N,
  ELISE_SLEEVE_UPPER_F,
  ELISE_SLEEVE_UPPER_N,
  ELISE_TRIM,
  ELISE_TRIM_CHARS,
} from './eliseUpperArt';

/**
 * Her coat recoloured: her blues follow Coat, her golds Trim, her whites Plate and her corset's navy
 * Corset, each shade as far from the slot's colour as hers was from hers; her skin in the collar
 * follows the skin tone; her line and her leather straps stay.
 */
const coatColor = (g: DrawCtx, coat: string, trim: string, plate: string, corset: string) => (ch: string, hex: string): string =>
  ELISE_COAT_CHARS.includes(ch)
    ? retintHex(hex, ELISE_COAT, coat)
    : ELISE_TRIM_CHARS.includes(ch)
      ? retintHex(hex, ELISE_TRIM, trim)
      : ELISE_PLATE_CHARS.includes(ch)
        ? retintHex(hex, ELISE_PLATE, plate)
        : ELISE_CORSET_CHARS.includes(ch)
          ? retintHex(hex, ELISE_CORSET, corset)
          : ELISE_SKIN_CHARS.includes(ch)
            ? retintHex(hex, ELISE_SKIN, g.look.skin)
            : hex;

/** The fine pixels a painted piece covers when stamped as stampPiece stamps it (1 where it does). */
function cover(piece: PaintedPiece, at: Vec, deg: number, out: Uint8Array = new Uint8Array(GRID * GRID)): Uint8Array {
  const ax = Math.floor(at.x * RES);
  const ay = Math.floor(at.y * RES);
  for (const p of rotateTemplate(piece, deg - piece.angle)) {
    const x = ax + p.dx;
    const y = ay + p.dy;
    if (x >= 0 && y >= 0 && x < GRID && y < GRID) out[y * GRID + x] = 1;
  }
  return out;
}

/** Where the middle of fine pixel i lies along the segment a -> b (0 at a, 1 at b). */
function along(i: number, a: Vec, b: Vec): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return ((((i % GRID) + 0.5) / RES - a.x) * dx + ((Math.floor(i / GRID) + 0.5) / RES - a.y) * dy) / (dx * dx + dy * dy || 1);
}

const TORSO_DEPTHS: Depth[] = ['torso.body', 'torso.under', 'torso.top'];

/**
 * The coat stands for our torso from its lower edge to the neck: what of our torso (or of a shirt
 * under it) would show past the coat is taken away, so the figure's edge there is hers in every pose.
 */
function clearTorso(g: DrawCtx, hull: Uint8Array): void {
  const r = g.rig;
  const torso = partIndex('torso');
  const neck = (r.neck.x - r.pelvis.x) * r.up.x + (r.neck.y - r.pelvis.y) * r.up.y;
  for (const d of TORSO_DEPTHS) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || L.part[i] !== torso || hull[i]) continue;
      const h = (((i % GRID) + 0.5) / RES - r.pelvis.x) * r.up.x + ((Math.floor(i / GRID) + 0.5) / RES - r.pelvis.y) * r.up.y;
      if (h >= ELISE_COAT_FROM && h <= neck) L.mat[i] = -1;
    }
  }
}

/**
 * The sleeves stand for our arm on side `s`: what of it shows past them is taken away, but for the
 * bare near shoulder above the band and the wrist past the cuff.
 */
function clearArm(g: DrawCtx, s: Side, sleeve: Uint8Array): void {
  const { shoulder, elbow, wrist } = armJoints(g.rig, s);
  const upper = partIndex(`upperArm${s}` as PartId);
  const fore = partIndex(`forearm${s}` as PartId);
  for (const d of [armDepth(s, 'body'), armDepth(s, 'cloth')]) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || sleeve[i]) continue;
      const p = L.part[i];
      if (p === upper && !(s === 'N' && along(i, shoulder, elbow) < ELISE_BAND_TOP)) L.mat[i] = -1;
      else if (p === fore && along(i, elbow, wrist) < ELISE_CUFF[s]) L.mat[i] = -1;
    }
  }
}

/**
 * Draws her coat and sleeves. The far sleeve goes behind the torso, the near one over it; within each
 * sleeve the upper arm's piece is over the forearm's, and each runs on under the other round the elbow,
 * so a bending elbow opens no gap. Then our torso and arms are taken away where they would show past
 * her coat and sleeves.
 */
function drawAzureCoat(g: DrawCtx, coat: string, trim: string, plate: string, corset: string): void {
  const r = g.rig;
  const tint = coatColor(g, coat, trim, plate, corset);
  const torso = segAngle(r.pelvis, r.neck);
  const sleeves: Record<Side, [PaintedPiece, Vec, Vec, PaintedPiece, Vec, Vec]> = {
    F: [ELISE_SLEEVE_FORE_F, r.elbowF, r.wristF, ELISE_SLEEVE_UPPER_F, r.shoulderF, r.elbowF],
    N: [ELISE_SLEEVE_FORE_N, r.elbowN, r.wristN, ELISE_SLEEVE_UPPER_N, r.shoulderN, r.elbowN],
  };
  const covers = {} as Record<Side, Uint8Array>;
  for (const s of ['F', 'N'] as Side[]) {
    const [fore, e, w, upper, sh, el] = sleeves[s];
    const d = armDepth(s, 'armor');
    stampPiece(g, d, fore, e, segAngle(e, w), `forearm${s}`, tint);
    stampPiece(g, d, upper, sh, segAngle(sh, el), `upperArm${s}`, tint);
    covers[s] = cover(upper, sh, segAngle(sh, el), cover(fore, e, segAngle(e, w)));
    if (s === 'F') stampPiece(g, 'torso.armor', ELISE_COAT_BODY, r.neck, torso, 'torso', tint);
  }
  clearTorso(g, cover(ELISE_COAT_BODY, r.neck, torso));
  for (const s of ['F', 'N'] as Side[]) clearArm(g, s, covers[s]);
}

// The owner's Elise (2026-10-21), her picture brought down to our scale in her colours
export const AZURE_COAT: ItemDef = {
  id: 'armor_azure_coat',
  slot: 'armor',
  name: 'Azure Blade Coat',
  desc: 'A sleeveless royal-blue coat with a high gold-trimmed collar, open over a white breastplate and a navy corset with two steel buckles, and detached sleeves: a gold-trimmed blue band on the upper arm and white forearm guards (+4 AC). Women only.',
  colors: [
    { key: 'coat', label: 'Coat', default: ELISE_COAT, kind: 'cloth' },
    { key: 'trim', label: 'Trim', default: ELISE_TRIM, kind: 'metal' },
    { key: 'plate', label: 'Plate', default: ELISE_PLATE, kind: 'metal' },
    { key: 'corset', label: 'Corset', default: ELISE_CORSET, kind: 'cloth' },
  ],
  statsArmor: 'Greek Hoplite Cuirass',
  bodies: ['female', 'slender'],
  draw: (g, [coat, trim, plate, corset]) => drawAzureCoat(g, coat, trim, plate, corset),
};
