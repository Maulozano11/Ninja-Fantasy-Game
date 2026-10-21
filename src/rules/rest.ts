// Rests (docs/MISSION_DESIGN.md): the short stop between zones and the camp, step by step:
// set up, fire, activities, food, night (ambush) and morning. Pure functions over plain data:
// each step returns the new party and camp state plus what happened, or why it can't be done.

import { ACTIVITY, ActivityId, CampActivity, STICKS_PER_CAMP } from '../data/campActivities';
import { clanName, JUTSUS_DATA, SHINOBI_CLASSES } from '../data/shinobiData';
import type { JutsuDefinition, ShinobiCharacter } from '../types/shinobi';
import type { PartyState, RuleEvent, SupplyId } from '../types/mission';
import { abilityMod, abilityScores, skillCheck } from './checks';
import { effectiveMaxHp } from './derived';
import { rollDice } from './dice';
import { effectMods, hasEffect, morningAfter, treat } from './effects';
import { changeChakra, changeExhaustion, changeHp, changeTension, chakraDiceLeft, giveEffect, hitDiceLeft, isUnconscious, Step } from './ninja';
import { checkRng, Dice, pick, rngFor, rollDie } from './rng';

export type FireLevel = 'none' | 'low' | 'bonfire';
export type FoodLevel = 'none' | 'dry' | 'hot' | 'feast';

/** The campsite: the road node it is on and what is there. */
export interface CampSite {
  nodeId: string;
  /** Base night danger of the zone, in %. */
  zoneDanger: number;
  /** Cold zone: no fire also gives Numb. */
  cold?: boolean;
  shrine?: boolean;
}

export interface CampState {
  site: CampSite;
  /** Number of this camp in the mission (1 for the first). */
  campNo: number;
  fire?: FireLevel;
  /** The Mirai who makes the bonfire with Katon fire. */
  katonBy?: string;
  done: { who: string; activity: ActivityId; target?: string; option?: string }[];
  sticksUsed: Record<string, number>;
  huntSucceeded: boolean;
  bells: boolean;
  /** Perimeter traps set tonight. */
  traps: ('tag' | 'wire')[];
  /** A ninja in Breakdown refuses one activity, crossed out before choosing. */
  refused: Record<string, ActivityId>;
  food?: FoodLevel;
  night?: { chance: number; ambush: boolean };
  morningDone?: boolean;
}

export interface StopState {
  zone: number;
  /** Ninjas who already did their one activity at this stop. */
  acted: string[];
}

export type Outcome<S> = { ok: true; party: PartyState; state: S; events: RuleEvent[] } | { ok: false; reason: string };

const fail = (reason: string): { ok: false; reason: string } => ({ ok: false, reason });

const member = (party: PartyState, id: string): ShinobiCharacter | undefined => party.members.find((m) => m.id === id);

function withMember(party: PartyState, id: string, f: (c: ShinobiCharacter) => Step, events: RuleEvent[]): PartyState {
  return {
    ...party,
    members: party.members.map((m) => {
      if (m.id !== id) return m;
      const r = f(m);
      events.push(...r.events);
      return r.character;
    }),
  };
}

function spend(party: PartyState, item: SupplyId, n: number, reason: string, events: RuleEvent[]): PartyState {
  const left = party.supplies[item] - n;
  events.push({ type: 'supplies', item, delta: -n, left, reason });
  return { ...party, supplies: { ...party.supplies, [item]: left } };
}

const diceFor = (party: PartyState, ...keys: (string | number)[]): Dice => ({
  rng: rngFor(party.progress.seed, ...keys),
  noRandomness: party.progress.noRandomness,
});

export const bondKey = (a: string, b: string): string => [a, b].sort().join('|');

/** The healing jutsu a ninja has equipped, if any. */
export function healingJutsuOf(c: ShinobiCharacter): JutsuDefinition | undefined {
  const ids = Object.values(c.selectedJutsus);
  return JUTSUS_DATA.find((j) => ids.includes(j.id) && j.damageType === 'Healing');
}

const isDown = (c: ShinobiCharacter): boolean => c.currentHp <= 0 || isUnconscious(c);

