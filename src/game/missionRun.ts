// A mission in progress as plain data, and the steps that move it along the road: arriving at
// nodes, battles (with the next ninja stepping in after a fall), short stops, camps and the end.
// The screens in src/components/mission only show this state and call these functions.

import type { ShinobiCharacter } from '../types/shinobi';
import type { Difficulty, PartyState, RuleEvent } from '../types/mission';
import { MISSIONS, MissionBattle, MissionDef, nextPos, nodeAt, RoadPos } from '../data/missions';
import { applyBattleResult, BattleMemberResult, BattleResult, enterNextZone, flankWear, isStanding, newMission, travelLeg } from '../rules/mission';
import { CampState, morning, Outcome, StopState } from '../rules/rest';
import { hasEffect } from '../rules/effects';
import { returnToVillage, sanitizeMissionFields } from '../rules/ninja';
import { pick, strings } from '../i18n';
import { both, describeEvent, LogLine, LogText } from './eventText';
import type { PartyBattleResult } from '../battle/result';
import type { SupplyId } from '../types/mission';

/** Log headings written by the mission flow. */
const T = strings({
  arrive: { en: '{node} · {hours} h on the road', es: '{node} · {hours} h de camino' },
  setsOut: { en: '{mission}: the party sets out', es: '{mission}: el grupo se pone en marcha' },
  complete: { en: '{mission}: complete!', es: '{mission}: ¡cumplida!' },
  into: { en: 'Into {zone}', es: 'Nueva zona: {zone}' },
  interruptedMorning: { en: 'An interrupted morning', es: 'Una mañana interrumpida' },
  victory: { en: 'Victory: {title}', es: 'Victoria: {title}' },
  falls: { en: '{name} falls! Another ninja can step in.', es: '¡{name} cae! Otro ninja puede tomar su lugar.' },
  theFighter: { en: 'The fighter', es: 'El combatiente' },
  wholePartyFell: { en: 'The whole party fell. {title} starts over from the road.', es: 'Todo el grupo cayó. {title} vuelve a empezar desde el camino.' },
  defeat: { en: 'Defeat: {title}', es: 'Derrota: {title}' },
  objectiveLost: { en: 'The objective is lost. The survivors limp home.', es: 'El objetivo se perdió. Los sobrevivientes vuelven cojeando a casa.' },
  leftForDead: { en: 'The enemy left the party for dead. The survivors get up and go on.', es: 'El enemigo dio al grupo por muerto. Los sobrevivientes se levantan y siguen adelante.' },
  retreat: { en: 'Retreat: {title}', es: 'Retirada: {title}' },
  usedInBattle: { en: 'Used in battle', es: 'Usado en la batalla' },
});

const es = (en: string, esText?: string) => pick(en, esText, 'es');

export interface BattleRun {
  /** Seeds the battle's rolls and keys the battle screen: the node id, or the camp's id + ':ambush'. */
  id: string;
  battle: MissionBattle;
  ambush: boolean;
  objective: boolean;
  /** Choosing who fights, fighting, or choosing who steps in after a fall. */
  phase: 'prep' | 'fighting' | 'fell';
  fighterId: string;
  attempt: number;
  /** Fighters who fell earlier in this battle. */
  fallen: BattleMemberResult[];
  /** Soldier pills taken for this battle, per ninja. */
  pills: Record<string, number>;
  /** The battle screen's report, kept until the player presses Continue. */
  report?: BattleResult;
}

export interface MissionRun {
  version: 1;
  missionId: string;
  /** Your ninja from the creator; it comes home with its scars when the mission ends. */
  heroId: string;
  party: PartyState;
  /** The party as it arrived at the current node: a lost battle repeats from here (Story, Normal). */
  entry: PartyState;
  pos: RoadPos;
  nodeDone: boolean;
  /** Between two zones, where the short stop is offered. */
  zoneEnd: boolean;
  stop: StopState | null;
  camp: CampState | null;
  battle: BattleRun | null;
  outcome: 'ongoing' | 'complete' | 'failed' | 'gameOver';
  log: LogLine[];
  nextLogId: number;
  /** First log line of the last action, shown as "What happened". */
  recentFrom: number;
  stats: { battlesWon: number; falls: number; camps: number; ambushes: number; retries: number };
}

