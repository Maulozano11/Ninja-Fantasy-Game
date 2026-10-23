// Tests for the party battle engine: npm test (docs/GAMEPLAY_DESIGN.md is the spec).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER, JUTSUS_DATA } from '../data/shinobiData';
import { HANA, KENJI, MISSIONS } from '../data/missions';
import { addEffect } from '../rules/effects';
import type { ClanType, ShinobiCharacter } from '../types/shinobi';
import type { Action, BattleEvent, BattleState, Pt, RollInfo, Unit, Wall, WeaponNode } from './types';
import { applyAction, createBattle } from './engine';
import type { BattleSetup } from './engine';
import { cellBlocked, cellCenter, cellOf, coverBetween, dist, lineOfSight, waterAtPt } from './map';
import { canStop, reachable } from './nav';
import { attackPreview, damage, saveMod } from './combat';
import { beginTurn, current, endTurn, startCombat } from './turns';
import { foreseen, headOptions, planIntent } from './intent';
import { aiAction, runAi } from './ai';
import { battleResult } from './result';
import { HYDRA_ID } from './hydra';
import { JUTSU, enhanced } from './jutsu';
import { breakable, hitStructuresIn, ownStructures, structureAttack } from './structures';
import { electrify } from './hazards';
import { ENCOUNTERS, encounterSetup } from './encounters';
import type { EncounterId } from './encounters';
import { auraEntered, commandRefused } from './clans';
import { enemyNameOf } from './units';
import { logLine, unitName, unitRef } from '../components/battle/battleLog';
import { T, spanishArticles } from '../components/battle/battleText';

const hero = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...over });

const SUPPLIES = { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 };

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
    supplies: { ...SUPPLIES },
    ...over,
  };
}

const ok = (out: ReturnType<typeof applyAction>) => {
  assert.ok(out.ok, `expected ok, got: ${out.reason}`);
  return out;
};

/** Puts the turn on a unit (tests set up the moment they want). */
function turnOf(s: BattleState, id: string): BattleState {
  const t = structuredClone(s);
  t.turn = t.order.indexOf(id);
  const u = t.units[id];
  u.turn = { move: u.speed, action: true, bonus: true, reaction: true, moved: 0 };
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

const kinds = (ev: BattleEvent[]) => ev.map((e) => e.t);

describe('battle setup', () => {
  it('rolls initiative for everyone and starts the first turn', () => {
    const { state, events } = createBattle(setup());
    assert.equal(state.phase, 'combat');
    assert.equal(state.order.length, 2);
    assert.ok(kinds(events).includes('initiative'));
    assert.ok(current(state));
    // Enemies commit to their first move at once.
    assert.ok(state.units.rogue_0.intent);
  });

  it('is plain data: it survives JSON and replays exactly', () => {
    const { state } = createBattle(setup({ party: [{ character: hero({ id: 'a' }), pos: { x: 8, z: 10 }, controller: 'ai' }] }));
    const start = turnOf(state, 'rogue_0');
    // A battle loaded from JSON (a save, the network) plays on exactly like the original.
    const saved: BattleState = JSON.parse(JSON.stringify(start));
    const a = runAi(start, 60);
    const b = runAi(saved, 60);
    assert.equal(JSON.stringify(a.events), JSON.stringify(b.events));
    assert.deepEqual(JSON.parse(JSON.stringify(a.state)), JSON.parse(JSON.stringify(b.state)));
  });

  it('a state from before the clans (an older save or peer, with no Weapon Nodes) plays on', () => {
    const old: Partial<BattleState> = structuredClone(turnOf(createBattle(setup()).state, 'a'));
    delete old.nodes;
    // Aki is a Ryusei: its kunai leaves the first Node.
    const out = ok(applyAction(old as BattleState, { type: 'attack', unit: 'a', target: 'rogue_0', ranged: true }));
    assert.equal(out.state.nodes.length, 1);
  });

  it('a party caught at night loses its first turn, whatever the clan; Watchful still saves', () => {
    const { events } = createBattle(setup({ partySurprised: true, party: [
      { character: hero({ id: 'n', clan: 'Northstar' }), pos: { x: 8, z: 10 } },
      { character: hero({ id: 'w', effects: addEffect([], 'watchful').effects }), pos: { x: 8, z: 12 } },
    ] }));
    const start = events.find((e) => e.t === 'combatStart');
    assert.ok(start?.t === 'combatStart');
    assert.ok(start.surprised.includes('n'));
    assert.ok(!start.surprised.includes('w'));
  });
});

describe('movement', () => {
  it('walks within its movement and pays for it', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    const to = cellOf({ x: 11, z: 10 });
    const out = ok(applyAction(s, { type: 'move', unit: 'a', to }));
    const u = out.state.units.a;
    assert.deepEqual(cellOf(u.pos), to);
    assert.ok(u.turn.move < s.units.a.turn.move);
    assert.ok(kinds(out.events).includes('move'));
  });

  it("can't go further than its movement, nor act out of turn", () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    assert.equal(applyAction(s, { type: 'move', unit: 'a', to: cellOf({ x: 50, z: 18 }) }).reason, 'unreachable');
    assert.equal(applyAction(s, { type: 'dodge', unit: 'rogue_0' }).reason, 'notYourTurn');
  });

  it('deep water costs double, or 2 chakra to walk on it', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    const u = s.units.a;
    u.chakra = 0;
    const swim = reachable(s, u, 100);
    u.chakra = 10;
    const walkOn = reachable(s, u, 100);
    const across = cellOf({ x: 33, z: 15 });
    const idx = (c: { c: number; r: number }) => c.r * Math.ceil(60.63157894736842 / 0.5) + c.c;
    assert.ok(swim.cost.get(idx(across))! > walkOn.cost.get(idx(across))!);
  });
});

describe('attacks and reactions', () => {
  function duel() {
    const s = turnOf(createBattle(setup()).state, 'a');
    place(s, 'rogue_0', { x: 9.5, z: 10 });
    return s;
  }

  it('shows the chance before rolling and resolves the hit', () => {
    const s = duel();
    const pv = attackPreview(s, s.units.a, s.units.rogue_0, 'melee');
    assert.ok(pv.inRange && pv.chance > 0 && pv.chance < 1);
    const out = ok(applyAction(s, { type: 'attack', unit: 'a', target: 'rogue_0' }));
    const atk = out.events.find((e) => e.t === 'attack');
    assert.ok(atk && atk.t === 'attack');
    assert.equal(out.state.units.a.turn.action, false);
    if (atk.roll.success) assert.ok(out.state.units.rogue_0.hp < s.units.rogue_0.hp || out.events.some((e) => e.t === 'kawarimi' || e.t === 'clone'));
  });

  it('leaving a player ninja\'s reach asks for an opportunity attack', () => {
    const base = duel();
    const s = turnOf(base, 'rogue_0');
    const out = ok(applyAction(s, { type: 'move', unit: 'rogue_0', to: cellOf({ x: 15, z: 10 }) }));
    assert.equal(out.state.pending?.kind, 'opportunity');
    assert.equal(applyAction(out.state, { type: 'dodge', unit: 'rogue_0' }).reason, 'waitingReaction');
    const after = ok(applyAction(out.state, { type: 'react', unit: 'a', take: true }));
    assert.ok(after.events.some((e) => e.t === 'attack' && e.unit === 'a'));
    assert.equal(after.state.units.a.turn.reaction, false);
    // The move goes on unless the blow dropped the mover.
    if (!after.state.units.rogue_0.down) assert.ok(dist(after.state.units.rogue_0.pos, { x: 15, z: 10 }) < 1);
  });

  // Found by fuzzing: a walk paused for the prompt while the mover stood on a fallen ally's cell.
  function crossing(controller: 'player' | 'ai' = 'player') {
    // Kōton rogues: no Premonitory Evasion to step out of the blow.
    const { state } = createBattle(setup({ enemies: [{ kind: 'rogue', clan: 'Koton', pos: { x: 14, z: 10 } }, { kind: 'rogue', clan: 'Koton', pos: { x: 16, z: 13 } }] }));
    const s = turnOf(state, 'rogue_0');
    s.units.a.pos = { x: 10.25, z: 10.25 };
    s.units.a.controller = controller;
    s.units.rogue_0.pos = { x: 11.25, z: 10.25 };
    // Its fallen friend lies on the next cell, still in Aki's reach; the one after is out of it.
    Object.assign(s.units.rogue_1, { pos: { x: 11.75, z: 10.25 }, hp: 0, down: 'downed' });
    return s;
  }
  const shared = (s: BattleState): boolean => {
    const cells = Object.values(s.units).filter((u) => u.down !== 'dead' && u.down !== 'fled').map((u) => JSON.stringify(cellOf(u.pos)));
    return new Set(cells).size !== cells.length;
  };

  it('a walk across someone else\'s cell is never paused on it: the prompt comes before the hop', () => {
    const s = crossing();
    const out = ok(applyAction(s, { type: 'move', unit: 'rogue_0', to: cellOf({ x: 13.25, z: 10.25 }) }));
    assert.equal(out.state.pending?.kind, 'opportunity');
    assert.deepEqual(out.state.units.rogue_0.pos, { x: 11.25, z: 10.25 });
    assert.equal(shared(out.state), false);
    const on = ok(applyAction(out.state, { type: 'react', unit: 'a', take: false }));
    assert.deepEqual(on.state.units.rogue_0.pos, { x: 13.25, z: 10.25 });
    assert.equal(shared(on.state), false);
  });

  it('a mover dropped by an opportunity attack falls on its own cell, not on the one it was crossing', () => {
    for (let seed = 1; seed < 80; seed++) {
      const s = crossing('ai');
      s.seed = seed;
      s.units.rogue_0.hp = 1;
      const out = ok(applyAction(s, { type: 'move', unit: 'rogue_0', to: cellOf({ x: 13.25, z: 10.25 }) }));
      if (!out.state.units.rogue_0.down) continue;
      assert.deepEqual(out.state.units.rogue_0.pos, { x: 11.25, z: 10.25 });
      assert.equal(shared(out.state), false);
      return;
    }
    assert.fail('no seed drops the mover');
  });

  it('Kawarimi: a player ninja is asked, and the blow strikes a log', () => {
    let hit: ReturnType<typeof applyAction> | undefined;
    for (let seed = 1; seed < 60 && !hit; seed++) {
      const { state } = createBattle(setup({ seed, party: [{ character: { ...KENJI, effects: [] }, pos: { x: 8, z: 10 } }] }));
      const s = turnOf(state, 'rogue_0');
      place(s, 'rogue_0', { x: 9.5, z: 10 });
      const out = ok(applyAction(s, { type: 'attack', unit: 'rogue_0', target: KENJI.id }));
      if (out.state.pending?.kind === 'kawarimi') hit = out;
    }
    assert.ok(hit, 'some seed lands a hit');
    const hp = hit.state.units[KENJI.id].hp;
    const swap = ok(applyAction(hit.state, { type: 'react', unit: KENJI.id, take: true }));
    const k = swap.state.units[KENJI.id];
    assert.equal(k.hp, hp);
    assert.ok(swap.events.some((e) => e.t === 'kawarimi'));
    assert.ok(dist(k.pos, hit.state.units[KENJI.id].pos) >= 2.9);
    const take = ok(applyAction(hit.state, { type: 'react', unit: KENJI.id, take: false }));
    assert.ok(take.state.units[KENJI.id].hp < hp || take.state.units[KENJI.id].tempHp < hit.state.units[KENJI.id].tempHp);
  });

  it('a melee blow can knock an enemy out instead of killing it', () => {
    const s = duel();
    const ev: BattleEvent[] = [];
    damage(s, s.units.rogue_0, 999, 'Slashing', { knockout: true, melee: true, source: 'a' }, ev);
    assert.equal(s.units.rogue_0.down, 'ko');
    const r = battleResult({ ...s, outcome: 'victory' });
    assert.equal(r.enemies[0].state, 'ko');
  });
});

describe('jutsu', () => {
  it('pays chakra, hits everyone in the area (allies too) and burns the bushes', () => {
    const s = turnOf(createBattle(setup({ party: [
      { character: hero({ id: 'a' }), pos: { x: 8, z: 10 } },
      { character: hero({ id: 'b' }), pos: { x: 14, z: 11 } },
    ] })).state, 'a');
    const chakra = s.units.a.chakra;
    const out = ok(applyAction(s, { type: 'jutsu', unit: 'a', jutsu: 'fireball_goukakyu', at: { x: 14, z: 10.5 } }));
    assert.equal(out.state.units.a.chakra, chakra - 3);
    const saves = out.events.filter((e) => e.t === 'save').map((e) => (e.t === 'save' ? e.unit : ''));
    assert.ok(saves.includes('rogue_0') && saves.includes('b'));
  });

  it('enhanced reaches further: a longer, wider cone and a bigger circle', () => {
    const fire = JUTSU.great_fire_annihilation;
    const big = enhanced(fire);
    assert.equal(big.length, (fire.length ?? 0) * 1.25);
    assert.ok((big.angle ?? 0) > (fire.angle ?? 0));
    const kirin = JUTSU.kirin_thunder;
    assert.equal(enhanced(kirin).radius, (kirin.radius ?? 0) * 1.5);
    assert.equal(enhanced(kirin).dice, '10d10');
  });

  it('enhanced costs more and adds a die', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    const out = ok(applyAction(s, { type: 'jutsu', unit: 'a', jutsu: 'fireball_goukakyu', at: { x: 14, z: 10 }, enhanced: true }));
    assert.equal(out.state.units.a.chakra, s.units.a.chakra - 5);
    assert.equal(applyAction(s, { type: 'jutsu', unit: 'a', jutsu: 'chidori_lightning_blade', at: { x: 14, z: 10 } }).reason, 'unknownJutsu');
  });

  it('an earth wall or a water barrier never rises over anyone', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    s.units.a.jutsus.push('earth_wall_doryuheki', 'water_shield_suijinheki');
    for (const jutsu of ['earth_wall_doryuheki', 'water_shield_suijinheki']) {
      const out = ok(applyAction(s, { type: 'jutsu', unit: 'a', jutsu, at: { x: 11.25, z: 10.25 } }));
      assert.equal(out.state.walls.length, 1);
      // It knows who raised it (it stands in that ninja's chakra colour), and stays unbreakable:
      // no Kōton structure of theirs, nothing to strike.
      const w = out.state.walls[0];
      assert.equal(w.owner, 'a');
      assert.ok(!breakable(w));
      assert.deepEqual(ownStructures(out.state, 'a'), []);
      // Over the rogue: refused before paying.
      const over = applyAction(s, { type: 'jutsu', unit: 'a', jutsu, at: { ...s.units.rogue_0.pos } });
      assert.equal(over.reason, 'occupied');
      assert.equal(over.state.units.a.chakra, s.units.a.chakra);
    }
  });
});

describe('the hydra', () => {
  function lair() {
    const { state } = createBattle(setup({
      party: [{ character: hero({ id: 'a' }), pos: { x: 10, z: 14 } }],
      enemies: [{ kind: 'hydra', pos: { x: 16, z: 8 } }],
    }));
    return state;
  }
  const head = (s: BattleState, i: number): Unit => s.units[`${HYDRA_ID}_head_${i}`];

  it('has seven heads acting right after the body', () => {
    const s = lair();
    const heads = Object.values(s.units).filter((u) => u.kind === 'hydra_head');
    assert.equal(heads.length, 7);
    const b = s.order.indexOf(HYDRA_ID);
    assert.deepEqual(s.order.slice(b + 1, b + 8), heads.map((h) => h.id));
  });

  it('a cut head grows back after two of its turns unless its stump is sealed', () => {
    const s = lair();
    const ev: BattleEvent[] = [];
    const h = head(s, 0);
    damage(s, h, 999, 'Slashing', {}, ev);
    assert.ok(h.head!.severed && !h.head!.sealed);
    // Cutting with fire is not enough: the stump needs its own hit.
    const h2 = head(s, 1);
    damage(s, h2, 999, 'Fire', {}, ev);
    assert.ok(h2.head!.severed && !h2.head!.sealed);
    damage(s, h2, 1, 'Lightning', { source: 'a' }, ev);
    assert.ok(h2.head!.sealed);
    // The seal names whose lightning it was (its flare plays in their chakra colour).
    assert.ok(ev.some((e) => e.t === 'seal' && e.unit === h2.id && e.how === 'lightning' && e.source === 'a'));
    const h3 = head(s, 2);
    damage(s, h3, 999, 'Piercing', {}, ev);
    damage(s, h3, 5, 'Bludgeoning', { explosion: true }, ev);
    assert.ok(h3.head!.sealed);
    // Walk the rounds: head 0 misses two turns, then rises; heads 1 and 2 stay down.
    let t = s;
    const regrown: string[] = [];
    for (let i = 0; i < 40 && t.round < 5; i++) {
      const u = current(t)!;
      const e: BattleEvent[] = [];
      endTurn(t, e);
      for (const x of e) if (x.t === 'regrow') regrown.push(x.unit);
      void u;
      t = structuredClone(t);
    }
    assert.deepEqual(regrown, [head(s, 0).id]);
  });

  it('dies when every head is cut at once, or its body falls', () => {
    const s = lair();
    const ev: BattleEvent[] = [];
    for (let i = 0; i < 7; i++) damage(s, head(s, i), 999, 'Slashing', {}, ev);
    assert.equal(s.units[HYDRA_ID].down, 'dead');
    const s2 = lair();
    damage(s2, s2.units[HYDRA_ID], 9999, 'Fire', {}, ev);
    assert.equal(s2.units[HYDRA_ID].down, 'dead');
    assert.ok(Object.values(s2.units).filter((u) => u.kind === 'hydra_head').every((h) => h.down === 'dead'));
  });

  it('the AI heads bite, spit or roar on their turns', () => {
    const s = lair();
    place(s, 'a', { x: 14, z: 10.5 });
    const t = turnOf(s, head(s, 3).id);
    const a = aiAction(t);
    assert.ok(a && (a.type === 'attack' || a.type === 'jutsu'));
  });

  it('a ninja right under a head leaves its roar no direction: the head picks another move, never a refused one', () => {
    const { state } = createBattle(setup({
      party: [
        { character: hero({ id: 'a' }), pos: { x: 10, z: 14 } },
        { character: hero({ id: 'b' }), pos: { x: 9, z: 14 } },
        { character: hero({ id: 'c' }), pos: { x: 9, z: 15 } },
      ],
      enemies: [{ kind: 'hydra', pos: { x: 28.4, z: 15.2 } }],
    }));
    for (let i = 0; i < 7; i++) {
      const s = turnOf(state, head(state, i).id);
      const h = s.units[head(s, i).id];
      // One right under the head, two in front of it, and the roar it planned aimed at the first.
      s.units.a.pos = { ...h.pos };
      s.units.b.pos = { x: h.pos.x - 2, z: h.pos.z };
      s.units.c.pos = { x: h.pos.x - 2.5, z: h.pos.z + 1 };
      h.intent = { kind: 'roar', what: 'hydra_roar', target: 'a', at: { ...h.pos } };
      assert.equal(applyAction(s, { type: 'jutsu', unit: h.id, jutsu: 'hydra_roar', at: { ...h.pos } }).reason, 'needDirection');
      ok(applyAction(s, aiAction(s)!));
      assert.ok(headOptions(s, h).every((o) => o.intent.kind !== 'roar' || o.intent.target !== 'a'));
    }
  });
});

