import sys
p = sys.argv[1]
s = open(p).read()


def rep(a, b):
    global s
    assert s.count(a) == 1, a[:90]
    s = s.replace(a, b)


rep("""import { DEFAULT_CHARACTER, JUTSUS_DATA, LEGENDARY_PRESETS } from '../data/shinobiData';
import { HANA, KENJI } from '../data/missions';
import { loadHero, loadRoster } from '../game/saves';
import { CHAKRA_COLORS } from '../sprite/chakra';
import { chakraChoice, chakraHex } from '../sprite/chakraInfo';
import { BURST_NATURE, CHAKRA_TYPES, chakraNature, chakraType, withNature } from '../sprite/chakraNature';
import type { ChakraChoice, ChakraColorId } from '../sprite/types';
import type { ChakraNature, ShinobiCharacter } from '../types/shinobi';
import { migrateCharacter, natureOf } from './ninja';
""", """import { DEFAULT_CHARACTER, JUTSUS_DATA, LEGENDARY_PRESETS } from '../data/shinobiData';
import { COMPANIONS, HANA, KENJI, RIVER_FOREST_PATROL } from '../data/missions';
import { loadRun, saveRun, startRun } from '../game/missionRun';
import { loadHero, loadRoster } from '../game/saves';
import { CHAKRA_COLORS } from '../sprite/chakra';
import { chakraChoice, chakraHex } from '../sprite/chakraInfo';
import { BURST_NATURE, CHAKRA_TYPES, chakraNature, chakraType, OFFERED_TYPES, withNature } from '../sprite/chakraNature';
import { randomAppearance } from '../sprite/random';
import type { ChakraChoice, ChakraColorId } from '../sprite/types';
import type { ChakraNature, ShinobiCharacter } from '../types/shinobi';
import { LEGEND_OLD_BURST, migrateCharacter, natureOf } from './ninja';
""")

