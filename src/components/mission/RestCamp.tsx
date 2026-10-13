import React, { useMemo, useState } from 'react';
import { Bell, Check, ChevronRight, Eye, Flame, Moon, Sun, Swords, TriangleAlert } from 'lucide-react';
import type { ShinobiCharacter } from '../../types/shinobi';
import type { PartyState, SupplyId } from '../../types/mission';
import { ActivityId, CAMP_ACTIVITIES, CampActivity, STICKS_PER_CAMP } from '../../data/campActivities';
import { checkAdvantage, cannotBeSurprised, skillModifier, successChance } from '../../rules/checks';
import { effectiveMaxHp } from '../../rules/derived';
import { activityBlocker, ambushChance, ambushParts, CampState, FireLevel, FoodLevel, healingJutsuOf, serveFood } from '../../rules/rest';
import { isUnconscious } from '../../rules/ninja';
import { CampScene, IncenseSticks } from './CampScene';
import type { LogLine } from '../../game/eventText';
import { ELEMENT_ES, ruleText } from '../../game/ruleText';
import { pick, useLang } from '../../i18n';
import { classShort, PartyPanel, RecentEvents } from './PartyPanel';
import { FOCUS, OrnateFrame, OrnatePanel, plaque, ScrollButton } from '../ui/Ornate';
import { ONE, OPTION_ES, T } from './campText';

type CampStep = 'fire' | 'activities' | 'food' | 'night' | 'ambush' | 'morning' | 'done';

const STEPS: { id: CampStep; label: Parameters<typeof T>[0] }[] = [
  { id: 'fire', label: 'stepFire' },
  { id: 'activities', label: 'stepActivities' },
  { id: 'food', label: 'stepDinner' },
  { id: 'night', label: 'stepNight' },
  { id: 'morning', label: 'stepMorning' },
];

const ELEMENTS = ['Fire', 'Water', 'Earth', 'Wind', 'Lightning'];

const one = (s: SupplyId): string => pick(ONE[s].en, ONE[s].es);

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
        { key: 'tag', label: T('optTag', { n: party.supplies.explosiveTags }) },
        { key: 'wire', label: T('optWire', { n: party.supplies.wireRolls }) },
      ];
    case 'warding_seal':
    case 'elemental_meditation':
      return ELEMENTS.map((e) => ({ key: e, label: pick(e, ELEMENT_ES[e]) }));
    case 'shared_vitality':
      return [
        { key: 'hp', label: T('optHp') },
        { key: 'chakra', label: T('optChakra') },
      ];
    case 'make_pills':
      return [
        { key: 'pill', label: T('optPill') },
        { key: 'antidote', label: T('optAntidote') },
      ];
    case 'make_materials':
      return [
        { key: 'tag', label: T('optTagOne') },
        { key: 'wire', label: T('optWireRoll') },
      ];
    default:
      return null;
  }
}

function costText(act: CampActivity, c: ShinobiCharacter): string[] {
  const out: string[] = [];
  if (act.supplies) out.push(act.supplies.map((s) => T('costOne', { item: one(s) })).join(T('costOr')));
  if (act.chakra === 'jutsu') {
    const j = healingJutsuOf(c);
    out.push(j ? T('costJutsu', { n: j.chakraCost, jutsu: j.name }) : T('costAnyJutsu'));
  }
  if (act.chakra === 'quarterMax') out.push(T('costChakra', { n: Math.ceil(c.maxChakra / 4) }));
  return out;
}

const pct = (p: number) => `${Math.round(p * 100)} %`;

// Text colours on the navy lacquer (all well above 4.5:1).
const TITLE = 'text-[#fbeccb]';
const BODY = 'text-[#c9cfdd]';
const MUTED = 'text-[#a9b2c7]';
const LABEL = 'text-[#b9a77f]';

