// Tests for the owner's answers of 2026-10-21 (later): npm test. "1 d y c y los de su clan" (the ranks a
// new ninja may learn), "3 sello explosivo es un item o herramienta consumible palma curativa es un jutsu
// de utilidad" (the explosive tag is an item now) and "4 si pero no se puede cambiar de tipo" (the
// chakra type is fixed once the ninja is made). docs/GAMEPLAY_DESIGN.md, "Chakra type".

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CLANS_DATA, DEFAULT_CHARACTER, JUTSUS_DATA, LEGENDARY_PRESETS, SHINOBI_CLASSES } from '../data/shinobiData';
import { HANA, KENJI, RIVER_FOREST_PATROL } from '../data/missions';
import { JUTSU } from '../battle/jutsu';
import { unitFrom } from '../battle/units';
import { loadRun, migrateRun, type MissionRun, saveRun, startRun } from '../game/missionRun';
import { loadHero, loadRoster } from '../game/saves';
import { OFFERED_TYPES } from '../sprite/chakraNature';
import type { ChakraNature, ClanType, ShinobiCharacter, ShinobiClassType } from '../types/shinobi';
import { jutsuFitsClass } from './jutsuClass';
import { fitLoadout, importedSlots, jutsuChoices, jutsuFitsNature, type JutsuSlot, SLOT_CATEGORY } from './jutsuNature';
import { DEFAULT_SUPPLIES, newMission } from './mission';
import { migrateCharacter, natureOf } from './ninja';
import { pouchTags, TAG_JUTSU, TAG_JUTSU_POUCH, tagJutsuToItem, withPouches } from './pouch';
import { growthOf } from './natureGrowth';
import { aboveRank, asMade, creatorChoices, fitNewNinja, fitToType, isLegend, learnable, learnsAsNew, NEW_NINJA_RANKS, rankOpen, slotChoices, slotLocked, typeFixed } from './progression';

const CLANS = Object.keys(CLANS_DATA) as ClanType[];
const SLOTS = Object.keys(SLOT_CATEGORY) as JutsuSlot[];
const NATURES = OFFERED_TYPES.map((t) => t.nature);
const CLASSES = Object.keys(SHINOBI_CLASSES) as ShinobiClassType[];
const byId = (id: string) => JUTSUS_DATA.find((j) => j.id === id);

function storage(items: Record<string, unknown>): void {
  const m = new Map(Object.entries(items).map(([k, v]) => [k, JSON.stringify(v)]));
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => m.set(k, v) };
}

