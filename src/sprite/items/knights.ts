// The owner's three knights (2026-10-24, "nuevos conjuntos para el creador de personajes"): his picture
// (docs/reference/three-knights-owner-reference.jpg) shrunk to our scale and cleaned with his palette by
// tools/refs/knights_ref.py (the owner's "Reducir y limpiar yo": the body at the scale that fits our male
// rig, the head at our Roman head's size), lifted part by part by tools/refs/knight-*-from-ref.py, each part
// its own creator option in three sets: the silver paladin, the dark knight and the dragon knight. Each set
// has its armour (chest and pauldrons), arms (upper arms, vambraces, gauntlets or gloves), belt, skirt (the
// paladin's plated skirt, the dark knight's leather tabard, the dragon's scaled tassets), thighs, greaves and
// sabatons, and cape; the paladin also his fur mantle (an accessory). The three share one head: his hair
// (hair_knight) and his face and eyes (the 'knight' face and eye shapes in body.ts); and one flame sword with
// its guard and blade as parts (held_knight_sword). While a character wears his pieces the rig stands where
// he drew him (knightRig.ts), so in our male idle frame 0 every pixel is his picture's; in other poses each
// piece turns whole with its limb. His black line stays whatever the colours; the rest follows the colour
// slots, his own colours when they are kept. Only the men's bodies wear them (the owner: women never wear
// the men's sets).

import { retintHex } from '../color';
import { armDepth, armJoints, type Depth, DrawCtx, ItemDef, legDepth, legJoints, type PartsPreview, type PartSlot, Side } from '../ctx';
import { type PaintedPiece, segAngle, stampBent, stampPiece } from '../painted';
import { add, F_NO_OUTLINE, F_NO_TEXTURE, GRID, partIndex, PartId, RES, sub, v, Vec } from '../raster';
import { drawRig, GROUND, type Rig } from '../rig';
import { KNIGHT_BODIES, type KnightSet, knightLegsStill, knightRestRig, KNIGHT_SETS } from '../knightRig';
import type { BodyType } from '../types';
import { faceAnchor } from '../body';
import { closeAnkle, footTurn } from './ankle';
import { stampLeaning } from './armor';
import { capeWind, paintedBack } from './capes';
import * as ARMOR from './knightArmorArt';
import * as ARMS from './knightArmsArt';
import * as BELT from './knightBeltArt';
import * as CAPE from './knightCapeArt';
import * as FUR from './knightFurArt';
import { KNIGHT_HAIR, KNIGHT_HAIR_BASE, KNIGHT_HAIR_KIND } from './knightHairArt';
import * as LEGS from './knightLegsArt';
import * as SKIRT from './knightSkirtArt';
import * as SWORD from './knightSwordArt';

type Kind = 'cloth' | 'leather' | 'metal' | 'glow' | 'hair';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind: kind as 'cloth' });
const SIDES: Side[] = ['F', 'N'];
const MEN = [...KNIGHT_BODIES];
const pick = <T>(s: Side, n: T, f: T): T => (s === 'N' ? n : f);
const wrap180 = (a: number) => ((a + 540) % 360) - 180;
const UP: Record<KnightSet, string> = { paladin: 'PALADIN', dark: 'DARK', dragon: 'DRAGON' };

/** A piece or a colour of one of the art modules, by its generated name. */
const piece = (mod: object, name: string): PaintedPiece => (mod as Record<string, PaintedPiece>)[name];
const hexOf = (mod: object, name: string): string => (mod as Record<string, string>)[name];
const restOf = (mod: object, prefix: string, name: string): [number, number] => (mod as Record<string, Record<string, [number, number]>>)[`${prefix}_REST`][name];

const IDLE = new Map<BodyType, Rig>();
const idleRig = (body: BodyType): Rig => {
  let r = IDLE.get(body);
  if (!r) IDLE.set(body, (r = drawRig(body, 'idle', 0)));
  return r;
};

const PINNED = new Map<string, PaintedPiece>();
/**
 * A piece that rides the torso (the chest about the neck, the belt and skirt about the pelvis) with its pivot
 * moved so that at rest it lands where he drew it on every body (`rest`: its first cell in our frame;
 * `joint`: the joint it rides at rest on this body).
 */
function pinned(p: PaintedPiece, rest: [number, number], joint: Vec, key: string): PaintedPiece {
  const k = `${key}|${joint.x}|${joint.y}`;
  let out = PINNED.get(k);
  if (!out) PINNED.set(k, (out = { ...p, pivot: [Math.floor(joint.x * RES) - rest[0], Math.floor(joint.y * RES) - rest[1]] }));
  return out;
}