describe('Mirai: Eye of Tomorrow, Premonitory Evasion, Pursuing Flame', () => {
  const mirai = (dojutsu: ShinobiCharacter['dojutsu'] = 'None') => hero({ id: 'm', name: 'Ren', clan: 'Mirai', dojutsu });

  /** A rogue next to a player Mirai strikes it on its turn: the first seed whose blow lands. */
  function struck(before: (s: BattleState) => void = () => {}): ReturnType<typeof applyAction> {
    for (let seed = 1; seed < 60; seed++) {
      const s = turnOf(createBattle(setup({ seed, party: [{ character: mirai(), pos: { x: 8, z: 10 } }] })).state, 'rogue_0');
      place(s, 'rogue_0', { x: 9.5, z: 10 });
      before(s);
      const out = ok(applyAction(s, { type: 'attack', unit: 'rogue_0', target: 'm' }));
      if (out.events.some((e) => e.t === 'attack' && e.roll.success)) return out;
    }
    throw new Error('no seed hits');
  }

  it('reads what each enemy in sight will do next', () => {
    const { state } = createBattle(setup({ party: [{ character: mirai(), pos: { x: 8, z: 10 } }] }));
    const seen = foreseen(state);
    assert.ok(seen.rogue_0);
    assert.equal(seen.rogue_0.target, 'm');
    const { state: other } = createBattle(setup());
    assert.deepEqual(foreseen(other), {});
  });

  it('enemies follow the plan the Mirai saw, if it still makes sense', () => {
    const { state } = createBattle(setup({ party: [{ character: mirai(), pos: { x: 8, z: 10 } }] }));
    const s = turnOf(state, 'rogue_0');
    const plan = s.units.rogue_0.intent!;
    assert.deepEqual(planIntent(s, s.units.rogue_0)?.kind, plan.kind);
  });

  it('the plan says where the enemy will walk, and it walks exactly there', () => {
    const { state } = createBattle(setup({ party: [{ character: mirai(), pos: { x: 8, z: 10 } }], enemies: [{ kind: 'rogue', pos: { x: 33, z: 10 } }] }));
    assert.ok(dist(state.units.rogue_0.pos, state.units.m.pos) > 23);
    const plan = state.units.rogue_0.intent!;
    assert.ok(plan.to, 'a far enemy plans its walk');
    // Nothing changed before its turn: it goes where the Eye showed.
    const s = turnOf(state, 'rogue_0');
    const a = aiAction(s);
    assert.ok(a?.type === 'move');
    assert.deepEqual(a.to, cellOf(plan.to));
    assert.deepEqual(ok(applyAction(s, a)).state.units.rogue_0.pos, plan.to);
    // Close enough to act from where it stands, it plans no walk.
    assert.equal(createBattle(setup({ party: [{ character: mirai(), pos: { x: 8, z: 10 } }] })).state.units.rogue_0.intent?.to, undefined);
    // Two enemies never plan to stop on the same spot (the raider's best one is the rogue's).
    const pair = createBattle(setup({ party: [{ character: mirai(), pos: { x: 7, z: 10 } }], enemies: [{ kind: 'rogue', pos: { x: 19, z: 9.5 } }, { kind: 'raider', pos: { x: 22, z: 10.5 } }] })).state;
    const [p0, p1] = [pair.units.rogue_0.intent?.to, pair.units.raider_0.intent?.to];
    assert.ok(p0 && p1);
    assert.notDeepEqual(cellOf(p0), cellOf(p1));
  });

  it('Premonitory Evasion: a player Mirai is asked, steps aside and the blow misses', () => {
    const hit = struck();
    assert.equal(hit.state.pending?.kind, 'evasion');
    assert.ok(hit.events.some((e) => e.t === 'reactionAsk'));
    const m = hit.state.units.m;
    const take = ok(applyAction(hit.state, { type: 'react', unit: 'm', take: true }));
    const after = take.state.units.m;
    assert.equal(after.hp, m.hp);
    const d = dist(after.pos, m.pos);
    assert.ok(d >= 1 && d <= 1.6, `stepped ${d} m`);
    assert.equal(after.chakra, m.chakra - 2);
    assert.equal(after.turn.reaction, false);
    assert.ok(take.events.some((e) => e.t === 'evade' && e.unit === 'm'));
    assert.ok(!take.events.some((e) => e.t === 'damage'));
    // The step provokes no opportunity attack.
    assert.equal(take.state.pending, undefined);
  });

  it('letting Evasion go offers Kawarimi for the same blow', () => {
    const hit = struck((s) => {
      s.units.m.jutsus.push('substitution_kawarimi');
      s.units.m.armed = false;
    });
    const p = hit.state.pending;
    assert.ok(p?.kind === 'evasion');
    const no = ok(applyAction(hit.state, { type: 'react', unit: 'm', take: false }));
    const k = no.state.pending;
    assert.ok(k?.kind === 'kawarimi');
    assert.equal(k.hit.amount, p.hit.amount);
    assert.equal(k.hit.source, 'rogue_0');
    assert.equal(no.state.units.m.chakra, hit.state.units.m.chakra);
    // Letting both go: the blow lands.
    const land = ok(applyAction(no.state, { type: 'react', unit: 'm', take: false }));
    assert.ok(land.state.units.m.hp < hit.state.units.m.hp);
  });

  it('is not offered against an area, a blow from hiding, or once the reaction is spent', () => {
    // A fireball is an area, not one attack.
    const { state } = createBattle(setup({ party: [{ character: mirai(), pos: { x: 8, z: 10 } }] }));
    const fire = ok(applyAction(turnOf(state, 'rogue_0'), { type: 'jutsu', unit: 'rogue_0', jutsu: 'fireball_goukakyu', at: { ...state.units.m.pos } }));
    assert.ok(fire.events.some((e) => e.t === 'damage' && e.unit === 'm'));
    assert.ok(!fire.state.pending && !fire.events.some((e) => e.t === 'evade'));
    // From hiding: the Mirai never saw it coming.
    const unseen = struck((s) => {
      s.units.rogue_0.cond.hidden = 30;
    });
    assert.equal(unseen.state.pending, undefined);
    assert.ok(unseen.events.some((e) => e.t === 'damage' && e.unit === 'm'));
    // Once a round: the reaction went on the first blow, so the second one lands.
    const first = ok(applyAction(struck().state, { type: 'react', unit: 'm', take: true })).state;
    assert.equal(first.units.m.turn.reaction, false);
    let landed = false;
    for (let seed = 1; seed < 60 && !landed; seed++) {
      const t = structuredClone(first);
      t.seed = seed;
      t.units.rogue_0.turn.action = true;
      place(t, 'rogue_0', t.units.m.pos);
      const again = ok(applyAction(t, { type: 'attack', unit: 'rogue_0', target: 'm' }));
      if (!again.events.some((e) => e.t === 'attack' && e.roll.success)) continue;
      landed = true;
      assert.equal(again.state.pending, undefined);
      assert.ok(again.state.units.m.hp < first.units.m.hp);
    }
    assert.ok(landed, 'some seed lands the second blow');
  });

  it('an enemy Mirai steps aside on its own from a blow that would drop it', () => {
    let hit: ReturnType<typeof applyAction> | undefined;
    let chakra = 0;
    for (let seed = 1; seed < 60 && !hit; seed++) {
      const s = turnOf(createBattle(setup({ seed })).state, 'a');
      place(s, 'rogue_0', { x: 9.5, z: 10 });
      s.units.rogue_0.hp = 1;
      // Hidden (where Aki still sees it): stepping out into the open gives it away.
      s.units.rogue_0.cond.hidden = 5;
      chakra = s.units.rogue_0.chakra;
      const out = ok(applyAction(s, { type: 'attack', unit: 'a', target: 'rogue_0' }));
      if (out.events.some((e) => e.t === 'attack' && e.roll.success)) hit = out;
    }
    assert.ok(hit, 'some seed lands a hit');
    assert.equal(hit.state.units.rogue_0.hp, 1);
    assert.equal(hit.state.units.rogue_0.chakra, chakra - 2);
    assert.ok(hit.events.some((e) => e.t === 'evade' && e.unit === 'rogue_0'));
    assert.equal(hit.state.units.rogue_0.cond.hidden, undefined);
  });

  it('the AI: a Fireball that would now catch a friend gives way to Pursuing Flame', () => {
    const { state } = createBattle(setup({ enemies: [{ kind: 'rogue', pos: { x: 16, z: 10 } }, { kind: 'raider', pos: { x: 20, z: 14 } }] }));
    const s = turnOf(state, 'rogue_0');
    s.units.rogue_0.intent = { kind: 'jutsu', what: 'fireball_goukakyu', target: 'a', at: { ...s.units.a.pos } };
    const planned = aiAction(s);
    assert.ok(planned?.type === 'jutsu' && planned.jutsu === 'fireball_goukakyu', JSON.stringify(planned));
    // The raider has stepped in beside Aki since the plan was made: the blast would catch it.
    place(s, 'raider_0', { x: 9.25, z: 10.25 });
    const a = aiAction(s);
    assert.ok(a?.type === 'jutsu' && a.jutsu === 'katon_pursuing_flame' && a.target === 'a', JSON.stringify(a));
    ok(applyAction(s, a));
  });

  it('the AI (D21): an enemy Mirai opens with Pursuing Flame, then casts it every other jutsu in place of one up to 2.5 flames', () => {
    // A rogue (a Mirai) 8 m from Aki: where it would cast a Fireball, its first jutsu is the flame.
    const { state } = createBattle(setup({ enemies: [{ kind: 'rogue', pos: { x: 16, z: 10 } }] }));
    const s = turnOf(state, 'rogue_0');
    const r = s.units.rogue_0;
    const plan = (t: BattleState) => {
      const i = planIntent(t, t.units.rogue_0);
      return [i?.kind, i?.what, i?.target];
    };
    assert.deepEqual([r.intent?.kind, r.intent?.what, r.intent?.target], ['jutsu', 'katon_pursuing_flame', 'a']);
    const a = aiAction(s);
    assert.ok(a?.type === 'jutsu' && a.jutsu === 'katon_pursuing_flame' && a.target === 'a', JSON.stringify(a));
    assert.equal(ok(applyAction(s, a)).state.units.rogue_0.stats2.jutsuCast, 1);
    // Then the Fireball, then the flame again: the flame alternates with a jutsu up to 2.5 flames.
    r.stats2.jutsuCast = 1;
    assert.deepEqual(plan(s), ['jutsu', 'fireball_goukakyu', 'a']);
    r.stats2.jutsuCast = 2;
    assert.deepEqual(plan(s), ['jutsu', 'katon_pursuing_flame', 'a']);
    // A Fireball that catches two foes is never given up for it.
    const pair = turnOf(createBattle(setup({
      party: [{ character: hero({ id: 'a', name: 'Aki' }), pos: { x: 8, z: 10 } }, { character: hero({ id: 'b', name: 'Bo' }), pos: { x: 8, z: 11 } }],
      enemies: [{ kind: 'rogue', pos: { x: 16, z: 10 } }],
    })).state, 'rogue_0');
    assert.deepEqual(plan(pair).slice(0, 2), ['jutsu', 'fireball_goukakyu']);
    // Kagero keeps his Chidori (worth more than 2.5 flames), opening with it too (the owner,
    // 2026-10-20; he opened with the flame before).
    const kagero = turnOf(createBattle(setup({ enemies: [{ kind: 'jonin', pos: { x: 14, z: 10 } }] })).state, 'jonin_0');
    const k = (cast: number) => {
      kagero.units.jonin_0.stats2.jutsuCast = cast;
      return planIntent(kagero, kagero.units.jonin_0)?.what;
    };
    assert.deepEqual([k(0), k(1), k(2)], ['chidori_lightning_blade', 'chidori_lightning_blade', 'chidori_lightning_blade']);
    // A Mirai of the party on the AI just plays its best move: the Fireball.
    const ally = hero({ id: 'm', name: 'Ren', clan: 'Mirai', selectedJutsus: { ...DEFAULT_CHARACTER.selectedJutsus, slot3Elemental: '', slot4Clan: '', slot5Ultimate: '' } });
    const own = turnOf(createBattle(setup({ party: [{ character: ally, pos: { x: 8, z: 10 }, controller: 'ai' }], enemies: [{ kind: 'raider', pos: { x: 16, z: 10 } }] })).state, 'm');
    assert.equal(planIntent(own, own.units.m)?.what, 'fireball_goukakyu');
  });

  it('Katon: Pursuing Flame: Mirai only, 3 chakra, 12 m, a DEX save with disadvantage for half', () => {
    const duel = (clan: ShinobiCharacter['clan'], far: number): BattleState => {
      const s = turnOf(createBattle(setup({ party: [{ character: hero({ id: 'm', clan }), pos: { x: 8, z: 10 } }], enemies: [{ kind: 'raider', pos: { x: 20, z: 10 } }] })).state, 'm');
      s.units.m.pos = { x: 8.25, z: 10.25 };
      s.units.raider_0.pos = { x: 8.25 + far, z: 10.25 };
      return s;
    };
    const cast = (s: BattleState) => applyAction(s, { type: 'jutsu', unit: 'm', jutsu: 'katon_pursuing_flame', at: { ...s.units.raider_0.pos }, target: 'raider_0' });
    assert.equal(cast(duel('Ryusei', 12)).reason, 'unknownJutsu');
    assert.equal(cast(duel('Mirai', 12.5)).reason, 'outOfRange');
    const s = duel('Mirai', 12);
    assert.ok(lineOfSight(s, s.units.m.pos, s.units.raider_0.pos));
    const out = ok(cast(s));
    assert.equal(out.state.units.m.chakra, s.units.m.chakra - 3);
    assert.equal(out.state.units.m.turn.action, false);
    const save = out.events.find((e) => e.t === 'save' && e.unit === 'raider_0');
    assert.ok(save?.t === 'save');
    assert.equal(save.roll.rolls.length, 2);
    assert.equal(save.roll.d20, Math.min(...save.roll.rolls));
    // The same flame (the dice are rolled before the save) against a save it can't make and one
    // it can't miss: a success takes half.
    const burn = (dc: number): number => {
      const t = structuredClone(s);
      t.units.m.saveDC = dc;
      const d = ok(cast(t)).events.find((e) => e.t === 'damage' && e.unit === 'raider_0');
      return d?.t === 'damage' ? d.amount : 0;
    };
    const full = burn(99);
    assert.ok(full >= 2);
    assert.equal(burn(-99), Math.floor(full / 2));
  });
});

describe('clans: phase 1 foundation', () => {
  it('the old clan abilities are gone', () => {
    // A Ryusei (once Uddo) gets no chakra back at the start of its turn.
    const s = turnOf(createBattle(setup()).state, 'rogue_0');
    assert.equal(s.units.a.character?.clan, 'Ryusei');
    s.units.a.chakra = 5;
    const out = ok(applyAction(s, { type: 'endTurn', unit: 'rogue_0' }));
    assert.equal(current(out.state)?.id, 'a');
    assert.equal(out.state.units.a.chakra, 5);
    assert.ok(!out.events.some((e) => e.t === 'chakra' && e.reason === 'Uddo'));
    // A Northstar (once Taki) can be flanked.
    const f = turnOf(createBattle(setup({ party: [
      { character: hero({ id: 'a' }), pos: { x: 8, z: 10 } },
      { character: hero({ id: 'b' }), pos: { x: 8, z: 12 } },
    ] })).state, 'a');
    const r = f.units.rogue_0;
    r.character = { ...r.character!, clan: 'Northstar' };
    place(f, 'a', { x: r.pos.x - 1.5, z: r.pos.z });
    place(f, 'b', { x: r.pos.x + 1.5, z: r.pos.z });
    assert.ok(attackPreview(f, f.units.a, r, 'melee').reasons.includes('flanking'));
    // A Mirai has no parry on top of its AC.
    const m = turnOf(createBattle(setup({ party: [{ character: hero({ id: 'm', clan: 'Mirai', dojutsu: 'Sharingan (3-Tomoe)' }), pos: { x: 8, z: 10 } }] })).state, 'rogue_0');
    place(m, 'rogue_0', { x: 9.5, z: 10 });
    assert.equal(attackPreview(m, m.units.rogue_0, m.units.m, 'melee').ac, m.units.m.ac);
  });

  it('the clan\'s ability bonus counts in battle: the scores a unit fights with, its saves and its numbers (D2)', () => {
    const s = createBattle(setup()).state;
    // Solen, a Ryusei Bukijutsu Master: DEX 14 and WIS 16 play as 16 and 17.
    const a = s.units.a;
    const base = DEFAULT_CHARACTER.stats;
    assert.deepEqual(a.stats, { ...base, dex: base.dex + 2, wis: base.wis + 1 });
    assert.equal(a.character?.stats, base, 'the sheet keeps the base scores');
    assert.equal(saveMod(a, 'dex'), 3 + 3, 'DEX 16, proficient at level 6');
    assert.equal(a.castMod, 3);
    assert.deepEqual([a.ac, a.saveDC, a.jutsuAttack], [DEFAULT_CHARACTER.armorClass, DEFAULT_CHARACTER.jutsuSaveDC, DEFAULT_CHARACTER.jutsuAttackBonus]);
    // An enemy too: a rogue (a Mirai Bukijutsu Master, DEX 15) fights with DEX 17.
    const r = s.units.rogue_0;
    assert.equal(r.character?.stats.dex, 15);
    assert.equal(r.stats.dex, 17);
    assert.equal(r.saveDC, 8 + 2 + 3);
    assert.equal(r.character?.sheetVersion, 2);
  });

  it('enemies have ranks', () => {
    const { state } = createBattle(setup({ enemies: [
      { kind: 'rogue', pos: { x: 14, z: 10 } },
      { kind: 'hunter', pos: { x: 16, z: 10 } },
      { kind: 'raider', pos: { x: 14, z: 13 } },
      { kind: 'jonin', pos: { x: 16, z: 13 } },
    ] }));
    assert.equal(state.units.rogue_0.rank, 'minion');
    assert.equal(state.units.hunter_0.rank, 'minion');
    assert.equal(state.units.raider_0.rank, 'minion');
    assert.equal(state.units.jonin_0.rank, 'captain');
    assert.equal(state.units.a.rank, undefined);
    const lair = createBattle(setup({ party: [{ character: hero({ id: 'a' }), pos: { x: 10, z: 14 } }], enemies: [{ kind: 'hydra', pos: { x: 16, z: 8 } }] })).state;
    const hydra = Object.values(lair.units).filter((u) => u.kind !== 'ninja');
    assert.equal(hydra.length, 8);
    assert.ok(hydra.every((u) => u.rank === 'boss'));
    // An encounter can name another rank.
    assert.equal(createBattle(setup({ enemies: [{ kind: 'rogue', pos: { x: 14, z: 10 }, rank: 'subboss' }] })).state.units.rogue_0.rank, 'subboss');
  });

  describe('metal structures', () => {
    const metal = (): Wall => ({ id: 'w1', kind: 'metal', a: { x: 11, z: 8 }, b: { x: 11, z: 12.5 }, hp: 20, maxHp: 20 });
    const block = (): Wall => ({ id: 'b1', kind: 'metalBlock', a: { x: 8.25, z: 12.75 }, b: { x: 8.25, z: 12.75 }, hp: 20, maxHp: 20 });

    it('a metal wall blocks the way, sight, blows across it and areas from the far side', () => {
      const s = turnOf(createBattle(setup({ party: [
        { character: hero({ id: 'a' }), pos: { x: 10.25, z: 10.25 } },
        { character: hero({ id: 'b' }), pos: { x: 16.25, z: 10.25 } },
      ] })).state, 'a');
      s.walls.push(metal());
      place(s, 'rogue_0', { x: 11.75, z: 10.25 });
      assert.equal(dist(s.units.a.pos, s.units.rogue_0.pos), 1.5);
      assert.ok(cellBlocked(s, cellOf({ x: 10.9, z: 10.25 })) && cellBlocked(s, cellOf({ x: 11.1, z: 10.25 })));
      assert.equal(lineOfSight(s, s.units.a.pos, s.units.rogue_0.pos), false);
      assert.equal(applyAction(s, { type: 'attack', unit: 'a', target: 'rogue_0' }).reason, 'blocked');
      assert.equal(applyAction(s, { type: 'shove', unit: 'a', target: 'rogue_0', mode: 'push' }).reason, 'blocked');
      // A fireball bursting on the far side: the rogue is caught, Aki behind the wall is not, and
      // the wall takes the blast.
      const fire = ok(applyAction(turnOf(s, 'b'), { type: 'jutsu', unit: 'b', jutsu: 'fireball_goukakyu', at: { x: 12, z: 10.25 } }));
      const saves = fire.events.filter((e) => e.t === 'save').map((e) => (e.t === 'save' ? e.unit : ''));
      assert.ok(saves.includes('rogue_0'));
      assert.ok(!saves.includes('a'));
      assert.ok(fire.events.some((e) => e.t === 'wallHit' && e.wall === 'w1'));
      const w = fire.state.walls.find((x) => x.id === 'w1');
      assert.ok(!w || w.hp < 20);
    });

    it('a metal block fills its 3 × 3 cells and gives half cover without hiding anyone', () => {
      const s = turnOf(createBattle(setup()).state, 'a');
      s.walls.push(block());
      for (const dx of [-0.5, 0, 0.5]) for (const dz of [-0.5, 0, 0.5]) assert.ok(cellBlocked(s, cellOf({ x: 8.25 + dx, z: 12.75 + dz })));
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) assert.equal(cellBlocked(s, cellOf({ x: 8.25 + dx, z: 12.75 + dz })), false);
      assert.equal(coverBetween(s, { x: 4.25, z: 12.75 }, { x: 9.75, z: 12.75 }), 2);
      assert.equal(lineOfSight(s, { x: 4.25, z: 12.75 }, { x: 9.75, z: 12.75 }), true);
      // Cover the attacker stands behind doesn't count.
      assert.equal(coverBetween(s, { x: 7.25, z: 12.75 }, { x: 12.25, z: 12.75 }), 0);
    });

    it('can be struck down: AC 10, the weapon\'s dice, gone at 0 HP', () => {
      const s = turnOf(createBattle(setup()).state, 'a');
      s.walls.push(block());
      place(s, 'a', { x: 8.25, z: 11.25 });
      const strike = (from: BattleState): ReturnType<typeof applyAction> => {
        for (let seed = 1; seed < 40; seed++) {
          const t = structuredClone(from);
          t.seed = seed;
          const out = ok(applyAction(t, { type: 'attack', unit: 'a', target: 'wall:b1' }));
          if (out.events.some((e) => e.t === 'wallHit')) return out;
        }
        throw new Error('no seed hits');
      };
      const hit = strike(s);
      const atk = hit.events.find((e) => e.t === 'attack');
      assert.ok(atk?.t === 'attack' && atk.target === 'wall:b1' && atk.roll.dc === 10);
      assert.ok(hit.state.walls.find((w) => w.id === 'b1')!.hp < 20);
      s.walls[0].hp = 1;
      const broken = strike(s);
      assert.equal(broken.state.walls.some((w) => w.id === 'b1'), false);
      assert.ok(broken.events.some((e) => e.t === 'wall' && !e.on && e.wall.id === 'b1'));
      assert.equal(cellBlocked(broken.state, cellOf({ x: 8.25, z: 12.75 })), false);
      // Earth walls stay unbreakable.
      const earth = turnOf(createBattle(setup()).state, 'a');
      earth.walls.push({ ...block(), kind: 'earth', b: { x: 8.25, z: 14 } });
      place(earth, 'a', { x: 8.25, z: 11.25 });
      assert.equal(applyAction(earth, { type: 'attack', unit: 'a', target: 'wall:b1' }).reason, 'badTarget');
    });

    it('nothing passes it: no shove through it, no lightning along the water, no blast from behind another', () => {
      // A push that lands beyond a wall is stopped short (an earth wall too).
      for (const kind of ['metal', 'earth'] as const) {
        const s = turnOf(createBattle(setup()).state, 'a');
        place(s, 'rogue_0', { x: 9.25, z: 10.25 });
        s.walls.push({ id: 'w1', kind, a: { x: 9.85, z: 8.5 }, b: { x: 9.85, z: 12 }, hp: 20 });
        const shoved = (t: BattleState) => applyAction(t, { type: 'shove', unit: 'a', target: 'rogue_0', mode: 'push' });
        let out: ReturnType<typeof applyAction> | undefined;
        for (let seed = 1; seed < 40 && !out; seed++) {
          const t = structuredClone(s);
          t.seed = seed;
          const o = ok(shoved(t));
          if (o.events.some((e) => e.t === 'check' && e.what === 'shove' && e.roll.success)) out = o;
        }
        assert.ok(out, 'some seed wins the shove');
        assert.deepEqual(out.state.units.rogue_0.pos, { x: 9.25, z: 10.25 }, kind);
        assert.ok(out.events.some((e) => e.t === 'note' && e.key === 'shoveBlocked'));
        // With no wall, the same shove pushes it 1.5 m.
        const open = structuredClone(s);
        open.walls = [];
        open.seed = out.state.seed;
        assert.deepEqual(ok(shoved(open)).state.units.rogue_0.pos, { x: 10.75, z: 10.25 });
      }
      // Lightning landing in the river runs to the rogue in the water on its side, not to the one
      // behind a metal wall.
      const river = createBattle(setup({ enemies: [{ kind: 'rogue', pos: { x: 25.25, z: 11.25 } }, { kind: 'rogue', pos: { x: 25.25, z: 14.75 } }] })).state;
      assert.ok(waterAtPt(river, river.units.rogue_0.pos) && waterAtPt(river, river.units.rogue_1.pos));
      const zapped: BattleEvent[] = [];
      const zap = (t: BattleState) => electrify(t, [{ x: 25.25, z: 12.25 }], 10, 13, 'a', [], zapped).map((h) => h.unit);
      assert.deepEqual(zap(river), ['rogue_0', 'rogue_1']);
      // The water lights up in the caster's lightning (its chakra colour on the screen).
      assert.ok(zapped.some((e) => e.t === 'electrified' && e.source === 'a'));
      river.walls.push({ id: 'w1', kind: 'metal', a: { x: 23.5, z: 13.5 }, b: { x: 27, z: 13.5 }, hp: 20, maxHp: 20 });
      assert.deepEqual(zap(river), ['rogue_0']);
      // A blast reaching two structures dents the near one; the one sheltered behind it is spared.
      const yard = turnOf(createBattle(setup()).state, 'a');
      yard.walls.push(metal(), { ...block(), a: { x: 12.25, z: 10.25 }, b: { x: 12.25, z: 10.25 } });
      const ev: BattleEvent[] = [];
      hitStructuresIn(yard, { kind: 'circle', center: { x: 10, z: 10.25 }, radius: 3 }, 5, ev);
      assert.deepEqual(ev.flatMap((e) => (e.t === 'wallHit' ? [e.wall] : [])), ['w1']);
      yard.walls = yard.walls.filter((w) => w.id !== 'w1');
      hitStructuresIn(yard, { kind: 'circle', center: { x: 10, z: 10.25 }, radius: 3 }, 5, ev);
      assert.deepEqual(ev.flatMap((e) => (e.t === 'wallHit' ? [e.wall] : [])), ['w1', 'b1']);
    });

    it('a blade doesn\'t reach a structure across another metal wall, and striking one gives a hidden ninja away', () => {
      const s = turnOf(createBattle(setup()).state, 'a');
      s.walls.push(
        { id: 'near', kind: 'metal', a: { x: 8.85, z: 9 }, b: { x: 8.85, z: 11.5 }, hp: 20, maxHp: 20, owner: 'rogue_0' },
        { id: 'far', kind: 'metal', a: { x: 9.85, z: 9 }, b: { x: 9.85, z: 11.5 }, hp: 20, maxHp: 20, owner: 'rogue_0' },
      );
      assert.ok(structureAttack(s, s.units.a, s.walls[1], false).inRange);
      assert.equal(applyAction(s, { type: 'attack', unit: 'a', target: 'wall:far' }).reason, 'blocked');
      s.units.a.cond.hidden = 20;
      const out = ok(applyAction(s, { type: 'attack', unit: 'a', target: 'wall:near' }));
      assert.equal(out.state.units.a.cond.hidden, undefined);
      assert.ok(out.events.some((e) => e.t === 'condition' && e.unit === 'a' && e.cond === 'hidden' && !e.on));
    });
  });
});

