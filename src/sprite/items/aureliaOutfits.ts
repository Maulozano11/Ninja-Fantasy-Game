// Aurelia's two new outfits from the owner's sheet (docs/reference/aurelia-outfits-owner-reference.jpg, 2026-10-24:
// "agrega estas tambien pero ignora la primera porque esa ya la tenemos"): the dark sorceress and the adventurer
// alchemist. His bodies are drawn bigger than ours: each was brought down to our scale and cleaned with his palette
// only ("Reducir y limpiar yo"; tools/refs/aurelia_outfits_ref.py), then cut into the pieces these items stamp on our
// fitted female (tools/refs/aurelia-{sorceress,alchemist}-*-from-ref.py -> items/sorceress*Art.ts, alchemist*Art.ts).
// At rest every pixel is the cleaned reduction's; in a pose each piece rides the rig as her Dawn outfit's do (the
// same code: aureliaVestment.ts drawVestment, aureliaLower.ts drawPiece, aureliaBoots.ts drawBoots). Each part is
// its own creator option, women only (the fitted female body). The names are placeholders for the owner to rename.

import { retintHex } from '../color';
import { armDepth, armJoints, type Depth, type DrawCtx, type ItemDef, legDepth, legJoints, type Side } from '../ctx';
import { type PaintedPiece, segAngle, stampPiece } from '../painted';
import { GRID, partIndex, type PartId } from '../raster';
import { skinTone } from '../body';
import { type BootArt, closesLegs, drawBoots, fillHoles, legsKeptAsDrawn, sealLegsAfter } from './aureliaBoots';
import { bareThighs, drawPiece, liningOffTheGround, type SkirtPiece, trimPanelSpurs } from './aureliaLower';
import { drawVestment, type VestmentArt } from './aureliaVestment';
import * as AB from './alchemistBeltArt';
import * as ABL from './alchemistBlouseArt';
import * as ABR from './alchemistBracersArt';
import * as AC from './alchemistCorsetArt';
import * as AG from './alchemistGreavesArt';
import * as AP from './alchemistPauldronArt';
import * as AT from './alchemistTabardArt';
import * as NB from './sorceressBootsArt';
import * as NC from './sorceressCorsetArt';
import * as NG from './sorceressGlovesArt';
import * as NS from './sorceressSashArt';
import * as NK from './sorceressSkirtArt';
import * as NL from './sorceressSleevesArt';

type Kind = 'cloth' | 'leather' | 'metal' | 'glow';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });

/**
 * His colours recoloured by slot: a letter of a slot's colours (`chars[slot]`) moves from the slot's base
 * (`bases[slot]`) to the colour picked, each shade as far from it as his was; his line and his skin stay.
 */
const slotTint =
  (chars: Record<string, string>, bases: Record<string, string>, picked: Record<string, string>) =>
  (ch: string, hex: string): string => {
    for (const [slot, cs] of Object.entries(chars)) if (cs.includes(ch) && bases[slot] && picked[slot]) return retintHex(hex, bases[slot], picked[slot]);
    return hex;
  };
/** The same by a skirt piece's roles (a letter's slot). */
const roleTint =
  (bases: Record<string, string>, picked: Record<string, string>) =>
  (role: string, hex: string): string =>
    bases[role] && picked[role] ? retintHex(hex, bases[role], picked[role]) : hex;
/** The slots of an item, in order, by key. */
const slots = (keys: string[], picked: string[]): Record<string, string> => Object.fromEntries(keys.map((k, i) => [k, picked[i]]));

// ---------------------------------------------------------------------------------------------------
// Bodices and sleeves (aureliaVestment.ts drawVestment)
// ---------------------------------------------------------------------------------------------------

