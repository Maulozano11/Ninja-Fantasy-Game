// Composites the base body and every equipped item into one 128x128 frame.

import { drawBody } from './body';
import { getItem } from './catalog';
import { hexToRgb } from './color';
import { Depth, DEPTHS, DrawCtx, ItemDef, NO_OUTLINE_DEPTHS } from './ctx';
import { drawHeadband } from './items/headband';
import { add, GRID, Layer, MaterialTable, norm, PartId, PARTS, perp, RES, scale, sub, v, Vec } from './raster';
import { buildRig, Rig } from './rig';
import { applyTexture, frayHair } from './texture';
import type { EyeSpecial, PixelEdit, SlotId, SpriteAppearance, SpritePose } from './types';

export interface SpriteFrame {
  rgba: Uint8ClampedArray;
  /** Body part index (into PARTS) of the top-most pixel, 0 where empty. */
  part: Uint8Array;
  rig: Rig;
}

/** Depths drawn in head-local units and shrunk around the head center by `headScale`. */
const HEAD_GROUP = new Set<Depth>(['hairBack', 'head.body', 'head.face', 'head.mask', 'hairFront', 'head.gear']);

// Slots are drawn in this order; within a depth, later items cover earlier ones.
const SLOT_ORDER: SlotId[] = ['cape', 'hair', 'face', 'bottom', 'feet', 'top', 'skirt', 'armor', 'waist', 'hands', 'held'];

// Layers whose hems cast a contact shadow on the skin layer under them.
const TORSO_COVERS: Depth[] = ['torso.under', 'torso.bottom', 'torso.top', 'skirt', 'torso.armor', 'torso.over', 'waist'];
const SHADOW_CASTERS: [Depth, Depth[]][] = [
  ['nearArm.body', ['nearArm.cloth', 'nearArm.armor', 'nearArm.over']],
  ['farArm.body', ['farArm.cloth', 'farArm.armor']],
  ['nearLeg.body', ['nearLeg.cloth', 'nearLeg.armor', ...TORSO_COVERS]],
  ['farLeg.body', ['farLeg.cloth', 'farLeg.armor', ...TORSO_COVERS]],
  ['torso.body', ['neck', 'head.body', 'torso.top', 'torso.armor', 'torso.over', 'waist']],
];

/**
 * Darkens skin by one shade for the two rows under the outline of a sleeve,
 * hem, collar or chin drawn over it, like the reference's cast shadows.
 */
function castShadows(layers: Map<Depth, Layer>, skin: number): void {
  for (const [depth, covers] of SHADOW_CASTERS) {
    const L = layers.get(depth);
    if (!L?.used) continue;
    const cs = covers.map((c) => layers.get(c)).filter((c): c is Layer => !!c?.used);
    if (!cs.length) continue;
    const marks: number[] = [];
    for (let y = 2; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const i = y * GRID + x;
        if (L.mat[i] !== skin || cs.some((c) => c.has(x, y))) continue;
        if (cs.some((c) => c.has(x, y - 2) || (y >= 3 && c.has(x, y - 3)))) marks.push(i);
      }
    }
    for (const i of marks) L.shade[i] = Math.max(1, L.shade[i] - 1);
  }
}

