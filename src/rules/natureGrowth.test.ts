// Tests for the owner's level-5 answer (2026-10-21): "nivel 5 suena bien para segundo elemento o subir de
// rango tu elemento principal [...] ok con kaien y raiga". npm test. docs/GAMEPLAY_DESIGN.md, "Level 5".

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CLANS_DATA, DEFAULT_CHARACTER, JUTSUS_DATA, LEGENDARY_PRESETS } from '../data/shinobiData';
import { AURELIA, KENJI, RIVER_FOREST_PATROL } from '../data/missions';
import { loadRun, migrateRun, type MissionRun, saveRun, startRun } from '../game/missionRun';
import { loadHero, loadRoster } from '../game/saves';
import { getAppearance } from '../sprite/legacy';
import type { ChakraNature, ClanType, ShinobiCharacter } from '../types/shinobi';
import { ELEMENTS, type JutsuSlot, natureGated, offNatureJutsus, SLOT_CATEGORY } from './jutsuNature';
import {
  chooseGrowth,
  earnedGrowth,
  extraNatures,
  GROWTH_LEVEL,
  growthFixed,
  growthOf,
  growthOpen,
  growthPending,
  naturesOf,
  NO_GROWTH,
  otherElements,
  rankedUp,
  THIRD_ELEMENT_FEAT,
} from './natureGrowth';
import { addLegendNatures, migrateCharacter, natureOf } from './ninja';
import { aboveRank, asMade, creatorChoices, fitNewNinja, fitToGrowth, fitToType, learnable, rankOpen, slotChoices, slotLocked } from './progression';

const CLANS = Object.keys(CLANS_DATA) as ClanType[];
const SLOTS = Object.keys(SLOT_CATEGORY) as JutsuSlot[];
const byId = (id: string) => JUTSUS_DATA.find((j) => j.id === id)!;
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
const legend = (id: string) => LEGENDARY_PRESETS.find((p) => p.character.id === id)!.character;
const KAIEN = legend('preset_storm');
const RAIGA = legend('preset_warlord');
/** Solen's sheet (Fire, Bukijutsu, Ryusei, level 6) as a ninja of its own, at a level. */
const ninja = (level: number, more: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, id: 'ninja_grow', level, ...more });
/** A sheet as it comes back from the device's storage. */
const roundTrip = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

function storage(items: Record<string, unknown>): void {
  const m = new Map(Object.entries(items).map(([k, v]) => [k, JSON.stringify(v)]));
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => m.set(k, v) };
}

describe('the data: a second (and third) element and the level-5 choice, optional', () => {
  it('a sheet without them reads as its type alone, no growth; old saves load unchanged', () => {
    const c = ninja(1);
    assert.deepEqual(naturesOf(c, 'Fire'), ['Fire']);
    assert.deepEqual(growthOf(c, 'Fire'), { ...NO_GROWTH, level: 1 });
    assert.equal(migrateCharacter(DEFAULT_CHARACTER), DEFAULT_CHARACTER, 'a legend\'s sheet that has none: nothing added');
    const old = roundTrip({ ...DEFAULT_CHARACTER, id: 'ninja_old' });
    const loaded = migrateCharacter(old);
    assert.equal(loaded.extraNatures, undefined);
    assert.equal(loaded.natureGrowth, undefined);
  });

  it('only the five elements count, never the type itself, each once, at most two', () => {
    const c = ninja(9, { extraNatures: ['Fire', 'Water', 'Water', 'Light', 'Shadow', 'Earth', 'Wind'] as ChakraNature[] });
    assert.deepEqual(extraNatures(c, 'Fire'), ['Water', 'Earth']);
    assert.deepEqual(naturesOf(c, 'Fire'), ['Fire', 'Water', 'Earth']);
    assert.deepEqual(extraNatures({ level: 5, extraNatures: 'Water' as unknown as ChakraNature[] }, 'Fire'), [], 'not a list');
    assert.deepEqual(otherElements('Fire'), ['Water', 'Wind', 'Lightning', 'Earth']);
    assert.deepEqual(otherElements('Light'), [...ELEMENTS]);
  });
});

