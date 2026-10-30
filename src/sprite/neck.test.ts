// The neck option is gone (the owner, 2026-10-22: "quitar el cuello del creador y dejar a todos con el
// cuello de hoy"): every look draws today's slim nape, the one his Aiden has, but his Lyra, who keeps the
// long neck she has. A look saved with the thick 'strong' neck loads and draws as slim, through migrateAppearance (legacy.ts) and
// migrateCharacter, on every load path (the hero, the roster, a saved mission).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { COMPANIONS, HANA, RIVER_FOREST_PATROL } from '../data/missions';
import { loadRun, saveRun, startRun } from '../game/missionRun';
import { loadHero, loadRoster } from '../game/saves';
import { migrateCharacter } from '../rules/ninja';
import type { ShinobiCharacter } from '../types/shinobi';
import { renderSprite } from './compose';
import { migrateAppearance } from './legacy';
import { randomAppearance } from './random';
import type { BodyType, SpriteAppearance, SpritePose } from './types';

/** A look as a save from before the change holds it. */
const withNeck = (l: SpriteAppearance, neck: string): SpriteAppearance => ({ ...l, neck } as SpriteAppearance);

function storage(items: Record<string, unknown>): void {
  const m = new Map(Object.entries(items).map(([k, v]) => [k, JSON.stringify(v)]));
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => m.set(k, v), removeItem: (k: string) => m.delete(k) };
}

const aiden = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_reference_aiden')!.character;
/** A made ninja on Aiden's look: not a legend's copy, so only the look's migration applies. */
const made = (look: SpriteAppearance): ShinobiCharacter => ({ ...aiden, id: 'ninja_neck', appearance: look });

describe('the neck option, removed', () => {
  it("a saved look with the thick neck draws pixel for pixel as the same look without one", () => {
    // Bald too, so nothing hides the nape.
    const { hair: _hair, ...noHair } = aiden.appearance!.slots;
    const bald: SpriteAppearance = { ...aiden.appearance!, slots: noHair };
    for (const base of [aiden.appearance!, bald])
      for (const body of ['male', 'female', 'bulky'] as BodyType[])
        for (const [pose, frame] of [['idle', 0], ['attack', 1], ['run', 2], ['sit', 0]] as [SpritePose, number][]) {
          const today = { ...base, body };
          const saved = withNeck(today, 'strong');
          const want = renderSprite(today, pose, frame).rgba;
          assert.deepEqual(renderSprite(saved, pose, frame).rgba, want, `${body} ${pose} ${frame}, as saved`);
          assert.deepEqual(renderSprite(migrateAppearance(saved), pose, frame).rgba, want, `${body} ${pose} ${frame}, migrated`);
        }
  });

  it('migrateAppearance drops a saved neck, whichever it was, once; a look without one comes back as it is', () => {
    for (const neck of ['strong', 'slim']) {
      const saved = withNeck(aiden.appearance!, neck);
      const now = migrateAppearance(saved);
      assert.deepEqual(now, aiden.appearance);
      assert.ok(!('neck' in now));
      assert.equal((saved as { neck?: string }).neck, neck, 'the saved look itself is not changed');
      assert.equal(migrateAppearance(now), now, 'once');
    }
    assert.equal(migrateAppearance(aiden.appearance!), aiden.appearance);
  });

  it('every load path drops it: the hero, the roster, a saved mission', () => {
    const old = made(withNeck(aiden.appearance!, 'strong'));
    const want = migrateCharacter(made(aiden.appearance!)).appearance;
    storage({ 'shinobi5e.hero.v1': old, 'shinobi5e.roster.v1': [{ character: old, savedAt: 1 }] });
    for (const c of [loadHero()!, loadRoster()[0].character]) {
      assert.deepEqual(c.appearance, want);
      assert.deepEqual(migrateCharacter(c), c, 'loading again changes nothing');
    }
    const run = startRun(RIVER_FOREST_PATROL, 'ninja_neck', [made(aiden.appearance!), HANA], { seed: 3, leaderId: 'ninja_neck', difficulty: 'normal', noRandomness: false });
    const saved = JSON.parse(JSON.stringify(run));
    saved.party.members[0].appearance.neck = 'strong';
    saved.entry.members[0].appearance.neck = 'strong';
    storage({});
    saveRun(saved);
    const loaded = loadRun()!;
    for (const p of [loaded.party, loaded.entry]) assert.ok(!('neck' in p.members[0].appearance!));
  });

  it("keeps his Lyra's long neck, the neck she has today (her preset's, not a creator option)", () => {
    const lyra = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_lyra')!.character.appearance!;
    assert.equal(lyra.neck, 'long');
    assert.equal(migrateAppearance(lyra), lyra);
    assert.equal(migrateCharacter(made(lyra)).appearance!.neck, 'long');
  });

  it("nobody else has one: no other legend, companion or random ninja", () => {
    for (const p of LEGENDARY_PRESETS) if (p.character.id !== 'preset_lyra') assert.ok(!('neck' in p.character.appearance!), p.character.id);
    for (const c of COMPANIONS) if (c.appearance && c.id !== 'preset_lyra') assert.ok(!('neck' in c.appearance), c.id);
    for (let i = 0; i < 200; i++) assert.ok(!('neck' in randomAppearance()));
  });
});
