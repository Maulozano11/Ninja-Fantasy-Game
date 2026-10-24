import React from 'react';
import { Backpack, Crown, Skull } from 'lucide-react';
import type { ShinobiCharacter } from '../../types/shinobi';
import type { PartyState, StatusEffect, SupplyId } from '../../types/mission';
import { clanName } from '../../data/shinobiData';
import { EFFECTS } from '../../rules/effects';
import { effectiveMaxHp } from '../../rules/derived';
import { chakraDiceLeft, exhaustionOf, hitDiceLeft, isUnconscious, tensionOf } from '../../rules/ninja';
import { ShinobiSpriteCanvas } from '../ShinobiSpriteCanvas';
import { breakdownLabel, lineText, LogLine, supplyLabel, Tone } from '../../game/eventText';
import { DieIcon } from '../dice/DieIcon';
import { CLASS_ES, ELEMENT_ES } from '../../game/ruleText';
import { pick, useLang } from '../../i18n';
import { INK, OrnatePanel, Parchment, ParchmentTitle } from '../ui/Ornate';
import { EFFECT_DESC_ES, T } from './partyText';

export function Bar({ value, max, tone, label, ornate }: { value: number; max: number; tone: 'hp' | 'chakra'; label?: string; ornate?: boolean }) {
  useLang();
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const fill = tone === 'hp' ? (pct <= 25 ? 'bg-rose-500' : pct <= 50 ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-cyan-400';
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono">
      <span className={`w-6 shrink-0 ${ornate ? 'text-[#b9a77f]' : 'text-slate-500'}`}>{label ?? (tone === 'hp' ? T('hp') : T('ck'))}</span>
      <div className={`h-2 flex-1 min-w-0 rounded-full overflow-hidden ${ornate ? 'bg-[#060b1a] ring-1 ring-[#a17d46]/35' : 'bg-slate-800'}`}>
        <div className={`h-full rounded-full transition-all duration-500 ${fill}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 shrink-0 text-right tabular-nums text-slate-300">
        {value}/{max}
      </span>
    </div>
  );
}

export function durationText(e: StatusEffect): string {
  const d = EFFECTS[e.id]?.duration;
  const n = e.remaining ?? 1;
  switch (d) {
    case 'rounds':
      return T(n === 1 ? 'rounds1' : 'roundsN', { n });
    case 'battles':
      return T(n === 1 ? 'battles1' : 'battlesN', { n });
    case 'zone':
      return T('thisZone');
    case 'untilCamp':
      return T('untilCamp');
    case 'untilTreated':
      return T('untilTreated');
    case 'mission':
      return T('thisMission');
    default:
      return T('permanent');
  }
}

export function effectLabel(e: StatusEffect): string {
  const def = EFFECTS[e.id];
  const name = def ? pick(def.name, def.nameEs) : e.id;
  if (e.id === 'breakdown' && e.detail) return `${name}: ${breakdownLabel(e.detail)}`;
  if (e.id === 'warding_seal' && e.detail) return `${name} (${pick(e.detail, ELEMENT_ES[e.detail])})`;
  return name;
}

/** An effect's rule text in the current language. */
export const effectDescription = (e: StatusEffect): string => {
  const def = EFFECTS[e.id];
  return def ? pick(def.description, EFFECT_DESC_ES[e.id]) : '';
};

export function EffectChip({ e }: { e: StatusEffect }) {
  useLang();
  const def = EFFECTS[e.id];
  const buff = def?.kind === 'buff';
  const count = def?.duration === 'battles' || def?.duration === 'rounds' ? e.remaining : undefined;
  return (
    <span
      title={`${effectLabel(e)}: ${effectDescription(e)} (${durationText(e)})`}
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold border ${
        buff ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-rose-950/60 border-rose-800 text-rose-300'
      }`}
    >
      {effectLabel(e)}
      {count !== undefined && <span className="font-mono opacity-80">{count}</span>}
    </span>
  );
}

