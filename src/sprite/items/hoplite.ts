// The owner's bronze warrior (docs/reference/bronze-warrior-owner-reference.jpg, 2026-10-24: "nuevos sets para
// cuerpos masculinos hazme los sets de estos personajes"), part by part, each its own creator option: his
// hair and braid, his diadem, his cuirass (and the leather chest of his second picture), his pauldrons, his
// cape and scarf, his skirt, his bare arms with their bracers and fists, and his legs with their greaves
// and shoes. (His face and eyes are the 'hoplite' face and eye shape: body.ts.) His picture is brought down
// to our scale and cleaned in his palette (tools/refs/bronze_ref.py, his decision "Reducir y limpiar yo");
// worn whole his figure stands on his joints (hopliteRig.ts), so at male idle frame 0 every pixel is that
// reduction's. In other poses each piece of his turns whole about our joints. His black line and his
// near-blacks never take a colour; his skin follows the character's skin; the rest follows the colour slots.
// Male bodies only (male, bulky): the women keep their own clothes.

import { retintHex, retintSkinLifted } from '../color';
import { armDepth, armJoints, type Depth, DrawCtx, handPose, ItemDef, legDepth, legJoints, Side } from '../ctx';
import { type PaintedPiece, type PieceJoint, segAngle, stampBent, stampLeaning, stampPiece } from '../painted';
import { GRID, partIndex, PartId, RES, v } from '../raster';
import { hopliteArmStill, hopliteRig } from '../hopliteRig';
import { drawRig, type Rig } from '../rig';
import type { BodyType } from '../types';
import { HOPLITE_ARMOR_BRONZE, HOPLITE_ARMOR_STEEL, HOPLITE_CHEST, HOPLITE_CHEST_KIND, HOPLITE_CLASP, HOPLITE_CLASP_KIND } from './hopliteArmorArt';
import { HOPLITE_PAULDRON_BRONZE, HOPLITE_PAULDRON_F, HOPLITE_PAULDRON_F_KIND, HOPLITE_PAULDRON_N, HOPLITE_PAULDRON_N_KIND } from './hoplitePauldronsArt';
import * as RP from './hopliteRepaintArt';
import { faceAnchor } from '../body';

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });
/** His pieces are cut to the male figure; the female bodies keep their own clothes. */
const MEN = ['male', 'bulky'] as const;
const prt = (base: 'upperArm' | 'forearm' | 'hand' | 'thigh' | 'shin' | 'foot', s: Side) => `${base}${s}` as PartId;

/**
 * His colours through an item's slots: his black line and near-blacks stay, his skin follows the
 * character's skin (as his skin on the male limbs does), each other material follows its slot ([his base,
 * the chosen colour]; his own colour when the slot keeps his).
 */
export function hopliteTint(g: DrawCtx, kinds: Record<string, string>, slots: Record<string, [string, string]>) {
  return (_ch: string, hex: string): string => {
    const k = kinds[hex];
    if (k === 'line' || k === 'dark') return hex;
    if (k === 'skin') return retintSkinLifted(hex, RP.HOPLITE_R_SKIN, g.look.skin);
    const s = slots[k];
    return s ? retintHex(hex, s[0], s[1]) : hex;
  };
}
const lineOf = (kinds: Record<string, string>) => (hex: string) => kinds[hex] === 'line';

type Kinds = Record<string, string>;
/**
 * The pieces his two sets share are his own repaint's at our scale (docs/reference/bronze-warrior-repaint-owner-reference.jpg,
 * the owner, 2026-10-24: "aqui esta tu nueva version", and for the bronze set too: "si las usamos si arregla el
 * pixel"); his body there lies on his first picture's reduction to the pixel, so it stands on the same joints.
 */
