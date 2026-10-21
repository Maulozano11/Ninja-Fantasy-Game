// A Ryusei's Warp Strike: the weapon it throws, flying from its hand to where it lands with a trail
// of glittering sparkles, and caught there by the hand of the thrust (playback.ts UnitView.warp;
// renderer.ts draws the ninja). The weapon is the item's own art turned with RotSprite, one canvas
// per whole angle (unitArt.thrownFrame), never a canvas rotation, so it stays crisp.
// Everything is in map pixels; the canvas is scaled by a whole number, so pixels stay pixels.

import { heldAt, throwRelease } from '../../sprite/grip';
import type { BodyType, SpriteAppearance } from '../../sprite/types';
import { PHASE_RAMP } from '../../sprite/phase';
import { catchLook, thrownItem } from '../../sprite/thrown';
import { FEET } from '../../sprite/rig';
import type { WarpTimes } from './playback';
import { warpFlight } from './playback';
import { thrownFrame } from './unitArt';

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
  /** The weapon's anchor pixel as it leaves the hand, and where the hand of the thrust catches it. */
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
}

/**
 * The flight of a Warp Strike's weapon. `from` and `to`: the map pixels of the ninja's feet where it
 * throws and where it lands; `face` the way it throws, `land` the way it faces when it lands. `foe`:
 * the map pixels of the feet of the foe it lands beside: the weapon flies in point first at it. The
 * weapon leaves level from the fist of the throw and arrives, arcing down a little, in the hand of
 * the thrust's chamber ('pierce' 1), which it is turned to as the ninja appears.
 */
