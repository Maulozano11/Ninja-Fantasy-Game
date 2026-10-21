// Jutsu effects drawn from the approved VFX sheets (groups vfx_<element>): projectiles, beasts,
// streams, breaths, blasts, hits, walls and auras, plus signature effects of single jutsu (the
// Great Fireball, the Great Fire Annihilation) with their enhanced versions. When an element's
// sheets aren't in the game yet, the renderer falls back to its drawn effects.
// An elemental jutsu's effects, its beast and its wall play in the caster's chakra colour (the
// owner, 2026-10-21): the effect's `tint` (a wall's, its owner's) picks a recoloured copy of the
// sheet (vfxTintCache.ts); Natural, or the sheet's own colour, plays his sheet itself.

import type { Wall } from '../../battle/types';
import { isTintElement } from '../../sprite/vfxTint';
import { worldSprite } from '../world/WorldSpriteView';
import type { VfxElement } from '../../battle/jutsu';
import type { Fx, Held, VolleyPath } from './playback';
import type { Scene } from './renderer';
import { auraDx, fxPos, project } from './renderer';
import { WAIT, hurryVfxSheets, tintedSheet } from './vfxTintCache';
import type { TintedSheet } from './vfxTintCache';
import { unitTint, wallElement } from './vfxTintPlan';
import { wanderHeading, wanderPoint } from './paths';
import type { XY } from './paths';
import { dist } from '../../battle/map';

/** A sheet, and its copy in a chakra colour when it plays in one. */
type Sheet = NonNullable<ReturnType<typeof worldSprite>> & { tinted?: TintedSheet };

const ready = (s: Sheet) => s.img.complete && s.img.naturalWidth > 0;

/** The sheet as it plays in `tint` (an elemental one's recoloured copy), or his. */
function inTint(s: Sheet, element: string, name: string, tint: string | undefined, beast = false): Sheet {
  if (!tint || !isTintElement(element)) return s;
  return tintedSheet(s, element, tint, beast, name)?.view ?? s;
}

/** The effects whose colour's frames were already moved to the front of the queue. */
const hurried = new WeakSet<Fx>();

function sheet(element: string, name: string, tint?: string): Sheet | undefined {
  const s = worldSprite(`vfx_${element}`, name);
  return s && ready(s) ? inTint(s, element, name, tint) : undefined;
}

/** A recoloured sheet had nothing ready for the frame just drawn (see blit). */
let waiting = false;

/** Draws one frame of a sheet's animation with its anchor at (x, y); mirrored to face left. */
function blit(ctx: CanvasRenderingContext2D, s: Sheet, anim: string, frame: number, x: number, y: number, mirror: boolean, alpha = 1): void {
  const a = s.spec.anims[anim] ?? Object.values(s.spec.anims)[0];
  if (!a) return;
  const f = Math.max(0, Math.min(a.frames - 1, frame));
  const [ax, ay] = s.spec.anchor;
  // In a chakra colour: the frame's recoloured copy, cut to its pixels (null: nothing in it).
  const tf = s.tinted?.frame(a.row, f);
  if (tf === null) return;
  // Nothing of it made yet: the effect's drawn stand-in plays in the colour instead.
  if (tf === WAIT) {
    waiting = true;
    return;
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  if (mirror) {
    ctx.translate(Math.round(x), 0);
    ctx.scale(-1, 1);
  }
  const X = mirror ? -ax : Math.round(x - ax);
  const Y = Math.round(y - ay);
  if (tf) ctx.drawImage(tf.img, X + tf.x, Y + tf.y);
  else ctx.drawImage(s.img, f * s.spec.frameW, a.row * s.spec.frameH, s.spec.frameW, s.spec.frameH, X, Y, s.spec.frameW, s.spec.frameH);
  ctx.restore();
}

/** Frame of an animation after `ms`: loops wrap, one-shots hold their last frame. */
function frameAt(s: Sheet, anim: string, ms: number): number {
  const a = s.spec.anims[anim] ?? Object.values(s.spec.anims)[0];
  if (!a || a.frames <= 1 || a.fps <= 0) return 0;
  const n = Math.floor((ms / 1000) * a.fps);
  return a.loop ? n % a.frames : Math.min(n, a.frames - 1);
}

const animMs = (s: Sheet, anim: string): number => {
  const a = s.spec.anims[anim];
  return a && a.fps > 0 ? (a.frames / a.fps) * 1000 : 0;
};

/**
 * A sheet of the rank D and C set (vfx_dc: the volleys cut apart, the lightning fan), in the
 * caster's chakra colour when it plays in one (they are his element sheets, cut and turned), or the
 * white cut (vfx_neutral), which has no element and no colour.
 */
function ownSheet(group: 'vfx_dc' | 'vfx_neutral', name: string, element?: string, tint?: string): Sheet | undefined {
  const s = worldSprite(group, name);
  if (!s || !ready(s)) return undefined;
  return group === 'vfx_dc' && element ? inTint(s, element, name, tint) : s;
}

/**
 * The row of a turned sheet (rows a-90 ... a90, `step` degrees apart, pointing right) that points
 * along the screen direction (dx, dy); leftward it is the mirrored row.
 */
function turnedRow(s: Sheet, dx: number, dy: number, step: number): { anim: string; mirror: boolean } {
  const mirror = dx < 0;
  const deg = (Math.atan2(dy, Math.abs(dx)) * 180) / Math.PI;
  const a = Math.max(-90, Math.min(90, Math.round(deg / step) * step));
  const anim = `a${a}`;
  return { anim: s.spec.anims[anim] ? anim : Object.keys(s.spec.anims)[0], mirror };
}

/** How long (ms at speed 1) a joined fan takes to roll out to the end of its cone. */
export const FAN_ROLL = 270;
/** How long a joined fan plays: it rolls out, crackles a moment, and fades as its sparks burst. */
export const FAN_MS = 900;

/**
 * Where one projectile of a volley is at time t (0..1), on its own path: the high arc climbs and
 * comes down on the target from above, the straight shot flies flat, the low curve dips toward the
 * ground and rises into the target from below. So the three reach it from three angles. The arc
 * stays low enough to keep in sight at the close zoom.
 */
export function volleyPoint(a: { X: number; Y: number }, b: { X: number; Y: number }, lift: [number, number], path: VolleyPath, t: number): { x: number; y: number } {
  const run = Math.abs(b.X - a.X);
  const bend = path === 'high' ? -Math.min(64, 28 + run * 0.2) : path === 'low' ? Math.min(lift[0] - 18, 22 + run * 0.08) : -6;
  return { x: a.X + (b.X - a.X) * t, y: a.Y - lift[0] + (b.Y - lift[1] - (a.Y - lift[0])) * t + Math.sin(t * Math.PI) * bend };
}

/** One projectile of a volley on its path, turned to point where it flies. False without its sheet. */
function drawVolleyPiece(ctx: CanvasRenderingContext2D, sc: Scene, f: Fx, ms: number, t: number): boolean {
  const s = ownSheet('vfx_dc', `${f.element}_multi_${f.piece}`, f.element, f.tint);
  if (!s || !f.path) return false;
  const a = project(sc.map, f.from);
  const b = project(sc.map, f.to);
  const lift = f.lift ?? [60, 60];
  const p = volleyPoint(a, b, lift, f.path, t);
  const p0 = volleyPoint(a, b, lift, f.path, Math.max(0, t - 0.03));
  const p1 = volleyPoint(a, b, lift, f.path, Math.min(1, t + 0.03));
  const r = turnedRow(s, p1.x - p0.x, p1.y - p0.y, 6);
  blit(ctx, s, r.anim, frameAt(s, r.anim, ms), p.x, p.y, r.mirror);
  return true;
}

/** Draws `draw` with everything past the line through `at` square to the direction (dx, dy), plus `margin` px, cut away. */
function clipBeyond(ctx: CanvasRenderingContext2D, at: { x: number; y: number }, dx: number, dy: number, margin: number, draw: () => void): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(Math.atan2(dy, dx));
  ctx.beginPath();
  ctx.rect(-1e4, -1e4, 1e4 + margin, 2e4);
  ctx.clip();
  ctx.rotate(-Math.atan2(dy, dx));
  ctx.translate(-at.x, -at.y);
  draw();
  ctx.restore();
}

