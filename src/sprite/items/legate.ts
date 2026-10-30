// The owner's Roman legate (docs/reference/roman-legate-owner-reference.jpg, 2026-10-24: "copia solo conjunto de
// pecho", "solo copia el de la derecha"): the right figure's chest set, each part its own creator option: his
// grey-steel cuirass with the gold eagle and spirals, his bronze pauldrons with their hanging straps and his dark
// red sleeves (below them our bare arm, in the character's skin). Brought down to our scale and cleaned in his
// palette (tools/refs/legate_ref.py), the set lying on our figure with his neck on ours, each piece turning whole
// about our joint in every pose (as his Roman general's: general.ts). Male bodies only (male, bulky).

import { type DrawCtx, type ItemDef, type Side } from '../ctx';
import type { PaintedPiece } from '../painted';
import { drawChest, drawPauldrons, drawSleevePieces } from './general';
import * as A from './legateArmsArt';
import * as C from './legateChestArt';

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });
const MEN = ['male', 'bulky'] as const;
type Kinds = Record<string, string>;

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
