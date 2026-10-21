// Tests for the rank D and C jutsu (the owner's answers of 2026-10-21; docs/GAMEPLAY_DESIGN.md,
// "Rank D and C jutsu"): their data, how each one resolves in battle, the pieces they brought (a
// sword art draws the blade, the Rush stows it and charges, the Breeze Mantle's dodge, melee jutsu
// rolled as blows, the AI planning again after a bonus action) and their lines in the log. npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER, JUTSUS_DATA } from '../data/shinobiData';
import type { ShinobiCharacter } from '../types/shinobi';
import type { BattleEvent, BattleState, Pt } from './types';
import { applyAction, createBattle } from './engine';
import type { BattleSetup } from './engine';
import { cellBlocked, cellCenter, cellOf, clearRun, dist, propRules, waterAtPt } from './map';
import { canStop } from './nav';
import { attackPreview, saveMod } from './combat';
import { beginTurn } from './turns';
import { ninjaOptions, offensive } from './intent';
import { aiAction, runAi } from './ai';
import { JUTSU, enhanced } from './jutsu';
import { logLine } from '../components/battle/battleLog';

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

/**
 * Aki (a) on its turn with only the jutsu under test and chakra to spare, a rogue near `foe` with no
 * jutsu of its own (no Evasion or Kawarimi gets in the way). More units by `over`.
 */
function duel(id: string, foe: Pt = { x: 14, z: 10 }, over: Partial<BattleSetup> = {}): BattleState {
  const s = turnOf(createBattle(setup(over)).state, 'a');
  for (const u of Object.values(s.units)) {
    u.jutsus = [];
    u.chakra = 30;
  }
  s.units.a.jutsus = [id];
  place(s, 'rogue_0', foe);
  return s;
}

/** Aki casts it: at the rogue unless told otherwise (`target: null` for a jutsu aimed at a point or at itself). */
const cast = (s: BattleState, id: string, o: { target?: string | null; at?: Pt; enhanced?: boolean } = {}) => {
  const target = o.target === null ? undefined : (o.target ?? 'rogue_0');
  return applyAction(s, { type: 'jutsu', unit: 'a', jutsu: id, at: o.at ?? { ...s.units[target ?? 'a'].pos }, target, enhanced: o.enhanced });
};

type Out = ReturnType<typeof applyAction>;
/** The first seed whose outcome passes `want` (a natural 1 misses and a natural 20 hits, whatever the bonus). */
function seeded(s: BattleState, act: (t: BattleState) => Out, want: (out: Out) => boolean): Out {
  for (let seed = 1; seed < 80; seed++) {
    const t = structuredClone(s);
    t.seed = seed;
    const out = ok(act(t));
    if (want(out)) return out;
  }
  throw new Error('no seed gives it');
}
/** Aki's attack roll landed. */
const hits = (out: Out) => out.events.some((e) => e.t === 'attack' && e.unit === 'a' && e.roll.success);

const saves = (ev: BattleEvent[]) => ev.filter((e) => e.t === 'save').map((e) => (e.t === 'save' ? e.unit : '')).sort();
const damageTo = (ev: BattleEvent[], unit: string) => ev.filter((e) => e.t === 'damage' && e.unit === unit);
const effectOn = (ev: BattleEvent[], unit: string, effect: string) => ev.some((e) => e.t === 'effect' && e.unit === unit && e.effect === effect && e.on);

const NEW = [
  'fire_three_embers',
  'wind_whirl',
  'wind_breeze_mantle',
  'lightning_jolt',
  'lightning_spark_fan',
  'earth_pebble_shot',
  'earth_spike_crown',
  'water_healing_dew',
  'water_geyser',
  'genjutsu_mirage',
  'kenjutsu_bleeding_cut',
  'taijutsu_rush',
];
/** The ones that deal damage (all but the Mantle and the Dew). */
const DAMAGE = NEW.filter((id) => id !== 'wind_breeze_mantle' && id !== 'water_healing_dew');

