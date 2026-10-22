// Tests for the female bodies: the owner's bare female body (femaleBaseArt.ts, femaleBase.test.ts) with his
// heroines' small hands (femaleBodyArt.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { makeRamp } from './color';
import { renderSprite } from './compose';
import { FEMALE_HANDS } from './femaleBodyArt';
import { GRID, partIndex, RES } from './raster';
import { ANKLE_N, BODY_PARAMS, drawRig, frameCount, GROUND } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

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
    for (const body of ['female'] as BodyType[]) {
      const [top, bot] = rows(body);
      assert.equal(bot, male[1], `${body} sole`);
      assert.equal(bot - top + 1, 92, `${body} height`);
    }
  });

  it('put the female ankles where he drew them and leave the male and bulky ankles where they were', () => {
    for (const body of ['male', 'bulky'] as BodyType[]) {
      assert.equal(BODY_PARAMS[body].ankleLift, undefined);
      assert.ok(Math.abs(drawRig(body, 'idle', 0).ankleN.y - ANKLE_N) < 0.6, body);
    }
    for (const body of ['female'] as BodyType[]) {
      // his near ankle on his row 89, nine rows over his sole (row 98, our 218)
      const lift = GROUND - drawRig(body, 'idle', 0).ankleN.y;
      assert.ok(Math.abs(lift - 3.5) < 1e-6, `${body} ankle ${lift} above the ground`);
    }
  });

  it('keeps a seated body\'s hips on the camp seat and its soles on the camp ground', () => {
    for (const pose of ['sit', 'read'] as SpritePose[]) {
      for (let f = 0; f < frameCount(pose); f++) {
        const male = rows('male', pose, f)[1];
        for (const body of ['female'] as BodyType[]) {
          const m = drawRig('male', pose, f).pelvis.y;
          // the female hips settle up to two pixels further into the seat (rig.ts SEAT_SINK)
          assert.ok(Math.abs(drawRig(body, pose, f).pelvis.y - m) * RES <= 4, `${body} ${pose} ${f} hips`);
          // (reading, on the owner's rock, the male legs are too short to reach the ground and his feet
          // hang: the female soles are on the ground she stands on)
          const ground = pose === 'read' ? rows(body, 'idle', 0)[1] : male;
          assert.ok(Math.abs(rows(body, pose, f)[1] - ground) <= 1, `${body} ${pose} ${f} soles`);
        }
      }
    }
    for (const body of ['female'] as BodyType[]) assert.ok(Math.abs(rows(body, 'lean')[1] - rows('male', 'lean')[1]) <= 1, `${body} lean`);
  });

  it('draws no bare foot out from under a closed boot', () => {
    // The female skin ramp (its shadow, deep shadow and base) for this skin colour.
    const ramp = makeRamp(SKIN, 'skinF').slice(1, 4);
    const skin = new Set(ramp.map((h) => h.toLowerCase()));
    for (const feet of ['feet_leather', 'feet_greaves', 'feet_cowboy', 'feet_crimson_sabatons']) {
      for (const body of ['female'] as BodyType[]) {
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

  it('keeps every bare hand whole and the near shoulder lined in every pose and frame', () => {
    // A pixel of a hand or of the near shoulder on the figure's edge is his line, never skin left
    // open (the throw's release hand came out a cut-off stub, the raised arm's shoulder broke its line).
    const parts = new Set(['handN', 'handF', 'upperArmN'].map((p) => partIndex(p as Parameters<typeof partIndex>[0])));
    for (const body of ['female'] as BodyType[]) {
      for (const pose of [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES] as SpritePose[]) {
        if (pose === 'cast') continue; // the cast effect's runes sit over the hands
        for (let fr = 0; fr < frameCount(pose); fr++) {
          const f = renderSprite(bare(body), pose, fr);
          const op = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID && y < GRID && f.rgba[(y * GRID + x) * 4 + 3] > 0;
          const open: string[] = [];
          for (let y = 1; y < GRID - 1; y++) {
            for (let x = 1; x < GRID - 1; x++) {
              const i = y * GRID + x;
              if (!op(x, y) || !parts.has(f.part[i]) || Math.max(f.rgba[i * 4], f.rgba[i * 4 + 1], f.rgba[i * 4 + 2]) < 70) continue;
              if (!op(x + 1, y) || !op(x - 1, y) || !op(x, y + 1) || !op(x, y - 1)) open.push(`${x},${y}`);
            }
          }
          // a fist round a thrown kunai's grip opens where the grip leaves it
          assert.ok(open.length <= 3,`${body} ${pose} ${fr}: open edge at ${open.join(' ')}`);
        }
      }
    }
  });

  it('keeps his painted shades: no drop shadow darkens his hand under a cuff', () => {
    // The near hand hangs just under the forearm; a sleeve's cuff over the wrist would cast the compositor's
    // drop shadow on it. With a shirt's sleeve over the forearm, the female near hand keeps his own shades.
    const shirt = { ...bare('female'), slots: { top: { id: 'top_longsleeve', colors: [] } } } as unknown as SpriteAppearance;
    const a = renderSprite(bare('female'), 'idle', 0);
    const b = renderSprite(shirt, 'idle', 0);
    const hand = partIndex('handN');
    let same = 0;
    let n = 0;
    for (let i = 0; i < GRID * GRID; i++) {
      // his skin, not his line (a line pixel may give way to the sleeve's own outline)
      if (a.part[i] !== hand || b.part[i] !== hand || Math.max(a.rgba[i * 4], a.rgba[i * 4 + 1], a.rgba[i * 4 + 2]) < 70) continue;
      n++;
      if ([0, 1, 2].every((k) => a.rgba[i * 4 + k] === b.rgba[i * 4 + k])) same++;
    }
    assert.ok(n > 10 && same === n, `${same} of ${n} hand pixels kept`);
  });

  it("has his heroines' hands at their size", () => {
    for (const [k, t] of Object.entries(FEMALE_HANDS)) assert.ok(t.rows[0].length <= 9 && t.rows.length <= 9, k);
  });
});
