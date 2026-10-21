// The flow of a battle: initiative when the fighting starts, the start and end of each unit's turn
// (death saves, bleeding, the hydra growing heads back), rounds, and the end.

import { abilityMod, cannotBeSurprised } from '../rules/checks';
import { removeEffect, tickRound } from '../rules/effects';
import { rollDie } from '../rules/rng';
import type { BattleEvent, BattleState, Unit } from './types';
import { homeTeam } from './types';
import { check, damage, deathSave, nextRng, releaseCommand, rollDiceExpr } from './combat';
import { waterAtPt } from './map';
import { planEnemy, replanAgainst } from './intent';

/** Whether a unit takes turns (heads of the hydra act on their own; fallen ninjas roll death saves). */
const takesTurns = (u: Unit): boolean => u.down !== 'dead' && u.down !== 'fled' && u.down !== 'ko' && u.down !== 'stable';

export const current = (s: BattleState): Unit | undefined => s.units[s.order[s.turn]];

/** Rolls initiative (d20 + DEX) and starts the fighting; `surprised` units lose their first turn. */
export function startCombat(s: BattleState, ev: BattleEvent[], by: string | undefined, surprised: string[]): void {
  s.phase = 'combat';
  s.round = 1;
  const rolls: Record<string, number> = {};
  const units = Object.values(s.units).filter((u) => takesTurns(u));
  for (const u of units) {
    if (u.kind === 'hydra_head') continue;
    const r = check(s, 'initiative', abilityMod(u.stats.dex) + (u.effects.some((e) => e.id === 'watchful') ? 2 : 0), 0);
    rolls[u.id] = r.total + abilityMod(u.stats.dex) / 100;
  }
  // Heads act right after their body, in order.
  for (const u of units) if (u.kind === 'hydra_head' && u.head) rolls[u.id] = (rolls[u.head.body] ?? 0) - 0.001 * (u.head.index + 1);
  s.initiative = rolls;
  s.order = Object.keys(rolls).sort((a, b) => rolls[b] - rolls[a]);
  for (const id of surprised) {
    const u = s.units[id];
    // Watchful ninjas are never caught unaware.
    if (u && takesTurns(u) && !(u.character && cannotBeSurprised(u.character))) u.cond.surprised = true;
  }
  for (const u of Object.values(s.units)) {
    if (u.guard) u.guard.alerted = true;
    if (u.team === 'party') u.cond.crouched = u.cond.hidden !== undefined ? u.cond.crouched : false;
    // A warp edge from the stealth phase isn't carried into the fight.
    if (u.cond.warpEdge) u.cond.warpEdge = false;
  }
  ev.push({ t: 'combatStart', by, surprised: surprised.filter((id) => s.units[id]?.cond.surprised) });
  ev.push({ t: 'initiative', order: [...s.order], rolls });
  // Every enemy commits to its first move (a Mirai can read it).
  for (const u of Object.values(s.units)) if (u.team === 'enemy') commitPlan(s, u, ev);
  s.turn = 0;
  beginTurn(s, ev);
}

/** Starts the turn of the unit at s.turn, skipping those who can't act. */
export function beginTurn(s: BattleState, ev: BattleEvent[]): void {
  for (let guard = 0; guard < s.order.length * 2 + 2; guard++) {
    if (checkEnd(s, ev)) return;
    const u = current(s);
    if (!u || !takesTurns(u) || (u.head && u.head.severed && !headRegrows(s, u, ev))) {
      advance(s, ev);
      continue;
    }
    u.turn = { move: u.speed, action: true, bonus: true, reaction: true, moved: 0 };
    u.cond.dodging = false;
    // The Breeze Mantle lasts until the start of its next turn: the screen hears it end.
    if (u.cond.mantle) {
      u.cond.mantle = false;
      ev.push({ t: 'condition', unit: u.id, cond: 'mantle', on: false });
    }
    u.cond.focusing = false;
    u.cond.disengaged = false;
    u.cond.waterWalk = false;
    u.cond.ninjaJump = false;
    ev.push({ t: 'turn', unit: u.id, round: s.round });
    if (u.down === 'downed') {
      deathSave(s, u, ev);
      if (u.down) {
        advance(s, ev);
        continue;
      }
      u.turn.move = u.speed / 2;
    }
    if (u.cond.surprised) {
      u.cond.surprised = false;
      u.turn.action = false;
      u.turn.bonus = false;
      u.turn.move = 0;
      ev.push({ t: 'note', key: 'surprisedSkip', params: { name: u.name } });
      // A turn lost to surprise is still one of its turns under a Command.
      if (u.commanded && spendCommandTurn(s, u, ev)) commitPlan(s, u, ev);
      advance(s, ev);
      continue;
    }
    // Water puts out the flames; wounds hurt at the start of a turn.
    if (waterAtPt(s, u.pos) > 0 && u.effects.some((e) => e.id === 'burning')) {
      u.effects = removeEffect(u.effects, 'burning');
      ev.push({ t: 'effect', unit: u.id, effect: 'burning', on: false });
    }
    if (u.effects.some((e) => e.id === 'bleeding')) damage(s, u, rollDie(nextRng(s), 4), 'Slashing', {}, ev);
    if (u.effects.some((e) => e.id === 'burning')) damage(s, u, rollDie(nextRng(s), 6), 'Fire', {}, ev);
    if (u.down) {
      advance(s, ev);
      continue;
    }
    // Confused: one turn in four is lost to the illusion.
    if (u.effects.some((e) => e.id === 'confused') && rollDie(nextRng(s), 4) === 1) {
      u.turn.action = false;
      ev.push({ t: 'note', key: 'confusedLoses', params: { name: u.name } });
    }
    return;
  }
}

