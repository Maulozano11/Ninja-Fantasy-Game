import React from 'react';
import { Backpack, Crown, Skull } from 'lucide-react';
import type { ShinobiCharacter } from '../../types/shinobi';
import type { PartyState, StatusEffect, SupplyId } from '../../types/mission';
import { EFFECTS } from '../../rules/effects';
import { effectiveMaxHp } from '../../rules/derived';
import { chakraDiceLeft, exhaustionOf, hitDiceLeft, isUnconscious, tensionOf } from '../../rules/ninja';
import { ShinobiSpriteCanvas } from '../ShinobiSpriteCanvas';
import { BREAKDOWN_LABEL, LogLine, SUPPLY_LABEL, Tone } from '../../game/eventText';

export function Bar({ value, max, tone, label }: { value: number; max: number; tone: 'hp' | 'chakra'; label?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const fill = tone === 'hp' ? (pct <= 25 ? 'bg-rose-500' : pct <= 50 ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-cyan-400';
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono">
      <span className="w-6 shrink-0 text-slate-500">{label ?? (tone === 'hp' ? 'HP' : 'CK')}</span>
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
  switch (d) {
    case 'rounds':
      return `${e.remaining ?? 1} round${(e.remaining ?? 1) === 1 ? '' : 's'}`;
    case 'battles':
      return `${e.remaining ?? 1} battle${(e.remaining ?? 1) === 1 ? '' : 's'}`;
    case 'zone':
      return 'this zone';
    case 'untilCamp':
      return 'until the next camp';
    case 'untilTreated':
      return 'until treated';
    case 'mission':
      return 'this mission';
    default:
      return 'permanent';
  }
}

export function effectLabel(e: StatusEffect): string {
  const def = EFFECTS[e.id];
  if (e.id === 'breakdown' && e.detail) return `${def.name}: ${BREAKDOWN_LABEL[e.detail] ?? e.detail}`;
  if (e.id === 'warding_seal' && e.detail) return `${def.name} (${e.detail})`;
  return def?.name ?? e.id;
}

export function EffectChip({ e }: { e: StatusEffect }) {
  const def = EFFECTS[e.id];
  const buff = def?.kind === 'buff';
  const count = def?.duration === 'battles' || def?.duration === 'rounds' ? e.remaining : undefined;
  return (
    <span
      title={`${effectLabel(e)}: ${def?.description ?? ''} (${durationText(e)})`}
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
  return (
    <span className="inline-flex gap-[2px]" title={`Tension ${value}/10: at 10, a WIS save decides between a Breakdown and an Awakening`}>
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-1.5 rounded-sm ${i < value ? (value >= 8 ? 'bg-rose-500' : value >= 5 ? 'bg-orange-400' : 'bg-amber-300') : 'bg-slate-800'}`}
        />
      ))}
    </span>
  );
}

export const classShort = (c: ShinobiCharacter): string => c.shinobiClass.split(' ')[0];

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
          {leader && <Crown className="w-3 h-3 text-amber-300 shrink-0" aria-label="Mission leader" />}
          <span className="font-bold text-sm text-white truncate">{c.name}</span>
          <span className="text-[10px] text-slate-500 truncate">
            Lv {c.level} · {c.clan} · {classShort(c)}
          </span>
        </div>
        <Bar value={c.currentHp} max={effectiveMaxHp(c)} tone="hp" />
        <Bar value={c.currentChakra} max={c.maxChakra} tone="chakra" />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-slate-400">
          <span className="inline-flex items-center gap-1">
            <span className="text-slate-500">TEN</span>
            <TensionPips value={tensionOf(c)} />
          </span>
          {exh > 0 && <span className="text-orange-300" title="Exhaustion: −2 to every d20 roll per level; 6 knocks the ninja out">EXH {exh}</span>}
          {!compact && (
            <span title="Hit Dice and Chakra Dice left (spent at a short stop)">
              HD {hitDiceLeft(c)}/{c.level} · CD {chakraDiceLeft(c)}/{c.level}
            </span>
          )}
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
          <Skull className="w-3.5 h-3.5" /> {m.name} died on this mission.
        </div>
      ))}
    </div>
  );
}

const SUPPLY_ORDER: SupplyId[] = ['rations', 'campKits', 'bandages', 'antidotes', 'soldierPills', 'explosiveTags', 'wireRolls'];

export function SuppliesBar({ party }: { party: PartyState }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
      <Backpack className="w-3.5 h-3.5 text-slate-400" aria-label="Backpack" />
      {SUPPLY_ORDER.map((id) => (
        <span
          key={id}
          className={`rounded-md border px-1.5 py-0.5 tabular-nums ${
            party.supplies[id] > 0 ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-800 bg-slate-950 text-slate-600'
          }`}
        >
          {SUPPLY_LABEL[id]} <b className="font-mono">{party.supplies[id]}</b>
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
  return (
    <ul className={`space-y-0.5 text-[11px] leading-snug ${className}`}>
      {lines.map((l) => (
        <li key={l.id} className={TONE[l.tone]}>
          {l.text}
        </li>
      ))}
    </ul>
  );
}

/** The last action's events, shown next to the screen that caused them. */
export function RecentEvents({ lines, title = 'What happened' }: { lines: LogLine[]; title?: string }) {
  if (!lines.length) return null;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">{title}</div>
      <LogLines lines={lines} className="max-h-64 overflow-y-auto" />
    </div>
  );
}
