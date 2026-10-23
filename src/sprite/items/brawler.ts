// The owner's broad man's clothes, his pixels (docs/reference/bulky-owner-reference.jpg, 2026-10-21: "copia
// todo como aiden"): the black shirt with silver seams, the jeans to colour ("seria ese el jeans para
// colear"), the belt on its own ("aisla el cinturon") with its pouch and knife, the steel gauntlet and the
// wrapped bracer, and the low leather boots. Every piece is his, lifted out by tools/refs/*-from-ref.py
// and riding our rig like his Aiden's: at rest on the bulky body every pixel is where he drew it; in
// other poses each piece follows its bone. His black line is never recoloured; with each colour slot at
// its default every pixel is his colour.
//
// He drew them on the bulky body; "haz una version para el tipo de personaje masculino con complexion
// normal": on the male body each piece is fitted to its narrower limbs and torso by leaving out whole
// columns and rows of his, or repeating them, never redrawn (fit.ts).

import { retintHex } from '../color';
import { capPlace, ownerSkin } from '../bulkyBody';
import { armDepth, armJoints, Depth, DrawCtx, handDraw, handPose, ItemDef, legDepth, legJoints, Side } from '../ctx';
import { limbRefit, refit } from '../fit';
import { BOOTS_PART } from './bootsPart';
import { clothPen, limb } from './clothes';
import { segAngle, stretchPiece, type PaintedPiece } from '../painted';
import { F_NO_OUTLINE, F_NO_TEXTURE, F_OWNER, F_SEAL, GRID, Layer, len, partIndex, PartId, PARTS, RES, sub, Vec } from '../raster';
import { BODY_PARAMS, type BodyParams } from '../rig';
import { rotateTemplate, stampTemplate, type TemplatePalette } from '../rotsprite';
import { BULKY_BASE_BRIEFS } from '../bulkyBaseArt';
import { BELT_KIND, BELT_KNIFE, BELT_LEATHER, BELT_METAL, BELT_POUCH, BELT_STRAPS, BELT_TAN } from './brawlerBeltArt';
import { BOOT_F, BOOT_KIND, BOOT_LEATHER, BOOT_N } from './brawlerBootsArt';
import { BRACER_BAND, BRACER_KIND, BRACER_SKIN, BRACER_STEEL, BRACER_WRAP, STEEL_BRACER_N, STEEL_FIST_N, WRAP_BRACER_F, WRAP_FIST_F } from './brawlerBracersArt';
import { JEANS_DENIM, JEANS_HIPS, JEANS_KIND, JEANS_SHIN_F, JEANS_SHIN_N, JEANS_THIGH_F, JEANS_THIGH_N } from './jeansArt';
import { SHIRT_CAP_F, SHIRT_CAP_N, SHIRT_CLOTH, SHIRT_KIND, SHIRT_SEAM, SHIRT_SLEEVE_F, SHIRT_SLEEVE_N, SHIRT_TORSO } from './seamShirtArt';
import { SHIRT_MALE_CHEST, SHIRT_MALE_KIND, SHIRT_MALE_LINE, SHIRT_MALE_SLEEVE_F, SHIRT_MALE_SLEEVE_N } from './seamShirtMaleArt';
import { romanChestLonger } from './armor';
import { isEdge } from '../maleSkin';

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });
const SIDES: Side[] = ['F', 'N'];
const prt = (base: 'upperArm' | 'forearm' | 'hand' | 'thigh' | 'shin' | 'foot', s: Side) => `${base}${s}` as PartId;
type Tint = (ch: string, hex: string) => string;

/** The bodies his clothes are made for: his broad man's (bulky) and, fitted, the normal male's. */
const MALE_BODIES: ItemDef['bodies'] = ['male', 'bulky'];

// ---------------------------------------------------------------------------
// Stamping his pieces
// ---------------------------------------------------------------------------

function pens(g: DrawCtx, p: PaintedPiece, tint: Tint): TemplatePalette {
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(p.colors)) pal[ch] = [g.m(tint(ch, hex), 'flat'), 3];
  return pal;
}

/** His piece with its pivot on `at`, its limb pointing along `deg` (at his angle, every pixel his). */
function onLimb(g: DrawCtx, L: Layer, p: PaintedPiece, at: Vec, deg: number, part: PartId, tint: Tint): void {
  stampTemplate(L, p, at, deg - p.angle, pens(g, p, tint), part, { flags: F_NO_TEXTURE | F_NO_OUTLINE | F_OWNER, seal: sealOf(p) });
}

/** His piece's open edge (PaintedPiece.seal), flagged so it is closed with his line where it ends up bare. */
const sealOf = (p: PaintedPiece) => (p.seal ? { rows: p.seal, flag: F_SEAL } : undefined);

/** Past this lean (degrees from his picture) a piece riding the torso is turned with RotSprite; up to it, sheared. */
const LEAN_SHEAR = 20;

/**
 * His piece riding the torso, leaning `deg` about its pivot: a small lean shears it, each row moved across
 * whole (his pixels only stepped), as far as a turn would; a large one turns it with RotSprite.
 */
