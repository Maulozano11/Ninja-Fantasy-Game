// The owner's standard characters off his pictures: no pocket, crack, light edge pixel or loose bit (compose.ts
// standardLook, glitches.ts mendGlitches). The owner (2026-10-23): "quiero que arregles solo los de la calidad
// standard". Every idle is his picture and is not looked at.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { enemyCharacter } from '../battle/units';
import { renderSprite } from './compose';
import { findGlitches } from './glitches';
import { dojutsuToEye, getAppearance } from './legacy';
import { frameCount, rigPoseFor } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type SpritePose } from './types';

const POSES: SpritePose[] = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES].filter((p) => p !== 'idle');

describe("the owner's standard characters", () => {
  for (const [name, n] of [['Cazador 1', 0], ['Cazador 2', 1]] as const)
    it(`${name}: no pocket, crack, light edge or loose bit in any pose (every third frame)`, () => {
      const c = enemyCharacter('hunter', n);
      const look = getAppearance(c);
      const found: string[] = [];
      for (const pose of POSES) {
        const frames = frameCount(rigPoseFor(pose, look.cast?.style, look.stowed ? undefined : look.slots.held?.id));
        for (let f = 0; f < frames; f += 3)
          for (const g of findGlitches(renderSprite(look, pose, f, dojutsuToEye(c.dojutsu)))) {
            // (this branch's frames carry no effects mask: the cast's runes read as loose bits)
            if (pose === 'cast' && g.kind === 'loose') continue;
            found.push(`${pose} ${f}: ${g.kind} at ${g.x},${g.y} (${g.parts.join('/')})`);
          }
      }
      assert.deepEqual(found, []);
    });
});
