// Elemental Slash, the Bukijutsu Master's second class ability (the owner, 2026-10-23: "puedes tambien
// tener una opcion de lanzar la habilidad en un slash del elemento que tengas", and "el tajo sera un
// bonus action y elimina la mejora del arma"; docs/GAMEPLAY_DESIGN.md, "Elemental Slash"). npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { getAppearance } from '../sprite/legacy';
import { withNature } from '../sprite/chakraNature';
import type { ChakraNature, ShinobiCharacter } from '../types/shinobi';
import { applyAction, createBattle } from './engine';
import { runAi } from './ai';
import { attackPreview, weaponAttackMod } from './combat';
import { wielded } from './units';
import { ELEMENTAL_SLASH, EARTH_CRIT, IMBUE_DAMAGE, SLASH_COST, SLASH_RANGE, WATER_REACH, WEAPON_ELEMENT, classAbilities, slashRange, startImbue } from './imbue';
import type { ImbueElement } from './imbue';
import { JUTSU } from './jutsu';
import { dampAt } from './map';
import { logLine } from '../components/battle/battleLog';
import type { Action, BattleEvent, BattleState } from './types';

/** Aki, a Bukijutsu Master of this chakra type with the default sword. */
function ninja(nature: ChakraNature = 'Fire'): ShinobiCharacter {
  const look = getAppearance(DEFAULT_CHARACTER);
  return { ...DEFAULT_CHARACTER, id: 'a', name: 'Aki', shinobiClass: 'Bukijutsu Master', effects: [], appearance: { ...look, chakra: withNature(look.chakra, nature) } };
}

/** A's turn, its element already on the weapon (cast on an earlier turn), a rogue `gap` meters to the right. */
function setup(nature: ImbueElement = 'Fire', gap = 6, seed = 5, imbued = true): BattleState {
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
  if (imbued) {
    u.armed = true;
    startImbue(u, nature, []);
    u.imbued!.rounds = 2;
  }
  const foe = foeOf(s);
  foe.jutsus = foe.jutsus.filter((j) => j !== 'substitution_kawarimi');
  return s;
}

const foeOf = (s: BattleState) => Object.values(s.units).find((x) => x.team === 'enemy')!;
const slash = (s: BattleState): Action => ({ type: 'jutsu', unit: 'a', jutsu: ELEMENTAL_SLASH, at: { ...foeOf(s).pos }, target: foeOf(s).id });

function act(s: BattleState, a: Action): { state: BattleState; events: BattleEvent[] } {
  const out = applyAction(s, a);
  assert.ok(out.ok, out.reason);
  return out;
}

/** A's slash at the rogue (easy to hit, HP to spare) with `el` on the weapon, for the first seed whose roll matches `want`. */
function thrown(el: ImbueElement, want: (d20: number, crit: boolean, ok: boolean) => boolean, gap = 6, ac = 1) {
  for (let seed = 1; seed < 800; seed++) {
    const s = setup(el, gap, seed);
    const foe = foeOf(s);
    foe.ac = ac;
    foe.hp = foe.maxHp = 200;
    const out = act(s, slash(s));
    const atk = out.events.find((e) => e.t === 'attack');
    if (atk?.t === 'attack' && want(atk.roll.d20, !!atk.roll.crit, atk.roll.success)) return { out, atk, foe: out.state.units[foe.id] };
  }
  throw new Error('no seed gave the roll');
}

const damages = (ev: BattleEvent[], unit: string) => ev.filter((e): e is Extract<BattleEvent, { t: 'damage' }> => e.t === 'damage' && e.unit === unit);
const maxOf = (dice: string) => dice.split('+').reduce((n, p) => n + (/^(\d+)d(\d+)$/.test(p) ? Number(RegExp.$1) * Number(RegExp.$2) : Number(p)), 0);