// --- activities ---------------------------------------------------------------------------

const HEALING_ACTIVITIES: ActivityId[] = ['bandage', 'heal_jutsu', 'shared_vitality', 'peaceful_sleep'];

/**
 * Why `who` can't do `act` on `target` right now, or null if they can. `stop` is set at a short
 * stop (one healing activity, no sticks).
 */
export function activityBlocker(
  party: PartyState,
  camp: CampState | null,
  who: string,
  act: CampActivity,
  opts: { target?: string; option?: string } = {},
): string | null {
  const c = member(party, who);
  if (!c) return 'Unknown ninja';
  if (isDown(c)) return 'Cannot act';
  if (act.viaFire) return 'Chosen with the fire';
  if (!camp && !act.atStop) return 'Camp only';
  if (act.requires?.clan && c.clan !== act.requires.clan) return `${clanName(act.requires.clan)} only`;
  if (act.requires?.shinobiClass && c.shinobiClass !== act.requires.shinobiClass) return `${act.requires.shinobiClass} only`;
  if (act.requires?.shrine && !camp?.site.shrine) return 'Needs a shrine';
  if (camp) {
    if (camp.refused[who] === act.id) return 'Refused (Breakdown)';
    if (camp.done.some((d) => d.who === who && d.activity === act.id)) return 'Already done tonight';
    if ((camp.sticksUsed[who] ?? 0) + act.sticks > STICKS_PER_CAMP) return 'Not enough incense';
    if (camp.food) return 'Too late: dinner is served';
  }
  if (act.supplies) {
    const options = opts.option ? act.supplies.filter((s) => s === supplyFor(opts.option)) : act.supplies;
    if (!options.some((s) => party.supplies[s] > 0)) return 'Missing supplies';
  }
  if (act.chakra === 'jutsu') {
    const j = healingJutsuOf(c);
    if (!j) return 'No healing jutsu';
    if (c.currentChakra < j.chakraCost) return 'Not enough chakra';
    if (effectMods(c.effects).noJutsu) return 'Chakra sealed';
  }
  if (act.chakra === 'quarterMax' && c.currentChakra < Math.ceil(c.maxChakra / 4)) return 'Not enough chakra';
  if (act.target === 'other' && (!opts.target || opts.target === who)) return 'Choose another ninja';
  const t = opts.target ? member(party, opts.target) : c;
  if (!t) return 'Unknown target';
  if (HEALING_ACTIVITIES.includes(act.id) && t.id !== who && hasEffect(t.effects, 'breakdown')) {
    const kind = t.effects?.find((e) => e.id === 'breakdown')?.detail;
    if (kind === 'paranoia') return `${t.name} refuses help (Paranoia)`;
  }
  if (act.id === 'shared_vitality' && c.currentHp <= 1 && c.currentChakra <= 0) return 'Nothing to give';
  return null;
}

/** Which supply an option name stands for ('tag', 'wire', 'pill', 'antidote'). */
function supplyFor(option?: string): SupplyId | undefined {
  return option === 'tag' ? 'explosiveTags' : option === 'wire' ? 'wireRolls' : option === 'pill' ? 'soldierPills' : option === 'antidote' ? 'antidotes' : undefined;
}

