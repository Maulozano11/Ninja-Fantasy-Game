import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ShinobiCharacter } from '../../types/shinobi';
import type { FireLevel } from '../../rules/rest';
import { STICKS_PER_CAMP } from '../../data/campActivities';
import { isUnconscious } from '../../rules/ninja';
import { subscribeTick, TICK_FPS } from '../../sprite/ticker';
import { GRID } from '../../sprite/raster';
import { seatFor, type SeatId } from '../../sprite/seats';
import type { SpritePose } from '../../sprite/types';
import { useLang } from '../../i18n';
import { Gauge } from '../ui/Ornate';
import { T } from './campText';
import {
  airGlow,
  backdrop,
  FEET,
  FIRE,
  FireLight,
  footShadow,
  gradedMember,
  gradedSeat,
  gradedSprite,
  GradedSprite,
  knownPose,
  layer,
  LEAN_DX,
  lightKey,
  loadLayers,
  poseFrames,
  PROPS,
  SCENE_H,
  SCENE_W,
  ScenePropDef,
  SEAT_DX,
  SPOTS,
} from './campArt';

// The camp at night: the painted scene (tools/scenes/camp_night.py) at the world scale
// (1 m = 57 px), the campsite props and the party graded to the moon and the fire (campArt.ts),
// drawn into one pixel canvas and scaled to the panel's width.
const W = SCENE_W;
const H = SCENE_H;
/** On wide screens at most this much of the sky (world px) is cropped, so the moon stays. */
const MAX_SKY_CROP = 50;
const MAX_HEIGHT = 440;
const MIN_SCALE = 0.75;

/**
 * Poses the camp shows when nobody asked for one, seat by seat (Sentado, Leyendo, Recargado,
 * Entrenando). Each is used as soon as the sprite system knows it; until then the seat stands idle.
 */
export const CAMP_IDLE_POSES = ['sit', 'read', 'lean', 'train'] as const;
export type CampSeatPose = (typeof CAMP_IDLE_POSES)[number];
export type CampScenePose = 'idle' | 'handsigns' | 'cast' | 'charge' | 'victory' | CampSeatPose;

const poseOrIdle = (p: string): SpritePose => (knownPose(p) ? p : 'idle');
const isSeatPose = (p: string | undefined): p is CampSeatPose => !!p && (CAMP_IDLE_POSES as readonly string[]).includes(p);
/** The camp pose a seat shows when nobody asked for another (scene.json, else the list above). */
const seatPose = (i: number): CampSeatPose => {
  const p = SPOTS[i]?.pose;
  return isSeatPose(p) ? p : CAMP_IDLE_POSES[i % CAMP_IDLE_POSES.length];
};

/**
 * The seat prop (sprite/seats.ts) a seat's pose sits on: the one the scene picks for the spot, else the
 * default (the owner's rock). Drawn at the member's origin, under it; it stays when another pose is asked
 * for, as the supports do.
 */
function seatOf(i: number): SeatId | null {
  const spot = SPOTS[i];
  return spot ? seatFor(seatPose(i), spot.seat) : null;
}

/**
 * The prop a seat's pose rests on, placed from the pose rig: a seat under the hips (sit, read) or a
 * rock behind the back (lean). It stays when another pose is asked for (a jutsu's hand signs).
 */
function supportOf(i: number): ScenePropDef | null {
  const spot = SPOTS[i];
  if (!spot?.support) return null;
  const pose = seatPose(i);
  // a pose that sits on a seat prop (seatOf) has it instead
  if (seatOf(i)) return null;
  const dx = pose === 'lean' ? LEAN_DX : pose === 'sit' || pose === 'read' ? SEAT_DX : null;
  if (dx === null) return null;
  const back = spot.flip ? 1 : -1;
  return { group: 'campsite', name: spot.support, x: Math.round(spot.x + back * dx), y: spot.y, flip: spot.flip, z: -0.25 };
}

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
  /** Pose per ninja (a ninja doing a jutsu activity casts); others take their seat's camp pose. */
  poses?: Record<string, CampScenePose>;
}

interface Item {
  z: number;
  key: string;
  draw: (g: CanvasRenderingContext2D, tick: number) => void;
  frameAt: (tick: number) => number;
}

/** Frame of a looping (or held) animation at this tick of the shared 12 fps clock. */
function frameOf(tick: number, fps: number, n: number, loop = true): number {
  if (fps <= 0 || n <= 1) return 0;
  const f = Math.floor((tick * fps) / TICK_FPS);
  return loop ? f % n : Math.min(f, n - 1);
}

