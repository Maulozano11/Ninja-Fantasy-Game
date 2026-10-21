// Composites the base body and every equipped item into one GRID x GRID frame.

import { drawBody, faceCells, sculptClothes } from './body';
import { fitsBody, getItem } from './catalog';
import { hexToRgb } from './color';
import { Depth, DEPTHS, DrawCtx, ItemDef, NO_OUTLINE_DEPTHS, resolveParts } from './ctx';
import { drawThrowKunai } from './items/accessories';
import { drawHeadband } from './items/headband';
import { add, F_NO_OUTLINE, GRID, Layer, MaterialTable, norm, PAD, PartId, partIndex, PARTS, perp, RES, scale, sub, v, Vec } from './raster';
import { drawRig, Lay, layRig, Rig, rigPoseFor, turnPoint, turnRig } from './rig';
import { drawCampFx } from './campfx';
import { drawCastFx } from './castfx';
import { applyTexture, frayHair } from './texture';
import type { EyeSpecial, PixelEdit, SlotId, SpriteAppearance, SpritePose } from './types';

export interface SpriteFrame {
  rgba: Uint8ClampedArray;
  /** Body part index (into PARTS) of the top-most pixel, 0 where empty. */
  part: Uint8Array;
  /** One bit per pixel (byte i >> 3, bit i & 7): the top-most pixel is hair (the Ryusei's phase lights it up). */
  hair?: Uint8Array;
  rig: Rig;
}

/** Depths drawn in head-local units and shrunk around the head center by `headScale`. */
const HEAD_GROUP = new Set<Depth>(['hairBack', 'head.body', 'head.face', 'head.mask', 'hairFront', 'head.gear']);
const HAIR_BACK = DEPTHS.indexOf('hairBack');
const HAIR_FRONT = DEPTHS.indexOf('hairFront');

// Slots are drawn in this order; within a depth, later items cover earlier ones.
const SLOT_ORDER: SlotId[] = ['cape', 'hair', 'face', 'bottom', 'feet', 'top', 'skirt', 'armor', 'waist', 'hands', 'held'];

// Depths that never cast drop shadows (held weapons, effects drawn on top).
const NO_CAST = new Set<Depth>(['nearArm.held', 'farArm.held', 'top']);
// Light comes from the upper left, so a part shadows the pixels just below
// and to the right of it: offsets from a pixel to the occluders it checks.
const SHADOW_FROM: [number, number][] = [
  [0, -1],
  [-1, -1],
  [-1, 0],
  [0, -2],
  [-1, -2],
];

// Hairstyles whose front hair must stay off the face (the others frame the
// face on purpose and are left as drawn). Their side locks may still cover
// the jaw edge in front of the ear, like the reference, which keeps the face
// from reading too wide.
const FACE_CLEAR_HAIR = new Set(['hair_scholar', 'hair_long', 'hair_crest']);

/**
 * For FACE_CLEAR_HAIR styles: from the lash row down (eyes, cheeks, jaw) no
 * front hair covers the face, except a side lock over the jaw edge; above it
 * the fringe may still cross the forehead. Hair left next to a trimmed spot
 * gets a dark 1px edge.
 */
function guardFace(g: DrawCtx, layers: Map<Depth, Layer>): void {
  const L = layers.get('hairFront');
  const id = g.look.slots.hair?.id;
  if (!L?.used || !id || !FACE_CLEAR_HAIR.has(id)) return;
  const face = faceCells(g, 3);
  const cut: number[] = [];
  for (const i of face) {
    if (L.mat[i] < 0) continue;
    L.clear(i % GRID, (i / GRID) | 0);
    cut.push(i);
  }
  for (const i of cut) {
    for (const j of [i - 1, i + 1, i - GRID, i + GRID]) {
      if (j < 0 || j >= GRID * GRID || face.has(j) || L.mat[j] < 0) continue;
      L.reshade(j % GRID, (j / GRID) | 0, 0);
    }
  }
}

/**
 * Moves the far hand (and the glove or gauntlet on it) from behind the torso
 * to a layer over it, for poses where that hand works in front of the body.
 */
function farHandToFront(layers: Map<Depth, Layer>, g: DrawCtx): void {
  const hand = partIndex('handF');
  const front = g.L('farHand.front');
  for (const d of ['farArm.body', 'farArm.cloth', 'farArm.armor'] as const) {
    const L = layers.get(d);
    if (!L?.used) continue;
    for (let i = 0; i < GRID * GRID; i++) {
      if (L.mat[i] < 0 || L.part[i] !== hand) continue;
      front.mat[i] = L.mat[i];
      front.shade[i] = L.shade[i];
      front.part[i] = L.part[i];
      front.flags[i] = L.flags[i];
      front.used = true;
      L.mat[i] = -1;
    }
  }
}

