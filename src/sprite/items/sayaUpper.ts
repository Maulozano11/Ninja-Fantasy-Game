// Saya's ninja top, arm guards and fingerless gloves, the owner's pixels 1:1 from his Saya drawn at our
// scale (2026-10-21: his heroines set the standard for women; tools/refs/saya-upper-from-ref.py and the
// pieces it writes, sayaUpperArt.ts).

import { retintHex } from '../color';
import { armDepth, armJoints, Depth, DEPTHS, DrawCtx, handDraw, handPose, ItemDef, Side } from '../ctx';
import { PaintedPiece, segAngle, stampPiece } from '../painted';
import { add, F_NO_EDGE, F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, partIndex, PartId, RES, v, Vec } from '../raster';
import { isFemaleBody } from '../types';
import { ownerHand } from '../ownerHands';
import { SEATED_POSES } from '../seats';
import {
  SAYA_CLOTH,
  SAYA_FAR_OUT,
  SAYA_FORE_F,
  SAYA_FORE_N,
  SAYA_GLOVE_N,
  SAYA_GLOVE_TONES,
  SAYA_GLOVE_ZONES,
  SAYA_GRIP_N,
  SAYA_HAND_F,
  SAYA_KIND,
  SAYA_LINE,
  SAYA_PLATE,
  SAYA_SHOULDER_N,
  SAYA_SKIN,
  SAYA_SKIN_SHADOW,
  SAYA_SLEEVE,
  SAYA_TOP,
  SAYA_TOP_LOW,
  SAYA_TRIM,
  SAYA_UPPER_F,
  SAYA_UPPER_N,
} from './sayaUpperArt';

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });

/**
 * Her colours recoloured: her navy follows Cloth, her reds Trim and her cream Plate, each shade as far
 * from the slot's colour as hers was from her base; her black line, her gold and the brown strap stay.
 */
const shadeColor = (cloth: string, trim: string, plate: string, skin: string) => (_ch: string, hex: string): string => {
  const k = SAYA_KIND[hex];
  if (k === 'cloth') return retintHex(hex, SAYA_CLOTH, cloth);
  if (k === 'trim') return retintHex(hex, SAYA_TRIM, trim);
  if (k === 'plate') return retintHex(hex, SAYA_PLATE, plate);
  if (k === 'skin') return retintHex(hex, SAYA_SKIN, skin);
  return hex;
};

const ARMOR_ID = 'armor_crimson_shade';

/**
 * How far (degrees) her bare near shoulder turns with the upper arm: past it, it stays on the shoulder
 * (drawShadeArmor). The owner's bare female body's own shoulder is the round of his arm piece and turns
 * with it all the way (body.ts drawBaseBody); hers is the round of a hanging arm in her black line, which
 * turned further stands off the shoulder.
 */
const SHOULDER_TURN = 30;

/** An angle wrapped into -180..180 degrees. */
const wrapDeg = (a: number) => ((a + 540) % 360) - 180;

/**
 * How far her far arm hangs from ours (rig units). He drew her far arm further from the body than our
 * far arm hangs: her bare shoulder at her plate's edge, her elbow and fist about five pixels further
 * out (SAYA_FAR_OUT). So while she wears her top and our far arm hangs about as hers does (standing,
 * walking, hurt, down: its upper arm and forearm within 30 degrees of how he drew them, the torso's
 * turn taken off), her far pieces and our far hand hang that much further out, turned with the
 * torso, and at rest every pixel of them is his. As the far arm reaches further from that (45
 * degrees) they come back onto our far arm's joints, where a far hand meets the other hand, a book
 * or a jutsu: moving in, they slide under her top, never off it. SAYA_FAR_OUT is how far our far arm
 * hangs from hers at rest (tools/refs/saya-upper-from-ref.py). The female standard hangs the far arm
 * where his Lyra and Aurelia do; his Saya holds hers further from the torso, so it stays.
 */
export function sayaFarOut(g: DrawCtx): Vec {
  const r = g.rig;
  if (!g.has('armor', ARMOR_ID)) return v(0, 0);
  const t = segAngle(r.pelvis, r.neck) - SAYA_TOP.angle;
  const du = Math.abs(wrapDeg(segAngle(r.shoulderF, r.elbowF) - t - SAYA_UPPER_F.angle));
  const df = Math.abs(wrapDeg(segAngle(r.elbowF, r.wristF) - t - SAYA_FORE_F.angle));
  const w = Math.max(0, Math.min(1, (45 - Math.max(du, df)) / 15));
  if (w === 0) return v(0, 0);
  const a = (t * Math.PI) / 180;
  const [dx, dy] = SAYA_FAR_OUT;
  return v((w * (dx * Math.cos(a) - dy * Math.sin(a))) / RES, (w * (dx * Math.sin(a) + dy * Math.cos(a))) / RES);
}

