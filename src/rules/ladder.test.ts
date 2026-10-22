// Tests for the owner's answer of 2026-10-21 (later still): "si bukijutsu sera kenjutsu feat del tercer
// elemento opcion a nivel 5 esta bien al subir al nivel 7 te un rango A y al 10 un rango S". npm test.
// docs/GAMEPLAY_DESIGN.md, "The ladder": rank A at level 7, rank S at 10, and Triple Nature at 9.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CLANS_DATA, DEFAULT_CHARACTER, JUTSUS_DATA, LEGENDARY_PRESETS, SHINOBI_CLASSES, SHINOBI_FEATS } from '../data/shinobiData';
import { AURELIA, KENJI, RIVER_FOREST_PATROL } from '../data/missions';
import { enemyCharacter, enemyUnit, unitFrom } from '../battle/units';
import { JUTSU } from '../battle/jutsu';
import { loadRun, type MissionRun, saveRun, startRun } from '../game/missionRun';
import { loadHero, loadRoster } from '../game/saves';
import { OFFERED_TYPES } from '../sprite/chakraNature';
import type { ChakraNature, ClanType, ShinobiCharacter, ShinobiClassType } from '../types/shinobi';
import { STYLE_CLASS } from './jutsuClass';
import { type JutsuSlot, SLOT_CATEGORY } from './jutsuNature';
import { featNeeds, featOpen, keepEarnedFeats, tripleNatureDiscount } from './feats';
import { applyBattleResult, newMission } from './mission';
import {
  chooseGrowth,
  chooseThirdElement,
  earnedGrowth,
  fitThirdElement,
  growthOf,
  hasSecondElement,
  naturesOf,
  THIRD_ELEMENT_FEAT,
  THIRD_ELEMENT_LEVEL,
  thirdElementOpen,
} from './natureGrowth';
import { migrateCharacter, natureOf, returnToVillage, sanitizeMissionFields } from './ninja';
import { aboveRank, creatorChoices, fitNewNinja, learnable, levelRanks, RANK_A_LEVEL, RANK_S_LEVEL, rankOpen, slotChoices, slotLocked, slotOpensAt } from './progression';
import { chooseFire, morning, rollNight, serveFood, startCamp } from './rest';

const CLANS = Object.keys(CLANS_DATA) as ClanType[];
const SLOTS = Object.keys(SLOT_CATEGORY) as JutsuSlot[];
const NATURES = OFFERED_TYPES.map((t) => t.nature);
const CLASSES = Object.keys(SHINOBI_CLASSES) as ShinobiClassType[];
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
/** Solen's sheet (Fire, Bukijutsu Master, Ryusei) as a ninja of its own, at a level. */
const ninja = (level: number, more: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, id: 'ninja_ladder', level, ...more });
const roundTrip = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const TRIPLE = SHINOBI_FEATS.find((f) => f.id === THIRD_ELEMENT_FEAT)!;

function storage(items: Record<string, unknown>): void {
  const m = new Map(Object.entries(items).map(([k, v]) => [k, JSON.stringify(v)]));
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => m.set(k, v) };
}

