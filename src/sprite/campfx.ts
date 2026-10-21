// Props the camp poses hold: the open book for 'read', drawn after the body
// and items (compose.ts).

import type { DrawCtx } from './ctx';
import { add, F_NO_TEXTURE, GRID, Layer, partIndex, RES, v } from './raster';
import { chinPoint, READ_HOLD } from './rig';
import { PixelTemplate, stampTemplate, TemplatePalette } from './rotsprite';

/**
 * The reading book, copied from the owner's picture (the first "leer" in
 * docs/reference/camp-poses-owner-reference.webp): an open book held up before
 * the face and tilted toward it, so the viewer sees the outside of its plain
 * leather covers and the cream tops of its pages. Seen from slightly above,
 * the near end of the spine is the lowest point, so the page tops make a V:
 * the left board faces the viewer (a lighter frame round a dark panel), the
 * right board turns away (darker), and the hand holding it up from below
 * lies over the right board, its fingers spread up the cover (the 'book' hand,
 * ctx.ts). The pivot is where that hand's wrist goes.
 * o k m c C frame leather (dark to light) · d e f board leather · q p P pages
 */
const BOOK: PixelTemplate = {
  pivot: [18, 17],
  rows: [
    '.....................ooo',
    'ooo................ooPPo',
    'oPPooo...........ooPPqqo',
    'oppPPPooo......ooPPqqkko',
    'okkpppPPPoooo.oPPqqkkeeo',
    'oCckkkpppPPPPoPqqkkeeeeo',
    'oCcccckkkppppPqkkeeeeeeo',
    'oCcfffccckkkkqkeeeeeeeeo',
    'oCcffffffcccckfeeeeeeeeo',
    'oCcfffffffffckfeeeeeeeeo',
    'oCcfffffffffckfeeeeeeeeo',
    'oCcfffffffffckfeeeeeeeeo',
    'oCcfffffffffckfeeeeeeeeo',
    'oCcfffffffffckfeeeeeeeeo',
    'oCcfffffffffckfeeeeeeeeo',
    'oCcfffffffffckfeeeeeeeeo',
    'oCccccccccccckfeeedddddo',
    'ommmmmmmmmmmmkddddoooooo',
    'oooooooooooookoooo......',
    '.............o..........',
  ],
};

/**
 * A page turning over from the right half to the left, in three steps, seen
 * from outside the covers: it rises above the right board's page tops, stands
 * up over the spine, and settles onto the left. Stamped at BOOK's pivot (their
 * pivots are that same point of the book; they reach above its top edge).
 */
const PAGE_TURN: PixelTemplate[] = [
  {
    pivot: [18, 20],
    rows: [
      '...................o....',
      '..................oPo...',
      '.................oPqo...',
      '................oPqo....',
      '...............oPqo.....',
      '..............oPqo......',
      '.............oPqo.......',
      '.............oqo........',
      '..............o.........',
    ],
  },
  {
    pivot: [18, 20],
    rows: [
      '.............oo.........',
      '............oPqo........',
      '............oPqo........',
      '............oPqo........',
      '............oPqo........',
      '............oPqo........',
      '............oPqo........',
      '............oPqo........',
      '.............P..........',
    ],
  },
  {
    pivot: [18, 19],
    rows: [
      '.......o................',
      '......oPoo..............',
      '......oqPPo.............',
      '.......oqqPo............',
      '........ooqPo...........',
      '..........oqPo..........',
      '...........oqo..........',
      '............o...........',
    ],
  },
];

/** Draws what the camp pose holds, if anything. */
export function drawCampFx(g: DrawCtx): void {
  if (g.rig.pose === 'read') book(g);
}

/**
 * The read pose's book (BOOK), held up before the face by the far hand. It is
 * placed from the chin like the hand (READ_HOLD), so it never drifts from the
 * face. It goes under the near arm, whose fist props up the chin beside it,
 * and over everything else; the far hand is moved on top of it. Every 12
 * frames a page turns over (frames 9-11).
 */
function book(g: DrawCtx): void {
  const r = g.rig;
  const L = g.L('nearArm.held');
  const frame = g.m('#7f5a3c', 'leather');
  const board = g.m('#5a3020', 'leather');
  const paper = g.m('#ece2c6', 'cloth');
  const pal: TemplatePalette = {
    o: [frame, 0],
    k: [frame, 1],
    m: [frame, 2],
    c: [frame, 3],
    C: [frame, 4],
    d: [board, 1],
    e: [board, 2],
    f: [board, 3],
    q: [paper, 2],
    p: [paper, 3],
    P: [paper, 4],
  };
  const at = add(chinPoint(r.head, r.bp), v(READ_HOLD.book.x / RES, READ_HOLD.book.y / RES));
  stampTemplate(L, BOOK, at, 0, pal, 'held', { flags: F_NO_TEXTURE });
  const f = ((r.frame % 12) + 12) % 12;
  if (f >= 9) stampTemplate(L, PAGE_TURN[f - 9], at, 0, pal, 'held', { flags: F_NO_TEXTURE });
  liftHand(g, L);
}

/** Moves the far hand (skin and any glove on it) onto `dest`, over what was drawn there. */
function liftHand(g: DrawCtx, dest: Layer): void {
  const hand = partIndex('handF');
  for (const d of ['farArm.body', 'farArm.cloth', 'farArm.armor'] as const) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || L.part[i] !== hand) continue;
      dest.mat[i] = L.mat[i];
      dest.shade[i] = L.shade[i];
      dest.part[i] = L.part[i];
      dest.flags[i] = L.flags[i];
      dest.used = true;
      L.mat[i] = -1;
    }
  }
}