export const missionOf = (r: MissionRun): MissionDef => MISSIONS.find((m) => m.id === r.missionId) ?? MISSIONS[0];

/** Adds events (and an optional heading) to the log; they become "What happened". */
export function narrate(run: MissionRun, events: RuleEvent[], title?: LogText): MissionRun {
  const names = new Map([...run.entry.members, ...run.party.dead, ...run.party.members].map((m) => [m.id, m.name] as const));
  const name = (id: string) => names.get(id) ?? id;
  let id = run.nextLogId;
  const lines: LogLine[] = [];
  if (typeof title === 'string' && title) lines.push({ id: id++, text: title, tone: 'title' });
  else if (title && typeof title === 'object') lines.push({ id: id++, text: title.en, es: title.es, tone: 'title' });
  for (const e of events) {
    const en = describeEvent(e, name, 'en');
    lines.push({ id: id++, text: en.text, es: describeEvent(e, name, 'es').text, tone: en.tone });
  }
  return { ...run, log: [...run.log, ...lines].slice(-400), nextLogId: id, recentFrom: run.nextLogId };
}

/** Applies a rule outcome (new party plus events) and then `patch` with its state. */
export function applyOutcome<S>(run: MissionRun, o: Extract<Outcome<S>, { ok: true }>, patch: (r: MissionRun, state: S) => MissionRun, title?: LogText): MissionRun {
  return patch(narrate({ ...run, party: o.party }, o.events, title), o.state);
}

/** Who fights by default: for an ambush whoever kept watch, else the leader, else anyone standing. */
export function defaultFighter(party: PartyState, ambush: boolean, exclude: string[] = []): string {
  const ok = party.members.filter((m) => isStanding(m) && !exclude.includes(m.id));
  const guard = ambush ? ok.find((m) => hasEffect(m.effects, 'watchful')) : undefined;
  return (guard ?? ok.find((m) => m.id === party.leaderId) ?? ok[0])?.id ?? '';
}

export function newBattle(id: string, battle: MissionBattle, party: PartyState, opts: { ambush?: boolean; objective?: boolean } = {}): BattleRun {
  return { id, battle, ambush: !!opts.ambush, objective: !!opts.objective, phase: 'prep', fighterId: defaultFighter(party, !!opts.ambush), attempt: 0, fallen: [], pills: {} };
}

/** The party walks to a road node; a battle node opens its battle. */
export function arrive(run: MissionRun, pos: RoadPos): MissionRun {
  const node = nodeAt(missionOf(run), pos)!;
  const t = travelLeg(run.party, node.id, node.hours);
  let r: MissionRun = { ...run, party: t.party, pos, nodeDone: false, zoneEnd: false, stop: null, camp: null, battle: null };
  r = narrate(r, t.events, both(T, 'arrive', { node: node.name, hours: node.hours }, { node: es(node.name, node.nameEs), hours: node.hours }));
  r = { ...r, entry: r.party };
  if (node.kind === 'battle') r = { ...r, battle: newBattle(node.id, node.battle, r.party, { objective: node.objective }) };
  return r;
}

/** A new mission: everyone starts fresh from the village and walks to the first node. */
export function startRun(
  mission: MissionDef,
  heroId: string,
  members: ShinobiCharacter[],
  opts: { seed: number; leaderId: string; difficulty: Difficulty; noRandomness: boolean },
): MissionRun {
  const fresh = members.map((m) => returnToVillage(sanitizeMissionFields(m)).character);
  const party = newMission(fresh, { ...opts, supplies: mission.supplies, deadlineHours: mission.deadlineHours });
  const base: MissionRun = {
    version: 1,
    missionId: mission.id,
    heroId,
    party,
    entry: party,
    pos: { zone: 0, node: 0 },
    nodeDone: false,
    zoneEnd: false,
    stop: null,
    camp: null,
    battle: null,
    outcome: 'ongoing',
    log: [],
    nextLogId: 1,
    recentFrom: 1,
    stats: { battlesWon: 0, falls: 0, camps: 0, ambushes: 0, retries: 0 },
  };
  return arrive(narrate(base, [], both(T, 'setsOut', { mission: mission.name }, { mission: es(mission.name, mission.nameEs) })), { zone: 0, node: 0 });
}

