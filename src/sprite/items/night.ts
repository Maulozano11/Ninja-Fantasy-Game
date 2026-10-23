// The owner's Ren (2026-10-21, "el nuevo estandar"): his paint-over of our Ren, lifted part by part out of
// docs/reference/ren-owner-reference.jpg by tools/refs/ren-*-from-ref.py, each part its own creator
// option: the jacket with his bare forearms, the belt, the studded skirt, the trousers and the boots. (His
// hair is in hair.ts, his head and eyes in body.ts, his gloves are the Fingerless Gloves in clothes.ts and
// his katana the Katana v2 in accessories.ts.) In our male idle every pixel is his; in other poses each
// piece follows its segment. His black line stays whatever the colours; his skin follows the
// character's skin; the rest follows the colour slots, his own colours when they are kept.

import { retintHex } from '../color';
import { armDepth, armJoints, armReaches, type Depth, DrawCtx, ItemDef, legDepth, legJoints, Side } from '../ctx';
import { type PaintedPiece, segAngle, skinTone, stampLeaning, stampPiece, stretchPiece } from '../painted';
import { add, F_NO_OUTLINE, F_NO_TEXTURE, GRID, type Layer, partIndex, PartId, PARTS, RES, sub, v, Vec } from '../raster';
import { NIGHT_SKIN } from '../nightHeadArt';
import { isFemaleBody } from '../types';
import { sealCloth } from '../seal';
import { closeAnkle, footTurn } from './ankle';
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
  // With the head turned forward (the throw's release, Rig.neckPitch) our neck stays (body.ts draws it
  // from the neck joint to under the head): its foot dips below the cut and left background under his
  // chin. Every other pose is cut as before.
  const top = v(r.head.x + 0.4 * g.bp.headScale, r.head.y + 4 * g.bp.headScale);
  const onNeck = (p: Vec): boolean => {
    const d = sub(top, r.neck);
    const t = Math.max(0, Math.min(1, ((p.x - r.neck.x) * d.x + (p.y - r.neck.y) * d.y) / (d.x * d.x + d.y * d.y)));
    return Math.hypot(p.x - r.neck.x - t * d.x, p.y - r.neck.y - t * d.y) <= g.bp.neckW;
  };
  for (const d of ['torso.body', 'torso.under'] as const) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || L.part[i] !== torso) continue;
      const p = v(((i % GRID) + 0.5) / RES, (Math.floor(i / GRID) + 0.5) / RES);
      const x = p.x - r.pelvis.x;
      const y = p.y - r.pelvis.y;
      if (x * r.up.x + y * r.up.y <= neck && !(r.neckPitch !== undefined && d === 'torso.body' && onNeck(p))) L.mat[i] = -1;
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

/**
 * On the women's bodies, his painted bare legs (body.ts drawBaseBody), the leg ends at his boot's top: none of
 * its skin shows beside the shaft further down the shin than the boot's top, where the leg is wider than the
 * shaft at a slant (the throw's release).
 */
function shinUnderBootOff(g: DrawCtx, s: Side, knee: Vec, ankle: Vec): void {
  const shin = partIndex(`shin${s}` as PartId);
  const len = Math.hypot(ankle.x - knee.x, ankle.y - knee.y);
  const [ux, uy] = [(ankle.x - knee.x) / len, (ankle.y - knee.y) / len];
  const down = (i: number) => (((i % GRID) + 0.5) / RES - knee.x) * ux + ((Math.floor(i / GRID) + 0.5) / RES - knee.y) * uy;
  const boot = g.L(legDepth(s, 'feet'));
  let top = Infinity;
  for (let i = 0; i < GRID * GRID; i++) if (boot.mat[i] >= 0 && boot.part[i] === shin) top = Math.min(top, down(i));
  if (!Number.isFinite(top)) return;
  const L = g.L(legDepth(s, 'body'));
  for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && L.part[i] === shin && boot.mat[i] < 0 && down(i) > top + 1 / RES) L.mat[i] = -1;
}

/** How far round the knee (fine px) the trouser leg is closed where it bends (closeKnee). */
const KNEE_R = 7;

/**
 * His trouser leg closed round a knee bent further than he drew it (seated: the owner's Roman sit and his
 * Trunks read lift the knees clear of the skirt). His thigh and shin pieces end in the tapers he drew under
 * the skirt, so bent that far the two ends part on the outside of the knee and the shin's top stands out as a
 * spike. Round the knee the leg is filled out to the hull of the two pieces: with his trousers' cloth (the
 * cloth colour most of the leg there has), his line along the new edge.
 */