/**
 * Boots worn inside the trousers (a bottom item's 'boots' part, the owner's choice: "con opcion de que
 * las botas se escondan adentro del pantalon o que las botas vayan por fuera"): wherever a trouser leg
 * is drawn, the boot on that leg is taken away, so the hem falls over the boot top and only the boot
 * below it shows. Outside (the default for every trouser but the owner's jeans) the boots are drawn over
 * the legs as ever.
 */
function tuckBoots(layers: Map<Depth, Layer>): void {
  for (const s of ['near', 'far'] as const) {
    const cloth = layers.get(`${s}Leg.cloth` as Depth);
    const feet = layers.get(`${s}Leg.feet` as Depth);
    if (!cloth?.used || !feet?.used) continue;
    for (let i = 0; i < GRID * GRID; i++) if (feet.mat[i] >= 0 && cloth.mat[i] >= 0) feet.mat[i] = -1;
  }
}

/** The cape layers that hang from the body (the cloth, its collar and the drapes on the chest). */
const CAPE_CLOTH = ['capeBack', 'capeFront'] as const;

/**
 * A body pitched far forward (PoseFrame.streamBack, the release of 'throw') cannot hang its cape
 * straight down from the shoulders: the cloth would fall in front of the chest and over the legs.
 * The cape is hung from the body standing upright instead (the rig turned back by its lean around
 * the pelvis), then the cloth is turned forward with the body: it lies along the back and streams
 * out behind it, flung by the pose's wind, and a coat's front panel follows the torso. Only the
 * cloth layers come from that drawing: what the cape puts on the arms and shoulders is drawn on
 * the pitched body as usual. The collar is then tucked under the chin, as tuckUnderChin does.
 */
function drawPitchedCape(g: DrawCtx, layers: Map<Depth, Layer>, draw: (g: DrawCtx) => void): void {
  const rig = g.rig;
  const before = new Map(CAPE_CLOTH.map((d) => [d, snapshot(layers.get(d))]));
  draw(g);
  const upright = turnRig(rig, -rig.lean);
  const hung = new Map<Depth, Layer>();
  draw({
    ...g,
    rig: upright,
    L(depth) {
      let l = hung.get(depth);
      if (!l) {
        l = new Layer(!NO_OUTLINE_DEPTHS.has(depth));
        if (HEAD_GROUP.has(depth)) l.xf = { cx: upright.head.x, cy: upright.head.y, k: upright.bp.headScale };
        hung.set(depth, l);
      }
      return l;
    },
  });
  const head = layers.get('head.body');
  for (const d of CAPE_CLOTH) {
    const L = g.L(d);
    restore(L, before.get(d)!);
    const src = hung.get(d);
    if (!src?.used) continue;
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        // The fine pixel of the upright drawing that turns onto this one.
        const s = turnPoint(v((x + 0.5) / RES, (y + 0.5) / RES), rig.pelvis, -rig.lean);
        const sx = Math.floor(s.x * RES);
        const sy = Math.floor(s.y * RES);
        if (sx < 0 || sy < 0 || sx >= GRID || sy >= GRID) continue;
        const j = sy * GRID + sx;
        if (src.mat[j] < 0) continue;
        // The collar and drapes in front stay under the chin.
        if (d === 'capeFront' && head?.has(x, y)) continue;
        L.set(x, y, src.mat[j], src.shade[j], PARTS[src.part[j]], src.flags[j]);
      }
    }
  }
  capeBehindBack(g.L('capeBack'), rig, g.mats);
}

/**
 * The pitched cape's cloth that would hang down in the gap between the legs (what lies in front of
 * the line of the back below the chest, behind the body) is cut away, so the cloth only streams
 * out behind the back. The cut gets the cloth's outline (a painted cape, which draws its own: its
 * darkest colour).
 */