const NIGHT_CORSET_ART: VestmentArt = {
  bodice: NC.NIGHT_CORSET_BODICE,
  waist: NC.NIGHT_CORSET_WAIST,
  torsoSpan: NC.NIGHT_CORSET_TORSO_SPAN,
  line: NC.NIGHT_CORSET_LINE,
  skinShades: NC.NIGHT_CORSET_SKIN,
};
const ALCH_CORSET_ART: VestmentArt = {
  bodice: AC.ALCH_CORSET_BODICE,
  waist: AC.ALCH_CORSET_WAIST,
  torsoSpan: AC.ALCH_CORSET_TORSO_SPAN,
  line: AC.ALCH_CORSET_LINE,
  skinShades: AC.ALCH_CORSET_SKIN,
};
const NIGHT_SLEEVES_ART: VestmentArt = {
  sleeves: { N: [NL.NIGHT_SLEEVES_UPPER_N, NL.NIGHT_SLEEVES_FORE_N, NL.NIGHT_SLEEVES_SPAN_N], F: [NL.NIGHT_SLEEVES_UPPER_F, NL.NIGHT_SLEEVES_FORE_F, NL.NIGHT_SLEEVES_SPAN_F] },
  line: NL.NIGHT_SLEEVES_LINE,
  skinShades: {},
};
const ALCH_BLOUSE_ART: VestmentArt = {
  sleeves: { N: [ABL.ALCH_BLOUSE_UPPER_N, ABL.ALCH_BLOUSE_FORE_N, ABL.ALCH_BLOUSE_SPAN_N], F: [ABL.ALCH_BLOUSE_UPPER_F, ABL.ALCH_BLOUSE_FORE_F, ABL.ALCH_BLOUSE_SPAN_F] },
  line: ABL.ALCH_BLOUSE_LINE,
  skinShades: {},
};

export const ARMOR_NIGHTSHADE_CORSET: ItemDef = {
  id: 'armor_nightshade_corset',
  slot: 'armor',
  name: 'Nightshade Corset',
  desc: "A sorceress's black laced corset over a plum bust, a high black collar, gold thorns along the neckline and a violet gem at the throat (+1 AC). Women only.",
  colors: [col('cloth', 'Bust', NC.NIGHT_CORSET_BASE.cloth), col('leather', 'Corset', NC.NIGHT_CORSET_BASE.leather, 'leather'), col('gold', 'Thorns', NC.NIGHT_CORSET_BASE.gold, 'metal'), col('gem', 'Gem', NC.NIGHT_CORSET_BASE.gem ?? '#7a3fb0')],
  statsArmor: 'Ronin Wanderer Cloak',
  bodies: ['female'],
  draw: (g, picked) => drawVestment(g, NIGHT_CORSET_ART, slotTint(NC.NIGHT_CORSET_CHARS, NC.NIGHT_CORSET_BASE, slots(['cloth', 'leather', 'gold', 'gem'], picked)), { bodice: true, sleeves: false }),
};

export const ARMOR_ALCHEMIST_CORSET: ItemDef = {
  id: 'armor_alchemist_corset',
  slot: 'armor',
  name: "Alchemist's Corset",
  desc: "A studded brown leather corset with buckles, over a cream blouse and the top of a green tabard (+1 AC). Women only.",
  colors: [col('leather', 'Leather', AC.ALCH_CORSET_BASE.leather, 'leather'), col('cloth', 'Blouse', AC.ALCH_CORSET_BASE.cloth), col('gem', 'Tabard', AC.ALCH_CORSET_BASE.gem), col('gold', 'Studs', AC.ALCH_CORSET_BASE.gold, 'metal')],
  statsArmor: 'Ronin Wanderer Cloak',
  bodies: ['female'],
  draw: (g, picked) => drawVestment(g, ALCH_CORSET_ART, slotTint(AC.ALCH_CORSET_CHARS, AC.ALCH_CORSET_BASE, slots(['leather', 'cloth', 'gem', 'gold'], picked)), { bodice: true, sleeves: false }),
};

export const TOP_NIGHTSHADE_SLEEVES: ItemDef = {
  id: 'top_nightshade_sleeves',
  slot: 'top',
  name: 'Nightshade Sleeves',
  desc: 'Black dress shoulders opening into wide, split purple bell sleeves, a gold thorn on the near shoulder. Women only.',
  colors: [col('cloth', 'Sleeves', NL.NIGHT_SLEEVES_BASE.cloth), col('trim', 'Shoulders', NL.NIGHT_SLEEVES_BASE.trim), col('gold', 'Thorn', NL.NIGHT_SLEEVES_BASE.gold ?? '#926e4c', 'metal')],
  bodies: ['female'],
  draw: (g, picked) => drawVestment(g, NIGHT_SLEEVES_ART, slotTint(NL.NIGHT_SLEEVES_CHARS, NL.NIGHT_SLEEVES_BASE, slots(['cloth', 'trim', 'gold'], picked)), { bodice: false, sleeves: true }),
};

