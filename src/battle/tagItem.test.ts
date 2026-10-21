// Tests for the explosive tag as an item in battle: npm test. The owner (2026-10-21): "sello explosivo
// es un item o herramienta consumible". The jutsu that hid a tag on the ground ("Explosive Tag
// Ambush") is gone; the item slot does it now, from the party's backpack, with the same blast.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import type { ShinobiCharacter } from '../types/shinobi';
import type { BattleState, Pt } from './types';
import { applyAction, createBattle } from './engine';
import type { BattleSetup } from './engine';
import { cellBlocked, cellCenter, cellOf, dist, waterAtPt } from './map';
import { TAG } from './hazards';
import { canStop } from './nav';

const hero = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...over });

function setup(over: Partial<BattleSetup> = {}): BattleSetup {
  return {
    seed: 7,
    mapId: 'river_forest',
    time: 'day',
    weather: 'Clear',
    difficulty: 'normal',
    party: [{ character: hero({ id: 'a', name: 'Aki' }), pos: { x: 8, z: 10 } }],
    enemies: [{ kind: 'rogue', pos: { x: 14, z: 10 } }],
    stealth: false,
    supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 },
    ...over,
  };
}

const ok = (out: ReturnType<typeof applyAction>) => {
  assert.ok(out.ok, `expected ok, got: ${out.reason}`);
  return out;
};

function turnOf(s: BattleState, id: string): BattleState {
  const t = structuredClone(s);
  t.turn = t.order.indexOf(id);
  const u = t.units[id];
  u.turn = { move: u.speed, action: true, bonus: true, reaction: true, moved: 0 };
  return t;
}

/** The nearest free dry cell's centre to a point. */
function freeAt(s: BattleState, id: string, p: Pt): Pt {
  for (let r = 0; r < 6; r += 0.5)
    for (let a = 0; a < 16; a++) {
      const q = { x: p.x + r * Math.cos((a * Math.PI) / 8), z: p.z + r * Math.sin((a * Math.PI) / 8) };
      const c = cellOf(q);
      if (!cellBlocked(s, c) && !waterAtPt(s, cellCenter(c)) && canStop(s, s.units[id], c)) return cellCenter(c);
    }
  throw new Error('no free cell');
}

describe('the explosive tag hidden on the ground (an item now)', () => {
  it('hides a tag nearby from the backpack: an action, no chakra, unseen by the enemies', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    const chakra = s.units.a.chakra;
    const at = freeAt(s, 'a', { x: 11, z: 10 });
    const out = ok(applyAction(s, { type: 'item', unit: 'a', item: 'tagTrap', at }));
    const t = out.state;
    assert.equal(t.supplies.explosiveTags, 1, 'one tag spent');
    assert.equal(t.units.a.turn.action, false, 'it takes the action');
    assert.equal(t.units.a.chakra, chakra, 'no chakra');
    assert.equal(t.traps.length, 1);
    const trap = t.traps[0];
    // The save is the hider's jutsu DC, as the old jutsu's was (not the thrown tag's fixed 13).
    assert.deepEqual({ kind: trap.kind, owner: trap.owner, dice: trap.dice, radius: trap.radius, dc: trap.dc }, { kind: 'tag', owner: 'party', dice: '3d6', radius: 1.5, dc: t.units.a.saveDC });
    assert.equal(t.units.a.saveDC, 18, 'Solen\'s jutsu DC');
    assert.deepEqual(trap.pos, at);
    assert.ok(!trap.spotted, 'hidden');
    assert.ok(out.events.some((e) => e.t === 'trap' && e.on));
    assert.ok(!out.events.some((e) => e.t === 'explode'), 'it waits');
  });

  it('refuses what it can\'t do: too far, no tags left, no action', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    assert.equal(applyAction(s, { type: 'item', unit: 'a', item: 'tagTrap', at: { x: 8 + TAG.plant + 1, z: 10 } }).reason, 'outOfRange');
    assert.equal(applyAction(s, { type: 'item', unit: 'a', item: 'tagTrap' }).reason, 'outOfRange');
    const none = structuredClone(s);
    none.supplies.explosiveTags = 0;
    assert.equal(applyAction(none, { type: 'item', unit: 'a', item: 'tagTrap', at: freeAt(s, 'a', { x: 10, z: 10 }) }).reason, 'noneLeft');
    const spent = structuredClone(s);
    spent.units.a.turn.action = false;
    assert.equal(applyAction(spent, { type: 'item', unit: 'a', item: 'tagTrap', at: freeAt(s, 'a', { x: 10, z: 10 }) }).reason, 'noAction');
    // The reach: up to 4.5 m (the jutsu's 3 tiles).
    assert.equal(TAG.plant, 4.5);
  });

  it('blows up when an enemy steps on it: 3d6 fire in 1.5 m, DEX save for half (the jutsu\'s effect)', () => {
    let s = turnOf(createBattle(setup()).state, 'a');
    const at = freeAt(s, 'a', { x: 11.5, z: 10 });
    s = ok(applyAction(s, { type: 'item', unit: 'a', item: 'tagTrap', at })).state;
    const rogue = turnOf(s, 'rogue_0');
    const hp = rogue.units.rogue_0.hp;
    const out = ok(applyAction(rogue, { type: 'move', unit: 'rogue_0', to: cellOf(at) }));
    assert.ok(out.events.some((e) => e.t === 'trap' && !e.on), 'it goes off');
    const boom = out.events.find((e) => e.t === 'explode');
    assert.ok(boom && boom.t === 'explode' && boom.radius === 1.5 && dist(boom.at, at) < 0.01);
    assert.ok(out.events.some((e) => e.t === 'save' && e.unit === 'rogue_0' && e.ab === 'dex'), 'a DEX save');
    assert.equal(out.state.traps.length, 0);
    assert.ok(out.state.units.rogue_0.hp < hp, 'hurt');
  });

  it('a weaker ninja\'s hidden tag is saved against its own jutsu DC', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    s.units.a.saveDC = 12;
    const t = ok(applyAction(s, { type: 'item', unit: 'a', item: 'tagTrap', at: freeAt(s, 'a', { x: 11, z: 10 }) })).state;
    assert.equal(t.traps[0].dc, 12);
  });

  it('throwing a tag still blows up where it lands, from the same backpack (DC 13, as before)', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    const out = ok(applyAction(s, { type: 'item', unit: 'a', item: 'tag', at: { x: 14, z: 10 } }));
    assert.ok(out.events.some((e) => e.t === 'explode'));
    assert.ok(out.events.some((e) => e.t === 'save' && e.roll.dc === TAG.dc), 'the thrown tag\'s save');
    assert.equal(out.state.supplies.explosiveTags, 1);
  });

  it('hiding one in the stealth phase does not give the ninja away', () => {
    const s0 = createBattle(setup({ stealth: true, enemies: [{ kind: 'rogue', pos: { x: 30, z: 10 } }] })).state;
    assert.equal(s0.phase, 'stealth');
    const out = ok(applyAction(s0, { type: 'item', unit: 'a', item: 'tagTrap', at: freeAt(s0, 'a', { x: 10, z: 10 }) }));
    assert.equal(out.state.phase, 'stealth');
  });
});
