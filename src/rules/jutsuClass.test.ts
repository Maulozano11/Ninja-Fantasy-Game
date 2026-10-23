// Tests for the owner's answer of 2026-10-21, asked who learns the genjutsu, kenjutsu and taijutsu
// jutsu: "los que elijan de clase genjutsu kenjutsu o taijutsu". npm test. docs/GAMEPLAY_DESIGN.md,
// "Chakra type", "Jutsu of a class".

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CLANS_DATA, DEFAULT_CHARACTER, JUTSUS_DATA, LEGENDARY_PRESETS, SHINOBI_CLASSES } from '../data/shinobiData';
import { HANA, KENJI } from '../data/missions';
import { OFFERED_TYPES } from '../sprite/chakraNature';
import type { ClanType, ShinobiCharacter, ShinobiClassType } from '../types/shinobi';
import { classGated, classStyle, jutsuFitsClass, offClassJutsus, STYLE_CLASS } from './jutsuClass';
import { jutsuChoices, type JutsuSlot, SLOT_CATEGORY } from './jutsuNature';
import { migrateCharacter, natureOf } from './ninja';
import { asMade, creatorChoices, fitToClass, learnable, slotChoices } from './progression';

const CLANS = Object.keys(CLANS_DATA) as ClanType[];
const CLASSES = Object.keys(SHINOBI_CLASSES) as ShinobiClassType[];
const SLOTS = Object.keys(SLOT_CATEGORY) as JutsuSlot[];
const NATURES = OFFERED_TYPES.map((t) => t.nature);
const byId = (id: string) => JUTSUS_DATA.find((j) => j.id === id)!;
const ids = (xs: { id: string }[]) => xs.map((j) => j.id);
const legend = (id: string) => LEGENDARY_PRESETS.find((p) => p.character.id === id)!.character;

