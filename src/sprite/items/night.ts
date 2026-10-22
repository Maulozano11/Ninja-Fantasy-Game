// The owner's Ren (2026-10-21, "el nuevo estandar"): his paint-over of our Ren, lifted part by part out of
// docs/reference/ren-owner-reference.jpg by tools/refs/ren-*-from-ref.py, each part its own creator
// option: the jacket with his bare forearms, the belt, the studded skirt, the trousers and the boots. (His
// hair is in hair.ts, his head and eyes in body.ts, his gloves are the Fingerless Gloves in clothes.ts and
// his katana the Katana v2 in accessories.ts.) In our male idle every pixel is his; in other poses each
// piece follows its segment. His black line stays whatever the colours; his skin follows the
// character's skin; the rest follows the colour slots, his own colours when they are kept.

import { retintHex } from '../color';
import { armDepth, armJoints, DrawCtx, ItemDef, legDepth, legJoints, Side } from '../ctx';
import { type PaintedPiece, segAngle, skinTone, stampLeaning, stampPiece } from '../painted';
import { add, F_NO_OUTLINE, F_NO_TEXTURE, GRID, partIndex, PartId, RES, sub, v, Vec } from '../raster';
import { NIGHT_SKIN } from '../nightHeadArt';
import { NIGHT_BELT, NIGHT_BELT_BASE, NIGHT_BELT_KIND } from './nightBeltArt';
import { NIGHT_BOOT_FOOT_F, NIGHT_BOOT_FOOT_N, NIGHT_BOOT_GOLD, NIGHT_BOOT_SHIN_F, NIGHT_BOOT_SHIN_N, NIGHT_BOOT_SILVER, NIGHT_BOOTS, NIGHT_KIT_KIND } from './nightBootsGlovesArt';
import { NIGHT_CAST_FORE_F, NIGHT_CAST_FORE_N, NIGHT_CAST_KIND } from './nightCastArmsArt';
import { NIGHT_ARM_F, NIGHT_ARM_N, NIGHT_BUTTONS, NIGHT_JACKET, NIGHT_JACKET_BODY, NIGHT_JACKET_KIND, NIGHT_SLEEVE_F, NIGHT_SLEEVE_N } from './nightJacketArt';
import { NIGHT_SKIRT, NIGHT_SKIRT_BASE, NIGHT_SKIRT_KIND, NIGHT_STUDS } from './nightSkirtArt';
import { drawRig, GROUND, type Rig } from '../rig';
import { NIGHT_LEG_SHIFT, NIGHT_SHIN_F, NIGHT_SHIN_N, NIGHT_THIGH_F, NIGHT_THIGH_N, NIGHT_TROUSERS, NIGHT_TROUSERS_KIND } from './nightTrousersArt';

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });
const SIDES: Side[] = ['F', 'N'];
/** His pieces are cut to the male figure; the female bodies keep their own clothes (the owner, 2026-10-21). */
const MEN = ['male', 'bulky'] as const;

/**
 * His colours through the item's slots: his black line stays, his skin follows the character's skin, his
 * silver and gold follow theirs, the rest (his black cloth) follows the main colour.
 */
function nightColor(g: DrawCtx, kinds: Record<string, string>, main: [string, string], metal: Record<string, [string, string]> = {}) {
  return (_ch: string, hex: string): string => {
    const k = kinds[hex];
    if (k === 'line') return hex;
    if (k === 'skin') return skinTone(hex, NIGHT_SKIN, g.look.skin);
    const m = metal[k];
    if (m) return retintHex(hex, m[0], m[1]);
    return retintHex(hex, main[0], main[1]);
  };
}

/**
 * Takes our arm away above the hand: his sleeve and his bare forearm take its place (his are his own
 * shape and shading), so none of ours shows round them.
 */
function armOff(g: DrawCtx, s: Side): void {
  const parts = [partIndex(`forearm${s}` as PartId), partIndex(`upperArm${s}` as PartId)];
  const L = g.L(armDepth(s, 'body'));
  for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && parts.includes(L.part[i])) L.mat[i] = -1;
}