export const TOP_ALCHEMIST_BLOUSE: ItemDef = {
  id: 'top_alchemist_blouse',
  slot: 'top',
  name: "Alchemist's Blouse",
  desc: 'The full cream sleeves of a blouse, down to the wrists. Women only.',
  colors: [col('cloth', 'Blouse', ABL.ALCH_BLOUSE_BASE.cloth), col('trim', 'Shade', ABL.ALCH_BLOUSE_BASE.trim ?? '#62423f')],
  bodies: ['female'],
  draw: (g, picked) => drawVestment(g, ALCH_BLOUSE_ART, slotTint(ABL.ALCH_BLOUSE_CHARS, ABL.ALCH_BLOUSE_BASE, slots(['cloth', 'trim'], picked)), { bodice: false, sleeves: true }),
};

// ---------------------------------------------------------------------------------------------------
// Gloves and bracers: his cuffs on the forearms; his gloved fists at rest, our hands in his glove's tones otherwise
// ---------------------------------------------------------------------------------------------------

interface HandArt {
  cuff: Record<Side, PaintedPiece>;
  fist: Record<Side, PaintedPiece>;
  tones: [string, string, string, string];
  line: string;
}

/**
 * Draws his gloves: each cuff turns with its forearm about the elbow (in front of the sleeve); once the whole figure
 * is drawn, every pixel of our hands takes his glove's tone of its shade (her bare hand's line, shadows and light),
 * and at rest his own gloved fists stand where he drew them (the far one round her staff).
 */
function drawHands(g: DrawCtx, art: HandArt, tint: (ch: string, hex: string) => string): void {
  const r = g.rig;
  const rest = r.pose === 'idle';
  const lineHex = (hex: string) => hex === art.line;
  for (const s of ['F', 'N'] as Side[]) {
    const { elbow, wrist } = armJoints(r, s);
    const d: Depth = s === 'N' ? 'nearArm.over' : rest || r.farHandFront ? 'farHand.front' : 'farLeg.armor';
    stampPiece(g, d, art.cuff[s], elbow, segAngle(elbow, wrist), `forearm${s}`, tint, lineHex, true);
  }
  const tones = art.tones.map((h) => g.m(tint('', h), 'flat'));
  const hands = new Set([partIndex('handN'), partIndex('handF')]);
  g.after((layers) => {
    for (const L of layers.values()) {
      if (!L.used) continue;
      for (let i = 0; i < GRID * GRID; i++) {
        if (L.mat[i] !== g.skin || !hands.has(L.part[i])) continue;
        L.mat[i] = tones[Math.max(0, Math.min(3, L.shade[i]))];
        L.shade[i] = 3;
      }
    }
    if (!rest) return;
    for (const s of ['N', 'F'] as Side[]) {
      const { wrist, hand } = armJoints(r, s);
      stampPiece(g, s === 'N' ? 'nearArm.over' : 'farHand.front', art.fist[s], hand, segAngle(wrist, hand), `hand${s}` as PartId, tint);
    }
  });
}

const NIGHT_GLOVES_ART: HandArt = {
  cuff: { N: NG.NIGHT_GLOVES_CUFF_N, F: NG.NIGHT_GLOVES_CUFF_F },
  fist: { N: NG.NIGHT_GLOVES_FIST_N, F: NG.NIGHT_GLOVES_FIST_F },
  tones: NG.NIGHT_GLOVES_TONES,
  line: NG.NIGHT_GLOVES_LINE,
};
const ALCH_BRACERS_ART: HandArt = {
  cuff: { N: ABR.ALCH_BRACERS_CUFF_N, F: ABR.ALCH_BRACERS_CUFF_F },
  fist: { N: ABR.ALCH_BRACERS_FIST_N, F: ABR.ALCH_BRACERS_FIST_F },
  tones: ABR.ALCH_BRACERS_TONES,
  line: ABR.ALCH_BRACERS_LINE,
};

export const HANDS_NIGHTSHADE_GLOVES: ItemDef = {
  id: 'hands_nightshade_gloves',
  slot: 'hands',
  name: 'Nightshade Gloves',
  desc: 'Black gloves up the forearm, their cuffs strapped with steel buckles. Women only.',
  colors: [col('glove', 'Gloves', NG.NIGHT_GLOVES_BASE.glove, 'leather'), col('metal', 'Buckles', NG.NIGHT_GLOVES_BASE.metal ?? '#9a9aa4', 'metal')],
  bodies: ['female'],
  draw: (g, picked) => drawHands(g, NIGHT_GLOVES_ART, slotTint(NG.NIGHT_GLOVES_CHARS, NG.NIGHT_GLOVES_BASE, slots(['glove', 'metal'], picked))),
};

