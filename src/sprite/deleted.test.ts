// Tests for the pieces deleted from the creator (the owner, 2026-10-21: "borrar piezas marcadas"):
// old saves load with the replacements. The headband stays, as plain cloth (2026-10-22, his later
// "deja la pura bandana la pura tela"): here it only keeps its cloth through the same migration;
// headband.test.ts tests the band itself. npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { COMPANIONS } from '../data/missions';
import { enemyCharacter, type EnemyKind } from '../battle/units';
import { migrateCharacter } from '../rules/ninja';
import type { ShinobiCharacter } from '../types/shinobi';
import { ALL_ITEMS, getItem } from './catalog';
import { renderSprite } from './compose';
import { appearanceFromLegacy, defaultAppearance, DELETED_PIECES, getAppearance, migrateAppearance } from './legacy';
import { randomAppearance } from './random';
import type { SlotId, SpriteAppearance } from './types';

/** The 22 pieces he said to delete (hair_drifter, hair_surge, hair_ascended, hair_youth and feet_cowboy stay: they are being redone). */
const DELETED = [
  'hair_flash', 'hair_gravity', 'hair_silver', 'hair_founder', 'hair_storm2', 'hair_gale', 'hair_charlotte',
  'face_beast', 'face_sage',
  'armor_desert', 'armor_storm', 'armor_dread', 'armor_oath', 'armor_rose', 'armor_lionheart', 'armor_seraph', 'armor_lioness',
  'feet_greaves', 'hands_gauntlets', 'cape_knight', 'cape_rose', 'held_crystal',
];

const slotOf = (id: string): SlotId => id.slice(0, id.indexOf('_')) as SlotId;

const wearing = (id: string, colors: string[] = []): SpriteAppearance => {
  const l = defaultAppearance();
  l.slots[slotOf(id)] = { id, colors };
  return l;
};

const ids = (l: SpriteAppearance): string[] => [...Object.values(l.slots).map((c) => c!.id), ...l.accessories.map((a) => a.id)];

/** A headband with nothing of the old metal plate left: plain cloth. */
const plainCloth = (l: SpriteAppearance): boolean => !['slashed', 'emblem', 'plate'].some((k) => Object.hasOwn(l.headband, k));

const ENEMIES: ShinobiCharacter[] = (['rogue', 'hunter', 'jonin', 'raider'] as EnemyKind[]).flatMap((k) => [0, 1, 2, 3].map((n) => enemyCharacter(k, n)));
const EVERYONE: ShinobiCharacter[] = [...LEGENDARY_PRESETS.map((p) => p.character), ...COMPANIONS, ...ENEMIES];