/**
 * The Spark Fan: his forked lightning as one branching fan. A trunk leaves the hand toward the
 * middle of the cone; from its tip a branch runs to every one it reaches (or to the cone's far end),
 * link after link with each fork's root on the last one's reach, the last cut off at its end so no
 * lightning hangs past a target. The links are laid end to end (the forks barely overlap) and the
 * branches drawn a little see-through, so the targets stay in sight inside it. It rolls out over
 * FAN_ROLL ms, crackles, and fades while its sparks burst on the ones it reached.
 */
function drawJoinedFan(ctx: CanvasRenderingContext2D, sc: Scene, f: Fx, ms: number, t: number): boolean {
  const s = ownSheet('vfx_dc', 'lightning_fan', f.element, f.tint);
  if (!s || !f.area || f.area.kind !== 'cone') return false;
  const lift = f.lift ?? [64, 44];
  const a = project(sc.map, f.from);
  const hand = { x: a.X, y: a.Y - lift[0] };
  const rad = (f.area.dir * Math.PI) / 180;
  const ends: { x: number; y: number }[] = [];
  const add = (p: { X: number; Y: number }, l: number) => {
    const e = { x: p.X, y: p.Y - l };
    if (!ends.some((o) => Math.hypot(o.x - e.x, o.y - e.y) < 36)) ends.push(e);
  };
  for (const p of f.joined ?? []) add(project(sc.map, p), lift[1]);
  // With no one reached it still spreads to the cone's far end.
  if (!ends.length) add(project(sc.map, { x: f.from.x + Math.cos(rad) * f.area.length, z: f.from.z + Math.sin(rad) * f.area.length }), lift[1]);
  // One fork reaches about LINK px from its root (his breath, turned).
  const LINK = 84;
  const fade = ms < FAN_ROLL + 150 ? 1 : Math.max(0, 1 - (ms - FAN_ROLL - 150) / (f.dur - FAN_ROLL - 150));
  // The trunk: toward the middle of the ends, a fork long, or less when a target is close.
  const mid = ends.reduce((m, e) => ({ x: m.x + (e.x - hand.x) / ends.length, y: m.y + (e.y - hand.y) / ends.length }), { x: 0, y: 0 });
  const near = Math.min(...ends.map((e) => Math.hypot(e.x - hand.x, e.y - hand.y)));
  const mlen = Math.max(1, Math.hypot(mid.x, mid.y));
  const T = Math.min(LINK * 0.8, near * 0.45);
  const root = { x: hand.x + (mid.x / mlen) * T, y: hand.y + (mid.y / mlen) * T };
  const longest = Math.max(...ends.map((e) => T + Math.hypot(e.x - root.x, e.y - root.y)));
  const tr = turnedRow(s, mid.x, mid.y, 10);
  clipBeyond(ctx, root, mid.x, mid.y, 14, () => blit(ctx, s, tr.anim, frameAt(s, tr.anim, ms), hand.x, hand.y, tr.mirror, 0.95 * fade));
  ends.forEach((e, j) => {
    const dx = e.x - root.x;
    const dy = e.y - root.y;
    const L = Math.hypot(dx, dy);
    if (L < 1) return;
    const n = Math.max(1, Math.round(L / LINK));
    const r = turnedRow(s, dx, dy, 10);
    for (let i = 0; i < n; i++) {
      // Each link shows once the fan has rolled out to its root.
      const born = (FAN_ROLL * (T + (i * L) / n)) / longest;
      if (ms < born) break;
      const k = i / n;
      const x = root.x + dx * k;
      const y = root.y + dy * k;
      const link = () => blit(ctx, s, r.anim, frameAt(s, r.anim, ms + i * 83 + j * 41), x, y, r.mirror, 0.72 * fade);
      if (i === n - 1) clipBeyond(ctx, e, dx, dy, 10, link);
      else link();
    }
  });
  return true;
}