function capeBehindBack(L: Layer, rig: Rig, mats: MaterialTable): void {
  const b = rig.bp;
  // The back of the near thigh at the hip (torsoPoly's nO), the line the cloth stays behind.
  const backX = -(b.hipHalf * 0.5 + b.legR[0] * 0.96) + 0.5;
  const chestY = b.torsoLen - 4;
  const cut = new Uint8Array(GRID * GRID);
  let darkest = -1;
  let darkL = Infinity;
  for (let i = 0; i < GRID * GRID; i++) {
    const m = L.mat[i];
    if (m < 0) continue;
    const d = sub(v(((i % GRID) + 0.5) / RES, (((i / GRID) | 0) + 0.5) / RES), rig.pelvis);
    const lx = d.x * rig.right.x + d.y * rig.right.y;
    const ly = d.x * rig.up.x + d.y * rig.up.y;
    if (lx > backX && ly < chestY) {
      L.mat[i] = -1;
      L.flags[i] = 0;
      cut[i] = 1;
      continue;
    }
    const [r, g, bl] = hexToRgb(mats.ramps[m][3]);
    const lum = r * 0.3 + g * 0.59 + bl * 0.11;
    if (lum < darkL) {
      darkL = lum;
      darkest = m;
    }
  }
  // Painted cloth is not outlined by the layer: line its cut with its darkest colour.
  for (let i = 0; i < GRID * GRID; i++) {
    if (L.mat[i] < 0 || !(L.flags[i] & F_NO_OUTLINE)) continue;
    if ([i - 1, i + 1, i - GRID, i + GRID].some((j) => j >= 0 && j < GRID * GRID && cut[j])) {
      L.mat[i] = darkest;
      L.shade[i] = 0;
    }
  }
}

/** A copy of a layer's pixels (null when it has none yet). */
function snapshot(L: Layer | undefined): { mat: Int16Array; shade: Uint8Array; part: Uint8Array; flags: Uint8Array; used: boolean } | null {
  return L ? { mat: L.mat.slice(), shade: L.shade.slice(), part: L.part.slice(), flags: L.flags.slice(), used: L.used } : null;
}

function restore(L: Layer, s: ReturnType<typeof snapshot>): void {
  if (!s) {
    L.mat.fill(-1);
    L.used = false;
    return;
  }
  L.mat.set(s.mat);
  L.shade.set(s.shade);
  L.part.set(s.part);
  L.flags.set(s.flags);
  L.used = s.used;
}

/**
 * Drop shadows between overlapping parts, like the reference: wherever a part
 * is drawn over another (arm over the chest, belt over the shirt, scarf over
 * the armor, torso over the far arm, near leg over the far leg), the back part
 * is one shade darker for a pixel to the right and two rows below the front
 * part's outline. Skips outlines, flat and glowing colors, and the face.
 */
function dropShadows(top: Int16Array, mat: Int16Array, shade: Uint8Array, flags: Uint8Array, mats: MaterialTable): void {
  const noCast = DEPTHS.map((d) => NO_CAST.has(d));
  const headBody = DEPTHS.indexOf('head.body');
  const headFace = DEPTHS.indexOf('head.face');
  const marks: number[] = [];
  for (let y = 2; y < GRID; y++) {
    for (let x = 1; x < GRID; x++) {
      const i = y * GRID + x;
      const d = top[i];
      if (d < 0 || shade[i] < 2 || d === headFace) continue;
      if (d === headBody && flags[i] & F_NO_OUTLINE) continue; // the face template
      const kind = mats.kinds[mat[i]];
      if (kind === 'flat' || kind === 'glow') continue;
      for (const [dx, dy] of SHADOW_FROM) {
        const j = i + dy * GRID + dx;
        if (top[j] > d && !noCast[top[j]] && mats.kinds[mat[j]] !== 'glow') {
          marks.push(i);
          break;
        }
      }
    }
  }
  for (const i of marks) shade[i] -= 1;
}

