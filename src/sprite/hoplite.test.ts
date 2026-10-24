// Tests for the owner's bronze warrior (docs/reference/bronze-warrior-owner-reference.jpg): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { faceAnchor } from './body';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import type { DrawCtx } from './ctx';
import { HOPLITE_FIGURE, HOPLITE_FIGURE_AT, HOPLITE_JOINTS } from './hopliteFigureArt';
import { HOPLITE_R_FIGURE, HOPLITE_R_FIGURE_AT } from './items/hopliteRepaintArt';
import { hopliteRig } from './hopliteRig';
import { GRID, RES } from './raster';
import { drawRig } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type SpriteAppearance, type SpritePose } from './types';

const presetOf = (id: string) => LEGENDARY_PRESETS.find((p) => p.character.id === id)!.character;
const look = (body: 'male' | 'bulky' = 'male', id = 'preset_bronze_warrior'): SpriteAppearance => ({ ...structuredClone(presetOf(id).appearance!), body });
const hex = (rgba: Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');

/** His figure at our scale as the script wrote it: fine pixel index -> colour. */
function figure(fig = HOPLITE_FIGURE, at = HOPLITE_FIGURE_AT): Map<number, string> {
  const out = new Map<number, string>();
  const [x0, y0] = at;
  fig.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') out.set((y0 + j) * GRID + x0 + i, fig.colors[row[i]]);
  });
  return out;
}

/** The pixels a render differs from his figure in. */
function wrongPixels(rgba: Uint8ClampedArray, his: Map<number, string>): string[] {
  const wrong: string[] = [];
  for (let i = 0; i < GRID * GRID; i++) {
    const want = his.get(i);
    const shown = rgba[i * 4 + 3] > 0;
    if (want === undefined ? shown : !shown || hex(rgba, i) !== want) wrong.push(`${i % GRID},${(i / GRID) | 0}: ${shown ? hex(rgba, i) : 'none'} (his ${want ?? 'none'})`);
  }
  return wrong;
}

describe("the owner's bronze warrior", () => {
  it('stands on his joints at male idle frame 0', () => {
    const r = hopliteRig(drawRig('male', 'idle', 0), look());
    for (const [k, [x, y]] of Object.entries(HOPLITE_JOINTS)) {
      const p = (r as unknown as Record<string, { x: number; y: number }>)[k];
      assert.ok(Math.abs(p.x * RES - x) < 1e-6 && Math.abs(p.y * RES - y) < 1e-6, `${k}: ${p.x * RES}, ${p.y * RES} (his ${x}, ${y})`);
    }
  });

  it('has his head where the scripts put it (tools/refs/bronze_ref.py ANCHOR)', () => {
    const r = hopliteRig(drawRig('male', 'idle', 0), look());
    const { nx, ny } = faceAnchor({ rig: r, bp: r.bp, look: look() } as unknown as DrawCtx);
    assert.deepEqual([nx, ny], [123, 139]);
  });

  it('is his cleaned reduction pixel for pixel at male idle frame 0, and nothing else', () => {
    const wrong = wrongPixels(renderSprite(look(), 'idle', 0).rgba, figure());
    assert.equal(wrong.length, 0, `${wrong.length} pixels differ: ${wrong.slice(0, 12).join('; ')}`);
  });

  it('in his second set (leather chest, iron pauldrons, sleeves) is his own repaint pixel for pixel', () => {
    const wrong = wrongPixels(renderSprite(look('male', 'preset_bronze_warrior_leather'), 'idle', 0).rgba, figure(HOPLITE_R_FIGURE, HOPLITE_R_FIGURE_AT));
    assert.equal(wrong.length, 0, `${wrong.length} pixels differ: ${wrong.slice(0, 12).join('; ')}`);
  });

  it('is a male set: none of his pieces fits the female body', () => {
    for (const id of ['hair_hoplite', 'acc_hoplite_diadem', 'armor_hoplite', 'acc_hoplite_pauldrons', 'cape_hoplite', 'skirt_hoplite', 'hands_hoplite_bracers', 'feet_hoplite_greaves', 'armor_hoplite_leather', 'acc_hoplite_iron_pauldrons', 'top_hoplite_sleeves']) {
      const d = getItem(id);
      assert.ok(d, id);
      assert.deepEqual(d!.bodies, ['male', 'bulky'], id);
    }
  });

  it('renders every pose and frame on both male bodies', () => {
    const POSES = [...new Set([...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES])] as SpritePose[];
    for (const body of ['male', 'bulky'] as const)
      for (const pose of POSES) {
        const f = renderSprite(look(body), pose, 0);
        let n = 0;
        for (let i = 0; i < GRID * GRID; i++) if (f.rgba[i * 4 + 3] > 0) n++;
        assert.ok(n > 1500, `${body} ${pose}: ${n} pixels`);
      }
  });
});
