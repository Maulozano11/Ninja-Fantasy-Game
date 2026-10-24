// Saya sitting and reading as the owner's Lyra does (his sit and read pictures are the standard for every
// character, 2026-10-22; "espero que tenga el sentada y leer similar a lyra", 2026-10-23): on the seat
// prop, the book before her chest in his Lyra's hands, nothing open in the figure, and her idle untouched:
// npm test.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { spriteLayers, renderSprite } from './compose';
import { dojutsuToEye } from './legacy';
import { ownerHand } from './ownerHands';
import { GRID, RES } from './raster';
import { drawRig, frameCount, READ_KEYS, READ_SEAT_TOP, rigPoseFor, SIT_KEYS } from './rig';
import type { SpriteAppearance, SpritePose } from './types';

const saya = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_saya')!.character;
const look = saya.appearance!;
const eye = dojutsuToEye(saya.dojutsu);
/** Her look without her sword (stowed on her back sitting, its swept hilt's loops are open by design). */
const bare: SpriteAppearance = { ...look, slots: { ...look.slots } };
delete bare.slots.held;
const SEATED: [SpritePose, number][] = [...READ_KEYS.map((_, f) => ['read', f] as [SpritePose, number]), ...SIT_KEYS.map((_, f) => ['sit', f] as [SpritePose, number])];

/** The empty pixels shut in by the figure (not reaching the frame's edge), as patches. */
function holes(rgba: Uint8ClampedArray): number[][] {
  const empty = (i: number) => rgba[i * 4 + 3] === 0;
  const seen = new Uint8Array(GRID * GRID);
  const out: number[][] = [];
  for (let s = 0; s < GRID * GRID; s++) {
    if (!empty(s) || seen[s]) continue;
    const patch = [s];
    seen[s] = 1;
    let edge = false;
    for (let k = 0; k < patch.length; k++) {
      const i = patch[k];
      const x = i % GRID;
      const y = (i / GRID) | 0;
      if (x === 0 || y === 0 || x === GRID - 1 || y === GRID - 1) edge = true;
      for (const j of [x > 0 ? i - 1 : -1, x < GRID - 1 ? i + 1 : -1, i - GRID, i + GRID]) {
        if (j < 0 || j >= GRID * GRID || seen[j] || !empty(j)) continue;
        seen[j] = 1;
        patch.push(j);
      }
    }
    if (!edge) out.push(patch);
  }
  return out;
}

const lowest = (rgba: Uint8ClampedArray) => {
  for (let y = GRID - 1; y >= 0; y--) for (let x = 0; x < GRID; x++) if (rgba[(y * GRID + x) * 4 + 3]) return y;
  return -1;
};

describe('Saya seated', () => {
  it('sits on the seat: the pelvis just above its top, both ankles on her ground, her soles on the rows she stands on', () => {
    const idle = lowest(renderSprite(bare, 'idle', 0, eye).rgba);
    const rest = drawRig(look.body, 'idle', 0, look.arms);
    for (const [pose, f] of SEATED) {
      const r = drawRig(look.body, pose, f, look.arms);
      const above = READ_SEAT_TOP - r.pelvis.y * RES;
      assert.ok(above > 3.5 && above < 6, `${pose} ${f}: the pelvis ${above} px above the seat`);
      assert.ok(Math.abs(r.ankleN.y - rest.ankleN.y) < 0.01 && Math.abs(r.ankleF.y - rest.ankleF.y) < 0.01, `${pose} ${f}: the ankles on her ground`);
      assert.equal(lowest(renderSprite(look, pose, f, eye).rgba), idle, `${pose} ${f}: her soles`);
    }
  });

  it('holds the book before her chest as his Lyra does from her neck, and his Lyra on his own joints', () => {
    for (const f of READ_KEYS.map((_, i) => i)) {
      const hers = drawRig(look.body, 'read', f, look.arms);
      const his = drawRig('female', 'read', f, 'long', true);
      // the same neck, but her hands where his Lyra's are from his Lyra's neck (rig.ts PoseAt.hisNeck)
      assert.deepEqual([hers.neck.x, hers.neck.y], [his.neck.x, his.neck.y]);
      assert.ok(hers.handN.y > his.handN.y + 3, `read ${f}: her near hand lower than on his figure's rows`);
    }
    // sitting, the far arm reaches out level, from the shoulder at his height: the hands where he drew them
    const sit = drawRig(look.body, 'sit', 0, look.arms);
    assert.ok(Math.abs(sit.handF.y - sit.shoulderF.y) < 4, 'the far arm reaches out level');
  });

  it('is whole sitting and reading: no pixel open in the figure (but the loops of her swept hilt on her back)', () => {
    for (const [pose, f] of SEATED) {
      assert.deepEqual(holes(renderSprite(bare, pose, f, eye).rgba).map((h) => h.length), [], `${pose} ${f} without the sword`);
      // with her sword stowed on her back, only the hilt's loops show the background through them (stowed
      // as the integration branch holds a back blade, the hilt stands upright: its guard's loop is up to 8)
      const { layers } = spriteLayers(look, pose, f, eye);
      const gear = layers.get('backGear')!;
      for (const h of holes(renderSprite(look, pose, f, eye).rgba)) {
        const touches = h.some((i) => [i - 1, i + 1, i - GRID, i + GRID].some((j) => gear.mat[j] >= 0));
        assert.ok(touches && h.length <= 8, `${pose} ${f}: a hole of ${h.length} at ${h[0] % GRID},${(h[0] / GRID) | 0}`);
      }
    }
  });

  it('keeps her idle frames byte for byte', () => {
    // (her idle as on heroine/saya-v2; change only with her idle art)
    const IDLE = ['b45a7cf8b37b0d97', '98568b935d3e5c8b', '73bc26d965f7b54d', 'ecb5bac3811ea20a'];
    assert.equal(frameCount(rigPoseFor('idle')), IDLE.length);
    IDLE.forEach((h, f) => assert.equal(createHash('sha1').update(renderSprite(look, 'idle', f, eye).rgba).digest('hex').slice(0, 16), h, `idle ${f}`));
  });
});

