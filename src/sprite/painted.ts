// Pieces painted by the owner (his pixels and colours, lifted out of his pictures by tools/refs/*.py)
// that ride the rig: each is drawn as he drew it when its limb points the way it did in his picture,
// and turned with RotSprite as the limb turns in other poses.

import type { Depth, DrawCtx } from './ctx';
import { add, F_NO_OUTLINE, F_NO_TEXTURE, PartId, RES, sub, v, Vec } from './raster';
import { drawRig, type Rig } from './rig';
import { PixelTemplate, stampTemplate, TemplatePalette } from './rotsprite';

export interface PaintedPiece extends PixelTemplate {
  /** One character per colour of his; '.' is empty. */
  colors: Record<string, string>;
  /** The angle (screen degrees, 0 = right, + = clockwise) of the limb it rides, in his picture. */
  angle: number;
}

/** The screen angle in degrees of the segment from `a` to `b` (0 = right, + = clockwise). */
export const segAngle = (a: Vec, b: Vec): number => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;

/**
 * Stamps a painted piece with its pivot on `at`, its limb now pointing along `deg`: at his angle
 * every pixel is his. `color` recolours a character's colour (for the item's colour slots).
 */
export function stampPiece(g: DrawCtx, depth: Depth, piece: PaintedPiece, at: Vec, deg: number, part: PartId, color?: (ch: string, hex: string) => string): void {
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(piece.colors)) pal[ch] = [g.m(color ? color(ch, hex) : hex, 'flat'), 3];
  stampTemplate(g.L(depth), piece, at, deg - piece.angle, pal, part, { flags: F_NO_TEXTURE | F_NO_OUTLINE });
}

/** A painted leg's own joints at rest: fine pixels of the idle frame (where the owner drew them). */
export interface PaintedLeg {
  hip: [number, number];
  knee: [number, number];
  ankle: [number, number];
}

const IDLE = new Map<string, Rig>();

/**
 * Where a leg the owner painted on a figure of other proportions than our body's has its joints now:
 * his hip goes with our hip, his knee hangs off it along his own thigh turned as our thigh has turned
 * from rest, his ankle off his knee along his own shin turned as our shin has. At rest they are his
 * joints, so pieces pinned on them land where he drew them, and his boots stay on his shins in every
 * pose. (When our body is rebuilt to his proportions, his joints are ours and this is our leg.)
 */
export function hisLeg(r: Rig, leg: PaintedLeg, side: 'N' | 'F'): { hip: Vec; knee: Vec; ankle: Vec } {
  let idle = IDLE.get(r.body);
  if (!idle) IDLE.set(r.body, (idle = drawRig(r.body, 'idle', 0)));
  const j = (q: Rig) => (side === 'N' ? { hip: q.hipN, knee: q.kneeN, ankle: q.ankleN } : { hip: q.hipF, knee: q.kneeF, ankle: q.ankleF });
  const now = j(r);
  const rest = j(idle);
  const P = (p: [number, number]): Vec => v(p[0] / RES, p[1] / RES);
  const turn = (d: Vec, deg: number): Vec => {
    const a = (deg * Math.PI) / 180;
    return v(d.x * Math.cos(a) - d.y * Math.sin(a), d.x * Math.sin(a) + d.y * Math.cos(a));
  };
  const hip = add(now.hip, sub(P(leg.hip), rest.hip));
  const knee = add(hip, turn(sub(P(leg.knee), P(leg.hip)), segAngle(now.hip, now.knee) - segAngle(rest.hip, rest.knee)));
  const ankle = add(knee, turn(sub(P(leg.ankle), P(leg.knee)), segAngle(now.knee, now.ankle) - segAngle(rest.knee, rest.ankle)));
  return { hip, knee, ankle };
}