/** What a colour of his is (tools/refs/knights_ref.py kind). */
type His = 'line' | 'white' | 'warm' | 'skin' | 'gold' | 'flame' | 'red' | 'brown' | 'steel' | 'dark';

/** The kinds of his colours each set's trim (or glow) slot recolours; the rest follows the main slot. */
const TRIM: Record<KnightSet, His[]> = { paladin: ['gold'], dark: ['gold', 'brown'], dragon: ['flame', 'gold'] };

/** His colours through an item's slots: his black line stays, each listed kind follows its slot, the rest the main one. */
function tint(kinds: Record<string, string>, slots: [His[], string, string][], rest: [string, string]) {
  return (_ch: string, hex: string): string => {
    const k = kinds[hex] as His | undefined;
    if (k === 'line') return hex;
    for (const [ks, from, to] of slots) if (k && ks.includes(k)) return retintHex(hex, from, to);
    return retintHex(hex, rest[0], rest[1]);
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

/** Takes our torso away below the neck: his chest is the torso, so none of our skin or cloth shows past it. */
function torsoOff(g: DrawCtx): void {
  const r = g.rig;
  const torsoPart = partIndex('torso');
  const neck = (r.neck.x - r.pelvis.x) * r.up.x + (r.neck.y - r.pelvis.y) * r.up.y;
  for (const d of ['torso.body', 'torso.under', 'torso.bottom', 'torso.top'] as Depth[]) {
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

// ---------------------------------------------------------------------------
// The armour: chest and pauldrons
// ---------------------------------------------------------------------------

/** How much of the upper arm's turn (from rest, the torso's taken off) a pauldron follows: it rides the shoulder. */
const PAULDRON_FOLLOW = 0.55;

/** A pauldron's angle: with the torso, and part of the way with its upper arm. */
function pauldronAngle(r: Rig, s: Side, p: PaintedPiece): number {
  const idle = idleRig(r.body);
  const t = segAngle(r.pelvis, r.neck) - segAngle(idle.pelvis, idle.neck);
  const j = armJoints(r, s);
  return p.angle + t + PAULDRON_FOLLOW * wrap180(segAngle(j.shoulder, j.elbow) - t - p.angle);
}

function drawArmor(g: DrawCtx, set: KnightSet, plate: string, trim: string): void {
  const r = g.rig;
  const U = UP[set];
  const color = tint(ARMOR.KNIGHT_ARMOR_KIND, [[TRIM[set], hexOf(ARMOR, `KNIGHT_${U}_TRIM`), trim]], [hexOf(ARMOR, `KNIGHT_${U}_PLATE`), plate]);
  const line = lineOf(ARMOR.KNIGHT_ARMOR_KIND);
  torsoOff(g);
  const far = piece(ARMOR, `KNIGHT_${U}_PAULDRON_F`);
  const near = piece(ARMOR, `KNIGHT_${U}_PAULDRON_N`);
  const chest = `KNIGHT_${U}_CHEST`;
  stampPiece(g, 'farArm.armor', far, r.shoulderF, pauldronAngle(r, 'F', far), 'upperArmF', color, line);
  stampLeaning(g, 'torso.armor', pinned(piece(ARMOR, chest), restOf(ARMOR, 'KNIGHT_ARMOR', chest), knightRestRig(g.look).neck, chest), r.neck, segAngle(r.pelvis, r.neck), 'torso', color, line);
  stampPiece(g, 'nearArm.armor', near, r.shoulderN, pauldronAngle(r, 'N', near), 'upperArmN', color, line);
}

// ---------------------------------------------------------------------------
// The arms
// ---------------------------------------------------------------------------

/** How far round the elbow (fine px) his vambrace's top is swept through a bend, so the bend closes on his armour. */
const ELBOW_R = 3;

function drawArms(g: DrawCtx, set: KnightSet, plate: string, trim: string, glove: string): void {
  const r = g.rig;
  const U = UP[set];
  const gloves: His[] = set === 'dragon' ? [] : ['brown'];
  const color = tint(ARMS.KNIGHT_ARMS_KIND, [[TRIM[set], hexOf(ARMS, `KNIGHT_${U}_ARM_TRIM`), trim], [gloves, hexOf(ARMS, `KNIGHT_${U}_GLOVE`), glove]], [hexOf(ARMS, `KNIGHT_${U}_ARM_PLATE`), plate]);
  const line = lineOf(ARMS.KNIGHT_ARMS_KIND);
  for (const s of SIDES) {
    const j = armJoints(r, s);
    const up = `upperArm${s}` as PartId;
    const fore = `forearm${s}` as PartId;
    const hand = `hand${s}` as PartId;
    const k = s === 'N' ? 'N' : 'F';
    // his arm is the arm: ours goes (on the armour layer only our hand's glove: his pauldron rides it too)
    partsOff(g, [armDepth(s, 'body'), armDepth(s, 'cloth')], [up, fore, hand]);
    partsOff(g, [armDepth(s, 'armor')], [hand]);
    const upper = piece(ARMS, `KNIGHT_${U}_UPPER_${k}`);
    const vam = piece(ARMS, `KNIGHT_${U}_FORE_${k}`);
    const fist = piece(ARMS, `KNIGHT_${U}_HAND_${k}`);
    stampPiece(g, armDepth(s, 'cloth'), upper, j.shoulder, segAngle(j.shoulder, j.elbow), up, color, line);
    const bend = wrap180(segAngle(j.shoulder, j.elbow) - segAngle(j.elbow, j.wrist) - (upper.angle - vam.angle));
    stampBent(g, armDepth(s, 'armor'), vam, j.elbow, segAngle(j.elbow, j.wrist), fore, [{ about: j.elbow, r: ELBOW_R, bend }], line, color);
    stampPiece(g, armDepth(s, 'armor'), fist, j.wrist, segAngle(j.elbow, j.wrist), hand, color, line);
  }
}

// ---------------------------------------------------------------------------
// The belt and the skirt
// ---------------------------------------------------------------------------

function drawBelt(g: DrawCtx, set: KnightSet, leather: string, buckle: string): void {
  const r = g.rig;
  const U = UP[set];
  const name = `KNIGHT_${U}_BELT`;
  const buckleKinds: His[] = set === 'paladin' ? ['gold', 'steel', 'white'] : set === 'dark' ? ['steel', 'warm', 'gold'] : ['flame', 'gold'];
  const color = tint(BELT.KNIGHT_BELT_KIND, [[buckleKinds, hexOf(BELT, `KNIGHT_${U}_BUCKLE`), buckle]], [hexOf(BELT, `KNIGHT_${U}_LEATHER`), leather]);
  stampLeaning(g, 'waist', pinned(piece(BELT, name), restOf(BELT, 'KNIGHT_BELT', name), knightRestRig(g.look).pelvis, name), r.pelvis, segAngle(r.pelvis, r.neck), 'pelvis', color, lineOf(BELT.KNIGHT_BELT_KIND));
}

/** How much a panel follows its thigh swung forward (all of it: it lies on the thigh), and swung back. */
const PANEL_FORWARD = 1;
const PANEL_BACK = 0.35;

/** One of his panels where the skirt stamps it. */
export interface PanelStamp {
  piece: PaintedPiece;
  at: Vec;
  deg: number;
}

/**
 * His skirt as three panels hung from the waist, back to front: the far and near panels each turn with their
 * thigh about their top, lying on the thigh as it swings forward and only a little as it swings back; the
 * front panel halfway between both. Every piece is his pixels, turned whole. At rest every pixel is where he
 * drew it.
 */
export function panelStamps(g: DrawCtx, set: KnightSet): PanelStamp[] {
  const r = g.rig;
  const home = knightRestRig(g.look);
  const thighTurn = (s: Side) => {
    const now = legJoints(r, s);
    const was = legJoints(home, s);
    const w = wrap180(segAngle(now.hip, now.knee) - segAngle(was.hip, was.knee));
    return w < 0 ? w * PANEL_FORWARD : w * PANEL_BACK;
  };
  const torso = segAngle(r.pelvis, r.neck) - segAngle(home.pelvis, home.neck);
  const t = (torso * Math.PI) / 180;
  const out: PanelStamp[] = [];
  const [tN, tF] = [thighTurn('N'), thighTurn('F')];
  for (const [k, turn] of [['F', tF], ['C', (tN + tF) / 2], ['N', tN]] as const) {
    const name = `KNIGHT_${UP[set]}_TASSET_${k}`;
    const p = piece(SKIRT, name);
    const [ox, oy] = restOf(SKIRT, 'KNIGHT_SKIRT', name);
    // hung from the belt: turned about its own top's middle, carried with the pelvis
    const top = p.rows.findIndex((row) => [...row].some((ch) => ch !== '.'));
    const xs = [...p.rows[top]].map((ch, x) => (ch !== '.' ? x : -1)).filter((x) => x >= 0);
    const pivot: [number, number] = [Math.round((xs[0] + xs[xs.length - 1]) / 2), top];
    const rest = v((ox + pivot[0] + 0.5) / RES, (oy + pivot[1] + 0.5) / RES);
    const d = sub(rest, home.pelvis);
    const at = add(r.pelvis, v(d.x * Math.cos(t) - d.y * Math.sin(t), d.x * Math.sin(t) + d.y * Math.cos(t)));
    out.push({ piece: { ...p, pivot }, at, deg: p.angle + torso + turn });
  }
  return out;
}

/** His skirt never goes into the ground: crouched or kneeling, what would reach below the soles ends on the ground line on his line. */
function hemAtGround(g: DrawCtx, depth: Depth, part: PartId, line: number): void {
  if (g.rig.lay) return;
  const L = g.L(depth);
  const hemY = GROUND * RES - 1;
  const id = partIndex(part);
  for (let x = 0; x < GRID; x++) {
    let cut = false;
    for (let y = hemY + 1; y < GRID; y++) {
      const i = y * GRID + x;
      if (L.mat[i] >= 0 && L.part[i] === id) {
        L.mat[i] = -1;
        cut = true;
      }
    }
    const h = hemY * GRID + x;
    if (cut && L.mat[h] >= 0 && L.part[h] === id) L.set(x, hemY, line, 3, part, F_NO_TEXTURE | F_NO_OUTLINE);
  }
}

function drawSkirt(g: DrawCtx, set: KnightSet, main: string, trim: string): void {
  const U = UP[set];
  const color = tint(SKIRT.KNIGHT_SKIRT_KIND, [[TRIM[set], hexOf(SKIRT, `KNIGHT_${U}_SKIRT_TRIM`), trim]], [hexOf(SKIRT, `KNIGHT_${U}_SKIRT`), main]);
  const line = lineOf(SKIRT.KNIGHT_SKIRT_KIND);
  for (const p of panelStamps(g, set)) stampLeaning(g, 'torso.over', p.piece, p.at, p.deg, 'pelvis', color, line);
  const lineHex = Object.keys(SKIRT.KNIGHT_SKIRT_KIND).find((h) => SKIRT.KNIGHT_SKIRT_KIND[h] === 'line')!;
  hemAtGround(g, 'torso.over', 'pelvis', g.m(lineHex, 'flat'));
}

// ---------------------------------------------------------------------------
// The legs
// ---------------------------------------------------------------------------

/** His legs are his: our legs go where his thighs and greaves stand (knightRig.ts). */
const wearsLegs = (g: DrawCtx) => !!g.look.slots.bottom?.id.match(/_knight_/) && !!g.look.slots.feet?.id.match(/_knight_/);

function drawThighs(g: DrawCtx, set: KnightSet, main: string): void {
  const U = UP[set];
  const color = tint(LEGS.KNIGHT_LEGS_KIND, [], [hexOf(LEGS, `KNIGHT_${U}_THIGH`), main]);
  const line = lineOf(LEGS.KNIGHT_LEGS_KIND);
  for (const s of SIDES) {
    if (wearsLegs(g)) partsOff(g, [legDepth(s, 'body'), legDepth(s, 'cloth')], [`thigh${s}`, `shin${s}`, `foot${s}`] as PartId[]);
    const j = legJoints(g.rig, s);
    stampPiece(g, legDepth(s, 'cloth'), piece(LEGS, `KNIGHT_${U}_THIGH_${s}`), j.hip, segAngle(j.hip, j.knee), `thigh${s}` as PartId, color, line);
  }
}

function drawGreaves(g: DrawCtx, set: KnightSet, plate: string, trim: string): void {
  const U = UP[set];
  const color = tint(LEGS.KNIGHT_LEGS_KIND, [[TRIM[set], hexOf(LEGS, `KNIGHT_${U}_GREAVE_TRIM`), trim]], [hexOf(LEGS, `KNIGHT_${U}_GREAVE`), plate]);
  const line = lineOf(LEGS.KNIGHT_LEGS_KIND);
  const lineHex = Object.keys(LEGS.KNIGHT_LEGS_KIND).filter((h) => LEGS.KNIGHT_LEGS_KIND[h] === 'line');
  for (const s of SIDES) {
    const j = legJoints(g.rig, s);
    partsOff(g, [legDepth(s, 'body'), legDepth(s, 'cloth')], [`foot${s}` as PartId]);
    const shinDeg = segAngle(j.knee, j.ankle);
    const turn = footTurn(g, s);
    const foot = piece(LEGS, `KNIGHT_${U}_FOOT_${s}`);
    const D = legDepth(s, 'feet');
    // the sabaton under the ankle (turned with the shin once the leg swings it off the ground), the greave
    // over it about the ankle along the shin, the knee guard over the shin's top about the knee
    stampPiece(g, D, foot, j.ankle, foot.angle + turn, `foot${s}` as PartId, color, line);
    stampPiece(g, D, piece(LEGS, `KNIGHT_${U}_SHIN_${s}`), j.ankle, shinDeg, `shin${s}` as PartId, color, line);
    stampPiece(g, legDepth(s, 'armor'), piece(LEGS, `KNIGHT_${U}_KNEE_${s}`), j.knee, shinDeg, `shin${s}` as PartId, color, line);
    if (turn && lineHex.length) closeAnkle(g, s, j.ankle, g.m(lineHex[0], 'flat'), new Set(lineHex.map((h) => g.m(h, 'flat'))));
    if (wearsLegs(g)) partsOff(g, [legDepth(s, 'body')], [`shin${s}` as PartId]);
  }
}

// ---------------------------------------------------------------------------
// The cape, the fur, the hair
// ---------------------------------------------------------------------------

/** How far (degrees) his cape swings back for each design unit of the pose's wind (capes.ts capeWind), and the most. */
const CAPE_SWING = 1.6;
const CAPE_SWING_MAX = 24;

/**
 * His cape hung from behind the shoulders: it turns with the torso about the neck, and the pose's wind (the
 * same as every cape's) swings it back about there, whole, so his folds, tatters and embers stay his; it
 * never goes into the ground. Knocked out it lies along the back as the other painted capes do. At rest every
 * pixel is where he drew it.
 */
function drawCape(g: DrawCtx, set: KnightSet, red: string, edge: string): void {
  const U = UP[set];
  const edgeKinds: His[] = set === 'paladin' ? ['gold'] : set === 'dragon' ? ['flame', 'gold'] : [];
  const color = tint(CAPE.KNIGHT_CAPE_KIND, [[edgeKinds, hexOf(CAPE, `KNIGHT_${U}_CAPE_EDGE`), edge]], [hexOf(CAPE, `KNIGHT_${U}_CAPE_RED`), red]);
  const name = `KNIGHT_${U}_CAPE`;
  const p = piece(CAPE, name);
  const [ox, oy] = restOf(CAPE, 'KNIGHT_CAPE', name);
  const r = g.rig;
  const line = lineOf(CAPE.KNIGHT_CAPE_KIND);
  const edgeCh = Object.keys(p.colors).find((ch) => CAPE.KNIGHT_CAPE_KIND[p.colors[ch]] === 'line')!;
  if (r.lay) {
    paintedBack(g, p, GROUND * RES - (oy + p.rows.length - 1), edgeCh, color);
    return;
  }
  const home = knightRestRig(g.look);
  const t = segAngle(r.pelvis, r.neck) - segAngle(home.pelvis, home.neck);
  const w = capeWind(g);
  const swing = Math.max(-6, Math.min(CAPE_SWING_MAX, -w.dx * CAPE_SWING + w.wave));
  const top = v(Math.floor(home.neck.x * RES) + 0.5, Math.floor(home.neck.y * RES) + 0.5);
  const hung = { ...p, pivot: [Math.floor(top.x) - ox, Math.floor(top.y) - oy] as [number, number] };
  stampLeaning(g, 'capeBack', hung, r.neck, p.angle + t + swing, 'back', color, line);
  void knightLegsStill;
  const L = g.L('capeBack');
  const hemY = GROUND * RES - 1;
  const lineMat = g.m(p.colors[edgeCh], 'flat');
  for (let x = 0; x < GRID; x++) {
    let cut = false;
    for (let y = hemY + 1; y < GRID; y++)
      if (L.mat[y * GRID + x] >= 0) {
        L.mat[y * GRID + x] = -1;
        cut = true;
      }
    if (cut && L.mat[hemY * GRID + x] >= 0) L.set(x, hemY, lineMat, 3, 'back', F_NO_TEXTURE | F_NO_OUTLINE);
  }
}

function drawFur(g: DrawCtx, fur: string): void {
  const r = g.rig;
  const color = tint(FUR.KNIGHT_FUR_KIND, [], [FUR.KNIGHT_FUR, fur]);
  const line = lineOf(FUR.KNIGHT_FUR_KIND);
  const home = knightRestRig(g.look);
  const torso = segAngle(r.pelvis, r.neck);
  // round the neck and over each shoulder: each side rides the torso, carried with its shoulder
  for (const [name, depth, s] of [['KNIGHT_PALADIN_FUR_F', 'torso.acc', 'F'], ['KNIGHT_PALADIN_FUR', 'nearArm.over', 'N']] as const) {
    const p = pinned(piece(FUR, name), restOf(FUR, 'KNIGHT_FUR', name), home.neck, name);
    const shoulderNow = s === 'N' ? r.shoulderN : r.shoulderF;
    const shoulderHome = s === 'N' ? home.shoulderN : home.shoulderF;
    const neckNow = r.neck;
    // halfway between the neck's move and the shoulder's
    const at = add(neckNow, v((sub(shoulderNow, shoulderHome).x - sub(neckNow, home.neck).x) * 0.5, (sub(shoulderNow, shoulderHome).y - sub(neckNow, home.neck).y) * 0.5));
    stampLeaning(g, depth, p, at, torso, 'torso', color, line);
  }
}

function drawHair(g: DrawCtx, hair: string): void {
  const { nx, ny } = faceAnchor(g);
  const color = tint(KNIGHT_HAIR_KIND, [], [KNIGHT_HAIR_BASE, hair]);
  // his locks as he drew them: no fraying of the hair layer's edge
  g.L('hairFront').noFray = true;
  stampPiece(g, 'hairFront', KNIGHT_HAIR, v((nx + 0.5) / RES, (ny + 0.5) / RES), KNIGHT_HAIR.angle, 'head', color);
}

// ---------------------------------------------------------------------------
// The sword
// ---------------------------------------------------------------------------

/** The sword's parts (the owner: "la espada ponlos como para escoger la guarda como la katana"). */
export const KNIGHT_SWORD_PARTS: PartSlot[] = [
  {
    key: 'guard',
    label: 'Guard',
    options: [
      { id: 'paladin', label: 'Gold guard', desc: "The paladin's hilt: a gold cross-guard with a red jewel, a red grip and a gold pommel." },
      { id: 'dark', label: 'Dark iron guard', desc: "The dark knight's hilt: a dark iron cross-guard and a worn grip." },
      { id: 'dragon', label: 'Dragon guard', desc: "The dragon knight's hilt: a guard of dragon horns round a glowing red gem." },
    ],
  },
  {
    key: 'blade',
    label: 'Blade',
    options: [
      { id: 'flame', label: 'Flame blade', desc: 'A long blade burning red and orange, its bright core along one edge.' },
      { id: 'dragon', label: 'Dragon flame blade', desc: 'A wider blade whose flame burns paler toward the point.' },
    ],
  },
];

const HILTS: Record<string, PaintedPiece> = { paladin: SWORD.KNIGHT_HILT_PALADIN, dark: SWORD.KNIGHT_HILT_DARK, dragon: SWORD.KNIGHT_HILT_DRAGON };
export const KNIGHT_HILT_GUARD: Record<string, string> = { paladin: SWORD.KNIGHT_HILT_PALADIN_GUARD, dark: SWORD.KNIGHT_HILT_DARK_GUARD, dragon: SWORD.KNIGHT_HILT_DRAGON_GUARD };
const BLADES: Record<string, PaintedPiece> = { flame: SWORD.KNIGHT_BLADE_FLAME, dragon: SWORD.KNIGHT_BLADE_DRAGON };
const BLADE_FLAME: Record<string, string> = { flame: SWORD.KNIGHT_BLADE_FLAME_FLAME, dragon: SWORD.KNIGHT_BLADE_DRAGON_FLAME };

const SWORDS = new Map<string, PaintedPiece & { colors: Record<string, string> }>();
/**
 * The sword with these parts as one piece: the blade laid along the guard's line (at the guard's angle, the
 * blade turned by the difference: his blades lie 2 degrees apart), both on the near hand joint, the hilt over
 * the blade. Its characters are the blade's prefixed 'b' and the hilt's 'h' so the two tints never meet.
 */
export function knightSword(parts: Record<string, string>): PaintedPiece & { colors: Record<string, string> } {
  const key = `${parts.guard}|${parts.blade}`;
  let out = SWORDS.get(key);
  if (out) return out;
  const hilt = HILTS[parts.guard] ?? HILTS.paladin;
  const blade = BLADES[parts.blade] ?? BLADES.flame;
  // the blade's cells about its pivot, turned onto the hilt's angle (whole degrees off: nearest cell)
  const d = ((hilt.angle - blade.angle) * Math.PI) / 180;
  const cells = new Map<string, string>();
  const put = (x: number, y: number, ch: string) => cells.set(`${x},${y}`, ch);
  blade.rows.forEach((row, j) =>
    [...row].forEach((ch, i) => {
      if (ch === '.') return;
      const px = i - blade.pivot[0];
      const py = j - blade.pivot[1];
      const x = Math.round(px * Math.cos(d) - py * Math.sin(d));
      const y = Math.round(px * Math.sin(d) + py * Math.cos(d));
      put(x, y, 'b' + ch);
    }),
  );
  hilt.rows.forEach((row, j) => [...row].forEach((ch, i) => ch !== '.' && put(i - hilt.pivot[0], j - hilt.pivot[1], 'h' + ch)));
  const xs = [...cells.keys()].map((k) => +k.split(',')[0]);
  const ys = [...cells.keys()].map((k) => +k.split(',')[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  // one character per (piece, colour): the alphabet of the two pieces together
  const alpha = new Map<string, string>();
  const colors: Record<string, string> = {};
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-/:;<=>?@[]^_{|}~' + [...Array(400)].map((_, k) => String.fromCharCode(0xc0 + k)).join('');
  const code = (pc: string) => {
    let c = alpha.get(pc);
    if (!c) {
      c = chars[alpha.size];
      alpha.set(pc, c);
      colors[c] = pc[0] === 'b' ? blade.colors[pc.slice(1)] : hilt.colors[pc.slice(1)];
    }
    return c;
  };
  const rows: string[] = [];
  for (let y = y0; y <= y1; y++) {
    let row = '';
    for (let x = x0; x <= x1; x++) {
      const pc = cells.get(`${x},${y}`);
      row += pc ? code(pc) : '.';
    }
    rows.push(row);
  }
  const which: Record<string, 'b' | 'h'> = {};
  for (const [pc, c] of alpha) which[c] = pc[0] as 'b' | 'h';
  out = { pivot: [-x0, -y0], angle: hilt.angle, rows, colors, ...{ which } } as PaintedPiece & { colors: Record<string, string> };
  SWORDS.set(key, out);
  return out;
}

/** The sword's colours: his line kept, the blade's through Flame, the hilt's through Guard (from each guard's own colour). */
export function knightSwordTint(parts: Record<string, string>, flame: string, guard: string) {
  const s = knightSword(parts) as PaintedPiece & { which: Record<string, 'b' | 'h'> };
  const blade = BLADE_FLAME[parts.blade] ?? BLADE_FLAME.flame;
  const hilt = KNIGHT_HILT_GUARD[parts.guard] ?? KNIGHT_HILT_GUARD.paladin;
  // the slots' defaults mean each part's own colours (his gold or his iron, his flame or his dragon's)
  const to = (c: string, def: string, own: string) => (c.toLowerCase() === def ? own : c);
  const f = to(flame, SWORD.KNIGHT_BLADE_FLAME_FLAME, blade);
  const gd = to(guard, SWORD.KNIGHT_HILT_PALADIN_GUARD, hilt);
  return (ch: string, hex: string): string => {
    if (SWORD.KNIGHT_SWORD_KIND[hex] === 'line') return hex;
    return s.which[ch] === 'b' ? retintHex(hex, blade, f) : retintHex(hex, hilt, gd);
  };
}

/** The sword on its own for the part pickers (unturned, as it lies at rest). */
export function knightSwordPreview(parts: Record<string, string>): PartsPreview {
  const s = knightSword(parts);
  return { rows: s.rows, colors: s.colors };
}

export const KNIGHT_SWORD_ID = 'held_knight_sword';

// ---------------------------------------------------------------------------
// The items
// ---------------------------------------------------------------------------

const SET_NAMES: Record<KnightSet, { en: string; plate: string; trim: string }> = {
  paladin: { en: 'Paladin', plate: 'Plate', trim: 'Gold' },
  dark: { en: 'Dark Knight', plate: 'Plate', trim: 'Bronze' },
  dragon: { en: 'Dragon Knight', plate: 'Scales', trim: 'Glow' },
};

const DESCS: Record<KnightSet, Record<string, string>> = {
  paladin: {
    armor: 'Polished silver plate trimmed in gold, a gold cross on the chest and gold-trimmed pauldrons (+5 AC).',
    hands: 'Silver rerebraces and vambraces trimmed in gold, a gauntlet on the sword hand and a brown glove.',
    waist: 'A brown belt with a round gold buckle.',
    skirt: 'A plated silver skirt with a gold-trimmed front tasset.',
    bottom: 'Dark navy padding under the plate.',
    feet: 'Round silver knee guards, greaves trimmed in gold and silver sabatons.',
    cape: 'A long red cape edged in gold, hung from the shoulders.',
  },
  dark: {
    armor: 'Blackened, worn plate over mail, its edges dull bronze (+5 AC).',
    hands: 'Blackened rerebraces and vambraces and dark gauntlets.',
    waist: 'A dark belt with a round iron buckle.',
    skirt: 'A studded brown leather tabard between blackened plates.',
    bottom: 'Dark padding under the plate.',
    feet: 'Blackened knee guards and greaves, and dark boots.',
    cape: 'A dark red cape, torn to tatters at the hem.',
  },
  dragon: {
    armor: 'Copper-red dragon-scale armour with horned, spiked pauldrons, a dragon\'s head on the shoulder, and glowing red gems (+5 AC).',
    hands: 'Scaled arms with spiked vambraces and clawed gauntlets.',
    waist: 'A scaled waist plate with a glowing red gem.',
    skirt: 'Scaled tassets hanging from the waist.',
    bottom: 'Dark scaled padding under the armour.',
    feet: 'Spiked knee guards, scaled greaves and clawed sabatons.',
    cape: 'A red cape veined with glowing embers.',
  },
};

function setItems(set: KnightSet): ItemDef[] {
  const U = UP[set];
  const n = SET_NAMES[set];
  const d = DESCS[set];
  return [
    {
      id: `armor_knight_${set}`,
      slot: 'armor',
      name: `${n.en} Armor`,
      desc: d.armor,
      colors: [col('plate', n.plate, hexOf(ARMOR, `KNIGHT_${U}_PLATE`), 'metal'), col('trim', n.trim, hexOf(ARMOR, `KNIGHT_${U}_TRIM`), 'metal')],
      statsArmor: 'Dark Knight Plate',
      bodies: [...MEN],
      draw: (g, [plate, trim]) => drawArmor(g, set, plate, trim),
    },
    {
      id: `hands_knight_${set}`,
      slot: 'hands',
      name: `${n.en} Arms`,
      desc: d.hands,
      colors: [
        col('plate', n.plate, hexOf(ARMS, `KNIGHT_${U}_ARM_PLATE`), 'metal'),
        col('trim', n.trim, hexOf(ARMS, `KNIGHT_${U}_ARM_TRIM`), 'metal'),
        col('glove', 'Gloves', hexOf(ARMS, `KNIGHT_${U}_GLOVE`), 'leather'),
      ],
      bodies: [...MEN],
      draw: (g, [plate, trim, glove]) => drawArms(g, set, plate, trim, glove),
    },
    {
      id: `waist_knight_${set}`,
      slot: 'waist',
      name: `${n.en} Belt`,
      desc: d.waist,
      colors: [col('leather', 'Belt', hexOf(BELT, `KNIGHT_${U}_LEATHER`), 'leather'), col('buckle', 'Buckle', hexOf(BELT, `KNIGHT_${U}_BUCKLE`), 'metal')],
      bodies: [...MEN],
      draw: (g, [leather, buckle]) => drawBelt(g, set, leather, buckle),
    },
    {
      id: `skirt_knight_${set}`,
      slot: 'skirt',
      name: `${n.en} Skirt`,
      desc: d.skirt,
      colors: [col('main', set === 'dark' ? 'Tabard' : n.plate, hexOf(SKIRT, `KNIGHT_${U}_SKIRT`), set === 'dark' ? 'leather' : 'metal'), col('trim', n.trim, hexOf(SKIRT, `KNIGHT_${U}_SKIRT_TRIM`), 'metal')],
      bodies: [...MEN],
      draw: (g, [main, trim]) => drawSkirt(g, set, main, trim),
    },
    {
      id: `bottom_knight_${set}`,
      slot: 'bottom',
      name: `${n.en} Padding`,
      desc: d.bottom,
      colors: [col('main', 'Padding', hexOf(LEGS, `KNIGHT_${U}_THIGH`))],
      bodies: [...MEN],
      draw: (g, [main]) => drawThighs(g, set, main),
    },
    {
      id: `feet_knight_${set}`,
      slot: 'feet',
      name: `${n.en} Greaves`,
      desc: d.feet,
      colors: [col('plate', n.plate, hexOf(LEGS, `KNIGHT_${U}_GREAVE`), 'metal'), col('trim', n.trim, hexOf(LEGS, `KNIGHT_${U}_GREAVE_TRIM`), 'metal')],
      bodies: [...MEN],
      draw: (g, [plate, trim]) => drawGreaves(g, set, plate, trim),
    },
    {
      id: `cape_knight_${set}`,
      slot: 'cape',
      name: `${n.en} Cape`,
      desc: d.cape,
      colors: [col('main', 'Cape', hexOf(CAPE, `KNIGHT_${U}_CAPE_RED`)), col('edge', set === 'dragon' ? 'Embers' : 'Edge', hexOf(CAPE, `KNIGHT_${U}_CAPE_EDGE`), set === 'dragon' ? 'glow' : 'metal')],
      bodies: [...MEN],
      draw: (g, [main, edge]) => drawCape(g, set, main, edge),
    },
  ];
}

export const KNIGHT_ITEMS: ItemDef[] = [
  {
    id: 'hair_knight',
    slot: 'hair',
    name: "Knight's Spikes",
    desc: 'Brown hair in tousled spikes over the brow and the ears.',
    colors: [col('hair', 'Hair', KNIGHT_HAIR_BASE, 'hair')],
    draw: (g, [hair]) => drawHair(g, hair),
  },
  ...KNIGHT_SETS.flatMap(setItems),
  {
    id: 'acc_knight_fur',
    slot: 'accessory',
    name: 'Fur Mantle',
    desc: 'A thick white fur mantle over the shoulders and round the neck.',
    colors: [col('fur', 'Fur', FUR.KNIGHT_FUR)],
    bodies: [...MEN],
    draw: (g, [fur]) => drawFur(g, fur),
  },
];

void legDepth;
void idleRig;