describe('Elemental Slash: who has it, and when', () => {
  it('comes with Weapon Element Enhancement: a Bukijutsu Master of one of the five elements', () => {
    for (const n of ['Fire', 'Water', 'Wind', 'Lightning', 'Earth'] as const) assert.deepEqual(classAbilities('Bukijutsu Master', n), [WEAPON_ELEMENT, ELEMENTAL_SLASH], n);
    assert.deepEqual(classAbilities('Bukijutsu Master', 'Light'), []);
    assert.ok(setup().units.a.jutsus.includes(ELEMENTAL_SLASH));
    const spec = JUTSU[ELEMENTAL_SLASH];
    assert.equal(spec.cast, 'bonus', 'the owner: "el tajo sera un bonus action"');
    assert.equal(spec.cost, SLASH_COST);
  });

  it('only with the element on the weapon', () => {
    const s = setup('Fire', 6, 5, false);
    assert.equal(applyAction(s, slash(s)).reason, 'noImbue');
  });

  it('never in the turn the element goes on: both are bonus actions', () => {
    const s = setup('Fire', 6, 5, false);
    const on = act(s, { type: 'jutsu', unit: 'a', jutsu: WEAPON_ELEMENT, at: { ...s.units.a.pos } }).state;
    assert.ok(on.units.a.imbued);
    assert.equal(applyAction(on, slash(on)).reason, 'noBonus');
  });

  it('is a bonus action: the action is left for a blow', () => {
    const out = act(setup('Fire', 1.5), slash(setup('Fire', 1.5)));
    const a = out.state.units.a;
    assert.equal(a.turn.bonus, false);
    assert.equal(a.turn.action, true);
    assert.equal(a.chakra, 20 - SLASH_COST);
    act(out.state, { type: 'attack', unit: 'a', target: foeOf(out.state).id });
  });

  it('ends the enhancement: the element leaves the weapon with it, and the log says so', () => {
    const out = act(setup(), slash(setup()));
    assert.equal(out.state.units.a.imbued, undefined);
    const off = out.events.find((e) => e.t === 'imbue');
    assert.deepEqual(off, { t: 'imbue', unit: 'a', element: 'Fire', on: false, end: 'slashed' });
    const jutsu = out.events.find((e) => e.t === 'jutsu');
    assert.ok(jutsu?.t === 'jutsu' && jutsu.element === 'Fire', 'the screen is told which element flies');
    // The cast, then the element leaving the weapon, then the roll.
    assert.deepEqual(out.events.filter((e) => e.t === 'jutsu' || e.t === 'imbue' || e.t === 'attack').map((e) => e.t), ['jutsu', 'imbue', 'attack']);
    const s = setup();
    assert.equal(logLine(off!, s, 'es')?.text, 'Las llamas salen del arma de Aki en un corte');
    assert.equal(logLine(off!, s, 'en')?.text, "The flames leave Aki's weapon in a slash");
    assert.equal(logLine({ t: 'imbue', unit: 'a', element: 'Earth', on: false, end: 'slashed' }, s, 'es')?.text, 'La obsidiana sale del arma de Aki en un corte');
    assert.equal(logLine(jutsu!, s, 'es')?.text, 'Aki lanza Corte elemental');
    // Again: nothing left to throw.
    const again = structuredClone(out.state);
    again.units.a.turn.bonus = true;
    assert.equal(applyAction(again, slash(again)).reason, 'noImbue');
  });
});

describe('Elemental Slash: reach and roll', () => {
  it(`flies ${SLASH_RANGE} m, water's ${WATER_REACH} m further`, () => {
    assert.equal(slashRange('Fire'), SLASH_RANGE);
    assert.equal(slashRange('Water'), SLASH_RANGE + WATER_REACH);
    act(setup('Fire', SLASH_RANGE), slash(setup('Fire', SLASH_RANGE)));
    const far = setup('Fire', SLASH_RANGE + 1);
    assert.equal(applyAction(far, slash(far)).reason, 'outOfRange');
    act(setup('Water', SLASH_RANGE + 1), slash(setup('Water', SLASH_RANGE + 1)));
  });

  it('not at a friend', () => {
    const s = setup();
    const ally = structuredClone(s.units.a);
    ally.id = 'b';
    ally.pos = { x: 12, z: 10 };
    s.units.b = ally;
    assert.equal(applyAction(s, { type: 'jutsu', unit: 'a', jutsu: ELEMENTAL_SLASH, at: { ...ally.pos }, target: 'b' }).reason, 'ally');
  });

  it("rolls the weapon's attack, at range like a jutsu", () => {
    const s = setup('Fire', 6);
    const u = s.units.a;
    const pv = attackPreview(s, u, foeOf(s), 'jutsu', { jutsuRange: SLASH_RANGE, weapon: true });
    assert.equal(pv.mod, weaponAttackMod(u) + pv.height);
    const atk = act(s, slash(s)).events.find((e) => e.t === 'attack');
    assert.ok(atk?.t === 'attack' && atk.ranged && atk.what === ELEMENTAL_SLASH);
    assert.equal(atk.roll.total - atk.roll.d20, pv.mod);
  });
});

