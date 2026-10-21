// Tests for the mission rules: npm test (docs/MISSION_DESIGN.md is the spec).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import type { ShinobiCharacter } from '../types/shinobi';
import type { PartyState } from '../types/mission';
import { cannotBeSurprised, proficiencyBonus, rollCheck, saveModifier, skillModifier, successChance } from './checks';
import { deriveStats } from './derived';
import { formatDice, parseDice, rollDice } from './dice';
import { addEffect, effectMods, endBattle, morningAfter, tickRound, treat } from './effects';
import { applyBattleResult, enterNextZone, flankWear, newMission, rollDeathSaves, takeSoldierPill, travelLeg } from './mission';
import { changeExhaustion, changeTension, hitDiceLeft, migrateCharacter, migrateClan, returnToVillage, sanitizeMissionFields } from './ninja';
import { ambushChance, chooseFire, doActivity, morning, rollNight, serveFood, spendHitDie, startCamp, startShortStop, stopActivity } from './rest';
import { hashString, mulberry32, rngFor } from './rng';

const ninja = (over: Partial<ShinobiCharacter>): ShinobiCharacter => ({
  ...DEFAULT_CHARACTER,
  effects: [],
  ...over,
});

const ok = <T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> => {
  assert.ok(r.ok, `expected ok, got: ${(r as { reason?: string }).reason}`);
  return r as Extract<T, { ok: true }>;
};

describe('dice', () => {
  it('parses notation with its bonus (the old parser dropped it)', () => {
    assert.deepEqual(parseDice('2d8+3'), { count: 2, sides: 8, bonus: 3 });
    assert.deepEqual(parseDice('d6'), { count: 1, sides: 6, bonus: 0 });
    assert.deepEqual(parseDice('3d6-1'), { count: 3, sides: 6, bonus: -1 });
    assert.deepEqual(parseDice('5'), { count: 0, sides: 0, bonus: 5 });
    assert.equal(parseDice('banana'), null);
    assert.equal(formatDice({ count: 2, sides: 8, bonus: 3 }), '2d8+3');
  });

  it('rolls the same with the same seed and keys, and differently with other keys', () => {
    const a = rollDice(rngFor(42, 'node', 'n1'), '4d6').rolls;
    const b = rollDice(rngFor(42, 'node', 'n1'), '4d6').rolls;
    const c = rollDice(rngFor(42, 'node', 'n2'), '4d6').rolls;
    assert.deepEqual(a, b);
    assert.notDeepEqual(a, c);
    assert.notEqual(hashString('a'), hashString('b'));
  });

  it('keeps every die in range', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 500; i++) {
      const r = rollDice(rng, '1d20');
      assert.ok(r.total >= 1 && r.total <= 20);
    }
  });
});

describe('checks', () => {
  it('knows the chance before rolling', () => {
    assert.equal(successChance(0, 11), 0.5);
    assert.equal(successChance(0, 11, 'advantage'), 0.75);
    assert.equal(successChance(0, 11, 'disadvantage'), 0.25);
    assert.equal(successChance(0, 30), 0);
    assert.equal(successChance(0, 30, 'none', true), 0.05, 'a natural 20 always hits');
    assert.equal(successChance(50, 10, 'none', true), 0.95, 'a natural 1 always misses');
  });

  it('counts the d20 as 10 in the no-randomness mode', () => {
    const r = rollCheck(null, 3, 13);
    assert.equal(r.total, 13);
    assert.equal(r.success, true);
  });

  it('gives proficiency by level', () => {
    assert.deepEqual([1, 4, 5, 8, 9, 13, 17].map(proficiencyBonus), [2, 2, 3, 3, 4, 5, 6]);
  });

  it('takes Exhaustion and effects into account', () => {
    const c = ninja({ stats: { str: 10, dex: 14, con: 12, int: 10, wis: 14, cha: 10 }, level: 1, shinobiClass: 'Medical Specialist' });
    assert.equal(skillModifier(c, 'medicine'), 2 + 2);
    assert.equal(skillModifier({ ...c, exhaustion: 2 }, 'medicine'), 4 - 4);
    const crashed = { ...c, effects: addEffect([], 'crash').effects };
    assert.equal(skillModifier(crashed, 'medicine'), 2);
    assert.equal(saveModifier(c, 'wis'), 2 + 2, 'Medical is proficient in WIS saves');
    assert.equal(saveModifier(c, 'dex'), 2);
  });
});