describe('a new ninja learns rank D and C jutsu, and its clan\'s ("d y c y los de su clan")', () => {
  it('the ranks', () => {
    assert.deepEqual([...NEW_NINJA_RANKS], ['D', 'C']);
    for (const j of JUTSUS_DATA)
      for (const clan of CLANS) {
        const want = j.requiredClan ? j.requiredClan === clan : j.rank === 'D' || j.rank === 'C';
        assert.equal(rankOpen(j, clan), want, `${j.id} for ${clan}`);
      }
  });

  it('the creator offers only those, of the ninja\'s nature and class, in every slot', () => {
    for (const nature of NATURES)
      for (const clan of CLANS)
        for (const cls of CLASSES)
          for (const slot of SLOTS) {
            const offer = creatorChoices(slot, nature, clan, cls);
            assert.deepEqual(
              offer.map((j) => j.id),
              jutsuChoices(slot, nature, clan).filter((j) => rankOpen(j, clan) && jutsuFitsClass(j, cls)).map((j) => j.id),
              `${nature} ${clan} ${cls} ${slot}`,
            );
            for (const j of offer) assert.ok(j.rank === 'D' || j.rank === 'C' || j.requiredClan === clan, `${slot}: ${j.id} (${j.rank})`);
          }
  });

  it('the clan secret is offered whatever its rank; the S-rank slot is locked for a new ninja', () => {
    for (const nature of NATURES)
      for (const clan of CLANS)
        for (const cls of CLASSES) {
          assert.deepEqual(creatorChoices('slot4Clan', nature, clan, cls).map((j) => j.id), [CLANS_DATA[clan].signatureJutsuId], `${clan} ${cls}`);
          assert.equal(byId(CLANS_DATA[clan].signatureJutsuId)!.rank, 'A', 'the clan secrets are rank A');
          assert.deepEqual(creatorChoices('slot5Ultimate', nature, clan, cls), [], `${nature} ${clan} ${cls}: nothing of rank S`);
          // Locked when its nature and class have an S-rank jutsu for later; else nothing fits it yet.
          assert.equal(slotLocked('slot5Ultimate', nature, clan, cls), learnable('slot5Ultimate', nature, clan, cls).length > 0, `${nature} ${clan} ${cls}`);
          for (const slot of ['slot1Utility', 'slot4Clan'] as JutsuSlot[]) assert.equal(slotLocked(slot, nature, clan, cls), false, `${nature} ${clan} ${cls} ${slot}`);
        }
    assert.equal(slotLocked('slot5Ultimate', 'Fire', 'Mirai', 'Bukijutsu Master'), true, 'Great Fire Annihilation, later');
    assert.equal(slotLocked('slot5Ultimate', 'Water', 'Mirai', 'Bukijutsu Master'), false, 'no Water S-rank and no kenjutsu S-rank: nothing at all');
  });

  it('a new game\'s sheet (the starting sheet under a new id): the S-rank slot empties, the rest are D and C or the clan\'s', () => {
    const solen = DEFAULT_CHARACTER; // Fire, Bukijutsu: Body Flicker (D), Fireball (C), Crescent Moon Dance (B), Wood Dragon (clan), Great Fire Annihilation (S)
    const r = fitNewNinja(solen.selectedJutsus, natureOf(solen), solen.clan, solen.shinobiClass);
    assert.equal(r.loadout.slot1Utility, 'body_flicker');
    assert.equal(r.loadout.slot2Elemental, 'fireball_goukakyu');
    assert.equal(r.loadout.slot4Clan, solen.selectedJutsus.slot4Clan, 'the clan secret stays (rank A)');
    assert.equal(r.loadout.slot5Ultimate, '', 'nothing of rank S: the slot is empty until it opens');
    assert.notEqual(r.loadout.slot3Elemental, 'crescent_moon_dance', 'rank B: swapped');
    // A Fire Bukijutsu Master has one jutsu of rank D or C for the Element slots (Fireball): the
    // other is left empty, never the same jutsu twice (the taijutsu one is the Taijutsu Master's).
    assert.equal(r.loadout.slot3Elemental, '');
    assert.deepEqual(r.swaps.map((x) => x.slot), ['slot3Elemental', 'slot5Ultimate']);
    assert.deepEqual(fitNewNinja(r.loadout, natureOf(solen), solen.clan, solen.shinobiClass).swaps, [], 'once fitted, nothing more to swap');
    assert.deepEqual(aboveRank(r.loadout, solen.clan), []);
    // As a Taijutsu Master, the Leaf Hurricane (D) takes the second Element slot.
    assert.equal(fitNewNinja(solen.selectedJutsus, natureOf(solen), solen.clan, 'Taijutsu Master').loadout.slot3Elemental, 'leaf_hurricane_senpuu');
  });

  it('every legend made a new ninja of any type and class: only D, C and its clan\'s, of its nature and class, never twice', () => {
    for (const { character: c } of LEGENDARY_PRESETS)
      for (const nature of NATURES)
        for (const cls of CLASSES) {
          const l = fitNewNinja(c.selectedJutsus, nature, c.clan, cls).loadout;
          assert.equal(l.slot4Clan, c.selectedJutsus.slot4Clan);
          assert.equal(l.slot5Ultimate, '');
          assert.ok(byId(l.slot1Utility), `${c.id} as ${nature}: the Utility slot stays filled`);
          for (const slot of ['slot1Utility', 'slot2Elemental', 'slot3Elemental'] as JutsuSlot[]) {
            const j = byId(l[slot]);
            if (j) assert.ok(rankOpen(j, c.clan) && jutsuFitsNature(j, nature) && jutsuFitsClass(j, cls), `${c.id} as ${nature} ${cls}: ${slot} ${j.id}`);
          }
          if (l.slot2Elemental) assert.notEqual(l.slot2Elemental, l.slot3Elemental, `${c.id} as ${nature} ${cls}: never twice`);
          // A slot is left empty only when its nature and class have nothing else for it.
          const offer = creatorChoices('slot2Elemental', nature, c.clan, cls).length;
          assert.equal([l.slot2Elemental, l.slot3Elemental].filter(Boolean).length, Math.min(2, offer), `${c.id} as ${nature} ${cls}`);
        }
  });

  it('the legends keep their sheets: their jutsu above C stay, marked', () => {
    const kaien = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_storm')!.character;
    assert.deepEqual(aboveRank(kaien.selectedJutsus, kaien.clan).sort(), ['chidori_lightning_blade', 'kirin_thunder']);
    for (const { character: c } of LEGENDARY_PRESETS) {
      assert.ok(aboveRank(c.selectedJutsus, c.clan).includes(c.selectedJutsus.slot5Ultimate), `${c.id}: its S-rank stays`);
      assert.ok(!aboveRank(c.selectedJutsus, c.clan).includes(c.selectedJutsus.slot4Clan), `${c.id}: its clan secret is its own`);
      assert.equal(migrateCharacter(c), c, `${c.id}: loads as it is`);
    }
  });

  it('only a new ninja is held to them: not a legend\'s own sheet, not a made ninja', () => {
    const fresh = { ...DEFAULT_CHARACTER, id: 'ninja_new' };
    assert.equal(learnsAsNew(fresh), true, 'a new game\'s sheet, a copy of a legend');
    for (const { character: c } of LEGENDARY_PRESETS) {
      assert.equal(isLegend(c), true, c.id);
      assert.equal(learnsAsNew(c), false, `${c.id}: keeps its sheet`);
    }
    assert.equal(isLegend(fresh), false);
    assert.equal(learnsAsNew(asMade(fresh)), false, 'a made ninja');
  });

  it('the creator\'s offers: the ranks its level opens, for a new ninja, a legend picked as a starting point and a made ninja alike', () => {
    const fresh = { ...DEFAULT_CHARACTER, id: 'ninja_new' };
    const made = asMade(fresh);
    for (const nature of NATURES)
      for (const slot of SLOTS) {
        const ids = (c: ShinobiCharacter) => slotChoices(c, slot, nature, c.clan).map((j) => j.id);
        assert.deepEqual(ids(fresh), creatorChoices(slot, nature, fresh.clan, fresh.shinobiClass).map((j) => j.id), `new ${nature} ${slot}`);
        assert.deepEqual(ids(DEFAULT_CHARACTER), ids(fresh), `a legend picked as a starting point: ${nature} ${slot}`);
        // With ranks earned at level 5 ("subir de rango tu elemento principal"), a made ninja is held to them too.
        assert.deepEqual(ids(made), ids(fresh), `made ${nature} ${slot}`);
      }
    // A made ninja's own rank B jutsu stays on its sheet, marked, and is not offered again; its S-rank slot is locked.
    assert.ok(!slotChoices(made, 'slot3Elemental', 'Fire', made.clan).some((j) => j.id === 'crescent_moon_dance'));
    assert.deepEqual(aboveRank(made.selectedJutsus, made.clan), ['crescent_moon_dance', 'great_fire_annihilation']);
    assert.equal(slotLocked('slot5Ultimate', 'Fire', made.clan, made.shinobiClass), true);
  });

  it('a legend picked as a starting point keeps its sheet on a type change: its S-rank becomes another of its class, empty only when none fits', () => {
    for (const { character: c } of LEGENDARY_PRESETS)
      for (const nature of NATURES) {
        if (nature === natureOf(c)) continue;
        const r = fitToType(c, nature);
        // Kaien and Raiga keep their second element (rules/natureGrowth.ts) unless it is the new type.
        const growth = growthOf(c, nature);
        assert.deepEqual(r, fitLoadout(c.selectedJutsus, nature, c.clan, (j) => jutsuFitsClass(j, c.shinobiClass), growth.extra), `${c.id} as ${nature}: every rank, of its class`);
        const s = byId(c.selectedJutsus.slot5Ultimate)!;
        const fits = jutsuFitsNature(s, nature, growth.extra) || learnable('slot5Ultimate', nature, c.clan, c.shinobiClass, growth).length > 0;
        assert.equal(!!r.loadout.slot5Ultimate, fits, `${c.id} as ${nature}: its S-rank slot stays filled when something fits`);
      }
    assert.equal(fitToType(DEFAULT_CHARACTER, 'Lightning').loadout.slot5Ultimate, 'kirin_thunder');
    // Solen (Bukijutsu) as Water: no Water S-rank, and the genjutsu and taijutsu ones are other classes'.
    assert.equal(fitToType(DEFAULT_CHARACTER, 'Water').loadout.slot5Ultimate, '');
    const shiori = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_gentle')!.character; // Taijutsu Master
    assert.equal(fitToType(shiori, 'Fire').loadout.slot5Ultimate, 'night_guy_dragon', 'no element: it stays');
  });

  it('changing the type in the creator swaps to jutsu a new ninja may learn; an S-rank of another element leaves the slot empty', () => {
    const solen = { ...DEFAULT_CHARACTER, id: 'ninja_new' };
    for (const nature of NATURES) {
      if (nature === 'Fire') continue;
      const r = fitToType(solen, nature);
      const s = r.swaps.find((x) => x.slot === 'slot5Ultimate');
      assert.deepEqual(s, { slot: 'slot5Ultimate', from: 'great_fire_annihilation', to: '' }, nature);
      for (const x of r.swaps.filter((y) => y.to)) assert.ok(rankOpen(byId(x.to)!, solen.clan) && jutsuFitsNature(byId(x.to)!, nature), `${nature}: ${x.to}`);
      assert.equal(r.loadout.slot1Utility, solen.selectedJutsus.slot1Utility);
      assert.equal(r.loadout.slot4Clan, solen.selectedJutsus.slot4Clan);
    }
  });
});

