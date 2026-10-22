// The Y axis (the owner, 2026-10-22: "sobre el eje y hazme una prueba"): the battle ground is a 2D
// plane, x across the screen and z into its depth (up the screen). These tests pin that walking,
// reach, areas, cover and the AI work up and down the screen just as they do across it.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { HANA, KENJI } from '../data/missions';
import type { ShinobiCharacter } from '../types/shinobi';
import type { BattleState, Pt } from './types';
import { applyAction, createBattle } from './engine';
import type { BattleSetup } from './engine';
import { CELL, cellOf, coverBetween, getMap, gridFor, idx, toScreen } from './map';
import { reachable } from './nav';
import { areaOf, inArea, JUTSU } from './jutsu';
import { aiAction } from './ai';
import { current } from './turns';
import { ENCOUNTERS, encounterSetup } from './encounters';
import './maps';

const hero = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...over });
const SUPPLIES = { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 };

/** One ninja in the open middle of the clearing, the rogues far off unless a test places them. */
function setup(over: Partial<BattleSetup> = {}): BattleSetup {
  return {
    seed: 7,
    mapId: 'river_forest',
    time: 'day',
    weather: 'Clear',
    difficulty: 'normal',
    party: [{ character: hero({ id: 'a', name: 'Aki' }), pos: { x: 12.25, z: 11.25 } }],
    enemies: [{ kind: 'rogue', pos: { x: 50, z: 6 } }],
    stealth: false,
    supplies: { ...SUPPLIES },
    ...over,
  };
}

function turnOf(s: BattleState, id: string): BattleState {
  const t = structuredClone(s);
  t.turn = t.order.indexOf(id);
  const u = t.units[id];
  u.turn = { move: u.speed, action: true, bonus: true, reaction: true, moved: 0 };
  return t;
}

const ok = (out: ReturnType<typeof applyAction>) => {
  assert.ok(out.ok, `expected ok, got: ${out.reason}`);
  return out;
};

const saved = (s: BattleState, a: Parameters<typeof applyAction>[1]) =>
  ok(applyAction(s, a)).events.flatMap((e) => (e.t === 'save' ? [e.unit] : []));

describe('the Y axis: moving up and down the screen', () => {
  it('a ninja walks straight into the depth and back toward the camera, paying meters as it does across', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    const start = s.units.a.turn.move;
    // 6 m up the screen (z falls: away from the camera).
    const up = ok(applyAction(s, { type: 'move', unit: 'a', to: cellOf({ x: 12.25, z: 5.25 }) }));
    assert.deepEqual(up.state.units.a.pos, { x: 12.25, z: 5.25 });
    assert.equal(up.state.units.a.turn.move, start - 6);
    // 3 m back down the screen (toward the camera).
    const down = ok(applyAction(up.state, { type: 'move', unit: 'a', to: cellOf({ x: 12.25, z: 8.25 }) }));
    assert.deepEqual(down.state.units.a.pos, { x: 12.25, z: 8.25 });
    assert.equal(down.state.units.a.turn.move, start - 9);
  });

  it('the reach is the same in every direction: as far into the depth as across', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    const g = gridFor(s.mapId);
    const r = reachable(s, s.units.a, 6);
    const from = cellOf(s.units.a.pos);
    const costAt = (dc: number, dr: number) => r.cost.get(idx(g, { c: from.c + dc, r: from.r + dr }));
    const n = 6 / CELL;
    for (const [dc, dr] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) {
      assert.equal(costAt(dc * n, dr * n), 6, `6 m toward ${dc},${dr}`);
      assert.equal(costAt(dc * (n + 1), dr * (n + 1)), undefined, `not 6.5 m toward ${dc},${dr}`);
    }
  });

  it('a diagonal step into the depth costs the diagonal\'s true length (sqrt 2 of a straight one)', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    const g = gridFor(s.mapId);
    const r = reachable(s, s.units.a, 9);
    const from = cellOf(s.units.a.pos);
    // 4 cells across and 4 into the depth: 2 m each way, 2.83 m walked.
    const cost = r.cost.get(idx(g, { c: from.c + 4, r: from.r - 4 }))!;
    assert.ok(Math.abs(cost - 4 * CELL * Math.SQRT2) < 1e-9, String(cost));
  });

  it('the ground is drawn with 1 m of depth = 38 px up the screen, 1 m across = 57 px (no scaling by depth)', () => {
    const map = getMap('river_forest');
    const near = toScreen(map, 10, 15, 0);
    const far = toScreen(map, 10, 5, 0);
    assert.equal(near.X, far.X);
    assert.equal(near.Y - far.Y, 10 * 38);
    assert.equal(toScreen(map, 11, 5, 0).X - far.X, 57);
  });
});