/** On from a finished node: the next node, the end of a zone (short stop offered) or the end. */
export function continueRoad(run: MissionRun): MissionRun {
  const m = missionOf(run);
  const n = nextPos(m, run.pos);
  if (!n) return { ...narrate(run, [], both(T, 'complete', { mission: m.name }, { mission: es(m.name, m.nameEs) })), outcome: 'complete' };
  if (n.zone !== run.pos.zone) return { ...run, zoneEnd: true };
  return arrive(run, n);
}

/** Leaves the zone (after the short stop, or skipping it) and walks to the next zone's first node. */
export function intoNextZone(run: MissionRun): MissionRun {
  const n = nextPos(missionOf(run), run.pos);
  if (!n) return run;
  const z = enterNextZone(run.party);
  const zone = missionOf(run).zones[n.zone];
  return arrive(narrate({ ...run, party: z.party, stop: null }, z.events, both(T, 'into', { zone: zone.name }, { zone: es(zone.name, zone.nameEs) })), n);
}

/** After the night raid: the interrupted morning. */
function morningAfterRaid(run: MissionRun): MissionRun {
  if (!run.camp) return run;
  const m = morning(run.party, run.camp, { interrupted: true });
  if (!m.ok) return run;
  return narrate({ ...run, party: m.party, camp: m.state }, m.events, both(T, 'interruptedMorning'));
}

/** Continue after the battle screen: folds the result in, or sends the next ninja in after a fall. */
export function resolveBattle(run: MissionRun): MissionRun {
  const b = run.battle;
  if (!b?.report) return run;
  const fighter = run.party.members.find((m) => m.id === b.fighterId);
  const mine: BattleMemberResult = { ...b.report.members[0], id: b.fighterId, pillsTaken: b.pills[b.fighterId] ?? 0 };
  const title = { title: b.battle.title };
  const titleEs = { title: es(b.battle.title, b.battle.titleEs) };

  if (b.report.victory) {
    const fighters = [...b.fallen.map((f) => f.id), b.fighterId];
    const wear = flankWear(run.party, b.id, fighters, { threat: b.battle.threat, venom: b.battle.venom });
    const res = applyBattleResult(run.party, { victory: true, members: [...b.fallen, mine, ...wear] }, b.id, { ambush: b.ambush });
    let r = narrate({ ...run, party: res.party, battle: null }, res.events, both(T, 'victory', title, titleEs));
    r = { ...r, stats: { ...r.stats, battlesWon: r.stats.battlesWon + 1, falls: r.stats.falls + b.fallen.length } };
    return b.ambush ? morningAfterRaid(r) : { ...r, nodeDone: true };
  }

  // The fighter fell: they stay down while the battle goes on.
  const fallen = [...b.fallen, { ...mine, hp: 0, fell: true }];
  const party: PartyState = {
    ...run.party,
    members: run.party.members.map((m) => (m.id === b.fighterId ? { ...m, currentHp: 0, currentChakra: Math.max(0, Math.min(m.maxChakra, mine.chakra)) } : m)),
  };
  const next = defaultFighter(party, b.ambush, fallen.map((f) => f.id));
  if (next) {
    const r = narrate({ ...run, party }, [], both(T, 'falls', { name: fighter?.name ?? T('theFighter', undefined, 'en') }, { name: fighter?.name ?? T('theFighter', undefined, 'es') }));
    return { ...r, battle: { ...b, phase: 'fell', fallen, fighterId: next, report: undefined } };
  }

  // Nobody is left standing.
  if (run.party.progress.difficulty !== 'legend' && !b.ambush) {
    const r = narrate({ ...run, party: run.entry }, [], both(T, 'wholePartyFell', title, titleEs));
    return { ...r, battle: newBattle(b.id, b.battle, run.entry, { objective: b.objective }), stats: { ...r.stats, retries: r.stats.retries + 1 } };
  }
  const res = applyBattleResult(party, { victory: false, members: fallen }, b.id, { ambush: b.ambush });
  let r = narrate({ ...run, party: res.party, battle: null }, res.events, both(T, 'defeat', title, titleEs));
  r = { ...r, stats: { ...r.stats, falls: r.stats.falls + fallen.length } };
  if (res.gameOver) return { ...r, outcome: 'gameOver' };
  if (b.ambush) return morningAfterRaid(r);
  if (b.objective) return { ...narrate(r, [], both(T, 'objectiveLost')), outcome: 'failed' };
  return narrate({ ...r, nodeDone: true }, [], both(T, 'leftForDead'));
}

