// The owner's three new male outfits (2026-10-24, "nuevas opciones para el creador de personajes son 3
// diferentes copialas"): his picture (docs/reference/three-outfits-owner-reference.jpg) shrunk to our scale
// and cleaned with his palette by tools/refs/outfits_ref.py (the owner's "Reducir y limpiar yo": each
// body at the scale that fits our male rig, the head at our Roman head's size), lifted part by part by
// tools/refs/<item>-from-ref.py, each part its own creator option:
//   - the Warden (his armoured figure): the plate cuirass with its shoulder plates, the mail sleeves, the
//     bracers and gauntlets, the belt, the mail skirt and tassets, the thigh and knee plates, the greaves
//     and sabatons, and his blue sword;
//   - the Drifter (his leather rogue): the jacket, the fingerless gloves, the belt with pouches, the
//     wrapped trousers with knee pads and the lace-up boots;
//   - the Vanguard (his tactical figure): the armoured vest, the short sleeves, the forearm wraps and
//     gloves, the utility belt, the cargo trousers and the armoured boots;
//   - and the head the three share: his spiky hair here (his face and eyes are the 'wanderer' face and eye
//     shapes in body.ts).
// The names are provisional: the owner names them. While a look wears a figure's arms or legs the rig
// stands where he drew them (outfitRig.ts), so in our male idle frame 0 every pixel is his picture's; in
// other poses each piece turns whole with its limb. His black line stays whatever the colours; his skin
// follows the character's skin; the rest follows the colour slots, his own colours when they are kept.
// Only the men's bodies wear them (the owner: women never wear the men's sets).