const ART = {
  hair: RP.HOPLITE_R_HAIR,
  hairK: RP.HOPLITE_R_HAIR_KIND as Kinds,
  braid: RP.HOPLITE_R_BRAID,
  braidK: RP.HOPLITE_R_BRAID_KIND as Kinds,
  diadem: RP.HOPLITE_R_DIADEM,
  diademK: RP.HOPLITE_R_DIADEM_KIND as Kinds,
  cape: RP.HOPLITE_R_CAPE,
  capeK: RP.HOPLITE_R_CAPE_KIND as Kinds,
  scarf: RP.HOPLITE_R_SCARF,
  scarfK: RP.HOPLITE_R_SCARF_KIND as Kinds,
  skirt: RP.HOPLITE_R_SKIRT,
  skirtK: RP.HOPLITE_R_SKIRT_KIND as Kinds,
  arms: {
    N: { arm: RP.HOPLITE_R_ARM_N, armK: RP.HOPLITE_R_ARM_N_KIND as Kinds, bracer: RP.HOPLITE_R_BRACER_N, bracerK: RP.HOPLITE_R_BRACER_N_KIND as Kinds, fist: RP.HOPLITE_R_FIST_N, fistK: RP.HOPLITE_R_FIST_N_KIND as Kinds },
    F: { arm: RP.HOPLITE_R_ARM_F, armK: RP.HOPLITE_R_ARM_F_KIND as Kinds, bracer: RP.HOPLITE_R_BRACER_F, bracerK: RP.HOPLITE_R_BRACER_F_KIND as Kinds, fist: RP.HOPLITE_R_FIST_F, fistK: RP.HOPLITE_R_FIST_F_KIND as Kinds },
  },
  legs: {
    N: { thigh: RP.HOPLITE_R_THIGH_N, thighK: RP.HOPLITE_R_THIGH_N_KIND as Kinds, greave: RP.HOPLITE_R_GREAVE_N, greaveK: RP.HOPLITE_R_GREAVE_N_KIND as Kinds, shoe: RP.HOPLITE_R_SHOE_N, shoeK: RP.HOPLITE_R_SHOE_N_KIND as Kinds },
    F: { thigh: RP.HOPLITE_R_THIGH_F, thighK: RP.HOPLITE_R_THIGH_F_KIND as Kinds, greave: RP.HOPLITE_R_GREAVE_F, greaveK: RP.HOPLITE_R_GREAVE_F_KIND as Kinds, shoe: RP.HOPLITE_R_SHOE_F, shoeK: RP.HOPLITE_R_SHOE_F_KIND as Kinds },
  },
};

const REST = new Map<BodyType, Rig>();
/**
 * His figure at rest on this body (male idle frame 0 stood on his joints, hopliteRig): what his pieces bend
 * and turn from. (Worn without his cuirass his figure is not stood on his joints; his pieces still turn from
 * the way he drew them.)
 */
function restRig(body: BodyType): Rig {
  let r = REST.get(body);
  if (!r) REST.set(body, (r = hopliteRig(drawRig(body, 'idle', 0), { body, slots: { armor: { id: 'armor_hoplite', colors: [] } } } as never)));
  return r;
}

/** The torso's angle (pelvis to neck), what his torso pieces lean with. */
const torsoAngle = (g: DrawCtx) => segAngle(g.rig.pelvis, g.rig.neck);

/** Takes the pixels of these parts of ours out of these layers (his pieces are that part there). */
function partsOff(g: DrawCtx, depths: Depth[], parts: PartId[]): void {
  const ids = new Set(parts.map((p) => partIndex(p)));
  for (const d of depths) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && ids.has(L.part[i])) L.mat[i] = -1;
  }
}

/** Takes our torso away below the neck (his cuirass is the torso there). */
function torsoOff(g: DrawCtx): void {
  const r = g.rig;
  const torso = partIndex('torso');
  const neck = (r.neck.x - r.pelvis.x) * r.up.x + (r.neck.y - r.pelvis.y) * r.up.y;
  for (const d of ['torso.body', 'torso.under', 'torso.bottom', 'torso.top'] as Depth[]) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || L.part[i] !== torso) continue;
      const x = ((i % GRID) + 0.5) / RES - r.pelvis.x;
      const y = (Math.floor(i / GRID) + 0.5) / RES - r.pelvis.y;
      if (x * r.up.x + y * r.up.y <= neck) L.mat[i] = -1;
    }
  }
}

// ---------------------------------------------------------------------------------------------------
// His cuirass
// ---------------------------------------------------------------------------------------------------

function drawCuirass(g: DrawCtx, bronze: string, steel: string): void {
  torsoOff(g);
  const r = g.rig;
  const slots = { warm: [HOPLITE_ARMOR_BRONZE, bronze] as [string, string], grey: [HOPLITE_ARMOR_STEEL, steel] as [string, string] };
  stampLeaning(g, 'torso.armor', HOPLITE_CHEST, r.neck, torsoAngle(g), 'torso', hopliteTint(g, HOPLITE_CHEST_KIND, slots), lineOf(HOPLITE_CHEST_KIND));
  // the clasp on his near shoulder, pinning the scarf: in front of it
  stampLeaning(g, 'capeFront', HOPLITE_CLASP, r.neck, torsoAngle(g), 'torso', hopliteTint(g, HOPLITE_CLASP_KIND, slots), lineOf(HOPLITE_CLASP_KIND));
}

