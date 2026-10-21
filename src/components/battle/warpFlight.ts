// A Ryusei's Warp Strike: the weapon it throws, flying from its hand to where it lands with a trail
// of glittering sparkles, and caught there by the hand of the thrust (playback.ts UnitView.warp;
// renderer.ts draws the ninja). The weapon is the item's own art turned with RotSprite, one canvas
// per whole angle (unitArt.thrownFrame), never a canvas rotation, so it stays crisp.
// Everything is in map pixels; the canvas is scaled by a whole number, so pixels stay pixels.

import { heldAt, throwRelease } from '../../sprite/grip';
import type { BodyType, SpriteAppearance } from '../../sprite/types';
import { PHASE_RAMP } from '../../sprite/phase';
import { releaseStart, thrownItem } from '../../sprite/thrown';
import { FEET } from '../../sprite/rig';
import type { WarpTimes } from './playback';
import { warpFlight } from './playback';
import { hasThrownFrame, thrownFrame } from './unitArt';
import type { ThrownCanvas } from './unitArt';

export interface XY {
  x: number;
  y: number;
}

/** Where a figure's frame pixel lands on the map: its feet drawn at (X, Y) like drawUnit, facing `facing`. */
function framePixel(X: number, Y: number, p: XY, facing: 1 | -1): XY {
  const x0 = Math.round(X);
  const y0 = Math.round(Y - FEET.y);
  const px = Math.floor(p.x);
  return { x: facing > 0 ? x0 - FEET.x + px : x0 + FEET.x - px - 1, y: y0 + Math.floor(p.y) };
}

/** A heading (degrees, 0 = right, + = down) for a figure facing `facing` whose frame draws it at `deg` facing right. */
const headingOf = (deg: number, facing: 1 | -1): number => (facing > 0 ? deg : 180 - deg);
const dirOf = (deg: number): XY => ({ x: Math.cos((deg * Math.PI) / 180), y: Math.sin((deg * Math.PI) / 180) });
/** The same angle in (-180, 180]. */
const wrap = (deg: number): number => {
  const a = ((((deg + 180) % 360) + 360) % 360) - 180;
  return a === -180 ? 180 : a;
};

export interface Flight {
  /**
   * The weapon's anchor pixel where it is first drawn in flight (as the thrower turns to light in the
   * release pose: already clear of it, ahead of the fist that flung it), and where the hand of the
   * thrust catches it.
   */
  S: XY;
  E: XY;
  /** The curve's inner control points (a cubic Bézier S, P1, P2, E). */
  P1: XY;
  P2: XY;
  /** Its heading as it leaves the hand, and in the catching hand (degrees). */
  h0: number;
  hCatch: number;
  /** The angles the weapon is drawn at, facing right (whole degrees), for each: the ones to have made beforehand. */
  angles: number[];
  /** A short throw: the weapon hangs in the air where it was first drawn and drifts into the hand (see HANG_AHEAD). */
  hang: boolean;
  /**
   * Caught for a thrust the way it was thrown (the foe ahead, or none): that way (0 or 180 degrees),
   * which its point keeps to. A curve that swings back toward the thrower (a warp toward or away
   * from the camera starts its weapon ahead of the catch) carries it point first that way all the
   * same, not turned round to fly point last and turn again in the hand.
   */
  fore?: number;
}

/**
 * A throw whose catch is less than HANG_AHEAD pixels ahead of where the weapon is first drawn (and
 * less than HANG_SIDE off its line) is too short to fly out and back: a warp of a metre or so lands
 * the catching hand under the place the release pose leans its head into, so the weapon, first drawn
 * clear of that head, is already there or past it. Flown, it would go on and come back point last,
 * flipping in the hand; instead it hangs in the air point first, drifting into the hand as the ninja
 * warps to it.
 */
const HANG_AHEAD = 32;
const HANG_SIDE = 40;