/**
 * Our far hand in a layer, when her far arm hangs further out (`out`, rig units): it goes with her arm,
 * moved by `out` in whole fine pixels, under her glove. Our far upper arm and forearm stay where they
 * hang, between her torso and her far arm: behind her pieces, they only show in the gap between
 * them, painted in her guards' darkest navy (paintBodySkin), so the arm never comes off the body.
 */
function moveFarHand(L: Layer, out: Vec): void {
  const ox = Math.round(out.x * RES);
  const oy = Math.round(out.y * RES);
  if ((!ox && !oy) || !L.used) return;
  const hand = partIndex('handF');
  const moved: [number, number, number, number, number][] = [];
  for (let i = 0; i < GRID * GRID; i++) {
    if (L.mat[i] < 0 || L.part[i] !== hand) continue;
    moved.push([i, L.mat[i], L.shade[i], L.part[i], L.flags[i]]);
    L.mat[i] = -1;
  }
  for (const [i, mat, shade, part, flags] of moved) {
    const x = (i % GRID) + ox;
    const y = ((i / GRID) | 0) + oy;
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) continue;
    const j = y * GRID + x;
    L.mat[j] = mat;
    L.shade[j] = shade;
    L.part[j] = part;
    L.flags[j] = flags;
  }
}

/**
 * Draws her top and arm guards. Within a depth the pieces go back to front: the far forearm guard,
 * then the far upper guard over its top; the top over the torso, its part on the hips first (under a
 * skirt or a belt, which go over its hem); the near forearm guard, her bare near shoulder, then the near upper guard over their tops, so a bent elbow
 * shows the forearm guard under the elbow band and never the skin.
 *
 * Her bare near shoulder is the round of a hanging arm. Turned all the way with the upper arm (flung up
 * and back to throw, raised in victory, swung across to thrust) its round came off the shoulder: a ball
 * of skin in its own line on her back or chest, beside the raised guard. So it turns with the arm only
 * as far as SHOULDER_TURN: further, it stays on the shoulder, a round cap under the raised guard that
 * closes her back's line, and the body's own shoulder turns on with the arm under the guard. Turned that
 * far her top no longer covers an earlier body's bandeau there either (offBandeau; the owner's bare body
 * has none: his sports top is under her top, its straps off). Within SHOULDER_TURN (standing, walking,
 * at rest) nothing changes: every pixel at rest is his.
 */
function drawShadeArmor(g: DrawCtx, cloth: string, trim: string, plate: string): void {
  const r = g.rig;
  const tint = shadeColor(cloth, trim, plate, g.look.skin || SAYA_SKIN);
  const put = (d: Depth, p: PaintedPiece, at: Vec, deg: number, part: PartId) => stampPiece(g, d, p, at, deg, part, tint);
  // her far arm hangs where he drew it, further out than ours (our far hand goes with it)
  const out = sayaFarOut(g);
  for (const d of ['farArm.body', 'farArm.cloth'] as Depth[]) moveFarHand(g.L(d), out);
  put('farArm.armor', SAYA_FORE_F, add(r.elbowF, out), segAngle(r.elbowF, r.wristF), 'forearmF');
  put('farArm.armor', SAYA_UPPER_F, add(r.shoulderF, out), segAngle(r.shoulderF, r.elbowF), 'upperArmF');
  // the top in two pieces: over the hips (on the pelvis, under her belts) and from the collar to the
  // waist (on the neck) over it; between them a torso longer than hers shows more of her pipings
  put('torso.top', SAYA_TOP_LOW, r.pelvis, segAngle(r.pelvis, r.neck), 'torso');
  put('torso.top', SAYA_TOP, r.neck, segAngle(r.pelvis, r.neck), 'torso');
  // the near forearm guard is pinned at the wrist, where his cuff and our wrist meet: our female's
  // forearm is shorter than he drew hers, so bent, its elbow end runs on past our elbow (over the end
  // of the upper arm below her upper guard) and its cuff stays above the hand
  put('nearArm.armor', SAYA_FORE_N, r.wristN, segAngle(r.elbowN, r.wristN), 'forearmN');
  // her bare near shoulder (light skin in her line), turned with the arm no further than SHOULDER_TURN,
  // then the upper guard over its foot
  const upperN = segAngle(r.shoulderN, r.elbowN);
  const turnN = wrapDeg(upperN - SAYA_SHOULDER_N.angle);
  const capped = Math.max(-SHOULDER_TURN, Math.min(SHOULDER_TURN, turnN));
  const A = g.L('nearArm.armor');
  const under = A.mat.slice();
  put('nearArm.armor', SAYA_SHOULDER_N, r.shoulderN, capped === turnN ? upperN : SAYA_SHOULDER_N.angle + capped, 'upperArmN');
  put('nearArm.armor', SAYA_UPPER_N, r.shoulderN, upperN, 'upperArmN');
  paintBodySkin(g, cloth, out.x !== 0 || out.y !== 0);
  if (capped !== turnN) {
    offBandeau(g);
    lineOpenEdge(g, A, under);
  }
  if ((SEATED_POSES as string[]).includes(r.pose)) closeSeatedPinholes(g);
}

