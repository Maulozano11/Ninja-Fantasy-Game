// A mission in progress as plain data, and the steps that move it along the road: arriving at
// nodes, battles (with the next ninja stepping in after a fall), short stops, camps and the end.
// The screens in src/components/mission only show this state and call these functions.

import type { ShinobiCharacter } from '../types/shinobi';
import type { Difficulty, PartyState, RuleEvent } from '../types/mission';
import { AURELIA, MISSIONS, MissionBattle, MissionDef, nextPos, nodeAt, RoadPos } from '../data/missions';
import { applyBattleResult, enterNextZone, newMission, travelLeg } from '../rules/mission';
import { CampState, morning, Outcome, StopState } from '../rules/rest';
import { migrateCharacter, returnToVillage, sanitizeMissionFields } from '../rules/ninja';
import { pouchTags } from '../rules/pouch';
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
  /** Getting ready, or fighting on the battle map. */
  phase: 'prep' | 'fighting';
  /** Tries at this battle (a lost battle repeats in Story and Normal). */
  attempt: number;
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

export function newBattle(id: string, battle: MissionBattle, _party: PartyState, opts: { ambush?: boolean; objective?: boolean } = {}): BattleRun {
  return { id, battle, ambush: !!opts.ambush, objective: !!opts.objective, phase: 'prep', attempt: 0 };
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
  // Older sheets get today's clan rules first (a no-op for a sheet that is already today's).
  const fresh = members.map((m) => returnToVillage(migrateCharacter(sanitizeMissionFields(m))).character);
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

/**
 * Companions the owner removed, by id, and the companion who takes each one's place in a run saved with
 * them: the field medic who was removed on 2026-10-22 ("borra a hana tambien entonces y pon de nuevas
 * compañeras a nuestras nuevas versiones femeninas de personajes") hands over to Aurelia, the new medic.
 */
const REPLACED_COMPANIONS: Readonly<Record<string, ShinobiCharacter>> = { companion_hana: AURELIA };

/** What a ninja carries through a mission (rules/ninja.ts sanitizeMissionFields), kept when another takes its place. */
const MISSION_FIELDS = ['effects', 'tension', 'exhaustion', 'pillsSinceCamp', 'scars', 'traits', 'hitDiceSpent', 'chakraDiceSpent'] as const;

/** The replacement's sheet in the removed companion's place: as hurt and as spent, in proportion, and with its effects and wear. */
function standIn(was: ShinobiCharacter, now: ShinobiCharacter): ShinobiCharacter {
  const part = (cur: number, max: number, to: number) => (cur <= 0 ? 0 : Math.max(1, Math.min(to, Math.round((cur / Math.max(1, max)) * to))));
  const out: ShinobiCharacter = { ...now, currentHp: part(was.currentHp, was.maxHp, now.maxHp), currentChakra: part(was.currentChakra, was.maxChakra, now.maxChakra) };
  for (const k of MISSION_FIELDS) if (was[k] !== undefined) (out as unknown as Record<string, unknown>)[k] = structuredClone(was[k]);
  return sanitizeMissionFields(out);
}

/**
 * A run saved with a removed companion: the companion who replaces it takes its place everywhere in the
 * run (the party, the dead, the node's entry, the leader, the bonds, the camp and the short stop), with
 * its state (standIn). The log keeps what happened under the old name. A run that already has the
 * replacement drops the removed companion instead, and anything that named it falls back to the hero.
 */
function replaceCompanions(r: MissionRun): MissionRun {
  let run = r;
  for (const [oldId, now] of Object.entries(REPLACED_COMPANIONS)) {
    const has = (id: string) => [...run.party.members, ...(run.party.dead ?? []), ...(run.entry?.members ?? []), ...(run.entry?.dead ?? [])].some((m) => m.id === id);
    if (!has(oldId)) continue;
    const to = has(now.id) ? run.heroId : now.id;
    const swap = (v: unknown): unknown => {
      if (v === oldId) return to;
      if (Array.isArray(v)) return v.map(swap);
      if (!v || typeof v !== 'object') return v;
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) {
        // a bond's key is the pair's ids, sorted and joined with '|'
        const key = k === oldId ? to : k.includes('|') && k.split('|').includes(oldId) ? k.split('|').map((id) => (id === oldId ? to : id)).sort().join('|') : k;
        out[key] = swap(x);
      }
      return out;
    };
    const party = (p: PartyState): PartyState => {
      const each = (list: ShinobiCharacter[] = []) => (to === now.id ? list.map((m) => (m.id === oldId ? standIn(m, now) : m)) : list.filter((m) => m.id !== oldId));
      const members = each(p.members);
      const dead = each(p.dead);
      const bonds = Object.fromEntries(Object.entries(p.bonds ?? {}).filter(([k]) => !k.split('|').includes(oldId) || to === now.id));
      return swap({ ...p, members, dead, bonds }) as PartyState;
    };
    const { log, ...rest } = run;
    run = { ...(swap({ ...rest, party: party(run.party), entry: party(run.entry ?? run.party) }) as Omit<MissionRun, 'log'>), log };
  }
  return run;
}

/**
 * A run saved before the clans were converted: its ninjas load with today's clans (rules/ninja.ts,
 * migrateCharacter). A ninja whose explosive tag jutsu becomes tags in its pouch (rules/pouch.ts) set
 * out without them in the backpack: they join it now, as they would have at the mission's start. A
 * removed companion's place goes to the companion who replaces it (replaceCompanions).
 */
export function migrateRun(saved: MissionRun): MissionRun {
  const r = replaceCompanions(saved);
  const party = (p: PartyState): PartyState => {
    const was = [...p.members, ...(p.dead ?? [])];
    const members = p.members.map(migrateCharacter);
    const dead = (p.dead ?? []).map(migrateCharacter);
    const grew = [...members, ...dead].reduce((n, now, i) => n + Math.max(0, pouchTags(now) - pouchTags(was[i])), 0);
    return { ...p, members, dead, ...(grew ? { supplies: { ...p.supplies, explosiveTags: p.supplies.explosiveTags + grew } } : {}) };
  };
  return { ...r, party: party(r.party), entry: party(r.entry ?? r.party) };
}

export function loadRun(): MissionRun | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as MissionRun;
    if (r?.version !== 1 || !MISSIONS.some((m) => m.id === r.missionId) || !r.party?.members) return null;
    const run = migrateRun(r);
    // A battle can't be saved halfway: it starts again from getting ready (older saves too).
    if (run.battle && run.battle.phase !== 'prep') run.battle = { id: run.battle.id, battle: run.battle.battle, ambush: run.battle.ambush, objective: run.battle.objective, phase: 'prep', attempt: run.battle.attempt ?? 0 };
    return run;
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