import { faceAnchor } from '../body';
import { retintHex, retintSkinLifted } from '../color';
import { armDepth, armJoints, type Depth, type DrawCtx, handPose, type ItemDef, legDepth, legJoints, type Side } from '../ctx';
import { swordAngle } from '../grip';
import { handsBusy, handsLimp, handsReleased } from '../grip';
import { OUTFIT_SKIN } from '../outfitHeadArt';
import { OUTFIT_BODIES, outfitRestRig } from '../outfitRig';
import { type PaintedPiece, segAngle, stampBent, stampLeaning, stampPiece, stretchPiece } from '../painted';
import { GRID, partIndex, type PartId, RES, v, type Vec } from '../raster';
import { drawRig, type Rig } from '../rig';
import type { BodyType } from '../types';
import { backAngle, backGrip, droppedGrip } from './accessories';
import { closeAnkle, footTurn } from './ankle';
import { clothPen, glove } from './clothes';
import { DRIFTER_BELT_BELT, DRIFTER_BELT_KIND, DRIFTER_BELT_LEATHER, DRIFTER_BELT_REST } from './drifterBeltArt';
import { DRIFTER_BOOTS_BOOT_F, DRIFTER_BOOTS_BOOT_N, DRIFTER_BOOTS_FOOT_F, DRIFTER_BOOTS_FOOT_N, DRIFTER_BOOTS_KIND, DRIFTER_BOOTS_LEATHER } from './drifterBootsArt';
import { DRIFTER_GLOVES_HAND_F, DRIFTER_GLOVES_HAND_N, DRIFTER_GLOVES_KIND, DRIFTER_GLOVES_LEATHER } from './drifterGlovesArt';
import { DRIFTER_JACKET_FORE_F, DRIFTER_JACKET_FORE_N, DRIFTER_JACKET_KIND, DRIFTER_JACKET_LEATHER, DRIFTER_JACKET_REST, DRIFTER_JACKET_TORSO, DRIFTER_JACKET_UPPER_F, DRIFTER_JACKET_UPPER_N } from './drifterJacketArt';
import { DRIFTER_TROUSERS_CLOTH, DRIFTER_TROUSERS_KIND, DRIFTER_TROUSERS_SHIN_F, DRIFTER_TROUSERS_SHIN_N, DRIFTER_TROUSERS_THIGH_F, DRIFTER_TROUSERS_THIGH_N } from './drifterTrousersArt';
import { OUTFIT_HAIR, OUTFIT_HAIR_BASE, OUTFIT_HAIR_KIND } from './outfitHairArt';
import { VANGUARD_BELT_BELT, VANGUARD_BELT_CLOTH, VANGUARD_BELT_KIND, VANGUARD_BELT_REST } from './vanguardBeltArt';
import { VANGUARD_BOOTS_BOOT_F, VANGUARD_BOOTS_BOOT_N, VANGUARD_BOOTS_CLOTH, VANGUARD_BOOTS_FOOT_F, VANGUARD_BOOTS_FOOT_N, VANGUARD_BOOTS_KIND } from './vanguardBootsArt';
import { VANGUARD_CARGO_CLOTH, VANGUARD_CARGO_KIND, VANGUARD_CARGO_SHIN_F, VANGUARD_CARGO_SHIN_N, VANGUARD_CARGO_THIGH_F, VANGUARD_CARGO_THIGH_N } from './vanguardCargoArt';
import { VANGUARD_SLEEVES_CLOTH, VANGUARD_SLEEVES_KIND, VANGUARD_SLEEVES_UPPER_F, VANGUARD_SLEEVES_UPPER_N } from './vanguardSleevesArt';
import { VANGUARD_VEST_CLOTH, VANGUARD_VEST_KIND, VANGUARD_VEST_REST, VANGUARD_VEST_TORSO } from './vanguardVestArt';
import { VANGUARD_WRAPS_CLOTH, VANGUARD_WRAPS_FORE_F, VANGUARD_WRAPS_FORE_N, VANGUARD_WRAPS_HAND_F, VANGUARD_WRAPS_HAND_N, VANGUARD_WRAPS_KIND } from './vanguardWrapsArt';
import { WARDEN_BELT_BELT, WARDEN_BELT_BUCKLE, WARDEN_BELT_KIND, WARDEN_BELT_LEATHER, WARDEN_BELT_REST } from './wardenBeltArt';
import { WARDEN_CUISSES_KIND, WARDEN_CUISSES_STEEL, WARDEN_CUISSES_THIGH_F, WARDEN_CUISSES_THIGH_N } from './wardenCuissesArt';
import { WARDEN_GAUNTLETS_FORE_F, WARDEN_GAUNTLETS_FORE_N, WARDEN_GAUNTLETS_HAND_F, WARDEN_GAUNTLETS_HAND_N, WARDEN_GAUNTLETS_KIND, WARDEN_GAUNTLETS_STEEL } from './wardenGauntletsArt';
import { WARDEN_GREAVES_BOOT_F, WARDEN_GREAVES_BOOT_N, WARDEN_GREAVES_FOOT_F, WARDEN_GREAVES_FOOT_N, WARDEN_GREAVES_KIND, WARDEN_GREAVES_STEEL } from './wardenGreavesArt';
import { WARDEN_MAIL_KIND, WARDEN_MAIL_MAIL, WARDEN_MAIL_UPPER_F, WARDEN_MAIL_UPPER_N } from './wardenMailArt';
import { WARDEN_PLATE_KIND, WARDEN_PLATE_REST, WARDEN_PLATE_SHOULDER_F, WARDEN_PLATE_SHOULDER_N, WARDEN_PLATE_STEEL, WARDEN_PLATE_TORSO } from './wardenPlateArt';
import { WARDEN_SWORD_BLADE, WARDEN_SWORD_GUARD, WARDEN_SWORD_KIND, WARDEN_SWORD_SWORD } from './wardenSwordArt';
import { WARDEN_TASSETS_KIND, WARDEN_TASSETS_REST, WARDEN_TASSETS_SKIRT, WARDEN_TASSETS_STEEL } from './wardenTassetsArt';
import { drawPaintedWeapon } from './weapons';

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });
const SIDES: Side[] = ['F', 'N'];
const MEN = [...OUTFIT_BODIES];
const pick = <T>(s: Side, n: T, f: T): T => (s === 'N' ? n : f);
const wrap180 = (a: number) => ((a + 540) % 360) - 180;

const IDLE = new Map<BodyType, Rig>();
const idleRig = (body: BodyType): Rig => {
  let r = IDLE.get(body);
  if (!r) IDLE.set(body, (r = drawRig(body, 'idle', 0)));
  return r;
};

const PINNED = new Map<string, PaintedPiece>();
/**
 * A piece that rides the torso (the cuirass, jacket and vest about the neck, the belts and the skirt about
 * the pelvis) with its pivot moved so that at rest it lands where he drew it on every body (`rest`: its
 * first cell in our frame; `joint`: the joint it rides at rest on this body).
 */
function pinned(piece: PaintedPiece, rest: [number, number], joint: Vec, key: string): PaintedPiece {
  const k = `${key}|${joint.x}|${joint.y}`;
  let p = PINNED.get(k);
  if (!p) PINNED.set(k, (p = { ...piece, pivot: [Math.floor(joint.x * RES) - rest[0], Math.floor(joint.y * RES) - rest[1]] }));
  return p;
}

/** What a colour of his is (tools/refs/outfits_ref.py kind). */
type His = 'line' | 'white' | 'skin' | 'blue' | 'gold' | 'brown' | 'hair' | 'steel' | 'dark';

/** A colour slot: the kinds of his colours it moves (none: every one no other slot takes), his colour it moves from and the chosen one. */
type Slot = [His[] | null, string, string];