describe('the taijutsu, kenjutsu and genjutsu jutsu belong to their class', () => {
  it('the classes, mapped: taijutsu, kenjutsu (Bukijutsu) and genjutsu; Ninjutsu and Medical have none', () => {
    assert.deepEqual(STYLE_CLASS, { Taijutsu: 'Taijutsu Master', Kenjutsu: 'Bukijutsu Master', Genjutsu: 'Genjutsu Adept' });
    assert.equal(classStyle('Taijutsu Master'), 'Taijutsu');
    assert.equal(classStyle('Bukijutsu Master'), 'Kenjutsu');
    assert.equal(classStyle('Genjutsu Adept'), 'Genjutsu');
    assert.equal(classStyle('Ninjutsu Specialist'), undefined);
    assert.equal(classStyle('Medical Specialist'), undefined);
    for (const cls of CLASSES) assert.ok(SHINOBI_CLASSES[cls], cls);
  });

  it('which jutsu the class gates: those with no element in the Element and S-rank slots', () => {
    assert.deepEqual(ids(JUTSUS_DATA.filter(classGated)).sort(), [
      'crescent_moon_dance',
      'genjutsu_mirage',
      'kenjutsu_bleeding_cut',
      'leaf_hurricane_senpuu',
      'night_guy_dragon',
      'taijutsu_rush',
      'temple_of_nirvana',
      'yasaka_magatama',
    ]);
    for (const j of JUTSUS_DATA) {
      const want = (j.category === 'Elemental' || j.category === 'Ultimate') && ['Taijutsu', 'Kenjutsu', 'Genjutsu'].includes(j.nature);
      assert.equal(classGated(j), want, j.id);
      for (const cls of CLASSES) assert.equal(jutsuFitsClass(j, cls), !want || STYLE_CLASS[j.nature as 'Taijutsu'] === cls, `${j.id} ${cls}`);
    }
  });

  it('the utility jutsu stay open to every class (the healing palm, Body Flicker, the Substitution)', () => {
    for (const nature of NATURES)
      for (const cls of CLASSES) {
        const offer = ids(creatorChoices('slot1Utility', nature, 'Mirai', cls));
        for (const id of ['mystical_palm', 'body_flicker', 'substitution_kawarimi']) assert.ok(offer.includes(id), `${nature} ${cls}: ${id}`);
      }
  });

  it('a clan\'s jutsu stay open to the clan, whatever their kind (the 64 Palms, a taijutsu jutsu)', () => {
    for (const nature of NATURES)
      for (const clan of CLANS)
        for (const cls of CLASSES) assert.deepEqual(ids(creatorChoices('slot4Clan', nature, clan, cls)), [CLANS_DATA[clan].signatureJutsuId], `${clan} ${cls}`);
    assert.equal(byId('taki_sixtyfour_palms').nature, 'Taijutsu');
  });

  it('the creator offers the Element and S-rank jutsu of the ninja\'s nature, plus only its own class\'s kind', () => {
    for (const nature of NATURES)
      for (const cls of CLASSES)
        for (const slot of ['slot2Elemental', 'slot3Elemental', 'slot5Ultimate'] as JutsuSlot[]) {
          const all = learnable(slot, nature, 'Mirai', cls);
          assert.deepEqual(ids(all), ids(jutsuChoices(slot, nature, 'Mirai').filter((j) => jutsuFitsClass(j, cls))), `${nature} ${cls} ${slot}`);
          for (const j of all) if (classGated(j)) assert.equal(STYLE_CLASS[j.nature as 'Taijutsu'], cls, `${nature} ${cls}: ${j.id}`);
        }
    // Fire, every rank: each class sees its own kind and no other.
    const fire = (cls: ShinobiClassType) => ids(learnable('slot3Elemental', 'Fire', 'Mirai', cls));
    assert.deepEqual(fire('Taijutsu Master'), ['fire_three_embers', 'fireball_goukakyu', 'dragon_fire_stream', 'leaf_hurricane_senpuu', 'taijutsu_rush']);
    assert.deepEqual(fire('Bukijutsu Master'), ['fire_three_embers', 'fireball_goukakyu', 'dragon_fire_stream', 'kenjutsu_bleeding_cut', 'crescent_moon_dance']);
    assert.deepEqual(fire('Genjutsu Adept'), ['fire_three_embers', 'fireball_goukakyu', 'dragon_fire_stream', 'genjutsu_mirage', 'temple_of_nirvana']);
    assert.deepEqual(fire('Ninjutsu Specialist'), ['fire_three_embers', 'fireball_goukakyu', 'dragon_fire_stream']);
    assert.deepEqual(fire('Medical Specialist'), ['fire_three_embers', 'fireball_goukakyu', 'dragon_fire_stream']);
    assert.deepEqual(ids(learnable('slot5Ultimate', 'Fire', 'Mirai', 'Genjutsu Adept')), ['great_fire_annihilation', 'yasaka_magatama']);
    assert.deepEqual(ids(learnable('slot5Ultimate', 'Fire', 'Mirai', 'Taijutsu Master')), ['great_fire_annihilation', 'night_guy_dragon']);
    // A new ninja, D and C: a Fire genjutsu adept has Three Embers, Fireball and the Mirage; a
    // taijutsu master the Leaf Hurricane and the Rush instead of the Mirage.
    assert.deepEqual(ids(creatorChoices('slot2Elemental', 'Fire', 'Mirai', 'Genjutsu Adept')), ['fire_three_embers', 'fireball_goukakyu', 'genjutsu_mirage']);
    assert.deepEqual(ids(creatorChoices('slot2Elemental', 'Fire', 'Mirai', 'Taijutsu Master')), ['fire_three_embers', 'fireball_goukakyu', 'leaf_hurricane_senpuu', 'taijutsu_rush']);
  });

  it('a made ninja is held to its class too, at every rank', () => {
    const made = asMade({ ...DEFAULT_CHARACTER, id: 'ninja_made', shinobiClass: 'Genjutsu Adept' });
    for (const slot of SLOTS) for (const j of slotChoices(made, slot, 'Fire', made.clan)) assert.ok(jutsuFitsClass(j, 'Genjutsu Adept'), `${slot}: ${j.id}`);
    // At every rank its class's are what it learns (the Temple of Nirvana, rank A, when its rank opens), never another class's.
    assert.ok(learnable('slot3Elemental', 'Fire', made.clan, made.shinobiClass).some((j) => j.id === 'temple_of_nirvana'));
    assert.ok(!learnable('slot3Elemental', 'Fire', made.clan, made.shinobiClass).some((j) => j.id === 'crescent_moon_dance'));
  });
});

describe('the sheets keep their jutsu, marked when another class\'s', () => {
  it('no legend breaks the rule: each one\'s taijutsu, kenjutsu or genjutsu jutsu is its class\'s', () => {
    for (const { character: c } of LEGENDARY_PRESETS) assert.deepEqual(offClassJutsus(c.selectedJutsus, c.shinobiClass), [], c.id);
  });

  it('a companion\'s sheet stays as it is, marked: Hana (a medic) keeps Yasaka no Magatama (genjutsu)', () => {
    assert.deepEqual(offClassJutsus(HANA.selectedJutsus, HANA.shinobiClass), ['yasaka_magatama']);
    assert.deepEqual(offClassJutsus(KENJI.selectedJutsus, KENJI.shinobiClass), []);
    assert.equal(migrateCharacter(HANA).selectedJutsus.slot5Ultimate, 'yasaka_magatama', 'loading keeps it');
  });
});

