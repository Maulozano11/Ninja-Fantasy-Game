// Tests for the wandering old doctor (the owner's way C to Seal Needles, 2026-10-24): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { HANA, KENJI, RIVER_FOREST_PATROL } from '../data/missions';
import type { ShinobiCharacter } from '../types/shinobi';
import type { PartyState } from '../types/mission';
import { newMission } from '../rules/mission';
import { knowsSealNeedles, SEAL_NEEDLES } from '../rules/sealNeedles';
import { answerDoctor, DOCTOR_DC, doctorBlocker } from './doctorScene';
import { answerScene, continueRoad, startRun } from './missionRun';

const hero = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, id: 'hero', name: 'Aki', effects: [], ...over });
const party = (seed = 1): PartyState => newMission([hero(), { ...KENJI, effects: [] }], { seed });

describe('the old doctor', () => {
  it('an antidote: he teaches the one chosen, no roll, and leaves 3 platinum senbon', () => {
    const p = party();
    const r = answerDoctor(p, 'old_doctor', 'antidote', 'hero');
    assert.equal(r.ending, 'taught');
    assert.ok(knowsSealNeedles(r.party.members.find((m) => m.id === 'hero')));
    assert.equal(r.party.supplies.antidotes, p.supplies.antidotes - 1);
    assert.equal(r.party.supplies.platinumSenbon, p.supplies.platinumSenbon + 3);
    assert.ok(!r.events.some((e) => e.type === 'check'));
  });

  it('a non-medic can learn it from him', () => {
    const r = answerDoctor(party(), 'old_doctor', 'antidote', KENJI.id);
    assert.notEqual(KENJI.shinobiClass, 'Medical Specialist');
    assert.ok(knowsSealNeedles(r.party.members.find((m) => m.id === KENJI.id)));
  });

  it('setting his leg: a Medicine check, DC 13; success teaches, failure leaves 1 platinum senbon', () => {
    assert.equal(DOCTOR_DC, 13);
    let taught = 0, thanked = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const p = party(seed);
      const r = answerDoctor(p, 'old_doctor', 'treat', 'hero');
      const check = r.events.find((e) => e.type === 'check');
      assert.ok(check && check.type === 'check' && check.outcome.dc === 13);
      if (check.outcome.success) {
        taught++;
        assert.equal(r.ending, 'taught');
        assert.ok(knowsSealNeedles(r.party.members[0]));
        assert.equal(r.party.supplies.antidotes, p.supplies.antidotes, 'no antidote spent');
      } else {
        thanked++;
        assert.equal(r.ending, 'thanks');
        assert.ok(!knowsSealNeedles(r.party.members[0]));
        assert.equal(r.party.supplies.platinumSenbon, 1);
      }
    }
    assert.ok(taught > 0 && thanked > 0);
  });

  it('refused: nobody chosen, one who knows it already, no antidote; walking on is always open', () => {
    const p = party();
    assert.ok(doctorBlocker(p, 'treat', undefined));
    const knows = { ...p, members: p.members.map((m) => (m.id === 'hero' ? { ...m, abilities: [SEAL_NEEDLES] } : m)) };
    assert.ok(doctorBlocker(knows, 'antidote', 'hero'));
    assert.ok(doctorBlocker({ ...p, supplies: { ...p.supplies, antidotes: 0 } }, 'antidote', 'hero'));
    assert.equal(doctorBlocker(p, 'leave', undefined), null);
    assert.equal(answerDoctor(p, 'old_doctor', 'leave').ending, 'left');
  });

  it('is a scene on the Cedar Road after the rogues; answering it finishes the node, and what he taught comes home', () => {
    const node = RIVER_FOREST_PATROL.zones[0].nodes[1];
    assert.equal(node.kind, 'scene');
    let run = startRun(RIVER_FOREST_PATROL, 'hero', [hero(), HANA], { seed: 4, leaderId: 'hero', difficulty: 'normal', noRandomness: false });
    run = continueRoad({ ...run, nodeDone: true });
    assert.equal(run.pos.node, 1);
    assert.equal(run.nodeDone, false);
    run = answerScene(run, 'antidote', 'hero');
    assert.equal(run.nodeDone, true);
    assert.ok(knowsSealNeedles(run.party.members.find((m) => m.id === 'hero')));
  });
});