describe('rank D and C jutsu: the data', () => {
  it('the twelve, with the proposal\'s names in both languages, rank, nature, slot and chakra', () => {
    // id: [Spanish name, English name, rank, nature, slot, chakra, enhanced cost, cast, range in m]
    const want: Record<string, [string, string, string, string, string, number, number, string, number]> = {
      fire_three_embers: ['Técnica de Fuego: Tres brasas', 'Fire Technique: Three Embers', 'D', 'Fire', 'Elemental', 1, 1, 'action', 9],
      wind_whirl: ['Técnica de Viento: Remolino', 'Wind Technique: Whirl', 'D', 'Wind', 'Elemental', 1, 1, 'action', 9],
      wind_breeze_mantle: ['Técnica de Viento: Manto de brisa', 'Wind Technique: Breeze Mantle', 'D', 'Wind', 'Utility', 1, 0, 'bonus', 1.5],
      lightning_jolt: ['Técnica de Rayo: Calambre', 'Lightning Technique: Jolt', 'D', 'Lightning', 'Elemental', 1, 1, 'action', 7.5],
      lightning_spark_fan: ['Técnica de Rayo: Abanico de chispas', 'Lightning Technique: Spark Fan', 'C', 'Lightning', 'Elemental', 2, 2, 'action', 4.5],
      earth_pebble_shot: ['Técnica de Tierra: Guijarros', 'Earth Technique: Pebble Shot', 'D', 'Earth', 'Elemental', 1, 1, 'bonus', 9],
      earth_spike_crown: ['Técnica de Tierra: Corona de púas', 'Earth Technique: Spike Crown', 'C', 'Earth', 'Elemental', 2, 2, 'action', 1.5],
      water_healing_dew: ['Técnica de Agua: Rocío sanador', 'Water Technique: Healing Dew', 'D', 'Water', 'Utility', 2, 1, 'action', 6],
      water_geyser: ['Técnica de Agua: Géiser', 'Water Technique: Geyser', 'C', 'Water', 'Elemental', 2, 2, 'action', 9],
      genjutsu_mirage: ['Técnica de Genjutsu: Espejismo', 'Genjutsu Technique: Mirage', 'C', 'Genjutsu', 'Elemental', 2, 2, 'action', 9],
      kenjutsu_bleeding_cut: ['Técnica de Kenjutsu: Tajo sangrante', 'Kenjutsu Technique: Bleeding Cut', 'D', 'Kenjutsu', 'Elemental', 1, 1, 'action', 3],
      taijutsu_rush: ['Técnica de Taijutsu: Embestida', 'Taijutsu Technique: Rush', 'C', 'Taijutsu', 'Elemental', 2, 2, 'action', 6],
    };
    assert.deepEqual(Object.keys(want), NEW);
    for (const [id, [es, en, rank, nature, category, cost, enh, castAs, range]] of Object.entries(want)) {
      const d = JUTSUS_DATA.find((j) => j.id === id);
      assert.ok(d, id);
      assert.deepEqual([d.nameEs, d.name, d.rank, d.nature, d.category, d.chakraCost, d.enhancementChakraCost], [es, en, rank, nature, category, cost, enh], id);
      assert.ok(d.descriptionEs && d.description && d.japaneseName, id);
      const j = JUTSU[id];
      assert.deepEqual([j.nameEs, j.name, j.cast, j.range, j.cost, j.enhCost], [es, en, castAs, range, cost, enh], id);
    }
    // New ids, not renames: every old jutsu is still there.
    assert.equal(new Set(JUTSUS_DATA.map((j) => j.id)).size, JUTSUS_DATA.length);
  });

  it('their battle specs: shape, dice, save or attack roll, what they leave', () => {
    const s = (id: string) => {
      const j = JUTSU[id];
      return [j.shape, j.dice ?? '', j.dmgType ?? '', j.save ?? 'attack', j.save ? (j.saveHalf ? 'half' : 'none') : '', j.effect ?? '', j.env ?? '', j.melee, j.loud];
    };
    assert.deepEqual(s('fire_three_embers'), ['single', '2d6', 'Fire', 'attack', '', '', 'ignite', false, true]);
    assert.deepEqual(s('wind_whirl'), ['single', '1d8', 'Bludgeoning', 'str', 'half', '', 'clearFoliage', false, true]);
    assert.deepEqual(s('wind_breeze_mantle'), ['self', '', '', 'attack', '', '', '', false, false]);
    assert.deepEqual(s('lightning_jolt'), ['single', '1d6', 'Lightning', 'con', 'none', 'numb', 'electrify', false, true]);
    assert.deepEqual(s('lightning_spark_fan'), ['cone', '2d8', 'Lightning', 'dex', 'half', '', 'electrify', false, true]);
    assert.deepEqual(s('earth_pebble_shot'), ['single', '1d6', 'Bludgeoning', 'attack', '', '', '', false, true]);
    assert.deepEqual(s('earth_spike_crown'), ['selfCircle', '2d8', 'Piercing', 'dex', 'half', '', '', true, true]);
    assert.deepEqual(s('water_healing_dew'), ['ally', '1d8', '', 'attack', '', '', '', false, false]);
    assert.deepEqual(s('water_geyser'), ['circle', '3d6', 'Bludgeoning', 'str', 'half', '', '', false, true]);
    assert.deepEqual(s('genjutsu_mirage'), ['single', '2d6', 'Psychic', 'wis', 'none', 'confused', '', false, true]);
    assert.deepEqual(s('kenjutsu_bleeding_cut'), ['single', '1d8', 'Slashing', 'attack', '', 'bleeding', '', true, true]);
    assert.deepEqual(s('taijutsu_rush'), ['single', '2d8', 'Bludgeoning', 'attack', '', '', '', true, true]);
    assert.equal(JUTSU.wind_breeze_mantle.special, 'mantle');
    assert.equal(JUTSU.water_healing_dew.special, 'heal');
    assert.equal(JUTSU.earth_spike_crown.radius, 3);
    assert.equal(JUTSU.water_geyser.radius, 1.5);
    assert.equal(JUTSU.lightning_spark_fan.length, 4.5);
    // The hands: a sword art draws the blade (the Crescent Moon Dance too), the Rush stows it and charges.
    assert.equal(JUTSU.kenjutsu_bleeding_cut.weapon, 'draw');
    assert.equal(JUTSU.crescent_moon_dance.weapon, 'draw');
    assert.equal(JUTSU.taijutsu_rush.weapon, 'stow');
    assert.equal(JUTSU.taijutsu_rush.charge, true);
    assert.equal(JUTSU.earth_spike_crown.weapon, undefined);
  });

  it('enhanced: one more die, and the areas grow (Crown 4.5 m, Geyser 2.25 m, Spark Fan 5.6 m and wider)', () => {
    const e = (id: string) => enhanced(JUTSU[id]);
    assert.equal(e('fire_three_embers').dice, '3d6');
    assert.equal(e('wind_whirl').dice, '2d8');
    assert.equal(e('lightning_jolt').dice, '2d6');
    assert.equal(e('lightning_spark_fan').dice, '3d8');
    assert.equal(e('lightning_spark_fan').length, 5.625);
    assert.equal(e('lightning_spark_fan').angle, 80);
    assert.equal(e('earth_pebble_shot').dice, '2d6');
    assert.equal(e('earth_spike_crown').dice, '3d8');
    assert.equal(e('earth_spike_crown').radius, 4.5);
    assert.equal(e('water_healing_dew').dice, '2d8');
    assert.equal(e('water_geyser').dice, '4d6');
    assert.equal(e('water_geyser').radius, 2.25);
    assert.equal(e('genjutsu_mirage').dice, '3d6');
    assert.equal(e('kenjutsu_bleeding_cut').dice, '2d8');
    assert.equal(e('taijutsu_rush').dice, '3d8');
  });

  it('the screen\'s hooks: three projectile paths, impacts on each one reached, poses, its own white cut', () => {
    for (const id of ['fire_three_embers', 'lightning_jolt', 'earth_pebble_shot']) assert.deepEqual(JUTSU[id].seq?.volley?.paths, ['high', 'straight', 'low'], id);
    assert.equal(JUTSU.earth_pebble_shot.vfx, 'multi'); // its impact is earth's multi_hit (the rock-bullet burst)
    assert.ok(JUTSU.earth_pebble_shot.seq?.castAura);
    assert.ok(JUTSU.lightning_spark_fan.seq?.connected && JUTSU.lightning_spark_fan.seq.hitEach);
    assert.equal(JUTSU.earth_spike_crown.pose, 'charge');
    assert.ok(JUTSU.earth_spike_crown.seq?.hitEach);
    assert.ok(JUTSU.water_geyser.seq?.fromGround);
    assert.equal(JUTSU.genjutsu_mirage.vfx, 'sphere');
    assert.equal(JUTSU.genjutsu_mirage.seq?.slowFlight, 1.5);
    assert.equal(JUTSU.water_healing_dew.seq?.healAura, 800);
    assert.equal(JUTSU.wind_breeze_mantle.seq?.lingerAura, 0.4);
    assert.equal(JUTSU.kenjutsu_bleeding_cut.vfxSet, 'neutral');
    assert.equal(JUTSU.kenjutsu_bleeding_cut.vfx, 'slash');
    assert.equal(JUTSU.taijutsu_rush.pose, 'tackle');
    assert.equal(JUTSU.taijutsu_rush.seq?.fastRun, 2);
  });
});

