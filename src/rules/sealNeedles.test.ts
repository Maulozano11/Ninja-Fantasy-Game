// Tests for Seal Needles' learning and its platinum senbon (the owner, 2026-10-24: "d y c haremos que
// las senbos sean de platino que en nuestro lore tiene propiedades de bloquar el chakra o energia"):
// npm test. The camp study (way D), the save field and the backpack; the old doctor (way C) is
// src/game/doctorScene.test.ts, the battle src/battle/sealNeedles.test.ts.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import type { ShinobiCharacter } from '../types/shinobi';
import { ACTIVITY } from '../data/campActivities';
import { newMission } from './mission';
import { chooseFire, doActivity, startCamp } from './rest';
import type { Outcome } from './rest';
import { ANATOMY_CAMPS, knowsSealNeedles, PLATINUM_POUCH, SEAL_NEEDLES, studyAnatomy, withPlatinum } from './sealNeedles';
import { migrateCharacter, sanitizeMissionFields } from './ninja';

const ninja = (over: Partial<ShinobiCharacter> = {}): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...over });
const ok = <S>(o: Outcome<S>) => {
  assert.ok(o.ok, o.ok ? '' : o.reason);
  return o as Extract<Outcome<S>, { ok: true }>;
};

describe('Study anatomy (Estudiar anatomía), the camp way to Seal Needles', () => {
  it('is a medic\'s camp activity of 2 incense sticks, done on oneself', () => {
    const a = ACTIVITY.study_anatomy;
    assert.equal(a.nameEs, 'Estudiar anatomía');
    assert.equal(a.sticks, 2);
    assert.equal(a.requires?.shinobiClass, 'Medical Specialist');
    assert.equal(a.target, 'self');
  });

  it('three camps, in any camps, teach Seal Needles; the count is kept on the sheet', () => {
    assert.equal(ANATOMY_CAMPS, 3);
    let c = ninja({ anatomyStudy: undefined });
    for (let k = 1; k < ANATOMY_CAMPS; k++) {
      c = studyAnatomy(c).character;
      assert.equal(c.anatomyStudy, k);
      assert.ok(!knowsSealNeedles(c));
    }
    const last = studyAnatomy(c);
    assert.ok(knowsSealNeedles(last.character));
    assert.deepEqual(last.character.abilities, [SEAL_NEEDLES]);
    assert.ok(last.events.some((e) => e.type === 'note' && /learns Seal Needles/.test(e.text)));
    assert.equal(studyAnatomy(last.character).character, last.character, 'nothing more to learn');
  });

  it('done at camp by a medic, refused to another class', () => {
    const medic = ninja({ id: 'm', name: 'Hana', shinobiClass: 'Medical Specialist', level: 4 });
    const other = ninja({ id: 'o', name: 'Ren', shinobiClass: 'Ninjutsu Specialist', level: 4 });
    let s = ok(startCamp(newMission([medic, other], { seed: 3 }), { nodeId: 'clearing', zoneDanger: 30 }));
    s = ok(chooseFire(s.party, s.state, 'low'));
    assert.equal(doActivity(s.party, s.state, 'o', 'study_anatomy').ok, false);
    s = ok(doActivity(s.party, s.state, 'm', 'study_anatomy'));
    assert.equal(s.party.members.find((m) => m.id === 'm')!.anatomyStudy, 1);
    assert.equal(doActivity(s.party, s.state, 'm', 'study_anatomy').ok, false, 'once a camp');
  });

  it('old sheets without the fields load as before; the fields survive a load', () => {
    const old = ninja();
    delete (old as Partial<ShinobiCharacter>).abilities;
    delete (old as Partial<ShinobiCharacter>).anatomyStudy;
    const m = migrateCharacter(sanitizeMissionFields(old));
    assert.ok(!knowsSealNeedles(m));
    assert.equal(m.anatomyStudy ?? 0, 0);
    const kept = migrateCharacter(sanitizeMissionFields(ninja({ abilities: [SEAL_NEEDLES], anatomyStudy: 3 })));
    assert.ok(knowsSealNeedles(kept));
    assert.equal(kept.anatomyStudy, 3);
    const bad = sanitizeMissionFields(ninja({ abilities: [7 as unknown as string, SEAL_NEEDLES], anatomyStudy: -4 }));
    assert.deepEqual(bad.abilities, [SEAL_NEEDLES]);
    assert.equal(bad.anatomyStudy, 0);
  });
});

describe('platinum senbon in the backpack', () => {
  it('each ninja who knows Seal Needles brings 3 when a mission sets out', () => {
    assert.equal(PLATINUM_POUCH, 3);
    const a = ninja({ id: 'a', abilities: [SEAL_NEEDLES] });
    const b = ninja({ id: 'b' });
    assert.equal(newMission([a, b], { seed: 1 }).supplies.platinumSenbon, 3);
    assert.equal(newMission([b], { seed: 1 }).supplies.platinumSenbon, 0);
    assert.deepEqual(withPlatinum({ platinumSenbon: 1 }, [a, { ...a, id: 'c' }]), { platinumSenbon: 7 });
  });
});
