// Tests for the female bodies built on the owner's heroines at our scale (femaleBodyArt.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderSprite } from './compose';
import { FEMALE_FEET, FEMALE_HANDS } from './femaleBodyArt';
import { GRID, RES } from './raster';
import { ANKLE_N, BODY_PARAMS, drawRig, GROUND } from './rig';
import type { BodyType, SpriteAppearance } from './types';

const bare = (body: BodyType): SpriteAppearance =>
  ({
    version: 1, body, skin: '#f6c7a6', eyeShape: 'standard', eyeColor: '#2f9e6a', slots: {}, accessories: [],
    headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
    chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false }, pixelEdits: [],
  }) as unknown as SpriteAppearance;

/** First and last opaque rows of a frame. */
function rows(body: BodyType): [number, number] {
  const f = renderSprite(bare(body), 'idle', 0);
  let top = GRID;
  let bot = -1;
  for (let i = 0; i < GRID * GRID; i++) if (f.rgba[i * 4 + 3]) { top = Math.min(top, (i / GRID) | 0); bot = Math.max(bot, (i / GRID) | 0); }
  return [top, bot];
}

describe('female bodies at the owner\'s game scale', () => {
  it('stand 92 px tall on the same ground as the male body', () => {
    const male = rows('male');
    for (const body of ['female', 'slender'] as BodyType[]) {
      const [top, bot] = rows(body);
      assert.equal(bot, male[1], `${body} sole`);
      assert.equal(bot - top + 1, 92, `${body} height`);
    }
  });

  it('put the female ankles near the ground and leave the male and bulky ankles where they were', () => {
    for (const body of ['male', 'bulky'] as BodyType[]) {
      assert.equal(BODY_PARAMS[body].ankleLift, undefined);
      assert.ok(Math.abs(drawRig(body, 'idle', 0).ankleN.y - ANKLE_N) < 0.6, body);
    }
    for (const body of ['female', 'slender'] as BodyType[]) assert.ok(GROUND - drawRig(body, 'idle', 0).ankleN.y < 1.2, body);
  });

  it('keeps a seated body\'s hips on the camp seat', () => {
    for (const body of ['female', 'slender'] as BodyType[]) {
      const m = drawRig('male', 'sit', 0).pelvis.y;
      assert.ok(Math.abs(drawRig(body, 'sit', 0).pelvis.y - m) * RES < 3, body);
    }
  });

  it('shuts the line round every hand (they are stamped without an outline pass)', () => {
    for (const [k, t] of Object.entries(FEMALE_HANDS)) {
      const h = t.rows.length;
      const w = t.rows[0].length;
      assert.ok(t.rows.every((r) => r.length === w), k);
      for (let y = 1; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if ('.o'.includes(t.rows[y][x])) continue;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const c = t.rows[y + dy]?.[x + dx];
            assert.ok(c !== undefined && c !== '.', `${k} (${x}, ${y}) opens onto (${x + dx}, ${y + dy})`);
          }
        }
      }
    }
  });

  it('has feet of his size: 5 rows near, 5 rows far with the line', () => {
    assert.equal(FEMALE_FEET.N.rows.length, 5);
    assert.ok(FEMALE_FEET.F.rows[0].length > FEMALE_FEET.N.rows[0].length);
  });
});
