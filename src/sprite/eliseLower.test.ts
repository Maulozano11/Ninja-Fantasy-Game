// Tests for the owner's Elise's skirt, coat tails, belts and gloves (items/eliseLower.ts,
// items/eliseLowerArt.ts): npm test.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGENDARY_PRESETS } from '../data/shinobiData';
import { renderSpriteCached } from './compose';
import { hangPixels } from './items/eliseLower';
import { ELISE_BELT, ELISE_COAT_BACK, ELISE_FINGER_TONES, ELISE_GLOVE_STRAP, ELISE_KIND, ELISE_SKIRT } from './items/eliseLowerArt';
import { getAppearance } from './legacy';
import { GRID, partIndex } from './raster';
import { rotateTemplate, type RotatedPixel } from './rotsprite';
import type { BodyType, SpriteAppearance } from './types';

const ELISE = getAppearance(LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_elise')!.character);
const look = (body: BodyType = 'female'): SpriteAppearance => ({ ...ELISE, body });

const hexAt = (rgba: Uint8ClampedArray, i: number): string =>
  '#' + [rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]].map((c) => c.toString(16).padStart(2, '0')).join('');

/** How many pixels of a frame are of the given kinds of her colours (ELISE_KIND). */
function countKinds(rgba: Uint8ClampedArray, kinds: string[]): number {
  let n = 0;
  for (let i = 0; i < GRID * GRID; i++) if (rgba[i * 4 + 3] && kinds.includes(ELISE_KIND[hexAt(rgba, i)])) n++;
  return n;
}

