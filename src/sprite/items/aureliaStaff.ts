// Aurelia's staff (the Dawn Staff): the owner's pixels at our scale, from the template
// tools/refs/aurelia-staff-from-ref.py lifts out of his game-scale picture of her, with the orb's
// sparkles he drew round it twinkling while it is held.

import type { Depth, DrawCtx } from '../ctx';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, partIndex, RES, v, type Vec } from '../raster';
import { drawRig } from '../rig';
import { isFemaleBody } from '../types';
import { stampTemplate, type TemplatePalette } from '../rotsprite';
import { retintHex } from '../color';
import { drawPaintedWeapon } from './weapons';
import { AURELIA_STAFF_GOLD, AURELIA_STAFF_ORB, DAWN_FAR_FIST, DAWN_STAFF, DAWN_STAFF_REST } from './aureliaStaffArt';

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
 * empty); every other pose holds it in the near fist like the naginata. His fist round it is drawn for her
 * (the female body's far fist at rest): on the male and bulky bodies the far fist hangs elsewhere and the
 * staff floated beside it, so there the near fist holds it at rest too.
 */
export const dawnStaffInFarHand = (g: DrawCtx): boolean => g.rig.pose === 'idle' && isFemaleBody(g.look.body);

/**
 * Our far fist's joint at rest, as at idle frame 0: as she breathes (the later idle frames raise the
 * chest and arms a pixel) the staff stays planted, so his fist round it never opens onto the panel
 * behind it; her cuff rides up over his fist's top line.
 */
const restFist = new Map<string, Vec>();
function restHandF(g: DrawCtx): Vec {
  let h = restFist.get(g.rig.body);
  if (!h) restFist.set(g.rig.body, (h = drawRig(g.rig.body, 'idle', 0).handF));
  return h;
}

/** Where the grip lies at rest: his place for it beside our far fist (DAWN_STAFF_REST). */
export function dawnStaffRest(g: DrawCtx): Vec {
  const h = restHandF(g);
  return v((Math.floor(h.x * RES) + DAWN_STAFF_REST[0] + 0.5) / RES, (Math.floor(h.y * RES) + DAWN_STAFF_REST[1] + 0.5) / RES);
}

/**
 * At rest her far fist is his, round the staff where he drew it (DAWN_FAR_FIST), in the body's skin: our far
 * fist (the female body's, which hangs a little lower and further out than his on her) and our wrist
 * below her cuff are taken away under it, so the fist, the shaft and her cuff are his picture. His fist is in front of her far panel.
 */
export function drawDawnFarFist(g: DrawCtx): void {
  // our far fist and the wrist below her cuff (her sleeve covers the rest of the forearm)
  const body = g.L('farArm.body');
  const ours = new Set([partIndex('handF'), partIndex('forearmF')]);
  for (let i = 0; i < GRID * GRID; i++) if (body.mat[i] >= 0 && ours.has(body.part[i])) body.mat[i] = -1;
  const h = restHandF(g);
  const at = v((Math.floor(h.x * RES) + DAWN_FAR_FIST.at[0] + 0.5) / RES, (Math.floor(h.y * RES) + DAWN_FAR_FIST.at[1] + 0.5) / RES);
  const pal: TemplatePalette = { o: [g.skin, 0], D: [g.skin, 1], s: [g.skin, 2], b: [g.skin, 3] };
  stampTemplate(g.L('farHand.front'), { pivot: [0, 0], rows: DAWN_FAR_FIST.rows }, at, 0, pal, 'handF', { flags: F_NO_OUTLINE | F_NO_TEXTURE });
}

/** Draws her staff with its grip at `at` (rig units), pointing along `deg`; `sparks` adds the orb's sparkles. */
export function drawDawnStaff(g: DrawCtx, depth: Depth, at: Vec, deg: number, gold: string, orb: string, sparks: boolean): void {
  const tint = tintOf(gold, orb);
  drawPaintedWeapon(g, depth, DAWN_STAFF, at, deg, tint);
  if (sparks) drawPaintedWeapon(g, depth, sparkTemplate(g.rig.frame), at, deg, tint);
}
