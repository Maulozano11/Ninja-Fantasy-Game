// Tests for the elemental jutsu a ninja's nature lets it learn in the creator: npm test. The owner:
// the elemental nature (the chakra type) decides the elemental jutsu (docs/GAMEPLAY_DESIGN.md,
// "Chakra type").

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CLANS_DATA, DEFAULT_CHARACTER, JUTSUS_DATA, LEGENDARY_PRESETS } from '../data/shinobiData';
import { HANA, KENJI } from '../data/missions';
import { CHAKRA_TYPES, OFFERED_TYPES } from '../sprite/chakraNature';
import type { ChakraNature, ClanType } from '../types/shinobi';
import { ELEMENTS, fitLoadout, jutsuChoices, jutsuFitsNature, type JutsuSlot, natureGated, offNatureJutsus, SLOT_CATEGORY } from './jutsuNature';
import { natureOf } from './ninja';

const ALL_NATURES = CHAKRA_TYPES.map((t) => t.nature);
const CLANS = Object.keys(CLANS_DATA) as ClanType[];
const SLOTS = Object.keys(SLOT_CATEGORY) as JutsuSlot[];
const isElement = (n: string) => (ELEMENTS as readonly string[]).includes(n);
const ids = (xs: { id: string }[]) => xs.map((j) => j.id);

describe('which jutsu the nature gates', () => {
  it('elemental jutsu in the Element and S-rank slots; never Utility, clan secrets or jutsu with no element', () => {
    for (const j of JUTSUS_DATA) {
      const want = (j.category === 'Elemental' || j.category === 'Ultimate') && isElement(j.nature);
      assert.equal(natureGated(j), want, j.id);
    }
    // The tools and the medical palm stay free though their nature is Fire and Water.
    assert.equal(natureGated(JUTSUS_DATA.find((j) => j.id === 'trap_setter_tag')!), false);
    assert.equal(natureGated(JUTSUS_DATA.find((j) => j.id === 'mystical_palm')!), false);
    // So do the clan secrets of every element.
    for (const j of JUTSUS_DATA.filter((x) => x.category === 'Clan')) assert.equal(natureGated(j), false, j.id);
  });

  it('a ninja of an element is offered that element and the jutsu with no element, nothing of another element', () => {
    for (const nature of ALL_NATURES)
      for (const clan of CLANS)
        for (const slot of SLOTS) {
          const list = jutsuChoices(slot, nature, clan);
          const all = JUTSUS_DATA.filter((j) => j.category === SLOT_CATEGORY[slot] && (SLOT_CATEGORY[slot] !== 'Clan' || !j.requiredClan || j.requiredClan === clan));
          assert.deepEqual(ids(list), ids(all.filter((j) => jutsuFitsNature(j, nature))), `${nature} ${clan} ${slot}`);
          for (const j of list) assert.ok(!natureGated(j) || j.nature === nature, `${nature} ${slot}: ${j.id}`);
        }
  });

  it('the offers per nature, as the creator shows them', () => {
    const offer = (n: ChakraNature, slot: JutsuSlot) => ids(jutsuChoices(slot, n, 'Mirai'));
    // Each element's rank D and C jutsu come first (docs/GAMEPLAY_DESIGN.md, "Rank D and C jutsu").
    const free = ['leaf_hurricane_senpuu', 'taijutsu_rush', 'kenjutsu_bleeding_cut', 'crescent_moon_dance', 'genjutsu_mirage', 'temple_of_nirvana'];
    assert.deepEqual(offer('Fire', 'slot2Elemental'), ['fire_three_embers', 'fireball_goukakyu', 'dragon_fire_stream', ...free]);
    assert.deepEqual(offer('Water', 'slot2Elemental'), ['water_geyser', 'water_dragon_suiryuudan', 'water_shield_suijinheki', ...free]);
    assert.deepEqual(offer('Earth', 'slot2Elemental'), ['earth_pebble_shot', 'earth_spike_crown', 'earth_wall_doryuheki', 'earth_spear_doryuudan', ...free]);
    assert.deepEqual(offer('Wind', 'slot2Elemental'), ['wind_whirl', 'wind_blade_daitoppa', ...free]);
    assert.deepEqual(offer('Lightning', 'slot3Elemental'), ['lightning_jolt', 'lightning_spark_fan', 'chidori_lightning_blade', 'lightning_hound_raidon', ...free]);
    assert.deepEqual(offer('Fire', 'slot5Ultimate'), ['great_fire_annihilation', 'yasaka_magatama', 'night_guy_dragon']);
    assert.deepEqual(offer('Lightning', 'slot5Ultimate'), ['kirin_thunder', 'yasaka_magatama', 'night_guy_dragon']);
    assert.deepEqual(offer('Water', 'slot5Ultimate'), ['yasaka_magatama', 'night_guy_dragon'], 'no Water S-rank yet');
    // Light and Void (their own jutsu come later) learn no elemental jutsu.
    for (const n of ['Light', 'Void', 'Shadow', 'Spirit'] as ChakraNature[]) {
      assert.deepEqual(offer(n, 'slot2Elemental'), free, n);
      assert.deepEqual(offer(n, 'slot5Ultimate'), ['yasaka_magatama', 'night_guy_dragon'], n);
    }
    // Utility and the clan secret are the same for everyone.
    for (const n of ALL_NATURES) {
      assert.deepEqual(offer(n, 'slot1Utility'), ids(JUTSUS_DATA.filter((j) => j.category === 'Utility')), n);
      assert.deepEqual(offer(n, 'slot4Clan'), ['dragon_fire_bomb'], n);
    }
  });

  it('every type a player can pick fills all five slots, with two different Element jutsu', () => {
    for (const t of OFFERED_TYPES)
      for (const clan of CLANS) {
        assert.ok(jutsuChoices('slot2Elemental', t.nature, clan).length >= 2, `${t.nature}: two Element jutsu`);
        for (const slot of SLOTS) assert.ok(jutsuChoices(slot, t.nature, clan).length >= 1, `${t.nature} ${clan} ${slot}`);
        assert.deepEqual(ids(jutsuChoices('slot4Clan', t.nature, clan)), [CLANS_DATA[clan].signatureJutsuId], `${clan}: its secret`);
      }
  });
});

