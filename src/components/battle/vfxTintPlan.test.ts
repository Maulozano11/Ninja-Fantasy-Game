// Tests for which colour a jutsu's effects take in battle and which sheets that needs (vfxTintPlan.ts): npm test.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { JUTSU } from '../../battle/jutsu';
import type { Unit } from '../../battle/types';
import type { ChakraChoice, SpriteAppearance } from '../../sprite/types';
import { vfxTintIsNatural } from '../../sprite/vfxTint';
import { HEAL_TINT, TINT_BUDGET, cropFrame, evictions, heldFrame, isBigSheet, jutsuTint, preparable, tintBytesOf, tintSheetsOf, unitTint, unitTintSheets, wallElement } from './vfxTintPlan';

/** A unit with a chakra (its burst `color`, its colour `tint`) and these jutsu. */
function ninja(chakra: Partial<ChakraChoice> | undefined, jutsus: string[] = [], where: 'look' | 'character' = 'look'): Pick<Unit, 'look' | 'character' | 'jutsus'> {
  const look = chakra ? ({ chakra: { color: 'red', onCharge: true, onCast: true, onVictory: false, ...chakra } } as SpriteAppearance) : undefined;
  return where === 'look' ? { look, jutsus } : { character: { appearance: look } as Unit['character'], jutsus };
}

const manifest = (group: string): Record<string, unknown> => JSON.parse(readFileSync(new URL(`../../assets/world/${group}/manifest.json`, import.meta.url), 'utf8')).sprites;

