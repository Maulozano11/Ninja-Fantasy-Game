// The battle HUD's pieces: the acting ninja's card, the initiative bar, the party frames with
// their AI switches, the action bar, roll toasts, the log, reaction prompts, banners and tips.

import React from 'react';
import {
  ArrowUpCircle,
  Bomb,
  Bot,
  ChevronsDown,
  CircleDot,
  Crosshair,
  DoorOpen,
  EyeOff,
  FlaskConical,
  Footprints,
  Hand,
  HeartPulse,
  LogOut,
  Package,
  Pill,
  ScrollText,
  Shield,
  Sparkles,
  Sword,
  Swords,
  User,
  X,
  Bandage,
  Flame,
  Droplets,
  Wind,
  Zap,
  Mountain,
  Brain,
  Skull,
  Box,
  BrickWall,
  Locate,
  ArrowLeftRight,
  Crown,
  PawPrint,
  Eye,
} from 'lucide-react';
import type { AiOrder, BattleState, Unit } from '../../battle/types';
import { homeTeam } from '../../battle/types';
import { clanName } from '../../data/shinobiData';
import { CLASS_ES } from '../../game/ruleText';
import type { Lang } from '../../i18n';
import { T } from './battleText';
import type { TKey } from './battleText';
import { unitName } from './battleLog';
import { portraitOf } from './unitArt';

export const ELEMENT_ICON: Record<string, React.FC<{ size?: number; className?: string }>> = {
  fire: Flame,
  water: Droplets,
  wind: Wind,
  lightning: Zap,
  earth: Mountain,
  genjutsu: Brain,
  chakra: Sparkles,
  poison: Skull,
};

/** Clan abilities with an icon of their own (the others show their element's). */
export const ABILITY_ICON: Record<string, React.FC<{ size?: number; className?: string }>> = {
  katon_pursuing_flame: Flame,
  koton_block: Box,
  koton_wall: BrickWall,
  ryusei_warp: Locate,
  ryusei_swap: ArrowLeftRight,
  northstar_command: Crown,
  northstar_submission: PawPrint,
  mirai_evasion: Eye,
};

export const ACTION_ICON: Record<string, React.FC<{ size?: number; className?: string }>> = {
  attack: Sword,
  throw: Crosshair,
  dash: Footprints,
  disengage: LogOut,
  dodge: Shield,
  hide: EyeOff,
  crouch: ChevronsDown,
  jump: ArrowUpCircle,
  shove: Hand,
  trip: Hand,
  focus: Sparkles,
  draw: Swords,
  pill: Pill,
  bandage: Bandage,
  antidote: FlaskConical,
  tag: Bomb,
  stabilize: HeartPulse,
  flee: DoorOpen,
  stone: CircleDot,
  end: X,
  items: Package,
};

const panel = 'bg-slate-950/80 border border-slate-600/50 rounded-xl shadow-lg shadow-black/40 backdrop-blur-sm';