/**
 * The flight of a Warp Strike's weapon. `clear`: how far ahead of the fist it is first drawn
 * (sprite/thrown.ts releaseClear: the release pose pitches the head into the place the fist let go
 * of it). `from` and `to`: the map pixels of the ninja's feet where it throws and where it lands;
 * `face` the way it throws, `land` the way it faces when it lands. `foe`: the map pixels of the feet
 * of the foe it lands beside. The weapon leaves level from the throw and arrives, dipping a little,
 * in the hand of the thrust's chamber ('pierce' 1); when the foe is ahead of it, it comes in point
 * first at the foe. A foe behind the landing (the ninja turns round to strike) is not flown round:
 * the weapon arrives the way it was going and turns in the hand.
 */
export function warpFlightOf(look: SpriteAppearance, clear: number, from: XY, to: XY, face: 1 | -1, land: 1 | -1, foe?: XY): Flight {
  const body: BodyType = look.body;
  const item = thrownItem(look);
  const rel = throwRelease(body, item);
  // Caught by the hand that threw it: the thrown item is the one in the hand of the thrust.
  const hold = heldAt(body, 'pierce', 1, item);
  const S = framePixel(from.x, from.y, releaseStart(rel.lastHeld, rel.weaponAngle, clear), face);
  const E = framePixel(to.x, to.y, hold.at, land);
  const h0 = headingOf(rel.weaponAngle, face);
  const hCatch = headingOf(hold.angle, land);
  const span = Math.hypot(E.x - S.x, E.y - S.y);
  // The way it is going as it arrives: straight from the hand to the catch, levelled off a little.
  const level = E.x >= S.x ? 0 : 180;
  const way = (Math.atan2(E.y - S.y, E.x - S.x) * 180) / Math.PI;
  let hEnd = level + Math.max(-25, Math.min(25, wrap(way - level))) * 0.6 + (level === 0 ? 4 : -4);
  if (foe && land === face) {
    // Coming in at the foe's chest, but no steeper than 20 degrees off level.
    const aim = (Math.atan2(foe.y - 46 - E.y, foe.x - E.x) * 180) / Math.PI;
    const lv = land > 0 ? 0 : 180;
    hEnd = lv + Math.max(-20, Math.min(20, wrap(aim - lv)));
  }
  const L = Math.max(16, Math.min(200, span * 0.36));
  const d0 = dirOf(h0);
  const d1 = dirOf(hEnd);
  // It leaves level (as it left the hand) and drops into the catch from a little above.
  const lift = Math.min(24, span * 0.06);
  const ahead = (E.x - S.x) * d0.x + (E.y - S.y) * d0.y;
  const hang = ahead < HANG_AHEAD && Math.abs((E.y - S.y) * d0.x - (E.x - S.x) * d0.y) < HANG_SIDE;
  const f: Flight = hang
    ? // Hanging, it rises a few pixels and settles into the hand.
      { S, E, P1: { x: S.x, y: S.y - 6 }, P2: { x: E.x, y: E.y - 6 }, h0, hCatch, angles: [], hang }
    : { S, E, P1: { x: S.x + d0.x * L, y: S.y + d0.y * L }, P2: { x: E.x - d1.x * L, y: E.y - d1.y * L - lift }, h0, hCatch, angles: [], hang };
  if (land === face) f.fore = face > 0 ? 0 : 180;
  const set = new Set<number>();
  for (let i = 0; i <= 96; i++) set.add(canvasAngle(f, headingAlong(f, i / 96)).angle);
  // Settling into the hand from the way it came in.
  const hIn = headingAlong(f, 1);
  for (let i = 0; i <= 8; i++) set.add(canvasAngle(f, hIn + (wrap(hCatch - hIn) * i) / 8).angle);
  f.angles = [...set];
  return f;
}

function bezier(f: Flight, t: number): XY {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * f.S.x + b * f.P1.x + c * f.P2.x + d * f.E.x, y: a * f.S.y + b * f.P1.y + c * f.P2.y + d * f.E.y };
}