describe('rank D and C jutsu in battle', () => {
  /** The tall grass at (8, 18) on the River Forest map, and its prop index. */
  const GRASS = { x: 8, z: 18 };
  const grassProp = (s: BattleState) => s.props.findIndex((p) => p.def.name === 'tall_grass' && dist(p.def, GRASS) < 0.3);

  it('Three Embers: a jutsu attack roll for 2d6 fire; it sets the dry grass round the target alight even when it misses', () => {
    const s = duel('fire_three_embers', GRASS);
    const g = grassProp(s);
    assert.ok(g >= 0 && propRules(s.props[g].def).flammable);
    const hit = seeded(s, (t) => cast(t, 'fire_three_embers'), hits);
    assert.ok(hit.events.some((e) => e.t === 'attack' && e.what === 'fire_three_embers' && e.roll.success));
    const burn = damageTo(hit.events, 'rogue_0')[0];
    assert.ok(burn?.t === 'damage' && burn.dmgType === 'Fire');
    const miss = seeded(s, (t) => cast(t, 'fire_three_embers'), (o) => !hits(o));
    assert.equal(damageTo(miss.events, 'rogue_0').length, 0);
    assert.ok(miss.events.some((e) => e.t === 'prop' && e.prop === g && e.state === 'burnt'), 'the grass burns all the same');
    // One chakra (two enhanced), and the action.
    assert.equal(miss.state.units.a.chakra, 29);
    assert.equal(miss.state.units.a.turn.action, false);
    assert.equal(ok(cast(s, 'fire_three_embers', { enhanced: true })).state.units.a.chakra, 28);
  });

  it('Whirl: a STR save for 1d8 bludgeoning (half on a success), and it cuts the grass the target hid in', () => {
    const s = duel('wind_whirl', GRASS);
    const g = grassProp(s);
    s.units.a.saveDC = 40;
    const out = ok(cast(s, 'wind_whirl'));
    const sv = out.events.find((e) => e.t === 'save');
    assert.ok(sv?.t === 'save' && sv.ab === 'str' && !sv.roll.success);
    assert.ok(damageTo(out.events, 'rogue_0').every((e) => e.t === 'damage' && e.dmgType === 'Bludgeoning'));
    assert.equal(damageTo(out.events, 'rogue_0').length, 1);
    assert.ok(out.events.some((e) => e.t === 'prop' && e.prop === g && e.state === 'cut'));
  });

  it('Jolt: a CON save at 7.5 m; failed, 1d6 lightning and Numb (−2 to DEX saves); passed, nothing at all', () => {
    const s = duel('lightning_jolt', { x: 14, z: 10 });
    s.units.a.saveDC = 40;
    const fail = ok(cast(s, 'lightning_jolt'));
    assert.equal(damageTo(fail.events, 'rogue_0').length, 1);
    assert.ok(effectOn(fail.events, 'rogue_0', 'numb'));
    assert.equal(saveMod(fail.state.units.rogue_0, 'dex'), saveMod(s.units.rogue_0, 'dex') - 2);
    s.units.a.saveDC = -40;
    const pass = ok(cast(s, 'lightning_jolt'));
    assert.equal(damageTo(pass.events, 'rogue_0').length, 0);
    assert.ok(!pass.events.some((e) => e.t === 'effect'));
    // Out of its reach at 8 m.
    const far = duel('lightning_jolt', { x: 16.25, z: 10.25 });
    assert.ok(dist(far.units.a.pos, far.units.rogue_0.pos) > 7.6);
    assert.equal(cast(far, 'lightning_jolt').reason, 'outOfRange');
  });

  it('Spark Fan: a 4.5 m cone, a DEX save for everyone in it (a friend too, not the caster); enhanced it reaches 5.6 m', () => {
    const s = duel('lightning_spark_fan', { x: 10.5, z: 10.25 }, {
      party: [
        { character: hero({ id: 'a', name: 'Aki' }), pos: { x: 8, z: 10 } },
        { character: hero({ id: 'b', name: 'Ben' }), pos: { x: 11.5, z: 11 } },
      ],
      enemies: [
        { kind: 'rogue', pos: { x: 14, z: 10 } },
        { kind: 'hunter', pos: { x: 13.5, z: 10 } },
      ],
    });
    place(s, 'hunter_0', { x: 13.25, z: 10.25 });
    const at = { ...s.units.rogue_0.pos };
    assert.ok(dist(s.units.a.pos, s.units.hunter_0.pos) > 4.75 && dist(s.units.a.pos, s.units.hunter_0.pos) < 5.4);
    const out = ok(cast(s, 'lightning_spark_fan', { at, target: null }));
    assert.deepEqual(saves(out.events), ['b', 'rogue_0']);
    assert.ok(out.events.every((e) => e.t !== 'save' || e.ab === 'dex'));
    const big = ok(cast(s, 'lightning_spark_fan', { at, target: null, enhanced: true }));
    assert.deepEqual(saves(big.events), ['b', 'hunter_0', 'rogue_0']);
  });

  it('Pebble Shot: a bonus action, so the action is still there; strike first and the blade goes away for free, cast first and the blow is with the fists', () => {
    const s = duel('earth_pebble_shot', { x: 9.75, z: 10.25 });
    s.units.a.jutsuAttack = 40;
    const out = ok(cast(s, 'earth_pebble_shot'));
    assert.equal(out.state.units.a.turn.bonus, false);
    assert.equal(out.state.units.a.turn.action, true);
    assert.ok(out.events.some((e) => e.t === 'attack' && e.what === 'earth_pebble_shot'));
    assert.ok(damageTo(out.events, 'rogue_0').every((e) => e.t === 'damage' && e.dmgType === 'Bludgeoning'));
    // Cast first: the seals stowed the blade with the turn's free interaction, so the blow is a punch.
    const after = ok(applyAction(out.state, { type: 'attack', unit: 'a', target: 'rogue_0' }));
    assert.ok(after.events.some((e) => e.t === 'attack' && e.what === 'Fists'));
    // Strike first, then cast: the blade is stowed for free and the stones still fly.
    const blow = ok(applyAction(s, { type: 'attack', unit: 'a', target: 'rogue_0' }));
    assert.ok(blow.events.some((e) => e.t === 'attack' && e.what === 'Crystal blade'));
    const then = ok(cast(blow.state, 'earth_pebble_shot'));
    assert.ok(then.events.some((e) => e.t === 'weapon' && !e.armed && e.cost === 'free'));
    assert.equal(cast(then.state, 'earth_pebble_shot').reason, 'noBonus');
  });

  it('Spike Crown: everyone within 3 m (a friend too, not the caster) makes a DEX save; a stomp, so the blade stays in hand; enhanced, 4.5 m', () => {
    const s = duel('earth_spike_crown', { x: 10.75, z: 10.25 }, {
      party: [
        { character: hero({ id: 'a', name: 'Aki' }), pos: { x: 8, z: 10 } },
        { character: hero({ id: 'b', name: 'Ben' }), pos: { x: 8, z: 12 } },
      ],
      enemies: [
        { kind: 'rogue', pos: { x: 14, z: 10 } },
        { kind: 'hunter', pos: { x: 12, z: 10 } },
      ],
    });
    place(s, 'hunter_0', { x: 12.25, z: 10.25 });
    const d = (id: string) => dist(s.units.a.pos, s.units[id].pos);
    assert.ok(d('rogue_0') < 3 && d('b') < 3 && d('hunter_0') > 3.5 && d('hunter_0') < 4.5);
    assert.equal(s.units.a.armed, true);
    const out = ok(cast(s, 'earth_spike_crown', { target: null }));
    assert.deepEqual(saves(out.events), ['b', 'rogue_0']);
    assert.ok(!out.events.some((e) => e.t === 'weapon'), 'no seals: the weapon stays drawn');
    assert.equal(out.state.units.a.armed, true);
    assert.ok(out.events.every((e) => e.t !== 'damage' || e.dmgType === 'Piercing'));
    const big = ok(cast(s, 'earth_spike_crown', { at: { ...s.units.a.pos }, target: null, enhanced: true }));
    assert.deepEqual(saves(big.events), ['b', 'hunter_0', 'rogue_0']);
  });

  it('Healing Dew: 1d8 to a friend up to 6 m away (or to the caster), no Medic bonus; it gets a fallen friend up; silent', () => {
    const base = duel('water_healing_dew', { x: 16, z: 10 }, {
      party: [
        { character: hero({ id: 'a', name: 'Aki', shinobiClass: 'Medical Specialist' }), pos: { x: 8, z: 10 } },
        { character: hero({ id: 'b', name: 'Ben' }), pos: { x: 13.5, z: 10 } },
      ],
    });
    place(base, 'b', { x: 13.75, z: 10.25 });
    assert.ok(dist(base.units.a.pos, base.units.b.pos) <= 6);
    for (let seed = 1; seed < 20; seed++) {
      const s = structuredClone(base);
      s.seed = seed;
      s.units.b.hp = 5;
      const out = ok(cast(s, 'water_healing_dew', { target: 'b' }));
      const h = out.events.find((e) => e.t === 'heal');
      assert.ok(h?.t === 'heal' && h.unit === 'b' && h.amount >= 1 && h.amount <= 8, `seed ${seed}`);
      assert.equal(out.state.units.a.chakra, 28);
      assert.equal(out.state.units.a.turn.action, false);
    }
    // A fallen friend gets back up.
    const down = structuredClone(base);
    down.units.b.hp = 0;
    down.units.b.down = 'downed';
    const up = ok(cast(down, 'water_healing_dew', { target: 'b' }));
    assert.equal(up.state.units.b.down, undefined);
    assert.ok(up.state.units.b.hp > 0);
    // On itself; not on a foe; not past 6 m.
    const self = structuredClone(base);
    self.units.a.hp = 5;
    assert.ok(ok(cast(self, 'water_healing_dew', { target: 'a' })).events.some((e) => e.t === 'heal' && e.unit === 'a'));
    assert.equal(cast(base, 'water_healing_dew', { target: 'rogue_0' }).reason, 'needAlly');
    const far = structuredClone(base);
    place(far, 'b', { x: 15.25, z: 10.25 });
    assert.equal(cast(far, 'water_healing_dew', { target: 'b' }).reason, 'outOfRange');
    // Silent: a hidden caster stays hidden.
    const hid = structuredClone(base);
    hid.units.a.cond.hidden = 15;
    assert.equal(ok(cast(hid, 'water_healing_dew', { target: 'b' })).state.units.a.cond.hidden, 15);
  });

  it('Geyser: a 1.5 m circle up to 9 m away; everyone in it (a friend too) makes a STR save; enhanced, 2.25 m', () => {
    const s = duel('water_geyser', { x: 15.75, z: 10.25 }, {
      party: [
        { character: hero({ id: 'a', name: 'Aki' }), pos: { x: 8, z: 10 } },
        { character: hero({ id: 'b', name: 'Ben' }), pos: { x: 16, z: 12 } },
      ],
    });
    place(s, 'b', { x: 15.75, z: 12.25 });
    const at = { ...s.units.rogue_0.pos };
    assert.ok(dist(at, s.units.b.pos) > 1.5 + 0.3 && dist(at, s.units.b.pos) < 2.25 + 0.2);
    const out = ok(cast(s, 'water_geyser', { at, target: null }));
    assert.deepEqual(saves(out.events), ['rogue_0']);
    assert.ok(out.events.every((e) => e.t !== 'save' || e.ab === 'str'));
    assert.deepEqual(saves(ok(cast(s, 'water_geyser', { at, target: null, enhanced: true })).events), ['b', 'rogue_0']);
    assert.equal(cast(s, 'water_geyser', { at: { x: at.x + 2, z: at.z }, target: null }).reason, 'outOfRange');
  });

  it('Mirage: a WIS save; failed, 2d6 psychic and Confused for 2 rounds; passed, nothing', () => {
    const s = duel('genjutsu_mirage');
    s.units.a.saveDC = 40;
    const fail = ok(cast(s, 'genjutsu_mirage'));
    assert.ok(fail.events.some((e) => e.t === 'save' && e.ab === 'wis'));
    assert.ok(damageTo(fail.events, 'rogue_0').every((e) => e.t === 'damage' && e.dmgType === 'Psychic'));
    assert.ok(effectOn(fail.events, 'rogue_0', 'confused'));
    assert.equal(fail.state.units.rogue_0.effects.find((e) => e.id === 'confused')?.remaining, 2);
    s.units.a.saveDC = -40;
    const pass = ok(cast(s, 'genjutsu_mirage'));
    assert.equal(damageTo(pass.events, 'rogue_0').length, 0);
    assert.ok(!pass.events.some((e) => e.t === 'effect'));
  });

  it('Bleeding Cut: the blade is drawn for free, a leap in from up to 3 m, an attack roll struck as a blow; a hit leaves Bleeding', () => {
    const s = duel('kenjutsu_bleeding_cut', { x: 10.75, z: 10.25 });
    s.units.a.armed = false;
    assert.ok(dist(s.units.a.pos, s.units.rogue_0.pos) > 2);
    const out = seeded(s, (t) => cast(t, 'kenjutsu_bleeding_cut'), hits);
    const kinds = out.events.map((e) => e.t);
    assert.ok(kinds.indexOf('weapon') < kinds.indexOf('move') && kinds.indexOf('move') < kinds.indexOf('jutsu'));
    assert.ok(out.events.some((e) => e.t === 'weapon' && e.armed && e.cost === 'free'));
    assert.ok(out.events.some((e) => e.t === 'move' && e.jutsu === 'kenjutsu_bleeding_cut'));
    assert.equal(out.state.units.a.armed, true);
    const atk = out.events.find((e) => e.t === 'attack');
    assert.ok(atk?.t === 'attack' && atk.what === 'kenjutsu_bleeding_cut' && !atk.ranged && !(atk.reasons ?? []).includes('closeEnemy'));
    assert.ok(damageTo(out.events, 'rogue_0').every((e) => e.t === 'damage' && e.dmgType === 'Slashing'));
    assert.ok(effectOn(out.events, 'rogue_0', 'bleeding'));
    // It bleeds at the start of its turns.
    const t = structuredClone(out.state);
    t.turn = t.order.indexOf('rogue_0');
    const ev: BattleEvent[] = [];
    const hp = t.units.rogue_0.hp;
    beginTurn(t, ev);
    assert.ok(t.units.rogue_0.hp < hp);
    // A miss leaves no wound.
    assert.ok(!seeded(s, (t) => cast(t, 'kenjutsu_bleeding_cut'), (o) => !hits(o)).events.some((e) => e.t === 'effect'));
    // A sword art needs the blade: with the free draw already spent it waits for it, and a ninja
    // with no blade at all (a palm, the fists) can't cast it.
    const spent = structuredClone(s);
    spent.units.a.turn.interacted = true;
    assert.equal(cast(spent, 'kenjutsu_bleeding_cut').reason, 'drawFirst');
    spent.units.a.armed = true;
    assert.ok(!ok(cast(spent, 'kenjutsu_bleeding_cut')).events.some((e) => e.t === 'weapon'));
    const palm = structuredClone(s);
    palm.units.a.weapon = { ...palm.units.a.weapon, name: 'Lightning palm', held: false };
    assert.equal(cast(palm, 'kenjutsu_bleeding_cut').reason, 'noBlade');
    assert.ok(!ninjaOptions(palm, palm.units.a).some((o) => o.intent.kind === 'jutsu' && o.intent.what === 'kenjutsu_bleeding_cut'), 'the AI never plans it');
    assert.ok(ninjaOptions(s, s.units.a).some((o) => o.intent.kind === 'jutsu' && o.intent.what === 'kenjutsu_bleeding_cut'));
    // Not past 3 m.
    assert.equal(cast(duel('kenjutsu_bleeding_cut', { x: 12.25, z: 10.25 }), 'kenjutsu_bleeding_cut').reason, 'outOfRange');
  });

  it('a sword art draws the blade (the proposal\'s piece P8): the Crescent Moon Dance too', () => {
    const s = duel('crescent_moon_dance', { x: 9.75, z: 10.25 });
    s.units.a.armed = false;
    const out = ok(cast(s, 'crescent_moon_dance'));
    assert.ok(out.events.some((e) => e.t === 'weapon' && e.armed));
  });

  it('Rush: the weapon is stowed, a straight charge of up to 6 m with no opportunity attack and no movement spent, then a 2d8 blow', () => {
    const s = duel('taijutsu_rush', { x: 13.25, z: 10.25 }, {
      enemies: [
        { kind: 'rogue', pos: { x: 14, z: 10 } },
        { kind: 'hunter', pos: { x: 8, z: 11.5 } },
      ],
    });
    // A hunter right beside Aki, its reaction ready: the charge leaves its reach all the same.
    place(s, 'hunter_0', { x: 8.25, z: 11.25 });
    s.units.hunter_0.turn.reaction = true;
    assert.equal(s.units.a.armed, true);
    assert.ok(dist(s.units.a.pos, s.units.rogue_0.pos) > 4.5 && dist(s.units.a.pos, s.units.rogue_0.pos) <= 6);
    const out = seeded(s, (t) => cast(t, 'taijutsu_rush'), hits);
    const kinds = out.events.map((e) => e.t);
    assert.ok(kinds.indexOf('weapon') < kinds.indexOf('move') && kinds.indexOf('move') < kinds.indexOf('jutsu') && kinds.indexOf('jutsu') < kinds.indexOf('attack'));
    assert.ok(out.events.some((e) => e.t === 'weapon' && !e.armed && e.cost === 'free'));
    const mv = out.events.find((e) => e.t === 'move');
    assert.ok(mv?.t === 'move' && mv.jutsu === 'taijutsu_rush' && mv.run);
    const a = out.state.units.a;
    assert.ok(dist(a.pos, out.state.units.rogue_0.pos) <= 1.6);
    assert.equal(a.turn.move, s.units.a.turn.move, 'no movement spent');
    assert.equal(a.armed, false);
    assert.ok(!out.events.some((e) => (e.t === 'attack' && e.unit === 'hunter_0') || e.t === 'reactionAsk'), 'no opportunity attack');
    const atk = out.events.find((e) => e.t === 'attack' && e.unit === 'a');
    assert.ok(atk?.t === 'attack' && atk.what === 'taijutsu_rush' && !(atk.reasons ?? []).includes('closeEnemy'));
    assert.ok(damageTo(out.events, 'rogue_0').every((e) => e.t === 'damage' && e.dmgType === 'Bludgeoning'));
    assert.equal(damageTo(out.events, 'rogue_0').length, 1);
  });

  it('Rush: not past 6 m, not through a wall, and not with the free interaction spent and the weapon in hand', () => {
    const far = duel('taijutsu_rush', { x: 14.75, z: 10.25 });
    assert.ok(dist(far.units.a.pos, far.units.rogue_0.pos) > 6.1);
    assert.equal(cast(far, 'taijutsu_rush').reason, 'outOfRange');
    const walled = duel('taijutsu_rush', { x: 13.25, z: 10.25 });
    walled.walls.push({ id: 'w', kind: 'earth', a: { x: 10.75, z: 8 }, b: { x: 10.75, z: 12.5 }, hp: 30 });
    assert.equal(cast(walled, 'taijutsu_rush').reason, 'blocked');
    // Nor across deep water (the river) or a cliff edge: a run on the ground, not a swim or a climb.
    assert.equal(clearRun(walled, { x: 24.25, z: 12.25 }, { x: 31.75, z: 12.25 }), false);
    assert.equal(clearRun(walled, { x: 19.25, z: 12.25 }, { x: 24.25, z: 12.25 }), true);
    const busy = duel('taijutsu_rush', { x: 13.25, z: 10.25 });
    busy.units.a.turn.interacted = true;
    assert.equal(cast(busy, 'taijutsu_rush').reason, 'handsBusy');
    // Already beside the target: no run, just the blow.
    const near = duel('taijutsu_rush', { x: 9.75, z: 10.25 });
    assert.ok(!ok(cast(near, 'taijutsu_rush')).events.some((e) => e.t === 'move'));
  });

  it('Breeze Mantle: a bonus-action dodge with its own mark; silent, never enhanced; it ends at the start of the next turn', () => {
    const s = duel('wind_breeze_mantle', { x: 9.75, z: 10.25 });
    s.units.a.cond.hidden = 14;
    assert.equal(cast(s, 'wind_breeze_mantle', { target: null, enhanced: true }).reason, 'noEnhanced');
    const out = ok(cast(s, 'wind_breeze_mantle', { target: null }));
    const a = out.state.units.a;
    assert.deepEqual([a.cond.dodging, a.cond.mantle, a.turn.bonus, a.turn.action, a.chakra, a.cond.hidden], [true, true, false, true, 29, 14]);
    assert.ok(out.events.some((e) => e.t === 'condition' && e.cond === 'mantle' && e.on));
    // Blows against it have disadvantage; a save isn't helped (it is a dodge, nothing more).
    const pv = attackPreview(out.state, out.state.units.rogue_0, a, 'melee');
    assert.ok(pv.reasons.includes('dodging') && pv.adv === 'disadvantage');
    // Its next turn: the mantle is gone, and the screen hears it.
    const t = structuredClone(out.state);
    const ev: BattleEvent[] = [];
    beginTurn(t, ev);
    assert.deepEqual([t.units.a.cond.dodging, t.units.a.cond.mantle], [false, false]);
    assert.ok(ev.some((e) => e.t === 'condition' && e.cond === 'mantle' && !e.on));
  });
});

