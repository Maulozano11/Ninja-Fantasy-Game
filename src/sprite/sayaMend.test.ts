// Saya off his picture: no crack or light edge pixel (compose.ts standardOf, glitches.ts mendGlitches). The
// owner (2026-10-23): "quiero que arregles solo los de la calidad standard". Every idle is his picture and is
// not looked at; what he draws so stays: her sword glints, the windows between her skirt and her thighs.
// A pocket (background walled in) is reported, never filled: it is his separation (glitches.ts mendGlitches,
// docs/SPRITE_STYLE_GUIDE.md "Known errors").

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { renderSprite } from './compose';
import { findGlitches } from './glitches';
import { dojutsuToEye } from './legacy';
import { GRID } from './raster';
import { frameCount, rigPoseFor } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type SpritePose } from './types';

const POSES: SpritePose[] = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES].filter((p) => p !== 'idle');
const HERS = new Set(['pelvis', 'thighN', 'thighF']);

describe("the owner's Saya", () => {
  it('Saya: no crack or light edge in any pose (every third frame), but what he drew so', () => {
    const saya = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_saya')!.character;
    const look = saya.appearance!;
    const found: string[] = [];
    for (const pose of POSES) {
      const n = frameCount(rigPoseFor(pose, look.cast?.style, look.stowed ? undefined : look.slots.held?.id));
      for (let f = 0; f < n; f += 3)
        for (const g of findGlitches(renderSprite(look, pose, f, dojutsuToEye(saya.dojutsu)))) {
          if (g.kind === 'pocket') continue;
          if (g.kind === 'loose' && g.parts.every((p) => p === 'held')) continue;
          if (g.kind !== 'loose' && g.parts.every((p) => HERS.has(p))) continue;
          found.push(`${pose} ${f}: ${g.kind} at ${g.x},${g.y} (${g.parts.join('/')})`);
        }
    }
    assert.deepEqual(found, []);
  });
  // his marks on her sheet 1 (2026-10-23): a pocket stays open but where he saw it filled and left it
  it('Saya: fills only the pockets he left filled (keptFills.ts)', () => {
    const saya = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_saya')!.character;
    const eye = dojutsuToEye(saya.dojutsu);
    for (const [what, pose, frame, x, y, filled] of [
      ['Sellos 1', 'handsigns', 0, 119, 161, false],
      ['Sellos 2', 'handsigns', 1, 119, 161, false],
      ['Ataque 3, left filled', 'attack', 2, 145, 155, true],
      ['Arrojar 3, left filled', 'throw', 2, 147, 166, true],
      ['Estocada 4, left filled', 'pierce', 3, 125, 173, true],
    ] as [string, SpritePose, number, number, number, boolean][])
      assert.equal(renderSprite(saya.appearance!, pose, frame, eye).rgba[(y * GRID + x) * 4 + 3] > 0, filled, `${what}: ${filled ? 'filled' : 'open'}`);
  });
});