describe('derived stats', () => {
  it('match the old creator formula at levels 1–4 and use proficiency by level after', () => {
    const b = { level: 3, stats: { str: 10, dex: 14, con: 14, int: 16, wis: 10, cha: 8 }, clan: 'Mirai' as const, shinobiClass: 'Ninjutsu Specialist' as const, armor: 'Leaf Chunin Flak' as const, feats: [] };
    const d = deriveStats(b);
    assert.equal(d.maxHp, 8 + 2 + 2 * (4 + 1 + 2));
    assert.equal(d.maxChakra, 3 * (6 + 2) + 2);
    assert.equal(d.jutsuSaveDC, 8 + 2 + 3);
    assert.equal(deriveStats({ ...b, level: 6 }).jutsuSaveDC, 8 + 3 + 3);
  });
});

describe('clans', () => {
  it('old clan names load as the new ones', () => {
    for (const old of ['Uddo', 'Senju']) assert.equal(migrateClan(old), 'Ryusei');
    for (const old of ['Akkai', 'Uzumaki']) assert.equal(migrateClan(old), 'Koton');
    for (const old of ['Taki', 'Hyuga']) assert.equal(migrateClan(old), 'Northstar');
    for (const old of ['Uchiha', 'Mirai']) assert.equal(migrateClan(old), 'Mirai');
    // The shown name loads too, whichever way its accent was written.
    assert.equal(migrateClan('Kōton'.normalize('NFC')), 'Koton');
    assert.equal(migrateClan('Kōton'.normalize('NFD')), 'Koton');
    assert.equal(migrateClan('Nope'), null);
    const old = ninja({ clan: 'Taki' as ShinobiCharacter['clan'], currentHp: 7, maxHp: 50 });
    const now = migrateCharacter(old);
    assert.equal(now.clan, 'Northstar');
    assert.equal(now.currentHp, 7);
    assert.equal(now.maxHp, 50);
    assert.equal(migrateCharacter(ninja({ clan: 'Nope' as ShinobiCharacter['clan'] })).clan, DEFAULT_CHARACTER.clan);
  });

  it('derived stats carry no old clan bonus', () => {
    const b = { level: 4, stats: { str: 10, dex: 14, con: 14, int: 16, wis: 10, cha: 8 }, shinobiClass: 'Ninjutsu Specialist' as const, armor: 'Leaf Chunin Flak' as const, feats: [] };
    const all = (['Mirai', 'Koton', 'Ryusei', 'Northstar'] as const).map((clan) => deriveStats({ ...b, clan }));
    for (const d of all) {
      assert.equal(d.maxHp, all[0].maxHp);
      assert.equal(d.maxChakra, all[0].maxChakra);
    }
  });

  it('only Watchful prevents surprise', () => {
    assert.equal(cannotBeSurprised(ninja({ clan: 'Northstar' })), false);
    assert.equal(cannotBeSurprised(ninja({ effects: addEffect([], 'watchful').effects })), true);
  });
});

