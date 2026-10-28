// The owner's standard characters off his pictures: no crack or light edge pixel (compose.ts
// standardOf, glitches.ts mendGlitches). The owner (2026-10-23): "quiero que arregles solo los de la calidad
// standard". His Lyra's own frames (ownerFrames.ts) and every idle are his pictures and are not looked at.
// A pocket (background walled in) is reported, never filled: it is his separation (glitches.ts mendGlitches,
// docs/SPRITE_STYLE_GUIDE.md "Known errors").

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ALL_PRESETS } from '../data/shinobiData';
import { renderSprite } from './compose';
import { findGlitches } from './glitches';
import { defaultAppearance, dojutsuToEye } from './legacy';
import { paintedFrame } from './ownerFrames';
import { frameCount, rigPoseFor } from './rig';
import { GRID } from './raster';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type EyeSpecial, type SpriteAppearance, type SpritePose } from './types';

const POSES: SpritePose[] = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES].filter((p) => p !== 'idle');

function roman(): SpriteAppearance {
  const l = defaultAppearance();
  l.slots.armor = { id: 'armor_bronze', colors: [] };
  l.slots.skirt = { id: 'skirt_imperial', colors: [], parts: { drapes: 'on' } };
  l.slots.hands = { id: 'hands_bronze_bracers', colors: [] };
  l.slots.feet = { id: 'feet_gladiator_sandals', colors: [], parts: { paint: 'roman' } };
  delete l.slots.top;
  delete l.slots.bottom;
  delete l.slots.cape;
  delete l.slots.held;
  return { ...l, body: 'male' };
}

const lyra = ALL_PRESETS.find((p) => p.character.id === 'preset_lyra')!.character;
const aurelia = ALL_PRESETS.find((p) => p.character.id === 'preset_aurelia')!.character;
// (her walk he approved pixel for pixel is left as it is: aureliaLegs.test.ts)
const LOOKS: [string, SpriteAppearance, EyeSpecial, boolean][] = [
  ['Roman', roman(), 'none', false],
  ['Lyra', lyra.appearance!, dojutsuToEye(lyra.dojutsu), true],
  ['Aurelia', aurelia.appearance!, dojutsuToEye(aurelia.dojutsu), false],
];

describe("the owner's standard characters", () => {
  for (const [name, look, eye, painted] of LOOKS)
    it(`${name}: no crack or light edge in any pose (every third frame)`, () => {
      const found: string[] = [];
      for (const pose of POSES) {
        if (name === 'Aurelia' && pose === 'walk') continue;
        const n = frameCount(rigPoseFor(pose, look.cast?.style, look.stowed ? undefined : look.slots.held?.id));
        for (let f = 0; f < n; f += 3) {
          if (painted && paintedFrame(pose, f)) continue;
          for (const g of findGlitches(renderSprite(look, pose, f, eye))) if (g.kind !== 'pocket') found.push(`${pose} ${f}: ${g.kind} at ${g.x},${g.y} (${g.parts.join('/')})`);
        }
      }
      assert.deepEqual(found, []);
    });
  // his marks (2026-10-23): a pocket stays open (his separation) but where he saw it filled and left it
  it('fills only the pockets he left filled (keptFills.ts)', () => {
    const ae = dojutsuToEye(aurelia.dojutsu);
    const opaque = (look: SpriteAppearance, pose: SpritePose, frame: number, x: number, y: number, eye: EyeSpecial = 'none') => renderSprite(look, pose, frame, eye).rgba[(y * GRID + x) * 4 + 3] > 0;
    for (const [what, look, pose, frame, x, y, filled, eye] of [
      ['Aurelia Carga 1, under the chin ("no lo repitas mas")', aurelia.appearance!, 'charge', 0, 133, 149, false, ae],
      ['Aurelia Sentado 1, thigh, shin and skirt', aurelia.appearance!, 'sit', 0, 124, 196, false, ae],
      ['Aurelia Carga 1, the arm at the elbow, left filled', aurelia.appearance!, 'charge', 0, 106, 162, true, ae],
      ['Aurelia Agacharse 1, left filled', aurelia.appearance!, 'crouch', 0, 143, 197, true, ae],
    ] as [string, SpriteAppearance, SpritePose, number, number, number, boolean, EyeSpecial?][])
      assert.equal(opaque(look, pose, frame, x, y, eye), filled, `${what}: ${filled ? 'filled' : 'open'}`);
  });
});