s = s.rstrip('\n') + """

describe('the owner\\'s answers on the chakra types (2026-10-21)', () => {
  it('Shadow and Spirit are pending: not offered, not picked at random; Light and Void stay', () => {
    assert.deepEqual(
      OFFERED_TYPES.map((t) => t.nature),
      ['Fire', 'Water', 'Wind', 'Lightning', 'Earth', 'Light', 'Void'],
    );
    assert.deepEqual(
      CHAKRA_TYPES.filter((t) => t.pending).map((t) => t.nature),
      ['Shadow', 'Spirit'],
    );
    for (let i = 0; i < 400; i++) {
      const n = chakraNature(randomAppearance().chakra);
      assert.ok(n !== 'Shadow' && n !== 'Spirit', `random ninja ${i}: ${n}`);
    }
  });

  it('a ninja that already has Shadow or Spirit still loads, draws and reads it, and can pick another type', () => {
    for (const [burst, nature] of [['indigo', 'Shadow'], ['violet', 'Spirit']] as const) {
      const old = saved(chakra(burst, '#123456'));
      storage({ 'shinobi5e.hero.v1': old, 'shinobi5e.roster.v1': [{ character: old, savedAt: 1 }] });
      assert.deepEqual(loadHero()!.appearance!.chakra, old.appearance!.chakra);
      assert.equal(natureOf(loadHero()!), nature);
      assert.equal(natureOf(loadRoster()[0].character), nature);
      assert.equal(chakraChoice(burst).id, burst, 'its burst is still described (and drawn) as its own');
      assert.equal(chakraNature(withNature(old.appearance!.chakra, 'Light')), 'Light');
    }
  });
});

describe('saved copies of the legends move to their new type (the owner, 2026-10-21: "actualiza")', () => {
  /** The legend or companion of today, by id. */
  const legend = (id: string): ShinobiCharacter => COMPANIONS.find((c) => c.id === id)!;
  /** A copy saved before the change: today's sheet with the burst it had then (and no colour of its own, as the presets had). */
  const savedOld = (id: string, tint?: string): ShinobiCharacter => {
    const c = legend(id);
    return JSON.parse(JSON.stringify({ ...c, appearance: { ...c.appearance!, chakra: { ...c.appearance!.chakra, color: LEGEND_OLD_BURST[id], tint } } }));
  };
  /** The sheet with only the chakra burst and colour replaced. */
  const withChakra = (c: ShinobiCharacter, color: ChakraColorId, tint: string | undefined): ShinobiCharacter => ({
    ...c,
    appearance: { ...c.appearance!, chakra: { ...c.appearance!.chakra, color, tint } },
  });
  const NEW: Record<string, [ChakraNature, ChakraColorId]> = {
    preset_storm: ['Lightning', 'yellow'], // Kaien
    preset_night: ['Lightning', 'yellow'], // Ren
    preset_sunburst: ['Wind', 'green'], // Hiro
    preset_warlord: ['Fire', 'red'], // Raiga
    companion_hana: ['Water', 'blue'], // Hana
    companion_kenji: ['Earth', 'brown'], // Kenji
  };

  it('the six whose burst changed, and only they', () => {
    assert.deepEqual(Object.keys(LEGEND_OLD_BURST).sort(), Object.keys(NEW).sort());
    for (const [id, [nature, burst]] of Object.entries(NEW)) {
      assert.equal(legend(id).appearance!.chakra.color, burst, `${id} today`);
      assert.equal(natureOf(legend(id)), nature);
      assert.notEqual(LEGEND_OLD_BURST[id], burst);
    }
  });

  it('hero and roster: the copy gets the legend\\'s burst of today, keeps its colour, and nothing else changes', () => {
    for (const id of Object.keys(NEW)) {
      for (const tint of [undefined, '#123456', 'green']) {
        const old = savedOld(id, tint);
        const was = chakraHex(old.appearance!.chakra);
        storage({ 'shinobi5e.hero.v1': old, 'shinobi5e.roster.v1': [{ character: old, savedAt: 1 }] });
        const want = withChakra(old, NEW[id][1], tint ?? LEGEND_OLD_BURST[id]);
        for (const [where, now] of [['hero', loadHero()!], ['roster', loadRoster()[0].character]] as const) {
          assert.deepEqual(now, want, `${id} in ${tint} (${where})`);
          assert.equal(natureOf(now), NEW[id][0], `${id} (${where}): its new type`);
          assert.equal(chakraHex(now.appearance!.chakra), was, `${id} in ${tint} (${where}): the colour it showed`);
        }
        // Once: loading it again changes nothing.
        assert.deepEqual(migrateCharacter(migrateCharacter(old)), migrateCharacter(old));
      }
      // A copy saved without its colour of its own looks exactly like the legend today.
      assert.deepEqual(migrateCharacter(savedOld(id)).appearance!.chakra, legend(id).appearance!.chakra, `${id}: as the legend is now`);
      // The legend of today loads as it is.
      assert.equal(migrateCharacter(legend(id)), legend(id));
    }
  });

  it('a mission under way: the legends and companions in it (alive, fallen, and as they set out) move too', () => {
    const run = startRun(RIVER_FOREST_PATROL, 'preset_storm', [legend('preset_storm'), HANA, KENJI], { seed: 3, leaderId: 'preset_storm', difficulty: 'normal', noRandomness: false });
    const old = (c: ShinobiCharacter) => withChakra(c, LEGEND_OLD_BURST[c.id], undefined);
    const [kaien, hana, kenji] = run.party.members;
    storage({});
    saveRun({
      ...run,
      party: { ...run.party, members: [old(kaien), old(hana)], dead: [old(kenji)] },
      entry: { ...run.entry, members: [old(kaien), old(hana), old(kenji)], dead: [] },
    });
    const r = loadRun()!;
    const all = [...r.party.members, ...r.party.dead, ...r.entry.members];
    assert.deepEqual(all.map((c) => c.id), ['preset_storm', 'companion_hana', 'companion_kenji', 'preset_storm', 'companion_hana', 'companion_kenji']);
    for (const c of all) {
      assert.equal(c.appearance!.chakra.color, NEW[c.id][1], c.id);
      assert.equal(natureOf(c), NEW[c.id][0], c.id);
      assert.equal(chakraHex(c.appearance!.chakra), chakraHex(legend(c.id).appearance!.chakra), `${c.id}: its colour`);
    }
    assert.deepEqual(r.party.members[0], kaien, 'Kaien as he set out, only his burst back to today\\'s');
  });

  it('a copy whose player picked another burst, and any ninja that is not a legend, are left alone', () => {
    // Kaien made Fire by the player, Ren made Wind: their own choice.
    for (const [id, burst] of [['preset_storm', 'red'], ['preset_night', 'green'], ['companion_hana', 'yellow']] as const) {
      const c = withChakra(legend(id), burst, undefined);
      assert.deepEqual(migrateCharacter(c), c, id);
    }
    // Not a legend: an own ninja with the ghost warrior keeps it (and reads Spirit).
    for (const b of ['violet', 'blue', 'orange', 'green'] as const) {
      const own = saved(chakra(b));
      assert.deepEqual(migrateCharacter(own), own, b);
    }
    const ownSpirit = { ...saved(chakra('violet')), id: 'ninja_abc' };
    storage({ 'shinobi5e.hero.v1': ownSpirit });
    assert.deepEqual(loadHero(), ownSpirit);
    assert.equal(natureOf(loadHero()!), 'Spirit');
    // The legends whose burst did not change are not touched either.
    for (const id of ['preset_founder', 'preset_ember', 'preset_reference_aiden', 'preset_gentle']) {
      const c = withChakra(legend(id), 'violet', undefined);
      assert.deepEqual(migrateCharacter(c), c, id);
    }
  });
});
"""
open(p, 'w').write(s)
print('ok')
