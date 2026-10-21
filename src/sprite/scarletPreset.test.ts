// Tests for the owner's Scarlet as a legend (preset_reference_scarlet, provisionally "Valen"): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { deriveStats } from '../rules/derived';
import { getItem } from './catalog';

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
});
