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
import type { Fx, VolleyPath } from './playback';
import type { Scene } from './renderer';
import { auraDx, fxPos, project } from './renderer';
import { WAIT, hurryVfxSheets, tintedSheet } from './vfxTintCache';
import type { TintedSheet } from './vfxTintCache';
import { unitTint, wallElement } from './vfxTintPlan';

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
      return named('wall_depth', 'wall', 'breath');
    case 'tower':
      return named('wall_depth', 'multi');
    case 'swirl':
      return named('bolt');
    default:
      return [];
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
/** How long the wave stays at the end of its run, fading, while the last ones it reached are swept (ms). */
export const WAVE_HOLD = 700;
/** Metres between the rows of columns behind the crest, and how see-through each row is. */
const WAVE_ROW = 1.1;
const WAVE_ALPHA = [1, 0.55, 0.3, 0.18];

/** The Whirlwind Tower's column: its rise (his rise row, 12 frames at 12 fps), its spin and its fade (ms). */
export const TOWER_RISE = 1000;
const TOWER_SPIN = 900;
const TOWER_FADE = 400;
export const TOWER_MS = TOWER_RISE + TOWER_SPIN + TOWER_FADE;

/**
 * Draws one column of a wall_depth sheet standing on a ground point (the sheet is a wall running
 * into the depth, anchored at its middle: here its foot is put on the point and its middle over it).
 */
function blitColumn(ctx: CanvasRenderingContext2D, s: Sheet, anim: string, frame: number, p: { X: number; Y: number }, alpha: number): void {
  const [ax, ay] = s.spec.anchor;
  blit(ctx, s, anim, frame, p.X - (s.spec.frameW / 2 - ax), p.Y - (s.spec.frameH - 2 - ay), false, alpha);
}

/**
 * The Devouring Tide's wave (the owner's option A): a row of his water columns (wall_depth, his
 * wall seen from the front) across the cone at its crest, running out along it and spreading as the
 * cone opens, with fainter rows behind and his spray (breath) before it. Pointed mostly into the
 * depth, the wave is seen from the side: his water wall (wall) along the crest instead.
 */
function waveItems(ctx: CanvasRenderingContext2D, sc: Scene, f: Fx): DepthItem[] {
  const ms = (sc.now - f.t0) * sc.pb.speed;
  // Its run, then it holds at the end of the cone and fades (WAVE_HOLD).
  const runMs = Math.max(1, f.dur - WAVE_HOLD);
  const t = Math.min(1, ms / runMs);
  if (ms < 0 || ms > f.dur || !f.area || f.area.kind !== 'cone') return [];
  const cone = f.area;
  const rad = (cone.dir * Math.PI) / 180;
  const ux = Math.cos(rad);
  const uz = Math.sin(rad);
  const half = (cone.angle * Math.PI) / 360;
  const side = Math.abs(uz) > Math.abs(ux) * 1.2;
  const col = sheet(f.element, side ? 'wall' : 'wall_depth', f.tint);
  if (!col) return [];
  const crest = WAVE_START + (cone.length - WAVE_START) * t;
  const fade = ms > runMs ? Math.max(0, (f.dur - ms) / WAVE_HOLD) : 1;
  const out: DepthItem[] = [];
  const at = (d: number, off: number): Pt => ({ x: cone.origin.x + ux * d - uz * off, z: cone.origin.z + uz * d + ux * off });
  // Each column comes up out of the water fast as the wave sets off (his rise, at three times its pace).
  const rising = col.spec.anims.rise ? Math.min(11, Math.floor((ms * 3 * 12) / 1000)) : 11;
  for (let k = 0; k < (f.rows ?? 3); k++) {
    const d = crest - k * WAVE_ROW;
    if (d < WAVE_START) break;
    const alpha = (WAVE_ALPHA[k] ?? 0.15) * fade;
    const w = d * Math.tan(half);
    // Columns about a metre apart across the cone (his column is 1.2 m wide); seen from the side,
    // walls of 4.6 m laid along the crest.
    const n = side ? Math.max(1, Math.ceil((2 * w) / 4.6)) : Math.max(2, Math.round((2 * w) / 1.0) + 1);
    for (let i = 0; i < n; i++) {
      const off = side ? -w + (2 * w * (i + 0.5)) / n : -w + (2 * w * i) / (n - 1);
      const p = at(d, off);
      const anim = rising < 11 ? 'rise' : 'idle';
      const frame = rising < 11 ? rising : frameAt(col, 'idle', ms + i * 97 + k * 53);
      out.push({ z: p.z, draw: () => (side ? blit(ctx, col, anim, frame, project(sc.map, p).X, project(sc.map, p).Y, false, alpha) : blitColumn(ctx, col, anim, frame, project(sc.map, p), alpha)) });
    }
  }
  // His spray before the crest (the cone runs across the screen).
  const foam = side ? undefined : sheet(f.element, 'breath', f.tint);
  if (foam) {
    const d = crest + 0.7;
    const w = Math.min(d, cone.length) * Math.tan(half);
    const mirror = ux < 0;
    for (const off of [-w * 0.6, 0, w * 0.6]) {
      if (d > cone.length + 0.5) break;
      const p = at(d, off);
      out.push({ z: p.z + 0.01, draw: () => {
        const q = project(sc.map, p);
        blit(ctx, foam, 'fly', frameAt(foam, 'fly', ms + off * 40), q.X, q.Y - 40, mirror, 0.85 * fade);
      } });
    }
  }
  return out;
}