export const HANDS_ALCHEMIST_BRACERS: ItemDef = {
  id: 'hands_alchemist_bracers',
  slot: 'hands',
  name: "Alchemist's Bracers",
  desc: 'Leather bracers plated in steel and set with green and blue gems, over leather gloves. Women only.',
  colors: [col('leather', 'Leather', ABR.ALCH_BRACERS_BASE.leather, 'leather'), col('metal', 'Steel', ABR.ALCH_BRACERS_BASE.metal, 'metal'), col('gem', 'Gems', ABR.ALCH_BRACERS_BASE.gem ?? '#3fb07a', 'glow')],
  bodies: ['female'],
  draw: (g, picked) => drawHands(g, ALCH_BRACERS_ART, slotTint(ABR.ALCH_BRACERS_CHARS, ABR.ALCH_BRACERS_BASE, slots(['leather', 'metal', 'gem'], picked))),
};

// ---------------------------------------------------------------------------------------------------
// The pauldron (an accessory: it rides the near upper arm)
// ---------------------------------------------------------------------------------------------------

export const ACC_ALCHEMIST_PAULDRON: ItemDef = {
  id: 'acc_alchemist_pauldron',
  slot: 'accessory',
  name: "Alchemist's Pauldron",
  desc: 'An engraved leather pauldron on the near shoulder, a steel band below it. Women only.',
  colors: [col('leather', 'Leather', AP.ALCH_PAULDRON_BASE.leather, 'leather'), col('metal', 'Steel', AP.ALCH_PAULDRON_BASE.metal, 'metal')],
  bodies: ['female'],
  draw: (g, picked) => {
    const { shoulder, elbow } = armJoints(g.rig, 'N');
    const tint = slotTint(AP.ALCH_PAULDRON_CHARS, AP.ALCH_PAULDRON_BASE, slots(['leather', 'metal'], picked));
    stampPiece(g, armDepth('N', 'armor'), AP.ALCH_PAULDRON_PIECE, shoulder, segAngle(shoulder, elbow), 'upperArmN', tint, (hex) => hex === AP.ALCH_PAULDRON_LINE, true);
  },
};

// ---------------------------------------------------------------------------------------------------
// Sashes and belts, skirts (aureliaLower.ts drawPiece)
// ---------------------------------------------------------------------------------------------------

function drawWaist(g: DrawCtx, band: SkirtPiece, hang: SkirtPiece | undefined, tint: (role: string, hex: string) => string): void {
  drawPiece(g, 'waist', 'pelvis', band, tint);
  if (hang) drawPiece(g, 'waist', 'pelvis', hang, tint);
  sealLegsAfter(g, 'waist');
}

export const WAIST_NIGHTSHADE_SASH: ItemDef = {
  id: 'waist_nightshade_sash',
  slot: 'waist',
  name: 'Nightshade Sash',
  desc: 'A crimson sash wound round the waist and tied at the far hip, its ends hanging. Women only.',
  colors: [col('sash', 'Sash', NS.NIGHT_SASH_BASE.sash)],
  bodies: ['female'],
  draw: (g, picked) => drawWaist(g, NS.NIGHT_SASH_BAND, NS.NIGHT_SASH_HANG, roleTint(NS.NIGHT_SASH_BASE, slots(['sash'], picked))),
};

export const WAIST_ALCHEMIST_BELT: ItemDef = {
  id: 'waist_alchemist_belt',
  slot: 'waist',
  name: "Alchemist's Belt",
  desc: 'A leather belt with a steel buckle, potion vials along it and a satchel on the near hip. Women only.',
  colors: [col('leather', 'Leather', AB.ALCH_BELT_BASE.leather, 'leather'), col('metal', 'Buckle', AB.ALCH_BELT_BASE.metal, 'metal'), col('glass', 'Potions', AB.ALCH_BELT_BASE.glass ?? '#3fb0a0', 'glow')],
  bodies: ['female'],
  draw: (g, picked) => drawWaist(g, AB.ALCH_BELT_BAND, AB.ALCH_BELT_HANG, roleTint(AB.ALCH_BELT_BASE, slots(['leather', 'metal', 'glass'], picked))),
};

interface SkirtArt {
  front: SkirtPiece;
  near: SkirtPiece;
  far: SkirtPiece;
  lining: SkirtPiece;
  line: string;
  slits?: { N: PaintedPiece; F: PaintedPiece; skin: string };
}

/**
 * Draws one of his skirts as her Dawn skirt is drawn (aureliaLower.ts SKIRT_DAWN_PANELS): the lining and the far
 * panel behind the legs, the near panel behind the near leg, each side panel's top over its thigh, the front panel
 * over all; his bare thighs in the slits; moved, the holes between the panels and the legs filled, a lining strip
 * left standing like a leg cut back, a panel's spur trimmed, and her legs' outline closed.
 */
