// Tests for the Colossal Avatar of the Mirai's Path of the Infernal Fire (the owner's numbers,
// 2026-10-29, D-T24, the shield's guard cancelling the damage completely): level 9 and the improved
// avatar of level 12 (battle/infernal.ts). npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import type { ShinobiCharacter } from '../types/shinobi';
import type { BattleState, Hit } from './types';
import { applyAction, createBattle } from './engine';
import type { BattleSetup } from './engine';
import { attackPreview } from './combat';
import { AVATAR, AVATAR_PLUS, emberOn, guardFor, magmaAt } from './infernal';
import { beginTurn, endTurn } from './turns';
import { aiAction } from './ai';
import { battleResult } from './result';
import { cellOf } from './map';

const hero = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...over });
const aiden = (level = 9, over: Partial<ShinobiCharacter> = {}) => hero({ id: 'm', name: 'Aiden', clan: 'Mirai', level, path: 'mirai_infernal_fire', ...over });

function setup(c: ShinobiCharacter, o: Partial<BattleSetup> = {}): BattleSetup {
  return {
    seed: 7,
    mapId: 'river_forest',
    time: 'day',
    weather: 'Clear',
    difficulty: 'normal',
    party: [{ character: c, pos: { x: 8, z: 10 } }, { character: hero({ id: 'b', name: 'Lyra' }), pos: { x: 9, z: 10 } }],
    enemies: [{ kind: 'rogue', pos: { x: 14, z: 10 } }],
    stealth: false,
    supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 },
    ...o,
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
  u.chakra = Math.max(u.chakra, 30);
  return t;
}

const summoned = (level = 9, stance: 'shield' | 'spear' = 'shield', o: Partial<BattleSetup> = {}) => {
  const s = turnOf(createBattle(setup(aiden(level), o)).state, 'm');
  return ok(applyAction(s, { type: 'avatar', unit: 'm', stance }));
};

describe('summoning the Colossal Avatar', () => {
  it('level 9: an action and 10 chakra; 15 temporary HP and the Ember Armour, for 3 turns', () => {
    const s = turnOf(createBattle(setup(aiden())).state, 'm');
    const chakra = s.units.m.chakra;
    const out = ok(applyAction(s, { type: 'avatar', unit: 'm', stance: 'shield' }));
    const m = out.state.units.m;
    assert.equal(m.chakra, chakra - AVATAR.cost);
    assert.equal(m.turn.action, false);
    assert.equal(m.tempHp, AVATAR.tempHp);
    assert.ok(emberOn(m));
    assert.deepEqual({ stance: m.avatar?.stance, turns: m.avatar?.turns, plus: m.avatar?.plus }, { stance: 'shield', turns: 3, plus: false });
    assert.ok(out.events.some((e) => e.t === 'avatar' && e.on && e.stance === 'shield' && !e.plus));
  });

  it('level 12: 12 chakra, 30 temporary HP, 4 turns, the improved one', () => {
    const s = turnOf(createBattle(setup(aiden(12))).state, 'm');
    const chakra = s.units.m.chakra;
    const m = ok(applyAction(s, { type: 'avatar', unit: 'm', stance: 'spear' })).state.units.m;
    assert.equal(m.chakra, chakra - AVATAR_PLUS.cost);
    assert.equal(m.tempHp, AVATAR_PLUS.tempHp);
    assert.deepEqual({ turns: m.avatar?.turns, plus: m.avatar?.plus }, { turns: 4, plus: true });
  });

  it('is refused below level 9, without the action or chakra, and once a mission', () => {
    assert.equal(applyAction(turnOf(createBattle(setup(aiden(8))).state, 'm'), { type: 'avatar', unit: 'm', stance: 'shield' }).ok, false);
    const poor = turnOf(createBattle(setup(aiden())).state, 'm');
    poor.units.m.chakra = AVATAR.cost - 1;
    assert.equal(applyAction(poor, { type: 'avatar', unit: 'm', stance: 'shield' }).ok, false);
    const spent = turnOf(createBattle(setup(aiden(9, { avatarSpent: true }))).state, 'm');
    assert.equal(applyAction(spent, { type: 'avatar', unit: 'm', stance: 'shield' }).reason, 'avatarSpent');
    // summoned in a battle, the mission's next battles have it spent
    const out = summoned();
    const r = battleResult(out.state).members.find((x) => x.id === 'm');
    assert.equal(r?.avatarSpent, true);
  });

  it('fades after its 3 turns, and its armour with it', () => {
    let s = summoned().state;
    for (let i = 0; i < 3; i++) {
      assert.ok(s.units.m.avatar, `standing in turn ${i + 1}`);
      s = turnOf(s, 'm');
      endTurn(s, []);
    }
    assert.equal(s.units.m.avatar, undefined);
    assert.ok(!emberOn(s.units.m));
  });
});