describe('rank D and C jutsu and the AI', () => {
  /** Where the rogue stands from Aki (8.25, 10.25) to try a jutsu: in its reach. */
  const spot = (id: string): Pt => {
    const j = JUTSU[id];
    if (j.shape === 'selfCircle') return { x: 9.75, z: 10.25 };
    if (j.charge) return { x: 13.25, z: 10.25 };
    if (j.melee) return { x: 10.75, z: 10.25 };
    if (j.shape === 'cone') return { x: 11.25, z: 10.25 };
    return { x: 14.25, z: 10.25 };
  };

  it('every new damage jutsu is one the AI weighs and casts when it is the plan', () => {
    for (const id of DAMAGE) {
      assert.ok(offensive(JUTSU[id]), id);
      let s = createBattle(setup()).state;
      for (const u of Object.values(s.units)) u.jutsus = [];
      s.units.rogue_0.jutsus = [id];
      s.units.rogue_0.chakra = 20;
      place(s, 'rogue_0', spot(id));
      s = turnOf(s, 'rogue_0');
      const opt = ninjaOptions(s, s.units.rogue_0).find((o) => o.intent.kind === 'jutsu' && o.intent.what === id);
      assert.ok(opt, `${id}: an option`);
      s.units.rogue_0.intent = opt.intent;
      const a = aiAction(s);
      assert.ok(a?.type === 'jutsu' && a.jutsu === id, `${id}: cast, got ${JSON.stringify(a)}`);
      const out = ok(applyAction(s, a));
      assert.ok(out.events.some((e) => e.t === 'jutsu' && e.jutsu === id), id);
    }
  });

  it('after a bonus-action jutsu the AI plans again and still uses its action (the proposal\'s piece P7)', () => {
    let s = createBattle(setup()).state;
    for (const u of Object.values(s.units)) u.jutsus = [];
    s.units.rogue_0.jutsus = ['earth_pebble_shot'];
    place(s, 'rogue_0', { x: 14.25, z: 10.25 });
    s = turnOf(s, 'rogue_0');
    s.units.rogue_0.intent = { kind: 'jutsu', what: 'earth_pebble_shot', target: 'a', at: { ...s.units.a.pos } };
    const { events } = runAi(s);
    const at = events.findIndex((e) => e.t === 'jutsu' && e.unit === 'rogue_0' && e.jutsu === 'earth_pebble_shot');
    assert.ok(at >= 0, 'it casts the stones');
    const next = events.findIndex((e, i) => i > at && e.t === 'turn');
    const rest = events.slice(at + 1, next < 0 ? undefined : next);
    assert.ok(
      // (Not the stones' own attack roll: a blow, a kunai, a dash or another jutsu.)
      rest.some((e) => (e.t === 'attack' && e.unit === 'rogue_0' && e.what !== 'earth_pebble_shot') || (e.t === 'act' && e.unit === 'rogue_0') || (e.t === 'jutsu' && e.unit === 'rogue_0')),
      `then it acts: ${rest.map((e) => e.t).join(' ')}`,
    );
  });

  it('a ninja on the AI strikes with its action, then casts Pebble Shot with its bonus action', () => {
    let s = createBattle(
      setup({
        party: [
          { character: hero({ id: 'a', name: 'Aki' }), pos: { x: 8, z: 10 } },
          { character: hero({ id: 'b', name: 'Ben' }), pos: { x: 12.5, z: 10 }, controller: 'ai', aiOrder: 'aggressive' },
        ],
      }),
    ).state;
    for (const u of Object.values(s.units)) u.jutsus = [];
    s.units.b.jutsus = ['earth_pebble_shot'];
    place(s, 'b', { x: 12.75, z: 10.25 });
    place(s, 'rogue_0', { x: 14.25, z: 10.25 });
    s = turnOf(s, 'b');
    const { events } = runAi(s);
    const mine = events.filter((e) => (e.t === 'attack' || e.t === 'jutsu') && e.unit === 'b');
    assert.ok(mine[0]?.t === 'attack' && mine[0].what !== 'earth_pebble_shot', `first a blow: ${JSON.stringify(mine[0])}`);
    assert.ok(mine.some((e) => e.t === 'jutsu' && e.jutsu === 'earth_pebble_shot'), 'then the stones');
  });
});

