// Tests for Lyra's blouse and corset (src/sprite/items/lyraUpper.ts, lyraUpperArt.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fitsBody, getItem } from './catalog';
import { renderSprite } from './compose';
import * as ART from './items/lyraUpperArt';
import { segAngle, type PaintedPiece } from './painted';
import { GRID } from './raster';
import { drawRig } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

const BLOUSE = 'top_offshoulder_blouse';
const CORSET = 'armor_gilded_corset';
const LINE = '#04010d';

const look = (body: BodyType, top: string[] = [], armor: string[] = []): SpriteAppearance => ({
  version: 1,
  body,
  skin: '#f6c7a6',
  eyeShape: 'standard',
  eyeColor: '#2f9e6a',
  slots: { top: { id: BLOUSE, colors: top }, armor: { id: CORSET, colors: armor } },
  accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
  pixelEdits: [],
});

const hexAt = (rgba: Uint8ClampedArray, x: number, y: number) => {
  const i = (y * GRID + x) * 4;
  return '#' + [rgba[i], rgba[i + 1], rgba[i + 2]].map((c) => c.toString(16).padStart(2, '0')).join('');
};

const PIECES: Record<string, PaintedPiece> = Object.fromEntries(
  Object.entries(ART).filter(([, v]) => typeof v === 'object' && v !== null && 'rows' in v),
) as Record<string, PaintedPiece>;

describe("Lyra's blouse and corset", () => {
  it('are a top and an armour, women only', () => {
    const blouse = getItem(BLOUSE)!;
    const corset = getItem(CORSET)!;
    assert.equal(blouse.slot, 'top');
    assert.equal(corset.slot, 'armor');
    assert.equal(corset.statsArmor, getItem('armor_leather')!.statsArmor);
    for (const d of [blouse, corset]) {
      assert.ok(fitsBody(d, 'female') && fitsBody(d, 'slender'), d.id);
      assert.ok(!fitsBody(d, 'male') && !fitsBody(d, 'bulky'), d.id);
    }
    assert.deepEqual(blouse.colors.map((c) => c.default), [ART.LYRA_BLOUSE[1], ART.LYRA_LINING[0]]);
    assert.deepEqual(corset.colors.map((c) => c.default), [ART.LYRA_LEATHER[1], ART.LYRA_GOLD[1], ART.LYRA_STEEL[1]]);
  });

  it('has every piece as a whole picture in her colours only', () => {
    const hers = new Set([LINE, ...ART.LYRA_BLOUSE, ...ART.LYRA_LINING, ...ART.LYRA_GOLD, ...ART.LYRA_LEATHER, ...ART.LYRA_STEEL]);
    assert.equal(Object.keys(PIECES).length, 10);
    for (const [name, p] of Object.entries(PIECES)) {
      const w = p.rows[0].length;
      assert.ok(p.rows.every((r) => r.length === w), name);
      for (const r of p.rows) for (const ch of r) if (ch !== '.') assert.ok(hers.has(p.colors[ch]), `${name} '${ch}' ${p.colors[ch]}`);
    }
  });

  it('lays every piece at its own angle in our female idle, so every pixel there is hers', () => {
    const r = drawRig('female', 'idle', 0);
    const seg = {
      torso: segAngle(r.pelvis, r.neck),
      upperN: segAngle(r.shoulderN, r.elbowN),
      foreN: segAngle(r.elbowN, r.wristN),
      upperF: segAngle(r.shoulderF, r.elbowF),
      foreF: segAngle(r.elbowF, r.wristF),
    };
    const want: Record<string, number> = {
      BLOUSE_TORSO: seg.torso,
      CORSET: seg.torso,
      BLOUSE_SLEEVE_N: seg.upperN,
      BLOUSE_FOREARM_N: seg.foreN,
      CORSET_BRACER_N: seg.foreN,
      BLOUSE_SLEEVE_F: seg.upperF,
      BLOUSE_SIDE_F: seg.upperF,
      CORSET_PAULDRON: seg.upperF,
      BLOUSE_FOREARM_F: seg.foreF,
      CORSET_BRACER_F: seg.foreF,
    };
    for (const [name, deg] of Object.entries(want)) assert.ok(Math.abs(PIECES[name].angle - deg) < 0.5, `${name} ${PIECES[name].angle} vs ${deg}`);
  });

  it('shows her pixels at idle by default: the red V, a buckle, the pauldron, a stud on the bracer, her line', () => {
    const f = renderSprite(look('female'), 'idle', 0).rgba;
    assert.equal(hexAt(f, 126, 155), '#8c1c35');
    assert.equal(hexAt(f, 129, 161), '#d4e4ea');
    assert.equal(hexAt(f, 133, 151), '#fed982');
    assert.equal(hexAt(f, 111, 168), '#ce9242');
    assert.equal(hexAt(f, 135, 160), LINE);
  });

  it('moves her colours with the colour slots and keeps her line', () => {
    const f = renderSprite(look('female', ['#3a4f8f', '#d9a520'], ['#2b2b33', '#c0c6d0', '#e0b040']), 'idle', 0).rgba;
    assert.notEqual(hexAt(f, 126, 155), '#8c1c35');
    assert.notEqual(hexAt(f, 129, 161), '#d4e4ea');
    assert.notEqual(hexAt(f, 133, 151), '#fed982');
    assert.equal(hexAt(f, 135, 160), LINE);
  });

  it('draws on the female and slender bodies in every pose', () => {
    const poses: SpritePose[] = [...SPRITE_POSES, ...MOVE_POSES, ...CAMP_POSES];
    for (const body of ['female', 'slender'] as BodyType[]) {
      const bare = { ...look(body), slots: {} };
      for (const pose of poses) {
        for (const frame of [0, 1]) {
          const a = renderSprite(look(body), pose, frame).rgba;
          const b = renderSprite(bare, pose, frame).rgba;
          let changed = 0;
          for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) changed++;
          assert.ok(changed > 300, `${body} ${pose} ${frame}: ${changed}`);
        }
      }
    }
  });
});
