// Draws a battle on a canvas: the painted map, scenery and units sorted by depth, the tactical
// overlays (reach, path, areas, vision cones, intents), jutsu effects, numbers and the night.
// One world pixel is drawn as `k` device pixels (an integer), so the pixel art stays crisp.

import type { AreaShape, BattleState, Cell, Intent, PropDef, Pt, Trap, Unit, Wall } from '../../battle/types';
import type { MapDef } from '../../battle/map';
import { BLOCK_HALF, CELL, cellCenter, dist } from '../../battle/map';
import { breakable } from '../../battle/structures';
import { lookOf as guardLook, VISION } from '../../battle/stealth';
import { worldSprite } from '../world/WorldSpriteView';
import type { MapArt } from './mapArt';
import type { Fx, Playback } from './playback';
import { bodyCenterDx, FEET, fpsOf, framesOf, lookOf, STRIDE, unitFrame } from './unitArt';
import { drawAuraBack, drawVfxSprite, drawWallSprite } from './vfxSprites';

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

  // Everything that stands, sorted by depth.
  const items: { z: number; draw: () => void }[] = [];
  const all: PropDef[] = [...map.props, ...art.extras];
  all.forEach((p, i) => {
    const st = i < map.props.length ? state.props[i] : undefined;
    if (st?.destroyed) return;
    items.push({ z: p.sortZ ?? p.z, draw: () => drawProp(ctx, sc, p, i < map.props.length ? i : -1) });
  });
  // Walls broken by events still playing stand until their moment comes.
  for (const w of [...state.walls, ...sc.pb.goneWalls()]) items.push({ z: (w.a.z + w.b.z) / 2, draw: () => drawWall(ctx, sc, w) });
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
    items.push({ z: pos.z + 0.01, draw: () => drawUnit(ctx, sc, u, pos) });
  }
  void hydra;
  // An aura's back layer sits just behind its caster.
  for (const fx of sc.pb.fx) if (fx.kind === 'aura') items.push({ z: fx.from.z + 0.005, draw: () => drawAuraBack(ctx, sc, fx) });
  items.sort((a, b) => a.z - b.z);
  for (const it of items) it.draw();

  for (const fx of sc.pb.fx) if (!drawVfxSprite(ctx, sc, fx)) drawFx(ctx, sc, fx);

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
  // Traps the party can see.
  for (const t of state.traps) if (t.owner === sc.team || t.spotted) drawTrap(ctx, map, t);
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

