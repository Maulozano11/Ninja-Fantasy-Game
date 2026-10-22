// Lyra's sword (the Gilded Rapier): the owner's steel swept hilt with gold collar, shell and tips and
// a cyan gem, and his long blade glowing cyan, from the template tools/refs/lyra-sword-from-ref.py
// lifts out of his picture of her at our scale, with the cyan sparkles he drew round the blade
// twinkling while it is held.

import type { Depth, DrawCtx } from '../ctx';
import type { Vec } from '../raster';
import { retintHex } from '../color';
import { drawPaintedWeapon } from './weapons';
import { LYRA_RAPIER, LYRA_SWORD_BLADE, LYRA_SWORD_GUARD } from './lyraSwordArt';

/** His blade, sparkles and gem turned from his blade cyan, his collar, shell and tips from his guard gold; steel and line stay his. */
const tintOf =
  (blade: string, guard: string) =>
  (ch: string, hex: string): string =>
    LYRA_RAPIER.blade.includes(ch) ? retintHex(hex, LYRA_SWORD_BLADE, blade) : LYRA_RAPIER.guard.includes(ch) ? retintHex(hex, LYRA_SWORD_GUARD, guard) : hex;

/**
 * His sparkles as a template the size of the sword's, so they turn with it. Frame 0 shows every one
 * of his (at rest the blade is as he drew it); each later frame hides a different third of them, so
 * they twinkle.
 */
const SPARK_PHASES = 3;
const sparkCache = new Map<number, typeof LYRA_RAPIER>();
function sparkTemplate(frame: number): typeof LYRA_RAPIER {
  const phase = frame === 0 ? -1 : frame % SPARK_PHASES;
  let t = sparkCache.get(phase);
  if (!t) {
    const w = Math.max(...LYRA_RAPIER.rows.map((r) => r.length), ...LYRA_RAPIER.sparks.map(([x]) => x + 1));
    const h = Math.max(LYRA_RAPIER.rows.length, ...LYRA_RAPIER.sparks.map(([, y]) => y + 1));
    const rows = Array.from({ length: h }, () => Array<string>(w).fill('.'));
    LYRA_RAPIER.sparks.forEach(([x, y, ch], i) => {
      if (i % SPARK_PHASES !== phase) rows[y][x] = ch;
    });
    t = { ...LYRA_RAPIER, rows: rows.map((r) => r.join('')) };
    sparkCache.set(phase, t);
  }
  return t;
}

/** Draws his sword with its grip at `at` (rig units), the blade pointing along `deg`; `sparks` adds his glint. */
export function drawLyraRapier(g: DrawCtx, depth: Depth, at: Vec, deg: number, blade: string, guard: string, sparks: boolean): void {
  const tint = tintOf(blade, guard);
  drawPaintedWeapon(g, depth, LYRA_RAPIER, at, deg, tint);
  // The sparkles are an effect over the figure (depth 'top'), apart from it as he painted them.
  if (sparks) drawPaintedWeapon(g, 'top', sparkTemplate(g.rig.frame), at, deg, tint);
}
