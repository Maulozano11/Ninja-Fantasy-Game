// The owner's samurai (2026-10-24, "nuevos sets para cuerpos masculinos"): his picture
// (docs/reference/samurai-owner-reference.jpg) shrunk to our scale and cleaned with his palette by
// tools/refs/samurai_ref.py (the owner's "Reducir y limpiar yo": the body at the scale that fits our male
// rig, the head at our Roman head's size), lifted part by part by tools/refs/samurai-*-from-ref.py, each part
// its own creator option: the hair with its topknot, the do with the sode, the sleeves with the kote and
// gloves, the obi, the kusazuri, the hakama, the shin guards with the sandal-boots and the cape. (His face
// and eyes are the 'samurai' face and eye shapes in body.ts.) While he wears them the rig stands where he
// drew him (samuraiRig.ts), so in our male idle frame 0 every pixel is his picture's; in other poses each
// piece turns whole with its limb. His black line stays whatever the colours; his skin follows the
// character's skin; the rest follows the colour slots, his own colours when they are kept. Only the men's
// bodies wear them (the owner: women never wear the men's sets).

import { retintHex, retintSkinLifted } from '../color';
import { armDepth, armJoints, type Depth, DrawCtx, handPose, ItemDef, legDepth, legJoints, Side } from '../ctx';
import { type PaintedPiece, segAngle, stampBent, stampPiece, stretchPiece } from '../painted';
import { add, F_NO_OUTLINE, F_NO_TEXTURE, GRID, partIndex, PartId, RES, sub, v, Vec } from '../raster';
import { drawRig, GROUND, type Rig } from '../rig';
import { SAMURAI_BODIES, samuraiLegsStill, samuraiRestRig } from '../samuraiRig';
import { SAMURAI_SKIN } from '../samuraiHeadArt';
import { sealCloth } from '../seal';
import type { BodyType } from '../types';
import { closeAnkle, footTurn } from './ankle';
import { stampLeaning } from './armor';
import { capeWind, paintedBack } from './capes';
import { clothPen, glove } from './clothes';
import { SAMURAI_ARM_CORD, SAMURAI_ARM_GOLD, SAMURAI_ARM_IRON, SAMURAI_ARMS_KIND, SAMURAI_GLOVE, SAMURAI_HAND_F, SAMURAI_HAND_N, SAMURAI_KOTE_F, SAMURAI_KOTE_N, SAMURAI_SLEEVE_F, SAMURAI_SLEEVE_N } from './samuraiArmsArt';
import { SAMURAI_CAPE, SAMURAI_CAPE_FAR, SAMURAI_CAPE_KIND, SAMURAI_CAPE_RED, SAMURAI_CAPE_REST } from './samuraiCapeArt';
import { SAMURAI_DO, SAMURAI_DO_KIND, SAMURAI_DO_REST, SAMURAI_GOLD, SAMURAI_LACING, SAMURAI_LACQUER, SAMURAI_SODE_F, SAMURAI_SODE_N } from './samuraiDoArt';
import { SAMURAI_HAIR, SAMURAI_HAIR_BASE, SAMURAI_HAIR_CORD, SAMURAI_HAIR_KIND } from './samuraiHairArt';
import { SAMURAI_HAKAMA, SAMURAI_HAKAMA_KIND, SAMURAI_THIGH_F, SAMURAI_THIGH_N } from './samuraiHakamaArt';
import { SAMURAI_KUSAZURI, SAMURAI_KUSAZURI_KIND, SAMURAI_KUSAZURI_REST, SAMURAI_TASSET_GOLD, SAMURAI_TASSET_LACING, SAMURAI_TASSET_LACQUER } from './samuraiKusazuriArt';
import { SAMURAI_OBI, SAMURAI_OBI_GOLD, SAMURAI_OBI_KIND, SAMURAI_OBI_REST } from './samuraiObiArt';
import {
  SAMURAI_BOOT,
  SAMURAI_BOOT_GOLD,
  SAMURAI_FOOT_F,
  SAMURAI_FOOT_N,
  SAMURAI_GREAVE,
  SAMURAI_GREAVE_TIE,
  SAMURAI_KNEE_F,
  SAMURAI_KNEE_N,
  SAMURAI_SHIN_F,
  SAMURAI_SHIN_N,
  SAMURAI_SUNEATE_KIND,
} from './samuraiSuneateArt';
import { faceAnchor } from '../body';

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });
const SIDES: Side[] = ['F', 'N'];
const MEN = [...SAMURAI_BODIES];
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
 * A piece that rides the torso (the do about the neck, the obi about the pelvis) with its pivot moved so that
 * at rest it lands where he drew it on every body (`rest`: its first cell in our frame; `joint`: the joint it
 * rides at rest on this body), so his chest, sash and tassets stand together as he drew them.
 */
