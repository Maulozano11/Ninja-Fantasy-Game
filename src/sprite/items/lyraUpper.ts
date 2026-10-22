// Lyra's blouse and her corset, pauldron and bracers: the owner's pixels from his picture of her at our
// game's scale (docs/reference/lyra-game-scale-owner-reference.jpg, 2026-10-21: "tus referencias
// perfectas del modelo de mujer"; one of his pixels is one of ours), cut into painted pieces that ride
// the rig (items/lyraUpperArt.ts, tools/refs/lyra-upper-from-ref.py). In our female idle every pixel of
// these clothes that his picture shows is his, where he drew it; in other poses each piece turns with
// its segment. His colours are the colour slots' defaults: kept, his pixels stay his.

import { retintHex } from '../color';
import type { Depth, DrawCtx, ItemDef } from '../ctx';
import { PaintedPiece, segAngle, stampPiece } from '../painted';
import { RES, type PartId, type Vec } from '../raster';
import { rotateTemplate } from '../rotsprite';
import {
  BLOUSE_FOREARM_F,
  BLOUSE_FOREARM_F_CUT,
  BLOUSE_FOREARM_N,
  BLOUSE_FOREARM_N_CUT,
  BLOUSE_SHOULDER_CUT,
  BLOUSE_SIDE_F,
  BLOUSE_SLEEVE_F,
  BLOUSE_SLEEVE_N,
  BLOUSE_SLEEVE_N_CUT,
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
import { clearLayers, drawOwner, slotTint } from '../ownerFrames';
import { FEMALE_BASE_SKIN } from '../femaleBaseArt';
import { GRID } from '../raster';

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
  // In the owner's own frames of her (ownerFrames.ts) the blouse is his there with the skin of her
  // shoulders, arms, hands and neck: our body's arms and torso come off under it.
  if (drawOwner(g, 'top', slotTint({ blouse: [BLOUSE, blouse], lining: [LINING, lining] }, g.look.skin))) {
    clearLayers(g, ['torso.body', 'nearArm.body', 'farArm.body']);
    return;
  }
  const r = g.rig;
  const cloth = recolour([
    [LYRA_BLOUSE, BLOUSE, blouse],
    [LYRA_LINING, LINING, lining],
  ]);
  // (the bare top of the near shoulder, above the puff, is his skin: in the character's skin)
  const tint = (ch: string, hex: string) => (LYRA_SKIN.includes(hex) ? hisSkinTone(hex, LYRA_SKIN[0], g.look.skin) : cloth(ch, hex));
  // (turned from his angle, a piece's edge is closed in the line: nothing of her is left cut open)
  const put = (d: Depth, p: PaintedPiece, at: Vec, deg: number, part: PartId) => stampPiece(g, d, p, at, deg, part, tint, undefined, true);
  put('farArm.cloth', BLOUSE_FOREARM_F, r.wristF, segAngle(r.elbowF, r.wristF), 'forearmF');
  takeOff(g, 'farArm.body', BLOUSE_FOREARM_F_CUT, r.wristF, segAngle(r.elbowF, r.wristF), CUT_SPREAD);
  put('farArm.cloth', BLOUSE_SLEEVE_F, r.shoulderF, segAngle(r.shoulderF, r.elbowF), 'upperArmF');
  put('torso.top', BLOUSE_SIDE_F, r.shoulderF, segAngle(r.shoulderF, r.elbowF), 'upperArmF');
  put('torso.top', BLOUSE_TORSO, r.neck, segAngle(r.pelvis, r.neck), 'torso');
  // the near fitted sleeve and cuff go with the arm itself, so the cuff casts no shadow on his fist
  put('nearArm.body', BLOUSE_FOREARM_N, r.wristN, segAngle(r.elbowN, r.wristN), 'forearmN');
  takeOff(g, 'nearArm.body', BLOUSE_FOREARM_N_CUT, r.wristN, segAngle(r.elbowN, r.wristN), CUT_SPREAD);
  put('nearArm.cloth', BLOUSE_SLEEVE_N, r.shoulderN, segAngle(r.shoulderN, r.elbowN), 'upperArmN');
  takeOff(g, 'nearArm.body', BLOUSE_SLEEVE_N_CUT, r.shoulderN, segAngle(r.shoulderN, r.elbowN));
  // (the owner's bare body's chest carries the shoulder's round over the arm: above his bare shoulder it goes)
  takeOff(g, 'torso.body', BLOUSE_SHOULDER_CUT, r.shoulderN, segAngle(r.shoulderN, r.elbowN), CUT_SPREAD);
  bareChest(g);
}

