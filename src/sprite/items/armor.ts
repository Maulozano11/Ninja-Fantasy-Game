// Body armor. Each armor maps to a legacy armor style for its AC bonus
// (`statsArmor`), so gameplay stats keep working.

import { DrawCtx, fillTorso, ItemDef } from '../ctx';
import { capsule, Pen, poly, seam, v } from '../raster';

const col = (key: string, label: string, def: string, kind: 'cloth' | 'leather' | 'metal' = 'cloth') => ({ key, label, default: def, kind });

export function armorPen(g: DrawCtx, hex: string, kind: 'cloth' | 'leather' | 'metal' = 'cloth', part: Pen['part'] = 'torso', bias = 0): Pen {
  return { mat: g.m(hex, kind), part, bias };
}

/** Rectangle on the torso in torso-local coords (x along shoulders, y up from hips). */
export function torsoRect(g: DrawCtx, L: Parameters<typeof poly>[0], x0: number, y0: number, x1: number, y1: number, pen: Pen, shade?: number): void {
  const T = g.rig.T;
  poly(L, [T(x0, y1), T(x1, y1), T(x1, y0), T(x0, y0)], pen, shade);
}

export const ARMOR_ITEMS: ItemDef[] = [
  {
    id: 'armor_none',
    slot: 'armor',
    name: 'No Armor',
    desc: 'Unarmored for maximum mobility.',
    colors: [],
    statsArmor: 'Ronin Wanderer Cloak',
    draw: () => {},
  },
  {
    id: 'armor_flak',
    slot: 'armor',
    name: 'Field Flak Vest',
    desc: 'Padded tactical vest with chest scroll pouches and a rolled collar (+2 AC).',
    colors: [col('main', 'Vest', '#55703a')],
    statsArmor: 'Leaf Chunin Flak',
    draw: (g, [c]) => {
      const b = g.bp;
      const L = g.L('torso.armor');
      const pen = armorPen(g, c);
      fillTorso(g, L, 1.2, pen, { top: b.torsoLen - 0.4, bottom: 1.2 });
      const T = g.rig.T;
      // Chest pouches (front side faces right)
      torsoRect(g, L, 0.4, b.torsoLen - 9.5, b.chestHalf * 0.58, b.torsoLen - 5.5, pen, 4);
      seam(L, T(0.4, b.torsoLen - 5.5), T(b.chestHalf * 0.58, b.torsoLen - 5.5), -2);
      seam(L, T(0.4, b.torsoLen - 9.6), T(b.chestHalf * 0.58, b.torsoLen - 9.6), -2);
      // Center zip & lower seam
      seam(L, T(1, b.torsoLen - 1), T(1, 1.4), -2);
      seam(L, T(-b.waistHalf, 3), T(b.waistHalf * 0.6, 3), -1);
      // Rolled collar
      const r = g.rig;
      capsule(g.L('neck'), r.neck, v(r.neck.x + 0.2, r.neck.y - 2), b.neckW + 2.2, b.neckW + 1.8, pen);
    },
  },
];

export const SKIRT_ITEMS: ItemDef[] = [];
