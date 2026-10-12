// Hairstyles. Names are original ("inspired by") to keep the game clear of
// third-party trademarks. Coordinates are head-local (see hairkit.ts).

import type { DrawCtx, ItemDef } from '../ctx';
import type { Pen } from '../raster';
import { cap, hclump, shine } from './hairkit';

const hairColor = (def: string) => [{ key: 'hair', label: 'Hair', default: def, kind: 'hair' as const }];

function pens(g: DrawCtx, hex: string): { front: Pen; back: Pen } {
  const mat = g.m(hex, 'hair');
  return { front: { mat, part: 'head' }, back: { mat, part: 'head', bias: 0 } };
}

export const HAIR_ITEMS: ItemDef[] = [
  {
    id: 'hair_none',
    slot: 'hair',
    name: 'Shaved',
    desc: 'Clean-shaven scalp.',
    colors: hairColor('#2a2230'),
    draw: () => {},
  },
  {
    id: 'hair_sunburst',
    slot: 'hair',
    name: 'Sunburst Spikes',
    desc: 'Wild, sun-bright spikes that point every direction.',
    colors: hairColor('#f5c518'),
    draw: (g, [c]) => {
      const { front, back } = pens(g, c);
      const B = g.L('hairBack');
      for (const k of [
        [-7, -3, -1, -8, -10, -12],
        [-3, -7, 3, -7, 0, -14],
        [1, -8, 6, -4, 8, -12],
        [4, -6, 7, -1, 11, -5],
        [-7, 1, -5, -6, -13, -5],
        [-7, 5, -6, -1, -12, 3],
      ]) hclump(g, B, k, back);
      const F = g.L('hairFront');
      cap(g, F, front, { browY: -2, backY: 5 });
      for (const k of [
        [-6, -5, -2, -7, -8, -11],
        [-2, -7, 2, -7, 0, -12],
        [2, -6, 5, -4, 6, -10],
        [-4, -4, 0, -5, -3, 0],
        [0, -5, 4, -5, 2, -1],
        [3, -4, 6, -3, 6, 0],
        [-5, -2, -2, -2, -4, 3],
      ]) hclump(g, F, k, front);
      shine(g, F, front, -5, -4, 1);
    },
  },
];