function closeKnee(g: DrawCtx, s: Side, depth: Depth, knee: Vec, tint: (ch: string, hex: string) => string): void {
  const L = g.L(depth);
  const ids = new Set([partIndex(`thigh${s}` as PartId), partIndex(`shin${s}` as PartId)]);
  const kx = knee.x * RES;
  const ky = knee.y * RES;
  const near = (x: number, y: number) => Math.hypot(x + 0.5 - kx, y + 0.5 - ky) <= KNEE_R;
  const pts: [number, number][] = [];
  const count = new Map<number, number>();
  const lines = new Set(Object.entries(NIGHT_TROUSERS_KIND).filter(([, k]) => k === 'line').map(([hex]) => g.m(tint('', hex), 'flat')));
  for (let y = Math.floor(ky - KNEE_R); y <= ky + KNEE_R; y++)
    for (let x = Math.floor(kx - KNEE_R); x <= kx + KNEE_R; x++) {
      if (!near(x, y) || !L.has(x, y)) continue;
      const i = y * GRID + x;
      if (L.mat[i] < 0 || !ids.has(L.part[i])) continue;
      pts.push([x, y]);
      if (!lines.has(L.mat[i])) count.set(L.mat[i], (count.get(L.mat[i]) ?? 0) + 1);
    }
  if (pts.length < 3 || !count.size) return;
  const cloth = [...count].sort((a, b) => b[1] - a[1])[0][0];
  const line = g.m(tint('', '#010312'), 'flat');
  // The hull of the leg's pixels round the knee (Andrew's monotone chain), counter-clockwise.
  const sorted = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: [number, number][]) => {
    const h: [number, number][] = [];
    for (const p of list) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
      h.push(p);
    }
    return h.slice(0, -1);
  };
  const hull = [...half(sorted), ...half([...sorted].reverse())];
  if (hull.length < 3) return;
  const inside = (x: number, y: number) => hull.every((a, k) => cross(a, hull[(k + 1) % hull.length], [x, y]) >= 0);
  const filled: number[] = [];
  for (let y = Math.floor(ky - KNEE_R); y <= ky + KNEE_R; y++)
    for (let x = Math.floor(kx - KNEE_R); x <= kx + KNEE_R; x++) {
      if (x < 1 || y < 1 || x >= GRID - 1 || y >= GRID - 1 || !near(x, y) || L.mat[y * GRID + x] >= 0 || !inside(x, y)) continue;
      L.set(x, y, cloth, 3, `shin${s}` as PartId, F_NO_TEXTURE | F_NO_OUTLINE);
      filled.push(y * GRID + x);
    }
  // His line along the new edge: a filled pixel beside the outside takes it.
  for (const i of filled) if ([i - 1, i + 1, i - GRID, i + GRID].some((j) => L.mat[j] < 0)) L.mat[i] = line;
}

const arm = (s: Side, n: PaintedPiece, f: PaintedPiece) => (s === 'N' ? n : f);
/** His black line in his skirt's colours: turned past a shear, his line stays whole round each panel (rotateLined). */
const skirtLine = (hex: string) => NIGHT_SKIRT_KIND[hex] === 'line';

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

/** His far casting forearm's length, elbow to wrist (fine pixels): our male rig's in 'cast' frame 0, where he painted it. */
const CAST_FORE_LEN = (() => {
  const r = drawRig('male', 'cast', 0);
  return Math.hypot(r.wristF.x - r.elbowF.x, r.wristF.y - r.elbowF.y) * RES;
})();
let CAST_WRIST: PaintedPiece | undefined;
/** The wrist half of his far casting forearm (its cells CAST_WRIST_FROM or more along the bone from the elbow). */
const CAST_WRIST_FROM = 4;
function castWristEnd(): PaintedPiece {
  if (CAST_WRIST) return CAST_WRIST;
  const p = NIGHT_CAST_FORE_F;
  const a = (p.angle * Math.PI) / 180;
  const rows = p.rows.map((row, y) => [...row].map((ch, x) => ((x + 0.5 - p.pivot[0]) * Math.cos(a) + (y + 0.5 - p.pivot[1]) * Math.sin(a) >= CAST_WRIST_FROM ? ch : '.')).join(''));
  return (CAST_WRIST = { ...p, rows });
}