describe('changing the chakra type in the creator', () => {
  const solen = DEFAULT_CHARACTER; // Fire: Fireball, Crescent Moon Dance, Great Fire Annihilation

  it('the jutsu of another element are swapped for ones of the new element, lowest rank first; the rest stay', () => {
    const r = fitLoadout(solen.selectedJutsus, 'Lightning', solen.clan);
    assert.deepEqual(r.loadout, {
      ...solen.selectedJutsus,
      slot2Elemental: 'lightning_jolt', // D, before the Spark Fan (C), the Hound (B) and Chidori (A)
      slot5Ultimate: 'kirin_thunder',
    });
    assert.deepEqual(r.swaps, [
      { slot: 'slot2Elemental', from: 'fireball_goukakyu', to: 'lightning_jolt' },
      { slot: 'slot5Ultimate', from: 'great_fire_annihilation', to: 'kirin_thunder' },
    ]);
    assert.equal(r.loadout.slot3Elemental, 'crescent_moon_dance', 'no element: it stays');
    assert.equal(r.loadout.slot4Clan, solen.selectedJutsus.slot4Clan, 'the clan secret (Earth) stays');
    assert.deepEqual(fitLoadout(r.loadout, 'Lightning', solen.clan).swaps, [], 'once fitted, nothing more to swap');
  });

  it('two Element jutsu of the old element become two different ones', () => {
    const fire = { ...solen.selectedJutsus, slot2Elemental: 'fireball_goukakyu', slot3Elemental: 'dragon_fire_stream' };
    const r = fitLoadout(fire, 'Lightning', solen.clan);
    assert.deepEqual([r.loadout.slot2Elemental, r.loadout.slot3Elemental], ['lightning_jolt', 'lightning_spark_fan']);
    // Wind has two Element jutsu now (Whirl, D, and the Great Breakthrough Blade, C).
    const wind = fitLoadout(fire, 'Wind', solen.clan).loadout;
    assert.deepEqual([wind.slot2Elemental, wind.slot3Elemental], ['wind_whirl', 'wind_blade_daitoppa']);
  });

  it('to Light or Void (no element): the elemental jutsu give way to jutsu with no element', () => {
    for (const n of ['Light', 'Void'] as ChakraNature[]) {
      const r = fitLoadout(solen.selectedJutsus, n, solen.clan).loadout;
      assert.deepEqual(offNatureJutsus(r, n), [], n);
      assert.equal(r.slot2Elemental, 'leaf_hurricane_senpuu', n);
      assert.equal(r.slot3Elemental, 'crescent_moon_dance', n);
      assert.equal(r.slot5Ultimate, 'yasaka_magatama', n);
    }
  });

  it('for every type and every legend, the fitted loadout is all of the new type', () => {
    for (const { character: c } of LEGENDARY_PRESETS)
      for (const n of ALL_NATURES) {
        const r = fitLoadout(c.selectedJutsus, n, c.clan).loadout;
        assert.deepEqual(offNatureJutsus(r, n), [], `${c.id} to ${n}`);
        assert.equal(r.slot1Utility, c.selectedJutsus.slot1Utility);
        assert.equal(r.slot4Clan, c.selectedJutsus.slot4Clan);
      }
  });
});

describe('the legends keep their sheets', () => {
  it('a legend with a jutsu of a second element is a preset, not a creator pick: Kaien\'s Fireball and Raiga\'s Earth Wall', () => {
    const second: Record<string, string[]> = {};
    for (const c of [...LEGENDARY_PRESETS.map((p) => p.character), HANA, KENJI]) {
      const off = offNatureJutsus(c.selectedJutsus, natureOf(c));
      if (off.length) second[c.id] = off;
    }
    assert.deepEqual(second, { preset_storm: ['fireball_goukakyu'], preset_warlord: ['earth_wall_doryuheki'] });
  });
});
