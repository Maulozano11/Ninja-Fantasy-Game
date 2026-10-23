// Props the camp poses hold: the open book for 'read', drawn after the body
// and items (compose.ts).

import { retintSkinLifted } from './color';
import type { DrawCtx } from './ctx';
import { READ_BOOK, READ_HAND_F, READ_HAND_N, READ_LINE, READ_SKIN_BASE, type ReadPiece } from './maleReadArt';
import { takesMaleSkin } from './maleSkin';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, PartId, partIndex, v } from './raster';
import { READ_KEYS } from './rig';
import { PixelTemplate, stampTemplate, TemplatePalette } from './rotsprite';

/**
 * An open book held over the lap, seen from the front and a little above:
 * two pages with lines of text, the gutter between them, the page edges and
 * the hardcover underneath. The border becomes the layer outline. The pivot
 * is the foot of the spine.
 * p page · P lit page · q text · m gutter · e page edges · c cover ·
 * C lit cover · k cover shadow
 */
const BOOK: PixelTemplate = {
  pivot: [10, 9],
  rows: [
    '...ppppppp.ppppppp...',
    '..pPPPPPPPmPPPPPPPp..',
    '..pPqqqPqPmPqqqqPPp..',
    '..pPPPPPPPmPPPPPPPp..',
    '..pPqqPqqPmPqqPqqPp..',
    '..pPPPPPPPmPPPPPPPp..',
    '..pPqqqqPPmPqqqPqPp..',
    '.Cpeeeeeeemeeeeeeepk.',
    '.CCcccccccmccccccckk.',
    '..ckkkkkkkkkkkkkkkk..',
    '.....................',
  ],
};

/**
 * A page turning over from right to left, in three steps: curling up off the
 * right page, standing on the gutter, settling onto the left page. Same
 * pivot as BOOK (the extra rows on top reach above it).
 */
const PAGE_TURN: PixelTemplate[] = [
  {
    pivot: [10, 13],
    rows: [
      '................PPPP.',
      '..............PPPPPq.',
      '.............PPPPPPq.',
      '............PPqqPPq..',
      '...........PPPPPPq...',
      '...........PqqPPq....',
      '...........PPPPq.....',
      '..........mPPq.......',
      '..........mPq........',
    ],
  },
  {
    pivot: [10, 13],
    rows: [
      '.........PP..........',
      '.........PPq.........',
      '.........PPq.........',
      '.........PPq.........',
      '.........PPq.........',
      '.........PPq.........',
      '.........PPq.........',
      '..........Pq.........',
      '..........mq.........',
    ],
  },
  {
    pivot: [10, 13],
    rows: [
      '.PPPP................',
      '.pPPPPP..............',
      '.pPPPPPP.............',
      '..pPPqqPP............',
      '...pPPPPPP...........',
      '....pPPqqP...........',
      '.....pPPPP...........',
      '.......pPPm..........',
      '........pPm..........',
    ],
  },
];

/** Draws what the camp pose holds, if anything. */
export function drawCampFx(g: DrawCtx): void {
  if (g.rig.pose !== 'read') return;
  if (takesMaleSkin(g.rig.body)) hisBook(g);
  else book(g);
}

/**
 * The male read (rig.ts READ_MALE): the owner's book and hands from his Trunks read frames (maleReadArt.ts),
 * where he drew them, the frame's key his frame (READ_KEYS). Our hands are taken off and his are drawn over
 * his book, his hand's shape in the Roman's skin: his Roman fists' tones, recoloured to the character's skin
 * as his Roman skin is (retintSkinLifted); his black line is never tinted.
 */
function hisBook(g: DrawCtx): void {
  const k = READ_KEYS[((g.rig.frame % READ_KEYS.length) + READ_KEYS.length) % READ_KEYS.length];
  const L = g.L('nearArm.over');
  stampRead(g, L, READ_BOOK[k], 'held', (hex) => hex);
  const skin = (hex: string) => (isLine(hex) ? hex : retintSkinLifted(hex, READ_SKIN_BASE, g.look.skin));
  for (const [piece, part] of [
    [READ_HAND_N[k], 'handN'],
    [READ_HAND_F[k], 'handF'],
  ] as const) {
    if (!piece) continue;
    clearHand(g, part);
    stampRead(g, L, piece, part, skin);
  }
}

/** A colour of his black line (every channel below READ_LINE). */
const isLine = (hex: string): boolean => [1, 3, 5].every((i) => parseInt(hex.slice(i, i + 2), 16) < READ_LINE);

/** One of his read pieces where he drew it: his pixels, carrying their own line (no outline, no texture). */
function stampRead(g: DrawCtx, L: Layer, p: ReadPiece, part: PartId, color: (hex: string) => string): void {
  const pens: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(p.colors)) pens[ch] = g.m(color(hex), 'flat');
  // (on a body built bigger than his male, moved with its hands: rig.ts BodyParams.readShift)
  const [dx, dy] = g.bp.readShift ?? [0, 0];
  p.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') L.set(p.at[0] + dx + i, p.at[1] + dy + j, pens[row[i]], 3, part, F_NO_TEXTURE | F_NO_OUTLINE);
  });
}

/** Takes our hand off (its skin and any glove on it), where his hand is drawn instead. */
function clearHand(g: DrawCtx, part: 'handN' | 'handF'): void {
  const id = partIndex(part);
  for (const d of ['nearArm.body', 'nearArm.cloth', 'nearArm.armor', 'farArm.body', 'farArm.cloth', 'farArm.armor'] as const) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && L.part[i] === id) L.mat[i] = -1;
  }
}

/**
 * The book is held from below in both hands ('cradle' hands, fingers up),
 * over the near arm, and both hands are then moved on top of it so the
 * fingers curl over the lower corners of the cover.
 */
function book(g: DrawCtx): void {
  const r = g.rig;
  const L = g.L('nearArm.over');
  const paper = g.m('#ece2c6', 'cloth');
  const ink = g.m('#6b5a4a', 'cloth');
  const cover = g.m('#7a3f2c', 'leather');
  const pal: TemplatePalette = {
    p: [paper, 4],
    P: [paper, 5],
    q: [paper, 3],
    e: [paper, 2],
    m: [paper, 2],
    c: [cover, 3],
    C: [cover, 4],
    k: [cover, 2],
  };
  // The foot of the spine sits between the wrists, a little above them.
  const at = v((r.wristN.x + r.wristF.x) / 2 + 0.2, Math.min(r.wristN.y, r.wristF.y) - 2.2);
  stampTemplate(L, BOOK, at, 0, pal, 'held', { flags: F_NO_TEXTURE });
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