export function CampScene({ members, fire, asleep, dawn, alarm, shrine, danger, dangerLabel, selected, onSelect, sticksUsed, poses }: CampSceneProps) {
  useLang();
  const ref = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scale, setScale] = useState(1);
  const [width, setWidth] = useState(W);
  const [ready, setReady] = useState(false);
  // On wide screens a little sky is cropped so the camp's controls stay in view (never the moon);
  // on narrow ones the sides are cropped around the fire so the party stays big enough to read.
  const height = Math.max((H - MAX_SKY_CROP) * scale, Math.min(H * scale, MAX_HEIGHT));
  // Narrow screens frame the fire and everyone seated round it (the trainer stands off to the side).
  const taken = SPOTS.slice(0, Math.min(members.length, SPOTS.length));
  const focusX = taken.length ? (Math.min(FIRE.x, ...taken.map((p) => p.x - 56)) + Math.max(FIRE.x, ...taken.map((p) => p.x + 56))) / 2 : FIRE.x;
  const left = Math.min(0, width / 2 - focusX * scale);
  const clampedLeft = Math.max(width - W * scale, left);
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
  useEffect(() => {
    let alive = true;
    loadLayers().then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const lit = fire === 'low' || fire === 'bonfire';
  const fireAnim = !lit ? 'out' : asleep ? 'smoldering' : 'burning';
  const light: FireLight = useMemo(
    () =>
      !lit
        ? { k: 0, reach: 1, pool: 0, air: 0 }
        : asleep
          ? { k: 0.42, reach: 0.65, pool: 0.4, air: 0.35 }
          : fire === 'bonfire'
            ? { k: 1, reach: 1, pool: 1, air: 1 }
            : { k: 0.78, reach: 0.85, pool: 0.72, air: 0.7 },
    [lit, asleep, fire],
  );
  const smoke = lit && !asleep ? (fire === 'bonfire' ? 1 : 0.7) : 0;

  const seats = members.slice(0, SPOTS.length);
  const seatPoses = seats.map((m, i) => {
    const down = m.currentHp <= 0 || isUnconscious(m);
    return down ? ('hurt' as SpritePose) : poseOrIdle(poses?.[m.id] ?? seatPose(i));
  });
  const poseKey = seatPoses.join(',');

  // Everything drawn between the backdrop and the front frame, sorted by where it stands.
  const items = useMemo<Item[]>(() => {
    if (!ready) return [];
    const out: Item[] = [];
    const prop = (p: ScenePropDef, anim: string | undefined, opts: { alpha?: number; emissive?: boolean } = {}) => {
      let g: GradedSprite | undefined;
      const get = () => (g ??= gradedSprite(p, anim, light, opts.emissive));
      out.push({
        z: p.y + (p.z ?? 0),
        key: `${p.name}@${p.x},${p.y}`,
        frameAt: (tick) => {
          const s = get();
          return s ? frameOf(tick, s.fps, s.frames.length, s.loop) : -1;
        },
        draw: (ctx, tick) => {
          const s = get();
          if (!s) return;
          ctx.globalAlpha = opts.alpha ?? 1;
          ctx.drawImage(s.frames[frameOf(tick, s.fps, s.frames.length, s.loop)], s.x0, s.y0);
          ctx.globalAlpha = 1;
        },
      });
    };
    for (const p of PROPS) {
      if (p.shrine && !shrine) continue;
      if (p.name === 'campfire_large') prop(p, fireAnim, { emissive: true });
      else if (p.name === 'smoke_tall') {
        if (smoke > 0) prop(p, undefined, { alpha: smoke });
      } else if (p.name === 'stone_lantern') prop(p, 'lit', { emissive: true });
      else prop(p, p.anim);
    }
    seats.forEach((_, i) => {
      const s = supportOf(i);
      if (s) prop(s, undefined);
      const seat = seatOf(i);
      const spot = SPOTS[i];
      if (seat)
        out.push({
          z: spot.y - 0.25,
          key: `${seat}@${spot.x},${spot.y}`,
          frameAt: () => 0,
          draw: (ctx) => {
            const c = gradedSeat(seat, spot.x, spot.y, spot.flip, light);
            if (c) ctx.drawImage(c.canvas, spot.x - (spot.flip ? GRID - 1 - FEET.x : FEET.x) + c.ox, spot.y - FEET.y + c.oy);
          },
        });
    });
    seats.forEach((m, i) => {
      const spot = SPOTS[i];
      const pose = seatPoses[i];
      const { n, fps } = poseFrames(m, pose);
      const isSel = selected === m.id;
      out.push({
        z: spot.y + 0.5,
        key: `${m.id}`,
        frameAt: (tick) => frameOf(tick, fps, n),
        draw: (ctx, tick) => {
          const sh = footShadow();
          ctx.drawImage(sh, spot.x - sh.width / 2, spot.y - sh.height / 2 - 1);
          if (isSel) {
            ctx.save();
            ctx.fillStyle = 'rgba(103,232,249,0.28)';
            ctx.strokeStyle = 'rgba(103,232,249,0.8)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(spot.x, spot.y - 1, 27, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
          const c = gradedMember(m, pose, frameOf(tick, fps, n), spot.x, spot.y, spot.flip, light);
          ctx.drawImage(c.canvas, spot.x - (spot.flip ? GRID - 1 - FEET.x : FEET.x) + c.ox, spot.y - FEET.y + c.oy);
        },
      });
    });
    return out.sort((a, b) => a.z - b.z);
    // seats/seatPoses change with members and poseKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, members, poseKey, selected, shrine, fireAnim, lightKey(light), smoke]);

  // Redraw only when some animation frame changes (the 12 fps clock), never re-grading.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !ready) return;
    ctx.imageSmoothingEnabled = false;
    const front = layer('front');
    const fireGlow = light.air > 0 ? airGlow(FIRE.x, FIRE.flameY, 0.9, [46, 22, 4], 'fire') : null;
    const lantern = shrine ? PROPS.find((p) => p.name === 'stone_lantern') : undefined;
    const lanternGlow = lantern ? airGlow(lantern.x, lantern.y - 52, 0.32, [40, 24, 8], 'lantern') : null;
    let last = '';
    return subscribeTick((tick) => {
      const bg = backdrop(light);
      const flick = Math.floor(tick / 2) % 4;
      const key = `${bg ? 1 : 0}|${flick}|` + items.map((it) => it.frameAt(tick)).join(',');
      if (key === last) return;
      last = key;
      ctx.clearRect(0, 0, W, H);
      if (bg) ctx.drawImage(bg, 0, 0);
      for (const it of items) it.draw(ctx, tick);
      if (front?.naturalWidth) ctx.drawImage(front, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      if (fireGlow) {
        ctx.globalAlpha = light.air * [1, 0.93, 0.97, 0.9][flick];
        ctx.drawImage(fireGlow, 0, 0);
      }
      if (lanternGlow) {
        ctx.globalAlpha = 0.85 + 0.05 * (flick % 2);
        ctx.drawImage(lanternGlow, 0, 0);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    });
  }, [ready, items, light, shrine]);

  const gaugeSize = width < 560 ? 56 : width < 900 ? 68 : 80;

  // The bronze frame around the scene is drawn by the screen that shows it (an OrnateFrame).
  return (
    <div ref={ref} className="relative w-full overflow-hidden rounded-[3px] bg-[#070b1a]" style={{ height }}>
      <div className="absolute origin-top-left" style={{ left: clampedLeft, top: height - H * scale, width: W, height: H, transform: `scale(${scale})` }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="absolute inset-0 transition-[filter] duration-1000"
          style={{
            width: W,
            height: H,
            imageRendering: 'pixelated',
            // Morning: the same night scene, lighter and cooler.
            filter: dawn ? 'brightness(1.7) saturate(0.78) contrast(0.9)' : undefined,
          }}
        />
        {dawn && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 2, mixBlendMode: 'screen', background: 'linear-gradient(rgba(150,172,206,0.34) 0%, rgba(176,186,204,0.2) 55%, rgba(206,186,160,0.14) 100%)' }}
          />
        )}
        {asleep && !dawn && <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2, background: 'rgba(2,4,14,0.22)' }} />}

        {alarm && (
          <div
            className="absolute inset-0 pointer-events-none animate-pulse"
            style={{ zIndex: 502, background: 'radial-gradient(ellipse 75% 90% at 50% 60%, transparent 45%, rgba(190,18,60,0.55) 100%)' }}
          />
        )}

        {/* names, incense and click areas, above the light */}
        {seats.map((m, i) => {
          const seat = SPOTS[i];
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
                <span
                  className={`rounded-[3px] border px-1 text-[9px] font-bold leading-3 ${
                    selected === m.id ? 'border-[#f0cd78] bg-[#1b2a52]/95 text-[#ffe9b0] shadow-[0_0_6px_rgba(240,205,120,0.6)]' : 'border-[#a17d46]/70 bg-[#0a1226]/85 text-slate-100'
                  }`}
                >
                  {m.name}
                </span>
                {sticksUsed && <IncenseSticks used={sticksUsed[m.id] ?? 0} compact />}
              </div>
            </div>
          );
        })}
      </div>

      {/* the night danger, on a bronze dial */}
      <Gauge
        className="absolute right-2 top-2 sm:right-4 sm:top-3"
        style={{ zIndex: 600 }}
        value={danger}
        label={T('nightDanger')}
        sub={dangerLabel}
        title={T('moonTitle')}
        size={gaugeSize}
        tone={danger >= 40 ? 'alarm' : 'calm'}
      />
    </div>
  );
}
