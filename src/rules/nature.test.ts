// Tests for the chakra type as the ninja's elemental nature: npm test. The owner (2026-10-21): the
// nature is the chakra type the player picks; the colour never changes it (docs/GAMEPLAY_DESIGN.md,
// "Chakra type").

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER, JUTSUS_DATA, LEGENDARY_PRESETS } from '../data/shinobiData';
import { HANA, KENJI } from '../data/missions';
import { loadHero, loadRoster } from '../game/saves';
import { CHAKRA_COLORS } from '../sprite/chakra';
import { chakraChoice, chakraHex } from '../sprite/chakraInfo';
import { BURST_NATURE, CHAKRA_TYPES, chakraNature, chakraType, withNature } from '../sprite/chakraNature';
import type { ChakraChoice, ChakraColorId } from '../sprite/types';
import type { ChakraNature, ShinobiCharacter } from '../types/shinobi';
import { migrateCharacter, natureOf } from './ninja';

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
      preset_gentle: ['Water', '#36a0f0'],
      preset_night: ['Lightning', '#36a0f0'], // was the blue Rising Tide
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