describe('level 5: a second element or a higher rank of the main element ("nivel 5 ... segundo elemento o subir de rango")', () => {
  it('opens at level 5', () => {
    assert.equal(GROWTH_LEVEL, 5);
    assert.equal(growthOpen(ninja(4)), false);
    assert.equal(growthOpen(ninja(5)), true);
    assert.equal(growthPending(ninja(4)), false);
    assert.equal(growthPending(ninja(5)), true);
    assert.equal(growthPending(ninja(5, { natureGrowth: 'rank', extraNatures: [] })), false);
    assert.equal(growthPending(KAIEN), false, 'below level 5');
    assert.equal(growthPending({ ...KAIEN, level: 5 }), false, 'Kaien\'s own second element counts as his choice');
  });

  it('the choice: one or the other, never below level 5', () => {
    const c = ninja(5);
    const low = ninja(4);
    assert.equal(chooseGrowth(low, 'Fire', 'rank'), low, 'below level 5 nothing changes');
    assert.equal(chooseGrowth(low, 'Fire', 'element', 'Water'), low);
    const el = chooseGrowth(c, 'Fire', 'element', 'Water');
    assert.equal(el.natureGrowth, 'element');
    assert.deepEqual(el.extraNatures, ['Water']);
    assert.deepEqual(naturesOf(el, 'Fire'), ['Fire', 'Water']);
    assert.equal(rankedUp(el), false);
    const rk = chooseGrowth(el, 'Fire', 'rank');
    assert.equal(rk.natureGrowth, 'rank');
    assert.deepEqual(rk.extraNatures, [], 'the second element goes: one or the other');
    assert.equal(rankedUp(rk), true);
    assert.equal(chooseGrowth(c, 'Fire', 'element', 'Fire'), c, 'its own type is not a second element');
    assert.equal(chooseGrowth(c, 'Fire', 'element', 'Light'), c, 'only the five elements');
    assert.equal(chooseGrowth(c, 'Fire', 'element'), c, 'an element must be picked');
    // The chakra type is never touched.
    assert.equal(natureOf(el), natureOf(c));
    assert.deepEqual(getAppearance(rk).chakra, getAppearance(c).chakra);
  });

  it('a third element only with the special feat, Triple Nature: level 9 and a second element', () => {
    const feat = ninja(9, { selectedFeats: [THIRD_ELEMENT_FEAT], natureGrowth: 'element' });
    const two = chooseGrowth({ ...feat, extraNatures: ['Water', 'Earth'] }, 'Fire', 'element', 'Wind');
    assert.deepEqual(two.extraNatures, ['Wind', 'Earth'], 'the second changes, the third stays');
    assert.deepEqual(chooseGrowth({ ...feat, extraNatures: ['Water', 'Earth'] }, 'Fire', 'element', 'Earth').extraNatures, ['Earth'], 'the third taken as the second: no third left');
    assert.deepEqual(chooseGrowth({ ...feat, extraNatures: ['Water', 'Earth'] }, 'Fire', 'rank').extraNatures, [], 'a higher rank has no second element, so no third');
    // Without the feat a new ninja keeps only what level 5 gives it.
    assert.deepEqual(earnedGrowth(ninja(9, { natureGrowth: 'element', extraNatures: ['Water', 'Earth'] }), 'Fire').extraNatures, ['Water']);
    assert.deepEqual(earnedGrowth({ ...feat, natureGrowth: 'element', extraNatures: ['Water', 'Earth'] }, 'Fire').extraNatures, ['Water', 'Earth']);
  });

  it('a new ninja keeps only what it earned: a copy of Kaien (level 4) leaves his Fire behind', () => {
    const copy = earnedGrowth({ ...KAIEN, id: 'ninja_copy' }, 'Lightning');
    assert.deepEqual(copy.extraNatures, []);
    assert.equal(copy.natureGrowth, undefined);
    const raiga = { ...RAIGA, id: 'ninja_copy' };
    assert.equal(earnedGrowth(raiga, 'Fire'), raiga, 'Raiga is level 5: his choice is earned');
    const plain = ninja(1);
    assert.equal(earnedGrowth(plain, 'Fire'), plain, 'nothing to drop: the same sheet');
    const early = earnedGrowth(ninja(3, { natureGrowth: 'rank' }), 'Fire');
    assert.equal(early.natureGrowth, undefined, 'no choice below level 5');
  });

  it('fixed once the ninja is made with it', () => {
    assert.equal(growthFixed(ninja(5, { natureGrowth: 'rank' })), false, 'not made yet');
    assert.equal(growthFixed(asMade(ninja(5))), false, 'made, but not chosen yet');
    assert.equal(growthFixed(asMade(ninja(5, { natureGrowth: 'rank', extraNatures: [] }))), true);
  });
});