/**
 * After a party battle (the whole party fights on the battle map): HP, chakra, effects, falls,
 * criticals, soldier pills and Tension come back through the mission rules, and the supplies used
 * in battle are spent. A lost battle in Story and Normal repeats from the node's entry; a retreat
 * gives up the node (or the mission, if it was the objective).
 */
export function resolvePartyBattle(run: MissionRun, result: PartyBattleResult): MissionRun {
  const b = run.battle;
  if (!b) return run;
  const title = { title: b.battle.title };
  const titleEs = { title: es(b.battle.title, b.battle.titleEs) };
  const fell = result.members.filter((m) => m.fell).length;

  if (result.outcome === 'defeat' && run.party.progress.difficulty !== 'legend' && !b.ambush) {
    const r = narrate({ ...run, party: run.entry }, [], both(T, 'wholePartyFell', title, titleEs));
    return { ...r, battle: newBattle(b.id, b.battle, run.entry, { objective: b.objective }), stats: { ...r.stats, retries: r.stats.retries + 1, falls: r.stats.falls + fell } };
  }

  // Supplies spent in battle.
  const events: RuleEvent[] = [];
  const supplies = { ...run.party.supplies };
  for (const item of ['soldierPills', 'bandages', 'antidotes', 'explosiveTags'] as SupplyId[]) {
    const left = result.supplies[item as keyof PartyBattleResult['supplies']];
    if (left === undefined || left === supplies[item]) continue;
    events.push({ type: 'supplies', item, delta: left - supplies[item], left, reason: T('usedInBattle', undefined, 'en') });
    supplies[item] = left;
  }
  const res = applyBattleResult({ ...run.party, supplies }, { victory: result.victory, members: result.members }, b.id, { ambush: b.ambush });
  const heading = result.outcome === 'victory' ? 'victory' : result.outcome === 'fled' ? 'retreat' : 'defeat';
  let r = narrate({ ...run, party: res.party, battle: null }, [...events, ...res.events], both(T, heading, title, titleEs));
  r = { ...r, stats: { ...r.stats, battlesWon: r.stats.battlesWon + (result.victory ? 1 : 0), falls: r.stats.falls + fell } };
  if (res.gameOver) return { ...r, outcome: 'gameOver' };
  if (b.ambush) return morningAfterRaid(r);
  if (result.victory) return { ...r, nodeDone: true };
  if (b.objective) return { ...narrate(r, [], both(T, 'objectiveLost')), outcome: 'failed' };
  return result.outcome === 'fled' ? { ...r, nodeDone: true } : narrate({ ...r, nodeDone: true }, [], both(T, 'leftForDead'));
}

// --- the save slot ---------------------------------------------------------------------------

const SAVE_KEY = 'shinobi5e.mission.v1';

export function loadRun(): MissionRun | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as MissionRun;
    if (r?.version !== 1 || !MISSIONS.some((m) => m.id === r.missionId) || !r.party?.members) return null;
    // A battle can't be saved halfway: it starts again from choosing who fights.
    if (r.battle?.phase === 'fighting') r.battle = { ...r.battle, phase: r.battle.fallen.length ? 'fell' : 'prep', report: undefined };
    return r;
  } catch {
    return null;
  }
}

export function saveRun(r: MissionRun | null): void {
  try {
    if (r) localStorage.setItem(SAVE_KEY, JSON.stringify(r));
    else localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage can be full or blocked; the mission still plays.
  }
}