/**
 * His colours through an item's slots: his black line stays, his skin follows the character's skin (from
 * his one skin tone, so in that skin every pixel is his), each other colour follows the first slot that
 * names its kind, or the slot that names none.
 */
function tint(g: DrawCtx, kinds: Record<string, string>, slots: Slot[]) {
  return (_ch: string, hex: string): string => {
    const k = kinds[hex] as His | undefined;
    if (k === 'line') return hex;
    if (k === 'skin') return retintSkinLifted(hex, OUTFIT_SKIN, g.look.skin);
    const s = slots.find((sl) => sl[0] && k && sl[0].includes(k)) ?? slots.find((sl) => !sl[0])!;
    return retintHex(hex, s[1], s[2]);
  };
}
const lineOf = (kinds: Record<string, string>) => (hex: string) => kinds[hex] === 'line';

/** Takes these parts of ours out of these layers (his pieces take their place). */
function partsOff(g: DrawCtx, depths: Depth[], parts: PartId[]): void {
  const ids = new Set(parts.map((p) => partIndex(p)));
  for (const d of depths) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && ids.has(L.part[i])) L.mat[i] = -1;
  }
}

/** Takes our torso away below the neck: his cuirass, jacket or vest is the torso, so none of our skin or cloth shows past it. */
function torsoOff(g: DrawCtx): void {
  const r = g.rig;
  const torsoPart = partIndex('torso');
  const neck = (r.neck.x - r.pelvis.x) * r.up.x + (r.neck.y - r.pelvis.y) * r.up.y;
  for (const d of ['torso.body', 'torso.under', 'torso.bottom', 'torso.top', 'neck'] as Depth[]) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || L.part[i] !== torsoPart) continue;
      const x = ((i % GRID) + 0.5) / RES - r.pelvis.x;
      const y = (Math.floor(i / GRID) + 0.5) / RES - r.pelvis.y;
      if (x * r.up.x + y * r.up.y <= neck) L.mat[i] = -1;
    }
  }
}

/** A torso piece (cuirass, jacket, vest) on the torso, our torso taken away under it. */
function drawTorso(g: DrawCtx, piece: PaintedPiece, rest: [number, number], key: string, depth: Depth, color: (ch: string, hex: string) => string, line: (hex: string) => boolean): void {
  const r = g.rig;
  torsoOff(g);
  stampLeaning(g, depth, pinned(piece, rest, outfitRestRig(g.look).neck, key), r.neck, segAngle(r.pelvis, r.neck), 'torso', color, line);
}

/** A piece hung from the waist (a belt, the skirt), riding the pelvis as the torso leans. */
function drawWaist(g: DrawCtx, piece: PaintedPiece, rest: [number, number], key: string, depth: Depth, color: (ch: string, hex: string) => string, line: (hex: string) => boolean): void {
  const r = g.rig;
  stampLeaning(g, depth, pinned(piece, rest, outfitRestRig(g.look).pelvis, key), r.pelvis, segAngle(r.pelvis, r.neck), 'pelvis', color, line);
}

// ---------------------------------------------------------------------------
// Arms
// ---------------------------------------------------------------------------

/** How much of the upper arm's turn (from rest, the torso's taken off) a shoulder plate follows: it hangs from the shoulder. */
const PAD_FOLLOW = 0.55;

function padAngle(r: Rig, s: Side, piece: PaintedPiece): number {
  const idle = idleRig(r.body);
  const t = segAngle(r.pelvis, r.neck) - segAngle(idle.pelvis, idle.neck);
  const j = armJoints(r, s);
  return piece.angle + t + PAD_FOLLOW * wrap180(segAngle(j.shoulder, j.elbow) - t - piece.angle);
}

/** His shoulder plates on the shoulders: the far one behind the chest, the near one over the near sleeve. */
function drawPads(g: DrawCtx, near: PaintedPiece, far: PaintedPiece, color: (ch: string, hex: string) => string, line: (hex: string) => boolean): void {
  const r = g.rig;
  stampPiece(g, 'farArm.armor', far, r.shoulderF, padAngle(r, 'F', far), 'upperArmF', color, line);
  stampPiece(g, 'nearArm.over', near, r.shoulderN, padAngle(r, 'N', near), 'upperArmN', color, line);
}

/** His sleeves on the upper arms, about the shoulders; ours goes. */
function drawUpper(g: DrawCtx, near: PaintedPiece, far: PaintedPiece, color: (ch: string, hex: string) => string, line: (hex: string) => boolean): void {
  for (const s of SIDES) {
    const j = armJoints(g.rig, s);
    const up = `upperArm${s}` as PartId;
    partsOff(g, [armDepth(s, 'body'), armDepth(s, 'cloth')], [up]);
    stampPiece(g, armDepth(s, 'cloth'), pick(s, near, far), j.shoulder, segAngle(j.shoulder, j.elbow), up, color, line);
  }
}

