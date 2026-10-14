// The painted night camp (tools/scenes/camp_night.py) and the night grade for the sprites drawn in
// it: the party and the campsite props are day-lit world sprites, so each frame is graded once,
// in a canvas pass, to the moon and the fire (the same grade as tools/scenes/camp_preview.py) and
// cached. Nothing here re-grades per animation tick.

import scene from '../../assets/scenes/camp_night/scene.json';
import skyUrl from '../../assets/scenes/camp_night/sky.png';
import farUrl from '../../assets/scenes/camp_night/forest_far.png';
import midUrl from '../../assets/scenes/camp_night/forest_mid.png';
import groundUrl from '../../assets/scenes/camp_night/ground.png';
import groundNoFireUrl from '../../assets/scenes/camp_night/ground_nofire.png';
import frameBackUrl from '../../assets/scenes/camp_night/frame_back.png';
import frameFrontUrl from '../../assets/scenes/camp_night/frame_front.png';
import { renderSpriteCached } from '../../sprite/compose';
import { dojutsuToEye, getAppearance } from '../../sprite/legacy';
import { frameCount, POSE_FPS, rigPoseFor } from '../../sprite/rig';
import { GRID } from '../../sprite/raster';
import type { SpriteAppearance, SpritePose } from '../../sprite/types';
import type { ShinobiCharacter } from '../../types/shinobi';
import { worldSprite } from '../world/WorldSpriteView';

export const SCENE_W = scene.size[0];
export const SCENE_H = scene.size[1];
export const FIRE = { x: scene.fire.x, y: scene.fire.y, flameY: scene.fire.flameY };
/** Where the party stands round the fire (up to four), facing it. */
export const SPOTS = scene.spots.map((s) => ({ x: s.x, y: s.y, flip: s.facing === 'left' }));

export interface ScenePropDef {
  group: string;
  name: string;
  x: number;
  y: number;
  anim?: string;
  flip?: boolean;
  z?: number;
  shrine?: boolean;
}
export const PROPS: ScenePropDef[] = scene.props as ScenePropDef[];

// --- layers -----------------------------------------------------------------------------------

const LAYER_URLS = { sky: skyUrl, far: farUrl, mid: midUrl, ground: groundUrl, groundNoFire: groundNoFireUrl, back: frameBackUrl, front: frameFrontUrl };
export type LayerName = keyof typeof LAYER_URLS;
const layerImgs = new Map<LayerName, HTMLImageElement>();
let layersReady: Promise<void> | null = null;

/** Loads the scene's layers once (resolves when every image has decoded). */
export function loadLayers(): Promise<void> {
  if (!layersReady)
    layersReady = Promise.all(
      (Object.keys(LAYER_URLS) as LayerName[]).map(
        (k) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = LAYER_URLS[k];
            layerImgs.set(k, img);
          }),
      ),
    ).then(() => undefined);
  return layersReady;
}
export const layer = (k: LayerName): HTMLImageElement | undefined => layerImgs.get(k);

// --- light ------------------------------------------------------------------------------------

/** How strongly the fire lights the camp: strength 0..1 and a reach multiplier. */
export interface FireLight {
  k: number;
  reach: number;
  /** How much of the fire's warm pool shows on the ground (ground.png over ground_nofire.png). */
  pool: number;
  /** Warm light in the air round the flames. */
  air: number;
}
export const lightKey = (l: FireLight): string => `${l.k}|${l.reach}`;

const G = scene.grade;
const RIM_WARM = [255, 178, 104];
const RIM_COOL = [128, 156, 192];

function warmColor(r: number, g: number, b: number, t: number): [number, number, number] {
  const lum = (r * 0.3 + g * 0.59 + b * 0.11) / 255;
  const add = t * (0.5 + 0.9 * lum);
  return [
    Math.min(255, r * (1 - t) + r * G.fireTint[0] * t + G.fireAdd[0] * add),
    Math.min(255, g * (1 - t) + g * G.fireTint[1] * t + G.fireAdd[1] * add),
    Math.min(255, b * (1 - t) + b * G.fireTint[2] * t + G.fireAdd[2] * add),
  ];
}