describe('its stances', () => {
  it('shield: +3 AC over the armour\'s +2 (+5), and +4 (+6) improved', () => {
    const base = turnOf(createBattle(setup(aiden())).state, 'm');
    const ac0 = attackPreview(base, base.units.rogue_0, base.units.m, false).ac;
    const s9 = summoned(9).state;
    assert.equal(attackPreview(s9, s9.units.rogue_0, s9.units.m, false).ac, ac0 + 5);
    const base12 = turnOf(createBattle(setup(aiden(12))).state, 'm');
    const ac12 = attackPreview(base12, base12.units.rogue_0, base12.units.m, false).ac;
    const s12 = summoned(12).state;
    assert.equal(attackPreview(s12, s12.units.rogue_0, s12.units.m, false).ac, ac12 + 6);
    // in the spear stance only the armour's +2
    const sp = summoned(9, 'spear').state;
    assert.equal(attackPreview(sp, sp.units.rogue_0, sp.units.m, false).ac, ac0 + 2);
  });

  it('shield: a comrade within 3 m has half cover; one farther, not', () => {
    const s = summoned().state;
    const pv = attackPreview(s, s.units.rogue_0, s.units.b, 'ranged');
    assert.ok(pv.cover >= 2);
    const far = structuredClone(s);
    far.units.b.pos = { x: 8, z: 14.5 };
    assert.equal(attackPreview(far, far.units.rogue_0, far.units.b, 'ranged').cover, 0);
  });

  it('the switch is a bonus action at level 9; the improved avatar\'s first switch each turn is free', () => {
    let s = summoned(9).state;
    s = ok(applyAction(s, { type: 'stance', unit: 'm', stance: 'spear' })).state;
    assert.equal(s.units.m.avatar?.stance, 'spear');
    assert.equal(s.units.m.turn.bonus, false);
    assert.equal(applyAction(s, { type: 'stance', unit: 'm', stance: 'shield' }).ok, false, 'no bonus action left');
    let p = summoned(12).state;
    p = ok(applyAction(p, { type: 'stance', unit: 'm', stance: 'spear' })).state;
    assert.equal(p.units.m.turn.bonus, true, 'free');
    p = ok(applyAction(p, { type: 'stance', unit: 'm', stance: 'shield' })).state;
    assert.equal(p.units.m.turn.bonus, false, 'the second one takes the bonus action');
  });

  it('it stays in the last stance used, turn after turn', () => {
    let s = ok(applyAction(summoned().state, { type: 'stance', unit: 'm', stance: 'spear' })).state;
    s = turnOf(s, 'm');
    endTurn(s, []);
    assert.equal(s.units.m.avatar?.stance, 'spear');
  });

  it('spear: a melee blow adds 2d6 fire in place of the armour\'s 1d4 (3d6 improved)', () => {
    let max = 0;
    for (let seed = 1; seed < 40; seed++) {
      const s = turnOf(createBattle(setup(aiden(), { seed, enemies: [{ kind: 'rogue', pos: { x: 8.9, z: 10.6 } }] })).state, 'm');
      const sp = ok(applyAction(s, { type: 'avatar', unit: 'm', stance: 'spear' })).state;
      sp.units.m.turn.action = true;
      const out = ok(applyAction(sp, { type: 'attack', unit: 'm', target: 'rogue_0' }));
      for (const e of out.events) if (e.t === 'damage' && e.unit === 'rogue_0' && e.dmgType === 'Fire') max = Math.max(max, e.amount);
    }
    assert.ok(max > 4, `a fire roll above the armour's 1d4 (${max})`);
  });
});

