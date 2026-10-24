// Composites the base body and every equipped item into one GRID x GRID frame.

import { drawBody, faceCells, sculptClothes } from './body';
import { fitsBody, getItem } from './catalog';
import { hexToRgb } from './color';
import { Depth, DEPTHS, DrawCtx, ItemDef, NO_OUTLINE_DEPTHS, resolveParts } from './ctx';
import { mendGlitches } from './glitches';
import { keptFill } from './keptFills';
import { closePinholes } from './holes';
import { fillSeams } from './seams';
import { paintedFrame, wearsHisFigure } from './ownerFrames';
import { clipStowed, drawThrowKunai } from './items/accessories';
import { joinFlat, openJoint } from './items/ankle';
import { CAPE_DEPTHS } from './items/capes';
import { drawHeadband } from './items/headband';
import { add, F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, MaterialTable, norm, PAD, PartId, partIndex, PARTS, perp, RES, scale, sub, v, Vec } from './raster';
import { drawRig, Lay, layRig, Rig, rigPoseFor, turnPoint, turnRig } from './rig';
import { carryHead } from './neck';
import { aureliaRig, onAureliaHead } from './aureliaHead';
import { drawCampFx } from './campfx';
import { drawCastFx } from './castfx';
import { sealCloth } from './seal';
import { maleSkinRamp, paintMaleSkin } from './maleSkin';
import { romanRig } from './romanNeck';
import { applyTexture, frayHair } from './texture';
import { isFemaleBody, type EyeSpecial, type PixelEdit, type SlotId, type SpriteAppearance, type SpritePose } from './types';

export interface SpriteFrame {
  rgba: Uint8ClampedArray;
  /** Body part index (into PARTS) of the top-most pixel, 0 where empty. */
  part: Uint8Array;
  /** One bit per pixel (byte i >> 3, bit i & 7): the top-most pixel is hair (the Ryusei's phase lights it up). */
  hair?: Uint8Array;
  /** One bit per pixel, as `hair`: the top-most pixel is an effect drawn over the figure (depth 'top': cast runes, a palm's glow). */
  fx?: Uint8Array;
  rig: Rig;
}

/** Depths drawn in head-local units and shrunk around the head center by `headScale`. */
const HEAD_GROUP = new Set<Depth>(['hairBack', 'head.body', 'head.face', 'head.mask', 'hairFront', 'head.gear']);
const HAIR_BACK = DEPTHS.indexOf('hairBack');
const HAIR_FRONT = DEPTHS.indexOf('hairFront');
const FX = DEPTHS.indexOf('top');

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
  // Turning the cloth over and cutting it behind the back leave cracks along its edges, between its
  // pieces and against what the cape puts on the pitched shoulders: close them (seal.ts).
  sealCloth(g, CAPE_DEPTHS, true);
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
 * part's outline. Skips outlines, flat and glowing colors, and the face; with `keepPainted` (the female
 * bodies, the owner's standard) also every hand-painted pixel (F_NO_TEXTURE: his hands, his shoulder, a
 * heroine's skin pieces), whose shades are his.
 */
