import React, { useEffect, useRef, useState } from 'react';
import type { ShinobiCharacter } from '../../types/shinobi';
import type { FireLevel } from '../../rules/rest';
import { STICKS_PER_CAMP } from '../../data/campActivities';
import { isUnconscious } from '../../rules/ninja';
import { ShinobiSpriteCanvas } from '../ShinobiSpriteCanvas';
import { WorldSpriteView, worldSpriteSpec } from '../world/WorldSpriteView';
import { useLang } from '../../i18n';
import { T } from './campText';

// The camp at night, drawn at the world scale (1 m = 57 px) and scaled to the panel's width.
const W = 720;
const H = 300;

/** A world sprite placed by its anchor (the point that touches the ground). */
function Placed({ group, name, x, y, anim, scale = 1, light = 1, flip, z }: { group: string; name: string; x: number; y: number; anim?: string; scale?: number; light?: number; flip?: boolean; z?: number }) {
  const spec = worldSpriteSpec(group, name);
  if (!spec) return null;
  const [ax, ay] = spec.anchor;
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: x - ax * scale,
        top: y - ay * scale,
        zIndex: z ?? Math.round(y),
        filter: light < 1 ? `brightness(${light}) saturate(${0.5 + light / 2})` : undefined,
        transform: flip ? 'scaleX(-1)' : undefined,
      }}
    >
      <WorldSpriteView group={group} name={name} anim={anim} scale={scale} title="" />
    </div>
  );
}

// Fixed star field (a tiny LCG, so it never moves between renders).
const STARS = (() => {
  let s = 7;
  const r = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  return Array.from({ length: 46 }, () => ({ x: r() * W, y: r() * 150, big: r() > 0.85 }));
})();

// Where the party sits around the fire: two on each side, facing it.
const SEATS = [
  { x: 286, y: 262, flip: false },
  { x: 436, y: 262, flip: true },
  { x: 236, y: 281, flip: false },
  { x: 486, y: 281, flip: true },
];
const FIRE = { x: 361, y: 270 };
const MAX_HEIGHT = 380;
const MIN_SCALE = 0.8;

export function IncenseSticks({ used, compact }: { used: number; compact?: boolean }) {
  useLang();
  return (
    <span className="inline-flex items-end gap-[3px]" title={T('sticksLeft', { left: STICKS_PER_CAMP - used, total: STICKS_PER_CAMP })}>
      {Array.from({ length: STICKS_PER_CAMP }, (_, i) => {
        const lit = i < STICKS_PER_CAMP - used;
        return (
          <span key={i} className="relative inline-block" style={{ width: 3, height: compact ? 12 : 16 }}>
            <span className={`absolute bottom-0 left-0 w-full rounded-sm ${lit ? 'bg-amber-700' : 'bg-slate-600'}`} style={{ height: lit ? '100%' : '30%' }} />
            {lit && <span className="absolute -top-0.5 left-[-1px] w-[5px] h-[5px] rounded-full bg-orange-400 shadow-[0_0_6px_2px_rgba(251,146,60,0.7)] animate-pulse" />}
          </span>
        );
      })}
    </span>
  );
}

export interface CampSceneProps {
  members: ShinobiCharacter[];
  fire?: FireLevel;
  /** The party has gone to sleep: the fire burns down to embers. */
  asleep?: boolean;
  /** Morning light. */
  dawn?: boolean;
  /** Raiders in the dark. */
  alarm?: boolean;
  shrine?: boolean;
  danger: number;
  dangerLabel?: string;
  selected?: string;
  onSelect?: (id: string) => void;
  sticksUsed?: Record<string, number>;
  /** Pose per ninja (a ninja doing a jutsu activity casts). */
  poses?: Record<string, 'idle' | 'handsigns' | 'cast' | 'charge' | 'victory'>;
}

