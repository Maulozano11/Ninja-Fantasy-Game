import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Coffee,
  Crown,
  Flag,
  Flame,
  Map as MapIcon,
  RotateCcw,
  ScrollText,
  Swords,
  Tent,
  TriangleAlert,
  Users,
} from 'lucide-react';
import type { ShinobiCharacter } from '../../types/shinobi';
import type { Difficulty, PartyState } from '../../types/mission';
import { COMPANIONS, MISSIONS, MissionDef, nextPos, nodeAt, RoadNode } from '../../data/missions';
import type { ActivityId } from '../../data/campActivities';
import { DEFAULT_SUPPLIES, endMissionAtVillage, isStanding } from '../../rules/mission';
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
import { both, LogLine } from '../../game/eventText';
import type { PartyBattleResult } from '../../battle/result';
import { ruleText } from '../../game/ruleText';
import { Entry, pick, useLang } from '../../i18n';
import { LangToggle } from '../../i18n/LangToggle';
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
  resolvePartyBattle,
  saveRun,
  startRun,
} from '../../game/missionRun';
import { soundManager } from '../../utils/audio';
import { ShinobiSpriteCanvas } from '../ShinobiSpriteCanvas';
import { BattleScreen as PartyBattleScreen } from '../battle/BattleScreen';
import { createBattle } from '../../battle/engine';
import { campTraps, encounterSetup } from '../../battle/encounters';
import { hashString } from '../../rules/rng';
import { Bar, className, classShort, LogLines, PartyPanel, RecentEvents, SuppliesBar } from './PartyPanel';
import { RestCamp } from './RestCamp';
import { ShortStop } from './ShortStop';
import { T, WEATHER_ES } from './missionText';

// ---------------------------------------------------------------------------------------------

type Key = Parameters<typeof T>[0];

const DIFFICULTIES: { id: Difficulty; name: Key; text: Key; chip: Key }[] = [
  { id: 'story', name: 'diffStory', text: 'diffStoryText', chip: 'chipStory' },
  { id: 'normal', name: 'diffNormal', text: 'diffNormalText', chip: 'chipNormal' },
  { id: 'legend', name: 'diffLegend', text: 'diffLegendText', chip: 'chipLegend' },
];

/** Data names in the current language (Spanish fields fall back to English). */
const nameOf = (x: { name: string; nameEs?: string }): string => pick(x.name, x.nameEs);
const esName = (x: { name: string; nameEs?: string }): string => pick(x.name, x.nameEs, 'es');

const btnMain = 'inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-bold text-white hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed';
const btnQuiet = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed';

export interface MissionModeProps {
  /** Your ninja from the creator. */
  hero: ShinobiCharacter;
  /** Your ninja back at the village after a mission, with its scars and traits (null if it died). */
  onHeroReturn: (hero: ShinobiCharacter | null) => void;
}