/**
 * The white cut (vfx_neutral/slash: his wind crescent with no element), the Bleeding Cut: one
 * crescent sweeps down across the target on the strike and fades.
 */
function drawNeutralSlash(ctx: CanvasRenderingContext2D, sc: Scene, f: Fx, ms: number, t: number): boolean {
  const s = ownSheet('vfx_neutral', 'slash');
  if (!s) return false;
  const p = project(sc.map, f.to);
  const left = f.to.x < f.from.x - 0.01;
  const k = -1 + 2 * Math.min(1, t * 1.6);
  const dir = left ? -1 : 1;
  // It sweeps across, then is gone quickly (a long see-through fade over the target smears it).
  const alpha = t < 0.6 ? 1 : t < 0.75 ? (0.75 - t) / 0.15 : 0;
  if (alpha <= 0) return true;
  blit(ctx, s, 'fly', frameAt(s, 'fly', ms), p.X + dir * 16 * k, p.Y - (f.lift?.[1] ?? 56) + 12 * k, left, alpha);
  return true;
}

/**
 * A lingering aura on a unit while its condition lasts (the Breeze Mantle's wind until its next
 * turn): the element's aura and aura_back, faint, looping on the body. Not on a hidden foe.
 */
export function drawLinger(ctx: CanvasRenderingContext2D, sc: Scene, id: string, l: { element: VfxElement; alpha: number; t0: number; tint?: string }, layer: 'back' | 'front'): void {
  const u = sc.state.units[id];
  const v = sc.pb.views.get(id);
  if (!u || !v || u.down || (v.hidden && u.team !== sc.team)) return;
  const s = sheet(l.element, layer === 'back' ? 'aura_back' : 'aura', l.tint);
  if (!s) return;
  const a = s.spec.anims.idle ?? Object.values(s.spec.anims)[0];
  const n = Math.floor(((sc.now - l.t0) * sc.pb.speed * a.fps) / 1000);
  const p = project(sc.map, sc.pb.posOf(id, sc.now));
  // A slow breath in the opacity, so it reads as wind still turning round the ninja.
  const pulse = 0.85 + 0.15 * Math.sin((sc.now - l.t0) / 380);
  blit(ctx, s, 'idle', ((n % a.frames) + a.frames) % a.frames, p.X + auraDx(sc, id), p.Y, false, l.alpha * pulse);
}

/** The flight point of a projectile at time t (0..1), like the drawn effects. */
function flight(sc: Scene, f: Fx, t: number): { x: number; y: number } {
  const a = project(sc.map, f.from);
  const b = project(sc.map, f.to);
  const [l0, l1] = f.lift ?? [60, 60];
  const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  return { x: a.X + (b.X - a.X) * e, y: a.Y - l0 + (b.Y - l1 - (a.Y - l0)) * e - Math.sin(t * Math.PI) * 30 };
}

/**
 * The back layer of an aura (aura_back), drawn just behind its caster so the element wraps round
 * the body; its front layer ('aura') is drawn over the caster with the other effects.
 */
export function drawAuraBack(ctx: CanvasRenderingContext2D, sc: Scene, f: Fx): void {
  if (f.kind !== 'aura' || f.sig === 'eyes') return;
  const s = sheet(f.element, 'aura_back', f.tint);
  if (!s) return;
  const ms = (sc.now - f.t0) * sc.pb.speed;
  const t = ms / f.dur;
  if (t < 0 || t > 1) return;
  const p = project(sc.map, fxPos(sc, f));
  blit(ctx, s, 'idle', frameAt(s, 'idle', ms), p.X + auraDx(sc, f.unit), p.Y, false, (f.alpha ?? 1) * (t > 0.7 ? (1 - t) / 0.3 : 1));
}

/**
 * Draws an effect from its sheets. Returns false when the sheets aren't available, or when its
 * recoloured frames are not made yet: the renderer's drawn stand-in plays (in the colour) instead.
 */
export function drawVfxSprite(ctx: CanvasRenderingContext2D, sc: Scene, f: Fx): boolean {
  waiting = false;
  return drawFromSheets(ctx, sc, f) && !waiting;
}

/**
 * The sheets an effect plays (vfx_<element>/<name>, or its element's beast), the main one first,
 * as drawFromSheets picks them: the ones to hurry when it is about to play in a colour.
 */
