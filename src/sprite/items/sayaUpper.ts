// Saya's ninja top, arm guards and fingerless gloves, the owner's pixels 1:1 from his Saya drawn at our
// scale (2026-10-21: his heroines set the standard for women; tools/refs/saya-upper-from-ref.py and the
// pieces it writes, sayaUpperArt.ts).

import { retintHex } from '../color';
import { armDepth, armJoints, Depth, DrawCtx, handDraw, handPose, ItemDef, Side } from '../ctx';
import { PaintedPiece, segAngle, stampPiece } from '../painted';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, PartId, RES, Vec } from '../raster';
import {
  SAYA_CLOTH,
  SAYA_FORE_F,
  SAYA_FORE_N,
  SAYA_GLOVE_TONES,
  SAYA_GLOVE_ZONES,
  SAYA_KIND,
  SAYA_PLATE,
  SAYA_SHOULDER_N,
  SAYA_SKIN,
  SAYA_TOP,
  SAYA_TRIM,
  SAYA_UPPER_F,
  SAYA_UPPER_N,
} from './sayaUpperArt';

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });

/**
 * Her colours recoloured: her navy follows Cloth, her reds Trim and her cream Plate, each shade as far
 * from the slot's colour as hers was from her base; her black line, her gold and the brown strap stay.
 */
const shadeColor = (cloth: string, trim: string, plate: string, skin: string) => (_ch: string, hex: string): string => {
  const k = SAYA_KIND[hex];
  if (k === 'cloth') return retintHex(hex, SAYA_CLOTH, cloth);
  if (k === 'trim') return retintHex(hex, SAYA_TRIM, trim);
  if (k === 'plate') return retintHex(hex, SAYA_PLATE, plate);
  if (k === 'skin') return retintHex(hex, SAYA_SKIN, skin);
  return hex;
};

/**
 * Draws her top and arm guards. Within a depth the pieces go back to front: the far forearm guard,
 * then the far upper guard over its top; the top over the torso (under a skirt or a belt, which go
 * over its hem); the near forearm guard, her bare near shoulder, then the near upper guard over their tops, so a bent elbow
 * shows the forearm guard under the elbow band and never the skin.
 */
function drawShadeArmor(g: DrawCtx, cloth: string, trim: string, plate: string): void {
  const r = g.rig;
  const tint = shadeColor(cloth, trim, plate, g.look.skin || SAYA_SKIN);
  const put = (d: Depth, p: PaintedPiece, at: Vec, deg: number, part: PartId) => stampPiece(g, d, p, at, deg, part, tint);
  put('farArm.armor', SAYA_FORE_F, r.elbowF, segAngle(r.elbowF, r.wristF), 'forearmF');
  put('farArm.armor', SAYA_UPPER_F, r.shoulderF, segAngle(r.shoulderF, r.elbowF), 'upperArmF');
  put('torso.top', SAYA_TOP, r.neck, segAngle(r.pelvis, r.neck), 'torso');
  put('nearArm.armor', SAYA_FORE_N, r.elbowN, segAngle(r.elbowN, r.wristN), 'forearmN');
  // her bare near shoulder (light skin in her line), then the upper guard over its foot
  put('nearArm.armor', SAYA_SHOULDER_N, r.shoulderN, segAngle(r.shoulderN, r.elbowN), 'upperArmN');
  put('nearArm.armor', SAYA_UPPER_N, r.shoulderN, segAngle(r.shoulderN, r.elbowN), 'upperArmN');
}

type Zone = 'strap' | 'back' | 'band' | 'skin';

/** The glove zone `along` fine pixels from the wrist cell's middle toward the fingers, on that hand (null: bare). */
function gloveZone(s: Side, along: number): Zone | null {
  const zones = SAYA_GLOVE_ZONES[s];
  let zone: Zone | null = null;
  for (const [from, z] of zones) if (along >= from) zone = z;
  return along < zones[0][0] ? null : zone;
}

/**
 * Her fingerless gloves on our hand pictures, whatever the pose: each hand is drawn as the body draws
 * it, and the pixels from the wrist to the knuckles are painted in her glove (the strap, the back of
 * the hand, the red band) by how far they lie along the hand picture, each shade one of her tones. The
 * near hand's fingers past the band stay the body's own hand; the far hand is only the strap, its fist
 * in her own skin (lit on the knuckles as she has it, in the player's skin).
 */
function drawShadeGloves(g: DrawCtx, glove: string, trim: string, skin: string): void {
  const tone = (hex: string, from: string, to: string) => g.m(retintHex(hex, from, to), 'flat');
  for (const s of ['F', 'N'] as Side[]) {
    const part: PartId = s === 'N' ? 'handN' : 'handF';
    const tmp = new Layer();
    handDraw(g, tmp, s, { mat: 0, part });
    const { kind, rot } = handPose(g, s);
    const w = armJoints(g.rig, s).wrist;
    const wx = Math.floor(w.x * RES) + 0.5;
    const wy = Math.floor(w.y * RES) + 0.5;
    // Our hand pictures hang from the wrist (turned by `rot`); the cradling hand stands on it.
    const a = (rot * Math.PI) / 180;
    const [dx, dy] = kind === 'cradle' ? [0, -1] : [-Math.sin(a), Math.cos(a)];
    const T = SAYA_GLOVE_TONES;
    const strap = (s === 'N' ? T.strapN : T.strapF).map((h) => g.m(h, 'flat'));
    // her near glove is navy with a red band over the knuckles; her far hand is a bare fist under the strap
    const back = T.backN.map((h) => tone(h, SAYA_CLOTH, glove));
    const band = T.bandN.map((h) => tone(h, SAYA_TRIM, trim));
    const bare = T.skinF.map((h) => tone(h, SAYA_SKIN, skin));
    const tones: Record<Zone, number[]> = { strap, back, band, skin: bare };
    const L = g.L(armDepth(s, 'armor'));
    for (let i = 0; i < GRID * GRID; i++) {
      if (tmp.mat[i] < 0) continue;
      const x = i % GRID;
      const y = (i / GRID) | 0;
      const zone = gloveZone(s, (x + 0.5 - wx) * dx + (y + 0.5 - wy) * dy);
      if (!zone) continue;
      L.set(x, y, tones[zone][Math.min(tmp.shade[i], 4)], 3, part, F_NO_TEXTURE | F_NO_OUTLINE);
    }
  }
}

export const SAYA_SHADE_ARMOR: ItemDef = {
  id: 'armor_crimson_shade',
  slot: 'armor',
  name: 'Crimson Shade Garb',
  desc: 'A sleeveless navy ninja top with a cream chest plate, red piping down the front, and navy arm guards banded in red (+2 AC). Women only.',
  colors: [col('cloth', 'Cloth', SAYA_CLOTH), col('trim', 'Trim', SAYA_TRIM), col('plate', 'Plate', SAYA_PLATE, 'metal')],
  statsArmor: 'Leaf Chunin Flak',
  bodies: ['female', 'slender'],
  draw: (g, [cloth, trim, plate]) => drawShadeArmor(g, cloth, trim, plate),
};

export const SAYA_SHADE_GLOVES: ItemDef = {
  id: 'hands_shade_fingerless',
  slot: 'hands',
  name: 'Shade Fingerless Gloves',
  desc: 'Fingerless gloves: a leather strap round the wrist, navy over the back of the hand with a red band over the knuckles (only the strap on the off hand).',
  colors: [col('main', 'Glove', SAYA_CLOTH), col('trim', 'Trim', SAYA_TRIM)],
  draw: (g, [glove, trim]) => drawShadeGloves(g, glove, trim, g.look.skin || SAYA_SKIN),
};
