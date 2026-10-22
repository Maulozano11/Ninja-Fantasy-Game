// Tests for Lyra's thigh-high boots (feet_gilded_thigh_boots), the owner's pixels from his picture of her
// at our game's scale: npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { LYRA_BOOT_FOOT_F, LYRA_BOOT_FOOT_N, LYRA_BOOT_KIND, LYRA_BOOT_LEGS, LYRA_BOOT_SHIN_F, LYRA_BOOT_SHIN_N, LYRA_BOOT_THIGH_F, LYRA_BOOT_THIGH_N } from './items/lyraBootsArt';
import type { PaintedPiece } from './painted';
import * as RASTER from './raster';
import { GRID } from './raster';
import { frameCount, rigPoseFor } from './rig';
import type { SpriteAppearance, SpritePose } from './types';

const hexAt = (rgba: Uint8ClampedArray | Uint8Array, x: number, y: number) => {
  const i = (y * GRID + x) * 4;
  return '#' + [0, 1, 2].map((k) => rgba[i + k].toString(16).padStart(2, '0')).join('');
};

function look(colors: string[] = []): SpriteAppearance {
  const base = DEFAULT_CHARACTER.appearance!;
  return { ...base, body: 'female', slots: { feet: { id: 'feet_gilded_thigh_boots', colors } }, pixelEdits: [] };
}

/** The pieces where they stand at idle frame 0 (far leg, then near; foot, shin, thigh): (x, y) -> [letter, hex]. */
function atRest(): Map<string, [string, string]> {
  const out = new Map<string, [string, string]>();
  const lay = (p: PaintedPiece, joint: readonly [number, number]) => {
    const x0 = Math.floor(joint[0]) - p.pivot[0];
    const y0 = Math.floor(joint[1]) - p.pivot[1];
    p.rows.forEach((row, j) => [...row].forEach((ch, i) => ch !== '.' && out.set(`${x0 + i},${y0 + j}`, [ch, p.colors[ch]])));
  };
  for (const [s, foot, shin, thigh] of [['F', LYRA_BOOT_FOOT_F, LYRA_BOOT_SHIN_F, LYRA_BOOT_THIGH_F], ['N', LYRA_BOOT_FOOT_N, LYRA_BOOT_SHIN_N, LYRA_BOOT_THIGH_N]] as const) {
    const L = LYRA_BOOT_LEGS[s];
    lay(foot, L.hisAnkle);
    lay(shin, L.hisAnkle);
    lay(thigh, L.hisKnee);
  }
  return out;
}

describe('Gilded Thigh Boots', () => {
  it('is a women-only boot in the feet slot with her colours as defaults', () => {
    const item = getItem('feet_gilded_thigh_boots')!;
    assert.equal(item.slot, 'feet');
    assert.deepEqual(item.bodies, ['female']);
    assert.deepEqual(item.colors.map((c) => c.default), ['#301f25', '#cc8e3b', '#da9a42']);
  });

  it('stands at idle exactly where he drew it, every pixel his (her skin aside)', () => {
    const f = renderSprite(look(), 'idle', 0);
    let n = 0;
    for (const [key, [ch, hex]] of atRest()) {
      const [x, y] = key.split(',').map(Number);
      if (y < 186 || LYRA_BOOT_KIND[ch] === 'skin') continue; // above: under the body's hips
      assert.equal(hexAt(f.rgba, x, y), hex, `(${x}, ${y})`);
      n++;
    }
    assert.ok(n > 500);
    assert.equal(hexAt(f.rgba, 122, 188), '#fccc69'); // near cuff's glint
    assert.equal(hexAt(f.rgba, 111, 211), '#da9a42'); // near strap's stud
    assert.equal(hexAt(f.rgba, 140, 216), '#010101'); // far sole, his line
  });

  it('keeps his soles to our feet in motion: the near sole never below our near foot, the far as far below ours as at idle', () => {
    const { partIndex } = RASTER;
    const low = (rgba: Uint8ClampedArray | Uint8Array, part: Uint8Array, s: 'N' | 'F') => {
      const ids = [partIndex(`foot${s}`), partIndex(`shin${s}`)];
      for (let y = GRID - 1; y >= 0; y--) for (let x = 0; x < GRID; x++) if (rgba[(y * GRID + x) * 4 + 3] && ids.includes(part[y * GRID + x])) return y;
      return -1;
    };
    const bare = { ...look(), slots: {} };
    const at = (pose: SpritePose, f: number) => {
      const a = renderSprite(bare, pose, f);
      const b = renderSprite(look(), pose, f);
      return { N: low(b.rgba, b.part, 'N') - low(a.rgba, a.part, 'N'), F: low(b.rgba, b.part, 'F') - low(a.rgba, a.part, 'F') };
    };
    const idle = at('idle', 0);
    for (const pose of ['walk', 'run', 'crouch', 'sneak'] as SpritePose[]) {
      for (let f = 0; f < frameCount(rigPoseFor(pose)); f++) {
        const d = at(pose, f);
        assert.ok(d.N <= idle.N, `${pose} ${f} near: ${d.N}`);
        assert.ok(Math.abs(d.F - idle.F) <= 1, `${pose} ${f} far: ${d.F} vs ${idle.F}`);
      }
    }
  });

  it('recolours leather, gold and studs from the colour slots and keeps his black line', () => {
    const f = renderSprite(look(['#3b6fd4', '#c0c0c0', '#d02020']), 'idle', 0);
    assert.notEqual(hexAt(f.rgba, 120, 196), '#301f25');
    assert.notEqual(hexAt(f.rgba, 122, 188), '#fccc69');
    assert.notEqual(hexAt(f.rgba, 111, 211), '#da9a42');
    assert.equal(hexAt(f.rgba, 140, 216), '#010101');
  });
});