function sheetsOf(f: Fx): { name: string; beast: boolean; group?: string }[] {
  const el = f.element;
  const sig = f.sig && f.sig !== 'eyes' && f.sig !== 'tag' && f.sig !== 'log' ? sigSheetName(el, f.sig, !!f.enhanced) : undefined;
  const named = (...n: string[]) => n.map((name) => ({ name, beast: false }));
  if (sig) return named(sig, 'blast', 'bolt');
  if (f.kind === 'sprite' && f.run) return [{ group: f.run.group, name: f.run.name, beast: false }];
  if (f.kind === 'projectile' && f.trail) return [{ group: 'vfx_dragon', name: 'water_head', beast: false }, ...named('stream')];
  if (f.kind === 'projectile' && f.route && f.piece !== undefined) return [{ group: 'vfx_dc', name: `${el}_multi_${f.piece}`, beast: false }];
  if (f.kind === 'line' && f.beam?.noHead) return named('stream');
  switch (f.kind) {
    case 'projectile':
      // One projectile of a volley flies from its own turned sheet (vfx_dc).
      if (f.piece !== undefined) return [{ group: 'vfx_dc', name: `${el}_multi_${f.piece}`, beast: false }];
      return f.role === 'beast' ? [{ name: el, beast: true }, ...named('bolt')] : named(f.role ?? 'bolt', 'bolt');
    case 'area':
      return named('blast');
    case 'cone':
      return f.joined ? [{ group: 'vfx_dc', name: `${el}_fan`, beast: false }] : named('breath');
    case 'line':
      return named('stream', 'stream_head');
    case 'burst':
      return named(...(f.role === 'multi' ? ['multi_hit'] : []), 'hit');
    case 'aura':
      return named('aura', 'aura_back');
    default:
      return [];
  }
}


// --- the owner's first round of effect answers (2026-10-21): pieces P1, P2, P4 ------------------

/** The sheet a piece plays: its group's, in the effect's chakra colour when it is an elemental one's. */
function runSheet(f: Fx): Sheet | undefined {
  const r = f.run!;
  const s = worldSprite(r.group, r.name);
  if (!s || !ready(s)) return undefined;
  return inTint(s, f.element, r.name, f.tint);
}

