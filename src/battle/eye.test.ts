// Tests for opening the Eye of Tomorrow (the owner, 2026-10-28, N14 "c" of docs/SPACE_DESIGN.md: off
// by default; a bonus action and 1 chakra open it until the Mirai's next turn begins; it is what
// reads the enemies' plans and lets Premonitory Evasion see a blow coming; battle/clans.ts). npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import type { ShinobiCharacter } from '../types/shinobi';
import type { BattleEvent, BattleState } from './types';
import { applyAction, createBattle } from './engine';
import type { BattleSetup } from './engine';
import { EYE_COST, eyeOpen } from './clans';
import { foreseen } from './intent';
import { aiAction } from './ai';
import { endTurn } from './turns';

const hero = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...over });
const mirai = (id = 'm') => hero({ id, name: 'Ren', clan: 'Mirai' });

function setup(over: Partial<BattleSetup> = {}): BattleSetup {
  return {
    seed: 7,
    mapId: 'river_forest',
    time: 'day',
    weather: 'Clear',
    difficulty: 'normal',
    party: [{ character: mirai(), pos: { x: 8, z: 10 } }],
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

describe('the Eye of Tomorrow opens on purpose', () => {
  it('is closed at the start: the Mirai reads no plan; a bonus action and 1 chakra open it, and it reads them', () => {
    const s = turnOf(createBattle(setup()).state, 'm');
    assert.ok(!eyeOpen(s.units.m));
    assert.deepEqual(foreseen(s), {}, 'closed: nothing');
    const chakra = s.units.m.chakra;
    const out = ok(applyAction(s, { type: 'eye', unit: 'm' }));
    assert.ok(eyeOpen(out.state.units.m));
    assert.equal(out.state.units.m.chakra, chakra - EYE_COST);
    assert.equal(out.state.units.m.turn.bonus, false);
    assert.ok(out.events.some((e) => e.t === 'eye' && e.unit === 'm' && e.on));
    assert.ok(foreseen(out.state).rogue_0, 'open: the rogue\'s plan');
    // not twice, not without the bonus action, not for another clan
    assert.equal(applyAction(out.state, { type: 'eye', unit: 'm' }).reason, 'eyeOpen');
    const spent = turnOf(createBattle(setup()).state, 'm');
    spent.units.m.turn.bonus = false;
    assert.equal(applyAction(spent, { type: 'eye', unit: 'm' }).reason, 'noBonus');
    const other = turnOf(createBattle(setup({ party: [{ character: hero({ id: 'k', clan: 'Koton' }), pos: { x: 8, z: 10 } }] })).state, 'k');
    assert.equal(applyAction(other, { type: 'eye', unit: 'k' }).reason, 'notMirai');
  });

  it('stays open through the enemies\' turns and closes as the Mirai\'s next turn begins', () => {
    const s = turnOf(createBattle(setup()).state, 'm');
    const out = ok(applyAction(s, { type: 'eye', unit: 'm' })).state;
    const ev: BattleEvent[] = [];
    let t = structuredClone(out);
    endTurn(t, ev);
    // the rogue's turn: still open
    assert.ok(eyeOpen(t.units.m));
    for (let guard = 0; guard < 10 && t.order[t.turn] !== 'm'; guard++) endTurn(t, ev);
    assert.equal(t.order[t.turn], 'm');
    assert.ok(!eyeOpen(t.units.m), 'closed as its turn begins');
    assert.ok(ev.some((e) => e.t === 'eye' && e.unit === 'm' && !e.on));
  });

  it('an AI Mirai opens it before ending its turn, with the bonus action it has left', () => {
    const { state } = createBattle(setup({ party: [{ character: hero({ id: 'a' }), pos: { x: 8, z: 10 } }], enemies: [{ kind: 'rogue', clan: 'Mirai', pos: { x: 20, z: 10 } }] }));
    let t = turnOf(state, 'rogue_0');
    t.units.rogue_0.chakra = 10;
    let opened = false;
    for (let guard = 0; guard < 8 && t.order[t.turn] === 'rogue_0'; guard++) {
      const a = aiAction(t);
      assert.ok(a, 'the AI acts');
      if (a.type === 'eye') opened = true;
      t = ok(applyAction(t, a)).state;
    }
    assert.ok(opened, 'opened the Eye');
    assert.ok(eyeOpen(t.units.rogue_0));
  });
});
