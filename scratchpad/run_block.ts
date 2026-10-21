// ---------------------------------------------------------------------------------------------
// State of a mission in progress. Plain data, saved after every change.

interface BattleRun {
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

interface MissionRun {
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

const SAVE_KEY = 'shinobi5e.mission.v1';

function loadRun(): MissionRun | null {
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

function saveRun(r: MissionRun | null): void {
  try {
    if (r) localStorage.setItem(SAVE_KEY, JSON.stringify(r));
    else localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage can be full or blocked; the mission still plays.
  }
}

const missionOf = (r: MissionRun): MissionDef => MISSIONS.find((m) => m.id === r.missionId) ?? MISSIONS[0];

/** Adds events (and an optional heading) to the log; they become "What happened". */
function narrate(run: MissionRun, events: RuleEvent[], title?: string): MissionRun {
  const names = new Map([...run.entry.members, ...run.party.dead, ...run.party.members].map((m) => [m.id, m.name] as const));
  const name = (id: string) => names.get(id) ?? id;
  let id = run.nextLogId;
  const lines: LogLine[] = [];
  if (title) lines.push({ id: id++, text: title, tone: 'title' });
  for (const e of events) lines.push({ id: id++, ...describeEvent(e, name) });
  return { ...run, log: [...run.log, ...lines].slice(-400), nextLogId: id, recentFrom: run.nextLogId };
}

/** Who fights by default: for an ambush whoever kept watch, else the leader, else anyone standing. */
function defaultFighter(party: PartyState, ambush: boolean, exclude: string[] = []): string {
  const ok = party.members.filter((m) => isStanding(m) && !exclude.includes(m.id));
  const guard = ambush ? ok.find((m) => hasEffect(m.effects, 'watchful')) : undefined;
  return (guard ?? ok.find((m) => m.id === party.leaderId) ?? ok[0])?.id ?? '';
}

function newBattle(id: string, battle: MissionBattle, party: PartyState, opts: { ambush?: boolean; objective?: boolean } = {}): BattleRun {
  return { id, battle, ambush: !!opts.ambush, objective: !!opts.objective, phase: 'prep', fighterId: defaultFighter(party, !!opts.ambush), attempt: 0, fallen: [], pills: {} };
}

/** The party walks to a road node; a battle node opens its battle. */
function arrive(run: MissionRun, pos: RoadPos): MissionRun {
  const node = nodeAt(missionOf(run), pos)!;
  const t = travelLeg(run.party, node.id, node.hours);
  let r: MissionRun = { ...run, party: t.party, pos, nodeDone: false, zoneEnd: false, stop: null, camp: null, battle: null };
  r = narrate(r, t.events, `${node.name} · ${node.hours} h on the road`);
  r = { ...r, entry: r.party };
  if (node.kind === 'battle') r = { ...r, battle: newBattle(node.id, node.battle, r.party, { objective: node.objective }) };
  return r;
}

/** After the night raid: the interrupted morning. */
function morningAfterRaid(run: MissionRun): MissionRun {
  if (!run.camp) return run;
  const m = morning(run.party, run.camp, { interrupted: true });
  if (!m.ok) return run;
  return narrate({ ...run, party: m.party, camp: m.state }, m.events, 'An interrupted morning');
}

/** Presses Continue on the battle screen: folds the result in, or sends the next ninja in. */
function resolveBattle(run: MissionRun): MissionRun {
  const b = run.battle;
  if (!b?.report) return run;
  const fighter = run.party.members.find((m) => m.id === b.fighterId);
  const mine: BattleMemberResult = { ...b.report.members[0], id: b.fighterId, pillsTaken: b.pills[b.fighterId] ?? 0 };

  if (b.report.victory) {
    const fighters = [...b.fallen.map((f) => f.id), b.fighterId];
    const wear = flankWear(run.party, b.id, fighters, { threat: b.battle.threat, venom: b.battle.venom });
    const res = applyBattleResult(run.party, { victory: true, members: [...b.fallen, mine, ...wear] }, b.id, { ambush: b.ambush });
    let r = narrate({ ...run, party: res.party, battle: null }, res.events, `Victory: ${b.battle.title}`);
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
    const r = narrate({ ...run, party }, [], `${fighter?.name ?? 'The fighter'} falls! Another ninja can step in.`);
    return { ...r, battle: { ...b, phase: 'fell', fallen, fighterId: next, report: undefined } };
  }

  // Nobody is left standing.
  if (run.party.progress.difficulty !== 'legend' && !b.ambush) {
    const r = narrate({ ...run, party: run.entry }, [], `The whole party fell. ${b.battle.title} starts over from the road.`);
    return { ...r, battle: newBattle(b.id, b.battle, run.entry, { objective: b.objective }), stats: { ...r.stats, retries: r.stats.retries + 1 } };
  }
  const res = applyBattleResult(party, { victory: false, members: fallen }, b.id, { ambush: b.ambush });
  let r = narrate({ ...run, party: res.party, battle: null }, res.events, `Defeat: ${b.battle.title}`);
  r = { ...r, stats: { ...r.stats, falls: r.stats.falls + fallen.length } };
  if (res.gameOver) return { ...r, outcome: 'gameOver' };
  if (b.ambush) return morningAfterRaid(r);
  if (b.objective) return { ...narrate(r, [], 'The objective is lost. The survivors limp home.'), outcome: 'failed' };
  return narrate({ ...r, nodeDone: true }, [], 'The enemy left the party for dead. The survivors get up and go on.');
}

