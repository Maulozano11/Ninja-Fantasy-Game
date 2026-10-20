// The battle HUD drawn with the owner's kit (docs/reference/ui-battle-approved-mockup.png): the
// chained target plaque, the round medallion and the turn row at the top, the round minimap, the
// menu button, the action bar with the acting ninja's medallion, and the party frames. Positions are
// the approved mockup's (src/assets/ui_battle/layout.json), relative to each anchor.

import React from 'react';
import type { BattleState, Unit } from '../../battle/types';
import { homeTeam } from '../../battle/types';
import { clanName } from '../../data/shinobiData';
import type { Lang } from '../../i18n';
import { T } from './battleText';
import { unitName } from './battleLog';
import { portraitOf } from './unitArt';
import type { ActionButton, ButtonTip } from './hud';
import { UnitCard } from './hud';
import { iconUrl, kitText, Piece, slotFrameUrl } from './kit';

const CX = 800;
const BOTTOM = 900;

function Face({ u, x, y, w, h, round }: { u: Unit; x: number; y: number; w: number; h: number; round?: boolean }) {
  const src = portraitOf(u, 80);
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: round ? '50%' : 2, overflow: 'hidden', background: '#16120c' }}>
      {src && <img src={src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} />}
    </div>
  );
}

/** Who the target plaque shows: the unit under the cursor, else an enemy acting now, else the boss. */
export function plaqueUnit(s: BattleState, hovered?: string, acting?: string): Unit | undefined {
  const live = (u?: Unit) => (u && u.down !== 'dead' && u.down !== 'fled' ? u : undefined);
  const h = live(hovered ? s.units[hovered] : undefined);
  if (h) return h.kind === 'hydra_head' ? live(Object.values(s.units).find((x) => x.kind === 'hydra_body')) ?? h : h;
  const a = live(acting ? s.units[acting] : undefined);
  if (a && homeTeam(a) === 'enemy' && a.kind !== 'hydra_head') return a;
  return live(Object.values(s.units).find((x) => x.rank === 'boss' && x.kind !== 'hydra_head'));
}