/** Where a piece is (screen px) `ms` into it: between its path's keyframes, straight. */
function runPoint(sc: Scene, f: Fx, ms: number): { x: number; y: number } {
  const r = f.run!;
  const k = r.path?.length ? r.path : [{ ms: 0, dy: 0 }];
  const sx = r.mirror ? -1 : 1;
  const at = (p: (typeof k)[number]) => {
    const g = project(sc.map, p.at ?? f.from);
    return { x: g.X + sx * (p.dx ?? 0), y: g.Y + p.dy };
  };
  if (ms <= k[0].ms) return at(k[0]);
  for (let i = 1; i < k.length; i++) {
    if (ms <= k[i].ms) {
      const a = at(k[i - 1]);
      const b = at(k[i]);
      const t = (ms - k[i - 1].ms) / Math.max(1, k[i].ms - k[i - 1].ms);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  return at(k[k.length - 1]);
}

/**
 * A piece of a sheet (P1): its rows in turn at its point. A row's own frames play at its pace (the
 * last one held), backwards when asked, or just the frames listed, spread over the row's time.
 */
function drawRun(ctx: CanvasRenderingContext2D, sc: Scene, f: Fx, ms: number): boolean {
  const r = f.run!;
  const s = runSheet(f);
  if (!s) return false;
  let acc = 0;
  let anim = r.rows[0].anim;
  let frame = 0;
  for (let i = 0; i < r.rows.length; i++) {
    const row = r.rows[i];
    if (ms < acc + row.ms || i === r.rows.length - 1) {
      const local = Math.max(0, ms - acc);
      anim = row.anim;
      const a = s.spec.anims[anim];
      if (row.frames?.length) frame = row.frames[Math.min(row.frames.length - 1, Math.floor((local / Math.max(1, row.ms)) * row.frames.length))];
      else {
        frame = frameAt(s, anim, local);
        if (row.back && a) frame = a.frames - 1 - frame;
      }
      break;
    }
    acc += row.ms;
  }
  const p = runPoint(sc, f, ms);
  const alpha = r.fade && ms > f.dur - r.fade ? Math.max(0, (f.dur - ms) / r.fade) : 1;
  if (r.clip === undefined) {
    blit(ctx, s, anim, frame, p.x, p.y, !!r.mirror, alpha);
    return true;
  }
  // Out of a wall: nothing below the line `clip` px over its ground point.
  const g = project(sc.map, r.path?.[0]?.at ?? f.from);
  ctx.save();
  ctx.beginPath();
  ctx.rect(p.x - 4000, g.Y - r.clip - 8000, 8000, 8000);
  ctx.clip();
  blit(ctx, s, anim, frame, p.x, p.y, !!r.mirror, alpha);
  ctx.restore();
  return true;
}

/**
 * A stream from (x0, y0) running (dx, dy) on the screen (facing left when `left`), as the line
 * jutsu lays it: tiles stepped back from the head, sheared onto a shallow slope or turned onto a
 * steep one; without a head when `head` is null (the tiles are cut off at the end instead).
 */
function layStream(ctx: CanvasRenderingContext2D, tile: Sheet, head: Sheet | null, x0: number, y0: number, dx: number, dy: number, left: boolean, frame: number, alpha: number): void {
  const run = left ? -dx : dx;
  const shear = run > 0 && Math.abs(dy) <= run;
  const L = shear ? run : Math.hypot(dx, dy);
  const w = tile.spec.frameW;
  ctx.save();
  ctx.translate(x0, y0);
  if (left) ctx.scale(-1, 1);
  if (shear) ctx.transform(1, dy / run, 0, 1, 0, 0);
  else ctx.rotate(Math.atan2(dy, run));
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, -1e4, head ? 1e5 : L, 2e4);
  ctx.clip();
  for (let k = Math.max(1, Math.ceil(L / w)); k >= (head ? 1 : 0); k--) blit(ctx, tile, 'fly', frame, L - w * k, 0, false, alpha);
  ctx.restore();
  if (head) blit(ctx, head, 'fly', frame, L, 0, false, alpha);
  ctx.restore();
}

/**
 * A beam (P4) from its start to its end, each at its own height: it reaches the end in `grow` ms,
 * stays, and fades over its last `fade` ms (the Dragon Fire's stream from the mouth to the end of
 * its line, the Sealing Chains held taut).
 */
function drawBeam(ctx: CanvasRenderingContext2D, sc: Scene, f: Fx, ms: number): boolean {
  const b = f.beam!;
  const tile = sheet(f.element, 'stream', f.tint);
  const head = b.noHead ? null : sheet(f.element, 'stream_head', f.tint);
  if (!tile || (!b.noHead && !head)) return false;
  const a = project(sc.map, f.from);
  const e = project(sc.map, f.to);
  const [l0, l1] = f.lift ?? [60, 50];
  const reach = Math.min(1, ms / Math.max(1, b.grow));
  const alpha = ms > f.dur - b.fade ? Math.max(0, (f.dur - ms) / b.fade) : 1;
  const x0 = a.X;
  const y0 = a.Y - l0;
  layStream(ctx, tile, head ?? null, x0, y0, (e.X - x0) * reach, (e.Y - l1 - y0) * reach, f.to.x < f.from.x - 0.01, frameAt(tile, 'fly', ms), alpha);
  return true;
}

/** A route's points on the screen (px), and the length of its legs on the ground (m), for wanderPoint. */
function routeOf(sc: Scene, f: Fx): { pts: XY[]; pace: number[] } {
  const r = f.route!;
  const pts = r.map((p) => {
    const g = project(sc.map, p.at);
    return { x: g.X, y: g.Y - p.lift };
  });
  const pace = r.slice(1).map((p, i) => Math.max(0.05, dist(r[i].at, p.at)));
  return { pts, pace };
}

/** One of his frames as a picture to cut columns from: where its pixels are, and where they sit in the frame. */
function frameSource(s: Sheet, anim: string, frame: number): { img: CanvasImageSource; sx: number; sy: number; w: number; h: number; ox: number; oy: number } | null {
  const a = s.spec.anims[anim] ?? Object.values(s.spec.anims)[0];
  if (!a) return null;
  const f = Math.max(0, Math.min(a.frames - 1, frame));
  const tf = s.tinted?.frame(a.row, f);
  if (tf === null) return null;
  if (tf === WAIT) {
    waiting = true;
    return null;
  }
  if (tf) return { img: tf.img, sx: 0, sy: 0, w: tf.img.width, h: tf.img.height, ox: tf.x, oy: tf.y };
  return { img: s.img, sx: f * s.spec.frameW, sy: a.row * s.spec.frameH, w: s.spec.frameW, h: s.spec.frameH, ox: 0, oy: 0 };
}

/** How wide (px) each slice of a body laid along a curve is. */
const SLICE = 4;

/**
 * The water dragon's body: his water stream without its head, laid along the path the head has
 * flown (from the hand to `t`), slice by slice turned along it, so it follows every bend.
 */
function drawTrail(ctx: CanvasRenderingContext2D, pts: XY[], bends: Fx['bends'], pace: number[], t: number, tile: Sheet, frame: number, alpha: number): void {
  const src = frameSource(tile, 'fly', frame);
  if (!src || t <= 0) return;
  // The path sampled finely, then walked a slice at a time.
  const N = Math.max(8, Math.ceil(t * 160));
  const line: XY[] = [];
  for (let i = 0; i <= N; i++) line.push(wanderPoint(pts, bends ?? [], (t * i) / N, pace));
  const w = tile.spec.frameW;
  const ay = tile.spec.anchor[1];
  ctx.save();
  ctx.globalAlpha = alpha;
  let s = 0;
  let seg = 0;
  let into = 0;
  for (;;) {
    while (seg < line.length - 1) {
      const l = Math.hypot(line[seg + 1].x - line[seg].x, line[seg + 1].y - line[seg].y);
      if (into < l) break;
      into -= l;
      seg++;
    }
    if (seg >= line.length - 1) break;
    const p = line[seg];
    const q = line[seg + 1];
    const l = Math.max(1e-6, Math.hypot(q.x - p.x, q.y - p.y));
    const x = p.x + ((q.x - p.x) * into) / l;
    const y = p.y + ((q.y - p.y) * into) / l;
    const col = s % w;
    const cx = col - src.ox;
    if (cx >= 0 && cx < src.w) {
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      if (q.x < p.x) {
        ctx.scale(-1, 1);
        ctx.rotate(Math.atan2(q.y - p.y, p.x - q.x));
      } else ctx.rotate(Math.atan2(q.y - p.y, q.x - p.x));
      // One column over, so the slices meet without a seam.
      const cw = Math.min(SLICE + 1, src.w - cx);
      ctx.drawImage(src.img, src.sx + cx, src.sy, cw, src.h, 0, src.oy - ay, cw, src.h);
      ctx.restore();
    }
    s += SLICE;
    into += SLICE;
  }
  ctx.restore();
}

/**
 * A projectile on a varied path (paths.ts): one of a volley's pieces (vfx_dc, turned along it), or
 * the water dragon's head (vfx_dragon/water_head, turned along it) with its body behind it.
 */
function drawRoute(ctx: CanvasRenderingContext2D, sc: Scene, f: Fx, ms: number): boolean {
  const { pts, pace } = routeOf(sc, f);
  const bends = f.bends ?? [];
  if (f.trail) {
    const head = worldSprite('vfx_dragon', 'water_head');
    const tile = sheet(f.element, 'stream', f.tint);
    if (!head || !ready(head) || !tile) return false;
    const h = inTint(head, f.element, 'water_head', f.tint);
    const arrive = f.trail.arrive;
    const t = Math.min(1, ms / arrive);
    const alpha = ms > arrive ? Math.max(0, 1 - (ms - arrive) / Math.max(1, f.dur - arrive)) : 1;
    drawTrail(ctx, pts, bends, pace, t, tile, frameAt(tile, 'fly', ms), alpha);
    if (ms < arrive) {
      const p = wanderPoint(pts, bends, t, pace);
      const d = wanderHeading(pts, bends, t, pace);
      const r = turnedRow(h, d.x, d.y, 10);
      blit(ctx, h, r.anim, 0, p.x, p.y, r.mirror);
    }
    return true;
  }
  const s = f.piece !== undefined ? ownSheet('vfx_dc', `${f.element}_multi_${f.piece}`, f.element, f.tint) : undefined;
  if (!s) return false;
  const t = Math.min(1, ms / f.dur);
  const p = wanderPoint(pts, bends, t, pace);
  const d = wanderHeading(pts, bends, t, pace);
  const r = turnedRow(s, d.x, d.y, 6);
  blit(ctx, s, r.anim, frameAt(s, r.anim, ms), p.x, p.y, r.mirror);
  return true;
}

/**
 * What a ninja holds in its near hand (the Chidori's lightning, the owner's answer 11), its anchor at
 * the hand (x, y): its rows one after another, the last looping, in the caster's chakra colour.
 */
export function drawHeld(ctx: CanvasRenderingContext2D, sc: Scene, h: Held, x: number, y: number): void {
  const s = worldSprite(h.group, h.name);
  if (!s || !ready(s)) return;
  const sh = inTint(s, h.element, h.name, h.tint);
  const ms = (sc.now - h.t0) * sc.pb.speed;
  let acc = 0;
  for (let i = 0; i < h.rows.length; i++) {
    const row = h.rows[i];
    if (ms < acc + row.ms || i === h.rows.length - 1) {
      blit(ctx, sh, row.anim, frameAt(sh, row.anim, Math.max(0, ms - acc)), Math.round(x), Math.round(y), false);
      return;
    }
    acc += row.ms;
  }
}

function drawFromSheets(ctx: CanvasRenderingContext2D, sc: Scene, f: Fx): boolean {
  const el = f.element;
  const ms = (sc.now - f.t0) * sc.pb.speed;
  const t = ms / f.dur;
  if (t < 0) {
    // About to play (the cast's beat): the frames of the sheets it plays in its colour are made
    // first, in their order (once per effect).
    if (f.tint && isTintElement(el) && !hurried.has(f)) {
      hurried.add(f);
      const list = [];
      for (const { name, beast, group } of sheetsOf(f)) {
        const src = worldSprite(group ?? (beast ? 'vfx_beasts' : `vfx_${el}`), name);
        if (src) list.push({ src, element: el, color: f.tint, beast, name });
      }
      hurryVfxSheets(list);
    }
    return true;
  }
  if (t > 1) return true;
  const left = f.to.x < f.from.x - 0.01;
  const sig = f.sig && f.sig !== 'eyes' && f.sig !== 'tag' && f.sig !== 'log' ? sigSheetName(el, f.sig, !!f.enhanced) : undefined;
  if (f.kind === 'sprite' && f.run) return drawRun(ctx, sc, f, ms);
  if (f.kind === 'line' && f.beam) return drawBeam(ctx, sc, f, ms);
  if (f.kind === 'projectile' && f.route) return drawRoute(ctx, sc, f, ms);
  switch (f.kind) {
    case 'projectile': {
      // One projectile of a volley, on its own path (Three Embers, Jolt, Pebble Shot).
      if (f.piece !== undefined && drawVolleyPiece(ctx, sc, f, ms, t)) return true;
      // Summoned beasts come from their own sheet (vfx_beasts/<element>) when it's in the game.
      // A role whose sheet doesn't fly (a blast, a hit) travels as the element's bolt.
      // The one it plays takes the caster's colour (the others aren't recoloured for nothing).
      const beast = f.role === 'beast' && !sig ? worldSprite('vfx_beasts', el) : undefined;
      const name = sig ?? f.role ?? 'bolt';
      const own = sheet(el, name);
      const s = beast && ready(beast) ? inTint(beast, el, el, f.tint, true) : own?.spec.anims.fly ? inTint(own, el, name, f.tint) : sheet(el, 'bolt', f.tint);
      if (!s) return false;
      const p = flight(sc, f, t);
      blit(ctx, s, 'fly', frameAt(s, 'fly', ms), p.x, p.y, left);
      return true;
    }
    case 'area': {
      // A signature without its own sheet in the game yet plays the element's blast.
      const sigSheet = sig ? sheet(el, sig, f.tint) : undefined;
      const s = sigSheet ?? sheet(el, 'blast', f.tint);
      if (!s) return false;
      const c = f.area?.kind === 'circle' ? f.area.center : f.from;
      const p = project(sc.map, c);
      // A signature from the sky (Kirin) plays its phases one after another on the target.
      const phases = phasesOf(s);
      if (phases.length) {
        let at = ms;
        for (const ph of phases) {
          const d = animMs(s, ph);
          if (at < d || ph === phases[phases.length - 1]) {
            blit(ctx, s, ph, frameAt(s, ph, at), p.X, p.Y, false);
            break;
          }
          at -= d;
        }
        return true;
      }
      const anim = sigSheet ? 'burst' : Object.keys(s.spec.anims)[0];
      blit(ctx, s, anim, frameAt(s, anim, ms), p.X, p.Y, false, t > 0.85 ? (1 - t) / 0.15 : 1);
      return true;
    }
    case 'cone': {
      const o = project(sc.map, f.from);
      if (f.joined && drawJoinedFan(ctx, sc, f, ms, t)) return true;
      const dir = f.area && f.area.kind === 'cone' ? f.area.dir : 0;
      const mirror = Math.cos((dir * Math.PI) / 180) < 0;
      if (sig) {
        const s = sheet(el, sig, f.tint);
        if (!s) return false;
        // The wave rolls out (its surge may be split over several rows), burns, then dies back.
        const surge = surgeMs(s);
        const fade = animMs(s, 'fade');
        if (ms < surge) {
          let at = ms;
          for (const row of surgeRows(s)) {
            const d = animMs(s, row);
            if (at < d) {
              blit(ctx, s, row, frameAt(s, row, at), o.X, o.Y, mirror);
              break;
            }
            at -= d;
          }
        } else if (ms < f.dur - fade) blit(ctx, s, 'burn', frameAt(s, 'burn', ms - surge), o.X, o.Y, mirror);
        else blit(ctx, s, 'fade', frameAt(s, 'fade', ms - (f.dur - fade)), o.X, o.Y, mirror);
        return true;
      }
      const s = sheet(el, 'breath', f.tint);
      if (!s || !f.area || f.area.kind !== 'cone') return false;
      // Breaths rolled out along the cone, one after another.
      const len = f.area.length;
      const rad = (f.area.dir * Math.PI) / 180;
      const steps = Math.max(2, Math.round(len / 1.6));
      for (let i = 0; i < steps; i++) {
        const k = (i + 0.5) / steps;
        if (t < k * 0.6) break;
        const p = project(sc.map, { x: f.from.x + Math.cos(rad) * len * k, z: f.from.z + Math.sin(rad) * len * k });
        blit(ctx, s, 'fly', frameAt(s, 'fly', ms + i * 70), p.X - (mirror ? -1 : 1) * s.spec.frameW * 0.3, p.Y - 30, mirror, t > 0.8 ? (1 - t) / 0.2 : 1);
      }
      return true;
    }
    case 'line': {
      const tile = sheet(el, 'stream', f.tint);
      const head = sheet(el, 'stream_head', f.tint);
      if (!tile || !head) return false;
      const a = project(sc.map, f.from);
      const b = project(sc.map, f.to);
      const reach = Math.min(1, t * 1.8);
      const dx = (b.X - a.X) * reach;
      const dy = (b.Y - a.Y) * reach;
      const lift = f.lift?.[1] ?? 50;
      const alpha = t > 0.8 ? (1 - t) / 0.2 : 1;
      // The beam is laid out flat, facing right, from the caster (0, 0) to the head (L, 0), then
      // sheared onto a shallow slope (pixel columns stay upright) or turned onto a steep one.
      // The tiles step back from the head a whole tile at a time, all on the head's frame: the
      // tile wraps onto itself and the head's left end is a copy of the tile's right half, so
      // the beam reads as one unbroken row. The first tile is cut off at the caster.
      const run = left ? -dx : dx;
      const shear = run > 0 && Math.abs(dy) <= run;
      const L = shear ? run : Math.hypot(dx, dy);
      const w = tile.spec.frameW;
      const frame = frameAt(tile, 'fly', ms);
      ctx.save();
      ctx.translate(a.X, a.Y - lift);
      if (left) ctx.scale(-1, 1);
      if (shear) ctx.transform(1, dy / run, 0, 1, 0, 0);
      else ctx.rotate(Math.atan2(dy, run));
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, -1e4, 1e5, 2e4);
      ctx.clip();
      for (let k = Math.max(1, Math.ceil(L / w)); k >= 1; k--) blit(ctx, tile, 'fly', frame, L - w * k, 0, false, alpha);
      ctx.restore();
      blit(ctx, head, 'fly', frame, L, 0, false, alpha);
      ctx.restore();
      return true;
    }
    case 'burst': {
      // Rock bullets and the like can have their own impact, which sprays away from the caster.
      const own = f.role === 'multi' ? sheet(el, 'multi_hit', f.tint) : undefined;
      const s = own ?? sheet(el, 'hit', f.tint);
      if (!s) return false;
      const p = project(sc.map, f.to);
      const anim = Object.keys(s.spec.anims)[0];
      blit(ctx, s, anim, frameAt(s, anim, ms), p.X, p.Y - (f.lift?.[1] ?? 50), !!own && left);
      return true;
    }
    case 'aura': {
      if (f.sig === 'eyes') return false;
      const s = sheet(el, 'aura', f.tint);
      if (!s) return false;
      const p = project(sc.map, fxPos(sc, f));
      blit(ctx, s, 'idle', frameAt(s, 'idle', ms), p.X + auraDx(sc, f.unit), p.Y, false, (f.alpha ?? 1) * (t > 0.7 ? (1 - t) / 0.3 : 1));
      return true;
    }
    case 'slash':
      // The white cut of a sword art with no element; other cuts are drawn.
      return f.set === 'neutral' && drawNeutralSlash(ctx, sc, f, ms, t);
    case 'wall':
      // With the element's wall sheet in the game, the standing wall plays its own rise (a broken
      // structure's debris has no sheet yet: it falls back to the drawn dust).
      return f.sig !== 'debris' && !!sheet(el, 'wall');
    default:
      return false;
  }
}