function drawSkirt(g: DrawCtx, art: SkirtArt, tint: (role: string, hex: string) => string): void {
  bareThighs(g);
  if (art.slits) {
    for (const s of ['F', 'N'] as Side[]) {
      const { hip, knee } = legJoints(g.rig, s);
      stampPiece(g, legDepth(s, 'body'), art.slits[s], knee, segAngle(hip, knee), `thigh${s}`, (_ch, hex) => skinTone(hex, g.look.skin, art.slits!.skin));
    }
  }
  drawPiece(g, 'backGear', 'pelvis', art.lining, tint);
  drawPiece(g, 'backGear', 'thighF', art.far, tint);
  drawPiece(g, 'skirt', 'thighF', art.far, tint, art.far.front);
  drawPiece(g, 'farLeg.armor', 'thighN', art.near, tint);
  drawPiece(g, 'skirt', 'thighN', art.near, tint, art.near.front);
  drawPiece(g, 'skirt', 'pelvis', art.front, tint);
  const below: Depth[] = ['backGear', 'farLeg.body', 'farLeg.cloth', 'farLeg.feet', 'farLeg.armor', 'nearLeg.body', 'nearLeg.cloth', 'nearLeg.feet', 'skirt'];
  if (g.rig.pose !== 'idle') {
    if (!legsKeptAsDrawn(g)) liningOffTheGround(g, art.line);
    fillHoles(g, below);
    trimPanelSpurs(g, below, art.line);
  }
  sealLegsAfter(g, 'skirt');
}

const NIGHT_SKIRT_ART: SkirtArt = {
  front: NK.NIGHT_SKIRT_FRONT,
  near: NK.NIGHT_SKIRT_NEAR,
  far: NK.NIGHT_SKIRT_FAR,
  lining: NK.NIGHT_SKIRT_LINING,
  line: NK.NIGHT_SKIRT_LINE,
  slits: { N: NK.NIGHT_SKIRT_SLIT_N, F: NK.NIGHT_SKIRT_SLIT_F, skin: NK.NIGHT_SKIRT_SLIT_SKIN },
};
const ALCH_TABARD_ART: SkirtArt = {
  front: AT.ALCH_TABARD_FRONT,
  near: AT.ALCH_TABARD_NEAR,
  far: AT.ALCH_TABARD_FAR,
  lining: AT.ALCH_TABARD_LINING,
  line: AT.ALCH_TABARD_LINE,
};

export const SKIRT_NIGHTSHADE_TATTERS: ItemDef = {
  id: 'skirt_nightshade_tatters',
  slot: 'skirt',
  name: 'Nightshade Skirt',
  desc: 'A long tattered purple skirt with dark patterns, split at the sides to show the legs, a gold thorn across it and a crimson under-skirt. Women only.',
  colors: [col('cloth', 'Skirt', NK.NIGHT_SKIRT_BASE.cloth), col('gold', 'Thorn', NK.NIGHT_SKIRT_BASE.gold ?? '#926e4c', 'metal'), col('lining', 'Under-skirt', NK.NIGHT_SKIRT_BASE.lining)],
  bodies: ['female'],
  draw: (g, picked) => drawSkirt(g, NIGHT_SKIRT_ART, roleTint(NK.NIGHT_SKIRT_BASE, { ...slots(['cloth', 'gold', 'lining'], picked), trim: picked[2] })),
};

export const SKIRT_ALCHEMIST_TABARD: ItemDef = {
  id: 'skirt_alchemist_tabard',
  slot: 'skirt',
  name: "Alchemist's Tabard",
  desc: 'A long green tabard skirt, open at the sides, edged in gold with an emblem on its front panel. Women only.',
  colors: [col('cloth', 'Tabard', AT.ALCH_TABARD_BASE.cloth), col('gold', 'Trim', AT.ALCH_TABARD_BASE.gold, 'metal')],
  bodies: ['female'],
  draw: (g, picked) => drawSkirt(g, ALCH_TABARD_ART, roleTint(AT.ALCH_TABARD_BASE, { ...slots(['cloth', 'gold'], picked), lining: picked[0] })),
};

// ---------------------------------------------------------------------------------------------------
// Boots (aureliaBoots.ts drawBoots): his shoes turn with the shin once the foot leaves the ground (ankle.ts)
// ---------------------------------------------------------------------------------------------------