function onTorso(g: DrawCtx, L: Layer, p: PaintedPiece, at: Vec, deg: number, part: PartId, tint: Tint): void {
  const d = deg - p.angle;
  if (Math.abs(d) > LEAN_SHEAR) {
    onLimb(g, L, p, at, deg, part, tint);
    return;
  }
  const pal = pens(g, p, tint);
  const ax = Math.floor(at.x * RES) - p.pivot[0];
  const ay = Math.floor(at.y * RES) - p.pivot[1];
  const s = Math.sin((d * Math.PI) / 180);
  p.rows.forEach((row, j) => {
    const dx = -Math.round((j - p.pivot[1]) * s);
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') L.set(ax + i + dx, ay + j, pal[row[i]][0], 3, part, F_NO_TEXTURE | F_NO_OUTLINE | F_OWNER | (p.seal?.[j]?.[i] === 'x' ? F_SEAL : 0));
  });
}

/**
 * His piece hanging from the torso by its top (the pouch on its straps): the middle of its top row follows
 * the torso's lean as onTorso moves that cell, and the piece hangs straight down from there, never turned,
 * so his thin straps stay whole and it stays on the belt. At his lean every pixel is where he drew it.
 */
function hang(g: DrawCtx, L: Layer, p: PaintedPiece, at: Vec, deg: number, part: PartId, tint: Tint): void {
  const d = ((deg - p.angle) * Math.PI) / 180;
  const top = p.rows[0];
  const cx = Math.round((top.search(/[^.]/) + top.replace(/\.+$/, '').length - 1) / 2);
  const ox = cx - p.pivot[0];
  const oy = -p.pivot[1];
  // Where that cell goes: sheared across like onTorso's rows for a small lean, turned past it.
  const [mx, my] = Math.abs(deg - p.angle) > LEAN_SHEAR ? [Math.round(ox * Math.cos(d) - oy * Math.sin(d)) - ox, Math.round(ox * Math.sin(d) + oy * Math.cos(d)) - oy] : [-Math.round(oy * Math.sin(d)), 0];
  const pal = pens(g, p, tint);
  const ax = Math.floor(at.x * RES) - p.pivot[0] + mx;
  const ay = Math.floor(at.y * RES) - p.pivot[1] + my;
  p.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') L.set(ax + i, ay + j, pal[row[i]][0], 3, part, F_NO_TEXTURE | F_NO_OUTLINE | F_OWNER | (p.seal?.[j]?.[i] === 'x' ? F_SEAL : 0));
  });
}

/**
 * His fist on the wrist: as he drew it while the hand points within 30 degrees of the way it did in his
 * picture, turned with RotSprite past that, and mirrored when our hand pictures are (thumb on the facing
 * side), like the owner's gauntlets (clothes.ts paintedFist).
 */
function onWrist(g: DrawCtx, L: Layer, s: Side, p: PaintedPiece, tint: Tint): void {
  const j = armJoints(g.rig, s);
  const { flipX } = handPose(g, s);
  const drawn = flipX ? 180 - p.angle : p.angle;
  const turn = ((segAngle(j.wrist, j.hand) - drawn + 540) % 360) - 180;
  stampTemplate(L, p, j.wrist, Math.abs(turn) <= 30 ? 0 : turn, pens(g, p, tint), prt('hand', s), { flipX, flags: F_NO_TEXTURE | F_NO_OUTLINE | F_OWNER, seal: sealOf(p) });
}

/**
 * Takes away the pixels of these parts from these depths (what his piece replaces); with `oursOnly`,
 * only our drawn shapes, not painted pixels (his skin on the bulky body, our hand pictures).
 */
function partsOff(g: DrawCtx, depths: Depth[], parts: PartId[], oursOnly = false): void {
  const idx = new Set(parts.map(partIndex));
  for (const d of depths) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && idx.has(L.part[i]) && !(oursOnly && L.flags[i] & F_NO_TEXTURE)) L.mat[i] = -1;
  }
}

/**
 * Our torso's skin and undergarment taken away between two heights (torso-local design units, 0 at the
 * hips): what his shirt or his jeans cover there is his, and where they do not his figure ends.
 */
function torsoOff(g: DrawCtx, from: number, to: number): void {
  const r = g.rig;
  const torso = partIndex('torso');
  // the bulky body's pelvis lies on the near leg's layer (bulkyBody.ts)
  for (const d of ['torso.body', 'torso.under', legDepth('N', 'body')] as Depth[]) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || L.part[i] !== torso) continue;
      const x = ((i % GRID) + 0.5) / RES - r.pelvis.x;
      const y = (Math.floor(i / GRID) + 0.5) / RES - r.pelvis.y;
      const up = x * r.up.x + y * r.up.y;
      if (up >= from && up <= to) L.mat[i] = -1;
    }
  }
}

/** Our bare forearm past the round of the elbow taken away (painted pixels stay). */
function forearmOff(g: DrawCtx, s: Side): void {
  const j = armJoints(g.rig, s);
  const L = g.L(armDepth(s, 'body'));
  const fore = partIndex(prt('forearm', s));
  const len = Math.hypot(j.wrist.x - j.elbow.x, j.wrist.y - j.elbow.y) || 1;
  const ux = (j.wrist.x - j.elbow.x) / len;
  const uy = (j.wrist.y - j.elbow.y) / len;
  const keep = g.rig.body === 'bulky' ? 0 : g.bp.armR[1];
  for (let i = 0; i < GRID * GRID; i++) {
    if (L.mat[i] < 0 || L.part[i] !== fore || L.flags[i] & F_NO_TEXTURE) continue;
    const t = ((i % GRID) + 0.5) / RES - j.elbow.x;
    const u = (Math.floor(i / GRID) + 0.5) / RES - j.elbow.y;
    if (t * ux + u * uy > keep) L.mat[i] = -1;
  }
}

