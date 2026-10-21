// Tests for the princess put together (provisional "Rosalind, the Rose Dawn Princess", preset_rose_dawn): her
// parts registered on one another as the owner drew her (docs/reference/princess-owner-reference.jpg): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { faceAnchor } from './body';
import { renderSprite } from './compose';
import type { DrawCtx } from './ctx';
import { PRINCESS_HAIR_BASE } from './items/princessHairArt';
import { PRINCESS_SKIRT } from './items/princessSkirtArt';
import { PRINCESS_SHOE_F } from './items/princessShoesArt';
import { NOBLE_BROWS, NOBLE_EYE_COLORS } from './princessEyeArt';
import { GRID, RES } from './raster';
import { drawRig, frameCount, rigPoseFor } from './rig';
import type { SpriteAppearance } from './types';

const preset = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_rose_dawn')!.character;
const look = preset.appearance!;

const hexAt = (rgba: Uint8ClampedArray, i: number) => '#' + [rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]].map((c) => c.toString(16).padStart(2, '0')).join('');

describe('the princess put together', () => {
  it('is a female preset in all her own items', () => {
    assert.equal(look.body, 'female');
    assert.equal(look.faceShape, 'noble');
    assert.equal(look.eyeShape, 'noble');
    assert.deepEqual(
      Object.values(look.slots).map((s) => s!.id).sort(),
      ['feet_rose_heels', 'hair_rose_dawn', 'held_rose_sceptre', 'skirt_rose_gown', 'top_rose_bodice'],
    );
    assert.deepEqual(look.accessories.map((a) => a.id), ['acc_rose_tiara']);
  });

  it('holds her sceptre up in her far hand at rest, where he drew her hand', () => {
    assert.equal(rigPoseFor('idle', 'runes', 'held_rose_sceptre'), 'idleSceptre');
    assert.equal(rigPoseFor('idle', 'runes', 'held_katana'), 'idle');
    assert.equal(frameCount('idleSceptre'), frameCount('idle'));
    // His far hand (73, 46.5) at the figure's offset (74, 122) on our 256 x 256 frame.
    const r = drawRig('female', 'idleSceptre', 0);
    assert.ok(Math.abs(r.handF.x * RES - 147) < 0.75 && Math.abs(r.handF.y * RES - 168.5) < 0.75, `far hand at ${r.handF.x * RES}, ${r.handF.y * RES}`);
    // the near arm and the legs are the idle's
    const idle = drawRig('female', 'idle', 0);
    for (const j of ['handN', 'elbowN', 'ankleN', 'ankleF', 'head'] as const) assert.deepEqual(r[j], idle[j], j);
  });

  it('sets her face a row above the head row, so it meets her hair and collar as he drew them', () => {
    const r = drawRig('female', 'idle', 0);
    const g = (l: Partial<SpriteAppearance>) => ({ rig: r, bp: r.bp, look: { ...look, ...l } }) as unknown as DrawCtx;
    const noble = faceAnchor(g({}));
    const ours = faceAnchor(g({ faceShape: 'tapered' }));
    assert.equal(noble.ny, noble.hy - 1);
    assert.equal(ours.ny, ours.hy);
    assert.equal(noble.hy, ours.hy, 'her hair rides the same head row on any face');
  });

  it('keeps her brows his pixels in her hair\'s own colour', () => {
    const withColour: SpriteAppearance = { ...look, slots: { ...look.slots, hair: { id: 'hair_rose_dawn', colors: [PRINCESS_HAIR_BASE] } } };
    const f = renderSprite(withColour, 'idle', 0);
    const plain = renderSprite(look, 'idle', 0);
    const { ex, ny } = faceAnchor({ rig: f.rig, bp: f.rig.bp, look } as unknown as DrawCtx);
    const { at, rows } = NOBLE_BROWS.near;
    rows.forEach((row, r) =>
      [...row].forEach((ch, c) => {
        if (ch === '.') return;
        const i = (ny + at[1] + r) * GRID + ex + at[0] + c;
        assert.equal(hexAt(f.rgba, i), NOBLE_EYE_COLORS[ch]);
        assert.equal(hexAt(plain.rgba, i), NOBLE_EYE_COLORS[ch]);
      }),
    );
  });

  it('shows her shoes in front of the petticoat he hid behind them', () => {
    const behind = PRINCESS_SKIRT.behind!;
    assert.ok(behind.some((row) => row.includes('#')));
    const cells: number[] = [];
    behind.forEach((row, j) => [...row].forEach((ch, i) => ch === '#' && cells.push((PRINCESS_SKIRT.y + j) * GRID + PRINCESS_SKIRT.x + i)));
    const shod = renderSprite(look, 'idle', 0);
    const bare = renderSprite({ ...look, slots: { ...look.slots, feet: undefined } }, 'idle', 0);
    const shoe = new Set(Object.values(PRINCESS_SHOE_F.colors));
    const shown = cells.filter((i) => hexAt(shod.rgba, i) !== hexAt(bare.rgba, i) && shoe.has(hexAt(shod.rgba, i)));
    assert.ok(shown.length > cells.length / 2, `${shown.length} of ${cells.length} hidden cells show his shoe`);
  });
});
