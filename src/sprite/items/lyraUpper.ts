// Lyra's blouse and her corset, pauldron and bracers: the owner's pixels from his picture of her at our
// game's scale (docs/reference/lyra-game-scale-owner-reference.jpg, 2026-10-21: "tus referencias
// perfectas del modelo de mujer"; one of his pixels is one of ours), cut into painted pieces that ride
// the rig (items/lyraUpperArt.ts, tools/refs/lyra-upper-from-ref.py). In our female idle every pixel of
// these clothes that his picture shows is his, where he drew it; in other poses each piece turns with
// its segment. His colours are the colour slots' defaults: kept, his pixels stay his.

import { retintHex } from '../color';
import type { Depth, DrawCtx, ItemDef } from '../ctx';
import { PaintedPiece, segAngle, stampPiece } from '../painted';
import type { PartId, Vec } from '../raster';
import {
  BLOUSE_FOREARM_F,
  BLOUSE_FOREARM_N,
  BLOUSE_SIDE_F,
  BLOUSE_SLEEVE_F,
  BLOUSE_SLEEVE_N,
  BLOUSE_TORSO,
  CORSET,
  CORSET_BRACER_F,
  CORSET_BRACER_N,
  CORSET_PAULDRON,
  LYRA_BLOUSE,
  LYRA_GOLD,
  LYRA_LEATHER,
  LYRA_LINING,
  LYRA_SKIN,
  LYRA_STEEL,
} from './lyraUpperArt';
import { hisSkinTone } from '../lyraFace';

/** The colour each slot replaces (its default): his cream, red, leather, gold and steel. */
const BLOUSE = LYRA_BLOUSE[0];
const LINING = LYRA_LINING[0];
const LEATHER = LYRA_LEATHER[0];
const GOLD = LYRA_GOLD[0];
const STEEL = LYRA_STEEL[0];

/**
 * His pixels recoloured: each of his tones of a kind moves the way its slot moved from his colour
 * (retintHex), so a slot left at its default keeps his pixels exactly. His black line, and whatever
 * the item has no slot for, stay his.
 */
function recolour(moves: [string[], string, string][]): (ch: string, hex: string) => string {
  return (_ch, hex) => {
    for (const [tones, from, to] of moves) if (tones.includes(hex)) return retintHex(hex, from, to);
    return hex;
  };
}

const col = (key: string, label: string, def: string, kind: 'cloth' | 'leather' | 'metal' = 'cloth') => ({ key, label, default: def, kind });

/**
 * The pauldron's angle: it rides the torso and follows the far arm part of the way (raised, the arm
 * lifts it about halfway), so it caps the shoulder in every pose and is exactly his at rest.
 */
function pauldronAngle(torso: number, arm: number): number {
  const rest = CORSET_PAULDRON.angle - CORSET.angle;
  return torso + rest + 0.45 * (((arm - torso - rest + 540) % 360) - 180);
}

/**
 * The blouse, back to front: the far fitted sleeve and the far puff behind the body, the far puff's
 * columns by the corset again over the body's edge (our torso is drawn over the far arm, and reaches
 * over them), the body of the blouse with its neckline, then the near fitted sleeve and the near puff.
 */
function drawBlouse(g: DrawCtx, blouse: string, lining: string): void {
  const r = g.rig;
  const cloth = recolour([
    [LYRA_BLOUSE, BLOUSE, blouse],
    [LYRA_LINING, LINING, lining],
  ]);
  // (the bare top of the near shoulder, above the puff, is his skin: in the character's skin)
  const tint = (ch: string, hex: string) => (LYRA_SKIN.includes(hex) ? hisSkinTone(hex, LYRA_SKIN[0], g.look.skin) : cloth(ch, hex));
  const put = (d: Depth, p: PaintedPiece, at: Vec, deg: number, part: PartId) => stampPiece(g, d, p, at, deg, part, tint);
  put('farArm.cloth', BLOUSE_FOREARM_F, r.elbowF, segAngle(r.elbowF, r.wristF), 'forearmF');
  put('farArm.cloth', BLOUSE_SLEEVE_F, r.shoulderF, segAngle(r.shoulderF, r.elbowF), 'upperArmF');
  put('torso.top', BLOUSE_SIDE_F, r.shoulderF, segAngle(r.shoulderF, r.elbowF), 'upperArmF');
  put('torso.top', BLOUSE_TORSO, r.neck, segAngle(r.pelvis, r.neck), 'torso');
  put('nearArm.cloth', BLOUSE_FOREARM_N, r.elbowN, segAngle(r.elbowN, r.wristN), 'forearmN');
  put('nearArm.cloth', BLOUSE_SLEEVE_N, r.shoulderN, segAngle(r.shoulderN, r.elbowN), 'upperArmN');
}

/** The corset with its strap, the pauldron over it, and a bracer on each forearm. */
function drawCorset(g: DrawCtx, leather: string, gold: string, steel: string): void {
  const r = g.rig;
  const tint = recolour([
    [LYRA_LEATHER, LEATHER, leather],
    [LYRA_GOLD, GOLD, gold],
    [LYRA_STEEL, STEEL, steel],
  ]);
  const put = (d: Depth, p: PaintedPiece, at: Vec, deg: number, part: PartId) => stampPiece(g, d, p, at, deg, part, tint);
  const torso = segAngle(r.pelvis, r.neck);
  put('farArm.armor', CORSET_BRACER_F, r.elbowF, segAngle(r.elbowF, r.wristF), 'forearmF');
  put('torso.armor', CORSET, r.neck, torso, 'torso');
  put('torso.armor', CORSET_PAULDRON, r.shoulderF, pauldronAngle(torso, segAngle(r.shoulderF, r.elbowF)), 'upperArmF');
  put('nearArm.armor', CORSET_BRACER_N, r.elbowN, segAngle(r.elbowN, r.wristN), 'forearmN');
}

/** Lyra's blouse (slot top), women only: cut for the female figure. */
export const LYRA_BLOUSE_ITEM: ItemDef = {
  id: 'top_offshoulder_blouse',
  slot: 'top',
  name: 'Off-Shoulder Blouse',
  desc: "Lyra's cream blouse worn off the shoulders: puffed sleeves, a red scarf band round the near shoulder and across the chest, a red V at the neckline edged in gold, long fitted sleeves to a cuff. Women only.",
  colors: [col('blouse', 'Blouse', BLOUSE), col('lining', 'Lining', LINING)],
  bodies: ['female', 'slender'],
  draw: (g, [blouse, lining]) => drawBlouse(g, blouse, lining),
};

/** Lyra's corset, pauldron and bracers (slot armor), light armour like Ember Leather, women only. */
export const LYRA_CORSET_ITEM: ItemDef = {
  id: 'armor_gilded_corset',
  slot: 'armor',
  name: 'Gilded Corset',
  desc: "Lyra's brown leather corset with gold filigree and two steel buckles, one gold pauldron on the far shoulder held by a strap across the chest, and leather bracers with gold studs (+4 AC). Women only.",
  colors: [col('leather', 'Leather', LEATHER, 'leather'), col('gold', 'Gold', GOLD, 'metal'), col('steel', 'Steel', STEEL, 'metal')],
  statsArmor: 'Samurai O-Yoroi',
  bodies: ['female', 'slender'],
  draw: (g, [leather, gold, steel]) => drawCorset(g, leather, gold, steel),
};
