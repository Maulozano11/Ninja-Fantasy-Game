// What a finished battle hands back to the mission: each ninja's HP, chakra, effects and battle
// bookkeeping (criticals, falls, soldier pills, Tension), the supplies left, and what became of
// each enemy (dead, knocked out for questioning, fled).

import type { BattleMemberResult, BattleResult } from '../rules/mission';
import type { BattleOutcome, BattleState, BattleSupplies } from './types';

export interface PartyBattleResult extends BattleResult {
  outcome: BattleOutcome;
  supplies: BattleSupplies;
  enemies: { id: string; name: string; state: 'dead' | 'ko' | 'fled' | 'standing' }[];
  rounds: number;
}

export function battleResult(s: BattleState): PartyBattleResult {
  const members: BattleMemberResult[] = Object.values(s.units)
    .filter((u) => u.team === 'party')
    .map((u) => ({
      id: u.id,
      hp: u.down && u.down !== 'fled' ? 0 : u.hp,
      chakra: u.chakra,
      critsTaken: u.stats2.critsTaken,
      critsLanded: u.stats2.critsLanded,
      pillsTaken: u.stats2.pills,
      fell: u.stats2.fell,
      fellToCrit: u.stats2.fellToCrit,
      died: u.down === 'dead',
      effects: u.effects,
      tension: u.stats2.tension,
    }));
  const enemies = Object.values(s.units)
    .filter((u) => u.team === 'enemy' && u.kind !== 'hydra_head')
    .map((u) => ({ id: u.id, name: u.name, state: (u.down === 'dead' || u.down === 'ko' || u.down === 'fled' ? u.down : 'standing') as 'dead' | 'ko' | 'fled' | 'standing' }));
  const outcome = s.outcome ?? 'defeat';
  return { victory: outcome === 'victory', members, outcome, supplies: { ...s.supplies }, enemies, rounds: s.round };
}