/**
 * A standing jutsu wall from its element's sheets, turned to match the ground: `wall` runs across
 * the screen, `wall_diag` at 45° (mirrored for the other diagonal) and `wall_depth` straight into
 * the depth. It rises when raised, then idles, in the chakra colour of whoever raised it. Returns
 * false when the sheets aren't in the game.
 */
export function drawWallSprite(ctx: CanvasRenderingContext2D, sc: Scene, w: Wall): boolean {
  const el = w.kind;
  const angle = (Math.atan2(Math.abs(w.b.z - w.a.z), Math.abs(w.b.x - w.a.x)) * 180) / Math.PI;
  const name = angle < 22.5 ? 'wall' : angle > 67.5 ? 'wall_depth' : 'wall_diag';
  // Without the turned sheet, the drawn wall (which follows any angle) stands in.
  const s = sheet(el, name, wallTint(sc, w));
  if (!s) return false;
  // The diagonal sheet runs from a near-left end to a far-right end ("/"); mirror it for "\".
  const [left, right] = w.a.x <= w.b.x ? [w.a, w.b] : [w.b, w.a];
  const mirror = name === 'wall_diag' && left.z < right.z;
  const p = project(sc.map, { x: (w.a.x + w.b.x) / 2, z: (w.a.z + w.b.z) / 2 });
  const born = sc.pb.wallBorn.get(w.id);
  const ms = born === undefined ? Infinity : (sc.now - born) * sc.pb.speed;
  const rise = s.spec.anims.rise ? animMs(s, 'rise') : 0;
  waiting = false;
  if (ms < rise) blit(ctx, s, 'rise', frameAt(s, 'rise', ms), p.X, p.Y, mirror);
  else blit(ctx, s, 'idle', frameAt(s, 'idle', Number.isFinite(ms) ? ms - rise : sc.now), p.X, p.Y, mirror);
  // Its colour not made yet: the drawn wall stands in, in the colour.
  return !waiting;
}

