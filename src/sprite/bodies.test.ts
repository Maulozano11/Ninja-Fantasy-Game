// The slender body is gone (the owner, 2026-10-22: "elimina el tipo de cuerpo delgado"): a look saved
// on it loads on the female body, through migrateAppearance (legacy.ts) and migrateCharacter.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { COMPANIONS } from '../data/missions';
import { migrateCharacter } from '../rules/ninja';
import type { ShinobiCharacter } from '../types/shinobi';
import { renderSprite } from './compose';
import { migrateAppearance } from './legacy';
import { randomAppearance } from './random';
import type { SpriteAppearance } from './types';

/** A look as a save from before the change holds it. */
const onSlender = (l: SpriteAppearance): SpriteAppearance => ({ ...l, body: 'slender' } as unknown as SpriteAppearance);

describe('the slender body, removed', () => {
  const preset = COMPANIONS.find((c) => c.appearance?.body === 'female')!;

  it('a saved look on it loads on the female body, the rest of the look unchanged', () => {
    const saved = onSlender(preset.appearance!);
    const now = migrateAppearance(saved);
    assert.deepEqual(now, preset.appearance);
    assert.equal((saved.body as string), 'slender', 'the saved look itself is not changed');
    assert.deepEqual(renderSprite(now, 'idle', 0).rgba, renderSprite(preset.appearance!, 'idle', 0).rgba);
    assert.equal(migrateAppearance(now), now, 'once');
  });

  it('a saved character on it loads on the female body, with an old headband plate dropped too', () => {
    const look = onSlender(preset.appearance!);
    const saved = { ...preset, appearance: { ...look, headband: { ...look.headband, slashed: true, emblem: 'bolt', plate: '#ff00ff' } } } as ShinobiCharacter;
    const now = migrateCharacter(saved);
    assert.equal(now.appearance!.body, 'female');
    assert.deepEqual(now.appearance, migrateCharacter(preset).appearance);
    assert.deepEqual(migrateCharacter(now), now, 'once');
  });

  it('nobody is drawn on it: no companion, legend or random ninja', () => {
    for (const c of COMPANIONS) assert.notEqual(c.appearance?.body as string, 'slender', c.id);
    for (let i = 0; i < 200; i++) assert.notEqual(randomAppearance().body as string, 'slender');
  });
});