describe('the spear\'s throw', () => {
  it('an 18 m line, 4d10 fire with a DEX save for half; it burns; once a turn', () => {
    const s = summoned(9, 'spear', { enemies: [{ kind: 'rogue', pos: { x: 20, z: 10 } }, { kind: 'rogue', pos: { x: 30, z: 10 } }] }).state;
    s.units.m.turn.action = true;
    s.units.b.pos = { x: 8, z: 12 };
    const hp = s.units.rogue_0.hp;
    const out = ok(applyAction(s, { type: 'avatarThrow', unit: 'm', at: { x: 20, z: 10 } }));
    assert.ok(out.events.some((e) => e.t === 'save' && e.unit === 'rogue_0'), 'rogue in reach saves');
    assert.ok(!out.events.some((e) => e.t === 'save' && e.unit === 'rogue_1'), 'rogue past 18 m is out of it');
    assert.ok(out.state.units.rogue_0.hp < hp || out.events.some((e) => e.t === 'save' && e.unit === 'rogue_0' && e.roll.crit));
    assert.ok(magmaAt(out.state, { x: 14, z: 10 }), 'the line burns');
    const again = structuredClone(out.state);
    again.units.m.turn.action = true;
    assert.equal(applyAction(again, { type: 'avatarThrow', unit: 'm', at: { x: 20, z: 10 } }).reason, 'threwAlready');
  });

  it('only in the spear stance', () => {
    assert.equal(applyAction(summoned(9, 'shield').state, { type: 'avatarThrow', unit: 'm', at: { x: 20, z: 10 } }).reason, 'notSpear');
  });

  it('improved: 24 m', () => {
    const s = summoned(12, 'spear', { enemies: [{ kind: 'rogue', pos: { x: 30, z: 10 } }] }).state;
    s.units.m.turn.action = true;
    const out = ok(applyAction(s, { type: 'avatarThrow', unit: 'm', at: { x: 30, z: 10 } }));
    assert.ok(out.events.some((e) => e.t === 'save' && e.unit === 'rogue_0'));
  });
});

describe('the shield\'s guard', () => {
  const blow = (s: BattleState): Hit => ({ unit: 'b', amount: 9, type: 'Slashing', source: 'rogue_0', aimed: true, melee: true });

  it('a blow aimed at a comrade beside it: an AI\'s shield takes it, no damage; once a round, twice improved', () => {
    const s = summoned().state;
    s.units.m.controller = 'ai';
    assert.ok(guardFor(s, blow(s)), 'the shield is there for Lyra');
    let hits = 0;
    for (let seed = 1; seed < 40 && !hits; seed++) {
      const t = turnOf(s, 'rogue_0');
      t.seed = seed;
      t.units.rogue_0.pos = { x: 9.9, z: 10.4 };
      const hp = t.units.b.hp;
      const out = ok(applyAction(t, { type: 'attack', unit: 'rogue_0', target: 'b' }));
      if (out.events.some((e) => e.t === 'avatarGuard' && e.unit === 'm' && e.for === 'b')) {
        hits++;
        assert.equal(out.state.units.b.hp, hp, 'no damage at all');
        assert.equal(out.state.units.m.avatar?.guards, 0);
        assert.equal(guardFor(out.state, blow(out.state)), null, 'spent for the round');
      }
    }
    assert.ok(hits, 'some blow landed and was guarded');
    const p = summoned(12).state;
    assert.equal(p.units.m.avatar?.guards, 2);
  });

  it('a player\'s shield is asked, and letting it go lets the blow land', () => {
    for (let seed = 1; seed < 40; seed++) {
      const t = turnOf(summoned().state, 'rogue_0');
      t.seed = seed;
      t.units.rogue_0.pos = { x: 9.9, z: 10.4 };
      const out = ok(applyAction(t, { type: 'attack', unit: 'rogue_0', target: 'b' }));
      if (out.state.pending?.kind !== 'avatarGuard') continue;
      const hp = out.state.units.b.hp;
      const no = ok(applyAction(out.state, { type: 'react', unit: 'm', take: false }));
      assert.ok(no.state.units.b.hp <= hp);
      assert.equal(no.state.units.m.avatar?.guards, 1, 'kept');
      const yes = ok(applyAction(out.state, { type: 'react', unit: 'm', take: true }));
      assert.equal(yes.state.units.b.hp, hp);
      assert.equal(yes.state.units.m.avatar?.guards, 0);
      return;
    }
    assert.fail('no blow was guarded');
  });

  it('the guards come back as its ninja\'s turn begins', () => {
    const s = summoned().state;
    s.units.m.avatar!.guards = 0;
    const t = structuredClone(s);
    t.turn = t.order.indexOf('m');
    beginTurn(t, []);
    assert.equal(t.order[t.turn], 'm');
    assert.equal(t.units.m.avatar?.guards, 1);
  });
});