export function MissionMode({ hero, onHeroReturn }: MissionModeProps) {
  useLang();
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
  const act = <S,>(o: Outcome<S>, patch: (r: MissionRun, state: S) => MissionRun, title?: Entry) => {
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
    return (
      <div className="flex flex-col">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-amber-900/50 bg-amber-950/30 px-6 py-1.5 text-xs text-amber-100">
          <span className="font-bold uppercase tracking-widest text-amber-300">{nameOf(mission)}</span>
          <span>{b.ambush ? T('nightRaid') : nameOf(node)}</span>
          <span className="ml-auto">
            <LangToggle />
          </span>
        </div>
        <PartyBattle run={run} onEnd={(res) => setRun((r) => (r ? resolvePartyBattle(r, res) : r))} />
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
          <TriangleAlert className="w-4 h-4" /> {ruleText(notice)}
        </div>
      )}

      {run.camp && !(b && b.ambush) ? (
        <RestCamp
          party={run.party}
          camp={run.camp}
          zoneName={nameOf(zone)}
          nodeName={nameOf(node)}
          recent={recent}
          onFire={(fire: FireLevel, katonBy?: string) => act(chooseFire(run.party, run.camp!, fire, katonBy), (r, camp) => ({ ...r, camp }))}
          onActivity={(who: string, activity: ActivityId, opts) => act(doActivity(run.party, run.camp!, who, activity, opts), (r, camp) => ({ ...r, camp }))}
          onFood={(food: FoodLevel) => act(serveFood(run.party, run.camp!, food), (r, camp) => ({ ...r, camp }), both(T, 'logDinner'))}
          onSleep={() =>
            act(
              rollNight(run.party, run.camp!),
              (r, camp) => ({ ...r, camp, stats: { ...r.stats, ambushes: r.stats.ambushes + (camp.night?.ambush ? 1 : 0) } }),
              both(T, 'logNight'),
            )
          }
          onWake={() => act(morning(run.party, run.camp!), (r, camp) => ({ ...r, camp }), both(T, 'logMorning'))}
          onAmbush={() => setRun((r) => (r ? { ...r, battle: newBattle(`${node.id}:ambush`, mission.ambush, r.party, { ambush: true }) } : r))}
          onBreakCamp={() => setRun((r) => (r ? narrate({ ...r, camp: null, nodeDone: true }, [], both(T, 'logCampBroken')) : r))}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 space-y-4">
            {b ? (
              <BattlePrep
                run={run}
                battle={b}
                intro={b.ambush ? undefined : pick(node.text, node.textEs)}
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
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400">{T('endOf', { zone: nameOf(zone) })}</div>
                <h2 className="text-xl font-bold text-white">{T('before', { zone: nextZone ? nameOf(nextZone) : '' })}</h2>
                <p className="text-sm text-slate-300 max-w-[65ch]">{T('stopOffer')}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={btnMain} onClick={() => act(startShortStop(run.party), (r, stop) => ({ ...r, stop }), both(T, 'logShortStop'))}>
                    <Coffee className="w-4 h-4" /> {T('takeStop')}
                  </button>
                  <button type="button" className={btnQuiet} onClick={() => setRun((r) => (r ? intoNextZone(r) : r))}>
                    {T('pushOn')} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <NodePanel
                node={node}
                zoneName={nameOf(zone)}
                done={run.nodeDone}
                party={run.party}
                nextLabel={
                  nextNode
                    ? nextZone && next && next.zone !== run.pos.zone
                      ? T('leaveZone', { zone: nameOf(zone), hours: nextNode.hours })
                      : T('goOnTo', { node: nameOf(nextNode), hours: nextNode.hours })
                    : T('finish')
                }
                onCamp={() =>
                  node.kind === 'camp' &&
                  act(
                    startCamp(run.party, { nodeId: node.id, zoneDanger: zone.danger, ...node.site }),
                    (r, camp) => ({ ...r, camp, stats: { ...r.stats, camps: r.stats.camps + 1 } }),
                    both(T, 'logCampAt', { node: node.name }, { node: esName(node) }),
                  )
                }
                onSkipCamp={() => setRun((r) => (r ? narrate({ ...r, nodeDone: true }, [], both(T, 'logPushOn')) : r))}
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

/** The whole party fights the node's battle on the battle map. */
function PartyBattle({ run, onEnd }: { run: MissionRun; onEnd: (r: PartyBattleResult) => void }) {
  const b = run.battle!;
  const initial = useMemo(() => {
    const fighters = run.party.members.filter(isStanding).slice(0, 4);
    return createBattle(
      encounterSetup(
        b.battle.encounter,
        fighters.map((c) => ({ character: c })),
        {
          seed: hashString(`${run.party.progress.seed}:${b.id}:${b.attempt}`),
          difficulty: run.party.progress.difficulty,
          weather: b.battle.weather,
          supplies: {
            soldierPills: run.party.supplies.soldierPills,
            bandages: run.party.supplies.bandages,
            antidotes: run.party.supplies.antidotes,
            explosiveTags: run.party.supplies.explosiveTags,
          },
          // Bells on the perimeter: nobody is caught asleep. The perimeter traps wait on the raiders' paths.
          partySurprised: b.ambush && !run.camp?.bells,
          traps: b.ambush ? campTraps(run.camp?.traps ?? []) : [],
        },
      ),
    );
    // A battle starts once per attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.id, b.attempt]);
  return <PartyBattleScreen key={`${b.id}:${b.attempt}`} initial={initial} title={pick(b.battle.title, b.battle.titleEs)} height="calc(100vh - 96px)" onEnd={(res) => onEnd(res)} />;
}

function MissionHeader({ run, mission, onAbandon }: { run: MissionRun; mission: MissionDef; onAbandon: () => void }) {
  useLang();
  const [confirm, setConfirm] = useState(false);
  const p = run.party.progress;
  const diff = DIFFICULTIES.find((d) => d.id === p.difficulty);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400">
          <span>{T('rankMission', { rank: mission.rank })}</span>
          <span className={`rounded px-1.5 py-0.5 ${p.difficulty === 'legend' ? 'bg-rose-900 text-rose-100' : 'bg-slate-800 text-slate-300'}`}>{diff ? T(diff.chip) : p.difficulty}</span>
          {p.noRandomness && <span className="rounded bg-slate-800 px-1.5 py-0.5 text-amber-300">{T('noRandomness')}</span>}
          <span className="text-slate-400">{T('hours', { spent: p.hoursSpent, since: p.hoursSinceCamp })}</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">{nameOf(mission)}</h1>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <SuppliesBar party={run.party} />
          <LangToggle />
        </div>
        {confirm ? (
          <span className="flex items-center gap-2 text-xs text-slate-300">
            {T('abandonAsk')}
            <button type="button" onClick={onAbandon} className="rounded bg-rose-700 px-2 py-1 font-bold text-white">
              {T('abandon')}
            </button>
            <button type="button" onClick={() => setConfirm(false)} className="rounded bg-slate-800 px-2 py-1">
              {T('keepGoing')}
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="text-[11px] text-slate-500 hover:text-slate-300 underline underline-offset-2">
            {T('abandonMission')}
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
  useLang();
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-900 p-4">
      <div className="flex min-w-max items-stretch gap-3">
        {mission.zones.map((z, zi) => (
          <React.Fragment key={z.name}>
            {zi > 0 && (
              <div className="flex flex-col items-center justify-center px-1" title={T('stopTitle')}>
                <Coffee className={`w-4 h-4 ${run.party.progress.stopsTaken.includes(zi - 1) ? 'text-amber-300' : 'text-slate-600'}`} />
                <span className="text-[9px] text-slate-500 mt-0.5">{T('stop')}</span>
              </div>
            )}
            <div className={`rounded-xl border px-3 py-2 ${zi === run.pos.zone ? 'border-cyan-800 bg-cyan-950/20' : 'border-slate-800 bg-slate-950/40'}`}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs font-bold text-white">{nameOf(z)}</span>
                <span className="text-[10px] text-slate-400" title={T('dangerTitle')}>
                  {T('zoneLine', { terrain: pick(z.terrain, z.terrainEs), danger: z.danger })}
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
                        <span className={`mt-1 text-center text-[10px] leading-tight ${here ? 'text-white font-semibold' : 'text-slate-400'}`}>{nameOf(n)}</span>
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
  useLang();
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400">
        {zoneName} · {node.kind === 'camp' ? T('campsite') : node.kind === 'battle' && node.objective ? T('objective') : T('battle')}
      </div>
      <h2 className="text-xl font-bold text-white">{nameOf(node)}</h2>
      <p className="text-sm text-slate-300 max-w-[65ch]">{pick(node.text, node.textEs)}</p>
      {done ? (
        <button type="button" className={btnMain} onClick={onContinue}>
          {nextLabel} <ChevronRight className="w-4 h-4" />
        </button>
      ) : node.kind === 'camp' ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnMain} disabled={party.supplies.campKits < 1} onClick={onCamp}>
            <Flame className="w-4 h-4" /> {T('makeCamp', { n: party.supplies.campKits })}
          </button>
          <button type="button" className={btnQuiet} onClick={onSkipCamp}>
            {T('skipCamp')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function BattlePrep({ run, battle: b, intro, onFight }: { run: MissionRun; battle: BattleRun; intro?: string; onFight: () => void }) {
  useLang();
  const fighters = run.party.members.filter(isStanding).slice(0, 4);
  return (
    <div className={`rounded-2xl border p-5 space-y-4 ${b.ambush ? 'border-rose-800/70 bg-gradient-to-b from-rose-950/40 to-slate-950' : 'border-slate-800 bg-slate-900/70'}`}>
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-rose-300">
          {b.ambush ? T('nightRaid') : b.objective ? T('objectiveBattle') : T('battle')} · {pick(b.battle.weather, WEATHER_ES[b.battle.weather])}
        </div>
        <h2 className="text-xl font-bold text-white">{pick(b.battle.title, b.battle.titleEs)}</h2>
        {intro && <p className="text-sm text-slate-300 max-w-[65ch] mt-1">{intro}</p>}
        <p className="text-sm text-slate-400 max-w-[65ch] mt-1">{pick(b.battle.description, b.battle.descriptionEs)}</p>
      </div>

      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
          <Users className="w-4 h-4" /> {T('partyFights')}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {fighters.map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-2">
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
            </div>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-slate-400 max-w-[70ch]">{T(b.ambush ? (run.camp?.bells ? 'raidBells' : 'raidNoBells') : 'partyHelp')}</p>

      <button type="button" className={btnMain} disabled={!fighters.length} onClick={onFight}>
        <Swords className="w-4 h-4" /> {T('fight')}
      </button>
    </div>
  );
}

function MissionLog({ log }: { log: LogLine[] }) {
  useLang();
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-slate-400 hover:text-slate-200">
        <span className="flex items-center gap-1.5">
          <ScrollText className="w-3.5 h-3.5" /> {T('missionLog', { n: log.length })}
        </span>
        <ChevronRight className={`w-3.5 h-3.5 transition ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && <LogLines lines={log} className="max-h-96 overflow-y-auto px-3 pb-3" />}
    </div>
  );
}

function MissionEnd({ run, mission, onHome }: { run: MissionRun; mission: MissionDef; onHome: () => void }) {
  useLang();
  const s = run.stats;
  const title = run.outcome === 'complete' ? T('complete') : run.outcome === 'failed' ? T('failed') : T('gameOver');
  const text = run.outcome === 'complete' ? T('completeText') : run.outcome === 'failed' ? T('failedText') : T('gameOverText');
  return (
    <div className="mx-auto w-full max-w-4xl px-4 md:px-6 py-10 space-y-5">
      <div className={`rounded-2xl border p-6 space-y-3 ${run.outcome === 'complete' ? 'border-emerald-800 bg-emerald-950/30' : 'border-rose-800 bg-rose-950/30'}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">{T('endRank', { mission: nameOf(mission), rank: mission.rank })}</div>
          <LangToggle />
        </div>
        <h1 className="text-3xl font-extrabold text-white">{title}</h1>
        <p className="text-sm text-slate-300 max-w-[65ch]">{text}</p>
        <dl className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-center">
          {[
            [T('statHours'), run.party.progress.hoursSpent],
            [T('statWon'), s.battlesWon],
            [T('statFalls'), s.falls],
            [T('statCamps'), s.camps],
            [T('statAmbushes'), s.ambushes],
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
              <RotateCcw className="w-4 h-4" /> {T('startOver')}
            </>
          ) : (
            <>
              {T('returnHome')} <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <PartyPanel party={run.party} />
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">{T('chronicle')}</div>
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
  useLang();
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400 flex items-center gap-1.5">
            <MapIcon className="w-3.5 h-3.5" /> {T('board')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">{T('missions')}</h1>
          <p className="text-sm text-slate-400 max-w-[70ch] mt-1">{T('villageIntro')}</p>
        </div>
        <LangToggle />
      </div>


      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <section className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">{T('yourParty')}</h2>
            <p className="text-xs text-slate-500">{T('partyRules')}</p>
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
                        {isHero && <span className="rounded bg-cyan-500 px-1 text-[9px] font-black uppercase text-slate-950">{T('you')}</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{T('levelLine', { level: c.level, clan: c.clan, cls: className(c) })}</div>
                      <div className="text-[10px] font-mono text-slate-500">{T('statsLine', { hp: c.maxHp, chakra: c.maxChakra, ac: c.armorClass })}</div>
                      <div className="mt-1 flex items-center gap-2">
                        {!isHero && (
                          <button
                            type="button"
                            disabled={full}
                            onClick={() => toggle(c.id)}
                            className={`rounded px-2 py-0.5 text-[11px] font-bold ${on ? 'bg-slate-700 text-white' : 'bg-cyan-600 text-white'} disabled:cursor-not-allowed`}
                          >
                            {on ? T('leaveBehind') : T('bring')}
                          </button>
                        )}
                        {on && (
                          <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
                            <input type="radio" name="leader" checked={leader === c.id} onChange={() => setLeaderId(c.id)} className="accent-amber-400" />
                            {T('leader')}
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
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">{T('difficulty')}</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDifficulty(d.id)}
                  className={`rounded-xl border p-3 text-left ${difficulty === d.id ? (d.id === 'legend' ? 'border-rose-500 bg-rose-950/30' : 'border-cyan-500 bg-cyan-950/25') : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'}`}
                >
                  <div className="font-bold text-white">{T(d.name)}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{T(d.text)}</div>
                </button>
              ))}
            </div>
            <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer max-w-[70ch]">
              <input type="checkbox" checked={noRandomness} onChange={(e) => setNoRandomness(e.target.checked)} className="mt-0.5 accent-cyan-400" />
              <span>
                <b className="text-white">{T('noRandomnessMode')}</b>
                {T('noRandomnessText')}
              </span>
            </label>
          </section>
        </div>

        <aside className="space-y-3">
          <div className="rounded-2xl border border-amber-900/60 bg-gradient-to-b from-amber-950/30 to-slate-900/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-300">{T('rankMission', { rank: mission.rank })}</span>
              <span className="text-[10px] text-slate-400">{T('stopsOnRoad', { n: mission.zones.reduce((n, z) => n + z.nodes.length, 0) })}</span>
            </div>
            <h2 className="text-xl font-bold text-white">{nameOf(mission)}</h2>
            <p className="text-sm text-slate-300">{pick(mission.brief, mission.briefEs)}</p>
            <ol className="space-y-1.5 text-xs">
              {mission.zones.map((z) => (
                <li key={z.name}>
                  <div className="font-semibold text-slate-200">
                    {nameOf(z)} <span className="font-normal text-slate-500">· {T('zoneLine', { terrain: pick(z.terrain, z.terrainEs), danger: z.danger })}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {z.nodes.map((n) => (
                      <span key={n.id} className="inline-flex items-center gap-1 rounded bg-slate-950/70 px-1.5 py-0.5 text-slate-300">
                        {nodeIcon(n)} {nameOf(n)}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
            <div className="text-[11px] text-slate-400">
              {T('backpack', {
                rations: DEFAULT_SUPPLIES.rations,
                kits: DEFAULT_SUPPLIES.campKits,
                bandages: DEFAULT_SUPPLIES.bandages,
                antidotes: DEFAULT_SUPPLIES.antidotes,
                pills: DEFAULT_SUPPLIES.soldierPills,
                tags: DEFAULT_SUPPLIES.explosiveTags,
                wire: DEFAULT_SUPPLIES.wireRolls,
              })}
            </div>
            <button type="button" className={`${btnMain} w-full justify-center`} onClick={() => onStart(members, leader, difficulty, noRandomness)}>
              {T(members.length === 1 ? 'setOutOne' : 'setOutMany', { n: members.length })} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">{T('notes')}</div>
            <p>{T('notesSolo')}</p>
            <p>{T('notesBattle')}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
