// Tests for the mission flow: npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER } from '../data/shinobiData';
import { HANA, KENJI, RIVER_FOREST_PATROL } from '../data/missions';
import type { Difficulty } from '../types/mission';
import type { PartyBattleResult } from '../battle/result';
import { chooseFire, doActivity, rollNight, serveFood, startCamp, startShortStop } from '../rules/rest';
import { applyOutcome, continueRoad, intoNextZone, MissionRun, newBattle, resolvePartyBattle, startRun } from './missionRun';

const hero = { ...DEFAULT_CHARACTER, id: 'hero', name: 'Solen' };

const begin = (difficulty: Difficulty = 'normal', seed = 7): MissionRun =>
  startRun(RIVER_FOREST_PATROL, 'hero', [hero, HANA, KENJI], { seed, leaderId: 'hero', difficulty, noRandomness: false });

/** What the battle map hands back: everyone's HP (0 = fell), chakra and the supplies left. */
const result = (r: MissionRun, outcome: PartyBattleResult['outcome'], hp: number | ((id: string) => number), o: { chakra?: number; pills?: number } = {}): PartyBattleResult => {
  const hpOf = (id: string) => (typeof hp === 'number' ? hp : hp(id));
  const s = r.party.supplies;
  return {
    victory: outcome === 'victory',
    outcome,
    members: r.party.members.map((m) => ({ id: m.id, hp: hpOf(m.id), chakra: o.chakra ?? 5, fell: hpOf(m.id) === 0 })),
    supplies: { soldierPills: o.pills ?? s.soldierPills, bandages: s.bandages, antidotes: s.antidotes, explosiveTags: s.explosiveTags },
    enemies: [],
    rounds: 3,
  };
};
const fight = (r: MissionRun, outcome: PartyBattleResult['outcome'], hp: number | ((id: string) => number), o?: { chakra?: number; pills?: number }) => resolvePartyBattle(r, result(r, outcome, hp, o));

const ok = <T extends { ok: boolean }>(o: T): Extract<T, { ok: true }> => {
  assert.ok(o.ok, (o as { reason?: string }).reason);
  return o as Extract<T, { ok: true }>;
};

