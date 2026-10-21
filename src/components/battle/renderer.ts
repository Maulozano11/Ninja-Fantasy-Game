// Draws a battle on a canvas: the painted map, scenery and units sorted by depth, the tactical
// overlays (reach, path, areas, vision cones, intents), jutsu effects, numbers and the night.
// One world pixel is drawn as `k` device pixels (an integer), so the pixel art stays crisp.

import type { AreaShape, BattleState, Cell, Intent, PropDef, Pt, Trap, Unit, Wall, WeaponNode } from '../../battle/types';
import { homeTeam } from '../../battle/types';
import type { MapDef } from '../../battle/map';
import { BLOCK_HALF, CELL, cellCenter, dist, segmentsCross } from '../../battle/map';
import { JUTSU, areaOf } from '../../battle/jutsu';
import { breakable } from '../../battle/structures';
import { AURA_RADIUS, sovereign } from '../../battle/combat';
import { lookOf as guardLook, VISION } from '../../battle/stealth';
import { worldSprite } from '../world/WorldSpriteView';
import type { MapArt } from './mapArt';
import type { Fx, Playback, UnitView } from './playback';
import type { WarpTimes } from './playback';
import { FALL_MS, PHASE_DASH, PHASE_IN, PHASE_OUT, phaseDash, RISE_MS, WARP_FRAME, WARP_THRUST, warpDash, warpTimes } from './playback';
import type { Lang } from '../../i18n';
import { unitName } from './battleLog';
import { bodyCenterDx, catchLookOf, FEET, fpsOf, framesOf, hasPhaseFrame, hasReleaseClear, hasThrownFrame, hasUnitFrame, lookOf, phaseFrameOf, releaseClearOf, STRIDE, thrownFrame, unitFrame } from './unitArt';
import { drawKunaiFade, drawThrown, drawTrail, flightLights, flightNow, KUNAI_FADE_FRAME, kunaiFadeAngle, reachOf, warpFlightOf } from './warpFlight';
import type { Flight, FlightLight, XY } from './warpFlight';
import { THROW_RELEASE_FRAME } from '../../sprite/rig';
import type { SpriteAppearance, SpritePose } from '../../sprite/types';
import { PHASE_ADD, PHASE_RAMP, phaseHue } from '../../sprite/phase';
import { edgeFoe, leavesNodes, nodeUnder, WARP, warpLanding } from '../../battle/clans';
import { GRID } from '../../sprite/raster';
import { drawAuraBack, drawLinger, drawVfxSprite, drawWallSprite, wallTint } from './vfxSprites';
import { isTintElement, vfxTintColors } from '../../sprite/vfxTint';

export interface Camera {
  /** World pixel at the screen's top-left. */
  x: number;
  y: number;
  /** Device pixels per world pixel. */
  k: number;
}

export interface Overlay {
  reach?: { cells: Cell[]; tone: 'move' | 'dash' };
  path?: { pts: Pt[]; ok: boolean };
  area?: { shape: AreaShape; tone: 'enemy' | 'ally' | 'heal' };
  /** A circle on the ground: jutsu or weapon range from the caster. */
  range?: { at: Pt; radius: number };
  targets?: string[];
  warn?: string[];
  point?: { at: Pt; ok: boolean };
  /** Where a Kōton structure would rise, and whether it can. */
  footprint?: { wall: Wall; ok: boolean };
  /** Aiming a Ryusei ability: the Nodes it can use light up (the others dim), and the one under the cursor. */
  nodes?: { valid: string[]; hover?: string };
}

export interface Scene {
  state: BattleState;
  pb: Playback;
  map: MapDef;
  art: MapArt;
  now: number;
  cam: Camera;
  /** Canvas size in device pixels, and device pixels per CSS pixel. */
  W: number;
  H: number;
  dpr: number;
  overlay: Overlay;
  selected?: string;
  hover?: string;
  foreseen: Record<string, Intent>;
  shake: { x: number; y: number };
  team: 'party' | 'enemy';
  /** The screen's language (names on the Eye of Tomorrow's marks). */
  lang?: Lang;
  /** The HTML panels over the canvas (device pixels): floating words keep clear of them. */
  avoid?: Rect[];
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A rect moved the shortest way out of the panels it overlaps (staying on the canvas), so a word
 * floating over a unit near the screen's edge isn't hidden under a card.
 */
export function clearOf(r: Rect, avoid: Rect[], W: number, H: number, pad = 4): Rect {
  let out = r;
  for (let pass = 0; pass < 3; pass++) {
    const a = avoid.find((p) => out.x < p.x + p.w + pad && p.x < out.x + out.w + pad && out.y < p.y + p.h + pad && p.y < out.y + out.h + pad);
    if (!a) return out;
    const moves = [
      { dx: a.x + a.w + pad - out.x, dy: 0 },
      { dx: a.x - pad - (out.x + out.w), dy: 0 },
      { dx: 0, dy: a.y + a.h + pad - out.y },
      { dx: 0, dy: a.y - pad - (out.y + out.h) },
    ].filter((m) => out.x + m.dx >= 0 && out.x + out.w + m.dx <= W && out.y + m.dy >= 0 && out.y + out.h + m.dy <= H);
    if (!moves.length) return out;
    const m = moves.reduce((p, q) => (Math.abs(q.dx) + Math.abs(q.dy) < Math.abs(p.dx) + Math.abs(p.dy) ? q : p));
    out = { ...out, x: out.x + m.dx, y: out.y + m.dy };
  }
  return out;
}

const images = new Map<string, HTMLImageElement>();
export function image(url: string): HTMLImageElement {
  let img = images.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    images.set(url, img);
  }
  return img;
}

const ready = (img: HTMLImageElement) => img.complete && img.naturalWidth > 0;

/** Map pixels of a ground point. */
export function project(map: MapDef, p: Pt, level = map.levelAt(p.x, p.z)): { X: number; Y: number } {
  return { X: p.x * map.px.perM, Y: map.px.backY + p.z * map.px.perMDepth - level * map.px.level };
}

/** An effect drawn on the ground among the standing things (by depth), not over everything. */
const onGround = (f: Fx): boolean => f.kind === 'electric' && f.sig === 'water';

/** Where an effect is now: with its unit when it follows it (Evasion's eyes), else where it started. */
export const fxPos = (sc: Scene, f: Fx): Pt => (f.follow && f.unit ? sc.pb.posOf(f.unit, sc.now) : f.from);

/** Screen pixels from a unit's feet to the middle of its drawn body, for centring an aura on it. */
export function auraDx(sc: Scene, id: string | undefined): number {
  const u = id ? sc.state.units[id] : undefined;
  const v = id ? sc.pb.views.get(id) : undefined;
  if (!u || !v || u.kind !== 'ninja') return 0;
  const look = lookOf({ ...u, armed: v.armed });
  return look ? bodyCenterDx(u, look) * v.facing : 0;
}

export const ELEMENT_COLORS: Record<string, [string, string, string, string]> = {
  fire: ['#fff7c2', '#ffc04d', '#ff6a00', '#b3121f'],
  water: ['#e8fbff', '#86d8ff', '#2b88d8', '#0b4f8a'],
  wind: ['#f4fff9', '#bff5dc', '#5fd1a2', '#24795c'],
  lightning: ['#ffffff', '#fff59d', '#7dd3fc', '#2563eb'],
  earth: ['#f6e3bd', '#c9a06b', '#8b5a2b', '#4a3222'],
  genjutsu: ['#fbe7ff', '#e879f9', '#a855f7', '#4c1d95'],
  chakra: ['#e0f2fe', '#8fdcff', '#38bdf8', '#0369a1'],
  poison: ['#f3ffd6', '#b5ef4a', '#65a30d', '#365314'],
};

/**
 * An elemental effect's drawn colours (as ELEMENT_COLORS) in a chakra colour, from the same tones
 * its sheets take; undefined when it keeps its own (Natural, its own colour, not elemental).
 */
export const tintColors = (element: string, tint: string | undefined): readonly [string, string, string, string] | undefined =>
  tint && isTintElement(element) ? vfxTintColors(element, tint) : undefined;

// --- the frame -----------------------------------------------------------------------------

export function drawBattle(ctx: CanvasRenderingContext2D, sc: Scene): void {
  const { cam, W, H, art, map, state } = sc;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = art.sky;
  ctx.fillRect(0, 0, W, H);
  const ox = -Math.round((cam.x + sc.shake.x) * cam.k);
  const oy = -Math.round((cam.y + sc.shake.y) * cam.k);
  ctx.setTransform(cam.k, 0, 0, cam.k, ox, oy);

  // The backdrop scrolls slower than the ground (parallax).
  const bd = image(art.backdrop);
  if (ready(bd)) ctx.drawImage(bd, Math.round(cam.x * (1 - art.parallax)), art.backdropTop);
  const ground = image(art.ground);
  if (ready(ground)) ctx.drawImage(ground, 0, 0);

  drawGroundOverlays(ctx, sc);
  warmPhases(sc);

  // Everything that stands, sorted by depth.
  const items: { z: number; draw: () => void }[] = [];
  const all: PropDef[] = [...map.props, ...art.extras];
  all.forEach((p, i) => {
    const st = i < map.props.length ? state.props[i] : undefined;
    if (st?.destroyed) return;
    items.push({ z: p.sortZ ?? p.z, draw: () => drawProp(ctx, sc, p, i < map.props.length ? i : -1) });
  });
  // Walls broken by events still playing stand until their moment comes; Kōton structures that
  // went sink back into the ground.
  for (const w of [...state.walls, ...sc.pb.goneWalls()]) items.push({ z: (w.a.z + w.b.z) / 2, draw: () => drawWall(ctx, sc, w) });
  for (const f of sc.pb.fallen) items.push({ z: (f.wall.a.z + f.wall.b.z) / 2, draw: () => drawFallen(ctx, sc, f.wall, f.t0) });
  const hydra = Object.values(state.units).find((u) => u.kind === 'hydra_body');
  for (const u of Object.values(state.units)) {
    if (u.kind === 'hydra_head') continue;
    const v = sc.pb.views.get(u.id);
    if (!v) continue;
    if (u.kind === 'hydra_body') {
      items.push({ z: u.pos.z, draw: () => drawHydra(ctx, sc, u) });
      continue;
    }
    const pos = sc.pb.posOf(u.id, sc.now);
    // A Ryusei thrusting at the foe beside it in its Shooting-Star Thrust is drawn over it, so the thrust shows.
    items.push({ z: pos.z + (v.warp ? 0.03 : 0.01), draw: () => drawUnit(ctx, sc, u, pos) });
  }
  void hydra;
  // An aura's back layer sits just behind its caster.
  for (const fx of sc.pb.fx) if (fx.kind === 'aura') items.push({ z: fxPos(sc, fx).z + 0.005, draw: () => drawAuraBack(ctx, sc, fx) });
  // A lingering aura (the Breeze Mantle's wind until the ninja's next turn) wraps round the body too.
  for (const [id, l] of sc.pb.lingers) items.push({ z: sc.pb.posOf(id, sc.now).z + 0.005, draw: () => drawLinger(ctx, sc, id, l, 'back') });
  // Lightning running along the water lies on the ground: what stands in front of it (a metal wall,
  // a unit) is drawn over it.
  for (const fx of sc.pb.fx) if (onGround(fx)) items.push({ z: fx.from.z + 0.005, draw: () => drawFx(ctx, sc, fx) });
  items.sort((a, b) => a.z - b.z);
  for (const it of items) it.draw();
  // Aiming a Ryusei ability: the Nodes it can use, and where it lands, show over walls and units.
  if (sc.overlay.nodes) drawNodesOnTop(ctx, sc);
  drawWarpFlights(ctx, sc);

  for (const [id, l] of sc.pb.lingers) drawLinger(ctx, sc, id, l, 'front');
  for (const fx of sc.pb.fx) if (!onGround(fx) && !drawVfxSprite(ctx, sc, fx)) drawFx(ctx, sc, fx);

  if (state.time === 'night') drawNight(ctx, sc, all);
  if (state.weather === 'Downpour') drawRain(ctx, sc);

  // Screen-space marks: bars, names, numbers.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawMarks(ctx, sc);
}

// --- ground overlays -----------------------------------------------------------------------

function cellPoly(ctx: CanvasRenderingContext2D, map: MapDef, c: Cell): void {
  const x0 = c.c * CELL;
  const z0 = c.r * CELL;
  const p = cellCenter(c);
  const lvl = map.levelAt(p.x, p.z);
  const a = project(map, { x: x0, z: z0 }, lvl);
  const b = project(map, { x: x0 + CELL, z: z0 + CELL }, lvl);
  ctx.rect(a.X, a.Y, b.X - a.X, b.Y - a.Y);
}

function groundEllipse(ctx: CanvasRenderingContext2D, map: MapDef, c: Pt, r: number, lvl?: number): void {
  const p = project(map, c, lvl);
  ctx.ellipse(p.X, p.Y, r * map.px.perM, r * map.px.perMDepth, 0, 0, Math.PI * 2);
}