describe('what each choice opens (the builder\'s proposal: second element D and C, rank up the main element\'s B)', () => {
  it('rank up: the main element\'s rank B jutsu in the Element slots, nothing else above C', () => {
    for (const j of JUTSUS_DATA)
      for (const clan of CLANS)
        for (const up of ELEMENTS as readonly ChakraNature[]) {
          const want = j.requiredClan ? j.requiredClan === clan : j.rank === 'D' || j.rank === 'C' || (j.rank === 'B' && natureGated(j) && j.nature === up);
          assert.equal(rankOpen(j, clan, up), want, `${j.id} for ${clan}, ${up}`);
        }
    // Not the B jutsu of a class (Crescent Moon Dance), nor the Utility B (Shadow Clone), nor A or S.
    for (const id of ['crescent_moon_dance', 'shadow_clone', 'chidori_lightning_blade', 'great_fire_annihilation']) assert.equal(rankOpen(byId(id), 'Ryusei', byId(id).nature as ChakraNature), false, id);
  });

  it('the creator\'s offers follow the level and the choice', () => {
    const fire = (c: ShinobiCharacter, slot: JutsuSlot = 'slot2Elemental') => ids(slotChoices(c, slot, 'Fire', c.clan));
    assert.deepEqual(fire(ninja(5)), ['fire_three_embers', 'fireball_goukakyu', 'kenjutsu_bleeding_cut'], 'level 5, not chosen: D and C');
    assert.deepEqual(fire(ninja(5, { natureGrowth: 'rank' })), ['fire_three_embers', 'fireball_goukakyu', 'dragon_fire_stream', 'kenjutsu_bleeding_cut'], 'rank up: Fire B');
    assert.deepEqual(fire(ninja(4, { natureGrowth: 'rank' })), ['fire_three_embers', 'fireball_goukakyu', 'kenjutsu_bleeding_cut'], 'below level 5 the choice opens nothing');
    assert.deepEqual(fire(ninja(5, { natureGrowth: 'element', extraNatures: ['Water'] })), ['fire_three_embers', 'fireball_goukakyu', 'water_geyser', 'water_shield_suijinheki', 'kenjutsu_bleeding_cut'], 'Water: its C, not its B');
    assert.deepEqual(fire(ninja(5, { natureGrowth: 'element', extraNatures: ['Earth'] })), ['fire_three_embers', 'fireball_goukakyu', 'earth_pebble_shot', 'earth_spike_crown', 'earth_rubble_gust', 'kenjutsu_bleeding_cut'], 'Earth: its D and C (Pebble Shot, Spike Crown, Rubble Gust)');
    // The S-rank slot stays locked whatever the choice; the Utility and clan slots don't change.
    for (const g of [ninja(5), ninja(5, { natureGrowth: 'rank' }), ninja(5, { natureGrowth: 'element', extraNatures: ['Lightning'] })]) {
      assert.equal(slotLocked('slot5Ultimate', 'Fire', g.clan, g.shinobiClass, growthOf(g, 'Fire')), true);
      assert.deepEqual(fire(g, 'slot1Utility'), fire(ninja(1), 'slot1Utility'));
      assert.deepEqual(fire(g, 'slot4Clan'), fire(ninja(1), 'slot4Clan'));
    }
  });

  it('every offer is of one of its elements (or no element, of its class) at a rank it may take', () => {
    for (const second of ELEMENTS as readonly ChakraNature[])
      for (const g of ['element', 'rank'] as const) {
        const c = chooseGrowth(ninja(5), 'Fire', g, second === 'Fire' ? 'Water' : second);
        const growth = growthOf(c, 'Fire');
        for (const slot of SLOTS)
          for (const j of slotChoices(c, slot, 'Fire', c.clan)) {
            assert.ok(!natureGated(j) || naturesOf(c, 'Fire').includes(j.nature as ChakraNature), `${g} ${second} ${slot}: ${j.id}`);
            assert.ok(rankOpen(j, c.clan, growth.rankUp ? 'Fire' : undefined), `${g} ${second} ${slot}: ${j.id} rank ${j.rank}`);
          }
        assert.deepEqual(ids(creatorChoices('slot3Elemental', 'Fire', c.clan, c.shinobiClass, growth)), ids(slotChoices(c, 'slot3Elemental', 'Fire', c.clan)));
        assert.ok(learnable('slot3Elemental', 'Fire', c.clan, c.shinobiClass, growth).length >= slotChoices(c, 'slot3Elemental', 'Fire', c.clan).length);
      }
  });

  it('a jutsu the higher rank opened is marked no more; one above it still is', () => {
    const c = ninja(5, { natureGrowth: 'rank', selectedJutsus: { ...DEFAULT_CHARACTER.selectedJutsus, slot2Elemental: 'dragon_fire_stream' } });
    assert.deepEqual(aboveRank(c.selectedJutsus, c.clan, 'Fire'), ['crescent_moon_dance', 'great_fire_annihilation']);
    assert.deepEqual(aboveRank(c.selectedJutsus, c.clan), ['dragon_fire_stream', 'crescent_moon_dance', 'great_fire_annihilation']);
  });

  it('a new choice in the creator swaps out what it no longer opens', () => {
    // A level-5 ninja that took the higher rank and Dragon Fire Stream, then a Water second element instead.
    const ranked = ninja(5, { natureGrowth: 'rank', extraNatures: [], selectedJutsus: { ...DEFAULT_CHARACTER.selectedJutsus, slot2Elemental: 'dragon_fire_stream', slot3Elemental: 'water_shield_suijinheki' } });
    const water = chooseGrowth(ranked, 'Fire', 'element', 'Water');
    const r = fitToGrowth(ranked, water, 'Fire');
    assert.deepEqual(r.swaps, [{ slot: 'slot2Elemental', from: 'dragon_fire_stream', to: 'fire_three_embers' }]);
    assert.equal(r.loadout.slot3Elemental, 'water_shield_suijinheki', 'Water is its nature now');
    // Back to the higher rank: the Water jutsu goes, its slot gets what it may learn.
    const back = chooseGrowth({ ...water, selectedJutsus: r.loadout }, 'Fire', 'rank');
    const r2 = fitToGrowth(water, { ...back, selectedJutsus: r.loadout }, 'Fire');
    assert.deepEqual(r2.swaps, [{ slot: 'slot3Elemental', from: 'water_shield_suijinheki', to: 'fireball_goukakyu' }]);
    // A legend keeps its own higher jutsu: Raiga's Dragon Fire Stream stays when he leaves the second element and comes back.
    const raigaRank = chooseGrowth(RAIGA, 'Fire', 'rank');
    const r3 = fitToGrowth(RAIGA, raigaRank, 'Fire');
    assert.equal(r3.loadout.slot2Elemental, 'dragon_fire_stream');
    assert.notEqual(r3.loadout.slot3Elemental, 'earth_wall_doryuheki', 'the Earth Wall is no longer his nature');
    const r4 = fitToGrowth(raigaRank, { ...RAIGA, selectedJutsus: r3.loadout }, 'Fire');
    assert.equal(r4.loadout.slot2Elemental, 'dragon_fire_stream');
  });

  it('a new ninja\'s sheet and a type change keep the second element\'s jutsu', () => {
    const c = ninja(5, { natureGrowth: 'element', extraNatures: ['Water'], selectedJutsus: { ...DEFAULT_CHARACTER.selectedJutsus, slot3Elemental: 'water_shield_suijinheki' } });
    assert.equal(fitNewNinja(c.selectedJutsus, 'Fire', c.clan, c.shinobiClass, growthOf(c, 'Fire')).loadout.slot3Elemental, 'water_shield_suijinheki');
    assert.equal(fitToType(c, 'Lightning').loadout.slot3Elemental, 'water_shield_suijinheki', 'still its second element');
    assert.notEqual(fitToType(c, 'Water').loadout.slot2Elemental, 'fireball_goukakyu', 'Water as the type: Fire is no element of it now');
  });
});

