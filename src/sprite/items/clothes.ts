// Tops, bottoms, skirts, waist pieces and hand wear.

import { armSpan, DrawCtx, fillTorso, ItemDef, legSpan, Side } from '../ctx';
import { capsule, F_NO_OUTLINE, Pen, px, seam, v } from '../raster';

const col = (key: string, label: string, def: string, kind: 'cloth' | 'leather' | 'metal' = 'cloth') => ({ key, label, default: def, kind });

export function clothPen(g: DrawCtx, hex: string, part: Pen['part'], bias = 0, kind: 'cloth' | 'leather' | 'metal' = 'cloth'): Pen {
  return { mat: g.m(hex, kind), part, bias };
}

/** Sleeves on both arms from 0 (shoulder) to `to` (2 = wrist). */
export function sleeves(g: DrawCtx, hex: string, to: number, inflate = 0.5, kind: 'cloth' | 'leather' | 'metal' = 'cloth'): void {
  for (const s of ['F', 'N'] as Side[]) {
    const L = g.L(s === 'N' ? 'nearArm.cloth' : 'farArm.cloth');
    const bias = s === 'F' ? -1 : 0;
    armSpan(g, L, s, 0, Math.min(1, to), inflate, clothPen(g, hex, s === 'N' ? 'upperArmN' : 'upperArmF', bias, kind));
    if (to > 1) armSpan(g, L, s, 1, to, inflate, clothPen(g, hex, s === 'N' ? 'forearmN' : 'forearmF', bias, kind));
  }
}

/** Trousers on both legs from 0 (hip) to `to` (2 = ankle), plus the seat on the torso. */
export function trousers(g: DrawCtx, hex: string, to: number, inflate = 0.4, waistTop = 3): void {
  fillTorso(g, g.L('torso.bottom'), 0.4, clothPen(g, hex, 'torso'), { top: waistTop });
  for (const s of ['F', 'N'] as Side[]) {
    const L = g.L(s === 'N' ? 'nearLeg.cloth' : 'farLeg.cloth');
    const bias = s === 'F' ? -1 : 0;
    legSpan(g, L, s, 0, Math.min(1, to), inflate, clothPen(g, hex, s === 'N' ? 'thighN' : 'thighF', bias));
    if (to > 1) legSpan(g, L, s, 1, to, inflate * 0.8, clothPen(g, hex, s === 'N' ? 'shinN' : 'shinF', bias));
  }
}

/** Collar that wraps the neck (drawn in the neck depth, over the torso). */
export function highCollar(g: DrawCtx, hex: string, height = 3, width = 0.8): void {
  const r = g.rig;
  const L = g.L('neck');
  const top = v(r.head.x - 0.4, r.head.y + 7 - height + 1);
  capsule(L, r.neck, top, g.bp.neckW + width + 0.4, g.bp.neckW + width, clothPen(g, hex, 'torso'));
}

export const TOP_ITEMS: ItemDef[] = [
  {
    id: 'top_tee',
    slot: 'top',
    name: 'Training Tee',
    desc: 'Short-sleeved cotton shirt with a round collar.',
    colors: [col('main', 'Shirt', '#e8e2d4')],
    draw: (g, [c]) => {
      fillTorso(g, g.L('torso.top'), 0.5, clothPen(g, c, 'torso'), { bottom: 1.2 });
      sleeves(g, c, 0.5, 0.6);
    },
  },
  {
    id: 'top_highcollar',
    slot: 'top',
    name: 'High-Collar Shirt',
    desc: 'Short-sleeved shirt with a tall wrapped collar.',
    colors: [col('main', 'Shirt', '#1e2a4a'), col('trim', 'Trim', '#e5e7eb')],
    draw: (g, [c, t]) => {
      const L = g.L('torso.top');
      fillTorso(g, L, 0.5, clothPen(g, c, 'torso'), { bottom: 1.2 });
      fillTorso(g, L, 0.5, clothPen(g, t, 'torso'), { top: 2.2, bottom: 1.2 });
      sleeves(g, c, 0.55, 0.6);
      highCollar(g, c, 4, 1);
    },
  },
];

export const BOTTOM_ITEMS: ItemDef[] = [
  {
    id: 'bottom_shinobi',
    slot: 'bottom',
    name: 'Shinobi Pants',
    desc: 'Fitted trousers with bandage wraps at the ankles.',
    colors: [col('main', 'Pants', '#2b3346'), col('wrap', 'Wraps', '#e7e1d1')],
    draw: (g, [c, w]) => {
      trousers(g, c, 1.8);
      for (const s of ['F', 'N'] as Side[]) {
        const L = g.L(s === 'N' ? 'nearLeg.cloth' : 'farLeg.cloth');
        legSpan(g, L, s, 1.62, 1.95, 0.35, clothPen(g, w, s === 'N' ? 'shinN' : 'shinF', s === 'F' ? -1 : 0));
      }
    },
  },
];

export const WAIST_ITEMS: ItemDef[] = [];
export const HAND_ITEMS: ItemDef[] = [];

void seam;
void px;
void F_NO_OUTLINE;
