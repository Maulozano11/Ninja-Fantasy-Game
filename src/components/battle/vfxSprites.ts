// Jutsu effects drawn from the approved VFX sheets (groups vfx_<element>): projectiles, beasts,
// streams, breaths, blasts, hits, walls and auras, plus signature effects of single jutsu (the
// Great Fireball, the Great Fire Annihilation) with their enhanced versions. When an element's
// sheets aren't in the game yet, the renderer falls back to its drawn effects.

import type { Wall } from '../../battle/types';
import { worldSprite } from '../world/WorldSpriteView';
import type { Fx } from './playback';
import type { Scene } from './renderer';
import { auraDx, project } from './renderer';

type Sheet = NonNullable<ReturnType<typeof worldSprite>>;

const ready = (s: Sheet) => s.img.complete && s.img.naturalWidth > 0;

function sheet(element: string, name: string): Sheet | undefined {
  const s = worldSprite(`vfx_${element}`, name);
  return s && ready(s) ? s : undefined;
}

/** Draws one frame of a sheet's animation with its anchor at (x, y); mirrored to face left. */
function blit(ctx: CanvasRenderingContext2D, s: Sheet, anim: string, frame: number, x: number, y: number, mirror: boolean, alpha = 1): void {
  const a = s.spec.anims[anim] ?? Object.values(s.spec.anims)[0];
  if (!a) return;
  const f = Math.max(0, Math.min(a.frames - 1, frame));
  const [ax, ay] = s.spec.anchor;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (mirror) {
    ctx.translate(Math.round(x), 0);
    ctx.scale(-1, 1);
    ctx.drawImage(s.img, f * s.spec.frameW, a.row * s.spec.frameH, s.spec.frameW, s.spec.frameH, -ax, Math.round(y - ay), s.spec.frameW, s.spec.frameH);
  } else {
    ctx.drawImage(s.img, f * s.spec.frameW, a.row * s.spec.frameH, s.spec.frameW, s.spec.frameH, Math.round(x - ax), Math.round(y - ay), s.spec.frameW, s.spec.frameH);
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
  const s = sheet(f.element, 'aura_back');
  if (!s) return;
  const ms = (sc.now - f.t0) * sc.pb.speed;
  const t = ms / f.dur;
  if (t < 0 || t > 1) return;
  const p = project(sc.map, f.from);
  blit(ctx, s, 'idle', frameAt(s, 'idle', ms), p.X + auraDx(sc, f.unit), p.Y, false, t > 0.7 ? (1 - t) / 0.3 : 1);
}

/** Draws an effect from its sheets. Returns false when the sheets aren't available. */
export function drawVfxSprite(ctx: CanvasRenderingContext2D, sc: Scene, f: Fx): boolean {
  const el = f.element;
  const ms = (sc.now - f.t0) * sc.pb.speed;
  const t = ms / f.dur;
  if (t < 0 || t > 1) return true;
  const left = f.to.x < f.from.x - 0.01;
  const sig = f.sig && f.sig !== 'eyes' && f.sig !== 'tag' && f.sig !== 'log' ? sigSheetName(el, f.sig, !!f.enhanced) : undefined;
  switch (f.kind) {
    case 'projectile': {
      // Summoned beasts come from their own sheet (vfx_beasts/<element>) when it's in the game.
      const beast = f.role === 'beast' && !sig ? worldSprite('vfx_beasts', el) : undefined;
      const s = (beast && ready(beast) ? beast : undefined) ?? sheet(el, sig ?? f.role ?? 'bolt') ?? sheet(el, 'bolt');
      if (!s) return false;
      const p = flight(sc, f, t);
      blit(ctx, s, 'fly', frameAt(s, 'fly', ms), p.x, p.y, left);
      return true;
    }
    case 'area': {
      // A signature without its own sheet in the game yet plays the element's blast.
      const sigSheet = sig ? sheet(el, sig) : undefined;
      const s = sigSheet ?? sheet(el, 'blast');
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
      const dir = f.area && f.area.kind === 'cone' ? f.area.dir : 0;
      const mirror = Math.cos((dir * Math.PI) / 180) < 0;
      if (sig) {
        const s = sheet(el, sig);
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
      const s = sheet(el, 'breath');
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
      const tile = sheet(el, 'stream');
      const head = sheet(el, 'stream_head');
      if (!tile || !head) return false;
      const a = project(sc.map, f.from);
      const b = project(sc.map, f.to);
      const reach = Math.min(1, t * 1.8);
      const dx = (b.X - a.X) * reach;
      const dy = (b.Y - a.Y) * reach;
      const lift = f.lift?.[1] ?? 50;
      const n = Math.max(1, Math.floor(Math.hypot(dx, dy) / tile.spec.frameW));
      const alpha = t > 0.8 ? (1 - t) / 0.2 : 1;
      for (let i = 0; i < n; i++) blit(ctx, tile, 'fly', frameAt(tile, 'fly', ms + i * 40), a.X + (dx * i) / n, a.Y - lift + (dy * i) / n, left, alpha);
      blit(ctx, head, 'fly', frameAt(head, 'fly', ms), a.X + dx, a.Y - lift + dy, left, alpha);
      return true;
    }
    case 'burst': {
      // Rock bullets and the like can have their own impact, which sprays away from the caster.
      const own = f.role === 'multi' ? sheet(el, 'multi_hit') : undefined;
      const s = own ?? sheet(el, 'hit');
      if (!s) return false;
      const p = project(sc.map, f.to);
      const anim = Object.keys(s.spec.anims)[0];
      blit(ctx, s, anim, frameAt(s, anim, ms), p.X, p.Y - (f.lift?.[1] ?? 50), !!own && left);
      return true;
    }
    case 'aura': {
      if (f.sig === 'eyes') return false;
      const s = sheet(el, 'aura');
      if (!s) return false;
      const p = project(sc.map, f.from);
      blit(ctx, s, 'idle', frameAt(s, 'idle', ms), p.X + auraDx(sc, f.unit), p.Y, false, t > 0.7 ? (1 - t) / 0.3 : 1);
      return true;
    }
    case 'wall':
      // With the element's wall sheet in the game, the standing wall plays its own rise.
      return !!sheet(el, 'wall');
    default:
      return false;
  }
}

/**
 * A standing jutsu wall from its element's sheets, turned to match the ground: `wall` runs across
 * the screen, `wall_diag` at 45° (mirrored for the other diagonal) and `wall_depth` straight into
 * the depth. It rises when raised, then idles. Returns false when the sheets aren't in the game.
 */
export function drawWallSprite(ctx: CanvasRenderingContext2D, sc: Scene, w: Wall): boolean {
  const el = w.kind;
  const angle = (Math.atan2(Math.abs(w.b.z - w.a.z), Math.abs(w.b.x - w.a.x)) * 180) / Math.PI;
  const name = angle < 22.5 ? 'wall' : angle > 67.5 ? 'wall_depth' : 'wall_diag';
  // Without the turned sheet, the drawn wall (which follows any angle) stands in.
  const s = sheet(el, name);
  if (!s) return false;
  // The diagonal sheet runs from a near-left end to a far-right end ("/"); mirror it for "\".
  const [left, right] = w.a.x <= w.b.x ? [w.a, w.b] : [w.b, w.a];
  const mirror = name === 'wall_diag' && left.z < right.z;
  const p = project(sc.map, { x: (w.a.x + w.b.x) / 2, z: (w.a.z + w.b.z) / 2 });
  const born = sc.pb.wallBorn.get(w.id);
  const ms = born === undefined ? Infinity : (sc.now - born) * sc.pb.speed;
  const rise = s.spec.anims.rise ? animMs(s, 'rise') : 0;
  if (ms < rise) blit(ctx, s, 'rise', frameAt(s, 'rise', ms), p.X, p.Y, mirror);
  else blit(ctx, s, 'idle', frameAt(s, 'idle', Number.isFinite(ms) ? ms - rise : sc.now), p.X, p.Y, mirror);
  return true;
}

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