describe('effects', () => {
  it('refresh instead of stacking', () => {
    let fx = addEffect([], 'sharpened').effects;
    fx = endBattle(fx).effects;
    assert.equal(fx[0].remaining, 2);
    const again = addEffect(fx, 'sharpened');
    assert.equal(again.change, 'refreshed');
    assert.equal(again.effects.length, 1);
    assert.equal(again.effects[0].remaining, 3);
  });

  it('run out by rounds, battles, zones and camps', () => {
    let fx = addEffect([], 'burning').effects;
    fx = tickRound(fx).effects;
    assert.equal(fx.length, 1);
    assert.deepEqual(tickRound(fx).expired, ['burning']);

    const watch = addEffect([], 'watchful').effects;
    assert.deepEqual(endBattle(watch).expired, ['watchful']);

    // An until-camp effect gained after camp 1 lasts through camp 2's night and expires that morning;
    // one gained during camp 2 lasts until camp 3.
    const fromRoad = addEffect([], 'poisoned', { campNo: 1 }).effects;
    const atCamp2 = addEffect(fromRoad, 'well_fed', { campNo: 2 }).effects;
    const after = morningAfter(atCamp2, 2);
    assert.deepEqual(after.expired, ['poisoned']);
    assert.deepEqual(after.effects.map((e) => e.id), ['well_fed']);
  });

  it('are cured by the right treatment and sum their numbers', () => {
    const fx = [...addEffect([], 'bleeding').effects, ...addEffect([], 'poisoned').effects];
    assert.deepEqual(treat(fx, 'bandage').removed, ['bleeding']);
    assert.equal(effectMods(addEffect([], 'fall_aftermath').effects).ac, -2);
    assert.equal(effectMods([{ id: 'breakdown', detail: 'despair' }]).saves, -2);
  });
});

describe('tension and exhaustion', () => {
  const dice = { rng: mulberry32(1) };

  it('Encouraged takes 1 off the next gain and is used up', () => {
    const c = ninja({ tension: 3, effects: addEffect([], 'encouraged').effects });
    const r = changeTension(c, 2, 'test', dice);
    assert.equal(r.character.tension, 4);
    assert.equal(r.character.effects?.length, 0);
  });

  it('at 10, a WIS save gives Breakdown or Awakening and Tension goes back to 5', () => {
    const low = ninja({ tension: 9, stats: { ...DEFAULT_CHARACTER.stats, wis: 1 } });
    const r = changeTension(low, 1, 'test', { rng: mulberry32(3), noRandomness: true });
    assert.equal(r.character.tension, 5);
    assert.ok(r.character.effects?.some((e) => e.id === 'breakdown'), 'WIS 1 with the d20 as 10 fails DC 12');

    const high = ninja({ tension: 9, stats: { ...DEFAULT_CHARACTER.stats, wis: 20 } });
    const r2 = changeTension(high, 3, 'test', { rng: mulberry32(3), noRandomness: true });
    assert.ok(r2.character.effects?.some((e) => e.id === 'will_of_fire'));
  });

  it('reaching 10 again gives Exhaustion instead, never past 5 this way', () => {
    const c = ninja({ tension: 9, exhaustion: 5, effects: [{ id: 'breakdown', detail: 'panic' }] });
    const r = changeTension(c, 1, 'test', dice);
    assert.equal(r.character.exhaustion, 5);
    assert.equal(r.character.tension, 5);
    const r2 = changeTension({ ...c, exhaustion: 2 }, 1, 'test', dice);
    assert.equal(r2.character.exhaustion, 3);
  });

  it('Exhaustion 6 knocks the ninja out', () => {
    const r = changeExhaustion(ninja({ exhaustion: 5 }), 1, 'test');
    assert.equal(r.character.exhaustion, 6);
    assert.ok(r.events.some((e) => e.type === 'unconscious'));
  });
});

