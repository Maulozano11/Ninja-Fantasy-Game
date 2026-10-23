// Weapon Element Enhancement, the Bukijutsu Master's class ability (the owner, 2026-10-23:
// "agregale weapon element enhacement como habilidad ... no aplica para genjutsu, solo elemental";
// docs/GAMEPLAY_DESIGN.md, "Weapon Element Enhancement"). npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { getAppearance } from '../sprite/legacy';
import { natureOf } from '../rules/ninja';
import { withNature } from '../sprite/chakraNature';
import type { ChakraNature, ShinobiCharacter } from '../types/shinobi';
import { applyAction, createBattle } from './engine';
import { runAi } from './ai';
import { beginTurn } from './turns';
import { unitFrom, wielded } from './units';
import { reachTo } from './intent';
import { EARTH_CRIT, IMBUE_COST, IMBUE_DAMAGE, IMBUE_ELEMENTS, IMBUE_PENDING, IMBUE_ROUNDS, WATER_REACH, WEAPON_ELEMENT, classAbilities, imbueElementOf, startImbue } from './imbue';
import type { ImbueElement } from './imbue';
import { logLine } from '../components/battle/battleLog';
import type { Action, BattleEvent, BattleState } from './types';

/** Solen (a Fire Bukijutsu Master with his ice crystal sword) of another chakra type, or class. */
function ninja(nature: ChakraNature = 'Fire', shinobiClass: ShinobiCharacter['shinobiClass'] = 'Bukijutsu Master'): ShinobiCharacter {
  const look = getAppearance(DEFAULT_CHARACTER);
  return { ...DEFAULT_CHARACTER, id: 'a', name: 'Aki', shinobiClass, effects: [], appearance: { ...look, chakra: withNature(look.chakra, nature) } };
}

/** A's turn, a rogue `gap` meters to the right. */
function setup(nature: ChakraNature = 'Fire', gap = 1.5, seed = 5): BattleState {
  const b = createBattle({
    seed,
    mapId: 'river_forest',
    time: 'day',
    weather: 'Clear',
    difficulty: 'normal',
    party: [{ character: ninja(nature), pos: { x: 8, z: 10 } }],
    enemies: [{ kind: 'rogue', pos: { x: 8 + gap, z: 10 } }],
    stealth: false,
    supplies: { soldierPills: 0, bandages: 0, antidotes: 0, explosiveTags: 0 },
  });
  const s = structuredClone(b.state);
  s.turn = s.order.indexOf('a');
  const u = s.units.a;
  u.turn = { move: u.speed, action: true, bonus: true, reaction: true, moved: 0 };
  u.chakra = 20;
  return s;
}

const foeOf = (s: BattleState) => Object.values(s.units).find((x) => x.team === 'enemy')!;

function act(s: BattleState, a: Action): { state: BattleState; events: BattleEvent[] } {
  const out = applyAction(s, a);
  assert.ok(out.ok, out.reason);
  return out;
}

/**
 * A's ability. Water waits for the owner's yes on its effect (IMBUE_PENDING: no button), so its rules,
 * kept for when it comes back, are tested with the element put on the weapon directly.
 */
function imbue(s: BattleState): { state: BattleState; events: BattleEvent[] } {
  if (s.units.a.character && IMBUE_PENDING.includes(natureOfA(s))) {
    const events: BattleEvent[] = [];
    startImbue(s.units.a, natureOfA(s), events);
    return { state: s, events };
  }
  return act(s, { type: 'jutsu', unit: 'a', jutsu: WEAPON_ELEMENT, at: { ...s.units.a.pos } });
}
const natureOfA = (s: BattleState) => natureOf(s.units.a.character!) as ImbueElement;

/**
 * A's blow at the rogue (made easy to hit, and with HP to spare), imbued with `el`, for the first
 * seed whose roll matches `want`.
 */
function blow(el: ImbueElement, want: (d20: number, crit: boolean) => boolean, gap = 1.5) {
  for (let seed = 1; seed < 600; seed++) {
    const s = imbue(setup(el, gap, seed)).state;
    const foe = foeOf(s);
    foe.ac = 1;
    foe.hp = foe.maxHp = 200;
    foe.jutsus = foe.jutsus.filter((j) => j !== 'substitution_kawarimi');
    const out = act(s, { type: 'attack', unit: 'a', target: foe.id });
    const atk = out.events.find((e) => e.t === 'attack');
    if (atk?.t === 'attack' && atk.roll.success && want(atk.roll.d20, !!atk.roll.crit)) return { out, atk, foe: out.state.units[foe.id] };
  }
  throw new Error('no seed gave the roll');
}