describe('the deleted pieces', () => {
  it('are out of the catalog, and each has a replacement in it, for the same slot', () => {
    assert.deepEqual(Object.keys(DELETED_PIECES).sort(), [...DELETED].sort());
    for (const id of DELETED) {
      assert.equal(getItem(id), undefined, `${id} is still in the catalog`);
      const to = DELETED_PIECES[id].to;
      if (to) assert.equal(getItem(to)?.slot, slotOf(id), `${id} -> ${to}`);
    }
    for (const kept of ['hair_drifter', 'hair_surge', 'hair_ascended', 'hair_youth', 'feet_cowboy']) assert.ok(getItem(kept), `${kept} stays`);
    assert.ok(ALL_ITEMS.every((d) => !DELETED.includes(d.id)));
  });

  it('migrate on load to what he asked for', () => {
    const to = (id: string) => migrateAppearance(wearing(id)).slots[slotOf(id)];
    assert.equal(to('cape_knight')?.id, 'cape_crimson');
    assert.equal(to('hands_gauntlets')?.id, 'hands_crimson_gauntlets');
    assert.equal(to('feet_greaves')?.id, 'feet_crimson_sabatons');
    assert.equal(to('held_crystal')?.id, 'held_ice_crystal');
    // the dread plate becomes his plate in its black steel and gold
    assert.deepEqual(to('armor_dread'), { id: 'armor_crimson_plate', colors: ['#565a6b', '#d0a12e'] });
    assert.deepEqual(migrateAppearance(wearing('armor_dread', ['#202024', '#b0b0b0'])).slots.armor, { id: 'armor_crimson_plate', colors: ['#202024', '#b0b0b0'] });
    for (const id of ['armor_oath', 'armor_rose', 'armor_lionheart', 'armor_seraph', 'armor_lioness', 'face_beast', 'face_sage', 'cape_rose'])
      assert.equal(to(id), undefined, `${id} comes off`);
    // a hair keeps its colour on the nearest style
    assert.deepEqual(migrateAppearance(wearing('hair_silver', ['#aabbcc'])).slots.hair, { id: 'hair_long', colors: ['#aabbcc'] });
    assert.deepEqual(to('hair_storm2'), { id: 'hair_surge', colors: ['#e6c020'] });
  });

  it('leave nothing deleted behind, and draw: every one of them in an old save', () => {
    for (const id of DELETED) {
      const look = migrateAppearance(wearing(id, ['#123456', '#654321', '#abcdef']));
      assert.ok(!ids(look).some((i) => DELETED.includes(i)), id);
      assert.deepEqual(migrateAppearance(look), look, `${id}: once`);
      assert.ok(renderSprite(look, 'idle', 0).rgba.some((v) => v > 0), `${id}: draws`);
    }
  });

  it('a look with none of them and a plain cloth headband comes back as it is', () => {
    const l = defaultAppearance();
    assert.equal(migrateAppearance(l), l);
    for (const c of EVERYONE) assert.equal(migrateAppearance(c.appearance!), c.appearance, c.id);
  });

  it('an old save wearing them and a plated headband loads without them, its band as cloth', () => {
    const preset = LEGENDARY_PRESETS[0].character;
    const look: SpriteAppearance = {
      ...wearing('hair_charlotte', ['#ff00aa']),
      headband: { position: 'forehead', slashed: true, tails: true, emblem: 'bolt', cloth: '#1e293b', plate: '#cbd5e1' },
    };
    look.slots.armor = { id: 'armor_dread', colors: [] };
    look.slots.held = { id: 'held_crystal', colors: [] };
    look.slots.face = { id: 'face_beast', colors: [] };
    const saved = JSON.parse(JSON.stringify({ ...preset, id: 'my_ninja', appearance: look })) as ShinobiCharacter;
    const now = migrateCharacter(saved);
    assert.deepEqual(now.appearance!.headband, { position: 'forehead', tails: true, cloth: '#1e293b' });
    assert.deepEqual(now.appearance!.slots.hair, { id: 'hair_ribbon', colors: ['#ff00aa'] });
    assert.equal(now.appearance!.slots.armor?.id, 'armor_crimson_plate');
    assert.equal(now.appearance!.slots.held?.id, 'held_ice_crystal');
    assert.equal(now.appearance!.slots.face, undefined);
    assert.deepEqual(migrateCharacter(now), now);
  });

  it('the old format (no look) names none of them, and a rogue\'s scratched headband is a cloth forehead band', () => {
    const old = {
      ...LEGENDARY_PRESETS[0].character,
      appearance: undefined,
      hairstyle: 'Kakashi Tilt',
      armorStyle: 'Dark Knight Plate',
      capeStyle: 'Crimson Billowing Knight Cape',
      lowerStyle: 'Armored Greaves',
      headbandPosition: 'Rogue Scratched',
    } as unknown as ShinobiCharacter;
    const l = appearanceFromLegacy(old);
    assert.deepEqual(
      [l.slots.hair?.id, l.slots.armor?.id, l.slots.cape?.id, l.slots.feet?.id],
      ['hair_bristle', 'armor_crimson_plate', 'cape_crimson', 'feet_crimson_sabatons'],
    );
    assert.equal(l.headband.position, 'forehead');
    assert.ok(plainCloth(l));
    for (const name of ['Minato Winged Flare', 'Sephiroth Parted Flow', 'Somnus Caelum'])
      assert.ok(!DELETED.includes(getAppearance({ ...old, hairstyle: name } as ShinobiCharacter).slots.hair!.id), name);
    for (const name of ['Sand Wind Guard', 'Mist Storm Vest'])
      assert.equal(getAppearance({ ...old, armorStyle: name } as ShinobiCharacter).slots.armor?.id, 'armor_flak', name);
  });
});

describe('the presets, companions and enemies', () => {
  it('wear none of the deleted pieces, and their headbands are plain cloth', () => {
    for (const c of EVERYONE) {
      assert.ok(!ids(c.appearance!).some((i) => DELETED.includes(i)), c.id);
      assert.ok(ids(c.appearance!).every((i) => getItem(i)), `${c.id}: every piece exists`);
      assert.ok(plainCloth(c.appearance!), `${c.id}: plain cloth headband`);
    }
  });

  it("Solen holds the owner's ice crystal sword and wears his Roman sandals; Hiro has no whisker marks", () => {
    const solen = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_founder')!.character.appearance!;
    assert.equal(solen.slots.held?.id, 'held_ice_crystal');
    assert.equal(solen.slots.feet?.id, 'feet_gladiator_sandals');
    const hiro = LEGENDARY_PRESETS.find((p) => p.character.name === 'Hiro')!.character.appearance!;
    assert.equal(hiro.slots.face, undefined);
  });
});

describe('the random ninja', () => {
  it('never picks a deleted piece, and its headband is plain cloth', () => {
    for (let i = 0; i < 400; i++) {
      const l = randomAppearance();
      assert.ok(!ids(l).some((id) => DELETED.includes(id)), ids(l).join());
      assert.ok(plainCloth(l), JSON.stringify(l.headband));
    }
  });
});