describe('the ladder: rank A at level 7, rank S at level 10, for every ninja ("al subir al nivel 7 te un rango A y al 10 un rango S")', () => {
  it('the levels', () => {
    assert.equal(RANK_A_LEVEL, 7);
    assert.equal(RANK_S_LEVEL, 10);
    for (const [level, want] of [[1, []], [6, []], [7, ['A']], [9, ['A']], [10, ['A', 'S']], [20, ['A', 'S']]] as const) assert.deepEqual(levelRanks(level), want, `level ${level}`);
  });

  it('the ranks each level opens, whatever the clan, the nature and the level-5 choice', () => {
    for (const j of JUTSUS_DATA)
      for (const clan of CLANS)
        for (const level of [1, 6, 7, 9, 10]) {
          const byLevel = (j.rank === 'A' && level >= 7) || (j.rank === 'S' && level >= 10);
          const want = j.requiredClan ? j.requiredClan === clan : j.rank === 'D' || j.rank === 'C' || byLevel;
          assert.equal(rankOpen(j, clan, undefined, level), want, `${j.id} for ${clan} at ${level}`);
        }
    // Rank B still comes only with the level-5 rank up (the main element's), not with level 7 or 10.
    assert.equal(rankOpen(JUTSUS_DATA.find((j) => j.id === 'dragon_fire_stream')!, 'Ryusei', undefined, 10), false);
    assert.equal(rankOpen(JUTSUS_DATA.find((j) => j.id === 'dragon_fire_stream')!, 'Ryusei', 'Fire', 5), true);
  });

  it('the creator: Fire Bukijutsu at 6, 7 and 10', () => {
    const offer = (level: number, slot: JutsuSlot) => ids(slotChoices(ninja(level), slot, 'Fire', 'Ryusei'));
    assert.deepEqual(offer(6, 'slot5Ultimate'), [], 'level 6: the S-rank slot is locked');
    assert.deepEqual(offer(7, 'slot5Ultimate'), [], 'level 7: still locked');
    assert.deepEqual(offer(10, 'slot5Ultimate'), ['great_fire_annihilation'], 'level 10: it opens');
    for (const level of [6, 7, 9]) assert.equal(slotOpensAt('slot5Ultimate', 'Fire', 'Ryusei', 'Bukijutsu Master', growthOf(ninja(level), 'Fire')), 10, `level ${level}`);
    assert.equal(slotOpensAt('slot5Ultimate', 'Fire', 'Ryusei', 'Bukijutsu Master', growthOf(ninja(10), 'Fire')), undefined, 'open');
    assert.equal(slotLocked('slot5Ultimate', 'Fire', 'Ryusei', 'Bukijutsu Master', growthOf(ninja(10), 'Fire')), false);
  });

  it('rank A of its elements at 7: Lightning\'s Chidori, and a second element\'s too', () => {
    const lightning = (level: number, more: Partial<ShinobiCharacter> = {}) => ids(slotChoices(ninja(level, more), 'slot2Elemental', 'Lightning', 'Ryusei'));
    assert.ok(!lightning(6).includes('chidori_lightning_blade'), 'level 6');
    assert.ok(lightning(7).includes('chidori_lightning_blade'), 'level 7');
    // A Lightning ninja's Element slots are open from the start: the rank D and C set gives it Jolt and the Spark Fan.
    assert.equal(slotOpensAt('slot2Elemental', 'Lightning', 'Ryusei', 'Ninjutsu Specialist', growthOf(ninja(6), 'Lightning')), undefined);
    // A Fire ninja with Lightning as its second element gets Chidori at 7 (D, C and A of its elements).
    const fireLightning = (level: number) => ids(slotChoices(ninja(level, { natureGrowth: 'element', extraNatures: ['Lightning'] }), 'slot2Elemental', 'Fire', 'Ryusei'));
    assert.ok(!fireLightning(6).includes('chidori_lightning_blade'));
    assert.ok(fireLightning(7).includes('chidori_lightning_blade'));
    assert.ok(!fireLightning(7).includes('lightning_hound_raidon'), 'its B is not opened by the level');
  });

  it('rank A and S of its class\'s kind: the genjutsu of a Genjutsu Adept, never another class\'s', () => {
    const adept = (level: number, slot: JutsuSlot) => ids(slotChoices(ninja(level, { shinobiClass: 'Genjutsu Adept' }), slot, 'Fire', 'Ryusei'));
    assert.ok(!adept(6, 'slot3Elemental').includes('temple_of_nirvana'));
    assert.ok(adept(7, 'slot3Elemental').includes('temple_of_nirvana'));
    assert.deepEqual(adept(10, 'slot5Ultimate').sort(), ['great_fire_annihilation', 'yasaka_magatama']);
    assert.ok(!ids(slotChoices(ninja(10), 'slot5Ultimate', 'Fire', 'Ryusei')).includes('yasaka_magatama'), 'not a Bukijutsu Master\'s');
  });

  it('every offer at every level is of its nature and class, at a rank its level opens', () => {
    for (const nature of NATURES)
      for (const cls of CLASSES)
        for (const level of [6, 7, 10]) {
          const g = growthOf(ninja(level, { shinobiClass: cls }), nature);
          for (const slot of SLOTS)
            for (const j of creatorChoices(slot, nature, 'Ryusei', cls, g)) {
              assert.ok(learnable(slot, nature, 'Ryusei', cls, g).includes(j), `${nature} ${cls} ${level} ${slot}: ${j.id}`);
              if (!j.requiredClan) assert.ok(['D', 'C', ...levelRanks(level)].includes(j.rank), `${nature} ${cls} ${level} ${slot}: ${j.id} (${j.rank})`);
            }
        }
  });

  it('a new ninja of level 10 keeps its S-rank, one of level 9 has it swapped out', () => {
    const solen = DEFAULT_CHARACTER;
    assert.equal(fitNewNinja(solen.selectedJutsus, 'Fire', solen.clan, solen.shinobiClass, growthOf(ninja(10), 'Fire')).loadout.slot5Ultimate, 'great_fire_annihilation');
    assert.equal(fitNewNinja(solen.selectedJutsus, 'Fire', solen.clan, solen.shinobiClass, growthOf(ninja(9), 'Fire')).loadout.slot5Ultimate, '');
  });

  it('jutsu already on a sheet stay, marked: the legends below level 10 keep their S-rank', () => {
    for (const { character: c } of LEGENDARY_PRESETS) {
      assert.ok(c.level < RANK_S_LEVEL, `${c.id} is below level 10`);
      const g = growthOf(c, natureOf(c));
      assert.ok(aboveRank(c.selectedJutsus, c.clan, g.rankUp ? natureOf(c) : undefined, c.level).includes(c.selectedJutsus.slot5Ultimate), `${c.id}: its S-rank stays, marked`);
      assert.ok(Object.values(c.selectedJutsus).includes(c.selectedJutsus.slot5Ultimate));
    }
    // At level 10 it is no longer above its rank; at 7 a rank A jutsu is not either.
    const kaien = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_storm')!.character;
    assert.deepEqual(aboveRank(kaien.selectedJutsus, kaien.clan, undefined, kaien.level).sort(), ['chidori_lightning_blade', 'kirin_thunder']);
    assert.deepEqual(aboveRank(kaien.selectedJutsus, kaien.clan, undefined, 7), ['kirin_thunder']);
    assert.deepEqual(aboveRank(kaien.selectedJutsus, kaien.clan, undefined, 10), []);
  });

  it('saves load as they are: no migration (the hero, the roster, a mission under way)', () => {
    const high = { ...ninja(10), created: true, natureGrowth: 'element' as const, extraNatures: ['Water', 'Wind'] as ChakraNature[], selectedFeats: ['iron_skin', THIRD_ELEMENT_FEAT] };
    const legends = LEGENDARY_PRESETS.map((p) => roundTrip(p.character));
    storage({ 'shinobi5e.hero.v1': high, 'shinobi5e.roster.v1': [high, ...legends].map((character) => ({ character, savedAt: 1 })) });
    const hero = loadHero()!;
    assert.deepEqual(hero.selectedJutsus, high.selectedJutsus);
    assert.deepEqual(hero.extraNatures, ['Water', 'Wind']);
    assert.deepEqual(hero.selectedFeats, high.selectedFeats);
    const roster = loadRoster();
    for (const c of [high, ...legends]) assert.deepEqual(roster.find((r) => r.character.id === c.id)!.character.selectedJutsus, c.selectedJutsus, `${c.id}: its jutsu stay`);
    for (const c of legends) assert.deepEqual(migrateCharacter(c).selectedJutsus, c.selectedJutsus, c.id);
    // A mission saved halfway: the party's jutsu are what they were.
    const run: MissionRun = startRun(RIVER_FOREST_PATROL, high.id, [high, legends[0], AURELIA], { seed: 3, leaderId: high.id, difficulty: 'normal', noRandomness: false });
    saveRun(run);
    const loaded = loadRun()!;
    for (const m of run.party.members) assert.deepEqual(loaded.party.members.find((x) => x.id === m.id)!.selectedJutsus, m.selectedJutsus, m.id);
  });

  it('the battles are not touched: the enemies\' kits, the companions\' and the legends\' sheets keep every jutsu', () => {
    for (const kind of ['rogue', 'hunter', 'jonin', 'raider'] as const) {
      const sheet = enemyCharacter(kind, 1);
      const u = enemyUnit(kind, 1, { x: 1, z: 1 }, 'normal');
      for (const id of Object.values(sheet.selectedJutsus).filter((id) => JUTSU[id])) assert.ok(u.jutsus.includes(id), `${kind}: ${id}`);
    }
    assert.ok(enemyUnit('jonin', 1, { x: 1, z: 1 }, 'normal').jutsus.includes('chidori_lightning_blade'), 'the jonin keeps its rank A');
    for (const c of [AURELIA, KENJI, ...LEGENDARY_PRESETS.map((p) => p.character)]) {
      const u = unitFrom(c, { team: 'party', pos: { x: 1, z: 1 } });
      for (const id of Object.values(c.selectedJutsus).filter((id) => JUTSU[id])) assert.ok(u.jutsus.includes(id), `${c.id}: ${id}`);
    }
  });
});