/** The curve's tangent at t (pixels per unit of t). */
function tangent(f: Flight, t: number): XY {
  const u = 1 - t;
  return {
    x: 3 * u * u * (f.P1.x - f.S.x) + 6 * u * t * (f.P2.x - f.P1.x) + 3 * t * t * (f.E.x - f.P2.x),
    y: 3 * u * u * (f.P1.y - f.S.y) + 6 * u * t * (f.P2.y - f.P1.y) + 3 * t * t * (f.E.y - f.P2.y),
  };
}

/** The curve's heading at t (degrees): the way the point faces, point first (hanging, it turns from the throw's to the catch's). */
function headingAlong(f: Flight, t: number): number {
  if (f.hang) return f.h0 + wrap(f.hCatch - f.h0) * t * t * (3 - 2 * t);
  const d = tangent(f, t);
  const h = Math.hypot(d.x, d.y) < 1e-6 ? f.h0 : (Math.atan2(d.y, d.x) * 180) / Math.PI;
  // Going back toward the thrower, it keeps its point forward (Flight.fore): mirrored, as level as it is steep.
  return f.fore !== undefined && Math.abs(wrap(h - f.fore)) > 90 ? wrap(180 - h) : h;
}

/**
 * The canvas a heading is drawn with: the weapon facing right at `angle` (steps of 2 degrees, and
 * exactly the angles of the throw and the catch, so it leaves and meets the hand pixel for pixel),
 * mirrored for headings to the left.
 */
function canvasAngle(f: Flight, heading: number): { angle: number; mirror: boolean } {
  const h = wrap(heading);
  const mirror = Math.abs(h) > 90;
  const a = mirror ? wrap(180 - h) : h;
  for (const exact of [f.h0, f.hCatch]) {
    const e = Math.abs(wrap(exact)) > 90 ? wrap(180 - exact) : wrap(exact);
    if (Math.abs(a - e) <= 1.01) return { angle: Math.round(e), mirror };
  }
  return { angle: Math.round(a / 2) * 2, mirror };
}

export interface FlightNow {
  /** The anchor pixel. */
  at: XY;
  heading: number;
  /** 0..1: the weapon fades as the solid hand takes it over. */
  alpha: number;
}

/** Where the weapon is `ms` into the Warp Strike (null before it is thrown and once it is back in the hand). */
export function flightNow(f: Flight, t: WarpTimes, ms: number): FlightNow | null {
  if (ms < t.rel || ms >= t.solid) return null;
  if (ms <= t.caught) {
    const w = warpFlight(ms, t);
    return { at: bezier(f, w), heading: headingAlong(f, w), alpha: 1 };
  }
  // Arrived: it turns into the hand's angle while the light body lands, then fades as the solid hand takes it.
  const hIn = headingAlong(f, 1);
  const k = Math.min(1, (ms - t.caught) / Math.max(1, t.land - t.caught));
  const heading = hIn + wrap(f.hCatch - hIn) * k;
  const alpha = ms < t.land ? 1 : 1 - (ms - t.land) / (t.solid - t.land);
  return { at: f.E, heading, alpha };
}

/**
 * The weapon's canvas for a heading: made beforehand (the screen makes a flight's angles while the
 * ninja winds up, renderer.ts warmPhases); if one is still missing, the nearest made angle stands in
 * for that screen frame rather than stopping the flight to make it.
 */
function canvasFor(look: SpriteAppearance, angle: number): ThrownCanvas {
  if (hasThrownFrame(look, angle)) return thrownFrame(look, angle);
  for (const d of [1, -1, 2, -2, 3, -3, 4, -4]) if (hasThrownFrame(look, angle + d)) return thrownFrame(look, angle + d);
  return thrownFrame(look, angle);
}

/** How far the weapon reaches behind its grip and ahead of it as it flies (its art at the angle it is flung at). */
export function reachOf(look: SpriteAppearance, f: Flight): WeaponReach {
  const c = canvasFor(look, canvasAngle(f, f.h0).angle);
  return { back: c.back, front: c.front };
}

/** How strongly the flying weapon's blue light is added round it. */
const GLOW = 0.75;

/**
 * Draws the weapon itself at a moment of its flight, wrapped in the phase's blue light (its glow
 * added as light under it), as the light body is.
 */