const damages = (ev: BattleEvent[], unit: string) => ev.filter((e): e is Extract<BattleEvent, { t: 'damage' }> => e.t === 'damage' && e.unit === unit);

describe('Weapon Element Enhancement: who has it', () => {
  it('a Bukijutsu Master of one of the five elements, never another class or a nature with no element (no genjutsu)', () => {
    for (const n of ['Fire', 'Wind', 'Lightning', 'Earth'] as const) assert.deepEqual(classAbilities('Bukijutsu Master', n), [WEAPON_ELEMENT], n);
    // water waits for the owner's yes on its effect ("menos la de agua")
    assert.deepEqual(classAbilities('Bukijutsu Master', 'Water'), []);
    assert.deepEqual([...IMBUE_PENDING], ['Water']);
    for (const n of ['Light', 'Void', 'Shadow', 'Spirit', 'Genjutsu'] as const) assert.deepEqual(classAbilities('Bukijutsu Master', n), [], n);
    for (const c of ['Ninjutsu Specialist', 'Taijutsu Master', 'Genjutsu Adept', 'Medical Specialist']) assert.deepEqual(classAbilities(c, 'Fire'), [], c);
    assert.equal(imbueElementOf('Genjutsu'), null);
    assert.deepEqual([...IMBUE_ELEMENTS], ['Fire', 'Lightning', 'Wind', 'Water', 'Earth']);
  });

  it('comes with the unit, after the clan abilities: Solen has it, his Light self and a Taijutsu Solen do not', () => {
    const at = { team: 'party' as const, pos: { x: 0, z: 0 } };
    const solen = unitFrom(ninja('Fire'), at);
    assert.ok(solen.jutsus.includes(WEAPON_ELEMENT));
    assert.ok(solen.jutsus.indexOf(WEAPON_ELEMENT) >= solen.jutsus.indexOf('ryusei_warp'), 'after the clan abilities');
    assert.ok(!unitFrom(ninja('Light'), at).jutsus.includes(WEAPON_ELEMENT));
    assert.ok(!unitFrom(ninja('Void'), at).jutsus.includes(WEAPON_ELEMENT));
    assert.ok(!unitFrom(ninja('Fire', 'Taijutsu Master'), at).jutsus.includes(WEAPON_ELEMENT));
    assert.ok(!unitFrom(ninja('Fire', 'Genjutsu Adept'), at).jutsus.includes(WEAPON_ELEMENT));
  });

  it('the rogues (Fire Bukijutsu Masters) have it too', () => {
    const s = setup();
    assert.ok(foeOf(s).jutsus.includes(WEAPON_ELEMENT));
  });
});

describe('Weapon Element Enhancement: cost and duration', () => {
  it('a bonus action for its chakra, no hand seals: the action and the weapon stay; once at a time', () => {
    const s = setup('Lightning');
    const out = imbue(s);
    const u = out.state.units.a;
    assert.equal(u.chakra, 20 - IMBUE_COST);
    assert.equal(u.turn.bonus, false);
    assert.equal(u.turn.action, true);
    assert.equal(u.armed, true, 'the weapon stays in hand');
    assert.deepEqual(u.imbued, { element: 'Lightning', rounds: IMBUE_ROUNDS });
    assert.ok(out.events.some((e) => e.t === 'imbue' && e.on && e.element === 'Lightning'));
    assert.ok(!out.events.some((e) => e.t === 'weapon'), 'no stow for seals');
    const again = structuredClone(out.state);
    again.units.a.turn.bonus = true;
    assert.equal(applyAction(again, { type: 'jutsu', unit: 'a', jutsu: WEAPON_ELEMENT, at: { ...u.pos } }).reason, 'alreadyImbued');
  });

  it('a stowed weapon is drawn for it, free; fists and palms have nothing to put it on', () => {
    const s = setup();
    s.units.a.armed = false;
    const out = imbue(s);
    assert.equal(out.state.units.a.armed, true);
    assert.ok(out.events.some((e) => e.t === 'weapon' && e.armed && e.cost === 'free'));
    const bare = setup();
    bare.units.a.weapon = { name: 'Fists', dice: '1d4', type: 'Bludgeoning', reach: 1.5, finesse: false, held: false };
    assert.equal(applyAction(bare, { type: 'jutsu', unit: 'a', jutsu: WEAPON_ELEMENT, at: { ...bare.units.a.pos } }).reason, 'noBlade');
    const poor = setup();
    poor.units.a.chakra = IMBUE_COST - 1;
    assert.equal(applyAction(poor, { type: 'jutsu', unit: 'a', jutsu: WEAPON_ELEMENT, at: { ...poor.units.a.pos } }).reason, 'noChakra');
  });

  it(`lasts ${IMBUE_ROUNDS} of its own turns (this one counted), then fades`, () => {
    let s = imbue(setup()).state;
    const ends: BattleEvent[] = [];
    for (let turn = 1; turn <= IMBUE_ROUNDS; turn++) {
      const ev: BattleEvent[] = [];
      s = structuredClone(s);
      s.turn = s.order.indexOf('a');
      beginTurn(s, ev);
      ends.push(...ev.filter((e) => e.t === 'imbue'));
      if (turn < IMBUE_ROUNDS) assert.equal(s.units.a.imbued?.rounds, IMBUE_ROUNDS - turn, `turn ${turn}`);
    }
    assert.equal(s.units.a.imbued, undefined);
    assert.deepEqual(ends, [{ t: 'imbue', unit: 'a', element: 'Fire', on: false, end: 'expired' }]);
  });

  it('ends when its ninja falls', () => {
    for (let seed = 1; seed < 100; seed++) {
      const s = imbue(setup('Fire', 1.5, seed)).state;
      const foe = foeOf(s);
      s.units.a.hp = 1;
      s.units.a.ac = 1;
      s.units.a.turn.reaction = false;
      s.turn = s.order.indexOf(foe.id);
      foe.turn = { move: foe.speed, action: true, bonus: true, reaction: true, moved: 0 };
      const out = act(s, { type: 'attack', unit: foe.id, target: 'a' });
      if (!out.state.units.a.down) continue;
      assert.equal(out.state.units.a.imbued, undefined);
      assert.ok(out.events.some((e) => e.t === 'imbue' && !e.on && e.end === 'down'));
      return;
    }
    assert.fail('never fell');
  });
});