/** What one activity does once its costs are paid. */
function applyActivity(
  party: PartyState,
  camp: CampState | null,
  who: string,
  act: CampActivity,
  opts: { target?: string; option?: string; amount?: number },
  dice: Dice,
  events: RuleEvent[],
): { party: PartyState; camp: CampState | null } {
  const doer = member(party, who)!;
  const targetId = opts.target ?? who;
  const campNo = camp?.campNo ?? party.progress.campNo;
  const wis = abilityMod(abilityScores(doer).wis);
  let p = party;
  let cs = camp;
  const self = (f: (c: ShinobiCharacter) => Step) => (p = withMember(p, who, f, events));
  const on = (id: string, f: (c: ShinobiCharacter) => Step) => (p = withMember(p, id, f, events));

  switch (act.id) {
    case 'hunt': {
      const outcome = skillCheck(checkRng(dice), doer, 'survival', 12);
      events.push({ type: 'check', who, what: 'Hunt (Survival)', outcome });
      if (cs && outcome.success) cs = { ...cs, huntSucceeded: true };
      break;
    }
    case 'bandage': {
      p = spend(p, 'bandages', 1, `${act.name} by ${doer.name}`, events);
      const heal = Math.max(1, rollDie(dice.rng, 8) + wis);
      on(targetId, (c) => {
        const h = changeHp(c, heal, act.name);
        const t = treat(h.character.effects, 'bandage');
        const ev = t.removed.map((e) => ({ type: 'effect' as const, who: c.id, effect: e, change: 'removed' as const, reason: act.name }));
        return { character: { ...h.character, effects: t.effects }, events: [...h.events, ...ev] };
      });
      break;
    }
    case 'heal_jutsu': {
      const j = healingJutsuOf(doer)!;
      self((c) => changeChakra(c, -j.chakraCost, j.name));
      let heal = j.damageDice ? rollDice(dice.rng, j.damageDice).total : 0;
      if (doer.shinobiClass === 'Medical Specialist') heal += rollDie(dice.rng, 6) + wis;
      on(targetId, (c) => changeHp(c, Math.max(1, heal), j.name));
      break;
    }
    case 'meditate':
      self((c) => changeChakra(c, Math.floor(c.maxChakra / 4), act.name));
      break;
    case 'elemental_meditation':
      self((c) => changeChakra(c, Math.floor(c.maxChakra / 4), act.name));
      self((c) => giveEffect(c, 'warding_seal', act.name, { campNo, detail: opts.option ?? 'Fire' }));
      break;
    case 'sharpen':
      self((c) => giveEffect(c, 'sharpened', act.name, { campNo }));
      break;
    case 'train_jutsu':
      self((c) => giveEffect(c, 'centered_chakra', act.name, { campNo }));
      break;
    case 'keep_watch':
    case 'byakugan_watch':
      self((c) => giveEffect(c, 'watchful', act.name, { campNo }));
      break;
    case 'perimeter_trap': {
      const trapper = doer.selectedFeats.includes('tactical_trapper');
      const kinds: ('tag' | 'wire')[] = [];
      for (let i = 0; i < (trapper ? 2 : 1); i++) {
        const want = opts.option === 'wire' ? 'wireRolls' : opts.option === 'tag' ? 'explosiveTags' : p.supplies.explosiveTags > 0 ? 'explosiveTags' : 'wireRolls';
        if (p.supplies[want] <= 0) break;
        p = spend(p, want, 1, act.name, events);
        kinds.push(want === 'explosiveTags' ? 'tag' : 'wire');
      }
      if (cs) cs = { ...cs, traps: [...cs.traps, ...kinds] };
      break;
    }
    case 'bell_wire':
      p = spend(p, 'wireRolls', 1, act.name, events);
      if (cs) cs = { ...cs, bells: true };
      break;
    case 'scout':
      p = { ...p, progress: { ...p.progress, revealedZones: [...new Set([...p.progress.revealedZones, p.progress.zone + 1])] } };
      events.push({ type: 'note', text: `${doer.name} scouted ahead: the traps of the next zone are revealed.` });
      break;
    case 'pray':
      self((c) => changeTension(c, -2, act.name, dice, campNo));
      break;
    case 'fireside_talk': {
      on(targetId, (c) => changeTension(c, -1, `${act.name} with ${doer.name}`, dice, campNo));
      const key = bondKey(who, targetId);
      const bond = Math.min(10, (p.bonds[key] ?? 0) + 1);
      p = { ...p, bonds: { ...p.bonds, [key]: bond } };
      events.push({ type: 'note', text: `Bond between ${doer.name} and ${member(p, targetId)?.name}: ${bond}` });
      break;
    }
    case 'encourage':
      on(targetId, (c) => giveEffect(c, 'encouraged', `${act.name} from ${doer.name}`, { campNo }));
      break;
    case 'sharingan_reading':
      events.push({ type: 'note', text: `${doer.name}'s Sharingan reveals genjutsu traps and disguised strangers nearby.` });
      break;
    case 'wood_shelter':
    case 'seal_barrier':
    case 'camp_illusion':
      if (act.chakra === 'quarterMax') self((c) => changeChakra(c, -Math.ceil(c.maxChakra / 4), act.name));
      break;
    case 'shared_vitality': {
      const amount = Math.max(1, Math.floor(opts.amount ?? 10));
      if (opts.option === 'chakra') {
        const give = Math.min(amount, doer.currentChakra);
        self((c) => changeChakra(c, -give, act.name));
        on(targetId, (c) => changeChakra(c, give, `${act.name} from ${doer.name}`));
      } else {
        const give = Math.min(amount, doer.currentHp - 1);
        self((c) => changeHp(c, -give, act.name));
        on(targetId, (c) => changeHp(c, give, `${act.name} from ${doer.name}`));
      }
      break;
    }
    case 'wood_skin':
      on(targetId, (c) => giveEffect(c, 'wood_skin', `${act.name} from ${doer.name}`, { campNo }));
      break;
    case 'warding_seal':
      on(targetId, (c) => giveEffect(c, 'warding_seal', `${act.name} from ${doer.name}`, { campNo, detail: opts.option ?? 'Fire' }));
      break;
    case 'seal_poison':
    case 'close_tenketsu':
      on(targetId, (c) => {
        const t = treat(c.effects, act.id);
        return { character: { ...c, effects: t.effects }, events: t.removed.map((e) => ({ type: 'effect' as const, who: c.id, effect: e, change: 'removed' as const, reason: act.name })) };
      });
      break;
    case 'field_surgery': {
      const outcome = skillCheck(checkRng(dice), doer, 'medicine', 13);
      events.push({ type: 'check', who, what: 'Field surgery (Medicine)', outcome });
      on(targetId, (c) => {
        if (outcome.success) {
          const t = treat(c.effects, 'field_surgery');
          return { character: { ...c, effects: t.effects }, events: t.removed.map((e) => ({ type: 'effect' as const, who: c.id, effect: e, change: 'removed' as const, reason: act.name })) };
        }
        if (!hasEffect(c.effects, 'grave_wound')) return { character: c, events: [] };
        const scars = [...(c.scars ?? []), 'scar_grave_wound'];
        return {
          character: { ...c, scars, effects: (c.effects ?? []).filter((e) => e.id !== 'grave_wound') },
          events: [{ type: 'effect', who: c.id, effect: 'grave_wound', change: 'removed', reason: 'badly treated: it leaves a scar' }],
        };
      });
      break;
    }
    case 'make_pills': {
      const item: SupplyId = opts.option === 'antidote' ? 'antidotes' : 'soldierPills';
      p = spend(p, item, -1, act.name, events);
      break;
    }
    case 'make_materials': {
      const item: SupplyId = opts.option === 'wire' ? 'wireRolls' : 'explosiveTags';
      p = spend(p, item, -1, act.name, events);
      break;
    }
    case 'stretching':
      self((c) => changeExhaustion(c, -1, act.name));
      break;
    case 'peaceful_sleep':
      on(targetId, (c) => changeTension(c, -3, act.name, dice, campNo));
      break;
    case 'katon_fire':
      break;
  }
  return { party: p, camp: cs };
}

