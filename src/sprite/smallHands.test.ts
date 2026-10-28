// The female bodies' small hands (appearance `hands: 'small'`): his Aurelia's hands in his pixels, an
// option of the creator ("Manos: Normales / Pequeñas"; the owner, 2026-10-22: "las manos mas pequeñas
// ponlas como opcion en el juego para personajes femeninos"): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CHARACTER, ALL_PRESETS } from '../data/shinobiData';
import { DAWN_HAND_FIST, DAWN_HAND_LINE, DAWN_HAND_NEAR } from './aureliaHandsArt';
import { renderSprite, spriteLayers } from './compose';
import { GRID, partIndex, RES } from './raster';
import { buildRig, frameCount } from './rig';
import { type BodyType, CAMP_POSES, MOVE_POSES, SPRITE_POSES, type SpriteAppearance, type SpritePose } from './types';

const bare = (body: BodyType, hands?: 'normal' | 'small'): SpriteAppearance => ({ ...DEFAULT_CHARACTER.appearance!, body, slots: {}, pixelEdits: [], ...(hands ? { hands } : {}) });
const same = (a: Uint8Array | Uint8ClampedArray, b: Uint8Array | Uint8ClampedArray) => a.length === b.length && a.every((v, i) => v === b[i]);
const handPixels = (f: { part: Uint8Array }, part: 'handN' | 'handF') => f.part.reduce((n, p) => n + (p === partIndex(part) ? 1 : 0), 0);
const hexAt = (rgba: Uint8Array | Uint8ClampedArray, i: number) => '#' + [0, 1, 2].map((k) => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('');

describe('Small hands', () => {
  it('are off by default: a look without the option is drawn with the normal hands', () => {
    for (const body of ['female'] as BodyType[])
      for (const pose of ['idle', 'attack', 'walk'] as SpritePose[]) assert.ok(same(renderSprite(bare(body), pose, 1).rgba, renderSprite(bare(body, 'normal'), pose, 1).rgba), `${body} ${pose}`);
  });

  it('are ignored on the male and bulky bodies', () => {
    for (const body of ['male', 'bulky'] as BodyType[])
      for (const pose of ['idle', 'attack', 'walk'] as SpritePose[]) assert.ok(same(renderSprite(bare(body), pose, 1).rgba, renderSprite(bare(body, 'small'), pose, 1).rgba), `${body} ${pose}`);
  });

  it('are smaller than the normal hands on the female bodies', () => {
    for (const body of ['female'] as BodyType[]) {
      const normal = renderSprite(bare(body), 'idle', 0);
      const small = renderSprite(bare(body, 'small'), 'idle', 0);
      for (const part of ['handN', 'handF'] as const) assert.ok(handPixels(small, part) < handPixels(normal, part) * 0.75, `${body} ${part}: ${handPixels(small, part)} against ${handPixels(normal, part)}`);
    }
  });

  it("are his Aurelia's: her near hand at rest is his piece laid on the wrist, his line where he drew it", () => {
    const f = renderSprite(bare('female', 'small'), 'idle', 0);
    const r = buildRig('female', 'idle', 0);
    const ax = Math.floor(r.wristN.x * RES) - DAWN_HAND_NEAR.pivot[0];
    const ay = Math.floor(r.wristN.y * RES) - DAWN_HAND_NEAR.pivot[1];
    let lines = 0;
    DAWN_HAND_NEAR.rows.forEach((row, j) =>
      [...row].forEach((ch, i) => {
        if (ch !== 'k' || j < DAWN_HAND_NEAR.pivot[1]) return; // the cuff's line above the wrist lies under the sleeve's
        const k = (ay + j) * GRID + ax + i;
        assert.equal(hexAt(f.rgba, k), DAWN_HAND_LINE, `his line at ${ax + i},${ay + j}`);
        lines++;
      }),
    );
    assert.ok(lines >= 12);
    // the fist is his too: a few rows of skin closed in his line
    assert.ok(DAWN_HAND_FIST.rows.length <= 7 && DAWN_HAND_FIST.rows[0].length <= 7);
  });

  it("are Aurelia's own, and drawn on both arms in every pose", () => {
    const aurelia = ALL_PRESETS.find((p) => p.character.id === 'preset_aurelia')!.character.appearance!;
    assert.equal(aurelia.hands, 'small');
    for (const pose of [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES] as SpritePose[])
      for (let fr = 0; fr < frameCount(pose); fr++) {
        // each arm has its hand (the fist or the open hand, or the heroines' small hand round a grip)
        const { layers } = spriteLayers(bare('female', 'small'), pose, fr);
        for (const part of ['handN', 'handF'] as const) {
          const drawn = [...layers.values()].some((L) => L.part.some((p, i) => p === partIndex(part) && L.mat[i] >= 0));
          assert.ok(drawn, `${pose} ${fr}: no ${part}`);
        }
      }
  });
});