describe('Weapon Element Enhancement: the blows', () => {
  for (const el of IMBUE_ELEMENTS) {
    it(`${el}: a hit adds its die of ${IMBUE_DAMAGE[el]} damage after the blow's`, () => {
      const { out, foe } = blow(el, (_d, crit) => !crit);
      const d = damages(out.events, foe.id);
      assert.equal(d.length, 2, out.events.map((e) => e.t).join(' '));
      assert.equal(d[0].dmgType, 'Slashing', 'the ice crystal sword cuts');
      assert.equal(d[1].dmgType, IMBUE_DAMAGE[el]);
      assert.ok(d[1].amount >= 1 && d[1].amount <= 4, `1d4: ${d[1].amount}`);
    });
  }

  it('a miss adds nothing, and the thrown kunai never carries it', () => {
    const s = imbue(setup('Fire', 6)).state;
    const foe = foeOf(s);
    foe.ac = 1;
    foe.hp = foe.maxHp = 200;
    const out = act(s, { type: 'attack', unit: 'a', target: foe.id, ranged: true });
    assert.ok(damages(out.events, foe.id).length <= 1);
    assert.ok(damages(out.events, foe.id).every((d) => d.dmgType === 'Piercing'));
  });

  it('fire: a critical hit sets the foe burning; lightning: it leaves it numb', () => {
    const fire = blow('Fire', (d) => d === 20);
    assert.ok(fire.foe.effects.some((e) => e.id === 'burning'));
    assert.equal(damages(fire.out.events, fire.foe.id)[1].amount, 8, 'a crit is the die doubled, at its maximum (the owner\'s rule)');
    const bolt = blow('Lightning', (d) => d === 20);
    assert.ok(bolt.foe.effects.some((e) => e.id === 'jolted'));
  });

  it('wind: a critical hit blows the foe back 1.5 m', () => {
    const { out, foe } = blow('Wind', (d) => d === 20);
    const p = out.events.find((e) => e.t === 'pushed');
    assert.ok(p && p.t === 'pushed' && p.unit === foe.id);
    assert.ok(foe.pos.x > 9.5 + 1, `pushed away: ${foe.pos.x}`);
  });

  it(`earth: sharp obsidian makes a natural ${EARTH_CRIT} a critical hit`, () => {
    const { atk } = blow('Earth', (d) => d === EARTH_CRIT);
    assert.ok(atk.roll.crit);
    // Fire on a 19 is an ordinary hit.
    assert.ok(!blow('Fire', (d) => d === EARTH_CRIT).atk.roll.crit);
  });

  it('water puts out the flames of the foe it strikes', () => {
    for (let seed = 1; seed < 200; seed++) {
      const s = imbue(setup('Water', 1.5, seed)).state;
      const foe = foeOf(s);
      foe.ac = 1;
      foe.hp = foe.maxHp = 200;
      foe.effects = [{ id: 'burning', remaining: 2 }];
      const out = act(s, { type: 'attack', unit: 'a', target: foe.id });
      const atk = out.events.find((e) => e.t === 'attack');
      if (!(atk?.t === 'attack' && atk.roll.success)) continue;
      assert.ok(!out.state.units[foe.id].effects.some((e) => e.id === 'burning'));
      return;
    }
    assert.fail('no hit');
  });
});

