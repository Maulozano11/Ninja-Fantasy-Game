// Saya's thigh-high wrapped leggings and armoured shoes (the owner's Saya picture at our game's scale,
// 2026-10-21): his pixels, the bugged weapons he drew over them taken out, by
// tools/refs/saya-legs-from-ref.py (sayaLegsArt.ts), riding the rig as the owner's sabatons do.

import { retintHex } from '../color';
import { DrawCtx, ItemDef, legDepth, legJoints, Side } from '../ctx';
import { PaintedPiece, segAngle, stampPiece } from '../painted';
import { add, F_NO_EDGE, F_NO_OUTLINE, F_NO_TEXTURE, GRID, norm, partIndex, RES, sub, v, Vec } from '../raster';
import {
  SHADE_BAND,
  SHADE_CLOTH,
  SHADE_FOOT_F,
  SHADE_FOOT_N,
  SHADE_KIND,
  SHADE_SHIN_F,
  SHADE_SHIN_N,
  SHADE_THIGH_F,
  SHADE_THIGH_N,
} from './sayaLegsArt';

/** Her main legging navy (sayaLegsArt.ts 'u'): the body's thigh under her legging is painted in it. */
const LEGGING = '#222238';

/**
 * Takes the leg (skin and trousers) off below the knee, the shin and the foot whole, and paints the
 * body's thigh where her legging covers it (from `reach` rig units above the knee down) in her legging's
 * navy, his line kept: at rest her legging lies over it; where a bent knee opens a gap between her
 * thigh's piece and her shin's, or her legging is narrower than our thigh, the legging shows, never
 * bare skin by the knee. `fill` is the navy's material.
 */
function leggingOnLeg(g: DrawCtx, s: Side, knee: Vec, up: Vec, reach: number, fill: number): void {
  const thigh = partIndex(`thigh${s}`);
  const shin = partIndex(`shin${s}`);
  const foot = partIndex(`foot${s}`);
  for (const d of [legDepth(s, 'body'), legDepth(s, 'cloth')]) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) {
      const p = L.part[i];
      if (L.mat[i] < 0 || (p !== thigh && p !== shin && p !== foot)) continue;
      if (p === thigh) {
        const dx = ((i % GRID) + 0.5) / RES - knee.x;
        const dy = (Math.floor(i / GRID) + 0.5) / RES - knee.y;
        const along = dx * up.x + dy * up.y;
        if (along > reach) continue;
        // above the knee: his line stays, the rest of the thigh is her legging; past the knee (the
        // round of the knee the shin's piece carries, turned with the shin) it goes with the shin
        if (along >= -0.5) {
          if (L.shade[i] > 0 && Math.max(...[1, 3, 5].map((k) => parseInt(g.mats.ramps[L.mat[i]][3].slice(k, k + 2), 16))) >= 40) L.mat[i] = fill;
          continue;
        }
      }
      L.mat[i] = -1;
      L.flags[i] |= F_NO_EDGE;
    }
  }
}

/**
 * Where the shoe hangs: from the ankle, moved as far as the middle of the wrapped shin's last row moves
 * when the shin turns from her pose about the ankle (the shin reaches a few pixels below our ankle, and
 * the ankle is at its back), so the shoe stays on the end of the shin: a leg stretched out (leaning on
 * a tree) keeps its shoe on the end of it, and a step back opens no row between them. At her angle it
 * is the ankle.
 */
function footAt(shin: PaintedPiece, ankle: Vec, deg: number): Vec {
  if (Math.abs(deg - shin.angle) < 0.5) return ankle;
  const last = shin.rows[shin.rows.length - 1];
  const cells = [...last].flatMap((ch, i) => (ch === '.' ? [] : [i]));
  const bx = (cells[0] + cells[cells.length - 1]) / 2 - shin.pivot[0];
  const by = shin.rows.length - 1 - shin.pivot[1];
  const a = ((deg - shin.angle) * Math.PI) / 180;
  const dx = bx * Math.cos(a) - by * Math.sin(a) - bx;
  const dy = bx * Math.sin(a) + by * Math.cos(a) - by;
  return add(ankle, v(dx / RES, dy / RES));
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

/**
 * Her legging's top, turned with the thigh, keeps only what lies on our thigh and the pixel round it:
 * its top row runs on past his skin where his thigh is wider, and turned across the thigh (seated,
 * striding) that end stood off the leg as a dark stick.
 */
function onOurThigh(g: DrawCtx, s: Side, d: Parameters<typeof stampPiece>[1]): void {
  const B = g.L(legDepth(s, 'body'));
  const L = g.L(d);
  const thigh = partIndex(`thigh${s}`);
  const near = new Uint8Array(GRID * GRID);
  for (let i = 0; i < GRID * GRID; i++) {
    if (B.mat[i] < 0 || B.part[i] !== thigh) continue;
    const x = i % GRID;
    const y = (i / GRID) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (x + dx >= 0 && y + dy >= 0 && x + dx < GRID && y + dy < GRID) near[(y + dy) * GRID + x + dx] = 1;
  }
  for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && L.part[i] === thigh && !near[i]) L.mat[i] = -1;
}

