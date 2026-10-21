// Tests for Aurelia's boots (feet_dawn_boots), the owner's pixels from his picture of her at our scale:
// npm test.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import {
  DAWN_BOOT_CLOTH,
  DAWN_BOOT_GOLD,
  DAWN_FOOT_F,
  DAWN_FOOT_N,
  DAWN_SHIN_F,
  DAWN_SHIN_N,
  DAWN_THIGH_N,
} from './items/aureliaBootsArt';
import type { PaintedPiece } from './painted';
import { GRID, RES, Vec } from './raster';
import { buildRig, drawRig } from './rig';
import type { SpriteAppearance } from './types';

const hexAt = (rgba: Uint8ClampedArray | Uint8Array, x: number, y: number) => {
  const i = (y * GRID + x) * 4;
  return '#' + [0, 1, 2].map((k) => rgba[i + k].toString(16).padStart(2, '0')).join('');
};

function look(colors: string[] = []): SpriteAppearance {
  const base = DEFAULT_CHARACTER.appearance!;
  return { ...base, body: 'female', slots: { feet: { id: 'feet_dawn_boots', colors } }, pixelEdits: [] };
}

/** Each pixel of a piece as laid at rest (its pivot on the joint): [x, y, his colour]. */
function laid(p: PaintedPiece, at: Vec, keep: (x: number, y: number) => boolean = () => true): [number, number, string][] {
  const ax = Math.floor(at.x * RES) - p.pivot[0];
  const ay = Math.floor(at.y * RES) - p.pivot[1];
  const out: [number, number, string][] = [];
  p.rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch !== '.' && keep(ax + i, ay + j)) out.push([ax + i, ay + j, p.colors[ch]]);
  }));
  return out;
}

describe('Dawn Boots', () => {
  it('is a women-only boot in the feet slot with his white and gold as defaults', () => {
    const item = getItem('feet_dawn_boots')!;
    assert.equal(item.slot, 'feet');
    assert.deepEqual(item.bodies, ['female', 'slender']);
    assert.deepEqual(item.colors.map((c) => c.default), [DAWN_BOOT_CLOTH, DAWN_BOOT_GOLD]);
  });

  it('stands at rest exactly as laid: every pixel of both boots is his', () => {
    const f = renderSprite(look(), 'idle', 0);
    const r = buildRig('female', 'idle', 0);
    const pixels = [
      ...laid(DAWN_THIGH_N, r.kneeN),
      ...laid(DAWN_SHIN_N, r.ankleN),
      ...laid(DAWN_FOOT_N, r.ankleN),
      ...laid(DAWN_FOOT_F, r.ankleF),
      // the far lace top's top rows go under the hips: there the body's shorts cover it when no skirt is worn
      ...laid(DAWN_SHIN_F, r.ankleF, (_x, y) => y > Math.floor(r.hipF.y * RES) + 6),
    ];
    assert.ok(pixels.length > 400);
    for (const [x, y, hex] of pixels) assert.equal(hexAt(f.rgba, x, y), hex, `pixel ${x},${y}`);
  });

  it('stands the far shoe on his far sole at rest, two rows above the near one, as he drew them', () => {
    const f = renderSprite(look(), 'idle', 0);
    const low = (x0: number, x1: number) => {
      let y = 0;
      for (let yy = 0; yy < GRID; yy++) for (let x = x0; x < x1; x++) if (f.rgba[(yy * GRID + x) * 4 + 3]) y = yy;
      return y;
    };
    const r = buildRig('female', 'idle', 0);
    const near = low(Math.floor(r.ankleN.x * RES) - 8, Math.floor(r.ankleN.x * RES) + 4);
    const far = low(Math.floor(r.ankleF.x * RES) - 6, Math.floor(r.ankleF.x * RES) + 6);
    assert.equal(near - far, 2);
  });

  it('keeps the boots on the ground where our feet stand, in every pose', () => {
    const bare: SpriteAppearance = { ...look(), slots: {} };
    const lowest = (rgba: Uint8ClampedArray | Uint8Array) => {
      for (let y = GRID - 1; y >= 0; y--) for (let x = 0; x < GRID; x++) if (rgba[(y * GRID + x) * 4 + 3]) return y;
      return -1;
    };
    for (const [pose, frame] of [['idle', 0], ['walk', 2], ['lean', 0], ['pierce', 2], ['throw', 2], ['run', 3], ['attack', 1]] as const) {
      const a = lowest(renderSprite(look(), pose, frame).rgba);
      const b = lowest(renderSprite(bare, pose, frame).rgba);
      assert.ok(a <= b + 1, `${pose} ${frame}: boots ${a}, feet ${b}`);
    }
  });

  it('recolours cloth and gold from the colour slots and keeps his black line', () => {
    const r = buildRig('female', 'idle', 0);
    const base = renderSprite(look(), 'idle', 0);
    const f = renderSprite(look(['#3b6fd4', '#c0c0c0']), 'idle', 0);
    let line = 0;
    let changed = 0;
    for (const [x, y, hex] of laid(DAWN_SHIN_N, r.ankleN)) {
      if (hex === DAWN_SHIN_N.colors.k) {
        assert.equal(hexAt(f.rgba, x, y), hex);
        line++;
      } else if (hexAt(f.rgba, x, y) !== hexAt(base.rgba, x, y)) changed++;
    }
    assert.ok(line > 10 && changed > 40);
  });
});

describe("Aurelia's scripts", () => {
  it('lay her pieces on our female as she stands now (tools/refs/aurelia_rig.py JOINTS)', () => {
    // her scripts copy the female's idle joints by hand: if the body changes, they must be rerun
    const py = readFileSync(new URL('../../tools/refs/aurelia_rig.py', import.meta.url), 'utf8');
    const r = drawRig('female', 'idle', 0);
    const block = py.slice(py.indexOf('JOINTS = {'), py.indexOf('}', py.indexOf('JOINTS = {')));
    const joints = [...block.matchAll(/'(\w+)': \(([\d.]+), ([\d.]+)\)/g)];
    assert.ok(joints.length >= 17);
    for (const [, name, x, y] of joints) {
      const j = (r as unknown as Record<string, Vec>)[name];
      assert.ok(j, name);
      assert.ok(Math.abs(j.x * RES - Number(x)) < 0.01 && Math.abs(j.y * RES - Number(y)) < 0.01, `${name}: ${j.x * RES}, ${j.y * RES}`);
    }
  });
});
