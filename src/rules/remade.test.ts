// Lyra is a Water ninja of the Mirai (the owner, 2026-10-23: "haz lyra de agua y de clan mirai"; she was
// Koton and Wind): her legend preset and her companion, and every saved copy of the old Lyra (the hero,
// the roster, a mission under way), which loads as the new one (rules/ninja.ts, remadeLegend).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CLANS_DATA, JUTSUS_DATA, LEGENDARY_PRESETS } from '../data/shinobiData';
import { KENJI, LYRA, RIVER_FOREST_PATROL } from '../data/missions';
import { loadRun, saveRun, startRun } from '../game/missionRun';
import { loadHero, loadRoster } from '../game/saves';
import { unitFrom } from '../battle/units';
import { commandRefused } from '../battle/clans';
import { chakraHex } from '../sprite/chakraInfo';
import type { ShinobiCharacter } from '../types/shinobi';
import { deriveStats } from './derived';
import { jutsuFitsClass } from './jutsuClass';
import { offNatureJutsus } from './jutsuNature';
import { LEGEND_REMADE, migrateCharacter, natureOf, remadeLegend } from './ninja';
import { fitToType } from './progression';

const preset = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_lyra')!.character;

/** Lyra as she was saved before 2026-10-23: Koton, Wind (her green burst in her cyan), her Wind jutsu and Koton's chains, Koton's numbers. */
function oldLyra(c: ShinobiCharacter): ShinobiCharacter {
  const d = deriveStats({ level: c.level, stats: c.stats, clan: 'Koton', shinobiClass: c.shinobiClass, armor: c.armorStyle, feats: c.selectedFeats });
  return {
    ...c,
    clan: 'Koton',
    selectedJutsus: { slot1Utility: 'substitution_kawarimi', slot2Elemental: 'wind_blade_daitoppa', slot3Elemental: 'crescent_moon_dance', slot4Clan: 'adamantine_sealing_chains', slot5Ultimate: 'rasenshuriken_wind' },
    maxHp: d.maxHp,
    currentHp: d.maxHp,
    maxChakra: d.maxChakra,
    currentChakra: d.maxChakra,
    armorClass: d.armorClass,
    jutsuSaveDC: d.jutsuSaveDC,
    jutsuAttackBonus: d.jutsuAttackBonus,
    appearance: { ...c.appearance!, chakra: { ...c.appearance!.chakra, color: 'green' } },
  };
}

function storage(items: Record<string, unknown>): void {
  const m = new Map(Object.entries(items).map(([k, v]) => [k, JSON.stringify(v)]));
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => m.set(k, v), removeItem: (k: string) => m.delete(k) };
}