/** How far round the elbow (fine px) his forearm's top is swept through a bend, so the bend closes on his own pixels. */
const ELBOW_R = 4;

/**
 * His forearms about the elbows, ours taken away: the top swept back toward the upper arm where the elbow
 * bends past the way he drew it (stampBent), so the elbow fills with his own pixels; on a forearm longer
 * than his (an arm reaching out) his rows repeated to reach the wrist.
 */
function drawFore(g: DrawCtx, near: PaintedPiece, far: PaintedPiece, upperN: number, upperF: number, depth: 'cloth' | 'armor', color: (ch: string, hex: string) => string, line: (hex: string) => boolean): void {
  const rest0 = outfitRestRig(g.look);
  for (const s of SIDES) {
    const j = armJoints(g.rig, s);
    const fore = `forearm${s}` as PartId;
    partsOff(g, [armDepth(s, 'body'), armDepth(s, 'cloth')], [fore]);
    const piece = pick(s, near, far);
    const bend = wrap180(segAngle(j.shoulder, j.elbow) - segAngle(j.elbow, j.wrist) - (pick(s, upperN, upperF) - piece.angle));
    const rest = armJoints(rest0, s);
    const bone = Math.hypot(rest.wrist.x - rest.elbow.x, rest.wrist.y - rest.elbow.y);
    const extra = (Math.hypot(j.wrist.x - j.elbow.x, j.wrist.y - j.elbow.y) - bone) * RES;
    stampBent(g, armDepth(s, depth), extra > 0.5 ? stretchPiece(piece, extra, bone * RES) : piece, j.elbow, segAngle(j.elbow, j.wrist), fore, [{ about: j.elbow, r: ELBOW_R, bend }], line, color);
  }
}

/**
 * His fists about the wrists, ours taken away, while a hand is closed (a fist, a grip, hanging); an open,
 * pointing or signing hand is ours in his glove's colour, the fingers bare.
 */
function drawHands(g: DrawCtx, near: PaintedPiece, far: PaintedPiece, gloveHex: string, color: (ch: string, hex: string) => string, line: (hex: string) => boolean): void {
  for (const s of SIDES) {
    const j = armJoints(g.rig, s);
    const hand = `hand${s}` as PartId;
    const kind = handPose(g, s).kind;
    if (kind === 'fist' || kind === 'grip' || kind === 'relaxed') {
      partsOff(g, [armDepth(s, 'body'), armDepth(s, 'cloth'), armDepth(s, 'armor')], [hand]);
      stampPiece(g, armDepth(s, 'armor'), pick(s, near, far), j.wrist, segAngle(j.elbow, j.wrist), hand, color, line);
    } else glove(g, s, clothPen(g, gloveHex, hand, s === 'F' ? -1 : 0), 0.2, true);
  }
}

// ---------------------------------------------------------------------------
// Legs
// ---------------------------------------------------------------------------

/** His thighs about the hips (ours taken away: his trousers are the legs); a thigh longer than at rest (seated) takes his rows repeated. */
function drawThighs(g: DrawCtx, near: PaintedPiece, far: PaintedPiece, color: (ch: string, hex: string) => string, line: (hex: string) => boolean): void {
  const rest0 = outfitRestRig(g.look);
  for (const s of SIDES) {
    partsOff(g, [legDepth(s, 'body'), legDepth(s, 'cloth')], [`thigh${s}`, `shin${s}`] as PartId[]);
    const j = legJoints(g.rig, s);
    const rest = legJoints(rest0, s);
    const bone = Math.hypot(rest.knee.x - rest.hip.x, rest.knee.y - rest.hip.y);
    const extra = (Math.hypot(j.knee.x - j.hip.x, j.knee.y - j.hip.y) - bone) * RES;
    const thigh = pick(s, near, far);
    stampPiece(g, legDepth(s, 'cloth'), extra > 0.5 ? stretchPiece(thigh, extra, bone * RES) : thigh, j.hip, segAngle(j.hip, j.knee), `thigh${s}` as PartId, color, line);
  }
}

/** His trousers below the knee pads, about the knees. */
function drawShins(g: DrawCtx, near: PaintedPiece, far: PaintedPiece, color: (ch: string, hex: string) => string, line: (hex: string) => boolean): void {
  for (const s of SIDES) {
    const j = legJoints(g.rig, s);
    stampPiece(g, legDepth(s, 'cloth'), pick(s, near, far), j.knee, segAngle(j.knee, j.ankle), `shin${s}` as PartId, color, line);
  }
}