describe('Kōton: Modular Architecture', () => {
  const koton = (over: Partial<ShinobiCharacter> = {}) => hero({ id: 'k', name: 'Hiro', clan: 'Koton', ...over });
  /** A Kōton at (8.25, 10.25) on its turn, the rogue 6 m away at (14.25, 10.25). */
  const kotonTurn = (over: Partial<BattleSetup> = {}): BattleState => turnOf(createBattle(setup({ party: [{ character: koton(), pos: { x: 8, z: 10 } }], ...over })).state, 'k');
  const raise = (s: BattleState, id: 'koton_block' | 'koton_wall', at: Pt) => applyAction(s, { type: 'jutsu', unit: 'k', jutsu: id, at });
  const own = (s: BattleState) => s.walls.filter((w) => w.owner === 'k');

  it('a block: bonus action, 2 chakra, a 1.5 m square of 20 HP that gives half cover and hides nobody', () => {
    const s = kotonTurn();
    assert.deepEqual(s.units.k.jutsus.slice(0, 2), ['koton_block', 'koton_wall']);
    const out = ok(raise(s, 'koton_block', { x: 10.1, z: 12.4 }));
    const k = out.state.units.k;
    assert.equal(k.chakra, s.units.k.chakra - 2);
    assert.equal(k.turn.bonus, false);
    assert.equal(k.turn.action, true);
    const [w] = out.state.walls;
    assert.deepEqual({ kind: w.kind, a: w.a, hp: w.hp, maxHp: w.maxHp, owner: w.owner }, { kind: 'metalBlock', a: { x: 10.25, z: 12.25 }, hp: 20, maxHp: 20, owner: 'k' });
    assert.ok(out.events.some((e) => e.t === 'wall' && e.on && e.wall.id === w.id));
    // Centred on the cell under the point: exactly the 3 × 3 cells around it.
    for (const dx of [-0.5, 0, 0.5]) for (const dz of [-0.5, 0, 0.5]) assert.ok(cellBlocked(out.state, cellOf({ x: 10.25 + dx, z: 12.25 + dz })));
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) assert.equal(cellBlocked(out.state, cellOf({ x: 10.25 + dx, z: 12.25 + dz })), false);
    assert.equal(lineOfSight(out.state, { x: 7.25, z: 12.25 }, { x: 13.25, z: 12.25 }), true);
    assert.equal(coverBetween(out.state, { x: 7.25, z: 12.25 }, { x: 13.25, z: 12.25 }), 2);
    // A bloodline ability: no seals (the blade stays drawn) and no enhanced version.
    assert.equal(k.armed, s.units.k.armed);
    assert.equal(applyAction(s, { type: 'jutsu', unit: 'k', jutsu: 'koton_block', at: { x: 10.1, z: 12.4 }, enhanced: true }).reason, 'noEnhanced');
  });

  it('a wall: action, 4 chakra, 4.5 m across the line it is cast along; it blocks sight', () => {
    const s = kotonTurn();
    assert.equal(lineOfSight(s, s.units.k.pos, s.units.rogue_0.pos), true);
    const out = ok(raise(s, 'koton_wall', { x: 11.25, z: 10.25 }));
    const k = out.state.units.k;
    assert.equal(k.chakra, s.units.k.chakra - 4);
    assert.equal(k.turn.action, false);
    assert.equal(k.turn.bonus, true);
    const [w] = out.state.walls;
    assert.equal(w.kind, 'metal');
    assert.equal(w.hp, 20);
    assert.ok(Math.abs(dist(w.a, w.b) - 4.5) < 1e-9);
    // Perpendicular to the caster's line, centred on the point.
    const along = { x: 11.25 - k.pos.x, z: 10.25 - k.pos.z };
    assert.ok(Math.abs((w.b.x - w.a.x) * along.x + (w.b.z - w.a.z) * along.z) < 1e-9);
    assert.deepEqual({ x: (w.a.x + w.b.x) / 2, z: (w.a.z + w.b.z) / 2 }, { x: 11.25, z: 10.25 });
    assert.equal(lineOfSight(out.state, k.pos, out.state.units.rogue_0.pos), false);
  });

  it('beats Mirai: a metal wall hides the enemy\'s next move from the Eye of Tomorrow', () => {
    const { state } = createBattle(setup({ party: [
      { character: hero({ id: 'm', name: 'Ren', clan: 'Mirai' }), pos: { x: 8, z: 10 } },
      { character: koton(), pos: { x: 8, z: 12 } },
    ] }));
    const s = turnOf(state, 'k');
    assert.ok(foreseen(s).rogue_0);
    const walled = ok(raise(s, 'koton_wall', { x: 11.25, z: 10.25 })).state;
    assert.equal(foreseen(walled).rogue_0, undefined);
    walled.walls = [];
    assert.ok(foreseen(walled).rogue_0);
  });

  it('two stand at most: raising a third makes the oldest crumble', () => {
    let s = kotonTurn();
    s = ok(raise(s, 'koton_block', { x: 9.25, z: 13.25 })).state;
    s = ok(raise(s, 'koton_wall', { x: 11.25, z: 10.25 })).state;
    const [first, second] = own(s).map((w) => w.id);
    assert.equal(own(s).length, 2);
    const out = ok(raise(turnOf(s, 'k'), 'koton_block', { x: 9.25, z: 7.25 }));
    assert.equal(own(out.state).length, 2);
    assert.deepEqual(own(out.state).map((w) => w.id)[0], second);
    assert.ok(!out.state.walls.some((w) => w.id === first));
    // It crumbles whole: gone with its HP left, not broken.
    const off = out.events.find((e) => e.t === 'wall' && !e.on);
    assert.ok(off?.t === 'wall' && off.wall.id === first && off.wall.hp === 20);
    assert.equal(cellBlocked(out.state, cellOf({ x: 9.25, z: 13.25 })), false);
  });

  it('is refused over anyone, beyond 6 m, out of sight, off the map, or to another clan', () => {
    const s = kotonTurn();
    // Over a unit: the rogue, the caster itself, or anyone the wall's length would cover.
    assert.equal(raise(s, 'koton_block', s.units.rogue_0.pos).reason, 'occupied');
    assert.equal(raise(s, 'koton_block', { x: 8.75, z: 10.25 }).reason, 'occupied');
    const under = structuredClone(s);
    place(under, 'rogue_0', { x: 11.25, z: 12.25 });
    assert.equal(raise(under, 'koton_wall', { x: 11.25, z: 10.25 }).reason, 'occupied');
    assert.equal(raise(s, 'koton_block', { x: 14.75, z: 10.25 }).reason, 'outOfRange');
    const hidden = structuredClone(s);
    hidden.walls.push({ id: 'e1', kind: 'earth', a: { x: 10, z: 8.5 }, b: { x: 10, z: 12 }, hp: 30 });
    assert.equal(raise(hidden, 'koton_block', { x: 11.25, z: 10.25 }).reason, 'noSight');
    const edge = structuredClone(s);
    place(edge, 'k', { x: 1.25, z: 10.25 });
    // Off the map, though well within 6 m: the reason says so (not "out of range").
    assert.ok(dist(edge.units.k.pos, { x: 0.1, z: 10.25 }) < 6);
    assert.equal(raise(edge, 'koton_block', { x: 0.1, z: 10.25 }).reason, 'offMap');
    // The hydra's bulk counts as someone.
    const lair = turnOf(createBattle(setup({ party: [{ character: koton(), pos: { x: 11, z: 8 } }], enemies: [{ kind: 'hydra', pos: { x: 16, z: 8 } }] })).state, 'k');
    assert.equal(raise(lair, 'koton_block', { x: 15, z: 8 }).reason, 'occupied');
    // Only a Kōton has it.
    const other = turnOf(createBattle(setup()).state, 'a');
    assert.equal(applyAction(other, { type: 'jutsu', unit: 'a', jutsu: 'koton_block', at: { x: 10, z: 12 } }).reason, 'unknownJutsu');
    assert.equal(s.walls.length, 0);
  });

  it('is loud: raised in the stealth phase, it starts the fight', () => {
    const s = createBattle(setup({ stealth: true, party: [{ character: koton(), pos: { x: 8, z: 10 } }], enemies: [{ kind: 'rogue', pos: { x: 20, z: 10 }, look: 180, route: [{ x: 20, z: 10 }] }] })).state;
    const out = ok(raise(s, 'koton_block', { x: 10.25, z: 12.25 }));
    assert.equal(out.state.phase, 'combat');
  });

  it('the AI: a Kōton in the open raises a block in front of itself, against the foe that sees it', () => {
    const { state } = createBattle(setup({ enemies: [{ kind: 'hunter', pos: { x: 14, z: 10 } }] }));
    const s = turnOf(state, 'hunter_0');
    s.units.hunter_0.turn.action = false;
    const a = aiAction(s);
    assert.ok(a?.type === 'jutsu' && a.jutsu === 'koton_block', JSON.stringify(a));
    const out = ok(applyAction(s, a));
    const h = out.state.units.hunter_0;
    const foe = out.state.units.a;
    // Sheltered from the hero, but the hero gets no cover from the hunter's own kunai and jutsu.
    assert.equal(coverBetween(out.state, foe.pos, h.pos, ['a', 'hunter_0']), 2);
    assert.equal(coverBetween(out.state, h.pos, foe.pos, ['a', 'hunter_0']), 0);
    // With its own block next to it, it doesn't raise another.
    const again = structuredClone(out.state);
    again.units.hunter_0.turn.bonus = true;
    assert.equal(aiAction(again)?.type, 'endTurn');
  });

  it('the AI (D21): a hurt Kōton raises its wall against the foes shooting at it, or for a hurt friend', () => {
    const two = [
      { character: hero({ id: 'a', name: 'Aki' }), pos: { x: 8, z: 10 } },
      { character: hero({ id: 'b', name: 'Bo' }), pos: { x: 8, z: 13 } },
    ];
    /** The hunter (a Kōton) 8 m from Aki and Bo, hurt, on its turn with no plan yet. */
    const hunted = (): BattleState => {
      const s = turnOf(createBattle(setup({ party: two, enemies: [{ kind: 'hunter', pos: { x: 16, z: 11.5 } }] })).state, 'hunter_0');
      s.units.hunter_0.hp = 10;
      s.units.hunter_0.intent = undefined;
      return s;
    };
    const s = hunted();
    for (const id of ['a', 'b']) assert.ok(lineOfSight(s, s.units[id].pos, s.units.hunter_0.pos), id);
    const a = aiAction(s);
    assert.ok(a?.type === 'jutsu' && a.jutsu === 'koton_wall', JSON.stringify(a));
    const out = ok(applyAction(s, a));
    // Neither can see it, nor strike it, now.
    for (const id of ['a', 'b']) assert.equal(lineOfSight(out.state, out.state.units[id].pos, out.state.units.hunter_0.pos), false, id);
    // One wall at a time: with its wall standing it raises no other.
    const walled = structuredClone(out.state);
    walled.units.hunter_0.turn.action = true;
    walled.units.hunter_0.intent = undefined;
    assert.notEqual((aiAction(walled) as { jutsu?: string } | null)?.jutsu, 'koton_wall');
    // Whole, or with a foe close enough to step around it, it fights on.
    const whole = hunted();
    whole.units.hunter_0.hp = whole.units.hunter_0.maxHp;
    assert.notEqual((aiAction(whole) as { jutsu?: string } | null)?.jutsu, 'koton_wall');
    const close = hunted();
    place(close, 'a', { x: 13.75, z: 11.75 });
    assert.notEqual((aiAction(close) as { jutsu?: string } | null)?.jutsu, 'koton_wall');
    // An iron fist (a Kōton raider) shelters the hurt rogue beside it.
    const pair = turnOf(createBattle(setup({ party: two, enemies: [{ kind: 'raider', clan: 'Koton', pos: { x: 17, z: 14 } }, { kind: 'rogue', pos: { x: 16, z: 11 } }] })).state, 'raider_0');
    pair.units.rogue_0.hp = 6;
    pair.units.raider_0.intent = undefined;
    assert.deepEqual([planIntent(pair, pair.units.raider_0)?.what, planIntent(pair, pair.units.raider_0)?.target], ['koton_wall', 'rogue_0']);
    const sheltered = ok(applyAction(pair, aiAction(pair)!)).state;
    for (const id of ['a', 'b']) assert.equal(lineOfSight(sheltered, sheltered.units[id].pos, sheltered.units.rogue_0.pos), false, id);
  });

  it('the AI (D21): a Kōton that walked and has nothing to strike raises its wall rather than dash on in the open', () => {
    const party = [
      { character: hero({ id: 'a', name: 'Aki' }), pos: { x: 8, z: 10 } },
      { character: hero({ id: 'b', name: 'Bo' }), pos: { x: 8, z: 13 } },
    ];
    const s = turnOf(createBattle(setup({ party, enemies: [{ kind: 'hunter', pos: { x: 22, z: 11.5 } }] })).state, 'hunter_0');
    const h = s.units.hunter_0;
    h.intent = { kind: 'move', what: 'advance', target: 'a' };
    h.turn.move = 0;
    const a = aiAction(s);
    assert.ok(a?.type === 'jutsu' && a.jutsu === 'koton_wall', JSON.stringify(a));
    const out = ok(applyAction(s, a));
    for (const id of ['a', 'b']) assert.equal(lineOfSight(out.state, out.state.units[id].pos, out.state.units.hunter_0.pos), false, id);
    // Seen by only one foe in reach of a kunai, it dashes on.
    const lone = turnOf(createBattle(setup({ enemies: [{ kind: 'hunter', pos: { x: 22, z: 11.5 } }] })).state, 'hunter_0');
    lone.units.hunter_0.intent = { kind: 'move', what: 'advance', target: 'a' };
    lone.units.hunter_0.turn.move = 0;
    assert.equal(aiAction(lone)?.type, 'dash');
  });

  it('the AI goes around a metal wall, and breaks through when walled off', () => {
    const wall = (id: string, a: Pt, b: Pt): Wall => ({ id, kind: 'metal', a, b, hp: 20, maxHp: 20, owner: 'a' });
    const at = (walls: Wall[]): BattleState => {
      const { state } = createBattle(setup({ party: [{ character: hero({ id: 'a' }), pos: { x: 10.25, z: 10.25 } }], enemies: [{ kind: 'raider', pos: { x: 11.75, z: 10.25 } }] }));
      const s = turnOf(state, 'raider_0');
      s.walls.push(...walls);
      const r = s.units.raider_0;
      r.chakra = 0;
      r.intent = { kind: 'melee', what: r.weapon.name, target: 'a' };
      return s;
    };
    // One wall between them: no blow across it; it walks around and strikes.
    const s = at([wall('w1', { x: 11, z: 8 }, { x: 11, z: 12.5 })]);
    assert.equal(dist(s.units.raider_0.pos, s.units.a.pos), 1.5);
    const step = aiAction(s);
    assert.equal(step?.type, 'move');
    const moved = ok(applyAction(s, step!)).state;
    const blow = aiAction(moved);
    assert.ok(blow?.type === 'attack' && blow.target === 'a', JSON.stringify(blow));
    ok(applyAction(moved, blow));
    // Boxed in (the walls overlap at the corners): it strikes the wall in the way.
    const box = at([
      wall('west', { x: 9.5, z: 9.2 }, { x: 9.5, z: 11.3 }),
      wall('east', { x: 11, z: 9.2 }, { x: 11, z: 11.3 }),
      wall('north', { x: 9.2, z: 9.5 }, { x: 11.3, z: 9.5 }),
      wall('south', { x: 9.2, z: 11 }, { x: 11.3, z: 11 }),
    ]);
    const hit = aiAction(box);
    assert.deepEqual(hit, { type: 'attack', unit: 'raider_0', target: 'wall:east' });
    ok(applyAction(box, hit!));
  });

  it('the AI breaks through a wall it can swing at, never one behind another metal wall (the engine refuses that blow)', () => {
    const wall = (id: string, a: Pt, b: Pt): Wall => ({ id, kind: 'metal', a, b, hp: 20, maxHp: 20, owner: 'a' });
    const { state } = createBattle(setup({ party: [{ character: hero({ id: 'a' }), pos: { x: 10.25, z: 10.25 } }], enemies: [{ kind: 'raider', pos: { x: 11.75, z: 10.25 } }] }));
    const s = turnOf(state, 'raider_0');
    const r = s.units.raider_0;
    r.chakra = 0;
    r.intent = { kind: 'melee', what: r.weapon.name, target: 'a' };
    // Boxed in, and a second wall just outside the west one: nearer Aki and within a fist's reach,
    // but the west wall stands across the swing.
    s.walls.push(
      wall('west', { x: 11, z: 9.2 }, { x: 11, z: 11.3 }),
      wall('east', { x: 12.5, z: 9.2 }, { x: 12.5, z: 11.3 }),
      wall('north', { x: 10.6, z: 9.5 }, { x: 12.8, z: 9.5 }),
      wall('south', { x: 10.6, z: 11 }, { x: 12.8, z: 11 }),
      wall('outer', { x: 10.7, z: 9.2 }, { x: 10.7, z: 11.3 }),
    );
    assert.equal(applyAction(s, { type: 'attack', unit: 'raider_0', target: 'wall:outer' }).reason, 'blocked');
    const hit = aiAction(s);
    assert.deepEqual(hit, { type: 'attack', unit: 'raider_0', target: 'wall:west' });
    ok(applyAction(s, hit!));
  });
});