/**
 * Our bare upper arm under his sleeve taken away, from above the shoulder to `upTo` design units down the
 * arm (painted pixels stay): the sleeve is his figure there, so our arm's round never shows past his line.
 */
function upperArmOff(g: DrawCtx, s: Side, upTo: number): void {
  const j = armJoints(g.rig, s);
  const L = g.L(armDepth(s, 'body'));
  const upper = partIndex(prt('upperArm', s));
  const len = Math.hypot(j.elbow.x - j.shoulder.x, j.elbow.y - j.shoulder.y) || 1;
  const ux = (j.elbow.x - j.shoulder.x) / len;
  const uy = (j.elbow.y - j.shoulder.y) / len;
  for (let i = 0; i < GRID * GRID; i++) {
    if (L.mat[i] < 0 || L.part[i] !== upper || L.flags[i] & F_NO_TEXTURE) continue;
    const t = ((i % GRID) + 0.5) / RES - j.shoulder.x;
    const u = (Math.floor(i / GRID) + 0.5) / RES - j.shoulder.y;
    if (t * ux + u * uy < upTo) L.mat[i] = -1;
  }
}

/**
 * Reading, the near upper arm swings far forward of the torso while the cap over the shoulder follows the
 * torso, and from the shoulder's top back to its back, and from there in to the sleeve, the edge ran as
 * straight diagonals: a cut-off square corner (the owner on the bulky read: "ahora redondea el hombro"). Both
 * corners are bowed out to a round, SHOULDER_BOW of the way from the straight cut to the quarter ellipse set in
 * the corner: filled out with his shirt's cloth from the nearest pixel of his, his line along the new edge and
 * none left inside.
 */
function roundShoulder(g: DrawCtx, L: Layer, s: Side, tint: Tint): void {
  const j = armJoints(g.rig, s);
  const part = partIndex(prt('upperArm', s));
  const lines = new Set(Object.entries(SHIRT_KIND).filter(([, k]) => k === 'line').map(([hex]) => g.m(tint('', hex), 'flat')));
  const line = g.m(tint('', '#000000'), 'flat');
  g.after((layers) => {
    const all = [...layers.values()];
    const bare = (i: number) => all.every((l) => l.mat[i] < 0);
    const arm = (i: number) => L.mat[i] >= 0 && L.part[i] === part;
    const edge = (i: number) => [i - 1, i + 1, i - GRID, i + GRID].some(bare);
    // each row's furthest pixel back, from the shoulder's top to below its joint
    const jy = Math.floor(j.shoulder.y * RES) + 8;
    const backOf = new Map<number, number>();
    for (let y = 1; y <= jy; y++)
      for (let x = 1; x < GRID - 1; x++)
        if (arm(y * GRID + x)) {
          backOf.set(y, x);
          break;
        }
    // the shoulder's top: its first row three pixels wide from its back
    let ay = -1;
    for (const [y, x] of backOf)
      if (arm(y * GRID + x + 1) && arm(y * GRID + x + 2)) {
        ay = y;
        break;
      }
    if (ay < 0) return;
    // its back: the furthest column back above the joint (its first and last rows there), and below it where
    // the edge has come in to the sleeve (the row before the edge stops coming in)
    const sy = Math.floor(j.shoulder.y * RES) + 2;
    let by = ay;
    for (const [y, x] of backOf) if (y > ay && y <= sy && x < backOf.get(by)!) by = y;
    const bx = backOf.get(by)!;
    let by2 = by;
    while (backOf.get(by2 + 1) === bx) by2++;
    let cy = by2;
    while (backOf.has(cy + 1) && backOf.get(cy + 1)! > backOf.get(cy)!) cy++;
    const ax = backOf.get(ay)!;
    const cx = backOf.get(cy)!;
    // Each corner bowed out from its straight cut toward the quarter ellipse set in it (x for a row y, in
    // pixel edges across and pixel centres down): above, from the top (ax, ay) to the back (bx, by); below,
    // from the back (bx, by2) in to the sleeve (cx, cy).
    const bows: { from: number; to: number; at: (y: number) => number }[] = [];
    if (by - ay >= 3 && ax - bx >= 3)
      bows.push({
        from: ay,
        to: by,
        at: (y) => {
          const f = (y - ay) / (by - ay);
          const cut = ax - (ax - bx) * f;
          return cut + SHOULDER_BOW * (ax - (ax - bx) * Math.sqrt(Math.max(0, 1 - (1 - f) * (1 - f))) - cut);
        },
      });
    if (cy - by2 >= 2 && cx - bx >= 2)
      bows.push({
        from: by2,
        to: cy,
        at: (y) => {
          const f = (y - by2) / (cy - by2);
          const cut = bx + (cx - bx) * f;
          return cut + SHOULDER_BOW * (cx - (cx - bx) * Math.sqrt(Math.max(0, 1 - f * f)) - cut);
        },
      });
    if (!bows.length) return;
    const wasEdge = new Set<number>();
    const x1 = Math.max(ax, cx);
    for (let y = ay - 1; y <= cy + 1; y++) for (let x = bx - 1; x <= x1 + 2; x++) if (arm(y * GRID + x) && edge(y * GRID + x)) wasEdge.add(y * GRID + x);
    // the cloth nearest a pixel, of his inside the shoulder (not his line)
    const cloth = (i: number) => {
      let best = Infinity;
      let q = -1;
      for (let y = ay - 2; y <= cy + 6; y++)
        for (let x = bx - 2; x <= x1 + 6; x++) {
          const c = y * GRID + x;
          if (!arm(c) || lines.has(L.mat[c])) continue;
          const d = Math.hypot(x - (i % GRID), y - ((i / GRID) | 0));
          if (d < best) [best, q] = [d, c];
        }
      return q;
    };
    const fill: [number, number][] = [];
    for (const b of bows)
      for (let y = b.from + 1; y < b.to; y++)
        for (let x = bx; x < backOf.get(y)!; x++) {
          const i = y * GRID + x;
          if (x + 0.5 < b.at(y) || !bare(i)) continue;
          const q = cloth(i);
          if (q >= 0) fill.push([i, q]);
        }
    for (const [i, q] of fill) [L.mat[i], L.shade[i], L.part[i], L.flags[i]] = [L.mat[q], L.shade[q], part, L.flags[q]];
    const filled = new Set(fill.map(([i]) => i));
    // his line round the new edge; where his line was the edge and is now inside, his cloth
    const inside: [number, number][] = [];
    for (const i of wasEdge) if (lines.has(L.mat[i]) && !edge(i) && [i - 1, i + 1, i - GRID, i + GRID].some((q) => filled.has(q))) inside.push([i, cloth(i)]);
    for (const [i, q] of inside) if (q >= 0) [L.mat[i], L.shade[i]] = [L.mat[q], L.shade[q]];
    for (const i of filled) if (edge(i)) L.mat[i] = line;
  });
}
/** How round the reading shoulder is: from 0 (the straight cut) to 1 (a quarter ellipse). */
const SHOULDER_BOW = 1;