/** A small choice chip: gold when picked. */
const chip = (on: boolean) =>
  `rounded-md border px-2 py-1 transition ${FOCUS} ${on ? 'border-[#ecc672] bg-[#1b2a52] text-[#ffe9b0]' : 'border-[#6b5534]/70 bg-[#0a1226] text-slate-200 hover:border-[#dcb563]/80'}`;

function checkChance(act: CampActivity, c: ShinobiCharacter): string | null {
  if (act.id === 'hunt') return T('chanceHunt', { pct: pct(successChance(skillModifier(c, 'survival'), 12, checkAdvantage(c, 'survival'))) });
  if (act.id === 'field_surgery') return T('chanceSurgery', { pct: pct(successChance(skillModifier(c, 'medicine'), 13, checkAdvantage(c, 'medicine'))) });
  return null;
}

/** Why the card can't be used at all (no target or option would do), or null. */
function cardBlocker(party: PartyState, camp: CampState, who: string, act: CampActivity): string | null {
  if (act.target === 'other' || act.target === 'any') {
    const targets = party.members.filter((m) => act.target === 'any' || m.id !== who);
    if (!targets.length) return T('needsAnother');
    const blocks = targets.map((t) => activityBlocker(party, camp, who, act, { target: t.id }));
    return blocks.includes(null) ? null : blocks[0] && ruleText(blocks[0]);
  }
  const block = activityBlocker(party, camp, who, act);
  return block && ruleText(block);
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
  useLang();
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
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#e2be6e]">{T('campHeader', { n: camp.campNo, zone: zoneName })}</div>
          <h2 className="text-xl font-bold text-[#fbf0d2]">{nodeName}</h2>
        </div>
        <ol className="flex flex-wrap items-center gap-1 text-[11px]" aria-label={T('campSteps')}>
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex items-center gap-1" aria-current={i === stepIndex ? 'step' : undefined}>
              <span
                className={`rounded-full border px-2.5 py-1 font-semibold ${
                  i < stepIndex
                    ? 'border-[#6f9a6a]/60 bg-[#0f2219] text-[#b5e8bd]'
                    : i === stepIndex
                      ? 'border-[#5e3c10] bg-gradient-to-b from-[#f4d685] to-[#c4913f] text-[#1d1204] shadow-[inset_0_1px_0_rgba(255,246,220,0.5),0_0_10px_rgba(236,198,114,0.3)]'
                      : 'border-[#6b5534]/60 bg-[#0c1428] text-[#a3acc2]'
                }`}
              >
                {i < stepIndex && <Check className="inline w-3 h-3 mr-0.5 -mt-0.5" />}
                {T(s.label)}
              </span>
              {i < STEPS.length - 1 && <ChevronRight aria-hidden className="w-3 h-3 text-[#8a6a3a]" />}
            </li>
          ))}
        </ol>
      </div>

      <OrnateFrame>
        <CampScene
          members={party.members}
          fire={camp.fire}
          asleep={!!camp.night}
          dawn={camp.morningDone}
          alarm={!!camp.night?.ambush && !camp.morningDone}
          shrine={camp.site.shrine}
          danger={danger}
          dangerLabel={camp.night ? (camp.night.ambush ? T('dangerAmbush') : T('dangerQuiet')) : T('dangerZone', { n: camp.site.zoneDanger })}
          selected={step === 'activities' ? selected : undefined}
          onSelect={step === 'activities' ? (id) => (setSelected(id), setOpen(null)) : undefined}
          sticksUsed={camp.sticksUsed}
          poses={poses}
        />
      </OrnateFrame>

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
                    aria-pressed={m.id === selected}
                    className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold transition ${FOCUS} ${
                      m.id === selected
                        ? 'border-[#ecc672] bg-[#1b2a52] text-[#ffe9b0] shadow-[0_0_12px_rgba(236,198,114,0.25)]'
                        : 'border-[#a17d46]/50 bg-[#0e1730] text-slate-200 hover:border-[#dcb563]/90'
                    }`}
                  >
                    {m.name}
                    <IncenseSticks used={camp.sticksUsed[m.id] ?? 0} compact />
                  </button>
                ))}
                <span className={`text-[11px] ${MUTED}`}>{T('sticksTonight', { n: STICKS_PER_CAMP })}</span>
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
                  const openBlock = isOpen ? activityBlocker(party, camp, me.id, act, { target: target || undefined, option: option || undefined }) : null;
                  const finalBlock = isOpen ? openBlock && ruleText(openBlock) : block;
                  return (
                    <OrnatePanel
                      key={act.id}
                      state={isOpen ? 'active' : block ? 'muted' : 'idle'}
                      interactive={!block && !isOpen}
                      corners={isOpen ? 18 : false}
                      className={`p-3 transition ${isOpen ? 'sm:col-span-2' : block ? 'opacity-60' : ''}`}
                    >
                      <button type="button" disabled={!!block} onClick={() => choose(act)} aria-expanded={!block ? isOpen : undefined} className={`w-full text-left rounded-sm disabled:cursor-not-allowed ${FOCUS}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className={`flex items-center gap-1.5 font-bold text-sm ${isOpen ? 'text-[#ffe9b0]' : TITLE}`}>
                              {pick(act.name, act.nameEs)}
                              {special && (
                                <span className="rounded border border-violet-400/40 bg-violet-950/70 px-1 text-[9px] font-semibold uppercase tracking-wide text-violet-200">
                                  {act.requires?.clan ?? classShort(me)}
                                </span>
                              )}
                              {done && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                            </div>
                            <p className={`text-[11px] leading-snug mt-0.5 ${MUTED}`}>{pick(act.description, act.descriptionEs)}</p>
                          </div>
                          <span
                            className="shrink-0 flex items-center gap-1 rounded-full border border-[#a17d46]/45 bg-[#0a1226]/70 px-1.5 py-px text-[10px] font-semibold text-amber-200"
                            title={T(act.sticks > 1 ? 'stickN' : 'stick1', { n: act.sticks })}
                          >
                            {act.sticks}
                            <Flame className="w-3 h-3 text-orange-300" />
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-mono">
                          {costs.map((t) => (
                            <span key={t} className="text-[#d3d9e6]">
                              {t}
                            </span>
                          ))}
                          {chance && <span className="text-cyan-300">{chance}</span>}
                          {after !== null && (
                            <span className="text-amber-300">{T('moonAfter', { now: danger, after })}</span>
                          )}
                          {block && <span className="text-rose-300">{block}</span>}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="mt-3 space-y-2 border-t border-[#a17d46]/30 pt-3">
                          {(act.target === 'other' || act.target === 'any') && (
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <span className={`w-14 ${LABEL}`}>{T('target')}</span>
                              {party.members
                                .filter((m) => act.target === 'any' || m.id !== me.id)
                                .map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setTarget(m.id)}
                                    aria-pressed={target === m.id}
                                    className={chip(target === m.id)}
                                  >
                                    {m.id === me.id ? T('self', { name: m.name }) : m.name} <span className="font-mono text-[10px] text-[#a9b2c7]">{m.currentHp}/{effectiveMaxHp(m)}</span>
                                  </button>
                                ))}
                            </div>
                          )}
                          {opts && (
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <span className={`w-14 ${LABEL}`}>{T('option')}</span>
                              {opts.map((o) => (
                                <button key={o.key} type="button" onClick={() => setOption(o.key)} aria-pressed={option === o.key} className={chip(option === o.key)}>
                                  {o.label}
                                </button>
                              ))}
                            </div>
                          )}
                          {act.id === 'shared_vitality' && (
                            <label className={`flex flex-wrap items-center gap-2 text-xs ${BODY}`}>
                              <span className={`w-14 ${LABEL}`}>{T('amount')}</span>
                              <input type="range" min={1} max={10} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={`accent-[#e2b85c] ${FOCUS}`} />
                              <span className="font-mono w-6">{amount}</span>
                              <span className={MUTED}>{T('keeps1Hp')}</span>
                            </label>
                          )}
                          <div className="flex flex-wrap items-center gap-3">
                            <button type="button" disabled={!!finalBlock} onClick={() => confirm(act)} className={plaque('gold', 'sm')}>
                              {T(act.sticks > 1 ? 'doItN' : 'doIt1', { n: act.sticks })}
                            </button>
                            {finalBlock && <span className="text-xs text-rose-300">{finalBlock}</span>}
                          </div>
                        </div>
                      )}
                    </OrnatePanel>
                  );
                })}
              </div>

              <OrnatePanel corners className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className={`flex-1 min-w-[12rem] text-xs ${BODY}`}>{T('activitiesEnd')}</span>
                <ScrollButton onClick={() => setToDinner(true)} className="max-sm:w-full">
                  {T('goToDinner')}
                </ScrollButton>
              </OrnatePanel>
            </div>
          )}

          {step === 'food' && <FoodStep party={party} camp={camp} onFood={onFood} onBack={() => setToDinner(false)} />}

          {step === 'night' && <NightStep party={party} camp={camp} onSleep={onSleep} />}

          {step === 'ambush' && (
            <OrnatePanel tint="crimson" corners className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-rose-300 font-bold">
                <TriangleAlert className="w-5 h-5" /> {T('ambush')}
              </div>
              <ul className="grid gap-1 text-xs sm:grid-cols-2">
                {party.members.map((m) => {
                  const ready = cannotBeSurprised(m) || camp.bells;
                  return (
                    <li key={m.id} className="flex items-center gap-2">
                      {ready ? <Eye className="w-3.5 h-3.5 text-emerald-300" /> : <Moon className="w-3.5 h-3.5 text-slate-500" />}
                      <span className={TITLE}>{m.name}</span>
                      <span className={ready ? 'text-emerald-300' : 'text-slate-400'}>{ready ? T('awake') : T('surprised')}</span>
                    </li>
                  );
                })}
              </ul>
              {camp.bells && (
                <p className="text-xs text-emerald-300 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5" /> {T('bellsRang')}
                </p>
              )}
              {camp.traps.length > 0 && <p className="text-xs text-amber-200">{T('trapsSet', { list: camp.traps.map((t) => (t === 'tag' ? T('trapTag') : T('trapWire'))).join(', ') })}</p>}
              <p className={`text-[11px] ${MUTED}`}>{T('ambushPrototype')}</p>
              <button type="button" onClick={onAmbush} className={plaque('crimson')}>
                <Swords className="w-4 h-4" /> {T('defend')}
              </button>
            </OrnatePanel>
          )}

          {step === 'morning' && (
            <OrnatePanel corners className="p-4 space-y-3">
              <p className={`text-sm ${BODY}`}>{T('quietNight')}</p>
              <button type="button" onClick={onWake} className={plaque('gold')}>
                <Sun className="w-4 h-4" /> {T('wakeUp')}
              </button>
            </OrnatePanel>
          )}

          {step === 'done' && (
            <OrnatePanel tint="dawn" corners className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-[#f4d685] font-bold">
                <Sun className="w-5 h-5" /> {T('morning')}
              </div>
              <p className={`text-sm max-w-[65ch] ${BODY}`}>{T('morningText', { interrupted: camp.night?.ambush ? T('morningHalved') : '' })}</p>
              <button type="button" onClick={onBreakCamp} className={plaque('gold')}>
                {T('breakCamp')} <ChevronRight className="w-4 h-4" />
              </button>
            </OrnatePanel>
          )}

          {camp.done.length > 0 && (
            <OrnatePanel corners={16} className="px-4 py-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#d9b56a] mb-1.5">{T('tonight')}</div>
              <ul className={`space-y-0.5 text-xs ${BODY}`}>
                {camp.done.map((d, i) => {
                  const who = party.members.find((m) => m.id === d.who)?.name ?? d.who;
                  const t = d.target && d.target !== d.who ? ` → ${party.members.find((m) => m.id === d.target)?.name ?? d.target}` : '';
                  const act = CAMP_ACTIVITIES.find((a) => a.id === d.activity);
                  return (
                    <li key={i}>
                      <b className={TITLE}>{who}</b> · {act && pick(act.name, act.nameEs)}
                      {t}
                      {d.option ? ` (${pick(d.option, OPTION_ES[d.option])})` : ''}
                    </li>
                  );
                })}
              </ul>
            </OrnatePanel>
          )}
        </section>

        <aside className="space-y-3">
          <PartyPanel
            party={party}
            selected={step === 'activities' ? selected : undefined}
            onSelect={step === 'activities' ? (id) => (setSelected(id), setOpen(null)) : undefined}
            compact
            ornate
          />
          <RecentEvents lines={recent} parchment />
        </aside>
      </div>
    </div>
  );
}

