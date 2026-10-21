// Saya's thigh-high wrapped leggings and armoured shoes (the owner's Saya picture at our game's scale,
// 2026-10-21): his pixels, the bugged weapons he drew over them taken out, by
// tools/refs/saya-legs-from-ref.py (sayaLegsArt.ts), riding the rig as the owner's sabatons do.

import { retintHex } from '../color';
import { DrawCtx, ItemDef, legDepth, legJoints, Side } from '../ctx';
import { PaintedPiece, segAngle, stampPiece } from '../painted';
import { add, F_NO_EDGE, GRID, norm, partIndex, RES, sub, v, Vec } from '../raster';
import {
  SHADE_BAND,
  SHADE_CLOTH,
  SHADE_FOOT_F,
  SHADE_FOOT_N,
  SHADE_KIND,
  SHADE_SHIN_F,
  SHADE_SHIN_N,
  SHADE_SKIN,
  SHADE_SKIN_F,
  SHADE_SKIN_N,
  SHADE_THIGH_F,
  SHADE_THIGH_N,
} from './sayaLegsArt';

/**
 * Takes the leg (skin and trousers) off below the knee: the thigh below the line through the knee
 * across the thigh, the shin and the foot whole. The thigh above stays under her legging, so where
 * her turned pieces do not quite meet our leg shows through and not a hole. The leg is not outlined
 * along the cut, where her knee pad runs.
 */
function legOffBelow(g: DrawCtx, s: Side, cut: { at: Vec; down: Vec }): void {
  const thigh = partIndex(`thigh${s}`);
  const shin = partIndex(`shin${s}`);
  const foot = partIndex(`foot${s}`);
  for (const d of [legDepth(s, 'body'), legDepth(s, 'cloth')]) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) {
      const p = L.part[i];
      if (L.mat[i] < 0 || (p !== thigh && p !== shin && p !== foot)) continue;
      if (p === thigh) {
        const dx = ((i % GRID) + 0.5) / RES - cut.at.x;
        const dy = (Math.floor(i / GRID) + 0.5) / RES - cut.at.y;
        if (dx * cut.down.x + dy * cut.down.y <= 0) continue;
      }
      L.mat[i] = -1;
      L.flags[i] |= F_NO_EDGE;
    }
  }
}

/**
 * Stamps her bare thigh into the body's layer, but only over our thigh and the two pixels beside it:
 * at rest every pixel of hers is kept (her thigh is a little wider than ours), and when the leg turns
 * far from her pose none of it hangs off our thigh.
 */
function stampOnThigh(g: DrawCtx, s: Side, piece: PaintedPiece, at: Vec, deg: number, color: (ch: string, hex: string) => string): void {
  const L = g.L(legDepth(s, 'body'));
  const thigh = partIndex(`thigh${s}`);
  const near = new Uint8Array(GRID * GRID);
  for (let i = 0; i < GRID * GRID; i++) {
    if (L.mat[i] < 0 || L.part[i] !== thigh) continue;
    const x = i % GRID;
    const y = Math.floor(i / GRID);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const X = x + dx;
      const Y = y + dy;
      if (X >= 0 && Y >= 0 && X < GRID && Y < GRID) near[Y * GRID + X] = 1;
    }
  }
  const mat = L.mat.slice();
  const shade = L.shade.slice();
  const part = L.part.slice();
  const flags = L.flags.slice();
  stampPiece(g, legDepth(s, 'body'), piece, at, deg, `thigh${s}`, color);
  for (let i = 0; i < GRID * GRID; i++) {
    if (near[i]) continue;
    L.mat[i] = mat[i];
    L.shade[i] = shade[i];
    L.part[i] = part[i];
    L.flags[i] = flags[i];
  }
}

/**
 * Where the shoe hangs: from the ankle, moved with the bottom of the wrapped shin (which reaches a few
 * pixels below our ankle) as the shin turns from her pose, so a leg stretched out (leaning on a tree)
 * keeps its shoe on the end of it. At her angle it is the ankle.
 */
function footAt(shin: PaintedPiece, ankle: Vec, deg: number): Vec {
  if (Math.abs(deg - shin.angle) < 0.5) return ankle;
  const reach = Math.max(0, shin.rows.length - shin.pivot[1] - 0.5) / RES;
  const [a0, a1] = [(shin.angle * Math.PI) / 180, (deg * Math.PI) / 180];
  return add(ankle, v(reach * (Math.cos(a1) - Math.cos(a0)), reach * (Math.sin(a1) - Math.sin(a0))));
}

/** His black line (the pieces' 'k'). */
const LINE = '#010102';