/**
 * Takes our torso away below the neck: his jacket is the torso (as his cuirass is on our Roman), so our
 * skin never shows past it, and the far sleeve he drew past the chest is not hidden behind ours.
 */
function torsoOff(g: DrawCtx): void {
  const r = g.rig;
  const torso = partIndex('torso');
  const neck = (r.neck.x - r.pelvis.x) * r.up.x + (r.neck.y - r.pelvis.y) * r.up.y;
  for (const d of ['torso.body', 'torso.under'] as const) {
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

/** Takes our bare foot away (his boot's foot takes its place); the shin stays. */
function footOff(g: DrawCtx, s: Side): void {
  const foot = partIndex(`foot${s}` as PartId);
  for (const d of [legDepth(s, 'body'), legDepth(s, 'cloth')]) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && L.part[i] === foot) L.mat[i] = -1;
  }
}

const arm = (s: Side, n: PaintedPiece, f: PaintedPiece) => (s === 'N' ? n : f);
/** His colours on the jacket's pieces, his cast forearms' too (ren.test.ts: each means the same in both). */
const JACKET_KINDS: Record<string, string> = { ...NIGHT_CAST_KIND, ...NIGHT_JACKET_KIND };

/**
 * His bare arm below the sleeve, cut where it bends: above the elbow it is the end of his upper arm (it
 * rides the upper arm with the sleeve), below it his forearm, and round the elbow the cells that sweep
 * the bend (ELBOW_R from the joint). The cut runs across the arm through the elbow, square to the
 * line halfway between his upper arm and his forearm.
 */
interface BareArm {
  upper: PaintedPiece;
  lower: PaintedPiece;
  elbow: PaintedPiece;
}
const ELBOW_R = 3;
/** The largest turn between two of the elbow's sweeps (degrees): the bend is filled without a gap. */
const ELBOW_STEP = 10;
const BARE_ARMS = new Map<PaintedPiece, BareArm>();
function bareArm(piece: PaintedPiece, upperAngle: number): BareArm {
  const hit = BARE_ARMS.get(piece);
  if (hit) return hit;
  const rad = (d: number) => (d * Math.PI) / 180;
  const nx = Math.cos(rad(piece.angle)) + Math.cos(rad(upperAngle));
  const ny = Math.sin(rad(piece.angle)) + Math.sin(rad(upperAngle));
  const [px, py] = piece.pivot;
  const cut = (keep: (dx: number, dy: number) => boolean): PaintedPiece => ({
    ...piece,
    rows: piece.rows.map((row, y) => [...row].map((ch, x) => (ch !== '.' && keep(x - px, y - py) ? ch : '.')).join('')),
  });
  const out = {
    upper: cut((dx, dy) => dx * nx + dy * ny < 0),
    lower: cut((dx, dy) => dx * nx + dy * ny >= 0),
    elbow: cut((dx, dy) => Math.hypot(dx, dy) <= ELBOW_R),
  };
  BARE_ARMS.set(piece, out);
  return out;
}

/** One of his pieces where an arm stamps it: about which joint, along which angle (stampPiece). */
export interface ArmStamp {
  piece: PaintedPiece;
  at: Vec;
  deg: number;
  part: PartId;
  /** Which of his pieces: the sleeve, the end of his upper arm, his forearm, or a sweep of his elbow. */
  name: 'sleeve' | 'upper' | 'fore' | 'elbow';
}

/**
 * His arm on our arm (the Night Jacket), back to front, every piece of it turned whole about our joints:
 * his sleeve and the end of his upper arm with the upper arm, his forearm with the forearm, and where
 * the elbow bends further than he drew it, his elbow swept through the angles between under both, so
 * the bend closes on his skin and his line as a bent arm does.
 */
