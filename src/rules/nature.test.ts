// Tests for the chakra type as the ninja's elemental nature: npm test. The owner (2026-10-21): the
// nature is the chakra type the player picks; the colour never changes it (docs/GAMEPLAY_DESIGN.md,
// "Chakra type").

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER, JUTSUS_DATA, LEGENDARY_PRESETS } from '../data/shinobiData';
import { COMPANIONS, HANA, KENJI, RIVER_FOREST_PATROL } from '../data/missions';
import { loadRun, saveRun, startRun } from '../game/missionRun';
import { loadHero, loadRoster } from '../game/saves';
import { CHAKRA_COLORS } from '../sprite/chakra';
import { chakraChoice, chakraHex } from '../sprite/chakraInfo';
import { appearanceFromLegacy } from '../sprite/legacy';
import { BURST_NATURE, CHAKRA_TYPES, chakraNature, chakraType, OFFERED_TYPES, withNature } from '../sprite/chakraNature';
import { randomAppearance } from '../sprite/random';
import type { ChakraChoice, ChakraColorId } from '../sprite/types';
import type { ChakraNature, ShinobiCharacter } from '../types/shinobi';
import { fitLoadout } from './jutsuNature';
import { LEGEND_BURST_CHANGE, migrateCharacter, natureOf } from './ninja';

/** What each burst a save can hold stands for (the ids are the colours the bursts were first picked by). */
const OLD_COLOURS: Record<string, ChakraNature> = {
  red: 'Fire',
  orange: 'Fire',
  yellow: 'Lightning',
  green: 'Wind',
  blue: 'Water',
  indigo: 'Shadow',
  violet: 'Spirit',
  white: 'Light',
  black: 'Void',
};
const ELEMENTS: ChakraNature[] = ['Fire', 'Water', 'Wind', 'Lightning', 'Earth'];
const TINTS = [undefined, ...CHAKRA_COLORS.map((c) => c.id), '#00ff00', '#000000', '#ffffff', '#123456'];

const chakra = (color: string, tint?: string): ChakraChoice => ({ color: color as ChakraColorId, ...(tint ? { tint } : {}), onCharge: true, onCast: true, onVictory: false });
/** A ninja saved before the chakra type was the nature: today's sheet with an old look's chakra. */
const saved = (c: ChakraChoice): ShinobiCharacter => JSON.parse(JSON.stringify({ ...DEFAULT_CHARACTER, id: 'old', appearance: { ...DEFAULT_CHARACTER.appearance!, chakra: c } }));

/** A localStorage for node, holding the saves given. */
function storage(items: Record<string, unknown>): void {
  const m = new Map(Object.entries(items).map(([k, v]) => [k, JSON.stringify(v)]));
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => m.set(k, v) };
}