export function renderSprite(
  look: SpriteAppearance,
  pose: SpritePose,
  frame: number,
  eyeSpecial: EyeSpecial = 'none',
  opts: { skipEdits?: boolean } = {},
): SpriteFrame {
  const rig = buildRig(look.body, pose, frame);
  const mats = new MaterialTable();
  const layers = new Map<Depth, Layer>();
  const equipped = new Map<SlotId, ItemDef>();
  for (const slot of SLOT_ORDER) {
    const c = look.slots[slot];
    const def = c && getItem(c.id);
    if (def && def.slot === slot) equipped.set(slot, def);
  }
  const hideHair = [...equipped.values()].some((d) => d.hidesHair);

  const g: DrawCtx = {
    rig,
    bp: rig.bp,
    look,
    eyeSpecial,
    mats,
    L(depth) {
      let l = layers.get(depth);
      if (!l) {
        l = new Layer(!NO_OUTLINE_DEPTHS.has(depth));
        if (HEAD_GROUP.has(depth)) l.xf = { cx: rig.head.x, cy: rig.head.y, k: rig.bp.headScale };
        layers.set(depth, l);
      }
      return l;
    },
    m: (hex, kind = 'cloth') => mats.get(hex, kind),
    pen: (hex, kind, part, bias = 0, flags = 0) => ({ mat: mats.get(hex, kind), part, bias, flags }),
    skin: mats.get(look.skin, 'skin'),
    has: (slot, id) => {
      const d = equipped.get(slot);
      return !!d && (id === undefined || d.id === id);
    },
  };

  drawBody(g);
  for (const slot of SLOT_ORDER) {
    const def = equipped.get(slot);
    if (!def) continue;
    if (slot === 'hair' && hideHair) continue;
    def.draw(g, resolveColors(def, look.slots[slot]!.colors));
  }
  for (const acc of look.accessories) {
    const def = getItem(acc.id);
    if (def && def.slot === 'accessory') def.draw(g, resolveColors(def, acc.colors));
  }
  drawHeadband(g);

  castShadows(layers, g.skin);

  // Outline and flatten
  const rgba = new Uint8ClampedArray(GRID * GRID * 4);
  const part = new Uint8Array(GRID * GRID);
  const rgbCache = new Map<string, [number, number, number]>();
  const rgb = (hex: string) => {
    let c = rgbCache.get(hex);
    if (!c) {
      c = hexToRgb(hex);
      rgbCache.set(hex, c);
    }
    return c;
  };
  const frames = PARTS.map((p) => partFrame(rig, p));
  // Per pixel: which depth drew it last and whether it is an outline pixel.
  const top = new Int16Array(GRID * GRID).fill(-1);
  const isLine = new Uint8Array(GRID * GRID);
  DEPTHS.forEach((depth, d) => {
    const L = layers.get(depth);
    if (!L || !L.used) return;
    if ((depth === 'hairFront' || depth === 'hairBack') && !L.noFray) frayHair(L, rig.head, rig.bp.headScale, depth === 'hairFront' ? 11 : 23);
    L.applyOutline();
    if (L.outline) applyTexture(L, mats, frames);
    for (let i = 0; i < GRID * GRID; i++) {
      const m = L.mat[i];
      if (m < 0) continue;
      const [r, gg, b] = rgb(mats.ramps[m][L.shade[i]]);
      rgba[i * 4] = r;
      rgba[i * 4 + 1] = gg;
      rgba[i * 4 + 2] = b;
      rgba[i * 4 + 3] = 255;
      part[i] = L.part[i];
      top[i] = d;
      isLine[i] = L.shade[i] === 0 ? 1 : 0;
    }
  });
  thinDoubleOutlines(rgba, top, isLine);

  if (!opts.skipEdits && look.pixelEdits?.length) applyEdits(look.pixelEdits, rig, rgba, part);
  return { rgba, part, rig };
}

/**
 * Keeps outlines 1px. Where a layer's outline runs right next to the outline
 * of a layer drawn in front of it, the back one is replaced by the back
 * layer's own fill, so the two never stack into a 2px dark line. Silhouette
 * outlines (next to transparency) are always kept.
 */
function thinDoubleOutlines(rgba: Uint8ClampedArray, top: Int16Array, isLine: Uint8Array): void {
  const N = GRID * GRID;
  const fixes: [number, number][] = [];
  const dirs = [1, -1, GRID, -GRID];
  for (let i = 0; i < N; i++) {
    if (!isLine[i]) continue;
    const x = i % GRID;
    const y = (i / GRID) | 0;
    if (x === 0 || y === 0 || x === GRID - 1 || y === GRID - 1) continue;
    if (dirs.some((dd) => top[i + dd] < 0)) continue;
    for (const dd of dirs) {
      const j = i + dd;
      const k = i - dd;
      if (isLine[j] && top[j] > top[i] && !isLine[k] && top[k] === top[i]) {
        fixes.push([i, k]);
        break;
      }
    }
  }
  for (const [i, k] of fixes) for (let c = 0; c < 3; c++) rgba[i * 4 + c] = rgba[k * 4 + c];
}

function resolveColors(def: ItemDef, colors: string[] | undefined): string[] {
  return def.colors.map((c, i) => (colors && colors[i]) || c.default);
}

// ---------------------------------------------------------------------------
// Part frames (for pixel edits that follow the body between poses)
// ---------------------------------------------------------------------------

interface Frame {
  o: Vec;
  u: Vec;
  w: Vec;
}

