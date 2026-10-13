import React, { useMemo, useState } from 'react';
import { Bell, Check, ChevronRight, Eye, Flame, Moon, Soup, Sun, Swords, TriangleAlert } from 'lucide-react';
import type { ShinobiCharacter } from '../../types/shinobi';
import type { PartyState, SupplyId } from '../../types/mission';
import { ActivityId, CAMP_ACTIVITIES, CampActivity, STICKS_PER_CAMP } from '../../data/campActivities';
import { checkAdvantage, cannotBeSurprised, skillModifier, successChance } from '../../rules/checks';
import { effectiveMaxHp } from '../../rules/derived';
import { activityBlocker, ambushChance, ambushParts, CampState, FireLevel, FoodLevel, healingJutsuOf, serveFood } from '../../rules/rest';
import { isUnconscious } from '../../rules/ninja';
import { CampScene, IncenseSticks } from './CampScene';
import type { LogLine } from '../../game/eventText';
import { PartyPanel, RecentEvents } from './PartyPanel';

type CampStep = 'fire' | 'activities' | 'food' | 'night' | 'ambush' | 'morning' | 'done';

const STEPS: { id: CampStep; label: string }[] = [
  { id: 'fire', label: 'Fire' },
  { id: 'activities', label: 'Activities' },
  { id: 'food', label: 'Dinner' },
  { id: 'night', label: 'Night' },
  { id: 'morning', label: 'Morning' },
];

const ELEMENTS = ['Fire', 'Water', 'Earth', 'Wind', 'Lightning'];

const ONE: Record<SupplyId, string> = {
  rations: 'ration',
  campKits: 'camp kit',
  bandages: 'bandage',
  antidotes: 'antidote',
  soldierPills: 'soldier pill',
  explosiveTags: 'explosive tag',
  wireRolls: 'wire roll',
};

/** Activities done with chakra show the ninja making hand signs in the scene. */
const SIGNS: ActivityId[] = [
  'heal_jutsu',
  'meditate',
  'train_jutsu',
  'elemental_meditation',
  'wood_shelter',
  'seal_barrier',
  'wood_skin',
  'warding_seal',
  'seal_poison',
  'camp_illusion',
  'peaceful_sleep',
  'byakugan_watch',
  'sharingan_reading',
  'shared_vitality',
  'close_tenketsu',
];

function optionsFor(act: CampActivity, party: PartyState): { key: string; label: string }[] | null {
  switch (act.id) {
    case 'perimeter_trap':
      return [
        { key: 'tag', label: `Explosive tag (${party.supplies.explosiveTags})` },
        { key: 'wire', label: `Wire (${party.supplies.wireRolls})` },
      ];
    case 'warding_seal':
    case 'elemental_meditation':
      return ELEMENTS.map((e) => ({ key: e, label: e }));
    case 'shared_vitality':
      return [
        { key: 'hp', label: 'HP' },
        { key: 'chakra', label: 'Chakra' },
      ];
    case 'make_pills':
      return [
        { key: 'pill', label: 'Soldier pill' },
        { key: 'antidote', label: 'Antidote' },
      ];
    case 'make_materials':
      return [
        { key: 'tag', label: 'Explosive tag' },
        { key: 'wire', label: 'Wire roll' },
      ];
    default:
      return null;
  }
}

function costText(act: CampActivity, c: ShinobiCharacter): string[] {
  const out: string[] = [];
  if (act.supplies) out.push(act.supplies.map((s) => `1 ${ONE[s]}`).join(' or '));
  if (act.chakra === 'jutsu') {
    const j = healingJutsuOf(c);
    out.push(j ? `${j.chakraCost} chakra (${j.name})` : 'a healing jutsu');
  }
  if (act.chakra === 'quarterMax') out.push(`${Math.ceil(c.maxChakra / 4)} chakra`);
  return out;
}

const pct = (p: number) => `${Math.round(p * 100)} %`;