/** His colours by what they are: his black line stays, each other kind follows its slot from his default. */
const byKind = (kinds: Record<string, string>, slots: Record<string, [string, string]>, skin?: string): Tint => (_ch, hex) => {
  const k = kinds[hex];
  if (!k || k === 'line') return hex;
  if (k === 'skin') return skin ? ownerSkin(hex, BRACER_SKIN, skin) : hex;
  const s = slots[k];
  return s ? retintHex(hex, s[0], s[1]) : hex;
};

// ---------------------------------------------------------------------------
// Fitting to the normal male body
// ---------------------------------------------------------------------------

const BULKY = BODY_PARAMS.bulky;
/** How much longer (above 1) or shorter a bone of this body is than the bulky body's. */
const boneRatio = (b: BodyParams, f: (p: BodyParams) => number) => f(b) / f(BULKY);

/**
 * How each of his pieces sits on the normal male body, as factors of what he drew: `across` a limb (or
 * `left`/`right` of the torso's pivot), and `along` it below the pivot (by default, as much longer or
 * shorter as the male's bone). Measured on the male body at rest against the bulky one and against the
 * presets fitted on it (Aiden, Ren, Akira, Solen): the male's chest is as broad as the bulky's on the far
 * side and nearly so on the near side, so his shirt keeps nearly all its columns and covers the shoulders;
 * a short sleeve is about as wide as the male's upper arm plus a pixel each side (Ren's); a bracer and a
 * fist one or two columns narrower than his; loose trousers two pixels wider than the male's legs each
 * side (Ren's), so his jeans lose two or three columns of fourteen.
 */
const MALE_FIT = {
  torso: { left: 0.92, right: 1, down: 0.88 },
  hips: { left: 0.85, right: 0.85 },
  knife: { left: 1, right: 1, down: 0.85 },
  sleeve: { across: 0.95, along: 0.85 },
  cap: { across: 1, along: 1 },
  bracer: { across: 0.85 },
  fist: { across: 0.85, along: 0.85 },
  thigh: { across: 0.85 },
  shin: { across: 0.85 },
};

/** A limb piece on this body: `across` as wide, and as long as its bone (or `along`) below its pivot. */
function limbFit(g: DrawCtx, p: PaintedPiece, key: string, f: { across: number; along?: number }, bone: (b: BodyParams) => number): PaintedPiece {
  if (g.rig.body === 'bulky') return p;
  return limbRefit(p, f.across, f.along ?? boneRatio(g.bp, bone), `${key}@${g.rig.body}`);
}

/** A piece riding the torso on this body: narrower on each side of its pivot, shorter below it. */
function torsoFit(g: DrawCtx, p: PaintedPiece, key: string, f: { left: number; right: number; down?: number }): PaintedPiece {
  if (g.rig.body === 'bulky') return p;
  return refit(p, f, `${key}@${g.rig.body}`);
}

const torsoAngle = (g: DrawCtx) => segAngle(g.rig.pelvis, g.rig.neck);