/**
 * Turned from his angles, her pieces can leave a single pixel open between them (at a bent knee, at the
 * ankle over the flat shoe) or in a turned line: an empty pixel with her pieces on three or four of its
 * sides is closed with his line, as the line runs there at rest.
 */
function closePinholes(g: DrawCtx, d: Parameters<typeof stampPiece>[1]): void {
  const L = g.L(d);
  const line = g.m(LINE, 'flat');
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= GRID || y >= GRID ? -1 : L.mat[y * GRID + x]);
  const close: [number, number, number][] = [];
  for (let y = 1; y < GRID - 1; y++) {
    for (let x = 1; x < GRID - 1; x++) {
      if (at(x, y) >= 0) continue;
      const n = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
      if (n.filter((m) => m >= 0).length < 3) continue;
      const from = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].find(([X, Y]) => at(X, Y) >= 0)!;
      close.push([x, y, L.part[from[1] * GRID + from[0]]]);
    }
  }
  for (const [x, y, part] of close) {
    const i = y * GRID + x;
    L.mat[i] = line;
    L.shade[i] = 3;
    L.part[i] = part;
    L.flags[i] = F_NO_TEXTURE | F_NO_OUTLINE;
  }
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
    // Her legs from the owner's Saya picture at our scale, on our female leg: the legging above the
    // knee turns with the thigh about the knee, the knee pad and the wrapped shin turn with the shin
    // about the ankle, and the shoe stays flat on the ground like our feet. The leg goes below the knee
    // (trousers tuck in). Her bare thighs between her skirt and her leggings are the body's own (the
    // owner's bare woman, whom his Saya stands as). His navy, red and the shoe's navy follow the colour
    // slots; his black line and brown sole stay.
    const tint = (main: string) => (_ch: string, hex: string) => {
      const k = SHADE_KIND[hex];
      if (k === 'cloth') return retintHex(hex, SHADE_CLOTH, main);
      if (k === 'band') return retintHex(hex, SHADE_BAND, band);
      return hex;
    };
    const leg = tint(cloth);
    const shoe = tint(boot);
    const navy = g.m(retintHex(LEGGING, SHADE_CLOTH, cloth), 'flat');
    for (const s of ['F', 'N'] as Side[]) {
      const { hip, knee, ankle } = legJoints(g.rig, s);
      const thighA = segAngle(hip, knee);
      const shinA = segAngle(knee, ankle);
      const [thigh, shin, foot] = s === 'N' ? [SHADE_THIGH_N, SHADE_SHIN_N, SHADE_FOOT_N] : [SHADE_THIGH_F, SHADE_SHIN_F, SHADE_FOOT_F];
      // her legging reaches as far above the knee as his thigh piece's top row
      leggingOnLeg(g, s, knee, norm(sub(hip, knee)), (thigh.pivot[1] + 0.5) / RES, navy);
      const d = legDepth(s, 'feet');
      stampClean(g, d, thigh, knee, thighA, `thigh${s}`, leg);
      if (Math.abs(thighA - thigh.angle) >= 0.5) onOurThigh(g, s, d);
      stampClean(g, d, shin, ankle, shinA, `shin${s}`, leg);
      stampPiece(g, d, foot, footAt(shin, ankle, shinA), foot.angle, `foot${s}`, shoe);
      // at rest every pixel is his
      if (Math.abs(thighA - thigh.angle) >= 0.5 || Math.abs(shinA - shin.angle) >= 0.5) closePinholes(g, d);
    }
  },
};
