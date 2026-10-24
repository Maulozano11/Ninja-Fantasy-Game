// The wandering old doctor on the road (the owner's way C to Seal Needles, 2026-10-24; docs/
// MISSION_DESIGN.md, "The wandering doctor"): an old doctor with a hurt leg who knows where platinum
// needles block chakra. Help him and he teaches one ninja Seal Needles and leaves platinum senbon;
// it can teach a ninja of any class. His choices: the scene and the price; our proposal: the numbers.
// Pure: the dice come from the mission's seed (no Math.random).

import type { ShinobiCharacter } from '../types/shinobi';
import type { PartyState, RuleEvent } from '../types/mission';
import { skillCheck } from '../rules/checks';
import { checkRng, rngFor } from '../rules/rng';
import { DOCTOR_PLATINUM, knowsSealNeedles, learnSealNeedles } from '../rules/sealNeedles';

/** The Medicine check (WIS) to set his leg: the student makes it. */
export const DOCTOR_DC = 13;

export type DoctorChoice = 'antidote' | 'treat' | 'leave';

export interface DoctorResult {
  party: PartyState;
  events: RuleEvent[];
  /** What happened, for the scene's last line. */
  ending: 'taught' | 'thanks' | 'left';
}

/** Why a choice can't be taken (null: it can). */
export function doctorBlocker(party: PartyState, choice: DoctorChoice, who: string | undefined): string | null {
  if (choice === 'leave') return null;
  const c = party.members.find((m) => m.id === who);
  if (!c) return 'Pick who learns';
  if (knowsSealNeedles(c)) return 'Already knows Seal Needles';
  if (choice === 'antidote' && party.supplies.antidotes < 1) return 'Missing supplies';
  return null;
}

const teach = (party: PartyState, who: string, events: RuleEvent[]): PartyState => {
  const members = party.members.map((m) => {
    if (m.id !== who) return m;
    const l = learnSealNeedles(m, 'the old doctor');
    events.push(...l.events);
    return l.character;
  });
  const left = party.supplies.platinumSenbon + DOCTOR_PLATINUM;
  events.push({ type: 'supplies', item: 'platinumSenbon', delta: DOCTOR_PLATINUM, left, reason: 'A gift from the old doctor' });
  return { ...party, members, supplies: { ...party.supplies, platinumSenbon: left } };
};

/**
 * The party's answer to the old doctor:
 * - 'antidote': an antidote for the venom in his leg: he teaches `who` (no roll), and leaves 3
 *   platinum senbon.
 * - 'treat': `who` sets his leg: a Medicine check (WIS, DC 13). Success: as the antidote, and a
 *   natural 20 earns a healing potion too. Failure: he thanks them for trying and leaves 1 platinum
 *   senbon (no dead end), but teaches nothing.
 * - 'leave': the party walks on.
 */
export function answerDoctor(party: PartyState, nodeId: string, choice: DoctorChoice, who?: string): DoctorResult {
  const why = doctorBlocker(party, choice, who);
  if (why) return { party, events: [{ type: 'note', text: why }], ending: 'left' };
  const events: RuleEvent[] = [];
  if (choice === 'leave') return { party, events: [{ type: 'note', text: 'The party walks on past the old doctor' }], ending: 'left' };
  if (choice === 'antidote') {
    const left = party.supplies.antidotes - 1;
    events.push({ type: 'supplies', item: 'antidotes', delta: -1, left, reason: 'Given to the old doctor' });
    return { party: teach({ ...party, supplies: { ...party.supplies, antidotes: left } }, who!, events), events, ending: 'taught' };
  }
  const student = party.members.find((m) => m.id === who) as ShinobiCharacter;
  const rng = rngFor(party.progress.seed, 'scene', nodeId, who!);
  const outcome = skillCheck(checkRng({ rng, noRandomness: party.progress.noRandomness }), student, 'medicine', DOCTOR_DC);
  events.push({ type: 'check', who: who!, what: 'Set the doctor\'s leg (Medicine)', outcome });
  if (!outcome.success) {
    const left = party.supplies.platinumSenbon + 1;
    events.push({ type: 'supplies', item: 'platinumSenbon', delta: 1, left, reason: 'A gift from the old doctor' });
    return { party: { ...party, supplies: { ...party.supplies, platinumSenbon: left } }, events, ending: 'thanks' };
  }
  let p = teach(party, who!, events);
  // The owner's rule (C3): a natural 20 earns an extra: a healing potion from the doctor's bag.
  if (outcome.natural20) {
    const left = p.supplies.healingPotions + 1;
    events.push({ type: 'supplies', item: 'healingPotions', delta: 1, left, reason: 'A gift from the old doctor' });
    p = { ...p, supplies: { ...p.supplies, healingPotions: left } };
  }
  return { party: p, events, ending: 'taught' };
}