export function nightArmStamps(r: Rig, s: Side): ArmStamp[] {
  const j = armJoints(r, s);
  const piece = arm(s, NIGHT_ARM_N, NIGHT_ARM_F);
  const sleeve = arm(s, NIGHT_SLEEVE_N, NIGHT_SLEEVE_F);
  const { upper, lower, elbow } = bareArm(piece, sleeve.angle);
  const fp = `forearm${s}` as PartId;
  if (r.pose === 'cast') {
    // Casting the runes he painted the arms himself (docs/reference/ren-cast-owner-reference.jpg): each
    // bare forearm his, from under the sleeve (the near one bent across the chest, the far one thick and
    // stretched at the runes), riding our forearm about the elbow, the sleeve over it as always.
    const cast = arm(s, NIGHT_CAST_FORE_N, NIGHT_CAST_FORE_F);
    return [
      { piece: cast, at: j.elbow, deg: segAngle(j.elbow, j.wrist), part: fp, name: 'fore' },
      { piece: sleeve, at: j.shoulder, deg: segAngle(j.shoulder, j.elbow), part: `upperArm${s}` as PartId, name: 'sleeve' },
    ];
  }
  const up = piece.angle + segAngle(j.shoulder, j.elbow) - sleeve.angle;
  const fore = segAngle(j.elbow, j.wrist);
  const bend = ((((fore - up + 180) % 360) + 360) % 360) - 180;
  const n = Math.ceil(Math.abs(bend) / ELBOW_STEP);
  const out: ArmStamp[] = [];
  for (let k = 1; k < n; k++) out.push({ piece: elbow, at: j.elbow, deg: up + (bend * k) / n, part: fp, name: 'elbow' });
  out.push({ piece: lower, at: j.elbow, deg: fore, part: fp, name: 'fore' });
  out.push({ piece: upper, at: j.elbow, deg: up, part: `upperArm${s}` as PartId, name: 'upper' });
  out.push({ piece: sleeve, at: j.shoulder, deg: segAngle(j.shoulder, j.elbow), part: `upperArm${s}` as PartId, name: 'sleeve' });
  return out;
}

/**
 * His skirt in panels, cut down his seams (columns of NIGHT_SKIRT): the broad panel over the near leg
 * (to his seam at column 15), the studded panel between the legs (to his seam at column 19) and the
 * panels over the far leg. Each lies on its thigh, or between both, down to the knee (SKIRT_KNEE_ROW)
 * and hangs from there (see nightSkirtStamps).
 */
const SKIRT_PANELS: { x0: number; x1: number; on: Side | 'both' }[] = [
  { x0: 20, x1: 33, on: 'F' },
  { x0: 16, x1: 19, on: 'both' },
  { x0: 0, x1: 15, on: 'N' },
];
/** How much a panel follows its thigh swung forward (all of it: it lies on the thigh), and swung back. */
const SKIRT_FORWARD = 1;
const SKIRT_BACK = 0.3;
/** How much of the thigh's turn the cloth below the knee keeps (it hangs, nearly straight down). */
const SKIRT_HANG = 0.25;
/** The rows round the knee swept through the bend, so the cloth folds there without a gap. */
const SKIRT_FOLD = 2;

/** A piece of his skirt where the skirt stamps it (stampLeaning). */
export interface SkirtStamp {
  piece: PaintedPiece;
  at: Vec;
  deg: number;
  name: 'upper' | 'lower' | 'fold' | 'sweep';
}

const SKIRT_CUTS = new Map<string, PaintedPiece>();
/** His skirt's cells in columns x0..x1 and rows y0..y1, turned about the cell `pivot`. */
function skirtCut(x0: number, x1: number, y0: number, y1: number, pivot: [number, number]): PaintedPiece {
  const key = [x0, x1, y0, y1, ...pivot].join(',');
  let p = SKIRT_CUTS.get(key);
  if (!p) {
    const rows = NIGHT_SKIRT.rows.map((row, y) => [...row].map((ch, x) => (x >= x0 && x <= x1 && y >= y0 && y <= y1 ? ch : '.')).join(''));
    SKIRT_CUTS.set(key, (p = { ...NIGHT_SKIRT, rows, pivot }));
  }
  return p;
}

/** A point `d` fine pixels from the fine pixel `at`, turned `deg`: as design units at that pixel's middle. */
function turned(at: [number, number], d: [number, number], deg: number): Vec {
  const t = (deg * Math.PI) / 180;
  const x = at[0] + Math.round(d[0] * Math.cos(t) - d[1] * Math.sin(t));
  const y = at[1] + Math.round(d[0] * Math.sin(t) + d[1] * Math.cos(t));
  return v((x + 0.5) / RES, (y + 0.5) / RES);
}

