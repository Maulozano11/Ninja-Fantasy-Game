// The owner's standard characters off his pictures: no pocket, crack or light edge pixel (compose.ts
// standardLook, glitches.ts mendGlitches). The owner (2026-10-23): "quiero que arregles solo los de la calidad
// standard". His Lyra's own frames (ownerFrames.ts) and every idle are his pictures and are not looked at.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { renderSprite } from './compose';
import { findGlitches } from './glitches';
import { defaultAppearance, dojutsuToEye } from './legacy';
import { paintedFrame } from './ownerFrames';
import { frameCount, rigPoseFor } from './rig';
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

const lyra = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_lyra')!.character;
const LOOKS: [string, SpriteAppearance, EyeSpecial, boolean][] = [
  ['Roman', roman(), 'none', false],
  ['Lyra', lyra.appearance!, dojutsuToEye(lyra.dojutsu), true],
];

describe("the owner's standard characters", () => {
  for (const [name, look, eye, painted] of LOOKS)
    it(`${name}: no pocket, crack or light edge in any pose (every third frame)`, () => {
      const found: string[] = [];
      for (const pose of POSES) {
        const n = frameCount(rigPoseFor(pose, look.cast?.style, look.stowed ? undefined : look.slots.held?.id));
        for (let f = 0; f < n; f += 3) {
          if (painted && paintedFrame(pose, f)) continue;
          for (const g of findGlitches(renderSprite(look, pose, f, eye))) found.push(`${pose} ${f}: ${g.kind} at ${g.x},${g.y} (${g.parts.join('/')})`);
        }
      }
      assert.deepEqual(found, []);
    });
});
