// The bulky body, from the owner's bare broad man (docs/reference/bulky-base-owner-reference.jpg, 2026-10-21:
// "cuerpo fornido base sin camisa"): his body piece by piece (bulkyBaseArt.ts), each piece of his pixels
// riding one bone of our bulky rig, which stands on his joints. At rest every pixel of his body is where he
// drew it; in his skin colour every pixel is his; in any other pose each piece turns with its bone, and
// an edge of his that a pose bares is closed with his line (compose.ts).

import { hexToRgb, hslToHex, retintHex, rgbToHsl } from './color';
import { armDepth, armJoints, DrawCtx, handDraw, handPose, legDepth, legJoints, Side } from './ctx';
import { BULKY_BASE, BULKY_BASE_BRIEFS, BULKY_BASE_KIND, BULKY_BASE_SKIN } from './bulkyBaseArt';
import { segAngle, stretchPiece, type PaintedPiece } from './painted';
import { add, F_NO_OUTLINE, F_NO_TEXTURE, F_OWNER, F_SEAL, Layer, len, lerp, PartId, RES, sub, Vec } from './raster';
import { drawRig, turnPoint, type Rig } from './rig';
import type { BodyType } from './types';
import { stampTemplate, type TemplatePalette } from './rotsprite';

/**
 * A colour of the owner's skin in the character's skin: the hue turned and the saturation scaled from his
 * skin (`from`), the lightness scaled so that his skin lands exactly on the character's, his shadows
 * staying as far below it and his lights as far above. In his own skin, his colour; his black line stays.
 */
export function ownerSkin(hex: string, from: string, to: string): string {
  if (to.toLowerCase() === from.toLowerCase() || hex.toLowerCase() === '#000000') return hex;
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  const [h0, s0, l0] = rgbToHsl(...hexToRgb(from));
  const [h1, s1, l1] = rgbToHsl(...hexToRgb(to));
  const lt = l <= l0 ? (l * l1) / l0 : l1 + ((l - l0) * (1 - l1)) / (1 - l0);
  return hslToHex(h + (h1 - h0), Math.min(1, (s * s1) / Math.max(0.01, s0)), lt);
}

/** How much of the upper arm's turn a shoulder cap follows (his broad shoulder sits mostly on the torso). */
const CAP_FOLLOW = 0.3;

const IDLE = new Map<BodyType, Rig>();
const idleOf = (body: BodyType): Rig => {
  let r = IDLE.get(body);
  if (!r) IDLE.set(body, (r = drawRig(body, 'idle', 0)));
  return r;
};

/**
 * Where an owner's shoulder cap goes (a sleeve over the shoulder) and how it turns: it rides halfway
 * between the shoulder joint and where the shoulder sits on the chest at rest (carried with the torso), and
 * turns with the torso and part of the way the upper arm turns past it, as the owner's pauldrons do. At
 * rest it is where he drew it.
 */
export function capPlace(r: Rig, s: Side, p: PaintedPiece): { at: Vec; deg: number } {
  const idle = idleOf(r.body);
  const torso = segAngle(r.pelvis, r.neck);
  const torso0 = segAngle(idle.pelvis, idle.neck);
  const sh = s === 'N' ? r.shoulderN : r.shoulderF;
  const sh0 = s === 'N' ? idle.shoulderN : idle.shoulderF;
  const onChest = turnPoint(add(r.neck, sub(sh0, idle.neck)), r.neck, torso - torso0);
  const arm = segAngle(sh, s === 'N' ? r.elbowN : r.elbowF);
  const rest = p.angle - torso0;
  return { at: lerp(sh, onChest, 0.5), deg: torso + rest + CAP_FOLLOW * (((arm - torso - rest + 540) % 360) - 180) };
}

/** Past this lean (degrees from his picture) a piece riding the torso is turned with RotSprite; up to it, sheared. */
const LEAN_SHEAR = 20;

const FLAGS = F_NO_TEXTURE | F_NO_OUTLINE | F_OWNER;

/** His piece with its pivot on `at`, its bone pointing along `deg` (at his angle, every pixel his). */
function onBone(L: Layer, p: PaintedPiece, at: Vec, deg: number, pal: TemplatePalette, part: PartId): void {
  stampTemplate(L, p, at, deg - p.angle, pal, part, { flags: FLAGS, seal: p.seal ? { rows: p.seal, flag: F_SEAL } : undefined });
}