describe('Ryusei: Weapon Nodes, Shooting-Star Thrust, Spatial Swap', () => {
  const ryusei = (over: Partial<ShinobiCharacter> = {}) => hero({ id: 'r', name: 'Solen', clan: 'Ryusei', ...over });
  /** A Ryusei at (8.25, 10.25) on its turn, the rogue 6 m away at (14.25, 10.25). */
  const ryuseiTurn = (over: Partial<BattleSetup> = {}): BattleState => turnOf(createBattle(setup({ party: [{ character: ryusei(), pos: { x: 8, z: 10 } }], ...over })).state, 'r');
  const node = (id: string, pos: Pt, owner = 'r'): WeaponNode => ({ id, owner, pos: { ...pos } });
  const warp = (s: BattleState, at: Pt, unit = 'r') => applyAction(s, { type: 'jutsu', unit, jutsu: 'ryusei_warp', at });
  const swap = (s: BattleState, target: string) => applyAction(s, { type: 'jutsu', unit: 'r', jutsu: 'ryusei_swap', at: { ...s.units[target].pos }, target });
  /** The first seed whose outcome passes `want`. */
  function seeded(s: BattleState, act: (t: BattleState) => ReturnType<typeof applyAction>, want: (out: ReturnType<typeof applyAction>) => boolean): ReturnType<typeof applyAction> {
    for (let seed = 1; seed < 80; seed++) {
      const t = structuredClone(s);
      t.seed = seed;
      const out = ok(act(t));
      if (want(out)) return out;
    }
    throw new Error('no seed gives it');
  }
  const hit = (out: ReturnType<typeof applyAction>) => out.events.some((e) => e.t === 'attack' && e.roll.success);

  it('Weapon Nodes: every kunai and every missed blow leaves one where the weapon lands; three at most', () => {
    const s = ryuseiTurn();
    assert.deepEqual(s.units.r.jutsus.slice(0, 2), ['ryusei_warp', 'ryusei_swap']);
    const kunai = (t: BattleState) => applyAction(t, { type: 'attack', unit: 'r', target: 'rogue_0', ranged: true });
    // A kunai, hit or miss: a Node right where the rogue stands.
    for (const out of [seeded(s, kunai, hit), seeded(s, kunai, (o) => !hit(o))]) {
      assert.deepEqual(out.state.nodes.map((n) => ({ owner: n.owner, pos: n.pos })), [{ owner: 'r', pos: s.units.rogue_0.pos }]);
      assert.ok(out.events.some((e) => e.t === 'node' && e.on));
    }
    // A blow: a hit that lands leaves none, a miss leaves one, and so does a hit the rogue (a Mirai)
    // steps aside from, right where it stood.
    const close = structuredClone(s);
    place(close, 'rogue_0', { x: 9.75, z: 10.25 });
    const blow = (t: BattleState) => applyAction(t, { type: 'attack', unit: 'r', target: 'rogue_0' });
    const evaded = (o: ReturnType<typeof applyAction>) => o.events.some((e) => e.t === 'evade');
    assert.equal(seeded(close, blow, (o) => hit(o) && !evaded(o)).state.nodes.length, 0);
    assert.deepEqual(seeded(close, blow, (o) => !hit(o)).state.nodes[0].pos, close.units.rogue_0.pos);
    const stepped = seeded(close, blow, evaded);
    assert.deepEqual(stepped.state.nodes.map((n) => ({ owner: n.owner, pos: n.pos })), [{ owner: 'r', pos: close.units.rogue_0.pos }]);
    assert.notDeepEqual(stepped.state.units.rogue_0.pos, close.units.rogue_0.pos);
    // A fourth makes the oldest go.
    const full = structuredClone(s);
    full.nodes.push(node('n1', { x: 9, z: 13 }), node('n2', { x: 10, z: 13 }), node('n3', { x: 11, z: 13 }));
    const fourth = ok(kunai(full));
    assert.deepEqual(fourth.state.nodes.map((n) => n.id).slice(0, 2), ['n2', 'n3']);
    assert.equal(fourth.state.nodes.length, 3);
    assert.ok(fourth.events.some((e) => e.t === 'node' && !e.on && e.node.id === 'n1'));
    // Only a Ryusei leaves them.
    const mirai = turnOf(createBattle(setup({ party: [{ character: hero({ id: 'm', clan: 'Mirai' }), pos: { x: 8, z: 10 } }] })).state, 'm');
    assert.equal(ok(applyAction(mirai, { type: 'attack', unit: 'm', target: 'rogue_0', ranged: true })).state.nodes.length, 0);
    // A kunai at a metal block: the Node lands on the face toward the thrower, and a warp lands on that side.
    const blocked = structuredClone(s);
    blocked.walls.push({ id: 'b1', kind: 'metalBlock', a: { x: 12.25, z: 10.25 }, b: { x: 12.25, z: 10.25 }, hp: 20, maxHp: 20 });
    const atBlock = ok(applyAction(blocked, { type: 'attack', unit: 'r', target: 'wall:b1', ranged: true })).state;
    assert.deepEqual(atBlock.nodes[0].pos, { x: 11.5, z: 10.25 });
    atBlock.units.r.turn.bonus = true;
    assert.deepEqual(ok(warp(atBlock, atBlock.nodes[0].pos)).state.units.r.pos, { x: 11.25, z: 10.25 });
  });

  it('Shooting-Star Thrust: bonus action, 2 chakra, to its own Node within 18 m in sight, even through a metal wall', () => {
    const s = ryuseiTurn();
    s.nodes.push(node('n1', { x: 12.25, z: 13.25 }));
    // A click near the Node is enough.
    const out = ok(warp(s, { x: 12.5, z: 13 }));
    const r = out.state.units.r;
    assert.deepEqual(r.pos, { x: 12.25, z: 13.25 });
    assert.equal(r.chakra, s.units.r.chakra - 2);
    assert.equal(r.turn.bonus, false);
    assert.equal(r.turn.action, true);
    assert.equal(r.armed, s.units.r.armed);
    assert.ok(out.events.some((e) => e.t === 'teleport' && e.unit === 'r'));
    // Using a Node doesn't spend it.
    assert.equal(out.state.nodes.length, 1);
    // Someone stands on it: it lands on the nearest free cell within 1.5 m, and (changed on purpose,
    // owner 2026-10-20, D15) at least 1 m from whoever stands there, so the sprites never overlap.
    const busy = structuredClone(s);
    busy.nodes = [node('n1', s.units.rogue_0.pos)];
    const d = dist(ok(warp(busy, s.units.rogue_0.pos)).state.units.r.pos, s.units.rogue_0.pos);
    assert.ok(d >= 1 && d <= 1.5, `landed ${d} m away`);
    // Beats Kōton: a metal wall between hides nothing from the warp.
    const walled = structuredClone(s);
    walled.walls.push({ id: 'w1', kind: 'metal', a: { x: 10.5, z: 11 }, b: { x: 10.5, z: 15.5 }, hp: 20, maxHp: 20, owner: 'rogue_0' });
    assert.equal(lineOfSight(walled, walled.units.r.pos, { x: 12.25, z: 13.25 }), false);
    assert.deepEqual(ok(warp(walled, { x: 12.25, z: 13.25 })).state.units.r.pos, { x: 12.25, z: 13.25 });
    // Refused: no Node of its own there, too far, or a tent in the way.
    assert.equal(warp(s, { x: 10.25, z: 7.25 }).reason, 'noNode');
    const theirs = structuredClone(s);
    theirs.nodes = [node('n1', { x: 12.25, z: 13.25 }, 'rogue_0')];
    assert.equal(warp(theirs, { x: 12.25, z: 13.25 }).reason, 'noNode');
    const far = structuredClone(s);
    far.nodes = [node('n1', { x: 26.75, z: 10.25 })];
    assert.equal(warp(far, { x: 26.75, z: 10.25 }).reason, 'outOfRange');
    const tent = turnOf(createBattle(setup({ party: [{ character: ryusei(), pos: { x: 43.25, z: 5.25 } }], enemies: [{ kind: 'rogue', pos: { x: 50, z: 10 } }] })).state, 'r');
    tent.nodes.push(node('n1', { x: 43.2, z: 0.1 }));
    assert.equal(warp(tent, { x: 43.2, z: 0.1 }).reason, 'noSight');
  });

  it('Shooting-Star Thrust lands at least 1 m from whoever stands on the Node, within 1.5 m of it (D15)', () => {
    const s = ryuseiTurn();
    const foe = s.units.rogue_0.pos;
    // A foe on the Node, on its centre or off it (within 0.75 m): the landing keeps 1 m from the foe,
    // on its far side, and still wins the blow from behind.
    for (const [dx, dz] of [[0, 0], [0.5, 0], [-0.5, 0], [0, 0.5], [0.5, -0.5]]) {
      const t = structuredClone(s);
      t.nodes = [node('n1', { x: foe.x + dx, z: foe.z + dz })];
      const out = ok(warp(t, t.nodes[0].pos));
      const p = out.state.units.r.pos;
      assert.ok(dist(p, foe) >= 1 - 1e-9, `${dx},${dz}: ${dist(p, foe)} m from the foe`);
      assert.ok(dist(p, t.nodes[0].pos) <= 1.5 + 1e-9, `${dx},${dz}: ${dist(p, t.nodes[0].pos)} m from the Node`);
      assert.equal(out.state.units.r.cond.warpEdge, true);
      if (dx === 0 && dz === 0) assert.ok(p.x > foe.x, 'the far side');
    }
    // A friend on it, or a fallen ninja lying there, counts the same.
    const pair = ryuseiTurn({ party: [{ character: ryusei(), pos: { x: 8, z: 10 } }, { character: hero({ id: 'b', name: 'Bo' }), pos: { x: 11, z: 13 } }] });
    pair.nodes = [node('n1', pair.units.b.pos)];
    assert.ok(dist(ok(warp(pair, pair.units.b.pos)).state.units.r.pos, pair.units.b.pos) >= 1);
    const fallen = structuredClone(pair);
    fallen.units.b.hp = 0;
    fallen.units.b.down = 'downed';
    assert.ok(dist(ok(warp(fallen, fallen.units.b.pos)).state.units.r.pos, fallen.units.b.pos) >= 1);
    // A Node nobody stands on (the foe is 1 m off): it lands right on it.
    const near = structuredClone(s);
    near.nodes = [node('n1', { x: foe.x - 1, z: foe.z })];
    assert.deepEqual(ok(warp(near, near.nodes[0].pos)).state.units.r.pos, near.nodes[0].pos);
    // No free cell 1 m from the foe within 1.5 m of the Node: refused, nothing paid.
    const boxed = structuredClone(s);
    boxed.nodes = [node('n1', foe)];
    for (const [bx, bz] of [[1.25, 0], [-1.25, 0], [0, 1.25], [0, -1.25], [1.25, 1.25], [1.25, -1.25], [-1.25, 1.25], [-1.25, -1.25]]) {
      boxed.walls.push({ id: `b${bx}_${bz}`, kind: 'metalBlock', a: { x: foe.x + bx, z: foe.z + bz }, b: { x: foe.x + bx, z: foe.z + bz }, hp: 20, maxHp: 20 });
    }
    assert.equal(warp(boxed, foe).reason, 'blocked');
  });

  it('landing beside a foe, the next attack this turn comes from behind: advantage, and nothing blocks it', () => {
    const s = ryuseiTurn();
    s.nodes.push(node('n1', s.units.rogue_0.pos));
    const warped = ok(warp(s, s.units.rogue_0.pos));
    const r = warped.state.units.r;
    assert.equal(r.cond.warpEdge, true);
    // The log names the foe it is behind (no attack has happened yet).
    assert.ok(warped.events.some((e) => e.t === 'note' && e.key === 'warpEdge' && e.params?.name === 'Solen' && e.params?.foe === s.units.rogue_0.name));
    const pv = attackPreview(warped.state, r, warped.state.units.rogue_0, 'melee');
    assert.equal(pv.adv, 'advantage');
    assert.ok(pv.reasons.includes('behind'));
    // The blow can't be blocked: the rogue (a Mirai) can't step aside, even from a blow that drops it.
    warped.state.units.rogue_0.hp = 1;
    const blow = seeded(warped.state, (t) => applyAction(t, { type: 'attack', unit: 'r', target: 'rogue_0' }), hit);
    assert.ok(!blow.events.some((e) => e.t === 'evade'));
    assert.ok(blow.state.units.rogue_0.down);
    // Spent with that attack, or gone at the end of the turn.
    assert.equal(blow.state.units.r.cond.warpEdge, false);
    assert.equal(ok(applyAction(warped.state, { type: 'endTurn', unit: 'r' })).state.units.r.cond.warpEdge, false);
    // Landing with no foe in reach gives no edge.
    const open = structuredClone(s);
    open.nodes = [node('n1', { x: 10.25, z: 13.25 })];
    assert.ok(!ok(warp(open, { x: 10.25, z: 13.25 })).state.units.r.cond.warpEdge);
  });

  it('the edge lasts the turn it was won in: a stealth turn too, and it never goes into the fight', () => {
    const s = createBattle(setup({ stealth: true, party: [{ character: ryusei(), pos: { x: 8, z: 10 } }], enemies: [{ kind: 'rogue', pos: { x: 14, z: 10 }, route: [{ x: 14, z: 10 }] }] })).state;
    s.nodes.push(node('n1', s.units.rogue_0.pos));
    const warped = ok(warp(s, s.units.rogue_0.pos)).state;
    assert.equal(warped.phase, 'stealth');
    assert.equal(warped.units.r.cond.warpEdge, true);
    assert.ok(!ok(applyAction(warped, { type: 'endTurn', unit: 'r' })).state.units.r.cond.warpEdge);
    const fight = structuredClone(warped);
    startCombat(fight, [], 'r', []);
    assert.ok(!fight.units.r.cond.warpEdge);
  });

  it('a hidden ninja teleported out into the open is seen at once; onto a hiding place it stays hidden', () => {
    const s = ryuseiTurn({ party: [
      { character: ryusei(), pos: { x: 8, z: 10 } },
      { character: hero({ id: 'b', name: 'Bo' }), pos: { x: 11, z: 13 } },
    ] });
    s.units.r.cond.hidden = 30;
    const seen = (out: ReturnType<typeof applyAction>, id: string) => {
      assert.equal(out.state.units[id].cond.hidden, undefined, id);
      assert.ok(out.events.some((e) => e.t === 'condition' && e.unit === id && e.cond === 'hidden' && !e.on), id);
    };
    // Shooting-Star Thrust beside the rogue: the blow comes from behind, but not from hiding.
    const beside = structuredClone(s);
    beside.nodes.push(node('n1', s.units.rogue_0.pos));
    const warped = ok(warp(beside, s.units.rogue_0.pos));
    seen(warped, 'r');
    const pv = attackPreview(warped.state, warped.state.units.r, warped.state.units.rogue_0, 'melee');
    assert.ok(pv.reasons.includes('behind') && !pv.reasons.includes('hidden'));
    // Spatial Swap: both of them.
    const swapped = structuredClone(s);
    swapped.units.b.cond.hidden = 30;
    swapped.nodes.push(node('n1', s.units.b.pos));
    const out = ok(swap(swapped, 'b'));
    seen(out, 'r');
    seen(out, 'b');
    // Body Flicker.
    seen(ok(applyAction(s, { type: 'jutsu', unit: 'r', jutsu: 'body_flicker', at: { x: 11.25, z: 7.25 } })), 'r');
    // Onto a bush: still hidden.
    const bush = structuredClone(s);
    bush.nodes.push(node('n1', { x: 16.25, z: 5.75 }));
    assert.equal(ok(warp(bush, { x: 16.25, z: 5.75 })).state.units.r.cond.hidden, 30);
  });

  it('a raider\'s blow from behind leaves a player Mirai no Evasion, nor Kawarimi to one who knows it', () => {
    for (const target of [hero({ id: 't', clan: 'Mirai' }), { ...KENJI, id: 't', effects: [] }]) {
      const { state } = createBattle(setup({ party: [{ character: target, pos: { x: 8, z: 10 } }], enemies: [{ kind: 'raider', pos: { x: 20, z: 10 } }] }));
      const s = turnOf(state, 'raider_0');
      assert.ok(s.units.t.jutsus.includes(target.clan === 'Mirai' ? 'mirai_evasion' : 'substitution_kawarimi'));
      s.nodes.push(node('n1', s.units.t.pos, 'raider_0'));
      const warped = ok(warp(s, s.units.t.pos, 'raider_0')).state;
      assert.equal(warped.units.raider_0.cond.warpEdge, true);
      const out = seeded(warped, (t) => applyAction(t, { type: 'attack', unit: 'raider_0', target: 't' }), hit);
      assert.equal(out.state.pending, undefined);
      assert.ok(out.events.some((e) => e.t === 'damage' && e.unit === 't'));
      // Walked in instead, the same blow is offered to the reaction.
      const walked = structuredClone(s);
      place(walked, 'raider_0', { x: 9.75, z: 10.25 });
      assert.ok(seeded(walked, (t) => applyAction(t, { type: 'attack', unit: 'raider_0', target: 't' }), hit).state.pending);
    }
  });

  it('Spatial Swap: action, 3 chakra, trades places with anyone on its Node; an enemy resists with STR', () => {
    // An ally: no save.
    const pair = ryuseiTurn({ party: [
      { character: ryusei(), pos: { x: 8, z: 10 } },
      { character: hero({ id: 'b', name: 'Bo' }), pos: { x: 11, z: 13 } },
    ] });
    const [rAt, bAt] = [pair.units.r.pos, pair.units.b.pos];
    pair.nodes.push(node('n1', { x: bAt.x + 0.3, z: bAt.z }));
    const out = ok(swap(pair, 'b'));
    assert.deepEqual(out.state.units.r.pos, bAt);
    assert.deepEqual(out.state.units.b.pos, rAt);
    assert.equal(out.state.units.r.chakra, pair.units.r.chakra - 3);
    assert.equal(out.state.units.r.turn.action, false);
    assert.ok(!out.events.some((e) => e.t === 'save'));
    assert.equal(out.events.filter((e) => e.t === 'teleport').length, 2);
    // The log says who traded places with whom.
    assert.ok(out.events.some((e) => e.t === 'note' && e.key === 'swapped' && e.params?.name === 'Solen' && e.params?.other === 'Bo'));
    // An enemy: a STR save; it moves only on a failure, and a resisted swap still costs.
    const s = ryuseiTurn();
    s.nodes.push(node('n1', s.units.rogue_0.pos));
    const saved = (o: ReturnType<typeof applyAction>) => o.events.some((e) => e.t === 'save' && e.unit === 'rogue_0' && e.roll.success);
    const failed = seeded(s, (t) => swap(t, 'rogue_0'), (o) => !saved(o));
    assert.deepEqual(failed.state.units.r.pos, s.units.rogue_0.pos);
    assert.deepEqual(failed.state.units.rogue_0.pos, s.units.r.pos);
    const resisted = seeded(s, (t) => swap(t, 'rogue_0'), saved);
    assert.deepEqual(resisted.state.units.r.pos, s.units.r.pos);
    assert.deepEqual(resisted.state.units.rogue_0.pos, s.units.rogue_0.pos);
    assert.equal(resisted.state.units.r.chakra, s.units.r.chakra - 3);
    assert.ok(resisted.events.some((e) => e.t === 'note' && e.key === 'swapResisted'));
    assert.ok(!resisted.events.some((e) => e.t === 'note' && e.key === 'swapped'));
    const save = failed.events.find((e) => e.t === 'save');
    assert.ok(save?.t === 'save' && save.what === 'ryusei_swap' && save.roll.dc === s.units.r.saveDC && save.ab === 'str');
    // Refused: nobody on a Node, itself, the hydra, or before the fighting.
    const bare = ryuseiTurn();
    assert.equal(swap(bare, 'rogue_0').reason, 'notOnNode');
    assert.equal(swap(s, 'r').reason, 'needTarget');
    const lair = turnOf(createBattle(setup({ party: [{ character: ryusei(), pos: { x: 10, z: 14 } }], enemies: [{ kind: 'hydra', pos: { x: 16, z: 8 } }] })).state, 'r');
    const head = Object.values(lair.units).find((u) => u.kind === 'hydra_head')!;
    lair.nodes.push(node('n1', head.pos));
    assert.equal(swap(lair, head.id).reason, 'tooBig');
    const sneaking = createBattle(setup({ stealth: true, party: [{ character: ryusei(), pos: { x: 8, z: 10 } }], enemies: [{ kind: 'rogue', pos: { x: 14, z: 10 }, route: [{ x: 14, z: 10 }] }] })).state;
    sneaking.nodes.push(node('n1', sneaking.units.rogue_0.pos));
    assert.equal(swap(sneaking, 'rogue_0').reason, 'combatOnly');
  });

  it('a Shooting-Star Thrust and a Spatial Swap are played as a phase (the owner, 2026-10-21); a Body Flicker is not', () => {
    const s = ryuseiTurn({ party: [
      { character: ryusei(), pos: { x: 8, z: 10 } },
      { character: hero({ id: 'b', name: 'Bo' }), pos: { x: 11, z: 13 } },
    ] });
    const jumps = (o: ReturnType<typeof applyAction>) => ok(o).events.flatMap((e) => (e.t === 'teleport' ? [[e.unit, e.how]] : []));
    const warped = structuredClone(s);
    warped.nodes.push(node('n1', { x: 12.25, z: 7.25 }));
    assert.deepEqual(jumps(warp(warped, { x: 12.25, z: 7.25 })), [['r', 'phase']]);
    // Both of a Spatial Swap's ninjas phase.
    const swapped = structuredClone(s);
    swapped.nodes.push(node('n1', s.units.b.pos));
    assert.deepEqual(jumps(swap(swapped, 'b')), [['r', 'phase'], ['b', 'phase']]);
    // Body Flicker keeps its chakra smoke.
    assert.deepEqual(jumps(applyAction(s, { type: 'jutsu', unit: 'r', jutsu: 'body_flicker', at: { x: 11.25, z: 7.25 } })), [['r', undefined]]);
  });

  it('the AI: a Ryusei its feet can\'t carry into reach warps to a Node beside its target and strikes', () => {
    const { state } = createBattle(setup({ enemies: [{ kind: 'raider', pos: { x: 22, z: 10 } }] }));
    const s = turnOf(state, 'raider_0');
    const r = s.units.raider_0;
    r.intent = { kind: 'melee', what: r.weapon.name, target: 'a' };
    assert.ok(dist(r.pos, s.units.a.pos) > r.speed + r.weapon.reach);
    // No Node: it walks.
    assert.equal(aiAction(s)?.type, 'move');
    s.nodes.push(node('n1', { x: 9.75, z: 10.25 }, 'raider_0'), node('n2', { x: 16.25, z: 13.25 }, 'raider_0'));
    const a = aiAction(s);
    assert.deepEqual(a, { type: 'jutsu', unit: 'raider_0', jutsu: 'ryusei_warp', at: { x: 9.75, z: 10.25 } });
    const out = ok(applyAction(s, a!));
    assert.equal(out.state.units.raider_0.cond.warpEdge, true);
    const blow = aiAction(out.state);
    assert.ok(blow?.type === 'attack' && blow.target === 'a', JSON.stringify(blow));
    ok(applyAction(out.state, blow));
    // Meaning to throw a kunai, it warps only right beside the target, and strikes from behind with its fists.
    const thrower = structuredClone(s);
    thrower.units.raider_0.intent = { kind: 'ranged', what: 'Kunai', target: 'a' };
    thrower.nodes = [node('n1', { x: 11.25, z: 10.25 }, 'raider_0')];
    assert.equal(aiAction(thrower)?.type, 'move');
    thrower.nodes.push(node('n2', { x: 9.75, z: 10.25 }, 'raider_0'));
    const landed = ok(applyAction(thrower, aiAction(thrower)!)).state;
    assert.deepEqual(landed.units.raider_0.pos, { x: 9.75, z: 10.25 });
    assert.deepEqual(aiAction(landed), { type: 'attack', unit: 'raider_0', target: 'a', knockout: false });
    // Within a walk of its target, a Node right beside it is still worth the warp (the blow from
    // behind); one it would have to walk on from isn't.
    const near = structuredClone(s);
    near.units.raider_0.pos = { x: 14.25, z: 10.25 };
    near.nodes = [node('n1', { x: 9.75, z: 10.25 }, 'raider_0')];
    assert.deepEqual(aiAction(near), { type: 'jutsu', unit: 'raider_0', jutsu: 'ryusei_warp', at: { x: 9.75, z: 10.25 } });
    near.nodes = [node('n1', { x: 11.75, z: 13.25 }, 'raider_0')];
    assert.equal(aiAction(near)?.type, 'move');
  });

  it('the AI (D21): an enemy Ryusei opens with a kunai that leaves a Node at its target, then warps in and strikes from behind', () => {
    // A Ryusei rogue 8 m from Aki: its Fireball would reach, but with no Node of its own yet it throws.
    const { state } = createBattle(setup({ enemies: [{ kind: 'rogue', clan: 'Ryusei', pos: { x: 16, z: 10 } }] }));
    const s = turnOf(state, 'rogue_0');
    const aki = { ...s.units.a.pos };
    assert.deepEqual([s.units.rogue_0.intent?.kind, s.units.rogue_0.intent?.target], ['ranged', 'a']);
    let t = s;
    for (let i = 0; i < 4 && t.units.rogue_0.turn.action; i++) {
      const a = aiAction(t);
      assert.ok(a && a.type !== 'endTurn' && a.type !== 'jutsu', JSON.stringify(a));
      t = ok(applyAction(t, a)).state;
    }
    // Hit or miss, the Node lands at Aki's feet.
    assert.deepEqual(t.nodes.map((n) => [n.owner, n.pos]), [['rogue_0', aki]]);
    // Its turn ends: it plans to warp in beside Aki and strike, and the Eye sees where it will land.
    const planned = ok(applyAction(t, { type: 'endTurn', unit: 'rogue_0' })).state;
    const plan = planned.units.rogue_0.intent!;
    assert.deepEqual([plan.kind, plan.target], ['melee', 'a']);
    assert.ok(plan.to && dist(plan.to, aki) >= 1 - 1e-9 && dist(plan.to, aki) <= 1.5 + 1e-9, JSON.stringify(plan));
    const next = turnOf(planned, 'rogue_0');
    const warp = aiAction(next);
    assert.deepEqual(warp, { type: 'jutsu', unit: 'rogue_0', jutsu: 'ryusei_warp', at: aki });
    const landed = ok(applyAction(next, warp!)).state;
    assert.deepEqual(landed.units.rogue_0.pos, plan.to);
    assert.equal(landed.units.rogue_0.cond.warpEdge, true);
    const blow = aiAction(landed);
    assert.ok(blow?.type === 'attack' && blow.target === 'a' && !blow.ranged, JSON.stringify(blow));
    const atk = ok(applyAction(landed, blow)).events.find((e) => e.t === 'attack');
    assert.ok(atk?.t === 'attack' && atk.reasons?.includes('behind'));
    // With a Node of its own already (none near Aki), the kunai no longer takes the Fireball's place.
    const later = structuredClone(s);
    later.nodes = [node('old', { x: 30.25, z: 4.25 }, 'rogue_0')];
    assert.equal(planIntent(later, later.units.rogue_0)?.what, 'fireball_goukakyu');
    // A Ryusei of the party on the AI isn't held to it: it casts its best jutsu.
    const ally = turnOf(createBattle(setup({ party: [{ character: hero({ id: 'a', name: 'Aki' }), pos: { x: 8, z: 10 }, controller: 'ai' }] })).state, 'a');
    assert.equal(planIntent(ally, ally.units.a)?.kind, 'jutsu');
  });

  it('the AI (D21): Spatial Swap only when it clearly helps: a hurt friend out of a foe\'s reach, a foe in among its friends', () => {
    /** The raider (a Ryusei) 8 m from Aki, a rogue hurt beside Aki on one of the raider's Nodes. */
    const rescue = (): BattleState => {
      const s = turnOf(createBattle(setup({ enemies: [{ kind: 'raider', pos: { x: 16, z: 10 } }, { kind: 'rogue', pos: { x: 14, z: 14 } }] })).state, 'raider_0');
      place(s, 'rogue_0', { x: 9.75, z: 10.25 });
      s.units.rogue_0.hp = 5;
      s.nodes.push(node('n1', s.units.rogue_0.pos, 'raider_0'));
      s.units.raider_0.intent = undefined;
      return s;
    };
    const s = rescue();
    const a = aiAction(s);
    assert.deepEqual(a, { type: 'jutsu', unit: 'raider_0', jutsu: 'ryusei_swap', at: s.units.rogue_0.pos, target: 'rogue_0' });
    const out = ok(applyAction(s, a!));
    assert.deepEqual([out.state.units.raider_0.pos, out.state.units.rogue_0.pos], [s.units.rogue_0.pos, s.units.raider_0.pos]);
    // Not for a friend that isn't hurt, nor when the Ryusei itself stands in a foe's reach.
    const whole = rescue();
    whole.units.rogue_0.hp = whole.units.rogue_0.maxHp;
    assert.notEqual((aiAction(whole) as { jutsu?: string } | null)?.jutsu, 'ryusei_swap');
    const pressed = rescue();
    place(pressed, 'raider_0', { x: 8.25, z: 11.75 });
    pressed.nodes = [node('n1', pressed.units.rogue_0.pos, 'raider_0')];
    assert.notEqual((aiAction(pressed) as { jutsu?: string } | null)?.jutsu, 'ryusei_swap');
    // A foe on its Node, weak of arm, pulled in among two of the Ryusei's friends with none of its own near.
    const pull = turnOf(createBattle(setup({ enemies: [{ kind: 'raider', pos: { x: 18, z: 10 } }, { kind: 'rogue', pos: { x: 18, z: 12 } }, { kind: 'rogue', pos: { x: 19.5, z: 9 } }] })).state, 'raider_0');
    pull.units.a.stats = { ...pull.units.a.stats, str: 1 };
    pull.nodes.push(node('n1', pull.units.a.pos, 'raider_0'));
    pull.units.raider_0.intent = undefined;
    const p = aiAction(pull);
    assert.deepEqual(p, { type: 'jutsu', unit: 'raider_0', jutsu: 'ryusei_swap', at: pull.units.a.pos, target: 'a' });
    ok(applyAction(pull, p!));
    // A strong one would likely hold: it doesn't try.
    const strong = structuredClone(pull);
    strong.units.a.stats = { ...strong.units.a.stats, str: 30 };
    assert.notEqual((aiAction(strong) as { jutsu?: string } | null)?.jutsu, 'ryusei_swap');
  });
});

