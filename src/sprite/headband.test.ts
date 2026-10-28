// Tests for the plain-cloth headband (the owner, 2026-10-22: "deja la bandana pero quitale el diseño de
// puntitos referenciando un simbolo deja la pura bandana la pura tela"): no metal plate, no emblem, no
// slash; old saves that still have them load and draw the cloth band. npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { enemyCharacter, type EnemyKind } from '../battle/units';
import { LEGACY_ROSTER } from '../data/missions';
import { migrateCharacter } from '../rules/ninja';
import type { ShinobiCharacter } from '../types/shinobi';
import { renderSprite } from './compose';
import { appearanceFromLegacy, defaultAppearance, migrateAppearance } from './legacy';
import { randomAppearance } from './random';
import type { HeadbandChoice, HeadbandPosition, SpritePose, SpriteAppearance } from './types';

const POSITIONS: HeadbandPosition[] = ['forehead', 'neck', 'arm', 'waist'];
const POSES: SpritePose[] = ['idle', 'walk', 'attack', 'hurt'];
/** A plate colour no cloth, skin or hair here uses, so any of its pixels would show. */
const PLATE = '#ff00ff';
const LEGACY_KEYS = ['slashed', 'emblem', 'plate'];

const ENEMIES: ShinobiCharacter[] = (['rogue', 'hunter', 'jonin', 'raider'] as EnemyKind[]).flatMap((k) => [0, 1, 2, 3].map((n) => enemyCharacter(k, n)));
// LEGACY_ROSTER holds Hana, Kenji and every legend preset
const EVERYONE: ShinobiCharacter[] = [...LEGACY_ROSTER, ...ENEMIES];

const withBand = (hb: Partial<HeadbandChoice>, base = defaultAppearance()): SpriteAppearance => ({ ...base, headband: { ...base.headband, ...hb } });
/** The same look with an old save's plate: slashed, an emblem and a magenta plate. */
const withOldPlate = (l: SpriteAppearance): SpriteAppearance => ({ ...l, headband: { ...l.headband, slashed: true, emblem: 'bolt', plate: PLATE } });

const sameRender = (a: SpriteAppearance, b: SpriteAppearance, pose: SpritePose = 'idle', frame = 0): boolean => {
  const x = renderSprite(a, pose, frame).rgba;
  const y = renderSprite(b, pose, frame).rgba;
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

/** Pixels near magenta (the plate colour above, in any of its metal shades). */
const plateLike = (l: SpriteAppearance, pose: SpritePose = 'idle', frame = 0): number => {
  const p = renderSprite(l, pose, frame).rgba;
  let n = 0;
  for (let i = 0; i < p.length; i += 4) if (p[i + 3] > 0 && p[i] > 120 && p[i + 2] > 120 && p[i + 1] < 0.6 * Math.min(p[i], p[i + 2])) n++;
  return n;
};

describe('the headband is plain cloth', () => {
  it('draws the same with or without an old plate, emblem and slash, in every position and pose', () => {
    for (const position of POSITIONS)
      for (const tails of [false, true]) {
        const l = withBand({ position, tails, cloth: '#2f7d5b' });
        for (const pose of POSES) {
          assert.ok(sameRender(l, withOldPlate(l), pose, 1), `${position} tails=${tails} ${pose}`);
          assert.equal(plateLike(withOldPlate(l), pose, 1), 0, `${position} tails=${tails} ${pose}: plate pixels`);
        }
        // and the band is still there: it is not the look without a headband
        assert.ok(!sameRender(l, withBand({ position: 'none' })), `${position}: the band is drawn`);
      }
  });

  it('no preset, companion or enemy draws a plate', () => {
    for (const c of EVERYONE) {
      const l = c.appearance!;
      for (const k of LEGACY_KEYS) assert.ok(!(k in l.headband), `${c.id}: ${k}`);
      assert.ok(sameRender(l, withOldPlate(l)), `${c.id}: the plate changes nothing`);
      assert.equal(plateLike(withOldPlate(l)), 0, `${c.id}: plate pixels`);
    }
  });

  it('the headbands the presets, companions and enemies wore are still worn', () => {
    const pos = (id: string) => EVERYONE.find((c) => c.id === id)!.appearance!.headband.position;
    assert.equal(pos('preset_storm'), 'forehead');
    assert.equal(pos('preset_sunburst'), 'forehead');
    assert.equal(pos('companion_hana'), 'forehead');
    assert.equal(pos('companion_kenji'), 'arm');
    for (const e of ENEMIES) assert.equal(e.appearance!.headband.position, 'forehead', e.id);
  });

  it('a saved hero with the old forehead plate loads as the cloth band', () => {
    const preset = LEGACY_ROSTER.find((c) => c.id === 'preset_sunburst')!;
    const old = {
      ...preset,
      id: 'my_ninja',
      appearance: { ...preset.appearance!, headband: { position: 'forehead', slashed: true, tails: true, emblem: 'spiral', cloth: '#1e3a8a', plate: '#cbd5e1' } },
    };
    const saved = JSON.parse(JSON.stringify(old)) as ShinobiCharacter;
    const now = migrateCharacter(saved);
    assert.deepEqual(now.appearance!.headband, { position: 'forehead', tails: true, cloth: '#1e3a8a' });
    assert.deepEqual(migrateCharacter(now), now, 'once');
    // it draws exactly the cloth-only band, and a band (not the bare head)
    const cloth = withBand({ position: 'forehead', tails: true, cloth: '#1e3a8a' }, preset.appearance!);
    assert.ok(sameRender(now.appearance!, cloth));
    assert.ok(!sameRender(now.appearance!, withBand({ position: 'none' }, preset.appearance!)));
    // the rest of the sheet is untouched
    assert.deepEqual({ ...now, appearance: undefined }, { ...migrateCharacter({ ...saved, appearance: preset.appearance }), appearance: undefined });
  });

  it('a look with nothing old comes back as it is', () => {
    const l = defaultAppearance();
    assert.equal(migrateAppearance(l), l);
    for (const c of EVERYONE) assert.equal(migrateAppearance(c.appearance!), c.appearance, c.id);
  });

  it('the old format (no look) keeps its headband as cloth, a rogue\'s scratched one on the forehead', () => {
    const preset = LEGACY_ROSTER.find((c) => c.id === 'preset_storm')!;
    const old = { ...preset, appearance: undefined, headbandPosition: 'Rogue Scratched', ribbonStyle: 'Long Fluttering' } as unknown as ShinobiCharacter;
    const l = appearanceFromLegacy(old);
    assert.deepEqual(l.headband, { position: 'forehead', tails: true, cloth: preset.palette.headbandCloth });
    assert.equal(appearanceFromLegacy({ ...old, headbandPosition: 'Neck' } as ShinobiCharacter).headband.position, 'neck');
  });

  it('the random ninja wears no plate', () => {
    for (let i = 0; i < 200; i++) {
      const hb = randomAppearance().headband;
      for (const k of LEGACY_KEYS) assert.ok(!(k in hb), k);
    }
  });
});