describe('mission flow', () => {
  it('starts at the first node with its battle on the map', () => {
    const r = begin();
    assert.equal(r.battle?.id, 'cedar_rogues');
    assert.equal(r.battle?.battle.encounter, 'cedar_rogues');
    assert.equal(r.party.progress.hoursSpent, 3);
    assert.ok(r.log[0].text.includes('sets out'));
  });

  it('a victory folds in the whole party; the node is done', () => {
    const r = fight(begin(), 'victory', (id) => (id === 'hero' ? 20 : 15), { chakra: 4 });
    assert.equal(r.battle, null);
    assert.equal(r.nodeDone, true);
    const [solen, hana, kenji] = r.party.members;
    assert.equal(solen.currentHp, 20);
    assert.equal(hana.currentHp, 15);
    assert.equal(kenji.currentChakra, 4);
    assert.equal(r.stats.battlesWon, 1);
    assert.ok(r.log.some((l) => l.text.startsWith('Victory')));
  });

  it('a fallen ally wakes after the victory with 1 HP and Fall aftermath', () => {
    const r = fight(begin(), 'victory', (id) => (id === 'hero' ? 0 : 12));
    const [solen, hana] = r.party.members;
    assert.equal(solen.currentHp, 1);
    assert.ok(solen.effects?.some((e) => e.id === 'fall_aftermath'));
    assert.equal(hana.currentHp, 12);
    assert.equal(r.stats.falls, 1);
  });

  it('supplies used in battle are spent, and pills leave Crash', () => {
    const start = begin();
    const r = resolvePartyBattle(start, {
      ...result(start, 'victory', 20, { pills: start.party.supplies.soldierPills - 1 }),
      members: start.party.members.map((m) => ({ id: m.id, hp: 20, chakra: 9, pillsTaken: m.id === 'hero' ? 1 : 0 })),
    });
    assert.equal(r.party.supplies.soldierPills, start.party.supplies.soldierPills - 1);
    assert.ok(r.party.members[0].effects?.some((e) => e.id === 'crash'));
  });

  it('Normal: when everyone falls the battle starts over from the node', () => {
    const start = begin();
    const r = fight(start, 'defeat', 0);
    assert.equal(r.battle?.phase, 'prep');
    assert.equal(r.battle?.attempt, 0);
    assert.deepEqual(r.party, start.entry);
    assert.equal(r.stats.retries, 1);
  });

  it('Legend: when everyone falls, death saves; survivors go on, or the game is over', () => {
    let sawGameOver = false;
    let sawSurvivors = false;
    for (let seed = 1; seed < 200 && !(sawGameOver && sawSurvivors); seed++) {
      const r = fight(begin('legend', seed), 'defeat', 0);
      if (r.outcome === 'gameOver') {
        sawGameOver = true;
        assert.equal(r.party.members.length, 0);
      } else {
        sawSurvivors = true;
        assert.equal(r.nodeDone, true);
        assert.ok(r.party.members.every((m) => m.currentHp === 1));
        assert.equal(r.party.members.length + r.party.dead.length, 3);
      }
    }
    assert.ok(sawGameOver && sawSurvivors);
  });

  it('the road: zone end, short stop, next zone, camp, ambush and an interrupted morning', () => {
    let r = fight(begin(), 'victory', 30);
    r = continueRoad(r);
    assert.equal(r.zoneEnd, true);
    r = applyOutcome(r, ok(startShortStop(r.party)), (x, stop) => ({ ...x, stop }));
    assert.deepEqual(r.party.progress.stopsTaken, [0]);
    r = intoNextZone(r);
    assert.equal(r.pos.zone, 1);
    assert.equal(r.battle?.id, 'ford_skirmish');
    assert.equal(r.battle?.battle.encounter, 'river_patrol');
    assert.equal(r.party.progress.zone, 1);
    r = continueRoad(fight(r, 'victory', 25));
    assert.equal(r.pos.node, 1, 'the shrine clearing');

    // A camp with a bonfire and no guard in a dangerous zone; force the raid by rolling until it comes.
    let camped: MissionRun | null = null;
    for (let seed = 1; seed < 60 && !camped; seed++) {
      let c = { ...r, party: { ...r.party, progress: { ...r.party.progress, seed } } };
      c = applyOutcome(c, ok(startCamp(c.party, { nodeId: 'shrine_clearing', zoneDanger: 30, shrine: true })), (x, camp) => ({ ...x, camp }));
      c = applyOutcome(c, ok(chooseFire(c.party, c.camp!, 'bonfire')), (x, camp) => ({ ...x, camp }));
      c = applyOutcome(c, ok(doActivity(c.party, c.camp!, HANA.id, 'pray')), (x, camp) => ({ ...x, camp }));
      c = applyOutcome(c, ok(serveFood(c.party, c.camp!, 'hot')), (x, camp) => ({ ...x, camp }));
      c = applyOutcome(c, ok(rollNight(c.party, c.camp!)), (x, camp) => ({ ...x, camp }));
      if (c.camp?.night?.ambush) camped = c;
    }
    assert.ok(camped, 'some seed brings the raid');
    let a: MissionRun = { ...camped!, battle: newBattle('shrine_clearing:ambush', RIVER_FOREST_PATROL.ambush, camped!.party, { ambush: true }) };
    const before = a.party.members.map((m) => m.currentHp);
    a = fight(a, 'victory', (id) => (id === HANA.id ? 0 : 10));
    assert.equal(a.battle, null);
    assert.equal(a.camp?.morningDone, true, 'the raid ends in an interrupted morning');
    assert.ok(a.party.members[1].currentHp >= 1);
    assert.ok(a.log.some((l) => l.text === 'An interrupted morning'));
    assert.notDeepEqual(a.party.members.map((m) => m.currentHp), before);
  });

  it('the objective ends the mission', () => {
    const hydra = RIVER_FOREST_PATROL.zones[1].nodes[2];
    assert.ok(hydra.kind === 'battle' && hydra.objective);
    let r = begin();
    r = { ...r, pos: { zone: 1, node: 2 }, battle: newBattle(hydra.id, hydra.battle, r.party, { objective: true }) };
    r = continueRoad(fight(r, 'victory', 9));
    assert.equal(r.outcome, 'complete');
  });

  it('a retreat gives up the node, or the mission at the objective', () => {
    const r = fight(begin(), 'fled', 12);
    assert.equal(r.nodeDone, true);
    assert.equal(r.outcome, 'ongoing');
    const hydra = RIVER_FOREST_PATROL.zones[1].nodes[2];
    assert.ok(hydra.kind === 'battle');
    let h = begin();
    h = { ...h, pos: { zone: 1, node: 2 }, battle: newBattle(hydra.id, hydra.battle, h.party, { objective: true }) };
    assert.equal(fight(h, 'fled', 10).outcome, 'failed');
  });

  it('Legend: losing the objective fails the mission', () => {
    for (let seed = 1; seed < 100; seed++) {
      let r = begin('legend', seed);
      r = { ...r, pos: { zone: 1, node: 2 }, battle: newBattle('hydra_den', RIVER_FOREST_PATROL.ambush, r.party, { objective: true }) };
      r = fight(r, 'defeat', 0);
      if (r.outcome === 'gameOver') continue;
      assert.equal(r.outcome, 'failed');
      return;
    }
    assert.fail('no seed left survivors');
  });
});