/**
 * His boots: the shaft along the shin about the ankle, the foot flat under it (turned with the shin once
 * the leg swings it off the ground, ankle.ts), our foot and shin under them taken away.
 */
function drawBoots(g: DrawCtx, shinN: PaintedPiece, shinF: PaintedPiece, footN: PaintedPiece, footF: PaintedPiece, kinds: Record<string, string>, color: (ch: string, hex: string) => string): void {
  const line = lineOf(kinds);
  const lineHex = Object.keys(kinds).filter((h) => kinds[h] === 'line');
  for (const s of SIDES) {
    const j = legJoints(g.rig, s);
    partsOff(g, [legDepth(s, 'body'), legDepth(s, 'cloth')], [`foot${s}`] as PartId[]);
    partsOff(g, [legDepth(s, 'body')], [`shin${s}`] as PartId[]);
    const turn = footTurn(g, s);
    const foot = pick(s, footN, footF);
    const D = legDepth(s, 'feet');
    stampPiece(g, D, foot, j.ankle, foot.angle + turn, `foot${s}` as PartId, color, line);
    stampPiece(g, D, pick(s, shinN, shinF), j.ankle, segAngle(j.knee, j.ankle), `shin${s}` as PartId, color, line);
    if (turn && lineHex.length) closeAnkle(g, s, j.ankle, g.m(lineHex[0], 'flat'), new Set(lineHex.map((h) => g.m(h, 'flat'))));
  }
}

// ---------------------------------------------------------------------------
// The hair and the sword
// ---------------------------------------------------------------------------

function drawHair(g: DrawCtx, hair: string): void {
  const { nx, ny } = faceAnchor(g);
  // his locks as he drew them: no fraying of the hair layer's edge
  g.L('hairFront').noFray = true;
  stampPiece(g, 'hairFront', OUTFIT_HAIR, v((nx + 0.5) / RES, (ny + 0.5) / RES), OUTFIT_HAIR.angle, 'head', tint(g, OUTFIT_HAIR_KIND, [[null, OUTFIT_HAIR_BASE, hair]]));
}

const SWORD_LINE = lineOf(WARDEN_SWORD_KIND);

function drawSword(g: DrawCtx, blade: string, guard: string): void {
  const color = tint(g, WARDEN_SWORD_KIND, [[['gold'], WARDEN_SWORD_GUARD, guard], [null, WARDEN_SWORD_BLADE, blade]]);
  // held by its grip at the hand joint, at his angle at rest (grip.ts swordAngle), so at rest every pixel is his
  if (handsBusy(g)) drawPaintedWeapon(g, 'backGear', WARDEN_SWORD_SWORD, backGrip(g, 48), backAngle(g, 48), color, SWORD_LINE);
  else if (handsLimp(g)) drawPaintedWeapon(g, 'nearArm.held', WARDEN_SWORD_SWORD, droppedGrip(g, 0.7), -86, color, SWORD_LINE);
  else if (!handsReleased(g)) drawPaintedWeapon(g, 'nearArm.held', WARDEN_SWORD_SWORD, g.rig.handN, swordAngle(g), color, SWORD_LINE);
}

const WP = (k: string) => WARDEN_PLATE_REST[k];