describe('chakra types', () => {
  it('every burst is of exactly one type, and the five elements are types', () => {
    for (const c of CHAKRA_COLORS) {
      const owners = CHAKRA_TYPES.filter((t) => t.bursts.includes(c.id));
      assert.equal(owners.length, 1, c.id);
      assert.equal(owners[0].nature, BURST_NATURE[c.id], c.id);
    }
    for (const t of CHAKRA_TYPES) {
      assert.ok(t.bursts.length > 0, t.nature);
      for (const b of t.bursts) assert.equal(chakraNature(chakra(b)), t.nature, b);
    }
    for (const e of ELEMENTS) assert.ok(chakraType(e).elemental && chakraType(e).nature === e, e);
    assert.deepEqual(new Set(CHAKRA_TYPES.map((t) => t.nature)).size, CHAKRA_TYPES.length, 'no type twice');
  });

  it('the bursts stand for what they show: fire is Fire, the electric one is Lightning', () => {
    for (const [id, nature] of Object.entries(OLD_COLOURS)) assert.equal(chakraNature(chakra(id)), nature, id);
    assert.equal(chakraNature(chakra('brown')), 'Earth', 'the Earth burst (new: no old save has it)');
    assert.equal(chakraNature(chakra('cyan')), 'Lightning', 'the second Lightning burst (new: no old save has it)');
  });

  it('the colour never changes the nature: green fire is Fire, black lightning is Lightning', () => {
    for (const c of CHAKRA_COLORS) for (const tint of TINTS) assert.equal(chakraNature(chakra(c.id, tint)), BURST_NATURE[c.id], `${c.id} in ${tint}`);
    assert.equal(chakraNature(chakra('red', 'green')), 'Fire');
    assert.equal(chakraNature(chakra('yellow', 'black')), 'Lightning');
    assert.equal(chakraNature(chakra('yellow', '#000000')), 'Lightning');
  });

  it('picking a type sets the burst and keeps the colour; picking the colour keeps the type', () => {
    const green = chakra('blue', 'green');
    const fire = withNature(green, 'Fire');
    assert.deepEqual(fire, { ...green, color: 'red' });
    assert.equal(chakraNature(fire), 'Fire');
    assert.equal(chakraHex(fire), chakraHex(green), 'the colour stays');
    // A type with two bursts keeps the one already chosen.
    assert.equal(withNature(chakra('orange'), 'Fire').color, 'orange');
    for (const t of CHAKRA_TYPES) assert.equal(chakraNature(withNature(chakra('white', '#123456'), t.nature)), t.nature, t.nature);
  });

  it('a burst the game does not know reads as Water, as it is drawn, and the creator describes it so', () => {
    assert.equal(chakraNature(chakra('teal')), 'Water');
    const info = chakraChoice('teal');
    assert.equal(info.id, 'blue', 'described as the water burst, not the first one');
    assert.equal(info.nature, chakraNature(chakra('teal')));
    for (const c of CHAKRA_COLORS) assert.equal(chakraChoice(c.id).id, c.id);
  });
});

describe('the nature of a saved ninja', () => {
  it('an old save with each colour loads with the nature of its burst, its look untouched', () => {
    for (const [id, nature] of Object.entries(OLD_COLOURS))
      for (const tint of TINTS) {
        const old = saved(chakra(id, tint));
        storage({ 'shinobi5e.hero.v1': old, 'shinobi5e.roster.v1': [{ character: old, savedAt: 1 }] });
        const hero = loadHero()!;
        assert.equal(natureOf(hero), nature, `${id} in ${tint}`);
        assert.deepEqual(hero.appearance!.chakra, old.appearance!.chakra, `${id} in ${tint}: the look stays`);
        assert.equal(natureOf(loadRoster()[0].character), nature, `${id} in ${tint} (roster)`);
        assert.equal(natureOf(migrateCharacter(old)), nature);
      }
  });

  it('a sheet older than the sprite look reads its aura colour as the burst it always had', () => {
    const legacy = (hex: string): ShinobiCharacter => {
      const { appearance: _a, ...rest } = DEFAULT_CHARACTER;
      return migrateCharacter({ ...rest, palette: { ...rest.palette, chakraAuraColor: hex } });
    };
    // The clans' old aura colours and a few more.
    assert.equal(natureOf(legacy('#ef4444')), 'Fire');
    assert.equal(natureOf(legacy('#f97316')), 'Fire');
    assert.equal(natureOf(legacy('#facc15')), 'Lightning');
    assert.equal(natureOf(legacy('#10b981')), 'Wind');
    assert.equal(natureOf(legacy('#06b6d4')), 'Water');
    assert.equal(natureOf(legacy('#4338ca')), 'Shadow');
    assert.equal(natureOf(legacy('#a855f7')), 'Spirit');
    assert.equal(natureOf(legacy('#ffffff')), 'Light');
    assert.equal(natureOf(legacy('#111111')), 'Void');
  });
});

