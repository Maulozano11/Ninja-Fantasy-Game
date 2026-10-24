// Tests for Liquid Body (Técnica de Agua: Cuerpo Líquido; the owner's answers of 2026-10-24,
// docs/GAMEPLAY_DESIGN.md, "Liquid Body"): melting, hiding as a puddle, half speed, what a puddle
// can't do, leaving or attacking from it always paying the bonus action, the damage it takes and
// what forces it out, being trodden on, noticed or searched out, the stealth phase, its end, and
// the AI. npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER, JUTSUS_DATA } from '../data/shinobiData';
import type { ShinobiCharacter } from '../types/shinobi';
import type { BattleEvent, BattleState, Pt } from './types';
import { applyAction, createBattle } from './engine';
import type { BattleSetup } from './engine';
import { cellBlocked, cellCenter, cellKey, cellOf, dampAt, waterAtPt } from './map';
import { canStop } from './nav';
import { attackPreview, damage } from './combat';
import { aiAction } from './ai';
import { exposure } from './stealth';
import { endTurn } from './turns';
import { visibleFoes } from './intent';
import { LIQUID_BODY, PUDDLE_ROUNDS, puddleDamage } from './puddle';
import { jutsuChoices } from '../rules/jutsuNature';

const hero = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...over });

function setup(over: Partial<BattleSetup> = {}): BattleSetup {
  return {
    seed: 7,
    mapId: 'river_forest',
    time: 'day',
    weather: 'Clear',
    difficulty: 'normal',
    party: [{ character: hero({ id: 'a', name: 'Aki' }), pos: { x: 8, z: 10 } }],
    enemies: [{ kind: 'rogue', pos: { x: 14, z: 10 } }, { kind: 'rogue', pos: { x: 16, z: 12 } }],
    stealth: false,
    supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 },
    ...over,
  };
}

type Out = ReturnType<typeof applyAction>;
const ok = (out: Out) => {
  assert.ok(out.ok, `expected ok, got: ${out.reason}`);
  return out;
};

function turnOf(s: BattleState, id: string): BattleState {
  const t = structuredClone(s);
  t.turn = t.order.indexOf(id);
  const u = t.units[id];
  u.turn = { move: u.cond.puddle ? u.speed / 2 : u.speed, action: true, bonus: true, reaction: true, moved: 0 };
  return t;
}

/** Moves a unit to the nearest free dry cell to a point. */
function place(s: BattleState, id: string, p: Pt): void {
  const u = s.units[id];
  for (let r = 0; r < 6; r += 0.5) {
    for (let a = 0; a < 16; a++) {
      const q = { x: p.x + r * Math.cos((a * Math.PI) / 8), z: p.z + r * Math.sin((a * Math.PI) / 8) };
      const c = cellOf(q);
      if (cellBlocked(s, c) || waterAtPt(s, cellCenter(c)) || !canStop(s, u, c)) continue;
      u.pos = cellCenter(c);
      return;
    }
  }
  throw new Error('no free cell');
}

/** Aki (with Liquid Body) on its turn, two rogues with no jutsu where they are put. */
function scene(foes: Pt[] = [{ x: 14, z: 10 }, { x: 16, z: 12 }]): BattleState {
  const s = turnOf(createBattle(setup()).state, 'a');
  for (const u of Object.values(s.units)) {
    u.jutsus = [];
    u.chakra = 30;
  }
  s.units.a.jutsus = [LIQUID_BODY];
  s.units.a.armed = false;
  const ids = Object.keys(s.units).filter((id) => id !== 'a');
  ids.forEach((id, i) => place(s, id, foes[i] ?? { x: 30, z: 4 + i * 3 }));
  place(s, 'a', { x: 8, z: 10 });
  return s;
}

/** Aki melted (and hidden from every rogue, whatever the roll). */
function melted(s = scene()): BattleState {
  const out = ok(applyAction(s, { type: 'jutsu', unit: 'a', jutsu: LIQUID_BODY, at: s.units.a.pos }));
  const t = structuredClone(out.state);
  t.units.a.cond.hidden = 40;
  return t;
}

const notes = (ev: BattleEvent[], key: string) => ev.filter((e) => e.t === 'note' && e.key === key);

