// Frames the owner painted himself for a pose (his Lyra reading and sitting, his repaint of her throw's
// release and follow-through): his pixels one for one, cut by owner (the option of hers that draws them: her hair,
// her face, the blouse with the skin of her arms and hands, the corset, the skirt, the tabard, the belt,
// the boots with her bare thighs, the sword, the book) and by body part, each piece pinned to the rig
// joint its part hangs from (tools/refs/owner_frames.py). On her figure (wearsHisFigure: a female body with
// her face, her options in her slots) each of her options draws its pieces in those frames instead of its
// own drawing, so the frame is his, pixel for pixel; her blouse and boots take our body off under them
// (her skin is theirs there).

import { retintHex } from './color';
import type { Depth, DrawCtx } from './ctx';
import { LYRA_BOOT_SKIN } from './items/lyraBootsArt';
import { LYRA_READ } from './items/lyraReadArt';
import { LYRA_SIT } from './items/lyraSitArt';
import { LYRA_THROW } from './items/lyraThrowArt';
import { hisSkinTone } from './lyraFace';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, RES, type PartId } from './raster';
import { READ_KEYS, type Rig } from './rig';
import { isFemaleBody, type SlotId, type SpriteAppearance } from './types';

export type FrameOwner = 'hair' | 'face' | 'top' | 'armor' | 'bottom' | 'skirt' | 'waist' | 'feet' | 'held' | 'book';
export type FrameJoint = 'head' | 'neck' | 'pelvis' | 'shoulderN' | 'shoulderF' | 'elbowN' | 'elbowF' | 'wristN' | 'wristF' | 'hipN' | 'hipF' | 'kneeN' | 'kneeF' | 'ankleN' | 'ankleF';

/** One piece of an owner's frame (generated: items/lyraReadArt.ts). */
export interface OwnerPiece {
  owner: FrameOwner;
  depth: Depth;
  part: PartId;
  /** The rig joint it is pinned to, and the fine pixel of that joint where he drew it (floor of the joint). */
  joint: FrameJoint;
  at: [number, number];
  /** The cell that sits on the joint's fine pixel. */
  pivot: [number, number];
  /** One character per colour of his; '.' is empty. */
  rows: string[];
  colors: Record<string, string>;
  /**
   * The colour slot (key) of the owner's option each colour follows; 'line' (his black line) and
   * 'keep' stay his; 'skin' follows the character's skin, 'eye' the eye colour.
   */
  kinds: Record<string, string>;
}

/** The fine pixel a joint's pieces are stamped from. */
export function jointPixel(r: Rig, joint: FrameJoint): [number, number] {
  const p = r[joint];
  return [Math.floor(p.x * RES + 1e-6), Math.floor(p.y * RES + 1e-6)];
}

/** The owner's read frame for a frame of the read pose: his three keys over the loop (rig.ts READ_KEYS). */
export function readKey(frame: number): number {
  return READ_KEYS[((frame % READ_KEYS.length) + READ_KEYS.length) % READ_KEYS.length];
}

/** Her options, by slot: what his frames of her are cut into. */
const HERS: Partial<Record<SlotId, string>> = {
  hair: 'hair_copper_braid',
  top: 'top_offshoulder_blouse',
  armor: 'armor_gilded_corset',
  bottom: 'bottom_striped_pleats',
  skirt: 'skirt_gilded_tabard',
  waist: 'waist_pouch_belt',
  feet: 'feet_gilded_thigh_boots',
  held: 'held_gilded_rapier',
};

/**
 * Whether a look is his Lyra's figure, the one his frames are of: a female body with her face ('fine'),
 * and in each of her slots her option or nothing (her colours may change). With another option in one of
 * them (another hairstyle, other boots) his frame would not fit it, and every option draws itself on the rig.
 */
export function wearsHisFigure(look: SpriteAppearance): boolean {
  if (!isFemaleBody(look.body) || look.faceShape !== 'fine') return false;
  return Object.entries(HERS).every(([slot, id]) => {
    const c = look.slots[slot as SlotId];
    return !c || c.id === id || c.id.endsWith('_none');
  });
}

/** His painted frame of her for a pose and frame (whatever the look), if he painted one. */
export function paintedFrame(pose: string, frame: number): OwnerPiece[] | null {
  if (pose === 'read') return LYRA_READ[readKey(frame)];
  // (he drew one frame of her sitting: every frame of the sit loop, rig.ts SIT_KEYS)
  if (pose === 'sit') return LYRA_SIT;
  if (pose === 'throw' && (frame === 3 || frame === 4)) return LYRA_THROW[frame - 3];
  return null;
}

/** The owner's frame for the rig's pose and frame, if he painted one and the look is his figure. */
export function ownerFrame(g: Pick<DrawCtx, 'rig' | 'look'>): OwnerPiece[] | null {
  return wearsHisFigure(g.look) ? paintedFrame(g.rig.pose, g.rig.frame) : null;
}

/** Stamps one piece of his on its joint, each colour of his through `tint` (kind, his colour). */
export function stampOwnerPiece(g: DrawCtx, p: OwnerPiece, tint: (kind: string, hex: string) => string = (_k, hex) => hex): void {
  const [ax, ay] = jointPixel(g.rig, p.joint);
  const L = g.L(p.depth);
  // (his hair is his: not frayed)
  if (p.depth === 'hairFront' || p.depth === 'hairBack') L.noFray = true;
  const mats: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(p.colors)) mats[ch] = g.m(tint(p.kinds[ch], hex), 'flat');
  const x0 = ax - p.pivot[0];
  const y0 = ay - p.pivot[1];
  p.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') L.set(x0 + i, y0 + j, mats[row[i]], 3, p.part, F_NO_TEXTURE | F_NO_OUTLINE);
  });
}

/**
 * Draws an owner's pieces in the owner's frame, if this is one of his frames: true when it did (the
 * option then draws nothing of its own). `tint` recolours his colours by kind.
 */
export function drawOwner(g: DrawCtx, owner: FrameOwner, tint?: (kind: string, hex: string) => string): boolean {
  const pieces = ownerFrame(g);
  if (!pieces) return false;
  for (const p of pieces) if (p.owner === owner) stampOwnerPiece(g, p, tint);
  return true;
}

/** Takes the body's own drawing off these layers (where her option's pieces carry her skin instead). */
export function clearLayers(g: DrawCtx, depths: Depth[]): void {
  for (const d of depths) {
    const L = g.L(d);
    for (let i = 0; i < GRID * GRID; i++) L.mat[i] = -1;
  }
}

/** Each colour slot of an option, by key: its default and the colour chosen for it. */
export type SlotMoves = Record<string, [from: string, to: string]>;

/** Her preset's skin, the skin his frames are painted in (the boots' thigh: lyra-boots-from-ref.py). */
export const OWNER_FRAME_SKIN = LYRA_BOOT_SKIN;

/**
 * Recolours his colours by kind: a slot's colours move the way the slot moved from its default
 * (retintHex: kept, they stay his), his skin follows the character's (lyraFace.ts hisSkinTone: in her
 * preset's skin, his); his line and the rest stay his.
 */
export function slotTint(moves: SlotMoves, skin?: string): (kind: string, hex: string) => string {
  return (kind, hex) => {
    if (kind === 'skin') return skin ? hisSkinTone(hex, OWNER_FRAME_SKIN, skin) : hex;
    const m = moves[kind];
    return m ? retintHex(hex, m[0], m[1]) : hex;
  };
}
