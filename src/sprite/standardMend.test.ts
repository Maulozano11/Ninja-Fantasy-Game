// The owner's standard characters off his pictures: no pocket, crack or light edge pixel (compose.ts
// standardLook, glitches.ts mendGlitches). The owner (2026-10-23): "quiero que arregles solo los de la calidad
// standard". Every idle is his picture and is not looked at; what he draws so stays: Saya's sword glints, the
// windows between her skirt and her thighs.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { renderSprite } from './compose';
import { findGlitches } from './glitches';
import { dojutsuToEye } from './legacy';
import { frameCount, rigPoseFor } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type SpritePose } from './types';

const POSES: SpritePose[] = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES].filter((p) => p !== 'idle');
const HERS = new Set(['pelvis', 'thighN', 'thighF']);

describe("the owner's standard characters", () => {
  it('Saya: no pocket, crack or light edge in any pose (every third frame), but what he drew so', () => {
    const saya = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_saya')!.character;
    const look = saya.appearance!;
    const found: string[] = [];
    for (const pose of POSES) {
      const n = frameCount(rigPoseFor(pose, look.cast?.style, look.stowed ? undefined : look.slots.held?.id));
      for (let f = 0; f < n; f += 3)
        for (const g of findGlitches(renderSprite(look, pose, f, dojutsuToEye(saya.dojutsu)))) {
          if (g.kind === 'loose' && g.parts.every((p) => p === 'held')) continue;
          if (g.kind !== 'loose' && g.parts.every((p) => HERS.has(p))) continue;
          found.push(`${pose} ${f}: ${g.kind} at ${g.x},${g.y} (${g.parts.join('/')})`);
        }
    }
    assert.deepEqual(found, []);
  });
});