/** Where his shirt's hem meets his jeans' waistband, above the hips (torso-local design units). */
const SHIRT_HEM = 2.8;

/**
 * A skin-tight sleeve (seamShirtMaleArt.ts) over our upper arm: his piece turned with the arm about the
 * shoulder, as maleSkin.ts lays the Roman's skin, and every pixel of our upper arm under it (not its
 * outline) takes its colour. Our arm is wider than his piece at the shoulder (the round of the shoulder,
 * the far arm behind the chest), so a pixel of the arm above the hem that the piece does not reach takes
 * the colour of the piece's nearest cell: his pixels continued across, the hem's band and line with them.
 * Run once his skin is laid (g.after), so the arm's own shape and outline are the sleeve's and no skin of
 * the arm is left above the hem.
 */
function sleeveOver(g: DrawCtx, s: Side, p: PaintedPiece, tint: Tint): void {
  const r = g.rig;
  const j = armJoints(r, s);
  const ax = Math.floor(j.shoulder.x * RES);
  const ay = Math.floor(j.shoulder.y * RES);
  const len = Math.hypot(j.elbow.x - j.shoulder.x, j.elbow.y - j.shoulder.y) || 1;
  const ux = (j.elbow.x - j.shoulder.x) / len;
  const uy = (j.elbow.y - j.shoulder.y) / len;
  // along the arm from the shoulder, and across it (fine pixels)
  const along = (i: number) => ((i % GRID) + 0.5 - j.shoulder.x * RES) * ux + (((i / GRID) | 0) + 0.5 - j.shoulder.y * RES) * uy;
  const across = (i: number) => Math.floor(-((i % GRID) + 0.5 - j.shoulder.x * RES) * uy + (((i / GRID) | 0) + 0.5 - j.shoulder.y * RES) * ux);
  const cells = new Map<number, number>();
  for (const q of rotateTemplate(p, segAngle(j.shoulder, j.elbow) - p.angle)) {
    const x = ax + q.dx;
    const y = ay + q.dy;
    if (x >= 0 && y >= 0 && x < GRID && y < GRID) cells.set(y * GRID + x, g.m(tint(q.ch, p.colors[q.ch]), 'flat'));
  }
  // The hem across the arm: the lowest cell of the piece in each line along it, the lower of it and its
  // neighbours', so at the piece's sides the hem runs on as low as beside them; past the piece's sides
  // (our arm is wider than his: the round of the shoulder, the far arm he showed only a strip of) the
  // sleeve reaches as far down as anywhere.
  // (A line along the arm the piece only touches, a cell or two at its top or side, has no hem.)
  const hem = new Map<number, number>();
  const count = new Map<number, number>();
  for (const i of cells.keys()) count.set(across(i), (count.get(across(i)) ?? 0) + 1);
  for (const i of cells.keys()) if (count.get(across(i))! >= 3) hem.set(across(i), Math.max(hem.get(across(i)) ?? -Infinity, along(i)));
  const deepest = Math.max(...hem.values());
  const hemAt = (a: number) => (hem.has(a) ? Math.max(hem.get(a)!, hem.get(a - 1) ?? -Infinity, hem.get(a + 1) ?? -Infinity) : hem.has(a - 1) || hem.has(a + 1) ? Math.max(hem.get(a - 1) ?? -Infinity, hem.get(a + 1) ?? -Infinity) : deepest) + 0.5;
  const part = partIndex(prt('upperArm', s));
  g.after((layers) => {
    const L = layers.get(armDepth(s, 'body'));
    if (!L || !cells.size) return;
    const set: [number, number][] = [];
    const line = g.m(SHIRT_MALE_LINE, 'flat');
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || L.part[i] !== part) continue;
      // The arm's outline round the sleeve is the shirt's black line, not the skin's.
      if (isEdge(L, i)) {
        if (cells.has(i) || along(i) <= hemAt(across(i))) set.push([i, line]);
        continue;
      }
      let m = cells.get(i);
      if (m === undefined) {
        if (along(i) > hemAt(across(i))) continue;
        let best = Infinity;
        for (const [k, mk] of cells) {
          const d = Math.hypot((k % GRID) - (i % GRID), ((k / GRID) | 0) - ((i / GRID) | 0));
          if (d < best) [best, m] = [d, mk];
        }
      }
      set.push([i, m!]);
    }
    for (const [i, m] of set) {
      L.mat[i] = m;
      L.shade[i] = 3;
      // Marked as his, so a seam or band a turn steps apart is mended as on his other pieces (compose.ts).
      L.flags[i] |= F_NO_TEXTURE | F_OWNER;
    }
  });
}

/**
 * His shirt on the normal male, in his Roman's style (the owner, 2026-10-23: "copia el estilo que tiene romano
 * y pasa los colores de pixel a ese y pasa los brazos de romano a ese"), a shirt fitted to the body ("quitale
 * la hombrera y solo ponle la camisa pegada al cuerpo base"; "si tiene mangas la camisa ... simplemente es una
 * camisa pegada al cuerpo entonces se ve como la musculatura del cuerpo bien definida pero del color y con las
 * detalles de la camisa"): the Roman's chest in the shirt's colours with its seams and his high collar
 * (seamShirtMaleArt.ts), hung where the Bronze Cuirass hangs his chest (leaning with the torso from the neck),
 * and the sleeves skin-tight over our upper arms, his muscle shading in the shirt's colours, down to the
 * banded hem; below them the male's own bare arms in the Roman's skin. The torso under it goes, as under the
 * cuirass, down to where the jeans begin.
 */
