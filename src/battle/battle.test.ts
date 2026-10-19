// Tests for the party battle engine: npm test (docs/GAMEPLAY_DESIGN.md is the spec).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { HANA, KENJI } from '../data/missions';
import { addEffect } from '../rules/effects';
import type { ShinobiCharacter } from '../types/shinobi';
import type { Action, BattleEvent, BattleState, Pt, Unit, Wall } from './types';
import { applyAction, createBattle } from './engine';
import type { BattleSetup } from './engine';
import { cellBlocked, cellCenter, cellOf, coverBetween, dist, lineOfSight, waterAtPt } from './map';
import { canStop, reachable } from './nav';
import { attackPreview, damage } from './combat';
import { current, endTurn } from './turns';
import { foreseen, planIntent } from './intent';
import { aiAction, runAi } from './ai';
import { battleResult } from './result';
import { HYDRA_ID } from './hydra';
import { JUTSU, enhanced } from './jutsu';

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
    damage(s, h2, 1, 'Lightning', {}, ev);
    assert.ok(h2.head!.sealed);
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
      chakra = s.units.rogue_0.chakra;
      const out = ok(applyAction(s, { type: 'attack', unit: 'a', target: 'rogue_0' }));
      if (out.events.some((e) => e.t === 'attack' && e.roll.success)) hit = out;
    }
    assert.ok(hit, 'some seed lands a hit');
    assert.equal(hit.state.units.rogue_0.hp, 1);
    assert.equal(hit.state.units.rogue_0.chakra, chakra - 2);
    assert.ok(hit.events.some((e) => e.t === 'evade' && e.unit === 'rogue_0'));
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