/** The top centre: chains, the target plaque, the round medallion and the turn row. */
export function TopPlaque({
  state,
  turnUnit,
  round,
  target,
  targetHp,
  lang,
  onPick,
  row,
}: {
  state: BattleState;
  turnUnit?: string;
  round: number;
  target?: Unit;
  targetHp?: number;
  lang: Lang;
  onPick: (id: string) => void;
  /** Replaces the turn row (the stealth phase's own bar). */
  row?: React.ReactNode;
}) {
  const order = state.order.filter((id) => {
    const u = state.units[id];
    return u && u.down !== 'dead' && u.down !== 'fled' && u.down !== 'ko' && u.kind !== 'hydra_head';
  });
  const at = Math.max(0, order.indexOf(turnUnit ?? ''));
  const rotated = [...order.slice(at), ...order.slice(0, at)].slice(0, 9);
  const x0 = 640 - CX;
  const others = rotated.slice(1);
  const lastRight = x0 + 46 + others.length * 40 - 4;
  const sagX = Math.round((x0 + lastRight) / 2) + 16 - 58;
  const hp = targetHp ?? target?.hp ?? 0;
  const frac = target ? Math.max(0, Math.min(1, hp / Math.max(1, target.maxHp))) : 0;
  const clan = target?.character ? clanName(target.character.clan) : '';
  return (
    <>
      <Piece p="chain_left" x={488 - CX} y={2} />
      {!row && rotated.length > 0 && (
        <>
          <Piece p="chain_sag" x={sagX} y={120} />
          <Piece p="chain_link" x={lastRight} y={100} />
          <Piece p="chain_right" x={lastRight + 48} y={-6} />
        </>
      )}
      <Piece p="round_medallion" x={554 - CX} y={62}>
        <div style={{ position: 'absolute', left: 16, top: 18, width: 48, textAlign: 'center', ...kitText, fontSize: 8, color: '#d9cba8' }}>{T('round', undefined, lang).toUpperCase()}</div>
        <div style={{ position: 'absolute', left: 16, top: 28, width: 48, textAlign: 'center', ...kitText, fontSize: 22, lineHeight: '24px' }}>{round}</div>
      </Piece>
      {target && (
        <div title={target.character ? `${unitName(target, lang)} · ${clan}` : unitName(target, lang)}>
          <div style={{ position: 'absolute', left: 612 - CX, top: 8, width: 390, textAlign: 'center', ...kitText, fontSize: 15 }}>
            {unitName(target, lang)}
            {clan && <span style={{ color: '#d9cba8' }}> · {clan}</span>} - {T('level', { n: target.level }, lang)}
          </div>
          <Piece p="target_bar" x={612 - CX} y={30} w={390} h={40} />
          {frac > 0 && <Piece p="target_fill" x={648 - CX} y={44} w={Math.max(12, Math.round(318 * frac))} h={12} />}
          <div style={{ position: 'absolute', left: 648 - CX, top: 43, width: 318, textAlign: 'center', ...kitText, fontSize: 9, lineHeight: '14px' }}>
            {hp} / {target.maxHp}
          </div>
        </div>
      )}
      {row ? (
        <div style={{ position: 'absolute', left: x0, top: 84 }}>{row}</div>
      ) : (
        <>
          {rotated.map((id, i) => {
            const u = state.units[id];
            if (i === 0) {
              return (
                <button key={id} type="button" onClick={() => onPick(id)} title={unitName(u, lang)} style={{ position: 'absolute', left: x0, top: 82, width: 44, height: 44 }}>
                  <Face u={u} x={6} y={6} w={32} h={32} />
                  <Piece p="init_active" x={0} y={0} />
                </button>
              );
            }
            const enemy = homeTeam(u) !== 'party';
            return (
              <button key={id} type="button" onClick={() => onPick(id)} title={unitName(u, lang)} style={{ position: 'absolute', left: x0 + 46 + (i - 1) * 40, top: 82, width: 36, height: 40, opacity: u.down ? 0.45 : 1 }}>
                <Face u={u} x={4} y={4} w={28} h={28} round />
                <Piece p={enemy ? 'init_enemy' : 'init_ally'} x={0} y={0} style={u.commanded ? { filter: 'hue-rotate(60deg)' } : undefined} />
              </button>
            );
          })}
          {rotated.length > 0 && <Piece p="init_end" x={lastRight + 12} y={84} />}
        </>
      )}
    </>
  );
}

/** The round minimap frame around its canvas (the canvas goes in the round window). */
export function MiniRing({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div style={{ position: 'absolute', left: 1404 - 1600 + 24, top: 4 + 24, width: 152, height: 152, borderRadius: '50%', overflow: 'hidden', background: '#0b1513' }}>{children}</div>
      <Piece p="minimap_ring" x={1404 - 1600} y={4} style={{ pointerEvents: 'none' }} />
    </>
  );
}

/** The owner's icon for a button: by its jutsu id, or the action's own (the attack and throw are weapon_*, End turn end_turn). */
const ICON_OF: Record<string, string> = { attack: 'weapon_attack', throw: 'weapon_throw', end: 'end_turn' };
const iconId = (b: ActionButton) => b.iconId ?? ICON_OF[b.id] ?? b.id.replace(/^(jutsu|passive):/, '');
/** A skill slot (his steel-and-gold frame): the attacks and jutsu, and every action he has painted an icon for. */
const SKILL = (b: ActionButton) => b.id === 'attack' || b.id === 'throw' || b.id.startsWith('jutsu:') || b.id.startsWith('passive:') || !!iconUrl(iconId(b), false);
const TINT: Record<string, string> = {
  fire: '#fb923c',
  water: '#38bdf8',
  wind: '#a7f3d0',
  lightning: '#fde047',
  earth: '#d6b27c',
  genjutsu: '#c084fc',
  chakra: '#7dd3fc',
  poison: '#a3e635',
};