function drawShirtMale(g: DrawCtx, cloth: string, seam: string): void {
  const r = g.rig;
  const tint = byKind(SHIRT_MALE_KIND, { cloth: [SHIRT_CLOTH, cloth], seam: [SHIRT_SEAM, seam] });
  torsoOff(g, SHIRT_HEM, g.bp.torsoLen);
  const chest = romanChestLonger(r, SHIRT_MALE_CHEST);
  const torso = torsoAngle(g);
  // Turned past a shear, it keeps the Roman's black line whole (rotateLined), so no seam or collar pixel
  // of the shirt lands on its edge.
  if (Math.abs(torso - chest.angle) > LEAN_SHEAR) {
    const line = (ch: string) => SHIRT_MALE_KIND[chest.colors[ch]] === 'line';
    stampTemplate(g.L('torso.top'), chest, r.neck, torso - chest.angle, pens(g, chest, tint), 'torso', { flags: F_NO_TEXTURE | F_NO_OUTLINE | F_OWNER, line, seal: sealOf(chest) });
  } else onTorso(g, g.L('torso.top'), chest, r.neck, torso, 'torso', tint);
  sleeveOver(g, 'F', SHIRT_MALE_SLEEVE_F, tint);
  sleeveOver(g, 'N', SHIRT_MALE_SLEEVE_N, tint);
}

// ---------------------------------------------------------------------------
// The items
// ---------------------------------------------------------------------------

export const BRAWLER_TOPS: ItemDef[] = [
  {
    id: 'top_seam_shirt',
    slot: 'top',
    name: 'Seamed Shirt',
    desc: 'A tight short-sleeved shirt with a high collar, silver seams and the muscles showing through.',
    colors: [col('main', 'Shirt', SHIRT_CLOTH), col('seam', 'Seams', SHIRT_SEAM)],
    bodies: MALE_BODIES,
    draw: (g, [cloth, seam]) => {
      const r = g.rig;
      if (r.body === 'male') {
        drawShirtMale(g, cloth, seam);
        return;
      }
      const tint = byKind(SHIRT_KIND, { cloth: [SHIRT_CLOTH, cloth], seam: [SHIRT_SEAM, seam] });
      // Under his shirt our torso goes, up to the neck: the shirt is his figure there.
      torsoOff(g, SHIRT_HEM, g.bp.torsoLen);
      const torso = torsoFit(g, SHIRT_TORSO, 'SHIRT_TORSO', MALE_FIT.torso);
      onTorso(g, g.L('torso.top'), torso, r.neck, torsoAngle(g), 'torso', tint);
      for (const s of SIDES) {
        const j = armJoints(r, s);
        const L = g.L(armDepth(s, 'cloth'));
        const p = limbFit(g, s === 'N' ? SHIRT_SLEEVE_N : SHIRT_SLEEVE_F, `SHIRT_SLEEVE_${s}`, MALE_FIT.sleeve, (b) => b.upperArm);
        // Under the sleeve our arm goes, but for its last two rows, where his hem lies over the arm.
        upperArmOff(g, s, (p.rows.length - p.pivot[1] - 2) / RES);
        onLimb(g, L, p, j.shoulder, segAngle(j.shoulder, j.elbow), prt('upperArm', s), tint);
        // Over the shoulder the sleeve rides the shoulder, following the arm part of the way.
        const cap = limbFit(g, s === 'N' ? SHIRT_CAP_N : SHIRT_CAP_F, `SHIRT_CAP_${s}`, MALE_FIT.cap, () => 1);
        const { at, deg } = capPlace(r, s, cap);
        if (r.pose === 'read' && s === 'N') roundShoulder(g, L, s, tint);
        onLimb(g, L, cap, at, deg, prt('upperArm', s), tint);
      }
    },
  },
];

