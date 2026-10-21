// Tests for the owner's Elise's coat and sleeves (armor_azure_coat): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getItem } from './catalog';
import { hexToRgb } from './color';
import { renderSprite } from './compose';
import {
  ELISE_COAT,
  ELISE_COAT_BODY,
  ELISE_CORSET,
  ELISE_PLATE,
  ELISE_SKIN,
  ELISE_SLEEVE_FORE_F,
  ELISE_SLEEVE_FORE_N,
  ELISE_SLEEVE_UPPER_F,
  ELISE_SLEEVE_UPPER_N,
  ELISE_TRIM,
} from './items/eliseUpperArt';
import type { PaintedPiece } from './painted';
import { GRID, partIndex, PartId, RES, Vec } from './raster';
import type { BodyType, SpriteAppearance } from './types';

const look = (body: BodyType, colors: string[] = [], skin = ELISE_SKIN): SpriteAppearance => ({
  version: 1,
  body,
  skin,
  eyeShape: 'standard',
  eyeColor: '#2f9e6a',
  slots: { armor: { id: 'armor_azure_coat', colors } },
  accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
  pixelEdits: [],
});

describe('armor_azure_coat', () => {
  it('is a women-only armour in her colours', () => {
    const def = getItem('armor_azure_coat')!;
    assert.equal(def.slot, 'armor');
    assert.deepEqual(def.bodies, ['female', 'slender']);
    assert.deepEqual(
      def.colors.map((c) => [c.label, c.default]),
      [
        ['Coat', ELISE_COAT],
        ['Trim', ELISE_TRIM],
        ['Plate', ELISE_PLATE],
        ['Corset', ELISE_CORSET],
      ],
    );
  });

  it('draws every pixel of her pieces at our female idle frame 0, but where the head covers them', () => {
    const f = renderSprite(look('female'), 'idle', 0);
    const r = f.rig;
    // back to front, as the game stacks them
    const pieces: [PaintedPiece, Vec, PartId][] = [
      [ELISE_SLEEVE_FORE_F, r.elbowF, 'forearmF'],
      [ELISE_SLEEVE_UPPER_F, r.shoulderF, 'upperArmF'],
      [ELISE_COAT_BODY, r.neck, 'torso'],
      [ELISE_SLEEVE_FORE_N, r.elbowN, 'forearmN'],
      [ELISE_SLEEVE_UPPER_N, r.shoulderN, 'upperArmN'],
    ];
    const want = new Map<number, [string, PartId]>();
    for (const [p, at, part] of pieces) {
      const ox = Math.floor(at.x * RES) - p.pivot[0];
      const oy = Math.floor(at.y * RES) - p.pivot[1];
      p.rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) if (row[x] !== '.') want.set((oy + y) * GRID + ox + x, [p.colors[row[x]], part]);
      });
    }
    // What our body draws over them, as her picture has her own there: the head over the collar's top
    // two rows, the bare near shoulder over the collar's edge, the far hip over the far cuff (her pouch
    // in her picture).
    const over = new Set(['head', 'upperArmN', 'thighF'].map((p) => partIndex(p as PartId)));
    let seen = 0;
    let hidden = 0;
    for (const [i, [hex, part]] of want) {
      const at = `${part} (${i % GRID}, ${Math.floor(i / GRID)})`;
      if (f.part[i] !== partIndex(part)) {
        assert.ok(over.has(f.part[i]), `${at} covered by part ${f.part[i]}`);
        hidden++;
        continue;
      }
      assert.deepEqual([...f.rgba.subarray(i * 4, i * 4 + 3)], hexToRgb(hex), at);
      seen++;
    }
    assert.ok(seen > 500, `${seen} pixels drawn`);
    assert.ok(hidden <= 24, `${hidden} pixels covered`);
  });

  it('keeps her line when recoloured', () => {
    const f = renderSprite(look('female', ['#8b1a1a', '#c0c8d4', '#3a3f4a', '#111111']), 'idle', 0);
    const ox = Math.floor(f.rig.neck.x * RES) - ELISE_COAT_BODY.pivot[0];
    const oy = Math.floor(f.rig.neck.y * RES) - ELISE_COAT_BODY.pivot[1];
    const y = ELISE_COAT_BODY.rows.length - 1;
    const x = ELISE_COAT_BODY.rows[y].indexOf('k');
    const i = (oy + y) * GRID + ox + x;
    assert.deepEqual([...f.rgba.subarray(i * 4, i * 4 + 3)], hexToRgb(ELISE_COAT_BODY.colors.k));
  });

  it('is not worn by the male and bulky bodies', () => {
    for (const body of ['male', 'bulky'] as BodyType[]) {
      const bare = { ...look(body), slots: {} };
      assert.deepEqual(renderSprite(look(body), 'idle', 0).rgba, renderSprite(bare, 'idle', 0).rgba, body);
    }
  });
});