describe('Northstar: Aura of Sovereignty, Command, Natural Submission', () => {
  const northstar = (over: Partial<ShinobiCharacter> = {}) => hero({ id: 'n', name: 'Yua', clan: 'Northstar', ...over });
  /** A Northstar at (8.25, 10.25) on its turn, the enemies 6 m away or as given. */
  const northstarTurn = (over: Partial<BattleSetup> = {}): BattleState => turnOf(createBattle(setup({ party: [{ character: northstar(), pos: { x: 8, z: 10 } }], ...over })).state, 'n');
  const cast = (s: BattleState, target: string, o: { jutsu?: string; target2?: string } = {}) =>
    applyAction(s, { type: 'jutsu', unit: 'n', jutsu: o.jutsu ?? 'northstar_command', at: { ...s.units[target].pos }, target, ...(o.target2 ? { target2: o.target2 } : {}) });
  /** The first seed whose outcome passes `want`. */
  function seeded(s: BattleState, act: (t: BattleState) => ReturnType<typeof applyAction>, want: (out: ReturnType<typeof applyAction>) => boolean): ReturnType<typeof applyAction> {
    for (let seed = 1; seed < 80; seed++) {
      const t = structuredClone(s);
      t.seed = seed;
      const out = ok(act(t));
      if (want(out)) return out;
    }
    throw new Error('no seed gives it');
  }
  const failed = (out: ReturnType<typeof applyAction>) => out.events.some((e) => e.t === 'save' && !e.roll.success);
  const allFailed = (out: ReturnType<typeof applyAction>) => out.events.filter((e) => e.t === 'save').every((e) => e.t === 'save' && !e.roll.success);

  it('the aura: a foe inside it (4.5 m) attacks with plain disadvantage; outside it, or a friend, does not', () => {
    const s = turnOf(createBattle(setup({ party: [
      { character: northstar(), pos: { x: 8, z: 10 } },
      { character: hero({ id: 'b', name: 'Bo' }), pos: { x: 8, z: 13 } },
    ] })).state, 'rogue_0');
    assert.deepEqual(s.units.n.jutsus.slice(0, 2), ['northstar_command', 'northstar_submission']);
    place(s, 'rogue_0', { x: 9.75, z: 10.25 });
    const r = s.units.rogue_0;
    for (const kind of ['melee', 'ranged', 'jutsu'] as const) {
      const pv = attackPreview(s, r, s.units.n, kind);
      assert.ok(pv.reasons.includes('aura'), kind);
      assert.equal(pv.adv, 'disadvantage');
    }
    // Against the Northstar's friends too, and against a structure.
    assert.ok(attackPreview(s, r, s.units.b, 'melee').reasons.includes('aura'));
    const block: Wall = { id: 'b1', kind: 'metalBlock', a: { x: 9.75, z: 11.75 }, b: { x: 9.75, z: 11.75 }, hp: 20, maxHp: 20, owner: 'b' };
    assert.ok(structureAttack({ ...s, walls: [block] }, r, block, false).reasons.includes('aura'));
    // And at a prop: a kunai at the fence 8 m off rolls two dice from inside the aura, one from outside.
    const atFence = (t: BattleState) => ok(applyAction(t, { type: 'attack', unit: 'rogue_0', target: 'prop:26', ranged: true })).events.find((e) => e.t === 'attack');
    const fenced = atFence(s);
    assert.ok(fenced?.t === 'attack' && fenced.roll.rolls.length === 2 && fenced.roll.d20 === Math.min(...fenced.roll.rolls));
    const outside = structuredClone(s);
    outside.units.rogue_0.pos = { x: 13.25, z: 10.25 };
    assert.equal(atFence(outside)?.t === 'attack' && atFence(outside)?.roll.rolls.length, 1);
    // The roll: two d20, keeping the lower.
    const atk = ok(applyAction(s, { type: 'attack', unit: 'rogue_0', target: 'n' })).events.find((e) => e.t === 'attack');
    assert.ok(atk?.t === 'attack');
    assert.equal(atk.roll.rolls.length, 2);
    assert.equal(atk.roll.d20, Math.min(...atk.roll.rolls));
    // Two Northstars: still plain disadvantage, two dice.
    const two = structuredClone(s);
    two.units.b.character = { ...two.units.b.character!, clan: 'Northstar' };
    const pv2 = attackPreview(two, two.units.rogue_0, two.units.n, 'melee');
    assert.equal(pv2.adv, 'disadvantage');
    assert.equal(pv2.reasons.filter((x) => x === 'aura').length, 1);
    // Out at 5 m it's gone.
    const far = structuredClone(s);
    far.units.rogue_0.pos = { x: 13.25, z: 10.25 };
    assert.equal(dist(far.units.rogue_0.pos, far.units.n.pos), 5);
    assert.ok(!attackPreview(far, far.units.rogue_0, far.units.n, 'ranged').reasons.includes('aura'));
    // The Northstar and its friends inside strike as usual.
    assert.ok(!attackPreview(s, s.units.n, r, 'melee').reasons.includes('aura'));
    place(s, 'b', { x: 11.25, z: 10.25 });
    assert.ok(!attackPreview(s, s.units.b, r, 'melee').reasons.includes('aura'));
  });

  it('the aura: a foe who dashes or warps into it on its own turn loses half the movement left; a friend does not', () => {
    // Changed on purpose (owner, 2026-10-20, D17): the penalty spares the Northstar's allies. This
    // test used a party Northstar slowing its own ally; now the Northstar is an enemy, and the same
    // moves into a party Northstar's aura cost nothing.
    /** Aki (a Ryusei with Body Flicker) at (8.25, 10.25); a Northstar at (18.25, 12.25), its aura from x ≈ 14.2 on Aki's row. */
    const start = (friend = false): BattleState => {
      const s = turnOf(createBattle(setup({
        party: [{ character: hero({ id: 'a', name: 'Aki' }), pos: { x: 8, z: 10 } }, ...(friend ? [{ character: northstar(), pos: { x: 18, z: 12 } }] : [])],
        enemies: [{ kind: 'rogue', pos: { x: 6, z: 18 } }, ...(friend ? [] : [{ kind: 'rogue' as const, clan: 'Northstar' as const, pos: { x: 18, z: 12 } }])],
      })).state, 'a');
      const n = friend ? s.units.n : s.units.rogue_1;
      assert.deepEqual([s.units.a.pos, n.pos, n.character?.clan], [{ x: 8.25, z: 10.25 }, { x: 18.25, z: 12.25 }, 'Northstar']);
      return s;
    };
    const slowed = (out: ReturnType<typeof applyAction>) => out.events.find((e) => e.t === 'slowed');
    // A plain walk in: nothing lost.
    const walk = ok(applyAction(start(), { type: 'move', unit: 'a', to: cellOf({ x: 16.25, z: 10.25 }) }));
    assert.equal(slowed(walk), undefined);
    assert.equal(walk.state.units.a.turn.move, 1);
    // After a Dash: half of what is left goes at the edge, and the walk ends where the rest runs out.
    const dashed = ok(applyAction(start(), { type: 'dash', unit: 'a' })).state;
    assert.equal(dashed.units.a.turn.move, 18);
    const to = cellOf({ x: 24.25, z: 10.25 });
    const run = ok(applyAction(dashed, { type: 'move', unit: 'a', to }));
    const sl = slowed(run);
    assert.ok(sl?.t === 'slowed' && sl.unit === 'a' && sl.by === 'rogue_1');
    const a = run.state.units.a;
    // What is left, plus what it walked, plus what the aura took: the 18 m of the dash.
    assert.ok(Math.abs(a.turn.move + a.turn.moved + sl.move - 18) < 1e-6);
    assert.ok(sl.move > 4);
    assert.notDeepEqual(cellOf(a.pos), to);
    assert.ok(a.turn.move < 0.71);
    // The move event comes before the slow, so the screen shows it at the edge.
    assert.ok(kinds(run.events).indexOf('move') < kinds(run.events).indexOf('slowed'));
    // Shooting-Star Thrust into it: from 9 m of movement to 4.5.
    const warp = start();
    warp.nodes.push({ id: 'n1', owner: 'a', pos: { x: 17.25, z: 10.25 } });
    const warped = ok(applyAction(warp, { type: 'jutsu', unit: 'a', jutsu: 'ryusei_warp', at: { x: 17.25, z: 10.25 } }));
    assert.equal(warped.state.units.a.turn.move, 4.5);
    assert.ok(slowed(warped));
    // Body Flicker into it: the same.
    const flick = ok(applyAction(start(), { type: 'jutsu', unit: 'a', jutsu: 'body_flicker', at: { x: 14.75, z: 10.25 } }));
    assert.equal(flick.state.units.a.turn.move, 4.5);
    assert.ok(slowed(flick));
    // Already inside, a flicker within it costs nothing more.
    const inside = start();
    inside.units.a.pos = { x: 15.25, z: 10.25 };
    assert.equal(slowed(ok(applyAction(inside, { type: 'jutsu', unit: 'a', jutsu: 'body_flicker', at: { x: 17.25, z: 10.25 } }))), undefined);
    // A friend's aura spares it: the same dash, warp and flicker lose nothing.
    const friendRun = ok(applyAction(ok(applyAction(start(true), { type: 'dash', unit: 'a' })).state, { type: 'move', unit: 'a', to }));
    assert.equal(slowed(friendRun), undefined);
    assert.deepEqual(cellOf(friendRun.state.units.a.pos), to);
    assert.equal(friendRun.state.units.a.turn.move, 2);
    const friendWarp = start(true);
    friendWarp.nodes.push({ id: 'n1', owner: 'a', pos: { x: 17.25, z: 10.25 } });
    const fw = ok(applyAction(friendWarp, { type: 'jutsu', unit: 'a', jutsu: 'ryusei_warp', at: { x: 17.25, z: 10.25 } }));
    assert.deepEqual([slowed(fw), fw.state.units.a.turn.move], [undefined, 9]);
    const ff = ok(applyAction(start(true), { type: 'jutsu', unit: 'a', jutsu: 'body_flicker', at: { x: 14.75, z: 10.25 } }));
    assert.deepEqual([slowed(ff), ff.state.units.a.turn.move], [undefined, 9]);
    // Sides go by who a unit fights for now: an enemy the party commanded is spared by the party's
    // Northstar, and slowed by its own side's.
    const taken = start(true);
    taken.units.rogue_0.team = 'party';
    taken.units.rogue_0.commanded = { by: 'n', team: 'enemy', rounds: 1 };
    assert.equal(auraEntered(taken, { ...taken.units.rogue_0, pos: { x: 15.25, z: 12.25 } }, { x: 10.25, z: 12.25 }), undefined);
    const theirs = start();
    theirs.units.a.team = 'enemy';
    assert.equal(auraEntered(theirs, { ...theirs.units.a, pos: { x: 15.25, z: 10.25 } }, { x: 8.25, z: 10.25 }), undefined);
  });

  it('Command: a Minion that fails a WIS save fights for the Northstar until the end of its next turn', () => {
    const s = northstarTurn({ enemies: [{ kind: 'raider', pos: { x: 14, z: 10 } }, { kind: 'rogue', pos: { x: 17, z: 13 } }] });
    const out = seeded(s, (t) => cast(t, 'raider_0'), failed);
    const r = out.state.units.raider_0;
    assert.equal(r.team, 'party');
    assert.deepEqual(r.commanded, { by: 'n', team: 'enemy', rounds: 1 });
    assert.equal(r.intent, undefined);
    const save = out.events.find((e) => e.t === 'save');
    assert.ok(save?.t === 'save' && save.unit === 'raider_0' && save.what === 'northstar_command' && save.roll.dc === s.units.n.saveDC);
    assert.ok(out.events.some((e) => e.t === 'command' && e.on && e.unit === 'raider_0'));
    assert.equal(out.state.units.n.chakra, s.units.n.chakra - 4);
    assert.equal(out.state.units.n.turn.action, false);
    // A bloodline ability: no seals, so the blade stays drawn.
    assert.equal(out.state.units.n.armed, s.units.n.armed);
    // A save that holds: nothing changes but the chakra and the action.
    const held = seeded(s, (t) => cast(t, 'raider_0'), (o) => !failed(o));
    assert.equal(held.state.units.raider_0.team, 'enemy');
    assert.equal(held.state.units.n.chakra, s.units.n.chakra - 4);
    // On its turn it goes for its old friend.
    const turn = turnOf(out.state, 'raider_0');
    assert.equal(planIntent(turn, turn.units.raider_0)?.target, 'rogue_0');
    const a = aiAction(turn);
    assert.ok(a && a.type !== 'endTurn', JSON.stringify(a));
    ok(applyAction(turn, a));
    // When its turn ends, it is back with the enemies and has a plan against the party.
    const back = ok(applyAction(turn, { type: 'endTurn', unit: 'raider_0' }));
    const rb = back.state.units.raider_0;
    assert.equal(rb.team, 'enemy');
    assert.equal(rb.commanded, undefined);
    assert.equal(rb.intent?.target, 'n');
    assert.ok(back.events.some((e) => e.t === 'command' && !e.on && e.unit === 'raider_0'));
  });

  it('Command is refused before paying: a Captain below level 5, a boss, a Mirai, the party, one already taken', () => {
    const s = northstarTurn({ enemies: [{ kind: 'raider', pos: { x: 14, z: 10 }, rank: 'captain' }, { kind: 'rogue', pos: { x: 14, z: 13 } }, { kind: 'jonin', pos: { x: 13, z: 7 } }] });
    const low = structuredClone(s);
    low.units.n.level = 4;
    assert.equal(cast(low, 'raider_0').reason, 'notMinion');
    low.units.n.level = 5;
    ok(cast(low, 'raider_0'));
    // Mirai are immune: the rogues, and Kagero the Captain too.
    assert.equal(cast(s, 'rogue_0').reason, 'mindImmune');
    assert.equal(cast(s, 'jonin_0').reason, 'mindImmune');
    const lair = turnOf(createBattle(setup({ party: [{ character: northstar(), pos: { x: 11, z: 13 } }], enemies: [{ kind: 'hydra', pos: { x: 16, z: 8 } }] })).state, 'n');
    const head = Object.values(lair.units).find((u) => u.kind === 'hydra_head' && dist(u.pos, lair.units.n.pos) < 9 && lineOfSight(lair, lair.units.n.pos, u.pos))!;
    assert.equal(cast(lair, head.id).reason, 'cantControl');
    const pair = northstarTurn({ party: [
      { character: northstar(), pos: { x: 8, z: 10 } },
      { character: hero({ id: 'b', name: 'Bo' }), pos: { x: 10, z: 12 } },
    ] });
    assert.equal(cast(pair, 'b').reason, 'cantCommand');
    // One already under command; a second target before level 9; a beast; before the fighting.
    const taken = seeded(s, (t) => cast(t, 'raider_0'), failed).state;
    taken.units.n.turn.action = true;
    assert.equal(cast(taken, 'raider_0').reason, 'alreadyCommanded');
    const two = northstarTurn({ enemies: [{ kind: 'raider', pos: { x: 14, z: 10 } }, { kind: 'raider', pos: { x: 14, z: 12 } }] });
    assert.equal(cast(two, 'raider_0', { target2: 'raider_1' }).reason, 'oneTarget');
    const beast = structuredClone(two);
    beast.units.raider_0.creature = 'beast';
    assert.equal(cast(beast, 'raider_0').reason, 'notNinja');
    const sneaking = createBattle(setup({ stealth: true, party: [{ character: northstar(), pos: { x: 8, z: 10 } }], enemies: [{ kind: 'raider', pos: { x: 14, z: 10 }, route: [{ x: 14, z: 10 }] }] })).state;
    assert.equal(cast(sneaking, 'raider_0').reason, 'combatOnly');
    // Too far, or out of sight.
    const far = structuredClone(two);
    far.units.raider_0.pos = { x: 17.75, z: 10.25 };
    assert.equal(cast(far, 'raider_0').reason, 'outOfRange');
    // Reach is asked last: a boss far off is refused as a boss, and before the fighting, for that.
    const farBoss = structuredClone(far);
    farBoss.units.raider_0.rank = 'boss';
    assert.equal(cast(farBoss, 'raider_0').reason, 'cantControl');
    const farSneak = structuredClone(sneaking);
    farSneak.units.raider_0.pos = { x: 20.25, z: 10.25 };
    assert.equal(cast(farSneak, 'raider_0').reason, 'combatOnly');
  });

  it('a commanded enemy is still an enemy: no victory while it stands, and the result counts it as one', () => {
    const s = northstarTurn({ enemies: [{ kind: 'raider', pos: { x: 14, z: 10 } }] });
    const out = seeded(s, (t) => cast(t, 'raider_0'), failed);
    assert.equal(out.state.phase, 'combat');
    const r = battleResult(out.state);
    assert.deepEqual(r.members.map((m) => m.id), ['n']);
    assert.deepEqual(r.enemies.map((e) => e.id), ['raider_0']);
    // Struck down while under command, it falls as an enemy (and the fight is won).
    const t = structuredClone(out.state);
    const ev: BattleEvent[] = [];
    damage(t, t.units.raider_0, 999, 'Force', { source: 'n' }, ev);
    assert.equal(t.units.raider_0.team, 'enemy');
    assert.equal(t.units.raider_0.commanded, undefined);
    assert.equal(t.units.raider_0.down, 'dead');
    assert.deepEqual(kinds(ev).slice(1), ['command', 'down']);
    assert.equal(ok(applyAction(t, { type: 'endTurn', unit: 'n' })).state.outcome, 'victory');
    // Nobody in the party takes its reins, nor opens the backpack for it.
    assert.equal(applyAction(out.state, { type: 'setController', unit: 'raider_0', controller: 'player' }).reason, 'noUnit');
    assert.equal(applyAction(turnOf(out.state, 'raider_0'), { type: 'item', unit: 'raider_0', item: 'pill' }).reason, 'noItems');
  });

  it('a unit that changes sides changes the plans aimed at it: no enemy goes on to strike its own side', () => {
    const s = northstarTurn({ enemies: [{ kind: 'raider', pos: { x: 14, z: 10 } }, { kind: 'rogue', pos: { x: 18, z: 10 } }] });
    // Hurt, the commanded raider is the one the rogue goes for.
    s.units.raider_0.hp = 6;
    const out = seeded(s, (t) => cast(t, 'raider_0'), failed);
    const planned = ok(applyAction(turnOf(out.state, 'rogue_0'), { type: 'endTurn', unit: 'rogue_0' })).state;
    assert.equal(planned.units.rogue_0.intent?.target, 'raider_0');
    // The raider's turn ends and it is back with its friends: the rogue plans again, and says so.
    const back = ok(applyAction(turnOf(planned, 'raider_0'), { type: 'endTurn', unit: 'raider_0' }));
    assert.equal(back.state.units.raider_0.team, 'enemy');
    assert.equal(back.state.units.rogue_0.intent?.target, 'n');
    assert.ok(back.events.some((e) => e.t === 'intent' && e.unit === 'rogue_0'));
    // A plan made before a change of sides is dropped on the turn, never carried out against a friend.
    const stale = turnOf(back.state, 'rogue_0');
    stale.units.rogue_0.intent = { kind: 'jutsu', what: 'fireball_goukakyu', target: 'raider_0', at: { ...stale.units.raider_0.pos } };
    const a = aiAction(stale);
    assert.ok(a && a.type !== 'endTurn' && !('target' in a && a.target === 'raider_0'), JSON.stringify(a));
  });

  it('a Minion caught by surprise spends its Command on the turn it loses', () => {
    const s = northstarTurn({ enemies: [{ kind: 'raider', pos: { x: 14, z: 10 } }] });
    s.units.raider_0.cond.surprised = true;
    const t = structuredClone(seeded(s, (x) => cast(x, 'raider_0'), failed).state);
    t.turn = t.order.indexOf('raider_0');
    const ev: BattleEvent[] = [];
    beginTurn(t, ev);
    assert.ok(ev.some((e) => e.t === 'note' && e.key === 'surprisedSkip'));
    assert.equal(t.units.raider_0.team, 'enemy');
    assert.equal(t.units.raider_0.commanded, undefined);
    assert.ok(ev.some((e) => e.t === 'command' && !e.on && e.unit === 'raider_0'));
    assert.equal(t.units.raider_0.intent?.target, 'n');
    assert.equal(current(t)?.id, 'n');
  });

  it('from level 9 Command takes two Minions, each with its own save, for two of their turns', () => {
    const s = northstarTurn({ enemies: [{ kind: 'raider', pos: { x: 14, z: 10 } }, { kind: 'raider', pos: { x: 14, z: 12 } }] });
    s.units.n.level = 9;
    const out = seeded(s, (t) => cast(t, 'raider_0', { target2: 'raider_1' }), (o) => o.events.filter((e) => e.t === 'save').length === 2 && allFailed(o));
    for (const id of ['raider_0', 'raider_1']) assert.deepEqual(out.state.units[id].commanded, { by: 'n', team: 'enemy', rounds: 2 });
    assert.equal(out.state.units.n.chakra, s.units.n.chakra - 4);
    // Its first turn ends still under command; the second sends it back.
    const once = ok(applyAction(turnOf(out.state, 'raider_0'), { type: 'endTurn', unit: 'raider_0' })).state;
    assert.equal(once.units.raider_0.team, 'party');
    assert.equal(once.units.raider_0.commanded?.rounds, 1);
    const twice = ok(applyAction(turnOf(once, 'raider_0'), { type: 'endTurn', unit: 'raider_0' })).state;
    assert.equal(twice.units.raider_0.team, 'enemy');
  });

  it('Natural Submission: a beast or summon that fails a WIS save joins for the rest of the battle; never a boss', () => {
    const s = northstarTurn({ enemies: [{ kind: 'rogue', pos: { x: 14, z: 10 } }, { kind: 'raider', pos: { x: 14, z: 13 } }] });
    s.units.rogue_0.creature = 'beast';
    const sub = (t: BattleState, target: string) => cast(t, target, { jutsu: 'northstar_submission' });
    const out = seeded(s, (t) => sub(t, 'rogue_0'), failed);
    const b = out.state.units.rogue_0;
    assert.equal(b.team, 'party');
    assert.deepEqual(b.joined, { by: 'n', team: 'enemy' });
    assert.ok(out.events.some((e) => e.t === 'joined' && e.unit === 'rogue_0'));
    assert.equal(out.state.units.n.chakra, s.units.n.chakra - 5);
    // It stays: its turn ends and it is still with the party, which doesn't count it as a member.
    const later = ok(applyAction(turnOf(out.state, 'rogue_0'), { type: 'endTurn', unit: 'rogue_0' })).state;
    assert.equal(later.units.rogue_0.team, 'party');
    assert.ok(!battleResult(later).members.some((m) => m.id === 'rogue_0'));
    // Struck down, it falls as the beast it is (no death saves, no fallen party member); nobody
    // takes its reins or opens the party's backpack for it.
    const struck = structuredClone(later);
    damage(struck, struck.units.rogue_0, 999, 'Force', {}, []);
    assert.equal(struck.units.rogue_0.down, 'dead');
    assert.equal(struck.units.rogue_0.stats2.fell, false);
    assert.equal(applyAction(later, { type: 'setController', unit: 'rogue_0', controller: 'player' }).reason, 'noUnit');
    assert.equal(applyAction(turnOf(later, 'rogue_0'), { type: 'item', unit: 'rogue_0', item: 'pill' }).reason, 'noItems');
    // A ninja isn't a beast; a boss isn't taken.
    assert.equal(sub(s, 'raider_0').reason, 'notBeast');
    const boss = structuredClone(s);
    boss.units.rogue_0.rank = 'boss';
    assert.equal(sub(boss, 'rogue_0').reason, 'cantControl');
  });

  it('the AI: a Northstar facing a lone Minion of weak will commands it', () => {
    const { state } = createBattle(setup({ party: [{ character: northstar(), pos: { x: 8, z: 10 }, controller: 'ai' }], enemies: [{ kind: 'raider', pos: { x: 14, z: 10 } }] }));
    const s = turnOf(state, 'n');
    s.units.n.jutsus = ['northstar_command', 'northstar_submission'];
    s.units.raider_0.stats = { ...s.units.raider_0.stats, wis: 3 };
    const a = aiAction(s);
    assert.deepEqual(a, { type: 'jutsu', unit: 'n', jutsu: 'northstar_command', at: s.units.raider_0.pos, target: 'raider_0' });
    ok(applyAction(s, a!));
    // Out of reach, it walks in first.
    const far = structuredClone(s);
    far.units.raider_0.pos = { x: 20.25, z: 10.25 };
    assert.equal(aiAction(far)?.type, 'move');
  });

  it('the AI (D21): an enemy Northstar commands a valid target in place of an attack on one foe; the party gives it none (D18)', () => {
    // The lookout (a Northstar rogue) 8 m from Aki: the party's ninjas have no rank, so it casts its Fireball.
    const s = turnOf(createBattle(setup({ enemies: [{ kind: 'rogue', clan: 'Northstar', pos: { x: 16, z: 10 } }] })).state, 'rogue_0');
    s.units.rogue_0.intent = undefined;
    assert.equal(commandRefused(s, s.units.rogue_0, s.units.a), 'cantCommand');
    assert.equal(planIntent(s, s.units.rogue_0)?.what, 'fireball_goukakyu');
    // Were a foe a Minion of weak will (none is today: D18 is still the owner's to answer), it would
    // take that foe's mind rather than burn it.
    const ranked = structuredClone(s);
    ranked.units.a.rank = 'minion';
    ranked.units.a.stats = { ...ranked.units.a.stats, wis: 3 };
    const a = aiAction(ranked);
    assert.deepEqual(a, { type: 'jutsu', unit: 'rogue_0', jutsu: 'northstar_command', at: ranked.units.a.pos, target: 'a' });
    ok(applyAction(ranked, a!));
    // Not a mind it can hardly break.
    const strong = structuredClone(ranked);
    strong.units.a.stats = { ...strong.units.a.stats, wis: 30 };
    assert.equal(planIntent(strong, strong.units.rogue_0)?.what, 'fireball_goukakyu');
  });
});

