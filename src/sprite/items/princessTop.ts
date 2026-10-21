// The princess's bodice and sleeves (provisional "Rosalind, the Rose Dawn Princess"): the owner's picture at our
// game scale, his pixels one for one (princessTopArt.ts, tools/refs/princess-top-from-ref.py), cut into painted
// pieces that ride the rig. In our female idle every pixel of these clothes that his picture shows is his, where
// he drew it, but the far lilac sleeve: his far arm is raised to hold the sceptre up and ours hangs, so that
// sleeve lies along our forearm. His colours are the colour slots' defaults: kept, his pixels stay his.

import { retintHex } from '../color';
import type { Depth, DrawCtx, ItemDef } from '../ctx';
import { PaintedPiece, segAngle, stampPiece } from '../painted';
import { gripAngle, throwsKunai } from '../grip';
import { add, Layer, partIndex, RES, v, type PartId, type Vec } from '../raster';
import { stampTemplate, type TemplatePalette } from '../rotsprite';
import { bareHandOff } from './clothes';
import { PRINCESS_HAND_N, PRINCESS_HAND_N_SKIN, PRINCESS_HAND_SKIN_BASE } from './princessHandsArt';
import {
  PRINCESS_BODICE,
  PRINCESS_BODICE_SIDE_F,
  PRINCESS_BODICE_TIP,
  PRINCESS_CUFF_F,
  PRINCESS_CUFF_N,
  PRINCESS_SLEEVE_F,
  PRINCESS_SLEEVE_F_SIDE,
  PRINCESS_SLEEVE_N,
  PRINCESS_TOP_GOLD,
  PRINCESS_TOP_LILAC,
  PRINCESS_TOP_PINK,
  PRINCESS_TOP_SKIN,
} from './princessTopArt';

/**
 * Where the far lilac sleeve's pivot (his pixel (60, 44), its inner end) lies off his far hand (his joint
 * (73, 46.5)), in rig units: with her sceptre at rest her far arm is raised and her far hand is where he drew it
 * (rig.ts IDLE_SCEPTRE, SCEPTRE_CARRY), and the sleeve goes on by the hand at his angle, so it is his pixels where he drew them.
 */
const CUFF_F_OFF_HAND = v((60.5 - 73) / RES, (44.5 - 46.5) / RES);

/** The colour each slot replaces (its default): his pink, lilac and gold; and the skin he painted her in. */
const PINK = PRINCESS_TOP_PINK[0];
const LILAC = PRINCESS_TOP_LILAC[0];
const GOLD = PRINCESS_TOP_GOLD[0];
const SKIN = PRINCESS_TOP_SKIN[0];

const col = (key: string, label: string, def: string, kind: 'cloth' | 'metal' = 'cloth') => ({ key, label, default: def, kind });

/**
 * The bodice, back to front: the far lilac sleeve and the far puff behind the body (the puff's columns by the
 * bodice again over the body's edge, over the bodice's far side under it), the bodice over the body,
 * then the near lilac sleeve and the near puff over it. Each of his tones of a kind moves the way its slot moved
 * from his colour (retintHex), his skin the way the player's skin moves from his; his black line stays. With no
 * armour on, the bodice's point is drawn again over the skirt, as he drew it.
 */