export function TensionPips({ value, ornate }: { value: number; ornate?: boolean }) {
  useLang();
  return (
    <span className="inline-flex gap-[2px]" title={T('tensionTitle', { value })}>
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-1.5 rounded-sm ${i < value ? (value >= 8 ? 'bg-rose-500' : value >= 5 ? 'bg-orange-400' : 'bg-amber-300') : ornate ? 'bg-[#2a3757] ring-1 ring-inset ring-[#a17d46]/30' : 'bg-slate-800'}`}
        />
      ))}
    </span>
  );
}

/** The class's first word (its short tag), in the current language. */
export const classShort = (c: ShinobiCharacter): string => pick(c.shinobiClass.split(' ')[0], CLASS_ES[c.shinobiClass]?.short);

/** The class's full name in the current language. */
export const className = (c: ShinobiCharacter): string => pick(c.shinobiClass, CLASS_ES[c.shinobiClass]?.name);

/** A small framed portrait: the ninja's head and shoulders in a bronze-edged window. */
function Portrait({ c, down }: { c: ShinobiCharacter; down: boolean }) {
  return (
    <div
      className="relative shrink-0 self-start h-[52px] w-11 overflow-hidden rounded-[4px] border border-[#a17d46]/70"
      style={{ background: 'radial-gradient(circle at 50% 35%, #22355f, #0b1328 75%)', boxShadow: 'inset 0 0 0 1px rgba(2,5,14,0.7), inset 0 -8px 12px rgba(0,0,0,0.35)' }}
    >
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: -6 }}>
        <ShinobiSpriteCanvas character={c} size={84} showAura={false} stance={down ? 'hurt' : 'idle'} />
      </div>
    </div>
  );
}

/** One ninja's mission status: HP, chakra, Tension, Exhaustion, dice left and effects. */
export function MemberCard({
  c,
  leader,
  selected,
  onClick,
  compact,
  ornate,
}: {
  c: ShinobiCharacter;
  leader?: boolean;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
  /** The lacquer-and-brass look of the camp: gold border when selected, framed portrait. */
  ornate?: boolean;
}) {
  useLang();
  const down = c.currentHp <= 0 || isUnconscious(c);
  const exh = exhaustionOf(c);
  const Tag = onClick ? 'button' : 'div';
  const body = (
    <>
      {ornate ? (
        <Portrait c={c} down={down} />
      ) : (
        <div className="shrink-0 -my-1">
          <ShinobiSpriteCanvas character={c} size={compact ? 52 : 64} showAura={false} stance={down ? 'hurt' : 'idle'} />
        </div>
      )}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {leader && <Crown className="w-3 h-3 text-amber-300 shrink-0" aria-label={T('missionLeader')} />}
          <span className={`font-bold text-sm truncate ${ornate ? (selected ? 'text-[#ffe9b0]' : 'text-[#f6ecd4]') : 'text-white'}`}>{c.name}</span>
          <span className={`text-[10px] truncate ${ornate ? 'text-[#b9a77f]' : 'text-slate-500'}`}>{T('levelLine', { level: c.level, clan: clanName(c.clan), cls: classShort(c) })}</span>
        </div>
        <Bar value={c.currentHp} max={effectiveMaxHp(c)} tone="hp" ornate={ornate} />
        <Bar value={c.currentChakra} max={c.maxChakra} tone="chakra" ornate={ornate} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-slate-400">
          <span className="inline-flex items-center gap-1">
            <span className={ornate ? 'text-[#b9a77f]' : 'text-slate-500'}>{T('ten')}</span>
            <TensionPips value={tensionOf(c)} ornate={ornate} />
          </span>
          {exh > 0 && (
            <span className="text-orange-300" title={T('exhTitle')}>
              {T('exh', { n: exh })}
            </span>
          )}
          {!compact && <span title={T('diceTitle')}>{T('dice', { hd: hitDiceLeft(c), cd: chakraDiceLeft(c), level: c.level })}</span>}
        </div>
        {!!c.effects?.length && (
          <div className="flex flex-wrap gap-1">
            {c.effects.map((e) => (
              <EffectChip key={e.id} e={e} />
            ))}
          </div>
        )}
      </div>
    </>
  );
  if (ornate)
    return (
      <OrnatePanel
        as={onClick ? 'button' : 'div'}
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        aria-pressed={onClick ? !!selected : undefined}
        state={selected ? 'active' : 'idle'}
        interactive={!!onClick}
        corners={selected ? 18 : false}
        className={`w-full text-left flex gap-2.5 p-2.5 transition ${onClick ? 'cursor-pointer' : ''} ${down ? 'opacity-60' : ''}`}
      >
        {body}
      </OrnatePanel>
    );
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full text-left flex gap-2 rounded-xl border p-2 transition ${
        selected ? 'border-cyan-400 bg-cyan-950/30' : 'border-slate-800 bg-slate-900/70'
      } ${onClick ? 'hover:border-cyan-600 cursor-pointer' : ''} ${down ? 'opacity-60' : ''}`}
    >
      {body}
    </Tag>
  );
}

