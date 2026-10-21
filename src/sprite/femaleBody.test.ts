// Tests for the female bodies built on the owner's heroines at our scale (femaleBodyArt.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { makeRamp } from './color';
import { renderSprite } from './compose';
import { FEMALE_HANDS, FEMALE_SHOULDER_N } from './femaleBodyArt';
import { GRID, RES } from './raster';
import { ANKLE_N, BODY_PARAMS, drawRig, frameCount, GROUND } from './rig';
import type { BodyType, SpriteAppearance, SpritePose } from './types';

const SKIN = '#f6c7a6';
const bare = (body: BodyType, feet?: string): SpriteAppearance =>
  ({
    version: 1, body, skin: SKIN, eyeShape: 'standard', eyeColor: '#2f9e6a', slots: feet ? { feet: { id: feet, colors: [] } } : {}, accessories: [],
    headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
    chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false }, pixelEdits: [],
  }) as unknown as SpriteAppearance;

/** First and last opaque rows of a frame. */
function rows(body: BodyType, pose: SpritePose = 'idle', frame = 0): [number, number] {
  const f = renderSprite(bare(body), pose, frame);
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

  it('put the female ankles nearer the ground and leave the male and bulky ankles where they were', () => {
    for (const body of ['male', 'bulky'] as BodyType[]) {
      assert.equal(BODY_PARAMS[body].ankleLift, undefined);
      assert.ok(Math.abs(drawRig(body, 'idle', 0).ankleN.y - ANKLE_N) < 0.6, body);
    }
    for (const body of ['female', 'slender'] as BodyType[]) {
      const lift = GROUND - drawRig(body, 'idle', 0).ankleN.y;
      assert.ok(lift > 1.4 && lift < 2.6, `${body} ankle ${lift} above the ground`);
    }
  });

  it('keeps a seated body\'s hips on the camp seat and its soles on the camp ground', () => {
    for (const pose of ['sit', 'read'] as SpritePose[]) {
      for (let f = 0; f < frameCount(pose); f++) {
        const male = rows('male', pose, f)[1];
        for (const body of ['female', 'slender'] as BodyType[]) {
          const m = drawRig('male', pose, f).pelvis.y;
          assert.ok(Math.abs(drawRig(body, pose, f).pelvis.y - m) * RES < 3, `${body} ${pose} ${f} hips`);
          assert.ok(Math.abs(rows(body, pose, f)[1] - male) <= 1, `${body} ${pose} ${f} soles`);
        }
      }
    }
    for (const body of ['female', 'slender'] as BodyType[]) assert.ok(Math.abs(rows(body, 'lean')[1] - rows('male', 'lean')[1]) <= 1, `${body} lean`);
  });

  it('draws no bare foot out from under a closed boot', () => {
    // The female skin ramp (its shadow, deep shadow and base) for this skin colour.
    const ramp = makeRamp(SKIN, 'skinF').slice(1, 4);
    const skin = new Set(ramp.map((h) => h.toLowerCase()));
    for (const feet of ['feet_leather', 'feet_greaves', 'feet_cowboy', 'feet_crimson_sabatons']) {
      for (const body of ['female', 'slender'] as BodyType[]) {
        const f = renderSprite(bare(body, feet), 'idle', 0);
        let n = 0;
        for (let y = 204; y < GRID; y++) {
          for (let x = 0; x < GRID; x++) {
            const i = (y * GRID + x) * 4;
            if (!f.rgba[i + 3]) continue;
            const hex = '#' + [0, 1, 2].map((k) => f.rgba[i + k].toString(16).padStart(2, '0')).join('');
            if (skin.has(hex)) n++;
          }
        }
        assert.equal(n, 0, `${feet} on ${body}: ${n} skin pixels round the feet`);
      }
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

  it('has his hands at his size and his shoulder lined on top', () => {
    for (const [k, t] of Object.entries(FEMALE_HANDS)) assert.ok(t.rows[0].length <= 9 && t.rows.length <= 9, k);
    assert.ok(/^\.*o+\.*$/.test(FEMALE_SHOULDER_N.rows[0]), 'the shoulder starts with his line');
  });
});