function Bar({ value, max, color, height = 6 }: { value: number; max: number; color: string; height?: number }) {
  const f = Math.max(0, Math.min(1, value / Math.max(1, max)));
  return (
    <div className="w-full rounded-full bg-slate-800/90 overflow-hidden" style={{ height }}>
      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${f * 100}%`, background: color }} />
    </div>
  );
}

const hpColor = (f: number) => (f > 0.5 ? '#4ade80' : f > 0.25 ? '#facc15' : '#f87171');

export function Portrait({ u, size = 44, ring }: { u: Unit; size?: number; ring?: string }) {
  const src = portraitOf(u, size);
  return (
    <div className="rounded-lg overflow-hidden bg-slate-800 shrink-0" style={{ width: size, height: size, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}>
      {src ? (
        <img src={src} alt="" width={size} height={size} style={{ imageRendering: 'pixelated' }} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-emerald-400">
          <Skull size={size * 0.5} />
        </div>
      )}
    </div>
  );
}

function statusOf(u: Unit, lang: Lang): string | null {
  if (u.down === 'downed') return T('downed', undefined, lang);
  if (u.down === 'stable') return T('stable', undefined, lang);
  if (u.down === 'dead') return T('dead', undefined, lang);
  if (u.down === 'ko') return T('ko', undefined, lang);
  if (u.down === 'fled') return T('fled', undefined, lang);
  if (u.commanded) return T('underCommand', undefined, lang);
  if (u.joined) return T('joined', undefined, lang);
  if (u.cond.hidden !== undefined) return T('hidden', undefined, lang);
  if (u.cond.crouched) return T('crouched', undefined, lang);
  if (u.cond.warpEdge) return T('reason_behind', undefined, lang);
  return null;
}

/** A class's name on a card: short in Spanish ("Bukijutsu"), the first word in English. */
export const className = (cls: string, lang: Lang): string =>
  lang === 'es' ? CLASS_ES[cls as keyof typeof CLASS_ES]?.short ?? cls : cls.split(' ')[0];

/** A unit's side colour: the party's blue, an enemy under Command violet, a foe red. */
const sideRing = (u: Unit): string => (homeTeam(u) === 'party' ? '#38bdf8' : u.commanded ? '#a78bfa' : '#f87171');

/** The acting (or selected) ninja: portrait, HP, chakra, AC and conditions. */
export function UnitCard({ u, hp, chakra, lang }: { u: Unit; hp: number; chakra: number; lang: Lang }) {
  const c = u.character;
  const status = statusOf(u, lang);
  // Who it is on one line, how it stands on the next: nothing gets cut off.
  const who = [c ? clanName(c.clan) : '', c ? className(c.shinobiClass, lang) : '', u.rank ? T(`rank_${u.rank}`, undefined, lang) : ''].filter(Boolean).join(' · ');
  const how = [T('ac', { n: u.ac }, lang), u.weapon.held ? T(u.armed ? 'drawn' : 'stowed', undefined, lang) : ''].filter(Boolean).join(' · ');
  return (
    <div className={`${panel} p-3 flex gap-3 items-center w-[min(280px,calc(100vw-24px))] xl:w-[340px]`}>
      <Portrait u={u} size={56} ring={sideRing(u)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-white truncate">{unitName(u, lang)}</span>
          <span className="text-amber-300 text-xs font-semibold shrink-0">{T('level', { n: u.level }, lang)}</span>
          {status && <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wider text-violet-300">{status}</span>}
        </div>
        {who && <div className="text-[11px] text-slate-400 leading-tight">{who}</div>}
        <div className="text-[11px] text-slate-400 leading-tight">{how}</div>
        <div className="mt-1.5 flex items-center gap-2">
          <Bar value={hp} max={u.maxHp} color={hpColor(hp / u.maxHp)} />
          <span className="text-[10px] text-slate-300 tabular-nums w-12 text-right">
            {hp}/{u.maxHp}
          </span>
        </div>
        {u.maxChakra > 0 && (
          <div className="mt-1 flex items-center gap-2">
            <Bar value={chakra} max={u.maxChakra} color="#38bdf8" height={4} />
            <span className="text-[10px] text-slate-400 tabular-nums w-12 text-right">
              {chakra}/{u.maxChakra}
            </span>
          </div>
        )}
        {u.effects.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {u.effects.slice(0, 5).map((e) => (
              <span key={e.id} className="text-[9px] px-1.5 py-0.5 rounded bg-fuchsia-950/70 text-fuchsia-200 border border-fuchsia-800/50">
                {e.id.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Round and turn order, starting with whoever acts now. */
export function InitiativeBar({ state, turnUnit, round, lang, onPick }: { state: BattleState; turnUnit?: string; round: number; lang: Lang; onPick: (id: string) => void }) {
  const order = state.order.filter((id) => {
    const u = state.units[id];
    return u && u.down !== 'dead' && u.down !== 'fled' && u.down !== 'ko' && u.kind !== 'hydra_head';
  });
  const at = Math.max(0, order.indexOf(turnUnit ?? ''));
  const rotated = [...order.slice(at), ...order.slice(0, at)].slice(0, 10);
  const cur = turnUnit ? state.units[turnUnit] : undefined;
  return (
    <div className={`${panel} px-3 py-2 flex items-center gap-3 max-w-full overflow-x-auto`}>
      <div className="text-center shrink-0">
        <div className="text-[9px] uppercase tracking-widest text-slate-400">{T('round', undefined, lang)}</div>
        <div className="text-xl font-black text-white tabular-nums leading-none">{round}</div>
      </div>
      <div className="w-px self-stretch bg-slate-700" />
      <div className="flex gap-1.5">
        {rotated.map((id, i) => {
          const u = state.units[id];
          // By the side it belongs to (an enemy under Command is still red).
          const side = homeTeam(u) === 'party' ? '#38bdf8' : '#f87171';
          const ring = i === 0 ? '#facc15' : side;
          return (
            <button key={id} type="button" onClick={() => onPick(id)} className="flex flex-col items-center gap-1" title={unitName(u, lang)}>
              <Portrait u={u} size={i === 0 ? 40 : 32} ring={ring} />
              <span className="h-0.5 w-6 rounded-full" style={{ background: u.commanded ? '#a78bfa' : side, opacity: u.down ? 0.3 : 1 }} />
            </button>
          );
        })}
      </div>
      {cur && (
        <div className="text-[10px] font-bold uppercase tracking-wider shrink-0 max-w-[5.5rem] xl:max-w-none leading-tight text-center" style={{ color: cur.team === 'party' ? (cur.controller === 'player' ? '#facc15' : '#7dd3fc') : '#fca5a5' }}>
          {cur.team === 'enemy' ? T('enemyTurn', undefined, lang) : cur.controller === 'player' ? T('yourTurn', undefined, lang) : T('aiTurn', undefined, lang)}
        </div>
      )}
    </div>
  );
}

const ORDERS: AiOrder[] = ['aggressive', 'defensive', 'support'];

/** The party: health, chakra, status, and who controls each ninja (with the AI's order). */
export function PartyFrames({
  party,
  views,
  selected,
  lang,
  onSelect,
  onController,
}: {
  party: Unit[];
  views: Map<string, { hp: number; chakra: number }>;
  selected?: string;
  lang: Lang;
  onSelect: (id: string) => void;
  onController: (id: string, controller: 'player' | 'ai', order?: AiOrder) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 w-[220px] xl:w-[260px]">
      {party.map((u) => {
        const v = views.get(u.id);
        const hp = v?.hp ?? u.hp;
        const chakra = v?.chakra ?? u.chakra;
        const status = statusOf(u, lang);
        return (
          <div key={u.id} className={`${panel} p-2 flex gap-2 items-center ${selected === u.id ? 'ring-1 ring-sky-400' : ''}`}>
            <button type="button" onClick={() => onSelect(u.id)} className="shrink-0">
              <Portrait u={u} size={36} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => onSelect(u.id)} className="text-sm font-semibold text-white truncate text-left">
                  {unitName(u, lang)}
                </button>
                {/* A beast that joined fights on its own: nobody takes its reins (D20). */}
                {!u.joined && (
                  <button
                    type="button"
                    onClick={() => onController(u.id, u.controller === 'ai' ? 'player' : 'ai')}
                    title={T(u.controller === 'ai' ? 'aiOn' : 'aiOff', undefined, lang)}
                    className={`ml-auto shrink-0 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${u.controller === 'ai' ? 'border-sky-500/60 text-sky-200 bg-sky-950/60' : 'border-slate-600 text-slate-300'}`}
                  >
                    {u.controller === 'ai' ? <Bot size={11} /> : <User size={11} />}
                    <span className="hidden xl:inline">{u.controller === 'ai' ? T('ai', undefined, lang) : T('player', undefined, lang)}</span>
                  </button>
                )}
              </div>
              {/* Its own line, so neither the name nor the status gets cut off. */}
              {status && <div className="text-[9px] uppercase tracking-wider text-violet-300 leading-tight">{status}</div>}
              <div className="mt-1">
                <Bar value={hp} max={u.maxHp} color={hpColor(hp / u.maxHp)} height={5} />
              </div>
              <div className="mt-0.5">
                <Bar value={chakra} max={u.maxChakra} color="#38bdf8" height={3} />
              </div>
              {u.controller === 'ai' && !u.joined && (
                <div className="mt-1 flex gap-1">
                  {ORDERS.map((o) => (
                    <button
                      key={o}
                      type="button"
                      title={T(`orderHelp_${o}` as TKey, undefined, lang)}
                      onClick={() => onController(u.id, 'ai', o)}
                      className={`text-[9px] px-1.5 py-0.5 rounded ${u.aiOrder === o ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                      {T(`order_${o}` as TKey, undefined, lang)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export interface ActionButton {
  id: string;
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
  hotkey?: string;
  badge?: string | number;
  disabled?: boolean;
  active?: boolean;
  help?: string;
  tone?: 'jutsu' | 'item' | 'end' | 'default';
  element?: string;
  /** A reaction or passive shown for what it is (its help on hover); it can't be pressed. */
  passive?: boolean;
  /** The painted icon to show when it isn't the button's own (the Great Fireball while it is aimed enhanced). */
  iconId?: string;
  /** The pop-up window over the slot: the full name, how it is used, what it does, its description. */
  tip?: ButtonTip;
}

export interface ButtonTip {
  title: string;
  /** Rank, action, chakra and reach. */
  meta?: string;
  /** Dice, area and save. */
  effect?: string;
  text?: string;
  /** What the enhanced cast does. */
  enh?: string;
  /** Why it can't be used now. */
  why?: string;
}

/** Resources and the buttons of the acting ninja. */
export function ActionBar({
  u,
  move,
  buttons,
  lang,
  onPress,
  onHover,
}: {
  u: Unit;
  move: number;
  buttons: ActionButton[];
  lang: Lang;
  onPress: (id: string) => void;
  onHover: (b: ActionButton | null) => void;
}) {
  // One row when it fits; otherwise two even rows (then it scrolls), so End turn is never hidden.
  const bar = React.useRef<HTMLDivElement | null>(null);
  const side = React.useRef<HTMLDivElement | null>(null);
  const [room, setRoom] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = bar.current?.parentElement;
    if (!el) return;
    const fit = () => setRoom(el.clientWidth - (side.current?.offsetWidth ?? 0) - 44);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fits = Math.max(1, Math.floor((room + 6) / 66));
  const rows = room > 0 && buttons.length > fits ? 2 : 1;
  const cols = Math.ceil(buttons.length / rows);
  const dot = (on: boolean, color: string, label: string) => (
    <div className="flex flex-col items-center gap-0.5 w-12">
      <span className="w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: color, background: on ? color : 'transparent' }} />
      <span className="text-[9px] text-slate-400">{label}</span>
    </div>
  );
  return (
    <div ref={bar} className={`${panel} px-3 py-2 flex items-center gap-3 max-w-full`}>
      <div ref={side} className="hidden sm:flex flex-col gap-1 shrink-0">
        <div className="flex">
          {dot(u.turn.action, '#22c55e', T('action', undefined, lang))}
          {dot(u.turn.bonus, '#f59e0b', T('bonus', undefined, lang))}
          {dot(u.turn.reaction, '#a855f7', T('reaction', undefined, lang))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-slate-400 w-8">{T('move', undefined, lang)}</span>
          <div className="w-24">
            <Bar value={move} max={Math.max(u.speed, move)} color="#38bdf8" height={5} />
          </div>
          <span className="text-[10px] text-slate-300 tabular-nums">
            {move.toFixed(1)}/{u.speed.toFixed(0)} m
          </span>
        </div>
      </div>
      <div className="grid gap-1.5 overflow-x-auto pb-0.5 min-w-0" style={{ gridTemplateColumns: `repeat(${cols}, 3.75rem)` }}>
        {buttons.map((b) => {
          const Icon = b.icon;
          // A long single word gets a size smaller rather than an ellipsis; two words wrap.
          const long = b.label.split(' ').some((w) => w.length > 9);
          return (
            <button
              key={b.id}
              type="button"
              // Not `disabled`: a disabled button gets no hover, and its help says why it is off.
              aria-disabled={b.disabled || b.passive}
              onClick={() => !b.disabled && !b.passive && onPress(b.id)}
              onMouseEnter={() => onHover(b)}
              onMouseLeave={() => onHover(null)}
              className={`relative flex flex-col items-center justify-center w-[3.75rem] h-14 shrink-0 rounded-lg border text-[9px] leading-tight transition-colors
                ${b.active ? 'border-amber-400 bg-amber-950/60 text-amber-100' : b.passive ? 'border-dashed border-orange-500/60 bg-orange-950/20 text-orange-100 cursor-help' : b.tone === 'jutsu' ? 'border-orange-700/60 bg-orange-950/40 text-orange-100 hover:bg-orange-900/50' : b.tone === 'end' ? 'border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700' : 'border-slate-600/70 bg-slate-900/80 text-slate-200 hover:bg-slate-800'}
                ${b.disabled ? 'opacity-35 cursor-not-allowed' : ''}`}
            >
              {b.hotkey && <span className="absolute top-0.5 left-1 text-[8px] text-slate-400">{b.hotkey}</span>}
              <Icon size={18} />
              <span className={`mt-0.5 px-0.5 max-w-full text-center leading-[1.05] line-clamp-2 ${long ? 'text-[8px]' : ''}`}>{b.label}</span>
              {b.badge !== undefined && (
                <span className="absolute -bottom-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-sky-600 text-white text-[9px] font-bold flex items-center justify-center">{b.badge}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The last roll: the die kept on the hexagon, who rolled against whom, the sum, and (when two dice
 * were rolled, or the blow was stepped away from) a line saying so. Green when it went the party's
 * way, red when it went against it.
 */
export function RollToast({ text, sub, note, die, ok }: { text: string; sub?: string; note?: string; die?: number; ok?: boolean }) {
  return (
    <div className={`${panel} px-3 py-2 flex items-center gap-3 w-[min(236px,calc(100vw-24px))] xl:w-[320px]`}>
      <div className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-md font-black text-sm ${ok ? 'bg-emerald-900/70 text-emerald-200' : 'bg-rose-950/70 text-rose-200'}`} style={{ clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)' }}>
        {die ?? '·'}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-white leading-tight">{text}</div>
        {sub && <div className={`text-[11px] leading-tight ${ok ? 'text-emerald-300' : 'text-rose-300'}`}>{sub}</div>}
        {note && <div className="text-[10px] text-amber-200 leading-tight">{note}</div>}
      </div>
    </div>
  );
}

export function LogPanel({ lines, onClose, lang }: { lines: { text: string; tone?: string }[]; onClose: () => void; lang: Lang }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [lines.length]);
  return (
    <div className={`${panel} w-[min(236px,calc(100vw-24px))] xl:w-[340px] max-h-[40vh] flex flex-col`}>
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-700/60">
        <ScrollText size={14} className="text-slate-400" />
        <span className="text-xs font-semibold text-slate-200">{T('log', undefined, lang)}</span>
        <button type="button" onClick={onClose} className="ml-auto text-slate-400 hover:text-white" aria-label={T('hideLog', undefined, lang)}>
          <X size={14} />
        </button>
      </div>
      <div ref={ref} className="overflow-y-auto px-3 py-2 text-[11px] leading-relaxed space-y-0.5">
        {lines.map((l, i) => (
          <div key={i} className={l.tone ?? 'text-slate-300'}>
            {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Prompt({ title, text, yes, no, yesKey = 'Y', noKey = 'N', onYes, onNo }: { title: string; text: string; yes: string; no: string; yesKey?: string; noKey?: string; onYes: () => void; onNo: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
      <div className={`${panel} pointer-events-auto p-4 w-[min(380px,100%)] border-amber-500/60`}>
        <div className="text-amber-300 text-xs font-bold uppercase tracking-widest">{title}</div>
        <div className="mt-2 text-sm text-slate-100">{text}</div>
        <div className="mt-4 flex gap-2 justify-end">
          <button type="button" onClick={onNo} className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-sm">
            {no} <span className="text-[10px] text-slate-500">{noKey}</span>
          </button>
          <button type="button" onClick={onYes} className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 text-sm">
            {yes} <span className="text-[10px] text-slate-800">{yesKey}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function Tip({ text, onClose, onOff, lang }: { text: string; onClose: () => void; onOff: () => void; lang: Lang }) {
  return (
    <div className={`${panel} px-3 py-2 w-[min(380px,calc(100vw-32px))] border-sky-600/50`}>
      <div className="text-[12px] text-sky-100">{text}</div>
      <div className="mt-1.5 flex gap-3 justify-end">
        <button type="button" onClick={onOff} className="text-[10px] text-slate-400 hover:text-slate-200">
          {T('tipsOff', undefined, lang)}
        </button>
        <button type="button" onClick={onClose} className="text-[11px] font-semibold text-sky-300 hover:text-sky-100">
          {T('tipGotIt', undefined, lang)}
        </button>
      </div>
    </div>
  );
}