/**
 * The night grade of one sprite frame whose top-left lands at (x0, y0) and that stands on the
 * ground at groundY: moon multiply and ambient, firelight by distance in four flat levels, a warm
 * rim on the silhouette edges facing the fire and a faint cool rim on those facing the upper right.
 * Bright fire colours are kept as they are when `emissive` (flames, coals, a lit lantern window).
 */
export function gradeFrame(src: Uint8ClampedArray, w: number, h: number, x0: number, y0: number, groundY: number, light: FireLight, emissive = false): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  const op = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 0;
  const flameH = (FIRE.y - FIRE.flameY) / 57;
  const reach = 1.8 * light.reach;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = src[i + 3];
      if (!a) continue;
      const r0 = src[i], g0 = src[i + 1], b0 = src[i + 2];
      out[i + 3] = a;
      if (emissive && r0 > 140 && r0 > 2 * b0 && r0 > 1.15 * g0) {
        out[i] = r0;
        out[i + 1] = g0;
        out[i + 2] = b0;
        continue;
      }
      let r = r0 * G.moonMul[0] + G.moonAdd[0];
      let g = g0 * G.moonMul[1] + G.moonAdd[1];
      let b = b0 * G.moonMul[2] + G.moonAdd[2];
      const X = x + x0, Y = y + y0;
      let wv = 0;
      if (light.k > 0) {
        const hm = Math.max(0, groundY - Y) / 57;
        const d = Math.sqrt(((X - FIRE.x) / 57) ** 2 + ((groundY - FIRE.y) / 38) ** 2 + ((hm - flameH) * 0.7) ** 2);
        wv = Math.max(0, Math.min(1, 1.4 / (1 + (d / reach) ** 2) - 0.1)) * light.k;
        const lv = Math.max(0, Math.min(3, Math.floor(wv * 2.7 + 0.3)));
        if (lv) [r, g, b] = warmColor(r, g, b, G.fireLevels[lv]);
      }
      const sx = Math.sign(FIRE.x - X) || 1;
      if (wv > 0.12 && (!op(x + sx, y) || !op(x + sx, y - 1))) {
        const k = 0.35 + 0.4 * wv;
        r = r * 0.45 + RIM_WARM[0] * k;
        g = g * 0.45 + RIM_WARM[1] * k;
        b = b * 0.45 + RIM_WARM[2] * k;
      } else if (!op(x + 1, y - 1)) {
        r = r * 0.75 + RIM_COOL[0] * 0.25;
        g = g * 0.75 + RIM_COOL[1] * 0.25;
        b = b * 0.75 + RIM_COOL[2] * 0.25;
      }
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
    }
  return out;
}

function toCanvas(rgba: Uint8ClampedArray, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h), 0, 0);
  return c;
}

/** A bounded cache (oldest entries go first). */
class Lru<V> {
  private m = new Map<string, V>();
  constructor(private max: number) {}
  get(k: string): V | undefined {
    const v = this.m.get(k);
    if (v !== undefined) {
      this.m.delete(k);
      this.m.set(k, v);
    }
    return v;
  }
  set(k: string, v: V): void {
    this.m.set(k, v);
    if (this.m.size > this.max) this.m.delete(this.m.keys().next().value as string);
  }
}

// --- world sprites ----------------------------------------------------------------------------

export interface GradedSprite {
  frames: HTMLCanvasElement[];
  fps: number;
  loop: boolean;
  x0: number;
  y0: number;
}
const spriteCache = new Lru<GradedSprite>(160);
const sheetPixels = new Map<string, ImageData>();