describe('jutsu effects in the caster\'s chakra colour', () => {
  it('the elemental jutsu are fire, water, wind, lightning and earth by nature; sword arts, chakra and clan powers are not', () => {
    const elemental = Object.values(JUTSU).filter((j) => j.elemental).map((j) => j.id).sort();
    for (const id of ['fireball_goukakyu', 'dragon_fire_stream', 'dragon_fire_bomb', 'great_fire_annihilation', 'katon_pursuing_flame', 'water_dragon_suiryuudan', 'water_shield_suijinheki', 'earth_wall_doryuheki', 'earth_spear_doryuudan', 'wood_dragon_jutsu', 'wood_golem_titan', 'wind_blade_daitoppa', 'rasenshuriken_wind', 'chidori_lightning_blade', 'lightning_hound_raidon', 'kirin_thunder', 'mystical_palm'])
      assert.ok(elemental.includes(id), `${id} is elemental`);
    for (const id of ['crescent_moon_dance', 'adamantine_sealing_chains', 'temple_of_nirvana', 'yasaka_magatama', 'night_guy_dragon', 'shadow_clone', 'body_flicker', 'hydra_spit', 'hydra_roar', 'mirai_evasion', 'koton_block', 'koton_wall', 'ryusei_warp', 'northstar_command'])
      assert.ok(!elemental.includes(id), `${id} is not elemental`);
    for (const id of elemental) assert.ok(['fire', 'water', 'wind', 'lightning', 'earth'].includes(JUTSU[id].element), id);
  });

  it('an elemental jutsu takes its caster\'s chakra colour; Natural, enemies without one and other jutsu keep his', () => {
    const fire = JUTSU.fireball_goukakyu;
    assert.equal(jutsuTint(fire, ninja({ tint: 'green' })), 'green');
    assert.equal(jutsuTint(fire, ninja({ color: 'blue', tint: '#ff00aa' })), '#ff00aa');
    // The sheet's own copy (a saved character keeps its chakra there).
    assert.equal(jutsuTint(fire, ninja({ tint: 'black' }, [], 'character')), 'black');
    // The burst alone is the chakra's type, not its colour.
    assert.equal(jutsuTint(fire, ninja({ color: 'yellow' })), undefined);
    assert.equal(jutsuTint(fire, ninja(undefined)), undefined);
    assert.equal(jutsuTint(fire, undefined), undefined);
    assert.equal(jutsuTint(JUTSU.temple_of_nirvana, ninja({ tint: 'green' })), undefined);
    assert.equal(jutsuTint(JUTSU.crescent_moon_dance, ninja({ tint: 'green' })), undefined);
    assert.equal(jutsuTint(undefined, ninja({ tint: 'green' })), undefined);
    assert.equal(unitTint(ninja({ tint: 'violet' })), 'violet');
    // "La curacion siempre se vera verde" (the owner): the heals play in the old heal glow's green,
    // whatever the caster's colour, Natural and enemies too.
    assert.equal(HEAL_TINT, '#4ade80');
    for (const id of ['mystical_palm', 'water_healing_dew'])
      for (const caster of [ninja({ tint: 'violet' }), ninja({ tint: 'red' }), ninja({ tint: 'blue' }), ninja({ tint: '#ff00aa' }), ninja({ tint: 'black' }, [], 'character'), ninja(undefined), undefined])
        assert.equal(jutsuTint(JUTSU[id], caster), HEAL_TINT, id);
    for (const spec of Object.values(JUTSU)) if (spec.special === 'heal' && spec.elemental) assert.equal(jutsuTint(spec, ninja({ tint: 'violet' })), HEAL_TINT, spec.id);
    assert.ok(!vfxTintIsNatural('water', HEAL_TINT), 'the green is not water\'s own blue: the sheets are recoloured');
    assert.equal(wallElement('earth'), 'earth');
    assert.equal(wallElement('water'), 'water');
    assert.equal(wallElement('metal'), undefined);
    assert.equal(wallElement('metalBlock'), undefined);
  });

  it('names the sheets each elemental jutsu plays, the beast first, every one of them in the game', () => {
    const names = (id: string) => tintSheetsOf(JUTSU[id]).map((r) => `${r.group}/${r.name}`);
    assert.deepEqual(names('fireball_goukakyu'), ['vfx_fire/fireball', 'vfx_fire/fireball_great', 'vfx_fire/bolt', 'vfx_fire/blast']);
    assert.deepEqual(names('rasenshuriken_wind'), ['vfx_wind/sphere', 'vfx_wind/bolt', 'vfx_wind/blast']);
    assert.deepEqual(names('great_fire_annihilation'), ['vfx_fire/annihilation', 'vfx_fire/annihilation_enh']);
    // The owner's first round of effect answers: his dragon head and wall, the water dragon's head
    // on his stream (no beast), the rock bullets cut apart.
    assert.deepEqual(names('dragon_fire_bomb'), ['vfx_fire/wall', 'vfx_dragon/fire_head', 'vfx_fire/bolt', 'vfx_fire/hit']);
    assert.deepEqual(names('dragon_fire_stream'), ['vfx_dragon/fire_wall_half', 'vfx_dragon/fire_head_half', 'vfx_fire/stream', 'vfx_fire/stream_head', 'vfx_fire/hit']);
    assert.deepEqual(names('water_dragon_suiryuudan'), ['vfx_dragon/water_head', 'vfx_water/stream', 'vfx_water/hit']);
    assert.deepEqual(names('earth_spear_doryuudan'), ['vfx_dc/earth_multi_0', 'vfx_dc/earth_multi_1', 'vfx_dc/earth_multi_2', 'vfx_earth/hit', 'vfx_earth/multi_hit']);
    // The two new effects (answers 4 and 11): his wood dragon and its roots and leaves, the lightning in the hand.
    assert.deepEqual(names('wood_dragon_jutsu'), ['vfx_wood/wood_root', 'vfx_wood/wood_leaves', 'vfx_wood/wood_dragon', 'vfx_earth/multi_hit', 'vfx_earth/hit']);
    assert.ok(!tintSheetsOf(JUTSU.wood_dragon_jutsu).some((r) => r.beast), 'no beast flies');
    assert.deepEqual(names('earth_wall_doryuheki'), ['vfx_earth/wall', 'vfx_earth/wall_diag', 'vfx_earth/wall_depth']);
    assert.deepEqual(names('chidori_lightning_blade'), ['vfx_charged/chidori_hand', 'vfx_lightning/aura', 'vfx_lightning/hit']);
    assert.ok(names('kirin_thunder').slice(0, 2).join() === 'vfx_lightning/kirin,vfx_lightning/kirin_enh');
    assert.deepEqual(names('katon_pursuing_flame'), ['vfx_fire/bolt', 'vfx_fire/hit']);
    // The rank D and C set: the volleys' projectiles cut apart and the joined fan (vfx_dc) take the colour too.
    assert.deepEqual(names('fire_three_embers'), ['vfx_dc/fire_multi_0', 'vfx_dc/fire_multi_1', 'vfx_dc/fire_multi_2', 'vfx_fire/hit']);
    assert.deepEqual(names('earth_pebble_shot'), ['vfx_dc/earth_multi_0', 'vfx_dc/earth_multi_1', 'vfx_dc/earth_multi_2', 'vfx_earth/multi_hit', 'vfx_earth/hit']);
    assert.deepEqual(names('lightning_spark_fan'), ['vfx_dc/lightning_fan', 'vfx_lightning/hit']);
    assert.deepEqual(names('kenjutsu_bleeding_cut'), [], 'the white cut has no element');
    // The gaps' jutsu (the owner's answers of 2026-10-21): the wave, the tower, the gale, the beam's sparks, the dust.
    assert.deepEqual(names('water_devouring_tide'), ['vfx_water/aura', 'vfx_water/aura_back', 'vfx_water/wall_depth', 'vfx_water/wall', 'vfx_water/breath', 'vfx_water/hit', 'vfx_water/blast']);
    assert.deepEqual(names('wind_whirlwind_tower'), ['vfx_wind/hit', 'vfx_wind/wall_depth', 'vfx_wind/multi']);
    assert.deepEqual(names('wind_gale_curtain'), ['vfx_wind/aura', 'vfx_wind/aura_back', 'vfx_wind/wall', 'vfx_wind/bolt']);
    assert.deepEqual(names('lightning_thunder_beam'), ['vfx_lightning/stream', 'vfx_lightning/stream_head', 'vfx_lightning/hit']);
    assert.deepEqual(names('earth_rubble_gust'), ['vfx_earth/aura', 'vfx_earth/aura_back', 'vfx_earth/breath', 'vfx_earth/hit']);
    // The heals in the water aura (the owner: the Dew's aura on the Palm too): the Dew's orb, then the aura.
    assert.deepEqual(names('water_healing_dew'), ['vfx_water/bolt', 'vfx_water/aura', 'vfx_water/aura_back']);
    assert.deepEqual(names('mystical_palm'), ['vfx_water/aura', 'vfx_water/aura_back']);
    for (const id of ['temple_of_nirvana', 'crescent_moon_dance', 'adamantine_sealing_chains', 'hydra_spit']) assert.deepEqual(names(id), [], id);
    for (const spec of Object.values(JUTSU))
      for (const r of tintSheetsOf(spec)) assert.ok(manifest(r.group)[r.name], `${spec.id}: ${r.group}/${r.name} is in the game`);
  });

  it('a unit\'s sheets to recolour: none when Natural or in the sheet\'s own colour, each sheet once', () => {
    const specOf = (id: string) => JUTSU[id];
    assert.deepEqual(unitTintSheets(ninja(undefined, ['fireball_goukakyu']), specOf), []);
    assert.deepEqual(unitTintSheets(ninja({ tint: 'red' }, ['fireball_goukakyu', 'great_fire_annihilation']), specOf), []);
    // Brown is earth's own colour: its walls and its drake stay his, its fire takes it.
    const brown = unitTintSheets(ninja({ tint: 'brown' }, ['earth_wall_doryuheki', 'wood_dragon_jutsu', 'katon_pursuing_flame']), specOf);
    assert.deepEqual(brown.map((s) => `${s.ref.group}/${s.ref.name}`), ['vfx_fire/bolt', 'vfx_fire/hit']);
    // Yellow is the raiju's own colour, not the lightning set's.
    const yellow = unitTintSheets(ninja({ tint: 'yellow' }, ['lightning_hound_raidon']), specOf).map((s) => `${s.ref.group}/${s.ref.name}`);
    assert.deepEqual(yellow, ['vfx_lightning/bolt', 'vfx_lightning/hit']);
    const green = unitTintSheets(ninja({ tint: 'green' }, ['fireball_goukakyu', 'katon_pursuing_flame', 'temple_of_nirvana']), specOf);
    const keys = green.map((s) => `${s.ref.group}/${s.ref.name}`);
    assert.equal(new Set(keys).size, keys.length);
    assert.ok(keys.includes('vfx_fire/fireball') && keys.includes('vfx_fire/hit') && !keys.some((k) => k.startsWith('vfx_genjutsu')));
    assert.ok(green.every((s) => s.color === 'green'));
  });

  it('a unit\'s heals are prepared in green whatever its colour, Natural and blue too, beside its chakra-coloured jutsu', () => {
    const specOf = (id: string) => JUTSU[id];
    const sheets = (u: ReturnType<typeof ninja>) => unitTintSheets(u, specOf).map((s) => `${s.ref.group}/${s.ref.name}:${s.color}`);
    const heals = [`vfx_water/bolt:${HEAL_TINT}`, `vfx_water/aura:${HEAL_TINT}`, `vfx_water/aura_back:${HEAL_TINT}`];
    for (const chakra of [{ tint: 'violet' }, { tint: 'red' }, { tint: 'blue' }, undefined])
      assert.deepEqual(sheets(ninja(chakra, ['mystical_palm', 'water_healing_dew'])), [`vfx_water/aura:${HEAL_TINT}`, `vfx_water/aura_back:${HEAL_TINT}`, `vfx_water/bolt:${HEAL_TINT}`], JSON.stringify(chakra));
    assert.deepEqual(sheets(ninja(undefined, ['water_healing_dew'])), heals);
    // A violet ninja's water bolt plays in violet, its Dew's orb in green: the same sheet in both.
    // (The Geyser flies the bolt; the Water Dragon Bullet plays his dragon head on the stream now.)
    const violet = sheets(ninja({ tint: 'violet' }, ['water_healing_dew', 'water_geyser']));
    assert.deepEqual(violet, [...heals, 'vfx_water/blast:violet', 'vfx_water/bolt:violet']);
  });

  it('cuts a frame down to its pixels, exactly', () => {
    const w = 5;
    const h = 4;
    const px = new Uint8ClampedArray(w * h * 4);
    assert.equal(cropFrame(px, w, h), null);
    const put = (x: number, y: number, v: number) => px.set([v, v + 1, v + 2, v + 3], (y * w + x) * 4);
    put(1, 1, 10);
    put(3, 2, 20);
    const c = cropFrame(px, w, h)!;
    assert.deepEqual([c.x, c.y, c.w, c.h], [1, 1, 3, 2]);
    assert.deepEqual([...c.rgba.subarray(0, 4)], [10, 11, 12, 13]);
    assert.deepEqual([...c.rgba.subarray((1 * 3 + 2) * 4, (1 * 3 + 2) * 4 + 4)], [20, 21, 22, 23]);
    assert.equal(c.rgba.filter((_, i) => i % 4 === 3 && c.rgba[i] !== 0).length, 2);
  });
});

