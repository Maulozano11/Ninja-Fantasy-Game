// The owner's first round of jutsu effect answers (2026-10-21; docs/GAMEPLAY_DESIGN.md, "Jutsu
// effects, round 1"): the screen's staging data, and the one rule it brings (the Leaf Hurricane
// is struck with the weapon put away). npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { applyAction, createBattle } from './engine';
import { JUTSU } from './jutsu';
import { mustStow } from './engine';
import type { Unit } from './types';

const mustStowJutsu = (u: Unit, id: string) => mustStow(u, JUTSU[id]);

describe('jutsu effects, round 1', () => {
  it('stages the eight answered jutsu their own way, data for the screen only', () => {
    const stage = (id: string) => JUTSU[id].seq?.stage;
    assert.equal(stage('dragon_fire_bomb'), 'dragonHead');
    assert.equal(stage('dragon_fire_stream'), 'dragonStream');
    assert.equal(stage('adamantine_sealing_chains'), 'sealChain');
    assert.equal(stage('water_dragon_suiryuudan'), 'waterDragon');
    assert.equal(stage('earth_spear_doryuudan'), 'rockVolleys');
    assert.equal(stage('crescent_moon_dance'), 'crescents');
    assert.equal(stage('temple_of_nirvana'), 'crowDive');
    assert.equal(stage('leaf_hurricane_senpuu'), 'hurricane');
    // Pending (3, 6) or waiting for new art (4, 11): as they were.
    for (const id of ['night_guy_dragon', 'taki_sixtyfour_palms', 'wood_dragon_jutsu', 'chidori_lightning_blade']) assert.equal(stage(id), undefined, id);
  });

  it('flies no elemental beast in an attack (the owner: the beasts will be summons)', () => {
    assert.notEqual(JUTSU.water_dragon_suiryuudan.vfx, 'beast');
  });

  it('keeps every rule of the staged jutsu but the hurricane\'s stowed weapon', () => {
    const s = (id: string) => {
      const j = JUTSU[id];
      return [j.shape, j.range, j.dice, j.dmgType, j.save, j.melee, j.effect, j.special];
    };
    assert.deepEqual(s('dragon_fire_bomb'), ['cone', 10.5, '5d8', 'Fire', 'dex', false, 'burning', undefined]);
    assert.deepEqual(s('earth_spear_doryuudan').slice(0, 2), ['line', 9]);
    assert.equal(JUTSU.earth_spear_doryuudan.width, 1.2);
    assert.equal(JUTSU.leaf_hurricane_senpuu.shape, 'selfCircle');
    assert.equal(JUTSU.leaf_hurricane_senpuu.melee, true);
    assert.equal(JUTSU.leaf_hurricane_senpuu.weapon, 'stow');
    assert.equal(JUTSU.crescent_moon_dance.weapon, 'draw');
  });

  it('puts the weapon away for the Leaf Hurricane, free, before the combo', () => {
    const b = createBattle({
      seed: 3,
      mapId: 'river_forest',
      time: 'day',
      weather: 'Clear',
      difficulty: 'normal',
      party: [{ character: { ...DEFAULT_CHARACTER, id: 'a', name: 'Aki', effects: [] }, pos: { x: 8, z: 10 } }],
      enemies: [{ kind: 'rogue', pos: { x: 9.2, z: 10 } }],
      stealth: false,
      supplies: { soldierPills: 0, bandages: 0, antidotes: 0, explosiveTags: 0 },
    });
    const s = structuredClone(b.state);
    s.turn = s.order.indexOf('a');
    const u = s.units.a;
    u.turn = { move: u.speed, action: true, bonus: true, reaction: true, moved: 0 };
    u.jutsus = [...u.jutsus, 'leaf_hurricane_senpuu'];
    u.chakra = 20;
    assert.ok(u.weapon.held, 'the default ninja holds a weapon');
    u.armed = true;
    assert.ok(mustStowJutsu(u, 'leaf_hurricane_senpuu'));
    const out = applyAction(s, { type: 'jutsu', unit: 'a', jutsu: 'leaf_hurricane_senpuu', at: { ...u.pos } });
    assert.ok(out.ok, out.reason);
    const w = out.events.findIndex((e) => e.t === 'weapon');
    const j = out.events.findIndex((e) => e.t === 'jutsu');
    assert.ok(w >= 0 && w < j, 'the weapon is stowed first');
    assert.equal(out.state.units.a.armed, false);
  });
});