export function PartyPanel({
  party,
  selected,
  onSelect,
  compact,
  ornate,
}: {
  party: PartyState;
  selected?: string;
  onSelect?: (id: string) => void;
  compact?: boolean;
  /** The camp's lacquer-and-brass cards. */
  ornate?: boolean;
}) {
  useLang();
  return (
    <div className="space-y-2">
      {party.members.map((m) => (
        <MemberCard
          key={m.id}
          c={m}
          leader={m.id === party.leaderId}
          selected={selected === m.id}
          onClick={onSelect ? () => onSelect(m.id) : undefined}
          compact={compact}
          ornate={ornate}
        />
      ))}
      {party.dead.map((m) => (
        <div
          key={m.id}
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${ornate ? 'border-[#6b5534]/60 bg-[#0a1226] text-slate-400' : 'border-slate-800 bg-slate-950 text-slate-500'}`}
        >
          <Skull className="w-3.5 h-3.5" /> {T('died', { name: m.name })}
        </div>
      ))}
    </div>
  );
}

const SUPPLY_ORDER: SupplyId[] = ['rations', 'campKits', 'bandages', 'antidotes', 'soldierPills', 'explosiveTags', 'wireRolls', 'weaponPoison', 'healingPotions', 'platinumSenbon'];

export function SuppliesBar({ party }: { party: PartyState }) {
  useLang();
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
      <Backpack className="w-3.5 h-3.5 text-slate-400" aria-label={T('backpack')} />
      {SUPPLY_ORDER.map((id) => (
        <span
          key={id}
          className={`rounded-md border px-1.5 py-0.5 tabular-nums ${
            party.supplies[id] > 0 ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-800 bg-slate-950 text-slate-600'
          }`}
        >
          {supplyLabel(id)} <b className="font-mono">{party.supplies[id]}</b>
        </span>
      ))}
    </div>
  );
}

const TONE: Record<Tone, string> = {
  good: 'text-emerald-300',
  bad: 'text-rose-300',
  roll: 'text-cyan-300',
  info: 'text-slate-300',
  title: 'text-amber-200 font-bold pt-1',
};

/** The same tones in dark ink, for log lines written on parchment. */
const INK_TONE: Record<Tone, string> = {
  good: INK.good,
  bad: INK.bad,
  roll: INK.roll,
  info: INK.text,
  title: `${INK.title} pt-1`,
};

export function LogLines({ lines, className = '', ink }: { lines: LogLine[]; className?: string; ink?: boolean }) {
  const lang = useLang();
  return (
    <ul className={`space-y-0.5 text-[11px] leading-snug ${className}`}>
      {lines.map((l) => (
        <li key={l.id} className={(ink ? INK_TONE : TONE)[l.tone]}>
          {/* A check's d20, thrown on the line as it appears (the number is in the line's text). */}
          {l.tone === 'roll' && /d20 (\d+)/.test(l.text) && <DieIcon result={Number(/d20 (\d+)/.exec(l.text)![1])} size={20} />}
          {lineText(l, lang)}
        </li>
      ))}
    </ul>
  );
}

/** The last action's events, shown next to the screen that caused them. */
export function RecentEvents({ lines, title, parchment }: { lines: LogLine[]; title?: string; parchment?: boolean }) {
  useLang();
  if (!lines.length) return null;
  if (parchment)
    return (
      <Parchment className="px-4 pt-3 pb-3.5">
        <ParchmentTitle>{title ?? T('whatHappened')}</ParchmentTitle>
        <LogLines lines={lines} ink className="max-h-64 overflow-y-auto text-[12px] [scrollbar-color:#8a6434_transparent] [scrollbar-width:thin]" />
      </Parchment>
    );
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">{title ?? T('whatHappened')}</div>
      <LogLines lines={lines} className="max-h-64 overflow-y-auto" />
    </div>
  );
}