function checkChance(act: CampActivity, c: ShinobiCharacter): string | null {
  if (act.id === 'hunt') return `Survival DC 12: ${pct(successChance(skillModifier(c, 'survival'), 12, checkAdvantage(c, 'survival')))}`;
  if (act.id === 'field_surgery') return `Medicine DC 13: ${pct(successChance(skillModifier(c, 'medicine'), 13, checkAdvantage(c, 'medicine')))}`;
  return null;
}

/** Why the card can't be used at all (no target or option would do), or null. */
function cardBlocker(party: PartyState, camp: CampState, who: string, act: CampActivity): string | null {
  if (act.target === 'other' || act.target === 'any') {
    const targets = party.members.filter((m) => act.target === 'any' || m.id !== who);
    if (!targets.length) return 'Needs another ninja';
    const blocks = targets.map((t) => activityBlocker(party, camp, who, act, { target: t.id }));
    return blocks.includes(null) ? null : blocks[0];
  }
  return activityBlocker(party, camp, who, act);
}

export interface RestCampProps {
  party: PartyState;
  camp: CampState;
  zoneName: string;
  nodeName: string;
  recent: LogLine[];
  onFire: (fire: FireLevel, katonBy?: string) => void;
  onActivity: (who: string, activity: ActivityId, opts: { target?: string; option?: string; amount?: number }) => void;
  onFood: (food: FoodLevel) => void;
  onSleep: () => void;
  onWake: () => void;
  onAmbush: () => void;
  onBreakCamp: () => void;
}