export function renderSprite(
  look: SpriteAppearance,
  pose: SpritePose,
  frame: number,
  eyeSpecial: EyeSpecial = 'none',
  opts: { skipEdits?: boolean; heldOnly?: Rig } = {},
): SpriteFrame {
  // heldOnly: just the held item (or the kunai bare hands throw) on that rig, no body (sprite/thrown.ts).
  const rig = opts.heldOnly ?? drawRig(look.body, rigPoseFor(pose, look.cast?.style, look.stowed ? undefined : look.slots.held?.id), frame);
  const mats = new MaterialTable();
  const layers = new Map<Depth, Layer>();
  const equipped = new Map<SlotId, ItemDef>();
  for (const slot of SLOT_ORDER) {
    const c = look.slots[slot];
    const def = c && getItem(c.id);
    if (def && def.slot === slot && fitsBody(def, look.body)) equipped.set(slot, def);
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

  if (opts.heldOnly) {
    const def = equipped.get('held');
    const choice = look.slots.held;
    if (def && choice && !look.stowed) def.draw(g, resolveColors(def, choice.colors), resolveParts(def, choice.parts));
    drawThrowKunai(g);
  } else {
    drawBody(g);
    for (const slot of SLOT_ORDER) {
      const def = equipped.get(slot);
      if (!def) continue;
      if (slot === 'hair' && hideHair) continue;
      const choice = look.slots[slot]!;
      const colors = resolveColors(def, choice.colors);
      const parts = resolveParts(def, choice.parts);
      if (slot === 'cape' && rig.streamBack) drawPitchedCape(g, layers, (gg) => def.draw(gg, colors, parts));
      else def.draw(g, colors, parts);
    }
    for (const acc of look.accessories) {
      const def = getItem(acc.id);
      if (def && def.slot === 'accessory') def.draw(g, resolveColors(def, acc.colors), resolveParts(def, acc.parts));
    }
    drawHeadband(g);
    drawThrowKunai(g);
    // clothes over a female torso follow the bust (fitted armors shape their own plates)
    for (const d of ['torso.top', 'torso.over'] as const) {
      const L = layers.get(d);
      if (L) sculptClothes(g, L);
    }
    drawCastFx(g);
    drawCampFx(g);
    const bottom = equipped.get('bottom');
    if (bottom && resolveParts(bottom, look.slots.bottom?.parts).boots === 'tucked') tuckBoots(layers);
    if (rig.farHandFront) farHandToFront(layers, g);
    guardFace(g, layers);
  }

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
  // Per pixel: the depth, material, shade and flags of the part drawn last.
  const N = GRID * GRID;
  const top = new Int16Array(N).fill(-1);
  const topMat = new Int16Array(N).fill(-1);
  const topShade = new Uint8Array(N);
  const topFlags = new Uint8Array(N);
  DEPTHS.forEach((depth, d) => {
    const L = layers.get(depth);
    if (!L || !L.used) return;
    if ((depth === 'hairFront' || depth === 'hairBack') && !L.noFray) frayHair(L, rig.head, rig.bp.headScale, depth === 'hairFront' ? 11 : 23);
    L.applyOutline();
    if (L.outline) applyTexture(L, mats, frames);
    for (let i = 0; i < N; i++) {
      if (L.mat[i] < 0) continue;
      top[i] = d;
      topMat[i] = L.mat[i];
      topShade[i] = L.shade[i];
      topFlags[i] = L.flags[i];
      part[i] = L.part[i];
    }
  });
  dropShadows(top, topMat, topShade, topFlags, mats);
  const isLine = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (topMat[i] < 0) continue;
    const [r, gg, b] = rgb(mats.ramps[topMat[i]][topShade[i]]);
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = gg;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = 255;
    isLine[i] = topShade[i] === 0 ? 1 : 0;
  }
  thinDoubleOutlines(rgba, top, isLine);
  const hair = new Uint8Array(N >> 3);
  for (let i = 0; i < N; i++) if (top[i] === HAIR_BACK || top[i] === HAIR_FRONT) hair[i >> 3] |= 1 << (i & 7);

  if (!opts.skipEdits && !opts.heldOnly && look.pixelEdits?.length) applyEdits(look.pixelEdits, rig, rgba, part);
  if (rig.lay) return { ...layFrame(rgba, part, hair, rig.lay), rig: layRig(rig) };
  return { rgba, part, hair, rig };
}

/** Lays a figure drawn upright on the ground: the transpose described by Lay (exact, no resampling). */
function layFrame(rgba: Uint8ClampedArray, part: Uint8Array, hair: Uint8Array, lay: Lay): { rgba: Uint8ClampedArray; part: Uint8Array; hair: Uint8Array } {
  const out = new Uint8ClampedArray(GRID * GRID * 4);
  const outPart = new Uint8Array(GRID * GRID);
  const outHair = new Uint8Array(hair.length);
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const i = y * GRID + x;
      if (!rgba[i * 4 + 3]) continue;
      const X = y + lay.dx;
      const Y = x + lay.dy;
      if (X < 0 || Y < 0 || X >= GRID || Y >= GRID) continue;
      const j = Y * GRID + X;
      for (let c = 0; c < 4; c++) out[j * 4 + c] = rgba[i * 4 + c];
      outPart[j] = part[i];
      if (hair[i >> 3] & (1 << (i & 7))) outHair[j >> 3] |= 1 << (j & 7);
    }
  }
  return { rgba: out, part: outPart, hair: outHair };
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
      return axis(v(PAD.x, PAD.y));
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
// Each frame is GRID x GRID (about 330 KB with its part map), so fewer are kept.
const CACHE_MAX = 200;

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