/**
 * His skirt as cloth, back to front: each panel turns with its thigh about the hip (the panel between
 * the legs halfway between both) down to the knee, lying on the thigh as it swings forward and only a
 * little as it swings back, and below the knee hangs nearly straight down from where the thigh panel
 * ends, his rows round the knee swept through the fold between. Every piece is his pixels, turned whole.
 * At rest, where his thighs are, every pixel is where he drew it. `shift` is where the legs stand from
 * our rig's (legShift).
 */
export function nightSkirtStamps(r: Rig, shift: Record<Side, Vec>): SkirtStamp[] {
  const rest = drawRig('male', 'idle', 0);
  const home = drawRig(r.body, 'idle', 0);
  // the skirt's first cell at rest (male idle) and his knee's row in it
  const ox = Math.floor(rest.pelvis.x * RES) - NIGHT_SKIRT.pivot[0];
  const oy = Math.floor(rest.pelvis.y * RES) - NIGHT_SKIRT.pivot[1];
  const cell = (p: Vec, d: Vec): [number, number] => [Math.floor((p.x + d.x) * RES) - ox, Math.floor((p.y + d.y) * RES) - oy];
  const knee = Math.round(Math.min(...(['N', 'F'] as Side[]).map((s) => cell(legJoints(rest, s).knee, shift[s])[1])));
  const thighTurn = (s: Side) => {
    const now = legJoints(r, s);
    const was = legJoints(home, s);
    const t = segAngle(now.hip, now.knee) - segAngle(was.hip, was.knee);
    const w = ((((t + 180) % 360) + 360) % 360) - 180;
    return w < 0 ? w * SKIRT_FORWARD : w * SKIRT_BACK;
  };
  const out: SkirtStamp[] = [];
  const last = NIGHT_SKIRT.rows.length - 1;
  const panel = (x0: number, x1: number, on: Side | 'both', turn: number, name?: 'sweep'): void => {
    // the panel turns about its hip (between the legs, about the pelvis), at our hip in this pose
    const pivot: [number, number] = on === 'both' ? [NIGHT_SKIRT.pivot[0], NIGHT_SKIRT.pivot[1]] : cell(legJoints(rest, on).hip, shift[on]);
    // (on another body the panels keep his spacing about its pelvis: a hip as far from it as his)
    const anchor = on === 'both' ? r.pelvis : add(add(legJoints(r, on).hip, shift[on]), sub(sub(legJoints(rest, on).hip, rest.pelvis), sub(legJoints(home, on).hip, home.pelvis)));
    const at: [number, number] = [Math.floor(anchor.x * RES), Math.floor(anchor.y * RES)];
    // where the thigh panel ends: the middle of its columns on the knee's row
    const hinge: [number, number] = [Math.round((x0 + x1) / 2), knee];
    const hingeAt = turned(at, [hinge[0] - pivot[0], hinge[1] - pivot[1]], turn);
    const hang = turn * SKIRT_HANG;
    const fold = hang - turn;
    const n = Math.ceil(Math.abs(fold) / 10);
    for (let k = 1; k < n; k++) out.push({ piece: skirtCut(x0, x1, knee - SKIRT_FOLD, knee + SKIRT_FOLD - 1, hinge), at: hingeAt, deg: NIGHT_SKIRT.angle + turn + (fold * k) / n, name: name ?? 'fold' });
    out.push({ piece: skirtCut(x0, x1, knee, last, hinge), at: hingeAt, deg: NIGHT_SKIRT.angle + hang, name: name ?? 'lower' });
    out.push({ piece: skirtCut(x0, x1, 0, knee - 1, pivot), at: v((at[0] + 0.5) / RES, (at[1] + 0.5) / RES), deg: NIGHT_SKIRT.angle + turn, name: name ?? 'upper' });
  };
  // The legs apart, the panel between them is swept from one thigh's turn to the other's behind the
  // others, so the cloth spans the gap between them as a skirt does (no gap opens down the seams).
  const [tN, tF] = [thighTurn('N'), thighTurn('F')];
  const mid = SKIRT_PANELS.find((p) => p.on === 'both')!;
  const m = Math.ceil(Math.abs(tN - tF) / 8);
  for (let k = 0; k <= m; k++) if (m > 1) panel(mid.x0, mid.x1, 'both', tF + ((tN - tF) * k) / m, 'sweep');
  for (const { x0, x1, on } of SKIRT_PANELS) panel(x0, x1, on, on === 'both' ? (tN + tF) / 2 : on === 'N' ? tN : tF);
  return out;
}
/**
 * His skirt never goes into the ground: crouched or kneeling, the cloth that would reach below the soles
 * lies on the ground, so it ends on the ground line on his black line (his panels above stay as he drew
 * them). Knocked out (drawn upright, then laid down) it is left whole.
 */