export const BRAWLER_BOTTOMS: ItemDef[] = [
  {
    // His bare broad man wears dark boxer briefs (bulky-base-owner-reference.jpg): the bulky body draws them
    // (bulkyBody.ts); this item only gives them a colour.
    id: 'bottom_boxer_briefs',
    slot: 'bottom',
    name: 'Boxer Briefs',
    desc: "The broad man's dark boxer briefs, in any colour.",
    colors: [col('main', 'Briefs', BULKY_BASE_BRIEFS)],
    bodies: ['bulky'],
    draw: () => {},
  },
  {
    id: 'bottom_jeans',
    slot: 'bottom',
    name: 'Jeans',
    desc: 'Loose jeans in any colour, lit down the front of each leg and creased at the knees.',
    colors: [col('main', 'Jeans', JEANS_DENIM)],
    parts: [BOOTS_PART('tucked')],
    bodies: MALE_BODIES,
    draw: (g, [denim]) => {
      const r = g.rig;
      const tint = byKind(JEANS_KIND, { denim: [JEANS_DENIM, denim] });
      // Under his jeans our hips, legs and undergarment go: the jeans are his figure there.
      torsoOff(g, -99, SHIRT_HEM);
      partsOff(g, [legDepth('N', 'body'), legDepth('N', 'cloth'), legDepth('F', 'body'), legDepth('F', 'cloth')], ['thighN', 'shinN', 'thighF', 'shinF']);
      // Under his pieces, plain trouser legs in the jeans' colour, a little inside his: where a bent knee
      // or hip opens a gap between his pieces, they show instead of the background.
      for (const s of SIDES) limb(g, g.L(legDepth(s, 'cloth')), 'leg', s, 0.3, 1.9, [-0.7, -0.7], clothPen(g, denim, prt('thigh', s), s === 'F' ? -1 : 0), { round0: true });
      for (const s of SIDES) {
        const L = g.L(legDepth(s, 'cloth'));
        const { hip, knee, ankle } = legJoints(r, s);
        const shinFit = limbFit(g, s === 'N' ? JEANS_SHIN_N : JEANS_SHIN_F, `JEANS_SHIN_${s}`, MALE_FIT.shin, (b) => b.shin);
        const shin = stretchPiece(shinFit, (len(sub(ankle, knee)) - g.bp.shin) * RES, g.bp.shin * RES);
        // A seated leg longer than the body's (rig.ts kneeLeg, kneeLegScaled): his jeans lengthened with
        // it, rows of his repeated (stretchPiece), so thigh and shin still meet at the knee.
        const fit = limbFit(g, s === 'N' ? JEANS_THIGH_N : JEANS_THIGH_F, `JEANS_THIGH_${s}`, MALE_FIT.thigh, (b) => b.thigh);
        const thigh = stretchPiece(fit, (len(sub(knee, hip)) - g.bp.thigh) * RES, g.bp.thigh * RES);
        onLimb(g, L, shin, knee, segAngle(knee, ankle), prt('shin', s), tint);
        onLimb(g, L, thigh, hip, segAngle(hip, knee), prt('thigh', s), tint);
      }
      const hips = torsoFit(g, JEANS_HIPS, 'JEANS_HIPS', MALE_FIT.hips);
      onTorso(g, g.L('torso.bottom'), hips, r.pelvis, torsoAngle(g), 'pelvis', tint);
    },
  },
];

/** How far out from the pelvis the near thigh's outer edge is (where the pouch hangs), in fine pixels. */
const nearHipOut = (b: BodyParams) => (b.hipHalf * 0.5 + b.legR[0] * 0.96) * RES;

export const BRAWLER_WAIST: ItemDef[] = [
  {
    id: 'waist_brawler_belt',
    slot: 'waist',
    name: 'Brawler Belt',
    desc: 'A brown leather belt with a round silver buckle and a second strap slanting to the hip, a tan pouch on the hip and a sheathed knife hanging between the legs.',
    colors: [col('main', 'Leather', BELT_LEATHER, 'leather'), col('metal', 'Buckle', BELT_METAL, 'metal'), col('pouch', 'Pouch', BELT_TAN, 'leather')],
    parts: [
      { key: 'pouch', label: 'Pouch', options: [{ id: 'on', label: 'Pouch', desc: 'The tan pouch hangs on the near hip.' }, { id: 'off', label: 'None', desc: 'No pouch.' }] },
      { key: 'knife', label: 'Knife', options: [{ id: 'on', label: 'Knife', desc: 'A sheathed knife hangs between the legs.' }, { id: 'off', label: 'None', desc: 'No knife.' }] },
    ],
    bodies: MALE_BODIES,
    draw: (g, [leather, metal, tan], parts) => {
      const r = g.rig;
      const tint = byKind(BELT_KIND, { leather: [BELT_LEATHER, leather], metal: [BELT_METAL, metal], tan: [BELT_TAN, tan] });
      const L = g.L('waist');
      const lean = torsoAngle(g);
      if (parts.knife === 'on') {
        // Behind both legs, seen between them as he drew it: its sheath goes on up behind the far leg to
        // the waistband, so wherever the legs go it hangs from the belt. It swings about the pelvis as
        // the near thigh turns from his picture's, so it stays between the legs and above the ground
        // when the knees come up. On the male's shorter legs it is shorter by his sheath's rows left out.
        const knife = torsoFit(g, BELT_KNIFE, 'BELT_KNIFE', MALE_FIT.knife);
        const { hip, knee } = legJoints(r, 'N');
        onLimb(g, g.L(legDepth('F', 'body')), knife, r.pelvis, knife.angle + segAngle(hip, knee) - JEANS_THIGH_N.angle, 'pelvis', tint);
      }
      if (parts.pouch === 'on') {
        // On a narrower body the pouch moves in with the hip: his pixels, shifted, not squeezed.
        const dx = r.body === 'bulky' ? 0 : -Math.round(nearHipOut(BULKY) - nearHipOut(g.bp));
        const pouch = dx ? refit(BELT_POUCH, { shift: [dx, 0] }, `BELT_POUCH@${r.body}`) : BELT_POUCH;
        hang(g, L, pouch, r.pelvis, lean, 'pelvis', tint);
      }
      const straps = torsoFit(g, BELT_STRAPS, 'BELT_STRAPS', MALE_FIT.hips);
      onTorso(g, L, straps, r.pelvis, lean, 'pelvis', tint);
    },
  },
];