export const OUTFIT_ITEMS: ItemDef[] = [
  {
    id: 'hair_wanderer',
    slot: 'hair',
    name: 'Wanderer Spikes',
    desc: 'Spiky blue-black hair, messy over the brow and the ears.',
    colors: [{ key: 'hair', label: 'Hair', default: OUTFIT_HAIR_BASE, kind: 'hair' as const }],
    draw: (g, [hair]) => drawHair(g, hair),
  },
  // --- the Warden (his armoured figure) ---
  {
    id: 'armor_warden_plate',
    slot: 'armor',
    name: 'Warden Plate',
    desc: 'A dark steel cuirass in segmented plates with a high gorget, and round shoulder plates (+4 AC).',
    colors: [col('main', 'Steel', WARDEN_PLATE_STEEL, 'metal')],
    statsArmor: 'Roman Legionary Segmentata',
    bodies: [...MEN],
    draw: (g, [steel]) => {
      const color = tint(g, WARDEN_PLATE_KIND, [[null, WARDEN_PLATE_STEEL, steel]]);
      const line = lineOf(WARDEN_PLATE_KIND);
      drawTorso(g, WARDEN_PLATE_TORSO, WP('WARDEN_PLATE_TORSO'), 'warden', 'torso.armor', color, line);
      drawPads(g, WARDEN_PLATE_SHOULDER_N, WARDEN_PLATE_SHOULDER_F, color, line);
    },
  },
  {
    id: 'top_warden_mail',
    slot: 'top',
    name: 'Warden Mail Sleeves',
    desc: 'Mail sleeves with a round plate at the elbow.',
    colors: [col('main', 'Mail', WARDEN_MAIL_MAIL, 'metal')],
    bodies: [...MEN],
    draw: (g, [mail]) => drawUpper(g, WARDEN_MAIL_UPPER_N, WARDEN_MAIL_UPPER_F, tint(g, WARDEN_MAIL_KIND, [[null, WARDEN_MAIL_MAIL, mail]]), lineOf(WARDEN_MAIL_KIND)),
  },
  {
    id: 'hands_warden_gauntlets',
    slot: 'hands',
    name: 'Warden Gauntlets',
    desc: 'Plated bracers over the forearms and steel gauntlets.',
    colors: [col('main', 'Steel', WARDEN_GAUNTLETS_STEEL, 'metal')],
    bodies: [...MEN],
    draw: (g, [steel]) => {
      const color = tint(g, WARDEN_GAUNTLETS_KIND, [[null, WARDEN_GAUNTLETS_STEEL, steel]]);
      const line = lineOf(WARDEN_GAUNTLETS_KIND);
      drawFore(g, WARDEN_GAUNTLETS_FORE_N, WARDEN_GAUNTLETS_FORE_F, WARDEN_MAIL_UPPER_N.angle, WARDEN_MAIL_UPPER_F.angle, 'armor', color, line);
      drawHands(g, WARDEN_GAUNTLETS_HAND_N, WARDEN_GAUNTLETS_HAND_F, retintHex(WARDEN_GAUNTLETS_STEEL, WARDEN_GAUNTLETS_STEEL, steel), color, line);
    },
  },
  {
    id: 'waist_warden_belt',
    slot: 'waist',
    name: 'Warden Belt',
    desc: 'A studded brown belt with a square steel buckle.',
    colors: [col('main', 'Leather', WARDEN_BELT_LEATHER, 'leather'), col('buckle', 'Buckle', WARDEN_BELT_BUCKLE, 'metal')],
    bodies: [...MEN],
    draw: (g, [leather, buckle]) =>
      drawWaist(g, WARDEN_BELT_BELT, WARDEN_BELT_REST.WARDEN_BELT_BELT, 'warden-belt', 'waist', tint(g, WARDEN_BELT_KIND, [[['steel', 'dark', 'hair'], WARDEN_BELT_BUCKLE, buckle], [null, WARDEN_BELT_LEATHER, leather]]), lineOf(WARDEN_BELT_KIND)),
  },
  {
    id: 'skirt_warden_tassets',
    slot: 'skirt',
    name: 'Warden Tassets',
    desc: 'A mail skirt between plate tassets, hanging from the belt over the thighs.',
    colors: [col('main', 'Steel', WARDEN_TASSETS_STEEL, 'metal')],
    bodies: [...MEN],
    draw: (g, [steel]) => drawWaist(g, WARDEN_TASSETS_SKIRT, WARDEN_TASSETS_REST.WARDEN_TASSETS_SKIRT, 'warden-skirt', 'skirt', tint(g, WARDEN_TASSETS_KIND, [[null, WARDEN_TASSETS_STEEL, steel]]), lineOf(WARDEN_TASSETS_KIND)),
  },
  {
    id: 'bottom_warden_cuisses',
    slot: 'bottom',
    name: 'Warden Cuisses',
    desc: 'Plates over the thighs and round knee plates.',
    colors: [col('main', 'Steel', WARDEN_CUISSES_STEEL, 'metal')],
    bodies: [...MEN],
    draw: (g, [steel]) => drawThighs(g, WARDEN_CUISSES_THIGH_N, WARDEN_CUISSES_THIGH_F, tint(g, WARDEN_CUISSES_KIND, [[null, WARDEN_CUISSES_STEEL, steel]]), lineOf(WARDEN_CUISSES_KIND)),
  },
  {
    id: 'feet_warden_greaves',
    slot: 'feet',
    name: 'Warden Greaves',
    desc: 'Steel greaves over the shins and plated sabatons.',
    colors: [col('main', 'Steel', WARDEN_GREAVES_STEEL, 'metal')],
    bodies: [...MEN],
    draw: (g, [steel]) => drawBoots(g, WARDEN_GREAVES_BOOT_N, WARDEN_GREAVES_BOOT_F, WARDEN_GREAVES_FOOT_N, WARDEN_GREAVES_FOOT_F, WARDEN_GREAVES_KIND, tint(g, WARDEN_GREAVES_KIND, [[null, WARDEN_GREAVES_STEEL, steel]])),
  },
  {
    id: 'held_warden_sword',
    slot: 'held',
    name: 'Warden Sword',
    desc: 'A long sword with a blue blade dithered light and dark, a gold cross-guard and pommel and a blue grip.',
    colors: [col('blade', 'Blade', WARDEN_SWORD_BLADE, 'metal'), col('guard', 'Guard', WARDEN_SWORD_GUARD, 'metal')],
    draw: (g, [blade, guard]) => drawSword(g, blade, guard),
  },
  // --- the Drifter (his leather rogue) ---
  {
    id: 'top_drifter_jacket',
    slot: 'top',
    name: 'Drifter Jacket',
    desc: 'A dark high-collared leather jacket with straps crossed over the chest and wrapped, quilted sleeves.',
    colors: [col('main', 'Leather', DRIFTER_JACKET_LEATHER, 'leather')],
    bodies: [...MEN],
    draw: (g, [leather]) => {
      const color = tint(g, DRIFTER_JACKET_KIND, [[null, DRIFTER_JACKET_LEATHER, leather]]);
      const line = lineOf(DRIFTER_JACKET_KIND);
      drawTorso(g, DRIFTER_JACKET_TORSO, DRIFTER_JACKET_REST.DRIFTER_JACKET_TORSO, 'drifter', 'torso.top', color, line);
      drawUpper(g, DRIFTER_JACKET_UPPER_N, DRIFTER_JACKET_UPPER_F, color, line);
      drawFore(g, DRIFTER_JACKET_FORE_N, DRIFTER_JACKET_FORE_F, DRIFTER_JACKET_UPPER_N.angle, DRIFTER_JACKET_UPPER_F.angle, 'cloth', color, line);
    },
  },
  {
    id: 'hands_drifter_gloves',
    slot: 'hands',
    name: 'Drifter Gloves',
    desc: 'Dark fingerless leather gloves.',
    colors: [col('main', 'Leather', DRIFTER_GLOVES_LEATHER, 'leather')],
    bodies: [...MEN],
    draw: (g, [leather]) => drawHands(g, DRIFTER_GLOVES_HAND_N, DRIFTER_GLOVES_HAND_F, retintHex(DRIFTER_GLOVES_LEATHER, DRIFTER_GLOVES_LEATHER, leather), tint(g, DRIFTER_GLOVES_KIND, [[null, DRIFTER_GLOVES_LEATHER, leather]]), lineOf(DRIFTER_GLOVES_KIND)),
  },
  {
    id: 'waist_drifter_belt',
    slot: 'waist',
    name: 'Drifter Belt',
    desc: 'A leather belt with pouches and a steel buckle.',
    colors: [col('main', 'Leather', DRIFTER_BELT_LEATHER, 'leather')],
    bodies: [...MEN],
    draw: (g, [leather]) => drawWaist(g, DRIFTER_BELT_BELT, DRIFTER_BELT_REST.DRIFTER_BELT_BELT, 'drifter-belt', 'waist', tint(g, DRIFTER_BELT_KIND, [[null, DRIFTER_BELT_LEATHER, leather]]), lineOf(DRIFTER_BELT_KIND)),
  },
  {
    id: 'bottom_drifter_trousers',
    slot: 'bottom',
    name: 'Drifter Trousers',
    desc: 'Dark wrapped trousers with round knee pads, tucked into the boots.',
    colors: [col('main', 'Cloth', DRIFTER_TROUSERS_CLOTH)],
    bodies: [...MEN],
    draw: (g, [cloth]) => {
      const color = tint(g, DRIFTER_TROUSERS_KIND, [[null, DRIFTER_TROUSERS_CLOTH, cloth]]);
      const line = lineOf(DRIFTER_TROUSERS_KIND);
      drawThighs(g, DRIFTER_TROUSERS_THIGH_N, DRIFTER_TROUSERS_THIGH_F, color, line);
      drawShins(g, DRIFTER_TROUSERS_SHIN_N, DRIFTER_TROUSERS_SHIN_F, color, line);
    },
  },
  {
    id: 'feet_drifter_boots',
    slot: 'feet',
    name: 'Drifter Boots',
    desc: 'Brown lace-up leather boots.',
    colors: [col('main', 'Leather', DRIFTER_BOOTS_LEATHER, 'leather')],
    bodies: [...MEN],
    draw: (g, [leather]) => drawBoots(g, DRIFTER_BOOTS_BOOT_N, DRIFTER_BOOTS_BOOT_F, DRIFTER_BOOTS_FOOT_N, DRIFTER_BOOTS_FOOT_F, DRIFTER_BOOTS_KIND, tint(g, DRIFTER_BOOTS_KIND, [[null, DRIFTER_BOOTS_LEATHER, leather]])),
  },
  // --- the Vanguard (his tactical figure) ---
  {
    id: 'armor_vanguard_vest',
    slot: 'armor',
    name: 'Vanguard Vest',
    desc: 'A black armoured vest with mesh panels and a high collar (+3 AC).',
    colors: [col('main', 'Vest', VANGUARD_VEST_CLOTH)],
    statsArmor: 'Leaf Chunin Flak',
    bodies: [...MEN],
    draw: (g, [cloth]) => drawTorso(g, VANGUARD_VEST_TORSO, VANGUARD_VEST_REST.VANGUARD_VEST_TORSO, 'vanguard', 'torso.armor', tint(g, VANGUARD_VEST_KIND, [[null, VANGUARD_VEST_CLOTH, cloth]]), lineOf(VANGUARD_VEST_KIND)),
  },
  {
    id: 'top_vanguard_sleeves',
    slot: 'top',
    name: 'Vanguard Sleeves',
    desc: 'Black short sleeves with padded shoulders, the arms bare below them.',
    colors: [col('main', 'Cloth', VANGUARD_SLEEVES_CLOTH)],
    bodies: [...MEN],
    draw: (g, [cloth]) => drawUpper(g, VANGUARD_SLEEVES_UPPER_N, VANGUARD_SLEEVES_UPPER_F, tint(g, VANGUARD_SLEEVES_KIND, [[null, VANGUARD_SLEEVES_CLOTH, cloth]]), lineOf(VANGUARD_SLEEVES_KIND)),
  },
  {
    id: 'hands_vanguard_wraps',
    slot: 'hands',
    name: 'Vanguard Wraps',
    desc: 'Black wraps round the forearms and fingerless gloves.',
    colors: [col('main', 'Cloth', VANGUARD_WRAPS_CLOTH)],
    bodies: [...MEN],
    draw: (g, [cloth]) => {
      const color = tint(g, VANGUARD_WRAPS_KIND, [[null, VANGUARD_WRAPS_CLOTH, cloth]]);
      const line = lineOf(VANGUARD_WRAPS_KIND);
      drawFore(g, VANGUARD_WRAPS_FORE_N, VANGUARD_WRAPS_FORE_F, VANGUARD_SLEEVES_UPPER_N.angle, VANGUARD_SLEEVES_UPPER_F.angle, 'armor', color, line);
      drawHands(g, VANGUARD_WRAPS_HAND_N, VANGUARD_WRAPS_HAND_F, retintHex(VANGUARD_WRAPS_CLOTH, VANGUARD_WRAPS_CLOTH, cloth), color, line);
    },
  },
  {
    id: 'waist_vanguard_belt',
    slot: 'waist',
    name: 'Vanguard Belt',
    desc: 'A utility belt with pouches and a square buckle.',
    colors: [col('main', 'Belt', VANGUARD_BELT_CLOTH)],
    bodies: [...MEN],
    draw: (g, [cloth]) => drawWaist(g, VANGUARD_BELT_BELT, VANGUARD_BELT_REST.VANGUARD_BELT_BELT, 'vanguard-belt', 'waist', tint(g, VANGUARD_BELT_KIND, [[null, VANGUARD_BELT_CLOTH, cloth]]), lineOf(VANGUARD_BELT_KIND)),
  },
  {
    id: 'bottom_vanguard_cargo',
    slot: 'bottom',
    name: 'Vanguard Cargo Trousers',
    desc: 'Black cargo trousers with knee pads, tucked into the boots.',
    colors: [col('main', 'Cloth', VANGUARD_CARGO_CLOTH)],
    bodies: [...MEN],
    draw: (g, [cloth]) => {
      const color = tint(g, VANGUARD_CARGO_KIND, [[null, VANGUARD_CARGO_CLOTH, cloth]]);
      const line = lineOf(VANGUARD_CARGO_KIND);
      drawThighs(g, VANGUARD_CARGO_THIGH_N, VANGUARD_CARGO_THIGH_F, color, line);
      drawShins(g, VANGUARD_CARGO_SHIN_N, VANGUARD_CARGO_SHIN_F, color, line);
    },
  },
  {
    id: 'feet_vanguard_boots',
    slot: 'feet',
    name: 'Vanguard Boots',
    desc: 'Black armoured boots.',
    colors: [col('main', 'Leather', VANGUARD_BOOTS_CLOTH, 'leather')],
    bodies: [...MEN],
    draw: (g, [c]) => drawBoots(g, VANGUARD_BOOTS_BOOT_N, VANGUARD_BOOTS_BOOT_F, VANGUARD_BOOTS_FOOT_N, VANGUARD_BOOTS_FOOT_F, VANGUARD_BOOTS_KIND, tint(g, VANGUARD_BOOTS_KIND, [[null, VANGUARD_BOOTS_CLOTH, c]])),
  },
];
