// Tests for the owner's Saya scarf (items/sayaScarf.ts, items/sayaScarfArt.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { SAYA_SCARF_BASE, SAYA_SCARF_SHOULDER, SAYA_SCARF_TAIL, SAYA_SCARF_WRAP } from './items/sayaScarfArt';
import { GRID } from './raster';
import type { BodyType, SpriteAppearance, SpritePose } from './types';

const look = (body: BodyType, colors: string[] = []): SpriteAppearance => ({
  version: 1,
  body,
  skin: '#f6c7a6',
  eyeShape: 'standard',
  eyeColor: '#2f9e6a',
  slots: { cape: { id: 'cape_crimson_scarf', colors } },
  accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
  pixelEdits: [],
});

/** Every colour in the frame. */
const colours = (rgba: Uint8ClampedArray): Set<string> => {
  const s = new Set<string>();
  for (let i = 0; i < GRID * GRID; i++) {
    if (rgba[i * 4 + 3] === 0) continue;
    s.add('#' + [0, 1, 2].map((c) => rgba[i * 4 + c].toString(16).padStart(2, '0')).join(''));
  }
  return s;
};

describe('Saya scarf', () => {
  it('is a cape-slot item with his lit red as the default colour', () => {
    const def = getItem('cape_crimson_scarf')!;
    assert.equal(def.slot, 'cape');
    assert.deepEqual(def.colors.map((c) => [c.key, c.default]), [['main', SAYA_SCARF_BASE]]);
  });

  it('has whole pictures: even rows, every character one of his colours', () => {
    for (const p of [SAYA_SCARF_WRAP, SAYA_SCARF_SHOULDER, SAYA_SCARF_TAIL]) {
      const w = p.rows[0].length;
      assert.ok(p.rows.every((r) => r.length === w));
      for (const r of p.rows) for (const ch of r) if (ch !== '.') assert.match(p.colors[ch] ?? '', /^#[0-9a-f]{6}$/, ch);
    }
  });

  it('shows his reds at idle and draws in every pose and body', () => {
    const idle = colours(renderSprite(look('female'), 'idle', 0).rgba);
    for (const c of Object.values(SAYA_SCARF_WRAP.colors)) assert.ok(idle.has(c), c);
    const poses: [SpritePose, number][] = [['run', 2], ['attack', 1], ['downed', 0], ['cast', 2], ['sit', 0]];
    for (const body of ['female', 'male', 'bulky'] as BodyType[]) {
      for (const [pose, f] of poses) assert.ok(colours(renderSprite(look(body), pose, f).rgba).has(SAYA_SCARF_BASE), `${body} ${pose}`);
    }
  });

  it('recolours his reds and keeps them at his colour', () => {
    const blue = colours(renderSprite(look('female', ['#2050c0']), 'idle', 0).rgba);
    assert.ok(!blue.has(SAYA_SCARF_BASE));
  });
});
