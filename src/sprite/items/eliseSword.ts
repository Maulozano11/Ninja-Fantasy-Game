// Elise's sword (the Azure Rapier): her glowing gold blade under a gold swept hilt, drawn from the
// template tools/refs/elise-sword-from-ref.py lifts out of the owner's picture, with the gold
// sparkles he painted round the blade twinkling while it is held.

import type { Depth, DrawCtx } from '../ctx';
import type { Vec } from '../raster';
import { retintHex } from '../color';
import { drawPaintedWeapon } from './weapons';
import { ELISE_RAPIER, ELISE_SWORD_BLADE, ELISE_SWORD_GUARD } from './eliseSwordArt';

/** Her blade and sparkles turned from her blade gold, her pommel, bow and shell from her guard gold. */
const tintOf =
  (blade: string, guard: string) =>
  (ch: string, hex: string): string =>
    ELISE_RAPIER.blade.includes(ch) ? retintHex(hex, ELISE_SWORD_BLADE, blade) : ELISE_RAPIER.guard.includes(ch) ? retintHex(hex, ELISE_SWORD_GUARD, guard) : hex;

/**
 * Her sparkles as a template the size of the sword's, so they turn with it. Frame 0 shows every one
 * of hers (at rest the blade is as she painted it); each later frame hides a different third of
 * them, so they twinkle.
 */
const SPARK_PHASES = 3;
const sparkCache = new Map<number, typeof ELISE_RAPIER>();
function sparkTemplate(frame: number): typeof ELISE_RAPIER {
  const phase = frame === 0 ? -1 : frame % SPARK_PHASES;
  let t = sparkCache.get(phase);
  if (!t) {
    const rows = ELISE_RAPIER.rows.map((r) => r.replace(/./g, '.').split(''));
    ELISE_RAPIER.sparks.forEach(([x, y, ch], i) => {
      if (i % SPARK_PHASES !== phase) rows[y][x] = ch;
    });
    t = { ...ELISE_RAPIER, rows: rows.map((r) => r.join('')) };
    sparkCache.set(phase, t);
  }
  return t;
}

/** Draws her sword with its grip at `at` (rig units), the blade pointing along `deg`; `sparks` adds her glint. */
export function drawEliseRapier(g: DrawCtx, depth: Depth, at: Vec, deg: number, blade: string, guard: string, sparks: boolean): void {
  const tint = tintOf(blade, guard);
  drawPaintedWeapon(g, depth, ELISE_RAPIER, at, deg, tint);
  if (sparks) drawPaintedWeapon(g, depth, sparkTemplate(g.rig.frame), at, deg, tint);
}