describe('kenjutsu: the Bukijutsu Master\'s ("si bukijutsu sera kenjutsu")', () => {
  it('confirmed as built', () => {
    assert.equal(STYLE_CLASS.Kenjutsu, 'Bukijutsu Master');
  });
});

describe('Triple Nature ("feat del tercer elemento opcion a"): level 9 and a second element', () => {
  it('is in the feat list, in English and Spanish, with its requirements', () => {
    assert.ok(TRIPLE, 'triple_nature');
    assert.equal(TRIPLE.name, 'Triple Nature');
    assert.equal(TRIPLE.nameEs, 'Tres naturalezas');
    assert.ok(TRIPLE.description && TRIPLE.descriptionEs);
    assert.deepEqual(TRIPLE.requires, { level: 9, secondElement: true });
    assert.equal(THIRD_ELEMENT_LEVEL, 9);
    for (const f of SHINOBI_FEATS) if (f.id !== THIRD_ELEMENT_FEAT) assert.equal(f.requires, undefined, `${f.id} asks for nothing`);
  });

  it('what it asks for', () => {
    const second = { natureGrowth: 'element' as const, extraNatures: ['Water'] as ChakraNature[] };
    assert.deepEqual(featNeeds(TRIPLE, ninja(9, second)), []);
    assert.deepEqual(featNeeds(TRIPLE, ninja(8, second)), ['level']);
    assert.deepEqual(featNeeds(TRIPLE, ninja(9, { natureGrowth: 'rank', extraNatures: [] })), ['secondElement'], 'a higher rank is not a second element');
    assert.deepEqual(featNeeds(TRIPLE, ninja(6)), ['level', 'secondElement']);
    assert.equal(featOpen(TRIPLE, ninja(10, second)), true);
    // A legend's own second element counts (Kaien's), though he is far below level 9.
    const kaien = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_storm')!.character;
    assert.equal(hasSecondElement(kaien), true);
    assert.deepEqual(featNeeds(TRIPLE, kaien), ['level']);
    for (const f of SHINOBI_FEATS) if (!f.requires) assert.equal(featOpen(f, ninja(1)), true, f.id);
  });

  it('the third element: one of the other three, only with the feat and its requirements', () => {
    const base = ninja(9, { natureGrowth: 'element', extraNatures: ['Water'], selectedFeats: [THIRD_ELEMENT_FEAT] });
    assert.equal(thirdElementOpen(base), true);
    assert.equal(thirdElementOpen({ ...base, level: 8 }), false);
    assert.equal(thirdElementOpen({ ...base, selectedFeats: [] }), false);
    assert.equal(thirdElementOpen({ ...base, natureGrowth: 'rank', extraNatures: [] }), false);
    const fitted = fitThirdElement(base, 'Fire');
    assert.deepEqual(fitted.extraNatures, ['Water', 'Wind'], 'the first free element');
    assert.equal(fitThirdElement(fitted, 'Fire'), fitted, 'nothing more to do');
    assert.deepEqual(chooseThirdElement(fitted, 'Fire', 'Earth').extraNatures, ['Water', 'Earth']);
    assert.equal(chooseThirdElement(fitted, 'Fire', 'Fire'), fitted, 'not its type');
    assert.equal(chooseThirdElement(fitted, 'Fire', 'Water'), fitted, 'not its second');
    assert.deepEqual(chooseThirdElement({ ...fitted, level: 8 }, 'Fire', 'Earth').extraNatures, ['Water', 'Wind'], 'below level 9: no change');
    assert.deepEqual(naturesOf(chooseThirdElement(fitted, 'Fire', 'Earth'), 'Fire'), ['Fire', 'Water', 'Earth']);
    // Without the feat the third goes; the second stays.
    assert.deepEqual(fitThirdElement({ ...fitted, selectedFeats: [] }, 'Fire').extraNatures, ['Water']);
  });

  it('its third element\'s jutsu open as a second element\'s do (D and C, A from level 7)', () => {
    const c = chooseThirdElement(fitThirdElement(ninja(9, { natureGrowth: 'element', extraNatures: ['Water'], selectedFeats: [THIRD_ELEMENT_FEAT] }), 'Fire'), 'Fire', 'Lightning');
    const offer = ids(slotChoices(c, 'slot2Elemental', 'Fire', c.clan));
    assert.ok(offer.includes('water_shield_suijinheki'), 'the second\'s C');
    assert.ok(offer.includes('chidori_lightning_blade'), 'the third\'s A (level 9)');
    assert.ok(!offer.includes('lightning_hound_raidon'), 'not its B');
    assert.ok(!offer.includes('water_dragon_suiryuudan'), 'not the second\'s B');
  });

  it('the creator enforces it: a ninja that leaves its second element loses the feat and the third', () => {
    const c = chooseThirdElement(fitThirdElement(ninja(9, { natureGrowth: 'element', extraNatures: ['Water'], selectedFeats: ['iron_skin', THIRD_ELEMENT_FEAT] }), 'Fire'), 'Fire', 'Earth');
    assert.equal(keepEarnedFeats(c, 'Fire'), c, 'it meets them: the same sheet');
    const ranked = keepEarnedFeats(chooseGrowth(c, 'Fire', 'rank'), 'Fire');
    assert.deepEqual(ranked.selectedFeats, ['iron_skin']);
    assert.deepEqual(ranked.extraNatures, []);
    const low = keepEarnedFeats({ ...c, level: 8 }, 'Fire');
    assert.deepEqual(low.selectedFeats, ['iron_skin']);
    assert.deepEqual(low.extraNatures, ['Water'], 'the second stays');
    // A new ninja keeps only what it earned: the feat's third needs level 9 too.
    assert.deepEqual(earnedGrowth({ ...c, level: 8 }, 'Fire').extraNatures, ['Water']);
    assert.deepEqual(earnedGrowth(c, 'Fire').extraNatures, ['Water', 'Earth']);
  });

  it('the discount: 1 chakra, between two of its elements, not spent', () => {
    const n = ['Fire', 'Water', 'Earth'];
    assert.equal(tripleNatureDiscount(n, false, 'Water', 'Fire'), 1);
    assert.equal(tripleNatureDiscount(n, false, 'Fire', 'Fire'), 0, 'the same element');
    assert.equal(tripleNatureDiscount(n, false, undefined, 'Fire'), 0, 'its first jutsu of the battle');
    assert.equal(tripleNatureDiscount(n, false, 'Taijutsu', 'Fire'), 0, 'the previous one was no element');
    assert.equal(tripleNatureDiscount(n, false, 'Wind', 'Fire'), 0, 'the previous one was not one of its elements');
    assert.equal(tripleNatureDiscount(n, false, 'Fire', 'Lightning'), 0, 'this one is not one of its elements');
    assert.equal(tripleNatureDiscount(n, true, 'Water', 'Fire'), 0, 'spent since the last long rest');
  });

  it('once per long rest: spent in a battle, ready again after the camp\'s morning and at the village', () => {
    const c = { ...fitThirdElement(ninja(9, { natureGrowth: 'element', extraNatures: ['Water'], selectedFeats: [THIRD_ELEMENT_FEAT] }), 'Fire'), effects: [] };
    let p = newMission([c, AURELIA], { seed: 4, noRandomness: true });
    p = applyBattleResult(p, { victory: true, members: [{ id: c.id, hp: c.currentHp, chakra: 5, tripleNatureSpent: true }] }, 'b1').party;
    assert.equal(p.members[0].tripleNatureSpent, true);
    // A battle in which it was not spent changes nothing.
    assert.equal(applyBattleResult(p, { victory: true, members: [{ id: c.id, hp: c.currentHp, chakra: 5 }] }, 'b2').party.members[0].tripleNatureSpent, true);
    // The camp: set up, fire, food, night, morning.
    const ok = <S,>(o: { ok: true; party: typeof p; state: S } | { ok: false; reason: string }) => {
      assert.ok(o.ok, o.ok ? '' : o.reason);
      return o as { ok: true; party: typeof p; state: S };
    };
    let s = ok(startCamp(p, { nodeId: 'camp', zoneDanger: 0 }));
    s = ok(chooseFire(s.party, s.state, 'low'));
    s = ok(serveFood(s.party, s.state, 'dry'));
    s = ok(rollNight(s.party, s.state));
    s = ok(morning(s.party, s.state));
    assert.equal(s.party.members[0].tripleNatureSpent, undefined, 'a long rest: ready again');
    assert.equal(returnToVillage({ ...c, tripleNatureSpent: true }).character.tripleNatureSpent, undefined, 'back at the village');
    // A saved or imported sheet: only true counts.
    assert.equal(sanitizeMissionFields({ ...c, tripleNatureSpent: 'yes' as unknown as boolean }).tripleNatureSpent, undefined);
    assert.equal(sanitizeMissionFields({ ...c, tripleNatureSpent: true }).tripleNatureSpent, true);
  });
});