// --- camp -----------------------------------------------------------------------------------

/** Step 1: set up the camp. Spends a camp kit; ninjas in Breakdown pick the activity they refuse. */
export function startCamp(party: PartyState, site: CampSite): Outcome<CampState> {
  if (party.supplies.campKits < 1) return fail('No camp kit left');
  const events: RuleEvent[] = [];
  const campNo = party.progress.campNo + 1;
  let p = spend(party, 'campKits', 1, 'Set up camp', events);
  p = { ...p, progress: { ...p.progress, campNo } };
  let camp: CampState = { site, campNo, done: [], sticksUsed: {}, huntSucceeded: false, bells: false, traps: [], refused: {} };
  for (const m of p.members) {
    if (!hasEffect(m.effects, 'breakdown') || isDown(m)) continue;
    const options = Object.values(ACTIVITY).filter((act) => activityBlocker(p, camp, m.id, act, { target: act.target === 'other' ? p.members.find((o) => o.id !== m.id)?.id : undefined }) === null);
    if (!options.length) continue;
    const refused = pick(rngFor(p.progress.seed, 'camp', site.nodeId, 'refuse', m.id), options).id;
    camp = { ...camp, refused: { ...camp.refused, [m.id]: refused } };
    events.push({ type: 'note', text: `${m.name} is in Breakdown and refuses to do ${ACTIVITY[refused].name} tonight.` });
  }
  return { ok: true, party: p, state: camp, events };
}