/**
 * The Whirlwind Tower (the owner's option A): his tornado column (wind wall_depth, his wind wall seen
 * from the front) rises at the point, turns with his small whirlwinds (multi) circling it, two
 * behind and two in front of whoever stands there, and fades.
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
  out.push({ z: c.z, draw: () => {
    const p = project(sc.map, c);
    if (ms < TOWER_RISE) blitColumn(ctx, col, 'rise', frameAt(col, 'rise', ms), p, alpha);
    else blitColumn(ctx, col, 'idle', frameAt(col, 'idle', ms - TOWER_RISE), p, alpha);
  } });
  const mini = sheet(f.element, 'multi', f.tint);
  const spin = ms - TOWER_RISE * 0.7;
  if (mini && spin > 0) {
    const n = f.minis ?? 4;
    const fadeIn = Math.min(1, spin / 250);
    for (let i = 0; i < n; i++) {
      const a = (i * 2 * Math.PI) / n + (spin / 1000) * 2.6;
      const p = { x: c.x + Math.cos(a) * r * 0.75, z: c.z + Math.sin(a) * r * 0.75 };
      // Going round: the ones in front run one way, the ones behind the other.
      out.push({ z: p.z, draw: () => {
        const q = project(sc.map, p);
        blit(ctx, mini, 'fly', frameAt(mini, 'fly', ms + i * 120), q.X, q.Y - 36, Math.sin(a) > 0, alpha * fadeIn);
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
 * waves and towers playing, and the gales on the ground (a gale whose start is still to play is not
 * there yet; one gone from the state whose end is still to play, or that is fading, still turns).
 */
export function depthFx(ctx: CanvasRenderingContext2D, sc: Scene): DepthItem[] {
  const out: DepthItem[] = [];
  for (const f of sc.pb.fx) {
    if (f.kind === 'wave') out.push(...waveItems(ctx, sc, f));
    else if (f.kind === 'tower') out.push(...towerItems(ctx, sc, f));
  }
  const pending = (id: string) => sc.pb.queue.some((e) => e.t === 'zone' && e.on && e.zone.id === id);
  for (const z of [...(sc.state.zones ?? []), ...sc.pb.goneZones()]) if (!pending(z.id)) out.push(...galeItems(ctx, sc, z));
  for (const g of sc.pb.zoneGone) out.push(...galeItems(ctx, sc, g.zone, g.t0));
  return out;
}
