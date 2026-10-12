// Footwear. Boots cover the lower shin and the whole foot.

import { DrawCtx, footPoly, ItemDef, legSpan, Side } from '../ctx';
import { Pen, poly, seam, v } from '../raster';

const col = (key: string, label: string, def: string, kind: 'cloth' | 'leather' | 'metal' = 'leather') => ({ key, label, default: def, kind });

export function bootPen(g: DrawCtx, hex: string, s: Side, part: 'shin' | 'foot', kind: 'cloth' | 'leather' | 'metal' = 'leather'): Pen {
  return { mat: g.m(hex, kind), part: `${part}${s}` as Pen['part'], bias: s === 'F' ? -1 : 0 };
}

/** Shaft from `from` (1 = knee, 2 = ankle) to the ankle plus a full shoe. */
export function boot(g: DrawCtx, hex: string, from: number, opts: { grow?: number; toe?: number; kind?: 'cloth' | 'leather' | 'metal'; sole?: string } = {}): void {
  const grow = opts.grow ?? 0.6;
  for (const s of ['F', 'N'] as Side[]) {
    const L = g.L(s === 'N' ? 'nearLeg.feet' : 'farLeg.feet');
    legSpan(g, L, s, from, 2, grow, bootPen(g, hex, s, 'shin', opts.kind));
    const f = footPoly(g, s, grow * 0.8, opts.toe ?? 0.4);
    poly(L, f, bootPen(g, hex, s, 'foot', opts.kind));
    if (opts.sole) {
      const sp = bootPen(g, opts.sole, s, 'foot', 'leather');
      seam(L, v(f[5].x + 0.5, f[5].y - 0.5), v(f[4].x - 0.5, f[4].y - 0.5), 0);
      for (let x = Math.floor(f[5].x); x <= Math.floor(f[4].x); x++) L.set(x, Math.floor(f[4].y) - 1, sp.mat, 2 + (sp.bias || 0), sp.part);
    }
  }
}

export const FEET_ITEMS: ItemDef[] = [
  {
    id: 'feet_leather',
    slot: 'feet',
    name: 'Leather Boots',
    desc: 'Knee-high brown leather boots with a folded cuff.',
    colors: [col('main', 'Leather', '#6b4226'), col('sole', 'Sole', '#2a1a12')],
    draw: (g, [c, sole]) => {
      boot(g, c, 1.2, { sole });
      for (const s of ['F', 'N'] as Side[]) {
        const L = g.L(s === 'N' ? 'nearLeg.feet' : 'farLeg.feet');
        legSpan(g, L, s, 1.15, 1.3, 0.95, bootPen(g, c, s, 'shin'), 2);
      }
    },
  },
];