function drawBodice(g: DrawCtx, pink: string, lilac: string, gold: string): void {
  const r = g.rig;
  const tint = (_ch: string, hex: string): string => {
    if (PRINCESS_TOP_PINK.includes(hex)) return retintHex(hex, PINK, pink);
    if (PRINCESS_TOP_LILAC.includes(hex)) return retintHex(hex, LILAC, lilac);
    if (PRINCESS_TOP_GOLD.includes(hex)) return retintHex(hex, GOLD, gold);
    if (PRINCESS_TOP_SKIN.includes(hex)) return retintHex(hex, SKIN, g.look.skin);
    return hex;
  };
  const put = (d: Depth, p: PaintedPiece, at: Vec, deg: number, part: PartId) => stampPiece(g, d, p, at, deg, part, tint);
  const torso = segAngle(r.pelvis, r.neck);
  // With her sceptre up in her far fist (rig.sceptreUp) the far arm is raised and he drew its sleeve in front of
  // the skirt: it goes on over the gown, his pixels at his angle. Otherwise it lies along our forearm behind the body.
  if (r.sceptreUp) put('torso.armor', PRINCESS_CUFF_F, add(r.handF, CUFF_F_OFF_HAND), PRINCESS_CUFF_F.angle, 'forearmF');
  else put('farArm.cloth', PRINCESS_CUFF_F, r.elbowF, segAngle(r.elbowF, r.wristF), 'forearmF');
  // With the sceptre up the far arm is held as he drew it, so the far puff is too: unturned, every pixel his.
  const puffF = r.sceptreUp ? PRINCESS_SLEEVE_F.angle : segAngle(r.shoulderF, r.elbowF);
  put('farArm.cloth', PRINCESS_SLEEVE_F, r.shoulderF, puffF, 'upperArmF');
  // our torso is drawn over the far arm and reaches under the far puff: its columns by the bodice go again over it,
  // over the bodice's far side (seen when the far arm moves away)
  put('torso.top', PRINCESS_BODICE_SIDE_F, r.neck, torso, 'torso');
  put('torso.top', PRINCESS_SLEEVE_F_SIDE, r.shoulderF, puffF, 'upperArmF');
  put('torso.top', PRINCESS_BODICE, r.neck, torso, 'torso');
  if (!g.has('armor')) put('torso.over', PRINCESS_BODICE_TIP, r.neck, torso, 'torso');
  // His open near hand on the skirt in place of ours where ours hangs open (shape 'hold': at rest and walking) and
  // holds nothing; it rides the cuff (its pivot and angle), under it. Gloves keep their own hand.
  if (r.shapeN === 'hold' && gripAngle(g) === null && !throwsKunai(g) && !g.has('hands')) {
    bareHandOff(g, 'N');
    stampPiece(g, 'nearArm.cloth', PRINCESS_HAND_N, r.elbowN, segAngle(r.elbowN, r.wristN), 'handN', (ch, hex) =>
      PRINCESS_HAND_N_SKIN.includes(ch) ? retintHex(hex, PRINCESS_HAND_SKIN_BASE, g.look.skin) : hex,
    );
  }
  put('nearArm.cloth', PRINCESS_CUFF_N, r.elbowN, segAngle(r.elbowN, r.wristN), 'forearmN');
  put('nearArm.cloth', PRINCESS_SLEEVE_N, r.shoulderN, segAngle(r.shoulderN, r.elbowN), 'upperArmN');
  trimUnder(g, 'nearArm.body', 'upperArmN', PRINCESS_SLEEVE_N, r.shoulderN, segAngle(r.shoulderN, r.elbowN));
}

/**
 * Our upper arm is a little fuller than his bare shoulder and puff: what of it his sleeve does not cover is taken
 * off, or it (and its outline) pokes out past his line into his back hair.
 */
function trimUnder(g: DrawCtx, depth: Depth, part: PartId, p: PaintedPiece, at: Vec, deg: number): void {
  const mask = new Layer();
  const pal: TemplatePalette = {};
  for (const ch of Object.keys(p.colors)) pal[ch] = [0, 3];
  stampTemplate(mask, p, at, deg - p.angle, pal, part);
  const L = g.L(depth);
  const k = partIndex(part);
  for (let i = 0; i < L.mat.length; i++) if (L.mat[i] >= 0 && L.part[i] === k && mask.mat[i] < 0) L.mat[i] = -1;
}

/** The princess's bodice (slot top), women only: cut for the female figure. */
export const PRINCESS_BODICE_ITEM: ItemDef = {
  id: 'top_rose_bodice',
  slot: 'top',
  name: 'Rose Dawn Bodice',
  desc: "The princess's gown bodice: a high lilac collar edged in gold over bare shoulders, a gold-embroidered lilac bodice with a pointed waist and pink sides, pink puffed sleeves with gold bands over big lilac puffed sleeves with gold cuffs. Women only.",
  colors: [col('pink', 'Dress', PINK), col('lilac', 'Lilac', LILAC), col('gold', 'Gold', GOLD, 'metal')],
  bodies: ['female', 'slender'],
  draw: (g, [pink, lilac, gold]) => drawBodice(g, pink, lilac, gold),
};
