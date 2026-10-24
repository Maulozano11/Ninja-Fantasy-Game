// The Vanish Jump on screen (docs/GAMEPLAY_DESIGN.md, Stealth, "Hiding in a tree or a bush"): the
// leap into a tree or a bush (the body breaking into bands, pale after-images, speed lines), the
// puff where it sets off, the leaves where it goes in, and the streaks that flick on the tree or
// bush while someone hides in it.
//
// PLACEHOLDER ART, NOT APPROVED: the owner (2026-10-24) "no apruevo como se ven pasamelas para
// repintarlas". The sheets in src/assets/world/vfx_hide come from tools/world-sprites/vfx-hide.ts
// until his repaint replaces them, copied exactly.

import type { Pt, Unit } from '../../battle/types';
import type { MapDef } from '../../battle/map';
import { getMap } from '../../battle/map';
import { worldSprite } from '../world/WorldSpriteView';
import { FEET, unitFrame } from './unitArt';
import type { SpriteAppearance } from '../../sprite/types';

/** The leap's beats (ms at speed 1): the crouch before it, the flight. */
export const VANISH_WIND = 150;
export const VANISH_LEAP = 420;
export const VANISH_MS = VANISH_WIND + VANISH_LEAP;
/** Climbing or falling down out of a tree. */
export const DROP_MS = 260;

/** How high (px above its foot) a ninja sits in each tree or bush: the middle of its crown. */
const CROWN: Record<string, number> = { oak: 288, maple: 200, pine: 250, bamboo: 150, bush_round: 46, bush_wide: 42, bush_flower: 44 };
export const crownLift = (name: string): number => CROWN[name] ?? 60;
/** Which leaves come out of it (leaf_burst's rows). */
export const leafRow = (name: string): string => (name === 'oak' || name === 'maple' || name === 'pine' ? name : 'bush');

/** A one-shot effect of the jump, drawn over everything: the take-off puff, the burst of leaves. */
export interface HideFx {
  kind: 'takeoff' | 'leaves';
  at: Pt;
  /** Px above the ground point (the crown). */
  lift: number;
  row: string;
  t0: number;
}

const project = (map: MapDef, p: Pt, level = map.levelAt(p.x, p.z)) => ({ X: p.x * map.px.perM, Y: map.px.backY + p.z * map.px.perMDepth - level * map.px.level });

type Ctx = CanvasRenderingContext2D;

/** A frame of a world sprite with its anchor at (x, y). */
function blitWorld(ctx: Ctx, group: string, name: string, anim: string, frame: number, x: number, y: number, mirror = false, alpha = 1): boolean {
  const ws = worldSprite(group, name);
  if (!ws || !ws.img.complete || !ws.img.naturalWidth) return false;
  const a = ws.spec.anims[anim];
  if (!a) return false;
  const f = Math.max(0, Math.min(a.frames - 1, frame));
  const [ax, ay] = ws.spec.anchor;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (mirror) {
    ctx.translate(Math.round(x), 0);
    ctx.scale(-1, 1);
    ctx.drawImage(ws.img, f * ws.spec.frameW, a.row * ws.spec.frameH, ws.spec.frameW, ws.spec.frameH, -ax, Math.round(y - ay), ws.spec.frameW, ws.spec.frameH);
  } else ctx.drawImage(ws.img, f * ws.spec.frameW, a.row * ws.spec.frameH, ws.spec.frameW, ws.spec.frameH, Math.round(x - ax), Math.round(y - ay), ws.spec.frameW, ws.spec.frameH);
  ctx.restore();
  return true;
}

/** Where the streaks of the n-th ninja in a tree or bush go (map px). */
export function streakAt(mapId: string, prop: number, n: number): { X: number; Y: number } {
  const map = getMap(mapId);
  const p = map.props[prop];
  const at = project(map, p, p.level);
  return { X: at.X + 20 + (n ? 26 : 0) - (p.name === 'oak' ? 0 : 20), Y: at.Y - crownLift(p.name) + (n ? 10 : 0) };
}

/** The streaks on a tree or bush where someone hides (looping, each tree a little out of step). */
export function drawStreaks(ctx: Ctx, mapId: string, prop: number, n: number, now: number, alpha = 1): void {
  const map = getMap(mapId);
  const p = map.props[prop];
  const ws = worldSprite('vfx_hide', 'hidden_streaks');
  const kind = p.group === 'trees' && p.name !== 'bamboo' ? 'tree' : 'bush';
  const a = ws?.spec.anims[kind];
  if (!a) return;
  const frame = Math.floor((now / 1000) * a.fps + prop * 5 + n * 9) % a.frames;
  const at = streakAt(mapId, prop, n);
  blitWorld(ctx, 'vfx_hide', 'hidden_streaks', kind, frame, at.X, at.Y, false, alpha);
}

/** The take-off puffs and the bursts of leaves still playing; false once one is over. */
export function drawHideFx(ctx: Ctx, map: MapDef, f: HideFx, now: number, speed: number): boolean {
  const e = ((now - f.t0) * speed) / 1000;
  if (e < 0) return true;
  const name = f.kind === 'takeoff' ? 'vanish_burst' : 'leaf_burst';
  const anim = f.kind === 'takeoff' ? 'burst' : f.row;
  const ws = worldSprite('vfx_hide', name);
  const a = ws?.spec.anims[anim];
  if (!a) return false;
  const frame = Math.floor(e * a.fps);
  if (frame >= a.frames) return false;
  const at = project(map, f.at);
  blitWorld(ctx, 'vfx_hide', name, anim, frame, at.X, at.Y - f.lift);
  return true;
}

