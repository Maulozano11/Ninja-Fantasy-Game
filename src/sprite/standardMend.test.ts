// The owner's standard characters off his pictures: no crack, light edge pixel or loose bit (compose.ts
// standardOf, glitches.ts mendGlitches). The owner (2026-10-23): "quiero que arregles solo los de la calidad
// standard". Every idle is his picture and is not looked at.
// A pocket (background walled in) is reported, never filled: it is his separation (glitches.ts mendGlitches,
// docs/SPRITE_STYLE_GUIDE.md "Known errors").

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { enemyCharacter } from '../battle/units';
import { renderSprite } from './compose';
import { findGlitches } from './glitches';
import { leftAsDrawn } from './keptFills';
import { dojutsuToEye, getAppearance } from './legacy';
import { GRID } from './raster';
import { frameCount, rigPoseFor } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type SpritePose } from './types';

const POSES: SpritePose[] = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES].filter((p) => p !== 'idle');

describe("the owner's standard characters", () => {
  for (const [name, n] of [['Cazador 1', 0], ['Cazador 2', 1]] as const)
    it(`${name}: no crack, light edge or loose bit in any pose (every third frame)`, () => {
      const c = enemyCharacter('hunter', n);
      const look = getAppearance(c);
      const found: string[] = [];
      for (const pose of POSES) {
        const frames = frameCount(rigPoseFor(pose, look.cast?.style, look.stowed ? undefined : look.slots.held?.id));
        for (let f = 0; f < frames; f += 3)
          for (const g of findGlitches(renderSprite(look, pose, f, dojutsuToEye(c.dojutsu)))) {
            if (g.kind === 'pocket') continue;
            // (a light edge he marked as his drawing stays as drawn: keptFills.ts LEFT_AS_DRAWN)
            if (leftAsDrawn(`${n ? 'cazadora' : 'cazador1'}@${look.body}`, pose, f, g.y * GRID + g.x)) continue;
            // (this branch's frames carry no effects mask: the cast's runes read as loose bits)
            if (pose === 'cast' && g.kind === 'loose') continue;
            found.push(`${pose} ${f}: ${g.kind} at ${g.x},${g.y} (${g.parts.join('/')})`);
          }
      }
      assert.deepEqual(found, []);
    });
  // his marks (2026-10-23): a pocket stays open (his separation) but where he saw it filled and left it (or
  // marked it back in blue), a light edge he marked red stays as drawn, and where he marked green the elbow is skin
  it('fills only the pockets he left filled, keeps his marked edges and makes the elbows skin', () => {
    const px = (n: number, pose: SpritePose, frame: number, x: number, y: number) => {
      const c = enemyCharacter('hunter', n);
      const i = (y * GRID + x) * 4;
      return [...renderSprite(getAppearance(c), pose, frame, dojutsuToEye(c.dojutsu)).rgba.subarray(i, i + 4)];
    };
    for (const [what, n, pose, frame, x, y, want] of [
      ['the Cazadora Arrojar 2, red then blue ("el de azul regresalo si estaba bien")', 1, 'throw', 1, 114, 145, 'filled'],
      ['the Cazadora Caminar 5, red', 1, 'walk', 4, 121, 167, 'open'],
      ['the Cazadora Estocada 2, red: the arm edge as drawn', 1, 'pierce', 1, 104, 166, 'skin'],
      ['Cazador 1 Carga 1, green ("les falta rellenar con pixeles los codos")', 0, 'charge', 0, 105, 165, 'skin'],
      ['Cazador 1 Sigilo 2, green', 0, 'sneak', 1, 116, 170, 'skin'],
      ['Cazador 1 Reposo 1, his picture: no elbow of ours beside his arm', 0, 'idle', 0, 113, 167, 'open'],
      ['Cazador 1 Caminar 3, left filled', 0, 'walk', 2, 115, 167, 'filled'],
    ] as [string, number, SpritePose, number, number, number, 'open' | 'filled' | 'skin'][]) {
      const [r, g, b, a] = px(n, pose, frame, x, y);
      assert.ok(want === 'open' ? a === 0 : want === 'filled' ? a > 0 : a > 0 && r > 150 && r > g && g > b, `${what}: ${want}`);
    }
  });
});