describe('rank D and C jutsu in the log', () => {
  it('each one is named in Spanish and English when cast', () => {
    const s = createBattle(setup()).state;
    for (const id of NEW) {
      const ev: BattleEvent = { t: 'jutsu', unit: 'a', jutsu: id, at: { x: 8, z: 10 }, shape: null, enhanced: false };
      assert.equal(logLine(ev, s, 'es')?.text, `Aki lanza ${JUTSU[id].nameEs}`);
      assert.equal(logLine(ev, s, 'en')?.text, `Aki casts ${JUTSU[id].name}`);
    }
    const enh: BattleEvent = { t: 'jutsu', unit: 'a', jutsu: 'taijutsu_rush', at: { x: 8, z: 10 }, shape: null, enhanced: true };
    assert.equal(logLine(enh, s, 'es')?.text, '¡Aki lanza Técnica de Taijutsu: Embestida potenciado!');
    assert.equal(logLine(enh, s, 'en')?.text, 'Aki casts Taijutsu Technique: Rush, enhanced!');
  });

  it('what they leave reads in both languages: Numb, Bleeding, Confused, the stowed weapon, the damage types', () => {
    const lines = (out: ReturnType<typeof applyAction>, lang: 'es' | 'en') => out.events.map((e) => logLine(e, out.state, lang)?.text).filter(Boolean);
    const jolt = duel('lightning_jolt');
    jolt.units.a.saveDC = 40;
    const j = ok(cast(jolt, 'lightning_jolt'));
    assert.ok(lines(j, 'es').includes('El Renegado: Entumecido'), lines(j, 'es').join(' | '));
    assert.ok(lines(j, 'en').includes('Rogue: Numb'));
    assert.ok(lines(j, 'es').some((l) => /^El Renegado recibe \d+ de rayo$/.test(l!)));
    const c = seeded(duel('kenjutsu_bleeding_cut', { x: 9.75, z: 10.25 }), (t) => cast(t, 'kenjutsu_bleeding_cut'), hits);
    assert.ok(lines(c, 'es').includes('El Renegado: Sangrando'));
    assert.ok(lines(c, 'en').includes('Rogue: Bleeding'));
    const mir = duel('genjutsu_mirage');
    mir.units.a.saveDC = 40;
    const m = ok(cast(mir, 'genjutsu_mirage'));
    assert.ok(lines(m, 'es').includes('El Renegado: Confundido'));
    assert.ok(lines(m, 'en').includes('Rogue: Confused'));
    const rush = duel('taijutsu_rush', { x: 13.25, z: 10.25 });
    const r = ok(cast(rush, 'taijutsu_rush'));
    assert.ok(lines(r, 'es').includes('Aki guarda el arma'));
    assert.ok(lines(r, 'en').includes('Aki stows the weapon'));
    const crown = duel('earth_spike_crown', { x: 9.75, z: 10.25 });
    crown.units.a.saveDC = 40;
    const k = ok(cast(crown, 'earth_spike_crown', { target: null }));
    assert.ok(lines(k, 'es').some((l) => /^El Renegado recibe \d+ de perforante$/.test(l!)), lines(k, 'es').join(' | '));
    assert.ok(lines(k, 'en').some((l) => /^Rogue takes \d+ piercing$/.test(l!)));
  });
});