// ---------------------------------------------------------------------------------------------------
// His pauldrons
// ---------------------------------------------------------------------------------------------------

/**
 * A pauldron's angle: it rides the torso and follows the upper arm part of the way (as his Roman's shoulder
 * guards do), so it never smears across the chest; at rest the way he drew it.
 */
function pauldronAngle(g: DrawCtx, piece: PaintedPiece, s: Side): number {
  const r = g.rig;
  const idle = restRig(r.body);
  const j = armJoints(r, s);
  const t = torsoAngle(g) - segAngle(idle.pelvis, idle.neck);
  const arm = segAngle(j.shoulder, j.elbow) - piece.angle - t;
  return piece.angle + t + 0.6 * (((arm + 540) % 360) - 180);
}

function drawPauldrons(g: DrawCtx, slots: Record<string, [string, string]>, pieces: [Side, PaintedPiece, Record<string, string>][]): void {
  for (const [s, p, k] of pieces) {
    const j = armJoints(g.rig, s);
    stampPiece(g, armDepth(s, 'armor'), p, j.shoulder, pauldronAngle(g, p, s), prt('upperArm', s), hopliteTint(g, k, slots), lineOf(k));
  }
}

// ---------------------------------------------------------------------------------------------------
// His cape and scarf
// ---------------------------------------------------------------------------------------------------

function drawCape(g: DrawCtx, cloth: string): void {
  const r = g.rig;
  const slots = { purple: [RP.HOPLITE_R_CAPE_CLOTH, cloth] as [string, string] };
  stampLeaning(g, 'capeBack', ART.cape, r.neck, torsoAngle(g), 'torso', hopliteTint(g, ART.capeK, slots), lineOf(ART.capeK));
  stampLeaning(g, 'capeFront', ART.scarf, r.neck, torsoAngle(g), 'torso', hopliteTint(g, ART.scarfK, slots), lineOf(ART.scarfK));
}

// ---------------------------------------------------------------------------------------------------
// His skirt
// ---------------------------------------------------------------------------------------------------

function drawSkirt(g: DrawCtx, navy: string, leather: string): void {
  const r = g.rig;
  const slots = { navy: [RP.HOPLITE_R_SKIRT_NAVY, navy] as [string, string], warm: [RP.HOPLITE_R_SKIRT_LEATHER, leather] as [string, string] };
  stampLeaning(g, 'skirt', ART.skirt, r.pelvis, torsoAngle(g), 'pelvis', hopliteTint(g, ART.skirtK, slots), lineOf(ART.skirtK));
}

// ---------------------------------------------------------------------------------------------------
// His arms: bare upper arms, bracers, fists
// ---------------------------------------------------------------------------------------------------

/** How near a joint (fine pixels) his cells turn with it when it bends (stampBent): about half his arm's width. */
const JOINT_R = 4;

/** How far an arm bends past the way he drew it (degrees): at the shoulder (the torso's turn taken off) and at the elbow. */
function armBends(g: DrawCtx, s: Side): { shoulder: number; elbow: number } {
  const r = g.rig;
  const P = ART.arms[s];
  const j = armJoints(r, s);
  const idle = restRig(r.body);
  const t = torsoAngle(g) - segAngle(idle.pelvis, idle.neck);
  const upper = segAngle(j.shoulder, j.elbow);
  const fore = segAngle(j.elbow, j.wrist);
  const w = (a: number) => ((a + 540) % 360) - 180;
  return { shoulder: w(P.arm.angle + t - upper), elbow: w(fore - upper - (P.bracer.angle - P.arm.angle)) };
}

