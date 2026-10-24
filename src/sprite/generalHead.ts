// The owner's Roman general's head on our male bodies at his own height. He drew his chin over his scarf, on
// a longer neck than ours: with his face ('general') on a male body the head is raised under it (every head
// piece, hair and eye goes with it), as his Roman head is (romanNeck.ts). His neck under the chin is in his
// face's own pixels (generalHeadArt.ts).

import { GENERAL_HEAD_UP } from './generalHeadArt';
import { RES, v } from './raster';
import type { Rig } from './rig';
import { isFemaleBody, type SpriteAppearance } from './types';

/** Whether this look stands his Roman general's head at his height: his face on a male body (male, bulky). */
export const onGeneralHead = (look: SpriteAppearance): boolean => look.faceShape === 'general' && !isFemaleBody(look.body);

/** The rig with the head raised to where he drew it, for his face on a male body; any other look's rig as it is. */
export function generalRig(rig: Rig, look: SpriteAppearance): Rig {
  if (!onGeneralHead(look)) return rig;
  return { ...rig, head: v(rig.head.x, rig.head.y - GENERAL_HEAD_UP / RES) };
}
