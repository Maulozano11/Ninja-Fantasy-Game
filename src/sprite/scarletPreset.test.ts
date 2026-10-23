// Tests for the owner's Scarlet as a legend (preset_reference_scarlet, provisionally "Valen"): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { deriveStats } from '../rules/derived';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { GRID, PARTS } from './raster';
import type { SpritePose } from './types';

const valen = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_reference_scarlet')!.character;

describe('the Scarlet legend', () => {
  it('wears his items in his colours, without the cape and without a chakra burst', () => {
    const look = valen.appearance!;
    const ids = Object.fromEntries(Object.entries(look.slots).map(([slot, c]) => [slot, c!.id]));
    assert.deepEqual(ids, {
      hair: 'hair_scarlet',
      top: 'top_noble_shirt',
      bottom: 'bottom_pinstripe',
      armor: 'armor_scarlet_coat',
      waist: 'waist_noble_belt',
      hands: 'hands_noble_fingerless',
      feet: 'feet_noble_boots',
      held: 'held_scarlet_sword',
    });
    for (const [slot, c] of Object.entries(look.slots)) {
      assert.equal(getItem(c!.id)?.slot, slot, c!.id);
      // no colours of our own: every item keeps his
      assert.deepEqual(c!.colors, [], c!.id);
    }
    assert.deepEqual([look.body, look.faceShape, look.eyeShape, look.skin, look.eyeColor], ['male', 'noble', 'noble', '#f8d4b8', '#c88038']);
    assert.deepEqual([look.chakra.onCharge, look.chakra.onCast, look.chakra.onVictory], [false, false, false]);
    // his own amber eyes, with no clan marks over them
    assert.equal(valen.dojutsu, 'None');
  });

  it('has the sheet the creator gives him', () => {
    // the creator takes the armour style (for AC) from the armour he wears: his coat
    assert.equal(valen.armorStyle, getItem('armor_scarlet_coat')!.statsArmor);
    const d = deriveStats({ level: valen.level, stats: valen.stats, clan: valen.clan, shinobiClass: valen.shinobiClass, armor: valen.armorStyle, feats: valen.selectedFeats });
    for (const k of ['maxHp', 'maxChakra', 'armorClass', 'speed', 'jutsuSaveDC', 'jutsuAttackBonus'] as const) assert.equal(valen[k], d[k], k);
  });

  // the review's frames: Valen on each body, sword in hand or stowed in battle
  const frame = (body: string, pose: SpritePose, fr: number, stowed = false, skin?: string) =>
    renderSprite({ ...valen.appearance!, body: body as never, stowed, ...(skin ? { skin } : {}) }, pose, fr);
  const parts = (...names: string[]) => new Set(names.map((n) => PARTS.indexOf(n as never)));

  it('shows no bare knee between his trousers and his boots on a bent leg', () => {
    const legs = parts('thighN', 'thighF', 'shinN', 'shinF', 'footN', 'footF');
    for (const [body, pose, fr] of [['male', 'lean', 0], ['male', 'run', 0], ['male', 'sneak', 1], ['bulky', 'crouch', 0], ['bulky', 'walk', 1], ['female', 'run', 0]] as const) {
      // the skin turned green, so any of it showing is found
      const f = frame(body, pose, fr, false, '#00ff00');
      for (let i = 0; i < GRID * GRID; i++) {
        const [r, g, b] = [f.rgba[i * 4], f.rgba[i * 4 + 1], f.rgba[i * 4 + 2]];
        if (f.rgba[i * 4 + 3] && legs.has(f.part[i])) assert.ok(!(g > r + 40 && g > b + 40), `${body} ${pose} ${fr}: skin at ${i % GRID},${(i / GRID) | 0}`);
      }
    }
  });

  it('bares his own skin at the fingertips and the wrist, never ours', () => {
    // our skin's ramp on his skin tone: its line, shadow and mid shades are the red band
    const ours = new Set(['#18090d', '#af504c', '#dd937c']);
    const arms = parts('handN', 'handF', 'forearmN', 'forearmF');
    for (const [body, pose, fr, stowed] of [['male', 'idle', 0, true], ['male', 'walk', 1, true], ['male', 'handsigns', 1, false], ['male', 'cast', 1, false], ['bulky', 'idle', 0, false], ['bulky', 'read', 0, false], ['male', 'charge', 0, false]] as const) {
      const f = frame(body, pose, fr, stowed);
      for (let i = 0; i < GRID * GRID; i++) {
        if (!f.rgba[i * 4 + 3] || !arms.has(f.part[i])) continue;
        const hex = '#' + [0, 1, 2].map((k) => f.rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');
        assert.ok(!ours.has(hex), `${body} ${pose} ${fr}: ${hex} at ${i % GRID},${(i / GRID) | 0}`);
      }
    }
  });

  it('keeps his far hand in sight beside the coat on every body', () => {
    // the curled fingertips of his far fist
    const tips = new Set(['#b27758', '#be8867', '#9e654b']);
    for (const body of ['male', 'female', 'bulky']) {
      const f = frame(body, 'idle', 0);
      let n = 0;
      for (let i = 0; i < GRID * GRID; i++) {
        const hex = '#' + [0, 1, 2].map((k) => f.rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');
        if (f.rgba[i * 4 + 3] && f.part[i] === PARTS.indexOf('handF') && tips.has(hex)) n++;
      }
      assert.ok(n >= 2, `${body}: ${n} fingertip pixels of the far hand`);
    }
  });

  it('opens no crack between his sleeves and his coat', () => {
    for (const [pose, fr, x, y] of [['charge', 0, 115, 165], ['charge', 1, 116, 166]] as const) {
      const f = frame('male', pose, fr);
      assert.ok(f.rgba[(y * GRID + x) * 4 + 3] > 0, `${pose} ${fr}: ${x},${y}`);
    }
  });
});