export function drawThrown(ctx: CanvasRenderingContext2D, look: SpriteAppearance, f: Flight, now: FlightNow, alpha: number): void {
  if (now.alpha <= 0.01) return;
  const { angle, mirror } = canvasAngle(f, now.heading);
  const c = canvasFor(look, angle);
  const X = Math.round(now.at.x);
  const Y = Math.round(now.at.y);
  ctx.save();
  if (mirror) {
    ctx.translate(X + 1, 0);
    ctx.scale(-1, 1);
  } else ctx.translate(X, 0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, alpha * now.alpha * GLOW);
  ctx.drawImage(c.glow, -c.gx, Y - c.gy);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = Math.min(1, alpha * now.alpha);
  ctx.drawImage(c.canvas, -c.gx, Y - c.gy);
  ctx.restore();
}

/**
 * A kunai from the pouch is not kept after the thrust (the ninja had no weapon in the hand to throw):
 * in the recoil ('pierce' 4, `k` 0..1 through it) it turns to blue light in the hand and is gone,
 * shedding a few specks (renderer.ts drawWarp fades it out of the hand under this light). (X, Y):
 * the feet, facing `facing`.
 */
export function drawKunaiFade(ctx: CanvasRenderingContext2D, look: SpriteAppearance, X: number, Y: number, facing: 1 | -1, k: number, alpha: number): void {
  const hold = heldAt(look.body, 'pierce', KUNAI_FADE_FRAME, 'held_kunai');
  const at = framePixel(X, Y, hold.at, facing);
  const c = canvasFor(look, Math.round(hold.angle));
  const glow = Math.sin(Math.PI * Math.min(1, k * 1.25));
  ctx.save();
  if (glow > 0.01) {
    ctx.save();
    if (facing < 0) {
      ctx.translate(at.x + 1, 0);
      ctx.scale(-1, 1);
    } else ctx.translate(at.x, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha * glow);
    ctx.drawImage(c.glow, -c.gx, at.y - c.gy);
    ctx.restore();
  }
  // The specks it breaks into, rising off its blade.
  const d = dirOf(headingOf(hold.angle, facing));
  for (let i = 0; i < 8; i++) {
    const along = c.front * (0.1 + 0.85 * hash(i, 21));
    const rise = 3 + 14 * k * (0.5 + hash(i, 22));
    const x = at.x + d.x * along + (hash(i, 23) - 0.5) * 4;
    const y = at.y + d.y * along - rise;
    dot(ctx, x, y, alpha * Math.min(1, 2.5 * k) * (1 - k) * (i % 2 ? 1 : 0.6), k < 0.5 ? 8 : 6, i % 3 ? 1 : 2);
  }
  ctx.restore();
}

/** The 'pierce' frame a kunai from the pouch fades in (the recoil). */
export const KUNAI_FADE_FRAME = 4;

/** The angle a kunai from the pouch is held at as it fades (a figure facing right): the thrown kunai at that angle to have made beforehand. */
export const kunaiFadeAngle = (look: SpriteAppearance): number => Math.round(heldAt(look.body, 'pierce', KUNAI_FADE_FRAME, 'held_kunai').angle);

// --- the trail -----------------------------------------------------------------------------