describe('keeping the recoloured frames', () => {
  it('holds the nearest earlier ready frame while one is made, and draws nothing before the first', () => {
    const ready = new Map<number, string | null>([[0, 'f0'], [1, null], [3, 'f3']]);
    const have = (c: number) => ready.get(c);
    assert.equal(heldFrame(have, 2), 'f0');
    assert.equal(heldFrame(have, 5), 'f3');
    assert.equal(heldFrame(have, 0), null);
    assert.equal(heldFrame(() => undefined, 4), null);
  });

  it('the big signatures are big; the bolts, blasts, walls and beasts are not', () => {
    assert.ok(isBigSheet(1016, 968) && isBigSheet(596, 651) && isBigSheet(800, 544));
    assert.ok(!isBigSheet(306, 284) && !isBigSheet(339, 161) && !isBigSheet(284, 167) && !isBigSheet(75, 73));
  });

  it('lets go of the longest unused sheets past the budget, never one playing', () => {
    const s = [
      { bytes: 50, lastUse: 1000 },
      { bytes: 80, lastUse: 500 },
      { bytes: 40, lastUse: 9000 },
      { bytes: 30, lastUse: 200 },
    ];
    assert.deepEqual(evictions(s, 300, 10000), []);
    // 200 kept at most: the oldest (3, then 1) go; 2 is playing.
    assert.deepEqual(evictions(s, 100, 10000), [3, 1]);
    // Everything idle but the playing one still too big: all the idle ones go, the playing one stays.
    assert.deepEqual(evictions(s, 10, 10000), [3, 1, 0]);
    assert.deepEqual(evictions(s, 10, 1100, 3000), []);
  });

  it('prepares the small sheets first, as many as fit', () => {
    const list = [{ n: 'big', bytes: 95 }, { n: 'bolt', bytes: 1 }, { n: 'mid', bytes: 40 }, { n: 'hit', bytes: 2 }];
    assert.deepEqual(preparable(list, 50).map((x) => x.n), ['bolt', 'hit', 'mid']);
    assert.deepEqual(preparable(list, 1000).map((x) => x.n), ['bolt', 'hit', 'mid', 'big']);
    assert.ok(tintBytesOf(34, 1016, 968) > 90e6 && tintBytesOf(34, 1016, 968) < TINT_BUDGET);
  });
});