export function RestCamp({ party, camp, zoneName, nodeName, recent, onFire, onActivity, onFood, onSleep, onWake, onAmbush, onBreakCamp }: RestCampProps) {
  const standing = party.members.filter((m) => m.currentHp > 0 && !isUnconscious(m));
  const [selected, setSelected] = useState<string>(standing[0]?.id ?? party.members[0]?.id ?? '');
  const [open, setOpen] = useState<ActivityId | null>(null);
  const [target, setTarget] = useState<string>('');
  const [option, setOption] = useState<string>('');
  const [amount, setAmount] = useState(10);
  const [toDinner, setToDinner] = useState(false);

  const step: CampStep = !camp.fire
    ? 'fire'
    : !camp.food
      ? toDinner
        ? 'food'
        : 'activities'
      : !camp.night
        ? 'night'
        : camp.night.ambush && !camp.morningDone
          ? 'ambush'
          : !camp.morningDone
            ? 'morning'
            : 'done';
  const stepIndex = STEPS.findIndex((s) => s.id === (step === 'ambush' ? 'night' : step === 'done' ? 'morning' : step));

  const danger = camp.night?.chance ?? ambushChance(party, camp);
  const me = party.members.find((m) => m.id === selected) ?? party.members[0];
  const poses = useMemo(() => (open && SIGNS.includes(open) && me ? { [me.id]: 'handsigns' as const } : undefined), [open, me]);

  const choose = (act: CampActivity) => {
    if (open === act.id) return setOpen(null);
    setOpen(act.id);
    const others = party.members.filter((m) => m.id !== selected);
    const hurt = [...(act.target === 'other' ? others : party.members)].sort((a, b) => a.currentHp / effectiveMaxHp(a) - b.currentHp / effectiveMaxHp(b));
    setTarget(act.target === 'other' || act.target === 'any' ? hurt[0]?.id ?? '' : '');
    const opts = optionsFor(act, party);
    setOption(act.id === 'perimeter_trap' ? (party.supplies.explosiveTags > 0 ? 'tag' : 'wire') : opts?.[0]?.key ?? '');
    setAmount(10);
  };

  const confirm = (act: CampActivity) => {
    onActivity(selected, act.id, { target: target || undefined, option: option || undefined, amount: act.id === 'shared_vitality' ? amount : undefined });
    setOpen(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-300">
            Camp {camp.campNo} · {zoneName}
          </div>
          <h2 className="text-xl font-bold text-white">{nodeName}</h2>
        </div>
        <ol className="flex flex-wrap items-center gap-1 text-[11px]">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex items-center gap-1">
              <span
                className={`rounded-full px-2.5 py-1 font-semibold ${
                  i < stepIndex ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : i === stepIndex ? 'bg-amber-400 text-slate-950' : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                {i < stepIndex && <Check className="inline w-3 h-3 mr-0.5 -mt-0.5" />}
                {s.label}
              </span>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-slate-600" />}
            </li>
          ))}
        </ol>
      </div>

      <CampScene
        members={party.members}
        fire={camp.fire}
        asleep={!!camp.night}
        dawn={camp.morningDone}
        alarm={!!camp.night?.ambush && !camp.morningDone}
        shrine={camp.site.shrine}
        danger={danger}
        dangerLabel={camp.night ? (camp.night.ambush ? 'Ambush!' : 'A quiet night') : `${camp.site.zoneDanger} % in this zone`}
        selected={step === 'activities' ? selected : undefined}
        onSelect={step === 'activities' ? (id) => (setSelected(id), setOpen(null)) : undefined}
        sticksUsed={camp.sticksUsed}
        poses={poses}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 space-y-3">
          {step === 'fire' && <FireStep party={party} camp={camp} onFire={onFire} />}

          {step === 'activities' && me && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {party.members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => (setSelected(m.id), setOpen(null))}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                      m.id === selected ? 'border-cyan-400 bg-cyan-950/40 text-white' : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {m.name}
                    <IncenseSticks used={camp.sticksUsed[m.id] ?? 0} compact />
                  </button>
                ))}
                <span className="text-[11px] text-slate-500">Each ninja has {STICKS_PER_CAMP} incense sticks tonight.</span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {CAMP_ACTIVITIES.filter(
                  (a) =>
                    !a.viaFire &&
                    (!a.requires?.clan || a.requires.clan === me.clan) &&
                    (!a.requires?.shinobiClass || a.requires.shinobiClass === me.shinobiClass) &&
                    (a.chakra !== 'jutsu' || !!healingJutsuOf(me)),
                ).map((act) => {
                  const block = cardBlocker(party, camp, me.id, act);
                  const done = camp.done.some((d) => d.who === me.id && d.activity === act.id);
                  const special = !!act.requires?.clan || !!act.requires?.shinobiClass;
                  const costs = costText(act, me);
                  const chance = checkChance(act, me);
                  const after = act.ambush ? ambushChance(party, { ...camp, done: [...camp.done, { who: me.id, activity: act.id }] }) : null;
                  const isOpen = open === act.id && !block;
                  const opts = optionsFor(act, party);
                  const finalBlock = isOpen ? activityBlocker(party, camp, me.id, act, { target: target || undefined, option: option || undefined }) : block;
                  return (
                    <div
                      key={act.id}
                      className={`rounded-xl border p-3 transition ${
                        isOpen ? 'border-cyan-400 bg-slate-900 sm:col-span-2' : block ? 'border-slate-800 bg-slate-950/60 opacity-60' : 'border-slate-700 bg-slate-900/80 hover:border-cyan-700'
                      }`}
                    >
                      <button type="button" disabled={!!block} onClick={() => choose(act)} className="w-full text-left disabled:cursor-not-allowed">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-bold text-sm text-white">
                              {act.name}
                              {special && <span className="rounded bg-violet-900/60 px-1 text-[9px] font-semibold uppercase tracking-wide text-violet-200">{act.requires?.clan ?? me.shinobiClass.split(' ')[0]}</span>}
                              {done && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                            </div>
                            <p className="text-[11px] leading-snug text-slate-400 mt-0.5">{act.description}</p>
                          </div>
                          <span className="shrink-0 flex items-center gap-1 text-[10px] text-amber-200" title={`${act.sticks} incense stick${act.sticks > 1 ? 's' : ''}`}>
                            {act.sticks}
                            <Flame className="w-3 h-3" />
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-mono">
                          {costs.map((t) => (
                            <span key={t} className="text-slate-300">
                              {t}
                            </span>
                          ))}
                          {chance && <span className="text-cyan-300">{chance}</span>}
                          {after !== null && (
                            <span className="text-amber-300">
                              Moon {danger}% → {after}%
                            </span>
                          )}
                          {block && <span className="text-rose-300">{block}</span>}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
                          {(act.target === 'other' || act.target === 'any') && (
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <span className="text-slate-500 w-14">Target</span>
                              {party.members
                                .filter((m) => act.target === 'any' || m.id !== me.id)
                                .map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setTarget(m.id)}
                                    className={`rounded-md border px-2 py-1 ${target === m.id ? 'border-cyan-400 bg-cyan-950 text-white' : 'border-slate-700 bg-slate-950 text-slate-300'}`}
                                  >
                                    {m.id === me.id ? `${m.name} (self)` : m.name} <span className="font-mono text-[10px] text-slate-400">{m.currentHp}/{effectiveMaxHp(m)}</span>
                                  </button>
                                ))}
                            </div>
                          )}
                          {opts && (
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <span className="text-slate-500 w-14">Option</span>
                              {opts.map((o) => (
                                <button
                                  key={o.key}
                                  type="button"
                                  onClick={() => setOption(o.key)}
                                  className={`rounded-md border px-2 py-1 ${option === o.key ? 'border-cyan-400 bg-cyan-950 text-white' : 'border-slate-700 bg-slate-950 text-slate-300'}`}
                                >
                                  {o.label}
                                </button>
                              ))}
                            </div>
                          )}
                          {act.id === 'shared_vitality' && (
                            <label className="flex items-center gap-2 text-xs text-slate-300">
                              <span className="text-slate-500 w-14">Amount</span>
                              <input type="range" min={1} max={10} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="accent-cyan-400" />
                              <span className="font-mono w-6">{amount}</span>
                              <span className="text-slate-500">(keeps at least 1 HP)</span>
                            </label>
                          )}
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              disabled={!!finalBlock}
                              onClick={() => confirm(act)}
                              className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                            >
                              Do it · {act.sticks} {act.sticks > 1 ? 'sticks' : 'stick'}
                            </button>
                            {finalBlock && <span className="text-xs text-rose-300">{finalBlock}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                <span className="text-xs text-slate-400">Activities end when dinner is served. Ninjas with sticks left can still act.</span>
                <button
                  type="button"
                  onClick={() => setToDinner(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-white"
                >
                  <Soup className="w-4 h-4" /> Go to dinner
                </button>
              </div>
            </div>
          )}

          {step === 'food' && <FoodStep party={party} camp={camp} onFood={onFood} onBack={() => setToDinner(false)} />}

          {step === 'night' && <NightStep party={party} camp={camp} onSleep={onSleep} />}

          {step === 'ambush' && (
            <div className="rounded-2xl border border-rose-700/70 bg-gradient-to-b from-rose-950/50 to-slate-950 p-4 space-y-3">
              <div className="flex items-center gap-2 text-rose-300 font-bold">
                <TriangleAlert className="w-5 h-5" /> Ambush! Raiders come out of the dark.
              </div>
              <ul className="grid gap-1 text-xs sm:grid-cols-2">
                {party.members.map((m) => {
                  const ready = cannotBeSurprised(m) || camp.bells;
                  return (
                    <li key={m.id} className="flex items-center gap-2">
                      {ready ? <Eye className="w-3.5 h-3.5 text-emerald-300" /> : <Moon className="w-3.5 h-3.5 text-slate-500" />}
                      <span className="text-slate-200">{m.name}</span>
                      <span className={ready ? 'text-emerald-300' : 'text-slate-400'}>{ready ? 'awake and ready' : 'surprised'}</span>
                    </li>
                  );
                })}
              </ul>
              {camp.bells && (
                <p className="text-xs text-emerald-300 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5" /> The bells rang: nobody starts surprised.
                </p>
              )}
              {camp.traps.length > 0 && <p className="text-xs text-amber-200">Perimeter traps set: {camp.traps.map((t) => (t === 'tag' ? 'explosive tag' : 'wire')).join(', ')}.</p>}
              <p className="text-[11px] text-slate-500">
                Prototype: the current battle screen doesn't play surprise or the perimeter traps yet; they arrive with the new battle engine. The night is
                interrupted, so the morning gives half.
              </p>
              <button type="button" onClick={onAmbush} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-red-700 px-4 py-2 text-sm font-bold text-white">
                <Swords className="w-4 h-4" /> Defend the camp
              </button>
            </div>
          )}

          {step === 'morning' && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
              <p className="text-sm text-slate-300">The night passed quietly. The fire is down to embers and the sky turns grey.</p>
              <button type="button" onClick={onWake} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-sm font-bold text-slate-950">
                <Sun className="w-4 h-4" /> Wake up
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="rounded-2xl border border-amber-800/60 bg-gradient-to-b from-amber-950/30 to-slate-900/70 p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-200 font-bold">
                <Sun className="w-5 h-5" /> Morning
              </div>
              <p className="text-sm text-slate-300 max-w-[65ch]">
                Half of max HP and chakra came back{camp.night?.ambush ? ' (halved again by the interrupted night)' : ''}, plus half of the spent dice. Effects
                gained before this camp that last until a camp are gone.
              </p>
              <button type="button" onClick={onBreakCamp} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-bold text-white">
                Break camp and go on <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {camp.done.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">Tonight</div>
              <ul className="space-y-0.5 text-xs text-slate-300">
                {camp.done.map((d, i) => {
                  const who = party.members.find((m) => m.id === d.who)?.name ?? d.who;
                  const t = d.target && d.target !== d.who ? ` → ${party.members.find((m) => m.id === d.target)?.name ?? d.target}` : '';
                  const act = CAMP_ACTIVITIES.find((a) => a.id === d.activity);
                  return (
                    <li key={i}>
                      <b className="text-white">{who}</b> · {act?.name}
                      {t}
                      {d.option ? ` (${d.option})` : ''}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        <aside className="space-y-3">
          <PartyPanel party={party} selected={step === 'activities' ? selected : undefined} onSelect={step === 'activities' ? (id) => (setSelected(id), setOpen(null)) : undefined} compact />
          <RecentEvents lines={recent} />
        </aside>
      </div>
    </div>
  );
}

function FireStep({ party, camp, onFire }: { party: PartyState; camp: CampState; onFire: (f: FireLevel, katonBy?: string) => void }) {
  const preview = (fire: FireLevel) => ambushChance(party, { ...camp, fire });
  const mirai = party.members.filter((m) => m.clan === 'Mirai' && m.currentHp > 0 && !isUnconscious(m));
  const card = 'rounded-xl border border-slate-700 bg-slate-900/80 p-3 flex flex-col gap-2';
  const btn = 'rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed';
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-300">
        <b className="text-white">The fire comes first.</b> It decides what dinner can be and how far the camp can be seen.
      </p>
      <div className="grid gap-2 md:grid-cols-3">
        <div className={card}>
          <div className="font-bold text-white">No fire</div>
          <ul className="text-[11px] text-slate-400 space-y-0.5 flex-1">
            <li>Cold food only</li>
            <li>+1 Tension to everyone</li>
            {camp.site.cold && <li>Cold zone: Numb</li>}
          </ul>
          <div className="text-[11px] font-mono text-amber-300">Moon → {preview('none')}%</div>
          <button type="button" onClick={() => onFire('none')} className={`${btn} bg-slate-700 text-white hover:bg-slate-600`}>
            Stay dark
          </button>
        </div>
        <div className={card}>
          <div className="font-bold text-white">Low fire</div>
          <ul className="text-[11px] text-slate-400 space-y-0.5 flex-1">
            <li>Included in the camp kit</li>
            <li>Allows a hot meal</li>
          </ul>
          <div className="text-[11px] font-mono text-amber-300">Moon → {preview('low')}%</div>
          <button type="button" onClick={() => onFire('low')} className={`${btn} bg-amber-600 text-white hover:bg-amber-500`}>
            Light a low fire
          </button>
        </div>
        <div className={card}>
          <div className="font-bold text-white">Bonfire</div>
          <ul className="text-[11px] text-slate-400 space-y-0.5 flex-1">
            <li>−1 Tension to everyone</li>
            <li>Allows a hot meal</li>
            <li>Needs an extra camp kit, or a Mirai&apos;s Katon fire (1 stick)</li>
          </ul>
          <div className="text-[11px] font-mono text-amber-300">Moon → {preview('bonfire')}%</div>
          <button type="button" disabled={party.supplies.campKits < 1} onClick={() => onFire('bonfire')} className={`${btn} bg-orange-600 text-white hover:bg-orange-500`}>
            Use a camp kit ({party.supplies.campKits} left)
          </button>
          {mirai.map((m) => (
            <button key={m.id} type="button" onClick={() => onFire('bonfire', m.id)} className={`${btn} bg-rose-700 text-white hover:bg-rose-600`}>
              Katon fire by {m.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const FOODS: { id: FoodLevel; name: string; lines: string[] }[] = [
  { id: 'none', name: 'No food', lines: ['+1 Exhaustion', '+2 Tension', 'Hungry'] },
  { id: 'dry', name: 'Dry ration', lines: ['1 ration each', 'No effect'] },
  { id: 'hot', name: 'Hot meal', lines: ['1 ration each, needs fire', '−1 Tension', '1 more Hit Die back in the morning'] },
  { id: 'feast', name: 'Feast', lines: ['1 ration each, needs fire and a good hunt', '−2 Tension', 'Well fed'] },
];

function FoodStep({ party, camp, onFood, onBack }: { party: PartyState; camp: CampState; onFood: (f: FoodLevel) => void; onBack: () => void }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-300">
          <b className="text-white">Dinner</b> is one choice for the whole party. {party.supplies.rations} rations left for {party.members.length} ninjas.
        </p>
        <button type="button" onClick={onBack} className="text-xs text-slate-400 hover:text-white underline underline-offset-2">
          Back to activities
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {FOODS.map((f) => {
          const r = serveFood(party, camp, f.id);
          const block = r.ok ? null : r.reason;
          return (
            <button
              key={f.id}
              type="button"
              disabled={!!block}
              onClick={() => onFood(f.id)}
              className="text-left rounded-xl border border-slate-700 bg-slate-900/80 p-3 hover:border-amber-500 disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:border-slate-700"
            >
              <div className="font-bold text-white">{f.name}</div>
              <ul className="mt-1 text-[11px] text-slate-400 space-y-0.5">
                {f.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              {block && <div className="mt-1.5 text-[11px] text-rose-300">{block}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NightStep({ party, camp, onSleep }: { party: PartyState; camp: CampState; onSleep: () => void }) {
  const parts = ambushParts(party, camp);
  const chance = ambushChance(party, camp);
  const guards = camp.done.filter((d) => d.activity === 'keep_watch' || d.activity === 'byakugan_watch').map((d) => party.members.find((m) => m.id === d.who)?.name ?? d.who);
  return (
    <div className="rounded-2xl border border-indigo-900/70 bg-gradient-to-b from-indigo-950/50 to-slate-950 p-4 space-y-3">
      <div className="flex items-center gap-2 text-indigo-200 font-bold">
        <Moon className="w-5 h-5" /> Night
      </div>
      <table className="text-xs text-slate-300">
        <tbody>
          {parts.map((p, i) => (
            <tr key={i}>
              <td className="pr-6 py-0.5">{p.label}</td>
              <td className="font-mono text-right">{p.zero ? '→ 0 %' : p.halve ? '÷ 2' : `${p.add! > 0 ? '+' : '−'}${Math.abs(p.add!)} %`}</td>
            </tr>
          ))}
          <tr className="border-t border-slate-700 font-bold text-white">
            <td className="pr-6 pt-1">Tonight</td>
            <td className="font-mono text-right pt-1">{chance} %</td>
          </tr>
        </tbody>
      </table>
      <div className="text-xs text-slate-400 space-y-0.5">
        <div>On watch: {guards.length ? guards.join(', ') : 'nobody'}</div>
        <div>
          Bells: {camp.bells ? 'yes' : 'no'} · Perimeter traps: {camp.traps.length || 'none'}
        </div>
        {party.progress.noRandomness && (
          <div className="text-amber-300">
            No-randomness mode: the ambush comes when the camps&apos; % add up to 100 ({party.progress.ambushCounter} so far, +{chance} tonight).
          </div>
        )}
      </div>
      <button type="button" onClick={onSleep} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-bold text-white">
        <Moon className="w-4 h-4" /> Sleep
      </button>
    </div>
  );
}