/**
 * Stamps a piece and then takes away the line pixels it left loose: turned far from his angle
 * (the shin laid level against a tree), RotSprite can leave single line pixels hanging off the
 * outline with nothing of the leg beside them. A line pixel of this stamp with no pixel of the leg's
 * colours (anything but the line) among its eight neighbours is not an outline of anything, and goes.
 */
function stampClean(g: DrawCtx, d: Parameters<typeof stampPiece>[1], piece: PaintedPiece, at: Vec, deg: number, part: Parameters<typeof stampPiece>[5], color: (ch: string, hex: string) => string): void {
  if (Math.abs(deg - piece.angle) < 0.5) {
    stampPiece(g, d, piece, at, deg, part, color);
    return;
  }
  const L = g.L(d);
  const before = L.mat.slice();
  stampPiece(g, d, piece, at, deg, part, color);
  const line = g.m(LINE, 'flat');
  const loose: number[] = [];
  for (let i = 0; i < GRID * GRID; i++) {
    if (L.mat[i] !== line || before[i] === line) continue;
    const x = i % GRID;
    const y = (i / GRID) | 0;
    let fill = false;
    for (let dy = -1; dy <= 1 && !fill; dy++) {
      for (let dx = -1; dx <= 1 && !fill; dx++) {
        const X = x + dx;
        const Y = y + dy;
        if ((dx || dy) && X >= 0 && Y >= 0 && X < GRID && Y < GRID && L.mat[Y * GRID + X] >= 0 && L.mat[Y * GRID + X] !== line) fill = true;
      }
    }
    if (!fill) loose.push(i);
  }
  for (const i of loose) L.clear(i % GRID, (i / GRID) | 0);
}

export const SHADE_WRAPS: ItemDef = {
  id: 'feet_shade_wraps',
  slot: 'feet',
  name: 'Shade Wraps',
  desc: 'Thigh-high navy leggings wound with red bands, round knee pads rimmed in red, and armoured navy shoes with red trim.',
  colors: [
    { key: 'cloth', label: 'Cloth', default: SHADE_CLOTH, kind: 'cloth' },
    { key: 'band', label: 'Band', default: SHADE_BAND, kind: 'cloth' },
    { key: 'boot', label: 'Boot', default: SHADE_CLOTH, kind: 'cloth' },
  ],
  bodies: ['female', 'slender'],
  draw: (g, [cloth, band, boot]) => {
    // Her legs from the owner's Saya picture at our scale, on our female leg: on the near leg the bare
    // thigh and the legging above the knee turn with the thigh about the knee (on the far leg, shorter
    // than his, they lie under her skirt's hem below our knee, so they turn with the shin), the knee
    // pad and the wrapped shin turn with the shin about the ankle, and the shoe stays flat on the
    // ground like our feet. The leg goes below the knee (trousers tuck in). The bare thigh is drawn into the
    // body's layer over our thigh, in our skin, so trousers still cover it. His navy, red and the shoe's navy follow
    // the colour slots; his black line and brown sole stay.
    const tint = (main: string) => (_ch: string, hex: string) => {
      const k = SHADE_KIND[hex];
      if (k === 'cloth') return retintHex(hex, SHADE_CLOTH, main);
      if (k === 'band') return retintHex(hex, SHADE_BAND, band);
      if (k === 'skin') return retintHex(hex, SHADE_SKIN, g.look.skin);
      return hex;
    };
    const leg = tint(cloth);
    const shoe = tint(boot);
    for (const s of ['F', 'N'] as Side[]) {
      const { hip, knee, ankle } = legJoints(g.rig, s);
      const thighA = segAngle(hip, knee);
      const shinA = segAngle(knee, ankle);
      const [skin, thigh, shin, foot] = s === 'N' ? [SHADE_SKIN_N, SHADE_THIGH_N, SHADE_SHIN_N, SHADE_FOOT_N] : [SHADE_SKIN_F, SHADE_THIGH_F, SHADE_SHIN_F, SHADE_FOOT_F];
      const upperA = s === 'N' ? thighA : shinA;
      legOffBelow(g, s, { at: knee, down: norm(sub(knee, hip)) });
      stampOnThigh(g, s, skin, knee, upperA, leg);
      const d = legDepth(s, 'feet');
      stampClean(g, d, thigh, knee, upperA, `thigh${s}`, leg);
      stampClean(g, d, shin, ankle, shinA, `shin${s}`, leg);
      stampPiece(g, d, foot, footAt(shin, ankle, shinA), foot.angle, `foot${s}`, shoe);
    }
  },
};
