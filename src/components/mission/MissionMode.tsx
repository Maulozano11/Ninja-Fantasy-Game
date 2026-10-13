import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Coffee,
  Crown,
  Flag,
  Flame,
  Map as MapIcon,
  Pill,
  RotateCcw,
  ScrollText,
  Skull,
  Swords,
  Tent,
  TriangleAlert,
  Users,
} from 'lucide-react';
import type { ShinobiCharacter } from '../../types/shinobi';
import type { Difficulty, PartyState } from '../../types/mission';
import { COMPANIONS, MISSIONS, MissionDef, nextPos, nodeAt, RoadNode } from '../../data/missions';
import type { ActivityId } from '../../data/campActivities';
import { BattleResult, DEFAULT_SUPPLIES, endMissionAtVillage, isStanding, takeSoldierPill } from '../../rules/mission';
import {
  chooseFire,
  doActivity,
  FireLevel,
  FoodLevel,
  morning,
  Outcome,
  rollNight,
  serveFood,
  spendChakraDie,
  spendHitDie,
  startCamp,
  startShortStop,
  stopActivity,
} from '../../rules/rest';
import { effectiveMaxHp } from '../../rules/derived';
import type { LogLine } from '../../game/eventText';
import {
  applyOutcome,
  BattleRun,
  continueRoad,
  intoNextZone,
  loadRun,
  missionOf,
  MissionRun,
  narrate,
  newBattle,
  resolveBattle,
  saveRun,
  startRun,
} from '../../game/missionRun';
import { soundManager } from '../../utils/audio';
import { ShinobiSpriteCanvas } from '../ShinobiSpriteCanvas';
import { TacticalCombat } from '../TacticalCombat';
import { Bar, classShort, LogLines, PartyPanel, RecentEvents, SuppliesBar } from './PartyPanel';
import { RestCamp } from './RestCamp';
import { ShortStop } from './ShortStop';

// ---------------------------------------------------------------------------------------------

const DIFFICULTIES: { id: Difficulty; name: string; text: string }[] = [
  { id: 'story', name: 'Story', text: 'To enjoy the story: lighter battles once the new battle engine arrives. A lost battle starts over; nobody dies.' },
  { id: 'normal', name: 'Normal', text: 'The intended challenge. A lost battle starts over from the road; nobody dies.' },
  { id: 'legend', name: 'Legend', text: 'Death is permanent and there is one save. If the whole party dies, the campaign starts over.' },
];

const btnMain = 'inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-bold text-white hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed';
const btnQuiet = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed';

export interface MissionModeProps {
  /** Your ninja from the creator. */
  hero: ShinobiCharacter;
  /** Your ninja back at the village after a mission, with its scars and traits (null if it died). */
  onHeroReturn: (hero: ShinobiCharacter | null) => void;
}