/** His piece riding the torso: a small lean shears it (each row moved across whole), a large one turns it. */
function onTorso(L: Layer, p: PaintedPiece, at: Vec, deg: number, pal: TemplatePalette, part: PartId): void {
  const d = deg - p.angle;
  if (Math.abs(d) > LEAN_SHEAR) {
    onBone(L, p, at, deg, pal, part);
    return;
  }
  const ax = Math.floor(at.x * RES) - p.pivot[0];
  const ay = Math.floor(at.y * RES) - p.pivot[1];
  const s = Math.sin((d * Math.PI) / 180);
  p.rows.forEach((row, j) => {
    const dx = -Math.round((j - p.pivot[1]) * s);
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') L.set(ax + i + dx, ay + j, pal[row[i]][0], 3, part, FLAGS | (p.seal?.[j]?.[i] === 'x' ? F_SEAL : 0));
  });
}

/** The boxer briefs' colour: the briefs item's slot when it is worn, his own grey otherwise. */
function briefsColour(g: DrawCtx): string {
  const b = g.look.slots.bottom;
  return b?.id === 'bottom_boxer_briefs' && b.colors?.[0] ? b.colors[0] : BULKY_BASE_BRIEFS;
}

/**
 * The owner's bare broad man on our bulky rig: the far arm, the far leg, the pelvis, the near leg, the
 * chest, the near arm, each piece on its bone. The pelvis (his briefs' waistband and seat) lies under the
 * near leg, so a raised near knee comes in front of his belly and briefs; it is drawn on the near leg's
 * layer, first, and clothes take it away there as on the torso's. His fists close the hands when they hang, grip or make a fist; an open,
 * pointing or cradling hand is our hand picture on his wrist, in his skin.
 */
export function drawBulkyBase(g: DrawCtx): void {
  const r = g.rig;
  const briefs = briefsColour(g);
  const pal = (p: PaintedPiece): TemplatePalette => {
    const out: TemplatePalette = {};
    for (const [ch, hex] of Object.entries(p.colors)) {
      const k = BULKY_BASE_KIND[hex];
      const c = k === 'line' ? hex : k === 'cloth' ? retintHex(hex, BULKY_BASE_BRIEFS, briefs) : ownerSkin(hex, BULKY_BASE_SKIN, g.look.skin);
      out[ch] = [g.m(c, 'flat'), 3];
    }
    return out;
  };
  const B = BULKY_BASE;
  const arm = (s: Side) => {
    const L = g.L(armDepth(s, 'body'));
    const j = armJoints(r, s);
    const up = s === 'N' ? B.upperArmN : B.upperArmF;
    const fore = s === 'N' ? B.forearmN : B.forearmF;
    const hand = s === 'N' ? B.handN : B.handF;
    onBone(L, up, j.shoulder, segAngle(j.shoulder, j.elbow), pal(up), s === 'N' ? 'upperArmN' : 'upperArmF');
    onBone(L, fore, j.elbow, segAngle(j.elbow, j.wrist), pal(fore), s === 'N' ? 'forearmN' : 'forearmF');
    const { kind } = handPose(g, s);
    if (kind === 'grip' || kind === 'fist' || kind === 'relaxed') {
      onBone(L, hand, j.wrist, segAngle(j.elbow, j.wrist), pal(hand), s === 'N' ? 'handN' : 'handF');
    } else {
      handDraw(g, L, s, { mat: g.skin, part: s === 'N' ? 'handN' : 'handF', bias: s === 'F' ? -1 : 0 });
    }
  };
  const leg = (s: Side) => {
    const L = g.L(legDepth(s, 'body'));
    const { hip, knee, ankle } = legJoints(r, s);
    const thigh = s === 'N' ? B.thighN : B.thighF;
    const shin = s === 'N' ? B.shinN : B.shinF;
    const foot = s === 'N' ? B.footN : B.footF;
    // A seated thigh longer than the body's (rig.ts kneeLeg): his thigh lengthened with it, rows of his
    // repeated between the hip and the knee (stretchPiece), so it still meets his shin at the knee.
    const bone = r.bp.thigh;
    const long = stretchPiece(thigh, (len(sub(knee, hip)) - bone) * RES, bone * RES);
    onBone(L, long, hip, segAngle(hip, knee), pal(long), s === 'N' ? 'thighN' : 'thighF');
    onBone(L, shin, knee, segAngle(knee, ankle), pal(shin), s === 'N' ? 'shinN' : 'shinF');
    onBone(L, foot, ankle, foot.angle, pal(foot), s === 'N' ? 'footN' : 'footF');
  };
  const lean = segAngle(r.pelvis, r.neck);
  arm('F');
  leg('F');
  onTorso(g.L(legDepth('N', 'body')), B.pelvis, r.pelvis, lean, pal(B.pelvis), 'torso');
  leg('N');
  onTorso(g.L('torso.body'), B.chest, r.neck, lean, pal(B.chest), 'torso');
  arm('N');
}
