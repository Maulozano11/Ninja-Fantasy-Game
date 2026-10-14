// Props the camp poses hold: the open book for 'read'. Drawn after the body
// and items, before the far hand comes in front (compose.ts), so both hands
// hold its edges.

import type { DrawCtx } from './ctx';
import { F_NO_TEXTURE, v } from './raster';
import { PixelTemplate, stampTemplate, TemplatePalette } from './rotsprite';

/**
 * An open book held over the lap, seen from the front and a little above:
 * two pages with lines of text, the gutter between them, the page edges and
 * the leather cover underneath. The border becomes the layer outline. The
 * pivot is the foot of the spine.
 * p page · P lit page · q page shadow · t text · m gutter · e page edges ·
 * c cover · C lit cover · k cover shadow
 */
const BOOK: PixelTemplate = {
  pivot: [9, 9],
  rows: [
    '..ppppppp.ppppppp..',
    '.pPPPPPPPmPPPPPPPq.',
    '.pPttttPPmPPtttPPq.',
    '.pPPPPPPPmPPPPPPqq.',
    '.pPtttPPPmPPttttPq.',
    '.pPPPPPPPmPPPPPPPq.',
    '.pPttPPPPmPPtttPqq.',
    '.eeeeeeeemeeeeeeee.',
    '.CcccccccmcccccckC.',
    '..ckkkkkkkkkkkkkc..',
    '...................',
  ],
};

/**
 * A page turning over from right to left, in three steps: lifted off the
 * right page, standing on the gutter, settling on the left page. Pivot as BOOK.
 */
const PAGE_TURN: PixelTemplate[] = [
  {
    pivot: [9, 9],
    rows: [
      '..........PPPP.',
      '.........PPPPPq',
      '.........PtttPq',
      '.........PPPPq.',
      '..........PPq..',
      '...............',
    ],
  },
  {
    pivot: [9, 12],
    rows: ['.........PP', '.........PP', '........PPq', '........PPq', '.........Pq', '.........Pq', '.........Pq'],
  },
  {
    pivot: [9, 9],
    rows: [
      '.PPPP..........',
      'pPPPPP.........',
      'pPtttP.........',
      '.pPPPP.........',
      '..pPP..........',
      '...............',
    ],
  },
];

/** Draws what the camp pose holds, if anything. */
export function drawCampFx(g: DrawCtx): void {
  if (g.rig.pose === 'read') book(g);
}

function book(g: DrawCtx): void {
  const r = g.rig;
  const L = g.L('torso.acc');
  const paper = g.m('#ece2c6', 'cloth');
  const ink = g.m('#6b5a4a', 'cloth');
  const cover = g.m('#7a3f2c', 'leather');
  const pal: TemplatePalette = {
    p: [paper, 4],
    P: [paper, 5],
    q: [paper, 3],
    e: [paper, 2],
    m: [paper, 2],
    t: [ink, 3],
    c: [cover, 3],
    C: [cover, 4],
    k: [cover, 2],
  };
  // The foot of the spine sits between the hands, just above them, so the
  // fingers come over the lower corners of the cover.
  const at = v((r.handN.x + r.handF.x) / 2 + 0.3, Math.min(r.handN.y, r.handF.y) + 0.6);
  stampTemplate(L, BOOK, at, 0, pal, 'held', { flags: F_NO_TEXTURE });
  const f = ((r.frame % 12) + 12) % 12;
  if (f >= 9) stampTemplate(L, PAGE_TURN[f - 9], at, 0, pal, 'held', { flags: F_NO_TEXTURE });
}