describe('camp', () => {
  const mirai = ninja({ id: 'a', name: 'Ren', clan: 'Mirai', shinobiClass: 'Ninjutsu Specialist', level: 4, currentHp: 10, currentChakra: 5 });
  const ryusei = ninja({ id: 'b', name: 'Saber', clan: 'Ryusei', shinobiClass: 'Taijutsu Master', level: 4, currentHp: 20, currentChakra: 30, tension: 4 });
  const northstar = ninja({ id: 'c', name: 'Hana', clan: 'Northstar', shinobiClass: 'Medical Specialist', level: 4 });
  const site = { nodeId: 'clearing', zoneDanger: 30 };
  const base = (): PartyState => newMission([mirai, ryusei, northstar], { seed: 99 });

  it('works through the steps and shows the moon %', () => {
    let s = ok(startCamp(base(), site));
    assert.equal(s.party.supplies.campKits, 1);
    s = ok(chooseFire(s.party, s.state, 'bonfire', 'a'));
    assert.equal(s.party.supplies.campKits, 1, 'Katon fire saves the kit');
    s = ok(doActivity(s.party, s.state, 'b', 'wood_shelter'));
    assert.equal(ambushChance(s.party, s.state), 25, '30 + bonfire 10 − Wood shelter 15');
    s = ok(doActivity(s.party, s.state, 'c', 'keep_watch'));
    assert.equal(ambushChance(s.party, s.state), 12, 'the guard halves it');
  });

  it('spends incense and refuses what a ninja cannot do', () => {
    let s = ok(startCamp(base(), site));
    s = ok(chooseFire(s.party, s.state, 'low'));
    assert.equal(doActivity(s.party, s.state, 'a', 'wood_shelter').ok, false, 'Ryusei only');
    s = ok(doActivity(s.party, s.state, 'a', 'meditate'));
    assert.equal(doActivity(s.party, s.state, 'a', 'meditate').ok, false, 'once per camp');
    assert.equal(doActivity(s.party, s.state, 'a', 'train_jutsu').ok, false, '2 + 2 sticks > 3');
    s = ok(doActivity(s.party, s.state, 'a', 'sharpen'));
    assert.equal(s.state.sticksUsed.a, 3);
    assert.equal(doActivity(s.party, s.state, 'a', 'fireside_talk', { target: 'a' }).ok, false, 'talk to someone else');
  });

  it('meditation, bandages and talks do what the tables say', () => {
    let s = ok(startCamp(base(), site));
    s = ok(chooseFire(s.party, s.state, 'low'));
    const chakraBefore = s.party.members[0].currentChakra;
    s = ok(doActivity(s.party, s.state, 'a', 'meditate'));
    assert.equal(s.party.members[0].currentChakra, chakraBefore + Math.floor(mirai.maxChakra / 4));
    s = ok(doActivity(s.party, s.state, 'c', 'bandage', { target: 'a' }));
    assert.equal(s.party.supplies.bandages, 2);
    assert.ok(s.party.members[0].currentHp > 10);
    s = ok(doActivity(s.party, s.state, 'c', 'fireside_talk', { target: 'b' }));
    assert.equal(s.party.members[1].tension, 3);
    assert.equal(s.party.bonds['b|c'], 1);
  });

  it('feeds the party, rolls the night and recovers in the morning', () => {
    const tired = ninja({ ...mirai, hitDiceSpent: 3, chakraDiceSpent: 1, exhaustion: 2, effects: addEffect([], 'crash', { campNo: 0 }).effects });
    let s = ok(startCamp(newMission([tired, northstar], { seed: 5 }), site));
    s = ok(chooseFire(s.party, s.state, 'low'));
    assert.equal(serveFood(s.party, s.state, 'feast').ok, false, 'a feast needs a hunt');
    s = ok(serveFood(s.party, s.state, 'hot'));
    assert.equal(s.party.supplies.rations, 6);
    s = ok(rollNight(s.party, s.state));
    s = ok(morning(s.party, s.state, { interrupted: false }));
    const m = s.party.members[0];
    assert.equal(m.currentHp, Math.min(m.maxHp, 10 + Math.floor(m.maxHp / 2)));
    assert.equal(m.hitDiceSpent, 0, '3 spent: 2 back (half rounded up) + 1 for the hot meal');
    assert.equal(m.chakraDiceSpent, 0);
    assert.equal(m.exhaustion, 1, 'a camp with food takes one level');
    assert.ok(!m.effects?.some((e) => e.id === 'crash'), 'until-camp effects from before expire');
    assert.equal(s.party.progress.hoursSinceCamp, 0);
  });

  it('a night without food or fire hurts', () => {
    let s = ok(startCamp(base(), { ...site, cold: true }));
    s = ok(chooseFire(s.party, s.state, 'none'));
    s = ok(serveFood(s.party, s.state, 'none'));
    const b = s.party.members[1];
    assert.equal(b.tension, 4 + 2 + 1);
    assert.equal(b.exhaustion, 1);
    assert.ok(b.effects?.some((e) => e.id === 'hungry'));
    assert.ok(b.effects?.some((e) => e.id === 'numb'));
  });

  it('an untreated wound turns into Fever in the morning, and Fever blocks HP from rests', () => {
    const hurt = ninja({ ...mirai, effects: addEffect([], 'bleeding').effects });
    let s = ok(startCamp(newMission([hurt], { seed: 3 }), site));
    s = ok(chooseFire(s.party, s.state, 'low'));
    s = ok(serveFood(s.party, s.state, 'dry'));
    s = ok(rollNight(s.party, s.state));
    s = ok(morning(s.party, s.state));
    assert.ok(s.party.members[0].effects?.some((e) => e.id === 'fever'));
    assert.equal(spendHitDie(s.party, 'a').ok, false);
  });

  it('counts the ambush in the no-randomness mode', () => {
    let s = ok(startCamp(newMission([mirai], { seed: 1, noRandomness: true, supplies: { campKits: 3 } }), { ...site, zoneDanger: 60 }));
    s = ok(chooseFire(s.party, s.state, 'low'));
    s = ok(serveFood(s.party, s.state, 'dry'));
    s = ok(rollNight(s.party, s.state));
    assert.equal(s.state.night?.ambush, false);
    assert.equal(s.party.progress.ambushCounter, 60);
    let t = ok(startCamp(s.party, { ...site, nodeId: 'cave', zoneDanger: 60 }));
    t = ok(chooseFire(t.party, t.state, 'low'));
    t = ok(serveFood(t.party, t.state, 'dry'));
    t = ok(rollNight(t.party, t.state));
    assert.equal(t.state.night?.ambush, true, '60 + 60 ≥ 100');
    assert.equal(t.party.progress.ambushCounter, 20);
  });
});

