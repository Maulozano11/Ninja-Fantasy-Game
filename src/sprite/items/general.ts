// The owner's Roman general (docs/reference/roman-general-owner-reference.jpg, 2026-10-24: "pasa solo conjunto
// de pecho y cara y pelo"): his two chest sets, each its own creator option, and his face, eyes and hair. The
// left figure's bronze cuirass with gold spirals and a lion face, the right figure's gold muscle cuirass; the
// left's gold-rimmed pauldrons, the right's studded pauldrons with their strips; the short navy sleeves and the
// magenta scarf with its clasp, which each cuirass wears as its own figure has them. His picture is brought down
// to our scale and cleaned in his palette (tools/refs/general_ref.py); each piece lies on our own figure, its
// joint on ours, and turns whole about it in every pose. (His face and eyes are the 'general' face and eye
// shape: body.ts.) Male bodies only (male, bulky): the women keep their own clothes.

import { armDepth, armJoints, type DrawCtx, type ItemDef, Side } from '../ctx';
import { type PaintedPiece, segAngle, stampBent, stampLeaning, stampPiece } from '../painted';
import { type PartId } from '../raster';
import { drawRig, type Rig } from '../rig';
import type { BodyType } from '../types';
import { GENERAL_SKIN } from '../generalHeadArt';
import * as CL from './generalClothArt';
import * as CU from './generalCuirassArt';
import { GENERAL_HAIR, GENERAL_HAIR_BASE, GENERAL_HAIR_KIND } from './generalHairArt';
import * as PA from './generalPauldronsArt';
import { hopliteTint, lineOf, stampOnFace, torsoOff } from './hoplite';

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });
/** His pieces are cut to the male figure; the female bodies keep their own clothes. */
const MEN = ['male', 'bulky'] as const;
const prt = (s: Side) => `upperArm${s}` as PartId;
type Kinds = Record<string, string>;
const tint = (g: DrawCtx, kinds: Kinds, slots: Record<string, [string, string]>) => hopliteTint(g, kinds, slots, GENERAL_SKIN);

const IDLE = new Map<BodyType, Rig>();
/** Our rig at male idle frame 0 on this body: where his pieces lie as he drew them. */
const idle = (body: BodyType): Rig => {
  let r = IDLE.get(body);
  if (!r) IDLE.set(body, (r = drawRig(body, 'idle', 0)));
  return r;
};
const torsoAngle = (g: DrawCtx) => segAngle(g.rig.pelvis, g.rig.neck);
/** How far the torso has turned from rest (degrees). */
const torsoTurn = (g: DrawCtx) => {
  const r = idle(g.rig.body);
  return torsoAngle(g) - segAngle(r.pelvis, r.neck);
};
const wrap = (a: number) => ((a + 540) % 360) - 180;

/** The two figures' sets: his chest, pauldrons, sleeves and scarf on each. */
const SETS = {
  spiral: {
    chest: CU.GENERAL_SPIRAL_CHEST,
    chestK: CU.GENERAL_SPIRAL_CHEST_KIND as Kinds,
    sleeves: { N: [CL.GENERAL_SLEEVE_N, CL.GENERAL_SLEEVE_N_KIND as Kinds], F: [CL.GENERAL_SLEEVE_F, CL.GENERAL_SLEEVE_F_KIND as Kinds] } as Record<Side, [PaintedPiece, Kinds]>,
    scarf: [CL.GENERAL_SCARF, CL.GENERAL_SCARF_KIND as Kinds] as [PaintedPiece, Kinds],
  },
  muscle: {
    chest: CU.GENERAL_MUSCLE_CHEST,
    chestK: CU.GENERAL_MUSCLE_CHEST_KIND as Kinds,
    sleeves: { N: [CL.GENERAL_M_SLEEVE_N, CL.GENERAL_M_SLEEVE_N_KIND as Kinds], F: [CL.GENERAL_M_SLEEVE_F, CL.GENERAL_M_SLEEVE_F_KIND as Kinds] } as Record<Side, [PaintedPiece, Kinds]>,
    scarf: [CL.GENERAL_M_SCARF, CL.GENERAL_M_SCARF_KIND as Kinds] as [PaintedPiece, Kinds],
  },
};
/** The figure whose sleeves and scarf go with the cuirass worn (the spiral one's without his cuirass). */
const setOf = (g: DrawCtx) => (g.has('armor', 'armor_general_muscle') ? SETS.muscle : SETS.spiral);

function drawChest(g: DrawCtx, piece: PaintedPiece, kinds: Kinds, base: string, c: string): void {
  torsoOff(g);
  stampLeaning(g, 'torso.armor', piece, g.rig.neck, torsoAngle(g), 'torso', tint(g, kinds, { warm: [base, c] }), lineOf(kinds));
}

/** A pauldron rides the torso and follows the upper arm part of the way, so it never smears across the chest. */
function pauldronAngle(g: DrawCtx, piece: PaintedPiece, s: Side): number {
  const j = armJoints(g.rig, s);
  const t = torsoTurn(g);
  return piece.angle + t + 0.6 * wrap(segAngle(j.shoulder, j.elbow) - piece.angle - t);
}

function drawPauldrons(g: DrawCtx, pieces: [Side, PaintedPiece, Kinds][], base: string, c: string): void {
  for (const [s, p, k] of pieces) {
    const j = armJoints(g.rig, s);
    stampPiece(g, armDepth(s, 'armor'), p, j.shoulder, pauldronAngle(g, p, s), prt(s), tint(g, k, { warm: [base, c] }), lineOf(k));
  }
}