function FireStep({ party, camp, onFire }: { party: PartyState; camp: CampState; onFire: (f: FireLevel, katonBy?: string) => void }) {
  useLang();
  const preview = (fire: FireLevel) => ambushChance(party, { ...camp, fire });
  const mirai = party.members.filter((m) => m.clan === 'Mirai' && m.currentHp > 0 && !isUnconscious(m));
  const card = 'p-3 flex flex-col gap-2';
  const list = `text-[11px] space-y-0.5 flex-1 ${MUTED}`;
  return (
    <div className="space-y-2">
      <p className={`text-sm ${BODY}`}>
        <b className={TITLE}>{T('fireFirst')}</b>
        {T('fireWhy')}
      </p>
      <div className="grid gap-2 md:grid-cols-3">
        <OrnatePanel className={card}>
          <div className={`font-bold ${TITLE}`}>{T('noFire')}</div>
          <ul className={list}>
            <li>{T('coldFood')}</li>
            <li>{T('tensionUpAll')}</li>
            {camp.site.cold && <li>{T('coldZone')}</li>}
          </ul>
          <div className="text-[11px] font-mono text-amber-300">{T('moonPreview', { n: preview('none') })}</div>
          <button type="button" onClick={() => onFire('none')} className={plaque('lacquer', 'sm')}>
            {T('stayDark')}
          </button>
        </OrnatePanel>
        <OrnatePanel className={card}>
          <div className={`font-bold ${TITLE}`}>{T('lowFire')}</div>
          <ul className={list}>
            <li>{T('inKit')}</li>
            <li>{T('hotMealOk')}</li>
          </ul>
          <div className="text-[11px] font-mono text-amber-300">{T('moonPreview', { n: preview('low') })}</div>
          <button type="button" onClick={() => onFire('low')} className={plaque('gold', 'sm')}>
            {T('lightLow')}
          </button>
        </OrnatePanel>
        <OrnatePanel className={card}>
          <div className={`font-bold ${TITLE}`}>{T('bonfire')}</div>
          <ul className={list}>
            <li>{T('tensionDownAll')}</li>
            <li>{T('hotMealOk')}</li>
            <li>{T('bonfireNeeds')}</li>
          </ul>
          <div className="text-[11px] font-mono text-amber-300">{T('moonPreview', { n: preview('bonfire') })}</div>
          <button type="button" disabled={party.supplies.campKits < 1} onClick={() => onFire('bonfire')} className={plaque('ember', 'sm')}>
            {T('useKit', { n: party.supplies.campKits })}
          </button>
          {mirai.map((m) => (
            <button key={m.id} type="button" onClick={() => onFire('bonfire', m.id)} className={plaque('crimson', 'sm')}>
              {T('katonBy', { name: m.name })}
            </button>
          ))}
        </OrnatePanel>
      </div>
    </div>
  );
}