describe('the Y axis: areas, cover and the AI in the depth', () => {
  const at = (x: number, z: number): Pt => ({ x, z });

  it('a cone aimed up the screen catches who stands up there, not who stands beside', () => {
    const cone = areaOf(JUTSU.earth_rubble_gust, at(12, 12), at(12, 9))!;
    assert.equal(cone.kind, 'cone');
    assert.equal(cone.kind === 'cone' && cone.dir, -90);
    assert.ok(inArea(cone, at(12, 8.5)));
    assert.ok(inArea(cone, at(13, 9)));
    assert.ok(!inArea(cone, at(15.5, 12)));
    assert.ok(!inArea(cone, at(12, 15.5)));
  });

  it('a line aimed diagonally into the depth: the rogue on the diagonal saves, the one straight up does not', () => {
    const s = turnOf(createBattle(setup({ party: [{ character: hero({ id: 'a' }), pos: { x: 12.25, z: 14.25 } }], enemies: [
      { kind: 'rogue', pos: { x: 15.25, z: 11.25 } },
      { kind: 'rogue', pos: { x: 12.25, z: 8.25 } },
    ] })).state, 'a');
    s.units.a.jutsus.push('lightning_thunder_beam');
    const who = saved(s, { type: 'jutsu', unit: 'a', jutsu: 'lightning_thunder_beam', at: { x: 16.25, z: 10.25 } });
    assert.ok(who.includes('rogue_0'), String(who));
    assert.ok(!who.includes('rogue_1'), String(who));
  });

  it('a cone aimed straight up the screen hits the rogue up there and spares the one beside the caster', () => {
    const s = turnOf(createBattle(setup({ party: [{ character: hero({ id: 'a' }), pos: { x: 12.25, z: 14.25 } }], enemies: [
      { kind: 'rogue', pos: { x: 12.25, z: 10.75 } },
      { kind: 'rogue', pos: { x: 15.75, z: 14.25 } },
    ] })).state, 'a');
    s.units.a.jutsus.push('earth_rubble_gust');
    const who = saved(s, { type: 'jutsu', unit: 'a', jutsu: 'earth_rubble_gust', at: { x: 12.25, z: 11.25 } });
    assert.deepEqual(who, ['rogue_0']);
  });

  it('cover works in the depth: the boulder covers a rogue behind it up the screen, not one beside it', () => {
    const s = createBattle(setup()).state;
    // The clearing's boulder stands at (18, 8).
    assert.equal(coverBetween(s, at(18, 12.5), at(18, 5.5)), 5);
    assert.equal(coverBetween(s, at(18, 12.5), at(21.5, 12.5)), 0);
  });

  it('the Y-axis test battle: the party at the front edge, the rogues at the back; the AI meets in the middle and finishes', () => {
    const e = ENCOUNTERS.depth_test;
    assert.ok(e.partyAt.every((p) => p.z > 18), 'the party starts at the front (the bottom of the screen)');
    assert.ok(e.enemies.every((p) => p.pos.z < 4), 'the rogues start at the back (the top of the screen)');
    const party = [hero({ id: 'a', name: 'Aki' }), HANA, KENJI, hero({ id: 'n', name: 'Yua', clan: 'Northstar' })].map((c) => ({
      character: { ...c, effects: [], selectedJutsus: { ...c.selectedJutsus, slot5Ultimate: '' } },
      controller: 'ai' as const,
    }));
    let s = createBattle({ ...encounterSetup('depth_test', party, { seed: 3, difficulty: 'normal', supplies: { ...SUPPLIES } }), stealth: false }).state;
    const meanZ = (team: string) => {
      const us = Object.values(s.units).filter((u) => u.team === team && !u.down);
      return us.reduce((n, u) => n + u.pos.z, 0) / us.length;
    };
    const party0 = meanZ('party');
    const enemy0 = meanZ('enemy');
    let met = false;
    for (let step = 0; s.phase !== 'ended'; step++) {
      assert.ok(step < 4000, 'no end');
      const a = aiAction(s);
      assert.ok(a, `${current(s)?.id}: the AI has nothing to do`);
      const out = applyAction(s, a);
      assert.ok(out.ok, `${current(s)?.id} sent ${JSON.stringify(a)}, refused: ${out.reason}`);
      s = out.state;
      // Both sides walked a good way along the depth toward each other.
      if (!met && s.round <= 3 && meanZ('party') < party0 - 3 && meanZ('enemy') > enemy0 + 3) met = true;
    }
    assert.ok(met, 'the two sides close in along the depth within three rounds');
  });
});