describe('the legends', () => {
  /** The element most of a sheet's elemental jutsu are of (slots 2, 3 and 5). */
  const loadoutNature = (c: ShinobiCharacter): string => {
    const count = new Map<string, number>();
    for (const id of [c.selectedJutsus.slot2Elemental, c.selectedJutsus.slot3Elemental, c.selectedJutsus.slot5Ultimate]) {
      const n = JUTSUS_DATA.find((j) => j.id === id)?.nature;
      if (n && (ELEMENTS as string[]).includes(n)) count.set(n, (count.get(n) ?? 0) + 1);
    }
    return [...count].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  };

  it('each legend\'s chakra type is the element of its jutsu, in the colour it always had', () => {
    const want: Record<string, [ChakraNature, string]> = {
      preset_founder: ['Fire', '#e8321e'],
      preset_ember: ['Fire', '#f27c18'],
      preset_reference_aiden: ['Fire', '#e8321e'],
      preset_storm: ['Lightning', '#a54ce0'], // was the violet Spectral Guardian
      preset_sunburst: ['Wind', '#f27c18'], // was the orange Cinder Nova
      preset_warlord: ['Fire', '#a54ce0'], // was the violet Spectral Guardian
      preset_night: ['Lightning', '#36a0f0'], // was the blue Rising Tide
      preset_lyra: ['Wind', '#40cccb'], // a heroine: wind in the cyan of her blade
    };
    assert.deepEqual(LEGENDARY_PRESETS.map((p) => p.character.id).sort(), Object.keys(want).sort());
    for (const { character: c } of LEGENDARY_PRESETS) {
      assert.equal(natureOf(c), want[c.id][0], c.id);
      assert.equal(natureOf(c), loadoutNature(c), `${c.id}: its jutsu`);
      assert.equal(chakraHex(c.appearance!.chakra), want[c.id][1], `${c.id}: its colour`);
    }
    // Hana, the water medic (was the green Leafwind Spiral), keeps her green.
    assert.equal(natureOf(HANA), 'Water');
    assert.equal(chakraHex(HANA.appearance!.chakra), '#3dbc48');
    // Kenji, earth and wood (was the violet Spectral Guardian), keeps his violet.
    assert.equal(natureOf(KENJI), 'Earth');
    assert.equal(natureOf(KENJI), loadoutNature(KENJI));
    assert.equal(chakraHex(KENJI.appearance!.chakra), '#a54ce0');
  });
});

