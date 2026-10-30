// The owner's Roman legate (docs/reference/roman-legate-owner-reference.jpg, 2026-10-24: "copia solo conjunto de
// pecho", "solo copia el de la derecha"): the right figure's chest set, each part its own creator option: his
// grey-steel cuirass with the gold eagle and spirals, his bronze pauldrons with their hanging straps and his dark
// red sleeves (below them our bare arm, in the character's skin). Brought down to our scale and cleaned in his
// palette (tools/refs/legate_ref.py), the set lying on our figure with his neck on ours, each piece turning whole
// about our joint in every pose (as his Roman general's: general.ts). Male bodies only (male, bulky).

import { DEPTHS, type Depth, type DrawCtx, type ItemDef, type Side } from '../ctx';
import type { PaintedPiece } from '../painted';
import { GRID, type Layer, partIndex, RES } from '../raster';
import { drawChest, drawPauldrons, drawSleevePieces } from './general';
import * as A from './legateArmsArt';
import * as C from './legateChestArt';

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });
const MEN = ['male', 'bulky'] as const;
type Kinds = Record<string, string>;

/** How wide (fine pixels) a seam between the cuirass and an arm is closed. */
const SEAM = 4;

/**
 * The cuirass joined to the arms: his cuirass is cut to our male torso, and on the bulky body, whose torso is
 * wider, a seam of background opened between its edge and the near arm's sleeve and pauldron (the owner,
 * 2026-10-30, his circle on the bulky figures). Once the whole figure is drawn, each row's background between
 * an arm piece and the cuirass's edge, up to SEAM wide, becomes the cuirass: his line at the new edge against
 * the arm, his plate between, his old edge line taking the plate beside it. On the bulky body only: on the
 * male his cuirass is cut to the torso, and the slit of background at the armpit is the arm's own. Only
 * beside his sleeve or his pauldron: below the sleeve the bare arm hangs free of the cuirass's side, whose
 * curve stays his (the owner, 2026-10-30, his red curve along the side: not a wall to the arm).
 */
function closeArmSeams(g: DrawCtx, layers: ReadonlyMap<Depth, Layer>, lines: Set<number>): void {
  const armor = layers.get('torso.armor');
  if (g.rig.body !== 'bulky' || !armor?.used) return;
  const covered = new Uint8Array(GRID * GRID);
  for (const d of DEPTHS) {
    const l = layers.get(d);
    if (!l?.used) continue;
    for (let i = 0; i < GRID * GRID; i++) if (l.mat[i] >= 0) covered[i] = 1;
  }
  const arms: Record<Side, Layer[]> = { N: [], F: [] };
  for (const [d, l] of layers) if (l.used && /^(near|far)Arm\.(cloth|armor)$/.test(d)) arms[d.startsWith('near') ? 'N' : 'F'].push(l);
  const torso = partIndex('torso');
  const y0 = Math.floor(Math.min(g.rig.neck.y, g.rig.pelvis.y) * RES);
  const y1 = Math.ceil(Math.max(g.rig.neck.y, g.rig.pelvis.y) * RES);
  for (let y = y0; y <= y1; y++) {
    for (let x = SEAM + 1; x < GRID - SEAM - 1; x++) {
      const i = y * GRID + x;
      if (covered[i] || armor.mat[i] >= 0) continue;
      // the near arm lies to the left of the cuirass, the far arm to its right
      for (const [s, dir] of [['N', 1], ['F', -1]] as [Side, number][]) {
        let edge = -1;
        for (let k = 1; k <= SEAM; k++) if (armor.mat[i + dir * k] >= 0) { edge = k; break; }
        if (edge < 0) continue;
        if (![...Array(SEAM).keys()].some((k) => arms[s].some((l) => l.mat[i - dir * (k + 1)] >= 0))) continue;
        // the gap from this pixel to the cuirass's edge, and his plate past the edge's line
        let plate = -1;
        for (let k = edge; k <= edge + 4; k++) { const m = armor.mat[i + dir * k]; if (m >= 0 && !lines.has(m)) { plate = m; break; } }
        if (plate < 0) continue;
        const line = [...lines][0];
        for (let k = 0; k < edge; k++) { const j = i + dir * k; armor.mat[j] = plate; armor.part[j] = torso; }
        if (lines.has(armor.mat[i + dir * edge])) armor.mat[i + dir * edge] = plate;
        armor.mat[i] = line;
        break;
      }
    }
  }
}

export const LEGATE_ITEMS: ItemDef[] = [
  {
    id: 'armor_legate',
    slot: 'armor',
    name: "Legate's Eagle Cuirass",
    desc: 'A grey-steel cuirass with a gold eagle and gold spirals, painted by the owner for his Roman legate (+4 AC).',
    colors: [col('steel', 'Steel', C.LEGATE_STEEL, 'metal'), col('gold', 'Gold', C.LEGATE_GOLD, 'metal')],
    statsArmor: 'Roman Legionary Segmentata',
    bodies: [...MEN],
    draw: (g, [s, gold]) => {
      const steel = [C.LEGATE_STEEL, s] as [string, string];
      drawChest(g, C.LEGATE_CHEST, C.LEGATE_CHEST_KIND, { grey: steel, hair: steel, purple: steel, warm: [C.LEGATE_GOLD, gold] });
      const lines = new Set(Object.entries(C.LEGATE_CHEST_KIND).filter(([, k]) => k === 'line').map(([hex]) => g.m(hex, 'flat')));
      g.after((layers) => closeArmSeams(g, layers, lines));
    },
  },
  {
    id: 'acc_legate_pauldrons',
    slot: 'accessory',
    name: "Legate's Pauldrons",
    desc: 'Layered bronze pauldrons with hanging straps, painted by the owner for his Roman legate.',
    colors: [col('bronze', 'Bronze', A.LEGATE_PAULDRON_BRONZE, 'metal')],
    bodies: [...MEN],
    draw: (g, [c]) =>
      drawPauldrons(g, [
        ['F', A.LEGATE_PAULDRON_F, A.LEGATE_PAULDRON_F_KIND],
        ['N', A.LEGATE_PAULDRON_N, A.LEGATE_PAULDRON_N_KIND],
      ], { warm: [A.LEGATE_PAULDRON_BRONZE, c] }),
  },
  {
    id: 'top_legate_sleeves',
    slot: 'top',
    name: "Legate's Sleeves",
    desc: 'Short dark red tunic sleeves on the upper arms, painted by the owner for his Roman legate.',
    colors: [col('cloth', 'Cloth', A.LEGATE_SLEEVE_RED)],
    bodies: [...MEN],
    draw: (g, [c]) => {
      const red = [A.LEGATE_SLEEVE_RED, c] as [string, string];
      drawSleevePieces(g, { N: [A.LEGATE_SLEEVE_N, A.LEGATE_SLEEVE_N_KIND as Kinds], F: [A.LEGATE_SLEEVE_F, A.LEGATE_SLEEVE_F_KIND as Kinds] } as Record<Side, [PaintedPiece, Kinds]>, { warm: red, purple: red, red });
    },
  },
];