/**
 * Seated (his read and sit), her far arm reaches forward across her top, and the turned pieces can leave
 * a single pixel open where her top meets her far arm guard, with the figure on all four sides of it: it
 * is closed with her line on her top.
 */
function closeSeatedPinholes(g: DrawCtx): void {
  const layers = DEPTHS.map((d) => g.L(d)).filter((L) => L.used);
  const full = (i: number) => layers.some((L) => L.mat[i] >= 0);
  const T = g.L('torso.top');
  const line = g.m(SAYA_LINE, 'flat');
  for (let y = 1; y < GRID - 1; y++) {
    for (let x = 1; x < GRID - 1; x++) {
      const i = y * GRID + x;
      if (full(i) || !full(i - 1) || !full(i + 1) || !full(i - GRID) || !full(i + GRID)) continue;
      T.set(x, y, line, 3, 'torso', F_NO_TEXTURE | F_NO_OUTLINE);
    }
  }
}

/**
 * Takes away the body's bandeau (its undergarment above the shorts, torso.under): under her top it does
 * not show; where her top leaves the torso bare (a raised arm's shoulder and side) the body's skin does.
 * Where the bandeau's edge was the figure's, the skin's edge is now. The body's bare skin on the torso
 * and the near arm, which a raised arm leaves on the figure's edge, takes her line there: her flat skin
 * tones (paintBodySkin) have no darker shade for the layers' outline pass to give it.
 */
function offBandeau(g: DrawCtx): void {
  const r = g.rig;
  const U = g.L('torso.under');
  if (!U.used) return;
  for (let i = 0; i < GRID * GRID; i++) {
    if (U.mat[i] < 0) continue;
    // up from the pelvis along the torso (rig units): the shorts reach 2.2 (body.ts), the bandeau is the bust's
    const dx = ((i % GRID) + 0.5) / RES - r.pelvis.x;
    const dy = (((i / GRID) | 0) + 0.5) / RES - r.pelvis.y;
    if (dx * r.up.x + dy * r.up.y > 3) U.mat[i] = -1;
  }
  const line = g.m(SAYA_LINE, 'flat');
  const skin = g.look.skin || SAYA_SKIN;
  const tones = [skin, retintHex(SAYA_SKIN_SHADOW, SAYA_SKIN, skin)];
  const bare = new Set(tones.flatMap((h) => [g.m(h, 'flat'), g.m(h, 'painted')]));
  for (const d of ['torso.body', 'nearArm.body'] as Depth[]) {
    const L = g.L(d);
    const edge = outlinedEdge(L);
    for (let i = 0; i < GRID * GRID; i++) if (edge[i] && bare.has(L.mat[i])) L.mat[i] = line;
  }
}

/**
 * Her shoulder held on the shoulder (drawShadeArmor) can stand on the figure's edge where her own line
 * does not run: a pixel of it beside nothing drawn in any layer takes her line. `under` is the layer
 * before the shoulder was stamped (the pixels that changed are the shoulder's).
 */