const NIGHT_BOOTS_ART: BootArt = {
  N: { thigh: NB.NIGHT_BOOTS_THIGH_N, shin: NB.NIGHT_BOOTS_SHIN_N, foot: NB.NIGHT_BOOTS_FOOT_N, join: NB.NIGHT_BOOTS_JOIN_N, cut: NB.NIGHT_BOOTS_CUT_N },
  F: { thigh: NB.NIGHT_BOOTS_THIGH_F, shin: NB.NIGHT_BOOTS_SHIN_F, foot: NB.NIGHT_BOOTS_FOOT_F, join: NB.NIGHT_BOOTS_JOIN_F, cut: NB.NIGHT_BOOTS_CUT_F },
  line: NB.NIGHT_BOOTS_LINE,
  turnFoot: true,
};
const ALCH_GREAVES_ART: BootArt = {
  N: { thigh: AG.ALCH_GREAVES_THIGH_N, shin: AG.ALCH_GREAVES_SHIN_N, foot: AG.ALCH_GREAVES_FOOT_N, join: AG.ALCH_GREAVES_JOIN_N, cut: AG.ALCH_GREAVES_CUT_N },
  F: { thigh: AG.ALCH_GREAVES_THIGH_F, shin: AG.ALCH_GREAVES_SHIN_F, foot: AG.ALCH_GREAVES_FOOT_F, join: AG.ALCH_GREAVES_JOIN_F, cut: AG.ALCH_GREAVES_CUT_F },
  line: AG.ALCH_GREAVES_LINE,
  turnFoot: true,
};

export const FEET_NIGHTSHADE_BOOTS: ItemDef = {
  id: 'feet_nightshade_boots',
  slot: 'feet',
  name: 'Nightshade Boots',
  desc: 'Black thigh stockings and black heeled boots strapped with steel buckles. Women only.',
  colors: [col('leather', 'Boots', NB.NIGHT_BOOTS_BASE.leather, 'leather'), col('metal', 'Buckles', NB.NIGHT_BOOTS_BASE.metal ?? '#9a9aa4', 'metal')],
  bodies: ['female'],
  draw: (g, picked) => drawBoots(g, NIGHT_BOOTS_ART, slotTint(NB.NIGHT_BOOTS_CHARS, NB.NIGHT_BOOTS_BASE, slots(['leather', 'metal'], picked))),
};

export const FEET_ALCHEMIST_GREAVES: ItemDef = {
  id: 'feet_alchemist_greaves',
  slot: 'feet',
  name: "Alchemist's Greaves",
  desc: 'Tan leggings, steel knee cops and greaves over brown boots with steel toe caps. Women only.',
  colors: [col('leather', 'Boots', AG.ALCH_GREAVES_BASE.leather, 'leather'), col('cloth', 'Leggings', AG.ALCH_GREAVES_BASE.cloth), col('metal', 'Steel', AG.ALCH_GREAVES_BASE.metal, 'metal')],
  bodies: ['female'],
  draw: (g, picked) => drawBoots(g, ALCH_GREAVES_ART, slotTint(AG.ALCH_GREAVES_CHARS, AG.ALCH_GREAVES_BASE, slots(['leather', 'cloth', 'metal'], picked))),
};

// her legs' outline is closed by the last of these drawn, as with her Dawn skirt, sash and boots
closesLegs('skirt_nightshade_tatters', 'waist_nightshade_sash', 'feet_nightshade_boots', NB.NIGHT_BOOTS_LINE);
closesLegs('skirt_alchemist_tabard', 'waist_alchemist_belt', 'feet_alchemist_greaves', AG.ALCH_GREAVES_LINE);

/** Every item of the two outfits (catalog.ts). */
export const AURELIA_OUTFIT_ITEMS: ItemDef[] = [
  ARMOR_NIGHTSHADE_CORSET,
  TOP_NIGHTSHADE_SLEEVES,
  HANDS_NIGHTSHADE_GLOVES,
  WAIST_NIGHTSHADE_SASH,
  SKIRT_NIGHTSHADE_TATTERS,
  FEET_NIGHTSHADE_BOOTS,
  ARMOR_ALCHEMIST_CORSET,
  TOP_ALCHEMIST_BLOUSE,
  ACC_ALCHEMIST_PAULDRON,
  HANDS_ALCHEMIST_BRACERS,
  WAIST_ALCHEMIST_BELT,
  SKIRT_ALCHEMIST_TABARD,
  FEET_ALCHEMIST_GREAVES,
];