describe("his Lyra's hands, reading and sitting", () => {
  it('are there for every read key and his sit, but for her near hand sitting (he hid it)', () => {
    for (const f of READ_KEYS.map((_, i) => i)) for (const s of ['N', 'F'] as const) assert.ok(ownerHand('read', f, s), `read ${f} ${s}`);
    assert.ok(ownerHand('sit', 0, 'F'));
    assert.equal(ownerHand('sit', 0, 'N'), null);
    assert.equal(ownerHand('idle', 0, 'N'), null);
  });

  it('are his hand in one piece (his skin and his line round it), pointing from the wrist', () => {
    for (const [pose, f, s] of [['read', 0, 'N'], ['read', 0, 'F'], ['read', 8, 'F'], ['sit', 0, 'F']] as const) {
      const { t, dir } = ownerHand(pose, f, s)!;
      const cells = t.rows.flatMap((row, y) => [...row].flatMap((c, x) => (c === '.' ? [] : [{ x, y, c }])));
      assert.ok(cells.filter((c) => c.c !== 'o').length >= 6, `${pose} ${f} ${s}: his skin`);
      // (his lifted fingers are apart, each closed by his line: the hand is one piece with its line)
      const skin = cells;
      // one piece: every skin pixel reaches the others
      const key = (x: number, y: number) => `${x},${y}`;
      const set = new Set(skin.map((c) => key(c.x, c.y)));
      const reached = new Set([key(skin[0].x, skin[0].y)]);
      const q = [skin[0]];
      while (q.length) {
        const c = q.pop()!;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
          const k = key(c.x + dx, c.y + dy);
          if (set.has(k) && !reached.has(k)) {
            reached.add(k);
            q.push({ x: c.x + dx, y: c.y + dy, c: '1' });
          }
        }
      }
      assert.equal(reached.size, set.size, `${pose} ${f} ${s}: the hand in one piece`);
      assert.ok(Math.abs(Math.hypot(...dir) - 1) < 1e-9, 'a unit direction');
    }
  });

  it('are drawn on every fitted reader that is not his own figure, in its skin', () => {
    const plain: SpriteAppearance = { ...look, faceShape: 'tapered', eyeShape: 'standard', slots: {} };
    for (const [pose, f] of [['read', 0], ['sit', 0]] as [SpritePose, number][]) {
      const { layers, rig } = spriteLayers(plain, pose, f);
      const far = layers.get(pose === 'read' ? 'nearArm.over' : 'farArm.body')!;
      const { t } = ownerHand(pose, f, 'F')!;
      const wx = Math.floor(rig.wristF.x * RES + 1e-6);
      const wy = Math.floor(rig.wristF.y * RES + 1e-6);
      let n = 0;
      let on = 0;
      t.rows.forEach((row, y) =>
        [...row].forEach((c, x) => {
          if (c === '.' || c === 'o') return;
          n++;
          if (far.mat[(wy - t.pivot[1] + y) * GRID + wx - t.pivot[0] + x] >= 0) on++;
        }),
      );
      assert.equal(on, n, `${pose}: his far hand's ${n} skin pixels on the wrist`);
    }
  });
});