describe('the owner\'s answers on the chakra types (2026-10-21)', () => {
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
    return JSON.parse(JSON.stringify({ ...c, appearance: { ...c.appearance!, chakra: { ...c.appearance!.chakra, color: LEGEND_BURST_CHANGE[id].old, tint } } }));
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
    assert.deepEqual(Object.keys(LEGEND_BURST_CHANGE).sort(), Object.keys(NEW).sort());
    for (const [id, [nature, burst]] of Object.entries(NEW)) {
      assert.equal(legend(id).appearance!.chakra.color, burst, `${id} today`);
      assert.equal(LEGEND_BURST_CHANGE[id].now, burst, `${id}: the table says the burst the legend has today`);
      assert.equal(natureOf(legend(id)), nature);
      assert.notEqual(LEGEND_BURST_CHANGE[id].old, burst);
    }
  });

  it('hero and roster: the copy gets the legend\'s burst of today, keeps its colour, and nothing else changes', () => {
    for (const id of Object.keys(NEW)) {
      for (const tint of [undefined, '#123456', 'green']) {
        const old = savedOld(id, tint);
        const was = chakraHex(old.appearance!.chakra);
        storage({ 'shinobi5e.hero.v1': old, 'shinobi5e.roster.v1': [{ character: old, savedAt: 1 }] });
        // (a saved sheet loads as a ninja that has been made: its type is fixed, rules/progression.ts)
        const want = { ...withChakra(old, NEW[id][1], tint ?? LEGEND_BURST_CHANGE[id].old), created: true };
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
    const old = (c: ShinobiCharacter) => withChakra(c, LEGEND_BURST_CHANGE[c.id].old, undefined);
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
    assert.deepEqual(r.party.members[0], kaien, 'Kaien as he set out, only his burst back to today\'s');
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
    assert.deepEqual(loadHero(), { ...ownSpirit, created: true });
    assert.equal(natureOf(loadHero()!), 'Spirit');
    // The legends whose burst did not change are not touched either.
    for (const id of ['preset_founder', 'preset_ember', 'preset_reference_aiden']) {
      const c = withChakra(legend(id), 'violet', undefined);
      assert.deepEqual(migrateCharacter(c), c, id);
    }
  });

  it('the old type picked again in today\'s creator stays the player\'s, on every load (Ren as Water, Hiro with Cinder Nova)', () => {
    /** What the creator saves when the player turns a legend to a type: its burst, the colour, and the jutsu fitted to it (updateLook). */
    const picked = (id: string, nature: ChakraNature, tint: string | undefined, burst?: ChakraColorId): ShinobiCharacter => {
      const c = legend(id);
      const chakra = { ...withNature(c.appearance!.chakra, nature), tint };
      return JSON.parse(
        JSON.stringify({
          ...c,
          appearance: { ...c.appearance!, chakra: burst ? { ...chakra, color: burst } : chakra },
          selectedJutsus: fitLoadout(c.selectedJutsus, nature, c.clan).loadout,
        }),
      );
    };
    const cases: [string, ShinobiCharacter][] = [];
    // the colour the preset passes on, "Natural", and a colour of the player's own
    for (const tint of ['blue', undefined, '#123456']) cases.push([`Ren as Water in ${tint}`, picked('preset_night', 'Water', tint)]);
    for (const tint of ['orange', undefined, 'green']) cases.push([`Hiro with Cinder Nova in ${tint}`, picked('preset_sunburst', 'Fire', tint, 'orange')]);
    for (const tint of ['green', undefined]) cases.push([`Hana as Wind in ${tint}`, picked('companion_hana', 'Wind', tint)]);
    for (const [what, c] of cases) {
      assert.equal(c.appearance!.chakra.color, LEGEND_BURST_CHANGE[c.id].old, `${what}: the legend's old burst`);
      storage({ 'shinobi5e.hero.v1': c, 'shinobi5e.roster.v1': [{ character: c, savedAt: 1 }] });
      const made = { ...c, created: true };
      assert.deepEqual(loadHero(), made, `${what} (hero)`);
      assert.deepEqual(loadRoster()[0].character, made, `${what} (roster)`);
      storage({ 'shinobi5e.hero.v1': loadHero() });
      assert.deepEqual(loadHero(), made, `${what}: saved and loaded again`);
    }
    assert.equal(natureOf(loadHero()!), 'Wind');
    assert.equal(natureOf(migrateCharacter(picked('preset_night', 'Water', 'blue'))), 'Water');
  });

  it('a copy older than the sprite look (no look saved: its burst comes from its aura colour) moves too', () => {
    const kaien = legend('preset_storm');
    const old: ShinobiCharacter = JSON.parse(JSON.stringify({ ...kaien, appearance: undefined, palette: { ...kaien.palette, chakraAuraColor: '#a855f7' } }));
    const drawn = appearanceFromLegacy(old);
    assert.equal(drawn.chakra.color, 'violet');
    assert.equal(natureOf(old), 'Spirit', 'it was drawn with the ghost warrior');
    const now = migrateCharacter(old);
    // the look it was drawn with, now saved, with only the burst changed
    assert.deepEqual(now, { ...old, appearance: { ...drawn, chakra: { ...drawn.chakra, color: 'yellow', tint: drawn.chakra.tint ?? 'violet' } } });
    assert.equal(natureOf(now), 'Lightning');
    assert.equal(chakraHex(now.appearance!.chakra), chakraHex(drawn.chakra), 'the colour it showed');
    assert.deepEqual(migrateCharacter(now), now, 'once');
  });
});