const silhouettes = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
/** A frame as one flat pale colour (the after-images). */
function silhouette(c: HTMLCanvasElement): HTMLCanvasElement {
  let s = silhouettes.get(c);
  if (!s) {
    s = document.createElement('canvas');
    s.width = c.width;
    s.height = c.height;
    const x = s.getContext('2d')!;
    x.drawImage(c, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#cfe3e6';
    x.fillRect(0, 0, s.width, s.height);
    silhouettes.set(c, s);
  }
  return s;
}

/** A frame drawn with its feet at (x0, y0 + FEET.y), cut in 2 px bands that lag `shift` px behind it. */
function blitBands(ctx: Ctx, fr: { canvas: HTMLCanvasElement; ox: number; oy: number }, x0: number, y0: number, facing: 1 | -1, shift: number): void {
  ctx.save();
  if (facing < 0) {
    ctx.translate(x0, 0);
    ctx.scale(-1, 1);
  } else ctx.translate(x0, 0);
  const c = fr.canvas;
  for (let y = 0; y < c.height; y += 2) {
    const dx = ((y >> 1) % 3) * shift;
    ctx.drawImage(c, 0, y, c.width, 2, -FEET.x + fr.ox - dx, y0 + fr.oy + y, c.width, 2);
  }
  ctx.restore();
}

function blitPlain(ctx: Ctx, c: HTMLCanvasElement, fr: { ox: number; oy: number }, x0: number, y0: number, facing: 1 | -1): void {
  ctx.save();
  if (facing < 0) {
    ctx.translate(x0, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(c, -FEET.x + fr.ox, y0 + fr.oy);
  } else ctx.drawImage(c, x0 - FEET.x + fr.ox, y0 + fr.oy);
  ctx.restore();
}

const ease = (x: number): number => 1 - (1 - Math.max(0, Math.min(1, x))) ** 1.7;

/** The leap's progress 0..1 (0 while it crouches), from the time since it began (ms at speed 1). */
export const leapK = (ms: number): number => (ms < VANISH_WIND ? 0 : ease((ms - VANISH_WIND) / VANISH_LEAP));

/** Where the leaping body's feet are on the map at progress k (an arc up into the crown). */
function leapPx(map: MapDef, from: Pt, to: Pt, lift: number, k: number): { X: number; Y: number } {
  const a = project(map, from);
  const b = project(map, to);
  const hop = 30 + lift * 0.25;
  return { X: a.X + (b.X - a.X) * k, Y: a.Y + (b.Y - lift - a.Y) * k - hop * Math.sin(Math.PI * k) };
}

/**
 * The leap (`ms` since it began, at speed 1): it crouches, breaks into lagging bands and flies off
 * with pale after-images and speed lines, fading as it goes into the leaves.
 */
export function drawLeap(ctx: Ctx, map: MapDef, u: Unit, look: SpriteAppearance, jump: { from: Pt; to: Pt; prop: number }, ms: number, facing: 1 | -1, alpha: number): void {
  const p = map.props[jump.prop];
  const lift = crownLift(p.name) - 52;
  if (ms < VANISH_WIND) {
    const at = project(map, jump.from);
    const fr = unitFrame(u, look, 'crouch', 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    blitPlain(ctx, fr.canvas, fr, Math.round(at.X), Math.round(at.Y - FEET.y), facing);
    ctx.restore();
    return;
  }
  const k = leapK(ms);
  const fr = unitFrame(u, look, 'run', 2);
  const sil = silhouette(fr.canvas);
  // After-images where it was a moment ago.
  for (const g of [3, 2, 1]) {
    const kg = leapK(ms - g * 45);
    if (ms - g * 45 < VANISH_WIND) continue;
    const q = leapPx(map, jump.from, jump.to, lift, kg);
    ctx.save();
    ctx.globalAlpha = alpha * 0.16 * (4 - g) * (k < 0.9 ? 1 : 0.5);
    blitPlain(ctx, sil, fr, Math.round(q.X), Math.round(q.Y - FEET.y), facing);
    ctx.restore();
  }
  const at = leapPx(map, jump.from, jump.to, lift, k);
  const fade = k < 0.6 ? 1 : Math.max(0, 1 - (k - 0.6) / 0.38);
  if (fade > 0) {
    ctx.save();
    ctx.globalAlpha = alpha * fade;
    blitBands(ctx, fr, Math.round(at.X), Math.round(at.Y - FEET.y), facing, 2 + Math.round(k * 8));
    ctx.restore();
  }
  // Speed lines, trailing the body's middle the way it flies.
  const prev = leapPx(map, jump.from, jump.to, lift, leapK(ms - 40));
  let dx = at.X - prev.X;
  const dy = at.Y - prev.Y;
  if (Math.hypot(dx, dy) < 0.5) return;
  const mirror = dx < 0;
  if (mirror) dx = -dx;
  const row = Math.max(-90, Math.min(90, Math.round((Math.atan2(dy, dx) * 180) / Math.PI / 15) * 15));
  blitWorld(ctx, 'vfx_hide', 'dash_lines', `a${row}`, Math.floor(ms / 50) % 4, at.X, at.Y - 52, mirror, alpha * (k < 0.95 ? 1 : 0.6));
}

/** The leaping body is behind the crown (or the bush) from this far on: it goes into the leaves. */
export const LEAP_BEHIND = { tree: 0.55, bush: 0.75 } as const;
