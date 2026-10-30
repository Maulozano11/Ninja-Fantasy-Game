// The generic soft and square faces are gone (the owner, 2026-10-29: "son iguales que genérica tapered;
// ya no gastes recursos en ellas"): a look saved with one loads on the tapered face, through
// migrateAppearance (legacy.ts) and migrateCharacter.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGACY_ROSTER } from '../data/missions';
import { migrateCharacter } from '../rules/ninja';
import type { ShinobiCharacter } from '../types/shinobi';
import { renderSprite } from './compose';
import { migrateAppearance, RETIRED_FACES } from './legacy';
import type { SpriteAppearance } from './types';

/** A look as a save from before the change holds it. */
const withFace = (l: SpriteAppearance, face: string): SpriteAppearance => ({ ...l, faceShape: face } as unknown as SpriteAppearance);

describe('the soft and square faces, removed', () => {
  const sheet = LEGACY_ROSTER.find((c) => c.appearance)!;
  const tapered = withFace(sheet.appearance!, 'tapered');

  for (const face of ['soft', 'square']) {
    it(`a saved look with the ${face} face loads on the tapered face, the rest of the look unchanged`, () => {
      const saved = withFace(sheet.appearance!, face);
      const now = migrateAppearance(saved);
      assert.deepEqual(now, tapered);
      assert.equal(saved.faceShape as string, face, 'the saved look itself is not changed');
      assert.deepEqual(renderSprite(now, 'idle', 0).rgba, renderSprite(tapered, 'idle', 0).rgba);
      assert.equal(migrateAppearance(now), now, 'once');
    });

    it(`a saved character with the ${face} face loads on the tapered face`, () => {
      const saved = { ...sheet, appearance: withFace(sheet.appearance!, face) } as ShinobiCharacter;
      assert.equal(migrateCharacter(saved).appearance!.faceShape, 'tapered');
    });
  }

  it('only those two: every face still in the game comes back as it is', () => {
    assert.deepEqual([...RETIRED_FACES].sort(), ['soft', 'square']);
    for (const face of ['tapered', 'valiant', 'night', 'founder', 'fine', 'aurelia', 'roman', 'base']) {
      const look = withFace(sheet.appearance!, face);
      assert.equal(migrateAppearance(look).faceShape, face);
    }
  });
});
