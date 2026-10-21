// Aurelia's staff (the Dawn Staff): the owner's pixels at our scale, from the template
// tools/refs/aurelia-staff-from-ref.py lifts out of his game-scale picture of her, with the orb's
// sparkles he drew round it twinkling while it is held.

import type { Depth, DrawCtx } from '../ctx';
import type { Vec } from '../raster';
import { retintHex } from '../color';
import { drawPaintedWeapon } from './weapons';
import { AURELIA_STAFF_GOLD, AURELIA_STAFF_ORB, DAWN_STAFF } from './aureliaStaffArt';

/** His golds turned from his gold, the orb and its sparkles from his orb colour; the shaft, the collar and his line stay his. */
const tintOf =
  (gold: string, orb: string) =>
  (ch: string, hex: string): string =>
    DAWN_STAFF.gold.includes(ch) ? retintHex(hex, AURELIA_STAFF_GOLD, gold) : DAWN_STAFF.orb.includes(ch) ? retintHex(hex, AURELIA_STAFF_ORB, orb) : hex;

/**
 * His sparkles as a template the size of the staff's, so they turn with it. Frame 0 shows every one
 * of his (at rest the staff is as he drew it); each later frame hides a different third of them, so
 * they twinkle.
 */
const SPARK_PHASES = 3;
const sparkCache = new Map<number, typeof DAWN_STAFF>();
function sparkTemplate(frame: number): typeof DAWN_STAFF {
  const phase = frame === 0 ? -1 : frame % SPARK_PHASES;
  let t = sparkCache.get(phase);
  if (!t) {
    const rows = DAWN_STAFF.rows.map((r) => r.replace(/./g, '.').split(''));
    DAWN_STAFF.sparks.forEach(([x, y, ch], i) => {
      if (i % SPARK_PHASES !== phase) rows[y][x] = ch;
    });
    t = { ...DAWN_STAFF, rows: rows.map((r) => r.join('')) };
    sparkCache.set(phase, t);
  }
  return t;
}

/**
 * At rest she holds it as he drew it, hanging from her far fist down to the right (her near hand is
 * empty); every other pose holds it in the near fist like the naginata.
 */
export const dawnStaffInFarHand = (g: DrawCtx): boolean => g.rig.pose === 'idle';

/** Draws her staff with its grip at `at` (rig units), pointing along `deg`; `sparks` adds the orb's sparkles. */
export function drawDawnStaff(g: DrawCtx, depth: Depth, at: Vec, deg: number, gold: string, orb: string, sparks: boolean): void {
  const tint = tintOf(gold, orb);
  drawPaintedWeapon(g, depth, DAWN_STAFF, at, deg, tint);
  if (sparks) drawPaintedWeapon(g, depth, sparkTemplate(g.rig.frame), at, deg, tint);
}