describe('short stop and the road', () => {
  const a = ninja({ id: 'a', name: 'Ren', level: 3, currentHp: 5, effects: addEffect([], 'bleeding').effects });

  it('one stop per zone; Hit Dice heal; bandage at the stop', () => {
    let p = newMission([a], { seed: 11 });
    const stop = ok(startShortStop(p));
    assert.equal(startShortStop(stop.party).ok, false);
    p = ok(spendHitDie(stop.party, 'a')).party;
    assert.ok(p.members[0].currentHp > 5);
    assert.equal(hitDiceLeft(p.members[0]), 2);
    const r = ok(stopActivity(p, stop.state, 'a', 'bandage'));
    assert.ok(!r.party.members[0].effects?.some((e) => e.id === 'bleeding'));
    assert.equal(stopActivity(r.party, r.state, 'a', 'bandage').ok, false, 'one activity per stop');
    assert.equal(stopActivity(r.party, stop.state, 'a', 'meditate').ok, false, 'no chakra at a stop');
  });

  it('bleeding hurts on the road and hours raise the night danger', () => {
    const p = newMission([a], { seed: 11 });
    const r = travelLeg(p, 'n1', 8);
    assert.ok(r.party.members[0].currentHp < 5);
    let s = ok(startCamp(r.party, { nodeId: 'x', zoneDanger: 30 }));
    s = ok(chooseFire(s.party, s.state, 'low'));
    assert.equal(ambushChance(s.party, s.state), 40, '8 hours: +10 %');
    const z = enterNextZone(p);
    assert.equal(z.party.progress.zone, 1);
  });
});