export function MissionMode({ hero, onHeroReturn }: MissionModeProps) {
  // A mission in progress picks up where it was left, even after leaving this screen.
  const [run, setRun] = useState<MissionRun | null>(() => loadRun());
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (run) saveRun(run);
  }, [run]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  /** Applies a rule outcome to the run, or shows why it couldn't be done. */
  const act = <S,>(o: Outcome<S>, patch: (r: MissionRun, state: S) => MissionRun, title?: string) => {
    if (!o.ok) {
      setNotice(o.reason);
      return;
    }
    soundManager.playSelect();
    setRun((r) => (r ? applyOutcome(r, o, patch, title) : r));
  };

  const start = (members: ShinobiCharacter[], leaderId: string, difficulty: Difficulty, noRandomness: boolean) => {
    soundManager.playSelect();
    setRun(startRun(MISSIONS[0], hero.id, members, { seed: Date.now() >>> 0, leaderId, difficulty, noRandomness }));
  };

  const finish = () => {
    if (!run) return;
    const home = endMissionAtVillage(run.party);
    onHeroReturn(home.party.members.find((m) => m.id === run.heroId) ?? null);
    saveRun(null);
    setRun(null);
  };

  const abandon = () => {
    saveRun(null);
    setRun(null);
  };

  if (!run) return <Village hero={hero} onStart={start} />;

  const mission = missionOf(run);
  const zone = mission.zones[run.pos.zone];
  const node = nodeAt(mission, run.pos)!;
  const recent = run.log.filter((l) => l.id >= run.recentFrom);
  const b = run.battle;

  // --- the battle screen --------------------------------------------------------------------
  if (b && b.phase === 'fighting') {
    const fighter = run.party.members.find((m) => m.id === b.fighterId)!;
    return (
      <div className="flex flex-col">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-amber-900/50 bg-amber-950/30 px-6 py-2 text-xs text-amber-100">
          <span className="font-bold uppercase tracking-widest text-amber-300">{mission.name}</span>
          <span>{b.ambush ? 'Night raid' : node.name}</span>
          <span>
            Fighting: <b>{fighter.name}</b> ({fighter.currentHp}/{effectiveMaxHp(fighter)} HP, {fighter.currentChakra} chakra)
          </span>
          {run.party.members.length > 1 && <span className="text-amber-200/70">The others hold the flanks off-screen.</span>}
        </div>
        <BattleScreen run={run} fighter={fighter} onReport={(rep) => setRun((r) => (r?.battle ? { ...r, battle: { ...r.battle, report: rep } } : r))} onContinue={() => setRun((r) => (r ? resolveBattle(r) : r))} />
      </div>
    );
  }

  // --- the end of the road ------------------------------------------------------------------
  if (run.outcome !== 'ongoing') {
    return <MissionEnd run={run} mission={mission} onHome={run.outcome === 'gameOver' ? abandon : finish} />;
  }

  // --- the road, the stop and the camp -------------------------------------------------------
  const next = nextPos(mission, run.pos);
  const nextNode = next ? nodeAt(mission, next) : null;
  const nextZone = next ? mission.zones[next.zone] : null;

  const onContinueRoad = () => {
    soundManager.playSelect();
    setRun((r) => (r ? continueRoad(r) : r));
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 md:px-6 py-5 space-y-4">
      <MissionHeader run={run} mission={mission} onAbandon={abandon} />
      <RoadMap mission={mission} run={run} />

      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-800 bg-rose-950/60 px-3 py-2 text-sm text-rose-200">
          <TriangleAlert className="w-4 h-4" /> {notice}
        </div>
      )}

      {run.camp && !(b && b.ambush) ? (
        <RestCamp
          party={run.party}
          camp={run.camp}
          zoneName={zone.name}
          nodeName={node.name}
          recent={recent}
          onFire={(fire: FireLevel, katonBy?: string) => act(chooseFire(run.party, run.camp!, fire, katonBy), (r, camp) => ({ ...r, camp }))}
          onActivity={(who: string, activity: ActivityId, opts) => act(doActivity(run.party, run.camp!, who, activity, opts), (r, camp) => ({ ...r, camp }))}
          onFood={(food: FoodLevel) => act(serveFood(run.party, run.camp!, food), (r, camp) => ({ ...r, camp }), 'Dinner')}
          onSleep={() =>
            act(
              rollNight(run.party, run.camp!),
              (r, camp) => ({ ...r, camp, stats: { ...r.stats, ambushes: r.stats.ambushes + (camp.night?.ambush ? 1 : 0) } }),
              'Night',
            )
          }
          onWake={() => act(morning(run.party, run.camp!), (r, camp) => ({ ...r, camp }), 'Morning')}
          onAmbush={() => setRun((r) => (r ? { ...r, battle: newBattle(`${node.id}:ambush`, mission.ambush, r.party, { ambush: true }) } : r))}
          onBreakCamp={() => setRun((r) => (r ? narrate({ ...r, camp: null, nodeDone: true }, [], 'Camp broken') : r))}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 space-y-4">
            {b ? (
              <BattlePrep
                run={run}
                battle={b}
                intro={b.ambush ? undefined : node.text}
                onFighter={(id) => setRun((r) => (r?.battle ? { ...r, battle: { ...r.battle, fighterId: id } } : r))}
                onPill={() => {
                  const n = b.pills[b.fighterId] ?? 0;
                  act(takeSoldierPill(run.party, b.fighterId, b.id, n), (r) => (r.battle ? { ...r, battle: { ...r.battle, pills: { ...r.battle.pills, [b.fighterId]: n + 1 } } } : r));
                }}
                onFight={() => {
                  soundManager.playSelect();
                  setRun((r) => (r?.battle ? { ...r, battle: { ...r.battle, phase: 'fighting', attempt: r.battle.attempt + 1, report: undefined } } : r));
                }}
              />
            ) : run.stop ? (
              <ShortStop
                party={run.party}
                stop={run.stop}
                onHitDie={(who) => act(spendHitDie(run.party, who), (r) => r)}
                onChakraDie={(who) => act(spendChakraDie(run.party, who), (r) => r)}
                onActivity={(who, activity, target) => act(stopActivity(run.party, run.stop!, who, activity, { target }), (r, stop) => ({ ...r, stop }))}
                onLeave={() => setRun((r) => (r ? intoNextZone(r) : r))}
              />
            ) : run.zoneEnd ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400">End of {zone.name}</div>
                <h2 className="text-xl font-bold text-white">Before {nextZone?.name}</h2>
                <p className="text-sm text-slate-300 max-w-[65ch]">
                  You can take a short stop here: an hour to spend Hit Dice and Chakra Dice and patch each other up. Only one per zone, and every hour on the road
                  makes the next camp more dangerous.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={btnMain} onClick={() => act(startShortStop(run.party), (r, stop) => ({ ...r, stop }), 'Short stop')}>
                    <Coffee className="w-4 h-4" /> Take a short stop (1 h)
                  </button>
                  <button type="button" className={btnQuiet} onClick={() => setRun((r) => (r ? intoNextZone(r) : r))}>
                    Push on <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <NodePanel
                node={node}
                zoneName={zone.name}
                done={run.nodeDone}
                party={run.party}
                nextLabel={nextNode ? `${nextZone && next && next.zone !== run.pos.zone ? 'Leave ' + zone.name : 'Go on to ' + nextNode.name} (${nextNode.hours} h)` : 'Finish the mission'}
                onCamp={() =>
                  node.kind === 'camp' &&
                  act(
                    startCamp(run.party, { nodeId: node.id, zoneDanger: zone.danger, ...node.site }),
                    (r, camp) => ({ ...r, camp, stats: { ...r.stats, camps: r.stats.camps + 1 } }),
                    `Camp at ${node.name}`,
                  )
                }
                onSkipCamp={() => setRun((r) => (r ? narrate({ ...r, nodeDone: true }, [], 'The party pushes on without camping.') : r))}
                onContinue={onContinueRoad}
              />
            )}
          </section>
          <aside className="space-y-3">
            <PartyPanel party={run.party} />
            <RecentEvents lines={recent} />
            <MissionLog log={run.log} />
          </aside>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

function BattleScreen({ run, fighter, onReport, onContinue }: { run: MissionRun; fighter: ShinobiCharacter; onReport: (r: BattleResult) => void; onContinue: () => void }) {
  const b = run.battle!;
  // The battle screen restarts whenever its encounter object changes, so keep it stable.
  const encounter = useMemo(
    () => ({ title: b.battle.title, description: b.battle.description, enemyType: b.battle.enemyType, weather: b.battle.weather }),
    [b.battle, b.id, b.attempt],
  );
  return <TacticalCombat key={`${b.id}:${b.attempt}`} playerCharacter={fighter} campaignEncounter={encounter} carryOver onBattleEnd={onReport} onContinue={onContinue} />;
}

function MissionHeader({ run, mission, onAbandon }: { run: MissionRun; mission: MissionDef; onAbandon: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const p = run.party.progress;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400">
          <span>Rank {mission.rank} mission</span>
          <span className={`rounded px-1.5 py-0.5 ${p.difficulty === 'legend' ? 'bg-rose-900 text-rose-100' : 'bg-slate-800 text-slate-300'}`}>{p.difficulty}</span>
          {p.noRandomness && <span className="rounded bg-slate-800 px-1.5 py-0.5 text-amber-300">no randomness</span>}
          <span className="text-slate-400">
            {p.hoursSpent} h spent · {p.hoursSinceCamp} h since camp
          </span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">{mission.name}</h1>
      </div>
      <div className="flex flex-col items-end gap-2">
        <SuppliesBar party={run.party} />
        {confirm ? (
          <span className="flex items-center gap-2 text-xs text-slate-300">
            Abandon the mission? Progress is lost.
            <button type="button" onClick={onAbandon} className="rounded bg-rose-700 px-2 py-1 font-bold text-white">
              Abandon
            </button>
            <button type="button" onClick={() => setConfirm(false)} className="rounded bg-slate-800 px-2 py-1">
              Keep going
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="text-[11px] text-slate-500 hover:text-slate-300 underline underline-offset-2">
            Abandon mission
          </button>
        )}
      </div>
    </div>
  );
}

function nodeIcon(n: RoadNode) {
  if (n.kind === 'camp') return <Tent className="w-4 h-4" />;
  if (n.objective) return <Flag className="w-4 h-4" />;
  return <Swords className="w-4 h-4" />;
}

/** The road: zones with their nodes, the short stop between zones, and where the party is. */
function RoadMap({ mission, run }: { mission: MissionDef; run: MissionRun }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-900 p-4">
      <div className="flex min-w-max items-stretch gap-3">
        {mission.zones.map((z, zi) => (
          <React.Fragment key={z.name}>
            {zi > 0 && (
              <div className="flex flex-col items-center justify-center px-1" title="Short stop between zones (one per zone)">
                <Coffee className={`w-4 h-4 ${run.party.progress.stopsTaken.includes(zi - 1) ? 'text-amber-300' : 'text-slate-600'}`} />
                <span className="text-[9px] text-slate-500 mt-0.5">stop</span>
              </div>
            )}
            <div className={`rounded-xl border px-3 py-2 ${zi === run.pos.zone ? 'border-cyan-800 bg-cyan-950/20' : 'border-slate-800 bg-slate-950/40'}`}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs font-bold text-white">{z.name}</span>
                <span className="text-[10px] text-slate-400" title="Base night danger in this zone">
                  {z.terrain} · moon {z.danger}%
                </span>
              </div>
              <div className="mt-2 flex items-center">
                {z.nodes.map((n, ni) => {
                  const before = zi < run.pos.zone || (zi === run.pos.zone && ni < run.pos.node);
                  const here = zi === run.pos.zone && ni === run.pos.node;
                  const done = before || (here && run.nodeDone);
                  return (
                    <React.Fragment key={n.id}>
                      {ni > 0 && <div className={`h-0.5 w-8 ${done || here ? 'bg-cyan-600' : 'bg-slate-700'}`} />}
                      <div className="flex flex-col items-center w-24">
                        <div
                          className={`grid place-items-center w-9 h-9 rounded-full border-2 ${
                            here ? 'border-cyan-300 bg-cyan-500 text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.5)]' : done ? 'border-emerald-700 bg-emerald-950 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-400'
                          }`}
                        >
                          {nodeIcon(n)}
                        </div>
                        <span className={`mt-1 text-center text-[10px] leading-tight ${here ? 'text-white font-semibold' : 'text-slate-400'}`}>{n.name}</span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function NodePanel({
  node,
  zoneName,
  done,
  party,
  nextLabel,
  onCamp,
  onSkipCamp,
  onContinue,
}: {
  node: RoadNode;
  zoneName: string;
  done: boolean;
  party: PartyState;
  nextLabel: string;
  onCamp: () => void;
  onSkipCamp: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400">
        {zoneName} · {node.kind === 'camp' ? 'Campsite' : node.kind === 'battle' && node.objective ? 'Objective' : 'Battle'}
      </div>
      <h2 className="text-xl font-bold text-white">{node.name}</h2>
      <p className="text-sm text-slate-300 max-w-[65ch]">{node.text}</p>
      {done ? (
        <button type="button" className={btnMain} onClick={onContinue}>
          {nextLabel} <ChevronRight className="w-4 h-4" />
        </button>
      ) : node.kind === 'camp' ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnMain} disabled={party.supplies.campKits < 1} onClick={onCamp}>
            <Flame className="w-4 h-4" /> Make camp (1 camp kit · {party.supplies.campKits} left)
          </button>
          <button type="button" className={btnQuiet} onClick={onSkipCamp}>
            Push on without camping
          </button>
        </div>
      ) : null}
    </div>
  );
}

function BattlePrep({
  run,
  battle: b,
  intro,
  onFighter,
  onPill,
  onFight,
}: {
  run: MissionRun;
  battle: BattleRun;
  intro?: string;
  onFighter: (id: string) => void;
  onPill: () => void;
  onFight: () => void;
}) {
  const fallenIds = b.fallen.map((f) => f.id);
  const able = run.party.members.filter((m) => isStanding(m) && !fallenIds.includes(m.id));
  const fighter = run.party.members.find((m) => m.id === b.fighterId);
  const pillsTaken = b.pills[b.fighterId] ?? 0;
  const pillBlock = !fighter ? 'Choose who fights' : run.party.supplies.soldierPills < 1 ? 'No soldier pills left' : fighter.currentChakra >= fighter.maxChakra ? 'Already at full chakra' : null;
  return (
    <div className={`rounded-2xl border p-5 space-y-4 ${b.ambush ? 'border-rose-800/70 bg-gradient-to-b from-rose-950/40 to-slate-950' : 'border-slate-800 bg-slate-900/70'}`}>
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-rose-300">
          {b.ambush ? 'Night raid' : b.objective ? 'Objective battle' : 'Battle'} · {b.battle.weather}
        </div>
        <h2 className="text-xl font-bold text-white">{b.battle.title}</h2>
        {intro && <p className="text-sm text-slate-300 max-w-[65ch] mt-1">{intro}</p>}
        <p className="text-sm text-slate-400 max-w-[65ch] mt-1">{b.battle.description}</p>
      </div>

      {b.phase === 'fell' && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-800 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">
          <Skull className="w-4 h-4" /> {b.fallen.map((f) => run.party.members.find((m) => m.id === f.id)?.name).join(', ')} fell. Who steps in?
        </div>
      )}

      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
          <Users className="w-4 h-4" /> Who fights on the battle screen?
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {able.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onFighter(m.id)}
              className={`flex items-center gap-2 rounded-xl border p-2 text-left ${m.id === b.fighterId ? 'border-cyan-400 bg-cyan-950/30' : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'}`}
            >
              <ShinobiSpriteCanvas character={m} size={52} showAura={false} />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                  {m.id === run.party.leaderId && <Crown className="w-3 h-3 text-amber-300" />}
                  {m.name}
                  <span className="text-[10px] font-normal text-slate-500">
                    {m.clan} · {classShort(m)}
                  </span>
                </div>
                <Bar value={m.currentHp} max={effectiveMaxHp(m)} tone="hp" />
                <Bar value={m.currentChakra} max={m.maxChakra} tone="chakra" />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={btnQuiet} disabled={!!pillBlock} onClick={onPill} title={pillBlock ?? '+2d6 chakra now; Crash (−2 to all rolls) after the battle; more than one pill between camps adds Exhaustion'}>
          <Pill className="w-4 h-4" /> Soldier pill ({run.party.supplies.soldierPills} left)
        </button>
        {pillsTaken > 0 && <span className="text-xs text-amber-300">{fighter?.name} took {pillsTaken}: Crash after this battle.</span>}
      </div>

      <p className="text-[11px] text-slate-500 max-w-[70ch]">
        Prototype: the current battle screen fights one ninja at a time. The others hold the flanks off-screen and come back with some HP and chakra lost,
        sometimes Bleeding. If the fighter falls, another one can step in. Party battles come with the new battle engine.
      </p>

      <button type="button" className={btnMain} disabled={!fighter || !isStanding(fighter)} onClick={onFight}>
        <Swords className="w-4 h-4" /> Fight
      </button>
    </div>
  );
}

function MissionLog({ log }: { log: LogLine[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-slate-400 hover:text-slate-200">
        <span className="flex items-center gap-1.5">
          <ScrollText className="w-3.5 h-3.5" /> Mission log ({log.length})
        </span>
        <ChevronRight className={`w-3.5 h-3.5 transition ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && <LogLines lines={log} className="max-h-96 overflow-y-auto px-3 pb-3" />}
    </div>
  );
}

function MissionEnd({ run, mission, onHome }: { run: MissionRun; mission: MissionDef; onHome: () => void }) {
  const s = run.stats;
  const title = run.outcome === 'complete' ? 'Mission complete' : run.outcome === 'failed' ? 'Mission failed' : 'The whole party has died';
  const text =
    run.outcome === 'complete'
      ? 'The hydra is dead and the ford is safe again. Back at the village everyone is restored; scars stay, and every Breakdown or Awakening leaves a small trait.'
      : run.outcome === 'failed'
        ? 'The objective is lost. The survivors return to the village.'
        : 'In Legend, death is permanent. If the whole party dies, the campaign starts over.';
  return (
    <div className="mx-auto w-full max-w-4xl px-4 md:px-6 py-10 space-y-5">
      <div className={`rounded-2xl border p-6 space-y-3 ${run.outcome === 'complete' ? 'border-emerald-800 bg-emerald-950/30' : 'border-rose-800 bg-rose-950/30'}`}>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
          {mission.name} · Rank {mission.rank}
        </div>
        <h1 className="text-3xl font-extrabold text-white">{title}</h1>
        <p className="text-sm text-slate-300 max-w-[65ch]">{text}</p>
        <dl className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-center">
          {[
            ['Hours', run.party.progress.hoursSpent],
            ['Battles won', s.battlesWon],
            ['Falls', s.falls],
            ['Camps', s.camps],
            ['Ambushes', s.ambushes],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-slate-950/60 py-2">
              <dt className="text-[10px] uppercase tracking-widest text-slate-500">{k}</dt>
              <dd className="text-xl font-bold text-white tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <button type="button" className={btnMain} onClick={onHome}>
          {run.outcome === 'gameOver' ? (
            <>
              <RotateCcw className="w-4 h-4" /> Start over
            </>
          ) : (
            <>
              Return to the village <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <PartyPanel party={run.party} />
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">Chronicle</div>
          <LogLines lines={run.log} className="max-h-[28rem] overflow-y-auto" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

function Village({
  hero,
  onStart,
}: {
  hero: ShinobiCharacter;
  onStart: (members: ShinobiCharacter[], leaderId: string, difficulty: Difficulty, noRandomness: boolean) => void;
}) {
  const mission = MISSIONS[0];
  const roster = COMPANIONS.filter((c) => c.id !== hero.id);
  const [picked, setPicked] = useState<string[]>(roster.slice(0, 2).map((c) => c.id));
  const [leaderId, setLeaderId] = useState(hero.id);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [noRandomness, setNoRandomness] = useState(false);
  const members = [hero, ...picked.map((id) => roster.find((c) => c.id === id)!).filter(Boolean)];
  const leader = members.some((m) => m.id === leaderId) ? leaderId : hero.id;

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 3 ? p : [...p, id]));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 md:px-6 py-6 space-y-5">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400 flex items-center gap-1.5">
          <MapIcon className="w-3.5 h-3.5" /> Village · mission board
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Missions</h1>
        <p className="text-sm text-slate-400 max-w-[70ch] mt-1">
          HP, chakra and effects now carry over from battle to battle. Rest on the road with short stops and camps, and get home before the party breaks.
        </p>
      </div>


      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <section className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Your party</h2>
            <p className="text-xs text-slate-500">Your ninja goes, plus up to 3 companions. The mission leader breaks ties when the party votes.</p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {[hero, ...roster].map((c) => {
                const isHero = c.id === hero.id;
                const on = isHero || picked.includes(c.id);
                const full = !on && picked.length >= 3;
                return (
                  <div
                    key={c.id}
                    className={`flex items-center gap-2 rounded-xl border p-2 ${on ? 'border-cyan-500 bg-cyan-950/25' : 'border-slate-800 bg-slate-900/60'} ${full ? 'opacity-50' : ''}`}
                  >
                    <ShinobiSpriteCanvas character={c} size={60} showAura={false} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-white truncate">
                        {c.name}
                        {isHero && <span className="rounded bg-cyan-500 px-1 text-[9px] font-black uppercase text-slate-950">You</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        Lv {c.level} · {c.clan} · {c.shinobiClass}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {c.maxHp} HP · {c.maxChakra} chakra · AC {c.armorClass}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {!isHero && (
                          <button
                            type="button"
                            disabled={full}
                            onClick={() => toggle(c.id)}
                            className={`rounded px-2 py-0.5 text-[11px] font-bold ${on ? 'bg-slate-700 text-white' : 'bg-cyan-600 text-white'} disabled:cursor-not-allowed`}
                          >
                            {on ? 'Leave behind' : 'Bring'}
                          </button>
                        )}
                        {on && (
                          <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
                            <input type="radio" name="leader" checked={leader === c.id} onChange={() => setLeaderId(c.id)} className="accent-amber-400" />
                            Leader
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Difficulty</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDifficulty(d.id)}
                  className={`rounded-xl border p-3 text-left ${difficulty === d.id ? (d.id === 'legend' ? 'border-rose-500 bg-rose-950/30' : 'border-cyan-500 bg-cyan-950/25') : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'}`}
                >
                  <div className="font-bold text-white">{d.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{d.text}</div>
                </button>
              ))}
            </div>
            <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer max-w-[70ch]">
              <input type="checkbox" checked={noRandomness} onChange={(e) => setNoRandomness(e.target.checked)} className="mt-0.5 accent-cyan-400" />
              <span>
                <b className="text-white">No-randomness mode</b> (outside battle): checks count the d20 as 10, and the ambush comes when the camps&apos; % add up to
                100.
              </span>
            </label>
          </section>
        </div>

        <aside className="space-y-3">
          <div className="rounded-2xl border border-amber-900/60 bg-gradient-to-b from-amber-950/30 to-slate-900/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-300">Rank {mission.rank} mission</span>
              <span className="text-[10px] text-slate-400">{mission.zones.reduce((n, z) => n + z.nodes.length, 0)} stops on the road</span>
            </div>
            <h2 className="text-xl font-bold text-white">{mission.name}</h2>
            <p className="text-sm text-slate-300">{mission.brief}</p>
            <ol className="space-y-1.5 text-xs">
              {mission.zones.map((z) => (
                <li key={z.name}>
                  <div className="font-semibold text-slate-200">
                    {z.name} <span className="font-normal text-slate-500">· {z.terrain} · moon {z.danger}%</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {z.nodes.map((n) => (
                      <span key={n.id} className="inline-flex items-center gap-1 rounded bg-slate-950/70 px-1.5 py-0.5 text-slate-300">
                        {nodeIcon(n)} {n.name}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
            <div className="text-[11px] text-slate-400">
              Backpack: {DEFAULT_SUPPLIES.rations} rations, {DEFAULT_SUPPLIES.campKits} camp kits, {DEFAULT_SUPPLIES.bandages} bandages, {DEFAULT_SUPPLIES.antidotes}{' '}
              antidote, {DEFAULT_SUPPLIES.soldierPills} soldier pills, {DEFAULT_SUPPLIES.explosiveTags} explosive tags, {DEFAULT_SUPPLIES.wireRolls} wire roll.
            </div>
            <button type="button" className={`${btnMain} w-full justify-center`} onClick={() => onStart(members, leader, difficulty, noRandomness)}>
              Set out with {members.length} {members.length === 1 ? 'ninja' : 'ninjas'} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">Prototype notes</div>
            <p>Solo play: you choose for every ninja. Local and online votes come later.</p>
            <p>The current battle screen fights one ninja at a time; the rest of the party holds the flanks off-screen.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
