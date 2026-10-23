// The element on the weapon in hand (Weapon Element Enhancement; sprite/imbue.ts): found on the
// weapon in every pose that holds it, none where the hands are busy or the weapon is put away, the
// water reaching past the tip, the obsidian with the black line and never in a chakra colour.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { getAppearance } from './legacy';
import { bladeOf, IMBUE_FX, IMBUE_LOOP, renderImbue, waterReachPx } from './imbue';
import { GRID } from './raster';

const look = getAppearance(DEFAULT_CHARACTER);
const opaque = (rgba: Uint8ClampedArray) => {
  let n = 0;
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i]) n++;
  return n;
};

describe('the weapon in the frame', () => {
  it('is found in the poses that hold it, pointing from the hand to the tip', () => {
    for (const [pose, frame] of [['idle', 0], ['attack', 0], ['attack', 1], ['attack', 2], ['pierce', 2], ['run', 2], ['walk', 3], ['charge', 0], ['train', 2]] as const) {
      const b = bladeOf(look, pose, frame);
      assert.ok(b, `${pose} ${frame}`);
      assert.ok(b.tip > 20 && b.tip < 80, `${pose} ${frame}: ${b.tip}`);
      assert.ok(b.start < b.tip);
    }
    // At rest Solen's ice sword hangs down to the right, the attack's level cut points right.
    const idle = bladeOf(look, 'idle', 0)!;
    assert.ok(idle.dx > 0.3 && idle.dy > 0.3, `${idle.dx} ${idle.dy}`);
    const cut = bladeOf(look, 'attack', 1)!;
    assert.ok(cut.dx > 0.9, `${cut.dx}`);
  });

  it('is none where the weapon is not in the hand: hand seals, the unarmed combo, stowed, knocked out', () => {
    assert.equal(bladeOf(look, 'handsigns', 0), null);
    assert.equal(bladeOf(look, 'combo', 2), null);
    assert.equal(bladeOf(look, 'downed', 0), null);
    assert.equal(bladeOf({ ...look, stowed: true }, 'idle', 0), null);
    assert.equal(bladeOf({ ...look, slots: { ...look.slots, held: undefined } }, 'idle', 0), null);
  });
});

describe('the five elements on it', () => {
  const b = bladeOf(look, 'attack', 1)!;

  it('each draws something, near the blade, and loops', () => {
    for (const fx of IMBUE_FX) {
      const a = renderImbue(fx, 0, b);
      assert.ok(opaque(a.front) + opaque(a.back) > 30, fx);
      // The same tick is the same picture; the loop wraps.
      assert.deepEqual(renderImbue(fx, IMBUE_LOOP, b).front, a.front, fx);
      if (fx !== 'earth') assert.notDeepEqual(renderImbue(fx, 3, b).front, a.front, `${fx} moves`);
    }
  });

  it('water reaches past the tip: the longer reach', () => {
    const w = renderImbue('water', 0, b).front;
    const ext = waterReachPx(b);
    assert.ok(ext >= 16);
    let far = 0;
    for (let i = 0; i < GRID * GRID; i++) {
      if (!w[i * 4 + 3]) continue;
      const t = ((i % GRID) + 0.5 - b.hx) * b.dx + (((i / GRID) | 0) + 0.5 - b.hy) * b.dy;
      far = Math.max(far, t);
    }
    assert.ok(far >= b.tip + ext - 3, `${far} vs ${b.tip} + ${ext}`);
    // Nothing else reaches that far.
    const fire = renderImbue('fire', 0, b).front;
    let farFire = 0;
    for (let i = 0; i < GRID * GRID; i++) if (fire[i * 4 + 3]) farFire = Math.max(farFire, ((i % GRID) + 0.5 - b.hx) * b.dx + (((i / GRID) | 0) + 0.5 - b.hy) * b.dy);
    assert.ok(farFire < b.tip + 8);
  });

  it('obsidian is solid: the characters\' black line round it, and it keeps its colours in any chakra colour', () => {
    const e = renderImbue('earth', 0, b).front;
    let line = 0;
    for (let i = 0; i < GRID * GRID; i++) if (e[i * 4 + 3] === 255 && e[i * 4] === 0x07 && e[i * 4 + 1] === 0x06 && e[i * 4 + 2] === 0x0b) line++;
    assert.ok(line > 20, `${line}`);
    assert.deepEqual(renderImbue('earth', 0, b, 'violet').front, e);
  });

  it('the energy takes the chakra colour; Natural keeps his colours', () => {
    for (const fx of ['fire', 'lightning', 'wind', 'water'] as const) {
      const own = renderImbue(fx, 0, b);
      assert.deepEqual(renderImbue(fx, 0, b, undefined).front, own.front);
      assert.notDeepEqual(renderImbue(fx, 0, b, 'violet').front, own.front, fx);
    }
  });
});