function lineOpenEdge(g: DrawCtx, A: Layer, under: Int16Array): void {
  const line = g.m(SAYA_LINE, 'flat');
  const layers = DEPTHS.map((d) => g.L(d)).filter((L) => L.used);
  const open = (x: number, y: number) => x < 0 || y < 0 || x >= GRID || y >= GRID || layers.every((L) => L.mat[y * GRID + x] < 0);
  const set: number[] = [];
  for (let i = 0; i < GRID * GRID; i++) {
    if (A.mat[i] < 0 || A.mat[i] === under[i] || A.mat[i] === line) continue;
    const x = i % GRID;
    const y = (i / GRID) | 0;
    if (open(x - 1, y) || open(x + 1, y) || open(x, y - 1) || open(x, y + 1)) set.push(i);
  }
  for (const i of set) A.mat[i] = line;
}

/** Our body's layers that hold its own skin. */
const SKIN_DEPTHS: Depth[] = ['farArm.body', 'nearArm.body', 'torso.body', 'neck', 'head.body', 'farLeg.body', 'nearLeg.body'];

/**
 * Our body's own skin, where it shows beside her pieces (the far shoulder, the neck, a hand), in her
 * skin's tones: she is painted in two, the player's skin and her shadow, in her black line; our female
 * body shades skin in a line, a deep shadow and a shadow of its own. So its line becomes hers and both
 * its shadows her one shadow (moved as far as the player moved her skin). Her forearms are sleeved in
 * her guards, which lie a pixel or two off our forearms: what shows of our forearm beside them is
 * painted in the guard's darkest navy, never as bare skin. So is our far upper arm while her far arm
 * hangs further out (`farOut`): his bare far shoulder is in her piece, and what shows of ours is the
 * gap between her far arm and her torso.
 */
function paintBodySkin(g: DrawCtx, cloth: string, farOut: boolean): void {
  const skin = g.look.skin || SAYA_SKIN;
  const line = g.m(SAYA_LINE, 'flat');
  // on the owner's bare body, in his 'painted' ramp: the outline pass still closes a bare edge off rest with his line
  const kind = g.bp.fit ? 'painted' : 'flat';
  const shadow = g.m(retintHex(SAYA_SKIN_SHADOW, SAYA_SKIN, skin), kind);
  const base = g.m(skin, kind);
  const sleeve = g.m(retintHex(SAYA_SLEEVE, SAYA_CLOTH, cloth), kind);
  const fore = [partIndex('forearmN'), partIndex('forearmF'), ...(farOut ? [partIndex('upperArmF')] : [])];
  const painted = paintedSkin(g);
  for (const d of SKIN_DEPTHS) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) {
      const sh = L.shade[i];
      if (L.mat[i] === g.skin) {
        L.mat[i] = sh <= 0 ? line : fore.includes(L.part[i]) ? sleeve : sh <= 2 ? shadow : base;
        continue;
      }
      // the owner's bare female body (body.ts drawBaseBody): his line, his skin's shades
      const k = painted.get(L.mat[i]);
      if (!k) continue;
      L.mat[i] = sh <= 0 || k === 'line' ? line : fore.includes(L.part[i]) ? sleeve : k === 'shadow' ? shadow : base;
    }
  }
}

/**
 * The materials of the owner's bare female body (body.ts drawBaseBody: his pieces in 'painted'
 * colours) that are his line or his skin, by colour: his line is near black, his skin warm (red well
 * over blue), lit as far as the player's skin or in shadow below it. His sports top and briefs (cool
 * greys) are not skin.
 */
function paintedSkin(g: DrawCtx): Map<number, 'line' | 'shadow' | 'base'> {
  const out = new Map<number, 'line' | 'shadow' | 'base'>();
  if (!g.bp.fit) return out;
  const lum = (hex: string) => {
    const [r, gg, b] = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
    return 0.299 * r + 0.587 * gg + 0.114 * b;
  };
  const skinLum = lum(g.look.skin || SAYA_SKIN);
  g.mats.ramps.forEach((ramp, m) => {
    if (g.mats.kinds[m] !== 'painted') return;
    const hex = ramp[3];
    const [r, gg, b] = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
    if (Math.max(r, gg, b) < 40) out.set(m, 'line');
    else if (r - b > 30 && r >= gg) out.set(m, lum(hex) >= skinLum * 0.9 ? 'base' : 'shadow');
  });
  return out;
}