describe('the explosive tag is an item, not a jutsu ("es un item o herramienta consumible")', () => {
  const tagNinja = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter =>
    JSON.parse(JSON.stringify({ ...DEFAULT_CHARACTER, id: 'ninja_tag', ...over, selectedJutsus: { ...DEFAULT_CHARACTER.selectedJutsus, slot1Utility: TAG_JUTSU } }));

  it('no jutsu list has it: not the creator, not the battle', () => {
    assert.equal(byId(TAG_JUTSU), undefined);
    assert.equal(JUTSU[TAG_JUTSU], undefined);
    for (const nature of NATURES) for (const clan of CLANS) assert.ok(!jutsuChoices('slot1Utility', nature, clan).some((j) => j.id === TAG_JUTSU));
  });

  it('the healing palm stays a Utility jutsu, open to every nature', () => {
    const palm = byId('mystical_palm')!;
    assert.equal(palm.category, 'Utility');
    for (const nature of NATURES)
      for (const clan of CLANS) for (const cls of CLASSES) assert.ok(creatorChoices('slot1Utility', nature, clan, cls).some((j) => j.id === 'mystical_palm'), `${nature} ${clan} ${cls}`);
  });

  it('a sheet that had it gets Body Flicker in its slot and two tags in its pouch, once', () => {
    const old = tagNinja();
    const now = migrateCharacter(old);
    assert.equal(now.selectedJutsus.slot1Utility, 'body_flicker');
    assert.equal(pouchTags(now), TAG_JUTSU_POUCH);
    assert.equal(TAG_JUTSU_POUCH, 2);
    assert.deepEqual({ ...now, selectedJutsus: old.selectedJutsus, pouch: undefined }, { ...old, pouch: undefined }, 'nothing else changes');
    assert.deepEqual(migrateCharacter(now), now, 'idempotent');
    assert.deepEqual(migrateCharacter(JSON.parse(JSON.stringify(now))), now, 'after a save and a load too');
    // Tags already in the pouch are kept.
    assert.equal(pouchTags(tagJutsuToItem(tagNinja({ pouch: { explosiveTags: 1 } }))), 3);
    // A sheet without it comes back as it is.
    assert.equal(tagJutsuToItem(DEFAULT_CHARACTER), DEFAULT_CHARACTER);
    // Its unit in battle has no such jutsu.
    assert.ok(!unitFrom(now, { team: 'party', pos: { x: 0, z: 0 } }).jutsus.includes(TAG_JUTSU));
  });

  it('every load path converts it once: the hero, the roster, a saved mission, an imported sheet', () => {
    const old = tagNinja();
    storage({ 'shinobi5e.hero.v1': old, 'shinobi5e.roster.v1': [{ character: old, savedAt: 1 }] });
    for (const c of [loadHero()!, loadRoster()[0].character]) {
      assert.equal(c.selectedJutsus.slot1Utility, 'body_flicker');
      assert.equal(pouchTags(c), TAG_JUTSU_POUCH);
      assert.deepEqual(migrateCharacter(c), c, 'loading again adds nothing');
    }
    // An imported sheet's slots let the old jutsu through (and an empty S-rank slot), so the
    // conversion can run; an unknown id falls back to the starting sheet's.
    const slots = importedSlots({ ...old.selectedJutsus, slot5Ultimate: '', slot3Elemental: 'no_such_jutsu' }, DEFAULT_CHARACTER.selectedJutsus);
    assert.deepEqual(slots, { ...old.selectedJutsus, slot5Ultimate: '', slot3Elemental: DEFAULT_CHARACTER.selectedJutsus.slot3Elemental });
    assert.equal(importedSlots({ slot1Utility: 7 }, DEFAULT_CHARACTER.selectedJutsus).slot1Utility, DEFAULT_CHARACTER.selectedJutsus.slot1Utility, 'not a string');
    assert.equal(importedSlots({ slot4Clan: 'old_id' }, DEFAULT_CHARACTER.selectedJutsus, { old_id: 'fireball_goukakyu' }).slot4Clan, 'fireball_goukakyu', 'a renamed jutsu');
    assert.equal(pouchTags(migrateCharacter({ ...old, selectedJutsus: slots })), TAG_JUTSU_POUCH);
  });

  it('a mission saved halfway: the converted tags join its backpack at once, once', () => {
    const run = startRun(RIVER_FOREST_PATROL, 'ninja_tag', [migrateCharacter(tagNinja()), HANA], { seed: 3, leaderId: 'ninja_tag', difficulty: 'normal', noRandomness: false });
    // The same run as it was saved before the tag was an item: the jutsu on the sheet, no tags for it in the backpack.
    const tags = run.party.supplies.explosiveTags - TAG_JUTSU_POUCH;
    const before = (p: MissionRun['party']): MissionRun['party'] => ({ ...p, supplies: { ...p.supplies, explosiveTags: tags }, members: [tagNinja(), ...p.members.slice(1)] });
    const saved: MissionRun = JSON.parse(JSON.stringify({ ...run, party: before(run.party), entry: before(run.entry) }));
    const m = migrateRun(saved);
    for (const p of [m.party, m.entry]) {
      assert.equal(p.supplies.explosiveTags, tags + TAG_JUTSU_POUCH);
      assert.equal(p.members[0].selectedJutsus.slot1Utility, 'body_flicker');
    }
    assert.deepEqual(migrateRun(m), m, 'idempotent');
    assert.deepEqual(migrateRun(JSON.parse(JSON.stringify(m))), m, 'after a save and a load too');
    // Through the save slot.
    storage({});
    saveRun(saved);
    assert.equal(loadRun()!.party.supplies.explosiveTags, tags + TAG_JUTSU_POUCH);
    // A fallen ninja's tags count too (it set out with them).
    const fell: MissionRun = JSON.parse(JSON.stringify({ ...saved, party: { ...saved.party, members: saved.party.members.slice(1), dead: [tagNinja()] } }));
    assert.equal(migrateRun(fell).party.supplies.explosiveTags, tags + TAG_JUTSU_POUCH);
  });

  it('a broken pouch reads as empty', () => {
    for (const bad of [undefined, {}, { explosiveTags: -3 }, { explosiveTags: Number.NaN }, { explosiveTags: '4' as unknown as number }]) assert.equal(pouchTags({ pouch: bad }), 0);
    assert.equal(pouchTags({ pouch: { explosiveTags: 2.7 } }), 2);
  });

  it('the pouches join the backpack: a mission\'s start and a practice battle', () => {
    const tagged = migrateCharacter(tagNinja());
    assert.deepEqual(withPouches(DEFAULT_SUPPLIES, [tagged, HANA, KENJI]), { ...DEFAULT_SUPPLIES, explosiveTags: DEFAULT_SUPPLIES.explosiveTags + 2 });
    assert.equal(withPouches(DEFAULT_SUPPLIES, [HANA, KENJI]), DEFAULT_SUPPLIES, 'no pouches: the same backpack');
    assert.equal(newMission([tagged, HANA], { seed: 1 }).supplies.explosiveTags, DEFAULT_SUPPLIES.explosiveTags + 2);
    // An old save with the jutsu sets out with its tags in the backpack.
    const run = startRun(RIVER_FOREST_PATROL, 'ninja_tag', [tagNinja(), HANA], { seed: 2, leaderId: 'ninja_tag', difficulty: 'normal', noRandomness: false });
    assert.equal(run.party.supplies.explosiveTags, (RIVER_FOREST_PATROL.supplies?.explosiveTags ?? DEFAULT_SUPPLIES.explosiveTags) + 2);
    assert.equal(run.party.members[0].selectedJutsus.slot1Utility, 'body_flicker');
  });
});