describe('Liquid Body: the jutsu', () => {
  it('rank C, 2 chakra, an action, Water, in the Utility slot; only a Water ninja is offered it', () => {
    const j = JUTSUS_DATA.find((x) => x.id === LIQUID_BODY)!;
    assert.equal(j.rank, 'C');
    assert.equal(j.chakraCost, 2);
    assert.equal(j.castTime, 'Action');
    assert.equal(j.nature, 'Water');
    assert.equal(j.category, 'Utility');
    assert.equal(j.nameEs, 'Técnica de Agua: Cuerpo Líquido');
    assert.ok(jutsuChoices('slot1Utility', 'Water', 'Mirai').some((x) => x.id === LIQUID_BODY));
    for (const n of ['Fire', 'Wind', 'Lightning', 'Earth', 'Light', 'Void'] as const) assert.ok(!jutsuChoices('slot1Utility', n, 'Mirai').some((x) => x.id === LIQUID_BODY), n);
  });

  it('melts: the action and 2 chakra, a Stealth roll with advantage, its cell wet, half speed', () => {
    const s = scene();
    const before = s.units.a.chakra;
    const out = ok(applyAction(s, { type: 'jutsu', unit: 'a', jutsu: LIQUID_BODY, at: s.units.a.pos }));
    const a = out.state.units.a;
    assert.ok(a.cond.puddle);
    assert.equal(a.cond.puddle!.rounds, PUDDLE_ROUNDS);
    assert.equal(a.chakra, before - 2);
    assert.equal(a.turn.action, false);
    assert.ok(a.turn.move <= a.speed / 2 + 1e-9);
    const roll = out.events.find((e) => e.t === 'check' && e.what === 'stealth');
    assert.ok(roll && roll.t === 'check' && roll.roll.adv === 'advantage');
    assert.ok(dampAt(out.state, a.pos), 'its cell is water');
    assert.ok(out.events.some((e) => e.t === 'condition' && e.cond === 'puddle' && e.on));
    // The rogues saw it melt (in plain sight): they know where it is.
    assert.ok(a.cond.puddle!.knownBy.length > 0);
  });

  it('a puddle casts no jutsu, uses no items, neither hides nor shoves, and nobody shoves it', () => {
    const s = turnOf(melted(), 'a');
    s.units.a.jutsus = [LIQUID_BODY, 'water_geyser'];
    assert.equal(applyAction(s, { type: 'jutsu', unit: 'a', jutsu: 'water_geyser', at: s.units[Object.keys(s.units)[1]].pos }).reason, 'inPuddle');
    assert.equal(applyAction(s, { type: 'item', unit: 'a', item: 'pill' }).reason, 'inPuddle');
    assert.equal(applyAction(s, { type: 'hide', unit: 'a' }).reason, 'inPuddle');
    const foe = Object.keys(s.units).find((id) => id !== 'a')!;
    assert.equal(applyAction(s, { type: 'shove', unit: 'a', target: foe, mode: 'push' }).reason, 'inPuddle');
    const f = turnOf(s, foe);
    place(f, foe, { x: f.units.a.pos.x + 1.2, z: f.units.a.pos.z });
    assert.equal(applyAction(f, { type: 'shove', unit: foe, target: 'a', mode: 'prone' }).reason, 'targetPuddle');
  });
});

describe('Liquid Body: leaving and attacking always cost the bonus action', () => {
  it('rising takes the bonus action; without it, it can not rise', () => {
    const s = turnOf(melted(), 'a');
    const out = ok(applyAction(s, { type: 'rise', unit: 'a' }));
    assert.equal(out.state.units.a.cond.puddle, undefined);
    assert.equal(out.state.units.a.turn.bonus, false);
    // Hidden it was, hidden it rises (crouched), so its next blow still comes from hiding.
    assert.ok(out.state.units.a.cond.hidden !== undefined);
    const spent = structuredClone(s);
    spent.units.a.turn.bonus = false;
    assert.equal(applyAction(spent, { type: 'rise', unit: 'a' }).reason, 'noBonus');
  });

  it('an attack from the puddle rises (the bonus action) and strikes (the action) with the advantage of hiding', () => {
    const s = melted(scene([{ x: 9.5, z: 10 }, { x: 30, z: 4 }]));
    const t = turnOf(s, 'a');
    const foe = Object.keys(t.units).find((id) => id !== 'a' && Math.abs(t.units[id].pos.x - 9.5) < 1)!;
    t.units.a.armed = true;
    const pv = attackPreview(t, t.units.a, t.units[foe], 'melee');
    assert.ok(pv.inRange);
    const out = ok(applyAction(t, { type: 'attack', unit: 'a', target: foe }));
    const a = out.state.units.a;
    assert.equal(a.cond.puddle, undefined);
    assert.equal(a.turn.bonus, false);
    assert.equal(a.turn.action, false);
    const atk = out.events.find((e) => e.t === 'attack');
    assert.ok(atk && atk.t === 'attack' && atk.reasons?.includes('hidden'), 'struck from hiding');
  });

  it('an attack from the puddle with the bonus action already spent is refused', () => {
    const s = melted(scene([{ x: 9.5, z: 10 }, { x: 30, z: 4 }]));
    const t = turnOf(s, 'a');
    const foe = Object.keys(t.units).find((id) => id !== 'a' && Math.abs(t.units[id].pos.x - 9.5) < 1)!;
    t.units.a.turn.bonus = false;
    const out = applyAction(t, { type: 'attack', unit: 'a', target: foe });
    assert.equal(out.ok, false);
    assert.equal(out.reason, 'noBonus');
    assert.ok(t.units.a.cond.puddle, 'still a puddle');
  });
});