export function CampScene({ members, fire, asleep, dawn, alarm, shrine, danger, dangerLabel, selected, onSelect, sticksUsed, poses }: CampSceneProps) {
  useLang();
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [width, setWidth] = useState(W);
  // On wide screens the sky is cropped so the camp's controls stay in view; on narrow ones the
  // sides are cropped around the fire so the party stays big enough to read.
  const height = Math.min(H * scale, MAX_HEIGHT);
  const left = Math.min(0, (width - W * scale) / 2);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      setWidth(el.clientWidth);
      setScale(Math.max(MIN_SCALE, el.clientWidth / W));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const lit = fire === 'low' || fire === 'bonfire';
  const glow = !lit ? 0 : asleep ? 0.18 : fire === 'bonfire' ? 0.55 : 0.36;
  const fireAnim = !lit ? 'out' : asleep ? 'smoldering' : 'burning';
  const warm = dawn ? 0.95 : !lit ? 0.62 : asleep ? 0.7 : fire === 'bonfire' ? 1 : 0.9;
  const shade = dawn ? 0.6 : 1;
  const moonRing = danger >= 40 ? 'ring-rose-500/70' : danger >= 20 ? 'ring-amber-400/60' : 'ring-slate-300/40';

  return (
    <div ref={ref} className="relative w-full overflow-hidden rounded-2xl border border-slate-800 bg-[#070b1a]" style={{ height }}>
      <div className="absolute origin-top-left" style={{ left, top: height - H * scale, width: W, height: H, transform: `scale(${scale})` }}>
        {/* sky and stars */}
        <div
          className="absolute inset-0 transition-[background] duration-1000"
          style={{
            background: dawn
              ? 'linear-gradient(#1e2b4a 0%, #4b5a7a 38%, #c98a5a 62%, #e8b07a 68%, #2b3424 72%, #1d261b 100%)'
              : 'linear-gradient(#060a1c 0%, #101a38 48%, #18233f 64%, #1c2a2a 70%, #141d1a 100%)',
          }}
        />
        {!dawn && STARS.map((s, i) => (
          <span key={i} className="absolute rounded-full bg-slate-100" style={{ left: s.x, top: s.y, width: s.big ? 2 : 1, height: s.big ? 2 : 1, opacity: s.big ? 0.9 : 0.55 }} />
        ))}
        {/* ground */}
        <div className="absolute left-0 right-0" style={{ top: 206, bottom: 0, background: 'radial-gradient(ellipse 60% 70% at 50% 70%, #2a3324 0%, #1b2419 55%, #10160f 100%)' }} />

        {/* trees and the clearing's edge */}
        <Placed group="trees" name="pine" x={64} y={214} light={0.28 / shade} z={1} />
        <Placed group="trees" name="oak" x={668} y={220} light={0.26 / shade} z={1} />
        <Placed group="trees" name="pine" x={560} y={204} light={0.2 / shade} z={0} flip />
        <Placed group="plants" name="bush_wide" x={520} y={236} light={0.38 / shade} />
        <Placed group="plants" name="bush_round" x={96} y={262} light={0.42 / shade} />
        <Placed group="trees" name="stump" x={124} y={292} light={0.5} />
        <Placed group="landmarks" name="rocks_small" x={318} y={292} light={0.6} />
        <Placed group="plants" name="fern" x={452} y={296} light={0.55} />

        {/* camp */}
        <Placed group="camp" name="tent" x={168} y={242} light={dawn ? 0.8 : 0.42 + glow * 0.5} />
        {shrine && (
          <>
            <Placed group="landmarks" name="hokora" x={590} y={244} light={0.5 + glow * 0.4} />
            <Placed group="landmarks" name="stone_lantern" x={630} y={250} anim="lit" light={0.9} />
          </>
        )}
        <Placed group="camp" name="campfire" x={FIRE.x} y={FIRE.y} anim={fireAnim} scale={fire === 'bonfire' && !asleep ? 1.5 : 1} />
        {lit && <Placed group="camp" name="smoke" x={FIRE.x + 2} y={FIRE.y - (fire === 'bonfire' ? 70 : 46)} light={0.5} z={400} />}

        {/* the party */}
        {members.slice(0, SEATS.length).map((m, i) => {
          const seat = SEATS[i];
          const down = m.currentHp <= 0 || isUnconscious(m);
          const pose = down ? 'hurt' : poses?.[m.id] ?? 'idle';
          return (
            <div key={m.id} className="absolute pointer-events-none" style={{ left: seat.x - 64, top: seat.y - 120, zIndex: seat.y + 1, width: 128 }}>
              {selected === m.id && (
                <div className="absolute left-1/2 -translate-x-1/2 rounded-[50%] bg-cyan-300/30 border border-cyan-300/70" style={{ top: 114, width: 54, height: 12 }} />
              )}
              <div style={{ filter: `brightness(${warm}) ${asleep ? 'saturate(0.7)' : ''}`, transform: seat.flip ? 'scaleX(-1)' : undefined }}>
                <ShinobiSpriteCanvas character={m} size={128} stance={pose} showAura={false} />
              </div>
            </div>
          );
        })}

        {/* firelight and the dark around it */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-700"
          style={{ zIndex: 500, opacity: glow, mixBlendMode: 'screen', background: `radial-gradient(circle 230px at ${FIRE.x}px ${FIRE.y - 30}px, rgba(255,160,70,0.85), rgba(255,110,40,0.25) 55%, transparent 100%)` }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 501, background: `radial-gradient(ellipse 70% 85% at ${FIRE.x}px ${FIRE.y - 40}px, transparent 40%, rgba(2,4,14,${dawn ? 0.15 : asleep ? 0.65 : 0.45}) 100%)` }}
        />

        {alarm && (
          <div
            className="absolute inset-0 pointer-events-none animate-pulse"
            style={{ zIndex: 502, background: 'radial-gradient(ellipse 75% 90% at 50% 60%, transparent 45%, rgba(190,18,60,0.55) 100%)' }}
          />
        )}

        {/* names, incense and click areas, above the light */}
        {members.slice(0, SEATS.length).map((m, i) => {
          const seat = SEATS[i];
          return (
            <div key={m.id} className="absolute pointer-events-none" style={{ left: seat.x - 64, top: seat.y - 120, zIndex: 510, width: 128, height: 140 }}>
              {onSelect && (
                <button
                  type="button"
                  onClick={() => onSelect(m.id)}
                  className="absolute pointer-events-auto cursor-pointer rounded-md hover:bg-cyan-300/10"
                  style={{ left: 40, top: 22, width: 48, height: 100 }}
                  aria-label={T('select', { name: m.name })}
                />
              )}
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 whitespace-nowrap" style={{ top: 124 }}>
                <span className={`rounded px-1 text-[9px] font-bold leading-3 ${selected === m.id ? 'bg-cyan-400 text-slate-950' : 'bg-slate-950/80 text-slate-200'}`}>{m.name}</span>
                {sticksUsed && <IncenseSticks used={sticksUsed[m.id] ?? 0} compact />}
              </div>
            </div>
          );
        })}
      </div>

      {/* the moon shows the night danger */}
      <div className="absolute right-3 top-3 flex items-center gap-2.5" style={{ zIndex: 600 }}>
        <div className="text-right leading-tight">
          <div className="text-[9px] uppercase tracking-[0.18em] text-slate-400">{T('nightDanger')}</div>
          {dangerLabel && <div className="text-[10px] text-slate-300">{dangerLabel}</div>}
        </div>
        <div
          className={`grid place-items-center w-14 h-14 rounded-full ring-4 ${moonRing} text-slate-900 font-black text-base tabular-nums`}
          style={{ background: 'radial-gradient(circle at 35% 30%, #f8fafc, #cbd5e1 60%, #94a3b8)', boxShadow: '0 0 28px rgba(226,232,240,0.45)' }}
          title={T('moonTitle')}
        >
          {danger}%
        </div>
      </div>
    </div>
  );
}
