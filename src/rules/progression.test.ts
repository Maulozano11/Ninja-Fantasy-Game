// Tests for the owner's answers of 2026-10-21 (later): npm test. "1 d y c y los de su clan" (the ranks a
// new ninja may learn), "3 sello explosivo es un item o herramienta consumible palma curativa es un jutsu
// de utilidad" (the explosive tag is an item now) and "4 si pero no se puede cambiar de tipo" (the
// chakra type is fixed once the ninja is made). docs/GAMEPLAY_DESIGN.md, "Chakra type".

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CLANS_DATA, DEFAULT_CHARACTER, JUTSUS_DATA, LEGENDARY_PRESETS } from '../data/shinobiData';
import { HANA, KENJI, RIVER_FOREST_PATROL } from '../data/missions';
import { JUTSU } from '../battle/jutsu';
import { unitFrom } from '../battle/units';
import { startRun } from '../game/missionRun';
import { loadHero, loadRoster } from '../game/saves';
import { OFFERED_TYPES } from '../sprite/chakraNature';
import type { ChakraNature, ClanType, ShinobiCharacter } from '../types/shinobi';
import { fitLoadout, jutsuChoices, jutsuFitsNature, type JutsuSlot, SLOT_CATEGORY } from './jutsuNature';
import { DEFAULT_SUPPLIES, newMission } from './mission';
import { migrateCharacter, natureOf } from './ninja';
import { pouchTags, TAG_JUTSU, TAG_JUTSU_POUCH, tagJutsuToItem, withPouches } from './pouch';
import { aboveRank, asMade, creatorChoices, fitNewNinja, NEW_NINJA_RANKS, rankOpen, slotLocked, typeFixed } from './progression';

const CLANS = Object.keys(CLANS_DATA) as ClanType[];
const SLOTS = Object.keys(SLOT_CATEGORY) as JutsuSlot[];
const NATURES = OFFERED_TYPES.map((t) => t.nature);
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

  it('the creator offers only those, of the ninja\'s nature, in every slot', () => {
    for (const nature of NATURES)
      for (const clan of CLANS)
        for (const slot of SLOTS) {
          const offer = creatorChoices(slot, nature, clan);
          assert.deepEqual(
            offer.map((j) => j.id),
            jutsuChoices(slot, nature, clan).filter((j) => rankOpen(j, clan)).map((j) => j.id),
            `${nature} ${clan} ${slot}`,
          );
          for (const j of offer) assert.ok(j.rank === 'D' || j.rank === 'C' || j.requiredClan === clan, `${slot}: ${j.id} (${j.rank})`);
        }
  });

  it('the clan secret is offered whatever its rank; the S-rank slot is locked for a new ninja', () => {
    for (const nature of NATURES)
      for (const clan of CLANS) {
        assert.deepEqual(creatorChoices('slot4Clan', nature, clan).map((j) => j.id), [CLANS_DATA[clan].signatureJutsuId], `${clan}`);
        assert.equal(byId(CLANS_DATA[clan].signatureJutsuId)!.rank, 'A', 'the clan secrets are rank A');
        assert.equal(slotLocked('slot5Ultimate', nature, clan), true, `${nature} ${clan}: S-rank opens later`);
        for (const slot of ['slot1Utility', 'slot2Elemental', 'slot3Elemental', 'slot4Clan'] as JutsuSlot[]) assert.equal(slotLocked(slot, nature, clan), false, `${nature} ${clan} ${slot}`);
      }
  });

  it('a new game\'s sheet (the starting sheet under a new id): the S-rank slot empties, the rest are D and C or the clan\'s', () => {
    const solen = DEFAULT_CHARACTER; // Fire: Body Flicker (D), Fireball (C), Crescent Moon Dance (B), Wood Dragon (clan), Great Fire Annihilation (S)
    const r = fitNewNinja(solen.selectedJutsus, natureOf(solen), solen.clan);
    assert.equal(r.loadout.slot1Utility, 'body_flicker');
    assert.equal(r.loadout.slot2Elemental, 'fireball_goukakyu');
    assert.equal(r.loadout.slot4Clan, solen.selectedJutsus.slot4Clan, 'the clan secret stays (rank A)');
    assert.equal(r.loadout.slot5Ultimate, '', 'nothing of rank S: the slot is empty until it opens');
    assert.notEqual(r.loadout.slot3Elemental, 'crescent_moon_dance', 'rank B: swapped');
    assert.ok(['D', 'C'].includes(byId(r.loadout.slot3Elemental)!.rank));
    assert.notEqual(r.loadout.slot3Elemental, r.loadout.slot2Elemental, 'two different Element jutsu');
    assert.deepEqual(r.swaps.map((x) => x.slot), ['slot3Elemental', 'slot5Ultimate']);
    assert.deepEqual(fitNewNinja(r.loadout, natureOf(solen), solen.clan).swaps, [], 'once fitted, nothing more to swap');
    assert.deepEqual(aboveRank(r.loadout, solen.clan), []);
  });

  it('every legend made a new ninja of any type: only D, C and its clan\'s, all of its nature', () => {
    for (const { character: c } of LEGENDARY_PRESETS)
      for (const nature of NATURES) {
        const l = fitNewNinja(c.selectedJutsus, nature, c.clan).loadout;
        assert.equal(l.slot4Clan, c.selectedJutsus.slot4Clan);
        assert.equal(l.slot5Ultimate, '');
        for (const slot of ['slot1Utility', 'slot2Elemental', 'slot3Elemental'] as JutsuSlot[]) {
          const j = byId(l[slot]);
          assert.ok(j, `${c.id} as ${nature}: ${slot} filled`);
          assert.ok(rankOpen(j, c.clan) && jutsuFitsNature(j, nature), `${c.id} as ${nature}: ${slot} ${j.id}`);
        }
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

  it('changing the type in the creator swaps to jutsu a new ninja may learn; an S-rank of another element leaves the slot empty', () => {
    const solen = DEFAULT_CHARACTER;
    const allow = (clan: ClanType) => (j: (typeof JUTSUS_DATA)[number]) => rankOpen(j, clan);
    for (const nature of NATURES) {
      if (nature === 'Fire') continue;
      const r = fitLoadout(solen.selectedJutsus, nature, solen.clan, allow(solen.clan));
      const s = r.swaps.find((x) => x.slot === 'slot5Ultimate');
      assert.deepEqual(s, { slot: 'slot5Ultimate', from: 'great_fire_annihilation', to: '' }, nature);
      for (const x of r.swaps.filter((y) => y.to)) assert.ok(rankOpen(byId(x.to)!, solen.clan) && jutsuFitsNature(byId(x.to)!, nature), `${nature}: ${x.to}`);
      assert.equal(r.loadout.slot1Utility, solen.selectedJutsus.slot1Utility);
      assert.equal(r.loadout.slot4Clan, solen.selectedJutsus.slot4Clan);
    }
    // Without the cap (as before) the slot is never emptied.
    assert.equal(fitLoadout(solen.selectedJutsus, 'Lightning', solen.clan).loadout.slot5Ultimate, 'kirin_thunder');
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
    for (const nature of NATURES) for (const clan of CLANS) assert.ok(creatorChoices('slot1Utility', nature, clan).some((j) => j.id === 'mystical_palm'), `${nature} ${clan}`);
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
      for (const j of creatorChoices(slot, nature, made.clan)) assert.ok(jutsuFitsNature(j, nature), `${slot}: ${j.id}`);
  });
});