function SkillSlot({ b, x, dense, onPress, onHover }: { b: ActionButton; x: number; dense: boolean; onPress: (id: string) => void; onHover: (b: ActionButton | null, x?: number) => void }) {
  const Icon = b.icon;
  const painted = iconUrl(iconId(b), dense);
  const off = b.disabled || b.passive;
  return (
    <button
      type="button"
      aria-label={b.label}
      aria-disabled={off}
      onClick={() => !b.disabled && !b.passive && onPress(b.id)}
      onMouseEnter={() => onHover(b, x + 28)}
      onMouseLeave={() => onHover(null)}
      style={{ position: 'absolute', left: x, top: 796 - BOTTOM, width: 56, height: 56, cursor: b.passive ? 'help' : b.disabled ? 'not-allowed' : 'pointer' }}
    >
      <div style={{ position: 'absolute', left: 6, top: 6, width: 44, height: 44, background: '#0f1116', overflow: 'hidden', filter: off ? 'grayscale(0.85) brightness(0.55)' : undefined }}>
        {painted ? (
          <img src={painted} alt="" draggable={false} style={{ width: 44, height: 44, imageRendering: 'pixelated' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: b.element ? TINT[b.element] ?? '#efe6cf' : '#efe6cf' }}>
            <Icon size={24} />
          </div>
        )}
      </div>
      {/* His steel-and-gold slot from the icon pictures, over the icon (its window is open). */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 56, height: 56, pointerEvents: 'none', backgroundImage: `url(${slotFrameUrl(!!b.active)})`, backgroundSize: '100% 100%', imageRendering: 'pixelated', opacity: b.passive ? 0.7 : 1 }} />
      {b.hotkey && (
        <Piece p="skill_tag" x={17} y={-14}>
          <span style={{ position: 'absolute', left: 4, top: 4, width: 14, textAlign: 'center', ...kitText, fontSize: 9, lineHeight: '14px' }}>{b.hotkey}</span>
        </Piece>
      )}
      {b.badge !== undefined && (
        <Piece p="item_badge" x={40} y={40}>
          <span style={{ position: 'absolute', inset: 0, textAlign: 'center', ...kitText, fontSize: 9, lineHeight: '18px', color: '#dbeafe' }}>{b.badge}</span>
        </Piece>
      )}
    </button>
  );
}

function ItemSlot({ b, x, onPress, onHover, end }: { b: ActionButton; x: number; onPress: (id: string) => void; onHover: (b: ActionButton | null, x?: number) => void; end?: boolean }) {
  const Icon = b.icon;
  return (
    <button
      type="button"
      aria-label={b.label}
      aria-disabled={b.disabled}
      onClick={() => !b.disabled && onPress(b.id)}
      onMouseEnter={() => onHover(b, x + 26)}
      onMouseLeave={() => onHover(null)}
      style={{ position: 'absolute', left: x, top: 798 - BOTTOM, width: 52, height: 52, cursor: b.disabled ? 'not-allowed' : 'pointer' }}
    >
      <Piece p="item_slot" x={0} y={0} w={52} h={52} style={{ filter: b.active ? 'brightness(1.6) sepia(0.6)' : end ? 'brightness(1.25)' : undefined }} />
      <div style={{ position: 'absolute', left: 6, top: 7, width: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: end ? '#f5d9a8' : '#b4c4d2', opacity: b.disabled ? 0.4 : 1 }}>
        <Icon size={16} />
        <span style={{ ...kitText, fontSize: 7.5, lineHeight: '8px', color: end ? '#f5d9a8' : '#c8d3dc', whiteSpace: 'normal', textAlign: 'center', maxWidth: 44 }}>{b.label}</span>
      </div>
      {b.hotkey && <span style={{ position: 'absolute', left: 6, top: 3, ...kitText, fontSize: 8, color: '#8fa0ae' }}>{b.hotkey}</span>}
      {b.badge !== undefined && (
        <Piece p="item_badge" x={38} y={40}>
          <span style={{ position: 'absolute', inset: 0, textAlign: 'center', ...kitText, fontSize: 9, lineHeight: '18px', color: '#b4c4d2' }}>{b.badge}</span>
        </Piece>
      )}
      {end && <Piece p="end_turn_gem" x={42} y={-4} />}
    </button>
  );
}

