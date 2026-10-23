// Pure pieces of the round 1 jutsu staging (playback.ts round1; the owner's answers of 2026-10-21,
// docs/GAMEPLAY_DESIGN.md, "Jutsu effects, round 1"): where and when things go, kept apart from the
// drawing so npm test can check them. No images, no DOM.

import type { BattleEvent, Pt } from '../../battle/types';
import { POSE_FPS } from '../../sprite/rig';

/**
 * Whether the jutsu just played puts `effect` on its target: an effect event that turns it on
 * comes before the next jutsu, turn or move. A target that resists (the Sealing Chains' save) gets
 * none, and the screen must not show the seal closing on it.
 */
export function effectLands(queue: readonly BattleEvent[], effect: string): boolean {
  for (const e of queue) {
    if (e.t === 'effect' && e.effect === effect && e.on) return true;
    if (e.t === 'jutsu' || e.t === 'turn' || e.t === 'move') break;
  }
  return false;
}

/** How far (m) the Nirvana's vortex stays clear of the caster, and of the circle's edge. */
export const VORTEX_CLEAR = 2.5;
export const VORTEX_GAP = 1.2;

/**
 * Where the Temple of Nirvana's crow vortex opens (10A): beside the circle on the caster's side, as
 * in the approved mockup, unless that would put it on or behind the caster (a cast closer than
 * about 5 m): then on the far side, the crows diving back toward the middle.
 */
export function vortexAt(center: Pt, radius: number, caster: Pt, facing: number): Pt {
  const near = { x: center.x - facing * (radius + VORTEX_GAP), z: center.z };
  if ((near.x - caster.x) * facing >= VORTEX_CLEAR) return near;
  return { x: center.x + facing * (radius + VORTEX_GAP), z: center.z };
}

/**
 * The Crescent Moon's blows (9A), ms at speed 1: one every BLOW; each restarts the sword's 'attack'
 * pose WIND ms into its wind-up (so the raised blade still shows, briefly), and the crescent leaves
 * the blade at STRIKE, when the cut itself (the pose's frame 1) is on screen.
 */
export const CRESCENT = { BLOW: 250, WIND: 84, STRIKE: 90 } as const;

/** The 'attack' frame shown `ms` after a blow starts (CRESCENT; the battle's frame clock). */
export function crescentFrame(ms: number): number {
  return Math.floor(((ms + CRESCENT.WIND) / 1000) * POSE_FPS.attack);
}

/**
 * Where a Leaf Hurricane crescent sets off toward `to` (12A): out in front of the ninja on its way
 * there (0.8 m), not on its body.
 */
export function crescentStart(from: Pt, to: Pt, out = 0.8): Pt {
  const d = Math.hypot(to.x - from.x, to.z - from.z);
  if (d < 1e-6) return { ...from };
  const k = Math.min(out, d * 0.5) / d;
  return { x: from.x + (to.x - from.x) * k, z: from.z + (to.z - from.z) * k };
}