type CampKey = Parameters<typeof T>[0];

const FOODS: { id: FoodLevel; name: CampKey; lines: CampKey[] }[] = [
  { id: 'none', name: 'foodNone', lines: ['foodNone1', 'foodNone2', 'foodNone3'] },
  { id: 'dry', name: 'foodDry', lines: ['foodDry1', 'foodDry2'] },
  { id: 'hot', name: 'foodHot', lines: ['foodHot1', 'foodHot2', 'foodHot3'] },
  { id: 'feast', name: 'foodFeast', lines: ['foodFeast1', 'foodFeast2', 'foodFeast3'] },
];

function FoodStep({ party, camp, onFood, onBack }: { party: PartyState; camp: CampState; onFood: (f: FoodLevel) => void; onBack: () => void }) {
  useLang();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-sm ${BODY}`}>
          <b className={TITLE}>{T('dinner')}</b>
          {T('dinnerText', { rations: party.supplies.rations, n: party.members.length })}
        </p>
        <button type="button" onClick={onBack} className={`rounded-sm text-xs underline underline-offset-2 ${LABEL} hover:text-[#ffe9b0] ${FOCUS}`}>
          {T('backToActivities')}
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {FOODS.map((f) => {
          const r = serveFood(party, camp, f.id);
          const block = r.ok ? null : ruleText(r.reason);
          return (
            <OrnatePanel
              as="button"
              key={f.id}
              type="button"
              disabled={!!block}
              onClick={() => onFood(f.id)}
              state={block ? 'muted' : 'idle'}
              interactive={!block}
              className="flex flex-col justify-start text-left p-3 transition active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0"
            >
              <div className={`font-bold ${TITLE}`}>{T(f.name)}</div>
              <ul className={`mt-1 text-[11px] space-y-0.5 ${MUTED}`}>
                {f.lines.map((l) => (
                  <li key={l}>{T(l)}</li>
                ))}
              </ul>
              {block && <div className="mt-1.5 text-[11px] text-rose-300">{block}</div>}
            </OrnatePanel>
          );
        })}
      </div>
    </div>
  );
}

