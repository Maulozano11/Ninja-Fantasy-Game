// The owner's own frames of Lyra (ownerFrames.ts): her read pose's three keys (his "Atenta", "Leyendo",
// "Pasando pagina") and her throw's frames 3 and 4 (his "Cuadro 1" and "Cuadro 2") are his lift, pixel
// for pixel (the owner, 2026-10-22: "copialo exacto"): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { renderSprite, spriteLayers } from './compose';
import { LYRA_READ } from './items/lyraReadArt';
import { LYRA_THROW } from './items/lyraThrowArt';
import { jointPixel, type OwnerPiece, paintedFrame, wearsHisFigure } from './ownerFrames';
import { GRID } from './raster';
import { frameCount, READ_KEYS } from './rig';
import type { BodyType, SpriteAppearance, SpritePose } from './types';

const lyra = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_lyra')!.character.appearance!;

/** His frame as he drew it: every piece at the fine pixel of its joint he drew it on (its `at`). */
function his(pieces: OwnerPiece[]): Map<number, string> {
  const out = new Map<number, string>();
  // (the book first: where it runs on under her hands, they lie over it)
  for (const p of [...pieces.filter((q) => q.owner === 'book'), ...pieces.filter((q) => q.owner !== 'book')]) {
    const x0 = p.at[0] - p.pivot[0];
    const y0 = p.at[1] - p.pivot[1];
    p.rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] !== '.') out.set((y0 + j) * GRID + x0 + i, p.colors[row[i]]);
    });
  }
  return out;
}

const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');

/** How many pixels of a render differ from his frame (a pixel of his missing or another colour, or one more). */
function differing(rgba: Uint8ClampedArray, want: Map<number, string>): number {
  let n = 0;
  for (let i = 0; i < GRID * GRID; i++) {
    const w = want.get(i);
    if (w === undefined ? rgba[i * 4 + 3] !== 0 : !rgba[i * 4 + 3] || hex(rgba, i) !== w) n++;
  }
  return n;
}

// (her read frames: the first frame of each of his keys in the loop)
const READ_FRAMES = [0, 1, 2].map((k) => READ_KEYS.indexOf(k as 0 | 1 | 2));
const FRAMES: [SpritePose, number, OwnerPiece[]][] = [
  ...READ_FRAMES.map((f, k) => ['read', f, LYRA_READ[k]] as [SpritePose, number, OwnerPiece[]]),
  ['throw', 3, LYRA_THROW[0]],
  ['throw', 4, LYRA_THROW[1]],
];

describe("the owner's own frames of Lyra", () => {
  it('are his lift, every pixel of his where he drew it and nothing else, on the female and slender bodies', () => {
    for (const body of ['female', 'slender'] as BodyType[]) {
      for (const [pose, frame, pieces] of FRAMES) {
        const f = renderSprite({ ...lyra, body }, pose, frame);
        assert.equal(differing(f.rgba, his(pieces)), 0, `${body} ${pose} ${frame}`);
      }
    }
  });

  it('play his three read keys over the loop: looking up, reading, turning the page, reading on', () => {
    assert.equal(frameCount('read'), READ_KEYS.length);
    assert.deepEqual([...READ_KEYS], [0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 1, 1]);
    for (let f = 0; f < READ_KEYS.length; f++) assert.equal(paintedFrame('read', f), LYRA_READ[READ_KEYS[f]], `frame ${f}`);
    // the throw's wind-up and fling stay ours
    for (const f of [0, 1, 2]) assert.equal(paintedFrame('throw', f), null, `throw ${f}`);
  });

  it('are pinned to her joints where he drew them', () => {
    for (const [pose, frame, pieces] of FRAMES) {
      // (her preset's rig: her long arms, and her long neck carrying the head forward)
      const { rig } = spriteLayers(lyra, pose, frame);
      for (const p of pieces) assert.deepEqual(jointPixel(rig, p.joint), p.at, `${pose} ${frame} ${p.owner} ${p.part} on ${p.joint}`);
    }
  });

  it('copies her hands as he drew them: the near hand under the book, the far one lifting the page in the third key', () => {
    for (const [k, pieces] of LYRA_READ.entries()) {
      const hands = pieces.filter((p) => p.owner === 'top' && (p.part === 'handN' || p.part === 'handF'));
      assert.ok(hands.some((p) => p.part === 'handN'), `key ${k}: the near hand`);
      assert.ok(hands.some((p) => p.part === 'handF'), `key ${k}: the far hand`);
    }
    const lift = (k: number) => Math.min(...LYRA_READ[k].filter((p) => p.part === 'handF').map((p) => p.at[1] - p.pivot[1]));
    assert.ok(lift(2) < lift(0) - 6, 'the far hand is up at the page');
  });

  it('keep his pixels in her colours and follow a colour the player changes', () => {
    const blouse = lyra.slots.top!;
    const look: SpriteAppearance = { ...lyra, slots: { ...lyra.slots, top: { ...blouse, colors: ['#3a6bd8', blouse.colors[1] ?? ''] } } };
    assert.ok(wearsHisFigure(look), 'a colour of hers is still her figure');
    const f = renderSprite(look, 'read', 0);
    const d = differing(f.rgba, his(LYRA_READ[0]));
    assert.ok(d > 50, `the blouse turns blue (${d} pixels)`);
    // his line stays his
    const want = his(LYRA_READ[0]);
    for (const [i, w] of want) if (w === '#000000') assert.equal(hex(f.rgba, i), w);
  });

  it('are left to the rig on another figure: another body, face or option of hers', () => {
    assert.ok(wearsHisFigure(lyra));
    assert.ok(!wearsHisFigure({ ...lyra, body: 'male' }));
    assert.ok(!wearsHisFigure({ ...lyra, faceShape: 'tapered' }));
    assert.ok(!wearsHisFigure({ ...lyra, slots: { ...lyra.slots, hair: { id: 'hair_long', colors: [] } } }));
    const other = renderSprite({ ...lyra, slots: { ...lyra.slots, hair: { id: 'hair_long', colors: [] } } }, 'read', 0);
    assert.ok(differing(other.rgba, his(LYRA_READ[0])) > 100, 'drawn on the rig');
  });

  it('draws his book for every reader, his pixels on the near wrist', () => {
    const book = LYRA_READ[0].filter((p) => p.owner === 'book');
    assert.ok(book.length >= 1);
    const ink = new Set(book.flatMap((p) => Object.values(p.colors)).filter((h) => h !== '#000000'));
    for (const body of ['male', 'bulky', 'female', 'slender'] as BodyType[]) {
      const look: SpriteAppearance = { ...lyra, body, faceShape: 'tapered', slots: {} };
      const f = renderSprite(look, 'read', 0);
      let n = 0;
      for (let i = 0; i < GRID * GRID; i++) if (f.rgba[i * 4 + 3] && ink.has(hex(f.rgba, i))) n++;
      assert.ok(n > 80, `${body}: his book (${n})`);
    }
  });
});
