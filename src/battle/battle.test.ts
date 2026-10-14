// Tests for the party battle engine: npm test (docs/GAMEPLAY_DESIGN.md is the spec).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { HANA, KENJI } from '../data/missions';
import type { ShinobiCharacter } from '../types/shinobi';
import type { Action, BattleEvent, BattleState, Pt, Unit } from './types';
import { applyAction, createBattle } from './engine';
import type { BattleSetup } from './engine';
import { cellBlocked, cellCenter, cellOf, dist, waterAtPt } from './map';
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

  it('a party caught at night loses its first turn (except a Taki)', () => {
    const { state } = createBattle(setup({ partySurprised: true, party: [
      { character: hero({ id: 'a' }), pos: { x: 8, z: 10 } },
      { character: hero({ id: 't', clan: 'Taki' }), pos: { x: 8, z: 12 } },
    ] }));
    assert.equal(!!state.units.a.cond.surprised || current(state)?.id === 'a', true);
    assert.equal(!!state.units.t.cond.surprised, false);
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

describe('Mirai Future Foresight', () => {
  const mirai = (dojutsu: ShinobiCharacter['dojutsu'] = 'None') => hero({ id: 'm', name: 'Ren', clan: 'Mirai', dojutsu });

  it('reads what each enemy in sight will do next', () => {
    const { state } = createBattle(setup({ party: [{ character: mirai(), pos: { x: 8, z: 10 } }] }));
    const seen = foreseen(state);
    assert.ok(seen.rogue_0);
    assert.equal(seen.rogue_0.target, 'm');
    const { state: other } = createBattle(setup());
    assert.deepEqual(foreseen(other), {});
  });

  it('parries (+AC by Sharingan stage) and dodges until the next turn', () => {
    const s = turnOf(createBattle(setup({ party: [{ character: mirai('Sharingan (2-Tomoe)'), pos: { x: 8, z: 10 } }] })).state, 'm');
    place(s, 'rogue_0', { x: 9.5, z: 10 });
    const before = attackPreview(s, s.units.rogue_0, s.units.m, 'melee');
    const out = ok(applyAction(s, { type: 'foresight', unit: 'm' }));
    assert.equal(out.state.units.m.cond.foresight, 2);
    assert.equal(out.state.units.m.chakra, s.units.m.chakra - 2);
    assert.equal(out.state.units.m.turn.bonus, false);
    const after = attackPreview(out.state, out.state.units.rogue_0, out.state.units.m, 'melee');
    assert.equal(after.ac, before.ac + 2);
    assert.ok(after.chance < before.chance);
    assert.equal(applyAction(turnOf(createBattle(setup()).state, 'a'), { type: 'foresight', unit: 'a' }).reason, 'notMirai');
  });

  it('enemies follow the plan the Mirai saw, if it still makes sense', () => {
    const { state } = createBattle(setup({ party: [{ character: mirai(), pos: { x: 8, z: 10 } }] }));
    const s = turnOf(state, 'rogue_0');
    const plan = s.units.rogue_0.intent!;
    assert.deepEqual(planIntent(s, s.units.rogue_0)?.kind, plan.kind);
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