function hemSkirt(g: DrawCtx, depth: 'skirt' | 'torso.over'): void {
  if (g.rig.lay) return;
  const L = g.L(depth);
  const hemY = GROUND * RES - 1;
  const pelvis = partIndex('pelvis');
  const line = g.m(NIGHT_SKIRT.colors[Object.keys(NIGHT_SKIRT.colors).find((ch) => NIGHT_SKIRT_KIND[NIGHT_SKIRT.colors[ch]] === 'line')!], 'flat');
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

/**
 * His legs stand a little apart from our rig's (his near leg 5 px further back, his far one 5 px lower:
 * NIGHT_LEG_SHIFT). Worn together, his trousers and boots are his legs: each leg hangs from our hip, knee
 * and ankle moved that far (the whole leg, so every pose keeps it whole), and at rest they are where he
 * drew them. Worn with other trousers or footwear, each sits on our leg, so it meets them.
 */
function legShift(g: DrawCtx, s: Side): Vec {
  if (!g.has('bottom', 'bottom_night_trousers') || !g.has('feet', 'feet_night_boots')) return v(0, 0);
  const [dx, dy] = NIGHT_LEG_SHIFT[s];
  return v(dx / RES, dy / RES);
}

/** Takes our leg away (his trousers and boots are the leg, standing where he drew it). */
function legOff(g: DrawCtx, s: Side): void {
  const parts = [`thigh${s}`, `shin${s}`, `foot${s}`].map((p) => partIndex(p as PartId));
  for (const d of [legDepth(s, 'body'), legDepth(s, 'cloth')]) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && parts.includes(L.part[i])) L.mat[i] = -1;
  }
}