function NightStep({ party, camp, onSleep }: { party: PartyState; camp: CampState; onSleep: () => void }) {
  useLang();
  const parts = ambushParts(party, camp);
  const chance = ambushChance(party, camp);
  const guards = camp.done.filter((d) => d.activity === 'keep_watch' || d.activity === 'byakugan_watch').map((d) => party.members.find((m) => m.id === d.who)?.name ?? d.who);
  return (
    <OrnatePanel tint="indigo" corners className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-indigo-200 font-bold">
        <Moon className="w-5 h-5" /> {T('night')}
      </div>
      <table className={`text-xs ${BODY}`}>
        <tbody>
          {parts.map((p, i) => (
            <tr key={i}>
              <td className="pr-6 py-0.5">{ruleText(p.label)}</td>
              <td className="font-mono text-right">{p.zero ? '→ 0 %' : p.halve ? '÷ 2' : `${p.add! > 0 ? '+' : '−'}${Math.abs(p.add!)} %`}</td>
            </tr>
          ))}
          <tr className={`border-t border-[#a17d46]/45 font-bold ${TITLE}`}>
            <td className="pr-6 pt-1">{T('tonight')}</td>
            <td className="font-mono text-right pt-1">{chance} %</td>
          </tr>
        </tbody>
      </table>
      <div className={`text-xs space-y-0.5 ${MUTED}`}>
        <div>{T('onWatch', { list: guards.length ? guards.join(', ') : T('nobody') })}</div>
        <div>{T('bells', { bells: camp.bells ? T('yes') : T('no'), traps: camp.traps.length || T('none') })}</div>
        {party.progress.noRandomness && <div className="text-amber-300">{T('noRandomness', { counter: party.progress.ambushCounter, chance })}</div>}
      </div>
      <button type="button" onClick={onSleep} className={plaque('indigo')}>
        <Moon className="w-4 h-4" /> {T('sleep')}
      </button>
    </OrnatePanel>
  );
}
