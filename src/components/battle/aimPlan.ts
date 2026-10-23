// Which way a jutsu's art points when it is aimed off the horizontal (the owner, 2026-10-22: "yes,
// jutsu art should turn to follow where it is aimed"; the characters stay side-view). Pure: angles,
// angle buckets, which wall sheet, where the dragon stands. No images, no DOM, so npm test checks it.
//
// The battle is drawn 57 px a metre across and 38 px a metre of depth (map.px), so a direction on the
// ground looks flatter on the screen: the art turns by the angle it has on the screen, not on the
// ground. Effects are drawn facing right and mirrored to face left; a turn is measured on the
// right-facing art (+ = clockwise, down the screen), then mirrored with it.

import type { Pt } from '../../battle/types';

/** The map's projection (map.px): px a metre across and a metre of depth. */
export interface Proj {
  perM: number;
  perMDepth: number;
}

/** Turned art is cached every AIM_STEP degrees (RotSprite is too slow to run every frame). */
export const AIM_STEP = 15;

const DEG = 180 / Math.PI;

/**
 * The angle (degrees) on the screen of a ground direction (dx, dz) metres, for art facing right:
 * 0 straight across, -90 straight into the depth (up the screen), 90 straight toward the camera.
 * A leftward direction gives the angle of its mirror image (the art is mirrored to face left).
 */
export function screenDeg(px: Proj, dx: number, dz: number): number {
  const X = Math.abs(dx) * px.perM;
  const Y = dz * px.perMDepth;
  if (X === 0 && Y === 0) return 0;
  return Math.atan2(Y, X) * DEG;
}

/** The bucket an angle falls in (every `step` degrees), held within ±max. Never -0. */
export function aimBucket(deg: number, step = AIM_STEP, max = 90): number {
  const m = Math.floor(max / step) * step;
  const b = Math.max(-m, Math.min(m, Math.round(deg / step) * step));
  return b === 0 ? 0 : b;
}

/**
 * How art aimed from `from` to `to` on the ground is drawn: turned `deg` degrees (a bucket, at most
 * `max` either way) and mirrored when it goes left. `left` is the caller's own rule for facing left
 * (the effects have always used theirs: kept, so an effect aimed straight across draws as before).
 * Aimed straight across (or within half a bucket of it), deg is 0: the art is drawn unturned.
 */
export function aimTurn(px: Proj, from: Pt, to: Pt, left: boolean, max = 90, step = AIM_STEP): { deg: number; mirror: boolean } {
  return { deg: aimBucket(screenDeg(px, to.x - from.x, to.z - from.z), step, max), mirror: left };
}

/**
 * How far an upright creature may tilt toward where it goes (degrees): one that runs on the ground
 * (the lightning hound, the stone drake, the chakra griffin at a gallop) leans a little and keeps its
 * feet under it while its path carries it up or down the screen; one that flies (bird, phoenix,
 * water dragon, crows, snake in the air) banks further. Never all the way round: a beast upside down
 * or standing on its tail reads wrong.
 */
export const BEAST_TILT: Record<string, number> = { lightning: 15, earth: 15, chakra: 15, fire: 45, wind: 45, water: 45, genjutsu: 45, poison: 30 };

/** The three ways a wall sheet stands: across the screen, at 45 degrees on the ground (3/4), into the depth. */
export type WallSheet = 'wall' | 'wall_diag' | 'wall_depth';

/**
 * The wall sheet whose direction on the screen is closest to a wall running from `a` to `b` on the
 * ground (wall_diag is drawn at 45 degrees on the ground: atan(38/57), about 34 degrees on the screen),
 * and whether it is mirrored: the 3/4 sheet runs from a near-left end to a far-right end ("/"),
 * mirrored for "\".
 */
export function wallSheet(px: Proj, a: Pt, b: Pt): { name: WallSheet; mirror: boolean } {
  const ang = Math.atan2(Math.abs(b.z - a.z) * px.perMDepth, Math.abs(b.x - a.x) * px.perM) * DEG;
  const diag = Math.atan2(px.perMDepth, px.perM) * DEG;
  const name: WallSheet = ang < diag / 2 ? 'wall' : ang > (diag + 90) / 2 ? 'wall_depth' : 'wall_diag';
  const [l, r] = a.x <= b.x ? [a, b] : [b, a];
  return { name, mirror: name === 'wall_diag' && l.z < r.z };
}

/**
 * How a side-view band (a sheet whose length runs across it: the Great Annihilation's fire) is laid
 * along a ground direction `dirDeg`, drawn facing right: each px of its length moves (sx, sy) px on
 * the screen, its columns kept upright (flames rise straight up whatever way they run). A band run
 * straight into the depth would fold into one column: it keeps at least `minX` px across for each px
 * of its length, so it leans toward the side it faces. `mirror`: it runs to the left.
 */
export function bandStep(px: Proj, dirDeg: number, minX = 0.35): { sx: number; sy: number; mirror: boolean } {
  const r = dirDeg / DEG;
  const c = Math.cos(r);
  return { sx: Math.max(minX, Math.abs(c)), sy: (px.perMDepth / px.perM) * Math.sin(r), mirror: c < -1e-9 };
}

/**
 * Where the Dragon Flame Annihilation's flame wall and the dragon's mouth stand (the owner's answer
 * 1A: behind the ninja, the dragon rising out of the wall toward the cone): `back` and `mouth` metres
 * behind the ninja along the aim, `lift` m further back in depth. Aimed straight across (within half
 * a bucket on the screen) they stand where they always have, behind the ninja's facing. The depth
 * they are drawn at keeps them behind the ninja even when "behind" is nearer the camera (a cone aimed
 * up the screen), so the ninja is drawn over them.
 */
export function dragonPlace(px: Proj, from: Pt, dirDeg: number | null, facing: number, back: number, mouth: number, lift: number): { wall: Pt; mouth: Pt; depth: number; aim: { dx: number; dz: number } } {
  const r = ((dirDeg ?? (facing > 0 ? 0 : 180)) * Math.PI) / 180;
  const ux = Math.cos(r);
  const uz = Math.sin(r);
  if (dirDeg === null || aimBucket(screenDeg(px, ux, uz)) === 0) {
    const wall = { x: from.x - facing * back, z: from.z - lift };
    return { wall, mouth: { x: from.x - facing * mouth, z: from.z - lift }, depth: wall.z, aim: { dx: facing, dz: 0 } };
  }
  const wall = { x: from.x - ux * back, z: from.z - uz * back - lift };
  return { wall, mouth: { x: from.x - ux * mouth, z: from.z - uz * mouth - lift }, depth: Math.min(wall.z, from.z - lift), aim: { dx: ux, dz: uz } };
}