describe('Kaien (Rayo + Fuego) and Raiga (Fuego + Tierra): "ok con kaien y raiga"', () => {
  it('their sheets: two natures, no jutsu out of their nature', () => {
    assert.deepEqual(naturesOf(KAIEN, natureOf(KAIEN)), ['Lightning', 'Fire']);
    assert.deepEqual(naturesOf(RAIGA, natureOf(RAIGA)), ['Fire', 'Earth']);
    assert.equal(RAIGA.natureGrowth, 'element', 'Raiga is level 5: his choice');
    assert.equal(KAIEN.natureGrowth, undefined, 'Kaien is level 4: a legend\'s own, before level 5');
    for (const { character: c } of LEGENDARY_PRESETS) {
      const n = natureOf(c);
      assert.deepEqual(offNatureJutsus(c.selectedJutsus, n, growthOf(c, n).extra), [], `${c.id}: nothing "no es de tu naturaleza"`);
    }
    // Before, without the second nature, they had one each.
    assert.deepEqual(offNatureJutsus(KAIEN.selectedJutsus, 'Lightning'), ['fireball_goukakyu']);
    assert.deepEqual(offNatureJutsus(RAIGA.selectedJutsus, 'Fire'), ['earth_wall_doryuheki']);
    // Kaien may pick the Fireball again in the creator.
    assert.ok(slotChoices(KAIEN, 'slot3Elemental', 'Lightning', KAIEN.clan).some((j) => j.id === 'fireball_goukakyu'));
  });

  it('a saved copy gets it on load, once: the hero, the roster, a mission under way', () => {
    const strip = (c: ShinobiCharacter): ShinobiCharacter => {
      const { extraNatures: _e, natureGrowth: _g, ...rest } = roundTrip(c);
      return rest as ShinobiCharacter;
    };
    const kaien = strip(KAIEN);
    const raiga = strip(RAIGA);
    assert.deepEqual(migrateCharacter(kaien).extraNatures, ['Fire']);
    assert.equal(migrateCharacter(kaien).natureGrowth, undefined);
    assert.deepEqual(migrateCharacter(raiga).extraNatures, ['Earth']);
    assert.equal(migrateCharacter(raiga).natureGrowth, 'element');
    for (const c of [kaien, raiga]) {
      const once = migrateCharacter(c);
      assert.deepEqual(migrateCharacter(once), once, `${c.id}: idempotent`);
      assert.deepEqual(migrateCharacter(roundTrip(once)), once, `${c.id}: after a save and a load too`);
      assert.deepEqual({ ...once, extraNatures: undefined, natureGrowth: undefined }, { ...migrateCharacter({ ...c, extraNatures: [] }), extraNatures: undefined, natureGrowth: undefined }, `${c.id}: nothing else changes`);
    }
    // A Raiga copy below level 5 (an older one) gets the element, not the choice.
    assert.equal(addLegendNatures({ ...raiga, level: 4 }).natureGrowth, undefined);
    assert.deepEqual(addLegendNatures({ ...raiga, level: 4 }).extraNatures, ['Earth']);
    // Through the saves.
    storage({ 'shinobi5e.hero.v1': kaien, 'shinobi5e.roster.v1': [{ character: raiga, savedAt: 1 }] });
    assert.deepEqual(loadHero()!.extraNatures, ['Fire']);
    assert.deepEqual(loadRoster()[0].character.extraNatures, ['Earth']);
    const run = startRun(RIVER_FOREST_PATROL, KAIEN.id, [migrateCharacter(kaien), AURELIA], { seed: 3, leaderId: KAIEN.id, difficulty: 'normal', noRandomness: false });
    const saved: MissionRun = roundTrip({ ...run, party: { ...run.party, members: [kaien, ...run.party.members.slice(1)] } });
    const m = migrateRun(saved);
    assert.deepEqual(m.party.members[0].extraNatures, ['Fire']);
    assert.deepEqual(migrateRun(m), m, 'idempotent');
    storage({});
    saveRun(saved);
    assert.deepEqual(loadRun()!.party.members[0].extraNatures, ['Fire']);
  });

  it('only their copies, as the player left them', () => {
    // Another legend's or a companion's copy, and a ninja of its own: nothing added.
    for (const c of [DEFAULT_CHARACTER, AURELIA, KENJI, ninja(5)]) assert.equal(addLegendNatures(c), c, c.id);
    // A copy whose type the player changed keeps what it has.
    const kaien = { ...roundTrip(KAIEN), extraNatures: undefined };
    const look = getAppearance(kaien);
    const water = { ...kaien, appearance: { ...look, chakra: { ...look.chakra, color: 'blue' as const } } };
    assert.equal(natureOf(water), 'Water');
    assert.equal(addLegendNatures(water), water);
    // A copy that made its own choice (the higher rank: no second element) keeps it.
    const ranked = { ...roundTrip(RAIGA), natureGrowth: 'rank' as const, extraNatures: [] };
    assert.equal(addLegendNatures(ranked), ranked);
  });
});
