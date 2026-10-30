// Enemies of any level (the owner, 2026-10-29): the shipped templates stop at level 6, and the fire
// avatar's steps come at levels 9 and 12, so a battle can raise its ninja enemies to a level of its own.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HANA, KENJI } from '../data/missions';
import { createBattle } from './engine';
import { encounterSetup } from './encounters';
import { enemyCharacter, enemyUnit } from './units';

const supplies = { soldierPills: 0, bandages: 0, antidotes: 0, explosiveTags: 0 };
const party = [HANA, KENJI].map((character) => ({ character, controller: 'ai' as const, aiOrder: 'aggressive' as const }));

describe('enemies at another level', () => {
  it('keep their template level unless one is given', () => {
    assert.equal(enemyCharacter('rogue', 0).level, 3);
    assert.equal(enemyCharacter('jonin', 0).level, 6);
  });

  it('grow with the level: more HP and chakra, a bigger jutsu attack (proficiency)', () => {
    const at = (level?: number) => enemyCharacter('rogue', 0, { level });
    const l3 = at(), l9 = at(9), l12 = at(12);
    assert.equal(l9.level, 9);
    assert.equal(l12.level, 12);
    assert.ok(l3.maxHp < l9.maxHp && l9.maxHp < l12.maxHp, `HP ${l3.maxHp} < ${l9.maxHp} < ${l12.maxHp}`);
    assert.ok(l3.maxChakra < l9.maxChakra && l9.maxChakra < l12.maxChakra);
    assert.ok(l9.jutsuAttackBonus > l3.jutsuAttackBonus, `jutsu attack ${l3.jutsuAttackBonus} -> ${l9.jutsuAttackBonus}`);
    assert.equal(l12.currentHp, l12.maxHp, 'fresh');
  });

  it('keep their clan, rank and look', () => {
    const u = enemyUnit('hunter', 0, { x: 5, z: 5 }, 'normal', { level: 12, clan: 'Northstar', rank: 'captain' });
    assert.equal(u.character!.level, 12);
    assert.equal(u.character!.clan, 'Northstar');
    assert.equal(u.rank, 'captain');
    assert.deepEqual(u.character!.appearance, enemyCharacter('hunter', 0).appearance);
  });

  it('come from an encounter raised to a level; without one it is as shipped', () => {
    const shipped = createBattle(encounterSetup('cedar_rogues', party, { seed: 1, difficulty: 'normal', supplies })).state;
    const raised = createBattle(encounterSetup('cedar_rogues', party, { seed: 1, difficulty: 'normal', supplies, enemyLevel: 9 })).state;
    const enemies = (s: typeof shipped) => Object.values(s.units).filter((u) => u.team === 'enemy');
    assert.ok(enemies(shipped).every((u) => u.character!.level < 9));
    assert.ok(enemies(raised).length > 0 && enemies(raised).every((u) => u.character!.level === 9));
    for (const u of enemies(raised)) {
      const was = enemies(shipped).find((v) => v.id === u.id)!;
      assert.ok(u.maxHp > was.maxHp, `${u.id}: ${was.maxHp} -> ${u.maxHp}`);
    }
  });

  it('leave the hydra as it is', () => {
    const a = createBattle(encounterSetup('hydra', party, { seed: 1, difficulty: 'normal', supplies })).state;
    const b = createBattle(encounterSetup('hydra', party, { seed: 1, difficulty: 'normal', supplies, enemyLevel: 12 })).state;
    const hp = (s: typeof a) => Object.values(s.units).filter((u) => u.team === 'enemy').map((u) => u.maxHp);
    assert.deepEqual(hp(b), hp(a));
  });
});