/** The pixels a layer's outline pass will darken (Layer.applyOutline): its edge, next to an empty pixel. */
function outlinedEdge(L: Layer): Uint8Array {
  const edge = new Uint8Array(GRID * GRID);
  if (!L.outline) return edge;
  const empty = (x: number, y: number) => x < 0 || y < 0 || x >= GRID || y >= GRID || (L.mat[y * GRID + x] < 0 && !(L.flags[y * GRID + x] & F_NO_EDGE));
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const i = y * GRID + x;
      if (L.mat[i] < 0 || L.flags[i] & F_NO_OUTLINE) continue;
      if (empty(x, y - 1) || empty(x - 1, y) || empty(x + 1, y) || empty(x, y + 1)) edge[i] = 1;
    }
  }
  return edge;
}

type Zone = 'strap' | 'back' | 'band' | 'skin';

/** The glove zone `along` fine pixels from the wrist cell's middle toward the fingers, on that hand (null: bare). */
function gloveZone(zones: (typeof SAYA_GLOVE_ZONES)[keyof typeof SAYA_GLOVE_ZONES], along: number): Zone | null {
  let zone: Zone | null = null;
  for (const [from, z] of zones) if (along >= from) zone = z;
  return along < zones[0][0] ? null : zone;
}

const GLOVES_ID = 'hands_shade_fingerless';

/**
 * Her own fist on this hand, when the hand is a fist (holding her sword or not) on a female body: her
 * near glove or her far fist, his pixels, riding the forearm under its cuff as she drew them (the
 * near one pinned at the wrist, as her near forearm guard is; the far one at the elbow, as her far
 * forearm guard). A relaxed hand is one too: the owner's bare body closes it in his fist (body.ts
 * drawBaseBody), so her glove painted on our small hand picture lay off it with his fist round it.
 */
function ownFist(g: DrawCtx, s: Side): PaintedPiece | null {
  if (!isFemaleBody(g.rig.body)) return null;
  const { kind } = handPose(g, s);
  const closed = kind === 'fist' || (kind === 'relaxed' && !!g.bp.fit);
  if (s === 'N') return kind === 'grip' || closed ? SAYA_GLOVE_N : null;
  return closed ? SAYA_HAND_F : null;
}

/**
 * Where her sword's grip passes through her near glove (rig units), when she wears her gloves on a
 * female body: the middle of her fist (SAYA_GRIP_N, from the wrist the glove is pinned at), turned
 * with the forearm as the glove is, so the
 * fist closes round the grip with the pommel above it and the cup below. Null otherwise (the sword
 * then grips at the hand joint, as every weapon does).
 */
export function sayaGrip(g: DrawCtx): Vec | null {
  if (g.look.slots.hands?.id !== GLOVES_ID || !isFemaleBody(g.rig.body)) return null;
  const { elbow, wrist } = armJoints(g.rig, 'N');
  const a = ((segAngle(elbow, wrist) - SAYA_GLOVE_N.angle) * Math.PI) / 180;
  const [dx, dy] = SAYA_GRIP_N;
  const x = Math.floor(wrist.x * RES) + dx * Math.cos(a) - dy * Math.sin(a);
  const y = Math.floor(wrist.y * RES) + dx * Math.sin(a) + dy * Math.cos(a);
  return v((Math.round(x) + 0.5) / RES, (Math.round(y) + 0.5) / RES);
}

/**
 * Her fingerless gloves. A fist on a female body is her own (ownFist): our hand under it is taken
 * away and her fist stamped on the forearm. Any other hand is our hand picture, whatever the pose:
 * drawn as the body draws it, the pixels from the wrist to the knuckles painted in her glove (the
 * strap, the back of the hand, the red band) by how far they lie along the hand picture, each shade
 * one of her tones. The near hand's fingers past the band stay the body's own hand; the far hand is
 * only the strap, the hand in her own skin (in the player's skin).
 */