/** Step 2: the fire, voted first. A bonfire takes an extra kit or a Mirai's Katon fire (1 stick). */
export function chooseFire(party: PartyState, camp: CampState, fire: FireLevel, katonBy?: string): Outcome<CampState> {
  if (camp.fire) return fail('The fire is already chosen');
  const events: RuleEvent[] = [];
  let p = party;
  let cs: CampState = { ...camp, fire };
  if (fire === 'bonfire') {
    if (katonBy) {
      const m = member(p, katonBy);
      if (!m || m.clan !== 'Mirai') return fail('Only a Mirai can make Katon fire');
      if (isDown(m)) return fail(`${m.name} cannot act`);
      if ((cs.sticksUsed[katonBy] ?? 0) + ACTIVITY.katon_fire.sticks > STICKS_PER_CAMP) return fail('Not enough incense');
      cs = {
        ...cs,
        katonBy,
        sticksUsed: { ...cs.sticksUsed, [katonBy]: (cs.sticksUsed[katonBy] ?? 0) + ACTIVITY.katon_fire.sticks },
        done: [...cs.done, { who: katonBy, activity: 'katon_fire' }],
      };
      events.push({ type: 'note', text: `${m.name} lights the bonfire with Katon fire.` });
    } else {
      if (p.supplies.campKits < 1) return fail('A bonfire needs an extra camp kit or a Mirai');
      p = spend(p, 'campKits', 1, 'Bonfire', events);
    }
  }
  return { ok: true, party: p, state: cs, events };
}

/** Step 3: one activity of one ninja. */
export function doActivity(
  party: PartyState,
  camp: CampState,
  who: string,
  activity: ActivityId,
  opts: { target?: string; option?: string; amount?: number } = {},
): Outcome<CampState> {
  if (!camp.fire) return fail('Choose the fire first');
  const act = ACTIVITY[activity];
  const blocker = activityBlocker(party, camp, who, act, opts);
  if (blocker) return fail(blocker);
  const events: RuleEvent[] = [];
  const dice = diceFor(party, 'camp', camp.site.nodeId, who, activity);
  const r = applyActivity(party, camp, who, act, opts, dice, events);
  const cs = r.camp!;
  return {
    ok: true,
    party: r.party,
    state: {
      ...cs,
      sticksUsed: { ...cs.sticksUsed, [who]: (cs.sticksUsed[who] ?? 0) + act.sticks },
      done: [...cs.done, { who, activity, target: opts.target, option: opts.option }],
    },
    events,
  };
}

/** One part of the night danger, for the moon's breakdown: a % added, or the guard's half or zero. */
export interface AmbushPart {
  label: string;
  add?: number;
  halve?: boolean;
  zero?: boolean;
}

/** The parts of the night danger in order: zone, fire, activities and hours, then the guards. */
export function ambushParts(party: PartyState, camp: CampState): AmbushPart[] {
  const parts: AmbushPart[] = [{ label: 'Zone danger', add: camp.site.zoneDanger }];
  if (camp.fire === 'none') parts.push({ label: 'No fire', add: -10 });
  if (camp.fire === 'bonfire') parts.push({ label: 'Bonfire', add: 10 });
  const done = [...new Set(camp.done.map((d) => d.activity))];
  for (const id of done) if (ACTIVITY[id].ambush?.add) parts.push({ label: ACTIVITY[id].name, add: ACTIVITY[id].ambush!.add });
  const hours = party.progress.hoursSinceCamp;
  if (party.progress.deadlineHours === undefined && hours >= 4) parts.push({ label: `${hours} h on the road`, add: 5 * Math.floor(hours / 4) });
  for (const id of done) if (ACTIVITY[id].ambush?.halve) parts.push({ label: ACTIVITY[id].name, halve: true });
  for (const id of done) if (ACTIVITY[id].ambush?.zero) parts.push({ label: ACTIVITY[id].name, zero: true });
  return parts;
}

