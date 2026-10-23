// The owner's standard characters off his pictures: no pocket, crack, light edge pixel or loose bit (compose.ts
// standardLook, glitches.ts mendGlitches). The owner (2026-10-23): "quiero que arregles solo los de la calidad
// standard". Every idle is his picture and is not looked at.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { findGlitches } from './glitches';
import { defaultAppearance } from './legacy';
import { PAINTED_SKIN } from './items/trunksKit';
import { frameCount, rigPoseFor } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type SlotId, type SpriteAppearance, type SpritePose } from './types';

const POSES: SpritePose[] = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES].filter((p) => p !== 'idle');

/** As he painted over our male: Solen's skin, the crystal greatsword in the near hand. */
function painted(items: Partial<Record<SlotId, string>>): SpriteAppearance {
  const l = defaultAppearance();
  l.slots = {};
  for (const [slot, id] of Object.entries({ ...items, held: 'held_crystal' })) l.slots[slot as SlotId] = { id: id!, colors: getItem(id!)!.colors.map((c) => c.default) };
  l.skin = PAINTED_SKIN;
  return l;
}

const LOOKS: [string, SpriteAppearance][] = [
  ['Trunks 2', painted({ cape: 'cape_traveler', top: 'top_highcollar', bottom: 'bottom_cargo', feet: 'feet_leather', waist: 'waist_belt', hands: 'hands_traveler_gloves', hair: 'hair_drifter' })],
  ['Trunks 3', painted({ top: 'top_bomber', bottom: 'bottom_leggings', feet: 'feet_cowboy', hair: 'hair_surge' })],
];

describe("the owner's standard characters", () => {
  for (const [name, look] of LOOKS)
    it(`${name}: no pocket, crack, light edge or loose bit in any pose (every third frame)`, () => {
      const found: string[] = [];
      for (const pose of POSES) {
        const n = frameCount(rigPoseFor(pose, look.cast?.style, look.stowed ? undefined : look.slots.held?.id));
        for (let f = 0; f < n; f += 3)
          for (const g of findGlitches(renderSprite(look, pose, f))) {
            // (his open-toed boots' bare toes are light to their tip, as at rest)
            if (look.slots.feet?.id === 'feet_cowboy' && g.kind === 'edge' && g.parts.every((p) => p.startsWith('foot'))) continue;
            found.push(`${pose} ${f}: ${g.kind} at ${g.x},${g.y} (${g.parts.join('/')})`);
          }
      }
      assert.deepEqual(found, []);
    });
});