/** Ground points of an area's outline, projected. */
function areaPath(ctx: CanvasRenderingContext2D, map: MapDef, a: AreaShape): void {
  if (a.kind === 'circle') {
    groundEllipse(ctx, map, a.center, a.radius);
    return;
  }
  const o = a.origin;
  const rad = (a.dir * Math.PI) / 180;
  const pts: Pt[] = [];
  if (a.kind === 'cone') {
    const half = (a.angle * Math.PI) / 360;
    pts.push(o);
    for (let i = 0; i <= 16; i++) {
      const t = rad - half + (2 * half * i) / 16;
      pts.push({ x: o.x + Math.cos(t) * a.length, z: o.z + Math.sin(t) * a.length });
    }
  } else {
    const nx = -Math.sin(rad) * (a.width / 2);
    const nz = Math.cos(rad) * (a.width / 2);
    const ex = Math.cos(rad) * a.length;
    const ez = Math.sin(rad) * a.length;
    pts.push({ x: o.x + nx, z: o.z + nz }, { x: o.x + ex + nx, z: o.z + ez + nz }, { x: o.x + ex - nx, z: o.z + ez - nz }, { x: o.x - nx, z: o.z - nz });
  }
  const lvl = map.levelAt(o.x, o.z);
  pts.forEach((p, i) => {
    const s = project(map, p, lvl);
    if (i) ctx.lineTo(s.X, s.Y);
    else ctx.moveTo(s.X, s.Y);
  });
  ctx.closePath();
}