/**
 * His sports top's four greys on the chest of his bare body (femaleBaseArt.ts), each with the shade of
 * his skin it becomes under her blouse: his shadow tones, lightest to darkest, as the greys are.
 */
const SPORTS_TOP = new Map([
  ['#3e3e49', '#e3987e'],
  ['#363844', '#d38971'],
  ['#27262e', '#b66e5f'],
  ['#1f1f2b', '#a76859'],
]);

/**
 * She wears no sports top under her blouse: the body always wears his (body.ts drawBaseBody), and where
 * it would show between her clothes (a raised arm, the torso turned) it is her skin in his shadow tones,
 * moved to the character's skin. At rest her clothes cover it all.
 */
function bareChest(g: DrawCtx): void {
  const L = g.L('torso.body');
  const skin = new Map<number, number>();
  for (let i = 0; i < GRID * GRID; i++) {
    const m = L.mat[i];
    if (m < 0) continue;
    let s = skin.get(m);
    if (s === undefined) {
      const hex = g.mats.ramps[m][3];
      const his = SPORTS_TOP.get(hex);
      s = his ? g.m(retintHex(his, FEMALE_BASE_SKIN, g.look.skin), 'painted') : -1;
      skin.set(m, s);
    }
    if (s >= 0) L.mat[i] = s;
  }
}

/**
 * How far (degrees) a forearm may turn from where he drew it and still lose the columns of our forearm
 * beside his bracer and cuff: turned further, the cut (made at rest) no longer lies along our forearm,
 * which is drawn afresh at each angle, and would leave holes and loose line in it.
 */
const CUT_SPREAD = 15;

/**
 * Takes the body off where `cut` (laid as stampPiece lays a piece) says: his bare woman's shoulder (the
 * arm's round and the chest's over it) stands a row or two above his Lyra's, and her bare shoulder at the
 * top of the sleeve is the shoulder, her hair round it showing as he drew it; the body's forearms are a
 * column wider than her bracers and cuffs, whose line is the arm's (only within `spread` degrees of his
 * angle, if given).
 */
function takeOff(g: DrawCtx, depth: Depth, cut: PaintedPiece, at: Vec, deg: number, spread = 360): void {
  if (Math.abs(((deg - cut.angle + 540) % 360) - 180) > spread) return;
  const L = g.L(depth);
  const ax = Math.floor(at.x * RES);
  const ay = Math.floor(at.y * RES);
  for (const p of rotateTemplate(cut, deg - cut.angle)) L.clear(ax + p.dx, ay + p.dy);
}

/** The corset with its strap, the pauldron over it, and a bracer on each forearm. */
function drawCorset(g: DrawCtx, leather: string, gold: string, steel: string): void {
  if (drawOwner(g, 'armor', slotTint({ leather: [LEATHER, leather], gold: [GOLD, gold], steel: [STEEL, steel] }))) return;
  const r = g.rig;
  const tint = recolour([
    [LYRA_LEATHER, LEATHER, leather],
    [LYRA_GOLD, GOLD, gold],
    [LYRA_STEEL, STEEL, steel],
  ]);
  const put = (d: Depth, p: PaintedPiece, at: Vec, deg: number, part: PartId) => stampPiece(g, d, p, at, deg, part, tint, undefined, true);
  const torso = segAngle(r.pelvis, r.neck);
  put('farArm.armor', CORSET_BRACER_F, r.wristF, segAngle(r.elbowF, r.wristF), 'forearmF');
  put('torso.armor', CORSET, r.neck, torso, 'torso');
  put('torso.armor', CORSET_PAULDRON, r.shoulderF, pauldronAngle(torso, segAngle(r.shoulderF, r.elbowF)), 'upperArmF');
  put('nearArm.armor', CORSET_BRACER_N, r.wristN, segAngle(r.elbowN, r.wristN), 'forearmN');
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
