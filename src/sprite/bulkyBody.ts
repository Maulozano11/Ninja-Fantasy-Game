// The bulky body's skin, from the owner's broad man (docs/reference/bulky-owner-reference.jpg, 2026-10-21:
// "este seria la base para cuerpo masculino mas grueso"): his muscular arms, his pixels (bulkyBodyArt.ts),
// ride our arms over the shape our rig draws, each turning with its bone. At rest every pixel he drew is
// where he drew it; in his skin colour every pixel is his.

import { hexToRgb, hslToHex, rgbToHsl } from './color';
import { armJoints, DrawCtx, Side } from './ctx';
import { BULKY_FOREARM_F, BULKY_FOREARM_N, BULKY_SHOULDER_F, BULKY_SHOULDER_N, BULKY_SKIN, BULKY_SKIN_LINE, BULKY_UPPER_ARM_F, BULKY_UPPER_ARM_N } from './bulkyBodyArt';
import { segAngle, type PaintedPiece } from './painted';
import { add, F_NO_OUTLINE, F_NO_TEXTURE, F_OWNER, F_SEAL, Layer, lerp, PartId, sub, Vec } from './raster';
import { drawRig, turnPoint, type Rig } from './rig';
import type { BodyType } from './types';
import { stampTemplate, type TemplatePalette } from './rotsprite';

/**
 * A colour of the owner's skin in the character's skin: the hue turned and the saturation scaled from his
 * skin (`from`), the lightness scaled so that his skin lands exactly on the character's, his shadows
 * staying as far below it and his lights as far above. In his own skin, his colour; his black line stays.
 */
export function ownerSkin(hex: string, from: string, to: string): string {
  if (to.toLowerCase() === from.toLowerCase() || hex.toLowerCase() === BULKY_SKIN_LINE) return hex;
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
 * Where an owner's shoulder cap goes (the round of the shoulder, or a sleeve over it) and how it turns:
 * it rides halfway between the shoulder joint and where the shoulder sits on the chest at rest (carried
 * with the torso), and turns with the torso and part of the way the upper arm turns past it, as the
 * owner's pauldrons do. At rest it is where he drew it.
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

function stamp(g: DrawCtx, L: Layer, p: PaintedPiece, at: { x: number; y: number }, deg: number, part: PartId): void {
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(p.colors)) pal[ch] = [g.m(ownerSkin(hex, BULKY_SKIN, g.look.skin), 'flat'), 3];
  stampTemplate(L, p, at, deg - p.angle, pal, part, { flags: F_NO_TEXTURE | F_NO_OUTLINE | F_OWNER, seal: p.seal ? { rows: p.seal, flag: F_SEAL } : undefined });
}

/**
 * His arm over ours on side `s`: the forearm about the elbow, then the upper arm about the shoulder over
 * it (his elbow is drawn on the upper arm), then the round of his shoulder riding the shoulder.
 */
export function drawBulkyArm(g: DrawCtx, L: Layer, s: Side): void {
  const j = armJoints(g.rig, s);
  stamp(g, L, s === 'N' ? BULKY_FOREARM_N : BULKY_FOREARM_F, j.elbow, segAngle(j.elbow, j.wrist), s === 'N' ? 'forearmN' : 'forearmF');
  stamp(g, L, s === 'N' ? BULKY_UPPER_ARM_N : BULKY_UPPER_ARM_F, j.shoulder, segAngle(j.shoulder, j.elbow), s === 'N' ? 'upperArmN' : 'upperArmF');
  const cap = s === 'N' ? BULKY_SHOULDER_N : BULKY_SHOULDER_F;
  const { at, deg } = capPlace(g.rig, s, cap);
  stamp(g, L, cap, at, deg, s === 'N' ? 'upperArmN' : 'upperArmF');
}