/** The chakra colour an earth or water wall stands in: its raiser's (undefined: his colours). */
export const wallTint = (sc: Scene, w: Wall): string | undefined => (wallElement(w.kind) && w.owner ? unitTint(sc.state.units[w.owner]) : undefined);

/** The phases a sky signature plays in order; empty for other sheets. */
// 'sustain' holds the strike on the target a while (about a second) before it fades, for drama.
const PHASES = ['gather', 'strike', 'impact', 'sustain', 'fade'];
const phasesOf = (s: Sheet): string[] => (s.spec.anims.strike ? PHASES.filter((p) => s.spec.anims[p]) : []);

/** Which sheet a signature uses: its enhanced version when enhanced and drawn, else the base one. */
function sigSheetName(element: string, sig: string, enhanced: boolean): string {
  if (!enhanced) return sig;
  const big = sig === 'fireball' ? 'fireball_great' : `${sig}_enh`;
  return sheet(element, big) ? big : sig;
}

/**
 * A signature that falls from the sky onto its target (Kirin): how long it plays and when it hits
 * (the end of its strike), or null when it isn't one or its sheet isn't in the game.
 */
export function skySignature(element: string, sig: string | undefined, enhanced: boolean): { total: number; hit: number } | null {
  if (!sig) return null;
  const s = sheet(element, sigSheetName(element, sig, enhanced));
  if (!s) return null;
  const phases = phasesOf(s);
  if (!phases.length) return null;
  const total = phases.reduce((t, p) => t + animMs(s, p), 0);
  const hit = phases.slice(0, phases.indexOf('strike') + 1).reduce((t, p) => t + animMs(s, p), 0);
  return { total, hit };
}