function drawWall(ctx: CanvasRenderingContext2D, sc: Scene, w: Wall): void {
  // Not raised yet: its event is still waiting in the playback queue.
  if (sc.pb.queue.some((e) => e.t === 'wall' && e.on && e.wall.id === w.id)) return;
  // A block is always drawn; a wall plays its element's sheet when the game has one.
  if (w.kind === 'metalBlock') drawSteel(ctx, sc, w);
  else if (!drawWallSprite(ctx, sc, w)) {
    if (w.kind === 'metal') drawSteel(ctx, sc, w);
    else drawWallShape(ctx, sc, w);
  }
  drawWallHp(ctx, sc, w);
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
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pa.X, pa.Y);
  ctx.lineTo(pb.X, pb.Y);
  ctx.lineTo(pb.X, pb.Y - h);
  ctx.lineTo(pa.X, pa.Y - h);
  ctx.closePath();
  if (kind === 'earth') {
    const g = ctx.createLinearGradient(0, pa.Y - h, 0, pa.Y);
    g.addColorStop(0, '#b08a5a');
    g.addColorStop(1, '#5b3d22');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#2c1d10';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    const t = sc.now / 300;
    const g = ctx.createLinearGradient(0, pa.Y - h, 0, pa.Y);
    g.addColorStop(0, 'rgba(186, 236, 255, 0.55)');
    g.addColorStop(0.5 + 0.1 * Math.sin(t), 'rgba(76, 170, 230, 0.45)');
    g.addColorStop(1, 'rgba(30, 100, 180, 0.55)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(220, 245, 255, 0.8)';
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
function steelBox(map: MapDef, w: Wall): { sides: { pts: Px[]; right: number; len: number }[]; top: Px[] } {
  const foot = footprint(w);
  const c = { x: foot.reduce((a, p) => a + p.x, 0) / 4, z: foot.reduce((a, p) => a + p.z, 0) / 4 };
  const lvl = map.levelAt(c.x, c.z);
  const h = WALL_H[w.kind];
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
function drawSteel(ctx: CanvasRenderingContext2D, sc: Scene, w: Wall): void {
  const { sides, top } = steelBox(sc.map, w);
  const h = WALL_H[w.kind];
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

function drawUnit(ctx: CanvasRenderingContext2D, sc: Scene, u: Unit, pos: Pt): void {
  const v = sc.pb.views.get(u.id)!;
  const { map, now } = sc;
  const lvl = map.levelAt(pos.x, pos.z);
  const s = project(map, pos, lvl);
  let alpha = 1;
  if (v.fade) {
    alpha = Math.max(0, 1 - (now - v.fade.t0) / v.fade.dur);
    if (alpha <= 0) return;
  }
  if (v.hidden) alpha *= u.team === sc.team ? 0.55 : 0.35;
  if (v.down === 'dead' && u.team === 'enemy') alpha *= 0.75;
  const water = map.waterAt(pos.x, pos.z);
  const swimming = water === 'deep' && !u.cond.waterWalk && !v.walk ? true : water === 'deep' && !u.cond.waterWalk;

  // Shadow, and the ring of the selected or acting ninja.
  ctx.save();
  ctx.globalAlpha = alpha * 0.35;
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
        ? `rgba(248, 113, 113, ${pulse})`
        : acting
          ? `rgba(250, 204, 21, ${pulse})`
          : u.team === 'party'
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
    const oneShot = v.pose === 'attack' || v.pose === 'hurt' || v.pose === 'cast';
    frame = Math.floor(elapsed * fpsOf(v.pose));
    if (oneShot) frame = Math.min(frame, n - 1);
  }
  const aura = v.pose === 'cast' ? { mode: 'cast' as const, tick: Math.floor(now / 83) } : undefined;
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
  ctx.save();
  ctx.globalAlpha = alpha * (hurt && Math.floor(now / 60) % 2 ? 0.55 : 1);
  const x0 = Math.round(s.X + lx);
  const y0 = Math.round(s.Y + ly - FEET.y);
  // In the river the body sinks: deep water hides the legs, shallow water the feet.
  if (water !== 'none' && v.pose !== 'downed') {
    ctx.beginPath();
    ctx.rect(x0 - 70, y0 - 20, 140, FEET.y + 20 - (swimming ? 38 : 8));
    ctx.clip();
  }
  if (v.facing < 0) {
    ctx.translate(x0, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(fr.canvas, -FEET.x, y0);
  } else ctx.drawImage(fr.canvas, x0 - FEET.x, y0);
  ctx.restore();
  if (water !== 'none' && v.pose !== 'downed') {
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
  const col = ELEMENT_COLORS[f.element] ?? ELEMENT_COLORS.chakra;
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
      for (let i = 0; i < 9; i++) {
        const ang = ((i + seed * 0.37) / 9) * Math.PI * 2;
        ctx.beginPath();
        let x = p.X;
        let y = p.Y - (f.lift?.[0] ?? 0);
        ctx.moveTo(x, y);
        for (let k = 1; k <= 5; k++) {
          const rr = (k / 5) * rM;
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
      const p = project(map, f.from);
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
      ctx.fillStyle = f.sig === 'debris' ? '#9aa3ad' : f.element === 'water' ? '#bae6fd' : '#c4a27a';
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
    ctx.fillStyle = u.team === 'party' ? (frac > 0.5 ? '#4ade80' : frac > 0.25 ? '#facc15' : '#f87171') : '#ef4444';
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
    // What a Mirai foresees.
    const it = sc.foreseen[u.id];
    if (it) {
      const tgt = it.target ? state.units[it.target] : undefined;
      if (tgt) {
        const tp = project(map, sc.pb.posOf(tgt.id, now));
        const ts = toScreen(tp.X, tp.Y - 60);
        ctx.save();
        ctx.setLineDash([f(4), f(4)]);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = f(1.5);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y + f(10));
        ctx.lineTo(ts.x, ts.y);
        ctx.stroke();
        ctx.restore();
      }
      ctx.font = `600 ${f(10)}px Inter, system-ui, sans-serif`;
      const label = intentIcon(it);
      ctx.fillStyle = 'rgba(127, 29, 29, 0.85)';
      const tw = ctx.measureText(label).width + f(8);
      ctx.fillRect(s.x - tw / 2, s.y - f(22), tw, f(14));
      ctx.fillStyle = '#fee2e2';
      ctx.fillText(label, s.x, s.y - f(15));
    }
  }

  // Floating numbers and words.
  for (const fl of sc.pb.floaters) {
    const t = (now - fl.t0) / fl.dur;
    if (t < 0) continue;
    const p = project(map, fl.at);
    const s = toScreen(p.X, p.Y - fl.rise - t * 26);
    ctx.globalAlpha = t < 0.75 ? 1 : (1 - t) / 0.25;
    ctx.font = `800 ${f(fl.big ? 20 : 14)}px Inter, system-ui, sans-serif`;
    ctx.lineWidth = f(3);
    ctx.strokeStyle = 'rgba(5, 6, 12, 0.9)';
    ctx.strokeText(fl.text, s.x, s.y);
    ctx.fillStyle = fl.color;
    ctx.fillText(fl.text, s.x, s.y);
  }
  ctx.globalAlpha = 1;
}

const INTENT_ICON: Record<string, string> = { melee: '⚔', ranged: '➶', jutsu: '✦', bite: '☠', spit: '☣', roar: '!', heal: '✚', defend: '⛨', move: '➜' };
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