function pinned(piece: PaintedPiece, rest: [number, number], joint: Vec, key: string): PaintedPiece {
  const k = `${key}|${joint.x}|${joint.y}`;
  let p = PINNED.get(k);
  if (!p) PINNED.set(k, (p = { ...piece, pivot: [Math.floor(joint.x * RES) - rest[0], Math.floor(joint.y * RES) - rest[1]] }));
  return p;
}

/** What a colour of his is (tools/refs/samurai_ref.py kind). */
type His = 'line' | 'white' | 'hair' | 'skin' | 'gold' | 'red' | 'steel' | 'dark';

/**
 * His colours through an item's slots: his black line stays, his skin follows the character's skin (as his
 * Roman's does, retintSkinLifted), each other kind of his follows the slot named for it, his own colour
 * when the slot keeps his.
 */
function tint(g: DrawCtx, kinds: Record<string, string>, slots: Partial<Record<His, [string, string]>>, rest: [string, string]) {
  return (_ch: string, hex: string): string => {
    const k = kinds[hex] as His | undefined;
    if (k === 'line' || k === 'white') return hex;
    if (k === 'skin') return retintSkinLifted(hex, SAMURAI_SKIN, g.look.skin);
    const s = (k && slots[k]) || rest;
    return retintHex(hex, s[0], s[1]);
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

/** Takes our torso away below the neck: his do is the torso, so none of our skin or cloth shows past it. */
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
// The do and the sode
// ---------------------------------------------------------------------------

/** How much of the upper arm's turn (from rest, the torso's taken off) a shoulder guard follows: it hangs from the shoulder. */
const SODE_FOLLOW = 0.55;

/** A shoulder guard's angle: with the torso, and part of the way with its upper arm. */
function sodeAngle(r: Rig, s: Side, piece: PaintedPiece): number {
  const idle = idleRig(r.body);
  const t = segAngle(r.pelvis, r.neck) - segAngle(idle.pelvis, idle.neck);
  const j = armJoints(r, s);
  const turn = wrap180(segAngle(j.shoulder, j.elbow) - t - piece.angle);
  return piece.angle + t + SODE_FOLLOW * turn;
}

function drawDo(g: DrawCtx, lacquer: string, lacing: string, gold: string): void {
  const r = g.rig;
  const color = tint(g, SAMURAI_DO_KIND, { red: [SAMURAI_LACING, lacing], gold: [SAMURAI_GOLD, gold] }, [SAMURAI_LACQUER, lacquer]);
  const line = lineOf(SAMURAI_DO_KIND);
  torsoOff(g);
  stampPiece(g, 'farArm.armor', SAMURAI_SODE_F, r.shoulderF, sodeAngle(r, 'F', SAMURAI_SODE_F), 'upperArmF', color, line);
  stampLeaning(g, 'torso.armor', pinned(SAMURAI_DO, SAMURAI_DO_REST.SAMURAI_DO, samuraiRestRig(g.look).neck, 'do'), r.neck, segAngle(r.pelvis, r.neck), 'torso', color, line);
  stampPiece(g, 'nearArm.armor', SAMURAI_SODE_N, r.shoulderN, sodeAngle(r, 'N', SAMURAI_SODE_N), 'upperArmN', color, line);
}

// ---------------------------------------------------------------------------
// The sleeves, kote and gloves
// ---------------------------------------------------------------------------

/** How far round the elbow (fine px) his kote's top is swept through a bend, so the bend closes on his armour. */
const ELBOW_R = 4;

/** How far an elbow bends past the way he drew it (degrees): the forearm's turn from its rest angle to the upper arm's. */
function elbowBend(r: Rig, s: Side): number {
  const j = armJoints(r, s);
  return wrap180(segAngle(j.shoulder, j.elbow) - segAngle(j.elbow, j.wrist) - (pick(s, SAMURAI_SLEEVE_N, SAMURAI_SLEEVE_F).angle - pick(s, SAMURAI_KOTE_N, SAMURAI_KOTE_F).angle));
}

/** Which of his gloves a hand wears, or none (our hand in his glove's colour: a grip, an open palm, a pointing hand, a book). */
function hisGlove(g: DrawCtx, s: Side): PaintedPiece | null {
  const kind = handPose(g, s).kind;
  if (kind === 'fist') return SAMURAI_HAND_F;
  if (kind === 'relaxed') return pick(s, SAMURAI_HAND_N, SAMURAI_HAND_F);
  return null;
}

function drawArms(g: DrawCtx, iron: string, gold: string, cord: string): void {
  const r = g.rig;
  const color = tint(g, SAMURAI_ARMS_KIND, { gold: [SAMURAI_ARM_GOLD, gold], red: [SAMURAI_ARM_CORD, cord] }, [SAMURAI_ARM_IRON, iron]);
  const line = lineOf(SAMURAI_ARMS_KIND);
  for (const s of SIDES) {
    const j = armJoints(r, s);
    const up = `upperArm${s}` as PartId;
    const fore = `forearm${s}` as PartId;
    const hand = `hand${s}` as PartId;
    // his sleeve and kote are the arm: ours goes
    partsOff(g, [armDepth(s, 'body'), armDepth(s, 'cloth')], [up, fore]);
    stampPiece(g, armDepth(s, 'cloth'), pick(s, SAMURAI_SLEEVE_N, SAMURAI_SLEEVE_F), j.shoulder, segAngle(j.shoulder, j.elbow), up, color, line);
    // the kote about the elbow, its top swept back toward the upper arm where the elbow bends past his; on a
    // forearm longer than his (our arm reaching out, the bulky body's) his rows repeated to reach the wrist
    const bend = elbowBend(r, s);
    const rest = armJoints(samuraiRestRig(g.look), s);
    const bone = Math.hypot(rest.wrist.x - rest.elbow.x, rest.wrist.y - rest.elbow.y);
    const extra = (Math.hypot(j.wrist.x - j.elbow.x, j.wrist.y - j.elbow.y) - bone) * RES;
    const kote = pick(s, SAMURAI_KOTE_N, SAMURAI_KOTE_F);
    stampBent(g, armDepth(s, 'armor'), extra > 0.5 ? stretchPiece(kote, extra, bone * RES) : kote, j.elbow, segAngle(j.elbow, j.wrist), fore, [{ about: j.elbow, r: ELBOW_R, bend }], line, color);
    const his = hisGlove(g, s);
    if (his) {
      partsOff(g, [armDepth(s, 'body'), armDepth(s, 'cloth'), armDepth(s, 'armor')], [hand]);
      stampPiece(g, armDepth(s, 'armor'), his, j.wrist, segAngle(j.elbow, j.wrist), hand, color, line);
    } else {
      // our hand, in his glove's black with the fingers bare
      glove(g, s, clothPen(g, retintHex(SAMURAI_GLOVE, SAMURAI_ARM_IRON, iron), hand, s === 'F' ? -1 : 0), 0.2, true);
    }
  }
}

// ---------------------------------------------------------------------------
// The kusazuri
// ---------------------------------------------------------------------------

/** His tassets in panels, cut down his seams (columns of SAMURAI_KUSAZURI): the near panel, the front panel and the far panel. */
const KUSAZURI_PANELS: { x0: number; x1: number; on: Side | 'both' }[] = [
  { x0: 26, x1: 40, on: 'F' },
  { x0: 14, x1: 25, on: 'both' },
  { x0: 0, x1: 13, on: 'N' },
];
/** How much a panel follows its thigh swung forward (all of it: it lies on the thigh), and swung back. */
const TASSET_FORWARD = 1;
const TASSET_BACK = 0.35;
const TASSET_CUTS = new Map<string, PaintedPiece>();
function tassetCut(x0: number, x1: number, pivot: [number, number]): PaintedPiece {
  const key = [x0, x1, ...pivot].join(',');
  let p = TASSET_CUTS.get(key);
  if (!p) {
    const rows = SAMURAI_KUSAZURI.rows.map((row) => [...row].map((ch, x) => (x >= x0 && x <= x1 ? ch : '.')).join(''));
    TASSET_CUTS.set(key, (p = { ...SAMURAI_KUSAZURI, rows, pivot }));
  }
  return p;
}

/** One of his panels where the tassets stamp it. */
export interface TassetStamp {
  piece: PaintedPiece;
  at: Vec;
  deg: number;
}

/**
 * His kusazuri as plates hung from the waist, back to front: each panel turns with its thigh about its hip
 * (the front panel halfway between both, about the pelvis), lying on the thigh as it swings forward and
 * only a little as it swings back; with the legs apart the front panel is swept from one thigh's turn to the
 * other's behind the others, so no gap opens down the seams. Every piece is his pixels, turned whole. At
 * rest every pixel is where he drew it.
 */
export function tassetStamps(g: DrawCtx): TassetStamp[] {
  const r = g.rig;
  const home = samuraiRestRig(g.look);
  const [ox, oy] = SAMURAI_KUSAZURI_REST.SAMURAI_KUSAZURI;
  const thighTurn = (s: Side) => {
    const now = legJoints(r, s);
    const was = legJoints(home, s);
    const w = wrap180(segAngle(now.hip, now.knee) - segAngle(was.hip, was.knee));
    return w < 0 ? w * TASSET_FORWARD : w * TASSET_BACK;
  };
  const torso = segAngle(r.pelvis, r.neck) - segAngle(home.pelvis, home.neck);
  const out: TassetStamp[] = [];
  const panel = (x0: number, x1: number, on: Side | 'both', turn: number) => {
    // hung from the sash: turned about its own top (the middle of its columns on its first row), which is
    // carried with the pelvis, so it never comes away from the waist; at rest every pixel where he drew it
    const top = SAMURAI_KUSAZURI.rows.findIndex((row) => [...row].slice(x0, x1 + 1).some((ch) => ch !== '.'));
    const pivot: [number, number] = [Math.round((x0 + x1) / 2), top];
    const rest = v((ox + pivot[0] + 0.5) / RES, (oy + pivot[1] + 0.5) / RES);
    const d = sub(rest, home.pelvis);
    const t = (torso * Math.PI) / 180;
    const at = add(r.pelvis, v(d.x * Math.cos(t) - d.y * Math.sin(t), d.x * Math.sin(t) + d.y * Math.cos(t)));
    void on;
    out.push({ piece: tassetCut(x0, x1, pivot), at, deg: SAMURAI_KUSAZURI.angle + torso + turn });
  };
  const [tN, tF] = [thighTurn('N'), thighTurn('F')];
  const mid = KUSAZURI_PANELS.find((p) => p.on === 'both')!;
  const m = Math.ceil(Math.abs(tN - tF) / 8);
  for (let k = 0; k <= m; k++) if (m > 1) panel(mid.x0, mid.x1, 'both', tF + ((tN - tF) * k) / m);
  for (const { x0, x1, on } of KUSAZURI_PANELS) panel(x0, x1, on, on === 'both' ? (tN + tF) / 2 : on === 'N' ? tN : tF);
  return out;
}

/** His tassets never go into the ground: crouched or kneeling, what would reach below the soles ends on the ground line on his line. */
function hemTassets(g: DrawCtx, depth: Depth, line: number): void {
  if (g.rig.lay) return;
  const L = g.L(depth);
  const hemY = GROUND * RES - 1;
  const pelvis = partIndex('pelvis');
  for (let x = 0; x < GRID; x++) {
    let cut = false;
    for (let y = hemY + 1; y < GRID; y++) {
      const i = y * GRID + x;
      if (L.mat[i] >= 0 && L.part[i] === pelvis) {
        L.mat[i] = -1;
        cut = true;
      }
    }
    const h = hemY * GRID + x;
    if (cut && L.mat[h] >= 0 && L.part[h] === pelvis) L.set(x, hemY, line, 3, 'pelvis', F_NO_TEXTURE | F_NO_OUTLINE);
  }
}

// ---------------------------------------------------------------------------
// The hakama, the shin guards and the boots
// ---------------------------------------------------------------------------

/** His legs are his: our legs go, the hakama and the shin guards stand where he drew them (samuraiRig.ts). */
const wearsLegs = (g: DrawCtx) => g.has('bottom', 'bottom_samurai_hakama') && g.has('feet', 'feet_samurai_suneate');

function drawHakama(g: DrawCtx, red: string): void {
  const color = tint(g, SAMURAI_HAKAMA_KIND, {}, [SAMURAI_HAKAMA, red]);
  const line = lineOf(SAMURAI_HAKAMA_KIND);
  for (const s of SIDES) {
    if (wearsLegs(g)) partsOff(g, [legDepth(s, 'body'), legDepth(s, 'cloth')], [`thigh${s}`, `shin${s}`, `foot${s}`] as PartId[]);
    const j = legJoints(g.rig, s);
    // a thigh longer than at rest (seated: rig.ts kneeLeg) takes his leg lengthened with it (stretchPiece)
    const rest = legJoints(samuraiRestRig(g.look), s);
    const bone = Math.hypot(rest.knee.x - rest.hip.x, rest.knee.y - rest.hip.y);
    const extra = (Math.hypot(j.knee.x - j.hip.x, j.knee.y - j.hip.y) - bone) * RES;
    const thigh = pick(s, SAMURAI_THIGH_N, SAMURAI_THIGH_F);
    stampPiece(g, legDepth(s, 'cloth'), extra > 0.5 ? stretchPiece(thigh, extra, bone * RES) : thigh, j.hip, segAngle(j.hip, j.knee), `thigh${s}` as PartId, color, line);
  }
}

/** Takes our bare foot away (his boot takes its place); the shin stays. */
function footOff(g: DrawCtx, s: Side): void {
  partsOff(g, [legDepth(s, 'body'), legDepth(s, 'cloth')], [`foot${s}` as PartId]);
}

function drawSuneate(g: DrawCtx, greave: string, tie: string, boot: string, bootGold: string): void {
  const color = tint(g, SAMURAI_SUNEATE_KIND, { red: [SAMURAI_GREAVE_TIE, tie], gold: [SAMURAI_BOOT_GOLD, bootGold] }, [SAMURAI_GREAVE, greave]);
  const bootColor = tint(g, SAMURAI_SUNEATE_KIND, { red: [SAMURAI_GREAVE_TIE, tie], gold: [SAMURAI_BOOT_GOLD, bootGold] }, [SAMURAI_BOOT, boot]);
  const line = lineOf(SAMURAI_SUNEATE_KIND);
  const lineHex = Object.keys(SAMURAI_SUNEATE_KIND).filter((h) => SAMURAI_SUNEATE_KIND[h] === 'line');
  for (const s of SIDES) {
    const j = legJoints(g.rig, s);
    footOff(g, s);
    const shinDeg = segAngle(j.knee, j.ankle);
    const turn = footTurn(g, s);
    const foot = pick(s, SAMURAI_FOOT_N, SAMURAI_FOOT_F);
    const D = legDepth(s, 'feet');
    // the boot flat on the ground under the ankle (turned with the shin once the leg swings it off the ground),
    // the shin guard over it about the ankle along the shin, the knee guard over the shin's top about the knee
    stampPiece(g, D, foot, j.ankle, foot.angle + turn, `foot${s}` as PartId, bootColor, line);
    stampPiece(g, D, pick(s, SAMURAI_SHIN_N, SAMURAI_SHIN_F), j.ankle, shinDeg, `shin${s}` as PartId, color, line);
    stampPiece(g, legDepth(s, 'armor'), pick(s, SAMURAI_KNEE_N, SAMURAI_KNEE_F), j.knee, shinDeg, `shin${s}` as PartId, color, line);
    if (turn && lineHex.length) closeAnkle(g, s, j.ankle, g.m(lineHex[0], 'flat'), new Set(lineHex.map((h) => g.m(h, 'flat'))));
    // under his shin guard none of our shin shows
    if (wearsLegs(g)) partsOff(g, [legDepth(s, 'body')], [`shin${s}` as PartId]);
  }
}

// ---------------------------------------------------------------------------
// The cape and the hair
// ---------------------------------------------------------------------------

/** How far above the ground line his cape's hem hangs at rest (the male figure, idle). */
const CAPE_HEM_ABOVE_GROUND = GROUND * RES - (SAMURAI_CAPE_REST.SAMURAI_CAPE[1] + SAMURAI_CAPE.rows.length - 1);
const CAPE_EDGE = Object.keys(SAMURAI_CAPE.colors).find((ch) => SAMURAI_CAPE_KIND[SAMURAI_CAPE.colors[ch]] === 'line')!;

/** Where his cape hangs from, behind the near hip (our frame, at rest): it swings about this cell. */
const CAPE_TOP: [number, number] = [112, 182];
/** How far (degrees) his cape swings back for each design unit of the pose's wind (capes.ts capeWind), and the most. */
const CAPE_SWING = 2.4;
const CAPE_SWING_MAX = 32;
let CAPE_HUNG: PaintedPiece | undefined;

/**
 * His cape hung from behind the waist: it turns with the torso, and the pose's wind (the same as every
 * cape's: trailing in a run, flying back in a strike, swaying at rest) swings it back about where it hangs,
 * whole, so his folds stay his folds and it never comes apart; it never goes into the ground (crouched or
 * kneeling the cloth ends on the ground line on his line). Knocked out it lies along the back as the other
 * painted capes do (paintedBack). At rest every pixel is where he drew it.
 */
function drawCape(g: DrawCtx, c: string): void {
  const color = tint(g, SAMURAI_CAPE_KIND, {}, [SAMURAI_CAPE_RED, c]);
  const r = g.rig;
  if (r.lay) {
    paintedBack(g, SAMURAI_CAPE, CAPE_HEM_ABOVE_GROUND, CAPE_EDGE, color);
    return;
  }
  const home = samuraiRestRig(g.look);
  const t = segAngle(r.pelvis, r.neck) - segAngle(home.pelvis, home.neck);
  const w = capeWind(g);
  const swing = Math.max(-8, Math.min(CAPE_SWING_MAX, -w.dx * CAPE_SWING + w.wave));
  const [ox, oy] = SAMURAI_CAPE_REST.SAMURAI_CAPE;
  if (!CAPE_HUNG) CAPE_HUNG = { ...SAMURAI_CAPE, pivot: [CAPE_TOP[0] - ox, CAPE_TOP[1] - oy] };
  const rad = (t * Math.PI) / 180;
  const d = sub(v((CAPE_TOP[0] + 0.5) / RES, (CAPE_TOP[1] + 0.5) / RES), home.pelvis);
  const at = add(r.pelvis, v(d.x * Math.cos(rad) - d.y * Math.sin(rad), d.x * Math.sin(rad) + d.y * Math.cos(rad)));
  stampLeaning(g, 'capeBack', CAPE_HUNG, at, SAMURAI_CAPE.angle + t + swing, 'back', color, lineOf(SAMURAI_CAPE_KIND));
  // the edge he drew beside the far leg, only while the legs stand and the cape hangs as at rest (moved, it
  // is behind the leg)
  if (Math.abs(swing) < 3 && samuraiLegsStill(r, g.look)) {
    const [fx, fy] = SAMURAI_CAPE_REST.SAMURAI_CAPE_FAR;
    stampLeaning(g, 'capeBack', { ...SAMURAI_CAPE_FAR, pivot: [CAPE_TOP[0] - fx, CAPE_TOP[1] - fy] }, at, SAMURAI_CAPE.angle + t + swing, 'back', color, lineOf(SAMURAI_CAPE_KIND));
  }
  // the hem on the ground line
  const L = g.L('capeBack');
  const hemY = GROUND * RES - 1;
  const lineMat = g.m(SAMURAI_CAPE.colors[CAPE_EDGE], 'flat');
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

function drawHair(g: DrawCtx, hair: string, cord: string): void {
  const { nx, ny } = faceAnchor(g);
  const color = tint(g, SAMURAI_HAIR_KIND, { red: [SAMURAI_HAIR_CORD, cord] }, [SAMURAI_HAIR_BASE, hair]);
  // his locks as he drew them: no fraying of the hair layer's edge
  g.L('hairFront').noFray = true;
  stampPiece(g, 'hairFront', SAMURAI_HAIR, v((nx + 0.5) / RES, (ny + 0.5) / RES), SAMURAI_HAIR.angle, 'head', color);
}

export const SAMURAI_ITEMS: ItemDef[] = [
  {
    id: 'hair_samurai',
    slot: 'hair',
    name: 'Samurai Topknot',
    desc: 'Messy black hair over the brow and ears, gathered on the crown in a topknot tied with red cord.',
    colors: [{ key: 'hair', label: 'Hair', default: SAMURAI_HAIR_BASE, kind: 'hair' as const }, col('cord', 'Cord', SAMURAI_HAIR_CORD)],
    draw: (g, [hair, cord]) => drawHair(g, hair, cord),
  },
  {
    id: 'armor_samurai_do',
    slot: 'armor',
    name: 'Samurai Do',
    desc: 'Black lacquered lamellar armour laced in red, its top band patterned in gold, with big layered shoulder guards (+4 AC).',
    colors: [col('lacquer', 'Lacquer', SAMURAI_LACQUER, 'metal'), col('lacing', 'Lacing', SAMURAI_LACING), col('gold', 'Gold', SAMURAI_GOLD, 'metal')],
    statsArmor: 'Samurai O-Yoroi',
    bodies: [...MEN],
    draw: (g, [lacquer, lacing, gold]) => drawDo(g, lacquer, lacing, gold),
  },
  {
    id: 'hands_samurai',
    slot: 'hands',
    name: 'Samurai Sleeves',
    desc: 'Mail sleeves, armoured kote over the forearms tied with red cord, and fingerless gloves.',
    colors: [col('iron', 'Iron', SAMURAI_ARM_IRON, 'metal'), col('gold', 'Gold', SAMURAI_ARM_GOLD, 'metal'), col('cord', 'Cord', SAMURAI_ARM_CORD)],
    bodies: [...MEN],
    draw: (g, [iron, gold, cord]) => drawArms(g, iron, gold, cord),
  },
  {
    id: 'waist_samurai_obi',
    slot: 'waist',
    name: 'Samurai Obi',
    desc: 'A gold rope sash wound round the waist and knotted at the front.',
    colors: [col('main', 'Sash', SAMURAI_OBI_GOLD)],
    bodies: [...MEN],
    draw: (g, [main]) => {
      const r = g.rig;
      stampLeaning(g, 'waist', pinned(SAMURAI_OBI, SAMURAI_OBI_REST.SAMURAI_OBI, samuraiRestRig(g.look).pelvis, 'obi'), r.pelvis, segAngle(r.pelvis, r.neck), 'pelvis', tint(g, SAMURAI_OBI_KIND, {}, [SAMURAI_OBI_GOLD, main]), lineOf(SAMURAI_OBI_KIND));
    },
  },
  {
    id: 'skirt_samurai_kusazuri',
    slot: 'skirt',
    name: 'Samurai Kusazuri',
    desc: 'Layered lacquered tassets laced in red and rimmed in gold, hanging from the waist over the thighs.',
    colors: [col('lacquer', 'Lacquer', SAMURAI_TASSET_LACQUER, 'metal'), col('lacing', 'Lacing', SAMURAI_TASSET_LACING), col('gold', 'Gold', SAMURAI_TASSET_GOLD, 'metal')],
    bodies: [...MEN],
    draw: (g, [lacquer, lacing, gold]) => {
      const color = tint(g, SAMURAI_KUSAZURI_KIND, { red: [SAMURAI_TASSET_LACING, lacing], gold: [SAMURAI_TASSET_GOLD, gold] }, [SAMURAI_TASSET_LACQUER, lacquer]);
      const line = lineOf(SAMURAI_KUSAZURI_KIND);
      const depth = g.L('torso.over').used ? 'torso.over' : 'skirt';
      for (const t of tassetStamps(g)) stampLeaning(g, depth, t.piece, t.at, t.deg, 'pelvis', color, line);
      const lineHex = Object.keys(SAMURAI_KUSAZURI_KIND).find((h) => SAMURAI_KUSAZURI_KIND[h] === 'line')!;
      hemTassets(g, depth, g.m(lineHex, 'flat'));
      // where his panels part on the turn, a 1 px seam of his line (seal.ts; idle as drawn)
      sealCloth(g, [depth], true);
    },
  },
  {
    id: 'bottom_samurai_hakama',
    slot: 'bottom',
    name: 'Samurai Hakama',
    desc: 'Wide red hakama trousers, bloused over the knees.',
    colors: [col('main', 'Hakama', SAMURAI_HAKAMA)],
    bodies: [...MEN],
    draw: (g, [main]) => drawHakama(g, main),
  },
  {
    id: 'feet_samurai_suneate',
    slot: 'feet',
    name: 'Samurai Suneate',
    desc: 'Round knee guards, armoured shin guards tied in red, and dark sandal-boots with gold straps.',
    colors: [col('greave', 'Greaves', SAMURAI_GREAVE, 'metal'), col('tie', 'Ties', SAMURAI_GREAVE_TIE), col('boot', 'Boots', SAMURAI_BOOT, 'leather'), col('gold', 'Gold', SAMURAI_BOOT_GOLD, 'metal')],
    bodies: [...MEN],
    draw: (g, [greave, tie, boot, gold]) => drawSuneate(g, greave, tie, boot, gold),
  },
  {
    id: 'cape_samurai',
    slot: 'cape',
    name: 'Samurai Cape',
    desc: 'A red cape flowing back from behind the waist in long folds.',
    colors: [col('main', 'Cape', SAMURAI_CAPE_RED)],
    bodies: [...MEN],
    draw: (g, [c]) => drawCape(g, c),
  },
];
