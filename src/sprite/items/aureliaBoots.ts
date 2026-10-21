// The owner's Aurelia (docs/reference/aurelia-escala-juego-owner-reference.jpg, drawn by him at our
// scale): her thigh-high white boots with gold lace tops and gold heeled shoes. His pixels one for one
// (items/aureliaBootsArt.ts, by tools/refs/aurelia-legs-from-ref.py), one painted piece per segment
// of the leg: the lace top and the boot over the knee turn with the thigh, the boot down the shin with
// the shin, and the shoe stays flat on the ground like our feet. In our female's idle pose every pixel
// is where the script lays it.

import { retintHex } from '../color';
import { type Depth, DrawCtx, ItemDef, legDepth, legJoints, Side } from '../ctx';
import { PaintedPiece, segAngle } from '../painted';
import { add, F_NO_EDGE, F_NO_OUTLINE, F_NO_TEXTURE, GRID, norm, type PartId, partIndex, RES, sub, v, Vec } from '../raster';
import { drawRig, type Rig } from '../rig';
import { rotateTemplate, stampTemplate, type TemplatePalette } from '../rotsprite';
import {
  DAWN_BOOT_CLOTH,
  DAWN_BOOT_CLOTH_CHARS,
  DAWN_BOOT_CUT,
  DAWN_BOOT_CUT_F,
  DAWN_BOOT_GOLD,
  DAWN_BOOT_GOLD_CHARS,
  DAWN_BOOT_SKIN,
  DAWN_FOOT_F,
  DAWN_FOOT_JOIN_F,
  DAWN_FOOT_JOIN_N,
  DAWN_FOOT_N,
  DAWN_SHIN_F,
  DAWN_SHIN_N,
  DAWN_THIGH_F,
  DAWN_THIGH_N,
} from './aureliaBootsArt';
import { closeOpen } from './aureliaVestment';

/**
 * Takes our leg (skin and trousers) off below the boot's lace top: the thigh below the line across it
 * `cut` fine pixels above the knee, the shin and the foot whole. The leg is not outlined along the cut,
 * where the lace top's own line runs.
 */
function legOffBelow(g: DrawCtx, s: Side, hip: Vec, knee: Vec, cut: number): void {
  const down = norm(sub(knee, hip));
  const thigh = partIndex(`thigh${s}`);
  const shin = partIndex(`shin${s}`);
  const foot = partIndex(`foot${s}`);
  for (const d of [legDepth(s, 'body'), legDepth(s, 'cloth')]) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) {
      const p = L.part[i];
      if (L.mat[i] < 0 || (p !== thigh && p !== shin && p !== foot)) continue;
      if (p === thigh) {
        const dx = ((i % GRID) + 0.5) / RES - knee.x;
        const dy = (Math.floor(i / GRID) + 0.5) / RES - knee.y;
        if ((dx * down.x + dy * down.y) * RES <= -cut) continue;
      }
      L.mat[i] = -1;
      L.flags[i] |= F_NO_EDGE;
    }
  }
}

/**
 * Stamps a piece as stampPiece does (at its angle every pixel is his), but his bare thigh in the slits
 * (DAWN_BOOT_SKIN letters) in the body's own skin at his shades, so it follows the player's skin.
 */
function stampBoot(g: DrawCtx, depth: Depth, piece: PaintedPiece, at: Vec, deg: number, part: PartId, color: (ch: string, hex: string) => string): void {
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(piece.colors)) pal[ch] = ch in DAWN_BOOT_SKIN ? [g.skin, DAWN_BOOT_SKIN[ch]] : [g.m(color(ch, hex), 'flat'), 3];
  stampTemplate(g.L(depth), piece, at, deg - piece.angle, pal, part, { flags: F_NO_TEXTURE | F_NO_OUTLINE });
}

/**
 * Takes our torso's skin away where a boot lies: the torso is drawn over the legs, and between the
 * thighs its lowest skin would cover his lace top and his bare thigh in the slit. Not outlined there.
 */
function torsoOffBoot(g: DrawCtx, boot: Uint8Array): void {
  const L = g.L('torso.body');
  if (!L.used) return;
  for (let i = 0; i < GRID * GRID; i++) {
    if (!boot[i] || L.mat[i] !== g.skin) continue;
    L.mat[i] = -1;
    L.flags[i] |= F_NO_EDGE;
  }
}

/**
 * How far the shoe moves off the ankle when the shin turns `deg` from its angle at rest: the shoe follows
 * where the shin's piece ends (`join`, fine pixels from the ankle at rest), which turns with the shin,
 * across only: its sole stays as far under the ankle as at rest, as our flat foot's does, so the boot
 * stands on the ground where our foot does (the shin's piece reaches on under the shoe). At rest it does
 * not move.
 */
function shoeShift(join: [number, number], deg: number): Vec {
  const r = (Math.round(deg) * Math.PI) / 180;
  const [x, y] = join;
  return v((x * Math.cos(r) - y * Math.sin(r) - x) / RES, 0);
}

/** Marks in `out` the fine pixels a painted piece covers when stampPiece stamps it. */
function cover(out: Uint8Array, piece: PaintedPiece, at: Vec, deg: number): void {
  const ax = Math.floor(at.x * RES);
  const ay = Math.floor(at.y * RES);
  for (const p of rotateTemplate(piece, deg - piece.angle)) {
    const x = ax + p.dx;
    const y = ay + p.dy;
    if (x >= 0 && y >= 0 && x < GRID && y < GRID) out[y * GRID + x] = 1;
  }
}

/** How far round the knee (fine pixels) closeKnee looks. */
const KNEE_REACH = 6;