export const NIGHT_ITEMS: ItemDef[] = [
  {
    id: 'top_night_jacket',
    slot: 'top',
    name: 'Night Jacket',
    desc: 'A black jacket with a high collar and short sleeves, closed beside a seam with silver buttons; the forearms bare.',
    colors: [col('main', 'Jacket', NIGHT_JACKET), col('buttons', 'Buttons', NIGHT_BUTTONS, 'metal')],
    bodies: [...MEN],
    draw: (g, [main, buttons]) => {
      // His jacket: the body rides the torso about the neck, each sleeve its upper arm about the
      // shoulder, each bare arm (his skin shading) the upper arm and the forearm about the elbow
      // (nightArmStamps), in place of ours.
      const r = g.rig;
      const tint = nightColor(g, JACKET_KINDS, [NIGHT_JACKET, main], { silver: [NIGHT_BUTTONS, buttons] });
      torsoOff(g);
      for (const s of SIDES) {
        armOff(g, s);
        for (const t of nightArmStamps(r, s)) stampPiece(g, armDepth(s, t.name === 'sleeve' ? 'cloth' : 'body'), t.piece, t.at, t.deg, t.part, tint);
      }
      stampLeaning(g, 'torso.top', NIGHT_JACKET_BODY, r.neck, segAngle(r.pelvis, r.neck), 'torso', tint);
    },
  },
  {
    id: 'waist_night_belt',
    slot: 'waist',
    name: 'Night Belt',
    desc: 'A broad black belt round the waist.',
    colors: [col('main', 'Belt', NIGHT_BELT_BASE, 'leather')],
    bodies: [...MEN],
    draw: (g, [main]) => {
      const r = g.rig;
      stampLeaning(g, 'waist', NIGHT_BELT, r.pelvis, segAngle(r.pelvis, r.neck), 'pelvis', nightColor(g, NIGHT_BELT_KIND, [NIGHT_BELT_BASE, main]));
    },
  },
  {
    id: 'skirt_night_studded',
    slot: 'skirt',
    name: 'Studded Night Skirt',
    desc: 'A long skirt of black panels from the belt to below the knees, silver studs down the panels, slits between them.',
    colors: [col('main', 'Skirt', NIGHT_SKIRT_BASE), col('studs', 'Studs', NIGHT_STUDS, 'metal')],
    bodies: [...MEN],
    draw: (g, [main, studs]) => {
      // His skirt hangs from the waist, over a coat's tails when one is worn: its panels lie on the
      // thighs to the knees and hang from there (nightSkirtStamps).
      const tint = nightColor(g, NIGHT_SKIRT_KIND, [NIGHT_SKIRT_BASE, main], { silver: [NIGHT_STUDS, studs] });
      const depth = g.L('torso.over').used ? 'torso.over' : 'skirt';
      for (const t of nightSkirtStamps(g.rig, { N: legShift(g, 'N'), F: legShift(g, 'F') })) stampLeaning(g, depth, t.piece, t.at, t.deg, 'pelvis', tint);
      hemSkirt(g, depth);
    },
  },
  {
    id: 'bottom_night_trousers',
    slot: 'bottom',
    name: 'Night Trousers',
    desc: 'Baggy blue-black trousers tucked into the boots.',
    colors: [col('main', 'Trousers', NIGHT_TROUSERS)],
    bodies: [...MEN],
    draw: (g, [main]) => {
      // His trousers on each leg: the thigh turns about the hip, the shin about the knee.
      const tint = nightColor(g, NIGHT_TROUSERS_KIND, [NIGHT_TROUSERS, main]);
      for (const s of SIDES) {
        const d = legShift(g, s);
        if (d.x || d.y) legOff(g, s);
        const j = legJoints(g.rig, s);
        const [hip, knee, ankle] = [j.hip, j.knee, j.ankle].map((p) => add(p, d));
        const L = legDepth(s, 'cloth');
        stampPiece(g, L, s === 'N' ? NIGHT_THIGH_N : NIGHT_THIGH_F, hip, segAngle(hip, knee), `thigh${s}` as PartId, tint);
        stampPiece(g, L, s === 'N' ? NIGHT_SHIN_N : NIGHT_SHIN_F, knee, segAngle(knee, ankle), `shin${s}` as PartId, tint);
      }
    },
  },
  {
    id: 'feet_night_boots',
    slot: 'feet',
    name: 'Night Boots',
    desc: 'Black boots with a band of silver and gold at the top and a gold-buckled strap over the foot.',
    colors: [col('main', 'Leather', NIGHT_BOOTS, 'leather'), col('gold', 'Gold', NIGHT_BOOT_GOLD, 'metal'), col('silver', 'Silver', NIGHT_BOOT_SILVER, 'metal')],
    draw: (g, [main, gold, silver]) => {
      // His boots: on each leg the shaft turns with the shin about the ankle and the foot stays flat on
      // the ground like our feet, our bare foot under it taken away.
      const tint = nightColor(g, NIGHT_KIT_KIND, [NIGHT_BOOTS, main], { gold: [NIGHT_BOOT_GOLD, gold], silver: [NIGHT_BOOT_SILVER, silver] });
      for (const s of SIDES) {
        const d = legShift(g, s);
        const j = legJoints(g.rig, s);
        const [knee, ankle] = [j.knee, j.ankle].map((p) => add(p, d));
        footOff(g, s);
        const shin = s === 'N' ? NIGHT_BOOT_SHIN_N : NIGHT_BOOT_SHIN_F;
        const foot = s === 'N' ? NIGHT_BOOT_FOOT_N : NIGHT_BOOT_FOOT_F;
        stampPiece(g, legDepth(s, 'feet'), shin, ankle, segAngle(knee, ankle), `shin${s}` as PartId, tint);
        stampPiece(g, legDepth(s, 'feet'), foot, ankle, foot.angle, `foot${s}` as PartId, tint);
      }
    },
  },
];
