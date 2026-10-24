// The camera's farthest view, in map meters: where the Gale Dragon Ray runs and does its harm. The
// owner (2026-10-24): "si no se puede ver en la forma mas alejada de la vista no hace efectos ni
// daño", "la cuento desde donde el jugador pueda hacer la camara lo mas lejos tiene que ver con la
// camara no con aurelia", and "mejor para optimizar mas el juego que el rayo se detenga donde el
// jugador ya no puede ver con la vista mas alejada". The player's screen sends the piece of the map
// its camera shows at its farthest zoom (around wherever the camera is) with the cast; the engine
// only checks that it is no bigger than that view can be (docs/GAMEPLAY_DESIGN.md, "The Gale Dragon
// Ray").

import type { MapDef } from './map';
import type { AreaShape, Pt, ViewRect } from './types';

/** The camera's farthest zoom step: three times farther out than Tactical (BattleScreen's ZOOMS end with it). */
export const FAR_ZOOM = 1 / 3;

/**
 * The biggest screen the farthest view is counted for, in CSS pixels: a Full HD screen. A bigger
 * window still sees more, but the jutsu's reach stops at what a Full HD screen shows (the same for
 * every player, and for the AI, which has no camera).
 */
export const FAR_SCREEN = { w: 1920, h: 1080 };

/** How much of the map (m across, m in depth) the camera shows at its farthest zoom on a screen of `screen` CSS pixels. */
export function farViewSize(map: MapDef, screen: { w: number; h: number } = FAR_SCREEN): { w: number; d: number } {
  return { w: screen.w / FAR_ZOOM / map.px.perM, d: screen.h / FAR_ZOOM / map.px.perMDepth };
}

/** One axis of the view, kept on the map like the camera keeps itself: a view wider than the map holds the map in its middle. */
function clampAxis(a0: number, a1: number, extent: number): [number, number] {
  const size = a1 - a0;
  if (size >= extent) return [(extent - size) / 2, (extent + size) / 2];
  const lo = Math.max(0, Math.min(extent - size, a0));
  return [lo, lo + size];
}

/** The farthest view centred on `center` (the AI's, centred on its best target), kept on the map. */
export function viewAround(map: MapDef, center: Pt, screen: { w: number; h: number } = FAR_SCREEN): ViewRect {
  const { w, d } = farViewSize(map, screen);
  return fitView(map, { x0: center.x - w / 2, z0: center.z - d / 2, x1: center.x + w / 2, z1: center.z + d / 2 });
}

/**
 * A view as the engine takes it: no bigger than the farthest view of a Full HD screen (a bigger one
 * shrinks around its middle, so a bad action can't widen it), and kept on the map.
 */
export function fitView(map: MapDef, v: ViewRect): ViewRect {
  const max = farViewSize(map);
  const cx = (v.x0 + v.x1) / 2;
  const cz = (v.z0 + v.z1) / 2;
  const w = Math.min(max.w, Math.max(0, Math.abs(v.x1 - v.x0)));
  const d = Math.min(max.d, Math.max(0, Math.abs(v.z1 - v.z0)));
  const [x0, x1] = clampAxis(cx - w / 2, cx + w / 2, map.widthM);
  const [z0, z1] = clampAxis(cz - d / 2, cz + d / 2, map.depthM);
  return { x0, z0, x1, z1 };
}

/** A point is in the view. */
export const inView = (v: ViewRect, p: Pt): boolean => p.x >= v.x0 && p.x <= v.x1 && p.z >= v.z0 && p.z <= v.z1;

/**
 * The part of a straight run from `origin` along `dir` (degrees) for `length` m that lies in the view,
 * as the distances along it where it enters and leaves (null when it misses the view).
 */
export function runInView(v: ViewRect, origin: Pt, dir: number, length: number): { from: number; to: number } | null {
  const a = (dir * Math.PI) / 180;
  const d = [Math.cos(a), Math.sin(a)];
  const o = [origin.x, origin.z];
  let t0 = 0;
  let t1 = length;
  for (const [i, lo, hi] of [[0, v.x0, v.x1], [1, v.z0, v.z1]] as const) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < lo || o[i] > hi) return null;
      continue;
    }
    const u0 = (lo - o[i]) / d[i];
    const u1 = (hi - o[i]) / d[i];
    t0 = Math.max(t0, Math.min(u0, u1));
    t1 = Math.min(t1, Math.max(u0, u1));
    if (t0 > t1) return null;
  }
  return { from: t0, to: t1 };
}

/** A line from where it starts to where it leaves the view (no length when the view misses it). */
export function lineToView(line: AreaShape, v: ViewRect): AreaShape {
  if (line.kind !== 'line') return line;
  const run = runInView(v, line.origin, line.dir, line.length);
  return { ...line, length: run ? run.to : 0 };
}

/** The stretch of a line the view holds, as a line of its own (null when the view misses it). */
export function lineInView(line: AreaShape, v: ViewRect): AreaShape | null {
  if (line.kind !== 'line') return line;
  const run = runInView(v, line.origin, line.dir, line.length);
  if (!run) return null;
  const a = (line.dir * Math.PI) / 180;
  return { ...line, origin: { x: line.origin.x + Math.cos(a) * run.from, z: line.origin.z + Math.sin(a) * run.from }, length: run.to - run.from };
}