function drawSleeves(g: DrawCtx, cloth: string): void {
  for (const s of ['F', 'N'] as Side[]) {
    const [p, k] = setOf(g).sleeves[s];
    const j = armJoints(g.rig, s);
    const upper = segAngle(j.shoulder, j.elbow);
    const bend = wrap(p.angle + torsoTurn(g) - upper);
    stampBent(g, armDepth(s, 'cloth'), p, j.shoulder, upper, prt(s), [{ about: j.shoulder, r: 4, bend }], lineOf(k), tint(g, k, { navy: [CL.GENERAL_SLEEVE_NAVY, cloth], hair: [CL.GENERAL_SLEEVE_NAVY, cloth] }));
  }
}

function drawScarf(g: DrawCtx, cloth: string, clasp: string): void {
  const [p, k] = setOf(g).scarf;
  stampLeaning(g, 'capeFront', p, g.rig.neck, torsoAngle(g), 'torso', tint(g, k, { purple: [CL.GENERAL_SCARF_CLOTH, cloth], warm: [CL.GENERAL_SCARF_CLASP, clasp] }), lineOf(k));
}

export const GENERAL_ITEMS: ItemDef[] = [
  {
    id: 'armor_general_spiral',
    slot: 'armor',
    name: "General's Spiral Cuirass",
    desc: 'A bronze cuirass with gold spirals all over, a lion face on the chest and a belt with a square buckle, painted by the owner for his Roman general (+4 AC).',
    colors: [col('bronze', 'Bronze', CU.GENERAL_SPIRAL_BRONZE, 'metal')],
    statsArmor: 'Greek Hoplite Cuirass',
    bodies: [...MEN],
    draw: (g, [c]) => drawChest(g, CU.GENERAL_SPIRAL_CHEST, CU.GENERAL_SPIRAL_CHEST_KIND, CU.GENERAL_SPIRAL_BRONZE, c),
  },
  {
    id: 'armor_general_muscle',
    slot: 'armor',
    name: "General's Muscle Cuirass",
    desc: 'A gold muscle cuirass with sculpted abs and pecs, a lion face at the chest, spirals at the shoulders and a belt, painted by the owner for his Roman general (+4 AC).',
    colors: [col('gold', 'Gold', CU.GENERAL_MUSCLE_GOLD, 'metal')],
    statsArmor: 'Greek Hoplite Cuirass',
    bodies: [...MEN],
    draw: (g, [c]) => drawChest(g, CU.GENERAL_MUSCLE_CHEST, CU.GENERAL_MUSCLE_CHEST_KIND, CU.GENERAL_MUSCLE_GOLD, c),
  },
  {
    id: 'acc_general_pauldrons',
    slot: 'accessory',
    name: "General's Pauldrons",
    desc: 'Gold-rimmed bronze pauldrons, painted by the owner for his Roman general.',
    colors: [col('bronze', 'Bronze', PA.GENERAL_PAULDRON_BRONZE, 'metal')],
    bodies: [...MEN],
    draw: (g, [c]) =>
      drawPauldrons(g, [
        ['F', PA.GENERAL_PAULDRON_F, PA.GENERAL_PAULDRON_F_KIND],
        ['N', PA.GENERAL_PAULDRON_N, PA.GENERAL_PAULDRON_N_KIND],
      ], PA.GENERAL_PAULDRON_BRONZE, c),
  },
  {
    id: 'acc_general_studded_pauldrons',
    slot: 'accessory',
    name: "General's Studded Pauldrons",
    desc: 'Studded bronze pauldrons over hanging leather strips, painted by the owner for his Roman general.',
    colors: [col('bronze', 'Bronze', PA.GENERAL_STUDDED_BRONZE, 'metal')],
    bodies: [...MEN],
    draw: (g, [c]) =>
      drawPauldrons(g, [
        ['F', PA.GENERAL_STUDDED_F, PA.GENERAL_STUDDED_F_KIND],
        ['N', PA.GENERAL_STUDDED_N, PA.GENERAL_STUDDED_N_KIND],
      ], PA.GENERAL_STUDDED_BRONZE, c),
  },
  {
    id: 'top_general_sleeves',
    slot: 'top',
    name: "General's Sleeves",
    desc: 'Short navy sleeves on the upper arms, painted by the owner for his Roman general.',
    colors: [col('cloth', 'Cloth', CL.GENERAL_SLEEVE_NAVY)],
    bodies: [...MEN],
    draw: (g, [c]) => drawSleeves(g, c),
  },
  {
    id: 'acc_general_scarf',
    slot: 'accessory',
    name: "General's Scarf",
    desc: 'A magenta scarf wrapped round the neck, pinned by a round gold clasp, painted by the owner for his Roman general.',
    colors: [col('cloth', 'Cloth', CL.GENERAL_SCARF_CLOTH), col('clasp', 'Clasp', CL.GENERAL_SCARF_CLASP, 'metal')],
    bodies: [...MEN],
    draw: (g, [c, k]) => drawScarf(g, c, k),
  },
  {
    id: 'hair_general',
    slot: 'hair',
    name: "General's Curls",
    desc: 'A curly, voluminous light-brown mane to the jaw, painted by the owner for his Roman general.',
    colors: [col('main', 'Hair', GENERAL_HAIR_BASE)],
    bodies: [...MEN],
    draw: (g, [c]) => {
      const hair = [GENERAL_HAIR_BASE, c] as [string, string];
      stampOnFace(g, 'hairFront', GENERAL_HAIR, tint(g, GENERAL_HAIR_KIND, { warm: hair, hair, grey: hair }));
    },
  },
];