/**
 * How long a jutsu's impact plays on its target: the multi's own impact sheet, else the element's
 * hit, at least `min` ms so it never flashes past. The stand-in effect gets `min`.
 */
export function impactMs(element: string, role: string | undefined, min: number): number {
  const s = (role === 'multi' ? sheet(element, 'multi_hit') : undefined) ?? sheet(element, 'hit');
  return Math.max(min, s ? animMs(s, Object.keys(s.spec.anims)[0]) : 0);
}

/** How long an element's blast plays on its circle, at least `min` ms. */
export function blastMs(element: string, min: number): number {
  const s = sheet(element, 'blast');
  return Math.max(min, s ? animMs(s, Object.keys(s.spec.anims)[0]) : 0);
}

/** A long surge is split over rows (surge, surge2, surge3...) that play once, in order. */
const surgeRows = (s: Sheet): string[] => ['surge', 'surge2', 'surge3', 'surge4'].filter((r) => s.spec.anims[r]);
const surgeMs = (s: Sheet): number => surgeRows(s).reduce((t, r) => t + animMs(s, r), 0);

/**
 * A signature cone (the Great Fire Annihilation): how long it plays (its surge, a few burns and its
 * fade) and when it hits (the fire has spread all the way: the end of its surge), or null.
 */
export function signatureMs(element: string, sig: string | undefined, enhanced: boolean): { total: number; hit: number } | null {
  if (sig !== 'annihilation') return null;
  const s = sheet(element, enhanced ? 'annihilation_enh' : 'annihilation');
  if (!s) return null;
  const hit = surgeMs(s);
  return { total: hit + animMs(s, 'burn') * 2 + animMs(s, 'fade'), hit };
}