export function warpFlightOf(look: SpriteAppearance, from: XY, to: XY, face: 1 | -1, land: 1 | -1, foe?: XY): Flight {
  const body: BodyType = look.body;
  const rel = throwRelease(body, thrownItem(look));
  const hold = heldAt(body, 'pierce', 1, catchLook(look).slots.held?.id);
  const S = framePixel(from.x, from.y, rel.lastHeld, face);
  const E = framePixel(to.x, to.y, hold.at, land);
  const h0 = headingOf(rel.weaponAngle, face);
  const hCatch = headingOf(hold.angle, land);
  // Coming in at the foe's chest, but no steeper than 20 degrees off level.
  let hEnd = hCatch;
  if (foe) {
    const aim = (Math.atan2(foe.y - 46 - E.y, foe.x - E.x) * 180) / Math.PI;
    const level = land > 0 ? 0 : 180;
    hEnd = level + Math.max(-20, Math.min(20, wrap(aim - level)));
  }
  const span = Math.hypot(E.x - S.x, E.y - S.y);
  const L = Math.max(20, Math.min(220, span * 0.38));
  const d0 = dirOf(h0);
  const d1 = dirOf(hEnd);
  // It leaves level (as it left the hand) and drops into the catch from a little above.
  const lift = Math.min(28, span * 0.07);
  const f: Flight = {
    S,
    E,
    P1: { x: S.x + d0.x * L, y: S.y + d0.y * L },
    P2: { x: E.x - d1.x * L, y: E.y - d1.y * L - lift },
    h0,
    hCatch,
    angles: [],
  };
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

/** The curve's heading at t (degrees): the way the point faces, point first. */
function headingAlong(f: Flight, t: number): number {
  const u = 1 - t;
  const dx = 3 * u * u * (f.P1.x - f.S.x) + 6 * u * t * (f.P2.x - f.P1.x) + 3 * t * t * (f.E.x - f.P2.x);
  const dy = 3 * u * u * (f.P1.y - f.S.y) + 6 * u * t * (f.P2.y - f.P1.y) + 3 * t * t * (f.E.y - f.P2.y);
  return Math.hypot(dx, dy) < 1e-6 ? f.h0 : (Math.atan2(dy, dx) * 180) / Math.PI;
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

/** How strongly the flying weapon's blue light is added round it. */
const GLOW = 0.75;

/**
 * Draws the weapon itself at a moment of its flight, wrapped in the phase's blue light (its glow
 * added as light under it), as the light body is.
 */
export function drawThrown(ctx: CanvasRenderingContext2D, look: SpriteAppearance, f: Flight, now: FlightNow, alpha: number): void {
  if (now.alpha <= 0.01) return;
  const { angle, mirror } = canvasAngle(f, now.heading);
  const c = thrownFrame(look, angle);
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

// --- the trail -----------------------------------------------------------------------------

const rgb = (i: number): string => `rgb(${PHASE_RAMP[i][0]}, ${PHASE_RAMP[i][1]}, ${PHASE_RAMP[i][2]})`;
const RAMP = PHASE_RAMP.map((_, i) => rgb(i));
/** A steady pseudo-random 0..1 for particle `i`, value `k` (the trail looks the same every time it plays). */
const hash = (i: number, k: number): number => {
  let h = (i * 374761393 + k * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** How many sparkles a flight leaves, and how long the last of them lasts after it lands. */
const SPARKS = 64;
export const TRAIL_AFTER = 420;

/**
 * The trail behind the flying weapon, `ms` into the Warp Strike: glittering sparkles shed from its
 * back end as it goes (1 and 2 px specks and a few four-pointed glints, near-white when new, fading
 * through the phase's blues as they drift back and down, twinkling), short streaks of light
 * following it along its curve, and a small burst where it stops.
 */
export function drawTrail(ctx: CanvasRenderingContext2D, f: Flight, t: WarpTimes, ms: number, alpha: number): void {
  if (ms < t.rel || ms > t.caught + TRAIL_AFTER) return;
  const fly = t.caught - t.rel;
  ctx.save();
  // The streaks: the curve just behind the weapon's back end, a pixel at a time, brightest at the
  // weapon and fading back along it; a long one down the middle and two short ones at its sides.
  if (ms <= t.caught + 80) {
    const fade = ms <= t.caught ? 1 : 1 - (ms - t.caught) / 80;
    const head = Math.min(ms, t.caught);
    for (const [off, len, k, side] of [
      [0, 95, 1, false],
      [-3, 55, 0.75, true],
      [3, 55, 0.75, true],
    ] as const) {
      const tail = Math.max(t.rel, head - len);
      if (head - tail < 4) continue;
      let last = '';
      for (let tm = head; tm >= tail; tm -= 0.5) {
        const w = warpFlight(tm, t);
        const p = bezier(f, w);
        const d = dirOf(headingAlong(f, w));
        // Behind the grip (the weapon's back end) and off to its side.
        const X = Math.round(p.x - d.x * 7 - d.y * off);
        const Y = Math.round(p.y - d.y * 7 + d.x * off);
        const key = `${X},${Y}`;
        if (key === last) continue;
        last = key;
        const along = (head - tm) / len;
        ctx.globalAlpha = alpha * fade * k * (1 - along) ** 1.3;
        // The middle one white turning pale blue, the side ones the phase's stronger blues.
        ctx.fillStyle = RAMP[side ? (along < 0.35 ? 6 : 4) : along < 0.25 ? 8 : along < 0.6 ? 7 : 5];
        ctx.fillRect(X, Y, 1, 1);
      }
    }
  }
  // The sparkles, each shed at its moment of the flight.
  for (let i = 0; i < SPARKS; i++) {
    const born = t.rel + (fly * (i + hash(i, 1) * 0.8)) / SPARKS;
    const life = 220 + 200 * hash(i, 2);
    const age = (ms - born) / life;
    if (age < 0 || age >= 1) continue;
    const w = warpFlight(born, t);
    const p = bezier(f, w);
    const d = dirOf(headingAlong(f, w));
    const side = (hash(i, 3) - 0.5) * 8;
    const back = 5 + 6 * hash(i, 4);
    // Shed behind the weapon, drifting back along its way and settling down a little.
    const drift = (6 + 12 * hash(i, 5)) * age;
    const x = p.x - d.x * (back + drift) - d.y * side * (1 + age);
    const y = p.y - d.y * (back + drift) + d.x * side * (1 + age) + 5 * age * age;
    const twinkle = (Math.floor((ms - born) / 45 + hash(i, 6) * 2) + i) % 2 ? 1 : 0.45;
    const a = alpha * twinkle * (1 - age) ** 0.8;
    const step = age < 0.3 ? 8 : age < 0.6 ? 7 : age < 0.8 ? 6 : 5;
    const kind = hash(i, 7);
    const X = Math.round(x);
    const Y = Math.round(y);
    ctx.globalAlpha = a;
    if (kind < 0.18 && age < 0.65) {
      // A glint: a white heart with four short points of blue.
      const r = age < 0.3 ? 2 : 1;
      ctx.fillStyle = RAMP[6];
      ctx.fillRect(X - r, Y, 2 * r + 1, 1);
      ctx.fillRect(X, Y - r, 1, 2 * r + 1);
      ctx.fillStyle = RAMP[8];
      ctx.fillRect(X, Y, 1, 1);
    } else {
      const s = kind < 0.45 && age < 0.5 ? 2 : 1;
      ctx.fillStyle = RAMP[step];
      ctx.fillRect(X, Y, s, s);
    }
  }
  // Where it stops: a small burst of light round the weapon's back end.
  if (ms >= t.caught && ms < t.caught + 220) {
    const k = (ms - t.caught) / 220;
    const d = dirOf(headingAlong(f, 1));
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + hash(i, 9);
      const r = 3 + 14 * k * (0.6 + 0.4 * hash(i, 10));
      ctx.globalAlpha = alpha * (1 - k) * (i % 2 ? 1 : 0.6);
      ctx.fillStyle = RAMP[k < 0.4 ? 8 : 6];
      ctx.fillRect(Math.round(f.E.x - d.x * 4 + Math.cos(ang) * r), Math.round(f.E.y - d.y * 4 + Math.sin(ang) * r * 0.7), 1, 1);
    }
  }
  ctx.restore();
}