function dropShadows(top: Int16Array, mat: Int16Array, shade: Uint8Array, flags: Uint8Array, mats: MaterialTable, keepPainted = false): void {
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
      if (keepPainted && flags[i] & F_NO_TEXTURE) continue;
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

/**
 * Every layer of a frame as drawn, before the outlines and the flattening (renderSprite does those):
 * for tests that look at one part of the figure on its own (an arm, a leg) whatever covers it.
 */
export function spriteLayers(look: SpriteAppearance, pose: SpritePose, frame: number, eyeSpecial: EyeSpecial = 'none'): { layers: Map<Depth, Layer>; rig: Rig; mats: MaterialTable } {
  const { layers, rig, mats } = drawLayers(look, pose, frame, eyeSpecial);
  return { layers, rig, mats };
}

function drawLayers(look: SpriteAppearance, pose: SpritePose, frame: number, eyeSpecial: EyeSpecial, heldOnly?: Rig) {
  // heldOnly: just the held item (or the kunai bare hands throw) on that rig, no body (sprite/thrown.ts).
  // (the long neck carries the head higher and further forward: neck.ts; Aurelia's face stands her head
  // where the owner drew it: aureliaHead.ts; his Roman face on a male body stands higher on his neck:
  // romanNeck.ts)
  // (his own figure in his painted frames sits on his joints; any other look holds its hands from its own neck: rig.ts PoseAt.hisNeck)
  const rig = heldOnly ?? aureliaRig(romanRig(carryHead(drawRig(look.body, rigPoseFor(pose, look.cast?.style, look.stowed ? undefined : look.slots.held?.id), frame, look.arms, wearsHisFigure(look)), look.neck), look), look);
  const mats = new MaterialTable();
  const layers = new Map<Depth, Layer>();
  const equipped = new Map<SlotId, ItemDef>();
  for (const slot of SLOT_ORDER) {
    const c = look.slots[slot];
    const def = c && getItem(c.id);
    if (def && def.slot === slot && fitsBody(def, look.body)) equipped.set(slot, def);
  }
  const hideHair = [...equipped.values()].some((d) => d.hidesHair);
  const late: ((layers: ReadonlyMap<Depth, Layer>) => void)[] = [];

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
    skin: mats.get(look.skin, isFemaleBody(look.body) ? 'skinF' : 'skin'),
    has: (slot, id) => {
      const d = equipped.get(slot);
      return !!d && (id === undefined || d.id === id);
    },
    after: (fn) => late.push(fn),
  };

  if (heldOnly) {
    const def = equipped.get('held');
    const choice = look.slots.held;
    if (def && choice && !look.stowed) def.draw(g, resolveColors(def, choice.colors), resolveParts(def, choice.parts));
    drawThrowKunai(g);
  } else {
    maleSkinRamp(g);
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
    // The lean's flat feet meet their shins, whichever item drew each (items/ankle.ts).
    for (const s of ['N', 'F'] as const) joinFlat(g, s);
    // A foot turned with its shin is one piece with it, whichever items drew the two (items/ankle.ts).
    for (const s of ['N', 'F'] as const) openJoint(g, s);
    drawHeadband(g);
    drawThrowKunai(g);
    // What an item leaves open against the rest of the figure, closed once all of it is drawn.
    for (const def of equipped.values()) def.finish?.(g);
    // clothes over a female torso follow the bust (fitted armors shape their own plates)
    for (const d of ['torso.top', 'torso.over'] as const) {
      const L = layers.get(d);
      if (L) sculptClothes(g, L);
    }
    clipStowed(g, layers);
    // Seams a painted piece opens as it moves from its neighbour, filled from behind; at rest only a seam
    // he left open there (sprite/seams.ts).
    fillSeams(g, layers, pose === 'idle');
    drawCastFx(g);
    drawCampFx(g);
    if (rig.farHandFront) farHandToFront(layers, g);
    guardFace(g, layers);
    paintMaleSkin(g, layers);
  }
  for (const fn of late) fn(layers);
  return { layers, rig, mats };
}