function sheetData(img: HTMLImageElement, key: string): ImageData | undefined {
  let d = sheetPixels.get(key);
  if (d) return d;
  if (!img.complete || !img.naturalWidth) return undefined;
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d')!;
  g.drawImage(img, 0, 0);
  d = g.getImageData(0, 0, c.width, c.height);
  sheetPixels.set(key, d);
  return d;
}

/** Every frame of one placed world sprite, graded for this light (undefined until its sheet loads). */
export function gradedSprite(p: ScenePropDef, anim: string | undefined, light: FireLight, emissive = false): GradedSprite | undefined {
  const ws = worldSprite(p.group, p.name);
  if (!ws) return undefined;
  const { spec, img } = ws;
  const a = (anim && spec.anims[anim]) || Object.values(spec.anims).sort((x, y) => x.row - y.row)[0];
  const ax = p.flip ? spec.frameW - 1 - spec.anchor[0] : spec.anchor[0];
  const x0 = p.x - ax, y0 = p.y - spec.anchor[1];
  const key = `${p.group}/${p.name}/${a.row}/${x0},${y0}/${p.flip ? 1 : 0}/${lightKey(light)}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const data = sheetData(img, `${p.group}/${spec.file}`);
  if (!data) return undefined;
  const frames: HTMLCanvasElement[] = [];
  const fw = spec.frameW, fh = spec.frameH;
  for (let f = 0; f < a.frames; f++) {
    const raw = new Uint8ClampedArray(fw * fh * 4);
    for (let y = 0; y < fh; y++)
      for (let x = 0; x < fw; x++) {
        const sx = f * fw + (p.flip ? fw - 1 - x : x), sy = a.row * fh + y;
        const si = (sy * data.width + sx) * 4, di = (y * fw + x) * 4;
        raw[di] = data.data[si];
        raw[di + 1] = data.data[si + 1];
        raw[di + 2] = data.data[si + 2];
        raw[di + 3] = data.data[si + 3];
      }
    frames.push(toCanvas(gradeFrame(raw, fw, fh, x0, y0, p.y, light, emissive), fw, fh));
  }
  const g: GradedSprite = { frames, fps: a.fps, loop: a.loop, x0, y0 };
  spriteCache.set(key, g);
  return g;
}

// --- the party --------------------------------------------------------------------------------

const looks = new WeakMap<ShinobiCharacter, SpriteAppearance>();
const lookIds = new WeakMap<SpriteAppearance, number>();
let lookSerial = 0;
function lookOf(m: ShinobiCharacter): SpriteAppearance {
  let l = looks.get(m);
  if (!l) {
    l = getAppearance(m);
    looks.set(m, l);
    lookIds.set(l, ++lookSerial);
  }
  return l;
}

/** True once the sprite system knows a pose (new camp poses may land later). */
export const knownPose = (p: string): p is SpritePose => p in POSE_FPS;

export function poseFrames(m: ShinobiCharacter, pose: SpritePose): { n: number; fps: number } {
  const look = lookOf(m);
  return { n: Math.max(1, frameCount(rigPoseFor(pose, look.cast?.style))), fps: POSE_FPS[pose] ?? 3 };
}

const partyCache = new Lru<HTMLCanvasElement>(400);
/** Where the feet touch the ground in a 128 x 128 sprite frame. */
export const FEET = { x: 64, y: 120 };

/** One graded frame of a party member standing at (x, y), mirrored when facing left. */
export function gradedMember(m: ShinobiCharacter, pose: SpritePose, frame: number, x: number, y: number, flip: boolean, light: FireLight): HTMLCanvasElement {
  const look = lookOf(m);
  const key = `${m.id}|${lookIds.get(look)}|${pose}|${frame}|${x},${y}|${flip ? 1 : 0}|${lightKey(light)}`;
  const hit = partyCache.get(key);
  if (hit) return hit;
  const spr = renderSpriteCached(look, pose, frame, dojutsuToEye(m.dojutsu));
  let rgba = spr.rgba;
  if (flip) {
    rgba = new Uint8ClampedArray(spr.rgba.length);
    for (let yy = 0; yy < GRID; yy++)
      for (let xx = 0; xx < GRID; xx++) {
        const si = (yy * GRID + (GRID - 1 - xx)) * 4, di = (yy * GRID + xx) * 4;
        rgba[di] = spr.rgba[si];
        rgba[di + 1] = spr.rgba[si + 1];
        rgba[di + 2] = spr.rgba[si + 2];
        rgba[di + 3] = spr.rgba[si + 3];
      }
  }
  const fx = flip ? GRID - 1 - FEET.x : FEET.x;
  const c = toCanvas(gradeFrame(rgba, GRID, GRID, x - fx, y - FEET.y, y, light), GRID, GRID);
  partyCache.set(key, c);
  return c;
}

// --- backdrop and light overlays (built once per light) ----------------------------------------

const backdrops = new Lru<HTMLCanvasElement>(6);

/** The layers behind the props and the party (sky to frame_back), the fire's pool mixed in. */
export function backdrop(light: FireLight): HTMLCanvasElement | undefined {
  const key = `${light.pool}`;
  const hit = backdrops.get(key);
  if (hit) return hit;
  const names: LayerName[] = ['sky', 'far', 'mid', 'groundNoFire', 'ground', 'back'];
  if (names.some((n) => !layer(n)?.naturalWidth)) return undefined;
  const c = document.createElement('canvas');
  c.width = SCENE_W;
  c.height = SCENE_H;
  const g = c.getContext('2d')!;
  for (const n of names) {
    g.globalAlpha = n === 'ground' ? light.pool : 1;
    if (n === 'ground' && light.pool <= 0) continue;
    g.drawImage(layer(n)!, 0, 0);
  }
  g.globalAlpha = 1;
  backdrops.set(key, c);
  return c;
}

const glows = new Map<string, HTMLCanvasElement>();

/**
 * Warm light in the air round a light source, in three flat steps (drawn with 'lighter'):
 * radius in metres, colour added at full strength.
 */
export function airGlow(cx: number, cy: number, radiusM: number, add: [number, number, number], key: string): HTMLCanvasElement {
  const hit = glows.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = SCENE_W;
  c.height = SCENE_H;
  const g = c.getContext('2d')!;
  const img = g.createImageData(SCENE_W, SCENE_H);
  for (let y = 0; y < SCENE_H; y++)
    for (let x = 0; x < SCENE_W; x++) {
      const d = Math.hypot((x - cx) / 57, (y - cy) / 50);
      const v = 1.15 / (1 + (d / radiusM) ** 2) - 0.12 + (((x * 7 + y * 13) % 5) / 5 - 0.5) * 0.06;
      const lv = Math.max(0, Math.min(3, Math.floor(v * 3)));
      if (!lv) continue;
      const i = (y * SCENE_W + x) * 4;
      img.data[i] = (add[0] * lv) / 3;
      img.data[i + 1] = (add[1] * lv) / 3;
      img.data[i + 2] = (add[2] * lv) / 3;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  glows.set(key, c);
  return c;
}

/** A small pixel ellipse shadow for the party's feet. */
let shadowCanvas: HTMLCanvasElement | null = null;
export function footShadow(): HTMLCanvasElement {
  if (shadowCanvas) return shadowCanvas;
  const w = 34, h = 8;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = ((x + 0.5 - w / 2) / (w / 2)) ** 2 + ((y + 0.5 - h / 2) / (h / 2)) ** 2;
      if (d > 1) continue;
      const i = (y * w + x) * 4;
      img.data[i] = 3;
      img.data[i + 1] = 5;
      img.data[i + 2] = 12;
      img.data[i + 3] = d < 0.45 ? 130 : 80;
    }
  g.putImageData(img, 0, 0);
  shadowCanvas = c;
  return c;
}