describe('Lyra, a Water ninja of the Mirai', () => {
  it('her preset: Mirai, Water in her cyan, a Bukijutsu Master with her Water kit and the Dragon Tsunami, the formula with Mirai\'s bonus', () => {
    assert.equal(preset.clan, 'Mirai');
    assert.equal(preset.shinobiClass, 'Bukijutsu Master');
    assert.equal(preset.dojutsu, 'None', 'the clan eyes come later (the owner)');
    assert.equal(natureOf(preset), 'Water');
    assert.equal(preset.appearance!.chakra.color, 'blue');
    assert.equal(chakraHex(preset.appearance!.chakra), '#40cccb', 'her chakra keeps his colour');
    assert.deepEqual(preset.selectedJutsus, { slot1Utility: 'substitution_kawarimi', slot2Elemental: 'water_geyser', slot3Elemental: 'crescent_moon_dance', slot4Clan: 'dragon_fire_bomb', slot5Ultimate: 'water_tide_s' });
    assert.equal(preset.selectedJutsus.slot4Clan, CLANS_DATA.Mirai.signatureJutsuId);
    assert.deepEqual(offNatureJutsus(preset.selectedJutsus, 'Water'), []);
    for (const id of Object.values(preset.selectedJutsus)) assert.ok(jutsuFitsClass(JUTSUS_DATA.find((j) => j.id === id)!, preset.shinobiClass), id);
    // The creator's refit of the old Lyra to Water, as a legend (she keeps her rank): her preset's jutsu.
    const old = oldLyra(preset);
    assert.deepEqual(fitToType({ ...old, clan: 'Mirai', selectedJutsus: { ...old.selectedJutsus, slot4Clan: 'dragon_fire_bomb' } }, 'Water').loadout, preset.selectedJutsus);
    const d = deriveStats({ level: preset.level, stats: preset.stats, clan: preset.clan, shinobiClass: preset.shinobiClass, armor: preset.armorStyle, feats: preset.selectedFeats });
    assert.deepEqual([preset.maxHp, preset.maxChakra, preset.armorClass, preset.speed, preset.jutsuSaveDC, preset.jutsuAttackBonus], [44, 32, 19, 6, 16, 8]);
    assert.deepEqual([preset.maxHp, preset.maxChakra, preset.armorClass, preset.speed, preset.jutsuSaveDC, preset.jutsuAttackBonus], [d.maxHp, d.maxChakra, d.armorClass, d.speed, d.jutsuSaveDC, d.jutsuAttackBonus]);
    assert.equal(migrateCharacter(preset), preset);
  });

  it('her companion: the same at the companions\' level 4, with Mirai\'s abilities and the Dragon Tsunami in battle', () => {
    assert.deepEqual([LYRA.clan, natureOf(LYRA), LYRA.level, LYRA.shinobiClass], ['Mirai', 'Water', 4, 'Bukijutsu Master']);
    assert.deepEqual(LYRA.selectedJutsus, preset.selectedJutsus);
    assert.deepEqual([LYRA.maxHp, LYRA.maxChakra, LYRA.armorClass, LYRA.jutsuSaveDC, LYRA.jutsuAttackBonus], [36, 26, 19, 15, 7]);
    assert.equal(migrateCharacter(LYRA), LYRA);
    const u = unitFrom(LYRA, { team: 'party', pos: { x: 0, z: 0 } });
    for (const id of ['mirai_evasion', 'katon_pursuing_flame', 'water_geyser', 'crescent_moon_dance', 'dragon_fire_bomb', 'water_tide_s']) assert.ok(u.jutsus.includes(id), id);
    assert.ok(!u.jutsus.includes('adamantine_sealing_chains'));
  });

  it("a Mirai's mind can't be commanded: an enemy Northstar's Command finds her immune", () => {
    const u = unitFrom(LYRA, { team: 'party', pos: { x: 0, z: 0 } });
    const foe = { ...unitFrom(KENJI, { team: 'enemy', pos: { x: 2, z: 0 } }), level: 9 };
    const target = { ...u, rank: 'minion' as const };
    assert.equal(commandRefused({ phase: 'combat' } as never, foe, target), 'mindImmune');
  });

  it('a saved copy of the old Lyra loads as the new one, once: her preset, her companion, and hurt', () => {
    assert.deepEqual(Object.keys(LEGEND_REMADE).sort(), ['companion_lyra', 'preset_lyra']);
    for (const now of [preset, LYRA]) {
      const old = oldLyra(now);
      assert.equal(natureOf(old), 'Wind');
      const loaded = migrateCharacter(old);
      assert.deepEqual(loaded, now, now.id);
      assert.equal(migrateCharacter(loaded), loaded, `${now.id}: once`);
      // Hurt and spent: a hurt one keeps what it had, under the new maxima; a full one stays full.
      const hurt = migrateCharacter({ ...old, currentHp: old.maxHp - 3, currentChakra: 5 });
      assert.deepEqual([hurt.currentHp, hurt.currentChakra], [Math.min(old.maxHp - 3, now.maxHp), 5], now.id);
    }
  });

  it('a copy the player gave another clan or type keeps that choice; nobody else is touched', () => {
    const old = oldLyra(preset);
    const ryusei = { ...old, clan: 'Ryusei' as const };
    assert.equal(remadeLegend(ryusei), ryusei);
    const fire = { ...old, appearance: { ...old.appearance!, chakra: { ...old.appearance!.chakra, color: 'red' as const } } };
    assert.equal(remadeLegend(fire), fire);
    const notLyra = { ...old, id: 'ninja_1' };
    assert.equal(remadeLegend(notLyra), notLyra);
  });

  it('every load path: the hero, the roster, a mission under way (alive, fallen, and as she set out)', () => {
    const old = { ...oldLyra(preset), created: true };
    storage({ 'shinobi5e.hero.v1': old, 'shinobi5e.roster.v1': [{ character: old, savedAt: 1 }] });
    for (const c of [loadHero()!, loadRoster()[0].character]) {
      assert.deepEqual([c.clan, natureOf(c), c.selectedJutsus.slot5Ultimate, c.maxHp, c.armorClass], ['Mirai', 'Water', 'water_tide_s', 44, 19]);
      assert.equal(chakraHex(c.appearance!.chakra), '#40cccb');
    }
    const run = startRun(RIVER_FOREST_PATROL, 'preset_storm', [LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_storm')!.character, LYRA, KENJI], { seed: 3, leaderId: 'companion_lyra', difficulty: 'normal', noRandomness: false });
    const [kaien, lyra, kenji] = run.party.members;
    storage({});
    saveRun({
      ...run,
      party: { ...run.party, members: [kaien, oldLyra(lyra)], dead: [kenji] },
      entry: { ...run.entry, members: [kaien, oldLyra(lyra), kenji], dead: [] },
    });
    const r = loadRun()!;
    assert.equal(r.party.leaderId, 'companion_lyra');
    for (const c of [r.party.members[1], r.entry.members[1]]) assert.deepEqual(c, lyra);
    const fell = { ...oldLyra(lyra), currentHp: 0 };
    storage({});
    saveRun({ ...run, party: { ...run.party, members: [kaien, kenji], dead: [fell] } });
    const dead = loadRun()!.party.dead![0];
    assert.deepEqual([dead.clan, natureOf(dead), dead.currentHp, dead.maxHp], ['Mirai', 'Water', 0, LYRA.maxHp]);
  });
});