describe('the counter cycle (docs/CLANS_DESIGN.md)', () => {
  const node = (id: string, pos: Pt, owner: string): WeaponNode => ({ id, owner, pos: { ...pos } });

  it('Mirai beats Northstar: a Mirai\'s mind can\'t be commanded', () => {
    const s = turnOf(createBattle(setup({ party: [{ character: hero({ id: 'n', clan: 'Northstar' }), pos: { x: 8, z: 10 } }] })).state, 'n');
    assert.equal(s.units.rogue_0.character?.clan, 'Mirai');
    assert.equal(applyAction(s, { type: 'jutsu', unit: 'n', jutsu: 'northstar_command', at: { ...s.units.rogue_0.pos }, target: 'rogue_0' }).reason, 'mindImmune');
  });

  it('Kōton beats Mirai: a metal wall hides the enemy\'s next move from the Eye of Tomorrow', () => {
    const s = turnOf(createBattle(setup({ party: [
      { character: hero({ id: 'm', clan: 'Mirai' }), pos: { x: 8, z: 10 } },
      { character: hero({ id: 'k', clan: 'Koton' }), pos: { x: 8, z: 12 } },
    ] })).state, 'k');
    assert.ok(foreseen(s).rogue_0);
    const walled = ok(applyAction(s, { type: 'jutsu', unit: 'k', jutsu: 'koton_wall', at: { x: 11.25, z: 10.25 } })).state;
    assert.equal(foreseen(walled).rogue_0, undefined);
  });

  it('Ryusei beats Kōton: Shooting-Star Thrust goes through a metal wall', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    assert.equal(s.units.a.character?.clan, 'Ryusei');
    s.walls.push({ id: 'w1', kind: 'metal', a: { x: 10.5, z: 11 }, b: { x: 10.5, z: 15.5 }, hp: 20, maxHp: 20, owner: 'rogue_0' });
    s.nodes.push(node('n1', { x: 12.25, z: 13.25 }, 'a'));
    assert.equal(lineOfSight(s, s.units.a.pos, { x: 12.25, z: 13.25 }), false);
    assert.deepEqual(ok(applyAction(s, { type: 'jutsu', unit: 'a', jutsu: 'ryusei_warp', at: { x: 12.25, z: 13.25 } })).state.units.a.pos, { x: 12.25, z: 13.25 });
  });

  it('Northstar beats Ryusei: warping into its aura costs half the movement, and the blow from behind loses its edge', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    const r = s.units.rogue_0;
    r.character = { ...r.character!, clan: 'Northstar' };
    s.nodes.push(node('n1', r.pos, 'a'));
    const out = ok(applyAction(s, { type: 'jutsu', unit: 'a', jutsu: 'ryusei_warp', at: { ...r.pos } }));
    const a = out.state.units.a;
    assert.equal(a.turn.move, s.units.a.turn.move / 2);
    assert.ok(out.events.some((e) => e.t === 'slowed' && e.unit === 'a' && e.by === 'rogue_0'));
    assert.equal(a.cond.warpEdge, true);
    const pv = attackPreview(out.state, a, out.state.units.rogue_0, 'melee');
    assert.ok(pv.reasons.includes('behind') && pv.reasons.includes('aura'));
    assert.equal(pv.adv, 'none');
  });

  it('and Shooting-Star Thrust\'s blow can\'t be evaded by a Mirai', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    s.nodes.push(node('n1', s.units.rogue_0.pos, 'a'));
    const warped = ok(applyAction(s, { type: 'jutsu', unit: 'a', jutsu: 'ryusei_warp', at: { ...s.units.rogue_0.pos } })).state;
    warped.units.rogue_0.hp = 1;
    let struck = false;
    for (let seed = 1; seed < 60 && !struck; seed++) {
      const t = structuredClone(warped);
      t.seed = seed;
      const out = ok(applyAction(t, { type: 'attack', unit: 'a', target: 'rogue_0' }));
      if (!out.events.some((e) => e.t === 'attack' && e.roll.success)) continue;
      struck = true;
      assert.ok(!out.events.some((e) => e.t === 'evade'));
      assert.ok(out.state.units.rogue_0.down);
    }
    assert.ok(struck, 'some seed lands the blow');
  });
});