/** Night danger in %, as the moon shows it (docs/MISSION_DESIGN.md, Night ambush). */
export function ambushChance(party: PartyState, camp: CampState): number {
  const parts = ambushParts(party, camp);
  let pct = Math.max(0, Math.min(100, parts.reduce((sum, x) => sum + (x.add ?? 0), 0)));
  if (parts.some((x) => x.halve)) pct = Math.floor(pct / 2);
  if (parts.some((x) => x.zero)) pct = 0;
  return pct;
}

/** Step 4: dinner for everyone, plus what the fire does to the mood. */
export function serveFood(party: PartyState, camp: CampState, food: FoodLevel): Outcome<CampState> {
  if (!camp.fire) return fail('Choose the fire first');
  if (camp.food) return fail('Dinner is already served');
  const warm = camp.fire !== 'none';
  if ((food === 'hot' || food === 'feast') && !warm) return fail('Hot food needs a fire');
  if (food === 'feast' && !camp.huntSucceeded) return fail('A feast needs a successful hunt');
  const rations = food === 'none' ? 0 : party.members.length;
  if (party.supplies.rations < rations) return fail('Not enough rations');
  const events: RuleEvent[] = [];
  let p = rations ? spend(party, 'rations', rations, 'Dinner', events) : party;
  for (const m of p.members) {
    const dice = diceFor(p, 'camp', camp.site.nodeId, 'evening', m.id);
    p = withMember(
      p,
      m.id,
      (c) => {
        const ev: RuleEvent[] = [];
        let ch = c;
        const step = (r: Step) => {
          ch = r.character;
          ev.push(...r.events);
        };
        if (food === 'none') {
          step(changeExhaustion(ch, 1, 'No food'));
          step(changeTension(ch, 2, 'No food', dice, camp.campNo));
          step(giveEffect(ch, 'hungry', 'No food', { campNo: camp.campNo }));
        } else {
          const t = treat(ch.effects, 'food');
          if (t.removed.length) {
            ch = { ...ch, effects: t.effects };
            ev.push(...t.removed.map((e) => ({ type: 'effect' as const, who: c.id, effect: e, change: 'removed' as const, reason: 'Ate' })));
          }
          if (food === 'hot') step(changeTension(ch, -1, 'Hot meal', dice, camp.campNo));
          if (food === 'feast') {
            step(changeTension(ch, -2, 'Feast', dice, camp.campNo));
            step(giveEffect(ch, 'well_fed', 'Feast', { campNo: camp.campNo }));
          }
        }
        if (camp.fire === 'none') {
          step(changeTension(ch, 1, 'A night without fire', dice, camp.campNo));
          if (camp.site.cold) step(giveEffect(ch, 'numb', 'Cold night', { campNo: camp.campNo }));
        }
        if (camp.fire === 'bonfire') step(changeTension(ch, -1, 'Bonfire', dice, camp.campNo));
        return { character: ch, events: ev };
      },
      events,
    );
  }
  return { ok: true, party: p, state: { ...camp, food }, events };
}

/** Step 5: the night. Rolls the ambush (or adds to the counter in the no-randomness mode). */
export function rollNight(party: PartyState, camp: CampState): Outcome<CampState> {
  if (!camp.food) return fail('Serve dinner first');
  if (camp.night) return fail('The night already passed');
  const chance = ambushChance(party, camp);
  let p = party;
  let ambush: boolean;
  if (party.progress.noRandomness) {
    const counter = party.progress.ambushCounter + chance;
    ambush = counter >= 100;
    p = { ...p, progress: { ...p.progress, ambushCounter: ambush ? counter - 100 : counter } };
  } else {
    ambush = rngFor(party.progress.seed, 'camp', camp.site.nodeId, 'ambush')() * 100 < chance;
  }
  return { ok: true, party: p, state: { ...camp, night: { chance, ambush } }, events: [{ type: 'ambush', chance, happened: ambush }] };
}

