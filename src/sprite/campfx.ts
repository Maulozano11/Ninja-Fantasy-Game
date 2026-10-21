// Props the camp poses hold: the open book for 'read', drawn after the body
// and items (compose.ts).

import type { DrawCtx } from './ctx';
import { add, F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, partIndex, RES, v } from './raster';
import { PaintedProp, READ_BOOK, READ_PAGE_TURN } from './readArt';
import { chinPixel, READ_HOLD } from './rig';
import { stampTemplate, TemplatePalette } from './rotsprite';

/** Draws what the camp pose holds, if anything. */
export function drawCampFx(g: DrawCtx): void {
  if (g.rig.pose === 'read') book(g);
}

/** Stamps a prop painted in the owner's colours, every pixel as he drew it. */
function stampProp(g: DrawCtx, L: Layer, art: PaintedProp, at: { x: number; y: number }): void {
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(art.colors)) pal[ch] = [g.m(hex, 'flat'), 3];
  stampTemplate(L, art, at, 0, pal, 'held', { flags: F_NO_TEXTURE | F_NO_OUTLINE });
}

/**
 * The read pose's book, the owner's (readArt.ts), held up before the face by
 * the far hand. It is placed from the chin like both hands (READ_HOLD), so it
 * never drifts from the face. It goes over the near arm, whose forearm rises
 * behind its left board to the fist under the chin, and the far hand is moved
 * on top of it. Every 12 frames a page turns over (frames 9-11).
 */
function book(g: DrawCtx): void {
  const r = g.rig;
  const L = g.L('nearArm.over');
  const at = add(chinPixel(r.head, r.bp), v(READ_HOLD.book.x / RES, READ_HOLD.book.y / RES));
  stampProp(g, L, READ_BOOK, at);
  hideFarArm(g, L);
  const f = ((r.frame % 12) + 12) % 12;
  if (f >= 9) {
    // The page settling onto the left half passes behind the fingers under the chin.
    const page = new Layer();
    stampProp(g, page, READ_PAGE_TURN[f - 9], at);
    const near = partIndex('handN');
    const arm = (['nearArm.body', 'nearArm.cloth', 'nearArm.armor'] as const).map((d) => g.L(d));
    for (let i = 0; i < GRID * GRID; i++) {
      if (page.mat[i] < 0 || arm.some((A) => A.mat[i] >= 0 && A.part[i] === near)) continue;
      L.set(i % GRID, (i / GRID) | 0, page.mat[i], page.shade[i], 'held', page.flags[i]);
    }
  }
  liftHand(g, L);
}

/**
 * The far arm reaches up behind the book to the hand on its right board: where its forearm or a bulky
 * cuff on it would show under the book's bottom edge, it is taken off (the body behind shows).
 */
function hideFarArm(g: DrawCtx, book: Layer): void {
  const held = partIndex('held');
  const bottom = new Int16Array(GRID).fill(-1);
  for (let i = 0; i < GRID * GRID; i++) if (book.mat[i] >= 0 && book.part[i] === held) bottom[i % GRID] = Math.max(bottom[i % GRID], (i / GRID) | 0);
  const arm = new Set([partIndex('upperArmF'), partIndex('forearmF')]);
  for (const d of ['farArm.body', 'farArm.cloth', 'farArm.armor'] as const) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) {
      const x = i % GRID;
      if (L.mat[i] < 0 || !arm.has(L.part[i]) || bottom[x] < 0) continue;
      if (((i / GRID) | 0) > bottom[x]) L.mat[i] = -1;
    }
  }
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