describe('the chakra type is fixed once the ninja is made ("no se puede cambiar de tipo")', () => {
  it('a new ninja and the legends can change it; a made one cannot', () => {
    assert.equal(typeFixed(DEFAULT_CHARACTER), false);
    for (const { character: c } of LEGENDARY_PRESETS) assert.equal(typeFixed(c), false, c.id);
    assert.equal(typeFixed(HANA), false);
    const made = asMade(DEFAULT_CHARACTER);
    assert.equal(typeFixed(made), true);
    assert.equal(asMade(made), made, 'once');
    assert.deepEqual({ ...made, created: undefined }, { ...DEFAULT_CHARACTER, created: undefined }, 'nothing else changes');
  });

  it('every ninja saved on the device is made, also those saved before the rule', () => {
    const before: ShinobiCharacter = JSON.parse(JSON.stringify({ ...DEFAULT_CHARACTER, id: 'ninja_old' }));
    storage({ 'shinobi5e.hero.v1': before, 'shinobi5e.roster.v1': [{ character: before, savedAt: 1 }] });
    assert.equal(typeFixed(loadHero()!), true);
    assert.equal(typeFixed(loadRoster()[0].character), true);
    assert.equal(natureOf(loadHero()!), natureOf(before), 'its type is the one it had');
  });

  it('the type is the nature, so it fixes the elemental jutsu a made ninja can be offered', () => {
    const made = asMade(DEFAULT_CHARACTER);
    const nature: ChakraNature = natureOf(made);
    for (const slot of ['slot2Elemental', 'slot3Elemental'] as JutsuSlot[])
      for (const j of slotChoices(made, slot, nature, made.clan)) assert.ok(jutsuFitsNature(j, nature), `${slot}: ${j.id}`);
  });
});