/**
 * Step 6: the morning. Half of max HP and chakra (none of the HP with Fever), half of the spent
 * dice back (rounded up, at least 1), one more Hit Die after a hot meal, −1 Exhaustion if the
 * party ate, until-camp effects from before this camp expire. An interrupted night gives half.
 */
export function morning(party: PartyState, camp: CampState, opts: { interrupted?: boolean } = {}): Outcome<CampState> {
  if (!camp.night) return fail('The night has not passed yet');
  if (camp.morningDone) return fail('It is already morning');
  const interrupted = opts.interrupted ?? camp.night.ambush;
  const fed = camp.food !== 'none';
  const hotMeal = camp.food === 'hot' || camp.food === 'feast';
  const events: RuleEvent[] = [];
  let p = party;
  for (const m of p.members) {
    p = withMember(
      p,
      m.id,
      (c) => {
        const ev: RuleEvent[] = [];
        let ch = c;
        const step = (r: Step) => {
          ch = r.character;
          ev.push(...r.events);
        };
        const half = (n: number) => (interrupted ? Math.floor(n / 2) : n);
        if (!effectMods(ch.effects).noRestHp) step(changeHp(ch, half(Math.floor(effectiveMaxHp(ch) / 2)), 'Morning'));
        step(changeChakra(ch, half(Math.floor(ch.maxChakra / 2)), 'Morning'));

        const backDice = (spent: number) => (spent > 0 ? half(Math.max(1, Math.ceil(spent / 2))) : 0);
        const hitSpent = ch.hitDiceSpent ?? 0;
        const hitBack = Math.min(hitSpent, backDice(hitSpent) + (hotMeal && hitSpent > 0 ? 1 : 0));
        const chakraSpent = ch.chakraDiceSpent ?? 0;
        const chakraBack = Math.min(chakraSpent, backDice(chakraSpent));
        if (hitBack) {
          ch = { ...ch, hitDiceSpent: hitSpent - hitBack };
          ev.push({ type: 'dice', who: c.id, kind: 'hit', delta: hitBack, left: hitDiceLeft(ch), reason: 'Morning' });
        }
        if (chakraBack) {
          ch = { ...ch, chakraDiceSpent: chakraSpent - chakraBack };
          ev.push({ type: 'dice', who: c.id, kind: 'chakra', delta: chakraBack, left: chakraDiceLeft(ch), reason: 'Morning' });
        }
        if (fed) step(changeExhaustion(ch, -1, 'A camp with food'));
        if (hasEffect(ch.effects, 'bleeding')) step(giveEffect(ch, 'fever', 'Camped with an untreated wound', { campNo: camp.campNo }));

        const exp = morningAfter(ch.effects, camp.campNo);
        ch = { ...ch, effects: exp.effects, pillsSinceCamp: 0 };
        // A long rest: Triple Nature's discount is ready again (rules/feats.ts).
        if (ch.tripleNatureSpent) delete ch.tripleNatureSpent;
        ev.push(...exp.expired.map((e) => ({ type: 'effect' as const, who: c.id, effect: e, change: 'expired' as const, reason: 'Morning' })));
        return { character: ch, events: ev };
      },
      events,
    );
  }
  // Perimeter traps and bells nobody walked into are picked up again.
  if (!camp.night.ambush) {
    const tags = camp.traps.filter((t) => t === 'tag').length;
    const wires = camp.traps.filter((t) => t === 'wire').length + (camp.bells ? 1 : 0);
    if (tags) p = spend(p, 'explosiveTags', -tags, 'Picked up the perimeter traps', events);
    if (wires) p = spend(p, 'wireRolls', -wires, 'Picked up the perimeter traps', events);
  }
  p = { ...p, progress: { ...p.progress, hoursSpent: p.progress.hoursSpent + 8, hoursSinceCamp: 0 } };
  return { ok: true, party: p, state: { ...camp, morningDone: true }, events };
}