/**
 * A severed head misses its next turns (HEAD_REGROW) and grows back on the one after, unless its
 * stump was sealed with fire, lightning or an explosion.
 */
function headRegrows(s: BattleState, u: Unit, ev: BattleEvent[]): boolean {
  const h = u.head!;
  if (h.sealed) return false;
  const body = s.units[h.body];
  if (!body || body.down) return false;
  if (h.regrowIn > 0) {
    h.regrowIn -= 1;
    return false;
  }
  h.severed = false;
  u.hp = u.maxHp;
  ev.push({ t: 'regrow', unit: u.id });
  return true;
}

/** Ends the current unit's turn and starts the next one. */
export function endTurn(s: BattleState, ev: BattleEvent[]): void {
  const u = current(s);
  if (u) {
    const tick = tickRound(u.effects);
    u.effects = tick.effects;
    for (const id of tick.expired) ev.push({ t: 'effect', unit: u.id, effect: id, on: false });
    if (u.cond.hidden !== undefined && !u.cond.crouched) u.cond.hidden = undefined;
    // A warp edge not struck with is gone.
    if (u.cond.warpEdge) u.cond.warpEdge = false;
    if (u.commanded) spendCommandTurn(s, u, ev);
    // An enemy commits to its next move now, so a Mirai can read it.
    if (u.team === 'enemy') commitPlan(s, u, ev);
  }
  advance(s, ev);
  beginTurn(s, ev);
}

/** An enemy commits to its next move and the screen hears of it (a Mirai can read it). */
function commitPlan(s: BattleState, u: Unit, ev: BattleEvent[]): void {
  planEnemy(s, u);
  if (u.intent) ev.push({ t: 'intent', unit: u.id, intent: u.intent });
}

/**
 * One of a commanded unit's turns is spent. When its turns under the Command run out it goes back
 * to its own side (true), and the enemies who planned against it plan again.
 */
function spendCommandTurn(s: BattleState, u: Unit, ev: BattleEvent[]): boolean {
  u.commanded!.rounds -= 1;
  if (u.commanded!.rounds > 0) return false;
  releaseCommand(u, ev);
  replanAgainst(s, u.id, ev);
  return true;
}

function advance(s: BattleState, ev: BattleEvent[]): void {
  s.turn += 1;
  if (s.turn >= s.order.length) {
    s.turn = 0;
    s.round += 1;
    ev.push({ t: 'round', round: s.round });
    // Water barriers fade.
    s.walls = s.walls.filter((w) => {
      if (w.rounds === undefined) return true;
      w.rounds -= 1;
      if (w.rounds > 0) return true;
      ev.push({ t: 'wall', wall: w, on: false });
      return false;
    });
    // Gales on the ground die down.
    if (s.zones?.length)
      s.zones = s.zones.filter((z) => {
        z.rounds -= 1;
        if (z.rounds > 0) return true;
        ev.push({ t: 'zone', zone: z, on: false });
        return false;
      });
  }
}

/**
 * The battle ends when one side has nobody left standing (or the party fled). Sides are the ones
 * units belong to: an enemy fighting for the party under a Command is still to be beaten, and a
 * beast that joined the party doesn't keep it in the fight on its own.
 */
export function checkEnd(s: BattleState, ev: BattleEvent[]): boolean {
  if (s.phase === 'ended') return true;
  const enemies = Object.values(s.units).filter((u) => homeTeam(u) === 'enemy' && u.kind !== 'hydra_head');
  const party = Object.values(s.units).filter((u) => homeTeam(u) === 'party' && !u.joined);
  let outcome: BattleState['outcome'];
  if (enemies.every((u) => u.down)) outcome = 'victory';
  else if (party.every((u) => u.down)) outcome = party.some((u) => u.down === 'fled') ? 'fled' : 'defeat';
  if (!outcome) return false;
  s.phase = 'ended';
  s.outcome = outcome;
  ev.push({ t: 'end', outcome });
  return true;
}

export { rollDiceExpr };