/**
 * Seated ('sit'), his far arm reaches forward as it reaches out to aim the throw: his casting forearm, whatever
 * the body's arm bends, and his glove on our hand at its end. The owner, on the open palm tried there first: "intenta
 * copiar ese brazo extendido izquierdo de antes para la pose de sentado la que tiene ahora se ve muy flaca y rara".
 */
export const sitsReachingOut = (r: Rig, s: Side): boolean => r.pose === 'sit' && s === 'F';

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
  // His far arm reaching out in any pose (the combo's cross, the throw's pointing arm, every cast style, the sit)
  // is his casting forearm, the 8 rows he settled on: his idle far forearm, hanging in shadow, reads thin
  // stretched out (the owner: "su antebrazo izquierdo en el combo se ve aun flaco pon como el antebrazo del
  // modelo de lanzar jutsu"; ctx.ts FOREARM_RULE).
  if (r.pose === 'cast' || (s === 'F' && (armReaches(r, s) || sitsReachingOut(r, s)))) {
    // Casting the runes he painted the arms himself (docs/reference/ren-cast-owner-reference.jpg): each
    // bare forearm his, from under the sleeve (the near one bent across the chest, the far one thick and
    // stretched at the runes), riding our forearm about the elbow, the sleeve over it as always.
    const cast = arm(s, NIGHT_CAST_FORE_N, NIGHT_CAST_FORE_F);
    const deg = segAngle(j.elbow, j.wrist);
    const out: ArmStamp[] = [{ piece: cast, at: j.elbow, deg, part: fp, name: 'fore' }];
    // Off the cast (where his own fist covers the wrist) a forearm longer than the male one he painted (the
    // bulky body) has his wrist end carried on along the bone to our wrist, so no gap opens before the glove.
    const extra = Math.hypot(j.wrist.x - j.elbow.x, j.wrist.y - j.elbow.y) * RES - CAST_FORE_LEN;
    if (r.pose !== 'cast' && s === 'F' && extra > 0) {
      const d = Math.ceil(extra) / RES;
      const a = (deg * Math.PI) / 180;
      out.push({ piece: castWristEnd(), at: add(j.elbow, v(Math.cos(a) * d, Math.sin(a) * d)), deg, part: fp, name: 'fore' });
    }
    out.push({ piece: sleeve, at: j.shoulder, deg: segAngle(j.shoulder, j.elbow), part: `upperArm${s}` as PartId, name: 'sleeve' });
    return out;
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

/** The most rows a bump or a notch on the hip's edge spans (longer ones are the cloth's shape). */
const EDGE_BUMP = 2;
/** The most pixels a bump or a notch on the hip's edge stands out or bites in. */
const EDGE_DEPTH = 2;
/** The widest strip of a thigh behind the skirt's back edge the panel is laid over (wider, the leg comes out from under it). */
const SLIVER = 5;
/** His line is the near-black of his outlines (luma about 2); his darkest cloth is about 9. */
const LINE_LUMA = 6;

/** Luma of what a layer has at pixel i. */
function lumaAt(g: DrawCtx, L: Layer, i: number): number {
  const n = parseInt(g.mats.ramps[L.mat[i]][L.shade[i]].slice(1), 16);
  return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11;
}

/**
 * The back of his skirt over a thigh swung back (the owner, 2026-10-22: "pixeles fuera de forma y con
 * formas de escalon o morgulladas en la cadera izquierda"). His panels turn with the thighs about the
 * hips, but only part of the way back (SKIRT_BACK), so a thigh swung back showed behind the panel's back
 * edge as a strip a few pixels wide with its own outline and steps beside his. Where that strip is up to
 * SLIVER pixels wide the panel is laid over it: his panel's first columns carried out to the thigh's own
 * edge, his line outside, so the back is one slope (a wider leg, coming out from under the skirt, shows
 * as it is). Idle is left as drawn: there every pixel is his.
 */
function skirtOverThigh(g: DrawCtx, depth: 'skirt' | 'torso.over'): void {
  if (g.rig.pose === 'idle' || g.rig.lay) return;
  const L = g.L(depth);
  const pelvis = partIndex('pelvis');
  const sk = (x: number, y: number) => x >= 0 && x < GRID && L.mat[y * GRID + x] >= 0 && L.part[y * GRID + x] === pelvis;
  const thighs = SIDES.flatMap((s) => [legDepth(s, 'body'), legDepth(s, 'cloth')].map((d) => ({ T: g.L(d), part: partIndex(`thigh${s}` as PartId) })));
  const thighAt = (x: number, y: number) => x >= 0 && thighs.some(({ T, part }) => T.used && T.mat[y * GRID + x] >= 0 && T.part[y * GRID + x] === part);
  const copy = (x: number, y: number, fx: number) => {
    const j = y * GRID + fx;
    L.set(x, y, L.mat[j], L.shade[j], 'pelvis', L.flags[j]);
  };
  for (let y = 0; y < GRID; y++) {
    let e = 0;
    while (e < GRID && !sk(e, y)) e++;
    if (e === GRID) continue;
    let t = e;
    while (thighAt(t - 1, y)) t--;
    const w = e - t;
    if (w < 1 || w > SLIVER) continue;
    for (let x = e - 1; x >= t; x--) copy(x, y, x + w);
    // his line on the new edge; his line that was the edge is inside the panel now: it takes the cloth beside it
    if (lumaAt(g, L, y * GRID + t) >= LINE_LUMA) L.set(t, y, g.m(NIGHT_SKIRT.colors.a, 'flat'), 3, 'pelvis', F_NO_TEXTURE | F_NO_OUTLINE);
    const i = y * GRID + e;
    if (lumaAt(g, L, i) < LINE_LUMA && sk(e + 1, y) && lumaAt(g, L, i + 1) >= LINE_LUMA) copy(e, y, e + 1);
  }
}

/**
 * His hip's two edges, the skirt's with the belt, the jacket's hem above it and a thigh beside it (the owner's "formas de
 * escalon o morgulladas en la cadera izquierda"). His skirt's panels, its fold and hang, the belt and the
 * jacket each turn whole on their own joint, so where they meet down the edge it went in and out a pixel
 * or two a row: a stair, a chewed edge, a notch between the belt and the top of the skirt. Away from rest,
 * down the back edge and the front one, a bump of up to EDGE_BUMP rows standing out up to EDGE_DEPTH
 * pixels is cut back to the rows round it, and a notch as small is filled from them (his pixels above or
 * below, each in its own layer, so his line closes it), until the edge only steps one way between longer
 * runs; the outermost pixel of each row is then his line, 1 px (a line left inside a filled notch takes
 * the cloth beside it). Idle is left as drawn: there every pixel is his.
 */
function smoothHip(g: DrawCtx): void {
  if (g.rig.pose === 'idle' || g.rig.lay) return;
  const pelvis = partIndex('pelvis');
  const skirt = g.L(g.L('torso.over').used ? 'torso.over' : 'skirt');
  // Front to back, what the edge is made of: his cloth (the belt and the skirt, the pelvis's; the jacket,
  // the torso's: not a sheath at the belt) and, behind it, the thighs (his trousers or the leg): what shows
  // of a thigh beside the skirt is the same edge, and what a cut would bare of a thigh goes with it.
  const torsoPart = partIndex('torso');
  const own = (parts: number[]) => (L: Layer, i: number) => L.mat[i] >= 0 && parts.includes(L.part[i]);
  const Ls = [
    ...[g.L('waist'), skirt, g.L('torso.top'), g.L('torso.under')].map((L) => ({ L, ok: own([pelvis, torsoPart]) })),
    ...(['N', 'F'] as Side[]).flatMap((s) => [legDepth(s, 'cloth'), legDepth(s, 'body')].map((d) => ({ L: g.L(d), ok: own([partIndex(`thigh${s}` as PartId)]) }))),
  ].filter(({ L }) => L.used);
  const top = (x: number, y: number): Layer | undefined => (x < 0 || y < 0 || x >= GRID || y >= GRID ? undefined : Ls.find(({ L, ok }) => ok(L, y * GRID + x))?.L);
  const on = (x: number, y: number) => !!top(x, y);
  const isLine = (x: number, y: number) => {
    const L = top(x, y);
    return !!L && lumaAt(g, L, y * GRID + x) < LINE_LUMA;
  };
  const lineMat = g.m(NIGHT_SKIRT.colors.a, 'flat');
  // the rows of the belt and the skirt (the pelvis's)
  let y0 = GRID;
  let y1 = -1;
  for (const L of [g.L('waist'), skirt])
    for (let i = 0; i < GRID * GRID; i++)
      if (L.mat[i] >= 0 && L.part[i] === pelvis) {
        y0 = Math.min(y0, (i / GRID) | 0);
        y1 = Math.max(y1, (i / GRID) | 0);
      }
  if (y1 < 0) return;
  const copy = (x: number, y: number, fx: number, fy: number) => {
    const L = top(fx, fy)!;
    const j = fy * GRID + fx;
    L.set(x, y, L.mat[j], L.shade[j], PARTS[L.part[j]], L.flags[j]);
  };
  const clear = (x: number, y: number) => {
    for (const { L, ok } of Ls) if (ok(L, y * GRID + x)) L.clear(x, y);
  };
  const setLine = (x: number, y: number) => {
    const L = top(x, y)!;
    L.set(x, y, lineMat, 3, PARTS[L.part[y * GRID + x]], F_NO_TEXTURE | F_NO_OUTLINE);
  };
  // In u the edge is the smallest: u = x down the back, the mirror of x down the front.
  for (const dir of [1, -1]) {
    const X = (u: number) => (dir > 0 ? u : GRID - 1 - u);
    const edge = (y: number): number => {
      for (let u = 0; u < GRID; u++) if (on(X(u), y)) return u;
      return -1;
    };
    for (let round = 0; round < 64; round++) {
      let changed = false;
      const E = Array.from({ length: y1 - y0 + 1 }, (_, k) => edge(y0 + k));
      for (let k = 1; k + 1 < E.length && !changed; k++) {
        for (let h = 1; h <= EDGE_BUMP && k + h < E.length && !changed; h++) {
          const run = E.slice(k, k + h);
          if (run.some((e) => e < 0 || e !== run[0]) || E[k - 1] < 0 || E[k + h] < 0) continue;
          const a = E[k - 1];
          const b = E[k + h];
          const e = run[0];
          if (e < a && e < b && Math.min(a, b) - e <= EDGE_DEPTH) {
            // a bump: cut back to the nearer of the rows round it, his line on the new edge
            const to = Math.min(a, b);
            for (let r = 0; r < h; r++) {
              const y = y0 + k + r;
              for (let u = e; u < to; u++) clear(X(u), y);
              if (on(X(to), y) && !isLine(X(to), y)) setLine(X(to), y);
            }
            changed = true;
          } else if (e > a && e > b && e - Math.max(a, b) <= EDGE_DEPTH) {
            // a notch: filled from the rows round it at each column (his line and his cloth go on down)
            const to = Math.max(a, b);
            for (let r = 0; r < h; r++) {
              const y = y0 + k + r;
              for (let u = to; u < e; u++) copy(X(u), y, X(u), on(X(u), y0 + k - 1) ? y0 + k - 1 : y0 + k + h);
              // his line that was the edge is inside now: it takes the cloth beside it
              if (isLine(X(e), y) && isLine(X(e - 1), y) && on(X(e + 1), y) && !isLine(X(e + 1), y)) copy(X(e), y, X(e + 1), y);
            }
            changed = true;
          }
        }
      }
      if (!changed) break;
    }
    // the outermost pixel of each row is his line
    for (let y = y0; y <= y1; y++) {
      const e = edge(y);
      if (e >= 0 && !isLine(X(e), y)) setLine(X(e), y);
    }
  }
}

/** His hip's edges smoothed, then the skirt laid over what a cut left of a thigh beside it. */
function hipEdges(g: DrawCtx): void {
  smoothHip(g);
  skirtOverThigh(g, g.L('torso.over').used ? 'torso.over' : 'skirt');
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
      const torso = segAngle(r.pelvis, r.neck);
      stampLeaning(g, 'torso.top', NIGHT_JACKET_BODY, r.neck, torso, 'torso', tint);
      // His jacket is cut to the male chest. A broader body's shoulders stand further out than his (the
      // bulky far shoulder 2 px), so with the far arm raised its sleeve came off the chest with a gap of
      // background between: under his jacket the same jacket again, moved out to each of this body's
      // shoulders as far as they stand past his, so its sides reach the sleeves (his pixels, his line).
      if (r.body !== 'male') {
        const rest = drawRig('male', 'idle', 0);
        const home = drawRig(r.body, 'idle', 0);
        const t = ((torso - segAngle(home.pelvis, home.neck)) * Math.PI) / 180;
        for (const s of SIDES) {
          const sh = (q: Rig) => (s === 'N' ? q.shoulderN : q.shoulderF);
          const d = sub(sub(sh(home), home.neck), sub(sh(rest), rest.neck));
          const at = add(r.neck, v(d.x * Math.cos(t) - d.y * Math.sin(t), d.x * Math.sin(t) + d.y * Math.cos(t)));
          stampLeaning(g, 'torso.under', NIGHT_JACKET_BODY, at, torso, 'torso', tint);
        }
      }
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
      // his skirt's and belt's edges at the hip, one slope each way (the skirt's draw does it without the belt)
      if (g.has('skirt', 'skirt_night_studded')) hipEdges(g);
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
      for (const t of nightSkirtStamps(g.rig, { N: legShift(g, 'N'), F: legShift(g, 'F') })) stampLeaning(g, depth, t.piece, t.at, t.deg, 'pelvis', tint, skirtLine);
      hemSkirt(g, depth);
      skirtOverThigh(g, depth);
      // the hip's edges are smoothed once the belt is on, if he wears his (its draw does it)
      if (!g.has('waist', 'waist_night_belt')) hipEdges(g);
      // Where his panels part on the turn a slit of background opens between them (the owner's "pixeles
      // blancos muertos"): sealed as the Roman skirt is, a 1 px seam of his line (seal.ts; idle as drawn).
      sealCloth(g, [depth], true);
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
        // A thigh longer than the body's (seated: rig.ts kneeLeg, the owner's Roman sit and Trunks read) takes his
        // trouser leg lengthened with it (stretchPiece: his rows repeated), so it still reaches the knee.
        const extra = (Math.hypot(knee.x - hip.x, knee.y - hip.y) - g.rig.bp.thigh) * RES;
        const thigh = s === 'N' ? NIGHT_THIGH_N : NIGHT_THIGH_F;
        stampPiece(g, L, extra > 1e-6 ? stretchPiece(thigh, extra, g.rig.bp.thigh * RES) : thigh, hip, segAngle(hip, knee), `thigh${s}` as PartId, tint);
        stampPiece(g, L, s === 'N' ? NIGHT_SHIN_N : NIGHT_SHIN_F, knee, segAngle(knee, ankle), `shin${s}` as PartId, tint);
        if (extra > 1e-6) closeKnee(g, s, L, knee, tint);
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
      // the ground like our feet, our bare foot under it taken away. Lifted well off the ground (a kick, the
      // run's back leg, a knee raised) the foot turns with the shaft, as he drew them as one, and his line
      // closes the ankle where the two part (items/ankle.ts, the rule Solen's sandals follow); standing,
      // it stays flat, so at rest every pixel is his.
      const tint = nightColor(g, NIGHT_KIT_KIND, [NIGHT_BOOTS, main], { gold: [NIGHT_BOOT_GOLD, gold], silver: [NIGHT_BOOT_SILVER, silver] });
      for (const s of SIDES) {
        const d = legShift(g, s);
        const j = legJoints(g.rig, s);
        const [knee, ankle] = [j.knee, j.ankle].map((p) => add(p, d));
        footOff(g, s);
        const shin = s === 'N' ? NIGHT_BOOT_SHIN_N : NIGHT_BOOT_SHIN_F;
        const foot = s === 'N' ? NIGHT_BOOT_FOOT_N : NIGHT_BOOT_FOOT_F;
        const turn = footTurn(g, s);
        stampPiece(g, legDepth(s, 'feet'), shin, ankle, segAngle(knee, ankle), `shin${s}` as PartId, tint);
        stampPiece(g, legDepth(s, 'feet'), foot, ankle, foot.angle + turn, `foot${s}` as PartId, tint);
        if (isFemaleBody(g.rig.body)) shinUnderBootOff(g, s, knee, ankle);
        if (turn) {
          const lineHex = [...Object.values(shin.colors), ...Object.values(foot.colors)].filter((hex) => NIGHT_KIT_KIND[hex] === 'line');
          if (lineHex.length) closeAnkle(g, s, ankle, g.m(lineHex[0], 'flat'), new Set(lineHex.map((hex) => g.m(hex, 'flat'))));
        }
      }
    },
  },
];
