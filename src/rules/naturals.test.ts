// The owner's dice rules (docs/GAMEPLAY_DESIGN.md "Dice", docs/MISSION_DESIGN.md): a critical does
// maximum damage, and a natural 20 or 1 decides an attack, a save or a check, with an extra on a
// natural 20 for the mission's checks.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import type { ShinobiCharacter } from '../types/shinobi';
import { rollCheck, savingThrow, skillCheck, successChance } from './checks';
import { maxCritDamage } from './dice';
import { newMission } from './mission';
import { chooseFire, doActivity, HUNT_CRIT_RATIONS, startCamp } from './rest';
import { mulberry32 } from './rng';

const ninja = (over: Partial<ShinobiCharacter>): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...over });

const ok = <T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> => {
  assert.ok(r.ok, `expected ok, got: ${(r as { reason?: string }).reason}`);
  return r as Extract<T, { ok: true }>;
};

/** Rolls with seeds 1.. until `want` says this roll is the one, and returns it. */
function rollUntil<T>(roll: (seed: number) => T, want: (r: T) => boolean): T {
  for (let seed = 1; seed < 2000; seed++) {
    const r = roll(seed);
    if (want(r)) return r;
  }
  throw new Error('no seed gives that roll');
}

describe('maximum damage on a critical', () => {
  it('every die at its highest face, the doubled dice too, the bonus once', () => {
    assert.equal(maxCritDamage('2d6+3'), 27, 'the owner\'s example: 4 × 6 + 3');
    assert.equal(maxCritDamage('1d8+3'), 19, 'a katana: 8 + 8 + 3');
    assert.equal(maxCritDamage('8d6'), 96);
    assert.equal(maxCritDamage('1d4-5'), 3);
    assert.equal(maxCritDamage('nonsense'), 0);
  });
});

describe('natural 20 and natural 1', () => {
  it('decide attacks, saves and checks whatever the total (natural on), and only the total without it', () => {
    const twenty = rollUntil((seed) => rollCheck(mulberry32(seed), -10, 30, 'none', true), (o) => o.natural20);
    assert.equal(twenty.success, true, 'a natural 20 succeeds against DC 30 with −10');
    const one = rollUntil((seed) => rollCheck(mulberry32(seed), 50, 5, 'none', true), (o) => o.natural1);
    assert.equal(one.success, false, 'a natural 1 fails against DC 5 with +50');
    // Death saves and initiative count only the total.
    assert.equal(rollUntil((seed) => rollCheck(mulberry32(seed), -10, 30), (o) => o.natural20).success, false);
    // The % shown before rolling counts them too.
    assert.equal(successChance(-10, 30, 'none', true), 0.05);
    assert.equal(successChance(50, 5, 'none', true), 0.95);
  });

  it('a mission check and a save (the Tension save) follow the rule', () => {
    const c = ninja({ id: 'a', stats: { ...DEFAULT_CHARACTER.stats, wis: 1 } });
    assert.equal(rollUntil((seed) => skillCheck(mulberry32(seed), c, 'survival', 40), (o) => o.natural20).success, true);
    const wise = ninja({ id: 'a', stats: { ...DEFAULT_CHARACTER.stats, wis: 30 } });
    assert.equal(rollUntil((seed) => savingThrow(mulberry32(seed), wise, 'wis', 2), (o) => o.natural1).success, false);
  });
});

describe('a natural 20 at camp gives an extra (C3)', () => {
  const site = { nodeId: 'clearing', zoneDanger: 30 };
  const hunter = ninja({ id: 'a', name: 'Ren', clan: 'Mirai', shinobiClass: 'Ninjutsu Specialist', level: 4 });
  const medic = ninja({ id: 'c', name: 'Hana', clan: 'Northstar', shinobiClass: 'Medical Specialist', level: 4 });
  const patient = ninja({ id: 'b', name: 'Saber', clan: 'Ryusei', shinobiClass: 'Taijutsu Master', level: 4, currentHp: 5 });

  const camp = (seed: number) => {
    const s = ok(startCamp(newMission([hunter, patient, medic], { seed }), site));
    return ok(chooseFire(s.party, s.state, 'low'));
  };
  const checkOf = (r: { events: { type: string }[] }) => r.events.find((e) => e.type === 'check') as unknown as { outcome: { natural20: boolean; natural1: boolean; success: boolean } };

  it('hunt: a natural 20 brings back 2 rations; another success does not', () => {
    const great = rollUntil((seed) => {
      const s = camp(seed);
      return { before: s.party.supplies.rations, r: ok(doActivity(s.party, s.state, 'a', 'hunt')) };
    }, (x) => checkOf(x.r).outcome.natural20);
    assert.equal(great.r.party.supplies.rations, great.before + HUNT_CRIT_RATIONS);
    assert.equal(great.r.state.huntSucceeded, true);
    const plain = rollUntil((seed) => {
      const s = camp(seed);
      return { before: s.party.supplies.rations, r: ok(doActivity(s.party, s.state, 'a', 'hunt')) };
    }, (x) => checkOf(x.r).outcome.success && !checkOf(x.r).outcome.natural20);
    assert.equal(plain.r.party.supplies.rations, plain.before);
  });

  it('field surgery: a natural 20 also heals the patient 1d6 HP', () => {
    const great = rollUntil((seed) => ok(doActivity(camp(seed).party, camp(seed).state, 'c', 'field_surgery', { target: 'b' })), (r) => checkOf(r).outcome.natural20);
    const hp = great.party.members.find((m) => m.id === 'b')!.currentHp;
    assert.ok(hp >= 6 && hp <= 11, `5 HP + 1d6, got ${hp}`);
    const plain = rollUntil((seed) => ok(doActivity(camp(seed).party, camp(seed).state, 'c', 'field_surgery', { target: 'b' })), (r) => checkOf(r).outcome.success && !checkOf(r).outcome.natural20);
    assert.equal(plain.party.members.find((m) => m.id === 'b')!.currentHp, 5);
  });
});