// --- short stop -----------------------------------------------------------------------------

/** A short stop: between zones, at most one per zone, 1 hour. */
export function startShortStop(party: PartyState): Outcome<StopState> {
  const zone = party.progress.zone;
  if (party.progress.stopsTaken.includes(zone)) return fail('Already stopped in this zone');
  const progress = {
    ...party.progress,
    stopsTaken: [...party.progress.stopsTaken, zone],
    hoursSpent: party.progress.hoursSpent + 1,
    hoursSinceCamp: party.progress.hoursSinceCamp + 1,
  };
  return { ok: true, party: { ...party, progress }, state: { zone, acted: [] }, events: [{ type: 'note', text: 'Short stop: 1 hour.' }] };
}

/** Spends one Hit Die: its die + CON (at least 1). Fever stops HP from coming back. */
export function spendHitDie(party: PartyState, who: string): Outcome<null> {
  const c = member(party, who);
  if (!c) return fail('Unknown ninja');
  if (hitDiceLeft(c) < 1) return fail('No Hit Dice left');
  if (effectMods(c.effects).noRestHp) return fail('Fever: no HP back from rests');
  if (c.currentHp >= effectiveMaxHp(c)) return fail('Already at full HP');
  const rng = rngFor(party.progress.seed, 'stop', party.progress.zone, who, 'hit', c.hitDiceSpent ?? 0);
  const heal = Math.max(1, rollDie(rng, SHINOBI_CLASSES[c.shinobiClass].hitDie) + abilityMod(abilityScores(c).con));
  const events: RuleEvent[] = [];
  const p = withMember(
    party,
    who,
    (ch) => {
      const h = changeHp({ ...ch, hitDiceSpent: (ch.hitDiceSpent ?? 0) + 1 }, heal, 'Hit Die');
      return { character: h.character, events: [{ type: 'dice', who, kind: 'hit', delta: -1, left: hitDiceLeft(h.character), reason: 'Short stop' }, ...h.events] };
    },
    events,
  );
  return { ok: true, party: p, state: null, events };
}

/** Spends one Chakra Die: its die, no modifier. */
export function spendChakraDie(party: PartyState, who: string): Outcome<null> {
  const c = member(party, who);
  if (!c) return fail('Unknown ninja');
  if (chakraDiceLeft(c) < 1) return fail('No Chakra Dice left');
  if (c.currentChakra >= c.maxChakra) return fail('Already at full chakra');
  const rng = rngFor(party.progress.seed, 'stop', party.progress.zone, who, 'chakra', c.chakraDiceSpent ?? 0);
  const gain = rollDie(rng, SHINOBI_CLASSES[c.shinobiClass].chakraDie);
  const events: RuleEvent[] = [];
  const p = withMember(
    party,
    who,
    (ch) => {
      const g = changeChakra({ ...ch, chakraDiceSpent: (ch.chakraDiceSpent ?? 0) + 1 }, gain, 'Chakra Die');
      return { character: g.character, events: [{ type: 'dice', who, kind: 'chakra', delta: -1, left: chakraDiceLeft(g.character), reason: 'Short stop' }, ...g.events] };
    },
    events,
  );
  return { ok: true, party: p, state: null, events };
}

/** The one activity a ninja may do at a short stop: Bandage or Heal with jutsu. */
export function stopActivity(party: PartyState, stop: StopState, who: string, activity: ActivityId, opts: { target?: string } = {}): Outcome<StopState> {
  const act = ACTIVITY[activity];
  if (!act.atStop) return fail('Camp only');
  if (stop.acted.includes(who)) return fail('Already did an activity at this stop');
  const blocker = activityBlocker(party, null, who, act, opts);
  if (blocker) return fail(blocker);
  const events: RuleEvent[] = [];
  const dice = diceFor(party, 'stop', stop.zone, who, activity);
  const r = applyActivity(party, null, who, act, opts, dice, events);
  return { ok: true, party: r.party, state: { ...stop, acted: [...stop.acted, who] }, events };
}
