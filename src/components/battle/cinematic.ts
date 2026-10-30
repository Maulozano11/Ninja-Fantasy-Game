// Cinematics made by tools/cinematics/ (render.py): a video without the party and a manifest that
// says where each unit stands and what the camera did on every frame. The player draws the real
// units over the video under that same camera, so a cinematic always shows the player's own ninjas.
// Pure: no DOM, so it is tested with node.

/** The camera of one frame, as tools/cinematics/cine/core.py Camera.params writes it. */
export interface CinematicCamera {
  zoom: number;
  x0: number;
  y0: number;
  cw: number;
  ch: number;
  sx: number;
  sy: number;
}

/** Where the game draws one of its units: feet at (x, y) of the unzoomed scene, `scale` of its battle sprite. */
export interface CinematicUnit {
  role: string;
  x: number;
  y: number;
  scale: number;
}

export interface CinematicManifest {
  name: string;
  fps: number;
  size: [number, number];
  frames: number;
  units: CinematicUnit[];
  camera: CinematicCamera[];
}

/** The frame shown at `time` seconds (clamped to the last one). */
export function frameAt(m: Pick<CinematicManifest, 'fps' | 'frames'>, time: number): number {
  return Math.max(0, Math.min(m.frames - 1, Math.floor(time * m.fps + 1e-6)));
}

/**
 * Where a point of the unzoomed scene lands on the finished frame, and how much it is scaled
 * (the same sums as Camera.to_screen in core.py): the push-in crops and enlarges, the shake moves.
 */
export function toScreen(cam: CinematicCamera, x: number, y: number, width: number): { x: number; y: number; k: number } {
  const k = cam.zoom > 1 ? width / cam.cw : 1;
  const zx = cam.zoom > 1 ? (x - cam.x0) * k : x;
  const zy = cam.zoom > 1 ? (y - cam.y0) * k : y;
  return { x: zx + cam.sx, y: zy + cam.sy, k };
}

/**
 * Where to draw a unit's sprite on a canvas of `canvasW` x `canvasH` showing the cinematic: its feet
 * point and its pixel scale. `spriteScale` is how many canvas pixels one of the sprite's fine pixels
 * takes at scene scale (the battle's own scale, 1 at the cinematic's 960 px width).
 */
export function unitPlacement(
  m: CinematicManifest,
  frame: number,
  unit: CinematicUnit,
  canvasW: number,
): { x: number; y: number; scale: number } {
  const cam = m.camera[Math.max(0, Math.min(m.camera.length - 1, frame))];
  const p = toScreen(cam, unit.x, unit.y, m.size[0]);
  const fit = canvasW / m.size[0];
  return { x: p.x * fit, y: p.y * fit, scale: unit.scale * p.k * fit };
}
