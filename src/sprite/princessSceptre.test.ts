// Tests for the princess's sceptre (the Rose Dawn Sceptre, held_rose_sceptre): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { PRINCESS_SCEPTRE_GEM, PRINCESS_SCEPTRE_GOLD, ROSE_SCEPTRE, ROSE_SCEPTRE_STRAIGHT } from './items/princessSceptreArt';
import { defaultAppearance } from './legacy';
import { GRID, partIndex } from './raster';
import { throwRelease } from './grip';
import { frameCount, rigPoseFor, THROW_RELEASE_FRAME, type Rig } from './rig';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { weaponOf } from '../battle/units';
import type { BodyType, SpriteAppearance, SpritePose } from './types';

const look = (colors: string[] = [], body: BodyType = 'female'): SpriteAppearance => {
  const l = defaultAppearance();
  l.body = body;
  l.slots = { held: { id: 'held_rose_sceptre', colors } };
  return l;
};

/** How many pixels of the held item a frame draws. */
const heldPixels = (l: SpriteAppearance, pose: SpritePose, frame: number): number => {
  const s = renderSprite(l, pose, frame);
  const held = partIndex('held');
  let n = 0;
  for (let i = 0; i < GRID * GRID; i++) if (s.part[i] === held && s.rgba[i * 4 + 3]) n++;
  return n;
};

describe('princess rose sceptre', () => {
  it('is a held item with his gold and gem colour as defaults', () => {
    const item = getItem('held_rose_sceptre');
    assert.equal(item?.slot, 'held');
    assert.deepEqual(item!.colors.map((c) => c.default), [PRINCESS_SCEPTRE_GOLD, PRINCESS_SCEPTRE_GEM]);
  });

  it('keeps his pixels in both templates: the same cells per colour, only the shaft rows moved', () => {
    for (const t of [ROSE_SCEPTRE, ROSE_SCEPTRE_STRAIGHT]) {
      const [px, py] = t.pivot;
      assert.notEqual(t.rows[py][px], '.', 'the pivot is on the shaft');
      for (const [x, y, ch] of t.sparks) {
        assert.ok(y < t.rows.length && x < t.rows[y].length, `spark ${x},${y}`);
        assert.equal(t.rows[y][x], '.', `spark ${x},${y} is apart from the sceptre`);
        assert.ok(t.gold.includes(ch) || t.gem.includes(ch), `spark ${x},${y} is recoloured`);
      }
    }
    const count = (rows: string[]) => {
      const n: Record<string, number> = {};
      for (const r of rows) for (const c of r) if (c !== '.') n[c] = (n[c] ?? 0) + 1;
      return n;
    };
    const a = count(ROSE_SCEPTRE.rows);
    const b = count(ROSE_SCEPTRE_STRAIGHT.rows);
    // the straightened butt closes its line with one pixel more
    assert.deepEqual(b, { ...a, o: a.o + 1 });
    assert.equal(ROSE_SCEPTRE_STRAIGHT.angle, -90);
    assert.ok(ROSE_SCEPTRE.angle < -60 && ROSE_SCEPTRE.angle > -80, 'he drew it up and leaning right');
  });

  it('draws in every pose and body, and recolours the gold and the gem', () => {
    const poses: SpritePose[] = ['idle', 'attack', 'cast', 'hurt', 'victory', 'charge', 'walk', 'run', 'crouch', 'sneak', 'downed', 'sit', 'lean', 'read', 'train', 'handsigns', 'pierce'];
    for (const body of ['female', 'male', 'bulky', 'slender'] as const)
      for (const pose of poses) assert.ok(heldPixels(look([], body), pose, 0) > 40, `${body} ${pose}`);
    const a = renderSprite(look(), 'idle', 0).rgba;
    assert.notDeepEqual(a, renderSprite(look(['#c0c8d8', PRINCESS_SCEPTRE_GEM]), 'idle', 0).rgba);
    assert.notDeepEqual(a, renderSprite(look([PRINCESS_SCEPTRE_GOLD, '#3070c0']), 'idle', 0).rgba);
  });

  it('stays up in her far fist when she throws: she throws a kunai from the pouch', () => {
    assert.ok(heldPixels(look(), 'throw', THROW_RELEASE_FRAME - 1) > 40);
    assert.ok(heldPixels(look(), 'throw', THROW_RELEASE_FRAME) > 40);
    for (const body of ['female', 'male'] as const) assert.equal(throwRelease(body, 'held_rose_sceptre').thrown, 'held_kunai');
  });

  it('never changes hands: up in her far fist where he drew it, at rest and in every action', () => {
    const at = (r: Rig) => [r.handF.x - r.shoulderF.x, r.handF.y - r.shoulderF.y].map((n) => Math.round(n * 100));
    for (const body of ['female', 'male', 'bulky', 'slender'] as const) {
      const rest = renderSprite(look([], body), 'idle', 0).rig;
      assert.ok(rest.sceptreUp, `${body} at rest`);
      for (const pose of ['attack', 'cast', 'hurt', 'victory', 'charge', 'throw', 'pierce', 'walk', 'run', 'crouch', 'sneak'] as const) {
        for (let f = 0; f < frameCount(rigPoseFor(pose)); f++) {
          const r = renderSprite(look([], body), pose, f).rig;
          assert.ok(r.sceptreUp, `${body} ${pose} ${f}`);
          assert.deepEqual(at(r), at(rest), `${body} ${pose} ${f}: the far hand where it is at rest`);
        }
      }
      // put away for hand signs and at camp, dropped when downed, swung in the near fist only in the drill
      for (const pose of ['handsigns', 'sit', 'downed', 'train'] as const) assert.ok(!renderSprite(look([], body), pose, 0).rig.sceptreUp, `${body} ${pose}`);
    }
  });

  it('fights as a sceptre (a light mace)', () => {
    const w = weaponOf({ ...DEFAULT_CHARACTER, appearance: look() });
    assert.equal(w.name, 'Sceptre');
    assert.equal(w.dice, '1d6');
    assert.equal(w.type, 'Bludgeoning');
  });
});
