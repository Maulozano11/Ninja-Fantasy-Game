import React from 'react';
import { Backpack, Crown, Skull } from 'lucide-react';
import type { ShinobiCharacter } from '../../types/shinobi';
import type { PartyState, StatusEffect, SupplyId } from '../../types/mission';
import { EFFECTS } from '../../rules/effects';
import { effectiveMaxHp } from '../../rules/derived';
import { chakraDiceLeft, exhaustionOf, hitDiceLeft, isUnconscious, tensionOf } from '../../rules/ninja';
import { ShinobiSpriteCanvas } from '../ShinobiSpriteCanvas';
import { breakdownLabel, lineText, LogLine, supplyLabel, Tone } from '../../game/eventText';
import { CLASS_ES, ELEMENT_ES } from '../../game/ruleText';
import { pick, useLang } from '../../i18n';
import { EFFECT_DESC_ES, T } from './partyText';

export function Bar({ value, max, tone, label }: { value: number; max: number; tone: 'hp' | 'chakra'; label?: string }) {
  useLang();
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const fill = tone === 'hp' ? (pct <= 25 ? 'bg-rose-500' : pct <= 50 ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-cyan-400';
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono">
      <span className="w-6 shrink-0 text-slate-500">{label ?? (tone === 'hp' ? T('hp') : T('ck'))}</span>
      <div className="h-2 flex-1 min-w-0 rounded-full bg-slate-800 overflow-hidden">
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

export function TensionPips({ value }: { value: number }) {
  useLang();
  return (
    <span className="inline-flex gap-[2px]" title={T('tensionTitle', { value })}>
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-1.5 rounded-sm ${i < value ? (value >= 8 ? 'bg-rose-500' : value >= 5 ? 'bg-orange-400' : 'bg-amber-300') : 'bg-slate-800'}`}
        />
      ))}
    </span>
  );
}

/** The class's first word (its short tag), in the current language. */
export const classShort = (c: ShinobiCharacter): string => pick(c.shinobiClass.split(' ')[0], CLASS_ES[c.shinobiClass]?.short);

/** The class's full name in the current language. */
export const className = (c: ShinobiCharacter): string => pick(c.shinobiClass, CLASS_ES[c.shinobiClass]?.name);

/** One ninja's mission status: HP, chakra, Tension, Exhaustion, dice left and effects. */
export function MemberCard({
  c,
  leader,
  selected,
  onClick,
  compact,
}: {
  c: ShinobiCharacter;
  leader?: boolean;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  useLang();
  const down = c.currentHp <= 0 || isUnconscious(c);
  const exh = exhaustionOf(c);
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full text-left flex gap-2 rounded-xl border p-2 transition ${
        selected ? 'border-cyan-400 bg-cyan-950/30' : 'border-slate-800 bg-slate-900/70'
      } ${onClick ? 'hover:border-cyan-600 cursor-pointer' : ''} ${down ? 'opacity-60' : ''}`}
    >
      <div className="shrink-0 -my-1">
        <ShinobiSpriteCanvas character={c} size={compact ? 52 : 64} showAura={false} stance={down ? 'hurt' : 'idle'} />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {leader && <Crown className="w-3 h-3 text-amber-300 shrink-0" aria-label={T('missionLeader')} />}
          <span className="font-bold text-sm text-white truncate">{c.name}</span>
          <span className="text-[10px] text-slate-500 truncate">{T('levelLine', { level: c.level, clan: c.clan, cls: classShort(c) })}</span>
        </div>
        <Bar value={c.currentHp} max={effectiveMaxHp(c)} tone="hp" />
        <Bar value={c.currentChakra} max={c.maxChakra} tone="chakra" />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-slate-400">
          <span className="inline-flex items-center gap-1">
            <span className="text-slate-500">{T('ten')}</span>
            <TensionPips value={tensionOf(c)} />
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
    </Tag>
  );
}

export function PartyPanel({
  party,
  selected,
  onSelect,
  compact,
}: {
  party: PartyState;
  selected?: string;
  onSelect?: (id: string) => void;
  compact?: boolean;
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
        />
      ))}
      {party.dead.map((m) => (
        <div key={m.id} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-500">
          <Skull className="w-3.5 h-3.5" /> {T('died', { name: m.name })}
        </div>
      ))}
    </div>
  );
}

const SUPPLY_ORDER: SupplyId[] = ['rations', 'campKits', 'bandages', 'antidotes', 'soldierPills', 'explosiveTags', 'wireRolls'];

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

export function LogLines({ lines, className = '' }: { lines: LogLine[]; className?: string }) {
  const lang = useLang();
  return (
    <ul className={`space-y-0.5 text-[11px] leading-snug ${className}`}>
      {lines.map((l) => (
        <li key={l.id} className={TONE[l.tone]}>
          {lineText(l, lang)}
        </li>
      ))}
    </ul>
  );
}

/** The last action's events, shown next to the screen that caused them. */
export function RecentEvents({ lines, title }: { lines: LogLine[]; title?: string }) {
  useLang();
  if (!lines.length) return null;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">{title ?? T('whatHappened')}</div>
      <LogLines lines={lines} className="max-h-64 overflow-y-auto" />
    </div>
  );
}