function drawArm(g: DrawCtx, s: Side, bronze: string): void {
  const r = g.rig;
  const P = ART.arms[s];
  const j = armJoints(r, s);
  const slots = { warm: [RP.HOPLITE_R_ARMS_BRONZE, bronze] as [string, string] };
  const kind = handPose(g, s).kind;
  // his fist on every closed hand; a pointing hand or one cradling a book stays ours
  const fist = kind !== 'point' && kind !== 'cradle';
  // (his own sleeves, drawn before his arms, stay on the upper arm)
  partsOff(g, [armDepth(s, 'body'), armDepth(s, 'cloth')], [...(g.has('top', 'top_hoplite_sleeves') ? [] : [prt('upperArm', s)]), prt('forearm', s), ...(fist ? [prt('hand', s)] : [])]);
  partsOff(g, [armDepth(s, 'body')], [prt('upperArm', s)]);
  const upper = segAngle(j.shoulder, j.elbow);
  const fore = segAngle(j.elbow, j.wrist);
  const bend = armBends(g, s);
  const still = hopliteArmStill(r, s) === 1;
  // his far fist hangs in front of the skirt's edge as he drew it; reaching, behind the body with the arm
  const fistDepth: Depth = s === 'N' ? 'nearArm.over' : still ? 'farHand.front' : 'farArm.armor';
  stampPiece(g, s === 'N' ? 'nearArm.over' : 'farArm.armor', P.bracer, j.elbow, fore, prt('forearm', s), hopliteTint(g, P.bracerK, slots), lineOf(P.bracerK));
  if (fist) stampPiece(g, fistDepth, P.fist, j.wrist, segAngle(j.wrist, j.hand), prt('hand', s), hopliteTint(g, P.fistK, slots), lineOf(P.fistK));
  const joints: PieceJoint[] = [
    { about: j.elbow, r: JOINT_R, bend: bend.elbow, carry: true },
    { about: j.shoulder, r: JOINT_R, bend: bend.shoulder },
  ];
  stampBent(g, armDepth(s, 'body'), P.arm, j.shoulder, upper, prt('upperArm', s), joints, lineOf(P.armK), hopliteTint(g, P.armK, slots));
}

// ---------------------------------------------------------------------------------------------------
// His legs: bare thighs, greaves, shoes
// ---------------------------------------------------------------------------------------------------


function legBends(g: DrawCtx, s: Side): { hip: number; knee: number } {
  const P = ART.legs[s];
  const j = legJoints(g.rig, s);
  const thigh = segAngle(j.hip, j.knee);
  const shin = segAngle(j.knee, j.ankle);
  const w = (a: number) => ((a + 540) % 360) - 180;
  return { hip: w(P.thigh.angle - thigh), knee: w(shin - thigh - (P.greave.angle - P.thigh.angle)) };
}

function drawLegs(g: DrawCtx, bronze: string, shoe: string): void {
  for (const s of ['F', 'N'] as Side[]) {
    const P = ART.legs[s];
    const j = legJoints(g.rig, s);
    partsOff(g, [legDepth(s, 'body'), legDepth(s, 'cloth'), legDepth(s, 'feet')], [prt('thigh', s), prt('shin', s), prt('foot', s)]);
    const thigh = segAngle(j.hip, j.knee);
    const shin = segAngle(j.knee, j.ankle);
    const bend = legBends(g, s);
    const skin = hopliteTint(g, P.thighK, {});
    stampBent(g, legDepth(s, 'body'), P.thigh, j.hip, thigh, prt('thigh', s), [
      { about: j.knee, r: 5, bend: bend.knee, carry: true },
      { about: j.hip, r: 5, bend: bend.hip },
    ], lineOf(P.thighK), skin);
    stampPiece(g, legDepth(s, 'feet'), P.shoe, j.ankle, shin, prt('foot', s), hopliteTint(g, P.shoeK, { warm: [RP.HOPLITE_R_GREAVES_SHOE, shoe] }), lineOf(P.shoeK));
    stampPiece(g, legDepth(s, 'armor'), P.greave, j.knee, shin, prt('shin', s), hopliteTint(g, P.greaveK, { warm: [RP.HOPLITE_R_GREAVES_BRONZE, bronze] }), lineOf(P.greaveK));
  }
}

// ---------------------------------------------------------------------------------------------------
// His hair and diadem (stamped on the face anchor, as his Roman hair is)
// ---------------------------------------------------------------------------------------------------

function stampOnFace(g: DrawCtx, depth: Depth, p: PaintedPiece, tint: (ch: string, hex: string) => string): void {
  const { nx, ny } = faceAnchor(g);
  const L = g.L(depth);
  L.noFray = true;
  stampPiece(g, depth, p, v((nx + 0.5) / RES, (ny + 0.5) / RES), p.angle, 'head', tint);
}

