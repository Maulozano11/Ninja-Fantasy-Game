// Tests for the round 1 jutsu staging (stagePlan.ts; the defects found playing them in the game):
// npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { BattleEvent } from '../../battle/types';
import { CRESCENT, VORTEX_CLEAR, crescentFrame, crescentStart, effectLands, vortexAt } from './stagePlan';

const roll = { d20: 15, mod: 2, total: 17, dc: 14, success: true } as never;

describe('round 1 jutsu staging', () => {
  it('closes the seal circle only on a target that was sealed', () => {
    const sealed: BattleEvent[] = [
      { t: 'save', unit: 'b', what: 'adamantine_sealing_chains', roll },
      { t: 'effect', unit: 'b', effect: 'chakra_sealed', on: true },
    ];
    const resisted: BattleEvent[] = [{ t: 'save', unit: 'b', what: 'adamantine_sealing_chains', roll }];
    assert.equal(effectLands(sealed, 'chakra_sealed'), true);
    assert.equal(effectLands(resisted, 'chakra_sealed'), false);
    // A later jutsu's seal is not this one's.
    const later: BattleEvent[] = [{ t: 'jutsu', unit: 'a', jutsu: 'x', at: { x: 0, z: 0 }, shape: null, enhanced: false }, ...sealed];
    assert.equal(effectLands(later, 'chakra_sealed'), false);
  });

  it('opens the Nirvana vortex clear of the caster, whatever the distance', () => {
    for (const facing of [1, -1]) {
      for (let d = 0; d <= 12; d += 0.5) {
        const caster = { x: 10, z: 10 };
        const c = { x: 10 + facing * d, z: 10 };
        const v = vortexAt(c, 3, caster, facing);
        assert.ok(Math.abs(v.x - caster.x) >= VORTEX_CLEAR - 1e-9, `facing ${facing}, ${d} m: ${v.x}`);
      }
    }
    // Far enough, it stays on the caster's side, as approved.
    assert.deepEqual(vortexAt({ x: 20, z: 10 }, 3, { x: 10, z: 10 }, 1), { x: 15.8, z: 10 });
  });

  it('sends each crescent on the cut, not in the wind-up, and every blow shows its cut', () => {
    assert.equal(crescentFrame(0), 0, 'a blow starts on the wind-up');
    assert.equal(crescentFrame(CRESCENT.STRIKE), 1, 'the crescent leaves on the cut');
    assert.equal(crescentFrame(CRESCENT.BLOW - 1), 1, 'the cut holds until the next blow');
  });

  it('starts the hurricane crescents in front of the ninja, toward each one', () => {
    const from = { x: 10, z: 10 };
    const s = crescentStart(from, { x: 11.5, z: 10 });
    assert.ok(Math.abs(s.x - 10.75) < 1e-9, 'half way to one 1.5 m off');
    assert.ok(Math.abs(crescentStart(from, { x: 14, z: 10 }).x - 10.8) < 1e-9, '0.8 m out toward one further off');
    const back = crescentStart(from, { x: 7, z: 10 });
    assert.ok(back.x < from.x - 0.5, 'toward one behind');
    assert.ok(Math.hypot(s.x - from.x, s.z - from.z) > 0.5);
  });
});