export function partFrame(rig: Rig, p: PartId): Frame {
  const seg = (a: Vec, b: Vec): Frame => {
    const u = norm(sub(b, a));
    return { o: a, u, w: perp(u) };
  };
  const axis = (o: Vec): Frame => ({ o, u: v(1, 0), w: v(0, 1) });
  switch (p) {
    case 'head':
      return axis(rig.head);
    case 'torso':
    case 'pelvis':
    case 'back':
      return { o: rig.pelvis, u: rig.right, w: perp(rig.right) };
    case 'upperArmN':
      return seg(rig.shoulderN, rig.elbowN);
    case 'forearmN':
      return seg(rig.elbowN, rig.wristN);
    case 'handN':
    case 'held':
      return seg(rig.wristN, rig.handN);
    case 'upperArmF':
      return seg(rig.shoulderF, rig.elbowF);
    case 'forearmF':
      return seg(rig.elbowF, rig.wristF);
    case 'handF':
      return seg(rig.wristF, rig.handF);
    case 'thighN':
      return seg(rig.hipN, rig.kneeN);
    case 'shinN':
      return seg(rig.kneeN, rig.ankleN);
    case 'footN':
      return axis(rig.ankleN);
    case 'thighF':
      return seg(rig.hipF, rig.kneeF);
    case 'shinF':
      return seg(rig.kneeF, rig.ankleF);
    case 'footF':
      return axis(rig.ankleF);
    default:
      return axis(v(0, 0));
  }
}

/** Fine pixel (x, y) → coordinates in the part's local frame (design units). */
export function toLocal(rig: Rig, p: PartId, x: number, y: number): { a: number; b: number } {
  const f = partFrame(rig, p);
  const d = sub(v((x + 0.5) / RES, (y + 0.5) / RES), f.o);
  return { a: d.x * f.u.x + d.y * f.u.y, b: d.x * f.w.x + d.y * f.w.y };
}

/** Part-local coordinates → fine pixel. */
export function toWorld(rig: Rig, p: PartId, a: number, b: number): { x: number; y: number } {
  const f = partFrame(rig, p);
  const w = add(f.o, add(scale(f.u, a), scale(f.w, b)));
  return { x: Math.floor(w.x * RES), y: Math.floor(w.y * RES) };
}

/** The body part closest to a fine pixel (used when painting on empty space). */
export function nearestPart(rig: Rig, x: number, y: number): PartId {
  const p = v((x + 0.5) / RES, (y + 0.5) / RES);
  const segs: [PartId, Vec, Vec][] = [
    ['head', v(rig.head.x, rig.head.y - 3), v(rig.head.x, rig.head.y + 3)],
    ['torso', rig.pelvis, rig.neck],
    ['upperArmN', rig.shoulderN, rig.elbowN],
    ['forearmN', rig.elbowN, rig.wristN],
    ['handN', rig.wristN, rig.handN],
    ['upperArmF', rig.shoulderF, rig.elbowF],
    ['forearmF', rig.elbowF, rig.wristF],
    ['handF', rig.wristF, rig.handF],
    ['thighN', rig.hipN, rig.kneeN],
    ['shinN', rig.kneeN, rig.ankleN],
    ['footN', rig.ankleN, add(rig.ankleN, v(4, 2))],
    ['thighF', rig.hipF, rig.kneeF],
    ['shinF', rig.kneeF, rig.ankleF],
    ['footF', rig.ankleF, add(rig.ankleF, v(4, 2))],
  ];
  let best: PartId = 'torso';
  let bestD = Infinity;
  for (const [id, a, b] of segs) {
    const ab = sub(b, a);
    const l2 = ab.x * ab.x + ab.y * ab.y || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / l2));
    const c = add(a, scale(ab, t));
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}

function applyEdits(edits: PixelEdit[], rig: Rig, rgba: Uint8ClampedArray, part: Uint8Array): void {
  for (const e of edits) {
    const { x, y } = toWorld(rig, e.part, e.a, e.b);
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) continue;
    const i = y * GRID + x;
    if (e.color === null) {
      rgba[i * 4 + 3] = 0;
      part[i] = 0;
    } else {
      const [r, g, b] = hexToRgb(e.color);
      rgba[i * 4] = r;
      rgba[i * 4 + 1] = g;
      rgba[i * 4 + 2] = b;
      rgba[i * 4 + 3] = 255;
      part[i] = PARTS.indexOf(e.part);
    }
  }
}

// ---------------------------------------------------------------------------
// Frame cache
// ---------------------------------------------------------------------------

const cache = new Map<string, SpriteFrame>();
const CACHE_MAX = 400;

export function renderSpriteCached(look: SpriteAppearance, pose: SpritePose, frame: number, eyeSpecial: EyeSpecial = 'none'): SpriteFrame {
  const key = `${JSON.stringify(look)}|${pose}|${frame}|${eyeSpecial}`;
  let f = cache.get(key);
  if (f) {
    cache.delete(key);
    cache.set(key, f);
    return f;
  }
  f = renderSprite(look, pose, frame, eyeSpecial);
  cache.set(key, f);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
  return f;
}