describe('Elise lower clothes', () => {
  it('lays her coat tails along her legs when she is knocked out, her blue and gold showing', () => {
    for (const body of ['female', 'slender'] as BodyType[]) {
      for (const frame of [0, 1]) {
        const f = renderSpriteCached(look(body), 'downed', frame);
        const bare = renderSpriteCached({ ...look(body), slots: { ...look(body).slots, cape: undefined } }, 'downed', frame);
        // the tails add a band of her coat's blue and gold along the legs (about 5 pixels deep along them)
        const added = countKinds(f.rgba, ['coat', 'trim']) - countKinds(bare.rgba, ['coat', 'trim']);
        assert.ok(added >= 80, `${body} ${frame}: ${added} pixels of her coat along the legs`);
      }
    }
  });

  it('paints her pouch as a box with her steel lid, on the belts at the far hip', () => {
    const steel = new Set(Object.entries(ELISE_BELT.colors).filter(([, h]) => ELISE_KIND[h] === 'steel').map(([c]) => c));
    // the lid: a row of her steel across the pouch's top at the far hip (the buckle's steel is at the near side)
    const right = ELISE_BELT.rows.map((r) => r.slice(-8));
    assert.ok(right.some((r) => [...r].filter((ch) => steel.has(ch)).length >= 4), right.join('\n'));
  });

  it('shades her lining smoothly: no hard stripes of her darkest greys inside it', () => {
    // Her darkest greys only along the tails' edges and under the skirt: in the middle of each lining
    // row there is none.
    const dark = new Set(Object.entries(ELISE_COAT_BACK.colors).filter(([, h]) => h === '#525368' || h === '#6a6b80').map(([c]) => c));
    const lining = new Set(Object.entries(ELISE_COAT_BACK.colors).filter(([, h]) => ELISE_KIND[h] === 'lining').map(([c]) => c));
    for (const row of ELISE_COAT_BACK.rows.slice(4)) {
      const cells = [...row].map((ch, x) => [ch, x] as const).filter(([ch]) => lining.has(ch));
      if (cells.length < 10) continue;
      const inner = cells.slice(3, -3);
      assert.ok(inner.every(([ch]) => !dark.has(ch)), row);
    }
  });

  it('keeps every glove pixel in her colours: her blues and her fingers, not our far skin', () => {
    const fingers = new Set(ELISE_FINGER_TONES as readonly string[]);
    for (const [pose, frame] of [['walk', 0], ['walk', 4], ['cast', 1], ['sit', 0], ['read', 0], ['handsigns', 0]] as const) {
      const f = renderSpriteCached(look(), pose, frame);
      const hands = new Set([partIndex('handN'), partIndex('handF')]);
      for (let i = 0; i < GRID * GRID; i++) {
        if (!f.rgba[i * 4 + 3] || !hands.has(f.part[i])) continue;
        const h = hexAt(f.rgba, i);
        assert.notEqual(h, '#ae4946', `${pose} ${frame}: our far skin at ${i % GRID}, ${(i / GRID) | 0}`);
        if (ELISE_KIND[h] === 'skin') assert.ok(fingers.has(h) || h === '#f3ae92', `${pose} ${frame}: ${h}`);
      }
    }
  });

  it('drapes the skirt toward plumb when she leans far in, instead of tilting it whole with her', () => {
    const p = ELISE_SKIRT;
    // at the angle it was drawn at, and turned a little, it is the piece turned whole (RotSprite)
    assert.deepEqual(hangPixels(p, p.angle), rotateTemplate(p, 0));
    assert.deepEqual(hangPixels(p, p.angle + 10), rotateTemplate(p, 10));
    // leaning 40 degrees in (crouched): every pixel is still drawn, and the hem hangs nearer plumb
    // than the turned piece's (its middle is less far out to the side of the waist's middle)
    // the middle of her gold hem, from the pivot (the waist's middle)
    const hem = (px: RotatedPixel[]) => {
      const gold = px.filter((q) => ELISE_KIND[p.colors[q.ch]] === 'hem');
      return [gold.reduce((s, q) => s + q.dx, 0) / gold.length, gold.reduce((s, q) => s + q.dy, 0) / gold.length] as const;
    };
    for (const turn of [40, -40]) {
      const hung = hangPixels(p, p.angle + turn);
      const whole = rotateTemplate(p, turn);
      assert.ok(hung.length >= whole.length * 0.9, `${turn}: ${hung.length} of ${whole.length}`);
      const [hx, hy] = hem(hung);
      const [wx, wy] = hem(whole);
      assert.ok(Math.abs(Math.atan2(hx, hy)) < Math.abs(Math.atan2(wx, wy)), `${turn}: hem at ${hx}, ${hy} vs ${wx}, ${wy}`);
    }
  });

  it('shows no bare wrist between the sleeve and the glove: her glove cuff and its leather strap', () => {
    const skin = new Set(['#facdac', '#f3ae92', '#e59580', '#d78876', '#d68271', '#c67169', '#9b5754']);
    const fore = new Set([partIndex('forearmN'), partIndex('forearmF')]);
    let strap = 0;
    for (const [pose, frame] of [['idle', 0], ['sit', 0], ['walk', 1], ['read', 0], ['lean', 0], ['attack', 1]] as const) {
      const f = renderSpriteCached(look(), pose, frame);
      for (let i = 0; i < GRID * GRID; i++) {
        if (!f.rgba[i * 4 + 3] || !fore.has(f.part[i])) continue;
        const h = hexAt(f.rgba, i);
        assert.ok(!skin.has(h), `${pose} ${frame}: bare wrist ${h} at ${i % GRID}, ${(i / GRID) | 0}`);
        if (h === ELISE_GLOVE_STRAP) strap++;
      }
    }
    assert.ok(strap > 0, 'her strap shows where the cuff meets the sleeve');
  });

  it('shows her far glove and fingers beside the hip at idle, past the skirt', () => {
    const f = renderSpriteCached(look(), 'idle', 0);
    const hand = partIndex('handF');
    let glove = 0;
    let fingers = 0;
    for (let i = 0; i < GRID * GRID; i++) {
      if (!f.rgba[i * 4 + 3] || f.part[i] !== hand) continue;
      const k = ELISE_KIND[hexAt(f.rgba, i)];
      if (k === 'glove' || k === 'coat') glove++; // her glove blues (her navy is also her coat's)
      if (k === 'skin') fingers++;
    }
    assert.ok(glove >= 4 && fingers >= 4, `glove ${glove}, fingers ${fingers}`);
  });
});
