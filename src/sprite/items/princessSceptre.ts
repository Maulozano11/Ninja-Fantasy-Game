// The princess's sceptre (the Rose Dawn Sceptre): the owner's pixels at our scale, from the template
// tools/refs/princess-sceptre-from-ref.py lifts out of his picture of her, with the sparkles he drew
// round its head twinkling while it is held.

import type { Depth, DrawCtx } from '../ctx';
import type { Vec } from '../raster';
import { retintHex } from '../color';
import { drawPaintedWeapon } from './weapons';
import { PRINCESS_SCEPTRE_GEM, PRINCESS_SCEPTRE_GOLD, ROSE_SCEPTRE, ROSE_SCEPTRE_STRAIGHT, type RoseSceptre } from './princessSceptreArt';

/** His golds turned from his gold, the gem (and his pink sparkles) from his gem colour; his line stays his. */
const tintOf =
  (gold: string, gem: string) =>
  (ch: string, hex: string): string =>
    ROSE_SCEPTRE.gold.includes(ch) ? retintHex(hex, PRINCESS_SCEPTRE_GOLD, gold) : ROSE_SCEPTRE.gem.includes(ch) ? retintHex(hex, PRINCESS_SCEPTRE_GEM, gem) : hex;

/**
 * His sparkles as a template the size of the sceptre's, so they turn with it. Frame 0 shows every one
 * of his (at rest the sceptre is as he drew it); each later frame hides a different third of them, so
 * they twinkle.
 */
const SPARK_PHASES = 3;
const sparkCache = new Map<string, RoseSceptre>();
function sparkTemplate(piece: RoseSceptre, frame: number): RoseSceptre {
  const phase = frame === 0 ? -1 : frame % SPARK_PHASES;
  const key = `${piece === ROSE_SCEPTRE ? 'held' : 'straight'}:${phase}`;
  let t = sparkCache.get(key);
  if (!t) {
    const rows = piece.rows.map((r) => r.replace(/./g, '.').split(''));
    piece.sparks.forEach(([x, y, ch], i) => {
      if (i % SPARK_PHASES !== phase) rows[y][x] = ch;
    });
    t = { ...piece, rows: rows.map((r) => r.join('')) };
    sparkCache.set(key, t);
  }
  return t;
}

/**
 * At rest she holds it as he drew it, up in her far fist leaning right (her near hand is empty);
 * every other pose holds it in the near fist like a pole.
 */
export const roseSceptreInFarHand = (g: DrawCtx): boolean => g.rig.pose === 'idle' || g.rig.pose === 'idleSceptre';

/**
 * Draws her sceptre with its grip at `at` (rig units), its shaft pointing along `deg`; `sparks` adds his
 * sparkles. At his own angle it is drawn as he drew it; turned, from the straightened template (his
 * slanted one-pixel shaft would break into dashes).
 */
export function drawRoseSceptre(g: DrawCtx, depth: Depth, at: Vec, deg: number, gold: string, gem: string, sparks: boolean): void {
  const tint = tintOf(gold, gem);
  const piece = deg === ROSE_SCEPTRE.angle ? ROSE_SCEPTRE : ROSE_SCEPTRE_STRAIGHT;
  drawPaintedWeapon(g, depth, piece, at, deg, tint);
  if (sparks) drawPaintedWeapon(g, depth, sparkTemplate(piece, g.rig.frame), at, deg, tint);
}
