// Saya's sword (the Shade Saber): a steel blade with gold dots down its middle under a gold swept hilt,
// drawn from the template tools/refs/saya-sword-from-ref.py makes after the owner's picture, with the
// gold sparkles he painted round the blade twinkling while it is held.

import type { Depth, DrawCtx } from '../ctx';
import type { Vec } from '../raster';
import { retintHex } from '../color';
import { drawPaintedWeapon } from './weapons';
import { SAYA_SABER, SAYA_SABER_LEVEL, SAYA_SWORD_BLADE, SAYA_SWORD_GUARD, type SayaSword } from './sayaSwordArt';

/** Her blade and sparkles turned from her steel; her pommel, bow, cup rims and gold dots from her gold. */
const tintOf =
  (blade: string, guard: string) =>
  (ch: string, hex: string): string =>
    SAYA_SABER.blade.includes(ch) ? retintHex(hex, SAYA_SWORD_BLADE, blade) : SAYA_SABER.guard.includes(ch) ? retintHex(hex, SAYA_SWORD_GUARD, guard) : hex;

/**
 * Her sparkles as a template the size of the sword's, so they turn with it. Frame 0 shows every one of
 * them (at rest the blade is as drawn); each later frame hides a different third, so they twinkle.
 */
const SPARK_PHASES = 3;
const sparkCache = new Map<string, SayaSword>();
function sparkTemplate(sword: SayaSword, frame: number): SayaSword {
  const phase = frame === 0 ? -1 : frame % SPARK_PHASES;
  const key = `${sword.angle}@${phase}`;
  let t = sparkCache.get(key);
  if (!t) {
    const rows = sword.rows.map((r) => r.replace(/./g, '.').split(''));
    sword.sparks.forEach(([x, y, ch], i) => {
      if (i % SPARK_PHASES !== phase) rows[y][x] = ch;
    });
    t = { ...sword, rows: rows.map((r) => r.join('')) };
    sparkCache.set(key, t);
  }
  return t;
}

/**
 * The drawing to turn: the one whose turn is nearest a quarter turn (those are exact). Its blade is one
 * line of steel thick, so turned from 45 degrees to near level or upright it would break its line.
 */
function drawingFor(deg: number): SayaSword {
  const a = ((deg % 360) + 540) % 360 - 180;
  const off = (t: SayaSword) => {
    // As drawPaintedWeapon turns it: pointing left, the drawing is flipped and turned the other way.
    const turn = Math.abs(a) > 90 ? a + t.angle : a - t.angle;
    return Math.abs(turn - 90 * Math.round(turn / 90));
  };
  return off(SAYA_SABER_LEVEL) < off(SAYA_SABER) ? SAYA_SABER_LEVEL : SAYA_SABER;
}

/** Draws her sword with its grip at `at` (rig units), the blade pointing along `deg`; `sparks` adds her glint. */
export function drawSayaSaber(g: DrawCtx, depth: Depth, at: Vec, deg: number, blade: string, guard: string, sparks: boolean): void {
  const tint = tintOf(blade, guard);
  const sword = drawingFor(deg);
  drawPaintedWeapon(g, depth, sword, at, deg, tint);
  // The sparkles are an effect over the figure (depth 'top', as Lyra's sword's and Aurelia's staff's), apart
  // from it as he painted them, so the pass that takes stray specks away (holes.ts) leaves them.
  if (sparks) drawPaintedWeapon(g, 'top', sparkTemplate(sword, g.rig.frame), at, deg, tint);
}