export const HOPLITE_ITEMS: ItemDef[] = [
  {
    id: 'hair_hoplite',
    slot: 'hair',
    name: "Bronze Warrior's Mane",
    desc: 'Long wild black hair with a braid tied in bronze bands behind, painted by the owner for his bronze warrior.',
    colors: [col('main', 'Hair', RP.HOPLITE_R_HAIR_BASE), col('band', 'Bands', RP.HOPLITE_R_HAIR_BAND, 'metal')],
    bodies: [...MEN],
    draw: (g, [c, band]) => {
      const hair = [RP.HOPLITE_R_HAIR_BASE, c] as [string, string];
      const slots = { hair, navy: hair, grey: hair, purple: hair, warm: [RP.HOPLITE_R_HAIR_BAND, band] as [string, string] };
          stampOnFace(g, 'hairBack', ART.braid, hopliteTint(g, ART.braidK, slots));
      stampOnFace(g, 'hairFront', ART.hair, hopliteTint(g, ART.hairK, slots));
    },
  },
  {
    id: 'acc_hoplite_diadem',
    slot: 'accessory',
    name: "Bronze Warrior's Diadem",
    desc: 'A bronze diadem across the forehead with a small emblem, painted by the owner for his bronze warrior.',
    colors: [col('bronze', 'Bronze', RP.HOPLITE_R_DIADEM_BRONZE, 'metal')],
    bodies: [...MEN],
    draw: (g, [c]) => {
          stampOnFace(g, 'head.gear', ART.diadem, hopliteTint(g, ART.diademK, { warm: [RP.HOPLITE_R_DIADEM_BRONZE, c] }));
    },
  },
  {
    id: 'armor_hoplite',
    slot: 'armor',
    name: "Bronze Warrior's Cuirass",
    desc: 'A bronze cuirass with spiral motifs, a lion-face belly plate, a leather strap across the chest and a round clasp at the shoulder, painted by the owner (+4 AC).',
    colors: [col('bronze', 'Bronze', HOPLITE_ARMOR_BRONZE, 'metal'), col('steel', 'Steel band', HOPLITE_ARMOR_STEEL, 'metal')],
    statsArmor: 'Greek Hoplite Cuirass',
    bodies: [...MEN],
    draw: (g, [b, s]) => drawCuirass(g, b, s),
  },
  {
    id: 'acc_hoplite_pauldrons',
    slot: 'accessory',
    name: "Bronze Warrior's Pauldrons",
    desc: 'Big spiral-engraved bronze pauldrons over hanging leather strips, painted by the owner for his bronze warrior.',
    colors: [col('bronze', 'Bronze', HOPLITE_PAULDRON_BRONZE, 'metal')],
    bodies: [...MEN],
    draw: (g, [c]) =>
      drawPauldrons(g, { warm: [HOPLITE_PAULDRON_BRONZE, c] }, [
        ['F', HOPLITE_PAULDRON_F, HOPLITE_PAULDRON_F_KIND],
        ['N', HOPLITE_PAULDRON_N, HOPLITE_PAULDRON_N_KIND],
      ]),
  },
  // His second set (docs/reference/bronze-warrior-leather-chest-owner-reference.jpg, the owner: "si solo agrega
  // ese conjunto (el pecho y hombreras y mangas)"): each its own option, so they also go with the bronze set.
  {
    id: 'armor_hoplite_leather',
    slot: 'armor',
    name: "Bronze Warrior's Leather Chest",
    desc: 'A dark quilted leather cuirass laced up the front with bronze bars, spiral bronze edge panels, a belt with a square buckle and a high navy collar with gold trim, painted by the owner (+3 AC).',
    colors: [col('leather', 'Leather', RP.HOPLITE_R_LEATHER_MAIN, 'leather'), col('collar', 'Collar', RP.HOPLITE_R_LEATHER_COLLAR)],
    statsArmor: 'Mist Storm Vest',
    bodies: [...MEN],
    draw: (g, [l, c]) => {
      torsoOff(g);
      const r = g.rig;
      const slots = { warm: [RP.HOPLITE_R_LEATHER_MAIN, l] as [string, string], navy: [RP.HOPLITE_R_LEATHER_COLLAR, c] as [string, string] };
      stampLeaning(g, 'torso.armor', RP.HOPLITE_R_LCHEST, r.neck, torsoAngle(g), 'torso', hopliteTint(g, RP.HOPLITE_R_LCHEST_KIND, slots), lineOf(RP.HOPLITE_R_LCHEST_KIND));
      stampLeaning(g, 'capeFront', RP.HOPLITE_R_LCOLLAR, r.neck, torsoAngle(g), 'torso', hopliteTint(g, RP.HOPLITE_R_LCOLLAR_KIND, { navy: slots.navy }), lineOf(RP.HOPLITE_R_LCOLLAR_KIND));
    },
  },
  {
    id: 'acc_hoplite_iron_pauldrons',
    slot: 'accessory',
    name: "Bronze Warrior's Iron Pauldrons",
    desc: 'Dark iron pauldrons of layered plates edged in gold, painted by the owner for his bronze warrior.',
    colors: [col('iron', 'Iron', RP.HOPLITE_R_LEATHER_IRON, 'metal'), col('trim', 'Trim', RP.HOPLITE_R_LEATHER_GOLD, 'metal')],
    bodies: [...MEN],
    draw: (g, [i, t]) =>
      drawPauldrons(g, { grey: [RP.HOPLITE_R_LEATHER_IRON, i], warm: [RP.HOPLITE_R_LEATHER_GOLD, t] }, [
        ['F', RP.HOPLITE_R_LPAULDRON_F, RP.HOPLITE_R_LPAULDRON_F_KIND],
        ['N', RP.HOPLITE_R_LPAULDRON_N, RP.HOPLITE_R_LPAULDRON_N_KIND],
      ]),
  },
  {
    id: 'top_hoplite_sleeves',
    slot: 'top',
    name: "Bronze Warrior's Sleeves",
    desc: 'Short navy sleeves with gold cuffs on the upper arms, painted by the owner for his bronze warrior.',
    colors: [col('cloth', 'Cloth', RP.HOPLITE_R_LEATHER_COLLAR), col('cuff', 'Cuffs', RP.HOPLITE_R_LEATHER_GOLD, 'metal')],
    bodies: [...MEN],
    draw: (g, [c, cuff]) => {
      const slots = { navy: [RP.HOPLITE_R_LEATHER_COLLAR, c] as [string, string], warm: [RP.HOPLITE_R_LEATHER_GOLD, cuff] as [string, string] };
      for (const [s, p, k] of [
        ['F', RP.HOPLITE_R_SLEEVE_F, RP.HOPLITE_R_SLEEVE_F_KIND],
        ['N', RP.HOPLITE_R_SLEEVE_N, RP.HOPLITE_R_SLEEVE_N_KIND],
      ] as [Side, PaintedPiece, Record<string, string>][]) {
        const j = armJoints(g.rig, s);
        const bend = armBends(g, s);
        stampBent(g, armDepth(s, 'cloth'), p, j.shoulder, segAngle(j.shoulder, j.elbow), prt('upperArm', s), [{ about: j.shoulder, r: JOINT_R, bend: bend.shoulder }], lineOf(k), hopliteTint(g, k, slots));
      }
    },
  },
  {
    id: 'cape_hoplite',
    slot: 'cape',
    name: "Bronze Warrior's Cape",
    desc: 'A deep purple cape with a scarf of the same cloth wrapped round the neck, painted by the owner for his bronze warrior.',
    colors: [col('cloth', 'Cloth', RP.HOPLITE_R_CAPE_CLOTH)],
    bodies: [...MEN],
    draw: (g, [c]) => drawCape(g, c),
  },
  {
    id: 'skirt_hoplite',
    slot: 'skirt',
    name: "Bronze Warrior's Pteruges",
    desc: 'A navy skirt under bronze-studded leather straps with gold tassels and a gold meander border, painted by the owner for his bronze warrior.',
    colors: [col('navy', 'Cloth', RP.HOPLITE_R_SKIRT_NAVY), col('leather', 'Straps', RP.HOPLITE_R_SKIRT_LEATHER, 'leather')],
    bodies: [...MEN],
    draw: (g, [n, l]) => drawSkirt(g, n, l),
  },
  {
    id: 'hands_hoplite_bracers',
    slot: 'hands',
    name: "Bronze Warrior's Bracers",
    desc: 'Spiral bronze bracers with fingerless wraps on bare arms, painted by the owner for his bronze warrior.',
    colors: [col('bronze', 'Bronze', RP.HOPLITE_R_ARMS_BRONZE, 'metal')],
    bodies: [...MEN],
    draw: (g, [b]) => {
      drawArm(g, 'F', b);
      drawArm(g, 'N', b);
    },
  },
  {
    id: 'feet_hoplite_greaves',
    slot: 'feet',
    name: "Bronze Warrior's Greaves",
    desc: 'Engraved bronze greaves over brown shoes, on bare thighs, painted by the owner for his bronze warrior.',
    colors: [col('bronze', 'Bronze', RP.HOPLITE_R_GREAVES_BRONZE, 'metal'), col('shoe', 'Shoes', RP.HOPLITE_R_GREAVES_SHOE, 'leather')],
    bodies: [...MEN],
    draw: (g, [b, s]) => drawLegs(g, b, s),
  },
];