function drawShadeGloves(g: DrawCtx, glove: string, trim: string, skin: string): void {
  const tone = (hex: string, from: string, to: string) => g.m(retintHex(hex, from, to), 'flat');
  for (const s of ['F', 'N'] as Side[]) {
    const part: PartId = s === 'N' ? 'handN' : 'handF';
    const fist = ownFist(g, s);
    if (fist) {
      const body = g.L(armDepth(s, 'body'));
      const hand = partIndex(part);
      for (let i = 0; i < GRID * GRID; i++) {
        if (body.mat[i] >= 0 && body.part[i] === hand) {
          body.mat[i] = -1;
          body.flags[i] |= F_NO_EDGE;
        }
      }
      const { elbow, wrist } = armJoints(g.rig, s);
      // Her far fist, hanging at rest, lies over her skirt's flare: it is drawn over it, whole, as she shows it.
      const deg = segAngle(elbow, wrist);
      const atRest = s === 'F' && handPose(g, s).rot === 0 && deg > 45 && deg < 135;
      const at = s === 'F' ? add(elbow, sayaFarOut(g)) : wrist;
      stampPiece(g, atRest ? 'farHand.front' : armDepth(s, 'armor'), fist, at, deg, part, shadeColor(glove, trim, SAYA_PLATE, skin));
      continue;
    }
    const tmp = new Layer();
    handDraw(g, tmp, s, { mat: 0, part });
    // the far hand goes where her far arm hangs (sayaFarOut), as our far arm under it
    const out = s === 'F' ? sayaFarOut(g) : v(0, 0);
    const ox = Math.round(out.x * RES);
    const oy = Math.round(out.y * RES);
    const { kind, rot } = handPose(g, s);
    // an open or pointing near hand on a female body (his small hands) keeps its fingers bare below the band
    const zones = SAYA_GLOVE_ZONES[s === 'N' && isFemaleBody(g.rig.body) && (kind === 'open' || kind === 'point') ? 'Nopen' : s];
    const w = armJoints(g.rig, s).wrist;
    const wx = Math.floor(w.x * RES) + ox + 0.5;
    const wy = Math.floor(w.y * RES) + oy + 0.5;
    // Our hand pictures hang from the wrist (turned by `rot`); the cradling hand stands on it. His Lyra's
    // hands, reading and sitting (ownerHands.ts), point from the wrist the way he drew them.
    const a = (rot * Math.PI) / 180;
    const his = g.bp.fit ? ownerHand(g.rig.pose, g.rig.frame, s) : null;
    const [dx, dy] = his ? his.dir : kind === 'cradle' ? [0, -1] : [-Math.sin(a), Math.cos(a)];
    const T = SAYA_GLOVE_TONES;
    const strap = (s === 'N' ? T.strapN : T.strapF).map((h) => g.m(h, 'flat'));
    // her near glove is navy with a red band over the knuckles; her far hand is a bare fist under the strap
    const back = T.backN.map((h) => tone(h, SAYA_CLOTH, glove));
    const band = T.bandN.map((h) => tone(h, SAYA_TRIM, trim));
    const bare = T.skinF.map((h) => tone(h, SAYA_SKIN, skin));
    const tones: Record<Zone, number[]> = { strap, back, band, skin: bare };
    const L = g.L(armDepth(s, 'armor'));
    for (let i = 0; i < GRID * GRID; i++) {
      if (tmp.mat[i] < 0) continue;
      const x = (i % GRID) + ox;
      const y = ((i / GRID) | 0) + oy;
      const zone = gloveZone(zones, (x + 0.5 - wx) * dx + (y + 0.5 - wy) * dy);
      if (!zone) continue;
      L.set(x, y, tones[zone][Math.min(tmp.shade[i], 4)], 3, part, F_NO_TEXTURE | F_NO_OUTLINE);
    }
  }
}

export const SAYA_SHADE_ARMOR: ItemDef = {
  id: 'armor_crimson_shade',
  slot: 'armor',
  name: 'Crimson Shade Garb',
  desc: 'A sleeveless navy ninja top with a cream chest plate, red piping down the front, and navy arm guards banded in red (+2 AC). Women only.',
  colors: [col('cloth', 'Cloth', SAYA_CLOTH), col('trim', 'Trim', SAYA_TRIM), col('plate', 'Plate', SAYA_PLATE, 'metal')],
  statsArmor: 'Leaf Chunin Flak',
  bodies: ['female', 'slender'],
  draw: (g, [cloth, trim, plate]) => drawShadeArmor(g, cloth, trim, plate),
};

export const SAYA_SHADE_GLOVES: ItemDef = {
  id: 'hands_shade_fingerless',
  slot: 'hands',
  name: 'Shade Fingerless Gloves',
  desc: 'Fingerless gloves: a leather strap round the wrist, navy over the back of the hand with a red band over the knuckles (only the strap on the off hand).',
  colors: [col('main', 'Glove', SAYA_CLOTH), col('trim', 'Trim', SAYA_TRIM)],
  draw: (g, [glove, trim]) => drawShadeGloves(g, glove, trim, g.look.skin || SAYA_SKIN),
};