/**
 * Closes the boot round a bending knee: the thigh's piece ends open at the knee (his boot runs on into
 * the shin there), so when the shin folds away a pixel of the boot by the knee that is not his line and
 * touches a pixel outside the boot takes his line. At rest the shin's piece meets the thigh's and his
 * own line already closes the boot, so nothing changes.
 */
function closeKnee(g: DrawCtx, s: Side, boot: Uint8Array, knee: Vec): void {
  const L = g.L(legDepth(s, 'feet'));
  const line = g.m(DAWN_THIGH_N.colors.k, 'flat');
  const kx = Math.floor(knee.x * RES);
  const ky = Math.floor(knee.y * RES);
  const close: number[] = [];
  for (let y = Math.max(1, ky - KNEE_REACH); y <= Math.min(GRID - 2, ky + KNEE_REACH); y++) {
    for (let x = Math.max(1, kx - KNEE_REACH); x <= Math.min(GRID - 2, kx + KNEE_REACH); x++) {
      const i = y * GRID + x;
      if (!boot[i] || L.mat[i] < 0 || L.mat[i] === line) continue;
      if (!boot[i - 1] || !boot[i + 1] || !boot[i - GRID] || !boot[i + GRID]) close.push(i);
    }
  }
  for (const i of close) L.mat[i] = line;
}

/** Our female at idle frame 0, where his boots were laid. */
let restRig: Rig | null = null;
const rest = (): Rig => (restRig ??= drawRig('female', 'idle', 0));

/**
 * Where the far boot is stamped from: our far ankle, moved up as the far foot comes forward in depth. At
 * rest our far ankle stands higher than the near one (the far foot further back), and his far boot,
 * laid where he drew it, reaches that much further below it to his far sole. As the far ankle comes
 * level with the near one, or below it (a lunge, leaning, a stride with the near foot up), the boot rises
 * as much, so its sole stays on our far sole's ground instead of going through it; with the far foot
 * further back or lifted higher than at rest (a step), it hangs as at rest.
 */
function farBootAt(r: Rig, ankle: Vec): Vec {
  const r0 = rest();
  const lift = r0.ankleN.y - r0.ankleF.y;
  const back = Math.max(0, Math.min(lift, r.ankleN.y - r.ankleF.y));
  return v(ankle.x, ankle.y - (lift - back));
}

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });

/** The feet slot's entry (items/feet.ts FEET_ITEMS). */
export const FEET_DAWN_BOOTS: ItemDef = {
  id: 'feet_dawn_boots',
  slot: 'feet',
  name: 'Dawn Boots',
  desc: 'Thigh-high white boots with gold lace tops, a gold seam down the front and gold heeled shoes. Women only.',
  colors: [col('cloth', 'Cloth', DAWN_BOOT_CLOTH), col('gold', 'Gold', DAWN_BOOT_GOLD, 'metal')],
  bodies: ['female', 'slender'],
  draw: (g, [cloth, gold]) => {
    // His whites, creams and greys follow Cloth and his golds follow Gold, each shade as far from the
    // slot's colour as his was from his own; his black line and his brown soles and heel stay.
    const tint = (ch: string, hex: string) =>
      DAWN_BOOT_CLOTH_CHARS.includes(ch) ? retintHex(hex, DAWN_BOOT_CLOTH, cloth) : DAWN_BOOT_GOLD_CHARS.includes(ch) ? retintHex(hex, DAWN_BOOT_GOLD, gold) : hex;
    // On each leg (far first, behind): our leg goes below the lace top; the shin's piece turns with the
    // shin about the ankle, reaching under the shoe and under the thigh's piece; the shoe stays flat,
    // hanging where the shin's piece ends; the lace top and the boot over the knee turn with the thigh
    // about the knee, on top; and the boot is closed round a bending knee. The far boot is his narrow
    // column beside her front panel, laid where he drew it: its lace top rides the far thigh, the rest
    // the far shin, and our far thigh goes from its lace top down.
    for (const s of ['F', 'N'] as Side[]) {
      const { hip, knee, ankle } = legJoints(g.rig, s);
      const [thigh, shin, foot, join, cut] = s === 'N' ? [DAWN_THIGH_N, DAWN_SHIN_N, DAWN_FOOT_N, DAWN_FOOT_JOIN_N, DAWN_BOOT_CUT] : [DAWN_THIGH_F, DAWN_SHIN_F, DAWN_FOOT_F, DAWN_FOOT_JOIN_F, DAWN_BOOT_CUT_F];
      legOffBelow(g, s, hip, knee, cut);
      const d = legDepth(s, 'feet');
      const shinA = segAngle(knee, ankle);
      const thighA = segAngle(hip, knee);
      const at = s === 'F' ? farBootAt(g.rig, ankle) : ankle;
      const footAt = add(at, shoeShift(join, shinA - shin.angle));
      stampBoot(g, d, shin, at, shinA, `shin${s}`, tint);
      stampBoot(g, d, foot, footAt, foot.angle, `foot${s}`, tint);
      if (thigh) stampBoot(g, d, thigh, knee, thighA, `thigh${s}`, tint);
      const boot = new Uint8Array(GRID * GRID);
      cover(boot, shin, at, shinA);
      cover(boot, foot, footAt, foot.angle);
      if (thigh) cover(boot, thigh, knee, thighA);
      closeKnee(g, s, boot, knee);
      torsoOffBoot(g, boot);
      // turned, an edge of his boot left open is closed in his line (at rest his line closes it)
      const turned = Math.abs(shinA - shin.angle) >= 0.5 || (thigh && Math.abs(thighA - thigh.angle) >= 0.5) || footAt.x !== at.x;
      if (turned) closeOpen(g, d, boot, DAWN_THIGH_N.colors.k);
    }
  },
};
