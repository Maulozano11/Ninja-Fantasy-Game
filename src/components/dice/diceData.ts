// The d20's numbers the screens time things by, read from the art's manifest
// (src/assets/ui_dice/manifest.json, written by tools/ui/dice-d20.ts): how long the throw takes,
// when the die clicks onto its face, the natural 20 and natural 1 effects, and the critical's
// beats. No images here, so the battle's playback can use it. All times in ms at speed 1.

import manifest from '../../assets/ui_dice/manifest.json';

export const DICE = manifest;

export type DieSize = 'small' | 'big';

export interface ThrowFrame {
  dx: number;
  dy: number;
  ms: number;
  contact: number;
  ground: number;
}

export const THROW: Record<DieSize, ThrowFrame[]> = { small: manifest.throw.small, big: manifest.throw.big };
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
/** The whole throw, to the last wobble. */
export const THROW_MS = sum(THROW.small.map((f) => f.ms));
/** When the die stops on its face (the click): the result is known, the action can go on. */
export const CLICK_MS = sum(THROW.small.slice(0, manifest.diceSheet.clickFrame).map((f) => f.ms));
export const POP_MS = sum(manifest.diceSheet.popMs);
/** The natural 20's gold flash and the natural 1's crack (the small die's; the big one's are the same length). */
export const NAT20_MS = sum(manifest.fx.frames.ivory_small.nat20.map((f) => f.ms));
export const NAT1_MS = sum(manifest.fx.frames.ivory_small.nat1.map((f) => f.ms));
/** Results thrown in from the right (their dx is mirrored). */
export const FROM_RIGHT = new Set<number>(manifest.throw.fromRight);

/** When the ground contacts fall in the throw (ms), with their strength (3 the first, 1 the last). */
export const CONTACTS: { at: number; strength: number }[] = (() => {
  const out: { at: number; strength: number }[] = [];
  let t = 0;
  for (const f of THROW.small) {
    if (f.contact) out.push({ at: t, strength: f.contact });
    t += f.ms;
  }
  return out;
})();

/** The throw frame at `t` ms into the throw (the last frame holds). */
export function throwFrameAt(t: number): number {
  let acc = 0;
  for (let i = 0; i < THROW.small.length; i++) {
    acc += THROW.small[i].ms;
    if (t < acc) return i;
  }
  return THROW.small.length - 1;
}

/**
 * The big window of a critical or an important roll, from the moment the small die clicks onto
 * its face: the window opens, the banner, the readout, then the action goes on and it fades.
 */
export const WINDOW = { open: 100, banner: 180, readout: 300, go: 620, fade: 220 };
/** A critical's blow landing (the damage event): hit-stop, bloom, burst, the number, the end. */
export const IMPACT = { hitStop: 110, bloom: 70, burst: 30, number: 120, end: 900, numberLife: 1500 };
/** How long a landed die stays over the head after the action goes on, then fades. */
export const LINGER = { stay: 650, fade: 220 };

/** What a big window is for: a critical, a natural 1 on a save (a critical for the caster), a natural 20. */
export type WindowKind = 'crit' | 'fumble' | 'nat20';

/** How long a die's own show lasts (the throw, the pop, its natural's effect). */
export const dieShowMs = (nat?: 20 | 1): number => Math.max(THROW_MS + POP_MS, nat === 20 ? CLICK_MS + NAT20_MS : nat === 1 ? CLICK_MS + NAT1_MS : 0);
/** How long after it was thrown a die stays (then it fades over LINGER.fade). */
export const dieLife = (nat?: 20 | 1): number => dieShowMs(nat) + LINGER.stay;