describe('Weapon Element Enhancement: water lengthens the reach (the owner\'s rule)', () => {
  it(`+${WATER_REACH} m while the weapon is in hand: a foe at 2.8 m is in reach only with it`, () => {
    const plain = setup('Water', 2.8);
    assert.equal(applyAction(plain, { type: 'attack', unit: 'a', target: foeOf(plain).id }).reason, 'outOfRange');
    const s = imbue(setup('Water', 2.8)).state;
    const u = s.units.a;
    assert.equal(wielded(u).reach, 1.5 + WATER_REACH);
    assert.equal(reachTo(u, foeOf(s)), 1.5 + WATER_REACH, 'the AI plans with it too');
    act(s, { type: 'attack', unit: 'a', target: foeOf(s).id });
    // Stowed, it strikes with the fists, at their reach.
    const stowed = structuredClone(s);
    stowed.units.a.armed = false;
    assert.equal(wielded(stowed.units.a).reach, 1.5);
    // Fire lengthens nothing.
    assert.equal(wielded(imbue(setup('Fire')).state.units.a).reach, 1.5);
  });
});

describe('Weapon Element Enhancement: the AI', () => {
  it('a rogue about to strike puts its fire on its weapon first (bonus action), then strikes', () => {
    const s = setup('Fire', 3);
    const foe = foeOf(s);
    s.units.a.controller = 'player';
    s.turn = s.order.indexOf(foe.id);
    foe.turn = { move: foe.speed, action: true, bonus: true, reaction: true, moved: 0 };
    foe.intent = { kind: 'melee', what: foe.weapon.name, target: 'a' };
    const out = runAi(s);
    const i = out.events.findIndex((e) => e.t === 'imbue' && e.on && e.unit === foe.id);
    assert.ok(i >= 0, out.events.map((e) => e.t).join(' '));
    const atk = out.events.findIndex((e) => e.t === 'attack' && e.unit === foe.id);
    assert.ok(atk > i, 'the blow after');
  });

  it('a Light Bukijutsu Master on the AI has nothing to put on its weapon', () => {
    const s = setup('Light', 3);
    s.units.a.controller = 'ai';
    assert.ok(!s.units.a.jutsus.includes(WEAPON_ELEMENT));
    const out = runAi(s);
    assert.ok(!out.events.some((e) => e.t === 'imbue'));
  });
});

describe('Weapon Element Enhancement: the log', () => {
  it('says what goes onto the weapon and when it leaves, in Spanish and English', () => {
    const s = setup();
    const line = (ev: BattleEvent, lang: 'es' | 'en') => logLine(ev, s, lang)?.text;
    assert.equal(line({ t: 'imbue', unit: 'a', element: 'Fire', on: true }, 'es'), 'El arma de Aki se prende en llamas');
    assert.equal(line({ t: 'imbue', unit: 'a', element: 'Fire', on: true }, 'en'), "Aki's weapon bursts into flames");
    assert.equal(line({ t: 'imbue', unit: 'a', element: 'Water', on: true }, 'es'), 'El agua recorre el arma de Aki: +1.5 m de alcance');
    assert.equal(line({ t: 'imbue', unit: 'a', element: 'Earth', on: true }, 'es'), 'Obsidiana filosa cubre el arma de Aki');
    assert.equal(line({ t: 'imbue', unit: 'a', element: 'Lightning', on: true }, 'es'), 'La electricidad chisporrotea alrededor del arma de Aki');
    assert.equal(line({ t: 'imbue', unit: 'a', element: 'Wind', on: true }, 'es'), 'El viento gira alrededor del arma de Aki');
    assert.equal(line({ t: 'imbue', unit: 'a', element: 'Earth', on: false, end: 'expired' }, 'es'), 'La obsidiana se desprende del arma de Aki');
    assert.equal(line({ t: 'imbue', unit: 'a', element: 'Fire', on: false, end: 'sealed' }, 'en'), "Sealed chakra leaves Aki's weapon plain");
    // The rogue's: an enemy's generic name takes its article in Spanish.
    assert.equal(line({ t: 'imbue', unit: foeOf(s).id, element: 'Fire', on: true }, 'es'), 'El arma del Renegado se prende en llamas');
  });
});