/** The pop-up over a slot (the owner: names show here, not under the icons). */
function TipWindow({ tip, x }: { tip: ButtonTip; x: number }) {
  return (
    <div
      style={{ position: 'absolute', left: x, bottom: BOTTOM - 752, width: 320, pointerEvents: 'none' }}
      className="rounded-lg border border-[#8a6a3a] bg-[#16120c]/95 px-3 py-2 shadow-2xl shadow-black/60 flex flex-col gap-1"
    >
      <div className="text-[14px] font-bold leading-tight text-[#f5d9a8]">{tip.title}</div>
      {tip.meta && <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[#d9cba8]">{tip.meta}</div>}
      {tip.effect && <div className="text-[12px] font-semibold text-[#efe6cf]">{tip.effect}</div>}
      {tip.text && <div className="text-[11.5px] leading-snug text-[#c8bfa6]">{tip.text}</div>}
      {tip.enh && <div className="text-[11px] leading-snug text-amber-300">{tip.enh}</div>}
      {tip.why && <div className="text-[11px] font-semibold text-rose-300">{tip.why}</div>}
    </div>
  );
}

/**
 * The bottom centre: the action bar (pips and movement, the numbered skill slots, the other actions
 * and End turn), the crest with HP and chakra, the acting ninja's medallion, and the lower plaque
 * with the help line.
 */
export function ActionDock({
  u,
  hp,
  chakra,
  move,
  buttons,
  lang,
  dense,
  line,
  lineTone,
  room,
  clearLeft,
  onPress,
  onHover,
}: {
  u?: Unit;
  hp: number;
  chakra: number;
  move: number;
  buttons: ActionButton[];
  lang: Lang;
  dense: boolean;
  line?: string | null;
  lineTone?: 'error' | 'help' | 'quiet';
  /** Half the screen's width in layout pixels. */
  room: number;
  /** Where the party frames end, from the screen's left edge, in layout pixels: the bar keeps clear. */
  clearLeft: number;
  onPress: (id: string) => void;
  onHover: (b: ActionButton | null) => void;
}) {
  const [card, setCard] = React.useState(false);
  const [hov, setHov] = React.useState<{ id: string; x: number } | null>(null);
  const hover = (b: ActionButton | null, x?: number) => {
    setHov(b && x !== undefined ? { id: b.id, x } : null);
    onHover(b);
  };
  const end = buttons.find((b) => b.id === 'end');
  const skills = buttons.filter((b) => SKILL(b) && b !== end);
  const items = buttons.filter((b) => !SKILL(b) && b !== end);
  const paintedEnd = !!end && SKILL(end);
  // Laid out from the bar's left edge as in the mockup, then the whole bar centred.
  const s0 = 222;
  const sEnd = s0 + Math.max(skills.length, 1) * 62 - 6;
  const i0 = skills.length ? sEnd + 6 : s0;
  const iEnd = i0 + items.length * 62 - 10;
  const e0 = iEnd + 10;
  const right = (end ? e0 + (paintedEnd ? 56 : 52) : iEnd) + 26;
  const W = 48 + Math.ceil((Math.max(right, 920) - 48) / 8) * 8;
  const L0 = -Math.round(W / 2) - 2;
  // A long bar moves right of the party frames (as far as the screen allows), its crest with it.
  const dx = Math.max(0, Math.min(-room + clearLeft + 12 - L0, room - 8 - W - L0));
  const L = L0;
  const hpF = u ? Math.max(0, Math.min(1, hp / Math.max(1, u.maxHp))) : 0;
  const third = u && u.maxChakra > 0 ? u.maxChakra / 3 : 0;
  const pip = (on: boolean, p: 'pip_action' | 'pip_bonus' | 'pip_reaction', x: number, label: string) => (
    <>
      <Piece p={on ? p : 'pip_spent'} x={L + x} y={794 - BOTTOM} />
      <span style={{ position: 'absolute', left: L + x - 14, top: 818 - BOTTOM, width: 50, textAlign: 'center', ...kitText, fontSize: 8, color: '#c8bfa6' }}>{label}</span>
    </>
  );
  const moveF = u ? Math.max(0, Math.min(1, move / Math.max(u.speed, move, 0.01))) : 0;
  const plaqueW = Math.max(578, Math.min(1180, (line?.length ?? 0) * 6.2 + 200));
  return (
    <div style={{ position: 'absolute', left: dx, top: 0 }}>
      <Piece p="bar_frame" x={L} y={762 - BOTTOM} w={W} h={112} />
      {u && (
        <>
          {pip(u.turn.action, 'pip_action', 38, T('action', undefined, lang))}
          {pip(u.turn.bonus, 'pip_bonus', 88, T('bonus', undefined, lang))}
          {pip(u.turn.reaction, 'pip_reaction', 138, T('reaction', undefined, lang))}
          <span style={{ position: 'absolute', left: L + 26, top: 832 - BOTTOM, ...kitText, fontSize: 8, color: '#c8bfa6' }}>{T('move', undefined, lang)}</span>
          <Piece p="move_trough" x={L + 62} y={834 - BOTTOM} w={116} h={12} />
          {moveF > 0 && <Piece p="move_fill" x={L + 74} y={836 - BOTTOM} w={Math.max(8, Math.round(100 * moveF))} h={8} />}
          <span style={{ position: 'absolute', left: L + 182, top: 832 - BOTTOM, ...kitText, fontSize: 8, color: '#c8d3dc' }}>
            {move.toFixed(1).replace('.', lang === 'es' ? ',' : '.')}/{u.speed.toFixed(0)} m
          </span>
        </>
      )}
      {skills.map((b, i) => (
        <SkillSlot key={b.id} b={b} x={L + s0 + i * 62} dense={dense} onPress={onPress} onHover={hover} />
      ))}
      {items.map((b, i) => (
        <ItemSlot key={b.id} b={b} x={L + i0 + i * 62} onPress={onPress} onHover={hover} />
      ))}
      {end && (paintedEnd ? <SkillSlot b={end} x={L + e0} dense={dense} onPress={onPress} onHover={hover} /> : <ItemSlot b={end} x={L + e0} onPress={onPress} onHover={hover} end />)}

      <Piece p="crest_strip" x={550 - CX} y={724 - BOTTOM} w={512} h={44} />
      {u && (
        <>
          {hpF > 0 && <Piece p="hp_fill" x={634 - CX} y={746 - BOTTOM} w={Math.max(12, Math.round(172 * hpF))} h={12} />}
          <span style={{ position: 'absolute', left: 634 - CX, top: 745 - BOTTOM, width: 172, textAlign: 'center', ...kitText, fontSize: 9, lineHeight: '14px' }}>
            {hp}/{u.maxHp}
          </span>
          {u.maxChakra > 0 && (
            <>
              <Piece p="chakra_line" x={846 - CX} y={750 - BOTTOM} w={132} h={6} />
              {(['chakra_red', 'chakra_orange', 'chakra_blue'] as const).map((g, i) => (
                <Piece key={g} p={chakra > i * third + 0.001 ? g : 'chakra_empty'} x={850 - CX + i * 26} y={742 - BOTTOM} />
              ))}
              <span style={{ position: 'absolute', left: 930 - CX, top: 745 - BOTTOM, width: 46, textAlign: 'center', ...kitText, fontSize: 9, lineHeight: '14px', color: '#dbeafe' }}>
                {chakra}/{u.maxChakra}
              </span>
            </>
          )}
          <div onMouseEnter={() => setCard(true)} onMouseLeave={() => setCard(false)}>
            <Face u={u} x={773 - CX} y={695 - BOTTOM} w={66} h={66} round />
            <Piece p="medallion_active" x={706 - CX} y={674 - BOTTOM} />
          </div>
          {card && (
            <div style={{ position: 'absolute', left: -170, top: 674 - BOTTOM - 150, width: 340 }}>
              <UnitCard u={u} hp={hp} chakra={chakra} lang={lang} />
            </div>
          )}
        </>
      )}
      {!u && <Piece p="medallion_active" x={706 - CX} y={674 - BOTTOM} />}

      {(() => {
        const shown = hov ? buttons.find((b) => b.id === hov.id) : undefined;
        const aimed = shown ? undefined : skills.findIndex((b) => b.active);
        const b = shown ?? (aimed !== undefined && aimed >= 0 ? skills[aimed] : undefined);
        const x = shown && hov ? hov.x : aimed !== undefined && aimed >= 0 ? L + s0 + aimed * 62 + 28 : 0;
        return b?.tip ? <TipWindow tip={b.tip} x={Math.max(L + 8, Math.min(L + W - 8 - 320, x - 160))} /> : null;
      })()}
      <Piece p="lower_plaque" x={-Math.round(plaqueW / 2) + 5} y={868 - BOTTOM} w={Math.round(plaqueW)} h={32} />
      {line && (
        <div
          style={{
            position: 'absolute',
            left: -Math.round(plaqueW / 2) + 95,
            top: 873 - BOTTOM,
            width: Math.round(plaqueW) - 180,
            textAlign: 'center',
            ...kitText,
            fontSize: 11,
            lineHeight: '18px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: lineTone === 'error' ? '#fda4af' : lineTone === 'quiet' ? '#a8a08c' : '#efe6cf',
          }}
        >
          {line}
        </div>
      )}
    </div>
  );
}

/** The party at the bottom left: portrait frames with HP and chakra, and the button for who plays whom. */
export function PartyDock({
  party,
  views,
  selected,
  lang,
  onSelect,
  onPanel,
}: {
  party: Unit[];
  views: Map<string, { hp: number; chakra: number }>;
  selected?: string;
  lang: Lang;
  onSelect: (id: string) => void;
  onPanel: () => void;
}) {
  const [card, setCard] = React.useState<string | null>(null);
  const shown = card ? party.find((u) => u.id === card) : undefined;
  return (
    <>
      <button type="button" onClick={onPanel} title={T('partyPanel', undefined, lang)} style={{ position: 'absolute', left: 16, top: 780 - BOTTOM, width: 24, height: 24 }}>
        <Piece p="button_small" x={0} y={0} />
        <Piece p="glyph_emblem" x={6} y={6} />
      </button>
      {party.map((u, i) => {
        const v = views.get(u.id);
        const hp = v?.hp ?? u.hp;
        const ch = v?.chakra ?? u.chakra;
        const x = 10 + i * 64;
        const down = !!u.down;
        return (
          <button
            key={u.id}
            type="button"
            onClick={() => onSelect(u.id)}
            onMouseEnter={() => setCard(u.id)}
            onMouseLeave={() => setCard(null)}
            title={unitName(u, lang)}
            style={{ position: 'absolute', left: x, top: 812 - BOTTOM, width: 60, height: 80, filter: selected === u.id ? 'drop-shadow(0 0 3px #f5d58a)' : undefined }}
          >
            <div style={{ position: 'absolute', left: 6, top: 6, width: 48, height: 50, overflow: 'hidden', background: '#16120c', filter: down ? 'grayscale(1) brightness(0.5)' : undefined }}>
              <Face u={u} x={-1} y={0} w={50} h={50} />
            </div>
            <Piece p="party_frame" x={0} y={0} w={60} h={80} style={{ pointerEvents: 'none' }} />
            {hp > 0 && <Piece p="party_hp_fill" x={6} y={58} w={Math.max(8, Math.round(48 * Math.min(1, hp / Math.max(1, u.maxHp))))} h={8} />}
            {u.maxChakra > 0 && ch > 0 && <Piece p="party_ch_fill" x={6} y={68} w={Math.max(8, Math.round(48 * Math.min(1, ch / u.maxChakra)))} h={6} />}
            {u.controller === 'ai' && <span style={{ position: 'absolute', right: 8, top: 7, ...kitText, fontSize: 7, color: '#7dd3fc' }}>{T('ai', undefined, lang)}</span>}
          </button>
        );
      })}
      {shown && (
        <div style={{ position: 'absolute', left: 10, top: 812 - BOTTOM - 140, width: 340 }}>
          <UnitCard u={shown} hp={views.get(shown.id)?.hp ?? shown.hp} chakra={views.get(shown.id)?.chakra ?? shown.chakra} lang={lang} />
        </div>
      )}
    </>
  );
}
