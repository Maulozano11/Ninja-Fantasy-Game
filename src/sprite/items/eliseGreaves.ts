// Elise's thigh-high white steel boots (the owner's Elise picture, 2026-10-21): her pixels brought down
// to our scale by tools/refs/elise-boots-from-ref.py (eliseGreavesArt.ts), riding the rig as the owner's
// sabatons do.

import { retintHex } from '../color';
import { DrawCtx, ItemDef, legDepth, legJoints, Side } from '../ctx';
import { PaintedPiece, segAngle, stampPiece } from '../painted';
import { add, F_NO_EDGE, GRID, partIndex, RES, scale, v, Vec } from '../raster';
import {
  AZURE_COP_F,
  AZURE_COP_N,
  AZURE_FOOT_F,
  AZURE_FOOT_N,
  AZURE_KIND,
  AZURE_LEATHER,
  AZURE_SHIN_F,
  AZURE_SHIN_N,
  AZURE_STEEL,
  AZURE_THIGH_F,
  AZURE_THIGH_N,
  AZURE_TRIM,
} from './eliseGreavesArt';

/**
 * Where a piece stamped about `at` along `deg` starts: the top edge of its first row and the piece's
 * own down, turned as stampPiece turns it (to the whole degree, as RotSprite does).
 */
function pieceTop(piece: PaintedPiece, at: Vec, deg: number): { at: Vec; down: Vec } {
  const r = (Math.round(deg - piece.angle) * Math.PI) / 180;
  const down = v(-Math.sin(r), Math.cos(r));
  const pivot = v((Math.floor(at.x * RES) + 0.5) / RES, (Math.floor(at.y * RES) + 0.5) / RES);
  return { at: add(pivot, scale(down, -(piece.pivot[1] + 0.5) / RES)), down };
}

/**
 * Takes the leg (skin and trousers) off below a boot's top: the thigh below the line through `cut.at`
 * across `cut.down`, the shin and the foot whole. The leg is not outlined along the cut, where the
 * boot's own top runs.
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

export const AZURE_GREAVES: ItemDef = {
  id: 'feet_azure_greaves',
  slot: 'feet',
  name: 'Azure Greaves',
  desc: 'Thigh-high white steel boots: brown leather cuffs rimmed in gold, round knee cops, gold-rimmed ankle guards and white sabatons.',
  colors: [
    { key: 'steel', label: 'Steel', default: AZURE_STEEL, kind: 'metal' },
    { key: 'leather', label: 'Leather', default: AZURE_LEATHER, kind: 'leather' },
    { key: 'trim', label: 'Trim', default: AZURE_TRIM, kind: 'metal' },
  ],
  bodies: ['female', 'slender'],
  draw: (g, [steel, leather, trim]) => {
    // Her boots from the owner's Elise picture, at our scale on our female leg: on each leg the cuff and
    // the greave over the thigh turn with the thigh about the knee, the greave over the shin with its
    // ankle guard turns with the shin about the ankle, the sabaton stays flat on the ground like our
    // feet, and the knee cop goes on last, turning with the shin about the knee over the joint. The leg
    // goes below the cuff (trousers tuck in); the thigh above it stays bare. Her steel, leather and gold
    // follow the colour slots; her black line and dark sole stay.
    const tint = (_ch: string, hex: string) => {
      const k = AZURE_KIND[hex];
      if (k === 'steel') return retintHex(hex, AZURE_STEEL, steel);
      if (k === 'leather') return retintHex(hex, AZURE_LEATHER, leather);
      if (k === 'gold') return retintHex(hex, AZURE_TRIM, trim);
      return hex;
    };
    for (const s of ['F', 'N'] as Side[]) {
      const { hip, knee, ankle } = legJoints(g.rig, s);
      const thighA = segAngle(hip, knee);
      const shinA = segAngle(knee, ankle);
      const [thigh, shin, foot, cop] = s === 'N' ? [AZURE_THIGH_N, AZURE_SHIN_N, AZURE_FOOT_N, AZURE_COP_N] : [AZURE_THIGH_F, AZURE_SHIN_F, AZURE_FOOT_F, AZURE_COP_F];
      legOffBelow(g, s, pieceTop(thigh, knee, thighA));
      const d = legDepth(s, 'feet');
      stampPiece(g, d, foot, ankle, foot.angle, `foot${s}`, tint);
      stampPiece(g, d, shin, ankle, shinA, `shin${s}`, tint);
      stampPiece(g, d, thigh, knee, thighA, `thigh${s}`, tint);
      stampPiece(g, d, cop, knee, shinA, `shin${s}`, tint);
    }
  },
};