describe('Liquid Body: what it takes and what forces it out', () => {
  it('weapons and fire half, lightning double', () => {
    assert.equal(puddleDamage(10, 'Slashing', true), 5);
    assert.equal(puddleDamage(10, 'Bludgeoning', false), 10);
    assert.equal(puddleDamage(10, 'Fire', false), 5);
    assert.equal(puddleDamage(10, 'Lightning', false), 20);
  });

  it('lightning and fire force it out; a weapon hit asks for a CON save', () => {
    for (const type of ['Lightning', 'Fire'] as const) {
      const s = melted();
      const ev: BattleEvent[] = [];
      s.units.a.hp = 100;
      damage(s, s.units.a, 4, type, {}, ev);
      assert.equal(s.units.a.cond.puddle, undefined, type);
      assert.ok(notes(ev, 'puddleForced').length, type);
    }
    const s = melted();
    const ev: BattleEvent[] = [];
    s.units.a.hp = 100;
    damage(s, s.units.a, 8, 'Slashing', { weapon: true }, ev);
    const dmg = ev.find((e) => e.t === 'damage');
    assert.ok(dmg && dmg.t === 'damage' && dmg.amount === 4, 'half of a blade');
    assert.ok(ev.some((e) => e.t === 'save' && e.what === LIQUID_BODY && e.ab === 'con'), 'a CON save');
  });

  it('a wind attack scatters it, even with no harm', () => {
    const s = melted();
    const ev: BattleEvent[] = [];
    s.units.a.hp = 100;
    damage(s, s.units.a, 0, 'Slashing', { wind: true }, ev);
    // No damage is no hit: the wind's own blow (landHit) forces it out; a hit that does harm too.
    damage(s, s.units.a, 3, 'Slashing', { wind: true }, ev);
    assert.equal(s.units.a.cond.puddle, undefined);
  });
});

describe('Liquid Body: found, noticed, searched', () => {
  it('a foe that treads on it forces it out and everyone sees it', () => {
    const s = melted(scene([{ x: 14, z: 10 }, { x: 30, z: 4 }]));
    const foe = Object.keys(s.units).find((id) => id !== 'a' && Math.abs(s.units[id].pos.x - 14) < 1.5)!;
    const t = turnOf(s, foe);
    const a = t.units.a;
    const to = cellOf({ x: a.pos.x + 0.5, z: a.pos.z });
    const out = ok(applyAction(t, { type: 'move', unit: foe, to }));
    assert.equal(out.state.units.a.cond.puddle, undefined);
    assert.equal(out.state.units.a.cond.hidden, undefined);
    assert.ok(notes(out.events, 'puddleFound').length);
  });

  it('moving on dry ground in a foe\'s sight it is noticed; on wet ground it is not', () => {
    const s = melted(scene([{ x: 14, z: 10 }, { x: 30, z: 4 }]));
    s.units.a.cond.puddle!.knownBy = [];
    const t = turnOf(s, 'a');
    const to = cellOf({ x: t.units.a.pos.x, z: t.units.a.pos.z + 1.5 });
    const dry = ok(applyAction(t, { type: 'move', unit: 'a', to }));
    assert.ok(notes(dry.events, 'puddleNoticed').length, 'noticed');
    assert.ok(dry.state.units.a.cond.puddle!.knownBy.length > 0);
    // The same walk over soaked ground: unseen.
    const w = structuredClone(t);
    w.wet = {};
    for (let dz = -1; dz <= 2.5; dz += 0.5) for (let dx = -1; dx <= 1; dx += 0.5) w.wet[cellKey(cellOf({ x: t.units.a.pos.x + dx, z: t.units.a.pos.z + dz }))] = 3;
    const wet = ok(applyAction(w, { type: 'move', unit: 'a', to }));
    assert.equal(notes(wet.events, 'puddleNoticed').length, 0);
    assert.equal(wet.state.units.a.cond.puddle!.knownBy.length, 0);
  });

  it('a foe that knows of it sees it; one that does not, does not', () => {
    const s = melted();
    const foe = Object.values(s.units).find((u) => u.id !== 'a')!;
    s.units.a.cond.puddle!.knownBy = [];
    assert.ok(!visibleFoes(s, foe).some((u) => u.id === 'a'));
    s.units.a.cond.puddle!.knownBy = [foe.id];
    assert.ok(visibleFoes(s, foe).some((u) => u.id === 'a'));
  });

  it('a Search that beats its Stealth finds it', () => {
    const s = melted(scene([{ x: 12, z: 10 }, { x: 30, z: 4 }]));
    const foe = Object.keys(s.units).find((id) => id !== 'a' && Math.abs(s.units[id].pos.x - 12) < 1.5)!;
    s.units.a.cond.puddle!.knownBy = [];
    s.units.a.cond.hidden = 1;
    // A roll that is no natural 1 (which always fails).
    let out = ok(applyAction(turnOf(s, foe), { type: 'search', unit: foe }));
    for (let k = 1; k < 20 && out.events.some((e) => e.t === 'check' && e.roll.fumble); k++) {
      const t = turnOf(s, foe);
      t.rolls += k;
      out = ok(applyAction(t, { type: 'search', unit: foe }));
    }
    assert.equal(out.state.units.a.cond.puddle, undefined);
  });

  it('hidden, it stays hidden at the end of its turn (no need to crouch)', () => {
    const s = turnOf(melted(), 'a');
    const ev: BattleEvent[] = [];
    endTurn(s, ev);
    assert.ok(s.units.a.cond.hidden !== undefined);
  });

  it('it ends by itself after its rounds', () => {
    const s = melted();
    s.units.a.cond.puddle!.rounds = 1;
    let t = s;
    for (let i = 0; i < 12 && t.units.a.cond.puddle; i++) {
      const ev: BattleEvent[] = [];
      endTurn(t, ev);
      t = structuredClone(t);
    }
    assert.equal(t.units.a.cond.puddle, undefined);
  });
});