type BracerStyle = 'steel' | 'wrap' | 'none';

export const BRAWLER_HANDS: ItemDef[] = [
  {
    id: 'hands_brawler_bracers',
    slot: 'hands',
    name: 'Gauntlet and Wraps',
    desc: 'A steel gauntlet with a dark band over the near forearm and fist, white wrappings round the far forearm and fist; either on either arm.',
    colors: [col('main', 'Steel', BRACER_STEEL, 'metal'), col('band', 'Band', BRACER_BAND, 'leather'), col('wrap', 'Wraps', BRACER_WRAP)],
    parts: [
      {
        key: 'near',
        label: 'Near arm',
        options: [
          { id: 'steel', label: 'Gauntlet', desc: 'The steel gauntlet over the forearm and fist.' },
          { id: 'wrap', label: 'Wraps', desc: 'White wrappings round the forearm and fist.' },
          { id: 'none', label: 'None', desc: 'The arm bare.' },
        ],
      },
      {
        key: 'far',
        label: 'Far arm',
        options: [
          { id: 'wrap', label: 'Wraps', desc: 'White wrappings round the forearm and fist.' },
          { id: 'steel', label: 'Gauntlet', desc: 'The steel gauntlet over the forearm and fist.' },
          { id: 'none', label: 'None', desc: 'The arm bare.' },
        ],
      },
    ],
    bodies: MALE_BODIES,
    draw: (g, [steel, band, wrap], parts) => {
      // His gauntlet is the near arm's and his wrappings the far arm's; on the other arm each is his
      // same pixels, turned to that forearm.
      const tint = byKind(BRACER_KIND, { steel: [BRACER_STEEL, steel], band: [BRACER_BAND, band], wrap: [BRACER_WRAP, wrap] }, g.look.skin);
      for (const s of SIDES) {
        const style = (s === 'N' ? parts.near : parts.far) as BracerStyle;
        if (style === 'none') continue;
        const j = armJoints(g.rig, s);
        const L = g.L(armDepth(s, 'armor'));
        // The forearm is his bracer's: our bare forearm under it goes (it would show past his edge), but
        // not the round of the elbow, which closes the upper arm; his own skin at the elbow stays.
        forearmOff(g, s);
        const bracer = limbFit(g, style === 'steel' ? STEEL_BRACER_N : WRAP_BRACER_F, `${style}_BRACER`, MALE_FIT.bracer, (b) => b.forearm);
        onLimb(g, L, bracer, j.elbow, segAngle(j.elbow, j.wrist), prt('forearm', s), tint);
        const { kind } = handPose(g, s);
        // His fist closed (his near hand rests closed on the hip as he drew it); open, pointing or
        // cradling hands are our hand pictures.
        if (kind === 'grip' || kind === 'fist' || kind === 'relaxed') {
          partsOff(g, [armDepth(s, 'body')], [prt('hand', s)]);
          const fist = limbFit(g, style === 'steel' ? STEEL_FIST_N : WRAP_FIST_F, `${style}_FIST`, MALE_FIT.fist, (b) => b.handR);
          onWrist(g, L, s, fist, tint);
        } else if (style === 'steel') {
          // An open, pointing or relaxed hand: our hand picture in his steel.
          handDraw(g, L, s, { mat: g.m(steel, 'metal'), part: prt('hand', s), bias: s === 'F' ? -1 : 0 });
        }
      }
    },
  },
];

export const BRAWLER_FEET: ItemDef[] = [
  {
    id: 'feet_brawler_boots',
    slot: 'feet',
    name: 'Brawler Boots',
    desc: 'Low brown leather boots with a lit toe cap and a dark sole.',
    colors: [col('main', 'Leather', BOOT_LEATHER, 'leather')],
    bodies: MALE_BODIES,
    draw: (g, [leather]) => {
      // Each boot stands on our ankle, flat on the ground like our feet; our bare foot under it goes.
      // On a body whose ankle stands higher above its sole (the male's), his boot is that many rows
      // taller: his rows between the ankle and the sole repeated.
      const tint = byKind(BOOT_KIND, { leather: [BOOT_LEATHER, leather] });
      for (const s of SIDES) {
        partsOff(g, [legDepth(s, 'body'), legDepth(s, 'cloth')], [prt('foot', s)]);
        const p = s === 'N' ? BOOT_N : BOOT_F;
        let boot = p;
        if (g.rig.body !== 'bulky') {
          const below = p.rows.length - 1 - p.pivot[1];
          const extra = ((BULKY.ankleLift ?? 0) - (g.bp.ankleLift ?? 0)) * (s === 'N' ? 1 : 0.5) * RES;
          const w = g.bp.footLen / BULKY.footLen;
          boot = refit(p, { left: w, right: w, down: (below + extra) / below }, `BOOT_${s}@${g.rig.body}`);
        }
        onLimb(g, g.L(legDepth(s, 'feet')), boot, legJoints(g.rig, s).ankle, boot.angle, prt('foot', s), tint);
      }
    },
  },
];

/** Every item from his broad man, by slot. */
export const BRAWLER_ITEMS: ItemDef[] = [...BRAWLER_TOPS, ...BRAWLER_BOTTOMS, ...BRAWLER_WAIST, ...BRAWLER_HANDS, ...BRAWLER_FEET];