export function renderSprite(
  look: SpriteAppearance,
  pose: SpritePose,
  frame: number,
  eyeSpecial: EyeSpecial = 'none',
  opts: { skipEdits?: boolean; heldOnly?: Rig; depths?: ReadonlySet<Depth> } = {},
): SpriteFrame {
  // depths: only these layers are shown (tests look at one limb alone, nothing in front of it).
  const { layers, rig, mats } = drawLayers(look, pose, frame, eyeSpecial, opts.heldOnly);

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
    if (!L || !L.used || (opts.depths && !opts.depths.has(depth))) return;
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
  dropShadows(top, topMat, topShade, topFlags, mats, isFemaleBody(look.body));
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
  // The 1-pixel holes turned pieces leave (sprite/holes.ts), each closed with its neighbours' line or
  // colour. Idle is left exactly as drawn: it is the frame the owner's pictures were copied into; so are
  // the frames he painted himself (his Lyra reading, sitting and throwing, ownerFrames.ts).
  const lineOf = (i: number) => (topMat[i] < 0 ? 0x07060b : parseInt(mats.ramps[topMat[i]][0].slice(1), 16));
  const hisFrame = wearsHisFigure(look) && !!paintedFrame(rig.pose, rig.frame);
  if (pose !== 'idle' && !hisFrame) closePinholes(rgba, part, top, (i) => top[i] === FX, lineOf);
  // The owner's standard characters (2026-10-23: "quiero que arregles solo los de la calidad standard"): off
  // his pictures, the cracks and light edge pixels their moved pieces open are closed; a pocket only where he saw
  // it filled and left it (glitches.ts, keptFills.ts).
  // (her walk he approved pixel for pixel stays as it is: aureliaLegs.test.ts)
  const who = pose === 'idle' || hisFrame ? null : standardOf(look);
  if (who && !(who === 'aurelia' && pose === 'walk')) {
    // (his Trunks: his open-toed boots' bare toes are light to their tip as he drew them, kept; what the mends
    // gave our outline takes his line, and a bit left loose by a turn is taken away)
    const trunks = who === 'trunks2' || who === 'trunks3';
    const toes = trunks && look.slots.feet?.id === 'feet_cowboy' ? new Set([partIndex('footN'), partIndex('footF')]) : null;
    mendGlitches(rgba, part, top, (i) => top[i] === FX, lineOf, toes ? (i) => toes.has(part[i]) : undefined, (px) => keptFill(`${who}@${look.body}`, pose, frame, px));
    if (trunks) {
      hisLine(rgba, part, top);
      dropLooseBits(rgba, part, top);
    }
  }
  const hair = new Uint8Array(N >> 3);
  const fx = new Uint8Array(N >> 3);
  for (let i = 0; i < N; i++) {
    if (top[i] === HAIR_BACK || top[i] === HAIR_FRONT) hair[i >> 3] |= 1 << (i & 7);
    if (top[i] === FX) fx[i >> 3] |= 1 << (i & 7);
  }

  if (!opts.skipEdits && !opts.heldOnly && look.pixelEdits?.length) applyEdits(look.pixelEdits, rig, rgba, part);
  if (rig.lay) return { ...layFrame(rgba, part, hair, rig.lay), fx: layBits(fx, rig.lay), rig: layRig(rig) };
  return { rgba, part, hair, fx, rig };
}

