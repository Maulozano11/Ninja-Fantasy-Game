// Props the camp poses hold: the open book for 'read', drawn after the body
// and items (compose.ts).

import { GRIMOIRE } from './castfx';
import type { DrawCtx } from './ctx';
import { add, F_NO_TEXTURE, GRID, Layer, partIndex, v } from './raster';
import { READ_HOLD } from './rig';
import { PixelTemplate, stampTemplate, TemplatePalette } from './rotsprite';

/**
 * A page turning over from the right half to the left, in three steps:
 * lifting off the right pages, standing over the spine, settling onto the
 * left pages. Drawn over the grimoire art (GRIMOIRE, castfx.ts), seen as the
 * reader holds it: the top edge of the page sweeps above the book. Same
 * columns as GRIMOIRE; the pivot is its pivot (the foot of the spine), so the
 * rows above it reach over the book's top edge.
 */
const PAGE_TURN: PixelTemplate[] = [
  {
    pivot: [12, 21],
    rows: [
      '..................Pq...........',
      '................PPPq...........',
      '..............PPPPq............',
      '.............PPPq..............',
      '............PPq................',
    ],
  },
  {
    pivot: [12, 21],
    rows: [
      '............Pq.................',
      '...........PPq.................',
      '...........PPq.................',
      '...........PPq.................',
      '............Pq.................',
    ],
  },
  {
    pivot: [12, 21],
    rows: [
      '...............................',
      '......qPP......................',
      '........qPPP...................',
      '..........qPP..................',
      '...........qP..................',
    ],
  },
];

/** Draws what the camp pose holds, if anything. */
export function drawCampFx(g: DrawCtx): void {
  if (g.rig.pose === 'read') book(g);
}

/**
 * The read pose's book: the grimoire of the book cast (the same art and size,
 * castfx.ts) as a plain leather book with a tooled diamond in place of the
 * glowing emblem, resting open on the lap and turned toward the reader, so
 * the viewer sees its covers and the tops of its pages. The hands hold its
 * two sides ('side' hands, ctx.ts): they are moved on top of it so the
 * fingers lie over the covers. Every 12 frames a page turns (frames 9-11).
 */
function book(g: DrawCtx): void {
  const r = g.rig;
  const L = g.L('nearArm.over');
  const paper = g.m('#ece2c6', 'cloth');
  const cover = g.m('#7a3f2c', 'leather');
  const metal = g.m('#d4a531', 'metal');
  const pal: TemplatePalette = {
    o: [cover, 0],
    k: [cover, 1],
    d: [cover, 1],
    m: [cover, 2],
    c: [cover, 2],
    C: [cover, 3],
    b: [cover, 4],
    q: [paper, 3],
    p: [paper, 4],
    P: [paper, 5],
    g: [metal, 4],
    G: [metal, 2],
  };
  // The pivot (foot of the spine) from the near wrist, in design units.
  const at = add(r.wristN, v(-READ_HOLD.near.x / 2, -READ_HOLD.near.y / 2));
  stampTemplate(L, GRIMOIRE, at, 0, pal, 'held', { flags: F_NO_TEXTURE });
  // a tooled diamond with a brass stud on the front cover
  const ox = Math.floor(at.x * 2) - GRIMOIRE.pivot[0];
  const oy = Math.floor(at.y * 2) - GRIMOIRE.pivot[1];
  for (const [dx, dy] of [[21, 11], [20, 12], [22, 12], [21, 13]]) L.set(ox + dx, oy + dy, cover, 4, 'held', F_NO_TEXTURE);
  L.set(ox + 21, oy + 12, metal, 4, 'held', F_NO_TEXTURE);
  const f = ((r.frame % 12) + 12) % 12;
  if (f >= 9) stampTemplate(L, PAGE_TURN[f - 9], at, 0, pal, 'held', { flags: F_NO_TEXTURE });
  liftHands(g, L);
}

/** Moves both hands (skin and any glove on them) onto `dest`, over what was drawn there. */
function liftHands(g: DrawCtx, dest: Layer): void {
  const hands = [partIndex('handN'), partIndex('handF')];
  for (const d of ['nearArm.body', 'nearArm.cloth', 'nearArm.armor', 'farArm.body', 'farArm.cloth', 'farArm.armor'] as const) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || !hands.includes(L.part[i])) continue;
      dest.mat[i] = L.mat[i];
      dest.shade[i] = L.shade[i];
      dest.part[i] = L.part[i];
      dest.flags[i] = L.flags[i];
      dest.used = true;
      L.mat[i] = -1;
    }
  }
}
