// Jutsu effects drawn from the approved VFX sheets (groups vfx_<element>): projectiles, beasts,
// streams, breaths, blasts, hits, walls and auras, plus signature effects of single jutsu (the
// Great Fireball, the Great Fire Annihilation) with their enhanced versions. When an element's
// sheets aren't in the game yet, the renderer falls back to its drawn effects.
// An elemental jutsu's effects, its beast and its wall play in the caster's chakra colour (the
// owner, 2026-10-21): the effect's `tint` (a wall's, its owner's) picks a recoloured copy of the
// sheet (vfxTintCache.ts); Natural, or the sheet's own colour, plays his sheet itself.

import type { AreaShape, GaleZone, Pt, Wall } from '../../battle/types';
import { isTintElement } from '../../sprite/vfxTint';
import { worldSprite } from '../world/WorldSpriteView';
import type { VfxElement } from '../../battle/jutsu';
import type { Fx, Held, VolleyPath } from './playback';
import type { Scene } from './renderer';
import { ELEMENT_COLORS, auraDx, foeHidden, fxPos, project, tintColors } from './renderer';
import { WAIT, hurryVfxSheets, tintedSheet } from './vfxTintCache';
import type { TintedSheet } from './vfxTintCache';
import { unitTint, wallElement } from './vfxTintPlan';
import { keepAbove, wanderHeading, wanderPoint } from './paths';
import type { Bend, XY } from './paths';
import { cellCenter, dist, keyCell } from '../../battle/map';
import { BLOOD_GROUP, screenSplats, splatAt } from './bloodPlan';

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

/**
 * How much brighter the frames being drawn burn (0: as they are): a fire fanned by a gale (the Gale
 * Curtain) is drawn again over itself, added as light, so his frames glow without being redrawn.
 */