describe('enemy clans are mixed (docs/CLANS_DESIGN.md, D6)', () => {
  const battleOf = (id: EncounterId, seed = 7, party = [{ character: hero({ id: 'a', name: 'Aki' }) }]): BattleState =>
    createBattle({ ...encounterSetup(id, party, { seed, difficulty: 'normal', supplies: { ...SUPPLIES } }), stealth: false }).state;
  const enemyNinjas = (s: BattleState): Unit[] => Object.values(s.units).filter((u) => u.team === 'enemy' && u.kind === 'ninja');
  const clansOf = (s: BattleState): Set<string> => new Set(enemyNinjas(s).map((u) => u.character!.clan));
  const who = (s: BattleState) => enemyNinjas(s).map((u) => [u.id, u.character!.clan, u.name, u.nameEs]);

  it('every shipped fight against ninjas brings more than one clan; a mission\'s road brings all four', () => {
    for (const id of Object.keys(ENCOUNTERS) as EncounterId[]) {
      if (id === 'hydra') {
        assert.equal(clansOf(battleOf(id)).size, 0, 'the hydra fights alone');
        continue;
      }
      assert.ok(clansOf(battleOf(id)).size > 1, `${id}: ${[...clansOf(battleOf(id))]}`);
    }
    for (const m of MISSIONS) {
      // The battles every run goes through (the night raid only comes with an ambush).
      const road = m.zones.flatMap((z) => z.nodes).flatMap((n) => (n.kind === 'battle' ? [n.battle.encounter] : []));
      const met = new Set(road.flatMap((id) => [...clansOf(battleOf(id))]));
      assert.deepEqual([...met].sort(), ['Koton', 'Mirai', 'Northstar', 'Ryusei'], m.id);
      // The night raid brings all four at once.
      assert.equal(clansOf(battleOf(m.ambush.encounter)).size, 4);
    }
  });

  it('each slot keeps its clan, its template\'s look and a name of its own, whatever the seed', () => {
    const a = battleOf('cedar_rogues', 1);
    assert.deepEqual(who(a), who(battleOf('cedar_rogues', 99)));
    assert.deepEqual(who(a), [
      ['rogue_0', 'Mirai', 'Rogue', 'Renegado'],
      ['rogue_1', 'Northstar', 'Lookout', 'Vigía'],
      ['raider_0', 'Ryusei', 'Raider', 'Asaltante'],
    ]);
    assert.deepEqual(who(battleOf('night_raid')), [
      ['raider_0', 'Ryusei', 'Raider', 'Asaltante'],
      ['raider_1', 'Koton', 'Iron Fist', 'Puño de hierro'],
      ['raider_2', 'Northstar', 'Shade', 'Sombra'],
      ['jonin_0', 'Mirai', 'Kagero', undefined],
    ]);
    assert.deepEqual(who(battleOf('river_patrol')), [
      ['rogue_0', 'Ryusei', 'Stalker', 'Acechador'],
      ['rogue_1', 'Mirai', 'Rogue', 'Renegado'],
      ['hunter_0', 'Koton', 'Hunter-nin', 'Cazador'],
    ]);
    assert.equal(a.units.rogue_1.character?.title, 'Rogue lookout');
    // The look is the template's, slot for slot: the lookout looks like the second rogue always did.
    const plain = createBattle(setup({ enemies: [{ kind: 'rogue', pos: { x: 14, z: 10 } }, { kind: 'rogue', pos: { x: 14, z: 13 } }, { kind: 'raider', pos: { x: 16, z: 10 } }] })).state;
    for (const id of ['rogue_0', 'rogue_1', 'raider_0']) assert.deepEqual(a.units[id].look, plain.units[id].look, id);
    // Enemies that share a name are numbered; one alone is not.
    assert.deepEqual(['rogue_0', 'rogue_1'].map((id) => plain.units[id].nameEs), ['Renegado 1', 'Renegado 2']);
    assert.deepEqual([plain.units.raider_0.name, createBattle(setup()).state.units.rogue_0.name], ['Raider', 'Rogue']);
    const twins = createBattle(setup({ enemies: [
      { kind: 'rogue', clan: 'Northstar', pos: { x: 14, z: 10 } },
      { kind: 'rogue', pos: { x: 14, z: 13 } },
      { kind: 'rogue', clan: 'Northstar', pos: { x: 16, z: 10 } },
    ] })).state;
    assert.deepEqual(['rogue_0', 'rogue_1', 'rogue_2'].map((id) => twins.units[id].nameEs), ['Vigía 1', 'Renegado', 'Vigía 2']);
  });

  it('each fights with its clan: the clan\'s abilities and ability bonus, and the template\'s own jutsu', () => {
    const s = battleOf('night_raid');
    const [r0, r1, r2] = ['raider_0', 'raider_1', 'raider_2'].map((id) => s.units[id]);
    assert.deepEqual(r0.jutsus.slice(0, 2), ['ryusei_warp', 'ryusei_swap']);
    assert.deepEqual(r1.jutsus.slice(0, 2), ['koton_block', 'koton_wall']);
    assert.deepEqual(r2.jutsus.slice(0, 2), ['northstar_command', 'northstar_submission']);
    for (const r of [r0, r1, r2]) assert.ok(r.jutsus.includes('leaf_hurricane_senpuu'), r.id);
    // Kōton's +2 CON: CON 14 plays as 16, with more HP than its Ryusei brother; Northstar's +2 CHA.
    assert.deepEqual([r0.stats.dex, r1.stats.con, r2.stats.cha], [16, 16, 10]);
    assert.ok(r1.maxHp > r0.maxHp);
  });

  it('an enemy Northstar: its aura works on the party, and Command can\'t take the party\'s ninjas (D18)', () => {
    const s = turnOf(battleOf('cedar_rogues'), 'rogue_1');
    const lookout = s.units.rogue_1;
    place(s, 'a', { x: lookout.pos.x - 1.5, z: lookout.pos.z });
    const pv = attackPreview(s, s.units.a, s.units.rogue_1, 'melee');
    assert.ok(pv.reasons.includes('aura'));
    assert.equal(applyAction(s, { type: 'jutsu', unit: 'rogue_1', jutsu: 'northstar_command', at: { ...s.units.a.pos }, target: 'a' }).reason, 'cantCommand');
    // A party Northstar can take the lookout and the raider, but not the Mirai rogue.
    const n = battleOf('cedar_rogues', 7, [{ character: hero({ id: 'n', name: 'Yua', clan: 'Northstar' }) }]);
    assert.deepEqual(['rogue_0', 'rogue_1', 'raider_0'].map((id) => commandRefused(n, n.units.n, n.units[id])), ['mindImmune', null, null]);
  });

  it('AI-only battles on every shipped encounter end, and every action the AI sends is accepted', () => {
    // Without their S-rank ultimates (which end most fights in the first round), so the enemies get to act.
    const noUlt = (c: ShinobiCharacter): ShinobiCharacter => ({ ...c, effects: [], selectedJutsus: { ...c.selectedJutsus, slot5Ultimate: '' } });
    const party = [
      { character: noUlt(hero({ id: 'a', name: 'Aki' })), controller: 'ai' as const },
      { character: noUlt(HANA), controller: 'ai' as const, aiOrder: 'support' as const },
      { character: noUlt(KENJI), controller: 'ai' as const },
      { character: noUlt(hero({ id: 'n', name: 'Yua', clan: 'Northstar' })), controller: 'ai' as const },
    ];
    for (const id of Object.keys(ENCOUNTERS) as EncounterId[]) {
      for (const seed of [1, 2]) {
        let s = battleOf(id, seed, party);
        let last = '';
        let inTurn = 0;
        for (let step = 0; s.phase !== 'ended'; step++) {
          assert.ok(step < 4000, `${id} seed ${seed}: no end`);
          const a = aiAction(s);
          assert.ok(a, `${id} seed ${seed}: the AI has nothing to do`);
          const u = current(s)!;
          inTurn = u.id === last ? inTurn + 1 : 0;
          last = u.id;
          assert.ok(inTurn <= 12, `${id} seed ${seed}: ${u.id} keeps acting without ending its turn`);
          const out = applyAction(s, a);
          assert.ok(out.ok, `${id} seed ${seed}: ${u.id} sent ${JSON.stringify(a)}, refused: ${out.reason}`);
          s = out.state;
        }
      }
    }
  });

  it('AI-only battles (D21): the enemies use their clans\' moves on the party, with every action accepted and no stall', () => {
    const noUlt = (c: ShinobiCharacter): ShinobiCharacter => ({ ...c, effects: [], selectedJutsus: { ...c.selectedJutsus, slot5Ultimate: '' } });
    const four = [
      { character: noUlt(hero({ id: 'a', name: 'Aki' })), controller: 'ai' as const },
      { character: noUlt(HANA), controller: 'ai' as const, aiOrder: 'support' as const },
      { character: noUlt(KENJI), controller: 'ai' as const },
      { character: noUlt(hero({ id: 'n', name: 'Yua', clan: 'Northstar' })), controller: 'ai' as const },
    ];
    const runs: [EncounterId, number, typeof four][] = [];
    for (const id of ['river_patrol', 'cedar_rogues', 'night_raid'] as EncounterId[]) for (const seed of [1, 2, 3, 4]) runs.push([id, seed, four]);
    // The mission's own party of three gives the enemies longer fights (more of them since Kagero
    // opens with his Chidori, which ends some raids before a Kōton needs its wall, and since his
    // clones join his blows: a captain knows the clone jutsu, battle/units.ts).
    for (let seed = 1; seed <= 24; seed++) runs.push(['night_raid', seed, four.slice(0, 3)]);
    const seen = new Set<string>();
    for (const [id, seed, party] of runs) {
      let s = battleOf(id, seed, party);
      let last = '';
      let inTurn = 0;
      for (let step = 0; s.phase !== 'ended'; step++) {
        assert.ok(step < 4000, `${id} seed ${seed}: no end`);
        const a = aiAction(s)!;
        const u = current(s)!;
        inTurn = u.id === last ? inTurn + 1 : 0;
        last = u.id;
        assert.ok(inTurn <= 12, `${id} seed ${seed}: ${u.id} stalls`);
        const out = applyAction(s, a);
        assert.ok(out.ok, `${id} seed ${seed}: ${u.id} sent ${JSON.stringify(a)}, refused: ${out.reason}`);
        const enemy = (uid: string) => s.units[uid]?.team === 'enemy';
        for (const e of out.events) {
          if (e.t === 'jutsu' && enemy(e.unit)) seen.add(e.jutsu);
          if (e.t === 'evade' && enemy(e.unit)) seen.add('evasion');
          if (e.t === 'node' && e.on && enemy(e.node.owner)) seen.add('node');
          if (e.t === 'attack' && enemy(e.unit) && e.reasons?.includes('behind')) seen.add('from behind');
        }
        s = out.state;
      }
    }
    for (const k of ['katon_pursuing_flame', 'evasion', 'node', 'ryusei_warp', 'from behind', 'koton_block', 'koton_wall']) assert.ok(seen.has(k), `${k}: ${[...seen].join(', ')}`);
  });
});

describe('stealth phase', () => {
  const sneak = (over: Partial<BattleSetup> = {}) =>
    createBattle(setup({ stealth: true, enemies: [{ kind: 'rogue', pos: { x: 20, z: 10 }, look: 180, route: [{ x: 20, z: 10 }] }], ...over })).state;

  it('starts hidden from the guards, with no initiative yet', () => {
    const s = sneak();
    assert.equal(s.phase, 'stealth');
    assert.ok(s.units.rogue_0.guard);
  });

  it('walking into a vision cone raises suspicion; at 100 the alarm starts the fight', () => {
    let s = sneak();
    const out = ok(applyAction(s, { type: 'move', unit: 'a', to: cellOf({ x: 13, z: 10 }) }));
    s = out.state;
    const sus = s.phase === 'combat' ? 100 : s.units.rogue_0.guard!.suspicion.a ?? 0;
    assert.ok(sus > 0);
    // Standing in full view, the guards' turns fill it up.
    for (let i = 0; i < 6 && s.phase === 'stealth'; i++) s = ok(applyAction(s, { type: 'endTurn', unit: 'a' })).state;
    assert.equal(s.phase, 'combat');
  });

  it('a thrown stone draws a guard to look', () => {
    const s = sneak();
    const out = ok(applyAction(s, { type: 'stone', unit: 'a', at: { x: 18, z: 14 } }));
    assert.deepEqual(out.state.units.rogue_0.guard!.investigate, { x: 18, z: 14 });
    assert.equal(out.state.phase, 'stealth');
  });

  it('a silent takedown leaves a body; a loud jutsu starts the fight with the guards surprised', () => {
    const s = sneak();
    place(s, 'a', { x: 21.5, z: 10 });
    s.units.rogue_0.hp = 1;
    const out = ok(applyAction(s, { type: 'attack', unit: 'a', target: 'rogue_0' }));
    const atk = out.events.find((e) => e.t === 'attack');
    if (atk?.t === 'attack' && atk.roll.success) {
      assert.equal(out.state.phase, 'stealth');
      assert.equal(out.state.bodies.length, 1);
    } else assert.equal(out.state.phase, 'combat');
    const far = sneak();
    place(far, 'a', { x: 12.5, z: 10 });
    const loud = ok(applyAction(far, { type: 'jutsu', unit: 'a', jutsu: 'fireball_goukakyu', at: { x: 20, z: 10 } }));
    assert.equal(loud.state.phase, 'combat');
    const start = loud.events.find((e) => e.t === 'combatStart');
    assert.ok(start?.t === 'combatStart' && start.surprised.includes('rogue_0'));
  });
});

describe('the AI', () => {
  it('fights a whole battle by itself to an end', () => {
    for (const seed of [1, 2, 3]) {
      const { state } = createBattle(setup({
        seed,
        party: [
          { character: hero({ id: 'a' }), pos: { x: 6, z: 9 }, controller: 'ai', aiOrder: 'aggressive' },
          { character: { ...HANA, effects: [] }, pos: { x: 5, z: 12 }, controller: 'ai', aiOrder: 'support' },
        ],
        enemies: [
          { kind: 'rogue', pos: { x: 18, z: 9 } },
          { kind: 'hunter', pos: { x: 19, z: 12 } },
        ],
      }));
      const out = runAi(state, 3000);
      assert.equal(out.state.phase, 'ended', `seed ${seed} ended`);
      const r = battleResult(out.state);
      assert.equal(r.members.length, 2);
      assert.ok(['victory', 'defeat', 'fled'].includes(r.outcome));
    }
  });

  it('a prone enemy stands up and walks in with the half of its movement that is left', () => {
    const { state } = createBattle(setup({ enemies: [{ kind: 'raider', pos: { x: 20, z: 10 } }] }));
    const s = turnOf(state, 'raider_0');
    const r = s.units.raider_0;
    r.cond.prone = true;
    r.chakra = 0;
    r.intent = { kind: 'melee', what: r.weapon.name, target: 'a' };
    const a = aiAction(s);
    assert.equal(a?.type, 'move');
    const out = ok(applyAction(s, a!));
    assert.equal(out.state.units.raider_0.cond.prone, false);
    assert.ok(out.state.units.raider_0.turn.moved > 0 && out.state.units.raider_0.turn.moved <= r.speed / 2 + 1e-6);
    // Then it throws, rather than give up the turn.
    assert.equal(aiAction(out.state)?.type, 'attack');
  });

  it('stops for the player: their turn, or their reaction', () => {
    const { state } = createBattle(setup());
    const out = runAi(state);
    const u = current(out.state);
    assert.ok(out.state.phase === 'ended' || out.state.pending || u?.controller === 'player');
  });
});