describe('changing class in the creator swaps the jutsu of another class, as a type change does', () => {
  const fresh: ShinobiCharacter = { ...DEFAULT_CHARACTER, id: 'ninja_new', selectedJutsus: { ...DEFAULT_CHARACTER.selectedJutsus, slot3Elemental: 'crescent_moon_dance', slot5Ultimate: '' } };

  it('a new ninja: the jutsu of another class become ones it may learn (D and C), or the slot is emptied', () => {
    // Fire Bukijutsu -> Taijutsu Master: the Crescent Moon Dance (kenjutsu) becomes the first jutsu
    // it may learn that is not already in Element I (Three Embers, rank D).
    const r = fitToClass(fresh, 'Fire', 'Taijutsu Master');
    assert.deepEqual(r.swaps, [{ slot: 'slot3Elemental', from: 'crescent_moon_dance', to: 'fire_three_embers' }]);
    assert.deepEqual(r.loadout, { ...fresh.selectedJutsus, slot3Elemental: 'fire_three_embers' });
    assert.deepEqual(fitToClass({ ...fresh, selectedJutsus: r.loadout }, 'Fire', 'Taijutsu Master').swaps, [], 'once fitted, nothing more to swap');
    // -> Genjutsu Adept: the same (Fireball is already in Element I).
    const g = fitToClass(fresh, 'Fire', 'Genjutsu Adept');
    assert.deepEqual(g.swaps, [{ slot: 'slot3Elemental', from: 'crescent_moon_dance', to: 'fire_three_embers' }]);
    // A class with nothing of rank D or C left to learn empties the slot.
    const bare = { ...fresh, selectedJutsus: { ...fresh.selectedJutsus, slot2Elemental: 'fire_three_embers' } };
    assert.deepEqual(fitToClass(bare, 'Fire', 'Ninjutsu Specialist').swaps, [{ slot: 'slot3Elemental', from: 'crescent_moon_dance', to: 'fireball_goukakyu' }]);
    // The same class: nothing changes.
    assert.deepEqual(fitToClass(fresh, 'Fire', 'Bukijutsu Master').swaps, []);
  });

  it('every class change of every legend, made a new ninja: what is left fits the class and the ranks, the rest stays', () => {
    for (const { character: c } of LEGENDARY_PRESETS)
      for (const cls of CLASSES) {
        const nu = { ...c, id: 'ninja_copy' };
        const r = fitToClass(nu, natureOf(c), cls);
        for (const x of r.swaps) assert.ok(!jutsuFitsClass(byId(x.from), cls), `${c.id} to ${cls}: ${x.from} was another class's`);
        for (const slot of SLOTS) {
          const id = r.loadout[slot];
          if (!r.swaps.some((x) => x.slot === slot)) assert.equal(id, c.selectedJutsus[slot], `${c.id} to ${cls}: ${slot} stays`);
          else if (id) assert.ok(jutsuFitsClass(byId(id), cls) && ['D', 'C'].includes(byId(id).rank), `${c.id} to ${cls}: ${slot} ${id}`);
        }
        assert.deepEqual(offClassJutsus(r.loadout, cls), [], `${c.id} to ${cls}`);
      }
  });

  it('a legend picked as a starting point and a made ninja keep their ranks: the swap may be of any rank', () => {
    // Hiro (Wind, Taijutsu Master) with a taijutsu S-rank: Leaf Hurricane (D), Night Guy (S). (This was
    // Shiori's sheet until the owner discarded her on 2026-10-22: "shiori desechala".)
    const hiro = legend('preset_sunburst');
    const taijutsuS = { ...hiro, selectedJutsus: { ...hiro.selectedJutsus, slot5Ultimate: 'night_guy_dragon' } };
    const r = fitToClass(taijutsuS, natureOf(taijutsuS), 'Genjutsu Adept');
    assert.deepEqual(r.swaps, [
      { slot: 'slot3Elemental', from: 'leaf_hurricane_senpuu', to: 'wind_whirl' },
      { slot: 'slot5Ultimate', from: 'night_guy_dragon', to: 'rasenshuriken_wind' },
    ]);
    const made = asMade({ ...taijutsuS, id: 'ninja_made' });
    assert.deepEqual(fitToClass(made, natureOf(made), 'Genjutsu Adept'), r, 'a made ninja: the same');
    // A new ninja's copy may not learn the S-rank: the slot empties.
    const nu = { ...taijutsuS, id: 'ninja_new' };
    assert.equal(fitToClass(nu, natureOf(nu), 'Genjutsu Adept').loadout.slot5Ultimate, '');
  });
});