let glow = 0;

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
  const draw = () => {
    if (tf) ctx.drawImage(tf.img, X + tf.x, Y + tf.y);
    else ctx.drawImage(s.img, f * s.spec.frameW, a.row * s.spec.frameH, s.spec.frameW, s.spec.frameH, X, Y, s.spec.frameW, s.spec.frameH);
  };
  draw();
  if (glow > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * glow;
    draw();
  }
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
 * Blood on the screen itself (the owner: "las gotas de sangre manchan la pantalla cuando
 * exitosamente se consigue el sangrado"): the drops of a cut that left Bleeding land near the edge
 * the cut went toward, clear of the panels, then run down and fade. Drawn in screen pixels after
 * everything else, so it grows with the screen and not with the camera's zoom; never tinted.
 */
export function drawScreenBlood(ctx: CanvasRenderingContext2D, sc: Scene): void {
  if (!sc.pb.screenBlood.length) return;
  const s = worldSprite(BLOOD_GROUP, 'screen');
  if (!s || !ready(s)) return;
  const { frameW: fw, frameH: fh, anchor } = s.spec;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  for (const b of sc.pb.screenBlood) {
    const ms = (sc.now - b.t0) * sc.pb.speed;
    for (const sp of screenSplats(sc.W, sc.H, b.side, b.seed, sc.avoid ?? [])) {
      const st = splatAt(ms - sp.delay);
      const a = s.spec.anims[sp.variant];
      if (!st || !a) continue;
      const k = sp.scale;
      ctx.globalAlpha = st.alpha;
      const x = Math.round(sp.x - anchor[0] * k);
      const y = Math.round(sp.y - anchor[1] * k + st.slide * k);
      ctx.drawImage(s.img, Math.min(st.frame, a.frames - 1) * fw, a.row * fh, fw, fh, x, y, fw * k, fh * k);
    }
  }
  ctx.restore();
}

/**
 * A lingering aura on a unit while its condition lasts (the Breeze Mantle's wind until its next
 * turn): the element's aura and aura_back, faint, looping on the body. Not on a hidden foe.
 */
export function drawLinger(ctx: CanvasRenderingContext2D, sc: Scene, id: string, l: { element: VfxElement; alpha: number; t0: number; tint?: string }, layer: 'back' | 'front'): void {
  const u = sc.state.units[id];
  const v = sc.pb.views.get(id);
  if (!u || !v || u.down || foeHidden(sc, u, v)) return;
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
  glow = fanNow(sc, f) ? FAN_GLOW : 0;
  const drawn = drawFromSheets(ctx, sc, f);
  glow = 0;
  return drawn && !waiting;
}

/** How bright a fanned fire burns over itself (see glow). */
const FAN_GLOW = 0.5;

/** A fanned fire has reached the wind (the Gale Curtain): it burns brighter from there on. */
const fanNow = (sc: Scene, f: Fx): boolean => f.fan !== undefined && (sc.now - f.t0) * sc.pb.speed >= f.dur * f.fan;

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
    case 'wave':
      return [...named('wall', 'wall_depth', 'breath', 'blast'), ...(f.tideS ? TIDE_S_SHEETS.map((name) => ({ group: 'vfx_tide_s', name, beast: false })) : [])];
    case 'tower':
      return named('wall_depth', 'multi');
    case 'conduct':
      return named('hit');
    case 'swirl':
      return named('bolt');
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

/**
 * A route's points on the screen (px), the length of its legs on the ground (m), for wanderPoint,
 * and its bends kept `margin` px above the ground (a swing down never dips into the dirt).
 */
function routeOf(sc: Scene, f: Fx, margin: number): { pts: XY[]; pace: number[]; bends: Bend[] } {
  const r = f.route!;
  const floor: number[] = [];
  const pts = r.map((p) => {
    const g = project(sc.map, p.at);
    floor.push(g.Y);
    return { x: g.X, y: g.Y - p.lift };
  });
  const pace = r.slice(1).map((p, i) => Math.max(0.05, dist(r[i].at, p.at)));
  return { pts, pace, bends: keepAbove(pts, floor, f.bends ?? [], margin) };
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
  // The water dragon's body reaches about 22 px below its middle; a rock bullet is small.
  const { pts, pace, bends } = routeOf(sc, f, f.trail ? 28 : 6);
  if (f.trail) {
    const head = worldSprite('vfx_dragon', 'water_head');
    const tile = sheet(f.element, 'stream', f.tint);
    if (!head || !ready(head) || !tile) return false;
    const h = inTint(head, f.element, 'water_head', f.tint);
    const arrive = f.trail.arrive;
    const t = Math.min(1, ms / arrive);
    const alpha = ms > arrive ? Math.max(0, 1 - (ms - arrive) / Math.max(1, f.dur - arrive)) : 1;
    drawTrail(ctx, pts, bends, pace, t, tile, frameAt(tile, 'fly', ms), alpha);
    const appear = f.trail.appear ?? 0;
    if (ms < arrive && ms >= appear) {
      const p = wanderPoint(pts, bends, t, pace);
      const d = wanderHeading(pts, bends, t, pace);
      const r = turnedRow(h, d.x, d.y, 10);
      // It forms on the jet's tip in 100 ms.
      blit(ctx, h, r.anim, 0, p.x, p.y, r.mirror, Math.min(1, (ms - appear) / 100));
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
  // A Fireball fanned by a gale grows into the Great Fireball once it reaches the wind (his own
  // bigger art); its blast stays the Fireball's (the area is the one aimed), only brighter. Other
  // signatures keep their timing and only burn brighter.
  const grows = f.sig === 'fireball' && f.kind === 'projectile' && fanNow(sc, f);
  const sig = f.sig && f.sig !== 'eyes' && f.sig !== 'tag' && f.sig !== 'log' ? sigSheetName(el, f.sig, !!f.enhanced || grows) : undefined;
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
      if (f.spread) return drawSpreadBreath(ctx, sc, f, s, f.area, ms, t, mirror);
      // Breaths rolled out along the cone, one after another.
      const len = f.area.length;
      const rad = (f.area.dir * Math.PI) / 180;
      const steps = Math.max(2, Math.round(len / 1.6));
      // A sheet anchored at its edge (earth's dust: his anchor is on its left end, the others' near
      // the middle) is drawn back by the difference, so its dust ends where the cone ends.
      const [ax] = s.spec.anchor;
      const off = Math.abs(ax - s.spec.frameW / 2) > s.spec.frameW * 0.25 ? ax - s.spec.frameW / 2 : 0;
      for (let i = 0; i < steps; i++) {
        const k = (i + 0.5) / steps;
        if (t < k * 0.6) break;
        const p = project(sc.map, { x: f.from.x + Math.cos(rad) * len * k, z: f.from.z + Math.sin(rad) * len * k });
        blit(ctx, s, 'fly', frameAt(s, 'fly', ms + i * 70), p.X - (mirror ? -1 : 1) * (s.spec.frameW * 0.3 - off), p.Y - 30, mirror, t > 0.8 ? (1 - t) / 0.2 : 1);
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
      // Blood (the Bleeding Cut's spray, a bleeding ninja's drip): his dark-red drops, never tinted.
      // Nothing is drawn in its place while the sheet loads (an element's stand-in would be wrong).
      if (f.blood) {
        const s = worldSprite(BLOOD_GROUP, 'spray');
        if (!s || !ready(s)) return true;
        const p = project(sc.map, f.to);
        const anim = f.blood === 'spray' ? 'burst' : 'drip';
        blit(ctx, s, anim, frameAt(s, anim, ms), p.X, p.Y, left);
        return true;
      }
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
    case 'wave':
    case 'tower':
    case 'conduct':
      // Drawn among the units by depth (depthFx), so the ninjas stand in front of or behind them.
      return true;
    case 'swirl': {
      // The wind swirling round a fanned fire where it meets the gale: the wind's vortex (his bolt).
      const s = sheet('wind', 'bolt', f.tint);
      if (!s) return true;
      const p = project(sc.map, f.to);
      const alpha = t < 0.2 ? t / 0.2 : t > 0.7 ? (1 - t) / 0.3 : 1;
      blit(ctx, s, 'fly', frameAt(s, 'fly', ms), p.X, p.Y - (f.lift?.[1] ?? 56), false, alpha * 0.9);
      return true;
    }
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

/**
 * A cone filled with the element's breath across its width (the Rubble Gust's dust and stones): one
 * breath near the caster, then a row across the cone further out as it opens, each one whole inside
 * the cone (its middle on the point, his sheet anchored wherever it is), so the dust starts in
 * front of the caster and ends where the cone ends. They show one after another as it rolls out.
 */
function drawSpreadBreath(ctx: CanvasRenderingContext2D, sc: Scene, f: Fx, s: Sheet, cone: Extract<AreaShape, { kind: 'cone' }>, ms: number, t: number, mirror: boolean): boolean {
  const rad = (cone.dir * Math.PI) / 180;
  const ux = Math.cos(rad);
  const uz = Math.sin(rad);
  const tan = Math.tan((cone.angle * Math.PI) / 360);
  // Half his breath's length along the screen, in metres: no breath reaches back past the hand.
  const half = s.spec.frameW / 2 / sc.map.px.perM;
  const near = Math.min(cone.length / 2, 0.5 + half * Math.abs(ux));
  const far = Math.max(near, cone.length - half * Math.abs(ux));
  const pts: { d: number; off: number }[] = [{ d: near, off: 0 }];
  // The far row spreads across the cone (in the depth when it points across the screen).
  for (const k of [-0.55, 0, 0.55]) pts.push({ d: far, off: far * tan * k });
  if (far - near > 1.4) for (const k of [-0.4, 0.4]) pts.push({ d: (near + far) / 2, off: ((near + far) / 2) * tan * k });
  pts.sort((a, b) => a.d - b.d || a.off - b.off);
  const [ax] = s.spec.anchor;
  const alpha = t > 0.8 ? (1 - t) / 0.2 : 1;
  pts.forEach((q, i) => {
    if (t < (q.d / cone.length) * 0.6) return;
    const p = project(sc.map, { x: cone.origin.x + ux * q.d - uz * q.off, z: cone.origin.z + uz * q.d + ux * q.off });
    // blit puts his anchor on the point: move it so the frame's middle is there instead.
    blit(ctx, s, 'fly', frameAt(s, 'fly', ms + i * 70), p.X - (mirror ? -1 : 1) * (s.spec.frameW / 2 - ax), p.Y - 30, mirror, alpha);
  });
  return true;
}

// --- the gaps' jutsu: the Devouring Tide's wave, the Whirlwind Tower, the Gale Curtain's gale ------

/** Something drawn among the units, by depth (renderer.ts sorts them by z). */
export interface DepthItem {
  z: number;
  draw: () => void;
}

/** When a wave's crest reaches `d` m along a cone `len` m long, as a fraction of its run. */
export const WAVE_CREST = (d: number, len: number): number => Math.max(0, Math.min(1, (d - WAVE_START) / Math.max(0.1, len - WAVE_START)));
/** Where the crest sets off, in front of the caster (m). */
const WAVE_START = 0.8;
/** How tall his columns at the Tide's crest are drawn (of his frame), so they meet the top of his wall. */
const CREST_COLUMN = 0.5;
/** How long the wave breaks at the end of its run (his water sinking, his spouts bursting), while the last ones it reached are swept (ms). */
export const WAVE_HOLD = 900;
/** Metres between the lanes of his water wall laid across the cone, and his wall's own length (m). */
const WAVE_LANE = 0.85;
const WALL_LEN = 4.6;

/** The Whirlwind Tower's column: its rise (his rise row, 12 frames at 12 fps), its spin and its fade (ms). */
export const TOWER_RISE = 1000;
const TOWER_SPIN = 1300;
const TOWER_FADE = 450;
export const TOWER_MS = TOWER_RISE + TOWER_SPIN + TOWER_FADE;
/** How much wider his tornado is at its top than at its foot (a funnel: the owner, "mediante se va más arriba más ancho"). */
const TOWER_WIDEN = 2.6;

/**
 * Draws one column of a wall_depth sheet standing on a ground point (the sheet is a wall running
 * into the depth, anchored at its middle: here its foot is put on the point and its middle over it).
 */
function blitColumn(ctx: CanvasRenderingContext2D, s: Sheet, anim: string, frame: number, p: { X: number; Y: number }, alpha: number): void {
  const [ax, ay] = s.spec.anchor;
  blit(ctx, s, anim, frame, p.X - (s.spec.frameW / 2 - ax), p.Y - (s.spec.frameH - 2 - ay), false, alpha);
}

/** A canvas to cut a frame into strips (the tornado's funnel). */
let strips: HTMLCanvasElement | null = null;

/**
 * One column of a wall_depth sheet standing on a ground point, widened toward its top (his tornado
 * as a funnel): his frame cut into 2 px strips, each stretched across by how high it is, from 1 at
 * the foot to `widen` at the top (nearest neighbour, his pixels only moved and scaled). `mirror`
 * turns it round (a second turn of the wind behind the first).
 */
function blitFunnel(ctx: CanvasRenderingContext2D, s: Sheet, anim: string, frame: number, p: { X: number; Y: number }, alpha: number, widen: number, mirror = false): void {
  if (typeof document === 'undefined') return;
  const W = s.spec.frameW;
  const H = s.spec.frameH;
  strips ??= document.createElement('canvas');
  if (strips.width !== W || strips.height !== H) {
    strips.width = W;
    strips.height = H;
  }
  const g = strips.getContext('2d');
  if (!g) return;
  g.clearRect(0, 0, W, H);
  g.imageSmoothingEnabled = false;
  const [ax, ay] = s.spec.anchor;
  blit(g as unknown as CanvasRenderingContext2D, s, anim, frame, mirror ? W - ax : ax, ay, mirror);
  const foot = H - 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < H; y += 2) {
    const k = Math.max(0, Math.min(1, (foot - y) / foot));
    const w = Math.round(W * (1 + (widen - 1) * k ** 1.25));
    ctx.drawImage(strips, 0, y, W, 2, Math.round(p.X - w / 2), Math.round(p.Y - foot + y), w, 2);
  }
  ctx.restore();
}

/**
 * The Devouring Tide's wave (the owner's second round: "más ancho y bonita", his horizontal water
 * wall, "combinar los dos muros para hacer algo más contundente"): his water wall (wall, the one
 * that runs across the screen) laid along the run in lanes across the whole width of the cone, a
 * wide body of water rolling forward with its front at the crest; his water columns (wall_depth)
 * standing along the crest as its face, his spray (breath) before it; at the end of the cone the
 * water sinks back (his rise played backwards) and his spouts (blast) burst along the crest as it
 * breaks. Pointed mostly into the depth, the two swap: his wall stands along the crest as its face
 * and his columns trail behind it as its body.
 */
function waveItems(ctx: CanvasRenderingContext2D, sc: Scene, f: Fx): DepthItem[] {
  const ms = (sc.now - f.t0) * sc.pb.speed;
  const runMs = Math.max(1, f.dur - WAVE_HOLD);
  if (ms < 0 || ms > f.dur || !f.area || f.area.kind !== 'cone') return [];
  const t = Math.min(1, ms / runMs);
  const cone = f.area;
  const rad = (cone.dir * Math.PI) / 180;
  const ux = Math.cos(rad);
  const uz = Math.sin(rad);
  const tan = Math.tan((cone.angle * Math.PI) / 360);
  const side = Math.abs(uz) > Math.abs(ux) * 1.2;
  const wall = sheet(f.element, 'wall', f.tint);
  const col = sheet(f.element, 'wall_depth', f.tint);
  if (!wall || !col) return [];
  // The crest runs out fast and slows as the water spends itself.
  const crest = WAVE_START + (cone.length - WAVE_START) * (1 - (1 - t) ** 1.6);
  const hold = Math.max(0, ms - runMs);
  const fade = hold > 0 ? Math.max(0, 1 - hold / WAVE_HOLD) : 1;
  const at = (d: number, off: number): Pt => ({ x: cone.origin.x + ux * d - uz * off, z: cone.origin.z + uz * d + ux * off });
  // His rise at three times its pace as the wave sets off; at the end, the same played backwards (it sinks).
  const rising = Math.min(11, Math.floor((ms * 3 * 12) / 1000));
  const sinking = hold > 0 ? Math.max(0, 11 - Math.floor((hold / WAVE_HOLD) * 12)) : -1;
  const pose = (s: Sheet, phase: number): [string, number] =>
    sinking >= 0 ? ['rise', sinking] : rising < 11 ? ['rise', rising] : ['idle', frameAt(s, 'idle', ms + phase)];
  const out: DepthItem[] = [];
  const place = (p: Pt, z: number, draw: (q: { X: number; Y: number }) => void) => out.push({ z, draw: () => draw(project(sc.map, p)) });
  const w = Math.max(0.6, crest * tan);
  if (!side) {
    // The body: lanes of his wall across the cone, each with its front at the crest.
    const mid = Math.max(WAVE_START + 0.4, crest - WALL_LEN / 2 + 0.4);
    const wm = Math.max(0.5, mid * tan);
    const lanes = Math.max(2, Math.round((2 * wm) / WAVE_LANE) + 1);
    const mirror = ux < 0;
    for (let i = 0; i < lanes; i++) {
      const off = -wm + (2 * wm * i) / (lanes - 1);
      const p = at(mid, off);
      const [anim, frame] = pose(wall, i * 131);
      place(p, p.z, (q) => blit(ctx, wall, anim, frame, q.X, q.Y, (i % 2 === 1) !== mirror, 0.95 * fade));
      // What it leaves behind settles low (his rise held half up), fading.
      const back = mid - WALL_LEN * 0.9;
      if (back > WAVE_START + 0.6 && i % 2 === 0) {
        const b = at(back, off * (back / mid));
        place(b, b.z, (q) => blit(ctx, wall, 'rise', sinking >= 0 ? Math.min(5, sinking) : 5, q.X, q.Y, mirror, 0.5 * fade));
      }
    }
    // The face: his columns standing along the crest, on its near half only (the far ones would
    // stack up the screen into one tall bar over the body). Seen across the screen his column (a
    // wall running into the depth) is far taller than his wall, and stood above the body like a thin
    // pole: drawn half as tall from its foot, so its top meets the body's. They come up with the
    // body, not ahead of it: half the wall's pace, fading in over the first 2 m of the run.
    const n = Math.max(2, Math.round((2 * w) / 1.1) + 1);
    const mz = at(crest, 0).z;
    const grow = Math.min(1, (crest - WAVE_START) / 2);
    const colRise = Math.min(11, Math.floor((ms * 1.5 * 12) / 1000));
    for (let i = 0; i < n && grow > 0.15; i++) {
      const p = at(crest, -w + (2 * w * i) / (n - 1));
      if (p.z < mz - 0.3) continue;
      const [anim, frame] = sinking < 0 && colRise < 11 ? ['rise', colRise] : pose(col, i * 97);
      place(p, p.z + 0.02, (q) => {
        ctx.save();
        ctx.translate(Math.round(q.X), Math.round(q.Y));
        ctx.scale(1, CREST_COLUMN);
        blitColumn(ctx, col, anim, frame, { X: 0, Y: 0 }, fade * grow);
        ctx.restore();
      });
    }
  } else {
    // Into the depth: his wall along the crest is the face (two rows, the front one solid) ...
    for (const [k, alpha] of [[0, 1], [0.9, 0.7]] as const) {
      const d = crest - k;
      if (d < WAVE_START) continue;
      const wd = Math.max(0.6, d * tan);
      const n = Math.max(1, Math.ceil((2 * wd) / 4.4));
      for (let i = 0; i < n; i++) {
        const p = at(d, -wd + (2 * wd * (i + 0.5)) / n);
        const [anim, frame] = pose(wall, i * 113 + k * 300);
        place(p, p.z, (q) => blit(ctx, wall, anim, frame, q.X, q.Y, i % 2 === 1, alpha * fade));
      }
    }
    // ... and his columns are its body, trailing behind it across its width.
    for (const [k, alpha] of [[1.7, 0.85], [3.2, 0.45]] as const) {
      const d = crest - k;
      if (d < WAVE_START) continue;
      const wd = Math.max(0.6, d * tan);
      const n = Math.max(2, Math.round((2 * wd) / 1.3) + 1);
      for (let i = 0; i < n; i++) {
        const p = at(d, -wd + (2 * wd * i) / (n - 1));
        const [anim, frame] = pose(col, i * 89 + k * 200);
        place(p, p.z, (q) => blitColumn(ctx, col, anim, frame, q, alpha * fade));
      }
    }
  }
  // His spray before the crest while it runs (across the screen).
  const foam = side ? undefined : sheet(f.element, 'breath', f.tint);
  if (foam && t < 1) {
    const d = crest + 0.7;
    const wd = Math.min(d, cone.length) * tan;
    for (const k of [-0.7, -0.25, 0.25, 0.7]) {
      if (d > cone.length + 0.5) break;
      const p = at(d, wd * k);
      place(p, p.z + 0.01, (q) => blit(ctx, foam, 'fly', frameAt(foam, 'fly', ms + k * 400), q.X, q.Y - 40, ux < 0, 0.85));
    }
  }
  // The S-rank Tide: his curl, his dragon and his kanji ride the crest, over the whole wave (he
  // painted them over it): in front of its nearest water.
  if (f.tideS) out.push(...tideSItems(ctx, sc, f, ms, runMs, at(crest, 0), ux < 0, Math.max(at(crest, -w).z, at(crest, w).z, at(cone.length, -cone.length * tan).z, at(cone.length, cone.length * tan).z)));
  // The break: his spouts burst along the crest at the end of the cone.
  const spout = sheet(f.element, 'blast', f.tint);
  const burst = ms - runMs * 0.92;
  if (spout && burst > 0) {
    const we = cone.length * tan;
    const n = Math.max(3, Math.round((2 * we) / 1.6) + 1);
    for (let i = 0; i < n; i++) {
      const p = at(cone.length - 0.3, -we * 0.9 + (1.8 * we * i) / (n - 1));
      const late = burst - i * 45;
      if (late < 0) continue;
      place(p, p.z + 0.03, (q) => blit(ctx, spout, 'blast', frameAt(spout, 'blast', late), q.X, q.Y, i % 2 === 1, 0.95));
    }
  }
  return out;
}

/** The S-rank Tide's sheets (vfx_tide_s, tools/world-sprites/vfx-tide-s.ts). */
export const TIDE_S_SHEETS = ['curl', 'dragon', 'kanji'];
/**
 * The S-rank Tide's timing (ms into its wave; the run is 2200 ms, then the 900 ms break, which is
 * what his dragon's play lasts, DRAGON_MS in the generator): his curl rises out of the ground with
 * the wave and sinks back after the break; his kanji fades in, its glow pulsing over it as light,
 * flashes as the wave breaks and fades. The dragon's own surge, roar and dive are in its frames.
 */
const TIDE_S = { curlUp: [600, 1100], sink: [150, 900], curlFade: [500, 900], kanjiIn: [1150, 1500], pulse: 600, flash: [0, 120, 420], kanjiOut: [150, 550] } as const;
const span01 = (v: number, a: number, b: number) => Math.max(0, Math.min(1, (v - a) / (b - a)));

function tideSheet(f: Fx, name: string): Sheet | undefined {
  const s = worldSprite('vfx_tide_s', name);
  return s && ready(s) ? inTint(s, f.element, name, f.tint) : undefined;
}

/**
 * The S-rank Tide (the owner's paint-over of our widest wave, 2026-10-22; a proposal): his layers
 * where he painted them on our frame, every sprite's anchor on the crest point `c`. Mirrored with
 * the wave when it runs to the left, except his kanji, which is only moved to its mirrored place.
 */
function tideSItems(ctx: CanvasRenderingContext2D, sc: Scene, f: Fx, ms: number, runMs: number, c: Pt, mirror: boolean, front: number): DepthItem[] {
  const curl = tideSheet(f, 'curl');
  const dragon = tideSheet(f, 'dragon');
  const kanji = tideSheet(f, 'kanji');
  const after = ms - runMs;
  const out: DepthItem[] = [];
  if (curl) {
    // It rises out of the ground (nothing of it below its foot) and sinks back into it.
    const up = 1 - (1 - span01(ms, TIDE_S.curlUp[0], TIDE_S.curlUp[1])) ** 3;
    const down = span01(after, TIDE_S.sink[0], TIDE_S.sink[1]) ** 2;
    const H = curl.spec.frameH;
    const lift = Math.round((1 - up + down) * H);
    const alpha = 1 - span01(after, TIDE_S.curlFade[0], TIDE_S.curlFade[1]);
    if (lift < H && alpha > 0)
      out.push({ z: front + 0.04, draw: () => {
        const q = project(sc.map, c);
        const foot = Math.round(q.Y) - curl.spec.anchor[1] + H;
        ctx.save();
        ctx.beginPath();
        ctx.rect(q.X - 4000, foot - 8000, 8000, 8000);
        ctx.clip();
        blit(ctx, curl, 'idle', 0, q.X, q.Y + lift, mirror, alpha);
        ctx.restore();
      } });
  }
  if (dragon) out.push({ z: front + 0.05, draw: () => {
    const q = project(sc.map, c);
    blit(ctx, dragon, 'play', frameAt(dragon, 'play', ms), q.X, q.Y, mirror);
  } });
  if (kanji) {
    const k = span01(ms, TIDE_S.kanjiIn[0], TIDE_S.kanjiIn[1]) * (1 - span01(after, TIDE_S.kanjiOut[0], TIDE_S.kanjiOut[1]));
    const flash = after < TIDE_S.flash[0] ? 0 : after < TIDE_S.flash[1] ? 1 : 1 - span01(after, TIDE_S.flash[1], TIDE_S.flash[2]);
    const glow = Math.min(1, k * (0.3 + 0.2 * Math.sin(((ms - TIDE_S.kanjiIn[0]) / TIDE_S.pulse) * 2 * Math.PI)) + flash);
    if (k > 0 || glow > 0)
      out.push({ z: front + 0.06, draw: () => {
        const q = project(sc.map, c);
        // Never mirrored (a written character): only put at its mirrored place.
        const x = mirror ? q.X - 2 * (kanji.spec.frameW / 2 - kanji.spec.anchor[0]) : q.X;
        if (k > 0) blit(ctx, kanji, 'kanji', 0, x, q.Y, false, k);
        if (glow > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          blit(ctx, kanji, 'glow', 0, x, q.Y, false, glow);
          ctx.restore();
        }
      } });
  }
  return out;
}

/**
 * The Whirlwind Tower (the owner's second round: "más contundente", "el torbellino central más
 * ancho mediante se va más arriba", the small winds "que corran alrededor en forma ondulada"): his
 * tornado column (wind wall_depth) rises at the point as a funnel, wider the higher it goes, with a
 * second turn of it behind, mirrored and fainter; his small whirlwinds (multi) spread out from it
 * and run round it on wavy paths at three heights, in front of and behind whoever stands there, and
 * it fades.
 */
function towerItems(ctx: CanvasRenderingContext2D, sc: Scene, f: Fx): DepthItem[] {
  const ms = (sc.now - f.t0) * sc.pb.speed;
  if (ms < 0 || ms > f.dur || !f.area || f.area.kind !== 'circle') return [];
  const col = sheet(f.element, 'wall_depth', f.tint);
  if (!col) return [];
  const c = f.area.center;
  const r = f.area.radius;
  const alpha = ms > f.dur - TOWER_FADE ? Math.max(0, (f.dur - ms) / TOWER_FADE) : 1;
  const out: DepthItem[] = [];
  // It opens into its funnel as it rises; a bigger tower (enhanced) opens wider.
  const widen = 1 + (TOWER_WIDEN * Math.min(1.35, r / 3) - 1) * Math.min(1, ms / TOWER_RISE);
  out.push({ z: c.z, draw: () => {
    const p = project(sc.map, c);
    const [anim, k] = ms < TOWER_RISE ? ['rise', ms] : ['idle', ms - TOWER_RISE];
    blitFunnel(ctx, col, anim, frameAt(col, anim, k + 450), p, alpha * 0.5, widen * 1.08, true);
    blitFunnel(ctx, col, anim, frameAt(col, anim, k), p, alpha, widen);
  } });
  const mini = sheet(f.element, 'multi', f.tint);
  const spin = ms - TOWER_RISE * 0.6;
  if (mini && spin > 0) {
    const n = f.minis ?? 6;
    const fadeIn = Math.min(1, spin / 250);
    // They come off the column and spread out, then keep running round it.
    const sep = 1 - (1 - Math.min(1, spin / 650)) ** 2;
    for (let i = 0; i < n; i++) {
      const level = i % 3;
      // Gusts: each runs faster and slower, and rides up and down, on its own wave.
      const a = (i * 2 * Math.PI) / n + (spin / 1000) * 2.3 + 0.45 * Math.sin(spin / 380 + i * 1.9);
      const R = r * (0.3 + 0.62 * sep) * (1 + 0.17 * Math.sin(3 * a + i * 1.7)) + level * 0.3;
      const lift = 16 + level * 48 + 16 * Math.sin(2 * a + spin / 240 + i);
      const p = { x: c.x + Math.cos(a) * R, z: c.z + Math.sin(a) * R * 0.85 };
      out.push({ z: p.z, draw: () => {
        const q = project(sc.map, p);
        blit(ctx, mini, 'fly', frameAt(mini, 'fly', ms + i * 120), q.X, q.Y - lift, Math.sin(a) > 0, alpha * fadeIn);
      } });
    }
  }
  return out;
}

// --- the elements on the ground: wet ground, steam, lightning across the wet -----------------------

/** A ground cell's middle ("c,r"). */
export const keyCenter = (k: string): Pt => cellCenter(keyCell(k));
/** How long wet ground and steam take to fade in, and to dry or thin away (ms). */
export const GROUND_FADE = 700;
/** How long the puff of steam off a ninja whose flames went out lasts (ms). */
export const DOUSE_MS = 1700;
const GROUND_IN = 420;
/** How long lightning runs across a wet patch, and how fast its front goes (m/s). */
export const CONDUCT_MS = 1100;
const CONDUCT_SPEED = 16;

/** A small fixed number per cell, to vary what is drawn on it. */
const cellHash = (k: string): number => {
  let h = 2166136261;
  for (let i = 0; i < k.length; i++) h = Math.imul(h ^ k.charCodeAt(i), 16777619);
  return (h >>> 0) % 1009;
};

/** How long steam the wind blows away takes to drift off and thin out (ms), and how far it drifts (m). */
export const BLOW_MS = 1100;
const BLOW_DRIFT = 2.4;

/** A cell of wet ground or steam on the screen: where, how solid, and (blown away) which way it drifts and how far along. */
type GroundCell = { k: string; p: Pt; a: number; blow?: { ux: number; uz: number; t: number } };

/**
 * The cells of wet ground or steam shown now, with how solid each is: the state's, less the ones
 * whose event is still to play (unless a wave timed them), plus the ones going whose event is still
 * to play or that are fading.
 */
function groundShown(sc: Scene, kind: 'wet' | 'steam'): GroundCell[] {
  const { state, pb, now } = sc;
  const born = pb.groundBorn[kind];
  const coming = pb.groundQueued(kind, true);
  const out: GroundCell[] = [];
  const have = state[kind] ?? {};
  for (const k of Object.keys(have)) {
    const b = born.get(k);
    if (b === undefined && coming.has(k)) continue;
    const a = b === undefined ? 1 : Math.max(0, Math.min(1, ((now - b) * pb.speed) / GROUND_IN));
    if (a > 0) out.push({ k, p: keyCenter(k), a });
  }
  for (const k of pb.groundQueued(kind, false)) if (!(k in have)) out.push({ k, p: keyCenter(k), a: 1 });
  for (const g of pb.groundGone) {
    if (g.kind !== kind) continue;
    if (g.blown) {
      // Blown away (the owner: "puede ser eliminada con ataques elementales de aire"): each cell's
      // steam is carried off away from where the wind came from, quick at first, thinning as it goes.
      const t = ((now - g.t0) * pb.speed) / BLOW_MS;
      if (t >= 1) continue;
      const ease = 1 - (1 - t) * (1 - t);
      for (const k of g.cells) {
        if (k in have) continue;
        const c = keyCenter(k);
        const d = Math.hypot(c.x - g.blown.x, c.z - g.blown.z);
        const [ux, uz] = d > 0.05 ? [(c.x - g.blown.x) / d, (c.z - g.blown.z) / d] : [1, 0];
        // Nearer the wind, it goes further (a gust pushes what it hits first hardest).
        const far = BLOW_DRIFT * (1 + 0.6 / (1 + d)) * (0.85 + (cellHash(k) % 7) * 0.05);
        out.push({ k, p: { x: c.x + ux * far * ease, z: c.z + uz * far * ease }, a: Math.max(0, 1 - t * t * 1.15), blow: { ux, uz, t } });
      }
      continue;
    }
    const a = 1 - ((now - g.t0) * pb.speed) / GROUND_FADE;
    if (a > 0) for (const k of g.cells) if (!(k in have)) out.push({ k, p: keyCenter(k), a });
  }
  return out;
}

/**
 * Wet ground (the owner: "pone el suelo donde pasa mojado"): a dark sheen over the soaked cells,
 * their outline rounded, with a few glints of light on the water; brighter while lightning runs
 * across it. Not in a chakra colour: wet ground is wet ground. Drawn on the ground, under everything.
 */
export function drawWetGround(ctx: CanvasRenderingContext2D, sc: Scene): void {
  const cells = groundShown(sc, 'wet');
  if (!cells.length) return;
  const { map } = sc;
  const rx = 0.37 * map.px.perM;
  const rz = 0.37 * map.px.perMDepth;
  ctx.save();
  // One path per step of solidity, so overlapping cells darken once; a wider, fainter pass first
  // softens the edge of the patch.
  ctx.fillStyle = '#0f2b4c';
  for (const [grow, strength] of [[1.6, 0.13], [1, 0.27]] as const) {
    const steps = new Map<number, Path2D>();
    for (const c of cells) {
      const a = Math.ceil(c.a * 6) / 6;
      const path = steps.get(a) ?? new Path2D();
      const q = project(map, c.p);
      path.ellipse(Math.round(q.X), Math.round(q.Y), rx * grow, rz * grow, 0, 0, Math.PI * 2);
      steps.set(a, path);
    }
    for (const [a, path] of steps) {
      ctx.globalAlpha = strength * a;
      ctx.fill(path);
    }
  }
  // Glints: a short line of light on one cell in seven, coming and going.
  ctx.fillStyle = '#d6ecff';
  for (const c of cells) {
    const h = cellHash(c.k);
    if (h % 5) continue;
    const tw = 0.5 + 0.5 * Math.sin(sc.now / 420 + h);
    ctx.globalAlpha = 0.55 * c.a * tw;
    const q = project(map, c.p);
    ctx.fillRect(Math.round(q.X - 4 + (h % 5)), Math.round(q.Y - 1 + ((h >> 3) % 3)), 5, 1);
  }
  // Lightning running across it lights the water up.
  for (const f of sc.pb.fx) {
    if (f.kind !== 'conduct' || !f.cells) continue;
    const ms = (sc.now - f.t0) * sc.pb.speed;
    if (ms < 0 || ms > f.dur) continue;
    const col = (tintColors('lightning', f.tint) ?? ELEMENT_COLORS.lightning)[1];
    const path = new Path2D();
    for (const k of f.cells) {
      const p = keyCenter(k);
      if ((dist(p, f.from) / CONDUCT_SPEED) * 1000 > ms) continue;
      const q = project(map, p);
      path.ellipse(Math.round(q.X), Math.round(q.Y), rx, rz, 0, 0, Math.PI * 2);
    }
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.28 * (0.6 + 0.4 * Math.sin(sc.now / 40)) * Math.min(1, (f.dur - ms) / 300);
    ctx.fill(path);
  }
  ctx.restore();
}

type WorldSheet = NonNullable<ReturnType<typeof worldSprite>>;

/** A world sheet that is loaded (the camp's smoke), or nothing. */
function worldSheet(group: string, name: string): WorldSheet | undefined {
  const s = worldSprite(group, name);
  return s && ready(s) ? s : undefined;
}

/**
 * Steam (the owner: "como una cortina de humo que nubla la visión"): a curtain, not a few chimneys.
 * A white veil of overlapping billows over every row of steaming cells, in front of whoever stands
 * in that row so the ninjas inside are hard to make out, drawn once per row so the overlaps don't
 * stack into bright spots; and the camp's smoke (his tall column and his small puff: no element
 * sheet has grey smoke) on every cell, at different frames, some turned round, spread wider than it
 * is tall so the columns run together into a bank. Rising in when it forms. Not in a chakra colour.
 */
function steamItems(ctx: CanvasRenderingContext2D, sc: Scene): DepthItem[] {
  const cells = groundShown(sc, 'steam');
  if (!cells.length) return [];
  const tall = worldSheet('campsite', 'smoke_tall');
  const puff = worldSheet('camp', 'smoke');
  const out: DepthItem[] = [];
  const { map } = sc;
  const rows = new Map<number, typeof cells>();
  for (const c of cells) {
    const r = keyCell(c.k).r;
    rows.set(r, [...(rows.get(r) ?? []), c]);
  }
  const rx = 0.62 * map.px.perM;
  for (const row of rows.values()) {
    const z = row[0].p.z;
    // The smoke first (behind the row's veil), then the veil.
    for (const c of row) {
      const h = cellHash(c.k);
      const s = h % 2 === 0 ? tall : puff;
      if (!s) continue;
      const rise = (1 - c.a) * 18;
      const [ax] = s.spec.anchor;
      out.push({ z: z + 0.2, draw: () => {
        const q = project(map, c.p);
        const mirror = (h & 8) !== 0;
        // Blown away, it stretches out along the wind as it goes.
        const wide = 1.9 + (c.blow ? c.blow.t * 1.3 * Math.abs(c.blow.ux) : 0);
        const high = s === tall ? 0.62 : 0.9;
        ctx.save();
        // Stretched round the cell's foot (nearest neighbour: his pixels, only scaled).
        ctx.translate(Math.round(q.X + ((h >> 2) % 13) - 6), Math.round(q.Y + 6 + rise));
        ctx.scale(wide, high);
        blit(ctx, s as Sheet, 'idle', frameAt(s as Sheet, 'idle', sc.now + h * 37), (mirror ? 1 : -1) * (s.spec.frameW / 2 - ax), 0, mirror, 0.62 * c.a);
        ctx.restore();
      } });
    }
    out.push({ z: z + 0.21, draw: () => {
      ctx.save();
      ctx.fillStyle = '#e6ebf1';
      // One path per step of solidity (a forming or thinning edge is fainter).
      for (const [lift, ry, grow, strength] of [[16, 18, 1.15, 0.22], [44, 30, 1, 0.2], [80, 26, 0.85, 0.14]] as const) {
        const steps = new Map<number, Path2D>();
        for (const c of row) {
          const a = Math.ceil(c.a * 4) / 4;
          const h = cellHash(c.k);
          const path = steps.get(a) ?? new Path2D();
          const q = project(map, c.p);
          const x = Math.round(q.X + ((h >> (lift % 5)) % 9) - 4);
          const y = Math.round(q.Y - lift + (1 - c.a) * 18 + Math.sin(sc.now / 700 + h) * 2);
          path.moveTo(x + rx * grow, y);
          path.ellipse(x, y, rx * grow, ry, 0, 0, Math.PI * 2);
          steps.set(a, path);
        }
        for (const [a, path] of steps) {
          ctx.globalAlpha = strength * a;
          ctx.fill(path);
        }
      }
      // Blown away: streaks of wind run through it the way it goes, pale wisps torn off its edge.
      ctx.strokeStyle = '#f4f7fb';
      ctx.lineWidth = 2;
      for (const c of row) {
        if (!c.blow || c.blow.t > 0.8) continue;
        const h = cellHash(c.k);
        const q = project(map, c.p);
        const sx = c.blow.ux * map.px.perM;
        const sy = c.blow.uz * map.px.perMDepth;
        const n = Math.hypot(sx, sy) || 1;
        for (let i = 0; i < 2; i++) {
          const lift = 20 + ((h >> (i * 3)) % 40);
          const len = 16 + ((h >> (i * 2)) % 14);
          const lead = (c.blow.t * 1.6 + i * 0.3) * 30;
          const x0 = q.X + (sx / n) * lead - 6 + ((h >> i) % 12);
          const y0 = q.Y - lift + (sy / n) * lead;
          ctx.globalAlpha = 0.8 * (1 - c.blow.t / 0.8);
          ctx.beginPath();
          ctx.moveTo(Math.round(x0), Math.round(y0));
          ctx.quadraticCurveTo(Math.round(x0 + (sx / n) * len * 0.5), Math.round(y0 - 4), Math.round(x0 + (sx / n) * len), Math.round(y0 + (sy / n) * len));
          ctx.stroke();
        }
      }
      ctx.restore();
    } });
  }
  return out;
}

/**
 * Flames put out (water, wet ground): a puff of steam rises off the ninja and thins away, his small
 * camp smoke spread a little wider, with a faint white breath round it. Not in a chakra colour.
 */
export function drawDouses(ctx: CanvasRenderingContext2D, sc: Scene): void {
  if (!sc.pb.douses.length) return;
  const puff = worldSheet('camp', 'smoke');
  for (const d of sc.pb.douses) {
    const t = ((sc.now - d.t0) * sc.pb.speed) / DOUSE_MS;
    if (t < 0 || t > 1 || !sc.state.units[d.unit]) continue;
    const q = project(sc.map, sc.pb.posOf(d.unit, sc.now));
    const fade = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
    ctx.save();
    ctx.fillStyle = '#eef2f6';
    for (const [dy, rx, ry, a] of [[30, 30, 20, 0.34], [62, 24, 22, 0.28]] as const) {
      ctx.globalAlpha = a * fade;
      ctx.beginPath();
      ctx.ellipse(Math.round(q.X), Math.round(q.Y - dy - t * 36), rx + t * 16, ry + t * 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (puff) {
      const [ax] = puff.spec.anchor;
      for (const side of [-1, 0, 1] as const) {
        ctx.save();
        ctx.translate(Math.round(q.X + side * 12), Math.round(q.Y - 4 - t * 40 - (side === 0 ? 10 : 0)));
        ctx.scale(1.8, 1);
        blit(ctx, puff as Sheet, 'idle', frameAt(puff as Sheet, 'idle', (sc.now - d.t0) * sc.pb.speed + (side + 1) * 250), (side < 0 ? -1 : 1) * (puff.spec.frameW / 2 - ax), 0, side > 0, fade);
        ctx.restore();
      }
    }
    ctx.restore();
  }
}

/** The order lightning runs across a wet patch: each point from the nearest one it already reached. */
const conductPlans = new WeakMap<Fx, { pts: Pt[]; from: number[]; when: number[] }>();

function conductPlan(f: Fx): { pts: Pt[]; from: number[]; when: number[] } {
  let plan = conductPlans.get(f);
  if (plan) return plan;
  const all = (f.cells ?? []).map(keyCenter).sort((a, b) => dist(a, f.from) - dist(b, f.from));
  // A big patch: every other cell or so is enough for the arcs.
  const step = Math.max(1, Math.floor(all.length / 70));
  const pts = [{ ...f.from }, ...all.filter((_, i) => i % step === 0)];
  const from = pts.map((p, i) => {
    let best = 0;
    for (let j = 1; j < i; j++) if (dist(pts[j], p) < dist(pts[best], p)) best = j;
    return best;
  });
  const when = pts.map((p) => (dist(p, f.from) / CONDUCT_SPEED) * 1000);
  plan = { pts, from, when };
  conductPlans.set(f, plan);
  return plan;
}

/**
 * Lightning running across a wet patch (the owner: "conduce electricidad"): jagged arcs on the
 * ground run out from where it struck to every wet cell, flickering, in the caster's chakra colour,
 * and his lightning spark (hit) bursts here and there as the front gets there.
 */
function conductItems(ctx: CanvasRenderingContext2D, sc: Scene, f: Fx): DepthItem[] {
  const ms = (sc.now - f.t0) * sc.pb.speed;
  if (ms < 0 || ms > f.dur || !f.cells?.length) return [];
  const { pts, from, when } = conductPlan(f);
  const cols = tintColors('lightning', f.tint) ?? ELEMENT_COLORS.lightning;
  const alpha = Math.min(1, (f.dur - ms) / 300);
  const back = Math.min(...pts.map((p) => p.z));
  const out: DepthItem[] = [];
  out.push({ z: back - 0.05, draw: () => {
    ctx.save();
    const seed = Math.floor(sc.now / 60);
    for (const [w, c] of [[3, cols[2]], [1, cols[0]]] as const) {
      ctx.strokeStyle = c;
      ctx.lineWidth = w;
      ctx.globalAlpha = alpha * (w > 1 ? 0.7 : 1);
      ctx.beginPath();
      for (let i = 1; i < pts.length; i++) {
        if (when[i] > ms) continue;
        const a = project(sc.map, pts[from[i]]);
        const b = project(sc.map, pts[i]);
        ctx.moveTo(Math.round(a.X), Math.round(a.Y - 3));
        for (let k = 1; k <= 3; k++) {
          const j = (((seed * 7 + i * 13 + k * 5) % 9) - 4) * 1.6;
          ctx.lineTo(Math.round(a.X + ((b.X - a.X) * k) / 4 + j), Math.round(a.Y - 3 + ((b.Y - a.Y) * k) / 4 - j * 0.6));
        }
        ctx.lineTo(Math.round(b.X), Math.round(b.Y - 3));
      }
      ctx.stroke();
    }
    ctx.restore();
  } });
  const spark = sheet('lightning', 'hit', f.tint);
  if (spark) {
    const every = Math.max(1, Math.round(pts.length / 9));
    for (let i = 0; i < pts.length; i += every) {
      const late = ms - when[i];
      if (late < 0) continue;
      const p = pts[i];
      out.push({ z: p.z + 0.02, draw: () => {
        const q = project(sc.map, p);
        blit(ctx, spark, 'hit', frameAt(spark, 'hit', late), q.X, q.Y - 12, i % 2 === 1, alpha);
      } });
    }
  }
  return out;
}

/** How see-through a gale on the ground is (his wind, faint, so whoever stands in it shows). */
const GALE_ALPHA = 0.42;

/**
 * A gale turning on the ground (the Gale Curtain, the owner's answer: an area, not a wall): his wind
 * wall (the one running across the screen, low and wide) laid as a band at the back and one at the
 * front of the circle, rising when it starts and fading when it dies down, in its maker's chakra
 * colour; a faint ring on the ground shows how far it reaches. All of it lies behind whoever stands
 * in the circle or in front of it (drawn at the circle's back edge), so the ninjas in the wind show.
 */
function galeItems(ctx: CanvasRenderingContext2D, sc: Scene, z: GaleZone, fadeT0?: number): DepthItem[] {
  const s = sheet('wind', 'wall', unitTint(sc.state.units[z.owner]));
  const born = sc.pb.zoneBorn.get(z.id);
  const ms = born === undefined ? Infinity : (sc.now - born) * sc.pb.speed;
  const fading = fadeT0 === undefined ? 1 : Math.max(0, 1 - ((sc.now - fadeT0) * sc.pb.speed) / 1000);
  if (fading <= 0) return [];
  const out: DepthItem[] = [];
  const c = z.center;
  out.push({ z: c.z - z.radius - 0.03, draw: () => {
    ctx.save();
    const p = project(sc.map, c);
    ctx.beginPath();
    ctx.ellipse(p.X, p.Y, z.radius * sc.map.px.perM, z.radius * sc.map.px.perMDepth, 0, 0, Math.PI * 2);
    ctx.setLineDash([5, 6]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = `rgba(167, 243, 208, ${0.4 * fading})`;
    ctx.stroke();
    ctx.restore();
  } });
  if (!s) return out;
  const rise = s.spec.anims.rise ? animMs(s, 'rise') : 0;
  // Bands about as wide as the circle: one more across for a bigger gale.
  const across = Math.max(1, Math.round((2 * z.radius) / 4.4));
  const span = 2 * z.radius;
  for (const dz of [-0.45, 0.45])
    for (let i = 0; i < across; i++) {
      const p = { x: c.x - span / 2 + (span * (i + 0.5)) / across + dz * 0.6, z: c.z + dz * z.radius };
      out.push({ z: c.z - z.radius - 0.02, draw: () => {
        const q = project(sc.map, p);
        if (ms < rise) blit(ctx, s, 'rise', frameAt(s, 'rise', ms), q.X, q.Y, dz > 0, GALE_ALPHA * fading);
        else blit(ctx, s, 'idle', frameAt(s, 'idle', (Number.isFinite(ms) ? ms - rise : sc.now) + i * 170 + (dz > 0 ? 330 : 0)), q.X, q.Y, dz > 0, GALE_ALPHA * fading);
      } });
    }
  return out;
}

/**
 * Everything of the gaps' jutsu that stands among the units (renderer.ts sorts it in by depth): the
 * waves and towers playing, lightning running across wet ground, the steam, and the gales on the ground (a gale whose start is still to play is not
 * there yet; one gone from the state whose end is still to play, or that is fading, still turns).
 */
export function depthFx(ctx: CanvasRenderingContext2D, sc: Scene): DepthItem[] {
  const out: DepthItem[] = [];
  for (const f of sc.pb.fx) {
    if (f.kind === 'wave') out.push(...waveItems(ctx, sc, f));
    else if (f.kind === 'tower') out.push(...towerItems(ctx, sc, f));
    else if (f.kind === 'conduct') out.push(...conductItems(ctx, sc, f));
  }
  out.push(...steamItems(ctx, sc));
  const pending = (id: string) => sc.pb.queue.some((e) => e.t === 'zone' && e.on && e.zone.id === id);
  for (const z of [...(sc.state.zones ?? []), ...sc.pb.goneZones()]) if (!pending(z.id)) out.push(...galeItems(ctx, sc, z));
  for (const g of sc.pb.zoneGone) out.push(...galeItems(ctx, sc, g.zone, g.t0));
  return out;
}
