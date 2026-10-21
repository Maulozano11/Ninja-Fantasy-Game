// Tests for the katana built from parts and for item parts in the sprite system: npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getItem } from './catalog';
import { renderSpriteCached } from './compose';
import { resolveParts } from './ctx';
import { KATANA_PARTS, katanaHipColors, katanaTemplate } from './items/katana';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import type { SpriteAppearance } from './types';

const ids = (key: string) => KATANA_PARTS.find((p) => p.key === key)!.options.map((o) => o.id);

function* everyKatana(): Generator<Record<string, string>> {
  for (const steel of ids('steel')) for (const blade of ids('blade')) for (const guard of ids('guard')) for (const hilt of ids('hilt')) yield { steel, blade, guard, hilt };
}

describe('katana parts', () => {
  it('offers three versions of steel, blade, guard and hilt', () => {
    assert.deepEqual(
      KATANA_PARTS.map((p) => [p.key, p.options.map((o) => o.id)]),
      ['steel', 'blade', 'guard', 'hilt'].map((k) => [k, ['a', 'b', 'c']]),
    );
  });

  it('builds all 81 katanas as whole pictures: even rows, every character coloured, the pivot on the grip', () => {
    for (const parts of everyKatana()) {
      const t = katanaTemplate(parts, '#e8321e');
      const w = t.rows[0].length;
      assert.ok(t.rows.every((r) => r.length === w), JSON.stringify(parts));
      for (const r of t.rows) for (const ch of r) if (ch !== '.') assert.match(t.colors[ch] ?? '', /^#[0-9a-f]{6}$/, `${JSON.stringify(parts)} '${ch}'`);
      const [px, py] = t.pivot;
      assert.notEqual(t.rows[py][px], '.', 'the pivot sits on the hilt');
      assert.equal(t.angle, 0);
    }
  });

  it('gives each version of a part its own pixels', () => {
    for (const key of ['steel', 'blade', 'guard', 'hilt']) {
      const looks = ids(key).map((id) => JSON.stringify(katanaTemplate({ steel: 'a', blade: 'a', guard: 'a', hilt: 'a', [key]: id }, '#36a0f0')));
      assert.equal(new Set(looks).size, 3, key);
    }
  });

  it('colours only a nichirin blade with the chakra', () => {
    const red = (steel: string) => katanaTemplate({ steel }, '#e8321e').colors;
    const blue = (steel: string) => katanaTemplate({ steel }, '#36a0f0').colors;
    assert.deepEqual(red('a'), blue('a'));
    assert.deepEqual(red('b'), blue('b'));
    assert.equal(red('c').N, '#e8321e');
    assert.equal(blue('c').N, '#36a0f0');
  });

  it('takes the classic version for missing or unknown parts', () => {
    assert.deepEqual(katanaTemplate({ steel: 'z', blade: '' }, '#36a0f0'), katanaTemplate({ steel: 'a', blade: 'a', guard: 'a', hilt: 'a' }, '#36a0f0'));
    assert.deepEqual(katanaHipColors({}), katanaHipColors({ hilt: 'a', guard: 'a' }));
  });
});

describe('item parts', () => {
  const katana = getItem('held_katana')!;

  it('fills in every part, keeping known versions and defaulting the rest', () => {
    assert.deepEqual(resolveParts(katana, undefined), { steel: 'a', blade: 'a', guard: 'a', hilt: 'a' });
    assert.deepEqual(resolveParts(katana, { blade: 'c', guard: 'x', extra: 'b' }), { steel: 'a', blade: 'c', guard: 'a', hilt: 'a' });
    assert.deepEqual(resolveParts(getItem('held_kunai')!, { blade: 'c' }), {});
  });

  it('draws the parts that were picked, in hand and stowed', () => {
    const base = DEFAULT_CHARACTER.appearance!;
    const look = (parts?: Record<string, string>): SpriteAppearance => ({ ...base, slots: { ...base.slots, held: { id: 'held_katana', colors: [], parts } } });
    for (const pose of ['idle', 'attack'] as const) {
      const plain = renderSpriteCached(look(), pose, 0).rgba;
      assert.deepEqual(renderSpriteCached(look({ steel: 'a', blade: 'a', guard: 'a', hilt: 'a' }), pose, 0).rgba, plain, 'the default is the classic katana');
      for (const parts of [{ steel: 'b' }, { blade: 'b' }, { guard: 'b' }, { hilt: 'c' }] as Record<string, string>[]) assert.notDeepEqual(renderSpriteCached(look(parts), pose, 0).rgba, plain, `${pose} ${JSON.stringify(parts)}`);
    }
    // stowed at the hip in hand signs: the hilt's wrap shows
    assert.notDeepEqual(renderSpriteCached(look({ hilt: 'c' }), 'handsigns', 0).rgba, renderSpriteCached(look(), 'handsigns', 0).rgba);
  });
});
