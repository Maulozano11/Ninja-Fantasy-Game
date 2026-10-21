// Tests for Elise on the female body v2 (tools/refs/elise_fit.py): her pieces re-laid on its joints.
// npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { renderSpriteCached } from './compose';
import { AZURE_SKIN_RAMP } from './eliseEyeArt';
import { getAppearance } from './legacy';
import { GRID, partIndex, PartId } from './raster';
import type { SpritePose } from './types';

const ELISE = getAppearance(LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_elise')!.character);

const hexAt = (rgba: Uint8ClampedArray, i: number): string =>
  '#' + [rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]].map((c) => c.toString(16).padStart(2, '0')).join('');

/** Her skin's shades but her line: a pixel in one of these is bare skin. */
const SKIN = new Set(AZURE_SKIN_RAMP.slice(1));

function bareSkin(pose: SpritePose, frame: number, parts: PartId[], rows?: [number, number]): number[] {
  const f = renderSpriteCached(ELISE, pose, frame);
  const want = new Set(parts.map(partIndex));
  const out: number[] = [];
  for (let i = 0; i < GRID * GRID; i++) {
    const y = Math.floor(i / GRID);
    if (rows && (y < rows[0] || y > rows[1])) continue;
    if (f.rgba[i * 4 + 3] && want.has(f.part[i]) && SKIN.has(hexAt(f.rgba, i))) out.push(i);
  }
  return out;
}

const at = (is: number[]) => is.map((i) => `(${i % GRID}, ${Math.floor(i / GRID)})`).join(' ');

describe('Elise on the female body v2', () => {
  it('shows no bare skin under her greaves: shins and feet covered standing, walking and running', () => {
    for (const [pose, n] of [['idle', 4], ['walk', 8], ['run', 6]] as [SpritePose, number][]) {
      for (let frame = 0; frame < n; frame++) {
        const bare = bareSkin(pose, frame, ['shinN', 'shinF', 'footN', 'footF']);
        assert.equal(bare.length, 0, `${pose} ${frame}: ${at(bare)}`);
      }
    }
  });

  it('shows no bare waist between her coat and her belts at rest', () => {
    // the coat body is three rows longer on the new body's longer torso, down under the belts
    // (above row 158 her own neck shows in the collar's opening, as in her picture)
    const bare = bareSkin('idle', 0, ['torso', 'pelvis'], [158, 186]);
    assert.equal(bare.length, 0, at(bare));
  });

  it('puts her gloves on the body\'s own small hands: no glove pixel off the bare hand\'s shape', () => {
    for (const [pose, frame] of [['idle', 0], ['attack', 0], ['handsigns', 0], ['cast', 1]] as [SpritePose, number][]) {
      const gloved = renderSpriteCached(ELISE, pose, frame);
      const bare = renderSpriteCached({ ...ELISE, slots: { ...ELISE.slots, hands: undefined } }, pose, frame);
      for (const s of ['N', 'F'] as const) {
        const hand = partIndex(`hand${s}` as PartId);
        const off: number[] = [];
        let n = 0;
        for (let i = 0; i < GRID * GRID; i++) {
          if (!gloved.rgba[i * 4 + 3] || gloved.part[i] !== hand) continue;
          n++;
          if (!bare.rgba[i * 4 + 3]) off.push(i);
        }
        assert.ok(n > 0, `${pose} ${s}: no hand drawn`);
        assert.equal(off.length, 0, `${pose} ${s}: ${at(off)}`);
      }
    }
  });
});
