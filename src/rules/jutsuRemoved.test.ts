// Tests for the owner's jutsu decisions of 2026-10-22: the Rasenshuriken is the Hurricane Star
// ("Estrella Huracán"), the Mirage is the Mind Twist ("Mente retorcida"), both with their ids as they
// were, and Yasaka no Magatama is out of the game ("quitala del juego"): no data names it, and a sheet
// saved with it loads with a replacement (rules/progression.ts, refitRemoved). npm test.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { CLANS_DATA, DEFAULT_CHARACTER, JUTSUS_DATA, LEGENDARY_PRESETS, SHINOBI_CLASSES } from '../data/shinobiData';
import { COMPANIONS, HANA, MISSIONS, RIVER_FOREST_PATROL } from '../data/missions';
import { enemyCharacter, unitFrom } from '../battle/units';
import { JUTSU } from '../battle/jutsu';
import { jutsuName } from '../components/battle/battleLog';
import { loadRun, type MissionRun, saveRun, startRun } from '../game/missionRun';
import { loadHero, loadRoster } from '../game/saves';
import { getAppearance } from '../sprite/legacy';
import type { ChakraColorId } from '../sprite/types';
import type { ShinobiCharacter, ShinobiClassType } from '../types/shinobi';
import { importedSlots, REMOVED_JUTSUS } from './jutsuNature';
import { migrateCharacter, natureOf } from './ninja';
import { refitRemoved } from './progression';

const GONE = 'yasaka_magatama';
const roundTrip = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

/** A made ninja of this class and chakra burst, saved with `jutsus` in its slots. */
function saved(cls: ShinobiClassType, burst: ChakraColorId, jutsus: Partial<ShinobiCharacter['selectedJutsus']>): ShinobiCharacter {
  const look = getAppearance(DEFAULT_CHARACTER);
  return roundTrip({
    ...DEFAULT_CHARACTER,
    id: 'ninja_saved',
    created: true,
    shinobiClass: cls,
    appearance: { ...look, chakra: { ...look.chakra!, color: burst } },
    selectedJutsus: { ...DEFAULT_CHARACTER.selectedJutsus, ...jutsus },
  });
}

function storage(items: Record<string, unknown>): void {
  const m = new Map(Object.entries(items).map(([k, v]) => [k, JSON.stringify(v)]));
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => m.set(k, v) };
}

describe('the new names (the owner, 2026-10-22); the ids stay', () => {
  it('the Hurricane Star and the Mind Twist, in both languages, with Japanese names of their own', () => {
    const want: Record<string, [string, string, string]> = {
      rasenshuriken_wind: ['Wind Technique: Hurricane Star', 'Técnica de Viento: Estrella Huracán', '旋風星 (Senpūsei)'],
      genjutsu_mirage: ['Genjutsu Technique: Mind Twist', 'Técnica de Genjutsu: Mente retorcida', '心捩じりの術 (Kokoro Nejiri no Jutsu)'],
    };
    for (const [id, [en, es, ja]] of Object.entries(want)) {
      const d = JUTSUS_DATA.find((j) => j.id === id)!;
      assert.deepEqual([d.name, d.nameEs, d.japaneseName], [en, es, ja], id);
      assert.deepEqual([JUTSU[id].name, JUTSU[id].nameEs], [en, es], `${id} on the battle map`);
      assert.equal(jutsuName(id, 'en'), en, `${id} in the battle log`);
      assert.equal(jutsuName(id, 'es'), es, `${id} in the battle log`);
    }
  });

  it('no jutsu text still says the old names', () => {
    for (const j of JUTSUS_DATA) {
      const text = [j.name, j.nameEs, j.japaneseName, j.description, j.descriptionEs, j.enhancementEffect, j.nameEnh, j.nameEnhEs].join(' ');
      assert.ok(!/rasenshuriken|螺旋|mirage|espejismo|magatama|yasaka/i.test(text), j.id);
    }
  });
});

describe('Yasaka no Magatama is out of the game ("quitala del juego")', () => {
  it('no jutsu, battle spec, legend, companion, enemy, clan, class or mission names it', () => {
    assert.ok(!JUTSUS_DATA.some((j) => j.id === GONE));
    assert.ok(!Object.hasOwn(JUTSU, GONE));
    const data = [LEGENDARY_PRESETS, COMPANIONS, MISSIONS, CLANS_DATA, SHINOBI_CLASSES, (['rogue', 'hunter', 'jonin', 'raider'] as const).map((k) => enemyCharacter(k, 1))];
    for (const d of data) assert.ok(!/yasaka|magatama/i.test(JSON.stringify(d)));
  });

  it('only the save rule names its id in the source', () => {
    const src = fileURLToPath(new URL('..', import.meta.url));
    const files = (readdirSync(src, { recursive: true }) as string[]).filter((f) => /\.tsx?$/.test(f) && readFileSync(src + f, 'utf8').includes(GONE));
    assert.deepEqual(files.map((f) => f.replace(/\\/g, '/')).sort(), ['rules/jutsuNature.ts', 'rules/jutsuRemoved.test.ts']);
    assert.deepEqual(REMOVED_JUTSUS[GONE], { rank: 'S', nature: 'Genjutsu' });
  });

  it('Hana, who had it, has the Dragon Tsunami (Water\'s rank S): her nature and class allow it', () => {
    assert.equal(HANA.selectedJutsus.slot5Ultimate, 'water_tide_s');
    assert.equal(natureOf(HANA), 'Water');
  });
});