const RAMP = PHASE_RAMP.map((c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`);
/** A steady pseudo-random 0..1 for particle `i`, value `k` (the trail looks the same every time it plays). */
const hash = (i: number, k: number): number => {
  let h = (i * 374761393 + k * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Sparkles a flight sheds per ms of it, and how long the last of them lasts after the weapon stops. */
const SHED = 0.5;
export const TRAIL_AFTER = 520;
/** How long the comet streak behind the weapon takes to catch up with it once it stops. */
const STREAK_OUT = 90;

/** How far the weapon's art reaches behind its grip and ahead of it, along its heading (pixels). */
export interface WeaponReach {
  back: number;
  front: number;
}

/** How far ahead of where the weapon's back end was as it left (pixels) its trail fades in. */
const AIR = 8;

/**
 * How much of the trail's light shows at a pixel (0..1): none behind where the weapon's back end
 * was when it was first drawn in flight (the thrower's head is there, in the release pose), fading
 * in over AIR pixels ahead of it, so the trail never seems to come out of the face. Away from the
 * thrower (a flight curving back past that line) it all shows.
 */
function releaseOff(f: Flight, back: number): (x: number, y: number) => number {
  const d = dirOf(f.h0);
  const cx = f.S.x - d.x * back;
  const cy = f.S.y - d.y * back;
  return (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const far = Math.min(1, Math.max(0, (Math.hypot(dx, dy) - 32) / 16));
    return Math.max(far, Math.min(1, Math.max(0, (dx * d.x + dy * d.y) / AIR)));
  };
}

/** One pixel of light. */
function dot(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, step: number, s = 1): void {
  if (a <= 0.01) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.fillStyle = RAMP[step];
  ctx.fillRect(Math.round(x), Math.round(y), s, s);
}

/**
 * A four-pointed glint: a white heart with arms of light `r` pixels long each way, fading toward
 * their tips (the sparkle of a blade catching the light).
 */
function glint(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number): void {
  if (a <= 0.01 || r < 0) return;
  const X = Math.round(x);
  const Y = Math.round(y);
  for (let k = r; k >= 1; k--) {
    const t = k / (r + 1);
    const step = t < 0.34 ? 7 : t < 0.67 ? 6 : 5;
    const ak = a * (1 - t * 0.75);
    dot(ctx, X - k, Y, ak, step);
    dot(ctx, X + k, Y, ak, step);
    dot(ctx, X, Y - k, ak, step);
    dot(ctx, X, Y + k, ak, step);
  }
  dot(ctx, X, Y, a, 8);
}

/**
 * The trail behind the flying weapon, `ms` into the Warp Strike: a comet streak of light on the way
 * the weapon's back end just went (five pixels wide at the weapon, white at its heart, thinning to
 * one and fading through the phase's blues; long enough to bridge the weapon's jump between screen
 * frames), the glittering sparkles it sheds as it goes (1 and 2 px specks and four-pointed glints,
 * white when new and fading through the blues, twinkling as they drift back and settle), a glint at
 * its point as it is flung and one where it stops. The streak and the sparkles leave the thrower's
 * face alone (releaseOff).
 */
export function drawTrail(ctx: CanvasRenderingContext2D, f: Flight, t: WarpTimes, ms: number, alpha: number, reach: WeaponReach): void {
  if (ms < t.rel || ms > t.caught + TRAIL_AFTER) return;
  const fly = t.caught - t.rel;
  const back = reach.back;
  const off = releaseOff(f, back);
  ctx.save();

  // The comet streak: walked back along the curve from the weapon's back end, a pixel at a time
  // (none for a weapon that hangs in the air: it is not going anywhere).
  if (!f.hang && ms < t.caught + STREAK_OUT) {
    const head = Math.min(ms, t.caught);
    const wh = warpFlight(head, t);
    // As long as the way the weapon went in the last 45 ms (so the streak bridges a frame's jump),
    // 14 to 56 pixels; it shrinks into the weapon once it stops.
    const p0 = bezier(f, wh);
    const p1 = bezier(f, warpFlight(Math.max(t.rel, head - 45), t));
    const out = ms <= t.caught ? 1 : 1 - (ms - t.caught) / STREAK_OUT;
    const len = Math.max(14, Math.min(56, Math.hypot(p0.x - p1.x, p0.y - p1.y))) * out;
    let s = 0;
    let w = wh;
    let last = '';
    while (s <= len && w >= 0) {
      const p = bezier(f, w);
      const tg = tangent(f, w);
      const m = Math.max(1e-3, Math.hypot(tg.x, tg.y));
      // Behind the weapon's back end as it is drawn (its point kept forward: Flight.fore).
      const d = dirOf(headingAlong(f, w));
      const x = p.x - d.x * back;
      const y = p.y - d.y * back;
      const key = `${Math.round(x)},${Math.round(y)}`;
      if (key !== last) {
        last = key;
        const along = s / Math.max(1, len);
        const a = alpha * (1 - along) ** 1.1 * off(x, y);
        // The sides first, the heart over them: five pixels wide just behind the weapon, then three.
        if (along < 0.2) {
          dot(ctx, x - 2 * d.y, y + 2 * d.x, a * 0.35, 5);
          dot(ctx, x + 2 * d.y, y - 2 * d.x, a * 0.35, 5);
        }
        if (along < 0.6) {
          const side = along < 0.25 ? 7 : along < 0.45 ? 6 : 5;
          dot(ctx, x - d.y, y + d.x, a * 0.8, side);
          dot(ctx, x + d.y, y - d.x, a * 0.8, side);
        }
        dot(ctx, x, y, a, along < 0.22 ? 8 : along < 0.5 ? 7 : along < 0.8 ? 6 : 5);
      }
      // About half a pixel further back each step.
      w -= 0.5 / m;
      s += 0.5;
    }
  }

  // The sparkles, each shed at its moment of the flight from about the weapon's back end.
  const n = Math.max(24, Math.round(fly * SHED));
  for (let i = 0; i < n; i++) {
    const born = t.rel + (fly * (i + hash(i, 1))) / n;
    const life = 230 + 280 * hash(i, 2);
    const el = ms - born;
    const age = el / life;
    if (age < 0 || age >= 1) continue;
    const w = warpFlight(born, t);
    const p = bezier(f, w);
    const d = dirOf(headingAlong(f, w));
    const side = (hash(i, 3) - 0.5) * 7;
    const shed = back * (0.3 + 0.9 * hash(i, 4)) + 1;
    // Drifting back along the way it went, spreading out from it and settling down a little.
    const drift = (0.01 + 0.025 * hash(i, 5)) * el;
    const spread = side * (1 + 0.004 * el);
    const x = p.x - d.x * (shed + drift) - d.y * spread;
    const y = p.y - d.y * (shed + drift) + d.x * spread + 0.00004 * el * el;
    // Twinkling: each flickers between bright and dim at its own pace.
    const on = Math.floor((el + hash(i, 6) * 80) / (40 + 40 * hash(i, 8))) % 2 === 0;
    const a = alpha * (on ? 1 : 0.4) * (1 - age) ** 0.75 * off(x, y);
    const step = age < 0.25 ? 8 : age < 0.5 ? 7 : age < 0.75 ? 6 : 5;
    const kind = hash(i, 7);
    if (kind < 0.16 && age < 0.7) glint(ctx, x, y, on && age < 0.35 ? 2 : 1, a);
    else if (kind < 0.42 && age < 0.5) dot(ctx, x, y, a, step, 2);
    else dot(ctx, x, y, a, step);
  }

  // A glint at the weapon's point as it is flung (clear of the thrower, like the weapon).
  if (ms < t.rel + 140) {
    const k = (ms - t.rel) / 140;
    const d = dirOf(f.h0);
    glint(ctx, f.S.x + d.x * reach.front * 0.85, f.S.y + d.y * reach.front * 0.85, Math.round(5 * (1 - k)), alpha * (1 - k * k));
  }
  // Where it stops: a glint at its point, and a ring of specks flying out.
  if (ms >= t.caught && ms < t.caught + 240) {
    const k = (ms - t.caught) / 240;
    const d = dirOf(headingAlong(f, 1));
    const tip = { x: f.E.x + d.x * reach.front * 0.85, y: f.E.y + d.y * reach.front * 0.85 };
    glint(ctx, tip.x, tip.y, Math.round(7 * (1 - k) ** 0.7), alpha * (1 - k));
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 + hash(i, 9);
      const r = 3 + 16 * k * (0.6 + 0.4 * hash(i, 10));
      dot(ctx, tip.x + Math.cos(ang) * r, tip.y + Math.sin(ang) * r * 0.7, alpha * (1 - k) * (i % 2 ? 1 : 0.6), k < 0.4 ? 8 : 6);
    }
  }
  ctx.restore();
}