describe('battle results and the village', () => {
  it('fold HP, Tension, falls and pills back into the party', () => {
    const a = ninja({ id: 'a', name: 'Ren', tension: 2, effects: addEffect([], 'sharpened').effects });
    const b = ninja({ id: 'b', name: 'Saber', tension: 2 });
    const p = newMission([a, b], { seed: 4 });
    const r = applyBattleResult(
      p,
      { victory: true, members: [{ id: 'a', hp: 0, chakra: 3, critsTaken: 1, fell: true, fellToCrit: true }, { id: 'b', hp: 30, chakra: 10, pillsTaken: 2 }] },
      'river',
    );
    const [ra, rb] = r.party.members;
    assert.equal(ra.currentHp, 1, 'stabilized by the party: someone is still standing');
    assert.equal(r.wholePartyFell, false);
    assert.ok(ra.effects?.some((e) => e.id === 'fall_aftermath'));
    assert.ok(ra.effects?.some((e) => e.id === 'grave_wound'));
    assert.equal(ra.tension, 2 + 1 - 1);
    assert.equal(ra.effects?.find((e) => e.id === 'sharpened')?.remaining, 2);
    assert.equal(rb.tension, 2 + 1 - 1, 'an ally fell, but they won');
    assert.ok(rb.effects?.some((e) => e.id === 'crash'));
    assert.equal(rb.exhaustion, 1, 'two pills: one too many');
  });

  it('rolls death saves to the end', () => {
    const seq = (...v: number[]) => {
      let i = 0;
      return () => v[i++];
    };
    // rollDie(rng, 20) = 1 + floor(r * 20): 0.45 → 10, 0.3 → 7, 0 → 1, 0.97 → 20.
    assert.deepEqual(rollDeathSaves({ rng: seq(0.45, 0.3, 0.45, 0.45) }), { result: 'stable', rolls: [10, 7, 10, 10] });
    assert.deepEqual(rollDeathSaves({ rng: seq(0, 0.3) }), { result: 'dead', rolls: [1, 7] }, 'a natural 1 counts twice');
    assert.deepEqual(rollDeathSaves({ rng: seq(0.3, 0.97) }), { result: 'revived', rolls: [7, 20] });
    assert.deepEqual(rollDeathSaves({ rng: seq(0.97, 0.3, 0.45, 0.45, 0.45, 0.45, 0.97, 0.45) }, true), { result: 'stable', rolls: [7, 10, 10, 10] }, 'disadvantage keeps the lower die');
    assert.equal(rollDeathSaves({ rng: seq(), noRandomness: true }).result, 'stable');
  });

  it('Legend: when the whole party falls, death saves decide; the dead leave and the leader passes on', () => {
    const a = ninja({ id: 'a', name: 'Ren' });
    const b = ninja({ id: 'b', name: 'Saber' });
    let leaderDied = false;
    let allDied = false;
    for (let seed = 1; seed < 400 && !(leaderDied && allDied); seed++) {
      const p = newMission([a, b], { seed, difficulty: 'legend' });
      const r = applyBattleResult(p, { victory: false, members: [{ id: 'a', hp: 0, chakra: 0, fell: true }, { id: 'b', hp: 0, chakra: 0, fell: true }] }, 'gorge');
      assert.equal(r.wholePartyFell, true);
      assert.equal(r.events.filter((e) => e.type === 'death_saves').length, 2);
      assert.equal(r.party.members.length + r.party.dead.length, 2);
      for (const m of r.party.members) {
        assert.equal(m.currentHp, 1, 'survivors wake up with 1 HP');
        assert.ok(m.effects?.some((e) => e.id === 'fall_aftermath'));
      }
      assert.equal(r.gameOver, r.party.members.length === 0);
      if (r.party.dead.some((d) => d.id === 'a') && r.party.members.length === 1) {
        leaderDied = true;
        assert.equal(r.party.leaderId, 'b');
      }
      if (r.gameOver) allDied = true;
    }
    assert.ok(leaderDied && allDied, 'some seed kills the leader only, another the whole party');
  });

  it('Story and Normal: a lost ambush wakes everyone up and costs half of the supplies', () => {
    const p = newMission([ninja({ id: 'a' }), ninja({ id: 'b' })], { seed: 8, supplies: { rations: 5, bandages: 1 } });
    const r = applyBattleResult(p, { victory: false, members: [{ id: 'a', hp: 0, chakra: 0, fell: true }, { id: 'b', hp: 0, chakra: 4, fell: true }] }, 'night', { ambush: true });
    assert.equal(r.gameOver, false);
    assert.deepEqual(r.party.members.map((m) => m.currentHp), [1, 1]);
    assert.equal(r.party.supplies.rations, 3);
    assert.equal(r.party.supplies.bandages, 1, 'half of 1, rounded down, is nothing');
    assert.equal(r.party.dead.length, 0);
  });

  it('battle-reported effects replace the old ones; companions on the flank never drop below 1 HP', () => {
    const a = ninja({ id: 'a', name: 'Ren', effects: addEffect([], 'poisoned').effects });
    const b = ninja({ id: 'b', name: 'Saber', currentHp: 3 });
    const p = newMission([a, b], { seed: 21 });
    const wear = flankWear(p, 'ford', ['a'], { threat: 1.5, venom: true });
    assert.deepEqual(wear, flankWear(p, 'ford', ['a'], { threat: 1.5, venom: true }), 'seeded');
    assert.deepEqual(wear.map((w) => w.id), ['b']);
    assert.ok(wear[0].hp >= 1 && wear[0].hp <= 3);
    const r = applyBattleResult(p, { victory: true, members: [{ id: 'a', hp: 20, chakra: 5, effects: addEffect([], 'bleeding', { source: 'Kunai' }).effects }, ...wear] }, 'ford');
    const ra = r.party.members[0];
    assert.deepEqual(ra.effects?.map((e) => e.id), ['bleeding']);
    assert.ok(r.events.some((e) => e.type === 'effect' && e.who === 'a' && e.effect === 'bleeding' && e.change === 'added' && e.reason === 'Kunai'));
    assert.ok(r.events.some((e) => e.type === 'effect' && e.who === 'a' && e.effect === 'poisoned' && e.change === 'removed'));
  });

  it('a soldier pill gives 2d6 chakra and leaves Crash after the battle', () => {
    const a = ninja({ id: 'a', name: 'Ren', currentChakra: 0 });
    const p = newMission([a], { seed: 2, supplies: { soldierPills: 1 } });
    const r = ok(takeSoldierPill(p, 'a', 'b1'));
    const gained = r.party.members[0].currentChakra;
    assert.ok(gained >= 2 && gained <= 12);
    assert.equal(r.party.supplies.soldierPills, 0);
    assert.equal(takeSoldierPill(r.party, 'a', 'b1', 1).ok, false, 'none left');
    assert.equal(takeSoldierPill(newMission([ninja({ id: 'f' })], { seed: 2 }), 'f', 'b1').ok, false, 'full chakra');
    const after = applyBattleResult(r.party, { victory: true, members: [{ id: 'a', hp: 30, chakra: 3, pillsTaken: 1 }] }, 'b1');
    assert.ok(after.party.members[0].effects?.some((e) => e.id === 'crash'));
    assert.equal(after.party.members[0].exhaustion ?? 0, 0, 'one pill is fine');
  });

  it('the village restores everything and turns a Breakdown into a trait', () => {
    const c = ninja({ currentHp: 3, tension: 7, exhaustion: 2, hitDiceSpent: 2, effects: [{ id: 'breakdown', detail: 'panic' }], scars: ['scar_grave_wound'] });
    const r = returnToVillage(c).character;
    assert.equal(r.currentHp, r.maxHp);
    assert.equal(r.tension, 0);
    assert.equal(r.exhaustion, 0);
    assert.deepEqual(r.effects, []);
    assert.deepEqual(r.traits, ['trait_panic']);
    assert.deepEqual(r.scars, ['scar_grave_wound']);
  });

  it('cleans mission fields from an imported sheet', () => {
    const dirty = { ...DEFAULT_CHARACTER, tension: 42, exhaustion: -3, effects: [{ id: 'nope' }, { id: 'poisoned', sinceCamp: 2 }], conviction: ['clan_honour', 'x', 'protect_innocents', 'seek_truth'] } as unknown as ShinobiCharacter;
    const clean = sanitizeMissionFields(dirty);
    assert.equal(clean.tension, 10);
    assert.equal(clean.exhaustion, 0);
    assert.deepEqual(clean.effects, [{ id: 'poisoned', sinceCamp: 2 }]);
    assert.deepEqual(clean.conviction, ['clan_honour', 'protect_innocents']);
  });
});
