// The owner's Aurelia's head on a female body where he drew it. In his picture of her at our scale
// (docs/reference/aurelia-escala-juego-owner-reference.jpg) her head stands three fine pixels higher and one
// further forward over her shoulders and collar than our female body carries it: her chin sits right on her
// high collar. On 2026-10-23, seeing her face on our head, he asked for his: "igual que romano copia la
// forma de cara cuello y peinado pixel a pixel me gusta mas la de mi dibujo". So with her face ('aurelia')
// on a female body the head is carried there (every head piece, hair, eye, mask and headband goes with it),
// and at rest her face, hair and collar are his pixels where he drew them (tools/refs/aurelia-face-from-ref.py).

import { add, RES, scale, sub, type Vec } from './raster';
import type { Rig } from './rig';
import { isFemaleBody, type SpriteAppearance } from './types';

/** How far her head stands from ours, in fine pixels: up along the torso and forward along the shoulders. */
export const AURELIA_HEAD_UP = 3;
export const AURELIA_HEAD_AHEAD = 1;

/** Her neck's back edge, in fine pixels from the near eye's first column along the shoulders: behind her near lock. */
export const AURELIA_NECK_BACK = -4;

/** Whether this look carries her head where he drew it: her face on a female body. */
export const onAureliaHead = (look: SpriteAppearance): boolean => look.faceShape === 'aurelia' && isFemaleBody(look.body);

/** The lift from our head to hers in this rig (design units): along its torso, so it follows a leaning body. */
function lift(r: Rig): Vec {
  return add(scale(r.up, AURELIA_HEAD_UP / RES), scale(r.right, AURELIA_HEAD_AHEAD / RES));
}

/** The rig with her head where he drew it, for her face on a female body; any other look's rig as it is. */
export function aureliaRig(r: Rig, look: SpriteAppearance): Rig {
  return onAureliaHead(look) ? { ...r, head: add(r.head, lift(r)) } : r;
}

/** Where the body's own head is in this rig (the neck turns toward it as for every female body). */
export function bodyHead(r: Rig, look: SpriteAppearance): Vec {
  return onAureliaHead(look) ? sub(r.head, lift(r)) : r.head;
}