describe('Elemental Slash: what a hit does', () => {
  it("the weapon's die and the element's, with no ability modifier", () => {
    const { out, foe } = thrown('Fire', (_d, crit, ok) => ok && !crit);
    const [blade, el] = damages(out.events, foe.id);
    const w = wielded(out.state.units.a);
    assert.equal(blade.dmgType, w.type);
    assert.ok(blade.amount >= 1 && blade.amount <= maxOf(w.dice), `${blade.amount} within ${w.dice}`);
    assert.equal(el.dmgType, IMBUE_DAMAGE.Fire);
    assert.ok(el.amount >= 1 && el.amount <= 4);
  });

  // The owner: "y en este jutsu el efecto se aplica si o si no solo en critico".
  it('the element\'s effect on every hit, not only a crit: fire burns, lightning numbs', () => {
    assert.ok(thrown('Fire', (_d, crit, ok) => ok && !crit).foe.effects.some((e) => e.id === 'burning'));
    assert.ok(thrown('Lightning', (_d, crit, ok) => ok && !crit).foe.effects.some((e) => e.id === 'jolted'));
  });

  it('wind blows the foe back on every hit', () => {
    const { foe } = thrown('Wind', (_d, crit, ok) => ok && !crit);
    assert.ok(foe.pos.x > 8 + 6, `pushed from 14 to ${foe.pos.x}`);
  });

  it('earth knocks the foe down on every hit ("derribar"), and crits on a 20 only', () => {
    const { out, foe } = thrown('Earth', (_d, crit, ok) => ok && !crit);
    assert.ok(foe.cond.prone, 'prone');
    assert.ok(out.events.some((e) => e.t === 'note' && e.key === 'knockedDown'));
    // Obsidian's 19 is the blade's, not the slash's: a 19 against AC 30 misses.
    const { atk } = thrown('Earth', (d) => d === EARTH_CRIT, 6, 30);
    assert.ok(!atk.roll.crit && !atk.roll.success);
  });

  it('a miss carries no effect', () => {
    assert.ok(!thrown('Fire', (_d, _c, ok) => !ok, 6, 30).foe.effects.some((e) => e.id === 'burning'));
    assert.ok(!thrown('Earth', (_d, _c, ok) => !ok, 6, 30).foe.cond.prone);
  });

  it('water puts out the flames and leaves the ground under the target wet, as a water jutsu does', () => {
    // The owner: "el de agua apaga las llamas y pone mojado abajo del objetivo". On any hit (as the dousing), not only a crit.
    const { out, foe } = thrown('Water', (_d, crit, ok) => ok && !crit);
    const wet = out.events.find((e) => e.t === 'ground' && e.kind === 'wet' && e.on);
    assert.ok(wet?.t === 'ground' && wet.cells.length > 0, 'the ground is soaked');
    assert.ok(dampAt(out.state, foe.pos), 'under the target');
    assert.equal(logLine(wet!, setup('Water'), 'es')?.text, 'El suelo queda mojado');
    assert.equal(logLine(wet!, setup('Water'), 'en')?.text, 'The ground is soaked');
    // A burning foe's flames go out.
    for (let seed = 1; seed < 400; seed++) {
      const s = setup('Water', 6, seed);
      const f = foeOf(s);
      f.ac = 1;
      f.hp = f.maxHp = 200;
      f.effects = [{ id: 'burning', remaining: 3 }];
      const o = act(s, slash(s));
      const atk = o.events.find((e) => e.t === 'attack');
      if (atk?.t !== 'attack' || !atk.roll.success) continue;
      assert.ok(!o.state.units[f.id].effects.some((e) => e.id === 'burning'));
      return;
    }
    throw new Error('no hit');
  });

  it('a fire slash leaves no wet ground; a water slash that misses leaves none either', () => {
    assert.ok(!thrown('Fire', (_d, _c, ok) => ok).out.events.some((e) => e.t === 'ground'));
    assert.ok(!thrown('Water', (_d, _c, ok) => !ok).out.events.some((e) => e.t === 'ground'));
  });

  it('a miss deals nothing, and the element is gone all the same', () => {
    const { out, foe } = thrown('Fire', (_d, _c, ok) => !ok);
    assert.equal(damages(out.events, foe.id).length, 0);
    assert.equal(out.state.units.a.imbued, undefined);
  });
});

describe('Elemental Slash: the AI', () => {
  /** The rogue's turn with fire on its weapon, A `gap` meters away, its movement `move`. */
  function rogueTurn(gap: number, move: number, rounds = 2): BattleState {
    const s = setup('Fire', gap, 5, false);
    const foe = foeOf(s);
    s.units.a.controller = 'player';
    s.turn = s.order.indexOf(foe.id);
    foe.turn = { move, action: true, bonus: true, reaction: true, moved: 0 };
    foe.armed = true;
    foe.chakra = 20;
    startImbue(foe, 'Fire', []);
    foe.imbued!.rounds = rounds;
    foe.intent = { kind: 'melee', what: foe.weapon.name, target: 'a' };
    return s;
  }
  const slashedBy = (ev: BattleEvent[], id: string) => ev.some((e) => e.t === 'jutsu' && e.unit === id && e.jutsu === ELEMENTAL_SLASH);

  it('throws it when its blade can reach no one this turn', () => {
    const s = rogueTurn(7, 0);
    const out = runAi(s);
    assert.ok(slashedBy(out.events, foeOf(s).id), out.events.map((e) => e.t).join(' '));
  });

  it('keeps it on the blade while it can strike', () => {
    const s = rogueTurn(1.5, 6);
    const out = runAi(s);
    assert.ok(!slashedBy(out.events, foeOf(s).id));
    assert.ok(out.events.some((e) => e.t === 'attack' && e.unit === foeOf(s).id), 'it strikes');
    assert.ok(out.state.units[foeOf(s).id].imbued, 'the element is still on the weapon');
  });

  it("on the element's last turn it strikes first, then throws it before it fades", () => {
    const s = rogueTurn(1.5, 6, 1);
    const out = runAi(s);
    const id = foeOf(s).id;
    const blow = out.events.findIndex((e) => e.t === 'attack' && e.unit === id && e.what !== ELEMENTAL_SLASH);
    const cut = out.events.findIndex((e) => e.t === 'jutsu' && e.unit === id && e.jutsu === ELEMENTAL_SLASH);
    assert.ok(blow >= 0 && cut > blow, out.events.map((e) => e.t).join(' '));
  });
});