describe('a sheet saved with Yasaka no Magatama loads without it', () => {
  it('the slot gets the best jutsu its nature, class and clan allow, of the same rank or lower; the rest stays', () => {
    // Hana's copy from before (a medic, Water): the Dragon Tsunami.
    const hana = roundTrip({ ...HANA, selectedJutsus: { ...HANA.selectedJutsus, slot5Ultimate: GONE } });
    assert.deepEqual(migrateCharacter(hana).selectedJutsus, HANA.selectedJutsus);
    // A Fire genjutsu adept: no genjutsu of rank S is left, so Fire's (the Great Annihilation).
    const adept = saved('Genjutsu Adept', 'red', { slot5Ultimate: GONE });
    assert.equal(natureOf(adept), 'Fire');
    assert.deepEqual(migrateCharacter(adept).selectedJutsus, { ...adept.selectedJutsus, slot5Ultimate: 'great_fire_annihilation' });
    // A Light taijutsu master (no element): its class's rank S, Night Guy.
    assert.equal(migrateCharacter(saved('Taijutsu Master', 'white', { slot5Ultimate: GONE })).selectedJutsus.slot5Ultimate, 'night_guy_dragon');
    // A Light genjutsu adept has nothing of rank S to learn: the slot is left empty, as a type change leaves it.
    assert.equal(migrateCharacter(saved('Genjutsu Adept', 'white', { slot5Ultimate: GONE })).selectedJutsus.slot5Ultimate, '');
  });

  it('in an Element slot (an odd sheet): a genjutsu first, the highest rank, never one another slot holds', () => {
    const c = saved('Genjutsu Adept', 'red', { slot2Elemental: GONE, slot3Elemental: 'temple_of_nirvana' });
    const r = refitRemoved(c, natureOf(c));
    assert.deepEqual(r.swaps, [{ slot: 'slot2Elemental', from: GONE, to: 'genjutsu_mirage' }]);
    const free = saved('Genjutsu Adept', 'red', { slot2Elemental: GONE, slot3Elemental: 'fireball_goukakyu' });
    assert.equal(refitRemoved(free, 'Fire').loadout.slot2Elemental, 'temple_of_nirvana');
  });

  it('a sheet without it is not touched, and loading twice changes nothing more', () => {
    for (const c of [DEFAULT_CHARACTER, HANA, ...LEGENDARY_PRESETS.map((p) => p.character)]) assert.deepEqual(refitRemoved(c, natureOf(c)).swaps, [], c.id);
    const once = migrateCharacter(saved('Genjutsu Adept', 'red', { slot5Ultimate: GONE }));
    assert.deepEqual(migrateCharacter(roundTrip(once)), once);
  });

  it('an imported sheet keeps it until loading replaces it (not the starting sheet\'s jutsu)', () => {
    const slots = importedSlots({ ...HANA.selectedJutsus, slot5Ultimate: GONE }, DEFAULT_CHARACTER.selectedJutsus);
    assert.equal(slots.slot5Ultimate, GONE);
  });

  it('the hero, the roster and a mission under way all load without it, and fight without it', () => {
    const hero = saved('Genjutsu Adept', 'red', { slot5Ultimate: GONE });
    const hana = roundTrip({ ...HANA, selectedJutsus: { ...HANA.selectedJutsus, slot5Ultimate: GONE } });
    // A mission saved halfway with both in the party (and in the party as it arrived at the node).
    const run: MissionRun = roundTrip(startRun(RIVER_FOREST_PATROL, hero.id, [migrateCharacter(hero), HANA], { seed: 5, leaderId: hero.id, difficulty: 'normal', noRandomness: false }));
    const old = (m: ShinobiCharacter) => (m.id === hero.id ? { ...m, selectedJutsus: { ...m.selectedJutsus, slot5Ultimate: GONE } } : m.id === HANA.id ? { ...m, selectedJutsus: hana.selectedJutsus } : m);
    run.party.members = run.party.members.map(old);
    run.entry.members = run.entry.members.map(old);
    storage({ 'shinobi5e.hero.v1': hero, 'shinobi5e.roster.v1': [{ character: hero, savedAt: 1 }, { character: hana, savedAt: 1 }], 'shinobi5e.mission.v1': run });
    const sheets = [loadHero()!, ...loadRoster().map((s) => s.character)];
    const loaded = loadRun()!;
    assert.ok(loaded, 'the mission loads');
    sheets.push(...loaded.party.members, ...loaded.entry.members);
    for (const c of sheets) {
      assert.ok(!Object.values(c.selectedJutsus).includes(GONE), c.id);
      assert.ok(!unitFrom(c, { team: 'party', pos: { x: 1, z: 1 } }).jutsus.includes(GONE), c.id);
    }
    assert.equal(loadHero()!.selectedJutsus.slot5Ultimate, 'great_fire_annihilation');
    assert.equal(loaded.party.members.find((m) => m.id === HANA.id)!.selectedJutsus.slot5Ultimate, 'water_tide_s');
  });
});
