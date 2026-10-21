// Tests for the princess's bodice and sleeves (src/sprite/items/princessTop.ts, princessTopArt.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fitsBody, getItem } from './catalog';
import { renderSprite } from './compose';
import * as ART from './items/princessTopArt';
import { segAngle, type PaintedPiece } from './painted';
import { GRID } from './raster';
import { drawRig } from './rig';
import { CAMP_POSES, MOVE_POSES, SPRITE_POSES, type BodyType, type SpriteAppearance, type SpritePose } from './types';

const BODICE = 'top_rose_bodice';
const HIS_SKIN = ART.PRINCESS_TOP_SKIN[0];

const look = (body: BodyType, colors: string[] = [], skin = HIS_SKIN, armor = false): SpriteAppearance => ({
  version: 1,
  body,
  skin,
  eyeShape: 'standard',
  eyeColor: '#2f9e6a',
  slots: { top: { id: BODICE, colors }, ...(armor ? { armor: { id: 'armor_leather', colors: [] } } : {}) },
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

// His pixels at our female idle frame 0 (his (x, y) at our (x + 74, y + 122)).
const HIS: [number, number, string][] = [
  [127, 160, '#fad383'], // the bodice's gold embroidery
  [126, 152, '#f4ca6a'], // the collar's gold edge
  [129, 162, '#c69038'], // the bodice's dark gold
  [114, 160, '#f5a6ad'], // the near pink puff
  [118, 153, HIS_SKIN], // the near bare shoulder
  [112, 169, '#ebcae6'], // the near lilac sleeve
  [137, 160, '#c8758a'], // the far pink puff, over our torso's edge
  [117, 170, '#07051b'], // his line round the near lilac sleeve
];

describe("The princess's bodice", () => {
  it('is a top, women only, with her colours as the slots', () => {
    const d = getItem(BODICE)!;
    assert.equal(d.slot, 'top');
    assert.ok(fitsBody(d, 'female') && fitsBody(d, 'slender'));
    assert.ok(!fitsBody(d, 'male') && !fitsBody(d, 'bulky'));
    assert.deepEqual(d.colors.map((c) => c.default), [ART.PRINCESS_TOP_PINK[0], ART.PRINCESS_TOP_LILAC[0], ART.PRINCESS_TOP_GOLD[0]]);
  });

  it('has every piece as a whole picture in her colours only', () => {
    const hers = new Set([...ART.PRINCESS_TOP_LINE, ...ART.PRINCESS_TOP_PINK, ...ART.PRINCESS_TOP_LILAC, ...ART.PRINCESS_TOP_GOLD, ...ART.PRINCESS_TOP_SKIN]);
    assert.equal(Object.keys(PIECES).length, 8);
    for (const [name, p] of Object.entries(PIECES)) {
      const w = p.rows[0].length;
      assert.ok(p.rows.every((r) => r.length === w), name);
      for (const r of p.rows) for (const ch of r) if (ch !== '.') assert.ok(hers.has(p.colors[ch]), `${name} '${ch}' ${p.colors[ch]}`);
    }
  });

  it('lays every piece but the raised far sleeve at its segment angle in our female idle', () => {
    const r = drawRig('female', 'idle', 0);
    const want: Record<string, number> = {
      PRINCESS_BODICE: segAngle(r.pelvis, r.neck),
      PRINCESS_BODICE_TIP: segAngle(r.pelvis, r.neck),
      PRINCESS_BODICE_SIDE_F: segAngle(r.pelvis, r.neck),
      PRINCESS_SLEEVE_N: segAngle(r.shoulderN, r.elbowN),
      PRINCESS_CUFF_N: segAngle(r.elbowN, r.wristN),
      PRINCESS_SLEEVE_F: segAngle(r.shoulderF, r.elbowF),
      PRINCESS_SLEEVE_F_SIDE: segAngle(r.shoulderF, r.elbowF),
    };
    for (const [name, deg] of Object.entries(want)) assert.ok(Math.abs(PIECES[name].angle - deg) < 0.5, `${name} ${PIECES[name].angle} vs ${deg}`);
    // his far arm is raised: that sleeve keeps his angle and is turned down along our forearm
    assert.ok(segAngle(r.elbowF, r.wristF) - ART.PRINCESS_CUFF_F.angle > 30);
  });

  it('shows his pixels where he drew them at idle, with his skin', () => {
    const f = renderSprite(look('female'), 'idle', 0).rgba;
    for (const [x, y, hex] of HIS) assert.equal(hexAt(f, x, y), hex, `${x},${y}`);
  });

  it('moves her colours with the colour slots and the skin with the player, and keeps his line', () => {
    const f = renderSprite(look('female', ['#3a6fd8', '#40a060', '#c0c6d0'], '#8d5524'), 'idle', 0).rgba;
    for (const [x, y, hex] of HIS.slice(0, 6)) assert.notEqual(hexAt(f, x, y), hex, `${x},${y}`);
    assert.equal(hexAt(f, 117, 170), '#07051b');
  });

  it('draws the bodice point over the skirt only with no armour on', () => {
    const tip = ART.PRINCESS_BODICE_TIP.rows.join('').replace(/\./g, '').length;
    assert.ok(tip > 50);
    const a = renderSprite(look('female', [], HIS_SKIN, true), 'idle', 0).rgba;
    const b = renderSprite(look('female'), 'idle', 0).rgba;
    assert.notDeepEqual(a, b);
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