function drawGroundOverlays(ctx: CanvasRenderingContext2D, sc: Scene): void {
  const { overlay: o, map, state, now } = sc;
  ctx.save();
  if (o.reach && o.reach.cells.length) {
    ctx.beginPath();
    for (const c of o.reach.cells) cellPoly(ctx, map, c);
    ctx.fillStyle = o.reach.tone === 'move' ? 'rgba(125, 211, 252, 0.16)' : 'rgba(251, 191, 36, 0.14)';
    ctx.fill();
  }
  if (o.range) {
    ctx.beginPath();
    groundEllipse(ctx, map, o.range.at, o.range.radius);
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Vision cones of the guards in the stealth phase.
  if (state.phase === 'stealth') {
    for (const g of Object.values(state.units)) {
      if (!g.guard || g.down) continue;
      const pos = sc.pb.posOf(g.id, now);
      const look = (guardLook(g) * Math.PI) / 180;
      const range = state.time === 'night' ? VISION.night : VISION.day;
      const half = (VISION.halfAngle * Math.PI) / 180;
      const lvl = map.levelAt(pos.x, pos.z);
      const sus = Math.max(0, ...Object.values(g.guard.suspicion));
      ctx.beginPath();
      const s0 = project(map, pos, lvl);
      ctx.moveTo(s0.X, s0.Y);
      for (let i = 0; i <= 20; i++) {
        const t = look - half + (2 * half * i) / 20;
        const p = project(map, { x: pos.x + Math.cos(t) * range, z: pos.z + Math.sin(t) * range }, lvl);
        ctx.lineTo(p.X, p.Y);
      }
      ctx.closePath();
      const grad = ctx.createRadialGradient(s0.X, s0.Y, 4, s0.X, s0.Y, range * map.px.perM);
      const tone = sus >= 70 ? '249, 115, 22' : sus >= 40 ? '250, 204, 21' : '254, 240, 138';
      grad.addColorStop(0, `rgba(${tone}, 0.30)`);
      grad.addColorStop(1, `rgba(${tone}, 0.05)`);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = `rgba(${tone}, 0.45)`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      groundEllipse(ctx, map, pos, VISION.near, lvl);
      ctx.fillStyle = `rgba(${tone}, 0.12)`;
      ctx.fill();
    }
  }
  // Each Northstar's Aura of Sovereignty, around it as it walks (gone once its fall has played).
  if (state.phase === 'combat') {
    for (const u of Object.values(state.units)) {
      const v = sc.pb.views.get(u.id);
      if (!v || !sovereign({ ...u, down: v.down }) || (u.team !== sc.team && v.hidden)) continue;
      ctx.beginPath();
      groundEllipse(ctx, map, sc.pb.posOf(u.id, now), AURA_RADIUS);
      ctx.fillStyle = 'rgba(167, 139, 250, 0.12)';
      ctx.fill();
      // A dark edge under the violet dashes, so the ring reads on grass at the tactical zoom.
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(30, 12, 60, 0.35)';
      ctx.stroke();
      ctx.setLineDash([7, 5]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(196, 181, 253, 0.9)';
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  // Traps the party can see.
  for (const t of state.traps) if (t.owner === sc.team || t.spotted) drawTrap(ctx, map, t);
  // Weapon Nodes, both sides' (each from when its event plays until its removal does).
  for (const n of [...state.nodes, ...sc.pb.goneNodes()]) if (!sc.pb.queue.some((e) => e.t === 'node' && e.on && e.node.id === n.id)) drawNode(ctx, sc, n);
  // What the Eye of Tomorrow reads. It stays on through the animations (an enemy that has started
  // to act shows none until it plans again: intent.ts, planSpent). The enemy under the cursor has
  // its own marks drawn last and bright, the others' dimmed, so close plans can't be mixed up.
  const focus = sc.hover && sc.foreseen[sc.hover] ? sc.hover : undefined;
  for (const [id, it] of Object.entries(sc.foreseen)) if (id !== focus) drawForesight(ctx, sc, id, it, focus ? 'dim' : 'plain');
  if (focus) drawForesight(ctx, sc, focus, sc.foreseen[focus], 'lit');
  if (o.area) {
    ctx.beginPath();
    areaPath(ctx, map, o.area.shape);
    const tone = o.area.tone === 'heal' ? '74, 222, 128' : o.area.tone === 'ally' ? '96, 165, 250' : '251, 113, 60';
    ctx.fillStyle = `rgba(${tone}, 0.22)`;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(${tone}, 0.85)`;
    ctx.stroke();
  }
  if (o.path && o.path.pts.length > 1) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = o.path.ok ? 'rgba(255, 255, 255, 0.85)' : 'rgba(248, 113, 113, 0.85)';
    ctx.setLineDash([2, 6]);
    ctx.lineCap = 'round';
    ctx.beginPath();
    o.path.pts.forEach((p, i) => {
      const s = project(map, p);
      if (i) ctx.lineTo(s.X, s.Y);
      else ctx.moveTo(s.X, s.Y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    const end = o.path.pts[o.path.pts.length - 1];
    ctx.beginPath();
    groundEllipse(ctx, map, end, 0.32);
    ctx.stroke();
  }
  if (o.point) {
    ctx.beginPath();
    groundEllipse(ctx, map, o.point.at, 0.3);
    ctx.lineWidth = 2;
    ctx.strokeStyle = o.point.ok ? 'rgba(255,255,255,0.9)' : 'rgba(248,113,113,0.9)';
    ctx.stroke();
  }
  // A Kōton structure about to rise: the block's square, or the band its wall stands on.
  if (o.footprint) {
    const { wall: w, ok } = o.footprint;
    const lvl = map.levelAt((w.a.x + w.b.x) / 2, (w.a.z + w.b.z) / 2);
    polyPath(ctx, footprint(w).map((p) => project(map, p, lvl)));
    ctx.fillStyle = 'rgba(148, 178, 204, 0.32)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = ok ? 'rgba(255,255,255,0.9)' : 'rgba(248,113,113,0.9)';
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * An enemy's plan on the ground, as a Mirai's Eye of Tomorrow sees it: a dashed line to where it
 * will walk, ending in an arrowhead on a filled marker (so two enemies stopping side by side read as
 * two walks, not one walk with two stops), from there an arrow to the one it means to strike (green
 * for a friend it means to heal, shelter behind a wall or swap out of danger) with a ring under it,
 * and the area its jutsu will cover. Lines get a dark edge so they read on grass at the tactical
 * zoom. `lit`: the enemy under the cursor, drawn bolder; `dim`: the others meanwhile.
 */
function drawForesight(ctx: CanvasRenderingContext2D, sc: Scene, id: string, it: Intent, look: 'plain' | 'lit' | 'dim' = 'plain'): void {
  const { map, state, now } = sc;
  const from = sc.pb.posOf(id, now);
  const tgt = it.target ? state.units[it.target] : undefined;
  const red = look === 'lit' ? 'rgba(255, 110, 100, 1)' : 'rgba(248, 72, 72, 0.95)';
  const dark = look === 'lit' ? 'rgba(255, 255, 255, 0.75)' : 'rgba(40, 6, 6, 0.55)';
  const bold = look === 'lit' ? 1 : 0;
  /** A line twice: its dark edge, then its colour. */
  const twice = (path: () => void, color: string, width: number, dash: number[] = []) => {
    ctx.setLineDash(dash);
    ctx.lineWidth = width + 2 + bold;
    ctx.strokeStyle = dark;
    ctx.beginPath();
    path();
    ctx.stroke();
    ctx.lineWidth = width + bold;
    ctx.strokeStyle = color;
    ctx.beginPath();
    path();
    ctx.stroke();
    ctx.setLineDash([]);
  };
  ctx.save();
  if (look === 'dim') ctx.globalAlpha = 0.35;
  ctx.lineCap = 'round';
  // A jutsu is aimed where its target stands when the turn comes (the hydra's venom and roar too).
  const spec = it.kind === 'jutsu' || it.kind === 'spit' || it.kind === 'roar' ? JUTSU[it.what] : undefined;
  const stop = it.to ?? from;
  const area = spec ? areaOf(spec, stop, tgt ? sc.pb.posOf(tgt.id, now) : it.at ?? from) : null;
  if (area) {
    ctx.beginPath();
    areaPath(ctx, map, area);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.14)';
    ctx.fill();
  }
  if (it.to) {
    const a = project(map, from);
    const b = project(map, it.to);
    const len = Math.hypot(b.X - a.X, b.Y - a.Y);
    // The walk ends in an arrowhead on the marker's edge.
    const ux = len > 0 ? (b.X - a.X) / len : 0;
    const uy = len > 0 ? (b.Y - a.Y) / len : 0;
    const edge = Math.hypot(ux * 0.2 * map.px.perM, uy * 0.2 * map.px.perMDepth);
    const ex = b.X - ux * edge;
    const ey = b.Y - uy * edge;
    twice(() => {
      ctx.moveTo(a.X, a.Y);
      ctx.lineTo(ex, ey);
    }, red, 2.5, [6, 5]);
    if (len > 24)
      twice(() => {
        ctx.moveTo(ex - ux * 9 - uy * 5, ey - uy * 9 + ux * 5);
        ctx.lineTo(ex, ey);
        ctx.lineTo(ex - ux * 9 + uy * 5, ey - uy * 9 - ux * 5);
      }, red, 2.5);
    // Where it stops: a filled marker, not a ring (rings are for whom it strikes).
    ctx.beginPath();
    groundEllipse(ctx, map, it.to, 0.2);
    ctx.fillStyle = red;
    ctx.fill();
    ctx.lineWidth = 1.5 + bold;
    ctx.strokeStyle = dark;
    ctx.stroke();
  }
  // Advancing isn't striking yet: only a plan to act links to its target and rings it.
  if (tgt && it.kind !== 'move' && it.kind !== 'defend') {
    const color = it.kind === 'heal' || tgt.team === state.units[id]?.team ? 'rgba(74, 222, 128, 0.95)' : red;
    const tp = sc.pb.posOf(tgt.id, now);
    const a = project(map, stop);
    const b = project(map, tp);
    const len = Math.hypot(b.X - a.X, b.Y - a.Y);
    if (len > 24) {
      // From where it will stand to the ring's edge, with an arrowhead.
      const ux = (b.X - a.X) / len;
      const uy = (b.Y - a.Y) / len;
      const ex = b.X - ux * 18;
      const ey = b.Y - uy * 8;
      twice(() => {
        ctx.moveTo(a.X + ux * 6, a.Y + uy * 3);
        ctx.lineTo(ex, ey);
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - ux * 8 - uy * 5, ey - uy * 8 + ux * 5);
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - ux * 8 + uy * 5, ey - uy * 8 - ux * 5);
      }, color, 2);
    }
    twice(() => groundEllipse(ctx, map, tp, 0.55), color, 2.5);
  }
  ctx.restore();
}

function drawTrap(ctx: CanvasRenderingContext2D, map: MapDef, t: Trap): void {
  const p = project(map, t.pos);
  ctx.save();
  ctx.fillStyle = t.kind === 'tag' ? '#f5f0dc' : '#9ca3af';
  ctx.strokeStyle = '#7f1d1d';
  ctx.lineWidth = 1;
  ctx.fillRect(p.X - 4, p.Y - 3, 8, 6);
  ctx.strokeRect(p.X - 4, p.Y - 3, 8, 6);
  ctx.beginPath();
  groundEllipse(ctx, map, t.pos, t.radius);
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = 'rgba(248, 113, 113, 0.5)';
  ctx.stroke();
  ctx.restore();
}

/**
 * A Ryusei's Weapon Node: a steel diamond stuck in the ground, ringed in its side's colour. With
 * someone standing on it, the ring is wider than their feet and the diamond sits at its front edge,
 * where the body doesn't hide it.
 */
function drawNode(ctx: CanvasRenderingContext2D, sc: Scene, n: WeaponNode, alpha = 1): void {
  const { map, state, overlay: o, now } = sc;
  const lit = !!o.nodes?.valid.includes(n.id);
  const owner = state.units[n.owner];
  const party = !owner || homeTeam(owner) !== 'enemy';
  const stood = Object.values(state.units).some((u) => u.kind === 'ninja' && u.down !== 'dead' && u.down !== 'fled' && dist(sc.pb.posOf(u.id, now), n.pos) < 0.5);
  const ring = stood ? 0.62 : 0.4;
  const p = project(map, stood ? { x: n.pos.x, z: n.pos.z + ring } : n.pos);
  ctx.save();
  ctx.globalAlpha = alpha * (o.nodes && !lit ? 0.45 : 1);
  ctx.beginPath();
  groundEllipse(ctx, map, n.pos, ring);
  if (lit) {
    ctx.fillStyle = 'rgba(34, 211, 238, 0.2)';
    ctx.fill();
  } else ctx.setLineDash([3, 3]);
  ctx.lineWidth = lit || stood ? 2 : 1.5;
  ctx.strokeStyle = o.nodes?.hover === n.id ? 'rgba(255, 255, 255, 0.95)' : party ? 'rgba(34, 211, 238, 0.85)' : 'rgba(251, 113, 133, 0.85)';
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(p.X, p.Y - 10);
  ctx.lineTo(p.X + 4, p.Y - 4);
  ctx.lineTo(p.X, p.Y + 1);
  ctx.lineTo(p.X - 4, p.Y - 4);
  ctx.closePath();
  ctx.fillStyle = '#e2e8f0';
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = party ? '#0e7490' : '#9f1239';
  ctx.stroke();
  ctx.restore();
}

/** While a warp or a swap is aimed: its Nodes and the landing spot again, over walls and units. */
function drawNodesOnTop(ctx: CanvasRenderingContext2D, sc: Scene): void {
  const o = sc.overlay;
  for (const n of sc.state.nodes) if (o.nodes?.valid.includes(n.id)) drawNode(ctx, sc, n, 0.85);
  if (o.point) {
    ctx.save();
    ctx.beginPath();
    groundEllipse(ctx, sc.map, o.point.at, 0.3);
    ctx.lineWidth = 2;
    ctx.strokeStyle = o.point.ok ? 'rgba(255,255,255,0.9)' : 'rgba(248,113,113,0.9)';
    ctx.stroke();
    ctx.restore();
  }
}

function drawWall(ctx: CanvasRenderingContext2D, sc: Scene, w: Wall): void {
  // Not raised yet: its event is still waiting in the playback queue.
  if (sc.pb.queue.some((e) => e.t === 'wall' && e.on && e.wall.id === w.id)) return;
  // A Kōton structure grows out of the ground when it is raised (eased out).
  const born = sc.pb.wallBorn.get(w.id);
  const t = born === undefined ? 1 : Math.min(1, ((sc.now - born) * sc.pb.speed) / RISE_MS);
  const rise = 1 - (1 - t) ** 3;
  // A block is always drawn; a wall plays its element's sheet when the game has one.
  if (w.kind === 'metalBlock') drawSteel(ctx, sc, w, rise);
  else if (!drawWallSprite(ctx, sc, w)) {
    if (w.kind === 'metal') drawSteel(ctx, sc, w, rise);
    else drawWallShape(ctx, sc, w);
  }
  if (rise >= 1) drawWallHp(ctx, sc, w);
}

/** A Kōton structure that crumbled or broke, sinking into the ground and fading. */
function drawFallen(ctx: CanvasRenderingContext2D, sc: Scene, w: Wall, t0: number): void {
  const t = Math.min(1, ((sc.now - t0) * sc.pb.speed) / FALL_MS);
  if (t >= 1) return;
  ctx.save();
  ctx.globalAlpha = 1 - t * 0.6;
  drawSteel(ctx, sc, w, 1 - t * t);
  ctx.restore();
}

/** Heights of the drawn walls (px). */
const WALL_H: Record<Wall['kind'], number> = { earth: 96, water: 84, metal: 90, metalBlock: 48 };

/** A wall drawn as a shape: an earth bank or a sheet of water. */
function drawWallShape(ctx: CanvasRenderingContext2D, sc: Scene, w: Wall): void {
  const { map } = sc;
  const { a, b, kind } = w;
  const pa = project(map, a);
  const pb = project(map, b);
  const h = WALL_H[kind];
  // In the chakra colour of whoever raised it (8-digit hex: the colour and its see-through).
  const col = tintColors(kind, wallTint(sc, w));
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pa.X, pa.Y);
  ctx.lineTo(pb.X, pb.Y);
  ctx.lineTo(pb.X, pb.Y - h);
  ctx.lineTo(pa.X, pa.Y - h);
  ctx.closePath();
  if (kind === 'earth') {
    const g = ctx.createLinearGradient(0, pa.Y - h, 0, pa.Y);
    g.addColorStop(0, col ? col[1] : '#b08a5a');
    g.addColorStop(1, col ? col[3] : '#5b3d22');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#2c1d10';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    const t = sc.now / 300;
    const g = ctx.createLinearGradient(0, pa.Y - h, 0, pa.Y);
    g.addColorStop(0, col ? `${col[1]}8c` : 'rgba(186, 236, 255, 0.55)');
    g.addColorStop(0.5 + 0.1 * Math.sin(t), col ? `${col[2]}73` : 'rgba(76, 170, 230, 0.45)');
    g.addColorStop(1, col ? `${col[3]}8c` : 'rgba(30, 100, 180, 0.55)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = col ? `${col[0]}cc` : 'rgba(220, 245, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

type Px = { X: number; Y: number };

/** The ground corners of a Kōton structure: a 1.5 m square, or a wall as thick as the cells it fills. */
function footprint(w: Wall): Pt[] {
  if (w.kind === 'metalBlock') {
    const { x, z } = w.a;
    const r = BLOCK_HALF;
    return [{ x: x - r, z: z - r }, { x: x + r, z: z - r }, { x: x + r, z: z + r }, { x: x - r, z: z + r }];
  }
  const d = Math.max(1e-6, dist(w.a, w.b));
  const nx = (-(w.b.z - w.a.z) / d) * 0.35;
  const nz = ((w.b.x - w.a.x) / d) * 0.35;
  return [{ x: w.a.x + nx, z: w.a.z + nz }, { x: w.b.x + nx, z: w.b.z + nz }, { x: w.b.x - nx, z: w.b.z - nz }, { x: w.a.x - nx, z: w.a.z - nz }];
}

/**
 * A steel box as the viewer sees it: the sides turned toward the front (each with how far it faces
 * right, for its shade and its ground length) and the top.
 */
function steelBox(map: MapDef, w: Wall, rise = 1): { sides: { pts: Px[]; right: number; len: number }[]; top: Px[] } {
  const foot = footprint(w);
  const c = { x: foot.reduce((a, p) => a + p.x, 0) / 4, z: foot.reduce((a, p) => a + p.z, 0) / 4 };
  const lvl = map.levelAt(c.x, c.z);
  const h = WALL_H[w.kind] * rise;
  const g = foot.map((p) => project(map, p, lvl));
  const top = g.map((p) => ({ X: p.X, Y: p.Y - h }));
  const sides: { pts: Px[]; right: number; len: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const out = { x: (foot[i].x + foot[j].x) / 2 - c.x, z: (foot[i].z + foot[j].z) / 2 - c.z };
    // Only the sides that face the front (toward +z) show; the others are hidden behind the top.
    if (out.z <= 1e-3) continue;
    sides.push({ pts: [g[i], g[j], top[j], top[i]], right: out.x / Math.hypot(out.x, out.z), len: dist(foot[i], foot[j]) });
  }
  return { sides, top };
}

const polyPath = (ctx: CanvasRenderingContext2D, pts: Px[]): void => {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.X, p.Y) : ctx.moveTo(p.X, p.Y)));
  ctx.closePath();
};

/**
 * A Kōton structure in plain steel (a stand-in until its sheet is painted): a block, or a wall of
 * plates with seams, lit from the left and the top.
 */
function drawSteel(ctx: CanvasRenderingContext2D, sc: Scene, w: Wall, rise = 1): void {
  if (rise <= 0.01) return;
  const { sides, top } = steelBox(sc.map, w, rise);
  const h = WALL_H[w.kind] * rise;
  ctx.save();
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 1.5;
  for (const f of sides) {
    const [g0, g1] = f.pts;
    const grad = ctx.createLinearGradient(0, Math.min(g0.Y, g1.Y) - h, 0, Math.max(g0.Y, g1.Y));
    grad.addColorStop(0, '#9aa3ad');
    grad.addColorStop(1, '#4b5563');
    polyPath(ctx, f.pts);
    ctx.fillStyle = grad;
    ctx.fill();
    if (f.right > 0.1) {
      ctx.fillStyle = `rgba(17, 24, 39, ${0.35 * f.right})`;
      ctx.fill();
    }
    ctx.stroke();
    // A wall's long faces are plates with two seams.
    if (w.kind === 'metal' && f.len > 2) {
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(31, 41, 55, 0.7)';
      ctx.beginPath();
      for (const k of [1 / 3, 2 / 3]) {
        const x = g0.X + (g1.X - g0.X) * k;
        const y = g0.Y + (g1.Y - g0.Y) * k;
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - h);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
  polyPath(ctx, top);
  ctx.fillStyle = '#c3cad3';
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** A thin grey bar over a structure that has been hurt. */
function drawWallHp(ctx: CanvasRenderingContext2D, sc: Scene, w: Wall): void {
  if (!breakable(w) || !w.maxHp) return;
  const hp = sc.pb.wallHp(w);
  if (hp >= w.maxHp) return;
  const { top } = steelBox(sc.map, w);
  const x = top.reduce((sum, p) => sum + p.X, 0) / 4;
  const y = Math.min(...top.map((p) => p.Y));
  const bw = 34;
  ctx.save();
  ctx.fillStyle = 'rgba(8, 10, 18, 0.8)';
  ctx.fillRect(x - bw / 2 - 1, y - 9, bw + 2, 5);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(x - bw / 2, y - 8, Math.round((bw * Math.max(0, hp)) / w.maxHp), 3);
  ctx.restore();
}

// --- props, units, the hydra ---------------------------------------------------------------

function drawProp(ctx: CanvasRenderingContext2D, sc: Scene, p: PropDef, index: number): void {
  const ws = worldSprite(p.group, p.name);
  if (!ws || !ready(ws.img)) return;
  const { spec, img } = ws;
  const anims = Object.entries(spec.anims).sort((a, b) => a[1].row - b[1].row);
  let anim = (p.anim && spec.anims[p.anim]) || anims[0][1];
  const pos = project(sc.map, p, p.level);
  let dx = 0;
  let dy = -(p.lift ?? 0);
  let alpha = 1;
  // Animals that took off fly away and are gone.
  const fledAt = index >= 0 ? sc.pb.fled.get(index) ?? (sc.state.props[index]?.fled ? -1e9 : undefined) : undefined;
  if (fledAt !== undefined) {
    const t = (sc.now - fledAt) / 1400;
    if (t >= 1) return;
    const flight = spec.anims.fly ?? spec.anims.flee ?? spec.anims.hop ?? spec.anims.walk ?? anim;
    anim = flight;
    dx = (p.mirror ? -1 : 1) * t * 220;
    dy -= t * t * 160;
    alpha = 1 - t;
  }
  const frame = anim.fps > 0 && anim.frames > 1 ? Math.floor((sc.now / 1000) * anim.fps + (index % 7)) % anim.frames : 0;
  ctx.save();
  ctx.globalAlpha = alpha;
  const [ax, ay] = spec.anchor;
  if (p.mirror) {
    ctx.translate(Math.round(pos.X + dx), 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, frame * spec.frameW, anim.row * spec.frameH, spec.frameW, spec.frameH, -ax, Math.round(pos.Y + dy - ay), spec.frameW, spec.frameH);
  } else {
    ctx.drawImage(img, frame * spec.frameW, anim.row * spec.frameH, spec.frameW, spec.frameH, Math.round(pos.X + dx - ax), Math.round(pos.Y + dy - ay), spec.frameW, spec.frameH);
  }
  ctx.restore();
}

/** How opaque a unit is drawn: fading out as it flees, fainter while hidden (more so to the other side) or dead. */
function unitAlpha(sc: Scene, u: Unit, v: UnitView): number {
  let alpha = 1;
  if (v.fade) alpha = Math.max(0, 1 - (sc.now - v.fade.t0) / v.fade.dur);
  if (v.hidden) alpha *= u.team === sc.team ? 0.55 : 0.35;
  if (v.down === 'dead' && u.team === 'enemy') alpha *= 0.75;
  return alpha;
}

type FrameCanvas = { canvas: HTMLCanvasElement; ox: number; oy: number };

function drawUnit(ctx: CanvasRenderingContext2D, sc: Scene, u: Unit, pos: Pt): void {
  const v = sc.pb.views.get(u.id)!;
  const { map, now } = sc;
  const lvl = map.levelAt(pos.x, pos.z);
  const s = project(map, pos, lvl);
  const alpha = unitAlpha(sc, u, v);
  if (alpha <= 0) return;
  const water = map.waterAt(pos.x, pos.z);
  const swimming = water === 'deep' && !u.cond.waterWalk && !v.walk ? true : water === 'deep' && !u.cond.waterWalk;

  // A Ryusei's phase or Shooting-Star Thrust: the body turns to light, so its shadow fades while it does.
  const phase = v.phase ? phaseNow(sc, v) : undefined;
  const lit = phase ? phase.light : v.warp ? warpLight(warpNow(sc, v).ms, warpNow(sc, v).t) : 0;

  // Shadow, and the ring of the selected or acting ninja.
  ctx.save();
  ctx.globalAlpha = alpha * 0.35 * (1 - 0.75 * lit);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(Math.round(s.X), Math.round(s.Y) - 1, v.pose === 'downed' ? 30 : 20, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const acting = sc.pb.turnUnit === u.id && sc.state.phase === 'combat';
  if (acting || sc.selected === u.id || sc.hover === u.id || sc.overlay.targets?.includes(u.id) || sc.overlay.warn?.includes(u.id)) {
    ctx.save();
    ctx.lineWidth = 2;
    const pulse = 0.65 + 0.35 * Math.sin(now / 180);
    ctx.strokeStyle = sc.overlay.warn?.includes(u.id)
      ? `rgba(251, 191, 36, ${pulse})`
      : sc.overlay.targets?.includes(u.id)
        ? homeTeam(u) === 'party'
          ? `rgba(103, 232, 249, ${pulse})`
          : `rgba(248, 113, 113, ${pulse})`
        : acting
          ? `rgba(250, 204, 21, ${pulse})`
          : homeTeam(u) === 'party'
            ? 'rgba(125, 211, 252, 0.9)'
            : 'rgba(248, 113, 113, 0.9)';
    ctx.beginPath();
    ctx.ellipse(Math.round(s.X), Math.round(s.Y) - 1, 22, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const look = lookOf({ ...u, armed: v.armed });
  if (!look) return;
  // Gait frames follow the distance walked, so the feet stay planted.
  let frame: number;
  const stride = STRIDE[v.pose];
  if (v.walk && stride) frame = Math.floor((sc.pb.walked(u.id, now) * map.px.perM) / stride);
  else {
    const n = framesOf(look, v.pose);
    const elapsed = ((now - v.poseT0) * sc.pb.speed) / 1000;
    const oneShot = v.pose === 'attack' || v.pose === 'hurt' || v.pose === 'cast' || v.pose === 'tackle';
    frame = Math.floor(elapsed * fpsOf(v.pose));
    if (oneShot) frame = Math.min(frame, n - 1);
  }
  const aura = v.pose === 'cast' ? { mode: 'cast' as const, tick: Math.floor(now / 83), empowered: !!v.castEnhanced } : undefined;
  const fr = unitFrame(u, look, v.pose, frame, aura);
  let lx = 0;
  let ly = 0;
  if (v.lunge) {
    const t = (now - v.lunge.t0) / (v.lunge.dur / sc.pb.speed);
    if (t < 1) {
      const k = Math.sin(Math.min(1, t) * Math.PI);
      lx = v.lunge.dx * k;
      ly = v.lunge.dy * k;
    } else v.lunge = undefined;
  }
  const hurt = now < v.hurtUntil;
  const x0 = Math.round(s.X + lx);
  const y0 = Math.round(s.Y + ly - FEET.y);
  /** The solid sprite (or another frame of it), `k` of its own alpha (a phase fades it out and back in). */
  const solid = (k: number, facing: 1 | -1 = v.facing, img: FrameCanvas = fr): void => {
    if (k <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha * k * (hurt && Math.floor(now / 60) % 2 ? 0.55 : 1);
    // In the river the body sinks: deep water hides the legs, shallow water the feet.
    if (water !== 'none' && v.pose !== 'downed') {
      ctx.beginPath();
      const half = Math.max(FEET.x, GRID - FEET.x) + 6;
      ctx.rect(x0 - half, y0 - 20, 2 * half, FEET.y + 20 - (swimming ? 38 : 8));
      ctx.clip();
    }
    blitFrame(ctx, img, x0, y0, facing);
    ctx.restore();
  };
  if (v.warp) drawWarp(ctx, sc, u, v, look, alpha, solid);
  else if (phase) drawPhase(ctx, sc, u, v, look, phase, alpha, solid);
  else solid(1);
  const leaping = phase?.stage === 'dash' || (v.warp && lit >= 1);
  if (water !== 'none' && v.pose !== 'downed' && !leaping) {
    // Ripples where the body meets the water.
    ctx.save();
    ctx.globalAlpha = 0.6 * alpha;
    ctx.strokeStyle = '#d8f3ff';
    ctx.lineWidth = 1;
    const wy = s.Y - (swimming ? 38 : 8);
    const r = 14 + 3 * Math.sin(now / 250);
    ctx.beginPath();
    ctx.ellipse(s.X, wy, r, 3.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/** A unit frame drawn with its feet at (x0, y0 + FEET.y), mirrored when it faces left. */
function blitFrame(ctx: CanvasRenderingContext2D, fr: { canvas: HTMLCanvasElement; ox: number; oy: number }, x0: number, y0: number, facing: 1 | -1): void {
  if (facing < 0) {
    ctx.save();
    ctx.translate(x0, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(fr.canvas, -FEET.x + fr.ox, y0 + fr.oy);
    ctx.restore();
  } else ctx.drawImage(fr.canvas, x0 - FEET.x + fr.ox, y0 + fr.oy);
}

// --- the Ryusei's phase --------------------------------------------------------------------

const phaseRgb = (i: number): string => `rgb(${PHASE_RAMP[i][0]}, ${PHASE_RAMP[i][1]}, ${PHASE_RAMP[i][2]})`;

interface PhaseNow {
  /** Playback ms into the phase (at speed 1). */
  ms: number;
  stage: 'in' | 'dash' | 'out';
  /** 0..1 through the stage. */
  k: number;
  /** How much of the body is light (0 solid, 1 all light). */
  light: number;
}

function phaseNow(sc: Scene, v: UnitView): PhaseNow {
  const ms = Math.max(0, (sc.now - v.phase!.t0) * sc.pb.speed);
  if (ms < PHASE_IN) return { ms, stage: 'in', k: ms / PHASE_IN, light: ms / PHASE_IN };
  if (ms < PHASE_IN + PHASE_DASH) return { ms, stage: 'dash', k: (ms - PHASE_IN) / PHASE_DASH, light: 1 };
  const k = Math.min(1, (ms - PHASE_IN - PHASE_DASH) / PHASE_OUT);
  return { ms, stage: 'out', k, light: 1 - k };
}

/** The pose a phasing unit leaps in: the run's knee-up frame, then its long stride (a fallen ninja just slides, lying down). */
function phaseLeap(v: UnitView, dashK: number): { pose: SpritePose; frame: number } {
  if (v.down === 'downed' || v.down === 'stable' || v.pose === 'downed') return { pose: 'downed', frame: 0 };
  return { pose: 'run', frame: dashK < 0.35 ? 1 : 2 };
}

/** What a light body is drawn with (drawPhase, drawWarp): see phaseKit. */
interface PhaseKit {
  /**
   * The light body at strength `k` (1 = all light), feet over the ground spot (X, Y) of map point
   * `pt`, `lift` pixels up: the ground under it takes its blue at `hue`, then it is laid over and
   * added as light (sprite/phase.ts, PHASE_ADD).
   */
  light(pose: SpritePose, frame: number, pt: Pt, X: number, Y: number, lift: number, facing: 1 | -1, k: number, hue?: number): void;
  /** A flare: the light body added once more as light, at `k`. */
  flare(pose: SpritePose, frame: number, pt: Pt, X: number, Y: number, facing: 1 | -1, k: number): void;
  ring(X: number, Y: number, r: number, k: number, step: number): void;
  /** Little squares of light rising round a point, seeded so they don't flicker. */
  sparks(X: number, Y: number, t: number, k: number, seed: number): void;
}

/** The light bodies of a unit drawn in `look`, `alpha` of their usual opacity (a hidden ninja is fainter). */
function phaseKit(ctx: CanvasRenderingContext2D, sc: Scene, u: Unit, look: SpriteAppearance, alpha: number): PhaseKit {
  const { map } = sc;
  /**
   * In the river the light body sinks as the solid one does (deep water hides the legs, shallow
   * water the feet): clipped at the waterline over `pt`, which a leap rises out of.
   */
  const clipWater = (pt: Pt, pose: SpritePose, X: number, Y: number, lift: number): void => {
    const water = map.waterAt(pt.x, pt.z);
    if (water === 'none' || pose === 'downed') return;
    const cut = water === 'deep' && !u.cond.waterWalk ? 38 : 8;
    const half = Math.max(FEET.x, GRID - FEET.x) + 6;
    ctx.beginPath();
    ctx.rect(Math.round(X) - half, Math.round(Y - lift) - FEET.y - 20, 2 * half, Math.round(lift) + FEET.y + 20 - cut);
    ctx.clip();
  };
  return {
    light(pose, frame, pt, X, Y, lift, facing, k, hue = phaseHue(k)) {
      if (k <= 0.01) return;
      const fr = phaseFrameOf(u, look, pose, frame);
      const x0 = Math.round(X);
      const y0 = Math.round(Y - lift - FEET.y);
      ctx.save();
      clipWater(pt, pose, X, Y, lift);
      ctx.globalCompositeOperation = 'color';
      ctx.globalAlpha = Math.min(1, alpha * hue);
      blitFrame(ctx, fr, x0, y0, facing);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(1, alpha * k);
      blitFrame(ctx, fr, x0, y0, facing);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * k * PHASE_ADD);
      blitFrame(ctx, fr, x0, y0, facing);
      ctx.restore();
    },
    flare(pose, frame, pt, X, Y, facing, k) {
      if (k <= 0.01) return;
      const fr = phaseFrameOf(u, look, pose, frame);
      ctx.save();
      clipWater(pt, pose, X, Y, 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, alpha * k);
      blitFrame(ctx, fr, Math.round(X), Math.round(Y - FEET.y), facing);
      ctx.restore();
    },
    ring(X, Y, r, k, step) {
      if (k <= 0) return;
      ctx.save();
      ctx.globalAlpha = alpha * k;
      ctx.strokeStyle = phaseRgb(step);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(Math.round(X), Math.round(Y) - 1, r, r * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    },
    sparks(X, Y, t, k, seed) {
      if (k <= 0) return;
      ctx.save();
      for (let i = 0; i < 7; i++) {
        const dx = ((seed * 31 + i * 17) % 23) - 11;
        const up = 8 + ((seed * 7 + i * 29) % 40) + t * 26;
        const big = i % 3 === 0;
        ctx.globalAlpha = alpha * k * (1 - t) * (i % 2 ? 0.9 : 0.6);
        ctx.fillStyle = phaseRgb(big ? 8 : 6);
        ctx.fillRect(Math.round(X + dx * 1.6), Math.round(Y - up), big ? 2 : 1, big ? 2 : 1);
      }
      ctx.restore();
    },
  };
}

/** A faint pool of blue light on the ground under a leaping light body. */
function phasePool(ctx: CanvasRenderingContext2D, X: number, Y: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha * 0.35;
  ctx.fillStyle = phaseRgb(4);
  ctx.beginPath();
  ctx.ellipse(Math.round(X), Math.round(Y) - 1, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * A Ryusei's phase (the owner's picture, docs/reference/ryusei-phase-owner-reference.jpg): the
 * ninja turns to blue light where it stands with a brief flare, leaps across as light to where it
 * lands, leaving fading after-images along the line, and turns solid there with a small blue
 * flash. The light body is the unit's own frame turned to light (unitArt.phaseFrameOf), drawn as
 * sprite/phase.ts says (PHASE_ADD): the ground under it turned blue, the body laid over it and
 * added as light, so even a faint after-image stays blue over green grass.
 */
function drawPhase(ctx: CanvasRenderingContext2D, sc: Scene, u: Unit, v: UnitView, look: SpriteAppearance, ph: PhaseNow, alpha: number, solid: (k: number, facing?: 1 | -1) => void): void {
  const { map } = sc;
  const { from, to } = v.phase!;
  const a = project(map, from);
  const b = project(map, to);
  const along = Math.hypot(b.X - a.X, b.Y - a.Y);
  const dashFace: 1 | -1 = Math.abs(to.x - from.x) > 0.05 ? (to.x > from.x ? 1 : -1) : v.facing;
  // The leap: higher the farther it goes, at most about a third of a body.
  const hop = Math.min(28, 8 + along * 0.07);
  /** Where the light body is `ms` into the phase: the map point under it, its feet's ground spot (map pixels) and how high it leaps. */
  const at = (ms: number): { pt: Pt; X: number; Y: number; lift: number; dashK: number } => {
    const k = phaseDash(ms);
    const pt = { x: from.x + (to.x - from.x) * k, z: from.z + (to.z - from.z) * k };
    const q = project(map, pt);
    return { pt, X: q.X, Y: q.Y, lift: Math.sin(Math.PI * k) * hop, dashK: Math.min(1, Math.max(0, (ms - PHASE_IN) / PHASE_DASH)) };
  };
  const { light, flare, ring, sparks } = phaseKit(ctx, sc, u, look, alpha);
  const rest = v.pose;

  if (ph.stage === 'in') {
    // Turning to light where it stands: the sprite fades into its light body, with a flare.
    solid(1 - ph.k);
    light(rest, 0, from, a.X, a.Y, 0, v.facing, ph.k, ph.k);
    flare(rest, 0, from, a.X, a.Y, v.facing, Math.sin(Math.PI * ph.k) * 0.55);
    ring(a.X, a.Y, 10 + ph.k * 14, 0.9 - ph.k * 0.4, 6);
    sparks(a.X, a.Y, ph.k, 1, 3);
    return;
  }
  // After-images along the line, each a little behind the last and fainter; they catch up and go
  // as it lands.
  const end = PHASE_IN + PHASE_DASH;
  for (let i = 3; i >= 1; i--) {
    const t = ph.ms - i * 48;
    if (t < PHASE_IN || t >= end) continue;
    const p = at(t);
    const leap = phaseLeap(v, p.dashK);
    light(leap.pose, leap.frame, p.pt, p.X, p.Y, p.lift, dashFace, (0.84 - i * 0.19) * (ph.stage === 'out' ? 1 - ph.k : 1));
  }
  // Where it set off, a ring of light fades.
  const since = (ph.ms - PHASE_IN) / (PHASE_DASH + PHASE_OUT);
  ring(a.X, a.Y, 24 + since * 6, 0.5 * (1 - since), 5);
  if (ph.stage === 'dash') {
    const p = at(ph.ms);
    const leap = phaseLeap(v, ph.k);
    phasePool(ctx, p.X, p.Y, alpha);
    light(leap.pose, leap.frame, p.pt, p.X, p.Y, p.lift, dashFace, 1);
    sparks((a.X + p.X) / 2, (a.Y + p.Y) / 2, ph.k, 0.8, 11);
    return;
  }
  // Landing: the light body turns solid again, with a small blue flash.
  const face = u.facing;
  solid(ph.k, face);
  light(rest, 0, to, b.X, b.Y, 0, face, 1 - ph.k, 1 - ph.k);
  flare(rest, 0, to, b.X, b.Y, face, (1 - ph.k) ** 2 * 0.6);
  ring(b.X, b.Y, 12 + ph.k * 18, 1 - ph.k, 7);
  ring(b.X, b.Y, 6 + ph.k * 10, (1 - ph.k) * 0.7, 4);
  sparks(b.X, b.Y, ph.k, 1, 7);
}

/** The frames a unit's phase uses: its rest pose's first frame and the two leap frames. */
function phaseFrames(v: UnitView): { pose: SpritePose; frame: number }[] {
  return [{ pose: v.pose, frame: 0 }, phaseLeap(v, 0), phaseLeap(v, 1)];
}

// --- the Ryusei's Shooting-Star Thrust: the throw, the flight, the catch and the thrust ---------------

/** Playback ms into a unit's Shooting-Star Thrust (at speed 1) and its timeline. */
function warpNow(sc: Scene, v: UnitView): { ms: number; t: WarpTimes } {
  return { ms: Math.max(0, (sc.now - v.warp!.t0) * sc.pb.speed), t: warpTimes(v.warp!.fly) };
}

/** How much of a Ryusei's body is light in its Shooting-Star Thrust at `ms` (0 solid, 1 all light): its shadow fades as much. */
function warpLight(ms: number, t: WarpTimes): number {
  if (ms < t.rel) return 0;
  if (ms < t.dash) return (ms - t.rel) / (t.dash - t.rel);
  if (ms < t.land) return 1;
  return Math.max(0, 1 - (ms - t.land) / (t.solid - t.land));
}

/** The leaping frame of the dash: the throw's follow-through, carried on into the leap with both feet off the ground. */
const WARP_LEAP = 4;

/**
 * A Ryusei's Shooting-Star Thrust (the owner, 2026-10-21; UnitView.warp): the ninja faces the Node and
 * throws ('throw' wind-up and the throw); as the weapon leaves the hand it turns to blue light in
 * the release pose, his reference, with a flare; it leaps after the weapon as light (the throw's
 * follow-through, with fading after-images), and lands where the weapon stops, turning solid
 * already in the thrust's chamber ('pierce' 1) with the weapon in its hand, then thrusts at the foe
 * beside it (or ahead) and stands. The weapon's flight and its sparkles are drawn over everything
 * (drawWarpFlights).
 */
function drawWarp(ctx: CanvasRenderingContext2D, sc: Scene, u: Unit, v: UnitView, look: SpriteAppearance, alpha: number, solid: (k: number, facing?: 1 | -1, fr?: FrameCanvas) => void): void {
  const { map } = sc;
  const w = v.warp!;
  const { ms, t } = warpNow(sc, v);
  const { from, to, face, land } = w;
  const caught = catchLookOf(look);
  if (ms < t.rel) {
    // The wind-up and the throw: a frame each WARP_FRAME.
    solid(1, face, unitFrame(u, look, 'throw', Math.min(THROW_RELEASE_FRAME - 1, Math.floor(ms / WARP_FRAME))));
    return;
  }
  const a = project(map, from);
  const b = project(map, to);
  const kit = phaseKit(ctx, sc, u, look, alpha);
  if (ms < t.dash) {
    // The weapon has left the hand: the ninja turns to light in the release pose, where it stands.
    const k = (ms - t.rel) / (t.dash - t.rel);
    solid(1 - k, face, unitFrame(u, look, 'throw', THROW_RELEASE_FRAME));
    kit.light('throw', THROW_RELEASE_FRAME, from, a.X, a.Y, 0, face, k, k);
    kit.flare('throw', THROW_RELEASE_FRAME, from, a.X, a.Y, face, Math.sin(Math.PI * k) * 0.55);
    kit.ring(a.X, a.Y, 10 + k * 14, 0.9 - k * 0.4, 6);
    kit.sparks(a.X, a.Y, k, 1, 3);
    return;
  }
  const along = Math.hypot(b.X - a.X, b.Y - a.Y);
  const hop = Math.min(28, 8 + along * 0.07);
  const at = (tm: number): { pt: Pt; X: number; Y: number; lift: number } => {
    const k = warpDash(tm, t);
    const pt = { x: from.x + (to.x - from.x) * k, z: from.z + (to.z - from.z) * k };
    const q = project(map, pt);
    return { pt, X: q.X, Y: q.Y, lift: Math.sin(Math.PI * k) * hop };
  };
  // After-images along the way, each a little behind the last and fainter; they catch up and go as
  // it lands.
  const out = ms < t.land ? 0 : Math.min(1, (ms - t.land) / (t.solid - t.land));
  if (ms < t.solid)
    for (let i = 3; i >= 1; i--) {
      const tm = ms - i * 48;
      if (tm < t.dash || tm >= t.land) continue;
      const p = at(tm);
      kit.light('throw', WARP_LEAP, p.pt, p.X, p.Y, p.lift, face, (0.84 - i * 0.19) * (1 - out));
    }
  // Where it set off, a ring of light fades.
  const since = Math.min(1, (ms - t.dash) / (t.solid - t.dash));
  kit.ring(a.X, a.Y, 24 + since * 6, 0.5 * (1 - since), 5);
  if (ms < t.land) {
    const p = at(ms);
    phasePool(ctx, p.X, p.Y, alpha);
    kit.light('throw', WARP_LEAP, p.pt, p.X, p.Y, p.lift, face, 1);
    kit.sparks((a.X + p.X) / 2, (a.Y + p.Y) / 2, (ms - t.dash) / (t.land - t.dash), 0.8, 11);
    return;
  }
  if (ms < t.solid) {
    // Landing where the weapon stopped: solid again in the thrust's chamber, catching it, with a flash.
    const ck = phaseKit(ctx, sc, u, caught, alpha);
    solid(out, land, unitFrame(u, caught, 'pierce', 1));
    ck.light('pierce', 1, to, b.X, b.Y, 0, land, 1 - out, 1 - out);
    ck.flare('pierce', 1, to, b.X, b.Y, land, (1 - out) ** 2 * 0.6);
    kit.ring(b.X, b.Y, 12 + out * 18, 1 - out, 7);
    kit.ring(b.X, b.Y, 6 + out * 10, (1 - out) * 0.7, 4);
    kit.sparks(b.X, b.Y, out, 1, 7);
    return;
  }
  // The thrust: estocada, impacto, retroceso.
  const into = ms - t.solid;
  const f = into < WARP_THRUST[0] ? 2 : into < WARP_THRUST[0] + WARP_THRUST[1] ? 3 : KUNAI_FADE_FRAME;
  if (f !== KUNAI_FADE_FRAME || caught === look) {
    solid(1, land, unitFrame(u, caught, 'pierce', f));
    return;
  }
  // A kunai from the pouch is not kept: in the recoil it turns to light and fades out of the hand,
  // which is left as it was before the throw (empty, or its technique back in the palm; a stowed
  // weapon never left its place), so the stand that follows changes nothing in it.
  const k = Math.min(1, (into - WARP_THRUST[0] - WARP_THRUST[1]) / WARP_THRUST[2]);
  solid(1, land, unitFrame(u, look, 'pierce', f));
  solid(1 - k, land, unitFrame(u, caught, 'pierce', f));
  drawKunaiFade(ctx, look, b.X, b.Y, land, k, alpha);
}

/** The flight of a unit's Shooting-Star Thrust weapon (warpFlight.ts), worked out once per strike. */
const flights = new WeakMap<NonNullable<UnitView['warp']>, Flight>();

function flightOf(sc: Scene, u: Unit, look: SpriteAppearance, w: NonNullable<UnitView['warp']>): Flight {
  let f = flights.get(w);
  if (!f) {
    const foe = w.foe ? sc.state.units[w.foe] : undefined;
    const p = (pt: Pt): XY => {
      const q = project(sc.map, pt);
      return { x: q.X, y: q.Y };
    };
    f = warpFlightOf(look, releaseClearOf(u, look), p(w.from), p(w.to), w.face, w.land, foe ? p(sc.pb.posOf(foe.id, sc.now)) : undefined);
    flights.set(w, f);
  }
  return f;
}

/** The weapons thrown by Shooting-Star Thrusts, with their trails of sparkles: over everything, as they fly. */
function drawWarpFlights(ctx: CanvasRenderingContext2D, sc: Scene): void {
  for (const u of Object.values(sc.state.units)) {
    const v = sc.pb.views.get(u.id);
    if (!v?.warp) continue;
    const look = lookOf({ ...u, armed: v.armed });
    if (!look) continue;
    const { ms, t } = warpNow(sc, v);
    const f = flightOf(sc, u, look, v.warp);
    const alpha = unitAlpha(sc, u, v);
    if (alpha <= 0) continue;
    drawTrail(ctx, f, t, ms, alpha, reachOf(look, f));
    const now = flightNow(f, t, ms);
    if (now) drawThrown(ctx, look, f, now, alpha);
  }
}

/** The lights the flying weapons' comets shed on the night (drawNight). */
function warpLights(sc: Scene): FlightLight[] {
  const out: FlightLight[] = [];
  for (const u of Object.values(sc.state.units)) {
    const v = sc.pb.views.get(u.id);
    if (!v?.warp) continue;
    const look = lookOf({ ...u, armed: v.armed });
    if (!look || unitAlpha(sc, u, v) <= 0) continue;
    const { ms, t } = warpNow(sc, v);
    out.push(...flightLights(flightOf(sc, u, look, v.warp), t, ms));
  }
  return out;
}

/**
 * What a Ryusei's Shooting-Star Thrust will need made beforehand (the slow part is making sprite frames):
 * first what does not depend on where it goes (the throw, the light bodies of its release and its
 * leap, the thrust it lands in, holding a kunai if it throws one from the pouch, and that kunai
 * fading), so a Ryusei has them before it places a Node; then its weapon at every angle of the
 * flight to each of its Nodes.
 */
function warpNeeds(sc: Scene, u: Unit, look: SpriteAppearance): (() => boolean)[] {
  const caught = catchLookOf(look);
  const needs: (() => boolean)[] = [];
  const thrownOf = (angle: number) => () => {
    if (hasThrownFrame(look, angle)) return false;
    thrownFrame(look, angle);
    return true;
  };
  const solidOf = (l: SpriteAppearance, pose: SpritePose, f: number) => () => {
    if (hasUnitFrame(u, l, pose, f)) return false;
    unitFrame(u, l, pose, f);
    return true;
  };
  const lightOf = (l: SpriteAppearance, pose: SpritePose, f: number) => () => {
    if (hasPhaseFrame(u, l, pose, f)) return false;
    phaseFrameOf(u, l, pose, f);
    return true;
  };
  for (let f = 0; f <= THROW_RELEASE_FRAME; f++) needs.push(solidOf(look, 'throw', f));
  needs.push(lightOf(look, 'throw', THROW_RELEASE_FRAME), lightOf(look, 'throw', WARP_LEAP));
  needs.push(solidOf(caught, 'pierce', 1), lightOf(caught, 'pierce', 1));
  for (let f = 2; f <= 4; f++) needs.push(solidOf(caught, 'pierce', f));
  if (caught !== look) needs.push(solidOf(look, 'pierce', KUNAI_FADE_FRAME), thrownOf(kunaiFadeAngle(look)));
  // The flights start clear of the release pose: worked out from it, before the flights themselves.
  if (!hasReleaseClear(look)) {
    needs.push(() => {
      releaseClearOf(u, look);
      return true;
    });
    return needs;
  }
  const clear = releaseClearOf(u, look);
  const v = sc.pb.views.get(u.id);
  const plans: Flight[] = [];
  if (v?.warp) plans.push(flightOf(sc, u, look, v.warp));
  else
    for (const n of sc.state.nodes) {
      if (n.owner !== u.id) continue;
      const to = warpLanding(sc.state, u, n);
      if (!to) continue;
      const foe = edgeFoe(sc.state, u, to);
      const face: 1 | -1 = Math.abs(to.x - u.pos.x) > 0.05 ? (to.x > u.pos.x ? 1 : -1) : u.facing;
      const land: 1 | -1 = foe && foe.pos.x !== to.x ? (foe.pos.x > to.x ? 1 : -1) : face;
      const p = (pt: Pt): XY => {
        const q = project(sc.map, pt);
        return { x: q.X, y: q.Y };
      };
      plans.push(warpFlightOf(look, clear, p(u.pos), p(to), face, land, foe ? p(foe.pos) : undefined));
    }
  for (const plan of plans) for (const angle of plan.angles) needs.push(thrownOf(angle));
  return needs;
}

/**
 * Makes the light bodies a phase will need before it plays, and what a Shooting-Star Thrust will need (its
 * frames and its flying weapon), a little per screen frame (one sprite frame, or a few small
 * weapon angles, within WARM_MS) and at quiet moments, so neither waits for them when it plays:
 * for phases and Shooting-Star Thrusts already queued or playing; then, while nothing plays, for the
 * Ryusei whose turn it is and whoever stands on its Nodes (a Spatial Swap takes them along), for
 * every Ryusei on the field, and last a Shooting-Star Thrust with each Ryusei's weapon put away or drawn.
 */
const WARM_MS = 4;
const warpsReady = new WeakMap<BattleState, Set<string>>();

function warmPhases(sc: Scene): void {
  const ids: string[] = [];
  const warps: string[] = [];
  for (const e of sc.pb.queue) {
    if (e.t === 'teleport' && e.how === 'phase') ids.push(e.unit);
    if (e.t === 'jutsu' && e.jutsu === WARP) warps.push(e.unit);
  }
  for (const [id, v] of sc.pb.views) if (v.warp) warps.push(id);
  const turn = sc.pb.turnUnit ? sc.state.units[sc.pb.turnUnit] : undefined;
  // Every Ryusei, Nodes or not: what a Shooting-Star Thrust needs wherever it goes is made before its first
  // Node is placed, so a Shooting-Star Thrust cast right after leaves only its weapon's angles to make.
  const quiet = !ids.length && !warps.length && !sc.pb.busy;
  if (quiet) {
    if (turn && leavesNodes(turn) && !turn.down) {
      ids.push(turn.id);
      warps.push(turn.id);
      for (const o of Object.values(sc.state.units)) if (o.id !== turn.id && o.kind === 'ninja' && !o.down && nodeUnder(sc.state, turn, o)) ids.push(o.id);
    }
    for (const o of Object.values(sc.state.units))
      if (o.kind === 'ninja' && !o.down && leavesNodes(o)) {
        ids.push(o.id);
        warps.push(o.id);
      }
  }
  const t0 = performance.now();
  // A Shooting-Star Thrust about to play comes first: it needs the most. (A unit found ready is not looked
  // at again until the state changes.)
  let done = warpsReady.get(sc.state);
  if (!done) warpsReady.set(sc.state, (done = new Set()));
  /** Makes some of what a unit's Shooting-Star Thrust needs with its weapon drawn or not; false once out of time. */
  const warmWarp = (u: Unit, armed: boolean, warping: boolean): boolean => {
    const look = lookOf({ ...u, armed });
    const key = `${u.id}|${armed}|${warping}`;
    if (!look || done.has(key)) return true;
    let made = false;
    for (const need of warpNeeds(sc, u, look))
      if (need()) {
        made = true;
        if (performance.now() - t0 > WARM_MS) return false;
      }
    if (!made) done.add(key);
    return true;
  };
  for (const id of warps) {
    const u = sc.state.units[id];
    const v = sc.pb.views.get(id);
    if (u && v && !warmWarp(u, v.armed, !!v.warp)) return;
  }
  if (performance.now() - t0 > WARM_MS) return;
  for (const id of ids) {
    const u = sc.state.units[id];
    const v = sc.pb.views.get(id);
    const look = u && v ? lookOf({ ...u, armed: v.armed }) : undefined;
    if (!u || !v || !look) continue;
    const need = phaseFrames(v).find((f) => !hasPhaseFrame(u, look, f.pose, f.frame));
    if (need) {
      phaseFrameOf(u, look, need.pose, need.frame);
      return;
    }
  }
  // Last, still while nothing plays: each Ryusei's other look, its weapon put away or drawn again.
  // Seals stow the weapon, and a Shooting-Star Thrust is a bonus action: cast right after a jutsu (the AI
  // casts it 260 ms after), it would otherwise make its frames as it plays.
  if (quiet)
    for (const id of warps) {
      const u = sc.state.units[id];
      const v = sc.pb.views.get(id);
      if (u && v && u.weapon.held && !warmWarp(u, !v.armed, false)) return;
    }
}

// --- the hydra ------------------------------------------------------------------------------

interface HydraRig {
  body: string;
  stump: string;
  heads: { sprite: string; attach: [number, number]; layer: 'back' | 'front'; head: [number, number]; mouth: [number, number] }[];
  /** How far the neck roots move with each body frame, per body animation. */
  follow?: Record<string, [number, number][]>;
}

const HYDRA_RIG = Object.values(import.meta.glob('../../assets/world/creatures/hydra.json', { eager: true, import: 'default' }) as Record<string, HydraRig>)[0];

/** One-shot creature animations end; the rest loop. */
function creatureFrame(s: NonNullable<ReturnType<typeof worldSprite>>, anim: string, ms: number, phase = 0): { frame: number; done: boolean } {
  const a = s.spec.anims[anim];
  if (!a) return { frame: 0, done: true };
  const n = Math.floor((ms / 1000) * a.fps) + phase;
  if (a.loop) return { frame: ((n % a.frames) + a.frames) % a.frames, done: false };
  return { frame: Math.min(n, a.frames - 1), done: n >= a.frames };
}

function blitSprite(ctx: CanvasRenderingContext2D, s: NonNullable<ReturnType<typeof worldSprite>>, anim: string, frame: number, x: number, y: number, mirror: boolean): void {
  const a = s.spec.anims[anim];
  if (!a) return;
  const [ax, ay] = s.spec.anchor;
  ctx.save();
  if (mirror) {
    ctx.translate(Math.round(x), 0);
    ctx.scale(-1, 1);
    ctx.drawImage(s.img, frame * s.spec.frameW, a.row * s.spec.frameH, s.spec.frameW, s.spec.frameH, -ax, Math.round(y - ay), s.spec.frameW, s.spec.frameH);
  } else ctx.drawImage(s.img, frame * s.spec.frameW, a.row * s.spec.frameH, s.spec.frameW, s.spec.frameH, Math.round(x - ax), Math.round(y - ay), s.spec.frameW, s.spec.frameH);
  ctx.restore();
}

/** Where a hydra's head is drawn (map pixels), for its health bar and for picking. */
export function hydraHeadPx(sc: { state: BattleState; map: MapDef }, head: Unit): { X: number; Y: number } | null {
  if (!HYDRA_RIG || !head.head) return null;
  const body = sc.state.units[head.head.body];
  const r = HYDRA_RIG.heads[head.head.index];
  if (!body || !r) return null;
  const b = project(sc.map, body.pos, 0);
  const sx = body.facing < 0 ? -1 : 1;
  return { X: b.X + sx * (r.attach[0] + r.head[0]), Y: b.Y + r.attach[1] + r.head[1] };
}

/** The hydra from its sprites: back necks, the body, front necks, stumps under cut necks. */
function drawHydraSprites(ctx: CanvasRenderingContext2D, sc: Scene, body: Unit): boolean {
  const rig = HYDRA_RIG;
  if (!rig) return false;
  const bodyS = worldSprite('creatures', rig.body);
  const stumpS = worldSprite('creatures', rig.stump);
  if (!bodyS || !stumpS || !bodyS.img.complete || !bodyS.img.naturalWidth) return false;
  const { now, state, map } = sc;
  const b = project(map, body.pos, 0);
  const mirror = body.facing < 0;
  const sx = mirror ? -1 : 1;
  const bv = sc.pb.views.get(body.id);
  let bodyAnim = 'idle';
  let bodyMs = now;
  if (bv?.creature && (bv.creature.anim === 'death' || now - bv.creature.t0 < 600)) {
    bodyAnim = bv.creature.anim;
    bodyMs = now - bv.creature.t0;
  }
  if (body.down === 'dead' && bodyAnim !== 'death') {
    bodyAnim = 'death';
    bodyMs = 1e6;
  }
  const bf = creatureFrame(bodyS, bodyAnim, bodyMs);
  if (bf.done && bodyAnim === 'hurt') bodyAnim = 'idle';
  const follow = rig.follow?.[bodyAnim]?.[bf.frame] ?? [0, 0];
  const heads = Object.values(state.units)
    .filter((u) => u.head?.body === body.id)
    .sort((a, c) => a.head!.index - c.head!.index);
  const drawNeck = (h: Unit) => {
    const r = rig.heads[h.head!.index];
    const s = r && worldSprite('creatures', r.sprite);
    if (!r || !s || !s.img.complete) return;
    const v = sc.pb.views.get(h.id);
    const x = b.X + sx * (r.attach[0] + follow[0]);
    const y = b.Y + r.attach[1] + follow[1];
    const severed = v?.severed ?? h.head!.severed;
    const c = v?.creature;
    const ms = c ? (now - c.t0) * sc.pb.speed : 0;
    let anim: string | null = severed ? null : 'idle';
    let frame = 0;
    if (c) {
      const f = creatureFrame(s, c.anim, ms, c.anim === 'sever' && body.down === 'dead' ? 1 : 0);
      if (!f.done) {
        anim = c.anim;
        frame = f.frame;
      }
    }
    // A cut neck shows its stump (raw, or burnt once sealed); regrowing grows out of it.
    if (severed || anim === 'sever' || anim === 'regrow') {
      const st = creatureFrame(stumpS, h.head!.sealed ? 'burnt' : 'raw', now);
      blitSprite(ctx, stumpS, h.head!.sealed ? 'burnt' : 'raw', st.frame, x, y, mirror);
    }
    if (body.down === 'dead' && anim === 'idle') anim = null;
    if (!anim) return;
    if (anim === 'idle') frame = creatureFrame(s, 'idle', now, h.head!.index * 3).frame;
    blitSprite(ctx, s, anim, frame, x, y, mirror);
  };
  for (const h of heads) if (rig.heads[h.head!.index]?.layer === 'back') drawNeck(h);
  blitSprite(ctx, bodyS, bodyAnim, bf.frame, b.X, b.Y, mirror);
  for (const h of heads) if (rig.heads[h.head!.index]?.layer === 'front') drawNeck(h);
  return true;
}

/** The hydra until its sprites are in the game: a body in the water and seven necks with heads. */
function drawHydra(ctx: CanvasRenderingContext2D, sc: Scene, body: Unit): void {
  if (drawHydraSprites(ctx, sc, body)) return;
  const { map, now, state } = sc;
  const b = project(map, body.pos, 0);
  const dead = body.down === 'dead';
  ctx.save();
  if (dead) ctx.globalAlpha = 0.6;
  // Body: a scaled hump half sunk in the river.
  const g = ctx.createRadialGradient(b.X - 30, b.Y - 70, 10, b.X, b.Y - 40, 150);
  g.addColorStop(0, '#5c8f3c');
  g.addColorStop(0.6, '#2f5a26');
  g.addColorStop(1, '#173018');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(b.X, b.Y - 34, 140, 62, 0, Math.PI, 0);
  ctx.lineTo(b.X + 140, b.Y - 30);
  ctx.ellipse(b.X, b.Y - 30, 140, 16, 0, 0, Math.PI);
  ctx.fill();
  ctx.strokeStyle = '#0d1a0d';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Golden spikes along the back.
  ctx.fillStyle = '#d6a634';
  for (let i = -5; i <= 5; i++) {
    const x = b.X + i * 22;
    const y = b.Y - 34 - Math.sqrt(Math.max(0, 1 - (i * 22) ** 2 / 140 ** 2)) * 62;
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 4);
    ctx.lineTo(x, y - 14);
    ctx.lineTo(x + 6, y + 4);
    ctx.fill();
  }
  const heads = Object.values(state.units)
    .filter((u) => u.head?.body === body.id)
    .sort((a, c) => a.head!.index - c.head!.index);
  for (const h of heads) {
    const v = sc.pb.views.get(h.id);
    const hp = project(map, h.pos, 0);
    const severed = v?.severed ?? h.head!.severed;
    const sway = Math.sin(now / 500 + h.head!.index) * 6;
    const hx = hp.X + sway;
    const hy = severed ? b.Y - 80 : hp.Y - 150 - Math.cos(now / 650 + h.head!.index) * 6;
    const baseX = b.X + (hp.X - b.X) * 0.45;
    const baseY = b.Y - 60;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0d1a0d';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX + (hx - baseX) * 0.2, hy + 40, hx, hy);
    ctx.stroke();
    ctx.strokeStyle = sc.hover === h.id || sc.overlay.targets?.includes(h.id) ? '#7fbf4a' : '#467a2f';
    ctx.lineWidth = 16;
    ctx.stroke();
    if (severed) {
      ctx.fillStyle = h.head!.sealed ? '#2b2b2b' : '#9b1c1c';
      ctx.beginPath();
      ctx.ellipse(hx, hy, 9, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.fillStyle = '#3f7a2a';
    ctx.strokeStyle = '#0d1a0d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(hx + (hp.X < b.X ? -10 : 10), hy - 4, 22, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(hx + (hp.X < b.X ? -20 : 14), hy - 10, 4, 4);
    // Green venom drips from the jaws.
    ctx.fillStyle = 'rgba(132, 255, 88, 0.85)';
    ctx.fillRect(hx + (hp.X < b.X ? -26 : 22), hy + 4 + ((now / 90 + h.head!.index * 5) % 10), 2, 4);
  }
  ctx.restore();
}

// --- effects -------------------------------------------------------------------------------

function drawFx(ctx: CanvasRenderingContext2D, sc: Scene, f: Fx): void {
  const { map, now } = sc;
  const t = (now - f.t0) / (f.dur / sc.pb.speed);
  if (t < 0 || t > 1) return;
  // An elemental jutsu's stand-in plays in its caster's chakra colour, as its sheets would.
  const tinted = tintColors(f.element, f.tint);
  const col = tinted ?? ELEMENT_COLORS[f.element] ?? ELEMENT_COLORS.chakra;
  const big = f.enhanced ? 1.6 : 1;
  ctx.save();
  switch (f.kind) {
    case 'projectile':
    case 'kunai': {
      const a = project(map, f.from);
      const b = project(map, f.to);
      const [l0, l1] = f.lift ?? [60, 60];
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const x = a.X + (b.X - a.X) * e;
      const y = a.Y - l0 + (b.Y - l1 - (a.Y - l0)) * e - Math.sin(t * Math.PI) * 30;
      if (f.kind === 'kunai') {
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
        const ang = Math.atan2(b.Y - a.Y, b.X - a.X);
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(ang) * 8, y - Math.sin(ang) * 8);
        ctx.lineTo(x + Math.cos(ang) * 4, y + Math.sin(ang) * 4);
        ctx.stroke();
        break;
      }
      const r = (f.sig === 'fireball' ? 16 : 10) * big;
      for (let k = 6; k >= 1; k--) {
        const tt = Math.max(0, e - k * 0.035);
        const tx = a.X + (b.X - a.X) * tt;
        const ty = a.Y - l0 + (b.Y - l1 - (a.Y - l0)) * tt - Math.sin(tt * Math.PI) * 30;
        ctx.globalAlpha = 0.12 * (7 - k);
        ctx.fillStyle = col[2];
        ctx.beginPath();
        ctx.arc(tx, ty, r * (1 - k * 0.1), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      const g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, col[0]);
      g.addColorStop(0.45, col[1]);
      g.addColorStop(1, col[3]);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'area':
    case 'explosion': {
      const c = f.area?.kind === 'circle' ? f.area.center : f.from;
      const rM = f.area?.kind === 'circle' ? f.area.radius : f.radius ?? 1.5;
      const p = project(map, c);
      const grow = Math.min(1, t * 2.2);
      const rx = rM * map.px.perM * grow;
      const ry = rM * map.px.perMDepth * grow;
      ctx.globalAlpha = 1 - t;
      const g = ctx.createRadialGradient(p.X, p.Y, 2, p.X, p.Y, rx);
      g.addColorStop(0, col[0]);
      g.addColorStop(0.5, col[1]);
      g.addColorStop(1, `${col[3]}00`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(p.X, p.Y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      // A rising column of the element.
      const h = (f.kind === 'explosion' ? 90 : 70) * big * Math.sin(Math.min(1, t * 1.5) * Math.PI);
      const g2 = ctx.createLinearGradient(0, p.Y - h, 0, p.Y);
      g2.addColorStop(0, `${col[3]}00`);
      g2.addColorStop(0.5, col[2]);
      g2.addColorStop(1, col[0]);
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.ellipse(p.X, p.Y - h / 2, rx * 0.55, h / 2 + 1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = col[1];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.X, p.Y, rx * 1.05, ry * 1.05, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'cone':
    case 'line': {
      if (!f.area) break;
      const reveal = Math.min(1, t * 1.8);
      const a = f.area;
      const shape: AreaShape = a.kind === 'circle' ? a : { ...a, length: a.length * reveal };
      ctx.globalAlpha = Math.min(1, (1 - t) * 1.6);
      ctx.beginPath();
      areaPath(ctx, map, shape);
      const o = project(map, a.kind === 'circle' ? a.center : a.origin);
      const g = ctx.createRadialGradient(o.X, o.Y - 20, 4, o.X, o.Y, (a.kind === 'circle' ? a.radius : a.length) * map.px.perM);
      g.addColorStop(0, col[0]);
      g.addColorStop(0.4, col[1]);
      g.addColorStop(0.8, col[2]);
      g.addColorStop(1, `${col[3]}aa`);
      ctx.fillStyle = g;
      ctx.fill();
      // Tongues of the element along the front.
      ctx.fillStyle = col[1];
      for (let i = 0; i < 18 * big; i++) {
        const rr = (i * 37) % 100;
        const ang = a.kind === 'cone' ? ((a.dir - a.angle / 2 + (a.angle * ((i * 53) % 100)) / 100) * Math.PI) / 180 : (a.kind === 'line' ? a.dir : 0) * (Math.PI / 180);
        const len = (a.kind === 'circle' ? a.radius : a.length) * reveal * (0.3 + rr / 140);
        const ox = a.kind === 'circle' ? a.center.x : a.origin.x;
        const oz = a.kind === 'circle' ? a.center.z : a.origin.z;
        const pp = project(map, { x: ox + Math.cos(ang) * len, z: oz + Math.sin(ang) * len });
        const fl = (8 + (rr % 9)) * big * (1 - t);
        ctx.beginPath();
        ctx.ellipse(pp.X, pp.Y - fl, 3 * big, fl, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'burst':
    case 'slash': {
      const p = project(map, f.to);
      const y = p.Y - (f.lift?.[1] ?? 50);
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = f.kind === 'slash' ? '#f8fafc' : col[1];
      ctx.lineWidth = f.kind === 'slash' ? 3 : 2;
      if (f.kind === 'slash') {
        ctx.beginPath();
        ctx.arc(p.X, y, 22, -1.9 + t, -0.4 + t);
        ctx.stroke();
      } else {
        for (let i = 0; i < 10; i++) {
          const ang = (i / 10) * Math.PI * 2;
          const r0 = 6 + t * 10;
          const r1 = 14 + t * 26 * big;
          ctx.beginPath();
          ctx.moveTo(p.X + Math.cos(ang) * r0, y + Math.sin(ang) * r0);
          ctx.lineTo(p.X + Math.cos(ang) * r1, y + Math.sin(ang) * r1);
          ctx.stroke();
        }
      }
      break;
    }
    case 'electric': {
      const p = project(map, f.from);
      const rM = f.radius ?? 2;
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = col[1];
      ctx.lineWidth = 2;
      const seed = Math.floor(now / 50);
      // Lightning running through the water stays in it and stops at a metal wall (D13).
      const water = f.sig === 'water';
      const walls = water ? [...sc.state.walls, ...sc.pb.goneWalls()].filter((w) => w.kind === 'metal') : [];
      const stops = (a: Pt, b: Pt) => map.waterAt(b.x, b.z) === 'none' || walls.some((w) => segmentsCross(a, b, w.a, w.b));
      for (let i = 0; i < 9; i++) {
        const ang = ((i + seed * 0.37) / 9) * Math.PI * 2;
        ctx.beginPath();
        let x = p.X;
        let y = p.Y - (f.lift?.[0] ?? 0);
        ctx.moveTo(x, y);
        let prev = f.from;
        for (let k = 1; k <= 5; k++) {
          const rr = (k / 5) * rM;
          const q = { x: f.from.x + Math.cos(ang) * rr, z: f.from.z + Math.sin(ang) * rr };
          if (water && stops(prev, q)) break;
          prev = q;
          x = p.X + Math.cos(ang) * rr * map.px.perM + (((seed * 13 + i * 7 + k * 5) % 9) - 4) * 2;
          y = p.Y - (f.lift?.[0] ?? 0) + Math.sin(ang) * rr * map.px.perMDepth + (((seed * 11 + i * 3 + k * 7) % 7) - 3) * 2;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }
    case 'smoke': {
      const p = project(map, f.from);
      for (let i = 0; i < 7; i++) {
        const ang = (i / 7) * Math.PI * 2;
        const r = 6 + t * 18;
        ctx.globalAlpha = (1 - t) * 0.8;
        ctx.fillStyle = i % 2 ? '#e5e7eb' : '#cbd5e1';
        ctx.beginPath();
        ctx.arc(p.X + Math.cos(ang) * r, p.Y - 40 + Math.sin(ang) * r * 0.8 - t * 20, 9 + t * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'heal':
    case 'aura': {
      const p = project(map, fxPos(sc, f));
      p.X += auraDx(sc, f.unit);
      ctx.globalAlpha = 1 - t;
      const c = f.kind === 'heal' ? ['#bbf7d0', '#4ade80'] : f.sig === 'eyes' ? ['#fecaca', '#ef4444'] : [col[0], col[2]];
      ctx.strokeStyle = c[1];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.X, p.Y - 2, 24 + t * 8, 7 + t * 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = c[0];
      for (let i = 0; i < 10; i++) {
        const x = p.X + (((i * 29) % 40) - 20);
        const y = p.Y - 10 - ((t * 90 + i * 13) % 90);
        ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
      }
      break;
    }
    case 'noise': {
      const p = project(map, f.from);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 3; k++) {
        const tt = (t + k / 3) % 1;
        ctx.globalAlpha = 1 - tt;
        const r = (f.radius ?? 5) * tt;
        ctx.beginPath();
        ctx.ellipse(p.X, p.Y, r * map.px.perM, r * map.px.perMDepth, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'wall': {
      const p = project(map, f.from);
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = f.sig === 'debris' ? '#9aa3ad' : tinted ? col[1] : f.element === 'water' ? '#bae6fd' : '#c4a27a';
      for (let i = 0; i < 12; i++) {
        const x = p.X + (((i * 41) % 120) - 60);
        const y = p.Y - t * 40 - ((i * 17) % 30);
        ctx.fillRect(Math.round(x), Math.round(y), 3, 3);
      }
      break;
    }
    case 'seal': {
      const p = project(map, f.from);
      ctx.globalAlpha = 1 - t * t;
      if (f.sig === 'log') {
        ctx.fillStyle = '#7c5a3a';
        ctx.strokeStyle = '#2e1f12';
        ctx.lineWidth = 2;
        ctx.save();
        ctx.translate(p.X, p.Y - 10 + t * 6);
        ctx.rotate(-0.25 + t * 0.8);
        ctx.fillRect(-20, -7, 40, 14);
        ctx.strokeRect(-20, -7, 40, 14);
        ctx.restore();
      } else {
        ctx.fillStyle = '#f5f0dc';
        ctx.fillRect(p.X - 5, p.Y - 4 - t * 8, 10, 7);
      }
      break;
    }
    case 'fire': {
      const p = project(map, f.from);
      const y0 = p.Y - (f.lift?.[0] ?? 0);
      ctx.globalAlpha = 1 - t;
      for (let i = 0; i < 9; i++) {
        const fl = 10 + ((i * 7 + Math.floor(now / 70)) % 12);
        ctx.fillStyle = i % 3 === 0 ? col[0] : i % 3 === 1 ? col[1] : col[2];
        ctx.beginPath();
        ctx.ellipse(p.X + (((i * 23) % 36) - 18), y0 - fl, 4, fl, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }
  ctx.restore();
}

// --- light and weather ---------------------------------------------------------------------

let nightLayer: HTMLCanvasElement | null = null;

function drawNight(ctx: CanvasRenderingContext2D, sc: Scene, props: PropDef[]): void {
  const { cam, W, H, map } = sc;
  if (!nightLayer || nightLayer.width !== W || nightLayer.height !== H) {
    nightLayer = document.createElement('canvas');
    nightLayer.width = W;
    nightLayer.height = H;
  }
  const g = nightLayer.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(8, 14, 38, 0.62)';
  g.fillRect(0, 0, W, H);
  // A Shooting-Star Thrust's comet is light: round it the dark itself turns the phase's blue (only
  // clearing the dark would bring back the grass's own green, which reads as a green haze).
  const comets = warpLights(sc);
  g.globalCompositeOperation = 'source-atop';
  for (const l of comets) {
    const s = { x: (l.x - cam.x) * cam.k, y: (l.y - cam.y) * cam.k };
    const rr = l.r * 1.3 * cam.k;
    const [R, G, B] = PHASE_RAMP[2];
    const gr = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, rr);
    gr.addColorStop(0, `rgba(${R},${G},${B},${Math.min(1, 1.2 * l.a)})`);
    gr.addColorStop(1, `rgba(${R},${G},${B},0)`);
    g.fillStyle = gr;
    g.beginPath();
    g.arc(s.x, s.y, rr, 0, Math.PI * 2);
    g.fill();
  }
  g.globalCompositeOperation = 'destination-out';
  const toScreen = (X: number, Y: number) => ({ x: (X - cam.x) * cam.k, y: (Y - cam.y) * cam.k });
  const hole = (X: number, Y: number, r: number, a: number) => {
    const s = toScreen(X, Y);
    const rr = r * cam.k;
    const gr = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, rr);
    gr.addColorStop(0, `rgba(0,0,0,${a})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(s.x, s.y, rr, 0, Math.PI * 2);
    g.fill();
  };
  props.forEach((p, i) => {
    if (!p.glow || sc.state.props[i]?.destroyed) return;
    const s = project(map, p, p.level);
    hole(s.X, s.Y - 30, p.group === 'camp' ? 260 : 150, 0.9);
  });
  for (const u of Object.values(sc.state.units)) {
    if (u.team !== sc.team || u.down) continue;
    const s = project(map, sc.pb.posOf(u.id, sc.now));
    hole(s.X, s.Y - 50, 110, 0.55);
  }
  // And it lights the ground round it a little: the dark there thins, still blue.
  for (const l of comets) hole(l.x, l.y, l.r, l.a * 0.45);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(nightLayer, 0, 0);
  // Warm light around fires and lamps.
  ctx.globalCompositeOperation = 'lighter';
  props.forEach((p, i) => {
    if (!p.glow || sc.state.props[i]?.destroyed) return;
    const s0 = project(map, p, p.level);
    const s = toScreen(s0.X, s0.Y - 30);
    const r = (p.group === 'camp' ? 200 : 110) * cam.k;
    const [R, G, B] = p.glow;
    const gr = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
    gr.addColorStop(0, `rgba(${R},${G},${B},0.22)`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  // Blue light round the comet's head.
  for (const l of comets) {
    if (!l.head) continue;
    const s = toScreen(l.x, l.y);
    const r = l.r * cam.k;
    const [R, G, B] = PHASE_RAMP[3];
    const gr = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
    gr.addColorStop(0, `rgba(${R},${G},${B},${0.45 * l.a})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawRain(ctx: CanvasRenderingContext2D, sc: Scene): void {
  const { cam, W, H, now } = sc;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.strokeStyle = 'rgba(200, 220, 255, 0.35)';
  ctx.lineWidth = 1 * cam.k;
  ctx.beginPath();
  for (let i = 0; i < 220; i++) {
    const x = ((i * 977 + now * 0.25) % (W + 100)) - 50;
    const y = ((i * 613 + now * 0.9) % (H + 60)) - 30;
    ctx.moveTo(x, y);
    ctx.lineTo(x - 4 * cam.k, y + 14 * cam.k);
  }
  ctx.stroke();
  ctx.restore();
}

// --- screen-space marks --------------------------------------------------------------------

function drawMarks(ctx: CanvasRenderingContext2D, sc: Scene): void {
  const { cam, map, state, now, dpr } = sc;
  const toScreen = (X: number, Y: number) => ({ x: (X - cam.x - sc.shake.x) * cam.k, y: (Y - cam.y - sc.shake.y) * cam.k });
  const f = (px: number) => Math.round(px * dpr);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const badges: Badge[] = [];
  // Health bars over every standing unit (and the hydra's heads).
  for (const u of Object.values(state.units)) {
    const v = sc.pb.views.get(u.id);
    if (!v || v.fade || u.down === 'dead' || u.down === 'fled') continue;
    if (u.team !== sc.team && v.hidden) continue;
    const pos = sc.pb.posOf(u.id, now);
    let top: { X: number; Y: number };
    if (u.kind === 'hydra_head') {
      if (v.severed) continue;
      const px = hydraHeadPx(sc, u);
      const hp = project(map, pos, 0);
      top = px ? { X: px.X, Y: px.Y - 34 } : { X: hp.X, Y: hp.Y - 180 };
    } else if (u.kind === 'hydra_body') {
      const hp = project(map, pos, 0);
      top = { X: hp.X, Y: hp.Y - 110 };
    } else {
      const s = project(map, pos);
      top = { X: s.X, Y: s.Y - (v.pose === 'downed' ? 40 : 108) };
    }
    const s = toScreen(top.X, top.Y);
    const w = f(u.kind === 'hydra_body' ? 80 : 34);
    const h = f(4);
    const frac = Math.max(0, Math.min(1, v.hp / u.maxHp));
    ctx.fillStyle = 'rgba(8, 10, 18, 0.8)';
    ctx.fillRect(s.x - w / 2 - 1, s.y - 1, w + 2, h + 2);
    // An enemy under Command fights for the party for now: violet, not the hostile red.
    ctx.fillStyle = homeTeam(u) === 'party' ? (frac > 0.5 ? '#4ade80' : frac > 0.25 ? '#facc15' : '#f87171') : sc.pb.commandedNow(u) ? '#a78bfa' : '#ef4444';
    ctx.fillRect(s.x - w / 2, s.y, Math.round(w * frac), h);
    if (v.tempHp > 0) {
      ctx.fillStyle = '#93c5fd';
      ctx.fillRect(s.x - w / 2, s.y - f(2), Math.round(w * Math.min(1, v.tempHp / u.maxHp)), f(2));
    }
    // Suspicion meter above guards in the stealth phase.
    if (state.phase === 'stealth' && u.guard) {
      const sus = Math.max(0, ...Object.values(u.guard.suspicion));
      if (sus > 0) {
        ctx.fillStyle = 'rgba(8, 10, 18, 0.8)';
        ctx.fillRect(s.x - w / 2 - 1, s.y - f(8), w + 2, f(4));
        ctx.fillStyle = sus >= 70 ? '#f97316' : '#facc15';
        ctx.fillRect(s.x - w / 2, s.y - f(7), Math.round((w * sus) / 100), f(2));
      }
    }
    // An enemy under a Northstar's Command: a violet crown over its (violet) bar.
    if (sc.pb.commandedNow(u)) {
      ctx.font = `600 ${f(10)}px Inter, system-ui, sans-serif`;
      const tw = f(18);
      ctx.fillStyle = 'rgba(76, 29, 149, 0.9)';
      ctx.fillRect(s.x - tw / 2, s.y - f(22), tw, f(14));
      ctx.fillStyle = '#ede9fe';
      ctx.fillText('♛', s.x, s.y - f(15));
    }
    // What a Mirai foresees (where and whom is drawn on the ground): its kind, and whom it means
    // to act on. Laid out below, once every unit's place is known, so neighbours' don't stack.
    const it = sc.foreseen[u.id];
    if (it) badges.push({ id: u.id, it, x: s.x, y: s.y - f(22) });
  }
  drawIntentBadges(ctx, sc, badges, f);

  // Floating numbers and words.
  for (const fl of sc.pb.floaters) {
    const t = (now - fl.t0) / fl.dur;
    if (t < 0) continue;
    const p = project(map, fl.at);
    let s = toScreen(p.X, p.Y - fl.rise - t * 26);
    ctx.globalAlpha = t < 0.75 ? 1 : (1 - t) / 0.25;
    ctx.font = `800 ${f(fl.big ? 20 : 14)}px Inter, system-ui, sans-serif`;
    if (sc.avoid?.length) {
      // Clear of the cards and bars over the canvas.
      const tw = ctx.measureText(fl.text).width + f(6);
      const th = f(fl.big ? 24 : 18);
      const r = clearOf({ x: s.x - tw / 2, y: s.y - th / 2, w: tw, h: th }, sc.avoid, sc.W, sc.H, f(4));
      s = { x: r.x + tw / 2, y: r.y + th / 2 };
    }
    ctx.lineWidth = f(3);
    ctx.strokeStyle = 'rgba(5, 6, 12, 0.9)';
    ctx.strokeText(fl.text, s.x, s.y);
    ctx.fillStyle = fl.color;
    ctx.fillText(fl.text, s.x, s.y);
  }
  ctx.globalAlpha = 1;
}

/** A name short enough for a mark over a head: the first word, or all of it when numbered ("Rogue 2"). */
const shortName = (n: string): string => (/\d/.test(n) ? n : n.split(/[ ,]/)[0]);

/** A foreseen plan's mark over its enemy's bar: where it would sit (centre, top edge), in device pixels. */
interface Badge {
  id: string;
  it: Intent;
  x: number;
  y: number;
}

/**
 * The Eye of Tomorrow's marks over the enemies' heads. Neighbours' marks never overlap: one that
 * would is lifted above the other, with a thin stem down to its own enemy. The enemy under the
 * cursor gets a bright edge, like its lines on the ground.
 */
function drawIntentBadges(ctx: CanvasRenderingContext2D, sc: Scene, badges: Badge[], f: (px: number) => number): void {
  if (!badges.length) return;
  const { state } = sc;
  ctx.font = `600 ${f(10)}px Inter, system-ui, sans-serif`;
  const h = f(14);
  const icon = f(10);
  const gap = f(2);
  const laid: { b: Badge; name: string; x0: number; w: number; top: number }[] = [];
  // Front to back (lower on the screen first), so the nearer enemy keeps its mark in place.
  for (const b of [...badges].sort((p, q) => q.y - p.y || p.x - q.x)) {
    const tgt = b.it.target && b.it.kind !== 'defend' ? state.units[b.it.target] : undefined;
    const name = tgt ? shortName(unitName(tgt, sc.lang ?? 'en')) : '';
    const w = icon + (name ? f(4) + ctx.measureText(name).width : 0) + f(8);
    const x0 = b.x - w / 2;
    let top = b.y;
    for (let tries = 0; tries < 8; tries++) {
      const hit = laid.find((o) => x0 < o.x0 + o.w + gap && o.x0 < x0 + w + gap && top < o.top + h + gap && o.top < top + h + gap);
      if (!hit) break;
      top = hit.top - h - gap;
    }
    laid.push({ b, name, x0, w, top });
  }
  // A mark lifted over a neighbour's: a stem down to its own enemy's bar (under the marks).
  ctx.fillStyle = 'rgba(127, 29, 29, 0.85)';
  for (const { b, top } of laid) if (top < b.y) ctx.fillRect(Math.round(b.x - f(1) / 2), top + h, f(1), b.y + f(22) - top - h);
  for (const { b, name, x0, w, top } of laid) {
    const lit = sc.hover === b.id;
    ctx.fillStyle = lit ? 'rgba(185, 28, 28, 0.95)' : 'rgba(127, 29, 29, 0.85)';
    ctx.fillRect(x0, top, w, h);
    if (lit) {
      ctx.lineWidth = f(1);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.strokeRect(x0 + 0.5, top + 0.5, w - 1, h - 1);
    }
    const ix = x0 + f(4) + icon / 2;
    const cy = top + h / 2;
    drawIntentIcon(ctx, b.it, ix, cy, icon, '#fee2e2');
    if (name) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fee2e2';
      ctx.fillText(name, ix + icon / 2 + f(4), cy + f(1));
      ctx.textAlign = 'center';
    }
  }
}

/**
 * A plan's icon. A blow is drawn as a small upright blade (the crossed-swords glyph reads as an "✕"
 * at the tactical zoom); the others are glyphs.
 */
function drawIntentIcon(ctx: CanvasRenderingContext2D, it: Intent, cx: number, cy: number, size: number, color: string): void {
  ctx.fillStyle = color;
  if (it.kind === 'melee') {
    const u = size / 10;
    const r = (x: number, y: number, w: number, hh: number) => ctx.fillRect(Math.round(cx + x * u), Math.round(cy + y * u), Math.max(1, Math.round(w * u)), Math.max(1, Math.round(hh * u)));
    // Blade with its point, crossguard, grip and pommel.
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5.5 * u);
    ctx.lineTo(cx + 1.5 * u, cy - 3.5 * u);
    ctx.lineTo(cx + 1.5 * u, cy + 1.5 * u);
    ctx.lineTo(cx - 1.5 * u, cy + 1.5 * u);
    ctx.lineTo(cx - 1.5 * u, cy - 3.5 * u);
    ctx.closePath();
    ctx.fill();
    r(-3.5, 1.5, 7, 1.5);
    r(-0.75, 3, 1.5, 2);
    r(-1.25, 5, 2.5, 1);
    return;
  }
  ctx.fillText(INTENT_ICON[it.kind] ?? '?', cx, cy + size / 10);
}

const INTENT_ICON: Record<string, string> = { melee: '⚔', ranged: '➶', jutsu: '✦', bite: '☠', spit: '☣', roar: '!', heal: '✚', defend: '⛨', move: '➜', command: '♛' };
export const intentIcon = (i: Intent): string => INTENT_ICON[i.kind] ?? '?';

// --- picking -------------------------------------------------------------------------------

export function screenToWorld(cam: Camera, sx: number, sy: number): { X: number; Y: number } {
  return { X: sx / cam.k + cam.x, Y: sy / cam.k + cam.y };
}

/** The ground point under a map pixel, taking the terrain's levels into account (front first). */
export function pickGround(map: MapDef, X: number, Y: number): Pt | null {
  const x = X / map.px.perM;
  if (x < 0 || x > map.widthM) return null;
  for (let z = map.depthM - CELL / 2; z >= 0; z -= CELL / 4) {
    const lvl = map.levelAt(x, z);
    const y = map.px.backY + z * map.px.perMDepth - lvl * map.px.level;
    if (Math.abs(Y - y) <= (CELL / 4) * map.px.perMDepth + 0.5) return { x, z };
  }
  return null;
}

/** The unit under a map pixel (its sprite's body), the nearest to the viewer first. */
export function pickUnit(sc: { state: BattleState; pb: Playback; map: MapDef; now: number }, X: number, Y: number): string | undefined {
  let best: { id: string; z: number } | undefined;
  for (const u of Object.values(sc.state.units)) {
    const v = sc.pb.views.get(u.id);
    if (!v || v.fade || u.down === 'dead' || u.down === 'fled' || u.kind === 'hydra_body') continue;
    const pos = sc.pb.posOf(u.id, sc.now);
    let hit: boolean;
    if (u.kind === 'hydra_head') {
      if (v.severed && u.head?.sealed) continue;
      const px = hydraHeadPx(sc, u);
      const p = project(sc.map, pos, 0);
      const hx = px ? px.X : p.X;
      const hy = px ? (v.severed ? px.Y + 60 : px.Y) : v.severed ? p.Y - 80 : p.Y - 150;
      hit = Math.abs(X - hx) < 28 && Math.abs(Y - hy) < 26;
    } else {
      const p = project(sc.map, pos);
      const downed = v.pose === 'downed';
      hit = Math.abs(X - p.X) < (downed ? 34 : 18) && Y <= p.Y + 4 && Y >= p.Y - (downed ? 30 : 100);
    }
    if (hit && (!best || pos.z > best.z)) best = { id: u.id, z: pos.z };
  }
  if (!best) {
    // The hydra's body is a big target.
    const body = Object.values(sc.state.units).find((u) => u.kind === 'hydra_body' && !u.down);
    if (body) {
      const p = project(sc.map, body.pos, 0);
      if (Math.abs(X - p.X) < 140 && Y < p.Y && Y > p.Y - 96) return body.id;
    }
  }
  return best?.id;
}

/** A point inside a polygon (even-odd rule). */
function inPoly(pts: Px[], X: number, Y: number): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a.Y > Y !== b.Y > Y && X < ((b.X - a.X) * (Y - a.Y)) / (b.Y - a.Y) + a.X) inside = !inside;
  }
  return inside;
}

/** The breakable structure drawn under a map pixel, the nearest to the viewer first. */
export function pickStructure(sc: { state: BattleState; map: MapDef }, X: number, Y: number): string | undefined {
  let best: { id: string; z: number } | undefined;
  for (const w of sc.state.walls) {
    if (!breakable(w)) continue;
    const box = steelBox(sc.map, w);
    const hit = inPoly(box.top, X, Y) || box.sides.some((f) => inPoly(f.pts, X, Y));
    const z = (w.a.z + w.b.z) / 2;
    if (hit && (!best || z > best.z)) best = { id: w.id, z };
  }
  return best?.id;
}

export { dist };