describe('hands for seals', () => {
  it('casting stows the blade for free once a turn; then it takes the bonus action to draw it again', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    assert.equal(s.units.a.armed, true);
    const cast = ok(applyAction(s, { type: 'jutsu', unit: 'a', jutsu: 'body_flicker', at: { x: 10, z: 12 } }));
    assert.equal(cast.state.units.a.armed, false);
    assert.ok(cast.events.some((e) => e.t === 'weapon' && !e.armed && e.cost === 'free'));
    // The free interaction is spent: drawing again costs the bonus action (already used by the flicker).
    assert.equal(applyAction(cast.state, { type: 'draw', unit: 'a' }).reason, 'noBonus');
  });

  it('with the blade drawn and the interaction spent, seals wait; One-Handed Seals casts anyway', () => {
    const s = turnOf(createBattle(setup()).state, 'a');
    const drawn = ok(applyAction(ok(applyAction(s, { type: 'draw', unit: 'a' })).state, { type: 'draw', unit: 'a' })).state;
    assert.equal(drawn.units.a.armed, true);
    assert.equal(drawn.units.a.turn.bonus, false);
    assert.equal(applyAction(drawn, { type: 'jutsu', unit: 'a', jutsu: 'fireball_goukakyu', at: { x: 14, z: 10 } }).reason, 'handsBusy');
    const katana = { ...DEFAULT_CHARACTER.appearance!, slots: { ...DEFAULT_CHARACTER.appearance!.slots, held: { id: 'held_katana', colors: [] } } };
    const feat = turnOf(createBattle(setup({ party: [{ character: hero({ id: 'a', selectedFeats: ['one_handed_seals'], appearance: katana }), pos: { x: 8, z: 10 } }] })).state, 'a');
    feat.units.a.turn.interacted = true;
    const out = ok(applyAction(feat, { type: 'jutsu', unit: 'a', jutsu: 'fireball_goukakyu', at: { x: 14, z: 10 } }));
    assert.equal(out.state.units.a.armed, true);
  });

  it('Kawarimi needs free hands; a stowed blade strikes with the fists in a reaction', () => {
    const { state } = createBattle(setup({ party: [{ character: { ...KENJI, effects: [], appearance: { ...KENJI.appearance!, slots: { ...KENJI.appearance!.slots, held: { id: 'held_katana', colors: [] } } } }, pos: { x: 8, z: 10 } }] }));
    const k = state.units[KENJI.id];
    assert.equal(k.armed, true);
    const s = turnOf(state, 'rogue_0');
    place(s, 'rogue_0', { x: 9.5, z: 10 });
    let asked = false;
    for (let seed = 1; seed < 40 && !asked; seed++) {
      const t = structuredClone(s);
      t.seed = seed;
      const out = ok(applyAction(t, { type: 'attack', unit: 'rogue_0', target: KENJI.id }));
      if (out.state.pending) asked = true;
    }
    assert.equal(asked, false);
  });
});

describe('items and other actions', () => {
  it('soldier pill, bandage, explosive tag and fleeing by the edge', () => {
    let s = turnOf(createBattle(setup({ party: [
      { character: hero({ id: 'a' }), pos: { x: 8, z: 10 } },
      { character: hero({ id: 'b' }), pos: { x: 8, z: 11 } },
    ] })).state, 'a');
    s.units.a.chakra = 0;
    s = ok(applyAction(s, { type: 'item', unit: 'a', item: 'pill' })).state;
    assert.ok(s.units.a.chakra > 0);
    assert.equal(s.supplies.soldierPills, 1);
    s.units.b.hp = 3;
    s = ok(applyAction(s, { type: 'item', unit: 'a', item: 'bandage', target: 'b' })).state;
    assert.ok(s.units.b.hp > 3);
    const t = turnOf(s, 'a');
    const tag = ok(applyAction(t, { type: 'item', unit: 'a', item: 'tag', at: { x: 14, z: 10 } }));
    assert.ok(tag.events.some((e) => e.t === 'explode'));
    const edge = turnOf(s, 'a');
    edge.units.a.pos = cellCenter(cellOf({ x: 0.75, z: 10 }));
    const fled = ok(applyAction(edge, { type: 'flee', unit: 'a' } as Action));
    assert.equal(fled.state.units.a.down, 'fled');
  });
});

describe('clan playtest fixes: what the screen shows matches the engine', () => {
  it('the attack preview refuses what the engine refuses: a kunai out of sight, a blow across a metal wall', () => {
    const s = turnOf(createBattle(setup({ party: [{ character: hero({ id: 'a' }), pos: { x: 10.25, z: 10.25 } }] })).state, 'a');
    place(s, 'rogue_0', { x: 11.75, z: 10.25 });
    // In the open nothing is in the way.
    assert.equal(attackPreview(s, s.units.a, s.units.rogue_0, 'melee').blocked, undefined);
    assert.equal(attackPreview(s, s.units.a, s.units.rogue_0, 'ranged').blocked, undefined);
    // A Kōton metal wall between them: full cover, nothing passes (D13).
    s.walls.push({ id: 'w1', kind: 'metal', a: { x: 11, z: 8 }, b: { x: 11, z: 12.5 }, hp: 20, maxHp: 20 });
    const blade = attackPreview(s, s.units.a, s.units.rogue_0, 'melee');
    const kunai = attackPreview(s, s.units.a, s.units.rogue_0, 'ranged');
    assert.equal(blade.blocked, 'blocked');
    assert.equal(kunai.blocked, 'noSight');
    assert.equal(applyAction(s, { type: 'attack', unit: 'a', target: 'rogue_0' }).reason, blade.blocked);
    assert.equal(applyAction(s, { type: 'attack', unit: 'a', target: 'rogue_0', ranged: true }).reason, kunai.blocked);
  });

  it('a bonus-action ability with the bonus action spent is refused as such', () => {
    const s = turnOf(createBattle(setup({ party: [{ character: hero({ id: 'k', clan: 'Koton' }), pos: { x: 8, z: 10 } }] })).state, 'k');
    s.units.k.turn.bonus = false;
    assert.equal(applyAction(s, { type: 'jutsu', unit: 'k', jutsu: 'koton_block', at: { x: 10.25, z: 12.25 } }).reason, 'noBonus');
    s.units.k.turn.action = false;
    assert.equal(applyAction(s, { type: 'jutsu', unit: 'k', jutsu: 'koton_wall', at: { x: 11.25, z: 10.25 } }).reason, 'noAction');
  });

  it('a roll of two dice says which was kept and why; a save says which ability it is made with', () => {
    // Pursuing Flame: a DEX save with disadvantage.
    const m = turnOf(createBattle(setup({ party: [{ character: hero({ id: 'm', clan: 'Mirai' }), pos: { x: 8, z: 10 } }], enemies: [{ kind: 'raider', pos: { x: 14, z: 10 } }] })).state, 'm');
    const flame = ok(applyAction(m, { type: 'jutsu', unit: 'm', jutsu: 'katon_pursuing_flame', at: { ...m.units.raider_0.pos }, target: 'raider_0' }));
    const save = flame.events.find((e) => e.t === 'save');
    assert.ok(save?.t === 'save');
    assert.equal(save.ab, 'dex');
    assert.equal(save.roll.adv, 'disadvantage');
    assert.equal(save.roll.rolls.length, 2);
    // A blow from inside a Northstar's aura: disadvantage, and the aura is named as the reason.
    const n = turnOf(createBattle(setup({ party: [{ character: hero({ id: 'n', clan: 'Northstar' }), pos: { x: 8, z: 10 } }] })).state, 'rogue_0');
    place(n, 'rogue_0', { x: 9.75, z: 10.25 });
    const atk = ok(applyAction(n, { type: 'attack', unit: 'rogue_0', target: 'n' })).events.find((e) => e.t === 'attack');
    assert.ok(atk?.t === 'attack');
    assert.equal(atk.roll.adv, 'disadvantage');
    assert.ok(atk.reasons?.includes('aura'));
    // A plain blow: one die, nothing to tell.
    const a = turnOf(createBattle(setup()).state, 'a');
    place(a, 'rogue_0', { x: 9.5, z: 10 });
    const plain = ok(applyAction(a, { type: 'attack', unit: 'a', target: 'rogue_0' })).events.find((e) => e.t === 'attack');
    assert.ok(plain?.t === 'attack');
    assert.equal(plain.roll.rolls.length, 1);
    assert.equal(plain.roll.adv, undefined);
    assert.equal(plain.reasons, undefined);
  });

  it('a Mirai stepping aside from a jutsu: the evade event says what it stepped away from', () => {
    for (let seed = 1; seed < 80; seed++) {
      const s = turnOf(createBattle(setup({ seed, party: [{ character: hero({ id: 'm', clan: 'Mirai' }), pos: { x: 8, z: 10 } }] })).state, 'm');
      s.units.rogue_0.hp = 3;
      s.units.m.saveDC = 99;
      const out = ok(applyAction(s, { type: 'jutsu', unit: 'm', jutsu: 'katon_pursuing_flame', at: { ...s.units.rogue_0.pos }, target: 'rogue_0' }));
      const ev = out.events.find((e) => e.t === 'evade');
      if (!ev) continue;
      assert.ok(ev.t === 'evade' && ev.what === 'katon_pursuing_flame' && ev.source === 'm');
      return;
    }
    assert.fail('no seed makes the rogue step aside');
  });

  it('enemies have Spanish names for the Spanish screens', () => {
    const { state } = createBattle(setup({ enemies: [{ kind: 'rogue', pos: { x: 14, z: 10 } }, { kind: 'rogue', pos: { x: 14, z: 13 } }, { kind: 'raider', pos: { x: 16, z: 10 } }, { kind: 'hunter', pos: { x: 16, z: 13 } }, { kind: 'jonin', pos: { x: 18, z: 13 } }] }));
    const names = (id: string) => [state.units[id].name, state.units[id].nameEs];
    assert.deepEqual(names('rogue_0'), ['Rogue 1', 'Renegado 1']);
    assert.deepEqual(names('rogue_1'), ['Rogue 2', 'Renegado 2']);
    assert.deepEqual(names('raider_0'), ['Raider', 'Asaltante']);
    assert.equal(state.units.hunter_0.nameEs?.startsWith('Cazador'), true);
    // A proper name stays as it is.
    assert.deepEqual(names('jonin_0'), ['Kagero', undefined]);
    // The jutsu they cast have Spanish names too: "Técnica de <Elemento>: <his name>" (D24, the
    // owner, 2026-10-20; this pinned 'Estilo Fuego: Gran Bola de Fuego', then 'Bola de fuego').
    assert.equal(JUTSU.fireball_goukakyu.nameEs, 'Técnica de Fuego: Bola de fuego');
    assert.ok(Object.values(JUTSU).every((j) => j.nameEs), 'every jutsu has a Spanish name');
  });

  it('every jutsu is "Técnica de <Elemento>: <the owner’s name>", the enhanced Fireball its own (D24)', () => {
    const es = (id: string) => JUTSU[id].nameEs;
    assert.equal(es('fireball_goukakyu'), 'Técnica de Fuego: Bola de fuego');
    assert.equal(JUTSU.fireball_goukakyu.nameEnhEs, 'Técnica de Fuego: Gran bola de fuego');
    assert.equal(JUTSU.fireball_goukakyu.nameEnh, 'Fire Technique: Great Fireball');
    assert.equal(es('water_shield_suijinheki'), 'Técnica de Agua: Muro de agua');
    assert.equal(es('earth_wall_doryuheki'), 'Técnica de Tierra: Muro de tierra');
    assert.equal(es('earth_spear_doryuudan'), 'Técnica de Tierra: Balas de tierra');
    assert.equal(es('dragon_fire_stream'), 'Técnica de Fuego: Fuego del dragón');
    assert.equal(es('wind_blade_daitoppa'), 'Técnica de Viento: Gran ráfaga cortante');
    assert.equal(es('chidori_lightning_blade'), 'Técnica de Rayo: Chidori');
    assert.equal(es('kirin_thunder'), 'Técnica de Rayo: Kirin');
    assert.equal(JUTSU.kirin_thunder.name, 'Lightning Technique: Kirin');
    assert.equal(es('katon_pursuing_flame'), 'Técnica de Fuego: Llama persecutoria');
    // Every jutsu of the data carries it, with its Spanish description; the clan abilities don't.
    for (const j of JUTSUS_DATA) {
      assert.match(j.nameEs ?? '', /^Técnica de [A-ZÁÉÍÓÚ][a-záéíóú]+: /, j.id);
      assert.match(j.name, /^[A-Z][a-z]+ Technique: /, j.id);
      assert.ok(j.descriptionEs, j.id);
    }
    // Command takes the owner's Spanish name from his icon sheets (2026-10-21); the Ryusei's warp
    // is his Shooting-Star Thrust, Estocada Fugaz (2026-10-21, once Warp Strike / Golpe Warp).
    assert.equal(es('ryusei_warp'), 'Estocada Fugaz');
    assert.equal(es('northstar_command'), 'Comando');
    assert.equal(JUTSU.ryusei_warp.name, 'Shooting-Star Thrust');
    assert.equal(JUTSU.northstar_command.name, 'Command');
    // No "Estilo X:" prefix is left on any jutsu.
    assert.ok(Object.values(JUTSU).every((j) => !/^Estilo /.test(j.nameEs ?? '')));
    // Only the enhanced Fireball has a name of its own; the enhanced spec keeps it.
    assert.equal(enhanced(JUTSU.fireball_goukakyu).nameEnhEs, 'Técnica de Fuego: Gran bola de fuego');
  });
});

describe('battle text in Spanish', () => {
  // The screens' text layer (src/components/battle): plain functions, no DOM.
  const roll = (success: boolean): RollInfo => ({ kind: 'attack', d20: 15, rolls: [15], mod: 0, total: 15, dc: 12, success, chance: 0.6 });
  const raid = () =>
    createBattle(
      setup({
        party: [{ character: hero({ id: 'a', name: 'Akira' }), pos: { x: 8, z: 10 } }],
        enemies: [
          { kind: 'raider', pos: { x: 14, z: 10 } },
          { kind: 'rogue', pos: { x: 14, z: 13 } },
          { kind: 'rogue', pos: { x: 16, z: 13 } },
          { kind: 'raider', clan: 'Northstar', pos: { x: 16, z: 10 } },
          { kind: 'jonin', pos: { x: 18, z: 12 } },
        ],
      }),
    ).state;

  it('a generic enemy name takes its article; the party’s proper names never do', () => {
    const s = raid();
    const line = (ev: BattleEvent) => logLine(ev, s, 'es')?.text;
    assert.equal(line({ t: 'turn', unit: 'raider_0', round: 1 }), 'Turno del Asaltante');
    assert.equal(line({ t: 'turn', unit: 'rogue_0', round: 1 }), 'Turno del Renegado 1');
    assert.equal(line({ t: 'turn', unit: 'raider_1', round: 1 }), 'Turno de la Sombra');
    assert.equal(line({ t: 'turn', unit: 'jonin_0', round: 1 }), 'Turno de Kagero');
    assert.equal(line({ t: 'turn', unit: 'a', round: 1 }), 'Turno de Akira');
    assert.equal(line({ t: 'attack', unit: 'raider_0', target: 'a', what: 'weapon', roll: roll(true), ranged: false }), 'El Asaltante golpea a Akira (15→15 contra CA 12)');
    assert.equal(line({ t: 'attack', unit: 'a', target: 'raider_0', what: 'weapon', roll: roll(true), ranged: false }), 'Akira golpea al Asaltante (15→15 contra CA 12)');
    assert.equal(line({ t: 'attack', unit: 'raider_1', target: 'rogue_1', what: 'weapon', roll: roll(false), ranged: false }), 'La Sombra falla contra el Renegado 2 (15→15 contra CA 12)');
    assert.equal(line({ t: 'jutsu', unit: 'rogue_0', jutsu: 'fireball_goukakyu', at: { x: 8, z: 10 }, shape: null, enhanced: false }), 'El Renegado 1 lanza Técnica de Fuego: Bola de fuego');
    // An enhanced cast with a name of its own says it; another says "potenciado".
    assert.equal(line({ t: 'jutsu', unit: 'rogue_0', jutsu: 'fireball_goukakyu', at: { x: 8, z: 10 }, shape: null, enhanced: true }), 'El Renegado 1 lanza Técnica de Fuego: Gran bola de fuego');
    assert.equal(line({ t: 'jutsu', unit: 'jonin_0', jutsu: 'chidori_lightning_blade', at: { x: 8, z: 10 }, shape: null, enhanced: true }), '¡Kagero lanza Técnica de Rayo: Chidori potenciado!');
    assert.equal(line({ t: 'jutsu', unit: 'raider_0', jutsu: 'leaf_hurricane_senpuu', at: { x: 8, z: 10 }, shape: null, enhanced: true })?.startsWith('¡El Asaltante lanza'), true);
    // The activated Chidori (battle/charged.ts): charged, its blow going off by itself, the ground cracking, the charge ending.
    assert.equal(line({ t: 'charged', unit: 'jonin_0', jutsu: 'chidori_lightning_blade', on: true }), 'Kagero carga Técnica de Rayo: Chidori en la mano');
    assert.equal(line({ t: 'jutsu', unit: 'raider_0', jutsu: 'chidori_lightning_blade', at: { x: 8, z: 10 }, shape: null, enhanced: false, released: true }), '¡Técnica de Rayo: Chidori: la mano cargada del Asaltante golpea sola!');
    assert.equal(line({ t: 'cracks', unit: 'raider_1', cells: ['1,1'], on: true, first: true }), 'El suelo se agrieta bajo la Sombra: terreno difícil');
    assert.equal(line({ t: 'cracks', unit: 'raider_1', cells: ['1,2'], on: true }), undefined, 'said once a turn');
    assert.equal(line({ t: 'charged', unit: 'jonin_0', jutsu: 'chidori_lightning_blade', on: false, end: 'expired' }), 'Técnica de Rayo: Chidori se apaga en la mano de Kagero sin usarse');
    assert.equal(line({ t: 'charged', unit: 'jonin_0', jutsu: 'chidori_lightning_blade', on: false, end: 'struck' }), undefined);
    assert.equal(logLine({ t: 'charged', unit: 'jonin_0', jutsu: 'chidori_lightning_blade', on: true, enhanced: true }, s, 'en')?.text, 'Kagero charges Lightning Technique: Chidori in the hand, enhanced!');
    // The prompts read the same way.
    assert.equal(T('evadeAsk', { name: unitRef(s.units.a, 'es'), dmg: 5, by: unitRef(s.units.raider_0, 'es') }, 'es').startsWith('Akira vio venir el golpe del Asaltante'), true);
    assert.equal(T('oaAsk', { mover: unitRef(s.units.raider_1, 'es'), reactor: unitRef(s.units.a, 'es'), p: 60 }, 'es').startsWith('La Sombra sale del alcance de Akira'), true);
    // Cards and labels keep the bare name, and English is untouched.
    assert.equal(unitName(s.units.raider_0, 'es'), 'Asaltante');
    assert.equal(line({ t: 'turn', unit: 'raider_0', round: 1 }), 'Turno del Asaltante');
    assert.equal(logLine({ t: 'turn', unit: 'raider_0', round: 1 }, s, 'en')?.text, 'Raider’s turn');
  });

  it('a participle agrees with the one it is about: "la Sombra" and Hana are caught unaware, Akira too', () => {
    const s = createBattle(
      setup({
        party: [
          { character: hero({ id: 'a', name: 'Akira' }), pos: { x: 8, z: 10 } },
          { character: { ...HANA, effects: [] }, pos: { x: 8, z: 12 } },
        ],
        enemies: [{ kind: 'raider', clan: 'Northstar', pos: { x: 16, z: 10 } }],
      }),
    ).state;
    const note = (name: string) => logLine({ t: 'note', key: 'surprisedSkip', params: { name } }, s, 'es')?.text;
    assert.equal(note('Shade'), 'La Sombra está desprevenida y pierde el turno');
    assert.equal(note('Hana'), 'Hana está desprevenida y pierde el turno');
    assert.equal(note('Akira'), 'Akira está desprevenido y pierde el turno');
    assert.equal(logLine({ t: 'pushed', unit: 'raider_0', from: { x: 16, z: 10 }, to: { x: 17.5, z: 10 }, fall: 0 }, s, 'es')?.text, 'La Sombra es empujada');
    assert.equal(logLine({ t: 'note', key: 'surprisedSkip', params: { name: 'Shade' } }, s, 'en')?.text, 'Shade is caught unaware and loses the turn');
  });

  it('every enemy template and clan variant knows its article; proper names have none', () => {
    const clans: ClanType[] = ['Mirai', 'Koton', 'Ryusei', 'Northstar'];
    for (const kind of ['rogue', 'hunter', 'raider'] as const) for (const c of clans) assert.ok(enemyNameOf(kind, c).articleEs, `${kind}/${c}`);
    assert.equal(enemyNameOf('jonin').articleEs, undefined);
    const h = createBattle(setup({ enemies: ENCOUNTERS.hydra.enemies })).state;
    assert.equal(logLine({ t: 'turn', unit: HYDRA_ID, round: 1 }, h, 'es')?.text, 'Turno de la Hidra');
    assert.equal(logLine({ t: 'turn', unit: `${HYDRA_ID}_head_0`, round: 1 }, h, 'es')?.text, 'Turno de la Cabeza de hidra 1');
    // Only an article we put there changes: "de él" (the pronoun) and words that merely end in "el" stay.
    assert.equal(spanishArticles('Turno de el Asaltante'), 'Turno del Asaltante');
    assert.equal(spanishArticles('el Asaltante golpea a el Renegado 1. el Cazador mira'), 'El Asaltante golpea al Renegado 1. El Cazador mira');
    assert.equal(spanishArticles('Habla de él con el miel de el panel'), 'Habla de él con el miel del panel');
  });
});