describe('Liquid Body: the stealth phase', () => {
  it('still, a guard with weaker eyes gains nothing even close by; moving on dry ground it notices it like a crouched ninja', () => {
    const s = melted();
    const g = Object.values(s.units).find((u) => u.id !== 'a')!;
    g.guard = { route: [], next: 0, suspicion: {}, alerted: false, look: 180 };
    g.pos = { x: s.units.a.pos.x + 1.2, z: s.units.a.pos.z };
    s.units.a.cond.puddle!.knownBy = [];
    s.units.a.cond.hidden = 40;
    s.wet = {};
    assert.equal(exposure(s, g, s.units.a), 0);
    assert.ok(exposure(s, g, s.units.a, s.units.a.pos, true) > 0, 'moving on dry ground');
    // On wet ground it stays unseen while it moves.
    s.wet = { [cellKey(cellOf(s.units.a.pos))]: 3 };
    assert.equal(exposure(s, g, s.units.a, s.units.a.pos, true), 0);
  });
});

describe('Liquid Body: the AI', () => {
  it('a hurt enemy with it and no foe near melts', () => {
    const s = scene([{ x: 20, z: 10 }, { x: 30, z: 4 }]);
    const foe = Object.keys(s.units).find((id) => id !== 'a' && Math.abs(s.units[id].pos.x - 20) < 1.5)!;
    const t = turnOf(s, foe);
    const f = t.units[foe];
    f.jutsus = [LIQUID_BODY];
    f.armed = false;
    f.hp = Math.floor(f.maxHp / 2);
    const act = aiAction(t);
    assert.deepEqual(act && act.type === 'jutsu' ? act.jutsu : act?.type, LIQUID_BODY);
  });

  it('in the puddle beside a foe it strikes out of it, the bonus action paid', () => {
    const s = melted(scene([{ x: 9.5, z: 10 }, { x: 30, z: 4 }]));
    const t = turnOf(s, 'a');
    t.units.a.controller = 'ai';
    t.units.a.aiOrder = 'defensive';
    const act = aiAction(t);
    assert.equal(act?.type, 'attack');
    const out = ok(applyAction(t, act!));
    assert.equal(out.state.units.a.turn.bonus, false);
  });

  it('an ally on the AI melts only under the Defensive order', () => {
    const s = scene([{ x: 20, z: 10 }, { x: 30, z: 4 }]);
    const t = turnOf(s, 'a');
    t.units.a.controller = 'ai';
    t.units.a.hp = Math.floor(t.units.a.maxHp / 2);
    t.units.a.aiOrder = 'aggressive';
    const a1 = aiAction(t);
    assert.ok(!(a1?.type === 'jutsu' && a1.jutsu === LIQUID_BODY));
    t.units.a.aiOrder = 'defensive';
    const a2 = aiAction(t);
    assert.ok(a2?.type === 'jutsu' && a2.jutsu === LIQUID_BODY);
  });
});
