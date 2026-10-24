// The owner's standard characters off his pictures: no crack, light edge pixel or loose bit (compose.ts
// standardOf, glitches.ts mendGlitches). The owner (2026-10-23): "quiero que arregles solo los de la calidad
// standard". Every idle is his picture and is not looked at.
// A pocket (background walled in) is reported, never filled: it is his separation (glitches.ts mendGlitches,
// docs/SPRITE_STYLE_GUIDE.md "Known errors").

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { findGlitches } from './glitches';
import { defaultAppearance } from './legacy';
import { PAINTED_SKIN } from './items/trunksKit';
import { GRID } from './raster';
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
    it(`${name}: no crack, light edge or loose bit in any pose (every third frame)`, () => {
      const found: string[] = [];
      for (const pose of POSES) {
        const n = frameCount(rigPoseFor(pose, look.cast?.style, look.stowed ? undefined : look.slots.held?.id));
        for (let f = 0; f < n; f += 3)
          for (const g of findGlitches(renderSprite(look, pose, f))) {
            if (g.kind === 'pocket') continue;
            // (his open-toed boots' bare toes are light to their tip, as at rest)
            if (look.slots.feet?.id === 'feet_cowboy' && g.kind === 'edge' && g.parts.every((p) => p.startsWith('foot'))) continue;
            found.push(`${pose} ${f}: ${g.kind} at ${g.x},${g.y} (${g.parts.join('/')})`);
          }
      }
      assert.deepEqual(found, []);
    });
  // his marks on the sheets 1 and 3 (2026-10-23, "trunks errores relleno"): a pocket stays open but where he saw
  // it filled and left it
  it('fills only the pockets he left filled (keptFills.ts)', () => {
    const [two, three] = LOOKS.map(([, l]) => l);
    for (const [what, look, pose, frame, x, y, filled] of [
      ['Trunks 2 Embestida 1', two, 'tackle', 0, 140, 180, false],
      ['Trunks 2 Caminar 1', two, 'walk', 0, 138, 173, false],
      ['Trunks 2 Caminar 2, left filled', two, 'walk', 1, 116, 200, true],
      ['Trunks 2 Leer 1, left filled', two, 'read', 0, 122, 180, true],
      ['Trunks 3 Carga 1', three, 'charge', 0, 140, 177, false],
      ['Trunks 3 Correr 2', three, 'run', 1, 116, 160, false],
    ] as [string, SpriteAppearance, SpritePose, number, number, number, boolean][])
      assert.equal(renderSprite(look, pose, frame).rgba[(y * GRID + x) * 4 + 3] > 0, filled, `${what}: ${filled ? 'filled' : 'open'}`);
  });
});