describe('it stands firm and leaves magma', () => {
  it('a shove can\'t move or knock it down', () => {
    const s = summoned().state;
    const t = turnOf(s, 'rogue_0');
    t.units.rogue_0.pos = { x: 8.9, z: 10.6 };
    assert.equal(applyAction(t, { type: 'shove', unit: 'rogue_0', target: 'm', mode: 'prone' }).reason, 'unshakable');
  });

  it('where it walks the ground turns to magma, which burns a foe walking in (1d6), not its side', () => {
    let s = summoned().state;
    s.units.m.turn.move = 9;
    s = ok(applyAction(s, { type: 'move', unit: 'm', to: cellOf({ x: 8, z: 12 }) })).state;
    const cell = Object.keys(s.magma ?? {});
    assert.ok(cell.length > 0, 'magma under its steps');
    assert.ok(Object.values(s.magma!).every((m) => m.dice === AVATAR.magma));
    // a rogue walks across it
    const t = turnOf(s, 'rogue_0');
    t.units.rogue_0.pos = { x: 6.5, z: 11 };
    const hp = t.units.rogue_0.hp;
    const out = ok(applyAction(t, { type: 'move', unit: 'rogue_0', to: cellOf({ x: 9.5, z: 11 }) }));
    assert.ok(out.events.some((e) => e.t === 'note' && e.key === 'magmaBurns'), 'burnt crossing it');
    assert.ok(out.state.units.rogue_0.hp < hp);
    // Lyra, its comrade, crosses it unburnt
    const l = turnOf(s, 'b');
    l.units.b.pos = { x: 6.5, z: 11 };
    const crossed = ok(applyAction(l, { type: 'move', unit: 'b', to: cellOf({ x: 9.5, z: 11 }) }));
    assert.ok(!crossed.events.some((e) => e.t === 'note' && e.key === 'magmaBurns'));
  });
});

describe('the AI', () => {
  it('an AI Mirai of level 9 summons it when foes are near', () => {
    const { state } = createBattle({ ...setup(hero({ id: 'a' })), party: [{ character: hero({ id: 'a' }), pos: { x: 8, z: 10 } }], enemies: [{ kind: 'rogue', clan: 'Mirai', pos: { x: 11, z: 10 } }] });
    let t = turnOf(state, 'rogue_0');
    t.units.rogue_0.character = { ...t.units.rogue_0.character!, clan: 'Mirai', level: 9, path: 'mirai_infernal_fire' };
    let summon = false;
    for (let g = 0; g < 8 && t.order[t.turn] === 'rogue_0'; g++) {
      const a = aiAction(t);
      assert.ok(a);
      if (a.type === 'avatar') summon = true;
      t = ok(applyAction(t, a)).state;
    }
    assert.ok(summon);
  });
});