/** A bit mask (one bit per pixel) laid down as layFrame lays the figure. */
function layBits(bits: Uint8Array, lay: Lay): Uint8Array {
  const out = new Uint8Array(bits.length);
  for (let i = 0; i < GRID * GRID; i++) {
    if (!(bits[i >> 3] & (1 << (i & 7)))) continue;
    const X = ((i / GRID) | 0) + lay.dx;
    const Y = (i % GRID) + lay.dy;
    if (X < 0 || Y < 0 || X >= GRID || Y >= GRID) continue;
    const j = Y * GRID + X;
    out[j >> 3] |= 1 << (j & 7);
  }
  return out;
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
/** Which of the owner's standard characters a look is on this branch (keptFills.ts names), or null: his Lyra, his Aurelia, his Roman set (cuirass and skirt), his Trunks 2 (shirt, cargo trousers) and Trunks 3 (bomber, belted trousers). */
function standardOf(look: SpriteAppearance): string | null {
  if (wearsHisFigure(look)) return 'lyra';
  if (onAureliaHead(look)) return 'aurelia';
  if (look.slots.armor?.id === 'armor_bronze' && look.slots.skirt?.id === 'skirt_imperial') return 'roman';
  const top = look.slots.top?.id;
  const bottom = look.slots.bottom?.id;
  if (top === 'top_highcollar' && bottom === 'bottom_cargo') return 'trunks2';
  return top === 'top_bomber' && bottom === 'bottom_leggings' ? 'trunks3' : null;
}

/**
 * The pixels of the figure the mends gave our outline (closing a hole or an edge with no line beside it)
 * take his line instead: the nearest pixel of his black line up to 4 px away (on the same part first), so
 * his pieces stay in his colours. The effects, the held weapon and our head are left as they are.
 */
function hisLine(rgba: Uint8ClampedArray, part: Uint8Array, top: Int16Array): void {
  const ours = (i: number) => rgba[i * 4] === 0x07 && rgba[i * 4 + 1] === 0x06 && rgba[i * 4 + 2] === 0x0b;
  const dark = (i: number) => rgba[i * 4 + 3] > 0 && Math.max(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]) + Math.min(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]) <= 102;
  // (our own outline round the held weapon and our head stays ours)
  const keep = new Set(['held', 'head', 'none'].map((p) => partIndex(p as PartId)));
  const todo: number[] = [];
  for (let i = 0; i < GRID * GRID; i++) if (rgba[i * 4 + 3] && top[i] !== FX && !keep.has(part[i]) && ours(i)) todo.push(i);
  // (a run of them takes his line from its ends inward: a few rounds, each from what the last one left)
  for (let round = 0; round < 4 && todo.length; round++) {
    const done: [number, number][] = [];
    for (const i of todo) {
      const x0 = i % GRID;
      const y0 = Math.floor(i / GRID);
      let best = -1;
      let bd = Infinity;
      for (let y = Math.max(0, y0 - 4); y <= Math.min(GRID - 1, y0 + 4); y++)
        for (let x = Math.max(0, x0 - 4); x <= Math.min(GRID - 1, x0 + 4); x++) {
          const j = y * GRID + x;
          // (a line of another part counts a pixel further off than one of its own)
          const d = Math.hypot(x - x0, y - y0) + (part[j] === part[i] ? 0 : 1);
          if (j !== i && dark(j) && !ours(j) && d < bd) (best = j), (bd = d);
        }
      if (best >= 0) done.push([i, best]);
    }
    for (const [i, j] of done) for (let c = 0; c < 3; c++) rgba[i * 4 + c] = rgba[j * 4 + c];
    const left = new Set(done.map(([i]) => i));
    todo.splice(0, todo.length, ...todo.filter((i) => !left.has(i)));
  }
}

/** The biggest bit of a piece left loose from the figure that is taken away (a cuff's corner cut off by its turn). */
const LOOSE_BIT = 6;

/** Takes away the few-pixel bits apart from the figure (8-connected), but the held weapon's (a blade's glints) and the effects'. */
function dropLooseBits(rgba: Uint8ClampedArray, part: Uint8Array, top: Int16Array): void {
  const N = GRID * GRID;
  const seen = new Uint8Array(N);
  const held = partIndex('held');
  const pieces: number[][] = [];
  for (let i = 0; i < N; i++) {
    if (seen[i] || !rgba[i * 4 + 3]) continue;
    const g: number[] = [];
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const j = stack.pop()!;
      g.push(j);
      const x = j % GRID;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const k = j + dy * GRID + dx;
          if ((!dx && !dy) || x + dx < 0 || x + dx >= GRID || k < 0 || k >= N || seen[k] || !rgba[k * 4 + 3]) continue;
          seen[k] = 1;
          stack.push(k);
        }
    }
    pieces.push(g);
  }
  const main = pieces.reduce((m, g) => (g.length > m.length ? g : m), pieces[0] ?? []);
  for (const g of pieces)
    if (g !== main && g.length <= LOOSE_BIT && !g.some((i) => part[i] === held || top[i] === FX)) for (const i of g) rgba[i * 4 + 3] = 0;
}

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
