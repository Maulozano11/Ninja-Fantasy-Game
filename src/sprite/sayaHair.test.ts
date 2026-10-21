// Tests for the owner's Saya hair (items/sayaHair.ts, items/sayaHairArt.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { faceAnchor } from './body';
import { retintHex } from './color';
import { getItem } from './catalog';
import { renderSprite } from './compose';
import { SAYA_HAIR_BACK, SAYA_HAIR_BASE, SAYA_HAIR_FRONT, SAYA_HAIR_LINE, SAYA_HAIR_LONG, SAYA_HAIR_ORNAMENT, SAYA_HAIR_ORNAMENT_BASE } from './items/sayaHairArt';
import { GRID } from './raster';
import type { BodyType, SpriteAppearance, SpritePose } from './types';

const look = (body: BodyType, colors: string[] = []): SpriteAppearance => ({
  version: 1,
  body,
  skin: '#f6c7a6',
  eyeShape: 'standard',
  eyeColor: '#2f9e6a',
  slots: { hair: { id: 'hair_sun_fall', colors } },
  accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
  pixelEdits: [],
});

const hex = (rgba: Uint8ClampedArray, x: number, y: number): string => {
  const i = (y * GRID + x) * 4;
  return '#' + [0, 1, 2].map((c) => rgba[i + c].toString(16).padStart(2, '0')).join('');
};

describe('Saya hair', () => {
  it('is a hairstyle with her hair and her gold as the default colours', () => {
    const def = getItem('hair_sun_fall')!;
    assert.equal(def.slot, 'hair');
    assert.deepEqual(def.colors.map((c) => [c.key, c.default, c.kind]), [
      ['hair', SAYA_HAIR_BASE, 'hair'],
      ['ornament', SAYA_HAIR_ORNAMENT_BASE, 'metal'],
    ]);
  });

  it('has whole pictures: even rows, every character coloured', () => {
    for (const p of [SAYA_HAIR_FRONT, SAYA_HAIR_BACK, SAYA_HAIR_LONG]) {
      const w = p.rows[0].length;
      assert.ok(p.rows.every((r) => r.length === w));
      for (const r of p.rows) for (const ch of r) if (ch !== '.') assert.match(p.colors[ch] ?? '', /^#[0-9a-f]{6}$/, ch);
    }
  });

  it('draws her pixels as she has them on the female body at idle', () => {
    const f = renderSprite(look('female'), 'idle', 0);
    // the anchor the front part is stamped on, from the same rig
    const g = { rig: f.rig, bp: f.rig.bp, look: look('female') } as unknown as Parameters<typeof faceAnchor>[0];
    const { nx, ny } = faceAnchor(g);
    let same = 0;
    let all = 0;
    SAYA_HAIR_FRONT.rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] === '.') continue;
        all++;
        if (hex(f.rgba, nx - SAYA_HAIR_FRONT.pivot[0] + i, ny - SAYA_HAIR_FRONT.pivot[1] + j) === SAYA_HAIR_FRONT.colors[row[i]]) same++;
      }
    });
    assert.ok(same / all > 0.97, `${same} of ${all} front pixels are hers`);
  });

  it('recolours her hair and her ornament apart, keeping her line', () => {
    const f = renderSprite(look('female', ['#2a2230', '#c0c0c8']), 'idle', 0);
    const g = { rig: f.rig, bp: f.rig.bp, look: look('female') } as unknown as Parameters<typeof faceAnchor>[0];
    const { nx, ny } = faceAnchor(g);
    const seen = { line: 0, hair: 0, orn: 0 };
    SAYA_HAIR_FRONT.rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '.') continue;
        const got = hex(f.rgba, nx - SAYA_HAIR_FRONT.pivot[0] + i, ny - SAYA_HAIR_FRONT.pivot[1] + j);
        const own = SAYA_HAIR_FRONT.colors[ch];
        if (ch === SAYA_HAIR_LINE) seen.line += +(got === own);
        else if (SAYA_HAIR_ORNAMENT.includes(ch)) seen.orn += +(got === retintHex(own, SAYA_HAIR_ORNAMENT_BASE, '#c0c0c8') && got !== own);
        else seen.hair += +(got === retintHex(own, SAYA_HAIR_BASE, '#2a2230'));
      }
    });
    assert.ok(seen.line > 20 && seen.hair > 300 && seen.orn > 10, JSON.stringify(seen));
  });

  it('draws on every body, standing, moving, seated and knocked out', () => {
    const poses: SpritePose[] = ['idle', 'attack', 'hurt', 'run', 'crouch', 'downed', 'sit'];
    for (const body of ['female', 'slender', 'male', 'bulky'] as BodyType[]) {
      for (const pose of poses) {
        const bare = renderSprite({ ...look(body), slots: {} }, pose, 0).rgba;
        assert.notDeepEqual(renderSprite(look(body), pose, 0).rgba, bare, `${body} ${pose}`);
      }
    }
  });
});
