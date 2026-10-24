// Aurelia becomes Wind with yellow chakra (the owner, 2026-10-24: "que se vuelva viento y lo gane en
// nivel 10 pero te digo que hagas que su chakra y sus tecnicas sean chakra amarrilo"): her preset, the
// Gale Dragon Ray at level 10 by the usual rule, and her saved copies moved once.
// npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { AURELIA_WIND, aureliaToWind, migrateCharacter, natureOf } from './ninja';
import { creatorChoices } from './progression';
import { NO_GROWTH } from './natureGrowth';
import { getAppearance } from '../sprite/legacy';
import type { ShinobiCharacter } from '../types/shinobi';

const AURELIA = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_aurelia')!.character;
const RAY = 'wind_dragon_ray_s';
/** A copy of her saved before the change: her old Light burst in her staff's gold, or another colour. */
const oldCopy = (tint?: string, color = 'white'): ShinobiCharacter =>
  JSON.parse(JSON.stringify({ ...AURELIA, appearance: { ...AURELIA.appearance!, chakra: { ...AURELIA.appearance!.chakra, color, ...(tint ? { tint } : {}) } } }));

describe('Aurelia is Wind, in yellow', () => {
  it('her preset: the Wind burst in yellow, Wind by nature, her jutsu as they were', () => {
    assert.deepEqual([AURELIA.appearance!.chakra.color, AURELIA.appearance!.chakra.tint], ['green', 'yellow']);
    assert.equal(natureOf(AURELIA), 'Wind');
    assert.equal(AURELIA.selectedJutsus!.slot5Ultimate, '', 'level 5: no rank S yet');
    assert.equal(migrateCharacter(AURELIA).appearance!.chakra.color, 'green', 'loading her keeps it');
  });

  it('the Gale Dragon Ray is hers by the usual rule: offered to her S-rank slot at level 10, not before', () => {
    const at = (level: number) => creatorChoices('slot5Ultimate', 'Wind', AURELIA.clan, AURELIA.shinobiClass, { ...NO_GROWTH, level }).map((j) => j.id);
    assert.ok(!at(5).includes(RAY), 'not at level 5');
    assert.ok(at(10).includes(RAY), 'at level 10');
  });

  it('a saved copy with her old Light burst becomes Wind, her gold the yellow; a colour of its player\'s stays', () => {
    const moved = aureliaToWind(oldCopy(AURELIA_WIND.old.tint));
    assert.deepEqual([getAppearance(moved).chakra.color, getAppearance(moved).chakra.tint], ['green', 'yellow']);
    assert.equal(natureOf(moved), 'Wind');
    assert.equal(getAppearance(aureliaToWind(oldCopy())).chakra.tint, 'yellow', 'no colour: the yellow');
    assert.equal(getAppearance(aureliaToWind(oldCopy('#ff00aa'))).chakra.tint, '#ff00aa', 'his player\'s pink stays');
    assert.equal(natureOf(migrateCharacter(oldCopy(AURELIA_WIND.old.tint))), 'Wind', 'through migrateCharacter');
  });

  it('a copy whose type its player changed keeps it, another ninja is untouched, and the move happens once', () => {
    const fire = oldCopy('#fac856', 'red');
    assert.equal(aureliaToWind(fire), fire);
    const other = { ...oldCopy(), id: 'someone_else' };
    assert.equal(aureliaToWind(other), other);
    const once = aureliaToWind(oldCopy(AURELIA_WIND.old.tint));
    assert.equal(aureliaToWind(once), once);
  });
});
